const fs = require("fs");
const path = require("path");

// Small wrapper to call Google's Generative Language endpoints for TEXT or IMAGE modalities.
// Selects URL/key based on modality and returns parsed response. Does not throw on API errors —
// returns an object with ok/status/json/rawText and imageData (base64) when present.
async function callGemini({
  prompt,
  modality = "TEXT",
  generationConfig = {},
  imageB64 = null, // optional base64 image when using IMAGERY
}) {
  // choose env vars by modality
  const isText = modality === "TEXT";
  const isImage = modality === "IMAGE";
  const isImagery = modality === "IMAGERY"; // image understanding / reverse-check

  const apiUrl =
    (isText
      ? process.env.GEMINI_API_URL_TEXT
      : isImage
      ? process.env.GEMINI_API_URL_IMAGE
      : isImagery
      ? process.env.GEMINI_API_URL_IMAGERY
      : null) || process.env.GEMINI_API_URL;
  const rawKey =
    (isText
      ? process.env.GEMINI_API_KEY_TEXT
      : isImage
      ? process.env.GEMINI_API_KEY_IMAGE
      : isImagery
      ? process.env.GEMINI_API_KEY_IMAGE
      : null) || process.env.GEMINI_API_KEY;

  if (!apiUrl || !rawKey) {
    return {
      ok: false,
      status: 0,
      error: "Missing GEMINI API URL or KEY for modality " + modality,
    };
  }

  // fetch implementation
  let fetchImpl = globalThis.fetch;
  if (!fetchImpl) {
    try {
      ({ fetch: fetchImpl } = require("undici"));
    } catch (e) {
      return {
        ok: false,
        status: 0,
        error: "No fetch available (require Node 18+ or add undici)",
      };
    }
  }

  const headers = { "Content-Type": "application/json" };
  if (/^AIza[0-9A-Za-z-_]+$/.test(rawKey)) headers["X-goog-api-key"] = rawKey;
  else if (/^ya29\./.test(rawKey))
    headers["Authorization"] = `Bearer ${rawKey}`;
  else headers["X-goog-api-key"] = rawKey;

  // Build request body: use Google `contents.parts` shape for text and image prompts
  // For IMAGERY (image understanding) include an image part when provided.
  const textPart =
    typeof prompt !== "undefined" && prompt !== null
      ? { text: String(prompt) }
      : null;
  const parts = [];
  if (textPart) parts.push(textPart);
  if (imageB64) {
    // best-effort image part - providers vary on exact field names
    parts.push({
      image: {
        mimeType: "image/png",
        data: String(imageB64).replace(/\s+/g, ""),
      },
    });
  }

  const body = {
    contents: [{ parts }],
    ...(Object.keys(generationConfig || {}).length ? { generationConfig } : {}),
  };

  try {
    const resp = await fetchImpl(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const raw = await resp.text();
    let json = null;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      /* not JSON */
    }

    // Attempt to find text candidate
    const textContent =
      json?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    // Try to find image data in common fields
    function findImage(o) {
      if (!o) return null;
      if (typeof o === "string") {
        const m = o.match(
          /data:image\/(png|jpeg);base64,([A-Za-z0-9+/=\n\r]+)/
        );
        if (m)
          return {
            mime: m[1] === "jpeg" ? "image/jpeg" : "image/png",
            b64: m[2].replace(/\s+/g, ""),
          };
        if (o.length > 1000 && /^[A-Za-z0-9+/=\n\r]+$/.test(o))
          return { mime: "image/png", b64: o.replace(/\s+/g, "") };
      }
      if (Array.isArray(o)) {
        for (const v of o) {
          const f = findImage(v);
          if (f) return f;
        }
      }
      if (typeof o === "object") {
        for (const k of Object.keys(o)) {
          const f = findImage(o[k]);
          if (f) return f;
        }
      }
      return null;
    }

    const imageFound = findImage(json) || null;

    return {
      ok: resp.ok,
      status: resp.status,
      json,
      rawText: raw,
      text: textContent,
      image: imageFound,
    };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

module.exports = { callGemini };
