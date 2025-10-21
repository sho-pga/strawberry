import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import db from "../db";
import app from "../index";
let createdId;

describe("API: /api/prompts", () => {
  let initialPromptCount;

  // Setup: clean database + verify server
  beforeAll(async () => {
    // Ensure local DB is initialized for direct DB operations from tests
    // @ts-ignore - db is a custom interface with initialize(); silence editor type-check warning
    await db.initialize();

    // Ensure the server initializes its dependencies (DB/Puppeteer) when imported
    if (typeof app.startServer === "function") {
      await app.startServer();
    }

    // The db object is a promise-based wrapper, so we can await directly.
    // Deletion order matters due to foreign key constraints.
    await db.run("DELETE FROM pdf_exports");
    await db.run("DELETE FROM overrides");
    await db.run("DELETE FROM ai_results");
    await db.run("DELETE FROM prompts");

    try {
      const health = await request(app).get("/health");
      expect(health.status).toBe(200);

      const res = await request(app).get("/api/prompts");
      // API returns { success, data, pagination }
      initialPromptCount = Array.isArray(res.body.data)
        ? res.body.data.length
        : 0;
    } catch (error) {
      throw new Error("Server must be running (app import failed)");
    }
  }); // Cleanup: delete test-created data only
  afterAll(async () => {
    if (createdId) {
      try {
        await request(app).delete(`/api/prompts/${createdId}`);
      } catch (error) {
        console.warn("Cleanup failed for prompt:", createdId);
      }
    }

    // Ensure no trace of our test prompt remains
    const final = await request(app).get("/api/prompts");
    const list = Array.isArray(final.body.data) ? final.body.data : [];
    const exists = list.some((p) => p.id === createdId);
    expect(exists).toBe(false);
  });

  it("should create a prompt", async () => {
    const testPrompt = { prompt: "Test prompt" };
    const res = await request(app).post("/api/prompts").send(testPrompt);
    expect(res.status).toBe(201);
    // API replies { success: true, data: { id } }
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("id");
    createdId = res.body.data.id;
  });

  it("should get all prompts", async () => {
    const res = await request(app).get("/api/prompts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((p) => p.id === createdId)).toBe(true);
  });

  it("should get a prompt by id", async () => {
    const res = await request(app).get(`/api/prompts/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("id", createdId);
    expect(res.body.data).toHaveProperty("prompt");
  });

  it("should handle non-existent prompt id", async () => {
    const res = await request(app).get("/api/prompts/99999");
    expect(res.status).toBe(404);
  });

  it("should update a prompt", async () => {
    const updatedPrompt = { prompt: "Updated prompt" };
    const res = await request(app)
      .put(`/api/prompts/${createdId}`)
      .send(updatedPrompt);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("changes");

    const verify = await request(app).get(`/api/prompts/${createdId}`);
    expect(verify.body.data.prompt).toBe(updatedPrompt.prompt);
  });

  it("should delete a prompt", async () => {
    const res = await request(app).delete(`/api/prompts/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("changes");

    const check = await request(app).get(`/api/prompts/${createdId}`);
    expect(check.status).toBe(404);
    createdId = null;
  });
});
