/**
 * Script para modificar la caja #6 con valores específicos
 * Ejecutar en la consola del navegador: await updateCashRegister6()
 * 
 * Valores a establecer:
 * - Monto inicial: 24900
 * - Monto final: 160600
 * - Diferencia: 0 (sin diferencia)
 * - Tarjeta: 137000
 */

async function updateCashRegister6() {
    try {
        console.log('🔍 Verificando caja #6...');
        
        // Verificar que CashRegister esté disponible
        if (typeof CashRegister === 'undefined') {
            throw new Error('CashRegister no está disponible. Asegúrate de que el modelo esté cargado.');
        }
        
        // Obtener la caja #6
        const cashRegister = await CashRegister.getById(6);
        
        if (!cashRegister) {
            throw new Error('Caja #6 no encontrada');
        }
        
        // Funciones auxiliares para formateo (si no existen globalmente)
        const formatCLPHelper = (typeof window !== 'undefined' && typeof window.formatCLP !== 'undefined') 
            ? window.formatCLP 
            : (amount) => {
                return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
            };
        
        const formatDateTimeHelper = (typeof window !== 'undefined' && typeof window.formatDateTime !== 'undefined')
            ? window.formatDateTime
            : (dateString) => {
                if (!dateString) return 'N/A';
                const date = new Date(dateString);
                return date.toLocaleString('es-CL');
            };
        
        console.log('📋 Información actual de la caja #6:');
        console.log('  - Estado:', cashRegister.status);
        console.log('  - Fecha de apertura:', formatDateTimeHelper(cashRegister.openDate));
        console.log('  - Fecha de cierre:', cashRegister.closeDate ? formatDateTimeHelper(cashRegister.closeDate) : 'No cerrada');
        console.log('  - Monto inicial actual:', formatCLPHelper(cashRegister.initialAmount));
        console.log('  - Monto final actual:', cashRegister.finalAmount ? formatCLPHelper(cashRegister.finalAmount) : 'N/A');
        console.log('  - Diferencia actual:', cashRegister.difference ? formatCLPHelper(cashRegister.difference) : 'N/A');
        console.log('  - Resumen de pagos actual:', cashRegister.paymentSummary);
        
        // Valores a establecer (tal cual solicitados)
        const newInitialAmount = 24900;  // Efectivo esperado inicial
        const newFinalAmount = 160600;    // Efectivo esperado final
        const newCardAmount = 137000;     // Tarjeta
        const newExpectedAmount = newFinalAmount; // Efectivo esperado = monto final
        const newDifference = 0;           // Sin diferencia
        
        // NO calcular efectivo recibido - usar el monto final directamente
        const cashReceived = newFinalAmount; // 160600 (monto final, sin restar)
        
        // Nuevo resumen de pagos
        const newPaymentSummary = {
            cash: cashReceived,    // 160600 (monto final, sin restar)
            card: newCardAmount,   // 137000
            qr: 0,
            other: 0
        };
        
        console.log('\n📊 Nuevos valores a establecer:');
        console.log('  - Monto inicial (efectivo esperado inicial):', formatCLPHelper(newInitialAmount));
        console.log('  - Monto final (efectivo esperado final):', formatCLPHelper(newFinalAmount));
        console.log('  - Efectivo esperado:', formatCLPHelper(newExpectedAmount));
        console.log('  - Diferencia:', formatCLPHelper(newDifference));
        console.log('  - Efectivo recibido (en paymentSummary):', formatCLPHelper(cashReceived));
        console.log('  - Tarjeta:', formatCLPHelper(newCardAmount));
        console.log('  - Resumen de pagos:', newPaymentSummary);
        
        // Confirmar actualización
        const confirmMessage = `¿Estás seguro de actualizar la caja #6 con estos valores?\n\n` +
            `Monto inicial: ${formatCLPHelper(newInitialAmount)}\n` +
            `Monto final: ${formatCLPHelper(newFinalAmount)}\n` +
            `Tarjeta: ${formatCLPHelper(newCardAmount)}\n` +
            `Diferencia: ${formatCLPHelper(newDifference)}\n\n` +
            `⚠️ Esta acción modificará permanentemente el registro.`;
        
        return await new Promise((resolve) => {
            confirm(confirmMessage, async () => {
                try {
                    console.log('\n💾 Actualizando caja #6...');
                    
                    // Crear objeto actualizado (valores exactos solicitados)
                    const updatedCashRegister = {
            ...cashRegister,
            initialAmount: newInitialAmount,      // 24900
            finalAmount: newFinalAmount,          // 160600
            expectedAmount: newExpectedAmount,    // 160600 (igual al monto final)
            difference: newDifference,            // 0 (sin diferencia)
            paymentSummary: newPaymentSummary     // { cash: 135700, card: 137000, qr: 0, other: 0 }
        };
        
        // Actualizar usando replace (ya que el registro existe)
        await CashRegister._repository.replace(updatedCashRegister);
        
        console.log('✅ Caja #6 actualizada exitosamente');
        
        // Verificar que se actualizó correctamente
        const verifyRegister = await CashRegister.getById(6);
        if (!verifyRegister) {
            throw new Error('La caja no se encontró después de actualizar');
        }
        
        console.log('\n✅ Verificación - Datos actualizados:');
        console.log('  - Monto inicial:', formatCLPHelper(verifyRegister.initialAmount));
        console.log('  - Monto final:', formatCLPHelper(verifyRegister.finalAmount));
        console.log('  - Efectivo esperado:', formatCLPHelper(verifyRegister.expectedAmount));
        console.log('  - Diferencia:', formatCLPHelper(verifyRegister.difference));
        console.log('  - Efectivo:', formatCLPHelper(verifyRegister.paymentSummary?.cash || 0));
        console.log('  - Tarjeta:', formatCLPHelper(verifyRegister.paymentSummary?.card || 0));
        console.log('  - Resumen completo:', verifyRegister.paymentSummary);
        
        if (typeof showNotification !== 'undefined') {
            showNotification('Caja #6 actualizada exitosamente', 'success');
        }
        
                    resolve({
                        success: true,
                        message: 'Caja #6 actualizada exitosamente',
                        register: verifyRegister
                    });
                } catch (err) {
                    console.error('❌ Error al actualizar caja #6:', err);
                    if (typeof showNotification !== 'undefined') showNotification('Error: ' + err.message, 'error');
                    resolve({ success: false, message: err.message });
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error al actualizar caja #6:', error);
        console.error('❌ Stack trace:', error.stack);
        
        if (typeof showNotification !== 'undefined') {
            showNotification('Error al actualizar caja: ' + error.message, 'error');
        }
        
        throw error;
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.updateCashRegister6 = updateCashRegister6;
    
    window.addEventListener('load', () => {
        console.log('💡 Para actualizar la caja #6, ejecuta en la consola:');
        console.log('   await updateCashRegister6()');
    });
}
