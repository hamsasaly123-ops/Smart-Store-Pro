/**
 * SmartStore Pro - Purchases Management
 * Stock Replenishment, Supplier Invoices & Cost Tracking
 */

const PurchaseManager = (function() {
    async function getAll() {
        const purchases = await DB.getAll(DB.STORES.PURCHASES);
        return purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async function getById(id) {
        return await DB.getById(DB.STORES.PURCHASES, Number(id));
    }

    async function createPurchase(purchaseData) {
        if (!purchaseData.items || purchaseData.items.length === 0) {
            throw new Error("يجب إضافة أصناف لفاتورة الشراء");
        }

        const total = purchaseData.items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.costPrice)), 0);
        const paidAmount = Number(purchaseData.paidAmount !== undefined ? purchaseData.paidAmount : total);
        const remainingAmount = Math.max(0, total - paidAmount);

        const record = {
            invoiceNo: purchaseData.invoiceNo || `PUR-${Date.now().toString().slice(-6)}`,
            date: purchaseData.date || new Date().toISOString(),
            supplierId: purchaseData.supplierId ? Number(purchaseData.supplierId) : null,
            supplierName: purchaseData.supplierName || 'مورد عام',
            items: purchaseData.items,
            total: total,
            paidAmount: paidAmount,
            remainingAmount: remainingAmount,
            notes: purchaseData.notes || '',
            createdAt: new Date().toISOString()
        };

        // Save purchase record
        const purchaseId = await DB.add(DB.STORES.PURCHASES, record);
        record.id = purchaseId;

        // Increase inventory stock & update cost price
        for (const item of purchaseData.items) {
            try {
                const product = await ProductManager.getById(item.productId);
                if (product) {
                    product.stock = (Number(product.stock) || 0) + Number(item.quantity);
                    if (item.costPrice > 0) {
                        product.buyPrice = Number(item.costPrice);
                    }
                    await DB.put(DB.STORES.PRODUCTS, product);
                }
            } catch (e) {
                console.warn(`Error updating product ${item.productId} in purchase:`, e);
            }
        }

        // If unpaid debt to supplier, update supplier balance
        if (record.supplierId && remainingAmount > 0) {
            try {
                await SupplierManager.updateBalance(record.supplierId, remainingAmount);
            } catch (e) {
                console.warn("Error updating supplier debt balance:", e);
            }
        }

        return record;
    }

    return {
        getAll,
        getById,
        createPurchase
    };
})();
