# Bug Report: Frontend Health Check Failure

Datetime: 2025-10-19 12:30 UTC
Branch: aetherV0/min_client_flow_06-prev_patch

## Bug ID: FE-001

**Status:** Closed  
**Priority:** High  
**Component:** Frontend API Integration  
**Reported Date:** 2025-10-19

## Description

The frontend application displays an API error immediately after loading:

```
API Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Technical Analysis

### Root Cause

1. The frontend attempts to make a GET request to `/health` endpoint
2. The request is not being properly proxied to the backend server
3. Instead of receiving JSON, the frontend receives HTML (likely a 404 page)
4. JSON parsing fails when trying to process HTML content

### Code Investigation

#### Frontend Request (App.svelte)

```javascript
async function checkHealth() {
  try {
    const res = await fetch("/health");
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    health = data.status;
  } catch (err) {
    apiError = err.message;
  }
}
```

#### Vite Proxy Configuration (vite.config.js)

```javascript
proxy: {
  "/prompt": createProxy("/prompt", DEV_AUTH_TOKEN),
  "/preview": createProxy("/preview", DEV_AUTH_TOKEN),
  "/api": createProxy("/api", DEV_AUTH_TOKEN),
  "/override": createProxy("/override", DEV_AUTH_TOKEN),
  "/export": createProxy("/export", DEV_AUTH_TOKEN),
},
```

- The `/health` endpoint is missing from proxy configuration

#### Backend Implementation (server/index.js)

```javascript
app.get("/health", async (req, res) => {
  try {
    const now = Date.now();
    const grace = isInGracePeriod();
    const puppeteerReady = serviceState.puppeteer.ready && browserInstance;
    const dbReady = serviceState.db.ready;
    // ...
```

- Backend endpoint exists and is implemented

## Impact

- Health check fails on application startup
- Error message displayed to users
- Potential cascading effects on application state management

## Steps to Reproduce

1. Start the frontend development server
2. Load the application in browser
3. Observe immediate API error in the UI

## Environment

- Development Environment
- Vite Development Server
- Browser: Any

## Fix Recommendation

Add `/health` endpoint to Vite proxy configuration in `vite.config.js`:

```javascript
proxy: {
  "/health": createProxy("/health", DEV_AUTH_TOKEN),
  // ... existing proxy configurations
},
```

## Verification Steps

After implementing fix:

1. Restart development server
2. Load application
3. Verify health check succeeds
4. Verify no API errors are displayed
5. Check browser network tab for successful JSON response

## Additional Notes

- The backend health endpoint is functioning correctly based on server tests
- The issue is isolated to development environment proxy configuration
- No production impact expected as production build uses different routing

## Fix applied

- The `/health` route was added to the Vite dev-server proxy in `client/vite.config.js` and pushed to branch `aetherV0/min_client_flow_06-prev_patch`.
- Commit: chore(client): add /health proxy to Vite config and update client README; move old bug reports into docs/design and add FE-001 health check report (pushed to remote)

## Verification

1. Restarted frontend dev server (after adding proxy) and reloaded the app.
2. Observed `/health` returned JSON (200) and the frontend no longer threw the JSON parse error.
3. Confirmed no API error shows in the UI and network response `Content-Type: application/json` for `/health`.

Status: Closed — fix applied and verified in development.
