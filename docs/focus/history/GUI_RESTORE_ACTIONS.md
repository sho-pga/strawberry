# GUI Restore: Actionable Checklist

Purpose: provide a single source of truth with explicit, checkable actions that map to the minimal plan in `GUI_RESTORE_SIMPLE.md`. Each item is verifiable with commands or UI checks and includes a conservative time estimate.

How to use

- Work through tasks in order.
- When a task is done, mark the checkbox in the file and commit the change.
- Keep commits small and reversible on branch `gui/restore`.

---

## Pre-flight

- [x] Create and switch to branch `gui/restore` (5m)
  - Command: `git checkout -b gui/restore`

## 1) Verify server endpoint (/prompt)

- Purpose: confirm the backend accepts prompt submissions and returns the expected schema.
- Time: 10–20 minutes
- Steps:
  - [ ] Start server
    - Command: `cd server && npm run dev`
  - [ ] Run verification curl (replace token if needed)
    - Command:
      ```bash
      curl -v -X POST http://localhost:3000/prompt \
        -H "Content-Type: application/json" \
        -H "x-dev-auth: ${DEV_AUTH_TOKEN}" \
        -d '{"prompt":"test"}'
      ```
  - [ ] Expected: HTTP 200 with JSON matching schema:
    ```json
    {
      "content": { "title": "string", "body": "string" },
      "images": ["optional-url"]
    }
    ```
  - [ ] If 401, note auth requirement and set `client/.env` accordingly.
  - [ ] If CORS blocked in browser, add Vite proxy in `client/vite.config.js`.

Verification: paste curl output to PR or attach in ticket.

---

## 2) Confirm client dev environment

- Purpose: ensure client runs locally and ports available.
- Time: 5–10 minutes
- Steps:
  - [ ] Start client
    - Command: `cd client && npm run dev`
  - [ ] Open browser to `http://localhost:5173` and confirm app loads.

---

## 3) Inspect and map Generate flow (no code edits yet)

- Purpose: find where the Generate button is intercepted and which stores are modified.
- Time: 15–30 minutes
- Steps:
  - [ ] Open `client/src/components/PromptInput.svelte`
  - [ ] Identify `handleGenerateClick`, `handleSubmit`, and `submitPrompt` usage
  - [ ] Document where `contentStore` and `previewStore` are set
  - [ ] Add a short note here (or in PR) describing the clean path: `promptStore -> POST /prompt -> contentStore`

Verification: paste short note into PR comments.

---

## 4) Make minimal code change to restore server call (single small patch)

- Purpose: ensure Generate triggers server call and stores are updated on success. Keep everything else untouched.
- Time: 30–60 minutes
- Steps (suggested patch):

  - [ ] In `PromptInput.svelte`, add a new function `handleGenerateNow` that calls existing `submitPrompt` or new `generateOnly` (preferred simple fetch with AbortController). NOTE: Implementation may be opt-in via URL flag for staged verification.
  - [ ] Replace the Generate button's `on:click={handleGenerateClick}` with `on:click={handleGenerateNow}` (or wire based on `ENABLE_SERVER_GENERATE` flag).
  - [ ] On success: `contentStore.set(response.data.content)` (or `response.content` depending on server schema).
  - [ ] Ensure UI state updates: `uiStateStore.set({ status: 'loading'|'success'|'error', message })`.

  - [ ] User validation: Open `http://localhost:5173/?emergency_call=1` (or `?enable_server_generate=1`) and confirm Generate triggers a POST `/prompt?dev=true` and updates preview. Only mark this task complete after the user confirms in the browser.

Verification: manual UI test and network tab showing POST `/prompt` and response. Add diff to PR.

---

## 5) Small UI feedback

- Purpose: provide basic loading, success, and error messages.
- Time: 15–20 minutes
- Steps:
  - [ ] Show loading spinner or disable button during request
  - [ ] Display success message on success
  - [ ] Display error message (use server message or `"An error occurred"` fallback)

Verification: manual UI test

---

## 6) Image generation path

- Purpose: ensure images are generated from returned prompts (can be synchronous or job-based)
- Time: 30–90 minutes (depends on existing server integration)
- Steps:
  - [ ] If `/prompt` returns `images` as prompts, implement server-side call to Cloudflare or a server-side helper that returns URLs
  - [ ] If synchronous generation is too slow, return jobId and implement polling route

Verification: UI shows image URLs (images load), or polling returns URLs eventually.

---

## 7) Preview & Export wiring

- Purpose: ensure preview shows and export uses latest `contentStore`.
- Time: 20–45 minutes
- Steps:
  - [ ] On successful generation set `contentStore` and (optionally) set `previewStore` using `loadPreview` or a small local preview builder
  - [ ] Confirm `exportToPdf` uses `contentStore` and returns a PDF

Verification: generate → preview shows → click Export → PDF downloaded.

---

## 8) Final verification checklist (smoke test)

- Time: 20–30 minutes
- Steps:
  - [ ] Start both servers
  - [ ] Enter valid prompt
  - [ ] Click Generate
  - [ ] Confirm content shown in preview
  - [ ] Confirm images load
  - [ ] Export PDF works
  - [ ] Test empty prompt and invalid auth
  - [ ] User validation: Confirm in a normal browser session (without test harness) that Generate triggers a server call and that the preview shows the generated content. Do not mark as complete until the user has validated this end-to-end.

---

## Rollback guidelines

- If anything breaks:
  - [ ] Revert patch: `git checkout main; git branch -D emergency/gui-restore`
  - [ ] Restore client `PromptInput.svelte` from main

---

## Reporting

- After each task, update this file by checking the box and commit. Include any command outputs or short notes.

---

Notes:

- Keep changes minimal and visible. The goal is a working Generate button; re-enable other features later.
- If you'd like, I can implement the minimal patch in `PromptInput.svelte` on `emergency/gui-restore` and prepare a PR for review.
