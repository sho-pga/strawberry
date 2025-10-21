# CURRENT_SERVICE_AGNOSTIC
[TUE 16th Sep 2025 @ 3:00PM]

I’ll explain whether the plumbing is currently service‑agnostic, where the remaining coupling is, and what to check/require for a true “plumbing-agnostic” design — no code changes, just an informational assessment and a short verification checklist.

## Quick summary

- Yes — the repository already follows the right pattern: server and frontend call small abstraction layers (`genieService` on the server; `genieServiceFE` on the client) so implementations can be swapped, but a few implicit contract/coupling points remain that you should confirm or harden for full service-agnostic guarantees.

## Why this matters

- Service-agnostic plumbing means UI and routing logic only rely on a stable contract (names/fields/errors), not on who implements the work behind that contract (sampleService, aetherService, etc.). That enables swapping in a full AI pipeline without changing UI wiring, tests, or most of the server routing.

## What the repo currently does (architecture view)

- Server:
  - `server/index.js` handles `POST /prompt` and delegates to `genieService.generate(prompt)`.
  - `genieService` in the demo delegates to `sampleService`. In future it can delegate to `aetherService`.
  - `index.js` then attempts best-effort persistence and returns `{ success: true, data: { content, copies, promptId?, resultId? } }`.
  - There is also an early `app.post("/prompt")` dev shortcut that returns deterministic content when `?dev=true`.
- Frontend:
  - `client/src/lib/flows.js` coordinates the UI flow: generate → set `contentStore` → preview.
  - `submitPrompt()` (in `client/src/lib/api.js`) talks to `/prompt`.
  - `client/src/lib/genieServiceFE.js` provides a single `generate()` entrypoint that either returns a dev payload or delegates to the server API.
  - `PreviewWindow.svelte` relies on `previewStore` and on preview HTML returned by `/preview`.

## Where the plumbing is already service-agnostic

- Server uses `genieService.generate(prompt)` as an abstraction — swapping `sampleService` → `aetherService` is just an implementation change behind the same API.
- Frontend calls `genieServiceFE.generate(prompt)` as the single entrypoint: the UI needn't know whether the service is local, demo, or server-backed.
- `GET /preview` is a single rendering endpoint that accepts either inline content or ids — clients request HTML, server decides how to produce it.

## Remaining coupling / implicit assumptions

These are places that still amount to “implicit contract” coupling and could break service agnosticism unless formalized:

1. Response shape expectations

   - Frontend expects content at either `response.data.content` (legacy) or `response.content`. Normalize this and document.
   - `copies` may be expected by some flows; new services must provide them or the FE should handle absence.

2. Required content fields

   - Many components require `title` and `body`. Any service must produce those fields (or FE must adapt).

3. Dev-mode exposure

   - `?dev=true` currently returns deterministic content and is not environment-gated. Decide policy.

4. Persistence semantics

   - `index.js` performs best-effort writes and returns demo payload immediately; FE sometimes expects IDs later.

5. Error format and handling

   - Frontend expects structured errors; services must return a compatible envelope.

6. Timing / async refresh
   - Current pattern: local content shown immediately, server persistence/IDs updated later. Services must fit this async model or FE must adapt.

## Acceptance checklist — what to verify

- Contract stability: `POST /prompt` returns a stable JSON envelope with `data.content.title` and `data.content.body` (or a documented alternate shape FE handles).
- Idempotence/persistence contract: document how/when `promptId`/`resultId` are provided.
- Error contract: standardize JSON `{ code, message, details }`.
- Dev-mode policy: decide whether `?dev=true` is allowed or gated.
- Preview contract: `GET /preview` accepts `content` or ids and returns HTML.
- Observability hooks: `previewStore` updates and `data-preview-ready` behavior remain stable.

## Recommended verification tests (quick)

- Unit test: mock `genieService`/`genieServiceFE` to return sample content and assert `contentStore`/`previewStore` update.
- Integration test: swap `sampleService` → `aetherService` and assert `POST /prompt` returns the same shape and UI preview updates.
- Edge test: call `/prompt` with and without `?dev=true` to confirm consistent behavior.
- Manual checks: curl the examples and inspect `data-testid="preview-content"` and `document.body.getAttribute('data-preview-ready')`.

## Practical recommendations (non-code)

- Document the exact contract in `docs/services_ref/E2E_PLUMBING.md`.
- Add a CI smoke test (curl + jq) that runs `POST /prompt?dev=true` and `GET /preview?content=...` to prevent regressions.
- Decide dev-mode policy and document it.

## Bottom line

- The codebase is structured correctly for service-agnostic plumbing: abstraction layers exist on both server and client. To prove it, document contracts, standardize errors, gate dev-mode if desired, and add a small set of verification tests.

---

_Recorded: TUE 16th Sep 2025 @ 10:30AM_
