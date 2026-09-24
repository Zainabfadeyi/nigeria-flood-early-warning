import { z } from 'zod';

/**
 * Shapes for actor/data/communities.json and river_points.json.
 * Populated with real MVP data in Phase 2; only the schema lives here for now.
 */

export const riverPointSchema = z.object({
  id: z.string(),
  river: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  note: z.string(),
});
export type RiverPoint = z.infer<typeof riverPointSchema>;

export const communitySchema = z.object({
  id: z.string(),
  name: z.string(),
  lga: z.string(),
  state: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  riverPointIds: z.array(z.string()).min(0).max(3),
});
export type Community = z.infer<typeof communitySchema>;

export const communitiesFileSchema = z.array(communitySchema);
export const riverPointsFileSchema = z.array(riverPointSchema);

export const damReleaseSchema = z.object({
  dam: z.string(),
  announcedAt: z.string(),
  affectedRivers: z.array(z.string()),
  // Manually curated MVP config (see CLAUDE.md section 3): a human flips this
  // to false once a release is confirmed over/superseded, rather than
  // deleting the historical record.
  active: z.boolean().default(true),
  note: z.string().optional(),
  sourceUrl: z.string().optional(),
});
export type DamRelease = z.infer<typeof damReleaseSchema>;

export const damReleasesFileSchema = z.array(damReleaseSchema);
