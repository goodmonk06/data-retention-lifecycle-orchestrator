import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export function createContextLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export function logRetentionJobStart(jobId: string, ruleId: string, ruleName: string) {
  logger.info({ jobId, ruleId, ruleName }, 'Retention job started');
}

export function logRetentionJobComplete(
  jobId: string,
  ruleId: string,
  affectedCount: number,
  durationMs: number
) {
  logger.info({ jobId, ruleId, affectedCount, durationMs }, 'Retention job completed');
}

export function logRetentionJobFailed(jobId: string, ruleId: string, error: Error) {
  logger.error({ jobId, ruleId, error: error.message, stack: error.stack }, 'Retention job failed');
}

export function logConnectorAction(
  connectorType: string,
  action: string,
  table: string,
  affectedCount: number
) {
  logger.info({ connectorType, action, table, affectedCount }, 'Connector action executed');
}
