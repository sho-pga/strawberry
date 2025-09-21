# Microlog spec — Focus doc

Purpose

- Define a small, synchronous client-side logging contract (micrologs) used as the UI's "eyes & ears" to detect and triage dead GUI scenarios and to make behavioral tests deterministic.

Principles

- Micrologs are lightweight, synchronous, and appended to an in-memory array `window.__MICROLOGS`.
- Do not include full user content (no PII). Use prompt length or a short hash only.
- Emit micrologs before any awaited async work so they reveal where a flow stopped.

Format (JSON)

- ts: ISO timestamp
- id: short monotonic id or short UUID (e.g., `gen-1234`)
- event: descriptive string (e.g., `generate:start`)
- step: fine-grain step id (e.g., `button-pressed`, `request-sent`, `dom-updated`)
- level: `debug|info|warn|error`
- meta: object with non-PII keys (e.g., requestId, promptLen, suggestionId, elapsedMs)

Runtime behavior

- Implementation: an array `window.__MICROLOGS = window.__MICROLOGS || []` and a small helper `window.__microlog(event, step, level, meta)` that pushes a JSON object and truncates to last 100 entries.
- Dev UI: optional on-screen debug pill (dev mode only) that shows last 3 micrologs for quick triage.
- Tests: E2E tests may read `window.__MICROLOGS` to assert that flows progressed beyond `button-pressed`.

Usage guidance

- Emit `*:button-pressed` on immediate button press handlers.
- Emit `*:start` just prior to network calls and include a `requestId` in meta.
- Emit `*:interaction_followup` upon first DOM mutation or first stream chunk.
- Emit `*:success` / `*:fail` at flow end.

Security & privacy

- Never include raw prompt or content. Use `meta.promptLen` or `meta.promptHash` (short, non-reversible) only.

Runbook snippet (triage)

1. User reports no visible response. Open Console → `window.__MICROLOGS.slice(-20)`.
2. If last entry is `*-button-pressed` only, suspect frontend wiring / long task / swallowed error.
3. If `*:start` present but no `*:interaction_followup`, check network (HAR) and server logs using `requestId`.

Testing contract

- E2E tests must assert the expected microlog sequence; if micrologs stop early the test fails (dead GUI detected).

---
