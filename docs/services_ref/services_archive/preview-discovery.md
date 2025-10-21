# Preview Discovery — Find why frontend preview isn't updated

Purpose: discover the root cause preventing the preview area from being updated by backend-generated content. Record all findings and make each discovery checkable. This document is for discovery only — it records evidence and next actions.

Status: discovery started.

## Checklist (actions to perform)

- [ ] Confirm the client sends preview requests (network request in DevTools).
- [ ] Confirm the dev server proxy injects `x-dev-auth` when `DEV_AUTH_TOKEN` present.
- [ ] Confirm the server receives the preview request and does not return 401 (check server logs and request headers).
- [ ] Confirm `/preview` and `/api/preview` endpoints return expected HTML/JSON given the content payload.
- [ ] Confirm the client `loadPreview` receives HTML and sets `previewStore`.
- [ ] Confirm the client `PreviewWindow` component renders `previewStore` content into `[data-testid='preview-content']`.
- [ ] Check for CORS, network, or JS errors preventing rendering.
- [ ] Validate that `DEV_AUTH_TOKEN` is present where expected (Vite dev server process or server process) during dev.
- [ ] Confirm whether the client is calling external services directly (it should not) or proxying via server.

## Findings (evidence collected so far)

- Server dev-only auth middleware (server/index.js):

  - If `process.env.DEV_AUTH_TOKEN` is set and `NODE_ENV === 'development'`, server middleware enforces the token via either:
    - `x-dev-auth` or `x-dev-token` request header, or
    - `dev_token` query param.
  - If missing/incorrect, server returns 401 with JSON `{ error: 'Unauthorized - dev token required' }`.

- Client dev proxy (client/vite.config.js):

  - `createProxy` reads `DEV_AUTH_TOKEN` from Vite's loaded env or `process.env.DEV_AUTH_TOKEN`.
  - If present, proxy sets header `x-dev-auth: <DEV_AUTH_TOKEN>` on proxied requests to `http://localhost:3000` for paths `/prompt`, `/preview`, `/api`, `/override`, `/export`.
  - Vite's `loadEnv(mode, process.cwd(), "")` call loads environment variables; note this will read `client/.env`, `.env`, `.env.development`, and process envs depending on mode and precedence.

- Client code behavior (client/src/lib/api.js):

  - `loadPreview` prefers:
    - For content with `resultId`/`promptId`, attempt `/preview?resultId=` or `/preview?promptId=`.
    - For small payloads, it uses GET `/preview?content=<encoded>`.
    - For large payloads, it POSTs `/api/preview`.
  - The client depends on proxying (relative URLs) so the dev server proxy must forward `x-dev-auth` header.

- Server preview route (server/index.js `/preview` and `/api/preview`):

  - `/api/preview` accepts JSON body with `content` and returns `{ preview: previewTemplate(content) }`.
  - `/preview` (GET with `content` query) returns HTML `previewTemplate(content)`.

- There are abundant server logs showing GET `/preview?content=...` requests in `server/server.log` — indicating the client or tests are requesting preview.

- Client PreviewWindow (client/src/components/PreviewWindow.svelte):

  - Calls `previewFromContent` which uses `loadPreview` and sets `previewStore` with returned HTML.
  - Reactive template writes `{@html $previewStore}` into `[data-testid='preview-content']` when `previewStore` is non-empty.
  - There is an explicit fallback to `buildLocalPreviewHtml(content)` when server preview fails.

- Vite config comment indicates `// Load .env files so DEV_AUTH_TOKEN is available to the dev server proxy` and the implementation uses a plain `DEV_AUTH_TOKEN` env name (not `VITE_`) because the token is only needed by the dev proxy (server-side), not the browser bundle.

## Initial conclusions

- The architecture already follows a server-proxy pattern: the client uses Vite proxy to call local server endpoints and the proxy injects `x-dev-auth` when `DEV_AUTH_TOKEN` is present in Vite's environment.
- The server enforces the token in development when present. Therefore the overall design already avoids embedding secrets in the browser bundle and uses a dev-only proxy header instead.
- The two main failure classes remain:
  1. The dev proxy isn't being started with `DEV_AUTH_TOKEN` present (so no header injected). This could happen if `DEV_AUTH_TOKEN` isn't present in the Vite process environment at the time Vite starts. The original `start-all.sh` tried to set `DEV_AUTH_TOKEN` but that alone doesn't ensure Vite picks it up unless Vite process inherits it (it does if exported) OR client/.env contains it and Vite's loadEnv reads it.
  2. The server rejects the request (401) because it doesn't see `x-dev-auth`, or other server-side errors occur when generating the preview.

## Immediate next discovery actions (to run now)

- [ ] Confirm whether the running Vite dev server process has `DEV_AUTH_TOKEN` in its environment. (Check process env or the `client-dev.log` captured by start scripts or run a debug fetch header test.)
- [ ] Confirm a sample proxied request carries `x-dev-auth` by using the browser DevTools network tab or by invoking the Vite dev proxy with `curl` to the dev server and inspecting forwarded headers (or check server logs for `x-dev-auth` exposure).
- [ ] Call `/preview` directly with `curl` to the server (bypass Vite proxy) including `x-dev-auth: <token>` and without it to confirm server behavior.
- [ ] Check server logs around denied requests for evidence of 401s or other errors.

## Recorded actions taken in this discovery pass

- Scanned `server/index.js`, `client/vite.config.js`, `client/src/lib/api.js`, `client/src/components/PreviewWindow.svelte` and related client helper modules.
- Identified that the intended mechanism is: Vite proxy injects `x-dev-auth` -> server validates `DEV_AUTH_TOKEN` on dev-only middleware -> preview endpoints return HTML -> client updates `previewStore` -> PreviewWindow renders HTML.

---

I'll now perform the first live check: attempt a direct `curl` to the server `/preview?content=...` without `x-dev-auth` and with a header to observe the response. This will test server-side enforcement and preview output. I'll document results below.
\n## Live checks performed (results)
\n- Direct `curl` to `http://localhost:3000/preview?content=...` returned `HTTP/1.1 200 OK` when called without `x-dev-auth` header from the current shell.\n- The shell has `DEV_AUTH_TOKEN` set (`${DEV_AUTH_TOKEN}`) but `NODE_ENV` in shell is empty. The server-side dev-auth middleware only activates if `NODE_ENV === "development"` and `DEV_AUTH_TOKEN` is set.\n- A request with `x-dev-auth: <token>` also returned `200 OK`.\n\nConclusion: In this running environment the preview endpoints accept requests without the dev auth token (either because the middleware is disabled or token-check is not enforced), and the preview endpoints generated HTML successfully for a simple test payload.\nDOC

## Decision: Option B (Keep dev-auth, low-friction)

We will keep the `x-dev-auth` dev-token mechanism but implement it in a low-friction, well-documented way that can be completed in under an hour. The goal is to preserve the safety benefit for shared/devcloud workspaces while avoiding intermittent 401s for developers.

Quick implementation plan (checkable)

- [ ] Ensure middleware remains opt-in (already guarded by `process.env.DEV_AUTH_TOKEN` and `NODE_ENV === 'development'`).
- [ ] Make `DEV_AUTH_TOKEN` reliably available to the Vite dev server process at startup by adding one of the following (choose one and apply):
  - [x] **Preferred for Codespaces:** add `remoteEnv` mapping in `.devcontainer/devcontainer.json`.
    - Snippet to add under `customizations.vscode` or top-level `remoteEnv` section:
      ```json
      "remoteEnv": {
        "DEV_AUTH_TOKEN": "${localEnv:DEV_AUTH_TOKEN}"
      }
      ```
  - [ ] **Alternate:** write `client/.env` in `postCreateCommand` so Vite `loadEnv` will pick it up:
    ```bash
    if [ -n "${DEV_AUTH_TOKEN:-}" ]; then
      mkdir -p client
      printf "DEV_AUTH_TOKEN=%s\n" "$DEV_AUTH_TOKEN" > client/.env
      chmod 600 client/.env
    fi
    ```
- [ ] Restore the simple `postAttachCommand` concurrently line in `.devcontainer/devcontainer.json` so devs use the standard `concurrently 'cd ./client && npm run dev' 'cd ./server && npm run dev'` start, avoiding helper scripts that set envs after Vite starts.
- [ ] Add a short doc snippet in `docs/services_ref` explaining the purpose and how to set `DEV_AUTH_TOKEN` for shared hosts.
- [ ] Add a lightweight CI smoke test (existing `scripts/ci-smoke-test.sh`) that includes `x-dev-auth` when `DEV_AUTH_TOKEN` is present.

Quick validation steps (after applying)

- [ ] Start devcontainer or Vite server and confirm Vite logs or `client-dev.log` show `DEV_AUTH_TOKEN` as present in the process environment (do not log the raw token; a masked echo is fine).
- [ ] Use browser DevTools or a sample `curl` via the Vite dev server to confirm `x-dev-auth` is forwarded and server accepts requests.
- [ ] Verify preview updates via UI and that no intermittent 401s occur.

If for any reason this cannot be implemented in under an hour, we will fall back to Option A (remove dev-auth) to avoid blocking developer productivity.
