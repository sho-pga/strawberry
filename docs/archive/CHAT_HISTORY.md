# Chat history snapshot — AetherPress PATH_V0.1

Date: 2025-08-21
Branch: AE/path-v01B

## Recommended next steps (mapped to PATH_V0.1)

### Convert PDF text extraction to pdfjs-dist everywhere (priority: high)

Why: removes fragile pdf-parse import side-effects and makes parsing deterministic for CI.

- Action: grep for pdf-parse usages, replace with pdfjs-dist based implementation already in extract-pdf-text.js where possible, add a unit test verifying text extraction.

### Add PDF quality assertions (fonts embedded, DPI, page count) to server-side test harness (priority: medium)

Why: ensures output quality beyond "is a PDF".

- Action: extend run_export_test_inproc.js and export_text.test.js to assert number of pages and presence of expected text, and optionally use pdf-lib or pdfjs-dist to check fonts.

### Harden UI e2e (priority: medium)

Why: full Generate → Preview flow is flaky in headless CI.

- Action A (preferred): keep deterministic store-driven tests (already added) for fast CI, and add a UI-only headless test with increased timeouts and retries.
- Action B: if UI flow is essential, instrument client to expose a test-only hook or endpoint to force preview state for E2E.

### Add client tests to main CI matrix and collect artifacts on failure (priority: low → now done)

Already added client-tests job to verify-export.yml.

- Next: add artifact collection (snapshots/coverage) when client tests fail.

### CI performance and ergonomics

- Add caching keys per workspace, run client and server jobs in parallel unless order is required, add badges to README.

## Updated Action Plan and Timeline (2025-08-21)

### Day 1 (Today + Tomorrow): Core Technical Improvements

1. PDF Processing Enhancement (4-5 hours)

   - [ ] Convert remaining pdf-parse uses to pdfjs-dist
   - [ ] Add comprehensive unit tests for text extraction
   - [ ] Implement PDF quality assertions (fonts, DPI, page count)

2. Preview Component Implementation (4-5 hours)
   - [ ] Build basic preview component
   - [ ] Implement real-time preview updates
   - [ ] Add loading states and error handling

### Day 2: Testing and UI Polish

1. E2E Testing Enhancement (3-4 hours)

   - [ ] Implement UI-focused headless test for Generate → Preview flow
   - [ ] Add increased timeouts and retry logic for CI
   - [ ] Document test scenarios and setup requirements

2. User Experience Polish (4-5 hours)
   - [ ] Enhance error messages and display
   - [ ] Improve preview interactions
   - [ ] Add progress indicators
   - [ ] Polish visual feedback

### Day 3: Documentation and Final QA

1. Documentation Updates (3-4 hours)

   - [ ] Update API documentation
   - [ ] Document template system
   - [ ] Add usage examples with sample poems
   - [ ] Update setup instructions

2. Quality Assurance (4-5 hours)
   - [ ] Test with various poem formats
   - [ ] Validate page layouts
   - [ ] Verify image handling
   - [ ] Final PDF quality checks

### CI/CD Tasks (Parallel)

- [ ] Add artifact collection for client test failures
- [ ] Implement workspace-specific caching
- [ ] Add CI status badges to README
- [ ] Create draft PR with comprehensive changes summary

## Success Criteria for v0.1 Completion

1. All PDF processing uses pdfjs-dist with reliable text extraction
2. Preview component works reliably with real-time updates
3. E2E tests pass consistently in CI
4. Documentation is complete and accurate
5. All quality checks pass (PDF output, layout, images)

## Notes

- Tasks are organized for parallel execution where possible
- Preview component work can begin while PDF processing is being enhanced
- Documentation should be updated as features are completed
- Regular commits with descriptive messages for better tracking

---

## Selected actionables for the next 3 hours (2025-08-21)

Goal: reduce CI/test fragility and validate preview → export fast-path.

Owner: Backend (primary) + Frontend (support)

Tasks (3-hour window):

1. Stabilize PDF extraction (Backend — 75m)

   - Replace in-process `pdf-parse` usage in tests with a subprocess call to `node server/scripts/extract-pdf-text.js <pdf>` or convert the test to use `pdfjs-dist` directly.
   - Update one representative test (e.g., `shared/__tests__/pdfExport.test.ts`) to stop importing `pdf-parse` and instead call the extractor script and assert expected text.

2. Verify preview endpoint + minimal preview render (Frontend+Backend — 65m)

   - From the repo root, POST a small sample JSON to `/api/preview` and confirm the HTML includes a known poem title.
   - If client preview UI is missing required props, add a minimal skeleton to `client/src/components/PreviewWindow.svelte` that can display server HTML for now.

3. Quick export smoke and artifact verification (Any — 20m)
   - Run `server/scripts/smoke-export.sh` and validate the produced file starts with `%PDF-` and contains expected text when passed through `server/scripts/extract-pdf-text.js`.

Quick commands to run locally (optional)

```bash
# Extract sample text from the canonical sample PDF
node server/scripts/extract-pdf-text.js server/samples/ebook.pdf

# Run the smoke export (writes a temp file and validates magic bytes)
bash server/scripts/smoke-export.sh

# POST a sample payload to preview
curl -s -H 'Content-Type: application/json' -d @server/samples/poems.json http://localhost:3000/api/preview | head -n 40
```

Progress update will be added to this file after completing the sprint tasks.

If you want the full raw chat transcript included instead of this summary, tell me and I will append the full transcript to this file and push the update.

---

Update (2025-08-21): accidental local test artifacts (`test-artifacts/preview.html`, `test-artifacts/snapshot.html`) that were present in the working tree have been removed from the repository and `test-artifacts/` is now added to `.gitignore`. CI still uploads server and client artifact directories for debugging; those uploads happen from runner-produced outputs and are not checked into source control.

Sprint status: the 3-hour sprint tasks have been implemented and verified locally: pdf-parse imports removed from tests, shared tests updated to call the extractor script, client preview integration tests added, headless preview e2e script added and run locally (artifacts produced then removed from VCS). Remaining follow-ups: tidy any accidental temp files (done), consider regenerating package-lock files to remove historical dependency references (optional), and open PR to run CI for final validation.

---

BREAK / HANDOFF (2025-08-21)

Status now:

- Branch: `chore/ci-artifacts-and-e2e` (pushed to origin).
- Local verification done: shared/client/server tests, smoke export, extractor outputs, headless preview script produced artifacts during verification and those artifacts were removed from VCS and added to `.gitignore`.
- Package-lock regeneration attempted for `server`, `shared`, and `client` (no lockfile deltas required).

Pending (to resume):

1. Open the pull request for `chore/ci-artifacts-and-e2e` and let GitHub Actions run (PR URL: https://github.com/will-don-na/vanilla/pull/new/chore/ci-artifacts-and-e2e). CI must run the updated `verify-export` workflow and upload artifacts for debugging.
2. Monitor CI jobs and triage any failures by downloading artifacts (server/client `test-artifacts`), logs, and failing test details.
3. If CI shows dependency or lockfile issues, regenerate lockfiles and re-run affected tests; commit any necessary lockfile updates.

Quick resume checklist (first 30 minutes on return):

- Create the PR (if not already opened) and confirm the `verify-export` and `client-tests` jobs start.
- Confirm artifacts are uploaded on CI (download for inspection if failures occur).
- Run local smoke commands to reproduce failures quickly:

```bash
# run client tests
npm --prefix ./client test

# run shared tests
npm --prefix ./shared test

# run server smoke & extractor
bash server/scripts/smoke-export.sh
node server/scripts/extract-pdf-text.js /tmp/<your-ebook.pdf>

# run headless preview (requires puppeteer-core + Chrome)
node client/scripts/headless-preview-e2e.cjs
```

Planned 5-hour session (priority order, timeboxed):

1. CI triage and fixes (1.0h): inspect artifacts/logs, fix any environment-specific failures, re-run tests locally.
2. Stabilize UI E2E (2.0h): add retries/waits or convert flaky UI flow to store-driven deterministic test; run headless locally and in CI.
3. PDF quality assertions (1.0h): add page count/text checks and basic font embedding checks to server export test harness.
4. Documentation & cleanup (1.0h): ensure READMEs and PATH_V0.1 reflect final decisions and remove any leftover temp files.

Acceptance criteria for the 5-hour session:

- PR CI `verify-export` and `client-tests` jobs pass (or fail with artifacts available and a clear plan to fix).
- UI preview flow stabilized (deterministic store-driven test or reliable headless flow).
- Server export tests assert PDF magic bytes and expected text; at least one PDF quality check added.

Notes for the person returning:

- All edits so far are in `chore/ci-artifacts-and-e2e`. Open the PR, watch CI, and paste any failing-job logs here; I'll triage immediately.
- If you want me to open the PR and watch CI continuously, say "Open PR and monitor CI" and I'll start monitoring after the PR is created.

End of break note.

---

WAYS TO PROCEED (2025-08-21)

The Question:

- The original workflow, ci-server-tests.yml, was to be replaced by ci-server-tests-pr.yml.  However, that should no longer be the case.  Right/wrong?  Tell me either way.

The Options: 

-Acknowledged — I’ll give a short recommendation and two practical ways to proceed.

Quick plan: explain why completely replacing `ci-server-tests.yml` with ci-server-tests-pr.yml is usually wrong, then give two safe options (keep both vs unify into one) and my recommended choice.

Short answer
- Wrong to fully replace `ci-server-tests.yml` with ci-server-tests-pr.yml unless you explicitly want to change when/where full tests run (i.e., you want PR runs to become the canonical production runs).
- Better: either keep them separate (clear separation of PR vs production) or merge into a single workflow that supports both triggers with conditional steps.

Why not replace outright
- `ci-server-tests.yml` is (or was) the production/push workflow — it runs on `push`/merge and can be constrained by branch protections, secrets and production expectations.
- ci-server-tests-pr.yml was created to be PR-friendly (different triggers/permissions and possibly lighter/safer steps).
- Replacing removes the safety separation: PRs and pushes become identical, which can expose secrets or run heavy tasks unnecessarily on PRs/forks.

Practical options
- Option A — Keep both (recommended for clarity)
  - Keep `ci-server-tests.yml` for push/merge/production runs.
  - Keep ci-server-tests-pr.yml for PRs (lighter or gated).
  - Pros: simple, explicit; avoids accidental exposure of repo context in PRs.
  - Cons: some duplication to maintain.
- Option B — One workflow, dual triggers (my recommended single-file approach)
  - Add both triggers to one file:
    - `on: [push, pull_request, workflow_dispatch]`
  - Use conditional steps or job-level `if: github.event_name == 'push'` / `github.event_name == 'pull_request'` to skip heavy steps on PRs (or to run a lighter job).
  - Pros: single source-of-truth, easier updates.
  - Cons: slightly more YAML complexity.

When to replace (only)
- Replace only if you want PR behavior to be identical to production pushes and you accept the security/permission implications (not typical).

My recommendation
- For an early-stage, simple path: implement Option B (single workflow with both triggers) but structure jobs to be conditional so PRs remain lightweight and maintainers can run full tests via `workflow_dispatch`. This reduces duplication while preserving safety.
- If you prefer explicit separation while iterating fast, do Option A (keep both) — it’s simpler to reason about.

Next step
- Tell me which you want: “keep both (A)” or “unify into one (B)”. I’ll implement the chosen change on `chore/ci-artifacts-and-e2e` and push a commit.

The Choice: 

- “unify into one (B)”

End of proceed note.
