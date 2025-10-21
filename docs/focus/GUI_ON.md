# Getting the GUI actually functional — 

## The short plan (actions + why + success criteria) 

Planned actions (short)

### Verify what code the running servers are serving

Why: tests pass locally, but if the running dev servers started earlier they might be serving a different branch/build. We must confirm the live client and server are the current workspace code.
Outcome: identify whether frontend and backend processes are using this workspace and branch.

### Reproduce the GUI flow headlessly and in logs

Why: confirm POST /prompt and GET /preview behavior when the app is used from the running client (not tests).
Outcome: capture API responses and server logs for a Generate -> Preview interaction.

### Inspect client runtime (browser) symptoms

Why: check if the client receives API responses and whether PreviewWindow is rendering them or rejecting content (missing fields).
Outcome: reproduce the non-responsive behavior and collect console/network traces.

## If root cause found and you OK edits: apply minimal fixes

Examples: ensure contentStore is set immediately (already implemented in workspace), add small runtime tolerance (accept generated content shapes), add runtime debug logs, fix proxy/CORS if blocking requests.
Outcome: when running client+server in dev, entering a valid prompt results in a visible preview (heading + body).
Success criteria

Manual: In browser, entering a valid prompt and clicking Generate shows the preview content (title and body) within 5 seconds.
Automated check: a smoke request reproduces the same content shape the client expects (object with title & body) from the server endpoints.
Safety / constraints

I will not change code unless you explicitly permit me to do so.
Diagnostics will include running commands in the workspace (ps, curl, tail logs, test endpoints). I will report findings before any edits.
Quick manual checks you can run now (if you prefer to run them yourself)

- Confirm client is accessible: open http://localhost:5173 (or the forwarded port) and check console + network.
- In a terminal (workspace root), run:
 - curl -v -X POST http://localhost:3000/prompt -d '{"prompt":"Test\nBody"}' -H 'Content-Type: application/json'
 - curl -v 'http://localhost:3000/preview?title=Test&body=Body' (or the actual preview endpoint shape)
- Tail server logs while clicking Generate in browser:
tail -f server.log