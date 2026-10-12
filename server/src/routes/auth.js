'use strict';
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool, withTx } = require('../db/postgres');
const { signToken, requireAuth } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../middleware/errors');
const { authLimiter, otpLimiter } = require('../middleware/rateLimits');
const { sendOTPEmail, sendAccountExistsEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { normalizeEmail, isEmail, passwordProblem, CURRENCIES } = require('../utils/validate');
const { clientUrl, isProd } = require('../config/env');
const { getCredits, ensureRow } = require('../utils/credits');

const router = express.Router();

const ROUNDS = () => Math.min(14, Math.max(10, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12));
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const OTP_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
// A real hash of a throwaway string, so login takes the same time whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  currency: u.currency || 'INR',
  notifications_enabled: u.notifications_enabled !== false,
  created_at: u.created_at,
});

const otpHash = (email, code) => sha256(`${email}:${code}:${process.env.JWT_SECRET}`);

// ── Step 1 of sign-up: email a 6-digit code ────────────────────
router.post('/auth/send-otp', otpLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email address.');

  const existing = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [email]);
  const recent = await pool.query(
    `SELECT 1 FROM otp_codes WHERE email = $1 AND sent_at > NOW() - ($2 || ' seconds')::interval`,
    [email, String(OTP_RESEND_SECONDS)]
  );
  if (recent.rowCount) {
    throw new HttpError(429, `Please wait ${OTP_RESEND_SECONDS} seconds before asking for another code.`);
  }

  if (existing.rowCount) {
    // Same response either way, so the form can't be used to discover who has an account.
    await sendAccountExistsEmail(email);
    await pool.query(
      `INSERT INTO otp_codes (email, code_hash, expires_at, attempts, sent_at)
       VALUES ($1, 'none', NOW(), 99, NOW())
       ON CONFLICT (email) DO UPDATE SET code_hash = 'none', expires_at = NOW(), attempts = 99, sent_at = NOW()`,
      [email]
    );
    return res.json({ success: true, message: 'If this email can be used, a code is on its way.' });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  await pool.query(
    `INSERT INTO otp_codes (email, code_hash, expires_at, attempts, sent_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval, 0, NOW())
     ON CONFLICT (email) DO UPDATE
       SET code_hash = $2, expires_at = NOW() + ($3 || ' minutes')::interval, attempts = 0, sent_at = NOW()`,
    [email, otpHash(email, code), String(OTP_MINUTES)]
  );
  await sendOTPEmail(email, code);
  res.json({ success: true, message: 'If this email can be used, a code is on its way.' });
}));

// ── Step 2 of sign-up: check the code and create the account ───
router.post('/auth/register', authLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.otp || '').trim();
  const name = String(req.body.name || '').trim().slice(0, 80);
  const password = String(req.body.password || '');

  if (!isEmail(email) || !code) throw new HttpError(400, 'Enter your email and the 6-digit code.');
  if (!name) throw new HttpError(400, 'Enter your name.');
  const pwProblem = passwordProblem(password);
  if (pwProblem) throw new HttpError(400, pwProblem);

  const invalid = new HttpError(400, 'That code is not valid. Request a new one and try again.');

  // Count this guess FIRST, in one atomic statement, outside any transaction that could roll it back.
  // That makes the "5 tries" limit hold even if someone fires many guesses at once.
  const claimed = await pool.query(
    `UPDATE otp_codes SET attempts = attempts + 1
     WHERE email = $1 AND attempts < $2 AND expires_at > NOW()
     RETURNING code_hash`,
    [email, OTP_MAX_ATTEMPTS]
  );
  if (!claimed.rowCount) throw invalid;
  const expected = Buffer.from(claimed.rows[0].code_hash);
  const given = Buffer.from(otpHash(email, code));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) throw invalid;

  const user = await withTx(async (db) => {
    const taken = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [email]);
    if (taken.rowCount) throw invalid;

    const hash = await bcrypt.hash(password, ROUNDS());
    const created = await db.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, currency, notifications_enabled, created_at`,
      [name, email, hash]
    );
    await ensureRow(db, email);
    await db.query('DELETE FROM otp_codes WHERE email = $1', [email]);
    return created.rows[0];
  });

  res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
}));

// ── Sign in ────────────────────────────────────────────────────
router.post('/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!email || !password) throw new HttpError(400, 'Enter your email and password.');

  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, currency, notifications_enabled, created_at
     FROM users WHERE lower(email) = $1`,
    [email]
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash || DUMMY_HASH : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'That email and password do not match.');

  res.json({ success: true, token: signToken(user), user: publicUser(user) });
}));

// ── Who am I (also returns credits) ────────────────────────────
router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const credits = await getCredits(req.user.email);
  res.json({ user: publicUser(req.user), credits });
}));

// ── Forgot / reset password ────────────────────────────────────
router.post('/auth/forgot-password', otpLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email address.');

  const { rows } = await pool.query('SELECT id, email FROM users WHERE lower(email) = $1', [email]);
  if (rows.length) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('DELETE FROM reset_tokens WHERE user_id = $1', [rows[0].id]);
    await pool.query(
      `INSERT INTO reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [sha256(token), rows[0].id]
    );
    const link = `${clientUrl()}/?reset_token=${token}`;
    try {
      await sendPasswordResetEmail(rows[0].email, link);
    } catch (err) {
      console.error('Reset email failed:', err.message);
    }
    if (!isProd()) console.log('Dev reset link:', link);
  }
  // Same answer whether or not the account exists.
  res.json({ success: true, message: 'If an account exists for that email, a reset link is on its way.' });
}));

router.post('/auth/reset-password', authLimiter, asyncHandler(async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  const pwProblem = passwordProblem(password);
  if (pwProblem) throw new HttpError(400, pwProblem);
  if (!token) throw new HttpError(400, 'This reset link is not valid.');

  await withTx(async (db) => {
    const { rows } = await db.query(
      'SELECT user_id FROM reset_tokens WHERE token_hash = $1 AND expires_at > NOW() FOR UPDATE',
      [sha256(token)]
    );
    if (!rows.length) throw new HttpError(400, 'This reset link has expired or was already used. Request a new one.');
    const hash = await bcrypt.hash(password, ROUNDS());
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rows[0].user_id]);
    await db.query('DELETE FROM reset_tokens WHERE user_id = $1', [rows[0].user_id]);
  });
  res.json({ success: true, message: 'Password updated. You can sign in now.' });
}));

// ── Account settings (signed in) ───────────────────────────────
router.post('/auth/change-password', requireAuth, authLimiter, asyncHandler(async (req, res) => {
  const oldPassword = String(req.body.oldPassword || '');
  const newPassword = String(req.body.newPassword || '');
  const pwProblem = passwordProblem(newPassword);
  if (pwProblem) throw new HttpError(400, pwProblem);

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const ok = await bcrypt.compare(oldPassword, rows[0].password_hash || DUMMY_HASH);
  if (!ok) throw new HttpError(401, 'Your current password is not correct.');

  const hash = await bcrypt.hash(newPassword, ROUNDS());
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
  res.json({ success: true, message: 'Password updated.' });
}));

router.patch('/auth/settings', requireAuth, asyncHandler(async (req, res) => {
  const sets = [];
  const vals = [];
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim().slice(0, 80);
    if (!name) throw new HttpError(400, 'Name can not be empty.');
    vals.push(name); sets.push(`name = $${vals.length}`);
  }
  if (req.body.currency !== undefined) {
    if (!CURRENCIES.includes(req.body.currency)) throw new HttpError(400, 'Choose INR, USD, GBP or EUR.');
    vals.push(req.body.currency); sets.push(`currency = $${vals.length}`);
  }
  if (req.body.notifications_enabled !== undefined) {
    vals.push(Boolean(req.body.notifications_enabled)); sets.push(`notifications_enabled = $${vals.length}`);
  }
  if (!sets.length) throw new HttpError(400, 'Nothing to update.');
  vals.push(req.user.id);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}
     RETURNING id, name, email, currency, notifications_enabled, created_at`,
    vals
  );
  res.json({ success: true, user: publicUser(rows[0]) });
}));

router.delete('/auth/account', requireAuth, authLimiter, asyncHandler(async (req, res) => {
  const password = String(req.body.password || '');
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const ok = await bcrypt.compare(password, rows[0].password_hash || DUMMY_HASH);
  if (!ok) throw new HttpError(401, 'That password is not correct.');

  await withTx(async (db) => {
    // shop_orders, shop_products, ask_history, data_uploads and reset_tokens cascade from users.
    await db.query('DELETE FROM payments WHERE email = $1 AND status <> $2', [req.user.email, 'paid']);
    await db.query('DELETE FROM user_credits WHERE email = $1', [req.user.email]);
    await db.query('DELETE FROM otp_codes WHERE email = $1', [req.user.email]);
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
  });
  res.json({ success: true });
}));

module.exports = router;
