import type { FastifyInstance } from 'fastify';
import { metrics } from '../lib/metrics.js';

export async function metricsRoutes(fastify: FastifyInstance) {
  // Get all metrics
  fastify.get('/metrics', async (request, reply) => {
    return metrics.getMetrics();
  });

  // Reset metrics (useful for testing)
  fastify.post('/metrics/reset', async (request, reply) => {
    metrics.reset();
    return { message: 'Metrics reset' };
  });
}
