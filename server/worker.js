// Minimal worker using BullMQ to process export/pdf jobs
/* eslint-disable no-console */
const { Worker, Queue } = require('bullmq');
const IORedis = require('ioredis');
const path = require('path');
const fs = require('fs');
const { generatePdfBuffer } = require('./pdfGenerator');
const db = require('./crud');

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const exportQueueName = 'export_queue';

const queue = new Queue(exportQueueName, { connection });

async function savePdf(jobId, buffer) {
  const filename = `export-${jobId}-${Date.now()}.pdf`;
  const outPath = path.resolve(__dirname, '../samples', filename);
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

const worker = new Worker(exportQueueName, async job => {
  console.log('[worker] processing job', job.id, job.name, job.data);
  const { exportId, title, body } = job.data;
  try {
    await db.updatePDFExport(exportId, 'processing');
  } catch (e) {
    // ignore if schema differs; we just attempt to update if available
  }

  const buffer = await generatePdfBuffer({ title, body });
  const filePath = await savePdf(job.id, buffer);

  // store reference in DB if function available
  try {
    await db.updatePDFExport(exportId, filePath);
  } catch (e) {
    // best-effort
  }

  console.log('[worker] completed job', job.id, '->', filePath);
}, { connection });

worker.on('failed', (job, err) => {
  console.error('[worker] job failed', job.id, err && err.stack);
});

worker.on('completed', (job) => {
  console.log('[worker] job completed', job.id);
});

console.log('Worker started for queue', exportQueueName);
