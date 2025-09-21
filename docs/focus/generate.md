# Generate — Focus doc

Mission

- Convert a user prompt into draft content while keeping the UI responsive and providing clear progress and recovery options.

Ordered interaction steps (UI → validation → client → network → store → UI)

1. User clicks `Generate` (or presses Enter while focused).
2. UI: immediate visual feedback — pressed state then spinner and button disabled within 100–200ms.
3. Client: synchronous microlog `generate:button-pressed` emitted.
4. Client: run `validatePrompt()`; emit `generate:validation-failed` or `generate:validation-passed` synchronously.
5. If valid, client emits `generate:start` with a short `requestId`, then sends `POST /generate` (or configured proxy) including requestId and minimal metadata.
6. UI: show progressive state (spinner / progress bar / streaming placeholder). If streaming supported, append partial content as it arrives.
7. On first meaningful progress (DOM update or stream chunk), emit `generate:interaction_followup`.
8. On success: backend response parsed, `previewStore.set(content)`, emit `generate:success`, spinner removed, button enabled.
9. On failure or timeout: emit `generate:fail` with error code, show visible toast with requestId and retry button, re-enable `Generate`.

Microlog events (synchronous landmarks)

- `generate:button-pressed` — step: `button-pressed`
- `generate:validation-passed` or `generate:validation-failed`
- `generate:start` — meta: { requestId }
- `generate:interaction_followup` — first DOM change or stream chunk
- `generate:success` / `generate:fail` — meta: { code, elapsedMs }

Actionables to validate

- Manual: click Generate → within 200ms: button disabled & spinner visible; within 2s: `generate:start` appears in micrologs; within T_success (configurable, default 5s) the preview updates; if not, mark dead GUI.
- Unit/component: validate `validatePrompt()` behavior; test request payload builder for required fields (prompt length, options, requestId).
- Integration: server stub returns canned success/failure — client must render content or show error UI and include requestId for traceability.
- E2E behavioral tests:
  - Happy path: assert microlog sequence and DOM mutation of preview; fail if no `generate:interaction_followup`.
  - Failure injection: simulate network delay and assert fallback UI appears and microlog `generate:fail` recorded.
  - Rapid double-click: assert debounce; at most one `generate:start` created.

Edge cases & acceptance criteria

- Empty or whitespace prompt: generate blocked with `generate:validation-failed` and inline message shown.
- Very large prompt: client enforces truncation or warning and records appropriate microlog.
- Auth missing: client surfaces clear error with requestId.
- Acceptance: on happy-path preview updates and UI never freezes; on fail, user sees retry and requestId.

Telemetry & metrics

- Metrics: generate_requests_total, generate_success_total, generate_error_total, generate_latency_ms histogram.
- Include requestId in logs and minimal prompt-length metadata only.

---
