const { callGemini } = require("../geminiClient");

async function run() {
  const prompt =
    "Summarize the following financial report into five key bullet points, focusing on year-over-year growth and potential risks.";
  const res = await callGemini({ prompt, modality: "TEXT" });
  if (!res.ok) {
    console.error("Text call failed:", res);
    process.exitCode = 2;
    return;
  }
  console.log(
    "Text response snippet:\n",
    res.text || JSON.stringify(res.json, null, 2).slice(0, 400)
  );
}

run();
