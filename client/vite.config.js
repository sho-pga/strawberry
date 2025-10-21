import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env files so DEV_AUTH_TOKEN is available to the dev server proxy
  const env = loadEnv(mode, process.cwd(), "");
  const DEV_AUTH_TOKEN = env.DEV_AUTH_TOKEN || process.env.DEV_AUTH_TOKEN;

  return {
    plugins: [svelte()],
    server: {
      host: true, // Listen on all addresses
      port: 5173,
      strictPort: true, // Exit if port is in use
      hmr: {
        // Enable HMR for GitHub Codespaces
        clientPort: 443,
        protocol: "wss",
        host: process.env.CODESPACE_NAME
          ? `${process.env.CODESPACE_NAME}-5173.app.github.dev`
          : "localhost",
      },
      proxy: {
        "/prompt": createProxy("/prompt", DEV_AUTH_TOKEN),
        "/preview": createProxy("/preview", DEV_AUTH_TOKEN),
        "/api": createProxy("/api", DEV_AUTH_TOKEN),
        "/override": createProxy("/override", DEV_AUTH_TOKEN),
        "/export": createProxy("/export", DEV_AUTH_TOKEN),
        "/health": createProxy("/health", DEV_AUTH_TOKEN)
      },
      fs: {
        strict: true,
        allow: [".."], // Allow serving files from one level up
      },
      headers: {
        // Ensure proper MIME types for Svelte files
        "*.svelte": {
          "Content-Type": "application/javascript",
        },
      },
    },
    resolve: {
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".svelte"],
    },
    optimizeDeps: {
      include: ["svelte"],
    },
  };
});

// Helper to build proxy configuration objects with consistent hooks
function createProxy(path, DEV_AUTH_TOKEN) {
  return {
    target: "http://localhost:3000",
    changeOrigin: true,
    secure: false,
    configure(proxy) {
      proxy.on("proxyReq", (proxyReq, req, res) => {
        try {
          if (DEV_AUTH_TOKEN) {
            proxyReq.setHeader("x-dev-auth", DEV_AUTH_TOKEN);
          }
        } catch (e) {}
      });
      proxy.on("proxyRes", (proxyRes, req, res) => {
        const backendError = proxyRes.headers["x-backend-error"];
        const requestId = proxyRes.headers["x-request-id"];
        if (backendError) res.setHeader("X-Backend-Error", backendError);
        if (requestId) res.setHeader("X-Request-Id", requestId);
      });
      proxy.on("error", (err, req, res) => {
        try {
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Bad Gateway",
                reason:
                  err && err.message ? String(err.message) : "proxy_error",
              })
            );
          }
        } catch (e) {}
      });
    },
  };
}
