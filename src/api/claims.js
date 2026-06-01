const claimSchema = require('../validators/claimSchema');
const aiProcessor = require('../services/aiProcessor');
const dbService = require('../services/dbService');
const jobWorker = require('../queue/jobWorker');
const { v4: uuidv4 } = require('uuid');

async function claimsRoutes(fastify) {
  // Submit a single claim
  fastify.post('/', async (request, reply) => {
    const { error, value } = claimSchema.validate(request.body);
    if (error) return reply.status(400).send({ error: error.details[0].message });

    const claimId = await dbService.saveClaim(value);
    await jobWorker.addJob('process-claim', { claimId, claim: value });
    return reply.status(202).send({ claimId, message: 'Claim queued for AI processing' });
  });

  // Bulk upload (simulates 1M+ record pipeline)
  fastify.post('/bulk', async (request, reply) => {
    const { claims } = request.body;
    if (!Array.isArray(claims) || claims.length === 0) {
      return reply.status(400).send({ error: 'claims must be a non-empty array' });
    }
    const batchId = uuidv4();
    let validCount = 0, errorCount = 0;
    const errors = [];

    for (const claim of claims) {
      const { error, value } = claimSchema.validate(claim);
      if (error) { errorCount++; errors.push({ claim, reason: error.details[0].message }); }
      else { validCount++; await jobWorker.addJob('process-claim', { batchId, claim: value }); }
    }

    return reply.send({ batchId, total: claims.length, validCount, errorCount, errors: errors.slice(0, 10) });
  });

  // Get claim by ID
  fastify.get('/:claimId', async (request, reply) => {
    const claim = await dbService.getClaimById(request.params.claimId);
    if (!claim) return reply.status(404).send({ error: 'Claim not found' });
    return reply.send(claim);
  });

  // AI anomaly analysis
  fastify.post('/:claimId/analyze', async (request, reply) => {
    const claim = await dbService.getClaimById(request.params.claimId);
    if (!claim) return reply.status(404).send({ error: 'Claim not found' });
    const analysis = await aiProcessor.analyzeAnomaly(claim);
    return reply.send({ claimId: request.params.claimId, analysis });
  });
}

module.exports = claimsRoutes;
