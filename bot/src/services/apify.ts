import { ApifyClient } from 'apify-client';
import { locationRiskSchema, type LocationRisk } from '@nigeria-flood/shared';
import { config } from '../config.js';

/**
 * Fetches the dataset produced by a finished Actor run and validates every
 * item against the shared LocationRisk schema — an item that doesn't match
 * (e.g. the Actor's output shape drifted) is dropped with a warning rather
 * than silently passed through to the alerting logic.
 *
 * Not exercised live in this environment (no deployed Actor run to fetch
 * from), same caveat as the other apify-client-backed pieces in this repo
 * (see apifySubscriberStore.ts).
 */
export async function fetchRunDatasetItems(runId: string): Promise<LocationRisk[]> {
  if (!config.apifyToken) {
    throw new Error('APIFY_TOKEN is not set — cannot fetch the Actor run dataset.');
  }
  const client = new ApifyClient({ token: config.apifyToken });
  const run = await client.run(runId).get();
  if (!run?.defaultDatasetId) {
    throw new Error(`Run ${runId} has no defaultDatasetId (not finished yet, or an invalid run id).`);
  }

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const results: LocationRisk[] = [];
  for (const item of items) {
    const parsed = locationRiskSchema.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data);
    } else {
      console.warn(`Dropping a dataset item that failed LocationRisk validation: ${parsed.error.message}`);
    }
  }
  return results;
}
