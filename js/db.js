class Database {
    constructor() {
        this.dbName = 'POSMinimarket';
        this.version = 6;
        this.db = null;
    }

    async init() {
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
                let productStore;
                if (!db.objectStoreNames.contains('products')) {
                    productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                } else {
                    productStore = tx.objectStore('products');
                }
                if (!productStore.indexNames.contains('barcode')) productStore.createIndex('barcode', 'barcode', { unique: false });
                if (!productStore.indexNames.contains('name')) productStore.createIndex('name', 'name', { unique: false });
                if (!productStore.indexNames.contains('category')) productStore.createIndex('category', 'category', { unique: false });

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
            };
        });
    }

    async add(storeName, data) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async query(storeName, filterFn) {
        const all = await this.getAll(storeName);
        return all.filter(filterFn);
    }

    async clear(storeName) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async count(storeName) {
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
