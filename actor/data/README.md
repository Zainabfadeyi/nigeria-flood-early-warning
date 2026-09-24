# Actor data

## communities.json / river_points.json (Phase 2 draft)

13 communities across the four MVP states (Kogi, Benue, Adamawa, Anambra), each
linked to one river reference point on the Niger, Benue or Anambra River. This
is a first pass, below the "20-40 communities" target in `CLAUDE.md` section
4, meant to be expanded and verified by a human before relying on it for real
alerts.

Community coordinates (town/LGA centroids) come from Wikipedia/Wikidata.
River point coordinates started from those same centroids, then most were
corrected by querying the live GloFAS/Open-Meteo grid and nudging toward
whichever neighbouring 0.05° cell actually carries mainstem-scale discharge —
see each point's `note` in `river_points.json` for the before/after numbers.
This is a reasonable proxy for "on the channel" but is not the same as
checking against satellite imagery, and should still be reviewed by a human,
especially given GloFAS's global model resolution and stated urban/local
limitations.

Known issues still open:
- `benue-guma`: unresolved. A ±0.1° grid search (incl. diagonals) never found
  a cell above 40 m3/s near Gbajimba — either it's on a minor tributary, or
  the real channel is further away than that search radius. Don't use this
  point for scoring until it's fixed.
- `benue-demsa`: only a bounding box was found for Demsa LGA; the coordinate
  here is that box's midpoint, not a real place, and hasn't been checked
  against the GloFAS grid at all yet.

## dam_releases.json

Not yet created — manual MVP config for announced releases (Lagdo, Kainji,
Shiroro), planned for Phase 3 alongside `damReleases.ts`.
