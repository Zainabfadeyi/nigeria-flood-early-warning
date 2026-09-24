import { ApifyClient } from 'apify-client';
import type { Subscriber, SubscriberStore } from './subscriberTypes.js';

const STORE_NAME = 'flood-bot-subscribers';

// Apify KV store keys must be URL-safe; phone numbers contain '+' and ':'.
function encodeKey(phone: string): string {
  return Buffer.from(phone).toString('base64url');
}

/**
 * CLAUDE.md's literal "Apify key-value store for the MVP" option. Not
 * exercised in this environment — APIFY_TOKEN isn't set here, so
 * subscribers.ts falls back to jsonFileSubscriberStore instead (see there).
 * This should work as-is once a token is configured; the interface is the
 * same either way, so nothing else needs to change.
 */
export function createApifySubscriberStore(token: string): SubscriberStore {
  const client = new ApifyClient({ token });
  let storeIdPromise: Promise<string> | null = null;

  function getStoreId(): Promise<string> {
    storeIdPromise ??= client
      .keyValueStores()
      .getOrCreate(STORE_NAME)
      .then((store) => store.id);
    return storeIdPromise;
  }

  return {
    async get(phone) {
      const storeId = await getStoreId();
      const record = await client.keyValueStore(storeId).getRecord(encodeKey(phone));
      return (record?.value as Subscriber | undefined) ?? null;
    },
    async save(subscriber) {
      const storeId = await getStoreId();
      // Subscriber is a plain JSON-serializable object; apify-client's JsonValue type from
      // its transitive type-fest dependency isn't worth importing just for this cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await client.keyValueStore(storeId).setRecord({ key: encodeKey(subscriber.phone), value: subscriber as any });
    },
    async delete(phone) {
      const storeId = await getStoreId();
      await client.keyValueStore(storeId).deleteRecord(encodeKey(phone));
    },
    async listActive() {
      const storeId = await getStoreId();
      const store = client.keyValueStore(storeId);
      const subscribers: Subscriber[] = [];
      let exclusiveStartKey: string | undefined;
      do {
        const page = await store.listKeys({ exclusiveStartKey });
        for (const item of page.items) {
          const record = await store.getRecord(item.key);
          const value = record?.value as Subscriber | undefined;
          if (value?.status === 'active') subscribers.push(value);
        }
        exclusiveStartKey = page.isTruncated ? page.nextExclusiveStartKey : undefined;
      } while (exclusiveStartKey);
      return subscribers;
    },
  };
}
