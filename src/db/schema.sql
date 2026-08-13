-- Table: users (Admin & User Authentication)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'ADMIN',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: units (Master Data Satuan)
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: products (Master Data Produk)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL DEFAULT 0,
    unit_id INTEGER,
    unit_name TEXT NOT NULL DEFAULT 'PCS',
    brand TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- Table: customers (Master Data Customer)
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: orders (Master Header Transaksi / Order)
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE, -- Empty or DRAFT-ID while draft, generated on FINAL
    order_date TEXT NOT NULL,
    due_date TEXT,
    po_number TEXT,
    ref_number TEXT,
    customer_id INTEGER,
    customer_name_snapshot TEXT NOT NULL,
    customer_company_snapshot TEXT,
    customer_address_snapshot TEXT,
    customer_phone_snapshot TEXT,
    sender_info TEXT DEFAULT '',
    recipient_info TEXT,
    total_amount REAL DEFAULT 0,
    notes TEXT DEFAULT 'Barang yang sudah dibeli tidak dapat ditukar atau di kembalikan',
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'FINAL', 'CANCELLED'
    invoice_pdf_path TEXT,
    surat_jalan_pdf_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Table: order_items (Detail Barang Transaksi dengan Snapshot Data)
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_code_snapshot TEXT,
    product_name_snapshot TEXT NOT NULL,
    price_snapshot REAL NOT NULL DEFAULT 0,
    unit_snapshot TEXT NOT NULL DEFAULT 'PCS',
    brand TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    subtotal REAL GENERATED ALWAYS AS (price_snapshot * quantity) STORED,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Table: invoice_sequence (Penomoran Otomatis Invoice)
CREATE TABLE IF NOT EXISTS invoice_sequence (
    prefix TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix, year, month)
);
