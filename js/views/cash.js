const CashView = {
    async render() {
        const openCash = await CashRegister.getOpen();
        const history = await CashRegister.getAll();
        
        if (!openCash) {
            return this.renderOpenCashForm(history);
        } else {
            return this.renderCashSummary(openCash, history);
        }
    },
    
    renderOpenCashForm(history) {
        return `
            <div class="view-header">
                <h1>Control de Caja</h1>
                <p>Apertura y cierre de caja</p>
            </div>
            
            <div class="grid grid-2">
                <div class="card">
                    <h2 style="margin-bottom: 1.5rem;">Abrir Caja</h2>
                    
                    <form id="openCashForm" onsubmit="CashView.openCash(event)">
                        <div class="form-group">
                            <label>Monto Inicial (CLP) *</label>
                            <input type="number" 
                                   id="initialAmount" 
                                   class="form-control" 
                                   placeholder="0" 
                                   min="0" 
                                   required 
                                   autofocus>
                        </div>
                        
                        <button type="submit" class="btn btn-success btn-lg" style="width: 100%;">
                            Abrir Caja
                        </button>
                    </form>
                </div>
                
                <div class="card">
                    <h3 style="margin-bottom: 1rem;">Información</h3>
                    <div style="background: var(--light); padding: 1rem; border-radius: 0.375rem;">
                        <p style="margin-bottom: 0.5rem;">✓ Registra el monto inicial de efectivo</p>
                        <p style="margin-bottom: 0.5rem;">✓ Todas las ventas se asociarán a esta caja</p>
                        <p>✓ Podrás cerrar la caja al final del día</p>
                    </div>
                </div>
            </div>
            
            ${history.length > 0 ? `
                <div class="card" style="margin-top: 1.5rem;">
                    <h3 style="margin-bottom: 1rem;">Historial de Cajas</h3>
                    ${this.renderCashHistory(history.slice(0, 10))}
                </div>
            ` : ''}
        `;
    },
    
    async renderCashSummary(cashRegister, history) {
        const summary = await CashRegister.getSummary(cashRegister.id);
        const sales = await Sale.getByCashRegister(cashRegister.id);
        
        // Get Daily Breakdown
        const dailyBreakdown = await CashController.getDailySales(cashRegister.id);
        const todayDate = new Date().toLocaleDateString('es-CL');
        const todaySales = dailyBreakdown.find(d => d.date === todayDate) || { total: 0, count: 0 };
        
        // Calculate Duration
        const startTime = new Date(cashRegister.openDate);
        const now = new Date();
        const diffMs = now - startTime;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        let durationText = '';
        if (diffDays > 0) {
            durationText = `<span class="badge badge-warning" style="font-size: 0.9rem;">Abierta hace ${diffDays} día(s)</span>`;
        }

        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1>Control de Caja</h1>
                        <p>
                            Caja abierta - ${formatDateTime(cashRegister.openDate)}
                            ${durationText}
                        </p>
                    </div>
                    <button class="btn btn-danger btn-lg" onclick="CashView.showCloseCashForm()">
                        Cerrar Caja
                    </button>
                </div>
            </div>
            
            <!-- TODAY SUMMARY -->
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem; border-bottom: 2px solid var(--primary); padding-bottom: 0.5rem; display: inline-block;">
                    📅 Resumen de Hoy (${todayDate})
                </h3>
                <div class="grid grid-2">
                    <div class="stat-card" style="background: linear-gradient(135deg, #e0f2fe 0%, #ffffff 100%); border: 1px solid #bae6fd;">
                        <h3>Ventas Hoy</h3>
                        <div class="value" style="color: var(--primary);">${todaySales.count}</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #dcfce7 0%, #ffffff 100%); border: 1px solid #bbf7d0;">
                        <h3>Total Vendido Hoy</h3>
                        <div class="value" style="color: var(--secondary);">${formatCLP(todaySales.total)}</div>
                    </div>
                </div>
            </div>

            <!-- GLOBAL SESSION SUMMARY -->
            <h3 style="margin-bottom: 1rem; opacity: 0.8;">📊 Totales de la Sesión (Acumulado)</h3>
            <div class="grid grid-4">
                <div class="stat-card">
                    <h3>Monto Inicial</h3>
                    <div class="value">${formatCLP(cashRegister.initialAmount)}</div>
                </div>
                <div class="stat-card">
                    <h3>Total Ventas (Global)</h3>
                    <div class="value">${summary.totalSales}</div>
                </div>
                <div class="stat-card">
                    <h3>Pagos de Deuda</h3>
                    <div class="value" style="color: var(--success);">${formatCLP(summary.totalDebtPayments)}</div>
                </div>
                <div class="stat-card">
                    <h3>Efectivo Esperado</h3>
                    <div class="value" style="color: var(--primary);">
                        ${formatCLP(cashRegister.initialAmount + (summary.paymentSummary?.cash || 0))}
                    </div>
                </div>
            </div>
            
            <div class="grid grid-2">
                <div class="card">
                    <h3 style="margin-bottom: 1rem;">Resumen por Método de Pago (Global)</h3>
                    <p style="font-size: 0.9rem; color: var(--secondary); margin-bottom: 1rem;">Incluye ventas y pagos de deuda de toda la sesión</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Método</th>
                                <th style="text-align: right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>💵 Efectivo</td>
                                <td style="text-align: right;"><strong>${formatCLP(summary.paymentSummary?.cash || 0)}</strong></td>
                            </tr>
                            <tr>
                                <td>💳 Tarjeta</td>
                                <td style="text-align: right;"><strong>${formatCLP(summary.paymentSummary?.card || 0)}</strong></td>
                            </tr>
                            <tr>
                                <td>📱 QR</td>
                                <td style="text-align: right;"><strong>${formatCLP(summary.paymentSummary?.qr || 0)}</strong></td>
                            </tr>
                            <tr>
                                <td>➕ Otro</td>
                                <td style="text-align: right;"><strong>${formatCLP(summary.paymentSummary?.other || 0)}</strong></td>
                            </tr>
                            <tr style="border-top: 2px solid var(--border); font-size: 1.1rem;">
                                <td><strong>Total</strong></td>
                                <td style="text-align: right;"><strong>${formatCLP(summary.totalAmount)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="card">
                    <h3 style="margin-bottom: 1rem;">🗓️ Desglose Diario de la Sesión</h3>
                    <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Cant.</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dailyBreakdown.map(day => `
                                    <tr style="${day.date === todayDate ? 'background-color: #f0fdf4;' : ''}">
                                        <td>
                                            ${day.date}
                                            ${day.date === todayDate ? '<span class="badge badge-success" style="margin-left:5px; font-size: 0.7em;">HOY</span>' : ''}
                                        </td>
                                        <td>${day.count}</td>
                                        <td><strong>${formatCLP(day.total)}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderRecentSales(sales) {
        if (sales.length === 0) {
            return '<div class="empty-state">No hay ventas</div>';
        }
        
        return `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Hora</th>
                        <th>Items</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(s => `
                        <tr>
                            <td>${s.saleNumber}</td>
                            <td>${formatTime(s.date)}</td>
                            <td>${s.items.length}</td>
                            <td><strong>${formatCLP(s.total)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    renderCashHistory(history) {
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Apertura</th>
                            <th>Cierre</th>
                            <th>Duración</th>
                            <th>Inicial</th>
                            <th>Ventas</th>
                            <th>Final</th>
                            <th>Esperado</th>
                            <th>Diferencia</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(c => {
                            let duration = '-';
                            if (c.closeDate) {
                                const diffMs = new Date(c.closeDate) - new Date(c.openDate);
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                duration = `${diffDays > 0 ? diffDays + 'd ' : ''}${diffHrs}h`;
                            }
                            
                            return `
                            <tr>
                                <td>${formatDateTime(c.openDate)}</td>
                                <td>${c.closeDate ? formatDateTime(c.closeDate) : '-'}</td>
                                <td>${duration}</td>
                                <td>${formatCLP(c.initialAmount)}</td>
                                <td>${c.paymentSummary ? formatCLP(Object.values(c.paymentSummary).reduce((a,b) => a+b, 0)) : '-'}</td>
                                <td>${c.finalAmount ? formatCLP(c.finalAmount) : '-'}</td>
                                <td>${c.expectedAmount ? formatCLP(c.expectedAmount) : '-'}</td>
                                <td>
                                    ${c.difference !== 0 ? `
                                        <span class="badge ${c.difference > 0 ? 'badge-success' : 'badge-danger'}">
                                            ${formatCLP(c.difference)}
                                        </span>
                                    ` : '-'}
                                </td>
                                <td>
                                    <span class="badge ${c.status === 'open' ? 'badge-success' : 'badge-info'}">
                                        ${c.status === 'open' ? 'Abierta' : 'Cerrada'}
                                    </span>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    async openCash(event) {
        event.preventDefault();
        
        const amount = parseFloat(document.getElementById('initialAmount').value);
        
        try {
            await CashController.openCash(amount);
            app.navigate('cash');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },
    
    async showCloseCashForm() {
        const openCash = await CashRegister.getOpen();
        const summary = await CashRegister.getSummary(openCash.id);
        
        const expectedCash = openCash.initialAmount + (summary.paymentSummary?.cash || 0);
        
        const content = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                <p style="margin-bottom: 0.5rem;"><strong>Efectivo Esperado:</strong> ${formatCLP(expectedCash)}</p>
                <p style="margin-bottom: 0.5rem;"><strong>Total en Tarjeta:</strong> ${formatCLP(summary.paymentSummary?.card || 0)}</p>
                <p><strong>Total Ventas:</strong> ${summary.totalSales}</p>
            </div>
            
            <form id="closeCashForm">
                <div class="form-group">
                    <label>Efectivo Real en Caja (CLP) *</label>
                    <input type="number" 
                           id="finalAmount" 
                           class="form-control" 
                           value="${expectedCash}" 
                           min="0" 
                           required 
                           autofocus>
                </div>
                
                <div id="differenceAlert" style="margin-top: 1rem;"></div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-danger" onclick="CashView.closeCash(${openCash.id})">Cerrar Caja</button>
        `;
        
        showModal(content, { title: 'Cerrar Caja', footer, width: '500px' });
        
        document.getElementById('finalAmount').addEventListener('input', (e) => {
            const final = parseFloat(e.target.value) || 0;
            const diff = final - expectedCash;
            
            const alert = document.getElementById('differenceAlert');
            
            if (diff !== 0) {
                const msg = diff > 0 ? 'Sobrante' : 'Faltante';
                const color = diff > 0 ? 'var(--secondary)' : 'var(--danger)';
                
                alert.innerHTML = `
                    <div style="padding: 1rem; background: ${color}15; border-left: 4px solid ${color}; border-radius: 0.375rem;">
                        <strong>${msg}: ${formatCLP(Math.abs(diff))}</strong>
                    </div>
                `;
            } else {
                alert.innerHTML = `
                    <div style="padding: 1rem; background: var(--secondary)15; border-left: 4px solid var(--secondary); border-radius: 0.375rem;">
                        <strong>✓ Cuadra perfecto</strong>
                    </div>
                `;
            }
        });
        
        document.getElementById('finalAmount').dispatchEvent(new Event('input'));
    },
    
    async closeCash(id) {
        const finalAmount = parseFloat(document.getElementById('finalAmount').value);
        
        try {
            await CashController.closeCash(id, finalAmount);
            closeModal();
            app.navigate('cash');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
};
