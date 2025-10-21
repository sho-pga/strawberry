Plan: I’ll lay out a focused, timeboxed v0.1 plan that delivers the concrete product you described (an ebook of public-domain summer poems, one poem per page with a descriptive background image) and map the work into NEXT_STEPS → MVP_CHECKLIST → ISSUES so the repo can execute it quickly.

Checklist (what I’ll cover)

    Tiny contract (inputs/outputs, success criteria)
    Concrete tasks mapped to NEXT_STEPS / MVP / ISSUES
    14-day timeline broken into short milestones
    Acceptance criteria + tests
    Devcontainer / CI notes and required labels/PR discipline
    Next concrete action I can take for you

Contract (very small)

    Inputs: list of poem texts (UTF-8), per-poem metadata (title, author), image source (AI prompt or stock URL), layout template config (font sizes, page size A4), env config (CHROME_PATH or Puppeteer cluster).
    Outputs: single PDF file (A4) where each page contains one poem and a visually-pleasing background image; also a reproducible /preview HTML endpoint and an /export PDF endpoint.
    Error modes: missing image → use fallback background; poem too long → overflow handling (scale font or split page); Puppeteer failure → degrade to pdf-lib fallback and log.
    Success criteria: produced PDF matches preview visually, one poem per page, images behind text readable, non-empty PDF binary, automated smoke test passes.

High-level tasks (mapped to repo docs)

    Preview endpoint & template (NEXT_STEPS: Content Preview; MVP: Content Preview) — Critical
        Implement GET /preview?content={json} that renders the template (fonts, background image, poem text).
        Frontend: Preview component that fetches and shows the HTML.
        Test: integration test asserting returned HTML includes title and poem body.

    PDF export with Puppeteer (NEXT_STEPS: PDF Export; MVP: PDF Export) — Critical
        Implement GET /export?projectId=... that loads preview HTML and produces PDF via Puppeteer using devcontainer Chrome.
        Add fallback path (pdf-lib) flagged as degraded mode.
        Test: smoke test that downloads PDF and asserts size > minimal threshold and page count = poems count.

    Image generation/asset pipeline (NEXT_STEPS: AI Processing Layer / Assets) — Important
        Provide AI-image adapter that consumes a short image prompt (e.g., “summer field at golden hour, watercolor”) and returns image URL or blob. Keep a mock that returns a stock sample for tests.
        Cache images and resize for PDF.

    Persisted override & versioning (NEXT_STEPS: User Override System; MVP: Override Persistence) — Important
        Save poem sets, image prompts/choices, and overrides in SQLite; record versions/timestamps.
        Ensure preview/export read from persisted state.

    Integration tests & CI (NEXT_STEPS: Testing Checklist) — Cross-cutting
        Add Vitest integration test for full flow: create sample project (3 public-domain poems), generate images (mock), call /preview, call /export, assert PDF non-empty and page count matches poems.
        Hook smoke test into CI as optional workflow requiring Docker/Chromium or run in devcontainer.

    Devcontainer verification + docs (NEXT_STEPS: Environment) — Required for reproducibility
        Confirm CHROME_PATH (existing devcontainer installs google-chrome-stable). Document any envs needed.
        Add a short runbook: "how to run the devcontainer smoke export".

Edge cases to cover

    Very long poems (font scale or page-split)
    Missing/slow image generation (timeout + fallback)
    Invalid UTF-8 or non-Latin scripts
    Export memory/timeouts for many pages (streamed PDF fallback or chunked generation in future)

Minimum test set

    Unit: template rendering for edge content (quotes, long lines)
    Integration: Prompt → preview HTML → export PDF (mock images) — assert page count and non-empty PDF
    Smoke: run export in devcontainer and confirm artifact

Operational rules & PR discipline

    Traceability PR body required: Implements NEXT_STEPS: <section> — MVP_CHECKLIST: <section> — ROADMAP: Phase 0
    Labels: v0.1-priority, mvp, next_steps, roadmap-phase-0
    Branch naming: v0.1/<task>

14-day timebox (suggested split)

    Days 1–3 (stabilize): Confirm dev run, implement GET /preview + frontend preview component + simple integration test.
    Days 4–7 (export + images): Implement Puppeteer GET /export, enable CHROME_PATH in devcontainer, add smoke export test. Add image adapter mock.
    Days 8–10 (persistence + overrides): Persist project and overrides; ensure preview/export read state; add relevant tests.
    Days 11–14 (polish + CI + docs): Run devcontainer smoke test, fix any visual issues (readability of text over backgrounds), finalize tests, and prepare release notes.

Acceptance criteria for the example product (explicit)

    Create a project containing 3 public-domain summer poems.
    Each poem occupies exactly one PDF page.
    Each page uses a descriptive background image (from AI mock or real provider).
    PDF visually matches preview (pixel-level not required; structure and content match).
    Automated integration smoke test completes successfully on your dev machine or in devcontainer.

Next concrete choices (pick one)

    ✔  Update docs/TRACEABILITY.md and generate ISSUE_TEMPLATE.md and docs/RELEASE_PLAN_v0.1.md (detailed day-by-day tasks + commands).

**********

We want to narrow selection option(s) to the fastest implementation timeline.  Having said that, pick.

FYI:  What is the status of Puppeteer versus pdf-lib?  My assumption had been that Chrome/Puppeteer is adequately installed and tested, both ready to go.

