const ProductsView = {
    selectedCategory: null,
    stockFilter: 'all',
    productSuppliers: {},

    formatExpiry(expiryDate) {
        if (!expiryDate || String(expiryDate).trim() === '') return '-';
        const d = new Date(String(expiryDate).slice(0, 10));
        if (isNaN(d.getTime())) return '-';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(d);
        exp.setHours(0, 0, 0, 0);
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        const label = exp.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (days < 0) return `<span class="badge badge-danger" title="Vencido">Vencido ${label}</span>`;
        if (days <= 7) return `<span class="badge badge-warning" title="Próximo a vencer">${label}</span>`;
        return label;
    },

    async render() {
        const products = await Product.getAll();
        // Carga diferida de proveedores para no bloquear el renderizado inicial
        if (Object.keys(this.productSuppliers).length === 0) {
            this.getLastSuppliers().then(suppliers => {
                this.productSuppliers = suppliers;
                // Si el usuario sigue en la vista de productos, refrescamos solo las tarjetas
                if (app.currentView === 'products') {
                    this.updateSupplierLabels();
                }
            });
        }

        let contentHtml = '';
        if (this.selectedCategory) {
            let filteredProducts = products.filter(p => (p.category || 'General') === this.selectedCategory);
            if (this.stockFilter === 'low') {
                filteredProducts = filteredProducts.filter(p => p.stock > 0 && p.stock <= p.minStock);
            } else if (this.stockFilter === 'out') {
                filteredProducts = filteredProducts.filter(p => p.stock <= 0);
            }
            contentHtml = this.renderProductsTable(filteredProducts);
        } else {
            contentHtml = this.renderCategoriesGrid(products);
        }

        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1>Productos</h1>
                        <p>Gestiona tu catálogo de productos por categorías</p>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        ${PermissionService.can('products.delete') ? `
                        <button class="btn btn-warning" onclick="ProductsView.showDeletedProducts()" title="Ver productos desactivados">
                            📋 Desactivados
                        </button>
                        <button class="btn btn-danger" onclick="ProductsView.deleteSelected()" id="btnDeleteSelected" style="display: none;">
                            🚫 Desactivar Seleccionados
                        </button>` : ''}
                        ${PermissionService.can('products.export') ? `
                        <button class="btn btn-secondary" onclick="ProductsView.exportToExcel()">
                            📥 Exportar Excel
                        </button>` : ''}
                        ${PermissionService.can('products.import') ? `
                        <button class="btn btn-secondary" onclick="ProductsView.showImportModal()">
                            📤 Importar Excel
                        </button>` : ''}
                        ${PermissionService.can('products.create') ? `
                        <button class="btn btn-primary" onclick="ProductsView.showProductForm()">
                            ➕ Nuevo Producto
                        </button>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="card" style="background: #ffffff; border: 1.5px solid #e5e7eb;">
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
                    <div class="form-group pos-section" style="flex: 1; margin-bottom: 0;">
                        <input type="text" id="searchProducts" class="form-control" placeholder="Buscar productos...">
                    </div>
                    <div id="productsReturnBtnContainer">
                        ${this.renderReturnButton()}
                    </div>
                </div>
                <div id="productsAlertContainer">${this.renderCategoryAlert()}</div>
                <div id="productsTable">${contentHtml}</div>
            </div>
        `;
    },

    renderReturnButton() {
        if (!this.selectedCategory) return '';
        return `<button class="btn btn-primary" onclick="ProductsView.clearCategoryFilter()">⬅ Volver a Categorías</button>`;
    },

    renderCategoryAlert() {
        if (!this.selectedCategory) return '';
        return `
            <div class="pos-alert" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div><strong>Categoría:</strong> ${this.selectedCategory}</div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn ${this.stockFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="ProductsView.setStockFilter('all')">Todos</button>
                    <button class="btn ${this.stockFilter === 'low' ? 'btn-warning' : 'btn-secondary'} btn-sm" onclick="ProductsView.setStockFilter('low')">Bajo Stock</button>
                    <button class="btn ${this.stockFilter === 'out' ? 'btn-danger' : 'btn-secondary'} btn-sm" onclick="ProductsView.setStockFilter('out')">Sin Stock</button>
                </div>
            </div>
        `;
    },

    async init() {
        const searchInput = document.getElementById('searchProducts');
        let searchTimeout;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.applyFilters(e.target.value.trim()), 300);
            });
        }
    },

    async applyFilters(searchTerm = '') {
        let products = await Product.getAll();

        // C9: Sorting logic — default to stock desc if category selected
        if (this.selectedCategory) {
            products.sort((a, b) => (parseFloat(b.stock) || 0) - (parseFloat(a.stock) || 0));
        }

        if (searchTerm.length > 0) {
            products = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.barcode || '').includes(searchTerm)
            );
            const alertContainer = document.getElementById('productsAlertContainer');
            if (alertContainer) alertContainer.innerHTML = '';
            const btnContainer = document.getElementById('productsReturnBtnContainer');
            if (btnContainer) btnContainer.innerHTML = '';
        } else {
            const alertContainer = document.getElementById('productsAlertContainer');
            if (alertContainer) alertContainer.innerHTML = this.renderCategoryAlert();
            const btnContainer = document.getElementById('productsReturnBtnContainer');
            if (btnContainer) btnContainer.innerHTML = this.renderReturnButton();
        }

        if (this.selectedCategory && searchTerm.length === 0) {
            products = products.filter(p => (p.category || 'General') === this.selectedCategory);
        }

        if (this.stockFilter === 'low') {
            products = products.filter(p => (parseFloat(p.stock) || 0) > 0 && (parseFloat(p.stock) || 0) <= (parseFloat(p.minStock) || 0));
        } else if (this.stockFilter === 'out') {
            products = products.filter(p => (parseFloat(p.stock) || 0) <= 0);
        }
        document.getElementById('productsTable').innerHTML = this.renderProductsTable(products);
    },

    renderCategoriesGrid(products) {
        const stats = {};
        products.forEach(p => {
            const cat = p.category || 'General';
            if (!stats[cat]) stats[cat] = { total: 0, low: 0, out: 0 };
            stats[cat].total++;
            if ((parseFloat(p.stock) || 0) <= 0) stats[cat].out++;
            else if ((parseFloat(p.stock) || 0) <= (parseFloat(p.minStock) || 0)) stats[cat].low++;
        });

        const categories = Object.keys(stats).length > 0 ? Object.keys(stats).sort() : ['General'];

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem; padding: 1rem 0;">
                ${categories.map(cat => {
            const s = stats[cat] || { total: 0, low: 0, out: 0 };
            return `
                    <div
                         style="padding: 0; border-radius: 1.25rem; background: #ffffff; border: 1.5px solid #e5e7eb; text-align: center; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.25s ease, box-shadow 0.25s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.05);"
                         onmouseover="this.style.transform='translateY(-6px)'; this.style.boxShadow='0 12px 28px rgba(0,0,0,0.1)'; this.style.borderColor='#9ca3af';" 
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'; this.style.borderColor='#e5e7eb';">
                        
                        <div style="padding: 1.5rem; cursor: pointer; flex: 1;" onclick="ProductsView.filterByCategory('${cat}')">
                            <div style="font-size: 2.75rem; margin-bottom: 0.5rem;">
                                ${this.getCategoryIcon(cat)}
                            </div>
                            <h3 style="margin: 0.25rem 0; font-size: 1.1rem; font-weight: 800; color: #111827; letter-spacing: 0.5px; text-transform: uppercase;">${cat}</h3>
                            <p style="color: #6366f1; font-weight: 700; font-size: 0.9rem; margin-bottom: 0;">${s.total} PRODUCTOS</p>
                        </div>
                        
                        <div style="display: flex; height: 60px; border-top: 1.5px solid #f3f4f6;">
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${s.out > 0 ? '#fef2f2' : '#f9fafb'}; cursor: ${s.out > 0 ? 'pointer' : 'default'}; border-right: 1px solid #f3f4f6; transition: background 0.2s;" 
                                 ${s.out > 0 ? `onclick="ProductsView.filterByCategoryWithStock('${cat}', 'out')" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'"` : ''}>
                                <div style="font-size: 1rem; color: ${s.out > 0 ? '#dc2626' : '#9ca3af'}; font-weight: 800;">${s.out}</div>
                                <div style="font-size: 0.6rem; color: ${s.out > 0 ? '#ef4444' : '#9ca3af'}; font-weight: 700; text-transform: uppercase;">SIN STOCK</div>
                            </div>
                            
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${s.low > 0 ? '#fffbeb' : '#f9fafb'}; cursor: ${s.low > 0 ? 'pointer' : 'default'}; transition: background 0.2s;" 
                                 ${s.low > 0 ? `onclick="ProductsView.filterByCategoryWithStock('${cat}', 'low')" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fffbeb'"` : ''}>
                                <div style="font-size: 1rem; color: ${s.low > 0 ? '#d97706' : '#9ca3af'}; font-weight: 800;">${s.low}</div>
                                <div style="font-size: 0.6rem; color: ${s.low > 0 ? '#f59e0b' : '#9ca3af'}; font-weight: 700; text-transform: uppercase;">BAJO STOCK</div>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    },

    getCategoryIcon(categoryName) {
        const name = (categoryName || '').toLowerCase();
        // Categorías sugeridas por el sistema
        if (name.includes('fresco') || name.includes('fruta') || name.includes('verdura')) return '🥦';
        if (name.includes('bebestible') || name.includes('bebida') || name.includes('jugo') || name.includes('liquido')) return '🥤';
        if (name.includes('snack') || name.includes('dulce') || name.includes('golosina') || name.includes('papas')) return '🍫';
        if (name.includes('aseo') || name.includes('limpieza')) return '🧼';
        if (name.includes('abarrote') || name.includes('pasta') || name.includes('arroz') || name.includes('aceite')) return '🍞';
        if (name.includes('venta') || name.includes('mas vendido') || name.includes('top')) return '⭐';

        // Otras categorías comunes
        if (name.includes('lacteo') || name.includes('leche')) return '🥛';
        if (name.includes('carne') || name.includes('parrilla')) return '🥩';
        if (name.includes('mascota')) return '🐾';
        if (name.includes('congelado')) return '🧊';
        if (name.includes('cigarro')) return '🚬';
        if (name.includes('alcohol') || name.includes('cerveza') || name.includes('vino')) return '🍺';
        if (name.includes('ferreteria')) return '🔨';
        if (name.includes('oficina') || name.includes('libreria')) return '📚';
        return '📦';
    },

    async filterByCategory(cat) {
        this.selectedCategory = cat;
        this.stockFilter = 'all';
        await this.applyFilters();
    },

    async filterByCategoryWithStock(cat, stockStatus) {
        this.selectedCategory = cat;
        this.stockFilter = stockStatus;
        await this.applyFilters();
    },

    async clearCategoryFilter() {
        this.selectedCategory = null;
        this.stockFilter = 'all';
        await this.refresh();
    },

    async setStockFilter(f) {
        this.stockFilter = f;
        await this.refresh();
    },

    renderProductsTable(products) {
        if (products.length === 0) return `
            <div style="text-align: center; padding: 5rem 2rem; background: #f9fafb; border-radius: 1.25rem; border: 2px dashed #d1d5db;">
                <div style="font-size: 4rem; opacity: 0.4; margin-bottom: 1rem;">📦</div>
                <h3 style="color: #6b7280;">No hay productos en esta categoría</h3>
                <p style="color: #9ca3af; font-size: 0.9rem;">Prueba buscando otro nombre o cambia de categoría</p>
            </div>
        `;

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; padding: 0.5rem 0;">
                ${products.map(p => {
            const sup = this.productSuppliers[p.id] || 'Proveedor Desconocido';
            const stock = parseFloat(p.stock) || 0;
            const minStock = parseFloat(p.minStock) || 0;

            let stockLevelColor = '#10b981'; // OK
            if (stock <= 0) stockLevelColor = '#ef4444'; // Agotado
            else if (stock <= minStock) stockLevelColor = '#f59e0b'; // Bajo

            return `
                    <div class="product-card" 
                         style="background: #ffffff; border: 1.5px solid #e5e7eb; border-radius: 1.25rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; position: relative; transition: all 0.25s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.04);"
                         onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 28px rgba(0,0,0,0.09)'; this.style.borderColor='#9ca3af';"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; this.style.borderColor='#e5e7eb';">
                        
                        <!-- Header: Nombre e Icono -->
                        <div style="display: flex; align-items: flex-start; gap: 1rem;">
                            <div style="font-size: 2.2rem; background: #f3f4f6; width: 64px; height: 64px; border-radius: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1.5px solid #e5e7eb;">
                                ${this.getCategoryIcon(p.category)}
                            </div>
                            <div style="flex: 1; overflow: hidden; padding-top: 5px;">
                                <h3 style="margin: 0; color: #111827; font-size: 1.1rem; font-weight: 800; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.name}</h3>
                                <div style="font-size: 0.78rem; color: #9ca3af; margin-top: 0.25rem; font-family: monospace;">${p.barcode || '---'}</div>
                            </div>
                        </div>

                        <!-- Body: Precio y Stock -->
                        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 0.75rem;">
                            <!-- Precio -->
                            <div style="background: #f0fdf4; border-radius: 0.75rem; padding: 0.75rem; border: 1.5px solid #bbf7d0;">
                                <div style="font-size: 0.68rem; color: #16a34a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Precio Venta</div>
                                <div style="font-size: 1.5rem; font-weight: 900; color: #15803d;">${formatCLP(p.price)}</div>
                            </div>
                            <!-- Stock -->
                            <div style="background: #f9fafb; border-radius: 0.75rem; padding: 0.75rem; border-left: 4px solid ${stockLevelColor}; border-top: 1.5px solid #e5e7eb; border-right: 1.5px solid #e5e7eb; border-bottom: 1.5px solid #e5e7eb; text-align: center;">
                                <div style="font-size: 0.68rem; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Disponible</div>
                                <div style="font-size: 1.4rem; font-weight: 900; color: ${stockLevelColor};">
                                    ${formatStock(p.stock)}<span style="font-size: 0.8rem; font-weight: 600; color: #9ca3af;">${p.type === 'weight' ? 'kg' : 'u'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Footer Info: Proveedor y Botones Compactos -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.75rem; border-top: 1px solid #f3f4f6;">
                            <div id="sup-label-${p.id}" style="display: flex; align-items: center; gap: 0.5rem; color: #6b7280; font-size: 0.82rem; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                <span>🚚</span> ${sup}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-icon" style="width: 36px; height: 36px; padding: 0; background: #eff6ff; color: #3b82f6; border: 1.5px solid #bfdbfe; border-radius: 0.65rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" onclick="ProductsView.showProductHistory(${p.id})" title="Ver Historial">
                                    📊
                                </button>
                                <button class="btn btn-icon" style="width: 36px; height: 36px; padding: 0; background: #f0fdf4; color: #16a34a; border: 1.5px solid #bbf7d0; border-radius: 0.65rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'" onclick="ProductsView.showProductForm(${p.id})" title="Editar">
                                    ✏️
                                </button>
                                <button class="btn btn-icon" style="width: 36px; height: 36px; padding: 0; background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; border-radius: 0.65rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" onclick="ProductsView.deleteProduct(${p.id})" title="Desactivar">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    },

    async getLastSuppliers() {
        try {
            const suppliers = await Supplier.getAll();
            const supplierMap = {};
            suppliers.forEach(s => supplierMap[s.id] = s.name);

            // Carga balanceada: solo revisamos las últimas 500 compras para determinar proveedores recientes
            // Esto evita descargar gigas de historial en tiendas muy grandes.
            const allPurchases = await Purchase.getAll();
            const purchases = allPurchases.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 500);
            
            const productLastSupplier = {};
            purchases.forEach(pur => {
                const sName = supplierMap[pur.supplierId] || 'Proveedor desconocido';
                if (pur.items) pur.items.forEach(item => {
                    if (!productLastSupplier[item.productId]) productLastSupplier[item.productId] = sName;
                });
            });
            return productLastSupplier;
        } catch (e) { return {}; }
    },

    updateSupplierLabels() {
        const labels = document.querySelectorAll('[id^="sup-label-"]');
        labels.forEach(label => {
            const productId = label.id.replace('sup-label-', '');
            if (this.productSuppliers[productId]) {
                label.innerHTML = `<span>🚚</span> ${this.productSuppliers[productId]}`;
            }
        });
    },

    async refresh() {
        const content = await this.render();
        const container = document.getElementById('view-container');
        if (container) {
            container.innerHTML = content;
            await this.init();
        }
    },

    async showProductForm(id = null) {
        const product = id ? await Product.getById(id) : null;
        const products = await Product.getAll();
        const categories = [...new Set(products.map(p => p.category || 'General'))].sort();

        const content = `
    < form id = "productForm" >
                <div class="form-group">
                    <label>🔍 Código de Barras (Escanee ahora)</label>
                    <input type="text" name="barcode" class="form-control" value="${product?.barcode || ''}" placeholder="Escanee o escriba el código" autofocus>
                </div>

                <div class="form-group">
                    <label>📝 Nombre del Producto *</label>
                    <input type="text" name="name" class="form-control" value="${product?.name || ''}" required placeholder="Ej: Coca Cola 1.5L">
                </div>
                
                <div class="form-group">
                    <label>Categoría</label>
                    <div class="product-category-field" style="display: flex; gap: 0.5rem;">
                        <div style="flex: 1; position: relative;">
                            <input type="text" id="productCategoryInput" name="category" class="form-control" value="${product?.category || ''}" placeholder="Escriba o seleccione..." autocomplete="off">
                            <div id="productCategoryDropdown" class="product-category-dropdown" style="display: none; position: absolute; width: 100%; z-index: 100;">
                                ${categories.map(cat => `<button type="button" class="product-category-option" onclick="ProductsView.selectCategoryOption('${cat}')">${cat}</button>`).join('')}
                            </div>
                        </div>
                        <button type="button" class="btn btn-secondary" style="white-space: nowrap;" onclick="ProductsView.toggleCategoryDropdown()">
                            📂 Lista
                        </button>
                    </div>
                </div>

                <div class="form-row" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <div class="form-group" style="flex: 1;">
                        <label>💰 Precio Costo</label>
                        <input type="number" name="cost" class="form-control" value="${product?.cost || 0}" style="font-weight: 700; color: #94a3b8;">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>🏷️ Precio Venta *</label>
                        <input type="number" name="price" class="form-control" value="${product?.price || 0}" required style="font-size: 1.25rem; font-weight: 800; color: #4ade80;">
                    </div>
                </div>

                <div class="form-row" style="display: flex; gap: 1rem; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05);">
                    <div class="form-group" style="flex: 1;">
                        <label>📦 Cantidad Actual</label>
                        <input type="number" name="stock" class="form-control" value="${product?.stock || 0}">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>⚠️ Stock Mínimo</label>
                        <input type="number" name="minStock" class="form-control" value="${product?.minStock || 0}">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>📈 Stock Máximo</label>
                        <input type="number" name="maxStock" class="form-control" value="${product?.maxStock || 0}">
                    </div>
                </div>

                <div class="form-group" style="margin-top: 1rem;">
                    <label>📅 Fecha de Vencimiento (Opcional)</label>
                    <input type="date" name="expiryDate" class="form-control" value="${product?.expiryDate || ''}">
                </div>
            </form >
    `;
        const footer = `< button class="btn btn-secondary" onclick = "closeModal()" > Cancelar</button > <button class="btn btn-primary" onclick="ProductsView.saveProduct(${id})">Guardar</button>`;
        showModal(content, { title: id ? 'Editar Producto' : 'Nuevo Producto', footer, width: '600px' });

        // Setup form interactions
        setTimeout(() => {
            const form = document.getElementById('productForm');
            if (form) {
                // Prevenir que el 'Enter' guarde el formulario (común con escáneres)
                // En su lugar, saltar al siguiente campo
                form.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        // C2: Detener propagación para evitar que KeyboardManager guarde el modal automáticamente
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();

                        const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                        const index = inputs.indexOf(e.target);

                        // Si estamos en un campo de texto y hay un siguiente, saltar a él
                        if (index > -1 && index < inputs.length - 1) {
                            inputs[index + 1].focus();
                            // Si el siguiente es la categoría y queremos que esté listo para escribir
                            if (inputs[index + 1].id === 'productCategoryInput') {
                                inputs[index + 1].select();
                            }
                        }
                    }
                }, true); // Usar fase de captura para adelantarnos a otros manejadores
            }

            const input = document.getElementById('productCategoryInput');
            const dropdown = document.getElementById('productCategoryDropdown');
            if (input && dropdown) {
                input.addEventListener('input', () => {
                    const val = input.value.toLowerCase();
                    const options = dropdown.querySelectorAll('.product-category-option');
                    let count = 0;
                    options.forEach(opt => {
                        const show = opt.textContent.toLowerCase().includes(val);
                        opt.style.display = show ? 'block' : 'none';
                        if (show) count++;
                    });
                    dropdown.style.display = val.length > 0 && count > 0 ? 'block' : 'none';
                });
            }
        }, 100);
    },

    toggleCategoryDropdown() {
        const dropdown = document.getElementById('productCategoryDropdown');
        if (dropdown) {
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
        }
    },

    selectCategoryOption(val) {
        const input = document.getElementById('productCategoryInput');
        if (input) input.value = val;
        const dropdown = document.getElementById('productCategoryDropdown');
        if (dropdown) dropdown.style.display = 'none';
    },

    async saveProduct(id) {
        const form = document.getElementById('productForm');
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form));

        // Defecto a General si está vacío
        if (!data.category || data.category.trim() === '') {
            data.category = 'General';
        }

        if (id) data.id = id;
        try {
            await ProductController.saveProduct(data);
            closeModal();
            showNotification('Producto guardado', 'success');
            await this.refresh();
        } catch (e) { showNotification(e.message, 'error'); }
    },

    async deleteProduct(id) {
        showConfirm('¿Desactivar este producto? No se borrará de la base de datos pero no aparecerá en ventas. Podrás restaurarlo desde el botón "Desactivados".', async () => {
            try {
                await ProductController.deleteProduct(id);
                showNotification('Producto desactivado', 'success');
                await this.refresh();
            } catch (e) { showNotification(e.message, 'error'); }
        });
    },

    async showDeletedProducts() {
        const products = await Product.getAllIncludingDeleted();
        const deleted = products.filter(p => p.deleted);

        if (deleted.length === 0) {
            showModal(
                '<div class="empty-state"><div class="empty-state-icon">✅</div>No hay productos desactivados</div>',
                { title: 'Productos Desactivados', footer: '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>', width: '600px' }
            );
            return;
        }

        const content = `
    < p style = "margin-bottom: 1rem; color: #94a3b8;" >
        Estos productos están desactivados.No aparecerán en ventas ni en el buscador, pero sus registros históricos se mantienen.
            </p >
    <div class="table-container" style="max-height: 450px; overflow-y: auto; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
        <table class="table">
            <thead style="background: rgba(0,0,0,0.2); position: sticky; top: 0; z-index: 1;">
                <tr>
                    <th style="text-align: left; padding: 0.75rem 1rem;">Producto</th>
                    <th style="text-align: left; padding: 0.75rem 1rem;">Categoría</th>
                    <th style="text-align: right; padding: 0.75rem 1rem;">Costo</th>
                    <th style="text-align: center; padding: 0.75rem 1rem;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${deleted.map(p => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); opacity: 0.85;">
                                <td style="padding: 0.75rem 1rem;">
                                    <div style="font-weight: 600; color: #fff;">${p.name}</div>
                                    <small style="color: #64748b;">${p.barcode || 'Sin código'}</small>
                                </td>
                                <td style="padding: 0.75rem 1rem; color: #94a3b8;">${p.category || 'General'}</td>
                                <td style="padding: 0.75rem 1rem; text-align: right; color: #fff;">${formatCLP(p.cost || 0)}</td>
                                <td style="padding: 0.75rem 1rem; text-align: center;">
                                    <button class="btn btn-sm btn-success" onclick="ProductsView.restoreProduct(${p.id})">
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
            title: `Productos Desactivados(${deleted.length})`,
            footer: '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>',
            width: '600px'
        });
    },

    // Notebook style calculations
    calcFromNeto() {
        const neto = parseFloat(document.getElementById('form_costNeto').value) || 0;
        const ivaType = document.getElementById('form_ivaType').value;
        const factor = ivaType === '19%' ? 1.19 : 1.0;
        const bruto = Math.round(neto * factor);
        document.getElementById('form_cost').value = bruto;
        // Ahora calculamos el markup basado en el precio que el usuario ya ingresó
        this.calcFromBruto();
    },

    calcFromMarkup() {
        const cost = parseFloat(document.getElementById('form_cost').value) || 0;
        const markup = parseFloat(document.getElementById('form_markup').value) || 0;
        if (markup > 0) {
            const price = Math.round(cost * (1 + (markup / 100)));
            document.getElementById('form_price').value = price;
        }
    },

    calcFromBruto() {
        const price = parseFloat(document.getElementById('form_price').value) || 0;
        const cost = parseFloat(document.getElementById('form_cost').value) || 0;
        if (cost > 0) {
            const markup = ((price / cost) - 1) * 100;
            document.getElementById('form_markup').value = Math.round(markup * 100) / 100;
        }
    },

    async restoreProduct(id) {
        try {
            await ProductController.restoreProduct(id);
            closeModal();
            showNotification('Producto restaurado correctamente', 'success');
            await this.refresh();
        } catch (e) {
            showNotification(e.message, 'error');
        }
    },

    async showProductHistory(id) {
        const product = await Product.getById(id);
        const movements = await StockMovement.getByProduct(id);
        const sorted = movements.sort((a, b) => new Date(b.date) - new Date(a.date));
        const content = `
    < div style = "margin-bottom: 1rem;" >
                <h3>${product.name}</h3>
                <p>Stock actual: <strong>${product.stock} ${product.type === 'weight' ? 'kg' : 'un'}</strong></p>
            </div >
    <div class="table-container" style="max-height: 400px; overflow-y: auto;">
        <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Cant.</th><th>Motivo</th></tr></thead>
            <tbody>
                ${sorted.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No hay movimientos</td></tr>' : sorted.map(m => `
                            <tr>
                                <td>${formatDateTime(m.date)}</td>
                                <td><span class="badge badge-info">${m.type}</span></td>
                                <td style="color: ${m.quantity > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: bold;">${m.quantity > 0 ? '+' : ''}${m.quantity}</td>
                                <td>${m.reason || '-'}</td>
                            </tr>
                        `).join('')}
            </tbody>
        </table>
    </div>
`;
        showModal(content, { title: 'Historial de Movimientos', footer: '<button class="btn btn-primary" onclick="closeModal()">Cerrar</button>', width: '700px' });
    }
};