// @ts-nocheck -- dev-only store instrumentation file; suppress TS diagnostics
import { writable } from "svelte/store";
import { savePromptContent, updatePromptContent } from "../lib/api";

// DEV-only helper: wrap writable so set/update calls are logged during development
const IS_DEV =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

function devWritable(name, initial) {
  const w = writable(initial);
  if (!IS_DEV) return w;
  // Rate-limit verbose logging to avoid console-flood during rapid updates.
  let lastLogTime = 0;
  const LOG_MIN_INTERVAL_MS = 120; // ~8 logs per second max per store
  return {
    subscribe: w.subscribe,
    set(value) {
      try {
        const now = Date.now();
        if (now - lastLogTime > LOG_MIN_INTERVAL_MS) {
          lastLogTime = now;
          console.log(`STORE:${name}.set`, { value });
        }
      } catch (e) {}
      w.set(value);
    },
    update(fn) {
      w.update((prev) => {
        const next = fn(prev);
        try {
          const now = Date.now();
          if (now - lastLogTime > LOG_MIN_INTERVAL_MS) {
            lastLogTime = now;
            console.log(`STORE:${name}.update`, { prev, next });
          }
        } catch (e) {}
        return next;
      });
    },
  };
}

/**
 * @typedef {'idle' | 'loading' | 'success' | 'error'} UIState
 */

/**
 * Store for the user's prompt input.
 * @type {import('svelte/store').Writable<string>}
 */
// `promptStore` will be created from the singleton exports below so it
// is shared across HMR copies. Exported at the end as `promptStore`.

/**
 * Store for the AI-generated content.
 * @type {import('svelte/store').Writable<object | null>}
 */
// Create singletons on window in DEV to avoid multiple module instances
// (Vite HMR or differing import paths can cause duplicate module copies).
const GLOBAL_STORES_KEY = "__STRAWBERRY_SINGLETON_STORES__";

// DEV flag for verbose store logging (shared scope)
const DEV_STORES_VERBOSE = (() => {
  try {
    if (!(import.meta && import.meta.env && import.meta.env.DEV)) return false;
    if (typeof window === "undefined") return false;
    const urlFlag =
      window.location &&
      new URLSearchParams(window.location.search).get("debugStores") === "1";
    const lsFlag =
      window.localStorage &&
      window.localStorage.getItem("__ENABLE_VERBOSE_STORES__") === "1";
    return Boolean(urlFlag || lsFlag);
  } catch (e) {
    return false;
  }
})();

let promptStoreExport,
  contentStoreExport,
  previewStoreExport,
  uiStateStoreExport;

// Treat the global window as `any` for dev-only instrumentation to avoid
// TypeScript/IDE diagnostics when accessing test-only globals.
const globalAny =
  typeof window !== "undefined"
    ? /** @type {any} */ (window)
    : /** @type {any} */ ({});

// Defensive: ensure the global singleton container exists as early as possible.
// This helps avoid HMR/module-duplication scenarios where multiple module
// instances create separate stores. We intentionally only create the wrapper
// object here; individual stores are created below if missing.
try {
  if (typeof window !== "undefined") {
    /* Ensure a single global object is used by all module copies */
    globalAny[GLOBAL_STORES_KEY] = globalAny[GLOBAL_STORES_KEY] || {};
  }
} catch (e) {
  // Swallow - defensive only for environments where `window` may be sealed.
}

// If a global container exists, prefer reusing any stores it already has.
// Do not delete or overwrite the global object; instead merge missing
// store references to avoid races with HMR and to keep the object stable.
try {
  if (typeof window !== "undefined") {
    const g = /** @type {any} */ (globalAny)[GLOBAL_STORES_KEY];
    if (g && typeof g === "object") {
      try {
        // If other module copies already provided store instances, reuse them.
        promptStoreExport = promptStoreExport || g.promptStore;
        contentStoreExport = contentStoreExport || g.contentStore;
        previewStoreExport = previewStoreExport || g.previewStore;
        uiStateStoreExport = uiStateStoreExport || g.uiStateStore;
      } catch (e) {
        // If reading properties fails for some reason, fall back to creation below.
      }
    }
  }
} catch (e) {
  // swallow - defensive only
}

if (!promptStoreExport) {
  promptStoreExport = devWritable("promptStore", "");
  contentStoreExport = devWritable("contentStore", null);
  previewStoreExport = devWritable("previewStore", "");
  uiStateStoreExport = devWritable("uiStateStore", {
    status: "idle",
    message: "",
  });

  if (typeof window !== "undefined") {
    try {
      // Merge into existing global container without overwriting it. This keeps
      // the same object reference across HMR reloads while allowing new
      // properties to be added by the first module that initializes them.
      const g = /** @type {any} */ (globalAny)[GLOBAL_STORES_KEY] || {};
      g.promptStore = g.promptStore || promptStoreExport;
      g.contentStore = g.contentStore || contentStoreExport;
      g.previewStore = g.previewStore || previewStoreExport;
      g.uiStateStore = g.uiStateStore || uiStateStoreExport;
      g.__marker = g.__marker || "strawberry-stores-v1";
      globalAny[GLOBAL_STORES_KEY] = g;
    } catch (e) {
      // swallow - defensive
    }
  }
}

// Attach small instance ids to each store object to aid runtime debugging
try {
  const INSTANCE_ID = (
    Math.random().toString(36) + Date.now().toString(36)
  ).slice(2, 12);
  try {
    if (contentStoreExport && typeof contentStoreExport === "object")
      contentStoreExport.__instanceId =
        contentStoreExport.__instanceId || INSTANCE_ID;
  } catch (e) {}
  try {
    if (previewStoreExport && typeof previewStoreExport === "object")
      previewStoreExport.__instanceId =
        previewStoreExport.__instanceId || INSTANCE_ID;
  } catch (e) {}
  try {
    if (promptStoreExport && typeof promptStoreExport === "object")
      promptStoreExport.__instanceId =
        promptStoreExport.__instanceId || INSTANCE_ID;
  } catch (e) {}
  try {
    if (uiStateStoreExport && typeof uiStateStoreExport === "object")
      uiStateStoreExport.__instanceId =
        uiStateStoreExport.__instanceId || INSTANCE_ID;
  } catch (e) {}
  try {
    if (
      typeof window !== "undefined" &&
      /** @type {any} */ (globalAny)[GLOBAL_STORES_KEY]
    )
      /** @type {any} */ (globalAny)[GLOBAL_STORES_KEY].__instanceId =
        /** @type {any} */ (globalAny)[GLOBAL_STORES_KEY].__instanceId ||
        INSTANCE_ID;
  } catch (e) {}
} catch (e) {}

export const contentStore = contentStoreExport;

// DEV instrumentation: expose last set value and log when contentStore is updated
if (typeof window !== "undefined") {
  try {
    const originalSet = contentStore.set;
    contentStore.set = function (v) {
      try {
        // Only perform verbose console logging when explicitly enabled
        if (DEV_STORES_VERBOSE)
          console.debug("[DEV] contentStore.set called with", v);
        // assign into globalAny to avoid TypeScript window property errors
        try {
          if (globalAny.__LAST_CONTENT_SET !== v)
            globalAny.__LAST_CONTENT_SET = v;
        } catch (e) {}
      } catch (e) {}
      return originalSet.call(this, v);
    };
  } catch (e) {}
}

/**
 * Persist content to the server prompts API.
 * If `content.promptId` exists, perform an update; otherwise create a new prompt.
 * Returns the persisted content object from the server.
 */
export async function persistContent(content) {
  if (!content) throw new Error("No content provided to persistContent");
  try {
    let persisted;
    if (content.promptId) {
      persisted = await updatePromptContent(content.promptId, content);
    } else {
      persisted = await savePromptContent(content);
    }
    // Update local store with server-provided data
    try {
      console.debug("[DEV] persistContent: updating contentStore with", {
        content,
        persisted,
      });
    } catch (e) {}
    contentStore.set({ ...(content || {}), ...(persisted || {}) });
    return persisted;
  } catch (err) {
    console.warn("persistContent failed", err && err.message);
    throw err;
  }
}

/**
 * Store for the HTML preview.
 * @type {import('svelte/store').Writable<string>}
 */
export const previewStore = previewStoreExport;

// DEV instrumentation: expose last set value and log when previewStore is updated
if (typeof window !== "undefined") {
  try {
    const originalPreviewSet = previewStore.set;
    previewStore.set = function (v) {
      try {
        if (DEV_STORES_VERBOSE)
          console.debug(
            "[DEV] previewStore.set called with length=",
            v ? v.length || 0 : 0
          );
        // assign into globalAny to avoid TypeScript window property errors
        try {
          // Frequency detection: record timestamps of recent preview updates
          const now = Date.now();
          globalAny.__PREVIEW_SET_HISTORY__ =
            globalAny.__PREVIEW_SET_HISTORY__ || [];
          globalAny.__PREVIEW_SET_HISTORY__.push(now);
          // keep last N entries
          if (globalAny.__PREVIEW_SET_HISTORY__.length > 20)
            globalAny.__PREVIEW_SET_HISTORY__.shift();

          // If updates are very frequent (e.g. >5 updates in 2s), capture a
          // lightweight stack sample to help identify the writer. Store it
          // once to avoid repeated heavy work.
          const recent = globalAny.__PREVIEW_SET_HISTORY__.filter(
            (ts) => now - ts < 2000
          ).length;
          if (recent > 5 && !globalAny.__PREVIEW_HIGH_FREQ_SAMPLE__) {
            try {
              const stack = new Error("preview-set-sample").stack;
              globalAny.__PREVIEW_HIGH_FREQ_SAMPLE__ = {
                firstObservedAt: now,
                countIn2s: recent,
                stack: String(stack).split("\n").slice(0, 6).join("\n"),
              };
            } catch (e) {}
          }

          if (globalAny.__LAST_PREVIEW_SET !== v)
            globalAny.__LAST_PREVIEW_SET = v;
        } catch (e) {}
      } catch (e) {}
      return originalPreviewSet.call(this, v);
    };
  } catch (e) {}
}

// Export the promptStore singleton so all modules import the same instance
// Cast exports to `any` to avoid TypeScript diagnostics in the JS project
export const promptStore = /** @type {any} */ (promptStoreExport);

/**
 * Store for managing the overall UI state.
 * @type {import('svelte/store').Writable<{status: UIState, message: string}>}
 */
export const uiStateStore = uiStateStoreExport;

// Helper setters for consistent UI state transitions
export function setUiLoading(message = "") {
  uiStateStore.set({ status: "loading", message });
}

export function setUiSuccess(message = "") {
  uiStateStore.set({ status: "success", message });
}

export function setUiError(message = "") {
  uiStateStore.set({ status: "error", message });
}
