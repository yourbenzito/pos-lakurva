const CustomersView = {
    async render() {
        const customers = await Customer.getAll();
        const pendingSales = await Sale.getPendingSales();

        // Calculate debt map
        const debtMap = {};
        pendingSales.forEach(sale => {
            if (sale.customerId) {
                const debt = (parseFloat(sale.total) || 0) - (parseFloat(sale.paidAmount) || 0);
                if (debt > 0) {
                    debtMap[sale.customerId] = (debtMap[sale.customerId] || 0) + debt;
                }
            }
        });

        // Calculate Top Customers (by volume)
        const allSales = await Sale.getAll();
        const volumeMap = {};
        allSales.forEach(s => {
            if (s.customerId && s.status !== 'cancelled') {
                volumeMap[s.customerId] = (volumeMap[s.customerId] || 0) + (parseFloat(s.total) || 0);
            }
        });

        // Sort customers by debt (Highest first), then by name
        customers.sort((a, b) => {
            const debtA = debtMap[a.id] || 0;
            const debtB = debtMap[b.id] || 0;
            if (debtB !== debtA) return debtB - debtA;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Get Top 3 Customers
        const topCustomers = [...customers]
            .filter(c => volumeMap[c.id] > 0)
            .sort((a, b) => volumeMap[b.id] - volumeMap[a.id])
            .slice(0, 3);

        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1>Clientes</h1>
                        <p>Gestiona tu base de clientes</p>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        ${PermissionService.can('customers.delete') ? `
                        <button class="btn btn-warning" onclick="CustomersView.showDeletedCustomers()" title="Ver clientes desactivados">
                            📋 Desactivados
                        </button>` : ''}
                        ${PermissionService.can('customers.create') ? `
                        <button class="btn btn-primary" onclick="CustomersView.showCustomerForm()">
                            Nuevo Cliente
                        </button>` : ''}
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                ${topCustomers.map((c, i) => `
                    <div class="stat-card" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8)); border: 1px solid rgba(59,130,246,0.2); position: relative; overflow: hidden;">
                        <div style="position: absolute; right: -10px; top: -10px; font-size: 5rem; opacity: 0.1; font-weight: 900; color: #60a5fa;">${i + 1}</div>
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${['🥇', '🥈', '🥉'][i]}</div>
                        <h3 style="margin:0; font-size: 1.1rem; color: #fff;">${c.name}</h3>
                        <p style="color: #60a5fa; font-weight: 800; font-size: 1.25rem; margin: 0.25rem 0;">${formatCLP(volumeMap[c.id])}</p>
                        <span style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Volumen Total Compras</span>
                    </div>
                `).join('')}
                ${topCustomers.length === 0 ? '<div class="stat-card" style="opacity: 0.5;">No hay actividad de clientes aún</div>' : ''}
            </div>

            <div class="card glass-panel" style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2 style="margin:0; font-size: 1.25rem; font-weight: 800; color: #fff;">👥 Listado por Deuda</h2>
                    <div class="search-box" style="width: 300px;">
                        <input type="text" id="searchCustomers" class="form-control" placeholder="Buscar clientes...">
                    </div>
                </div>
                
                <div id="customersTable">
                    ${this.renderCustomersTable(customers, debtMap)}
                </div>
            </div>
        `;
    },

    async init() {
        const searchInput = document.getElementById('searchCustomers');

        searchInput.addEventListener('input', async (e) => {
            const term = e.target.value;
            const customers = term ? await Customer.search(term) : await Customer.getAll();

            // Re-fetch debt map for search results (could be optimized, but this is safe)
            const pendingSales = await Sale.getPendingSales();
            const debtMap = {};
            pendingSales.forEach(sale => {
                if (sale.customerId) {
                    const debt = (parseFloat(sale.total) || 0) - (parseFloat(sale.paidAmount) || 0);
                    if (debt > 0) {
                        debtMap[sale.customerId] = (debtMap[sale.customerId] || 0) + debt;
                    }
                }
            });

            document.getElementById('customersTable').innerHTML = this.renderCustomersTable(customers, debtMap);
        });
    },

    renderCustomersTable(customers, debtMap = {}) {
        if (customers.length === 0) {
            return '<div class="empty-state"><div class="empty-state-icon">👥</div>No hay clientes</div>';
        }

        const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; padding: 0.5rem 0;">
                ${customers.map(c => {
            const debt = debtMap[c.id] || 0;
            const credit = (c.balanceCredit != null) ? parseFloat(c.balanceCredit) || 0 : 0;
            const netDebt = Math.max(0, Math.round((debt - credit) * 100) / 100);
            const netCredit = Math.max(0, Math.round((credit - debt) * 100) / 100);

            const nameParts = (c.name || 'Sin Nombre').trim().split(' ');
            const initials = ((nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '')).toUpperCase() || '?';

            let hash = 0;
            for (let i = 0; i < (c.name || '').length; i++) hash = (c.name || '').charCodeAt(i) + ((hash << 5) - hash);
            const bgColor = colors[Math.abs(hash) % colors.length];

            return `
                    <div class="customer-card" style="background: rgba(17, 24, 39, 0.6); border: 2px solid rgba(255, 255, 255, 0.05); border-radius: 1.5rem; padding: 1.5rem; transition: all 0.3s ease; position: relative; display: flex; flex-direction: column; gap: 1.25rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);"
                         onmouseover="this.style.transform='translateY(-6px)'; this.style.borderColor='rgba(59, 130, 246, 0.3)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.4)';"
                         onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(255, 255, 255, 0.05)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.2)';">
                        
                        <!-- Cabecera: Inicial + Nombre -->
                        <div style="display: flex; align-items: center; gap: 1.25rem;">
                            <div style="width: 60px; height: 60px; background: ${bgColor}; color: white; border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; box-shadow: 0 4px 12px ${bgColor}44;">
                                ${initials}
                            </div>
                            <h3 style="margin: 0; font-size: 1.4rem; color: #fff; line-height: 1.1; font-weight: 800; text-transform: capitalize;">${c.name}</h3>
                        </div>

                        <!-- Paneles de Dinero (Súper Claros) -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div style="background: ${netDebt > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${netDebt > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.05)'}; padding: 1rem; border-radius: 1rem; text-align: center;">
                                <div style="font-size: 0.75rem; color: ${netDebt > 0 ? '#f87171' : 'var(--secondary)'}; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 0.5rem;">🚨 DEUDA</div>
                                <div style="font-weight: 900; font-size: 1.35rem; color: ${netDebt > 0 ? '#ef4444' : '#4b5563'}; line-height: 1;">
                                    ${netDebt > 0 ? formatCLP(netDebt) : '$0'}
                                </div>
                            </div>
                            <div style="background: ${netCredit > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${netCredit > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}; padding: 1rem; border-radius: 1rem; text-align: center;">
                                <div style="font-size: 0.75rem; color: ${netCredit > 0 ? '#34d399' : 'var(--secondary)'}; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 0.5rem;">💰 A FAVOR</div>
                                <div style="font-weight: 900; font-size: 1.35rem; color: ${netCredit > 0 ? '#10b981' : '#4b5563'}; line-height: 1;">
                                    ${netCredit > 0 ? formatCLP(netCredit) : '$0'}
                                </div>
                            </div>
                        </div>

                        <!-- Botones de Acción -->
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem;">
                            <div style="display: flex; gap: 0.75rem;">
                                <button class="btn" style="flex: 1.5; background: #3b82f6; color: #fff; border-radius: 0.75rem; padding: 0.75rem; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;" 
                                        onclick="CustomersView.showAccountDetails(${c.id})"
                                        onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                                    <span>💳 Ver Estado</span>
                                </button>
                                <button class="btn" style="flex: 1; background: #10b981; color: #fff; border-radius: 0.75rem; padding: 0.75rem; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s;" 
                                        onclick="CustomersView.showAddCreditForm(${c.id})"
                                        onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                                    <span>➕ Abono</span>
                                </button>
                            </div>
                            
                            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05);">
                                ${PermissionService.can('customers.edit') ? `
                                <button class="btn btn-sm" style="background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); width: 36px; height: 36px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="CustomersView.showCustomerForm(${c.id})" title="Editar Datos">✏️</button>` : ''}
                                ${PermissionService.can('customers.delete') ? `
                                <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.05); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.1); width: 36px; height: 36px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="CustomersView.deleteCustomer(${c.id})" title="Desactivar Cliente">🗑️</button>` : ''}
                            </div>
                        </div>
                    </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    async showCustomerForm(id = null) {
        const customer = id ? await Customer.getById(id) : null;

        const content = `
            <form id="customerForm" onsubmit="CustomersView.saveCustomer(event, ${id})">
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" name="name" class="form-control" value="${customer?.name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="text" name="phone" class="form-control" value="${customer?.phone || ''}" inputmode="numeric" pattern="[0-9]*" title="Sólo números" placeholder="Ej: 912345678">
                </div>
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" class="form-control" value="${customer?.email || ''}">
                </div>
                
                <div class="form-group">
                    <label>Límite de crédito (opcional)</label>
                    <input type="number" name="creditLimit" class="form-control" value="${customer?.creditLimit ?? ''}" min="0" step="1" placeholder="Ej: 500000">
                    <small style="color: var(--secondary); display: block; margin-top: 0.25rem;">Si se define, no se podrá fiar por encima de este monto (deuda actual + nueva venta).</small>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('customerForm').requestSubmit()">
                ${id ? 'Actualizar' : 'Crear'}
            </button>
        `;

        showModal(content, {
            title: id ? 'Editar Cliente' : 'Nuevo Cliente',
            footer,
            width: '500px'
        });
    },

    async saveCustomer(event, id) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        if (id) data.id = id;

        try {
            await CustomerController.saveCustomer(data);
            closeModal();
            await this.refresh();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async showAddCreditForm(customerId) {
        const customer = await Customer.getById(customerId);
        const currentCredit = (customer && (customer.balanceCredit != null)) ? parseFloat(customer.balanceCredit) || 0 : 0;
        const cashOpen = await CashRegister.getOpen();

        if (!cashOpen) {
            showNotification('Abre la caja para poder sumar dinero a favor (el monto se registra en caja por método de pago).', 'warning');
            return;
        }

        const content = `
            <div style="margin-bottom: 1rem;">
                <div style="font-size: 0.9rem; color: #374151;">Cliente: <strong>${customer?.name || ''}</strong></div>
                ${currentCredit > 0 ? `<div style="font-size: 0.9rem; margin-top: 0.25rem; color: #374151;">Dinero a favor actual: <strong>${formatCLP(currentCredit)}</strong></div>` : ''}
            </div>
            <div class="form-group">
                <label>Monto a sumar (dinero a favor) *</label>
                <input type="number" id="creditAmount" class="form-control" min="0.01" step="1" placeholder="Ej: 5000" autofocus>
                <small style="color: #64748b;">Este monto se suma a la cuenta del cliente y se registra en caja por el método de pago elegido.</small>
            </div>
            <div class="form-group">
                <label>Método de pago (ingreso en caja)</label>
                <select id="creditPaymentMethod" class="form-control">
                    <option value="cash">💵 Efectivo</option>
                    <option value="card">💳 Tarjeta</option>
                    <option value="qr">📱 QR</option>
                    <option value="other">➕ Otro</option>
                </select>
                <small style="color: #64748b;">El monto se suma a efectivo esperado o al método de pago correspondiente en la caja.</small>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-success" onclick="CustomersView.processAddCredit(${customerId})">
                Sumar a favor
            </button>
        `;

        showModal(content, { title: '💰 Dinero a favor', footer, width: '500px' });
    },

    async processAddCredit(customerId) {
        const openCash = await CashRegister.getOpen();
        if (!openCash) {
            showNotification('Abre la caja para poder sumar dinero a favor.', 'warning');
            return;
        }
        const amountInput = document.getElementById('creditAmount');
        const methodSelect = document.getElementById('creditPaymentMethod');
        if (!amountInput) {
            showNotification('Error: No se encontró el campo de monto', 'error');
            return;
        }
        const amount = parseFloat(amountInput.value);
        const paymentMethod = (methodSelect && methodSelect.value) ? methodSelect.value : 'cash';
        if (!amount || amount <= 0) {
            showNotification('Ingresa un monto válido mayor a 0', 'warning');
            return;
        }
        try {
            await CustomerAccountService.registerCreditDeposit(
                customerId,
                amount,
                paymentMethod,
                openCash.id,
                'Abono dinero a favor - UI'
            );

            const customer = await Customer.getById(customerId);
            const newCredit = (customer.balanceCredit != null) ? parseFloat(customer.balanceCredit) || 0 : 0;
            const methodName = this.getPaymentMethodName(paymentMethod);
            showNotification(`Se sumaron ${formatCLP(amount)} a favor del cliente (${methodName}). Total a favor: ${formatCLP(newCredit)}`, 'success');
            closeModal();
            await this.refresh();
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
        }
    },

    async deleteCustomer(id) {
        const customer = await Customer.getById(id);
        const name = customer ? customer.name : `#${id}`;
        showConfirm(`¿Desactivar al cliente "${name}"? Dejará de aparecer en listados y ventas nuevas, pero se preserva para reportes históricos. Podrás restaurarlo luego.`, async () => {
            try {
                await CustomerController.deleteCustomer(id);
                await this.refresh();
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    },

    /**
     * C1: Mostrar clientes desactivados con opción de restaurar
     */
    async showDeletedCustomers() {
        const deleted = await Customer.getDeleted();

        if (deleted.length === 0) {
            showModal(
                '<div class="empty-state"><div class="empty-state-icon">✅</div>No hay clientes desactivados</div>',
                { title: 'Clientes Desactivados', footer: '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>', width: '600px' }
            );
            return;
        }

        const content = `
            <p style="margin-bottom: 1rem; color: var(--secondary);">
                Estos clientes están desactivados. No aparecen en ventas nuevas ni listados, pero se preservan para reportes.
            </p>
            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Desactivado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deleted.map(c => `
                            <tr style="opacity: 0.8;">
                                <td><strong>${c.name}</strong></td>
                                <td>${c.phone || '-'}</td>
                                <td>${c.deletedAt ? new Date(c.deletedAt).toLocaleDateString('es-CL') : '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-success" onclick="CustomersView.restoreCustomer(${c.id})">
                                        Restaurar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        showModal(content, {
            title: `Clientes Desactivados (${deleted.length})`,
            footer: '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>',
            width: '600px'
        });
    },

    async restoreCustomer(id) {
        try {
            await CustomerController.restoreCustomer(id);
            closeModal();
            await this.refresh();
            await this.showDeletedCustomers();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async refresh() {
        const customers = await Customer.getAll();
        const pendingSales = await Sale.getPendingSales();
        const debtMap = {};
        pendingSales.forEach(sale => {
            if (sale.customerId) {
                const debt = (parseFloat(sale.total) || 0) - (parseFloat(sale.paidAmount) || 0);
                if (debt > 0) {
                    debtMap[sale.customerId] = (debtMap[sale.customerId] || 0) + debt;
                }
            }
        });
        document.getElementById('customersTable').innerHTML = this.renderCustomersTable(customers, debtMap);
    },

    async showAccountDetails(customerId) {
        const customer = await Customer.getById(customerId);
        const balance = await Customer.getAccountBalance(customerId);
        const rawPayments = await Customer.getPaymentHistory(customerId);
        const deposits = await CustomerCreditDeposit.getByCustomer(customerId);
        const creditUses = await CustomerCreditUse.getByCustomer(customerId);
        const cashOpen = !!(await CashRegister.getOpen());

        // Enriquecer pagos con número de venta
        const payments = [];
        for (const p of rawPayments) {
            let saleNumber = p.saleId;
            try {
                const sale = await Sale.getById(p.saleId);
                if (sale && sale.saleNumber) saleNumber = sale.saleNumber;
            } catch (_) { /* fallback: usar saleId */ }
            payments.push({ ...p, saleNumber });
        }

        const displayBalance = balance.displayBalance != null ? parseFloat(balance.displayBalance) : (balance.totalDebt || 0) - (balance.balanceCredit || 0);
        const netDebt = Math.max(0, displayBalance);
        const netCredit = Math.max(0, -displayBalance);

        // Movimientos de saldo a favor: depósitos (+), usos (-), ordenados por fecha descendente
        const creditMovements = [
            ...deposits.map(d => ({ date: d.date, type: 'deposit', amount: parseFloat(d.amount) || 0, paymentMethod: d.paymentMethod, saleNumber: null })),
            ...creditUses.map(u => ({ date: u.date, type: 'use', amount: parseFloat(u.amount) || 0, paymentMethod: null, saleNumber: u.saleNumber }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        const content = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.5rem;">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">${customer.name}</h2>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    ${customer.phone || ''} ${customer.email ? '• ' + customer.email : ''}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.75rem; font-size: 0.95rem;">
                    ${netDebt > 0 ? `
                    <span style="background: rgba(239,68,68,0.9); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600;">
                        Deuda: ${formatCLP(netDebt)}
                    </span>
                    ` : `
                    <span style="background: rgba(16,185,129,0.9); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600;">
                        ✓ Sin deuda
                    </span>
                    `}
                    ${netCredit > 0 ? `
                    <span style="background: rgba(16,185,129,0.9); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600;">
                        💰 A favor: ${formatCLP(netCredit)}
                    </span>
                    ` : ''}
                </div>
            </div>
            
            ${!cashOpen && netDebt > 0 ? `
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 0.5rem;">
                    <div style="font-weight: 600; color: #92400e; margin-bottom: 0.5rem;">⚠️ Caja cerrada</div>
                    <p style="margin: 0 0 1rem 0; font-size: 0.9rem; color: #78350f;">Abre la caja para poder registrar pagos de deuda.</p>
                    <button class="btn btn-primary" onclick="app.navigate('cash'); closeModal();">Ir a Caja</button>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: ${netDebt > 0 ? '#fee2e2' : '#d1fae5'}; border-radius: 0.5rem; border: 2px solid ${netDebt > 0 ? '#ef4444' : '#10b981'};">
                <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">SALDO TOTAL</div>
                <div style="font-size: 2.5rem; font-weight: bold; color: ${netDebt > 0 ? '#dc2626' : '#059669'};">
                    ${netDebt > 0 ? formatCLP(netDebt) : (netCredit > 0 ? formatCLP(netCredit) : formatCLP(0))}
                </div>
                ${netDebt > 0
                ? '<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #991b1b;">Pago parcial / Pendiente de pago</div>'
                : netCredit > 0
                    ? '<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #065f46;">💰 Saldo a favor del cliente</div>'
                    : '<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #065f46;">✓ Pago completo — Sin deudas pendientes</div>'}
                ${customer.creditLimit != null && !isNaN(customer.creditLimit) ? `<div style="margin-top: 0.25rem; font-size: 0.9rem; color: #374151;">Límite de crédito: <strong>${formatCLP(customer.creditLimit)}</strong></div>` : ''}
                
                ${netDebt > 0 && cashOpen ? `
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-success" style="flex: 1; min-width: 140px;" onclick="CustomersView.showPayTotalDebtForm(${customerId}, ${netDebt})">
                            Pagar Deuda Total (${formatCLP(netDebt)})
                        </button>
                        <button class="btn btn-warning" style="flex: 1; min-width: 100px;" onclick="CustomersView.showAbonarFromSaldoForm(${customerId}, ${netDebt})">
                            Abonar
                        </button>
                    </div>
                ` : ''}
            </div>
            
            ${balance.pendingSales.length > 0 ? `
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.15rem; font-weight: 700; color: #0f172a;">📝 Detalle por venta pendiente</h3>
                    <div style="max-height: 360px; overflow-y: auto;">
                        ${balance.pendingSales.map(sale => `
                            <div style="padding: 1rem; margin-bottom: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; background: #ffffff;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                                    <span style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">Venta #${sale.saleNumber}</span>
                                    <span style="font-size: 0.9rem; font-weight: 500; color: #334155;">${formatDateTime(sale.date)}</span>
                                </div>
                                <div style="padding: 0.6rem 0.75rem; background: #f1f5f9; border-radius: 0.375rem;">
                                    ${(sale.items || []).map(item => `
                                        <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.95rem;">
                                            <span style="color: #0f172a; font-weight: 500;">${item.name} (x${item.quantity})</span>
                                            <span style="color: #0f172a; font-weight: 600;">${formatCLP(item.total)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; padding: 0.4rem 0.75rem; font-size: 0.9rem;">
                                    <span style="color: #64748b;">Total: <strong style="color: #0f172a;">${formatCLP(sale.total)}</strong></span>
                                    <span style="color: #64748b;">Pagado: <strong style="color: #059669;">${formatCLP(sale.paid || 0)}</strong></span>
                                    <span style="color: #dc2626; font-weight: 700;">Debe: ${formatCLP(sale.remaining)}</span>
                                </div>
                                ${cashOpen ? `
                                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                    <button class="btn btn-sm btn-success" style="flex: 1;" onclick="CustomersView.showPaymentForm(${sale.saleId}, ${customerId}, ${sale.remaining})">
                                        Pagar Total (${formatCLP(sale.remaining)})
                                    </button>
                                    <button class="btn btn-sm btn-warning" style="flex: 1;" onclick="CustomersView.showPartialPaymentForm(${sale.saleId}, ${customerId}, ${sale.remaining})">
                                        Abono Parcial
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${payments.length > 0 ? (() => {
                // Separar pagos reales de pagos de descuento (tipo 'discount')
                // Los pagos 'discount' son registros técnicos para que la caja no descuadre;
                // NO representan dinero real recibido, solo deuda perdonada.
                const realPayments = payments.filter(p => p.paymentMethod !== 'discount');
                const discountPayments = payments.filter(p => p.paymentMethod === 'discount');
                const totalDiscounted = discountPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

                // Agrupar pagos REALES en transacciones independientes
                // Pagos con la misma fecha (mismo segundo) y mismas notas = misma transacción
                const txGroups = [];
                const sorted = [...realPayments].sort((a, b) => new Date(b.date) - new Date(a.date));
                for (const p of sorted) {
                    const pDateKey = p.date ? p.date.substring(0, 19) : '';
                    const pNotes = p.notes || '';
                    const existing = txGroups.find(g => g.dateKey === pDateKey && g.notes === pNotes && g.method === p.paymentMethod);
                    if (existing) {
                        existing.payments.push(p);
                        existing.totalAmount += (parseFloat(p.amount) || 0);
                    } else {
                        txGroups.push({
                            dateKey: pDateKey,
                            date: p.date,
                            notes: pNotes,
                            method: p.paymentMethod,
                            payments: [p],
                            totalAmount: parseFloat(p.amount) || 0
                        });
                    }
                }

                const totalPaid = realPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                const totalCash = realPayments.filter(p => p.paymentMethod === 'cash').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                const totalOther = realPayments.filter(p => p.paymentMethod !== 'cash').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

                return `
                <div style="margin-top: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.1rem;">💰 Historial de Pagos (${txGroups.length} transacción${txGroups.length !== 1 ? 'es' : ''} — ${realPayments.length} registro${realPayments.length !== 1 ? 's' : ''})</h3>

                    <div style="display: grid; grid-template-columns: repeat(${totalDiscounted > 0 ? 4 : 3}, 1fr); gap: 0.5rem; margin-bottom: 1rem; padding: 0.75rem; background: var(--light); border-radius: 0.5rem; font-size: 0.85rem;">
                        <div style="text-align: center;">
                            <div style="font-weight: 600; color: var(--success); font-size: 1.1rem;">${formatCLP(totalPaid)}</div>
                            <div style="color: var(--secondary); font-size: 0.8rem;">Total pagado</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 600; font-size: 1.1rem;">${formatCLP(totalCash)}</div>
                            <div style="color: var(--secondary); font-size: 0.8rem;">En efectivo</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 600; font-size: 1.1rem;">${formatCLP(totalOther)}</div>
                            <div style="color: var(--secondary); font-size: 0.8rem;">Otros métodos</div>
                        </div>
                        ${totalDiscounted > 0 ? `
                        <div style="text-align: center;">
                            <div style="font-weight: 600; color: #f59e0b; font-size: 1.1rem;">${formatCLP(totalDiscounted)}</div>
                            <div style="color: var(--secondary); font-size: 0.8rem;">Descontado</div>
                        </div>
                        ` : ''}
                    </div>

                    <div style="max-height: 500px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;">
                        ${txGroups.map((tx, txIdx) => {
                    const hasDiscount = tx.notes && (tx.notes.includes('descuento') || tx.notes.includes('Descuento'));
                    const methodIcon = tx.method === 'cash' ? '💵' : tx.method === 'card' ? '💳' : tx.method === 'qr' ? '📱' : '➕';
                    const methodName = this.getPaymentMethodName(tx.method);
                    const borderColor = hasDiscount ? '#f59e0b' : '#10b981';
                    const bgColor = hasDiscount ? 'rgba(251, 191, 36, 0.06)' : 'rgba(16, 185, 129, 0.04)';

                    // Parsear info de deuda y descuento desde las notas
                    let originalDebt = 0;
                    let discountAmount = 0;
                    let discountDesc = '';
                    let userNotes = '';

                    // Intentar parsear "Deuda: $X" de las notas (presente en pagos con y sin descuento)
                    const deudaMatch = tx.notes ? tx.notes.match(/Deuda:\s*\$?([\d.,]+)/i) : null;
                    const pagadoMatch = tx.notes ? tx.notes.match(/Pagado:\s*\$?([\d.,]+)/i) : null;

                    if (hasDiscount) {
                        // Formato: "Pago con descuento (÷1.4) | Deuda: $15.000 | Descuento: $4.286 | Pagado: $10.714 | notas"
                        const descuentoMatch = tx.notes.match(/Descuento:\s*\$?([\d.,]+)/i);
                        const descMatch = tx.notes.match(/\(([^)]+)\)/);
                        if (deudaMatch) originalDebt = parseFloat(deudaMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
                        if (descuentoMatch) discountAmount = parseFloat(descuentoMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
                        if (descMatch) discountDesc = descMatch[1];
                        // Fallbacks
                        if (!originalDebt && discountAmount > 0) originalDebt = tx.totalAmount + discountAmount;
                        if (!originalDebt) originalDebt = tx.totalAmount;
                    } else if (deudaMatch) {
                        // Formato nuevo sin descuento: "Pago de deuda total | Deuda: $15.000 | Pagado: $15.000"
                        originalDebt = parseFloat(deudaMatch[1].replace(/\./g, '').replace(',', '.')) || tx.totalAmount;
                    } else {
                        // Pagos antiguos sin formato estructurado
                        originalDebt = tx.totalAmount;
                    }

                    // Extraer notas de usuario (último segmento que no sea campo de sistema)
                    if (tx.notes) {
                        const parts = tx.notes.split('|').map(s => s.trim());
                        const lastPart = parts[parts.length - 1];
                        if (lastPart && !lastPart.match(/^(Pago|Deuda|Descuento|Pagado)/i)) userNotes = lastPart;
                    }

                    return `
                            <div style="border: 1px solid ${borderColor}44; border-left: 4px solid ${borderColor}; border-radius: 0.5rem; background: ${bgColor}; overflow: hidden;">
                                <!-- Cabecera -->
                                <div style="padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-size: 1.3rem;">${methodIcon}</span>
                                        <div>
                                            <div style="font-size: 0.85rem; color: var(--secondary);">${formatDateTime(tx.date)}</div>
                                            <div style="font-size: 0.8rem; color: var(--secondary);">${methodName}</div>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="font-size: 0.8rem; padding: 0.15rem 0.5rem; border-radius: 1rem; background: ${borderColor}22; color: ${borderColor}; font-weight: 600;">
                                            ${tx.payments.length === 1 ? 'Pago individual' : tx.payments.length + ' ventas saldadas'}
                                        </span>
                                    </div>
                                </div>

                                <!-- Desglose: Deuda original → Descuento → Total pagado -->
                                <div style="padding: 0.5rem 1rem; display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 0.25rem; align-items: center; text-align: center;">
                                    <div>
                                        <div style="font-size: 0.7rem; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.5px;">Deuda inicial</div>
                                        <div style="font-size: 1.1rem; font-weight: 700; color: #dc2626;">${formatCLP(originalDebt)}</div>
                                    </div>
                                    <div style="font-size: 1.2rem; color: var(--secondary);">→</div>
                                    <div>
                                        <div style="font-size: 0.7rem; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.5px;">Descuento${discountDesc ? ' (' + discountDesc + ')' : ''}</div>
                                        <div style="font-size: 1.1rem; font-weight: 700; color: ${discountAmount > 0 ? '#f59e0b' : 'var(--secondary)'};">
                                            ${discountAmount > 0 ? '-' + formatCLP(discountAmount) : 'Sin dcto.'}
                                        </div>
                                    </div>
                                    <div style="font-size: 1.2rem; color: var(--secondary);">→</div>
                                    <div>
                                        <div style="font-size: 0.7rem; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.5px;">Total pagado</div>
                                        <div style="font-size: 1.2rem; font-weight: 800; color: #059669;">${formatCLP(tx.totalAmount)}</div>
                                    </div>
                                </div>

                                ${userNotes ? `
                                <div style="padding: 0.3rem 1rem; font-size: 0.8rem; color: var(--secondary); font-style: italic;">
                                    📝 ${userNotes}
                                </div>
                                ` : ''}

                                <!-- Detalle por venta -->
                                <div style="padding: 0.4rem 1rem 0.6rem;">
                                    <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                                        <thead>
                                            <tr style="color: var(--secondary);">
                                                <th style="padding: 0.3rem 0; text-align: left; font-weight: 500;">Venta</th>
                                                <th style="padding: 0.3rem 0; text-align: right; font-weight: 500;">Monto aplicado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${tx.payments.map(p => `
                                            <tr style="border-top: 1px solid var(--border);">
                                                <td style="padding: 0.3rem 0; font-weight: 500;">#${p.saleNumber}</td>
                                                <td style="padding: 0.3rem 0; text-align: right; font-weight: 600; color: var(--success);">${formatCLP(p.amount)}</td>
                                            </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            `;
                }).join('')}
                    </div>
                </div>
                `;
            })() : ''}
            
            ${creditMovements.length > 0 ? `
                <div style="margin-top: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.1rem;">📋 Movimientos de saldo a favor</h3>
                    <div style="max-height: 220px; overflow-y: auto;">
                        <table style="width: 100%; font-size: 0.9rem;">
                            <thead style="background: var(--light); position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 0.5rem;">Fecha</th>
                                    <th style="padding: 0.5rem;">Concepto</th>
                                    <th style="padding: 0.5rem; text-align: right;">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${creditMovements.map(m => `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 0.5rem;">${formatDateTime(m.date)}</td>
                                        <td style="padding: 0.5rem;">${m.type === 'deposit' ? 'Depósito (' + (this.getPaymentMethodName ? this.getPaymentMethodName(m.paymentMethod) : m.paymentMethod) + ')' : 'Uso en venta' + (m.saleNumber != null ? ' #' + m.saleNumber : '')}</td>
                                        <td style="padding: 0.5rem; text-align: right; font-weight: 600; color: ${m.type === 'deposit' ? 'var(--success)' : '#64748b'};">
                                            ${m.type === 'deposit' ? '+' : '-'}${formatCLP(m.amount)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        `;

        showModal(content, {
            title: `Cuenta Corriente - ${customer.name}`,
            footer,
            width: '800px'
        });
    },

    async showPaymentForm(saleId, customerId, amount) {
        const sale = await Sale.getById(saleId);

        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">Pago completo de venta #${sale.saleNumber}</div>
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary);">${formatCLP(amount)}</div>
            </div>
            
            <div class="form-group">
                <label>Método de Pago</label>
                <select id="paymentMethod" class="form-control">
                    <option value="cash">💵 Efectivo</option>
                    <option value="card">💳 Tarjeta</option>
                    <option value="qr">📱 QR</option>
                    <option value="other">➕ Otro</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Notas (opcional)</label>
                <textarea id="paymentNotes" class="form-control" rows="2" placeholder="Observaciones del pago..."></textarea>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="CustomersView.showAccountDetails(${customerId})">Volver</button>
            <button class="btn btn-success" onclick="CustomersView.processPayment(${saleId}, ${customerId}, ${amount})">
                Confirmar Pago de ${formatCLP(amount)}
            </button>
        `;

        showModal(content, { title: 'Registrar Pago', footer, width: '500px' });
    },

    async showPartialPaymentForm(saleId, customerId, maxAmount) {
        const sale = await Sale.getById(saleId);

        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">Pago parcial de venta #${sale.saleNumber}</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--danger);">Deuda: ${formatCLP(maxAmount)}</div>
            </div>
            
            <div class="form-group">
                <label>Monto a Pagar *</label>
                <input type="number" id="partialAmount" class="form-control" min="1" max="${maxAmount}" step="10" placeholder="Ingresa el monto" autofocus>
                <small>Máximo: ${formatCLP(maxAmount)}</small>
            </div>
            
            <div class="form-group">
                <label>Método de Pago</label>
                <select id="paymentMethod" class="form-control">
                    <option value="cash">💵 Efectivo</option>
                    <option value="card">💳 Tarjeta</option>
                    <option value="qr">📱 QR</option>
                    <option value="other">➕ Otro</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Notas (opcional)</label>
                <textarea id="paymentNotes" class="form-control" rows="2" placeholder="Observaciones del pago..."></textarea>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="CustomersView.showAccountDetails(${customerId})">Volver</button>
            <button class="btn btn-success" onclick="CustomersView.processPartialPayment(${saleId}, ${customerId}, ${maxAmount})">
                Confirmar Pago
            </button>
        `;

        showModal(content, { title: 'Registrar Pago Parcial', footer, width: '500px' });
    },

    async processPayment(saleId, customerId, amount) {
        const openCash = await CashRegister.getOpen();
        if (!openCash) {
            showNotification('Abre la caja para registrar pagos de deuda.', 'warning');
            return;
        }

        const paymentMethodSelect = document.getElementById('paymentMethod');
        const notesElement = document.getElementById('paymentNotes');

        if (!paymentMethodSelect) {
            showNotification('Error: No se encontró el selector de método de pago', 'error');
            return;
        }

        const paymentMethod = paymentMethodSelect.value || 'cash';
        const notes = notesElement ? notesElement.value.trim() : '';

        try {
            // Registrar el pago con el método de pago seleccionado
            await Payment.create({
                saleId: saleId,
                customerId: customerId,
                amount: amount,
                paymentMethod: paymentMethod,
                notes: notes
            });

            const methodName = this.getPaymentMethodName(paymentMethod);
            showNotification(`Pago de ${formatCLP(amount)} registrado exitosamente (${methodName})`, 'success');
            this.showAccountDetails(customerId);
            this.refresh();
        } catch (error) {
            showNotification('Error al registrar el pago: ' + error.message, 'error');
            console.error('Error al registrar pago:', error);
        }
    },

    async processPartialPayment(saleId, customerId, maxAmount) {
        const openCash = await CashRegister.getOpen();
        if (!openCash) {
            showNotification('Abre la caja para registrar pagos de deuda.', 'warning');
            return;
        }

        const amountInput = document.getElementById('partialAmount');
        const paymentMethodSelect = document.getElementById('paymentMethod');
        const notesElement = document.getElementById('paymentNotes');

        if (!amountInput) {
            showNotification('Error: No se encontró el campo de monto', 'error');
            return;
        }

        if (!paymentMethodSelect) {
            showNotification('Error: No se encontró el selector de método de pago', 'error');
            return;
        }

        const amount = parseFloat(amountInput.value);
        const paymentMethod = paymentMethodSelect.value || 'cash';
        const notes = notesElement ? notesElement.value.trim() : '';

        if (!amount || amount <= 0) {
            showNotification('Ingresa un monto válido', 'warning');
            return;
        }

        if (amount > maxAmount) {
            showNotification(`El monto no puede ser mayor a ${formatCLP(maxAmount)}`, 'warning');
            return;
        }

        try {
            // Registrar el pago parcial con el método de pago seleccionado
            await Payment.create({
                saleId: saleId,
                customerId: customerId,
                amount: amount,
                paymentMethod: paymentMethod,
                notes: notes
            });

            const methodName = this.getPaymentMethodName(paymentMethod);
            showNotification(`Pago parcial de ${formatCLP(amount)} registrado exitosamente (${methodName})`, 'success');
            this.showAccountDetails(customerId);
            this.refresh();
        } catch (error) {
            showNotification('Error al registrar el pago: ' + error.message, 'error');
            console.error('Error al registrar pago parcial:', error);
        }
    },

    async showAbonarFromSaldoForm(customerId, maxAmount) {
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">Abonar a la deuda (saldo total)</div>
                <div style="font-size: 1.25rem; font-weight: bold; color: #0f172a;">Máximo: ${formatCLP(maxAmount)}</div>
            </div>
            <div class="form-group">
                <label>Monto a abonar *</label>
                <input type="number" id="abonarAmount" class="form-control" min="1" max="${maxAmount}" step="10" placeholder="Ingresa el monto">
                <small style="color: #64748b;">Máximo: ${formatCLP(maxAmount)}</small>
            </div>
            <div class="form-group">
                <label>Método de Pago</label>
                <select id="paymentMethod" class="form-control">
                    <option value="cash">💵 Efectivo</option>
                    <option value="card">💳 Tarjeta</option>
                    <option value="qr">📱 QR</option>
                    <option value="other">➕ Otro</option>
                </select>
            </div>
            <div class="form-group">
                <label>Notas (opcional)</label>
                <textarea id="paymentNotes" class="form-control" rows="2" placeholder="Observaciones del pago..."></textarea>
            </div>
        `;
        const footer = `
            <button class="btn btn-secondary" onclick="CustomersView.showAccountDetails(${customerId})">Volver</button>
            <button class="btn btn-warning" onclick="CustomersView.processAbonarFromSaldo(${customerId}, ${maxAmount})">
                Confirmar abono
            </button>
        `;
        showModal(content, { title: 'Abonar a la deuda', footer, width: '500px' });
    },

    async processAbonarFromSaldo(customerId, maxAmount) {
        const openCash = await CashRegister.getOpen();
        if (!openCash) {
            showNotification('Abre la caja para registrar pagos de deuda.', 'warning');
            return;
        }
        const amountInput = document.getElementById('abonarAmount');
        const paymentMethodSelect = document.getElementById('paymentMethod');
        const notesElement = document.getElementById('paymentNotes');
        if (!amountInput) {
            showNotification('Error: No se encontró el campo de monto', 'error');
            return;
        }
        if (!paymentMethodSelect) {
            showNotification('Error: No se encontró el selector de método de pago', 'error');
            return;
        }
        const amount = parseFloat(amountInput.value);
        const paymentMethod = paymentMethodSelect.value || 'cash';
        const notes = notesElement ? notesElement.value.trim() : 'Abono a deuda';
        if (!amount || amount <= 0) {
            showNotification('Ingresa un monto válido', 'warning');
            return;
        }
        if (amount > maxAmount) {
            showNotification(`El monto no puede ser mayor a ${formatCLP(maxAmount)}`, 'warning');
            return;
        }
        try {
            const result = await CustomerAccountService.registerAccountPayment(
                customerId,
                amount,
                paymentMethod,
                openCash.id,
                notes
            );

            const methodName = this.getPaymentMethodName(paymentMethod);
            showNotification(`Abono de ${formatCLP(result.totalPaid)} registrado (${methodName})`, 'success');
            this.showAccountDetails(customerId);
            this.refresh();
        } catch (error) {
            showNotification('Error al registrar el abono: ' + error.message, 'error');
        }
    },

    async showPayTotalDebtForm(customerId, totalDebt) {
        const content = `
            <div style="text-align: center; margin-bottom: 1rem;">
                <div style="font-size: 1rem; margin-bottom: 0.5rem;">Deuda total</div>
                <div style="font-size: 1.75rem; font-weight: bold; color: var(--danger);">${formatCLP(totalDebt)}</div>
            </div>
            
            <div class="form-group" style="background: var(--light); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <label style="margin-bottom: 0.5rem;">Descuento (opcional)</label>
                <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem;">
                    <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                        <input type="radio" name="discountType" value="divisor" checked>
                        <span>Dividir por (ej: 1.4)</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
                        <input type="radio" name="discountType" value="clp">
                        <span>Monto (CLP)</span>
                    </label>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="number" id="discountValue" class="form-control" min="0" step="0.01" placeholder="1.4" value="" style="max-width: 140px;">
                    <span id="discountSuffix">(total ÷ valor = a pagar)</span>
                </div>
                <small id="discountHint" style="color: var(--text-muted); margin-top: 0.35rem; display: block;">Ej: 15650 ÷ 1.4 = 11.178 → pagas 11.178</small>
            </div>
            
            <div style="text-align: center; padding: 0.75rem; background: rgba(34, 197, 94, 0.15); border-radius: 0.5rem; margin-bottom: 1rem;">
                <div style="font-size: 0.9rem; color: var(--text-muted);">Total a pagar</div>
                <div id="finalAmountDisplay" style="font-size: 1.5rem; font-weight: bold; color: var(--success);">${formatCLP(totalDebt)}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">Este monto entra a caja con el método de pago que elijas abajo.</div>
            </div>
            
            <div class="form-group">
                <label>Método de Pago</label>
                <select id="paymentMethod" class="form-control">
                    <option value="cash">💵 Efectivo</option>
                    <option value="card">💳 Tarjeta</option>
                    <option value="qr">📱 QR</option>
                    <option value="other">➕ Otro</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Notas (opcional)</label>
                <textarea id="paymentNotes" class="form-control" rows="2" placeholder="Observaciones del pago..."></textarea>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="CustomersView.showAccountDetails(${customerId})">Volver</button>
            <button class="btn btn-success" id="btnConfirmPayTotalDebt">
                Confirmar Pago
            </button>
        `;

        showModal(content, { title: 'Pagar Deuda Total', footer, width: '500px' });

        const totalDebtNum = parseFloat(totalDebt) || 0;
        const discountInput = document.getElementById('discountValue');
        const discountSuffix = document.getElementById('discountSuffix');
        const finalDisplay = document.getElementById('finalAmountDisplay');
        const radios = document.querySelectorAll('input[name="discountType"]');

        function updateFinalAmount() {
            const type = document.querySelector('input[name="discountType"]:checked')?.value || 'divisor';
            const val = parseFloat(discountInput?.value) || 0;
            let final = totalDebtNum;
            if (type === 'divisor') {
                if (val >= 0.01) final = totalDebtNum / val;
            } else {
                final = Math.max(0, totalDebtNum - Math.min(totalDebtNum, Math.max(0, val)));
            }
            final = Math.max(0, Math.round(final * 10) / 10);
            if (finalDisplay) finalDisplay.textContent = formatCLP(final);
            const btn = document.getElementById('btnConfirmPayTotalDebt');
            if (btn) btn.textContent = 'Confirmar Pago de ' + formatCLP(final);
        }

        radios.forEach(r => r.addEventListener('change', () => {
            const hint = document.getElementById('discountHint');
            if (r.value === 'divisor') {
                discountSuffix.textContent = '(total ÷ valor = a pagar)';
                discountInput.placeholder = '1.4';
                if (hint) hint.textContent = 'Ej: 15650 ÷ 1.4 = 11.178 → pagas 11.178';
            } else {
                discountSuffix.textContent = 'CLP';
                discountInput.placeholder = '0';
                if (hint) hint.textContent = 'Monto fijo a descontar de la deuda.';
            }
            discountInput.value = '';
            updateFinalAmount();
        }));
        if (discountInput) discountInput.addEventListener('input', updateFinalAmount);

        document.getElementById('btnConfirmPayTotalDebt').addEventListener('click', () => {
            const type = document.querySelector('input[name="discountType"]:checked')?.value || 'divisor';
            const val = parseFloat(document.getElementById('discountValue').value) || 0;
            let amountToPay = totalDebtNum;
            let discountAmount = 0;
            if (type === 'divisor') {
                if (val >= 0.01) amountToPay = totalDebtNum / val;
            } else {
                amountToPay = Math.max(0, totalDebtNum - Math.min(totalDebtNum, Math.max(0, val)));
            }
            amountToPay = Math.max(0, Math.round(amountToPay * 10) / 10);
            discountAmount = Math.max(0, Math.round((totalDebtNum - amountToPay) * 10) / 10);

            const paymentMethod = document.getElementById('paymentMethod')?.value || 'cash';
            const userNotes = (document.getElementById('paymentNotes')?.value || '').trim();

            // Construir notas con detalle completo (siempre incluir deuda original)
            let notes = '';
            if (discountAmount > 0) {
                const discountDesc = type === 'divisor' ? `÷${val}` : `-${formatCLP(val)}`;
                notes = `Pago con descuento (${discountDesc}) | Deuda: ${formatCLP(totalDebtNum)} | Descuento: ${formatCLP(discountAmount)} | Pagado: ${formatCLP(amountToPay)}`;
            } else {
                notes = `Pago de deuda total | Deuda: ${formatCLP(totalDebtNum)} | Pagado: ${formatCLP(amountToPay)}`;
            }
            if (userNotes) notes += ' | ' + userNotes;

            // Pasar info de descuento para metadata
            const discountInfo = discountAmount > 0 ? {
                originalDebt: totalDebtNum,
                discountType: type,
                discountValue: val,
                discountAmount: discountAmount,
                finalAmount: amountToPay
            } : null;

            closeModal();
            CustomersView.payTotalDebt(customerId, amountToPay, paymentMethod, notes, discountInfo);
        });
    },

    async payTotalDebt(customerId, amountToPay, paymentMethodFromForm = null, notesFromForm = null, discountInfo = null) {
        const openCash = await CashRegister.getOpen();
        if (!openCash) {
            showNotification('Abre la caja para registrar pagos de deuda.', 'warning');
            return;
        }

        let paymentMethod = paymentMethodFromForm;
        let notes = notesFromForm;
        if (paymentMethod == null || notes == null) {
            const paymentMethodSelect = document.getElementById('paymentMethod');
            const notesElement = document.getElementById('paymentNotes');
            if (!paymentMethodSelect) {
                showNotification('Error: No se encontró el selector de método de pago', 'error');
                return;
            }
            paymentMethod = paymentMethodSelect.value || 'cash';
            notes = notesElement ? notesElement.value.trim() : 'Pago de deuda total';
        }
        if (!notes) notes = 'Pago de deuda total';

        try {
            const balance = await Customer.getAccountBalance(customerId);
            let remainingToPay = parseFloat(amountToPay) || 0;
            let totalPaid = 0;

            // Registrar pago por cada venta pendiente hasta cubrir amountToPay (monto con descuento)
            for (const sale of balance.pendingSales) {
                if (remainingToPay <= 0) break;

                const paymentAmount = Math.min(sale.remaining, remainingToPay);

                await Payment.create({
                    saleId: sale.saleId,
                    customerId: customerId,
                    amount: paymentAmount,
                    paymentMethod: paymentMethod,
                    notes: notes || 'Pago de deuda total'
                });

                totalPaid += paymentAmount;
                remainingToPay -= paymentAmount;
            }

            // Saldar completamente: marcar cada venta pendiente como pagada al 100%
            // CRITICAL FIX: Para ventas que no recibieron pago real (o solo parcial),
            // crear un Payment tipo 'discount' con el monto perdonado.
            // Esto evita que getTotalByPaymentMethod cuente paidAmount como dinero real
            // (porque payments.length > 0 hace que se use la suma de Payments, no paidAmount).
            // 'discount' NO está en el mapa de totals {cash,card,qr,other}, así que la caja lo ignora.
            const nowISO = new Date().toISOString();
            for (const sale of balance.pendingSales) {
                const fullSale = await Sale.getById(sale.saleId);
                if (!fullSale) continue;
                const total = parseFloat(fullSale.total) || 0;
                const paid = parseFloat(fullSale.paidAmount) || 0;
                if (total > 0 && paid < total - 0.01) {
                    const forgivenAmount = Math.round((total - paid) * 10) / 10;
                    if (forgivenAmount > 0) {
                        // Crear Payment de descuento para que la venta tenga payments.length > 0
                        await Payment.createPaymentRecord({
                            saleId: sale.saleId,
                            customerId: customerId,
                            amount: forgivenAmount,
                            paymentMethod: 'discount',
                            date: nowISO,
                            notes: notes || 'Descuento aplicado',
                            cashRegisterId: openCash.id
                        });
                    }
                    await Sale.updateSale(sale.saleId, { paidAmount: total, status: 'completed' });
                }
            }

            // C2: Audit log con detalle de descuento si aplica
            if (discountInfo) {
                try {
                    AuditLogService.log({
                        entity: 'customer', entityId: customerId, action: 'discountPayment',
                        summary: `Pago con descuento: deuda ${formatCLP(discountInfo.originalDebt)} → pagó ${formatCLP(totalPaid)} (descuento: ${formatCLP(discountInfo.discountAmount)})`,
                        metadata: {
                            customerId,
                            ...discountInfo,
                            paymentMethod,
                            totalPaid
                        }
                    });
                } catch (_) { /* No bloquear */ }
            }

            const methodName = this.getPaymentMethodName(paymentMethod);
            const discountMsg = discountInfo ? ` — Descuento: ${formatCLP(discountInfo.discountAmount)}` : '';
            showNotification(`Deuda saldada (${formatCLP(totalPaid)} - ${methodName}${discountMsg})`, 'success');
            this.showAccountDetails(customerId);
            this.refresh();
        } catch (error) {
            showNotification('Error al procesar el pago: ' + error.message, 'error');
            console.error('Error al pagar deuda total:', error);
        }
    },

    getPaymentMethodName(method) {
        const names = {
            cash: 'Efectivo',
            card: 'Tarjeta',
            qr: 'QR',
            other: 'Otro',
            pending: 'Anotado',
            discount: 'Descuento'
        };
        return names[method] || method;
    }
};
