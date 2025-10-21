#!/usr/bin/env node
// Shim: forward to server's e2e smoke script when invoked from server wrapper.
// This file was missing and `server/scripts/run_smoke_export.sh` expects it at
// ../scripts/puppeteer_smoke_export.js. Require the server e2e script which
// executes immediately when loaded.
require("../server/scripts/e2e-smoke.js");
