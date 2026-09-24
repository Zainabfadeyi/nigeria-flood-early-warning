import { Router, type Request } from 'express';
import { z } from 'zod';
import { horizonSchema, riskLevelSchema, type LocationRisk } from '@nigeria-flood/shared';
import { config } from '../config.js';
import { processRiskResults } from '../flows/alerts.js';
import { fetchRunDatasetItems } from '../services/apify.js';
import { loadCommunities } from '../services/geo.js';

export const apifyRouter = Router();

// Apify webhooks don't have a signature scheme like Twilio's — the secret is
// embedded in the URL configured in the Apify Console instead.
function hasValidSecret(req: Request, expected: string): boolean {
  return Boolean(expected) && req.query.secret === expected;
}

interface ApifyWebhookBody {
  eventType?: string;
  eventData?: { actorRunId?: string };
  resource?: { id?: string };
}

/**
 * Configure this as the Actor's ACTOR.RUN.SUCCEEDED webhook URL in the Apify
 * Console (with ?secret=<APIFY_WEBHOOK_SECRET>). The scheduled run's input is
 * expected to cover every MVP community (see CLAUDE.md section 8 and
 * actor/src/main.ts) — checking all 13 regardless of live subscriber count
 * is simpler than keeping the Actor's schedule input in sync with the bot's
 * subscriber list, and pay-per-event pricing makes the extra checks cheap.
 */
apifyRouter.post('/inbound', async (req, res) => {
  if (!hasValidSecret(req, config.apifyWebhookSecret)) {
    res.status(403).send('Invalid or missing secret.');
    return;
  }

  const body = req.body as ApifyWebhookBody;
  const runId = body.eventData?.actorRunId ?? body.resource?.id;
  if (!runId) {
    res.status(400).send('Could not find a run id in the webhook payload.');
    return;
  }

  try {
    const results = await fetchRunDatasetItems(runId);
    const summary = await processRiskResults(results);
    res.json(summary);
  } catch (error) {
    console.error('Failed to process Apify webhook:', error);
    res.status(500).send('Failed to process webhook.');
  }
});

const simulateBodySchema = z.object({
  communityId: z.string(),
  riskLevel: riskLevelSchema,
  days: horizonSchema.default(7),
  reasons: z.array(z.string()).default(['Simulated for the demo.']),
  recommendedActions: z.array(z.string()).default(['This is a simulated alert for demo purposes.']),
});

/** CLAUDE.md section 11 Phase 6: "a simulate admin endpoint (protected by a secret) that injects a fake advisory so we can trigger alerts live in the demo." */
apifyRouter.post('/simulate', async (req, res) => {
  if (!hasValidSecret(req, config.adminSecret)) {
    res.status(403).send('Invalid or missing secret.');
    return;
  }

  const parsed = simulateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { communityId, riskLevel, days, reasons, recommendedActions } = parsed.data;

  const communities = await loadCommunities();
  const community = communities.find((c) => c.id === communityId);
  if (!community) {
    res.status(404).send(`Unknown communityId: ${communityId}`);
    return;
  }

  const result: LocationRisk = {
    location: {
      label: community.name,
      community: community.name,
      lga: community.lga,
      state: community.state,
      latitude: community.latitude,
      longitude: community.longitude,
    },
    matchedCommunity: community.id,
    windows: [{ days, riskLevel, confidence: 'high', reasons }],
    recommendedActions,
    sources: [],
    limitations: ['Simulated result for demo purposes — not from a real Actor run.'],
    warnings: [],
    generatedAt: new Date().toISOString(),
  };

  const summary = await processRiskResults([result]);
  res.json(summary);
});
