import { prisma } from '../db.js';
import { ConnectorFactory } from '../connectors/factory.js';
import type { RetentionFilter } from '../connectors/types.js';
import { logger, logRetentionJobStart, logRetentionJobComplete, logRetentionJobFailed } from '../lib/logger.js';
import { metrics, METRICS } from '../lib/metrics.js';
import { eventBus } from '../lib/events.js';
import { adapters } from '../lib/adapters/index.js';
import { auditService } from './audit-service.js';

export class RetentionService {
  async executeRetentionJob(ruleId: string): Promise<void> {
    const startTime = Date.now();

    const job = await prisma.retentionJob.create({
      data: {
        ruleId,
        status: 'running',
        startedAt: new Date(),
      },
      include: {
        rule: {
          include: {
            dataSource: true,
          },
        },
      },
    });

    const { rule } = job;
    const { dataSource } = rule;

    logRetentionJobStart(job.id, ruleId, rule.name);
    metrics.recordCounter(METRICS.RETENTION_JOB_STARTED, 1, {
      action: rule.action,
      dataSource: dataSource.name,
    });

    await eventBus.emit('retention.job.started', {
      jobId: job.id,
      ruleId,
      ruleName: rule.name,
    });

    const logMessages: string[] = [];
    logMessages.push(`[${new Date().toISOString()}] Starting retention job ${job.id}`);
    logMessages.push(`Rule: ${rule.name} (${rule.action})`);

    try {
      // Check if this is a dry run
      if (rule.dryRun) {
        logMessages.push('[DRY RUN MODE] No actual changes will be made');
      }

      // Create connector
      const connector = ConnectorFactory.create(dataSource.configJson);
      await connector.connect();

      logMessages.push(`Connected to data source: ${dataSource.name} (${dataSource.type})`);

      // Parse filter configuration
      const filter: RetentionFilter = JSON.parse(rule.filterJson);
      logMessages.push(
        `Target: ${filter.table}, Date column: ${filter.dateColumn}, Age: ${rule.ageDays} days`
      );

      let result;
      let archiveId: string | undefined;

      // Execute action based on rule type
      switch (rule.action) {
        case 'delete':
          if (rule.dryRun) {
            result = { success: true, affectedCount: 0, message: 'Dry run - no records deleted' };
          } else {
            result = await connector.executeDelete(filter, rule.ageDays);
            metrics.recordCounter(METRICS.RECORDS_DELETED, result.affectedCount, {
              table: filter.table,
            });
            await eventBus.emit('records.deleted', {
              dataSourceId: dataSource.id,
              table: filter.table,
              count: result.affectedCount,
              ruleName: rule.name,
            });
          }
          break;

        case 'anonymize': {
          const filterConfig = JSON.parse(rule.filterJson);
          const fieldsToAnonymize = filterConfig.fieldsToAnonymize || [];

          if (rule.dryRun) {
            result = { success: true, affectedCount: 0, message: 'Dry run - no records anonymized' };
          } else {
            result = await connector.executeAnonymize(filter, rule.ageDays, fieldsToAnonymize);
            metrics.recordCounter(METRICS.RECORDS_ANONYMIZED, result.affectedCount, {
              table: filter.table,
            });
            await eventBus.emit('records.anonymized', {
              dataSourceId: dataSource.id,
              table: filter.table,
              count: result.affectedCount,
              fields: fieldsToAnonymize,
              ruleName: rule.name,
            });
          }
          break;
        }

        case 'archive': {
          // Archive implementation using storage adapter
          logMessages.push('Archiving records...');

          if (rule.dryRun) {
            result = { success: true, affectedCount: 0, message: 'Dry run - no records archived' };
          } else {
            // In a real implementation, we'd query the records first
            // For now, we'll create a stub archive entry
            const storageAdapter = adapters.getStorageAdapter();
            archiveId = await storageAdapter.archive([], {
              sourceTable: filter.table,
              recordCount: 0, // Would be actual count
              timestamp: new Date(),
              ruleName: rule.name,
            });

            const archive = await prisma.retentionArchive.create({
              data: {
                dataSourceName: dataSource.name,
                tableName: filter.table,
                recordCount: 0, // Would be actual count
                ruleName: rule.name,
                storageLocation: archiveId,
                storageType: 'inmemory',
              },
            });

            archiveId = archive.id;
            result = { success: true, affectedCount: 0, message: `Archived to ${archiveId}` };
            metrics.recordCounter(METRICS.RECORDS_ARCHIVED, result.affectedCount, {
              table: filter.table,
            });
          }
          break;
        }

        default:
          throw new Error(`Unknown action: ${rule.action}`);
      }

      await connector.disconnect();

      if (result.success) {
        const durationMs = Date.now() - startTime;

        logMessages.push(`✓ Success: ${result.message}`);
        logMessages.push(`Affected rows: ${result.affectedCount}`);

        await prisma.retentionJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            finishedAt: new Date(),
            affectedCount: result.affectedCount,
            durationMs,
            archiveId,
            logText: logMessages.join('\n'),
          },
        });

        // Update rule's last executed timestamp
        await prisma.retentionRule.update({
          where: { id: ruleId },
          data: { lastExecutedAt: new Date() },
        });

        logRetentionJobComplete(job.id, ruleId, result.affectedCount, durationMs);
        metrics.recordCounter(METRICS.RETENTION_JOB_COMPLETED, 1, { action: rule.action });
        metrics.recordDuration(METRICS.RETENTION_JOB_DURATION, durationMs, { action: rule.action });

        await eventBus.emit('retention.job.completed', {
          jobId: job.id,
          ruleId,
          affectedCount: result.affectedCount,
          durationMs,
        });

        // Send notification if configured
        if (rule.notifyOnComplete) {
          await adapters.getNotificationAdapter().send({
            title: `Retention Job Completed: ${rule.name}`,
            message: `Processed ${result.affectedCount} records in ${durationMs}ms`,
            severity: 'success',
            metadata: { jobId: job.id, ruleId },
          });
        }

        await auditService.log({
          entityType: 'retention_job',
          entityId: job.id,
          action: 'executed',
          retentionRuleId: ruleId,
          metadata: { affectedCount: result.affectedCount, durationMs },
        });
      } else {
        throw new Error(result.error || 'Unknown error during execution');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const durationMs = Date.now() - startTime;

      logMessages.push(`✗ Error: ${errorMessage}`);

      await prisma.retentionJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage,
          durationMs,
          logText: logMessages.join('\n'),
        },
      });

      logRetentionJobFailed(job.id, ruleId, error as Error);
      metrics.recordCounter(METRICS.RETENTION_JOB_FAILED, 1, { action: rule.action });

      await eventBus.emit('retention.job.failed', {
        jobId: job.id,
        ruleId,
        error: errorMessage,
      });

      // Send notification on failure if configured
      if (rule.notifyOnFailure) {
        await adapters.getNotificationAdapter().send({
          title: `Retention Job Failed: ${rule.name}`,
          message: errorMessage,
          severity: 'error',
          metadata: { jobId: job.id, ruleId },
        });
      }

      await auditService.log({
        entityType: 'retention_job',
        entityId: job.id,
        action: 'failed',
        retentionRuleId: ruleId,
        metadata: { error: errorMessage },
      });

      throw error;
    }
  }

  async scheduleAllActiveRules(): Promise<void> {
    const activeRules = await prisma.retentionRule.findMany({
      where: { enabled: true, dryRun: false },
      orderBy: { priority: 'desc' }, // Higher priority rules first
    });

    logger.info({ count: activeRules.length }, 'Scheduling active retention rules');

    for (const rule of activeRules) {
      try {
        await this.executeRetentionJob(rule.id);
      } catch (error) {
        logger.error({ ruleId: rule.id, error }, 'Failed to execute retention rule');
      }
    }
  }

  async estimateImpact(ruleId: string): Promise<{ estimatedCount: number; tables: string[] }> {
    // Dry-run estimation logic
    // In a real implementation, this would query the database to count matching records
    logger.info({ ruleId }, 'Estimating retention rule impact');

    return {
      estimatedCount: 0,
      tables: [],
    };
  }
}

export const retentionService = new RetentionService();
