/**
 * Script para crear registro histórico de caja del 27 de enero de 2026
 * Ejecutar en la consola del navegador: await createHistoricalCashRegister_27Jan2026()
 */

async function createHistoricalCashRegister_27Jan2026() {
    try {
        console.log('🔍 Verificando dependencias...');
        
        // Verificar que CashRegister esté disponible
        if (typeof CashRegister === 'undefined') {
            throw new Error('CashRegister no está disponible. Asegúrate de que el modelo esté cargado.');
        }
        console.log('✅ CashRegister disponible');
        
        // Verificar que el método createHistorical exista
        if (typeof CashRegister.createHistorical !== 'function') {
            throw new Error('El método createHistorical no está disponible en CashRegister');
        }
        console.log('✅ Método createHistorical disponible');
        
        // Verificar si ya existe un registro para esa fecha
        console.log('🔍 Verificando registros existentes...');
        const allRegisters = await CashRegister.getAll();
        console.log(`📊 Total de registros encontrados: ${allRegisters.length}`);
        
        const existingRegister = allRegisters.find(r => {
            const registerDate = new Date(r.openDate);
            return registerDate.getFullYear() === 2026 && 
                   registerDate.getMonth() === 0 && 
                   registerDate.getDate() === 27;
        });
        
        if (existingRegister) {
            console.warn('⚠️ Ya existe un registro de caja para el 27 de enero de 2026');
            console.log('📋 ID existente:', existingRegister.id);
            console.log('📋 Datos existentes:', existingRegister);
            const confirmed = window.confirm('Ya existe un registro para esa fecha. ¿Deseas crear uno nuevo de todas formas?');
            if (!confirmed) {
                return { success: false, message: 'Operación cancelada', existingId: existingRegister.id };
            }
        }
        
        console.log('🔧 Creando registro histórico de caja para el 27 de enero de 2026...');
        
        // Fecha de apertura: 27 de enero de 2026 a las 08:00:00 (hora típica de apertura)
        const openDate = new Date('2026-01-27T08:00:00').toISOString();
        console.log('📅 Fecha de apertura:', openDate);
        
        // Fecha de cierre: 27 de enero de 2026 a las 22:00:00 (hora típica de cierre)
        const closeDate = new Date('2026-01-27T22:00:00').toISOString();
        console.log('📅 Fecha de cierre:', closeDate);
        
        // Montos proporcionados
        const cashAmount = 160900; // Efectivo
        const cardAmount = 137000; // Tarjetas
        
        // Asumimos monto inicial de 0 (puedes ajustarlo si conoces el monto inicial)
        const initialAmount = 0;
        
        // El monto final en efectivo sería el inicial + efectivo recibido
        // (asumiendo que no hubo gastos en efectivo ese día)
        const finalAmount = initialAmount + cashAmount;
        
        // Resumen de pagos
        const paymentSummary = {
            cash: cashAmount,
            card: cardAmount,
            qr: 0,
            other: 0
        };
        
        console.log('📊 Datos del registro:');
        console.log('  - Monto inicial:', initialAmount);
        console.log('  - Monto final:', finalAmount);
        console.log('  - Resumen de pagos:', paymentSummary);
        
        // Crear el registro histórico
        console.log('💾 Guardando en base de datos...');
        
        let cashRegisterId;
        
        // Intentar usar el método createHistorical si existe
        if (typeof CashRegister.createHistorical === 'function') {
            cashRegisterId = await CashRegister.createHistorical({
                openDate: openDate,
                closeDate: closeDate,
                initialAmount: initialAmount,
                finalAmount: finalAmount,
                paymentSummary: paymentSummary
            });
        } else {
            // Método alternativo: crear directamente usando el repositorio
            console.log('⚠️ Método createHistorical no disponible, usando método alternativo...');
            
            // Calculate expected cash
            const expectedCash = initialAmount + (paymentSummary.cash || 0);
            const difference = finalAmount - expectedCash;
            
            const cashRegister = {
                openDate: openDate,
                closeDate: closeDate,
                initialAmount: parseFloat(initialAmount) || 0,
                finalAmount: parseFloat(finalAmount),
                expectedAmount: expectedCash,
                difference: difference,
                status: 'closed',
                userId: 1,
                denominations: null,
                paymentSummary: {
                    cash: parseFloat(paymentSummary.cash) || 0,
                    card: parseFloat(paymentSummary.card) || 0,
                    qr: parseFloat(paymentSummary.qr) || 0,
                    other: parseFloat(paymentSummary.other) || 0
                }
            };
            
            // Usar el repositorio directamente
            cashRegisterId = await CashRegister._repository.create(cashRegister);
        }
        
        console.log('✅ Registro histórico creado exitosamente!');
        console.log(`📋 ID de Caja: ${cashRegisterId}`);
        
        // Verificar que se creó correctamente
        const createdRegister = await CashRegister.getById(cashRegisterId);
        if (!createdRegister) {
            throw new Error('El registro se creó pero no se pudo recuperar de la base de datos');
        }
        
        console.log('✅ Registro verificado en base de datos');
        console.log('📋 Datos del registro creado:', createdRegister);
        console.log(`📅 Fecha: 27 de enero de 2026`);
        console.log(`💵 Efectivo: ${typeof formatCLP !== 'undefined' ? formatCLP(cashAmount) : '$' + cashAmount.toLocaleString('es-CL')}`);
        console.log(`💳 Tarjetas: ${typeof formatCLP !== 'undefined' ? formatCLP(cardAmount) : '$' + cardAmount.toLocaleString('es-CL')}`);
        console.log(`💰 Total: ${typeof formatCLP !== 'undefined' ? formatCLP(cashAmount + cardAmount) : '$' + (cashAmount + cardAmount).toLocaleString('es-CL')}`);
        console.log(`📊 Monto Final en Caja: ${typeof formatCLP !== 'undefined' ? formatCLP(finalAmount) : '$' + finalAmount.toLocaleString('es-CL')}`);
        
        if (typeof showNotification !== 'undefined') {
            showNotification('Registro histórico de caja creado exitosamente para el 27 de enero de 2026', 'success');
        }
        
        return {
            success: true,
            cashRegisterId: cashRegisterId,
            date: '2026-01-27',
            cash: cashAmount,
            card: cardAmount,
            total: cashAmount + cardAmount,
            finalAmount: finalAmount,
            register: createdRegister
        };
        
    } catch (error) {
        console.error('❌ Error al crear registro histórico:', error);
        console.error('❌ Stack trace:', error.stack);
        if (typeof showNotification !== 'undefined') {
            showNotification('Error al crear registro histórico: ' + error.message, 'error');
        }
        throw error;
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.createHistoricalCashRegister_27Jan2026 = createHistoricalCashRegister_27Jan2026;
    
    window.addEventListener('load', async () => {
        console.log('📋 Script de registro histórico cargado.');
        console.log('💡 Para crear el registro del 27 de enero de 2026, ejecuta en la consola:');
        console.log('   await createHistoricalCashRegister_27Jan2026()');
        
        // Verificar si ya existe el registro después de que todo esté cargado
        setTimeout(async () => {
            if (typeof CashRegister !== 'undefined' && typeof CashRegister.getAll === 'function') {
                try {
                    const allRegisters = await CashRegister.getAll();
                    const exists = allRegisters.some(r => {
                        const registerDate = new Date(r.openDate);
                        return registerDate.getFullYear() === 2026 && 
                               registerDate.getMonth() === 0 && 
                               registerDate.getDate() === 27;
                    });
                    
                    if (!exists) {
                        console.log('💡 No se encontró registro para el 27 de enero de 2026.');
                        console.log('💡 Ejecuta: await createHistoricalCashRegister_27Jan2026()');
                    } else {
                        console.log('✅ Ya existe un registro para el 27 de enero de 2026.');
                    }
                } catch (e) {
                    console.log('💡 Ejecuta: await createHistoricalCashRegister_27Jan2026()');
                }
            }
        }, 3000);
    });
}
