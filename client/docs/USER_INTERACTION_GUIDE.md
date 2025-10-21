# AetherPress User Interaction Guide

## Overview

AetherPress is a web-based application that allows users to generate, preview, and export content. The interface is split into two main panels:

- Left Panel: Controls and input
- Right Panel: Preview window

## Main Components

### 1. Prompt Input

Located in the left panel, this is where you start your content creation:

- Type or paste your prompt in the text area
- Quick-insert buttons available for common themes (e.g., "summer")
- Click "Generate" to create content based on your prompt
- The system automatically triggers a preview after generation

### 2. Preview Window

Located in the right panel, this shows your generated content:

- Displays the current content with styling and formatting
- Updates automatically when new content is generated
- Shows background images when specified
- Provides a real-time view of how your export will look

### 3. Override Controls

Located below the prompt input:

- Allows fine-tuning of the generated content
- Modify specific aspects of the output
- Changes reflect immediately in the preview

### 4. Export Button

Located at the bottom of the left panel:

- Click to export your content as PDF
- Shows export progress
- Downloads the final PDF automatically
- Disabled when there's no content to export

### 5. Status Display

Shows the current state of operations:

- Generation status
- Preview status
- Export progress
- Error messages (if any)

## Typical Workflow

1. **Content Generation**

   - Enter your prompt in the input area
   - (Optional) Use quick-insert suggestions for inspiration
   - Click Generate or use keyboard shortcut
   - Wait for content generation to complete

2. **Preview & Refinement**

   - Review the generated content in the preview window
   - Use override controls to adjust if needed
   - Changes appear immediately in the preview

3. **Export**
   - Click the Export button when satisfied
   - Wait for the export process to complete
   - PDF will download automatically

## Manual: exactly what to do when you have a prompt

Follow these steps in the GUI after you paste or type your prompt (for example: `Generate a children's story of a blind mouse detective in mouse town`):

1. Paste or type your prompt into the Prompt text area (left panel). The textarea has the label "Prompt".
2. Optional: click a quick-insert suggestion (e.g., "Summer suggestion") if you want a starting template.
3. Click the "Generate" button (left panel). This triggers content generation.
   - You should see the Status Display update to something like "Generating content..." or a loading indicator.
4. Wait a few seconds for generation to finish. When complete:
   - The preview (right panel) should update automatically and display the generated content.
   - The Status Display should show success (e.g., "Content generated successfully.").
5. If the preview looks good, you can refine with the Override Controls (below the prompt) and see changes live in the preview.
6. When satisfied, click the "Export" button to download a PDF of the content.

## Quick troubleshooting (if nothing appears to happen)

If clicking Generate does not change the preview or the Status Display stays idle, try the following in order:

1. Confirm servers are running:
   - Client dev server (Vite) should be running on http://localhost:5173
   - Server (API/backend) should be running (if generation depends on it)
2. Try the "Load V0.1 demo" button (left panel) — this loads demo content into the editor and the preview. If the demo loads but Generate still does not, the issue is likely the generation backend or network.
3. Check the Status Display for errors; copy the message and report it if needed.
4. Open the browser console (DevTools → Console) and look for network or JS errors. A common issue is a failed request to the generation API.
5. If the Export button is disabled, confirm there is content in the preview. The Export button is enabled only when content exists.
6. As a last resort for debugging, use the "Run smoke test" button (left panel). This runs a preview → export cycle and will either download a PDF or save a diagnostic JSON file indicating the failure.

## Notes for repeatable tests / automation

- If you want to automate the flow, the app exposes stable test ids on the key elements:
  - Prompt textarea: `data-testid="prompt-textarea"`
  - Generate button: `data-testid="generate-button"`
  - Load demo: `data-testid="load-demo"`
  - Preview content: `data-testid="preview-content"`
  - Export button: `data-testid="export-button"`
- Automation should dispatch real `input`/`change` events when setting the textarea value so Svelte bindings update correctly; alternatively, use the Load demo button to populate content instantly.

---

_This manual workflow is included so you can exercise the V0.1 flow quickly and report any failures; I can then implement a small dev-only test API or automation improvements to make verification repeatable._

## Special Features

### Smoke Testing

- Available for development/testing purposes
- Runs a complete preview → export cycle
- Useful for verifying the entire pipeline

### Auto-Preview

- Preview updates automatically with content changes
- Ensures WYSIWYG experience
- Helps catch issues before export

## Error Handling

The system provides clear feedback through the Status Display:

- Empty prompt warnings
- Generation errors
- Preview failures
- Export issues

## Performance Notes

- Preview generation is debounced to avoid rapid requests
- Export process shows progress percentage
- Background images are cached for better performance

---

_Note: This guide reflects the current implementation as of September 2025. Features may be updated or changed in future versions._
