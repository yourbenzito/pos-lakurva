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
        
        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1>Clientes</h1>
                        <p>Gestiona tu base de clientes</p>
                    </div>
                    <button class="btn btn-primary" onclick="CustomersView.showCustomerForm()">
                        Nuevo Cliente
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div class="form-group">
                    <div class="search-box">
                        <input type="text" 
                               id="searchCustomers" 
                               class="form-control" 
                               placeholder="Buscar clientes...">
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
        
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Email</th>
                            <th>Deuda Total</th>
                            <th>Fecha Registro</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map(c => {
                            const debt = debtMap[c.id] || 0;
                            return `
                            <tr>
                                <td><strong>${c.name}</strong></td>
                                <td>${c.phone || '-'}</td>
                                <td>${c.email || '-'}</td>
                                <td>
                                    ${debt > 0 
                                        ? `<span class="badge badge-danger">${formatCLP(debt)}</span>` 
                                        : `<span class="badge badge-success">Sin deuda</span>`
                                    }
                                </td>
                                <td>${formatDate(c.createdAt)}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="CustomersView.showAccountDetails(${c.id})"
                                            title="Ver cuenta corriente">
                                        💳 Cuenta
                                    </button>
                                    <button class="btn btn-sm btn-secondary" 
                                            onclick="CustomersView.showCustomerForm(${c.id})">
                                        Editar
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="CustomersView.deleteCustomer(${c.id})">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `;}).join('')}
                    </tbody>
                </table>
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
                    <input type="tel" name="phone" class="form-control" value="${customer?.phone || ''}">
                </div>
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" class="form-control" value="${customer?.email || ''}">
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
    
    async deleteCustomer(id) {
        confirm('¿Eliminar este cliente?', async () => {
            try {
                await CustomerController.deleteCustomer(id);
                await this.refresh();
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    },
    
    async refresh() {
        const customers = await Customer.getAll();
        document.getElementById('customersTable').innerHTML = this.renderCustomersTable(customers);
    },
    
    async showAccountDetails(customerId) {
        const customer = await Customer.getById(customerId);
        const balance = await Customer.getAccountBalance(customerId);
        const payments = await Customer.getPaymentHistory(customerId);
        
        const content = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.5rem;">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">${customer.name}</h2>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    ${customer.phone || ''} ${customer.email ? '• ' + customer.email : ''}
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: ${balance.totalDebt > 0 ? '#fee2e2' : '#d1fae5'}; border-radius: 0.5rem; border: 2px solid ${balance.totalDebt > 0 ? '#ef4444' : '#10b981'};">
                <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">SALDO TOTAL</div>
                <div style="font-size: 2.5rem; font-weight: bold; color: ${balance.totalDebt > 0 ? '#dc2626' : '#059669'};">
                    ${formatCLP(balance.totalDebt)}
                </div>
                ${balance.totalDebt > 0 ? '<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #991b1b;">⚠️ Cuenta pendiente de pago</div>' : '<div style="margin-top: 0.5rem; font-size: 0.85rem; color: #065f46;">✓ Sin deudas pendientes</div>'}
                
                ${balance.totalDebt > 0 ? `
                    <button class="btn btn-success" style="width: 100%; margin-top: 1rem;" onclick="CustomersView.showPayTotalDebtForm(${customerId}, ${balance.totalDebt})">
                        Pagar Deuda Total (${formatCLP(balance.totalDebt)})
                    </button>
                ` : ''}
            </div>
            
            ${balance.pendingSales.length > 0 ? `
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.1rem;">📝 Ventas Pendientes de Pago</h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${balance.pendingSales.map(sale => `
                            <div style="padding: 1rem; margin-bottom: 0.75rem; border: 1px solid var(--border); border-radius: 0.375rem; background: white;">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                                    <div>
                                        <div style="font-weight: bold; font-size: 1.05rem;">Venta #${sale.saleNumber}</div>
                                        <div style="font-size: 0.85rem; color: var(--secondary);">${formatDateTime(sale.date)}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 0.8rem; color: var(--secondary);">Deuda</div>
                                        <div style="font-weight: bold; font-size: 1.2rem; color: var(--danger);">${formatCLP(sale.remaining)}</div>
                                    </div>
                                </div>
                                
                                <details style="margin-bottom: 0.5rem;">
                                    <summary style="cursor: pointer; color: var(--primary); font-size: 0.9rem;">Ver detalle de productos</summary>
                                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--light); border-radius: 0.25rem;">
                                        ${sale.items.map(item => `
                                            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.85rem;">
                                                <span>${item.name} (x${item.quantity})</span>
                                                <span>${formatCLP(item.total)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </details>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; font-size: 0.85rem; padding-top: 0.5rem; border-top: 1px solid var(--border);">
                                    <div>
                                        <div style="color: var(--secondary);">Total</div>
                                        <div style="font-weight: 600;">${formatCLP(sale.total)}</div>
                                    </div>
                                    <div>
                                        <div style="color: var(--secondary);">Pagado</div>
                                        <div style="font-weight: 600; color: var(--success);">${formatCLP(sale.paid)}</div>
                                    </div>
                                    <div>
                                        <div style="color: var(--secondary);">Resta</div>
                                        <div style="font-weight: 600; color: var(--danger);">${formatCLP(sale.remaining)}</div>
                                    </div>
                                </div>
                                
                                <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                                    <button class="btn btn-success btn-sm" style="flex: 1;" onclick="CustomersView.showPaymentForm(${sale.saleId}, ${customerId}, ${sale.remaining})">
                                        💵 Pago Completo (${formatCLP(sale.remaining)})
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="CustomersView.showPartialPaymentForm(${sale.saleId}, ${customerId}, ${sale.remaining})">
                                        Pago Parcial
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${payments.length > 0 ? `
                <div style="margin-top: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.1rem;">💰 Historial de Pagos</h3>
                    <div style="max-height: 200px; overflow-y: auto;">
                        <table style="width: 100%; font-size: 0.9rem;">
                            <thead style="background: var(--light); position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 0.5rem;">Fecha</th>
                                    <th style="padding: 0.5rem;">Venta</th>
                                    <th style="padding: 0.5rem;">Monto</th>
                                    <th style="padding: 0.5rem;">Método</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payments.map(p => `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 0.5rem;">${formatDateTime(p.date)}</td>
                                        <td style="padding: 0.5rem;">#${p.saleId}</td>
                                        <td style="padding: 0.5rem; font-weight: 600; color: var(--success);">${formatCLP(p.amount)}</td>
                                        <td style="padding: 0.5rem;">${this.getPaymentMethodName(p.paymentMethod)}</td>
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
        const paymentMethod = document.getElementById('paymentMethod').value;
        const notes = document.getElementById('paymentNotes').value;
        
        try {
            await Payment.create({
                saleId: saleId,
                customerId: customerId,
                amount: amount,
                paymentMethod: paymentMethod,
                notes: notes
            });
            
            showNotification('Pago registrado exitosamente', 'success');
            this.showAccountDetails(customerId);
        } catch (error) {
            showNotification('Error al registrar el pago: ' + error.message, 'error');
        }
    },
    
    async processPartialPayment(saleId, customerId, maxAmount) {
        const amount = parseFloat(document.getElementById('partialAmount').value);
        const paymentMethod = document.getElementById('paymentMethod').value;
        const notes = document.getElementById('paymentNotes').value;
        
        if (!amount || amount <= 0) {
            showNotification('Ingresa un monto válido', 'warning');
            return;
        }
        
        if (amount > maxAmount) {
            showNotification(`El monto no puede ser mayor a ${formatCLP(maxAmount)}`, 'warning');
            return;
        }
        
        try {
            await Payment.create({
                saleId: saleId,
                customerId: customerId,
                amount: amount,
                paymentMethod: paymentMethod,
                notes: notes
            });
            
            showNotification('Pago parcial registrado exitosamente', 'success');
            this.showAccountDetails(customerId);
        } catch (error) {
            showNotification('Error al registrar el pago: ' + error.message, 'error');
        }
    },
    
    async showPayTotalDebtForm(customerId, totalDebt) {
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">Pago total de deuda</div>
                <div style="font-size: 2rem; font-weight: bold; color: var(--danger);">${formatCLP(totalDebt)}</div>
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
            <button class="btn btn-success" onclick="CustomersView.payTotalDebt(${customerId}, ${totalDebt})">
                Confirmar Pago de ${formatCLP(totalDebt)}
            </button>
        `;
        
        showModal(content, { title: 'Pagar Deuda Total', footer, width: '500px' });
    },
    
    async payTotalDebt(customerId, totalDebt) {
        const paymentMethod = document.getElementById('paymentMethod').value;
        const notes = document.getElementById('paymentNotes').value;
        
        try {
            const balance = await Customer.getAccountBalance(customerId);
            let remainingAmount = totalDebt;
            
            for (const sale of balance.pendingSales) {
                if (remainingAmount <= 0) break;
                
                const paymentAmount = Math.min(sale.remaining, remainingAmount);
                
                await Payment.create({
                    saleId: sale.saleId,
                    customerId: customerId,
                    amount: paymentAmount,
                    paymentMethod: paymentMethod,
                    notes: notes || 'Pago de deuda total'
                });
                
                remainingAmount -= paymentAmount;
            }
            
            showNotification('Deuda total pagada exitosamente', 'success');
            this.showAccountDetails(customerId);
        } catch (error) {
            showNotification('Error al procesar el pago: ' + error.message, 'error');
        }
    },
    
    getPaymentMethodName(method) {
        const names = {
            cash: 'Efectivo',
            card: 'Tarjeta',
            qr: 'QR',
            other: 'Otro',
            pending: 'Anotado'
        };
        return names[method] || method;
    }
};
