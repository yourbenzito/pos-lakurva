class CustomerController {
    static async loadCustomers() {
        return await Customer.getAll();
    }

    static async saveCustomer(data) {
        if (!data.name) {
            throw new Error('El nombre es requerido');
        }
        
        if (data.id) {
            await Customer.update(data.id, data);
            showNotification('Cliente actualizado', 'success');
        } else {
            await Customer.create(data);
            showNotification('Cliente creado', 'success');
        }
    }

    static async deleteCustomer(id) {
        await Customer.delete(id);
        showNotification('Cliente eliminado', 'success');
    }

    static async searchCustomers(term) {
        if (!term) return await Customer.getAll();
        return await Customer.search(term);
    }

    static async getCustomerHistory(customerId) {
        const customer = await Customer.getById(customerId);
        const sales = await Customer.getPurchaseHistory(customerId);
        
        return {
            customer,
            sales,
            totalPurchases: sales.length,
            totalAmount: sales.reduce((sum, s) => sum + s.total, 0)
        };
    }
}
