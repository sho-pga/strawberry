import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";

// Helper to clear require cache for a module path
function clearModule(p) {
  try {
    const resolved = require.resolve(p);
    delete require.cache[resolved];
  } catch (e) {}
}

describe("Failure mode tests", () => {
  let app;

  afterEach(() => {
    // try to cleanup any server state between tests
    try {
      if (app && app._jobsDb) {
        // close DB if present
        app._jobsDb.close().catch(() => {});
      }
    } catch (e) {}
    // restore any mocks / env flags
    try {
      vi.unmock("../aiService");
    } catch (e) {}
    try {
      vi.unmock("../imageGenerator.cjs");
    } catch (e) {}
    delete process.env.SIMULATE_AI_FAILURE;
    clearModule("../index");
    clearModule("../aiService");
    clearModule("../imageGenerator.cjs");
  });

  it("returns graceful error when AI service throws", async () => {
    // Simulate AI failure via env var before importing server so CommonJS require picks it up
    process.env.SIMULATE_AI_FAILURE = "1";
    clearModule("../index");
    const mod = require("../index");
    app = mod;

    const res = await request(app).post("/prompt").send({ prompt: "test" });
    expect(res.status).toBeGreaterThanOrEqual(500);
    // Expect the standardized JSON error payload to be present
    expect(res.body).toHaveProperty("error");
  });

  it("handles image generator timeout without crashing", async () => {
    // Use vitest module mocking to simulate a slow image generator without
    // mutating files on disk.
    vi.mock("../imageGenerator.cjs", () => ({
      generatePoemAndImage: async () => {
        await new Promise((r) => setTimeout(r, 200));
        return { imagePath: null };
      },
    }));

    clearModule("../imageGenerator.cjs");
    clearModule("../index");
    const appModule2 = require("../index");
    app = appModule2;

    // Call an endpoint that uses image generation via prompt/export flow
    const res = await request(app)
      .post("/prompt")
      .send({ prompt: "please generate image" });
    // Should not crash; either returns 200/201 or 500 but server stays responsive
    expect([200, 201, 500]).toContain(res.status);
  });
});
