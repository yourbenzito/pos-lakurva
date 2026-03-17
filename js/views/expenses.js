const ExpensesView = {
    async render() {
        const expenses = await ExpenseController.loadExpenses();
        const categories = ['Servicios', 'Salarios', 'Suministros', 'Mantenimientos', 'Otros'];
        const summary = await ExpenseController.getExpenseSummary();

        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="color: #111827;">Gastos Operacionales</h1>
                        <p style="color: #4b5563;">Registra y gestiona los gastos de tu negocio</p>
                    </div>
                    <button class="btn btn-primary" onclick="ExpensesView.showExpenseForm()">
                        ➕ Nuevo Gasto
                    </button>
                </div>
            </div>            <div class="card" style="background: #fff7ed; border: 3px solid #f97316; box-shadow: 0 10px 25px rgba(249, 115, 22, 0.1);">
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; background: #ffffff; padding: 1.25rem; border-radius: 1rem; border: 2px solid #fdba74;">
                    <div class="form-group" style="flex: 1; min-width: 150px; margin-bottom: 0;">
                        <label style="color: #9a3412; font-weight: 800; font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">📂 Categoría</label>
                        <select id="expenseCategoryFilter" class="form-control" onchange="ExpensesView.filterExpenses()" style="background: #ffffff; color: #111827; border: 2px solid #f97316; height: 45px; font-weight: 700;">
                            <option value="all">Todas las categorías</option>
                            ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 150px; margin-bottom: 0;">
                        <label style="color: #9a3412; font-weight: 800; font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">📅 Desde</label>
                        <input type="date" id="expenseStartDateFilter" class="form-control" onchange="ExpensesView.filterExpenses()" style="background: #ffffff; color: #111827; border: 2px solid #f97316; height: 45px; font-weight: 700;">
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 150px; margin-bottom: 0;">
                        <label style="color: #9a3412; font-weight: 800; font-size: 0.9rem; margin-bottom: 0.5rem; display: block;">📅 Hasta</label>
                        <input type="date" id="expenseEndDateFilter" class="form-control" onchange="ExpensesView.filterExpenses()" style="background: #ffffff; color: #111827; border: 2px solid #f97316; height: 45px; font-weight: 700;">
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                        <button class="btn btn-secondary" onclick="ExpensesView.clearFilters()" style="height: 45px; border: 2px solid #94a3b8; font-weight: 800;">❌ Limpiar</button>
                    </div>
                </div>

                <div id="expenseSummaryCards" class="grid grid-3" style="margin-bottom: 2rem;">
                    ${this.renderSummaryCards(summary)}
                </div>

                <div id="expensesTable" style="background: #ffffff; border-radius: 1rem; padding: 1.5rem; border: 2px solid #fed7aa;">
                    ${this.renderExpensesTable(expenses)}
                </div>
            </div>
v>
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
            <div style="background: #1e293b; border: 2px solid #ef4444; border-radius: 1rem; padding: 1.5rem; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px rgba(239,68,68,0.25)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">💸</div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 0.25rem;">Total Gastos</div>
                <div style="color: #f87171; font-size: 1.9rem; font-weight: 800; line-height: 1;">${formatCLP(summary.totalAmount)}</div>
            </div>
            
            <div style="background: #1e293b; border: 2px solid #f59e0b; border-radius: 1rem; padding: 1.5rem; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px rgba(245,158,11,0.25)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🔥</div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 0.25rem;">Mayor Gasto</div>
                <div style="color: #fbbf24; font-size: 1.4rem; font-weight: 800; line-height: 1.2;">${maxCategory}</div>
                <div style="font-size: 1rem; color: #fde68a; margin-top: 0.5rem; font-weight: 600;">${formatCLP(maxAmount)}</div>
            </div>
            
            <div style="background: #1e293b; border: 2px solid #3b82f6; border-radius: 1rem; padding: 1.5rem; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 20px rgba(59,130,246,0.25)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📊</div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 0.25rem;">Frecuencia</div>
                <div style="color: #60a5fa; font-size: 1.6rem; font-weight: 800; line-height: 1;">${Object.keys(summary.summaryByCategory).length} Categorías</div>
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
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${expenses.map((e, i) => {
            const catLower = (e.category || 'otros').toLowerCase();
            const icon = categoryIcons[catLower] || '💸';
            const color = categoryColors[catLower] || '#94a3b8';
            const methodIcon = e.paymentMethod === 'cash' ? '💵' : e.paymentMethod === 'card' ? '💳' : e.paymentMethod === 'qr' ? '📱' : '➕';

            return `
                    <div style="background: #ffffff; border: 1.5px solid #e5e7eb; border-left: 5px solid ${color}; border-radius: 0.875rem; padding: 1.25rem; display: flex; gap: 1.25rem; align-items: flex-start; transition: box-shadow 0.2s, border-color 0.2s;" onmouseover="this.style.boxShadow='0 6px 18px rgba(0,0,0,0.09)';this.style.borderColor='${color}'" onmouseout="this.style.boxShadow='none';this.style.borderLeftColor='${color}';this.style.borderTopColor='#e5e7eb';this.style.borderRightColor='#e5e7eb';this.style.borderBottomColor='#e5e7eb'">
                        <!-- Ícono de categoría -->
                        <div style="width: 52px; height: 52px; min-width: 52px; border-radius: 50%; background: ${color}18; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                            ${icon}
                        </div>

                        <!-- Contenido principal -->
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.5rem;">
                                <div>
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                                        <span style="background: ${color}18; color: ${color}; padding: 0.15rem 0.6rem; border-radius: 2rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; border: 1px solid ${color}44;">${e.category}</span>
                                        <span style="color: #6b7280; font-size: 0.8rem;">${methodIcon} ${(this.getPaymentMethodName(e.paymentMethod) || '').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}</span>
                                    </div>
                                    <h3 style="margin: 0 0 0.2rem 0; font-size: 1.05rem; color: #111827; font-weight: 700;">${e.description}</h3>
                                    ${e.notes ? `<p style="margin: 0; font-size: 0.82rem; color: #6b7280; font-style: italic;">📝 ${e.notes}</p>` : ''}
                                    <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.35rem;">${e.date ? new Date(e.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : ''} ${e.date ? new Date(e.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.6rem; font-weight: 800; color: #dc2626; white-space: nowrap;">-${formatCLP(e.amount)}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem; justify-content: flex-end; padding-top: 0.75rem; border-top: 1px solid #f3f4f6;">
                                <button class="btn btn-sm" style="background: #f9fafb; color: #374151; border: 1px solid #d1d5db; padding: 0.3rem 0.75rem; font-weight: 600; transition: background 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f9fafb'" onclick="ExpensesView.showExpenseForm(${e.id})">
                                    ✏️ Editar
                                </button>
                                <button class="btn btn-sm" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 0.3rem 0.75rem; font-weight: 600; transition: background 0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" onclick="ExpensesView.deleteExpense(${e.id})">
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                    `;
        }).join('')}
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
