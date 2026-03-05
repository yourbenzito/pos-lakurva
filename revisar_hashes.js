const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.sistema-ventas', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, username, password FROM users", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('--- USUARIOS EN BD ---');
        rows.forEach(r => {
            console.log(`ID: ${r.id} | User: ${r.username} | Hash: ${r.password}`);
        });
    }
    db.close();
});
