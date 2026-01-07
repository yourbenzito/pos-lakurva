class BackupManager {
    static async exportAllData() {
        try {
            const data = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                products: await db.getAll('products'),
                categories: await db.getAll('categories'),
                sales: await db.getAll('sales'),
                customers: await db.getAll('customers'),
                suppliers: await db.getAll('suppliers'),
                purchases: await db.getAll('purchases'),
                cashRegisters: await db.getAll('cashRegisters'),
                stockMovements: await db.getAll('stockMovements'),
                settings: await db.getAll('settings')
            };
            
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pos-backup-${formatDate(new Date())}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showNotification('Backup creado exitosamente', 'success');
        } catch (error) {
            console.error('Error creating backup:', error);
            showNotification('Error al crear backup: ' + error.message, 'error');
        }
    }
    
    static async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            const confirmImport = await new Promise(resolve => {
                confirm(
                    '¿Deseas importar estos datos? Esto puede sobrescribir datos existentes.',
                    () => resolve(true)
                );
                setTimeout(() => resolve(false), 100);
            });
            
            if (!confirmImport) return;
            
            const stores = ['products', 'categories', 'sales', 'customers', 
                          'suppliers', 'purchases', 'cashRegisters', 'stockMovements', 'settings'];
            
            for (const store of stores) {
                if (data[store] && Array.isArray(data[store])) {
                    for (const item of data[store]) {
                        await db.put(store, item);
                    }
                }
            }
            
            showNotification('Datos importados exitosamente', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error('Error importing data:', error);
            showNotification('Error al importar datos: ' + error.message, 'error');
        }
    }
    
    static async clearAllData() {
        const confirmClear = await new Promise(resolve => {
            confirm(
                '⚠️ ADVERTENCIA: Esto eliminará TODOS los datos (Productos, Ventas, Clientes, Usuarios, etc.).\nEsta acción NO se puede deshacer.\n\n¿Estás realmente seguro de borrar todo?',
                () => resolve(true)
            );
            setTimeout(() => resolve(false), 100);
        });
        
        if (!confirmClear) return;
        
        try {
            // Delete databases
            // First clear all object stores
            const stores = ['products', 'categories', 'sales', 'customers', 
                          'suppliers', 'purchases', 'cashRegisters', 'stockMovements', 
                          'settings', 'users', 'payments'];
            
            for (const store of stores) {
                try {
                    await db.clear(store);
                } catch (e) {
                    console.warn(`Could not clear store ${store}:`, e);
                }
            }

            // Nuke IndexedDB database completely to be sure
            const req = indexedDB.deleteDatabase('POSMinimarket');
            req.onsuccess = () => {
                console.log("Database deleted successfully");
            };
            req.onerror = () => {
                console.log("Couldn't delete database");
            };
            req.onblocked = () => {
                console.log("Couldn't delete database due to the operation being blocked");
            };
            
            // Clear session storage to logout
            sessionStorage.clear();
            localStorage.clear();
            
            showNotification('Todos los datos han sido eliminados. Reiniciando sistema...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Error clearing data:', error);
            showNotification('Error al limpiar datos: ' + error.message, 'error');
        }
    }
    
    static async exportToCSV(storeName, filename) {
        try {
            const data = await db.getAll(storeName);
            
            if (data.length === 0) {
                showNotification('No hay datos para exportar', 'warning');
                return;
            }
            
            const headers = Object.keys(data[0]);
            const csvRows = [
                headers.join(','),
                ...data.map(row => 
                    headers.map(header => {
                        const value = row[header];
                        if (value === null || value === undefined) return '';
                        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }).join(',')
                )
            ];
            
            const csv = csvRows.join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${formatDate(new Date())}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            showNotification('CSV exportado exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            showNotification('Error al exportar CSV: ' + error.message, 'error');
        }
    }
    
    static getStorageInfo() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                const used = (estimate.usage / 1024 / 1024).toFixed(2);
                const quota = (estimate.quota / 1024 / 1024).toFixed(2);
                const percent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
                
                console.log(`Almacenamiento usado: ${used} MB de ${quota} MB (${percent}%)`);
                return { used, quota, percent };
            });
        }
    }
}
