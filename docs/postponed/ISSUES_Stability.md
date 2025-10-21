# ISSUES_Stability: Backend Stability Improvements

## Purpose

Document and track actionable steps to improve backend stability, focusing on error reduction, service readiness, and robust diagnostics.

---

## Next Steps (Priority: Readiness Middleware Debugging)

- Recent failures (HTTP 502) began after implementing the startup readiness middleware.
- **Next step:**
  - Add detailed logging to the readiness middleware to capture Puppeteer and DB state on every blocked request.
  - Consider temporarily disabling or relaxing the readiness middleware to confirm it is the source of the failures.
  - If confirmed, refine the readiness logic to avoid unnecessary blocking or race conditions.
- Make this debugging and refinement a top priority before further stability changes.

- Review and update the health check logic in `./start-app.sh` or related scripts to ensure it correctly interprets the `/health` endpoint response.
- Add debug output to the script to show the exact response received and what is being checked.
- Ensure the script matches the actual `/health` endpoint response and status code.

---

## Proposed Stability Improvements

### 1. Enhance Health Endpoint

- [x] Add detailed checks for Puppeteer and DB readiness
- [x] Log and return granular status (e.g., "initializing", "crashed", "unavailable")
- [x] Expose health endpoint for external monitoring

### 2. Improve Puppeteer Lifecycle

- [x] Add auto-restart logic if Puppeteer crashes
- [x] Expose Puppeteer status in logs and health checks
- [x] Alert on repeated Puppeteer failures

### 3. Database Robustness

- [x] Add retry logic for DB operations if locked (e.g., implement retry with exponential backoff for SQLITE_BUSY errors)
- [x] Log and alert on DB connection errors (capture and log all DB errors, consider integration with alerting/monitoring)
- [x] Monitor DB file health and size (periodically check DB file size, log warnings if thresholds are exceeded, and ensure disk space is sufficient)

### 4. Startup Readiness Probe

- [x] Add middleware to block all non-health requests with a 503 if either Puppeteer or the DB is not ready
  - Place middleware early in the Express stack (after logging, before routes)
  - Exclude `/health` (and optionally `/`) from readiness check
  - Respond with status 503 and a clear JSON message if not ready
- [] Test with Puppeteer and DB both up, both down, and one up/one down
- [ ] Ensure health checks are always available

**Estimated implementation time:**

- Code changes: 20–40 minutes
- Testing and validation: 20–30 minutes
- Documentation/update: 5–10 minutes

### 5. Proxy/Container Configuration

- [ ] Review reverse proxy settings to avoid injected 401/502 errors
- [ ] Check CORS and authentication flows

### 6. Error Logging & Monitoring

- [ ] Add unique request IDs to logs for tracing
- [ ] Integrate with monitoring/alerting service for repeated errors

---

## Implementation Plan

- Each improvement will be implemented and tested in isolation.
- After each change, verify stability and log output.
- Document findings and update this file with results and next steps.

---

## Progress Tracking

- [ ] Health Endpoint
- [ ] Puppeteer Lifecycle
- [ ] Database Robustness
- [ ] Startup Readiness
- [ ] Proxy/Container
- [ ] Logging/Monitoring

---

## Notes

- Prioritize improvements that address the most frequent or disruptive errors first.
- Use this document to coordinate and verify all stability-related changes.
