const POSView = {
    currentSection: 'pos',
    lastScanTerm: null,
    lastScanAt: 0,
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
            <div class="view-header" style="margin-bottom: 1rem;">
                <h1 style="font-size: 1.8rem; display: flex; align-items: center; gap: 0.5rem;">🛍️ Caja Abierta - Punto de Venta</h1>
            </div>
            
            <div class="pos-layout" style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; height: calc(100vh - 120px); min-height: 600px;">
                <!-- COLUMNA IZQUIERDA: Búsqueda y Carrito -->
                <div style="display: flex; flex-direction: column; gap: 1rem; overflow: hidden;">
                    
                    <!-- Buscador Gigante -->
                    <div style="background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);">
                        <div class="pos-search-box" style="position: relative;">
                            <span style="position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); font-size: 1.5rem; opacity: 0.7;">🔍</span>
                             <input type="text" 
                                    id="productSearch" 
                                    class="form-control" 
                                    placeholder="🔍 Escanea o escribe nombre del producto..."
                                    title="Tips: Puedes usar el lector de código de barras en cualquier momento, o escribir el nombre para ver sugerencias."
                                    autofocus
                                    autocomplete="off"
                                    style="font-size: 1.3rem; padding: 1.25rem 1.25rem 1.25rem 3.5rem; border-radius: 0.75rem; background: rgba(0,0,0,0.4); border: 2px solid rgba(59, 130, 246, 0.5); color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5), 0 0 15px rgba(59, 130, 246, 0.1); transition: all 0.3s;">
                            <div id="searchResults" class="pos-search-results" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-top: 0.5rem; display: none; max-height: 350px; overflow-y: auto;"></div>
                        </div>
                    </div>
                    
                    <!-- Carrito de Compras -->
                    <div style="flex: 1; background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; display: flex; flex-direction: column; overflow: hidden;">
                        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                            <h3 style="margin: 0; font-size: 1.1rem; color: #e2e8f0; display: flex; align-items: center; gap: 0.5rem;">🛒 Productos en la venta actual</h3>
                        </div>
                        <div id="cartItems" style="flex: 1; overflow-y: auto; padding: 1rem;"></div>
                    </div>
                    
                </div>
                
                <!-- COLUMNA DERECHA: Resumen y Pago -->
                <div style="display: flex; flex-direction: column; gap: 1rem; overflow: hidden; overflow-y: auto; padding-right: 0.5rem;">
                    
                    <!-- Resumen del Total Gigante -->
                    <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 1.5rem; padding: 2rem 1.5rem; text-align: center; position: relative; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(16, 185, 129, 0.2);">
                        <div style="font-size: 1rem; color: #6ee7b7; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; margin-bottom: 0.5rem;">Total a Pagar</div>
                        <div id="cartTotal" style="font-size: 3.5rem; font-weight: 900; color: #a7f3d0; text-shadow: 0 4px 15px rgba(5, 150, 105, 0.5); line-height: 1;">${formatCLP(0)}</div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(16, 185, 129, 0.3); font-size: 1.1rem;">
                            <span style="color: #6ee7b7;">Subtotal:</span>
                            <strong id="cartSubtotal" style="color: #fff;">${formatCLP(0)}</strong>
                        </div>
                        <div id="cartDiscountSection" style="display: none; justify-content: space-between; align-items: center; margin-top: 0.5rem; color: #fcd34d; font-size: 1.1rem;">
                            <span>Descuento:</span>
                            <strong id="cartDiscountAmount">- ${formatCLP(0)}</strong>
                        </div>
                        <div id="cartCreditSection" style="display: none; justify-content: space-between; align-items: center; margin-top: 0.5rem; color: #34d399; font-size: 1.1rem; padding: 0.25rem 0.5rem; background: rgba(52, 211, 153, 0.1); border-radius: 0.5rem;">
                            <span>S. Favor usado:</span>
                            <strong id="cartCreditAmount">- ${formatCLP(0)}</strong>
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                            <button class="btn btn-sm" style="flex: 1; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.2);" onclick="POSView.showDiscountModal()">% Descuento</button>
                            <button class="btn btn-sm" style="flex: 1; background: rgba(0,0,0,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.2);" onclick="POSView.removeDiscount()">Quitar Desc.</button>
                        </div>
                    </div>
                    
                    <!-- Selección de Cliente -->
                    <div style="background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.5rem;">
                        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; color: var(--secondary); text-transform: uppercase;">1. Seleccionar Cliente</h4>
                        <div id="customerInfo">
                            <button style="width: 100%; padding: 1.25rem; border-radius: 0.75rem; border: 2px dashed rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.05); color: #60a5fa; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(59, 130, 246, 0.15)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.05)'" onclick="POSView.selectCustomer()">
                                👤 Agregar Cliente a la Venta
                            </button>
                        </div>
                    </div>

                    <!-- Botones de Pago -->
                    <div style="background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.5rem;">
                        <h4 style="margin: 0 0 1rem 0; font-size: 0.95rem; color: var(--secondary); text-transform: uppercase;">2. Método de Pago</h4>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                             <button style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1)); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 1rem; color: #a7f3d0; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(16, 185, 129, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)';" 
                                     onclick="POSView.completeSale('cash')" title="Finalizar venta recibiendo billetes o monedas">
                                 <span style="font-size: 2.5rem;">💵</span>
                                 <strong style="font-size: 1.1rem;">Efectivo</strong>
                                 <span style="font-size: 0.8rem; opacity: 0.8;">Pago en efectivo</span>
                             </button>
                             
                             <button style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1)); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 1rem; color: #bfdbfe; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(59, 130, 246, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)';" 
                                     onclick="POSView.completeSale('card')" title="Finalizar venta con Transbank u otros terminales">
                                 <span style="font-size: 2.5rem;">💳</span>
                                 <strong style="font-size: 1.1rem;">Tarjeta</strong>
                                 <span style="font-size: 0.8rem; opacity: 0.8;">Crédito/Débito</span>
                             </button>
                             
                             <button style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.1)); border: 2px solid rgba(168, 85, 247, 0.4); border-radius: 1rem; color: #e9d5ff; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(168, 85, 247, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)';" 
                                     onclick="POSView.completeSale('qr')" title="Finalizar venta mediante transferencia o pago móvil">
                                 <span style="font-size: 2.5rem;">📱</span>
                                 <strong style="font-size: 1.1rem;">QR</strong>
                                 <span style="font-size: 0.8rem; opacity: 0.8;">Pagos con Máquina/QR</span>
                             </button>
                             
                             <button style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(107, 114, 128, 0.2), rgba(75, 85, 99, 0.1)); border: 2px solid rgba(107, 114, 128, 0.4); border-radius: 1rem; color: #e5e7eb; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(107, 114, 128, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)';" 
                                     onclick="POSView.completeSale('other')" title="Registrar transferencia bancaria directa (Pide nombre y banco)">
                                 <span style="font-size: 2.5rem;">🏦</span>
                                 <strong style="font-size: 1.1rem;">Transferencia</strong>
                                 <span style="font-size: 0.8rem; opacity: 0.8;">Directo a cuenta</span>
                             </button>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <button class="btn" style="background: rgba(14, 165, 233, 0.2); color: #7dd3fc; border: 1px solid rgba(14, 165, 233, 0.3); width: 100%; padding: 0.75rem;" onclick="POSView.showMixedPaymentModal()">
                                🔀 Pago Mixto / Dividido
                            </button>
                            
                            <button class="btn" id="fiarButton" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.3); width: 100%; padding: 0.75rem;" disabled onclick="POSView.completeSalePending()">
                                📝 Anotar (Fiar)
                            </button>
                            
                            <button class="btn" id="useCreditButton" style="display: none; background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); width: 100%; padding: 0.75rem;" onclick="POSView.useCreditBalance()">
                                💰 Usar dinero a favor
                            </button>
                            
                            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 0.5rem 0;"></div>
                            
                            <button class="btn" style="background: transparent; color: #ef4444; border: 1px dashed rgba(239, 68, 68, 0.4); width: 100%; padding: 0.5rem;" onclick="POSView.clearCart()">
                                🗑️ Limpiar Venta
                            </button>

                            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 0.5rem 0;"></div>

                            <button id="holdSaleButton" class="btn" style="background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); width: 100%; padding: 0.75rem;" onclick="POSView.holdCurrentSale()">
                                ⏸️ Poner en Espera
                            </button>

                            <div id="heldSalesContainer" style="display: ${posController.heldSales.length > 0 ? 'block' : 'none'}; margin-top: 0.5rem;">
                                <button class="btn" style="background: rgba(16, 185, 129, 0.1); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); width: 100%; padding: 0.75rem; font-weight: bold; position: relative;" onclick="POSView.showHeldSales()">
                                    🔄 Ventas en Espera
                                    <span style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; border: 2px solid #111827;">${posController.heldSales.length}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        const searchInput = document.getElementById('productSearch');
        const searchResults = document.getElementById('searchResults');

        if (!searchInput) return;

        this._searchTimeout = null;
        searchInput.addEventListener('input', async (e) => {
            const term = e.target.value.trim();
            const isBarcode = term.length >= 8 && !isNaN(term);

            if (isBarcode) {
                clearTimeout(this._searchTimeout);
                await this.handleBarcodeScan(term);
                e.target.value = '';
                searchResults.style.display = 'none';
                return;
            }

            if (term.length >= 3) {
                clearTimeout(this._searchTimeout);
                this._searchTimeout = setTimeout(async () => {
                    const products = await Product.search(term);
                    this.showSearchDropdown(products);
                }, 300);
            } else {
                clearTimeout(this._searchTimeout);
                searchResults.style.display = 'none';
            }
        });

        searchInput.addEventListener('keydown', async (e) => {
            const items = searchResults.querySelectorAll('.search-result-item');
            let selectedIndex = -1;
            items.forEach((item, index) => { if (item.classList.contains('selected')) selectedIndex = index; });

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.highlightResult((selectedIndex + 1) % items.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.highlightResult((selectedIndex - 1 + items.length) % items.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const term = searchInput.value.trim();
                const isBarcode = term.length >= 8 && !isNaN(term);

                if (isBarcode) {
                    await this.handleBarcodeScan(term);
                    searchInput.value = '';
                    searchResults.style.display = 'none';
                } else if (searchResults.style.display !== 'none' && items.length > 0) {
                    const selected = searchResults.querySelector('.selected') || items[0];
                    if (selected) await this.addProductFromSearch(parseInt(selected.dataset.productId));
                } else if (term.length >= 3) {
                    const products = await Product.search(term);
                    if (products.length === 1) await this.addProductFromSearch(products[0].id);
                    else if (products.length > 1) this.showSearchDropdown(products);
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        this.updateCart();
    },

    highlightResult(index) {
        const items = document.querySelectorAll('.search-result-item');
        items.forEach(item => item.classList.remove('selected'));
        const target = document.querySelector(`.search-result-item[data-index="${index}"]`);
        if (target) {
            target.classList.add('selected');
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
                 onmouseover="POSView.highlightResult(${index})"
                 onclick="POSView.selectSearchResult(${p.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong class="pos-search-name">${p.name}</strong>
                        <div class="pos-search-stock">
                            ${p.stock <= (p.type === 'weight' ? 1 : 5)
                ? `<span style="color: #ef4444; font-weight: 900;">⚠️ STOCK BAJO:</span>`
                : 'Stock:'}
                            <strong>${formatStock(p.stock)} ${p.type === 'weight' ? 'kg' : 'un'}</strong>
                        </div>
                    </div>
                    <strong style="color: #4ade80; font-size: 1.2rem;">${formatCLP(p.price)}${p.type === 'weight' ? '/kg' : ''}</strong>
                </div>
            </div>
        `).join('');
        searchResults.style.display = 'block';
    },

    async selectSearchResult(productId) {
        const product = await Product.getById(productId);
        if (product) {
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('productSearch').value = '';
            this.showProductModal(product);
        }
    },

    async addProductFromSearch(productId) {
        const product = await Product.getById(productId);
        if (product) {
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('productSearch').value = '';
            this.showProductModal(product);
        }
    },

    async handleBarcodeScan(term) {
        const now = Date.now();
        if (this.lastScanTerm === term && now - this.lastScanAt < 800) return;
        this.lastScanTerm = term;
        this.lastScanAt = now;

        const result = await posController.searchProduct(term);
        if (result.product) this.showProductModal(result.product);
        else if (result.multiple) this.showProductSelection(result.products);
        else showNotification('Producto no encontrado', 'warning');
    },

    showProductModal(product) {
        closeModal();
        const isWeight = product.type === 'weight';
        const unitPriceRounded = Math.round(product.price / 10) * 10;

        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2 style="color: var(--primary);">${product.name}</h2>
                <p>Precio: ${formatCLP(unitPriceRounded)}${isWeight ? '/kg' : ''}</p>
                <p style="opacity: 0.7;">Stock: ${product.stock} ${isWeight ? 'kg' : 'un'}</p>
            </div>
            <div class="form-group">
                <label>${isWeight ? '⚖️ Peso (kg):' : '📦 Cantidad:'}</label>
                <input type="number" id="productQuantity" class="form-control" step="${isWeight ? '0.001' : '1'}" min="0.001" value="${isWeight ? '' : '1'}" autofocus style="font-size: 1.5rem; text-align: center;">
            </div>
            <div class="form-group" style="margin-top: 1rem;">
                <label>💰 Precio Unitario:</label>
                <input type="number" id="productPrice" class="form-control" step="10" value="${unitPriceRounded}" style="font-size: 1.2rem; text-align: center;">
            </div>
            <div id="pricePreview" style="background: var(--primary); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; text-align: center; color: white;">
                <div>Total: <strong id="calculatedTotal" style="font-size: 1.5rem;">${formatCLP(unitPriceRounded)}</strong></div>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary btn-lg" onclick="POSView.addProductFromModal(${product.id})">✓ Agregar</button>
        `;

        showModal(content, { title: 'Agregar Producto', footer, width: '450px' });

        const qInput = document.getElementById('productQuantity');
        const pInput = document.getElementById('productPrice');
        const update = () => {
            const q = parseFloat(qInput.value) || 0;
            const p = parseFloat(pInput.value) || 0;
            document.getElementById('calculatedTotal').textContent = formatCLP(isWeight ? roundPrice(q * p) : q * p);
        };
        qInput.addEventListener('input', update);
        pInput.addEventListener('input', update);
        qInput.focus();
    },

    async addProductFromModal(productId) {
        const q = parseFloat(document.getElementById('productQuantity').value);
        const p = parseFloat(document.getElementById('productPrice').value);

        if (!q || q <= 0) { showNotification('Cantidad inválida', 'warning'); return; }

        const product = await Product.getById(productId);
        const check = await posController.validateStock(productId, q);
        if (!check.valid) { showNotification(check.error, 'warning'); return; }

        posController.addToCart(product, q, p);
        this.updateCart();
        closeModal();
        showNotification(`${product.name} agregado`, 'success');
        document.getElementById('productSearch').focus();
    },

    updateCart() {
        const summary = posController.getCartSummary();
        document.getElementById('cartSubtotal').textContent = formatCLP(summary.subtotal);
        document.getElementById('cartTotal').textContent = formatCLP(summary.total);

        const dSec = document.getElementById('cartDiscountSection');
        if (summary.discount > 0) {
            document.getElementById('cartDiscountAmount').textContent = '- ' + formatCLP(summary.discount);
            if (dSec) dSec.style.display = 'flex';
        } else if (dSec) dSec.style.display = 'none';

        const cSec = document.getElementById('cartCreditSection');
        if (summary.creditBalanceUsed > 0) {
            document.getElementById('cartCreditAmount').textContent = '- ' + formatCLP(summary.creditBalanceUsed);
            if (cSec) cSec.style.display = 'flex';
        } else if (cSec) cSec.style.display = 'none';

        const container = document.getElementById('heldSalesContainer');
        if (container) {
            container.style.display = posController.heldSales.length > 0 ? 'block' : 'none';
            const badge = container.querySelector('span');
            if (badge) badge.textContent = posController.heldSales.length;
        }

        const cartDiv = document.getElementById('cartItems');
        if (!cartDiv) return;

        if (summary.items.length === 0) {
            cartDiv.innerHTML = `<div style="text-align: center; padding: 3rem; color: #94a3b8;">🛒 Carrito vacío</div>`;
        } else {
            cartDiv.innerHTML = `<div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${summary.items.map((item, index) => {
                const isLoss = item.unitPrice < item.cost;
                return `
                        <div style="background: ${isLoss ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.2)'}; border: 1px solid rgba(255,255,255,0.05); border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; justify-content: space-between;">
                            <div style="flex: 1;">
                                <strong style="font-size: 1.1rem; color: #fff;">${item.name}</strong>
                                ${isLoss ? '<span style="color: #f87171; font-size: 0.7rem; margin-left: 0.5rem;">⚠️ PÉRDIDA</span>' : ''}
                                <div style="display: flex; gap: 1rem; margin-top: 0.5rem; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 0.3rem;">
                                        <span style="font-size: 0.8rem; opacity: 0.7;">Cant:</span>
                                        <input type="number" value="${item.quantity}" step="${item.type === 'weight' ? '0.001' : '1'}" onchange="POSView.updateQuantity(${item.productId}, this.value)" style="width: 60px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; text-align: center;">
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.3rem;">
                                        <span style="font-size: 0.8rem; opacity: 0.7;">Precio:</span>
                                        <input type="number" value="${item.unitPrice}" step="10" onchange="POSView.updatePrice(${item.productId}, this.value)" style="width: 80px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #fff; text-align: center;">
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem;">${formatCLP(item.total)}</div>
                                <button class="btn btn-sm btn-danger" onclick="POSView.removeItem(${item.productId})">🗑️</button>
                            </div>
                        </div>
                    `;
            }).join('')}
            </div>`;
        }
    },

    updateQuantity(id, val) {
        const q = parseFloat(val);
        if (q > 0) {
            posController.updateCartItem(id, q);
            this.updateCart();
        }
    },

    updatePrice(id, val) {
        const p = parseFloat(val);
        if (p >= 0) {
            const item = posController.cart.find(i => i.productId === id);
            posController.updateCartItem(id, item.quantity, p);
            this.updateCart();
        }
    },

    removeItem(id) {
        posController.removeFromCart(id);
        this.updateCart();
    },

    clearCart() {
        if (confirm('¿Limpiar todo el carrito?')) {
            posController.clearCart();
            this.updateCart();
        }
    },

    showDiscountModal() {
        const summary = posController.getCartSummary();
        const content = `
            <div class="form-group">
                <label>Monto Descuento (CLP):</label>
                <input type="number" id="discAmount" class="form-control" value="${summary.discount}" autofocus>
            </div>
        `;
        const footer = `<button class="btn btn-primary" onclick="POSView.applyDiscount(parseFloat(document.getElementById('discAmount').value))">Aplicar</button>`;
        showModal(content, { title: 'Descuento', footer });
    },

    applyDiscount(amount) {
        if (amount >= 0) {
            posController.setDiscount(amount);
            this.updateCart();
            closeModal();
        }
    },

    removeDiscount() {
        posController.clearDiscount();
        this.updateCart();
    },

    async completeSale(method) {
        const summary = posController.getCartSummary();
        if (summary.items.length === 0) return;

        if (method === 'cash') {
            this.showCashPaymentModal(summary.total);
        } else if (method === 'other') {
            this.showTransferPaymentModal(summary.total);
        } else {
            try {
                const sale = await posController.completeSale(method);
                this.updateCart();
                this.showSaleReceipt(sale);
            } catch (e) { showNotification(e.message, 'error'); }
        }
    },

    showCashPaymentModal(total) {
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h1>Total: ${formatCLP(total)}</h1>
                <div class="form-group">
                    <label>Efectivo Recibido:</label>
                    <input type="number" id="cashRec" class="form-control" style="font-size: 2rem; text-align: center;" autofocus>
                </div>
                <h2 id="changeDisp" style="color: var(--success); margin-top: 1rem;">Vuelto: ${formatCLP(0)}</h2>
            </div>
        `;
        const footer = `<button id="btnConfCash" class="btn btn-success btn-lg" disabled onclick="POSView.processCashSale()">Confirmar Pago</button>`;
        showModal(content, { title: 'Pago en Efectivo', footer });

        const input = document.getElementById('cashRec');
        input.addEventListener('input', () => {
            const rec = parseFloat(input.value) || 0;
            const change = rec - total;
            document.getElementById('changeDisp').textContent = `Vuelto: ${formatCLP(Math.max(0, change))}`;
            document.getElementById('btnConfCash').disabled = change < 0;
        });
    },

    async processCashSale() {
        const total = posController.getCartSummary().total;
        const rec = parseFloat(document.getElementById('cashRec').value);
        try {
            const sale = await posController.completeSale('cash');
            this.updateCart();
            closeModal();
            this.showSaleReceipt(sale, false, rec, rec - total);
        } catch (e) { showNotification(e.message, 'error'); }
    },

    showTransferPaymentModal(total) {
        const content = `
            <div class="form-group">
                <label>Nombre Titular:</label>
                <input type="text" id="tName" class="form-control" autofocus>
            </div>
            <div class="form-group">
                <label>Banco:</label>
                <select id="tBank" class="form-control">
                    <option value="BancoEstado">BancoEstado</option>
                    <option value="Santander">Santander</option>
                    <option value="Chile">Banco de Chile</option>
                    <option value="BCI">BCI</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
        `;
        const footer = `<button class="btn btn-primary" onclick="POSView.processTransferSale(${total})">Confirmar</button>`;
        showModal(content, { title: 'Transferencia', footer });
    },

    async processTransferSale(total) {
        const details = {
            other: total,
            transferName: document.getElementById('tName').value,
            transferBank: document.getElementById('tBank').value
        };
        try {
            const sale = await posController.completeSale('other', false, details);
            this.updateCart();
            closeModal();
            this.showSaleReceipt(sale);
        } catch (e) { showNotification(e.message, 'error'); }
    },

    showMixedPaymentModal() {
        const total = posController.getCartSummary().total;
        const content = `
            <div style="text-align: center; margin-bottom: 1rem;"><h1>${formatCLP(total)}</h1></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div><label>Efectivo:</label><input type="number" class="mix-in form-control" id="mCash"></div>
                <div><label>Tarjeta:</label><input type="number" class="mix-in form-control" id="mCard"></div>
                <div><label>QR:</label><input type="number" class="mix-in form-control" id="mQr"></div>
                <div><label>Transf:</label><input type="number" class="mix-in form-control" id="mOther"></div>
            </div>
            <div style="margin-top: 1rem; text-align: center;"><h2 id="mStill">Faltante: ${formatCLP(total)}</h2></div>
        `;
        const footer = `<button id="btnMix" class="btn btn-primary" disabled onclick="POSView.processMixedSale(${total})">Procesar</button>`;
        showModal(content, { title: 'Pago Mixto', footer });

        const ins = document.querySelectorAll('.mix-in');
        const update = () => {
            let sum = 0; ins.forEach(i => sum += parseFloat(i.value) || 0);
            const diff = total - sum;
            document.getElementById('mStill').textContent = diff > 0 ? `Faltante: ${formatCLP(diff)}` : `Cambio: ${formatCLP(Math.abs(diff))}`;
            document.getElementById('btnMix').disabled = diff > 0;
        };
        ins.forEach(i => i.addEventListener('input', update));
    },

    async processMixedSale(total) {
        const details = {
            cash: parseFloat(document.getElementById('mCash').value) || 0,
            card: parseFloat(document.getElementById('mCard').value) || 0,
            qr: parseFloat(document.getElementById('mQr').value) || 0,
            other: parseFloat(document.getElementById('mOther').value) || 0
        };
        try {
            const sale = await posController.completeSale('mixed', false, details);
            this.updateCart();
            closeModal();
            this.showSaleReceipt(sale);
        } catch (e) { showNotification(e.message, 'error'); }
    },

    completeSalePending() {
        const total = posController.getCartSummary().total;
        this.showPendingSaleModal(total);
    },

    async showPendingSaleModal(total) {
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;"><h1>Fiar: ${formatCLP(total)}</h1></div>
            <div class="form-group">
                <label>Abono Inicial (opcional):</label>
                <input type="number" id="pAbono" class="form-control" placeholder="0">
            </div>
            <div class="form-group" id="pMethGroup" style="display:none;">
                <label>Método de Pago Abono:</label>
                <select id="pMeth" class="form-control">
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="qr">QR</option>
                </select>
            </div>
            <div style="text-align: center; margin-top: 1rem;"><h2 style="color:red;">Deuda: <span id="pDebt">${formatCLP(total)}</span></h2></div>
        `;
        const footer = `<button class="btn btn-warning" onclick="POSView.processPendingSale(${total})">Confirmar Deuda</button>`;
        showModal(content, { title: 'Anotar Venta', footer });

        const abonoIn = document.getElementById('pAbono');
        abonoIn.addEventListener('input', () => {
            const val = parseFloat(abonoIn.value) || 0;
            document.getElementById('pDebt').textContent = formatCLP(total - val);
            document.getElementById('pMethGroup').style.display = val > 0 ? 'block' : 'none';
        });
    },

    async processPendingSale(total) {
        if (!posController.currentCustomer) { showNotification('Selecciona un cliente', 'warning'); return; }
        const abono = parseFloat(document.getElementById('pAbono').value) || 0;
        const details = abono > 0 ? { [document.getElementById('pMeth').value]: abono } : null;
        try {
            const sale = await posController.completeSale('pending', true, details);
            this.updateCart();
            closeModal();
            this.showSaleReceipt(sale, true, abono > 0 ? abono : null);
        } catch (e) { showNotification(e.message, 'error'); }
    },

    showSaleReceipt(sale, isPending = false, tendered = null, change = null) {
        const content = `
            <div style="text-align: center; padding: 1rem;">
                <h2>${isPending ? '📝 Venta Anotada' : '✅ Venta Exitosa'}</h2>
                <h1 style="font-size: 3rem;">#${sale.saleNumber}</h1>
                <div style="border-top: 1px dashed #ccc; margin: 1rem 0; padding-top: 1rem;">
                    <div style="display: flex; justify-content: space-between;"><span>Total:</span><strong>${formatCLP(sale.total)}</strong></div>
                    ${tendered ? `<div style="display: flex; justify-content: space-between;"><span>Pagado:</span><strong>${formatCLP(tendered)}</strong></div>` : ''}
                    ${change ? `<div style="display: flex; justify-content: space-between; color: green;"><span>Vuelto:</span><strong>${formatCLP(change)}</strong></div>` : ''}
                </div>
                <p>Cerrando en <span id="timer">5</span>...</p>
            </div>
        `;
        showModal(content, { title: 'Recibo', width: '400px' });

        let sec = 5;
        const intrvl = setInterval(() => {
            sec--;
            if (document.getElementById('timer')) document.getElementById('timer').textContent = sec;
            if (sec <= 0) { clearInterval(intrvl); closeModal(); this.startNewSale(); }
        }, 1000);
    },

    async selectCustomer() {
        const customers = await Customer.getAll();
        const content = `
            <div class="form-group"><input type="text" id="cSearch" class="form-control" placeholder="Buscar cliente..." autofocus></div>
            <div id="cList" style="max-height: 300px; overflow-y: auto; margin-top: 1rem;">
                ${this.renderCustomerList(customers)}
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="POSView.showCreateCustomerForm()">+ Nuevo Cliente</button>
        `;
        showModal(content, { title: 'Clientes', width: '500px' });

        document.getElementById('cSearch').addEventListener('input', async (e) => {
            const filtered = await Customer.search(e.target.value);
            document.getElementById('cList').innerHTML = this.renderCustomerList(filtered);
        });
    },

    renderCustomerList(list) {
        return list.map(c => `
            <div onclick="POSView.setCustomer(${c.id})" style="padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer;">
                <strong>${c.name}</strong><br><small>${c.phone || ''}</small>
            </div>
        `).join('');
    },

    async setCustomer(id) {
        const customer = await Customer.getById(id);
        posController.setCustomer(customer);
        const bal = await Customer.getAccountBalance(id);
        const debt = Math.max(0, bal.displayBalance || 0);

        document.getElementById('customerInfo').innerHTML = `
            <div style="background: rgba(59, 130, 246, 0.2); padding: 1rem; border-radius: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>👤 ${customer.name}</strong>
                    ${debt > 0 ? `<div style="color: #f87171; font-size: 0.8rem;">Deuda: ${formatCLP(debt)}</div>` : ''}
                </div>
                <button class="btn btn-sm" onclick="POSView.removeCustomer()">✕</button>
            </div>
        `;
        this.toggleFiarButton(true);
        closeModal();
    },

    removeCustomer() {
        posController.setCustomer(null);
        document.getElementById('customerInfo').innerHTML = `<button class="btn btn-outline-primary" style="width:100%;" onclick="POSView.selectCustomer()">👤 Seleccionar Cliente</button>`;
        this.toggleFiarButton(false);
    },

    toggleFiarButton(enable) {
        const btn = document.getElementById('fiarButton');
        if (btn) btn.disabled = !enable;
    },

    startNewSale() {
        posController.clearCart();
        this.removeCustomer();
        this.updateCart();
    },

    showCreateCustomerForm() {
        const content = `
            <input type="text" id="nCust" class="form-control" placeholder="Nombre" style="margin-bottom: 0.5rem;">
            <input type="tel" id="pCust" class="form-control" placeholder="Teléfono">
        `;
        const footer = `<button class="btn btn-primary" onclick="POSView.saveNewCustomer()">Crear</button>`;
        showModal(content, { title: 'Nuevo Cliente', footer });
    },

    async saveNewCustomer() {
        const name = document.getElementById('nCust').value;
        if (!name) return;
        const id = await Customer.create({ name, phone: document.getElementById('pCust').value });
        this.setCustomer(id);
    },

    async useCreditBalance() {
        const bal = await Customer.getAccountBalance(posController.currentCustomer.id);
        const cred = Math.max(0, -(bal.displayBalance || 0));
        if (cred > 0) {
            posController.setCreditBalance(cred);
            this.updateCart();
        }
    },

    holdCurrentSale() {
        posController.holdSale();
        this.startNewSale();
    },

    showHeldSales() {
        const content = posController.heldSales.map(s => `
            <div style="padding: 1rem; border: 1px solid #eee; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                <div>Venta ${formatTime(s.timestamp)}</div>
                <button class="btn btn-sm btn-primary" onclick="POSView.resumeHeldSale(${s.id})">Recuperar</button>
            </div>
        `).join('');
        showModal(content || 'No hay ventas en espera', { title: 'Ventas en Espera' });
    },

    resumeHeldSale(id) {
        posController.resumeSale(id);
        this.updateCart();
        closeModal();
    }
};
