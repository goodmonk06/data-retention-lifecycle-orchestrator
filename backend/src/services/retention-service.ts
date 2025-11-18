import { prisma } from '../db.js';
import { ConnectorFactory } from '../connectors/factory.js';
import type { RetentionFilter } from '../connectors/types.js';

export class RetentionService {
  async executeRetentionJob(ruleId: string): Promise<void> {
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

    const logMessages: string[] = [];
    logMessages.push(`[${new Date().toISOString()}] Starting retention job ${job.id}`);
    logMessages.push(`Rule: ${job.rule.name} (${job.rule.action})`);

    try {
      const { rule } = job;
      const { dataSource } = rule;

      // Create connector
      const connector = ConnectorFactory.create(dataSource.configJson);
      await connector.connect();

      logMessages.push(`Connected to data source: ${dataSource.name} (${dataSource.type})`);

      // Parse filter configuration
      const filter: RetentionFilter = JSON.parse(rule.filterJson);
      logMessages.push(`Target: ${filter.table}, Date column: ${filter.dateColumn}, Age: ${rule.ageDays} days`);

      let result;

      // Execute action based on rule type
      switch (rule.action) {
        case 'delete':
          result = await connector.executeDelete(filter, rule.ageDays);
          break;

        case 'anonymize': {
          // For anonymize, we expect fieldsToAnonymize in filterJson
          const filterConfig = JSON.parse(rule.filterJson);
          const fieldsToAnonymize = filterConfig.fieldsToAnonymize || [];
          result = await connector.executeAnonymize(filter, rule.ageDays, fieldsToAnonymize);
          break;
        }

        case 'archive':
          // Archive functionality can be added later
          throw new Error('Archive action not yet implemented');

        default:
          throw new Error(`Unknown action: ${rule.action}`);
      }

      await connector.disconnect();

      if (result.success) {
        logMessages.push(`✓ Success: ${result.message}`);
        logMessages.push(`Affected rows: ${result.affectedCount}`);

        await prisma.retentionJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            finishedAt: new Date(),
            affectedCount: result.affectedCount,
            logText: logMessages.join('\n'),
          },
        });
      } else {
        throw new Error(result.error || 'Unknown error during execution');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logMessages.push(`✗ Error: ${errorMessage}`);

      await prisma.retentionJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage,
          logText: logMessages.join('\n'),
        },
      });

      throw error;
    }
  }

  async scheduleAllActiveRules(): Promise<void> {
    const activeRules = await prisma.retentionRule.findMany({
      where: { enabled: true },
    });

    console.log(`Found ${activeRules.length} active retention rules`);

    for (const rule of activeRules) {
      try {
        await this.executeRetentionJob(rule.id);
      } catch (error) {
        console.error(`Failed to execute rule ${rule.id}:`, error);
      }
    }
  }
}
