'use strict';
const { pool, withTx } = require('../db/postgres');

const CHUNK = 5000;

async function loadData(userId) {
  const [o, p] = await Promise.all([
    pool.query(
      `SELECT order_id, to_char(order_date, 'YYYY-MM-DD') AS order_date, sku, product_name,
              quantity, unit_price::float8 AS unit_price, discount::float8 AS discount, refund_amount::float8 AS refund_amount
       FROM shop_orders WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT sku, name, unit_cost::float8 AS unit_cost, stock_on_hand FROM shop_products WHERE user_id = $1`,
      [userId]
    ),
  ]);
  return { orders: o.rows, products: p.rows };
}

async function insertOrders(db, userId, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const c = rows.slice(i, i + CHUNK);
    await db.query(
      `INSERT INTO shop_orders (user_id, order_id, order_date, sku, product_name, quantity, unit_price, discount, refund_amount)
       SELECT $1, * FROM UNNEST($2::text[], $3::date[], $4::text[], $5::text[], $6::int[], $7::numeric[], $8::numeric[], $9::numeric[])`,
      [
        userId,
        c.map((r) => r.order_id), c.map((r) => r.order_date), c.map((r) => r.sku), c.map((r) => r.product_name),
        c.map((r) => r.quantity), c.map((r) => r.unit_price), c.map((r) => r.discount), c.map((r) => r.refund_amount),
      ]
    );
  }
}

async function insertProducts(db, userId, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const c = rows.slice(i, i + CHUNK);
    await db.query(
      `INSERT INTO shop_products (user_id, sku, name, unit_cost, stock_on_hand)
       SELECT $1, * FROM UNNEST($2::text[], $3::text[], $4::numeric[], $5::int[])
       ON CONFLICT (user_id, sku) DO UPDATE
         SET name = EXCLUDED.name, unit_cost = EXCLUDED.unit_cost, stock_on_hand = EXCLUDED.stock_on_hand`,
      [userId, c.map((r) => r.sku), c.map((r) => r.name), c.map((r) => r.unit_cost), c.map((r) => r.stock_on_hand)]
    );
  }
}

/** Replaces this user's orders or products with the new rows, all or nothing. */
async function replaceData(userId, kind, rows, meta = {}) {
  await withTx(async (db) => {
    if (kind === 'orders') {
      await db.query('DELETE FROM shop_orders WHERE user_id = $1', [userId]);
      await insertOrders(db, userId, rows);
    } else {
      await db.query('DELETE FROM shop_products WHERE user_id = $1', [userId]);
      await insertProducts(db, userId, rows);
    }
    if (meta.fileName !== undefined) {
      await db.query(
        'INSERT INTO data_uploads (user_id, kind, file_name, rows_accepted, rows_rejected) VALUES ($1, $2, $3, $4, $5)',
        [userId, kind, meta.fileName, rows.length, meta.rejected || 0]
      );
    }
  });
}

async function replaceBoth(userId, orders, products, fileName) {
  await withTx(async (db) => {
    await db.query('DELETE FROM shop_orders WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM shop_products WHERE user_id = $1', [userId]);
    await insertOrders(db, userId, orders);
    await insertProducts(db, userId, products);
    await db.query(
      'INSERT INTO data_uploads (user_id, kind, file_name, rows_accepted, rows_rejected) VALUES ($1, $2, $3, $4, 0)',
      [userId, 'sample', fileName, orders.length + products.length]
    );
  });
}

async function deleteAll(userId) {
  await withTx(async (db) => {
    await db.query('DELETE FROM shop_orders WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM shop_products WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM ask_history WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM data_uploads WHERE user_id = $1', [userId]);
  });
}

async function status(userId) {
  const [o, p, u] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS lines, COUNT(DISTINCT order_id)::int AS orders,
              to_char(MIN(order_date), 'YYYY-MM-DD') AS first_date, to_char(MAX(order_date), 'YYYY-MM-DD') AS last_date,
              COUNT(DISTINCT sku)::int AS skus
       FROM shop_orders WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS products, COUNT(unit_cost)::int AS with_cost, COUNT(stock_on_hand)::int AS with_stock
       FROM shop_products WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT kind, file_name, rows_accepted, rows_rejected, created_at FROM data_uploads
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    ),
  ]);
  const unmatched = await pool.query(
    `SELECT COUNT(DISTINCT o.sku)::int AS n FROM shop_orders o
     LEFT JOIN shop_products p ON p.user_id = o.user_id AND p.sku = o.sku
     WHERE o.user_id = $1 AND (p.sku IS NULL OR p.unit_cost IS NULL)`,
    [userId]
  );
  return {
    orders: o.rows[0],
    products: p.rows[0],
    skus_without_cost: unmatched.rows[0].n,
    recent_uploads: u.rows,
  };
}

async function saveHistory(userId, question, intent, answer) {
  await pool.query(
    'INSERT INTO ask_history (user_id, question, intent, answer) VALUES ($1, $2, $3, $4)',
    [userId, question.slice(0, 300), intent, (answer || '').slice(0, 1000)]
  );
}

async function recentHistory(userId, limit = 15) {
  const { rows } = await pool.query(
    'SELECT id, question, intent, answer, created_at FROM ask_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return rows;
}

module.exports = { loadData, replaceData, replaceBoth, deleteAll, status, saveHistory, recentHistory };
