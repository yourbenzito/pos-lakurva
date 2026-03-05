/**
 * Customer Account Service
 * Handles atomic write operations for customer accounts (deposits, debt payments).
 * Ensures consistency between Customer credit balance, Payment records, and Sales.
 */
class CustomerAccountService {
    /**
     * ATOMIC: Register a credit deposit (dinero a favor) for a customer.
     * Updates Customer.balanceCredit and creates a CustomerCreditDeposit record in ONE transaction.
     */
    static async registerCreditDeposit(customerId, amount, paymentMethod, cashRegisterId, notes = '') {
        if (!customerId || amount <= 0) throw new Error('Datos de depósito inválidos');

        // Prepare data
        const date = new Date().toISOString();
        const deposit = {
            customerId,
            amount,
            paymentMethod,
            cashRegisterId,
            date,
            notes: notes || `Depósito de dinero a favor`
        };

        if (db.mode === 'sqlite') {
            const result = await ApiClient.post('complex/credit-deposit', { deposit });
            if (!result.success) throw new Error(result.error || 'Error en depósito SQLite');
            return;
        }

        // Transaction
        return await new Promise((resolve, reject) => {
            const tx = db.db.transaction(['customers', 'customerCreditDeposits'], 'readwrite');
            tx.onerror = () => reject(new Error('Error en transacción de depósito: ' + tx.error?.message));
            tx.onabort = () => reject(new Error('Transacción de depósito abortada'));
            tx.oncomplete = () => resolve();

            const customerStore = tx.objectStore('customers');
            const depositStore = tx.objectStore('customerCreditDeposits');

            // 1. Get customer
            const getReq = customerStore.get(customerId);
            getReq.onsuccess = () => {
                const customer = getReq.result;
                if (!customer) { tx.abort(); return; }

                // 2. Update credit balance
                const currentCredit = parseFloat(customer.balanceCredit) || 0;
                const newCredit = currentCredit + amount;
                customerStore.put({
                    ...customer,
                    balanceCredit: newCredit,
                    updatedAt: date
                });

                // 3. Create deposit record (for cash register)
                depositStore.add(deposit);
            };
        });
    }

    /**
     * ATOMIC: Register a debt payment (abono) to multiple sales for a customer.
     * Distributes the amount among pending sales and updates both Payment and Sale records atomically.
     */
    static async registerAccountPayment(customerId, amount, paymentMethod, cashRegisterId, notes = '') {
        if (!customerId || amount <= 0) throw new Error('Datos de pago inválidos');

        // 1. Get pending sales (read-only outside transaction)
        const balance = await AccountService.getCustomerBalance(customerId);
        if (!balance.pendingSales || balance.pendingSales.length === 0) {
            throw new Error('El cliente no tiene deudas pendientes');
        }

        const totalToPay = Math.min(amount, balance.totalDebt);
        let remainingToPay = totalToPay;
        const paymentsToCreate = [];

        for (const saleSummary of balance.pendingSales) {
            if (remainingToPay <= 0) break;
            const appliedAmount = Math.min(saleSummary.remaining, remainingToPay);

            paymentsToCreate.push({
                saleId: saleSummary.saleId,
                customerId,
                amount: appliedAmount,
                paymentMethod,
                cashRegisterId,
                date: new Date().toISOString(),
                notes: notes || 'Abono a cuenta'
            });

            remainingToPay -= appliedAmount;
        }

        if (db.mode === 'sqlite') {
            const result = await ApiClient.post('complex/account-payment', { paymentsToCreate });
            if (!result.success) throw new Error(result.error || 'Error en abono SQLite');
            return { totalPaid: totalToPay };
        }

        // 2. Execute atomic transaction (IndexedDB)
        return await new Promise((resolve, reject) => {
            const tx = db.db.transaction(['sales', 'payments'], 'readwrite');
            tx.onerror = () => reject(new Error('Error en transacción de abono: ' + tx.error?.message));
            tx.onabort = () => reject(new Error('Transacción de abono abortada'));
            tx.oncomplete = () => resolve({ totalPaid: totalToPay });

            const saleStore = tx.objectStore('sales');
            const paymentStore = tx.objectStore('payments');

            // Process each payment/sale update
            for (const p of paymentsToCreate) {
                // Add payment record
                paymentStore.add(p);

                // Update sale record
                const saleReq = saleStore.get(p.saleId);
                saleReq.onsuccess = () => {
                    const sale = saleReq.result;
                    if (!sale) return;

                    const newPaidAmount = (parseFloat(sale.paidAmount) || 0) + p.amount;
                    const isFullyPaid = newPaidAmount >= (parseFloat(sale.total) || 0);

                    saleStore.put({
                        ...sale,
                        paidAmount: newPaidAmount,
                        status: isFullyPaid ? 'completed' : 'partial',
                        updatedAt: new Date().toISOString()
                    });
                };
            }
        });
    }
}
