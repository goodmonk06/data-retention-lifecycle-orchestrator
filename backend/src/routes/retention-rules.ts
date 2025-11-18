import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { scheduleRetentionJob } from '../queue/queue.js';

const RetentionRuleSchema = z.object({
  dataSourceId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  action: z.enum(['delete', 'anonymize', 'archive']),
  ageDays: z.number().int().positive(),
  filterJson: z.string().min(1),
  enabled: z.boolean().default(true),
  scheduleType: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

export async function retentionRuleRoutes(fastify: FastifyInstance) {
  // List all retention rules
  fastify.get('/retention-rules', async (request, reply) => {
    const rules = await prisma.retentionRule.findMany({
      include: {
        dataSource: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rules;
  });

  // Get single retention rule
  fastify.get('/retention-rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rule = await prisma.retentionRule.findUnique({
      where: { id },
      include: {
        dataSource: true,
        retentionJobs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!rule) {
      return reply.code(404).send({ error: 'Retention rule not found' });
    }

    return rule;
  });

  // Create retention rule
  fastify.post('/retention-rules', async (request, reply) => {
    try {
      const data = RetentionRuleSchema.parse(request.body);

      // Validate JSON
      JSON.parse(data.filterJson);

      const rule = await prisma.retentionRule.create({
        data,
        include: {
          dataSource: true,
        },
      });

      return reply.code(201).send(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  // Update retention rule
  fastify.put('/retention-rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const data = RetentionRuleSchema.partial().parse(request.body);

      if (data.filterJson) {
        JSON.parse(data.filterJson);
      }

      const rule = await prisma.retentionRule.update({
        where: { id },
        data,
        include: {
          dataSource: true,
        },
      });

      return rule;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  // Delete retention rule
  fastify.delete('/retention-rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.retentionRule.delete({
      where: { id },
    });

    return reply.code(204).send();
  });

  // Execute a retention rule immediately
  fastify.post('/retention-rules/:id/execute', async (request, reply) => {
    const { id } = request.params as { id: string };

    const rule = await prisma.retentionRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return reply.code(404).send({ error: 'Retention rule not found' });
    }

    await scheduleRetentionJob(id, true);

    return { message: 'Retention job scheduled', ruleId: id };
  });
}
