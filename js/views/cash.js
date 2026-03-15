const CashView = {
    /**
     * Enrich open registers with getSummary so "Ventas" / total received are correct.
     * @param {Array} registers - From CashRegister.getAll()
     */
    async enrichHistoryWithSummaries(registers) {
        for (const r of registers) {
            if (r.status === 'open') {
                const s = await CashRegister.getSummary(r.id);
                if (s) {
                    r.paymentSummary = s.paymentSummary;
                    r.expectedAmount = s.expectedCash;
                }
            }
        }
    },

    async render() {
        const openCash = await CashRegister.getOpen();
        const history = await CashRegister.getAll();
        await this.enrichHistoryWithSummaries(history);

        if (!openCash) {
            return this.renderOpenCashForm(history);
        } else {
            return this.renderCashSummary(openCash, history);
        }
    },

    historyDateFilter: '',
    _cashHistoryDataset: [],

    renderOpenCashForm(history) {
        return `
            <div class="view-header">
                <h1 style="color: #111827;">Control de Caja</h1>
                <p style="color: #4b5563;">Apertura y cierre de caja</p>
            </div>
            
            <div class="grid grid-2 cash-open-grid">
                <div class="card cash-open-card">
                    <h2 style="margin-bottom: 1.5rem;">Abrir Caja</h2>
                    
                    <div class="cash-mode-switch" style="margin-bottom: 1rem;">
                        <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 0.5rem;">
                            <input type="radio" name="openMode" value="denominations" checked onchange="CashView.switchOpenMode()">
                            <span style="margin-left: 0.5rem;">Contar por denominaciones</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="radio" name="openMode" value="quick" onchange="CashView.switchOpenMode()">
                            <span style="margin-left: 0.5rem;">Ingreso rápido (monto total)</span>
                        </label>
                    </div>
                    
                    <form id="openCashForm" onsubmit="CashView.openCash(event)">
                        <div id="denominationsForm">
                            <h4 style="margin-bottom: 1rem;">Billetes</h4>
                            <div class="grid grid-2 denomination-grid" style="gap: 0.75rem; margin-bottom: 1rem;">
                                <div>
                                    <label style="font-size: 0.9rem;">$20.000</label>
                                    <input type="number" id="bill_20000" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                                <div>
                                    <label style="font-size: 0.9rem;">$10.000</label>
                                    <input type="number" id="bill_10000" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                                <div>
                                    <label style="font-size: 0.9rem;">$5.000</label>
                                    <input type="number" id="bill_5000" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                                <div>
                                    <label style="font-size: 0.9rem;">$2.000</label>
                                    <input type="number" id="bill_2000" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                                <div>
                                    <label style="font-size: 0.9rem;">$1.000</label>
                                    <input type="number" id="bill_1000" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                            </div>
                            
                            <h4 style="margin-bottom: 1rem;">Monedas</h4>
                            <div class="grid grid-2 denomination-grid" style="gap: 0.75rem; margin-bottom: 1rem;">
                                <div>
                                    <label style="font-size: 0.9rem;">$500</label>
                                    <input type="number" id="coin_500" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                                <div>
                                    <label style="font-size: 0.9rem;">$100</label>
                                    <input type="number" id="coin_100" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                                <div>
                                    <label style="font-size: 0.9rem;">$50</label>
                                    <input type="number" id="coin_50" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                                <div>
                                    <label style="font-size: 0.9rem;">$10</label>
                                    <input type="number" id="coin_10" class="form-control denomination-input" value="0" min="0" oninput="CashView.calculateTotal()">
                                </div>
                            </div>
                            
                            <div class="cash-total-display">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong>Total Calculado:</strong>
                                    <strong id="calculatedTotal" style="font-size: 1.25rem; color: var(--primary);">$0</strong>
                                </div>
                            </div>
                        </div>
                        
                        <div id="quickForm" style="display: none;">
                            <div class="form-group">
                                <label>Monto Total de Apertura (CLP) *</label>
                                <input type="number" 
                                       id="quickAmount" 
                                       class="form-control" 
                                       placeholder="0" 
                                       min="0" 
                                       required>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-success btn-lg" style="width: 100%;">
                            Abrir Caja
                        </button>
                    </form>
                </div>
                
                <div class="card cash-info-card">
                    <h3 style="margin-bottom: 1rem;">Información</h3>
                    <div class="cash-info-panel">
                        <p style="margin-bottom: 0.5rem;">✓ Registra el monto inicial de efectivo</p>
                        <p style="margin-bottom: 0.5rem;">✓ Puedes contar por denominaciones o ingresar monto total</p>
                        <p style="margin-bottom: 0.5rem;">✓ Todas las ventas se asociarán a esta caja</p>
                        <p>✓ Podrás cerrar la caja al final del día</p>
                    </div>
                </div>
            </div>
            
            ${history.length > 0 ? `
                <div class="card cash-history-panel">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">Historial de Cajas</h3>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <small style="color: var(--secondary);">Mostrando ${history.length} registro${history.length !== 1 ? 's' : ''}</small>
                            <button class="btn btn-info btn-sm" onclick="CashView.showAllCashRegistersHistory()">
                                📋 Ver Todos los Registros
                            </button>
                        </div>
                    </div>
                    ${this.renderCashHistory(history)}
                </div>
            ` : ''}
        `;
    },

    switchOpenMode() {
        const mode = document.querySelector('input[name="openMode"]:checked').value;
        const denominationsForm = document.getElementById('denominationsForm');
        const quickForm = document.getElementById('quickForm');

        if (mode === 'denominations') {
            denominationsForm.style.display = 'block';
            quickForm.style.display = 'none';
            document.getElementById('quickAmount').required = false;
        } else {
            denominationsForm.style.display = 'none';
            quickForm.style.display = 'block';
            document.getElementById('quickAmount').required = true;
            // Clear denomination inputs
            document.querySelectorAll('.denomination-input').forEach(input => input.value = 0);
            this.calculateTotal();
        }
    },

    calculateTotal() {
        const denominations = {
            bill_20000: 20000,
            bill_10000: 10000,
            bill_5000: 5000,
            bill_2000: 2000,
            bill_1000: 1000,
            coin_500: 500,
            coin_100: 100,
            coin_50: 50,
            coin_10: 10
        };

        let total = 0;
        for (const [id, value] of Object.entries(denominations)) {
            const input = document.getElementById(id);
            if (input) {
                total += (parseInt(input.value) || 0) * value;
            }
        }

        const totalElement = document.getElementById('calculatedTotal');
        if (totalElement) {
            totalElement.textContent = formatCLP(total);
        }

        // Update hidden input for form submission
        const initialAmountInput = document.getElementById('initialAmount');
        if (!initialAmountInput) {
            // Create hidden input if it doesn't exist
            const form = document.getElementById('openCashForm');
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'initialAmount';
            hiddenInput.name = 'initialAmount';
            form.appendChild(hiddenInput);
        }
        document.getElementById('initialAmount').value = total;
    },

    async renderCashSummary(cashRegister, history) {
        const summary = await CashRegister.getSummary(cashRegister.id);


        const dailyDetail = await CashController.getDailyDetail(cashRegister.id);
        this._dailyDetail = dailyDetail;
        this._activeSummary = summary;
        this._activeRegister = cashRegister;

        const todayKey = new Date().toLocaleDateString('es-CL');
        const todayDetail = dailyDetail.find(d => d.date === todayKey) || {
            sales: [], debtPayments: [], creditSales: [], cashMovementsOut: [], cashMovementsIn: []
        };

        const totalTodaySales = todayDetail.sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        const totalTodayDeudas = todayDetail.creditSales.reduce((sum, d) => sum + (parseFloat(d.remaining) || 0), 0);
        const totalSessionAnotados = dailyDetail.reduce((sum, day) => sum + day.creditSales.reduce((s, d) => s + d.remaining, 0), 0);

        const startTime = new Date(cashRegister.openDate);
        const now = new Date();
        const diffDays = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
        const durationDisplay = diffDays > 0 ? `Abierta hace ${diffDays} día(s)` : 'Abierta hoy';

        return `
            <div class="view-header animate-fade-in">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 2rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                            <h1 style="margin:0; color: #111827;">Control de Caja</h1>
                            <span class="badge badge-success" style="font-size: 0.9rem; padding: 0.4rem 0.8rem;">Caja Abierta #${cashRegister.id}</span>
                        </div>
                        <p style="margin:0; color: #4b5563;">
                            Desde ${formatDateTime(cashRegister.openDate)} • <span style="color: #059669; font-weight: 600;">${durationDisplay}</span>
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="CashView.showAllCashRegistersHistory()">
                            📚 Historial de Todas las Cajas
                        </button>
                        <button class="btn btn-secondary" onclick="CashView.showCashHistory(${cashRegister.id})">
                            📋 Historial de Esta Sesión
                        </button>
                    </div>
                </div>
            </div>

            <div class="cash-minimal-actions animate-fade-in" style="margin-bottom: 2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn btn-lg" onclick="CashView.showAddCashForm()" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; flex: 1; min-width: 180px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);" 
                        title="Registrar entrada de dinero extra a la caja (ej: sencillo, cambio)">
                    ➕ Agregar Dinero
                </button>
                <button class="btn btn-lg" onclick="CashView.showWithdrawCashForm()" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; flex: 1; min-width: 180px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);" 
                        title="Registrar salida de dinero (ej: pago a proveedores, fletes, gastos rápidos)">
                    ➖ Retirar Dinero
                </button>
                <button class="btn btn-lg" onclick="CashView.showCloseCashForm()" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; flex: 1; min-width: 180px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);" 
                        title="Finalizar el turno y contar el dinero total de la caja">
                    🔒 Cerrar Caja
                </button>
            </div>

            <div class="grid grid-2 animate-fade-in" style="gap: 1.5rem; margin-bottom: 2rem;">
                <!-- RESUMEN DEL DÍA -->
                <div class="card" style="padding: 1.5rem; border-top: 4px solid #4f46e5; background: #ffffff; border: 1.5px solid #d1d5db; border-top: 4px solid #4f46e5; border-radius: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    <h3 style="margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; color: #111827; font-size: 1.05rem;">
                        <span>📅</span> Resumen del Día (${todayKey})
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 1.25rem; border-radius: 0.75rem; text-align: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(59,130,246,0.15)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'" onclick="CashView.showVentasHoy()">
                            <span style="font-size: 0.75rem; color: #1d4ed8; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.4rem;">Ventas Hoy</span>
                            <div style="font-size: 1.65rem; font-weight: 800; color: #1d4ed8;">${formatCLP(totalTodaySales)}</div>
                            <small style="color: #3b82f6; font-weight: 600;">${todayDetail.sales.length} ventas ejecutadas</small>
                        </div>
                        <div style="background: #fef2f2; border: 1.5px solid #fecaca; padding: 1.25rem; border-radius: 0.75rem; text-align: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(239,68,68,0.15)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'" onclick="CashView.showDeudasHoy()">
                            <span style="font-size: 0.75rem; color: #dc2626; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.4rem;">Deudas del Día</span>
                            <div style="font-size: 1.65rem; font-weight: 800; color: #dc2626;">${formatCLP(totalTodayDeudas)}</div>
                            <small style="color: #ef4444; font-weight: 600;">${todayDetail.creditSales.length} fiados hoy</small>
                        </div>
                    </div>
                </div>

                <!-- EFECTIVO ESPERADO DETALLADO -->
                <div class="card" style="padding: 1.5rem; background: #ffffff; border: 1.5px solid #d1d5db; border-top: 4px solid #10b981; border-radius: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    <h3 style="margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; color: #111827; font-size: 1.05rem;">
                        <span>💸</span> Resumen de Efectivo
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem; justify-content: center; height: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #4b5563; font-weight: 600;">💰 Monto Inicial:</span>
                            <span style="font-weight: 800; font-size: 1.1rem; color: #111827;">${formatCLP(summary.initialAmount)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="CashView.showPaymentMethods()" title="Ver desglose de métodos de pago">
                            <span style="color: #4b5563; font-weight: 600;">🔄 Ingresos Netos de Efectivo:</span>
                            <span style="font-weight: 800; font-size: 1.1rem; color: #059669;">+${formatCLP(summary.cashForDisplay)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem;">
                            <span style="color: #111827; font-weight: 800; font-size: 1.05rem;">Efectivo Esperado Real:</span>
                            <span style="font-weight: 900; font-size: 1.75rem; color: #059669;">${formatCLP(summary.expectedCash)}</span>
                        </div>
                        <button class="btn btn-sm" style="margin-top: 0.5rem; align-self: center; background: #ecfdf5; color: #059669; border: 1.5px solid #6ee7b7; font-weight: 600;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'" onclick="CashView.showPaymentMethods()">
                            📊 Ver Todos los Métodos de Pago
                        </button>
                    </div>
                </div>
            </div>

            <h3 style="margin: 2rem 0 1.25rem 0; opacity: 0.8; display: flex; align-items: center; gap: 0.5rem;">
                <span>💳</span> Resumen por Medio de Pago (No Efectivo)
            </h3>
            
            <div class="grid grid-3 animate-fade-in" style="gap: 1rem; margin-bottom: 2rem;">
                <div class="module-card" style="border-left: 3px solid #60a5fa; padding: 1rem; flex-direction: row; align-items: center;">
                    <div class="module-icon" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa; width: 32px; height: 32px; font-size: 1rem;">💳</div>
                    <div class="module-info" style="gap: 0;">
                        <span class="label" style="font-size: 0.7rem;">Tarjeta</span>
                        <span class="val" style="color: #60a5fa; font-size: 1.2rem;">${formatCLP(summary.paymentSummary?.card || 0)}</span>
                    </div>
                </div>
                <div class="module-card" style="border-left: 3px solid #a78bfa; padding: 1rem; flex-direction: row; align-items: center;">
                    <div class="module-icon" style="background: rgba(167, 139, 250, 0.1); color: #a78bfa; width: 32px; height: 32px; font-size: 1rem;">📱</div>
                    <div class="module-info" style="gap: 0;">
                        <span class="label" style="font-size: 0.7rem;">QR / Digital</span>
                        <span class="val" style="color: #a78bfa; font-size: 1.2rem;">${formatCLP(summary.paymentSummary?.qr || 0)}</span>
                    </div>
                </div>
                <div class="module-card" style="border-left: 3px solid #94a3b8; padding: 1rem; flex-direction: row; align-items: center;">
                    <div class="module-icon" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8; width: 32px; height: 32px; font-size: 1rem;">➕</div>
                    <div class="module-info" style="gap: 0;">
                        <span class="label" style="font-size: 0.7rem;">Otro / Transf.</span>
                        <span class="val" style="color: #94a3b8; font-size: 1.2rem;">${formatCLP(summary.paymentSummary?.other || 0)}</span>
                    </div>
                </div>
            </div>

            <h3 style="margin-bottom: 1.25rem; opacity: 0.8; display: flex; align-items: center; gap: 0.5rem;">
                <span>📈</span> Totales Acumulados de la Sesión
            </h3>
            
            <div class="grid grid-4 animate-fade-in" style="gap: 1rem;">
                <!-- VENTAS SESIÓN -->
                <div class="module-card" onclick="CashView.showHistorialVentasSesion()">
                    <div class="module-icon" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa;">🛍️</div>
                    <div class="module-info">
                        <span class="label">Total Ventas</span>
                        <span class="val">${formatCLP(summary.totalSalesAmount)}</span>
                    </div>
                    <div class="module-footer">${summary.totalSales} tickets emitidos</div>
                </div>

                <!-- DEUDAS COBRADAS -->
                <div class="module-card" onclick="CashView.showClientesPagaron()">
                    <div class="module-icon" style="background: rgba(16, 185, 129, 0.1); color: #34d399;">💰</div>
                    <div class="module-info">
                        <span class="label">Deudas Cobradas</span>
                        <span class="val">${formatCLP(summary.totalDebtPayments)}</span>
                    </div>
                    <div class="module-footer">${summary.debtPayments.length} abonos recibidos</div>
                </div>

                <!-- FIADOS SESIÓN -->
                <div class="module-card" onclick="CashView.showAnotadosSesion()">
                    <div class="module-icon" style="background: rgba(239, 68, 68, 0.1); color: #f87171;">📝</div>
                    <div class="module-info">
                        <span class="label">Total Fiados</span>
                        <span class="val">${formatCLP(totalSessionAnotados)}</span>
                    </div>
                    <div class="module-footer">Ventas anotadas/deuda</div>
                </div>

                <!-- MOVIMIENTOS MANUALE -->
                <div class="module-card" onclick="CashView.showMovimientosManuales()">
                    <div class="module-icon" style="background: rgba(245, 158, 11, 0.1); color: #fbbf24;">🔁</div>
                    <div class="module-info">
                        <span class="label">Ingresos y Retiros</span>
                        <div style="display: flex; gap: 0.5rem; font-size: 0.8rem; font-weight: 600;">
                            <span style="color: #34d399;">+${formatCLP(summary.totalCashIn)}</span>
                            <span style="color: #f87171;">-${formatCLP(summary.totalRetiros)}</span>
                        </div>
                    </div>
                    <div class="module-footer">Gestión manual de efectivo</div>
                </div>
            </div>

            </div>

            <style>
                .module-card {
                    background: #ffffff;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 1rem;
                    padding: 1.25rem;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
                }
                .module-card:hover {
                    background: #f9fafb;
                    border-color: #9ca3af;
                    transform: translateY(-4px);
                    box-shadow: 0 10px 24px rgba(0,0,0,0.1);
                }
                .module-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                }
                .module-info .label {
                    display: block;
                    font-size: 0.78rem;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 700;
                    margin-bottom: 0.2rem;
                }
                .module-info .val {
                    display: block;
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: #111827;
                }
                .module-footer {
                    font-size: 0.75rem;
                    color: #9ca3af;
                    border-top: 1px solid #f3f4f6;
                    padding-top: 0.5rem;
                    margin-top: 0.25rem;
                }
            </style>
        `;
    },

    // --- DETALLE EN MODAL ---

    showVentasHoy() {
        const todayKey = new Date().toLocaleDateString('es-CL');
        const day = this._dailyDetail.find(d => d.date === todayKey);
        if (!day || day.sales.length === 0) {
            showNotification('No hay ventas registradas hoy', 'info');
            return;
        }

        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Hora</th><th>Nº Venta</th><th>Total</th><th>Pago</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                        ${day.sales.map(s => `
                            <tr>
                                <td>${formatTime(s.date)}</td>
                                <td>#${s.saleNumber ?? s.id}</td>
                                <td><strong>${formatCLP(s.total)}</strong></td>
                                <td>${this.getPaymentMethodName(s.paymentMethod)}</td>
                                <td>${this.getStatusLabel(s.status)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        showModal(html, { title: 'Ventas de Hoy', width: '700px' });
    },

    showDeudasHoy() {
        const todayKey = new Date().toLocaleDateString('es-CL');
        const day = this._dailyDetail.find(d => d.date === todayKey);
        if (!day || day.creditSales.length === 0) {
            showNotification('No hay deudas generadas hoy', 'info');
            return;
        }

        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Hora</th><th>Cliente</th><th>Total Venta</th><th>Abonado</th><th>Deuda Restante</th></tr>
                    </thead>
                    <tbody>
                        ${day.creditSales.map(d => `
                            <tr>
                                <td>${formatTime(d.date)}</td>
                                <td><strong>${d.customerName}</strong></td>
                                <td>${formatCLP(d.total)}</td>
                                <td>${formatCLP(d.paidAmount)}</td>
                                <td style="color: var(--danger);"><strong>${formatCLP(d.remaining)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        showModal(html, { title: 'Nuevas Deudas del Día (Fiados)', width: '750px' });
    },

    showHistorialVentasSesion() {
        // Agrupar todas las ventas de la sesión
        const allSales = this._dailyDetail.flatMap(d => d.sales).sort((a, b) => new Date(b.date) - new Date(a.date));

        const html = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; display: flex; justify-content: space-between;">
                <span>Total Acumulado: <strong>${formatCLP(this._activeSummary.totalSalesAmount)}</strong></span>
                <span>Cantidad: <strong>${allSales.length} ventas</strong></span>
            </div>
            <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr><th>Fecha/Hora</th><th>Nº Venta</th><th>Total</th><th>Pago</th></tr>
                    </thead>
                    <tbody>
                        ${allSales.map(s => `
                            <tr>
                                <td>${formatDateTime(s.date)}</td>
                                <td>#${s.saleNumber}</td>
                                <td><strong>${formatCLP(s.total)}</strong></td>
                                <td>${this.getPaymentMethodName(s.paymentMethod)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        showModal(html, { title: 'Historial de Ventas - Esta Sesión', width: '750px' });
    },

    showClientesPagaron() {
        const allPayments = this._dailyDetail.flatMap(d => d.debtPayments).sort((a, b) => new Date(b.date) - new Date(a.date));
        if (allPayments.length === 0) {
            showNotification('No hay abonos de deuda en esta sesión', 'info');
            return;
        }

        const html = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem;">
                Total Cobrado: <strong style="color: #34d399; font-size: 1.2rem;">${formatCLP(this._activeSummary.totalDebtPayments)}</strong>
            </div>
            <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr><th>Fecha/Hora</th><th>Cliente</th><th>Monto Recibido</th><th>Método</th></tr>
                    </thead>
                    <tbody>
                        ${allPayments.map(p => `
                            <tr>
                                <td>${formatDateTime(p.date)}</td>
                                <td><strong>${p.customerName}</strong></td>
                                <td style="color: #34d399;"><strong>${formatCLP(p.amount)}</strong></td>
                                <td>${this.getPaymentMethodName(p.paymentMethod)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        showModal(html, { title: 'Clientes que Pagaron Deuda - Esta Sesión', width: '750px' });
    },

    showAnotadosSesion() {
        const allCredits = this._dailyDetail.flatMap(d => d.creditSales).sort((a, b) => new Date(b.date) - new Date(a.date));
        if (allCredits.length === 0) {
            showNotification('No hay ventas a crédito en esta sesión', 'info');
            return;
        }

        const html = `
            <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr><th>Fecha/Hora</th><th>Cliente</th><th>Total Venta</th><th>Anotado a Deuda</th></tr>
                    </thead>
                    <tbody>
                        ${allCredits.map(d => `
                            <tr>
                                <td>${formatDateTime(d.date)}</td>
                                <td><strong>${d.customerName}</strong></td>
                                <td>${formatCLP(d.total)}</td>
                                <td style="color: #f87171;"><strong>${formatCLP(d.remaining)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        showModal(html, { title: 'Historial de Ventas Fiadas (Anotados)', width: '750px' });
    },

    showMovimientosManuales() {
        const ins = this._dailyDetail.flatMap(d => d.cashMovementsIn);
        const outs = this._dailyDetail.flatMap(d => d.cashMovementsOut);

        const html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div style="padding:1rem; background: rgba(52, 211, 153, 0.1); border-radius: 0.5rem; border: 1px solid rgba(52, 211, 153, 0.2);">
                    <small>Ingresos</small>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #34d399;">+${formatCLP(this._activeSummary.totalCashIn || 0)}</div>
                </div>
                <div style="padding:1rem; background: rgba(248, 113, 113, 0.1); border-radius: 0.5rem; border: 1px solid rgba(248, 113, 113, 0.2);">
                    <small>Retiros</small>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #f87171;">-${formatCLP(this._activeSummary.totalRetiros || 0)}</div>
                </div>
            </div>
            
            <h4 style="margin: 1.5rem 0 1rem 0;">Historial de Movimientos</h4>
            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr><th>Fecha/Hora</th><th>Tipo</th><th>Monto</th><th>Motivo</th></tr>
                    </thead>
                    <tbody>
                        ${[...ins, ...outs].sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => {
            const isIn = ins.includes(m);
            return `
                                <tr>
                                    <td>${formatDateTime(m.date)}</td>
                                    <td><span class="badge ${isIn ? 'badge-success' : 'badge-warning'}">${isIn ? 'Ingreso' : 'Retiro'}</span></td>
                                    <td style="color: ${isIn ? '#34d399' : '#f87171'}; font-weight: 700;">
                                        ${isIn ? '+' : '-'}${formatCLP(m.amount)}
                                    </td>
                                    <td style="font-size: 0.9rem; opacity: 0.8;">${m.reason}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        showModal(html, { title: 'Movimientos Manuales de Efectivo', width: '750px' });
    },

    showPaymentMethods() {
        const s = this._activeSummary;
        // cashDisplay es el NETO de operaciones (sin monto inicial)
        const cashDisplay = s.cashForDisplay ?? ((s.paymentSummary?.cash || 0) + (s.totalCashIn || 0) - (s.totalRetiros || 0));

        const html = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <p style="color: var(--secondary); margin-bottom: 0.5rem;">Resumen de Efectivo Real en Caja</p>
                <div style="font-size: 2.5rem; font-weight: 900; color: #34d399;">${formatCLP(s.expectedCash)}</div>
                <small style="opacity: 0.7;">Efectivo total que debe haber físicamente</small>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Componente de Efectivo</th><th style="text-align: right;">Monto</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>💰 Monto de Apertura (Inicial)</td>
                            <td style="text-align: right;"><strong>${formatCLP(s.initialAmount)}</strong></td>
                        </tr>
                        <tr>
                            <td>🛍️ Ventas y Cobros en Efectivo</td>
                            <td style="text-align: right;"><strong>+${formatCLP(s.paymentSummary?.cash || 0)}</strong></td>
                        </tr>
                        <tr>
                            <td>📥 Ingresos Manuales de Dinero</td>
                            <td style="text-align: right; color: #34d399;"><strong>+${formatCLP(s.totalCashIn || 0)}</strong></td>
                        </tr>
                        <tr>
                            <td>📤 Retiros y Compras de Caja</td>
                            <td style="text-align: right; color: #f87171;"><strong>-${formatCLP(s.totalRetiros || 0)}</strong></td>
                        </tr>
                        <tr style="border-top: 2px solid var(--border); font-size: 1.1rem; background: rgba(255,255,255,0.02);">
                            <td><strong style="color: #6ee7b7;">SUBTOTAL OPERACIONES</strong></td>
                            <td style="text-align: right; color: #6ee7b7;"><strong>${formatCLP(cashDisplay)}</strong></td>
                        </tr>
                        <tr style="border-top: 2px solid var(--primary); font-size: 1.3rem;">
                            <td><strong>TOTAL ESPERADO</strong></td>
                            <td style="text-align: right; color: #34d399;"><strong>${formatCLP(s.expectedCash)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h4 style="margin: 2rem 0 1rem 0; opacity: 0.8;">Otros Métodos (No Efectivo)</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Método</th><th style="text-align: right;">Total Recibido</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>💳 Tarjeta</td>
                            <td style="text-align: right;"><strong>${formatCLP(s.paymentSummary?.card || 0)}</strong></td>
                        </tr>
                        <tr>
                            <td>📱 QR / Digital</td>
                            <td style="text-align: right;"><strong>${formatCLP(s.paymentSummary?.qr || 0)}</strong></td>
                        </tr>
                        <tr>
                            <td>➕ Otro / Transferencia</td>
                            <td style="text-align: right;"><strong>${formatCLP(s.paymentSummary?.other || 0)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(52, 211, 153, 0.05); border: 1px dashed rgba(52, 211, 153, 0.2); border-radius: 0.5rem; font-size: 0.85rem; color: #6ee7b7;">
                ℹ️ <strong>Cuadratura:</strong> El Efectivo Esperado Real es la suma del Monto Inicial más el neto de todas las operaciones realizadas en efectivo durante la sesión.
            </div>
        `;
        showModal(html, { title: 'Desglose detallado de Caja', width: '600px' });
    }
    ,

    getStatusLabel(status) {
        return { completed: 'Completada', partial: 'Con abono', pending: 'Anotada' }[status] || status || '-';
    },

    renderRegistroMovimientos(dailyDetail) {
        if (!dailyDetail || dailyDetail.length === 0) {
            return '<div class="empty-state"><p>No hay movimientos en esta sesión</p></div>';
        }
        const todayDate = new Date().toLocaleDateString('es-CL');
        const paymentMethodLabel = (m) => ({ cash: 'Efectivo', card: 'Tarjeta', qr: 'QR', other: 'Otro', pending: 'Anotado' }[m] || m || '-');
        const salePaymentDisplay = (s) => {
            if (s.paymentDetails && typeof s.paymentDetails === 'object' && Object.keys(s.paymentDetails).length > 0) return 'Mixto';
            return paymentMethodLabel(s.paymentMethod);
        };
        const statusLabel = (s) => ({ completed: 'Completada', partial: 'Con abono', pending: 'Anotada' }[s.status] || s.status || '-');
        return dailyDetail.map(day => {
            const isToday = day.date === todayDate;
            const dayStyle = isToday ? 'border-left: 4px solid var(--success);' : '';
            const dayBadge = isToday ? ' <span class="badge badge-success" style="font-size: 0.75em;">HOY</span>' : '';
            let html = `
                <div style="margin-bottom: 2rem; padding: 1rem; background: var(--light); border-radius: 0.5rem; ${dayStyle}">
                    <h4 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">📅 ${day.date}${dayBadge}</h4>
            `;
            html += `
                    <div style="margin-bottom: 1.5rem;">
                        <h5 style="color: var(--success); margin-bottom: 0.5rem;">🛒 Ventas</h5>
                        ${day.sales.length === 0 ? '<p style="color: var(--secondary); font-size: 0.9rem;">Sin ventas este día</p>' : `
                        <div class="table-container" style="max-height: 200px; overflow-y: auto;">
                            <table style="font-size: 0.9rem;">
                                <thead><tr><th>Nº Venta</th><th>Total</th><th>Método de pago</th><th>Estado</th></tr></thead>
                                <tbody>
                                    ${day.sales.map(s => `<tr><td>#${s.saleNumber ?? s.id}</td><td>${formatCLP(s.total)}</td><td>${salePaymentDisplay(s)}</td><td>${statusLabel(s)}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                        `}
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <h5 style="color: var(--primary); margin-bottom: 0.5rem;">💰 Pago de deudas</h5>
                        ${day.debtPayments.length === 0 ? '<p style="color: var(--secondary); font-size: 0.9rem;">Sin pagos de deuda este día</p>' : `
                        <div class="table-container" style="max-height: 200px; overflow-y: auto;">
                            <table style="font-size: 0.9rem;">
                                <thead><tr><th>Cliente</th><th>Monto</th><th>Método</th></tr></thead>
                                <tbody>
                                    ${day.debtPayments.map(p => `<tr><td>${p.customerName}</td><td>${formatCLP(p.amount)}</td><td>${paymentMethodLabel(p.paymentMethod)}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                        `}
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <h5 style="color: #b45309; margin-bottom: 0.5rem;">📝 Deudas</h5>
                        ${day.creditSales.length === 0 ? '<p style="color: var(--secondary); font-size: 0.9rem;">Sin ventas a crédito este día</p>' : `
                        <div class="table-container" style="max-height: 200px; overflow-y: auto;">
                            <table style="font-size: 0.9rem;">
                                <thead><tr><th>Cliente</th><th>Total anotado</th><th>Deuda restante</th></tr></thead>
                                <tbody>
                                    ${day.creditSales.map(d => `<tr><td>${d.customerName}</td><td>${formatCLP(d.total)}</td><td><strong>${formatCLP(d.remaining)}</strong></td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                        `}
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <h5 style="color: var(--warning); margin-bottom: 0.5rem;">⬇️ Retiro de dinero</h5>
                        ${day.cashMovementsOut.length === 0 ? '<p style="color: var(--secondary); font-size: 0.9rem;">Sin retiros este día</p>' : `
                        <div class="table-container" style="max-height: 200px; overflow-y: auto;">
                            <table style="font-size: 0.9rem;">
                                <thead><tr><th>Monto</th><th>Motivo</th><th>Fecha y hora</th></tr></thead>
                                <tbody>
                                    ${day.cashMovementsOut.map(m => `<tr><td><strong style="color: var(--warning);">-${formatCLP(m.amount)}</strong></td><td>${m.reason}</td><td>${formatDateTime(m.date)}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                        `}
                    </div>
                    <div style="margin-bottom: 0;">
                        <h5 style="color: var(--secondary); margin-bottom: 0.5rem;">⬆️ Ingreso de dinero</h5>
                        ${day.cashMovementsIn.length === 0 ? '<p style="color: var(--secondary); font-size: 0.9rem;">Sin ingresos este día</p>' : `
                        <div class="table-container" style="max-height: 200px; overflow-y: auto;">
                            <table style="font-size: 0.9rem;">
                                <thead><tr><th>Monto</th><th>Motivo</th><th>Fecha y hora</th></tr></thead>
                                <tbody>
                                    ${day.cashMovementsIn.map(m => `<tr><td><strong style="color: var(--success);">+${formatCLP(m.amount)}</strong></td><td>${m.reason}</td><td>${formatDateTime(m.date)}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                        `}
                    </div>
                </div>
            `;
            return html;
        }).join('');
    },

    filterRegistroByDate(dateStr) {
        const contentEl = document.getElementById('registro-movimientos-content');
        if (!contentEl) return;
        const detail = CashView._dailyDetail;
        if (!detail || !Array.isArray(detail)) {
            contentEl.innerHTML = '<div class="empty-state"><p>No hay datos de movimientos</p></div>';
            return;
        }
        const dateKey = dateStr ? new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL') : new Date().toLocaleDateString('es-CL');
        const day = detail.find(d => d.date === dateKey);
        const emptyDay = { date: dateKey, sales: [], debtPayments: [], creditSales: [], cashMovementsOut: [], cashMovementsIn: [] };
        const toShow = day ? [day] : [emptyDay];
        contentEl.innerHTML = this.renderRegistroMovimientos(toShow);
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
                            <th>Acciones</th>
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
                                <td>${c.paymentSummary ? formatCLP(Object.values(c.paymentSummary).reduce((a, b) => a + b, 0)) : '-'}</td>
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
                                <td>
                                    <button class="btn btn-sm btn-info" onclick="CashView.showCashHistory(${c.id})" title="Ver historial completo">
                                        📋 Historial
                                    </button>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async showCashHistory(cashRegisterId) {
        const cashRegister = await CashRegister.getById(cashRegisterId);
        if (!cashRegister) {
            showNotification('Caja no encontrada', 'error');
            return;
        }

        // Obtener todos los datos relacionados con la caja
        const sales = await Sale.getByCashRegister(cashRegisterId);
        const payments = await Payment.getByCashRegister(cashRegisterId);
        const expenses = await Expense.getByCashRegister(cashRegisterId);
        const cashMovements = await CashMovement.getByCashRegister(cashRegisterId);

        // Crear lista de eventos cronológica
        const events = [];

        // 1. Apertura de caja
        events.push({
            type: 'open',
            date: cashRegister.openDate,
            amount: cashRegister.initialAmount,
            description: 'Apertura de caja',
            icon: '🔓',
            color: 'var(--success)'
        });

        // 2. Ventas
        sales.forEach(sale => {
            events.push({
                type: 'sale',
                date: sale.date,
                amount: sale.total,
                description: `Venta #${sale.saleNumber}`,
                details: `${sale.items.length} items - ${this.getPaymentMethodName(sale.paymentMethod)}`,
                icon: '💰',
                color: 'var(--primary)',
                saleId: sale.id
            });
        });

        // 3. Pagos de deuda
        for (const payment of payments) {
            let customerName = 'Cliente';
            if (payment.customerId) {
                try {
                    const customer = await Customer.getById(payment.customerId);
                    customerName = customer ? customer.name : 'Cliente';
                } catch (e) {
                    console.error('Error obteniendo cliente:', e);
                }
            }

            events.push({
                type: 'payment',
                date: payment.date,
                amount: payment.amount,
                description: `Pago de deuda - ${customerName}`,
                details: `${this.getPaymentMethodName(payment.paymentMethod)}${payment.notes ? ' - ' + payment.notes : ''}`,
                icon: '💵',
                color: 'var(--success)',
                paymentId: payment.id
            });
        }

        // 4. Gastos
        expenses.forEach(expense => {
            events.push({
                type: 'expense',
                date: expense.date,
                amount: -expense.amount, // Negativo porque es salida
                description: expense.description || 'Gasto',
                details: `Categoría: ${expense.category || 'General'}`,
                icon: '📤',
                color: 'var(--danger)',
                expenseId: expense.id
            });
        });

        // 5. Movimientos de caja manuales
        cashMovements.forEach(movement => {
            // Solo mostrar movimientos manuales (sin saleId, paymentId, expenseId)
            if (!movement.saleId && !movement.paymentId && !movement.expenseId) {
                events.push({
                    type: movement.type === 'in' ? 'cash_in' : 'cash_out',
                    date: movement.date,
                    amount: movement.type === 'in' ? movement.amount : -movement.amount,
                    description: movement.reason || (movement.type === 'in' ? 'Entrada de dinero' : 'Salida de dinero'),
                    details: movement.type === 'in' ? 'Agregado a caja' : 'Retirado de caja',
                    icon: movement.type === 'in' ? '➕' : '➖',
                    color: movement.type === 'in' ? 'var(--success)' : 'var(--warning)',
                    movementId: movement.id
                });
            }
        });

        // 6. Cierre de caja (si está cerrada)
        if (cashRegister.closeDate) {
            events.push({
                type: 'close',
                date: cashRegister.closeDate,
                amount: cashRegister.finalAmount,
                description: 'Cierre de caja',
                details: `Esperado: ${formatCLP(cashRegister.expectedAmount)} | Diferencia: ${formatCLP(cashRegister.difference)}`,
                icon: '🔒',
                color: 'var(--info)'
            });
        }

        // Ordenar eventos por fecha (más antiguos primero)
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calcular balance acumulado
        let runningBalance = cashRegister.initialAmount;
        events.forEach(event => {
            event.balanceBefore = runningBalance;
            runningBalance += event.amount;
            event.balanceAfter = runningBalance;
        });

        // Generar HTML del historial (fondo oscuro y texto claro para buena legibilidad)
        const content = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(0,0,0,0.35); border-left: 4px solid var(--primary); border-radius: 0.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; color: #e2e8f0;">Caja #${cashRegister.id}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem; color: #cbd5e1;">
                    <div>
                        <strong style="color: #f1f5f9;">Apertura:</strong> ${formatDateTime(cashRegister.openDate)}
                    </div>
                    <div>
                        <strong style="color: #f1f5f9;">Estado:</strong> 
                        <span class="badge ${cashRegister.status === 'open' ? 'badge-success' : 'badge-info'}">
                            ${cashRegister.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                    </div>
                    ${cashRegister.closeDate ? `
                        <div>
                            <strong style="color: #f1f5f9;">Cierre:</strong> ${formatDateTime(cashRegister.closeDate)}
                        </div>
                    ` : ''}
                    <div>
                        <strong style="color: #f1f5f9;">Total Eventos:</strong> ${events.length}
                    </div>
                </div>
            </div>
            
            <div style="max-height: 600px; overflow-y: auto;">
                <div style="position: relative; padding-left: 2rem;">
                    <div style="position: absolute; left: 0.75rem; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.2);"></div>
                    
                    ${events.map((event, index) => {
            const isPositive = event.amount >= 0;
            const amountColor = isPositive ? '#22c55e' : '#ef4444';
            const amountSign = isPositive ? '+' : '';

            return `
                            <div style="position: relative; margin-bottom: 1.5rem; padding-left: 1rem;">
                                <div style="position: absolute; left: -1.5rem; top: 0.5rem; width: 1rem; height: 1rem; border-radius: 50%; background: ${event.color}; border: 2px solid rgba(0,0,0,0.4); box-shadow: 0 0 0 2px ${event.color};"></div>
                                
                                <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 1rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                        <div style="flex: 1;">
                                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                                <span style="font-size: 1.2rem;">${event.icon}</span>
                                                <strong style="font-size: 1rem; color: #f1f5f9;">${event.description}</strong>
                                            </div>
                                            <div style="font-size: 0.85rem; color: #94a3b8; margin-left: 1.75rem;">
                                                ${formatDateTime(event.date)}
                                            </div>
                                            ${event.details ? `
                                                <div style="font-size: 0.85rem; color: #94a3b8; margin-left: 1.75rem; margin-top: 0.25rem;">
                                                    ${event.details}
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-size: 1.1rem; font-weight: 700; color: ${amountColor};">
                                                ${amountSign}${formatCLP(Math.abs(event.amount))}
                                            </div>
                                            <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">
                                                Balance: ${formatCLP(event.balanceAfter)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
            
            <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(0,0,0,0.35); border-radius: 0.5rem;">
                <h4 style="margin-bottom: 0.75rem; color: #f1f5f9;">📊 Resumen</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; color: #cbd5e1;">
                    <div>
                        <strong style="color: #f1f5f9;">Monto Inicial:</strong> ${formatCLP(cashRegister.initialAmount)}
                    </div>
                    <div>
                        <strong style="color: #f1f5f9;">Total Ventas:</strong> ${formatCLP(sales.reduce((sum, s) => sum + s.total, 0))}
                    </div>
                    <div>
                        <strong style="color: #f1f5f9;">Total Pagos:</strong> ${formatCLP(payments.reduce((sum, p) => sum + p.amount, 0))}
                    </div>
                    <div>
                        <strong style="color: #f1f5f9;">Total Gastos:</strong> ${formatCLP(expenses.reduce((sum, e) => sum + e.amount, 0))}
                    </div>
                    ${cashRegister.status === 'closed' ? `
                        <div>
                            <strong style="color: #f1f5f9;">Monto Final:</strong> ${formatCLP(cashRegister.finalAmount)}
                        </div>
                        <div>
                            <strong style="color: #f1f5f9;">Efectivo Esperado:</strong> ${formatCLP(cashRegister.expectedAmount)}
                        </div>
                        <div>
                            <strong style="color: #f1f5f9;">Diferencia:</strong> 
                            <span style="color: ${cashRegister.difference >= 0 ? '#22c55e' : '#ef4444'};">
                                ${formatCLP(cashRegister.difference)}
                            </span>
                        </div>
                    ` : `
                        <div>
                            <strong style="color: #f1f5f9;">Balance Actual:</strong> 
                            <span style="color: #38bdf8; font-weight: 700;">
                                ${formatCLP(events[events.length - 1]?.balanceAfter || cashRegister.initialAmount)}
                            </span>
                        </div>
                    `}
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
        `;

        showModal(content, {
            title: `Historial Completo de Caja #${cashRegister.id}`,
            footer,
            width: '900px'
        });
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

    _allCashHistory: [],
    _historyFilter: {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        day: null
    },
    _monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],

    async showAllCashRegistersHistory() {
        try {
            const allRegisters = await CashRegister.getAll();

            if (allRegisters.length === 0) {
                showModal(
                    '<div class="empty-state"><div class="empty-state-icon">💰</div>No hay registros de caja</div>',
                    { title: 'Historial de Cajas', width: '600px' }
                );
                return;
            }

            await this.enrichHistoryWithSummaries(allRegisters);

            // Ordenar por fecha de apertura (más recientes primero)
            const sortedRegisters = allRegisters.sort((a, b) => new Date(b.openDate) - new Date(a.openDate));
            this._allCashHistory = sortedRegisters;

            const openCount = allRegisters.filter(r => r.status === 'open').length;
            const closedCount = allRegisters.filter(r => r.status === 'closed').length;

            const years = Array.from(new Set(sortedRegisters.map(r => new Date(r.openDate).getFullYear())));
            years.sort((a, b) => b - a);
            if (years.length === 0) {
                years.push(new Date().getFullYear());
            }

            this._historyFilter.year = this._historyFilter.year && years.includes(this._historyFilter.year)
                ? this._historyFilter.year
                : years[0];
            this._historyFilter.month = typeof this._historyFilter.month === 'number'
                ? this._historyFilter.month
                : this._historyFilter.month = new Date().getMonth();
            this._historyFilter.day = null;

            const filterControls = this.renderCashHistoryFilterControls(years);

            const content = `
                <div class="cash-history-modal">
                    <div class="cash-history-modal-header">
                        <div>
                            <h3>Historial Completo de Cajas</h3>
                            <p>
                                Total de registros: <strong>${allRegisters.length}</strong> |
                                Abiertas: <strong>${openCount}</strong> |
                                Cerradas: <strong>${closedCount}</strong>
                            </p>
                        </div>
                    </div>
                    ${filterControls}
                    <div class="cash-history-list" id="cashHistoryList">
                        ${this.renderCashHistoryEntries(sortedRegisters)}
                    </div>
                </div>
            `;

            const footer = `
                <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
            `;

            showModal(content, {
                title: 'Historial Completo de Todas las Cajas',
                footer,
                width: '900px'
            });
        } catch (error) {
            console.error('Error al cargar historial de cajas:', error);
            showNotification('Error al cargar el historial: ' + error.message, 'error');
        }
    },


    filterCashHistoryByDate(dateStr) {
        const filterString = dateStr || this.getHistoryFilterDate();
        const filtered = !filterString ? this._allCashHistory : this._allCashHistory.filter(register => {
            const openDate = new Date(register.openDate);
            const target = new Date(`${filterString}T12:00:00`);
            return openDate.getFullYear() === target.getFullYear() &&
                openDate.getMonth() === target.getMonth() &&
                openDate.getDate() === target.getDate();
        });

        const listEl = document.getElementById('cashHistoryList');
        if (listEl) {
            listEl.innerHTML = this.renderCashHistoryEntries(filtered);
        }
    },

    renderCashHistoryFilterControls(years) {
        const selectedYear = this._historyFilter.year;
        const selectedMonth = this._historyFilter.month;
        return `
            <div class="cash-history-filter">
                <div class="cash-history-filter-selects">
                    <label>Mes
                        <select onchange="CashView.setHistoryFilterMonth(this.value)" class="form-control">
                            ${this._monthNames.map((name, index) => `
                                <option value="${index}" ${index === selectedMonth ? 'selected' : ''}>${name}</option>
                            `).join('')}
                        </select>
                    </label>
                    <label>Año
                        <select onchange="CashView.setHistoryFilterYear(this.value)" class="form-control">
                            ${years.map(year => `
                                <option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>
                            `).join('')}
                        </select>
                    </label>
                </div>
                <div class="cash-history-filter-grid" id="cashHistoryDayGrid">
                    ${this.renderHistoryDayGrid(selectedYear, selectedMonth)}
                </div>
            </div>
        `;
    },

    renderHistoryDayGrid(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthName = this._monthNames[month] || '';
        const selectedDay = this._historyFilter.day;

        let grid = `
            <div class="cash-history-day-grid-title">
                ${monthName} ${year}
            </div>
            <div class="cash-history-day-grid-body">
        `;

        for (let day = 1; day <= daysInMonth; day++) {
            const isActive = selectedDay === day;
            grid += `
                <button type="button"
                        class="cash-history-day ${isActive ? 'active' : ''}"
                        onclick="CashView.setHistoryFilterDay(${day})">
                    <span>${day}</span>
                    <small>${monthName.slice(0, 3)}</small>
                </button>
            `;
        }

        grid += '</div>';
        return grid;
    },

    setHistoryFilterMonth(monthIndex) {
        this._historyFilter.month = parseInt(monthIndex, 10);
        this._historyFilter.day = null;
        this.refreshHistoryDayGrid();
        this.filterCashHistoryByDate();
    },

    setHistoryFilterYear(year) {
        this._historyFilter.year = parseInt(year, 10);
        this._historyFilter.day = null;
        this.refreshHistoryDayGrid();
        this.filterCashHistoryByDate();
    },

    setHistoryFilterDay(day) {
        this._historyFilter.day = parseInt(day, 10);
        this.refreshHistoryDayGrid();
        this.filterCashHistoryByDate();
    },

    refreshHistoryDayGrid() {
        const gridEl = document.getElementById('cashHistoryDayGrid');
        if (gridEl && this._historyFilter.year !== undefined && this._historyFilter.month !== undefined) {
            gridEl.innerHTML = this.renderHistoryDayGrid(this._historyFilter.year, this._historyFilter.month);
        }
    },

    getHistoryFilterDate() {
        const { year, month, day } = this._historyFilter;
        if (!year || month === undefined || !day) return null;
        const paddedMonth = String(month + 1).padStart(2, '0');
        const paddedDay = String(day).padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`;
    },

    renderCashHistoryEntries(registers) {
        if (!registers || registers.length === 0) {
            return `
                <div class="empty-state" style="padding: 2rem; text-align: center;">
                    <div class="empty-state-icon">📦</div>
                    <p>No hay cajas que coincidan con la fecha seleccionada.</p>
                </div>
            `;
        }

        return registers.map(register => {
            const openDate = new Date(register.openDate);
            const closeDate = register.closeDate ? new Date(register.closeDate) : null;
            let duration = '-';
            if (closeDate) {
                const diffMs = closeDate - openDate;
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                duration = diffDays > 0
                    ? `${diffDays}d ${diffHrs}h ${diffMins}m`
                    : `${diffHrs}h ${diffMins}m`;
            }

            const totalPayments = register.paymentSummary
                ? Object.values(register.paymentSummary).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
                : 0;

            return `
                <div class="cash-history-entry">
                    <div class="cash-history-entry-header ${register.status === 'open' ? 'cash-history-entry-open' : 'cash-history-entry-closed'}">
                        <div>
                            <h4>Caja #${register.id}</h4>
                            <p><strong>Apertura:</strong> ${formatDateTime(register.openDate)}</p>
                            ${closeDate ? `<p><strong>Cierre:</strong> ${formatDateTime(closeDate)}</p>` : ''}
                        </div>
                        <div class="cash-history-entry-status">
                            <span class="badge ${register.status === 'open' ? 'badge-success' : 'badge-info'}">
                                ${register.status === 'open' ? '🔓 Abierta' : '🔒 Cerrada'}
                            </span>
                            ${duration !== '-' ? `<small class="cash-history-entry-duration">Duración: ${duration}</small>` : ''}
                        </div>
                    </div>
                    <div class="cash-history-entry-body">
                        <div class="cash-history-entry-grid">
                            <div>
                                <span>Monto Inicial</span>
                                <strong>${formatCLP(register.initialAmount)}</strong>
                            </div>
                            <div>
                                <span>Total Recibido</span>
                                <strong>${formatCLP(totalPayments)}</strong>
                            </div>
                            ${register.status === 'closed' ? `
                                <div>
                                    <span>Monto Final</span>
                                    <strong>${formatCLP(register.finalAmount || 0)}</strong>
                                </div>
                                <div>
                                    <span>Diferencia</span>
                                    <strong class="${register.difference >= 0 ? 'text-success' : 'text-danger'}">
                                        ${formatCLP(register.difference || 0)}
                                    </strong>
                                </div>
                            ` : ''}
                        </div>
                        ${register.paymentSummary ? `
                            <div class="cash-history-entry-payments">
                                <span>Resumen por método de pago:</span>
                                <div class="cash-history-entry-payments-grid">
                                    ${register.paymentSummary.cash > 0 ? `<span>💵 Efectivo: <strong>${formatCLP(register.paymentSummary.cash)}</strong></span>` : ''}
                                    ${register.paymentSummary.card > 0 ? `<span>💳 Tarjeta: <strong>${formatCLP(register.paymentSummary.card)}</strong></span>` : ''}
                                    ${register.paymentSummary.qr > 0 ? `<span>📱 QR: <strong>${formatCLP(register.paymentSummary.qr)}</strong></span>` : ''}
                                    ${register.paymentSummary.other > 0 ? `<span>➕ Otro: <strong>${formatCLP(register.paymentSummary.other)}</strong></span>` : ''}
                                </div>
                            </div>
                        ` : ''}
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class="btn btn-primary" style="flex: 2;" onclick="CashView.showCashHistory(${register.id}); closeModal();">
                                📋 Ver Historial Completo
                            </button>
                            ${register.status === 'closed' ? `
                                <button class="btn btn-warning" style="flex: 1;" onclick="CashView.editClosedCash(${register.id})">
                                    ✏️ Editar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async openCash(event) {
        event.preventDefault();

        const mode = document.querySelector('input[name="openMode"]:checked').value;
        let amount = 0;
        let denominations = null;

        if (mode === 'denominations') {
            // Calculate from denominations
            this.calculateTotal();
            amount = parseFloat(document.getElementById('initialAmount').value) || 0;

            // Get denominations object
            denominations = {
                bill_20000: parseInt(document.getElementById('bill_20000').value) || 0,
                bill_10000: parseInt(document.getElementById('bill_10000').value) || 0,
                bill_5000: parseInt(document.getElementById('bill_5000').value) || 0,
                bill_2000: parseInt(document.getElementById('bill_2000').value) || 0,
                bill_1000: parseInt(document.getElementById('bill_1000').value) || 0,
                coin_500: parseInt(document.getElementById('coin_500').value) || 0,
                coin_100: parseInt(document.getElementById('coin_100').value) || 0,
                coin_50: parseInt(document.getElementById('coin_50').value) || 0,
                coin_10: parseInt(document.getElementById('coin_10').value) || 0
            };
        } else {
            amount = parseFloat(document.getElementById('quickAmount').value) || 0;
        }

        if (amount <= 0) {
            showNotification('El monto inicial debe ser mayor a 0', 'error');
            return;
        }

        try {
            await CashController.openCash(amount, denominations);
            app.navigate('cash');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async showCloseCashForm() {
        const openCash = await CashRegister.getOpen();
        const summary = await CashRegister.getSummary(openCash.id);
        const dailyBreakdown = await CashController.getDailySales(openCash.id);

        const paymentMethods = ['cash', 'card_qr', 'other'];
        const methodLabels = {
            cash: 'Efectivo esperado',
            card_qr: 'Tarjetas y QR esperados',
            other: 'Transferencia / Otro esperado'
        };

        const expectedPayments = {
            cash: summary.expectedCash || 0,
            card_qr: (summary.paymentSummary?.card || 0) + (summary.paymentSummary?.qr || 0),
            other: summary.paymentSummary?.other || 0
        };

        const expectedTotal = Object.values(expectedPayments).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
        const expectedCashOnly = expectedPayments.cash || 0;
        const totalSalesSinceOpen = dailyBreakdown.reduce((sum, day) => sum + (day.sales.total || 0), 0);
        const totalSalesAmount = summary.totalSalesAmount ?? totalSalesSinceOpen;

        const methodRows = paymentMethods.map((method, index) => {
            const isLast = index === paymentMethods.length - 1;
            const nextMethod = isLast ? null : paymentMethods[index + 1];
            
            return `
                <div class="close-cash-method-row">
                    <span class="close-cash-method-label">${methodLabels[method]}</span>
                    <span class="close-cash-method-expected" id="closeExpected-${method}">${formatCLP(expectedPayments[method])}</span>
                    <input type="number"
                           id="closeMethod-${method}"
                           class="form-control close-cash-method-input"
                           min="0"
                           step="1"
                           placeholder="0"
                           value=""
                           onkeydown="if(event.key === 'Enter') { 
                               event.preventDefault(); 
                               event.stopPropagation();
                               const next = document.getElementById('closeMethod-${nextMethod}'); 
                               if(next) next.focus(); 
                               else document.querySelector('.btn-close-cash-final').focus();
                           }"
                           title="Ingrese el monto real contado para ${methodLabels[method]}">
                    <span class="close-cash-method-diff" id="closeDifference-${method}"></span>
                </div>
            `;
        }).join('');

        const totalRow = `
            <div class="close-cash-method-row close-cash-total-row">
                <span class="close-cash-method-label"><strong>Total</strong></span>
                <span class="close-cash-method-expected" id="closeExpectedTotal"><strong>${formatCLP(expectedTotal)}</strong></span>
                <span class="close-cash-method-input-placeholder"></span>
                <span class="close-cash-method-diff" id="closeDifferenceTotal"></span>
            </div>
        `;

        const dailyList = dailyBreakdown.length > 0
            ? dailyBreakdown.map(day => `
                <div class="close-cash-day-row">
                    <span>${day.date}</span>
                    <strong>${formatCLP(day.sales.total)}</strong>
                </div>
            `).join('')
            : '<div class="empty-state" style="padding:1rem; text-align:center;">No hay ventas registradas aún.</div>';

        const content = `
            <div class="close-cash-grid">
                <div class="close-cash-daily">
                    <h4>Ventas desde la apertura (${dailyBreakdown.length} día${dailyBreakdown.length !== 1 ? 's' : ''})</h4>
                    <div class="close-cash-day-list">
                        ${dailyList}
                    </div>
                    <div class="close-cash-day-total">
                        <span>Total acumulado</span>
                        <strong>${formatCLP(totalSalesAmount)}</strong>
                    </div>
                </div>
                <div class="close-cash-reconcile">
                    <h4>Cuadratura de medios de pago</h4>
                    <p class="close-cash-reconcile-hint">Compare el valor esperado de cada método con el monto real ingresado. Ingrese el dinero contado en cada campo.</p>
                    ${methodRows}
                    ${totalRow}
                    <div class="close-cash-difference-summary" id="closeCashDifferenceSummary"></div>
                </div>
            </div>
            <form id="closeCashForm" onsubmit="event.preventDefault(); CashView.closeCash(${openCash.id}); return false;">
                <input type="hidden" id="finalAmount" name="finalAmount" value="${expectedCashOnly}">
            </form>
        `;

        const footer = `
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button type="button" class="btn btn-danger btn-close-cash-final" onclick="CashView.closeCash(${openCash.id})">Cerrar Caja</button>
        `;

        showModal(content, { title: 'Cerrar Caja', footer, width: '900px' });

        setTimeout(() => {
            const updateDifferences = () => {
                const listEl = document.getElementById('closeCashDifferenceSummary');
                const totalDiffEl = document.getElementById('closeDifferenceTotal');
                const finalInput = document.getElementById('finalAmount');
                const countedTotals = paymentMethods.reduce((acc, method) => {
                    const input = document.getElementById(`closeMethod-${method}`);
                    const value = parseFloat(input?.value) || 0;
                    acc[method] = value;
                    return acc;
                }, {});

                const countedTotal = paymentMethods.reduce((sum, method) => sum + countedTotals[method], 0);
                // Diferencia total = suma de (contado - esperado) por método: positivo = sobrante, negativo = faltante
                const totalDifference = paymentMethods.reduce((sum, method) => {
                    return sum + (countedTotals[method] - (expectedPayments[method] || 0));
                }, 0);
                if (finalInput) {
                    finalInput.value = countedTotals['cash'] ?? 0;
                }

                paymentMethods.forEach(method => {
                    const diffEl = document.getElementById(`closeDifference-${method}`);
                    const diff = countedTotals[method] - (expectedPayments[method] || 0);
                    if (diffEl) {
                        if (diff === 0) {
                            diffEl.textContent = 'Cuadra';
                            diffEl.classList.remove('text-success', 'text-danger');
                        } else {
                            const label = diff > 0 ? 'Sobrante' : 'Faltante';
                            diffEl.textContent = `${label} ${formatCLP(Math.abs(diff))}`;
                            diffEl.classList.toggle('text-success', diff > 0);
                            diffEl.classList.toggle('text-danger', diff < 0);
                        }
                    }
                });

                if (totalDiffEl) {
                    if (totalDifference === 0) {
                        totalDiffEl.textContent = 'Cuadra perfecto';
                        totalDiffEl.classList.remove('text-success', 'text-danger');
                    } else {
                        const label = totalDifference > 0 ? 'Sobrante total' : 'Faltante total';
                        totalDiffEl.textContent = `${label}: ${formatCLP(Math.abs(totalDifference))}`;
                        totalDiffEl.classList.toggle('text-success', totalDifference > 0);
                        totalDiffEl.classList.toggle('text-danger', totalDifference < 0);
                    }
                }

                if (listEl) {
                    if (totalDifference === 0) {
                        listEl.innerHTML = `<div class="close-cash-difference-success">Cuadra perfecto • Total contado: ${formatCLP(countedTotal)}</div>`;
                    } else {
                        const label = totalDifference > 0 ? 'Sobrante' : 'Faltante';
                        listEl.innerHTML = `
                            <div class="close-cash-difference-alert">
                                <strong>${label} total en dinero real: ${formatCLP(Math.abs(totalDifference))}</strong>
                                <span>Total contado: ${formatCLP(countedTotal)}</span>
                            </div>
                        `;
                    }
                }
            };

            paymentMethods.forEach(method => {
                const input = document.getElementById(`closeMethod-${method}`);
                input?.addEventListener('input', updateDifferences);
            });

            updateDifferences();
        }, 0);
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
    },

    async showAddCashForm() {
        const content = `
            <form id="addCashForm" onsubmit="event.preventDefault(); CashView.addCash(); return false;">
                <div class="form-group">
                    <label>Monto a Agregar (CLP) *</label>
                    <input type="number" 
                           id="addAmount" 
                           class="form-control" 
                           placeholder="0" 
                           min="1" 
                           step="1"
                           required 
                           autofocus>
                </div>
                
                <div class="form-group">
                    <label>Motivo (opcional)</label>
                    <textarea id="addReason" 
                              class="form-control" 
                              rows="3" 
                              placeholder="Ej: Reposición de efectivo, cambio para ventas, etc."></textarea>
                </div>
            </form>
        `;

        const footer = `
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button type="button" class="btn btn-success" onclick="CashView.addCash()">Agregar Dinero</button>
        `;

        showModal(content, { title: 'Agregar Dinero a la Caja', footer, width: '500px' });
    },

    async showWithdrawCashForm() {
        const openCash = await CashRegister.getOpen();
        const summary = await CashRegister.getSummary(openCash.id);

        const content = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                <p style="margin-bottom: 0.5rem;"><strong>Efectivo Disponible:</strong> ${formatCLP(summary.expectedCash)}</p>
            </div>
            
            <form id="withdrawCashForm" onsubmit="event.preventDefault(); CashView.withdrawCash(); return false;">
                <div class="form-group">
                    <label>Monto a Retirar (CLP) *</label>
                    <input type="number" 
                           id="withdrawAmount" 
                           class="form-control" 
                           placeholder="0" 
                           min="1" 
                           step="1"
                           max="${summary.expectedCash}"
                           required 
                           autofocus>
                </div>
                
                <div class="form-group">
                    <label>Motivo (opcional)</label>
                    <textarea id="withdrawReason" 
                              class="form-control" 
                              rows="3" 
                              placeholder="Ej: Retiro para compras, pago a proveedor, etc."></textarea>
                </div>
            </form>
        `;

        const footer = `
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button type="button" class="btn btn-warning" onclick="CashView.withdrawCash()">Retirar Dinero</button>
        `;

        showModal(content, { title: 'Retirar Dinero de la Caja', footer, width: '500px' });
    },

    async addCash() {
        const amount = parseFloat(document.getElementById('addAmount').value);
        const reason = document.getElementById('addReason').value.trim();

        if (!amount || amount <= 0) {
            showNotification('El monto debe ser mayor a 0', 'error');
            return;
        }

        try {
            await CashController.addCash(amount, reason);
            closeModal();
            await app.navigate('cash');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async withdrawCash() {
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const reason = document.getElementById('withdrawReason').value.trim();

        if (!amount || amount <= 0) {
            showNotification('El monto debe ser mayor a 0', 'error');
            return;
        }

        try {
            await CashController.withdrawCash(amount, reason);
            closeModal();
            await app.navigate('cash');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async editClosedCash(id) {
        try {
            const register = await CashRegister.getById(id);
            if (!register) throw new Error('Caja no encontrada');
            const summary = await CashRegister.getSummary(id);
            const dailyBreakdown = await CashController.getDailySales(id);

            const paymentMethods = ['cash', 'card_qr', 'other'];
            const methodLabels = {
                cash: 'Efectivo esperado',
                card_qr: 'Tarjetas y QR esperados',
                other: 'Transferencia / Otro esperado'
            };

            const expectedPayments = {
                cash: summary.expectedCash || 0,
                card_qr: (summary.paymentSummary?.card || 0) + (summary.paymentSummary?.qr || 0),
                other: summary.paymentSummary?.other || 0
            };

            const expectedTotal = Object.values(expectedPayments).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
            
            // Reconstruir montos contados anteriormente si es posible
            // Si no tenemos el desglose, el finalAmount original es lo que pusimos en Cash
            const lastCounted = {
                cash: register.finalAmount || 0,
                card_qr: expectedPayments.card_qr, // Asumimos que cuadraba si no tenemos el dato
                other: expectedPayments.other
            };

            const methodRows = paymentMethods.map((method, index) => {
                const isLast = index === paymentMethods.length - 1;
                const nextMethod = isLast ? null : paymentMethods[index + 1];
                
                return `
                    <div class="close-cash-method-row">
                        <span class="close-cash-method-label">${methodLabels[method]}</span>
                        <span class="close-cash-method-expected" id="editExpected-${method}">${formatCLP(expectedPayments[method])}</span>
                        <input type="number"
                               id="editMethod-${method}"
                               class="form-control close-cash-method-input"
                               min="0"
                               step="1"
                               placeholder="0"
                               value="${lastCounted[method] || 0}"
                               onkeydown="if(event.key === 'Enter') { 
                                   event.preventDefault(); 
                                   event.stopPropagation();
                                   const next = document.getElementById('editMethod-${nextMethod}'); 
                                   if(next) next.focus(); 
                                   else document.querySelector('.btn-save-edit-final').focus();
                               }"
                               title="Ingrese el monto real contado para ${methodLabels[method]}">
                        <span class="close-cash-method-diff" id="editDifference-${method}"></span>
                    </div>
                `;
            }).join('');

            const content = `
                <div class="close-cash-grid">
                    <div class="close-cash-reconcile" style="width: 100%;">
                        <h4>Editar Cuadratura - Caja #${id}</h4>
                        <p class="close-cash-reconcile-hint">Modifique los montos contados para corregir errores de ingreso.</p>
                        ${methodRows}
                        <div class="close-cash-method-row close-cash-total-row">
                            <span class="close-cash-method-label"><strong>Total</strong></span>
                            <span class="close-cash-method-expected" id="editExpectedTotal"><strong>${formatCLP(expectedTotal)}</strong></span>
                            <span class="close-cash-method-total-counted" id="editCountedTotal" style="font-weight: bold; text-align: right; padding-right: 1.5rem;">${formatCLP(Object.values(lastCounted).reduce((a, b) => a + b, 0))}</span>
                            <span class="close-cash-method-diff" id="editDifferenceTotal"></span>
                        </div>
                        <div class="close-cash-difference-summary" id="editCashDifferenceSummary"></div>
                    </div>
                </div>
                <input type="hidden" id="editFinalAmount" value="${lastCounted.cash}">
            `;

            const footer = `
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="button" class="btn btn-warning btn-save-edit-final" onclick="CashView.updateClosedCash(${id})">Guardar Cambios</button>
            `;

            showModal(content, { title: 'Editar Cierre de Caja', footer, width: '600px' });

            setTimeout(() => {
                const updateEditDifferences = () => {
                    const listEl = document.getElementById('editCashDifferenceSummary');
                    const totalDiffEl = document.getElementById('editDifferenceTotal');
                    const finalInput = document.getElementById('editFinalAmount');
                    
                    const countedTotals = paymentMethods.reduce((acc, method) => {
                        const input = document.getElementById(`editMethod-${method}`);
                        acc[method] = parseFloat(input?.value) || 0;
                        return acc;
                    }, {});

                    const countedTotal = paymentMethods.reduce((sum, method) => sum + countedTotals[method], 0);
                    const totalDifference = paymentMethods.reduce((sum, method) => sum + (countedTotals[method] - (expectedPayments[method] || 0)), 0);
                    
                    if (finalInput) finalInput.value = countedTotals['cash'];
                    const countedTotalEl = document.getElementById('editCountedTotal');
                    if (countedTotalEl) countedTotalEl.textContent = formatCLP(countedTotal);

                    paymentMethods.forEach(method => {
                        const diffEl = document.getElementById(`editDifference-${method}`);
                        const diff = countedTotals[method] - (expectedPayments[method] || 0);
                        if (diffEl) {
                            if (diff === 0) {
                                diffEl.textContent = 'Cuadra';
                                diffEl.classList.remove('text-success', 'text-danger');
                            } else {
                                const label = diff > 0 ? 'Sobrante' : 'Faltante';
                                diffEl.textContent = `${label} ${formatCLP(Math.abs(diff))}`;
                                diffEl.classList.toggle('text-success', diff > 0);
                                diffEl.classList.toggle('text-danger', diff < 0);
                            }
                        }
                    });

                    if (totalDiffEl) {
                        const label = totalDifference === 0 ? 'Cuadra perfecto' : (totalDifference > 0 ? 'Sobrante' : 'Faltante');
                        totalDiffEl.textContent = totalDifference === 0 ? label : `${label}: ${formatCLP(Math.abs(totalDifference))}`;
                        totalDiffEl.classList.toggle('text-success', totalDifference > 0);
                        totalDiffEl.classList.toggle('text-danger', totalDifference < 0);
                    }

                    if (listEl) {
                        listEl.innerHTML = totalDifference === 0 
                            ? `<div class="close-cash-difference-success">Cuadra perfecto • Total contado: ${formatCLP(countedTotal)}</div>`
                            : `<div class="close-cash-difference-alert"><strong>${totalDifference > 0 ? 'Sobrante' : 'Faltante'} total: ${formatCLP(Math.abs(totalDifference))}</strong></div>`;
                    }
                };

                paymentMethods.forEach(method => {
                    document.getElementById(`editMethod-${method}`)?.addEventListener('input', updateEditDifferences);
                });
                updateEditDifferences();
            }, 0);

        } catch (error) {
            showNotification(error.message, 'error');
        }
    },

    async updateClosedCash(id) {
        const finalAmount = parseFloat(document.getElementById('editFinalAmount').value);
        
        try {
            const register = await CashRegister.getById(id);
            const summary = await CashRegister.getSummary(id);
            
            // Recalcular diferencia
            const difference = finalAmount - summary.expectedCash;
            
            const updated = {
                ...register,
                finalAmount: finalAmount,
                difference: difference,
                updatedAt: new Date().toISOString()
            };
            
            await CashRegister._repository.replace(updated);
            showNotification('Registro de caja actualizado correctamente', 'success');
            closeModal();
            // Recargar el historial si el modal de historial está abierto
            if (document.querySelector('.cash-history-modal')) {
                this.showAllCashRegistersHistory();
            } else {
                app.navigate('cash');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
};
