import Fastify from 'fastify';
import cors from '@fastify/cors';
import { connectDB, disconnectDB } from './db.js';
import { dataSourceRoutes } from './routes/data-sources.js';
import { retentionRuleRoutes } from './routes/retention-rules.js';
import { retentionJobRoutes } from './routes/retention-jobs.js';
import { retentionWorker, retentionScheduler, closeQueue } from './queue/queue.js';

const PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register CORS
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await fastify.register(dataSourceRoutes, { prefix: '/api' });
await fastify.register(retentionRuleRoutes, { prefix: '/api' });
await fastify.register(retentionJobRoutes, { prefix: '/api' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  reply.code(error.statusCode || 500).send({
    error: error.name || 'Internal Server Error',
    message: error.message,
  });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');

  try {
    await closeQueue();
    await disconnectDB();
    await fastify.close();
    console.log('Server shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    await connectDB();

    await fastify.listen({ port: PORT, host: '0.0.0.0' });

    console.log(`
🚀 Data Retention Lifecycle Orchestrator
📡 API Server: http://localhost:${PORT}
💾 Database: Connected
🔄 Queue: Running
📊 Health: http://localhost:${PORT}/health
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
