# MIM_DESIGN — Minimal Implementation Model (GenieService)

## Purpose

This document records the "Suggested minimal design" for the genieService abstraction and the small supporting services (sampleService, aetherService). The goal is to rapidly provide a working demo pipeline (ASAP) while keeping the architecture stable and extensible so future services can be swapped in without changing frontend wiring.

## Principles

- GenieService is the single entrypoint for generation requests from the frontend.
- GenieService decides which implementation to invoke: `sampleService` (demo) or `aetherService` (production/orchestration).
- Keep the public contract stable. The frontend calls POST `/prompt` and expects a consistent JSON envelope in response.
- Prioritize developer experience and deterministic demo behavior for now; robustness improvements (queues, retries, metrics) are "nice to haves" that can be added incrementally.

## Contracts

All generator implementations must satisfy this minimal contract:

- generate(prompt: string) -> Promise<{
  content: { title: string, body: string },
  copies: Array<{ title: string, body: string }>,
  filename?: string,
  metadata?: object
  }>

- readLatest() -> string | null
- savePrompt(prompt: string, options?) -> string (filename)
- buildContent(prompt: string) -> { title, body }
- makeCopies(content, n=3) -> Array<content>

## GenieService API

`server/genieService.js` should:

- Validate input (non-empty prompt).
- Choose implementation based on configuration:
  - `process.env.GENIE_IMPL = 'sample' | 'aether'` (default: 'sample' for dev)
- Call chosenImpl.generate(prompt) and normalize the result to the contract above.
- If chosenImpl fails and `GENIE_FALLBACK_TO_SAMPLE=true`, call `sampleService.generate(prompt)` and annotate the response with a warning.
- Return the normalized envelope: `{ success: true, data: { ... } }`.

## Persistence behavior (current minimal policy)

- The server should return generator results to the frontend immediately.
- Attempt to persist the prompt and ai result to the DB, but do not block or fail the HTTP response if persistence fails.
- When persistence succeeds, attach `promptId` and `resultId` to the returned `data` envelope.
- When persistence fails, log a warning and add `data.warnings = [{ code: 'PERSIST_FAIL', message: 'Prompt not saved' }]`.

This policy keeps the demo smooth while allowing storage when available.

## Error handling

- Input validation errors: return 400 with structured JSON.
- Generator failures:
  - If using `aether` in prod, consider fail-fast and return 500.
  - For dev/demo (`sample`), return 500 only on catastrophic failures. Prefer fallback.
- Persistence failures: non-fatal; returned in `data.warnings`.

## Feature flags / environment variables

- `GENIE_IMPL` (string): 'sample' (default) or 'aether'
- `GENIE_FALLBACK_TO_SAMPLE` (boolean): if true and aether fails, fallback to sample
- `BLOCK_ON_PERSIST` (boolean): if true, make DB persistence atomic and block the response

## Observability

- Log which implementation handled the request and any fallbacks.
- Emit counters for: generate.calls, generate.success, generate.failure, generate.fallbacks, persist.success, persist.failure.

## Testing

- Unit tests for `genieService` that stub both implementations and validate delegation and fallback logic.
- Integration test (smoke): POST `/prompt` and verify response includes `data.content` and samples/latest_prompt.txt is created.

## Migration path to aetherService

- Implement `aetherService` with same exports as `sampleService`.
- Update `GENIE_IMPL=aether` and test. Optionally keep `GENIE_FALLBACK_TO_SAMPLE=true` during the rollout.

## Appendix: Example genieService delegate pseudocode

```js
const impl = process.env.GENIE_IMPL || "sample";
const implModule =
  impl === "aether" ? require("./aetherService") : require("./sampleService");

try {
  const result = await implModule.generate(prompt);
  return { success: true, data: result };
} catch (err) {
  if (impl === "aether" && process.env.GENIE_FALLBACK_TO_SAMPLE === "true") {
    const fallback = await require("./sampleService").generate(prompt);
    return {
      success: true,
      data: fallback,
      warnings: ["aether_failed_fallback_to_sample"],
    };
  }
  throw err;
}
```
