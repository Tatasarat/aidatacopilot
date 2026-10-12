'use strict';
const express = require('express');
const crypto = require('crypto');
const { HttpError, asyncHandler } = require('../middleware/errors');
const { sendWeeklyReports } = require('../jobs/weeklyReport');

const router = express.Router();

/** Lets an outside scheduler (Render cron, cron-job.org, GitHub Actions) trigger the weekly emails. */
router.post('/jobs/weekly-report', asyncHandler(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new HttpError(404, 'Not found');
  const given = Buffer.from(String(req.headers['x-cron-secret'] || ''));
  const want = Buffer.from(secret);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) throw new HttpError(401, 'Not authorised.');
  res.json({ success: true, ...(await sendWeeklyReports()) });
}));

module.exports = router;
