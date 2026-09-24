import type { Community } from '@nigeria-flood/shared';
import { loadCommunities, resolveByCoordinates, resolveByText } from '../services/geo.js';
import { getSubscriberStore, type Language, type Subscriber } from '../services/subscribers.js';
import { getTemplates, render } from '../templates/index.js';

// Shown before a language is chosen, so it can't be gated by the reviewed
// templates (there's no subscriber language yet to look one up by). Language
// names are proper nouns, not sentences needing translation review.
export const ASK_LANGUAGE_PROMPT =
  'Welcome to Nigeria Flood Early Warning! We message you when flood risk rises for your area, so you have time to prepare. Free to receive. Reply STOP anytime to stop.\n\n' +
  'Please choose your language:\n1. English\n2. Hausa\n3. Yoruba\n4. Igbo\n5. Pidgin';

const LANGUAGE_CHOICES: Record<string, Language> = {
  '1': 'en',
  english: 'en',
  '2': 'ha',
  hausa: 'ha',
  '3': 'yo',
  yoruba: 'yo',
  '4': 'ig',
  igbo: 'ig',
  '5': 'pcm',
  pidgin: 'pcm',
};

// Coordinate matches this close, or an exact community-name text match, are
// trusted without an extra confirmation round-trip. Anything looser (LGA/
// state text match, or a coordinate match further than this) gets a YES
// confirmation first — CLAUDE.md section 8: "if unclear, ask one follow-up
// question."
const AUTO_CONFIRM_MAX_KM = 10;

function nowIso(): string {
  return new Date().toISOString();
}

export async function startOnboarding(phone: string): Promise<string> {
  const store = getSubscriberStore();
  const existing = await store.get(phone);
  const subscriber: Subscriber = {
    phone,
    status: 'awaiting_language',
    consentAt: existing?.consentAt ?? nowIso(),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  await store.save(subscriber);
  return ASK_LANGUAGE_PROMPT;
}

export async function handleAwaitingLanguage(subscriber: Subscriber, body: string): Promise<string> {
  const language = LANGUAGE_CHOICES[body.trim().toLowerCase()];
  if (!language) {
    return `Sorry, we didn't understand that.\n\n${ASK_LANGUAGE_PROMPT}`;
  }

  const store = getSubscriberStore();
  await store.save({ ...subscriber, language, status: 'awaiting_location', updatedAt: nowIso() });
  return getTemplates(language).strings.welcome;
}

export async function handleAwaitingLocation(subscriber: Subscriber, body: string, pin?: { latitude: number; longitude: number }): Promise<string> {
  const language = subscriber.language ?? 'en';
  const templates = getTemplates(language);
  const store = getSubscriberStore();

  // A pending confirmation from a previous low-confidence match.
  if (subscriber.pendingCommunityId && body.trim().toLowerCase() === 'yes') {
    const communities = await loadCommunities();
    const community = communities.find((c) => c.id === subscriber.pendingCommunityId);
    await store.save({
      ...subscriber,
      communityId: subscriber.pendingCommunityId,
      pendingCommunityId: undefined,
      latitude: community?.latitude,
      longitude: community?.longitude,
      status: 'active',
      updatedAt: nowIso(),
    });
    return render(templates.strings.subscribed, { community: community?.name ?? subscriber.pendingCommunityId });
  }

  let community: Community | undefined;
  let highConfidence: boolean;
  if (pin) {
    const coordinateMatch = await resolveByCoordinates(pin.latitude, pin.longitude);
    community = coordinateMatch?.community;
    highConfidence = (coordinateMatch?.distanceKm ?? Infinity) <= AUTO_CONFIRM_MAX_KM;
  } else {
    const textMatch = await resolveByText(body);
    community = textMatch?.community;
    highConfidence = textMatch?.matchType === 'name';
  }

  if (!community) {
    await store.save({ ...subscriber, pendingCommunityId: undefined, updatedAt: nowIso() });
    return templates.strings.locationNotRecognized;
  }

  if (highConfidence) {
    await store.save({
      ...subscriber,
      communityId: community.id,
      pendingCommunityId: undefined,
      latitude: pin?.latitude ?? community.latitude,
      longitude: pin?.longitude ?? community.longitude,
      status: 'active',
      updatedAt: nowIso(),
    });
    return render(templates.strings.subscribed, { community: community.name });
  }

  await store.save({ ...subscriber, pendingCommunityId: community.id, updatedAt: nowIso() });
  return render(templates.strings.locationConfirm, { community: community.name });
}
