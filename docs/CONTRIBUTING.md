# CONTRIBUTING

## Test timeout policy

This repository is organised as multiple packages (for example: `server`, `client`, `shared`). Each package runs tests from its own package root and therefore maintains its own Vitest configuration. To keep tests stable and avoid sprinkling per-test timeouts across the codebase, we follow this policy:

- Set a package-level `testTimeout` in the package's `vitest.config.*` (server/client/shared) when tests in that package require longer-running operations (e.g., Puppeteer-driven PDF exports).
- Use a reasonable default per-package (e.g., `20000` ms for `server`, `10000` ms for `client`/`shared`).
- Keep per-test timeouts only for exceptional cases (e.g., end-to-end jobs that intentionally take much longer). When used, annotate the test with a short comment explaining why the longer timeout is required.

## Where to look

- Server package config: `server/vitest.config.js`
- Client package config: `client/vitest.config.js`
- Shared package config: `shared/vitest.config.ts`

If you are adding or changing tests and you encounter timeouts, check the package config before adding per-test timeout overrides. When in doubt, prefer a package-level `testTimeout` and document the reason in the test comment.

## Small contribution workflow

1. Create a small branch for the change.
2. Run the package tests locally (e.g., `npm --prefix server run test:run`).
3. Commit configuration or test updates with clear messages.
4. Open a PR and include the test run results (or CI link) in the description.

Thanks for keeping our test suite reliable and concise.

## Reproducing CI checks locally

To reproduce the CI checks that run in GitHub Actions, use the package test commands below. These are run from the repository root.

Install dependencies (either a root install or per-package):

```bash
npm install
# or per-package
npm --prefix server ci
npm --prefix client ci
npm --prefix shared ci
```

Run the package test suites:

```bash
# Server (Node + Puppeteer tests)
npm --prefix server run test:run

# Client (Svelte + jsdom tests)
npm --prefix client run test

# Shared (Vitest)
npm --prefix shared run test:vitest
```

Environment notes to match CI:

- Chrome / Puppeteer: CI runners include Chrome/Chromium. Locally, install Chrome or point Puppeteer at an existing binary:

```bash
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export CHROME_PATH=/usr/bin/google-chrome-stable  # adjust to your path
```

- Secrets: workflow steps that depend on repository secrets will not run equivalently if those secrets are missing locally or for forked PRs. Set equivalent env vars locally for testing (do not commit secrets):

```bash
export SOME_API_KEY=sk_live_...
```

- Timeouts: package-level `testTimeout` values live in each package's `vitest.config.*`. If you hit local timeouts, ensure `testTimeout` is set or increase per-test timeout as a last resort.

Optional smoke/export checks:

```bash
# Generate a PDF artifact with the headless smoke-export script
bash server/scripts/smoke-export.sh

# Extract page count / text from a generated PDF
node server/scripts/extract-pdf-text.js /tmp/your-ebook.pdf
```

If you need help reproducing a CI failure locally, include the Actions run URL and I can help interpret the logs.
