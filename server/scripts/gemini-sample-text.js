// Sample: Step 1 - Generate text (poem) via Gemini-like endpoint
const fetch =
  globalThis.fetch ||
  (() => {
    try {
      return require("undici").fetch;
    } catch (e) {
      return null;
    }
  })();

async function generateWithGemini(prompt) {
  const apiUrl = process.env.GEMINI_API_URL_TEXT || process.env.GEMINI_API_URL;
  const rawKey = process.env.GEMINI_API_KEY_TEXT || process.env.GEMINI_API_KEY;

  if (!apiUrl || !rawKey) {
    console.error(
      "Missing GEMINI_API_URL_TEXT or GEMINI_API_KEY_TEXT / GEMINI_API_KEY in environment"
    );
    process.exitCode = 2;
    return null;
  }

  if (!fetch) {
    console.error(
      "No fetch available. Use Node 18+ or install undici in server/package.json"
    );
    process.exitCode = 2;
    return null;
  }

  const headers = { "Content-Type": "application/json" };
  if (/^ya29\./.test(rawKey)) headers["Authorization"] = `Bearer ${rawKey}`;
  else headers["x-goog-api-key"] = rawKey;

  const requestBody = {
    contents: [{ parts: [{ text: String(prompt) }] }],
  };

  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const txt = await resp.text();
    let json = null;
    try {
      json = JSON.parse(txt);
    } catch (e) {
      /* ignore */
    }

    if (!resp.ok) {
      console.error("API Error", resp.status, txt.slice(0, 2000));
      process.exitCode = 2;
      return null;
    }

    const textContent =
      json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    if (!textContent) {
      console.warn("No text content found in response; raw body printed below");
      console.log(txt.slice(0, 4000));
      return null;
    }
    return textContent;
  } catch (err) {
    console.error(
      "Request failed:",
      err && err.message ? err.message : String(err)
    );
    process.exitCode = 2;
    return null;
  }
}

(async function main() {
  const poemPrompt = `
Generate a short reflective poem (about 8-12 lines) about summer rain and memory. Use vivid imagery and a gentle, nostalgic tone.
`;
  console.log("Sending poem prompt to Gemini TEXT endpoint...");
  const res = await generateWithGemini(poemPrompt);
  if (res) {
    console.log("\n=== Generated Poem ===\n");
    console.log(res);
    console.log("\n=== End ===\n");
  } else {
    console.error("No poem generated (see errors above)");
  }
})();
