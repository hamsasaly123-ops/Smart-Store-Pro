/**
 * SmartStore Pro - Sales & Invoicing Engine
 * Live POS Cart, Invoice Generation, Inventory Deduction & Receipt Printing
 */

const SalesManager = (function() {
    let cart = [];

    function getCart() {
        return cart;
    }

    function addToCart(product, quantity = 1) {
        const qtyToAdd = Math.max(1, Number(quantity) || 1);
        const existingIndex = cart.findIndex(item => item.productId === product.id);

        if (existingIndex > -1) {
            cart[existingIndex].quantity += qtyToAdd;
            cart[existingIndex].total = cart[existingIndex].quantity * cart[existingIndex].unitPrice;
        } else {
            cart.push({
                productId: product.id,
                name: product.name,
                barcode: product.barcode || '',
                unit: product.unit || 'قطعة',
                unitPrice: Number(product.sellPrice) || 0,
                buyPrice: Number(product.buyPrice) || 0,
                quantity: qtyToAdd,
                total: qtyToAdd * (Number(product.sellPrice) || 0)
            });
        }
        return cart;
    }

    function updateCartQuantity(productId, newQty) {
        const item = cart.find(i => i.productId === productId);
        if (item) {
            const parsed = Number(newQty);
            if (parsed <= 0) {
                removeFromCart(productId);
            } else {
                item.quantity = parsed;
                item.total = item.quantity * item.unitPrice;
            }
        }
        return cart;
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.productId !== productId);
        return cart;
    }

    function clearCart() {
        cart = [];
        return cart;
    }

    function calculateTotals(discountVal = 0, discountType = 'fixed', applyTax = false, customTaxRate = null) {
        const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
        const totalCost = cart.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0);

        let discountAmount = 0;
        const discNum = Math.max(0, Number(discountVal) || 0);

        if (discountType === 'percent') {
            discountAmount = (subtotal * discNum) / 100;
        } else {
            discountAmount = Math.min(subtotal, discNum);
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount);

        const settings = SettingsManager.get();
        const taxRate = customTaxRate !== null ? customTaxRate : (settings.taxRate || 15);
        let taxAmount = 0;

        if (applyTax || settings.enableTax) {
            taxAmount = (afterDiscount * taxRate) / 100;
        }

        const finalTotal = afterDiscount + taxAmount;
        const estimatedProfit = Math.max(0, (subtotal - discountAmount) - totalCost);

        return {
            subtotal,
            discountVal: discNum,
            discountType,
            discountAmount,
            afterDiscount,
            taxRate,
            taxAmount,
            total: finalTotal,
            totalCost,
            profit: estimatedProfit,
            itemsCount: cart.reduce((sum, i) => sum + i.quantity, 0)
        };
    }

    async function generateNextInvoiceNo() {
        const sales = await DB.getAll(DB.STORES.SALES);
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const prefix = `INV-${year}${month}${day}-`;

        // Count today's invoices
        const todayCount = sales.filter(s => s.invoiceNo && s.invoiceNo.startsWith(prefix)).length + 1;
        return `${prefix}${String(todayCount).padStart(4, '0')}`;
    }

    async function checkout(saleDetails) {
        if (cart.length === 0) {
            throw new Error("سلة المبيعات فارغة");
        }

        const totals = calculateTotals(
            saleDetails.discountVal,
            saleDetails.discountType,
            saleDetails.applyTax,
            saleDetails.taxRate
        );

        const invoiceNo = await generateNextInvoiceNo();
        const activeUser = AuthManager.getCurrentUser() || { name: 'المسؤول' };

        const paidAmount = Number(saleDetails.paidAmount !== undefined ? saleDetails.paidAmount : totals.total);
        const remainingAmount = Math.max(0, totals.total - paidAmount);

        const saleRecord = {
            invoiceNo,
            date: new Date().toISOString(),
            customerId: saleDetails.customerId ? Number(saleDetails.customerId) : null,
            customerName: saleDetails.customerName || 'عميل نقدي',
            items: [...cart],
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            discountType: totals.discountType,
            taxAmount: totals.taxAmount,
            taxRate: totals.taxRate,
            total: totals.total,
            totalCost: totals.totalCost,
            profit: totals.profit,
            paymentMethod: saleDetails.paymentMethod || 'cash', // 'cash', 'card', 'credit'
            paidAmount: paidAmount,
            remainingAmount: remainingAmount,
            cashierName: activeUser.name,
            notes: saleDetails.notes || ''
        };

        // 1. Save Sale to IndexedDB
        const saleId = await DB.add(DB.STORES.SALES, saleRecord);
        saleRecord.id = saleId;

        // 2. Decrement inventory stock for each product
        for (const item of cart) {
            try {
                await ProductManager.adjustStock(item.productId, -item.quantity);
            } catch (e) {
                console.warn(`Could not adjust stock for product ${item.productId}:`, e);
            }
        }

        // 3. If credit sale, update customer debt balance
        if (saleRecord.customerId && remainingAmount > 0) {
            try {
                await CustomerManager.addDebt(saleRecord.customerId, remainingAmount, saleRecord.invoiceNo);
            } catch (e) {
                console.warn("Could not register customer debt:", e);
            }
        }

        // Reset cart
        clearCart();

        return saleRecord;
    }

    async function getAllSales() {
        const sales = await DB.getAll(DB.STORES.SALES);
        return sales.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async function getSaleById(id) {
        return await DB.getById(DB.STORES.SALES, Number(id));
    }

    async function getTodaySales() {
        const sales = await getAllSales();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        return sales.filter(s => new Date(s.date) >= startOfDay);
    }

    function printInvoice(saleRecord) {
        const settings = SettingsManager.get();
        const printContainer = document.getElementById('printable-invoice');
        if (!printContainer) return;

        const dateFormatted = new Date(saleRecord.date).toLocaleString('ar-SA');

        let itemsHtml = '';
        saleRecord.items.forEach((item, index) => {
            itemsHtml += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unitPrice.toFixed(2)}</td>
                    <td>${item.total.toFixed(2)}</td>
                </tr>
            `;
        });

        const paymentText = saleRecord.paymentMethod === 'cash' ? 'نقداً (كاش)' :
                            saleRecord.paymentMethod === 'card' ? 'بطاقة / شبكة' : 'آجل (دين)';

        printContainer.innerHTML = `
            <div class="print-header">
                <div class="print-store-name">${settings.storeName}</div>
                <div class="print-store-sub">${settings.storeAddress}</div>
                <div class="print-store-sub">هاتف: ${settings.storePhone}</div>
            </div>

            <div class="print-meta-grid">
                <div><strong>رقم الفاتورة:</strong> ${saleRecord.invoiceNo}</div>
                <div><strong>التاريخ:</strong> ${dateFormatted}</div>
            </div>
            <div class="print-meta-grid">
                <div><strong>العميل:</strong> ${saleRecord.customerName}</div>
                <div><strong>الكاشير:</strong> ${saleRecord.cashierName}</div>
            </div>

            <table class="print-items-table">
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div class="print-totals">
                <div class="print-totals-row">
                    <span>المجموع الفرعي:</span>
                    <span>${saleRecord.subtotal.toFixed(2)} ${settings.currency}</span>
                </div>
                ${saleRecord.discountAmount > 0 ? `
                <div class="print-totals-row">
                    <span>الخصم:</span>
                    <span>-${saleRecord.discountAmount.toFixed(2)} ${settings.currency}</span>
                </div>` : ''}
                ${saleRecord.taxAmount > 0 ? `
                <div class="print-totals-row">
                    <span>الضريبة (${saleRecord.taxRate}%):</span>
                    <span>${saleRecord.taxAmount.toFixed(2)} ${settings.currency}</span>
                </div>` : ''}
                <div class="print-totals-row final">
                    <span>الإجمالي النهائي:</span>
                    <span>${saleRecord.total.toFixed(2)} ${settings.currency}</span>
                </div>
                <div class="print-totals-row">
                    <span>طريقة الدفع:</span>
                    <span>${paymentText}</span>
                </div>
                ${saleRecord.remainingAmount > 0 ? `
                <div class="print-totals-row" style="color: red;">
                    <span>المبلغ المتبقي (آجل):</span>
                    <span>${saleRecord.remainingAmount.toFixed(2)} ${settings.currency}</span>
                </div>` : ''}
            </div>

            <div class="print-footer">
                ${settings.invoiceFooterNote}
                <div class="print-barcode-mock">* ${saleRecord.invoiceNo} *</div>
            </div>
        `;

        // Check if running on Android WebView with native print bridge
        if (window.AndroidBridge && typeof window.AndroidBridge.printInvoice === 'function') {
            window.AndroidBridge.printInvoice(saleRecord.invoiceNo);
        } else {
            window.print();
        }
    }

    return {
        getCart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        calculateTotals,
        generateNextInvoiceNo,
        checkout,
        getAllSales,
        getSaleById,
        getTodaySales,
        printInvoice
    };
})();
