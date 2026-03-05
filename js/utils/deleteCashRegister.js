/**
 * Script para eliminar la caja #17
 * Ejecutar en la consola del navegador: await deleteCashRegister_17()
 */

async function deleteCashRegister_17() {
    try {
        console.log('🔍 Verificando caja #17...');
        
        // Verificar que CashRegister esté disponible
        if (typeof CashRegister === 'undefined') {
            throw new Error('CashRegister no está disponible. Asegúrate de que el modelo esté cargado.');
        }
        
        // Obtener la caja #17
        const cashRegister = await CashRegister.getById(17);
        
        if (!cashRegister) {
            console.log('❌ No se encontró la caja #17');
            return {
                success: false,
                message: 'Caja #17 no encontrada'
            };
        }
        
        console.log('📋 Información de la caja #17:');
        console.log('  - Estado:', cashRegister.status);
        console.log('  - Fecha de apertura:', formatDateTime(cashRegister.openDate));
        console.log('  - Fecha de cierre:', cashRegister.closeDate ? formatDateTime(cashRegister.closeDate) : 'No cerrada');
        console.log('  - Monto inicial:', formatCLP(cashRegister.initialAmount));
        console.log('  - Datos completos:', cashRegister);
        
        // Verificar si está abierta
        if (cashRegister.status === 'open') {
            throw new Error('No se puede eliminar una caja abierta. Debes cerrarla primero.');
        }
        
        // Confirmar eliminación
        const confirmMessage = `¿Estás seguro de eliminar la caja #17?\n\n` +
            `Fecha de apertura: ${formatDateTime(cashRegister.openDate)}\n` +
            `Fecha de cierre: ${cashRegister.closeDate ? formatDateTime(cashRegister.closeDate) : 'No cerrada'}\n` +
            `Estado: ${cashRegister.status === 'open' ? 'Abierta' : 'Cerrada'}\n\n` +
            `⚠️ Esta acción NO se puede deshacer.`;
        
        return await new Promise((resolve) => {
            confirm(confirmMessage, async () => {
                try {
                    console.log('🗑️ Eliminando caja #17...');
                    
                    // Eliminar la caja
                    await CashRegister.delete(17);
        
        console.log('✅ Caja #17 eliminada exitosamente');
        
        // Verificar que se eliminó
        const verifyRegister = await CashRegister.getById(17);
        if (verifyRegister) {
            throw new Error('La caja aún existe después de intentar eliminarla');
        }
        
        console.log('✅ Verificación: La caja #17 ya no existe en la base de datos');
        
        if (typeof showNotification !== 'undefined') {
            showNotification('Caja #17 eliminada exitosamente', 'success');
        }
        
                    resolve({
                        success: true,
                        message: 'Caja #17 eliminada exitosamente'
                    });
                } catch (err) {
                    console.error('❌ Error al eliminar caja #17:', err);
                    if (typeof showNotification !== 'undefined') showNotification('Error: ' + err.message, 'error');
                    resolve({ success: false, message: err.message });
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error al eliminar caja #17:', error);
        console.error('❌ Stack trace:', error.stack);
        
        if (typeof showNotification !== 'undefined') {
            showNotification('Error al eliminar caja: ' + error.message, 'error');
        }
        
        throw error;
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.deleteCashRegister_17 = deleteCashRegister_17;
    
    window.addEventListener('load', () => {
        console.log('💡 Para eliminar la caja #17, ejecuta en la consola:');
        console.log('   await deleteCashRegister_17()');
    });
}
