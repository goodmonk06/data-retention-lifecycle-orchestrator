import { prisma } from './db.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo data source (self-referencing to our own DB)
  const dataSource = await prisma.dataSource.upsert({
    where: { name: 'Main Database' },
    update: {},
    create: {
      name: 'Main Database',
      type: 'postgres',
      description: 'Primary PostgreSQL database',
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

  console.log(`✓ Created data source: ${dataSource.name}`);

  // Create demo retention rule for old events
  const deleteRule = await prisma.retentionRule.upsert({
    where: { id: 'demo-delete-rule' },
    update: {},
    create: {
      id: 'demo-delete-rule',
      dataSourceId: dataSource.id,
      name: 'Delete old events (90 days)',
      description: 'Automatically delete event logs older than 90 days',
      action: 'delete',
      ageDays: 90,
      enabled: true,
      filterJson: JSON.stringify({
        table: 'events',
        dateColumn: 'created_at',
      }),
    },
  });

  console.log(`✓ Created retention rule: ${deleteRule.name}`);

  // Create anonymization rule
  const anonymizeRule = await prisma.retentionRule.upsert({
    where: { id: 'demo-anonymize-rule' },
    update: {},
    create: {
      id: 'demo-anonymize-rule',
      dataSourceId: dataSource.id,
      name: 'Anonymize old user events (30 days)',
      description: 'Remove PII from events older than 30 days',
      action: 'anonymize',
      ageDays: 30,
      enabled: false, // Disabled by default for safety
      filterJson: JSON.stringify({
        table: 'events',
        dateColumn: 'created_at',
        fieldsToAnonymize: ['user_id', 'data'],
      }),
    },
  });

  console.log(`✓ Created retention rule: ${anonymizeRule.name}`);

  // Seed demo events with various ages
  console.log('🎭 Creating demo events...');

  const now = new Date();
  const eventsToCreate = [
    // Recent events (< 30 days)
    { eventType: 'login', userId: 'user-1', data: 'Login from IP 192.168.1.1', createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
    { eventType: 'page_view', userId: 'user-2', data: 'Viewed /dashboard', createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    { eventType: 'api_call', userId: 'user-3', data: 'GET /api/users', createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },

    // Medium age events (30-90 days) - should be anonymized
    { eventType: 'login', userId: 'user-4', data: 'Login from IP 10.0.0.1', createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) },
    { eventType: 'logout', userId: 'user-5', data: 'Logout after 2 hours', createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
    { eventType: 'purchase', userId: 'user-6', data: 'Purchased item ABC', createdAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000) },

    // Old events (> 90 days) - should be deleted
    { eventType: 'error', userId: 'user-7', data: 'Error: Connection timeout', createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000) },
    { eventType: 'login', userId: 'user-8', data: 'Login from IP 172.16.0.1', createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000) },
    { eventType: 'api_call', userId: 'user-9', data: 'POST /api/data', createdAt: new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000) },
    { eventType: 'page_view', userId: 'user-10', data: 'Viewed /profile', createdAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000) },
  ];

  for (const event of eventsToCreate) {
    await prisma.event.create({
      data: event,
    });
  }

  const totalEvents = await prisma.event.count();
  console.log(`✓ Created ${eventsToCreate.length} demo events (total: ${totalEvents})`);

  // Show age distribution
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

  console.log(`
📊 Event Distribution:
  • Recent (< 30 days): ${recentCount}
  • Medium (30-90 days): ${mediumCount}
  • Old (> 90 days): ${oldCount}
  `);

  await prisma.$disconnect();
  console.log('✅ Seeding completed!');
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
