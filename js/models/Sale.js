class Sale {
    static async create(data) {
        const lastSale = await this.getLastSale();
        const saleNumber = lastSale ? lastSale.saleNumber + 1 : 1;
        
        const sale = {
            saleNumber: saleNumber,
            date: new Date().toISOString(),
            customerId: data.customerId || null,
            items: data.items || [],
            subtotal: parseFloat(data.subtotal) || 0,
            total: parseFloat(data.total) || 0,
            paymentMethod: data.paymentMethod || 'cash',
            paymentDetails: data.paymentDetails || null,
            cashRegisterId: data.cashRegisterId,
            status: data.status || 'completed',
            paidAmount: parseFloat(data.paidAmount) || parseFloat(data.total) || 0
        };
        
        const saleId = await db.add('sales', sale);
        
        for (const item of sale.items) {
            // Actualizar stock del producto
            await Product.updateStock(item.productId, item.quantity, 'subtract');
            
            // Si el precio fue modificado en la venta, actualizar el precio del producto
            // (solo si es diferente al precio actual)
            const product = await Product.getById(item.productId);
            if (product && item.unitPrice && item.unitPrice !== product.price) {
                // Opcional: actualizar precio del producto con el precio de venta
                // Comentado porque puede no ser deseable actualizar el precio base con cada venta
                // await Product.update(item.productId, { price: item.unitPrice });
            }
            
            // Crear movimiento de stock
            await StockMovement.create({
                productId: item.productId,
                type: 'sale',
                quantity: -item.quantity,
                reference: saleId
            });
        }
        
        return saleId;
    }

    static async getById(id) {
        return await db.get('sales', id);
    }

    static async getAll() {
        const sales = await db.getAll('sales');
        return sales.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static async getLastSale() {
        const sales = await this.getAll();
        return sales.length > 0 ? sales[0] : null;
    }

    static async getByDateRange(startDate, endDate) {
        const sales = await this.getAll();
        return sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
        });
    }

    static async getByCustomer(customerId) {
        return await db.getByIndex('sales', 'customerId', customerId);
    }

    static async getByCashRegister(cashRegisterId) {
        const sales = await this.getAll();
        return sales.filter(sale => sale.cashRegisterId === cashRegisterId);
    }

    static async getTodaySales() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return await this.getByDateRange(today, tomorrow);
    }

    static async getTotalByPaymentMethod(cashRegisterId) {
        const sales = await this.getByCashRegister(cashRegisterId);
        
        const totals = {
            cash: 0,
            card: 0,
            qr: 0,
            other: 0
        };
        
        sales.forEach(sale => {
            if (sale.paymentDetails) {
                // Handle mixed payments
                for (const [method, amount] of Object.entries(sale.paymentDetails)) {
                    if (totals[method] !== undefined) {
                        totals[method] += parseFloat(amount);
                    }
                }
            } else {
                // Handle single payment
                totals[sale.paymentMethod] = (totals[sale.paymentMethod] || 0) + sale.total;
            }
        });
        
        return totals;
    }

    static async getPendingSales() {
        const sales = await this.getAll();
        return sales.filter(sale => sale.status === 'pending');
    }

    static async registerPayment(saleId, amount) {
        const sale = await this.getById(saleId);
        if (!sale) throw new Error('Venta no encontrada');
        
        sale.paidAmount = (sale.paidAmount || 0) + amount;
        
        if (sale.paidAmount >= sale.total) {
            sale.status = 'completed';
            sale.paidAmount = sale.total;
        }
        
        await db.put('sales', sale);
        return sale;
    }

    static async updatePaymentMethod(saleId, newMethod) {
        const sale = await this.getById(saleId);
        if (!sale) throw new Error('Venta no encontrada');
        
        sale.paymentMethod = newMethod;
        sale.paymentDetails = null; // Reset mixed payment details if changing to single method
        
        await db.put('sales', sale);
        return sale;
    }

    static async getAccountsReceivable() {
        const pending = await this.getPendingSales();
        return pending.reduce((sum, sale) => sum + (sale.total - (sale.paidAmount || 0)), 0);
    }
}
