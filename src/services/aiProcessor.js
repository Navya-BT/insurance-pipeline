const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const OpenAI = require('openai');
const logger = require('../utils/logger');

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Validates and enriches a claim using AWS Bedrock
 */
async function validateWithBedrock(claim) {
  const prompt = `Analyze this insurance claim for data quality issues:
Policy: ${claim.policyNumber}, Type: ${claim.claimType}, Amount: $${claim.claimAmount}
Description: ${claim.description}
Respond in JSON: { "isValid": boolean, "riskScore": 0-100, "flags": [], "recommendation": "" }`;

  try {
    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-express-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: prompt, textGenerationConfig: { maxTokenCount: 512 } })
    });
    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return JSON.parse(result.results[0].outputText);
  } catch (err) {
    logger.warn('Bedrock unavailable, using rule-based fallback:', err.message);
    return ruleBasedValidation(claim);
  }
}

/**
 * Detect anomalies using ChatGPT
 */
async function analyzeAnomaly(claim) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an insurance fraud detection AI. Analyze claims for suspicious patterns. Always respond in valid JSON.' },
        { role: 'user', content: `Analyze for fraud:\n${JSON.stringify(claim, null, 2)}\nReturn JSON: { "fraudProbability": 0-1, "suspiciousIndicators": [], "recommendation": "" }` }
      ],
      temperature: 0.1
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    logger.warn('OpenAI unavailable:', err.message);
    return { fraudProbability: 0, suspiciousIndicators: [], recommendation: 'Manual review required' };
  }
}

/**
 * Fallback rule-based validation (no AI needed)
 */
function ruleBasedValidation(claim) {
  const flags = [];
  if (claim.claimAmount > 500000) flags.push('HIGH_VALUE_CLAIM');
  if (!claim.description || claim.description.length < 20) flags.push('INSUFFICIENT_DESCRIPTION');
  const daysSince = (Date.now() - new Date(claim.incidentDate)) / (1000 * 60 * 60 * 24);
  if (daysSince > 365) flags.push('LATE_FILING');
  return {
    isValid: flags.length === 0,
    riskScore: Math.min(flags.length * 25, 100),
    flags,
    recommendation: flags.length === 0 ? 'Auto-approve' : 'Manual review required'
  };
}

module.exports = { validateWithBedrock, analyzeAnomaly };
