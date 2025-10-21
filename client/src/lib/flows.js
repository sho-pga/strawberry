import { get } from "svelte/store";
import {
  submitPrompt,
  loadPreview,
  savePromptContent,
  updatePromptContent,
} from "./api";
import genieServiceFE from "./genieServiceFE";
import {
  contentStore,
  previewStore,
  uiStateStore,
  setUiLoading,
  setUiSuccess,
  setUiError,
  persistContent,
} from "../stores";

const DEFAULT_TIMEOUT_MS = 10000; // 10s

// Controller for the in-flight preview request so it can be cancelled
let previewAbortController = null;

export function cancelPreview() {
  try {
    if (previewAbortController) {
      // Only abort if the signal isn't already aborted to avoid spurious
      // DOMExceptions in some environments.
      try {
        if (!previewAbortController.signal.aborted)
          previewAbortController.abort();
      } catch (inner) {
        // ignore
      }
      previewAbortController = null;
    }
  } catch (e) {
    // swallow - cancellation should be best-effort
  }
}

function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms)
    ),
  ]);
}

/**
 * Extract styles and body content from a full HTML document string.
 * If the input is already a fragment, return it unchanged.
 */
function extractFragmentFromDocument(input) {
  if (!input || typeof input !== "string") return input;
  const trimmed = input.trim();
  // fast-path: if it doesn't look like a full document, return as-is
  if (!/<!doctype html/i.test(trimmed) && !/^<html/i.test(trimmed))
    return input;

  // Browser path: use DOMParser to correctly extract head styles and body
  // content. This is the safest path for dev UX in the browser.
  try {
    if (typeof DOMParser !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, "text/html");
      let out = "";
      try {
        const styles = Array.from(
          doc.querySelectorAll("head style, head link[rel=stylesheet]")
        );
        out += styles.map((s) => s.outerHTML).join("\n");
      } catch (e) {
        // ignore
      }
      try {
        out += doc.body ? doc.body.innerHTML : "";
      } catch (e) {
        // ignore
      }
      return out || input;
    }
  } catch (e) {
    // fall through to regex fallback
  }

  // Fallback: naive regex extraction for environments without DOMParser
  try {
    const styleMatches = [];
    let m;
    const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = styleRe.exec(input))) {
      styleMatches.push(m[0]);
    }
    const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(input);
    const body = (bodyMatch && bodyMatch[1]) || "";
    return (styleMatches.join("\n") + "\n" + body).trim() || input;
  } catch (e) {
    return input;
  }
}

/**
 * Call the preview API for a piece of content and update stores/UI state.
 * Returns the HTML string on success.
 */
export async function previewFromContent(
  content,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  if (!content || !content.title || !content.body) {
    const err = new Error("No valid content provided for preview");
    uiStateStore.set({ status: "error", message: err.message });
    throw err;
  }

  // Cancel any previously running preview to avoid race conditions and create
  // a fresh controller for this request. Capture the controller locally so
  // we can tell if a later cancellation corresponds to this request or a
  // newer one.
  cancelPreview();
  previewAbortController = new AbortController();
  const myController = previewAbortController;
  const signal = myController.signal;

  setUiLoading("Loading preview...");

  try {
    let html = await withTimeout(loadPreview(content, { signal }), timeoutMs);
    // If the backend returned a full HTML document, extract styles and body
    // so that injecting with {@html} into a div renders correctly.
    try {
      // extract full-document components
      const trimmed = String(html || "");
      if (/^\s*<!doctype html/i.test(trimmed) || /^\s*<html/i.test(trimmed)) {
        // in-browser parse to extract styles and body
        if (typeof DOMParser !== "undefined") {
          const parser = new DOMParser();
          const doc = parser.parseFromString(trimmed, "text/html");
          // collect css text from <style> tags
          try {
            const styles = Array.from(doc.querySelectorAll("head style"))
              .map((s) => s.textContent || "")
              .join("\n");
            if (typeof document !== "undefined" && document.head) {
              let tag = document.getElementById("preview-injected-styles");
              if (!tag) {
                tag = document.createElement("style");
                tag.id = "preview-injected-styles";
                document.head.appendChild(tag);
              }
              tag.textContent = styles;
            }
          } catch (e) {
            // ignore style injection errors
          }
          // use body innerHTML as fragment
          try {
            html = doc.body ? doc.body.innerHTML : "";
          } catch (e) {}
        } else {
          // fallback to earlier fragment extractor
          html = extractFragmentFromDocument(html);
        }
      } else {
        // input already a fragment; no style extraction needed
        html = extractFragmentFromDocument(html);
      }
    } catch (e) {
      // if extraction fails, fall back to raw html
      try {
        html = extractFragmentFromDocument(html);
      } catch (er) {}
    }
    // Ensure previewStore is updated with the returned HTML fragment (body only)
    previewStore.set(html);
    uiStateStore.set({ status: "success", message: "Preview loaded" });
    // If this request is still the active controller, clear the global
    // reference so subsequent calls start fresh. If a newer request has
    // replaced the global controller, leave it as-is.
    if (previewAbortController === myController) previewAbortController = null;
    return html;
  } catch (err) {
    // If the request was aborted (due to a newer preview request), treat
    // it as a non-error — don't surface it to the user or clear the
    // existing preview. This prevents noisy AbortError logs when users
    // rapidly change prompts or when a previous request is intentionally
    // cancelled.
    if (err && (err.name === "AbortError" || err.type === "aborted")) {
      // Keep existing preview and UI state; return an empty string so
      // callers can continue without treating this as a failure.
      // Clear the global controller only if it belongs to this request.
      try {
        if (previewAbortController === myController)
          previewAbortController = null;
      } catch (e) {}
      return "";
    }

    setUiError(err.message || "Preview failed");
    // clear preview on failure to avoid stale views
    try {
      previewStore.set("");
    } catch (e) {}
    throw err;
  }
}

/**
 * Submit a prompt, update contentStore and trigger a preview for the generated content.
 * Returns the preview HTML string on success.
 */
export async function generateAndPreview(
  prompt,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  if (!prompt || !String(prompt).trim()) {
    const err = new Error("Prompt cannot be empty.");
    uiStateStore.set({ status: "error", message: err.message });
    throw err;
  }

  setUiLoading("Generating content...");

  try {
    // Prefer using the frontend genie service which may implement a dev/demo
    // implementation or delegate to the server. Fall back to submitPrompt
    // to preserve existing behaviour.
    let response;
    try {
      response = await withTimeout(
        genieServiceFE.generate(prompt, {}),
        timeoutMs
      );
    } catch (e) {
      // If the frontend service fails for some reason, fall back to the
      // existing server API call to avoid breaking the flow.
      response = await withTimeout(submitPrompt(prompt), timeoutMs);
    }

    // genieServiceFE.generate returns { content, copies, meta } or submitPrompt
    // returns the legacy shape { data: { content } } so normalize both.
    const content =
      (response && response.content) ||
      (response && response.data && response.data.content) ||
      response.content ||
      null;
    if (!content) {
      throw new Error("Invalid response structure from server.");
    }

    // Immediately set the generated content locally so the UI can render a
    // fallback preview without waiting for network persistence.
    contentStore.set(content);

    // Persist content to server prompts API in background. If it succeeds,
    // persistContent will update contentStore with server-provided fields
    // (like promptId). If it fails, we surface a non-blocking warning but
    // don't block the user from seeing the preview.
    let persisted = content;
    (async () => {
      try {
        const result = await persistContent(content);
        persisted = result || content;
        // After persistence, attempt to refresh the preview with persisted data
        try {
          await previewFromContent(persisted, timeoutMs);
        } catch (e) {
          // ignore preview refresh errors here; previewFromContent already
          // sets UI state appropriately
        }
      } catch (saveErr) {
        console.warn(
          "Failed to persist generated content to server",
          saveErr && saveErr.message
        );
        // Surface a non-blocking UI warning
        uiStateStore.set({
          status: "error",
          message: "Saved locally; failed to persist to server.",
        });
      }
    })();

    // Trigger preview for the newly generated content (use local content so
    // the user sees something immediately).
    const html = await previewFromContent(content, timeoutMs);
    return html;
  } catch (err) {
    setUiError(err.message || "Generation failed");
    throw err;
  }
}
