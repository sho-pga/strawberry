const request = require("supertest");

const serverModule = require("../index");
const app = serverModule;

beforeAll(async () => {
  await serverModule.startServer({ listen: false });
});

test("POST /api/export returns 400 when missing title/body", async () => {
  const res = await request(app).post("/api/export").send({});
  expect(res.status).toBe(400);
  expect(res.body).toBeDefined();
  expect(res.body.error || res.body.errors || res.body.message).toBeDefined();
});

test("POST /api/export returns 200 with PDF for valid payload", async () => {
  const payload = { title: "Test Title", body: "This is a short body." };
  const res = await request(app)
    .post("/api/export")
    .send(payload)
    .set("Accept", "application/pdf")
    .timeout({ deadline: 20000 })
    .parse((res, cb) => {
      const data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => cb(null, Buffer.concat(data)));
    });

  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/application\/pdf/);
  expect(Buffer.isBuffer(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(500);
}, 20000);

afterAll(async () => {
  try {
    const browser = serverModule.browser;
    if (browser && typeof browser.close === "function") {
      await browser.close();
    }
  } catch (e) {
    // ignore
  }
});
import { describe, it, expect } from "vitest";

// Minimal tests-first scaffold for export handler

describe("export handler (scaffold)", () => {
  it("validates basic payload shape (happy path)", () => {
    const payload = { title: "Test", body: "Hello world" };
    // Basic shape validation
    expect(typeof payload.title).toBe("string");
    expect(typeof payload.body).toBe("string");
  });

  it("rejects missing body (edge case)", () => {
    const payload = { title: "No body" };
    const isValid = payload.body && payload.body.length > 0;
    expect(Boolean(isValid)).toBe(false);
  });
});
