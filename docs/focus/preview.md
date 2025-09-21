# Preview — Focus doc

Mission

- Render a safe, interactive HTML preview of current content quickly and keep preview interactions responsive and isolated from main UI logic.

Ordered interaction steps

1. User clicks `Preview` (or preview auto-refresh triggers after Generate).
2. UI: show preview loading indicator within 150ms.
3. Client: emit microlog `preview:button-pressed` synchronously.
4. Client: either render from local `previewStore` or request `GET /preview` with requestId.
5. Client emits `preview:start` before network call (if any).
6. On response or render-ready: inject sanitized HTML into preview container or iframe and emit `preview:loaded` with meta { contentLength }.
7. Ensure user interactions inside preview (scroll, click) do not block parent UI.

Microlog events

- `preview:button-pressed`
- `preview:start` — meta: { requestId }
- `preview:loaded` — meta: { contentLength }
- `preview:render-error` — meta: { code }

Actionables to validate

- Manual: click Preview → console micrologs show `preview:start` then `preview:loaded`; loading indicator displayed and removed; preview scrolls and responds to clicks.
- Unit/component: `fetchPreview()` returns HTML that is sanitized and set into the DOM; test sanitizer against unsafe inputs.
- Integration: server provided HTML via `/preview` is used when configured; client handles missing assets gracefully.
- E2E behavioral: assert microlog order and DOM injection; fail if `preview:button-pressed` exists but no `preview:start`/`preview:loaded` follow.

Edge cases & acceptance criteria

- Large HTML: preview loads progressively or shows placeholder until interactive; acceptance: no main UI freeze.
- Image failures: fallback visuals shown, no blocking.
- XSS attempts: sanitized content prevents execution of inline scripts.

Telemetry

- Emit `preview:request` and `preview:loaded` with contentLength and requestId; keep payloads non-PII.

---
