const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

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
                { name: 'updatedBy', type: 'INTEGER' }
            ],
            categories: [
                { name: 'color', type: "TEXT DEFAULT '#6b7280'" }
            ],
            customers: [
                { name: 'creditLimit', type: 'REAL' },
                { name: 'balanceCredit', type: 'REAL DEFAULT 0' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'isActive', type: 'INTEGER DEFAULT 1' },
                { name: 'deletedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' }
            ],
            suppliers: [
                { name: 'contact', type: 'TEXT' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'isActive', type: 'INTEGER DEFAULT 1' },
                { name: 'deletedAt', type: 'TEXT' },
                { name: 'createdBy', type: 'INTEGER' },
                { name: 'updatedBy', type: 'INTEGER' }
            ],
            sales: [
                { name: 'paymentDetails', type: 'JSON' },
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'updatedBy', type: 'INTEGER' }
            ],
            cashRegisters: [
                { name: 'initialAmount', type: 'REAL DEFAULT 0' },
                { name: 'finalAmount', type: 'REAL DEFAULT 0' },
                { name: 'expectedAmount', type: 'REAL DEFAULT 0' },
                { name: 'difference', type: 'REAL DEFAULT 0' },
                { name: 'denominations', type: 'JSON' },
                { name: 'paymentSummary', type: 'JSON' }
            ],
            cashMovements: [
                { name: 'paymentId', type: 'INTEGER' },
                { name: 'reason', type: 'TEXT' }
            ],
            expenses: [
                { name: 'reason', type: 'TEXT' },
                { name: 'userId', type: 'INTEGER' }
            ],
            users: [
                { name: 'updatedAt', type: 'TEXT' },
                { name: 'recoveryCode', type: 'TEXT' },
                { name: 'recoveryCodeGeneratedAt', type: 'TEXT' }
            ],
            auditLogs: [
                { name: 'username', type: 'TEXT' }
            ],
            purchases: [
                { name: 'documentType', type: 'TEXT' },
                { name: 'invoiceNumber', type: 'TEXT' },
                { name: 'invoiceDate', type: 'TEXT' },
                { name: 'subtotal', type: 'REAL DEFAULT 0' },
                { name: 'ivaAmount', type: 'REAL DEFAULT 0' },
                { name: 'paidAmount', type: 'REAL DEFAULT 0' },
                { name: 'dueDate', type: 'TEXT' },
                { name: 'vatMode', type: 'TEXT' }
            ],
            payments: [
                { name: 'paymentMethod', type: 'TEXT' },
                { name: 'notes', type: 'TEXT' }
            ]
        };

        db.serialize(() => {
            Object.keys(tablesSchema).forEach(table => {
                tablesSchema[table].forEach(col => {
                    db.run(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`, (err) => {
                        // Ignoramos error si la columna ya existe
                        if (err && !err.message.includes('duplicate column name')) {
                            // Omitir log para evitar ruido innecesario si es solo duplicado
                        }
                    });
                });
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

app.use(cors());
app.use(express.json({ limit: '100mb' })); // Permitir backups grandes

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
        dbPath: dbPath
    });
});

// --- MIGRACIÓN ---
app.post('/api/migration/import', async (req, res) => {
    const data = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });

    try {
        await dbRun('BEGIN TRANSACTION');
        console.log('🚀 Iniciando Migración Masiva...');

        // Obtener lista de tablas existentes para no intentar insertar en tablas que no existen
        const tablesInDb = await dbAll("SELECT name FROM sqlite_master WHERE type='table'");
        const validTables = tablesInDb.map(t => t.name);

        const stores = Object.keys(data).filter(key =>
            !['version', 'exportDate'].includes(key) && validTables.includes(key)
        );

        for (const store of stores) {
            const items = data[store];
            if (!Array.isArray(items) || items.length === 0) continue;

            console.log(`📦 Migrando tabla: ${store} (${items.length} registros)`);

            // Limpiar tabla actual
            await dbRun(`DELETE FROM ${store}`);

            // Obtener columnas reales de la tabla para evitar insertar en columnas que no existen
            const tableInfo = await dbAll(`PRAGMA table_info(${store})`);
            const realColumns = tableInfo.map(c => c.name);

            // Filtrar columnas que están en el JSON pero no en la BD actual
            const columns = Object.keys(items[0]).filter(col => realColumns.includes(col));
            if (columns.length === 0) continue;

            const placeholders = columns.map(() => '?').join(',');
            const sql = `INSERT INTO ${store} (${columns.join(',')}) VALUES (${placeholders})`;

            // Usar Prepared Statement para máxima velocidad
            const stmt = db.prepare(sql);

            // Usamos una promesa para envolver la ejecución masiva
            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    items.forEach((item, index) => {
                        const values = columns.map(col => {
                            const val = item[col];
                            return (val && typeof val === 'object') ? JSON.stringify(val) : val;
                        });
                        stmt.run(values, (err) => {
                            if (err) {
                                console.error(`Error en item ${index} de ${store}:`, err);
                                reject(err);
                            }
                        });
                    });
                    stmt.finalize((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
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

// --- API CRUD ---

app.get('/api/:table', async (req, res) => {
    const { table } = req.params;
    const query = req.query;
    let sql = `SELECT * FROM ${table}`;
    const params = [];
    if (Object.keys(query).length > 0) {
        const filters = Object.keys(query).map(key => {
            params.push(query[key]);
            return `${key} = ?`;
        }).join(' AND ');
        sql += ` WHERE ${filters}`;
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
    try {
        const pk = table === 'settings' ? 'key' : 'id';
        const row = await dbGet(`SELECT * FROM ${table} WHERE ${pk} = ?`, [id]);
        if (!row && !isNaN(id) && table !== 'settings') {
            // Re-intentar como número si el ID es numérico
            const rowNum = await dbGet(`SELECT * FROM ${table} WHERE id = ?`, [Number(id)]);
            return res.json(parseRow(rowNum));
        }
        res.json(parseRow(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/:table/stats/count', async (req, res) => {
    const { table } = req.params;
    try {
        const row = await dbGet(`SELECT COUNT(*) as total FROM ${table}`);
        res.json(row ? row.total : 0);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/:table/range', async (req, res) => {
    const { table } = req.params;
    const { index, lower, upper } = req.query;
    try {
        const rows = await dbAll(`SELECT * FROM ${table} WHERE ${index} BETWEEN ? AND ?`, [lower, upper]);
        res.json(rows.map(parseRow));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/:table/index/:indexName/:value', async (req, res) => {
    const { table, indexName, value } = req.params;
    try {
        const rows = await dbAll(`SELECT * FROM ${table} WHERE ${indexName} = ?`, [value]);
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
    const item = req.body;
    const columns = Object.keys(item);
    const placeholders = columns.map(() => '?').join(',');
    const values = columns.map(col => (item[col] && typeof item[col] === 'object') ? JSON.stringify(item[col]) : item[col]);

    try {
        const result = await dbRun(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`, values);
        console.log(`[API] Registro insertado en ${table}, ID:`, result.lastID);
        res.json({ id: result.lastID, ...item });
    } catch (err) {
        console.error(`[API] Error al insertar en ${table}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const item = req.body;
    const pk = table === 'settings' ? 'key' : 'id';

    if (item[pk]) delete item[pk];

    const columns = Object.keys(item);
    const setClause = columns.map(col => `${col} = ?`).join(',');
    const values = columns.map(col => (item[col] && typeof item[col] === 'object') ? JSON.stringify(item[col]) : item[col]);
    values.push(id);

    try {
        await dbRun(`UPDATE ${table} SET ${setClause} WHERE ${pk} = ?`, values);
        res.json({ id, ...item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const pk = table === 'settings' ? 'key' : 'id';
    try {
        await dbRun(`DELETE FROM ${table} WHERE ${pk} = ?`, [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- UTILS ---
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
app.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`Servidor Backend corriendo en el puerto ${SERVER_PORT}`);
    console.log(`Base de Datos en: ${dbPath}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${SERVER_PORT} ya está en uso.`);
    } else {
        console.error('❌ Error al iniciar el servidor:', err);
    }
});
