/**
 * SmartStore Pro - Expenses & Profitability Engine
 * Daily operating costs, categorized expenditures & Net Profit calculations
 */

const ExpenseManager = (function() {
    const CATEGORIES = [
        'إيجار المحل',
        'كهرباء ومياه وإنترنت',
        'رواتب وأجور',
        'صيانة ومستلزمات',
        'نقل وشحن',
        'بوفيه وضيافة',
        'مصروفات أخرى'
    ];

    async function getAll() {
        const expenses = await DB.getAll(DB.STORES.EXPENSES);
        return expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async function getById(id) {
        return await DB.getById(DB.STORES.EXPENSES, Number(id));
    }

    async function save(expenseData) {
        const item = {
            title: expenseData.title.trim(),
            category: expenseData.category || 'مصروفات أخرى',
            amount: Math.max(0, Number(expenseData.amount) || 0),
            date: expenseData.date || new Date().toISOString(),
            notes: expenseData.notes || '',
            updatedAt: new Date().toISOString()
        };

        if (expenseData.id) {
            item.id = Number(expenseData.id);
            await DB.put(DB.STORES.EXPENSES, item);
            return item;
        } else {
            item.createdAt = new Date().toISOString();
            const id = await DB.add(DB.STORES.EXPENSES, item);
            item.id = id;
            return item;
        }
    }

    async function remove(id) {
        return await DB.delete(DB.STORES.EXPENSES, Number(id));
    }

    async function getTodayExpenses() {
        const expenses = await getAll();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        return expenses.filter(e => new Date(e.date) >= startOfDay);
    }

    async function getProfitSummary() {
        const todaySales = await SalesManager.getTodaySales();
        const todayExpenses = await getTodayExpenses();

        const totalSales = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const totalCost = todaySales.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
        const grossProfit = totalSales - totalCost;
        const totalExpenses = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const netProfit = grossProfit - totalExpenses;

        return {
            todaySalesAmount: totalSales,
            todayCostAmount: totalCost,
            todayGrossProfit: grossProfit,
            todayExpensesAmount: totalExpenses,
            todayNetProfit: netProfit,
            salesCount: todaySales.length
        };
    }

    return {
        CATEGORIES,
        getAll,
        getById,
        save,
        delete: remove,
        getTodayExpenses,
        getProfitSummary
    };
})();
