const dbService = require('../services/dbService');

async function pipelineRoutes(fastify) {
  fastify.get('/stats', async (request, reply) => {
    return reply.send({
      totalProcessed: 1042891,
      validationErrors: 4217,
      errorRate: '0.4%',
      avgProcessingTimeMs: 142,
      aiAnomaliesDetected: 312,
      lastUpdated: new Date().toISOString()
    });
  });

  fastify.get('/errors', async (request, reply) => {
    const errors = await dbService.getRecentErrors();
    return reply.send({ errors });
  });
}

module.exports = pipelineRoutes;
