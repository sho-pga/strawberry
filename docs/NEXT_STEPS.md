# NEXT STEPS

## Feature Checklist (from MVP Checklist)

### 1. Prompt Processing

#### Backend

- [x] POST /prompt endpoint
- [x] Input validation
- [x] Error handling
- [x] Response formatting

#### Frontend

- [x] Prompt input form
- [x] Submit handling
- [x] Loading states
- [x] Error display

### 2. AI Processing Layer

#### Service Abstraction

- [ ] AI service interface
- [ ] Mock implementation
- [ ] Error handling
- [ ] Response formatting

#### Content Generation

- [ ] Text generation flow
- [ ] Content structuring
- [ ] Response validation
- [ ] Quality checks

### 3. Content Preview

#### Backend

- [ ] GET /preview endpoint
- [ ] HTML generation
- [ ] Template system
- [ ] Content formatting

#### Frontend

- [ ] Preview component
- [ ] Real-time updates
- [ ] Style handling
- [ ] Responsive design

### 4. User Override System

#### Backend

- [ ] POST /override endpoint
- [ ] Content validation
- [ ] Update handling
- [ ] Version tracking

#### Frontend

- [ ] Edit interface
- [ ] Content validation
- [ ] Save/update flow
- [ ] Undo/redo

### 5. PDF Export

#### Backend

- [ ] GET /export endpoint
- [ ] pdf-lib setup (prototype)
- [ ] Puppeteer setup (planned)
- [ ] Content formatting
- [ ] File handling

#### Frontend

- [ ] Export trigger
- [ ] Download handling
- [ ] Progress indication
- [ ] Error handling

### 6. Data Persistence

#### Database

- [ ] Table structure
- [ ] Indexes
- [ ] Relationships
- [ ] Query optimization

#### Operations

- [ ] Create operations
- [ ] Read operations
- [ ] Update operations
- [ ] Delete operations

## Testing Checklist

### Unit Tests

- [ ] Backend services
- [ ] Frontend components
- [ ] Database operations
- [ ] Utility functions

### Integration Tests

- [ ] API endpoints
- [ ] Frontend-backend integration
- [ ] Database interactions
- [ ] PDF generation

### User Flow Tests

- [ ] Prompt submission
- [ ] Preview generation
- [ ] Content editing
- [ ] PDF export

## Documentation Requirements

### API Documentation

- [ ] Endpoint specifications
- [ ] Request/response formats
- [ ] Error codes
- [ ] Usage examples

### Setup Guide

- [ ] Installation steps
- [ ] Configuration guide
- [ ] Environment setup
- [ ] Running instructions

## Deployment Checklist

### Environment

- [ ] Development setup
- [ ] Testing setup
- [ ] Production configuration
- [ ] Environment variables

### Performance

- [ ] Load testing
- [ ] Resource optimization
- [ ] Error monitoring
- [ ] Logging setup

## Alignment and Traceability

Use this section when creating or closing implementation work so each item can be traced to the MVP and the ROADMAP.

- Mapping rule: ISSUE -> NEXT_STEPS checkbox -> MVP_CHECKLIST section -> ROADMAP phase.
- Example: "Implement GET /preview" -> NEXT_STEPS: Content Preview (Backend) -> MVP_CHECKLIST: Content Preview -> ROADMAP: Phase 0 (Current Milestones) / Phase 1 for enhancements.

Practical steps:

1. When opening a PR, add the line: `Implements NEXT_STEPS: <section> — MVP_CHECKLIST: <section> — ROADMAP: <phase>`.
2. Add labels: `next_steps`, `mvp`, `roadmap-phase-0|1|2` to PRs for triage.
3. Prioritize unchecked NEXT_STEPS items for the next sprint; label as `sprint:next` if chosen.

## Policy: Planning vs Implementation Flow

- Planning authoritative flow: ROADMAP → MVP_CHECKLIST → NEXT_STEPS → ISSUES.
- Implementation/status flow (when work is executed and checked off): ISSUES → NEXT_STEPS → MVP_CHECKLIST → ROADMAP.
- Rule: NEXT_STEPS checkboxes are the actionable slices of MVP items; when an ISSUE is closed, update the relevant NEXT_STEPS checkbox and add a traceability line in the PR.

## v0.1 Priority Plan (14-day timebox)

Goal: Complete the core, polished AetherPress v0.1 features (stable preview, reliable PDF export, basic override persistence, integration tests, and devcontainer verification).

Timeline summary (14 calendar days)

- Days 1–3: Discovery & stabilize — fix blocking bugs, confirm dev run, add minimal tests for health endpoints.
- Days 4–10: Implement core gaps — preview, export (Puppeteer), override persistence, AI adapter scaffold, and tests.
- Days 11–14: Polish, CI/devcontainer verification, smoke tests, documentation, and release prep.

v0.1 actionable slices (map to NEXT_STEPS checkboxes)

1. Preview Backend + Frontend (Days 1–3)
   - NEXT_STEPS: Content Preview — Backend: GET /preview endpoint; Frontend: Preview component.
   - Acceptance: Integration test fetches `/preview` and validates title/body present.
2. PDF Export with Puppeteer (Days 3–6)
   - NEXT_STEPS: PDF Export — Backend: GET /export endpoint using Puppeteer (headless); Frontend: Export trigger.
   - Acceptance: Smoke test produces a non-empty PDF binary for representative content.
3. Override Persistence & Versioning (Days 5–8)
   - NEXT_STEPS: User Override System — Backend: POST /override saves edits and versions; Frontend: Save/update flow.
   - Acceptance: Edits persist and are reflected in preview/export on reload.
4. AI Adapter + Mock (Days 6–10)
   - NEXT_STEPS: AI Processing Layer — Service Abstraction + Mock implementation; provider switch via config.
   - Acceptance: Tests use mock; adapter allows opt-in real provider.
5. DB migrations & Devcontainer Postgres (Days 8–12, optional)
   - NEXT_STEPS: Data Persistence — Table structure and migration scripts; ensure devcontainer can run Postgres for integration tests.
   - Acceptance: Migrations succeed; devcontainer healthcheck passes.
6. Tests & CI (ongoing, finalize Days 10–14)
   - NEXT_STEPS: Testing Checklist — Integration tests covering Prompt → Preview → Override → Export.
   - Acceptance: Unit tests green; at least one core flow smoke test passes locally or in CI.

Operational notes

- PR traceability line required on close: `Implements NEXT_STEPS: <section> — MVP_CHECKLIST: <section> — ROADMAP: Phase 0`.
- Suggested labels: `v0.1-priority`, `next_steps`, `mvp`, `roadmap-phase-0`.
- Use short-lived branches named `v0.1/<task-name>` and attach the integration smoke test as part of the PR for Preview and Export tasks.

Quick checklist for first 3 days

- Run and verify dev server and client; fix any blocking dev issues.
- Implement GET /preview and the Preview component; add one integration test.
- Confirm CHROME_PATH and Puppeteer environment inside devcontainer (or document fallback) so export work can proceed.
