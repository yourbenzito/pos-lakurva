const SettingsView = {
    async render() {
        const productCount = await db.count('products');
        const salesCount = await db.count('sales');
        const customerCount = await db.count('customers');
        
        return `
            <div class="view-header">
                <h1>Configuración</h1>
                <p>Gestión del sistema y datos</p>
            </div>
            
            <div class="grid grid-2">
                <div class="card">
                    <h3 style="margin-bottom: 1.5rem;">📊 Estadísticas del Sistema</h3>
                    
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--light); border-radius: 0.375rem;">
                            <span>Productos registrados:</span>
                            <strong>${productCount}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--light); border-radius: 0.375rem;">
                            <span>Ventas totales:</span>
                            <strong>${salesCount}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--light); border-radius: 0.375rem;">
                            <span>Clientes registrados:</span>
                            <strong>${customerCount}</strong>
                        </div>
                    </div>
                    
                    <button class="btn btn-secondary" style="width: 100%; margin-top: 1.5rem;" 
                            onclick="SettingsView.checkStorage()">
                        Ver Uso de Almacenamiento
                    </button>
                </div>
                
                <div class="card">
                    <h3 style="margin-bottom: 1.5rem;">💾 Backup y Restauración</h3>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button class="btn btn-success" onclick="BackupManager.exportAllData()">
                            Exportar Todo (JSON)
                        </button>
                        
                        <button class="btn btn-secondary" onclick="SettingsView.showImportModal()">
                            Importar Datos (JSON)
                        </button>
                        
                        <div style="border-top: 1px solid var(--border); margin: 0.5rem 0;"></div>
                        
                        <button class="btn btn-secondary" onclick="BackupManager.exportToCSV('sales', 'ventas')">
                            Exportar Ventas (CSV)
                        </button>
                        
                        <button class="btn btn-secondary" onclick="BackupManager.exportToCSV('products', 'productos')">
                            Exportar Productos (CSV)
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 1.5rem;">⚙️ Opciones del Sistema</h3>
                
                <div class="grid grid-3">
                    <div>
                        <h4 style="margin-bottom: 0.75rem;">Información</h4>
                        <p style="font-size: 0.875rem; color: var(--text); opacity: 0.8;">
                            Versión: 1.0.0<br>
                            Base de datos: IndexedDB<br>
                            Estado: Offline
                        </p>
                    </div>
                    
                    <div>
                        <h4 style="margin-bottom: 0.75rem;">Cache</h4>
                        <button class="btn btn-secondary btn-sm" onclick="SettingsView.clearCache()">
                            Limpiar Cache
                        </button>
                        <p style="font-size: 0.75rem; margin-top: 0.5rem; color: var(--text); opacity: 0.7;">
                            Limpia archivos en cache
                        </p>
                    </div>
                    
                    <div>
                        <h4 style="margin-bottom: 0.75rem;">Reinstalar</h4>
                        <button class="btn btn-secondary btn-sm" onclick="SettingsView.reinstallApp()">
                            Reinstalar PWA
                        </button>
                        <p style="font-size: 0.75rem; margin-top: 0.5rem; color: var(--text); opacity: 0.7;">
                            Actualiza la aplicación
                        </p>
                    </div>
                </div>
            </div>
            
            <div class="card" style="border: 2px solid var(--danger);">
                <h3 style="margin-bottom: 1.5rem; color: var(--danger);">⚠️ Zona Peligrosa</h3>
                
                <div style="background: #fee2e2; padding: 1rem; border-radius: 0.375rem; margin-bottom: 1rem;">
                    <strong>Advertencia:</strong> Estas acciones son irreversibles. Asegúrate de hacer un backup antes.
                </div>
                
                <button class="btn btn-danger" onclick="BackupManager.clearAllData()">
                    Eliminar Todos los Datos
                </button>
            </div>
        `;
    },
    
    async checkStorage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const used = (estimate.usage / 1024 / 1024).toFixed(2);
            const quota = (estimate.quota / 1024 / 1024).toFixed(2);
            const percent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
            
            const content = `
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 3rem; color: var(--primary);">${percent}%</div>
                    <p style="color: var(--text);">Espacio Utilizado</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Usado:</span>
                        <strong>${used} MB</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Disponible:</span>
                        <strong>${quota} MB</strong>
                    </div>
                    <div style="width: 100%; height: 30px; background: var(--light); border-radius: 15px; overflow: hidden;">
                        <div style="width: ${percent}%; height: 100%; background: var(--primary); transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
            
            showModal(content, { title: 'Uso de Almacenamiento', width: '400px' });
        } else {
            showNotification('Tu navegador no soporta esta función', 'warning');
        }
    },
    
    showImportModal() {
        const content = `
            <div class="form-group">
                <label>Archivo JSON de Backup</label>
                <input type="file" id="importFile" class="form-control" accept=".json">
            </div>
            
            <div style="background: var(--light); padding: 1rem; border-radius: 0.375rem; font-size: 0.875rem;">
                <strong>Nota:</strong> Selecciona un archivo JSON exportado previamente desde este sistema.
                Los datos existentes pueden ser sobrescritos.
            </div>
        `;
        
        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="SettingsView.processImport()">Importar</button>
        `;
        
        showModal(content, { title: 'Importar Datos', footer, width: '500px' });
    },
    
    async processImport() {
        const fileInput = document.getElementById('importFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showNotification('Selecciona un archivo', 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonData = e.target.result;
                await BackupManager.importData(jsonData);
                closeModal();
            } catch (error) {
                showNotification('Error al leer el archivo', 'error');
            }
        };
        reader.readAsText(file);
    },
    
    async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            showNotification('Cache limpiado. Recarga la página.', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('Tu navegador no soporta cache', 'warning');
        }
    },
    
    async reinstallApp() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.unregister();
                await this.clearCache();
                showNotification('App desinstalada. Recarga para reinstalar.', 'success');
                setTimeout(() => location.reload(), 1500);
            }
        } else {
            showNotification('Service Worker no disponible', 'warning');
        }
    }
};
