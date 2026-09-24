import { Actor } from 'apify';
import type { RiverPoint } from '@nigeria-flood/shared';
import { fetchHistory } from './sources/glofas.js';

export interface BaselinePercentiles {
  riverPointId: string;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  sampleSize: number;
  historyStart: string;
  historyEnd: string;
  computedAt: string;
}

const BASELINE_STORE_NAME = 'flood-baselines';
// GloFAS reanalysis/consolidated data goes back to 1984 (see sources/README.md);
// 20 years is enough history for stable percentiles without an enormous request.
const BASELINE_YEARS = 20;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower]!;
  const weight = rank - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

export function computePercentiles(riverPointId: string, values: number[], historyStart: string, historyEnd: string): BaselinePercentiles {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    riverPointId,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    sampleSize: sorted.length,
    historyStart,
    historyEnd,
    computedAt: new Date().toISOString(),
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Recomputes the baseline from GloFAS history, bypassing the cache. */
async function computeBaseline(point: RiverPoint): Promise<{ baseline: BaselinePercentiles | null; warnings: string[] }> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 7); // stay clear of the forecast-blended tail
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - BASELINE_YEARS);

  const historyStart = isoDate(startDate);
  const historyEnd = isoDate(endDate);
  const result = await fetchHistory(point, historyStart, historyEnd);

  if (!result.data || result.data.daily.length === 0) {
    return {
      baseline: null,
      warnings: result.warnings.length ? result.warnings : [`No historical discharge data for river point ${point.id}`],
    };
  }

  const baseline = computePercentiles(
    point.id,
    result.data.daily.map((d) => d.dischargeM3s),
    historyStart,
    historyEnd,
  );
  return { baseline, warnings: result.warnings };
}

/** Returns the cached baseline for a river point, computing and caching it if missing. Recompute rarely (see CLAUDE.md section 6). */
export async function getOrComputeBaseline(point: RiverPoint): Promise<{ baseline: BaselinePercentiles | null; warnings: string[] }> {
  const store = await Actor.openKeyValueStore(BASELINE_STORE_NAME);
  const cached = await store.getValue<BaselinePercentiles>(point.id);
  if (cached) {
    return { baseline: cached, warnings: [] };
  }

  const { baseline, warnings } = await computeBaseline(point);
  if (baseline) {
    await store.setValue(point.id, baseline);
  }
  return { baseline, warnings };
}
