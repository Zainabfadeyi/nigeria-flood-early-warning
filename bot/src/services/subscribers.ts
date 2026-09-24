import { config } from '../config.js';
import { createApifySubscriberStore } from './apifySubscriberStore.js';
import { jsonFileSubscriberStore } from './jsonFileSubscriberStore.js';
import type { SubscriberStore } from './subscriberTypes.js';

export * from './subscriberTypes.js';

let store: SubscriberStore | null = null;

export function getSubscriberStore(): SubscriberStore {
  store ??= config.apifyToken ? createApifySubscriberStore(config.apifyToken) : jsonFileSubscriberStore;
  return store;
}
