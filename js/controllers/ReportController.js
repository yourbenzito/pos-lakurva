class ReportController {
    static getSaleFiscalDetails(sale) {
        const total = parseFloat(sale.total) || 0;
        const documentType = sale.documentType || 'boleta';

        // Neto e IVA según ley Chile y tipo de documento
        const fiscal = Sale.computeFiscalFromTotal(total, documentType);

        let costGross = 0;
        let costNet = 0;
        (sale.items || []).forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const unitCost = parseFloat(item.costAtSale) || 0;
            costGross += qty * unitCost;
            costNet += Math.round((qty * unitCost) / 1.19);
        });

        return {
            total,
            neto: fiscal.base_amount,
            iva: fiscal.tax_amount,
            costGross,
            costNet
        };
    }

    static async getDailySales(date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const sales = await Sale.getByDateRange(startOfDay, endOfDay) || [];
        const returns = await SaleReturn.getByDateRange(startOfDay, endOfDay) || [];
        const totalReturned = Array.isArray(returns) ? returns.reduce((sum, r) => sum + (parseFloat(r.totalReturned) || 0), 0) : 0;

        let totalAmount = 0;
        let totalNeto = 0;
        let ivaDebito = 0;
        let totalCostGross = 0;
        let totalCostNet = 0;

        sales.forEach(sale => {
            const details = this.getSaleFiscalDetails(sale);
            totalAmount += details.total;
            totalNeto += details.neto;
            ivaDebito += details.iva;
            totalCostGross += details.costGross;
            totalCostNet += details.costNet;
        });

        // Ajustar totales con devoluciones (proporcionalmente al IVA)
        totalAmount -= totalReturned;
        const returnedNeto = Math.round(totalReturned / 1.19);
        const returnedIVA = totalReturned - returnedNeto;

        // Nota: Asumimos que las devoluciones restan IVA siempre que sea posible o son de boletas
        totalNeto -= returnedNeto;
        ivaDebito -= returnedIVA;

        const pocketProfit = totalAmount - totalCostGross;
        const realProfit = totalNeto - totalCostNet;

        // IVA Crédito (Compras tipo Factura en el periodo)
        const sessionPurchases = await Purchase.getByDateRange(startOfDay, endOfDay);
        const ivaCredito = sessionPurchases
            .filter(p => p.documentType === 'factura')
            .reduce((sum, p) => sum + (parseFloat(p.ivaAmount) || 0), 0);

        return {
            date: date,
            totalSales: sales.length,
            totalAmount: totalAmount,
            totalReturned: totalReturned,
            sales: sales,
            ivaDebito: ivaDebito,
            ivaCredito: ivaCredito,
            pocketProfit: pocketProfit,
            realProfit: realProfit,
            totalCostGross: totalCostGross,
            totalCostNet: totalCostNet
        };
    }

    static async getWeeklySales(weekStart = new Date()) {
        const start = new Date(weekStart);
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const sales = await Sale.getByDateRange(start, end);
        const returns = await SaleReturn.getByDateRange(start, end);
        const totalReturned = returns.reduce((sum, r) => sum + (parseFloat(r.totalReturned) || 0), 0);

        let totalAmount = 0;
        let totalNeto = 0;
        let ivaDebito = 0;
        let totalCostGross = 0;
        let totalCostNet = 0;

        sales.forEach(sale => {
            const details = this.getSaleFiscalDetails(sale);
            totalAmount += details.total;
            totalNeto += details.neto;
            ivaDebito += details.iva;
            totalCostGross += details.costGross;
            totalCostNet += details.costNet;
        });

        totalAmount -= totalReturned;
        const returnedNeto = Math.round(totalReturned / 1.19);
        const returnedIVA = totalReturned - returnedNeto;
        totalNeto -= returnedNeto;
        ivaDebito -= returnedIVA;

        const pocketProfit = totalAmount - totalCostGross;
        const realProfit = totalNeto - totalCostNet;

        // IVA Crédito (Compras semana)
        const weekPurchases = await Purchase.getByDateRange(start, end);
        const ivaCredito = weekPurchases
            .filter(p => p.documentType === 'factura')
            .reduce((sum, p) => sum + (parseFloat(p.ivaAmount) || 0), 0);

        return {
            startDate: start,
            endDate: end,
            totalSales: sales.length,
            totalAmount: totalAmount,
            totalReturned: totalReturned,
            sales: sales,
            ivaDebito: ivaDebito,
            ivaCredito: ivaCredito,
            pocketProfit,
            realProfit,
            totalCostGross,
            totalCostNet
        };
    }

    static async getMonthlySales(year, month) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const sales = await Sale.getByDateRange(start, end);
        const returns = await SaleReturn.getByDateRange(start, end);
        const totalReturned = returns.reduce((sum, r) => sum + (parseFloat(r.totalReturned) || 0), 0);

        let totalAmount = 0;
        let totalNeto = 0;
        let ivaDebito = 0;
        let totalCostGross = 0;
        let totalCostNet = 0;

        sales.forEach(sale => {
            const details = this.getSaleFiscalDetails(sale);
            totalAmount += details.total;
            totalNeto += details.neto;
            ivaDebito += details.iva;
            totalCostGross += details.costGross;
            totalCostNet += details.costNet;
        });

        totalAmount -= totalReturned;
        const returnedNeto = Math.round(totalReturned / 1.19);
        const returnedIVA = totalReturned - returnedNeto;
        totalNeto -= returnedNeto;
        ivaDebito -= returnedIVA;

        const pocketProfit = totalAmount - totalCostGross;
        const realProfit = totalNeto - totalCostNet;

        // IVA Crédito (Compras mes)
        const monthPurchases = await Purchase.getByDateRange(start, end);
        const ivaCredito = monthPurchases
            .filter(p => p.documentType === 'factura')
            .reduce((sum, p) => sum + (parseFloat(p.ivaAmount) || 0), 0);

        // Consumo y Pérdidas del mes
        const movements = await StockMovement.getByDateRange(start, end);
        const products = await Product.getAll();
        const productsMap = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

        const monthlyConsumption = movements
            .filter(m => m.type === 'consumption')
            .reduce((sum, m) => {
                const product = productsMap[m.productId];
                const val = parseFloat(m.cost_value) || (product ? (Math.abs(m.quantity) * (parseFloat(product.cost) || 0)) : 0);
                return sum + val;
            }, 0);

        const monthlyLoss = movements
            .filter(m => m.type === 'loss')
            .reduce((sum, m) => {
                const product = productsMap[m.productId];
                const val = parseFloat(m.cost_value) || (product ? (Math.abs(m.quantity) * (parseFloat(product.cost) || 0)) : 0);
                return sum + val;
            }, 0);

        return {
            year,
            month,
            totalSales: sales.length,
            totalAmount: totalAmount,
            totalReturned: totalReturned,
            sales: sales,
            purchases: monthPurchases,
            ivaDebito: ivaDebito,
            ivaCredito: ivaCredito,
            pocketProfit,
            realProfit,
            totalCostGross,
            totalCostNet,
            monthlyConsumption: monthlyConsumption,
            monthlyLoss: monthlyLoss
        };
    }

    static async getSalesByProduct(startDate, endDate) {
        const sales = await Sale.getByDateRange(startDate, endDate);
        const returns = await SaleReturn.getByDateRange(startDate, endDate);

        const productStats = {};

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const pid = item.productId;
                if (!productStats[pid]) {
                    productStats[pid] = {
                        name: item.name,
                        quantity: 0,
                        total: 0
                    };
                }
                productStats[pid].quantity += parseFloat(item.quantity) || 0;
                productStats[pid].total += parseFloat(item.total) || 0;
            });
        });

        returns.forEach(ret => {
            (ret.items || []).forEach(item => {
                const pid = item.productId;
                if (productStats[pid]) {
                    productStats[pid].quantity -= parseFloat(item.quantity) || 0;
                    productStats[pid].total -= parseFloat(item.total) || 0;
                }
            });
        });

        return Object.entries(productStats)
            .filter(([id, stats]) => stats.quantity > 0 || stats.total > 0)
            .map(([id, stats]) => ({ productId: id, ...stats }))
            .sort((a, b) => b.total - a.total);
    }

    static async getProfitability(startDate, endDate) {
        const sales = await Sale.getByDateRange(startDate, endDate);

        // FIX A5: Los pagos de clientes (abonos a deuda) NO son ingresos adicionales.
        // Ingreso (revenue) se reconoce al momento de la venta, no cuando el cliente paga.
        // Los pagos son flujo de caja, no ingreso. Se informan aparte para contexto.
        const allPayments = await Payment.getAll();
        const paymentsInRange = allPayments.filter(p => {
            const paymentDate = new Date(p.date);
            return paymentDate >= new Date(startDate) && paymentDate <= new Date(endDate);
        });
        const totalPayments = paymentsInRange.reduce((sum, p) => sum + p.amount, 0);

        // Revenue = solo ventas del período (base devengado, no base caja)
        let totalRevenue = 0;
        let totalCostOfSales = 0;
        const productStats = {};
        const categoryStats = {};

        // Optimizacion: Cargar todos los productos una vez (Mapa en memoria) para evitar N+1 queries
        const allProducts = await Product.getAll();
        const productMap = {};
        for (const p of allProducts) {
            productMap[p.id] = p;
        }

        for (const sale of sales) {
            const isBoleta = (sale.documentType || 'boleta') === 'boleta';
            const saleNeto = Math.round(sale.total / 1.19);
            const saleRevenue = isBoleta ? saleNeto : sale.total;

            totalRevenue += saleRevenue;

            for (const item of sale.items) {
                // Costo Neto Real (el usuario usa IVA Crédito)
                let itemCostGross;
                if (item.costAtSale !== undefined && item.costAtSale !== null) {
                    itemCostGross = parseFloat(item.costAtSale) * item.quantity;
                } else {
                    const product = productMap[item.productId];
                    itemCostGross = product ? (parseFloat(product.cost) || 0) * item.quantity : 0;
                }

                const itemCostNet = Math.round(itemCostGross / 1.19);

                // Ingreso por ítem proporcional al tipo de documento de la venta
                const itemTotal = parseFloat(item.total) || 0;
                const itemRevenue = isBoleta ? Math.round(itemTotal / 1.19) : itemTotal;
                const itemProfit = itemRevenue - itemCostNet;

                totalCostOfSales += itemCostNet;

                // Por producto
                const productId = item.productId;
                if (!productStats[productId]) {
                    const product = productMap[productId];
                    productStats[productId] = {
                        name: product ? product.name : (item.name || 'Producto eliminado'),
                        category: product ? (product.category || 'General') : 'General',
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        quantity: 0
                    };
                }
                productStats[productId].revenue += itemRevenue;
                productStats[productId].cost += itemCostNet;
                productStats[productId].profit += itemProfit;
                productStats[productId].quantity += item.quantity;

                // Por categoría
                const category = productStats[productId].category;
                if (!categoryStats[category]) {
                    categoryStats[category] = {
                        name: category,
                        revenue: 0,
                        cost: 0,
                        profit: 0
                    };
                }
                categoryStats[category].revenue += itemRevenue;
                categoryStats[category].cost += itemCostNet;
                categoryStats[category].profit += itemProfit;
            }
        }

        // FIX A5: NO sumar pagos a totalRevenue. Pagos = flujo de caja, no ingreso.
        // totalRevenue ya contiene el total de todas las ventas del período.

        // C5: Descontar devoluciones del período de revenue y costo
        let totalReturnedRevenue = 0;
        let totalReturnedCost = 0;
        try {
            const returns = await SaleReturn.getByDateRange(startDate, endDate);
            for (const ret of returns) {
                for (const item of (ret.items || [])) {
                    const itemRevenue = parseFloat(item.total) || 0;
                    totalReturnedRevenue += itemRevenue;

                    // Costo de lo devuelto: usar costAtSale si existe, fallback a costo actual
                    let itemCost;
                    if (item.costAtSale !== undefined && item.costAtSale !== null) {
                        itemCost = parseFloat(item.costAtSale) * (parseFloat(item.quantity) || 0);
                    } else {
                        const product = productMap[item.productId];
                        itemCost = product ? (parseFloat(product.cost) || 0) * (parseFloat(item.quantity) || 0) : 0;
                    }
                    totalReturnedCost += itemCost;

                    // Descontar de productStats y categoryStats si el producto está registrado
                    const pid = item.productId;
                    if (productStats[pid]) {
                        productStats[pid].revenue -= itemRevenue;
                        productStats[pid].cost -= itemCost;
                        productStats[pid].profit -= (itemRevenue - itemCost);
                        productStats[pid].quantity -= (parseFloat(item.quantity) || 0);
                    }
                    if (productStats[pid]) {
                        const cat = productStats[pid].category;
                        if (categoryStats[cat]) {
                            categoryStats[cat].revenue -= itemRevenue;
                            categoryStats[cat].cost -= itemCost;
                            categoryStats[cat].profit -= (itemRevenue - itemCost);
                        }
                    }
                }
            }
        } catch (returnError) {
            console.warn('ReportController: Error al calcular devoluciones para rentabilidad (ignorado):', returnError);
        }

        totalRevenue -= totalReturnedRevenue;
        totalCostOfSales -= totalReturnedCost;

        // Get operational expenses in the date range
        const expenses = await Expense.getByDateRange(startDate, endDate);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Ganancia bruta = Ingresos - Costo de ventas
        // Ganancia neta = Ganancia bruta - Gastos operacionales
        const grossProfit = totalRevenue - totalCostOfSales;
        const netProfit = grossProfit - totalExpenses;
        const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // Calcular márgenes para productos y categorías
        Object.values(productStats).forEach(p => {
            p.margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
        });

        Object.values(categoryStats).forEach(c => {
            c.margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
        });

        return {
            revenue: totalRevenue,
            costOfSales: totalCostOfSales,
            grossProfit: grossProfit,
            operationalExpenses: totalExpenses,
            profit: netProfit,
            margin: margin,
            grossMargin: grossMargin,
            // FIX A5: Incluir pagos como dato informativo (flujo de caja), NO como ingreso
            cashFlowFromPayments: totalPayments,
            // C5: Total devuelto en el período (informativo)
            totalReturns: totalReturnedRevenue,
            byProduct: Object.values(productStats).sort((a, b) => b.profit - a.profit),
            byCategory: Object.values(categoryStats).sort((a, b) => b.profit - a.profit)
        };
    }

    static async getStockReport() {
        const products = await Product.getAll();

        const lowStock = products.filter(p => p.stock <= p.minStock);
        const outOfStock = products.filter(p => p.stock === 0);

        const totalValue = products.reduce((sum, p) => {
            const stock = parseFloat(p.stock) || 0;
            const cost = parseFloat(p.cost) || 0;
            return sum + (stock > 0 && cost > 0 ? stock * cost : 0);
        }, 0);

        return {
            totalProducts: products.length,
            lowStock: lowStock,
            outOfStock: outOfStock,
            totalValue: totalValue,
            products: products
        };
    }

    static async updateSalePayment(saleId, newMethod) {
        return await Sale.updatePaymentMethod(saleId, newMethod);
    }

    static async getStagnantProducts(days = 14) {
        const products = await Product.getAll();
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - parseInt(days));

        const stagnantList = products.filter(p => {
            if ((parseFloat(p.stock) || 0) <= 0) return false;

            // Si nunca se ha vendido, comparar con fecha de creación
            if (!p.lastSoldAt) {
                const created = new Date(p.createdAt);
                return created < threshold;
            }

            const lastSold = new Date(p.lastSoldAt);
            return lastSold < threshold;
        }).map(p => {
            const currentStock = parseFloat(p.stock) || 0;
            const daysInactive = p.lastSoldAt
                ? Math.floor((new Date() - new Date(p.lastSoldAt)) / (1000 * 60 * 60 * 24))
                : Math.floor((new Date() - new Date(p.createdAt)) / (1000 * 60 * 60 * 24));

            return {
                id: p.id,
                name: p.name,
                stock: currentStock,
                price: p.price,
                cost: p.cost,
                lastSoldAt: p.lastSoldAt,
                daysInactive: daysInactive,
                costValue: currentStock * (parseFloat(p.cost) || 0)
            };
        });

        // Ordenar por días de inactividad (más estancados primero)
        return stagnantList.sort((a, b) => b.daysInactive - a.daysInactive);
    }

    /**
     * Notebook Feature: Alerta de Costos Manuales
     * Analiza el historial de auditoría para encontrar cambios manuales en el costo
     * que no provienen de una compra (PPP), para detectar errores o robos.
     */
    static async getCostAlerts() {
        const logs = await AuditLogService.getByEntity('product');
        const alerts = logs.filter(l =>
            l.action === 'update' &&
            l.metadata &&
            l.metadata.changedFields &&
            l.metadata.changedFields.includes('cost')
        ).map(l => ({
            id: l.id,
            productId: l.entityId,
            date: l.timestamp,
            summary: l.summary,
            userId: l.userId,
            username: l.username || 'Sistema',
            metadata: l.metadata
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        // Enriquecer con nombres de productos si faltan (para logs antiguos)
        try {
            const products = await Product.getAllIncludingDeleted();
            const pMap = new Map(products.map(p => [String(p.id), p.name]));

            alerts.forEach(a => {
                if (a.metadata && !a.metadata.productName) {
                    a.metadata.productName = pMap.get(String(a.productId)) || null;
                }
            });
        } catch (e) {
            console.warn('Error enriqueciendo nombres de productos en alertas:', e);
        }

        return alerts;
    }
}
