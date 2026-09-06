/**
 * SmartStore Pro - Customers Management
 * Contacts, Balances, Debt Settlements & Purchase Log
 */

const CustomerManager = (function() {
    async function getAll() {
        return await DB.getAll(DB.STORES.CUSTOMERS);
    }

    async function getById(id) {
        return await DB.getById(DB.STORES.CUSTOMERS, Number(id));
    }

    async function save(customerData) {
        const item = {
            name: customerData.name.trim(),
            phone: customerData.phone ? customerData.phone.trim() : '',
            address: customerData.address ? customerData.address.trim() : '',
            balance: Number(customerData.balance) || 0, // Debt owed by customer
            notes: customerData.notes || '',
            updatedAt: new Date().toISOString()
        };

        if (customerData.id) {
            item.id = Number(customerData.id);
            await DB.put(DB.STORES.CUSTOMERS, item);
            return item;
        } else {
            item.createdAt = new Date().toISOString();
            const id = await DB.add(DB.STORES.CUSTOMERS, item);
            item.id = id;
            return item;
        }
    }

    async function remove(id) {
        return await DB.delete(DB.STORES.CUSTOMERS, Number(id));
    }

    async function addDebt(customerId, amount, invoiceNo = '') {
        const customer = await getById(customerId);
        if (!customer) return;

        customer.balance = (Number(customer.balance) || 0) + Number(amount);
        customer.updatedAt = new Date().toISOString();
        await DB.put(DB.STORES.CUSTOMERS, customer);
        return customer;
    }

    async function recordPayment(customerId, paidAmount, note = '') {
        const customer = await getById(customerId);
        if (!customer) throw new Error("Customer not found");

        const payment = Number(paidAmount) || 0;
        customer.balance = Math.max(0, (Number(customer.balance) || 0) - payment);
        customer.updatedAt = new Date().toISOString();
        await DB.put(DB.STORES.CUSTOMERS, customer);
        return customer;
    }

    async function search(query = '') {
        const customers = await getAll();
        const q = query.trim().toLowerCase();
        if (!q) return customers;

        return customers.filter(c =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.address && c.address.toLowerCase().includes(q))
        );
    }

    return {
        getAll,
        getById,
        save,
        delete: remove,
        addDebt,
        recordPayment,
        search
    };
})();
