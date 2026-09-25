# Bot notes (Phases 5-6)

## What's real vs. simulated in this environment

Verified live (not just unit-tested) by starting the server and sending
correctly-signed simulated Twilio webhook requests, plus real calls to the
Twilio Messages API:

- Full onboarding: JOIN → language choice → location (text or pin) →
  auto-confirm or one YES follow-up → subscribed. STOP deletes the
  subscriber; CHANGE restarts language+location.
- Twilio request signature verification actually rejects a forged or missing
  `X-Twilio-Signature` (403), not just in theory.
- The `/webhooks/apify/simulate` and `/webhooks/apify/inbound` secret checks
  actually reject a missing/wrong `?secret=`.
- The full alert pipeline: 4 test subscribers in 4 languages, subscribed to
  the same community, all correctly alerted from one `/simulate` call;
  re-firing the same risk level correctly sends nothing; escalating further
  (HIGH → SEVERE) correctly re-alerts; replying `1` correctly renders the
  full alert with the real `recommendedActions`/`reasons` and the
  "Forward to family..." line.
- The real Twilio Messages API call itself (`services/whatsapp.ts`) — this
  hadn't been exercised before Phase 6 (Phase 5's onboarding replies all go
  out as TwiML in the webhook response, a different code path). Sending to
  made-up numbers that never joined the sandbox was still accepted
  (HTTP-level success) with no error, which is expected: Twilio accepts a
  send for delivery and reports failure asynchronously via status callbacks,
  not synchronously from `.create()` — this repo doesn't implement status
  callback handling, so a delivery failure to a real-but-unreachable number
  wouldn't be visible to us. Worth adding a status callback route before
  relying on this for anything beyond a demo.

**Not exercised live** (no `APIFY_TOKEN`, no deployed Actor run in this
environment — same honesty pattern as the LLM/PDF pipeline in
`actor/src/ingest/parsePdf.ts`):

- `services/apifySubscriberStore.ts` (the Apify-KV-store `SubscriberStore`)
- `services/apify.ts`'s `fetchRunDatasetItems` and the real
  `/webhooks/apify/inbound` path that depends on it end to end

## Design decisions worth knowing about

- **The scheduled Actor run is expected to check all MVP communities (14 as
  of the Lagos/Ikorodu addition), not just currently-subscribed ones.**
  CLAUDE.md phrases this as "checks all subscribed communities," but keeping
  the Actor's schedule input dynamically in sync with the bot's live
  subscriber list would mean the Actor calling back into the bot (or the bot
  triggering Actor runs itself) — real added complexity for little benefit
  at this scale and pay-per-event pricing, where checking a few unsubscribed
  communities costs little. `/webhooks/apify/inbound` does the actual "who
  cares about this community" filtering on the bot side.
- **Alert templates aren't registered as approved WhatsApp/Meta Content
  Templates.** CLAUDE.md section 8 calls for business-initiated alerts to
  use approved templates, since WhatsApp requires that outside a 24h
  customer-service session. `alertShort`/`alertReminder` are sent as
  freeform text via the Messages API, which the Twilio *sandbox* tolerates
  for testing but a real WhatsApp Business number would likely reject
  outside a session window. Registering a real template is a Twilio
  Console/Meta Business Manager step outside what this codebase can do —
  needs doing before a real (non-sandbox) launch.
- **No voice notes.** CLAUDE.md section 8's unsupported-language workaround
  mentions "a voice note if one exists for that risk level" — there's no
  audio asset pipeline here at all (nothing to record or generate real
  voiceover from). Text-only for now.
- **Non-English templates are gated behind `reviewedBy`/`reviewedAt`**
  (`templates/index.ts`) until a native speaker actually reviews them —
  verified live in Phase 5 that picking e.g. Yoruba got English text while
  unreviewed. As of 2026-09-25 all four (`ha.ts`/`yo.ts`/`ig.ts`/`pcm.ts`)
  were reviewed and approved by Zainab Fadeyi and now serve their own text.
  If any of these needs correcting later, set `reviewedBy`/`reviewedAt` back
  to `null` on that file to re-gate it to English pending another review.
