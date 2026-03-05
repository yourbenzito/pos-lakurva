class CashRegister {
    static _repository = new CashRegisterRepository();

    static async open(initialAmount, denominations = null) {
        const openCash = await this.getOpen();
        if (openCash) {
            throw new Error('Ya existe una caja abierta');
        }

        const cashRegister = {
            openDate: new Date().toISOString(),
            closeDate: null,
            initialAmount: parseFloat(initialAmount) || 0,
            finalAmount: 0,
            expectedAmount: 0,
            difference: 0,
            status: 'open',
            userId: 1,
            denominations: denominations || null,
            paymentSummary: {
                cash: 0,
                card: 0,
                qr: 0,
                other: 0
            }
        };

        return await this._repository.create(cashRegister);
    }

    /**
     * Close cash register (IMMUTABLE)
     * @param {number} id - Cash register ID
     * @param {number} finalAmount - Final cash amount
     * @returns {Promise<void>}
     */
    static async close(id, finalAmount) {
        const cashRegister = await this.getById(id);
        if (!cashRegister) throw new Error('Caja no encontrada');
        if (cashRegister.status === 'closed') throw new Error('La caja ya está cerrada');

        const salesPaymentSummary = await Sale.getTotalByPaymentMethod(id);
        // Sale.getTotalByPaymentMethod ya incluye ventas por método Y pagos de deuda (Payment.getBySale por venta). No sumar Payment.getByCashRegister para evitar duplicación.
        const paymentSummary = {
            cash: salesPaymentSummary.cash || 0,
            card: salesPaymentSummary.card || 0,
            qr: salesPaymentSummary.qr || 0,
            other: salesPaymentSummary.other || 0
        };

        const movements = await CashMovement.getByCashRegister(id);
        let totalCashIn = 0;
        let totalRetiros = 0;
        movements.forEach(m => {
            if (m.type === 'in') {
                totalCashIn += parseFloat(m.amount);
            } else {
                // TODOS los retiros (incluidos gastos/compras) deben restar del efectivo esperado
                totalRetiros += parseFloat(m.amount);
            }
        });

        const expectedCash = cashRegister.initialAmount + paymentSummary.cash + totalCashIn - totalRetiros;
        const finalAmountParsed = parseFloat(finalAmount);

        // Create updated cash register object (IMMUTABLE)
        const updated = {
            ...cashRegister,
            closeDate: new Date().toISOString(),
            finalAmount: finalAmountParsed,
            expectedAmount: expectedCash,
            difference: finalAmountParsed - expectedCash,
            status: 'closed',
            paymentSummary: paymentSummary
        };

        return await this._repository.replace(updated);
    }

    static async getOpen() {
        return await this._repository.findOpen();
    }

    static async getById(id) {
        return await this._repository.findById(id);
    }

    static async getAll() {
        return await this._repository.findAll();
    }

    /**
     * Create a historical closed cash register (for retroactive records)
     * @param {Object} data - Historical cash register data
     * @param {string} data.openDate - Opening date (ISO string)
     * @param {string} data.closeDate - Closing date (ISO string)
     * @param {number} data.initialAmount - Initial cash amount
     * @param {number} data.finalAmount - Final cash amount
     * @param {Object} data.paymentSummary - Payment summary by method
     * @returns {Promise<number>} - Cash register ID
     */
    static async createHistorical(data) {
        const {
            openDate,
            closeDate,
            initialAmount = 0,
            finalAmount,
            paymentSummary = { cash: 0, card: 0, qr: 0, other: 0 }
        } = data;

        if (!openDate || !closeDate) {
            throw new Error('openDate y closeDate son requeridos para crear un registro histórico');
        }

        if (finalAmount === undefined || finalAmount === null) {
            throw new Error('finalAmount es requerido');
        }

        // Calculate expected cash (solo efectivo físico en caja; card/qr/other no se cuentan)
        const expectedCash = initialAmount + (paymentSummary.cash || 0);
        const difference = finalAmount - expectedCash;

        const cashRegister = {
            openDate: openDate,
            closeDate: closeDate,
            initialAmount: parseFloat(initialAmount) || 0,
            finalAmount: parseFloat(finalAmount),
            expectedAmount: expectedCash,
            difference: difference,
            status: 'closed',
            userId: 1,
            denominations: null,
            paymentSummary: {
                cash: parseFloat(paymentSummary.cash) || 0,
                card: parseFloat(paymentSummary.card) || 0,
                qr: parseFloat(paymentSummary.qr) || 0,
                other: parseFloat(paymentSummary.other) || 0
            }
        };

        return await this._repository.create(cashRegister);
    }

    /**
     * Delete a cash register
     * WARNING: This will delete the cash register record. Associated data (sales, payments, expenses, movements) will remain but won't be linked to this register.
     * @param {number} id - Cash register ID
     * @returns {Promise<void>}
     */
    static async delete(id) {
        const cashRegister = await this.getById(id);
        if (!cashRegister) {
            throw new Error('Caja no encontrada');
        }

        // No permitir eliminar cajas abiertas
        if (cashRegister.status === 'open') {
            throw new Error('No se puede eliminar una caja abierta. Debes cerrarla primero.');
        }

        return await this._repository.delete(id);
    }

    static async getSummary(id) {
        const cashRegister = await this.getById(id);
        if (!cashRegister) return null;

        const sales = await Sale.getByCashRegister(id);
        const payments = await Payment.getByCashRegister(id);

        const totalSalesAmount = sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        const totalSalesCount = sales.length;

        const totalDebtPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const debtPaymentSummary = {
            cash: 0,
            card: 0,
            qr: 0,
            other: 0
        };
        payments.forEach(payment => {
            const method = payment.paymentMethod || 'cash';
            if (debtPaymentSummary[method] !== undefined) {
                debtPaymentSummary[method] += parseFloat(payment.amount) || 0;
            }
        });

        // Sale.getTotalByPaymentMethod ya incluye ventas por método Y pagos de deuda (Payment.getBySale por venta). No sumar debtPaymentSummary para evitar duplicación.
        let paymentSummary = await Sale.getTotalByPaymentMethod(id);
        if (!paymentSummary) paymentSummary = { cash: 0, card: 0, qr: 0, other: 0 };
        paymentSummary = {
            cash: paymentSummary.cash || 0,
            card: paymentSummary.card || 0,
            qr: paymentSummary.qr || 0,
            other: paymentSummary.other || 0
        };

        // Movimientos de caja: todos los retiros restan del efectivo esperado
        const movements = await CashMovement.getByCashRegister(id);
        let totalCashIn = 0;
        let totalRetiros = 0;
        movements.forEach(m => {
            if (m.type === 'in') {
                totalCashIn += parseFloat(m.amount);
            } else {
                totalRetiros += parseFloat(m.amount);
            }
        });

        // Efectivo esperado = Monto inicial + (Pagos deudas efectivo + Ventas efectivo + Ingresos - Retiros)
        const expectedCash = cashRegister.initialAmount + (paymentSummary.cash || 0) + totalCashIn - totalRetiros;
        // Efectivo en métodos de pago = Pagos deudas efectivo + Ventas efectivo + Ingresos - Retiros (sin monto inicial)
        const cashForDisplay = (paymentSummary.cash || 0) + totalCashIn - totalRetiros;

        // Calcular IVA Débito (Ventas) e IVA Crédito (Compras en el periodo)
        // C6 FIX: IVA Débito — Using sales document information
        let ivaDebito = 0;
        sales.forEach(s => {
            const fiscal = Sale.computeFiscalFromTotal(s.total, s.documentType);
            ivaDebito += fiscal.tax_amount;
        });
        ivaDebito = Math.round(ivaDebito);

        // Obtener todas las compras en el periodo de esta caja para el IVA Crédito
        const allPurchases = await Purchase.getAll();
        const startTime = new Date(cashRegister.openDate).getTime();
        const endTime = cashRegister.closeDate ? new Date(cashRegister.closeDate).getTime() : new Date().getTime();

        const sessionPurchases = allPurchases.filter(p => {
            const pTime = new Date(p.date).getTime();
            return pTime >= startTime && pTime <= endTime && p.documentType === 'factura';
        });

        const ivaCredito = sessionPurchases.reduce((sum, p) => sum + (parseFloat(p.ivaAmount) || 0), 0);

        return {
            ...cashRegister,
            totalSales: totalSalesCount,
            totalSalesAmount: totalSalesAmount,
            debtPayments: payments,
            totalDebtPayments: totalDebtPayments,
            debtPaymentSummary: debtPaymentSummary,
            paymentSummary: paymentSummary,
            movements: movements,
            totalCashIn: totalCashIn,
            totalRetiros: totalRetiros,
            cashForDisplay: cashForDisplay,
            expectedCash: expectedCash,
            ivaDebito: ivaDebito,
            ivaCredito: ivaCredito
        };
    }
}
