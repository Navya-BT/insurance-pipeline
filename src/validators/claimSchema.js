const Joi = require('joi');

const claimSchema = Joi.object({
  claimId: Joi.string().optional(),
  policyNumber: Joi.string().required().pattern(/^POL-[A-Z0-9]{8}$/),
  claimantName: Joi.string().required().min(2).max(100),
  claimType: Joi.string().valid('AUTO', 'HEALTH', 'PROPERTY', 'LIFE').required(),
  claimAmount: Joi.number().positive().max(10000000).required(),
  incidentDate: Joi.date().max('now').required(),
  description: Joi.string().required().min(10).max(2000),
  status: Joi.string().valid('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED').default('PENDING'),
  metadata: Joi.object().optional()
});

module.exports = claimSchema;
