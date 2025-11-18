-- AlterTable data_sources - add new fields
ALTER TABLE "data_sources" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "data_sources" ADD COLUMN "lastTestedAt" TIMESTAMP(3);
ALTER TABLE "data_sources" ADD COLUMN "metadataJson" TEXT;
ALTER TABLE "data_sources" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable retention_rules - add new fields
ALTER TABLE "retention_rules" ADD COLUMN "policyId" TEXT;
ALTER TABLE "retention_rules" ADD COLUMN "cronExpression" TEXT;
ALTER TABLE "retention_rules" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "retention_rules" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "retention_rules" ADD COLUMN "notifyOnComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "retention_rules" ADD COLUMN "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "retention_rules" ADD COLUMN "dryRun" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "retention_rules" ADD COLUMN "lastExecutedAt" TIMESTAMP(3);

-- AlterTable retention_jobs - add new fields
ALTER TABLE "retention_jobs" ADD COLUMN "scannedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "retention_jobs" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "retention_jobs" ADD COLUMN "archiveId" TEXT;
ALTER TABLE "retention_jobs" ADD COLUMN "metadataJson" TEXT;

-- CreateIndex for retention_rules
CREATE INDEX "retention_rules_enabled_idx" ON "retention_rules"("enabled");
CREATE INDEX "retention_rules_policyId_idx" ON "retention_rules"("policyId");

-- CreateIndex for retention_jobs
CREATE INDEX "retention_jobs_archiveId_idx" ON "retention_jobs"("archiveId");

-- CreateIndex for events
CREATE INDEX "events_eventType_idx" ON "events"("eventType");

-- CreateTable retention_policies
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "templateJson" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_name_key" ON "retention_policies"("name");

-- CreateTable retention_schedules
CREATE TABLE "retention_schedules" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retention_schedules_ruleId_idx" ON "retention_schedules"("ruleId");
CREATE INDEX "retention_schedules_nextRunAt_idx" ON "retention_schedules"("nextRunAt");

-- CreateTable retention_archives
CREATE TABLE "retention_archives" (
    "id" TEXT NOT NULL,
    "dataSourceName" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "sizeBytes" BIGINT,
    "storageLocation" TEXT,
    "storageType" TEXT NOT NULL DEFAULT 's3',
    "compressionType" TEXT,
    "metadataJson" TEXT,
    "ruleName" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "retention_archives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retention_archives_dataSourceName_idx" ON "retention_archives"("dataSourceName");
CREATE INDEX "retention_archives_tableName_idx" ON "retention_archives"("tableName");
CREATE INDEX "retention_archives_archivedAt_idx" ON "retention_archives"("archivedAt");

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "changes" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSourceId" TEXT,
    "retentionRuleId" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- AddForeignKey
ALTER TABLE "retention_rules" ADD CONSTRAINT "retention_rules_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "retention_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_jobs" ADD CONSTRAINT "retention_jobs_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "retention_archives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_schedules" ADD CONSTRAINT "retention_schedules_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "retention_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_retentionRuleId_fkey" FOREIGN KEY ("retentionRuleId") REFERENCES "retention_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
