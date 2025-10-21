import "./app.css";
import App from "./App.svelte";
import * as Stores from "./stores";

const app = new App({
  target: document.getElementById("app"),
});

// DEV helper: expose stores for interactive debugging in the browser
// DEV helper: expose stores for interactive debugging in the browser.
// Keep this opt-in to avoid accidental console spam from repeated
// `console.log(window.__STORES)` usage. Enable by adding `?debugStores=1`
// to the app URL or by setting localStorage.__ENABLE_STRAWBERRY_STORES__ = '1'.
if (typeof window !== "undefined") {
  try {
    const isDev = import.meta && import.meta.env && import.meta.env.DEV;
    const urlFlag =
      typeof window !== "undefined" &&
      window.location &&
      new URLSearchParams(window.location.search).get("debugStores") === "1";
    const lsFlag =
      typeof window !== "undefined" &&
      window.localStorage &&
      window.localStorage.getItem("__ENABLE_STRAWBERRY_STORES__") === "1";
    const enabled = Boolean(isDev && (urlFlag || lsFlag));
    if (enabled) {
      // Define as a non-writable property to avoid accidental reassignment
      if (!Object.prototype.hasOwnProperty.call(window, "__STORES")) {
        Object.defineProperty(window, "__STORES", {
          value: Stores,
          writable: false,
          configurable: true,
          enumerable: false,
        });
      }
    }
  } catch (e) {}
}

export default app;
