const InventoryView = {
    currentSection: 'inventory',
    stockFilter: null,
    showCapitalDist: false, // Nueva variable para controlar visibilidad de capital
    products: null,
    recentMovements: [],
    bulkAdjustmentItems: [],
    auditState: null,
    searchCache: null,
    selectedBulkType: 'consumption',
    categories: [],
    allProducts: [],
    auditHistory: [], // Historial de auditorías completadas
    selectedConsumptionDate: new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD local
    selectedLossDate: new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD local

    async init() {
        // Siempre refrescamos para asegurar categorías y stock actualizado
        await this.refreshData();
        // Activamos funcionalidades específicas de la sección (vistas, buscadores, etc.)
        await this.initRecentMovements();
    },

    async refreshData() {
        this.products = await Product.getAll();
        const suppliers = await Supplier.getAll();
        const suppliersMap = suppliers.reduce((acc, s) => {
            acc[s.id] = s.name;
            return acc;
        }, {});

        this.products = this.products.map(p => ({
            ...p,
            supplierName: suppliersMap[p.supplierId] || 'Sin proveedor'
        }));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        this.recentMovements = await StockMovement.getByDateRange(thirtyDaysAgo, new Date());

        // Poblar categorías y productos para auditoría
        this.allProducts = this.products.filter(p => !p.deleted);

        // Solo mostrar categorías que realmente tengan productos activos
        this.categories = [...new Set(this.allProducts.map(p => p.category || 'General'))].sort();

        // Cargar historial de auditorías completadas
        try {
            const logs = await AuditLogService.getByEntity('category_audit');
            const history = (logs || []).map(l => ({ ...l, source: 'auditLog' }));

            // Reconstrucción de auditorías antiguas desde stockMovements
            const auditMovements = this.recentMovements.filter(m =>
                m.type === 'adjustment' &&
                m.reason &&
                m.reason.startsWith('Ajuste Automático por Auditoría de Cat:')
            );

            // Agrupar movimientos antiguos por motivo y ventana de tiempo (1 minuto)
            const reconstructed = [];
            const groups = {};

            auditMovements.forEach(m => {
                const date = new Date(m.date);
                // Redondear al minuto para agrupar movimientos de la misma auditoría
                const timeKey = `${m.reason}_${date.getFullYear()}-${date.getMonth()}-${date.getDate()}_${date.getHours()}:${date.getMinutes()}`;

                if (!groups[timeKey]) {
                    groups[timeKey] = {
                        timestamp: m.date,
                        username: 'Sistema (Recov)',
                        metadata: {
                            categoryName: m.reason.replace('Ajuste Automático por Auditoría de Cat: ', ''),
                            lossMoney: 0,
                            extraMoney: 0,
                            adjustmentsMade: 0
                        },
                        source: 'reconstructed'
                    };
                }

                const cost = m.cost_value || 0;
                if (m.quantity < 0) {
                    groups[timeKey].metadata.lossMoney += cost;
                } else {
                    groups[timeKey].metadata.extraMoney += cost;
                }
                groups[timeKey].metadata.adjustmentsMade++;
            });

            const reconstructedLogs = Object.values(groups);

            // Combinar ambos y evitar duplicados por categoría y fecha aproximada
            const combined = [...history];
            reconstructedLogs.forEach(rec => {
                const isAlreadyInHistory = history.some(h =>
                    h.metadata.categoryName === rec.metadata.categoryName &&
                    Math.abs(new Date(h.timestamp) - new Date(rec.timestamp)) < 120000 // 2 min threshold
                );
                if (!isAlreadyInHistory) {
                    combined.push(rec);
                }
            });

            this.auditHistory = combined
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10);
        } catch (e) {
            console.error("Error cargando historial de auditoría:", e);
            this.auditHistory = [];
        }
    },

    calculateDashboardMetrics() {
        const activeProducts = this.products.filter(p => !p.deleted);
        const totalCapital = activeProducts.reduce((sum, p) => sum + (p.stock * (parseFloat(p.cost) || 0)), 0);
        const totalCapitalWithIva = activeProducts.reduce((sum, p) => sum + (p.stock * ((parseFloat(p.cost) || 0) * 1.19)), 0);
        const totalProjected = activeProducts.reduce((sum, p) => sum + (p.stock * (parseFloat(p.price) || 0)), 0);
        const profit = totalProjected - totalCapitalWithIva;
        const margin = totalCapitalWithIva > 0 ? (profit / totalCapitalWithIva * 100) : 0;

        const lowStock = activeProducts.filter(p => (parseFloat(p.stock) || 0) <= (parseFloat(p.minStock) || 0) && (parseFloat(p.stock) || 0) > 0).length;
        const outOfStock = activeProducts.filter(p => (parseFloat(p.stock) || 0) <= 0).length;
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        const expiringSoon = activeProducts.filter(p => p.expiryDate && new Date(p.expiryDate) <= thirtyDays).length;

        const categoryValues = {};
        activeProducts.forEach(p => {
            const category = p.category || 'General';
            if (!categoryValues[category]) {
                categoryValues[category] = { name: category, capital: 0, capitalWithIva: 0, projected: 0, count: 0 };
            }
            const stock = parseFloat(p.stock) || 0;
            const cost = parseFloat(p.cost) || 0;
            const price = parseFloat(p.price) || 0;

            categoryValues[category].capital += stock * cost;
            categoryValues[category].capitalWithIva += stock * (cost * 1.19);
            categoryValues[category].projected += stock * price;
            categoryValues[category].count += 1;
        });

        const categoryDistribution = Object.values(categoryValues).sort((a, b) => b.capital - a.capital).map(cat => ({
            ...cat,
            profit: cat.projected - cat.capitalWithIva,
            margin: cat.capitalWithIva > 0 ? ((cat.projected - cat.capitalWithIva) / cat.capitalWithIva * 100) : 0,
            percent: totalCapital > 0 ? (cat.capital / totalCapital * 100) : 0
        }));

        // Calcular consumos y perdidas del mes actual
        const now = new Date();
        const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM

        let monthlyConsumption = 0;
        let monthlyLoss = 0;
        const currentYear = now.getFullYear();
        const currentMonthIdx = now.getMonth();

        if (this.recentMovements) {
            this.recentMovements.forEach(m => {
                const mDate = new Date(m.date);
                if (mDate.getFullYear() === currentYear && mDate.getMonth() === currentMonthIdx) {
                    const product = this.products.find(p => Number(p.id) === Number(m.productId));
                    const costValue = parseFloat(m.cost_value) || (product ? (Math.abs(m.quantity) * (parseFloat(product.cost) || 0)) : 0);

                    if (m.type === 'consumption') {
                        monthlyConsumption += costValue;
                    } else if (m.type === 'loss') {
                        monthlyLoss += costValue;
                    }
                }
            });
        }

        return {
            totalCapital,
            totalProjected,
            profit,
            margin,
            activeItems: activeProducts.length,
            lowStock,
            outOfStock,
            expiringSoon,
            categoryDistribution,
            monthlyConsumption,
            monthlyLoss
        };
    },

    async render() {
        if (!this.products) {
            await this.refreshData();
        }

        const dashboard = this.calculateDashboardMetrics();
        const mainContent = this.renderSectionContent(dashboard);

        return `
            <div class="view-header animate-fade-in">
                <div class="header-content">
                    <h1 style="color: #111827;">Inventario y Stock</h1>
                    <p style="color: #4b5563;">Control y movimientos de inventario</p>
                </div>
            </div>

            <div class="inventory-container animate-fade-in">
                <div class="card" style="padding: 1rem; background: #f9fafb; border: 1.5px solid #e5e7eb; margin-bottom: 0;">
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-start;">
                        <button class="btn ${this.currentSection === 'inventory' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="InventoryView.switchSection('inventory')" 
                                style="padding: 0.5rem 0.8rem; font-size: 0.85rem; flex: 0 1 auto; min-width: 100px;"
                                title="Ver lista completa de productos y stock actual">
                            📦 Inventario
                        </button>
                        <button class="btn ${this.currentSection === 'bulk-adjustment' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="InventoryView.switchSection('bulk-adjustment')" 
                                style="padding: 0.5rem 0.8rem; font-size: 0.85rem; flex: 0 1 auto; min-width: 110px;"
                                title="Descontar múltiples productos por consumo o mermas">
                            ➕ Ajuste Masivo
                        </button>
                        <button class="btn ${this.currentSection === 'audit' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="InventoryView.switchSection('audit')" 
                                style="padding: 0.5rem 0.8rem; font-size: 0.85rem; flex: 0 1 auto; min-width: 150px;"
                                title="Contar mercadería físicamente y corregir el sistema">
                            📋 Auditoría Física
                        </button>
                        <button class="btn ${this.currentSection === 'consumption-report' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="InventoryView.switchSection('consumption-report')" 
                                style="padding: 0.5rem 0.8rem; font-size: 0.85rem; flex: 0 1 auto; min-width: 130px;"
                                title="Ver cuánto se ha consumido en el local">
                            📉 Consumo Interno
                        </button>
                        <button class="btn ${this.currentSection === 'loss-report' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="InventoryView.switchSection('loss-report')" 
                                style="padding: 0.5rem 0.8rem; font-size: 0.85rem; flex: 0 1 auto; min-width: 110px;"
                                title="Listado de productos perdidos o dañados">
                            🚨 Pérdidas
                        </button>
                        <button class="btn ${this.currentSection === 'history' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="InventoryView.switchSection('history')" 
                                style="padding: 0.5rem 0.8rem; font-size: 0.85rem; flex: 0 1 auto; min-width: 90px;"
                                title="Registro de todos los cambios de stock pasados">
                            📜 Historial
                        </button>
                    </div>
                </div>

                <div id="inventory-section-content" style="margin-top: 1.5rem;">
                    ${mainContent}
                </div>
            </div>
        `;
    },

    renderSectionContent(dashboard) {
        switch (this.currentSection) {
            case 'inventory':
                return this.renderInventoryDashboard(dashboard);
            case 'bulk-adjustment':
                return this.renderBulkAdjustmentForm();
            case 'audit':
                return this.renderAuditSection();
            case 'consumption-report':
                return this.renderConsumptionReport();
            case 'loss-report':
                return this.renderLossReport();
            case 'history':
                return this.renderHistorySection(this.recentMovements);
            default:
                return this.renderInventoryDashboard(dashboard);
        }
    },

    renderInventoryDashboard(dashboard) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                <div style="background: #ffffff; border: 1.5px solid #bfdbfe; border-left: 5px solid #3b82f6; border-radius: 1rem; padding: 1.5rem; position: relative; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 28px rgba(59,130,246,0.15)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                    <div style="font-size: 2rem; position: absolute; right: 1.5rem; top: 1.5rem; opacity: 0.6;">💼</div>
                    <h3 style="color: #1d4ed8; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 0.5rem; font-weight: 700;">CAPITAL INVERTIDO</h3>
                    <div style="color: #1d4ed8; font-size: 2.1rem; font-weight: 800; line-height: 1;">${formatCLP(dashboard.totalCapital)}</div>
                    <p style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #dbeafe; font-size: 0.78rem; color: #3b82f6; font-weight: 600;">Costo neto del total de stock (${dashboard.activeItems} productos)</p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #e9d5ff; border-left: 5px solid #8b5cf6; border-radius: 1rem; padding: 1.5rem; position: relative; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 28px rgba(139,92,246,0.15)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                    <div style="font-size: 2rem; position: absolute; right: 1.5rem; top: 1.5rem; opacity: 0.6;">🏷️</div>
                    <h3 style="color: #6d28d9; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 0.5rem; font-weight: 700;">VALOR VENTA TOTAL (STOCK)</h3>
                    <div style="color: #6d28d9; font-size: 2.1rem; font-weight: 800; line-height: 1;">${formatCLP(dashboard.totalProjected)}</div>
                    <p style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #ede9fe; font-size: 0.78rem; color: #7c3aed; font-weight: 600;">Recaudación estimada si vendes todo el stock</p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #a7f3d0; border-left: 5px solid #10b981; border-radius: 1rem; padding: 1.5rem; position: relative; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 28px rgba(16,185,129,0.15)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                    <div style="font-size: 2rem; position: absolute; right: 1.5rem; top: 1.5rem; opacity: 0.6;">📈</div>
                    <h3 style="color: #065f46; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 0.5rem; font-weight: 700;">GANANCIA BRUTA (SIN IVA)</h3>
                    <div style="color: #059669; font-size: 2.1rem; font-weight: 800; line-height: 1;">${formatCLP(dashboard.profit)}</div>
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #d1fae5;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.78rem; color: #059669; font-weight: 600;">Margen Global Estimado</span>
                            <span style="background: #d1fae5; color: #065f46; padding: 0.1rem 0.5rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 700; border: 1px solid #a7f3d0;">+${dashboard.margin.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #bfdbfe; border-left: 5px solid #3b82f6; border-radius: 1rem; padding: 1.5rem; position: relative; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 28px rgba(59,130,246,0.15)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'" onclick="InventoryView.switchSection('consumption-report')">
                    <div style="font-size: 2rem; position: absolute; right: 1.5rem; top: 1.5rem; opacity: 0.6;">🍴</div>
                    <h3 style="color: #1d4ed8; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 0.5rem; font-weight: 700;">CONSUMO INTERNO (MES)</h3>
                    <div style="color: #2563eb; font-size: 2.1rem; font-weight: 800; line-height: 1;">${formatCLP(dashboard.monthlyConsumption)}</div>
                    <p style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #dbeafe; font-size: 0.78rem; color: #3b82f6; font-weight: 600;">Gasto acumulado por consumo de la casa</p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #fecaca; border-left: 5px solid #ef4444; border-radius: 1rem; padding: 1.5rem; position: relative; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 28px rgba(239,68,68,0.15)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'" onclick="InventoryView.switchSection('loss-report')">
                    <div style="font-size: 2rem; position: absolute; right: 1.5rem; top: 1.5rem; opacity: 0.6;">🗑️</div>
                    <h3 style="color: #b91c1c; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 0.5rem; font-weight: 700;">PÉRDIDAS (MES)</h3>
                    <div style="color: #dc2626; font-size: 2.1rem; font-weight: 800; line-height: 1;">${formatCLP(dashboard.monthlyLoss)}</div>
                    <p style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #fee2e2; font-size: 0.78rem; color: #ef4444; font-weight: 600;">Valor de mercadería perdida o dañada</p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <button class="stat-card stat-card-button ${this.stockFilter === 'low' ? 'stat-card-selected' : ''}"
                            style="flex: 1; margin: 0; padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; border-radius: 0.75rem; background: ${this.stockFilter === 'low' ? '#fef3c7' : '#ffffff'}; border: 1.5px solid ${this.stockFilter === 'low' ? '#f59e0b' : '#e5e7eb'}; transition: all 0.2s;"
                            onclick="InventoryView.setStockFilter('low')">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.25rem;">⚠️</span>
                            <span style="font-size: 0.95rem; font-weight: 600; color: ${this.stockFilter === 'low' ? '#b45309' : '#374151'};">Stock Bajo</span>
                        </div>
                        <span style="background: ${this.stockFilter === 'low' ? '#f59e0b' : '#e5e7eb'}; color: ${this.stockFilter === 'low' ? '#ffffff' : '#4b5563'}; padding: 0.25rem 0.75rem; border-radius: 1rem; font-weight: bold;">${dashboard.lowStock}</span>
                    </button>
                    
                    <button class="stat-card stat-card-button ${this.stockFilter === 'out' ? 'stat-card-selected' : ''}"
                            style="flex: 1; margin: 0; padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; border-radius: 0.75rem; background: ${this.stockFilter === 'out' ? '#fef2f2' : '#ffffff'}; border: 1.5px solid ${this.stockFilter === 'out' ? '#ef4444' : '#e5e7eb'}; transition: all 0.2s;"
                            onclick="InventoryView.setStockFilter('out')">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.25rem;">🛑</span>
                            <span style="font-size: 0.95rem; font-weight: 600; color: ${this.stockFilter === 'out' ? '#b91c1c' : '#374151'};">Sin Stock</span>
                        </div>
                        <span style="background: ${this.stockFilter === 'out' ? '#ef4444' : '#e5e7eb'}; color: ${this.stockFilter === 'out' ? '#ffffff' : '#4b5563'}; padding: 0.25rem 0.75rem; border-radius: 1rem; font-weight: bold;">${dashboard.outOfStock}</span>
                    </button>
                    
                    <button class="stat-card stat-card-button ${this.stockFilter === 'expiring' ? 'stat-card-selected' : ''}"
                            style="flex: 1; margin: 0; padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; border-radius: 0.75rem; background: ${this.stockFilter === 'expiring' ? '#f5f3ff' : '#ffffff'}; border: 1.5px solid ${this.stockFilter === 'expiring' ? '#8b5cf6' : '#e5e7eb'}; transition: all 0.2s;"
                            onclick="InventoryView.setStockFilter('expiring')">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.25rem;">⏳</span>
                            <span style="font-size: 0.95rem; font-weight: 600; color: ${this.stockFilter === 'expiring' ? '#6d28d9' : '#374151'};">Próx. a vencer</span>
                        </div>
                        <span style="background: ${this.stockFilter === 'expiring' ? '#8b5cf6' : '#e5e7eb'}; color: ${this.stockFilter === 'expiring' ? '#ffffff' : '#4b5563'}; padding: 0.25rem 0.75rem; border-radius: 1rem; font-weight: bold;">${dashboard.expiringSoon}</span>
                    </button>
                </div>
            </div>

            <!-- Distribución de Capital Colapsable -->
            <div style="margin-bottom: 2rem;">
                <button class="btn btn-secondary" 
                        style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); color: #94a3b8;" 
                        onclick="InventoryView.toggleCapitalDistribution()">
                    <span><span style="margin-right:0.5rem">🧩</span> Ver Distribución de Capital por Categoría</span>
                    <span>${this.showCapitalDist ? '▲ Ocultar' : '▼ Mostrar Detalles'}</span>
                </button>
                
                ${this.showCapitalDist ? `
                <div class="animate-slide-down" style="margin-top: 1rem; background: rgba(15, 23, 42, 0.4); border-radius: 1rem; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
                        ${dashboard.categoryDistribution.map(cat => {
            const barColor = cat.percent > 15 ? '#60a5fa' : (cat.percent > 5 ? '#34d399' : '#94a3b8');
            return `
                            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; padding: 1.25rem; position: relative; transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                                    <h4 style="margin: 0; font-size: 1rem; color: #e2e8f0; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%; font-weight: 700;">${cat.name}</h4>
                                    <div style="text-align: right;">
                                        <div style="font-size: 0.85rem; font-weight: 700; color: ${barColor};">${cat.percent.toFixed(1)}% peso</div>
                                        <div style="font-size: 0.75rem; color: #34d399; font-weight: 600;">+${cat.margin.toFixed(1)}% mg</div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="font-size: 0.75rem; color: #94a3b8;">Capital:</span>
                                        <span style="font-size: 1.1rem; font-weight: 700; color: #fff;">${formatCLP(cat.capital)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="font-size: 0.75rem; color: #6ee7b7;">G. Bruta:</span>
                                        <span style="font-size: 1.1rem; font-weight: 700; color: #34d399;">+${formatCLP(cat.profit)}</span>
                                    </div>
                                </div>

                                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.75rem;">${cat.count} productos registrados</div>
                                
                                <!-- Barra de progreso visual -->
                                <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${cat.percent}%; height: 100%; background: ${barColor}; box-shadow: 0 0 10px ${barColor}44;"></div>
                                </div>
                            </div>
                            `;
        }).join('')}
                    </div>
                </div>` : ''}
            </div>

            ${this.stockFilter ? this.renderStockAlerts() : this.renderRecentMovements()}
        `;
    },

    toggleCapitalDistribution() {
        this.showCapitalDist = !this.showCapitalDist;
        app.navigate('inventory');
    },

    renderBulkAdjustmentForm() {
        return `
            <div class="card" style="border-top: 4px solid var(--primary); padding: 2rem;">
                <h3 style="margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem; font-size: 1.6rem;">
                    <span style="font-size: 2rem;">📋</span> Registro Masivo de Bajas de Stock
                </h3>

                <div style="margin-bottom: 2.5rem;">
                    <label style="color: #94a3b8; font-size: 1.1rem; margin-bottom: 1rem; display: block; font-weight: 600;">1. Selecciona el Tipo de Registro (Crucial para Reportes)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <button onclick="InventoryView.setBulkMovementType('consumption')" 
                                class="btn" 
                                style="height: 100px; font-size: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.3s;
                                background: ${this.selectedBulkType === 'consumption' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.2))' : 'rgba(31, 41, 55, 0.4)'};
                                border: 2px solid ${this.selectedBulkType === 'consumption' ? '#60a5fa' : 'rgba(255,255,255,0.05)'};
                                box-shadow: ${this.selectedBulkType === 'consumption' ? '0 10px 25px rgba(59, 130, 246, 0.25)' : 'none'};
                                color: ${this.selectedBulkType === 'consumption' ? '#fff' : '#94a3b8'};">
                            <span style="font-size: 2rem;">🍴</span>
                            <strong>Consumo Interno (Casa / Local)</strong>
                        </button>
                        
                        <button onclick="InventoryView.setBulkMovementType('loss')" 
                                class="btn" 
                                style="height: 100px; font-size: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.3s;
                                background: ${this.selectedBulkType === 'loss' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(220, 38, 38, 0.2))' : 'rgba(31, 41, 55, 0.4)'};
                                border: 2px solid ${this.selectedBulkType === 'loss' ? '#f87171' : 'rgba(255,255,255,0.05)'};
                                box-shadow: ${this.selectedBulkType === 'loss' ? '0 10px 25px rgba(239, 68, 68, 0.25)' : 'none'};
                                color: ${this.selectedBulkType === 'loss' ? '#fff' : '#94a3b8'};">
                            <span style="font-size: 2rem;">🗑️</span>
                            <strong>Pérdida / Merma / Vencimiento</strong>
                        </button>
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <label style="color: #94a3b8; font-size: 1.1rem; margin-bottom: 0.75rem; display: block; font-weight: 600;">2. Agregar Productos a Descontar</label>
                    <div class="form-group" style="background: rgba(15, 23, 42, 0.4); padding: 1.5rem; border-radius: 1rem; border: 1px dashed ${this.selectedBulkType === 'consumption' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
                        <div class="search-box" style="position: relative;">
                            <input type="text" 
                                   id="bulkSearchInput" 
                                   class="form-control" 
                                   placeholder="🔍 Escanea código o busca el producto..."
                                   autofocus
                                   style="font-size: 1.2rem; padding: 1.2rem; background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.1); border-radius: 0.75rem;"
                                   oninput="InventoryView.handleBulkSearch(event)">
                            <div id="bulkSearchResults" class="inventory-search-results" style="margin-top: 0.5rem;"></div>
                        </div>
                    </div>
                </div>
                
                <div class="form-group" style="margin-top: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: #e2e8f0; font-size: 1.2rem; display: flex; align-items: center; justify-content: space-between;">
                        <span>📋 Productos en Lista de ${this.selectedBulkType === 'consumption' ? 'Consumo' : 'Pérdida'}</span>
                        <span id="bulkSelectedCount" style="font-size: 0.9rem; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 0.25rem 0.75rem; border-radius: 2rem;">0 seleccionados</span>
                    </h4>
                    <div id="bulkSelectedProducts">
                        <div class="empty-state" style="padding: 3rem; background: rgba(17, 24, 39, 0.4); border: 1px dashed rgba(255,255,255,0.1); border-radius: 1rem; text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">🛒</div>
                            <p style="color: #94a3b8; font-size: 1.1rem; margin-bottom: 0;">Aún no has agregado productos</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 2rem; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 1rem;">
                    <div class="form-group" style="margin: 0;">
                        <label style="color: #94a3b8; font-weight: 600;">Motivo General de la Transacción (opcional)</label>
                        <input type="text" id="bulkReason" class="form-control" 
                               placeholder="Ej: Consumo de personal, Producto con empaque dañado, etc..." 
                               style="font-size: 1.1rem; padding: 0.75rem; background: rgba(15, 23, 42, 0.8);">
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 2rem; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem;">
                    <button class="btn btn-secondary" onclick="InventoryView.resetBulkForm()" style="padding: 0.75rem 1.5rem; font-size: 1.1rem;">
                        Limpiar Formulario
                    </button>
                    <button class="btn ${this.selectedBulkType === 'consumption' ? 'btn-primary' : 'btn-danger'}" 
                            onclick="InventoryView.saveBulkAdjustment()" 
                            style="padding: 0.75rem 2rem; font-size: 1.1rem; font-weight: 700; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                        ✓ Confirmar Registro de Descuento
                    </button>
                </div>
            </div>
        `;
    },

    setBulkMovementType(type) {
        this.selectedBulkType = type;
        app.navigate('inventory');
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

    renderHistorySection(movements) {
        return `
            <div class="card">
                <h3 style="margin-bottom: 1.5rem; color: #fff; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem;">📚 Historial Completo de Movimientos (Últimos 500)</h3>
                <div id="fullMovementsTable">
                    ${this.renderMovements(movements.slice(0, 500))}
                </div>
            </div>
        `;
    },

    async switchSection(section) {
        this.currentSection = section;
        this.stockFilter = null; // Reset stock filter when switching sections
        // No necesitamos refreshData aquí si ProductsView.render/init lo hacen,
        // pero para asegurar que el cambio de tab se refleje usamos app.navigate
        await app.navigate('inventory');
    },

    async setStockFilter(filter) {
        this.stockFilter = filter;
        if (this.currentSection !== 'inventory') {
            this.currentSection = 'inventory';
        }
        await this.refreshData();
        app.navigate('inventory');
    },

    renderStockAlerts() {
        let title = '';
        let icon = '';
        let items = [];

        if (this.stockFilter === 'low') {
            title = 'Productos con Stock Bajo';
            icon = '⚠️';
            items = this.products.filter(p => !p.deleted && (parseFloat(p.stock) || 0) <= (parseFloat(p.minStock) || 0) && (parseFloat(p.stock) || 0) > 0);
        } else if (this.stockFilter === 'out') {
            title = 'Productos Sin Stock';
            icon = '🛑';
            items = this.products.filter(p => !p.deleted && (parseFloat(p.stock) || 0) <= 0);
        } else if (this.stockFilter === 'expiring') {
            title = 'Próximo a Vencer';
            icon = '⏳';
            const thirtyDays = new Date();
            thirtyDays.setDate(thirtyDays.getDate() + 30);
            items = this.products.filter(p => !p.deleted && p.expiryDate && new Date(p.expiryDate) <= thirtyDays);
        }

        // Agrupar por Categoría
        const grouped = items.reduce((acc, p) => {
            const cat = p.category || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
        }, {});

        const categories = Object.keys(grouped).sort();

        return `
            <div class="stock-alerts-list animate-fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div class="section-title" style="margin: 0;">
                        <span class="icon">${icon}</span> ${title} (${items.length})
                    </div>
                    <button class="btn btn-secondary" onclick="InventoryView.setStockFilter(null)">✖ Cerrar Vista</button>
                </div>

                ${categories.length === 0 ? `
                    <div class="card glass-panel" style="text-align: center; padding: 3rem; color: #94a3b8;">
                        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🎉</span>
                        No hay productos en esta condición. ¡Buen trabajo!
                    </div>
                ` : categories.map(catName => `
                    <div class="alert-category-group" style="margin-bottom: 2rem;">
                        <h3 style="color: #6ee7b7; border-bottom: 1px solid rgba(110, 231, 183, 0.2); padding-bottom: 0.5rem; margin-bottom: 1rem; font-size: 1.1rem; display: flex; justify-content: space-between;">
                            <span>📂 ${catName}</span>
                            <small style="color: #94a3b8; font-weight: normal;">${grouped[catName].length} ítems</small>
                        </h3>
                        <div class="card glass-panel" style="padding: 0; overflow: hidden;">
                            <table class="table compact-table" style="width: 100%; border-collapse: collapse;">
                                <thead style="background: rgba(0,0,0,0.2);">
                                    <tr>
                                        <th style="text-align: left; padding: 0.75rem 1rem;">Producto / Código</th>
                                        <th style="text-align: left; padding: 0.75rem 1rem;">Proveedor</th>
                                        <th style="text-align: center; padding: 0.75rem 1rem;">Stock Actual</th>
                                        <th style="text-align: center; padding: 0.75rem 1rem;">Mínimo</th>
                                        <th style="text-align: right; padding: 0.75rem 1rem;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${grouped[catName].map(p => {
            const stock = parseFloat(p.stock) || 0;
            const minStock = parseFloat(p.minStock) || 0;
            let stockColor = '#34d399'; // Verde
            let stockLabel = 'Stock OK';

            if (stock <= 0) {
                stockColor = '#ef4444'; // Rojo
                stockLabel = 'Sin Stock';
            } else if (stock <= minStock) {
                stockColor = '#fbbf24'; // Amarillo
                stockLabel = 'Stock Bajo';
            }

            return `
                                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                            <td style="padding: 0.75rem 1rem;">
                                                <div style="font-weight: 600; color: #e2e8f0;">${p.name}</div>
                                                <small style="color: #64748b;">${p.barcode || 'Sin código'}</small>
                                            </td>
                                            <td style="padding: 0.75rem 1rem; color: #94a3b8;">
                                                ${p.supplierName || '—'}
                                            </td>
                                            <td style="padding: 0.75rem 1rem; text-align: center;">
                                                <div style="color: ${stockColor}; font-weight: 800; font-size: 1.1rem;">
                                                    ${formatStock(p.stock, p.type === 'weight' ? 3 : 0)}
                                                </div>
                                                <small style="color: ${stockColor}; font-size: 0.65rem; text-transform: uppercase;">${stockLabel}</small>
                                            </td>
                                            <td style="padding: 0.75rem 1rem; text-align: center; color: #94a3b8; font-size: 0.9rem;">
                                                ${p.minStock || 0}
                                            </td>
                                            <td style="padding: 0.75rem 1rem; text-align: right;">
                                                <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="InventoryView.quickAdjustment(${p.id})" title="Corregir el stock de este producto">Ajustar</button>
                                                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="InventoryView.showKardex(${p.id})" title="Ver todos los movimientos que afectaron a este producto">Historial</button>
                                            </td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderRecentMovements() {
        const movements = this.recentMovements.slice(0, 15); // Show only recent movements
        return `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem;">
                    <h3 style="color: #fff; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem;">🔄 Últimos Movimientos de Stock</h3>
                    <div style="font-size: 0.85rem; color: var(--secondary);">Los últimos 15 registros</div>
                </div>
                <div id="movementsTable">
                    ${this.renderMovements(movements)}
                </div>
            </div>
        `;
    },

    async showKardex(productId) {
        const product = await Product.getById(productId);
        if (!product) {
            showNotification('Producto no encontrado', 'error');
            return;
        }
        const kardex = await StockService.getKardexByProduct(productId);
        const typeName = (t) => ({ sale: 'Venta', purchase: 'Compra', adjustment: 'Ajuste', loss: 'Pérdida', consumption: 'Consumo' }[t] || t);
        let rowsHtml = '';
        for (const r of kardex.rows) {
            const refText = r.reference != null && r.reference !== '' ? String(r.reference) : '-';
            const diag = [];
            if (r.noReference) diag.push('Sin ref.');
            if (r.isRollback) diag.push('Rollback');
            if (r.negativeBalance) diag.push('Saldo &lt; 0');
            const diagHtml = diag.length ? ` <span class="badge badge-warning" title="Diagnóstico">${diag.join(', ')}</span>` : '';
            rowsHtml += `
                <tr>
                    <td>${formatDateTime(r.date)}</td>
                    <td><span class="badge ${this.getMovementBadgeClass(r.type)}">${typeName(r.type)}</span>${diagHtml}</td>
                    <td>${refText}</td>
                    <td style="text-align: right; font-weight: 600; color: ${r.quantity >= 0 ? 'var(--success)' : 'var(--danger)'}">${r.sign}${Math.abs(r.quantity)}</td>
                    <td style="text-align: right; font-weight: 600;">${r.balanceAfter}</td>
                </tr>
            `;
        }
        const inconsistencyHtml = kardex.inconsistency
            ? `<div class="pos-alert" style="margin-bottom: 1rem; background: #fef2f2; border-color: var(--danger);"><strong>⚠️ INCONSISTENCIA DETECTADA:</strong> El saldo teórico por movimientos (${kardex.theoreticalBalance}) no coincide con el stock actual del producto (${kardex.currentStock}). No se ha modificado ningún dato.</div>`
            : '';
        const content = `
            <div style="margin-bottom: 1rem;">
                <p><strong>Producto:</strong> ${product.name}</p>
                <p><strong>Stock actual (Product.stock):</strong> ${kardex.currentStock} ${product.type === 'weight' ? 'kg' : 'un'}</p>
                <p><strong>Saldo teórico (suma de movimientos):</strong> ${kardex.theoreticalBalance}</p>
            </div>
            ${inconsistencyHtml}
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Referencia</th>
                            <th>Cantidad</th>
                            <th>Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="5" class="empty-state">No hay movimientos</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
        showModal(content, { title: 'Kardex de stock', width: '700px' });
    },

    renderMovements(movements) {
        if (movements.length === 0) {
            return '<div class="empty-state">No hay movimientos o cargando...</div>';
        }

        const typeIcons = { 'sale': '📉', 'purchase': '📦', 'adjustment': '⚖️', 'loss': '🗑️', 'consumption': '🍴' };

        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${movements.map(m => {
            const icon = typeIcons[m.type] || '📝';
            return `
                        <div style="background: rgba(17, 24, 39, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0.75rem; padding: 1rem; display: flex; gap: 1rem; align-items: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(31, 41, 55, 0.6)';" onmouseout="this.style.background='rgba(17, 24, 39, 0.4)';">
                            <div style="font-size: 1.5rem; width: 40px; height: 40px; background: rgba(0,0,0,0.2); border-radius: 50%; display: flex; justify-content: center; align-items: center;">
                                ${icon}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
                                    <strong id="product-name-${m.id}" style="font-size: 1rem; color: #fff; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 250px;">-</strong>
                                    <span style="font-size: 0.75rem; color: var(--secondary); white-space: nowrap;">${formatDateTime(m.date)}</span>
                                </div>
                                <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem;">
                                    <span class="badge ${this.getMovementBadgeClass(m.type)}">${this.getMovementTypeName(m.type)}</span>
                                    ${m.reason ? `<span style="color: #94a3b8; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.reason}</span>` : ''}
                                </div>
                            </div>
                            <div style="text-align: right; min-width: 60px;">
                                <strong style="font-size: 1.25rem; font-weight: 800; color: ${m.quantity >= 0 ? '#34d399' : '#f87171'}">
                                    ${m.quantity >= 0 ? '+' : ''}${m.quantity}
                                </strong>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    async initRecentMovements() {
        const movements = this.recentMovements;
        const limit = this.currentSection === 'history' ? Math.min(movements.length, 500) : Math.min(movements.length, 15);

        // Solo para secciones que muestran la tabla de movimientos rápidos
        if (this.currentSection === 'inventory' || this.currentSection === 'history') {
            for (const movement of movements.slice(0, limit)) {
                const product = this.products.find(p => p.id === movement.productId);
                const elem = document.getElementById(`product-name-${movement.id}`);
                if (elem && product) elem.textContent = product.name;
            }
        }

        if (this.currentSection === 'consumption-report') {
            await this.loadConsumptionReport();
        } else if (this.currentSection === 'loss-report') {
            await this.loadLossReport();
        } else if (this.currentSection === 'bulk-adjustment') {
            this.setupBulkSearchListeners();
            this.updateBulkSelectedProducts();
        }
    },

    setupBulkSearchListeners() {
        const searchInput = document.getElementById('bulkSearchInput');
        const resultsContainer = document.getElementById('bulkSearchResults');
        if (!searchInput || !resultsContainer) return;
        const onKeydown = async (e) => {
            const items = resultsContainer.querySelectorAll('.search-result-item');
            const visible = resultsContainer.style.display !== 'none' && items.length > 0;
            let idx = -1;
            items.forEach((it, i) => { if (it.classList.contains('selected')) idx = i; });
            if (e.key === 'Escape') {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
                searchInput.value = '';
                return;
            }
            if (e.key === 'ArrowDown' && visible) {
                e.preventDefault();
                const next = (idx + 1) % items.length;
                this.highlightBulkResult(next);
                return;
            }
            if (e.key === 'ArrowUp' && visible) {
                e.preventDefault();
                const prev = (idx <= 0 ? items.length - 1 : idx - 1);
                this.highlightBulkResult(prev);
                return;
            }
            if (e.key === 'Enter' && visible) {
                e.preventDefault();
                const sel = idx >= 0 ? items[idx] : items[0];
                const id = sel && (sel.dataset.productId || sel.getAttribute('data-product-id'));
                if (id) this.selectBulkProduct(parseInt(id, 10));
                return;
            }
        };
        searchInput.removeEventListener('keydown', searchInput._bulkKeydown);
        searchInput._bulkKeydown = onKeydown;
        searchInput.addEventListener('keydown', onKeydown);
        const closeDropdown = (e) => {
            if (resultsContainer && searchInput && !searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.style.display = 'none';
            }
        };
        document.removeEventListener('click', document._bulkCloseDropdown);
        document._bulkCloseDropdown = closeDropdown;
        document.addEventListener('click', closeDropdown);
    },

    selectedProducts: [],
    bulkSearchTimeout: null,
    bulkSearchResults: [],

    async handleBulkSearch(event) {
        const term = event.target.value.trim();
        const resultsContainer = document.getElementById('bulkSearchResults');
        const searchInput = document.getElementById('bulkSearchInput');
        if (!resultsContainer || !searchInput) return;

        const isBarcode = term.length >= 8 && !isNaN(term);
        if (isBarcode) {
            const product = await Product.getByBarcode(term);
            if (product) {
                searchInput.value = '';
                resultsContainer.style.display = 'none';
                this.showBulkQuantityModal(product);
                return;
            }
        }

        if (term.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            return;
        }

        if (this.bulkSearchTimeout) clearTimeout(this.bulkSearchTimeout);
        this.bulkSearchTimeout = setTimeout(async () => {
            const products = await Product.search(term);
            this.bulkSearchResults = products;
            this.showBulkSearchDropdown(products);
        }, 280);
    },

    showBulkSearchDropdown(products) {
        const resultsContainer = document.getElementById('bulkSearchResults');
        if (!resultsContainer) return;
        if (!products || products.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 1rem; color: var(--secondary);">No se encontraron productos</div>';
            resultsContainer.style.display = 'block';
            return;
        }
        resultsContainer.innerHTML = products.map((p, index) => `
            <div class="search-result-item inventory-search-item ${index === 0 ? 'selected' : ''}" 
                 data-index="${index}"
                 data-product-id="${p.id}"
                 onmouseover="InventoryView.highlightBulkResult(${index})"
                 onclick="InventoryView.selectBulkProduct(${p.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong class="inventory-search-name">${p.name}</strong>
                        <div class="inventory-search-stock">
                            <span>Stock disponible</span>
                            <strong>${formatStock(p.stock)} ${p.type === 'weight' ? 'kg' : 'un'}</strong>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge badge-info" style="font-size: 0.85rem;">Seleccionar</span>
                    </div>
                </div>
            </div>
        `).join('');
        resultsContainer.style.display = 'block';
        if (products.length > 0) this.highlightBulkResult(0);
    },

    highlightBulkResult(index) {
        const resultsContainer = document.getElementById('bulkSearchResults');
        if (!resultsContainer) return;
        const items = resultsContainer.querySelectorAll('.search-result-item');
        items.forEach((item, i) => item.classList.toggle('selected', i === index));
        const target = resultsContainer.querySelector(`.search-result-item[data-index="${index}"]`);
        if (target) target.scrollIntoView({ block: 'nearest' });
    },

    async selectBulkProduct(productId) {
        const resultsContainer = document.getElementById('bulkSearchResults');
        const searchInput = document.getElementById('bulkSearchInput');
        if (resultsContainer) { resultsContainer.innerHTML = ''; resultsContainer.style.display = 'none'; }
        if (searchInput) searchInput.value = '';
        const product = await Product.getById(productId);
        if (product) this.showBulkQuantityModal(product);
    },

    showBulkQuantityModal(product) {
        if (this.selectedProducts.some(p => p.id === product.id)) {
            showNotification('Este producto ya está en la lista', 'warning');
            return;
        }
        const isWeight = product.type === 'weight';
        const content = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 1.25rem; font-weight: bold; color: var(--primary); margin-bottom: 0.5rem;">${product.name}</div>
                <div style="font-size: 0.95rem; color: var(--secondary);">
                    Código: ${product.barcode || 'Sin código'} • Stock: ${product.stock} ${isWeight ? 'kg' : 'un'}
                </div>
            </div>
            <div class="form-group">
                <label>Cantidad a ajustar *</label>
                <input type="number" id="bulkModalQty" class="form-control" 
                       step="${isWeight ? '0.001' : '1'}" placeholder="${isWeight ? '0.001' : '1'}" 
                       style="font-size: 1.25rem; text-align: center; padding: 0.75rem;" autofocus>
                <small>${isWeight ? 'Kg (ej: 0.250, 1.5)' : 'Unidades'}. + sumar, − restar (solo en Ajuste de inventario).</small>
            </div>
        `;
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" data-action="bulk-add" onclick="InventoryView.addProductFromBulkModal(${product.id})">Agregar al ajuste</button>
        `;
        showModal(content, { title: 'Cantidad para ajuste', footer, width: '420px' });
        const qtyInput = document.getElementById('bulkModalQty');
        if (qtyInput) {
            setTimeout(() => { qtyInput.focus(); qtyInput.select(); }, 80);
            qtyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); InventoryView.addProductFromBulkModal(product.id); }
            });
        }
    },

    async addProductFromBulkModal(productId) {
        const product = await Product.getById(productId);
        const qtyInput = document.getElementById('bulkModalQty');
        if (!product || !qtyInput) return;

        let qty = parseFloat(qtyInput.value);

        // Si el campo está vacío, el valor por defecto es 1
        if (qtyInput.value === '') {
            qty = 1;
        }

        if (isNaN(qty) || qty === 0) {
            showNotification('Ingresa una cantidad distinta de 0', 'warning');
            return;
        }

        if (this.selectedProducts.some(p => p.id === productId)) {
            showNotification('Este producto ya está en la lista', 'warning');
            closeModal();
            return;
        }

        this.selectedProducts.push({
            id: productId,
            name: product.name,
            stock: product.stock,
            unit: product.type === 'weight' ? 'kg' : 'un',
            quantity: qty,
            cost: parseFloat(product.cost) || 0,
            price: parseFloat(product.price) || 0
        });
        this.updateBulkSelectedProducts();
        closeModal();
        const searchInput = document.getElementById('bulkSearchInput');
        if (searchInput) { searchInput.value = ''; searchInput.focus(); }
        showNotification(`${product.name} agregado`, 'success');
    },

    async addProductToBulk(productId) {
        const product = await Product.getById(productId);
        if (!product) return;
        if (this.selectedProducts.find(p => p.id === productId)) {
            showNotification('Este producto ya está en la lista', 'warning');
            return;
        }
        this.showBulkQuantityModal(product);
    },

    updateBulkSelectedProducts() {
        const container = document.getElementById('bulkSelectedProducts');
        const counter = document.getElementById('bulkSelectedCount');

        if (counter) {
            counter.textContent = `${this.selectedProducts.length} seleccionados`;
            counter.style.background = this.selectedProducts.length > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)';
            counter.style.color = this.selectedProducts.length > 0 ? '#34d399' : '#60a5fa';
        }

        if (this.selectedProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 3rem; background: rgba(17, 24, 39, 0.4); border: 1px dashed rgba(255,255,255,0.1); border-radius: 1rem; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">🛒</div>
                    <p style="color: #94a3b8; font-size: 1.1rem; margin-bottom: 0;">Aún no has agregado productos</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${this.selectedProducts.map((p, index) => {
            const diffValue = parseFloat(p.quantity) || 0;
            const isPositive = diffValue > 0;
            const isNegative = diffValue < 0;
            const colorIndicator = isPositive ? 'rgba(52, 211, 153, 0.2)' : (isNegative ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)');
            const textIndicator = isPositive ? '#34d399' : (isNegative ? '#f87171' : '#e2e8f0');

            return `
                    <div style="display: flex; align-items: center; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 0.75rem; padding: 1rem; transition: transform 0.2s, background 0.2s;" onmouseover="this.style.background='rgba(30, 41, 59, 0.8)'; this.style.transform='translateX(4px)';" onmouseout="this.style.background='rgba(15, 23, 42, 0.6)'; this.style.transform='translateX(0)';">
                        
                        <!-- Columna Info -->
                        <div style="flex: 1;">
                            <strong style="font-size: 1.1rem; color: #f8fafc; display: block; margin-bottom: 0.25rem;">${p.name}</strong>
                            <div style="display: flex; gap: 0.75rem; font-size: 0.82rem; color: #64748b; flex-wrap: wrap;">
                                <span style="background: rgba(0,0,0,0.3); padding: 0.2rem 0.5rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
                                    📦 Stock: <strong>${p.stock} ${p.unit}</strong>
                                </span>
                                <span style="background: rgba(59, 130, 246, 0.1); color: #93c5fd; padding: 0.2rem 0.5rem; border-radius: 0.5rem; border: 1px solid rgba(59, 130, 246, 0.1);">
                                    💰 Neto: <strong>${formatCLP(p.cost)}</strong>
                                </span>
                                <span style="background: rgba(16, 185, 129, 0.1); color: #6ee7b7; padding: 0.2rem 0.5rem; border-radius: 0.5rem; border: 1px solid rgba(16, 185, 129, 0.1);">
                                    🏷️ Venta: <strong>${formatCLP(p.price)}</strong>
                                </span>
                            </div>
                        </div>

                        <!-- Columna Input Ajuste -->
                        <div style="display: flex; align-items: center; gap: 1rem; margin-left: 1rem; padding-left: 1rem; border-left: 1px dashed rgba(255,255,255,0.1);">
                            <div style="display: flex; align-items: center; background: rgba(0,0,0,0.3); border-radius: 0.5rem; border: 1px solid ${colorIndicator}; overflow: hidden; transition: border-color 0.2s;">
                                <div style="background: ${colorIndicator}; color: ${textIndicator}; padding: 0.5rem 0.75rem; font-weight: bold; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; min-width: 40px;">
                                    ${isPositive ? '+' : (isNegative ? '−' : '±')}
                                </div>
                                <input type="number" 
                                       class="bulk-qty-input" 
                                       data-index="${index}"
                                       value="${p.quantity}" 
                                       step="${p.unit === 'kg' ? '0.001' : '1'}"
                                       placeholder="${p.unit === 'kg' ? '0.001' : '1'}"
                                       style="background: transparent; border: none; color: #fff; text-align: center; width: 100px; font-size: 1.25rem; font-weight: 600; padding: 0.5rem; outline: none;"
                                       oninput="InventoryView.updateProductQuantity(${index}, this.value); this.parentElement.style.borderColor = parseFloat(this.value) > 0 ? 'rgba(52, 211, 153, 0.2)' : (parseFloat(this.value) < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)'); this.previousElementSibling.textContent = parseFloat(this.value) > 0 ? '+' : (parseFloat(this.value) < 0 ? '−' : '±'); this.previousElementSibling.style.color = parseFloat(this.value) > 0 ? '#34d399' : (parseFloat(this.value) < 0 ? '#f87171' : '#e2e8f0'); this.previousElementSibling.style.background = parseFloat(this.value) > 0 ? 'rgba(52, 211, 153, 0.2)' : (parseFloat(this.value) < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)');"
                                       onkeypress="if(event.key === 'Enter') { event.preventDefault(); InventoryView.focusNextBulkInput(${index}); }">
                                <div style="color: #64748b; padding-right: 0.75rem; font-size: 0.85rem; font-weight: 500;">
                                    ${p.unit}
                                </div>
                            </div>
                            
                            <!-- Boton Quitar -->
                            <button class="btn" onclick="InventoryView.removeProductFromBulk(${index})" 
                                    style="background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2); width: 2.5rem; height: 2.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.3)';" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)';">
                                ✕
                            </button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
    },

    focusNextBulkInput(currentIndex) {
        const nextInput = document.querySelector(`.bulk-qty-input[data-index="${currentIndex + 1}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        } else {
            const searchInput = document.getElementById('bulkSearchInput');
            const reasonEl = document.getElementById('bulkReason');
            if (searchInput) searchInput.focus();
            else if (reasonEl) reasonEl.focus();
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
        this.bulkSearchResults = [];
        const searchInput = document.getElementById('bulkSearchInput');
        const resultsEl = document.getElementById('bulkSearchResults');
        const typeEl = document.getElementById('bulkMovementType');
        const reasonEl = document.getElementById('bulkReason');
        if (searchInput) searchInput.value = '';
        if (resultsEl) { resultsEl.innerHTML = ''; resultsEl.style.display = 'none'; }
        this.selectedBulkType = 'consumption';
        if (reasonEl) reasonEl.value = '';
        this.updateBulkSelectedProducts();
        if (searchInput) searchInput.focus();
    },

    async saveBulkAdjustment() {
        if (this.selectedProducts.length === 0) {
            showNotification('Debes seleccionar al menos un producto', 'warning');
            return;
        }
        const reasonEl = document.getElementById('bulkReason');
        const type = this.selectedBulkType;
        const reason = (reasonEl && reasonEl.value ? reasonEl.value.trim() : '') || (type === 'consumption' ? 'Consumo masivo' : 'Pérdida masiva');
        const invalidProducts = this.selectedProducts.filter(p => p.quantity === 0);
        if (invalidProducts.length > 0) {
            showNotification('Todos los productos deben tener cantidad distinta de 0', 'warning');
            return;
        }
        const absInvalid = this.selectedProducts.some(p => p.quantity < 0);
        if (absInvalid) {
            showNotification('En pérdida o consumo masivo la cantidad debe ser positiva (el sistema la descontará solo)', 'warning');
            return;
        }
        try {
            await StockService.applyBulkAdjustmentAtomic(this.selectedProducts, type, reason);
            showNotification(`Ajuste masivo guardado (${this.selectedProducts.length} productos)`, 'success');
            this.resetBulkForm();
            this.currentSection = 'inventory';
            await this.refreshData();
            app.navigate('inventory');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async loadConsumptionReport() {
        const allMovements = await StockMovement.getByType('consumption');
        const container = document.getElementById('consumptionReportContent');

        if (!container) return;

        // Filtrar por fecha seleccionada (Día y Mes)
        const [targetY, targetM, targetD] = this.selectedConsumptionDate.split('-').map(Number);

        const dayMovements = allMovements.filter(m => {
            const mDate = new Date(m.date);
            return mDate.getFullYear() === targetY &&
                (mDate.getMonth() + 1) === targetM &&
                mDate.getDate() === targetD;
        });

        const monthMovements = allMovements.filter(m => {
            const mDate = new Date(m.date);
            return mDate.getFullYear() === targetY &&
                (mDate.getMonth() + 1) === targetM;
        });

        let dayTotalQty = 0;
        let dayTotalCost = 0;
        let monthTotalCost = 0;

        // Cálculos del mes
        for (const m of monthMovements) {
            const product = this.products.find(p => Number(p.id) === Number(m.productId));
            const costValue = parseFloat(m.cost_value) || (product ? (Math.abs(m.quantity) * (parseFloat(product.cost) || 0)) : 0);
            monthTotalCost += costValue;
        }

        let html = `
            <div style="background: rgba(15, 23, 42, 0.4); padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div>
                        <h3 style="margin: 0; color: #93c5fd; font-size: 1.1rem;">📅 Filtrar por Día</h3>
                        <p style="margin: 0.2rem 0 0 0; color: #64748b; font-size: 0.85rem;">Selecciona una fecha para revisar el detalle</p>
                    </div>
                    <input type="date" value="${this.selectedConsumptionDate}" 
                           onchange="InventoryView.setConsumptionDate(this.value)"
                           style="background: #0f172a; border: 1px solid rgba(59, 130, 246, 0.3); color: white; padding: 0.6rem 1rem; border-radius: 0.5rem; font-size: 1rem; outline: none;">
                </div>

                <div class="grid grid-3">
                    <div class="stat-card" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2);">
                        <h3>Total Items (Día)</h3>
                        <div class="value" style="color: #60a5fa;" id="consumptionDayQty">0</div>
                    </div>
                    <div class="stat-card" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2);">
                        <h3>Total Valor (Día)</h3>
                        <div class="value" style="color: #f87171;" id="consumptionDayCost">$0</div>
                    </div>
                    <div class="stat-card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2);">
                        <h3>Acumulado Mes (${formatMonthYear(this.selectedConsumptionDate)})</h3>
                        <div class="value" style="color: #34d399;" id="consumptionMonthCost">$0</div>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Producto</th>
                            <th style="text-align: center;">Cantidad</th>
                            <th style="text-align: right;">Costo (Neto)</th>
                            <th style="text-align: right;">P. Venta</th>
                            <th style="text-align: right;">Total Consumo</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody id="consumptionTableBody">
        `;

        if (dayMovements.length === 0) {
            html += `<tr><td colspan="6" style="padding: 3rem; text-align: center; color: #64748b;">No hay registros para este día seleccionado.</td></tr>`;
        } else {
            for (const m of dayMovements) {
                const product = this.products.find(p => p.id === m.productId);
                const costValue = m.cost_value || (product ? (Math.abs(m.quantity) * product.cost) : 0);
                const unitCost = product ? product.cost : (m.quantity !== 0 ? costValue / Math.abs(m.quantity) : 0);

                dayTotalQty += Math.abs(m.quantity);
                dayTotalCost += costValue;

                html += `
                    <tr>
                        <td style="color: #64748b;">${new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                            <strong style="color: #e2e8f0;">${product ? product.name : 'Producto no encontrado'}</strong>
                        </td>
                        <td style="text-align: center;"><span class="badge badge-warning">${Math.abs(m.quantity)}</span></td>
                        <td style="text-align: right; color: #94a3b8;">${formatCLP(unitCost)}</td>
                        <td style="text-align: right; color: #6ee7b7;">${product ? formatCLP(product.price) : '-'}</td>
                        <td style="text-align: right; font-weight: 700; color: #fca5a5;">${formatCLP(costValue)}</td>
                        <td><small style="color: #64748b;">${m.reason || '-'}</small></td>
                    </tr>
                `;
            }
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Update totals
        document.getElementById('consumptionDayQty').textContent = formatNumber(dayTotalQty);
        document.getElementById('consumptionDayCost').textContent = formatCLP(dayTotalCost);
        document.getElementById('consumptionMonthCost').textContent = formatCLP(monthTotalCost);
    },

    setConsumptionDate(date) {
        if (!date) return;
        this.selectedConsumptionDate = date;
        this.loadConsumptionReport();
    },

    async loadLossReport() {
        const allMovements = await StockMovement.getByType('loss');
        const container = document.getElementById('lossReportContent');

        if (!container) return;

        // Filtrar por fecha seleccionada (Día y Mes)
        const [targetY, targetM, targetD] = this.selectedLossDate.split('-').map(Number);

        const dayMovements = allMovements.filter(m => {
            const mDate = new Date(m.date);
            return mDate.getFullYear() === targetY &&
                (mDate.getMonth() + 1) === targetM &&
                mDate.getDate() === targetD;
        });

        const monthMovements = allMovements.filter(m => {
            const mDate = new Date(m.date);
            return mDate.getFullYear() === targetY &&
                (mDate.getMonth() + 1) === targetM;
        });

        let dayTotalQty = 0;
        let dayTotalCost = 0;
        let monthTotalCost = 0;

        // Cálculos del mes
        for (const m of monthMovements) {
            const product = this.products.find(p => Number(p.id) === Number(m.productId));
            const costValue = parseFloat(m.cost_value) || (product ? (Math.abs(m.quantity) * (parseFloat(product.cost) || 0)) : 0);
            monthTotalCost += costValue;
        }

        let html = `
            <div style="background: rgba(15, 23, 42, 0.4); padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <div>
                        <h3 style="margin: 0; color: #f87171; font-size: 1.1rem;">📅 Filtrar por Día</h3>
                        <p style="margin: 0.2rem 0 0 0; color: #64748b; font-size: 0.85rem;">Selecciona una fecha para revisar el detalle</p>
                    </div>
                    <input type="date" value="${this.selectedLossDate}" 
                           onchange="InventoryView.setLossDate(this.value)"
                           style="background: #0f172a; border: 1px solid rgba(239, 68, 68, 0.3); color: white; padding: 0.6rem 1rem; border-radius: 0.5rem; font-size: 1rem; outline: none;">
                </div>

                <div class="grid grid-3">
                    <div class="stat-card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
                        <h3>Total Items (Día)</h3>
                        <div class="value" style="color: #fca5a5;" id="lossDayQty">0</div>
                    </div>
                    <div class="stat-card" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2);">
                        <h3>Total Valor (Día)</h3>
                        <div class="value" style="color: #ef4444;" id="lossDayCost">$0</div>
                    </div>
                    <div class="stat-card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2);">
                        <h3>Acumulado Mes (${formatMonthYear(this.selectedLossDate)})</h3>
                        <div class="value" style="color: #34d399;" id="lossMonthCost">$0</div>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Producto</th>
                            <th style="text-align: center;">Cantidad</th>
                            <th style="text-align: right;">Costo (Neto)</th>
                            <th style="text-align: right;">P. Venta</th>
                            <th style="text-align: right;">Total Pérdida</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody id="lossTableBody">
        `;

        if (dayMovements.length === 0) {
            html += `<tr><td colspan="6" style="padding: 3rem; text-align: center; color: #64748b;">No hay registros para este día seleccionado.</td></tr>`;
        } else {
            for (const m of dayMovements) {
                const product = this.products.find(p => p.id === m.productId);
                const costValue = m.cost_value || (product ? (Math.abs(m.quantity) * product.cost) : 0);
                const unitCost = product ? product.cost : (m.quantity !== 0 ? costValue / Math.abs(m.quantity) : 0);

                dayTotalQty += Math.abs(m.quantity);
                dayTotalCost += costValue;

                html += `
                    <tr>
                        <td style="color: #64748b;">${new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                            <strong style="color: #e2e8f0;">${product ? product.name : 'Producto no encontrado'}</strong>
                        </td>
                        <td style="text-align: center;"><span class="badge badge-danger">${Math.abs(m.quantity)}</span></td>
                        <td style="text-align: right; color: #94a3b8;">${formatCLP(unitCost)}</td>
                        <td style="text-align: right; color: #6ee7b7;">${product ? formatCLP(product.price) : '-'}</td>
                        <td style="text-align: right; font-weight: 700; color: #fca5a5;">${formatCLP(costValue)}</td>
                        <td><small style="color: #64748b;">${m.reason || '-'}</small></td>
                    </tr>
                `;
            }
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Update totals
        document.getElementById('lossDayQty').textContent = formatNumber(dayTotalQty);
        document.getElementById('lossDayCost').textContent = formatCLP(dayTotalCost);
        document.getElementById('lossMonthCost').textContent = formatCLP(monthTotalCost);
    },

    setLossDate(date) {
        if (!date) return;
        this.selectedLossDate = date;
        this.loadLossReport();
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
            } else if (type === 'loss') {
                await StockMovement.createLoss(productId, Math.abs(quantity), reason);
            } else if (type === 'consumption') {
                await StockMovement.createConsumption(productId, Math.abs(quantity), reason);
            }

            showNotification('Ajuste de stock registrado', 'success');
            closeModal();
            await this.refreshData();
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
    },

    async showSetStockManuallyForm() {
        const products = await Product.getAll();
        const content = `
            <p style="margin-bottom: 1rem; color: var(--secondary);">Fija el stock de un producto al valor que indiques. Se registrará como ajuste (queda en el historial). Útil para cuadrar con inventario físico.</p>
            <form id="setStockManuallyForm">
                <div class="form-group">
                    <label>Producto *</label>
                    <select id="setStockProductId" class="form-control" required>
                        <option value="">Seleccionar producto...</option>
                        ${products.map(p => `
                            <option value="${p.id}" data-stock="${p.stock}" data-type="${p.type || 'unit'}">${p.name} — Stock actual: ${p.stock} ${p.type === 'weight' ? 'kg' : 'un'}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Stock actual (solo lectura)</label>
                    <input type="text" id="setStockCurrent" class="form-control" readonly style="background: var(--light);">
                </div>
                <div class="form-group">
                    <label>Nuevo stock (cantidad a la que quieres fijar) *</label>
                    <input type="number" id="setStockNew" class="form-control" min="0" step="0.001" required placeholder="Ej: 10">
                    <small id="setStockUnit">un</small>
                </div>
                <div class="form-group">
                    <label>Motivo * (ej: Conteo físico, corrección por desfase)</label>
                    <textarea id="setStockReason" class="form-control" rows="2" required placeholder="Obligatorio para auditoría"></textarea>
                </div>
            </form>
        `;
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="InventoryView.saveSetStockManually()">Aplicar y registrar ajuste</button>
        `;
        showModal(content, { title: 'Fijar stock manualmente', footer, width: '480px' });
        const sel = document.getElementById('setStockProductId');
        const currentInp = document.getElementById('setStockCurrent');
        const unitSpan = document.getElementById('setStockUnit');
        function updateCurrent() {
            const opt = sel.options[sel.selectedIndex];
            if (opt && opt.value) {
                currentInp.value = opt.getAttribute('data-stock') + ' ' + (opt.getAttribute('data-type') === 'weight' ? 'kg' : 'un');
                unitSpan.textContent = opt.getAttribute('data-type') === 'weight' ? 'kg' : 'un';
            } else {
                currentInp.value = '';
                unitSpan.textContent = 'un';
            }
        }
        sel.addEventListener('change', updateCurrent);
        updateCurrent();
    },

    async saveSetStockManually() {
        const productId = document.getElementById('setStockProductId').value;
        const newStock = parseFloat(document.getElementById('setStockNew').value); // Changed from 'setStockAmount' to 'setStockNew'
        const reason = document.getElementById('setStockReason').value;

        if (!productId) {
            showNotification('Seleccione un producto', 'warning');
            return;
        }
        if (isNaN(newStock) || newStock < 0) {
            showNotification('Ingrese una cantidad válida y mayor o igual a 0', 'warning');
            return;
        }
        if (!reason) {
            showNotification('El motivo es obligatorio', 'warning');
            return;
        }
        StockService.setStock(parseInt(productId), newStock, reason)
            .then(() => {
                showNotification('Stock establecido correctamente', 'success');
                closeModal();
                app.navigate('inventory'); // Changed from InventoryView.switchSection('inventory') to app.navigate('inventory')
            })
            .catch(err => {
                showNotification(err.message || 'Error al establecer el stock', 'error');
            });
    },

    renderAuditSection() {
        if (!this.auditState) {
            const categories = this.categories || [];
            const historyHtml = this.auditHistory.length > 0
                ? this.auditHistory.map(log => {
                    const loss = log.metadata.lossMoney || 0;
                    const extra = log.metadata.extraMoney || 0;
                    return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; color: #e2e8f0;">${log.metadata.categoryName || 'Desconocida'}</td>
                        <td style="padding: 1rem; color: #94a3b8;">${formatDateTime(log.timestamp)}</td>
                        <td style="padding: 1rem; text-align: right;">
                            <div style="color: #ef4444; font-size: 0.85rem; font-weight: 600;">-${formatCLP(loss)}</div>
                            <div style="color: #34d399; font-size: 0.85rem; font-weight: 600;">+${formatCLP(extra)}</div>
                        </td>
                        <td style="padding: 1rem; text-align: center;">
                            <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.85rem;">Completada</span>
                        </td>
                    </tr>
                `}).join('')
                : `<tr><td colspan="4" style="padding: 2rem; text-align: center; color: #64748b;">Aún no hay registros de auditorías finalizadas.</td></tr>`;

            return `
                <div class="card glass-panel">
                    <div style="text-align: center; max-width: 900px; margin: 0 auto; padding: 2rem 1rem;">
                        <h2 style="font-size: 2.2rem; color: #6ee7b7; margin-bottom: 1.5rem;">🔍 Auditoría y Cuadratura de Stock</h2>
                        
                        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; text-align: left;">
                            <!-- Columna Izquierda: Instrucciones y Selector -->
                            <div>
                                <div style="background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem;">
                                    <h3 style="color: #60a5fa; margin-top: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                                        💡 Instrucciones
                                    </h3>
                                    <ul style="color: #e2e8f0; line-height: 1.5; margin-bottom: 0; padding-left: 1.2rem; font-size: 0.95rem;">
                                        <li>Ingreso obligatorio para <u>TODOS</u> los productos.</li>
                                        <li>NO permite finalizar si olvidas algún producto.</li>
                                        <li>Usa el lector de barras para sumar de 1 en 1.</li>
                                        <li>Si hay stock 0 real, escribe "0" explícitamente.</li>
                                    </ul>
                                </div>

                                <div class="form-group" style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05);">
                                    <label style="font-size: 1rem; color: #94a3b8; margin-bottom: 1rem; display: block;">Escoger Categoría para iniciar:</label>
                                    <select id="auditCategorySelect" class="form-control" style="font-size: 1.1rem; padding: 0.8rem; background: #0f172a; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                                        <option value="">-- Seleccionar Categoría --</option>
                                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                                    </select>
                                    <button class="btn btn-primary" style="width: 100%; font-size: 1.1rem; padding: 1rem; background: linear-gradient(135deg, #10b981, #059669); font-weight: 700;" onclick="InventoryView.startAudit()">
                                        🚀 Comenzar Auditoría
                                    </button>
                                </div>
                            </div>

                            <!-- Columna Derecha: Historial -->
                            <div style="background: rgba(0,0,0,0.2); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); padding: 1.5rem;">
                                <h3 style="color: #94a3b8; margin-top: 0; margin-bottom: 1.5rem; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">
                                    📝 Últimas Auditorías Realizadas
                                </h3>
                                <div style="max-height: 350px; overflow-y: auto;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                        <thead>
                                            <tr style="text-align: left; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">
                                                <th style="padding-bottom: 0.8rem;">Categoría</th>
                                                <th style="padding-bottom: 0.8rem;">Fecha</th>
                                                <th style="padding-bottom: 0.8rem; text-align: right;">Pérdida/Sobrante</th>
                                                <th style="padding-bottom: 0.8rem; text-align: center;">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${historyHtml}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.auditState.status === 'counting') {
            const uncounted = this.auditState.items.filter(i => !i.counted).length;
            const matchedCount = this.auditState.items.filter(i => i.counted).length;
            const totalItems = this.auditState.items.length;
            const progress = totalItems > 0 ? (matchedCount / totalItems) * 100 : 0;

            return `
                <div class="card glass-panel" style="padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 2rem;">
                        <div style="flex: 1;">
                            <h2 style="color: #6ee7b7; margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                📦 Recuento: ${this.auditState.categoryName}
                            </h2>
                            <p id="audit-progress-text" style="color: ${uncounted > 0 ? '#fbbf24' : '#34d399'}; margin-top: 0.5rem; font-weight: 600;">
                                ${uncounted > 0 ? `⚠️ Faltan ${uncounted} productos por contar` : '✅ ¡Todos los productos han sido contados!'} 
                                (${progress.toFixed(0)}% completado)
                            </p>
                        </div>
                        <div style="text-align: right;">
                             <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
                                <strong>Regla:</strong> Debes tocar cada producto (mínimo poner 0) para poder finalizar.
                             </div>
                             <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2);" onclick="InventoryView.cancelAudit()">Abandonar Auditoría</button>
                        </div>
                    </div>

                    <div style="background: rgba(17, 24, 39, 0.6); padding: 1.5rem; border-radius: 1rem; border: 1px dashed rgba(59, 130, 246, 0.3); margin-bottom: 2rem;">
                        <label style="color: #93c5fd; font-size: 1rem; margin-bottom: 0.5rem; display: block;">🔍 Pistola o Código (Suma +1):</label>
                        <div style="display: flex; gap: 1rem;">
                            <input type="text" id="auditBarcode" class="form-control" placeholder="Escanea aquí..." style="font-size: 1.2rem; padding: 1rem; background: #0f172a; border-radius: 0.5rem; flex: 1;" autofocus onkeypress="if(event.key==='Enter') InventoryView.processAuditBarcode(this.value)">
                            <button class="btn btn-primary" onclick="InventoryView.processAuditBarcode(document.getElementById('auditBarcode').value)">Agregar Item</button>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.2); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; max-height: 50vh; overflow-y: auto;">
                        <table class="table" style="margin: 0; width: 100%;">
                            <thead style="position: sticky; top: 0; background: #1e293b; z-index: 10; box-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                                <tr>
                                    <th style="padding: 1rem;">Producto</th>
                                    <th style="padding: 1rem; text-align: center;">Stock Sistema</th>
                                    <th style="padding: 1rem; text-align: center;">Conteo Real</th>
                                    <th style="padding: 1rem; text-align: center;">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.auditState.items.map((item, index) => {
                const diff = (item.physicalCount || 0) - item.systemStock;
                const diffColor = diff === 0 ? '#34d399' : (diff < 0 ? '#ef4444' : '#fbbf24');
                const diffSign = diff > 0 ? '+' : '';
                return `
                                        <tr id="audit-row-${item.id}" style="background: ${item.counted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'}; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                            <td style="padding: 1rem;">
                                                <strong style="font-size: 1.05rem; color: #e2e8f0;">${item.name}</strong><br>
                                                <small style="color: #64748b;">${item.barcode || 'Sin código'}</small>
                                            </td>
                                            <td style="font-size: 1.2rem; color: #94a3b8; text-align: center; vertical-align: middle;">${item.systemStock}</td>
                                            <td style="vertical-align: middle; text-align: center;">
                                                <input type="number" class="form-control audit-qty-input" 
                                                       data-index="${index}"
                                                       style="width: 100px; text-align: center; background: #0f172a; display: inline-block; font-size: 1.1rem; padding: 0.5rem; border-width: 2px; border-color: ${item.counted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}" 
                                                       value="${item.counted ? item.physicalCount : ''}" 
                                                       placeholder="0"
                                                       min="0"
                                                       onchange="InventoryView.updateAuditPhysicalCount(${item.id}, this.value)" 
                                                       onkeydown="if(event.key === 'Enter') { event.preventDefault(); InventoryView.focusNextAuditInput(${index}); }"
                                                       title="Ingresa la cantidad física actual">
                                            </td>
                                            <td id="audit-status-${item.id}" style="vertical-align: middle; text-align: center;">
                                                ${item.counted
                        ? (diff === 0
                            ? `<span style="color: #34d399; font-weight: bold;">✔ OK</span>`
                            : `<span style="color: ${diffColor}; font-weight: bold;">${diffSign}${diff} dif.</span>`)
                        : '<span style="color:#ef4444; font-weight: bold; font-size: 0.8rem;">❌ PENDIENTE</span>'}
                                            </td>
                                        </tr>
                                    `;
            }).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem;">
                        <div style="color: #94a3b8; font-size: 0.9rem;">
                            <strong>Nota:</strong> Los productos en <span style="color: #ef4444;">rojo</span> aún no han sido contados.
                        </div>
                        <button class="btn btn-primary" 
                                style="background: ${uncounted > 0 ? '#334155' : 'rgba(16, 185, 129, 0.2)'}; color: ${uncounted > 0 ? '#94a3b8' : '#6ee7b7'}; border: 1px solid ${uncounted > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.4)'}; font-size: 1.2rem; padding: 1rem 2.5rem; cursor: ${uncounted > 0 ? 'not-allowed' : 'pointer'};" 
                                onclick="${uncounted > 0 ? "showNotification('Debes ingresar la cantidad de todos los productos (rojos) antes de continuar', 'error')" : 'InventoryView.finishAudit()'}">
                            📊 Ver Reporte y Sincronizar
                        </button>
                    </div>
                </div>
            `;
        }

        if (this.auditState.status === 'report') {
            const missing = this.auditState.items.filter(i => i.physicalCount < i.systemStock);
            const extra = this.auditState.items.filter(i => i.physicalCount > i.systemStock);
            const uncounted = this.auditState.items.filter(i => !i.counted);
            const lossMoney = missing.reduce((sum, i) => sum + ((i.systemStock - i.physicalCount) * parseFloat(i.cost || 0)), 0);

            let missingHtml = missing.length > 0 ? missing.map(i => `
                <div style="display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid rgba(239, 68, 68, 0.1);">
                    <span>${i.name}</span>
                    <strong style="color: #ef4444;">Faltan ${i.systemStock - i.physicalCount} (${i.physicalCount} en piso vs ${i.systemStock} en sistema)</strong>
                </div>
            `).join('') : '<div style="padding: 1rem; color: #94a3b8;">✅ Excelente: No hay productos faltantes 😊</div>';

            let extraHtml = extra.length > 0 ? extra.map(i => `
                <div style="display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid rgba(245, 158, 11, 0.1);">
                    <span>${i.name}</span>
                    <strong style="color: #f59e0b;">Sobran ${i.physicalCount - i.systemStock} (${i.physicalCount} en piso vs ${i.systemStock} en sistema)</strong>
                </div>
            `).join('') : '<div style="padding: 1rem; color: #94a3b8;">No se detectaron productos sobrantes o mágicos 🎉</div>';

            return `
                <div class="card glass-panel" style="padding: 2rem;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h2 style="font-size: 2rem; color: #6ee7b7; margin-bottom: 0.5rem;">Reporte Final de Auditoría y Filtro Mágico</h2>
                        <p style="color: #94a3b8; font-size: 1.1rem;">Resumen de las diferencias halladas en <strong>${this.auditState.categoryName}</strong></p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                        <!-- Faltantes -->
                        <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 1rem; padding: 1.5rem;">
                            <h3 style="color: #fca5a5; border-bottom: 1px solid rgba(239, 68, 68, 0.2); padding-bottom: 0.5rem; margin-top: 0; display: flex; justify-content: space-between;">
                                <span>🚨 Lo que falta encontrar (Merma)</span>
                                ${lossMoney > 0 ? `<span>Valor Perdido: ${formatCLP(lossMoney)}</span>` : ''}
                            </h3>
                            <div style="max-height: 250px; overflow-y: auto;">
                                ${missingHtml}
                            </div>
                        </div>

                        <!-- Sobrantes -->
                        <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 1rem; padding: 1.5rem;">
                            <h3 style="color: #fcd34d; border-bottom: 1px solid rgba(245, 158, 11, 0.2); padding-bottom: 0.5rem; margin-top: 0;">⚠️ Lo que sobrará en el inventario</h3>
                            <div style="max-height: 250px; overflow-y: auto;">
                                ${extraHtml}
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem; justify-content: flex-end; align-items: center;">
                        <button class="btn btn-secondary" style="font-size: 1.1rem; padding: 1rem 1.5rem;" onclick="InventoryView.backToCounting()">◀ Volver atrás y contar más</button>
                        <button class="btn btn-secondary" style="font-size: 1.1rem; padding: 1rem 1.5rem; color: #ef4444;" onclick="InventoryView.cancelAudit()">Borrar Resumen / Descartar TODO</button>
                        <button class="btn btn-primary" style="font-size: 1.2rem; padding: 1rem 2rem; background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);" onclick="InventoryView.applyAuditAdjustments()">
                            ✅ Corregir software y Ajustar Definitivamente
                        </button>
                    </div>
                </div>
            `;
        }

        return '';
    },

    startAudit() {
        const select = document.getElementById('auditCategorySelect');
        const categoryName = select.value;
        if (!categoryName) {
            showNotification('Selecciona la categoría a la que pertenece la estantería que contarás', 'warning');
            return;
        }

        const productsInCategory = this.allProducts.filter(p => (p.category || 'General') === categoryName);

        this.auditState = {
            categoryName,
            status: 'counting',
            items: productsInCategory.map(p => ({
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                cost: p.cost,
                systemStock: parseFloat(p.stock) || 0,
                physicalCount: 0,
                counted: false
            }))
        };
        app.navigate('inventory');
    },

    processAuditBarcode(barcode) {
        if (!barcode || !barcode.trim()) return;
        barcode = barcode.trim();
        const item = this.auditState.items.find(i => i.barcode === barcode);
        const input = document.getElementById('auditBarcode');
        if (input) {
            input.value = '';
            input.focus();
        }

        if (item) {
            item.physicalCount += 1;
            item.counted = true;
            app.navigate('inventory');
            showNotification(`+1 Sumado a producto: ${item.name}`, 'success');
        } else {
            showNotification(`Producto desconocido en esta categoría en la BBDD (Código: ${barcode})`, 'error');
        }
    },

    updateAuditPhysicalCount(productId, strValue) {
        const val = parseFloat(strValue);
        const item = this.auditState.items.find(i => i.id === productId);
        if (item && !isNaN(val) && val >= 0) {
            item.physicalCount = val;
            item.counted = true;

            const row = document.getElementById(`audit-row-${productId}`);
            const statusCell = document.getElementById(`audit-status-${productId}`);
            const inputField = document.querySelector(`#audit-row-${productId} input.audit-qty-input`);

            if (row && statusCell) {
                row.style.background = 'rgba(16, 185, 129, 0.05)';
                if (inputField) inputField.style.borderColor = 'rgba(16, 185, 129, 0.4)';

                const diff = item.physicalCount - item.systemStock;
                const diffColor = diff === 0 ? '#34d399' : (diff < 0 ? '#ef4444' : '#fbbf24');
                const diffSign = diff > 0 ? '+' : '';

                statusCell.innerHTML = diff === 0
                    ? `<span style="color: #34d399; font-weight: bold;">✔ OK</span>`
                    : `<span style="color: ${diffColor}; font-weight: bold;">${diffSign}${diff} dif.</span>`;
            }

            const progressHeader = document.getElementById('audit-progress-text');
            if (progressHeader) {
                const totalItems = this.auditState.items.length;
                const matchedCount = this.auditState.items.filter(i => i.counted).length;
                const progress = totalItems > 0 ? (matchedCount / totalItems) * 100 : 0;

                progressHeader.style.color = matchedCount === totalItems ? '#34d399' : '#fbbf24';
                progressHeader.innerHTML = matchedCount === totalItems
                    ? `✅ ¡Todos los productos han sido contados! (${progress.toFixed(0)}% completado)`
                    : `⚠️ Faltan ${totalItems - matchedCount} productos por contar (${progress.toFixed(0)}% completado)`;
            }

            // Forzar actualización del botón de finalizar si todos están contados
            const uncounted = this.auditState.items.filter(i => !i.counted).length;
            if (uncounted === 0) {
                app.navigate('inventory'); // Re-render para habilitar botón
            }
        }
    },

    focusNextAuditInput(currentIndex) {
        const nextInput = document.querySelector(`.audit-qty-input[data-index="${currentIndex + 1}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        } else {
            // Si es el último, intentar enfocar el botón de finalizar
            const finishBtn = document.querySelector('button[onclick*="finishAudit"]');
            if (finishBtn) finishBtn.focus();
        }
    },

    finishAudit() {
        if (!this.auditState) return;

        // Validación estricta: No permite avanzar si hay productos sin tocar
        const uncountedItems = this.auditState.items.filter(i => !i.counted);
        if (uncountedItems.length > 0) {
            showNotification(`¡Atención! Aún faltan ${uncountedItems.length} productos por contar. Debes ingresar un valor (aunque sea "0") para todos los productos en rojo.`, 'error');
            return;
        }

        this.auditState.status = 'report';
        app.navigate('inventory');
    },

    backToCounting() {
        if (!this.auditState) return;
        this.auditState.status = 'counting';
        app.navigate('inventory');
    },

    cancelAudit() {
        const modal = showModal(`
            <div style="padding: 1rem; text-align: center;">
                <p style="font-size: 1.1rem; margin-bottom: 2rem;">¿Estás seguro que deseas abandonar esta auditoría física? Perderás todo tu progreso de conteo.</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-secondary" onclick="closeModal()">No, volver</button>
                    <button class="btn" style="background: #ef4444; color: white; border: none; padding: 0.5rem 2rem; border-radius: 0.5rem;" onclick="InventoryView.performCancelAudit(); closeModal();">Sí, Abandonar</button>
                </div>
            </div>
        `, { title: 'Cancelar Auditoría', width: '500px' });
    },

    performCancelAudit() {
        this.auditState = null;
        app.navigate('inventory');
    },

    async applyAuditAdjustments() {
        try {
            // Solo se editan aquellos que tienen una diferencia con el sistema
            // Al llegar aquí, ya validamos en finishAudit que item.counted es true para todos
            const differences = this.auditState.items.filter(i => i.counted && i.physicalCount !== i.systemStock);

            if (differences.length === 0) {
                showNotification('¡Felicidades! Todo tu stock físico cuadró perfectamente con el sistema.', 'success');
                this.auditState = null;
                app.navigate('inventory');
                return;
            }

            const reason = `Ajuste Automático por Auditoría de Cat: ${this.auditState.categoryName}`;
            let adjustmentsMade = 0;

            for (const item of differences) {
                await StockService.setStock(item.id, item.physicalCount, reason);
                adjustmentsMade++;
            }

            showNotification(`¡Sincronización Exitosa! Se aplicaron ${adjustmentsMade} correcciones al inventario.`, 'success');

            // Calcular pérdidas y sobrantes monetarios para el log
            const missing = this.auditState.items.filter(i => i.physicalCount < i.systemStock);
            const extra = this.auditState.items.filter(i => i.physicalCount > i.systemStock);
            const lossMoney = missing.reduce((sum, i) => sum + ((i.systemStock - i.physicalCount) * parseFloat(i.cost || 0)), 0);
            const extraMoney = extra.reduce((sum, i) => sum + ((i.physicalCount - i.systemStock) * parseFloat(i.cost || 0)), 0);

            // Registrar en el log de auditoría para el historial
            await AuditLogService.log({
                entity: 'category_audit',
                entityId: 0,
                action: 'finish',
                summary: `Auditoría finalizada: ${this.auditState.categoryName}`,
                metadata: {
                    categoryName: this.auditState.categoryName,
                    adjustmentsMade,
                    itemsCounted: this.auditState.items.length,
                    lossMoney,
                    extraMoney
                }
            });

            this.auditState = null;
            await this.refreshData(); // Actualizar historial en la vista
            app.navigate('inventory');
        } catch (e) {
            showNotification('Error al ajustar automáticamente: ' + e.message, 'error');
        }
    }
};
