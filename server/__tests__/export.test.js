const request = require("supertest");

// Import startServer and app
const serverModule = require("../index");
const app = serverModule;

beforeAll(async () => {
  // Initialize DB and Puppeteer without listening on a network port
  await serverModule.startServer({ listen: false });
});

// Increase test timeout because Puppeteer-driven PDF export can take longer
test("POST /api/export/book returns a PDF buffer", async () => {
  const res = await request(app)
    .post("/api/export/book")
    .set("Accept", "application/pdf")
    .timeout({ deadline: 20000 })
    .parse((res, cb) => {
      const data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => cb(null, Buffer.concat(data)));
    });

  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/application\/pdf/);
  const buf = res.body;
  expect(Buffer.isBuffer(buf)).toBe(true);
  expect(buf.length).toBeGreaterThan(500);
}, 20000);

afterAll(async () => {
  // Attempt graceful shutdown of Puppeteer instance if present
  try {
    const browser = serverModule.browser;
    if (browser && typeof browser.close === "function") {
      await browser.close();
    }
  } catch (e) {
    // ignore
  }
});
