/**
 * Stock Movement Repository
 * Handles all database operations for Stock Movements
 */
class StockMovementRepository extends BaseRepository {
    constructor() {
        super('stockMovements');
    }

    /**
     * Get movements by product ID
     * @param {number} productId - Product ID
     * @returns {Promise<Array>}
     */
    async findByProductId(productId) {
        return await this.findByIndex('productId', productId);
    }

    /**
     * Get movements by type
     * @param {string} type - Movement type (sale, purchase, adjustment, loss, consumption)
     * @returns {Promise<Array>}
     */
    async findByType(type) {
        return await this.findByIndex('type', type);
    }

    /**
     * Get movements by date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>}
     */
    async findByDateRange(startDate, endDate) {
        const movements = await this.findAll();
        return movements.filter(m => {
            const mDate = new Date(m.date);
            return mDate >= new Date(startDate) && mDate <= new Date(endDate);
        });
    }

    /**
     * Get all movements sorted by date (newest first)
     * @returns {Promise<Array>}
     */
    async findAll() {
        const movements = await super.findAll();
        return movements.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}
