// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Basic Express server setup
// Load local environment variables from .env when present (dev only)
try {
  // eslint-disable-next-line global-require
  require("dotenv").config();
} catch (e) {
  // dotenv is optional; if it's not installed we'll ignore the error.
}
// Dev minimal mode: set DEV_MINIMAL=true to disable heavy infra and
// non-essential middleware to make local debugging deterministic.
const DEV_MINIMAL =
  process.env.DEV_MINIMAL === "1" || process.env.DEV_MINIMAL === "true";
if (DEV_MINIMAL) {
  console.log(
    "DEV_MINIMAL=true - running in minimal developer mode: rate-limiting, puppeteer readiness and related checks will be relaxed"
  );
}
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const puppeteer = require("puppeteer-core");
const db = require("./db");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const imageRewrite = require("./utils/imageRewrite");
const EXPORT_USE_LOCAL_IMAGES =
  process.env.EXPORT_USE_LOCAL_IMAGES === "1" ||
  process.env.EXPORT_USE_LOCAL_IMAGES === "true";
const app = express();
const PORT = process.env.PORT || 3000;

async function rewriteImagesForExportAsync(html) {
  if (!EXPORT_USE_LOCAL_IMAGES) return html;
  const rasterize =
    process.env.EXPORT_RASTERIZE_SVG === "1" ||
    process.env.EXPORT_RASTERIZE_SVG === "true";
  // Prefer the async path which can rasterize inlined SVGs to PNG data-URIs
  if (typeof imageRewrite.rewriteDemoImagesAsync === "function") {
    return await imageRewrite.rewriteDemoImagesAsync(html, {
      inlineSvg: true,
      rasterizeSvg: rasterize,
    });
  }
  // Fallback to synchronous rewrite
  return imageRewrite.rewriteDemoImages(html, { inlineSvg: true });
}

// Serve sample images and assets for deterministic exports
try {
  const samplesDir = path.resolve(__dirname, "samples");
  if (fs.existsSync(samplesDir)) {
    app.use("/samples", express.static(samplesDir));
    console.log("Serving /samples from", samplesDir);
  }
} catch (e) {
  console.warn("Failed to register /samples static handler", e && e.message);
}

// --- Main Server Initialization Sequence ---
async function startServer(options = {}) {
  try {
    // 1. Initialize database first
    await db.initialize();
    serviceState.db.ready = true;
    serviceState.db.startupPhase = "ready";
    console.log("Database initialized successfully");

    // 1.b Initialize jobs DB for background export queue (optional)
    try {
      if (jobsModule && jobsModule.openJobsDb) {
        const jobsDbPath =
          process.env.JOBS_DB || path.join(process.cwd(), "data", "jobs.db");
        // Open and keep a handle to reuse across requests/workers
        module.exports._jobsDb = await jobsModule.openJobsDb(jobsDbPath);
        console.log("Jobs DB opened at", jobsDbPath);

        // Run one immediate recovery pass at startup so any stale 'processing'
        // jobs from a previous crash or shutdown are returned to 'queued'
        // before the regular recovery interval begins.
        try {
          const requeuedAtStart = await jobsModule.requeueStaleJobs(
            module.exports._jobsDb,
            parseInt(process.env.JOBS_STALE_MS) || 10 * 60 * 1000
          );
          if (requeuedAtStart && requeuedAtStart > 0) {
            console.log(
              `Startup recovery: requeued ${requeuedAtStart} stale jobs`
            );
          }
        } catch (e) {
          console.warn(
            "Startup requeueStaleJobs failed",
            e && e.message ? e.message : e
          );
        }

        // Start periodic recovery pass to requeue stale jobs
        const recoveryInterval =
          parseInt(process.env.JOBS_RECOVERY_INTERVAL_MS) || 5 * 60 * 1000; // default 5m
        module.exports._jobsRecoveryTimer = setInterval(async () => {
          try {
            const requeued = await jobsModule.requeueStaleJobs(
              module.exports._jobsDb,
              parseInt(process.env.JOBS_STALE_MS) || 10 * 60 * 1000
            );
            if (requeued && requeued > 0)
              console.log(`Requeued ${requeued} stale jobs`);
          } catch (e) {
            console.warn(
              "requeueStaleJobs failed",
              e && e.message ? e.message : e
            );
          }
        }, recoveryInterval);
      }
    } catch (e) {
      console.warn(
        "Failed to initialize jobs DB or recovery timer:",
        e && e.message ? e.message : e
      );
    }

    // 2. Then initialize Puppeteer (skip if explicitly disabled for tests)
    const skipPuppeteer =
      process.env.SKIP_PUPPETEER === "true" ||
      process.env.SKIP_PUPPETEER === "1";
    if (skipPuppeteer) {
      console.log(
        "SKIP_PUPPETEER=true - skipping Puppeteer initialization (test/CI mode)"
      );
      serviceState.puppeteer.startupPhase = "skipped";
      serviceState.puppeteer.ready = false;
    } else {
      await startPuppeteer();
    }

    // 3. Start the server only after all dependencies are ready
    // Decide whether to call app.listen: by default true, but tests should
    // avoid binding to the network to prevent EADDRINUSE when multiple
    // test workers import/start the server. The caller can override via
    // options.listen = true/false. We also auto-disable listening when
    // running under a test runner (NODE_ENV === 'test' or Vitest worker).
    const callerRequestedListen =
      options.listen !== undefined ? options.listen : true;
    const runningInTest =
      process.env.NODE_ENV === "test" || !!process.env.VITEST_WORKER_ID;
    const shouldListen = callerRequestedListen && !runningInTest;

    if (shouldListen) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server listening on port ${PORT}`);
      });
    } else {
      console.log(
        `startServer: Skipping app.listen (shouldListen=${shouldListen}, NODE_ENV=${process.env.NODE_ENV})`
      );
      // If running in tests, reduce startup grace to allow health checks to
      // consider services ready immediately. This prevents test suites from
      // failing due to the initial grace period.
      if (runningInTest) {
        serviceState.startupTime = Date.now() - STARTUP_GRACE_PERIOD_MS - 1000;
      }
    }
  } catch (err) {
    console.error("Failed to start the server:", err);
    process.exit(1); // Exit if critical services fail to start
  }
}

// Start the application only when running this file directly.
if (require.main === module) {
  startServer();
}

// Export the Express app for programmatic use in tests
module.exports = app;
// Also expose startServer so tests can programmatically initialize DB/Puppeteer
module.exports.startServer = startServer;
// Export a wrapper for previewTemplate so the module can be imported before
// the previewTemplate binding is created during module evaluation in tests.
module.exports.previewTemplate = (content) => {
  // previewTemplate will be defined later in this module; evaluate at call time
  return typeof previewTemplate === "function" ? previewTemplate(content) : "";
};
// Expose browserInstance for graceful shutdown in tests/scripts (may be undefined)
Object.defineProperty(module.exports, "browser", {
  enumerable: true,
  get: () => browserInstance,
});

// Graceful startup configuration
const STARTUP_GRACE_PERIOD_MS = 30000; // 30 seconds grace period
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

// Global service state management
const serviceState = {
  startupTime: Date.now(),
  puppeteer: {
    ready: false,
    transitioning: false,
    lastError: null,
    startupPhase: "initializing", // 'initializing' | 'connecting' | 'ready' | 'failed'
    retryCount: 0,
    lastRetryTime: null,
    successfulHealthChecks: 0,
  },
  db: {
    ready: false,
    lastError: null,
    startupPhase: "initializing",
  },
};

// Puppeteer global browser instance
let browserInstance;
const MAX_PUPPETEER_RESTARTS = 5;

async function startPuppeteer() {
  try {
    serviceState.puppeteer.transitioning = true;
    serviceState.puppeteer.startupPhase = "initializing";
    console.log(
      `[Puppeteer] Initialization attempt ${
        serviceState.puppeteer.retryCount + 1
      }/${MAX_PUPPETEER_RESTARTS}`
    );

    // Resolve Chrome executable path: prefer CHROME_PATH env var, then common system locations
    const preferredChrome = process.env.CHROME_PATH || process.env.CHROME_BIN;
    const possiblePaths = [
      preferredChrome,
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ].filter(Boolean);

    let executablePath;
    for (const p of possiblePaths) {
      try {
        if (p && fs.existsSync(p)) {
          executablePath = p;
          break;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!executablePath) {
      console.warn(
        `[Puppeteer] No system Chrome found in ${JSON.stringify(
          possiblePaths
        )}; falling back to Puppeteer's bundled Chromium if available.`
      );
    } else {
      console.log(`[Puppeteer] Using Chrome executable at: ${executablePath}`);
    }

    // Respect PUPPETEER_SKIP_CHROMIUM_DOWNLOAD during image build/install
    if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === "true") {
      console.log(
        "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true - will not download bundled Chromium on install."
      );
    }

    browserInstance = await puppeteer.launch({
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
      ],
      timeout: 30000,
      ignoreHTTPSErrors: true,
      headless: "new", // use newer headless mode when supported
      defaultViewport: { width: 1280, height: 720 }, // Set default viewport
    });

    // Advanced browser health checks
    const testPage = await browserInstance.newPage();
    await testPage.goto("data:text/html,<h1>Health Check</h1>");
    if (testPage.isClosed()) {
      throw new Error("Health check page closed unexpectedly");
    }
    await testPage.close();

    // Update state variables post-success
    Object.assign(serviceState.puppeteer, {
      ready: true,
      transitioning: false,
      lastError: null,
      startupPhase: "ready",
      successfulHealthChecks: 0,
    });

    console.log("[Puppeteer] Initialization successful");

    // Enhanced disconnect handler with delay
    browserInstance.on("disconnected", async () => {
      console.error("[Puppeteer] Browser disconnected");
      Object.assign(serviceState.puppeteer, {
        ready: false,
        transitioning: true,
        startupPhase: "reconnecting",
        lastError: "Browser disconnected",
      });
      await delay(5000); // Add a delay before retry
      await attemptPuppeteerRestart();
    });
  } catch (err) {
    handlePuppeteerError(err);
  } finally {
    // Always cleanup residual state
    if (!serviceState.puppeteer.ready) {
      console.error("[Puppeteer] Cleanup incomplete state");
    }
  }
}

// Helper function for retry delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handlePuppeteerError(err) {
  serviceState.puppeteer.ready = false;
  serviceState.puppeteer.transitioning = false;
  serviceState.puppeteer.lastError = err.message;
  serviceState.puppeteer.retryCount++;

  if (serviceState.puppeteer.retryCount < MAX_PUPPETEER_RESTARTS) {
    serviceState.puppeteer.startupPhase = "connecting";
    serviceState.puppeteer.lastRetryTime = Date.now();
    console.log(`[Puppeteer] Retrying in ${RETRY_DELAY_MS}ms...`);
    setTimeout(startPuppeteer, RETRY_DELAY_MS);
  } else {
    serviceState.puppeteer.startupPhase = "failed";
    console.error("[Puppeteer] Max retry attempts reached");
  }
}

function attemptPuppeteerRestart() {
  if (serviceState.puppeteer.retryCount < MAX_PUPPETEER_RESTARTS) {
    console.log("[Puppeteer] Attempting to restart Puppeteer...");
    startPuppeteer();
  } else {
    console.error(
      "Max Puppeteer restart attempts reached. Manual intervention required."
    );
  }
}

// Trust proxy for rate limiting
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
// Apply rate limiting, but allow a dev-only bypass via DISABLE_RATE_LIMIT=1
if (process.env.DISABLE_RATE_LIMIT === "1") {
  console.log("Rate limit disabled via DISABLE_RATE_LIMIT=1");
} else {
  if (!DEV_MINIMAL) {
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
  } else {
    console.log("DEV_MINIMAL=true - skipping rate limiting middleware");
  }
}

// Ensure logs directory exists
const logsDir = path.resolve(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir);
  } catch (e) {
    console.warn("Failed to create logs directory:", e.message);
  }
}

// Request ID middleware - help trace requests through proxies
app.use((req, res, next) => {
  try {
    req.id = uuidv4();
    res.setHeader("X-Request-Id", req.id);
    // Allow these headers to be visible to browser clients
    const existing = res.getHeader("Access-Control-Expose-Headers");
    const expose = existing
      ? `${existing},X-Request-Id,X-Backend-Error`
      : "X-Request-Id,X-Backend-Error";
    res.setHeader("Access-Control-Expose-Headers", expose);
  } catch (e) {
    // Don't block requests if UUID generation fails
  }
  next();
});

// Dev-only token auth middleware. Enable by setting DEV_AUTH_TOKEN in the
// environment. This protects the dev server if you need to make forwarded
// ports public during testing. It intentionally allows the root and health
// routes so platform readiness and probes continue to work.
// Only enable dev auth when explicitly running in development mode.
// This avoids unexpected 401s during automated test runs (NODE_ENV === 'test').
if (process.env.DEV_AUTH_TOKEN && process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    try {
      if (req.path === "/" || req.path === "/health") return next();
      const token =
        (req.headers &&
          (req.headers["x-dev-auth"] || req.headers["x-dev-token"])) ||
        req.query.dev_token;
      if (token === process.env.DEV_AUTH_TOKEN) return next();
      res.setHeader("WWW-Authenticate", 'Bearer realm="dev"');
      return res
        .status(401)
        .json({ error: "Unauthorized - dev token required" });
    } catch (e) {
      return res.status(500).json({ error: "Dev auth middleware failure" });
    }
  });
}

// Helper to check if we're still in grace period
function isInGracePeriod() {
  return Date.now() - serviceState.startupTime < STARTUP_GRACE_PERIOD_MS;
}

// Startup Readiness Probe Middleware
app.use((req, res, next) => {
  // Allow health check and root route to bypass readiness check
  if (req.path === "/health" || req.path === "/") {
    return next();
  }

  const timestamp = new Date().toISOString();

  // Allow tests and SKIP_PUPPETEER mode to bypass puppeteer readiness checks.
  const runningInTest =
    process.env.NODE_ENV === "test" || !!process.env.VITEST_WORKER_ID;
  const skipPuppeteer =
    process.env.SKIP_PUPPETEER === "true" ||
    process.env.SKIP_PUPPETEER === "1" ||
    runningInTest;

  // If puppeteer is transitioning and we're not in skip/test mode, fail readiness
  // In DEV_MINIMAL mode we relax Puppeteer readiness checks so local debug flows
  // don't get blocked by transient browser restarts.
  if (!DEV_MINIMAL && serviceState.puppeteer.transitioning && !skipPuppeteer) {
    return res.status(503).json({
      status: "error",
      reason: "Service transitioning: Puppeteer is restarting",
      timestamp,
      details: {
        puppeteerError: serviceState.puppeteer.lastError,
      },
    });
  }

  // If puppeteer isn't ready and we're not explicitly skipping it for tests/CI,
  // return 503. Tests or CI runs that don't require Puppeteer should set
  // SKIP_PUPPETEER=true or run under NODE_ENV=test so requests are allowed.
  if (
    !DEV_MINIMAL &&
    !skipPuppeteer &&
    (!serviceState.puppeteer.ready || !browserInstance)
  ) {
    return res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Service not ready",
      puppeteer: serviceState.puppeteer.transitioning
        ? "initializing"
        : "failed",
    });
  } else if (DEV_MINIMAL) {
    // In minimal dev mode, mark puppeteer as not-required so the server
    // remains responsive even when the headless browser is unavailable.
    // This is safe for local debugging and can be removed before production.
    serviceState.puppeteer.ready = false;
  }

  // If we reach here, services are ready
  next();
});

// Health endpoint
// Checks both SQLite3 and Puppeteer status
app.get("/health", async (req, res) => {
  try {
    const now = Date.now();
    const grace = isInGracePeriod();
    // Check Puppeteer readiness
    const puppeteerReady = serviceState.puppeteer.ready && browserInstance;
    // Check DB readiness
    const dbReady = serviceState.db.ready;

    // Run deeper health checks if not in grace period
    let puppeteerStatus = { ok: puppeteerReady, error: null };
    let dbStatus = { ok: dbReady, error: null };
    if (!grace) {
      [puppeteerStatus, dbStatus] = await Promise.all([
        checkPuppeteerHealth().catch((err) => ({
          ok: false,
          error: err.message,
        })),
        checkDatabaseHealth().catch((err) => ({
          ok: false,
          error: err.message,
        })),
      ]);
    }

    // Compose detailed health object
    const health = {
      status: grace
        ? "initializing"
        : puppeteerStatus.ok && dbStatus.ok
        ? "ok"
        : "error",
      timestamp: new Date().toISOString(),
      uptime: now - serviceState.startupTime,
      gracePeriod: grace,
      services: {
        puppeteer: {
          status: puppeteerStatus.ok ? "ok" : "error",
          phase: serviceState.puppeteer.startupPhase,
          error: puppeteerStatus.error || serviceState.puppeteer.lastError,
          healthChecks: serviceState.puppeteer.successfulHealthChecks,
          ready: serviceState.puppeteer.ready,
          transitioning: serviceState.puppeteer.transitioning,
          retryCount: serviceState.puppeteer.retryCount,
        },
        db: {
          status: dbStatus.ok ? "ok" : "error",
          error: dbStatus.error || serviceState.db.lastError,
          phase: serviceState.db.startupPhase,
          ready: serviceState.db.ready,
        },
      },
    };

    // Log health check details for diagnostics
    if (health.status !== "ok") {
      console.warn("[Health] Not ready:", JSON.stringify(health, null, 2));
    }

    if (health.status === "ok") {
      serviceState.puppeteer.successfulHealthChecks++;
      serviceState.db.ready = true;
      serviceState.db.lastError = null;
      return res.status(200).json(health);
    }

    // If not ready, return 503 with details
    res.status(503).json(health);
  } catch (error) {
    console.error("[Health Check Error]", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        puppeteer: {
          status: "error",
          phase: serviceState.puppeteer.startupPhase,
          error: error.message,
        },
        db: {
          status: "error",
          phase: serviceState.db.startupPhase,
          error: error.message,
        },
      },
    });
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("Hello, world! Your Express server is running.");
});

// Test error route
app.get("/test-error", (req, res, next) => {
  const err = new Error("Simulated error for testing");
  err.status = 418;
  next(err);
});

// Centralized error handler (moved to the end of the file so it can catch
// errors from routes defined below). See the bottom of this file for the
// actual handler implementation.

const crud = require("./crud");

// Ebook renderer helper
const { renderBookToPDF } = require("./ebook");
const { generateBackgroundForPoem } = require("./imageGenerator.cjs");

// --- PROMPT PROCESSING ENDPOINT ---
// DEV: quick deterministic handler for local testing.
// If the client sends POST /prompt?dev=true we return a deterministic
// mock content payload and skip DB writes and AI service calls. This keeps
// local UI/integration tests fast and isolated.
app.post("/prompt", (req, res, next) => {
  try {
    const dev =
      req.query && (req.query.dev === "true" || req.query.dev === "1");
    if (!dev) return next();

    const prompt = req.body && req.body.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res
        .status(400)
        .json({ error: "Prompt is required and must be a non-empty string" });
    }

    const title = `Dev: ${prompt.split(" ").slice(0, 6).join(" ")}`;
    const body = `Deterministic dev preview for prompt: ${prompt}`;
    return res.status(201).json({
      success: true,
      data: { content: { title, body, layout: "dev" } },
    });
  } catch (e) {
    return next(e);
  }
});

const { service: serviceImpl } = require("./serviceAdapter");
// Demo genieService (delegates to sampleService) used by POST /prompt
const genieService = require("./genieService");

app.post("/prompt", async (req, res, next) => {
  const { prompt } = req.body;

  // Input validation with structured error
  if (typeof prompt !== "string" || !prompt.trim()) {
    return sendValidationError(
      res,
      "Prompt is required and must be a non-empty string",
      {
        provided: typeof prompt,
        required: "non-empty string",
      }
    );
  }

  try {
    // Default to the demo genieService which delegates to sampleService.
    // This keeps the frontend wiring unchanged while allowing the demo
    // implementation to run locally without client changes.
    const genieResult = await genieService.generate(prompt);

    // Ensure we have a data envelope to return
    const data = genieResult && genieResult.data ? { ...genieResult.data } : {};

    // Attempt to persist prompt and ai result to DB for compatibility with
    // downstream flows. Failures to persist should not block the demo response.
    try {
      const dbResult = await crud.createPrompt(prompt);
      data.promptId = dbResult && dbResult.id ? dbResult.id : null;
      try {
        // Create an AI result record using the genie content as the result
        const aiResult = await crud.createAIResult(data.promptId, {
          content: data.content,
          metadata: {},
        });
        data.resultId = aiResult && aiResult.id ? aiResult.id : null;
      } catch (e) {
        // Non-fatal: log and continue
        console.warn(
          "/prompt: failed to create AI result record",
          e && e.message
        );
      }
    } catch (e) {
      // Non-fatal persistence failure; continue returning the demo payload
      console.warn("/prompt: failed to persist prompt to DB", e && e.message);
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    // Surface generator errors consistently
    err.status = err.status || 500;
    err.message = `Generation Error: ${err.message}`;
    next(err);
  }
});

// --- PREVIEW ENDPOINT ---
// Import error handling utilities
const { sendValidationError } = require("./utils/errorHandler");

const previewTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    .preview { max-width: 800px; margin: 2rem auto; font-family: system-ui; }
    .preview h1 { color: #2c3e50; }
    .preview .content { line-height: 1.6; }
  </style>
</head>
<body>
  <div class="preview">
    <h1>${content.title}</h1>
    <div class="content">${content.body}</div>
  </div>
</body>
</html>
`;

// NOTE: image rewrite is handled by `rewriteImagesForExportAsync` above.

app.get("/preview", async (req, res) => {
  const { content, resultId, promptId } = req.query;

  // If content not provided, try to load it from DB using resultId or promptId
  let contentPayload = content || null;
  try {
    if (!contentPayload && resultId) {
      const id = parseInt(resultId, 10);
      if (!isNaN(id)) {
        try {
          const row = await crud.getAIResultById(id);
          if (row) {
            // row.result may be a JSON string or an object
            const resultObj =
              typeof row.result === "string"
                ? JSON.parse(row.result)
                : row.result;
            // Prefer resultObj.content if present
            const usable =
              resultObj && resultObj.content ? resultObj.content : resultObj;
            contentPayload = JSON.stringify(usable);
          }
        } catch (e) {
          // ignore DB lookup errors here; validation will handle missing content
          console.warn(
            "/preview: failed to load result by id",
            id,
            e && e.message
          );
        }
      }
    }

    if (!contentPayload && promptId) {
      const pid = parseInt(promptId, 10);
      if (!isNaN(pid)) {
        try {
          // Try to find latest AI result for this prompt
          const results = await crud.getAIResults();
          const filtered = results
            .filter((r) => r.prompt_id === pid)
            .sort((a, b) => (a.id || 0) - (b.id || 0));
          const latest = filtered.length ? filtered[filtered.length - 1] : null;
          if (latest) {
            const resultObj =
              typeof latest.result === "string"
                ? JSON.parse(latest.result)
                : latest.result;
            const usable =
              resultObj && resultObj.content ? resultObj.content : resultObj;
            contentPayload = JSON.stringify(usable);
          }
        } catch (e) {
          console.warn(
            "/preview: failed to load latest result for prompt",
            pid,
            e && e.message
          );
        }
      }
    }

    // Validate required parameter
    if (!contentPayload) {
      return sendValidationError(res, "Content parameter is required");
    }

    let contentObj = JSON.parse(contentPayload);

    // Support legacy envelope: { content: { title, body } }
    if (contentObj && typeof contentObj === "object" && contentObj.content) {
      contentObj = contentObj.content;
    }

    // Validate content structure
    if (!contentObj || !contentObj.title || !contentObj.body) {
      return sendValidationError(res, "Content must include title and body", {
        provided:
          contentObj && typeof contentObj === "object"
            ? Object.keys(contentObj)
            : typeof contentObj,
      });
    }

    res.send(previewTemplate(contentObj));
  } catch (err) {
    sendValidationError(res, "Invalid content format", { error: err.message });
  }
});

// Demo generator endpoints using the selected service implementation
app.post("/genie", async (req, res) => {
  try {
    const prompt = req.body && req.body.prompt;
    const result = await serviceImpl.generate(prompt);
    return res.status(201).json(result);
  } catch (err) {
    console.error("/genie error", err && err.message);
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: err && err.message });
  }
});

app.get("/genie", (req, res) => {
  try {
    const txt = serviceImpl.readLatest ? serviceImpl.readLatest() : null;
    if (txt === null) return sendValidationError(res, "No saved prompt found");
    const content = {
      title: `Prompt: ${txt.split(" ").slice(0, 6).join(" ")}`,
      body: txt.replace(/\n/g, "<br />"),
    };
    res.setHeader("Content-Type", "text/html");
    return res.send(previewTemplate(content));
  } catch (err) {
    console.error("/genie GET error", err && err.message);
    return res.status(500).json({ error: err && err.message });
  }
});

// DEV-ONLY: return the rewritten HTML that will be used for export so
// we can inspect whether SVGs were inlined or rasterized to data-URIs.
// Only enable when running in development mode so tests are not affected.
if (process.env.DEV_AUTH_TOKEN && process.env.NODE_ENV === "development") {
  app.post("/debug/export-html", async (req, res) => {
    const token = req.headers["x-dev-auth"] || req.query.dev_token;
    if (token !== process.env.DEV_AUTH_TOKEN)
      return res.status(401).json({ error: "Unauthorized" });
    const { title, body } = req.body || {};
    if (!title || !body)
      return res.status(400).json({ error: "title and body required" });
    try {
      const contentObj = { title, body };
      const htmlToRender = await rewriteImagesForExportAsync(
        previewTemplate(contentObj)
      );
      res.setHeader("Content-Type", "text/html");
      return res.send(htmlToRender);
    } catch (e) {
      return res.status(500).json({ error: e && e.message });
    }
  });
}

// Backwards-compatible API route to accept JSON body for preview requests
app.post("/api/preview", (req, res) => {
  const content = req.body && (req.body.content || req.body);

  // Validate required parameter
  if (!content) {
    return sendValidationError(res, "Content parameter is required", {
      provided: typeof req.body,
      required: "object with content or direct content",
    });
  }

  try {
    const contentObj =
      typeof content === "string" ? JSON.parse(content) : content;

    // Validate content structure
    if (!contentObj.title || !contentObj.body) {
      return sendValidationError(res, "Content must include title and body", {
        provided: Object.keys(contentObj),
      });
    }

    res.json({ preview: previewTemplate(contentObj), metadata: {} });
  } catch (err) {
    sendValidationError(res, "Invalid content format", { error: err.message });
  }
});

// --- OVERRIDE ENDPOINT ---
app.post("/override", (req, res) => {
  const { content, changes } = req.body;

  // Enhanced input validation
  if (!content) {
    return sendValidationError(res, "Content is required", {
      provided: typeof content,
      required: "object",
    });
  }

  if (!changes) {
    return sendValidationError(res, "Changes are required", {
      provided: typeof changes,
      required: "object",
    });
  }

  if (typeof content !== "object" || content === null) {
    return sendValidationError(res, "Content must be an object", {
      provided: content === null ? "null" : typeof content,
      required: "object",
    });
  }

  try {
    const updated = { ...content, ...changes };
    res.status(200).json({
      success: true,
      data: {
        content: updated,
      },
    });
  } catch (err) {
    sendValidationError(res, "Failed to update content", {
      error: err.message,
    });
  }
});

// --- PDF EXPORT ENDPOINT ---
// Backwards-compatible export endpoint: accept GET with query or POST with JSON body
app.post("/api/export", async (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const {
    sendValidationError,
    sendProcessingError,
    sendServiceUnavailableError,
  } = require("./utils/errorHandler");

  const { title, body } = req.body || {};
  if (!title || !body) {
    return sendValidationError(res, "Content must include title and body", {
      provided: Object.keys(req.body || {}),
      required: ["title", "body"],
    });
  }

  // Use the same synchronous fallback logic as the GET /export route
  let page;
  try {
    if (!serviceState.puppeteer.ready || !browserInstance) {
      return sendServiceUnavailableError(
        res,
        "PDF generation service not ready",
        {
          code: "SERVICE_UNAVAILABLE",
        }
      );
    }

    page = await browserInstance.newPage();
    if (!page) throw new Error("Failed to create browser page");

    const contentObj = { title, body };
    const htmlToRender = await rewriteImagesForExportAsync(
      previewTemplate(contentObj)
    );
    const EXPORT_BASE_URL =
      process.env.EXPORT_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    await page.setContent(htmlToRender, {
      waitUntil: "networkidle2",
      timeout: 60000,
      url: EXPORT_BASE_URL,
    });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    try {
      const dumpsDir = path.resolve(__dirname, "tmp-exports");
      if (!fs.existsSync(dumpsDir)) fs.mkdirSync(dumpsDir, { recursive: true });
      const dumpPath = path.join(dumpsDir, `export-${Date.now()}.pdf`);
      fs.writeFileSync(dumpPath, pdfBuffer);
      console.log("Wrote export artifact:", dumpPath);
    } catch (e) {
      console.warn("Failed to write export artifact:", e && e.message);
    }

    // Run light validation on the produced PDF. If validation reports fatal
    // errors, surface a 422 so callers can handle export validation failures
    // explicitly (per RFC contract). Warnings do not block the response.
    try {
      const { validatePdfBuffer } = require("./pdfGenerator");
      const validation = await validatePdfBuffer(pdfBuffer);
      if (!validation || validation.ok === false) {
        return res.status(422).json({
          ok: false,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          pageCount: validation.pageCount || 0,
        });
      }
    } catch (valErr) {
      // If validation tooling fails unexpectedly, log and continue to return
      // the PDF as a best-effort fallback (do not block on validator availability).
      console.warn("PDF validation failed to run:", valErr && valErr.message);
    }

    // Successful binary response; keep binary behaviour for clients
    res.setHeader("Content-Disposition", `inline; filename=export.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
    return;
  } catch (err) {
    console.error("Export generation error", err);
    // Use standardized processing error payload
    return sendProcessingError(res, `PDF Generation Failed: ${err.message}`, {
      code: "PDF_GENERATION_ERROR",
    });
  } finally {
    if (page) await page.close();
  }
});

// Backwards-compatible POST /export for legacy clients that post to /export
app.post("/export", async (req, res) => {
  const {
    sendValidationError,
    sendProcessingError,
    sendServiceUnavailableError,
  } = require("./utils/errorHandler");

  const { title, body } = req.body || {};
  if (!title || !body) {
    return sendValidationError(res, "Content must include title and body", {
      provided: Object.keys(req.body || {}),
      required: ["title", "body"],
    });
  }

  let page;
  try {
    if (!serviceState.puppeteer.ready || !browserInstance) {
      return sendServiceUnavailableError(
        res,
        "PDF generation service not ready",
        {
          code: "SERVICE_UNAVAILABLE",
        }
      );
    }

    page = await browserInstance.newPage();
    if (!page) throw new Error("Failed to create browser page");

    const contentObj = { title, body };
    const htmlToRender = await rewriteImagesForExportAsync(
      previewTemplate(contentObj)
    );
    const EXPORT_BASE_URL =
      process.env.EXPORT_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    await page.setContent(htmlToRender, {
      waitUntil: "networkidle2",
      timeout: 60000,
      url: EXPORT_BASE_URL,
    });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    try {
      const { validatePdfBuffer } = require("./pdfGenerator");
      const validation = await validatePdfBuffer(pdfBuffer);
      if (!validation || validation.ok === false) {
        return res.status(422).json({
          ok: false,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          pageCount: validation.pageCount || 0,
        });
      }
    } catch (valErr) {
      console.warn("PDF validation failed to run:", valErr && valErr.message);
    }

    res.setHeader("Content-Disposition", `inline; filename=export.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
    return;
  } catch (err) {
    console.error("Export generation error", err);
    return sendProcessingError(res, `PDF Generation Failed: ${err.message}`, {
      code: "PDF_GENERATION_ERROR",
    });
  } finally {
    if (page) await page.close();
  }
});

// Maintain existing GET /export behaviour for legacy clients (keeps file save path)
app.get("/export", async (req, res) => {
  // Backwards-compatible GET /export that accepts ?content=<json>
  // Harmonized to use the standardized error response helpers and
  // to return binary PDF with proper headers.
  const { content } = req.query;
  const {
    sendValidationError,
    sendProcessingError,
    sendServiceUnavailableError,
  } = require("./utils/errorHandler");

  if (!content) {
    return sendValidationError(res, "Content parameter is required");
  }

  let page;
  try {
    const contentObj = JSON.parse(content);

    if (!serviceState.puppeteer.ready || !browserInstance) {
      return sendServiceUnavailableError(
        res,
        "PDF generation service not ready",
        { code: "SERVICE_UNAVAILABLE" }
      );
    }

    page = await browserInstance.newPage();
    if (!page) throw new Error("Failed to create browser page");

    const htmlToRender = await rewriteImagesForExportAsync(
      previewTemplate(contentObj)
    );
    const EXPORT_BASE_URL =
      process.env.EXPORT_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    await page.setContent(htmlToRender, {
      waitUntil: "networkidle2",
      timeout: 60000,
      url: EXPORT_BASE_URL,
    });
    const pdf = await page.pdf({ format: "A4", printBackground: true });

    // Set headers to match POST export endpoints
    res.setHeader("Content-Disposition", `inline; filename=export.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdf.length);
    res.end(pdf);
    return;
  } catch (err) {
    console.error("Export generation error (GET /export)", err);
    return sendProcessingError(res, `PDF Generation Failed: ${err.message}`, {
      code: "PDF_GENERATION_ERROR",
    });
  } finally {
    if (page) await page.close();
  }
});

// --- PROMPTS CRUD API ---
app.post("/api/prompts", (req, res, next) => {
  const { prompt } = req.body;

  // Input validation with structured error
  if (typeof prompt !== "string" || !prompt.trim()) {
    return sendValidationError(
      res,
      "Prompt is required and must be a non-empty string",
      {
        provided: typeof prompt,
        required: "non-empty string",
        received: prompt,
      }
    );
  }

  (async () => {
    try {
      const result = await crud.createPrompt(prompt);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.code === "SQLITE_CONSTRAINT") {
        err.status = 409;
        err.message = "Duplicate prompt not allowed";
      } else {
        err.status = 500;
        err.message = "Failed to create prompt";
      }
      next(err);
    }
  })();
});

app.get("/api/prompts", (req, res, next) => {
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Validate pagination parameters
  if (page < 1 || limit < 1) {
    return sendValidationError(res, "Invalid pagination parameters", {
      provided: { page, limit },
      required: "positive integers",
      details: "Page and limit must be greater than 0",
    });
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  (async () => {
    try {
      const rows = await crud.getPrompts();
      if (!rows || rows.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      const total = rows.length;
      const pages = Math.ceil(total / limit);
      const paginatedRows = rows.slice(offset, offset + limit);
      res.status(200).json({
        success: true,
        data: paginatedRows,
        pagination: { page, limit, total, pages },
      });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to retrieve prompts";
      next(err);
    }
  })();
});

app.get("/api/prompts/:id", (req, res, next) => {
  // Validate ID parameter
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid prompt ID", {
      provided: req.params.id,
      required: "positive integer",
      details: "Prompt ID must be a positive integer",
    });
  }

  (async () => {
    try {
      const row = await crud.getPromptById(id);
      if (!row) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Prompt not found",
            code: "RESOURCE_NOT_FOUND",
            status: 404,
            details: { id },
          },
        });
      }
      res.status(200).json({ success: true, data: row });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to retrieve prompt";
      next(err);
    }
  })();
});

app.put("/api/prompts/:id", (req, res, next) => {
  // Validate ID parameter
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid prompt ID", {
      provided: req.params.id,
      required: "positive integer",
      details: "Prompt ID must be a positive integer",
    });
  }

  // Validate prompt in request body
  const { prompt } = req.body;
  if (typeof prompt !== "string" || !prompt.trim()) {
    return sendValidationError(
      res,
      "Prompt is required and must be a non-empty string",
      {
        provided: typeof prompt,
        required: "non-empty string",
        received: prompt,
      }
    );
  }

  (async () => {
    try {
      const result = await crud.updatePrompt(id, prompt);
      if (!result || result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Prompt not found",
            code: "RESOURCE_NOT_FOUND",
            status: 404,
            details: { id },
          },
        });
      }
      res.status(200).json({
        success: true,
        data: { id, prompt, updated_at: new Date().toISOString() },
        changes: result.changes,
      });
    } catch (err) {
      if (err.code === "SQLITE_CONSTRAINT") {
        err.status = 409;
        err.message = "Duplicate prompt not allowed";
      } else {
        err.status = 500;
        err.message = "Failed to update prompt";
      }
      next(err);
    }
  })();
});

app.delete("/api/prompts/:id", (req, res, next) => {
  // Validate ID parameter
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid prompt ID", {
      provided: req.params.id,
      required: "positive integer",
      details: "Prompt ID must be a positive integer",
    });
  }

  (async () => {
    try {
      const result = await crud.deletePrompt(id);
      if (!result || result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Prompt not found",
            code: "RESOURCE_NOT_FOUND",
            status: 404,
            details: { id },
          },
        });
      }
      res.status(200).json({
        success: true,
        data: {
          message: "Prompt deleted successfully",
          id,
          deleted_at: new Date().toISOString(),
        },
        changes: result.changes,
      });
    } catch (err) {
      if (err.code === "SQLITE_FOREIGN_KEY") {
        err.status = 409;
        err.message = "Cannot delete prompt: It is referenced by other records";
      } else {
        err.status = 500;
        err.message = "Failed to delete prompt";
      }
      next(err);
    }
  })();
});

// --- AI_RESULTS CRUD API ---
app.post("/api/ai_results", (req, res, next) => {
  const { prompt_id, result } = req.body;

  // Validate prompt_id
  if (!Number.isInteger(prompt_id) || prompt_id < 1) {
    return sendValidationError(res, "prompt_id must be a positive integer", {
      provided: typeof prompt_id === "number" ? prompt_id : typeof prompt_id,
      required: "positive integer",
      details: "prompt_id must be a valid prompt reference",
    });
  }

  // Validate result object
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return sendValidationError(res, "result must be a valid object", {
      provided: Array.isArray(result) ? "array" : typeof result,
      required: "object",
      details: "result must contain the AI generation output",
    });
  }

  // Validate required result properties
  const requiredProps = ["content", "metadata"];
  const missingProps = requiredProps.filter((prop) => !(prop in result));
  if (missingProps.length > 0) {
    return sendValidationError(res, "Missing required properties in result", {
      missing: missingProps,
      required: requiredProps,
      provided: Object.keys(result),
    });
  }

  (async () => {
    try {
      const resultObj = await crud.createAIResult(prompt_id, result);
      res.status(201).json({
        success: true,
        data: { ...resultObj, created_at: new Date().toISOString() },
      });
    } catch (err) {
      if (err.code === "SQLITE_FOREIGN_KEY") {
        err.status = 404;
        err.message = "Referenced prompt not found";
      } else if (err.code === "SQLITE_CONSTRAINT") {
        err.status = 409;
        err.message = "Duplicate AI result not allowed";
      } else {
        err.status = 500;
        err.message = "Failed to create AI result";
      }
      next(err);
    }
  })();
});

app.get("/api/ai_results", (req, res, next) => {
  // Parse and validate pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const prompt_id = req.query.prompt_id ? parseInt(req.query.prompt_id) : null;

  // Validate pagination parameters
  if (page < 1 || limit < 1) {
    return sendValidationError(res, "Invalid pagination parameters", {
      provided: { page, limit },
      required: "positive integers",
      details: "Page and limit must be greater than 0",
    });
  }

  // Validate prompt_id if provided
  if (prompt_id !== null && (isNaN(prompt_id) || prompt_id < 1)) {
    return sendValidationError(res, "Invalid prompt_id filter", {
      provided: req.query.prompt_id,
      required: "positive integer",
      details: "prompt_id must be a positive integer",
    });
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  (async () => {
    try {
      const rows = await crud.getAIResults();
      let filteredRows = rows;
      if (prompt_id)
        filteredRows = rows.filter((row) => row.prompt_id === prompt_id);
      if (!filteredRows || filteredRows.length === 0)
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      const total = filteredRows.length;
      const pages = Math.ceil(total / limit);
      const paginatedRows = filteredRows.slice(offset, offset + limit);
      res.status(200).json({
        success: true,
        data: paginatedRows,
        pagination: {
          page,
          limit,
          total,
          pages,
          prompt_id: prompt_id || undefined,
        },
      });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to retrieve AI results";
      next(err);
    }
  })();
});

app.get("/api/ai_results/:id", (req, res, next) => {
  // Validate ID parameter
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid AI result ID", {
      provided: req.params.id,
      required: "positive integer",
      details: "AI result ID must be a positive integer",
    });
  }

  (async () => {
    try {
      const row = await crud.getAIResultById(id);
      if (!row)
        return res.status(404).json({
          success: false,
          error: {
            message: "AI result not found",
            code: "RESOURCE_NOT_FOUND",
            status: 404,
            details: { id },
          },
        });
      res.status(200).json({
        success: true,
        data: {
          ...row,
          result:
            typeof row.result === "string"
              ? JSON.parse(row.result)
              : row.result,
        },
      });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to retrieve AI result";
      next(err);
    }
  })();
});

app.put("/api/ai_results/:id", (req, res, next) => {
  // Validate ID parameter
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid AI result ID", {
      provided: req.params.id,
      required: "positive integer",
      details: "AI result ID must be a positive integer",
    });
  }

  // Validate result object
  const { result } = req.body;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return sendValidationError(res, "result must be a valid object", {
      provided: Array.isArray(result) ? "array" : typeof result,
      required: "object",
      details: "result must contain the AI generation output",
    });
  }

  // Validate required result properties
  const requiredProps = ["content", "metadata"];
  const missingProps = requiredProps.filter((prop) => !(prop in result));
  if (missingProps.length > 0) {
    return sendValidationError(res, "Missing required properties in result", {
      missing: missingProps,
      required: requiredProps,
      provided: Object.keys(result),
    });
  }

  (async () => {
    try {
      const resultObj = await crud.updateAIResult(id, result);
      if (!resultObj || resultObj.changes === 0)
        return res.status(404).json({
          success: false,
          error: {
            message: "AI result not found",
            code: "RESOURCE_NOT_FOUND",
            status: 404,
            details: { id },
          },
        });
      res.status(200).json({
        success: true,
        data: { id, result, updated_at: new Date().toISOString() },
      });
    } catch (err) {
      if (err.code === "SQLITE_CONSTRAINT") {
        err.status = 409;
        err.message = "Constraint violation in update";
      } else {
        err.status = 500;
        err.message = "Failed to update AI result";
      }
      next(err);
    }
  })();
});

app.delete("/api/ai_results/:id", (req, res, next) => {
  // Validate ID parameter
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid AI result ID", {
      provided: req.params.id,
      required: "positive integer",
      details: "AI result ID must be a positive integer",
    });
  }

  (async () => {
    try {
      const resultObj = await crud.deleteAIResult(id);
      if (!resultObj || resultObj.changes === 0)
        return res.status(404).json({
          success: false,
          error: {
            message: "AI result not found",
            code: "RESOURCE_NOT_FOUND",
            status: 404,
            details: { id },
          },
        });
      res.status(200).json({
        success: true,
        data: {
          message: "AI result deleted successfully",
          id,
          deleted_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      if (err.code === "SQLITE_FOREIGN_KEY") {
        err.status = 409;
        err.message =
          "Cannot delete AI result: It is referenced by other records";
      } else {
        err.status = 500;
        err.message = "Failed to delete AI result";
      }
      next(err);
    }
  })();
});

// --- OVERRIDES CRUD API ---
app.post("/api/overrides", (req, res, next) => {
  const { ai_result_id, override } = req.body;

  // Validate ai_result_id
  if (!Number.isInteger(ai_result_id) || ai_result_id < 1) {
    return sendValidationError(res, "ai_result_id must be a positive integer", {
      provided:
        typeof ai_result_id === "number" ? ai_result_id : typeof ai_result_id,
      required: "positive integer",
    });
  }

  // Validate override object
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return sendValidationError(res, "override must be a valid object", {
      provided: Array.isArray(override) ? "array" : typeof override,
      required: "object",
    });
  }

  (async () => {
    try {
      const result = await crud.createOverride(ai_result_id, override);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.code === "SQLITE_FOREIGN_KEY") {
        err.status = 404;
        err.message = "Referenced AI result not found";
      } else {
        err.status = 500;
        err.message = "Failed to create override";
      }
      next(err);
    }
  })();
});

app.get("/api/overrides", (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1 || limit < 1) {
    return sendValidationError(res, "Invalid pagination parameters", {
      provided: { page, limit },
      required: "positive integers",
    });
  }

  const offset = (page - 1) * limit;

  crud.getOverrides((err, rows) => {
    if (err) {
      err.status = 500;
      err.message = "Failed to retrieve overrides";
      return next(err);
    }

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    const total = rows.length;
    const pages = Math.ceil(total / limit);
    const paginatedRows = rows.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      data: paginatedRows,
      pagination: { page, limit, total, pages },
    });
  });
  (async () => {
    try {
      const rows = await crud.getOverrides();
      if (!rows || rows.length === 0)
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      const total = rows.length;
      const pages = Math.ceil(total / limit);
      const paginatedRows = rows.slice(offset, offset + limit);
      res.status(200).json({
        success: true,
        data: paginatedRows,
        pagination: { page, limit, total, pages },
      });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to retrieve overrides";
      next(err);
    }
  })();
});

app.get("/api/overrides/:id", (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid override ID", {
      provided: req.params.id,
      required: "positive integer",
    });
  }

  crud.getOverrideById(id, (err, row) => {
    if (err) {
      err.status = 500;
      err.message = "Failed to retrieve override";
      return next(err);
    }
    if (!row) {
      return res.status(404).json({
        success: false,
        error: { message: "Override not found", code: "RESOURCE_NOT_FOUND" },
      });
    }
    res.status(200).json({ success: true, data: row });
  });
});

app.put("/api/overrides/:id", (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid override ID", {
      provided: req.params.id,
      required: "positive integer",
    });
  }

  const { override } = req.body;
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return sendValidationError(res, "override must be a valid object", {
      provided: Array.isArray(override) ? "array" : typeof override,
      required: "object",
    });
  }

  crud.updateOverride(id, override, (err, result) => {
    if (err) {
      err.status = 500;
      err.message = "Failed to update override";
      return next(err);
    }
    if (!result || result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: { message: "Override not found", code: "RESOURCE_NOT_FOUND" },
      });
    }
    res.status(200).json({
      success: true,
      data: { id, ...override },
    });
  });
});

app.delete("/api/overrides/:id", (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid override ID", {
      provided: req.params.id,
      required: "positive integer",
    });
  }

  crud.deleteOverride(id, (err, result) => {
    if (err) {
      err.status = 500;
      err.message = "Failed to delete override";
      return next(err);
    }
    if (!result || result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: { message: "Override not found", code: "RESOURCE_NOT_FOUND" },
      });
    }
    res.status(200).json({
      success: true,
      data: { message: "Override deleted successfully" },
    });
  });
});

// --- PDF_EXPORTS CRUD API ---
app.post("/api/pdf_exports", (req, res, next) => {
  const { ai_result_id, file_path } = req.body;

  if (!Number.isInteger(ai_result_id) || ai_result_id < 1) {
    return sendValidationError(res, "ai_result_id must be a positive integer", {
      provided: ai_result_id,
      required: "positive integer",
    });
  }

  if (typeof file_path !== "string" || !file_path.trim()) {
    return sendValidationError(res, "file_path is required", {
      provided: file_path,
      required: "non-empty string",
    });
  }

  (async () => {
    try {
      const result = await crud.createPDFExport(ai_result_id, file_path);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.code === "SQLITE_FOREIGN_KEY") {
        err.status = 404;
        err.message = "Referenced AI result not found";
      } else {
        err.status = 500;
        err.message = "Failed to create PDF export record";
      }
      next(err);
    }
  })();
});

app.get("/api/pdf_exports", (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1 || limit < 1) {
    return sendValidationError(res, "Invalid pagination parameters", {
      provided: { page, limit },
      required: "positive integers",
    });
  }

  const offset = (page - 1) * limit;

  (async () => {
    try {
      const rows = await crud.getPDFExports();
      if (!rows || rows.length === 0)
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      const total = rows.length;
      const pages = Math.ceil(total / limit);
      const paginatedRows = rows.slice(offset, offset + limit);
      res.status(200).json({
        success: true,
        data: paginatedRows,
        pagination: { page, limit, total, pages },
      });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to retrieve PDF exports";
      next(err);
    }
  })();
});

app.get("/api/pdf_exports/:id", (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid PDF export ID", {
      provided: req.params.id,
      required: "positive integer",
    });
  }

  (async () => {
    try {
      const row = await crud.getPDFExportById(id);
      if (!row)
        return res.status(404).json({
          success: false,
          error: {
            message: "PDF export not found",
            code: "RESOURCE_NOT_FOUND",
          },
        });
      res.status(200).json({ success: true, data: row });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to retrieve PDF export";
      next(err);
    }
  })();
});

// --- CONTENT HELPER ENDPOINTS ---
// Return JSON content for a given AI result id
app.get("/content/result/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid result ID", {
      provided: req.params.id,
      required: "positive integer",
    });
  }

  try {
    const row = await crud.getAIResultById(id);
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: { message: "AI result not found" } });
    }
    const resultObj =
      typeof row.result === "string" ? JSON.parse(row.result) : row.result;
    const usable =
      resultObj && resultObj.content ? resultObj.content : resultObj;
    return res.status(200).json({ success: true, content: usable });
  } catch (err) {
    console.error("/content/result/:id error", err);
    return res
      .status(500)
      .json({ success: false, error: { message: "Failed to load AI result" } });
  }
});

// Return JSON content for the latest AI result for a given prompt id
app.get("/content/prompt/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid prompt ID", {
      provided: req.params.id,
      required: "positive integer",
    });
  }

  try {
    const results = await crud.getAIResults();
    const filtered = results
      .filter((r) => r.prompt_id === id)
      .sort((a, b) => (a.id || 0) - (b.id || 0));
    const latest = filtered.length ? filtered[filtered.length - 1] : null;
    if (!latest) {
      return res.status(404).json({
        success: false,
        error: { message: "No AI results found for this prompt" },
      });
    }
    const resultObj =
      typeof latest.result === "string"
        ? JSON.parse(latest.result)
        : latest.result;
    const usable =
      resultObj && resultObj.content ? resultObj.content : resultObj;
    return res.status(200).json({ success: true, content: usable });
  } catch (err) {
    console.error("/content/prompt/:id error", err);
    return res.status(500).json({
      success: false,
      error: { message: "Failed to load prompt results" },
    });
  }
});

// --- MULTI-POEM EBOOK EXPORT FOR SMOKE TESTS ---
app.post("/api/export/book", async (req, res) => {
  // Accept body with { poems: [...] } or load sample file if empty
  let poems = null;
  try {
    poems = req.body && req.body.poems ? req.body.poems : null;
  } catch (e) {
    poems = null;
  }

  if (!poems) {
    // Try loading sample dataset from server/samples/poems.json
    try {
      const samplePath = path.resolve(__dirname, "samples", "poems.json");
      const raw = fs.readFileSync(samplePath, "utf8");
      const parsed = JSON.parse(raw);
      // Support shapes:
      //  - { poems: [...] }
      //  - [ { poems: [...] } ] (array wrapping)
      //  - direct array of poem objects
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].poems) {
        poems = parsed[0].poems;
      } else {
        poems = parsed && parsed.poems ? parsed.poems : parsed;
      }
    } catch (err) {
      console.error("Failed to load sample poems:", err.message);
      return res
        .status(400)
        .json({ error: "No poems provided and sample not available" });
    }
  }

  // Use shared browserInstance if available, otherwise attempt a temporary
  // Puppeteer launch so exports can run in test or one-off modes.
  let localBrowser = browserInstance;
  let launchedTempBrowser = false;
  if (!serviceState.puppeteer.ready || !localBrowser) {
    // Try to launch a temporary browser (best-effort). If this fails, return 503.
    try {
      let puppeteerLib;
      try {
        puppeteerLib = require("puppeteer-core");
      } catch (e) {
        try {
          puppeteerLib = require("puppeteer");
        } catch (er) {
          puppeteerLib = null;
        }
      }
      if (!puppeteerLib) throw new Error("puppeteer not available");

      // Resolve executable path similar to startPuppeteer
      const preferredChrome = process.env.CHROME_PATH || process.env.CHROME_BIN;
      const possiblePaths = [
        preferredChrome,
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
      ].filter(Boolean);
      let executablePath;
      for (const p of possiblePaths) {
        try {
          if (p && fs.existsSync(p)) {
            executablePath = p;
            break;
          }
        } catch (e) {
          // ignore filesystem probe errors when checking executable paths
        }
      }

      localBrowser = await puppeteerLib.launch({
        ...(executablePath ? { executablePath } : {}),
        args: [
          "--disable-dev-shm-usage",
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],
        headless: "new",
      });
      launchedTempBrowser = true;
    } catch (e) {
      console.warn(
        "Failed to launch temporary Puppeteer for export:",
        e && e.message ? e.message : e
      );
      return res
        .status(503)
        .json({ error: "PDF generation service not ready" });
    }
  }

  try {
    // Ensure each poem has a background image; generate offline stub if missing
    for (let p of poems) {
      if (!p.background) {
        const generated = generateBackgroundForPoem(p);
        if (generated) p.background = generated;
      }
    }

    const pdf = await renderBookToPDF(poems, localBrowser);
    res.setHeader("Content-Disposition", "inline; filename=ebook.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdf.length);
    res.end(pdf);
  } catch (err) {
    console.error("Ebook export error:", err);
    res
      .status(500)
      .json({ error: "Failed to generate ebook", details: err.message });
  } finally {
    if (launchedTempBrowser && localBrowser) {
      try {
        await localBrowser.close();
      } catch (e) {
        // ignore close errors for temporary browser
      }
    }
  }
});

// --- Background export job API (SQLite-backed with in-memory fallback) ---
let jobsModule = null;
try {
  jobsModule = require("./jobs");
} catch (e) {
  console.warn(
    "jobs module not available, will use in-memory fallback",
    e.message
  );
}

const exportJobs = {}; // fallback in-memory jobs

app.post("/api/export/job", async (req, res) => {
  const payload = req.body && Object.keys(req.body).length ? req.body : null;

  // Primary path: try to enqueue in SQLite-backed jobs table
  if (jobsModule) {
    try {
      // Prefer explicit DB path when provided (tests set JOBS_DB), otherwise use server default
      const dbPath =
        process.env.JOBS_DB ||
        path.join(process.cwd(), "data", "your-database-name.db");
      const db = await jobsModule.openJobsDb(dbPath);
      try {
        const id = await jobsModule.enqueueJob(db, payload);
        await db.close();
        // Respond with DB id
        res.status(202).json({ jobId: String(id) });
        return;
      } catch (e) {
        // ensure DB closed on error
        try {
          await db.close();
        } catch (ee) {
          // ignore errors closing DB
        }
        console.warn(
          "jobs.enqueueJob failed, falling back to in-memory",
          e && e.message ? e.message : e
        );
      }
    } catch (e) {
      console.warn(
        "jobs DB open failed, falling back to in-memory",
        e && e.message ? e.message : e
      );
    }
  }

  // Fallback: in-memory behavior (existing logic)
  const jobId = uuidv4();
  exportJobs[jobId] = { state: "queued", progress: 0 };

  (async () => {
    try {
      exportJobs[jobId].state = "preparing";
      exportJobs[jobId].progress = 10;

      let poems = payload && payload.poems ? payload.poems : null;
      if (!poems) {
        const samplePath = path.resolve(__dirname, "samples", "poems.json");
        const raw = fs.readFileSync(samplePath, "utf8");
        const parsed = JSON.parse(raw);
        poems =
          Array.isArray(parsed) && parsed.length > 0 && parsed[0].poems
            ? parsed[0].poems
            : parsed && parsed.poems
            ? parsed.poems
            : parsed;
      }

      const { generateImages } = payload || {};
      if (generateImages) {
        const { generatePoemAndImage } = require("./imageGenerator.cjs");
        let i = 0;
        for (let p of poems) {
          exportJobs[jobId].state = "generating_images";
          exportJobs[jobId].progress = 10 + Math.round((i / poems.length) * 30);
          try {
            const result = await generatePoemAndImage({
              theme: p.title || p.theme,
            });
            if (result && result.image) p.background = result.image;
          } catch (e) {
            console.warn("Image generation failed for poem", i, e.message || e);
          }
          i++;
        }
      } else {
        for (let p of poems) {
          if (!p.background) {
            const generated = generateBackgroundForPoem(p);
            if (generated) p.background = generated;
          }
        }
      }

      exportJobs[jobId].state = "composing";
      exportJobs[jobId].progress = 50;

      const pdf = await renderBookToPDF(poems, browserInstance);

      exportJobs[jobId].state = "saving";
      exportJobs[jobId].progress = 85;

      const outDir = path.resolve(__dirname, "samples", "exports");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `ebook_${jobId}.pdf`);
      fs.writeFileSync(outPath, pdf);

      exportJobs[jobId].state = "done";
      exportJobs[jobId].progress = 100;
      exportJobs[jobId].filePath = outPath;
    } catch (err) {
      exportJobs[jobId].state = "error";
      exportJobs[jobId].error = err && err.message ? err.message : String(err);
      exportJobs[jobId].progress = 0;
      console.error("Export job failed", jobId, err);
    }
  })();

  res.status(202).json({ jobId });
});

// Job queue metrics endpoint - returns counts per state (queued/processing/done/failed)
app.get("/api/jobs/metrics", async (req, res) => {
  try {
    if (jobsModule && jobsModule.openJobsDb) {
      const dbPath =
        process.env.JOBS_DB ||
        path.join(process.cwd(), "data", "your-database-name.db");
      const db = await jobsModule.openJobsDb(dbPath);
      try {
        const rows = await db.all(
          `SELECT state, COUNT(*) as count FROM jobs GROUP BY state`
        );
        const metrics = { queued: 0, processing: 0, done: 0, failed: 0 };
        for (const r of rows) {
          if (r.state && typeof r.count !== "undefined")
            metrics[r.state] = r.count;
        }
        await db.close();
        return res.status(200).json({ success: true, metrics });
      } catch (e) {
        try {
          await db.close();
        } catch (ee) {
          // ignore errors closing DB
        }
        throw e;
      }
    }

    // Fallback to in-memory metrics
    const counts = { queued: 0, processing: 0, done: 0, failed: 0 };
    for (const id of Object.keys(exportJobs)) {
      const s =
        exportJobs[id] && exportJobs[id].state
          ? exportJobs[id].state
          : "queued";
      counts[s] = (counts[s] || 0) + 1;
    }
    return res.status(200).json({ success: true, metrics: counts });
  } catch (err) {
    console.error(
      "Failed to compute job metrics",
      err && err.message ? err.message : err
    );
    return res
      .status(500)
      .json({ success: false, error: "Failed to compute metrics" });
  }
});

app.get("/api/export/job/:id", async (req, res) => {
  const id = req.params.id;
  // Try DB lookup first
  if (jobsModule) {
    try {
      const row = await jobsModule.getJob(id);
      if (row) return res.json({ jobId: id, ...row });
    } catch (e) {
      console.warn("jobs.getJob failed", e.message);
    }
  }

  const job = exportJobs[id];
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({ jobId: id, ...job });
});

// Job queue metrics: return counts for queued/processing/done
app.get("/api/export/jobs/metrics", async (req, res) => {
  try {
    // Prefer DB-backed metrics when jobs DB is open
    if (module.exports._jobsDb) {
      const q = await module.exports._jobsDb.get(
        `SELECT COUNT(*) as cnt FROM jobs WHERE state = 'queued'`
      );
      const p = await module.exports._jobsDb.get(
        `SELECT COUNT(*) as cnt FROM jobs WHERE state = 'processing'`
      );
      const d = await module.exports._jobsDb.get(
        `SELECT COUNT(*) as cnt FROM jobs WHERE state = 'done'`
      );
      return res.json({
        queued: q.cnt || 0,
        processing: p.cnt || 0,
        done: d.cnt || 0,
      });
    }

    // Fallback: in-memory exportJobs
    const counts = { queued: 0, processing: 0, done: 0 };
    Object.values(exportJobs).forEach((j) => {
      if (j && j.state && counts[j.state] !== undefined) counts[j.state]++;
    });
    return res.json(counts);
  } catch (e) {
    console.warn(
      "Failed to collect job metrics",
      e && e.message ? e.message : e
    );
    return res.status(500).json({ error: "Failed to collect job metrics" });
  }
});

// --- Synchronous poem->image generation endpoint ---
app.post("/api/generate/poem-image", async (req, res) => {
  const { theme, format } = req.body || {};
  try {
    // lazy-load to avoid cycles during startup
    const { generatePoemAndImage } = require("./imageGenerator.cjs");
    const result = await generatePoemAndImage({ theme, format });
    res.status(200).json({ success: true, result });
  } catch (e) {
    console.error(
      "/api/generate/poem-image error",
      e && e.message ? e.message : e
    );
    res
      .status(500)
      .json({ success: false, error: e && e.message ? e.message : String(e) });
  }
});

app.put("/api/pdf_exports/:id", (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid PDF export ID", {
      provided: req.params.id,
      required: "positive integer",
    });
  }

  const { file_path } = req.body;
  if (typeof file_path !== "string" || !file_path.trim()) {
    return sendValidationError(res, "file_path is required", {
      provided: file_path,
      required: "non-empty string",
    });
  }

  (async () => {
    try {
      const result = await crud.updatePDFExport(id, file_path);
      if (!result || result.changes === 0)
        return res.status(404).json({
          success: false,
          error: {
            message: "PDF export not found",
            code: "RESOURCE_NOT_FOUND",
          },
        });
      res.status(200).json({ success: true, data: { id, file_path } });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to update PDF export";
      next(err);
    }
  })();
});

app.delete("/api/pdf_exports/:id", (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) {
    return sendValidationError(res, "Invalid PDF export ID", {
      provided: req.params.id,
      required: "positive integer",
    });
  }

  (async () => {
    try {
      const result = await crud.deletePDFExport(id);
      if (!result || result.changes === 0)
        return res.status(404).json({
          success: false,
          error: {
            message: "PDF export not found",
            code: "RESOURCE_NOT_FOUND",
          },
        });
      res.status(200).json({
        success: true,
        data: { message: "PDF export deleted successfully" },
      });
    } catch (err) {
      err.status = 500;
      err.message = "Failed to delete PDF export";
      next(err);
    }
  })();
});

// --- HEALTH AND UTILITY FUNCTIONS ---

const HEALTH_CHECK_TIMEOUT_MS = 5000; // 5 seconds

// Utility to add a timeout to any promise
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out"));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function checkPuppeteerHealth() {
  if (!browserInstance || !serviceState.puppeteer.ready) {
    return {
      ok: false,
      error: "Puppeteer instance not available or not ready.",
    };
  }
  try {
    await withTimeout(
      (async () => {
        const page = await browserInstance.newPage();
        await page.close();
      })(),
      HEALTH_CHECK_TIMEOUT_MS
    );
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function checkDatabaseHealth() {
  try {
    // db.get returns a promise, so we await it.
    await db.get("SELECT 1");
    return { ok: true, error: null };
  } catch (err) {
    // If the promise rejects, we catch the error.
    return { ok: false, error: err.message };
  }
}

// Close service handles without exiting the process. This is useful for
// test harnesses and scripted invocations that want a clean shutdown.
async function closeServices(signal) {
  console.log("Close services:", signal || "shutdown");
  try {
    if (module.exports._jobsRecoveryTimer) {
      clearInterval(module.exports._jobsRecoveryTimer);
      module.exports._jobsRecoveryTimer = null;
    }
    if (module.exports._jobsDb) {
      try {
        await module.exports._jobsDb.close();
        console.log("Jobs DB closed");
      } catch (e) {
        console.warn(
          "Error closing jobs DB during shutdown",
          e && e.message ? e.message : e
        );
      }
      module.exports._jobsDb = null;
    }

    // Close Puppeteer browser if present
    if (browserInstance) {
      try {
        // Remove 'disconnected' listener to avoid restart attempts during shutdown
        try {
          browserInstance.removeAllListeners &&
            browserInstance.removeAllListeners("disconnected");
        } catch (er) {
          // ignore listener removal errors
        }
        await browserInstance.close();
        console.log("[Shutdown] Puppeteer browser closed.");
      } catch (e) {
        console.warn(
          "[Shutdown] Error closing Puppeteer browser:",
          e && e.message ? e.message : e
        );
      }
      browserInstance = null;
    }
  } catch (e) {
    console.warn("Error during closeServices", e && e.message ? e.message : e);
  }
  // Ensure exported handles are null even if they were not set. Do this
  // unconditionally so tests which assert the exported sentinel see a
  // deterministic value (null) after shutdown.
  try {
    module.exports._jobsRecoveryTimer = null;
    module.exports._jobsDb = null;
  } catch (e) {
    // If exports are unavailable for some reason, swallow the error
    // but keep shutdown best-effort.
  }

  // Explicitly return undefined so callers expecting a resolved value
  // of undefined can assert on it reliably (tests use resolves.toBeUndefined()).
  return undefined;
}

// Graceful shutdown that closes services then exits (used for process signals)
async function gracefulShutdown(signal) {
  try {
    await closeServices(signal);
  } catch (e) {
    console.warn(
      "Error during gracefulShutdown:",
      e && e.message ? e.message : e
    );
  } finally {
    // allow other listeners to run then exit
    process.exit(0);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));

// Export helpers for external scripts/tests to call without forcing process.exit
module.exports.closeServices = closeServices;
module.exports.gracefulShutdown = gracefulShutdown;

// Centralized error handler (placed at end to capture errors from all routes)
app.use((err, req, res, _next) => {
  const timestamp = new Date().toISOString();
  // Mark `_next` as used to satisfy linters while keeping the signature
  // as an Express error handler (arity 4). This preserves error-handler
  // behavior without introducing a runtime side-effect.
  void _next;
  const requestId = req && req.id ? req.id : "-";
  console.error("--- Error Handler ---");
  console.error("Time:", timestamp);
  console.error("RequestId:", requestId);
  console.error("Method:", req && req.method);
  console.error("URL:", req && req.originalUrl);
  console.error("Body:", req && req.body);
  console.error("Error Stack:", err && err.stack ? err.stack : err);

  // Append a compact structured error line to server-logs/errors.log for quick lookups
  try {
    const logLine = JSON.stringify({
      t: timestamp,
      id: requestId,
      method: req && req.method,
      url: req && req.originalUrl,
      status: err && err.status ? err.status : 500,
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack.split("\n")[0] : null,
    });
    try {
      fs.appendFileSync(path.join(logsDir, "errors.log"), logLine + "\n");
    } catch (e) {
      console.warn(
        "Failed to append to errors.log:",
        e && e.message ? e.message : e
      );
    }
  } catch (e) {
    console.warn(
      "Failed to build error log line:",
      e && e.message ? e.message : e
    );
  }

  // Surface a short error header to aid proxied requests / reverse-proxies
  try {
    res.setHeader(
      "X-Backend-Error",
      err && err.message ? String(err.message).slice(0, 200) : "error"
    );
    res.setHeader("X-Request-Id", requestId);
  } catch (e) {
    // ignore header-setting errors in error handler
  }

  // Differentiate error response by environment
  const isDev = process.env.NODE_ENV !== "production";
  const payload = {
    error: isDev && err && err.message ? err.message : "Internal Server Error",
    requestId,
    ...(isDev && err && { stack: err.stack }),
  };

  // Ensure a JSON content-type so test clients and API consumers get a parsable body
  try {
    if (res.headersSent) {
      // Attempt to write JSON fragment if headers already sent
      try {
        res.write(JSON.stringify(payload));
        res.end();
      } catch (e) {
        try {
          res.end();
        } catch (er) {
          // ignore warn logging errors
        }
      }
      return;
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    // Use Express's json helper so supertest and other clients receive a
    // correctly serialized JSON body that is parsed automatically.
    res.status(err && err.status ? err.status : 500).json(payload);
  } catch (e) {
    // Last-resort safe response
    try {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(500).send(JSON.stringify({ error: "error-handler-failed" }));
      } else {
        try {
          res.end();
        } catch (er) {}
      }
    } catch (ee) {
      // ignore final shutdown errors
    }
  }
});
