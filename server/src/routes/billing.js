'use strict';
const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { pool, withTx } = require('../db/postgres');
const { requireAuth } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../middleware/errors');
const { PLANS, PAID_PLAN_IDS } = require('../config/plans');
const { getCredits } = require('../utils/credits');

const router = express.Router();

let razorpay = null;
function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new HttpError(503, 'Payments are not available yet. Please try again later.');
  }
  if (!razorpay) {
    razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
  return razorpay;
}

// Public: lets the pricing screen render without hardcoding plan details.
router.get('/billing/plans', (req, res) => {
  res.json({
    plans: Object.values(PLANS).map((p) => ({
      id: p.id, name: p.name, amount: p.amount, currency: 'INR',
      credits: p.unlimited ? null : p.credits, unlimited: p.unlimited, blurb: p.blurb,
    })),
  });
});

router.get('/billing/credits', requireAuth, asyncHandler(async (req, res) => {
  res.json(await getCredits(req.user.email));
}));

router.post('/billing/create-order', requireAuth, asyncHandler(async (req, res) => {
  const planId = String(req.body.plan || '');
  if (!PAID_PLAN_IDS.includes(planId)) throw new HttpError(400, 'Choose a paid plan.');
  const plan = PLANS[planId];

  let order;
  try {
    order = await getRazorpay().orders.create({
      amount: plan.amount, // always taken from the server's plan table, never from the browser
      currency: 'INR',
      receipt: `u${req.user.id}_${Date.now()}`.slice(0, 40),
      notes: { user_id: String(req.user.id), plan: planId },
    });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error('Razorpay order error:', err && err.error ? err.error.description : err.message);
    throw new HttpError(502, 'We could not start the payment. Please try again.');
  }

  await pool.query(
    `INSERT INTO payments (email, plan, order_id, amount) VALUES ($1, $2, $3, $4) ON CONFLICT (order_id) DO NOTHING`,
    [req.user.email, planId, order.id, plan.amount]
  );

  res.json({
    order_id: order.id,
    amount: plan.amount,
    currency: 'INR',
    plan: planId,
    name: `${plan.name} plan`,
    key_id: process.env.RAZORPAY_KEY_ID,
  });
}));

router.post('/billing/verify', requireAuth, asyncHandler(async (req, res) => {
  const orderId = String(req.body.razorpay_order_id || '');
  const paymentId = String(req.body.razorpay_payment_id || '');
  const signature = String(req.body.razorpay_signature || '');
  if (!orderId || !paymentId || !signature) throw new HttpError(400, 'Payment details are missing.');
  if (!process.env.RAZORPAY_KEY_SECRET) throw new HttpError(503, 'Payments are not available yet.');

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new HttpError(400, 'We could not verify this payment.');
  }

  const result = await withTx(async (db) => {
    // The plan and owner come from OUR saved order, not from the browser.
    const { rows } = await db.query(
      'SELECT * FROM payments WHERE order_id = $1 AND email = $2 FOR UPDATE',
      [orderId, req.user.email]
    );
    if (!rows.length) throw new HttpError(404, 'We could not find that order for your account.');
    const payment = rows[0];
    const plan = PLANS[payment.plan];
    if (!plan) throw new HttpError(400, 'This order is for an unknown plan.');

    if (payment.status !== 'paid') {
      await db.query('UPDATE payments SET payment_id = $1, status = $2 WHERE order_id = $3', [paymentId, 'paid', orderId]);
      await db.query(
        `INSERT INTO user_credits (email, plan, credits_used, credits_limit) VALUES ($1, $2, 0, $3)
         ON CONFLICT (email) DO UPDATE
           SET plan = $2, credits_limit = $3, credits_used = 0,
               reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`,
        [req.user.email, plan.id, plan.credits]
      );
    }
    return plan;
  });

  res.json({
    success: true,
    message: `You are now on the ${result.name} plan.`,
    credits: await getCredits(req.user.email),
  });
}));

router.get('/billing/history', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT plan, amount, status, created_at FROM payments
     WHERE email = $1 AND status = 'paid' ORDER BY created_at DESC LIMIT 12`,
    [req.user.email]
  );
  res.json({ payments: rows });
}));

module.exports = router;
