class Purchase {
    static _repository = new PurchaseRepository();

    /**
     * Create a new purchase
     * CRITICAL: All operations execute in a single atomic transaction
     * - Purchase record is created in database
     * - Product stock, cost, and price are updated in database (persisted, not in-memory)
     * - Stock movement records are created in database for each item
     * If any operation fails, entire transaction rolls back automatically
     * Stock persists after restart - all updates use database operations (put/add)
     * 
     * @param {Object} data - Purchase data with items containing productId, quantity, cost, price (optional)
     * @returns {Promise<number>} - Purchase ID
     */
    static async create(data) {
        // Validate required fields
        if (!data.supplierId) {
            throw new Error('Proveedor es requerido');
        }
        if (!data.items || data.items.length === 0) {
            throw new Error('La compra debe incluir al menos un producto');
        }

        // Validate items have required fields
        for (const item of data.items) {
            if (!item.productId) {
                throw new Error('Cada item debe tener un productId');
            }
            if (item.quantity === undefined || item.quantity <= 0) {
                throw new Error('Cada item debe tener una cantidad válida mayor a 0');
            }
            if (item.cost === undefined || item.cost < 0) {
                throw new Error('Cada item debe tener un costo válido');
            }
        }

        const purchase = {
            supplierId: data.supplierId,
            date: data.date || new Date().toISOString(),
            documentType: data.documentType || 'factura',
            invoiceNumber: data.invoiceNumber || '',
            invoiceDate: data.invoiceDate || '',
            items: data.items || [],
            subtotal: parseFloat(data.subtotal) || 0,
            ivaAmount: parseFloat(data.ivaAmount) || 0,
            total: parseFloat(data.total) || 0,
            status: data.status || 'pending',
            paidAmount: parseFloat(data.paidAmount) || 0,
            dueDate: data.dueDate || null,
            vatMode: data.vatMode || 'net'
        };

        // CRITICAL: Execute purchase creation + stock updates in a single atomic transaction
        // If any operation fails, entire transaction rolls back automatically
        // This ensures Purchase + Product updates + StockMovements are all atomic

        try {
            // Pre-validate items (outside transaction for clear error messages)
            for (const item of purchase.items) {
                const product = await Product.getById(item.productId);
                if (!product) {
                    throw new Error(`Producto no encontrado: ${item.productId}`);
                }
                const newQuantity = parseFloat(item.quantity);
                const newCost = parseFloat(item.cost);
                if (isNaN(newQuantity) || newQuantity <= 0) {
                    throw new Error(`Cantidad inválida para producto ${product.name || item.productId}: ${item.quantity}`);
                }
                if (isNaN(newCost) || newCost < 0) {
                    throw new Error(`Costo inválido para producto ${product.name || item.productId}: ${item.cost}`);
                }
            }

            // CRITICAL FIX: Products are read WITHIN the transaction to prevent race conditions.
            // If another operation changes a product between pre-validation and this transaction,
            // the transaction reads the CURRENT product state and uses it for calculations.
            const priceChanges = [];

            // CRITICAL: Execute purchase creation + stock updates in a single atomic transaction
            let purchaseId;
            if (db.mode === 'sqlite') {
                const result = await ApiClient.post('complex/purchase', { purchase, items: purchase.items });
                if (!result.success) throw new Error(result.error || 'Error al registrar compra en SQLite');
                purchaseId = result.id;
            } else {
                purchaseId = await new Promise((resolve, reject) => {
                    const tx = db.db.transaction(['purchases', 'products', 'stockMovements'], 'readwrite');
                    let resolvedPurchaseId = null;

                    tx.onerror = () => {
                        console.error('Purchase transaction error:', tx.error);
                        reject(new Error(`Transaction failed: ${tx.error?.message || 'Unknown error'}`));
                    };
                    tx.onabort = () => {
                        console.error('Purchase transaction aborted');
                        reject(new Error('Transaction aborted - all operations rolled back'));
                    };
                    tx.oncomplete = () => {
                        resolve(resolvedPurchaseId);
                    };

                    const purchaseStore = tx.objectStore('purchases');
                    const productStore = tx.objectStore('products');
                    const movementStore = tx.objectStore('stockMovements');

                    const purchaseRequest = purchaseStore.add(purchase);

                    purchaseRequest.onsuccess = () => {
                        const pId = purchaseRequest.result;
                        if (!pId || typeof pId !== 'number') {
                            tx.abort();
                            return;
                        }
                        resolvedPurchaseId = pId;

                        for (const item of purchase.items) {
                            const getReq = productStore.get(item.productId);
                            getReq.onsuccess = () => {
                                const product = getReq.result;
                                if (!product) { tx.abort(); return; }

                                const currentStock = parseFloat(product.stock) || 0;
                                const currentCost = parseFloat(product.cost) || 0;
                                const newQuantity = parseFloat(item.quantity);
                                const newCost = parseFloat(item.cost);

                                const averageCost = Product.calculateAverageCost(
                                    currentStock, currentCost, newQuantity, newCost
                                );
                                const newStock = currentStock + newQuantity;
                                const newPrice = item.price !== undefined && item.price !== null
                                    ? parseFloat(item.price)
                                    : product.price;

                                const oldProductPrice = parseFloat(product.price) || 0;
                                if (Math.abs(oldProductPrice - newPrice) >= 0.01) {
                                    priceChanges.push({ productId: item.productId, oldPrice: oldProductPrice, newPrice });
                                }

                                productStore.put({
                                    ...product,
                                    cost: averageCost,
                                    price: newPrice,
                                    stock: newStock,
                                    updatedAt: new Date().toISOString()
                                });

                                movementStore.add({
                                    productId: item.productId,
                                    type: 'purchase',
                                    quantity: newQuantity,
                                    reference: pId,
                                    date: new Date().toISOString(),
                                    reason: `Compra #${pId}`,
                                    // FIX PUR-04: Use actual purchase cost for the movement value, not the pool's average
                                    cost_value: newCost * newQuantity,
                                    sale_value: (newPrice || 0) * newQuantity
                                });
                            };
                        }
                    };

                    purchaseRequest.onerror = () => {
                        tx.abort();
                    };
                });
            }

            // C7: Registrar cambios de precio DESPUÉS de la transacción exitosa
            for (const pc of priceChanges) {
                try {
                    await ProductPriceHistory.recordIfChanged(
                        pc.productId, pc.oldPrice, pc.newPrice,
                        `Compra #${purchaseId}`
                    );
                } catch (_) { /* No bloquear — la compra ya fue exitosa */ }
            }

            return purchaseId;
        } catch (error) {
            console.error('CRITICAL: Purchase transaction failed - all operations rolled back:', error);
            throw new Error(`Error al registrar la compra (operación revertida): ${error.message}`);
        }
    }

    static async update(id, data) {
        return await this._repository.update(id, data);
    }

    /**
     * Delete purchase and revert stock atomically.
     * CRITICAL FIX: Single transaction ensures stock revert + movement creation + purchase deletion
     * all succeed or all fail together.
     */
    static async delete(id) {
        if (db.mode === 'sqlite') {
            const result = await ApiClient.delete(`complex/purchase/${id}`);
            if (!result.success) throw new Error(result.error || 'Error al eliminar compra en SQLite');
            return;
        }

        const purchase = await this.getById(id);
        if (!purchase) throw new Error('Compra no encontrada');

        const items = (purchase.items || []).filter(item => item && item.productId && parseFloat(item.quantity) > 0);

        await new Promise((resolve, reject) => {
            const tx = db.db.transaction(['purchases', 'products', 'stockMovements', 'supplierPayments', 'cashMovements'], 'readwrite');

            tx.onerror = () => reject(new Error(`Error al eliminar compra: ${tx.error?.message || 'Error desconocido'}`));
            tx.onabort = () => reject(new Error('Eliminación abortada: todos los cambios fueron revertidos'));
            tx.oncomplete = () => resolve();

            const purchaseStore = tx.objectStore('purchases');
            const productStore = tx.objectStore('products');
            const movementStore = tx.objectStore('stockMovements');
            const paymentStore = tx.objectStore('supplierPayments');
            const cashStore = tx.objectStore('cashMovements');

            // 1. Revert Stock
            for (const item of items) {
                const qty = parseFloat(item.quantity);
                const getReq = productStore.get(item.productId);
                getReq.onsuccess = () => {
                    const product = getReq.result;
                    if (!product) return;
                    const currentStock = parseFloat(product.stock) || 0;
                    const newStock = currentStock - qty;
                    // Note: We allow negative stock here if necessary, though it shouldn't happen usually
                    productStore.put({
                        ...product,
                        stock: newStock,
                        updatedAt: new Date().toISOString()
                    });
                    movementStore.add({
                        productId: item.productId,
                        type: 'adjustment',
                        quantity: -qty,
                        reference: id,
                        date: new Date().toISOString(),
                        reason: `Anulación Compra #${id}`,
                        cost_value: (product.cost || 0) * qty,
                        sale_value: (product.price || 0) * qty
                    });
                };
            }

            // 2. Revert Payments and Cash Movements
            const paymentIndex = paymentStore.index('purchaseId');
            const getPaymentsReq = paymentIndex.getAll(id);
            getPaymentsReq.onsuccess = () => {
                const payments = getPaymentsReq.result;
                for (const payment of payments) {
                    // Si fue efectivo, buscar y borrar movimiento de caja
                    if (payment.method === 'cash') {
                        // En IndexedDB buscamos por paymentId si está indexado, si no por descripción
                        // (Asumimos que CashMovement indexa paymentId en versiones recientes)
                        try {
                            const cashIndex = cashStore.index('paymentId');
                            const movementsReq = cashIndex.getAll(payment.id);
                            movementsReq.onsuccess = () => {
                                movementsReq.result.forEach(m => cashStore.delete(m.id));
                            };
                        } catch (e) {
                            // Fallback a búsqueda manual por razón si no hay índice
                            const getAllCash = cashStore.openCursor();
                            getAllCash.onsuccess = (e) => {
                                const cursor = e.target.result;
                                if (cursor) {
                                    const m = cursor.value;
                                    if (m.amount === payment.amount && m.reason.includes(`Compra #${id}`)) {
                                        cashStore.delete(m.id);
                                    }
                                    cursor.continue();
                                }
                            };
                        }
                    }
                    paymentStore.delete(payment.id);
                }
            };

            // 3. Delete purchase record
            purchaseStore.delete(id);
        });
    }

    static async getById(id) {
        return await this._repository.findById(id);
    }

    static async getAll() {
        return await this._repository.findAll();
    }

    /**
     * C6: Obtener solo las compras más recientes para optimización de carga.
     * @param {number} limit 
     */
    static async getLatest(limit = 50) {
        if (db.mode === 'sqlite') {
            return await ApiClient.get('purchases/list/latest', { limit });
        }
        return (await this.getAll()).slice(0, limit);
    }

    /**
     * C6: Obtener resumen estadístico y de deudas directamente del servidor.
     */
    static async getStatsSummary() {
        if (db.mode === 'sqlite') {
            return await ApiClient.get('purchases/stats/summary');
        }
        // Fallback para IndexedDB si es necesario (aunque el modo forzado es SQLite)
        return null;
    }

    static async getBySupplier(supplierId) {
        return await this._repository.findBySupplierId(supplierId);
    }

    static async getPending() {
        return await this._repository.findPending();
    }

    /**
     * Register payment (IMMUTABLE)
     * @param {number} id - Purchase ID
     * @param {number} amount - Payment amount
     * @returns {Promise<Object>} - Updated purchase
     */
    static async registerPayment(id, amount) {
        const purchase = await this.getById(id);
        if (!purchase) throw new Error('Compra no encontrada');

        const paymentAmount = parseFloat(amount) || 0;
        const newPaidAmount = (parseFloat(purchase.paidAmount) || 0) + paymentAmount;
        const isFullyPaid = newPaidAmount >= purchase.total;

        // Create updated purchase object (IMMUTABLE)
        const updated = {
            ...purchase,
            paidAmount: newPaidAmount,
            status: isFullyPaid ? 'paid' : purchase.status
        };

        await this._repository.replace(updated);
        return await this.getById(id);
    }

    static async getAccountsPayable() {
        const pending = await this.getPending();
        return pending.reduce((sum, p) => sum + (p.total - (p.paidAmount || 0)), 0);
    }

    /**
     * Get purchases by date range
     * @param {Date|string} startDate
     * @param {Date|string} endDate
     * @returns {Promise<Array>}
     */
    static async getByDateRange(startDate, endDate) {
        return await this._repository.findByDateRange(startDate, endDate);
    }
}
