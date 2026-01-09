const InventoryView = {
    currentSection: 'inventory',
    
    async render() {
        const products = await Product.getAll();
        const lowStock = await Product.getLowStock();
        const movements = await StockMovement.getAll();
        
        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
        
        return `
            <div class="view-header">
                <h1>Inventario y Stock</h1>
                <p>Control y movimientos de inventario</p>
            </div>
            
            <div class="card" style="margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 1rem; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 0.5rem;">
                    <button class="btn ${this.currentSection === 'inventory' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="InventoryView.switchSection('inventory')" style="flex: 1;">
                        Inventario
                    </button>
                    <button class="btn ${this.currentSection === 'bulk-adjustment' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="InventoryView.switchSection('bulk-adjustment')" style="flex: 1;">
                        Nuevo Ajuste Masivo
                    </button>
                    <button class="btn ${this.currentSection === 'consumption-report' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="InventoryView.switchSection('consumption-report')" style="flex: 1;">
                        Reporte Consumo Interno
                    </button>
                    <button class="btn ${this.currentSection === 'loss-report' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="InventoryView.switchSection('loss-report')" style="flex: 1;">
                        Reporte Pérdidas
                    </button>
                </div>
            </div>
            
            <div id="inventorySectionContent">
                ${this.renderCurrentSection(products, lowStock, movements, totalValue)}
            </div>
        `;
    },
    
    renderCurrentSection(products, lowStock, movements, totalValue) {
        switch (this.currentSection) {
            case 'inventory':
                return this.renderInventorySection(products, lowStock, movements, totalValue);
            case 'bulk-adjustment':
                return this.renderBulkAdjustmentForm();
            case 'consumption-report':
                return this.renderConsumptionReport();
            case 'loss-report':
                return this.renderLossReport();
            default:
                return this.renderInventorySection(products, lowStock, movements, totalValue);
        }
    },
    
    renderInventorySection(products, lowStock, movements, totalValue) {
        // Calcular valor por categoría
        const categoryValues = {};
        products.forEach(p => {
            const category = p.category || 'General';
            if (!categoryValues[category]) {
                categoryValues[category] = {
                    name: category,
                    value: 0,
                    products: 0
                };
            }
            categoryValues[category].value += p.stock * p.cost;
            categoryValues[category].products += 1;
        });
        
        const categoryList = Object.values(categoryValues).sort((a, b) => b.value - a.value);
        
        return `
            <div class="grid grid-4">
                <div class="stat-card">
                    <h3>Productos Totales</h3>
                    <div class="value">${products.length}</div>
                </div>
                <div class="stat-card">
                    <h3>Stock Bajo</h3>
                    <div class="value" style="color: var(--warning);">${lowStock.length}</div>
                </div>
                <div class="stat-card">
                    <h3>Sin Stock</h3>
                    <div class="value" style="color: var(--danger);">
                        ${products.filter(p => p.stock === 0).length}
                    </div>
                </div>
                <div class="stat-card">
                    <h3>Valor Inventario</h3>
                    <div class="value" style="color: var(--primary);">${formatCLP(totalValue)}</div>
                </div>
            </div>
            
            <div class="card" style="margin-top: 1.5rem;">
                <h3 style="margin-bottom: 1rem;">Valor del Inventario por Categoría</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Categoría</th>
                                <th>Productos</th>
                                <th>Valor Neto</th>
                                <th>% del Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${categoryList.map(cat => {
                                const percentage = totalValue > 0 ? (cat.value / totalValue * 100).toFixed(1) : 0;
                                return `
                                    <tr>
                                        <td><strong>${cat.name}</strong></td>
                                        <td>${cat.products}</td>
                                        <td><strong style="color: var(--primary);">${formatCLP(cat.value)}</strong></td>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                <div style="width: 100px; height: 20px; background: var(--light); border-radius: 10px; overflow: hidden;">
                                                    <div style="width: ${percentage}%; height: 100%; background: var(--primary);"></div>
                                                </div>
                                                <span>${percentage}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot style="background: var(--light);">
                            <tr>
                                <td><strong>TOTAL</strong></td>
                                <td><strong>${products.length}</strong></td>
                                <td><strong style="font-size: 1.1rem; color: var(--primary);">${formatCLP(totalValue)}</strong></td>
                                <td><strong>100%</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3>Alertas de Stock Bajo</h3>
                    <button class="btn btn-primary" onclick="InventoryView.showAdjustmentForm()">
                        Ajuste de Stock
                    </button>
                </div>
                
                ${this.renderLowStockTable(lowStock)}
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 1rem;">Movimientos de Stock</h3>
                <div id="movementsTable">
                    ${this.renderMovements(movements.slice(0, 50))}
                </div>
            </div>
        `;
    },
    
    renderBulkAdjustmentForm() {
        return `
            <div class="card">
                <h3 style="margin-bottom: 1.5rem;">Ajuste Masivo de Stock</h3>
                
                <div class="form-group">
                    <label>Buscar Producto</label>
                    <input type="text" 
                           id="bulkSearchInput" 
                           class="form-control" 
                           placeholder="Buscar por nombre o código..."
                           oninput="InventoryView.handleBulkSearch(event)">
                </div>
                
                <div id="bulkSearchResults" style="margin-bottom: 1.5rem;"></div>
                
                <div class="form-group">
                    <h4>Productos Seleccionados</h4>
                    <div id="bulkSelectedProducts">
                        <div class="empty-state">No hay productos seleccionados</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Tipo de Movimiento *</label>
                    <select id="bulkMovementType" class="form-control">
                        <option value="adjustment">Ajuste de Inventario</option>
                        <option value="loss">Pérdida / Merma</option>
                        <option value="consumption">Consumo Interno</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Motivo General *</label>
                    <textarea id="bulkReason" class="form-control" rows="3" 
                              placeholder="Motivo que se aplicará a todos los productos..."></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn btn-secondary" onclick="InventoryView.resetBulkForm()">
                        Limpiar
                    </button>
                    <button class="btn btn-primary" onclick="InventoryView.saveBulkAdjustment()">
                        Guardar Ajuste Masivo
                    </button>
                </div>
            </div>
        `;
    },
    
    renderConsumptionReport() {
        return `
            <div class="card">
                <h3 style="margin-bottom: 1.5rem;">Reporte de Consumo Interno</h3>
                <div id="consumptionReportContent">
                    <div style="text-align: center; padding: 2rem;">Cargando...</div>
                </div>
            </div>
        `;
    },
    
    renderLossReport() {
        return `
            <div class="card">
                <h3 style="margin-bottom: 1.5rem;">Reporte de Pérdidas</h3>
                <div id="lossReportContent">
                    <div style="text-align: center; padding: 2rem;">Cargando...</div>
                </div>
            </div>
        `;
    },
    
    async switchSection(section) {
        this.currentSection = section;
        await app.navigate('inventory');
    },
    
    renderLowStockTable(products) {
        if (products.length === 0) {
            return '<div class="empty-state">✓ No hay productos con stock bajo</div>';
        }
        
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Stock Actual</th>
                            <th>Stock Mínimo</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td>
                                    <span class="badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}">
                                        ${p.stock} ${p.type === 'weight' ? 'kg' : 'un'}
                                    </span>
                                </td>
                                <td>${p.minStock} ${p.type === 'weight' ? 'kg' : 'un'}</td>
                                <td>
                                    ${p.stock === 0 ? 
                                        '<span class="badge badge-danger">Sin Stock</span>' : 
                                        '<span class="badge badge-warning">Stock Bajo</span>'}
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="InventoryView.quickAdjustment(${p.id})">
                                        Ajustar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    renderMovements(movements) {
        if (movements.length === 0) {
            return '<div class="empty-state">No hay movimientos</div>';
        }
        
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movements.map(m => `
                            <tr>
                                <td>${formatDateTime(m.date)}</td>
                                <td id="product-name-${m.id}">-</td>
                                <td>
                                    <span class="badge ${this.getMovementBadgeClass(m.type)}">
                                        ${this.getMovementTypeName(m.type)}
                                    </span>
                                </td>
                                <td>
                                    <strong style="color: ${m.quantity >= 0 ? 'var(--secondary)' : 'var(--danger)'}">
                                        ${m.quantity >= 0 ? '+' : ''}${m.quantity}
                                    </strong>
                                </td>
                                <td>${m.reason || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    async init() {
        // Load product names for movements table
        const movements = await StockMovement.getAll();
        for (const movement of movements.slice(0, 50)) {
            const product = await Product.getById(movement.productId);
            const elem = document.getElementById(`product-name-${movement.id}`);
            if (elem && product) {
                elem.textContent = product.name;
            }
        }
        
        // Load specific section content if needed
        if (this.currentSection === 'consumption-report') {
            await this.loadConsumptionReport();
        } else if (this.currentSection === 'loss-report') {
            await this.loadLossReport();
        }
    },
    
    selectedProducts: [],
    
    async handleBulkSearch(event) {
        const query = event.target.value.toLowerCase().trim();
        const resultsContainer = document.getElementById('bulkSearchResults');
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        const products = await Product.getAll();
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.code && p.code.toLowerCase().includes(query))
        );
        
        if (filtered.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state">No se encontraron productos</div>';
            return;
        }
        
        resultsContainer.innerHTML = `
            <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Stock</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(p => `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.stock} ${p.type === 'weight' ? 'kg' : 'un'}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="InventoryView.addProductToBulk(${p.id})">
                                        Agregar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    async addProductToBulk(productId) {
        const product = await Product.getById(productId);
        
        if (this.selectedProducts.find(p => p.id === productId)) {
            showNotification('Este producto ya está en la lista', 'warning');
            return;
        }
        
        this.selectedProducts.push({
            id: productId,
            name: product.name,
            stock: product.stock,
            unit: product.type === 'weight' ? 'kg' : 'un',
            quantity: 0
        });
        
        this.updateBulkSelectedProducts();
        const searchInput = document.getElementById('bulkSearchInput');
        if(searchInput) {
            searchInput.value = '';
            searchInput.focus(); // Keep focus for faster adding
        }
        document.getElementById('bulkSearchResults').innerHTML = '';
    },
    
    updateBulkSelectedProducts() {
        const container = document.getElementById('bulkSelectedProducts');
        
        if (this.selectedProducts.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay productos seleccionados</div>';
            return;
        }
        
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Stock Actual</th>
                            <th style="width: 150px;">Cantidad a Ajustar</th>
                            <th style="width: 80px;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.selectedProducts.map((p, index) => `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.stock} ${p.unit}</td>
                                <td>
                                    <input type="number" 
                                           class="form-control bulk-qty-input" 
                                           data-index="${index}"
                                           value="${p.quantity}" 
                                           step="0.001"
                                           onchange="InventoryView.updateProductQuantity(${index}, this.value)"
                                           onkeypress="if(event.key === 'Enter') { event.preventDefault(); InventoryView.focusNextBulkInput(${index}); }">
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="InventoryView.removeProductFromBulk(${index})">
                                        Quitar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    focusNextBulkInput(currentIndex) {
        // Try to focus next input
        const nextInput = document.querySelector(`.bulk-qty-input[data-index="${currentIndex + 1}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        } else {
            // If no next input, focus back to search or description
            document.getElementById('bulkReason').focus();
        }
    },
    
    updateProductQuantity(index, value) {
        this.selectedProducts[index].quantity = parseFloat(value) || 0;
    },
    
    removeProductFromBulk(index) {
        this.selectedProducts.splice(index, 1);
        this.updateBulkSelectedProducts();
    },
    
    resetBulkForm() {
        this.selectedProducts = [];
        document.getElementById('bulkSearchInput').value = '';
        document.getElementById('bulkSearchResults').innerHTML = '';
        document.getElementById('bulkMovementType').value = 'adjustment';
        document.getElementById('bulkReason').value = '';
        this.updateBulkSelectedProducts();
    },
    
    async saveBulkAdjustment() {
        if (this.selectedProducts.length === 0) {
            showNotification('Debes seleccionar al menos un producto', 'warning');
            return;
        }
        
        const type = document.getElementById('bulkMovementType').value;
        const reason = document.getElementById('bulkReason').value.trim();
        
        if (!reason) {
            showNotification('Debes ingresar un motivo', 'warning');
            return;
        }
        
        const invalidProducts = this.selectedProducts.filter(p => p.quantity <= 0);
        if (invalidProducts.length > 0) {
            showNotification('Todos los productos deben tener una cantidad mayor a 0', 'warning');
            return;
        }
        
        try {
            for (const product of this.selectedProducts) {
                if (type === 'adjustment') {
                    await StockMovement.createAdjustment(product.id, product.quantity, reason);
                } else if (type === 'loss') {
                    await StockMovement.createLoss(product.id, product.quantity, reason);
                } else if (type === 'consumption') {
                    await StockMovement.createConsumption(product.id, product.quantity, reason);
                }
            }
            
            showNotification(`Ajuste masivo guardado (${this.selectedProducts.length} productos)`, 'success');
            this.resetBulkForm();
            this.currentSection = 'inventory';
            await app.navigate('inventory');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },
    
    async loadConsumptionReport() {
        const movements = await StockMovement.getByType('consumption');
        const container = document.getElementById('consumptionReportContent');
        
        if (movements.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay registros de consumo interno</div>';
            return;
        }
        
        let totalQuantity = 0;
        let totalCostValue = 0;
        let totalSaleValue = 0;
        
        let html = `
            <div style="margin-bottom: 1.5rem;">
                <div class="grid grid-3">
                    <div class="stat-card">
                        <h3>Total Cantidad</h3>
                        <div class="value" id="consumptionTotalQty">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>Valor Neto Perdido</h3>
                        <div class="value" style="color: var(--danger);" id="consumptionTotalCost">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>Valor Venta Perdido</h3>
                        <div class="value" style="color: var(--warning);" id="consumptionTotalSale">-</div>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Valor Neto</th>
                            <th>Valor Venta</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody id="consumptionTableBody">
        `;
        
        for (const m of movements) {
            const product = await Product.getById(m.productId);
            const costValue = m.cost_value || (product ? (Math.abs(m.quantity) * product.cost) : 0);
            const saleValue = m.sale_value || (product ? (Math.abs(m.quantity) * product.price) : 0);
            
            totalQuantity += Math.abs(m.quantity);
            totalCostValue += costValue;
            totalSaleValue += saleValue;
            
            html += `
                <tr>
                    <td>${formatDateTime(m.date)}</td>
                    <td>${product ? product.name : 'Producto no encontrado'}</td>
                    <td><strong style="color: var(--danger);">${Math.abs(m.quantity)}</strong></td>
                    <td>${formatCLP(costValue)}</td>
                    <td>${formatCLP(saleValue)}</td>
                    <td>${m.reason || '-'}</td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Update totals
        document.getElementById('consumptionTotalQty').textContent = formatNumber(totalQuantity);
        document.getElementById('consumptionTotalCost').textContent = formatCLP(totalCostValue);
        document.getElementById('consumptionTotalSale').textContent = formatCLP(totalSaleValue);
    },
    
    async loadLossReport() {
        const movements = await StockMovement.getByType('loss');
        const container = document.getElementById('lossReportContent');
        
        if (movements.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay registros de pérdidas</div>';
            return;
        }
        
        let totalQuantity = 0;
        let totalCostValue = 0;
        let totalSaleValue = 0;
        
        let html = `
            <div style="margin-bottom: 1.5rem;">
                <div class="grid grid-3">
                    <div class="stat-card">
                        <h3>Total Cantidad</h3>
                        <div class="value" id="lossTotalQty">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>Valor Neto Perdido</h3>
                        <div class="value" style="color: var(--danger);" id="lossTotalCost">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>Valor Venta Perdido</h3>
                        <div class="value" style="color: var(--warning);" id="lossTotalSale">-</div>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Valor Neto</th>
                            <th>Valor Venta</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody id="lossTableBody">
        `;
        
        for (const m of movements) {
            const product = await Product.getById(m.productId);
            const costValue = m.cost_value || (product ? (Math.abs(m.quantity) * product.cost) : 0);
            const saleValue = m.sale_value || (product ? (Math.abs(m.quantity) * product.price) : 0);
            
            totalQuantity += Math.abs(m.quantity);
            totalCostValue += costValue;
            totalSaleValue += saleValue;
            
            html += `
                <tr>
                    <td>${formatDateTime(m.date)}</td>
                    <td>${product ? product.name : 'Producto no encontrado'}</td>
                    <td><strong style="color: var(--danger);">${Math.abs(m.quantity)}</strong></td>
                    <td>${formatCLP(costValue)}</td>
                    <td>${formatCLP(saleValue)}</td>
                    <td>${m.reason || '-'}</td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Update totals
        document.getElementById('lossTotalQty').textContent = formatNumber(totalQuantity);
        document.getElementById('lossTotalCost').textContent = formatCLP(totalCostValue);
        document.getElementById('lossTotalSale').textContent = formatCLP(totalSaleValue);
    },
    
    getMovementTypeName(type) {
        const names = {
            sale: 'Venta',
            purchase: 'Compra',
            adjustment: 'Ajuste',
            loss: 'Pérdida',
            consumption: 'Consumo'
        };
        return names[type] || type;
    },
    
    getMovementBadgeClass(type) {
        const classes = {
            sale: 'badge-info',
            purchase: 'badge-success',
            adjustment: 'badge-warning',
            loss: 'badge-danger',
            consumption: 'badge-warning'
        };
        return classes[type] || 'badge-info';
    },
    
    async showAdjustmentForm() {
        const products = await Product.getAll();
        
        const content = `
            <form id="adjustmentForm" onsubmit="InventoryView.saveAdjustment(event)">
                <div class="form-group">
                    <label>Producto *</label>
                    <select name="productId" class="form-control" required>
                        <option value="">Seleccionar...</option>
                        ${products.map(p => `
                            <option value="${p.id}">${p.name} (Stock: ${p.stock})</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tipo de Ajuste *</label>
                    <select name="type" class="form-control" required>
                        <option value="adjustment">Ajuste de Inventario</option>
                        <option value="loss">Pérdida / Merma</option>
                        <option value="consumption">Consumo Interno</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Cantidad *</label>
                    <input type="number" 
                           name="quantity" 
                           class="form-control" 
                           step="0.001" 
                           required>
                    <small style="color: var(--text); opacity: 0.7;">
                        Para ajustes: usa valores positivos para aumentar, negativos para disminuir<br>
                        Para pérdidas/consumo: usa valores positivos (se restarán automáticamente)
                    </small>
                </div>
                
                <div class="form-group">
                    <label>Motivo *</label>
                    <textarea name="reason" class="form-control" rows="3" required></textarea>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('adjustmentForm').requestSubmit()">
                Guardar Ajuste
            </button>
        `;
        
        showModal(content, { title: 'Ajuste de Stock', footer, width: '500px' });
    },
    
    async saveAdjustment(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const productId = parseInt(formData.get('productId'));
        const type = formData.get('type');
        const quantity = parseFloat(formData.get('quantity'));
        const reason = formData.get('reason');
        
        try {
            if (type === 'adjustment') {
                await StockMovement.createAdjustment(productId, quantity, reason);
            } else if (type === 'loss' || type === 'consumption') {
                await StockMovement.createLoss(productId, Math.abs(quantity), reason);
            }
            
            showNotification('Ajuste de stock registrado', 'success');
            closeModal();
            app.navigate('inventory');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },
    
    async quickAdjustment(productId) {
        const product = await Product.getById(productId);
        
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <p><strong>Producto:</strong> ${product.name}</p>
                <p><strong>Stock Actual:</strong> ${product.stock} ${product.type === 'weight' ? 'kg' : 'un'}</p>
            </div>
            
            <form id="quickAdjustForm">
                <div class="form-group">
                    <label>Nueva Cantidad *</label>
                    <input type="number" 
                           id="newStock" 
                           class="form-control" 
                           value="${product.stock}" 
                           min="0" 
                           step="0.001" 
                           required>
                </div>
                
                <div class="form-group">
                    <label>Motivo *</label>
                    <textarea id="quickReason" class="form-control" rows="2" required></textarea>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="InventoryView.saveQuickAdjustment(${productId}, ${product.stock})">
                Ajustar
            </button>
        `;
        
        showModal(content, { title: 'Ajuste Rápido', footer, width: '400px' });
    },
    
    async saveQuickAdjustment(productId, currentStock) {
        const newStock = parseFloat(document.getElementById('newStock').value);
        const reason = document.getElementById('quickReason').value;
        
        if (!reason) {
            showNotification('Debes ingresar un motivo', 'warning');
            return;
        }
        
        const difference = newStock - currentStock;
        
        try {
            await StockMovement.createAdjustment(productId, difference, reason);
            showNotification('Stock ajustado correctamente', 'success');
            closeModal();
            app.navigate('inventory');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
};
