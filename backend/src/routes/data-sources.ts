import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

const DataSourceSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  configJson: z.string().min(1),
});

export async function dataSourceRoutes(fastify: FastifyInstance) {
  // List all data sources
  fastify.get('/data-sources', async (request, reply) => {
    const dataSources = await prisma.dataSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return dataSources;
  });

  // Get single data source
  fastify.get('/data-sources/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
      include: {
        retentionRules: true,
      },
    });

    if (!dataSource) {
      return reply.code(404).send({ error: 'Data source not found' });
    }

    return dataSource;
  });

  // Create data source
  fastify.post('/data-sources', async (request, reply) => {
    try {
      const data = DataSourceSchema.parse(request.body);

      // Validate JSON
      JSON.parse(data.configJson);

      const dataSource = await prisma.dataSource.create({
        data,
      });

      return reply.code(201).send(dataSource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  // Update data source
  fastify.put('/data-sources/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const data = DataSourceSchema.partial().parse(request.body);

      if (data.configJson) {
        JSON.parse(data.configJson);
      }

      const dataSource = await prisma.dataSource.update({
        where: { id },
        data,
      });

      return dataSource;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  // Delete data source
  fastify.delete('/data-sources/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.dataSource.delete({
      where: { id },
    });

    return reply.code(204).send();
  });
}
