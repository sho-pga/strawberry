## GUI Non-Response — verification notes and prioritized fixes

Status: In-progress — quick fixes applied and verified where possible. Record of findings that verify the GUI can become non-responsive and prioritized actionable fixes with time estimates.

- [ ] 1. Record verifying findings from quick code audit (this file)

  - Evidence: client `fetchWithRetry` uses exponential backoff/jitter and up to 3 retries which can keep UI in `loading` for seconds. (See `client/src/lib/api.js`)
  - Evidence: many UI controls are disabled when `uiState.status === 'loading'` (e.g. `PromptInput.svelte`, `ExportButton.svelte`) causing broad blocking of interaction.
  - Evidence: preview flow uses large GET query strings for preview payloads which can cause server latency/failures and longer waits.
  - Evidence: `PreviewWindow` and `PromptInput` chain store updates (`contentStore` → `previewStore` → `uiStateStore`) and have race conditions noted in `client/docs/UI_RESPONSIVENESS_FINDINGS.md`.
  - Time estimate to verify/record: 0.5h

- [ ] 2. Quick fix: fail-fast + abortable requests for UI-initiated preview & export

  - Change summary: Add AbortController support, expose a fetch-with-abort helper, and reduce retry/backoff for preview/export calls so UI doesn't stay blocked during network faults.
  - Files changed: `client/src/lib/api.js`, `client/src/components/PreviewWindow.svelte`, `client/src/components/ExportButton.svelte`
  - Acceptance criteria: user can cancel an in-flight preview/export; preview/export fail fast on network errors; controls not globally frozen for long durations.
  - Time estimate: 2.0h

    Status: Implemented (draft). See notes below — abortable fetch helper added, PreviewWindow wired to use it and expose a test abort hook, ExportButton updated to support cancel. Some UI feedback consistency work remains.

- [ ] 3. Medium: scope disabling to action buttons only

  - Change summary: avoid disabling global input areas while preview/export runs, only disable the originating action buttons. Improves perceived responsiveness.
  - Files: `PromptInput.svelte`, `ExportButton.svelte`, `OverrideControls.svelte`
  - Time estimate: 1.5h

- [ ] 4. Medium: use POST for preview when payload is large

  - Change summary: prefer POST `/api/preview` for payloads above 1KB to avoid issues with long query strings. Already implemented on server; ensure client uses it consistently.
  - Files: `client/src/lib/api.js` (loadPreview), `client/src/components/*` callers
  - Time estimate: 1.0h

- [ ] 5. Higher effort: unify UI state into scoped flags (previewLoading/exportLoading) and reduce race conditions

  - Change summary: Replace single `uiStateStore` toggles with scoped loading flags and make requests token-aware (only apply results if token matches). This reduces inconsistent state transitions.
  - Files: `client/src/stores/*`, `PreviewWindow.svelte`, `ExportButton.svelte`, `PromptInput.svelte`
  - Time estimate: 4.0h

- [ ] 6. Add automated regression test(s)

  - Change summary: add a Vitest + JSDOM or Playwright test that simulates a stalled preview/export endpoint and verifies cancel behaviour and UI reactivity.
  - Time estimate: 3.0h

  Status: Partial — a Playwright-based diagnostic script `client/scripts/browser_cancel_test.mjs` was added/iterated to validate abort paths (delays the preview request and triggers cancel). Integrating this into CI as a stable e2e regression remains pending.

Notes

- These items are intentionally small and incremental: items (2) and (4) are low-risk fixes that materially improve perceived responsiveness.
- After this checklist is completed, perform smoke tests (server stopped/unreachable, slow responses) to validate that UI recovers and remains interactive.

Recent changes applied (delta):

- Added abortable fetch helper and made `fetchWithRetry` AbortController-aware. (`client/src/lib/api.js`)
- Wired `PreviewWindow.svelte` to use abortable fetch, expose `window.__previewAbort` and dev helpers for inspection, and set `previewAbortStore` so multiple UI surfaces can cancel an active preview.
- Updated `PromptInput.svelte` to mark the local quick-preview with `__localPreview` so local previews are not overwritten by aborted network previews; clicking "Preview" strips that marker and triggers server-backed preview.
- Added a Playwright-based diagnostic script: `client/scripts/browser_cancel_test.mjs` which simulates a delayed preview and exercises cancel behavior.

Next steps (recommended short list):

1. Stabilize and add the Playwright test to CI (or convert to Vitest+JSDOM where appropriate) — 3.0h
2. Scope UI disabling to action buttons only (`prompt`, `export`) to avoid blocking unrelated input — 1.5h
3. Replace global `uiStateStore` with scoped flags (`previewLoading`, `exportLoading`) to remove race conditions — 4.0h

Recorded: 2025-09-07
