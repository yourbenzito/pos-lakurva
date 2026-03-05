const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db = null;

/**
 * Initializes the SQLite database connection.
 * @param {string} userDataPath - The path to the user data directory.
 * @returns {Promise<import('sqlite3').Database>}
 */
function connect(userDataPath) {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const dbPath = path.join(userDataPath, 'ventas.db');

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err.message);
        return reject(err);
      }
      console.log('✅ SQLite database connected at:', dbPath);
      resolve(db);
    });
  });
}

/**
 * Returns the active database instance.
 * @returns {import('sqlite3').Database}
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connect() first.');
  }
  return db;
}

module.exports = { connect, getDb };
