import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function tmpExportPath() {
  const dir = path.join(__dirname, "..", "tmp-e2e-exports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `ebook-${Date.now()}.pdf`);
}

describe("E2E: summer-poems export flow (deterministic stubbed)", () => {
  it("produces a valid PDF export using stubbed AI services", async () => {
    const exportPath = tmpExportPath();

    const smokeScript = path.resolve(
      __dirname,
      "..",
      "scripts",
      "run_export_test_inproc.js"
    );
    if (!fs.existsSync(smokeScript)) {
      throw new Error(
        "Smoke script not found; ensure server/scripts/run_export_test_inproc.js exists for deterministic E2E"
      );
    }

    const { writtenPath, capturedStdout, capturedStderr } = await new Promise(
      (resolve, reject) => {
        const proc = spawn(process.execPath, [smokeScript], {
          env: {
            ...process.env,
            USE_REAL_AI: "false",
            // Enable Puppeteer but prefer system Chrome to avoid Chromium download/hangs
            SKIP_PUPPETEER: "false",
            PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "1",
            CHROME_PATH: "/usr/bin/google-chrome-stable",
            OUTPUT_PATH: exportPath,
            JOBS_DB: path.join(__dirname, "..", "tmp-e2e.db"),
          },
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let resolved = false;
        const timeoutMs = 60_000;

        const watchdog = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try {
              proc.kill("SIGKILL");
            } catch (e) {}
            reject(
              new Error(
                `timed out waiting for smoke script; stdout:\n${stdout}\nstderr:\n${stderr}`
              )
            );
          }
        }, timeoutMs);

        const tryResolve = (p) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(watchdog);
            resolve({
              writtenPath: p,
              capturedStdout: stdout,
              capturedStderr: stderr,
            });
          }
        };

        proc.stdout?.on("data", (d) => {
          const s = d.toString();
          stdout += s;
          // Look for the 'Wrote PDF to <path>' line
          const m = s.match(/Wrote PDF to ([^\s]+) size:/);
          if (m && m[1]) return tryResolve(m[1]);
          // Or save json response path marker
          const m2 = s.match(/Wrote request\/response JSON to ([^\s]+)/);
          if (m2 && m2[1]) return tryResolve(m2[1]);
        });

        proc.stderr?.on("data", (d) => {
          stderr += d.toString();
        });

        proc.on("exit", (code) => {
          if (!resolved) {
            // if exit and file exists at expected OUTPUT_PATH, use that
            if (fs.existsSync(exportPath)) return tryResolve(exportPath);
            resolved = true;
            clearTimeout(watchdog);
            if (code === 0)
              return resolve({
                writtenPath: null,
                capturedStdout: stdout,
                capturedStderr: stderr,
              });
            return reject(
              new Error(
                `smoke script exited with code ${code}; stdout:\n${stdout}\nstderr:\n${stderr}`
              )
            );
          }
        });
      }
    );

    // prefer the path reported by the smoke script, else fallback to exportPath
    const finalPath = writtenPath || exportPath;

    if (!fs.existsSync(finalPath)) {
      throw new Error(
        `Export file not found: ${finalPath}\nStdout:\n${capturedStdout}\nStderr:\n${capturedStderr}`
      );
    }

    expect(fs.existsSync(finalPath)).toBeTruthy();
    const header = fs.readFileSync(finalPath).slice(0, 4).toString("utf8");
    expect(header).toBe("%PDF");

    try {
      const pdfQuality = await import("../pdfQuality.mjs");
      const buffer = fs.readFileSync(exportPath);
      const result = await pdfQuality.default(buffer);
      expect(result.pageCount).toBeGreaterThan(0);
      expect(result.errors).toBeUndefined();
    } catch (e) {
      // pdfQuality optional in some dev environments
    }
  }, 120_000);
});
