import type { Horizon } from '@nigeria-flood/shared';
import type { BaselinePercentiles } from './baseline.js';
import { isWithinHorizon } from './dateWindow.js';
import type { RiverSeries } from './sources/glofas.js';
import type { GlofasWindowSignal } from './score.js';

export interface RiverPointSignal {
  forecast: RiverSeries;
  baseline: BaselinePercentiles;
}

/**
 * Reduces raw GloFAS series (possibly from several river points per
 * community) down to the single signal score.ts needs for one horizon: the
 * worst-relative-to-its-own-baseline point wins, since baselines differ per
 * point and a fixed river point may simply carry less water than another.
 * Points with no forecast data in the window, or no baseline, are skipped.
 */
export function buildGlofasWindowSignal(points: RiverPointSignal[], days: Horizon): GlofasWindowSignal | null {
  let best: { signal: GlofasWindowSignal; excess: number } | null = null;

  for (const { forecast, baseline } of points) {
    const windowDaily = forecast.daily.filter((d) => isWithinHorizon(d.date, days));
    if (windowDaily.length === 0) continue;

    const peak = windowDaily.reduce((max, d) => (d.dischargeM3s > max.dischargeM3s ? d : max));
    const excess = baseline.p90 > 0 ? peak.dischargeM3s / baseline.p90 : peak.dischargeM3s > 0 ? Number.POSITIVE_INFINITY : 0;
    const spreadRatio = peak.p25M3s !== undefined && peak.p75M3s !== undefined && peak.dischargeM3s > 0 ? (peak.p75M3s - peak.p25M3s) / peak.dischargeM3s : undefined;

    const signal: GlofasWindowSignal = {
      forecastMaxM3s: peak.dischargeM3s,
      peakDate: peak.date,
      baseline,
      ...(spreadRatio !== undefined ? { spreadRatio } : {}),
    };

    if (!best || excess > best.excess) {
      best = { signal, excess };
    }
  }

  return best?.signal ?? null;
}
