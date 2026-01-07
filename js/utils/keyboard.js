const KeyboardManager = {
    init() {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                this.handleAltShortcut(e.key);
            }
            
            if (e.ctrlKey && !e.altKey) {
                this.handleCtrlShortcut(e);
            }
            
            if (e.key === 'Escape') {
                closeModal();
            }
        });
        
        document.addEventListener('keypress', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                app.navigate('pos');
            }
        });
    },
    
    handleAltShortcut(key) {
        const shortcuts = {
            '1': 'pos',
            '2': 'products',
            '3': 'customers',
            '4': 'suppliers',
            '5': 'purchases',
            '6': 'cash',
            '7': 'inventory',
            '8': 'reports',
            '9': 'settings'
        };
        
        if (shortcuts[key]) {
            app.navigate(shortcuts[key]);
        }
    },
    
    handleCtrlShortcut(e) {
        if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            if (app.currentView === 'settings') {
                BackupManager.exportAllData();
            }
        }
        
        if (e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            const searchInput = document.getElementById('productSearch') || 
                              document.getElementById('searchProducts');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    }
};

const ShortcutHelper = {
    show() {
        const content = `
            <div style="display: grid; gap: 1rem;">
                <h4>Atajos de Navegación</h4>
                <table>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 1</kbd></td>
                        <td>Punto de Venta</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 2</kbd></td>
                        <td>Productos</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 3</kbd></td>
                        <td>Clientes</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 4</kbd></td>
                        <td>Proveedores</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 5</kbd></td>
                        <td>Compras</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 6</kbd></td>
                        <td>Caja</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 7</kbd></td>
                        <td>Inventario</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 8</kbd></td>
                        <td>Reportes</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Alt + 9</kbd></td>
                        <td>Configuración</td>
                    </tr>
                </table>
                
                <h4 style="margin-top: 1rem;">Atajos de Acción</h4>
                <table>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Ctrl + K</kbd></td>
                        <td>Buscar producto</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Ctrl + B</kbd></td>
                        <td>Crear backup (en Configuración)</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Esc</kbd></td>
                        <td>Cerrar modal</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem;"><kbd>Enter</kbd></td>
                        <td>Agregar producto (en POS)</td>
                    </tr>
                </table>
            </div>
            
            <style>
                kbd {
                    background: var(--dark);
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.875rem;
                    font-family: monospace;
                }
            </style>
        `;
        
        showModal(content, { title: 'Atajos de Teclado', width: '500px' });
    }
};
