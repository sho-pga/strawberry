````markdown
# Export Integration Test Documentation

## Purpose

**Test Implementation Review Stamp**

> ✅ Verified: As of 2025-08-16, `export.integration.test.js` validates end-to-end PDF export functionality by starting the server in-process, waiting for `/health`, posting an export payload, and asserting a binary PDF response is returned.

### Test Suite Overview

This integration test ensures the full export path works with Puppeteer active and the database initialized.

- Start server in test mode (no network listen)
- Wait for `/health` to report `ok`
- POST `{ title, body }` to `/export`
- Validate response status, headers, and that returned body is a non-empty PDF buffer

### Test Configuration

Dependencies:

- vitest
- supertest
- puppeteer-core (and a system Chrome/Chromium executable)

### Running locally

```bash
cd server
npm run test:run -- export.integration.test.js
```

### CI notes

The CI job must install a system Chromium or set `CHROME_PATH` to a valid Chrome binary. See `.github/workflows/server-tests-pr.yml` for an example job that installs `chromium-browser` on Ubuntu.
````
