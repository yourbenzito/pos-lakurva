class Expense {
    static _repository = new ExpenseRepository();

    static async create(data) {
        if (!data.description || !data.amount || data.amount <= 0) {
            throw new Error('Descripción y monto válido son requeridos para el gasto.');
        }
        if (!data.category) {
            throw new Error('La categoría del gasto es requerida.');
        }
        if (!data.paymentMethod) {
            throw new Error('El método de pago del gasto es requerido.');
        }
        const expense = {
            description: data.description,
            amount: parseFloat(data.amount),
            category: data.category,
            paymentMethod: data.paymentMethod,
            notes: data.notes || '',
            date: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        return await this._repository.create(expense);
    }

    static async update(id, data) {
        const existingExpense = await this.getById(id);
        if (!existingExpense) {
            throw new Error('Gasto no encontrado.');
        }

        const updatedData = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        return await this._repository.update(id, updatedData);
    }

    static async delete(id) {
        const expense = await this.getById(id);
        if (!expense) {
            throw new Error('Gasto no encontrado.');
        }

        return await this._repository.delete(id);
    }

    static async getById(id) {
        return await this._repository.findById(id);
    }

    static async getAll() {
        return await this._repository.findAll();
    }

    static async getByCategory(category) {
        return await this._repository.findByCategory(category);
    }

    static async getByDateRange(startDate, endDate) {
        return await this._repository.findByDateRange(startDate, endDate);
    }

    static async getByCashRegister(cashRegisterId) {
        return await this._repository.findByCashRegisterId(cashRegisterId);
    }

    static async getCategories() {
        return ['Servicios', 'Salarios', 'Suministros', 'Mantenimientos', 'Otros'];
    }
}
