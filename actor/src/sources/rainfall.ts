import { isWithinHorizon } from '../dateWindow.js';
import { runSource, type SourceOutcome } from './types.js';

// See actor/src/sources/README.md: forecast_days maxes out at 16 for this
// endpoint, well short of the 30-day horizon — callers must account for that.
const WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast';
export const RAINFALL_FORECAST_MAX_DAYS = 16;

export interface DailyPrecipitation {
  date: string;
  precipitationMm: number;
}

export interface RainfallForecast {
  daily: DailyPrecipitation[];
}

interface WeatherApiResponse {
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
  };
}

export async function fetchRainfallForecast(latitude: number, longitude: number, forecastDays = RAINFALL_FORECAST_MAX_DAYS): Promise<SourceOutcome<RainfallForecast>> {
  const url = new URL(WEATHER_API_BASE);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', 'precipitation_sum');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', String(Math.min(forecastDays, RAINFALL_FORECAST_MAX_DAYS)));

  return runSource(
    'rainfall',
    [{ name: 'Open-Meteo Weather Forecast API', url: url.toString(), retrievedAt: new Date().toISOString() }],
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = (await response.json()) as WeatherApiResponse;
      const dates = json.daily?.time ?? [];
      const values = json.daily?.precipitation_sum ?? [];
      const daily: DailyPrecipitation[] = [];
      for (let i = 0; i < dates.length; i++) {
        const value = values[i];
        const date = dates[i];
        if (typeof value === 'number' && date) {
          daily.push({ date, precipitationMm: value });
        }
      }
      return { daily };
    },
  );
}

// Single-day precipitation_sum threshold, mm — a placeholder pending real
// NiMet bulletins (CLAUDE.md section 3 calls this API a proxy until then).
export const HEAVY_RAIN_THRESHOLD_MM = 50;

export function isHeavyRainForecast(daily: DailyPrecipitation[], days: number): boolean {
  return daily.some((d) => isWithinHorizon(d.date, days) && d.precipitationMm >= HEAVY_RAIN_THRESHOLD_MM);
}
