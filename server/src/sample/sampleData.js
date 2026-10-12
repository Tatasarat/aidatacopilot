'use strict';
const { addDays } = require('../analytics/dates');

/** Small deterministic random generator, so the demo store looks the same every time. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS = [
  { sku: 'WALLET-01', name: 'Leather Bifold Wallet', price: 1499, cost: 620, stock: 140, weight: 22 },
  { sku: 'BOTTLE-02', name: 'Bamboo Water Bottle', price: 799, cost: 310, stock: 60, weight: 16 },
  { sku: 'TOTE-03', name: 'Canvas Tote Bag', price: 499, cost: 190, stock: 220, weight: 14 },
  { sku: 'CANDLE-04', name: 'Soy Candle Trio', price: 899, cost: 640, stock: 180, weight: 30 },
  { sku: 'MUG-05', name: 'Ceramic Mug Set', price: 1199, cost: 480, stock: 45, weight: 10 },
  { sku: 'MAT-06', name: 'Cork Yoga Mat', price: 1999, cost: 900, stock: 9, weight: 8 },
  { sku: 'STAND-07', name: 'Aluminium Phone Stand', price: 599, cost: 210, stock: 300, weight: 9 },
  { sku: 'TEA-08', name: 'Herbal Tea Sampler', price: 699, cost: null, stock: 75, weight: 7 }, // cost missing on purpose
];

/**
 * Builds ~120 days of orders ending on `today` (YYYY-MM-DD). The story baked in:
 *  - Leather wallet sales slow down in the last 30 days (revenue falls)
 *  - Soy candles run a heavy discount in the last 30 days (high sales, thin margin)
 *  - Ceramic mugs have a high refund rate
 *  - The yoga mat is almost out of stock
 *  - The tea sampler has no unit cost, so profit coverage is below 100%
 */
function generateSample(today, days = 120) {
  const rand = mulberry32(20260311);
  const orders = [];
  let orderNo = 1000;

  for (let back = days - 1; back >= 0; back -= 1) {
    const date = addDays(today, -back);
    const recent = back < 30;
    const ordersToday = 6 + Math.floor(rand() * 5);

    for (let i = 0; i < ordersToday; i += 1) {
      orderNo += 1;
      const linesInOrder = rand() < 0.3 ? 2 : 1;
      const used = new Set();
      for (let l = 0; l < linesInOrder; l += 1) {
        const weights = PRODUCTS.map((p) => (p.sku === 'WALLET-01' && recent ? p.weight * 0.45 : p.weight));
        const total = weights.reduce((s, w) => s + w, 0);
        let pick = rand() * total;
        let idx = 0;
        while (idx < weights.length - 1 && pick > weights[idx]) { pick -= weights[idx]; idx += 1; }
        const p = PRODUCTS[idx];
        if (used.has(p.sku)) continue;
        used.add(p.sku);

        const quantity = 1 + (rand() < 0.25 ? 1 : 0) + (rand() < 0.07 ? 1 : 0);
        const gross = quantity * p.price;
        let discount = 0;
        if (p.sku === 'CANDLE-04' && recent) discount = Math.round(gross * 0.18);
        else if (rand() < 0.12) discount = Math.round(gross * 0.1);

        let refund = 0;
        const refundChance = p.sku === 'MUG-05' ? 0.14 : 0.02;
        if (rand() < refundChance) refund = gross - discount;

        orders.push({
          order_id: `SP-${orderNo}`,
          order_date: date,
          sku: p.sku,
          product_name: p.name,
          quantity,
          unit_price: p.price,
          discount,
          refund_amount: refund,
        });
      }
    }
  }

  const products = PRODUCTS.map((p) => ({
    sku: p.sku,
    name: p.name,
    unit_cost: p.cost,
    stock_on_hand: p.stock,
  }));
  return { orders, products };
}

module.exports = { generateSample };
