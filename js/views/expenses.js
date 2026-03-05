const ExpensesView = {
    async render() {
        const expenses = await ExpenseController.loadExpenses();
        const categories = ['Servicios', 'Salarios', 'Suministros', 'Mantenimientos', 'Otros'];
        const summary = await ExpenseController.getExpenseSummary();

        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1>Gastos Operacionales</h1>
                        <p>Registra y gestiona los gastos de tu negocio</p>
                    </div>
                    <button class="btn btn-primary" onclick="ExpensesView.showExpenseForm()">
                        ➕ Nuevo Gasto
                    </button>
                </div>
            </div>

            <div class="card">
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <div class="form-group" style="flex: 1;">
                        <label>Categoría</label>
                        <select id="expenseCategoryFilter" class="form-control" onchange="ExpensesView.filterExpenses()">
                            <option value="all">Todas</option>
                            ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Desde</label>
                        <input type="date" id="expenseStartDateFilter" class="form-control" onchange="ExpensesView.filterExpenses()">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Hasta</label>
                        <input type="date" id="expenseEndDateFilter" class="form-control" onchange="ExpensesView.filterExpenses()">
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                        <button class="btn btn-secondary" onclick="ExpensesView.clearFilters()">Limpiar Filtros</button>
                    </div>
                </div>

                <div id="expenseSummaryCards" class="grid grid-3" style="margin-bottom: 1.5rem;">
                    ${this.renderSummaryCards(summary)}
                </div>

                <div id="expensesTable">
                    ${this.renderExpensesTable(expenses)}
                </div>
            </div>
        `;
    },

    async init() {
        // No specific init logic needed beyond render for now
    },

    renderSummaryCards(summary) {
        // Find the category with highest spend
        let maxCategory = 'Ninguno';
        let maxAmount = 0;
        for (const [cat, amt] of Object.entries(summary.summaryByCategory)) {
            if (amt > maxAmount) {
                maxAmount = amt;
                maxCategory = cat;
            }
        }

        return `
            <div class="stat-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1)); border: 1px solid rgba(239, 68, 68, 0.3);">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">💸</div>
                <h3 style="color: #fca5a5; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.25rem;">Total Gastos</h3>
                <div class="value" style="color: #f87171; font-size: 2rem; font-weight: 800;">${formatCLP(summary.totalAmount)}</div>
            </div>
            
            <div class="stat-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1)); border: 1px solid rgba(245, 158, 11, 0.3);">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔥</div>
                <h3 style="color: #fcd34d; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.25rem;">Mayor Gasto</h3>
                <div class="value" style="color: #fbbf24; font-size: 1.5rem; font-weight: 800;">${maxCategory}</div>
                <div style="font-size: 0.9rem; color: #fde68a; margin-top: 0.25rem;">${formatCLP(maxAmount)}</div>
            </div>
            
            <div class="stat-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1)); border: 1px solid rgba(59, 130, 246, 0.3);">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                <h3 style="color: #93c5fd; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.25rem;">Frecuencia</h3>
                <div class="value" style="color: #60a5fa; font-size: 1.5rem; font-weight: 800;">${Object.keys(summary.summaryByCategory).length} Categorías</div>
            </div>
        `;
    },

    renderExpensesTable(expenses) {
        if (expenses.length === 0) {
            return '<div class="empty-state"><div class="empty-state-icon">💸</div>No hay gastos registrados</div>';
        }

        const categoryIcons = {
            'servicios': '💡',
            'salarios': '👨‍💼',
            'suministros': '📦',
            'mantenimientos': '🔧',
            'otros': '📝'
        };

        const categoryColors = {
            'servicios': '#eab308',
            'salarios': '#3b82f6',
            'suministros': '#10b981',
            'mantenimientos': '#f97316',
            'otros': '#8b5cf6'
        };

        return `
            <div style="position: relative; max-width: 800px; margin: 0 auto; padding: 1rem 0;">
                <!-- Línea vertical del timeline -->
                <div style="position: absolute; left: 40px; top: 0; bottom: 0; width: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; z-index: 0;"></div>
                
                <div style="display: flex; flex-direction: column; gap: 1.5rem; position: relative; z-index: 1;">
                    ${expenses.map((e, i) => {
            const catLower = (e.category || 'otros').toLowerCase();
            const icon = categoryIcons[catLower] || '💸';
            const color = categoryColors[catLower] || '#94a3b8';
            const methodIcon = e.paymentMethod === 'cash' ? '💵' : e.paymentMethod === 'card' ? '💳' : e.paymentMethod === 'qr' ? '📱' : '➕';

            return `
                        <div style="display: flex; gap: 1.5rem; align-items: flex-start; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(8px)'" onmouseout="this.style.transform='translateX(0)'">
                            <!-- Círculo del timeline -->
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; min-width: 80px; text-align: center;">
                                <div style="width: 48px; height: 48px; border-radius: 50%; background: ${color}22; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: bold; box-shadow: 0 0 15px ${color}44;">
                                    ${icon}
                                </div>
                                <div style="font-size: 0.75rem; color: var(--secondary); font-weight: 600;">
                                    ${e.date ? new Date(e.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                                <div style="font-size: 0.75rem; color: var(--secondary); font-weight: 500;">
                                    ${e.date ? new Date(e.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : ''}
                                </div>
                            </div>

                            <!-- Tarjeta de Gasto -->
                            <div style="flex: 1; background: rgba(17, 24, 39, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1.25rem; position: relative; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                                    
                                    <div style="flex: 1; min-width: 200px;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                            <span style="background: ${color}22; color: ${color}; px; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">
                                                ${e.category}
                                            </span>
                                            <span style="color: var(--secondary); font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem;">
                                                ${methodIcon} ${this.getPaymentMethodName(e.paymentMethod).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}
                                            </span>
                                        </div>
                                        <h3 style="margin: 0 0 0.25rem 0; font-size: 1.15rem; color: #f8fafc;">${e.description}</h3>
                                        ${e.notes ? `<p style="margin: 0; font-size: 0.85rem; color: #94a3b8; font-style: italic;">📝 ${e.notes}</p>` : ''}
                                    </div>

                                    <div style="text-align: right;">
                                        <div style="font-size: 1.5rem; font-weight: 800; color: #f87171; letter-spacing: -0.5px; display: flex; align-items: center; gap: 0.25rem;">
                                            <span style="font-size: 1rem; opacity: 0.7;">-</span>${formatCLP(e.amount)}
                                        </div>
                                    </div>

                                </div>

                                <!-- Botones de acción flotantes en la esquina inferior derecha -->
                                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05);">
                                    <button class="btn btn-sm" style="background: rgba(255,255,255,0.1); color: #fff; padding: 0.3rem 0.75rem;" onclick="ExpensesView.showExpenseForm(${e.id})" title="Editar gasto">
                                        ✏️ Editar
                                    </button>
                                    <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 0.3rem 0.75rem;" onclick="ExpensesView.deleteExpense(${e.id})" title="Eliminar gasto">
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    },

    getPaymentMethodName(method) {
        const methods = {
            'cash': '💵 Efectivo',
            'card': '💳 Tarjeta',
            'qr': '📱 QR',
            'other': '➕ Otro'
        };
        return methods[method] || method;
    },

    async showExpenseForm(id = null) {
        const expense = id ? await Expense.getById(id) : null;
        const fixedCategories = ['Servicios', 'Salarios', 'Suministros', 'Mantenimientos', 'Otros'];
        const paymentMethods = ['cash', 'card', 'qr', 'other'];
        const openCash = await CashRegister.getOpen();
        const showCashOption = !id && openCash !== null;

        const content = `
            <form id="expenseForm" onsubmit="ExpensesView.saveExpense(event, ${id})">
                <div class="form-group">
                    <label>Razón del gasto *</label>
                    <input type="text"
                           name="description"
                           class="form-control"
                           value="${expense?.description || ''}"
                           placeholder="Ej: Sueldo, Luz, Plásticos, Papel..."
                           aria-describedby="reasonHelp"
                           required>
                    <small id="reasonHelp" class="subtitle">Describe manualmente en qué se invierte el dinero.</small>
                </div>

                <div class="form-group">
                    <label>Monto (CLP) *</label>
                    <input type="number" name="amount" class="form-control" value="${expense?.amount || ''}" min="0.01" step="0.01" required>
                </div>

                <div class="form-group">
                    <label>Categoría *</label>
                        <select name="category" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            ${fixedCategories.map(cat => `<option value="${cat.toLowerCase()}" ${expense?.category?.toLowerCase() === cat.toLowerCase() ? 'selected' : ''}>${cat}</option>`).join('')}
                        </select>
                </div>

                <div class="form-group">
                    <label>Método de Pago *</label>
                    <select name="paymentMethod" class="form-control" required onchange="if(document.getElementById('cashDeductGroup')) { document.getElementById('cashDeductGroup').style.display = this.value === 'cash' ? 'block' : 'none'; }">
                        <option value="">Seleccionar...</option>
                        ${paymentMethods.map(method => `<option value="${method}" ${expense?.paymentMethod === method ? 'selected' : ''}>${this.getPaymentMethodName(method)}</option>`).join('')}
                    </select>
                </div>

                ${showCashOption ? `
                <div class="form-group" id="cashDeductGroup" style="display: none; margin-top: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: var(--light); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border);">
                        <input type="checkbox" name="deductFromCashRegister" value="true">
                        <span>📉 Extraer efectivo de la Caja Activa</span>
                    </label>
                    <small style="margin-left: 2rem; display: block; margin-top: 0.25rem;">Si marcas esto, el dinero se descontará del saldo esperado en el cuadre final de caja.</small>
                </div>
                ` : ''}

                <div class="form-group">
                    <label>Notas (opcional)</label>
                    <textarea name="notes" class="form-control" rows="2">${expense?.notes || ''}</textarea>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('expenseForm').requestSubmit()">
                ${id ? 'Actualizar Gasto' : 'Registrar Gasto'}
            </button>
        `;

        showModal(content, {
            title: id ? 'Editar Gasto' : 'Nuevo Gasto Operacional',
            footer,
            width: '600px'
        });
    },

    async saveExpense(event, id) {
        event.preventDefault();
        const form = document.getElementById('expenseForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Handle checkbox
        if (formData.get('deductFromCashRegister') === 'true') {
            data.deductFromCashRegister = true;
        }

        if (id) data.id = id;

        try {
            await ExpenseController.saveExpense(data);
            closeModal();
            await this.refresh();
            showNotification(id ? 'Gasto actualizado exitosamente' : 'Gasto registrado exitosamente', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async deleteExpense(id) {
        showConfirm('¿Eliminar este gasto? Esta acción no se puede deshacer.', async () => {
            try {
                await ExpenseController.deleteExpense(id);
                await this.refresh();
                showNotification('Gasto eliminado exitosamente', 'success');
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    },

    async filterExpenses() {
        const category = document.getElementById('expenseCategoryFilter').value;
        const startDate = document.getElementById('expenseStartDateFilter').value;
        const endDate = document.getElementById('expenseEndDateFilter').value;

        const filters = { category, startDate, endDate };
        const expenses = await ExpenseController.loadExpenses(filters);
        const summary = await ExpenseController.getExpenseSummary(filters);

        document.getElementById('expenseSummaryCards').innerHTML = this.renderSummaryCards(summary);
        document.getElementById('expensesTable').innerHTML = this.renderExpensesTable(expenses);
    },

    async clearFilters() {
        document.getElementById('expenseCategoryFilter').value = 'all';
        document.getElementById('expenseStartDateFilter').value = '';
        document.getElementById('expenseEndDateFilter').value = '';
        await this.filterExpenses();
    },

    async refresh() {
        await this.filterExpenses(); // Re-apply filters to refresh the view
    }
};
