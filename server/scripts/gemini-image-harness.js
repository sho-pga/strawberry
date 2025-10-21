const fs = require("fs");
const path = require("path");
const { callGemini } = require("../geminiClient");

async function run() {
  const prompt =
    "Photorealistic, award-winning wildlife photograph of a red panda in a bamboo forest, golden hour lighting, soft focus background, high detail.";
  const res = await callGemini({
    prompt,
    modality: "IMAGE",
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });
  if (!res.ok) {
    console.error("Image call failed:", res);
    process.exitCode = 2;
    return;
  }
  if (res.image && res.image.b64) {
    const outDir = path.resolve(__dirname, "..", "samples", "images");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const filename = `gemini_test_${Date.now()}.png`;
    fs.writeFileSync(
      path.join(outDir, filename),
      Buffer.from(res.image.b64, "base64")
    );
    console.log("Saved image to", path.join(outDir, filename));
    return;
  }
  console.log(
    "No image data in response; raw snippet:\n",
    res.rawText
      ? res.rawText.slice(0, 800)
      : JSON.stringify(res.json).slice(0, 800)
  );
}

run();
