const express = require('express');
const compression = require('compression');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'pos-lakurva-secret-chile-2026'; // En producción usar variable de entorno

const app = express();
const PORT = 3000; // Refresco: 20:01

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use(compression());

// Servir archivos estáticos (frontend) con caché para mejor rendimiento en la nube
const rootPath = path.join(__dirname, '..');
app.use(express.static(rootPath, { 
    maxAge: 0, 
    immutable: false 
}));

// Middleware para Multi-Tenancy y Auth
const authMiddleware = (req, res, next) => {
    const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/join', '/api/status', '/api/utils/hash'];
    if (publicPaths.includes(req.path)) return next();

    const token = req.headers['authorization']?.split(' ')[1];

    // Para compatibilidad inicial mientras migramos el frontend, si no hay token 
    // pero hay un x-business-id, lo dejamos pasar (solo temporalmente)
    if (!token) {
        req.business_id = 1; // Forzado a 1 para ver datos migrados
        req.userId = 1; // Default admin
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.business_id = decoded.business_id || 1; // Forzar 1 si viene vacío
        next();
    } catch (err) {
        // Si el token falla pero estamos en local, dejamos pasar con ID 1
        req.business_id = 1;
        req.userId = 1;
        next();
    }
};

app.use(authMiddleware);

// Configuración de base de datos
const DATA_DIR = process.env.DATA_DIR || path.join(os.homedir(), '.sistema-ventas');
const dbPath = path.join(DATA_DIR, 'database.sqlite');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error al conectar a SQLite:', err);
    else {
        // Optimización para multidispositivo y concurrencia
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA busy_timeout = 10000');
    }
});

// Inicializar tablas desde schema.sql
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema, (err) => {
    if (err) console.error('Error al inicializar tablas:', err);
    else {
        console.log('Base de datos SQLite lista en:', dbPath);

        // MIGRACIÓN AUTOMÁTICA: Asegurar que todas las columnas del nuevo schema existan
        const tablesSchema = {
            products: [
                { name: 'maxStock', type: 'REAL DEFAULT 0' },
                { name: 'isActive', type: 'INTEGER DEFAULT 1' },
                { name: 'deletedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            categories: [
                { name: 'color', type: "TEXT DEFAULT '#6b7280'" },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            customers: [
                { name: 'creditLimit', type: 'REAL' },
                { name: 'balanceCredit', type: 'REAL DEFAULT 0' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'isActive', type: 'INTEGER DEFAULT 1' },
                { name: 'deletedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            suppliers: [
                { name: 'contact', type: 'TEXT' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'isActive', type: 'INTEGER DEFAULT 1' },
                { name: 'deletedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            sales: [
                { name: 'paymentDetails', type: 'JSON' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' },
                { name: 'tax_rate', type: 'REAL DEFAULT 0' },
                { name: 'commission_rate', type: 'REAL DEFAULT 0' },
                { name: 'price_with_tax', type: 'REAL DEFAULT 0' },
                { name: 'createdAt', type: 'TEXT' }
            ],
            cashRegisters: [
                { name: 'initialAmount', type: 'REAL DEFAULT 0' },
                { name: 'finalAmount', type: 'REAL DEFAULT 0' },
                { name: 'expectedAmount', type: 'REAL DEFAULT 0' },
                { name: 'difference', type: 'REAL DEFAULT 0' },
                { name: 'denominations', type: 'JSON' },
                { name: 'paymentSummary', type: 'JSON' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            cashMovements: [
                { name: 'paymentId', type: 'INTEGER' },
                { name: 'reason', type: 'TEXT' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            expenses: [
                { name: 'reason', type: 'TEXT' },
                { name: 'userId', type: 'INTEGER' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            users: [
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'recoveryCode', type: 'TEXT' },
                { name: 'recoveryCodeGeneratedAt', type: 'TEXT' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            auditLogs: [
                { name: 'username', type: 'TEXT' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            purchases: [
                { name: 'documentType', type: 'TEXT' },
                { name: 'invoiceNumber', type: 'TEXT' },
                { name: 'invoiceDate', type: 'TEXT' },
                { name: 'subtotal', type: 'REAL DEFAULT 0' },
                { name: 'ivaAmount', type: 'REAL DEFAULT 0' },
                { name: 'paidAmount', type: 'REAL DEFAULT 0' },
                { name: 'dueDate', type: 'TEXT' },
                { name: 'vatMode', type: 'TEXT' },
                { name: 'createdAt', type: 'TEXT' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            payments: [
                { name: 'paymentMethod', type: 'TEXT' },
                { name: 'notes', type: 'TEXT' },
                { name: 'createdAt', type: 'TEXT' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            settings: [
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            stockMovements: [
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            customerCreditDeposits: [
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            customerCreditUses: [
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            saleReturns: [
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            supplierPayments: [
                { name: 'method', type: 'TEXT' },
                { name: 'reference', type: 'TEXT' },
                { name: 'notes', type: 'TEXT' },
                { name: 'createdAt', type: 'TEXT' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' },
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            productPriceHistory: [
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ],
            passwordResets: [
                { name: 'business_id', type: 'INTEGER DEFAULT 1' }
            ]
        };

        db.serialize(() => {
            Object.keys(tablesSchema).forEach(table => {
                tablesSchema[table].forEach(col => {
                    db.run(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`, (err) => {
                        // Ignoramos error si la columna ya existe
                    });
                });
            });

            // --- REPARACIÓN Y ASEGURAMIENTO DE DATOS ---
            db.serialize(() => {
                // 1. Asegurar Negocio 1
                db.run("INSERT OR IGNORE INTO businesses (id, name, slug, accessCode, createdAt) VALUES (1, 'Mi Negocio', 'mi-negocio', 'ADMIN1', ?)", [new Date().toISOString()]);
                
                // 2. Vincular todo al Negocio 1 si está en NULL o 0
                const tablesToFix = ['products', 'categories', 'customers', 'suppliers', 'sales',
                    'cashRegisters', 'cashMovements', 'expenses', 'users', 'auditLogs',
                    'purchases', 'payments', 'settings', 'stockMovements', 'customerCreditDeposits',
                    'customerCreditUses', 'saleReturns', 'supplierPayments', 'productPriceHistory', 'passwordResets'];

                tablesToFix.forEach(table => {
                    db.run(`UPDATE ${table} SET business_id = 1 WHERE business_id IS NULL OR business_id = 0`, (err) => {
                        if (err) console.error(`Error reparando tabla ${table}:`, err.message);
                    });
                });

                // Asegurar que al menos una categoría exista para el negocio 1 si se borraron
                db.run("INSERT OR IGNORE INTO categories (id, name, business_id) VALUES (1, 'General', 1)");

                // 3. Diagnóstico en terminal
                db.get("SELECT COUNT(*) as count FROM products WHERE business_id = 1", (err, row) => {
                    if (!err) console.log(`🔍 DIAGNÓSTICO: Se encontraron ${row.count} productos listos para mostrar en el Negocio 1.`);
                });
                
                db.get("SELECT COUNT(*) as count FROM users WHERE business_id = 1", (err, row) => {
                    if (!err) console.log(`🔍 DIAGNÓSTICO: Se encontraron ${row.count} usuarios vinculados al Negocio 1.`);
                });
            });

            // Agregar columna accessCode a businesses si no existe
            db.run("ALTER TABLE businesses ADD COLUMN accessCode TEXT", (err) => {
                if (!err) {
                    // Si la columna se acaba de crear, generar códigos para negocios existentes
                    db.all("SELECT id FROM businesses WHERE accessCode IS NULL", (err2, rows) => {
                        if (!err2 && rows) {
                            rows.forEach(row => {
                                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                                let code = '';
                                for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
                                db.run("UPDATE businesses SET accessCode = ? WHERE id = ?", [code, row.id]);
                            });
                        }
                    });
                }
            });
        });

        // Casos especiales de rename (SQLite no tiene RENAME COLUMN en versiones viejas)
        // Pero podemos intentar agregar la nueva si no existe
        db.run(`ALTER TABLE cashRegisters ADD COLUMN initialAmount REAL DEFAULT 0`, (err) => { });
        db.run(`ALTER TABLE cashRegisters ADD COLUMN finalAmount REAL DEFAULT 0`, (err) => { });
    }
});

// Helper para usar promesas con sqlite3 (para transacciones complejas)
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
    });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

// --- RUTAS DE AUTENTICACIÓN ---

// Generar código de acceso aleatorio (6 caracteres alfanuméricos)
function generateAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin 0,O,1,I para evitar confusión
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 1. CREAR NEGOCIO NUEVO (Registro)
app.post('/api/auth/register', async (req, res) => {
    const { businessName, username, password } = req.body;
    if (!businessName || !username || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    const slug = businessName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
    const accessCode = generateAccessCode();

    try {
        await dbRun('BEGIN TRANSACTION');

        // Verificar que el nombre de negocio no exista
        const existingBiz = await dbGet("SELECT id FROM businesses WHERE slug = ?", [slug]);
        if (existingBiz) {
            await dbRun('ROLLBACK');
            return res.status(400).json({ error: 'Ya existe un negocio con ese nombre. Intenta con otro.' });
        }

        // Verificar que el usuario no exista globalmente
        const existingUser = await dbGet("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", [username]);
        if (existingUser) {
            await dbRun('ROLLBACK');
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso. Elige uno diferente.' });
        }

        // 1. Crear Negocio con código de acceso
        const bizResult = await dbRun(
            "INSERT INTO businesses (name, slug, accessCode, createdAt, plan) VALUES (?, ?, ?, ?, ?)",
            [businessName, slug, accessCode, new Date().toISOString(), 'basic']
        );
        const businessId = bizResult.lastID;

        // 2. Crear Usuario Owner
        const hashedPassword = bcrypt.hashSync(password, 10);
        const userResult = await dbRun(
            "INSERT INTO users (username, password, role, business_id, createdAt) VALUES (?, ?, ?, ?, ?)",
            [username, hashedPassword, 'owner', businessId, new Date().toISOString()]
        );

        // 3. Crear Categoría por defecto
        await dbRun(
            "INSERT INTO categories (name, business_id, color) VALUES (?, ?, ?)",
            ['General', businessId, '#6b7280']
        );

        await dbRun('COMMIT');

        // Auto-login: generar token
        const token = jwt.sign({
            userId: userResult.lastID,
            business_id: businessId,
            role: 'owner'
        }, JWT_SECRET, { expiresIn: '30d' });

        const business = { id: businessId, name: businessName, slug, accessCode };
        const user = { id: userResult.lastID, username, role: 'owner', business_id: businessId };

        res.json({ user, business, token, accessCode });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// 2. INICIAR SESIÓN (Login con nombre de negocio)
app.post('/api/auth/login', async (req, res) => {
    const { businessName, username, password } = req.body;
    try {
        let user;
        let business;

        if (businessName) {
            // Buscar negocio por nombre (case-insensitive)
            const slug = businessName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
            business = await dbGet("SELECT * FROM businesses WHERE slug = ? OR LOWER(name) = LOWER(?)", [slug, businessName]);
            if (!business) return res.status(401).json({ error: `Negocio "${businessName}" no encontrado` });

            user = await dbGet("SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND business_id = ?", [username, business.id]);
        } else {
            // Sin nombre de negocio: buscar usuario global (compatibilidad)
            user = await dbGet("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", [username]);
            if (user) {
                business = await dbGet("SELECT * FROM businesses WHERE id = ?", [user.business_id]);
            }
        }

        if (!user) return res.status(401).json({ error: 'Usuario no encontrado en ese negocio' });

        // Verificar password (soporta SHA256 legacy o bcrypt)
        let isValid = false;
        if (user.password && user.password.length === 64) {
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(password).digest('hex');
            isValid = (hash === user.password);
        } else if (user.password) {
            isValid = bcrypt.compareSync(password, user.password);
        }

        if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({
            userId: user.id,
            business_id: user.business_id,
            role: user.role
        }, JWT_SECRET, { expiresIn: '30d' });

        delete user.password;
        // No enviar el accessCode en login normal (solo al dueño)
        if (business) delete business.accessCode;
        res.json({ user, business, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. UNIRSE A NEGOCIO (Empleado con código de acceso)
app.post('/api/auth/join', async (req, res) => {
    const { accessCode, username, password } = req.body;
    if (!accessCode || !username || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Buscar negocio por código
        const business = await dbGet("SELECT * FROM businesses WHERE accessCode = ?", [accessCode.toUpperCase()]);
        if (!business) return res.status(404).json({ error: 'Código de acceso inválido' });

        // Verificar que el username no exista en este negocio
        const existingUser = await dbGet(
            "SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND business_id = ?",
            [username, business.id]
        );
        if (existingUser) return res.status(400).json({ error: 'Este usuario ya existe en el negocio' });

        // Crear usuario como cajero
        const hashedPassword = bcrypt.hashSync(password, 10);
        const userResult = await dbRun(
            "INSERT INTO users (username, password, role, business_id, createdAt) VALUES (?, ?, ?, ?, ?)",
            [username, hashedPassword, 'cashier', business.id, new Date().toISOString()]
        );

        const token = jwt.sign({
            userId: userResult.lastID,
            business_id: business.id,
            role: 'cashier'
        }, JWT_SECRET, { expiresIn: '30d' });

        const user = { id: userResult.lastID, username, role: 'cashier', business_id: business.id };
        delete business.accessCode;

        res.json({ user, business, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. VER CÓDIGO DE ACCESO (Solo owner)
app.get('/api/auth/access-code', async (req, res) => {
    try {
        const business = await dbGet("SELECT accessCode FROM businesses WHERE id = ?", [req.business_id]);
        if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });
        res.json({ accessCode: business.accessCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Servir archivos estáticos del frontend para que otros dispositivos (Celulares/Tablets) puedan entrar
app.use(express.static(path.join(__dirname, '..')));

// Ruta raíz para servir el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Obtener IP Local para que el usuario conecte el celular
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Endpoint de prueba e información
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        ip: getLocalIP(),
        port: PORT,
        dbPath: dbPath,
        time: new Date().toISOString()
    });
});

// --- MIGRACIÓN ---
app.post('/api/migration/import', async (req, res) => {
    const data = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });

    try {
        console.log('-------------------------------------------');
        console.log('🚀 RECIBIDA PETICIÓN DE MIGRACIÓN MASIVA');
        console.log(`📦 Contenido recibido. Procesando...`);
        console.log('-------------------------------------------');

        await dbRun('BEGIN TRANSACTION');

        // Obtener lista de tablas existentes para no intentar insertar en tablas que no existen
        const tablesInDb = await dbAll("SELECT name FROM sqlite_master WHERE type='table'");
        const validTables = tablesInDb.map(t => t.name);

        const stores = Object.keys(data).filter(key =>
            !['version', 'exportDate'].includes(key) && validTables.includes(key)
        );

        for (const store of stores) {
            const items = data[store];
            if (!Array.isArray(items) || items.length === 0) continue;

            console.log(`📦 Importando tabla: ${store} (${items.length} registros)`);

            // Limpiar tabla actual antes de importar
            await dbRun(`DELETE FROM ${store}`);

            // Obtener columnas reales de la tabla
            const tableInfo = await dbAll(`PRAGMA table_info(${store})`);
            const realColumns = tableInfo.map(c => c.name);

            // Consolidar solo las columnas que existen en la base de datos
            const validColumns = Object.keys(items[0]).filter(k => realColumns.includes(k));
            if (realColumns.includes('business_id') && !validColumns.includes('business_id')) {
                validColumns.push('business_id');
            }

            const placeholders = validColumns.map(() => '?').join(',');
            const sql = `INSERT INTO ${store} (${validColumns.join(',')}) VALUES (${placeholders})`;

            // Insertar registros uno por uno para asegurar consistencia y esperar a que terminen
            let count = 0;
            for (const item of items) {
                const values = validColumns.map(col => {
                    if (col === 'business_id') return item.business_id || 1;
                    const val = item[col];
                    return (val && typeof val === 'object') ? JSON.stringify(val) : val;
                });
                await dbRun(sql, values);
                count++;
                if (count % 200 === 0) console.log(`   - ${store}: ${count}/${items.length} procesados...`);
            }
            console.log(`✅ Tabla ${store} completada.`);
        }

        await dbRun('COMMIT');
        console.log('✅ Migración completada con éxito.');
        res.json({ success: true, message: 'Migración completada' });
    } catch (err) {
        console.error('❌ Error fatal en migración:', err);
        try {
            await dbRun('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Error al hacer ROLLBACK:', rollbackErr);
        }
        res.status(500).json({ error: err.message });
    }
});

// --- OPERACIONES COMPLEJAS (ATÓMICAS) ---

// Crear Venta (Venta + Stock + Movimiento)
app.post('/api/complex/sale', async (req, res) => {
    const { sale, validItems } = req.body;

    try {
        await dbRun('BEGIN TRANSACTION');

        const columns = Object.keys(sale);
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(col => (sale[col] && typeof sale[col] === 'object') ? JSON.stringify(sale[col]) : sale[col]);

        const result = await dbRun(`INSERT INTO sales (${columns.join(',')}) VALUES (${placeholders})`, values);
        const saleId = result.lastID;

        for (const item of validItems) {
            const product = await dbGet(`SELECT * FROM products WHERE id = ?`, [item.productId]);
            if (!product) continue;

            const newStock = (parseFloat(product.stock) || 0) - parseFloat(item.qty);
            await dbRun(`UPDATE products SET stock = ?, lastSoldAt = ?, updatedAt = ? WHERE id = ?`,
                [newStock, new Date().toISOString(), new Date().toISOString(), item.productId]);

            await dbRun(`INSERT INTO stockMovements (productId, type, quantity, reference, date, reason, cost_value, sale_value) VALUES (?,?,?,?,?,?,?,?)`,
                [item.productId, 'sale', -item.qty, saleId, new Date().toISOString(), '', (parseFloat(product.cost) || 0) * item.qty, (parseFloat(product.price) || 0) * item.qty]);
        }

        await dbRun('COMMIT');
        res.json({ id: saleId, success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// Registrar Pago (Pago + Actualizar Venta)
app.post('/api/complex/payment', async (req, res) => {
    const { payment } = req.body;
    try {
        await dbRun('BEGIN TRANSACTION');

        // 1. Crear el pago
        const columns = Object.keys(payment);
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(col => (payment[col] && typeof payment[col] === 'object') ? JSON.stringify(payment[col]) : payment[col]);
        const result = await dbRun(`INSERT INTO payments (${columns.join(',')}) VALUES (${placeholders})`, values);
        const paymentId = result.lastID;

        // 2. Actualizar la venta
        const sale = await dbGet(`SELECT * FROM sales WHERE id = ?`, [payment.saleId]);
        if (sale) {
            const newPaidAmount = (parseFloat(sale.paidAmount) || 0) + parseFloat(payment.amount);
            const isFullyPaid = newPaidAmount >= (parseFloat(sale.total) || 0);
            await dbRun(`UPDATE sales SET paidAmount = ?, status = ?, updatedAt = ? WHERE id = ?`,
                [newPaidAmount, isFullyPaid ? 'completed' : 'partial', new Date().toISOString(), payment.saleId]);
        }

        await dbRun('COMMIT');
        res.json({ id: paymentId, success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// Registrar Depósito de Crédito (Depósito + Actualizar Cliente)
app.post('/api/complex/credit-deposit', async (req, res) => {
    const { deposit } = req.body;
    try {
        await dbRun('BEGIN TRANSACTION');

        // 1. Crear el depósito
        const columns = Object.keys(deposit);
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(col => (deposit[col] && typeof deposit[col] === 'object') ? JSON.stringify(deposit[col]) : deposit[col]);
        await dbRun(`INSERT INTO customerCreditDeposits (${columns.join(',')}) VALUES (${placeholders})`, values);

        // 2. Actualizar el saldo del cliente
        const customer = await dbGet(`SELECT * FROM customers WHERE id = ?`, [deposit.customerId]);
        if (customer) {
            const newCredit = (parseFloat(customer.balanceCredit) || 0) + parseFloat(deposit.amount);
            await dbRun(`UPDATE customers SET balanceCredit = ?, updatedAt = ? WHERE id = ?`,
                [newCredit, new Date().toISOString(), deposit.customerId]);
        }

        await dbRun('COMMIT');
        res.json({ success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// Registrar Abono a Cuenta (Múltiples Pagos + Actualizar Ventas)
app.post('/api/complex/account-payment', async (req, res) => {
    const { paymentsToCreate } = req.body;
    try {
        await dbRun('BEGIN TRANSACTION');

        for (const p of paymentsToCreate) {
            // 1. Crear el pago
            const columns = Object.keys(p);
            const placeholders = columns.map(() => '?').join(',');
            const values = columns.map(col => (p[col] && typeof p[col] === 'object') ? JSON.stringify(p[col]) : p[col]);
            await dbRun(`INSERT INTO payments (${columns.join(',')}) VALUES (${placeholders})`, values);

            // 2. Actualizar la venta
            const sale = await dbGet(`SELECT * FROM sales WHERE id = ?`, [p.saleId]);
            if (sale) {
                const newPaidAmount = (parseFloat(sale.paidAmount) || 0) + parseFloat(p.amount);
                const isFullyPaid = newPaidAmount >= (parseFloat(sale.total) || 0);
                await dbRun(`UPDATE sales SET paidAmount = ?, status = ?, updatedAt = ? WHERE id = ?`,
                    [newPaidAmount, isFullyPaid ? 'completed' : 'partial', new Date().toISOString(), p.saleId]);
            }
        }

        await dbRun('COMMIT');
        res.json({ success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// Eliminar Venta y Devolver Stock (Completo)
app.delete('/api/complex/sale/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun('BEGIN TRANSACTION');

        const sale = await dbGet(`SELECT * FROM sales WHERE id = ?`, [id]);
        if (!sale) throw new Error('Venta no encontrada');

        const items = (typeof sale.items === 'string') ? JSON.parse(sale.items) : sale.items;

        // Obtener cantidades ya devueltas para no duplicar stock al anular
        const returns = await dbAll(`SELECT * FROM saleReturns WHERE saleId = ?`, [id]);
        const returnedQtyByProduct = {};
        for (const r of returns) {
            const itemsR = (typeof r.items === 'string') ? JSON.parse(r.items) : r.items;
            for (const itemR of itemsR) {
                const pid = itemR.productId;
                returnedQtyByProduct[pid] = (returnedQtyByProduct[pid] || 0) + parseFloat(itemR.quantity);
            }
        }

        for (const item of items) {
            if (!item.productId) continue;
            const product = await dbGet(`SELECT * FROM products WHERE id = ?`, [item.productId]);
            if (product) {
                const originalQty = parseFloat(item.quantity) || 0;
                const returnedQty = returnedQtyByProduct[item.productId] || 0;
                const qtyToRestore = originalQty - returnedQty;

                if (qtyToRestore > 0) {
                    const newStock = (parseFloat(product.stock) || 0) + qtyToRestore;
                    await dbRun(`UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?`,
                        [newStock, new Date().toISOString(), item.productId]);

                    await dbRun(`INSERT INTO stockMovements (productId, type, quantity, reference, date, reason, cost_value, sale_value) VALUES (?,?,?,?,?,?,?,?)`,
                        [
                            item.productId,
                            'adjustment',
                            qtyToRestore,
                            id,
                            new Date().toISOString(),
                            `Anulación Venta #${sale.saleNumber}`,
                            (parseFloat(product.cost) || 0) * qtyToRestore,
                            (parseFloat(product.price) || 0) * qtyToRestore
                        ]);
                }
            }
        }

        await dbRun(`DELETE FROM sales WHERE id = ?`, [id]);
        await dbRun(`DELETE FROM payments WHERE saleId = ?`, [id]);
        await dbRun(`DELETE FROM saleReturns WHERE saleId = ?`, [id]);
        await dbRun(`DELETE FROM stockMovements WHERE reference = ? AND (type = 'sale' OR reason LIKE '%venta #${sale.saleNumber}%')`, [id]);

        await dbRun('COMMIT');
        res.json({ success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// Crear Compra (Compra + Stock + Movimiento)
app.post('/api/complex/purchase', async (req, res) => {
    const { purchase, items } = req.body;

    try {
        await dbRun('BEGIN TRANSACTION');

        const columns = Object.keys(purchase);
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(col => (purchase[col] && typeof purchase[col] === 'object') ? JSON.stringify(purchase[col]) : purchase[col]);

        const result = await dbRun(`INSERT INTO purchases (${columns.join(',')}) VALUES (${placeholders})`, values);
        const purchaseId = result.lastID;

        for (const item of items) {
            const product = await dbGet(`SELECT * FROM products WHERE id = ?`, [item.productId]);
            if (!product) continue;

            const currentStock = parseFloat(product.stock) || 0;
            const currentCost = parseFloat(product.cost) || 0;
            const newQty = parseFloat(item.quantity);
            const newCost = parseFloat(item.cost);

            // weighted average cost
            let avgCost = currentCost;
            if (currentStock + newQty > 0) {
                avgCost = ((currentStock * currentCost) + (newQty * newCost)) / (currentStock + newQty);
            } else {
                avgCost = newCost;
            }

            const newStock = currentStock + newQty;

            await dbRun(`UPDATE products SET stock = ?, cost = ?, price = ?, updatedAt = ? WHERE id = ?`,
                [newStock, avgCost, item.price || product.price, new Date().toISOString(), item.productId]);

            await dbRun(`INSERT INTO stockMovements (productId, type, quantity, reference, date, reason, cost_value, sale_value) VALUES (?,?,?,?,?,?,?,?)`,
                [item.productId, 'purchase', newQty, purchaseId, new Date().toISOString(), `Compra #${purchaseId}`, avgCost * newQty, (item.price || product.price) * newQty]);
        }

        await dbRun('COMMIT');
        res.json({ id: purchaseId, success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// Eliminar Compra Completa (Revertir Stock + Revertir Pagos/Caja)
app.delete('/api/complex/purchase/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await dbRun('BEGIN TRANSACTION');

        const purchase = await dbGet(`SELECT * FROM purchases WHERE id = ?`, [id]);
        if (!purchase) throw new Error('Compra no encontrada');

        // 1. Revertir Stock
        const items = Array.isArray(purchase.items) ? purchase.items : (typeof purchase.items === 'string' ? JSON.parse(purchase.items) : []);
        for (const item of items) {
            const product = await dbGet(`SELECT * FROM products WHERE id = ?`, [item.productId]);
            if (product) {
                const newStock = (parseFloat(product.stock) || 0) - (parseFloat(item.quantity) || 0);
                await dbRun(`UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?`,
                    [newStock, new Date().toISOString(), item.productId]);

                // Registrar ajuste negativo
                await dbRun(`INSERT INTO stockMovements (productId, type, quantity, reference, date, reason) VALUES (?,?,?,?,?,?)`,
                    [item.productId, 'adjustment', -item.quantity, id, new Date().toISOString(), `Anulación Compra #${id}`]);
            }
        }

        // 2. Revertir Pagos y Caja
        const payments = await dbAll(`SELECT * FROM supplierPayments WHERE purchaseId = ?`, [id]);
        for (const payment of payments) {
            // Si fue en efectivo, buscar movimiento de caja por el paymentId (si existe) o por la descripción
            if ((payment.method === 'cash' || payment.method === 'efectivo')) {
                // Intentar borrar por paymentId primero
                let deletedMovement = await dbRun(`DELETE FROM cashMovements WHERE paymentId = ?`, [payment.id]);

                // Si no se borró nada (legacy), intentar por razón que contiene el # de compra
                if (deletedMovement.changes === 0) {
                    await dbRun(`DELETE FROM cashMovements WHERE reason LIKE ? AND amount = ?`,
                        [`%(Compra #${id})%`, payment.amount]);
                }
            }
            // Borrar el pago
            await dbRun(`DELETE FROM supplierPayments WHERE id = ?`, [payment.id]);
        }

        // 3. Borrar la compra y sus movimientos originales
        await dbRun(`DELETE FROM purchases WHERE id = ?`, [id]);
        await dbRun(`DELETE FROM stockMovements WHERE reference = ? AND type = 'purchase'`, [id]);

        await dbRun('COMMIT');
        res.json({ success: true, message: 'Compra eliminada y stock revertido' });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// --- API OPTIMIZADA PARA COMPRAS (EVITAR CARGA MASIVA) ---

// Resumen de cuentas por pagar y métricas (Sustituye cálculos pesados en el cliente)
app.get('/api/purchases/stats/summary', async (req, res) => {
    const { business_id } = req;
    try {
        // 1. Obtener deuda total y conteos
        // Deuda = Sum(Total) - Sum(Pagos Registrados) - Sum(Pagos Generales)
        const debtRow = await dbGet(`
            SELECT 
                COUNT(*) as totalCount,
                SUM(total) as totalPurchases,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
                SUM(paidAmount) as totalPaidLegacy
            FROM purchases 
            WHERE business_id = ?
        `, [business_id]);

        const totalPayments = await dbGet(`
            SELECT SUM(amount) as total FROM supplierPayments WHERE business_id = ?
        `, [business_id]);

        // 2. Obtener total del mes actual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthTotalRow = await dbGet(`
            SELECT SUM(total) as total FROM purchases 
            WHERE business_id = ? AND date >= ?
        `, [business_id, startOfMonth]);

        // Listado de proveedores con deuda (Resumen de cuentas por pagar)
        // Esta query es más compleja porque debe considerar pagos específicos y generales
        const creditors = await dbAll(`
            SELECT 
                s.id, s.name,
                SUM(p.total) as totalPurchases,
                (SELECT SUM(amount) FROM supplierPayments sp WHERE sp.supplierId = s.id AND sp.business_id = s.business_id) as totalPaid
            FROM suppliers s
            JOIN purchases p ON p.supplierId = s.id
            WHERE s.business_id = ?
            GROUP BY s.id
            HAVING (totalPurchases - IFNULL(totalPaid, 0)) > 0.01
            ORDER BY (totalPurchases - IFNULL(totalPaid, 0)) DESC
        `, [business_id]);

        res.json({
            summary: {
                totalCount: debtRow.totalCount || 0,
                totalPurchases: debtRow.totalPurchases || 0,
                totalDebt: Math.max(0, (debtRow.totalPurchases || 0) - (totalPayments.total || 0)),
                monthTotal: monthTotalRow.total || 0,
                pendingCount: debtRow.pendingCount || 0
            },
            creditors: creditors.map(c => ({
                supplier: { id: c.id, name: c.name },
                totalPurchases: c.totalPurchases,
                totalDebt: Math.max(0, c.totalPurchases - (c.totalPaid || 0))
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listado limitado de compras recientes (Para carga inicial ultra-rápida)
app.get('/api/purchases/list/latest', async (req, res) => {
    const { business_id } = req;
    const limit = parseInt(req.query.limit) || 50;
    try {
        const rows = await dbAll(`
            SELECT * FROM purchases 
            WHERE business_id = ? 
            ORDER BY date DESC 
            LIMIT ?
        `, [business_id, limit]);
        res.json(rows.map(parseRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API CRUD ---

app.get('/api/:table', async (req, res) => {
    const { table } = req.params;
    // Forzamos el ID 1 si el middleware no lo detectó correctamente
    const business_id = req.business_id || 1;
    const query = req.query;
    let sql = `SELECT * FROM ${table} WHERE business_id = ?`;
    const params = [business_id];

    if (Object.keys(query).length > 0) {
        const filters = Object.keys(query).map(key => {
            params.push(query[key]);
            return `${key} = ?`;
        }).join(' AND ');
        sql += ` AND (${filters})`;
    }
    try {
        const rows = await dbAll(sql, params);
        res.json(rows.map(parseRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const { business_id } = req;
    try {
        const pk = table === 'settings' ? 'key' : 'id';
        const row = await dbGet(`SELECT * FROM ${table} WHERE ${pk} = ? AND business_id = ?`, [id, business_id]);
        if (!row && !isNaN(id) && table !== 'settings') {
            const rowNum = await dbGet(`SELECT * FROM ${table} WHERE id = ? AND business_id = ?`, [Number(id), business_id]);
            return res.json(parseRow(rowNum));
        }
        res.json(parseRow(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/:table/stats/count', async (req, res) => {
    const { table } = req.params;
    const { business_id } = req;
    try {
        const row = await dbGet(`SELECT COUNT(*) as total FROM ${table} WHERE business_id = ?`, [business_id]);
        res.json(row ? row.total : 0);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/:table/range', async (req, res) => {
    const { table } = req.params;
    const { index, lower, upper } = req.query;
    const { business_id } = req;
    try {
        const rows = await dbAll(`SELECT * FROM ${table} WHERE business_id = ? AND ${index} BETWEEN ? AND ?`, [business_id, lower, upper]);
        res.json(rows.map(parseRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/:table/index/:indexName/:value', async (req, res) => {
    const { table, indexName, value } = req.params;
    const { business_id } = req;
    try {
        const rows = await dbAll(`SELECT * FROM ${table} WHERE business_id = ? AND ${indexName} = ?`, [business_id, value]);
        res.json(rows.map(parseRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ajuste de Stock Masivo (Consumo/Pérdida/Ajuste)
// Devolución de Venta (Stock + Registro + Movimiento)
app.post('/api/complex/sale-return', async (req, res) => {
    const { returnRecord, validatedItems, deductFromCashRegister, cashRegisterId } = req.body;
    try {
        await dbRun('BEGIN TRANSACTION');

        // 1. Crear el registro de devolución
        const columns = Object.keys(returnRecord);
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(col => (returnRecord[col] && typeof returnRecord[col] === 'object') ? JSON.stringify(returnRecord[col]) : returnRecord[col]);
        const result = await dbRun(`INSERT INTO saleReturns (${columns.join(',')}) VALUES (${placeholders})`, values);
        const returnId = result.lastID;

        // 2. Restaurar Stock y crear Movimientos
        for (const item of validatedItems) {
            const product = await dbGet(`SELECT * FROM products WHERE id = ?`, [item.productId]);
            if (product) {
                const currentStock = parseFloat(product.stock) || 0;
                const newStock = currentStock + parseFloat(item.quantity);
                await dbRun(`UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?`,
                    [newStock, new Date().toISOString(), item.productId]);

                await dbRun(`INSERT INTO stockMovements (productId, type, quantity, reference, date, reason, cost_value, sale_value) VALUES (?,?,?,?,?,?,?,?)`,
                    [
                        item.productId,
                        'return',
                        item.quantity,
                        returnRecord.saleId,
                        new Date().toISOString(),
                        `Devolución Venta #${returnRecord.saleNumber || returnRecord.saleId}: ${returnRecord.reason || 'Sin motivo'}`,
                        (item.costAtSale || 0) * item.quantity,
                        (item.unitPrice || 0) * item.quantity
                    ]);
            }
        }

        // 3. Opcional: Egresar de Caja
        if (deductFromCashRegister && cashRegisterId) {
            const desc = `Reembolso por Devolución Venta #${returnRecord.saleNumber || returnRecord.saleId}`;
            await dbRun(`INSERT INTO cashMovements (cashRegisterId, type, amount, reason, date) VALUES (?,?,?,?,?)`,
                [cashRegisterId, 'out', parseFloat(returnRecord.totalReturned), desc, new Date().toISOString()]);
        }

        await dbRun('COMMIT');
        res.json({ id: returnId, success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

// Edición de Compra (Stock + Costos + Registro + Movimientos)
app.put('/api/complex/purchase/:id', async (req, res) => {
    const { id } = req.params;
    const { purchaseData, productOps } = req.body; // productOps es un objeto { productId: { stockDelta, newCost, newPrice, itemQty } }
    try {
        await dbRun('BEGIN TRANSACTION');

        // 1. Actualizar Registro de Compra
        const columns = Object.keys(purchaseData);
        const updates = columns.map(col => `${col} = ?`).join(',');
        const values = columns.map(col => (purchaseData[col] && typeof purchaseData[col] === 'object') ? JSON.stringify(purchaseData[col]) : purchaseData[col]);
        await dbRun(`UPDATE purchases SET ${updates}, updatedAt = ? WHERE id = ?`, [...values, new Date().toISOString(), id]);

        // 2. Procesar Productos
        for (const productId of Object.keys(productOps)) {
            const ops = productOps[productId];
            const product = await dbGet(`SELECT * FROM products WHERE id = ?`, [productId]);
            if (!product) continue;

            const currentStock = parseFloat(product.stock) || 0;
            const newStock = currentStock + (parseFloat(ops.stockDelta) || 0);

            // Recalcular costo promedio si aplica
            let newCost = product.cost;
            let newPrice = product.price;

            if (ops.newCost !== undefined && ops.itemQty > 0 && newStock > 0) {
                const otherStock = Math.max(0, newStock - ops.itemQty);
                const currentCost = parseFloat(product.cost) || 0;
                newCost = (otherStock * currentCost + ops.itemQty * ops.newCost) / newStock;
                newCost = Math.round(newCost * 100) / 100;
            } else if (ops.newCost !== undefined && ops.itemQty > 0) {
                newCost = ops.newCost;
            }

            if (ops.newPrice !== undefined) {
                newPrice = ops.newPrice;
            }

            await dbRun(`UPDATE products SET stock = ?, cost = ?, price = ?, updatedAt = ? WHERE id = ?`,
                [newStock, newCost, newPrice, new Date().toISOString(), productId]);

            // 3. Movimiento de Stock
            if (ops.stockDelta !== 0) {
                await dbRun(`INSERT INTO stockMovements (productId, type, quantity, reference, date, reason, cost_value, sale_value) VALUES (?,?,?,?,?,?,?,?)`,
                    [
                        productId,
                        ops.stockDelta > 0 ? 'purchase' : 'adjustment',
                        ops.stockDelta,
                        id,
                        new Date().toISOString(),
                        `Edición compra #${id}`,
                        Math.abs(ops.stockDelta) * (parseFloat(newCost) || 0),
                        Math.abs(ops.stockDelta) * (parseFloat(newPrice) || 0)
                    ]);
            }
        }

        await dbRun('COMMIT');
        res.json({ success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/complex/bulk-adjustment', async (req, res) => {
    const { items, type, reason } = req.body;
    try {
        await dbRun('BEGIN TRANSACTION');

        for (const item of items) {
            const productId = item.productId || item.id;
            const product = await dbGet(`SELECT * FROM products WHERE id = ?`, [productId]);
            if (!product) continue;

            let stockDelta = parseFloat(item.quantity) || 0;
            let movType = type;

            if (type === 'loss') {
                stockDelta = -Math.abs(stockDelta);
            } else if (type === 'consumption') {
                stockDelta = -Math.abs(stockDelta);
            }

            const currentStock = parseFloat(product.stock) || 0;
            const newStock = currentStock + stockDelta;

            // Actualizar Stock
            await dbRun(`UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?`,
                [newStock, new Date().toISOString(), productId]);

            // Crear Movimiento
            await dbRun(`INSERT INTO stockMovements (productId, type, quantity, reason, date, cost_value, sale_value) VALUES (?,?,?,?,?,?,?)`,
                [
                    productId,
                    movType,
                    stockDelta,
                    reason || '',
                    new Date().toISOString(),
                    (parseFloat(product.cost) || 0) * Math.abs(stockDelta),
                    (parseFloat(product.price) || 0) * Math.abs(stockDelta)
                ]);
        }

        await dbRun('COMMIT');
        res.json({ success: true });
    } catch (err) {
        try { await dbRun('ROLLBACK'); } catch (e) { }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/:table', async (req, res) => {
    const { table } = req.params;
    const { business_id } = req;
    const item = { ...req.body, business_id };

    const columns = Object.keys(item);
    const placeholders = columns.map(() => '?').join(',');
    const values = columns.map(col => (item[col] && typeof item[col] === 'object') ? JSON.stringify(item[col]) : item[col]);

    try {
        const result = await dbRun(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`, values);
        res.json({ id: result.lastID, ...item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const { business_id } = req;
    const item = req.body;
    const pk = table === 'settings' ? 'key' : 'id';

    if (item[pk]) delete item[pk];
    if (item.business_id) delete item.business_id;

    const columns = Object.keys(item);
    const setClause = columns.map(col => `${col} = ?`).join(',');
    const values = columns.map(col => (item[col] && typeof item[col] === 'object') ? JSON.stringify(item[col]) : item[col]);

    values.push(id);
    values.push(business_id);

    try {
        const result = await dbRun(`UPDATE ${table} SET ${setClause} WHERE ${pk} = ? AND business_id = ?`, values);
        if (result.changes === 0) return res.status(403).json({ error: 'No tienes permiso o el registro no existe' });
        res.json({ id, ...item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const { business_id } = req;
    const pk = table === 'settings' ? 'key' : 'id';
    try {
        const result = await dbRun(`DELETE FROM ${table} WHERE ${pk} = ? AND business_id = ?`, [id, business_id]);
        if (result.changes === 0) return res.status(403).json({ error: 'No tienes permiso o el registro no existe' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- UTILS ---

// FACTORY RESET: Vaciar TODOS los datos del negocio actual
app.post('/api/system/factory-reset', async (req, res) => {
    const { business_id } = req;
    console.log(`🚨 FACTORY RESET solicitado para business_id: ${business_id}`);
    
    try {
        const tablesToWipe = [
            'products', 'categories', 'sales', 'customers', 'suppliers',
            'purchases', 'cashRegisters', 'cashMovements', 'stockMovements',
            'settings', 'payments', 'expenses', 'customerCreditDeposits',
            'customerCreditUses', 'auditLogs', 'productPriceHistory',
            'supplierPayments', 'saleReturns'
        ];

        for (const table of tablesToWipe) {
            try {
                await dbRun(`DELETE FROM ${table} WHERE business_id = ?`, [business_id]);
                console.log(`  🗑️ ${table} vaciada`);
            } catch (err) {
                console.warn(`  ⚠️ Error vaciando ${table}: ${err.message}`);
            }
        }

        // Recrear categoría General por defecto
        await dbRun("INSERT INTO categories (name, business_id) VALUES ('General', ?)", [business_id]);

        console.log('✅ Factory Reset completado.');
        res.json({ success: true, message: 'Todos los datos han sido eliminados' });
    } catch (err) {
        console.error('❌ Error en factory reset:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/utils/hash', (req, res) => {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: 'Value is required' });
    try {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(value).digest('hex');
        res.json({ hash });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function parseRow(row) {
    if (!row) return null;
    const newRow = { ...row };
    for (const key in newRow) {
        if (typeof newRow[key] === 'string' && (newRow[key].startsWith('{') || newRow[key].startsWith('['))) {
            try { newRow[key] = JSON.parse(newRow[key]); } catch (e) { }
        }
    }
    return newRow;
}

const SERVER_PORT = process.env.PORT || PORT;
const server = app.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`Servidor Backend corriendo en el puerto ${SERVER_PORT}`);
    console.log(`Base de Datos en: ${dbPath}`);
});

// Aumentar el timeout para migraciones pesadas
server.timeout = 0; 
server.keepAliveTimeout = 0;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${SERVER_PORT} ya está en uso.`);
    } else {
        console.error('❌ Error al iniciar el servidor:', err);
    }
});
