import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { policyService } from '../services/policy-service.js';

const PolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['gdpr', 'compliance', 'performance', 'general']).default('general'),
  template: z.object({
    action: z.enum(['delete', 'anonymize', 'archive']),
    ageDays: z.number().int().positive(),
    filterTemplate: z.object({
      table: z.string().optional(),
      dateColumn: z.string(),
      fieldsToAnonymize: z.array(z.string()).optional(),
    }),
    scheduleType: z.string().optional(),
  }),
  tags: z.array(z.string()).optional(),
});

const ApplyPolicySchema = z.object({
  dataSourceId: z.string().uuid(),
  customization: z
    .object({
      ageDays: z.number().int().positive().optional(),
      filterTemplate: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export async function policyRoutes(fastify: FastifyInstance) {
  // List all policies
  fastify.get('/policies', async (request, reply) => {
    const policies = await policyService.getPolicies();
    return policies;
  });

  // Get single policy
  fastify.get('/policies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const policy = await policyService.getPolicy(id);

    if (!policy) {
      return reply.code(404).send({ error: 'Policy not found' });
    }

    return policy;
  });

  // Create policy
  fastify.post('/policies', async (request, reply) => {
    try {
      const data = PolicySchema.parse(request.body);
      const policy = await policyService.createPolicy(data);
      return reply.code(201).send(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  // Apply policy to data source
  fastify.post('/policies/:id/apply', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const data = ApplyPolicySchema.parse(request.body);
      const rule = await policyService.applyPolicyToDataSource(
        id,
        data.dataSourceId,
        data.customization
      );
      return reply.code(201).send(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });
}
