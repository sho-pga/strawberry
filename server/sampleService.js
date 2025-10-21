const { saveContentToFile } = require("./utils/fileUtils");

function buildContent(prompt, opts = {}) {
  const maxWords = opts.titleWords || 6;
  const words = String(prompt || "")
    .split(/\s+/)
    .filter(Boolean);
  const title = `Prompt: ${words.slice(0, maxWords).join(" ")}`;
  const body = String(prompt || "");
  return { title, body };
}

function makeCopies(content, n = 3) {
  // Return n copies of the content object for the demo
  return Array.from({ length: n }, () => content);
}

async function generateFromPrompt(prompt) {
  // Business logic: request that the prompt be saved, but do not fail
  // generation if the save fails (non-fatal persistence).
  try {
    // saveContentToFile may be async; await it if it returns a Promise
    const res = saveContentToFile(prompt);
    if (res && typeof res.then === "function") await res;
  } catch (e) {
    // Non-fatal: log and continue
    // eslint-disable-next-line no-console
    console.warn(
      "sampleService: failed to save prompt to file:",
      e && e.message
    );
  }

  const content = buildContent(prompt);
  const copies = makeCopies(content, 3);
  return { content, copies };
}

module.exports = {
  buildContent,
  makeCopies,
  generateFromPrompt,
};
