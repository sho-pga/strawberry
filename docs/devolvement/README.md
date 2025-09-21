# Devolvement Plan

This folder documents the controlled devolution strategy used to simplify the `aether-dev` application into progressively-minimal, runnable branches. Follow this guide when producing or reviewing devolved branches.

Principles

- Prefer non-destructive, reversible changes.
- Use environment feature flags to gate heavy subsystems where possible.
- Make each devolved branch a single-purpose snapshot that is runnable and testable.
- Include a small smoke script and a README in each devolved branch.

Recommended workflow

1. Create a backup branch:
   ```bash
   git branch backup/devolve-<NN>-before-$(date +%F)
   git push origin backup/devolve-<NN>-before-$(date +%F)
   ```
2. Create a devolved branch (branch from latest devolved or `aether-dev`):
   ```bash
   git checkout -b aether-dev/devolve-<NN>-<short-desc>
   ```
3. Implement only the gating/stub changes for the targeted subsystem and add a smoke script.
4. Commit, push, run the smoke script, and open a small PR for review.

Devolution order (recommended)

1. Puppeteer (skip/replace renderer)
2. Background job workers
3. Readiness/warmup gating
4. Rate-limiting / throttling
5. Dev auth / restrictive auth flows
6. Database (switch to in-memory or mock)
7. Envelope/response-shape simplification
8. Competing handlers / route ambiguity
9. HMR / store instrumentation simplification
10. Optional features (PDF export, advanced previews)

When to gate vs remove

- Gate (feature flags) when you want a reversible and minimal-diff change.
- Remove when preparing a clean snapshot for demo or release; prefer branches for removals.

Verification checklist (for each devolved branch)

- App starts within ~10s in normal dev machine.
- POST to `/prompt` (or the app's canonical flow) returns 200 and a normalized JSON body.
- `samples/latest_prompt.txt` is updated when applicable.
- `scripts/smoke-devolve-<NN>.sh` exits 0 locally.

Security & process notes

- Never enable `DISABLE_AUTH` or similar in production. Keep flags scoped to branches and development only.
- Keep changes small and well-documented in commit messages and PR descriptions.

Next steps

- Add per-step patch templates in `docs/devolvement/patches/` and smoke script templates in `docs/devolvement/templates/`.

---

Created on $(date)
