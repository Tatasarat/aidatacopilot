'use strict';
const { pool } = require('../db/postgres');
const { PLANS } = require('../config/plans');
const { HttpError } = require('../middleware/errors');

function shape(row) {
  const plan = PLANS[row.plan] || PLANS.free;
  const unlimited = plan.unlimited;
  return {
    plan: plan.id,
    plan_name: plan.name,
    unlimited,
    credits_used: row.credits_used,
    credits_limit: unlimited ? null : row.credits_limit,
    credits_remaining: unlimited ? null : Math.max(0, row.credits_limit - row.credits_used),
    reset_date: row.reset_date,
  };
}

async function ensureRow(db, email) {
  await db.query(
    `INSERT INTO user_credits (email, plan, credits_used, credits_limit)
     VALUES ($1, 'free', 0, $2) ON CONFLICT (email) DO NOTHING`,
    [email, PLANS.free.credits]
  );
}

/** Current balance. Creates the row for new users and applies the monthly reset. */
async function getCredits(email, db = pool) {
  await ensureRow(db, email);
  await db.query(
    `UPDATE user_credits
     SET credits_used = 0, reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
     WHERE email = $1 AND reset_date < NOW()`,
    [email]
  );
  const { rows } = await db.query('SELECT * FROM user_credits WHERE email = $1', [email]);
  return shape(rows[0]);
}

/** Spend one credit in a single atomic statement (no race between "check" and "use"). */
async function consumeCredit(email) {
  await getCredits(email); // makes sure the row exists and the month has rolled over
  const { rows } = await pool.query(
    `UPDATE user_credits SET credits_used = credits_used + 1
     WHERE email = $1 AND (plan = 'enterprise' OR credits_used < credits_limit)
     RETURNING *`,
    [email]
  );
  if (!rows.length) {
    const current = await getCredits(email);
    throw new HttpError(403, 'You have used all your AI questions for this month. Upgrade to keep asking.', {
      upgrade_required: true,
      credits: current,
    });
  }
  return shape(rows[0]);
}

async function refundCredit(email) {
  await pool.query(
    'UPDATE user_credits SET credits_used = GREATEST(credits_used - 1, 0) WHERE email = $1',
    [email]
  );
}

module.exports = { getCredits, consumeCredit, refundCredit, ensureRow };
