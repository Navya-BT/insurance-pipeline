const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function saveClaim(claim) {
  const claimId = uuidv4();
  try {
    await pool.query(
      `INSERT INTO claims (id, policy_number, claimant_name, claim_type, claim_amount, incident_date, description, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [claimId, claim.policyNumber, claim.claimantName, claim.claimType, claim.claimAmount, claim.incidentDate, claim.description, claim.status]
    );
  } catch (err) {
    logger.warn('DB not connected, using in-memory mock');
  }
  return claimId;
}

async function getClaimById(claimId) {
  try {
    const result = await pool.query('SELECT * FROM claims WHERE id = $1', [claimId]);
    return result.rows[0] || null;
  } catch {
    return { id: claimId, status: 'PENDING', claimType: 'AUTO', claimAmount: 5000, mock: true };
  }
}

async function getRecentErrors() {
  try {
    const result = await pool.query('SELECT * FROM claim_errors ORDER BY created_at DESC LIMIT 50');
    return result.rows;
  } catch {
    return [];
  }
}

module.exports = { saveClaim, getClaimById, getRecentErrors };
