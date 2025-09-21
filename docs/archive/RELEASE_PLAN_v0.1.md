# Release Plan: AetherPress v0.1 (14-day timebox)

Goal

Deliver a polished, demo-ready AetherPress v0.1 that can produce an ebook PDF of public-domain summer poems where each poem has its own page with a descriptive background image.

Timebox

- Total: 14 calendar days
- Structure: Days 1–3 (stabilize), Days 4–10 (implement core gaps), Days 11–14 (polish & release prep)

Milestones & daily tasks

Days 1–3: Stabilize & Preview

- Day 1:
  - Verify dev environment: start server and client, confirm `/health` and basic endpoints.
  - Fix any immediate blocking dev issues.

Commands:

```bash
# from repo root
cd server
npm ci
npm run dev # runs server at :3000 (dev)

# in another terminal
cd client
npm ci
npm run dev # runs client at :5173
```

- Day 2:

  - Implement `GET /preview` endpoint (server) using the previewTemplate; wire frontend Preview component to it.
  - Add an integration test that requests `/preview` with sample content and verifies HTML includes title + poem text.

- Day 3:
  - Iterate on styling for readability (text over image), add fallback background logic.
  - Confirm preview integration test passes.

Days 4–7: Export (Puppeteer) & Image pipeline

- Day 4:
  - Ensure devcontainer has Chrome available (`CHROME_PATH` set to `/usr/bin/google-chrome-stable` per `.devcontainer` files).
  - Implement `GET /export` that loads the preview HTML in Puppeteer and outputs a PDF.

Commands (devcontainer or host with Chrome):

```bash
# Example: run export via curl (replace CONTENT_JSON appropriately)
curl -G --data-urlencode "content=$(cat sample_project.json)" http://localhost:3000/export --output sample.pdf
```

- Day 5–6:

  - Add image adapter: mock implementation returns stock images; adapter interface allows real provider later.
  - Implement background image assignment per poem and caching.
  - Add smoke test that calls `/export` and verifies the returned file is non-empty and page count matches poem count.

- Day 7:
  - Add fallback to pdf-lib (degraded mode) if Puppeteer unavailable; log warnings.

Days 8–10: Persistence & Overrides

- Day 8:

  - Implement `POST /override` saving edits to SQLite with simple versioning (timestamped rows).
  - Ensure preview and export read persisted state.

- Day 9–10:
  - Add tests for persistence (save + reload + export matches saved content).
  - Start preparing release notes and README updates (quick start for v0.1).

Days 11–14: Polish, CI & Release

- Day 11:

  - Run full devcontainer smoke test (start db service, start app service, run export smoke test) and fix issues.

- Day 12:

  - Final visual polish: ensure text contrast, font sizes are consistent, images are not overpowering text.

- Day 13:

  - Finalize tests, ensure CI passes (unit tests). Mark integration smoke tests as passing locally or in devcontainer.

- Day 14:
  - Merge final branch, tag `v0.1`, prepare release notes and sample PDF artifact for demos.

Acceptance criteria (release)

- A production-ready PDF export that produces an ebook where:
  - Each poem is on its own page.
  - Each page uses a descriptive background image.
  - PDF content matches preview structure (titles, poem bodies, page count).
- Integration smoke test for Prompt → Preview → Override → Export passes.
- Documentation updated with quick start and reproducible export instructions.

Quick smoke test commands (run inside devcontainer for reproducibility)

```bash
# Start services via docker-compose (from .devcontainer):
cd .devcontainer
docker-compose up -d db
# Start app container if desired or run services locally in devcontainer terminal

# Run the devcontainer postCreateCommand tasks have likely installed deps; otherwise:
cd server && npm ci && npm run dev &
cd client && npm ci && npm run dev &

# Run smoke export (example; replace sample content file path):
curl -G --data-urlencode "content=$(cat ./scripts/sample_project.json)" http://localhost:3000/export --output ./samples/export_smoke.pdf
ls -lh ./samples/export_smoke.pdf
```

Notes

- If you do not have Chrome in the environment, set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and provide `CHROME_PATH` environment variable pointing to system Chrome.
- Keep image generation mock in tests to avoid external API flakiness; enable real provider only behind config and opt-in keys.

Delivery

I can now create the issue tickets for each of the above v0.1 actionables, or start implementing the first critical item (`GET /preview`). Which do you want me to do next?
