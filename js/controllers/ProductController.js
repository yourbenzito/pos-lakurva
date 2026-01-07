class ProductController {
    static async loadProducts() {
        return await Product.getAll();
    }

    static async saveProduct(data) {
        if (!data.name || !data.price) {
            throw new Error('Nombre y precio son requeridos');
        }
        
        if (data.id) {
            await Product.update(data.id, data);
            showNotification('Producto actualizado exitosamente', 'success');
        } else {
            await Product.create(data);
            showNotification('Producto creado exitosamente', 'success');
        }
    }

    static async deleteProduct(id) {
        await Product.delete(id);
        showNotification('Producto eliminado', 'success');
    }

    static async searchProducts(term) {
        if (!term) return await Product.getAll();
        return await Product.search(term);
    }

    static async adjustPrice(id, newPrice) {
        await Product.adjustPrice(id, newPrice);
        showNotification('Precio actualizado', 'success');
    }

    static async importFromJSON(jsonData) {
        try {
            const products = JSON.parse(jsonData);
            const results = await Product.importProducts(products);
            
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            
            showNotification(`Importación: ${successful} exitosos, ${failed} fallidos`, 'info');
            return results;
        } catch (error) {
            showNotification('Error en la importación: ' + error.message, 'error');
            throw error;
        }
    }
}
