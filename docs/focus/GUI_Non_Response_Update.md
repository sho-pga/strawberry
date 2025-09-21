# GUI Non-Response — Update

Recorded: 2025-09-08
Status update: Verified implementations applied and client test-suite passing (Vitest); manual verification shows the UI still not behaving as expected in some environments (blank screen reported). This file now records what was implemented, what it achieved, and an updated, prioritized remediation plan focused on delivering a working GUI for V0.1.

This document supplements `docs/focus/GUI_Non_Response.md` with an independent assessment and a prioritized short-term plan with checkable actionables to get the GUI to a usable state for V0.1.

## Independent assessment

Summary:

- The issues in the original focus doc are valid. Symptoms (long `loading` times, globally disabled controls, racey store updates, long GET payloads) are consistent with a bad user experience where the UI appears non-responsive.

Root causes (concise):

1. Network policy keeps UI in loading via long retries/backoff and un-abortable requests.
2. Global `uiState.status === 'loading'` is used to disable many unrelated controls.
3. Single, global UI state plus many subscribers causes cascade updates and race conditions.
4. Large GET querystrings for preview cause server-side failures or timeouts.

Risk and impact:

- High user-perceived failure for V0.1: prototype users will judge the product by responsiveness; these problems are fixable but must be addressed before wider testing.

## Prioritized short-term plan (checkable actionables)

Top-level goal: Make the UI feel responsive to users immediately with low-risk changes. Each item below is phrased as a checkable task with acceptance criteria and a short time estimate.

- [ ] 1. Stabilize network behaviour: fail-fast + AbortController (0.5–3.0h)

  - What: Ensure preview/export requests are abortable; reduce retry/backoff for preview/export to a single short retry or no retries.
  - Files: `client/src/lib/api.js`, `client/src/components/PreviewWindow.svelte`, `client/src/components/ExportButton.svelte`
  - Acceptance: user can cancel an in-flight preview/export; on network failures the UI shows an error within ~300–500ms and unrelated controls are not blocked.

- [ ] 2. Scope disabling to action buttons only (0.5–1.5h)

  - What: Replace global UI-disable behavior with scoped flags like `previewLoading` and `exportLoading` that only disable originating action buttons.
  - Files: `PromptInput.svelte`, `ExportButton.svelte`, `OverrideControls.svelte`, store files.
  - Acceptance: starting a preview/export disables only its button(s); other input fields remain editable and responsive.

- [ ] 3. Use POST for large preview payloads (0.5–1.0h)

  - What: When preview payload > 1KB, use POST `/api/preview` instead of GET (server already supports POST).
  - Files: `client/src/lib/api.js` (loadPreview) and callers.
  - Acceptance: no failures due to URL length; preview requests succeed with large payloads.

- [ ] 4. Scoped flags + response tokens to avoid races (2–4h)

  - What: Replace global `uiStateStore` single toggle with scoped flags: `previewLoading`, `exportLoading`, `promptSubmitting`. Tag each request with a token and apply results only if the token matches current token for that scope.
  - Files: `client/src/stores/*`, `PreviewWindow.svelte`, `ExportButton.svelte`, `PromptInput.svelte`
  - Acceptance: stale responses do not overwrite newer state; local preview markers (`__localPreview`) persist until user confirms.

- [ ] 5. Debounce tuning & subscription cleanup (1–2h)

  - What: Reduce debounce to ~200ms (test 100–200ms), remove nested subscriptions where possible, add unsubscribe on component destroy.
  - Files: store subscribers and debounce utilities.
  - Acceptance: preview responsiveness improves with tolerable request rates; no memory leaks from forgotten subscriptions.

- [ ] 6. Add regression tests (3–5h)
  - What: Unit test `fetchWithAbort`, integration test for store flows, Playwright e2e that simulates delayed preview and tests cancel path, smoke test for server unreachable behavior.
  - Files: `client/__tests__/fetchWithAbort.test.js`, `client/__tests__/storeFlow.test.js`, `client/scripts/browser_cancel_test.mjs` or `client/__tests__/browser_cancel.e2e.js`.
  - Acceptance: CI or local runs validate cancel behavior and UI remains interactive during faults.

## Verified implementations and effect

- Abortable requests: `abortableFetch` was added and wired into `PreviewWindow` and export paths. Unit test `fetchWithAbort.test.js` verifies abort behavior.
- Debounce and test stability: test harnesses were adjusted (debounce mocked for tests) and Vitest suite now passes (20/20 tests).
- Preview wiring: `PreviewWindow.svelte` subscriptions and lifecycle were hardened (onMount cleanup and safe `uiState` defaults), avoiding server-side test lifecycle errors.

Effect on GUI behavior:

- Positive: automated tests and unit/integration flows now validate abort, store-driven preview updates, and cancel paths.
- Negative / Remaining issues: manual QA reports a blank screen and "no visible GUI" in some runtime environments despite tests passing. This indicates the remaining problem(s) are either:
  - environment-specific (CSS/asset loading, dev server port, CORS, or runtime errors in the browser console), or
  - related to global UI disabling still present in places we haven't yet scoped out, or
  - timing/order issues in app bootstrap (e.g., client app not mounting components due to a runtime error not covered by tests).

Because this is V0.1 and the app is shipped, the priority shifts from safe refactors to an immediate hotfix path that guarantees users see an operative UI.

## Updated Next steps (hotfix-first, then stabilization)

Immediate (hotfix) — aim for a rollback-or-hotfix within 1–3 hours

- [ ] A. Emergency feature-flag: Re-enable UI by removing or short-circuiting any global `uiState.status === 'loading'` disabling paths in the client so components remain interactive while background tasks run. (Files: quick grep for `uiState.status === 'loading'` occurrences; replace with scoped flags or `|| false` to temporarily avoid global blocking)

  - Acceptance: loading indicators may still show, but all primary inputs (prompt, overrides, export controls) are editable immediately on page load.
  - Risk: low; temporary loss of strict disabling semantics but high UX value.

- [ ] B. Run manual reproducibility checklist in a real browser (not just tests):
  - Launch `client` dev server and open http://localhost:5173 in Chrome (or use the devcontainer forwarded port). Confirm console logs and capture any runtime errors.
  - Acceptance: if blank screen reproduces, capture console stack trace and network tab.

Short-term (next 1–2 days) — safe fixes to land after hotfix

- [ ] 1. Scope disabling to action buttons only and introduce `previewLoading` / `exportLoading` flags (2–4h). Replace test-only shortcuts with production-safe guards. Acceptance: unrelated inputs remain editable during preview/export.

- [ ] 2. Scoped tokens for requests + avoid applying stale responses (2–4h). Acceptance: race conditions gone; local preview markers (`__localPreview`) respected.

- [ ] 3. Convert preview client to POST for large payloads (0.5–1.0h). Acceptance: large previews succeed without URL-length failures.

Medium-term (3–7 days)

- [ ] 4. Add runtime browser smoke tests (Playwright) that run a headful browser, check page mounts, assert no console errors on initial load, verify preview cancel behavior in a real browser environment. Acceptance: Playwright test passes in CI or in local devcontainer.

- [ ] 5. Add telemetry/logging to capture UI errors in deployed builds (non-sensitive) to quickly triage blank-screen or mount failure failures in user environments. Acceptance: devs receive stack traces and relevant context when blank screens occur.

Escalation / Rollback

- If hotfix does not restore usable UI quickly, consider rolling back to the previous release tag/commit that had a working UI (if available) and apply fixes on a feature branch; prioritize a minimal, clean UI over partially broken advanced features.

Priority mapping (what to do first)

1. Emergency feature-flag/hotfix to prevent global UI blocking — immediate
2. Manual browser reproduction and capture console/network errors — immediate
3. Scoped disabling + tokens — next deploy
4. Convert preview to POST for large payloads — quick follow-up
5. Playwright smoke + telemetry — medium-term

Notes

- Tests passing is necessary but not sufficient — we must validate runtime browser behavior and user flows. The blank-screen report suggests environment/runtime issues not caught by current tests.
- Because this is V0.1 and users must be able to use the app, the hotfix approach is recommended: trade temporary permissive UI behavior for a working product, then harden.

---

## Appendix: short test plan (implement as separate tasks)

- Unit: test fetchWithAbort behavior (abort, retry limits, error handling)
- Integration: Vitest + JSDOM simulate store flows; ensure scoped flags don’t disable unrelated components
- E2E: Playwright test that uses `client/scripts/browser_cancel_test.mjs` pattern to simulate delayed preview and assert:
  - Cancel aborts in-flight request
  - Non-originating inputs remain enabled
  - Stale response not applied after cancel
- Smoke: run server unreachable test to verify UI recovers and shows retry/cancel options

---

If this update looks good, I will create test skeletons for the quick test plan (unit, integration, e2e, smoke).
