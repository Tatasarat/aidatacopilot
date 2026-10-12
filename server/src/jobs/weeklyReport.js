'use strict';
const { pool } = require('../db/postgres');
const repo = require('../analytics/repo');
const report = require('../analytics/report');
const { sendEmail } = require('../utils/mailer');
const { appName, clientUrl } = require('../config/env');

/** Emails the weekly report to everyone who has data, has the email turned on, and has not had one in the last 6 days. */
async function sendWeeklyReports({ limit = 50 } = {}) {
  const { rows: users } = await pool.query(
    `SELECT u.id, u.email, u.currency
     FROM users u
     WHERE u.notifications_enabled IS NOT FALSE
       AND (u.last_report_sent_at IS NULL OR u.last_report_sent_at < NOW() - INTERVAL '6 days')
       AND EXISTS (SELECT 1 FROM shop_orders o WHERE o.user_id = u.id)
     ORDER BY u.last_report_sent_at NULLS FIRST
     LIMIT $1`,
    [limit]
  );

  let sent = 0;
  let failed = 0;
  for (const u of users) {
    try {
      const { orders, products } = await repo.loadData(u.id);
      const r = report.buildWeeklyReport(orders, products);
      const opts = { appName: appName(), clientUrl: clientUrl(), currency: u.currency || 'INR' };
      await sendEmail(u.email, `Your ${appName()} weekly report`, report.renderReportHtml(r, opts), report.renderReportText(r, opts));
      await pool.query('UPDATE users SET last_report_sent_at = NOW() WHERE id = $1', [u.id]);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`Weekly report failed for user ${u.id}:`, err.message);
    }
  }
  return { checked: users.length, sent, failed };
}

/** Optional built-in scheduler: Mondays from 9:00 India time. Needs an always-on server. */
function startScheduler() {
  const tick = async () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(new Date());
    const weekday = parts.find((p) => p.type === 'weekday').value;
    const hour = Number(parts.find((p) => p.type === 'hour').value);
    if (weekday !== 'Mon' || hour < 9) return;
    try {
      const out = await sendWeeklyReports();
      if (out.sent || out.failed) console.log('Weekly reports:', out);
    } catch (err) {
      console.error('Weekly report scheduler error:', err.message);
    }
  };
  setInterval(tick, 60 * 60 * 1000).unref();
  console.log('Weekly report scheduler is on (Mondays from 9:00 IST).');
}

module.exports = { sendWeeklyReports, startScheduler };
