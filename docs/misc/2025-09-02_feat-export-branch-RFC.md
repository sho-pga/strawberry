## 2025-09-02 — RFC: feat/export-pdf-improvements

Branch: `feat/export-pdf-improvements`

## Purpose

Short RFC to capture the contract and immediate next steps for the `feat/export-pdf-improvements` work. This file is intentionally small and links to the process in `2025-09-01_Start-Functionality-Process.md`.

## Contract (minimal)

- Inputs: JSON { title: string, body: string, options?: object }
- Outputs: 200 with PDF bytes (application/pdf) on success; JSON `{ ok:false, errors: [...] }` on validation/expected failures
- Errors: 400 for invalid input, 422 for export validation failures, 500 for unexpected server errors

## Quick tasks (this RFC)

1. Add minimal unit tests (happy path + 1 edge) — test scaffold committed.
2. Implement handler and route in `server/` per contract.
3. Add an in-process export smoke test and one sample poem for deterministic runs.

## Notes

- This RFC is intentionally terse. See `2025-09-01_Start-Functionality-Process.md` for the full process and quality gates.
- Tests added under `server/__tests__/` are intentionally minimal scaffolds to follow tests-first practice and to provide CI feedback quickly.

Next step: implement the handler and a focused unit test that exercises validation and a small in-process export smoke test.
