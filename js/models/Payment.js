class Payment {
    static async create(data) {
        const openCashRegister = await CashRegister.getOpen();
        
        const payment = {
            saleId: data.saleId,
            customerId: data.customerId,
            amount: parseFloat(data.amount) || 0,
            paymentMethod: data.paymentMethod || 'cash',
            date: new Date().toISOString(),
            notes: data.notes || '',
            cashRegisterId: openCashRegister ? openCashRegister.id : null
        };
        
        const paymentId = await db.add('payments', payment);
        
        await Sale.registerPayment(data.saleId, payment.amount);
        
        return paymentId;
    }

    static async getBySale(saleId) {
        return await db.getByIndex('payments', 'saleId', saleId);
    }

    static async getByCustomer(customerId) {
        return await db.getByIndex('payments', 'customerId', customerId);
    }

    static async getAll() {
        const payments = await db.getAll('payments');
        return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static async getByCashRegister(cashRegisterId) {
        return await db.getByIndex('payments', 'cashRegisterId', cashRegisterId);
    }

    static async delete(id) {
        return await db.delete('payments', id);
    }
}
