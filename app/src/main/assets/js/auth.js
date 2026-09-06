/**
 * SmartStore Pro - Authentication & Access Management (100% Offline)
 * Manages user sessions, PIN authentication, and roles
 */

const AuthManager = (function() {
    const SESSION_KEY = 'smartstore_active_user';

    let currentUser = null;

    async function init() {
        // Ensure default admin user exists
        const users = await DB.getAll(DB.STORES.USERS);
        if (!users || users.length === 0) {
            await DB.add(DB.STORES.USERS, {
                username: 'admin',
                name: 'المدير العام',
                pin: '1234',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            await DB.add(DB.STORES.USERS, {
                username: 'cashier',
                name: 'كاشير المحل',
                pin: '0000',
                role: 'cashier',
                createdAt: new Date().toISOString()
            });
        }

        // Check active session
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
            try {
                currentUser = JSON.parse(stored);
            } catch (e) {
                currentUser = null;
            }
        }
        return currentUser;
    }

    async function login(usernameOrPin, pin) {
        const users = await DB.getAll(DB.STORES.USERS);
        
        let found = null;
        // Check both username+pin or direct PIN login
        if (pin !== undefined && pin !== '') {
            found = users.find(u => (u.username === usernameOrPin || u.name === usernameOrPin) && u.pin === pin);
        } else {
            // Quick PIN login
            found = users.find(u => u.pin === usernameOrPin);
        }

        if (found) {
            currentUser = {
                id: found.id,
                username: found.username,
                name: found.name,
                role: found.role
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
            return { success: true, user: currentUser };
        } else {
            return { success: false, message: 'اسم المستخدم أو رمز PIN غير صحيح' };
        }
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem(SESSION_KEY);
    }

    function getCurrentUser() {
        return currentUser;
    }

    function isAuthenticated() {
        return currentUser !== null;
    }

    function isAdmin() {
        return currentUser && currentUser.role === 'admin';
    }

    return {
        init,
        login,
        logout,
        getCurrentUser,
        isAuthenticated,
        isAdmin
    };
})();
