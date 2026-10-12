'use strict';
/**
 * The only questions the AI is allowed to "ask" of your data. Each intent maps to a tested function
 * in metrics.js. The AI chooses an intent and a range; it never writes SQL or does arithmetic.
 */
const m = require('./metrics');

const INTENT_KEYS = [
  'summary',
  'top_profit_products',
  'worst_products',
  'low_margin_high_sales',
  'stock_risk',
  'revenue_change',
  'refunds',
];

const col = (key, label, type = 'text') => ({ key, label, type });

const PRODUCT_COLS = [
  col('name', 'Product'), col('units', 'Units', 'int'), col('net_revenue', 'Net revenue', 'money'),
  col('profit', 'Profit', 'money'), col('margin_pct', 'Margin', 'percent'),
];

function run(plan, ctx) {
  const range = m.resolveRange(plan.range, ctx.asOf, ctx.earliest);
  const ov = m.overview(ctx, range.key);
  const limit = plan.limit || 5;
  const base = {
    intent: plan.intent,
    range: { key: range.key, label: range.label, start: range.start, end: range.end },
    evidence: {
      period: { start: range.start, end: range.end },
      previous_period: range.previous,
      order_lines_used: ov.meta.order_lines_in_range,
      as_of: ctx.asOf,
      definitions: [],
      notes: [...ov.meta.warnings],
    },
  };
  const defs = (...keys) => keys.map((k) => m.DEFINITIONS[k]);

  switch (plan.intent) {
    case 'summary': {
      const metricRows = [
        ['Net revenue', 'net_revenue', 'money'], ['Profit', 'profit', 'money'], ['Margin', 'margin_pct', 'percent'],
        ['Orders', 'orders', 'int'], ['Average order value', 'aov', 'money'], ['Refunds', 'refunds', 'money'],
        ['Discounts', 'discounts', 'money'],
      ].map(([label, key, type]) => ({
        metric: label, type,
        current: ov.deltas[key].current, previous: ov.deltas[key].previous, change_pct: ov.deltas[key].change_pct,
      }));
      return {
        ...base,
        title: 'Store summary',
        columns: [col('metric', 'Metric'), col('current', 'This period', 'auto'), col('previous', 'Previous period', 'auto'), col('change_pct', 'Change', 'percent')],
        rows: metricRows,
        facts: { current: ov.current, previous: ov.previous, deltas: ov.deltas },
        chart: { type: 'line', title: 'Daily net revenue and profit', series: ov.trend },
        evidence: { ...base.evidence, definitions: defs('net_revenue', 'profit', 'margin', 'aov') },
      };
    }
    case 'top_profit_products': {
      const rows = ov.products.filter((p) => p.profit != null).sort((a, b) => b.profit - a.profit).slice(0, limit);
      return {
        ...base,
        title: 'Most profitable products',
        columns: PRODUCT_COLS,
        rows,
        chart: { type: 'bar', title: 'Profit by product', labelKey: 'name', valueKey: 'profit', valueType: 'money' },
        empty_reason: 'No products with a known unit cost sold in this period. Upload product costs to see profit.',
        evidence: { ...base.evidence, definitions: defs('net_revenue', 'profit', 'cogs') },
      };
    }
    case 'worst_products': {
      const rows = ov.products.filter((p) => p.profit != null).sort((a, b) => a.profit - b.profit).slice(0, limit);
      return {
        ...base,
        title: 'Least profitable products',
        columns: PRODUCT_COLS,
        rows,
        chart: { type: 'bar', title: 'Profit by product', labelKey: 'name', valueKey: 'profit', valueType: 'money' },
        empty_reason: 'No products with a known unit cost sold in this period. Upload product costs to see profit.',
        evidence: { ...base.evidence, definitions: defs('net_revenue', 'profit', 'cogs') },
      };
    }
    case 'low_margin_high_sales': {
      const rows = ov.low_margin.slice(0, limit);
      return {
        ...base,
        title: 'High sales, low margin',
        columns: PRODUCT_COLS,
        rows,
        chart: { type: 'bar', title: 'Margin by product', labelKey: 'name', valueKey: 'margin_pct', valueType: 'percent' },
        empty_reason: 'No product combines above-median sales with a margin under 20% in this period.',
        evidence: {
          ...base.evidence,
          definitions: [...defs('margin'), 'High sales = net revenue at or above the median of products with a unit cost. Low margin = under 20%.'],
        },
      };
    }
    case 'stock_risk': {
      const rows = ov.stock_risk.slice(0, limit);
      return {
        ...base,
        title: 'Products that may run out',
        columns: [
          col('name', 'Product'), col('stock_on_hand', 'In stock', 'int'), col('daily_velocity', 'Sold per day', 'decimal'),
          col('days_of_cover', 'Days left', 'days'), col('stockout_date', 'Runs out around', 'date'),
        ],
        rows,
        chart: { type: 'bar', title: 'Days of stock left', labelKey: 'name', valueKey: 'days_of_cover', valueType: 'days' },
        empty_reason: 'No product is projected to run out within 14 days, or stock levels have not been uploaded.',
        evidence: { ...base.evidence, definitions: [...defs('cover'), 'A product is flagged when it has under 14 days of cover.'] },
      };
    }
    case 'revenue_change': {
      if (!ov.drivers) {
        return { ...base, title: 'What changed', columns: [], rows: [], empty_reason: 'Pick a period other than "all time" to compare against an earlier one.' };
      }
      const d = ov.drivers;
      const rows = [...d.top_decreases, ...d.top_increases].sort((a, b) => a.change - b.change).slice(0, limit * 2);
      return {
        ...base,
        title: 'What moved revenue',
        columns: [
          col('name', 'Product'), col('previous_revenue', 'Previous', 'money'), col('current_revenue', 'This period', 'money'), col('change', 'Change', 'money'),
        ],
        rows,
        facts: { net_change: d.net_change, orders_change: d.orders_change, units_change: d.units_change, aov_change: d.aov_change },
        chart: { type: 'bar', title: 'Revenue change by product', labelKey: 'name', valueKey: 'change', valueType: 'money' },
        empty_reason: 'No product changed revenue between the two periods.',
        evidence: { ...base.evidence, definitions: defs('net_revenue', 'aov') },
      };
    }
    case 'refunds': {
      const rows = ov.products.filter((p) => p.refunds > 0).sort((a, b) => b.refunds - a.refunds).slice(0, limit);
      return {
        ...base,
        title: 'Refunds by product',
        columns: [
          col('name', 'Product'), col('units', 'Units', 'int'), col('gross_sales', 'Gross sales', 'money'),
          col('refunds', 'Refunded', 'money'), col('refund_rate_pct', 'Refund rate', 'percent'),
        ],
        rows,
        chart: { type: 'bar', title: 'Refunded amount', labelKey: 'name', valueKey: 'refunds', valueType: 'money' },
        empty_reason: 'No refunds were recorded in this period.',
        evidence: { ...base.evidence, definitions: defs('refund_rate') },
      };
    }
    default:
      return { ...base, intent: 'unsupported', title: 'Not supported', columns: [], rows: [] };
  }
}

module.exports = { INTENT_KEYS, run };
