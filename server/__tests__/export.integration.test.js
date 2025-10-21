/* global beforeAll, afterAll, test, expect */
// Vitest provides globals (beforeAll, afterAll, test, expect) at runtime
const request = require("supertest");
const app = require("../index");
const { startServer } = require("../index");

// Poll /health until services report ok or timeout
async function waitForHealth(timeout = 20000, interval = 500) {
  const req = request(app);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await req.get("/health");
      if (res.status === 200 && res.body && res.body.status === "ok") return;
    } catch (e) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Health check did not become ok in time");
}

beforeAll(async () => {
  // Initialize DB + Puppeteer but don't bind to network
  await startServer({ listen: false });
  // Wait for puppeteer and db to be ready (or fail fast)
  await waitForHealth(20000, 500);
}, 30000);

test("POST /export returns a PDF buffer", async () => {
  const req = request(app);
  const payload = { title: "Integration Test", body: "Hello PDF" };

  // Parser to accumulate binary response into a Buffer
  const parser = (res, cb) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => cb(null, Buffer.concat(chunks)));
  };

  const res = await req
    .post("/export")
    .send(payload)
    .set("Accept", "application/pdf")
    .buffer(true)
    .parse(parser)
    .timeout(20000);

  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/application\/pdf/);
  expect(Buffer.isBuffer(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(100);
}, 30000);

afterAll(async () => {
  // Best-effort cleanup: if the app exposes a stop helper, call it.
  try {
    if (typeof app.stopServer === "function") await app.stopServer();
  } catch (e) {
    // ignore cleanup errors
  }
});
