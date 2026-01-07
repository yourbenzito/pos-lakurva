class Supplier {
    static async create(data) {
        const supplier = {
            name: data.name,
            contact: data.contact || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            createdAt: new Date().toISOString()
        };
        
        return await db.add('suppliers', supplier);
    }

    static async update(id, data) {
        const supplier = await db.get('suppliers', id);
        if (!supplier) throw new Error('Proveedor no encontrado');
        
        const updated = {
            ...supplier,
            ...data
        };
        
        return await db.put('suppliers', updated);
    }

    static async delete(id) {
        return await db.delete('suppliers', id);
    }

    static async getById(id) {
        return await db.get('suppliers', id);
    }

    static async getAll() {
        return await db.getAll('suppliers');
    }

    static async search(term) {
        const suppliers = await this.getAll();
        const searchTerm = term.toLowerCase();
        return suppliers.filter(s => 
            s.name.toLowerCase().includes(searchTerm) ||
            s.contact.toLowerCase().includes(searchTerm) ||
            s.phone.includes(searchTerm)
        );
    }
    
    static async getPurchaseHistory(supplierId) {
        const purchases = await Purchase.getBySupplier(supplierId);
        return purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    static async getPurchasesByDateRange(supplierId, startDate, endDate) {
        const purchases = await this.getPurchaseHistory(supplierId);
        return purchases.filter(purchase => {
            const purchaseDate = new Date(purchase.date);
            return purchaseDate >= new Date(startDate) && purchaseDate <= new Date(endDate);
        });
    }
}
