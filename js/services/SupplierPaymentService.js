/**
 * C6: Supplier Payment Service
 * Handles complex logic for registering payments to suppliers and calculating debts.
 * Rules:
 *   - No se modifican compras existentes.
 *   - Los pagos son inmutables.
 *  - El pago puede ir vinculado a una compra específica (purchaseId) o ser un pago general al proveedor (purchaseId = null).
 *   - Se actualiza el campo paidAmount/status de Purchase SOLO por compatibilidad con la UI existente.
 */
class SupplierPaymentService {
    static _summaryCache = null;
    static _lastSummaryTime = 0;
    static CACHE_TTL = 3000; // 3 seconds cache

    /**
     * Register a new payment to a supplier.
     * @param {Object} data - {supplierId, purchaseId, amount, method, reference, notes, deductFromCashRegister}
     */
    static async registerPayment(data) {
        if (!data.amount || data.amount <= 0) throw new Error('El monto debe ser mayor a 0');

        const payment = {
            supplierId: data.supplierId,
            purchaseId: data.purchaseId || null,
            amount: parseFloat(data.amount),
            method: data.method || 'cash',
            reference: data.reference || '',
            notes: data.notes || '',
            date: new Date().toISOString()
        };

        const result = await SupplierPayment.create(payment);
        const paymentId = result;

        // 1. Si se vinculó a una compra, actualizar esa compra por compatibilidad
        if (data.purchaseId) {
            try {
                await Purchase.registerPayment(data.purchaseId, data.amount);
            } catch (error) {
                console.warn('C6: Error actualizando paidAmount de compra (legacy), pero el pago se registró:', error);
            }
        } else {
            // Si es pago general, intentar distribuirlo en compras pendientes por compatibilidad legacy
            try {
                const pending = await Purchase.getBySupplier(data.supplierId);
                let remainingAmount = data.amount;
                for (const p of pending.filter(p => p.status === 'pending')) {
                    if (remainingAmount <= 0) break;
                    const debt = p.total - (p.paidAmount || 0);
                    const toPay = Math.min(debt, remainingAmount);
                    if (toPay > 0) {
                        await Purchase.registerPayment(p.id, toPay);
                        remainingAmount -= toPay;
                    }
                }
            } catch (_) { /* Fallback silencioso para legacy */ }
        }

        // 2. Si es efectivo, registrar movimiento de salida en caja
        if (data.deductFromCashRegister && (payment.method === 'cash' || payment.method === 'efectivo')) {
            try {
                const currentRegister = await CashRegister.getCurrent();
                if (currentRegister) {
                    const supplier = await Supplier.getById(data.supplierId);
                    const reason = `Pago a Proveedor: ${supplier ? supplier.name : '#' + data.supplierId} ${data.purchaseId ? '(Compra #' + data.purchaseId + ')' : '(General)'}`;
                    await CashRegister.addMovement({
                        cashRegisterId: currentRegister.id,
                        type: 'out',
                        amount: data.amount,
                        reason: reason,
                        paymentId: paymentId // Vincular para anulación
                    });
                }
            } catch (error) {
                console.error('C6: Error registrando egreso en caja:', error);
            }
        }

        this._summaryCache = null; // Invalida cache
        return paymentId;
    }

    /**
     * Calculate total debt for a supplier.
     * Deuda = total de compras pendientes - total pagos registrados.
     * 
     * Compatibilidad: para compras antiguas que ya tienen paidAmount mutado,
     * se usa el MAYOR entre: pagos registrados en supplierPayments vs purchase.paidAmount.
     * 
     * @param {number} supplierId
     * @returns {Promise<number>}
     */
    static async getSupplierDebt(supplierId) {
        const purchases = await Purchase.getBySupplier(supplierId);
        const payments = await SupplierPayment.getBySupplier(supplierId);
        
        // Agrupar pagos por purchaseId
        const purchaseIds = new Set(purchases.map(p => p.id));
        const paymentsByPurchase = {};
        let generalPayments = 0;

        for (const p of payments) {
            const amt = parseFloat(p.amount) || 0;
            if (p.purchaseId && purchaseIds.has(p.purchaseId)) {
                paymentsByPurchase[p.purchaseId] = (paymentsByPurchase[p.purchaseId] || 0) + amt;
            } else {
                generalPayments += amt;
            }
        }

        let totalDebt = 0;
        for (const purchase of purchases) {
            const total = parseFloat(purchase.total) || 0;
            const legacyPaid = parseFloat(purchase.paidAmount) || 0;
            const registeredPaid = paymentsByPurchase[purchase.id] || 0;
            
            const effectivePaid = Math.max(legacyPaid, registeredPaid);
            const balance = Math.max(0, total - effectivePaid);
            totalDebt += balance;
        }

        totalDebt = Math.max(0, totalDebt - generalPayments);
        return totalDebt;
    }

    /**
     * Get debt per purchase for a supplier.
     * @param {number} supplierId
     * @returns {Promise<Array<{purchase, balance, payments}>>}
     */
    static async getDebtDetail(supplierId) {
        const purchases = await Purchase.getBySupplier(supplierId);
        const payments = await SupplierPayment.getBySupplier(supplierId);
        
        const paymentsByPurchase = {};
        for (const p of payments) {
            if (p.purchaseId) {
                if (!paymentsByPurchase[p.purchaseId]) paymentsByPurchase[p.purchaseId] = [];
                paymentsByPurchase[p.purchaseId].push(p);
            }
        }

        const detail = [];
        for (const purchase of purchases) {
            const total = parseFloat(purchase.total) || 0;
            const legacyPaid = parseFloat(purchase.paidAmount) || 0;
            const purchasePayments = paymentsByPurchase[purchase.id] || [];
            const registeredPaid = purchasePayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            const effectivePaid = Math.max(legacyPaid, registeredPaid);
            const balance = Math.max(0, total - effectivePaid);

            detail.push({
                purchase,
                totalPaid: effectivePaid,
                balance,
                payments: purchasePayments
            });
        }

        return detail.sort((a, b) => new Date(b.purchase.date) - new Date(a.purchase.date));
    }

    /**
     * Summary of all supplier debts (cuentas por pagar).
     * @returns {Promise<Array<{supplier, totalPurchases, totalPaid, totalDebt}>>}
     */
    static async getAccountsPayableSummary() {
        try {
            const now = Date.now();
            if (this._summaryCache && (now - this._lastSummaryTime < this.CACHE_TTL)) {
                return this._summaryCache;
            }

            // C6: Optimización CRÍTICA - Si estamos en SQLite, pedir el resumen calculado al servidor
            if (db.mode === 'sqlite') {
                const data = await Purchase.getStatsSummary();
                if (data && data.creditors) {
                    this._summaryCache = data.creditors;
                    this._lastSummaryTime = now;
                    return this._summaryCache;
                }
            }

            // Fallback (solo si el servidor falla o estamos en IndexedDB local)
            const suppliers = await Supplier.getAllIncludingDeleted();
            const allPurchases = await Purchase.getAll();
            const allPayments = await SupplierPayment.getAll();
            
            const result = [];

            // Agrupar compras y pagos por proveedor para procesamiento O(N)
            const purchasesBySupplier = {};
            for (const p of allPurchases) {
                if (!purchasesBySupplier[p.supplierId]) purchasesBySupplier[p.supplierId] = [];
                purchasesBySupplier[p.supplierId].push(p);
            }

            const paymentsBySupplier = {};
            for (const p of allPayments) {
                if (!paymentsBySupplier[p.supplierId]) paymentsBySupplier[p.supplierId] = [];
                paymentsBySupplier[p.supplierId].push(p);
            }

            for (const supplier of suppliers) {
                const purchases = purchasesBySupplier[supplier.id] || [];
                if (purchases.length === 0) continue;

                const payments = paymentsBySupplier[supplier.id] || [];
                
                // Calcular deuda localmente sin nuevas peticiones API
                const purchaseIds = new Set(purchases.map(p => p.id));
                const paymentsByPurchase = {};
                let generalPayments = 0;

                for (const p of payments) {
                    const amt = parseFloat(p.amount) || 0;
                    if (p.purchaseId && purchaseIds.has(p.purchaseId)) {
                        paymentsByPurchase[p.purchaseId] = (paymentsByPurchase[p.purchaseId] || 0) + amt;
                    } else {
                        generalPayments += amt;
                    }
                }

                let totalDebt = 0;
                let totalPurchases = 0;
                let pendingCount = 0;

                for (const p of purchases) {
                    const total = parseFloat(p.total) || 0;
                    totalPurchases += total;
                    
                    const legacyPaid = parseFloat(p.paidAmount) || 0;
                    const registeredPaid = paymentsByPurchase[p.id] || 0;
                    const effectivePaid = Math.max(legacyPaid, registeredPaid);
                    const balance = Math.max(0, total - effectivePaid);
                    
                    totalDebt += balance;
                    if (balance > 0.01) pendingCount++;
                }

                totalDebt = Math.max(0, totalDebt - generalPayments);
                const totalPaid = totalPurchases - totalDebt;

                if (totalDebt > 0.01) {
                    result.push({
                        supplier,
                        totalPurchases,
                        totalPaid,
                        totalDebt,
                        purchaseCount: purchases.length,
                        pendingCount
                    });
                }
            }

            this._summaryCache = result.sort((a, b) => b.totalDebt - a.totalDebt);
            this._lastSummaryTime = now;
            return this._summaryCache;
        } catch (error) {
            console.error('C6: Error en getAccountsPayableSummary:', error);
            return [];
        }
    }
}
