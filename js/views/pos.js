const POSView = {
    async render() {
        const cashOpen = await posController.init();
        
        if (!cashOpen) {
            return `
                <div class="view-header">
                    <h1>Punto de Venta</h1>
                </div>
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <h2>Caja Cerrada</h2>
                        <p>Debes abrir la caja para realizar ventas</p>
                        <button class="btn btn-primary btn-lg" style="margin-top: 1rem;" onclick="app.navigate('cash')">
                            Ir a Caja
                        </button>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="view-header">
                <h1>🛒 Punto de Venta</h1>
                <p>Escanea código de barras o busca por nombre del producto</p>
            </div>
            
            <div class="pos-layout">
                <div class="card">
                    <div class="form-group">
                        <label>🔍 Buscar Producto</label>
                        <div class="search-box" style="position: relative;">
                            <input type="text" 
                                   id="productSearch" 
                                   class="form-control" 
                                   placeholder="Escanea código de barras o escribe nombre del producto..."
                                   autofocus
                                   style="font-size: 1.1rem; padding: 0.75rem;">
                            <div id="searchResults" style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border); border-top: none; border-radius: 0 0 0.375rem 0.375rem; max-height: 300px; overflow-y: auto; display: none; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
                        </div>
                        <small style="color: var(--text); opacity: 0.7;">
                            💡 Presiona Enter para buscar o escanea con el lector de código de barras
                        </small>
                    </div>
                    
                    <div style="margin-top: 2rem;">
                        <h3 style="margin-bottom: 1rem;">🛍️ Productos en el Carrito</h3>
                        <div id="cartItems"></div>
                    </div>
                </div>
                
                <div>
                    <div class="card">
                        <h3 style="margin-bottom: 1rem;">📋 Resumen de Venta</h3>
                        
                        <div id="customerInfo" style="margin-bottom: 1rem;">
                            <button class="btn btn-secondary" style="width: 100%;" onclick="POSView.selectCustomer()">
                                👤 Seleccionar Cliente
                            </button>
                        </div>
                        
                        <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 1rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>Items:</span>
                                <strong id="cartItemCount">0</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                                <span>Subtotal:</span>
                                <strong id="cartSubtotal">${formatCLP(0)}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 1.5rem; margin-bottom: 1.5rem; color: var(--primary);">
                                <strong>TOTAL:</strong>
                                <strong id="cartTotal">${formatCLP(0)}</strong>
                            </div>
                        </div>
                        
                        <div style="border-top: 2px solid var(--border); padding-top: 1rem;">
                            <h4 style="margin-bottom: 1rem;">💳 Método de Pago</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <button class="btn btn-success btn-lg" onclick="POSView.completeSale('cash')">
                                    💵 Efectivo
                                </button>
                                <button class="btn btn-success btn-lg" onclick="POSView.completeSale('card')">
                                    💳 Tarjeta
                                </button>
                                <button class="btn btn-success btn-lg" onclick="POSView.completeSale('qr')">
                                    📱 QR
                                </button>
                                <button class="btn btn-success btn-lg" onclick="POSView.completeSale('other')">
                                    ➕ Otro
                                </button>
                            </div>
                            
                            <button class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;" onclick="POSView.showMixedPaymentModal()">
                                🔀 Pago Mixto / Dividido
                            </button>
                            
                            <button class="btn btn-warning" id="fiarButton" style="width: 100%; margin-top: 0.5rem;" onclick="POSView.completeSalePending()" disabled>
                                📝 Anotar (Fiar)
                            </button>
                            
                            <button class="btn btn-danger" style="width: 100%; margin-top: 0.75rem;" onclick="POSView.clearCart()">
                                🗑️ Limpiar Carrito
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    async init() {
        const searchInput = document.getElementById('productSearch');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput) {
            console.error('productSearch input not found');
            return;
        }
        
        // Live search with dropdown
        let searchTimeout;
        searchInput.addEventListener('input', async (e) => {
            const term = e.target.value.trim();
            
            // Auto-search for barcodes (8+ digits)
            if (term.length >= 8 && !isNaN(term)) {
                await this.searchProduct(term);
                e.target.value = '';
                searchResults.style.display = 'none';
                return;
            }
            
            // Live search for text (3+ characters)
            if (term.length >= 3) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(async () => {
                    const products = await Product.search(term);
                    this.showSearchDropdown(products);
                }, 300);
            } else {
                searchResults.style.display = 'none';
            }
        });
        
        // Keyboard navigation for search results
        searchInput.addEventListener('keydown', async (e) => {
            const resultsDiv = document.getElementById('searchResults');
            const items = resultsDiv.querySelectorAll('.search-result-item');
            let selectedIndex = -1;
            
            // Find currently selected
            items.forEach((item, index) => {
                if (item.classList.contains('selected')) selectedIndex = index;
            });

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length > 0) {
                    const nextIndex = (selectedIndex + 1) % items.length;
                    POSView.highlightResult(nextIndex);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length > 0) {
                    const prevIndex = (selectedIndex - 1 + items.length) % items.length;
                    POSView.highlightResult(prevIndex);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const term = searchInput.value.trim();
                
                // Si hay resultados visibles en el dropdown
                if (resultsDiv.style.display === 'block' && items.length > 0) {
                    // Si hay uno resaltado, seleccionar ese
                    if (selectedIndex !== -1) {
                        const productId = items[selectedIndex].dataset.productId;
                        POSView.selectSearchResult(productId);
                    } else {
                        // Si no hay ninguno resaltado, seleccionar el primero
                        const productId = items[0].dataset.productId;
                        POSView.selectSearchResult(productId);
                    }
                } else if (term.length >= 3) {
                    // Si hay texto pero no hay dropdown visible, hacer búsqueda
                    const products = await Product.search(term);
                    if (products.length === 1) {
                        // Si hay un solo resultado, seleccionarlo directamente
                        POSView.selectSearchResult(products[0].id);
                        searchInput.value = '';
                    } else if (products.length > 1) {
                        // Si hay múltiples resultados, mostrar dropdown
                        this.showSearchDropdown(products);
                    } else {
                        showNotification('Producto no encontrado', 'warning');
                    }
                } else if (term.length >= 8 && !isNaN(term)) {
                    // Búsqueda por código de barras
                    await this.searchProduct(term);
                    searchInput.value = '';
                }
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
        
        this.updateCart();
    },

    highlightResult(index) {
        const items = document.querySelectorAll('.search-result-item');
        items.forEach(item => {
            item.classList.remove('selected');
            item.style.background = 'white';
        });
        
        const target = document.querySelector(`.search-result-item[data-index="${index}"]`);
        if (target) {
            target.classList.add('selected');
            target.style.background = 'var(--light)';
            // Ensure visible in scroll
            target.scrollIntoView({ block: 'nearest' });
        }
    },
    
    showSearchDropdown(products) {
        const searchResults = document.getElementById('searchResults');
        
        if (!products || products.length === 0) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchResults.innerHTML = products.map((p, index) => `
            <div class="search-result-item ${index === 0 ? 'selected' : ''}" 
                 data-index="${index}"
                 data-product-id="${p.id}"
                 style="padding: 0.75rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s; background: ${index === 0 ? 'var(--light)' : 'white'};"
                 onmouseover="POSView.highlightResult(${index})"
                 onclick="POSView.selectSearchResult(${p.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${p.name}</strong>
                        <br>
                        <small style="color: var(--secondary);">
                            ${p.barcode ? 'Código: ' + p.barcode + ' • ' : ''}
                            Stock: ${p.stock} ${p.type === 'weight' ? 'kg' : 'un'}
                        </small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: var(--primary); font-size: 1.1rem;">
                            ${formatCLP(p.price)}${p.type === 'weight' ? '/kg' : ''}
                        </strong>
                    </div>
                </div>
            </div>
        `).join('');
        
        searchResults.style.display = 'block';
    },
    
    async selectSearchResult(productId) {
        const searchResults = document.getElementById('searchResults');
        const searchInput = document.getElementById('productSearch');
        
        searchResults.style.display = 'none';
        searchInput.value = '';
        
        const product = await Product.getById(productId);
        if (product) {
            this.showProductModal(product);
        }
    },
    
    async searchProduct(term) {
        const result = await posController.searchProduct(term);
        
        if (result.product) {
            // SIEMPRE mostrar modal para configurar cantidad y precio
            this.showProductModal(result.product);
        } else if (result.multiple) {
            this.showProductSelection(result.products);
        } else {
            showNotification('Producto no encontrado', 'warning');
        }
    },
    
    showProductModal(product) {
        const isWeight = product.type === 'weight';
        
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary); margin-bottom: 0.5rem;">
                    ${product.name}
                </div>
                <div style="font-size: 1rem; color: var(--secondary); margin-bottom: 0.25rem;">
                    Código: ${product.barcode || 'Sin código'}
                </div>
                <div style="font-size: 1.2rem; font-weight: 600; color: var(--success);">
                    Precio: ${formatCLP(product.price)}${isWeight ? '/kg' : ''}
                </div>
                <div style="font-size: 0.9rem; color: var(--text); opacity: 0.7; margin-top: 0.25rem;">
                    Stock: ${product.stock} ${isWeight ? 'kg' : 'un'}
                </div>
            </div>
            
            <div class="form-group">
                <label style="font-size: 1.1rem; font-weight: 600;">
                    ${isWeight ? '⚖️ Peso (kg):' : '📦 Cantidad:'}
                </label>
                <input type="number" 
                       id="productQuantity" 
                       class="form-control" 
                       step="${isWeight ? '0.001' : '1'}" 
                       min="${isWeight ? '0.001' : '1'}" 
                       value="1"
                       autofocus
                       style="font-size: 1.5rem; text-align: center; padding: 1rem;">
                <small>${isWeight ? 'Ejemplo: 0.250 para 250g, 1.500 para 1.5kg' : 'Cantidad de unidades'}</small>
            </div>
            
            <div class="form-group" style="margin-top: 1.5rem;">
                <label style="font-size: 1.1rem; font-weight: 600;">💰 Precio Unitario:</label>
                <input type="number" 
                       id="productPrice" 
                       class="form-control" 
                       step="10" 
                       min="0" 
                       value="${product.price}"
                       style="font-size: 1.3rem; text-align: center; padding: 0.875rem;">
                <small>Precio por ${isWeight ? 'kg' : 'unidad'}. Puedes modificarlo si es necesario.</small>
            </div>
            
            <div id="pricePreview" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.25rem; border-radius: 0.5rem; margin-top: 1.5rem; text-align: center; color: white;">
                <div style="font-size: 0.9rem; margin-bottom: 0.25rem; opacity: 0.9;">Total a pagar:</div>
                <div id="calculatedTotal" style="font-size: 2.5rem; font-weight: bold;">
                    ${formatCLP(product.price)}
                </div>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary btn-lg" onclick="POSView.addProductFromModal(${product.id})" style="min-width: 200px;">
                ✓ Agregar al Carrito
            </button>
        `;
        
        showModal(content, { title: 'Agregar Producto', footer, width: '500px' });
        
        const quantityInput = document.getElementById('productQuantity');
        const priceInput = document.getElementById('productPrice');
        
        const updateTotal = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            let total = quantity * price;
            
            // Aplicar redondeo para productos fraccionados
            if (isWeight) {
                total = roundPrice(total);
            }
            
            document.getElementById('calculatedTotal').textContent = formatCLP(total);
        };
        
        quantityInput.addEventListener('input', updateTotal);
        priceInput.addEventListener('input', updateTotal);
        
        quantityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addProductFromModal(product.id);
            }
        });
        
        priceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addProductFromModal(product.id);
            }
        });
        
        setTimeout(() => quantityInput.focus(), 100);
        setTimeout(() => quantityInput.select(), 150);
    },
    
    async addProductFromModal(productId) {
        const quantity = parseFloat(document.getElementById('productQuantity').value);
        const customPrice = parseFloat(document.getElementById('productPrice').value);
        
        if (!quantity || quantity <= 0) {
            showNotification('Ingresa una cantidad válida', 'warning');
            return;
        }
        
        if (!customPrice || customPrice < 0) {
            showNotification('Ingresa un precio válido', 'warning');
            return;
        }
        
        const product = await Product.getById(productId);
        
        posController.addToCart(product, quantity, customPrice);
        this.updateCart();
        closeModal();
        showNotification(`${product.name} agregado al carrito`, 'success');
        
        // Enfocar búsqueda para siguiente producto
        setTimeout(() => {
            const searchInput = document.getElementById('productSearch');
            if (searchInput) searchInput.focus();
        }, 100);
    },
    
    showProductSelection(products) {
        const content = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Precio</th>
                            <th>Stock</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td><small>${p.barcode || '-'}</small></td>
                                <td><strong>${p.name}</strong></td>
                                <td>${formatCLP(p.price)}${p.type === 'weight' ? '/kg' : ''}</td>
                                <td>${p.stock} ${p.type === 'weight' ? 'kg' : 'un'}</td>
                                <td>
                                    <button class="btn btn-primary btn-sm" 
                                            onclick="POSView.selectProductFromList(${p.id})">
                                        Seleccionar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        showModal(content, { title: 'Seleccionar Producto', width: '700px' });
    },
    
    async selectProductFromList(productId) {
        const product = await Product.getById(productId);
        closeModal();
        this.showProductModal(product);
    },
    
    updateCart() {
        const summary = posController.getCartSummary();
        
        document.getElementById('cartItemCount').textContent = summary.totalItems;
        document.getElementById('cartSubtotal').textContent = formatCLP(summary.subtotal);
        document.getElementById('cartTotal').textContent = formatCLP(summary.total);
        
        const cartItemsDiv = document.getElementById('cartItems');
        
        if (summary.items.length === 0) {
            cartItemsDiv.innerHTML = `
                <div class="empty-state" style="padding: 2rem;">
                    <div class="empty-state-icon">🛒</div>
                    <p>Carrito vacío</p>
                    <small style="opacity: 0.7;">Escanea o busca productos para agregar</small>
                </div>
            `;
        } else {
            cartItemsDiv.innerHTML = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%;">
                        <thead style="background: var(--light);">
                            <tr>
                                <th style="padding: 0.75rem;">Producto</th>
                                <th style="padding: 0.75rem;">Cant.</th>
                                <th style="padding: 0.75rem;">Precio Unit.</th>
                                <th style="padding: 0.75rem;">Total</th>
                                <th style="padding: 0.75rem;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summary.items.map(item => `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 0.75rem;">
                                        <strong>${item.name}</strong>
                                        ${item.type === 'weight' ? '<br><small style="color: var(--secondary);">Por peso</small>' : ''}
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <input type="number" 
                                               value="${item.quantity}" 
                                               min="0.001" 
                                               step="${item.type === 'weight' ? '0.001' : '1'}"
                                               style="width: 90px; padding: 0.25rem;"
                                               onchange="POSView.updateQuantity(${item.productId}, this.value)">
                                        <br><small>${item.type === 'weight' ? 'kg' : 'un'}</small>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <input type="number" 
                                               value="${item.unitPrice}" 
                                               min="0" 
                                               step="10"
                                               style="width: 100px; padding: 0.25rem; font-weight: 600;"
                                               onchange="POSView.updatePrice(${item.productId}, this.value)">
                                        ${item.type === 'weight' ? '<br><small>/kg</small>' : ''}
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <strong style="color: var(--primary); font-size: 1.1rem;">
                                            ${formatCLP(item.total)}
                                        </strong>
                                    </td>
                                    <td style="padding: 0.75rem;">
                                        <button class="btn btn-danger btn-sm" 
                                                onclick="POSView.removeItem(${item.productId})"
                                                title="Eliminar">
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    },
    
    updateQuantity(productId, quantity) {
        const qty = parseFloat(quantity);
        if (qty > 0) {
            posController.updateCartItem(productId, qty);
            this.updateCart();
        } else {
            this.removeItem(productId);
        }
    },
    
    updatePrice(productId, newPrice) {
        const price = parseFloat(newPrice);
        if (price >= 0) {
            const item = posController.cart.find(i => i.productId === productId);
            if (item) {
                posController.updateCartItem(productId, item.quantity, price);
                this.updateCart();
                showNotification('Precio modificado', 'info');
            }
        }
    },
    
    removeItem(productId) {
        posController.removeFromCart(productId);
        this.updateCart();
        showNotification('Producto eliminado', 'info');
    },
    
    clearCart() {
        confirm('¿Limpiar el carrito?', () => {
            posController.clearCart();
            this.updateCart();
            showNotification('Carrito limpiado', 'info');
        });
    },
    
    async completeSale(paymentMethod) {
        const summary = posController.getCartSummary();
        
        if (summary.items.length === 0) {
            showNotification('El carrito está vacío', 'warning');
            return;
        }

        if (paymentMethod === 'cash') {
            this.showCashPaymentModal(summary.total);
            return;
        }
        
        try {
            const sale = await posController.completeSale(paymentMethod, false);
            this.updateCart();
            this.showSaleReceipt(sale);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    showCashPaymentModal(total) {
        const content = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--secondary);">Total a Pagar</div>
                <div style="font-size: 3rem; font-weight: bold; color: var(--primary);">${formatCLP(total)}</div>
            </div>
            
            <div class="form-group">
                <label style="font-size: 1.2rem;">💵 Dinero Recibido</label>
                <input type="number" 
                       id="cashTendered" 
                       class="form-control" 
                       style="font-size: 2rem; text-align: center; padding: 1rem;" 
                       placeholder="0"
                       min="${total}">
            </div>
            
            <div style="margin-top: 2rem; text-align: center; padding: 1.5rem; background: var(--light); border-radius: 0.5rem;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--secondary);">Vuelto / Cambio</div>
                <div id="changeAmount" style="font-size: 2.5rem; font-weight: bold; color: var(--success);">${formatCLP(0)}</div>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button id="confirmCashBtn" class="btn btn-success btn-lg" disabled onclick="POSView.processCashSale(${total})">
                Confirmar Pago
            </button>
        `;
        
        showModal(content, { title: 'Pago en Efectivo', footer, width: '500px' });
        
        const input = document.getElementById('cashTendered');
        const changeDisplay = document.getElementById('changeAmount');
        const confirmBtn = document.getElementById('confirmCashBtn');
        
        input.focus();
        
        input.addEventListener('input', () => {
            const tendered = parseFloat(input.value) || 0;
            const change = tendered - total;
            
            if (change >= 0) {
                changeDisplay.textContent = formatCLP(change);
                changeDisplay.style.color = 'var(--success)';
                confirmBtn.disabled = false;
            } else {
                changeDisplay.textContent = 'Faltan ' + formatCLP(Math.abs(change));
                changeDisplay.style.color = 'var(--danger)';
                confirmBtn.disabled = true;
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !confirmBtn.disabled) {
                this.processCashSale(total);
            }
        });
    },

    async processCashSale(total) {
        const tendered = parseFloat(document.getElementById('cashTendered').value);
        const change = tendered - total;
        
        try {
            const sale = await posController.completeSale('cash', false);
            this.updateCart();
            closeModal(); // Close payment input modal
            this.showSaleReceipt(sale, false, tendered, change);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    showMixedPaymentModal() {
        const summary = posController.getCartSummary();
        const total = summary.total;
        
        if (summary.items.length === 0) {
            showNotification('El carrito está vacío', 'warning');
            return;
        }

        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--secondary);">Total a Pagar</div>
                <div style="font-size: 2.5rem; font-weight: bold; color: var(--primary);">${formatCLP(total)}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div class="form-group">
                    <label>💵 Efectivo</label>
                    <input type="number" id="mixCash" class="form-control mixed-input" placeholder="0" min="0">
                </div>
                <div class="form-group">
                    <label>💳 Tarjeta</label>
                    <input type="number" id="mixCard" class="form-control mixed-input" placeholder="0" min="0">
                </div>
                <div class="form-group">
                    <label>📱 QR</label>
                    <input type="number" id="mixQr" class="form-control mixed-input" placeholder="0" min="0">
                </div>
                <div class="form-group">
                    <label>➕ Otro</label>
                    <input type="number" id="mixOther" class="form-control mixed-input" placeholder="0" min="0">
                </div>
            </div>
            
            <div style="background: var(--light); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Total Ingresado:</span>
                    <strong id="mixTotalEntered">${formatCLP(0)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.2rem;">
                    <span>Faltante:</span>
                    <strong id="mixRemaining" style="color: var(--danger);">${formatCLP(total)}</strong>
                </div>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button id="confirmMixedBtn" class="btn btn-success" disabled onclick="POSView.processMixedSale(${total})">
                Confirmar Pago Mixto
            </button>
        `;
        
        showModal(content, { title: 'Pago Mixto / Dividido', footer, width: '600px' });
        
        const inputs = document.querySelectorAll('.mixed-input');
        const totalEnteredDisplay = document.getElementById('mixTotalEntered');
        const remainingDisplay = document.getElementById('mixRemaining');
        const confirmBtn = document.getElementById('confirmMixedBtn');
        
        const updateCalculations = () => {
            let currentSum = 0;
            inputs.forEach(input => {
                currentSum += parseFloat(input.value) || 0;
            });
            
            const remaining = total - currentSum;
            
            totalEnteredDisplay.textContent = formatCLP(currentSum);
            
            if (remaining > 0) {
                remainingDisplay.textContent = formatCLP(remaining);
                remainingDisplay.style.color = 'var(--danger)';
                remainingDisplay.parentElement.firstElementChild.textContent = 'Faltante:';
                confirmBtn.disabled = true;
            } else if (remaining === 0) {
                remainingDisplay.textContent = formatCLP(0);
                remainingDisplay.style.color = 'var(--success)';
                remainingDisplay.parentElement.firstElementChild.textContent = 'Faltante:';
                confirmBtn.disabled = false;
            } else {
                // Negative remaining means change/vuelto (only valid if cash is involved ideally, but simplest logic is just allow it)
                // For mixed payments, usually exact amount is preferred, but let's show change
                remainingDisplay.textContent = formatCLP(Math.abs(remaining));
                remainingDisplay.style.color = 'var(--success)';
                remainingDisplay.parentElement.firstElementChild.textContent = 'Vuelto:';
                confirmBtn.disabled = false;
            }
        };
        
        inputs.forEach(input => {
            input.addEventListener('input', updateCalculations);
        });
        
        setTimeout(() => document.getElementById('mixCash').focus(), 100);
    },

    async processMixedSale(total) {
        const cash = parseFloat(document.getElementById('mixCash').value) || 0;
        const card = parseFloat(document.getElementById('mixCard').value) || 0;
        const qr = parseFloat(document.getElementById('mixQr').value) || 0;
        const other = parseFloat(document.getElementById('mixOther').value) || 0;
        
        const paymentDetails = {};
        if (cash > 0) paymentDetails.cash = cash;
        if (card > 0) paymentDetails.card = card;
        if (qr > 0) paymentDetails.qr = qr;
        if (other > 0) paymentDetails.other = other;
        
        const totalPaid = cash + card + qr + other;
        const change = totalPaid - total;
        const remaining = total - totalPaid;

        // If paying less than total (partial payment)
        if (remaining > 0) {
            if (!posController.currentCustomer) {
                showNotification('Para dejar un saldo pendiente debes seleccionar un cliente primero', 'warning');
                return;
            }
            
            confirm(
                `El pago ingresado (${formatCLP(totalPaid)}) es menor al total.\n¿Deseas registrar el pago parcial y dejar ${formatCLP(remaining)} como deuda a ${posController.currentCustomer.name}?`,
                async () => {
                    try {
                        const sale = await posController.completeSale('mixed', true, paymentDetails);
                        // Also register the partial payment immediately
                        // Wait, completeSale with pending status creates the sale with paidAmount = 0 in controller logic usually?
                        // Let's check POSController logic.
                        // Actually I need to make sure paidAmount is set correctly in completeSale. 
                        // In POSController: paidAmount: isPending ? 0 : summary.total
                        // I should update POSController to accept paidAmount or calculate it from details if pending.
                        
                        // BUT, I can't update POSController in this step easily without reading it first (which I did in prev turn).
                        // Wait, I read POSController in previous turn but didn't modify it to handle paidAmount from details if pending.
                        // I should have done that. Let me check if I can modify POSController now.
                        // Yes I can.
                        
                        this.updateCart();
                        closeModal();
                        this.showSaleReceipt(sale, true, totalPaid, null);
                    } catch (error) {
                        showNotification(error.message, 'error');
                    }
                }
            );
            return;
        }
        
        // Full payment
        try {
            const sale = await posController.completeSale('mixed', false, paymentDetails);
            this.updateCart();
            closeModal();
            this.showSaleReceipt(sale, false, totalPaid, change > 0 ? change : null);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },
    
    async completeSalePending() {
        const summary = posController.getCartSummary();
        
        if (summary.items.length === 0) {
            showNotification('El carrito está vacío', 'warning');
            return;
        }
        
        // Show modal to select customer or payment for pending sales
        this.showPendingSaleModal(summary.total);
    },

    async showPendingSaleModal(total) {
        const customers = await Customer.getAll();
        
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--secondary);">Total a Anotar</div>
                <div style="font-size: 2.5rem; font-weight: bold; color: var(--primary);">${formatCLP(total)}</div>
            </div>
            
            <div id="pendingCustomerSelection">
                ${!posController.currentCustomer ? `
                    <div class="form-group">
                        <label>Seleccionar Cliente *</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="pendingCustomerSearch" class="form-control" placeholder="Buscar cliente...">
                            <button class="btn btn-primary" onclick="POSView.showCreateCustomerForm()">+</button>
                        </div>
                        <div id="pendingCustomerList" class="table-container" style="max-height: 200px; overflow-y: auto; margin-top: 0.5rem; border: 1px solid var(--border); display: none;"></div>
                    </div>
                ` : `
                    <div style="padding: 1rem; background: #e0f2fe; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                        <strong>Cliente:</strong> ${posController.currentCustomer.name}
                        <button class="btn btn-sm btn-secondary" style="float: right;" onclick="POSView.removeCustomerInModal()">Cambiar</button>
                    </div>
                `}
            </div>
            
            <div class="form-group">
                <label>Abono Inicial (Opcional)</label>
                <input type="number" id="pendingPayment" class="form-control" placeholder="0" min="0" max="${total}">
                <small>Si el cliente paga una parte ahora, ingrésala aquí.</small>
            </div>
            
            <div id="pendingBalancePreview" style="margin-top: 1rem; padding: 1rem; background: #fef3c7; border-radius: 0.5rem; text-align: center;">
                <div>Saldo a Deuda: <strong id="debtAmount" style="color: var(--danger);">${formatCLP(total)}</strong></div>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-warning" onclick="POSView.processPendingSale(${total})">Confirmar Anotación</button>
        `;
        
        showModal(content, { title: 'Anotar Venta / Fiar', footer, width: '500px' });
        
        // Handle customer search logic if needed
        const searchInput = document.getElementById('pendingCustomerSearch');
        if (searchInput) {
            searchInput.focus();
            const list = document.getElementById('pendingCustomerList');
            
            const renderList = (filtered) => {
                if (filtered.length === 0) {
                    list.innerHTML = '<div style="padding:0.5rem;">No se encontraron clientes</div>';
                } else {
                    list.innerHTML = filtered.map(c => `
                        <div style="padding:0.5rem; cursor:pointer; border-bottom:1px solid #eee;" onclick="POSView.setPendingCustomer(${c.id}, ${total})">
                            <strong>${c.name}</strong><br><small>${c.phone || ''}</small>
                        </div>
                    `).join('');
                }
                list.style.display = 'block';
            };
            
            searchInput.addEventListener('input', async (e) => {
                const term = e.target.value;
                if(term.length > 0) {
                    const filtered = await Customer.search(term);
                    renderList(filtered);
                } else {
                    list.style.display = 'none';
                }
            });
        }
        
        // Handle payment input
        const paymentInput = document.getElementById('pendingPayment');
        paymentInput.addEventListener('input', (e) => {
            const paid = parseFloat(e.target.value) || 0;
            const debt = total - paid;
            document.getElementById('debtAmount').textContent = formatCLP(debt > 0 ? debt : 0);
        });
    },

    async setPendingCustomer(customerId, total) {
        const customer = await Customer.getById(customerId);
        posController.setCustomer(customer);
        
        // Obtener balance de cuenta del cliente
        const accountBalance = await Customer.getAccountBalance(customerId);
        
        // Refresh modal to show selected customer
        closeModal();
        this.showPendingSaleModal(total);
        
        // Update main view customer info too
        document.getElementById('customerInfo').innerHTML = `
            <div style="padding: 1rem; background: #e0f2fe; border: 2px solid var(--primary); border-radius: 0.375rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0.25rem;">
                            👤 ${customer.name}
                        </div>
                        <small style="color: var(--text);">
                            ${customer.phone || ''} ${customer.email ? '• ' + customer.email : ''}
                        </small>
                        ${accountBalance.totalDebt > 0 ? `
                            <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fee2e2; border-radius: 0.25rem;">
                                <strong style="color: var(--danger);">Deuda Total: ${formatCLP(accountBalance.totalDebt)}</strong>
                            </div>
                        ` : `
                            <div style="margin-top: 0.5rem; padding: 0.5rem; background: #dcfce7; border-radius: 0.25rem;">
                                <small style="color: var(--success);">✓ Sin deuda</small>
                            </div>
                        `}
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="POSView.removeCustomer()" title="Quitar cliente">
                        ✕
                    </button>
                </div>
            </div>
        `;
        this.toggleFiarButton(true);
    },

    removeCustomerInModal() {
        posController.setCustomer(null);
        // Remove from main view
        this.removeCustomer(); 
        // Reopen modal to show search
        closeModal();
        const summary = posController.getCartSummary();
        this.showPendingSaleModal(summary.total);
    },

    async processPendingSale(total) {
        if (!posController.currentCustomer) {
            showNotification('Debes seleccionar un cliente', 'warning');
            return;
        }
        
        const partialPayment = parseFloat(document.getElementById('pendingPayment').value) || 0;
        
        if (partialPayment >= total) {
            showNotification('Si paga el total, usa los botones de pago normal', 'info');
            return;
        }
        
        // If there is a partial payment, we treat it as cash for simplicity in this flow, 
        // or we could ask method. Let's assume cash for "Abono".
        // Or better, if partial payment > 0, we treat it as mixed payment with cash portion.
        
        const paymentDetails = partialPayment > 0 ? { cash: partialPayment } : null;
        const paymentMethod = partialPayment > 0 ? 'mixed' : 'pending'; // 'pending' implies 0 paid usually, but our controller handles paidAmount. 
        // Actually controller uses 'pending' status to mark debt. paymentMethod is just a label.
        
        try {
            const sale = await posController.completeSale('pending', true, paymentDetails);
            this.updateCart();
            closeModal();
            
            // Actualizar información del cliente si está visible
            if (posController.currentCustomer) {
                const customerInfo = document.getElementById('customerInfo');
                if (customerInfo) {
                    // Recargar información del cliente para mostrar deuda actualizada
                    const accountBalance = await Customer.getAccountBalance(posController.currentCustomer.id);
                    customerInfo.innerHTML = `
                        <div style="padding: 1rem; background: #e0f2fe; border: 2px solid var(--primary); border-radius: 0.375rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0.25rem;">
                                        👤 ${posController.currentCustomer.name}
                                    </div>
                                    <small style="color: var(--text);">
                                        ${posController.currentCustomer.phone || ''} ${posController.currentCustomer.email ? '• ' + posController.currentCustomer.email : ''}
                                    </small>
                                    ${accountBalance.totalDebt > 0 ? `
                                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fee2e2; border-radius: 0.25rem;">
                                            <strong style="color: var(--danger);">Deuda Total: ${formatCLP(accountBalance.totalDebt)}</strong>
                                        </div>
                                    ` : ''}
                                </div>
                                <button class="btn btn-sm btn-secondary" onclick="POSView.removeCustomer()" title="Quitar cliente">
                                    ✕
                                </button>
                            </div>
                        </div>
                    `;
                }
            }
            
            this.showSaleReceipt(sale, true, partialPayment > 0 ? partialPayment : null, null);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },
    
    showSaleReceipt(sale, isPending = false, tendered = null, change = null) {
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 3rem; color: ${isPending ? 'var(--warning)' : 'var(--secondary)'}; margin-bottom: 0.5rem;">
                    ${isPending ? '📝' : '✓'}
                </div>
                <h2>${isPending ? 'Venta Anotada (Fiada)' : 'Venta Completada'}</h2>
                <div style="font-size: 1.75rem; font-weight: bold; margin-top: 0.5rem;">
                    #${sale.saleNumber}
                </div>
            </div>
            
            <div style="border: 2px solid ${isPending ? 'var(--warning)' : 'var(--secondary)'}; padding: 1.5rem; border-radius: 0.5rem;">
                <table style="width: 100%; font-size: 1.1rem;">
                    <tr>
                        <td style="padding: 0.5rem 0;">Fecha:</td>
                        <td style="text-align: right; padding: 0.5rem 0;"><strong>${formatDateTime(sale.date)}</strong></td>
                    </tr>
                    ${sale.customerId ? `
                    <tr>
                        <td style="padding: 0.5rem 0;">Cliente:</td>
                        <td style="text-align: right; padding: 0.5rem 0;" id="customerName-${sale.id}"><strong>-</strong></td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 0.5rem 0;">Items:</td>
                        <td style="text-align: right; padding: 0.5rem 0;"><strong>${sale.items.length}</strong></td>
                    </tr>
                    ${!isPending ? `
                    <tr>
                        <td style="padding: 0.5rem 0;">Método de Pago:</td>
                        <td style="text-align: right; padding: 0.5rem 0;"><strong>${this.getPaymentMethodName(sale.paymentMethod)}</strong></td>
                    </tr>
                    ` : ''}
                    <tr style="border-top: 2px solid var(--border);">
                        <td style="padding: 0.75rem 0; font-size: 1.5rem;"><strong>TOTAL:</strong></td>
                        <td style="text-align: right; padding: 0.75rem 0; font-size: 1.75rem;">
                            <strong style="color: ${isPending ? 'var(--warning)' : 'var(--primary)'};">
                                ${formatCLP(sale.total)}
                            </strong>
                        </td>
                    </tr>
                    ${tendered !== null ? `
                    <tr>
                        <td style="padding: 0.5rem 0; color: var(--secondary);">Efectivo:</td>
                        <td style="text-align: right; padding: 0.5rem 0; color: var(--secondary);">
                            ${formatCLP(tendered)}
                        </td>
                    </tr>
                    <tr style="background: #dcfce7;">
                        <td style="padding: 0.75rem 0.5rem; font-size: 1.3rem; font-weight: bold; color: var(--success);">VUELTO:</td>
                        <td style="text-align: right; padding: 0.75rem 0.5rem; font-size: 1.8rem; font-weight: bold; color: var(--success);">
                            ${formatCLP(change)}
                        </td>
                    </tr>
                    ` : ''}
                    ${isPending ? `
                    <tr>
                        <td colspan="2" style="padding-top: 1rem; text-align: center; color: var(--warning);">
                            <strong>⚠️ Venta pendiente de pago</strong>
                        </td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            
            ${isPending ? `
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 1rem; border-radius: 0.375rem; margin-top: 1rem;">
                <strong>Nota:</strong> Esta venta quedó registrada como pendiente de pago. 
                Podrás cobrarla posteriormente desde el módulo de Reportes.
            </div>
            ` : ''}
            
            ${change !== null ? `
            <div style="margin-top: 1rem; text-align: center; color: var(--text); opacity: 0.7;">
                Cerrando en <span id="autoCloseTimer">5</span> segundos...
            </div>
            ` : ''}
        `;
        
        const footer = `
            <button class="btn btn-primary btn-lg" onclick="closeModal(); document.getElementById('productSearch').focus();">
                ${isPending ? 'Aceptar' : 'Nueva Venta'}
            </button>
        `;
        
        showModal(content, { title: 'Comprobante de Venta', footer, width: '500px' });
        
        if (sale.customerId) {
            Customer.getById(sale.customerId).then(customer => {
                const elem = document.getElementById(`customerName-${sale.id}`);
                if (elem && customer) {
                    elem.innerHTML = `<strong>${customer.name}</strong>`;
                }
            });
        }
        
        this.removeCustomer();

        // Auto-close timer for cash sales with change
        if (change !== null) {
            let seconds = 5;
            const timerElem = document.getElementById('autoCloseTimer');
            const interval = setInterval(() => {
                seconds--;
                if (timerElem) timerElem.textContent = seconds;
                if (seconds <= 0) {
                    clearInterval(interval);
                    closeModal();
                    const searchInput = document.getElementById('productSearch');
                    if (searchInput) searchInput.focus();
                }
            }, 1000);
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
    },
    
    async selectCustomer() {
        const customers = await Customer.getAll();
        
        const content = `
            <div class="form-group">
                <div class="search-box">
                    <input type="text" 
                           id="customerSearch" 
                           class="form-control" 
                           placeholder="Buscar cliente por nombre..."
                           autofocus>
                </div>
            </div>
            
            <div id="customerList" class="table-container" style="max-height: 400px; overflow-y: auto;">
                ${this.renderCustomerList(customers)}
            </div>
            
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                <button class="btn btn-primary btn-sm" onclick="POSView.showCreateCustomerForm()">
                    ➕ Crear Nuevo Cliente
                </button>
                <button class="btn btn-secondary btn-sm" style="margin-left: 0.5rem;" onclick="app.navigate('customers'); closeModal();">
                    📋 Ver Todos los Clientes
                </button>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        `;
        
        showModal(content, { title: 'Seleccionar Cliente', footer, width: '600px' });
        
        document.getElementById('customerSearch').addEventListener('input', async (e) => {
            const term = e.target.value;
            const filtered = term ? await Customer.search(term) : customers;
            document.getElementById('customerList').innerHTML = this.renderCustomerList(filtered);
        });
    },
    
    renderCustomerList(customers) {
        if (customers.length === 0) {
            return '<div class="empty-state">No hay clientes registrados</div>';
        }
        
        return `
            <table style="width: 100%;">
                <thead style="background: var(--light); position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 0.75rem;">Nombre</th>
                        <th style="padding: 0.75rem;">Teléfono</th>
                        <th style="padding: 0.75rem;">Email</th>
                        <th style="padding: 0.75rem;">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${customers.map(c => `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 0.75rem;"><strong>${c.name}</strong></td>
                            <td style="padding: 0.75rem;">${c.phone || '-'}</td>
                            <td style="padding: 0.75rem;"><small>${c.email || '-'}</small></td>
                            <td style="padding: 0.75rem;">
                                <button class="btn btn-primary btn-sm" onclick="POSView.setCustomer(${c.id})">
                                    Seleccionar
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="POSView.showEditCustomerForm(${c.id})" style="margin-left: 0.25rem;">
                                    ✏️
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    async setCustomer(customerId) {
        const customer = await Customer.getById(customerId);
        posController.setCustomer(customer);
        
        // Obtener balance de cuenta del cliente
        const accountBalance = await Customer.getAccountBalance(customerId);
        
        document.getElementById('customerInfo').innerHTML = `
            <div style="padding: 1rem; background: #e0f2fe; border: 2px solid var(--primary); border-radius: 0.375rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0.25rem;">
                            👤 ${customer.name}
                        </div>
                        <small style="color: var(--text);">
                            ${customer.phone || ''} ${customer.email ? '• ' + customer.email : ''}
                        </small>
                        ${accountBalance.totalDebt > 0 ? `
                            <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fee2e2; border-radius: 0.25rem;">
                                <strong style="color: var(--danger);">Deuda Total: ${formatCLP(accountBalance.totalDebt)}</strong>
                            </div>
                        ` : `
                            <div style="margin-top: 0.5rem; padding: 0.5rem; background: #dcfce7; border-radius: 0.25rem;">
                                <small style="color: var(--success);">✓ Sin deuda</small>
                            </div>
                        `}
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="POSView.removeCustomer()" title="Quitar cliente">
                        ✕
                    </button>
                </div>
            </div>
        `;
        
        this.toggleFiarButton(true);
        closeModal();
        showNotification(`Cliente ${customer.name} seleccionado`, 'success');
    },
    
    removeCustomer() {
        posController.setCustomer(null);
        document.getElementById('customerInfo').innerHTML = `
            <button class="btn btn-secondary" style="width: 100%;" onclick="POSView.selectCustomer()">
                👤 Seleccionar Cliente
            </button>
        `;
        this.toggleFiarButton(false);
    },
    
    toggleFiarButton(enabled) {
        const fiarButton = document.getElementById('fiarButton');
        if (fiarButton) {
            fiarButton.disabled = !enabled;
        }
    },
    
    showCreateCustomerForm() {
        const content = `
            <div class="form-group">
                <label>Nombre *</label>
                <input type="text" id="customerName" class="form-control" placeholder="Nombre completo" required autofocus>
            </div>
            
            <div class="form-group">
                <label>Teléfono</label>
                <input type="tel" id="customerPhone" class="form-control" placeholder="+56 9 1234 5678">
            </div>
            
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="customerEmail" class="form-control" placeholder="correo@ejemplo.cl">
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="POSView.selectCustomer()">Volver</button>
            <button class="btn btn-primary" onclick="POSView.saveNewCustomer()">Crear Cliente</button>
        `;
        
        showModal(content, { title: 'Crear Nuevo Cliente', footer, width: '500px' });
    },
    
    async saveNewCustomer() {
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        
        if (!name) {
            showNotification('El nombre es obligatorio', 'warning');
            return;
        }
        
        try {
            const id = await Customer.create({ name, phone, email });
            showNotification('Cliente creado exitosamente', 'success');
            this.setCustomer(id);
        } catch (error) {
            showNotification('Error al crear cliente: ' + error.message, 'error');
        }
    },
    
    async showEditCustomerForm(customerId) {
        const customer = await Customer.getById(customerId);
        
        const content = `
            <div class="form-group">
                <label>Nombre *</label>
                <input type="text" id="customerName" class="form-control" value="${customer.name}" required autofocus>
            </div>
            
            <div class="form-group">
                <label>Teléfono</label>
                <input type="tel" id="customerPhone" class="form-control" value="${customer.phone || ''}">
            </div>
            
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="customerEmail" class="form-control" value="${customer.email || ''}">
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="POSView.selectCustomer()">Volver</button>
            <button class="btn btn-primary" onclick="POSView.saveEditCustomer(${customerId})">Guardar Cambios</button>
        `;
        
        showModal(content, { title: 'Editar Cliente', footer, width: '500px' });
    },
    
    async saveEditCustomer(customerId) {
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        
        if (!name) {
            showNotification('El nombre es obligatorio', 'warning');
            return;
        }
        
        try {
            await Customer.update(customerId, { name, phone, email });
            showNotification('Cliente actualizado exitosamente', 'success');
            this.selectCustomer();
        } catch (error) {
            showNotification('Error al actualizar cliente: ' + error.message, 'error');
        }
    }
};
