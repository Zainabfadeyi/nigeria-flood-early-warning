import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Actor } from 'apify';
import {
  actorInputSchema,
  communitiesFileSchema,
  riverPointsFileSchema,
  type Community,
  type LocationRisk,
  type RiverPoint,
  type SourceRef,
} from '@nigeria-flood/shared';
import { getOrComputeBaseline } from './baseline.js';
import { buildGlofasWindowSignal, type RiverPointSignal } from './glofasSignal.js';
import { resolveLocation } from './resolveLocation.js';
import { highestRiskLevel, recommendedActionsForLevel, scoreWindow } from './score.js';
import { findActiveDamRelease } from './sources/damReleases.js';
import { fetchForecast } from './sources/glofas.js';
import { isAdvisoryActive } from './sources/nihsaAdvisories.js';
import { getOutlookCategory, refreshOutlookFromPdf } from './sources/nihsaOutlook.js';
import { fetchRainfallForecast, isHeavyRainForecast, RAINFALL_FORECAST_MAX_DAYS } from './sources/rainfall.js';

const BASE_LIMITATIONS = [
  'This is an independent early-warning tool, not an official government warning. Follow local authority guidance.',
  'Only riverine flood risk along a modelled river channel is captured (Niger-Benue system, plus the Ogun River near Ikorodu). Urban/flash flooding from local drainage is not captured (see CLAUDE.md section 3).',
];

async function loadJsonData(): Promise<{ communities: Community[]; riverPoints: RiverPoint[] }> {
  const dataDir = fileURLToPath(new URL('../data', import.meta.url));
  const [communitiesRaw, riverPointsRaw] = await Promise.all([
    readFile(`${dataDir}/communities.json`, 'utf-8').then(JSON.parse),
    readFile(`${dataDir}/river_points.json`, 'utf-8').then(JSON.parse),
  ]);
  return {
    communities: communitiesFileSchema.parse(communitiesRaw),
    riverPoints: riverPointsFileSchema.parse(riverPointsRaw),
  };
}

function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Map<string, SourceRef>();
  for (const source of sources) seen.set(source.url, source);
  return [...seen.values()];
}

function dedupe(strings: string[]): string[] {
  return [...new Set(strings)];
}

await Actor.init();

// Pay-per-event pricing (CLAUDE.md section 11, Phase 7): a small flat fee
// per run, on top of the per-location-check charge below. Must match the
// event name configured in Apify Console under Actor > Monetization exactly,
// or this charges nothing.
await Actor.charge({ eventName: 'actor-start' });

const rawInput = await Actor.getInput();
const input = actorInputSchema.parse(rawInput ?? {});
const { communities, riverPoints } = await loadJsonData();
const riverPointsById = new Map(riverPoints.map((p) => [p.id, p]));

// Attempted once per run, not once per community — tries the real AFO PDF
// first and falls back to sourced-but-static data per community (see
// sources/nihsaOutlook.ts) if it's unreachable, which is what actually
// happens today (nihsa.gov.ng has been down throughout this build).
for (const warning of await refreshOutlookFromPdf(communities)) {
  console.warn(`[nihsaOutlook] ${warning}`);
}

for (const locationInput of input.locations) {
  const match = resolveLocation(locationInput, communities);
  const warnings: string[] = [];
  const sources: SourceRef[] = [];

  if (!match.community) {
    const result: LocationRisk = {
      location: match.resolved,
      windows: input.horizons.map((days) => ({
        days,
        riskLevel: 'NONE' as const,
        confidence: 'low' as const,
        reasons: ['This location is outside the current MVP coverage area (Kogi, Benue, Adamawa, Anambra and Lagos communities near the Niger, Benue and Ogun rivers); no data sources were checked.'],
      })),
      recommendedActions: recommendedActionsForLevel('NONE'),
      sources: [],
      limitations: BASE_LIMITATIONS,
      warnings: [],
      generatedAt: new Date().toISOString(),
    };
    await Actor.pushData(result);
    await Actor.charge({ eventName: 'location-risk-check' });
    continue;
  }

  const community = match.community;
  if (match.matchNote) warnings.push(match.matchNote);

  const points = community.riverPointIds.map((id) => riverPointsById.get(id)).filter((p): p is RiverPoint => Boolean(p));
  if (points.length !== community.riverPointIds.length) {
    warnings.push(`Community ${community.id} references a river point id not found in river_points.json.`);
  }

  const maxHorizon = Math.max(...input.horizons, 7);

  const [riverPointSignals, rainfallResult, outlookResult, advisoryResult] = await Promise.all([
    Promise.all(
      points.map(async (point): Promise<RiverPointSignal | null> => {
        const [forecastResult, baselineResult] = await Promise.all([fetchForecast(point, maxHorizon), getOrComputeBaseline(point)]);
        warnings.push(...forecastResult.warnings, ...baselineResult.warnings);
        sources.push(...forecastResult.sources);
        if (!forecastResult.data || !baselineResult.baseline) return null;
        return { forecast: forecastResult.data, baseline: baselineResult.baseline };
      }),
    ),
    fetchRainfallForecast(community.latitude, community.longitude, Math.min(maxHorizon, RAINFALL_FORECAST_MAX_DAYS)),
    Promise.resolve(getOutlookCategory(community)),
    Promise.resolve(isAdvisoryActive(community.state)),
  ]);

  warnings.push(...rainfallResult.warnings, ...outlookResult.warnings, ...advisoryResult.warnings);
  if (rainfallResult.sources.length) sources.push(...rainfallResult.sources);

  const validRiverSignals = riverPointSignals.filter((s): s is RiverPointSignal => s !== null);
  const damRelease = await findActiveDamRelease(points.map((p) => p.river));

  const windows = input.horizons.map((days) => {
    const glofas = buildGlofasWindowSignal(validRiverSignals, days);
    const heavyRainForecast = rainfallResult.data ? isHeavyRainForecast(rainfallResult.data.daily, Math.min(days, RAINFALL_FORECAST_MAX_DAYS)) : false;
    return scoreWindow({
      days,
      glofas,
      outlook: outlookResult.category,
      advisoryActive: advisoryResult.active,
      heavyRainForecast,
      damReleaseActive: Boolean(damRelease),
    });
  });

  const limitations = [...BASE_LIMITATIONS];
  if (input.horizons.some((d) => d > RAINFALL_FORECAST_MAX_DAYS)) {
    limitations.push(`Rainfall forecasts are only available ${RAINFALL_FORECAST_MAX_DAYS} days ahead; longer windows' rain signal only reflects the first ${RAINFALL_FORECAST_MAX_DAYS} days.`);
  }

  const result: LocationRisk = {
    location: match.resolved,
    matchedCommunity: community.id,
    windows,
    recommendedActions: recommendedActionsForLevel(highestRiskLevel(windows)),
    sources: input.includeSources ? dedupeSources(sources) : [],
    limitations,
    warnings: dedupe(warnings),
    generatedAt: new Date().toISOString(),
  };

  await Actor.pushData(result);
  // Pay-per-event pricing (CLAUDE.md section 11, Phase 7): one billable
  // event per location checked. The actual USD price per event is set in
  // Apify Console under Actor > Monetization, not in this repo — there's no
  // local pricing config file for it (verified against Apify's current docs
  // when this was wired up).
  await Actor.charge({ eventName: 'location-risk-check' });
}

await Actor.exit();
