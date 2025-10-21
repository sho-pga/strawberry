# Frontend Integration Plan: API to UI

This document outlines the steps to connect the existing backend API to a functional Svelte frontend, completing the core application loop.

## Phase 1: Core UI and State Management ✔

- [x] **Rename and Restructure `App.svelte`**: Rename `client/src/App.svelte.template` to `client/src/App.svelte`.
- [x] **Implement State Management (Svelte Stores)**:
  - [x] Create a store for the user's prompt input (`promptStore`).
  - [x] Create a store for the AI-generated content (`contentStore`).
  - [x] Create a store for the HTML preview (`previewStore`).
  - [x] Create a store for loading and error states (`uiStateStore`).
- [x] **Build UI Components**:
  - [x] Create `client/src/components/PromptInput.svelte`.
  - [x] Create `client/src/components/PreviewWindow.svelte`.
  - [x] Create `client/src/components/OverrideControls.svelte`.
  - [x] Create `client/src/components/ExportButton.svelte`.

## Phase 2: Connecting UI to the API ✔

- [x] **Wire up `PromptInput.svelte`**:
  - [x] On button click, call `submitPrompt()` from `api.js`.
  - [x] On success, update `contentStore`.
  - [x] On failure, update `uiStateStore`.
- [x] **Wire up `PreviewWindow.svelte`**:
  - [x] When `contentStore` changes, call `getPreview()`.
  - [x] Render the returned HTML.
- [x] **Wire up `OverrideControls.svelte`**:
  - [x] On input change, call `overrideContent()`.
  - [x] On success, update `contentStore`.
- [x] **Wire up `ExportButton.svelte`**:
  - [x] On button click, call `exportToPdf()`.
  - [x] Trigger file download.

## Phase 3: Polishing

- [x] **Implement Loading Indicators**:
  - [x] Show a loading spinner when `uiStateStore` indicates a pending API call.
- [x] **Implement Error Handling**:
  - [x] Display a user-friendly error message when `uiStateStore` indicates an error.
- [x] **Apply Basic Styling**:
  - [x] Add CSS to `client/src/app.css` for a clean and usable layout.
