/**
 * SmartStore Pro - Products & Inventory Management
 * Full CRUD, barcode search, categorization, stock alert tracking
 */

const ProductManager = (function() {
    async function getAll() {
        return await DB.getAll(DB.STORES.PRODUCTS);
    }

    async function getById(id) {
        return await DB.getById(DB.STORES.PRODUCTS, Number(id));
    }

    async function getByBarcode(barcode) {
        if (!barcode) return null;
        const products = await getAll();
        return products.find(p => p.barcode && p.barcode.trim() === barcode.trim()) || null;
    }

    async function save(productData) {
        const item = {
            name: productData.name.trim(),
            barcode: productData.barcode ? productData.barcode.trim() : generateBarcode(),
            category: productData.category ? productData.category.trim() : 'عام',
            buyPrice: Math.max(0, Number(productData.buyPrice) || 0),
            sellPrice: Math.max(0, Number(productData.sellPrice) || 0),
            stock: Math.max(0, Number(productData.stock) || 0),
            minStock: Math.max(0, Number(productData.minStock) || 5),
            unit: productData.unit || 'قطعة',
            notes: productData.notes || '',
            updatedAt: new Date().toISOString()
        };

        if (productData.id) {
            item.id = Number(productData.id);
            await DB.put(DB.STORES.PRODUCTS, item);
            return item;
        } else {
            item.createdAt = new Date().toISOString();
            const id = await DB.add(DB.STORES.PRODUCTS, item);
            item.id = id;
            return item;
        }
    }

    async function remove(id) {
        return await DB.delete(DB.STORES.PRODUCTS, Number(id));
    }

    async function adjustStock(productId, deltaQuantity) {
        const product = await getById(productId);
        if (!product) throw new Error("Product not found");
        
        product.stock = Math.max(0, (Number(product.stock) || 0) + Number(deltaQuantity));
        product.updatedAt = new Date().toISOString();
        await DB.put(DB.STORES.PRODUCTS, product);
        return product;
    }

    async function getLowStockProducts() {
        const products = await getAll();
        return products.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 5));
    }

    async function getCategories() {
        const products = await getAll();
        const cats = new Set(products.map(p => p.category || 'عام'));
        return Array.from(cats);
    }

    async function search(query = '', category = '', lowStockOnly = false) {
        let products = await getAll();
        const q = query.trim().toLowerCase();

        if (q) {
            products = products.filter(p => 
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q))
            );
        }

        if (category && category !== 'all') {
            products = products.filter(p => p.category === category);
        }

        if (lowStockOnly) {
            products = products.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 5));
        }

        return products;
    }

    function generateBarcode() {
        const prefix = '890';
        const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
        return `${prefix}${randomDigits}`;
    }

    return {
        getAll,
        getById,
        getByBarcode,
        save,
        delete: remove,
        adjustStock,
        getLowStockProducts,
        getCategories,
        search,
        generateBarcode
    };
})();
