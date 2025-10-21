import { render, screen } from "@testing-library/svelte/svelte5";
import PreviewWindow from "../src/components/PreviewWindow.svelte";
import { contentStore, uiStateStore } from "../src/stores";

afterEach(() => {
  // reset stores
  uiStateStore.set({ status: "idle", message: "" });
  contentStore.set(null);
  if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
  if (typeof vi !== "undefined" && vi.restoreAllMocks) vi.restoreAllMocks();
});

test("PreviewWindow fetches preview and renders server HTML", async () => {
  // Mock fetch to return HTML similar to server previewTemplate
  const html = `<!DOCTYPE html><html><body><div class="preview"><h1>A Summer Day</h1><div class="content">Sunlight warms the shore.</div></div></body></html>`;

  global.fetch =
    typeof vi !== "undefined" && vi.fn
      ? vi.fn(() =>
          Promise.resolve({ ok: true, text: () => Promise.resolve(html) })
        )
      : () => Promise.resolve({ ok: true, text: () => Promise.resolve(html) });

  render(PreviewWindow);

  // Trigger content store with required fields
  contentStore.set({
    title: "A Summer Day",
    body: "Sunlight warms the shore.",
  });
  uiStateStore.set({ status: "loading", message: "" });

  // Wait for the preview to render
  const previewEl = await screen.findByText(/A Summer Day/);
  expect(previewEl).toBeTruthy();
});
