# GUI PostgreSQL — 2-Hour Emergency Sprint Summary

Status (current):

- DB health: OK (Postgres up, Prisma OK, schema valid)
- Server: running on http://localhost:3000
- Client: running on http://localhost:5173
- Quick prompt endpoint: works (POST /prompt returned promptId 54, resultId 35)
- Preview endpoint: requires `content` (GET /preview?content=<json>) — current server does not auto-load latest result by id
- Export endpoint: available (GET /export?content=<json> or POST /api/export)

Goal: Have the minimal user flow working via the UI: Prompt -> Preview -> Export

Immediate findings and actions taken:

1. DB & Prisma

- `./server/scripts/db-health.sh --check=all` returned:
  - DB: UP
  - Prisma: OK
  - Schema: VALID

2. Prompt

- Sent sample prompt:
  - POST http://localhost:3000/prompt
  - Body: {"prompt":"short haiku about rain"}
- Response: success with `promptId: 54`, `resultId: 35` (mock content returned)

3. Preview

- GET /preview requires `content` query param (JSON-encoded). The server does not accept `promptId`/`resultId` references directly.
- To preview a result saved in the DB, you must fetch the AI result by ID and then call `/preview?content=<json>`.

4. Export

- Use GET /export?content=<json> or POST /api/export with { title, body } to generate a PDF. Puppeteer is initialized and functional in the running server.

Quick actionable checklist to complete within 2 hours (prescriptive, in order):

A. Make preview support result ids (15-30 minutes)

- Create a small endpoint or extend existing `/preview` handler to accept `resultId` or `promptId` and load the AI result from DB.
- Minimal change: in `server/index.js` modify `/preview` to:
  - If `resultId` present: call `crud.getAIResultById(resultId)` and use result.result.content as `content`.
  - If `promptId` present: call `crud.getPromptById(promptId)` and/or fetch latest ai_result for that prompt.
- Keep behavior backwards compatible (still accept `content` param).

B. Add helper client fallback (10 minutes)

- Update client to call `/api/ai_results/:id` to fetch result, then call `/preview?content=${encodeURIComponent(JSON.stringify(content))}` if server can't preview by id.

C. Small utility endpoint to return content by id (10 minutes)

- Add `GET /content/:resultId` that returns `{ content }` so client can fetch and call preview easily.

D. Test full loop (30 minutes)

- POST /prompt (dev or real) -> GET /content/:resultId -> GET /preview?content=... -> GET /export?content=... (save PDF)

E. Commit and push small fixes (10 minutes)

- Keep commits small and descriptive, e.g., `fix(preview): accept resultId and promptId in GET /preview`

Exact commands used during checks (copyable):

```bash
# DB health
./server/scripts/db-health.sh --check=all

# Prompt (dev mode or production depending on server config). For deterministic dev mock, add ?dev=true
curl -X POST http://localhost:3000/prompt -H "Content-Type: application/json" -d '{"prompt":"short haiku about rain"}' | jq

# If you have a result JSON object in $CONTENT, preview it:
curl "http://localhost:3000/preview?content=$(node -e "console.log(encodeURIComponent(JSON.stringify({title:'T',body:'B'})))")" | head -n 40

# Export PDF (POST with JSON body)
curl -X POST http://localhost:3000/api/export -H "Content-Type: application/json" -d '{"title":"T","body":"B"}' --output /tmp/test-ebook.pdf
```

Notes & Risks

- Modifying `/preview` to load DB content is low-risk but must preserve existing `content` param behavior.
- Avoid large refactors; implement minimal, well-tested additions.

Next immediate step (if you want me to proceed now)

- I can implement the `resultId`/`promptId` support in `/preview` (small change in `server/index.js`) and a companion `GET /content/:id` helper; then run the loop end-to-end and commit the changes.

If you say "implement preview by id now", I'll:

1. Mark todo #3 as in-progress
2. Edit `server/index.js` to add `resultId`/`promptId` handling in `/preview`, plus `GET /content/:id` endpoint
3. Run `npm --prefix server test` (if quick) and then smoke the loop
4. Commit and push the changes

Approve and I'll proceed, or tell me any constraints you want me to follow.
