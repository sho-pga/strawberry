# GUI Resolution — Actionable Checklist

This document converts analysis and the fix plan into a concrete, checkable list of tasks. Each item is small, timeboxed, and includes acceptance criteria. Status is maintained across GUI_UNRESPONSIVENESS.md, GUI_FIX_PLAN.md, and this checklist.

Owner: @dev-team (or whoever picks the task)

## 1. Data Layer Migration (Phase 1 continuation) — 90m

- [x] Set up Prisma schema and validate
- [x] Configure PostgreSQL connection
- [x] Implement and verify health monitoring

- [ ] Replace SQLite CRUD usage in `server/crud.js` with Prisma Client calls.
  - Acceptance: `crud.createPrompt`, `crud.getPrompt`, `crud.saveResult` use Prisma and pass unit tests.
- [ ] Update `server/worker-sqlite.mjs` to use Prisma or create `worker-postgres.mjs` wrapper.
  - Acceptance: Worker can process at least one job end-to-end using PostgreSQL.
- [ ] Add transaction boundaries for multi-step operations where previously implicit.
  - Acceptance: Unit test demonstrates rollback on simulated failure.

## 2. Store & Handler Cleanup (Phase 2) — 45m

- [x] Implement basic store structure (promptStore, contentStore, previewStore, uiStateStore)
  - Acceptance: All core stores are in place and properly initialized
- [ ] Update `client/src/stores/contentStore` to fetch/save via the API which persists to PostgreSQL
  - Acceptance: Setting `contentStore` triggers a POST to server endpoints which persist data
- [x] Remove local preview shortcut from `PromptInput.svelte`
  - Acceptance: `previewStore` is updated only by `PreviewWindow` via `loadPreview`
- [x] Remove `handleGenerateClick` and typed-prompt dialog state from `PromptInput.svelte`
  - Acceptance: Only `handleGenerateNow` is used; UI retains expected behavior

> Recent change: generated content is now set immediately to `contentStore` when a user clicks Generate. Persistence to the server is performed in the background and will attempt to refresh the preview once the server responds. This improves perceived responsiveness and keeps the preview UI snappy.

- [~] Persist-on-generate is non-blocking (in-progress)
  - Acceptance: User sees an immediate preview after generation; background persistence updates `contentStore` with server IDs when available and attempts a preview refresh.

## 3. Preview Consolidation (Phase 3) — 30m

- [x] Set up basic PreviewWindow component with core functionality
  - Acceptance: Component renders and handles basic preview operations
- [x] Implement proper debouncing (200ms) in PreviewWindow
  - Acceptance: Preview updates are properly throttled
- [x] Add auto-preview toggle functionality
  - Acceptance: Users can enable/disable automatic preview updates
- [ ] Move remaining preview responsibilities to `PreviewWindow.svelte`
  - Acceptance: `PromptInput` no longer touches `previewStore` or buildLocalPreviewHtml
- [x] Implement cancellation for in-flight `loadPreview` requests
  - Acceptance: Rapid successive prompts cancel previous requests and show latest preview
- [x] Ensure debouncing remains only in `PreviewWindow`
  - Acceptance: Auto-preview works; no double-render flashes in automated tests

Notes:

- Integration tests were updated to prefer DOM-level assertions (user-visible behavior) over internal store state. This reduces brittleness during refactors.

## 4. Status & UI Feedback (Phase 4) — 30m

- [ ] Centralize UI status changes into `uiStateStore` helpers
  - Implement `setUiLoading`, `setUiSuccess`, `setUiError`
  - Add proper timeout management
  - Implement message queuing system
  - Acceptance: All components use helpers; status messages show consistently and persist until state changes
- [ ] Improve visual feedback system
  - Prevent animation stacking
  - Add proper loading indicators
  - Implement smooth transitions
  - Acceptance: Multiple rapid clicks produce a single flash cycle and clear status transitions

## 5. Tests & Validation (Phase 5) — 45m

- [ ] Database Integration Tests
  - Test PostgreSQL connection resilience
  - Verify transaction rollback scenarios
  - Validate data consistency
  - Acceptance: All database operations are verified stable and consistent
- [ ] UI Integration Tests
  - Test preview update sequence
  - Verify status message visibility
  - Test animation behavior
  - Acceptance: Tests cover happy-path and 2 failure modes (network error, db error)
- [ ] Edge Case Validation
  - Test rapid successive clicks
  - Verify network delay handling
  - Validate error conditions
  - Acceptance: No uncaught exceptions; UI shows correct status

## 6. Docs & Hand-off — 15m

- [ ] Update documentation to reflect current status
  - Cross-reference GUI_FIX_PLAN.md and GUI_UNRESPONSIVENESS.md
  - Update completion status and remaining items
  - Document any new patterns or requirements discovered
  - Acceptance: Documentation accurately reflects current state and remaining work

Total focused dev time (adjusted estimate): 4 hours 15 minutes

Recent progress summary:

- Immediate preview UX: implemented — generated content is set locally and preview shows instantly (background persist + refresh).
- Tests: client integration/unit tests updated to assert DOM where appropriate; client test suite passing locally.

Notes:

- Infrastructure components (Prisma, PostgreSQL, basic stores) are already in place
- Focus is on integration and remaining UI improvements
- Testing should concentrate on new changes and integration points
- Documentation updates should maintain cross-document traceability

Notes:

- If the project already requires multiple commits for the Prisma migration (it does), split PRs per area: DB migration, stores/handlers, preview refactor, UI feedback.
- Prioritize Phase 2 and 3 first to make the GUI responsive; database migration is critical but can be staged alongside these UI changes.
