const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

// Atomically write to disk using async fs.promises: write to a temp file then rename.
async function safeWriteFileAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  try {
    await fsp.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore mkdir errors and let write fail if necessary
  }
  const tmp = `${filePath}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, String(contents), { encoding: "utf8" });
  await fsp.rename(tmp, filePath);
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// Async save - non-blocking for the Node event loop
async function saveContentToFile(content) {
  const envPath = process.env.PROMPT_LOG_PATH;
  const outputDir = envPath
    ? path.resolve(envPath)
    : path.resolve(__dirname, "..", "data");
  const filename = `prompt-${getTimestamp()}.txt`;
  const fullPath = path.join(outputDir, filename);
  await safeWriteFileAtomic(fullPath, content);
  return fullPath;
}

function readLatest() {
  const envPath = process.env.PROMPT_LOG_PATH;
  const outputDir = envPath
    ? path.resolve(envPath)
    : path.resolve(__dirname, "..", "data");

  try {
    if (!fs.existsSync(outputDir)) return null;
    const files = fs.readdirSync(outputDir);
    const promptFiles = files.filter((f) => /^prompt-.*\.txt$/.test(f));
    if (!promptFiles || promptFiles.length === 0) return null;

    let latest = null;
    let latestMtime = 0;
    for (const f of promptFiles) {
      try {
        const full = path.join(outputDir, f);
        const st = fs.statSync(full);
        const mtime = st.mtimeMs || 0;
        if (mtime > latestMtime) {
          latestMtime = mtime;
          latest = full;
        }
      } catch (e) {
        // ignore individual stat errors
      }
    }

    if (!latest) return null;
    return fs.readFileSync(latest, { encoding: "utf8" });
  } catch (e) {
    return null;
  }
}

module.exports = {
  saveContentToFile,
  safeWriteFileAtomic,
  readLatest,
};
