# Scoring notes (living doc)

## Phase 2 finding: town/LGA coordinates often miss the river channel

The first pass at `river_points.json` used town or LGA-headquarters
coordinates directly. Running `node dist/main.js` against the real Open-Meteo
Flood API showed 7 of 13 points returning single-digit or zero m3/s discharge
— several orders of magnitude below what the Niger/Benue mainstems actually
carry. This matches CLAUDE.md's own warning: GloFAS is a 0.05° (~5 km) grid,
and a coordinate a short distance from the true channel lands on a dry or
minor-tributary cell instead.

Fixed by a small grid search (querying neighbouring 0.05° cells around each
suspect point and picking whichever one returns mainstem-scale discharge):

| Point | Before | After | Discharge found |
|---|---|---|---|
| `niger-lokoja-confluence` | 7.7533, 6.7567 (0.05 m3/s) | 7.7750, 6.7250 | 8,629 m3/s |
| `niger-ibaji` | 6.8833, 6.6833 (2.2 m3/s) | 6.8750, 6.5750 | 7,550 m3/s |
| `benue-agatu` | 7.8917, 7.9094 (0.4 m3/s) | 7.9750, 7.9250 | 5,740 m3/s |
| `niger-onitsha` | 6.1670, 6.7830 (7.8 m3/s) | 6.1750, 6.7250 | 7,481 m3/s |
| `niger-atani` | 6.1214, 6.7696 (35.6 m3/s) | 6.1250, 6.7250 | 7,481 m3/s |

**Still unresolved:** `benue-guma` — a ±0.1° search (including diagonals)
never found a cell above 40 m3/s. Either Gbajimba sits on a minor tributary
rather than the Benue mainstem, or the true channel is further than this
search radius covered. Left at its original LGA-centroid coordinate, flagged
`UNRESOLVED` in `river_points.json`, and should not be trusted for scoring
until someone checks it against satellite imagery. `benue-demsa` (already
low-confidence — only a bounding box, not a real point, was found for it in
Phase 1/2 research) hasn't been checked against the grid at all yet.

**Takeaway for future data entry:** a grid-search-for-plausible-discharge
pass like this is a cheap, useful sanity check before trusting any new
`river_points.json` entry — cheap because Open-Meteo's flood endpoint accepts
comma-separated lists of lat/lon pairs in a single request, so a whole
neighbourhood of candidate cells can be checked in one call. It's a proxy for
"on the channel," not a substitute for actually looking at satellite
imagery, and it can't be run at all for a brand-new area until we know
roughly what discharge to expect there.

## Scoring rules (Phase 3, `score.ts`)

Deterministic point score per window, converted to a risk level by threshold.
No AI — every point added has a fixed, human-readable reason string attached
to it, so `reasons` in the output always explains the score. See
`score.test.ts` for the full behavioural spec; this is the summary.

**Signal weights** (each independent; more than one can fire per window):

| Signal | Condition | Points | Reason text |
|---|---|---|---|
| GloFAS discharge | forecast max > baseline p99 | +5 | "...above the 99th-percentile historical level..." |
| GloFAS discharge | forecast max > baseline p95 (not p99) | +3 | "...above the 95th-percentile..." |
| GloFAS discharge | forecast max > baseline p90 (not p95) | +2 | "...above the 90th-percentile..." |
| NIHSA outlook | HIGH | +2 | "...classifies this community as high risk." |
| NIHSA outlook | MODERATE | +1 | "...classifies this community as moderate risk." |
| NIHSA advisory | active for this community's state | +2 | "An active NIHSA flood advisory covers..." |
| Rainfall | heavy rain (≥50mm/day) forecast in window | +1 | "Heavy rainfall is forecast..." |
| Dam release | active announced release on this river | +2 | "An announced upstream dam release may affect..." |

**Score → risk level:** 0 → NONE, 1-2 → LOW, 3-4 → MODERATE, 5-6 → HIGH, 7+ →
SEVERE. The weights were chosen so that a single isolated GloFAS p99 breach
(the strongest individual signal we have) reaches HIGH on its own, and a
single p95/p90 breach or any one soft signal (outlook/advisory/rain/dam)
lands at MODERATE or LOW respectively — multiple simultaneous signals stack
to escalate further. These are first-pass judgement calls, not derived from
any historical validation against real flood outcomes; tune them once we
have real outlook/advisory data (Phase 4) and, ideally, some hindcast
evidence of past flood events to check against.

**Confidence:** `low` if there's no usable GloFAS data for the community's
river point(s) (off-channel, fetch failure, or wide ensemble spread — see
`HIGH_SPREAD_RATIO` in score.ts) regardless of what else fired; `medium` if
GloFAS data exists but the community isn't in the NIHSA outlook; `high`
otherwise. GloFAS is treated as the primary quantitative signal, so its
absence caps confidence even if outlook/advisory data looks solid.

**Multiple river points per community:** `glofasSignal.ts` picks whichever
of the community's river points is furthest above its *own* baseline p90 (as
a ratio, not absolute m3/s) — different points naturally carry very
different absolute discharge, so comparing relative to each one's own
history is what makes them comparable.

**Outlook/advisory data (real as of Phase 4, but not from the live PDF):**
`nihsaOutlook.ts` and `nihsaAdvisories.ts` now return real, individually
sourced 2026 data instead of Phase 3's illustrative mock — see
sources/README.md's "Phase 4: what actually got ingested" section for what
that data is, how it was verified, and why it isn't the actual AFO PDF
(nihsa.gov.ng has been unreachable through every phase so far). Every result
still carries a warning explaining exactly which fallback source was used,
so this stays visible in the output rather than looking like a live feed.
The score.ts interface didn't need to change from Phase 3 to Phase 4 — only
the outlook category and advisory-active values it receives are now real.
