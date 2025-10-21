import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Run Vitest with the server package as the root so tests here don't
  // accidentally pick up tests from sibling packages.
  root: path.resolve(__dirname),
  test: {
    // include JS and MJS test files so ESM tests like export_text.test.mjs are picked up
    include: ["__tests__/**/*.test.js", "__tests__/**/*.test.mjs"],
    globals: true,
    environment: "node",
    // Default per-test timeout (ms). Puppeteer-driven PDF exports can take
    // longer than the default runner timeout, so set a reasonable package-
    // level default here to avoid sprinkling timeouts in tests.
    testTimeout: 20000,
    exclude: ["**/node_modules/**", "**/dist/**", "../**"],
  },
});
