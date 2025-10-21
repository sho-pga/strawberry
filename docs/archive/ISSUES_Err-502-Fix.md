# ISSUES_Err-502-Fix

Summary

- Root cause: Mixed callback and Promise usage with sqlite3 caused "lastID" to be lost and produced NOT NULL constraint failures. Additionally, Vite's proxy returned opaque HTML 502 pages that hid useful backend headers (X-Backend-Error, X-Request-Id).

What I changed

- Reworked `server/db.js` and `server/crud.js` to support dual-mode (callback + Promise) and to resolve Promise-mode with the sqlite3 Statement so callers get lastID/changes.
- Added request-id middleware and centralized error handler that writes compact JSON lines to `server-logs/errors.log` and sets `X-Backend-Error` and `X-Request-Id` response headers.
- Hardened `client/vite.config.js` proxy to forward `X-Backend-Error` and `X-Request-Id`, and to return compact JSON on proxy errors instead of opaque HTML.
- Added `scripts/probe-dev-frontend.sh` to reproduce proxied requests and capture headers/body for debugging.
- Began decoupling Puppeteer exports: added `server/pdfGenerator.js`, `server/worker.js` and updated `/export` endpoint to enqueue jobs via BullMQ when available, falling back to synchronous generation.

Next steps (two-phase)

Option A — Weekend quick fix (implement immediately, low-risk)

- Narrow readiness checks so only Puppeteer-dependent routes (`/export`, `/preview`) are blocked when Puppeteer is unavailable.
- Add a dev-only `BYPASS_PUPPETEER=1` guard to skip Puppeteer startup for fast frontend development.
- Verify via `scripts/probe-dev-frontend.sh` that proxied UI requests no longer produce opaque 502 pages.

Option B — Full decoupling (implement after A is verified)

- Ensure `POST /export` always accepts requests and creates a `pdf_exports` record with status `queued` (return 202 + status URL).
- Enqueue export jobs to BullMQ (Redis) when available, and provide a DB-backed fallback queue for dev if Redis is absent.
- Harden `server/worker.js` to update `pdf_exports` status (processing/complete/failed) and store `file_path`.
- Add `GET /api/pdf_exports/:id` (status + file URL) and client UI polling or notifications.

Notes on ordering

- Option A is scheduled for the weekend as a fast unblock.
- Option B begins as soon as Option A is verified working in-dev.

Checklist

- [x] Convert DB/CRUD to promise-capable and preserve sqlite3 Statement semantics
- [x] Add request-id and centralized error header (X-Backend-Error)
- [x] Harden Vite proxy to forward backend error headers
- [x] Add probe script to reproduce proxied 502 and capture logs
- [x] Begin implementing worker/queue pattern (BullMQ) and pdfGenerator helper

How to run

- To try queued exports (requires Redis + bullmq):
  - npm install --prefix server bullmq ioredis
  - Start a Redis server locally (default redis://127.0.0.1:6379)
  - Start the worker: node server/worker.js
  - Start the server: npm run dev --prefix server
  - POST to /export with JSON { title, body } and observe 202 + statusUrl

History (what has been done so far)

- Reworked `server/db.js` and `server/crud.js` to support dual-mode (callback + Promise) and to resolve Promise-mode with the sqlite3 Statement so callers get lastID/changes. This fixed SQL constraint failures caused by lost lastID.
- Added request-id middleware and centralized error handler that writes compact JSON lines to `server-logs/errors.log` and sets `X-Backend-Error` and `X-Request-Id` response headers.
- Hardened `client/vite.config.js` proxy to forward `X-Backend-Error` and `X-Request-Id`, and to return compact JSON on proxy errors instead of opaque HTML.
- Added `scripts/probe-dev-frontend.sh` to reproduce proxied requests and capture headers/body for debugging.
- Began decoupling Puppeteer exports: added `server/pdfGenerator.js`, `server/worker.js` and updated `/export` endpoint to enqueue jobs via BullMQ when available, falling back to synchronous generation.
- Implemented #A (weekend-ready) changes: narrowed readiness middleware and added `BYPASS_PUPPETEER` dev guard (to be enabled for weekend verification).

Notes

- Worker implementation is defensive: if bullmq/ioredis aren't installed it will not run, and the server falls back to synchronous PDF generation to maintain functionality.
