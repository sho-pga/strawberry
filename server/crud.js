// CRUD operations for AetherPress tables

const db = require("./db");

// Retry wrapper for DB operations (handles SQLITE_BUSY)
function withDbRetry(fn, args, cb, maxAttempts = 5, baseDelay = 50) {
  // If caller provided a callback, operate in callback mode; otherwise return a Promise
  const useCallback = typeof cb === "function";

  let attempt = 1;

  function runOnce(resolve, reject) {
    fn(...args, function (err, result) {
      if (err && err.code === "SQLITE_BUSY" && attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(
          `[DB RETRY] SQLITE_BUSY, retrying in ${delay}ms (attempt ${attempt})`
        );
        attempt++;
        setTimeout(() => runOnce(resolve, reject), delay);
        return;
      }
      if (err) {
        console.error(`[DB ERROR]`, err);
      }

      if (useCallback) {
        // Preserve sqlite3's `this` for callback callers
        try {
          cb.apply(this, [err, result]);
        } catch (invokeErr) {
          console.error("[DB CALLBACK ERROR]", invokeErr);
        }
        // In callback mode we don't use resolve/reject
        return;
      }

      // Promise mode - for db.run the callback does not provide a `result` and
      // `this` is the sqlite3 Statement (useful for lastID/changes). For db.get
      // and db.all, the callback provides the result (rows/object) in the
      // `result` parameter. Use `result` when present, otherwise fall back to
      // resolving with `this` (Statement).
      if (err) reject(err);
      else {
        try {
          if (
            typeof result === "undefined" &&
            typeof this !== "undefined" &&
            this
          ) {
            return resolve(this);
          }
        } catch (e) {
          // ignore and fall back
        }
        resolve(result);
      }
    });
  }

  if (useCallback) {
    runOnce();
    return;
  }

  return new Promise((resolve, reject) => runOnce(resolve, reject));
}

// --- PROMPTS ---
exports.createPrompt = (prompt, cb) => {
  console.debug(
    "[crud.createPrompt] called with prompt type:",
    typeof prompt,
    "cb type:",
    typeof cb
  );
  const sql = `INSERT INTO prompts (prompt) VALUES (?)`;
  if (typeof cb === "function") {
    return withDbRetry(db.run.bind(db), [sql, [prompt]], function (err) {
      try {
        cb.call(this, err, this ? { id: this.lastID } : null);
      } catch (e) {
        console.error("[DB CALLBACK ERROR]", e);
      }
    });
  }

  const op = withDbRetry(db.run.bind(db), [sql, [prompt]]);
  return op.then((stmt) => ({ id: stmt ? stmt.lastID : null }));
};

exports.getPrompts = (cb) => {
  const op = withDbRetry(
    db.all.bind(db),
    [`SELECT * FROM prompts ORDER BY created_at DESC`, []],
    cb
  );
  if (!cb) return op.then((rows) => (Array.isArray(rows) ? rows : []));
};

exports.getPromptById = (id, cb) => {
  const op = withDbRetry(
    db.get.bind(db),
    [`SELECT * FROM prompts WHERE id = ?`, [id]],
    cb
  );
  if (!cb)
    return op.then((row) =>
      row &&
      typeof row === "object" &&
      Object.prototype.hasOwnProperty.call(row, "id")
        ? row
        : null
    );
};

exports.updatePrompt = (id, prompt, cb) => {
  const sql = `UPDATE prompts SET prompt = ? WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.run.bind(db), [sql, [prompt, id]], function (err) {
      try {
        cb.call(this, err, { changes: this.changes });
      } catch (e) {
        console.error("[DB CALLBACK ERROR]", e);
      }
    });
  }

  const op = withDbRetry(db.run.bind(db), [sql, [prompt, id]]);
  return op.then((stmt) => ({ changes: stmt ? stmt.changes : 0 }));
};

exports.deletePrompt = (id, cb) => {
  const sql = `DELETE FROM prompts WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.run.bind(db), [sql, [id]], function (err) {
      try {
        cb.call(this, err, { changes: this.changes });
      } catch (e) {
        console.error("[DB CALLBACK ERROR]", e);
      }
    });
  }

  const op = withDbRetry(db.run.bind(db), [sql, [id]]);
  return op.then((stmt) => ({ changes: stmt ? stmt.changes : 0 }));
};

// --- AI_RESULTS ---
exports.createAIResult = (prompt_id, result, cb) => {
  let jsonResult;
  try {
    jsonResult = JSON.stringify(result);
  } catch (e) {
    if (cb)
      return cb(new Error("Invalid result object for JSON serialization"));
    return Promise.reject(
      new Error("Invalid result object for JSON serialization")
    );
  }

  const sql = `INSERT INTO ai_results (prompt_id, result) VALUES (?, ?)`;
  if (typeof cb === "function") {
    return withDbRetry(
      db.run.bind(db),
      [sql, [prompt_id, jsonResult]],
      function (err) {
        try {
          cb.call(this, err, this ? { id: this.lastID } : null);
        } catch (e) {
          console.error("[DB CALLBACK ERROR]", e);
        }
      }
    );
  }

  const op = withDbRetry(db.run.bind(db), [sql, [prompt_id, jsonResult]]);
  return op.then((stmt) => ({ id: stmt ? stmt.lastID : null }));
};

exports.getAIResults = (cb) => {
  const sql = `SELECT * FROM ai_results ORDER BY created_at DESC`;
  if (typeof cb === "function") {
    return withDbRetry(db.all.bind(db), [sql, []], (err, rows) => {
      if (err) return cb(err);
      try {
        rows = rows.map((row) => ({ ...row, result: JSON.parse(row.result) }));
        cb(null, rows);
      } catch (e) {
        cb(new Error("Invalid JSON in database"));
      }
    });
  }

  const op = withDbRetry(db.all.bind(db), [sql, []]);
  return op.then((rows) =>
    rows.map((row) => ({ ...row, result: JSON.parse(row.result) }))
  );
};

exports.getAIResultById = (id, cb) => {
  const sql = `SELECT * FROM ai_results WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.get.bind(db), [sql, [id]], (err, row) => {
      if (err || !row) return cb(err, row);
      try {
        row.result = JSON.parse(row.result);
        cb(null, row);
      } catch (e) {
        cb(new Error("Invalid JSON in database"));
      }
    });
  }

  const op = withDbRetry(db.get.bind(db), [sql, [id]]);
  return op.then((row) =>
    row ? { ...row, result: JSON.parse(row.result) } : null
  );
};

exports.updateAIResult = (id, result, cb) => {
  const sql = `UPDATE ai_results SET result = ? WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.run.bind(db), [sql, [result, id]], function (err) {
      try {
        cb.call(this, err, { changes: this.changes });
      } catch (e) {
        console.error("[DB CALLBACK ERROR]", e);
      }
    });
  }

  const op = withDbRetry(db.run.bind(db), [sql, [result, id]]);
  return op.then((stmt) => ({ changes: stmt ? stmt.changes : 0 }));
};

exports.deleteAIResult = (id, cb) => {
  const sql = `DELETE FROM ai_results WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.run.bind(db), [sql, [id]], function (err) {
      try {
        cb.call(this, err, { changes: this.changes });
      } catch (e) {
        console.error("[DB CALLBACK ERROR]", e);
      }
    });
  }

  const op = withDbRetry(db.run.bind(db), [sql, [id]]);
  return op.then((stmt) => ({ changes: stmt ? stmt.changes : 0 }));
};

// --- OVERRIDES ---
// --- OVERRIDES ---
// Convert to dual-mode (Promise or callback)
exports.createOverride = (ai_result_id, override, cb) => {
  let jsonOverride;
  try {
    jsonOverride = JSON.stringify(override);
  } catch (e) {
    if (typeof cb === "function")
      return cb(new Error("Invalid override object for JSON serialization"));
    return Promise.reject(
      new Error("Invalid override object for JSON serialization")
    );
  }

  const sql = `INSERT INTO overrides (ai_result_id, override) VALUES (?, ?)`;
  if (typeof cb === "function") {
    return withDbRetry(
      db.run.bind(db),
      [sql, [ai_result_id, jsonOverride]],
      function (err) {
        try {
          cb.call(this, err, this ? { id: this.lastID } : null);
        } catch (e) {
          console.error("[DB CALLBACK ERROR]", e);
        }
      }
    );
  }

  const op = withDbRetry(db.run.bind(db), [sql, [ai_result_id, jsonOverride]]);
  return op.then((stmt) => ({ id: stmt ? stmt.lastID : null }));
};

exports.getOverrides = (cb) => {
  console.log("DEBUG: crud.getOverrides called");
  const sql = `SELECT * FROM overrides ORDER BY created_at DESC`;
  if (typeof cb === "function") {
    return withDbRetry(db.all.bind(db), [sql, []], (err, rows) => {
      if (err) return cb(err);
      try {
        rows = rows.map((row) => ({
          ...row,
          override:
            typeof row.override === "string"
              ? JSON.parse(row.override)
              : row.override,
        }));
        cb(null, rows);
      } catch (e) {
        cb(new Error("Invalid JSON in database"));
      }
    });
  }

  const op = withDbRetry(db.all.bind(db), [sql, []]);
  return op.then((rows) =>
    rows.map((row) => ({
      ...row,
      override:
        typeof row.override === "string"
          ? JSON.parse(row.override)
          : row.override,
    }))
  );
};

exports.getOverrideById = (id, cb) => {
  const sql = `SELECT * FROM overrides WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.get.bind(db), [sql, [id]], (err, row) => {
      if (err || !row) return cb(err, row);
      try {
        row.override =
          typeof row.override === "string"
            ? JSON.parse(row.override)
            : row.override;
        cb(null, row);
      } catch (e) {
        cb(new Error("Invalid JSON in database"));
      }
    });
  }

  const op = withDbRetry(db.get.bind(db), [sql, [id]]);
  return op.then((row) =>
    row
      ? {
          ...row,
          override:
            typeof row.override === "string"
              ? JSON.parse(row.override)
              : row.override,
        }
      : null
  );
};

// (old callback-only updateOverride removed; using dual-mode implementation below)

exports.updateOverride = (id, override, cb) => {
  let jsonOverride;
  try {
    jsonOverride = JSON.stringify(override);
  } catch (e) {
    if (typeof cb === "function")
      return cb(new Error("Invalid override object for JSON serialization"));
    return Promise.reject(
      new Error("Invalid override object for JSON serialization")
    );
  }

  const sql = `UPDATE overrides SET override = ? WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(
      db.run.bind(db),
      [sql, [jsonOverride, id]],
      function (err) {
        if (err) return cb(err);
        if (this.changes === 0) return cb(null, { changes: 0 });
        cb(null, { changes: this.changes });
      }
    );
  }

  const op = withDbRetry(db.run.bind(db), [sql, [jsonOverride, id]]);
  return op.then((stmt) => ({ changes: stmt ? stmt.changes : 0 }));
};

exports.deleteOverride = (id, cb) => {
  const sql = `DELETE FROM overrides WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.run.bind(db), [sql, [id]], function (err) {
      try {
        cb.call(this, err, { changes: this.changes });
      } catch (e) {
        console.error("[DB CALLBACK ERROR]", e);
      }
    });
  }

  const op = withDbRetry(db.run.bind(db), [sql, [id]]);
  return op.then((stmt) => ({ changes: stmt ? stmt.changes : 0 }));
};

// --- PDF_EXPORTS ---
exports.createPDFExport = (ai_result_id, file_path, cb) => {
  const sql = `INSERT INTO pdf_exports (ai_result_id, file_path) VALUES (?, ?)`;
  if (typeof cb === "function") {
    return withDbRetry(
      db.run.bind(db),
      [sql, [ai_result_id, file_path]],
      function (err) {
        try {
          cb.call(this, err, this ? { id: this.lastID } : null);
        } catch (e) {
          console.error("[DB CALLBACK ERROR]", e);
        }
      }
    );
  }

  const op = withDbRetry(db.run.bind(db), [sql, [ai_result_id, file_path]]);
  return op.then((stmt) => ({ id: stmt ? stmt.lastID : null }));
};

exports.getPDFExports = (cb) => {
  const sql = `SELECT * FROM pdf_exports ORDER BY created_at DESC`;
  if (typeof cb === "function") {
    return withDbRetry(db.all.bind(db), [sql, []], cb);
  }
  const op = withDbRetry(db.all.bind(db), [sql, []]);
  return op;
};

exports.getPDFExportById = (id, cb) => {
  const sql = `SELECT * FROM pdf_exports WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.get.bind(db), [sql, [id]], cb);
  }
  const op = withDbRetry(db.get.bind(db), [sql, [id]]);
  return op;
};

exports.updatePDFExport = (id, file_path, cb) => {
  const sql = `UPDATE pdf_exports SET file_path = ? WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.run.bind(db), [sql, [file_path, id]], function (err) {
      try {
        cb.call(this, err, { changes: this.changes });
      } catch (e) {
        console.error("[DB CALLBACK ERROR]", e);
      }
    });
  }
  const op = withDbRetry(db.run.bind(db), [sql, [file_path, id]]);
  return op.then((stmt) => ({ changes: stmt ? stmt.changes : 0 }));
};

exports.deletePDFExport = (id, cb) => {
  const sql = `DELETE FROM pdf_exports WHERE id = ?`;
  if (typeof cb === "function") {
    return withDbRetry(db.run.bind(db), [sql, [id]], function (err) {
      try {
        cb.call(this, err, { changes: this.changes });
      } catch (e) {
        console.error("[DB CALLBACK ERROR]", e);
      }
    });
  }
  const op = withDbRetry(db.run.bind(db), [sql, [id]]);
  return op.then((stmt) => ({ changes: stmt ? stmt.changes : 0 }));
};
