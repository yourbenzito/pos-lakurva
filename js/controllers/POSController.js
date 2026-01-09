class POSController {
    constructor() {
        this.cart = [];
        this.currentCustomer = null;
        this.currentCashRegister = null;
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
                total: total
            });
        }
        
        return this.getCartSummary();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        return this.getCartSummary();
    }

    updateCartItem(productId, quantity, customPrice = null) {
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
        const subtotal = this.cart.reduce((sum, item) => sum + item.total, 0);
        return {
            items: this.cart,
            itemCount: this.cart.length,
            totalItems: this.cart.reduce((sum, item) => sum + item.quantity, 0),
            subtotal: subtotal,
            total: roundPrice(subtotal)
        };
    }

    clearCart() {
        this.cart = [];
        this.currentCustomer = null;
        return this.getCartSummary();
    }

    setCustomer(customer) {
        this.currentCustomer = customer;
    }

    async completeSale(paymentMethod, isPending = false, paymentDetails = null) {
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
        
        let paidAmount = isPending ? 0 : summary.total;
        
        // If mixed payment, calculate paid amount from details
        if (paymentDetails) {
            paidAmount = Object.values(paymentDetails).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        }
        
        const saleData = {
            customerId: this.currentCustomer ? this.currentCustomer.id : null,
            items: this.cart,
            subtotal: summary.subtotal,
            total: summary.total,
            paymentMethod: paymentMethod,
            paymentDetails: paymentDetails,
            cashRegisterId: this.currentCashRegister.id,
            status: isPending ? 'pending' : 'completed',
            paidAmount: paidAmount
        };
        
        const saleId = await Sale.create(saleData);
        const sale = await Sale.getById(saleId);
        
        // Si hay un pago parcial, crear registro de pago para que se refleje en la caja
        if (paidAmount > 0 && paymentDetails) {
            // Crear registros de pago para cada método de pago usado
            for (const [method, amount] of Object.entries(paymentDetails)) {
                if (amount > 0 && this.currentCustomer) {
                    await Payment.create({
                        saleId: saleId,
                        customerId: this.currentCustomer.id,
                        amount: parseFloat(amount),
                        paymentMethod: method,
                        notes: `Pago parcial de venta #${sale.saleNumber}`
                    });
                }
            }
        }
        
        // Limpiar carrito después de crear la venta
        this.clearCart();
        
        // Mensaje de confirmación
        const message = isPending 
            ? `Venta #${sale.saleNumber} anotada. Deuda: ${formatCLP(sale.total - paidAmount)}` 
            : `Venta #${sale.saleNumber} completada`;
        showNotification(message, 'success');
        
        return sale;
    }

    async validateStock(productId, quantity) {
        const product = await Product.getById(productId);
        if (!product) return false;
        
        if (product.type === 'unit' && product.stock < quantity) {
            return false;
        }
        
        return true;
    }
}

const posController = new POSController();
