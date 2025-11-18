#!/usr/bin/env node
import { Command } from 'commander';
import { connectDB, disconnectDB, prisma } from '../db.js';
import { retentionService } from '../services/retention-service.js';
import { policyService } from '../services/policy-service.js';
import { logger } from '../lib/logger.js';

const program = new Command();

program
  .name('retention-cli')
  .description('CLI tools for Data Retention Lifecycle Orchestrator')
  .version('1.0.0');

// Execute a retention rule
program
  .command('execute <ruleId>')
  .description('Execute a retention rule immediately')
  .action(async (ruleId: string) => {
    try {
      await connectDB();
      logger.info({ ruleId }, 'Executing retention rule via CLI');

      await retentionService.executeRetentionJob(ruleId);

      logger.info('Rule executed successfully');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Failed to execute rule');
      process.exit(1);
    } finally {
      await disconnectDB();
    }
  });

// Execute all active rules
program
  .command('execute-all')
  .description('Execute all active retention rules')
  .action(async () => {
    try {
      await connectDB();
      logger.info('Executing all active retention rules via CLI');

      await retentionService.scheduleAllActiveRules();

      logger.info('All rules executed successfully');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Failed to execute rules');
      process.exit(1);
    } finally {
      await disconnectDB();
    }
  });

// List retention rules
program
  .command('list-rules')
  .description('List all retention rules')
  .option('-e, --enabled-only', 'Show only enabled rules')
  .action(async (options) => {
    try {
      await connectDB();

      const rules = await prisma.retentionRule.findMany({
        where: options.enabledOnly ? { enabled: true } : undefined,
        include: {
          dataSource: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log('\n📋 Retention Rules:\n');
      rules.forEach((rule) => {
        console.log(`  ID: ${rule.id}`);
        console.log(`  Name: ${rule.name}`);
        console.log(`  Data Source: ${rule.dataSource.name}`);
        console.log(`  Action: ${rule.action}`);
        console.log(`  Age: ${rule.ageDays} days`);
        console.log(`  Enabled: ${rule.enabled}`);
        console.log(`  Last Executed: ${rule.lastExecutedAt || 'Never'}`);
        console.log('');
      });

      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Failed to list rules');
      process.exit(1);
    } finally {
      await disconnectDB();
    }
  });

// List policies
program
  .command('list-policies')
  .description('List all retention policies')
  .action(async () => {
    try {
      await connectDB();

      const policies = await policyService.getPolicies();

      console.log('\n📋 Retention Policies:\n');
      policies.forEach((policy) => {
        console.log(`  ID: ${policy.id}`);
        console.log(`  Name: ${policy.name}`);
        console.log(`  Category: ${policy.category}`);
        console.log(`  Rules using this policy: ${policy._count?.retentionRules || 0}`);
        console.log('');
      });

      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Failed to list policies');
      process.exit(1);
    } finally {
      await disconnectDB();
    }
  });

// View job status
program
  .command('job-status <jobId>')
  .description('View status of a retention job')
  .action(async (jobId: string) => {
    try {
      await connectDB();

      const job = await prisma.retentionJob.findUnique({
        where: { id: jobId },
        include: {
          rule: true,
        },
      });

      if (!job) {
        console.error(`Job not found: ${jobId}`);
        process.exit(1);
      }

      console.log('\n📊 Job Status:\n');
      console.log(`  ID: ${job.id}`);
      console.log(`  Rule: ${job.rule.name}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Started: ${job.startedAt}`);
      console.log(`  Finished: ${job.finishedAt || 'Not finished'}`);
      console.log(`  Affected Count: ${job.affectedCount}`);
      console.log(`  Duration: ${job.durationMs ? `${job.durationMs}ms` : 'N/A'}`);

      if (job.errorMessage) {
        console.log(`\n  ❌ Error: ${job.errorMessage}`);
      }

      if (job.logText) {
        console.log('\n  📝 Logs:\n');
        console.log(job.logText.split('\n').map((line) => `    ${line}`).join('\n'));
      }

      console.log('');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Failed to get job status');
      process.exit(1);
    } finally {
      await disconnectDB();
    }
  });

// Test data source connection
program
  .command('test-connection <dataSourceId>')
  .description('Test connection to a data source')
  .action(async (dataSourceId: string) => {
    try {
      await connectDB();

      const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId },
      });

      if (!dataSource) {
        console.error(`Data source not found: ${dataSourceId}`);
        process.exit(1);
      }

      console.log(`\n🔌 Testing connection to: ${dataSource.name}\n`);

      const { ConnectorFactory } = await import('../connectors/factory.js');
      const connector = ConnectorFactory.create(dataSource.configJson);

      await connector.connect();
      console.log('  ✓ Connection successful');

      await connector.disconnect();
      console.log('  ✓ Disconnected\n');

      // Update last tested timestamp
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          lastTestedAt: new Date(),
          status: 'active',
        },
      });

      process.exit(0);
    } catch (error) {
      console.error(`  ❌ Connection failed: ${error}`);
      process.exit(1);
    } finally {
      await disconnectDB();
    }
  });

program.parse();
