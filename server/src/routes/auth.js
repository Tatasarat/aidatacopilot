// ── Check Credits ─────────────────────────────────────────
router.get('/credits/:email', async (req, res) => {
  const { email } = req.params;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_credits (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        plan TEXT DEFAULT 'free',
        credits_used INTEGER DEFAULT 0,
        credits_limit INTEGER DEFAULT 10,
        reset_date TIMESTAMP DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    let result = await pool.query('SELECT * FROM user_credits WHERE email = $1', [email]);

    if (!result.rows.length) {
      await pool.query(
        'INSERT INTO user_credits (email, plan, credits_used, credits_limit) VALUES ($1, $2, $3, $4)',
        [email, 'free', 0, 10]
      );
      result = await pool.query('SELECT * FROM user_credits WHERE email = $1', [email]);
    }

    const credits = result.rows[0];

    // Reset credits if month has passed
    if (new Date() > new Date(credits.reset_date)) {
      await pool.query(
        'UPDATE user_credits SET credits_used = 0, reset_date = DATE_TRUNC(\'month\', NOW()) + INTERVAL \'1 month\' WHERE email = $1',
        [email]
      );
      credits.credits_used = 0;
    }

    res.json({
      plan: credits.plan,
      credits_used: credits.credits_used,
      credits_limit: credits.plan === 'enterprise' ? 'unlimited' : credits.credits_limit,
      credits_remaining: credits.plan === 'enterprise' ? 'unlimited' : credits.credits_limit - credits.credits_used,
      reset_date: credits.reset_date
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Use Credit ────────────────────────────────────────────
router.post('/use-credit', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM user_credits WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });

    const credits = result.rows[0];

    // Check if enterprise (unlimited)
    if (credits.plan === 'enterprise') {
      await pool.query('UPDATE user_credits SET credits_used = credits_used + 1 WHERE email = $1', [email]);
      return res.json({ success: true, unlimited: true });
    }

    // Check limit
    if (credits.credits_used >= credits.credits_limit) {
      return res.status(403).json({
        error: 'Credit limit reached',
        plan: credits.plan,
        limit: credits.credits_limit,
        upgrade_required: true
      });
    }

    await pool.query('UPDATE user_credits SET credits_used = credits_used + 1 WHERE email = $1', [email]);
    res.json({
      success: true,
      credits_used: credits.credits_used + 1,
      credits_remaining: credits.credits_limit - credits.credits_used - 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Upgrade Plan ──────────────────────────────────────────
router.post('/upgrade-plan', async (req, res) => {
  const { email, plan } = req.body;
  const limits = { free: 10, pro: 100, enterprise: 999999 };
  try {
    await pool.query(
      'UPDATE user_credits SET plan = $1, credits_limit = $2, credits_used = 0 WHERE email = $3',
      [plan, limits[plan], email]
    );
    res.json({ success: true, plan, credits_limit: limits[plan] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});