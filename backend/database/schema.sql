-- ============================================================
-- Mini ERP System — PostgreSQL Schema
-- Shiv Furniture Works
-- ============================================================

-- ───────────────────────────────────────────
-- ENUMS (custom types)
-- ───────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'
);

CREATE TYPE procurement_type AS ENUM ('PURCHASE', 'MANUFACTURING');

CREATE TYPE procurement_strategy AS ENUM ('MTS', 'MTO');

CREATE TYPE order_status AS ENUM (
  'DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'RECEIVED', 'COMPLETED', 'CANCELLED'
);

-- ───────────────────────────────────────────
-- USERS
-- ───────────────────────────────────────────

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,
  role       user_role     NOT NULL DEFAULT 'SALES',
  created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- PRODUCTS
-- ───────────────────────────────────────────

CREATE TABLE products (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(200)         NOT NULL UNIQUE,
  description          TEXT,
  sales_price          NUMERIC(12,2)        NOT NULL DEFAULT 0,
  cost_price           NUMERIC(12,2)        NOT NULL DEFAULT 0,
  on_hand_qty          INTEGER              NOT NULL DEFAULT 0,
  reserved_qty         INTEGER              NOT NULL DEFAULT 0,
  procurement_type     procurement_type     NOT NULL DEFAULT 'PURCHASE',
  procurement_strategy procurement_strategy NOT NULL DEFAULT 'MTS',
  created_at           TIMESTAMP            NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- BILL OF MATERIALS (BoM)
-- ───────────────────────────────────────────

CREATE TABLE bom (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER   NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE bom_components (
  id           SERIAL PRIMARY KEY,
  bom_id       INTEGER NOT NULL REFERENCES bom(id) ON DELETE CASCADE,
  component_id INTEGER NOT NULL REFERENCES products(id),
  quantity     INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE bom_operations (
  id             SERIAL PRIMARY KEY,
  bom_id         INTEGER      NOT NULL REFERENCES bom(id) ON DELETE CASCADE,
  operation_name VARCHAR(200) NOT NULL,
  duration       INTEGER      NOT NULL CHECK (duration > 0)  -- in minutes
);

-- ───────────────────────────────────────────
-- SALES ORDERS
-- ───────────────────────────────────────────

CREATE TABLE sales_orders (
  id            SERIAL PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL,
  status        order_status NOT NULL DEFAULT 'DRAFT',
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_order_items (
  id             SERIAL PRIMARY KEY,
  sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  quantity       INTEGER NOT NULL CHECK (quantity > 0)
);

-- ───────────────────────────────────────────
-- PURCHASE ORDERS
-- ───────────────────────────────────────────

CREATE TABLE purchase_orders (
  id          SERIAL PRIMARY KEY,
  vendor_name VARCHAR(200) NOT NULL,
  status      order_status NOT NULL DEFAULT 'DRAFT',
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        INTEGER NOT NULL REFERENCES products(id),
  quantity          INTEGER NOT NULL CHECK (quantity > 0)
);

-- ───────────────────────────────────────────
-- MANUFACTURING ORDERS
-- ───────────────────────────────────────────

CREATE TABLE manufacturing_orders (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER      NOT NULL REFERENCES products(id),
  quantity   INTEGER      NOT NULL CHECK (quantity > 0),
  status     order_status NOT NULL DEFAULT 'DRAFT',
  start_date TIMESTAMP,
  end_date   TIMESTAMP,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- STOCK LEDGER (every stock movement logged)
-- ───────────────────────────────────────────

CREATE TABLE stock_ledger (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER      NOT NULL REFERENCES products(id),
  change_qty   INTEGER      NOT NULL,           -- positive = in, negative = out
  reason       VARCHAR(200) NOT NULL,
  reference_id INTEGER,                         -- links to sales/purchase/MO id
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- AUDIT LOG
-- ───────────────────────────────────────────

CREATE TABLE audit_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER,
  action     VARCHAR(200) NOT NULL,
  details    TEXT         NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────
-- INDEXES (for faster queries)
-- ───────────────────────────────────────────

CREATE INDEX idx_products_name          ON products(name);
CREATE INDEX idx_sales_orders_status    ON sales_orders(status);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_mfg_orders_status      ON manufacturing_orders(status);
CREATE INDEX idx_stock_ledger_product   ON stock_ledger(product_id);
CREATE INDEX idx_stock_ledger_date      ON stock_ledger(created_at);

-- ───────────────────────────────────────────
-- AUTO-UPDATE updated_at trigger
-- ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_mfg_orders_updated_at
  BEFORE UPDATE ON manufacturing_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ───────────────────────────────────────────
-- DEFAULT ADMIN USER (password: admin123)
-- Change this password after first login!
-- ───────────────────────────────────────────

INSERT INTO users (name, email, password, role)
VALUES (
  'Admin',
  'admin@shivfurniture.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt of "admin123"
  'ADMIN'
);

-- ============================================================
-- DONE — All tables created successfully!
-- ============================================================
