import { render, screen } from "@testing-library/svelte/svelte5";
import PreviewWindow from "../src/components/PreviewWindow.svelte";
import { previewStore, uiStateStore, contentStore } from "../src/stores";
import { afterEach } from "vitest";

afterEach(() => {
  // reset stores
  previewStore.set("");
  uiStateStore.set({ status: "idle", message: "" });
  contentStore.set(null);
});

test("renders preview when previewStore is set", async () => {
  const html =
    '<section class="page"><h1>A Summer Day</h1><p>Sunlight warms the shore.</p></section>';
  // Pre-populate the preview store so the component shows it immediately
  previewStore.set(html);
  uiStateStore.set({ status: "success", message: "" });

  render(PreviewWindow);

  // The preview-content should be in the document and include the poem title
  const previewEl = await screen.findByText(/A Summer Day/);
  expect(previewEl).toBeTruthy();
});
