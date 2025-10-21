import { render, screen, fireEvent } from "@testing-library/svelte/svelte5";
import PromptInput from "../src/components/PromptInput.svelte";
import PreviewWindow from "../src/components/PreviewWindow.svelte";
import { contentStore } from "../src/stores";
import { afterEach, test, expect } from "vitest";
import { waitForPreviewReady } from "./../test-utils/previewReady";

afterEach(() => {
  contentStore.set(null);
});

test("background persistence updates contentStore with server id and preview refreshes", async () => {
  // Arrange: set a prompt that will generate mock content
  render(PromptInput);
  render(PreviewWindow);

  // Put prompt into promptStore via the textarea interaction to better emulate user flow
  const textarea = await screen.findByTestId("prompt-textarea");
  await fireEvent.input(textarea, {
    target: { value: "Server ID Test\nBody content" },
  });

  // Act: click Generate
  const genBtn = await screen.findByTestId("generate-button");
  await fireEvent.click(genBtn);

  // Wait for initial preview to be ready (fallback or server)
  await waitForPreviewReady(screen, 3000);

  // Now wait briefly for background persistence to complete and update contentStore
  // Poll contentStore until it has an `id` (mock server assigns id)
  const start = Date.now();
  let persisted = null;
  while (Date.now() - start < 3000) {
    const val = contentStore;
    const snapshot =
      val && val.subscribe
        ? await new Promise((res) => val.subscribe((v) => res(v)))
        : null;
    if (snapshot && snapshot.id) {
      persisted = snapshot;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  expect(persisted && persisted.id).toBeTruthy();

  // Confirm preview content is present in DOM
  const previewContentEl = await screen.findByTestId("preview-content");
  expect(previewContentEl).toBeTruthy();
  expect(String(previewContentEl.textContent)).toMatch(/Body content/);
});
