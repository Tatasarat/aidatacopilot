const express = require('express');
const router = express.Router();
const { pool } = require('../db/postgres');
const { sendOTPEmail, sendPasswordResetEmail } = require('../utils/mailer');
const crypto = require('crypto');

const otpStore = {};
const resetStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Send OTP ──────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const otp = generateOTP();
    otpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };
    await sendOTPEmail(email, otp);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Send OTP error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP email' });
  }
});

// ── Verify OTP + Register ─────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, otp, name, password } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  const stored = otpStore[email];
  if (!stored) return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
  if (Date.now() > stored.expires) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
    await pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', [name, email, password]);
    delete otpStore[email];
    res.json({ success: true, user: { name, email } });
  } catch (err) {
    console.error('Verify OTP error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password' });
    const user = result.rows[0];
    res.json({ success: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Forgot Password ───────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(404).json({ error: 'No account found with this email' });
    const token = crypto.randomBytes(32).toString('hex');
    resetStore[token] = { email, expires: Date.now() + 30 * 60 * 1000 };
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetLink);
    res.json({ success: true, message: 'Password reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reset Password ────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  const stored = resetStore[token];
  if (!stored) return res.status(400).json({ error: 'Invalid or expired reset link' });
  if (Date.now() > stored.expires) return res.status(400).json({ error: 'Reset link expired' });
  try {
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [password, stored.email]);
    delete resetStore[token];
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Profile ───────────────────────────────────────────
router.get('/profile/:email', async (req, res) => {
  const { email } = req.params;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        total_analyses INTEGER DEFAULT 0,
        notifications_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        question TEXT NOT NULL,
        sql_generated TEXT,
        rows_returned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    let profile = await pool.query('SELECT * FROM user_profiles WHERE email = $1', [email]);
    if (!profile.rows.length) {
      await pool.query('INSERT INTO user_profiles (email) VALUES ($1)', [email]);
      profile = await pool.query('SELECT * FROM user_profiles WHERE email = $1', [email]);
    }
    const history = await pool.query(
      'SELECT * FROM analysis_history WHERE email = $1 ORDER BY created_at DESC LIMIT 20',
      [email]
    );
    const user = await pool.query('SELECT name, email, created_at FROM users WHERE email = $1', [email]);
    res.json({ profile: profile.rows[0], history: history.rows, user: user.rows[0] });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Update Profile ────────────────────────────────────────
router.post('/profile/update', async (req, res) => {
  const { email, bio, avatar_url, notifications_enabled } = req.body;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        total_analyses INTEGER DEFAULT 0,
        notifications_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO user_profiles (email, bio, avatar_url, notifications_enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
      SET bio = $2, avatar_url = $3, notifications_enabled = $4
    `, [email, bio, avatar_url, notifications_enabled]);
    res.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Change Password ───────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, oldPassword]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Current password is incorrect' });
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [newPassword, email]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Account ────────────────────────────────────────
router.delete('/delete-account', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid password' });
    await pool.query('DELETE FROM analysis_history WHERE email = $1', [email]);
    await pool.query('DELETE FROM user_profiles WHERE email = $1', [email]);
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Save Analysis ─────────────────────────────────────────
router.post('/save-analysis', async (req, res) => {
  const { email, question, sql_generated, rows_returned } = req.body;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        question TEXT NOT NULL,
        sql_generated TEXT,
        rows_returned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(
      'INSERT INTO analysis_history (email, question, sql_generated, rows_returned) VALUES ($1, $2, $3, $4)',
      [email, question, sql_generated, rows_returned || 0]
    );
    await pool.query(
      'UPDATE user_profiles SET total_analyses = total_analyses + 1 WHERE email = $1',
      [email]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;