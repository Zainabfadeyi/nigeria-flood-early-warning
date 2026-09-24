# Nigeria Flood Early-Warning Agent — Build Spec for Claude Code

This file is the source of truth for our Apify hackathon build. Read it fully before writing code. Work **one phase at a time** and stop at the end of each phase so a human can review and test before moving on. When something here is uncertain (an API detail, a page structure), investigate and report back instead of guessing.

## 1. The problem

Nigeria's 2026 Annual Flood Outlook (NIHSA) lists 14,118 high-risk communities across 266 LGAs in 33 states and the FCT. The warnings exist, but they are locked in PDFs, press briefings and technical advisories that the people at risk never see. We turn them into a clear, community-level answer and deliver it on WhatsApp in the person's own language.

## 2. What we're building

Two pieces in one monorepo:

1. **Apify Actor** `nigeria-flood-early-warning` — the product the judges score. Given one or more locations, it returns a flood risk level for the next 7 and 30 days, the reasons, recommended actions, and official sources. Deterministic scoring. Published on the Apify Store with pay-per-event pricing.
2. **WhatsApp alert bot** — an Express server. People opt in on WhatsApp, share a location and pick a language. A scheduled Actor run checks every subscribed location, and the bot alerts people only when their risk level rises.

There is no web frontend.

## 3. Data sources

Each source is its own module and must fail independently (log it, add a warning, keep going).

| Module | Source | What we take | Notes |
| --- | --- | --- | --- |
| `nihsa-outlook` | NIHSA Annual Flood Outlook (PDF) | Baseline risk category per community/LGA/state (high, moderate, low) | Parse once per year at ingest; store as a dataset/KV record |
| `nihsa-advisories` | NIHSA National Flood Advisories (website/PDF) | Active advisories: states, rivers, stations near thresholds, dates | Check for new advisories on each scheduled run |
| `glofas` | Open-Meteo Flood API (GloFAS model) | Daily river discharge forecast + ensemble spread; historical discharge for baselines | Verify endpoint and params against current docs |
| `rainfall` | Open-Meteo weather forecast API | Forecast precipitation for the location | Proxy until NiMet bulletins are added |
| `dam-releases` | Manual config file for the MVP | Announced releases (e.g. Lagdo, Kainji, Shiroro) with affected downstream rivers | Roadmap: monitor official notices and news |

**Open question for the team (do not skip):** Open-Meteo's free API is intended for non-commercial use. Because we will monetise the Actor, confirm the terms and either budget for their commercial plan or plan a switch to GloFAS data from Copernicus. Build the `glofas` module behind an interface so the provider can change.

**GloFAS caveat:** GloFAS is a river-routing model. Coordinates must sit on or very near a river channel, otherwise discharge values are meaningless. We never query a user's home coordinates directly. Instead, each community is linked to one or more **river reference points** (see section 6).

**GloFAS does not capture urban flash flooding** (e.g. Lagos drainage flooding). For those areas, rely on the outlook baseline, advisories and rainfall, and say so in the output.

## 4. MVP scope

Focus on riverine flooding along the Niger–Benue system, where the data is strongest:

- **Kogi** (Niger–Benue confluence: Lokoja, Ibaji, Ajaokuta area)
- **Benue** (Makurdi and riverside LGAs)
- **Adamawa** (Benue upstream: Yola area, affected by Lagdo releases)
- **Anambra** (downstream Niger: Ogbaru, Anambra West)

Roughly 20–40 communities total is plenty for the demo. Expand later.

## 5. Repo structure

```
/
├── CLAUDE.md
├── package.json                 # npm workspaces: actor, bot, shared
├── tsconfig.base.json
├── shared/src/
│   ├── risk.ts                  # types + zod schemas
│   └── locations.ts             # community ↔ LGA ↔ state ↔ river points
├── actor/
│   ├── .actor/{actor.json, input_schema.json}
│   ├── Dockerfile
│   ├── data/
│   │   ├── communities.json     # MVP communities with coords + LGA + state
│   │   ├── river_points.json    # reference points on rivers, per community
│   │   └── dam_releases.json    # manual MVP config
│   └── src/
│       ├── main.ts
│       ├── sources/
│       │   ├── types.ts         # Source interface
│       │   ├── nihsaOutlook.ts
│       │   ├── nihsaAdvisories.ts
│       │   ├── glofas.ts
│       │   ├── rainfall.ts
│       │   └── damReleases.ts
│       ├── ingest/
│       │   └── parsePdf.ts      # PDF → text → LLM-assisted structured extraction
│       ├── baseline.ts          # historical discharge percentiles per river point
│       ├── score.ts             # deterministic risk scoring
│       └── cache.ts
└── bot/src/
    ├── server.ts
    ├── routes/{twilio.ts, apify.ts}
    ├── services/{whatsapp.ts, apify.ts, subscribers.ts, geo.ts}
    ├── templates/               # approved alert wording per language
    │   ├── en.ts  ha.ts  yo.ts  ig.ts  pcm.ts
    └── flows/{onboarding.ts, alerts.ts, replies.ts}
```

## 6. Core logic

### River reference points
`river_points.json` links each MVP community to 1–3 points placed on the nearest relevant river channel (e.g. a bridge or known hydrological station). Record the river name and a short note on why the point was chosen. Humans will review this file.

### Baselines
For each river point, fetch historical daily discharge (several years) once and cache percentiles (p50, p90, p95, p99) in the key-value store. Recompute rarely.

### Scoring (deterministic, no AI)
For each community, over the 7-day and 30-day windows:

- `glofasSignal`: forecast max discharge at its river points vs the cached percentiles (e.g. above p95 → elevated, above p99 → severe). Use ensemble spread to set confidence.
- `outlookBaseline`: NIHSA outlook category for the community/LGA (high / moderate / low / not listed).
- `advisorySignal`: an active NIHSA advisory covering its state or river.
- `rainSignal`: heavy forecast rainfall at the location.
- `damSignal`: an announced upstream release affecting its river.

Combine into `riskLevel`: `NONE | LOW | MODERATE | HIGH | SEVERE`, plus `confidence: low | medium | high`. Keep the rules in one readable function with unit tests, and output every reason that contributed. Document the rules in `actor/src/SCORING.md`.

### Where AI is used (and where it is not)
- **Yes:** extracting structured data from NIHSA PDFs and advisories at ingest time. Always validate the output with zod, keep the source URL and page, and flag low-confidence extractions for human review.
- **Yes:** drafting translations of alert templates offline, which a native speaker must approve before use.
- **No:** deciding risk levels or writing alert text at send time. Alerts use fixed, approved wording with variables only.

## 7. Actor input and output

Input (mirror in `input_schema.json` with a prefilled example for Lokoja):

```ts
interface ActorInput {
  locations: Array<
    | { community: string; lga?: string; state?: string }
    | { latitude: number; longitude: number; label?: string }
  >;
  horizons?: (7 | 30)[];          // default [7, 30]
  includeSources?: boolean;        // default true
  mode?: 'check' | 'ingest';       // 'ingest' refreshes outlook/advisories/baselines
}
```

Output, one dataset item per location:

```ts
interface LocationRisk {
  location: { label: string; community?: string; lga?: string; state?: string; latitude: number; longitude: number };
  matchedCommunity?: string;       // how the input was resolved
  windows: Array<{
    days: 7 | 30;
    riskLevel: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
    confidence: 'low' | 'medium' | 'high';
    peakDate?: string;             // ISO date
    reasons: string[];             // plain English, one per signal
  }>;
  recommendedActions: string[];    // fixed list chosen by risk level
  sources: Array<{ name: string; url: string; retrievedAt: string }>;
  limitations: string[];           // e.g. "Urban flash flooding not modelled"
  warnings: string[];              // failed or stale sources
  generatedAt: string;
}
```

Every output includes a limitation stating this is an independent early-warning tool, not an official government warning, and that people should follow local authority guidance.

## 8. WhatsApp bot

### Onboarding (opt-in only)
1. User sends `JOIN` (or taps a wa.me link / QR code).
2. Bot explains what they are signing up for and how to stop (`STOP`).
3. User picks a language: English, Hausa, Yoruba, Igbo, Pidgin.
4. User shares a WhatsApp location pin, or types their community/LGA. `geo.ts` resolves it to the nearest MVP community; if unclear, ask one follow-up question.
5. Store the subscriber: phone, community, coordinates, language, consent timestamp, last alert level.

Never import, scrape or buy phone numbers. Collect only what is listed above.

### Alerts
- A scheduled Apify run (daily; configurable) checks all subscribed communities and sends results to `POST /webhooks/apify`.
- For each subscriber: send an alert **only if the risk level rose** since their last alert (or a SEVERE level persists for 48h — send one reminder).
- Business-initiated messages must use approved templates. Keep a short template in a supported language (English; Hausa `ha` is supported). Check Meta's current supported-language list for Yoruba and Igbo.
- Workaround for unsupported languages: send a short template ("Flood alert for your area. Reply 1 for details."). When the user replies, the 24-hour conversation window opens and the bot sends the full alert in their language, plus a voice note if one exists for that risk level.
- Every alert ends with a forward line: "Forward to family in {community}. To get alerts, send JOIN to {number}."

### Replies
- `1` → full details in the user's language, with reasons and sources.
- `STOP` → unsubscribe immediately and confirm.
- `CHANGE` → change language or location.
- Anything else → short help menu.

### Templates
`bot/src/templates/<lang>.ts` holds fixed strings with `{variables}`. Each file has a `reviewedBy` and `reviewedAt` field. Refuse to send in a language whose templates are not marked reviewed (fall back to English and log it).

## 9. Conventions

- TypeScript strict, ESM, Node 20+. Apify SDK + Crawlee for the Actor; `apify-client`, Express and Twilio SDK for the bot.
- Validate all external input with zod (APIs, PDFs, LLM output, Twilio payloads). Verify Twilio request signatures.
- All secrets in environment variables; provide `.env.example`.
- LLM behind an `LlmProvider` interface, selected by env var.
- Unit tests for `score.ts`, `baseline.ts`, `geo.ts` and template rendering.
- Respect site terms and rate limits; cache aggressively in the key-value store.
- Store subscribers in the Apify key-value store for the MVP, behind a `SubscriberStore` interface so we can swap to Postgres (e.g. Supabase) later.

## 10. Environment variables

```
# Bot
APIFY_TOKEN=
APIFY_ACTOR_ID=
PUBLIC_BASE_URL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
BOT_JOIN_NUMBER=           # shown in the forward line
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
PORT=3000

# Actor (set in Apify Console)
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
FLOOD_PROVIDER=openmeteo   # openmeteo | copernicus
```

## 11. Phases

Complete one phase, run it, and stop for review.

**Phase 0 — Scaffold.** Workspaces, tsconfig, lint, `.env.example`, shared types, Actor skeleton. *Done when* `npm run build` passes everywhere.

**Phase 1 — Source investigation (no feature code).** Find the current NIHSA outlook PDF and advisories page; confirm the Open-Meteo flood and weather API parameters and terms; list findings, URLs and risks in `actor/src/sources/README.md`. *Done when* a human has approved the findings.

**Phase 2 — GloFAS + baselines.** Build `communities.json` and `river_points.json` for the MVP states (draft coordinates, flagged for human review), the `glofas` module and `baseline.ts`. *Done when* the Actor prints forecast vs percentile for each river point.

**Phase 3 — Scoring and output.** `score.ts` with tests, `rainfall` and `damReleases` modules, full `LocationRisk` output. Start with the outlook and advisory signals mocked. *Done when* `apify run` with the Lokoja example returns a valid, explained result.

**Phase 4 — NIHSA ingest.** `parsePdf.ts` and the `nihsaOutlook` / `nihsaAdvisories` modules, with LLM-assisted extraction, zod validation and a review file of low-confidence rows. *Done when* real outlook categories and at least one real advisory flow into scoring.

**Phase 5 — Bot onboarding.** Twilio sandbox webhook, onboarding flow, language choice, location pin and text resolution, subscriber store, `STOP`/`CHANGE`. *Done when* a test phone can subscribe and unsubscribe.

**Phase 6 — Alerts.** Scheduled run → Apify webhook → escalation logic → templated alerts → "Reply 1" details in each language. Add a `simulate` admin endpoint (protected by a secret) that injects a fake advisory so we can trigger alerts live in the demo. *Done when* four test phones in four languages receive the right alert from one simulated advisory.

**Phase 7 — Store readiness.** README (problem, input/output examples, sources, limitations, disclaimer), pay-per-event pricing (e.g. per location risk check), MCP-friendly input/output descriptions, example tasks. *Done when* the Actor is published and runs from the Store page.

## 12. Demo requirements

- Pre-compute baselines and cache results so runs are fast.
- The bot replies to any message within 2 seconds.
- The live demo: four phones subscribed in different languages and communities, one simulated advisory, all four receive the correct alert at once.
- Graceful handling of: location outside MVP coverage, stale sources, failed sources, unrecognised messages.

## 13. Out of scope for the hackathon

SMS/USSD fallback (roadmap: an African SMS provider such as Africa's Talking), urban flash-flood modelling, automatic dam-release monitoring, a web dashboard, and coverage outside the four MVP states.
