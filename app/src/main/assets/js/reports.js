/**
 * SmartStore Pro - Comprehensive Analytics & Reports Engine
 * Daily, Weekly, Monthly performance, Top Sellers & Profit Margins
 */

const ReportsManager = (function() {
    async function getSalesAnalytics(timeRange = 'today') {
        const sales = await SalesManager.getAllSales();
        const expenses = await ExpenseManager.getAll();

        const now = new Date();
        let filterDate = new Date();

        if (timeRange === 'today') {
            filterDate.setHours(0, 0, 0, 0);
        } else if (timeRange === 'week') {
            filterDate.setDate(now.getDate() - 7);
            filterDate.setHours(0, 0, 0, 0);
        } else if (timeRange === 'month') {
            filterDate.setMonth(now.getMonth() - 1);
            filterDate.setHours(0, 0, 0, 0);
        } else {
            // all time
            filterDate = new Date(0);
        }

        const filteredSales = sales.filter(s => new Date(s.date) >= filterDate);
        const filteredExpenses = expenses.filter(e => new Date(e.date) >= filterDate);

        const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const totalCost = filteredSales.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
        const grossProfit = totalRevenue - totalCost;
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const netProfit = grossProfit - totalExpenses;

        // Payment method breakdown
        let cashSales = 0;
        let cardSales = 0;
        let creditSales = 0;

        filteredSales.forEach(s => {
            if (s.paymentMethod === 'cash') cashSales += s.total;
            else if (s.paymentMethod === 'card') cardSales += s.total;
            else if (s.paymentMethod === 'credit') creditSales += s.total;
        });

        // Top selling products calculation
        const productMap = {};
        filteredSales.forEach(sale => {
            (sale.items || []).forEach(item => {
                if (!productMap[item.name]) {
                    productMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
                }
                productMap[item.name].quantity += Number(item.quantity) || 0;
                productMap[item.name].revenue += Number(item.total) || 0;
            });
        });

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        return {
            timeRange,
            salesCount: filteredSales.length,
            totalRevenue,
            totalCost,
            grossProfit,
            totalExpenses,
            netProfit,
            cashSales,
            cardSales,
            creditSales,
            topProducts
        };
    }

    async function exportToCSV(type = 'sales') {
        let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Arabic support
        const settings = SettingsManager.get();

        if (type === 'sales') {
            const sales = await SalesManager.getAllSales();
            csvContent += "رقم الفاتورة,التاريخ,العميل,المبلغ الإجمالي,طريقة الدفع,الربح\n";
            sales.forEach(s => {
                const dateStr = new Date(s.date).toLocaleDateString('ar-SA');
                csvContent += `"${s.invoiceNo}","${dateStr}","${s.customerName}",${s.total},"${s.paymentMethod}",${s.profit}\n`;
            });
        } else if (type === 'products') {
            const products = await ProductManager.getAll();
            csvContent += "الباركود,اسم المنتج,القسم,سعر الشراء,سعر البيع,المخزون الحالي,حد التنبيه\n";
            products.forEach(p => {
                csvContent += `"${p.barcode}","${p.name}","${p.category}",${p.buyPrice},${p.sellPrice},${p.stock},${p.minStock}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `smartstore_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return {
        getSalesAnalytics,
        exportToCSV
    };
})();
