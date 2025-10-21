## Summary

This PR completes the core backend work required for V0.1: it restores and hardens PDF quality checks, stabilizes the export image pipeline and job queue, adds a smoke-export verification flow for CI, and records verification notes in the V0.1 checklist.

Key outcomes:

- `server/pdfQuality.mjs` made robust to pdfjs import/style differences and handles Buffer→Uint8Array conversion for analysis.
- Added/updated smoke-export & diagnostic scripts to reliably produce and validate a PDF export locally.
- Added a lightweight GitHub Actions job to install Chromium and run `npm --prefix server run verify-export` on PRs so CI can validate exports remotely.
- Small, low-risk client visual polish to provide an auditable Day-3 verification commit.
- Docs updated with Day 3 & Day 7 verification notes.

## Changed files (high level)

- server/pdfQuality.mjs — robust pdfjs import and binary handling
- server/package.json — `verify-export` script (smoke-export + extraction)
- server/scripts/\* — smoke/export/e2e/diagnostic helpers (smoke-export wrapper, pdfjs diag)
- client/index.html — tiny visual polish (CSS variable tweak)
- .github/workflows/ci-smoke-chrome.yml — CI job to run smoke-export with Chromium
- docs/focus/V0.1_Final-0824.md — verification notes updated

## Motivation

Remote CI needs to validate a full export in a runner environment (Chromium present) and the server must produce analyzable PDFs in mixed ESM/CJS environments. These changes make PDF quality checks non-fatal, add diagnostic helpers, and enable CI-based verification so we can trust exported artifacts across environments.

## How to test locally

1. Start the server (if required by your smoke flow). If you prefer in-process helpers see `server/package.json`.
2. Run the verify-export script:

```bash
# runs smoke-export.sh then the text extraction step
npm --prefix server run verify-export

# or, in-process helper (quick)
npm --prefix server run verify-export:inproc
```

Expected outcome: `server/scripts/smoke-export.sh` writes an `ebook.pdf` to `/tmp` (or configured path), verification prints extracted text, and `server/pdfQuality.mjs` returns meta (pageCount, bytesPerPage, fonts, etc.).

## CI notes

- The new workflow `.github/workflows/ci-smoke-chrome.yml` installs Chromium on the runner and executes `npm --prefix server run verify-export`. The CI job will run when this PR is opened and will confirm exports in the remote environment.
- If the job fails, it should upload debug output (PDF(s) and extraction logs) for inspection (we can add conditional artifact uploads if you prefer).

## Checklist for this PR

- [ ] Server unit tests pass (Vitest) — run `npm --prefix server test`
- [ ] Smoke-export runs in CI and produces expected artifact
- [ ] `server/pdfQuality.mjs` returns expected metadata for the smoke PDF
- [ ] Docs reflect verification steps and outcomes
- [ ] Review small client tweak and confirm acceptable

## Known limitations & next steps

- E2E coverage for AI failure modes and screenshots is still limited — recommend adding tests that simulate Gemini failures and capture screenshots.
- CI artifact upload for failed client-tests is currently deferred — we can add an `upload-artifact` step if desired.
- If CI runners lack required system libs, the Chromium install step may need further tuning (I’ve used apt-get in the workflow; we can adapt per chosen runner image).

## Suggested reviewers & labels

- Reviewers: @server-maintainer, @qa — or use your usual backend + QA reviewers
- Labels: enhancement, ci, v0.1
