# E2E_PLUMBING

This document describes the current **[TUE 16th Sep 2025 @ 10:30AM]** end-to-end plumbing for the "Generate" → preview flow in the AetherPress prototype (as implemented in branch `aetherV0/anew`). It records the concrete components, the request/response contracts, and testable observability hooks.

## High-level flow (click → preview)

1. User clicks `Generate` in the frontend UI (`client/src/components/PromptInput.svelte`).
2. Frontend calls `generateAndPreview(prompt)` in `client/src/lib/flows.js`.
3. `generateAndPreview` calls `submitPrompt(prompt)` in `client/src/lib/api.js` which POSTs `{ prompt }` to `/prompt`.
4. `server/index.js` handles `POST /prompt`:
   - If `?dev=true` is present a deterministic dev payload is returned immediately (no DB/AI calls).
   - Otherwise, `server/index.js` validates input and calls `genieService.generate(prompt)`.
5. `server/genieService.js` (demo) delegates to `server/sampleService.js` which:
   - Saves the prompt to `latest_prompt.txt` (repo root or `samples/latest_prompt.txt` depending on configuration),
   - Builds a `content` object `{ title, body }`,
   - Produces `copies` (three copies of `content`),
   - Returns `{ data: { content, copies } }`.
6. After receiving `genieResult`, `server/index.js` attempts to persist prompt and AI result via `crud.createPrompt` and `crud.createAIResult`. These persistence steps are best-effort and non-blocking.
7. Server responds `201` with `{ success: true, data: { content, copies, promptId?, resultId? } }`.
8. `generateAndPreview` extracts `content` from the response and sets `contentStore.set(content)` immediately.
9. `generateAndPreview` triggers `previewFromContent(content)` which calls `loadPreview(content)` to get server-rendered HTML or falls back to a client-side generated HTML.
10. `loadPreview` attempts server-rendered HTML by calling `/preview` (by `resultId`/`promptId` or by passing encoded `content`). Server `GET /preview` returns an HTML template containing `content.title` and `content.body`.
11. Returned HTML is set to `previewStore`, and `client/src/components/PreviewWindow.svelte` renders `{@html $previewStore}` inside the element with `data-testid="preview-content"`.

## Contracts

- Frontend → POST `/prompt`

  - Request: `Content-Type: application/json` with body `{ prompt: string }`.
  - Success (dev or demo): `201` with JSON `{ success: true, data: { content: { title, body }, copies: [content, content, content], promptId?: number, resultId?: number } }`.
  - Error: `4xx/5xx` with JSON `{ error: string, details?: any }`.

- Frontend → GET `/preview?content=<encoded JSON>` or `/preview?promptId=<id>` or `/preview?resultId=<id>`
  - Success: `200` with `Content-Type: text/html` containing the rendered preview HTML.
  - Error: `4xx/5xx` with a descriptive HTML or JSON error.

## Exact JSON contract (TUE 16th Sep 2025 @ 10:30AM)

Below are the exact success and error JSON shapes the frontend and tests should rely on.

POST /prompt (Success - JSON)

```json
{
  "success": true,
  "data": {
    "content": {
      "title": "string",
      "body": "string",
      "layout": "string (optional)",
      "background": "string (optional)"
    },
    "copies": [
      { "title": "string", "body": "string" },
      { "title": "string", "body": "string" },
      { "title": "string", "body": "string" }
    ],
    "promptId": 123, // optional numeric id assigned when persisted
    "resultId": 456 // optional numeric id assigned for generated result
  }
}
```

Notes:

- `content.title` and `content.body` MUST be present for preview rendering.
- `copies`, `promptId`, and `resultId` are optional — callers must handle their absence gracefully.

POST /prompt (Validation / Client Error - JSON)

HTTP status: `400` (or other 4xx)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Prompt is required and must be a non-empty string",
    "details": { "provided": "string" }
  }
}
```

POST /prompt (Server Error - JSON)

HTTP status: `500` (or other 5xx)

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Generation Error: <brief message>",
    "details": null
  }
}
```

Preview endpoint variants:

- `GET /preview?content=<encoded JSON>` returns raw HTML (`Content-Type: text/html`).
- If using `POST /api/preview` (for large payloads), the server may return JSON:

```json
{
  "preview": "<html>...</html>",
  "metadata": {
    /* optional */
  }
}
```

HTTP status mapping recommendations:

- `200` success (preview or JSON)
- `201` created (for POST /prompt when a new record is persisted)
- `400` validation errors
- `401` authentication errors
- `403` authorization errors
- `429` rate limiting
- `500` server errors

## Observability & test hooks

- DOM hook: preview content is rendered inside an element with `data-testid="preview-content"`.
- Body attributes: `PreviewWindow.svelte` briefly sets `document.body` attributes `data-preview-ready="1"` and `data-preview-timestamp="<timestamp>"` when preview updates.
- Window globals/events: `window.__LAST_PREVIEW_HTML`, `window.__preview_updated_ts`, `window.__preview_html_snippet`, and a `preview-ready` CustomEvent are emitted for tests and debugging.
- Dev-status: `PromptInput.svelte` shows a dev textarea (DEV only) with `uiState` and preview length.
- Server logs: API request/response logging includes `API Request: POST /prompt` and `API Response: 201 from /prompt` entries.

## Failure modes & notes

- Empty prompt: Rejected client-side (UI validation) and server-side (400 validation error).
- Large prompts: Client may POST then fallback to `POST /api/preview` for preview generation if the URL length is too large.
- Concurrency: New generate actions overwrite `contentStore` and `latest_prompt.txt`; server persistence may add `promptId/resultId` later.
- Persistence failures: DB writes are non-fatal for the demo payload; they are logged and the demo response is still returned.

## Quick verification checklist

1. From the running frontend, enter a non-empty prompt and click `Generate`.
2. Verify network tab shows `POST /prompt` and that response JSON includes `data.content` and `data.copies`.
3. Observe the preview area updates (inspect `[data-testid="preview-content"]` HTML), or check `window.__preview_updated_ts` in the browser console.
4. Confirm `samples/latest_prompt.txt` (or `latest_prompt.txt` in repo root) contains the prompt after generation (server writes it).

## Helpful curl examples

- Dev deterministic call (skips DB/AI):

```bash
curl -v -X POST 'http://localhost:3000/prompt?dev=true' \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"A short haiku about rain"}' | jq
```

- Standard call:

```bash
curl -v -X POST 'http://localhost:3000/prompt' \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"A warm summer afternoon, beaches and poems"}' | jq
```

## Where to update when changing implementation

- `server/genieService.js` — swap demo `sampleService` for `aetherService`/AI orchestration.
- `server/index.js` — keep response contract stable (the frontend expects `data.content` and optional `promptId/resultId`).
- `client/src/lib/api.js` & `client/src/lib/flows.js` — ensure the normalization in `submitPrompt` and the `generateAndPreview` extraction logic remains compatible with the server envelope.

---

_Last updated: generated automatically on 2025-09-16 by code agent._
