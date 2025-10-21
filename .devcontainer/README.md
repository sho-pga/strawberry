# Devcontainer: AetherPress v0.1

This document describes the purpose and configuration of the `.devcontainer/` folder and summarizes two important project documents (`PUPPETEER_Findings.md` and `PATH_V0.1.md`) with implementation estimates.

1. Summary

- Purpose: provide a reproducible development environment with system Chrome available for Puppeteer, a Postgres dev service, and front-end + back-end launch conveniences.
- Key pieces:
  - `devcontainer.json` — docker-compose integration, port forwards (5173, 3000, 5432), install commands, `CHROME_PATH` and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` for containerized Chrome usage.
  - `Dockerfile` — Docker image that installs Google Chrome stable and required libraries for Puppeteer.
  - `docker-compose.yml` — defines `app` and `db` services, healthchecks, and a persistent named volume for Postgres data.

2. How to use

- Open the repository in Codespaces or VS Code Remote - Containers. The devcontainer will build and forward the Vite and Express ports.
- The container installs dependencies for the `client` and `server` during creation and attaches a `concurrently` command to start both dev servers when attaching.

3. Independent assessment: PUPPETEER_Findings (summary + completion estimates)

- Current recommended approach in the findings: treat Puppeteer as a core service (early initialization) with health checks and graceful shutdown. This repo already implements a robust `startPuppeteer()` with retry, health-checks, and a disconnect handler.

- Options and estimates (effort to implement a demo-ready variant):
  - Late initialization (on-demand): low work to accept for a quick demo (0–0.5 day). Expect a first-request cold-start delay.
  - Early initialization (core service, recommended): demo-ready implementation: 1–2 days (singleton service, healthcheck integration, graceful shutdown, and basic monitoring). Production-hardening: +1–2 days.
  - Dedicated Puppeteer container/service: prototype: ~1 day; production-ready multi-service orchestration: 2–3 days.

4. Independent assessment: PATH_V0.1 (soundness, gaps, revised estimate)

- PATH_V0.1 is well scoped and maps directly to the demo goal (JSON → HTML templates → preview → Puppeteer PDF). Timeline in the doc (5–8 days) is reasonable for a polished v0.1, but the estimate assumes assets and fonts are available and Puppeteer init is stable.
- Gaps & risks:

  - Missing canonical sample data and high-resolution background assets.
  - Print CSS, embedded fonts, and A4 margins are not fully specified.
  - Image sizing/DPI and bleed/margins for print are unspecified.
  - PDF rendering smoke tests and CI checks are not present.

- Revised completion estimate to reach the demo goal (confident demo): 3–5 days if assets/fonts/samples are prepared; 4–6 days if those need to be created and Puppeteer early-init + smoke tests are implemented.

5. Minimal prioritized next steps (implemented here as starter artifacts)

- Add canonical sample poem dataset and small public-domain decorative backgrounds.
- Add a small HTML generator for multi-poem A4 eBooks.
- Add a smoke test that exercises export and checks for a valid PDF.

6. Worker & Gemini notes (how to run locally)

- The repository includes a lightweight SQLite-backed worker (`server/worker-sqlite.mjs`) that polls the `JOBS_DB` and claims jobs. To run the worker locally inside the devcontainer:

```bash
# from repo root (devcontainer shell)
JOBS_DB=/workspaces/strawberry/data/jobs.db node server/worker-sqlite.mjs
```

- For deterministic local testing of the AI/image generation flow, set `USE_REAL_AI=false` and ensure any Gemini/Cloudflare credentials are not required. When you want to run real Gemini calls, provide the environment variables described in `server/imageGenerator.js` (e.g., `GEMINI_API_KEY`, `GEMINI_API_URL`) and set `USE_REAL_AI=true`.

- If you run the worker inside the devcontainer, the container has Google Chrome available at `/usr/bin/google-chrome-stable` and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` is set during devcontainer build to avoid unnecessary downloads.

---

Created to help new contributors quickly understand the devcontainer and to accelerate the demo workflow.
