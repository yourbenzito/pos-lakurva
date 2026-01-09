class ReportController {
    static async getDailySales(date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const sales = await Sale.getByDateRange(startOfDay, endOfDay);
        
        return {
            date: date,
            totalSales: sales.length,
            totalAmount: sales.reduce((sum, s) => sum + s.total, 0),
            sales: sales
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
        
        return {
            startDate: start,
            endDate: end,
            totalSales: sales.length,
            totalAmount: sales.reduce((sum, s) => sum + s.total, 0),
            sales: sales
        };
    }

    static async getMonthlySales(year, month) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        
        const sales = await Sale.getByDateRange(start, end);
        
        return {
            year,
            month,
            totalSales: sales.length,
            totalAmount: sales.reduce((sum, s) => sum + s.total, 0),
            sales: sales
        };
    }

    static async getSalesByProduct(startDate, endDate) {
        const sales = await Sale.getByDateRange(startDate, endDate);
        
        const productStats = {};
        
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = {
                        name: item.name,
                        quantity: 0,
                        total: 0
                    };
                }
                productStats[item.productId].quantity += item.quantity;
                productStats[item.productId].total += item.total;
            });
        });
        
        return Object.entries(productStats)
            .map(([id, stats]) => ({ productId: id, ...stats }))
            .sort((a, b) => b.total - a.total);
    }

    static async getProfitability(startDate, endDate) {
        const sales = await Sale.getByDateRange(startDate, endDate);
        
        let totalRevenue = 0;
        let totalCost = 0;
        const productStats = {};
        const categoryStats = {};
        
        for (const sale of sales) {
            totalRevenue += sale.total;
            
            for (const item of sale.items) {
                const product = await Product.getById(item.productId);
                if (product) {
                    const itemCost = product.cost * item.quantity;
                    const itemRevenue = item.total;
                    const itemProfit = itemRevenue - itemCost;
                    
                    totalCost += itemCost;
                    
                    // Por producto
                    if (!productStats[product.id]) {
                        productStats[product.id] = {
                            name: product.name,
                            category: product.category || 'General',
                            revenue: 0,
                            cost: 0,
                            profit: 0,
                            quantity: 0
                        };
                    }
                    productStats[product.id].revenue += itemRevenue;
                    productStats[product.id].cost += itemCost;
                    productStats[product.id].profit += itemProfit;
                    productStats[product.id].quantity += item.quantity;
                    
                    // Por categoría
                    const category = product.category || 'General';
                    if (!categoryStats[category]) {
                        categoryStats[category] = {
                            name: category,
                            revenue: 0,
                            cost: 0,
                            profit: 0
                        };
                    }
                    categoryStats[category].revenue += itemRevenue;
                    categoryStats[category].cost += itemCost;
                    categoryStats[category].profit += itemProfit;
                }
            }
        }
        
        const profit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        
        // Calcular márgenes para productos y categorías
        Object.values(productStats).forEach(p => {
            p.margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
        });
        
        Object.values(categoryStats).forEach(c => {
            c.margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
        });
        
        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: profit,
            margin: margin,
            byProduct: Object.values(productStats).sort((a, b) => b.profit - a.profit),
            byCategory: Object.values(categoryStats).sort((a, b) => b.profit - a.profit)
        };
    }

    static async getStockReport() {
        const products = await Product.getAll();
        
        const lowStock = products.filter(p => p.stock <= p.minStock);
        const outOfStock = products.filter(p => p.stock === 0);
        
        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
        
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
}
