export async function waitForPreviewReady(screen, timeout = 2000) {
  // Wait for the PreviewWindow root attribute `data-preview-ready` to be set
  const start = Date.now();
  const el = await screen.findByTestId("preview-content");
  // Poll body attribute emitted by PreviewWindow: data-preview-ready
  while (Date.now() - start < timeout) {
    const body = document.querySelector("body");
    if (
      body &&
      body.getAttribute &&
      body.getAttribute("data-preview-ready") === "1"
    ) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Preview did not become ready within timeout");
}
