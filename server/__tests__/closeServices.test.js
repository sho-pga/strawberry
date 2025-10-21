const server = require("../index.js");
const { startServer, closeServices } = server;

describe("closeServices helper", () => {
  test("is callable and clears timers / db handles without exiting", async () => {
    // Start server in test mode without launching Puppeteer
    process.env.SKIP_PUPPETEER = "true";
    await startServer({ listen: false });

    // Simulate presence of jobs DB handle
    if (!server._jobsDb && server.openJobsDb) {
      try {
        // try to open a temp jobs DB if available
        const dbPath = "/tmp/test-jobs-closeServices.db";
        const jobs = require("../jobs");
        const db = await jobs.openJobsDb(dbPath).catch(() => null);
        if (db) server._jobsDb = db;
      } catch (e) {}
    }

    // Call the helper; it should not throw and should clear any recovery timer
    await expect(closeServices("test-run")).resolves.toBeUndefined();

    // After closing, jobs DB handle should be null
    expect(server._jobsDb).toBeNull();
  });
});
