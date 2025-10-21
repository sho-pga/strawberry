import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  plugins: [
    // Ensure the plugin reads the shared package's tsconfig.json so
    // the @utils path mapping is discovered when running tests from
    // the shared package directory.
    tsconfigPaths({ projects: [path.resolve(__dirname, "tsconfig.json")] }),
  ],
  resolve: {
    alias: [
      {
        find: /^@utils\/(.*)$/,
        replacement: path.resolve(__dirname, "utils/$1"),
      },
      { find: "@utils", replacement: path.resolve(__dirname, "utils") },
    ],
  },
  // Run Vitest from the shared package root so path aliases map to the
  // package's tsconfig, and so discovery only picks up shared tests.
  root: path.resolve(__dirname),
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.{test,spec}.{js,ts,mjs,mts}"],
    // Default per-test timeout for shared package tests (ms). Shared tests
    // may call utilities that take longer; this avoids repeated per-test
    // overrides.
    testTimeout: 10000,
    exclude: ["**/node_modules/**", "**/dist/**", "../**"],
  },
});
