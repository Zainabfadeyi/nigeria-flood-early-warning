import { renderFullAlert } from './alerts.js';
import { loadCommunities } from '../services/geo.js';
import { getSubscriberStore, type Subscriber } from '../services/subscribers.js';
import { getTemplates, render } from '../templates/index.js';
import { startOnboarding } from './onboarding.js';

/** Handles messages from a subscriber whose onboarding is already complete (status: 'active'). */
export async function handleActiveSubscriber(subscriber: Subscriber, body: string): Promise<string> {
  const templates = getTemplates(subscriber.language ?? 'en');
  const command = body.trim().toLowerCase();

  if (command === 'stop') {
    await getSubscriberStore().delete(subscriber.phone);
    return templates.strings.unsubscribed;
  }

  if (command === 'change') {
    return startOnboarding(subscriber.phone);
  }

  const communities = await loadCommunities();
  const community = communities.find((c) => c.id === subscriber.communityId);
  const communityName = community?.name ?? subscriber.communityId ?? 'your area';

  if (command === 'join') {
    return render(templates.strings.alreadySubscribed, { community: communityName });
  }

  if (command === '1') {
    const fullAlert = renderFullAlert(subscriber, communityName);
    return fullAlert ?? "There's no recent alert on file for you yet.";
  }

  return templates.strings.helpMenu;
}
