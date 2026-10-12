'use strict';
/**
 * Deterministic store metrics. Nothing in here calls an AI model: every number comes from
 * plain arithmetic over the uploaded rows, so it can be tested and traced.
 */
const { addDays, diffDays, startOfMonth } = require('./dates');

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const r1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;

const RANGE_KEYS = ['last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'last_month', 'all'];
const RANGE_LABELS = {
  last_7_days: 'the last 7 days',
  last_30_days: 'the last 30 days',
  last_90_days: 'the last 90 days',
  this_month: 'this month',
  last_month: 'last month',
  all: 'all time',
};

const DEFINITIONS = {
  net_revenue: 'Net revenue = quantity × unit price − discounts − refunds.',
  profit: 'Profit = net revenue − quantity × unit cost, counted only for products that have a unit cost.',
  margin: 'Margin = profit ÷ net revenue, for products that have a unit cost.',
  aov: 'Average order value = (quantity × unit price − discounts) ÷ number of distinct orders.',
  refund_rate: 'Refund rate = refunds ÷ (quantity × unit price).',
  cover: 'Days of cover = stock on hand ÷ average daily units sold over the last 30 days.',
  cogs: 'Cost of goods = quantity × unit cost. Refunded items are not assumed to return to stock.',
};

function latestDate(orders) {
  let max = null;
  for (const o of orders) if (!max || o.order_date > max) max = o.order_date;
  return max;
}

function earliestDate(orders) {
  let min = null;
  for (const o of orders) if (!min || o.order_date < min) min = o.order_date;
  return min;
}

/** Ranges are relative to the newest order in the data, so older exports still produce a useful dashboard. */
function resolveRange(key, asOf, earliest) {
  if (!RANGE_KEYS.includes(key)) key = 'last_30_days';
  let start;
  let end = asOf;
  switch (key) {
    case 'last_7_days': start = addDays(asOf, -6); break;
    case 'last_90_days': start = addDays(asOf, -89); break;
    case 'this_month': start = startOfMonth(asOf); break;
    case 'last_month': {
      end = addDays(startOfMonth(asOf), -1);
      start = startOfMonth(end);
      break;
    }
    case 'all': start = earliest || asOf; break;
    default: start = addDays(asOf, -29);
  }
  const days = diffDays(start, end) + 1;
  const previous = key === 'all' ? null : { start: addDays(start, -days), end: addDays(start, -1) };
  return { key, label: RANGE_LABELS[key], start, end, days, previous };
}

/** Joins each order line with its product (cost, stock) and works out line totals. */
function createContext(orders, products) {
  const productMap = new Map();
  for (const p of products) {
    productMap.set(p.sku, {
      sku: p.sku,
      name: p.name || p.sku,
      cost: p.unit_cost == null ? null : Number(p.unit_cost),
      stock: p.stock_on_hand == null ? null : Number(p.stock_on_hand),
    });
  }
  const lines = orders.map((o) => {
    const p = productMap.get(o.sku);
    const qty = Number(o.quantity);
    const price = Number(o.unit_price);
    const discount = Number(o.discount || 0);
    const refund = Number(o.refund_amount || 0);
    const gross = qty * price;
    const cost = p && p.cost != null ? p.cost : null;
    return {
      date: o.order_date,
      order_id: o.order_id,
      sku: o.sku,
      name: (p && p.name !== p.sku ? p.name : null) || o.product_name || o.sku,
      qty,
      price,
      discount,
      refund,
      gross,
      net: gross - discount - refund,
      cost,
      cogs: cost == null ? null : qty * cost,
    };
  });
  const asOf = latestDate(orders);
  return { lines, productMap, asOf, earliest: earliestDate(orders), productCount: products.length };
}

const inRange = (lines, start, end) => lines.filter((l) => l.date >= start && l.date <= end);

function summarize(lines) {
  let gross = 0, discounts = 0, refunds = 0, net = 0, units = 0, revWithCost = 0, cogs = 0;
  const orderIds = new Set();
  const unknown = new Set();
  let hasCost = false;
  for (const l of lines) {
    gross += l.gross; discounts += l.discount; refunds += l.refund; net += l.net; units += l.qty;
    orderIds.add(l.order_id);
    if (l.cost == null) unknown.add(l.sku);
    else { hasCost = true; revWithCost += l.net; cogs += l.cogs; }
  }
  const orders = orderIds.size;
  const profit = revWithCost - cogs;
  return {
    gross_sales: r2(gross),
    discounts: r2(discounts),
    refunds: r2(refunds),
    net_revenue: r2(net),
    orders,
    units,
    aov: orders ? r2((gross - discounts) / orders) : 0,
    cogs: r2(cogs),
    revenue_with_cost: r2(revWithCost),
    profit: hasCost ? r2(profit) : null,
    margin_pct: hasCost && revWithCost > 0 ? r1((profit / revWithCost) * 100) : null,
    profit_coverage_pct: net > 0 ? r1((revWithCost / net) * 100) : null,
    unknown_cost_skus: [...unknown].sort(),
    lines: lines.length,
  };
}

const COMPARE_KEYS = ['net_revenue', 'profit', 'margin_pct', 'orders', 'units', 'aov', 'refunds', 'discounts', 'gross_sales'];

function compare(cur, prev) {
  const out = {};
  for (const k of COMPARE_KEYS) {
    const c = cur[k];
    const p = prev ? prev[k] : null;
    const both = c != null && p != null;
    out[k] = {
      current: c,
      previous: p,
      change: both ? r2(c - p) : null,
      // For margin the "change" is already in percentage points, so a percent-of-percent is not shown.
      change_pct: both && k !== 'margin_pct' && p !== 0 ? r1(((c - p) / Math.abs(p)) * 100) : null,
    };
  }
  return out;
}

function productBreakdown(lines) {
  const m = new Map();
  for (const l of lines) {
    let a = m.get(l.sku);
    if (!a) {
      a = { sku: l.sku, name: l.name, units: 0, gross: 0, discounts: 0, refunds: 0, net: 0, cogs: 0, unit_cost: l.cost, orderIds: new Set() };
      m.set(l.sku, a);
    }
    a.units += l.qty; a.gross += l.gross; a.discounts += l.discount; a.refunds += l.refund; a.net += l.net;
    if (l.cogs != null) a.cogs += l.cogs;
    a.orderIds.add(l.order_id);
  }
  const totalNet = [...m.values()].reduce((s, a) => s + a.net, 0);
  const rows = [...m.values()].map((a) => {
    const hasCost = a.unit_cost != null;
    const profit = hasCost ? a.net - a.cogs : null;
    return {
      sku: a.sku,
      name: a.name,
      units: a.units,
      orders: a.orderIds.size,
      gross_sales: r2(a.gross),
      discounts: r2(a.discounts),
      refunds: r2(a.refunds),
      net_revenue: r2(a.net),
      unit_cost: hasCost ? a.unit_cost : null,
      cogs: hasCost ? r2(a.cogs) : null,
      profit: profit == null ? null : r2(profit),
      margin_pct: hasCost && a.net > 0 ? r1((profit / a.net) * 100) : null,
      refund_rate_pct: a.gross > 0 ? r1((a.refunds / a.gross) * 100) : null,
      revenue_share_pct: totalNet > 0 ? r1((a.net / totalNet) * 100) : null,
    };
  });
  rows.sort((x, y) => y.net_revenue - x.net_revenue);
  return rows;
}

function trendSeries(lines, start, end) {
  const days = diffDays(start, end) + 1;
  const step = days <= 120 ? 1 : days <= 900 ? 7 : 30;
  const buckets = [];
  for (let i = 0; i < days; i += step) {
    buckets.push({ date: addDays(start, i), revenue: 0, profit: 0, orderIds: new Set(), hasCost: false });
  }
  for (const l of lines) {
    const i = Math.floor(diffDays(start, l.date) / step);
    if (i < 0 || i >= buckets.length) continue;
    const b = buckets[i];
    b.revenue += l.net;
    b.orderIds.add(l.order_id);
    if (l.cost != null) { b.profit += l.net - l.cogs; b.hasCost = true; }
  }
  return buckets.map((b) => ({
    date: b.date,
    revenue: r2(b.revenue),
    profit: b.hasCost ? r2(b.profit) : null,
    orders: b.orderIds.size,
  }));
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Products that sell at or above the median revenue of costed products but earn a thin margin. */
function lowMarginHighSales(breakdown, { marginThreshold = 20, limit = 10 } = {}) {
  const costed = breakdown.filter((p) => p.profit != null && p.net_revenue > 0);
  if (!costed.length) return [];
  const cutoff = median(costed.map((p) => p.net_revenue));
  return costed
    .filter((p) => p.net_revenue >= cutoff && p.margin_pct < marginThreshold)
    .sort((a, b) => b.net_revenue - a.net_revenue)
    .slice(0, limit);
}

function lossMaking(breakdown, limit = 10) {
  return breakdown.filter((p) => p.profit != null && p.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, limit);
}

function stockRisk(lines, productMap, asOf, { leadDays = 14, windowDays = 30, limit = 10 } = {}) {
  if (!asOf) return [];
  const start = addDays(asOf, -(windowDays - 1));
  const sold = new Map();
  for (const l of lines) {
    if (l.date >= start && l.date <= asOf) sold.set(l.sku, (sold.get(l.sku) || 0) + l.qty);
  }
  const out = [];
  for (const [sku, p] of productMap) {
    if (p.stock == null) continue;
    const units = sold.get(sku) || 0;
    if (units <= 0) continue;
    const velocity = units / windowDays;
    const cover = p.stock / velocity;
    if (cover >= leadDays) continue;
    out.push({
      sku,
      name: p.name,
      stock_on_hand: p.stock,
      units_sold_window: units,
      daily_velocity: r2(velocity),
      days_of_cover: r1(cover),
      stockout_date: addDays(asOf, Math.floor(cover)),
      severity: cover < leadDays / 2 ? 'critical' : 'warning',
    });
  }
  out.sort((a, b) => a.days_of_cover - b.days_of_cover);
  return out.slice(0, limit);
}

/** What moved revenue between the previous period and this one, by product. */
function revenueDrivers(curBreakdown, prevBreakdown, cur, prev) {
  const prevMap = new Map(prevBreakdown.map((p) => [p.sku, p]));
  const curMap = new Map(curBreakdown.map((p) => [p.sku, p]));
  const skus = new Set([...prevMap.keys(), ...curMap.keys()]);
  const rows = [];
  for (const sku of skus) {
    const c = curMap.get(sku);
    const p = prevMap.get(sku);
    rows.push({
      sku,
      name: (c || p).name,
      previous_revenue: p ? p.net_revenue : 0,
      current_revenue: c ? c.net_revenue : 0,
      change: r2((c ? c.net_revenue : 0) - (p ? p.net_revenue : 0)),
      previous_profit: p ? p.profit : null,
      current_profit: c ? c.profit : null,
    });
  }
  return {
    net_change: r2(cur.net_revenue - prev.net_revenue),
    orders_change: cur.orders - prev.orders,
    units_change: cur.units - prev.units,
    aov_change: r2(cur.aov - prev.aov),
    top_decreases: rows.filter((r) => r.change < 0).sort((a, b) => a.change - b.change).slice(0, 5),
    top_increases: rows.filter((r) => r.change > 0).sort((a, b) => b.change - a.change).slice(0, 5),
  };
}

const money = (value) => ({ value, type: 'money' });

/** The formulas and inputs behind each headline number, so the UI can show "how this was calculated". */
function buildExplain(cur) {
  return {
    net_revenue: {
      label: 'Net revenue',
      value: cur.net_revenue,
      type: 'money',
      formula: DEFINITIONS.net_revenue,
      inputs: [
        { label: 'Gross sales (quantity × unit price)', ...money(cur.gross_sales) },
        { label: 'Discounts', ...money(-cur.discounts) },
        { label: 'Refunds', ...money(-cur.refunds) },
      ],
    },
    profit: {
      label: 'Profit',
      value: cur.profit,
      type: 'money',
      formula: DEFINITIONS.profit,
      inputs: [
        { label: 'Net revenue of products with a unit cost', ...money(cur.revenue_with_cost) },
        { label: 'Cost of goods (quantity × unit cost)', ...money(-cur.cogs) },
      ],
      note: cur.profit_coverage_pct != null && cur.profit_coverage_pct < 100
        ? `Covers ${cur.profit_coverage_pct}% of net revenue. ${cur.unknown_cost_skus.length} product(s) have no unit cost and are left out.`
        : null,
    },
    margin: {
      label: 'Profit margin',
      value: cur.margin_pct,
      type: 'percent',
      formula: DEFINITIONS.margin,
      inputs: [
        { label: 'Profit', ...money(cur.profit) },
        { label: 'Net revenue of products with a unit cost', ...money(cur.revenue_with_cost) },
      ],
    },
    orders: {
      label: 'Orders',
      value: cur.orders,
      type: 'int',
      formula: 'Orders = number of distinct order IDs in the period.',
      inputs: [{ label: 'Order lines in the period', value: cur.lines, type: 'int' }],
    },
    aov: {
      label: 'Average order value',
      value: cur.aov,
      type: 'money',
      formula: DEFINITIONS.aov,
      inputs: [
        { label: 'Gross sales', ...money(cur.gross_sales) },
        { label: 'Discounts', ...money(-cur.discounts) },
        { label: 'Orders', value: cur.orders, type: 'int' },
      ],
    },
  };
}

/** Everything the dashboard needs for one date range. */
function overview(ctx, rangeKey, opts = {}) {
  const range = resolveRange(rangeKey, ctx.asOf, ctx.earliest);
  const curLines = inRange(ctx.lines, range.start, range.end);
  const prevLines = range.previous ? inRange(ctx.lines, range.previous.start, range.previous.end) : [];
  const cur = summarize(curLines);
  const prev = range.previous ? summarize(prevLines) : null;
  const products = productBreakdown(curLines);

  const warnings = [];
  if (ctx.productCount === 0) {
    warnings.push('No product costs uploaded yet, so profit and margin can not be calculated. Upload a products file to unlock them.');
  } else if (cur.profit_coverage_pct != null && cur.profit_coverage_pct < 100) {
    warnings.push(`Profit covers ${cur.profit_coverage_pct}% of net revenue. ${cur.unknown_cost_skus.length} product(s) in this period have no unit cost.`);
  }

  return {
    meta: {
      as_of: ctx.asOf,
      range,
      order_lines_in_range: curLines.length,
      warnings,
    },
    current: cur,
    previous: prev,
    deltas: compare(cur, prev),
    explain: buildExplain(cur),
    trend: trendSeries(curLines, range.start, range.end),
    products,
    low_margin: lowMarginHighSales(products, opts),
    loss_making: lossMaking(products),
    stock_risk: stockRisk(ctx.lines, ctx.productMap, ctx.asOf, opts),
    drivers: prev ? revenueDrivers(products, productBreakdown(prevLines), cur, prev) : null,
    definitions: DEFINITIONS,
  };
}

module.exports = {
  r1, r2, RANGE_KEYS, RANGE_LABELS, DEFINITIONS,
  latestDate, earliestDate, resolveRange, createContext, inRange, summarize, compare, productBreakdown,
  trendSeries, lowMarginHighSales, lossMaking, stockRisk, revenueDrivers, overview,
};
