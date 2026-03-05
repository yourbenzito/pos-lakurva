/**
 * Purchase Repository
 * Handles all database operations for Purchases
 */
class PurchaseRepository extends BaseRepository {
    constructor() {
        super('purchases');
    }

    /**
     * Get purchases by supplier ID
     * @param {number} supplierId - Supplier ID
     * @returns {Promise<Array>}
     */
    async findBySupplierId(supplierId) {
        return await this.findByIndex('supplierId', supplierId);
    }

    /**
     * Get all purchases sorted by date (newest first)
     * @returns {Promise<Array>}
     */
    async findAll() {
        const purchases = await super.findAll();
        return purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get pending purchases
     * @returns {Promise<Array>}
     */
    async findPending() {
        const purchases = await this.findAll();
        return purchases.filter(p => p.status === 'pending');
    }

    /**
     * Get purchases by date range using 'date' index
     * @param {Date|string} startDate - Start date
     * @param {Date|string} endDate - End date
     * @returns {Promise<Array>}
     */
    async findByDateRange(startDate, endDate) {
        try {
            const start = new Date(startDate).toISOString();
            const end = new Date(endDate).toISOString();
            return await this.findByIndexRange('date', start, end);
        } catch (indexError) {
            console.warn('PurchaseRepository.findByDateRange: index range fallback', indexError);
            const purchases = await super.findAll();
            return purchases.filter(p => {
                const pDate = new Date(p.date);
                return pDate >= new Date(startDate) && pDate <= new Date(endDate);
            });
        }
    }
}
