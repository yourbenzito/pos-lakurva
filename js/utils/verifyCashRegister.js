/**
 * Script para verificar si el registro de caja del 27 de enero de 2026 existe
 * Ejecutar en la consola: await verifyCashRegister_27Jan2026()
 */

async function verifyCashRegister_27Jan2026() {
    try {
        console.log('🔍 Verificando registro de caja del 27 de enero de 2026...');
        
        if (typeof CashRegister === 'undefined') {
            throw new Error('CashRegister no está disponible');
        }
        
        const allRegisters = await CashRegister.getAll();
        console.log(`📊 Total de registros de caja: ${allRegisters.length}`);
        
        // Buscar registro del 27 de enero de 2026
        const targetDate = new Date('2026-01-27');
        const registersOnDate = allRegisters.filter(r => {
            const registerDate = new Date(r.openDate);
            return registerDate.getFullYear() === 2026 && 
                   registerDate.getMonth() === 0 && 
                   registerDate.getDate() === 27;
        });
        
        console.log(`📅 Registros encontrados para el 27 de enero de 2026: ${registersOnDate.length}`);
        
        if (registersOnDate.length > 0) {
            registersOnDate.forEach((reg, index) => {
                console.log(`\n📋 Registro #${index + 1}:`);
                console.log('  ID:', reg.id);
                console.log('  Fecha de apertura:', formatDateTime(reg.openDate));
                console.log('  Fecha de cierre:', reg.closeDate ? formatDateTime(reg.closeDate) : 'No cerrada');
                console.log('  Estado:', reg.status);
                console.log('  Monto inicial:', formatCLP(reg.initialAmount));
                console.log('  Monto final:', reg.finalAmount ? formatCLP(reg.finalAmount) : 'N/A');
                console.log('  Efectivo:', formatCLP(reg.paymentSummary?.cash || 0));
                console.log('  Tarjetas:', formatCLP(reg.paymentSummary?.card || 0));
                console.log('  Total:', formatCLP((reg.paymentSummary?.cash || 0) + (reg.paymentSummary?.card || 0)));
                console.log('  Datos completos:', reg);
            });
            
            return {
                found: true,
                count: registersOnDate.length,
                registers: registersOnDate
            };
        } else {
            console.log('❌ No se encontró ningún registro para el 27 de enero de 2026');
            console.log('\n📋 Últimos 5 registros:');
            allRegisters.slice(0, 5).forEach((reg, index) => {
                const regDate = new Date(reg.openDate);
                console.log(`  ${index + 1}. ID: ${reg.id} - ${formatDateTime(reg.openDate)} - Estado: ${reg.status}`);
            });
            
            return {
                found: false,
                count: 0,
                totalRegisters: allRegisters.length
            };
        }
        
    } catch (error) {
        console.error('❌ Error al verificar:', error);
        throw error;
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.verifyCashRegister_27Jan2026 = verifyCashRegister_27Jan2026;
    
    window.addEventListener('load', () => {
        console.log('💡 Para verificar el registro del 27 de enero de 2026, ejecuta:');
        console.log('   await verifyCashRegister_27Jan2026()');
    });
}
