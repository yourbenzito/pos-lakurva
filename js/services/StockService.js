/**
 * Stock Service
 * Centralizes all stock-related business logic
 */
class StockService {
    /**
     * Process stock update for a sale
     * @param {Array} items - Sale items
     * @param {number} saleId - Sale ID (for stock movement reference)
     * @returns {Promise<void>}
     */


    /**
     * Process stock update for a purchase
     * CRITICAL: Updates cost (average), price (if provided), and stock atomically
     * Creates stock movement for each item
     * All operations are performed in database (not just in memory)
     * 
     * @param {Array} items - Purchase items with cost, price (optional), and quantity
     * @param {number} purchaseId - Purchase ID (for stock movement reference)
     * @returns {Promise<void>}
     */
    static async processPurchaseStock(items, purchaseId) {
        if (!items || items.length === 0) {
            console.warn('processPurchaseStock: No items provided');
            return;
        }

        // Validate items first
        const normalizedItems = [];
        for (const item of items) {
            if (!item || !item.productId || item.quantity === undefined || item.quantity <= 0) {
                throw new Error(`Ítem inválido en la compra (Producto dictado sin ID o cantidad)`);
            }
            const newQuantity = parseFloat(item.quantity);
            const newCost = parseFloat(item.cost);

            if (isNaN(newQuantity) || newQuantity <= 0) {
                throw new Error(`Cantidad inválida para el producto: ${item.quantity}`);
            }
            if (isNaN(newCost) || newCost < 0) {
                throw new Error(`Costo inválido para el producto: ${item.cost}`);
            }

            normalizedItems.push({
                productId: item.productId,
                newQuantity,
                newCost,
                newPrice: item.price !== undefined && item.price !== null ? parseFloat(item.price) : null
            });
        }

        // Atomic transaction
        if (db.mode === 'sqlite') {
            console.log('StockService.processPurchaseStock: SQLite mode detected, skipping local transaction (server handles this).');
            return;
        }

        await new Promise((resolve, reject) => {
            if (!db.db) return reject(new Error('Base de datos no inicializada'));
            const tx = db.db.transaction(['products', 'stockMovements'], 'readwrite');

            tx.onerror = () => reject(new Error(`Transacción fallida al procesar inventario: ${tx.error?.message || 'Error desconocido'}`));
            tx.onabort = () => reject(new Error('Transacción abortada: se canceló el ingreso de compra e inventario.'));
            tx.oncomplete = () => resolve();

            const productStore = tx.objectStore('products');
            const movementStore = tx.objectStore('stockMovements');

            for (const item of normalizedItems) {
                const getReq = productStore.get(item.productId);
                getReq.onsuccess = () => {
                    const product = getReq.result;
                    if (!product) {
                        tx.abort();
                        return;
                    }

                    const currentStock = parseFloat(product.stock) || 0;
                    const currentCost = parseFloat(product.cost) || 0;

                    const averageCost = Product.calculateAverageCost(
                        currentStock,
                        currentCost,
                        item.newQuantity,
                        item.newCost
                    );

                    const newStock = currentStock + item.newQuantity;
                    const finalPrice = item.newPrice !== null ? item.newPrice : product.price;

                    productStore.put({
                        ...product,
                        stock: newStock,
                        cost: averageCost,
                        price: finalPrice,
                        updatedAt: new Date().toISOString()
                    });

                    movementStore.add({
                        productId: item.productId,
                        type: 'purchase',
                        quantity: item.newQuantity,
                        reference: purchaseId,
                        reason: `Compra #${purchaseId}`,
                        date: new Date().toISOString()
                    });
                };
            }
        });
    }

    /**
     * Validate stock availability (uses ProductValidator)
     * @param {number} productId - Product ID
     * @param {number} quantity - Required quantity
     * @returns {Promise<boolean>}
     */
    static async validateStock(productId, quantity) {
        const product = await Product.getById(productId);
        const validation = ProductValidator.validateStock(product, quantity);
        return validation.valid;
    }

    /**
     * Revert stock for old purchase items when editing a purchase.
     * @param {Array} oldItems - Previous purchase items
     * @param {number} purchaseId - Purchase ID (for audit)
     * @returns {Promise<void>}
     */
    static async revertPurchaseStock(oldItems, purchaseId) {
        if (!oldItems || oldItems.length === 0) return;
        const reason = `Reversión edición compra #${purchaseId}`;
        for (const item of oldItems) {
            if (!item || !item.productId || item.quantity == null || item.quantity <= 0) continue;
            const qty = parseFloat(item.quantity);
            if (isNaN(qty) || qty <= 0) continue;
            await Product.updateStock(item.productId, qty, 'subtract');
            await StockMovement.create({
                productId: item.productId,
                type: 'adjustment',
                quantity: -qty,
                reference: purchaseId,
                reason
            });
        }
    }

    /**
     * Apply stock for new items when editing a purchase (add only; cost/price updated by UI).
     * @param {Array} newItems - New purchase items
     * @param {number} purchaseId - Purchase ID (for audit)
     * @returns {Promise<void>}
     */
    static async applyPurchaseStockForEdit(newItems, purchaseId) {
        if (!newItems || newItems.length === 0) return;
        const reason = `Edición compra #${purchaseId}`;
        for (const item of newItems) {
            if (!item || !item.productId || item.quantity == null || item.quantity <= 0) continue;
            const qty = parseFloat(item.quantity);
            if (isNaN(qty) || qty <= 0) continue;
            await Product.updateStock(item.productId, qty, 'add');
            await StockMovement.create({
                productId: item.productId,
                type: 'purchase',
                quantity: qty,
                reference: purchaseId,
                reason
            });
        }
    }

    /**
     * Apply quantity delta for existing items when editing a purchase.
     * Positive delta = add to stock, negative delta = subtract from stock.
     * @param {Array<{productId: number, quantityDelta: number}>} deltas - Deltas por producto
     * @param {number} purchaseId - Purchase ID (for audit)
     * @returns {Promise<void>}
     */
    static async applyPurchaseQuantityDeltas(deltas, purchaseId) {
        if (!deltas || deltas.length === 0) return;
        const reason = `Edición compra #${purchaseId}`;
        for (const { productId, quantityDelta } of deltas) {
            if (!productId || quantityDelta === 0) continue;
            const qty = Math.abs(quantityDelta);
            if (quantityDelta > 0) {
                await Product.updateStock(productId, qty, 'add');
                await StockMovement.create({
                    productId,
                    type: 'purchase',
                    quantity: qty,
                    reference: purchaseId,
                    reason
                });
            } else {
                await Product.updateStock(productId, qty, 'subtract');
                await StockMovement.create({
                    productId,
                    type: 'adjustment',
                    quantity: -qty,
                    reference: purchaseId,
                    reason
                });
            }
        }
    }

    /**
     * Create stock adjustment
     * ATOMIC: Product stock update + movement creation in single transaction.
     * @param {number} productId - Product ID
     * @param {number} quantity - Adjustment quantity (positive = add, negative = subtract)
     * @param {string} reason - Reason for adjustment
     * @returns {Promise<number|null>} - Movement ID
     */
    static async createAdjustment(productId, quantity, reason) {
        const product = await Product.getById(productId);
        if (!product) throw new Error('Producto no encontrado');

        const qty = parseFloat(quantity) || 0;
        if (qty === 0) return null;
        const currentStock = parseFloat(product.stock) || 0;
        if (qty < 0 && currentStock < Math.abs(qty)) {
            throw new Error(`Stock insuficiente para ajuste. Disponible: ${currentStock}, intento de restar: ${Math.abs(qty)}`);
        }

        if (db.mode === 'sqlite') {
            const result = await window.ApiClient.post('complex/bulk-adjustment', {
                items: [{ productId, quantity: qty }],
                type: 'adjustment',
                reason
            });
            if (!result.success) throw new Error(result.error || 'Error en ajuste (SQLite)');
            return null; // El endpoint complex no devuelve el ID del movimiento individual fácilmente
        }

        return await new Promise((resolve, reject) => {
            if (!db.db) return reject(new Error('Base de datos no inicializada'));
            const tx = db.db.transaction(['products', 'stockMovements'], 'readwrite');
            let movementId = null;

            tx.onerror = () => reject(new Error(`Error en ajuste: ${tx.error?.message || 'Error desconocido'}`));
            tx.onabort = () => reject(new Error('Ajuste abortado: stock y movimiento no fueron modificados'));
            tx.oncomplete = () => resolve(movementId);

            const productStore = tx.objectStore('products');
            const movementStore = tx.objectStore('stockMovements');

            const getReq = productStore.get(productId);
            getReq.onsuccess = () => {
                const currentProduct = getReq.result;
                if (!currentProduct) { tx.abort(); return; }

                const stock = parseFloat(currentProduct.stock) || 0;
                const newStock = stock + qty;
                if (newStock < 0) { tx.abort(); return; }

                productStore.put({
                    ...currentProduct,
                    stock: newStock,
                    updatedAt: new Date().toISOString()
                });

                const movReq = movementStore.add({
                    productId,
                    type: 'adjustment',
                    quantity: qty,
                    reason: reason || '',
                    date: new Date().toISOString(),
                    cost_value: (parseFloat(currentProduct.cost) || 0) * Math.abs(qty),
                    sale_value: (parseFloat(currentProduct.price) || 0) * Math.abs(qty)
                });
                movReq.onsuccess = () => { movementId = movReq.result; };
            };
        });
    }

    /**
     * Create stock loss
     * ATOMIC: Product stock update + movement creation in single transaction.
     * @param {number} productId - Product ID
     * @param {number} quantity - Loss quantity (positive number)
     * @param {string} reason - Reason for loss
     * @returns {Promise<number>} - Movement ID
     */
    static async createLoss(productId, quantity, reason) {
        const product = await Product.getById(productId);
        if (!product) throw new Error('Producto no encontrado');

        const qty = Math.abs(parseFloat(quantity) || 0);
        if (qty === 0) return null;

        if (db.mode === 'sqlite') {
            const result = await window.ApiClient.post('complex/bulk-adjustment', {
                items: [{ productId, quantity: -qty }],
                type: 'loss',
                reason
            });
            if (!result.success) throw new Error(result.error || 'Error en pérdida (SQLite)');
            return null;
        }

        return await new Promise((resolve, reject) => {
            if (!db.db) return reject(new Error('Base de datos no inicializada'));
            const tx = db.db.transaction(['products', 'stockMovements'], 'readwrite');
            let movementId = null;

            tx.onerror = () => reject(new Error(`Error en pérdida: ${tx.error?.message || 'Error desconocido'}`));
            tx.onabort = () => reject(new Error('Pérdida abortada: stock y movimiento no fueron modificados'));
            tx.oncomplete = () => resolve(movementId);

            const productStore = tx.objectStore('products');
            const movementStore = tx.objectStore('stockMovements');

            const getReq = productStore.get(productId);
            getReq.onsuccess = () => {
                const currentProduct = getReq.result;
                if (!currentProduct) { tx.abort(); return; }

                const stock = parseFloat(currentProduct.stock) || 0;
                const newStock = stock - qty;
                if (newStock < 0) { tx.abort(); return; }

                productStore.put({
                    ...currentProduct,
                    stock: newStock,
                    updatedAt: new Date().toISOString()
                });

                const movReq = movementStore.add({
                    productId,
                    type: 'loss',
                    quantity: -qty,
                    reason: reason || '',
                    date: new Date().toISOString(),
                    cost_value: (parseFloat(currentProduct.cost) || 0) * qty,
                    sale_value: (parseFloat(currentProduct.price) || 0) * qty
                });
                movReq.onsuccess = () => { movementId = movReq.result; };
            };
        });
    }

    /**
     * Create internal consumption
     * ATOMIC: Product stock update + movement creation in single transaction.
     * @param {number} productId - Product ID
     * @param {number} quantity - Consumption quantity (positive number)
     * @param {string} reason - Reason for consumption
     * @returns {Promise<number>} - Movement ID
     */
    static async createConsumption(productId, quantity, reason) {
        const product = await Product.getById(productId);
        if (!product) throw new Error('Producto no encontrado');

        const qty = Math.abs(parseFloat(quantity) || 0);
        if (qty === 0) return null;

        if (db.mode === 'sqlite') {
            const result = await window.ApiClient.post('complex/bulk-adjustment', {
                items: [{ productId, quantity: -qty }],
                type: 'consumption',
                reason
            });
            if (!result.success) throw new Error(result.error || 'Error en consumo (SQLite)');
            return null;
        }

        return await new Promise((resolve, reject) => {
            if (!db.db) return reject(new Error('Base de datos no inicializada'));
            const tx = db.db.transaction(['products', 'stockMovements'], 'readwrite');
            let movementId = null;

            tx.onerror = () => reject(new Error(`Error en consumo: ${tx.error?.message || 'Error desconocido'}`));
            tx.onabort = () => reject(new Error('Consumo abortado: stock y movimiento no fueron modificados'));
            tx.oncomplete = () => resolve(movementId);

            const productStore = tx.objectStore('products');
            const movementStore = tx.objectStore('stockMovements');

            const getReq = productStore.get(productId);
            getReq.onsuccess = () => {
                const currentProduct = getReq.result;
                if (!currentProduct) { tx.abort(); return; }

                const stock = parseFloat(currentProduct.stock) || 0;
                const newStock = stock - qty;
                if (newStock < 0) { tx.abort(); return; }

                productStore.put({
                    ...currentProduct,
                    stock: newStock,
                    updatedAt: new Date().toISOString()
                });

                const movReq = movementStore.add({
                    productId,
                    type: 'consumption',
                    quantity: -qty,
                    reason: reason || '',
                    date: new Date().toISOString(),
                    cost_value: (parseFloat(currentProduct.cost) || 0) * qty,
                    sale_value: (parseFloat(currentProduct.price) || 0) * qty
                });
                movReq.onsuccess = () => { movementId = movReq.result; };
            };
        });
    }

    /**
     * Set product stock to an absolute value.
     * ATOMIC: Reads current stock WITHIN transaction, calculates difference,
     * updates product AND creates movement in a single operation.
     * @param {number} productId - Product ID
     * @param {number} targetStock - Target stock value (absolute, not delta)
     * @param {string} reason - Reason for adjustment
     * @returns {Promise<number|null>} - Movement ID (null if no change)
     */
    static async setStock(productId, targetStock, reason) {
        const product = await Product.getById(productId);
        if (!product) throw new Error('Producto no encontrado');
        if (targetStock < 0) throw new Error('El stock no puede ser negativo');

        if (db.mode === 'sqlite') {
            const currentStock = parseFloat(product.stock) || 0;
            const difference = targetStock - currentStock;
            if (Math.abs(difference) < 0.001) return null;

            const result = await window.ApiClient.post('complex/bulk-adjustment', {
                items: [{ productId, quantity: difference }],
                type: 'adjustment',
                reason
            });
            if (!result.success) throw new Error(result.error || 'Error al establecer stock (SQLite)');
            return null;
        }

        return await new Promise((resolve, reject) => {
            if (!db.db) return reject(new Error('Base de datos no inicializada'));
            const tx = db.db.transaction(['products', 'stockMovements'], 'readwrite');
            let movementId = null;

            tx.onerror = () => reject(new Error(`Error al establecer stock: ${tx.error?.message || 'Error desconocido'}`));
            tx.onabort = () => reject(new Error('Operación abortada'));
            tx.oncomplete = () => resolve(movementId);

            const productStore = tx.objectStore('products');
            const movementStore = tx.objectStore('stockMovements');

            const getReq = productStore.get(productId);
            getReq.onsuccess = () => {
                const currentProduct = getReq.result;
                if (!currentProduct) { tx.abort(); return; }

                const currentStock = parseFloat(currentProduct.stock) || 0;
                const difference = targetStock - currentStock;
                if (Math.abs(difference) < 0.001) return;

                productStore.put({
                    ...currentProduct,
                    stock: targetStock,
                    updatedAt: new Date().toISOString()
                });

                const movReq = movementStore.add({
                    productId,
                    type: 'adjustment',
                    quantity: difference,
                    reason: reason || '',
                    date: new Date().toISOString(),
                    cost_value: (parseFloat(currentProduct.cost) || 0) * Math.abs(difference),
                    sale_value: (parseFloat(currentProduct.price) || 0) * Math.abs(difference)
                });
                movReq.onsuccess = () => { movementId = movReq.result; };
            };
        });
    }

    /**
     * Prevalidate all items for a bulk adjustment. Throws on first invalid item.
     * @param {Array<{productId: number, quantity: number}>} items
     * @param {string} type - 'adjustment' | 'loss' | 'consumption'
     * @throws {Error} If any item is invalid (product missing, quantity invalid, stock insufficient)
     */
    static async validateBulkAdjustment(items, type) {
        if (!items || items.length === 0) {
            throw new Error('No hay ítems para validar');
        }
        for (const item of items) {
            const productId = item.productId != null ? item.productId : item.id;
            const product = await Product.getById(productId);
            if (!product) {
                throw new Error(`Producto no encontrado (ID: ${productId})`);
            }
            const qty = parseFloat(item.quantity);
            if (isNaN(qty) || qty === 0) {
                throw new Error(`Cantidad inválida en "${product.name}". Debe ser distinta de 0.`);
            }
            if (type === 'loss' || type === 'consumption') {
                const absQty = Math.abs(qty);
                if (qty < 0) {
                    throw new Error(`En pérdida/consumo la cantidad debe ser positiva en "${product.name}".`);
                }
                const currentStock = parseFloat(product.stock) || 0;
                if (currentStock < absQty) {
                    throw new Error(`Stock insuficiente en "${product.name}". Disponible: ${currentStock}, requerido: ${absQty}.`);
                }
            } else {
                const currentStock = parseFloat(product.stock) || 0;
                if (qty < 0 && currentStock < Math.abs(qty)) {
                    throw new Error(`Stock insuficiente para ajuste en "${product.name}". Disponible: ${currentStock}, intento de restar: ${Math.abs(qty)}.`);
                }
            }
        }
    }

    /**
     * Apply bulk adjustment atomically: ALL items in a SINGLE IndexedDB transaction.
     * If any item fails, the entire operation rolls back automatically.
     * No orphan movements, no partial stock changes.
     * @param {Array<{productId: number, quantity: number}>} items
     * @param {string} type - 'adjustment' | 'loss' | 'consumption'
     * @param {string} reason
     */
    static async applyBulkAdjustmentAtomic(items, type, reason) {
        const normalized = items.map(item => ({
            productId: item.productId != null ? item.productId : item.id,
            quantity: parseFloat(item.quantity) || 0
        })).filter(item => item.quantity !== 0);
        if (normalized.length === 0) {
            throw new Error('No hay ítems válidos para ajustar');
        }
        await this.validateBulkAdjustment(normalized, type);

        if (db.mode === 'sqlite') {
            const result = await window.ApiClient.post('complex/bulk-adjustment', {
                items: normalized,
                type,
                reason
            });
            if (!result.success) throw new Error(result.error || 'Error en ajuste masivo (SQLite)');
            return;
        }

        await new Promise((resolve, reject) => {
            if (!db.db) return reject(new Error('Base de datos no inicializada'));
            const tx = db.db.transaction(['products', 'stockMovements'], 'readwrite');

            tx.onerror = () => reject(new Error(`Error en ajuste masivo: ${tx.error?.message || 'Error desconocido'}`));
            tx.onabort = () => reject(new Error('Ajuste masivo abortado: ningún cambio fue aplicado'));
            tx.oncomplete = () => resolve();

            const productStore = tx.objectStore('products');
            const movementStore = tx.objectStore('stockMovements');

            for (const item of normalized) {
                const getReq = productStore.get(item.productId);
                getReq.onsuccess = () => {
                    const product = getReq.result;
                    if (!product) { tx.abort(); return; }

                    let stockDelta;
                    let movType;
                    if (type === 'adjustment') {
                        stockDelta = item.quantity;
                        movType = 'adjustment';
                    } else if (type === 'loss') {
                        stockDelta = -Math.abs(item.quantity);
                        movType = 'loss';
                    } else {
                        stockDelta = -Math.abs(item.quantity);
                        movType = 'consumption';
                    }

                    const currentStock = parseFloat(product.stock) || 0;
                    const newStock = currentStock + stockDelta;
                    if (newStock < 0) { tx.abort(); return; }

                    productStore.put({
                        ...product,
                        stock: newStock,
                        updatedAt: new Date().toISOString()
                    });

                    movementStore.add({
                        productId: item.productId,
                        type: movType,
                        quantity: stockDelta,
                        reason: reason || '',
                        date: new Date().toISOString(),
                        cost_value: (parseFloat(product.cost) || 0) * Math.abs(stockDelta),
                        sale_value: (parseFloat(product.price) || 0) * Math.abs(stockDelta)
                    });
                };
            }
        });
    }

    /**
     * Kardex de stock por producto (solo lectura). Orden cronológico, saldo acumulado teórico,
     * comparación con Product.stock y marcas de diagnóstico. NO escribe en BD.
     * @param {number} productId - Product ID
     * @returns {Promise<{ product: Object|null, rows: Array<{date, type, reference, reason, quantity, sign, balanceAfter, noReference, isRollback, negativeBalance}>, theoreticalBalance: number, currentStock: number, inconsistency: boolean, diagnostics: Object }>}
     */
    static async getKardexByProduct(productId) {
        const product = await Product.getById(productId);
        const movements = await StockMovement.getByProduct(productId);
        const currentStock = product ? (parseFloat(product.stock) || 0) : 0;

        const sorted = [...movements].sort((a, b) => {
            const da = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            if (da !== dateB) return da - dateB;
            return (a.id || 0) - (b.id || 0);
        });

        let balance = 0;
        const rows = [];
        let hasNegativeBalance = false;
        let hasNoReference = false;
        let hasRollback = false;

        for (const m of sorted) {
            const qty = parseFloat(m.quantity) || 0;
            balance += qty;
            const noRef = (m.type === 'sale' || m.type === 'purchase') && (m.reference == null || m.reference === '');
            const isRollback = (m.reason || '').toLowerCase().includes('rollback');
            const negativeBal = balance < 0;
            if (noRef) hasNoReference = true;
            if (isRollback) hasRollback = true;
            if (negativeBal) hasNegativeBalance = true;
            rows.push({
                id: m.id,
                date: m.date,
                type: m.type || 'adjustment',
                reference: m.reference,
                reason: m.reason || '',
                quantity: qty,
                sign: qty >= 0 ? '+' : '-',
                balanceAfter: balance,
                noReference: noRef,
                isRollback,
                negativeBalance: negativeBal
            });
        }

        const theoreticalBalance = rows.length > 0 ? rows[rows.length - 1].balanceAfter : 0;
        const inconsistency = rows.length > 0 && Math.abs(theoreticalBalance - currentStock) > 0.001;

        return {
            product,
            rows,
            theoreticalBalance,
            currentStock,
            inconsistency,
            diagnostics: {
                hasNegativeBalance,
                hasNoReference,
                hasRollback,
                movementCount: rows.length
            }
        };
    }
}
