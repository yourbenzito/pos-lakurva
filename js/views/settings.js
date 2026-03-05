const SettingsView = {
    async render() {
        const productCount = await db.count('products');
        const salesCount = await db.count('sales');
        const customerCount = await db.count('customers');

        // Initialize security, auto-backup, and user management sections after render
        setTimeout(() => {
            this.initSecuritySection();
            this.initAutoBackupSection();
            // C8: Cargar lista de usuarios y roles
            this.loadUserRoles();
            // Mostrar info de SQLite si está activo
            this.initSQLiteInfo();
        }, 100);

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
                    <h3 style="margin-bottom: 1.5rem;">📥/📤 Excel por entidad</h3>
                    <p style="font-size: 0.9rem; color: rgba(226, 232, 240, 0.8); margin-bottom: 0.75rem;">
                        Descarga cada área como archivo Excel separado o importa datos desde la misma interfaz.
                    </p>
                    <div class="grid grid-3" style="margin-bottom: 1rem;">
                        ${this.renderExcelButtons()}
                    </div>
                    <div class="form-group">
                        <label>Entidad a importar</label>
                        <select id="excelImportEntity" class="form-control">
                            ${this.renderExcelOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Archivo Excel (.xlsx)</label>
                        <input type="file" id="excelImportFile" class="form-control" accept=".xlsx,.xls">
                    </div>
                    <button class="btn btn-primary" onclick="SettingsView.importExcelData()">
                        Importar desde Excel
                    </button>
                </div>

                ${PermissionService.can('settings.backup') ? `
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
                ` : ''}

                <div class="card" id="autoBackupCard" style="margin-top: 1rem;">
                    <h3 style="margin-bottom: 1rem;">🔄 Backup automático</h3>
                    <p style="font-size: 0.875rem; color: var(--text); opacity: 0.8; margin-bottom: 1rem;">
                        Solo en Electron. Los backups se guardan en la carpeta <code>userData/backups</code>.
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="autoBackupEnabled" checked>
                            <span>Activar backup automático cada N horas</span>
                        </label>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="autoBackupIntervalHours">Cada cuántas horas</label>
                            <input type="number" id="autoBackupIntervalHours" class="form-control" min="1" max="168" value="24" style="max-width: 120px;">
                        </div>
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="autoBackupOnClose" checked>
                            <span>Realizar backup al cerrar la aplicación</span>
                        </label>
                        <button class="btn btn-primary" onclick="SettingsView.saveAutoBackupOptions()">
                            Guardar opciones de backup
                        </button>
                        <p id="autoBackupNote" style="font-size: 0.75rem; color: var(--secondary); display: none;">
                            Recarga la página para aplicar el intervalo.
                        </p>
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
            
            ${PermissionService.can('settings.users') ? `
            <div class="card" id="userManagementCard">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0;">👥 Gestión de Usuarios y Roles</h3>
                    <button class="btn btn-primary btn-sm" onclick="SettingsView.showCreateUserModal()">
                        + Nuevo Usuario
                    </button>
                </div>
                <p style="font-size: 0.875rem; color: var(--text); opacity: 0.8; margin-bottom: 1rem;">
                    Asigna roles a los usuarios del sistema. Los roles controlan el acceso a las diferentes secciones y acciones.
                </p>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; padding: 0.75rem; background: var(--light); border-radius: 0.5rem; font-size: 0.85rem;">
                    <div><strong>Propietario:</strong> Acceso total</div>
                    <div><strong>Administrador:</strong> Gestión operativa</div>
                    <div><strong>Cajero:</strong> Solo POS y consultas</div>
                </div>
                <div id="userRolesList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <p style="color: var(--secondary);">Cargando usuarios...</p>
                </div>
            </div>
            ` : ''}

            <div class="card">
                <h3 style="margin-bottom: 1.5rem;">🔐 Seguridad y Recuperación de Contraseña</h3>
                
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div>
                        <h4 style="margin-bottom: 0.75rem;">PIN de Administrador Global</h4>
                        <p style="font-size: 0.875rem; color: var(--text); opacity: 0.8; margin-bottom: 1rem;">
                            Establece un PIN de 4-8 dígitos para restablecer la contraseña de <strong>cualquier usuario</strong> del sistema. Este PIN es global y funciona para todos los usuarios.
                        </p>
                        <div id="adminPINStatus" style="margin-bottom: 0.75rem; padding: 0.75rem; background: var(--light); border-radius: 0.375rem; font-size: 0.875rem;">
                            <span id="pinStatusText">Cargando...</span>
                        </div>
                        <button class="btn btn-primary" id="adminPINBtn" onclick="SettingsView.showSetAdminPINForm()">
                            Configurar PIN
                        </button>
                    </div>
                    
                    <div style="border-top: 1px solid var(--border); padding-top: 1.5rem;">
                        <h4 style="margin-bottom: 0.75rem;">Código de Recuperación</h4>
                        <p style="font-size: 0.875rem; color: var(--text); opacity: 0.8; margin-bottom: 1rem;">
                            Genera un código de recuperación para restablecer tu contraseña. 
                            <strong>Guarda este código en un lugar seguro</strong> - solo se mostrará una vez.
                        </p>
                        <div id="recoveryCodeStatus" style="margin-bottom: 0.75rem; padding: 0.75rem; background: var(--light); border-radius: 0.375rem; font-size: 0.875rem;">
                            <span id="codeStatusText">Cargando...</span>
                        </div>
                        <button class="btn btn-primary" onclick="SettingsView.generateRecoveryCode()">
                            Generar Código de Recuperación
                        </button>
                    </div>
                </div>
            </div>

            <div class="card" style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px solid #3b82f6; border-radius: 1rem; padding: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="font-size: 2.5rem;">🚀</div>
                    <div>
                        <h2 style="margin: 0; color: #fff;">Migración a SQLite (Multidispositivo)</h2>
                        <p style="margin: 0; opacity: 0.8; color: #94a3b8;">Prepárate para usar el sistema en tu celular y otros PCs.</p>
                    </div>
                </div>

                <div class="grid grid-3" style="gap: 1.5rem; margin-bottom: 2rem;">
                    <div style="background: rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 0.75rem;">
                        <span style="display: block; font-size: 1.5rem; margin-bottom: 0.5rem;">1️⃣</span>
                        <h4 style="color: #60a5fa; margin-bottom: 0.5rem;">Exportar Datos</h4>
                        <p style="font-size: 0.85rem; color: #cbd5e1;">Descarga un archivo con toda tu información actual del Minimarket.</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 0.75rem;">
                        <span style="display: block; font-size: 1.5rem; margin-bottom: 0.5rem;">2️⃣</span>
                        <h4 style="color: #60a5fa; margin-bottom: 0.5rem;">Cambiar Motor</h4>
                        <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 1rem;">Activa el nuevo motor SQLite para permitir conexiones multidispositivo.</p>
                        <button class="btn btn-sm btn-secondary" onclick="SettingsView.enableSQLiteMode()" style="width: 100%;">
                            Activar SQLite
                        </button>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 0.75rem;">
                        <span style="display: block; font-size: 1.5rem; margin-bottom: 0.5rem;">3️⃣</span>
                        <h4 style="color: #60a5fa; margin-bottom: 0.5rem;">Importar en SQLite</h4>
                        <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 1rem;">Carga el archivo exportado en el nuevo motor de base de datos.</p>
                        <button class="btn btn-sm btn-primary" onclick="SettingsView.showSQLiteMigrationModal()" style="width: 100%;">
                            Cargar en SQLite
                        </button>
                    </div>
                </div>

                <div style="display: flex; justify-content: center; gap: 1rem;">
                    <button class="btn btn-lg" onclick="BackupManager.exportAllData()" 
                            style="background: #3b82f6; color: white; padding: 1rem 2rem; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); border-radius: 0.75rem;">
                        📥 PASO 1: EXPORTAR TODO
                    </button>
                </div>

                <div id="sqliteInfo" style="margin-top: 2rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; display: none;">
                    <p style="color: #60a5fa; margin-bottom: 0.5rem;"><strong>📍 Conexión para Celular:</strong></p>
                    <p style="color: #fff; font-family: monospace;" id="serverIPInfo">Detectando IP...</p>
                </div>
            </div>
            
        `;
    },

    async initAutoBackupSection() {
        const card = document.getElementById('autoBackupCard');
        if (!card) return;
        if (typeof window !== 'undefined' && window.api && typeof window.api.backupSaveToDisk === 'function') {
            card.style.display = 'block';
            try {
                const enabledRow = await db.get('settings', 'autoBackupEnabled');
                const hoursRow = await db.get('settings', 'autoBackupIntervalHours');
                const onCloseRow = await db.get('settings', 'autoBackupOnClose');
                const cbEnabled = document.getElementById('autoBackupEnabled');
                const inputHours = document.getElementById('autoBackupIntervalHours');
                const cbOnClose = document.getElementById('autoBackupOnClose');
                if (cbEnabled) cbEnabled.checked = enabledRow == null ? true : !!enabledRow.value;
                if (inputHours) inputHours.value = (hoursRow && hoursRow.value != null) ? Number(hoursRow.value) : 24;
                if (cbOnClose) cbOnClose.checked = onCloseRow == null ? true : !!onCloseRow.value;
            } catch (e) {
                console.warn('initAutoBackupSection:', e.message);
            }
        } else {
            card.style.display = 'none';
        }
    },

    async saveAutoBackupOptions() {
        const cbEnabled = document.getElementById('autoBackupEnabled');
        const inputHours = document.getElementById('autoBackupIntervalHours');
        const cbOnClose = document.getElementById('autoBackupOnClose');
        if (!cbEnabled || !inputHours || !cbOnClose) return;
        try {
            const hours = Math.max(1, Math.min(168, Number(inputHours.value) || 24));
            await db.put('settings', { key: 'autoBackupEnabled', value: cbEnabled.checked });
            await db.put('settings', { key: 'autoBackupIntervalHours', value: hours });
            await db.put('settings', { key: 'autoBackupOnClose', value: cbOnClose.checked });
            inputHours.value = hours;
            showNotification('Opciones de backup guardadas. Recarga la página para aplicar el intervalo.', 'success');
            const note = document.getElementById('autoBackupNote');
            if (note) note.style.display = 'block';
        } catch (e) {
            showNotification('Error al guardar: ' + e.message, 'error');
        }
    },

    get excelEntities() {
        return window.BACKUP_ENTITY_CONFIG || [];
    },

    renderExcelButtons() {
        return this.excelEntities.map(entity => `
            <button class="btn btn-secondary btn-sm" onclick="SettingsView.exportEntityData('${entity.key}')">
                ${entity.label}
            </button>
        `).join('');
    },

    renderExcelOptions() {
        return this.excelEntities.map(entity => `
            <option value="${entity.key}">${entity.label}</option>
        `).join('');
    },

    async exportEntityData(key) {
        const entity = this.excelEntities.find(e => e.key === key);
        if (!entity) {
            showNotification('Entidad no válida', 'warning');
            return;
        }

        if (entity.type === 'store') {
            await BackupManager.exportEntityToExcel(entity.store, entity.label, entity.sheet);
            return;
        }

        if (entity.type === 'custom') {
            if (entity.handler === 'customerDebts') {
                await BackupManager.exportCustomerDebts(entity.sheet, entity.label);
            } else if (entity.handler === 'reportsSummary') {
                await BackupManager.exportReportsSummary(entity.sheet, entity.label);
            }
        }
    },

    async importExcelData() {
        const entitySelect = document.getElementById('excelImportEntity');
        const fileInput = document.getElementById('excelImportFile');
        const file = fileInput?.files[0];
        const entityKey = entitySelect?.value;

        if (!file) {
            showNotification('Selecciona un archivo Excel', 'warning');
            return;
        }

        const entity = this.excelEntities.find(e => e.key === entityKey);
        if (!entity) {
            showNotification('Selecciona una entidad válida', 'warning');
            return;
        }

        if (entity.type !== 'store') {
            showNotification('Esta entidad no admite importación directa', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            await BackupManager.importEntityFromExcel(entity.store, entity.sheet, entity.label, arrayBuffer);
            fileInput.value = '';
        };
        reader.onerror = () => {
            showNotification('No se pudo leer el archivo', 'error');
        };
        reader.readAsArrayBuffer(file);
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
    },

    /**
     * C8: Cargar la lista de usuarios con sus roles.
     */
    async loadUserRoles() {
        const container = document.getElementById('userRolesList');
        if (!container) return;

        try {
            const users = await User.getAll();
            const currentUser = AuthManager.getCurrentUser();

            if (users.length === 0) {
                container.innerHTML = '<p style="color: var(--secondary);">No hay usuarios registrados.</p>';
                return;
            }

            container.innerHTML = users.map(u => {
                const role = User.getEffectiveRole(u);
                const roleLabel = PermissionService.ROLE_LABELS[role] || role;
                const isSelf = currentUser && currentUser.id === u.id;
                const roleBadgeColor = role === 'owner' ? '#a78bfa' : role === 'admin' ? '#60a5fa' : '#94a3b8';

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--light); border-radius: 0.375rem; border-left: 3px solid ${roleBadgeColor};">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, ${roleBadgeColor}, ${roleBadgeColor}88); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem;">
                                ${u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight: 600;">${u.username}${isSelf ? ' <span style="font-size: 0.75rem; opacity: 0.7;">(tú)</span>' : ''}</div>
                                <div style="font-size: 0.8rem; color: var(--secondary);">
                                    <span style="padding: 0.1rem 0.4rem; border-radius: 0.2rem; background: ${roleBadgeColor}33; color: ${roleBadgeColor};">${roleLabel}</span>
                                    ${u.createdAt ? ` · Creado: ${new Date(u.createdAt).toLocaleDateString('es-CL')}` : ''}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            ${PermissionService.can('settings.users') ? `
                                <select onchange="SettingsView.changeUserRole(${u.id}, this.value, '${u.username}')"
                                        style="padding: 0.3rem 0.5rem; border-radius: 0.25rem; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 0.85rem;"
                                        ${isSelf ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>
                                    ${PermissionService.ROLES.map(r =>
                    `<option value="${r}" ${r === role ? 'selected' : ''}>${PermissionService.ROLE_LABELS[r]}</option>`
                ).join('')}
                                </select>
                                ${!isSelf ? `
                                    <button class="btn btn-danger btn-sm" style="padding: 0.3rem 0.6rem;" 
                                            onclick="SettingsView.deleteUser(${u.id}, '${u.username}')" title="Eliminar Usuario">
                                        ✕
                                    </button>
                                ` : ''}
                            ` : `<span style="font-size: 0.85rem; color: var(--secondary);">${roleLabel}</span>`}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            container.innerHTML = '<p style="color: var(--danger);">Error al cargar usuarios.</p>';
        }
    },

    /**
     * C8: Cambiar el rol de un usuario.
     */
    async changeUserRole(userId, newRole, username) {
        if (!PermissionService.check('settings.users', 'gestionar usuarios')) return;

        try {
            await User.updateRole(userId, newRole);
            const roleLabel = PermissionService.ROLE_LABELS[newRole] || newRole;
            showNotification(`Rol de "${username}" actualizado a ${roleLabel}`, 'success');
            await this.loadUserRoles();
        } catch (error) {
            showNotification('Error al cambiar rol: ' + error.message, 'error');
            await this.loadUserRoles(); // Recargar para restaurar estado visual
        }
    },

    /**
     * C8: Eliminar un usuario.
     */
    async deleteUser(userId, username) {
        if (!PermissionService.check('settings.users', 'eliminar usuarios')) return;

        showConfirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${username}"?`, async () => {
            try {
                await db.delete('users', userId);
                showNotification(`Usuario "${username}" eliminado correctamente`, 'success');
                await this.loadUserRoles();
            } catch (error) {
                showNotification('Error al eliminar usuario: ' + error.message, 'error');
            }
        });
    },

    /**
     * C8: Mostrar modal para crear nuevo usuario.
     */
    showCreateUserModal() {
        if (!PermissionService.check('settings.users', 'crear usuarios')) return;

        const content = `
            <div class="form-group">
                <label>Nombre de Usuario *</label>
                <input type="text" id="newUsername" class="form-control" placeholder="Ej: vendedorpablo" autocomplete="off">
            </div>
            
            <div class="form-group">
                <label>Contraseña Temporal *</label>
                <input type="password" id="newPassword" class="form-control" placeholder="Mínimo 4 caracteres" autocomplete="new-password">
            </div>
            
            <div class="form-group">
                <label>Rol del Usuario *</label>
                <select id="newUserRole" class="form-control">
                    <option value="cashier" selected>Cajero (Solo ventas y POS)</option>
                    <option value="admin">Administrador (Gestión operativa)</option>
                    <option value="owner">Propietario (Acceso Total)</option>
                </select>
            </div>
            
            <div style="background: var(--light); padding: 0.75rem; border-radius: 0.375rem; font-size: 0.85rem; margin-top: 1rem;">
                <strong>Nota:</strong> Como dueños, ustedes tienen el control total del sistema.
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="SettingsView.processCreateUser()">Crear Usuario</button>
        `;

        showModal(content, { title: 'Registrar Nuevo Trabajador', footer, width: '450px' });
    },

    /**
     * C8: Procesar creación de usuario.
     */
    async processCreateUser() {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newUserRole').value;

        if (!username || !password) {
            showNotification('Por favor completa todos los campos', 'warning');
            return;
        }

        if (password.length < 4) {
            showNotification('La contraseña debe tener al menos 4 caracteres', 'warning');
            return;
        }

        try {
            await User.create(username, password, null, role);
            showNotification(`Usuario "${username}" creado exitosamente como ${PermissionService.ROLE_LABELS[role]}`, 'success');
            closeModal();
            await this.loadUserRoles();
        } catch (error) {
            showNotification('Error al crear usuario: ' + error.message, 'error');
        }
    },

    async initSecuritySection() {
        // Update PIN status
        const hasPIN = await User.hasAdminPIN();
        const pinStatusText = document.getElementById('pinStatusText');
        const pinBtn = document.getElementById('adminPINBtn');

        if (pinStatusText) {
            pinStatusText.textContent = hasPIN ? '✓ PIN configurado' : 'PIN no configurado';
        }
        if (pinBtn) {
            pinBtn.textContent = hasPIN ? 'Cambiar PIN' : 'Configurar PIN';
        }

        // Update recovery code status
        const currentUser = AuthManager.getCurrentUser();
        const codeStatusText = document.getElementById('codeStatusText');

        if (codeStatusText && currentUser) {
            const user = await User.getById(currentUser.id);
            if (user && user.recoveryCode) {
                codeStatusText.textContent = '✓ Código generado (ya no se mostrará)';
            } else {
                codeStatusText.textContent = 'Código no generado';
            }
        }
    },

    showSetAdminPINForm() {
        const content = `
            <div class="form-group">
                <label>PIN de Administrador (4-8 dígitos) *</label>
                <input type="password" id="adminPIN" class="form-control" placeholder="Ej: 1234" maxlength="8" pattern="[0-9]{4,8}" required>
            </div>
            
            <div class="form-group">
                <label>Confirmar PIN *</label>
                <input type="password" id="adminPINConfirm" class="form-control" placeholder="Confirma el PIN" maxlength="8" pattern="[0-9]{4,8}" required>
            </div>
            
            <div style="background: var(--light); padding: 1rem; border-radius: 0.375rem; font-size: 0.875rem; margin-top: 1rem;">
                <strong>Importante:</strong> Este PIN permite restablecer la contraseña de cualquier usuario del sistema. Guárdalo en un lugar seguro.
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="SettingsView.saveAdminPIN()">Guardar PIN</button>
        `;

        showModal(content, { title: 'Configurar PIN de Administrador', footer, width: '450px' });
    },

    async saveAdminPIN() {
        const pin = document.getElementById('adminPIN').value;
        const pinConfirm = document.getElementById('adminPINConfirm').value;

        if (!pin || pin.length < 4 || pin.length > 8) {
            showNotification('El PIN debe tener entre 4 y 8 dígitos', 'warning');
            return;
        }

        if (!/^\d+$/.test(pin)) {
            showNotification('El PIN solo puede contener números', 'warning');
            return;
        }

        if (pin !== pinConfirm) {
            showNotification('Los PINs no coinciden', 'warning');
            return;
        }

        try {
            await User.setAdminPIN(pin);
            showNotification('PIN de administrador global configurado exitosamente. Este PIN permite recuperar la contraseña de cualquier usuario.', 'success');
            closeModal();
            // Update status in view
            await this.initSecuritySection();
        } catch (error) {
            console.error('Error al configurar PIN:', error);
            showNotification('Error al configurar PIN: ' + error.message, 'error');
        }
    },

    async generateRecoveryCode() {
        const currentUser = AuthManager.getCurrentUser();
        if (!currentUser) {
            showNotification('Debes estar autenticado para generar un código de recuperación', 'warning');
            return;
        }

        showConfirm('¿Generar un nuevo código de recuperación? Si ya tienes un código, este será reemplazado.', async () => {
            try {
                const { code, user } = await User.generateAndSetRecoveryCode(currentUser.id);

                const content = `
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary); font-family: monospace; letter-spacing: 2px; padding: 1rem; background: var(--light); border-radius: 0.5rem; margin-bottom: 1rem;">
                        ${code}
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text); opacity: 0.8;">
                        <strong>⚠️ Importante:</strong> Guarda este código en un lugar seguro. No se mostrará nuevamente.
                    </p>
                    <p style="font-size: 0.875rem; color: var(--text); opacity: 0.8; margin-top: 0.5rem;">
                        Puedes usar este código para restablecer tu contraseña si la olvidas.
                    </p>
                </div>
            `;

                showModal(content, { title: 'Código de Recuperación Generado', width: '500px' });

                // Update status in view
                await this.initSecuritySection();
            } catch (error) {
                console.error('Error al generar código de recuperación:', error);
                showNotification('Error al generar código: ' + error.message, 'error');
            }
        });
    },

    async enableSQLiteMode() {
        showConfirm('¿Estás seguro de activar el motor SQLite? Esto requiere que el servidor backend esté corriendo (Puerto 3000).', async () => {
            try {
                const response = await fetch(`${window.API_CONFIG.BASE_URL}/api/status`);
                if (!response.ok) throw new Error('Servidor no disponible');

                localStorage.setItem('DB_MODE', 'sqlite');
                showNotification('Motor SQLite activado. La aplicación se reiniciará.', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (e) {
                showNotification('Error: El servidor backend no responde. ¿Ejecutaste el programa con este nuevo código?', 'error');
            }
        });
    },

    async initSQLiteInfo() {
        const infoDiv = document.getElementById('sqliteInfo');
        const ipText = document.getElementById('serverIPInfo');
        if (!infoDiv || !ipText) return;

        if (window.db && window.db.mode === 'sqlite') {
            infoDiv.style.display = 'block';
            try {
                const status = await fetch(`${window.API_CONFIG.BASE_URL}/api/status`).then(r => r.json());
                ipText.innerHTML = `URL para Celular: http://${status.ip}:${status.port}`;
            } catch (e) {
                ipText.innerHTML = 'Error al obtener IP del servidor';
            }
        }
    },

    showSQLiteMigrationModal() {
        const content = `
            <div style="text-align: center; padding: 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">💾 ➡️ 🗄️</div>
                <h3>Paso Final: Inyectar Datos en SQLite</h3>
                <p style="margin-bottom: 1.5rem; color: var(--secondary);">Selecciona el archivo <strong>.json</strong> que exportaste en el Paso 1.</p>
                
                <div class="form-group" style="text-align: left;">
                    <label>Archivo de Migración (.json)</label>
                    <input type="file" id="migrationFile" class="form-control" accept=".json">
                </div>
                
                <div style="background: #fef2f2; color: #991b1b; padding: 1rem; border-radius: 0.5rem; font-size: 0.85rem; margin-top: 1rem; border: 1px solid #fee2e2;">
                    <strong>Atención:</strong> Esto reemplazará cualquier dato que exista en la nueva base de datos SQLite.
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="SettingsView.processSQLiteMigration()">Comenzar Migración</button>
        `;

        showModal(content, { title: 'Importar en Motor SQLite', footer, width: '500px' });
    },

    async processSQLiteMigration() {
        const fileInput = document.getElementById('migrationFile');
        const file = fileInput?.files[0];

        if (!file) {
            showNotification('Selecciona el archivo exportado', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);

                showNotification('Migrando datos, por favor espera...', 'info');

                const response = await fetch(`${window.API_CONFIG.BASE_URL}/api/migration/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jsonData)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('🚀 Migración existosa! Los datos ya están en SQLite.', 'success');
                    closeModal();

                    setTimeout(() => {
                        showConfirm('La migración terminó. ¿Deseas reiniciar el sistema para usar SQLite?', () => {
                            location.reload();
                        });
                    }, 1000);
                } else {
                    throw new Error(result.error || 'Error desconocido');
                }
            } catch (error) {
                console.error('Error en migración:', error);
                showNotification('Error: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }
};
