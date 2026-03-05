const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.sistema-ventas', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('--- CORRECCIÓN DE CONTRASEÑA ADMIN ---');

    // Hash SHA-256 correcto para 'admin123'
    const adminHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
    const now = new Date().toISOString();

    // Asegurar que admin tenga esta contraseña
    db.run("UPDATE users SET password = ?, role = 'owner' WHERE username = 'admin'", [adminHash], function (err) {
        if (err) console.error('Error:', err.message);
        else console.log('✅ Contraseña de "admin" actualizada a "admin123". Registros afectados:', this.changes);

        db.all("SELECT id, username, role FROM users", (err, rows) => {
            console.log('Usuarios finales:', rows);
            db.close();
        });
    });
});
