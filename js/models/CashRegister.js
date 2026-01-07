class CashRegister {
    static async open(initialAmount) {
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
            paymentSummary: {
                cash: 0,
                card: 0,
                qr: 0,
                other: 0
            }
        };
        
        return await db.add('cashRegisters', cashRegister);
    }

    static async close(id, finalAmount) {
        const cashRegister = await db.get('cashRegisters', id);
        if (!cashRegister) throw new Error('Caja no encontrada');
        if (cashRegister.status === 'closed') throw new Error('La caja ya está cerrada');
        
        const salesPaymentSummary = await Sale.getTotalByPaymentMethod(id);
        
        const debtPayments = await Payment.getByCashRegister(id);
        const debtPaymentSummary = {
            cash: 0,
            card: 0,
            qr: 0,
            other: 0
        };
        
        debtPayments.forEach(payment => {
            const method = payment.paymentMethod || 'cash';
            debtPaymentSummary[method] = (debtPaymentSummary[method] || 0) + payment.amount;
        });
        
        const paymentSummary = {
            cash: salesPaymentSummary.cash + debtPaymentSummary.cash,
            card: salesPaymentSummary.card + debtPaymentSummary.card,
            qr: salesPaymentSummary.qr + debtPaymentSummary.qr,
            other: salesPaymentSummary.other + debtPaymentSummary.other
        };
        
        const expectedCash = cashRegister.initialAmount + paymentSummary.cash;
        
        cashRegister.closeDate = new Date().toISOString();
        cashRegister.finalAmount = parseFloat(finalAmount);
        cashRegister.expectedAmount = expectedCash;
        cashRegister.difference = finalAmount - expectedCash;
        cashRegister.status = 'closed';
        cashRegister.paymentSummary = paymentSummary;
        
        return await db.put('cashRegisters', cashRegister);
    }

    static async getOpen() {
        const registers = await db.getByIndex('cashRegisters', 'status', 'open');
        return registers.length > 0 ? registers[0] : null;
    }

    static async getById(id) {
        return await db.get('cashRegisters', id);
    }

    static async getAll() {
        const registers = await db.getAll('cashRegisters');
        return registers.sort((a, b) => new Date(b.openDate) - new Date(a.openDate));
    }

    static async getSummary(id) {
        const cashRegister = await this.getById(id);
        if (!cashRegister) return null;
        
        const sales = await Sale.getByCashRegister(id);
        
        const debtPayments = await Payment.getByCashRegister(id);
        const totalDebtPayments = debtPayments.reduce((sum, p) => sum + p.amount, 0);
        
        const debtPaymentSummary = {
            cash: 0,
            card: 0,
            qr: 0,
            other: 0
        };
        
        debtPayments.forEach(payment => {
            const method = payment.paymentMethod || 'cash';
            debtPaymentSummary[method] = (debtPaymentSummary[method] || 0) + payment.amount;
        });
        
        const salesAmount = sales.reduce((sum, s) => sum + s.total, 0);
        const totalAmount = salesAmount + totalDebtPayments;
        
        const salesPaymentSummary = cashRegister.status === 'closed' 
            ? cashRegister.paymentSummary 
            : await Sale.getTotalByPaymentMethod(id);
        
        const paymentSummary = {
            cash: (salesPaymentSummary?.cash || 0) + debtPaymentSummary.cash,
            card: (salesPaymentSummary?.card || 0) + debtPaymentSummary.card,
            qr: (salesPaymentSummary?.qr || 0) + debtPaymentSummary.qr,
            other: (salesPaymentSummary?.other || 0) + debtPaymentSummary.other
        };
        
        return {
            ...cashRegister,
            totalSales: sales.length,
            totalAmount: totalAmount,
            debtPayments: debtPayments,
            totalDebtPayments: totalDebtPayments,
            debtPaymentSummary: debtPaymentSummary,
            paymentSummary: paymentSummary
        };
    }
}
