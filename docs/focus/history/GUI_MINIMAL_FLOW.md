# GUI Minimal Flow Spec

## Goal

Provide a small, concrete, and testable spec that defines the minimal steps the application must perform to implement the core user flow:

- Accept a valid prompt from the user
- Generate content and image-generation prompts via the AI model (Gemini)
- Generate images using the image service (Cloudflare or equivalent)
- Return generated content and images to the GUI for preview/editing and export

This document focuses on minimal, reversible changes and clear acceptance criteria so we can iterate quickly.

## Core responsibilities (high level)

1. Client: collect prompt, validate, send to server, render preview and export.
2. Server: accept prompt, call model, persist results, request images (if any), expose preview endpoints, and provide an export pipeline.
3. AI service adapter: translate prompt → model request → normalized response (content + image prompts).
4. Image service adapter: accept image prompts → produce hosted image URLs (or data-URIs) and return them to server.

## Minimal end-to-end flow (step-by-step)

1. User submits a prompt (client)

   - Client validates prompt: non-empty string, trimmed, length limit (e.g., 10k chars)
   - Client posts to server: `POST /prompt` with JSON body `{ "prompt": "..." }`
   - Optional: If running behind a local dev proxy that requires token, include `x-dev-auth` header when applicable

2. Server accepts prompt and enqueues or processes it synchronously (minimal mode)

   - Validate input; return 400 for invalid
   - For minimal flow process synchronously to give quick feedback (production can later convert to job queue)
   - Use `aiService.generateContent(prompt)` adapter which returns normalized object (see Data Shapes)
   - Persist prompt and AI result: `prompts` and `ai_results` tables via `crud.createPrompt` and `crud.createAIResult`

3. AI service call (Gemini adapter)

   - The adapter converts the user prompt into one or more model calls and returns a normalized result:
     - `content`: { title, body, layout? }
     - `images`: optional array of image prompts: [{ id?, prompt, width?, height?, meta? }]
   - If the model fails, the server returns a structured error (status 500 or 502 for transient failure)

4. Image generation (optional per result)

   - If `images` are present, the server calls `imageService.generate(imagePrompt)` per entry
   - Image service returns either a hosted URL or base64/data-URI
   - Server attaches results to `ai_response.images` as an array of `{ promptId, imageUrl, meta }`

5. Server response to client

   - On success return 201 with JSON:
     ```json
     {
       "success": true,
       "data": {
         "content": { "title":"...", "body":"...", "layout":"..." },
         "images": [{ "imageUrl":"https://...", "meta":{...} }],
         "promptId": 123,
         "resultId": 456
       }
     }
     ```
   - On failure return structured error with helpful message and status

6. Client handles server response
   - Normalize shape (support both `response.data.content` and `response.content` for backward compatibility)
   - Set `contentStore.set(content)` and optional `imageStore` or attach images into `content` (e.g., `content.images = [...]`)
   - Trigger preview: call `loadPreview(content)` which either hits `GET /preview?content=...` for small payloads or `POST /api/preview` for large payloads
   - Update `previewStore.set(html)` with returned HTML
   - Update `uiStateStore` with `loading/success/error` messages

## Minimal API surface and schemas

- POST /prompt

  - Request: `{ "prompt": "..." }`
  - Response success: HTTP 201
    - Body: `{ success: true, data: { content, images?, promptId, resultId } }
  - Validation errors: HTTP 400 with `{ error: '...' }`
  - Auth errors: HTTP 401 if `DEV_AUTH_TOKEN` required and missing

- GET /preview?content=... or POST /api/preview

  - Accepts: content with `title` and `body` (and `layout` optional)
  - Returns HTML string (or JSON `{ preview: "<html>" }` for POST)

- POST /export (or /api/export)
  - Request: the final content and images; returns a downloadable PDF or job id

## Data shapes (normalized)

- Content object (minimal):

  - `content = { title: string, body: string, layout?: string, images?: [ { imageUrl, meta } ] }`

- AI result envelope (server->client):
  - `{ success: true, data: { content, images?, promptId, resultId } }`

## Auth and Dev considerations

- Dev-auth: If `DEV_AUTH_TOKEN` is set, the server will require `x-dev-auth` header for non-health endpoints when `NODE_ENV==='development'`.
- Puppeteer: preview and export endpoints depend on Puppeteer. For local dev/testing, use `SKIP_PUPPETEER=true` to allow server to run without Chromium and still return dev previews via the `?dev=true` path.
- Proxy: Vite dev server proxies `/prompt` and `/preview` to the backend at `http://localhost:3000` — ensure host/port and CORS/proxy settings are correct in `client/vite.config.js`.

## Edge cases & failures (must handle gracefully)

- Empty prompt: client should validate and show `Prompt cannot be empty.`
- Model failure: return 5xx with a clear retry suggestion and preserve the user prompt so retry is easy
- Image generation fails: still return textual content; include `images: []` and provide clear UI message
- Timeouts: client should surface timeout after configured `DEFAULT_TIMEOUT_MS` and allow retry
- Partial results: if images still generating, return content + images:[] + `imagesPending:true` with resultId so the client can poll or ask to refresh when ready

## Acceptance criteria (testable)

1. Basic generation

   - Start server (SKIP_PUPPETEER=true) and client
   - Enter prompt, click Generate
   - Expect POST /prompt returns 201 and client sets `contentStore` with `title` and `body`
   - Expect preview pane to display generated HTML

2. Image path

   - If AI returns `images` prompts, server returns `images` with `imageUrl` entries and client displays thumbnails in the preview

3. Error cases
   - Empty prompt -> UI error
   - 401 when `x-dev-auth` required -> UI shows auth message
   - Timeout -> UI shows timeout message

## Developer checklist (how to implement safely)

- Keep changes small: edit `client/src/components/PromptInput.svelte` to use `submitPrompt` and set `contentStore` (prefer `flows.generateAndPreview` for reuse)
- Keep server-side minimal: in `server/index.js` ensure `/prompt` returns normalized shape; use `SKIP_PUPPETEER` for dev-mode when Puppeteer is not available
- Add unit tests for store-driven preview and integration test for `generateAndPreview`
- Document the API response shape in `docs/focus/GUI_MINIMAL_FLOW.md` and update `README.md` with quick test commands

## Quick test commands

```bash
# start minimal server
cd server && SKIP_PUPPETEER=true NODE_ENV=development PORT=3000 node index.js

# start client
cd client && npm run dev

# quick POST check
curl -v -X POST 'http://localhost:3000/prompt?dev=true' -H 'Content-Type: application/json' -d '{"prompt":"A short, sunlit summer poem about cicadas and long shadows."}'

# quick preview check
curl -G --data-urlencode "content={\"title\":\"Mock: A short, sunlit summer poem\",\"body\":\"This is a mock response for prompt: A short, sunlit summer poem about cicadas and long shadows..\",\"layout\":\"poem-single-column\"}" 'http://localhost:3000/preview' | sed -n '1,40p'
```

## Appendix: minimal server response example

```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "content": {
      "title": "Mock: A short, sunlit summer poem",
      "body": "This is a mock response for prompt: A short, sunlit summer poem about cicadas and long shadows..",
      "layout": "poem-single-column"
    },
    "images": [],
    "promptId": 1,
    "resultId": 1
  }
}
```
