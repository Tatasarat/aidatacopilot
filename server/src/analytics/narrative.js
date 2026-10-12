'use strict';
const { shortLabel } = require('./dates');

function money(n, currency = 'INR') {
  if (n == null) return 'n/a';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

const pct = (n) => (n == null ? 'n/a' : `${n}%`);

function movement(changePct) {
  if (changePct == null) return null;
  if (changePct === 0) return 'unchanged';
  return `${changePct > 0 ? 'up' : 'down'} ${Math.abs(changePct)}%`;
}

const names = (rows, n = 3) => rows.slice(0, n).map((r) => r.name);

/** Plain-language answer built only from verified numbers. Used when the AI text is unavailable or fails the number check. */
function describe(result, { currency = 'INR' } = {}) {
  const $ = (n) => money(n, currency);
  const label = result.range ? result.range.label : '';
  const rows = result.rows || [];
  if (result.intent === 'unsupported') {
    return 'I can answer questions about profit, margins, refunds, stock levels and why revenue changed. Try one of the suggested questions.';
  }
  if (!rows.length && result.intent !== 'summary') return result.empty_reason || 'There is nothing to show for that question in this period.';

  switch (result.intent) {
    case 'summary': {
      const { current, deltas } = result.facts;
      const move = movement(deltas.net_revenue.change_pct);
      let text = `In ${label} you had ${$(current.net_revenue)} in net revenue from ${current.orders} orders`;
      text += move ? `, ${move} on the previous period.` : '.';
      if (current.profit != null) {
        text += ` Profit on products with a known cost was ${$(current.profit)} at a ${pct(current.margin_pct)} margin.`;
      } else {
        text += ' Profit cannot be calculated yet because no unit costs are uploaded.';
      }
      return text;
    }
    case 'top_profit_products':
      return `In ${label}, your most profitable products were ${rows.slice(0, 3).map((r) => `${r.name} (${$(r.profit)})`).join(', ')}. Profit only includes products with a known unit cost.`;
    case 'worst_products': {
      const worst = rows[0];
      return worst.profit < 0
        ? `In ${label}, ${worst.name} lost money: ${$(worst.profit)} after costs. The next weakest were ${names(rows.slice(1), 2).join(' and ') || 'none'}.`
        : `In ${label}, your least profitable products were ${rows.slice(0, 3).map((r) => `${r.name} (${$(r.profit)})`).join(', ')}.`;
    }
    case 'low_margin_high_sales':
      return `In ${label}, ${rows.slice(0, 3).map((r) => `${r.name} (${pct(r.margin_pct)} margin on ${$(r.net_revenue)} of sales)`).join(', ')} sell well but keep little of each sale. Check prices, discounts and supplier costs.`;
    case 'stock_risk':
      return `${rows.slice(0, 3).map((r) => `${r.name} has about ${r.days_of_cover} days of stock left`).join('; ')}. Days of cover use the last 30 days of sales.`;
    case 'revenue_change': {
      const f = result.facts;
      const dir = f.net_change < 0 ? 'fell' : 'rose';
      let text = `Net revenue ${dir} by ${$(Math.abs(f.net_change))} compared with the previous period. Orders changed by ${f.orders_change >= 0 ? '+' : ''}${f.orders_change} and average order value by ${$(f.aov_change)}.`;
      const biggest = rows[0];
      if (biggest) text += ` The biggest single move was ${biggest.name} (${biggest.change >= 0 ? '+' : '-'}${$(Math.abs(biggest.change))}).`;
      return text;
    }
    case 'refunds':
      return `In ${label}, ${rows.slice(0, 3).map((r) => `${r.name} had ${$(r.refunds)} refunded (${pct(r.refund_rate_pct)} of its sales)`).join('; ')}.`;
    default:
      return `Found ${rows.length} rows.`;
  }
}

const periodText = (r) => `${shortLabel(r.start)} to ${shortLabel(r.end)}`;

module.exports = { money, pct, movement, describe, periodText };
