import { Queue, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
import { RetentionService } from '../services/retention-service.js';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

const connection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
});

export const retentionQueue = new Queue('retention-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Queue scheduler for managing delayed/repeating jobs
export const retentionScheduler = new QueueScheduler('retention-jobs', {
  connection,
});

// Worker to process retention jobs
const retentionService = new RetentionService();

export const retentionWorker = new Worker(
  'retention-jobs',
  async (job) => {
    console.log(`Processing job ${job.id} for rule ${job.data.ruleId}`);
    await retentionService.executeRetentionJob(job.data.ruleId);
  },
  {
    connection,
    concurrency: 5,
  }
);

retentionWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

retentionWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

// Schedule job for a specific rule
export async function scheduleRetentionJob(ruleId: string, immediate = false) {
  const jobData = { ruleId };

  if (immediate) {
    return await retentionQueue.add(`rule-${ruleId}`, jobData);
  }

  // For recurring jobs, you can add repeat options
  return await retentionQueue.add(`rule-${ruleId}`, jobData, {
    repeat: {
      pattern: '0 2 * * *', // Daily at 2 AM
    },
  });
}

// Schedule all active rules (typically called on startup or via cron)
export async function scheduleAllActiveRules() {
  const retentionService = new RetentionService();
  await retentionService.scheduleAllActiveRules();
}

export async function closeQueue() {
  await retentionWorker.close();
  await retentionScheduler.close();
  await retentionQueue.close();
  await connection.quit();
}
