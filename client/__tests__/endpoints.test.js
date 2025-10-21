import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { previewEndpoint, PreviewValidationError } from "../src/lib/endpoints";
import Logger from "../src/lib/logger";

describe("API Endpoints", () => {
  // Mock setup
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock Logger methods
    vi.spyOn(Logger, "warn").mockImplementation(() => {});
    vi.spyOn(Logger, "error").mockImplementation(() => {});
    vi.spyOn(Logger, "info").mockImplementation(() => {});

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  // Cleanup after each test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Preview Endpoint", () => {
    describe("Input Validation", () => {
      it("rejects when prompt is missing", async () => {
        await expect(previewEndpoint({})).rejects.toThrow(
          PreviewValidationError
        );

        expect(Logger.warn).toHaveBeenCalledWith(
          "Preview request validation failed",
          expect.objectContaining({
            validationErrors: expect.arrayContaining(["Prompt is required"]),
          })
        );
      });

      it("rejects when prompt is empty string", async () => {
        await expect(previewEndpoint({ prompt: "" })).rejects.toThrow(
          PreviewValidationError
        );
      });

      it("accepts valid prompt data", async () => {
        // Mock successful response
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ preview: "test", metadata: {} }),
        });

        const result = await previewEndpoint({ prompt: "valid prompt" });
        expect(result).toHaveProperty("preview");
        expect(result).toHaveProperty("metadata");
      });
    });

    describe("API Communication", () => {
      it("handles successful API responses", async () => {
        const mockResponse = {
          preview: "test content",
          metadata: { timestamp: new Date().toISOString() },
        };

        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await previewEndpoint({ prompt: "test" });
        expect(result).toEqual(mockResponse);
        expect(Logger.info).toHaveBeenCalled();
      });

      it("handles network errors gracefully", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Network error"));

        await expect(previewEndpoint({ prompt: "test" })).rejects.toThrow(
          "Failed to generate preview: Network or server error"
        );

        expect(Logger.error).toHaveBeenCalled();
      });

      it("handles malformed API responses", async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}), // Missing required preview field
        });

        await expect(previewEndpoint({ prompt: "test" })).rejects.toThrow(
          "Preview response missing required fields"
        );
      });

      it("includes proper headers in request", async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ preview: "test", metadata: {} }),
        });

        await previewEndpoint({ prompt: "test" });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Accept: "application/json",
            }),
          })
        );
      });
    });
  });
});
