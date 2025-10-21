# Backend Logic Flow: /prompt to genieService

This document outlines the backend logic for handling a user's prompt, from the initial API request to the final mock data generation. This flow is designed as a placeholder for a future AI implementation.

## High-Level Diagram

```
Client Request
  │
  ▼
┌───────────────────┐
│ POST /prompt      │  (in server/index.js)
│ (Controller)      │
└───────────────────┘
  │
  ▼
┌───────────────────┐
│ genieService      │  (in server/genieService.js)
│ (Adapter/Service) │
└───────────────────┘
  │
  ▼
┌───────────────────┐
│ sampleService     │  (in server/sampleService.js)
│ (Mock Logic)      │
└───────────────────┘
```

---

## Step-by-Step Breakdown

### 1. The `/prompt` Endpoint (Controller/Orchestrator)

- **Location:** `server/index.js`

The lifecycle of a request begins at this Express route handler. Its primary responsibilities are orchestration and control, not business logic.

- **Receives Request:** It handles the `POST /prompt` request from the frontend.
- **Validates Input:** It performs a basic check to ensure the `prompt` from the request body is a non-empty string.
- **Delegates to Service Layer:** It calls `await genieService.generate(prompt)`. This is the crucial hand-off. The controller does not know or care _how_ the content is generated; it only knows that `genieService` is responsible for it.
- **Handles Persistence (Optional):** After getting a result from `genieService`, it attempts to save the prompt and the result to the database via the `crud` module. This step is treated as non-fatal to ensure the user gets a response even if the database write fails.
- **Sends Response:** It takes the data returned by `genieService`, wraps it in a final JSON structure, and sends it back to the client with a `201 Created` status.

### 2. `genieService` (Service Layer/Adapter)

- **Location:** `server/genieService.js`

This module acts as an adapter or a middleman. It decouples the controller from the concrete implementation of the generation logic.

- **Provides a Stable Interface:** It exposes an `async generate(prompt)` function. This `async` contract is important, as it allows the underlying implementation to be either synchronous (like the current `sampleService`) or truly asynchronous (like a future real AI service) without requiring changes to the controller.
- **Delegates to Mock Logic:** It directly calls `sampleService.generateFromPrompt(prompt)` to get the "generated" content.
- **Wraps the Result:** It takes the raw output from `sampleService` and wraps it in a standardized `{ success: true, data: {...} }` object, providing a consistent return structure for the controller.

### 3. `sampleService` (Mock Implementation)

- **Location:** `server/sampleService.js`

This is where the "work" is currently done. It is a mock service that **does not connect to any AI**. Its purpose is to simulate a response for development and testing.

- **Saves the Prompt:** It writes the user's prompt to a local file (`samples/latest_prompt.txt`).
- **"Generates" Content:** It creates a trivial response by taking the first few words of the prompt as a "title" and using the full prompt as the "body".
- **Returns Mock Data:** It returns a simple object containing the filename, the generated content, and several copies of that content.

---

## The Return Path

The data flows back up the chain in reverse:

1.  `sampleService` returns its raw, mock data object.
2.  `genieService` receives this object, wraps it in its standard `data` envelope, and returns it as a Promise.
3.  The `/prompt` handler `await`s the result from `genieService`, performs the optional database write, and sends the final, polished JSON payload to the frontend client.

This architecture successfully isolates concerns, making it straightforward to replace the `sampleService` with a real AI implementation in the future by only modifying `genieService`.

---

## Example Walkthrough

Let's trace a request through the system with a concrete example.

**Frontend Prompt:** `A noir detective story set in a city of robots.`

1.  **`POST /prompt` (Controller):**

    - The controller receives the request with `req.body.prompt` containing the sentence above.
    - It validates that the prompt is a non-empty string.
    - It calls `await genieService.generate("A noir detective story set in a city of robots.")`.

2.  **`genieService` (Adapter):**

    - The `generate` function receives the prompt string.
    - It passes the prompt directly to `sampleService.generateFromPrompt(...)`.

3.  **`sampleService` (Mock Logic):**

    - `savePrompt` is called, writing the full prompt to `/workspaces/vanilla/samples/latest_prompt.txt`.
    - `buildContent` is called. It splits the prompt into words and takes the first 6 to create a title: `"Prompt: A noir detective story set in"`. The body is the full, original prompt.
    - `makeCopies` creates an array of 3 identical copies of the `content` object.
    - It returns the following object to `genieService`:
      ```json
      {
        "filename": "/workspaces/vanilla/samples/latest_prompt.txt",
        "content": {
          "title": "Prompt: A noir detective story set in",
          "body": "A noir detective story set in a city of robots."
        },
        "copies": [ ...3 copies... ]
      }
      ```

4.  **`genieService` (Return Path):**

    - It receives the object from `sampleService`.
    - It wraps this object inside a `data` property and adds `success: true`.
    - It returns the following to the `/prompt` controller:
      ```json
      {
        "success": true,
        "data": {
          "filename": "...",
          "content": { ... },
          "copies": [ ... ]
        }
      }
      ```

5.  **`/prompt` (Return Path):**
    - The controller `await`s and receives the result from `genieService`.
    - It calls `crud.createPrompt(...)`, which saves the prompt to the database and returns a new record, e.g., `{ id: 28 }`.
    - It calls `crud.createAIResult(...)`, which saves the generated content and returns a new record, e.g., `{ id: 18 }`.
    - It adds these new IDs (`promptId: 28`, `resultId: 18`) to the `data` object it received from `genieService`.
    - Finally, it sends the complete, aggregated JSON object to the frontend.

**Final Frontend Preview:**

```json
{
  "success": true,
  "data": {
    "content": {
      "title": "Prompt: A noir detective story set in",
      "body": "A noir detective story set in a city of robots."
    },
    "copies": [
      {
        "title": "Prompt: A noir detective story set in",
        "body": "A noir detective story set in a city of robots."
      },
      {
        "title": "Prompt: A noir detective story set in",
        "body": "A noir detective story set in a city of robots."
      },
      {
        "title": "Prompt: A noir detective story set in",
        "body": "A noir detective story set in a city of robots."
      }
    ],
    "filename": "/workspaces/vanilla/samples/latest_prompt.txt",
    "promptId": 28,
    "resultId": 18
  }
}
```

---

## Revised Flow: Correcting Responsibilities

The initial design mixes concerns, with `sampleService` handling file I/O. The following revised flow establishes a cleaner separation of responsibilities, where `sampleService` owns the business logic and `genieService` provides the necessary tools.

### Revised High-Level Diagram

```
Client Request
      │
      ▼
┌───────────────────┐
│ POST /prompt      │
│ (Controller)      │
└───────────────────┘
      │
      ▼
┌───────────────────┐
│ genieService      │
│ (Service Layer)   │
└───────────────────┘
      │         ▲
      │         │
      ▼         │ (calls utility)
┌───────────────────┐
│ sampleService     │
│ (Business Logic)  │
└───────────────────┘
```

### Revised Step-by-Step Breakdown

1.  **`/prompt` (Controller):** No change. It receives the request and calls `genieService.generate(prompt)`.

2.  **`genieService` (Service Layer):**

    - Its `generate` function is called by the controller.
    - It immediately calls `sampleService.generateFromPrompt(prompt, this)`, passing a reference to itself so that `sampleService` can access its utilities.

3.  **`sampleService` (Business Logic):**

    - Its `generateFromPrompt` function now accepts the `genieService` instance as an argument.
    - **Business Logic Rule #1: Save the prompt.** It fulfills this by calling `genieService.saveContentToFile(prompt)`. It decides _that_ the save must happen and delegates the _how_ to the service layer.
    - **Business Logic Rule #2: Generate content.** It proceeds to build the title, body, and copies as before.
    - It returns the generated content object (without any filename) back to `genieService`.

4.  **Return Path:**
    - `genieService` receives the content object from `sampleService`.
    - It wraps the result in the standard `{ success: true, data: {...} }` envelope.
    - It returns the final object to the `/prompt` controller, which continues the flow as before.

This revised architecture correctly positions `sampleService` as the owner of the business process and `genieService` as a provider of services and utilities.

---

## Implementation Plan

Here is a proposed plan to implement the revised flow.

### 1. Refactor `genieService` to Provide a Utility

- **Create a `saveContentToFile` utility function** inside `genieService.js`. This function will:
  - Accept a `content` string as an argument.
  - Define the output directory (e.g., `server/data/`).
  - Generate a unique filename using a timestamp (e.g., `prompt-20251020-153000.txt`).
  - Use the existing `safeWriteFileSync` logic to save the file.
  - Return the full path of the newly created file.
- **Export the utility function** alongside the main `generate` function.

### 2. Update `genieService`'s `generate` Function

- Modify the `generate` function to pass a reference to itself when it calls `sampleService`.
  ```javascript
  // server/genieService.js
  async generate(prompt) {
    // ...
    const result = sampleService.generateFromPrompt(prompt, this);
    // ...
  }
  ```

### 3. Refactor `sampleService` to Use the Utility

- **Remove file-handling logic:** Delete the `savePrompt` and `safeWriteFileSync` functions from `sampleService.js`. Also remove the `DEFAULT_SAMPLES_PATH` constant.
- **Update `generateFromPrompt`:**
  - Modify its signature to accept `genieService` as the second argument.
  - The first thing it should do is call `genieService.saveContentToFile(prompt)`.
  - It should no longer return a `filename` in its result object.

### 4. Dependency Injection

- To make the relationship explicit, `genieService.js` will need to be updated to pass its own module exports to `sampleService`. This can be done by modifying how `sampleService` is required or by passing `module.exports` directly in the `generate` function call. The latter is simpler for this case.

This plan will successfully refactor the code to achieve the desired separation of concerns.

---

## Refactoring Summary

The refactoring was successfully accomplished. The `sampleService` now correctly delegates file-writing operations to a utility function within `genieService`, cleaning up the separation of concerns.

---

## Future Implementation Plan

This section captures the remaining architectural improvements and feature deletions that were identified.

### A. Final To-Do Items (Architectural Improvements)

1.  **Resolve Circular Dependency** (0.75 - 1.5 hours)

    - **Action:** Create a new `server/utils/fileUtils.js` module. Move the `saveContentToFile` and `safeWriteFileSync` functions into it. Update `genieService` and `sampleService` to import and use this new utility module, removing the need to pass `this`.
    - **Estimate:** 45 - 90 minutes.

2.  **Implement Robust Error Handling** (0.25 - 0.5 hours)

    - **Action:** In `sampleService.js`, wrap the call to the file-saving utility in a `try...catch` block. On failure, log the error to the console but allow the function to continue generating and returning content.
    - **Estimate:** 15 - 30 minutes.

3.  **Add Configuration for Output Path** (0.25 - 0.5 hours)
    - **Action:** In the new `fileUtils.js` module, modify the `saveContentToFile` function to read the output directory from `process.env.PROMPT_LOG_PATH`, falling back to `server/data/` if the environment variable is not set.
    - **Estimate:** 15 - 30 minutes.

### B. Feature Deletion: Remove `readLatest()`

1.  **Remove `readLatest` Functionality** (0.25 - 0.75 hours)
    - **Action:** The `readLatest()` function is now a dangling reference. The plan is to remove it completely. This involves:
      1.  Searching the codebase for any calls to `genieService.readLatest()`.
      2.  Removing the calling code or replacing it with a new implementation if the functionality is still needed elsewhere.
      3.  Deleting the `readLatest()` function from `genieService.js`.
    - **Estimate:** 15 - 45 minutes, depending on how many places use the function.

---

## Final To-Do: Address Architectural Considerations

After the basic refactoring is complete, a final pass must be made to address the following architectural points:

1.  **Circular Dependency:** The pragmatic solution of passing `this` creates a circular dependency (`genieService` -> `sampleService` -> `genieService`). This should be resolved by introducing a dedicated, independent `utils` module for common functions like `saveContentToFile`. Both services can then depend on `utils` without depending on each other.
2.  **Error Handling:** Implement robust error handling in `sampleService`. If the call to `genieService.saveContentToFile()` fails, the failure should be logged, but the service should still proceed to generate and return the content, preserving the system's non-fatal persistence pattern.
3.  **Configuration:** The output path (`server/data/`) is currently hardcoded. This should be moved to an environment variable (e.g., `PROMPT_LOG_PATH`) to make the application more configurable.

---

### ADDENDUM — Implementation Actionables

This concise checklist captures the concrete code changes required to make `sampleService.generateFromPrompt` async, align callers, and modernize the file utilities. Insert these as direct next steps for the implementation team.

- Make `sampleService.generateFromPrompt` async and `await` any file-save operation; preserve non-fatal persistence (try/catch around save).
- Update `genieService.generate` to `await sampleService.generateFromPrompt(prompt)` so the adapter correctly handles the async contract.
- Search for any direct callers of `sampleService.generateFromPrompt` and update them to `await` the Promise (most callers already go through `genieService`).
- Convert `server/utils/fileUtils.js` save/write functions to use `fs.promises` (async) for non-blocking I/O; keep `readLatest` available synchronously for backward compatibility with existing routes.
- Add unit tests for async generation and non-fatal save failures; run lint/tests and update documentation.

Acceptance criteria (brief):

- `sampleService.generateFromPrompt` returns a Promise that resolves to the same `{ content, copies }` object.
- `genieService.generate` remains async and returns the same `{ success: true, data: {...} }` envelope.
- The `/genie` GET route still functions (reads latest saved prompt) and non-fatal behavior preserved when file writes fail.
