import type { RiverPoint } from '@nigeria-flood/shared';
import { runSource, type SourceOutcome } from './types.js';

// See actor/src/sources/README.md for how these parameters were confirmed.
const FLOOD_API_BASE = 'https://flood-api.open-meteo.com/v1/flood';

export interface DailyDischarge {
  date: string;
  dischargeM3s: number;
  /** Ensemble spread (forecast only, not available for historical data — see sources/README.md). */
  p25M3s?: number;
  p75M3s?: number;
}

export interface RiverSeries {
  riverPointId: string;
  daily: DailyDischarge[];
}

interface FloodApiResponse {
  daily?: {
    time?: string[];
    river_discharge?: (number | null)[];
    river_discharge_p25?: (number | null)[];
    river_discharge_p75?: (number | null)[];
  };
}

function parseDaily(json: FloodApiResponse): DailyDischarge[] {
  const dates = json.daily?.time ?? [];
  const values = json.daily?.river_discharge ?? [];
  const p25s = json.daily?.river_discharge_p25 ?? [];
  const p75s = json.daily?.river_discharge_p75 ?? [];
  const result: DailyDischarge[] = [];
  for (let i = 0; i < dates.length; i++) {
    const value = values[i];
    const date = dates[i];
    if (typeof value === 'number' && date) {
      const p25 = p25s[i];
      const p75 = p75s[i];
      result.push({
        date,
        dischargeM3s: value,
        ...(typeof p25 === 'number' ? { p25M3s: p25 } : {}),
        ...(typeof p75 === 'number' ? { p75M3s: p75 } : {}),
      });
    }
  }
  return result;
}

async function fetchDaily(point: RiverPoint, dailyVars: string, params: Record<string, string>, sourceName: string): Promise<SourceOutcome<RiverSeries>> {
  const url = new URL(FLOOD_API_BASE);
  url.searchParams.set('latitude', String(point.latitude));
  url.searchParams.set('longitude', String(point.longitude));
  url.searchParams.set('daily', dailyVars);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return runSource(
    sourceName,
    [{ name: 'Open-Meteo Flood API (GloFAS)', url: url.toString(), retrievedAt: new Date().toISOString() }],
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for river point ${point.id}`);
      }
      const json = (await response.json()) as FloodApiResponse;
      return { riverPointId: point.id, daily: parseDaily(json) };
    },
  );
}

/** Forecast discharge (plus ensemble p25/p75 spread) for the given number of days ahead. */
export async function fetchForecast(point: RiverPoint, forecastDays = 30): Promise<SourceOutcome<RiverSeries>> {
  return fetchDaily(
    point,
    'river_discharge,river_discharge_p25,river_discharge_p75',
    { forecast_days: String(forecastDays), past_days: '0' },
    'glofas.forecast',
  );
}

/** Historical daily discharge for a date range, for computing baseline percentiles. No ensemble spread (see sources/README.md). */
export async function fetchHistory(point: RiverPoint, startDate: string, endDate: string): Promise<SourceOutcome<RiverSeries>> {
  return fetchDaily(point, 'river_discharge', { start_date: startDate, end_date: endDate }, 'glofas.history');
}
