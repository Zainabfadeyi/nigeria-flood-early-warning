# Nigeria Flood Early Warning

Turns Nigeria's official flood forecasts and river discharge data into a
clear, community-level answer: **how likely is this specific place to
flood in the next 7 or 30 days, and why?**

## The problem

Nigeria's 2026 Annual Flood Outlook (NIHSA) lists over 14,000 high-risk
communities across 33 states. The warnings are real, but they're published as
PDFs, press briefings and technical advisories — not in a form a resident,
NGO, insurer, or logistics team can act on for one specific town. This Actor
answers the one question that matters: *what's the risk here, right now?*

## What it does

For each location you give it, the Actor combines:

- **NIHSA's Annual Flood Outlook** — the official baseline risk category for
  that community
- **NIHSA flood advisories** — active state-level warnings
- **GloFAS river discharge forecasts** (via Open-Meteo) — is the river
  forecast to run higher than its historical norm for this time of year?
- **Rainfall forecasts** (via Open-Meteo) — is heavy rain expected?
- **Known dam releases** — e.g. Cameroon's Lagdo Dam, which affects the
  Benue River

...into a single `NONE | LOW | MODERATE | HIGH | SEVERE` risk level per
7-day and 30-day window, with **every contributing reason spelled out** —
this Actor never gives a risk level without explaining exactly which signals
produced it.

## Coverage (MVP)

Riverine flooding along the Niger–Benue confluence system, plus one South
West pilot community on the Ogun River — 14 communities across 5 states:

| State | Communities |
|---|---|
| Kogi | Lokoja, Ajaokuta, Onyedega (Ibaji) |
| Benue | Makurdi, Obagaji (Agatu), Gbajimba (Guma) |
| Adamawa | Yola/Jimeta, Numan, Demsa |
| Anambra | Onitsha, Atani (Ogbaru), Nzam (Anambra West), Otuocha/Aguleri (Anambra East) |
| Lagos | Ikorodu |

Ikorodu is a pilot for expanding beyond the Niger-Benue system: it has a real
riverine signal (the Ogun River, affected by Oyan Dam releases), unlike most
of Lagos, which floods mainly from overwhelmed urban drainage — a mechanism
this Actor doesn't model. Ikorodu's result draws on the same GloFAS/outlook
signals as every other community; other Lagos LGAs (Lekki, Victoria Island,
etc.) are not yet covered and would need the same per-community verification
work before being added.

A location outside this list (or too far from any of these communities) gets
a clear "outside current coverage" result rather than a guess. Coverage is
expected to expand over time.

**Not covered:** urban flash flooding (e.g. Lagos-style drainage flooding) —
the underlying river-discharge model doesn't capture it. See Limitations.

## Input

```json
{
  "locations": [
    { "community": "Lokoja", "lga": "Lokoja", "state": "Kogi" },
    { "latitude": 7.7322, "longitude": 8.5391, "label": "Near Makurdi" }
  ],
  "horizons": [7, 30],
  "includeSources": true,
  "mode": "check"
}
```

| Field | Type | Description |
|---|---|---|
| `locations` | array (required) | Each entry is **either** `{ community, lga?, state? }` (matched against the 14 known communities by name, then LGA, then state) **or** `{ latitude, longitude, label? }` (matched to the nearest known community within 25km). |
| `horizons` | `[7\|30]` | Which forecast windows to return. Default: both. |
| `includeSources` | boolean | Attach the source URLs used for each result. Default: `true`. |
| `mode` | `"check"` \| `"ingest"` | `"check"` scores the given locations (default). `"ingest"` additionally attempts to refresh the NIHSA outlook from source before scoring. |

## Output

One dataset item per input location:

```json
{
  "location": { "label": "Lokoja", "community": "Lokoja", "lga": "Lokoja", "state": "Kogi", "latitude": 7.8, "longitude": 6.74 },
  "matchedCommunity": "kogi-lokoja",
  "windows": [
    {
      "days": 7,
      "riskLevel": "MODERATE",
      "confidence": "high",
      "reasons": [
        "NIHSA's Annual Flood Outlook classifies this community as high risk.",
        "An active NIHSA flood advisory covers this community's state."
      ]
    },
    { "days": 30, "riskLevel": "MODERATE", "confidence": "high", "reasons": ["..."] }
  ],
  "recommendedActions": ["Avoid unnecessary travel near riverbanks and low-lying roads.", "..."],
  "sources": [{ "name": "Open-Meteo Flood API (GloFAS)", "url": "...", "retrievedAt": "..." }],
  "limitations": ["This is an independent early-warning tool, not an official government warning. Follow local authority guidance.", "..."],
  "warnings": [],
  "generatedAt": "2026-09-25T00:00:00.000Z"
}
```

See `SCORING.md` in the source repo for the exact scoring rules and weights,
and `sources/README.md` for how every data source was verified.

## Limitations & disclaimer

- **This is an independent early-warning tool, not an official government
  warning.** Always follow guidance from NIHSA, NEMA and your local
  authorities. Every result repeats this disclaimer.
- **Riverine flooding only.** Urban/flash flooding from local drainage is not
  modelled.
- **NIHSA's own website has been unreachable throughout this Actor's
  development.** Outlook categories currently come from independently
  verified news coverage of NEMA/state-emergency-agency/NIHSA statements
  naming each community's LGA directly (source cited per community in the
  code), not the official PDF — the Actor automatically tries the real PDF
  first on every run and will use it the moment NIHSA's site is reachable
  again, with no config change needed.
- **GloFAS resolution is ~5km.** River points were placed and, where the
  first placement returned implausibly low discharge, corrected by checking
  neighbouring grid cells against known real-world discharge figures — not
  by walking the riverbank. Treat individual `warnings` entries as the
  authoritative caveat for any given result.
- A `NONE`/`LOW` result means *no elevated signal was found in the sources
  this Actor checks* — it is not a guarantee of safety.

## Pricing

Pay-per-event:
- **$0.00005** per run (`actor-start`) — a small flat fee, once per run regardless of how many locations you check
- **$0.003** per location checked (`location-risk-check`) — billed for every location, whether it resolves to a known community or comes back as outside current coverage, since either way you get a complete, explained answer

## How to run it

**From the Apify Store / Console:** open the Actor, go to the **Input** tab
(it's prefilled with a working example — Lokoja, Makurdi, and Yola/Jimeta by
name, plus a raw-coordinate example), and click **Start**. Results appear as
they're computed under the **Output** tab and in the run's dataset.

**Via the Apify API/CLI**, once you have an API token:
```bash
curl -X POST "https://api.apify.com/v2/acts/zainab77~nigeria-flood-early-warning/run-sync-get-dataset-items?token=<APIFY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"locations": [{"community": "Lokoja", "lga": "Lokoja", "state": "Kogi"}]}'
```
`run-sync-get-dataset-items` runs the Actor and returns the dataset directly
in the response — the simplest way to call it programmatically. For a
longer-running batch (many locations), use the regular `runs` endpoint and
poll, or set up a Schedule + Webhook in Console to run it automatically (see
`bot/src/README.md` for how the companion bot does exactly that).

No environment variables are required to run it — see `sources/README.md`
for the one optional `LLM_PROVIDER`/`LLM_API_KEY` pair, which only affects a
currently-unreachable ingest path (NIHSA's site has been down throughout
development) and has a safe no-op fallback either way.

## Technologies used

- **TypeScript** (strict, ESM, Node 20+), built with the Apify SDK for JS
- **[Open-Meteo Flood API](https://open-meteo.com/en/docs/flood-api)**
  (GloFAS v4) for river discharge forecasts and historical baselines
- **Open-Meteo Weather Forecast API** for rainfall forecasts
- **NIHSA** (Nigeria Hydrological Services Agency) Annual Flood Outlook and
  advisories — real per-community data sourced from verified news coverage
  while nihsa.gov.ng is unreachable, with an LLM-assisted PDF-extraction
  pipeline (Anthropic Claude, behind a swappable `LlmProvider` interface)
  ready to take over automatically once the site is back
- **zod** for runtime validation of all external data (API responses, dataset
  items, LLM output)
- **pdf-parse** for PDF text extraction
- npm workspaces monorepo, shared between this Actor and a companion Express
  + Twilio WhatsApp bot (`bot/`, deployed separately, not part of this Store
  listing)

## Companion WhatsApp bot

This Actor is the data engine behind a WhatsApp alert bot (not part of this
Actor's Store listing) that lets residents opt in to be notified by WhatsApp,
in their own language, only when a subscribed community's risk level rises.
