const SuppliersView = {
    async render() {
        const suppliers = await Supplier.getAll();

        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1>Proveedores</h1>
                        <p>Gestiona tus proveedores</p>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        ${PermissionService.can('suppliers.delete') ? `
                        <button class="btn btn-warning" onclick="SuppliersView.showDeletedSuppliers()" title="Ver proveedores desactivados">
                            📋 Desactivados
                        </button>` : ''}
                        ${PermissionService.can('suppliers.create') ? `
                        <button class="btn btn-primary" onclick="SuppliersView.showSupplierForm()">
                            Nuevo Proveedor
                        </button>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="form-group">
                    <div class="search-box">
                        <input type="text" 
                               id="searchSuppliers" 
                               class="form-control" 
                               placeholder="Buscar proveedores...">
                    </div>
                </div>
                
                <div id="suppliersTable">
                    ${this.renderSuppliersTable(suppliers)}
                </div>
            </div>
        `;
    },

    async init() {
        const searchInput = document.getElementById('searchSuppliers');

        searchInput.addEventListener('input', async (e) => {
            const term = e.target.value;
            const suppliers = term ? await Supplier.search(term) : await Supplier.getAll();
            document.getElementById('suppliersTable').innerHTML = this.renderSuppliersTable(suppliers);
            await this.loadSupplierDebts(suppliers);
        });

        // C6: Cargar deudas de proveedores
        const suppliers = await Supplier.getAll();
        await this.loadSupplierDebts(suppliers);
    },

    /**
     * C6: Cargar y mostrar deuda de cada proveedor en la tabla.
     */
    async loadSupplierDebts(suppliers) {
        for (const s of suppliers) {
            try {
                const debt = await SupplierPaymentService.getSupplierDebt(s.id);
                const elem = document.getElementById(`supplier-debt-${s.id}`);
                if (elem) {
                    if (debt > 0) {
                        elem.textContent = formatCLP(debt);
                        elem.style.color = 'var(--danger)';
                    } else {
                        elem.textContent = 'Sin deuda';
                        elem.style.color = 'var(--secondary)';
                    }
                }
            } catch (_) {
                const elem = document.getElementById(`supplier-debt-${s.id}`);
                if (elem) elem.textContent = '-';
            }
        }
    },

    renderSuppliersTable(suppliers) {
        if (suppliers.length === 0) {
            return '<div class="empty-state"><div class="empty-state-icon">🚚</div>No hay proveedores</div>';
        }

        const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; padding: 0.5rem 0;">
                ${suppliers.map(s => {
            const nameParts = (s.name || 'Proveedor').trim().split(' ');
            const initials = ((nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '')).toUpperCase() || 'P';

            let hash = 0;
            for (let i = 0; i < (s.name || '').length; i++) hash = (s.name || '').charCodeAt(i) + ((hash << 5) - hash);
            const bgColor = colors[Math.abs(hash) % colors.length];

            return `
                    <div class="supplier-card" style="background: rgba(17, 24, 39, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; padding: 1.25rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; display: flex; flex-direction: column; gap: 1rem;"
                         onmouseover="this.style.transform='translateY(-4px)'; this.style.backgroundColor='rgba(31, 41, 55, 0.6)'; this.style.boxShadow='0 12px 24px -8px rgba(0, 0, 0, 0.5)';"
                         onmouseout="this.style.transform='translateY(0)'; this.style.backgroundColor='rgba(17, 24, 39, 0.4)'; this.style.boxShadow='none';">
                        
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="width: 50px; height: 50px; background: ${bgColor}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                                    ${initials}
                                </div>
                                <div>
                                    <h3 style="margin: 0; font-size: 1.15rem; color: #fff; line-height: 1.2;">${s.name}</h3>
                                    ${s.contact ? `<div style="color: var(--secondary); font-size: 0.85rem; margin-top: 0.25rem;">👤 ${s.contact}</div>` : ''}
                                </div>
                            </div>
                        </div>

                        ${(s.phone || s.email) ? `
                        <div style="display: flex; flex-direction: column; gap: 0.4rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; font-size: 0.9rem; color: #cbd5e1;">
                            ${s.phone ? `<div style="display: flex; align-items: center; gap: 0.5rem;">📞 ${s.phone}</div>` : ''}
                            ${s.email ? `<div style="display: flex; align-items: center; gap: 0.5rem;">✉️ ${s.email}</div>` : ''}
                        </div>
                        ` : ''}

                        <div style="background: rgba(0,0,0,0.25); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.05); text-align: center;">
                            <div style="font-size: 0.75rem; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.5px;">Deuda al Proveedor</div>
                            <div id="supplier-debt-${s.id}" style="font-weight: 700; font-size: 1.25rem; color: var(--secondary); margin-top: 0.25rem; display: flex; align-items: center; justify-content: center; gap: 0.3rem;">
                                ⏳ Calculando...
                            </div>
                        </div>

                        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-top: auto; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05);">
                            <button class="btn btn-sm" style="flex: 1; background: rgba(16, 185, 129, 0.2); color: #34d399;" onclick="SuppliersView.showSupplierPaymentForm(${s.id})" title="Registrar pago a proveedor">
                                💰 Pagar
                            </button>
                            <button class="btn btn-sm" style="flex: 1; background: rgba(59, 130, 246, 0.2); color: #60a5fa;" onclick="SuppliersView.showPurchaseHistory(${s.id})" title="Ver historial de compras">
                                📋 Compras
                            </button>
                            <button class="btn btn-sm" style="flex: 1; background: rgba(168, 85, 247, 0.2); color: #c084fc;" onclick="SuppliersView.showProductsBySupplier(${s.id})" title="Ver stock de productos de este proveedor">
                                📦 Stock
                            </button>
                            ${PermissionService.can('suppliers.edit') ? `
                            <button class="btn btn-sm" style="background: rgba(255,255,255,0.1); color: #fff; min-width: 40px; padding: 0.25rem 0.5rem;" onclick="SuppliersView.showSupplierForm(${s.id})" title="Editar proveedor">✏️</button>
                            ` : ''}
                            ${PermissionService.can('suppliers.delete') ? `
                            <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.2); color: #f87171; min-width: 40px; padding: 0.25rem 0.5rem;" onclick="SuppliersView.deleteSupplier(${s.id})" title="Desactivar proveedor">🗑️</button>
                            ` : ''}
                        </div>
                    </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    async showSupplierForm(id = null) {
        const supplier = id ? await Supplier.getById(id) : null;

        const content = `
            <form id="supplierForm" onsubmit="SuppliersView.saveSupplier(event, ${id})">
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" name="name" class="form-control" value="${supplier?.name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label>Nombre de Contacto</label>
                    <input type="text" name="contact" class="form-control" value="${supplier?.contact || ''}">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="text" name="phone" class="form-control" value="${supplier?.phone || ''}" inputmode="numeric" pattern="[0-9]*" title="Sólo números" placeholder="Ej: +56912345678">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" class="form-control" value="${supplier?.email || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Dirección</label>
                    <textarea name="address" class="form-control" rows="2">${supplier?.address || ''}</textarea>
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('supplierForm').requestSubmit()">
                ${id ? 'Actualizar' : 'Crear'}
            </button>
        `;

        showModal(content, {
            title: id ? 'Editar Proveedor' : 'Nuevo Proveedor',
            footer,
            width: '600px'
        });

        // Add Enter key listener to submit form
        const form = document.getElementById('supplierForm');
        form.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default form submission if any
                form.requestSubmit(); // Trigger the form's submit event programmatically
            }
        });
    },

    async saveSupplier(event, id) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        if (id) data.id = id;

        try {
            await SupplierController.saveSupplier(data);
            closeModal();
            await this.refresh();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async deleteSupplier(id) {
        const supplier = await Supplier.getById(id);
        const name = supplier ? supplier.name : `#${id}`;
        showConfirm(`¿Desactivar al proveedor "${name}"? Dejará de aparecer en listados y compras nuevas, pero se preserva para reportes. Podrás restaurarlo luego.`, async () => {
            try {
                await SupplierController.deleteSupplier(id);
                await this.refresh();
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    },

    /**
     * C1: Mostrar proveedores desactivados con opción de restaurar
     */
    async showDeletedSuppliers() {
        const deleted = await Supplier.getDeleted();

        if (deleted.length === 0) {
            showModal(
                '<div class="empty-state"><div class="empty-state-icon">✅</div>No hay proveedores desactivados</div>',
                { title: 'Proveedores Desactivados', footer: '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>', width: '600px' }
            );
            return;
        }

        const content = `
            <p style="margin-bottom: 1rem; color: var(--secondary);">
                Estos proveedores están desactivados. No aparecen en compras nuevas ni listados, pero se preservan para reportes.
            </p>
            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Contacto</th>
                            <th>Desactivado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deleted.map(s => `
                            <tr style="opacity: 0.8;">
                                <td><strong>${s.name}</strong></td>
                                <td>${s.contact || '-'}</td>
                                <td>${s.deletedAt ? new Date(s.deletedAt).toLocaleDateString('es-CL') : '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-success" onclick="SuppliersView.restoreSupplier(${s.id})">
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
            title: `Proveedores Desactivados (${deleted.length})`,
            footer: '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>',
            width: '600px'
        });
    },

    async restoreSupplier(id) {
        try {
            await SupplierController.restoreSupplier(id);
            closeModal();
            await this.refresh();
            await this.showDeletedSuppliers();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async refresh() {
        const suppliers = await Supplier.getAll();
        document.getElementById('suppliersTable').innerHTML = this.renderSuppliersTable(suppliers);
        await this.loadSupplierDebts(suppliers);
    },

    /**
     * C6: Mostrar formulario para registrar pago a proveedor (general o por compra).
     */
    async showSupplierPaymentForm(supplierId) {
        const supplier = await Supplier.getById(supplierId);
        if (!supplier) { showNotification('Proveedor no encontrado', 'error'); return; }

        const debt = await SupplierPaymentService.getSupplierDebt(supplierId);
        const debtDetail = await SupplierPaymentService.getDebtDetail(supplierId);
        const pendingPurchases = debtDetail.filter(d => d.balance > 0);

        const purchaseOptions = pendingPurchases.length > 0 ? `
            <option value="">Pago general al proveedor</option>
            ${pendingPurchases.map(d => `
                <option value="${d.purchase.id}">Compra #${d.purchase.id} — ${formatDate(d.purchase.date)} — Saldo: ${formatCLP(d.balance)}</option>
            `).join('')}
        ` : '<option value="">Sin compras pendientes</option>';

        const content = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                <p style="margin-bottom: 0.25rem;"><strong>Proveedor:</strong> ${supplier.name}</p>
                <p style="margin-bottom: 0;"><strong>Deuda total:</strong> <span style="color: var(--danger); font-size: 1.15rem; font-weight: bold;">${formatCLP(debt)}</span></p>
            </div>

            <form id="supplierPaymentForm">
                <div class="form-group">
                    <label>Compra asociada (opcional)</label>
                    <select id="spPurchaseId" class="form-control" onchange="SuppliersView.onPurchaseSelect()">
                        ${purchaseOptions}
                    </select>
                    <small>Selecciona una compra para vincular el pago, o deja "general"</small>
                </div>
                <div class="form-group">
                    <label>Monto a Pagar (CLP) *</label>
                    <input type="number" id="spAmount" class="form-control" 
                           value="${debt > 0 ? Math.round(debt) : ''}" min="1" required
                           placeholder="Monto del pago">
                </div>
                <div class="form-group">
                    <label>Método de Pago</label>
                    <select id="spMethod" class="form-control">
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="other">Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Referencia / Comprobante (opcional)</label>
                    <input type="text" id="spReference" class="form-control" placeholder="Ej: Nro. transferencia, recibo...">
                </div>
                <div class="form-group">
                    <label>Notas (opcional)</label>
                    <input type="text" id="spNotes" class="form-control" placeholder="Notas adicionales...">
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-success" onclick="SuppliersView.processSupplierPayment(${supplierId})" id="btnProcessSupplierPayment">
                💰 Registrar Pago
            </button>
        `;

        showModal(content, { title: `Pago a ${supplier.name}`, footer, width: '550px' });
    },

    /**
     * C6: Al seleccionar una compra, actualizar el monto sugerido.
     */
    onPurchaseSelect() {
        const select = document.getElementById('spPurchaseId');
        const amountInput = document.getElementById('spAmount');
        if (!select || !amountInput) return;

        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption && selectedOption.value) {
            // Extraer saldo del texto de la opción
            const match = selectedOption.textContent.match(/Saldo:\s*\$?([\d.,]+)/);
            if (match) {
                const saldo = parseInt(match[1].replace(/\./g, '').replace(',', ''), 10);
                if (!isNaN(saldo)) amountInput.value = saldo;
            }
        }
    },

    /**
     * C6: Procesar pago a proveedor.
     */
    async processSupplierPayment(supplierId) {
        const purchaseId = document.getElementById('spPurchaseId').value;
        const amount = parseFloat(document.getElementById('spAmount').value);
        const method = document.getElementById('spMethod').value;
        const reference = document.getElementById('spReference').value.trim();
        const notes = document.getElementById('spNotes').value.trim();

        if (!amount || amount <= 0) {
            showNotification('Ingresa un monto válido', 'warning');
            return;
        }

        const btn = document.getElementById('btnProcessSupplierPayment');
        if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

        try {
            await SupplierPaymentService.registerPayment({
                supplierId: supplierId,
                purchaseId: purchaseId ? parseInt(purchaseId, 10) : null,
                amount: amount,
                method: method,
                reference: reference,
                notes: notes
            });
            closeModal();
            showNotification('Pago registrado exitosamente', 'success');
            await this.refresh();
        } catch (error) {
            showNotification(error.message, 'error');
            if (btn) { btn.disabled = false; btn.textContent = '💰 Registrar Pago'; }
        }
    },

    /**
     * C6: Mostrar historial de pagos de un proveedor.
     */
    async showPaymentHistory(supplierId) {
        const supplier = await Supplier.getById(supplierId);
        if (!supplier) { showNotification('Proveedor no encontrado', 'error'); return; }

        const payments = await SupplierPayment.getBySupplier(supplierId);
        const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const debt = await SupplierPaymentService.getSupplierDebt(supplierId);

        const methodLabel = (m) => m === 'cash' ? 'Efectivo' : m === 'transfer' ? 'Transferencia' : 'Otro';

        const paymentRows = payments.length === 0
            ? '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No hay pagos registrados</td></tr>'
            : payments.map(p => `
                <tr>
                    <td>${formatDateTime(p.date)}</td>
                    <td><strong>${formatCLP(p.amount)}</strong></td>
                    <td>${methodLabel(p.method)}</td>
                    <td>${p.purchaseId ? `Compra #${p.purchaseId}` : '<em>General</em>'}</td>
                    <td>${p.reference || '-'}</td>
                    <td>${p.notes || '-'}</td>
                </tr>
            `).join('');

        const content = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 0.5rem;">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.3rem;">${supplier.name}</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.75rem;">
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">Total pagado</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${formatCLP(totalPaid)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">Deuda pendiente</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: ${debt > 0 ? '#fbbf24' : '#a7f3d0'};">${formatCLP(debt)}</div>
                    </div>
                </div>
            </div>

            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Monto</th>
                            <th>Método</th>
                            <th>Compra</th>
                            <th>Referencia</th>
                            <th>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentRows}
                    </tbody>
                </table>
            </div>
        `;

        const footer = `
            <button class="btn btn-success" onclick="closeModal(); SuppliersView.showSupplierPaymentForm(${supplierId})">
                💰 Nuevo Pago
            </button>
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        `;

        showModal(content, { title: `Pagos a ${supplier.name}`, footer, width: '850px' });
    },

    async showPurchaseHistory(supplierId) {
        const supplier = await Supplier.getById(supplierId);
        const purchases = await Supplier.getPurchaseHistory(supplierId);

        const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);

        const content = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 0.5rem;">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">${supplier.name}</h2>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    ${supplier.contact ? supplier.contact + ' • ' : ''}${supplier.phone || ''} ${supplier.email ? '• ' + supplier.email : ''}
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem; padding: 1.25rem; background: rgba(16, 185, 129, 0.1); border-radius: 0.5rem; border: 1px solid rgba(16, 185, 129, 0.3);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; color: rgba(226, 232, 240, 0.8);">Total de Compras</div>
                        <div style="font-size: 1.75rem; font-weight: bold; color: #34d399;">${purchases.length}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; color: rgba(226, 232, 240, 0.8);">Monto Total</div>
                        <div style="font-size: 1.75rem; font-weight: bold; color: #34d399;">${formatCLP(totalPurchases)}</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <h3 style="margin-bottom: 0.75rem; font-size: 1.1rem;">📋 Historial de Compras</h3>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <input type="date" id="filterStartDate" class="form-control" style="flex: 1;" placeholder="Desde">
                    <input type="date" id="filterEndDate" class="form-control" style="flex: 1;" placeholder="Hasta">
                    <button class="btn btn-secondary btn-sm" onclick="SuppliersView.filterPurchaseHistory(${supplierId})">
                        Filtrar
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="SuppliersView.showPurchaseHistory(${supplierId})">
                        Limpiar
                    </button>
                </div>
            </div>
            
            <div id="purchaseHistoryList" style="max-height: 400px; overflow-y: auto;">
                ${this.renderPurchaseHistoryList(purchases)}
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        `;

        showModal(content, {
            title: `Historial de Compras - ${supplier.name}`,
            footer,
            width: '900px'
        });
    },

    renderPurchaseHistoryList(purchases) {
        if (purchases.length === 0) {
            return '<div class="empty-state">No hay compras registradas</div>';
        }

        return purchases.map(purchase => `
            <div style="padding: 1rem; margin-bottom: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0.5rem; background: rgba(15, 23, 42, 0.6);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div>
                        <div style="font-weight: bold; font-size: 1.05rem; color: #e2e8f0;">Compra #${purchase.id}</div>
                        <div style="font-size: 0.85rem; color: rgba(226, 232, 240, 0.6);">${formatDateTime(purchase.date)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: rgba(226, 232, 240, 0.6);">Total</div>
                        <div style="font-weight: bold; font-size: 1.2rem; color: #a5b4fc;">${formatCLP(purchase.total)}</div>
                    </div>
                </div>
                
                <details style="margin-bottom: 0.5rem;">
                    <summary style="cursor: pointer; color: #a5b4fc; font-size: 0.9rem;">Ver detalle de productos (${purchase.items.length} items)</summary>
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(15, 23, 42, 0.4); border-radius: 0.25rem; border: 1px solid rgba(255, 255, 255, 0.05);" id="purchase-items-${purchase.id}">
                        <div style="font-size: 0.85rem; color: rgba(226, 232, 240, 0.6);">Cargando...</div>
                    </div>
                </details>
            </div>
        `).join('');
    },

    async filterPurchaseHistory(supplierId) {
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;

        if (!startDate || !endDate) {
            showNotification('Selecciona ambas fechas', 'warning');
            return;
        }

        const purchases = await Supplier.getPurchasesByDateRange(supplierId, startDate, endDate);
        document.getElementById('purchaseHistoryList').innerHTML = this.renderPurchaseHistoryList(purchases);
    },

    /**
     * Modal independiente: productos comprados a un proveedor y stock actual.
     */
    async showProductsBySupplier(supplierId) {
        const supplier = await Supplier.getById(supplierId);
        const purchases = await Purchase.getBySupplier(supplierId);

        const productMap = new Map();
        for (const p of purchases) {
            for (const item of (p.items || [])) {
                const pid = item.productId;
                if (!pid) continue;
                const qty = parseFloat(item.quantity) || 0;
                const prev = productMap.get(pid) || { totalBought: 0 };
                prev.totalBought += qty;
                productMap.set(pid, prev);
            }
        }

        // Categorizar y calcular puntuación de prioridad para el ordenamiento
        const rows = [];
        for (const [productId, { totalBought }] of productMap) {
            const product = await Product.getById(productId);
            const name = product ? product.name : `Producto #${productId} (eliminado)`;
            const stock = product != null ? (parseFloat(product.stock) || 0) : 0;
            const min = product != null ? (parseFloat(product.minStock) || 0) : 0;

            let statusBadge = '';
            let rowStyle = '';
            let priority = 0; // 0=Normal, 1=Bajo Stock, 2=Sin Stock

            if (stock <= 0) {
                statusBadge = '<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">🛑 Sin Stock</span>';
                rowStyle = 'background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444;';
                priority = 2;
            } else if (min > 0 && stock <= min) {
                statusBadge = '<span class="badge" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3);">⚠️ Bajo Stock</span>';
                rowStyle = 'background-color: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24;';
                priority = 1;
            } else {
                statusBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">✓ Normal</span>';
                priority = 0;
            }

            rows.push({ id: productId, name, stock, totalBought, statusBadge, rowStyle, stockVal: stock, priority, pRef: product });
        }

        // Ordenar: Prioridad desc (2->1->0) y luego Alfabético
        rows.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

        const tableBody = rows.length === 0
            ? '<tr><td colspan="4" class="empty-state">No hay productos comprados a este proveedor</td></tr>'
            : rows.map(r => `
                <tr style="${r.rowStyle}">
                    <td style="font-weight: 500;">${r.name}</td>
                    <td style="text-align: right; font-weight: bold;">${typeof r.stock === 'number' ? r.stock : r.stock}</td>
                    <td style="text-align: right; color: var(--secondary);">${r.totalBought}</td>
                    <td style="text-align: center;">${r.statusBadge}</td>
                </tr>
            `).join('');

        const outOfStockCount = rows.filter(r => r.stockVal <= 0).length;
        const lowStockCount = rows.filter(r => r.stockVal > 0 && r.stockVal <= (parseFloat(r.pRef?.minStock) || 0)).length;

        const content = `
            <div style="margin-bottom: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border-radius: 1rem; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.4rem;">${supplier.name}</h2>
                        <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.9rem;">Catálogo de productos histórico y stock actual.</p>
                    </div>
                    <button class="btn" 
                            style="background: #25d366; color: white; border: none; padding: 0.6rem 1rem; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2);"
                            onclick="SuppliersView.copyOrderText(${supplierId})">
                        📋 Copiar Pedido
                    </button>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.25rem;">
                    <div class="stat-card-order" 
                         onclick="SuppliersView.filterByQuickStatus('sin', event)" 
                         style="flex: 1; cursor: pointer; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.75rem; border-radius: 0.5rem; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; margin-bottom: 0.2rem; color: #ef4444;">Sin Stock</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #f87171;">${outOfStockCount}</div>
                    </div>
                    <div class="stat-card-order" 
                         onclick="SuppliersView.filterByQuickStatus('bajo', event)"
                         style="flex: 1; cursor: pointer; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); padding: 0.75rem; border-radius: 0.5rem; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; margin-bottom: 0.2rem; color: #fbbf24;">Bajo Stock</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #fbbf24;">${lowStockCount}</div>
                    </div>
                    <div class="stat-card-order" 
                         onclick="SuppliersView.filterByQuickStatus('todos', event)"
                         style="flex: 1; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.75rem; border-radius: 0.5rem; text-align: center; transition: all 0.2s;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; margin-bottom: 0.2rem; opacity: 0.7;">Total Items</div>
                        <div style="font-size: 1.5rem; font-weight: 800;">${rows.length}</div>
                    </div>
                </div>
            </div>

            <div class="table-container" style="max-height: 400px; overflow-y: auto; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                    <thead style="position: sticky; top: 0; z-index: 10; background: #1e293b;">
                        <tr>
                            <th style="padding: 1rem; text-align: left;">Producto</th>
                            <th style="padding: 1rem; text-align: right;">Stock Actual</th>
                            <th style="padding: 1rem; text-align: right;">Total Comprado</th>
                            <th style="padding: 1rem; text-align: center;">Estado</th>
                        </tr>
                    </thead>
                    <tbody id="supplierProductsBody">${tableBody}</tbody>
                </table>
            </div>
            <p style="margin-top: 1rem; font-size: 0.85rem; color: var(--secondary); text-align: center; font-style: italic;">
                ℹ️ Tip: Haz clic en las tarjetas de arriba para filtrar, o en el botón verde para copiar el pedido completo (Sin Stock + Bajo Stock).
            </p>
        `;

        const footer = '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>';
        showModal(content, { title: `Inventario por Proveedor`, footer, width: '750px' });
    },

    /**
     * Genera un texto formateado con los productos faltantes y lo copia al portapapeles.
     */
    async copyOrderText(supplierId) {
        const supplier = await Supplier.getById(supplierId);
        const purchases = await Purchase.getBySupplier(supplierId);

        // Obtener productos únicos comprados a este proveedor
        const productIds = new Set();
        purchases.forEach(p => (p.items || []).forEach(i => i.productId && productIds.add(i.productId)));

        const products = [];
        for (const pid of productIds) {
            const p = await Product.getById(pid);
            if (p) products.push(p);
        }

        const missing = products.filter(p => (parseFloat(p.stock) || 0) <= (parseFloat(p.minStock) || 0));

        if (missing.length === 0) {
            showNotification('¡Genial! No tienes productos con bajo stock de este proveedor.', 'info');
            return;
        }

        // Ordenar por stock (0 primero)
        missing.sort((a, b) => (parseFloat(a.stock) || 0) - (parseFloat(b.stock) || 0));

        let text = `📦 *PEDIDO PARA: ${supplier.name.toUpperCase()}*\n`;
        text += `📅 Fecha: ${new Date().toLocaleDateString('es-CL')}\n`;
        text += `--------------------------------------\n\n`;

        text += `⚠️ *PRODUCTOS A REPOSICIÓN:*\n\n`;

        missing.forEach(p => {
            const stock = parseFloat(p.stock) || 0;
            const min = parseFloat(p.minStock) || 0;
            const max = parseFloat(p.maxStock) || 0;

            let suggested = '';
            if (max > 0) {
                const diff = max - stock;
                suggested = ` (Pedir: ${diff} ${p.type === 'weight' ? 'kg' : 'un'})`;
            } else {
                suggested = ` (Reponer Stock)`;
            }

            const emoji = stock <= 0 ? '🔴' : '🟡';
            text += `${emoji} *${p.name.trim()}*\n`;
            text += `   - Stock Actual: ${stock}\n`;
            text += `   - *${suggested}*\n`;
            if (p.barcode) text += `   - Cód: ${p.barcode}\n`;
            text += `\n`;
        });

        text += `--------------------------------------\n`;
        text += `_Generado automáticamente por POS Minimarket_`;

        try {
            await navigator.clipboard.writeText(text);
            showNotification('✅ Lista de pedido copiada al portapapeles. ¡Pégala en WhatsApp!', 'success');
        } catch (err) {
            console.error('Error al copiar:', err);
            // Fallback: mostrar en un modal si falla clipboard API
            showModal(`<textarea style="width:100%; height:300px; background: #000; color: #0f0; padding:10px; font-family: monospace;">${text}</textarea>`, {
                title: 'Copia este texto manualmente',
                footer: '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>'
            });
        }
    },

    /**
     * Filtra visualmente los productos por su estado (rápido).
     */
    filterByQuickStatus(status, event) {
        const rows = document.querySelectorAll('#supplierProductsBody tr');

        rows.forEach(row => {
            const badgeText = row.querySelector('.badge')?.textContent || '';

            if (status === 'sin') {
                row.style.display = badgeText.includes('Sin Stock') ? '' : 'none';
            } else if (status === 'bajo') {
                row.style.display = badgeText.includes('Bajo Stock') ? '' : 'none';
            } else {
                row.style.display = '';
            }
        });

        // Feedback visual en las tarjetas
        const cards = document.querySelectorAll('.stat-card-order');
        cards.forEach(c => {
            c.style.transform = 'scale(1)';
            c.style.boxShadow = 'none';
            c.style.filter = 'brightness(1)';
            c.style.border = '1px solid rgba(255,255,255,0.1)';
        });

        // El elemento clickeado se verá activo
        if (event && event.currentTarget) {
            const card = event.currentTarget;
            card.style.transform = 'scale(1.05)';
            card.style.filter = 'brightness(1.5)';
            card.style.border = '2px solid white';
            card.style.boxShadow = '0 0 15px rgba(255,255,255,0.2)';
        }
    },

    filterMissingProducts(supplierId) {
        // Redireccionar al nuevo sistema rápido
        this.filterByQuickStatus('todos');
    }
};
