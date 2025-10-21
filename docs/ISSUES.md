# Quick-Build Strategy to Complete Core Loop

## Purpose

This section outlines the simplified implementation strategy to complete the core loop: Prompt -> AI Processing -> Preview -> Basic Override -> PDF Export.

- Create `api.js` with retry logic
- Components
- Integration
- Basic infrastructure is stable
- Prompt handling is working
- Error handling and retry logic implemented

## Implementation Plan

### Day 1: AI Mock & Preview ✓

#### Morning: Simple AI Service

```javascript
class SimpleAIService {
  async generateContent(prompt) {
    return {
      content: {
        title: `Generated from: ${prompt}`,
        body: `This is a simple response to demonstrate the flow.
               Later we can integrate real AI here.
               For now, we're testing the core loop.`,
        layout: "default",
      },
      metadata: {
        model: "mock-1",
        tokens: prompt.split(" ").length,
      },
    };
  }
}
```

#### Afternoon: Preview System

```javascript
const previewTemplate = (content) => `
  <div class="preview">
    <h1>${content.title}</h1>
    <div class="content">${content.body}</div>
  </div>
`;

app.get("/preview", (req, res) => {
  const { content } = req.query;
  res.send(previewTemplate(JSON.parse(content)));
});
```

### Day 2: Override & Export ✓

#### Morning: Basic Override

```javascript
// Simple content update endpoint
app.post("/override", (req, res) => {
  const { content, changes } = req.body;
  const updated = { ...content, ...changes };
  res.json({ content: updated });
});
```

#### Afternoon: PDF Export

```javascript
const puppeteer = require("puppeteer");

app.get("/export", async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(previewTemplate(req.query.content));
  const pdf = await page.pdf({ format: "A4" });
  await browser.close();
  res.setHeader("Content-Type", "application/pdf");
  res.end(pdf); // Use res.end() for binary data
});
```

### Day 3: Frontend Integration ✓

#### Morning: API Layer Implementation

1. **Create API Utilities Structure**:

```javascript
// client/src/lib/api.js
const DEFAULT_CONFIG = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 10000,
  retryableStatuses: [401, 408, 429, 500, 502, 503, 504],
};

class APILogger {
  static log(endpoint, status, attempt, error = null) {
    console.log(
      `[${new Date().toISOString()}] ${endpoint} - Status: ${status}, Attempt: ${attempt}${
        error ? `, Error: ${error.message}` : ""
      }`
    );
    // Can be enhanced for Day 4 testing with more structured logging
  }
}

export const api = {
  async fetchWithRetry(endpoint, options = {}, config = DEFAULT_CONFIG) {
    let attempt = 1;
    while (attempt <= config.maxRetries) {
      try {
        const response = await fetch(endpoint, options);
        APILogger.log(endpoint, response.status, attempt);

        if (
          !response.ok &&
          config.retryableStatuses.includes(response.status)
        ) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response;
      } catch (error) {
        APILogger.log(endpoint, "ERROR", attempt, error);
        if (attempt === config.maxRetries) throw error;

        const backoff = Math.min(
          config.initialBackoffMs * Math.pow(2, attempt - 1),
          config.maxBackoffMs
        );
        await new Promise((r) => setTimeout(r, backoff));
        attempt++;
      }
    }
  },
};
```

2. **Endpoint Wrappers**:

```javascript
// client/src/lib/endpoints.js
import { api } from "./api";

export const endpoints = {
  async preview(content) {
    const response = await api.fetchWithRetry(
      `/preview?content=${encodeURIComponent(JSON.stringify(content))}`
    );
    return response.text();
  },

  async override(content, changes) {
    const response = await api.fetchWithRetry("/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, changes }),
    });
    return response.json();
  },

  async export(content) {
    const response = await api.fetchWithRetry(
      `/export?content=${encodeURIComponent(JSON.stringify(content))}`,
      { responseType: "blob" }
    );
    return response.blob();
  },
};
```

#### Afternoon: Component Integration

1. **Core Components**:

```javascript
// Preview.svelte
<script>
  import { endpoints } from '../lib/endpoints';
  import { onMount } from 'svelte';

  export let content;
  let previewHtml = '';
  let loading = false;
  let error = null;

  async function loadPreview() {
    try {
      loading = true;
      previewHtml = await endpoints.preview(content);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  onMount(loadPreview);
</script>

{#if loading}
  <div class="loading">Loading preview...</div>
{:else if error}
  <div class="error">{error}</div>
{:else}
  {@html previewHtml}
{/if}
```

2. **Implementation Checklist**:

- [x] API Layer

  - [x] Create `api.js` with retry logic
  - [x] Implement `APILogger` for status tracking
  - [x] Set up endpoint wrappers

- [x] Components

  - [x] Preview component with error boundaries
  - [x] Editor component with validation
  - [x] Export component with progress tracking

- [x] Integration
  - [x] Connect components through store/state management
  - [x] Implement loading states
  - [x] Add error recovery UX
  - [x] Test cross-component communication

3. **Testing Focus Points**:
   - API retry mechanism
   - Error boundary effectiveness
   - State consistency across components
   - Loading state transitions
   - Logger output for Day 4 analysis

### Day 4: Polish & Test

#### Morning: Core Flow Testing

- Test each step in sequence
- Verify data flow
- Check error cases

#### Afternoon: Documentation & Cleanup

- Document usage
- Clean up code
- Prepare for demo

## Quick-Build Principles

1. **Simplicity First**

   - Start with minimal implementation
   - Focus on core functionality
   - Avoid premature optimization

2. **Rapid Iteration**

   - Get basic flow working
   - Test and fix issues
   - Then enhance features

3. **Pragmatic Choices**
   - Use synchronous flows initially
   - Minimal but effective error handling
   - Focus on completion over perfection

## Success Criteria

- Complete core loop working end-to-end
- Basic error handling in place
- Simple but functional UI
- PDF export capability demonstrated

## Next Steps After Quick-Build

- Enhance AI service with real integration
- Improve preview templates
- Add advanced PDF options
- Expand error handling

Remember: The goal is a working prototype that demonstrates the full flow. We can enhance individual components after proving the concept works.

## Repository & Devcontainer Summary

- Root README: Describes project vision (AetherPress prototype), tech stack (Svelte frontend, Express/Node backend, SQLite local with planned Postgres migration), testing approach (Vitest), and the core API endpoints (POST /prompt, GET /preview, POST /override, GET /export). It documents the quick-build philosophy and the short-term actionable checklist for Day4 testing.
- Devcontainer: `.devcontainer/` contains a Dockerfile (Node.js 22 bullseye + Chrome + Postgres client), `devcontainer.json` (docker-compose integration, lifecycle hooks for installing client/server deps, forwarded ports 5173/3000/5432, and recommended VS Code extensions), and `docker-compose.yml` (services: `app` and `db` with healthchecks and a postgres volume). The devcontainer aims to provide a consistent environment for Puppeteer/Chrome and a PostgreSQL service for integration testing.
- ROADMAP (docs/ROADMAP.md): Phased plan from current milestones (Phase 0) through Phase 3; lists short-term (MVP) features, Phase 1 upgrades (AI integration, Puppeteer PDF upgrade, async processing), and longer-term UX/enterprise features.

## Why this alignment section

Developers should be able to trace any open implementation task (ISSUE) through `docs/NEXT_STEPS.md` to the `docs/MVP_CHECKLIST.md` and finally to the high-level `docs/ROADMAP.md` phase. The sections below make that mapping explicit so PRs and work plans remain consistent with project goals.

## Alignment: ISSUES -> NEXT_STEPS

This document (ISSUES) focuses on actionable implementation tasks and experiments. Each implementation task below references the corresponding `NEXT_STEPS` item (which itself is derived from the `MVP_CHECKLIST`). Use these mappings when creating branches or PRs.

- Prompt handling (ISSUE): Implement and harden `POST /prompt` (input validation, errors, response formatting) -> maps to NEXT_STEPS "Prompt Processing" -> MVP_CHECKLIST section "Prompt Processing" -> ROADMAP Phase 0 (Core Infrastructure / Base Features).
- AI service abstraction (ISSUE): Create AI interface + mock + integration tests -> maps to NEXT_STEPS "AI Processing Layer" -> MVP checklist "AI Processing Layer" -> ROADMAP Phase 1 (AI Integration planned).
- Preview generation (ISSUE): Backend `GET /preview`, templates, frontend preview component -> maps to NEXT_STEPS "Content Preview" -> MVP checklist "Content Preview" -> ROADMAP Phase 0 (Base Features) and Phase 1 (enhanced templates).
- Override system (ISSUE): `POST /override`, version tracking, frontend edit UI -> maps to NEXT_STEPS "User Override System" -> MVP checklist "User Override System" -> ROADMAP Phase 0/Phase 2 (content management improvements).
- PDF export (ISSUE): Prototype with pdf-lib; plan Puppeteer migration -> maps to NEXT_STEPS "PDF Export" -> MVP checklist "PDF Export" -> ROADMAP Phase 1 (PDF Generation Upgrade).
- Database persistence (ISSUE): Ensure SQLite flows & migrations; prepare Postgres migration -> maps to NEXT_STEPS "Data Persistence" -> MVP checklist "Data Persistence" -> ROADMAP Phase 1 (Postgres migration).

## Quick actionable adjustments

1. For every open issue that implements a NEXT_STEPS checkbox, add this sentence to the PR: "Implements NEXT_STEPS: <section> — MVP_CHECKLIST: <section> — ROADMAP: <phase>".
2. Create labels: `next_steps`, `mvp`, `roadmap-phase-0`, `roadmap-phase-1` to simplify triage.
3. Add a short `ISSUE_TEMPLATE` that requires mapping to NEXT_STEPS and MVP_CHECKLIST entries before the issue can be moved to 'in progress'.

## Next steps for automation

- I can add an `ISSUE_TEMPLATE` and a small `docs/TRACEABILITY.md` that lists each NEXT_STEPS line with a one-line mapping to the MVP and ROADMAP. Say the word and I'll implement those files and (optionally) create GitHub labels.

## Policy: Planning vs Implementation Flow

- Planning authoritative flow: ROADMAP → MVP_CHECKLIST → NEXT_STEPS → ISSUES.
- Implementation/status flow (when work is executed and checked off): ISSUES → NEXT_STEPS → MVP_CHECKLIST → ROADMAP.
- Rule: When closing an ISSUE, include in the PR body: `Closes #<issue>` and: `NEXT_STEPS: <section> — MVP_CHECKLIST: <section> — ROADMAP: <phase>`; update upstream docs if the implementation changes scope or phase.

## ISSUES (Regenerated authoritative actionables for AetherPress v0.1)

Note: This section is the canonical, timeboxed set of actionables for polishing and delivering AetherPress v0.1. Treat these items as the flashpoint for application status and use the PR traceability line when closing work: `NEXT_STEPS: <section> — MVP_CHECKLIST: <section> — ROADMAP: <phase>`.

Timebox & goal

- Goal: Ship a polished, demo-ready AetherPress v0.1 (stable preview + reliable PDF export + basic override + persistence + test coverage for core flows).
- Timebox: 2 weeks (14 calendar days) split into three milestone weeks: discovery/stabilize (days 1–3), implement core gaps & tests (days 4–10), polish, CI/devcontainer verification, and release prep (days 11–14).

Priority actionables (order matters)

1. Preview endpoint and frontend integration (Critical, 2–3 days)

   - Implement `GET /preview` in server using existing template engine or previewTemplate example.
   - Ensure frontend Preview component uses the endpoint and renders reliably for typical content.
   - Acceptance: Preview matches expected HTML output and is stable under test data; add an integration test that fetches `/preview` and validates returned HTML contains title + body.

2. PDF export via Puppeteer in devcontainer (Critical, 3–4 days)

   - Ensure devcontainer has Chrome available (CHROME_PATH) and Puppeteer configured to `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` in devcontainer.json.
   - Implement or enable `GET /export` using Puppeteer (headless) that consumes preview HTML and returns PDF; fall back to pdf-lib if Puppeteer unavailable but mark degraded mode.
   - Acceptance: Smoke export produces a valid PDF for representative content; add an automated smoke test that runs export and asserts non-empty PDF binary.

3. Override persistence and version tracking (Important, 2–3 days)

   - Implement `POST /override` to persist user edits in SQLite with simple version tracking (incremental version or timestamped entries).
   - Acceptance: Overrides are saved and retrievable; preview and export reflect persisted edits.

4. AI service adapter + mock → provider switch (Medium, 2–4 days)

   - Add a pluggable AI adapter interface; ensure a working mock implementation remains for offline dev and tests. Provide a minimal integration to one real provider only if keys available (opt-in).
   - Acceptance: System can switch between mock and real provider via config; tests use mock.

5. DB migrations + devcontainer Postgres smoke (Optional but recommended, 2–3 days)

   - Provide migration scripts and a verified path to run Postgres in devcontainer/docker-compose for integration tests; ensure schema parity with SQLite for dev.
   - Acceptance: Migrations run without errors; CI/devcontainer healthcheck passes for DB readiness.

6. Tests and CI improvements (Cross-cutting, ongoing)
   - Add integration tests for Prompt → Preview → Override → Export flow. Ensure Vitest runs these in CI where possible (or mark as 'smoke' requiring Docker/Chromium).
   - Acceptance: Unit tests green; at least one integration smoke test passes locally or in CI for core flow.

Operational rules (enforcement)

- PR traceability line is required for all PRs that change functionality: `NEXT_STEPS: <section> — MVP_CHECKLIST: <section> — ROADMAP: <phase>`.
- When closing an ISSUE, ensure the relevant NEXT_STEPS checkbox, MVP_CHECKLIST item, and ROADMAP note (if scope changed) are updated.
- Use labels: `v0.1-priority`, `next_steps`, `mvp`, `roadmap-phase-0`.

Owners & quick assignments (suggested)

- Preview & Export: backend lead + frontend lead pairing (one dev each) — pair for integration tests.
- Override persistence: backend dev with DB support from shared/utils.
- AI adapter: backend dev (can be lower priority if time-constrained).
- Tests & CI: whoever closes the export/preview tasks ensures tests and CI update.

Deliverables by day 14

- Stable Preview endpoint + frontend preview component with tests
- Reliable PDF export using Puppeteer in devcontainer (or documented degraded mode)
- Override persistence with simple versioning and tests
- Integration tests for core flow (Prompt → Preview → Override → Export)
- Updated docs: README quick-start, devcontainer notes, and traceability lines in PRs/ISSUES for finished work

If you want, I will now:

- (A) Produce `docs/TRACEABILITY.md` and an `ISSUE_TEMPLATE.md` to enforce the PR/body discipline, and add a small `docs/RELEASE_PLAN_v0.1.md` with day-by-day tasks, or
- (B) Immediately update `docs/NEXT_STEPS.md` and `docs/MVP_CHECKLIST.md` to mark v0.1 priorities and timeslices (I can do both). Which do you want first?
