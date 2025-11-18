import { prisma } from './db.js';
import { logger } from './lib/logger.js';

async function seed() {
  logger.info('🌱 Starting Phase 3 enhanced seeding...');

  // Create main database data source
  const mainDataSource = await prisma.dataSource.upsert({
    where: { name: 'Main Database' },
    update: {},
    create: {
      name: 'Main Database',
      type: 'postgres',
      description: 'Primary PostgreSQL database',
      status: 'active',
      tags: ['primary', 'production'],
      configJson: JSON.stringify({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'postgres',
        port: 5432,
        database: process.env.POSTGRES_DB || 'retention_db',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
      }),
      metadataJson: JSON.stringify({
        version: '16',
        region: 'us-east-1',
      }),
    },
  });

  logger.info({ id: mainDataSource.id }, 'Created/updated Main Database data source');

  // Create secondary data source
  const analyticsDataSource = await prisma.dataSource.upsert({
    where: { name: 'Analytics Database' },
    update: {},
    create: {
      name: 'Analytics Database',
      type: 'postgres',
      description: 'Analytics and reporting database',
      status: 'active',
      tags: ['analytics', 'read-replica'],
      configJson: JSON.stringify({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'postgres',
        port: 5432,
        database: process.env.POSTGRES_DB || 'retention_db',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
      }),
    },
  });

  logger.info({ id: analyticsDataSource.id }, 'Created/updated Analytics Database data source');

  // Create retention policies (templates)
  const gdprPolicy = await prisma.retentionPolicy.upsert({
    where: { name: 'GDPR Personal Data Retention' },
    update: {},
    create: {
      name: 'GDPR Personal Data Retention',
      description: 'Standard GDPR-compliant retention for personal data',
      category: 'gdpr',
      tags: ['gdpr', 'privacy', 'compliance'],
      templateJson: JSON.stringify({
        action: 'anonymize',
        ageDays: 90,
        filterTemplate: {
          dateColumn: 'created_at',
          fieldsToAnonymize: ['user_id', 'email', 'ip_address'],
        },
        scheduleType: 'daily',
      }),
    },
  });

  const performancePolicy = await prisma.retentionPolicy.upsert({
    where: { name: 'Performance Optimization' },
    update: {},
    create: {
      name: 'Performance Optimization',
      description: 'Remove old data to improve database performance',
      category: 'performance',
      tags: ['performance', 'optimization'],
      templateJson: JSON.stringify({
        action: 'delete',
        ageDays: 365,
        filterTemplate: {
          dateColumn: 'created_at',
        },
        scheduleType: 'weekly',
      }),
    },
  });

  const archivePolicy = await prisma.retentionPolicy.upsert({
    where: { name: 'Long-term Archive' },
    update: {},
    create: {
      name: 'Long-term Archive',
      description: 'Archive old data to cold storage',
      category: 'compliance',
      tags: ['archive', 'compliance', 'audit'],
      templateJson: JSON.stringify({
        action: 'archive',
        ageDays: 730, // 2 years
        filterTemplate: {
          dateColumn: 'created_at',
        },
        scheduleType: 'monthly',
      }),
    },
  });

  logger.info('Created retention policy templates');

  // Create retention rules with various configurations
  const deleteOldEventsRule = await prisma.retentionRule.upsert({
    where: { id: 'demo-delete-rule' },
    update: {},
    create: {
      id: 'demo-delete-rule',
      dataSourceId: mainDataSource.id,
      policyId: performancePolicy.id,
      name: 'Delete old events (90 days)',
      description: 'Automatically delete event logs older than 90 days',
      action: 'delete',
      ageDays: 90,
      enabled: true,
      priority: 10,
      tags: ['events', 'cleanup'],
      notifyOnComplete: false,
      notifyOnFailure: true,
      dryRun: false,
      filterJson: JSON.stringify({
        table: 'events',
        dateColumn: 'created_at',
      }),
    },
  });

  const anonymizeEventsRule = await prisma.retentionRule.upsert({
    where: { id: 'demo-anonymize-rule' },
    update: {},
    create: {
      id: 'demo-anonymize-rule',
      dataSourceId: mainDataSource.id,
      policyId: gdprPolicy.id,
      name: 'Anonymize user events (30 days)',
      description: 'Remove PII from events older than 30 days for GDPR compliance',
      action: 'anonymize',
      ageDays: 30,
      enabled: false, // Disabled by default for safety
      priority: 20,
      tags: ['gdpr', 'privacy'],
      notifyOnComplete: true,
      notifyOnFailure: true,
      dryRun: true, // Dry run mode for testing
      filterJson: JSON.stringify({
        table: 'events',
        dateColumn: 'created_at',
        fieldsToAnonymize: ['user_id', 'data'],
      }),
    },
  });

  const archiveOldEventsRule = await prisma.retentionRule.upsert({
    where: { id: 'demo-archive-rule' },
    update: {},
    create: {
      id: 'demo-archive-rule',
      dataSourceId: mainDataSource.id,
      policyId: archivePolicy.id,
      name: 'Archive events (180 days)',
      description: 'Archive events older than 180 days to cold storage',
      action: 'archive',
      ageDays: 180,
      enabled: false,
      priority: 5,
      tags: ['archive'],
      notifyOnComplete: true,
      notifyOnFailure: true,
      dryRun: false,
      filterJson: JSON.stringify({
        table: 'events',
        dateColumn: 'created_at',
      }),
    },
  });

  logger.info('Created retention rules');

  // Seed demo events with realistic distribution
  logger.info('🎭 Creating demo events...');

  const now = new Date();
  const eventTypes = ['login', 'logout', 'page_view', 'api_call', 'error', 'purchase', 'signup'];
  const eventsData = [];

  // Recent events (< 30 days) - 20 events
  for (let i = 0; i < 20; i++) {
    eventsData.push({
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      userId: `user-${Math.floor(Math.random() * 100)}`,
      data: JSON.stringify({ ip: `192.168.1.${Math.floor(Math.random() * 255)}`, sessionId: `sess-${Date.now()}-${i}` }),
      createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  }

  // Medium age events (30-90 days) - should be anonymized - 30 events
  for (let i = 0; i < 30; i++) {
    eventsData.push({
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      userId: `user-${Math.floor(Math.random() * 100)}`,
      data: JSON.stringify({ ip: `10.0.0.${Math.floor(Math.random() * 255)}`, sessionId: `sess-old-${i}` }),
      createdAt: new Date(now.getTime() - (30 + Math.random() * 60) * 24 * 60 * 60 * 1000),
    });
  }

  // Old events (> 90 days) - should be deleted - 50 events
  for (let i = 0; i < 50; i++) {
    eventsData.push({
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      userId: `user-${Math.floor(Math.random() * 100)}`,
      data: JSON.stringify({ ip: `172.16.0.${Math.floor(Math.random() * 255)}` }),
      createdAt: new Date(now.getTime() - (90 + Math.random() * 200) * 24 * 60 * 60 * 1000),
    });
  }

  // Bulk create events
  await prisma.event.deleteMany({}); // Clear existing
  await prisma.event.createMany({
    data: eventsData,
  });

  const totalEvents = await prisma.event.count();
  const recentCount = await prisma.event.count({
    where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
  });
  const mediumCount = await prisma.event.count({
    where: {
      AND: [
        { createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
        { createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });
  const oldCount = await prisma.event.count({
    where: { createdAt: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } },
  });

  logger.info({
    total: totalEvents,
    recent: recentCount,
    medium: mediumCount,
    old: oldCount,
  }, 'Event distribution');

  logger.info('\n✅ Phase 3 seeding completed!\n');
  logger.info('📊 Summary:');
  logger.info(`  - Data Sources: 2`);
  logger.info(`  - Retention Policies: 3`);
  logger.info(`  - Retention Rules: 3`);
  logger.info(`  - Demo Events: ${totalEvents}`);
  logger.info(`    • Recent (< 30 days): ${recentCount}`);
  logger.info(`    • Medium (30-90 days): ${mediumCount}`);
  logger.info(`    • Old (> 90 days): ${oldCount}`);

  await prisma.$disconnect();
}

seed().catch((error) => {
  logger.error({ error }, 'Seeding failed');
  process.exit(1);
});
