class CashController {
    static async openCash(initialAmount, denominations = null) {
        if (!initialAmount || initialAmount < 0) {
            throw new Error('Monto inicial inválido');
        }
        
        try {
            const id = await CashRegister.open(initialAmount, denominations);
            showNotification('Caja abierta correctamente', 'success');
            return id;
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }

    static async closeCash(id, finalAmount) {
        if (finalAmount < 0) {
            throw new Error('Monto final inválido');
        }
        
        try {
            await CashRegister.close(id, finalAmount);
            
            const summary = await this.getCashSummary(id);
            
            if (summary.difference !== 0) {
                const msg = summary.difference > 0 ? 'Sobrante' : 'Faltante';
                showNotification(`${msg}: ${formatCLP(Math.abs(summary.difference))}`, 'warning');
            } else {
                showNotification('Caja cerrada correctamente', 'success');
            }
            
            return summary;
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }

    static async getOpenCash() {
        return await CashRegister.getOpen();
    }

    static async getCashSummary(id) {
        return await CashRegister.getSummary(id);
    }

    static async getCashHistory() {
        return await CashRegister.getAll();
    }

    static async checkCashStatus() {
        const openCash = await this.getOpenCash();
        return openCash !== null;
    }

    static async getDailySales(cashRegisterId) {
        // Fetch all sales for this register
        const allSales = await Sale.getByCashRegister(cashRegisterId);
        
        // Group by date (DD/MM/YYYY)
        const salesByDate = {};
        
        allSales.forEach(sale => {
            const dateKey = new Date(sale.date).toLocaleDateString('es-CL');
            
            if (!salesByDate[dateKey]) {
                salesByDate[dateKey] = {
                    date: dateKey,
                    count: 0,
                    total: 0,
                    paymentMethods: { cash: 0, card: 0, qr: 0, other: 0 }
                };
            }
            
            salesByDate[dateKey].count++;
            salesByDate[dateKey].total += sale.total;
            
            if (sale.paymentDetails) {
                // Mixed payments
                for (const [method, amount] of Object.entries(sale.paymentDetails)) {
                    if (salesByDate[dateKey].paymentMethods[method] !== undefined) {
                        salesByDate[dateKey].paymentMethods[method] += parseFloat(amount);
                    }
                }
            } else {
                // Single payment
                const method = sale.paymentMethod || 'cash';
                if (salesByDate[dateKey].paymentMethods[method] !== undefined) {
                    salesByDate[dateKey].paymentMethods[method] += sale.total;
                }
            }
        });
        
        // Convert to array and sort (newest first)
        return Object.values(salesByDate).sort((a, b) => {
            // Parse DD/MM/YYYY back to comparison
            const [da, ma, ya] = a.date.split('/');
            const [db, mb, yb] = b.date.split('/');
            return new Date(`${yb}-${mb}-${db}`) - new Date(`${ya}-${ma}-${da}`);
        });
    }
}
