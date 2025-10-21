````markdown
# Puppeteer Smoke Test Documentation

## Purpose

This smoke test verifies that Puppeteer (or system Chrome/Chromium) can be launched in the CI/dev environment.

It is intentionally light-weight: it launches a browser, opens a trivial page, and closes it.

## Running locally

```bash
cd server
npm run test:run -- puppeteer.smoke.test.js
```

## CI notes

- The CI must provide a Chrome/Chromium binary. The workflow in `.github/workflows/server-tests-pr.yml` installs `chromium-browser` on Ubuntu and sets `CHROME_PATH`.
````
