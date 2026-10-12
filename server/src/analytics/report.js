'use strict';
const m = require('./metrics');
const { money, movement } = require('./narrative');
const { shortLabel } = require('./dates');
const { escapeHtml } = require('../utils/mailer');

/** The weekly report: last 7 days against the 7 before, plus what to look at. */
function buildWeeklyReport(orders, products) {
  const ctx = m.createContext(orders, products);
  if (!ctx.asOf) return { has_data: false };
  const ov = m.overview(ctx, 'last_7_days');
  const withProfit = ov.products.filter((p) => p.profit != null);
  const topProfit = [...withProfit].sort((a, b) => b.profit - a.profit).slice(0, 3);
  const weakest = [...withProfit].sort((a, b) => a.profit - b.profit).slice(0, 3);
  const movers = ov.drivers
    ? { down: ov.drivers.top_decreases.slice(0, 3), up: ov.drivers.top_increases.slice(0, 3) }
    : { down: [], up: [] };

  return {
    has_data: true,
    as_of: ctx.asOf,
    period: ov.meta.range,
    current: ov.current,
    previous: ov.previous,
    deltas: ov.deltas,
    top_profit: topProfit,
    weakest,
    low_margin: ov.low_margin.slice(0, 3),
    loss_making: ov.loss_making.slice(0, 3),
    stock_risk: ov.stock_risk.slice(0, 5),
    refund_heavy: ov.products.filter((p) => p.refund_rate_pct >= 10 && p.refunds > 0).sort((a, b) => b.refunds - a.refunds).slice(0, 3),
    movers,
    notes: ov.meta.warnings,
  };
}

function headline(report, currency) {
  const $ = (n) => money(n, currency);
  const c = report.current;
  const move = movement(report.deltas.net_revenue.change_pct);
  let s = `Net revenue was ${$(c.net_revenue)} from ${c.orders} orders${move ? `, ${move} on the week before` : ''}.`;
  if (c.profit != null) s += ` Profit on products with a known cost was ${$(c.profit)} (${c.margin_pct}% margin).`;
  return s;
}

function renderReportText(report, { appName, clientUrl, currency }) {
  if (!report.has_data) return `${appName}: upload your orders to get your weekly report.\n${clientUrl}`;
  const $ = (n) => money(n, currency);
  const out = [`${appName} weekly report: ${shortLabel(report.period.start)} to ${shortLabel(report.period.end)}`, '', headline(report, currency), ''];
  if (report.stock_risk.length) {
    out.push('Running low:');
    report.stock_risk.forEach((r) => out.push(`- ${r.name}: about ${r.days_of_cover} days of stock`));
    out.push('');
  }
  if (report.low_margin.length) {
    out.push('Selling well but thin margin:');
    report.low_margin.forEach((r) => out.push(`- ${r.name}: ${r.margin_pct}% margin on ${$(r.net_revenue)}`));
    out.push('');
  }
  out.push(`Open your dashboard: ${clientUrl}`);
  return out.join('\n');
}

function renderReportHtml(report, { appName, clientUrl, currency }) {
  const e = escapeHtml;
  const $ = (n) => e(money(n, currency));
  const wrap = (inner) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:28px 20px;color:#0d1b2a;line-height:1.5">${inner}</div>`;
  if (!report.has_data) {
    return wrap(`<h2 style="margin:0 0 12px">${e(appName)}</h2><p>Upload your orders to get your weekly report.</p><p><a href="${e(clientUrl)}">Open ${e(appName)}</a></p>`);
  }
  const section = (title, items) => (items.length
    ? `<h3 style="margin:24px 0 8px;font-size:16px">${e(title)}</h3><ul style="padding-left:18px;margin:0">${items.map((i) => `<li style="margin:4px 0">${i}</li>`).join('')}</ul>`
    : '');

  const html = `
    <h2 style="margin:0 0 4px">${e(appName)} weekly report</h2>
    <div style="color:#5b6b7c;font-size:13px;margin-bottom:16px">${e(shortLabel(report.period.start))} to ${e(shortLabel(report.period.end))}</div>
    <p style="font-size:16px;margin:0 0 8px">${e(headline(report, currency))}</p>
    ${section('Running low on stock', report.stock_risk.map((r) => `<b>${e(r.name)}</b>: about ${e(r.days_of_cover)} days left (${e(r.stock_on_hand)} in stock)`))}
    ${section('Selling well, thin margin', report.low_margin.map((r) => `<b>${e(r.name)}</b>: ${e(r.margin_pct)}% margin on ${$(r.net_revenue)} of sales`))}
    ${section('Losing money', report.loss_making.map((r) => `<b>${e(r.name)}</b>: ${$(r.profit)}`))}
    ${section('High refund rate', report.refund_heavy.map((r) => `<b>${e(r.name)}</b>: ${$(r.refunds)} refunded (${e(r.refund_rate_pct)}% of sales)`))}
    ${section('Biggest drops vs last week', report.movers.down.map((r) => `<b>${e(r.name)}</b>: ${$(r.change)}`))}
    ${section('Best profit this week', report.top_profit.map((r) => `<b>${e(r.name)}</b>: ${$(r.profit)}`))}
    ${report.notes.length ? `<p style="color:#5b6b7c;font-size:13px;margin-top:20px">${e(report.notes[0])}</p>` : ''}
    <p style="margin:28px 0 0"><a href="${e(clientUrl)}" style="background:#1b5e9b;color:#fff;text-decoration:none;padding:11px 22px;border-radius:6px;font-weight:600;display:inline-block">Open your dashboard</a></p>
    <p style="color:#6b7a8a;font-size:12px;margin-top:28px">Every number comes from the files you uploaded. You can turn this weekly email off in Settings.</p>`;
  return wrap(html);
}

module.exports = { buildWeeklyReport, renderReportHtml, renderReportText, headline };
