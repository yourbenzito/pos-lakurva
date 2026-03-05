class ExpenseController {
    static async loadExpenses(filters = {}) {
        let expenses = await Expense.getAll();

        if (filters.category && filters.category !== 'all') {
            expenses = expenses.filter(e => (e.category || '').toLowerCase() === filters.category.toLowerCase());
        }
        if (filters.startDate) {
            expenses = expenses.filter(e => new Date(e.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            expenses = expenses.filter(e => new Date(e.date) <= new Date(filters.endDate));
        }

        return expenses;
    }

    static async saveExpense(data) {
        if (data.id) {
            await Expense.update(data.id, data);
        } else {
            await Expense.create(data);
            if (data.deductFromCashRegister) {
                const openCash = await CashRegister.getOpen();
                if (openCash && openCash.id) {
                    await CashMovement.create({
                        cashRegisterId: openCash.id,
                        type: 'out',
                        amount: parseFloat(data.amount) || 0,
                        reason: `Gasto: ${data.description || 'Registro de gasto'}`
                    });
                }
            }
        }
    }

    static async deleteExpense(id) {
        const expense = await Expense.getById(id);
        if (!expense) throw new Error('Gasto no encontrado');

        // Revert cash movement if the expense was deducted from cash register
        try {
            const allMovements = await CashMovement.getAll();
            const matchingMovement = allMovements.find(m =>
                m.type === 'out' &&
                m.reason && m.reason.includes('Gasto:') &&
                Math.abs(parseFloat(m.amount) - parseFloat(expense.amount)) < 0.01 &&
                m.reason.includes(expense.description)
            );
            if (matchingMovement) {
                await CashMovement.delete(matchingMovement.id);
            }
        } catch (e) {
            console.warn('No se pudo revertir movimiento de caja del gasto eliminado:', e);
        }

        await Expense.delete(id);
    }

    static async getExpenseCategories() {
        return Expense.getCategories();
    }

    static async getExpenseSummary(filters = {}) {
        const expenses = await this.loadExpenses(filters);
        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

        const summaryByCategory = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {});

        return {
            totalAmount,
            summaryByCategory,
            expenses
        };
    }
}
