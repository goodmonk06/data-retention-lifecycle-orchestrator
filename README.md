# Data Retention Lifecycle Orchestrator

A comprehensive service for managing data retention policies with automated cleanup, anonymization, and archival operations. Built for compliance with regulations like GDPR, CCPA, and organizational data governance policies.

## Features

- **Data Source Management**: Connect to PostgreSQL databases (extensible to other sources)
- **Flexible Retention Rules**: Define rules based on age, table, and custom conditions
- **Multiple Actions**: Delete, anonymize, or archive data automatically
- **Job Scheduling**: BullMQ-powered queue with configurable schedules
- **Job History**: Complete audit trail of all retention operations
- **Admin UI**: Next.js-based dashboard for managing sources, rules, and viewing job history
- **Docker Ready**: Full Docker Compose setup for easy deployment

## Tech Stack

### Backend
- **Node.js** + **TypeScript**
- **Fastify** - Fast, low-overhead web framework
- **Prisma** - Type-safe ORM for PostgreSQL
- **BullMQ** - Redis-based job queue
- **PostgreSQL** - Primary database

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript**
- **Vanilla CSS** - Lightweight styling

### Infrastructure
- **Docker** + **Docker Compose**
- **Redis** - Queue backing store

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### Run with Docker

```bash
# Clone the repository
git clone <repository-url>
cd data-retention-lifecycle-orchestrator

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

The services will be available at:
- **Admin UI**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# In backend/
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev

# In admin/ (new terminal)
cd admin
npm install
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Admin UI (Next.js)                 │
│                    http://localhost:3000                │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────────┐
│                Backend (Fastify + Prisma)               │
│                  http://localhost:3001                  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Routes     │  │   Services   │  │  Connectors  │ │
│  │   (CRUD)     │  │ (Business)   │  │  (Postgres)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────┬────────────────────────┬──────────────────────┘
         │                        │
    ┌────▼─────┐           ┌──────▼───────┐
    │PostgreSQL│           │ Redis+BullMQ │
    │  (Data)  │           │   (Queue)    │
    └──────────┘           └──────────────┘
```

## Domain Model

### DataSource
Represents a data source (database, API, etc.) that contains data subject to retention policies.

```typescript
{
  id: string
  name: string
  type: "postgres" | "api" | ...
  description?: string
  configJson: string  // Connection configuration
}
```

**Example configJson for PostgreSQL:**
```json
{
  "type": "postgres",
  "host": "postgres",
  "port": 5432,
  "database": "retention_db",
  "user": "postgres",
  "password": "postgres"
}
```

### RetentionRule
Defines a retention policy with action to be taken on old data.

```typescript
{
  id: string
  dataSourceId: string
  name: string
  description?: string
  action: "delete" | "anonymize" | "archive"
  ageDays: number
  filterJson: string  // Target table and conditions
  enabled: boolean
  scheduleType: "daily" | "weekly" | "monthly"
}
```

**Example filterJson for Delete:**
```json
{
  "table": "events",
  "dateColumn": "created_at"
}
```

**Example filterJson for Anonymize:**
```json
{
  "table": "user_events",
  "dateColumn": "created_at",
  "fieldsToAnonymize": ["user_id", "email", "ip_address"]
}
```

**Example filterJson with Additional Conditions:**
```json
{
  "table": "logs",
  "dateColumn": "timestamp",
  "additionalConditions": "severity = 'DEBUG'"
}
```

### RetentionJob
Tracks execution of a retention rule.

```typescript
{
  id: string
  ruleId: string
  startedAt: DateTime
  finishedAt?: DateTime
  status: "pending" | "running" | "completed" | "failed"
  affectedCount: number
  logText?: string
  errorMessage?: string
}
```

## API Reference

### Data Sources

```bash
# List all data sources
GET /api/data-sources

# Get single data source
GET /api/data-sources/:id

# Create data source
POST /api/data-sources
{
  "name": "Production DB",
  "type": "postgres",
  "description": "Main production database",
  "configJson": "{\"type\":\"postgres\",...}"
}

# Update data source
PUT /api/data-sources/:id

# Delete data source
DELETE /api/data-sources/:id
```

### Retention Rules

```bash
# List all rules
GET /api/retention-rules

# Get single rule
GET /api/retention-rules/:id

# Create rule
POST /api/retention-rules
{
  "dataSourceId": "uuid",
  "name": "Delete old events",
  "action": "delete",
  "ageDays": 90,
  "filterJson": "{\"table\":\"events\",\"dateColumn\":\"created_at\"}",
  "enabled": true
}

# Update rule
PUT /api/retention-rules/:id

# Delete rule
DELETE /api/retention-rules/:id

# Execute rule immediately
POST /api/retention-rules/:id/execute
```

### Retention Jobs

```bash
# List all jobs
GET /api/retention-jobs?status=completed&limit=50

# Get single job
GET /api/retention-jobs/:id

# Get statistics
GET /api/retention-jobs/stats/summary
```

## Usage Examples

### Example 1: Delete Old Log Events

1. **Create Data Source** (via UI or API):
```json
{
  "name": "Main Database",
  "type": "postgres",
  "configJson": "{\"type\":\"postgres\",\"host\":\"postgres\",\"port\":5432,\"database\":\"mydb\",\"user\":\"postgres\",\"password\":\"secret\"}"
}
```

2. **Create Retention Rule**:
```json
{
  "dataSourceId": "<data-source-id>",
  "name": "Delete old log events (90 days)",
  "description": "Remove log events older than 90 days",
  "action": "delete",
  "ageDays": 90,
  "filterJson": "{\"table\":\"events\",\"dateColumn\":\"created_at\"}",
  "enabled": true
}
```

3. **Execute Rule** (manually or wait for schedule):
- Click "Execute" in the UI, or
- POST to `/api/retention-rules/:id/execute`

4. **View Results** in Job History page

### Example 2: Anonymize User Data

```json
{
  "name": "Anonymize old user activity",
  "action": "anonymize",
  "ageDays": 365,
  "filterJson": "{\"table\":\"user_activities\",\"dateColumn\":\"created_at\",\"fieldsToAnonymize\":[\"user_id\",\"email\",\"ip_address\"]}"
}
```

This will set `user_id`, `email`, and `ip_address` to NULL for records older than 365 days.

### Example 3: Delete Specific Event Types

```json
{
  "name": "Delete old debug logs",
  "action": "delete",
  "ageDays": 30,
  "filterJson": "{\"table\":\"logs\",\"dateColumn\":\"created_at\",\"additionalConditions\":\"level = 'DEBUG'\"}"
}
```

This will only delete DEBUG logs older than 30 days, leaving other log levels intact.

## Vertical Slice Demo

The seed script creates a complete demo:

- **Data Source**: "Main Database" (self-referencing)
- **Demo Table**: `events` with various ages
- **Delete Rule**: Removes events > 90 days old
- **Anonymize Rule**: Anonymizes events > 30 days old (disabled by default)

**Event Distribution After Seeding:**
- Recent (< 30 days): 3 events
- Medium (30-90 days): 3 events → will be anonymized
- Old (> 90 days): 4 events → will be deleted

**Test the demo:**
```bash
# After starting services
docker-compose exec backend npm run seed

# Execute the delete rule via Admin UI
# Check events table before/after:
docker-compose exec postgres psql -U postgres -d retention_db -c "SELECT COUNT(*), MIN(created_at) FROM events;"
```

## Configuration

### Environment Variables

**Backend:**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_HOST=localhost
REDIS_PORT=6379
BACKEND_PORT=3001
```

**Admin:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Scheduling

Jobs are scheduled using BullMQ repeatable jobs. Default schedule is daily at 2 AM (configurable in `backend/src/queue/queue.ts`).

To modify scheduling:
```typescript
// In queue.ts
return await retentionQueue.add(`rule-${ruleId}`, jobData, {
  repeat: {
    pattern: '0 2 * * *', // Cron expression
  },
});
```

## Extending Connectors

The connector architecture is designed for extensibility:

```typescript
// backend/src/connectors/my-connector.ts
import { IConnector, ConnectorConfig } from './types';

export class MyConnector implements IConnector {
  async connect() { /* ... */ }
  async disconnect() { /* ... */ }
  async executeDelete(filter, ageDays) { /* ... */ }
  async executeAnonymize(filter, ageDays, fields) { /* ... */ }
}

// backend/src/connectors/factory.ts
case 'my-type':
  return new MyConnector(config);
```

## Testing

```bash
# Backend tests (add jest)
cd backend
npm test

# Type checking
npm run build
```

## Production Deployment

1. **Update environment variables** in `.env` or docker-compose.yml
2. **Secure your database** - Use strong passwords
3. **Configure Redis** persistence if needed
4. **Set up backups** for PostgreSQL
5. **Enable monitoring** - Add logging, metrics
6. **Review security** - Network policies, firewalls
7. **Schedule regular jobs** - Configure cron patterns

## Security Considerations

- Store sensitive config (passwords) using secrets management
- Use read-only database users where possible
- Audit job logs regularly
- Test retention rules on non-production data first
- Implement role-based access control (future enhancement)

## Troubleshooting

**Database connection failed:**
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running and accessible
- Verify network connectivity

**Jobs not executing:**
- Check Redis is running
- Verify BullMQ worker is started
- Check logs: `docker-compose logs backend`

**Seed fails:**
- Database may already be seeded
- Check if migrations ran successfully
- Manually reset: `npx prisma migrate reset`

## License

MIT

## Contributing

Contributions welcome! Please open issues and pull requests.

## Roadmap

- [ ] Archive action implementation (S3, cold storage)
- [ ] Support for more connectors (MySQL, MongoDB, APIs)
- [ ] Advanced scheduling (multiple schedules per rule)
- [ ] Email/webhook notifications
- [ ] RBAC and multi-tenancy
- [ ] Dry-run mode
- [ ] Rule impact estimation
- [ ] Compliance report generation
