const ProductsView = {
    async render() {
        const products = await Product.getAll();
        
        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1>Productos</h1>
                        <p>Gestiona tu catálogo de productos</p>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        <button class="btn btn-danger" onclick="ProductsView.deleteSelected()" id="btnDeleteSelected" style="display: none;">
                            🗑️ Eliminar Seleccionados
                        </button>
                        <button class="btn btn-secondary" onclick="ProductsView.exportToExcel()">
                            📥 Exportar Excel
                        </button>
                        <button class="btn btn-secondary" onclick="ProductsView.showImportModal()">
                            📤 Importar Excel
                        </button>
                        <button class="btn btn-primary" onclick="ProductsView.showProductForm()">
                            ➕ Nuevo Producto
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="form-group">
                    <div class="search-box">
                        <input type="text" 
                               id="searchProducts" 
                               class="form-control" 
                               placeholder="Buscar productos...">
                    </div>
                </div>
                
                <div id="productsTable">
                    ${this.renderProductsTable(products)}
                </div>
            </div>
        `;
    },
    
    async init() {
        const searchInput = document.getElementById('searchProducts');
        let searchTimeout;
        
        if (searchInput) {
            searchInput.addEventListener('input', async (e) => {
                clearTimeout(searchTimeout);
                
                const term = e.target.value.trim();
                
                if (term.length === 0) {
                    const products = await Product.getAll();
                    document.getElementById('productsTable').innerHTML = this.renderProductsTable(products);
                    return;
                }
                
                searchTimeout = setTimeout(async () => {
                    const products = await this.fuzzySearch(term);
                    document.getElementById('productsTable').innerHTML = this.renderProductsTable(products);
                }, 300);
            });
        }
    },
    
    async fuzzySearch(term) {
        const allProducts = await Product.getAll();
        const searchTerm = term.toLowerCase();
        
        return allProducts.filter(p => {
            const name = p.name.toLowerCase();
            const barcode = (p.barcode || '').toLowerCase();
            const description = (p.description || '').toLowerCase();
            
            if (name.includes(searchTerm) || barcode.includes(searchTerm) || description.includes(searchTerm)) {
                return true;
            }
            
            const words = searchTerm.split(' ').filter(w => w.length > 0);
            return words.every(word => 
                name.includes(word) || barcode.includes(word) || description.includes(word)
            );
        });
    },
    
    renderProductsTable(products) {
        if (products.length === 0) {
            return '<div class="empty-state"><div class="empty-state-icon">📦</div>No hay productos</div>';
        }
        
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="selectAll" onchange="ProductsView.toggleAll(this.checked)"></th>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th>Tipo</th>
                            <th>Precio</th>
                            <th>Costo</th>
                            <th>Stock</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td><input type="checkbox" class="product-select" value="${p.id}" onchange="ProductsView.updateDeleteButton()"></td>
                                <td>${p.barcode || '-'}</td>
                                <td><strong>${p.name}</strong></td>
                                <td><span class="badge badge-info">${p.category}</span></td>
                                <td>${p.type === 'unit' ? 'Unidad' : 'Peso'}</td>
                                <td>${formatCLP(p.price)}</td>
                                <td>${formatCLP(p.cost)}</td>
                                <td>
                                    <span class="${p.stock <= p.minStock ? 'badge badge-danger' : ''}">
                                        ${p.stock} ${p.type === 'weight' ? 'kg' : 'un'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" 
                                            onclick="ProductsView.showProductForm(${p.id})">
                                        Editar
                                    </button>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="ProductsView.showProductHistory(${p.id})">
                                        Historial
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="ProductsView.deleteProduct(${p.id})">
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

    toggleAll(checked) {
        const checkboxes = document.querySelectorAll('.product-select');
        checkboxes.forEach(cb => cb.checked = checked);
        this.updateDeleteButton();
    },

    updateDeleteButton() {
        const selected = document.querySelectorAll('.product-select:checked');
        const btn = document.getElementById('btnDeleteSelected');
        if (btn) {
            btn.style.display = selected.length > 0 ? 'inline-block' : 'none';
            btn.textContent = `🗑️ Eliminar Seleccionados (${selected.length})`;
        }
    },

    async deleteSelected() {
        const selected = document.querySelectorAll('.product-select:checked');
        if (selected.length === 0) return;

        confirm(`¿Estás seguro de eliminar ${selected.length} productos seleccionados? Esta acción no se puede deshacer.`, async () => {
            try {
                let count = 0;
                for (const checkbox of selected) {
                    await ProductController.deleteProduct(parseInt(checkbox.value));
                    count++;
                }
                showNotification(`${count} productos eliminados correctamente`, 'success');
                await this.refresh();
            } catch (error) {
                showNotification('Error al eliminar productos: ' + error.message, 'error');
            }
        });
    },
    
    async showProductForm(id = null) {
        const product = id ? await Product.getById(id) : null;
        
        const content = `
            <form id="productForm" onsubmit="ProductsView.saveProduct(event, ${id})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Código de Barras</label>
                        <input type="text" name="barcode" class="form-control" value="${product?.barcode || ''}">
                    </div>
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" name="name" class="form-control" value="${product?.name || ''}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="description" class="form-control" rows="2">${product?.description || ''}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría</label>
                        <input type="text" name="category" class="form-control" value="${product?.category || 'General'}">
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="type" class="form-control">
                            <option value="unit" ${product?.type === 'unit' ? 'selected' : ''}>Unidad</option>
                            <option value="weight" ${product?.type === 'weight' ? 'selected' : ''}>Peso (kg)</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Precio Venta (CLP) *</label>
                        <input type="number" id="productPrice" name="price" class="form-control" value="${product?.price || 0}" required min="0">
                    </div>
                    <div class="form-group">
                        <label>Costo (CLP)</label>
                        <input type="number" id="productCost" name="cost" class="form-control" value="${product?.cost || 0}" min="0">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Stock Inicial</label>
                        <input type="number" name="stock" class="form-control" value="${product?.stock || 0}" min="0" step="0.001">
                    </div>
                    <div class="form-group">
                        <label>Stock Mínimo</label>
                        <input type="number" name="minStock" class="form-control" value="${product?.minStock || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label>Stock Máximo</label>
                        <input type="number" name="maxStock" class="form-control" value="${product?.maxStock || 0}" min="0">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>URL de Imagen (opcional)</label>
                    <input type="url" name="image" class="form-control" value="${product?.image || ''}">
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('productForm').requestSubmit()">
                ${id ? 'Actualizar' : 'Crear'}
            </button>
        `;
        
        showModal(content, {
            title: id ? 'Editar Producto' : 'Nuevo Producto',
            footer,
            width: '700px'
        });
        
        // Auto-calculate price when cost changes
        setTimeout(() => {
            const costInput = document.getElementById('productCost');
            const priceInput = document.getElementById('productPrice');
            
            if (costInput && priceInput) {
                costInput.addEventListener('input', (e) => {
                    const cost = parseFloat(e.target.value) || 0;
                    if (cost > 0) {
                        const calculatedPrice = Math.round(cost * 1.19 * 1.40);
                        priceInput.value = calculatedPrice;
                    }
                });
            }
        }, 100);
    },
    
    async saveProduct(event, id) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);
        
        if (id) data.id = id;
        
        try {
            await ProductController.saveProduct(data);
            closeModal();
            await this.refresh();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },
    
    async deleteProduct(id) {
        confirm('¿Eliminar este producto?', async () => {
            try {
                await ProductController.deleteProduct(id);
                await this.refresh();
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    },
    
    showImportModal() {
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <div style="background: #dbeafe; border: 2px solid #3b82f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div style="font-weight: bold; margin-bottom: 0.5rem;">📋 Formato CSV/Excel</div>
                    <div style="font-size: 0.9rem;">
                        El archivo debe tener las siguientes columnas:<br>
                        <code style="background: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">
                            Imagen, Descripción, Código, Precio, Stock Actual, Stock Mín., Stock Máx., Categoría, Unidad
                        </code>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Seleccionar archivo CSV/Excel</label>
                    <input type="file" id="importFile" class="form-control" accept=".csv,.txt,.xlsx,.xls" style="padding: 0.5rem;">
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 0.75rem; border-radius: 0.375rem; font-size: 0.85rem;">
                    <strong>Nota:</strong> Los productos con código de barras existente serán actualizados.
                    Los nuevos productos serán agregados.
                </div>
            </div>
            
            <details style="margin-top: 1rem;">
                <summary style="cursor: pointer; color: var(--primary); font-weight: 600;">Ver ejemplo de archivo CSV</summary>
                <div style="margin-top: 0.75rem; background: #f3f4f6; padding: 1rem; border-radius: 0.375rem; font-family: monospace; font-size: 0.85rem; overflow-x: auto;">
Código,Descripción,Categoría,Precio,Costo,Unidad,Stock Actual,Stock Mín.,Stock Máx.<br>
7790001234567,Coca Cola 1.5L,Bebidas,1500,1000,Unidad,50,10,100<br>
7790009876543,Arroz Tucapel 1kg,Abarrotes,1200,800,Unidad,30,5,80
                </div>
            </details>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="ProductsView.importFromFile()">
                📤 Importar Productos
            </button>
        `;
        
        showModal(content, { title: 'Importar Productos desde CSV/Excel', footer, width: '700px' });
    },
    
    async importFromFile() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showNotification('Selecciona un archivo', 'warning');
            return;
        }
        
        try {
            let products = [];
            
            // Check if it's an Excel file
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                if (typeof XLSX === 'undefined') {
                    showNotification('La librería XLSX no está cargada', 'error');
                    return;
                }
                
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // Convert Excel data to product format
                products = jsonData.map(row => {
                    const getVal = (key) => {
                        if (row[key] !== undefined) return row[key];
                        const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
                        return foundKey ? row[foundKey] : '';
                    };

                    let barcode = getVal('Código') || getVal('Codigo') || getVal('EAN / GTIN') || getVal('barcode');
                    let name = getVal('Descripción') || getVal('Descripcion') || getVal('name');
                    let priceRaw = getVal('Precio') || getVal('price');
                    let price = typeof priceRaw === 'string' ? parseFloat(priceRaw.replace(/[^\d.-]/g, '')) : parseFloat(priceRaw);
                    let stock = parseFloat(getVal('Stock Actual') || getVal('stock')) || 0;
                    let minStock = parseFloat(getVal('Stock Mín.') || getVal('Stock Min.') || getVal('minStock')) || 0;
                    let maxStock = parseFloat(getVal('Stock Máx.') || getVal('Stock Max.') || getVal('maxStock')) || 0;
                    let category = getVal('Categoría') || getVal('Categoria') || getVal('category') || 'General';
                    let image = getVal('Imagen') || getVal('image') || '';
                    let unidad = String(getVal('Unidad') || getVal('type') || '').toLowerCase();
                    let type = (unidad.includes('kg') || unidad.includes('kilo') || unidad.includes('peso') || unidad === 'weight') ? 'weight' : 'unit';
                    let cost = parseFloat(getVal('Costo') || getVal('cost')) || 0;

                    return {
                        barcode: String(barcode || '').trim(),
                        name: String(name || '').trim(),
                        description: String(name || '').trim(), // Use name as description too
                        category: String(category).trim(),
                        price: price || 0,
                        cost: cost,
                        type: type,
                        stock: stock,
                        minStock: minStock,
                        maxStock: maxStock,
                        image: image
                    };
                });
            } else {
                // CSV file
                const text = await file.text();
                products = this.parseCSV(text);
            }
            
            if (products.length === 0) {
                showNotification('No se encontraron productos en el archivo', 'warning');
                return;
            }
            
            let imported = 0;
            let updated = 0;
            let errors = 0;
            
            for (const productData of products) {
                try {
                    if (!productData.name || (productData.price === undefined)) {
                        errors++;
                        continue;
                    }
                    
                    if (productData.barcode) {
                        const existing = await Product.getByBarcode(productData.barcode);
                        if (existing) {
                            await Product.update(existing.id, productData);
                            updated++;
                            continue;
                        }
                    }
                    
                    await Product.create(productData);
                    imported++;
                } catch (error) {
                    console.error('Error importing product:', error);
                    errors++;
                }
            }
            
            closeModal();
            await this.refresh();
            
            showNotification(
                `Importación completada: ${imported} nuevos, ${updated} actualizados, ${errors} errores`,
                errors > 0 ? 'warning' : 'success'
            );
        } catch (error) {
            showNotification('Error al leer el archivo: ' + error.message, 'error');
        }
    },
    
    parseCSV(text) {
        // Handle CSV/TSV parsing with basic detection
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];
        
        const delimiter = text.includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        
        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            const getVal = (key) => {
                if (row[key] !== undefined) return row[key];
                const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
                return foundKey ? row[foundKey] : '';
            };

            let barcode = getVal('Código') || getVal('Codigo') || getVal('EAN / GTIN') || getVal('barcode');
            let name = getVal('Descripción') || getVal('Descripcion') || getVal('name');
            let priceRaw = getVal('Precio') || getVal('price');
            let price = typeof priceRaw === 'string' ? parseFloat(priceRaw.replace(/[^\d.-]/g, '')) : parseFloat(priceRaw);
            let stock = parseFloat(getVal('Stock Actual') || getVal('stock')) || 0;
            let minStock = parseFloat(getVal('Stock Mín.') || getVal('Stock Min.') || getVal('minStock')) || 0;
            let maxStock = parseFloat(getVal('Stock Máx.') || getVal('Stock Max.') || getVal('maxStock')) || 0;
            let category = getVal('Categoría') || getVal('Categoria') || getVal('category') || 'General';
            let image = getVal('Imagen') || getVal('image') || '';
            let unidad = String(getVal('Unidad') || getVal('type') || '').toLowerCase();
            let type = (unidad.includes('kg') || unidad.includes('kilo') || unidad.includes('peso') || unidad === 'weight') ? 'weight' : 'unit';
            let cost = parseFloat(getVal('Costo') || getVal('cost')) || 0;

            if (name) {
                products.push({
                    barcode: String(barcode || '').trim(),
                    name: String(name || '').trim(),
                    description: String(name || '').trim(),
                    category: String(category).trim(),
                    price: price || 0,
                    cost: cost,
                    type: type,
                    stock: stock,
                    minStock: minStock,
                    maxStock: maxStock,
                    image: image
                });
            }
        }
        
        return products;
    },
    
    async exportToExcel() {
        const products = await Product.getAll();
        
        if (products.length === 0) {
            showNotification('No hay productos para exportar', 'warning');
            return;
        }
        
        const headers = ['barcode', 'name', 'description', 'category', 'price', 'cost', 'type', 'stock', 'minStock', 'maxStock'];
        
        let csv = headers.join(',') + '\n';
        
        products.forEach(p => {
            const row = [
                p.barcode || '',
                `"${(p.name || '').replace(/"/g, '""')}"`,
                `"${(p.description || '').replace(/"/g, '""')}"`,
                p.category || '',
                p.price || 0,
                p.cost || 0,
                p.type || 'unit',
                p.stock || 0,
                p.minStock || 0,
                p.maxStock || 0
            ];
            csv += row.join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const now = new Date();
        const filename = `productos_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`${products.length} productos exportados a ${filename}`, 'success');
    },
    
    async refresh() {
        const products = await Product.getAll();
        document.getElementById('productsTable').innerHTML = this.renderProductsTable(products);
    },
    
    async showProductHistory(productId) {
        const product = await Product.getById(productId);
        if (!product) {
            showNotification('Producto no encontrado', 'error');
            return;
        }
        
        // Get stock movements for this product
        const allMovements = await StockMovement.getByProduct(productId);
        // Sort by date descending (newest first)
        const movements = allMovements.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const content = `
            <div style="margin-bottom: 1rem;">
                <h3 style="margin: 0 0 0.5rem 0;">${product.name}</h3>
                <p style="margin: 0; color: #666;">Stock actual: <strong>${product.stock} ${product.type === 'weight' ? 'kg' : 'un'}</strong></p>
            </div>
            
            ${movements.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    No hay movimientos registrados
                </div>
            ` : `
                <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Cantidad</th>
                                <th>Motivo</th>
                                <th>Referencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movements.map(m => {
                                const date = new Date(m.date);
                                const formattedDate = date.toLocaleDateString('es-CL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                                
                                const typeLabel = {
                                    'sale': 'Venta',
                                    'purchase': 'Compra',
                                    'adjustment': 'Ajuste',
                                    'return': 'Devolución',
                                    'loss': 'Pérdida',
                                    'initial': 'Stock Inicial'
                                }[m.type] || m.type;
                                
                                const typeBadge = {
                                    'sale': 'badge-danger',
                                    'purchase': 'badge-success',
                                    'adjustment': 'badge-info',
                                    'return': 'badge-warning',
                                    'loss': 'badge-danger',
                                    'initial': 'badge-info'
                                }[m.type] || 'badge-secondary';
                                
                                const quantitySign = m.quantity > 0 ? '+' : '';
                                const quantityColor = m.quantity > 0 ? '#065f46' : '#991b1b';
                                
                                return `
                                    <tr>
                                        <td>${formattedDate}</td>
                                        <td><span class="badge ${typeBadge}">${typeLabel}</span></td>
                                        <td style="color: ${quantityColor};"><strong>${quantitySign}${m.quantity}</strong></td>
                                        <td>${m.reason || '-'}</td>
                                        <td>${m.reference ? `#${m.reference}` : '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        `;
        
        const footer = `
            <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
        `;
        
        showModal(content, {
            title: 'Historial de Movimientos',
            footer,
            width: '800px'
        });
    }
};