const app = {
    currentView: 'pos',
    views: {
        pos: POSView,
        products: ProductsView,
        customers: CustomersView,
        suppliers: SuppliersView,
        purchases: PurchasesView,
        cash: CashView,
        inventory: InventoryView,
        reports: ReportsView,
        settings: SettingsView
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
            
            await this.navigate('pos');
            
            await this.updateCashStatus();
            
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
        
        if (isOpen) {
            const cash = await CashController.getOpenCash();
            cashStatus.innerHTML = `
                <div class="cash-open">
                    Caja Abierta<br>
                    <small>${formatDateTime(cash.openDate)}</small>
                </div>
            `;
        } else {
            cashStatus.innerHTML = '<div class="cash-closed">Caja Cerrada</div>';
        }
        
        setTimeout(() => this.updateCashStatus(), 30000);
    },
    
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed:', err));
        }
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
