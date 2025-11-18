import type { FastifyInstance } from 'fastify';
import { auditService } from '../services/audit-service.js';

export async function auditLogRoutes(fastify: FastifyInstance) {
  // Get recent audit logs
  fastify.get('/audit-logs', async (request, reply) => {
    const { limit = 100, entityType, entityId } = request.query as {
      limit?: number;
      entityType?: string;
      entityId?: string;
    };

    if (entityType && entityId) {
      const logs = await auditService.getLogsForEntity(entityType, entityId);
      return logs;
    }

    const logs = await auditService.getRecentLogs(parseInt(String(limit), 10));
    return logs;
  });

  // Get audit logs for specific entity
  fastify.get('/audit-logs/:entityType/:entityId', async (request, reply) => {
    const { entityType, entityId } = request.params as { entityType: string; entityId: string };
    const logs = await auditService.getLogsForEntity(entityType, entityId);
    return logs;
  });
}
