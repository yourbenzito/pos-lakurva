const POSView = {
    currentSection: 'pos',
    lastScanTerm: null,
    lastScanAt: 0,
    selectedDocType: 'boleta', // Valor por defecto
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
            <!-- BARRA SUPERIOR ESTRATÉGICA -->
            <!-- BARRA SUPERIOR ESTRATÉGICA -->
            <div class="white-panel" style="display: flex; flex-direction: column; gap: 1rem; position: relative; z-index: 10;">
                
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;">
                    <!-- Bloque 1: Total Gigante -->
                    <div style="display: flex; flex-direction: column; min-width: 220px;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-bottom: 0.2rem;">Total a Pagar</div>
                        <div id="cartTotal" style="font-size: 3.5rem; font-weight: 900; color: var(--primary); line-height: 1;">${formatCLP(0)}</div>
                    </div>

                    <!-- Bloque 2: Cliente -->
                    <div id="customerInfo" style="flex: 1; min-width: 200px;">
                        <button class="btn btn-outline-primary" style="width: 100%; height: 64px; border-radius: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.75rem;" onclick="POSView.selectCustomer()">
                            <span style="font-size: 1.25rem;">👤</span> Seleccionar Cliente
                        </button>
                    </div>

                    <!-- Bloque 3: Documento -->
                    <div style="display: flex; gap: 0.5rem; background: var(--surface); padding: 0.5rem; border-radius: 1.25rem; border: 1px solid var(--border); width: 280px; height: 64px;">
                        <button id="docBoletaBtn" class="btn" style="flex: 1; border-radius: 0.9rem; border: 2px solid ${this.selectedDocType === 'boleta' ? 'var(--primary)' : 'transparent'}; background: ${this.selectedDocType === 'boleta' ? 'var(--surface-content)' : 'transparent'}; color: ${this.selectedDocType === 'boleta' ? 'var(--primary)' : 'var(--text-muted)'}; font-size: 0.9rem; font-weight: 800; transition: all 0.2s;" onclick="POSView.setDocType('boleta')">
                            BOLETA
                        </button>
                        <button id="docInternoBtn" class="btn" style="flex: 1; border-radius: 0.9rem; border: 2px solid ${this.selectedDocType === 'sin_boleta' ? 'var(--warning)' : 'transparent'}; background: ${this.selectedDocType === 'sin_boleta' ? 'var(--surface-content)' : 'transparent'}; color: ${this.selectedDocType === 'sin_boleta' ? 'var(--warning)' : 'var(--text-muted)'}; font-size: 0.9rem; font-weight: 800; transition: all 0.2s;" onclick="POSView.setDocType('sin_boleta')">
                            INTERNO
                        </button>
                    </div>
                </div>

                <!-- Bloque 4: Métodos de Pago -->
                <div style="display: flex; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <button class="btn btn-primary" style="flex: 1; height: 75px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;" onclick="POSView.completeSale('cash')">
                        <span style="font-size: 1.5rem;">💵</span>
                        <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Efectivo</div>
                    </button>
                    
                    <button id="payCardBtn" class="btn btn-primary" style="flex: 1; height: 75px; display: ${this.selectedDocType === 'boleta' ? 'flex' : 'none'}; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; background: #2563eb;" onclick="POSView.completeSale('card')">
                        <span style="font-size: 1.5rem;">💳</span>
                        <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Tarjeta</div>
                    </button>
                    
                    <button id="payQRBtn" class="btn btn-primary" style="flex: 1; height: 75px; display: ${this.selectedDocType === 'boleta' ? 'flex' : 'none'}; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; background: #8b5cf6;" onclick="POSView.completeSale('qr')">
                        <span style="font-size: 1.5rem;">📱</span>
                        <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">QR</div>
                    </button>
                    
                    <button class="btn btn-outline-secondary" style="flex: 1; height: 75px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;" onclick="POSView.completeSale('other')">
                        <span style="font-size: 1.5rem;">🏦</span>
                        <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Transf.</div>
                    </button>
                </div>
            </div>
            
            <div class="pos-layout">
                
                <!-- COLUMNA IZQUIERDA: Búsqueda y Carrito -->
                <div class="pos-left-col">
                    
                    <!-- Buscador -->
                    <div class="white-panel" style="padding: 1.25rem;">
                        <div class="search-box" style="position: relative; display: flex; gap: 0.75rem;">
                            <div style="position: relative; flex: 1;">
                                <span style="position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); font-size: 1.3rem; opacity: 0.4;">🔍</span>
                                <input type="text" 
                                       id="productSearch" 
                                       class="form-control" 
                                       placeholder="Escanear código o buscar nombre..."
                                       autofocus
                                       autocomplete="off"
                                       style="font-size: 1.125rem; padding: 1rem 1rem 1rem 3.5rem;">
                            </div>
                            <button class="btn btn-primary" onclick="POSView.openScanner()" style="width: 60px; height: 56px; border-radius: 0.8rem; font-size: 1.5rem; display: flex; align-items: center; justify-content: center;">
                                📷
                            </button>
                            <div id="searchResults" class="pos-search-results"></div>
                        </div>
                    </div>
                    
                    <!-- Carrito -->
                    <div class="white-panel" style="flex: 1; display: flex; flex-direction: column; min-height: 400px; padding: 1.25rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);">
                            <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 700;">🛒 Carrito de Venta</h3>
                            <button class="btn btn-sm btn-outline-danger" onclick="POSView.clearCart()">Limpiar</button>
                        </div>
                        <div id="cartItems" style="flex: 1; overflow-y: auto;"></div>
                    </div>
                </div>
                
                <!-- COLUMNA DERECHA: Resumen detallado y Acciones Especiales -->
                <div class="pos-right-col">
                    
                    <!-- Resumen Detallado -->
                    <div class="white-panel" style="padding: 1.5rem;">
                        <h4 style="margin: 0 0 1.25rem 0; font-size: 0.875rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">📊 Resumen de Venta</h4>
                        
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 1rem; font-weight: 500;">Subtotal:</span>
                                <strong id="cartSubtotal" style="font-size: 1.25rem; font-weight: 700;">${formatCLP(0)}</strong>
                            </div>
                            
                            <div id="cartDiscountSection" style="display: none; justify-content: space-between; align-items: center; color: var(--warning); padding: 0.75rem; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 0.75rem;">
                                <span style="font-weight: 600;">Descuento:</span>
                                <strong id="cartDiscountAmount">- ${formatCLP(0)}</strong>
                            </div>

                            <div id="cartCreditSection" style="display: none; justify-content: space-between; align-items: center; color: var(--accent); padding: 0.75rem; background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 0.75rem;">
                                <span style="font-weight: 600;">Crédito usado:</span>
                                <strong id="cartCreditAmount">- ${formatCLP(0)}</strong>
                            </div>
                            
                            <div id="fiscalBreakdown" style="padding: 1rem; background: var(--surface); border-radius: 0.75rem; border: 1px solid var(--border); display: none;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                                    <span style="color: var(--text-muted);">IVA (19%):</span>
                                    <span id="fiscalIVA" style="font-weight: 700; color: var(--text);"> $0</span>
                                </div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1.25rem;">
                            <button class="btn btn-outline-warning btn-sm" onclick="POSView.showDiscountModal()">🏷️ Aplicar %</button>
                            <button class="btn btn-outline-info btn-sm" onclick="POSView.toggleFiscal()">📊 Ver IVA</button>
                        </div>
                    </div>

                    <!-- Acciones de Venta Especiales -->
                    <div class="white-panel" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
                        <button class="btn btn-primary" style="height: 4rem; font-size: 1.1rem; font-weight: 800; border-radius: 1rem; width: 100%;" onclick="POSView.showMixedPaymentModal()">
                            🔀 REGISTRAR PAGO MIXTO
                        </button>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <button class="btn btn-outline-warning" id="fiarButton" disabled style="height: 4.5rem; border-radius: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;" onclick="POSView.completeSalePending()">
                                <span style="font-size: 0.7rem; font-weight: 950; letter-spacing: 1px; text-transform: uppercase;">Fiar Venta</span>
                                <span style="font-size: 1.125rem; font-weight: 800;">📓 ANOTAR</span>
                            </button>

                            <button class="btn btn-outline-secondary" style="height: 4.5rem; border-radius: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;" onclick="POSView.holdCurrentSale()">
                                <span style="font-size: 0.7rem; font-weight: 950; text-transform: uppercase;">Posponer</span>
                                <span style="font-size: 1.125rem; font-weight: 800;">⏸️ ESPERA</span>
                            </button>
                        </div>

                        <div id="heldSalesContainer" style="display: ${posController.heldSales.length > 0 ? 'block' : 'none'};">
                            <button class="btn btn-outline-primary" style="width: 100%; height: 3.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 1rem; border-radius: 1rem;" onclick="POSView.showHeldSales()">
                                🔄 RECUPERAR VENTAS
                                <span style="background: var(--danger); color: #fff; border-radius: 20px; padding: 0.15rem 0.6rem; font-size: 0.8rem; font-weight: 900;">${posController.heldSales.length}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Abrir Modal de Escáner Portátil
    async openScanner() {
        const content = `
            <div style="width: 100%; max-width: 500px; margin: 0 auto; overflow: hidden; border-radius: 12px; background: #000;">
                <div id="reader" style="width: 100%;"></div>
            </div>
            <div style="text-align: center; margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">
                Apunta la cámara al código de barras
            </div>
        `;
        const footer = `<button class="btn btn-secondary" onclick="POSView.closeScanner()">Cerrar Cámara</button>`;

        showModal(content, { title: '📸 Escanear con Cámara', footer });

        setTimeout(() => {
            const html5QrCode = new Html5Qrcode("reader");
            this.html5QrCode = html5QrCode;
            const config = { fps: 10, qrbox: { width: 250, height: 150 } };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                async (decodedText) => {
                    // Éxito: vibrar y procesar
                    if (navigator.vibrate) navigator.vibrate(100);
                    await this.handleBarcodeScan(decodedText);
                    this.closeScanner();
                },
                (errorMessage) => {
                    // Solo errores menores durante el escaneo continuado
                }
            ).catch((err) => {
                console.error("Error al iniciar cámara:", err);
                showNotification("No se pudo acceder a la cámara", 'error');
                closeModal();
            });
        }, 300);
    },

    closeScanner() {
        if (this.html5QrCode) {
            this.html5QrCode.stop().then(() => {
                this.html5QrCode = null;
                closeModal();
            }).catch(err => {
                console.warn("Error al detener cámara:", err);
                closeModal();
            });
        } else {
            closeModal();
        }
    },

    setDocType(type) {
        this.selectedDocType = type;
        this.updateCart(); // Para refrescar la UI y el cálculo fiscal
        this.updateDocTypeUI();
    },

    updateDocTypeUI() {
        const docBoletaBtn = document.getElementById('docBoletaBtn');
        const docInternoBtn = document.getElementById('docInternoBtn');

        if (docBoletaBtn && docInternoBtn) {
            if (this.selectedDocType === 'boleta') {
                docBoletaBtn.style.borderColor = '#3b82f6';
                docBoletaBtn.style.background = 'rgba(59, 130, 246, 0.25)';
                docBoletaBtn.style.color = '#60a5fa';
                docBoletaBtn.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.3)';

                docInternoBtn.style.borderColor = 'rgba(255,255,255,0.1)';
                docInternoBtn.style.background = 'rgba(255,255,255,0.03)';
                docInternoBtn.style.color = 'rgba(255,255,255,0.3)';
                docInternoBtn.style.boxShadow = 'none';
            } else {
                docInternoBtn.style.borderColor = '#f59e0b';
                docInternoBtn.style.background = 'rgba(245, 158, 11, 0.25)';
                docInternoBtn.style.color = '#fbbf24';
                docInternoBtn.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.3)';

                docBoletaBtn.style.borderColor = 'rgba(255,255,255,0.1)';
                docBoletaBtn.style.background = 'rgba(255,255,255,0.03)';
                docBoletaBtn.style.color = 'rgba(255,255,255,0.3)';
                docBoletaBtn.style.boxShadow = 'none';
            }
        }

        const payCardBtn = document.getElementById('payCardBtn');
        const payQRBtn = document.getElementById('payQRBtn');
        if (payCardBtn) payCardBtn.style.display = this.selectedDocType === 'boleta' ? 'flex' : 'none';
        if (payQRBtn) payQRBtn.style.display = this.selectedDocType === 'boleta' ? 'flex' : 'none';
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

        const posCloseSearch = (e) => {
            if (searchInput && searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        };
        document.removeEventListener('click', document._posCloseSearch);
        document._posCloseSearch = posCloseSearch;
        document.addEventListener('click', posCloseSearch);

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
                <input type="number" id="productQuantity" class="form-control" step="${isWeight ? '0.001' : '1'}" min="0.001" value="" placeholder="${isWeight ? '0.000' : '1'}" autofocus style="font-size: 1.5rem; text-align: center;">
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
            const rawVal = qInput.value;
            // Si está vacío y no es pesable, asumimos 1 para el cálculo visual
            const q = (rawVal === '' && !isWeight) ? 1 : (parseFloat(rawVal) || 0);
            const p = parseFloat(pInput.value) || 0;
            document.getElementById('calculatedTotal').textContent = formatCLP(isWeight ? roundPrice(q * p) : q * p);
        };
        qInput.addEventListener('input', update);
        pInput.addEventListener('input', update);
        qInput.focus();
    },

    async addProductFromModal(productId) {
        const product = await Product.getById(productId);
        const isWeight = product.type === 'weight';
        const qStr = document.getElementById('productQuantity').value;

        // Si el campo está vacío y es por unidad, el valor por defecto es 1
        let q = parseFloat(qStr);
        if (qStr === '' && !isWeight) {
            q = 1;
        }

        const p = parseFloat(document.getElementById('productPrice').value);

        if (!q || q <= 0) { showNotification('Cantidad inválida', 'warning'); return; }

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

        // Actualizar desglose fiscal (Legal Chile)
        const fiscal = posController.computeFiscalFromTotal(summary.total, this.selectedDocType);
        const fIVA = document.getElementById('fiscalIVA');
        if (fIVA) {
            fIVA.textContent = formatCLP(fiscal.tax_amount);
            // Mostrar/ocultar el desglose según el tipo
            const breakdown = document.getElementById('fiscalBreakdown');
            if (breakdown) {
                breakdown.style.display = (this.selectedDocType === 'boleta' && fiscal.tax_amount > 0) ? 'block' : 'none';
            }
        }

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
            // Target the last span which is the one with the background color (the bubble)
            const badge = container.querySelector('span:last-child');
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
                        <div style="background: ${isLoss ? '#fef2f2' : 'var(--surface)'}; border: 1px solid ${isLoss ? '#fee2e2' : 'var(--border)'}; border-radius: 1rem; padding: 1.25rem; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease;">
                            <div style="flex: 1;">
                                <strong style="font-size: 1.125rem; color: var(--text-main);">${item.name}</strong>
                                ${isLoss ? '<span style="color: var(--danger); font-size: 0.75rem; font-weight: 800; margin-left: 0.75rem;">⚠️ PÉRDIDA</span>' : ''}
                                <div style="display: flex; gap: 1.5rem; margin-top: 0.75rem; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-size: 0.875rem; color: var(--text-muted); font-weight: 600;">CANT:</span>
                                        <input type="number" value="${item.quantity}" step="${item.type === 'weight' ? '0.001' : '1'}" onchange="POSView.updateQuantity(${item.productId}, this.value)" style="width: 70px; background: #fff; border: 1px solid var(--border-strong); border-radius: 0.5rem; padding: 0.25rem; text-align: center; font-weight: 700;">
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-size: 0.875rem; color: var(--text-muted); font-weight: 600;">PRECIO:</span>
                                        <input type="number" value="${item.unitPrice}" step="10" onchange="POSView.updatePrice(${item.productId}, this.value)" style="width: 100px; background: #fff; border: 1px solid var(--border-strong); border-radius: 0.5rem; padding: 0.25rem; text-align: center; font-weight: 700;">
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: right; min-width: 120px;">
                                <div style="font-size: 1.35rem; font-weight: 900; color: var(--text-main); margin-bottom: 0.75rem;">${formatCLP(item.total)}</div>
                                <button class="btn btn-sm btn-outline-danger" style="border-radius: 0.6rem; padding: 0.5rem;" onclick="POSView.removeItem(${item.productId})">🗑️</button>
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
        showConfirm('¿Limpiar todo el carrito?', () => {
            posController.clearCart();
            this.updateCart();
        });
    },

    showDiscountModal() {
        const summary = posController.getCartSummary();
        const content = `
            <div class="form-group">
                <label style="margin-bottom: 1rem; display: block; opacity: 0.8;">Monto Descuento a aplicar (CLP):</label>
                <div style="position: relative;">
                    <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); font-weight: bold; color: var(--primary);">$</span>
                    <input type="number" id="discAmount" class="form-control" 
                           value="" 
                           placeholder="${summary.discount || 0}" 
                           style="padding-left: 2rem; font-size: 1.5rem; height: 60px; font-weight: bold;"
                           autofocus>
                </div>
                <p style="margin-top: 1rem; font-size: 0.85rem; opacity: 0.6;">
                    💡 Deja vacío para mantener el descuento actual (${formatCLP(summary.discount)}). 
                    Ingresa 0 para eliminar el descuento.
                </p>
            </div>
        `;
        const footer = `
            <div style="display: flex; gap: 0.75rem; width: 100%;">
                <button class="btn btn-secondary" style="flex: 1;" onclick="POSView.removeDiscount(); closeModal();">🗑 Borrar Todo</button>
                <button class="btn btn-primary" style="flex: 2; height: 3.5rem; font-weight: 700;" onclick="const val = document.getElementById('discAmount').value; if(val !== '') POSView.applyDiscount(parseFloat(val)); else closeModal();">✔ Aplicar Descuento</button>
            </div>
        `;
        showModal(content, { title: '🏷 Descuento a la Venta', footer });
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
            this.setDocType('sin_boleta'); // Sugerir interno para transferencias
            this.showTransferPaymentModal(summary.total);
        } else {
            try {
                const sale = await posController.completeSale(method, false, null, this.selectedDocType);
                this.updateCart();
                this.showSaleReceipt(sale);
            } catch (e) { showNotification(e.message, 'error'); }
        }
    },

    showCashPaymentModal(total) {
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div class="form-group">
                    <label style="font-size: 1.1rem; margin-bottom: 0.5rem; display: block; opacity: 0.8;">Monto a Cobrar: <strong style="color: var(--primary);">${formatCLP(total)}</strong></label>
                    <label style="font-size: 0.9rem; opacity: 0.6; margin-bottom: 0.2rem; display: block;">Efectivo Recibido:</label>
                    <input type="number" id="cashRec" class="form-control" 
                           style="font-size: 2.5rem; text-align: center; height: auto; padding: 0.5rem; background: rgba(0,0,0,0.3); border: 2px solid var(--primary);" 
                           placeholder="0" autofocus onfocus="this.select()">
                </div>
                <div id="paymentStatus" style="margin-top: 1.5rem; padding: 1rem; border-radius: 0.75rem; background: rgba(255,255,255,0.03);">
                    <h2 id="changeDisp" style="color: #ef4444; margin: 0; font-size: 1.8rem; font-weight: 800;">Faltan: ${formatCLP(total)}</h2>
                </div>
            </div>
        `;
        const footer = `<button id="btnConfCash" class="btn btn-success btn-lg" style="width: 100%; height: 3.5rem; font-size: 1.2rem; font-weight: 800;" disabled onclick="POSView.processCashSale()">✔ Confirmar Venta</button>`;
        showModal(content, { title: '💰 Pago en Efectivo', footer });

        const input = document.getElementById('cashRec');
        const changeDisp = document.getElementById('changeDisp');
        const btn = document.getElementById('btnConfCash');

        const updateStatus = () => {
            const rec = parseFloat(input.value) || 0;
            const diff = rec - total;

            if (diff >= 0) {
                changeDisp.style.color = '#4ade80'; // Verde success
                changeDisp.textContent = `Vuelto: ${formatCLP(diff)}`;
                btn.disabled = false;
                btn.style.opacity = '1';
            } else {
                changeDisp.style.color = '#ef4444'; // Rojo error
                changeDisp.textContent = `Faltan: ${formatCLP(Math.abs(diff))}`;
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }
        };

        input.addEventListener('input', updateStatus);

        // Forzar foco y selección tras abrir el modal
        setTimeout(() => {
            input.focus();
            input.select();
        }, 150);
    },

    async processCashSale() {
        const summary = posController.getCartSummary();
        const rec = parseFloat(document.getElementById('cashRec').value);
        try {
            const sale = await posController.completeSale('cash', false, null, this.selectedDocType);
            this.updateCart();
            closeModal();
            this.showSaleReceipt(sale, false, rec, rec - summary.total);
        } catch (e) { showNotification(e.message, 'error'); }
    },

    showTransferPaymentModal(total) {
        const content = `
            <div class="form-group">
                <label>Nombre Titular:</label>
                <input type="text" id="tName" class="form-control" placeholder="Ej: Juan Pérez" autofocus>
            </div>
            <div class="form-group">
                <label>Banco:</label>
                <select id="tBank" class="form-control">
                    <option value="BancoEstado">BancoEstado</option>
                    <option value="Santander">Santander</option>
                    <option value="Chile">Banco de Chile</option>
                    <option value="BCI">BCI</option>
                    <option value="Itaú">Itaú</option>
                    <option value="Scotiabank">Scotiabank</option>
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
            const sale = await posController.completeSale('other', false, details, this.selectedDocType);
            this.updateCart();
            closeModal();
            this.showSaleReceipt(sale);
        } catch (e) { showNotification(e.message, 'error'); }
    },

    showMixedPaymentModal() {
        const total = posController.getCartSummary().total;
        const content = `
            <div style="text-align: center; margin-bottom: 2rem; background: rgba(59, 130, 246, 0.1); padding: 1rem; border-radius: 1rem; border: 1px solid rgba(59, 130, 246, 0.3);">
                <div style="font-size: 0.9rem; opacity: 0.7; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 1px;">Monto de Venta</div>
                <h1 style="margin: 0; color: #fff; font-size: 2.5rem; font-weight: 900;">${formatCLP(total)}</h1>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                <div class="form-group">
                    <label style="color: #6ee7b7; font-weight: 700; margin-bottom: 0.5rem; display: block;">💵 Efectivo:</label>
                    <input type="number" class="mix-in form-control" id="mCash" style="font-size: 1.25rem; height: 50px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem;" placeholder="0">
                </div>
                <div class="form-group">
                    <label style="color: #93c5fd; font-weight: 700; margin-bottom: 0.5rem; display: block;">💳 Tarjeta (IVA):</label>
                    <input type="number" class="mix-in form-control" id="mCard" style="font-size: 1.25rem; height: 50px; background: rgba(59, 130, 246, 0.05); border: 2px solid rgba(59, 130, 246, 0.2); border-radius: 0.75rem; color: #fff;" placeholder="0">
                </div>
                <div class="form-group">
                    <label style="color: #d8b4fe; font-weight: 700; margin-bottom: 0.5rem; display: block;">📱 QR (IVA):</label>
                    <input type="number" class="mix-in form-control" id="mQr" style="font-size: 1.25rem; height: 50px; background: rgba(168, 85, 247, 0.05); border: 2px solid rgba(168, 85, 247, 0.2); border-radius: 0.75rem; color: #fff;" placeholder="0">
                </div>
                <div class="form-group">
                    <label style="color: #94a3b8; font-weight: 700; margin-bottom: 0.5rem; display: block;">🏦 Transferencia:</label>
                    <input type="number" class="mix-in form-control" id="mOther" style="font-size: 1.25rem; height: 50px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem;" placeholder="0">
                </div>
            </div>

            <div id="mixWarning" style="display: none; margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 0.75rem; color: #93c5fd; font-size: 0.9rem; text-align: center;">
                ⚡ <strong>Venta forzada a BOLETA:</strong> El uso de medios electrónicos (Tarjeta/QR) requiere emisión de boleta legal.
            </div>

            <div style="margin-top: 2rem; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem;">
                <h2 id="mStill" style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #ef4444;">Faltante: ${formatCLP(total)}</h2>
            </div>
        `;
        const footer = `<button id="btnMix" class="btn btn-success btn-lg" style="width: 100%; height: 3.5rem; font-size: 1.2rem; font-weight: 900;" disabled onclick="POSView.processMixedSale(${total})">✔ Procesar Pago</button>`;
        showModal(content, { title: '🔀 Pago Mixto / Combinado', footer, width: '600px' });

        const ins = document.querySelectorAll('.mix-in');
        const update = () => {
            let sum = 0;
            let hasElectronic = false;
            ins.forEach(i => {
                const val = parseFloat(i.value) || 0;
                sum += val;
                if ((i.id === 'mCard' || i.id === 'mQr') && val > 0) hasElectronic = true;
            });

            const diff = total - sum;
            const h2 = document.getElementById('mStill');
            const warn = document.getElementById('mixWarning');

            if (diff > 0) {
                h2.textContent = `Faltante: ${formatCLP(diff)}`;
                h2.style.color = '#ef4444';
            } else {
                h2.textContent = diff < 0 ? `Cambio: ${formatCLP(Math.abs(diff))}` : `¡Monto exacto!`;
                h2.style.color = '#4ade80';
            }

            if (warn) warn.style.display = hasElectronic ? 'block' : 'none';
            document.getElementById('btnMix').disabled = diff > 0.99; // Allow 1 peso diff for decimals
        };
        ins.forEach(i => i.addEventListener('input', update));
    },

    async processMixedSale(total) {
        const cash = parseFloat(document.getElementById('mCash').value) || 0;
        const card = parseFloat(document.getElementById('mCard').value) || 0;
        const qr = parseFloat(document.getElementById('mQr').value) || 0;
        const other = parseFloat(document.getElementById('mOther').value) || 0;

        const details = { cash, card, qr, other };

        // REGRE PUESTO D: Si hay Tarjeta o QR, forzar Boleta legal
        let finalDocType = this.selectedDocType;
        if (card > 0 || qr > 0) {
            finalDocType = 'boleta';
        }

        try {
            const sale = await posController.completeSale('mixed', false, details, finalDocType);
            this.updateCart();
            closeModal();
            this.showSaleReceipt(sale);
        } catch (e) { showNotification(e.message, 'error'); }
    },

    completeSalePending() {
        if (!posController.currentCustomer) {
            showNotification('SELECCIONAR CLIENTE', 'warning');
            return;
        }

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
        const methSel = document.getElementById('pMeth');

        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.processPendingSale(total);
            }
        };

        abonoIn.addEventListener('input', () => {
            const val = parseFloat(abonoIn.value) || 0;
            document.getElementById('pDebt').textContent = formatCLP(total - val);
            document.getElementById('pMethGroup').style.display = val > 0 ? 'block' : 'none';
        });

        abonoIn.addEventListener('keydown', handleEnter);
        methSel.addEventListener('keydown', handleEnter);
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
        const fiscal = posController.computeFiscalFromTotal(sale.total);
        const content = `
            <div style="text-align: center; padding: 2rem; color: #f8fafc; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)); border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); overflow: hidden; position: relative;">
                
                <!-- Decoración -->
                <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent); border-radius: 50%;"></div>

                <div style="margin-bottom: 2rem;">
                    <h2 style="margin: 0; color: #60a5fa; letter-spacing: 2px; font-weight: 800; text-transform: uppercase; font-size: 1.2rem;">Comprobante de Venta</h2>
                    <div style="display: inline-block; padding: 0.25rem 1rem; background: rgba(59, 130, 246, 0.2); border-radius: 2rem; margin-top: 0.5rem;">
                        <span style="font-size: 0.85rem; color: #93c5fd; font-weight: 600;">Folio #${sale.saleNumber}</span>
                    </div>
                    <p style="margin: 0.75rem 0 0 0; font-size: 0.85rem; opacity: 0.6;">${formatDateTime(sale.date)}</p>
                </div>
                
                <div style="background: rgba(0,0,0,0.2); border-radius: 1rem; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
                        <span style="font-size: 1rem; opacity: 0.7;">Total a Pagar:</span>
                        <span style="font-size: 2.2rem; font-weight: 900; color: #4ade80; text-shadow: 0 0 20px rgba(74, 222, 128, 0.3);">${formatCLP(sale.total)}</span>
                    </div>

                    <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 1rem 0;"></div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; font-size: 1.1rem;">
                            <span style="opacity: 0.7;">IVA (19%):</span>
                            <span style="font-weight: 500;">${formatCLP(fiscal.tax_amount)}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 0.75rem; padding: 1rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span style="opacity: 0.6;">Método de Pago:</span>
                        <strong style="color: #60a5fa;">${this.getPaymentMethodName(sale.paymentMethod)}</strong>
                    </div>
                    ${tendered ? `
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span style="opacity: 0.6;">Efectivo Recibido:</span>
                        <strong style="color: #4ade80;">${formatCLP(tendered)}</strong>
                    </div>` : ''}
                    ${change ? `
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span style="opacity: 0.6;">Vuelto:</span>
                        <strong style="color: #fb7185;">${formatCLP(change)}</strong>
                    </div>` : ''}
                </div>
                
                <div style="margin-top: 2rem;">
                    <div style="font-size: 1rem; color: #4ade80;">✨ ¡Gracias por su compra!</div>
                    <div style="margin-top: 1rem; font-size: 0.75rem; opacity: 0.4;">
                        Cerrando automáticamente en <span id="timer" style="font-weight: bold; color: #60a5fa;">5</span> segundos...
                    </div>
                </div>

                <div style="margin-top: 1.5rem;">
                    <button class="btn btn-sm" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.1); width: 100%;" onclick="window.print()">🖨️ Imprimir Copia</button>
                </div>
            </div>
        `;
        showModal(content, { title: 'Recibo de Venta', width: '400px' });

        let sec = 5;
        const intrvl = setInterval(() => {
            sec--;
            if (document.getElementById('timer')) document.getElementById('timer').textContent = sec;
            if (sec <= 0) { clearInterval(intrvl); closeModal(); this.startNewSale(); }
        }, 1000);
    },

    async selectCustomer() {
        showNotification('Cargando clientes y saldos...', 'info');
        const customers = await Customer.getAll();
        const pendingSales = await Sale.getPendingSales();

        // Calcular deudas con 1 sola llamada
        const debtMap = {};
        pendingSales.forEach(sale => {
            if (sale.customerId) {
                const debt = (parseFloat(sale.total) || 0) - (parseFloat(sale.paidAmount) || 0);
                if (debt > 0) {
                    debtMap[sale.customerId] = (debtMap[sale.customerId] || 0) + debt;
                }
            }
        });
        
        const listWithBalances = customers.map(c => {
            // Subtract credit if any
            const debt = debtMap[c.id] || 0;
            const credit = (c.balanceCredit != null) ? parseFloat(c.balanceCredit) || 0 : 0;
            const displayBalance = debt - credit;
            return { ...c, displayBalance };
        });

        // Ordenar: Primero los que más deben
        listWithBalances.sort((a, b) => (b.displayBalance || 0) - (a.displayBalance || 0));

        // Calcular Ranking por Volumen (Top 3) solo de ultimos 60 dias
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const allSales = await Sale.getByDateRange(sixtyDaysAgo.toISOString(), new Date().toISOString());
        
        const volumeMap = {};
        allSales.forEach(s => {
            if (s.customerId && s.status !== 'cancelled') {
                volumeMap[s.customerId] = (volumeMap[s.customerId] || 0) + (parseFloat(s.total) || 0);
            }
        });

        const topIds = Object.entries(volumeMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([id]) => parseInt(id));

        const content = `
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <div style="position: relative;">
                    <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5;">🔍</span>
                    <input type="text" id="cSearch" class="form-control" placeholder="Buscar cliente por nombre o teléfono..." style="padding-left: 2.5rem; height: 50px; font-size: 1.1rem; border-radius: 0.75rem; background: rgba(0,0,0,0.2);" autofocus>
                </div>
            </div>
            <div id="cList" style="max-height: 450px; overflow-y: auto; border-radius: 0.75rem; background: rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.05);">
                ${this.renderCustomerList(listWithBalances, topIds)}
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 1.5rem; height: 50px; font-weight: 700; font-size: 1rem; border-radius: 0.75rem; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);" onclick="POSView.showCreateCustomerForm()">
                ➕ Registrar Nuevo Cliente
            </button>
        `;
        showModal(content, { title: '👥 Selección de Clientes', width: '600px' });

        document.getElementById('cSearch').addEventListener('input', async (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = listWithBalances.filter(c =>
                c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))
            );
            document.getElementById('cList').innerHTML = this.renderCustomerList(filtered, topIds);
        });
    },

    renderCustomerList(list, topIds = []) {
        if (list.length === 0) return '<div style="padding: 2rem; text-align: center; opacity: 0.5;">No se encontraron clientes</div>';

        return list.map(c => {
            const balance = c.displayBalance || 0;
            const hasDebt = balance > 0;
            const hasCredit = balance < 0;
            const rankIndex = topIds.indexOf(c.id);
            const medal = rankIndex !== -1 ? ['🥇', '🥈', '🥉'][rankIndex] : null;

            return `
                <div onclick="POSView.setCustomer(${c.id})" 
                     style="padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;" 
                     onmouseover="this.style.background='rgba(59, 130, 246, 0.1)'" 
                     onmouseout="this.style.background='transparent'">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        ${medal ? `<span style="font-size: 1.5rem;" title="Top Cliente">${medal}</span>` : ''}
                        <div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: #fff;">${c.name}</div>
                            <div style="font-size: 0.85rem; opacity: 0.6; margin-top: 0.2rem;">📱 ${c.phone || 'Sin teléfono'}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        ${hasDebt ?
                    `<div style="color: #fca5a5; font-weight: 800; font-size: 1.1rem;">Debe: ${formatCLP(balance)}</div>` :
                    hasCredit ?
                        `<div style="color: #6ee7b7; font-weight: 800; font-size: 1.1rem;">A favor: ${formatCLP(Math.abs(balance))}</div>` :
                        `<div style="color: #94a3b8; font-weight: 500; font-size: 0.9rem;">Sin deuda</div>`
                }
                    </div>
                </div>
            `;
        }).join('');
    },

    async setCustomer(id) {
        const customer = await Customer.getById(id);
        posController.setCustomer(customer);
        const bal = await Customer.getAccountBalance(id);
        const debt = bal.displayBalance || 0;

        document.getElementById('customerInfo').innerHTML = `
            <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); padding: 1.25rem; border-radius: 0.75rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <span style="font-size: 1.2rem;">👤</span>
                        <strong style="color: #fff; font-size: 1.1rem;">${customer.name}</strong>
                    </div>
                    ${debt > 0 ?
                `<div style="color: #fca5a5; font-size: 0.95rem; font-weight: 700;">⚠️ DEUDA ACTUAL: ${formatCLP(debt)}</div>` :
                debt < 0 ?
                    `<div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="color: #6ee7b7; font-size: 0.95rem; font-weight: 700;">💰 SALDO A FAVOR: ${formatCLP(Math.abs(debt))}</div>
                        <button class="btn btn-sm btn-success" onclick="POSView.useCreditBalance()" style="padding: 0.2rem 0.75rem; font-weight: 800; border-radius: 0.5rem;">USAR SALDO</button>
                    </div>` :
                    `<div style="color: #94a3b8; font-size: 0.85rem;">✅ Al día / Sin deuda</div>`
            }
                </div>
                <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: #f87171; border-radius: 50%; min-width: 32px; height: 32px; padding: 0;" onclick="POSView.removeCustomer()" title="Quitar cliente">✕</button>
            </div>
        `;
        this.toggleFiarButton(true);
        closeModal();
    },

    removeCustomer() {
        posController.setCustomer(null);
        document.getElementById('customerInfo').innerHTML = `
            <button class="btn" style="width: 100%; padding: 0.85rem; border-radius: 0.75rem; border: 2px solid #3b82f6; background: rgba(59, 130, 246, 0.1); color: #fff; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);" onclick="POSView.selectCustomer()">
                <span style="font-size: 1.2rem;">👤</span> Seleccionar Cliente
            </button>
        `;
        this.toggleFiarButton(false);
    },

    toggleFiarButton(enable) {
        const btn = document.getElementById('fiarButton');
        if (btn) {
            // Ya no lo deshabilitamos para poder mostrar el mensaje de "Seleccionar Cliente" al hacer clic
            btn.disabled = false;

            if (enable) {
                btn.style.background = 'rgba(245, 158, 11, 0.25)';
                btn.style.borderColor = '#fbbf24';
                btn.style.color = '#fff';
                btn.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.3)';
                btn.style.opacity = '1';
                btn.style.transform = 'scale(1.02)';
            } else {
                btn.style.background = 'rgba(245, 158, 11, 0.05)';
                btn.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                btn.style.color = 'rgba(251, 191, 36, 1)'; // Más visible para que se note que se puede clickear
                btn.style.boxShadow = 'none';
                btn.style.opacity = '0.7';
                btn.style.transform = 'scale(1)';
            }
        }
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
        if (posController.cart.length === 0) {
            showNotification('El carrito está vacío', 'warning');
            return;
        }

        const content = `
            <div class="form-group">
                <label>Identificador de la Venta:</label>
                <input type="text" id="heldSaleName" class="form-control" placeholder="Ej: Mesa 5, Juan Perez, Pedido llevar..." value="" autofocus>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-warning" onclick="POSView.processHoldSale(document.getElementById('heldSaleName').value)">⏸️ Poner en Espera</button>
        `;

        showModal(content, { title: 'Pausar Venta', footer, width: '400px' });

        setTimeout(() => document.getElementById('heldSaleName').focus(), 100);
    },

    processHoldSale(name) {
        try {
            // Si el nombre viene vacío, generamos el automático (Cliente X + Hora)
            let finalName = name.trim();
            if (!finalName) {
                let customerBaseName = 'Cliente';
                if (posController.selectedCustomer) {
                    customerBaseName = posController.selectedCustomer.nombre;
                }

                // Contar cuántas ventas ya existen en heldSales con ese nombre base para asignar el siguiente número
                // Solo si es un cliente genérico "Cliente", buscamos el número correlativo
                if (!posController.selectedCustomer) {
                    const clientPattern = /^Cliente (\d+)/;
                    let maxNum = 0;

                    posController.heldSales.forEach(sale => {
                        const match = sale.name.match(clientPattern);
                        if (match) {
                            const num = parseInt(match[1]);
                            if (num > maxNum) maxNum = num;
                        }
                    });

                    customerBaseName = `Cliente ${maxNum + 1}`;
                }

                const currentTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                finalName = `${customerBaseName} ${currentTime}`;
            }

            posController.holdSale(finalName);
            closeModal();
            this.startNewSale();
            showNotification(`Venta "${finalName}" puesta en espera`, 'info');
        } catch (e) {
            showNotification(e.message, 'error');
        }
    },

    showHeldSales() {
        if (posController.heldSales.length === 0) {
            showNotification('No hay ventas en espera', 'info');
            return;
        }

        const content = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${posController.heldSales.map(s => {
            const total = s.cart.reduce((sum, item) => sum + item.total, 0);
            const itemsCount = s.cart.length;
            return `
                        <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 0.75rem; padding: 1rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;" onmouseover="this.style.background='rgba(51, 65, 85, 0.4)'" onmouseout="this.style.background='rgba(30, 41, 59, 0.4)'">
                            <div style="flex: 1;">
                                <div style="font-size: 1.1rem; font-weight: bold; color: #fff; margin-bottom: 0.25rem;">${s.name}</div>
                                <div style="font-size: 0.85rem; color: #94a3b8; display: flex; gap: 1rem;">
                                    <span>🕒 ${formatTime(s.timestamp)}</span>
                                    <span>📦 ${itemsCount} items</span>
                                    <span style="color: #6ee7b7; font-weight: bold;">${formatCLP(total)}</span>
                                </div>
                                ${s.customer ? `<div style="font-size: 0.8rem; color: #60a5fa; margin-top: 0.25rem;">👤 Cliente: ${s.customer.name}</div>` : ''}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-sm btn-danger" onclick="POSView.deleteHeldSale(${s.id})" title="Eliminar definitivamente">🗑️</button>
                                <button class="btn btn-sm btn-primary" onclick="POSView.resumeHeldSale(${s.id})" style="padding: 0.5rem 1rem;">Recuperar</button>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
        showModal(content, { title: 'Ventas en Espera', width: '600px' });
    },

    deleteHeldSale(id) {
        showConfirm('¿Estás seguro de eliminar esta venta en espera?', () => {
            posController.deleteHeldSale(id);
            this.updateCart(); // Para actualizar el badge
            this.showHeldSales(); // Refrescar modal
        });
    },

    resumeHeldSale(id) {
        posController.resumeSale(id);
        this.updateCart();
        closeModal();
        // Restore customer UI if the held sale had a customer
        if (posController.currentCustomer) {
            this.setCustomer(posController.currentCustomer.id);
        } else {
            this.removeCustomer();
        }
    },

    toggleFiscal() {
        const panel = document.getElementById('fiscalBreakdown');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    },

    getPaymentMethodName(method) {
        const names = {
            'cash': 'Efectivo',
            'card': 'Tarjeta',
            'qr': 'QR',
            'pending': 'Pendiente (Fiar)',
            'mixed': 'Pago Mixto',
            'other': 'Transferencia'
        };
        return names[method] || method;
    },

    destroy() {
        console.log('POSView destroyed');
    }
};
