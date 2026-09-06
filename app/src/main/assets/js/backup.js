/**
 * SmartStore Pro - Backup & Data Restoration Engine (100% Offline)
 * Export all stores to JSON file, Import/Restore, and Demo Data Loader
 */

const BackupManager = (function() {
    async function exportBackupFile() {
        const backupData = await DB.exportAllData();
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `smartstore_backup_${timestamp}.json`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return filename;
    }

    function importBackupFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error("لم يتم اختيار أي ملف"));
                return;
            }

            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (!parsed.data || typeof parsed.data !== 'object') {
                        throw new Error("تنسيق ملف النسخة الاحتياطية غير صحيح");
                    }
                    await DB.importAllData(parsed);
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
        });
    }

    async function loadSampleData() {
        // Sample products
        const sampleProducts = [
            { name: 'حليب كامل الدسم 1 لتر', barcode: '6281001001', category: 'ألبان وأجبان', buyPrice: 4.5, sellPrice: 6.0, stock: 45, minStock: 10, unit: 'علبة' },
            { name: 'أرز بسمتي فاخر 5 كجم', barcode: '6281001002', category: 'مواد تموينية', buyPrice: 38.0, sellPrice: 48.0, stock: 20, minStock: 5, unit: 'كيس' },
            { name: 'زيت نباتي نقي 1.5 لتر', barcode: '6281001003', category: 'زيوت وسمن', buyPrice: 14.0, sellPrice: 18.5, stock: 30, minStock: 8, unit: 'حبة' },
            { name: 'شاي أسود ناعم 100 كيس', barcode: '6281001004', category: 'مشروبات', buyPrice: 11.5, sellPrice: 15.0, stock: 18, minStock: 6, unit: 'علبة' },
            { name: 'سكر ناعم 2 كجم', barcode: '6281001005', category: 'مواد تموينية', buyPrice: 8.0, sellPrice: 11.0, stock: 4, minStock: 10, unit: 'كيس' }, // Low stock alert
            { name: 'صابون غسيل أطباق 1 لتر', barcode: '6281001006', category: 'منظفات', buyPrice: 9.0, sellPrice: 13.0, stock: 3, minStock: 5, unit: 'حبة' }, // Low stock alert
            { name: 'مناديل ورقية 10 عبوات', barcode: '6281001007', category: 'ورقيات', buyPrice: 17.0, sellPrice: 22.0, stock: 25, minStock: 5, unit: 'شدة' },
            { name: 'مياه معدنية 330 مل كرتونة', barcode: '6281001008', category: 'مشروبات', buyPrice: 12.0, sellPrice: 16.0, stock: 50, minStock: 15, unit: 'كرتونة' }
        ];

        for (const p of sampleProducts) {
            await ProductManager.save(p);
        }

        // Sample customers
        const sampleCustomers = [
            { name: 'أحمد محمود العلي', phone: '0551122334', address: 'حي النرجس، الرياض', balance: 0 },
            { name: 'خالد عبدالله المنصور', phone: '0569988776', address: 'حي الملقا', balance: 85.0 }, // Has debt
            { name: 'سارة محمد الحربي', phone: '0503344556', address: 'حي الياسمين', balance: 0 }
        ];

        for (const c of sampleCustomers) {
            await CustomerManager.save(c);
        }

        // Sample suppliers
        const sampleSuppliers = [
            { name: 'شركة البركة للمواد الغذائية', company: 'البركة المتحدة', phone: '0112233445', address: 'المنطقة الصناعية الثانية', balance: 450.0 },
            { name: 'مؤسسة الصفوة للتجارة والتوزيع', company: 'مجموعة الصفوة', phone: '0119988112', address: 'طريق الخرج', balance: 0 }
        ];

        for (const s of sampleSuppliers) {
            await SupplierManager.save(s);
        }

        // Sample Expenses
        const sampleExpenses = [
            { title: 'فاتورة الكهرباء لشهر سبتمبر', category: 'كهرباء ومياه وإنترنت', amount: 350.0, date: new Date().toISOString(), notes: 'سداد إلكتروني' },
            { title: 'مستلزمات نظافة وأكياس تسوق', category: 'صيانة ومستلزمات', amount: 80.0, date: new Date().toISOString(), notes: 'شراء كاش' }
        ];

        for (const exp of sampleExpenses) {
            await ExpenseManager.save(exp);
        }

        return true;
    }

    return {
        exportBackupFile,
        importBackupFile,
        loadSampleData
    };
})();
