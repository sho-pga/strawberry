# API Endpoints (Core Loop)

This document lists the core HTTP endpoints used by the Aether prototype: Prompt → Preview → Override → Export.

All endpoints are hosted on the server (default base: `http://localhost:3000`). Request/response examples use JSON unless noted.

---

## POST /prompt

Purpose: Accepts a textual prompt and returns AI-generated content.

Request:

- Content-Type: application/json
- Body:
  {
  "prompt": "Write a short poem about summer"
  }

Responses:

- 201 Created
  {
  "success": true,
  "data": {
  "content": { "title": "...", "body": "...", "layout": "default" },
  "metadata": { "model": "mock-1", "tokens": 5 },
  "promptId": 123,
  "resultId": 456
  }
  }
- 400 Validation error when `prompt` missing
- 500 AI service errors

Notes:

- The server stores prompts and AI results in the database (SQLite in dev).

---

## POST /api/preview

Purpose: Return an HTML preview for provided content. (Client uses `POST /api/preview`.)

Request:

- Content-Type: application/json
- Body: either the content object directly or an object containing `content`.
  Example content shape:
  {
  "title": "My Title",
  "body": "Rendered HTML or text",
  "layout": "default"
  }

Responses:

- 200 OK: returns a JSON response when called via `/api/preview`:
  {
  "preview": "<html>...</html>",
  "metadata": {}
  }
- 400 Validation errors (missing title/body)
- 500 Processing errors

Backward-compatibility:

- The server still supports `GET /preview?content=<json>` for legacy clients and debugging, but clients should use the JSON POST to avoid URL length limits and to send larger payloads.

---

## POST /override

Purpose: Apply user-specified overrides to an existing content object.

Request:

- Content-Type: application/json
- Body:
  {
  "content": { "title": "Old title", "body": "Old body" },
  "changes": { "title": "New title" }
  }

Responses:

- 200 OK
  {
  "success": true,
  "data": { "content": { ...updated content... } }
  }
- 400 Validation errors
- 500 Processing errors

---

## POST /export

Purpose: Generate a PDF from the provided content. The server prefers queued processing (BullMQ + Redis) if configured, otherwise it falls back to synchronous in-request generation using Puppeteer.

Request:

- Content-Type: application/json
- Body:
  {
  "title": "My PDF Title",
  "body": "HTML or text to render"
  }

Responses:

- 200 OK with `Content-Type: application/pdf` (synchronous fallback)
  - Returns binary PDF data in the response body
- 202 Accepted (when queued):
  {
  "success": true,
  "jobId": "<id>",
  "statusUrl": "/api/pdf_exports/<id>"
  }
- 400 Validation errors
- 503 Service unavailable if Puppeteer not ready
- 500 PDF generation error

Notes:

- Puppeteer uses `CHROME_PATH` or system chrome; in CI/dev the devcontainer installs Chrome and sets `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`.
- For large exports or high concurrency, configure a Redis-backed queue and background worker.

---

## Common Error Shape

Errors returned by the API generally follow this structure for non-HTML endpoints:

{
"success": false,
"error": {
"message": "Human-friendly message",
"code": "ERROR_CODE",
"status": 400,
"details": { ... }
}
}

---

## Recommendations

- Clients should use POST for preview and export to avoid URL length and encoding issues.
- Validate content server-side for required fields (`title`, `body`) before attempting heavy operations.
- Log request IDs (`X-Request-Id`) for traceability.

---

Document created/updated: 2025-08-17
