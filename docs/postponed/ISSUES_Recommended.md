## ISSUES_Recommended — Next recommended steps

Modus operandi:
We are not starting from scratch: prior to update or edit — assess what's already implemented; describe how the new implementation fits; get prior approval; then begin updating.

This document lists the next recommended steps, acceptance/verification criteria, priority, and a simple checkbox mechanism you and I will use as items are implemented and verified.

How this file is used:

- Each item includes: short description, verification steps, priority (P1/P2), and owner.
- When I implement and verify an item, I'll mark the checkbox and add a short verification note below the item.

Checklist

1. [x] Create `.env.example` with required environment variables and guidance

   - Priority: P1
   - Owner: me (created)
   - Verification: `./.env.example` exists and contains keys: POSTGRES*\*, GEMINI*\*, CHROME_PATH, PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
   - Notes: Created and verified on 2025-08-17; file present at `/.env.example`.

2. [ ] Verify `server` `/health` and readiness behaviour

   - Priority: P1
   - Owner: you/me (I can run checks or provide commands)
   - Verification: `GET /health` returns `200` when services are up in devcontainer; otherwise returns structured 503 during startup.
   - Status: Verified (local)
   - Notes: Health endpoint returned 200 and DB connectivity succeeded when `./scripts/devcontainer_smoke_health.sh` was run (verification 2025-08-17). This indicates the `db` service is reachable in the current environment. If replicating in a fresh Codespace, ensure `.env` values are set and the `db` service is started.

3. [ ] Puppeteer smoke test in devcontainer

   - Priority: P1
   - Owner: me (run inside devcontainer) or you if running locally
     - Verification: small script successfully launches Chrome via `CHROME_PATH` and renders a page to PDF or plain check; exit code 0.
   - Status: Verified in workspace/devcontainer
   - Notes: After installing server deps (`cd server && npm ci`) and running the smoke script with `NODE_PATH=server/node_modules`, the script wrote `samples/puppeteer_smoke_test.pdf` successfully (verified 2025-08-17). Ensure `CHROME_PATH` is set in CI/devcontainer and that `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` is respected during install.

4. [ ] Confirm devcontainer `postCreateCommand` completes (install dependencies)

   - Priority: P2
   - Owner: me / contributor who opens Codespace
     - Verification: `cd client && npm run dev` and `cd server && npm run dev` succeed in container and forwarded ports open.
     - Status: Simulated locally
     - Notes: Global `concurrently` was installed manually to simulate `postCreateCommand` behavior and verify the workflow. A full verification inside a fresh Codespace/devcontainer (where the `postCreateCommand` runs automatically) is still recommended.

5. [ ] Run client & server tests (Vitest/Jest) and fix failures

   - Priority: P1
   - Owner: me
     - Verification: `npm test` in `client/`, `server/`, and `shared/` pass locally in dev session; client tests were fixed (conservative JSON parsing) and all suites pass (verified 2025-08-17).
     - Status: Done (local verification)

6. [ ] Replace GET `/preview` query-JSON with POST for large payloads (refactor client usage)

   - Priority: P2
   - Owner: me
     - Verification: `previewEndpoint` in client already posts to `/api/preview` and server accepts POST `/api/preview` (verified 2025-08-17).
     - Status: Done

7. [ ] Add an integration test covering core loop: prompt → preview → export

   - Priority: P1
   - Owner: me
     - Verification: Integration test `server/__tests__/coreFlow.integration.test.js` was added and ran locally during Day 4 work; core flow validated (2025-08-17).
     - Status: Done (local verification)

8. [ ] Add CI job to run tests and the integration smoke test (optional gated job for Puppeteer)
   - Priority: P2
   - Owner: me / repo maintainer
   - Verification: GitHub Actions or similar runs tests and reports status on PRs.
   - Status: Partially done
   - Notes: A sample workflow `ci-smoke-puppeteer.yml` was added to `.github/workflows/` to install Chromium, set `CHROME_PATH`, run the smoke export script, and upload the generated PDF as an artifact. The workflow is non-blocking by default and will need refinement for CI flakiness handling (verification 2025-08-17).

How to check items off

- I'll update this file to mark items done as I complete and verify them. Each checked item will include a one-line verification note and timestamp.

Change log (most recent at top)

- [TODO] File created; `.env.example` will be added now and the first item verified.
- [INFO] API docs added at `docs/API_ENDPOINTS.md` on 2025-08-17.
- [VERIFIED] Client export now POSTs to `/export`, server `/api/export` and `/export` respond with PDF binary and standardized JSON error payloads when applicable (verified 2025-08-17).
