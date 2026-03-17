const app = {
    currentView: 'pos',
    views: {},

    async init() {
        console.log('🚀 [App] Iniciando aplicación...');
        
        // Inicializar mapeo de vistas de forma defensiva
        this.views = {
            pos: typeof POSView !== 'undefined' ? POSView : null,
            products: typeof ProductsView !== 'undefined' ? ProductsView : null,
            customers: typeof CustomersView !== 'undefined' ? CustomersView : null,
            suppliers: typeof SuppliersView !== 'undefined' ? SuppliersView : null,
            purchases: typeof PurchasesView !== 'undefined' ? PurchasesView : null,
            expenses: typeof ExpensesView !== 'undefined' ? ExpensesView : null,
            cash: typeof CashView !== 'undefined' ? CashView : null,
            inventory: typeof InventoryView !== 'undefined' ? InventoryView : null,
            reports: typeof ReportsView !== 'undefined' ? ReportsView : null,
            sales: typeof SalesView !== 'undefined' ? SalesView : null,
            settings: typeof SettingsView !== 'undefined' ? SettingsView : null,
            auditLogs: typeof AuditLogsView !== 'undefined' ? AuditLogsView : null
        };

        console.log('📊 [App] Vistas registradas:', Object.keys(this.views).filter(k => this.views[k] !== null));
        const missingViews = Object.keys(this.views).filter(k => this.views[k] === null);
        if (missingViews.length > 0) {
            console.warn('⚠️ [App] Vistas no encontradas:', missingViews);
        }

        // LIMPIEZA POST-MIGRACIÓN: Si el business_id no es 1, forzarlo
        if (localStorage.getItem('BUSINESS_ID') !== '1') {
            console.log('🧹 [App] Limpiando ID de negocio inconsistente...');
            localStorage.setItem('BUSINESS_ID', '1');
        }

        try {
            console.log('🔌 [App] Inicializando Base de Datos...');
            const initialized = await db.init();
            if (!initialized) throw new Error('No se pudo inicializar la base de datos');
            console.log('✅ [App] Base de Datos lista');

            await User.initializeDefaultUser();
            console.log('✅ [App] Usuarios inicializados');

            if (!AuthManager.isAuthenticated()) {
                console.log('🔐 [App] Usuario no autenticado, mostrando login...');
                AuthManager.showLoginScreen();
                this.hideSplashScreen();
                return;
            }

            console.log('🔍 [App] Verificando integridad de categorías...');
            await this.checkAndInitializeCategories();

            console.log('🛠️ [App] Configurando sistema...');
            this.setupNavigation();
            this.setupServiceWorker();
            KeyboardManager.init();

            console.log('💾 [App] Iniciando backup automático...');
            await this.startAutoBackup();
            this.setupBackupOnClose();

            console.log('📋 [App] Aplicando permisos...');
            this.applyPermissionsToSidebar();

            console.log('🚀 [App] Navegando a vista inicial (pos)...');
            await this.navigate('pos');

            console.log('💰 [App] Actualizando estado de caja...');
            await this.updateCashStatus();
            this.updateSidebarUser();

            AuthManager.addLogoutButton();
            
            console.log('✨ [App] Inicialización completada con éxito');
            this.hideSplashScreen();

        } catch (error) {
            console.error('❌ [App] Error fatal en inicialización:', error);
            showNotification('Error al inicializar: ' + error.message, 'error');
            const container = document.getElementById('view-container');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 3rem; text-align: center; color: #991b1b; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 1.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); max-width: 500px; margin: 2rem auto;">
                        <h2 style="margin-bottom: 1rem; color: #b91c1c;">❌ Error Crítico</h2>
                        <p style="margin-bottom: 2rem; color: #7f1d1d; opacity: 0.8;">${error.message}</p>
                        <button class="btn btn-primary" onclick="window.location.reload()">🔄 Reintentar Carga</button>
                    </div>
                `;
            }
            this.hideSplashScreen();
            if (document.getElementById('app')) document.getElementById('app').style.display = 'flex';
        }
    },

    hideSplashScreen() {
        const splash = document.getElementById('splash-screen');
        const appDiv = document.getElementById('app');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                if (appDiv) {
                    appDiv.style.display = 'flex';
                    appDiv.style.opacity = '1';
                }
            }, 500);
        }
    },

    async checkAndInitializeCategories() {
        try {
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
        } catch (e) {
            console.warn('⚠️ Error inicializando categorías:', e);
        }
    },

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-menu a');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;

                if (view === 'products' && typeof ProductsView !== 'undefined') {
                    ProductsView.selectedCategory = null;
                    ProductsView.stockFilter = 'all';
                }

                this.navigate(view);

                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('mobile-overlay');
                if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    if (overlay) overlay.style.display = 'none';
                }
            });
        });

        // BLOQUEO DE MOUSE DURANTE NAVEGACIÓN POR TECLADO (Evita interferencias con el puntero)
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
                document.body.classList.add('keyboard-nav');
            }
        });

        window.addEventListener('mousemove', () => {
            document.body.classList.remove('keyboard-nav');
        });
    },

    async navigate(viewName) {
        console.log(`📍 [App] Navegando a: ${viewName}`);
        
        const view = this.views[viewName];
        if (!view) {
            console.error(`❌ [App] Vista "${viewName}" no encontrada o no cargada.`);
            showNotification(`Error: La sección "${viewName}" no está disponible.`, 'error');
            return;
        }

        const navPerm = 'nav.' + viewName;
        if (!PermissionService.can(navPerm)) {
            console.warn(`🚫 [App] Acceso denegado a "${viewName}" para el rol actual.`);
            showNotification(`Acceso denegado: no tienes permiso para esta sección.`, 'error');
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
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 5rem;"><div class="loading"></div><p style="margin-top: 1rem; opacity: 0.6;">Cargando sección...</p></div>';
        }

        try {
            console.log(`🎨 [App] Renderizando vista: ${viewName}`);
            if (typeof view.render !== 'function') {
                throw new Error(`La vista "${viewName}" no tiene un método render().`);
            }
            
            const html = await view.render();
            if (container) container.innerHTML = html;

            if (view.init) {
                console.log(`⚙️ [App] Inicializando vista: ${viewName}`);
                await view.init();
            }
            console.log(`✅ [App] Vista ${viewName} lista`);
        } catch (error) {
            console.error(`❌ [App] Error en vista "${viewName}":`, error);
            if (container) {
                container.innerHTML = `
                    <div style="padding: 3rem; text-align: center; background: rgba(239, 68, 68, 0.05); border-radius: 1rem; border: 1px dashed #ef4444;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h3 style="color: #ef4444;">Error al cargar la sección</h3>
                        <p style="opacity: 0.7; margin-bottom: 1.5rem;">${error.message}</p>
                        <button class="btn btn-secondary" onclick="app.navigate('pos')">🏠 Volver al Inicio</button>
                    </div>
                `;
            }
        }
    },

    async updateCashStatus() {
        const isOpen = await CashController.checkCashStatus();
        const currentCashStatus = document.getElementById('currentCashStatus');

        if (currentCashStatus) {
            currentCashStatus.textContent = isOpen ? 'Sí' : 'No';
            currentCashStatus.style.color = isOpen ? '#10b981' : '#ef4444';
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
            const roleEl = document.getElementById('currentUserRole');
            if (roleEl) {
                roleEl.textContent = role;
            }
        }
    },

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
        
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js?v=2026.3').then((registration) => {
                console.log('✅ ServiceWorker listo');
                
                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    if (installingWorker) {
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateNotification(registration);
                            }
                        };
                    }
                };
            }).catch(err => console.warn('❌ SW Falló:', err));
        });
    },

    showUpdateNotification(registration) {
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
                window.location.reload();
            }
        });
    },

    async startAutoBackup() {
        if (typeof window === 'undefined' || !window.api || typeof window.api.backupSaveToDisk !== 'function') return;
        try {
            const enabledRow = await db.get('settings', 'autoBackupEnabled');
            const enabled = enabledRow == null ? true : !!enabledRow.value;
            const hoursRow = await db.get('settings', 'autoBackupIntervalHours');
            const hours = (hoursRow && Number(hoursRow.value)) || 24;
            const intervalMs = Math.max(1, hours) * 60 * 60 * 1000;
            if (enabled) {
                setInterval(() => {
                    if (window.BackupManager) window.BackupManager.exportAllDataToDisk();
                }, intervalMs);
            }
        } catch (e) {
            console.warn('Auto backup skipped:', e.message);
        }
    },

    setupBackupOnClose() {
        if (typeof window === 'undefined' || !window.api || typeof window.api.onBeforeQuit !== 'function') return;
        window.api.onBeforeQuit(async () => {
            try {
                const row = await db.get('settings', 'autoBackupOnClose');
                const doBackup = row == null ? true : !!row.value;
                if (doBackup && window.BackupManager) {
                    const data = await window.BackupManager.getBackupData();
                    window.api.sendBackupData(JSON.stringify(data));
                } else {
                    window.api.sendBackupSkip();
                }
            } catch (e) {
                window.api.sendBackupSkip();
            }
        });
    }
};

// Inicialización global
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

window.addEventListener('beforeunload', async (e) => {
    if (typeof posController !== 'undefined') {
        const summary = posController.getCartSummary();
        if (summary.items.length > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    }
});

