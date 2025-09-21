# PROTO_Valid_GUI

Recorded: 2025-09-08

Purpose

- Create a minimal, visually valid GUI quickly (hours), using as much existing client code as possible, with mocked flows to show the product end-to-end. This branch (`proto/valid-gui`) is a working prototype for stakeholders and a clean baseline for reintroducing backend hooks later.

High-level plan (one-sentence)

- Build a visual-first, mock-driven frontend on `proto/valid-gui`, validate UX flows quickly, then provide a minimal mocked backend, and finally align production backend to the proven contract.

Checklist (high level, checkable)

- [ ] Tag current HEAD (safety backup)
- [ ] Create branch `proto/valid-gui`
- Phase A — Frontend visual mock (hours)
  - [ ] Assemble static UI screens using existing components (Prompt, PreviewWindow, Export, Status)
  - [ ] Add a lightweight mock adapter that returns canned AI/preview responses with configurable latency
  - [ ] Add minimal visual polish and loading states (spinners, banners)
  - [ ] Run manual browser smoke test (prompt→preview→cancel→export UI)
- Phase B — Mock backend (hours)
  - [ ] Provide a tiny HTTP mock server or MSW rules serving the same canned responses
  - [ ] Point client to mock HTTP endpoints and re-run smoke tests
- Phase C — Align & integrate (hours)
  - [ ] Draft a minimal API contract (3 endpoints: /prompt, /preview, /export)
  - [ ] Iterate backend to satisfy contract, toggling between mock and real endpoints
  - [ ] Run headful Playwright smoke test and confirm no console errors
- Finalize
  - [ ] Merge to staging or create PR for `proto/valid-gui` after validation

Detailed expansion & rationale

1. Safety prep (5–15 minutes)

- Tag current HEAD: `git tag pre-proto-ui-YYYYMMDD` and push tags. Create `proto/valid-gui` from current HEAD so work is isolated.
- Rationale: preserve current work; allow fast rollback.

2. Phase A — Frontend visual mock (target 2–6 hours)

- Goal: produce a UI that looks and flows like the real app so stakeholders can interact.
- Reuse: import existing Svelte components where possible (PromptInput, PreviewWindow, ExportButton, StatusDisplay). Avoid major refactors; wrap components with a mock service adapter.
- Implementation (conceptual, no code here):
  - Add `src/mocks/mockApi.js` (or `src/lib/apiAdapter.js`) that exposes the same async functions the UI expects but returns canned responses (preview HTML, AI-generated text, image URLs). Make latency configurable (100–800ms) to test responsiveness.
  - Replace network calls in the branch only by changing the adapter import path (no rewrite of components) so future merge is simple.
  - Ensure UI states (loading, success, error) are exercised by mocks.
- Acceptance (hours measured): app loads, prompt input editable, clicking Generate shows spinner then preview HTML, Cancel returns control, Export button shows UI download flow (mock), no blank screen, no uncaught console errors.

3. Phase B — Minimal mock backend (target 1–3 hours)

- Goal: run the same visual flows but with an HTTP endpoint to sanity-check client-server interaction without full AI or PDF backends.
- Options: tiny Express server returning JSON/HTML, `json-server`, or MSW in the browser to intercept requests.
- Rationale: confirms that client will work against HTTP and helps uncover CORS/runtime issues earlier.

4. Phase C — Align real backend (target 2–8 hours)

- Goal: move from mock to a minimal real/backend-compatible version progressively.
- Steps:
  - Draft a tiny API contract (3 endpoints) with sample request/response shapes.
  - Implement server stubs that satisfy the contract and are toggleable behind `USE_MOCKS` env.
  - Replace mock adapter with live adapter and iterate until Playwright smoke tests pass.
- Rationale: controlled, incremental integration reduces risk of blank-screen regressions.

Timeline (hours, optimistic)

- Safety prep + branch: 0.25h
- Phase A (frontend mock, manual + test): 2–6h
- Phase B (mock backend): 1–3h
- Phase C (contract + integration): 2–8h
- Total: ~5–17 hours (aim for same-day turnaround when staffed appropriately)

Acceptance criteria (what "working GUI" means)

- Page mounts and shows the main UI within 2s in a local dev browser
- Prompt input is focusable and editable immediately
- A mock-generated preview shows within 1s of clicking Generate (configurable)
- Cancel aborts in-flight preview and returns UI to editable state
- No uncaught exceptions in browser console during initial mount
- Playwright smoke test (headful) passes for the mock flow

Risk assessment & mitigations

- Risk: mismatches between mock and real API → mitigate via small, explicit contract and stubbing toggles
- Risk: wasted effort reworking already-built logic → mitigate by reusing components and replacing only the adapter layer
- Risk: hidden runtime errors (blank screen) → mitigate by running headful browser smoke tests and capturing console logs early

Documentation & tracking

- Keep this document in `docs/focus/PROTO_Valid_GUI.md` on the branch and mark checklist items as completed as work proceeds.
- Record commit SHAs for each milestone and attach screenshots or short screencasts for stakeholder signoff.

Next-action options (pick one)

- (A) I will list 2–3 candidate last-known-good client commits for you to choose as a baseline (I will only read git history and report; no changes). Time: ~15–30m.
- (B) I will produce a concrete, file-level change checklist (exact files to add/modify and sample mock shapes) to implement Phase A on the new branch (no edits). Time: ~30–60m.
- (C) I will draft the minimal API contract (OpenAPI-lite or JSON) for `/prompt`, `/preview`, `/export` so frontend and backend can align in Phase C. Time: ~30–60m.

Pick A, B, or C and I will proceed with that planning step (no repository edits until you say go).
