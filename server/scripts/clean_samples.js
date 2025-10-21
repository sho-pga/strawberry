const fs = require("fs");
const path = require("path");
const samplesDir = path.resolve(__dirname, "..", "samples");
if (!fs.existsSync(samplesDir)) process.exit(0);
const files = fs.readdirSync(samplesDir);
for (const f of files) {
  if (
    f.endsWith(".pdf") ||
    f === "export_request_body.json" ||
    f.endsWith(".bin")
  ) {
    try {
      fs.unlinkSync(path.join(samplesDir, f));
      console.log("removed", f);
    } catch (e) {}
  }
}
console.log("clean_samples: done");
