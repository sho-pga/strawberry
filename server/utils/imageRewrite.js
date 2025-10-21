const fs = require("fs");
const path = require("path");
let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  // sharp may not be available in some test environments; we'll surface a
  // runtime error only when rasterization is attempted.
}

// Map known remote demo URLs to local sample filenames
const DEMO_URL_MAP = {
  "https://upload.wikimedia.org/wikipedia/commons/3/33/Small_lakeside_view.jpg":
    "/samples/images/summer1.svg",
  "https://upload.wikimedia.org/wikipedia/commons/4/47/Sunset_2007-1.jpg":
    "/samples/images/summer2.svg",
};

function inlineSvgIfAvailable(localPath) {
  try {
    const abs = path.resolve(__dirname, "..", localPath.replace(/^\//, ""));
    if (fs.existsSync(abs) && abs.toLowerCase().endsWith(".svg")) {
      return fs.readFileSync(abs, "utf8");
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function rewriteDemoImages(html, opts = {}) {
  // Synchronous rewrite: maps remote demo URLs to local paths or inlines
  // raw SVG content. opts: { inlineSvg: true }
  let out = html;
  for (const [remote, local] of Object.entries(DEMO_URL_MAP)) {
    if (out.includes(remote)) {
      if (opts.inlineSvg) {
        const svg = inlineSvgIfAvailable(local);
        if (svg) {
          // Replace background-image:url(...) occurrences that contain the remote URL
          out = out.replace(
            new RegExp(
              "background-image:\\s*url\\((?:\\\"|\\'|)" +
                escapeRegExp(remote) +
                "(?:\\\"|\\'|)\\)",
              "g"
            ),
            () => `<div class="bg">${svg}</div>`
          );
          // Also replace <img src="remote"> with inline svg
          out = out.replace(
            new RegExp(
              "<img[^>]+src=(?:\\\"|\\'|)" +
                escapeRegExp(remote) +
                "(?:\\\"|\\'|)[^>]*>",
              "g"
            ),
            `<div class="bg">${svg}</div>`
          );
        } else {
          // fallback: replace remote URL with local path
          out = out.split(remote).join(local);
        }
      } else {
        out = out.split(remote).join(local);
      }
    }
  }
  return out;
}

// Async rasterization helpers -------------------------------------------------
async function rasterizeSvgToPngDataUri(svgString) {
  if (!sharp) throw new Error("sharp is not available for SVG rasterization");
  // Allow caller to specify width/height or density if desired
  const svgBuffer = Buffer.from(svgString, "utf8");
  // Use default toPNG conversion; caller may tune density/size in future
  const pngBuffer = await sharp(svgBuffer).png().toBuffer();
  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

// Async wrapper: first run the synchronous rewrite to inline SVGs, then
// optionally rasterize any inlined SVG blocks into PNG data-URIs.
async function rewriteDemoImagesAsync(html, opts = {}) {
  // opts: { inlineSvg: true, rasterizeSvg: true }
  let out = rewriteDemoImages(html, opts);

  if (opts.inlineSvg && opts.rasterizeSvg) {
    // Find <div class="bg"> ... </div> blocks that contain <svg
    const bgDivRe = /<div\s+class=(?:"|')bg(?:"|')>([\s\S]*?)<\/div>/gi;
    const matches = [];
    let m;
    while ((m = bgDivRe.exec(out)) !== null) {
      if (m[1] && m[1].includes("<svg")) {
        matches.push({ fullMatch: m[0], svg: m[1] });
      }
    }

    for (const mm of matches) {
      try {
        const dataUri = await rasterizeSvgToPngDataUri(mm.svg);
        // Replace the entire bg div with an <img> using the data-uri
        const replacement = `<img class="bg-raster" src="${dataUri}"/>`;
        out = out.split(mm.fullMatch).join(replacement);
      } catch (e) {
        // If rasterization fails, leave the original inline SVG in place and
        // continue processing. Log to console if available.
        try {
          console.warn("SVG rasterization failed:", e && e.message);
        } catch (err) {
          /* ignore logging failures */
        }
      }
    }
  }

  return out;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { rewriteDemoImages, rewriteDemoImagesAsync };
