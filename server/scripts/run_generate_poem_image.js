#!/usr/bin/env node
const { generatePoemAndImage } = require("../imageGenerator");

(async () => {
  try {
    const res = await generatePoemAndImage({});
    console.log("Result:", res);
  } catch (e) {
    console.error("Error:", e && e.message ? e.message : e);
    process.exit(1);
  }
})();
