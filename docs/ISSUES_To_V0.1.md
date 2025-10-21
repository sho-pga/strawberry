# ISSUES → v0.1 (Production-like demo)

Goal

Produce a production-like v0.1 demo of AetherPress that reliably demonstrates the core user flow:

Prompt → AI Processing → Preview → Basic Override → PDF Export

This document defines the minimal acceptance criteria, prioritized tasks, PR branches, testing expectations, and a compressed schedule to reach v0.1.

---

v0.1 Minimal Acceptance Criteria (must-have)

1. Demo reproducibility
   - A reviewer can clone the repo, follow README/devcontainer steps, and produce a PDF demo using the provided script or UI.
2. End-to-end core loop
   - API endpoints exist and work together: `/prompt`, `/preview` (POST for large payloads), `/override`, `/export` (returns PDF binary with Content-Type: application/pdf).
3. Dev environment reproducibility
   - Devcontainer installs dependencies (or local steps documented), `CHROME_PATH` supported, and `npm run smoke:export` works from `server/`.
4. Health & readiness
   - `GET /health` returns structured JSON with `db` and `puppeteer` readiness and appropriate 200/503 codes.
5. Tests & CI
   - Unit tests for critical server endpoints and a lightweight core-loop integration test run in CI (or nightly gated job). Quick PR smoke checks run non-blocking.
6. Documentation & demo
   - `docs/V0.1_CHECKLIST.md` or README shows exact commands to reproduce the demo; includes a sample PDF in `samples/`.

---

High-level plan (short)

Phase 1 — Stabilize core (P0): health, preview POST, smoke export

- Implement structured health endpoint and align docker-compose healthcheck.
- Convert preview endpoint to POST and update client wrapper.
- Ensure `npm run smoke:export` works without manual NODE_PATH (wrapper added).

Phase 2 — Tests & CI (P1): integration, CI gating

- Add a core-loop integration test (prompt->preview->export) that runs in CI or nightly.
- Quick PR smoke job (non-blocking) ensures basic health and install.
- Gated full export job runs nightly/manual and uploads artifact.

Phase 3 — Docs & demo (P2): polish

- Finalize README steps and `docs/V0.1_CHECKLIST.md` for demo walkthrough.
- Add sample PDFs and demo script.

---

Prioritized task checklist (PR-sized, owners, estimates)

P0 (do first — unblock demo)

- [ ] server/health-structured (owner: backend) — 1.5h

  - Add structured `GET /health` JSON with `db` and `puppeteer` sections.
  - Return 503 when critical services unavailable.
  - Include unit test and small integration curl test.

- [ ] server/preview-post (owner: backend) — 2h

  - Add POST `/preview` to accept large content in request body.
  - Keep legacy GET `/preview` as deprecated shim (optional).
  - Add server test for large payload handling.

- [ ] client/preview-post (owner: frontend) — 2h (parallel)

  - Update `client/src/lib/endpoints.js` to POST for `preview` and update component usage/tests.

- [ ] smoke:export reliability (owner: backend) — 0.5h
  - Ensure wrapper script exists (`server/scripts/run_smoke_export.sh`) and README documents usage.

P1 (stabilize + CI)

- [ ] core-loop integration test (owner: backend) — 2h

  - Add `server/__tests__/coreFlow.integration.test.js` that exercises prompt → preview → override → export (mock AI service for speed).
  - Mark export part optional in PR CI if flaky; run full in nightly job.

- [ ] CI: quick-smoke non-blocking (owner: devops) — 1h (done)

  - Ensure PRs run a quick health check that does not block merges.

- [ ] CI: gated full export (owner: devops) — 1h (done)
  - Nightly/manual artifact upload; add timeouts and artifact retention.

P2 (polish)

- [ ] docs/V0.1_CHECKLIST.md + sample PDFs (owner: docs) — 1–2h

  - Step-by-step demo script, commands to reproduce, and known limitations.

- [ ] CI core-flow runner (owner: devops) — 1.5h
  - Add isolated CI job to run integration tests with stable environment (optional gated).

---

Testing & acceptance criteria per task

- Health endpoint: unit test asserts JSON keys and 200/503 behavior; integration `curl` to `/health` must return 200 in healthy state.
- Preview POST: server test posts a 100KB payload and receives HTML string; client test verifies POST usage and handles non-JSON responses safely.
- Core-loop integration: test should complete prompt→preview→export; export may be mocked or run headless with puppeteer in CI nightly.

---

Branches & PR strategy

- Create small, focused branches and PRs. Suggested names:
  - `server/health-structured`
  - `server/preview-post`
  - `client/preview-post`
  - `server/coreflow-test`
  - `ci/quick-smoke-improve` (if tweaks needed)

Each PR: up to 3 files changed, one clear acceptance criterion, link to tests and demo steps.

---

Demo run (manual quick checklist)

1. Setup devcontainer (or locally): ensure `POSTGRES_*` envs, `CHROME_PATH` set and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`.
2. In server: `cd server && npm ci && npm run smoke:export` (should write `samples/puppeteer_smoke_test.pdf`).
3. Start client/server and run a prompt through UI to preview and export.

---

Timeframe (aggressive)

- Single dev focussed: 48–72 hours total (backend+frontend parallel where possible).
- Two devs: 24–36 hours.

---

Notes and risks

- Puppeteer in CI can be flaky; keep export gated nightly and add retries or artifact uploads for debugging.
- Postgres migration planned after v0.1; keep local dev on SQLite for speed when appropriate.

---

If you want, I will now:

- create small PR(s) implementing P0 items starting with `server/health-structured`, or
- create the `docs/V0.1_CHECKLIST.md` demo doc and sample PDF.

Pick one and I will start immediately.
