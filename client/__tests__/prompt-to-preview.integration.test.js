import { render, screen, fireEvent } from "@testing-library/svelte/svelte5";
import PromptInput from "../src/components/PromptInput.svelte";
import PreviewWindow from "../src/components/PreviewWindow.svelte";
import {
  promptStore,
  contentStore,
  previewStore,
  uiStateStore,
} from "../src/stores";
import { afterEach, test, expect } from "vitest";
import { waitForPreviewReady } from "../test-utils/previewReady";
import { get } from "svelte/store";

afterEach(() => {
  // reset stores
  promptStore.set("");
  previewStore.set("");
  uiStateStore.set({ status: "idle", message: "" });
  contentStore.set(null);
});

test("end-to-end: prompt -> generate -> preview (local shortcut)", async () => {
  // Arrange: set a multi-line prompt where first line becomes the title
  promptStore.set("Test Title\nThis is the body of the preview.");

  // Render both components (stores are shared)
  render(PromptInput);
  render(PreviewWindow);

  // Act: click the Generate button which uses the local-preview shortcut in Step 1A
  const genBtn = await screen.findByTestId("generate-button");
  await fireEvent.click(genBtn);

  // Wait for PreviewWindow to signal it has updated (server or fallback)
  await waitForPreviewReady(screen);
  // Assert: preview content shows the title derived from the prompt (the heading element)
  // Heading level may vary (h1/h2) depending on preview template; match by role+name only
  const previewTitle = await screen.findByRole("heading", {
    name: /Test Title/,
  });
  expect(previewTitle).toBeTruthy();

  // Assert: content was derived from the prompt and rendered (check DOM)
  // The heading assertion above already confirms the title was used; ensure body is present below

  // Assert: preview content is rendered in the DOM (fallback or server-rendered)
  const previewContentEl = await screen.findByTestId("preview-content");
  expect(previewContentEl).toBeTruthy();
  // Use textContent assertion (toHaveTextContent is a Jest/DOM matcher not available here)
  expect(String(previewContentEl.textContent)).toMatch(
    /This is the body of the preview\./
  );
});
