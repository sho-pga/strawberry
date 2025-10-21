// Lightweight service adapter to separate plumbing from concrete service
// implementations. This module exports a single `service` object that
// implements the minimal contract used by the server: `generate(prompt)`
// and `readLatest()`.

const path = require("path");

// Map known implementations to their modules
const IMPLS = {
  genie: () => require("./genieService"),
  sample: () => require("./sampleService"),
};

function resolveImpl(name) {
  if (!name) return IMPLS.genie();
  const key = String(name).toLowerCase();
  if (IMPLS[key]) return IMPLS[key]();
  // Fallback: attempt to require a module by path relative to server/
  try {
    const maybe = require(path.resolve(__dirname, key));
    return maybe;
  } catch (e) {
    // Default to genieService to preserve existing behavior
    return IMPLS.genie();
  }
}

const selectedName = process.env.SERVICE_IMPL || process.env.SERVICE || "genie";
const service = resolveImpl(selectedName);

module.exports = {
  name: selectedName,
  service,
};
