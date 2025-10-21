# Debugging and Resolving Test Suite Failures

This document outlines the diagnosis and resolution of two critical failures in the server test suite.

## 1. The Problem

The test suite is failing with two distinct errors:

1.  **`aiService.test.js` Timeout**: The primary test for the `/prompt` endpoint consistently times out after 5-10 seconds.
2.  **`prompt.test.js` TypeError**: The test suite for the CRUD operations on prompts fails with a `TypeError: default.serialize is not a function`, which also causes subsequent hooks to time out.

## 2. Diagnosis

### `aiService.test.js` Timeout

- **Root Cause**: This is a race condition. The test begins executing before the Express server has fully initialized all its services, specifically the Puppeteer browser instance.
- **Why it Happens**: The `beforeAll` hook in the test only checks if the server is listening for HTTP requests, not if it's _ready_ to process them. The `/prompt` endpoint relies on Puppeteer, and if a request arrives while Puppeteer is still launching, the request hangs until the test's timeout is exceeded.

### `prompt.test.js` TypeError

- **Root Cause**: The test file (`prompt.test.js`) is attempting to use the `sqlite3` database object directly, which is incorrect. The project has a promise-based database wrapper (`server/db.js`) that should be used instead.
- **Why it Happens**: The code in `beforeAll` calls `db.serialize(...)`, but the `db` object imported from `../db` is the promise-based wrapper, which does not have a `serialize` method. This causes the initial `TypeError`. The subsequent timeout in `afterAll` is a cascading failure because the initial setup failed.

## 3. Solution: A Step-by-Step Plan

To resolve these issues, we will proceed in two distinct steps, addressing the most fundamental error first.

### Step 1: Stabilize `prompt.test.js`

The immediate priority is to fix the `TypeError` to ensure the basic database tests can run reliably.

**Actionables:**

1.  **Modify `server/__tests__/prompt.test.js`**:
    - Remove the incorrect `db.serialize` block from the `beforeAll` hook.
    - Replace it with `async/await` calls using the promise-based `db.run()` method from the imported `db` wrapper.
    - Ensure the `DELETE` statements are executed in the correct order to respect foreign key constraints (delete from child tables before parent tables).

### Step 2: Fix the Race Condition in `aiService.test.js`

Once the database tests are stable, we can fix the timeout issue by ensuring the server is fully ready before the tests run.

**Actionables:**

1.  **Enhance `/health` Endpoint in `server/index.js`**:

    - Modify the `/health` endpoint to check the readiness state of both the database (`serviceState.db.ready`) and Puppeteer (`serviceState.puppeteer.ready`).
    - The endpoint should return an HTTP `200` status only when both services are ready, and an HTTP `503` (Service Unavailable) otherwise.

2.  **Implement Readiness Polling in `server/__tests__/aiService.test.js`**:
    - In the `beforeAll` hook, replace the simple health check with a polling mechanism.
    - This poller will repeatedly call the `/health` endpoint until it receives a `200` status or a timeout is reached (e.g., 30 seconds).
    - This guarantees that the tests will only start after the server is fully operational.
