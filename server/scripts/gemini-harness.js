// Small harness to exercise generateWithGemini safely.
// Usage: node server/scripts/gemini-harness.js

const path = require("path");
const { generateWithGemini } = require("../imageGenerator");

async function run() {
  try {
    const prompt =
      "Decorative summer watercolor background with soft sun, pastel palette, high detail, A4 background";
    const filename = await generateWithGemini(prompt, {
      requestOptions: {
        /* adapter options */
      },
    });
    console.log("OK: generated image ->", filename);
    console.log(
      "Saved at:",
      path.resolve(__dirname, "..", "samples", "images", filename)
    );
  } catch (err) {
    console.error("ERROR:", err.message || err);
    process.exitCode = 2;
  }
}

run();
