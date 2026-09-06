/**
 * SmartStore Pro - Suppliers Management
 * Wholesalers, Vendors, Balances & Supply Invoices
 */

const SupplierManager = (function() {
    async function getAll() {
        return await DB.getAll(DB.STORES.SUPPLIERS);
    }

    async function getById(id) {
        return await DB.getById(DB.STORES.SUPPLIERS, Number(id));
    }

    async function save(supplierData) {
        const item = {
            name: supplierData.name.trim(),
            company: supplierData.company ? supplierData.company.trim() : '',
            phone: supplierData.phone ? supplierData.phone.trim() : '',
            address: supplierData.address ? supplierData.address.trim() : '',
            balance: Number(supplierData.balance) || 0, // Amount owed by store to supplier
            notes: supplierData.notes || '',
            updatedAt: new Date().toISOString()
        };

        if (supplierData.id) {
            item.id = Number(supplierData.id);
            await DB.put(DB.STORES.SUPPLIERS, item);
            return item;
        } else {
            item.createdAt = new Date().toISOString();
            const id = await DB.add(DB.STORES.SUPPLIERS, item);
            item.id = id;
            return item;
        }
    }

    async function remove(id) {
        return await DB.delete(DB.STORES.SUPPLIERS, Number(id));
    }

    async function updateBalance(supplierId, deltaAmount) {
        const supplier = await getById(supplierId);
        if (!supplier) return;

        supplier.balance = (Number(supplier.balance) || 0) + Number(deltaAmount);
        supplier.updatedAt = new Date().toISOString();
        await DB.put(DB.STORES.SUPPLIERS, supplier);
        return supplier;
    }

    async function search(query = '') {
        const suppliers = await getAll();
        const q = query.trim().toLowerCase();
        if (!q) return suppliers;

        return suppliers.filter(s =>
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.company && s.company.toLowerCase().includes(q)) ||
            (s.phone && s.phone.includes(q))
        );
    }

    return {
        getAll,
        getById,
        save,
        delete: remove,
        updateBalance,
        search
    };
})();
