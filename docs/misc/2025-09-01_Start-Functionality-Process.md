# 2025-09-01 — Start Functionality: Process and Checklist

## Purpose

Capture a pragmatic, actionable process for moving from planning (V0.1) to implementing a new piece of functionality in this repository.

## Scope

This document covers the minimal steps a developer should take to design, implement, test, and land a feature in the `strawberry` repo. It assumes the feature will be developed on a branch and merged via a PR with CI.

## Quick checklist (visible status)

- [ ] Define feature contract (inputs, outputs, error modes)
- [ ] Add small design notes & data shapes to `docs/` or the feature ticket
- [ ] Create branch: `feat/<short-name>` and open draft PR
- [ ] Add minimal, fast unit tests (happy path + 1-2 edge cases)
- [ ] Implement feature with small, focused commits
- [ ] Run lint/typecheck and fix issues
- [ ] Run unit tests and a quick smoke test locally
- [ ] Push branch and request review
- [ ] Address feedback, run CI, merge when green

## Minimal contract (example)

- Inputs: JSON payload with { title: string, body: string, options?: {} }
- Outputs: HTTP 200 with PDF bytes (application/pdf) on success; JSON `{ ok:false, errors: [...] }` on validation/expected failures
- Errors: 400 for invalid input, 422 for export validation failures, 500 for unexpected server errors
- Success criteria: API returns PDF which passes the repo's PDF quality validation (when enabled)

## Steps (detailed)

1. Design & small spec (30–60m)

   - Write a 1-paragraph summary and add it to the ticket or `docs/`.
   - Sketch request/response shapes and side effects (files, DB updates).

2. Branch & scaffold (5–10m)

   - Branch from `main` (or current integration base): `git checkout -b feat/<short-name>`
   - Add a TODO file or small RFC in `docs/focus/` if needed.

3. Tests first (30–90m)

   - Add unit tests for the main handler and one edge case (e.g., empty body, large input).
   - If feature touches export pipeline, add an in-process smoke test like `scripts/run_export_test_inproc.js` demonstrates.

4. Implement incrementally (variable)

   - Make small commits that each do one thing (add handler, wire route, add validation, add export call).
   - Run fast local runner (e.g., `npm run test` in the appropriate package) frequently.

5. Local smoke & quality checks (10–20m)

   - Lint/typecheck: `npm run lint` / `tsc` where applicable.
   - Unit tests: `npm run test` or `vitest` depending on package.
   - If producing PDF: run export, run local pdfQuality check or the inproc script.

6. Push & CI (5–10m)

   - Push branch, open PR with description and checklist.
   - Ensure CI runs (tests, lint, any export checks). Attach artifacts if helpful.

7. Review, iterate, merge (variable)
   - Address review comments, keep commits focused, re-run tests.
   - Merge when CI green and reviewers approve.

## Likely edge cases

- Empty or malformed input JSON
- Very large content that may cause memory or timeouts
- Missing optional dependencies (puppeteer, sharp) in some environments
- Concurrency and temp-file collisions when multiple exports run

## Quality gates

- Build: repo-level scripts run without error
- Lint/Typecheck: no new lint/type errors
- Tests: unit tests pass (happy + edge cases)
- Smoke: minimal manual or script-driven smoke test (export endpoint) passes
- CI: All required checks pass on PR before merge

## Artifacts & observability

- Add logs with structured keys that make tracing easy (request id, user id)
- If the feature produces files, write them to a well-documented dir (e.g., `server/tmp-e2e-exports/` or `test-artifacts/` in CI)
- Upload artifacts in CI when helpful for debugging

## Timeline & sizing guidance

- Small: 1–2 days (simple endpoint + tests)
- Medium: 3–7 days (involves PDF/export, browser automation, or infra)
- Large: 1+ weeks (lots of integration, schema changes, infra)

## Security & permissions

- Validate all inputs; avoid shelling out with untrusted content.
- Keep secrets out of repo; use CI secrets for uploads or publishing.

## Example next actions (concrete)

- Create branch `feat/export-pdf-improvements`
- Add `docs/focus/2025-09-01_Start-Functionality-Process.md` (this file)
- Create a minimal test file under `server/__tests__/` exercising the handler
- Implement the handler in `server/` and wire route in `index.js`

## Notes

Keep changes small and testable. Prefer making the feature work end-to-end with a small test harness (in-process when possible) before complex CI-only checks.

---

Generated: 2025-09-01
