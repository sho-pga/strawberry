# E2E Notes — Stable selectors and debugging

This short note captures the immediate E2E improvements and recommended practices for stabilizing headless UI tests.

Summary

- Prefer `data-testid` attributes on UI elements used by tests. They are stable and do not change when styles or layout change.
- Use explicit waits (e.g., `page.waitForSelector`) and short retry/backoff loops around critical interactions (Preview, Preview Now, Export).
- When extracting text from generated PDFs in tests, run the canonical extractor script as a subprocess:

  node server/scripts/extract-pdf-text.js /path/to/pdf

  This avoids importing heavyweight ESM modules (or `pdf-parse`) into the test runner process which can cause side-effects in CI.

Recent changes

- `client/scripts/headless-preview-e2e.cjs` now:
  - saves `test-artifacts/preview.html` and `test-artifacts/snapshot.html` for debugging
  - prefers `data-testid` selectors and waits for `[data-testid="preview-content"]` with retries and backoff
  - logs a warning when the preview content is not found and saves a full DOM snapshot for investigation

Best practices

- Add `data-testid` to any element relied on by tests (prompt textarea, generate button, auto-preview checkbox, preview-now button, preview container).
- Prefer store-driven tests for deterministic CI coverage of UI state transitions; use browser-based E2E only for end-to-end smoke runs.
- Keep timeouts conservative in CI and add a small retry wrapper around export steps in workflows where headless browser instability is suspected.

Useful commands

```bash
# Run headless preview script and inspect artifacts
node client/scripts/headless-preview-e2e.cjs
ls -la test-artifacts

# Extract text from a produced PDF
node server/scripts/extract-pdf-text.js /path/to/export.pdf
```

If you want, I can add a small checklist automation to the CI workflow to upload `test-artifacts/` when these scripts fail.
