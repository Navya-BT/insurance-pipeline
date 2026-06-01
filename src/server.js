require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const claimsRoutes = require('./api/claims');
const pipelineRoutes = require('./api/pipeline');
const logger = require('./utils/logger');

fastify.register(cors, { origin: true });
fastify.register(claimsRoutes, { prefix: '/api/claims' });
fastify.register(pipelineRoutes, { prefix: '/api/pipeline' });

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    logger.info(`Server running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
