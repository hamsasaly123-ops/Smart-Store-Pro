/**
 * SmartStore Pro - Settings Management
 * Local offline store parameters, currency, tax rates, and UI preferences
 */

const SettingsManager = (function() {
    const DEFAULT_SETTINGS = {
        storeName: 'SmartStore Pro - المتجر الذكي',
        storePhone: '0501234567',
        storeAddress: 'الشارع التجاري الرئيسي، المحل رقم 12',
        currency: 'ر.س',
        taxRate: 15, // Percent
        enableTax: false,
        invoiceFooterNote: 'شكراً لتعاملكم معنا، البضاعة المباعة ترد وتستبدل خلال 3 أيام بشرط وجود الفاتورة الأصلية',
        theme: 'light',
        barcodePrefix: 'SSP',
        lowStockThreshold: 5
    };

    let currentSettings = { ...DEFAULT_SETTINGS };

    async function init() {
        try {
            const saved = await DB.getById(DB.STORES.SETTINGS, 'app_config');
            if (saved && saved.value) {
                currentSettings = { ...DEFAULT_SETTINGS, ...saved.value };
            } else {
                await DB.put(DB.STORES.SETTINGS, { key: 'app_config', value: DEFAULT_SETTINGS });
            }
        } catch (e) {
            console.error("Settings load error:", e);
        }
        applyTheme(currentSettings.theme);
        return currentSettings;
    }

    function get() {
        return { ...currentSettings };
    }

    async function save(newSettings) {
        currentSettings = { ...currentSettings, ...newSettings };
        await DB.put(DB.STORES.SETTINGS, { key: 'app_config', value: currentSettings });
        applyTheme(currentSettings.theme);
        return currentSettings;
    }

    function formatCurrency(amount) {
        const num = Number(amount) || 0;
        return `${num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currentSettings.currency}`;
    }

    function formatNumber(num) {
        return (Number(num) || 0).toLocaleString('ar-SA');
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            // Auto
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    }

    function toggleTheme() {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        currentSettings.theme = next;
        save(currentSettings);
        return next;
    }

    return {
        init,
        get,
        save,
        formatCurrency,
        formatNumber,
        applyTheme,
        toggleTheme
    };
})();
