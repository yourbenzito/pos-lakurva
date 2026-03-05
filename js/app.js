const app = {
    currentView: 'pos',
    views: {
        pos: POSView,
        products: ProductsView,
        customers: CustomersView,
        suppliers: SuppliersView,
        purchases: PurchasesView,
        expenses: ExpensesView,
        cash: CashView,
        inventory: InventoryView,
        reports: ReportsView,
        sales: SalesView,
        settings: SettingsView,
        auditLogs: AuditLogsView
    },

    async init() {
        try {
            await db.init();
            console.log('Database initialized');

            await User.initializeDefaultUser();

            if (!AuthManager.isAuthenticated()) {
                AuthManager.showLoginScreen();
                return;
            }

            await this.checkAndInitializeCategories();

            this.setupNavigation();
            this.setupServiceWorker();
            KeyboardManager.init();

            await this.startAutoBackup();
            this.setupBackupOnClose();

            // C8: Filtrar sidebar según permisos del rol
            this.applyPermissionsToSidebar();

            await this.navigate('pos');

            await this.updateCashStatus();
            this.updateSidebarUser();

            AuthManager.addLogoutButton();

        } catch (error) {
            console.error('Error initializing app:', error);
            showNotification('Error al inicializar la aplicación: ' + error.message, 'error');
            document.getElementById('view-container').innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--danger);">
                    <h2>Error Crítico</h2>
                    <p>No se pudo iniciar la base de datos.</p>
                    <p>Detalle: ${error.message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Reintentar</button>
                </div>
            `;
        }
    },

    async checkAndInitializeCategories() {
        const categories = await db.getAll('categories');
        if (categories.length === 0) {
            const defaultCategories = [
                { name: 'General', color: '#6b7280' },
                { name: 'Bebidas', color: '#3b82f6' },
                { name: 'Abarrotes', color: '#f59e0b' },
                { name: 'Lácteos', color: '#10b981' },
                { name: 'Panadería', color: '#f97316' },
                { name: 'Carnes', color: '#ef4444' },
                { name: 'Verduras', color: '#22c55e' },
                { name: 'Limpieza', color: '#8b5cf6' }
            ];

            for (const cat of defaultCategories) {
                await db.add('categories', cat);
            }
        }
    },

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-menu a');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;

                // Reset category view if clicking the Products tab
                if (view === 'products' && typeof ProductsView !== 'undefined') {
                    ProductsView.selectedCategory = null;
                    ProductsView.stockFilter = 'all';
                }

                this.navigate(view);

                // Close sidebar on mobile if open
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('mobile-overlay');
                if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    if (overlay) overlay.style.display = 'none';
                }
            });
        });
    },

    async navigate(viewName) {
        if (!this.views[viewName]) {
            console.error('View not found:', viewName);
            return;
        }

        // C8: Verificar permiso de navegación
        const navPerm = 'nav.' + viewName;
        if (!PermissionService.can(navPerm)) {
            showNotification(`Acceso denegado: no tienes permiso para acceder a esta sección.`, 'error');
            return;
        }

        this.currentView = viewName;

        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-view="${viewName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        const container = document.getElementById('view-container');
        container.innerHTML = '<div style="text-align: center; padding: 3rem;"><div class="loading"></div></div>';

        try {
            const view = this.views[viewName];
            const html = await view.render();
            container.innerHTML = html;

            if (view.init) {
                await view.init();
            }
        } catch (error) {
            console.error('Error rendering view:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Error al cargar la vista</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    async updateCashStatus() {
        const cashStatus = document.getElementById('cashStatus');
        const isOpen = await CashController.checkCashStatus();
        const currentCashStatus = document.getElementById('currentCashStatus');

        if (isOpen) {
            const cash = await CashController.getOpenCash();
            if (cashStatus) {
                cashStatus.innerHTML = `
                    <div class="cash-open">
                        Caja Abierta<br>
                        <small>${formatDateTime(cash.openDate)}</small>
                    </div>
                `;
            }
        } else {
            if (cashStatus) {
                cashStatus.innerHTML = '<div class="cash-closed">Caja Cerrada</div>';
            }
        }

        if (currentCashStatus) {
            currentCashStatus.textContent = isOpen ? 'Sí' : 'No';
        }

        if (this.cashStatusTimer) {
            clearTimeout(this.cashStatusTimer);
        }
        this.cashStatusTimer = setTimeout(() => this.updateCashStatus(), 30000);
    },

    updateSidebarUser() {
        const userNameEl = document.getElementById('currentUserName');
        const user = AuthManager.getCurrentUser();
        if (userNameEl) {
            const role = user ? (PermissionService.ROLE_LABELS[user.role] || user.role || '') : '';
            userNameEl.textContent = user ? user.username : 'Invitado';
            // C8: Mostrar rol debajo del nombre
            const roleEl = document.getElementById('currentUserRole');
            if (roleEl) {
                roleEl.textContent = role;
            }
        }
    },

    /**
     * C8: Oculta ítems del sidebar que el usuario actual no tiene permiso de ver.
     */
    applyPermissionsToSidebar() {
        const navLinks = document.querySelectorAll('.nav-menu a[data-view]');
        navLinks.forEach(link => {
            const view = link.dataset.view;
            const permission = 'nav.' + view;
            const li = link.closest('li');
            if (li) {
                li.style.display = PermissionService.can(permission) ? '' : 'none';
            }
        });
    },

    setupServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        const protocol = window.location.protocol;
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').then((registration) => {
                    console.log('ServiceWorker registered with scope: ', registration.scope);

                    // Detectar si hay una actualización esperando (Worker instalado pero no activo)
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        // Hay una nueva versión lista
                                        this.showUpdateNotification(registration);
                                    }
                                }
                            };
                        }
                    };

                    // Detectar si el controlador cambió (cuando el nuevo SW toma el control)
                    let refreshing = false;
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        if (refreshing) return;
                        refreshing = true;
                        window.location.reload();
                    });

                }).catch((err) => {
                    console.log('ServiceWorker registration failed: ', err);
                });
            });
        }
    },

    showUpdateNotification(registration) {
        // Crear notificación de actualización elegante
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: #2563eb; color: white; padding: 1rem 1.5rem;
            border-radius: 50px; display: flex; align-items: center; gap: 1rem;
            box-shadow: 0 10px 25px rgba(37,99,235,0.4); z-index: 99999;
            animation: slideUp 0.3s ease-out; font-weight: 500;
        `;

        notification.innerHTML = `
            <span>✨ Nueva versión disponible</span>
            <button id="update-btn" style="
                background: white; color: #2563eb; border: none; 
                padding: 0.4rem 1rem; border-radius: 20px; font-weight: 700;
                cursor: pointer; font-size: 0.8rem;
            ">REINICIAR</button>
        `;

        document.body.appendChild(notification);

        document.getElementById('update-btn').addEventListener('click', () => {
            if (registration.waiting) {
                registration.waiting.postMessage({ action: 'skipWaiting' });
            }
        });
    },

    /**
     * Backup automático cada N horas (solo en Electron; usa api.backupSaveToDisk).
     */
    async startAutoBackup() {
        if (typeof window === 'undefined' || !window.api || typeof window.api.backupSaveToDisk !== 'function') return;
        try {
            const enabledRow = await db.get('settings', 'autoBackupEnabled');
            const enabled = enabledRow == null ? true : !!enabledRow.value;
            const hoursRow = await db.get('settings', 'autoBackupIntervalHours');
            const hours = (hoursRow && Number(hoursRow.value)) || 24;
            const intervalMs = Math.max(1, hours) * 60 * 60 * 1000;
            if (enabled && window.BackupManager) {
                window.__autoBackupIntervalId = setInterval(() => {
                    window.BackupManager.exportAllDataToDisk();
                }, intervalMs);
            }
        } catch (e) {
            console.warn('Auto backup config:', e.message);
        }
    },

    /**
     * Al cerrar la app (Electron): enviar backup al main o saltar según configuración.
     */
    setupBackupOnClose() {
        if (typeof window === 'undefined' || !window.api || typeof window.api.onBeforeQuit !== 'function') return;
        window.api.onBeforeQuit(async () => {
            try {
                const row = await db.get('settings', 'autoBackupOnClose');
                const doBackup = row == null ? true : !!row.value;
                if (doBackup && window.BackupManager) {
                    const data = await window.BackupManager.getBackupData();
                    const json = JSON.stringify(data, null, 2);
                    window.api.sendBackupData(json);
                } else {
                    window.api.sendBackupSkip();
                }
            } catch (e) {
                console.error('Backup on close:', e);
                window.api.sendBackupSkip();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

window.addEventListener('beforeunload', async (e) => {
    const openCash = await CashRegister.getOpen();
    if (openCash) {
        const cart = posController.getCartSummary();
        if (cart.items.length > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    }
});
