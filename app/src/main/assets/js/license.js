/**
 * SmartStore Pro - Licensing Architecture (Pre-structured Module)
 * Designed for future addition of:
 * - 15-Day Trial Period
 * - Device Activation Keys
 * - Multi-tier License Verification
 * Currently kept open and active per user instructions.
 */

const LicenseManager = (function() {
    const STORAGE_KEY = 'smartstore_license_meta';

    const LICENSE_TYPES = {
        TRIAL: 'TRIAL',
        STANDARD: 'STANDARD',
        PRO: 'PRO',
        LIFETIME: 'LIFETIME'
    };

    function getLicenseInfo() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("License parse error:", e);
            }
        }

        // Default open mode for development & initial rollout
        return {
            status: 'ACTIVE',
            type: LICENSE_TYPES.PRO,
            licenseKey: 'PRO-LOCAL-OFFLINE-EDITION',
            trialDaysTotal: 15,
            trialDaysRemaining: 15,
            isActivated: true,
            features: {
                unlimitedProducts: true,
                unlimitedInvoices: true,
                posEnabled: true,
                backupRestore: true,
                reportsExport: true
            }
        };
    }

    function checkStatus() {
        const info = getLicenseInfo();
        return {
            isValid: true,
            type: info.type,
            statusText: 'نسخة مفعّلة بالكامل (Offline Pro)',
            daysLeft: info.trialDaysRemaining
        };
    }

    function activateWithKey(key) {
        // Prepared for future key algorithm validation
        if (!key || key.trim().length < 8) {
            return { success: false, message: 'مفتاح الترخيص غير صالح' };
        }
        
        const newLicense = {
            status: 'ACTIVE',
            type: LICENSE_TYPES.PRO,
            licenseKey: key.trim(),
            isActivated: true,
            activatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newLicense));
        return { success: true, message: 'تم تفعيل النسخة بنجاح' };
    }

    return {
        LICENSE_TYPES,
        getLicenseInfo,
        checkStatus,
        activateWithKey
    };
})();
