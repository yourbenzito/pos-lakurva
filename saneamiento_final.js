const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.sistema-ventas', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Limpiar registros basura (nulos)
    db.run("DELETE FROM users WHERE username IS NULL OR username = ''");

    // 2. Asegurarse que 'admin' sea owner
    db.run("UPDATE users SET role = 'owner' WHERE username = 'admin'");

    // 3. Promover a 'branco' a owner para que recupere sus botones
    db.run("UPDATE users SET role = 'owner' WHERE username = 'branco'");

    console.log('✅ Base de datos saneada. Usuarios "admin" y "branco" ahora son Propietarios.');

    db.all("SELECT id, username, role FROM users", (err, rows) => {
        console.log('Estado final de usuarios:', rows);
        db.close();
    });
});
