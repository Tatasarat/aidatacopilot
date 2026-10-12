'use strict';
const bcrypt = require('bcryptjs');

const ROUNDS = () => Math.min(14, Math.max(10, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12));

/**
 * Idempotent schema setup. Safe to run on every boot, and safe on your existing database:
 *  - existing users keep working; their plain-text passwords are hashed once, then the plain-text column is dropped
 *  - existing credits and payments tables are left as they are
 */
async function runMigrations(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Stops two server instances from migrating at the same moment.
    await client.query('SELECT pg_advisory_xact_lock(727001)');

    // ── users ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_report_sent_at TIMESTAMPTZ`);

    // One-time upgrade of legacy plain-text passwords.
    const legacy = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'password'
    `);
    if (legacy.rowCount) {
      const { rows } = await client.query(
        `SELECT id, password FROM users WHERE password_hash IS NULL AND password IS NOT NULL`
      );
      for (const u of rows) {
        const hash = await bcrypt.hash(String(u.password), ROUNDS());
        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, u.id]);
      }
      await client.query('ALTER TABLE users DROP COLUMN password');
      if (rows.length) console.log(`Migration: hashed ${rows.length} legacy password(s) and removed the plain-text column.`);
    }

    // Migrate the old per-user notification toggle if that table exists.
    const hasProfiles = await client.query(`SELECT to_regclass('user_profiles') AS t`);
    if (hasProfiles.rows[0].t) {
      await client.query(`
        UPDATE users u SET notifications_enabled = p.notifications_enabled
        FROM user_profiles p WHERE lower(p.email) = lower(u.email) AND p.notifications_enabled IS NOT NULL
      `);
    }

    // ── sign-up codes and password reset (stored hashed, never in memory) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        email TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── credits and payments (same shape as before) ──────────
    await client.query(`
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
    await client.query(`
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

    // ── store data: typed, one row set per user ──────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_products (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sku TEXT NOT NULL,
        name TEXT,
        unit_cost NUMERIC(14,4),
        stock_on_hand INTEGER,
        PRIMARY KEY (user_id, sku)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_orders (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id TEXT NOT NULL,
        order_date DATE NOT NULL,
        sku TEXT NOT NULL,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(14,4) NOT NULL,
        discount NUMERIC(14,2) NOT NULL DEFAULT 0,
        refund_amount NUMERIC(14,2) NOT NULL DEFAULT 0
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shop_orders_user_date ON shop_orders (user_id, order_date)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_uploads (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        file_name TEXT,
        rows_accepted INTEGER NOT NULL DEFAULT 0,
        rows_rejected INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── question history ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ask_history (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        intent TEXT,
        answer TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ask_history_user ON ask_history (user_id, created_at DESC)`);

    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
