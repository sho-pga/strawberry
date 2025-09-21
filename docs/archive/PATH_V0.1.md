# Path to AetherPress v0.1

## Context & Understanding

### Current State

- Core infrastructure ready
- Puppeteer integration complete and validated
- Basic CRUD operations implemented
- Health check system in place
- Component-based organization established

### Target Demo

Production of an ebook with:

- Summer poems (public domain)
- One poem per page
- Beautiful descriptive background images
- Professional PDF output

## Agreements & Decisions

### Scope Definition

1. **IN Scope v0.1**

   - Template-based HTML generation
   - Background image handling
   - Preview functionality
   - PDF export via Puppeteer
   - Basic error handling
   - Simple JSON input structure

2. **OUT of Scope v0.1**
   - AI integration
   - Complex user overrides
   - Advanced data persistence
   - Version tracking
   - Undo/redo functionality

### Technical Decisions

1. **Data Flow**

   ```
   JSON Input → HTML Template → Preview → PDF Export
   ```

2. **Data Structure**

   ```json
   {
     "poems": [
       {
         "title": "Summer Morning",
         "author": "Public Domain",
         "content": "poem text here",
         "background": "summer-morning.jpg"
       }
     ]
   }
   ```

3. **Component Responsibilities**
   - **Backend**: Template engine, PDF generation
   - **Frontend**: Preview, export trigger
   - **Shared**: Types, utilities

## Action Plan

### Phase 1: Foundation (2 days)

1. **Template System**

   - [x] Create basic HTML template
   - [x] Set up CSS for poem layout
   - [x] Implement background image handling
   - [x] Add page break logic

     (Note: foundation tasks implemented in `server/ebook.js` and `server/samples/images/`.)

2. **Preview Component**
   - [ ] Add preview route
   - [ ] Implement preview component
   - [ ] Set up real-time updates

### Phase 2: Core Features (2-3 days)

1. **PDF Generation**

   - [x] Set up export route
   - [x] Implement Puppeteer workflow
   - [x] Add error handling
   - [x] Validate output quality

     (Note: export route and Puppeteer workflow implemented; smoke tests and `server/scripts/smoke-export.sh` added.)

2. **Frontend Integration**
   - [x] Add export trigger
   - [x] Implement download handling
   - [x] Add loading states
   - [x] Basic error display

### Phase 3: Polish (1-2 days)

1. **Quality Assurance**

   - [ ] Test with various poems
   - [ ] Validate page layouts
   - [ ] Check image handling

     - [ ] Verify PDF quality

     (Note: basic smoke test validates a non-empty PDF is produced; further PDF quality checks (fonts, DPI) are TODO.)

2. **User Experience**
   - [ ] Add progress indicators
   - [ ] Improve error messages
   - [ ] Enhance preview interactions
   - [ ] Polish visual feedback

### Phase 4: Documentation (1 day)

1. **User Guide**

   - [ ] Document JSON structure
   - [ ] Add usage examples
   - [ ] Include sample poems

2. **Technical Documentation**

   - [ ] Update API documentation
   - [ ] Document template system
   - [ ] Add setup instructions

     (Note: `.devcontainer/README.md` added and API route `/api/export/book` documented.)

   ***

   ## Implemented summary (added during break)

   - `server/ebook.js`: HTML template generator for A4 eBooks (supports per-poem background SVGs).
   - `server/samples/poems.json`: canonical sample poems used by smoke tests.
   - `server/samples/images/*.svg`: decorative SVG backgrounds.
   - `/api/export/book`: POST endpoint that returns a generated A4 PDF using the running Puppeteer instance.
   - `server/scripts/smoke-export.sh`: script that POSTs the sample poems to `/api/export/book` and saves the response to a file (default: `/workspaces/vanilla/samples/ebook.pdf`).
     - `server/scripts/smoke-export.sh`: script that POSTs the sample poems to `/api/export/book` and saves the response to a file (defaults to a unique temp path). The script now validates the saved file starts with the PDF magic bytes (`%PDF-`).
   - `server/scripts/extract-pdf-text.js`: Node script that extracts text from a PDF for automated verification (used by smoke/CI).
     - `server/scripts/extract-pdf-text.js`: Node script that extracts text from a PDF for automated verification (used by smoke/CI). Recently updated to use `pdfjs-dist` (ESM) and to guard access to text items (uses `'str' in item` checks) to avoid TypeScript/typing issues.
   - `server/__tests__/export_text.test.mjs`: ESM Vitest integration test that posts to `/api/export/book`, asserts PDF magic bytes, and verifies extracted text contains a sample poem title.
     - `server/scripts/e2e-smoke.js`: Lightweight Puppeteer-core smoke script that exercises the client prompt -> preview flow and falls back to direct backend preview when the UI path is flaky in headless runs. Uses `globalThis.fetch` for API fallback (requires Node 18+ in CI) and now logs DOM snapshots for debugging when the UI preview element is not present.
   - `.devcontainer/README.md`: devcontainer summary and assessments added.

     - `server/scripts/e2e-smoke.js`: updated to improve UI path stability by waiting for the Generate button to re-enable, retrying Preview clicks, and dumping DOM snapshots for debugging.
     - CI: `.github/workflows/verify-export.yml` added; it runs an in-process export verification and uploads `server/test-artifacts` (PDFs and debug outputs) for inspection.

   ### Verified in branch `AE/path-v01`

   - `server/scripts/smoke-export.sh`: now writes output to a unique temp path and validates the saved file starts with the PDF magic bytes (`%PDF-`).
   - `server/scripts/run_export_test_inproc.js`: in-process export verification writes artifacts to an OS temp dir and copies them into `server/test-artifacts` when running in CI.
   - `server/__tests__/export_text.test.js` and related tests: updated to use `fs.mkdtempSync(...)` so test outputs use unique temp directories.
   - CI workflow `.github/workflows/verify-export.yml`: added a `verify-export` job that runs the in-process export verification and uploads artifacts; added a `client-tests` job that installs `./client` deps and runs Vitest.
   - `client/__tests__/store-driven-preview.test.js`: added a deterministic Svelte 5-compatible UI test (uses `@testing-library/svelte/svelte5`) that drives the preview via stores to avoid network/AI flakiness.
   - `server/scripts/e2e-smoke.js`: improved UI-path stability with waits/retries and DOM snapshot logging.

   Status: these changes are implemented in the current working branch and were committed and pushed to `origin/AE/path-v01` (see commit history for details). Local verification: `npm --prefix ./client run test --silent` passes (3 files, 15 tests) and the in-process export test produced a valid PDF when run locally.

   Small follow-ups already noted in this document that remain high-value:

   - Convert `server/scripts/extract-pdf-text.js` fully to use `pdfjs-dist` (if any legacy `pdf-parse` usage remains) to avoid import side-effects and make parsing deterministic.
   - Add a UI-focused headless test that exercises the full Generate → Preview → Preview Now flow; if that remains flaky in CI, prefer a store-driven UI test (already added) and increase retries/wait thresholds for headless runs.
   - Add PDF quality checks (fonts embedded, DPI, page count) as additional assertions in the server-side test harness.
   - Collect client test artifacts (snapshots/coverage) in CI on failure for faster debugging.

   TODO (explicit): add a small check to `server/scripts/smoke-export.sh` that validates the saved file is a PDF by checking the magic bytes (PDF files start with `%PDF-`) before declaring success. Currently the script declares success based on HTTP status only.

   NOTE: That TODO has been completed — `smoke-export.sh` now checks the file starts with `%PDF-` and exits non-zero if not. Tests and helper scripts now write outputs to unique OS temp directories using `fs.mkdtemp()` to avoid collisions in parallel runs.

   NOTE: we want true UI verification (button flow), et al. — the current e2e smoke reliably validates the backend preview/export path via an API fallback, but for full end-to-end confidence we should add a UI-focused test that ensures the Generate -> Preview -> Preview Now (or automatic preview) flow renders the preview DOM in headless CI runs. Investigate why the preview button is disabled in some headless runs and consider driving the client store directly in the UI test or adding retries/waits to stabilize the UI path.

   Primary TODOs (next):

   - Convert the extraction script to a native, lightweight implementation using `pdfjs-dist` directly (avoid `pdf-parse` which has debug-mode side effects). This will reduce reliance on packages that execute code on import and make tests more deterministic.
   - Stabilize full UI e2e further: add tests that drive the client store directly (for deterministic preview rendering) and add retries/timeouts in CI to reduce flakes.

## Implementation Strategy

### Incremental Steps

1. Start with single poem template
2. Add multi-poem support
3. Implement background images
4. Add preview functionality
5. Integrate PDF export
6. Polish and refine

### Testing Points

- After template creation
- After preview implementation
- After PDF generation
- After user experience enhancements

### Quality Gates

1. Template renders correctly
2. Preview matches specifications
3. PDF output meets quality standards
4. Error handling works reliably

## Success Criteria

1. Can process JSON input of poems
2. Generates professional-quality PDF
3. Each poem on separate page
4. Background images render correctly
5. Preview matches final output
6. Error handling is robust
7. Performance is acceptable

## Timeline

- Total: 5-8 days
- Milestone 1 (Foundation): Day 2
- Milestone 2 (Core Features): Day 5
- Milestone 3 (Polish): Day 7
- Milestone 4 (Documentation): Day 8

## Next Action

Begin with Phase 1: Foundation

1. Create HTML template structure
2. Set up basic styling
3. Implement initial preview route

### 3-hour sprint (immediate)

Goal: finish a minimal, verifiable slice that reduces test fragility and validates the preview/export fast path.

Prioritized actionables (time budget: 3 hours)

1. PDF parsing stabilization — 1.25h
   - Audit and convert remaining direct `pdf-parse` test imports to use the canonical extractor script (`server/scripts/extract-pdf-text.js`) or `pdfjs-dist` where appropriate.
   - Success criteria: tests no longer import `pdf-parse` in-process; a representative shared test uses the extractor script and asserts extracted text contains expected poem/event titles.
   - Quick verification:

```bash
# from repo root
node server/scripts/extract-pdf-text.js server/samples/ebook.pdf | head -n 40
```

2. Preview smoke wiring — 1.25h

   - Ensure `POST /api/preview` is reachable from client test harness and add/validate a minimal Preview component skeleton (in `client/src/components/PreviewWindow.svelte`) that can render server HTML for a sample payload.
   - Success criteria: manual call or lightweight test fetches `/api/preview` and the returned HTML contains a known poem title.

3. Quick export smoke & artifact check — 0.5h
   - Run `server/scripts/smoke-export.sh` then validate the produced file starts with `%PDF-` and run the extractor script to show expected text appears.
   - Success criteria: `smoke-export.sh` exits 0 and extractor prints expected text snippet.

Notes and constraints

- These tasks are intentionally small and verifiable. They reduce CI flakiness and raise confidence in the core flow.
- Work can be done in parallel by two contributors: (A) backend/tests and (B) frontend/preview wiring.
- If converting tests to call the extractor script, prefer invoking the script in a subprocess from tests (spawn/exec) to avoid bringing the extractor's heavy ESM runtime into existing test runner processes.
