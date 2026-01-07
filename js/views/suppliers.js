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
                    <button class="btn btn-primary" onclick="SuppliersView.showSupplierForm()">
                        Nuevo Proveedor
                    </button>
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
        });
    },
    
    renderSuppliersTable(suppliers) {
        if (suppliers.length === 0) {
            return '<div class="empty-state"><div class="empty-state-icon">🚚</div>No hay proveedores</div>';
        }
        
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Contacto</th>
                            <th>Teléfono</th>
                            <th>Email</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suppliers.map(s => `
                            <tr>
                                <td><strong>${s.name}</strong></td>
                                <td>${s.contact || '-'}</td>
                                <td>${s.phone || '-'}</td>
                                <td>${s.email || '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="SuppliersView.showPurchaseHistory(${s.id})"
                                            title="Ver historial de compras">
                                        📋 Historial
                                    </button>
                                    <button class="btn btn-sm btn-secondary" 
                                            onclick="SuppliersView.showSupplierForm(${s.id})">
                                        Editar
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="SuppliersView.deleteSupplier(${s.id})">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
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
                        <input type="tel" name="phone" class="form-control" value="${supplier?.phone || ''}">
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
        confirm('¿Eliminar este proveedor?', async () => {
            try {
                await SupplierController.deleteSupplier(id);
                await this.refresh();
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    },
    
    async refresh() {
        const suppliers = await Supplier.getAll();
        document.getElementById('suppliersTable').innerHTML = this.renderSuppliersTable(suppliers);
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
            
            <div style="margin-bottom: 1.5rem; padding: 1.25rem; background: #d1fae5; border-radius: 0.5rem; border: 2px solid #10b981;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; color: #374151;">Total de Compras</div>
                        <div style="font-size: 1.75rem; font-weight: bold; color: #059669;">${purchases.length}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem; color: #374151;">Monto Total</div>
                        <div style="font-size: 1.75rem; font-weight: bold; color: #059669;">${formatCLP(totalPurchases)}</div>
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
            <div style="padding: 1rem; margin-bottom: 0.75rem; border: 1px solid var(--border); border-radius: 0.375rem; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div>
                        <div style="font-weight: bold; font-size: 1.05rem;">Compra #${purchase.id}</div>
                        <div style="font-size: 0.85rem; color: var(--secondary);">${formatDateTime(purchase.date)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--secondary);">Total</div>
                        <div style="font-weight: bold; font-size: 1.2rem; color: var(--primary);">${formatCLP(purchase.total)}</div>
                    </div>
                </div>
                
                <details style="margin-bottom: 0.5rem;">
                    <summary style="cursor: pointer; color: var(--primary); font-size: 0.9rem;">Ver detalle de productos (${purchase.items.length} items)</summary>
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--light); border-radius: 0.25rem;" id="purchase-items-${purchase.id}">
                        <div style="font-size: 0.85rem; color: var(--secondary);">Cargando...</div>
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
    }
};
