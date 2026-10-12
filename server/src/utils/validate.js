'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isEmail(value) {
  const e = normalizeEmail(value);
  return e.length <= 254 && EMAIL_RE.test(e);
}

/** bcrypt only uses the first 72 bytes, so cap there. */
function passwordProblem(value) {
  const p = String(value || '');
  if (p.length < 8) return 'Use at least 8 characters for your password.';
  if (Buffer.byteLength(p, 'utf8') > 72) return 'Your password is too long. Use 72 characters or fewer.';
  return null;
}

const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR'];

module.exports = { normalizeEmail, isEmail, passwordProblem, CURRENCIES };
