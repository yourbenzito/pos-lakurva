const PurchasesView = {
    currentSection: 'list',
    selectedDailyDate: null,
    selectedMonthKey: null,
    currentStep: 1,
    draftKey: 'pending_purchase_draft',

    parkPurchase() {
        const form = document.getElementById('purchaseForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        const draft = {
            items: this.purchaseItems,
            supplierId: data.supplierId,
            documentType: data.documentType,
            invoiceNumber: data.invoiceNumber,
            invoiceDate: data.invoiceDate,
            vatMode: document.getElementById('invoiceVatMode')?.value || 'net',
            currentStep: this.currentStep,
            timestamp: new Date().getTime()
        };

        localStorage.setItem(this.draftKey, JSON.stringify(draft));
        closeModal();
        showNotification('Compra estacionada. Podrás retomarla cuando vuelvas a "Nueva Compra".', 'info');
    },

    getDraft() {
        const saved = localStorage.getItem(this.draftKey);
        if (!saved) return null;
        try {
            return JSON.parse(saved);
        } catch (e) {
            return null;
        }
    },

    clearDraft() {
        localStorage.removeItem(this.draftKey);
    },

    autosaveDraft() {
        const form = document.getElementById('purchaseForm');
        if (!form) return;

        // Solo autoguardar si es una compra nueva (no edición)
        const idInput = form.querySelector('[name="id"]');
        if (idInput && idInput.value) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        const draft = {
            items: this.purchaseItems,
            supplierId: data.supplierId,
            documentType: data.documentType,
            invoiceNumber: data.invoiceNumber,
            invoiceDate: data.invoiceDate,
            vatMode: document.getElementById('invoiceVatMode')?.value || 'net',
            currentStep: this.currentStep,
            timestamp: new Date().getTime()
        };

        if (this.purchaseItems.length > 0 || data.supplierId) {
            localStorage.setItem(this.draftKey, JSON.stringify(draft));
        }
    },

    goToStep(step) {
        if (step > this.currentStep) {
            // Validaciones antes de avanzar
            if (this.currentStep === 1) {
                const supplierId = document.querySelector('[name="supplierId"]').value;
                const docType = document.getElementById('purchaseDocumentType').value;
                const invoiceNumber = document.querySelector('[name="invoiceNumber"]').value;

                if (!supplierId) {
                    showNotification('Selecciona un proveedor para continuar', 'warning');
                    return;
                }

                if (docType === 'factura' && !invoiceNumber) {
                    showNotification('El N° de Factura es obligatorio para este tipo de documento', 'warning');
                    return;
                }
            }
            if (this.currentStep === 2 && this.purchaseItems.length === 0) {
                showNotification('Debes agregar al menos un producto a la compra', 'warning');
                return;
            }
        }

        if (this.currentStep === 2 && step !== 2) {
            this.cancelAddProduct();
        }

        this.currentStep = step;
        this.updateWizardUI();
    },

    nextStep() {
        this.goToStep(this.currentStep + 1);
    },

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateWizardUI();
        }
    },

    updateWizardUI() {
        // Reset all steps
        document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.step-item').forEach(el => {
            el.classList.remove('active', 'completed');
            const stepNum = parseInt(el.id.replace('step-', ''));
            if (stepNum < this.currentStep) el.classList.add('completed');
            if (stepNum === this.currentStep) el.classList.add('active');
        });

        // Show current step content
        const currentContent = document.getElementById(`step-content-${this.currentStep}`);
        if (currentContent) currentContent.classList.add('active');

        // IMPROVED: Manage 'required' attributes and focusability instead of 'disabled'
        // Using 'disabled' was causing fields to be omitted from FormData when saving or parking
        document.querySelectorAll('.step-content').forEach(el => {
            const stepNum = parseInt(el.id.replace('step-content-', ''));
            const isActive = (stepNum === this.currentStep);
            const inputs = el.querySelectorAll('input, select, textarea');

            inputs.forEach(input => {
                if (!isActive) {
                    if (input.hasAttribute('required')) {
                        input.dataset.wasRequired = "true";
                        input.removeAttribute('required');
                    }
                } else {
                    if (input.dataset.wasRequired === "true") {
                        input.setAttribute('required', 'required');
                    }
                }
            });
        });

        // Nav buttons
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        const btnSave = document.getElementById('btn-save');
        const totalBar = document.getElementById('purchase-total-bar-wizard');

        if (btnPrev) btnPrev.style.display = this.currentStep > 1 ? 'block' : 'none';
        if (btnNext) btnNext.style.display = this.currentStep < 3 ? 'block' : 'none';
        if (btnSave) btnSave.style.display = this.currentStep === 3 ? 'block' : 'none';
        if (totalBar) totalBar.style.display = (this.currentStep >= 2) ? 'flex' : 'none';

        // Auto-focus logic
        if (this.currentStep === 2) {
            setTimeout(() => document.getElementById('productSearchInput')?.focus(), 100);
        }
        if (this.currentStep === 3) {
            const paidInput = document.getElementById('purchasePaidAmount');
            // Si es nueva compra y el valor es 0, pre-llenar con el total
            const isNew = paidInput && !paidInput.disabled;
            if (isNew && (parseFloat(paidInput.value) === 0)) {
                const total = this.calculateTotalForWizard();
                paidInput.value = total;
                this.handlePaidAmountChange(total);
            }
            setTimeout(() => paidInput?.focus(), 100);
        }
    },

    handlePaidAmountChange(val) {
        const amount = parseFloat(val) || 0;
        const total = this.calculateTotalForWizard();
        const debt = total - amount;

        const deductGroup = document.getElementById('purchaseInitialCashDeductGroup');
        const noPayMsg = document.getElementById('no-payment-needed');
        const debtMsg = document.getElementById('purchase-debt-warning');
        const debtAmountSpan = document.getElementById('purchase-debt-amount');

        if (deductGroup) deductGroup.style.display = amount > 0 ? 'block' : 'none';
        if (noPayMsg) noPayMsg.style.display = amount > 0 ? 'none' : 'block';

        if (debtMsg) {
            debtMsg.style.display = debt > 0 ? 'block' : 'none';
            if (debtAmountSpan) debtAmountSpan.textContent = formatCLP(debt, true);
        }
    },

    calculateTotalForWizard() {
        const docTypeSelect = document.getElementById('purchaseDocumentType');
        const docType = docTypeSelect ? docTypeSelect.value : 'factura';
        const subtotalNeto = this.purchaseItems.reduce((sum, item) => sum + item.total, 0);
        const iva = (docType === 'factura') ? Math.round(subtotalNeto * 0.19) : 0;
        return Math.round(subtotalNeto + iva);
    },
    async render() {
        // C6: Optimización - Carga rápida inicial limitada a 50 registros
        const purchases = await Purchase.getLatest(50);

        let accountsPayable = 0;
        let currentMonthTotal = 0;
        let totalPurchasesCount = 0;
        let totalPendingCount = 0;

        try {
            // C6: Usar sumario eficiente del servidor
            const stats = await Purchase.getStatsSummary();
            if (stats) {
                accountsPayable = stats.summary.totalDebt;
                currentMonthTotal = stats.summary.monthTotal;
                totalPurchasesCount = stats.summary.totalCount;
                totalPendingCount = stats.summary.pendingCount;
            } else {
                // Fallback IndexedDB
                const summary = await SupplierPaymentService.getAccountsPayableSummary();
                accountsPayable = summary.reduce((sum, item) => sum + item.totalDebt, 0);
                
                const now = new Date();
                const all = await Purchase.getAll();
                currentMonthTotal = all.reduce((sum, purchase) => {
                    const dateValue = purchase.date ? new Date(purchase.date) : null;
                    if (dateValue && dateValue.getMonth() === now.getMonth() && dateValue.getFullYear() === now.getFullYear()) {
                        return sum + (parseFloat(purchase.total) || 0);
                    }
                    return sum;
                }, 0);
                totalPurchasesCount = all.length;
                totalPendingCount = all.filter(p => p.status === 'pending').length;
            }
        } catch (error) {
            console.warn('Error cargando estadísticas de compras:', error);
        }

        return `
            <div class="view-header">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h1>Compras a Proveedores</h1>
                        <p>Registra compras y administra documentos tributarios</p>
                    </div>
                     <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary" onclick="PurchasesView.showIvaPool()" style="background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">
                            💰 Pozo IVA
                        </button>
                        ${this.getDraft() ? `
                        <div style="display: flex; gap: 0.75rem;">
                            <button class="btn" onclick="PurchasesView.restoreDraft()" style="background: var(--warning); color: #000; font-weight: 800; border: none; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);">
                                📦 Continuar Compra
                            </button>
                            <button class="btn btn-outline-danger" onclick="if(confirm('¿Seguro que quieres borrar la compra pausada?')) { PurchasesView.clearDraft(); PurchasesView.switchSection('list'); }" style="font-weight: 700;">
                                🗑️ Cancelar Borrador
                            </button>
                        </div>
                        ` : ''}
                        ${PermissionService.can('purchases.create') ? `
                        <button class="btn btn-primary" onclick="PurchasesView.showPurchaseForm()">
                            📋 Nueva Compra
                        </button>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="grid grid-3">
                <div class="stat-card">
                    <h3>Total Compras</h3>
                    <div class="value">${totalPurchasesCount}</div>
                </div>
                <div class="stat-card">
                    <h3>Total del Mes</h3>
                    <div class="value" style="color: var(--primary);">${formatCLP(currentMonthTotal)}</div>
                </div>
                <div class="stat-card">
                    <h3>Cuentas por Pagar</h3>
                    <div class="value" style="color: var(--danger);">${formatCLP(accountsPayable)}</div>
                </div>
                <div class="stat-card">
                    <h3>Compras Pendientes</h3>
                    <div class="value">${totalPendingCount}</div>
                </div>
            </div>

            <div id="accountsPayableSummary" style="margin-bottom: 2rem;">
                <!-- Se llenará dinámicamente -->
            </div>
            
            <div class="card" style="margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 0.5rem;">
                    <button class="btn ${this.currentSection === 'list' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="PurchasesView.switchSection('list')" style="flex: 1;">
                        Listado
                    </button>
                    <button class="btn ${this.currentSection === 'daily' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="PurchasesView.switchSection('daily')" style="flex: 1;">
                        Historial diario
                    </button>
                    <button class="btn ${this.currentSection === 'monthly' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="PurchasesView.switchSection('monthly')" style="flex: 1;">
                        Historial mensual
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div id="purchasesSectionContent">
                    ${this.renderCurrentSection(purchases)}
                </div>
            </div>
        `;
    },

    renderCurrentSection(purchases) {
        switch (this.currentSection) {
            case 'daily':
                return this.renderDailyHistory(purchases);
            case 'monthly':
                return this.renderMonthlyHistory(purchases);
            default:
                return this.renderPurchasesTable(purchases);
        }
    },

    groupPurchasesByDay(purchases) {
        const byDay = {};
        for (const p of purchases) {
            const d = p.date ? new Date(p.date) : null;
            if (!d || Number.isNaN(d.getTime())) continue;
            const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
            const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (!byDay[key]) {
                const label = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                byDay[key] = { dateKey: key, dateLabel: label, purchases: [], total: 0, count: 0 };
            }
            byDay[key].purchases.push(p);
            byDay[key].total += parseFloat(p.total) || 0;
            byDay[key].count += 1;
        }
        return Object.values(byDay).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    },

    groupPurchasesByMonth(purchases) {
        const byMonth = {};
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        for (const p of purchases) {
            const d = p.date ? new Date(p.date) : null;
            if (!d || Number.isNaN(d.getTime())) continue;
            const y = d.getFullYear();
            const m = d.getMonth();
            const key = `${y}-${String(m + 1).padStart(2, '0')}`;
            if (!byMonth[key]) byMonth[key] = { key, label: `${monthNames[m]} ${y}`, purchases: [], total: 0, count: 0 };
            byMonth[key].purchases.push(p);
            byMonth[key].total += parseFloat(p.total) || 0;
            byMonth[key].count += 1;
        }
        return Object.values(byMonth).sort((a, b) => b.key.localeCompare(a.key));
    },

    renderPurchaseRow(p) {
        const balance = (parseFloat(p.total) || 0) - (parseFloat(p.paidAmount) || 0);
        // Robustez: recalcular status visual si el saldo es 0
        const isPaid = p.status === 'paid' || balance <= 0.01;
        const statusColor = isPaid ? '#10b981' : '#f59e0b';
        const statusBg = isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
        const statusText = isPaid ? 'Pagado' : 'Pendiente';

        return `
            <div class="white-panel" style="display: flex; flex-direction: column; gap: 1rem; position: relative; transition: all 0.2s; border: 1px solid var(--border); box-shadow: var(--shadow-md);" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--primary)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border)';">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--secondary); margin-bottom: 0.25rem; font-weight: 700;">${formatDate(p.date)}</div>
                        <h3 class="supplier-name-placeholder" data-supplier-id="${p.supplierId}" id="supplier-${p.id}" style="margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 800;">Cargando...</h3>
                        ${p.invoiceNumber ? `<div style="font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-top: 0.25rem;">📄 Factura Nº: ${p.invoiceNumber}</div>` : ''}
                    </div>
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        <span style="background: ${isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; 
                                     color: ${isPaid ? '#34d399' : '#fca5a5'}; 
                                     padding: 0.5rem 1rem; 
                                     border-radius: 0.75rem; 
                                     font-size: 0.9rem; 
                                     font-weight: 800; 
                                     border: 2px solid ${statusColor}; 
                                     display: flex; 
                                     align-items: center; 
                                     gap: 0.5rem;
                                     box-shadow: ${isPaid ? '0 0 10px rgba(16,185,129,0.2)' : '0 0 15px rgba(239,68,68,0.3)'};">
                            ${isPaid ? '✅' : '⏳'} ${statusText.toUpperCase()}
                        </span>
                        <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 600;">📦 ${(p.items || []).length} Productos</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; text-align: center; background: #f8fafc; border-radius: 0.75rem; padding: 1rem; border: 1px solid var(--border);">
                    <div style="display: flex; flex-direction: column; justify-content: center;">
                        <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Total Compra</div>
                        <div style="font-weight: 900; color: var(--text-main); font-size: 1.4rem; line-height: 1;">${formatCLP(p.total)}</div>
                    </div>
                    <div style="border-left: 1px solid var(--border); border-right: 1px solid var(--border); display: flex; flex-direction: column; justify-content: center;">
                        <div style="font-size: 0.65rem; color: var(--success); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Pagado</div>
                        <div style="font-weight: 900; color: #059669; font-size: 1.4rem; line-height: 1;">${formatCLP(p.paidAmount)}</div>
                        ${parseFloat(p.paidAmount) > 0 ? `<div style="font-size: 0.65rem; color: var(--primary); font-weight: 700; cursor: pointer; margin-top: 0.3rem; text-decoration: underline;" onclick="event.stopPropagation(); PurchasesView.viewPurchase(${p.id})">🔍 Ver pagos</div>` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; justify-content: center;">
                        <div style="font-size: 0.65rem; color: var(--danger); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 0.25rem;">Por Pagar</div>
                        <div style="font-weight: 900; color: #dc2626; font-size: 1.4rem; line-height: 1;">${formatCLP(balance)}</div>
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: auto;">
                    <button class="btn btn-sm btn-secondary" onclick="PurchasesView.viewPurchase(${p.id})">👁️ Ver</button>
                    ${PermissionService.can('purchases.edit') ? `<button class="btn btn-sm btn-outline-primary" style="flex: 1;" onclick="PurchasesView.editPurchase(${p.id})">✏️ Editar</button>` : ''}
                    ${!isPaid && PermissionService.can('purchases.pay') ? `<button class="btn btn-sm btn-success" style="flex: 1;" onclick="PurchasesView.showPaymentForm(${p.id})">💰 Pagar</button>` : ''}
                    ${PermissionService.can('purchases.delete') ? `<button class="btn btn-sm btn-outline-danger" style="flex: 1;" onclick="PurchasesView.deletePurchase(${p.id})">🗑️ Eliminar</button>` : ''}
                </div>
            </div>
        `;
    },

    renderDailyHistory(purchases) {
        const dateKey = this.selectedDailyDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        const dayPurchases = this.filterPurchasesByDay(purchases, dateKey);
        const d = dateKey.split('-');
        const dateLabel = new Date(parseInt(d[0], 10), parseInt(d[1], 10) - 1, parseInt(d[2], 10)).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const dayTotal = dayPurchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
                <h2 style="margin: 0; font-weight: 900; letter-spacing: -0.5px; color: var(--text-main); font-size: 1.75rem;">Compras por día</h2>
                <button class="btn btn-primary" onclick="PurchasesView.goToToday()" style="padding: 0.6rem 1.25rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), #4338ca); border: none; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); border-radius: 0.75rem;">📅 HOY</button>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2.5rem; flex-wrap: wrap; background: #ffffff; padding: 1.5rem; border-radius: 1.25rem; border: 2px solid var(--border); box-shadow: var(--shadow-md);">
                <button class="btn btn-secondary" onclick="PurchasesView.changeDay(-1)" style="width: 3.5rem; height: 3.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    ◀
                </button>
                
                <div style="flex: 1; min-width: 250px; display: flex; flex-direction: column; gap: 0.25rem; padding-left: 0.5rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Fecha de consulta</span>
                    <input type="date" id="dailyDatePicker" class="form-control" value="${dateKey}" 
                           style="background: transparent; border: none; color: var(--text-main); font-weight: 900; font-size: 1.5rem; padding: 0; height: auto;"
                           onchange="PurchasesView.setDailyDateAndRefresh(this.value)">
                </div>

                <button class="btn btn-secondary" onclick="PurchasesView.changeDay(1)" style="width: 3.5rem; height: 3.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    ▶
                </button>
            </div>

            ${dayPurchases.length === 0
                ? `<div class="empty-state" style="padding: 4rem 2rem; background: rgba(17, 24, 39, 0.4); border-radius: 1.5rem; border: 2px dashed rgba(255,255,255,0.05);">
                    <div class="empty-state-icon" style="font-size: 4rem; opacity: 0.3; margin-bottom: 1rem;">📅</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.5rem;">No hay compras el ${dateLabel}</div>
                    <p style="color: #64748b; margin: 0;">Utiliza las flechas o el selector para explorar otros días.</p>
                   </div>`
                : `
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; background: #ffffff; border-radius: 1.25rem; border: 2px solid var(--border); margin-bottom: 2rem; box-shadow: var(--shadow-sm);">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.25rem;">Resumen del Día</div>
                        <strong style="color: var(--text-main); font-size: 1.25rem; text-transform: capitalize;">📅 ${dateLabel}</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: var(--text-muted); font-size: 1rem; font-weight: 600;"><strong>${dayPurchases.length}</strong> compras encontradas</span>
                        <div style="color: var(--primary); font-size: 2rem; font-weight: 900; margin-top: 0.25rem;">${formatCLP(dayTotal)}</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.5rem;">
                    ${dayPurchases.map(p => this.renderPurchaseRow(p)).join('')}
                </div>
            </div>
            `}
        `;
    },

    renderMonthlyHistory(purchases) {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const now = new Date();
        const defaultKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthKey = this.selectedMonthKey || defaultKey;
        const monthPurchases = this.filterPurchasesByMonth(purchases, monthKey);
        const parts = monthKey.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) || 1;
        const monthLabel = `${monthNames[m - 1]} ${y}`;
        const monthTotal = monthPurchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);

        let minYear = now.getFullYear();
        for (const p of purchases) {
            const d = p.date ? new Date(p.date) : null;
            if (d && !isNaN(d.getTime())) minYear = Math.min(minYear, d.getFullYear());
        }
        const years = [];
        for (let yr = now.getFullYear(); yr >= minYear; yr--) years.push(yr);

        const mm = String(m).padStart(2, '0');

        return `
            <h3 style="margin-bottom: 1rem;">Compras por mes</h3>
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-weight: 500;">Seleccionar mes:</span>
                    <select id="monthlyMonthSelect" class="form-control" style="width: auto; min-width: 160px;"
                            onchange="PurchasesView.setMonthlyKeyAndRefresh(PurchasesView.getMonthlyKeyFromSelect())">
                        ${monthNames.map((name, i) => {
            const v = String(i + 1).padStart(2, '0');
            return `<option value="${v}" ${mm === v ? 'selected' : ''}>${name}</option>`;
        }).join('')}
                    </select>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-weight: 500;">Año:</span>
                    <select id="monthlyYearSelect" class="form-control" style="width: auto; min-width: 100px;"
                            onchange="PurchasesView.setMonthlyKeyAndRefresh(PurchasesView.getMonthlyKeyFromSelect())">
                        ${years.map(yr => `<option value="${yr}" ${y === yr ? 'selected' : ''}>${yr}</option>`).join('')}
                    </select>
                </label>
            </div>
            ${monthPurchases.length === 0
                ? `<div class="empty-state"><div class="empty-state-icon">📆</div>No hay compras en ${monthLabel}. Cambia el mes o año para ver otro período.</div>`
                : `
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: rgba(15, 23, 42, 0.6); border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 1.5rem;">
                    <strong style="color: #fff;">📆 ${monthLabel}</strong>
                    <span style="color: var(--secondary);"><strong>${monthPurchases.length}</strong> compras · <strong style="color: var(--primary); font-size: 1.1rem;">${formatCLP(monthTotal)}</strong></span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem;">
                    ${monthPurchases.map(p => this.renderPurchaseRow(p)).join('')}
                </div>
            </div>
            `}
        `;
    },

    getMonthlyKeyFromSelect() {
        const monthSelect = document.getElementById('monthlyMonthSelect');
        const yearSelect = document.getElementById('monthlyYearSelect');
        if (!monthSelect || !yearSelect) return null;
        const m = monthSelect.value;
        const y = yearSelect.value;
        if (!m || !y) return null;
        return `${y}-${String(m).padStart(2, '0')}`;
    },

    async switchSection(section) {
        this.currentSection = section;
        const now = new Date();
        if (section === 'daily' && this.selectedDailyDate == null) {
            this.selectedDailyDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }
        if (section === 'monthly' && this.selectedMonthKey == null) {
            this.selectedMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        await app.navigate('purchases');
    },

    setDailyDateAndRefresh(val) {
        if (!val) return;
        this.selectedDailyDate = val;
        app.navigate('purchases');
    },

    changeDay(delta) {
        let current = this.selectedDailyDate ? new Date(this.selectedDailyDate + 'T00:00:00') : new Date();
        current.setDate(current.getDate() + delta);
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        this.setDailyDateAndRefresh(`${y}-${m}-${d}`);
    },

    goToToday() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        this.setDailyDateAndRefresh(`${y}-${m}-${d}`);
    },

    setMonthlyKeyAndRefresh(val) {
        if (!val) return;
        this.selectedMonthKey = val;
        app.navigate('purchases');
    },

    filterPurchasesByDay(purchases, dateKey) {
        return purchases.filter(p => {
            const d = p.date ? new Date(p.date) : null;
            if (!d || Number.isNaN(d.getTime())) return false;
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return k === dateKey;
        });
    },

    filterPurchasesByMonth(purchases, monthKey) {
        return purchases.filter(p => {
            const d = p.date ? new Date(p.date) : null;
            if (!d || Number.isNaN(d.getTime())) return false;
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return k === monthKey;
        });
    },

    renderPurchasesTable(purchases) {
        if (purchases.length === 0) {
            return '<div class="empty-state"><div class="empty-state-icon">📋</div>No hay compras registradas</div>';
        }

        // C6: Optimización - Solo mostrar las últimas 40 compras por defecto en el listado general
        // para evitar que el navegador se vuelva lento con miles de registros.
        const sortedPurchases = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
        const limitedPurchases = sortedPurchases.slice(0, 40);

        return `
            <div style="margin-bottom: 1rem; color: var(--secondary); font-size: 0.85rem;">
                Mostrando las últimas ${limitedPurchases.length} compras de un total de ${purchases.length}.
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem;">
                ${limitedPurchases.map(p => this.renderPurchaseRow(p)).join('')}
            </div>
        `;
    },

    async init() {
        // C6 Optimization: Fetch all suppliers once to avoid N+1 database calls
        const suppliers = await Supplier.getAllIncludingDeleted();
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

        const placeholders = document.querySelectorAll('.supplier-name-placeholder');
        placeholders.forEach(elem => {
            const sid = parseInt(elem.dataset.supplierId, 10);
            if (supplierMap.has(sid)) {
                elem.textContent = supplierMap.get(sid);
            } else {
                elem.textContent = 'Proveedor #' + sid;
            }
        });

        // C6: Renderizar resumen de cuentas por pagar
        await this.renderAccountsPayableSummary();
    },

    async renderAccountsPayableSummary() {
        const container = document.getElementById('accountsPayableSummary');
        if (!container) {
            console.warn('C6: Contenedor accountsPayableSummary no encontrado en el DOM');
            return;
        }

        try {
            console.log('C6: Iniciando renderAccountsPayableSummary...');
            const summary = await SupplierPaymentService.getAccountsPayableSummary();
            const activeDebts = summary.filter(s => s.totalDebt > 0.01);
            console.log(`C6: Deudas activas encontradas: ${activeDebts.length}`);

            if (activeDebts.length === 0) {
                container.innerHTML = '';
                return;
            }

        container.innerHTML = `
            <div class="card" style="border: 2px solid var(--danger); background: #fff1f2;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(239, 68, 68, 0.1);">
                    <h3 style="margin: 0; color: #991b1b; display: flex; align-items: center; gap: 0.75rem; font-weight: 800; font-size: 1.25rem;">
                        <span style="font-size: 1.5rem;">🚩</span> Cuentas por Pagar (${activeDebts.length} proveedores)
                    </h3>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem;">
                    ${activeDebts.map(d => `
                        <div style="background: #334155; border: 2px solid #475569; padding: 1.25rem; border-radius: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-md);">
                            <div style="flex: 1;">
                                <div style="font-weight: 800; color: #ffffff; font-size: 1.1rem; margin-bottom: 0.25rem;">${d.supplier.name}</div>
                                <div style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">${d.purchaseCount || 0} facturas pendientes</div>
                            </div>
                            <div style="text-align: right; min-width: 110px;">
                                <div style="color: #fca5a5; font-weight: 900; font-size: 1.25rem; margin-bottom: 0.5rem;">${formatCLP(d.totalDebt)}</div>
                                <button class="btn btn-sm btn-success" style="width: 100%; height: 32px; font-weight: 700;" 
                                        onclick="SuppliersView.showSupplierPaymentForm(${d.supplier.id})">
                                    💰 Pagar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        } catch (error) {
            console.error('C6: Error rendering accounts payable summary:', error);
        }
    },

    purchaseItems: [],

    async showPurchaseForm(editingPurchase = null) {
        const draft = !editingPurchase ? this.getDraft() : null;
        this.purchaseItems = editingPurchase ? [...editingPurchase.items] : [];
        const suppliers = await Supplier.getAll();
        this.currentStep = 1;
        this.lastVatMode = editingPurchase ? (editingPurchase.vatMode || 'net') : (document.getElementById('invoiceVatMode')?.value || 'net');

        if (suppliers.length === 0) {
            showNotification('Primero debes crear proveedores', 'warning');
            return;
        }

        const content = `
            <style>
                .purchase-wizard { display: flex; flex-direction: column; gap: 1.5rem; min-height: 520px; }
                .purchase-stepper { display: flex; justify-content: space-between; position: relative; margin-bottom: 2rem; padding: 0 1rem; }
                .purchase-stepper::before { content: ''; position: absolute; top: 15px; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.1); z-index: 1; }
                .step-item { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1; cursor: pointer; transition: all 0.3s; }
                .step-dot { width: 32px; height: 32px; border-radius: 50%; background: #1e293b; border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #94a3b8; box-shadow: 0 0 15px rgba(0,0,0,0.5); }
                .step-item.active .step-dot { background: var(--primary); border-color: #fff; color: white; transform: scale(1.1); box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
                .step-item.completed .step-dot { background: var(--success); border-color: #fff; color: white; }
                .step-label { font-size: 0.85rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                .step-item.active .step-label { color: #fff; }
                .step-content { display: none; animation: fadeInModal 0.3s ease-out; }
                .step-content.active { display: block; }
                @keyframes fadeInModal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .purchase-total-fixed { background: rgba(5, 150, 105, 0.15); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 1rem; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
                .purchase-total-label { color: #6ee7b7; font-size: 0.95rem; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
                .purchase-total-value { font-size: 2rem; font-weight: 800; color: #a7f3d0; text-shadow: 0 2px 10px rgba(16, 185, 129, 0.3); }
                .purchase-footer-nav { display: flex; justify-content: space-between; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); }
            </style>

            <form id="purchaseForm" class="purchase-wizard">
                ${editingPurchase ? `<input type="hidden" name="id" value="${editingPurchase.id}">` : ''}
                
                <div class="purchase-stepper">
                    <div class="step-item active" id="step-1" onclick="PurchasesView.goToStep(1)">
                        <div class="step-dot">1</div>
                        <span class="step-label">Documento</span>
                    </div>
                    <div class="step-item" id="step-2" onclick="PurchasesView.goToStep(2)">
                        <div class="step-dot">2</div>
                        <span class="step-label">Productos</span>
                    </div>
                    <div class="step-item" id="step-3" onclick="PurchasesView.goToStep(3)">
                        <div class="step-dot">3</div>
                        <span class="step-label">Pago</span>
                    </div>
                </div>

                <!-- PASO 1: DATOS GENERALES -->
                <div id="step-content-1" class="step-content active">
                    ${draft ? `
                        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="color: #f59e0b; display: block;">📦 Tienes una compra sin terminar</strong>
                                <small style="color: #d97706;">Se guardó automáticamente hace unos instantes.</small>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="btn btn-sm btn-warning" onclick="PurchasesView.restoreDraft()" style="background: #f59e0b; color: #000; font-weight: bold;">
                                    Recuperar Borrador
                                </button>
                                <button type="button" class="btn btn-sm" onclick="if(confirm('¿Borrar este borrador?')) { PurchasesView.clearDraft(); PurchasesView.showPurchaseForm(); }" style="background: rgba(255,255,255,0.1); color: #fff;">
                                    X
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <div class="grid grid-2">
                            <div class="form-group">
                                <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-weight: 700; color: #94a3b8;">
                                    <span>🏢</span> Proveedor
                                </label>
                                <select name="supplierId" class="form-control" required style="height: 50px; font-size: 1.1rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem;" onchange="PurchasesView.autosaveDraft()">
                                    <option value="">Selecciona un proveedor...</option>
                                    ${suppliers.map(s => `<option value="${s.id}" ${draft && parseInt(draft.supplierId) === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-weight: 700; color: #94a3b8;">
                                    <span>📄</span> Tipo de Documento
                                </label>
                                <select name="documentType" id="purchaseDocumentType" class="form-control" onchange="PurchasesView.handleDocumentTypeChange(); PurchasesView.autosaveDraft()" style="height: 50px; font-size: 1.1rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem;">
                                    <option value="factura_neto" ${draft && draft.documentType === 'factura_neto' ? 'selected' : ''}>Factura (Monto Neto)</option>
                                    <option value="factura_bruto" ${draft && draft.documentType === 'factura_bruto' ? 'selected' : ''}>Factura (Monto Bruto)</option>
                                    <option value="boleta" ${draft && draft.documentType === 'boleta' ? 'selected' : ''}>Boleta / Interno</option>
                                </select>
                            </div>
                        </div>

                        <div id="invoiceInfo" style="display: ${draft && draft.documentType && draft.documentType.includes('factura') ? 'grid' : (editingPurchase && editingPurchase.documentType && editingPurchase.documentType.includes('factura') ? 'grid' : 'none')}; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1);">
                            <div class="form-group">
                                <label style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem; display: block;">N° Factura:</label>
                                <input type="text" name="invoiceNumber" class="form-control" placeholder="Ej: 12345" value="${draft ? (draft.invoiceNumber || '') : (editingPurchase ? (editingPurchase.invoiceNumber || '') : '')}" style="background: rgba(0,0,0,0.1); border-radius: 0.5rem;" oninput="PurchasesView.autosaveDraft()">
                            </div>
                            <div class="form-group">
                                <label style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem; display: block;">Fecha Factura:</label>
                                <input type="date" name="invoiceDate" class="form-control" value="${draft ? (draft.invoiceDate || '') : (editingPurchase ? (editingPurchase.invoiceDate || '') : '')}" style="background: rgba(0,0,0,0.1); border-radius: 0.5rem;" onchange="PurchasesView.autosaveDraft()">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- PASO 2: PRODUCTOS -->
                <div id="step-content-2" class="step-content">
                    <div style="background: rgba(17, 24, 39, 0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">
                        <label style="font-size: 1.1rem; color: var(--primary); font-weight: 700; margin-bottom: 0.75rem; display: block;">🔍 Buscar Productos</label>
                        <div class="search-box" style="position: relative;">
                            <input type="text" 
                                   id="productSearchInput" 
                                   class="form-control" 
                                   placeholder="Escanea el código o escribe el nombre..."
                                   style="height: 55px; border-color: rgba(99, 102, 241, 0.4); background: rgba(0,0,0,0.4);">
                            <div id="purchaseProductSearchResults" class="purchase-search-results"></div>
                        </div>
                        <small style="margin-top:0.75rem; display:block; opacity: 0.7;">💡 Usa el lector de códigos de barras para mayor velocidad.</small>
                    </div>

                    <div id="productSelectionArea"></div>
                    
                    <div id="purchaseItemsList">
                        ${this.renderPurchaseItems()}
                    </div>
                </div>

                <!-- PASO 3: PAGO Y FINALIZACIÓN -->
                <div id="step-content-3" class="step-content">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                        <div>
                            <div class="form-group">
                                <label>Vencimiento de Factura</label>
                                <input type="date" name="dueDate" class="form-control" value="${editingPurchase && editingPurchase.dueDate ? editingPurchase.dueDate.split('T')[0] : ''}">
                                <small>Opcional; si pagas a crédito.</small>
                            </div>
                            
                            <div class="form-group" style="margin-top: 2rem;">
                                <label>Monto Pagado Hoy (CLP)</label>
                                <input type="number" 
                                       name="paidAmount" 
                                       id="purchasePaidAmount" 
                                       class="form-control form-control-lg" 
                                       style="height: 60px; font-size: 1.8rem; font-weight: 800; color: var(--success); text-align: right;"
                                       value="${editingPurchase ? editingPurchase.paidAmount : 0}" 
                                       min="0"
                                       ${editingPurchase ? 'disabled' : ''}
                                       oninput="PurchasesView.handlePaidAmountChange(this.value)">
                                
                                ${editingPurchase ? '<p style="color:var(--warning); font-size: 0.85rem; margin-top: 0.5rem;">⚠️ Los pagos previos ya están registrados.</p>' : `
                                    <div id="purchase-debt-warning" style="display: none; margin-top: 1.5rem; padding: 1.25rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 0.75rem;">
                                        <p style="color: #fca5a5; margin: 0; font-size: 0.95rem; line-height: 1.5;">
                                            ⚠️ <strong>Esta compra quedará pendiente de pago</strong>. 
                                            Se registrará una deuda de <strong id="purchase-debt-amount" style="color: #fff; font-size: 1.1rem;">$0</strong> con el proveedor que podrás pagar después.
                                        </p>
                                    </div>
                                `}
                            </div>
                        </div>

                        <div id="step-3-summary-right" style="background: rgba(0,0,0,0.25); border-radius: 1rem; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.05);">
                            <h4 style="font-size: 1.1rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; color: #94a3b8;">Configuración de Caja</h4>
                            
                            ${!editingPurchase ? `
                                <div id="purchaseInitialCashDeductGroup" style="display: none;">
                                    <label style="display: flex; align-items: center; gap: 1rem; cursor: pointer; background: rgba(59, 130, 246, 0.1); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(59, 130, 246, 0.3);">
                                        <input type="checkbox" name="deductFromCashRegister" value="true" checked style="width: 22px; height: 22px;">
                                        <div style="flex: 1;">
                                            <strong style="display: block; color: #fff;">Extraer de Caja</strong>
                                            <small style="color: #93c5fd;">Registrar este pago como un egreso de efectivo hoy</small>
                                        </div>
                                    </label>
                                </div>
                                <div id="no-payment-needed" style="text-align: center; padding: 2rem 1rem; opacity: 0.6;">
                                    <span style="font-size: 2.5rem; display: block;">⏳</span>
                                    Ingrese un monto pagado para activar opciones de caja.
                                </div>
                            ` : `<p style="text-align: center; opacity: 0.5;">Edición no permite cambios de caja.</p>`}
                        </div>
                    </div>
                </div>

                <!-- TOTAL FIJO (VISIBLE EN PASO 2 Y 3) -->
                <div id="purchase-total-bar-wizard" class="purchase-total-fixed" style="display: none; margin-top: 1.5rem;">
                    <div class="purchase-total-label">Subtotal Neto de Compra</div>
                    <div id="purchaseTotal" class="purchase-total-value">${formatCLP(editingPurchase ? editingPurchase.total : 0)}</div>
                </div>

                <!-- BOTONES DE NAVEGACIÓN -->
                <div class="purchase-footer-nav" id="wizard-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()" id="btn-cancel-modal">Cancelar</button>
                        ${!editingPurchase ? `
                            <button type="button" class="btn" onclick="PurchasesView.parkPurchase()" title="Estacionar compra (Pausar para atender clientes)" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; gap: 0.5rem;">
                                🅿️ Estacionar
                            </button>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="button" class="btn btn-secondary" id="btn-prev" style="display: none;" onclick="PurchasesView.prevStep()">Anterior</button>
                        <button type="button" class="btn btn-primary" id="btn-next" onclick="PurchasesView.nextStep()">Siguiente →</button>
                        <button type="button" class="btn btn-success" id="btn-save" style="display: none;" onclick="PurchasesView.savePurchase()">
                            ✨ ${editingPurchase ? 'Actualizar Compra' : 'Confirmar y Guardar'}
                        </button>
                    </div>
                </div>
            </form>
        `;

        showModal(content, {
            title: editingPurchase ? '✏️ Editando Compra' : '💼 Nueva Transacción de Compra',
            width: 'min(96vw, 1000px)'
        });

        // Configurar navegación inicial
        this.updateWizardUI();

        // Add Enter key support for the entire purchase form
        const form = document.getElementById('purchaseForm');
        form.addEventListener('keypress', (e) => {
            if (e.key !== 'Enter') return;

            const target = e.target;
            const activeId = document.activeElement ? document.activeElement.id : '';

            // Never advance or submit on Enter when adding products or scanning
            if (activeId === 'addQuantity' || activeId === 'addCost' || activeId === 'addPrice' || activeId === 'productSearchInput') {
                return; // Let their specific listeners handle it
            }

            // Paso 1: Avanzar al siguiente paso al apretar Enter
            if (PurchasesView.currentStep === 1) {
                e.preventDefault();
                PurchasesView.nextStep();
                return;
            }

            // Pasos finales: Guardar si el foco está en campos específicos
            if (target && (target.name === 'paidAmount' || target.name === 'dueDate')) {
                e.preventDefault();
                PurchasesView.savePurchase();
                return;
            }

            // Por defecto, bloquear Enter para evitar cierre accidental del modal
            e.preventDefault();
            e.stopPropagation();
        });

        const searchInput = document.getElementById('productSearchInput');
        const resultsDiv = document.getElementById('purchaseProductSearchResults');

        let searchTimeout;

        // Live search logic
        searchInput.addEventListener('input', async (e) => {
            const term = e.target.value.trim();

            // Barcode auto-detection (8+ digits): cerrar listado y no ejecutar búsqueda por texto
            if (term.length >= 8 && !isNaN(term)) {
                clearTimeout(searchTimeout);
                searchTimeout = null;
                await this.searchAndShowProduct(term);
                searchInput.value = '';
                if (resultsDiv) resultsDiv.style.display = 'none';
                return;
            }

            // No mostrar listado si ya hay un producto en pantalla (formulario Agregar visible)
            const selectionArea = document.getElementById('productSelectionArea');
            if (selectionArea && selectionArea.innerHTML.trim() !== '') {
                resultsDiv.style.display = 'none';
                return;
            }
            // Text search with debounce
            if (term.length >= 3) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(async () => {
                    if (selectionArea && selectionArea.innerHTML.trim() !== '') return;
                    const products = await Product.search(term);
                    if (products.length > 0) {
                        this.renderPurchaseSearchResults(products);
                        resultsDiv.style.display = 'block';
                    } else {
                        resultsDiv.style.display = 'none';
                    }
                }, 300);
            } else {
                resultsDiv.style.display = 'none';
            }
        });

        // Handle Enter key
        searchInput.addEventListener('keydown', async (e) => { // Changed to keydown to catch arrow keys
            const resultsDiv = document.getElementById('purchaseProductSearchResults');
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
                    PurchasesView.highlightResult(nextIndex);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length > 0) {
                    const prevIndex = (selectedIndex - 1 + items.length) % items.length;
                    PurchasesView.highlightResult(prevIndex);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (resultsDiv.style.display === 'block' && items.length > 0) {
                    // Select highlighted or first item and open quantity form
                    const chosenIndex = selectedIndex !== -1 ? selectedIndex : 0;
                    const productId = items[chosenIndex].dataset.productId ||
                        items[chosenIndex].getAttribute('data-product-id') ||
                        items[chosenIndex].getAttribute('data-productId');
                    PurchasesView.selectProductFromList(parseInt(productId, 10));
                } else {
                    // Normal search behavior
                    const term = searchInput.value.trim();
                    if (term) {
                        await this.searchAndShowProduct(term, false);
                        searchInput.value = '';
                        resultsDiv.style.display = 'none';
                    }
                }
            }
        });

        // Trigger initial mode adjustment
        setTimeout(() => this.handleDocumentTypeChange(), 50);
    },

    handleDocumentTypeChange() {
        const docType = document.getElementById('purchaseDocumentType').value;
        const invoiceInfoDiv = document.getElementById('invoiceInfo');
        const vatModeSelect = document.getElementById('invoiceVatMode'); // This select is now removed from HTML, but logic might still reference it.

        if (docType.includes('factura')) {
            if (invoiceInfoDiv) invoiceInfoDiv.style.display = 'grid';
            // Set vatMode based on docType
            this.lastVatMode = docType === 'factura_neto' ? 'net' : 'gross';
        } else { // boleta
            if (invoiceInfoDiv) invoiceInfoDiv.style.display = 'none';
            this.lastVatMode = 'net'; // Boletas are always net for calculation purposes
        }
        this.updatePurchaseItems();
    },

    updateInvoiceMode() {
        // This function is now largely replaced by handleDocumentTypeChange
        // and the new documentType values (factura_neto, factura_bruto).
        // However, the logic for converting existing items might still be useful
        // if the user changes the document type from one factura type to another.

        const newDocType = document.getElementById('purchaseDocumentType').value;
        const newMode = newDocType === 'factura_neto' ? 'net' : (newDocType === 'factura_bruto' ? 'gross' : 'net');

        if (!this.lastVatMode) this.lastVatMode = 'net';

        if (this.purchaseItems.length > 0 && this.lastVatMode !== newMode) {
            // Conversión real de los valores ya ingresados
            this.purchaseItems = this.purchaseItems.map(item => {
                let newNetCost = item.cost;

                if (this.lastVatMode === 'net' && newMode === 'gross') {
                    // User entered net, but now wants gross. Cost was stored as net.
                    // To convert to gross, we need to divide by 1.19 to get the "net equivalent"
                    // that would result in the original stored net if it were gross.
                    // This is complex. The simpler approach is to assume the stored 'cost' is always NET.
                    // If the user changes mode, we just re-interpret how they *entered* it.
                    // For now, let's keep the cost as is, and only change how it's displayed/calculated.
                    // The previous logic was trying to convert the stored 'cost' value itself.
                    // Let's simplify: 'cost' in purchaseItems is always NET.
                    // The 'vatMode' only affects input and display.
                    // So, no conversion needed here.
                } else if (this.lastVatMode === 'gross' && newMode === 'net') {
                    // Same as above, 'cost' in purchaseItems is always NET.
                    // No conversion needed here.
                }

                return {
                    ...item,
                    // cost: newNetCost, // No change to stored cost
                    // total: newNetCost * item.quantity // Total is always based on stored net cost
                };
            });

            showNotification(`Modo de cálculo de IVA actualizado a ${newMode === 'net' ? 'Neto' : 'Bruto'}.`, 'info');
        }

        this.lastVatMode = newMode;
        this.updatePurchaseItems();
    },

    updateCostMode() {
        const docType = document.getElementById('purchaseDocumentType').value;
        const costMode = (docType === 'factura_bruto') ? 'gross' : 'net'; // factura_neto or boleta are 'net'

        const costLabel = document.getElementById('costInputLabel');
        const addCostInput = document.getElementById('addCost');

        if (costLabel) {
            costLabel.textContent = costMode === 'gross' ? 'Costo Bruto (Con IVA) *' : 'Costo Neto (Sin IVA) *';
        }

        if (addCostInput && addCostInput.value) {
            addCostInput.dispatchEvent(new Event('input'));
        }
    },

    renderPurchaseSearchResults(products) {
        const resultsDiv = document.getElementById('purchaseProductSearchResults');
        resultsDiv.innerHTML = products.map((p, index) => `
            <div class="search-result-item purchase-search-item ${index === 0 ? 'selected' : ''}" 
                 data-index="${index}"
                 data-product-id="${p.id}"
                 onmouseover="PurchasesView.highlightResult(${index})"
                 onclick="PurchasesView.selectProductFromList(${p.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${p.name}</strong>
                        <br>
                        <small style="color: var(--secondary);">
                            ${p.barcode ? 'Código: ' + p.barcode + ' • ' : ''}
                            Stock: ${p.stock}
                        </small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary" type="button" tabindex="-1">Seleccionar</button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    highlightResult(index) {
        const items = document.querySelectorAll('.search-result-item');
        items.forEach(item => {
            item.classList.remove('selected');
        });

        const target = document.querySelector(`.search-result-item[data-index="${index}"]`);
        if (target) {
            target.classList.add('selected');
            // Ensure visible in scroll
            target.scrollIntoView({ block: 'nearest' });
        }
    },

    async searchAndShowProduct(term, addDirectly = false) {
        let product = await Product.getByBarcode(term);

        if (!product) {
            const results = await Product.search(term);
            if (results.length === 1) {
                product = results[0];
            } else if (results.length > 1) {
                // If multiple results from barcode scan or enter, show them in dropdown
                this.renderPurchaseSearchResults(results);
                document.getElementById('purchaseProductSearchResults').style.display = 'block';
                return;
            } else {
                showNotification('Producto no encontrado', 'warning');
                return;
            }
        }

        const resDiv = document.getElementById('purchaseProductSearchResults');
        if (resDiv) resDiv.style.display = 'none';
        this.showAddProductForm(product);
    },

    async addProductFromSearch(productId) {
        try {
            const product = await Product.getById(productId);
            if (!product) {
                showNotification('Producto no encontrado', 'warning');
                return;
            }

            const cost = parseFloat(product.cost);
            const price = parseFloat(product.price);

            // If faltan precios, abrir formulario para completar
            if (!cost || cost <= 0 || !price || price <= 0) {
                this.showAddProductForm(product);
                return;
            }

            // Agregar directamente con cantidad 1 y precios del producto
            const existingItem = this.purchaseItems.find(item => item.productId === product.id);
            if (existingItem) {
                existingItem.quantity += 1;
                existingItem.cost = cost;
                existingItem.price = price;
                existingItem.total = existingItem.quantity * cost;
            } else {
                this.purchaseItems.push({
                    productId: product.id,
                    name: product.name,
                    barcode: product.barcode || '',
                    quantity: 1,
                    cost: cost,
                    price: price,
                    total: 1 * cost,
                    type: product.type
                });
            }

            this.cancelAddProduct();
            this.updatePurchaseItems();
            showNotification(`${product.name} agregado a la compra`, 'success');
        } catch (error) {
            console.error('Error al agregar producto a la compra:', error);
            showNotification('Error al agregar producto: ' + error.message, 'error');
        }
    },

    async selectProductFromList(productId) {
        const product = await Product.getById(productId);
        const resultsDiv = document.getElementById('purchaseProductSearchResults');
        const searchInput = document.getElementById('productSearchInput');

        if (resultsDiv) resultsDiv.style.display = 'none';
        if (searchInput) searchInput.value = '';

        this.showAddProductForm(product);
    },

    showAddProductForm(product) {
        const resultsDiv = document.getElementById('purchaseProductSearchResults');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
            resultsDiv.innerHTML = '';
        }
        const selectionArea = document.getElementById('productSelectionArea');
        selectionArea.innerHTML = `
            <div class="purchase-add-card">
                <h4 class="purchase-add-card-title">
                    Agregar: ${product.name}
                    ${product.barcode ? `<small>(${product.barcode})</small>` : ''}
                </h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Cantidad Comprada *</label>
                        <input type="number" 
                               id="addQuantity" 
                               name="addQuantity"
                               class="form-control" 
                               value="" 
                               placeholder="${product.type === 'weight' ? '0.001' : '1'}"
                               min="${product.type === 'weight' ? '0.001' : '1'}" 
                               step="${product.type === 'weight' ? '0.001' : '1'}"
                               required>
                        <small>${product.type === 'weight' ? 'Kilogramos' : 'Unidades'}</small>
                    </div>
                    
                    <div class="form-group">
                        <label id="costInputLabel">Precio Neto/Costo (CLP) *</label>
                        <input type="number" 
                               id="addCost" 
                               name="addCost"
                               class="form-control" 
                               value="${product.cost || 0}" 
                               min="0"
                               step="0.01"
                               required>
                        <small>Precio de compra al proveedor</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Precio de Venta (CLP) *</label>
                        <input type="number" 
                               id="addPrice" 
                               name="addPrice"
                               class="form-control" 
                               value="${product.price || 0}" 
                               min="0"
                               step="0.01"
                               required>
                        <small>Precio al que venderás</small>
                    </div>
                </div>
                
                <div id="pricePreview" class="purchase-price-preview">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span>Subtotal:</span>
                        <strong id="previewSubtotal">${formatCLP(0)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: var(--secondary);">
                        <span>Margen estimado:</span>
                        <strong id="previewMargin">0%</strong>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-success" 
                            id="btnAddProductToPurchase"
                            onclick="PurchasesView.addProductToPurchase(${product.id})"
                            type="button"
                            style="flex: 1;">
                        ✓ Agregar a Compra
                    </button>
                    <button class="btn btn-secondary" 
                            onclick="PurchasesView.cancelAddProduct()"
                            type="button">
                        Cancelar
                    </button>
                </div>
            </div>
        `;

        const quantityInput = document.getElementById('addQuantity');
        const costInput = document.getElementById('addCost');
        const priceInput = document.getElementById('addPrice');

        const updatePreview = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            let cost = parseFloat(costInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;

            // Adjust cost based on global invoice mode
            const docType = document.getElementById('purchaseDocumentType').value;
            const costMode = (docType === 'factura_bruto') ? 'gross' : 'net';

            if (costMode === 'gross') {
                cost = cost / 1.19; // Mantener decimales para precisión en el subtotal
            }

            const lineNet = Math.round(quantity * cost);
            const profit = price - (cost * 1.19);
            const margin = (cost * 1.19) > 0 ? (profit / (cost * 1.19) * 100) : 0;

            document.getElementById('previewSubtotal').textContent = formatCLP(lineNet, true);
            document.getElementById('previewMargin').innerHTML = `<span style="font-size:0.85em; color:rgba(255,255,255,0.5); font-weight: normal; margin-right: 0.5rem;">(${formatCLP(profit, true)})</span> ${margin.toFixed(1)}%`;
            document.getElementById('previewMargin').style.color = profit > 0 ? '#34d399' : '#ef4444';
        };

        quantityInput.addEventListener('input', updatePreview);
        costInput.addEventListener('input', updatePreview);
        priceInput.addEventListener('input', updatePreview);

        // Flujo con Enter: Cantidad → Precio neto → Precio venta → agregar a compra y volver al buscador
        quantityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                costInput.focus();
                costInput.select();
            }
        });
        costInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                priceInput.focus();
                priceInput.select();
            }
        });
        priceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.addProductToPurchase(product.id);
            }
        });

        updatePreview();
        setTimeout(() => quantityInput.focus(), 100);
    },

    async addProductToPurchase(productId) {
        const searchInput = document.getElementById('productSearchInput');

        const quantity = parseFloat(document.getElementById('addQuantity').value);
        let cost = parseFloat(document.getElementById('addCost').value);
        const price = parseFloat(document.getElementById('addPrice').value);

        if (!quantity || quantity <= 0) {
            showNotification('Ingresa una cantidad válida', 'warning');
            return;
        }

        if (!cost || cost < 0) {
            showNotification('Ingresa un precio neto válido', 'warning');
            return;
        }

        if (!price || price < 0) {
            showNotification('Ingresa un precio de venta válido', 'warning');
            return;
        }

        // Apply VAT logic based on global invoice mode
        const docType = document.getElementById('purchaseDocumentType').value;
        const costMode = (docType === 'factura_bruto') ? 'gross' : 'net';

        if (costMode === 'gross') {
            cost = cost / 1.19; // Keep decimals for accurate line totaling
        }

        const product = await Product.getById(productId);
        const existingItem = this.purchaseItems.find(item => item.productId === productId);

        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.cost = cost;
            existingItem.price = price;
            existingItem.total = Math.round(existingItem.quantity * cost); // Line Net
        } else {
            this.purchaseItems.push({
                productId: product.id,
                name: product.name,
                barcode: product.barcode || '',
                quantity: quantity,
                cost: cost,
                price: price,
                total: Math.round(quantity * cost), // Line Net
                type: product.type
            });
        }

        this.cancelAddProduct();
        this.updatePurchaseItems();
        showNotification(`${product.name} agregado a la compra`, 'success');

        if (searchInput) {
            setTimeout(() => {
                searchInput.value = '';
                searchInput.focus();
            }, 50); // Small delay to ensure UI is ready
        }
        this.autosaveDraft();
    },

    cancelAddProduct() {
        document.getElementById('productSelectionArea').innerHTML = '';
        const resultsDiv = document.getElementById('purchaseProductSearchResults');
        if (resultsDiv) resultsDiv.style.display = 'none';
        this.resetSearchInput(false);
    },

    updatePurchaseItems() {
        document.getElementById('purchaseItemsList').innerHTML = this.renderPurchaseItems();
        const total = this.calculateTotalForWizard();
        const totalSpan = document.getElementById('purchaseTotal');
        if (totalSpan) totalSpan.textContent = formatCLP(total); // Rounded to integer
    },

    resetSearchInput(clearValue = false) {
        const searchInput = document.getElementById('productSearchInput');
        const resultsDiv = document.getElementById('purchaseProductSearchResults');
        if (!searchInput) return;

        if (clearValue) {
            searchInput.value = '';
        }
        searchInput.disabled = false;
        searchInput.readOnly = false;
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }

        setTimeout(() => {
            searchInput.focus();
        }, 0);
    },

    renderPurchaseItems() {
        if (this.purchaseItems.length === 0) {
            return `
                <div class="empty-state" style="padding: 3rem; background: rgba(17, 24, 39, 0.4); border: 1px dashed rgba(255,255,255,0.1); border-radius: 1rem; text-align: center; margin-top: 1rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                    <p style="color: #94a3b8; font-size: 1.2rem; margin-bottom: 0.5rem;">No hay productos en esta compra</p>
                    <small style="color: #64748b;">Busca productos arriba y agrégalos al carro.</small>
                </div>
            `;
        }

        return `
            <div style="background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 1rem; overflow: hidden; margin-top: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: rgba(15, 23, 42, 0.8); border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <tr>
                            <th style="padding: 1rem; text-align: left; color: #94a3b8; font-weight: 500; font-size: 0.95rem;">Producto</th>
                            <th style="padding: 1rem; text-align: center; color: #94a3b8; font-weight: 500; font-size: 0.95rem;">Cantidad</th>
                            <th style="padding: 1rem; text-align: right; color: #94a3b8; font-weight: 500; font-size: 0.95rem;">Costo Neto</th>
                            <th style="padding: 1rem; text-align: right; color: #94a3b8; font-weight: 500; font-size: 0.95rem;">Precio Venta</th>
                            <th style="padding: 1rem; text-align: right; color: #94a3b8; font-weight: 500; font-size: 0.95rem;">Margen Real (con IVA)</th>
                            <th style="padding: 1rem; text-align: right; color: #94a3b8; font-weight: 500; font-size: 0.95rem;">Subtotal</th>
                            <th style="padding: 1rem; text-align: center; color: #94a3b8; font-weight: 500; font-size: 0.95rem;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.purchaseItems.map((item, index) => {
            const costWithIva = item.cost * 1.19;
            const profit = item.price - costWithIva;
            const margin = costWithIva > 0 ? (profit / costWithIva * 100) : 0;
            const inputStyle = "background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 0.6rem; border-radius: 0.5rem; text-align: center; width: 100%; transition: all 0.2s;";

            return `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                                    <td style="padding: 1rem;">
                                        <div style="font-weight: 600; color: #e2e8f0; font-size: 1.05rem;">${item.name}</div>
                                        <div style="font-size: 0.85rem; color: #64748b; margin-top: 0.25rem;">${item.barcode || 'Sin código'}</div>
                                    </td>
                                    <td style="padding: 1rem; width: 140px;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <input type="number" 
                                                   name="tableQuantity_${index}"
                                                   value="${item.quantity}" 
                                                   min="${item.type === 'weight' ? '0.001' : '1'}" 
                                                   step="${item.type === 'weight' ? '0.001' : '1'}" 
                                                   style="${inputStyle}" 
                                                   onchange="PurchasesView.updateItemQuantity(${index}, this.value)" 
                                                   onfocus="this.style.borderColor='rgba(59, 130, 246, 0.5)'" 
                                                   onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                                            <span style="color: #64748b; font-size: 0.85rem; font-weight: 500; width: 20px;">${item.type === 'weight' ? 'kg' : 'un'}</span>
                                        </div>
                                    </td>
                                    <td style="padding: 1rem; width: 130px;">
                                        <input type="number" 
                                               name="tableCost_${index}"
                                               value="${item.cost % 1 === 0 ? item.cost : item.cost.toFixed(2)}" 
                                               min="0" 
                                               step="0.01" 
                                               style="${inputStyle} text-align: right;" 
                                               onchange="PurchasesView.updateItemCost(${index}, this.value)" 
                                               onfocus="this.style.borderColor='rgba(59, 130, 246, 0.5)'" 
                                               onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                                    </td>
                                    <td style="padding: 1rem; width: 130px;">
                                        <input type="number" 
                                               name="tablePrice_${index}"
                                               value="${item.price}" 
                                               min="0" 
                                               step="1" 
                                               style="${inputStyle} text-align: right;" 
                                               onchange="PurchasesView.updateItemPrice(${index}, this.value)" 
                                               onfocus="this.style.borderColor='rgba(59, 130, 246, 0.5)'" 
                                               onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                                    </td>
                                    <td style="padding: 1rem; text-align: right; vertical-align: middle;">
                                        <div style="color: ${profit > 0 ? '#34d399' : '#ef4444'}; font-weight: 700; font-size: 1.1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${margin.toFixed(1)}%</div>
                                        <div style="font-size: 0.8rem; color: ${profit > 0 ? '#6ee7b7' : '#fca5a5'}; margin-top: 0.25rem; opacity: 0.8;">Ganancia: ${formatCLP(profit, true)}</div>
                                    </td>
                                    <td style="padding: 1rem; text-align: right; font-weight: 800; color: #93c5fd; font-size: 1.25rem;">
                                        ${formatCLP(item.total, true)}
                                    </td>
                                    <td style="padding: 1rem; text-align: center;">
                                        <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2); width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; padding: 0; margin: 0 auto; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'" onclick="PurchasesView.removeItem(${index}); PurchasesView.autosaveDraft();" title="Quitar producto">
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                    <tfoot>
                        ${(() => {
                const docTypeSelect = document.getElementById('purchaseDocumentType');
                const isFactura = docTypeSelect ? docTypeSelect.value.includes('factura') : true;
                const subtotalNeto = this.purchaseItems.reduce((sum, item) => sum + item.total, 0);
                const iva = isFactura ? Math.round(subtotalNeto * 0.19) : 0;
                const totalCompra = subtotalNeto + iva;

                if (isFactura) {
                    return `
                                    <tr style="background: rgba(59, 130, 246, 0.05); border-top: 1px solid rgba(59, 130, 246, 0.2);">
                                        <td colspan="5" style="padding: 1rem 1.5rem; text-align: right; font-size: 1.1rem; color: #94a3b8; font-weight: 500;">Subtotal Neto</td>
                                        <td style="padding: 1rem 1.5rem; text-align: right; font-size: 1.25rem; font-weight: 700; color: #cbd5e1;">${formatCLP(subtotalNeto, true)}</td>
                                        <td></td>
                                    </tr>
                                    <tr style="background: rgba(59, 130, 246, 0.05);">
                                        <td colspan="5" style="padding: 1rem 1.5rem; text-align: right; font-size: 1.1rem; color: #94a3b8; font-weight: 500;">IVA (19%) al Pozo</td>
                                        <td style="padding: 1rem 1.5rem; text-align: right; font-size: 1.25rem; font-weight: 700; color: #34d399;">+ ${formatCLP(iva, true)}</td>
                                        <td></td>
                                    </tr>
                                    <tr style="background: rgba(59, 130, 246, 0.1); border-top: 1px dashed rgba(59, 130, 246, 0.3);">
                                        <td colspan="5" style="padding: 1.5rem; text-align: right; font-size: 1.2rem; color: #93c5fd; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Total de Compra</td>
                                        <td style="padding: 1.5rem; text-align: right; font-size: 2rem; font-weight: 900; color: #60a5fa; text-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">${formatCLP(totalCompra, true)}</td>
                                        <td></td>
                                    </tr>
                                `;
                } else {
                    return `
                                    <tr style="background: rgba(59, 130, 246, 0.1); border-top: 1px solid rgba(59, 130, 246, 0.2);">
                                        <td colspan="5" style="padding: 1.5rem; text-align: right; font-size: 1.2rem; color: #93c5fd; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Total de Compra</td>
                                        <td style="padding: 1.5rem; text-align: right; font-size: 2rem; font-weight: 900; color: #60a5fa; text-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">${formatCLP(subtotalNeto, true)}</td>
                                        <td></td>
                                    </tr>
                                `;
                }
            })()}
                    </tfoot>
                </table>
            </div>
        `;
    },

    updateItemQuantity(index, quantity) {
        const q = parseFloat(quantity) || 0;
        this.purchaseItems[index].quantity = q;
        this.purchaseItems[index].total = Math.round(q * this.purchaseItems[index].cost); // Total is based on NET cost
        this.updatePurchaseItems();
        this.autosaveDraft();
    },

    updateItemCost(index, cost) {
        // If we are editing in the table, we assume the user is entering the NET cost directly
        // unless they are in Gross mode, but table editing is usually for Net adjustments.
        // For simplicity, we keep the decimals if they come from the mode, or round if manual.
        this.purchaseItems[index].cost = parseFloat(cost);
        this.purchaseItems[index].total = Math.round(this.purchaseItems[index].quantity * this.purchaseItems[index].cost);
        this.updatePurchaseItems();
        this.autosaveDraft();
    },

    updateItemPrice(index, price) {
        const p = parseFloat(price) || 0;
        this.purchaseItems[index].price = p;
        this.updatePurchaseItems();
        this.autosaveDraft();
    },

    removeItem(index) {
        this.purchaseItems.splice(index, 1);
        this.updatePurchaseItems();
        // Reset search input so barcode/text entry works immediately
        this.resetSearchInput(true);
    },

    async deletePurchase(id) {
        await SupplierController.deletePurchase(id);
    },

    async savePurchase() {
        const form = document.getElementById('purchaseForm');

        // HTML5 Validation for required fields
        if (!form.reportValidity()) {
            return;
        }

        const formData = new FormData(form);
        const purchaseId = formData.get('id'); // Get ID if editing

        if (this.purchaseItems.length === 0) {
            showNotification('Debes agregar al menos un producto', 'warning');
            return;
        }

        const supplierId = parseInt(formData.get('supplierId'));
        if (!supplierId || isNaN(supplierId)) {
            showNotification('Debes seleccionar un proveedor antes de guardar', 'error');
            this.goToStep(1);
            return;
        }

        let invoiceNumber = (formData.get('invoiceNumber') || '').trim();
        const invoiceDate = formData.get('invoiceDate');
        const documentType = formData.get('documentType');

        const vatMode = documentType.includes('factura') ? (documentType === 'factura_bruto' ? 'gross' : 'net') : 'net';
        const isFactura = documentType.includes('factura');

        if (isFactura && !invoiceNumber) {
            showNotification('El N° de Factura es obligatorio', 'warning');
            this.goToStep(1);
            return;
        }
        if (!invoiceDate) {
            showNotification('La fecha de documento es obligatoria', 'warning');
            this.goToStep(1);
            return;
        }
        if (!invoiceNumber) invoiceNumber = 'SIN CORRELATIVO';

        const subtotal = this.purchaseItems.reduce((sum, item) => sum + item.total, 0);
        let ivaAmount = 0;
        let grandTotal = 0;

        if (isFactura) {
            ivaAmount = Math.round(subtotal * 0.19);
            grandTotal = subtotal + ivaAmount;
        } else {
            ivaAmount = 0;
            grandTotal = subtotal;
        }

        const data = {
            id: purchaseId ? parseInt(purchaseId) : undefined,
            supplierId: supplierId,
            documentType: documentType || 'factura',
            vatMode: vatMode,
            invoiceNumber: invoiceNumber,
            invoiceDate: invoiceDate,
            items: this.purchaseItems,
            subtotal: subtotal,
            ivaAmount: ivaAmount,
            total: grandTotal,
            paidAmount: parseFloat(formData.get('paidAmount')) || 0,
            dueDate: formData.get('dueDate') || null,
            status: 'pending',
            deductFromCashRegister: formData.get('deductFromCashRegister') === 'true'
        };

        // If updating, preserve status if paidAmount >= total, or if it was already paid?
        // Actually, if paidAmount >= total, status should be 'paid'.
        if (data.paidAmount >= data.total) {
            data.status = 'paid';
        } else if (purchaseId) {
            // If editing and not fully paid, maybe keep previous status?
            // But usually if we edit amounts, we re-evaluate status based on new totals.
            // 'pending' is safe if not fully paid.
        }

        try {
            await SupplierController.savePurchase(data);
            this.clearDraft(); // Limpiar borrador al guardar exitosamente
            closeModal();
            showNotification(purchaseId ? 'Compra actualizada exitosamente' : 'Compra guardada', 'success');
            app.navigate('purchases');
        } catch (error) {
            showNotification('Error al guardar la compra: ' + error.message, 'error');
        }
    },

    async editPurchase(id) {
        const purchase = await Purchase.getById(id);
        if (!purchase) {
            showNotification('Compra no encontrada', 'error');
            return;
        }
        this.showPurchaseForm(purchase);
    },

    async viewPurchase(id) {
        const purchase = await Purchase.getById(id);
        const supplier = await Supplier.getById(purchase.supplierId);

        // C6: Obtener pagos registrados para esta compra
        const payments = await SupplierPayment.getByPurchase(id);
        const registeredPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const legacyPaid = parseFloat(purchase.paidAmount) || 0;
        const effectivePaid = Math.max(registeredPaid, legacyPaid);
        const balance = Math.max(0, (parseFloat(purchase.total) || 0) - effectivePaid);

        const methodLabel = (m) => m === 'cash' ? 'Efectivo' : m === 'transfer' ? 'Transferencia' : 'Otro';

        const paymentsHtml = payments.length > 0 ? `
            <div style="margin-top: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Pagos registrados (${payments.length})</h4>
                <div class="table-container" style="max-height: 200px; overflow-y: auto;">
                    <table style="margin-bottom: 0;">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Monto</th>
                                <th>Método</th>
                                <th>Referencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payments.map(p => `
                                <tr>
                                    <td>${formatDate(p.date)}</td>
                                    <td><strong>${formatCLP(p.amount)}</strong></td>
                                    <td>${methodLabel(p.method)}</td>
                                    <td>${p.reference || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : '';

        const content = `
            <div style="margin-bottom: 1.5rem;">
                <p><strong>Proveedor:</strong> ${supplier ? supplier.name : 'N/A'}</p>
                <p><strong>Fecha de Compra original:</strong> ${formatDateTime(purchase.date)}</p>
                ${purchase.invoiceNumber ? `<p><strong>N° Factura:</strong> ${purchase.invoiceNumber}</p>` : ''}
                ${purchase.invoiceDate ? `<p><strong>Fecha Factura:</strong> ${formatDate(purchase.invoiceDate)}</p>` : ''}
                <p><strong>Estado:</strong> 
                    <span class="badge ${balance <= 0 ? 'badge-success' : 'badge-warning'}">
                        ${balance <= 0 ? 'Pagado' : 'Pendiente'}
                    </span>
                </p>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Neto</th>
                            <th>Precio Venta</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchase.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${formatCLP(item.cost)}</td>
                                <td>${item.price ? formatCLP(item.price) : '-'}</td>
                                <td><strong>${formatCLP(item.total)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid var(--border);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Total:</span>
                    <strong>${formatCLP(purchase.total)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Pagado:</span>
                    <strong>${formatCLP(effectivePaid)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.25rem; color: ${balance > 0 ? 'var(--danger)' : 'var(--success)'};">
                    <strong>Saldo:</strong>
                    <strong>${formatCLP(balance)}</strong>
                </div>
            </div>

            ${paymentsHtml}
        `;

        const footer = balance > 0 ? `
            <button class="btn btn-success" onclick="closeModal(); PurchasesView.showPaymentForm(${id})">
                💰 Registrar Pago
            </button>
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        ` : '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>';

        showModal(content, { title: 'Detalle de Compra', footer, width: '700px' });
    },

    async showPaymentForm(id) {
        const purchase = await Purchase.getById(id);
        const supplier = await Supplier.getById(purchase.supplierId);

        // C6: Calcular saldo usando pagos registrados
        const registeredPaid = await SupplierPayment.getTotalPaidForPurchase(id);
        const legacyPaid = parseFloat(purchase.paidAmount) || 0;
        const effectivePaid = Math.max(registeredPaid, legacyPaid);
        const balance = Math.max(0, (parseFloat(purchase.total) || 0) - effectivePaid);

        // C6: Obtener historial de pagos de esta compra
        const payments = await SupplierPayment.getByPurchase(id);

        const paymentHistoryHtml = payments.length > 0 ? `
            <div style="margin-bottom: 1rem;">
                <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Pagos registrados (${payments.length})</h4>
                <div style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border); border-radius: 0.375rem;">
                    <table style="width: 100%; margin-bottom: 0;">
                        <thead>
                            <tr>
                                <th style="padding: 0.4rem 0.5rem; font-size: 0.8rem;">Fecha</th>
                                <th style="padding: 0.4rem 0.5rem; font-size: 0.8rem;">Monto</th>
                                <th style="padding: 0.4rem 0.5rem; font-size: 0.8rem;">Método</th>
                                <th style="padding: 0.4rem 0.5rem; font-size: 0.8rem;">Referencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payments.map(p => `
                                <tr>
                                    <td style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">${formatDate(p.date)}</td>
                                    <td style="padding: 0.3rem 0.5rem; font-size: 0.8rem;"><strong>${formatCLP(p.amount)}</strong></td>
                                    <td style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">${p.method === 'cash' ? 'Efectivo' : p.method === 'transfer' ? 'Transferencia' : 'Otro'}</td>
                                    <td style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">${p.reference || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : '';

        const content = `
            <div style="margin-bottom: 1rem; padding: 1rem; background: var(--light); border-radius: 0.375rem;">
                <p style="margin-bottom: 0.25rem;"><strong>Proveedor:</strong> ${supplier ? supplier.name : 'N/A'}</p>
                <p style="margin-bottom: 0.25rem;"><strong>Total compra:</strong> ${formatCLP(purchase.total)}</p>
                <p style="margin-bottom: 0.25rem;"><strong>Pagado:</strong> ${formatCLP(effectivePaid)}</p>
                <p style="margin-bottom: 0;"><strong>Saldo pendiente:</strong> <span style="color: var(--danger); font-size: 1.1rem;">${formatCLP(balance)}</span></p>
            </div>

            ${paymentHistoryHtml}
            
            <form id="paymentForm">
                <div class="form-group">
                    <label>Monto a Pagar (CLP) *</label>
                    <input type="number" 
                           id="paymentAmount" 
                           class="form-control" 
                           value="${balance}" 
                           min="1" 
                           max="${balance}" 
                           required>
                </div>
                <div class="form-group">
                    <label>Método de Pago</label>
                    <select id="paymentMethod" class="form-control" onchange="if(document.getElementById('purchaseCashDeductGroup')) { document.getElementById('purchaseCashDeductGroup').style.display = this.value === 'cash' ? 'block' : 'none'; }">
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="other">Otro</option>
                    </select>
                </div>
                
                <div class="form-group" id="purchaseCashDeductGroup" style="display: block; margin-top: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: var(--light); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border);">
                        <input type="checkbox" id="paymentDeductFromCash" value="true">
                        <span>📉 Extraer efectivo de la Caja Activa</span>
                    </label>
                    <small style="margin-left: 2rem; display: block; margin-top: 0.25rem;">Si marcas esto, el dinero se descontará del saldo esperado en el cuadre final de caja.</small>
                </div>

                <div class="form-group">
                    <label>Referencia / Comprobante (opcional)</label>
                    <input type="text" id="paymentReference" class="form-control" placeholder="Ej: Nro. transferencia, recibo...">
                </div>
                <div class="form-group">
                    <label>Notas (opcional)</label>
                    <input type="text" id="paymentNotes" class="form-control" placeholder="Notas adicionales...">
                </div>
            </form>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-success" onclick="PurchasesView.registerPayment(${id})" id="btnRegisterPayment">
                💰 Registrar Pago
            </button>
        `;

        showModal(content, { title: 'Registrar Pago a Proveedor', footer, width: '400px' });
    },

    async showIvaPool() {
        // Logica para calcular total del pozo (IVA crédito de facturas de compra)
        const purchases = await Purchase.getAll();
        const facturas = purchases.filter(p => p.documentType === 'factura');

        let totalPozoIva = 0;

        const rowHTML = await Promise.all(facturas.sort((a, b) => new Date(b.date) - new Date(a.date)).map(async p => {
            const supplier = await Supplier.getById(p.supplierId);
            const supName = supplier ? supplier.name : 'Desconocido';
            const ivaValue = parseFloat(p.ivaAmount) || 0;
            totalPozoIva += ivaValue;

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 1rem;">${formatDate(p.date)}</td>
                    <td style="padding: 1rem;"><strong style="color:#e2e8f0;">${supName}</strong></td>
                    <td style="padding: 1rem;">Factura Nº ${p.invoiceNumber || '-'}</td>
                    <td style="padding: 1rem; text-align:right;">${formatCLP(p.total - ivaValue)}</td>
                    <td style="padding: 1rem; text-align:right; color:#34d399; font-weight:bold;">${formatCLP(ivaValue)}</td>
                </tr>
            `;
        }));

        const content = `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px dashed rgba(16, 185, 129, 0.3); padding: 1.5rem; border-radius: 1rem; text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 1.2rem; color: #94a3b8; margin-bottom: 0.5rem;">Total Pozo IVA Crédito Acumulado</div>
                <div style="font-size: 3rem; font-weight: 900; color: #34d399; text-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);">${formatCLP(totalPozoIva)}</div>
            </div>
            
            <h4 style="margin-bottom: 1rem; color: #cbd5e1;">Desglose de Facturas Emitidas</h4>
            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: rgba(15, 23, 42, 0.8);">
                        <tr>
                            <th style="padding: 1rem; text-align:left;">Fecha</th>
                            <th style="padding: 1rem; text-align:left;">Proveedor</th>
                            <th style="padding: 1rem; text-align:left;">Documento</th>
                            <th style="padding: 1rem; text-align:right;">Neto Compra</th>
                            <th style="padding: 1rem; text-align:right;">IVA Acreditado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${facturas.length > 0 ? rowHTML.join('') : '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #94a3b8;">No hay facturas con IVA registradas aún.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        showModal(content, { title: 'Pozo de IVA (Compras)', width: '800px', footer: '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>' });
    },

    async registerPayment(id) {
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const method = document.getElementById('paymentMethod').value;
        const reference = document.getElementById('paymentReference').value.trim();
        const notes = document.getElementById('paymentNotes').value.trim();
        const deductFromCashElements = document.getElementById('paymentDeductFromCash');
        const deductFromCashRegister = deductFromCashElements ? deductFromCashElements.checked : false;

        if (!amount || amount <= 0) {
            showNotification('Monto inválido', 'error');
            return;
        }

        const btn = document.getElementById('btnRegisterPayment');
        if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

        try {
            const purchase = await Purchase.getById(id);
            // C6: Usar SupplierPaymentService en lugar de Purchase.registerPayment
            await SupplierPaymentService.registerPayment({
                supplierId: purchase.supplierId,
                purchaseId: id,
                amount: amount,
                method: method,
                reference: reference,
                notes: notes,
                deductFromCashRegister: deductFromCashRegister
            });
            closeModal();
            showNotification('Pago registrado exitosamente', 'success');
            app.navigate('purchases');
        } catch (error) {
            showNotification(error.message, 'error');
            if (btn) { btn.disabled = false; btn.textContent = '💰 Registrar Pago'; }
        }
    },

    async restoreDraft() {
        const draft = this.getDraft();
        if (!draft) return;

        // Si el modal no está abierto, abrirlo primero
        if (!document.getElementById('purchaseForm')) {
            await this.showPurchaseForm();
        }

        // Inyectar los valores en los campos reales
        setTimeout(() => {
            const form = document.getElementById('purchaseForm');
            if (!form) return;

            // Ocultar el banner de borrador si existe (para no confundir)
            const draftBanner = form.querySelector('[style*="background: rgba(245, 158, 11, 0.1)"]');
            if (draftBanner) draftBanner.style.display = 'none';

            if (draft.supplierId) form.querySelector('[name="supplierId"]').value = draft.supplierId;
            if (draft.documentType) {
                form.querySelector('[name="documentType"]').value = draft.documentType;
                this.handleDocumentTypeChange();
            }
            if (draft.invoiceNumber) form.querySelector('[name="invoiceNumber"]').value = draft.invoiceNumber;
            if (draft.invoiceDate) form.querySelector('[name="invoiceDate"]').value = draft.invoiceDate;
            if (draft.vatMode) {
                const vatSelect = document.getElementById('invoiceVatMode');
                if (vatSelect) vatSelect.value = draft.vatMode;
            }

            this.purchaseItems = draft.items || [];

            // Forzar volver al Paso 1 para que el usuario verifique la cabecera
            this.currentStep = 1;

            this.updatePurchaseItems();
            this.updateWizardUI();

            showNotification('Borrador recuperado. Verifica los datos antes de continuar.', 'success');
        }, 100);
    }
};
