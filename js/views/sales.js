const SalesView = {
    currentFilter: 'all', // 'all', 'cash', 'card', 'qr', 'other', 'pending'
    dateFrom: null, // Fecha desde (YYYY-MM-DD)
    dateTo: null, // Fecha hasta (YYYY-MM-DD)

    async render() {
        // C4: Optimización — Por defecto mostrar solo hoy para evitar descargar miles de registros
        const today = new Date();
        const todayStr = this.getLocalDateString(today);
        
        // Mantener filtros si ya fueron seleccionados, si no, usar hoy
        const defaultDate = this.dateFrom || this.dateTo || todayStr;
        if (!this.dateFrom && !this.dateTo) {
            this.dateFrom = todayStr;
            this.dateTo = todayStr;
        }

        const sales = await Sale.getByDateRange(this.dateFrom + 'T00:00:00', this.dateTo + 'T23:59:59');
        const sortedSales = Array.isArray(sales) ? sales.sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

        const salesTableHtml = await this.renderSalesTable(sortedSales);

        return `
            <div class="view-header">
                <h1>📋 Historial de Ventas</h1>
                <p>Consulta y gestiona todas las ventas realizadas</p>
            </div>
            
            <div class="card" style="margin-bottom: 1rem;">
                <div style="padding: 1rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1rem;">📅 Filtrar por Fecha:</h3>
                    <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; align-items: end; margin-bottom: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 0.85rem; margin-bottom: 0.25rem; display: block;">Seleccionar Fecha:</label>
                            <input type="date" 
                                   id="dateFilter" 
                                   class="form-control" 
                                   value="${defaultDate}"
                                   style="padding: 0.5rem;"
                                   onchange="SalesView.applyDateFilter()">
                        </div>
                        <div>
                            <button class="btn btn-primary" 
                                    onclick="SalesView.selectToday()"
                                    style="padding: 0.5rem 1rem; white-space: nowrap;"
                                    title="Ver solo ventas de hoy">
                                📅 Hoy
                            </button>
                        </div>
                        <div>
                            <button class="btn btn-secondary" 
                                    onclick="SalesView.clearDateFilter()"
                                    style="padding: 0.5rem 1rem; white-space: nowrap;">
                                🔄 Limpiar
                            </button>
                        </div>
                    </div>
                    <p style="font-size: 0.85rem; color: var(--secondary); opacity: 0.8; margin-top: 0; margin-bottom: 0;">
                        💡 Selecciona una fecha para ver solo las ventas de ese día específico.
                    </p>
                    
                    <h3 style="margin-bottom: 1rem; font-size: 1rem; margin-top: 1.5rem;">💳 Filtrar por Método de Pago:</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        <button class="btn btn-sm ${this.currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="SalesView.filterByPaymentMethod('all')">
                            📋 Todas las Secciones
                        </button>
                        <button class="btn btn-sm ${this.currentFilter === 'cash' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="SalesView.filterByPaymentMethod('cash')">
                            💵 Solo Efectivo
                        </button>
                        <button class="btn btn-sm ${this.currentFilter === 'card' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="SalesView.filterByPaymentMethod('card')">
                            💳 Solo Tarjeta
                        </button>
                        <button class="btn btn-sm ${this.currentFilter === 'qr' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="SalesView.filterByPaymentMethod('qr')">
                            📱 Solo QR
                        </button>
                        <button class="btn btn-sm ${this.currentFilter === 'other' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="SalesView.filterByPaymentMethod('other')">
                            ➕ Solo Otro
                        </button>
                        <button class="btn btn-sm ${this.currentFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="SalesView.filterByPaymentMethod('pending')">
                            📝 Solo Anotado
                        </button>
                    </div>
                    <p style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--secondary); opacity: 0.8;">
                        💡 Las ventas se muestran agrupadas por método de pago. Usa los filtros para ver solo una sección específica.
                    </p>
                </div>
            </div>
            
            <div class="card">
                <div id="salesTable">
                    ${salesTableHtml}
                </div>
            </div>
        `;
    },

    async init() {
        // No init needed for now
    },

    // Helper: Obtener fecha en formato YYYY-MM-DD en hora local
    getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Helper: Comparar solo fechas (sin hora) en hora local
    compareDatesOnly(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);

        const d1Local = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
        const d2Local = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());

        if (d1Local < d2Local) return -1;
        if (d1Local > d2Local) return 1;
        return 0;
    },

    async filterByPaymentMethod(method) {
        this.currentFilter = method;
        await this.refresh();
    },

    async applyDateFilter() {
        const dateFilterInput = document.getElementById('dateFilter');

        if (dateFilterInput) {
            const selectedDate = dateFilterInput.value || null;

            // Siempre usar la misma fecha para ambos campos (filtro de fecha única)
            if (selectedDate) {
                this.dateFrom = selectedDate;
                this.dateTo = selectedDate;
            } else {
                this.dateFrom = null;
                this.dateTo = null;
            }

            await this.refresh();
        }
    },

    async selectToday() {
        const today = new Date();
        const todayStr = this.getLocalDateString(today);

        const dateFilterInput = document.getElementById('dateFilter');

        if (dateFilterInput) {
            dateFilterInput.value = todayStr;

            this.dateFrom = todayStr;
            this.dateTo = todayStr;

            await this.refresh();
        }
    },

    async clearDateFilter() {
        this.dateFrom = null;
        this.dateTo = null;

        const dateFilterInput = document.getElementById('dateFilter');

        if (dateFilterInput) {
            // Limpiar el campo de fecha
            dateFilterInput.value = '';
        }

        await this.refresh();
    },

    filterSalesByDate(sales) {
        // Si no hay filtro de fecha, mostrar todas las ventas
        if (!this.dateFrom && !this.dateTo) {
            return sales;
        }

        // Usar la fecha seleccionada (ambas son iguales en filtro de fecha única)
        const filterDate = this.dateFrom || this.dateTo;
        if (!filterDate) {
            return sales;
        }

        // Parsear fecha del filtro (YYYY-MM-DD) y convertir a fecha local
        const filterParts = filterDate.split('-');
        const filterDateLocal = new Date(parseInt(filterParts[0]), parseInt(filterParts[1]) - 1, parseInt(filterParts[2]));

        return sales.filter(sale => {
            // Obtener fecha de la venta y convertir a fecha local (solo año, mes, día)
            const saleDate = new Date(sale.date);
            const saleDateLocal = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());

            // Comparar solo las fechas (sin hora)
            return saleDateLocal.getTime() === filterDateLocal.getTime();
        });
    },

    async renderSalesTable(sales) {
        // Primero filtrar por fecha
        const dateFilteredSales = this.filterSalesByDate(sales);

        // Mostrar mensaje si no hay ventas en la fecha seleccionada
        if (dateFilteredSales.length === 0) {
            let dateText = '';
            if (this.dateFrom || this.dateTo) {
                const selectedDate = this.dateFrom || this.dateTo;
                const dateObj = new Date(selectedDate + 'T00:00:00');
                dateText = ` del ${formatDate(dateObj.toISOString())}`;
            }
            return `<div class="empty-state"><div class="empty-state-icon">📋</div>No hay ventas registradas${dateText}</div>`;
        }

        // Luego aplicar filtro de método de pago si existe
        if (this.currentFilter !== 'all') {
            const filteredSales = dateFilteredSales.filter(s => {
                // Si el filtro es 'pending', incluir todas las que no estén completadas o tengan método pending
                if (this.currentFilter === 'pending') {
                    return s.status === 'pending' || s.status === 'partial' || s.paymentMethod === 'pending';
                }

                // Para otros filtros, revisar detalles mixtos o el método principal
                if (s.paymentDetails && typeof s.paymentDetails === 'object') {
                    return s.paymentDetails[this.currentFilter] !== undefined && parseFloat(s.paymentDetails[this.currentFilter]) > 0;
                }
                return s.paymentMethod === this.currentFilter;
            });

            if (filteredSales.length === 0) {
                const filterName = this.getPaymentMethodName(this.currentFilter);
                let dateText = '';
                if (this.dateFrom || this.dateTo) {
                    const selectedDate = this.dateFrom || this.dateTo;
                    const dateObj = new Date(selectedDate + 'T00:00:00');
                    dateText = ` del ${formatDate(dateObj.toISOString())}`;
                }
                return `<div class="empty-state"><div class="empty-state-icon">📋</div>No hay ventas en ${filterName}${dateText}</div>`;
            }

            return await this.renderGroupedSalesTable(filteredSales, [this.currentFilter]);
        }

        return await this.renderGroupedSalesTable(dateFilteredSales);
    },

    // Helper: Calcular el monto realmente pagado con un método específico para una venta
    async getAmountPaidByMethod(sale, targetMethod) {
        try {
            // Primero intentar obtener los Payment records asociados
            const payments = await Payment.getBySale(sale.id);

            if (payments.length > 0) {
                // Si hay Payment records, sumar solo los pagos de este método
                return payments
                    .filter(p => (p.paymentMethod || 'cash') === targetMethod)
                    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            }

            // Si no hay Payment records, verificar paymentDetails
            if (sale.paymentDetails && typeof sale.paymentDetails === 'object') {
                const amount = parseFloat(sale.paymentDetails[targetMethod]) || 0;
                if (amount > 0) {
                    return amount;
                }
            }

            // Si el método de pago de la venta coincide y la venta está completada
            if (sale.paymentMethod === targetMethod && sale.status === 'completed') {
                return parseFloat(sale.total) || 0;
            }

            // Si el método coincide pero es parcial, usar paidAmount
            if (sale.paymentMethod === targetMethod && sale.status === 'partial') {
                return parseFloat(sale.paidAmount) || 0;
            }

            // Si el método coincide y es pending, usar paidAmount si existe
            if (sale.paymentMethod === targetMethod && sale.status === 'pending') {
                return parseFloat(sale.paidAmount) || 0;
            }

            return 0;
        } catch (error) {
            console.error(`Error calculando monto pagado para venta ${sale.id} método ${targetMethod}:`, error);
            // Fallback: si hay error, usar lógica simple
            if (sale.paymentMethod === targetMethod) {
                return sale.status === 'completed'
                    ? (parseFloat(sale.total) || 0)
                    : (parseFloat(sale.paidAmount) || 0);
            }
            return 0;
        }
    },

    async renderGroupedSalesTable(sales, filterMethods = null) {
        const groupedSales = {
            cash: [],
            card: [],
            qr: [],
            other: [],
            pending: [],
            mixed: []
        };

        sales.forEach(sale => {
            // Si hay un filtro específico activo (ej: Solo Efectivo), poner todas en ese grupo
            if (filterMethods && filterMethods.length === 1) {
                const method = filterMethods[0];
                if (groupedSales[method]) {
                    groupedSales[method].push(sale);
                    return;
                }
            }

            // PRIORIDAD VISTA GENERAL: Si es anotado (pendiente o parcial), va a la sección "pending"
            if (sale.paymentMethod === 'pending' || sale.status === 'pending' || sale.status === 'partial') {
                groupedSales.pending.push(sale);
            }
            // Luego, si tiene varios métodos y no es crédito, va a mixtos
            else if (sale.paymentDetails && typeof sale.paymentDetails === 'object' && Object.keys(sale.paymentDetails).length > 0) {
                groupedSales.mixed.push(sale);
            }
            // Finalmente, agrupación por método simple
            else {
                const method = sale.paymentMethod || 'cash';
                if (groupedSales[method]) {
                    groupedSales[method].push(sale);
                } else {
                    groupedSales.other.push(sale);
                }
            }
        });

        const order = ['cash', 'card', 'qr', 'other', 'pending', 'mixed'];
        const methodsToShow = filterMethods || order;

        // Calcular total general sumando solo montos realmente pagados
        // C4: Optimización — Usar paidAmount directamente en vez de hacer 100 llamadas a Payment.getBySale
        const grandTotal = sales.reduce((sum, sale) => sum + (parseFloat(sale.paidAmount) || 0), 0);
        const grandCount = sales.length;

        let dateText = '';
        if (this.dateFrom || this.dateTo) {
            const selectedDate = this.dateFrom || this.dateTo;
            const dateObj = new Date(selectedDate + 'T00:00:00');
            dateText = ` (${formatDate(dateObj.toISOString())})`;
        }

        let html = '';

        if (!filterMethods || filterMethods.length === order.length) {
            html += `
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600; opacity: 0.9;">
                                📊 Resumen General${dateText}
                            </h3>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; opacity: 0.8;">
                                ${grandCount} venta${grandCount !== 1 ? 's' : ''} en total
                            </p>
                        </div>
                        <div style="font-size: 1.5rem; font-weight: 700; background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 0.375rem;">
                            Total Pagado: ${formatCLP(grandTotal)}
                        </div>
                    </div>
                </div>
            `;
        }

        for (const method of methodsToShow) {
            const methodSales = groupedSales[method];
            if (methodSales.length === 0) continue;

            const methodName = method === 'mixed' ? 'Pago Mixto' : this.getPaymentMethodName(method);

            // Calcular total sumando solo los montos realmente pagados con este método
            // Usar Promise.all para optimizar las llamadas asíncronas
            const totalPromises = methodSales.map(async (sale) => {
                if (method === 'mixed') {
                    // Para pagos mixtos, sumar todos los métodos de paymentDetails
                    if (sale.paymentDetails && typeof sale.paymentDetails === 'object') {
                        return Object.values(sale.paymentDetails).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
                    } else {
                        // Si no hay paymentDetails, consultar Payment records
                        try {
                            const payments = await Payment.getBySale(sale.id);
                            if (payments.length > 0) {
                                return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                            }
                        } catch (error) {
                            console.error(`Error obteniendo pagos para venta mixta ${sale.id}:`, error);
                        }
                        return parseFloat(sale.paidAmount) || parseFloat(sale.total) || 0;
                    }
                } else {
                    // Para métodos específicos, usar la función helper
                    return await this.getAmountPaidByMethod(sale, method);
                }
            });

            const totalValues = await Promise.all(totalPromises);
            const total = totalValues.reduce((sum, val) => sum + val, 0);
            const count = methodSales.length;

            const icons = {
                cash: '💵',
                card: '💳',
                qr: '📱',
                other: '➕',
                pending: '📝',
                mixed: '🔀'
            };

            const saleRows = await Promise.all(methodSales.map(async s => await this.renderSaleRow(s)));

            html += `
                <div style="margin-bottom: 2rem; border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden;">
                    <div style="padding: 1rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; border-bottom: 2px solid var(--primary-dark);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; font-size: 1.2rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                <span>${icons[method] || '📋'}</span>
                                <span>${methodName}</span>
                            </h3>
                            <div style="display: flex; gap: 1.5rem; align-items: center;">
                                <span style="font-size: 0.95rem; opacity: 0.9;">
                                    ${count} venta${count !== 1 ? 's' : ''}
                                </span>
                                <span style="font-size: 1.2rem; font-weight: 700; background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 0.25rem;">
                                    Total: ${formatCLP(total)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 80px;">#</th>
                                    <th style="width: 150px;">Fecha y Hora</th>
                                    <th style="width: 70px;">Items</th>
                                    <th style="width: 180px;">Cliente</th>
                                    <th style="width: 200px;">Método de Pago</th>
                                    <th style="width: 120px;">Total</th>
                                    <th style="width: 100px;">Estado</th>
                                    <th style="width: 140px;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${saleRows.join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        if (html === '') {
            return `<div class="empty-state"><div class="empty-state-icon">📋</div>No hay ventas registradas</div>`;
        }

        return html;
    },

    async renderSaleRow(s) {
        let customerName = '-';
        if (s.customerId) {
            try {
                const customer = await Customer.getById(s.customerId);
                customerName = customer ? customer.name : 'Cliente no encontrado';
            } catch (error) {
                console.error(`Error obteniendo cliente ${s.customerId}:`, error);
                customerName = 'Error al cargar';
            }
        }

        let paymentMethodDisplay = '';
        try {
            const payments = await Payment.getBySale(s.id);

            if (payments.length > 0) {
                const paymentsByMethod = {};
                payments.forEach(payment => {
                    const method = payment.paymentMethod || 'cash';
                    if (!paymentsByMethod[method]) {
                        paymentsByMethod[method] = 0;
                    }
                    paymentsByMethod[method] += parseFloat(payment.amount) || 0;
                });

                const paymentParts = Object.entries(paymentsByMethod).map(([method, amount]) => {
                    return `${formatCLP(amount)} ${this.getPaymentMethodName(method)}`;
                });

                paymentMethodDisplay = paymentParts.join(' + ');
            } else {
                if (s.paymentDetails && typeof s.paymentDetails === 'object' && Object.keys(s.paymentDetails).length > 0) {
                    const methods = Object.entries(s.paymentDetails)
                        .filter(([m, amount]) => parseFloat(amount) > 0)
                        .map(([m, amount]) => `${formatCLP(parseFloat(amount))} ${this.getPaymentMethodName(m)}`);
                    paymentMethodDisplay = methods.join(' + ');
                } else {
                    const paidAmount = parseFloat(s.paidAmount) || 0;
                    if (paidAmount > 0) {
                        paymentMethodDisplay = `${formatCLP(paidAmount)} ${this.getPaymentMethodName(s.paymentMethod)}`;
                    } else {
                        paymentMethodDisplay = this.getPaymentMethodName(s.paymentMethod);
                    }
                }
            }
        } catch (error) {
            console.error(`Error obteniendo pagos para venta ${s.id}:`, error);
            paymentMethodDisplay = this.getPaymentMethodName(s.paymentMethod);
        }

        // Si la venta tiene saldo pendiente, añadir "Anotado" a la visualización del método
        if (s.status === 'pending' || s.status === 'partial') {
            const pendingText = this.getPaymentMethodName('pending');
            if (paymentMethodDisplay && !paymentMethodDisplay.includes(pendingText)) {
                paymentMethodDisplay += ` + ${pendingText}`;
            } else if (!paymentMethodDisplay) {
                paymentMethodDisplay = pendingText;
            }
        }

        const statusBadge = s.status === 'completed'
            ? '<span class="badge badge-success">Completada</span>'
            : s.status === 'partial'
                ? '<span class="badge badge-warning">Parcial</span>'
                : '<span class="badge badge-danger">Pendiente</span>';

        return `
            <tr>
                <td><strong>#${s.saleNumber}</strong></td>
                <td>${formatDateTime(s.date)}</td>
                <td>${s.items.length}</td>
                <td><strong>${customerName}</strong></td>
                <td>
                    <span class="badge badge-info" style="white-space: nowrap;">
                        ${paymentMethodDisplay}
                    </span>
                </td>
                <td><strong>${formatCLP(s.total)}</strong></td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="SalesView.viewSale(${s.id})" title="Ver detalles">
                        👁️
                    </button>
                    ${PermissionService.can('sales.edit') ? `
                    <button class="btn btn-sm btn-primary" onclick="SalesView.editSale(${s.id})" title="Editar venta" style="margin-left: 0.25rem;">
                        ✏️
                    </button>` : ''}
                    ${PermissionService.can('sales.return') ? `
                    <button class="btn btn-sm btn-warning" onclick="SalesView.showReturnModal(${s.id})" title="Devolver productos" style="margin-left: 0.25rem;">
                        ↩️` : ''}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="SalesView.deleteSale(${s.id})" title="Eliminar venta" style="margin-left: 0.25rem;">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
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

    async viewSale(saleId) {
        const sale = await Sale.getById(saleId);
        if (!sale) {
            showNotification('Venta no encontrada', 'error');
            return;
        }

        const customer = sale.customerId ? await Customer.getById(sale.customerId) : null;
        const payments = await Payment.getBySale(saleId);

        // Calcular total pagado
        const totalPaid = parseFloat(sale.paidAmount) || 0;
        const totalSale = parseFloat(sale.total) || 0;
        const pendingAmount = totalSale - totalPaid;

        let paymentInfoHtml = '';

        // Construir lista de todos los pagos (iniciales y posteriores)
        const allPayments = [];

        // 1. Agregar pago inicial desde paymentDetails (si existe y no está en Payment records)
        if (sale.paymentDetails && typeof sale.paymentDetails === 'object' && Object.keys(sale.paymentDetails).length > 0) {
            const initialPaymentAmount = Object.values(sale.paymentDetails).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);

            // Verificar si este pago inicial ya está registrado en Payment records
            const initialPaymentsTotal = payments
                .filter(p => {
                    const paymentDate = new Date(p.date);
                    const saleDate = new Date(sale.date);
                    // Considerar pagos del mismo día como pago inicial
                    return paymentDate.toDateString() === saleDate.toDateString();
                })
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

            // Si el monto inicial no coincide con los Payment records, mostrar paymentDetails
            if (Math.abs(initialPaymentAmount - initialPaymentsTotal) > 0.01) {
                Object.entries(sale.paymentDetails).forEach(([method, amount]) => {
                    const amountNum = parseFloat(amount) || 0;
                    if (amountNum > 0) {
                        allPayments.push({
                            type: 'initial',
                            method: method,
                            amount: amountNum,
                            date: sale.date,
                            notes: 'Pago inicial de la venta'
                        });
                    }
                });
            }
        }

        // 2. Agregar todos los Payment records (pagos posteriores)
        payments.forEach(payment => {
            allPayments.push({
                type: 'subsequent',
                method: payment.paymentMethod || 'cash',
                amount: parseFloat(payment.amount) || 0,
                date: payment.date,
                notes: payment.notes || 'Pago de deuda'
            });
        });

        // Ordenar pagos por fecha
        allPayments.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Generar HTML de pagos
        if (allPayments.length > 0) {
            // Agrupar por método para resumen
            const paymentsByMethod = {};
            allPayments.forEach(payment => {
                const method = payment.method || 'cash';
                if (!paymentsByMethod[method]) {
                    paymentsByMethod[method] = 0;
                }
                paymentsByMethod[method] += payment.amount;
            });

            paymentInfoHtml = `
                <div style="margin-top: 1rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                    <h4 style="margin-bottom: 0.75rem; font-size: 1rem;">💳 Pagos Realizados:</h4>
                    
                    <!-- Lista detallada de pagos -->
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
                        ${allPayments.map((payment, index) => {
                const isInitial = payment.type === 'initial';
                const paymentDate = new Date(payment.date);
                return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: white; border-radius: 0.25rem; border-left: 3px solid ${isInitial ? 'var(--primary)' : 'var(--success)'};">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                            <span style="font-weight: 600; color: var(--primary);">
                                                ${isInitial ? '💰' : '💵'} ${this.getPaymentMethodName(payment.method)}
                                            </span>
                                            ${isInitial ? '<span style="font-size: 0.75rem; color: var(--secondary); background: var(--light); padding: 0.125rem 0.5rem; border-radius: 0.25rem;">Inicial</span>' : ''}
                                        </div>
                                        <div style="font-size: 0.85rem; color: var(--secondary);">
                                            ${formatDateTime(payment.date)}
                                            ${payment.notes ? ` • ${payment.notes}` : ''}
                                        </div>
                                    </div>
                                    <div style="font-weight: 700; font-size: 1.1rem; color: var(--success); margin-left: 1rem;">
                                        ${formatCLP(payment.amount)}
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                    
                    <!-- Resumen por método -->
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 2px solid var(--border);">
                        <h5 style="margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--secondary);">Resumen por Método:</h5>
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            ${Object.entries(paymentsByMethod).map(([method, totalByMethod]) => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: white; border-radius: 0.25rem;">
                                    <span><strong>${this.getPaymentMethodName(method)}:</strong></span>
                                    <span style="font-weight: 600; color: var(--primary);">${formatCLP(totalByMethod)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Totales -->
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 2px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 1.1rem; margin-bottom: 0.5rem;">
                            <span>Total Pagado:</span>
                            <span style="color: var(--success);">${formatCLP(totalPaid)}</span>
                        </div>
                        ${pendingAmount > 0 ? `
                            <div style="display: flex; justify-content: space-between; color: var(--warning); font-weight: 600;">
                                <span>💰 Pendiente:</span>
                                <span>${formatCLP(pendingAmount)}</span>
                            </div>
                        ` : `
                            <div style="display: flex; justify-content: space-between; color: var(--success); font-weight: 600;">
                                <span>✅ Venta Completada</span>
                            </div>
                        `}
                    </div>
                </div>
            `;
        } else {
            // Si no hay pagos registrados pero hay deuda pendiente
            if (sale.status === 'pending' || sale.status === 'partial') {
                paymentInfoHtml = `
                    <div style="margin-top: 1rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                        <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 1.1rem;">
                            <span>Total de la Venta:</span>
                            <span>${formatCLP(totalSale)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; color: var(--warning); font-weight: 600; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border);">
                            <span>💰 Pendiente:</span>
                            <span>${formatCLP(pendingAmount)}</span>
                        </div>
                    </div>
                `;
            }
        }

        const content = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 0.5rem; border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.3rem; color: var(--primary);">Venta #${sale.saleNumber}</h3>
                        <p style="margin: 0; color: var(--secondary); font-size: 0.9rem;"><strong>Fecha:</strong> ${formatDateTime(sale.date)}</p>
                    </div>
                    <div>
                        ${sale.status === 'completed'
                ? '<span class="badge badge-success" style="font-size: 0.9rem;">✅ Completada</span>'
                : sale.status === 'partial'
                    ? '<span class="badge badge-warning" style="font-size: 0.9rem;">⚠️ Parcial</span>'
                    : '<span class="badge badge-danger" style="font-size: 0.9rem;">📝 Pendiente</span>'}
                    </div>
                </div>
                ${customer ? `
                    <div style="padding: 0.75rem; background: white; border-radius: 0.375rem; border: 1px solid var(--border);">
                        <div style="font-size: 0.85rem; color: var(--secondary); margin-bottom: 0.25rem;">Cliente:</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary);">👤 ${customer.name}</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unitario</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${formatCLP(item.unitPrice ?? item.price ?? 0)}</td>
                                <td><strong>${formatCLP(item.total)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            ${paymentInfoHtml}
            
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; font-size: 1.1rem;">
                    <strong>Total de la Venta:</strong>
                    <strong>${formatCLP(sale.total)}</strong>
                </div>
            </div>
        `;

        // C5: Obtener resumen de devoluciones para esta venta
        let returnsHtml = '';
        try {
            const returnSummary = await SaleReturnService.getReturnSummary(sale.id);
            if (returnSummary.returns.length > 0) {
                returnsHtml = `
                    <div style="margin-top: 1.5rem; padding: 1rem; background: #fef3c7; border-radius: 0.375rem; border-left: 4px solid #f59e0b;">
                        <h4 style="margin: 0 0 0.75rem 0; color: #92400e;">↩️ Devoluciones Registradas (${returnSummary.returns.length})</h4>
                        ${returnSummary.returns.map(ret => `
                            <div style="padding: 0.5rem; margin-bottom: 0.5rem; background: white; border-radius: 0.25rem; border: 1px solid #fde68a;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong style="color: #92400e;">Dev #${ret.id}</strong>
                                        <span style="font-size: 0.85rem; color: var(--secondary); margin-left: 0.5rem;">${formatDateTime(ret.date)}</span>
                                    </div>
                                    <strong style="color: #dc2626;">-${formatCLP(ret.totalReturned)}</strong>
                                </div>
                                <div style="font-size: 0.85rem; color: var(--secondary); margin-top: 0.25rem;">
                                    ${(ret.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}
                                    ${ret.reason ? ` — <em>${ret.reason}</em>` : ''}
                                </div>
                            </div>
                        `).join('')}
                        <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #fde68a; display: flex; justify-content: space-between; font-weight: 600;">
                            <span>Total Devuelto:</span>
                            <span style="color: #dc2626;">-${formatCLP(returnSummary.totalReturned)}</span>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.warn('Error obteniendo devoluciones:', e);
        }

        const fullContent = content + returnsHtml;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            ${PermissionService.can('sales.return') ? `<button class="btn btn-warning" onclick="SalesView.showReturnModal(${sale.id})" style="margin-left: 0.5rem;">↩️ Devolver</button>` : ''}
            ${PermissionService.can('sales.edit') ? `<button class="btn btn-primary" onclick="SalesView.editSale(${sale.id})" style="margin-left: 0.5rem;">✏️ Editar Venta</button>` : ''}
        `;

        showModal(fullContent, { title: `Venta #${sale.saleNumber}`, footer, width: '700px' });
    },

    async editSale(saleId) {
        const sale = await Sale.getById(saleId);
        if (!sale) {
            showNotification('Venta no encontrada', 'error');
            return;
        }

        const customer = sale.customerId ? await Customer.getById(sale.customerId) : null;
        const allCustomers = await Customer.getAll();

        const content = `
            <div style="margin-bottom: 1.5rem;">
                <p><strong>Venta #${sale.saleNumber}</strong></p>
                <p><strong>Fecha:</strong> ${formatDateTime(sale.date)}</p>
            </div>
            
            <div class="form-group">
                <label>Cliente</label>
                <select id="editSaleCustomer" class="form-control">
                    <option value="">Sin cliente</option>
                    ${allCustomers.map(c => `
                        <option value="${c.id}" ${sale.customerId === c.id ? 'selected' : ''}>${c.name}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>Método de Pago</label>
                <select id="editSalePaymentMethod" class="form-control">
                    <option value="cash" ${sale.paymentMethod === 'cash' ? 'selected' : ''}>💵 Efectivo</option>
                    <option value="card" ${sale.paymentMethod === 'card' ? 'selected' : ''}>💳 Tarjeta</option>
                    <option value="qr" ${sale.paymentMethod === 'qr' ? 'selected' : ''}>📱 QR</option>
                    <option value="other" ${sale.paymentMethod === 'other' ? 'selected' : ''}>➕ Otro</option>
                    <option value="pending" ${sale.paymentMethod === 'pending' ? 'selected' : ''}>📝 Anotado</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Estado</label>
                <select id="editSaleStatus" class="form-control">
                    <option value="completed" ${sale.status === 'completed' ? 'selected' : ''}>Completada</option>
                    <option value="partial" ${sale.status === 'partial' ? 'selected' : ''}>Parcial</option>
                    <option value="pending" ${sale.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Monto Pagado</label>
                <input type="number" id="editSalePaidAmount" class="form-control" 
                       value="${sale.paidAmount || 0}" 
                       min="0" 
                       max="${sale.total}" 
                       step="10">
                <small>Total de la venta: ${formatCLP(sale.total)}</small>
            </div>
            
            <div style="margin-top: 1.5rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                <h4 style="margin-bottom: 1rem;">Items de la Venta</h4>
                <div id="editSaleItems">
                    ${sale.items.map((item, index) => `
                        <div style="padding: 0.75rem; margin-bottom: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem; background: white;">
                            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 0.5rem; align-items: center;">
                                <div>
                                    <strong>${item.name}</strong>
                                    <br><small style="color: var(--secondary);">${item.type === 'weight' ? 'Por peso' : 'Por unidad'}</small>
                                </div>
                                <div>
                                    <label style="font-size: 0.85rem;">Cantidad</label>
                                    <input type="number" 
                                           class="form-control" 
                                           value="${item.quantity}" 
                                           min="0.001" 
                                           step="${item.type === 'weight' ? '0.001' : '1'}"
                                           data-item-index="${index}"
                                           data-item-field="quantity"
                                           style="padding: 0.25rem; font-size: 0.9rem;"
                                           onchange="SalesView.updateItemField(${saleId}, ${index}, 'quantity', this.value)">
                                </div>
                                <div>
                                    <label style="font-size: 0.85rem;">Precio Unit.</label>
                                    <input type="number" 
                                           class="form-control" 
                                           value="${item.unitPrice}" 
                                           min="0" 
                                           step="10"
                                           data-item-index="${index}"
                                           data-item-field="unitPrice"
                                           style="padding: 0.25rem; font-size: 0.9rem;"
                                           onchange="SalesView.updateItemField(${saleId}, ${index}, 'unitPrice', this.value)">
                                </div>
                                <div>
                                    <label style="font-size: 0.85rem;">Total</label>
                                    <input type="number" 
                                           class="form-control" 
                                           value="${item.total}" 
                                           min="0" 
                                           step="10"
                                           data-item-index="${index}"
                                           data-item-field="total"
                                           style="padding: 0.25rem; font-size: 0.9rem; font-weight: 600;"
                                           onchange="SalesView.updateItemField(${saleId}, ${index}, 'total', this.value)">
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="SalesView.removeSaleItem(${saleId}, ${index})"
                                            title="Eliminar item">
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-top: 1.5rem; padding: 1rem; background: #e0f2fe; border-radius: 0.375rem;">
                <div style="display: flex; justify-content: space-between; font-size: 1.1rem;">
                    <strong>Total:</strong>
                    <strong id="editSaleTotal">${formatCLP(sale.total)}</strong>
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="SalesView.viewSale(${saleId})">Cancelar</button>
            <button class="btn btn-primary" onclick="SalesView.saveSale(${saleId})">💾 Guardar Cambios</button>
        `;

        showModal(content, { title: `Editar Venta #${sale.saleNumber}`, footer, width: '800px' });
    },

    async updateItemField(saleId, itemIndex, field, value) {
        const sale = await Sale.getById(saleId);
        if (!sale || !sale.items[itemIndex]) return;

        const item = sale.items[itemIndex];
        const numValue = parseFloat(value) || 0;

        if (field === 'quantity') {
            item.quantity = numValue;
            item.total = roundPrice(item.quantity * item.unitPrice);
        } else if (field === 'unitPrice') {
            item.unitPrice = numValue;
            item.total = roundPrice(item.quantity * item.unitPrice);
        } else if (field === 'total') {
            item.total = numValue;
            if (item.quantity > 0) {
                item.unitPrice = roundPrice(item.total / item.quantity);
            }
        }

        const totalInput = document.querySelector(`input[data-item-index="${itemIndex}"][data-item-field="total"]`);
        if (totalInput) {
            totalInput.value = item.total;
        }

        const newSubtotal = sale.items.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
        const newTotal = roundPrice(newSubtotal);

        const totalDisplay = document.getElementById('editSaleTotal');
        if (totalDisplay) {
            totalDisplay.textContent = formatCLP(newTotal);
        }

        const paidAmountInput = document.getElementById('editSalePaidAmount');
        if (paidAmountInput) {
            paidAmountInput.max = newTotal;
            const currentPaid = parseFloat(paidAmountInput.value) || 0;
            // Si la venta estaba completada, paidAmount sigue al total
            if (sale.status === 'completed') {
                paidAmountInput.value = newTotal;
            } else if (currentPaid > newTotal) {
                // Si el monto pagado excede el nuevo total, capear al nuevo total
                paidAmountInput.value = newTotal;
            }
            // Recalcular estado visual
            const updatedPaid = parseFloat(paidAmountInput.value) || 0;
            const statusSelect = document.getElementById('editSaleStatus');
            if (statusSelect) {
                if (updatedPaid >= newTotal) {
                    statusSelect.value = 'completed';
                } else if (updatedPaid > 0) {
                    statusSelect.value = 'partial';
                } else {
                    statusSelect.value = 'pending';
                }
            }
        }
    },

    async removeSaleItem(saleId, itemIndex) {
        const sale = await Sale.getById(saleId);
        if (!sale || !sale.items[itemIndex]) return;

        if (sale.items.length <= 1) {
            showNotification('No puedes eliminar todos los items de la venta', 'warning');
            return;
        }

        showConfirm('¿Eliminar este item de la venta?', async () => {
            sale.items.splice(itemIndex, 1);

            const subtotal = sale.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
            const total = roundPrice(subtotal);

            await Sale.updateSale(saleId, {
                items: sale.items,
                subtotal: subtotal,
                total: total
            });

            showNotification('Item eliminado', 'success');
            this.editSale(saleId);
        });
    },

    async saveSale(saleId) {
        const sale = await Sale.getById(saleId);
        if (!sale) {
            showNotification('Venta no encontrada', 'error');
            return;
        }

        const customerIdSelect = document.getElementById('editSaleCustomer');
        const paymentMethodSelect = document.getElementById('editSalePaymentMethod');
        const statusSelect = document.getElementById('editSaleStatus');
        const paidAmountInput = document.getElementById('editSalePaidAmount');

        const customerId = customerIdSelect.value ? parseInt(customerIdSelect.value) : null;
        const paymentMethod = paymentMethodSelect.value;
        const status = statusSelect.value;
        const editedItems = sale.items.map((item, index) => {
            const quantityInput = document.querySelector(`input[data-item-index="${index}"][data-item-field="quantity"]`);
            const unitPriceInput = document.querySelector(`input[data-item-index="${index}"][data-item-field="unitPrice"]`);
            const totalInput = document.querySelector(`input[data-item-index="${index}"][data-item-field="total"]`);

            const quantity = parseFloat(quantityInput?.value) || 0;
            let unitPrice = parseFloat(unitPriceInput?.value) || 0;
            let total = parseFloat(totalInput?.value) || 0;

            if (quantity > 0 && total > 0 && unitPrice <= 0) {
                unitPrice = roundPrice(total / quantity);
            }

            if (quantity > 0 && (total <= 0 || isNaN(total))) {
                total = roundPrice(quantity * unitPrice);
            }

            return {
                ...item,
                quantity: quantity,
                unitPrice: unitPrice,
                total: total
            };
        });

        const subtotal = editedItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        const total = roundPrice(subtotal);
        let paidAmount = parseFloat(paidAmountInput.value) || 0;

        if (paidAmount < 0) {
            showNotification('El monto pagado no puede ser negativo', 'warning');
            return;
        }

        // Auto-ajustar paidAmount si excede el nuevo total (por cambio de ítems)
        if (paidAmount > total) {
            paidAmount = total;
        }

        const originalPaymentMethod = sale.paymentMethod;

        // Recalcular estado basado en paidAmount vs total
        let finalStatus;
        if (paidAmount >= total && total > 0) {
            finalStatus = 'completed';
        } else if (paidAmount > 0) {
            finalStatus = 'partial';
        } else {
            finalStatus = 'pending';
        }

        try {
            if (paymentMethod === 'pending') {
                const desiredPaid = Math.min(paidAmount, total);
                const abonoMethod = (originalPaymentMethod && originalPaymentMethod !== 'pending')
                    ? originalPaymentMethod
                    : 'cash';
                const paymentDetails = desiredPaid > 0 ? { [abonoMethod]: desiredPaid } : null;
                const updatedStatus = desiredPaid >= total
                    ? 'completed'
                    : desiredPaid > 0
                        ? 'partial'
                        : 'pending';

                await Sale.updateSale(saleId, {
                    customerId: customerId,
                    items: editedItems,
                    subtotal: subtotal,
                    total: total,
                    paymentMethod: 'pending',
                    paymentDetails: paymentDetails,
                    status: updatedStatus,
                    paidAmount: desiredPaid
                });

                showNotification('Venta actualizada exitosamente', 'success');
                closeModal();
                this.refresh();
                return;
            }

            await Sale.updateSale(saleId, {
                customerId: customerId,
                items: editedItems,
                subtotal: subtotal,
                total: total,
                paymentMethod: paymentMethod,
                paymentDetails: null,
                status: finalStatus,
                paidAmount: paidAmount
            });

            showNotification('Venta actualizada exitosamente', 'success');
            closeModal();
            this.refresh();
        } catch (error) {
            showNotification('Error al actualizar la venta: ' + error.message, 'error');
            console.error('Error al actualizar venta:', error);
        }
    },

    async refresh() {
        const sales = await Sale.getAll();
        const sortedSales = sales.sort((a, b) => new Date(b.date) - new Date(a.date));
        const tableContainer = document.getElementById('salesTable');
        if (tableContainer) {
            tableContainer.innerHTML = await this.renderSalesTable(sortedSales);
        }

        const filterButtons = document.querySelectorAll('[onclick*="filterByPaymentMethod"]');
        filterButtons.forEach(btn => {
            const method = btn.getAttribute('onclick').match(/'([^']+)'/)?.[1];
            if (method === this.currentFilter) {
                btn.className = btn.className.replace('btn-secondary', 'btn-primary');
            } else {
                btn.className = btn.className.replace('btn-primary', 'btn-secondary');
            }
        });

        const dateFilterInput = document.getElementById('dateFilter');

        if (dateFilterInput) {
            // Actualizar el campo de fecha con la fecha seleccionada (o vacío si no hay filtro)
            if (this.dateFrom || this.dateTo) {
                dateFilterInput.value = this.dateFrom || this.dateTo;
            } else {
                dateFilterInput.value = '';
            }
        }
    },

    // ===================== C5: DEVOLUCIONES =====================

    /**
     * C5: Muestra modal para crear una devolución de venta.
     * Calcula cantidades máximas devolvibles (vendidas - ya devueltas).
     */
    async deleteSale(saleId) {
        showConfirm('¿Estás seguro de que deseas eliminar permanentemente esta venta? Los productos volverán al stock automáticamente.', async () => {
            try {
                if (typeof SaleService !== 'undefined' && typeof SaleService.deleteSale === 'function') {
                    await SaleService.deleteSale(saleId);
                } else {
                    throw new Error('Mecanismo de eliminación no disponible en esta versión');
                }
                await this.refresh();
                showNotification('Venta eliminada y stock devuelto exitosamente', 'success');
            } catch (error) {
                showNotification(error.message, 'error');
            }
        });
    },

    async showReturnModal(saleId) {
        const sale = await Sale.getById(saleId);
        if (!sale) {
            showNotification('Venta no encontrada', 'error');
            return;
        }

        // Obtener cantidades ya devueltas
        const alreadyReturned = await SaleReturn.getReturnedQuantitiesBySale(saleId);

        // Construir lista de ítems con cantidades devolvibles
        const returnableItems = [];
        for (const item of (sale.items || [])) {
            const pid = Number(item.productId);
            const sold = parseFloat(item.quantity) || 0;
            const returned = alreadyReturned[pid] || 0;
            const maxReturnable = Math.max(0, sold - returned);
            if (maxReturnable > 0) {
                returnableItems.push({
                    productId: pid,
                    name: item.name || `Producto #${pid} `,
                    unitPrice: parseFloat(item.unitPrice || item.price) || 0,
                    sold: sold,
                    returned: returned,
                    maxReturnable: maxReturnable,
                    type: item.type || 'unit'
                });
            }
        }

        if (returnableItems.length === 0) {
            showNotification('Todos los productos de esta venta ya han sido devueltos', 'warning');
            return;
        }

        const openCash = await CashRegister.getOpen();

        const content = `
    <div style = "margin-bottom: 1rem; padding: 1rem; background: #fef3c7; border-radius: 0.375rem; border-left: 4px solid #f59e0b;" >
        <p style="margin: 0; font-size: 0.9rem; color: #92400e;">
            <strong>↩️ Devolución para Venta #${sale.saleNumber || saleId}</strong><br>
                Seleccione las cantidades a devolver por producto. El stock será restaurado automáticamente.
        </p>
            </div >

            <div id="returnItemsList">
                ${returnableItems.map((item, index) => `
                    <div style="padding: 0.75rem; margin-bottom: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem; background: white;">
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 0.5rem; align-items: center;">
                            <div>
                                <strong>${item.name}</strong>
                                <br><small style="color: var(--secondary);">Precio unit.: ${formatCLP(item.unitPrice)} | Vendidas: ${item.sold} | Devueltas: ${item.returned}</small>
                            </div>
                            <div>
                                <label style="font-size: 0.85rem;">Máx: ${item.maxReturnable}</label>
                                <input type="number" 
                                       class="form-control return-qty-input"
                                       id="returnQty_${index}"
                                       data-product-id="${item.productId}"
                                       data-unit-price="${item.unitPrice}"
                                       data-max="${item.maxReturnable}"
                                       value="0" min="0" max="${item.maxReturnable}" 
                                       step="${item.type === 'weight' ? '0.001' : '1'}"
                                       style="padding: 0.25rem; font-size: 0.9rem;"
                                       onchange="SalesView.updateReturnTotal()">
                            </div>
                            <div style="text-align: center;">
                                <button class="btn btn-sm btn-secondary" onclick="document.getElementById('returnQty_${index}').value = ${item.maxReturnable}; SalesView.updateReturnTotal();" title="Devolver todo">
                                    Todo
                                </button>
                            </div>
                            <div id="returnItemTotal_${index}" style="text-align: right; font-weight: 600;">
                                ${formatCLP(0)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="form-group" style="margin-top: 1rem;">
                <label>Motivo de la devolución</label>
                <input type="text" id="returnReason" class="form-control" placeholder="Ej: Producto defectuoso, error de cantidad, etc." maxlength="200">
            </div>

            ${openCash ? `
            <div class="form-group" style="margin-top: 1rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: var(--light); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border);">
                    <input type="checkbox" id="returnDeductFromCash" value="true" checked>
                    <span>📉 Reembolsar dinero desde la Caja Activa</span>
                </label>
                <small style="margin-left: 2rem; display: block; margin-top: 0.25rem;">Si marcas esto, el monto se descontará de la caja para entregárselo al cliente en efectivo.</small>
            </div>` : ''
            }

<div style="margin-top: 1rem; padding: 1rem; background: #fee2e2; border-radius: 0.375rem; border: 1px solid #fecaca;">
    <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 700; color: #dc2626;">
        <span>Total a Devolver:</span>
        <span id="returnGrandTotal">${formatCLP(0)}</span>
    </div>
</div>
`;

        const footer = `
    <button class="btn btn-secondary" onclick= "closeModal()" > Cancelar</button >
        <button class="btn btn-warning" onclick="SalesView.processReturn(${saleId})" id="btnProcessReturn">
            ↩️ Confirmar Devolución
        </button>
`;

        showModal(content, { title: `↩️ Devolución — Venta #${sale.saleNumber || saleId} `, footer, width: '750px' });
    },

    /**
     * C5: Actualiza el total de devolución en tiempo real.
     */
    updateReturnTotal() {
        const inputs = document.querySelectorAll('.return-qty-input');
        let grandTotal = 0;
        inputs.forEach((input, index) => {
            const qty = parseFloat(input.value) || 0;
            const max = parseFloat(input.dataset.max) || 0;
            const unitPrice = parseFloat(input.dataset.unitPrice) || 0;

            // Capear al máximo
            if (qty > max) {
                input.value = max;
            }
            if (qty < 0) {
                input.value = 0;
            }

            const effectiveQty = parseFloat(input.value) || 0;
            const itemTotal = roundPrice(effectiveQty * unitPrice);
            grandTotal += itemTotal;

            const itemTotalEl = document.getElementById(`returnItemTotal_${index} `);
            if (itemTotalEl) {
                itemTotalEl.textContent = formatCLP(itemTotal);
            }
        });

        const grandTotalEl = document.getElementById('returnGrandTotal');
        if (grandTotalEl) {
            grandTotalEl.textContent = formatCLP(grandTotal);
        }
    },

    /**
     * C5: Procesa la devolución llamando a SaleReturnService.
     */
    async processReturn(saleId) {
        const inputs = document.querySelectorAll('.return-qty-input');
        const returnItems = [];

        inputs.forEach(input => {
            const qty = parseFloat(input.value) || 0;
            if (qty > 0) {
                returnItems.push({
                    productId: Number(input.dataset.productId),
                    quantity: qty
                });
            }
        });

        if (returnItems.length === 0) {
            showNotification('Debe seleccionar al menos un producto con cantidad mayor a 0', 'warning');
            return;
        }

        const reason = (document.getElementById('returnReason')?.value || '').trim();

        // Calcular total para confirmación
        let totalToReturn = 0;
        inputs.forEach(input => {
            const qty = parseFloat(input.value) || 0;
            const unitPrice = parseFloat(input.dataset.unitPrice) || 0;
            totalToReturn += roundPrice(qty * unitPrice);
        });

        const deductFromCashElements = document.getElementById('returnDeductFromCash');
        const deductFromCashRegister = deductFromCashElements ? deductFromCashElements.checked : false;

        showConfirm(
            `¿Confirmar devolución por ${formatCLP(totalToReturn)}?\n\n` +
            `Se restaurará el stock de ${returnItems.length} producto(s).\n` +
            `La venta original NO se modifica.\n\n` +
            `${deductFromCashRegister ? `Monto se RETIRARÁ de la caja para el cliente.\n\n` : ''} ` +
            `${reason ? `Motivo: ${reason}` : ''} `,
            async () => {
                const btn = document.getElementById('btnProcessReturn');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Procesando...';
                }

                try {
                    const result = await SaleReturnService.processReturn(saleId, returnItems, reason, deductFromCashRegister);

                    closeModal();
                    showNotification(
                        `Devolución #${result.returnId} registrada exitosamente por ${formatCLP(result.totalReturned)}. Stock restaurado.`,
                        'success'
                    );
                    await this.refresh();
                } catch (error) {
                    showNotification(`Error al procesar devolución: ${error.message} `, 'error');
                    console.error('Error en devolución:', error);
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = '↩️ Confirmar Devolución';
                    }
                }
            }
        );
    },

    // ===================== FIN C5 =====================

    async deleteSale(saleId) {
        const sale = await Sale.getById(saleId);
        if (!sale) {
            showNotification('Venta no encontrada', 'error');
            return;
        }

        const saleInfo = `Venta #${sale.saleNumber || saleId} - ${formatCLP(sale.total)} - ${formatDateTime(sale.date)} `;

        showConfirm(
            `¿Estás seguro de eliminar esta venta ?\n\n${saleInfo} \n\n⚠️ Esta acción eliminará: \n` +
            `• La venta del historial\n` +
            `• Todos los pagos asociados\n` +
            `• Los movimientos de caja relacionados\n` +
            `• Se restaurará el stock de los productos\n\n` +
            `Esta acción NO se puede deshacer.`,
            async () => {
                try {
                    await Sale.delete(saleId);

                    showNotification(`Venta #${sale.saleNumber || saleId} eliminada correctamente.Stock y caja actualizados.`, 'success');

                    await this.refresh();
                } catch (error) {
                    console.error('Error eliminando venta:', error);
                    showNotification(`Error al eliminar la venta: ${error.message} `, 'error');
                }
            }
        );
    }
};

