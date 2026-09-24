import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { damReleasesFileSchema, type DamRelease } from '@nigeria-flood/shared';

let cachedReleases: DamRelease[] | null = null;

async function loadDamReleases(): Promise<DamRelease[]> {
  if (cachedReleases) return cachedReleases;
  const path = fileURLToPath(new URL('../../data/dam_releases.json', import.meta.url));
  const raw = JSON.parse(await readFile(path, 'utf-8'));
  cachedReleases = damReleasesFileSchema.parse(raw);
  return cachedReleases;
}

function riversMatch(a: string, b: string): boolean {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  return na.includes(nb) || nb.includes(na);
}

/** Manual MVP config (CLAUDE.md section 3) — no live monitoring yet, entries are hand-curated and toggled active/inactive. */
export async function findActiveDamRelease(riverNames: string[]): Promise<DamRelease | null> {
  const releases = await loadDamReleases();
  for (const release of releases) {
    if (!release.active) continue;
    const matches = riverNames.some((river) => release.affectedRivers.some((affected) => riversMatch(river, affected)));
    if (matches) return release;
  }
  return null;
}
