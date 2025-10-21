# Devcontainer & Puppeteer Smoke Tests

This short note documents the quick checks and CI suggestion to validate the devcontainer health, database readiness, and Puppeteer-based PDF export.

What we added

- `scripts/devcontainer_smoke_health.sh` — shell script that:

  - Verifies required env vars (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
  - Calls `GET /health` (defaults to http://localhost:3000/health)
  - Attempts a `psql` connection to the `db` host
  - Prints `CHROME_PATH` and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` diagnostics

- `scripts/puppeteer_smoke_export.js` — Node smoke script that launches Chrome (via `CHROME_PATH`) using `puppeteer-core` and writes `samples/puppeteer_smoke_test.pdf`.

Run locally / in devcontainer

1. Ensure env vars exist in the container (copy `.env.example` to `.env` or export them):

```bash
cp .env.example .env
# Then either rely on your Codespace/devcontainer env injection or export locally:
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_DB=aether_dev
export CHROME_PATH=/usr/bin/google-chrome-stable
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

2. Start servers (either via the devcontainer `postAttachCommand` or manually):

```bash
# in separate terminals
cd client && npm run dev
cd server && npm run dev
```

3. Run the health checks:

```bash
./scripts/devcontainer_smoke_health.sh
```

4. Run the Puppeteer export test:

```bash
node scripts/puppeteer_smoke_export.js
# Expect: samples/puppeteer_smoke_test.pdf created
```

CI suggestion — GitHub Actions

- Add a CI job that installs a system Chromium/Chrome binary and sets `CHROME_PATH` in the job environment.
- Install node deps in the `server/` workspace (ensure `puppeteer-core` is installed). Use `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1` when installing to avoid downloading the bundled Chromium in CI.
- Run the smoke export script as a gated or optional job to avoid flakiness on every PR.

Quick example workflow is added to `.github/workflows/ci-smoke-puppeteer.yml` in the repository.

Notes

- The devcontainer and `docker-compose.yml` already set `CHROME_PATH` and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` — CI must replicate those settings.
- If Puppeteer export fails in CI, ensure the job installs a matching Chrome/Chromium binary and `CHROME_PATH` points to it (see `.github/workflows/server-tests-pr.yml` for an example pattern used elsewhere in the repo).
