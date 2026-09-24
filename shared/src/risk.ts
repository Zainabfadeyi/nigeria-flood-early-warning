import { z } from 'zod';

export const RISK_LEVELS = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'SEVERE'] as const;
export const riskLevelSchema = z.enum(RISK_LEVELS);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export const confidenceSchema = z.enum(CONFIDENCE_LEVELS);
export type Confidence = z.infer<typeof confidenceSchema>;

export const HORIZONS = [7, 30] as const;
export const horizonSchema = z.union([z.literal(7), z.literal(30)]);
export type Horizon = z.infer<typeof horizonSchema>;

export const actorModeSchema = z.enum(['check', 'ingest']);
export type ActorMode = z.infer<typeof actorModeSchema>;

export const namedLocationInputSchema = z.object({
  community: z.string(),
  lga: z.string().optional(),
  state: z.string().optional(),
});

export const coordinateLocationInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().optional(),
});

export const locationInputSchema = z.union([
  namedLocationInputSchema,
  coordinateLocationInputSchema,
]);
export type LocationInput = z.infer<typeof locationInputSchema>;

export const actorInputSchema = z.object({
  locations: z.array(locationInputSchema).min(1),
  horizons: z.array(horizonSchema).default([7, 30]),
  includeSources: z.boolean().default(true),
  mode: actorModeSchema.default('check'),
});
export type ActorInput = z.infer<typeof actorInputSchema>;

export const resolvedLocationSchema = z.object({
  label: z.string(),
  community: z.string().optional(),
  lga: z.string().optional(),
  state: z.string().optional(),
  // Optional: a named location that doesn't match any known community and
  // has no coordinates of its own can't be geocoded in this phase (see
  // resolveLocation.ts) — better to omit lat/lon than fabricate 0,0.
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type ResolvedLocation = z.infer<typeof resolvedLocationSchema>;

export const riskWindowSchema = z.object({
  days: horizonSchema,
  riskLevel: riskLevelSchema,
  confidence: confidenceSchema,
  peakDate: z.string().optional(),
  reasons: z.array(z.string()),
});
export type RiskWindow = z.infer<typeof riskWindowSchema>;

export const sourceRefSchema = z.object({
  name: z.string(),
  url: z.string(),
  retrievedAt: z.string(),
});
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const locationRiskSchema = z.object({
  location: resolvedLocationSchema,
  matchedCommunity: z.string().optional(),
  windows: z.array(riskWindowSchema),
  recommendedActions: z.array(z.string()),
  sources: z.array(sourceRefSchema),
  limitations: z.array(z.string()),
  warnings: z.array(z.string()),
  generatedAt: z.string(),
});
export type LocationRisk = z.infer<typeof locationRiskSchema>;
