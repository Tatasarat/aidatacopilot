'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ing = require('../src/analytics/ingest');
const { normalizeDate } = require('../src/analytics/dates');

test('parseNumber handles currency symbols and different thousand separators', () => {
  assert.equal(ing.parseNumber('₹1,299.50'), 1299.5);
  assert.equal(ing.parseNumber('1,23,456'), 123456);
  assert.equal(ing.parseNumber('12,50'), 12.5);
  assert.equal(ing.parseNumber('(5)'), -5);
  assert.equal(ing.parseNumber(''), null);
  assert.equal(ing.parseNumber('abc'), null);
});

test('normalizeDate accepts ISO and day-first formats, rejects nonsense', () => {
  assert.equal(normalizeDate('2026-03-31'), '2026-03-31');
  assert.equal(normalizeDate('2026-03-31T10:22:11Z'), '2026-03-31');
  assert.equal(normalizeDate('31/03/2026'), '2026-03-31');
  assert.equal(normalizeDate('5-1-2026'), '2026-01-05');
  assert.equal(normalizeDate('2026-02-30'), null);
  assert.equal(normalizeDate('31/13/2026'), null);
  assert.equal(normalizeDate('hello'), null);
});

test('the downloadable templates pass their own validation', () => {
  const o = ing.ingestCsv('orders', ing.ORDERS_TEMPLATE);
  assert.equal(o.errorCount, 0);
  assert.equal(o.rowsValid, 3);
  const p = ing.ingestCsv('products', ing.PRODUCTS_TEMPLATE);
  assert.equal(p.errorCount, 0);
  assert.equal(p.rowsValid, 3);
  assert.ok(p.warnings.some((w) => w.code === 'missing_cost' && w.count === 1));
});

test('header names are matched flexibly (Shopify-style exports)', () => {
  const csv = 'Order Name,Created at,Lineitem sku,Lineitem name,Lineitem quantity,Lineitem price,Discount Amount,Refunded\n#1001,2026-03-01 10:00:00 +0530,tee-1,Tee,2,"1,299.00",100,0\n';
  const r = ing.ingestCsv('orders', csv);
  assert.equal(r.errorCount, 0);
  assert.deepEqual(r.valid[0], {
    order_id: '#1001', order_date: '2026-03-01', sku: 'TEE-1', product_name: 'Tee',
    quantity: 2, unit_price: 1299, discount: 100, refund_amount: 0,
  });
});

test('missing required columns give a plain-language error', () => {
  assert.throws(
    () => ing.ingestCsv('orders', 'order_id,order_date,sku\n1,2026-01-01,A\n'),
    (err) => err instanceof ing.IngestError && /Missing column/.test(err.message) && /quantity/.test(err.message)
  );
});

test('bad rows are reported with row number and field, good rows still load', () => {
  const csv = [
    'order_id,order_date,sku,quantity,unit_price',
    '1,2026-03-01,A,2,100',
    '2,not-a-date,A,1,100',
    '3,2026-03-02,A,0,100',
    '4,2026-03-02,,1,100',
    '5,2026-03-03,B,1,-5',
    '6,2026-03-03,B,1,50',
  ].join('\n');
  const r = ing.ingestCsv('orders', csv);
  assert.equal(r.rowsRead, 6);
  assert.equal(r.rowsValid, 2);
  assert.equal(r.errorCount, 4);
  assert.deepEqual(r.errors.map((e) => [e.row, e.field]), [[3, 'order_date'], [4, 'quantity'], [5, 'sku'], [6, 'unit_price']]);
  assert.equal(ing.isAcceptable(r), false, 'more than 20% bad rows must be rejected as a whole');
});

test('a mostly-good file is accepted', () => {
  const rows = Array.from({ length: 20 }, (_, i) => `${i},2026-03-01,A,1,10`);
  rows.push('x,bad-date,A,1,10');
  const r = ing.ingestCsv('orders', ['order_id,order_date,sku,quantity,unit_price', ...rows].join('\n'));
  assert.equal(r.errorCount, 1);
  assert.equal(ing.isAcceptable(r), true);
});

test('products: duplicates use the last row, blank cost is allowed, bad stock is rejected', () => {
  const csv = 'sku,unit_cost,stock_on_hand\na,10,5\nA,12,6\nb,,\nc,5,2.5\n';
  const r = ing.ingestCsv('products', csv);
  const bySku = Object.fromEntries(r.valid.map((p) => [p.sku, p]));
  assert.equal(bySku.A.unit_cost, 12);
  assert.equal(bySku.B.unit_cost, null);
  assert.equal(r.errorCount, 1);
  assert.equal(r.errors[0].field, 'stock_on_hand');
  assert.ok(r.warnings.some((w) => w.code === 'duplicate_sku'));
});

test('semicolon-separated and BOM-prefixed files are read', () => {
  const csv = '﻿order_id;order_date;sku;quantity;unit_price\n1;2026-03-01;A;1;10\n';
  const r = ing.ingestCsv('orders', csv);
  assert.equal(r.rowsValid, 1);
});

test('an empty file is refused', () => {
  assert.throws(() => ing.ingestCsv('orders', ''), /empty/);
  assert.throws(() => ing.ingestCsv('orders', 'order_id,order_date,sku,quantity,unit_price\n'), /header row and at least one data row/);
});
