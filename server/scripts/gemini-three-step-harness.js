const fs = require("fs");
const path = require("path");
const { callGemini } = require("../geminiClient");

async function run() {
  try {
    // Step 1: generate a poem
    const theme = "a short reflective poem about summer rain and memory";
    console.log("[1/4] Generating poem (TEXT)...");
    const poemRes = await callGemini({ prompt: theme, modality: "TEXT" });
    if (!poemRes.ok) {
      console.error("Poem generation failed:", poemRes);
      process.exitCode = 2;
      return;
    }
    const poem =
      poemRes.text ||
      poemRes.rawText ||
      JSON.stringify(poemRes.json || {}).slice(0, 1000);
    console.log("Poem snippet:\n", poem.slice(0, 400));

    // Step 2: ask Gemini to produce a visual prompt from the poem
    console.log("[2/4] Creating visual prompt from poem (TEXT)...");
    const visualPromptRes = await callGemini({
      prompt: `Create a highly-detailed visual prompt for an image generator from the following poem:\n\n${poem}`,
      modality: "TEXT",
    });
    if (!visualPromptRes.ok) {
      console.error("Visual prompt generation failed:", visualPromptRes);
      process.exitCode = 2;
      return;
    }
    const visualPrompt =
      visualPromptRes.text ||
      visualPromptRes.rawText ||
      JSON.stringify(visualPromptRes.json || {}).slice(0, 1000);
    console.log("Visual prompt snippet:\n", visualPrompt.slice(0, 400));

    // Step 3: generate IMAGE using the visual prompt
    console.log("[3/4] Generating image (IMAGE)...");
    const imageRes = await callGemini({
      prompt: visualPrompt,
      modality: "IMAGE",
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    });
    if (!imageRes.ok) {
      console.error("Image generation failed:", imageRes);
      process.exitCode = 2;
      return;
    }

    const outDir = path.resolve(__dirname, "..", "samples", "images");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let savedFilename = null;
    if (imageRes.image && imageRes.image.b64) {
      savedFilename = `three_step_${Date.now()}.png`;
      fs.writeFileSync(
        path.join(outDir, savedFilename),
        Buffer.from(imageRes.image.b64, "base64")
      );
      console.log("Saved generated image:", savedFilename);
    } else {
      // fallback: if imageRes returned no image, let generateWithGemini's fallback produce an SVG
      savedFilename = `three_step_fallback_${Date.now()}.svg`;
      const svg = `<?xml version="1.0"?><svg><text x="10" y="20">Fallback: no image returned</text></svg>`;
      fs.writeFileSync(path.join(outDir, savedFilename), svg, "utf8");
      console.log("Saved fallback SVG:", savedFilename);
    }

    // Step 4: run IMAGERY check (reverse check) using the saved image (if available)
    console.log("[4/4] Running IMAGERY reverse-check (IMAGERY)...");
    let b64 = null;
    if (
      savedFilename.endsWith(".png") ||
      savedFilename.endsWith(".jpg") ||
      savedFilename.endsWith(".jpeg")
    ) {
      const buf = fs.readFileSync(path.join(outDir, savedFilename));
      b64 = buf.toString("base64");
    } else if (savedFilename.endsWith(".svg")) {
      const buf = fs.readFileSync(path.join(outDir, savedFilename), "utf8");
      b64 = Buffer.from(buf, "utf8").toString("base64");
    }

    const imageryRes = await callGemini({
      prompt: `Describe the contents of this image in one short sentence.`,
      modality: "IMAGERY",
      imageB64: b64,
    });
    if (!imageryRes.ok) {
      console.error("Imagery reverse-check failed:", imageryRes);
      process.exitCode = 2;
      return;
    }
    console.log(
      "Imagery reverse-check result snippet:",
      (
        imageryRes.text ||
        imageryRes.rawText ||
        JSON.stringify(imageryRes.json || {}).slice(0, 400)
      ).slice(0, 400)
    );
    console.log("Three-step harness complete. Files written to", outDir);
  } catch (err) {
    console.error("ERROR:", err && err.message ? err.message : err);
    process.exitCode = 2;
  }
}

run();
