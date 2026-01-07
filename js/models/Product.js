class Product {
    static async create(data) {
        const product = {
            barcode: data.barcode || '',
            name: data.name,
            description: data.description || '',
            category: data.category || 'General',
            price: parseFloat(data.price) || 0,
            cost: parseFloat(data.cost) || 0,
            type: data.type || 'unit',
            stock: parseFloat(data.stock) || 0,
            minStock: parseFloat(data.minStock) || 0,
            maxStock: parseFloat(data.maxStock) || 0,
            image: data.image || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return await db.add('products', product);
    }

    static async update(id, data) {
        const product = await db.get('products', id);
        if (!product) throw new Error('Producto no encontrado');
        
        const updated = {
            ...product,
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        return await db.put('products', updated);
    }

    static async delete(id) {
        return await db.delete('products', id);
    }

    static async getById(id) {
        return await db.get('products', id);
    }

    static async getAll() {
        return await db.getAll('products');
    }

    static async getByBarcode(barcode) {
        const products = await db.getByIndex('products', 'barcode', barcode);
        return products.length > 0 ? products[0] : null;
    }

    static async search(term) {
        const products = await this.getAll();
        const searchTerm = term.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.barcode.includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );
    }

    static async getByCategory(category) {
        return await db.getByIndex('products', 'category', category);
    }

    static async updateStock(id, quantity, operation = 'subtract') {
        const product = await this.getById(id);
        if (!product) throw new Error('Producto no encontrado');
        
        if (operation === 'subtract') {
            product.stock -= quantity;
        } else if (operation === 'add') {
            product.stock += quantity;
        } else {
            product.stock = quantity;
        }
        
        product.updatedAt = new Date().toISOString();
        return await db.put('products', product);
    }

    static async getLowStock() {
        const products = await this.getAll();
        return products.filter(p => p.stock <= p.minStock);
    }

    static async adjustPrice(id, newPrice) {
        const product = await this.getById(id);
        if (!product) throw new Error('Producto no encontrado');
        
        product.price = parseFloat(newPrice);
        product.updatedAt = new Date().toISOString();
        return await db.put('products', product);
    }

    static async importProducts(products) {
        const results = [];
        for (const productData of products) {
            try {
                const id = await this.create(productData);
                results.push({ success: true, id, name: productData.name });
            } catch (error) {
                results.push({ success: false, error: error.message, name: productData.name });
            }
        }
        return results;
    }
}
