'use strict';
const { assertEnv, isProd, allowedOrigins } = require('./src/config/env');
assertEnv();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { pool } = require('./src/db/postgres');
const { runMigrations } = require('./src/db/migrations');
const { apiLimiter } = require('./src/middleware/rateLimits');
const { notFound, errorHandler } = require('./src/middleware/errors');
const { startScheduler } = require('./src/jobs/weeklyReport');

const app = express();
app.set('trust proxy', 1); // Render / Vercel sit behind a proxy; needed for correct per-IP rate limits

app.use(helmet());

const origins = allowedOrigins();
app.use(cors({
  origin(origin, cb) {
    // No Origin header = curl, server-to-server, cron. Browsers always send one.
    if (!origin || origins.includes(origin.replace(/\/$/, ''))) return cb(null, true);
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cron-Secret'],
  maxAge: 600,
}));

app.use(express.json({ limit: '100kb' }));
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', apiLimiter);

app.use('/api', require('./src/routes/auth'));
app.use('/api', require('./src/routes/billing'));
app.use('/api', require('./src/routes/data'));
app.use('/api', require('./src/routes/analytics'));
app.use('/api', require('./src/routes/jobs'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 10000;

async function start() {
  await runMigrations(pool);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${isProd() ? 'production' : 'development'})`);
  });
  if (process.env.ENABLE_SCHEDULER === 'true') startScheduler();
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});

module.exports = app;
