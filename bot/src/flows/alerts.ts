import { RISK_LEVELS, type LocationRisk, type RiskLevel, type RiskWindow } from '@nigeria-flood/shared';
import { config } from '../config.js';
import { getSubscriberStore, type Subscriber } from '../services/subscribers.js';
import { sendWhatsappMessage } from '../services/whatsapp.js';
import { getTemplates, render } from '../templates/index.js';

// CLAUDE.md section 8: "send an alert only if the risk level rose since
// their last alert (or a SEVERE level persists for 48h — send one reminder)."
const SEVERE_REMINDER_MS = 48 * 60 * 60 * 1000;

function riskRank(level: RiskLevel): number {
  return RISK_LEVELS.indexOf(level);
}

/** The worse of the two horizon windows drives alerting — a subscriber cares about whichever is more urgent. */
export function worstWindow(windows: RiskWindow[]): RiskWindow | null {
  if (windows.length === 0) return null;
  return windows.reduce((worst, w) => (riskRank(w.riskLevel) > riskRank(worst.riskLevel) ? w : worst));
}

export type AlertAction = 'send-rise' | 'send-reminder' | 'skip';

/**
 * Pure decision logic, deliberately separated from the send/save I/O below
 * so the escalation rule itself is unit-testable without a real WhatsApp
 * send or subscriber store.
 */
export function decideAlertAction(previousLevel: RiskLevel, lastAlertSentAt: string | undefined, newLevel: RiskWindow['riskLevel'], now: Date = new Date()): AlertAction {
  if (riskRank(newLevel) > riskRank(previousLevel)) return 'send-rise';
  const severePersisting = newLevel === 'SEVERE' && previousLevel === 'SEVERE';
  const dueForReminder = severePersisting && (!lastAlertSentAt || now.getTime() - new Date(lastAlertSentAt).getTime() >= SEVERE_REMINDER_MS);
  return dueForReminder ? 'send-reminder' : 'skip';
}

function nowIso(): string {
  return new Date().toISOString();
}

async function alertSubscriber(subscriber: Subscriber, communityName: string, worst: RiskWindow, recommendedActions: string[]): Promise<boolean> {
  const store = getSubscriberStore();
  const previousLevel = subscriber.lastAlertLevel ?? 'NONE';
  const action = decideAlertAction(previousLevel, subscriber.lastAlertSentAt, worst.riskLevel);

  if (action === 'skip') {
    // Keep the level current even when we don't message, so a later real
    // change (e.g. HIGH -> MODERATE -> HIGH) is still detected as a rise.
    if (subscriber.lastAlertLevel !== worst.riskLevel) {
      await store.save({ ...subscriber, lastAlertLevel: worst.riskLevel, updatedAt: nowIso() });
    }
    return false;
  }

  const templates = getTemplates(subscriber.language ?? 'en');
  const messageKey = action === 'send-rise' ? 'alertShort' : 'alertReminder';
  const message = render(templates.strings[messageKey], {
    community: communityName,
    riskLevel: worst.riskLevel,
    days: String(worst.days),
  });

  try {
    await sendWhatsappMessage(subscriber.phone, message);
  } catch (error) {
    // One subscriber's delivery failure (e.g. a sandbox number that never
    // joined) shouldn't stop everyone else in the batch from being alerted.
    console.error(`Failed to send alert to ${subscriber.phone}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }

  await store.save({
    ...subscriber,
    lastAlertLevel: worst.riskLevel,
    lastAlertSentAt: nowIso(),
    lastAlertDetails: { days: worst.days, reasons: worst.reasons, recommendedActions },
    updatedAt: nowIso(),
  });
  return true;
}

export interface ProcessResultsSummary {
  alertsSent: number;
  subscribersChecked: number;
}

/** Shared by the real Apify webhook and the /simulate demo endpoint — both just need to produce LocationRisk[]. */
export async function processRiskResults(results: LocationRisk[]): Promise<ProcessResultsSummary> {
  const allSubscribers = await getSubscriberStore().listActive();
  let alertsSent = 0;
  let subscribersChecked = 0;

  for (const result of results) {
    if (!result.matchedCommunity) continue; // e.g. an "outside MVP coverage" stub result — nothing to match subscribers against
    const worst = worstWindow(result.windows);
    if (!worst) continue;

    const communityName = result.location.community ?? result.matchedCommunity;
    const subscribers = allSubscribers.filter((s) => s.communityId === result.matchedCommunity);
    for (const subscriber of subscribers) {
      subscribersChecked++;
      const sent = await alertSubscriber(subscriber, communityName, worst, result.recommendedActions);
      if (sent) alertsSent++;
    }
  }

  return { alertsSent, subscribersChecked };
}

/** Renders the full-detail alert for a "1" reply (flows/replies.ts) — sent in-session, so no template-approval constraint applies. */
export function renderFullAlert(subscriber: Subscriber, communityName: string): string | null {
  if (!subscriber.lastAlertDetails) return null;
  const templates = getTemplates(subscriber.language ?? 'en');
  const { days, reasons, recommendedActions } = subscriber.lastAlertDetails;
  return render(templates.strings.alertFull, {
    community: communityName,
    riskLevel: subscriber.lastAlertLevel ?? 'NONE',
    days: String(days),
    reasons: reasons.map((r) => `- ${r}`).join('\n'),
    actions: recommendedActions.map((a) => `- ${a}`).join('\n'),
    joinNumber: config.joinNumber,
  });
}
