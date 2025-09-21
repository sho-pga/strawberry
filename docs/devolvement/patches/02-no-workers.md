```markdown
# Patch template: 02-no-workers

Apply this patch on top of `aether-dev-devolve-01-no-puppeteer` to gate and inline workers.

---

\*\*\* Update File: server/index.js
@@
// worker startup

- startWorkers();

* if (!process.env.SKIP_WORKERS && process.env.WORKER_INLINE !== '1') {
* startWorkers();
* } else {
* console.log('Workers skipped or running inline (WORKER_INLINE=' + (process.env.WORKER_INLINE || '0') + ')');
* }

@@
// job runner injection for inline mode

- jobs.enqueue(jobSpec)

* if (process.env.WORKER_INLINE === '1') {
* await jobs.runInline(jobSpec)
* } else if (!process.env.SKIP_WORKERS) {
* jobs.enqueue(jobSpec)
* }
```

Notes:

- Include a small `jobs.runInline` helper in `server/jobs.js` that imports existing handlers and runs them synchronously.
- Keep logging and metrics so failures are visible in the server logs rather than queued silently.
