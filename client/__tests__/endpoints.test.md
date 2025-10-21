`````markdown
# Preview Endpoints Test Suite Documentation

## Purpose

This document explains the intent and structure of `endpoints.test.js` (client-side). The suite validates the client-facing wrapper around the `/api/preview` endpoint (`previewEndpoint`) to ensure correct input validation, network error handling, response parsing, and header handling. This documentation should be updated any time the API contract or client error-handling semantics are changed.

> ✅ Verified: As of 2025-08-16, the tests exercise input validation, successful API communication, network error handling, malformed responses handling, and request header assertions.

## Test Suite Overview

The suite is organized into two main groups:

- Input Validation
- API Communication

Each test checks one discrete behavior so that failures point to a single, actionable regression.

### Layer 1: Input Validation ✅

- Purpose: Ensure that client-side validation rejects invalid preview requests before network calls are attempted.
- Key tests:
  - rejects when prompt is missing
  - rejects when prompt is empty string
  - accepts valid prompt data (ensures happy-path resolves)

### Layer 2: API Communication ✅

- Purpose: Verify how `previewEndpoint` interacts with remote services and handles responses/errors.
- Key tests:
  - handles successful API responses — expects returned object with `preview` and `metadata` and that `Logger.info` is invoked
  - handles network errors gracefully — mocks `fetch` rejection and expects a specific APIError message
  - handles malformed API responses — returns an error when required fields are missing
  - includes proper headers in request — ensures `Content-Type` and `Accept` headers are set

## Test Mocks & Setup

- `global.fetch` is mocked per-test using `vi.fn()` to guarantee isolation.
- `Logger.warn`, `Logger.error`, and `Logger.info` are spied on to assert logging behaviour without producing noisy output.
- Tests use the exported `previewEndpoint` from `client/src/lib/endpoints.js`.

## Expected API Contract (client-side)

- Request: POST `/api/preview` with JSON body: `{ prompt: string }`
- Response (success): `{ preview: string, metadata?: object }`
- Errors:
  - Validation errors should be thrown as `PreviewValidationError` (client-side ValidationError subclass)
  - Network or server failures should throw `APIError` with message: `Failed to generate preview: Network or server error`
  - Malformed responses should throw `APIError` with message: `Preview response missing required fields`

## Common Failure Modes

1. Tests attempt real network calls (fetch not mocked) — ensure `global.fetch` is mocked in `beforeEach`.
2. Error messages in code do not match test assertions — update `client/src/lib/endpoints.js` to align messages.
3. Test environment differences (jsdom/node) — prefer mocking `fetch` explicitly.

## Maintenance Notes

- If API contract changes, update tests and this doc simultaneously.
- Keep logger spy assertions minimal — they are there to assert observability, not implementation details.

```"````
`````
