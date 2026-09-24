# Source investigation (Phase 1, updated Phase 4)

Investigation only — no feature code in this phase. Verified 2026-09-24 by fetching
the live sites/docs directly (not just search-engine summaries; see the note on
search-summary reliability below).

**Phase 4 update (2026-09-25):** re-checked nihsa.gov.ng before starting real
ingest, as planned — still down, same failure mode as Phase 1 (homepage 200
with a maintenance placeholder, every inner path 404, including the guessed
PDF path). See "Phase 4: what actually got ingested" below for how
`nihsaOutlook.ts`/`nihsaAdvisories.ts` get real data despite this.

## TL;DR / risks that need a human decision

1. **nihsa.gov.ng is currently down.** The homepage serves a static "under
   maintenance" page; every inner path (`/publications/*`, `/services/6`,
   `/flood-forecast-dashboard`, `/sitemap.xml`, `/robots.txt`) returns HTTP 404.
   We have no working, official, machine-readable source for the outlook or
   advisories right now. **Decide:** build `nihsaOutlook`/`nihsaAdvisories`
   against the last-known URL pattern and retry-with-backoff, and/or add a
   secondary ingestion path from news wire coverage (allAfrica, Guardian,
   Vanguard, NAN) as a degraded fallback, clearly marked lower-confidence.
2. **Open-Meteo's free tier flatly prohibits commercial use** — it's not just
   "intended for non-commercial," the pricing page lists Commercial use: ❌ for
   Free/Open-Access and ✅ only on paid plans. Since this Actor is monetised via
   Apify pay-per-event, **we cannot ship on the free tier**. **Decide:** budget
   for the paid "API Standard" plan (1M calls/month) before Store launch, or
   scope Phase 2 prototyping to the free tier and gate the switch to a paid
   `apikey` behind the `FLOOD_PROVIDER`/env-var seam the spec already asks for.
   Exact current price could not be confirmed (see below) — get a live quote
   before committing budget.
3. **News coverage of NIHSA advisories has no stable structure.** No advisory
   ID, no explicit date range, no per-river/station data — just a prose list of
   affected states. Section 6 (`riverPointsIds`) and the advisory→
   state/river matching in `score.ts` need to work off state names, not IDs.

## 1. NIHSA Annual Flood Outlook (`nihsa-outlook`)

- Site: `https://nihsa.gov.ng/` — returns HTTP 200 but the body is a static
  maintenance placeholder (base64 logo + "Website Under Maintenance"), no
  navigation or content.
- Every inner URL I could find or guess 404s as of 2026-09-24:
  `/publications`, `/publications/1` (labelled "AFO 2026" in Google's cached
  snippet), `/publications/4`, `/publications/5`, `/services/6`,
  `/flood-forecast-dashboard`, `/robots.txt`, `/sitemap.xml`.
- A direct PDF path surfaced in a search-engine cache:
  `https://nihsa.gov.ng/storage/publications/2026_AFO.pdf` — also 404s right
  now. Worth re-checking periodically; the path convention
  (`/storage/publications/{year}_AFO.pdf`) is a reasonable guess for when the
  site is back, but is **unconfirmed**, not something to hard-code as fact.
- No cached copy on the Wayback Machine (`archive.org/wayback/available`
  returned an empty `archived_snapshots` for `/publications/1`).
- Secondary confirmation that the 2026 AFO exists and its headline numbers
  (14,118 high-risk communities / 266 LGAs / 33 states + FCT, matching
  CLAUDE.md) come from news coverage, e.g. NEMA's own summary post and
  nigeriahousingmarket.com's writeup — not the PDF itself.
- **Recommendation:** treat NIHSA's PDF as unavailable until the site returns.
  `nihsaOutlook` ingest should fail soft (log + warning, keep last cached
  outlook categories in the KV store) rather than block a scheduled run.

## 2. NIHSA National Flood Advisories (`nihsa-advisories`)

- Same outage applies to `/services/6` (Flood Forecasting and Early Warning)
  and the dashboard — both 404.
- NIHSA does actively issue advisories right now (September 2026 saw at least
  two: a "Medium Flood Risk Advisory" for 17 states in July, and a high-risk
  riverine-flooding advisory for 15 states dated 19–25 Sept), but they reach
  the public via NEMA press statements and news wires, not a page I could
  fetch directly from NIHSA.
- I initially got an AI-search-engine summary claiming a specific advisory ID
  ("NFA-2026-262") with an exact date range. **I could not confirm this in any
  primary or secondary source I fetched directly** (Vanguard, allAfrica,
  NewsClickNG all attribute the alert to NIHSA/NEMA but cite no advisory
  number, date range, river, or station, and link to no source document). This
  looks like a fabricated detail from the search tool's synthesis step, not a
  real ID — a concrete reminder not to trust AI-generated search summaries as
  ground truth without checking the underlying page. Do not invent structured
  fields (advisory IDs, precise date ranges) in `nihsaAdvisories` parsing that
  the source material doesn't actually contain.
- What the secondary sources reliably give us: a **list of affected states**
  and a rough severity/timing description in prose (e.g. "15 states,
  19–25 Sept"). That's enough for a state-level `advisorySignal`, not enough
  for a river/station-level one, until NIHSA's own site is reachable again.
- **Recommendation:** design `nihsaAdvisories`'s output schema around
  `{ states: string[], severity, issuedAt, validFrom?, validTo?, sourceUrl }`
  with the date fields optional, and get state-level matching working first.
  Add river/station fields only once we can parse them from an actual NIHSA
  document.

## 3. Open-Meteo Flood API (GloFAS) — `glofas` module

Confirmed directly from `https://open-meteo.com/en/docs/flood-api` (raw HTML,
not summarised).

- **Endpoint:** `https://flood-api.open-meteo.com/v1/flood`
- **Required:** `latitude`, `longitude` (WGS84 floats; comma-separated for
  multiple points).
- **Key optional params:**
  | Param | Notes |
  |---|---|
  | `daily` | e.g. `river_discharge`, `river_discharge_mean/median/max/min/p25/p75` |
  | `past_days` | default 0 |
  | `forecast_days` | default 92, max 210 |
  | `start_date`/`end_date` | ISO date; **data available from 1984-01-01 until 7-month forecast** |
  | `ensemble` | bool; returns all ensemble members — **forecast only** |
  | `cell_selection` | `land` \| `sea` \| `nearest`; watch the exact default when wiring this up, the docs are slightly inconsistent about it |
  | `models` | `GloFAS v4 Seamless` (default), `GloFAS v4 Forecast`, `GloFAS v4 Consolidated`, plus v3 equivalents at coarser 0.1° |
  | `apikey` | only required for the commercial `customer-flood-api.open-meteo.com` endpoint |
- **Model composition (important for `baseline.ts`):** "Seamless" (the
  default) stitches together:
  - **GloFAS v4 Reanalysis**: global, 0.05° (~5 km), daily, **1984 – July 2022**
  - **GloFAS v4 Consolidated**: fills July 2022 → near-present
  - **GloFAS v4 Forecast**: 30 days, updated daily
  - **GloFAS v4 Seasonal Forecast**: 7 months, updated monthly
  A single `start_date=1984-01-01` request against the default seamless model
  should return one continuous daily series from 1984 to +7 months — no need
  to stitch reanalysis/consolidated/forecast ourselves.
- **Caveat for `baseline.ts`:** the API's own `river_discharge_p25`/`p75`/
  `mean`/`median`/`min`/`max` are **ensemble-spread statistics over the
  forecast horizon only** ("not available for consolidated historical data"
  per the docs) — a different concept from the p50/p90/p95/p99
  **climatological** percentiles the spec wants computed over historical
  daily discharge. We need to pull the raw `river_discharge` daily series for
  the historical range ourselves and compute those percentiles in our own
  code; we can't ask the API for them directly.
- Resolution is 0.05° (~5 km) for v4, which is coarse relative to a single
  river bridge — reinforces CLAUDE.md's existing warning that
  `river_points.json` coordinates need real care and human review.

## 4. Open-Meteo Weather Forecast API — `rainfall` module

- **Endpoint:** `https://api.open-meteo.com/v1/forecast`
- Precipitation variables: hourly `precipitation`/`rain`/`showers`/
  `snowfall`/`precipitation_probability`; daily `precipitation_sum`/
  `rain_sum`/`showers_sum`/`precipitation_hours`/
  `precipitation_probability_max/mean/min`.
- `forecast_days`: default 7, max 16.
- Same account/terms and commercial-use rules as the Flood API (see below) —
  it's the same platform and the same non-commercial-by-default licence.

## 5. Open-Meteo terms & commercial use — resolving CLAUDE.md's open question

Confirmed from `https://open-meteo.com/en/terms` and `/en/pricing` (raw HTML).

- Free/"Open-Access" tier: 600 calls/min, 5,000/hour, <10,000/day, and — this
  is the key fact — **"Commercial use: ❌"** is stated as a flat, binary
  restriction on the pricing page, not just discouraged. Non-commercial
  examples given: personal/non-profit apps without subscriptions or ads,
  home automation, public research, educational content. Anything with
  "subscriptions or advertisements" or integrated into a "commercial product"
  counts as commercial.
- Paid tiers (**API Standard** 1M calls/mo, **API Professional** 5M calls/mo,
  **API Enterprise** 50M+ calls/mo) all include a commercial-use licence, a
  dedicated `customer-` endpoint + `apikey`, no daily rate limit, and an
  uptime target.
- **I could not confirm exact current prices.** The pricing page renders its
  dollar figures client-side (nothing in the static HTML — no `$`, `€`, or
  price fields anywhere in the raw response); a commonly-quoted figure of
  ~$29/month for Standard showed up in a search-engine summary but I have no
  primary-source confirmation of it, so treat it as unverified. **Get a live
  quote from open-meteo.com/en/pricing in a browser, or email
  info@open-meteo.com, before budgeting** — don't build a cost model on the
  unverified number.
- **This Actor is monetised (Apify pay-per-event), so it is commercial use.**
  We must either (a) buy the Standard plan before public launch, or (b)
  develop against the free tier during the hackathon build (acceptable —
  prototyping/evaluation is arguably within bounds, though the site doesn't
  carve out an explicit hackathon exception) and switch to a paid `apikey` at
  launch. The `FLOOD_PROVIDER=openmeteo|copernicus` env var the spec already
  specifies is the right seam for this — keep `glofas.ts` behind that
  interface so swapping to a paid key (or to Copernicus's own GloFAS access
  as a fallback) is a config change, not a rewrite.

## Phase 4: what actually got ingested

`nihsaOutlook.ts` and `nihsaAdvisories.ts` are no longer mocked, but they're
also not parsing the real AFO PDF yet — nihsa.gov.ng is still down (see
above). What's actually running:

- **`nihsaOutlook.ts`**: `refreshOutlookFromPdf()` genuinely tries
  `ingest/parsePdf.ts` against the guessed PDF URL first, every run — it 404s
  every time so far, logs that, and `getOutlookCategory()` falls back to a
  **hand-verified, per-community table**. Each of the 13 MVP communities was
  checked individually by searching for its specific LGA name plus "flood
  risk 2026" and fetching the resulting article directly (not trusting the
  search tool's synthesized summary — same discipline as the advisory-ID
  check in Phase 1). All 13 came back HIGH, each attributed to a specific,
  dated statement from NEMA, a state's SEMA, or NIHSA itself naming that LGA
  — see the `sourceUrl`/`sourceName` in `nihsaOutlook.ts`. Read the "all 13
  are HIGH" result as selection bias, not a trivial classifier: these
  communities were picked in CLAUDE.md specifically because they sit on the
  Niger/Benue confluence system, so a high hit rate is expected.
  - A generic **state-level** proxy (e.g. "is Kogi one of the states in the
    2026 high-risk list?") was tried first and rejected: essentially all 33
    of Nigeria's 36 states + FCT show up on that list, so it doesn't
    discriminate between an MVP community and one nowhere near a major
    river. LGA-level, individually-sourced data was the only way to get a
    real signal.
- **`nihsaAdvisories.ts`**: one real, independently-verified advisory (the
  15-state, 19–25 Sept 2026 high-risk riverine flooding advisory — the same
  one whose fabricated "NFA-2026-262" ID was caught in Phase 1) is
  hand-entered with its real state list and date range. `isAdvisoryActive()`
  checks the current date against `validFrom`/`validTo`, so this will
  correctly stop firing once the advisory expires — there's no auto-refresh
  or new-advisory ingestion, so a stale/no-advisory state (not "no risk") is
  the expected outcome after 2026-09-25 until someone adds the next one.
  There's no live-fetch attempt for advisories the way there is for the
  outlook PDF, because — unlike a PDF's raw text, which an LLM can extract
  structure from without knowing anything about its layout — we have no idea
  what nihsa.gov.ng's advisories page actually looks like (it's never once
  been reachable), so there's no real page structure to write a scraper
  against yet. That's a real gap, not an oversight: it needs the site back up
  before a real scraper/parser can be designed at all.
- **`ingest/parsePdf.ts`** and the `LlmProvider` interface (`llm/`) are fully
  implemented — PDF fetch, text extraction, a prompt that scopes extraction
  to just our 13 communities (so a large national document doesn't need
  full-document structured extraction), zod validation, and a low-confidence
  review file written to the `nihsa-outlook-review` KV store — but **neither
  is exercised end-to-end in this environment**: the PDF 404s before any LLM
  call happens, and there's no `LLM_API_KEY` configured here either
  (confirmed by checking the environment before writing this). The
  LLM-extraction logic itself (`extractOutlookFromText`) is unit-tested with
  a fake `LlmProvider`, so the parsing/validation/confidence-splitting logic
  is verified even though the full pipeline isn't. This should start working
  automatically — no code change needed — the moment both the site returns
  and an Anthropic key is set via `LLM_PROVIDER=anthropic` / `LLM_API_KEY`.

## Note on methodology

Several early search-tool summaries in this investigation turned out to be
subtly wrong or fabricated when checked against the actual page (the
"NFA-2026-262" advisory ID above is the clearest example; a claimed
"$29/month" Standard price is the other). Every factual claim above with a
specific number, endpoint, or URL was re-verified by fetching the raw
page/HTML directly rather than trusting a search engine's synthesized answer.
Anything still marked "unverified" above should be re-checked the same way
before it's relied on for a scoring or billing decision.
