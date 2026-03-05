/**
 * Product Repository
 * Handles all database operations for Products
 * C1: findAll() filtra productos inactivos (soft-deleted).
 *     Usar findAllIncludingDeleted() para reportes/historiales.
 */
class ProductRepository extends BaseRepository {
    constructor() {
        super('products');
    }

    /**
     * C1: Override findAll — excluye productos inactivos (soft-deleted)
     * @returns {Promise<Array>}
     */
    async findAll() {
        const all = await super.findAll();
        return all.filter(p => p.isActive !== false);
    }

    /**
     * C1: Todos los productos incluyendo inactivos (para reportes, historial, backup)
     * @returns {Promise<Array>}
     */
    async findAllIncludingDeleted() {
        return await super.findAll();
    }

    /**
     * C1: Solo productos inactivos (soft-deleted)
     * @returns {Promise<Array>}
     */
    async findDeleted() {
        const all = await super.findAll();
        return all.filter(p => p.isActive === false);
    }

    /**
     * Find product by barcode (solo activos).
     * C4: Ya usa índice 'barcode'. Corregido para excluir soft-deleted.
     * @param {string} barcode - Barcode
     * @returns {Promise<Object|null>}
     */
    async findByBarcode(barcode) {
        const products = await this.findByIndex('barcode', barcode);
        // C4: Filtrar soft-deleted para no devolver productos desactivados
        const active = products.filter(p => p.isActive !== false);
        return active.length > 0 ? active[0] : null;
    }

    /**
     * Find products by category (solo activos)
     * @param {string} category - Category name
     * @returns {Promise<Array>}
     */
    async findByCategory(category) {
        const all = await this.findByIndex('category', category);
        return all.filter(p => p.isActive !== false);
    }

    /**
     * Search products by term (name, barcode, description) — solo activos
     * @param {string} term - Search term
     * @returns {Promise<Array>}
     */
    async search(term) {
        const products = await this.findAll();
        const searchTerm = term.toLowerCase();
        
        // Filter first
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.barcode.includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );

        // Sort by relevance
        return filtered.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            
            // Exact match priority
            if (nameA === searchTerm && nameB !== searchTerm) return -1;
            if (nameB === searchTerm && nameA !== searchTerm) return 1;
            
            // Starts with priority
            const startsA = nameA.startsWith(searchTerm);
            const startsB = nameB.startsWith(searchTerm);
            if (startsA && !startsB) return -1;
            if (startsB && !startsA) return 1;
            
            // Fallback to alphabetical
            return nameA.localeCompare(nameB);
        });
    }

    /**
     * Get products with low stock (solo activos)
     * @returns {Promise<Array>}
     */
    async findLowStock() {
        const products = await this.findAll();
        return products.filter(p => {
            const stock = parseFloat(p.stock) ?? 0;
            const minStock = p.minStock != null && p.minStock !== '' ? parseFloat(p.minStock) : 0;
            return stock <= minStock;
        });
    }
}
