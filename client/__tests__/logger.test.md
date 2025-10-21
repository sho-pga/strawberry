`````markdown
# Logger Test Suite Documentation

## Purpose

This document explains the intent and structure of `logger.test.js`. The suite verifies the `Logger` abstraction used across the client (and mirrored patterns on the server) to ensure logging calls are predictable, consistent, and side-effect free during tests.

> ✅ Verified: As of 2025-08-16, the tests check that logger methods are called with expected messages and shapes. Keep this doc up-to-date when log message formats change.

## Test Suite Overview

The suite validates:

- Logging API existence (`warn`, `error`, `info`)
- That logging calls are invoked for specific flows
- That log payloads include expected keys where relevant

### Key Tests

- Ensures `Logger.info` is called on successful preview generation
- Ensures `Logger.warn` is called for validation failures
- Ensures `Logger.error` is called when the preview generation fails due to network or parsing errors

## Test Mocks & Setup

- The actual `Logger` implementation is spied on using `vi.spyOn` to prevent noise in test output while still asserting calls and payloads.
- Tests do not validate transport of logs; they only assert local method invocation and payload shape.

## Maintenance Notes

- Keep message keys and shapes stable if other modules rely on them in tests.
- Avoid asserting on entire log text; prefer partial matching on keys or substrings.

```"````
`````
