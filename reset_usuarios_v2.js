const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.sistema-ventas', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('--- RESET DE USUARIOS ---');

    // Hash SHA-256 exacto para 'admin123'
    const adminHash = '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2';
    const now = new Date().toISOString();

    // 1. Borrar basura y duplicados
    db.run("DELETE FROM users WHERE username IS NULL OR username = '' OR username = 'admin'");

    // 2. Insertar admin fresco
    db.run("INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)",
        ['admin', adminHash, 'owner', now],
        function (err) {
            if (err) console.error('Error:', err.message);
            else console.log('✅ Usuario "admin" con contraseña "admin123" creado con ID:', this.lastID);
        }
    );

    // 3. Asegurar que 'branco' sea owner
    db.run("UPDATE users SET role = 'owner' WHERE username = 'branco'");

    db.all("SELECT id, username, role FROM users", (err, rows) => {
        console.log('Usuarios finales en la base de datos:', rows);
        db.close();
        console.log('--- PROCESO TERMINADO ---');
    });
});
