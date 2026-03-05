/**
 * Expense Repository
 * Handles all database operations for Expenses
 */
class ExpenseRepository extends BaseRepository {
    constructor() {
        super('expenses');
    }

    /**
     * Get expenses by category
     * @param {string} category - Category name
     * @returns {Promise<Array>}
     */
    async findByCategory(category) {
        return await this.findByIndex('category', category);
    }

    /**
     * Get expenses by date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>}
     */
    async findByDateRange(startDate, endDate) {
        const expenses = await this.findAll();
        return expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
        });
    }

    /**
     * Get expenses by cash register ID
     * @param {number} cashRegisterId - Cash register ID
     * @returns {Promise<Array>}
     */
    async findByCashRegisterId(cashRegisterId) {
        return await this.findByIndex('cashRegisterId', cashRegisterId);
    }

    /**
     * Get all expenses sorted by date (newest first)
     * @returns {Promise<Array>}
     */
    async findAll() {
        const expenses = await super.findAll();
        return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}
