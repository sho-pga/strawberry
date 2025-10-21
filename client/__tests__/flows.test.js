import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";

import * as Api from "../src/lib/api";
import * as Stores from "../src/stores";
import { contentStore, previewStore, uiStateStore } from "../src/stores";
import { generateAndPreview, previewFromContent } from "../src/lib/flows";
import { vi as globalVi } from "vitest";

beforeEach(() => {
  // reset stores
  contentStore.set(null);
  previewStore.set("");
  uiStateStore.set({ status: "idle", message: "" });
  vi.restoreAllMocks();
});

describe("flows.generateAndPreview / previewFromContent", () => {
  it("generateAndPreview: successful flow sets stores and returns html", async () => {
    const mockContent = { title: "T", body: "B" };
    const mockHtml = "<div>preview</div>";

    vi.spyOn(Api, "submitPrompt").mockResolvedValue({
      data: { content: mockContent },
    });
    vi.spyOn(Api, "loadPreview").mockResolvedValue(mockHtml);
    // Ensure persistence returns a valid content shape so previewFromContent validation passes
    // Also update the contentStore to mimic the real persistContent side-effect
    vi.spyOn(Stores, "persistContent").mockImplementation(async (c) => {
      try {
        Stores.contentStore.set(mockContent);
      } catch (e) {}
      return mockContent;
    });

    const result = await generateAndPreview("a valid prompt");

    expect(get(contentStore)).toEqual(mockContent);
    expect(get(previewStore)).toBe(mockHtml);
    expect(get(uiStateStore).status).toBe("success");
    expect(result).toBe(mockHtml);
  });

  it("previewFromContent: successful preview updates previewStore and returns html", async () => {
    const content = { title: "Hello", body: "World" };
    const html = "<p>ok</p>";
    vi.spyOn(Api, "loadPreview").mockResolvedValue(html);

    const res = await previewFromContent(content);
    expect(res).toBe(html);
    expect(get(previewStore)).toBe(html);
    expect(get(uiStateStore).status).toBe("success");
  });

  it("generateAndPreview: empty prompt errors and sets uiState error", async () => {
    await expect(generateAndPreview("")).rejects.toThrow(
      /Prompt cannot be empty/
    );
    expect(get(uiStateStore).status).toBe("error");
  });

  it("previewFromContent: invalid content throws and sets uiState error", async () => {
    await expect(previewFromContent({})).rejects.toThrow(
      /No valid content provided/
    );
    expect(get(uiStateStore).status).toBe("error");
  });

  it("generateAndPreview: request timeout sets uiState error", async () => {
    // mock submitPrompt to never resolve so withTimeout will trigger
    vi.spyOn(Api, "submitPrompt").mockImplementation(
      () => new Promise(() => {})
    );

    // Use fake timers to advance past the default timeout and ensure cleanup
    globalVi.useFakeTimers();
    try {
      const p = generateAndPreview("a valid prompt", 50);
      // attach a benign catch to prevent an unhandled rejection warning
      // the test still asserts the original promise rejects below
      p.catch(() => {});

      // advance timers so the withTimeout rejects
      await globalVi.advanceTimersByTimeAsync(100);

      // allow microtasks to run so the rejection is observed and handled
      await Promise.resolve();

      await expect(p).rejects.toThrow(/Request timed out/);
      expect(get(uiStateStore).status).toBe("error");
    } finally {
      globalVi.useRealTimers();
    }
  });
});
