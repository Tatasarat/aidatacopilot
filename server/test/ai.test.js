'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { keywordPlan, sanitizePlan, planQuestion } = require('../src/ai/planner');
const { verifyExplanation } = require('../src/ai/verify');
const { explainResult } = require('../src/ai/explainer');
const intents = require('../src/analytics/intents');
const m = require('../src/analytics/metrics');
const { generateSample } = require('../src/sample/sampleData');
const ingest = require('../src/analytics/ingest');
const report = require('../src/analytics/report');

const TODAY = '2026-03-31';
const sample = generateSample(TODAY);
const ctx = m.createContext(sample.orders, sample.products);

test('keyword planner routes the suggested questions correctly', () => {
  const cases = [
    ['Which products generated the most profit last week?', 'top_profit_products', 'last_7_days'],
    ['Which products have high sales but low margins?', 'low_margin_high_sales', 'last_30_days'],
    ['Which products might run out of stock soon?', 'stock_risk', 'last_30_days'],
    ['Why did revenue change compared with last month?', 'revenue_change', 'last_month'],
    ['Which products are losing money?', 'worst_products', 'last_30_days'],
    ['Which product has the most refunds?', 'refunds', 'last_30_days'],
    ['Give me an overview of this month', 'summary', 'this_month'],
    ['What is the weather like?', 'unsupported', 'last_30_days'],
  ];
  for (const [q, intent, range] of cases) {
    const p = keywordPlan(q);
    assert.equal(p.intent, intent, q);
    assert.equal(p.range, range, q);
  }
  assert.equal(keywordPlan('top 8 products by profit').limit, 8);
});

test('sanitizePlan rejects anything outside the allow-list', () => {
  assert.equal(sanitizePlan({ intent: 'DROP TABLE users' }), null);
  assert.equal(sanitizePlan(null), null);
  assert.deepEqual(sanitizePlan({ intent: 'stock_risk', range: 'forever', limit: 999 }), { intent: 'stock_risk', range: 'last_30_days', limit: 20 });
  assert.deepEqual(sanitizePlan({ intent: 'summary', range: 'this_month', limit: 'x' }), { intent: 'summary', range: 'this_month', limit: 5 });
});

test('planQuestion uses a valid AI plan, and falls back to rules when the AI misbehaves', async () => {
  const good = { invoke: async () => ({ content: 'Sure! {"intent":"stock_risk","range":"last_7_days","limit":3}' }) };
  assert.deepEqual(await planQuestion('anything', good), { plan: { intent: 'stock_risk', range: 'last_7_days', limit: 3 }, source: 'ai' });

  const evil = { invoke: async () => ({ content: '{"intent":"run_sql","sql":"DROP TABLE users"}' }) };
  const out = await planQuestion('which products have the most refunds', evil);
  assert.equal(out.source, 'rules');
  assert.equal(out.plan.intent, 'refunds');

  const broken = { invoke: async () => { throw new Error('network down'); } };
  assert.equal((await planQuestion('stock check', broken)).source, 'rules');
  assert.equal((await planQuestion('stock check', null)).source, 'rules');
});

test('verifyExplanation accepts real numbers and rejects invented ones', () => {
  const result = {
    rows: [{ name: 'Candle', net_revenue: 123456.78, margin_pct: 13.2, profit: 9000 }],
    facts: null, range: { start: '2026-03-02', end: '2026-03-31' }, evidence: {},
  };
  assert.equal(verifyExplanation('Candle earned ₹1,23,457 with a 13.2% margin.', result).ok, true);
  assert.equal(verifyExplanation('Candle profit was 9,000.', result).ok, true);
  const bad = verifyExplanation('Candle profit was ₹45,000, so you could earn ₹120,000 more.', result);
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /numbers not found/);
  assert.equal(verifyExplanation('See https://evil.example for details', result).ok, false);
  assert.equal(verifyExplanation('', result).ok, false);
});

test('explainResult falls back to the verified template when the AI invents numbers', async () => {
  const result = intents.run({ intent: 'stock_risk', range: 'last_30_days', limit: 5 }, ctx);
  const lying = { invoke: async () => ({ content: 'Everything runs out in 3,456 days and you lose ₹98,765.' }) };
  const out = await explainResult('stock?', result, { llm: lying });
  assert.equal(out.source, 'template');
  assert.match(out.text, /days of stock left/);

  const none = await explainResult('stock?', result, { llm: null });
  assert.equal(none.source, 'template');
});

test('sample store passes the same validation as a user upload', () => {
  assert.ok(sample.orders.length > 1000);
  const header = 'order_id,order_date,sku,product_name,quantity,unit_price,discount,refund_amount';
  const csv = [header, ...sample.orders.slice(0, 500).map((o) => [o.order_id, o.order_date, o.sku, `"${o.product_name}"`, o.quantity, o.unit_price, o.discount, o.refund_amount].join(','))].join('\n');
  const r = ingest.ingestCsv('orders', csv);
  assert.equal(r.errorCount, 0);
  assert.equal(r.rowsValid, 500);
});

test('the sample store tells the story it was written to tell', () => {
  const ov = m.overview(ctx, 'last_30_days');
  assert.ok(ov.current.profit_coverage_pct < 100, 'tea sampler has no cost');
  assert.ok(ov.low_margin.some((p) => p.sku === 'CANDLE-04'), 'discounted candles should be flagged');
  assert.ok(ov.stock_risk.some((p) => p.sku === 'MAT-06'), 'yoga mat is nearly out of stock');
  const wallet = ov.drivers.top_decreases.find((r) => r.sku === 'WALLET-01');
  assert.ok(wallet && wallet.change < 0, 'wallet sales should have dropped');
  assert.ok(ov.deltas.net_revenue.change_pct < 0, 'revenue should be down');
  const mug = ov.products.find((p) => p.sku === 'MUG-05');
  assert.ok(mug.refund_rate_pct > 5, 'mugs have a high refund rate');
});

test('every intent runs on the sample store and produces a non-empty template answer', async () => {
  for (const intent of intents.INTENT_KEYS) {
    const result = intents.run({ intent, range: 'last_30_days', limit: 5 }, ctx);
    assert.equal(result.intent, intent);
    assert.ok(result.evidence.definitions.length >= 0);
    const out = await explainResult('q', result, { llm: null });
    assert.ok(out.text.length > 10, intent);
    assert.equal(verifyExplanation(out.text, result).ok, true, `template for ${intent} must pass its own number check`);
  }
});

test('unsupported questions get a helpful message, not an error', async () => {
  const result = intents.run({ intent: 'unsupported', range: 'last_30_days', limit: 5 }, ctx);
  assert.equal(result.intent, 'unsupported');
  const out = await explainResult('what is the weather', result, { llm: null });
  assert.match(out.text, /profit, margins, refunds/);
});

test('weekly report contains the sections and escapes product names in HTML', () => {
  const evil = sample.products.map((p) => (p.sku === 'MAT-06' ? { ...p, name: '<img src=x onerror=alert(1)>' } : p));
  const r = report.buildWeeklyReport(sample.orders, evil);
  assert.equal(r.has_data, true);
  assert.equal(r.period.days, 7);
  const html = report.renderReportHtml(r, { appName: 'ShopPulse AI', clientUrl: 'https://example.com', currency: 'INR' });
  assert.ok(!html.includes('<img src=x'), 'product names must be HTML-escaped');
  assert.match(html, /&lt;img/);
  const text = report.renderReportText(r, { appName: 'ShopPulse AI', clientUrl: 'https://example.com', currency: 'INR' });
  assert.match(text, /weekly report/);
  assert.equal(report.buildWeeklyReport([], []).has_data, false);
});
