import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { communitiesFileSchema, type Community } from '@nigeria-flood/shared';

// Reads the actor's data file directly rather than duplicating it — this
// only works because bot and actor are deployed from the same monorepo
// checkout for the MVP. If they're ever deployed as separate images, this
// needs its own copy or a small shared data service instead.
const COMMUNITIES_PATH = fileURLToPath(new URL('../../../actor/data/communities.json', import.meta.url));

const NEAREST_MATCH_MAX_KM = 25;
const EARTH_RADIUS_KM = 6371;

let cachedCommunities: Community[] | null = null;

export async function loadCommunities(): Promise<Community[]> {
  if (cachedCommunities) return cachedCommunities;
  const raw = JSON.parse(await readFile(COMMUNITIES_PATH, 'utf-8'));
  cachedCommunities = communitiesFileSchema.parse(raw);
  return cachedCommunities;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface TextMatch {
  community: Community;
  matchType: 'name' | 'lga' | 'state';
}

/**
 * Freeform WhatsApp text -> nearest known community. Deliberately simple
 * (substring matching on name/LGA/state, in that specificity order) rather
 * than a full geocoder — good enough for the 13 MVP communities, and it's
 * always followed by a confirmation step in the onboarding flow so a wrong
 * guess isn't silently accepted.
 */
export async function resolveByText(text: string): Promise<TextMatch | null> {
  const communities = await loadCommunities();
  const needle = text.trim().toLowerCase();
  if (!needle) return null;

  const nameMatch = communities.find((c) => needle.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(needle));
  if (nameMatch) return { community: nameMatch, matchType: 'name' };

  const lgaMatch = communities.find((c) => needle.includes(c.lga.toLowerCase()));
  if (lgaMatch) return { community: lgaMatch, matchType: 'lga' };

  const stateMatch = communities.find((c) => needle.includes(c.state.toLowerCase()));
  if (stateMatch) return { community: stateMatch, matchType: 'state' };

  return null;
}

export interface CoordinateMatch {
  community: Community;
  distanceKm: number;
}

export async function resolveByCoordinates(latitude: number, longitude: number): Promise<CoordinateMatch | null> {
  const communities = await loadCommunities();
  let nearest: Community | undefined;
  let nearestKm = Infinity;
  for (const community of communities) {
    const km = haversineKm(latitude, longitude, community.latitude, community.longitude);
    if (km < nearestKm) {
      nearestKm = km;
      nearest = community;
    }
  }
  if (nearest && nearestKm <= NEAREST_MATCH_MAX_KM) {
    return { community: nearest, distanceKm: nearestKm };
  }
  return null;
}
