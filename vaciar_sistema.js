const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');

const dbPath = path.join(os.homedir(), '.sistema-ventas', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const tablesToEmpty = [
    'products', 'categories', 'customers', 'suppliers', 'sales',
    'cashRegisters', 'cashMovements', 'expenses', 'auditLogs',
    'purchases', 'payments', 'settings', 'stockMovements', 
    'customerCreditDeposits', 'customerCreditUses', 'saleReturns', 
    'supplierPayments', 'productPriceHistory', 'passwordResets'
];

db.serialize(() => {
    console.log('--- VACIANDO BASE DE DATOS ---');

    // 1. Limpiar todas las tablas de datos
    tablesToEmpty.forEach(table => {
        db.run(`DELETE FROM ${table}`, (err) => {
            if (err) console.error(`Error al vaciar ${table}:`, err.message);
            else console.log(`✅ Tabla ${table} vaciada.`);
        });
    });

    // 2. Limpiar negocios y usuarios (pero dejar uno para entrar)
    db.run("DELETE FROM users");
    db.run("DELETE FROM businesses");

    const now = new Date().toISOString();
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    // 3. Recrear negocio inicial
    db.run("INSERT INTO businesses (id, name, slug, accessCode, createdAt, plan) VALUES (1, 'Mi Negocio', 'mi-negocio', 'ADMIN1', ?, 'basic')", [now]);

    // 4. Recrear usuario administrador
    db.run("INSERT INTO users (username, password, role, business_id, createdAt) VALUES (?, ?, ?, ?, ?)",
        ['admin', hashedPassword, 'owner', 1, now],
        function (err) {
            if (err) console.error('Error al crear admin:', err.message);
            else {
                console.log('✅ Sistema reiniciado.');
                console.log('--- CREDENCIALES ---');
                console.log('Usuario: admin');
                console.log('Contraseña: admin123');
                console.log('Negocio: Mi Negocio');
            }
        }
    );

    // 5. Categoría por defecto
    db.run("INSERT INTO categories (id, name, business_id, color) VALUES (1, 'General', 1, '#6b7280')");

    db.close();
});
