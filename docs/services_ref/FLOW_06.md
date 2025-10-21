# FLOW_06 — Minimal Implementation Plan

**Branching note:** This document targets branch `aetherV0/min_client_flow_06`. Additional experimental implementation attempts will be created as branches suffixed with a single capital letter, starting from `B` (for example `aetherV0/min_client_flow_06B`, `...06C`, etc.), each representing a separate attempt.

This file records the minimal demo implementation for the tripled-text preview flow described in `CORE_FLOW_SPEC.md`.

**Clarification:** Treat FLOW_06 as a tiny starter/demo ("Hello, world!") app: keep it trivial, make sure it runs, and ensure passing criteria/tests are minimal but meaningful; how simple this starter program should be; how thorough its tests must be, exact passing criteria, and a small pragmatic verification checklist you (or the PM) can run immediately.

 - Summary statement

    Treat FLOW_06 as a minimal, deterministic starter: the smallest end-to-end flow that proves the system wiring works (client → server → repo write → preview).
    Complexity: trivial by design — minimal UI, a single POST endpoint, file-write side effect, and display of returned text.
    Tests: small, focused, fast unit/integration checks (curl-based smoke + one UI assertion). Tests should prioritize that the flow runs and the environment supports required components (file system write, server listening). No high-coverage or flaky e2e automation is required at this stage.

 - How complicated is the "Hello, world!" starter here?

    Very simple: implement exactly what's in FLOW_06/CORE_FLOW_SPEC/MIN_CLIENT_SPEC:
        Server: one route POST /prompt that validates body, writes prompt to samples/latest_prompt.txt, and returns { "content": "<prompt>\n<prompt>\n<prompt>" }.
        Client: single page with an input, a Generate button, and preview element with data-testid="preview-content".
        Stores: just promptStore, previewStore, optional uiStateStore.
    Expected dev effort: small (1–3 hours) to implement and verify locally on a dev environment already configured (or devcontainer).
    No advanced patterns: skip AbortController, retries, background processing, HMR quirks, or heavy instrumentation for initial pass.

## Core Purpose

- Input: user types a short prompt
- Action: POST to `/prompt` with `{ "prompt": "..." }`
- Backend: write prompt to `./samples/latest_prompt.txt` and return tripled content
- Output: frontend displays tripled content (preserve newlines) in element with `data-testid="preview-content"`

## Files to create/update (minimal)

- `client/src/stores/index.js` — `promptStore`, `previewStore`, optional `uiStateStore`
- `client/src/App.svelte` — single minimal UI (input, Generate button, preview)
- `server/index.js` (or existing server router) — add `POST /prompt` handler

## API contract

- Request: POST /prompt
  - Headers: `Content-Type: application/json`
  - Body: `{ "prompt": "..." }`
- Success response: 200 JSON `{ "content": "<tripled-text>" }`
- Error response: non-2xx JSON `{ "error": "<msg>" }`

## Frontend behavior

- Validate non-empty prompt before sending
- Disable Generate button while request in-flight; button text changes to `Generating...`
- On success: set `previewStore` to returned `content` and re-enable button
- On error: show inline error, re-enable button, do not clear previous preview

## Server behavior

- Validate prompt string
- Write original prompt to `./samples/latest_prompt.txt`
- Respond with JSON `{ "content": prompt + '\n' + prompt + '\n' + prompt }`
- On failure: return 500 with `{ "error": "<short message>" }`

## Notes / Implementation choices

- Use explicit server URL `http://localhost:3000/prompt` in client during early testing to avoid proxy/CORS surprises.
- Ensure `samples/` exists and is writable in server environment.
- The PM performs verification and decides success/failure of the demo run.

## Minimal verification checklist (PM)

Start server (port 3000) and client (port 5173)

- [ ] POST `{ "prompt": "Hello" }` to `/prompt` → receive `{ "content": "Hello\nHello\nHello" }`
- [ ] `samples/latest_prompt.txt` contains `Hello`
- [ ] Enter `Hello` in UI and click Generate → preview displays three lines with preserved newlines

---

This file is the canonical guide for the FLOW_06 minimal implementation.

## ADDENDUM — Files necessary / affected

The following files are the minimal set required for the demo and files that may be affected by implementing the minimal flow. Implementers should edit only what is listed here for the initial experiment.

Client (frontend):

- `client/src/stores/index.js` — create or replace with minimal stores: `promptStore`, `previewStore`, and optional `uiStateStore`.
- `client/src/App.svelte` — the single minimal UI component (input, Generate button, preview with `data-testid="preview-content"`).
- `client/src/main.js` — entry point: ensure it mounts `App.svelte` (no heavy changes required if present).
- `client/package.json` and `client/vite.config.js` — no changes required for the demo, but be aware of proxy settings if using `/prompt` path.

Server (backend):

- `server/index.js` or the server router file — add `POST /prompt` handler that writes to `./samples/latest_prompt.txt` and returns JSON `{ content: "..." }`.
- `samples/latest_prompt.txt` — file created by the server; ensure `samples/` exists and is writable.

Other files (do not modify for initial demo):

- Any other `client/src/components/*` files — leave untouched during the minimal experiment.
- `server/*` other routes and services — leave untouched; implement only the `/prompt` endpoint.

Note: Once the minimal demo is validated by the PM, further cleanup (removing unused components) can be performed in follow-up iterations.

**Backup note:** The files targeted for this minimal demo were backed up to `backups/FLOW_06_20250919_193109` in the repository root before any modifications.
