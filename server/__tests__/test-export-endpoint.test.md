````markdown
# test-export-endpoint.js Documentation

## Purpose

This test script demonstrates how to call the `/export` endpoint as a standalone Node script (outside the Vitest runner).

It is used for manual verification and debugging of the export endpoint (writing the returned PDF to `samples/`).

## How it works

- Uses `superagent`/`node-fetch`/`http` (script-specific) to POST a payload to `http://localhost:3000/export` (or in-process URL if adapted).
- Writes the response PDF to disk for manual inspection.

## Running locally

Start the server normally (e.g., `npm start`) and then run the script:

```bash
cd server
node __tests__/test-export-endpoint.js
```

Notes:

- Ensure Chrome/Chromium is available or Puppeteer can use a bundled Chromium.
- Use this script for manual reproduction; prefer the automated integration test for CI and repeatable checks.
````
