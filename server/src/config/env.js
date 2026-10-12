'use strict';
require('dotenv').config();

const isProd = () => process.env.NODE_ENV === 'production';

/** Fail fast at boot if something essential is missing, instead of failing on the first request. */
function assertEnv() {
  const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. See server/.env.example`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  }
}

function allowedOrigins() {
  const list = (process.env.CLIENT_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (!isProd()) list.push('http://localhost:3000');
  return list;
}

const appName = () => process.env.APP_NAME || 'ShopPulse AI';
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');

module.exports = { assertEnv, isProd, allowedOrigins, appName, clientUrl };
