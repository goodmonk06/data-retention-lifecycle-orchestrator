import { prisma } from '../db.js';
import { logger } from '../lib/logger.js';

export interface AuditLogParams {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  dataSourceId?: string;
  retentionRuleId?: string;
}

export class AuditService {
  async log(params: AuditLogParams) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          userId: params.userId,
          changes: params.changes ? JSON.stringify(params.changes) : undefined,
          metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          dataSourceId: params.dataSourceId,
          retentionRuleId: params.retentionRuleId,
        },
      });

      logger.info(
        {
          auditLogId: auditLog.id,
          entityType: params.entityType,
          action: params.action,
        },
        'Audit log created'
      );

      return auditLog;
    } catch (error) {
      logger.error({ error, params }, 'Failed to create audit log');
      // Don't throw - audit failures shouldn't break main operations
    }
  }

  async getLogsForEntity(entityType: string, entityId: string) {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async getRecentLogs(limit: number = 100) {
    return await prisma.auditLog.findMany({
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        dataSource: true,
        retentionRule: true,
      },
    });
  }
}

export const auditService = new AuditService();
