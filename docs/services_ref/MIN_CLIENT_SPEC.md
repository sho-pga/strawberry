# MIN_CLIENT_SPEC — Minimal Client Specification

[WED 17th Sep 2025 @ 5:15PM]

This specification has been split into two focused documents:

- [CORE_FLOW_SPEC.md](CORE_FLOW_SPEC.md) - Essential flow implementation
- [RESTORATION_SPEC.md](RESTORATION_SPEC.md) - Feature restoration plan

Purpose

This document records a minimal client setup to validate the core flow:

1. Frontend sends user's prompt to backend
2. Backend stores prompt in `./samples/latest_prompt.txt`
3. Backend sends back the prompt content in triplicate
4. Frontend displays the returned content in the preview pane

Keep the client intentionally minimal to eliminate HMR/global-singleton/dev-instrumentation complexity. Once this basic flow is validated, reintroduce features incrementally.

## Scope (what is included)

- Minimal store exports (single Svelte `writable` instances)
- Simple `fetch` call to send prompt to backend
- Direct preview display of content returned from backend
- No retries, cancellation, or complex error handling for initial testing

Out of scope (for this phase)

- Complex retry/backoff strategies
- AbortController cancellation
- Dev instrumentation and global window singletons
- Background persistence flows
- Preview HTML generation (done by backend)

## Network contract (explicit)

- Prompt submission & preview content
  - Request: `POST /prompt`
    - Body: `{ "prompt": "..." }`
    - Response: JSON with shape `{ "content": "<tripled-text>" }` where `content` is plain text with newline separators (e.g. "hi\nhi\nhi").
  - Side effect: Backend writes the prompt to the repository-root samples file at `./samples/latest_prompt.txt` (recommendation: server code use a repo-root-relative path such as `path.join(__dirname, '..', 'samples', 'latest_prompt.txt')`).

Client responsibilities

- Send prompt text to backend via POST /prompt and parse the JSON response `{ content }`.
- Display the `content` value in the preview pane element with `data-testid="preview-content"`.
- Disable the Generate button and show a minimal loading indicator while awaiting the response; on success re-enable and update the preview.
- On error (non-2xx response), show a concise error message derived from the response and re-enable the Generate button; do not modify the existing preview on error.

## Minimal store design

- `client/src/stores/index.js` (minimal exports):
  - `export const promptStore = writable('');` // User's input prompt
  - `export const previewStore = writable('');` // Content returned from backend
  - `export const uiStateStore = writable({ status: 'idle', message: '' });` // Loading states

Minimal flow (sequence)

1. User enters prompt text and clicks "Generate"
2. Client calls `POST /prompt` with `{ prompt: promptStore.value }`
3. Backend writes prompt to `./samples/latest_prompt.txt`
4. Backend returns the prompt content in triplicate
5. Frontend sets `previewStore` with returned content
6. Preview component renders content into `[data-testid="preview-content"]`

## Files to check / simplify

- `client/src/stores/index.js` — only the three minimal stores above
- `client/src/lib/api.js` — simple `submitPrompt` that posts to backend
- `client/src/lib/flows.js` — basic `generateAndPreview(prompt)` that posts prompt and updates preview
- `client/src/components/PreviewWindow.svelte` — display `previewStore` content
- Remove all HMR/instrumentation code

## Checkable actionables (concrete tasks)

1. Create minimal store file

   - Task: Replace current stores with just promptStore, previewStore, uiStateStore
   - To do: Strip down to just the three basic writables without the dev wrapper
   - Acceptance: Stores update and trigger UI changes when set

2. Simplify prompt submission

   - Task: Update `api.js` to just POST prompt and return tripled content
   - To do: Reduce to a simple fetch call to POST /prompt
   - Acceptance: `POST /prompt` creates `latest_prompt.txt` and returns content

3. Simplify generate/preview flow

   - Task: Update `flows.js` to call submitPrompt and update preview
   - To do: Reduce to basic prompt submission and preview update
   - Acceptance: Generate button triggers POST and preview updates

4. Verify through GUI
   - Task: Test the full flow manually through the frontend interface
   - Acceptance: Enter prompt → click generate → see preview + verify `latest_prompt.txt`

## Validation checklist

1. Start fresh (Ctrl+F5)
2. Enter prompt text
3. Click generate
   Verify:

- [x] Backend received prompt (`latest_prompt.txt` exists and contains prompt)
- [ ] Preview shows tripled content
- [ ] No errors in console
      `window.previewStore && typeof window.previewStore.set` (if you expose for manual testing) or use the UI force preview button;
      No AbortError entries in console;
      No infinite console logs

## Rollback plan

- If anything fails, revert the minimal changes and re-introduce a single prior change at a time (stores only, then API/simple flows, then preview component).

Gradual reintroduction plan (after the minimal flow works)

1. Add back safe retries: small retry wrapper around fetch (maxRetries: 2, idempotent GET only by default).
2. Add AbortController with robust per-request scoping and tests for overlapping requests (ensure most-recent request wins).
3. Add background persistence flow, non-blocking; ensure persisted `promptId` is used to refresh preview once available.
4. Reintroduce HMR-safe singleton merging only if required; prefer canonical import paths and avoid heavy global mutation.
5. Reintroduce dev instrumentation guarded by an explicit debug flag and rate-limited logging.

Risks and mitigations

- Risk: HMR causing duplicate modules. Mitigation: canonical imports and avoid window globals in production; only enable global merging if absolutely required.
- Risk: Long server response or network glitches. Mitigation: simple timeout fallback and local fallback preview UI.

## Estimate

- Documenting + wiring the minimal client changes: ~1–2 hours (implementation + manual smoke tests).
- Reintroducing features and tests: additional 2–4 hours depending on coverage required.

---

End of MIN_CLIENT_SPEC
