const request = require("supertest");
const app = require("../index");
const { startServer } = require("../index");

// Wait for health to be ok
async function waitForHealth(req, timeout = 20000, interval = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await req.get("/health");
      if (res.status === 200 && res.body && res.body.status === "ok") return;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Health did not become ok in time");
}

beforeAll(async () => {
  await startServer({ listen: false });
  const req = request(app);
  await waitForHealth(req, 20000, 500);
}, 30000);

test("Core flow: prompt -> preview -> export", async () => {
  const req = request(app);

  // 1) POST /prompt
  const promptRes = await req
    .post("/prompt")
    .send({ prompt: "Integration test prompt" })
    .timeout(15000);
  expect(promptRes.status).toBe(201);
  expect(promptRes.body).toHaveProperty("data");
  const content =
    promptRes.body.data.content ||
    promptRes.body.content ||
    (promptRes.body.data && promptRes.body.data.content);
  // content should include title and body
  expect(content).toBeTruthy();
  expect(content).toHaveProperty("title");
  expect(content).toHaveProperty("body");

  // 2) GET /preview (using query param as current server expects)
  const previewQuery = encodeURIComponent(JSON.stringify(content));
  const previewRes = await req
    .get(`/preview?content=${previewQuery}`)
    .timeout(10000);
  expect(previewRes.status).toBe(200);
  expect(previewRes.text).toContain(content.title);

  // 3) POST /export using title/body from content
  // Parser to capture binary response
  const parser = (res, cb) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => cb(null, Buffer.concat(chunks)));
  };

  const exportRes = await req
    .post("/export")
    .send({ title: content.title, body: content.body })
    .set("Accept", "application/pdf")
    .buffer(true)
    .parse(parser)
    .timeout(20000);

  expect(exportRes.status).toBe(200);
  expect(exportRes.headers["content-type"]).toMatch(/application\/pdf/);
  expect(Buffer.isBuffer(exportRes.body)).toBe(true);
  expect(exportRes.body.length).toBeGreaterThan(100);
}, 45000);

afterAll(async () => {
  try {
    if (typeof app.stopServer === "function") await app.stopServer();
  } catch (e) {}
});
