import type { Community, LocationInput, ResolvedLocation } from '@nigeria-flood/shared';

export interface LocationMatch {
  resolved: ResolvedLocation;
  community: Community | null;
  matchNote?: string;
}

// Coordinates further than this from any known community are treated as
// outside MVP coverage rather than force-matched to the nearest one.
const NEAREST_MATCH_MAX_KM = 25;
const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findByNameOrLga(input: { community: string; lga?: string; state?: string }, communities: Community[]): Community | undefined {
  const name = input.community.trim().toLowerCase();
  const bySlug = name.replace(/\s+/g, '-');
  const exact = communities.find((c) => c.name.toLowerCase() === name || c.id.toLowerCase() === bySlug);
  if (exact) return exact;

  if (input.lga) {
    const lga = input.lga.trim().toLowerCase();
    const byLga = communities.filter((c) => c.lga.toLowerCase() === lga);
    if (byLga.length >= 1) return byLga[0];
  }
  if (input.state) {
    const state = input.state.trim().toLowerCase();
    const byState = communities.filter((c) => c.state.toLowerCase() === state);
    if (byState.length >= 1) return byState[0];
  }
  return undefined;
}

/**
 * Resolves an ActorInput location to a known MVP community, if possible.
 * Named locations are matched by exact name, then LGA, then state (first
 * match wins — this phase doesn't do fuzzy text geocoding; the bot's
 * geo.ts, built in Phase 5, handles free-text WhatsApp input more
 * thoroughly). Coordinate locations match the nearest community within
 * NEAREST_MATCH_MAX_KM.
 */
export function resolveLocation(input: LocationInput, communities: Community[]): LocationMatch {
  if ('community' in input) {
    const match = findByNameOrLga(input, communities);
    if (match) {
      return {
        resolved: {
          label: input.community,
          community: match.name,
          lga: match.lga,
          state: match.state,
          latitude: match.latitude,
          longitude: match.longitude,
        },
        community: match,
        matchNote: match.name.toLowerCase() === input.community.trim().toLowerCase() ? undefined : `Matched to nearest known community: ${match.name}`,
      };
    }
    return {
      resolved: { label: input.community, lga: input.lga, state: input.state },
      community: null,
    };
  }

  let nearest: Community | undefined;
  let nearestKm = Infinity;
  for (const community of communities) {
    const km = haversineKm(input.latitude, input.longitude, community.latitude, community.longitude);
    if (km < nearestKm) {
      nearestKm = km;
      nearest = community;
    }
  }

  const label = input.label ?? `${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}`;
  if (nearest && nearestKm <= NEAREST_MATCH_MAX_KM) {
    return {
      resolved: {
        label,
        community: nearest.name,
        lga: nearest.lga,
        state: nearest.state,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      community: nearest,
      matchNote: `Nearest MVP community: ${nearest.name} (~${nearestKm.toFixed(1)} km away)`,
    };
  }

  return {
    resolved: { label, latitude: input.latitude, longitude: input.longitude },
    community: null,
  };
}
