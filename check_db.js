const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.sistema-ventas');
const dbPath = path.join(DATA_DIR, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log('--- PENDING PURCHASES ---');
db.all('SELECT id, supplierId, total, paidAmount, status, date FROM purchases WHERE status != "paid" LIMIT 20', (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
    
    console.log('--- SUPPLIERS ---');
    db.all('SELECT id, name, business_id FROM suppliers LIMIT 10', (err, srows) => {
        if (err) console.error(err);
        else console.table(srows);
        
        console.log('--- PAYMENTS ---');
        db.all('SELECT id, supplierId, amount, business_id FROM supplierPayments LIMIT 10', (err, prows) => {
            if (err) console.error(err);
            else console.table(prows);
            db.close();
        });
    });
});
