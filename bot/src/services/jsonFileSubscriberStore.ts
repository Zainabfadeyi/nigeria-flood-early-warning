import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Subscriber, SubscriberStore } from './subscriberTypes.js';

// Local-dev default so the onboarding flow is fully testable without Apify
// credentials — see apifySubscriberStore.ts for the production path.
const DATA_DIR = fileURLToPath(new URL('../../.data', import.meta.url));
const DATA_FILE = `${DATA_DIR}/subscribers.json`;

async function readAll(): Promise<Record<string, Subscriber>> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf-8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

async function writeAll(data: Record<string, Subscriber>): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export const jsonFileSubscriberStore: SubscriberStore = {
  async get(phone) {
    const all = await readAll();
    return all[phone] ?? null;
  },
  async save(subscriber) {
    const all = await readAll();
    all[subscriber.phone] = subscriber;
    await writeAll(all);
  },
  async delete(phone) {
    const all = await readAll();
    delete all[phone];
    await writeAll(all);
  },
  async listActive() {
    const all = await readAll();
    return Object.values(all).filter((s) => s.status === 'active');
  },
};
