#!/usr/bin/env node
// Wrapper to forward calls to server/scripts/extract-pdf-text.js
// Some tests call the extractor at repository root; this file ensures
// those subprocess calls work regardless of current working directory.
const path = require("path");
const target = path.resolve(__dirname, "../server/scripts/extract-pdf-text.js");
// Use require to execute the script in a separate process context.
require(target);
