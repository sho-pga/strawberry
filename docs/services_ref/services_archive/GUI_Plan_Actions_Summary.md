# GUI Plan & Actions Summary
[WED 17th Sep 2025 @ 3:30PM]

## Purpose

This document captures the definitive GUI debug plan and the actions taken so far to diagnose why backend-generated preview HTML is not reliably appearing in the frontend preview area. It is intended to be a single source-of-truth so future contributors don't need to repeat the discovery steps.

## Scope

- Focus: The implemented flow used in development: frontend prompt → backend generation → backend preview endpoint → frontend receives preview HTML and renders in `PreviewWindow.svelte`.
- Non-goals: Service-agnostic refactors, production auth changes, or major UI rewrites.

## Summary of findings

- Frontend flow:

  - `PromptInput.svelte` triggers `generateAndPreview(prompt)` in `client/src/lib/flows.js`.
  - `generateAndPreview` sets `contentStore` and calls `previewFromContent(content)`.
  - `previewFromContent` validates the content, cancels previous previews, calls `loadPreview(content)` (in `client/src/lib/api.js`), and on success sets `previewStore.set(html)`.
  - `PreviewWindow.svelte` subscribes to `$previewStore` and renders `{@html $previewStore}` into the element with `data-testid="preview-content"`.

- `loadPreview` behavior:

  - If `content.resultId` or `content.promptId` is present it tries GET `/preview?resultId=` or `/preview?promptId=` which returns text/html.
  - If those id GETs fail it fetches JSON from `/content/result/:id` or `/content/prompt/:id` and resolves content.
  - For small payloads it uses GET `/preview?content=<urlencoded JSON>` and expects text/html.
  - For large payloads it uses POST `/api/preview` and expects JSON `{ preview: "<html>..." }`.
  - `loadPreview` normalizes both shapes and returns an HTML string.

- Store & UI wiring:
  - `client/src/stores/index.js` uses a DEV singleton guard `window.__STRAWBERRY_SINGLETON_STORES__` to avoid multiple store instances under HMR and attaches `__instanceId` to each store.
  - `previewStore` is instrumented to record `window.__LAST_PREVIEW_SET` and verbose logs when `DEV_STORES_VERBOSE` is enabled (`?debugStores=1` or localStorage flag `__ENABLE_VERBOSE_STORES__`).
  - `PreviewWindow.svelte` contains extensive dev-side logging and DOM markers (e.g., `data-preview-ready`, `window.__preview_html_snippet`, `window.__LAST_PREVIEW_HTML`) to help automated tests and manual debugging.

## Live test evidence

- A curl test performed earlier (not URL-encoded JSON) returned HTTP 400 with a validation error: "Invalid content format" and details: "Unexpected non-whitespace character after JSON at position 7...". This demonstrates server-side validation is active and rejects malformed JSON in the `content` query param.

## Likely root cause hypotheses

1. Malformed GET payload (client sends un-encoded JSON in `content` query param) → server returns 400.
2. Missing dev proxy headers (Vite proxy should inject `x-dev-auth`); if missing, server may block or behave differently.
3. Response shape mismatch: client expects HTML but receives JSON or vice-versa in a code path that doesn't normalize.
4. Duplicate store instances due to HMR or inconsistent import paths (less likely because a singleton guard exists, but verify `__instanceId` matches).
5. Race/Abort behavior: previewFromContent cancels earlier requests and treats Abort as non-error (returns empty string), so aborted requests leave the preview unchanged.

## Reproducible checks (commands & expected outcomes)

1. Properly URL-encoded GET `content` (small payload):

```bash
# generate a correctly urlencoded JSON and call /preview (expects 200 + HTML)
curl -v "http://localhost:3000/preview?content=$(python3 -c 'import urllib.parse,json;print(urllib.parse.quote(json.dumps({"title":"test","body":"hello world"})))')"
```

Expected: HTTP 200 and an HTML body. If 400, server validation rejected the payload; investigate how the client builds the query.

2. GET by id path (server-rendered HTML):

```bash
curl -v "http://localhost:3000/preview?resultId=EXAMPLE_ID"
```

Expected: 200 + HTML (or 404 if id not found). If 401/403, check proxy header injection and server-side dev auth checks.

3. POST JSON path for larger payloads:

```bash
curl -v -X POST http://localhost:3000/api/preview -H "Content-Type: application/json" -d '{"title":"t","body":"b"}'
```

Expected: 200 + JSON body like { "preview": "<html>..." }.

4. Browser runtime checks (DevTools Console):

- Append `?debugStores=1` to app URL to enable store verbose logging.
- Reproduce generate/preview; confirm console logs:
  - `STORE:previewStore.set` (or `window.__LAST_PREVIEW_HTML` updated)
  - `PreviewWindow: previewStore updated, length=`
- Use PreviewWindow debug panel: click "Force local preview" — if this updates the preview, UI wiring is fine and the problem is upstream (network)

## Invariant checks (what to capture when reproducing)

- Network requests (method, URL, response status, content-type) for calls to `/preview` and `/api/preview`.
- Console logs showing `previewStore.__instanceId` at both the point where `previewStore.set` is invoked (if visible) and when `PreviewWindow` mounts (the component logs this on mount).
- `window.__LAST_PREVIEW_HTML` and `window.__preview_html_snippet` values (PreviewWindow sets these when $previewStore changes).

## Minimal dev-only helpers to implement (deferred until approval)

- Add a dev-only server route `/debug/echo` that returns request headers and a truncated body — quick way to verify proxy header injection.
- Add a small dev log inside `loadPreview()` to log response `content-type` and first N chars of returned body prior to parsing/returning.
- Add an integration unit test that mocks the server shapes (GET text/html + POST JSON) and asserts `generateAndPreview` updates `previewStore`.

## Edge cases to consider

- Empty title or body → client validation prevents previewFromContent from calling loadPreview (client-side check in flows.js).
- Very large body → client uses POST /api/preview (server must accept large payloads and return JSON preview).
- Rapid user actions → aborted preview requests are considered non-errors and return ""; user may need slower debounce or UI feedback that previews are being cancelled.
- HMR/multiple module copies → guard via `window.__STRAWBERRY_SINGLETON_STORES__` exists but check `__instanceId` under DEV.

## Next steps (pick one)

- Option A (non-invasive): Run the reproducible checks above (curl and browser console) and paste logs/results here; I'll analyze and produce the exact minimal change.
- Option B (implement dev helpers): I will add the `/debug/echo` server route, add dev logging in `loadPreview`, and create a small unit test. I will run tests and report results.

## Change log (what was added now)

- Added `docs/services_ref/GUI_Plan_Actions_Summary.md` capturing findings, tests, and triage steps so future debugging won't have to be repeated.

## Contact point / references

Important files referenced in this document:

- `client/src/components/PromptInput.svelte`
- `client/src/lib/flows.js`
- `client/src/lib/api.js`
- `client/src/stores/index.js`
- `client/src/components/PreviewWindow.svelte`
- `server/index.js` (preview and api/preview handlers)

If you want me to implement the dev helpers now, reply: "Yes, implement dev helpers" and I will create the server route, logging, and tests (and run them). Otherwise run the non-invasive checks and paste the results and I'll continue from there.
