const PurchasesView = {
    async render() {
        const purchases = await Purchase.getAll();
        const accountsPayable = await Purchase.getAccountsPayable();
        
        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1>Compras a Proveedores</h1>
                        <p>Registra compras con código de barras o búsqueda manual</p>
                    </div>
                    <button class="btn btn-primary" onclick="PurchasesView.showPurchaseForm()">
                        📋 Nueva Compra
                    </button>
                </div>
            </div>
            
            <div class="grid grid-3">
                <div class="stat-card">
                    <h3>Total Compras</h3>
                    <div class="value">${purchases.length}</div>
                </div>
                <div class="stat-card">
                    <h3>Cuentas por Pagar</h3>
                    <div class="value" style="color: var(--danger);">${formatCLP(accountsPayable)}</div>
                </div>
                <div class="stat-card">
                    <h3>Compras Pendientes</h3>
                    <div class="value">${purchases.filter(p => p.status === 'pending').length}</div>
                </div>
            </div>
            
            <div class="card">
                <div id="purchasesTable">
                    ${this.renderPurchasesTable(purchases)}
                </div>
            </div>
        `;
    },
    
    renderPurchasesTable(purchases) {
        if (purchases.length === 0) {
            return '<div class="empty-state"><div class="empty-state-icon">📋</div>No hay compras registradas</div>';
        }
        
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Proveedor</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Pagado</th>
                            <th>Saldo</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchases.map(p => {
                            const balance = p.total - p.paidAmount;
                            return `
                                <tr>
                                    <td>${formatDate(p.date)}</td>
                                    <td id="supplier-${p.id}">-</td>
                                    <td>${p.items.length}</td>
                                    <td><strong>${formatCLP(p.total)}</strong></td>
                                    <td>${formatCLP(p.paidAmount)}</td>
                                    <td><strong>${formatCLP(balance)}</strong></td>
                                    <td>
                                        <span class="badge ${p.status === 'paid' ? 'badge-success' : 'badge-warning'}">
                                            ${p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" 
                                                onclick="PurchasesView.viewPurchase(${p.id})">
                                            Ver
                                        </button>
                                        <button class="btn btn-sm btn-primary" 
                                                onclick="PurchasesView.editPurchase(${p.id})">
                                            Editar
                                        </button>
                                        ${p.status === 'pending' ? `
                                            <button class="btn btn-sm btn-success" 
                                                    onclick="PurchasesView.showPaymentForm(${p.id})">
                                                Pagar
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    async init() {
        const purchases = await Purchase.getAll();
        for (const purchase of purchases) {
            const supplier = await Supplier.getById(purchase.supplierId);
            const elem = document.getElementById(`supplier-${purchase.id}`);
            if (elem && supplier) {
                elem.textContent = supplier.name;
            }
        }
    },
    
    purchaseItems: [],
    
    async showPurchaseForm(editingPurchase = null) {
        this.purchaseItems = editingPurchase ? [...editingPurchase.items] : [];
        const suppliers = await Supplier.getAll();
        
        if (suppliers.length === 0) {
            showNotification('Primero debes crear proveedores', 'warning');
            return;
        }
        
        const content = `
            <form id="purchaseForm">
                ${editingPurchase ? `<input type="hidden" name="id" value="${editingPurchase.id}">` : ''}
                <div class="form-group">
                    <label>Proveedor *</label>
                    <select name="supplierId" class="form-control" required>
                        <option value="">Seleccionar...</option>
                        ${suppliers.map(s => `<option value="${s.id}" ${editingPurchase && editingPurchase.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                </div>
                
                <div style="background: var(--light); padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 1rem;">Agregar Productos</h4>
                    
                    <div class="form-group">
                        <label>Buscar por Código de Barras o Nombre</label>
                        <div class="search-box" style="position: relative;">
                            <input type="text" 
                                   id="productSearchInput" 
                                   class="form-control" 
                                   placeholder="Escanea código o escribe nombre del producto..."
                                   autofocus>
                            <div id="purchaseProductSearchResults" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border); border-top: none; border-radius: 0 0 0.375rem 0.375rem; max-height: 200px; overflow-y: auto; display: none; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
                        </div>
                        <small style="color: var(--text); opacity: 0.7;">
                            💡 Escanea el código de barras o escribe para buscar en el inventario
                        </small>
                    </div>
                    
                    <div id="productSelectionArea" style="margin-top: 0.5rem;"></div>
                </div>
                
                <div id="purchaseItemsList" style="margin: 1.5rem 0;">
                    ${this.renderPurchaseItems()}
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha de Vencimiento (opcional)</label>
                        <input type="date" name="dueDate" class="form-control" value="${editingPurchase && editingPurchase.dueDate ? editingPurchase.dueDate.split('T')[0] : ''}">
                    </div>
                    <div class="form-group">
                        <label>Pago Inicial (CLP)</label>
                        <input type="number" name="paidAmount" class="form-control" value="${editingPurchase ? editingPurchase.paidAmount : 0}" min="0">
                    </div>
                </div>
                
                <div style="text-align: right; font-size: 1.25rem; margin-top: 1rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                    <strong>Total de Compra: <span id="purchaseTotal" style="color: var(--primary);">${formatCLP(editingPurchase ? editingPurchase.total : 0)}</span></strong>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="PurchasesView.savePurchase()">
                💾 ${editingPurchase ? 'Actualizar Compra' : 'Guardar Compra'}
            </button>
        `;
        
        showModal(content, { 
            title: editingPurchase ? 'Editar Compra' : 'Nueva Compra a Proveedor', 
            footer, 
            width: '900px' 
        });

        // Add Enter key support for the entire purchase form
        const form = document.getElementById('purchaseForm');
        form.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                // If focus is on the add product inputs, we don't want to submit the whole form, 
                // we want to add the product (which is already handled by other listeners).
                // Check if active element is one of the main form inputs (date or paidAmount)
                const activeId = document.activeElement.id;
                if (activeId === 'addQuantity' || activeId === 'addCost' || activeId === 'addPrice' || activeId === 'productSearchInput') {
                    // Do nothing here, let specific handlers work
                    return;
                }
                
                // If focus is on date or paidAmount, or anywhere else safe, submit form
                e.preventDefault();
                PurchasesView.savePurchase();
            }
        });
        
        const searchInput = document.getElementById('productSearchInput');
        const resultsDiv = document.getElementById('purchaseProductSearchResults');
        
        let searchTimeout;
        
        // Live search logic
        searchInput.addEventListener('input', async (e) => {
            const term = e.target.value.trim();
            
            // Barcode auto-detection (8+ digits)
            if (term.length >= 8 && !isNaN(term)) {
                await this.searchAndShowProduct(term);
                searchInput.value = '';
                resultsDiv.style.display = 'none';
                return;
            }
            
            // Text search with debounce
            if (term.length >= 3) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(async () => {
                    const products = await Product.search(term);
                    if (products.length > 0) {
                        this.renderPurchaseSearchResults(products);
                        resultsDiv.style.display = 'block';
                    } else {
                        resultsDiv.style.display = 'none';
                    }
                }, 300);
            } else {
                resultsDiv.style.display = 'none';
            }
        });
        
        // Handle Enter key
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = searchInput.value.trim();
                if (term) {
                    await this.searchAndShowProduct(term);
                    searchInput.value = '';
                    resultsDiv.style.display = 'none';
                }
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (searchInput && !searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
                resultsDiv.style.display = 'none';
            }
        });
    },
    
    renderPurchaseSearchResults(products) {
        const resultsDiv = document.getElementById('purchaseProductSearchResults');
        resultsDiv.innerHTML = products.map(p => `
            <div class="search-result-item" 
                 style="padding: 0.75rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s;"
                 onmouseover="this.style.background='var(--light)'"
                 onmouseout="this.style.background='white'"
                 onclick="PurchasesView.selectProductFromList(${p.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${p.name}</strong>
                        <br>
                        <small style="color: var(--secondary);">
                            ${p.barcode ? 'Código: ' + p.barcode + ' • ' : ''}
                            Stock: ${p.stock}
                        </small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary" type="button">Seleccionar</button>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    async searchAndShowProduct(term) {
        let product = await Product.getByBarcode(term);
        
        if (!product) {
            const results = await Product.search(term);
            if (results.length === 1) {
                product = results[0];
            } else if (results.length > 1) {
                // If multiple results from barcode scan or enter, show them in dropdown
                this.renderPurchaseSearchResults(results);
                document.getElementById('purchaseProductSearchResults').style.display = 'block';
                return;
            } else {
                showNotification('Producto no encontrado', 'warning');
                return;
            }
        }
        
        this.showAddProductForm(product);
    },
    
    async selectProductFromList(productId) {
        const product = await Product.getById(productId);
        const resultsDiv = document.getElementById('purchaseProductSearchResults');
        const searchInput = document.getElementById('productSearchInput');
        
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (searchInput) searchInput.value = '';
        
        this.showAddProductForm(product);
    },
    
    showAddProductForm(product) {
        const selectionArea = document.getElementById('productSelectionArea');
        selectionArea.innerHTML = `
            <div style="background: #e0f2fe; border: 2px solid var(--primary); border-radius: 0.375rem; padding: 1rem;">
                <h4 style="margin-bottom: 1rem; color: var(--primary);">
                    Agregar: ${product.name}
                    ${product.barcode ? `<small>(${product.barcode})</small>` : ''}
                </h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Cantidad Comprada *</label>
                        <input type="number" 
                               id="addQuantity" 
                               class="form-control" 
                               value="1" 
                               min="0.001" 
                               step="${product.type === 'weight' ? '0.001' : '1'}"
                               required>
                        <small>${product.type === 'weight' ? 'Kilogramos' : 'Unidades'}</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Precio Neto/Costo (CLP) *</label>
                        <input type="number" 
                               id="addCost" 
                               class="form-control" 
                               value="${product.cost || 0}" 
                               min="0"
                               required>
                        <small>Precio de compra al proveedor</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Precio de Venta (CLP) *</label>
                        <input type="number" 
                               id="addPrice" 
                               class="form-control" 
                               value="${product.price || 0}" 
                               min="0"
                               required>
                        <small>Precio al que venderás</small>
                    </div>
                </div>
                
                <div id="pricePreview" style="background: white; padding: 0.75rem; border-radius: 0.375rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span>Subtotal:</span>
                        <strong id="previewSubtotal">${formatCLP(0)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: var(--secondary);">
                        <span>Margen estimado:</span>
                        <strong id="previewMargin">0%</strong>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-success" 
                            onclick="PurchasesView.addProductToPurchase(${product.id})"
                            type="button"
                            style="flex: 1;">
                        ✓ Agregar a Compra
                    </button>
                    <button class="btn btn-secondary" 
                            onclick="PurchasesView.cancelAddProduct()"
                            type="button">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        // Disable search while adding product to prevent losing focus/context
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) searchInput.disabled = true;
        
        const quantityInput = document.getElementById('addQuantity');
        const costInput = document.getElementById('addCost');
        const priceInput = document.getElementById('addPrice');
        
        const updatePreview = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const cost = parseFloat(costInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            
            const subtotal = quantity * cost;
            const margin = cost > 0 ? ((price - cost) / cost * 100) : 0;
            
            document.getElementById('previewSubtotal').textContent = formatCLP(subtotal);
            document.getElementById('previewMargin').textContent = margin.toFixed(1) + '%';
            document.getElementById('previewMargin').style.color = margin > 0 ? 'var(--secondary)' : 'var(--danger)';
        };
        
        quantityInput.addEventListener('input', updatePreview);
        costInput.addEventListener('input', updatePreview);
        priceInput.addEventListener('input', updatePreview);
        
        // Add Enter key support for quick adding
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                PurchasesView.addProductToPurchase(product.id);
            }
        };
        
        quantityInput.addEventListener('keypress', handleEnter);
        costInput.addEventListener('keypress', handleEnter);
        priceInput.addEventListener('keypress', handleEnter);
        
        updatePreview();
        setTimeout(() => quantityInput.focus(), 100);
    },
    
    async addProductToPurchase(productId) {
        // Re-enable search input
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) {
            searchInput.disabled = false;
            // Prevent form submission if triggered by button inside form
            // The button has type="button" so it's safe, but just in case
        }

        const quantity = parseFloat(document.getElementById('addQuantity').value);
        const cost = parseFloat(document.getElementById('addCost').value);
        const price = parseFloat(document.getElementById('addPrice').value);
        
        if (!quantity || quantity <= 0) {
            showNotification('Ingresa una cantidad válida', 'warning');
            return;
        }
        
        if (!cost || cost < 0) {
            showNotification('Ingresa un precio neto válido', 'warning');
            return;
        }
        
        if (!price || price < 0) {
            showNotification('Ingresa un precio de venta válido', 'warning');
            return;
        }
        
        const product = await Product.getById(productId);
        
        const existingItem = this.purchaseItems.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.cost = cost;
            existingItem.price = price;
            existingItem.total = existingItem.quantity * cost;
        } else {
            this.purchaseItems.push({
                productId: product.id,
                name: product.name,
                barcode: product.barcode || '',
                quantity: quantity,
                cost: cost,
                price: price,
                total: quantity * cost,
                type: product.type
            });
        }
        
        this.cancelAddProduct();
        this.updatePurchaseItems();
        showNotification(`${product.name} agregado a la compra`, 'success');
        
        if (searchInput) searchInput.focus();
    },
    
    cancelAddProduct() {
        document.getElementById('productSelectionArea').innerHTML = '';
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) {
            searchInput.disabled = false;
            searchInput.focus();
        }
    },
    
    updatePurchaseItems() {
        document.getElementById('purchaseItemsList').innerHTML = this.renderPurchaseItems();
        
        const total = this.purchaseItems.reduce((sum, item) => sum + item.total, 0);
        document.getElementById('purchaseTotal').textContent = formatCLP(total);
    },
    
    renderPurchaseItems() {
        if (this.purchaseItems.length === 0) {
            return `
                <div class="empty-state" style="padding: 2rem; background: var(--light); border-radius: 0.375rem;">
                    <div class="empty-state-icon">📦</div>
                    <p>No hay productos agregados</p>
                    <small style="opacity: 0.7;">Busca productos usando el código de barras o nombre</small>
                </div>
            `;
        }
        
        return `
            <div style="background: white; border: 1px solid var(--border); border-radius: 0.375rem; overflow: hidden;">
                <table style="width: 100%;">
                    <thead style="background: var(--dark); color: white;">
                        <tr>
                            <th style="padding: 0.75rem;">Código</th>
                            <th style="padding: 0.75rem;">Producto</th>
                            <th style="padding: 0.75rem;">Cantidad</th>
                            <th style="padding: 0.75rem;">Precio Neto</th>
                            <th style="padding: 0.75rem;">Precio Venta</th>
                            <th style="padding: 0.75rem;">Margen</th>
                            <th style="padding: 0.75rem;">Subtotal</th>
                            <th style="padding: 0.75rem;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.purchaseItems.map((item, index) => {
                            const margin = item.cost > 0 ? ((item.price - item.cost) / item.cost * 100) : 0;
                            return `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 0.75rem;">
                                        <small>${item.barcode || '-'}</small>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <strong>${item.name}</strong>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <input type="number" 
                                               value="${item.quantity}" 
                                               min="0.001" 
                                               step="${item.type === 'weight' ? '0.001' : '1'}"
                                               style="width: 100px;"
                                               onchange="PurchasesView.updateItemQuantity(${index}, this.value)">
                                        <br><small>${item.type === 'weight' ? 'kg' : 'un'}</small>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <input type="number" 
                                               value="${item.cost}" 
                                               min="0"
                                               style="width: 120px;"
                                               onchange="PurchasesView.updateItemCost(${index}, this.value)">
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <input type="number" 
                                               value="${item.price}" 
                                               min="0"
                                               style="width: 120px;"
                                               onchange="PurchasesView.updateItemPrice(${index}, this.value)">
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <span style="color: ${margin > 0 ? 'var(--secondary)' : 'var(--danger)'}; font-weight: bold;">
                                            ${margin.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <strong style="color: var(--primary);">${formatCLP(item.total)}</strong>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <button class="btn btn-danger btn-sm" 
                                                type="button"
                                                onclick="PurchasesView.removeItem(${index})"
                                                title="Eliminar">
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot style="background: var(--light);">
                        <tr>
                            <td colspan="6" style="padding: 1rem; text-align: right;">
                                <strong>TOTAL DE COMPRA:</strong>
                            </td>
                            <td colspan="2" style="padding: 1rem;">
                                <strong style="font-size: 1.25rem; color: var(--primary);">
                                    ${formatCLP(this.purchaseItems.reduce((sum, item) => sum + item.total, 0))}
                                </strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    },
    
    updateItemQuantity(index, quantity) {
        this.purchaseItems[index].quantity = parseFloat(quantity);
        this.purchaseItems[index].total = this.purchaseItems[index].quantity * this.purchaseItems[index].cost;
        this.updatePurchaseItems();
    },
    
    updateItemCost(index, cost) {
        this.purchaseItems[index].cost = parseFloat(cost);
        this.purchaseItems[index].total = this.purchaseItems[index].quantity * this.purchaseItems[index].cost;
        this.updatePurchaseItems();
    },
    
    updateItemPrice(index, price) {
        this.purchaseItems[index].price = parseFloat(price);
        this.updatePurchaseItems();
    },
    
    removeItem(index) {
        const item = this.purchaseItems[index];
        confirm(`¿Eliminar ${item.name} de la compra?`, () => {
            this.purchaseItems.splice(index, 1);
            this.updatePurchaseItems();
        });
    },
    
    async savePurchase() {
        const form = document.getElementById('purchaseForm');
        const formData = new FormData(form);
        const purchaseId = formData.get('id'); // Get ID if editing
        
        if (this.purchaseItems.length === 0) {
            showNotification('Debes agregar al menos un producto', 'warning');
            return;
        }
        
        const supplierId = parseInt(formData.get('supplierId'));
        if (!supplierId) {
            showNotification('Selecciona un proveedor', 'warning');
            return;
        }
        
        const data = {
            id: purchaseId ? parseInt(purchaseId) : undefined, // Include ID if editing
            supplierId: supplierId,
            items: this.purchaseItems,
            total: this.purchaseItems.reduce((sum, item) => sum + item.total, 0),
            paidAmount: parseFloat(formData.get('paidAmount')) || 0,
            dueDate: formData.get('dueDate') || null,
            status: 'pending' // Default to pending, logic can be improved to respect 'paid' if amount matches total or keep existing
        };

        // If updating, preserve status if paidAmount >= total, or if it was already paid?
        // Actually, if paidAmount >= total, status should be 'paid'.
        if (data.paidAmount >= data.total) {
            data.status = 'paid';
        } else if (purchaseId) {
             // If editing and not fully paid, maybe keep previous status?
             // But usually if we edit amounts, we re-evaluate status based on new totals.
             // 'pending' is safe if not fully paid.
        }
        
        try {
            await SupplierController.savePurchase(data);
            
            for (const item of this.purchaseItems) {
                const product = await Product.getById(item.productId);
                if (product) {
                    product.cost = item.cost;
                    product.price = item.price;
                    await Product.update(product.id, product);
                }
            }
            
            closeModal();
            showNotification(purchaseId ? 'Compra actualizada exitosamente' : 'Compra guardada y precios actualizados', 'success');
            app.navigate('purchases');
        } catch (error) {
            showNotification('Error al guardar la compra: ' + error.message, 'error');
        }
    },

    async editPurchase(id) {
        const purchase = await Purchase.getById(id);
        if (!purchase) {
            showNotification('Compra no encontrada', 'error');
            return;
        }
        this.showPurchaseForm(purchase);
    },
    
    async viewPurchase(id) {
        const purchase = await Purchase.getById(id);
        const supplier = await Supplier.getById(purchase.supplierId);
        
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <p><strong>Proveedor:</strong> ${supplier.name}</p>
                <p><strong>Fecha:</strong> ${formatDateTime(purchase.date)}</p>
                <p><strong>Estado:</strong> 
                    <span class="badge ${purchase.status === 'paid' ? 'badge-success' : 'badge-warning'}">
                        ${purchase.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                </p>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Neto</th>
                            <th>Precio Venta</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchase.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${formatCLP(item.cost)}</td>
                                <td>${item.price ? formatCLP(item.price) : '-'}</td>
                                <td><strong>${formatCLP(item.total)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid var(--border);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Total:</span>
                    <strong>${formatCLP(purchase.total)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Pagado:</span>
                    <strong>${formatCLP(purchase.paidAmount)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.25rem; color: var(--danger);">
                    <strong>Saldo:</strong>
                    <strong>${formatCLP(purchase.total - purchase.paidAmount)}</strong>
                </div>
            </div>
        `;
        
        showModal(content, { title: 'Detalle de Compra', width: '700px' });
    },
    
    async showPaymentForm(id) {
        const purchase = await Purchase.getById(id);
        const balance = purchase.total - purchase.paidAmount;
        
        const content = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                <p><strong>Saldo pendiente:</strong> ${formatCLP(balance)}</p>
            </div>
            
            <form id="paymentForm">
                <div class="form-group">
                    <label>Monto a Pagar (CLP) *</label>
                    <input type="number" 
                           id="paymentAmount" 
                           class="form-control" 
                           value="${balance}" 
                           min="0" 
                           max="${balance}" 
                           required>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-success" onclick="PurchasesView.registerPayment(${id})">
                💰 Registrar Pago
            </button>
        `;
        
        showModal(content, { title: 'Registrar Pago', footer, width: '400px' });
    },
    
    async registerPayment(id) {
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        
        if (amount <= 0) {
            showNotification('Monto inválido', 'error');
            return;
        }
        
        try {
            await SupplierController.registerPayment(id, amount);
            closeModal();
            app.navigate('purchases');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
};
