class Purchase {
    static async create(data) {
        const purchase = {
            supplierId: data.supplierId,
            date: new Date().toISOString(),
            items: data.items || [],
            total: parseFloat(data.total) || 0,
            status: data.status || 'pending',
            paidAmount: parseFloat(data.paidAmount) || 0,
            dueDate: data.dueDate || null
        };
        
        const purchaseId = await db.add('purchases', purchase);
        
        for (const item of purchase.items) {
            await Product.updateStock(item.productId, item.quantity, 'add');
            
            await StockMovement.create({
                productId: item.productId,
                type: 'purchase',
                quantity: item.quantity,
                reference: purchaseId
            });
        }
        
        return purchaseId;
    }

    static async update(id, data) {
        const purchase = await db.get('purchases', id);
        if (!purchase) throw new Error('Compra no encontrada');
        
        const updated = {
            ...purchase,
            ...data
        };
        
        return await db.put('purchases', updated);
    }

    static async delete(id) {
        return await db.delete('purchases', id);
    }

    static async getById(id) {
        return await db.get('purchases', id);
    }

    static async getAll() {
        const purchases = await db.getAll('purchases');
        return purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static async getBySupplier(supplierId) {
        return await db.getByIndex('purchases', 'supplierId', supplierId);
    }

    static async getPending() {
        const purchases = await this.getAll();
        return purchases.filter(p => p.status === 'pending');
    }

    static async registerPayment(id, amount) {
        const purchase = await this.getById(id);
        if (!purchase) throw new Error('Compra no encontrada');
        
        purchase.paidAmount += parseFloat(amount);
        
        if (purchase.paidAmount >= purchase.total) {
            purchase.status = 'paid';
        }
        
        return await db.put('purchases', purchase);
    }

    static async getAccountsPayable() {
        const pending = await this.getPending();
        return pending.reduce((sum, p) => sum + (p.total - p.paidAmount), 0);
    }
}
