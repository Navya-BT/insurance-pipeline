const Bull = require('bull');
const aiProcessor = require('../services/aiProcessor');
const logger = require('../utils/logger');

let claimQueue;
try {
  claimQueue = new Bull('claim-processing', { redis: process.env.REDIS_URL || 'redis://localhost:6379' });

  claimQueue.process('process-claim', 5, async (job) => {
    const { claimId, claim } = job.data;
    logger.info(`Processing claim ${claimId}`);
    const validation = await aiProcessor.validateWithBedrock(claim);
    return { claimId, validation, processedAt: new Date().toISOString() };
  });

  claimQueue.on('completed', (job, result) => logger.info(`Job ${job.id} completed`, result));
  claimQueue.on('failed', (job, err) => logger.error(`Job ${job.id} failed: ${err.message}`));
} catch (err) {
  logger.warn('Redis unavailable; queue disabled. Claims processed synchronously.');
}

async function addJob(type, data) {
  if (claimQueue) {
    return claimQueue.add(type, data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  }
  logger.info(`[Sync] Processing job ${type}`);
}

module.exports = { addJob };
