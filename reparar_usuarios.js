const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const fs = require('fs');

const dbPath = path.join(os.homedir(), '.sistema-ventas', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(async () => {
    console.log('--- REPARADOR DE USUARIOS ---');

    // 1. Ver qué usuarios hay
    db.all("SELECT id, username, role FROM users", (err, rows) => {
        if (err) {
            console.error('Error al leer usuarios:', err.message);
            return;
        }
        console.log('Usuarios actuales en BD:', rows);

        // 2. Si no hay admin o hay basura, limpiar y crear uno limpio
        db.run("DELETE FROM users WHERE username = 'admin' OR username IS NULL", (err) => {
            // Contraseña hash para 'admin123' (SHA-256)
            const adminHash = '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2';
            const now = new Date().toISOString();

            db.run("INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)",
                ['admin', adminHash, 'owner', now],
                function (err) {
                    if (err) console.error('Error al crear admin:', err.message);
                    else console.log('✅ Usuario ADMIN restaurado con éxito. ID:', this.lastID);
                    db.close();
                }
            );
        });
    });
});
