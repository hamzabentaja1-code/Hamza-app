-- HamZa local-first SQLite schema (MAD amounts stored as integer centimes)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS business_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  ice TEXT NOT NULL DEFAULT '',
  rc TEXT NOT NULL DEFAULT '',
  if_number TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'MAD' CHECK (currency = 'MAD'),
  default_language TEXT NOT NULL DEFAULT 'ar' CHECK (default_language IN ('ar','fr')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_price_centimes INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_centimes >= 0),
  purchase_price_centimes INTEGER NOT NULL DEFAULT 0 CHECK (purchase_price_centimes >= 0),
  barcode TEXT NOT NULL DEFAULT '',
  image_uri TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'piece',
  is_service INTEGER NOT NULL DEFAULT 0 CHECK (is_service IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_reference ON products(reference);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','converted')),
  issue_date TEXT NOT NULL,
  valid_until TEXT NOT NULL DEFAULT '',
  subtotal_centimes INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_centimes >= 0),
  discount_centimes INTEGER NOT NULL DEFAULT 0 CHECK (discount_centimes >= 0),
  total_centimes INTEGER NOT NULL DEFAULT 0 CHECK (total_centimes >= 0),
  currency TEXT NOT NULL DEFAULT 'MAD' CHECK (currency = 'MAD'),
  notes TEXT NOT NULL DEFAULT '',
  converted_document_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_date ON quotes(customer_id, issue_date);

CREATE TABLE IF NOT EXISTS quote_lines (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity_milli INTEGER NOT NULL CHECK (quantity_milli > 0),
  unit_price_centimes INTEGER NOT NULL CHECK (unit_price_centimes >= 0),
  discount_centimes INTEGER NOT NULL DEFAULT 0 CHECK (discount_centimes >= 0),
  line_total_centimes INTEGER NOT NULL CHECK (line_total_centimes >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines(quote_id);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('order','delivery','invoice','proforma','credit_note','purchase','receipt')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','partially_paid','paid','cancelled')),
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  source_quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL,
  source_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL DEFAULT '',
  subtotal_centimes INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_centimes >= 0),
  discount_centimes INTEGER NOT NULL DEFAULT 0 CHECK (discount_centimes >= 0),
  total_centimes INTEGER NOT NULL DEFAULT 0 CHECK (total_centimes >= 0),
  paid_centimes INTEGER NOT NULL DEFAULT 0 CHECK (paid_centimes >= 0 AND paid_centimes <= total_centimes),
  currency TEXT NOT NULL DEFAULT 'MAD' CHECK (currency = 'MAD'),
  notes TEXT NOT NULL DEFAULT '',
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_customer_date ON documents(customer_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_documents_supplier_date ON documents(supplier_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_documents_type_status ON documents(type, status);

CREATE TABLE IF NOT EXISTS document_lines (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity_milli INTEGER NOT NULL CHECK (quantity_milli > 0),
  unit_price_centimes INTEGER NOT NULL CHECK (unit_price_centimes >= 0),
  line_total_centimes INTEGER NOT NULL CHECK (line_total_centimes >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_document_lines_document ON document_lines(document_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  method TEXT NOT NULL CHECK (method IN ('cash','bank_transfer','cheque','card','other')),
  amount_centimes INTEGER NOT NULL CHECK (amount_centimes > 0),
  payment_date TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  amount_centimes INTEGER NOT NULL CHECK (amount_centimes > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(payment_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_allocations_document ON payment_allocations(document_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase','delivery','sale','return_in','return_out','adjustment','transfer_in','transfer_out')),
  quantity_milli INTEGER NOT NULL CHECK (quantity_milli <> 0),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_id, product_id, movement_type)
);
CREATE INDEX IF NOT EXISTS idx_stock_product_warehouse ON stock_movements(product_id, warehouse_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_source ON stock_movements(source_type, source_id);
