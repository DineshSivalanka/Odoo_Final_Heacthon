const pool = require('../db');

/**
 * Automates the fulfillment of a single product.
 * If there isn't enough stock, it recursively manufactures or purchases it.
 * @param {Object} client - Postgres client (inside a transaction)
 * @param {number} productId - Product ID to fulfill
 * @param {number} requiredQty - Amount of product needed
 */
async function fulfillProduct(client, productId, requiredQty) {
  // Check current stock
  const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
  if (prodRes.rows.length === 0) throw new Error(`Product ID ${productId} not found`);
  const product = prodRes.rows[0];

  const available = product.on_hand_qty - product.reserved_qty;
  if (available >= requiredQty) {
    // We already have enough, nothing to do
    return;
  }

  // Calculate shortfall
  const shortfall = requiredQty - available;

  if (product.procurement_type === 'PURCHASE') {
    // ----------------------------------------------------
    // PURCHASE WORKFLOW
    // ----------------------------------------------------
    // 1. Create Purchase Order
    const poRes = await client.query(
      "INSERT INTO purchase_orders (vendor_name, status) VALUES ('Automated Vendor', 'RECEIVED') RETURNING id"
    );
    const poId = poRes.rows[0].id;
    await client.query(
      'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity) VALUES ($1, $2, $3)',
      [poId, productId, shortfall]
    );

    // 2. Receive Goods (Update Inventory)
    await client.query(
      'UPDATE products SET on_hand_qty = on_hand_qty + $1 WHERE id = $2',
      [shortfall, productId]
    );

    // 3. Log to Stock Ledger
    await client.query(
      'INSERT INTO stock_ledger (product_id, change_qty, reason, reference_id) VALUES ($1, $2, $3, $4)',
      [productId, shortfall, 'Automated Purchase Receipt', poId]
    );

    console.log(`[ORCHESTRATOR] Auto-Purchased & Received ${shortfall} x ${product.name} (PO: ${poId})`);
  } else if (product.procurement_type === 'MANUFACTURING') {
    // ----------------------------------------------------
    // MANUFACTURING WORKFLOW
    // ----------------------------------------------------
    // 1. Check BoM
    const bomRes = await client.query('SELECT id FROM bom WHERE product_id = $1', [productId]);
    if (bomRes.rows.length === 0) {
      throw new Error(`Cannot manufacture ${product.name}: No Bill of Materials defined.`);
    }
    const bomId = bomRes.rows[0].id;

    // 2. Ensure all raw materials exist (Recursion!)
    const components = await client.query('SELECT * FROM bom_components WHERE bom_id = $1', [bomId]);
    for (const comp of components.rows) {
      const neededRawQty = comp.quantity * shortfall;
      await fulfillProduct(client, comp.component_id, neededRawQty);

      // Now we have the raw materials, consume them
      await client.query(
        'UPDATE products SET on_hand_qty = on_hand_qty - $1 WHERE id = $2',
        [neededRawQty, comp.component_id]
      );
      // Log consumption
      await client.query(
        'INSERT INTO stock_ledger (product_id, change_qty, reason) VALUES ($1, $2, $3)',
        [comp.component_id, -neededRawQty, 'Automated MO Consumption']
      );
    }

    // 3. Create & Complete MO
    const moRes = await client.query(
      "INSERT INTO manufacturing_orders (product_id, quantity, status, start_date, end_date) VALUES ($1, $2, 'COMPLETED', NOW(), NOW()) RETURNING id",
      [productId, shortfall]
    );
    const moId = moRes.rows[0].id;

    // Update raw materials ledger with reference to this new MO ID
    await client.query(
      "UPDATE stock_ledger SET reference_id = $1 WHERE reason = 'Automated MO Consumption' AND reference_id IS NULL",
      [moId]
    );

    // 4. Produce Finished Good (Update Inventory)
    await client.query(
      'UPDATE products SET on_hand_qty = on_hand_qty + $1 WHERE id = $2',
      [shortfall, productId]
    );

    // 5. Log Production to Ledger
    await client.query(
      'INSERT INTO stock_ledger (product_id, change_qty, reason, reference_id) VALUES ($1, $2, $3, $4)',
      [productId, shortfall, 'Automated MO Output', moId]
    );

    console.log(`[ORCHESTRATOR] Auto-Manufactured ${shortfall} x ${product.name} (MO: ${moId})`);
  }
}

/**
 * Automates the fulfillment, confirmation, and delivery of a Sales Order.
 * @param {number} salesOrderId
 */
async function autoProcessSalesOrder(salesOrderId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [salesOrderId]);
    if (orderRes.rows.length === 0) throw new Error('Sales Order not found');
    const order = orderRes.rows[0];

    if (order.status !== 'DRAFT' && order.status !== 'CONFIRMED') {
        throw new Error('Order is already processed or cancelled.');
    }

    const items = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [salesOrderId]);

    // 1. Fulfill all items (this guarantees stock will be available)
    for (const item of items.rows) {
      await fulfillProduct(client, item.product_id, item.quantity);
    }

    // 2. Deliver all items (consume finished stock)
    for (const item of items.rows) {
        // Since we either had the stock or just magically manufactured/purchased it, we can safely deduct.
        await client.query(
            'UPDATE products SET on_hand_qty = on_hand_qty - $1 WHERE id = $2',
            [item.quantity, item.product_id]
        );
        // Log Delivery
        await client.query(
            'INSERT INTO stock_ledger (product_id, change_qty, reason, reference_id) VALUES ($1, $2, $3, $4)',
            [item.product_id, -item.quantity, 'Automated Sales Delivery', salesOrderId]
        );
    }

    // 3. Mark SO as DELIVERED
    await client.query("UPDATE sales_orders SET status = 'DELIVERED' WHERE id = $1", [salesOrderId]);

    await client.query('COMMIT');
    console.log(`[ORCHESTRATOR] Sales Order ${salesOrderId} fully processed and DELIVERED.`);
    return { success: true, message: 'Fully automated fulfillment successful' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ORCHESTRATOR ERROR]', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { autoProcessSalesOrder };
