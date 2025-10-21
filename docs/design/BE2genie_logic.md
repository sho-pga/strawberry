# Backend Logic Flow: /prompt to genieService — Consolidated (2025-10-20 19:55:27)

This document captures the current, actual implementation (as of 2025-10-20) for the `/prompt` -> generation flow in the server. It summarizes the runtime wiring and the concrete modules in the codebase.

## High-level summary

- Controller: `POST /prompt` in `server/index.js` — validates input, delegates to `genieService.generate(prompt)`, attempts non-fatal DB persistence via `crud`, and returns a `{ success: true, data }` JSON payload.
- Service/Adapter: `server/genieService.js` — exposes `async generate(prompt)`, delegates to `sampleService.generateFromPrompt(prompt)` (awaits it), wraps result into `{ success: true, data: {...} }`, and provides helpers for file persistence (`saveContentToFile` is now provided by `server/utils/fileUtils.js`).
- Business/Mock: `server/sampleService.js` — mock implementation; `async generateFromPrompt(prompt)` builds content (title/body), requests prompt save via `fileUtils.saveContentToFile(prompt)` (non-fatal), and returns `{ content, copies }`.
- Utilities: `server/utils/fileUtils.js` — async `saveContentToFile(content)` implemented with `fs.promises` and an atomic temp-write/rename helper; `readLatest()` remains available (sync) to load the latest saved prompt for legacy routes.

## Priority: Succinct plan (apply immediately)

Succinct plan

- Contract

  - `genieService.generate(prompt)` — normalize prompt, return cached result if present, otherwise call the generation service and return the generated content wrapped as `{ success: true, data }`.
  - Generation services (e.g. `sampleService`, later `aetherService`) only produce `{ content, copies }` and do not write to the DB.

- Minimal implementation steps

  1.  In `genieService.generate`: normalize prompt and lookup DB for an existing prompt record.
  2.  If DB hit: load and return the latest AI result (include `promptId` and `resultId`).
  3.  If DB miss: call the generation service, receive `{ content, copies }`, then persist prompt and AI result from `genieService` (non-fatal) and return the envelope.
  4.  Remove DB writes from the `/prompt` controller — `genieService` owns persistence.
  5.  Keep `fileUtils.saveContentToFile()` as an optional, non-fatal disk log called by services.

- Concurrency (brief)

  - Do DB-first serial processing: if DB has a match, return immediately; only on miss proceed to generation.
  - For duplicate concurrent misses, prefer DB unique constraint + upsert as the baseline; optionally add in-process request coalescing to avoid duplicate AI calls.

- Non-fatal persistence

  - Persist failures (DB or disk) must be logged and not block returning generated content.

- Acceptance criteria
  - Repeated prompt → immediate DB return, no generation call.
  - New prompt → generation service called once, genieService stores prompt+result, response includes `promptId`/`resultId` when available.

Implementation schedule

This work will be implemented incrementally whenever time permits. Each Phase in the "Implementation plan — phased" section will be delivered on its own feature branch, gated by the `GENIE_PERSISTENCE_ENABLED` feature flag where applicable, and accompanied by tests and a short rollout/rollback note. Changes will be non-breaking by default and verified in staging before enabling in production.

```
Client Request
   │
   ▼
┌────────────────────────────┐
│ POST /prompt               │
│ (Controller in server/)    │
└────────────────────────────┘
   │
   ▼
┌────────────────────────────┐        (optional, non-fatal)
│ genieService               │◀────────────────────────────────┐
│ (Service / Adapter)        │                                 │
└────────────────────────────┘                                 │
   │                                                           │
   │ calls/awaits                                              │
   ▼                                                           │
┌────────────────────────────┐                                 │
│ sampleService              │                                 │
│ (Business logic - async)   │── calls ──▶ fileUtils.saveContentToFile()
└────────────────────────────┘                                 │
   │                                                           │
   ▼                                                           │
┌────────────────────────────┐                                 │
│ server/utils/fileUtils.js  │                                 │
│ (saveContentToFile / readLatest)                             |
└────────────────────────────┘                                 │
   │                                                           │
   ▼                                                           │
  (writes prompt files to server/data/)                        │
                                                               │
Controller (after receiving data)
  │
  └─ NO DB WRITES: controller is cut off from persistence. Persistence logic has been copied to `server/utils/dbUtils.js` and will be owned and invoked by `genieService` in a later phase. The controller MUST only forward the result returned by `genieService` and must not perform DB writes.

Legacy preview route: `/genie` or `/preview`
  │
  └─ calls fileUtils.readLatest() to display the most recent prompt

```

1. Client sends `POST /prompt` with JSON body `{ prompt: "..." }`.
2. `server/index.js` validates `prompt` and calls `await genieService.generate(prompt)`.
3. `server/genieService.generate(prompt)`:
   - Validates prompt (it already arrived validated by the controller).
   - Calls `await sampleService.generateFromPrompt(prompt)`.
   - Receives `{ content, copies }` and returns `{ success: true, data: { content, copies } }` to the controller.
4. `server/sampleService.generateFromPrompt(prompt)` (async):
   - Calls `fileUtils.saveContentToFile(prompt)` inside a `try/catch` to persist the prompt. Failures are logged but do not prevent returning the generated content.
   - Builds `content` (title: first N words; body: full prompt) and `copies` array.
   - Returns `{ content, copies }`.
5. Controller optionally writes DB records via `crud.createPrompt` and `crud.createAIResult` (non-fatal if DB writes fail) and sends HTTP 201 response with the data envelope.

### Key implementation notes

- `sampleService.generateFromPrompt` is `async` to allow direct awaiting of future async operations (file I/O, network/AI calls) without changing the controller or adapter layers.
- File writes moved to `server/utils/fileUtils.js` and are implemented with `fs.promises` and an atomic tmp-write+rename pattern for safety.
- `readLatest()` remains synchronous in `fileUtils` to serve legacy preview routes (`/genie`, `/preview`) without introducing async changes there.
- `server/data/` is ignored in `.gitignore` to avoid committing generated prompt files.

### Files of interest (paths)

- `server/index.js` — HTTP routes and controller orchestration
- `server/genieService.js` — adapter/service layer (awaits sampleService)
- `server/sampleService.js` — business/mock logic (async)
- `server/utils/fileUtils.js` — `saveContentToFile` (async) and `readLatest` (sync)
- `server/crud.js` — persistence helpers (DB)

### Acceptance criteria (runtime)

- `POST /prompt` returns 201 with `{ success: true, data: { content, copies, promptId?, resultId? } }`.
- Prompt persistence is non-fatal: failures to save to disk or DB do not prevent returning generated content.
- `genieService.generate` remains a stable `async` entrypoint for replacing the mock with real AI services in future.

### Next steps (recommended)

- Add unit tests for async generation and non-fatal save failures.
- Consider converting `readLatest()` to async if legacy routes are updated.
- Keep `PROMPT_LOG_PATH` config documented for deployment.

---

(Consolidated by automation on 2025-10-20 19:55:27)

## Implementation plan — phased

Below is a safe, incremental rollout plan to implement the Succinct plan while minimizing risk.

**Phase 0** — Prep & safety (0.5–1 day)

- Add feature flag: `GENIE_PERSISTENCE_ENABLED=false` by default.
- Add `server/utils/normalizePrompt.js` (trim + collapse whitespace). Default: do NOT lowercase.
- Scaffold unit test stubs and CI checks.
- Sanity: no change to runtime behavior when flag is false.
  Acceptance: repo builds and tests run; server starts with flag=false.

**Phase 1** — Read-only DB lookup in `genieService` (1–2 days)

- Implement normalized, read-only DB lookup in `genieService.generate(prompt)`.
- If found, return cached result; otherwise fall through to generation.
- Add unit and integration tests for hit/miss paths.
  Acceptance: DB hits return existing content; no DB writes performed.

**Phase 2** — Persistence in `genieService` behind flag (1–2 days)

- On miss, call generation service, then persist prompt/result from `genieService` using `crud.createPrompt` and `crud.createAIResult` inside try/catch blocks.
- Do not remove controller writes yet; keep both paths during rollout for safety and testing.
  Acceptance: when flag=true in staging, new prompts persist; failures are logged and do not crash.

**Phase 3** — Remove controller DB writes (0.5–1 day)

- After validating Phase 2 in staging, remove DB writes from `/prompt` controller.
- Update tests and ensure end-to-end behavior unchanged.
  Acceptance: controller no longer writes; genieService owns persistence.

**Phase 4** — DB dedupe (migration + upsert) (1–2 days)

- Add DB migration: unique index on normalized prompt text.
- Implement upsert behavior in `crud.createPrompt` to return existing record on conflict.
  Acceptance: duplicates are deduped at DB level.

Phase 5 — Optional in-process coalescing (0.5–1 day)

- Implement a per-prompt Promise map in `genieService` so concurrent misses for the same prompt await the same generation Promise.
- Use DB unique constraint as safety net.
  Acceptance: concurrent identical requests coalesce in-process.

Phase 6 — Docs, monitoring, cleanup (0.5–1 day)

- Update design docs, archived doc, and README with the final flow, feature flags, and migration steps.
- Add structured logs and basic metrics (hits/misses/persistence errors).
  Acceptance: docs updated; monitoring in place.

Risk mitigations & rollback

- Default flag=false. Rollout to staging first, enable flag in production only after smoke tests.
- Keep persistence attempts non-fatal (try/catch). Server must never crash from persistence errors.
- Rollback: set flag=false to stop persistence; revert PR if code bug requires it.

Questions & decisions needed

- Confirm normalization: trim + collapse whitespace, do NOT lowercase by default. OK?
- Confirm rollout strategy: staging-first, then production. OK?

## Decision: Standardize to PostgreSQL + Prisma (chosen)

After reviewing the repository and devcontainer configuration, we are standardizing on PostgreSQL with Prisma as the canonical database stack for this project. Rationale and concrete next steps are recorded here so this decision remains in-project (not ephemeral).

Findings that drove this choice

- `server/prisma/schema.prisma` exists and declares `provider = "postgresql"`.
- The devcontainer (`.devcontainer/docker-compose.yml` and `devcontainer.json`) provisions a `db` service using `postgres:16` and exposes port 5432. `DATABASE_URL` is configured to point at this service for the dev container.
- `@prisma/client` and `prisma` are present in `server/package.json`.
- Project health checks report `Prisma: OK` and `Schema: VALID` when running `./server/scripts/db-health.sh --check=all`.
- The runtime currently uses a legacy SQLite implementation (`server/db.js` + `server/crud.js`) which is functional but diverges from the declared Prisma/Postgres intent.

Decision summary

- Adopt PostgreSQL + Prisma as the canonical DB for the project.
- Migrate runtime code to use Prisma client (stepwise) and deprecate `server/db.js` + `server/crud.js` once parity is achieved and tests pass.

Actionable migration checklist

1. Replace `server/db.js`/`server/crud.js` raw-sql paths with Prisma client calls, or create `server/utils/dbUtils.js` that maps the existing `crud` API to Prisma client under the hood. Keep the `crud` shim around as an adapter for a short transition window if helpful for safer rollouts.
2. Migrate or seed any required SQLite data into Postgres if preserving historical data is necessary. If historical data can be discarded for the rollout, document that and proceed without a data migration.
3. Update tests and dev workflows to use Docker Postgres in CI and the devcontainer. Add a CI job that runs Prisma migrations and runs the test matrix against Postgres.
4. Add Prisma migration scripts (use `prisma migrate`), keep the `schema.prisma` in source, and document the migration/release steps.

Implementation guardrails

- Make changes behind the `GENIE_PERSISTENCE_ENABLED` feature flag where possible during the phased rollout.
- Keep persistence operations non-fatal (try/catch + logging) during early phases.
- Provide adapter shims (`server/utils/dbUtils.js` or `crud` wrappers) so we can incrementally replace call sites and test in staging without big-bang replacements.

If you agree with this decision I will create a feature branch and begin a small, focused PR to add `server/utils/dbUtils.js` implemented with Prisma client (not wired into runtime), plus unit tests and CI adjustments. This will make reviewing the Prisma runtime code easy and low-risk.

### Status update (2025-10-20)

Some work has already been implemented to make the migration reviewable and low-risk. Summary:

- Implemented `server/utils/dbUtils.js` — a Prisma-backed shim of the persistence API (exports: `createPrompt`, `createAIResult`, `getAIResultById`, `getPrompts`). Implementation notes:

  - Lazy-requires `@prisma/client` inside the getter so imports don't immediately instantiate a DB connection.
  - Exposes test helpers `_setPrisma(prismaInstance)` and `_resetPrisma()` so unit tests can inject a mock Prisma client without needing `prisma generate` or a running Postgres instance.

- Added unit tests: `server/__tests__/dbUtils.test.mjs` — uses an injected mock Prisma and verifies the wrapper shapes and return values. Tests are written as ESM test modules to work with Vitest and the existing server module system.

- Test run status:

  - I ran the server test suite (command: `npm --prefix server run test:run`). The new `dbUtils` tests pass.
  - There remain two unrelated server tests failing (pre-existing): one in `aiService` and one in `failure-modes` — these are unrelated to the Prisma shim and will be addressed separately.

- Wiring/runtime: the `dbUtils` module is not wired into runtime yet. The server still runs on the legacy SQLite path (`server/db.js` + `server/crud.js`). This was intentional: the Prisma shim was added as a non-invasive, reviewable artifact and will be wired behind the feature flag in a follow-up PR.

Next short actionable items

1. Create branch `feature/prisma-dbutils` and open a PR that contains `server/utils/dbUtils.js` and its tests. Keep the feature flag OFF and do not change runtime wiring in that PR.
2. Add a CI job (optional follow-up) that runs Prisma migrations and server tests against the devcontainer Postgres for integration confidence.
3. When the PR is approved, proceed to Phase 1: implement read-only lookups in `genieService` using `dbUtils` behind `GENIE_PERSISTENCE_ENABLED=false` and add integration tests.

If you want I can open the branch and PR now (it contains only the shim and tests). Otherwise I'll wait for your go-ahead before creating the branch.
