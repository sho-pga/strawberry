# RESTORATION_SPEC — Feature Restoration Plan

[THU 18th Sep 2025 @ 10:35AM]

**IMPORTANT: Each feature restoration should be implemented in its own branch, originally created from `aetherV0/min_client_flow` once the core flow is validated. Branch naming convention: `aetherV0/cli_restore-{feature-name}` from thereon.**

Reference: [MIN_CLIENT_SPEC.md](MIN_CLIENT_SPEC.md)

## Purpose

This document outlines the process for restoring full functionality after the [core flow](CORE_FLOW_SPEC.md) is validated.

## Feature Restoration Sequence

1. Basic Enhancement Layer

   - Safe retries (maxRetries: 2)
   - Basic error handling
   - Loading states

2. Request Management

   - AbortController implementation
   - Request scoping
   - Overlap handling

3. State Management

   - Background persistence
   - PromptId tracking
   - Preview refresh logic

4. Development Features
   - HMR-safe singleton handling
   - Canonical import paths
   - Debug instrumentation

## Validation Requirements

For each restored feature:

1. Verify original functionality
2. Ensure no regression in core flow
3. Validate error cases
4. Check console for issues

## Rollback Safety

- Each feature restore should be atomic
- Maintain fallback to core flow
- Test isolation between features
- Keep core flow paths clear

## Risk Management

- HMR: Use canonical imports
- Network: Implement timeouts
- State: Maintain clean boundaries
- Runtime: Guard dev features
