const ReportsView = {
    currentReport: 'daily',
    
    async render() {
        return `
            <div class="view-header">
                <h1>Reportes</h1>
                <p>Análisis y estadísticas del negocio</p>
            </div>
            
            <div class="card">
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <button class="btn ${this.currentReport === 'daily' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="ReportsView.showReport('daily')">
                        Ventas Diarias
                    </button>
                    <button class="btn ${this.currentReport === 'weekly' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="ReportsView.showReport('weekly')">
                        Ventas Semanales
                    </button>
                    <button class="btn ${this.currentReport === 'monthly' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="ReportsView.showReport('monthly')">
                        Ventas Mensuales
                    </button>
                    <button class="btn ${this.currentReport === 'products' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="ReportsView.showReport('products')">
                        Por Producto
                    </button>
                    <button class="btn ${this.currentReport === 'profitability' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="ReportsView.showReport('profitability')">
                        Rentabilidad
                    </button>
                    <button class="btn ${this.currentReport === 'stock' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="ReportsView.showReport('stock')">
                        Stock
                    </button>
                </div>
                
                <div id="reportContent">
                    ${await this.renderDailyReport()}
                </div>
            </div>
        `;
    },
    
    async showReport(type) {
        this.currentReport = type;
        
        let content = '';
        switch(type) {
            case 'daily':
                content = await this.renderDailyReport();
                break;
            case 'weekly':
                content = await this.renderWeeklyReport();
                break;
            case 'monthly':
                content = await this.renderMonthlyReport();
                break;
            case 'products':
                content = await this.renderProductsReport();
                break;
            case 'profitability':
                content = await this.renderProfitabilityReport();
                break;
            case 'stock':
                content = await this.renderStockReport();
                break;
        }
        
        document.getElementById('reportContent').innerHTML = content;
        
        const buttons = document.querySelectorAll('.card button');
        buttons.forEach(btn => {
            btn.className = btn.onclick.toString().includes(`'${type}'`) ? 'btn btn-primary' : 'btn btn-secondary';
        });
    },
    
    async renderDailyReport() {
        const today = new Date();
        const report = await ReportController.getDailySales(today);
        
        return `
            <h3>Ventas de Hoy - ${formatDate(today)}</h3>
            
            <div class="grid grid-3" style="margin: 1.5rem 0;">
                <div class="stat-card">
                    <h3>Número de Ventas</h3>
                    <div class="value">${report.totalSales}</div>
                </div>
                <div class="stat-card">
                    <h3>Total Vendido</h3>
                    <div class="value" style="color: var(--secondary);">${formatCLP(report.totalAmount)}</div>
                </div>
                <div class="stat-card">
                    <h3>Promedio por Venta</h3>
                    <div class="value" style="color: var(--primary);">
                        ${formatCLP(report.totalSales > 0 ? report.totalAmount / report.totalSales : 0)}
                    </div>
                </div>
            </div>
            
            ${this.renderSalesTable(report.sales)}
        `;
    },
    
    async updatePayment(saleId) {
        const sale = await Sale.getById(saleId);
        
        const content = `
            <div style="margin-bottom: 1.5rem;">
                <p><strong>Venta #${sale.saleNumber}</strong></p>
                <p>Total: ${formatCLP(sale.total)}</p>
                <p>Método actual: ${this.getPaymentMethodName(sale.paymentMethod)}</p>
            </div>
            
            <div class="form-group">
                <label>Nuevo Método de Pago</label>
                <select id="newPaymentMethod" class="form-control">
                    <option value="cash" ${sale.paymentMethod === 'cash' ? 'selected' : ''}>Efectivo</option>
                    <option value="card" ${sale.paymentMethod === 'card' ? 'selected' : ''}>Tarjeta</option>
                    <option value="qr" ${sale.paymentMethod === 'qr' ? 'selected' : ''}>QR</option>
                    <option value="other" ${sale.paymentMethod === 'other' ? 'selected' : ''}>Otro</option>
                </select>
            </div>
            
            <div style="background: #fef3c7; padding: 0.75rem; border-radius: 0.375rem; font-size: 0.85rem; margin-top: 1rem;">
                ⚠️ Al cambiar el método de pago, si era un pago mixto, se convertirá en un pago único del nuevo método seleccionado.
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="ReportsView.savePaymentUpdate(${saleId})">Guardar Cambios</button>
        `;
        
        showModal(content, { title: 'Corregir Método de Pago', footer, width: '400px' });
    },
    
    async savePaymentUpdate(saleId) {
        const newMethod = document.getElementById('newPaymentMethod').value;
        try {
            await ReportController.updateSalePayment(saleId, newMethod);
            closeModal();
            showNotification('Método de pago actualizado', 'success');
            // Refresh current report
            this.showReport(this.currentReport);
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
        }
    },
    
    async renderWeeklyReport() {
        const report = await ReportController.getWeeklySales();
        
        return `
            <h3>Ventas Semanales</h3>
            <p>${formatDate(report.startDate)} - ${formatDate(report.endDate)}</p>
            
            <div class="grid grid-3" style="margin: 1.5rem 0;">
                <div class="stat-card">
                    <h3>Número de Ventas</h3>
                    <div class="value">${report.totalSales}</div>
                </div>
                <div class="stat-card">
                    <h3>Total Vendido</h3>
                    <div class="value" style="color: var(--secondary);">${formatCLP(report.totalAmount)}</div>
                </div>
                <div class="stat-card">
                    <h3>Promedio por Venta</h3>
                    <div class="value" style="color: var(--primary);">
                        ${formatCLP(report.totalSales > 0 ? report.totalAmount / report.totalSales : 0)}
                    </div>
                </div>
            </div>
            
            ${this.renderSalesTable(report.sales)}
        `;
    },
    
    async renderMonthlyReport() {
        const now = new Date();
        const report = await ReportController.getMonthlySales(now.getFullYear(), now.getMonth());
        
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        return `
            <h3>Ventas de ${monthNames[report.month]} ${report.year}</h3>
            
            <div class="grid grid-3" style="margin: 1.5rem 0;">
                <div class="stat-card">
                    <h3>Número de Ventas</h3>
                    <div class="value">${report.totalSales}</div>
                </div>
                <div class="stat-card">
                    <h3>Total Vendido</h3>
                    <div class="value" style="color: var(--secondary);">${formatCLP(report.totalAmount)}</div>
                </div>
                <div class="stat-card">
                    <h3>Promedio por Venta</h3>
                    <div class="value" style="color: var(--primary);">
                        ${formatCLP(report.totalSales > 0 ? report.totalAmount / report.totalSales : 0)}
                    </div>
                </div>
            </div>
            
            ${this.renderSalesTable(report.sales)}
        `;
    },
    
    async renderProductsReport() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const products = await ReportController.getSalesByProduct(startDate, endDate);
        
        return `
            <h3>Ventas por Producto (Últimos 30 días)</h3>
            
            ${products.length === 0 ? '<div class="empty-state">No hay ventas en este período</div>' : `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cantidad Vendida</th>
                                <th>Total Vendido</th>
                                <th>% del Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(p => {
                                const totalSum = products.reduce((sum, item) => sum + item.total, 0);
                                const percentage = totalSum > 0 ? (p.total / totalSum * 100).toFixed(1) : 0;
                                return `
                                    <tr>
                                        <td><strong>${p.name}</strong></td>
                                        <td>${formatNumber(p.quantity)}</td>
                                        <td><strong>${formatCLP(p.total)}</strong></td>
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
                    </table>
                </div>
            `}
        `;
    },
    
    async renderProfitabilityReport() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const report = await ReportController.getProfitability(startDate, endDate);
        
        return `
            <h3>Rentabilidad (Últimos 30 días)</h3>
            
            <div class="grid grid-4" style="margin: 1.5rem 0;">
                <div class="stat-card">
                    <h3>Ingresos</h3>
                    <div class="value" style="color: var(--secondary);">${formatCLP(report.revenue)}</div>
                </div>
                <div class="stat-card">
                    <h3>Costos</h3>
                    <div class="value" style="color: var(--danger);">${formatCLP(report.cost)}</div>
                </div>
                <div class="stat-card">
                    <h3>Ganancia</h3>
                    <div class="value" style="color: var(--primary);">${formatCLP(report.profit)}</div>
                </div>
                <div class="stat-card">
                    <h3>Margen</h3>
                    <div class="value" style="color: var(--primary);">${report.margin.toFixed(1)}%</div>
                </div>
            </div>
            
            <div style="padding: 1.5rem; background: var(--light); border-radius: 0.5rem;">
                <h4 style="margin-bottom: 1rem;">Resumen Financiero</h4>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Ingresos por Ventas:</span>
                        <strong style="color: var(--secondary);">${formatCLP(report.revenue)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Costo de Productos Vendidos:</span>
                        <strong style="color: var(--danger);">-${formatCLP(report.cost)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 2px solid var(--border); font-size: 1.25rem;">
                        <strong>Ganancia Neta:</strong>
                        <strong style="color: var(--primary);">${formatCLP(report.profit)}</strong>
                    </div>
                </div>
            </div>
        `;
    },
    
    async renderStockReport() {
        const report = await ReportController.getStockReport();
        
        return `
            <h3>Reporte de Stock e Inventario</h3>
            
            <div class="grid grid-4" style="margin: 1.5rem 0;">
                <div class="stat-card">
                    <h3>Productos Totales</h3>
                    <div class="value">${report.totalProducts}</div>
                </div>
                <div class="stat-card">
                    <h3>Stock Bajo</h3>
                    <div class="value" style="color: var(--warning);">${report.lowStock.length}</div>
                </div>
                <div class="stat-card">
                    <h3>Sin Stock</h3>
                    <div class="value" style="color: var(--danger);">${report.outOfStock.length}</div>
                </div>
                <div class="stat-card">
                    <h3>Valor Inventario</h3>
                    <div class="value" style="color: var(--primary);">${formatCLP(report.totalValue)}</div>
                </div>
            </div>
            
            ${report.lowStock.length > 0 ? `
                <div style="margin-top: 1.5rem;">
                    <h4 style="margin-bottom: 1rem;">Productos con Stock Bajo</h4>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Stock Actual</th>
                                    <th>Stock Mínimo</th>
                                    <th>Valor Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.lowStock.map(p => `
                                    <tr>
                                        <td><strong>${p.name}</strong></td>
                                        <td>
                                            <span class="badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}">
                                                ${p.stock} ${p.type === 'weight' ? 'kg' : 'un'}
                                            </span>
                                        </td>
                                        <td>${p.minStock} ${p.type === 'weight' ? 'kg' : 'un'}</td>
                                        <td>${formatCLP(p.stock * p.cost)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : '<div class="empty-state">✓ Todos los productos tienen stock adecuado</div>'}
        `;
    },
    
    renderSalesTable(sales) {
        if (sales.length === 0) {
            return '<div class="empty-state">No hay ventas en este período</div>';
        }
        
        return `
            <div class="table-container" style="margin-top: 1.5rem;">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Fecha y Hora</th>
                            <th>Items</th>
                            <th>Método de Pago</th>
                            <th>Total</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sales.map(s => `
                            <tr>
                                <td>${s.saleNumber}</td>
                                <td>${formatDateTime(s.date)}</td>
                                <td>${s.items.length}</td>
                                <td>
                                    <span class="badge badge-info">
                                        ${this.getPaymentMethodName(s.paymentMethod)}
                                    </span>
                                </td>
                                <td><strong>${formatCLP(s.total)}</strong></td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" onclick="ReportsView.updatePayment(${s.id})" title="Corregir método de pago">
                                        ✏️
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    getPaymentMethodName(method) {
        const names = {
            cash: 'Efectivo',
            card: 'Tarjeta',
            qr: 'QR',
            other: 'Otro'
        };
        return names[method] || method;
    }
};
