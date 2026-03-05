/**
 * Deja la cuenta del cliente "Brankito" en 0: marca todas sus ventas pendientes/parciales como pagadas.
 * Se ejecuta una sola vez al cargar la app (flag en localStorage).
 */
async function zeroBrankitoAccount() {
    const KEY = 'brankito_account_zerod';
    if (localStorage.getItem(KEY)) return;

    try {
        const customers = await Customer.getAll();
        const brankito = customers.find(c => (c.name || '').toLowerCase().includes('brankito'));
        if (!brankito) return;

        const balance = await Customer.getAccountBalance(brankito.id);
        if (!balance.pendingSales || balance.pendingSales.length === 0) {
            localStorage.setItem(KEY, '1');
            return;
        }

        for (const sale of balance.pendingSales) {
            const total = parseFloat(sale.total) || 0;
            const paid = parseFloat(sale.paid) || 0;
            if (total > 0 && paid < total - 0.01) {
                await Sale.updateSale(sale.saleId, { paidAmount: total, status: 'completed' });
            }
        }

        localStorage.setItem(KEY, '1');
        if (typeof showNotification === 'function') {
            showNotification('Cuenta de Brankito dejada en 0', 'success');
        }
    } catch (e) {
        console.warn('zeroBrankitoAccount:', e);
    }
}

window.zeroBrankitoAccount = zeroBrankitoAccount;
