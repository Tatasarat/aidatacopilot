const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../db/postgres');

console.log('Razorpay Key ID:', process.env.RAZORPAY_KEY_ID ? 'Found ✓' : 'MISSING ✗');
console.log('Razorpay Secret:', process.env.RAZORPAY_KEY_SECRET ? 'Found ✓' : 'MISSING ✗');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = {
  pro: { amount: 99900, name: 'InsightAI Pro', credits: 100 },
  enterprise: { amount: 499900, name: 'InsightAI Enterprise', credits: 999999 },
};

// ── Create payments table ─────────────────────────────────
async function ensurePaymentsTable() {
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
}

// ── Create Order ──────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  const { plan, email } = req.body;
  console.log('Create order request:', { plan, email });

  if (!plan || !PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    console.log('Creating Razorpay order...');
    const order = await razorpay.orders.create({
      amount: PLANS[plan].amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { email, plan }
    });
    console.log('Order created:', order.id);

    await ensurePaymentsTable();

    await pool.query(`
      INSERT INTO payments (email, plan, order_id, amount)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (order_id) DO NOTHING
    `, [email, plan, order.id, PLANS[plan].amount]);

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
    console.error('Error status:', err.statusCode);
    console.error('Error description:', err.error?.description);
    console.error('Full error:', JSON.stringify(err, null, 2));
    res.status(500).json({ 
      error: err.error?.description || err.message || 'Order creation failed',
      details: JSON.stringify(err)
    });}
});

// ── Verify Payment ────────────────────────────────────────
router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, plan } = req.body;

  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    await ensurePaymentsTable();

    await pool.query(
      'UPDATE payments SET payment_id = $1, status = $2 WHERE order_id = $3',
      [razorpay_payment_id, 'paid', razorpay_order_id]
    );

    const limits = { pro: 100, enterprise: 999999 };
    await pool.query(`
      INSERT INTO user_credits (email, plan, credits_used, credits_limit)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT (email) DO UPDATE
      SET plan = $2, credits_limit = $3, credits_used = 0,
          reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    `, [email, plan, limits[plan]]);

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
    await ensurePaymentsTable();
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