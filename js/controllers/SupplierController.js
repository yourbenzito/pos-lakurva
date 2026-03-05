class SupplierController {
    static async loadSuppliers() {
        return await Supplier.getAll();
    }

    static async saveSupplier(data) {
        if (!data.name) {
            throw new Error('El nombre es requerido');
        }

        if (data.id) {
            // C8: Permiso para editar proveedor
            PermissionService.require('suppliers.edit', 'editar proveedores');
            await Supplier.update(data.id, data);
            showNotification('Proveedor actualizado', 'success');
        } else {
            // C8: Permiso para crear proveedor
            PermissionService.require('suppliers.create', 'crear proveedores');
            await Supplier.create(data);
            showNotification('Proveedor creado', 'success');
        }
    }

    static async deleteSupplier(id) {
        // C8: Permiso para desactivar proveedor
        PermissionService.require('suppliers.delete', 'desactivar proveedores');
        await Supplier.delete(id);
        showNotification('Proveedor desactivado. Ya no aparecerá en listados ni compras nuevas.', 'success');
    }

    /**
     * C1: Restaurar un proveedor desactivado
     * @param {number} id - Supplier ID
     */
    static async restoreSupplier(id) {
        PermissionService.require('suppliers.delete', 'restaurar proveedores');
        await Supplier.restore(id);
        showNotification('Proveedor restaurado y activo nuevamente.', 'success');
    }

    static async searchSuppliers(term) {
        if (!term) return await Supplier.getAll();
        return await Supplier.search(term);
    }

    static async savePurchase(data) {
        if (!data.supplierId || !data.items || data.items.length === 0) {
            throw new Error('Proveedor e items son requeridos');
        }

        if (data.id) {
            // C8: Permiso para editar compra
            PermissionService.require('purchases.edit', 'editar compras');
            // ===== B2 FIX: Edición de compra con rollback manual =====
            // Fase 1: Lectura y cálculo de deltas (sin cambios en BD)
            const purchaseId = data.id;
            const old = await Purchase.getById(purchaseId);
            if (!old) throw new Error('Compra no encontrada');
            const oldItems = old.items || [];
            const newItems = data.items || [];
            const oldByProduct = new Map();
            for (const i of oldItems) {
                oldByProduct.set(i.productId, (oldByProduct.get(i.productId) || 0) + (parseFloat(i.quantity) || 0));
            }
            const newByProduct = new Map();
            for (const i of newItems) {
                newByProduct.set(i.productId, (newByProduct.get(i.productId) || 0) + (parseFloat(i.quantity) || 0));
            }
            const oldProductIds = new Set(oldByProduct.keys());
            const newProductIds = new Set(newByProduct.keys());
            const removedItems = oldItems.filter(i => !newProductIds.has(i.productId));
            const newItemsOnly = newItems.filter(i => !oldProductIds.has(i.productId));
            const deltas = [];
            for (const [productId, newQty] of newByProduct) {
                if (!oldByProduct.has(productId)) continue;
                const delta = newQty - (oldByProduct.get(productId) || 0);
                if (delta !== 0) deltas.push({ productId, quantityDelta: delta });
            }

            // Fase 2: Prevalidar stock suficiente para operaciones de resta
            for (const item of removedItems) {
                const qty = parseFloat(item.quantity) || 0;
                if (qty <= 0) continue;
                const product = await Product.getById(item.productId);
                if (!product) throw new Error(`Producto #${item.productId} no encontrado para revertir`);
                if ((parseFloat(product.stock) || 0) < qty) {
                    throw new Error(`Stock insuficiente para revertir ${item.productId}. Disponible: ${product.stock}, necesita: ${qty}`);
                }
            }
            for (const { productId, quantityDelta } of deltas) {
                if (quantityDelta >= 0) continue;
                const qty = Math.abs(quantityDelta);
                const product = await Product.getById(productId);
                if (!product) throw new Error(`Producto #${productId} no encontrado para ajustar delta`);
                if ((parseFloat(product.stock) || 0) < qty) {
                    throw new Error(`Stock insuficiente para ajuste de compra. Producto: ${product.name}, disponible: ${product.stock}, resta: ${qty}`);
                }
            }

            // CRITICAL FIX: Build unified product operations map, then execute ALL changes
            // (stock + movements + purchase update + cost/price) in a SINGLE atomic transaction.
            // If any fails, everything rolls back automatically. No orphan movements.
            const productOps = new Map();

            for (const item of removedItems) {
                const qty = parseFloat(item.quantity) || 0;
                if (qty <= 0) continue;
                const existing = productOps.get(item.productId) || { stockDelta: 0 };
                existing.stockDelta -= qty;
                productOps.set(item.productId, existing);
            }
            for (const item of newItemsOnly) {
                const qty = parseFloat(item.quantity) || 0;
                if (qty <= 0) continue;
                const existing = productOps.get(item.productId) || { stockDelta: 0 };
                existing.stockDelta += qty;
                productOps.set(item.productId, existing);
            }
            for (const { productId, quantityDelta } of deltas) {
                if (quantityDelta === 0) continue;
                const existing = productOps.get(productId) || { stockDelta: 0 };
                existing.stockDelta += quantityDelta;
                productOps.set(productId, existing);
            }
            // Add cost/price info from new purchase items (for weighted average)
            for (const item of newItems) {
                const existing = productOps.get(item.productId) || { stockDelta: 0 };
                existing.newCost = parseFloat(item.cost) || 0;
                existing.newPrice = item.price !== undefined ? parseFloat(item.price) : undefined;
                existing.itemQty = parseFloat(item.quantity) || 0;
                productOps.set(item.productId, existing);
            }

            if (db.mode === 'sqlite') {
                const productOpsObj = {};
                for (const [pid, o] of productOps) {
                    productOpsObj[pid] = o;
                }
                const result = await ApiClient.put(`complex/purchase/${purchaseId}`, {
                    purchaseData: data,
                    productOps: productOpsObj
                });
                if (!result.success) throw new Error(result.error || 'Error en edición de compra SQLite');
                showNotification('Compra actualizada', 'success');
                return;
            }

            await new Promise((resolve, reject) => {
                if (!db.db) return reject(new Error('Base de datos no inicializada'));
                const tx = db.db.transaction(['purchases', 'products', 'stockMovements'], 'readwrite');

                tx.onerror = () => reject(new Error(`Error al editar compra: ${tx.error?.message || 'Error desconocido'}`));
                tx.onabort = () => reject(new Error('Edición de compra abortada: todos los cambios revertidos'));
                tx.oncomplete = () => resolve();

                const purchaseStore = tx.objectStore('purchases');
                const productStore = tx.objectStore('products');
                const movementStore = tx.objectStore('stockMovements');

                // Update purchase record within transaction
                const getPurchaseReq = purchaseStore.get(purchaseId);
                getPurchaseReq.onsuccess = () => {
                    const existingPurchase = getPurchaseReq.result;
                    if (!existingPurchase) { tx.abort(); return; }
                    purchaseStore.put({
                        ...existingPurchase,
                        ...data,
                        id: purchaseId,
                        updatedAt: new Date().toISOString()
                    });
                };

                // Process each product operation (read WITHIN transaction)
                for (const [productId, ops] of productOps) {
                    const getReq = productStore.get(productId);
                    getReq.onsuccess = () => {
                        const product = getReq.result;
                        if (!product) { tx.abort(); return; }

                        const currentStock = parseFloat(product.stock) || 0;
                        const newStock = currentStock + ops.stockDelta;
                        if (newStock < 0) { tx.abort(); return; }

                        // Calculate weighted average cost if purchase includes this item
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

                        productStore.put({
                            ...product,
                            stock: newStock,
                            cost: newCost,
                            price: newPrice,
                            updatedAt: new Date().toISOString()
                        });

                        // Create stock movement if stock changed
                        if (ops.stockDelta !== 0) {
                            movementStore.add({
                                productId,
                                type: ops.stockDelta > 0 ? 'purchase' : 'adjustment',
                                quantity: ops.stockDelta,
                                reference: purchaseId,
                                date: new Date().toISOString(),
                                reason: `Edición compra #${purchaseId}`,
                                cost_value: Math.abs(ops.stockDelta) * (parseFloat(newCost) || 0),
                                sale_value: Math.abs(ops.stockDelta) * (parseFloat(newPrice) || 0)
                            });
                        }
                    };
                }
            });
            showNotification('Compra actualizada', 'success');
        } else {
            // C8: Permiso para crear compra
            PermissionService.require('purchases.create', 'crear compras');

            // Check if user wants to deduct initial paidAmount from cash register now
            const deductFromCash = data.paidAmount > 0 && data.deductFromCashRegister === true;
            let openCash = null;
            if (deductFromCash) {
                openCash = await CashRegister.getOpen();
                if (!openCash || !openCash.id) {
                    throw new Error('La caja está cerrada. Para registrar este pago como un egreso de efectivo hoy, primero debes abrir la caja. Si pagaste mediante transferencia o crédito (sin tocar dinero físico hoy), desmarca la opción "Extraer de Caja" en la fase de Pago.');
                }
            }

            const newPurchaseId = await Purchase.create(data);

            if (deductFromCash && openCash) {
                const supplierObj = await Supplier.getById(data.supplierId);
                const desc = `Pago inicial compra a proveedor: ${supplierObj ? supplierObj.name : data.supplierId} (Compra #${newPurchaseId})`;

                // First create the payment record to get its ID
                const paymentId = await SupplierPayment.create({
                    supplierId: data.supplierId,
                    purchaseId: newPurchaseId,
                    amount: parseFloat(data.paidAmount),
                    method: 'cash',
                    reference: 'Pago al momento de comprar',
                    notes: ''
                });

                // Then create cash movement linked to this payment ID
                await CashMovement.create({
                    cashRegisterId: openCash.id,
                    type: 'out',
                    amount: parseFloat(data.paidAmount),
                    reason: desc,
                    paymentId: paymentId // FIX: Link so deletion can find it
                });
            } else if (parseFloat(data.paidAmount) > 0) {
                // Even if we don't deduct from cash, if there's a paidAmount, record it as a generic payment
                await SupplierPayment.create({
                    supplierId: data.supplierId,
                    purchaseId: newPurchaseId,
                    amount: parseFloat(data.paidAmount),
                    method: 'other', // Or default method
                    reference: 'Abono inicial en compra',
                    notes: ''
                });
            }

            showNotification('Compra registrada', 'success');
        }
    }

    static async deletePurchase(id) {
        // C8: Permiso para eliminar compra
        PermissionService.require('purchases.delete', 'eliminar compras');

        showConfirm('¿Estás seguro de que deseas eliminar esta compra? El stock de los productos se revertirá y cualquier pago asociado (incluyendo caja) será anulado.', async () => {
            try {
                await Purchase.delete(id);
                showNotification('Compra eliminada y stock revertido exitosamente', 'success');
                app.navigate('purchases');
            } catch (error) {
                showNotification('Error al eliminar compra: ' + error.message, 'error');
            }
        });
    }

    static async registerPayment(purchaseId, amount, method = 'cash', deductFromCashRegister = false) {
        // C8: Permiso para registrar pago de compra
        PermissionService.require('purchases.pay', 'registrar pagos de compras');

        const purchase = await Purchase.getById(purchaseId);
        if (!purchase) throw new Error('Compra no encontrada');

        await SupplierPaymentService.registerPayment({
            supplierId: purchase.supplierId,
            purchaseId: purchaseId,
            amount: amount,
            method: method,
            deductFromCashRegister: deductFromCashRegister
        });

        showNotification('Pago registrado', 'success');
    }

    static async getPurchaseHistory(supplierId) {
        const supplier = await Supplier.getById(supplierId);
        const purchases = await Purchase.getBySupplier(supplierId);

        return {
            supplier,
            purchases,
            totalPurchases: purchases.length,
            totalAmount: purchases.reduce((sum, p) => sum + p.total, 0),
            totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
            totalPending: purchases.reduce((sum, p) => sum + (p.total - p.paidAmount), 0)
        };
    }

    static async getAccountsPayable() {
        return await Purchase.getAccountsPayable();
    }
}
