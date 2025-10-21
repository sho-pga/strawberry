# Traceability and Mapping (MVP → NEXT_STEPS → ISSUES)

Purpose

This document makes the required mapping and PR discipline explicit so work is traceable from high-level planning through implementation and release.

Canonical flow

- Planning: ROADMAP → MVP_CHECKLIST → NEXT_STEPS → ISSUES

  - ROADMAP defines phases and high-level goals.
  - MVP_CHECKLIST converts roadmap goals into near-term deliverables.
  - NEXT_STEPS slices MVP items into actionable engineering tasks.
  - ISSUES are the concrete work items that implement NEXT_STEPS.

- Implementation/status (how items become Done): ISSUES → NEXT_STEPS → MVP_CHECKLIST → ROADMAP
  - When an ISSUE is implemented and merged, update the NEXT_STEPS checkbox and the MVP_CHECKLIST entry; if scope or phase changes, update ROADMAP with a brief note linking the PR.

Required PR discipline

Every PR that implements functional work MUST include a single-line traceability entry in the PR body, for example:

Implements NEXT_STEPS: Content Preview (Backend) — MVP_CHECKLIST: Content Preview — ROADMAP: Phase 0

When closing an ISSUE, the PR must also include `Closes #<issue>` so automation links the records.

Labels and branch naming

- Suggested labels:

  - `v0.1-priority` (highest priority for the current release)
  - `next_steps` (work mapped to NEXT_STEPS)
  - `mvp` (MVP-level scope)
  - `roadmap-phase-0` (phase label)

- Branch naming convention: `v0.1/<short-task-name>` (e.g., `v0.1/preview-endpoint`).

Practical checklist for closing work

1. Implement code in a `v0.1/*` branch.
2. Create tests (unit + integration / smoke) that demonstrate the change works for the core flow.
3. Open PR and include the traceability line and `Closes #<issue>`.
4. After merge, update `docs/NEXT_STEPS.md` checkbox and `docs/MVP_CHECKLIST.md` section; if scope changed, add a short note in `docs/ROADMAP.md` with the PR link.

Example

- ISSUE: "Add GET /preview endpoint"
- NEXT_STEPS mapping: `Content Preview — Backend: GET /preview endpoint`
- MVP mapping: `Content Preview`
- ROADMAP phase: `Phase 0`
- PR body: `Implements NEXT_STEPS: Content Preview (Backend) — MVP_CHECKLIST: Content Preview — ROADMAP: Phase 0` + `Closes #123`

Notes

- Keep traceability lines exact and machine-parseable (use the template above).
- Use this document as the single source of truth for how work maps across planning layers.
