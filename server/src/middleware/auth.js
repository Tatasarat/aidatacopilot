'use strict';
const jwt = require('jsonwebtoken');
const { pool } = require('../db/postgres');
const { HttpError, asyncHandler } = require('./errors');

const TOKEN_TTL = '7d';

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL,
  });
}

/** Reads "Authorization: Bearer <token>", loads the user, and sets req.user. */
const requireAuth = asyncHandler(async (req, res, next) => {
  const match = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
  if (!match) throw new HttpError(401, 'Please sign in to continue.');

  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (_) {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, currency, notifications_enabled, created_at FROM users WHERE id = $1',
    [payload.sub]
  );
  if (!rows.length) throw new HttpError(401, 'This account no longer exists.');
  req.user = rows[0];
  next();
});

module.exports = { signToken, requireAuth };
