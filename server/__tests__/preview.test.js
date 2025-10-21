import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

// Import server module and start services without binding to a network port
const appModule = await import("../index.js");
const app = appModule.default || appModule;

beforeAll(async () => {
  if (typeof appModule.startServer === "function") {
    await appModule.startServer({ listen: false });
  }
});

afterAll(async () => {
  try {
    const browser = appModule.browser;
    if (browser && typeof browser.close === "function") {
      await browser.close();
    }
  } catch (e) {
    // ignore
  }
});

describe("POST /api/preview", () => {
  it("returns JSON containing preview HTML for provided content", async () => {
    const payload = { title: "Preview Test", body: "This is a preview body." };

    const res = await request(app)
      .post("/api/preview")
      .send(payload)
      .set("Content-Type", "application/json")
      .expect(200);

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toHaveProperty("preview");
    expect(typeof res.body.preview).toBe("string");
    expect(res.body.preview).toContain("Preview Test");
  });
});
