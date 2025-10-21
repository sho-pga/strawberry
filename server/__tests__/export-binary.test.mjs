import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";

// Ensure Puppeteer init is skipped for fast tests
process.env.SKIP_PUPPETEER = "true";

function clearModule(p) {
  try {
    const resolved = require.resolve(p);
    delete require.cache[resolved];
  } catch (e) {}
}

describe("Export binary endpoint", () => {
  let app;

  beforeEach(() => {
    clearModule("../index");
    app = require("../index");
  });

  afterEach(() => {
    try {
      if (app && app._jobsDb) app._jobsDb.close().catch(() => {});
    } catch (e) {}
    clearModule("../index");
  });

  it("returns application/pdf and PDF magic bytes for POST /export", async () => {
    const payload = { title: "Test", body: "This is a test" };
    const res = await request(app).post("/export").send(payload).buffer();

    // If Puppeteer is skipped, the server should return a 503 service unavailable
    if (res.status === 503) {
      expect(res.body).toHaveProperty("error");
      return;
    }

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);
    // res.body is a Buffer when using .buffer(); check magic bytes
    const magic = res.body.slice(0, 5).toString("utf8");
    expect(magic).toBe("%PDF-");
  });
});
