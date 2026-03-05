/**
 * C6: Supplier Payment Service
 * Lógica de negocio para registrar pagos a proveedores.
 * 
 * Separación contable:
 *   - Compra = obligación (deuda)
 *   - Pago = evento de caja (reduce deuda)
 *   - Deuda = total compras - total pagos
 * 
 * Reglas:
 *   - No se modifican compras existentes.
 *   - Los pagos son inmutables.
 *   - El pago puede ir vinculado a una compra específica (purchaseId) o ser un pago general al proveedor (purchaseId = null).
 *   - Se actualiza el campo paidAmount/status de Purchase SOLO por compatibilidad con la UI existente.
 */
class SupplierPaymentService {

    /**
     * Register a new payment to a supplier.
     * @param {Object} data - { supplierId, purchaseId?, amount, method, reference, notes }
     * @returns {Promise<{paymentId: number, purchase?: Object}>}
     */
    static async registerPayment(data) {
        // --- Validaciones ---
        if (!data.supplierId) throw new Error('Proveedor es requerido');
        const amount = parseFloat(data.amount) || 0;
        if (amount <= 0) throw new Error('El monto del pago debe ser mayor a 0');

        const supplier = await Supplier.getById(data.supplierId);
        if (!supplier) throw new Error('Proveedor no encontrado');

        let purchase = null;
        let purchasesToUpdate = [];

        // Si el pago es contra una compra específica, validar
        if (data.purchaseId) {
            purchase = await Purchase.getById(data.purchaseId);
            if (!purchase) throw new Error('Compra no encontrada');
            if (purchase.supplierId !== data.supplierId) {
                throw new Error('La compra no pertenece al proveedor indicado');
            }

            // Calcular deuda de ESA compra usando pagos registrados
            const paidForPurchase = await SupplierPayment.getTotalPaidForPurchase(data.purchaseId);
            const legacyPaid = parseFloat(purchase.paidAmount) || 0;
            const effectivePaid = Math.max(paidForPurchase, legacyPaid);
            const purchaseBalance = (parseFloat(purchase.total) || 0) - effectivePaid;

            if (amount > purchaseBalance + 0.01) {
                throw new Error(
                    `El monto ($${Math.round(amount).toLocaleString('es-CL')}) excede la deuda pendiente de esta compra ` +
                    `($${Math.round(purchaseBalance).toLocaleString('es-CL')})`
                );
            }
            purchasesToUpdate.push({ purchase, amountToApply: amount });
        } else {
            // Pago general: implementar auto-asignación FIFO (First-In-First-Out)
            // Buscamos todas las compras pendientes del proveedor
            const allPurchases = await Purchase.getBySupplier(data.supplierId);
            const pendingPurchases = allPurchases
                .filter(p => p.status !== 'paid')
                .sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

            let remainingAmount = amount;
            for (const p of pendingPurchases) {
                if (remainingAmount <= 0.01) break;

                const total = parseFloat(p.total) || 0;
                const currentPaid = parseFloat(p.paidAmount) || 0;
                const balance = Math.max(0, total - currentPaid);

                if (balance > 0) {
                    const apply = Math.min(remainingAmount, balance);
                    purchasesToUpdate.push({ purchase: p, amountToApply: apply });
                    remainingAmount -= apply;
                }
            }

            const totalDebt = await this.getSupplierDebt(data.supplierId);
            if (amount > totalDebt + 0.01 && totalDebt > 0) {
                console.warn(`Pago ($${amount}) excede deuda ($${totalDebt}) del proveedor #${data.supplierId}. Se registra como anticipo.`);
            }
        }

        const deductFromCash = data.method === 'cash' && data.deductFromCashRegister === true;
        let openCash = null;
        if (deductFromCash) {
            openCash = await CashRegister.getOpen();
            if (!openCash || !openCash.id) {
                throw new Error('No hay una caja abierta para extraer el efectivo');
            }
        }

        // --- Crear pago inmutable ---
        const paymentId = await SupplierPayment.create({
            supplierId: data.supplierId,
            purchaseId: data.purchaseId || null,
            amount: amount,
            method: data.method || 'cash',
            reference: data.reference || '',
            notes: data.notes || ''
        });

        if (deductFromCash && openCash) {
            let desc = `Pago a proveedor: ${supplier.name}`;
            if (data.purchaseId) desc += ` (Compra #${data.purchaseId})`;
            else desc += ` (Pago General)`;

            await CashMovement.create({
                cashRegisterId: openCash.id,
                type: 'out',
                amount: amount,
                reason: desc,
                paymentId: paymentId // Link the movement to the payment for reversal
            });
        }

        // --- Compatibilidad: actualizar Purchases afectados ---
        for (const item of purchasesToUpdate) {
            try {
                const p = item.purchase;
                const appAmount = item.amountToApply;
                const newPaidAmount = (parseFloat(p.paidAmount) || 0) + appAmount;
                const isFullyPaid = newPaidAmount >= (parseFloat(p.total) || 0) - 0.01;

                await Purchase.update(p.id, {
                    ...p,
                    paidAmount: newPaidAmount,
                    status: isFullyPaid ? 'paid' : p.status
                });
            } catch (err) {
                console.error(`C6: Error al actualizar Purchase #${item.purchase.id} (compatibilidad):`, err);
            }
        }

        return { paymentId, affectedPurchasesCount: purchasesToUpdate.length };
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
            // Un pago se considera "específico" solo si la compra existe todavía en la base de datos
            if (p.purchaseId && purchaseIds.has(p.purchaseId)) {
                paymentsByPurchase[p.purchaseId] = (paymentsByPurchase[p.purchaseId] || 0) + (parseFloat(p.amount) || 0);
            } else {
                // Si la compra fue eliminada o el pago era general, va a la bolsa de pagos generales
                generalPayments += parseFloat(p.amount) || 0;
            }
        }

        let totalDebt = 0;
        for (const purchase of purchases) {
            const total = parseFloat(purchase.total) || 0;
            const legacyPaid = parseFloat(purchase.paidAmount) || 0;
            const registeredPaid = paymentsByPurchase[purchase.id] || 0;
            // Usar el mayor para compatibilidad legacy
            const effectivePaid = Math.max(legacyPaid, registeredPaid);
            const balance = Math.max(0, total - effectivePaid);
            totalDebt += balance;
        }

        // Restar pagos generales (incluyendo los que quedaron huérfanos por compras eliminadas)
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

        // Agrupar pagos por purchaseId
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
        const suppliers = await Supplier.getAllIncludingDeleted();
        const result = [];

        for (const supplier of suppliers) {
            const purchases = await Purchase.getBySupplier(supplier.id);
            if (purchases.length === 0) continue;

            const totalPurchases = purchases.reduce((s, p) => s + (parseFloat(p.total) || 0), 0);
            const totalDebt = await this.getSupplierDebt(supplier.id);
            const totalPaid = totalPurchases - totalDebt;

            if (totalDebt > 0 || totalPurchases > 0) {
                result.push({
                    supplier,
                    totalPurchases,
                    totalPaid,
                    totalDebt,
                    purchaseCount: purchases.length
                });
            }
        }

        return result.sort((a, b) => b.totalDebt - a.totalDebt);
    }
}
