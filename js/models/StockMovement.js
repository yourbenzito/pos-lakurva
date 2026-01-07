class StockMovement {
    static async create(data) {
        const movement = {
            productId: data.productId,
            type: data.type,
            quantity: parseFloat(data.quantity),
            reference: data.reference || null,
            date: new Date().toISOString(),
            reason: data.reason || ''
        };
        
        return await db.add('stockMovements', movement);
    }

    static async getAll() {
        const movements = await db.getAll('stockMovements');
        return movements.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static async getByProduct(productId) {
        return await db.getByIndex('stockMovements', 'productId', productId);
    }

    static async getByType(type) {
        return await db.getByIndex('stockMovements', 'type', type);
    }

    static async getByDateRange(startDate, endDate) {
        const movements = await this.getAll();
        return movements.filter(m => {
            const mDate = new Date(m.date);
            return mDate >= new Date(startDate) && mDate <= new Date(endDate);
        });
    }

    static async createAdjustment(productId, quantity, reason) {
        const product = await Product.getById(productId);
        if (!product) throw new Error('Producto no encontrado');
        
        await Product.updateStock(productId, quantity, 'add');
        
        return await this.create({
            productId,
            type: 'adjustment',
            quantity,
            reason
        });
    }

    static async createLoss(productId, quantity, reason) {
        const product = await Product.getById(productId);
        if (!product) throw new Error('Producto no encontrado');
        
        await Product.updateStock(productId, quantity, 'subtract');
        
        return await this.create({
            productId,
            type: 'loss',
            quantity: -quantity,
            reason
        });
    }

    static async createConsumption(productId, quantity, reason) {
        const product = await Product.getById(productId);
        if (!product) throw new Error('Producto no encontrado');
        
        await Product.updateStock(productId, quantity, 'subtract');
        
        return await this.create({
            productId,
            type: 'consumption',
            quantity: -quantity,
            reason
        });
    }
}
