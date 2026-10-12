'use strict';
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../middleware/errors');
const { askLimiter, emailLimiter } = require('../middleware/rateLimits');
const m = require('../analytics/metrics');
const intents = require('../analytics/intents');
const repo = require('../analytics/repo');
const report = require('../analytics/report');
const { planQuestion } = require('../ai/planner');
const { explainResult } = require('../ai/explainer');
const { getLlm } = require('../ai/llm');
const { consumeCredit, refundCredit } = require('../utils/credits');
const { sendEmail } = require('../utils/mailer');
const { appName, clientUrl } = require('../config/env');

const router = express.Router();
router.use('/analytics', requireAuth);

const NO_DATA = 'Upload your orders first, or load the sample store, to see your numbers.';

router.get('/analytics/overview', asyncHandler(async (req, res) => {
  const { orders, products } = await repo.loadData(req.user.id);
  if (!orders.length) return res.json({ has_data: false, message: NO_DATA });
  const ctx = m.createContext(orders, products);
  res.json({ has_data: true, ...m.overview(ctx, String(req.query.range || 'last_30_days')) });
}));

router.get('/analytics/report', asyncHandler(async (req, res) => {
  const { orders, products } = await repo.loadData(req.user.id);
  if (!orders.length) return res.json({ has_data: false, message: NO_DATA });
  const r = report.buildWeeklyReport(orders, products);
  res.json({ ...r, headline: report.headline(r, req.user.currency || 'INR'), currency: req.user.currency || 'INR' });
}));

router.post('/analytics/report/email', emailLimiter, asyncHandler(async (req, res) => {
  const { orders, products } = await repo.loadData(req.user.id);
  if (!orders.length) throw new HttpError(400, NO_DATA);
  const r = report.buildWeeklyReport(orders, products);
  const opts = { appName: appName(), clientUrl: clientUrl(), currency: req.user.currency || 'INR' };
  await sendEmail(req.user.email, `Your ${appName()} weekly report`, report.renderReportHtml(r, opts), report.renderReportText(r, opts));
  res.json({ success: true, message: `Sent to ${req.user.email}.` });
}));

router.get('/analytics/history', asyncHandler(async (req, res) => {
  res.json({ history: await repo.recentHistory(req.user.id) });
}));

router.post('/analytics/ask', askLimiter, asyncHandler(async (req, res) => {
  const question = String(req.body.question || '').trim();
  if (question.length < 3) throw new HttpError(400, 'Type a question of at least a few words.');
  if (question.length > 300) throw new HttpError(400, 'Keep your question under 300 characters.');

  const { orders, products } = await repo.loadData(req.user.id);
  if (!orders.length) throw new HttpError(400, NO_DATA);

  const credits = await consumeCredit(req.user.email); // atomic; throws 403 with upgrade_required when empty
  try {
    const llm = getLlm();
    const { plan, source: planSource } = await planQuestion(question, llm);
    const ctx = m.createContext(orders, products);
    const result = intents.run(plan, ctx);
    const answer = await explainResult(question, result, { llm, currency: req.user.currency || 'INR' });
    await repo.saveHistory(req.user.id, question, result.intent, answer.text);
    res.json({
      question,
      plan,
      understood_by: planSource,
      answer: answer.text,
      answer_source: answer.source,
      verified: answer.verified,
      result,
      credits,
    });
  } catch (err) {
    await refundCredit(req.user.email).catch(() => {}); // never charge for a question that failed
    throw err;
  }
}));

module.exports = router;
