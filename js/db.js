class Database {
    constructor() {
        this.dbName = 'POSMinimarket';
        this.version = 21;
        this.db = null;

        // Si accedemos por IP remota (ej: celular), forzamos SQLite. 
        // En localhost/Electron, usamos lo que diga localStorage (default indexeddb)
        const isRemote = window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        this.mode = localStorage.getItem('DB_MODE') || (isRemote ? 'sqlite' : 'indexeddb');

        console.log(`🔌 Modo Base de Datos: ${this.mode.toUpperCase()} ${isRemote ? '(Auto-detectado)' : ''}`);
    }

    async init() {
        if (this.mode === 'sqlite') {
            let retries = 3;
            while (retries > 0) {
                try {
                    const status = await fetch(`${window.API_CONFIG.BASE_URL}/api/status`).then(r => r.json());
                    if (status.status === 'online') {
                        console.log('✅ SQLite Backend Online');
                        return true;
                    }
                } catch (e) {
                    retries--;
                    if (retries > 0) {
                        console.log(`⏳ Esperando al servidor SQLite... (${retries} intentos restantes)`);
                        await new Promise(resolve => setTimeout(resolve, 1500)); // Esperar 1.5s
                    } else {
                        console.error('❌ SQLite Backend Offline definitivamente, volviendo a IndexedDB');
                        this.mode = 'indexeddb';
                    }
                }
            }
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const tx = event.target.transaction;

                // Products
                // NOTA AUDITORÍA A2: barcode NO es unique a nivel de IndexedDB porque muchos productos
                // tienen barcode = '' (vacío). Hacer unique rompería la migración en producción.
                // La unicidad de barcode se valida a nivel de aplicación en ProductService (create y update).
                // Lo mismo aplica para users.username y sales.saleNumber: validados en capa de servicio.
                let productStore;
                if (!db.objectStoreNames.contains('products')) {
                    productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                } else {
                    productStore = tx.objectStore('products');
                }
                if (!productStore.indexNames.contains('barcode')) productStore.createIndex('barcode', 'barcode', { unique: false });
                if (!productStore.indexNames.contains('name')) productStore.createIndex('name', 'name', { unique: false });
                if (!productStore.indexNames.contains('category')) productStore.createIndex('category', 'category', { unique: false });
                if (!productStore.indexNames.contains('expiryDate')) productStore.createIndex('expiryDate', 'expiryDate', { unique: false });

                // Categories
                if (!db.objectStoreNames.contains('categories')) {
                    db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                }

                // Sales
                let salesStore;
                if (!db.objectStoreNames.contains('sales')) {
                    salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                } else {
                    salesStore = tx.objectStore('sales');
                }
                if (!salesStore.indexNames.contains('date')) salesStore.createIndex('date', 'date', { unique: false });
                if (!salesStore.indexNames.contains('saleNumber')) salesStore.createIndex('saleNumber', 'saleNumber', { unique: false });
                if (!salesStore.indexNames.contains('customerId')) salesStore.createIndex('customerId', 'customerId', { unique: false });
                // B1: Índices de rendimiento para queries frecuentes
                if (!salesStore.indexNames.contains('cashRegisterId')) salesStore.createIndex('cashRegisterId', 'cashRegisterId', { unique: false });
                if (!salesStore.indexNames.contains('status')) salesStore.createIndex('status', 'status', { unique: false });
                if (!salesStore.indexNames.contains('idempotencyKey')) salesStore.createIndex('idempotencyKey', 'idempotencyKey', { unique: false });

                // Customers
                let customerStore;
                if (!db.objectStoreNames.contains('customers')) {
                    customerStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                } else {
                    customerStore = tx.objectStore('customers');
                }
                if (!customerStore.indexNames.contains('name')) customerStore.createIndex('name', 'name', { unique: false });

                // Suppliers
                let supplierStore;
                if (!db.objectStoreNames.contains('suppliers')) {
                    supplierStore = db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
                } else {
                    supplierStore = tx.objectStore('suppliers');
                }
                if (!supplierStore.indexNames.contains('name')) supplierStore.createIndex('name', 'name', { unique: false });

                // Purchases
                let purchaseStore;
                if (!db.objectStoreNames.contains('purchases')) {
                    purchaseStore = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
                } else {
                    purchaseStore = tx.objectStore('purchases');
                }
                if (!purchaseStore.indexNames.contains('date')) purchaseStore.createIndex('date', 'date', { unique: false });
                if (!purchaseStore.indexNames.contains('supplierId')) purchaseStore.createIndex('supplierId', 'supplierId', { unique: false });

                // Cash Registers
                let cashStore;
                if (!db.objectStoreNames.contains('cashRegisters')) {
                    cashStore = db.createObjectStore('cashRegisters', { keyPath: 'id', autoIncrement: true });
                } else {
                    cashStore = tx.objectStore('cashRegisters');
                }
                if (!cashStore.indexNames.contains('openDate')) cashStore.createIndex('openDate', 'openDate', { unique: false });
                if (!cashStore.indexNames.contains('status')) cashStore.createIndex('status', 'status', { unique: false });

                // Cash Movements
                let cashMovementStore;
                if (!db.objectStoreNames.contains('cashMovements')) {
                    cashMovementStore = db.createObjectStore('cashMovements', { keyPath: 'id', autoIncrement: true });
                } else {
                    cashMovementStore = tx.objectStore('cashMovements');
                }
                if (!cashMovementStore.indexNames.contains('cashRegisterId')) cashMovementStore.createIndex('cashRegisterId', 'cashRegisterId', { unique: false });
                if (!cashMovementStore.indexNames.contains('type')) cashMovementStore.createIndex('type', 'type', { unique: false });
                if (!cashMovementStore.indexNames.contains('date')) cashMovementStore.createIndex('date', 'date', { unique: false });
                // Fix: Add reference indexes for faster lookups
                if (!cashMovementStore.indexNames.contains('paymentId')) cashMovementStore.createIndex('paymentId', 'paymentId', { unique: false });
                if (!cashMovementStore.indexNames.contains('expenseId')) cashMovementStore.createIndex('expenseId', 'expenseId', { unique: false });
                if (!cashMovementStore.indexNames.contains('saleId')) cashMovementStore.createIndex('saleId', 'saleId', { unique: false });

                // Stock Movements
                let stockStore;
                if (!db.objectStoreNames.contains('stockMovements')) {
                    stockStore = db.createObjectStore('stockMovements', { keyPath: 'id', autoIncrement: true });
                } else {
                    stockStore = tx.objectStore('stockMovements');
                }
                if (!stockStore.indexNames.contains('productId')) stockStore.createIndex('productId', 'productId', { unique: false });
                if (!stockStore.indexNames.contains('date')) stockStore.createIndex('date', 'date', { unique: false });
                if (!stockStore.indexNames.contains('type')) stockStore.createIndex('type', 'type', { unique: false });

                // Settings
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Users
                let userStore;
                if (!db.objectStoreNames.contains('users')) {
                    userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                } else {
                    userStore = tx.objectStore('users');
                }
                if (!userStore.indexNames.contains('username')) userStore.createIndex('username', 'username', { unique: false });
                if (!userStore.indexNames.contains('phone')) userStore.createIndex('phone', 'phone', { unique: false });

                // Payments
                let paymentStore;
                if (!db.objectStoreNames.contains('payments')) {
                    paymentStore = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
                } else {
                    paymentStore = tx.objectStore('payments');
                }
                if (!paymentStore.indexNames.contains('saleId')) paymentStore.createIndex('saleId', 'saleId', { unique: false });
                if (!paymentStore.indexNames.contains('customerId')) paymentStore.createIndex('customerId', 'customerId', { unique: false });
                if (!paymentStore.indexNames.contains('date')) paymentStore.createIndex('date', 'date', { unique: false });
                if (!paymentStore.indexNames.contains('cashRegisterId')) paymentStore.createIndex('cashRegisterId', 'cashRegisterId', { unique: false });

                // Expenses
                let expenseStore;
                if (!db.objectStoreNames.contains('expenses')) {
                    expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                } else {
                    expenseStore = tx.objectStore('expenses');
                }
                if (!expenseStore.indexNames.contains('category')) expenseStore.createIndex('category', 'category', { unique: false });
                if (!expenseStore.indexNames.contains('date')) expenseStore.createIndex('date', 'date', { unique: false });
                if (!expenseStore.indexNames.contains('cashRegisterId')) expenseStore.createIndex('cashRegisterId', 'cashRegisterId', { unique: false });

                // Customer credit deposits (dinero a favor) - se suma a caja por método de pago
                // B5 FIX: Patrón correcto — crear store O acceder al existente, luego crear índices aparte
                let creditDepositStore;
                if (!db.objectStoreNames.contains('customerCreditDeposits')) {
                    creditDepositStore = db.createObjectStore('customerCreditDeposits', { keyPath: 'id', autoIncrement: true });
                } else {
                    creditDepositStore = tx.objectStore('customerCreditDeposits');
                }
                if (!creditDepositStore.indexNames.contains('cashRegisterId')) creditDepositStore.createIndex('cashRegisterId', 'cashRegisterId', { unique: false });
                if (!creditDepositStore.indexNames.contains('customerId')) creditDepositStore.createIndex('customerId', 'customerId', { unique: false });
                if (!creditDepositStore.indexNames.contains('date')) creditDepositStore.createIndex('date', 'date', { unique: false });

                // Usos de saldo a favor (cuando el cliente paga con su crédito en una venta)
                let creditUseStore;
                if (!db.objectStoreNames.contains('customerCreditUses')) {
                    creditUseStore = db.createObjectStore('customerCreditUses', { keyPath: 'id', autoIncrement: true });
                } else {
                    creditUseStore = tx.objectStore('customerCreditUses');
                }
                if (!creditUseStore.indexNames.contains('customerId')) creditUseStore.createIndex('customerId', 'customerId', { unique: false });
                if (!creditUseStore.indexNames.contains('date')) creditUseStore.createIndex('date', 'date', { unique: false });

                // C2: Audit Logs — registro centralizado de acciones críticas
                let auditLogStore;
                if (!db.objectStoreNames.contains('auditLogs')) {
                    auditLogStore = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
                } else {
                    auditLogStore = tx.objectStore('auditLogs');
                }
                if (!auditLogStore.indexNames.contains('entity')) auditLogStore.createIndex('entity', 'entity', { unique: false });
                if (!auditLogStore.indexNames.contains('entityId')) auditLogStore.createIndex('entityId', 'entityId', { unique: false });
                if (!auditLogStore.indexNames.contains('timestamp')) auditLogStore.createIndex('timestamp', 'timestamp', { unique: false });
                if (!auditLogStore.indexNames.contains('userId')) auditLogStore.createIndex('userId', 'userId', { unique: false });
                if (!auditLogStore.indexNames.contains('action')) auditLogStore.createIndex('action', 'action', { unique: false });

                // C7: Product Price History — historial de cambios de precio (eventos inmutables)
                let productPriceHistoryStore;
                if (!db.objectStoreNames.contains('productPriceHistory')) {
                    productPriceHistoryStore = db.createObjectStore('productPriceHistory', { keyPath: 'id', autoIncrement: true });
                } else {
                    productPriceHistoryStore = tx.objectStore('productPriceHistory');
                }
                if (!productPriceHistoryStore.indexNames.contains('productId')) productPriceHistoryStore.createIndex('productId', 'productId', { unique: false });
                if (!productPriceHistoryStore.indexNames.contains('date')) productPriceHistoryStore.createIndex('date', 'date', { unique: false });

                // C6: Supplier Payments — pagos a proveedores (eventos inmutables)
                let supplierPaymentStore;
                if (!db.objectStoreNames.contains('supplierPayments')) {
                    supplierPaymentStore = db.createObjectStore('supplierPayments', { keyPath: 'id', autoIncrement: true });
                } else {
                    supplierPaymentStore = tx.objectStore('supplierPayments');
                }
                if (!supplierPaymentStore.indexNames.contains('supplierId')) supplierPaymentStore.createIndex('supplierId', 'supplierId', { unique: false });
                if (!supplierPaymentStore.indexNames.contains('purchaseId')) supplierPaymentStore.createIndex('purchaseId', 'purchaseId', { unique: false });
                if (!supplierPaymentStore.indexNames.contains('date')) supplierPaymentStore.createIndex('date', 'date', { unique: false });

                // C5: Sale Returns — devoluciones de ventas (eventos inmutables)
                let saleReturnStore;
                if (!db.objectStoreNames.contains('saleReturns')) {
                    saleReturnStore = db.createObjectStore('saleReturns', { keyPath: 'id', autoIncrement: true });
                } else {
                    saleReturnStore = tx.objectStore('saleReturns');
                }
                if (!saleReturnStore.indexNames.contains('saleId')) saleReturnStore.createIndex('saleId', 'saleId', { unique: false });
                if (!saleReturnStore.indexNames.contains('date')) saleReturnStore.createIndex('date', 'date', { unique: false });

                // Password Reset Attempts (rate limiting y auditoría de recuperación)
                if (!db.objectStoreNames.contains('passwordResets')) {
                    const prStore = db.createObjectStore('passwordResets', { keyPath: 'id', autoIncrement: true });
                    prStore.createIndex('userId', 'userId', { unique: false });
                    prStore.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    async add(storeName, data) {
        if (this.mode === 'sqlite') {
            const result = await window.ApiClient.post(storeName, data);
            // IMPORTANTE: Devolver solo el ID para mantener compatibilidad con IndexedDB
            return result.id;
        }
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        if (this.mode === 'sqlite') {
            const pk = storeName === 'settings' ? 'key' : 'id';
            const id = data[pk];
            const result = await window.ApiClient.put(storeName, id, data);
            // IMPORTANTE: Devolver solo el ID para mantener compatibilidad con IndexedDB
            return result[pk];
        }
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        if (this.mode === 'sqlite') {
            return await window.ApiClient.get(`${storeName}/${id}`);
        }
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(Number(id) || id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        if (this.mode === 'sqlite') {
            return await window.ApiClient.get(storeName);
        }
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        if (this.mode === 'sqlite') {
            return await window.ApiClient.delete(storeName, id);
        }
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(Number(id) || id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        if (this.mode === 'sqlite') {
            const params = {};
            params[indexName] = value;
            return await window.ApiClient.get(storeName, params);
        }
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndexRange(storeName, indexName, lower, upper) {
        if (this.mode === 'sqlite') {
            // Emulando rango en backend (simplificado: trae todo y filtra o por endpoint experto)
            // Por ahora, traemos todo lo de ese store para no complicar el server
            // NOTA: Esto se puede optimizar despues
            const all = await this.getAll(storeName);
            return all.filter(item => item[indexName] >= lower && item[indexName] <= upper);
        }
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const range = IDBKeyRange.bound(lower, upper);
        return new Promise((resolve, reject) => {
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async query(storeName, filterFn) {
        const all = await this.getAll(storeName);
        return all.filter(filterFn);
    }

    async clear(storeName) {
        if (this.mode === 'sqlite') {
            // No implementado por seguridad en API general
            return;
        }
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async count(storeName) {
        if (this.mode === 'sqlite') {
            return await window.ApiClient.get(`${storeName}/stats/count`);
        }
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

const db = new Database();
