class POSController {
    constructor() {
        this.cart = [];
        this.currentCustomer = null;
        this.currentCashRegister = null;
        this.discountAmount = 0;
        this.creditBalanceToUse = 0;
        this.heldSales = []; // To storepaused sales
    }

    holdSale(name = '') {
        if (this.cart.length === 0) {
            throw new Error('No hay productos en el carrito para poner en espera');
        }

        const heldSale = {
            id: Date.now(),
            cart: [...this.cart],
            customer: this.currentCustomer ? { ...this.currentCustomer } : null,
            discountAmount: this.discountAmount,
            creditBalanceToUse: this.creditBalanceToUse, // Added this line
            timestamp: new Date(),
            name: name || `Venta ${new Date().toLocaleTimeString()}`
        };

        this.heldSales.push(heldSale);
        this.clearCart();
        return heldSale;
    }

    /**
     * Delegates to Sale.computeFiscalFromTotal which properly handles documentType.
     * @param {number} total 
     * @param {string} documentType - 'boleta' or 'sin_boleta'
     */
    computeFiscalFromTotal(total, documentType = 'boleta') {
        return Sale.computeFiscalFromTotal(total, documentType);
    }

    resumeSale(heldSaleId) {
        const index = this.heldSales.findIndex(s => s.id === heldSaleId);
        if (index === -1) throw new Error('Venta en espera no encontrada');

        const held = this.heldSales[index];

        // If current cart is not empty, we should probably warn or swap, 
        // but for simplicity we'll just Load it (replacing if empty or merge)
        // Let's replace the current cart with the held one.
        this.cart = [...held.cart];
        this.currentCustomer = held.customer ? { ...held.customer } : null;
        this.discountAmount = held.discountAmount;
        this.creditBalanceToUse = held.creditBalanceToUse || 0; // Restore it

        // Remove from held list
        this.heldSales.splice(index, 1);

        return this.getCartSummary();
    }

    deleteHeldSale(heldSaleId) {
        this.heldSales = this.heldSales.filter(s => s.id !== heldSaleId);
    }

    async init() {
        this.currentCashRegister = await CashRegister.getOpen();
        return this.currentCashRegister !== null;
    }

    async searchProduct(term) {
        let product = await Product.getByBarcode(term);

        if (!product) {
            const results = await Product.search(term);
            if (results.length === 1) {
                product = results[0];
            } else if (results.length > 1) {
                return { multiple: true, products: results };
            }
        }

        return product ? { product } : { notFound: true };
    }

    addToCart(product, quantity = 1, customPrice = null) {
        this._idempotencyKeyForCurrentSale = null;
        const existingItem = this.cart.find(item => item.productId === product.id);

        let unitPrice = customPrice || product.price;

        if (product.type === 'weight') {
            unitPrice = roundPrice(quantity * product.price);
        }

        if (existingItem) {
            existingItem.quantity += quantity;
            if (product.type === 'weight') {
                existingItem.total = roundPrice(existingItem.quantity * product.price);
            } else {
                existingItem.total = existingItem.quantity * existingItem.unitPrice;
            }
        } else {
            const total = product.type === 'weight'
                ? unitPrice
                : quantity * unitPrice;

            this.cart.push({
                productId: product.id,
                name: product.name,
                type: product.type,
                quantity: quantity,
                unitPrice: product.type === 'weight' ? product.price : unitPrice,
                cost: product.cost || 0,
                total: total
            });
        }

        return this.getCartSummary();
    }

    calculateSubtotal() {
        return this.cart.reduce((sum, item) => sum + item.total, 0);
    }

    setDiscount(amount) {
        this._idempotencyKeyForCurrentSale = null;
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
            this.discountAmount = 0;
            return this.getCartSummary();
        }

        const subtotal = this.calculateSubtotal();
        this.discountAmount = Math.min(amount, subtotal);
        return this.getCartSummary();
    }

    clearDiscount() {
        this._idempotencyKeyForCurrentSale = null;
        this.discountAmount = 0;
        return this.getCartSummary();
    }

    setCreditBalance(amount) {
        this._idempotencyKeyForCurrentSale = null;
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
            this.creditBalanceToUse = 0;
            return this.getCartSummary();
        }

        const subtotal = this.calculateSubtotal();
        const discountTotal = Math.max(0, subtotal - this.discountAmount);
        this.creditBalanceToUse = Math.min(amount, discountTotal);
        return this.getCartSummary();
    }

    clearCreditBalance() {
        this._idempotencyKeyForCurrentSale = null;
        this.creditBalanceToUse = 0;
        return this.getCartSummary();
    }

    removeFromCart(productId) {
        this._idempotencyKeyForCurrentSale = null;
        this.cart = this.cart.filter(item => item.productId !== productId);
        return this.getCartSummary();
    }

    updateCartItem(productId, quantity, customPrice = null) {
        this._idempotencyKeyForCurrentSale = null;
        const item = this.cart.find(i => i.productId === productId);
        if (item) {
            if (customPrice !== null) {
                item.unitPrice = parseFloat(customPrice);
            }

            item.quantity = quantity;
            if (item.type === 'weight') {
                item.total = roundPrice(item.quantity * item.unitPrice);
            } else {
                item.total = roundPrice(item.quantity * item.unitPrice);
            }
        }
        return this.getCartSummary();
    }

    getCartSummary() {
        const subtotal = this.calculateSubtotal();
        const discount = roundPrice(Math.min(this.discountAmount, subtotal));
        const afterDiscount = Math.max(0, subtotal - discount);
        const creditBalanceUsed = roundPrice(Math.min(this.creditBalanceToUse, afterDiscount));

        return {
            items: this.cart,
            itemCount: this.cart.length,
            totalItems: this.cart.reduce((sum, item) => sum + item.quantity, 0),
            subtotal: subtotal,
            discount: discount,
            creditBalanceUsed: creditBalanceUsed,
            total: roundPrice(Math.max(0, afterDiscount - creditBalanceUsed)),
            actualTotalSale: roundPrice(afterDiscount) // El total legal de la venta antes de usar dinero a favor
        };
    }

    clearCart(keepCustomer = false) {
        this.cart = [];
        this.discountAmount = 0;
        this.creditBalanceToUse = 0;
        this._idempotencyKeyForCurrentSale = null;
        // Don't clear customer if keepCustomer is true (for consecutive credit sales)
        if (!keepCustomer) {
            this.currentCustomer = null;
        }
        return this.getCartSummary();
    }

    setCustomer(customer) {
        this.currentCustomer = customer;
    }

    async completeSale(paymentMethod, isPending = false, paymentDetails = null, documentType = 'boleta') {
        if (this.cart.length === 0) {
            throw new Error('El carrito está vacío');
        }

        if (!this.currentCashRegister) {
            throw new Error('No hay caja abierta');
        }

        if (isPending && !this.currentCustomer) {
            throw new Error('Debes seleccionar un cliente para ventas anotadas');
        }

        const summary = this.getCartSummary();

        for (const item of this.cart) {
            const check = await this.validateStock(item.productId, item.quantity);
            if (!check.valid) throw new Error(check.error);
        }

        // Si se usó dinero a favor, sumarlo a los detalles de pago
        if (summary.creditBalanceUsed > 0) {
            paymentDetails = paymentDetails || {};
            // Si el método ya era creditBalance (porque se pagó 100% con eso), asegurar el monto
            if (paymentDetails.creditBalance === undefined) {
                paymentDetails.creditBalance = summary.creditBalanceUsed;
            } else {
                paymentDetails.creditBalance = Math.max(paymentDetails.creditBalance, summary.creditBalanceUsed);
            }
        }

        let paidAmount = isPending ? 0 : summary.total;

        // If mixed payment, calculate paid amount from details (including creditBalance)
        if (paymentDetails) {
            const sumDetails = Object.values(paymentDetails).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            paidAmount = isPending ? sumDetails : Math.min(sumDetails, summary.actualTotalSale);
        }

        // Dinero a favor: validar que el cliente tenga saldo suficiente y descontar después de crear la venta
        const creditBalanceUsed = paymentDetails && (paymentDetails.creditBalance != null) ? parseFloat(paymentDetails.creditBalance) || 0 : 0;
        if (creditBalanceUsed > 0) {
            if (!this.currentCustomer) throw new Error('Debes seleccionar un cliente para usar dinero a favor');
            const customer = await Customer.getById(this.currentCustomer.id);
            const currentCredit = (customer && customer.balanceCredit != null) ? parseFloat(customer.balanceCredit) || 0 : 0;
            if (currentCredit < creditBalanceUsed) throw new Error(`El cliente tiene ${formatCLP(currentCredit)} a favor; no alcanza para ${formatCLP(creditBalanceUsed)}`);
        }

        // CRITICAL FIX: Add historical cost to each item before creating sale
        const itemsWithHistoricalCost = await Promise.all(this.cart.map(async (item) => {
            const product = await Product.getById(item.productId);
            return {
                ...item,
                costAtSale: product ? (parseFloat(product.cost) || 0) : 0 // Store historical cost
            };
        }));

        // Redondear totales por ítem a la decena para que la suma coincida con el total mostrado
        const itemsWithRoundedTotals = itemsWithHistoricalCost.map((item) => ({
            ...item,
            total: roundPrice(parseFloat(item.total) || 0)
        }));
        const sumRounded = itemsWithRoundedTotals.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
        if (itemsWithRoundedTotals.length > 0 && Math.abs(sumRounded - summary.actualTotalSale) > 0.01) {
            const restSum = itemsWithRoundedTotals.slice(1).reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
            itemsWithRoundedTotals[0].total = Math.max(0, summary.actualTotalSale - restSum);
        }

        const saleData = {
            customerId: this.currentCustomer ? this.currentCustomer.id : null,
            items: itemsWithRoundedTotals,
            subtotal: summary.subtotal,
            total: summary.actualTotalSale,
            discount: summary.discount,
            ...this.computeFiscalFromTotal(summary.actualTotalSale, documentType),
            paymentMethod: paymentMethod,
            paymentDetails: paymentDetails,
            cashRegisterId: this.currentCashRegister.id,
            status: isPending ? (paidAmount > 0 ? 'partial' : 'pending') : 'completed',
            paidAmount: paidAmount,
            documentType: documentType || 'boleta',
            transferName: paymentDetails ? paymentDetails.transferName : null,
            transferBank: paymentDetails ? paymentDetails.transferBank : null
        };

        if (!this._idempotencyKeyForCurrentSale) {
            this._idempotencyKeyForCurrentSale = 'idem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 14);
        }
        saleData.idempotencyKey = this._idempotencyKeyForCurrentSale;

        const customerId = this.currentCustomer ? this.currentCustomer.id : null;

        const createResult = await Sale.create(saleData);
        const saleId = (typeof createResult === 'object' && createResult && createResult.saleId !== undefined)
            ? createResult.saleId
            : createResult;

        const fromIdempotency = (typeof createResult === 'object' && createResult && createResult.fromIdempotency === true);
        if (fromIdempotency) {
            const sale = await Sale.getById(saleId);
            this.clearCart(false);
            showNotification('Venta ya registrada (evitado duplicado).', 'success');
            return sale;
        }

        // Descontar dinero a favor del cliente
        if (creditBalanceUsed > 0 && customerId) {
            const customer = await Customer.getById(customerId);
            const currentCredit = (customer && customer.balanceCredit != null) ? parseFloat(customer.balanceCredit) || 0 : 0;
            const newCredit = Math.max(0, currentCredit - creditBalanceUsed);
            await Customer.update(customerId, { balanceCredit: newCredit });
        }

        let sale = await Sale.getById(saleId);

        // Registrar uso de saldo a favor para historial en cuenta del cliente
        if (creditBalanceUsed > 0 && customerId && sale) {
            await CustomerCreditUse.create({
                customerId,
                amount: creditBalanceUsed,
                saleId: sale.id,
                saleNumber: sale.saleNumber
            });
        }

        if (!sale) {
            throw new Error('Error: La venta no se pudo crear correctamente');
        }

        if (isPending && sale.customerId !== customerId) {
            sale.customerId = customerId;
            await db.put('sales', sale);
        }

        this.clearCart(false);
        this._idempotencyKeyForCurrentSale = null;

        const remainingDebt = Math.max(0, (sale.total || 0) - (sale.paidAmount || 0));
        const message = isPending
            ? `Venta #${sale.saleNumber} anotada. Deuda: ${formatCLP(remainingDebt)}`
            : `Venta #${sale.saleNumber} completada`;
        showNotification(message, 'success');

        // Notebook Feature: Actualizar fecha de última venta para reporte de rotación lenta
        try {
            const date = new Date().toISOString();
            for (const item of itemsWithRoundedTotals) {
                await Product.updateLastSoldAt(item.productId, date);
            }
        } catch (e) {
            console.warn('No se pudo actualizar lastSoldAt:', e);
        }

        return sale;
    }

    async validateStock(productId, quantity) {
        const product = await Product.getById(productId);
        if (!product) return { valid: false, error: 'Producto no encontrado' };
        const qty = parseFloat(quantity);
        const stock = parseFloat(product.stock) || 0;
        if (isNaN(qty) || qty <= 0) return { valid: false, error: 'Cantidad inválida' };
        if (product.type === 'unit') {
            if (stock < qty) return { valid: false, error: `Stock insuficiente: ${stock} en inventario` };
        } else {
            if (stock < qty) return { valid: false, error: `Stock insuficiente: ${stock} kg en inventario` };
        }
        return { valid: true };
    }
}

const posController = new POSController();
