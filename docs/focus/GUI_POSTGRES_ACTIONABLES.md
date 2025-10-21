# GUI PostgreSQL Actionables — Traceable Checklist

Purpose

- Provide a single source-of-truth for the immediate work required to deliver a fully functional GUI (as-is app) using PostgreSQL.
- Each actionable is checkable, references the authoritative documentation or source file that motivates it, and includes exact commands or code locations where applicable.

Format

- Each item contains: Title, Why (source doc/file), Exact change or command, Time estimate, Status checkbox, and Traceability notes.

---

1. Create `GET /content/result/:id` and `GET /content/prompt/:id`

- Why: `docs/focus/GUI_POSTGRES_2HR_SPRINT.md` and `README.md` indicate preview requires JSON content; query-string JSON is brittle. Helper endpoints simplify client logic.
- Where: `server/index.js` (near existing `/preview` and CRUD endpoints) and reference `server/crud.js` for DB access.
- Change: Implement two endpoints that return `{ content }` where `content` is an object with `title` and `body`.
- Command (test):
  - `curl http://localhost:3000/content/result/35` => `{ "content": { "title": "...", "body": "..." } }`
- Time: 15–30 minutes
- Status: [ ]
- Trace: README endpoints; `server/crud.js`: `getAIResultById`, `getPrompts`.

2. Client integration to use resultId-based preview

- Why: Cleaner UX; avoid double-encoding JSON in query strings. Matches README API loop (Prompt -> Preview -> Export).
- Where: `client/src` components handling prompt submission and preview display (search for `preview` or `prompt` handlers).
- Change: When the client receives `resultId`, call `/preview?resultId=<id>` or `/content/result/<id>` then POST to `/api/preview`.
- Commands (dev test):
  - Submit prompt from client UI, confirm preview appears and export works.
- Time: 15–30 minutes
- Status: [ ]
- Trace: README API endpoints; `docs/focus/GUI_POSTGRES_2HR_SPRINT.md` (Quick loop).

3. Maintain backward compatibility for `/preview`

- Why: Many scripts and tests call `GET /preview?content=...` (see `server/scripts/e2e-smoke.js` and tests). Keep this behavior intact.
- Where: `server/index.js` `/preview` handler.
- Change: Ensure new endpoints do not break existing `content` param behavior.
- Time: 5–10 minutes
- Status: [ ]
- Trace: `server/scripts/e2e-smoke.js`, `server/__tests__/*`.

4. Add minimal UX improvements: loading & error states

- Why: Improve feedback when Puppeteer or DB is unavailable. Matches Implementation Plan priorities.
- Where: `client/src/components/` (PreviewWindow, StatusDisplay)
- Change: Add spinner while fetching preview/export; show error panel with full server error JSON when requests fail.
- Time: 30–60 minutes
- Status: [ ]
- Trace: Implementation plan & README (UX expectations).

5. Add a small integration test and run smoke checks

- Why: Provide regression safety and confirm the minimal loop works.
- Where: `server/__tests__/` or a new `server/__tests__/e2e.quick.test.js`.
- Test: POST /prompt -> GET /preview?resultId -> POST /api/export and assert PDF binary and 200
- Commands:
  - `npm --prefix server test`
  - `node server/scripts/run_export_test_inproc.js`
- Time: 30–60 minutes
- Status: [ ]
- Trace: README (How to verify V0.1), existing tests.

6. Document changes and update `docs/focus/` files

- Why: Follow Development Philosophy (document agreements & decisions).
- Where: `docs/focus/GUI_POSTGRES_ACTIONABLES.md` (this file), append change summary and links to commits.
- Change: After each commit, add a one-line note: `YYYY-MM-DD: Implemented X — commit <sha>`
- Time: 5–10 minutes per change
- Status: [ ]

---

Dev Minimal Mode (developer helper)

- Purpose: A temporary, developer-only mode to make local debugging and
  the prompt→preview→export loop deterministic when Puppeteer, rate-limiting
  or other infra causes intermittent failures.
- How to enable: set environment variable `DEV_MINIMAL=true` before starting
  the server (or add it to `.env` during local debugging).
- What it disables/relaxes (code locations):
  - Skips applying the global rate-limiting middleware (see `server/index.js` near rateLimit registration).
  - Relaxes Puppeteer readiness gating in request startup middleware so requests are not blocked when the headless browser is absent or restarting (see `server/index.js` startup readiness middleware).
  - Does NOT automatically start an alternate browser; it only prevents the server from returning 503 for readiness while debugging.
- Safety / re-enable: Remove `DEV_MINIMAL` or set it to false before running in CI or production. Re-enabling simply requires unsetting the env var and restarting the server.
- Trace: `server/index.js` (top-of-file flag `DEV_MINIMAL` and conditional branches), this file in `docs/focus/` (dev_notes).

Recommendation: Use `DEV_MINIMAL` for local debugging sessions only. After a successful fix and tests, remove the reliance on it and re-enable normal checks and rate limiting.

---

How I will proceed if you say "proceed":

1. Implement item (1) (`GET /content/*` endpoints) and test locally. (I'll mark it complete.)
2. Implement client integration (item 2) or provide a minimal patch if you prefer the client change to be manual.
3. Implement UX polish and tests in order, marking each as completed in this document and committing changes.

If you want me to start, say "implement content endpoints now" and I'll begin with step (1) and mark it in-progress in the todo list.
