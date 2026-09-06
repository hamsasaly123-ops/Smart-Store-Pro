/**
 * SmartStore Pro - Database Engine (IndexedDB)
 * Complete Offline Local Storage with Transactional Safety
 */

const DB = (function() {
    const DB_NAME = 'SmartStoreDB';
    const DB_VERSION = 1;
    let dbInstance = null;

    const STORES = {
        PRODUCTS: 'products',
        SALES: 'sales',
        PURCHASES: 'purchases',
        CUSTOMERS: 'customers',
        SUPPLIERS: 'suppliers',
        EXPENSES: 'expenses',
        SETTINGS: 'settings',
        USERS: 'users'
    };

    function init() {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                resolve(dbInstance);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function(e) {
                const db = e.target.result;

                // Products Store
                if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
                    const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id', autoIncrement: true });
                    productStore.createIndex('barcode', 'barcode', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                    productStore.createIndex('category', 'category', { unique: false });
                }

                // Sales Store
                if (!db.objectStoreNames.contains(STORES.SALES)) {
                    const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id', autoIncrement: true });
                    salesStore.createIndex('invoiceNo', 'invoiceNo', { unique: true });
                    salesStore.createIndex('date', 'date', { unique: false });
                    salesStore.createIndex('customerId', 'customerId', { unique: false });
                }

                // Purchases Store
                if (!db.objectStoreNames.contains(STORES.PURCHASES)) {
                    const purchaseStore = db.createObjectStore(STORES.PURCHASES, { keyPath: 'id', autoIncrement: true });
                    purchaseStore.createIndex('invoiceNo', 'invoiceNo', { unique: false });
                    purchaseStore.createIndex('date', 'date', { unique: false });
                    purchaseStore.createIndex('supplierId', 'supplierId', { unique: false });
                }

                // Customers Store
                if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
                    const custStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id', autoIncrement: true });
                    custStore.createIndex('name', 'name', { unique: false });
                    custStore.createIndex('phone', 'phone', { unique: false });
                }

                // Suppliers Store
                if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
                    const suppStore = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id', autoIncrement: true });
                    suppStore.createIndex('name', 'name', { unique: false });
                    suppStore.createIndex('phone', 'phone', { unique: false });
                }

                // Expenses Store
                if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
                    const expStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id', autoIncrement: true });
                    expStore.createIndex('date', 'date', { unique: false });
                    expStore.createIndex('category', 'category', { unique: false });
                }

                // Settings Store
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }

                // Users Store
                if (!db.objectStoreNames.contains(STORES.USERS)) {
                    const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                }
            };

            request.onsuccess = function(e) {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };

            request.onerror = function(e) {
                console.error("IndexedDB Open Error:", e);
                reject(e);
            };
        });
    }

    function getStore(storeName, mode = 'readonly') {
        const tx = dbInstance.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    function getAll(storeName) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readonly');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e);
        });
    }

    function getById(storeName, id) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readonly');
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e);
        });
    }

    function add(storeName, item) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readwrite');
            const req = store.add(item);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e);
        });
    }

    function put(storeName, item) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readwrite');
            const req = store.put(item);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e);
        });
    }

    function remove(storeName, id) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readwrite');
            const req = store.delete(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e);
        });
    }

    function clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readwrite');
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e);
        });
    }

    // Export all stores to single JSON
    async function exportAllData() {
        const exportData = {
            version: DB_VERSION,
            appName: 'SmartStore Pro',
            exportedAt: new Date().toISOString(),
            data: {}
        };

        for (const key of Object.values(STORES)) {
            exportData.data[key] = await getAll(key);
        }

        return exportData;
    }

    // Restore all stores from JSON
    async function importAllData(importedData) {
        if (!importedData || !importedData.data) {
            throw new Error("Invalid backup format");
        }

        for (const [storeName, items] of Object.entries(importedData.data)) {
            if (Object.values(STORES).includes(storeName) && Array.isArray(items)) {
                await clearStore(storeName);
                for (const item of items) {
                    await put(storeName, item);
                }
            }
        }
        return true;
    }

    return {
        STORES,
        init,
        getAll,
        getById,
        add,
        put,
        delete: remove,
        clearStore,
        exportAllData,
        importAllData
    };
})();
