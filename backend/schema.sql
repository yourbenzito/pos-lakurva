-- SQLite Schema for POS Minimarket
-- This matches the IndexedDB structure for seamless migration
-- Fecha de actualización: 20:01

CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    config JSON,
    createdAt TEXT,
    isActive INTEGER DEFAULT 1,
    plan TEXT DEFAULT 'basic',
    accessCode TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    cost REAL DEFAULT 0,
    costNeto REAL DEFAULT 0,
    markupPercent REAL DEFAULT 0,
    ivaType TEXT DEFAULT '19%',
    price REAL DEFAULT 0,
    stock REAL DEFAULT 0,
    minStock REAL DEFAULT 0,
    maxStock REAL DEFAULT 0,
    type TEXT DEFAULT 'unit',
    image TEXT,
    expiryDate TEXT,
    lastSoldAt TEXT,
    updatedAt TEXT,
    createdAt TEXT,
    isActive INTEGER DEFAULT 1,
    deletedAt TEXT,
    createdBy INTEGER,
    updatedBy INTEGER
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6b7280'
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    rut TEXT,
    address TEXT,
    creditLimit REAL,
    balanceCredit REAL DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT,
    isActive INTEGER DEFAULT 1,
    deletedAt TEXT,
    createdBy INTEGER,
    updatedBy INTEGER
);

CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    isActive INTEGER DEFAULT 1,
    deletedAt TEXT,
    createdBy INTEGER,
    updatedBy INTEGER
);

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saleNumber INTEGER,
    date TEXT NOT NULL,
    customerId INTEGER,
    items JSON,
    subtotal REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total REAL DEFAULT 0,
    paidAmount REAL DEFAULT 0,
    paymentMethod TEXT,
    paymentDetails JSON,
    status TEXT DEFAULT 'completed',
    cashRegisterId INTEGER,
    userId INTEGER,
    idempotencyKey TEXT,
    base_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    commission_amount REAL DEFAULT 0,
    updatedAt TEXT,
    createdBy INTEGER,
    updatedBy INTEGER
);

CREATE TABLE IF NOT EXISTS stockMovements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER,
    type TEXT,
    quantity REAL,
    reference TEXT,
    reason TEXT,
    date TEXT,
    cost_value REAL,
    sale_value REAL
);

CREATE TABLE IF NOT EXISTS cashRegisters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    openDate TEXT,
    closeDate TEXT,
    initialAmount REAL DEFAULT 0,
    finalAmount REAL DEFAULT 0,
    expectedAmount REAL DEFAULT 0,
    difference REAL DEFAULT 0,
    status TEXT DEFAULT 'open',
    observations TEXT,
    denominations JSON,
    paymentSummary JSON
);

CREATE TABLE IF NOT EXISTS cashMovements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashRegisterId INTEGER,
    type TEXT,
    amount REAL,
    description TEXT,
    date TEXT,
    paymentId INTEGER
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    phone TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    recoveryCode TEXT,
    recoveryCodeGeneratedAt TEXT
);

CREATE TABLE IF NOT EXISTS auditLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT,
    entityId INTEGER,
    action TEXT,
    summary TEXT,
    metadata JSON,
    timestamp TEXT,
    userId INTEGER,
    username TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSON
);

CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplierId INTEGER,
    date TEXT,
    documentType TEXT,
    invoiceNumber TEXT,
    invoiceDate TEXT,
    subtotal REAL DEFAULT 0,
    ivaAmount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    paidAmount REAL DEFAULT 0,
    dueDate TEXT,
    vatMode TEXT,
    items JSON,
    status TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    createdBy INTEGER,
    updatedBy INTEGER,
    business_id INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    amount REAL,
    description TEXT,
    date TEXT,
    cashRegisterId INTEGER
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saleId INTEGER,
    customerId INTEGER,
    amount REAL,
    paymentMethod TEXT,
    date TEXT,
    cashRegisterId INTEGER,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS customerCreditDeposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    amount REAL,
    paymentMethod TEXT,
    cashRegisterId INTEGER,
    date TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS customerCreditUses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    date TEXT,
    amount REAL,
    saleId INTEGER,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS productPriceHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER,
    oldPrice REAL,
    newPrice REAL,
    date TEXT,
    userId INTEGER
);

CREATE TABLE IF NOT EXISTS supplierPayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplierId INTEGER,
    purchaseId INTEGER,
    amount REAL,
    method TEXT,
    date TEXT,
    reference TEXT,
    notes TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    createdBy INTEGER,
    updatedBy INTEGER,
    business_id INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS saleReturns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saleId INTEGER,
    saleNumber INTEGER,
    date TEXT,
    items JSON,
    totalReturned REAL,
    reason TEXT,
    createdAt TEXT,
    createdBy INTEGER
);

CREATE TABLE IF NOT EXISTS passwordResets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    date TEXT,
    code TEXT,
    status TEXT
);
