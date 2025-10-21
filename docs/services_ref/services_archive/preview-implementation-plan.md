# Preview Implementation & Debug Plan

Purpose

Document a step-by-step, checkable implementation and debugging plan to determine why backend-provided preview content is not making it into the frontend preview area, and to perform low-risk fixes. The plan is intentionally conservative: document and test first, then implement changes and validate with repeatable checks.

Scope (narrowed)

- Focus only on the implemented flow currently in use: frontend sends prompt/content -> backend processes and returns preview (HTML or JSON-wrapped HTML) -> frontend receives the backend result and sets `previewStore` -> `PreviewWindow` should render the HTML.
- Do NOT attempt alternative flows or hypothetical architectures. Keep checks targeted and actionable for this path.

Preconditions

- Devservers running in the devcontainer or locally with ports:
  - Vite client: `http://localhost:5173`
  - Server: `http://localhost:3000`
- If using the devcontainer, ensure `.devcontainer/devcontainer.json` has `remoteEnv` mapping for `DEV_AUTH_TOKEN` and `CHROME_PATH`.
- Access to a terminal inside the devcontainer or Codespace where `DEV_AUTH_TOKEN` (if used) is available.

Safety

All debug endpoints and code paths added must be gated under development-only checks (e.g., `NODE_ENV === 'development'`) and not be enabled in production builds.

Security note

Refer to `docs/services_ref/devcontainer-dev-auth-token.md` for secure design guidance. Short form:

- Prefer server-side-only tokens; avoid embedding `DEV_AUTH_TOKEN` in client bundles.
- Use the server-side proxy pattern wherever possible: client -> backend -> third-party, with the secret only on the backend.

Plan Overview (checkable steps)

1. Observe the symptom and reproduce

   - [ ] Reproduce the UI flow that should trigger a preview update; note timestamped logs.
   - Evidence: Browser DevTools Network shows a request to `/preview` or `/api/preview` when preview is requested.

2. Confirm backend generation & returned payload (targeted)

- [ ] From host shell (devcontainer), call the exact endpoint the frontend uses. If frontend uses GET `/preview?content=...`:
  ```bash
  curl -i "http://localhost:3000/preview?content=hello"
  ```
  - Expected: HTTP 200 and an HTML body or a JSON body `{ "preview": "<html>..." }` — but use the exact shape the frontend code expects (see step 4).
- [ ] If your server requires dev auth in this environment, repeat with the header the middleware expects:
  ```bash
  curl -i -H "x-dev-auth: $DEV_AUTH_TOKEN" "http://localhost:3000/preview?content=hello"
  ```

3. Confirm frontend request shape & headers (targeted)

- [ ] Trigger the exact UI action that the frontend uses to request a preview. In DevTools -> Network, find the request. Confirm:
  - Request URL and method (GET `/preview` vs POST `/api/preview`) match the call site in `client/src/lib/api.js`.
  - Request headers include `x-dev-auth` if and only if the proxy or client sets it. If header is missing and server requires it, that's the issue.
- [ ] If the frontend uses the Vite proxy (relative URLs), also simulate the same call via Vite (`http://localhost:5173/...`) to confirm the proxy path behavior.

4. Quick server-side header echo (dev-only) — optional but fast

- If you need a fast verification, add a dev-only route `GET /debug/echo` that returns `req.headers` so you can confirm whether `x-dev-auth` is being forwarded from the proxy. Guard it with `NODE_ENV === 'development'` and remove after debugging.

5. Verify frontend parsing & assignment (targeted)

- [ ] In `client/src/lib/api.js` where `loadPreview` is implemented, confirm the exact parsing code used after `fetch`.
  - If code does `await resp.json()` it expects `{ preview: '...' }`.
  - If code does `await resp.text()` it expects raw HTML.
- [ ] Add (temporary, dev-only) console logging immediately after `fetch` showing `resp.status`, `resp.headers.get('content-type')`, and a truncated `await resp.clone().text()` to capture raw payload without breaking subsequent parsing.
- [ ] After parsing, confirm the function sets the canonical store export (e.g., `previewStore.set(parsedHtml)`).

6. Confirm preview store wiring (targeted)

- [ ] Confirm there is exactly one `previewStore` module that exports the Svelte `writable` used by both the loader and `PreviewWindow`.
- [ ] Check imports at the call site and at `PreviewWindow.svelte` are identical and reference the same path.
- [ ] Add a small reactive debug line in `PreviewWindow.svelte` to print `$previewStore?.length` to console when it changes (dev-only). If the store never changes, the issue is upstream.

7. Confirm preview store wiring

   - [ ] Ensure the store used by the loader and the `PreviewWindow` is a single exported module (not re-created). Search for all exports/imports of `previewStore`.
   - Quick test: in `PreviewWindow.svelte` add a reactive log to print `$previewStore?.length` on change.
   - Expected: after loadPreview succeeds, `$previewStore` changes from `''` to non-empty string and console logs show the update.

8. Acceptance criteria (when fixed)

   - [ ] Triggering preview in UI causes a Network request and response with expected HTML or JSON.
   - [ ] The client logs show the response payload and parsing succeeded.
   - [ ] `previewStore` is set with the returned HTML and `PreviewWindow` renders `data-testid='preview-content'` content corresponding to the returned HTML.
   - [ ] No 401s or network errors remain for the normal dev flow when `DEV_AUTH_TOKEN` is available.

9. If header/auth is the issue (targeted fix)

- Option A (preferred): ensure the environment that starts Vite contains the token (use `VITE_` prefix for client-exposed variables if absolutely necessary for dev), but prefer the server-side proxy pattern.
- Option B (fallback): allow backend to accept a dev-only query param (e.g., `?dev_token=...`) guarded by development-only checks; this is less preferred but low-friction for short-term testing.

10. If Store wiring is the root cause: fix single-source-of-truth

- Ensure `previewStore` is exported from a single file and imported consistently.
- Replace any `writable('')` occurrences that create separate store instances with imports of the canonical store.

11. Cleanup after fix

- Remove or gate all dev-only debug code (echo route, console logs) and update `preview-discovery.md` with the verified outcome.

12. Optional: Add CI smoke test

- Create a CI test that starts a server (or uses the in-process smoke-mode), hits `/api/preview` with `DEV_AUTH_TOKEN` set and verifies the shape of the response.

Implementation notes & exact file suggestions

- Server: add route in `server/index.js` guarded by `if (process.env.NODE_ENV === 'development') { app.get('/debug/echo', (req, res) => res.json({ headers: req.headers })) }`.
- Client: in `client/src/lib/api.js` wrap fetch parsing with the tolerant `parsePreview` function; add `console.debug` guarded by local `if (import.meta.env.DEV)`.
- Store: confirm there is a single `previewStore` module (e.g., `client/src/stores/preview.js`) and that both fetcher and `PreviewWindow.svelte` import it.

Notes about secrets and logs

- Never log `DEV_AUTH_TOKEN` in full. Use masked logs like `console.log('DEV_AUTH_TOKEN present')` or `echo "DEV_AUTH_TOKEN=${DEV_AUTH_TOKEN:0:6}***"` where needed.

Follow-up

When you're ready I can implement the dev-only debug helpers and the tolerant parser in the client, run the curl/DevTools checks, and report the exact failing step. This will let us decide whether to proceed with the small fix (ensuring `DEV_AUTH_TOKEN` at Vite startup or fixing store wiring).

---

Acceptance: After implementing these steps, the preview content observed in server logs should appear in the frontend preview area and the `preview-discovery.md` document can be updated to reflect verified fixes.
