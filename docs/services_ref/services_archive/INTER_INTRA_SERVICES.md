[TUE 16th Sep 2025 @ 3:00PM]

# INTER_INTRA_SERVICES

This document explains the distinction between inter-services (networked between frontend and backend) and intra-services (internal to frontend or backend), why the distinction matters, and how the current repository maps to these concepts.

## Short answer

- Inter-services = services that communicate across the network boundary (frontend ↔ backend).
- Intra-services = services/components that live and interact inside the same process/side (all frontend pieces, or all backend pieces).

Both types exist in this codebase today — the repository intentionally separates cross‑process plumbing from in‑process implementations.

## Why the distinction matters

- Responsibility & security: networked services must handle secrets and auth differently.
- Failure modes & latency: inter-service calls are slower and more brittle.
- Swapability & testing: plumbing-agnostic design allows swapping implementations with minimal changes.
- Observability & contracts: network boundaries must have explicit contracts and observability.
- Deployment & ops: inter-services have deployment concerns (CORS, proxies, envs) absent from intra-services.

## Mapping to the repo

### Inter-services (networked)

- `client/src/lib/api.js` <-> HTTP endpoints deployed in `server/index.js`:
  - `POST /prompt` — main generation entry.
  - `GET /preview` — returns rendered HTML.
  - `POST /export` — PDF export.

These are cross-process boundaries and must be treated as such.

### Intra-services (in-process)

- Backend intra-services:

  - `genieService` → `sampleService`/`aetherService` implementations (swappable internals).
  - `crud` DB helpers.
  - `imageGenerator`, `ebook` (Puppeteer) modules.

- Frontend intra-services:
  - `flows.js` orchestrates UI behaviour.
  - `genieServiceFE.js` acts as a frontend service abstraction.
  - `contentStore`, `previewStore`, `uiStateStore` are local state services.

## Is this important? Yes — here’s why

- Security: Keep secrets server-side; do not move credentialed API calls into `genieServiceFE`.
- UX resilience: Use client-side fallbacks and background persistence to hide network flakiness.
- Testability: Having a `genieServiceFE` demo implementation makes UI tests deterministic.

## Remaining coupling & recommendations

- Standardize the HTTP contract and error envelope.
- Decide whether `?dev=true` remains public or is gated.
- Keep preview and persistence contracts stable so intra-service changes don’t require front-end rewrites.

## Quick checklist

1. Document `POST /prompt` and `GET /preview` JSON shapes.
2. Add CI smoke test script exercising inter-service contracts.
3. Provide `genieServiceFE` demo + server-backed implementations and make them swappable via import/config.

---

_Recorded: TUE 16th Sep 2025 @ 10:30AM_
