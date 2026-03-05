/**
 * Account Service
 * Centralizes account balance and debt calculation logic
 */
class AccountService {
    /**
     * Get customer account balance
     * CRITICAL: Debt is ALWAYS calculated dynamically (never stored/overwritten)
     * Formula: SUM(credit sales) - SUM(payments)
     * Equivalent to: SUM(sale.total - sale.paidAmount) for all credit sales with remaining > 0
     * Credit sales = sales with status 'pending' or 'partial' (not 'completed')
     * 
     * @param {number} customerId - Customer ID
     * @returns {Promise<Object>} - { totalDebt: number, pendingSales: Array }
     */
    static async getCustomerBalance(customerId) {
        if (!customerId) {
            return {
                totalDebt: 0,
                pendingSales: [],
                balanceCredit: 0,
                displayBalance: 0
            };
        }

        try {
            // CRITICAL: Get ALL sales for this customer from database (fresh, not cached)
            // Sale.getByCustomer() -> SaleRepository.findByCustomerId() -> db queries
            // This ensures we get the latest sales including any recently updated paidAmount
            const allSales = await Sale.getByCustomer(customerId);

            // Ensure sales is an array
            if (!Array.isArray(allSales)) {
                console.warn('getCustomerBalance: sales is not an array', { customerId, sales: allSales });
                return {
                    totalDebt: 0,
                    pendingSales: [],
                    balanceCredit: 0,
                    displayBalance: 0
                };
            }

            // CRITICAL: Filter credit sales (status='pending' or 'partial')
            // These are the sales that contribute to debt
            // Only sales with remaining debt > 0 count towards total debt
            const creditSales = allSales.filter(sale => {
                // Validate sale exists and has status property
                if (!sale || !sale.hasOwnProperty('status')) {
                    console.warn('Sale missing status property:', sale);
                    return false;
                }

                // Pending and partial sales contribute to debt (not completed/paid)
                return sale.status === 'pending' || sale.status === 'partial';
            });

            // CRITICAL: Calculate debt dynamically as: SUM(credit sales) - SUM(payments)
            // Formula: SUM(sale.total - sale.paidAmount) for each credit sale with remaining > 0
            // This is equivalent to: SUM(credit sales totals) - SUM(all payments applied to those sales)
            // Debt is NEVER stored - always calculated from fresh data
            let totalDebt = 0;
            const details = [];

            for (const sale of creditSales) {
                // Validate sale has required properties
                if (!sale || !sale.id || sale.total === undefined) {
                    console.warn('Invalid sale in credit sales:', sale);
                    continue;
                }

                // Obtener devoluciones hechas a esta venta para no cobrar artículos retornados
                let returnedAmount = 0;
                try {
                    const retSummary = typeof SaleReturnService !== 'undefined' ? await SaleReturnService.getReturnSummary(sale.id) : null;
                    if (retSummary) returnedAmount = parseFloat(retSummary.totalReturned) || 0;
                } catch (e) {
                    console.warn('AccountService: No se pudieron procesar las devoluciones para la deuda', sale.id, e);
                }

                // Calculate remaining debt for this sale (fresh from database)
                const saleTotal = parseFloat(sale.total) || 0;
                const salePaid = parseFloat(sale.paidAmount) || 0; // This includes all payments registered

                // FIX FASE D: Al total original se le descuenta lo que ya fue devuelto y luego los abonos de pago.
                const remaining = (saleTotal - returnedAmount) - salePaid;

                // CRITICAL: Only count sales with actual remaining debt (> 0)
                // This ensures we don't count fully paid or overpaid sales
                if (remaining > 0) {
                    // Accumulate debt (NEVER overwrite)
                    totalDebt += remaining;

                    // Add to details for history
                    details.push({
                        saleId: sale.id,
                        saleNumber: sale.saleNumber || 'N/A',
                        date: sale.date || new Date().toISOString(),
                        total: saleTotal,
                        returned: returnedAmount, // Informativo de cuánto se restó de deuda
                        paid: salePaid, // Fresh paidAmount from database (includes all payments)
                        remaining: remaining, // Fresh calculation
                        items: sale.items || []
                    });
                }
            }

            // CRITICAL: Debt is calculated, never stored
            // Round to 2 decimals to avoid floating point issues
            const calculatedDebt = Math.round(totalDebt * 100) / 100;

            // Dinero a favor del cliente (reduce el saldo a pagar)
            const customer = await Customer.getById(customerId);
            const balanceCredit = (customer && (customer.balanceCredit != null)) ? parseFloat(customer.balanceCredit) || 0 : 0;

            return {
                totalDebt: calculatedDebt,
                pendingSales: details.sort((a, b) => new Date(a.date) - new Date(b.date)),
                balanceCredit: balanceCredit,
                /** Saldo a mostrar: deuda - dinero a favor. Positivo = debe, negativo/cero con crédito = tiene a favor */
                displayBalance: Math.round((calculatedDebt - balanceCredit) * 100) / 100
            };
        } catch (error) {
            console.error('Error calculating account balance:', error, { customerId });
            return {
                totalDebt: 0,
                pendingSales: [],
                balanceCredit: 0,
                displayBalance: 0
            };
        }
    }

    /**
     * Calculate remaining debt for a single sale
     * @param {Object} sale - Sale object
     * @returns {number}
     */
    static calculateSaleRemaining(sale) {
        return PaymentService.calculateRemainingDebt(sale);
    }

    /**
     * Get accounts receivable total (all pending sales)
     * @returns {Promise<number>}
     */
    static async getAccountsReceivable() {
        const pending = await Sale.getPendingSales();
        let totalDebt = 0;

        for (const sale of pending) {
            let returnedAmount = 0;
            try {
                const retSummary = typeof SaleReturnService !== 'undefined' ? await SaleReturnService.getReturnSummary(sale.id) : null;
                if (retSummary) returnedAmount = parseFloat(retSummary.totalReturned) || 0;
            } catch (e) {
                console.warn('AccountService: Error al procesar devoluciones para accounts receivable', sale.id, e);
            }

            const saleTotal = parseFloat(sale.total) || 0;
            const salePaid = parseFloat(sale.paidAmount) || 0;
            const remaining = (saleTotal - returnedAmount) - salePaid;

            if (remaining > 0) {
                totalDebt += remaining;
            }
        }

        return totalDebt;
    }
}
