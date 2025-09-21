# API: Preview & Export (minimal reference)

This short reference describes the server endpoints used by the demo flow: preview and export.

Note: The project exposes a few related endpoints; this document focuses on the preview and export paths used by the E2E and smoke harnesses.

1. POST /api/preview

- Purpose: generate an HTML preview for provided content (poems + layout hints).
- Input (JSON):
  - `content` (object|string) — the poem or document content to preview. May be a structured object in production.
  - `template` (optional string) — name of the HTML/CSS template to render.
  - `overrides` (optional object) — visual overrides (colors, fonts, etc.).
- Response (200):
  - `text/html` body containing the preview HTML.
- Errors:
  - 400 Bad Request — missing content or invalid JSON.
  - 500 Internal Server Error — template rendering or server error.

Example (curl):

```bash
curl -sS -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"content":"A short poem...", "template":"summer"}'
```

2. POST /api/export/book (synchronous small-run)

- Purpose: generate a PDF buffer for provided content and return it in response.
- Input (JSON):
  - `content` — document content to export.
  - `options` (optional) — export options (page size, validation: boolean).
- Response (200):
  - `application/pdf` binary response. May include `X-Validation-Warnings` header when PDF validation ran.
- Errors:
  - 400 Bad Request — invalid payload.
  - 500 Internal Server Error — puppeteer launch, timeout, or generation failure.

Notes: This endpoint is intended for small, immediate exports. For longer/async exports use the job-based API.

3. POST /api/export/job (async job enqueue)

- Purpose: enqueue an export job and return a job id for later polling.
- Input (JSON): same as `/api/export/book`.
- Response (201):
  - JSON: `{ "jobId": <number>, "status": "queued" }`
- Progress & status:
  - Use the jobs endpoints (or the WebSocket/long-polling UI path) to check job status. Jobs are written to the `JOBS_DB` SQLite file when configured.

4. GET /api/export/job/:id (status)

- Purpose: return job status and metadata.
- Response (200 JSON):
  - `id`, `state` (`queued`|`processing`|`done`|`failed`), `progress` (0-100), `file_path` (if done), `error` (if failed).

Validation & CI notes

- The in-process smoke harness calls `/api/preview` and `/api/export/book` (or enqueues a job then runs the worker) and then runs `server/pdfQuality.mjs` against the produced PDF to assert page count and heuristics.
- To keep CI deterministic, set `USE_REAL_AI=false` when running tests and set `JOBS_DB` to a temp file path.

## Request / Response JSON Schemas (examples)

Below are small example JSON schemas for the preview and export endpoints. These are intentionally minimal; extend them with your project's real types (fonts, templates, metadata) as needed.

1. POST /api/preview - Request

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["content"],
  "properties": {
    "content": {
      "oneOf": [{ "type": "string" }, { "type": "object" }],
      "description": "Poem or document content. Can be a raw string or a structured object used by the templates."
    },
    "template": {
      "type": "string",
      "description": "Optional template name (e.g. 'summer', 'classic')"
    },
    "overrides": {
      "type": "object",
      "description": "Visual overrides: colors, fonts, margins (optional)"
    }
  }
}
```

Response: 200 returns the HTML body (`text/html`).

2. POST /api/export/book - Request (synchronous export)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["content"],
  "properties": {
    "content": { "oneOf": [{ "type": "string" }, { "type": "object" }] },
    "options": {
      "type": "object",
      "properties": {
        "pageSize": { "type": "string", "enum": ["A4", "Letter"] },
        "validate": {
          "type": "boolean",
          "description": "Run pdfQuality validation before returning (non-fatal by default)."
        },
        "landscape": { "type": "boolean" }
      }
    }
  }
}
```

Response: 200 with `Content-Type: application/pdf` (binary response). When validation runs, the server may include a header `X-Validation-Warnings: true` or add warnings into response headers for CI consumers.

3. POST /api/export/job - Request (enqueue async)

Request body is the same as `/api/export/book`.

Response (201):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "jobId": { "type": "integer" },
    "status": { "type": "string", "enum": ["queued", "processing"] }
  },
  "required": ["jobId", "status"]
}
```

4. GET /api/export/job/:id - Response (status)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "state": {
      "type": "string",
      "enum": ["queued", "processing", "done", "failed"]
    },
    "progress": { "type": "integer", "minimum": 0, "maximum": 100 },
    "file_path": { "type": ["string", "null"] },
    "error": { "type": ["string", "null"] }
  },
  "required": ["id", "state"]
}
```

These schemas are intentionally permissive. When you have the real API types, replace the example schemas above with precise property types and add examples for each endpoint.

This file is intentionally small — expand with request/response JSON schemas and examples as needed.

## Expanded examples and concrete request/response samples

Below are practical example payloads and responses you can use when integrating with the demo server. These are safe examples for local development and CI (set `USE_REAL_AI=false` for deterministic runs).

1. POST /api/preview - Example request

Request headers:

- Content-Type: application/json

Request body (example):

```json
{
  "content": {
    "title": "Summer Poem",
    "lines": [
      "High heat on the hill,",
      "Crickets sing as shadows fall.",
      "We taste the long dusk."
    ],
    "meta": { "author": "Test User", "date": "2024-08-24" }
  },
  "template": "summer",
  "overrides": { "primaryColor": "#ffdd66", "font": "serif" }
}
```

Response: 200 OK

- Content-Type: text/html
- Body: the rendered preview HTML (client can embed in an <iframe> or open in a new window).

2. POST /api/export/book - Example request & response (synchronous export)

Request headers:

- Content-Type: application/json

Request body (example):

```json
{
  "content": {
    "title": "Summer Poem",
    "pages": [
      { "lines": ["High heat on the hill", "Crickets sing as shadows fall."] },
      { "lines": ["We taste the long dusk."] }
    ]
  },
  "options": {
    "pageSize": "A4",
    "landscape": false,
    "validate": true
  }
}
```

Response: 200 OK

- Content-Type: application/pdf
- Binary PDF body (the response is the PDF file). When `validate=true` the server may include diagnostics via headers:
  - `X-Validation-Warnings: true` (exists when pdfQuality found non-fatal warnings)
  - `X-Validation-Warnings-Count: <n>`

Example curl (save PDF to file):

```bash
curl -sS -X POST http://localhost:3000/api/export/book \
  -H "Content-Type: application/json" \
  -d '@export-request.json' --output out.pdf
```

3. POST /api/export/job - Enqueue async job (example)

Request body: same JSON as `/api/export/book`.

Response: 201 Created

```json
{
  "jobId": 42,
  "status": "queued"
}
```

4. GET /api/export/job/:id - Example response (job status)

Response: 200 OK

```json
{
  "id": 42,
  "state": "done",
  "progress": 100,
  "file_path": "/tmp/exports/42.pdf",
  "error": null
}
```

Notes on integration and CI

- For CI runs use a temporary `JOBS_DB` file and set `USE_REAL_AI=false` to avoid external network calls. Example:

  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 CHROME_PATH=/usr/bin/google-chrome-stable JOBS_DB=/tmp/tmp-jobs.db USE_REAL_AI=false npm --prefix server test

- When writing clients that call `/api/export/book` expect a binary PDF body. Use streaming clients or save-to-file semantics rather than assuming a JSON response.

- The job API is intentionally simple; clients should poll `/api/export/job/:id` or use the UI's WebSocket/long-polling endpoints for push updates.

If you want, I can also extract these schemas into standalone JSON Schema files under `docs/schemas/` and add a small TypeScript validator used by the server for stricter request validation.
