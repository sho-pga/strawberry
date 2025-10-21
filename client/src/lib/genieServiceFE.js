// Lightweight frontend genie service wrapper.
// Provides a stable generate() contract that can return a dev/demo payload
// or delegate to the server via existing api.submitPrompt().
import { submitPrompt, loadPreview } from "./api";

function buildContentFromPrompt(prompt) {
  const title = `Dev: ${String(prompt).split(/\s+/).slice(0, 6).join(" ")}`;
  const body = `Deterministic dev preview for prompt: ${prompt}`;
  return { title, body, layout: "dev" };
}

export async function generate(prompt, opts = {}) {
  const dev = opts && opts.dev;
  if (dev) {
    const content = buildContentFromPrompt(prompt);
    const copies = [content, content, content];
    return { content, copies, meta: { source: "dev" } };
  }

  // Default: delegate to server via submitPrompt and normalize the shape.
  const resp = await submitPrompt(prompt);
  // submitPrompt returns either { data: { content, ... } } or { content }
  const data = resp && resp.data ? resp.data : resp;
  const content = (data && data.content) || data || null;
  const copies = (data && data.copies) || [];
  return { content, copies, meta: { source: "server" } };
}

export async function preview(content, opts = {}) {
  return await loadPreview(content, opts);
}

export default { generate, preview };
