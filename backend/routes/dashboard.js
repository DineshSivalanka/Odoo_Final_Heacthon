const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/dashboard — full summary
router.get('/', async (req, res) => {
  try {
    const [
      productCount,
      stockSummary,
      salesSummary,
      purchaseSummary,
      mfgSummary,
      recentSales,
      recentPurchases,
      lowStockProducts,
      stockLedger
    ] = await Promise.all([

      // Total products
      pool.query('SELECT COUNT(*) as total FROM products'),

      // Stock value
      pool.query(`
        SELECT
          SUM(on_hand_qty) as total_units,
          SUM(on_hand_qty * cost_price) as stock_value,
          SUM(reserved_qty) as reserved_units
        FROM products
      `),

      // Sales summary
      pool.query(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
          COUNT(*) FILTER (WHERE status = 'CONFIRMED') as confirmed,
          COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled
        FROM sales_orders
      `),

      // Purchase summary
      pool.query(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
          COUNT(*) FILTER (WHERE status = 'CONFIRMED') as confirmed,
          COUNT(*) FILTER (WHERE status = 'RECEIVED') as received,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled
        FROM purchase_orders
      `),

      // Manufacturing summary
      pool.query(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'DRAFT') as draft,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled
        FROM manufacturing_orders
      `),

      // Recent 5 sales orders
      pool.query(`
        SELECT so.id, so.customer_name, so.status, so.created_at,
          COALESCE(SUM(soi.quantity * p.sales_price), 0) as total_value
        FROM sales_orders so
        LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id
        LEFT JOIN products p ON p.id = soi.product_id
        GROUP BY so.id ORDER BY so.created_at DESC LIMIT 5
      `),

      // Recent 5 purchase orders
      pool.query(`
        SELECT po.id, po.vendor_name, po.status, po.created_at,
          COALESCE(SUM(poi.quantity * p.cost_price), 0) as total_value
        FROM purchase_orders po
        LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
        LEFT JOIN products p ON p.id = poi.product_id
        GROUP BY po.id ORDER BY po.created_at DESC LIMIT 5
      `),

      // Low stock products (on_hand_qty <= 10)
      pool.query(`
        SELECT id, name, on_hand_qty, reserved_qty
        FROM products
        WHERE on_hand_qty <= 10
        ORDER BY on_hand_qty ASC
        LIMIT 10
      `),

      // Recent stock movements
      pool.query(`
        SELECT sl.*, p.name as product_name
        FROM stock_ledger sl JOIN products p ON p.id = sl.product_id
        ORDER BY sl.created_at DESC LIMIT 10
      `)
    ]);

    res.json({
      products: {
        total: parseInt(productCount.rows[0].total),
        ...stockSummary.rows[0]
      },
      sales: salesSummary.rows[0],
      purchase: purchaseSummary.rows[0],
      manufacturing: mfgSummary.rows[0],
      recent_sales: recentSales.rows,
      recent_purchases: recentPurchases.rows,
      low_stock: lowStockProducts.rows,
      recent_stock_movements: stockLedger.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/inventory — full inventory list
router.get('/inventory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.name, p.procurement_type, p.procurement_strategy,
        p.on_hand_qty, p.reserved_qty,
        (p.on_hand_qty - p.reserved_qty) as available_qty,
        p.cost_price, p.sales_price,
        (p.on_hand_qty * p.cost_price) as stock_value
      FROM products p
      ORDER BY p.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/stock-ledger — full stock ledger
router.get('/stock-ledger', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sl.*, p.name as product_name
      FROM stock_ledger sl JOIN products p ON p.id = sl.product_id
      ORDER BY sl.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
