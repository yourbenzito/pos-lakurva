/**
 * Product Validator
 * Centralizes all product validation logic
 */
class ProductValidator {
    /**
     * Validate product data
     * @param {Object} productData - Product data
     * @returns {Object} - { valid: boolean, error?: string }
     */
    static validate(productData) {
        if (!productData || !productData.name || productData.name.trim() === '') {
            return {
                valid: false,
                error: 'El nombre del producto es requerido'
            };
        }
        
        const price = parseFloat(productData.price) || 0;
        if (price < 0) {
            return {
                valid: false,
                error: 'El precio no puede ser negativo'
            };
        }
        
        const cost = parseFloat(productData.cost) || 0;
        if (cost < 0) {
            return {
                valid: false,
                error: 'El costo no puede ser negativo'
            };
        }
        
        const stock = parseFloat(productData.stock) || 0;
        if (stock < 0) {
            return {
                valid: false,
                error: 'El stock no puede ser negativo'
            };
        }
        
        // Validate type
        const validTypes = ['unit', 'weight'];
        if (productData.type && !validTypes.includes(productData.type)) {
            return {
                valid: false,
                error: `Tipo de producto inválido. Debe ser uno de: ${validTypes.join(', ')}`
            };
        }
        
        // Validate expiryDate if provided (optional; format YYYY-MM-DD)
        if (productData.expiryDate != null && String(productData.expiryDate).trim() !== '') {
            const d = String(productData.expiryDate).trim().slice(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(Date.parse(d))) {
                return {
                    valid: false,
                    error: 'Fecha de vencimiento debe ser una fecha válida (AAAA-MM-DD)'
                };
            }
        }
        
        return { valid: true };
    }

    /**
     * Validate stock availability
     * @param {Object} product - Product object
     * @param {number} quantity - Required quantity
     * @returns {Object} - { valid: boolean, error?: string }
     */
    static validateStock(product, quantity) {
        if (!product) {
            return {
                valid: false,
                error: 'Producto no encontrado'
            };
        }
        
        const stock = parseFloat(product.stock) || 0;
        const qty = parseFloat(quantity) || 0;
        if (isNaN(qty) || qty <= 0) {
            return { valid: false, error: 'Cantidad inválida' };
        }
        
        // Validar stock para unidad y peso (kg)
        if (stock < qty) {
            const unit = product.type === 'weight' ? 'kg' : 'un';
            return {
                valid: false,
                error: `Stock insuficiente. Disponible: ${stock} ${unit}, Requerido: ${qty} ${unit}`
            };
        }
        
        return { valid: true };
    }
}
