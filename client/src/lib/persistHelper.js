import { persistContent } from "../stores";
import { uiStateStore } from "../stores";

/**
 * Run persistContent in background and never throw to the caller.
 * Returns the persisted result or null on failure.
 */
export async function safePersistContent(content) {
  if (!content) return null;
  try {
    const result = await persistContent(content);
    return result;
  } catch (err) {
    try {
      uiStateStore.set({ status: "error", message: "Failed to save changes" });
    } catch (e) {}
    console.warn("safePersistContent: persist failed", err && err.message);
    return null;
  }
}
