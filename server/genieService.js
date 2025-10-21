const sampleService = require("./sampleService");
const { saveContentToFile } = require("./utils/fileUtils");

const genieService = {
  // For the demo, generate delegates to sampleService. In future this can
  // orchestrate real AI/image jobs via aetherService.
  async generate(prompt) {
    if (!prompt || !String(prompt).trim()) {
      const e = new Error("Prompt is required");
      // @ts-ignore
      e.status = 400;
      throw e;
    }

    // Synchronous demo service - wrap in Promise to keep async contract
    try {
      const result = await sampleService.generateFromPrompt(prompt);
      return {
        success: true,
        data: {
          content: result.content,
          copies: result.copies,
        },
      };
    } catch (err) {
      const e = new Error("Generation failed: " + (err && err.message));
      // @ts-ignore
      e.status = 500;
      throw e;
    }
  },

  readLatest() {
    try {
      const { readLatest } = require("./utils/fileUtils");
      return readLatest();
    } catch (e) {
      return null;
    }
  },

  // Backwards-compatible wrapper that delegates to utils/fileUtils
  saveContentToFile(content) {
    return saveContentToFile(content);
  },
};

module.exports = genieService;
