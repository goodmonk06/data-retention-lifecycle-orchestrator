import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';

export async function retentionJobRoutes(fastify: FastifyInstance) {
  // List all retention jobs
  fastify.get('/retention-jobs', async (request, reply) => {
    const { ruleId, status, limit = 50 } = request.query as {
      ruleId?: string;
      status?: string;
      limit?: number;
    };

    const where: any = {};

    if (ruleId) {
      where.ruleId = ruleId;
    }

    if (status) {
      where.status = status;
    }

    const jobs = await prisma.retentionJob.findMany({
      where,
      include: {
        rule: {
          include: {
            dataSource: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(String(limit), 10),
    });

    return jobs;
  });

  // Get single retention job
  fastify.get('/retention-jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await prisma.retentionJob.findUnique({
      where: { id },
      include: {
        rule: {
          include: {
            dataSource: true,
          },
        },
      },
    });

    if (!job) {
      return reply.code(404).send({ error: 'Retention job not found' });
    }

    return job;
  });

  // Get statistics
  fastify.get('/retention-jobs/stats/summary', async (request, reply) => {
    const [totalJobs, completedJobs, failedJobs, runningJobs] = await Promise.all([
      prisma.retentionJob.count(),
      prisma.retentionJob.count({ where: { status: 'completed' } }),
      prisma.retentionJob.count({ where: { status: 'failed' } }),
      prisma.retentionJob.count({ where: { status: 'running' } }),
    ]);

    const totalAffected = await prisma.retentionJob.aggregate({
      _sum: {
        affectedCount: true,
      },
      where: {
        status: 'completed',
      },
    });

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      runningJobs,
      totalRecordsAffected: totalAffected._sum.affectedCount || 0,
    };
  });
}
