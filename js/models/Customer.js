class Customer {
    static async create(data) {
        const customer = {
            name: data.name,
            phone: data.phone || '',
            email: data.email || '',
            createdAt: new Date().toISOString()
        };
        
        return await db.add('customers', customer);
    }

    static async update(id, data) {
        const customer = await db.get('customers', id);
        if (!customer) throw new Error('Cliente no encontrado');
        
        const updated = {
            ...customer,
            ...data
        };
        
        return await db.put('customers', updated);
    }

    static async delete(id) {
        return await db.delete('customers', id);
    }

    static async getById(id) {
        return await db.get('customers', id);
    }

    static async getAll() {
        return await db.getAll('customers');
    }

    static async search(term) {
        const customers = await this.getAll();
        const searchTerm = term.toLowerCase();
        return customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm) ||
            c.phone.includes(searchTerm) ||
            c.email.toLowerCase().includes(searchTerm)
        );
    }

    static async getPurchaseHistory(customerId) {
        return await Sale.getByCustomer(customerId);
    }
    
    static async getAccountBalance(customerId) {
        const sales = await Sale.getByCustomer(customerId);
        const pendingSales = sales.filter(s => s.status === 'pending');
        
        let totalDebt = 0;
        const details = [];
        
        for (const sale of pendingSales) {
            const total = parseFloat(sale.total) || 0;
            const paid = parseFloat(sale.paidAmount) || 0;
            const remaining = total - paid;
            
            if (remaining > 0) { // Only count if there is actual debt
                totalDebt += remaining;
                
                details.push({
                    saleId: sale.id,
                    saleNumber: sale.saleNumber,
                    date: sale.date,
                    total: total,
                    paid: paid,
                    remaining: remaining,
                    items: sale.items
                });
            }
        }
        
        return {
            totalDebt: totalDebt,
            pendingSales: details.sort((a, b) => new Date(a.date) - new Date(b.date))
        };
    }
    
    static async getPaymentHistory(customerId) {
        return await Payment.getByCustomer(customerId);
    }
}
