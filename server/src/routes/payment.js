const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../db/postgres');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = {
  pro: { amount: 99900, name: 'InsightAI Pro', credits: 100 },
  enterprise: { amount: 499900, name: 'InsightAI Enterprise', credits: 999999 },
};

// ── Create Order ──────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  const { plan, email } = req.body;
  if (!plan || !PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

  try {
    const order = await razorpay.orders.create({
      amount: PLANS[plan].amount,
      currency: 'INR',
      receipt: `receipt_${email}_${Date.now()}`,
      notes: { email, plan }
    });

    // Save pending order to DB
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        plan TEXT NOT NULL,
        order_id TEXT UNIQUE NOT NULL,
        payment_id TEXT,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(
      'INSERT INTO payments (email, plan, order_id, amount) VALUES ($1, $2, $3, $4)',
      [email, plan, order.id, PLANS[plan].amount]
    );

    res.json({
      order_id: order.id,
      amount: PLANS[plan].amount,
      currency: 'INR',
      plan,
      name: PLANS[plan].name,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Create order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Verify Payment ────────────────────────────────────────
router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, plan } = req.body;

  try {
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update payment status
    await pool.query(
      'UPDATE payments SET payment_id = $1, status = $2 WHERE order_id = $3',
      [razorpay_payment_id, 'paid', razorpay_order_id]
    );

    // Upgrade user plan
    const limits = { pro: 100, enterprise: 999999 };
    await pool.query(`
      INSERT INTO user_credits (email, plan, credits_used, credits_limit)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT (email) DO UPDATE
      SET plan = $2, credits_limit = $3, credits_used = 0,
          reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    `, [email, plan, limits[plan]]);

    // Save to profile
    await pool.query(`
      INSERT INTO user_profiles (email)
      VALUES ($1)
      ON CONFLICT (email) DO NOTHING
    `, [email]);

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan}!`,
      plan,
      payment_id: razorpay_payment_id
    });
  } catch (err) {
    console.error('Verify payment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Payment History ───────────────────────────────────────
router.get('/payment-history/:email', async (req, res) => {
  const { email } = req.params;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        plan TEXT NOT NULL,
        order_id TEXT UNIQUE NOT NULL,
        payment_id TEXT,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const result = await pool.query(
      'SELECT * FROM payments WHERE email = $1 ORDER BY created_at DESC LIMIT 10',
      [email]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;