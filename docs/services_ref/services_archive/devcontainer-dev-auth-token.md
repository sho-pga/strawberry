# DEV_AUTH_TOKEN in Devcontainer — why frontend didn't receive it, and how to fix

This document explains why the frontend (Vite-based client) did not receive `DEV_AUTH_TOKEN` when the repository used the helper script `/.devcontainer/start-all.sh`. It also explains why the helper script caused the devcontainer to appear to "hang" at startup, and recommended solutions.

## Problem summary

- `start-all.sh` attempted to pass `DEV_AUTH_TOKEN` to both client and server by launching the dev servers with environment variables such as:
  - `DEV_AUTH_TOKEN="$DEV_AUTH_TOKEN" npm run dev &`
- While that provides the token to the container process environment, Vite (the client dev server) does not expose arbitrary environment variables to browser code.
- Vite only exposes variables that:
  - are loaded from `.env` files at the client root, or
  - are present in the process environment at start and have the `VITE_` prefix (e.g. `VITE_DEV_AUTH_TOKEN`).
- Therefore, the frontend bundle could not see `DEV_AUTH_TOKEN` as `import.meta.env.DEV_AUTH_TOKEN` — it must be `import.meta.env.VITE_DEV_AUTH_TOKEN` or loaded from `client/.env`.

## Why the devcontainer "hung"

- `start-all.sh` backgrounds `npm run dev` for client and server, then runs:
  - `tail -f "$LOGDIR/server-dev.log" "$LOGDIR/client-dev.log"`
- `tail -f` never exits; when used in `devcontainer.json` lifecycle hooks such as `postAttachCommand`, this prevents the hook from finishing and makes the attach appear to hang.
- Additionally, the script uses `set -euo pipefail` and references `DEV_AUTH_TOKEN` directly. If `DEV_AUTH_TOKEN` was unset, `set -u` causes an early exit with an error.

## Secure design guidance

- Prefer server-side-only tokens. The browser is an insecure runtime for secrets — don't expose `DEV_AUTH_TOKEN` to production browser code.
- Best pattern: have the client call the backend, and the backend uses `DEV_AUTH_TOKEN` server-side to call third-party services and return safe results to the client.

### Emphasis — why this matters

- Browsers run on user devices and can be inspected, reverse-engineered, or compromised; any secret embedded in client code (or available via `import.meta.env`) can be exfiltrated.
- Exposing `DEV_AUTH_TOKEN` in a browser—even in development—creates accidental risk if a value is reused or leaked. Production secrets must never live in client bundles.

### Practical rule-of-thumb

- Always treat `DEV_AUTH_TOKEN` as a server-side secret. If you need a developer-only convenience token, keep it limited, rotated frequently, and only expose it via short-lived dev-only channels (e.g., Codespaces secrets mapped via `remoteEnv`) and never commit it to the repo.

### README snippet (recommended short guidance to add to top-level README)

Add the following small note to the repository `README.md` under a "Devcontainer / Secrets" or "Security" section:

```markdown
## Devcontainer / Secrets

- Developer convenience: a `DEV_AUTH_TOKEN` may be used inside development containers to allow local server-to-service calls without external credentials.
- Security rule: treat `DEV_AUTH_TOKEN` as a server-side secret. Do not expose it to the browser in production or commit it to the repo.
- Recommended: use the server-side proxy pattern — the client calls the backend API, and the backend uses `DEV_AUTH_TOKEN` from the container environment to call external services and return safe results.
```

## Practical dev-only options to make previews work

1. Server-side proxy (recommended)

   - Change the preview workflow so the client requests preview content from your server. The server reads `DEV_AUTH_TOKEN` from the container environment and performs secure calls. No token is placed in client code.

2. Expose a dev-only Vite variable (simple, explicit)

   - Use a `VITE_` prefixed variable so Vite will expose it to `import.meta.env` during dev.
   - Two ways:
     - Add to `.devcontainer/devcontainer.json` `remoteEnv`:
       ```json
       "VITE_DEV_AUTH_TOKEN": "${localEnv:DEV_AUTH_TOKEN}"
       ```
       This ensures the container process environment contains `VITE_DEV_AUTH_TOKEN` when Vite starts.
     - Or write `client/.env` in `postCreateCommand` with the value:
       ```bash
       if [ -n "${DEV_AUTH_TOKEN:-}" ]; then
         printf "VITE_DEV_AUTH_TOKEN=%s\n" "$DEV_AUTH_TOKEN" > client/.env
       fi
       ```
     - Then client access is `import.meta.env.VITE_DEV_AUTH_TOKEN`.
   - Mark the change as dev-only and add a comment and `.gitignore` protection for `client/.env`.

3. Safe helper script
   - If you want a helper that starts both servers, modify `start-all.sh` to:
     - Use `${DEV_AUTH_TOKEN:-}` to avoid `set -u` failures.
     - Export `VITE_DEV_AUTH_TOKEN` for the client command or write `client/.env` before `npm run dev`.
     - Do NOT use `tail -f` in lifecycle hooks; make tailing logs an explicit `--attach` mode for interactive runs.

## Example quick fix (recommended changes)

Option A (prefer `remoteEnv` + simple `postAttachCommand`):

- Add to `devcontainer.json` remoteEnv:
  - `"VITE_DEV_AUTH_TOKEN": "${localEnv:DEV_AUTH_TOKEN}"`
- Use this `postAttachCommand`:
  ```json
  "postAttachCommand": {
    "client + server": "concurrently 'cd ./client && npm run dev' 'cd ./server && npm run dev'"
  }
  ```

Option B (explicit client `.env`):

- In `postCreateCommand` generate `client/.env` from `DEV_AUTH_TOKEN`.

Option C (non-blocking helper script):

- Update `start-all.sh` to set `VITE_DEV_AUTH_TOKEN` for the client, then background both processes and exit.

## Security notes

- Only use `VITE_*` variables for local development testing; never commit real secrets to the repo.
- Use `.env.example` without secrets to document the variables needed.

## Troubleshooting checklist

- If preview still fails, ensure:
  - The client dev server was started after `VITE_DEV_AUTH_TOKEN` was present in the environment (restart Vite if needed).
  - `import.meta.env.VITE_DEV_AUTH_TOKEN` is referenced correctly in the client.
  - `client/.env` exists and is readable by the dev server.
  - There are no conflicting environment variable loaders in Vite config that strip `VITE_` variables.

---

Document created by the development assistant; review before applying changes to CI or production.
