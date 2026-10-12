'use strict';
const { parse } = require('csv-parse/sync');
const { normalizeDate } = require('./dates');

class IngestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.status = 400;
    this.details = details;
  }
}

const MAX_ROWS = 200000;
const MAX_STORED_ERRORS = 50;

// Each spec lists the columns we need and the header names we also accept (matched ignoring case, spaces and symbols).
const SPECS = {
  orders: {
    required: ['order_id', 'order_date', 'sku', 'quantity', 'unit_price'],
    aliases: {
      order_id: ['orderid', 'order', 'ordername', 'ordernumber', 'orderno'],
      order_date: ['orderdate', 'date', 'createdat', 'processedat', 'purchasedate'],
      sku: ['sku', 'lineitemsku', 'productsku', 'variantsku', 'itemsku'],
      product_name: ['productname', 'product', 'lineitemname', 'title', 'itemname'],
      quantity: ['quantity', 'qty', 'lineitemquantity', 'units'],
      unit_price: ['unitprice', 'price', 'lineitemprice', 'itemprice', 'sellingprice'],
      discount: ['discount', 'discounts', 'lineitemdiscount', 'discountamount'],
      refund_amount: ['refundamount', 'refund', 'refunds', 'refunded'],
    },
  },
  products: {
    required: ['sku', 'unit_cost'],
    aliases: {
      sku: ['sku', 'productsku', 'variantsku', 'itemsku'],
      product_name: ['productname', 'product', 'name', 'title'],
      unit_cost: ['unitcost', 'cost', 'costperitem', 'cogs', 'costprice', 'purchaseprice'],
      stock_on_hand: ['stockonhand', 'stock', 'inventory', 'inventoryquantity', 'quantityonhand', 'onhand', 'available'],
    },
  },
};

const norm = (h) => String(h == null ? '' : h).replace(/^﻿/, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function detectDelimiter(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) || '';
  const counts = [',', ';', '\t', '|'].map((d) => [d, first.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

/** Returns { headers: string[], rows: string[][] } or throws IngestError with a plain-language reason. */
function parseCsv(text) {
  if (!text || !String(text).trim()) throw new IngestError('This file is empty.');
  let table;
  try {
    table = parse(text, {
      bom: true,
      columns: false,
      skip_empty_lines: true,
      trim: true,
      delimiter: detectDelimiter(text),
      relax_column_count: true,
      relax_quotes: true,
    });
  } catch (err) {
    throw new IngestError(`This file could not be read as a CSV (${err.message}).`);
  }
  if (table.length < 2) throw new IngestError('The file needs a header row and at least one data row.');
  if (table.length - 1 > MAX_ROWS) {
    throw new IngestError(`This file has more than ${MAX_ROWS.toLocaleString('en-US')} rows. Split it and upload in parts.`);
  }
  return { headers: table[0], rows: table.slice(1) };
}

/** Works out which column holds which field. Throws if a required column is missing. */
function mapHeaders(headers, type) {
  const spec = SPECS[type];
  const lookup = new Map();
  for (const [field, names] of Object.entries(spec.aliases)) {
    lookup.set(norm(field), field);
    names.forEach((n) => { if (!lookup.has(n)) lookup.set(n, field); });
  }
  const index = {};
  const unrecognized = [];
  headers.forEach((h, i) => {
    const field = lookup.get(norm(h));
    if (field && index[field] === undefined) index[field] = i;
    else if (!field) unrecognized.push(String(h));
  });
  const missing = spec.required.filter((f) => index[f] === undefined);
  if (missing.length) {
    const hint = missing
      .map((f) => `"${f}" (also accepted: ${spec.aliases[f].slice(0, 3).join(', ')})`)
      .join('; ');
    throw new IngestError(`Missing column: ${hint}. Download the template to see the expected format.`, { missing });
  }
  return { index, unrecognized };
}

/** "1,299.50", "₹1,299", "12,50", "(5)" -> number, or null if it is not a number. */
function parseNumber(value) {
  if (value === undefined || value === null) return null;
  let s = String(value).trim();
  if (s === '') return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  s = s.replace(/[^\d.,-]/g, '');
  if (!s || s === '-' || s === '.') return null;
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1); }
  if (/^\d{1,3}(,\d{2,3})*,\d{3}(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');  // 1,299.50 and 1,23,456 (last group is always 3 digits)
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');                    // 12,50
  else s = s.replace(/,/g, '');
  const n = Number(s);
  if (!Number.isFinite(n) || n > 1e9) return null;
  return negative ? -n : n;
}

const cleanSku = (v) => String(v == null ? '' : v).trim().toUpperCase();
const cell = (row, index, field) => (index[field] === undefined ? undefined : row[index[field]]);
const isBlankRow = (row) => row.every((c) => String(c == null ? '' : c).trim() === '');

function addWarning(map, code, message) {
  const w = map.get(code) || { code, message, count: 0 };
  w.count += 1;
  map.set(code, w);
}

function finish(valid, errors, errorCount, warnings, rowsRead, extra = {}) {
  return {
    valid,
    errors,
    errorCount,
    warnings: [...warnings.values()],
    rowsRead,
    rowsValid: valid.length,
    ...extra,
  };
}

function validateOrders(headers, rows) {
  const { index, unrecognized } = mapHeaders(headers, 'orders');
  const valid = [];
  const errors = [];
  let errorCount = 0;
  let rowsRead = 0;
  const warnings = new Map();

  rows.forEach((row, i) => {
    if (isBlankRow(row)) return;
    rowsRead += 1;
    const line = i + 2; // +1 for header, +1 because humans count from 1
    const problems = [];
    const fail = (field, message) => problems.push({ row: line, field, message });

    const orderId = String(cell(row, index, 'order_id') || '').trim();
    if (!orderId) fail('order_id', 'Order ID is empty.');
    else if (orderId.length > 100) fail('order_id', 'Order ID is longer than 100 characters.');

    const rawDate = cell(row, index, 'order_date');
    const date = normalizeDate(rawDate);
    if (!date) fail('order_date', `"${rawDate ?? ''}" is not a date we can read. Use 2026-03-31 or 31/03/2026.`);

    const sku = cleanSku(cell(row, index, 'sku'));
    if (!sku) fail('sku', 'SKU is empty.');
    else if (sku.length > 100) fail('sku', 'SKU is longer than 100 characters.');

    const rawQty = parseNumber(cell(row, index, 'quantity'));
    if (rawQty === null || !Number.isInteger(rawQty) || rawQty < 1) {
      fail('quantity', 'Quantity must be a whole number of 1 or more. Put returns in refund_amount instead.');
    }

    const price = parseNumber(cell(row, index, 'unit_price'));
    if (price === null || price < 0) fail('unit_price', 'Unit price must be a number of 0 or more.');

    const rawDiscount = cell(row, index, 'discount');
    const discount = rawDiscount === undefined || String(rawDiscount).trim() === '' ? 0 : parseNumber(rawDiscount);
    if (discount === null || discount < 0) fail('discount', 'Discount must be a number of 0 or more.');

    const rawRefund = cell(row, index, 'refund_amount');
    const refund = rawRefund === undefined || String(rawRefund).trim() === '' ? 0 : parseNumber(rawRefund);
    if (refund === null || refund < 0) fail('refund_amount', 'Refund amount must be a number of 0 or more.');

    if (problems.length) {
      errorCount += problems.length;
      for (const p of problems) if (errors.length < MAX_STORED_ERRORS) errors.push(p);
      return;
    }

    if (discount + refund > rawQty * price + 0.005) {
      addWarning(warnings, 'over_discounted', 'Some lines have a discount plus refund larger than the line total. Check those rows.');
    }
    const name = String(cell(row, index, 'product_name') || '').trim().slice(0, 200);
    valid.push({
      order_id: orderId,
      order_date: date,
      sku,
      product_name: name || null,
      quantity: rawQty,
      unit_price: price,
      discount,
      refund_amount: refund,
    });
  });

  if (unrecognized.length) {
    addWarning(warnings, 'ignored_columns', `Ignored columns we do not use: ${unrecognized.slice(0, 6).join(', ')}.`);
  }
  return finish(valid, errors, errorCount, warnings, rowsRead);
}

function validateProducts(headers, rows) {
  const { index, unrecognized } = mapHeaders(headers, 'products');
  const bySku = new Map();
  const errors = [];
  let errorCount = 0;
  let rowsRead = 0;
  let missingCost = 0;
  const warnings = new Map();

  rows.forEach((row, i) => {
    if (isBlankRow(row)) return;
    rowsRead += 1;
    const line = i + 2;
    const problems = [];
    const fail = (field, message) => problems.push({ row: line, field, message });

    const sku = cleanSku(cell(row, index, 'sku'));
    if (!sku) fail('sku', 'SKU is empty.');
    else if (sku.length > 100) fail('sku', 'SKU is longer than 100 characters.');

    const rawCost = cell(row, index, 'unit_cost');
    let cost = null;
    if (rawCost !== undefined && String(rawCost).trim() !== '') {
      cost = parseNumber(rawCost);
      if (cost === null || cost < 0) fail('unit_cost', 'Unit cost must be a number of 0 or more (or leave it blank).');
    }

    const rawStock = cell(row, index, 'stock_on_hand');
    let stock = null;
    if (rawStock !== undefined && String(rawStock).trim() !== '') {
      stock = parseNumber(rawStock);
      if (stock === null || stock < 0 || !Number.isInteger(stock)) fail('stock_on_hand', 'Stock on hand must be a whole number of 0 or more (or leave it blank).');
    }

    if (problems.length) {
      errorCount += problems.length;
      for (const p of problems) if (errors.length < MAX_STORED_ERRORS) errors.push(p);
      return;
    }
    if (cost === null) missingCost += 1;
    if (bySku.has(sku)) addWarning(warnings, 'duplicate_sku', 'Some SKUs appear more than once. The last row for each SKU was used.');
    const name = String(cell(row, index, 'product_name') || '').trim().slice(0, 200);
    bySku.set(sku, { sku, name: name || null, unit_cost: cost, stock_on_hand: stock });
  });

  if (missingCost) {
    addWarning(warnings, 'missing_cost', `${missingCost} product(s) have no unit cost, so profit can't be calculated for them.`);
    warnings.get('missing_cost').count = missingCost;
  }
  if (unrecognized.length) {
    addWarning(warnings, 'ignored_columns', `Ignored columns we do not use: ${unrecognized.slice(0, 6).join(', ')}.`);
  }
  return finish([...bySku.values()], errors, errorCount, warnings, rowsRead);
}

/** Reject a file when most of it is unusable, so a wrong file never silently replaces good data. */
function isAcceptable(result) {
  if (result.rowsValid === 0) return false;
  const rejected = result.rowsRead - result.rowsValid;
  return rejected / Math.max(result.rowsRead, 1) <= 0.2;
}

function ingestCsv(type, text) {
  const { headers, rows } = parseCsv(text);
  return type === 'orders' ? validateOrders(headers, rows) : validateProducts(headers, rows);
}

const ORDERS_TEMPLATE = [
  'order_id,order_date,sku,product_name,quantity,unit_price,discount,refund_amount',
  '1001,2026-03-01,TEE-BLK-M,Black Tee (M),2,799,0,0',
  '1001,2026-03-01,MUG-01,Ceramic Mug,1,499,50,0',
  '1002,2026-03-02,TEE-BLK-M,Black Tee (M),1,799,0,799',
].join('\n') + '\n';

const PRODUCTS_TEMPLATE = [
  'sku,product_name,unit_cost,stock_on_hand',
  'TEE-BLK-M,Black Tee (M),310,42',
  'MUG-01,Ceramic Mug,180,15',
  'BAG-02,Canvas Tote,,60',
].join('\n') + '\n';

module.exports = {
  IngestError, parseCsv, mapHeaders, parseNumber, validateOrders, validateProducts,
  isAcceptable, ingestCsv, ORDERS_TEMPLATE, PRODUCTS_TEMPLATE, MAX_ROWS,
};
