import type { Confidence, Horizon, RiskLevel, RiskWindow } from '@nigeria-flood/shared';
import type { BaselinePercentiles } from './baseline.js';
import type { OutlookCategory } from './sources/nihsaOutlook.js';

export interface GlofasWindowSignal {
  forecastMaxM3s: number;
  peakDate?: string;
  baseline: BaselinePercentiles;
  /** Ensemble spread ((p75-p25)/discharge) on the peak day, when available — see sources/README.md. */
  spreadRatio?: number;
}

export interface ScoringInputs {
  days: Horizon;
  /** null = no usable GloFAS data for this community's river point(s) (off-channel, failed fetch, or no baseline yet). */
  glofas: GlofasWindowSignal | null;
  outlook: OutlookCategory;
  advisoryActive: boolean;
  heavyRainForecast: boolean;
  damReleaseActive: boolean;
}

// A spread this wide relative to the forecast itself means the ensemble members disagree a lot — treated as low confidence regardless of what the mean/max says.
const HIGH_SPREAD_RATIO = 0.5;

const SCORE_THRESHOLDS: Array<[number, RiskLevel]> = [
  [7, 'SEVERE'],
  [5, 'HIGH'],
  [3, 'MODERATE'],
  [1, 'LOW'],
];

function riskLevelFromScore(score: number): RiskLevel {
  for (const [threshold, level] of SCORE_THRESHOLDS) {
    if (score >= threshold) return level;
  }
  return 'NONE';
}

function computeConfidence(inputs: ScoringInputs): Confidence {
  if (!inputs.glofas) return 'low';
  if (inputs.glofas.spreadRatio !== undefined && inputs.glofas.spreadRatio > HIGH_SPREAD_RATIO) return 'low';
  if (inputs.outlook === 'NOT_LISTED') return 'medium';
  return 'high';
}

/**
 * Deterministic risk scoring (CLAUDE.md section 6). No AI in this function —
 * every point added to the score has a fixed reason string attached, so the
 * output can always explain itself. Score -> level thresholds and per-signal
 * weights are first-pass judgement calls (see actor/src/SCORING.md); the
 * important property to preserve when tuning them is that every level is
 * still reachable and every reason still traces back to a real signal.
 */
export function scoreWindow(inputs: ScoringInputs): RiskWindow {
  let score = 0;
  const reasons: string[] = [];
  let peakDate: string | undefined;

  if (inputs.glofas) {
    const { forecastMaxM3s, baseline } = inputs.glofas;
    const rounded = Math.round(forecastMaxM3s);
    if (forecastMaxM3s > baseline.p99) {
      score += 5;
      reasons.push(`River discharge is forecast to reach ${rounded} m3/s, above the 99th-percentile historical level (${Math.round(baseline.p99)} m3/s).`);
      peakDate = inputs.glofas.peakDate;
    } else if (forecastMaxM3s > baseline.p95) {
      score += 3;
      reasons.push(`River discharge is forecast to reach ${rounded} m3/s, above the 95th-percentile historical level (${Math.round(baseline.p95)} m3/s).`);
      peakDate = inputs.glofas.peakDate;
    } else if (forecastMaxM3s > baseline.p90) {
      score += 2;
      reasons.push(`River discharge is forecast to reach ${rounded} m3/s, above the 90th-percentile historical level (${Math.round(baseline.p90)} m3/s).`);
      peakDate = inputs.glofas.peakDate;
    }
  }

  if (inputs.outlook === 'HIGH') {
    score += 2;
    reasons.push("NIHSA's Annual Flood Outlook classifies this community as high risk.");
  } else if (inputs.outlook === 'MODERATE') {
    score += 1;
    reasons.push("NIHSA's Annual Flood Outlook classifies this community as moderate risk.");
  }

  if (inputs.advisoryActive) {
    score += 2;
    reasons.push("An active NIHSA flood advisory covers this community's state.");
  }

  if (inputs.heavyRainForecast) {
    score += 1;
    reasons.push(`Heavy rainfall is forecast at this location within the next ${inputs.days} days.`);
  }

  if (inputs.damReleaseActive) {
    score += 2;
    reasons.push("An announced upstream dam release may affect this community's river.");
  }

  if (reasons.length === 0) {
    reasons.push('No elevated signals detected across river discharge, NIHSA outlook/advisories, rainfall or dam releases.');
  }

  return {
    days: inputs.days,
    riskLevel: riskLevelFromScore(score),
    confidence: computeConfidence(inputs),
    ...(peakDate ? { peakDate } : {}),
    reasons,
  };
}

const RECOMMENDED_ACTIONS: Record<RiskLevel, string[]> = {
  SEVERE: [
    'Move to higher ground now if you are near the river.',
    'Keep emergency documents, medicine and a phone charger ready to go.',
    'Follow instructions from NEMA/SEMA and local authorities.',
  ],
  HIGH: [
    'Prepare to evacuate: identify a safe route and a place to stay away from the floodplain.',
    'Move valuables and livestock to higher ground.',
    'Monitor official updates closely over the next few days.',
  ],
  MODERATE: [
    'Avoid unnecessary travel near riverbanks and low-lying roads.',
    'Prepare an emergency bag in case conditions worsen.',
    'Check on neighbours who may be more vulnerable.',
  ],
  LOW: ['Stay aware of local weather and river-level updates.'],
  NONE: ['No specific action needed right now — continue normal activities.'],
};

const RISK_LEVEL_ORDER: RiskLevel[] = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'SEVERE'];

export function highestRiskLevel(windows: RiskWindow[]): RiskLevel {
  return windows.reduce<RiskLevel>((highest, w) => (RISK_LEVEL_ORDER.indexOf(w.riskLevel) > RISK_LEVEL_ORDER.indexOf(highest) ? w.riskLevel : highest), 'NONE');
}

export function recommendedActionsForLevel(level: RiskLevel): string[] {
  return RECOMMENDED_ACTIONS[level];
}
