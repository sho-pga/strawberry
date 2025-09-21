```markdown
# Devolve step 02 — No background workers

Objective

- Remove or gate the background job worker subsystem so the app runs synchronously in-process. This makes the app easier to reason about during manual testing and isolates worker-related failures.

Why

- Background workers (separate processes, worker pools, or message queues) add complexity and can fail silently or deadlock during local dev and demos. Running jobs inline or skipping them makes the minimal flow more reliable.

Flags and behaviour

- `WORKER_INLINE=1` — Do not spawn external worker processes. Instead, execute job handlers inline in the request handler.
- `SKIP_WORKERS=1` — Shortcut that disables job scheduling entirely (useful for read-only demos).

Branch name

- `aether-dev-devolve-02-no-workers` — branch off the previous devolved branch (e.g. `aether-dev-devolve-01-no-puppeteer`).

Recommended changes (high level)

1. In `server/index.js` (or the app's worker bootstrap): wrap worker startup in a feature-flag check and early-return when `WORKER_INLINE` or `SKIP_WORKERS` is set.
2. Provide a small inline job wrapper (for example `jobs.runInline(jobSpec)`) used by the request handlers when `WORKER_INLINE=1`.
3. Add a smoke script `scripts/smoke-devolve-02.sh` that runs the server in `WORKER_INLINE` mode and verifies `POST /prompt` updates `samples/latest_prompt.txt`.
4. Keep the changes minimal — avoid refactors, focus on gating worker process creation and switching the invocation path.

Verification checklist

- Create and push `aether-dev-devolve-02-no-workers` branch.
- Start server locally in dev container: `PORT=3000 WORKER_INLINE=1 node server/index.js` (or rely on existing devcontainer runtime).
- POST a test prompt: `curl -X POST 'http://localhost:3000/prompt?min_flow=1' -H 'Content-Type: application/json' -d '{"prompt":"smoke 02"}'`
- Confirm `samples/latest_prompt.txt` updated and server returns 200/201.
- Run `scripts/smoke-devolve-02.sh` — it should exit 0.

Developer notes & risks

- Inline jobs may make request latency much higher — only use this in dev/demo branches.
- If the app relies on worker-level isolation (sandboxing, separate process memory), inline execution could expose issues. Keep the change gated and branch-scoped.

Next-actions (patch template and smoke script)

- See `docs/devolvement/patches/02-no-workers.md` for a concrete patch template.
- See `scripts/smoke-devolve-02.sh` and `docs/devolvement/templates/smoke-devolve-02.sh` for smoke-run templates.
```
