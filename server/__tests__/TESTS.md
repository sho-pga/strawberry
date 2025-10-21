# Test Documentation (Consolidated)

This document consolidates the individual test docs found under `server/__tests__` into a single reference.

**Note:** Update TESTS.md further with a detailed list of test files and how they map to CI steps. (TODO)

## Table of contents

- Prompt API tests (`prompt.test.js`)
- AI Service tests (`aiService.test.js`)
- Export integration test (`export.integration.test.js`)
- Export endpoint script (`test-export-endpoint.js`)
- Puppeteer smoke test (`puppeteer.smoke.test.js`)
- Preview template unit test (`test-previewTemplate.js`)
- Puppeteer PDF flow test (`test-puppeteer-pdf.js`)

---

## Prompt API tests (`prompt.test.js`)

Purpose: Validate prompt CRUD + validation + state management.

Highlights:

- Tests create/read/update/delete prompts
- Validates input validation and error states
- Ensures cleanup restores DB state

Dependencies: `vitest`, `supertest`.

Run:

```
cd server
npm run test:run -- prompt.test.js
```

---

## AI Service tests (`aiService.test.js`)

Purpose: Validate the AI service abstraction (`MockAIService`) behavior and integration with prompt/AI result storage.

Highlights:

- Validates structured AI response (content + metadata)
- Tests error cases (empty/invalid prompts)
- Verifies DB storage of prompt/result pairs

Run:

```
cd server
npm run test:run -- aiService.test.js
```

---

## Export Integration Test (`export.integration.test.js`)

Purpose: End-to-end verification of the `/export` endpoint using Puppeteer.

What it does:

- Starts the app programmatically (no network listen)
- Waits for `/health` to be `ok`
- Posts `{ title, body }` to `/export`
- Asserts a 200 response with `application/pdf` and a non-empty binary buffer

Dependencies: `vitest`, `supertest`, `puppeteer-core`, plus a system Chrome/Chromium or `CHROME_PATH` configured.

Run:

```
cd server
npm run test:run -- export.integration.test.js
```

CI note: The CI job must install a system Chrome/Chromium binary or set `CHROME_PATH`. See `.github/workflows/server-tests-pr.yml`.

---

## Export text verification test (`export_text.test.mjs`)

Purpose: End-to-end verification of the `/api/export/book` endpoint that asserts:

- The response is a valid PDF (magic bytes `%PDF-`).
- The extracted PDF text contains expected poem titles (uses `server/scripts/extract-pdf-text.js`).

What it does:

- Starts the app programmatically (no network listen), ensuring DB and Puppeteer are initialized.
- Posts to `/api/export/book` and captures the binary response.
- Writes the buffer to a temp file and calls `server/scripts/extract-pdf-text.js` to extract text for assertions.

Run:

```
cd server
npx vitest run __tests__/export_text.test.mjs --run
```

Notes:

- This test uses a subprocess to run the extraction script to avoid importing `pdf-parse` directly inside the test process (some versions run debug code on import).
- For CI, see the `verify-export` script in `server/package.json` which runs the smoke export and extraction.

---

## Export endpoint script (`test-export-endpoint.js`)

Purpose: Manual script to POST to `/export` and write returned PDF to `samples/` for debugging.

Run (manual):

```
cd server
node __tests__/test-export-endpoint.js
```

Notes: Use for manual reproduction; prefer the integration test for automated checks.

---

## Puppeteer Smoke Test (`puppeteer.smoke.test.js`)

Purpose: Lightweight smoke test to ensure Puppeteer/Chrome can be launched.

Run:

```
cd server
npm run test:run -- puppeteer.smoke.test.js
```

CI note: CI must provide Chrome/Chromium or set `CHROME_PATH`.

---

## Preview Template Test (`test-previewTemplate.js`)

Purpose: Unit test for the `previewTemplate` helper that generates HTML used for previews and PDFs.

Run:

```
cd server
npm run test:run -- test-previewTemplate.js
```

Notes: Does not require Puppeteer.

---

## Puppeteer PDF Flow Test (`test-puppeteer-pdf.js`)

Purpose: Functional verification that a Puppeteer-driven PDF flow creates a file and returns a buffer.

Run:

```
cd server
npm run test:run -- test-puppeteer-pdf.js
```

CI note: Requires Chrome/Chromium.

---

## General notes

- Tests run under Vitest. Use `npm test` for interactive watch or `npm run test:run` for CI-friendly runs.
- Integration and Puppeteer-based tests need a Chrome/Chromium binary; the included workflow installs `chromium-browser` on Ubuntu.
- Consider gating heavy tests behind an env var (e.g., `RUN_INTEGRATION=true`) in CI to reduce runtime when not needed.
