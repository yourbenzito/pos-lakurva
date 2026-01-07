class SupplierController {
    static async loadSuppliers() {
        return await Supplier.getAll();
    }

    static async saveSupplier(data) {
        if (!data.name) {
            throw new Error('El nombre es requerido');
        }
        
        if (data.id) {
            await Supplier.update(data.id, data);
            showNotification('Proveedor actualizado', 'success');
        } else {
            await Supplier.create(data);
            showNotification('Proveedor creado', 'success');
        }
    }

    static async deleteSupplier(id) {
        await Supplier.delete(id);
        showNotification('Proveedor eliminado', 'success');
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
            await Purchase.update(data.id, data);
            showNotification('Compra actualizada', 'success');
        } else {
            await Purchase.create(data);
            showNotification('Compra registrada', 'success');
        }
    }

    static async registerPayment(purchaseId, amount) {
        await Purchase.registerPayment(purchaseId, amount);
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
