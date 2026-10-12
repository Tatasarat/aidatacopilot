'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../src/analytics/metrics');

// Hand-calculated fixture. "Today" in this data is 2026-03-31.
//   Current 30 days  = 2026-03-02 .. 2026-03-31
//   Previous 30 days = 2026-01-31 .. 2026-03-01
const products = [
  { sku: 'A', name: 'Product A', unit_cost: 60, stock_on_hand: 30 },
  { sku: 'B', name: 'Product B', unit_cost: 20, stock_on_hand: 2 },
  { sku: 'C', name: 'Product C', unit_cost: null, stock_on_hand: null },
];

const line = (order_id, order_date, sku, quantity, unit_price, discount = 0, refund_amount = 0) => ({
  order_id, order_date, sku, product_name: null, quantity, unit_price, discount, refund_amount,
});

const orders = [
  // current period
  line('o1', '2026-03-05', 'A', 2, 100),            // net 200, cost 120, profit 80
  line('o1', '2026-03-05', 'B', 1, 50, 5),          // net 45,  cost 20,  profit 25
  line('o2', '2026-03-20', 'A', 1, 100, 0, 100),    // net 0,   cost 60,  profit -60 (fully refunded)
  line('o3', '2026-03-28', 'C', 3, 30),             // net 90, no cost known
  line('o4', '2026-03-30', 'B', 4, 50, 20),         // net 180, cost 80,  profit 100
  // previous period
  line('o0', '2026-02-10', 'A', 5, 100),            // net 500, cost 300, profit 200
  line('o0', '2026-02-10', 'B', 2, 50),             // net 100, cost 40,  profit 60
  // outside both periods: must be ignored
  line('old', '2026-01-01', 'A', 100, 100),
  // sets "today"
  line('o5', '2026-03-31', 'C', 0 + 1, 0),          // net 0, no cost
];

const ctx = m.createContext(orders, products);
const ov = m.overview(ctx, 'last_30_days');

test('asOf is the newest order date', () => {
  assert.equal(ctx.asOf, '2026-03-31');
});

test('range resolution', () => {
  const r = m.resolveRange('last_30_days', '2026-03-31');
  assert.deepEqual([r.start, r.end, r.days], ['2026-03-02', '2026-03-31', 30]);
  assert.deepEqual(r.previous, { start: '2026-01-31', end: '2026-03-01' });

  const t = m.resolveRange('this_month', '2026-03-31');
  assert.deepEqual([t.start, t.end], ['2026-03-01', '2026-03-31']);

  const l = m.resolveRange('last_month', '2026-03-31');
  assert.deepEqual([l.start, l.end, l.days], ['2026-02-01', '2026-02-28', 28]);
  assert.deepEqual(l.previous, { start: '2026-01-04', end: '2026-01-31' });

  assert.equal(m.resolveRange('all', '2026-03-31', '2025-12-01').previous, null);
  assert.equal(m.resolveRange('nonsense', '2026-03-31').key, 'last_30_days');
});

test('current period totals match the hand calculation', () => {
  const c = ov.current;
  assert.equal(c.gross_sales, 640);
  assert.equal(c.discounts, 25);
  assert.equal(c.refunds, 100);
  assert.equal(c.net_revenue, 515);
  assert.equal(c.orders, 5); // o1, o2, o3, o4, o5
  assert.equal(c.units, 12);
  assert.equal(c.cogs, 280);
  assert.equal(c.revenue_with_cost, 425);
  assert.equal(c.profit, 145);
  assert.equal(c.margin_pct, 34.1);
  assert.equal(c.profit_coverage_pct, 82.5);
  assert.deepEqual(c.unknown_cost_skus, ['C']);
});

test('average order value excludes refunds, includes discounts', () => {
  assert.equal(ov.current.aov, 123); // (640 - 25) / 5
});

test('orders outside the range are ignored', () => {
  assert.equal(ov.previous.net_revenue, 600);
  assert.equal(ov.previous.orders, 1);
  assert.equal(ov.previous.profit, 260);
});

test('period comparison', () => {
  assert.equal(ov.deltas.net_revenue.change, -85);
  assert.equal(ov.deltas.net_revenue.change_pct, -14.2);
  assert.equal(ov.deltas.profit.change, -115);
  assert.equal(ov.deltas.profit.change_pct, -44.2);
  assert.equal(ov.deltas.margin_pct.change_pct, null); // a percent of a percent is not shown
});

test('product breakdown', () => {
  const byName = Object.fromEntries(ov.products.map((p) => [p.sku, p]));
  assert.equal(byName.A.units, 3);
  assert.equal(byName.A.net_revenue, 200);
  assert.equal(byName.A.profit, 20);
  assert.equal(byName.A.margin_pct, 10);
  assert.equal(byName.A.refund_rate_pct, 33.3);
  assert.equal(byName.B.net_revenue, 225);
  assert.equal(byName.B.profit, 125);
  assert.equal(byName.B.margin_pct, 55.6);
  assert.equal(byName.C.profit, null, 'unknown cost must not be shown as zero cost');
  assert.equal(byName.C.margin_pct, null);
});

test('profit is null (not zero) when no product has a cost', () => {
  const noCosts = m.createContext(orders, []);
  const out = m.overview(noCosts, 'last_30_days');
  assert.equal(out.current.profit, null);
  assert.equal(out.current.margin_pct, null);
  assert.ok(out.meta.warnings.some((w) => /No product costs/.test(w)));
});

test('low margin, high sales uses the median revenue of costed products', () => {
  // costed revenue: A 200, B 225 -> median 212.5, so only B qualifies on sales
  assert.deepEqual(m.lowMarginHighSales(ov.products, { marginThreshold: 20 }), []);
  const flagged = m.lowMarginHighSales(ov.products, { marginThreshold: 60 });
  assert.deepEqual(flagged.map((p) => p.sku), ['B']);
});

test('stock risk: days of cover and severity', () => {
  // B sold 5 units in the last 30 days -> 1/6 per day; 2 in stock -> 12 days of cover
  const risk = m.stockRisk(ctx.lines, ctx.productMap, ctx.asOf, { leadDays: 14 });
  assert.equal(risk.length, 1);
  assert.equal(risk[0].sku, 'B');
  assert.equal(risk[0].days_of_cover, 12);
  assert.equal(risk[0].severity, 'warning');
  assert.equal(risk[0].stockout_date, '2026-04-12');

  const critical = m.stockRisk(
    ctx.lines,
    new Map([['B', { sku: 'B', name: 'B', cost: 20, stock: 1 }]]),
    ctx.asOf,
    { leadDays: 14 }
  );
  assert.equal(critical[0].days_of_cover, 6);
  assert.equal(critical[0].severity, 'critical');
});

test('revenue drivers explain what moved', () => {
  const d = ov.drivers;
  assert.equal(d.net_change, -85);
  assert.equal(d.orders_change, 4);
  assert.deepEqual(d.top_decreases.map((r) => [r.sku, r.change]), [['A', -300]]);
  assert.deepEqual(d.top_increases.map((r) => [r.sku, r.change]), [['B', 125], ['C', 90]]);
});

test('trend series covers every day and sums to the period total', () => {
  const series = m.trendSeries(m.inRange(ctx.lines, '2026-03-02', '2026-03-31'), '2026-03-02', '2026-03-31');
  assert.equal(series.length, 30);
  assert.equal(series[0].date, '2026-03-02');
  assert.equal(series[29].date, '2026-03-31');
  const total = series.reduce((s, p) => s + p.revenue, 0);
  assert.equal(Math.round(total * 100) / 100, 515);
  const profit = series.reduce((s, p) => s + (p.profit || 0), 0);
  assert.equal(Math.round(profit * 100) / 100, 145);
});

test('explain block carries the formula and inputs for the UI', () => {
  assert.equal(ov.explain.net_revenue.value, 515);
  assert.match(ov.explain.net_revenue.formula, /quantity × unit price/);
  assert.equal(ov.explain.net_revenue.inputs.length, 3);
  assert.ok(ov.explain.profit.note.includes('82.5%'));
});
