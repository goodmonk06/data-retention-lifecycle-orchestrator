# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-11-18 - Phase 3 Release

### Added

#### Domain Model Enhancements
- **RetentionPolicy** entity for policy templates
- **RetentionSchedule** entity for complex scheduling
- **RetentionArchive** entity for tracking archived data
- **AuditLog** entity for comprehensive audit trail
- Enhanced DataSource with status, tags, metadata, last tested timestamp
- Enhanced RetentionRule with policy references, priority, notifications, dry-run mode
- Enhanced RetentionJob with scanned count, archive references, duration metrics

#### Extensibility & Integration
- **INotificationAdapter** interface with in-memory, email, and webhook implementations
- **IStorageAdapter** interface with in-memory and S3 implementations
- **Event Bus** for domain events with typed payloads
- **Adapter Registry** for centralized adapter management
- Support for pluggable notification and storage backends

#### Observability
- **Structured logging** with Pino
- **Metrics service** with counters, gauges, and histograms
- **Metrics API** endpoint (`/api/metrics`)
- Context loggers for request tracing
- Development-friendly log formatting

#### CLI Tools
- `execute <ruleId>` - Execute specific retention rule
- `execute-all` - Execute all active rules
- `list-rules` - List all retention rules
- `list-policies` - List all policy templates
- `job-status <jobId>` - View detailed job status
- `test-connection <dataSourceId>` - Test data source connection

#### API Endpoints
- `/api/policies` - Policy template CRUD
- `/api/policies/:id/apply` - Apply policy to data source
- `/api/audit-logs` - Audit log retrieval
- `/api/metrics` - Metrics data

#### Testing & Development
- Vitest test framework integration
- Unit tests for logging, metrics, and events
- Service layer tests
- ESLint and Prettier configuration
- Test coverage reporting
- TypeScript strict mode

#### Features
- **Dry run mode** for testing rules without data modification
- **Priority system** for rule execution ordering
- **Notification configuration** per rule (on complete/failure)
- **Policy templates** for GDPR, compliance, performance use cases
- **Enhanced seed data** with 100+ demo events across age ranges
- **Multiple data source support** in seed data

### Changed

- **RetentionService** now uses logging, metrics, and events
- **Seed script** significantly enhanced with realistic scenarios
- **Error handling** improved throughout the application
- **Job execution** now tracks duration and scanned counts
- **Database schema** with 4 new tables and enhanced columns
- **Scripts** standardized across all packages

### Technical

- Migrated to enhanced RetentionService with Phase 3 features
- Added comprehensive TypeScript types throughout
- Implemented adapter pattern for extensibility
- Added domain event system for decoupling
- Enhanced error messages and logging
- Improved database indexing for performance

## [1.0.0] - 2024-11-18 - Initial Release

### Added

- Basic data retention lifecycle orchestration
- PostgreSQL connector for data sources
- Retention rules with delete/anonymize/archive actions
- BullMQ job queue integration
- Fastify REST API
- Next.js admin dashboard
- Docker Compose setup
- Prisma ORM integration
- Basic seed data
- Health check endpoint
- CRUD operations for all entities
- Job history and status tracking

### Features

- Age-based retention policies
- Schedule types (daily, weekly, monthly)
- Manual job execution
- Job logging and error tracking
- Admin UI for management
- PostgreSQL database
- Redis for job queue
- Docker containerization
