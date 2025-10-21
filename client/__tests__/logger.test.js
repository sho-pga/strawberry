import Logger from "../src/lib/logger";
import { expect, describe, it, beforeEach, vi } from "vitest";

describe("Logger Tests", () => {
  let consoleSpy;

  beforeEach(() => {
    // Clear all console spies between tests
    vi.restoreAllMocks();

    // Setup all console method spies
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
    };
  });

  describe("Basic Logging", () => {
    it("should log at different levels", () => {
      Logger.info("Info message");
      Logger.warn("Warning message");
      Logger.error("Error message");
      Logger.debug("Debug message");

      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it("should include timestamp in logs", () => {
      Logger.info("Test message");
      const call = JSON.parse(consoleSpy.info.mock.calls[0][0]);
      expect(call.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("API Integration", () => {
    it("should log API request details", () => {
      Logger.apiRequest("/test/endpoint", "POST");
      const log = JSON.parse(consoleSpy.info.mock.calls[0][0]);
      expect(log.endpoint).toBe("/test/endpoint");
      expect(log.method).toBe("POST");
      expect(log.type).toBe("api_request");
    });

    it("should log API response details", () => {
      Logger.apiResponse("/test/endpoint", 200);
      const log = JSON.parse(consoleSpy.info.mock.calls[0][0]);
      expect(log.status).toBe(200);
      expect(log.type).toBe("api_response");
    });

    it("should log API errors", () => {
      const error = new Error("Test error");
      Logger.apiError("/test/endpoint", error);
      const log = JSON.parse(consoleSpy.error.mock.calls[0][0]);
      expect(log.type).toBe("api_error");
      expect(log.endpoint).toBe("/test/endpoint");
    });
  });

  describe("Environment Behavior", () => {
    it("should include environment in logs", () => {
      Logger.info("Test message");
      const log = JSON.parse(consoleSpy.info.mock.calls[0][0]);
      expect(log.environment).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should properly format error objects", () => {
      const error = new Error("Test error");
      Logger.error("Error occurred", { error });
      const log = JSON.parse(console.error.mock.calls[0][0]);
      expect(log.errorType).toBe("Error");
      expect(log.stack).toBeDefined();
    });
  });
});
