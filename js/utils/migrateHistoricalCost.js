/**
 * Migration Script: Add historical cost (costAtSale) to existing sales
 * 
 * This script migrates existing sales to include costAtSale in each item.
 * For items without costAtSale, it uses the current product cost as an approximation.
 * 
 * IMPORTANT: This is a one-time migration. Run it once after updating the code.
 * 
 * Usage: Call migrateSalesHistoricalCost() from browser console or app initialization
 */

class HistoricalCostMigration {
    /**
     * Migrate all sales to include costAtSale in items
     * @returns {Promise<Object>} Migration results
     */
    static async migrateSalesHistoricalCost() {
        console.log('🔄 Iniciando migración de costo histórico en ventas...');
        
        const allSales = await Sale.getAll();
        let migrated = 0;
        let skipped = 0;
        let errors = 0;
        const errorDetails = [];
        
        for (const sale of allSales) {
            try {
                let needsUpdate = false;
                const updatedItems = sale.items.map(item => {
                    // Check if item already has costAtSale
                    if (item.costAtSale !== undefined && item.costAtSale !== null) {
                        return item; // Already migrated
                    }
                    
                    // Item needs migration
                    needsUpdate = true;
                    
                    // Try to get current product cost as approximation
                    // Note: This is an approximation - the actual historical cost may differ
                    // but it's the best we can do for existing sales
                    return {
                        ...item,
                        costAtSale: 0 // Will be updated below
                    };
                });
                
                if (needsUpdate) {
                    // Fetch product costs for items that need migration
                    const itemsWithCost = await Promise.all(updatedItems.map(async (item) => {
                        if (item.costAtSale === 0 && item.productId) {
                            try {
                                const product = await Product.getById(item.productId);
                                if (product) {
                                    return {
                                        ...item,
                                        costAtSale: parseFloat(product.cost) || 0
                                    };
                                }
                            } catch (error) {
                                console.warn(`Error fetching product ${item.productId} for sale ${sale.id}:`, error);
                            }
                        }
                        return item;
                    }));
                    
                    // Update sale with items that have costAtSale
                    const updatedSale = {
                        ...sale,
                        items: itemsWithCost
                    };
                    
                    await Sale.updateSale(sale.id, { items: itemsWithCost });
                    migrated++;
                    
                    if (migrated % 10 === 0) {
                        console.log(`  Migradas ${migrated} ventas...`);
                    }
                } else {
                    skipped++;
                }
            } catch (error) {
                errors++;
                errorDetails.push({
                    saleId: sale.id,
                    saleNumber: sale.saleNumber,
                    error: error.message
                });
                console.error(`Error migrando venta ${sale.id}:`, error);
            }
        }
        
        const result = {
            total: allSales.length,
            migrated: migrated,
            skipped: skipped,
            errors: errors,
            errorDetails: errorDetails
        };
        
        console.log('✅ Migración completada:', result);
        return result;
    }
    
    /**
     * Check migration status
     * @returns {Promise<Object>} Status report
     */
    static async checkMigrationStatus() {
        const allSales = await Sale.getAll();
        let needsMigration = 0;
        let alreadyMigrated = 0;
        
        for (const sale of allSales) {
            const hasAllCosts = sale.items.every(item => 
                item.costAtSale !== undefined && item.costAtSale !== null
            );
            
            if (hasAllCosts) {
                alreadyMigrated++;
            } else {
                needsMigration++;
            }
        }
        
        return {
            total: allSales.length,
            needsMigration: needsMigration,
            alreadyMigrated: alreadyMigrated,
            percentageMigrated: allSales.length > 0 
                ? ((alreadyMigrated / allSales.length) * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
    window.HistoricalCostMigration = HistoricalCostMigration;
}
