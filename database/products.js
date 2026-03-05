const { getDb } = require('./connection');

/**
 * Creates the products table if it doesn't exist.
 * @returns {Promise<void>}
 */
function initProductsTable() {
  return new Promise((resolve, reject) => {
    const db = getDb();
    // 'precio' and 'stock' can now be NULL or default to 0.
    // However, SQLite ALTER TABLE support is limited.
    // For existing tables with NOT NULL constraints, we'd typically need migration scripts.
    // Since this is a dev/local app, we will use IF NOT EXISTS with DEFAULT values 
    // for new setups, but we must handle the schema mismatch if the table exists.
    //
    // Best practice for SQLite schema evolution without complex migration:
    // We assume the schema might be strict. We'll try to ALTER it to remove NOT NULL 
    // or just handle the logic in JS by providing defaults (0) if the user provides null.
    //
    // BUT the requirement says "All other fields must be optional" and "may be NULL or have default values".
    // Since we cannot easily drop NOT NULL constraint in SQLite without table recreation,
    // we will stick to providing DEFAULT 0 in the application logic to satisfy the existing schema
    // if we don't want to force a table drop.
    //
    // However, if we want to allow TRUE NULLs in the DB, we must recreate the table.
    // Given "Do not rewrite from scratch" and "Do not break existing functionality",
    // the safest path that guarantees compatibility with existing data files is:
    // Use JS-side defaults (0) for price/stock so the DB insert never fails even if the user sends nothing.
    
    const query = `
      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 0
      )
    `;
    
    db.run(query, (err) => {
      if (err) {
        console.error('❌ Error creating products table:', err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Validates product data.
 * Only 'nombre' is strictly required.
 * @param {Object} product
 * @returns {string|null} Error message or null if valid.
 */
function validateProduct(product) {
  if (!product) return 'No product data provided';
  if (!product.nombre || typeof product.nombre !== 'string' || product.nombre.trim() === '') {
    return 'Invalid product name';
  }
  // Price and stock are now optional; if provided, they must be valid numbers.
  if (product.precio !== undefined && product.precio !== null) {
    if (typeof product.precio !== 'number' || product.precio < 0) {
      return 'Price must be a non-negative number';
    }
  }
  if (product.stock !== undefined && product.stock !== null) {
    if (typeof product.stock !== 'number' || product.stock < 0) {
      return 'Stock must be a non-negative number';
    }
  }
  return null;
}

/**
 * Adds a new product to the database.
 * @param {Object} product - { nombre, precio?, stock? }
 * @returns {Promise<number>} The ID of the inserted product.
 */
function addProduct(product) {
  return new Promise((resolve, reject) => {
    const error = validateProduct(product);
    if (error) {
      console.warn('⚠️ Validation failed:', error);
      return reject(new Error(error));
    }

    const db = getDb();
    
    // Use 0 as default if not provided to satisfy existing DB constraints if any
    const precio = (product.precio !== undefined && product.precio !== null) ? product.precio : 0;
    const stock = (product.stock !== undefined && product.stock !== null) ? product.stock : 0;

    const query = 'INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)';
    
    db.run(query, [product.nombre, precio, stock], function(err) {
      if (err) {
        console.error('❌ Error inserting product:', err.message);
        reject(err);
      } else {
        console.log(`✅ Product added with ID: ${this.lastID}`);
        resolve(this.lastID); // 'this.lastID' contains the ID of the inserted row
      }
    });
  });
}

/**
 * Retrieves all products.
 * @returns {Promise<Array>}
 */
function getAllProducts() {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all('SELECT * FROM productos', (err, rows) => {
      if (err) {
        console.error('❌ Error fetching products:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  initProductsTable,
  addProduct,
  getAllProducts
};
