# GUI PostgreSQL Implementation Plan

## Current State Assessment (As of Sept 14, 2025)

### Database

- PostgreSQL is running and accessible
- Basic schema migrations completed
- Tables structure exists but needs verification
- Previous SQLite data status: Unknown, needs assessment

### Frontend (Client)

- Svelte + Vite setup present
- Core components exist but state unknown:
  - PromptInput
  - PreviewWindow
  - OverrideControls
  - ExportButton
  - StatusDisplay
- Current functionality level: Requires testing

### Backend (Server)

- Express.js with basic route structure
- Prisma client configured
- API endpoints present but may need updates
- PDF generation system status: Unknown

## Critical Checkpoints

1. **Infrastructure Verification** (30 mins)

   - [ ] Test PostgreSQL connection
   - [ ] Verify Prisma client operations
   - [ ] Check server API response times
   - [ ] Validate frontend build process

2. **Database State Assessment** (1 hour)

   - [ ] Document current schema structure
   - [ ] Test existing data migrations
   - [ ] Verify data integrity
   - [ ] Check index performance

3. **Frontend Component Audit** (1 hour)

   - [ ] Test each core component
   - [ ] Document broken features
   - [ ] Identify missing UI elements
   - [ ] Check state management

4. **API Integration Check** (1 hour)

   - [ ] Test all endpoints
   - [ ] Document response formats
   - [ ] Verify error handling
   - [ ] Check data flow

5. **Feature Completion Path** (1 hour)
   - [ ] List missing features
   - [ ] Identify critical bugs
   - [ ] Document UX improvements
   - [ ] Plan performance optimizations

## Implementation Priority Queue

### High Priority (2 hours)

1. Database Operations

   - Validate all Prisma operations
   - Ensure proper error handling
   - Verify transaction integrity
   - Test concurrent operations

2. Core GUI Functions
   - Fix broken components
   - Restore basic operations
   - Implement loading states
   - Add error boundaries

### Medium Priority (2 hours)

1. Data Flow

   - Optimize API calls
   - Implement caching
   - Add retry logic
   - Improve error messages

2. User Experience
   - Add progress indicators
   - Improve feedback system
   - Enhance error messages
   - Update status displays

### Low Priority (1 hour)

1. Performance

   - Optimize query performance
   - Implement connection pooling
   - Add request throttling
   - Cache frequent queries

2. Maintenance
   - Add logging
   - Implement monitoring
   - Document APIs
   - Create backup strategy

## Success Criteria

### Minimal Viable Product

1. User can submit prompts
2. System processes requests
3. Results display correctly
4. Basic error handling works
5. PDF export functions

### Full Success

1. All core features working
2. Responsive UI
3. Proper error handling
4. Data persistence
5. PDF generation
6. Performance optimization

## Timeline

Total Estimated Time: 8-9 hours

1. Assessment Phase: 2 hours
2. Critical Fixes: 2 hours
3. Core Implementation: 2 hours
4. Testing & Validation: 1 hour
5. Final Integration: 1-2 hours

## Risk Assessment

### High Risk

- Data migration issues
- Performance bottlenecks
- Integration failures

### Medium Risk

- UI inconsistencies
- Response time delays
- Error handling gaps

### Low Risk

- Minor UI bugs
- Documentation gaps
- Non-critical features

## Next Steps

1. Begin with Infrastructure Verification
2. Proceed to Database State Assessment
3. Conduct Frontend Component Audit
4. Complete API Integration Check
5. Execute Feature Completion Path

## Notes

- All timeframes are estimates
- Priority may shift based on findings
- Document all changes
- Test after each major change
- Maintain backup points

## Emergency 2-hour Sprint (do-or-die checklist)

Goal: Get a working, "as-is" application (frontend + backend with PostgreSQL) in 2 hours. This section is time-boxed and prescriptive — follow steps in order, stop at any irreversible change, and keep commits small.

0. Preconditions (5 minutes)

- Ensure you have a working local dev environment or start the devcontainer. If using the devcontainer, build and attach first.

1. Start quick health checks (10 minutes) ✅ Done

- From repo root, run the DB health script to confirm DB and Prisma:

```bash
./server/scripts/db-health.sh --check=all
```

- If DB is down, start the devcontainer db service (or run docker-compose):

```bash
cd .devcontainer
docker compose up -d db
```
- Results

```bash
./server/scripts/db-health.sh --check=all
DB: UP
Prisma: OK
Schema: VALID
```

2. Start servers in parallel (10 minutes)  ✅ Done

- If in the devcontainer, the attach command should start both servers; otherwise run:

```bash
concurrently "cd client && npm run dev" "cd server && npm run dev"
```

- Happening at start up

```bash
concurrently 'cd ./client && npm run dev' 'cd ./server && npm run dev'
[1] 
[1] > server@1.0.0 dev
[1] > nodemon index.js
[1] 
[0] 
[0] > client@0.0.0 dev
[0] > vite
[0] 
[1] [nodemon] 3.1.10
[1] [nodemon] to restart at any time, enter `rs`
[1] [nodemon] watching path(s): *.*
[1] [nodemon] watching extensions: js,mjs,cjs,json
[1] [nodemon] starting `node index.js`
[1] Serving /samples from /workspaces/vanilla/server/samples
[1] AI service: MockAIService enabled (USE_REAL_AI not set)
[1] Connected to SQLite database at /workspaces/vanilla/data/your-database-name.db
[1] All tables and pragmas initialized successfully.
[1] Database initialized successfully
[1] Jobs DB opened at /workspaces/vanilla/server/data/jobs.db
[1] [Puppeteer] Initialization attempt 1/5
[1] [Puppeteer] Using Chrome executable at: /usr/bin/google-chrome-stable
[1] PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true - will not download bundled Chromium on install.
[0] 2:35:26 PM [vite] (client) Re-optimizing dependencies because lockfile has changed
[0] 
[0]   VITE v6.3.5  ready in 1519 ms
[0] 
[0]   ➜  Local:   http://localhost:5173/
[0]   ➜  Network: http://172.18.0.3:5173/
[1] [Puppeteer] Initialization successful
[1] Server listening on port 3000
[1] [Health] Not ready: {
[1]   "status": "initializing",
[1]   "timestamp": "2025-09-14T14:35:34.727Z",
[1]   "uptime": 8918,
[1]   "gracePeriod": true,
[1]   "services": {
[1]     "puppeteer": {
[1]       "status": "ok",
[1]       "phase": "ready",
[1]       "error": null,
[1]       "healthChecks": 0,
[1]       "ready": true,
[1]       "transitioning": false,
[1]       "retryCount": 0
[1]     },
[1]     "db": {
[1]       "status": "ok",
[1]       "error": null,
[1]       "phase": "ready",
[1]       "ready": true
[1]     }
[1]   }
[1] }
[1] GET /health 503 3.627 ms - 297
[1] [Health] Not ready: {
[1]   "status": "initializing",
[1]   "timestamp": "2025-09-14T14:35:44.783Z",
[1]   "uptime": 18974,
[1]   "gracePeriod": true,
[1]   "services": {
[1]     "puppeteer": {
[1]       "status": "ok",
[1]       "phase": "ready",
[1]       "error": null,
[1]       "healthChecks": 0,
[1]       "ready": true,
[1]       "transitioning": false,
[1]       "retryCount": 0
[1]     },
[1]     "db": {
[1]       "status": "ok",
[1]       "error": null,
[1]       "phase": "ready",
[1]       "ready": true
[1]     }
[1]   }
[1] }
[1] GET /health 503 0.651 ms - 298
[1] [Health] Not ready: {
[1]   "status": "initializing",
[1]   "timestamp": "2025-09-14T14:35:54.838Z",
[1]   "uptime": 29029,
[1]   "gracePeriod": true,
[1]   "services": {
[1]     "puppeteer": {
[1]       "status": "ok",
[1]       "phase": "ready",
[1]       "error": null,
[1]       "healthChecks": 0,
[1]       "ready": true,
[1]       "transitioning": false,
[1]       "retryCount": 0
[1]     },
[1]     "db": {
[1]       "status": "ok",
[1]       "error": null,
[1]       "phase": "ready",
[1]       "ready": true
[1]     }
[1]   }
[1] }
[1] GET /health 503 0.598 ms - 298
[1] GET / 304 0.748 ms - -
[1] GET /health 200 35.523 ms - 289
[1] GET /health 200 31.228 ms - 289
[1] GET /health 200 41.681 ms - 289
[1] GET /health 200 42.536 ms - 289
```

3. Quick smoke test (15 minutes)  [Partially, continue]

- Test these endpoints locally and confirm expected responses:

```bash
# health
curl http://localhost:3000/health

# result
`curl http://localhost:3000/health
{"status":"ok","timestamp":"2025-09-14T15:22:29.673Z","uptime":1449073,"gracePeriod":false,"services":{"puppeteer":{"status":"ok","phase":"ready","error":null,"healthChecks":141,"ready":true,"transitioning":false,"retryCount":0},"db":{"status":"ok","error":null,"phase":"ready","ready":true}}}
`
# prompt (example)
curl -X POST http://localhost:3000/prompt -H "Content-Type: application/json" -d '{"prompt":"short haiku about rain"}'

# result
`$ curl -X POST http://localhost:3000/prompt -H "Content-Type: application/json" -d '{"prompt":"short haiku about rain"}'
{"success":true,"data":{"content":{"title":"Mock: short haiku about rain","body":"This is a mock response for prompt: short haiku about rain.","layout":"poem-single-column"},"metadata":{"model":"mock-1","tokens":22},"promptId":53,"resultId":34}}
`

# preview (replace ID as needed)
curl "http://localhost:3000/preview?id=1"

# result
`
`
```

4. Fast fixes (30 minutes)

- If endpoints fail due to DB/Prisma issues:
  - Inspect `server/prisma/prisma-client.js` and ensure it exports a working Prisma client.
  - Re-generate client if necessary:

```bash
cd server
npx prisma generate
```

- If migrations are missing or tables absent, reapply migrations:

```bash
npx prisma migrate deploy
```

5. Frontend quick adjustments (25 minutes)

- If the client fails to fetch (CORS, wrong endpoints), update `client/src/config` or `client/src/lib/api.js` to point at `http://localhost:3000`.
- Implement temporary fallback UI for server errors: display raw error JSON in preview pane so you can proceed.

6. PDF export sanity (15 minutes)

- Trigger export via the UI or directly:

```bash
curl "http://localhost:3000/export?id=1" --output /tmp/test-ebook.pdf
```

- If Puppeteer fails to find Chrome, set `CHROME_PATH` env var and ensure `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` in `server` process.

7. Finalize and stabilize (20 minutes)

- Once a minimal loop works (prompt -> preview -> export), commit small fixes and push:

```bash
git add -A
git commit -m "chore: emergency sprint fixes — quick restore of prompt/preview/export flow"
git push origin gui/restore
```

- Create short postmortem notes in `docs/focus/` listing what was changed and why.

Emergency Sprint Constraints & Rules

- Only make changes necessary for the minimal loop. Defer refactors.
- Keep commits small and descriptive. If a change risks data loss, create a branch and tag it.
- If you encounter a blocker that will take >30 minutes, switch to the next checklist item.

---

Appendix: Useful commands (copyable)

```bash
# start DB (devcontainer)
cd .devcontainer && docker compose up -d db

# quick DB healthcheck
./server/scripts/db-health.sh --check=all

# regenerate prisma client
cd server && npx prisma generate

# apply migrations
cd server && npx prisma migrate deploy

# start both dev servers (if not using devcontainer auto-attach)
concurrently "cd client && npm run dev" "cd server && npm run dev"

# smoke prompt
curl -X POST http://localhost:3000/prompt -H 'Content-Type: application/json' -d '{"prompt":"short haiku about rain"}'
```
