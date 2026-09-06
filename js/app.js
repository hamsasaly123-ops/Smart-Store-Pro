/**
 * SmartStore Pro - Main Application Controller
 * UI Navigation, Screen Renderers, Modals, Toasts & Event Handlers
 */

document.addEventListener('DOMContentLoaded', async function() {
    await initApp();
});

async function initApp() {
    try {
        // 1. Initialize IndexedDB
        await DB.init();

        // 2. Initialize Settings & Theme
        await SettingsManager.init();

        // 3. Initialize Auth
        await AuthManager.init();

        // Check if sample data needed (if database has 0 products)
        const products = await ProductManager.getAll();
        if (products.length === 0) {
            await BackupManager.loadSampleData();
        }

        // 4. Setup event listeners
        setupNavigation();
        setupModals();
        setupEventListeners();

        // 5. Check login status
        if (AuthManager.isAuthenticated()) {
            showAppView();
            navigateTo('dashboard');
        } else {
            showLoginView();
        }

        // Global back handler for Android Webview
        window.handleAndroidBack = function() {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                activeModal.classList.remove('active');
                return true;
            }
            const currentView = document.querySelector('.view-section.active');
            if (currentView && currentView.id !== 'view-dashboard' && currentView.id !== 'view-login') {
                navigateTo('dashboard');
                return true;
            }
            return false;
        };

    } catch (e) {
        console.error("Initialization error:", e);
        showToast("حدث خطأ أثناء تحميل التطبيق", "danger");
    }
}

// ----------------------------------------------------
// UI Views & Navigation
// ----------------------------------------------------
function showLoginView() {
    const loginView = document.getElementById('view-login');
    if (loginView) {
        loginView.style.display = 'flex';
        loginView.classList.add('active');
    }
    const appShell = document.getElementById('app-shell');
    if (appShell) {
        appShell.style.display = 'none';
    }
}

function showAppView() {
    const loginView = document.getElementById('view-login');
    if (loginView) {
        loginView.style.display = 'none';
        loginView.classList.remove('active');
    }
    const appShell = document.getElementById('app-shell');
    if (appShell) {
        appShell.style.display = 'flex';
    }
    updateUserInfoHeader();
}

async function quickLogin(pinCode) {
    const res = await AuthManager.login(pinCode);
    if (res.success) {
        showAppView();
        navigateTo('dashboard');
        showToast(`مرحباً ${res.user.name}`, "success");
    } else {
        showToast(res.message, "danger");
    }
}

function updateUserInfoHeader() {
    const user = AuthManager.getCurrentUser();
    if (user) {
        const nameEl = document.getElementById('sidebar-user-name');
        const roleEl = document.getElementById('sidebar-user-role');
        const avatarEl = document.getElementById('sidebar-user-avatar');
        if (nameEl) nameEl.textContent = user.name;
        if (roleEl) roleEl.textContent = user.role === 'admin' ? 'مدير النظام' : 'كاشير';
        if (avatarEl) avatarEl.textContent = user.name.charAt(0);
    }
}

function navigateTo(viewId) {
    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        }
    });

    // Show selected view
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Close mobile sidebar if open
    closeSidebar();

    // Render view-specific data
    switch (viewId) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'pos':
            renderPOS();
            break;
        case 'products':
            renderProductsList();
            break;
        case 'sales':
            renderSalesHistory();
            break;
        case 'customers':
            renderCustomersList();
            break;
        case 'suppliers':
            renderSuppliersList();
            break;
        case 'purchases':
            renderPurchasesList();
            break;
        case 'expenses':
            renderExpensesList();
            break;
        case 'reports':
            renderReports();
            break;
        case 'settings':
            renderSettingsForm();
            break;
        case 'backup':
            renderBackupView();
            break;
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            if (view) {
                navigateTo(view);
            }
        });
    });

    // Sidebar toggle (mobile)
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Theme toggle
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            SettingsManager.toggleTheme();
            showToast("تم تبديل المظهر", "primary");
        });
    }

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AuthManager.logout();
            showLoginView();
            showToast("تم تسجيل الخروج بنجاح", "primary");
        });
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ----------------------------------------------------
// 1. DASHBOARD VIEW
// ----------------------------------------------------
async function renderDashboard() {
    const profitSummary = await ExpenseManager.getProfitSummary();
    const allProducts = await ProductManager.getAll();
    const lowStockList = await ProductManager.getLowStockProducts();
    const todaySales = await SalesManager.getTodaySales();
    const recentSales = (await SalesManager.getAllSales()).slice(0, 6);
    const settings = SettingsManager.get();

    // Update stat numbers
    document.getElementById('dash-today-sales').textContent = SettingsManager.formatCurrency(profitSummary.todaySalesAmount);
    document.getElementById('dash-today-profit').textContent = SettingsManager.formatCurrency(profitSummary.todayNetProfit);
    document.getElementById('dash-products-count').textContent = SettingsManager.formatNumber(allProducts.length);
    document.getElementById('dash-low-stock-count').textContent = SettingsManager.formatNumber(lowStockList.length);

    // Render Low Stock Alert Banner / Table
    const lowStockTable = document.getElementById('dash-low-stock-table-body');
    if (lowStockTable) {
        if (lowStockList.length === 0) {
            lowStockTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">المخزون متوفر وممتاز، لا توجد نواقص</td></tr>`;
        } else {
            lowStockTable.innerHTML = lowStockList.map(p => `
                <tr>
                    <td><strong>${p.name}</strong></td>
                    <td><span class="badge badge-danger">${p.stock} ${p.unit}</span></td>
                    <td>${p.minStock} ${p.unit}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="openProductModal(${p.id})">تعديل</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    // Render Recent Sales Table
    const recentSalesTable = document.getElementById('dash-recent-sales-table-body');
    if (recentSalesTable) {
        if (recentSales.length === 0) {
            recentSalesTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">لا توجد عمليات بيع مسجلة بعد</td></tr>`;
        } else {
            recentSalesTable.innerHTML = recentSales.map(s => `
                <tr>
                    <td><strong>${s.invoiceNo}</strong></td>
                    <td>${s.customerName}</td>
                    <td>${new Date(s.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td><strong>${SettingsManager.formatCurrency(s.total)}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewInvoiceDetails(${s.id})">عرض</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    // Low stock badge in sidebar
    const lowStockBadge = document.getElementById('nav-low-stock-badge');
    if (lowStockBadge) {
        if (lowStockList.length > 0) {
            lowStockBadge.textContent = lowStockList.length;
            lowStockBadge.style.display = 'inline-block';
        } else {
            lowStockBadge.style.display = 'none';
        }
    }
}

// ----------------------------------------------------
// 2. POS & SALES INVOICING VIEW
// ----------------------------------------------------
let currentCategoryFilter = 'all';

async function renderPOS() {
    const products = await ProductManager.getAll();
    const categories = await ProductManager.getCategories();
    renderPOSCategories(categories);
    renderPOSProducts(products);
    updateCartUI();

    // Populate customers dropdown
    const customers = await CustomerManager.getAll();
    const custSelect = document.getElementById('pos-customer-select');
    if (custSelect) {
        custSelect.innerHTML = `<option value="">عميل نقدي (عام)</option>` +
            customers.map(c => `<option value="${c.id}">${c.name} ${c.balance > 0 ? `(عليه ${c.balance} ${SettingsManager.get().currency})` : ''}</option>`).join('');
    }
}

function renderPOSCategories(categories) {
    const container = document.getElementById('pos-categories-container');
    if (!container) return;

    container.innerHTML = `
        <button class="cat-pill ${currentCategoryFilter === 'all' ? 'active' : ''}" onclick="filterPOSByCategory('all')">الكل</button>
        ${categories.map(c => `
            <button class="cat-pill ${currentCategoryFilter === c ? 'active' : ''}" onclick="filterPOSByCategory('${c}')">${c}</button>
        `).join('')}
    `;
}

async function filterPOSByCategory(cat) {
    currentCategoryFilter = cat;
    const searchVal = document.getElementById('pos-search-input')?.value || '';
    const products = await ProductManager.search(searchVal, cat);
    renderPOSCategories(await ProductManager.getCategories());
    renderPOSProducts(products);
}

function renderPOSProducts(products) {
    const container = document.getElementById('pos-products-grid');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">لا توجد منتجات تطابق البحث</div>`;
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="product-card-pos" onclick="addProductToCart(${p.id})">
            <div>
                <div class="p-name">${p.name}</div>
                <div class="p-barcode">${p.barcode}</div>
            </div>
            <div class="p-bottom">
                <span class="p-price">${p.sellPrice} ${SettingsManager.get().currency}</span>
                <span class="p-stock ${p.stock <= p.minStock ? 'text-danger font-bold' : ''}">
                    المتاح: ${p.stock}
                </span>
            </div>
        </div>
    `).join('');
}

async function addProductToCart(productId) {
    const product = await ProductManager.getById(productId);
    if (!product) return;

    if (product.stock <= 0) {
        showToast("تنبيه: المنتج نفذ من المخزون!", "warning");
    }

    SalesManager.addToCart(product, 1);
    updateCartUI();
}

function updateCartUI() {
    const cart = SalesManager.getCart();
    const container = document.getElementById('pos-cart-items');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem; opacity: 0.5;">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <div>السلة فارغة، اختر منتجات لإضافتها</div>
        </div>`;
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.unitPrice} ${SettingsManager.get().currency}</div>
                </div>
                <div class="cart-qty-controls">
                    <button class="qty-btn" onclick="modifyCartQty(${item.productId}, ${item.quantity - 1})">-</button>
                    <input type="number" class="cart-qty-input" value="${item.quantity}" min="1" onchange="modifyCartQty(${item.productId}, this.value)">
                    <button class="qty-btn" onclick="modifyCartQty(${item.productId}, ${item.quantity + 1})">+</button>
                </div>
                <div class="cart-item-total">${item.total.toFixed(2)}</div>
                <button class="btn-icon btn-sm btn-outline text-danger" onclick="removeCartItem(${item.productId})" title="حذف">×</button>
            </div>
        `).join('');
    }

    // Update Totals
    const discountVal = document.getElementById('pos-discount-input')?.value || 0;
    const applyTax = document.getElementById('pos-apply-tax')?.checked || false;
    const totals = SalesManager.calculateTotals(discountVal, 'fixed', applyTax);

    document.getElementById('pos-subtotal').textContent = SettingsManager.formatCurrency(totals.subtotal);
    document.getElementById('pos-discount-amount').textContent = `-${SettingsManager.formatCurrency(totals.discountAmount)}`;
    document.getElementById('pos-tax-amount').textContent = SettingsManager.formatCurrency(totals.taxAmount);
    document.getElementById('pos-final-total').textContent = SettingsManager.formatCurrency(totals.total);
}

function modifyCartQty(productId, newQty) {
    SalesManager.updateCartQuantity(productId, newQty);
    updateCartUI();
}

function removeCartItem(productId) {
    SalesManager.removeFromCart(productId);
    updateCartUI();
}

async function handlePOSBarcodeScan(barcode) {
    if (!barcode) return;
    const product = await ProductManager.getByBarcode(barcode.trim());
    if (product) {
        addProductToCart(product.id);
        showToast(`تمت إضافة: ${product.name}`, "success");
        const barcodeInput = document.getElementById('pos-barcode-input');
        if (barcodeInput) barcodeInput.value = '';
    } else {
        showToast("لم يتم العثور على منتج بهذا الباركود", "warning");
    }
}

async function processPOSCheckout() {
    const cart = SalesManager.getCart();
    if (cart.length === 0) {
        showToast("السلة فارغة!", "warning");
        return;
    }

    const custSelect = document.getElementById('pos-customer-select');
    const customerId = custSelect ? custSelect.value : null;
    const customerName = custSelect && custSelect.selectedOptions[0] ? custSelect.selectedOptions[0].text.split('(')[0].trim() : 'عميل نقدي';

    const discountVal = document.getElementById('pos-discount-input')?.value || 0;
    const applyTax = document.getElementById('pos-apply-tax')?.checked || false;
    const paymentMethod = document.querySelector('input[name="pos_payment"]:checked')?.value || 'cash';

    try {
        const saleRecord = await SalesManager.checkout({
            customerId: customerId || null,
            customerName: customerName,
            discountVal: Number(discountVal),
            discountType: 'fixed',
            applyTax: applyTax,
            paymentMethod: paymentMethod
        });

        showToast(`تم إصدار الفاتورة رقم ${saleRecord.invoiceNo} بنجاح`, "success");
        updateCartUI();
        renderPOS();

        // Ask or show invoice preview modal
        viewInvoiceDetails(saleRecord.id);

    } catch (e) {
        showToast(e.message || "فشلت عملية البيع", "danger");
    }
}

// ----------------------------------------------------
// 3. PRODUCTS & INVENTORY VIEW
// ----------------------------------------------------
async function renderProductsList() {
    const searchVal = document.getElementById('products-search-input')?.value || '';
    const catVal = document.getElementById('products-category-filter')?.value || 'all';
    const lowStockOnly = document.getElementById('products-low-stock-check')?.checked || false;

    const products = await ProductManager.search(searchVal, catVal, lowStockOnly);
    const container = document.getElementById('products-table-body');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">لا توجد منتجات مسجلة</td></tr>`;
        return;
    }

    container.innerHTML = products.map((p, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${p.name}</strong></td>
            <td><code>${p.barcode}</code></td>
            <td><span class="badge badge-gray">${p.category}</span></td>
            <td>${SettingsManager.formatCurrency(p.buyPrice)}</td>
            <td><strong>${SettingsManager.formatCurrency(p.sellPrice)}</strong></td>
            <td>
                <span class="badge ${p.stock <= p.minStock ? 'badge-danger' : 'badge-success'}">
                    ${p.stock} ${p.unit}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="openProductModal(${p.id})">تعديل</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProductConfirm(${p.id})">حذف</button>
            </td>
        </tr>
    `).join('');

    // Update Category Filter dropdown
    const catFilter = document.getElementById('products-category-filter');
    if (catFilter) {
        const cats = await ProductManager.getCategories();
        catFilter.innerHTML = `<option value="all">كل الأقسام</option>` +
            cats.map(c => `<option value="${c}" ${catVal === c ? 'selected' : ''}>${c}</option>`).join('');
    }
}

async function openProductModal(productId = null) {
    const modal = document.getElementById('modal-product');
    const form = document.getElementById('form-product');
    form.reset();

    if (productId) {
        const product = await ProductManager.getById(productId);
        if (product) {
            document.getElementById('prod-id').value = product.id;
            document.getElementById('prod-name').value = product.name;
            document.getElementById('prod-barcode').value = product.barcode;
            document.getElementById('prod-category').value = product.category;
            document.getElementById('prod-buy-price').value = product.buyPrice;
            document.getElementById('prod-sell-price').value = product.sellPrice;
            document.getElementById('prod-stock').value = product.stock;
            document.getElementById('prod-min-stock').value = product.minStock;
            document.getElementById('prod-unit').value = product.unit;
            document.getElementById('prod-notes').value = product.notes || '';
            document.getElementById('modal-product-title').textContent = 'تعديل بيانات المنتج';
        }
    } else {
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-barcode').value = ProductManager.generateBarcode();
        document.getElementById('modal-product-title').textContent = 'إضافة منتج جديد';
    }

    modal.classList.add('active');
}

async function saveProductFromModal() {
    const form = document.getElementById('form-product');
    const name = document.getElementById('prod-name').value.trim();
    if (!name) {
        showToast("يرجى إدخال اسم المنتج", "warning");
        return;
    }

    const data = {
        id: document.getElementById('prod-id').value || null,
        name: name,
        barcode: document.getElementById('prod-barcode').value,
        category: document.getElementById('prod-category').value,
        buyPrice: document.getElementById('prod-buy-price').value,
        sellPrice: document.getElementById('prod-sell-price').value,
        stock: document.getElementById('prod-stock').value,
        minStock: document.getElementById('prod-min-stock').value,
        unit: document.getElementById('prod-unit').value,
        notes: document.getElementById('prod-notes').value
    };

    await ProductManager.save(data);
    document.getElementById('modal-product').classList.remove('active');
    showToast("تم حفظ المنتج بنجاح", "success");
    renderProductsList();
}

async function deleteProductConfirm(productId) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟")) {
        await ProductManager.delete(productId);
        showToast("تم حذف المنتج", "primary");
        renderProductsList();
    }
}

// ----------------------------------------------------
// 4. SALES HISTORY & INVOICE PREVIEW
// ----------------------------------------------------
async function renderSalesHistory() {
    const sales = await SalesManager.getAllSales();
    const container = document.getElementById('sales-history-table-body');
    if (!container) return;

    if (sales.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="text-center text-muted">لا توجد مبيعات مسجلة</td></tr>`;
        return;
    }

    container.innerHTML = sales.map(s => `
        <tr>
            <td><strong>${s.invoiceNo}</strong></td>
            <td>${new Date(s.date).toLocaleString('ar-SA')}</td>
            <td>${s.customerName}</td>
            <td>${s.items.length} أصناف</td>
            <td><strong>${SettingsManager.formatCurrency(s.total)}</strong></td>
            <td>
                <span class="badge ${s.paymentMethod === 'cash' ? 'badge-success' : s.paymentMethod === 'card' ? 'badge-primary' : 'badge-warning'}">
                    ${s.paymentMethod === 'cash' ? 'نقداً' : s.paymentMethod === 'card' ? 'بطاقة' : 'آجل'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewInvoiceDetails(${s.id})">فاتورة</button>
            </td>
        </tr>
    `).join('');
}

async function viewInvoiceDetails(saleId) {
    const sale = await SalesManager.getSaleById(saleId);
    if (!sale) return;

    const modal = document.getElementById('modal-invoice');
    const container = document.getElementById('invoice-preview-content');

    const itemsHtml = sale.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${SettingsManager.formatCurrency(item.unitPrice)}</td>
            <td>${SettingsManager.formatCurrency(item.total)}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="background: var(--bg-surface); padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem;">
                <div>
                    <h3 style="font-size: 1.2rem; font-weight: bold;">${SettingsManager.get().storeName}</h3>
                    <div style="color: var(--text-muted); font-size: 0.85rem;">رقم الفاتورة: ${sale.invoiceNo}</div>
                    <div style="color: var(--text-muted); font-size: 0.85rem;">التاريخ: ${new Date(sale.date).toLocaleString('ar-SA')}</div>
                </div>
                <div style="text-align: left;">
                    <div style="font-size: 0.85rem;">العميل: <strong>${sale.customerName}</strong></div>
                    <div style="font-size: 0.85rem;">الكاشير: ${sale.cashierName}</div>
                </div>
            </div>

            <table class="data-table" style="margin-bottom: 1rem;">
                <thead>
                    <tr>
                        <th>الصنف</th>
                        <th>الكمية</th>
                        <th>سعر الوحدة</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="max-width: 300px; margin-right: auto; display: flex; flex-direction: column; gap: 0.4rem; border-top: 1px dashed var(--border-color); padding-top: 0.75rem;">
                <div style="display: flex; justify-content: space-between;">
                    <span>المجموع الفرعي:</span>
                    <span>${SettingsManager.formatCurrency(sale.subtotal)}</span>
                </div>
                ${sale.discountAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; color: var(--danger);">
                    <span>الخصم:</span>
                    <span>-${SettingsManager.formatCurrency(sale.discountAmount)}</span>
                </div>` : ''}
                ${sale.taxAmount > 0 ? `
                <div style="display: flex; justify-content: space-between;">
                    <span>الضريبة (${sale.taxRate}%):</span>
                    <span>${SettingsManager.formatCurrency(sale.taxAmount)}</span>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.15rem; color: var(--primary); border-top: 1px solid var(--border-color); padding-top: 0.4rem;">
                    <span>الإجمالي:</span>
                    <span>${SettingsManager.formatCurrency(sale.total)}</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-print-current-invoice').onclick = () => {
        SalesManager.printInvoice(sale);
    };

    modal.classList.add('active');
}

// ----------------------------------------------------
// 5. CUSTOMERS MANAGEMENT
// ----------------------------------------------------
async function renderCustomersList() {
    const searchVal = document.getElementById('customers-search-input')?.value || '';
    const customers = await CustomerManager.search(searchVal);
    const container = document.getElementById('customers-table-body');
    if (!container) return;

    if (customers.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="text-center text-muted">لا يوجد عملاء مسجلين</td></tr>`;
        return;
    }

    container.innerHTML = customers.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.phone || '-'}</td>
            <td>${c.address || '-'}</td>
            <td>
                <span class="badge ${c.balance > 0 ? 'badge-danger' : 'badge-success'}">
                    ${SettingsManager.formatCurrency(c.balance)}
                </span>
            </td>
            <td>${c.notes || '-'}</td>
            <td>
                ${c.balance > 0 ? `<button class="btn btn-sm btn-success" onclick="openSettleDebtModal(${c.id}, '${c.name}', ${c.balance})">سداد دين</button>` : ''}
                <button class="btn btn-sm btn-outline" onclick="openCustomerModal(${c.id})">تعديل</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomerConfirm(${c.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

async function openCustomerModal(customerId = null) {
    const modal = document.getElementById('modal-customer');
    const form = document.getElementById('form-customer');
    form.reset();

    if (customerId) {
        const customer = await CustomerManager.getById(customerId);
        if (customer) {
            document.getElementById('cust-id').value = customer.id;
            document.getElementById('cust-name').value = customer.name;
            document.getElementById('cust-phone').value = customer.phone;
            document.getElementById('cust-address').value = customer.address;
            document.getElementById('cust-balance').value = customer.balance;
            document.getElementById('cust-notes').value = customer.notes || '';
            document.getElementById('modal-customer-title').textContent = 'تعديل بيانات العميل';
        }
    } else {
        document.getElementById('cust-id').value = '';
        document.getElementById('modal-customer-title').textContent = 'إضافة عميل جديد';
    }

    modal.classList.add('active');
}

async function saveCustomerFromModal() {
    const name = document.getElementById('cust-name').value.trim();
    if (!name) {
        showToast("يرجى إدخال اسم العميل", "warning");
        return;
    }

    const data = {
        id: document.getElementById('cust-id').value || null,
        name: name,
        phone: document.getElementById('cust-phone').value,
        address: document.getElementById('cust-address').value,
        balance: document.getElementById('cust-balance').value,
        notes: document.getElementById('cust-notes').value
    };

    await CustomerManager.save(data);
    document.getElementById('modal-customer').classList.remove('active');
    showToast("تم حفظ بيانات العميل", "success");
    renderCustomersList();
}

async function deleteCustomerConfirm(id) {
    if (confirm("هل تريد حذف هذا العميل؟")) {
        await CustomerManager.delete(id);
        showToast("تم حذف العميل", "primary");
        renderCustomersList();
    }
}

function openSettleDebtModal(customerId, customerName, currentBalance) {
    const amount = prompt(`سداد دين العميل: ${customerName}\nالمبلغ المستحق: ${currentBalance} ${SettingsManager.get().currency}\nأدخل المبلغ المدفوع:`, currentBalance);
    if (amount !== null && !isNaN(amount) && Number(amount) > 0) {
        CustomerManager.recordPayment(customerId, Number(amount))
            .then(() => {
                showToast("تم تسجيل الدفعة وتخفيض الدين بنجاح", "success");
                renderCustomersList();
            })
            .catch(err => showToast(err.message, "danger"));
    }
}

// ----------------------------------------------------
// 6. SUPPLIERS MANAGEMENT
// ----------------------------------------------------
async function renderSuppliersList() {
    const searchVal = document.getElementById('suppliers-search-input')?.value || '';
    const suppliers = await SupplierManager.search(searchVal);
    const container = document.getElementById('suppliers-table-body');
    if (!container) return;

    if (suppliers.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="text-center text-muted">لا يوجد موردون مسجلون</td></tr>`;
        return;
    }

    container.innerHTML = suppliers.map(s => `
        <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.company || '-'}</td>
            <td>${s.phone || '-'}</td>
            <td>
                <span class="badge ${s.balance > 0 ? 'badge-danger' : 'badge-success'}">
                    ${SettingsManager.formatCurrency(s.balance)}
                </span>
            </td>
            <td>${s.address || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="openSupplierModal(${s.id})">تعديل</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSupplierConfirm(${s.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

async function openSupplierModal(supplierId = null) {
    const modal = document.getElementById('modal-supplier');
    const form = document.getElementById('form-supplier');
    form.reset();

    if (supplierId) {
        const supplier = await SupplierManager.getById(supplierId);
        if (supplier) {
            document.getElementById('supp-id').value = supplier.id;
            document.getElementById('supp-name').value = supplier.name;
            document.getElementById('supp-company').value = supplier.company;
            document.getElementById('supp-phone').value = supplier.phone;
            document.getElementById('supp-address').value = supplier.address;
            document.getElementById('supp-balance').value = supplier.balance;
            document.getElementById('supp-notes').value = supplier.notes || '';
            document.getElementById('modal-supplier-title').textContent = 'تعديل بيانات المورد';
        }
    } else {
        document.getElementById('supp-id').value = '';
        document.getElementById('modal-supplier-title').textContent = 'إضافة مورد جديد';
    }

    modal.classList.add('active');
}

async function saveSupplierFromModal() {
    const name = document.getElementById('supp-name').value.trim();
    if (!name) {
        showToast("يرجى إدخال اسم المورد", "warning");
        return;
    }

    const data = {
        id: document.getElementById('supp-id').value || null,
        name: name,
        company: document.getElementById('supp-company').value,
        phone: document.getElementById('supp-phone').value,
        address: document.getElementById('supp-address').value,
        balance: document.getElementById('supp-balance').value,
        notes: document.getElementById('supp-notes').value
    };

    await SupplierManager.save(data);
    document.getElementById('modal-supplier').classList.remove('active');
    showToast("تم حفظ بيانات المورد", "success");
    renderSuppliersList();
}

async function deleteSupplierConfirm(id) {
    if (confirm("هل تريد حذف هذا المورد؟")) {
        await SupplierManager.delete(id);
        showToast("تم حذف المورد", "primary");
        renderSuppliersList();
    }
}

// ----------------------------------------------------
// 7. PURCHASES MANAGEMENT
// ----------------------------------------------------
async function renderPurchasesList() {
    const purchases = await PurchaseManager.getAll();
    const container = document.getElementById('purchases-table-body');
    if (!container) return;

    if (purchases.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="text-center text-muted">لا توجد فواتير مشتريات مسجلة</td></tr>`;
        return;
    }

    container.innerHTML = purchases.map(p => `
        <tr>
            <td><strong>${p.invoiceNo}</strong></td>
            <td>${new Date(p.date).toLocaleDateString('ar-SA')}</td>
            <td>${p.supplierName}</td>
            <td>${p.items.length} أصناف</td>
            <td><strong>${SettingsManager.formatCurrency(p.total)}</strong></td>
            <td>
                <span class="badge ${p.remainingAmount > 0 ? 'badge-warning' : 'badge-success'}">
                    ${p.remainingAmount > 0 ? `متبقي ${SettingsManager.formatCurrency(p.remainingAmount)}` : 'مسدد بالكامل'}
                </span>
            </td>
        </tr>
    `).join('');
}

let newPurchaseItems = [];

async function openNewPurchaseModal() {
    const modal = document.getElementById('modal-purchase');
    const form = document.getElementById('form-purchase');
    form.reset();
    newPurchaseItems = [];
    updatePurchaseItemsTable();

    // Populate suppliers
    const suppliers = await SupplierManager.getAll();
    const suppSelect = document.getElementById('purchase-supplier-select');
    if (suppSelect) {
        suppSelect.innerHTML = `<option value="">مورد عام</option>` +
            suppliers.map(s => `<option value="${s.id}">${s.name} (${s.company})</option>`).join('');
    }

    // Populate product picker
    const products = await ProductManager.getAll();
    const prodSelect = document.getElementById('purchase-product-select');
    if (prodSelect) {
        prodSelect.innerHTML = `<option value="">اختر المنتج لإضافته للفاتورة...</option>` +
            products.map(p => `<option value="${p.id}" data-name="${p.name}" data-price="${p.buyPrice}">${p.name} (تكلفة: ${p.buyPrice})</option>`).join('');
    }

    modal.classList.add('active');
}

function addItemToPurchase() {
    const prodSelect = document.getElementById('purchase-product-select');
    const prodId = prodSelect.value;
    if (!prodId) return;

    const opt = prodSelect.selectedOptions[0];
    const name = opt.getAttribute('data-name');
    const defaultCost = Number(opt.getAttribute('data-price')) || 0;

    const qty = Number(document.getElementById('purchase-item-qty').value) || 1;
    const cost = Number(document.getElementById('purchase-item-cost').value) || defaultCost;

    newPurchaseItems.push({
        productId: Number(prodId),
        name: name,
        quantity: qty,
        costPrice: cost,
        total: qty * cost
    });

    updatePurchaseItemsTable();
    document.getElementById('purchase-item-qty').value = 1;
}

function updatePurchaseItemsTable() {
    const container = document.getElementById('purchase-items-table-body');
    if (!container) return;

    if (newPurchaseItems.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="text-center text-muted">أضف منتجات للفاتورة أعلاه</td></tr>`;
    } else {
        container.innerHTML = newPurchaseItems.map((item, idx) => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${SettingsManager.formatCurrency(item.costPrice)}</td>
                <td>${SettingsManager.formatCurrency(item.total)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="removePurchaseItem(${idx})">×</button></td>
            </tr>
        `).join('');
    }

    const total = newPurchaseItems.reduce((s, i) => s + i.total, 0);
    document.getElementById('purchase-total-display').textContent = SettingsManager.formatCurrency(total);
}

function removePurchaseItem(idx) {
    newPurchaseItems.splice(idx, 1);
    updatePurchaseItemsTable();
}

async function savePurchaseInvoice() {
    if (newPurchaseItems.length === 0) {
        showToast("يرجى إضافة صنف واحد على الأقل", "warning");
        return;
    }

    const suppSelect = document.getElementById('purchase-supplier-select');
    const supplierId = suppSelect.value || null;
    const supplierName = suppSelect.selectedOptions[0]?.text || 'مورد عام';
    const invoiceNo = document.getElementById('purchase-invoice-no').value || `PUR-${Date.now().toString().slice(-6)}`;
    const paidAmount = Number(document.getElementById('purchase-paid-amount').value);

    try {
        await PurchaseManager.createPurchase({
            invoiceNo,
            supplierId,
            supplierName,
            items: newPurchaseItems,
            paidAmount: isNaN(paidAmount) ? undefined : paidAmount,
            notes: document.getElementById('purchase-notes').value
        });

        document.getElementById('modal-purchase').classList.remove('active');
        showToast("تم تسجيل فاتورة الشراء وتحديث كميات المخزون بنجاح", "success");
        renderPurchasesList();
    } catch (e) {
        showToast(e.message, "danger");
    }
}

// ----------------------------------------------------
// 8. EXPENSES & NET PROFIT VIEW
// ----------------------------------------------------
async function renderExpensesList() {
    const expenses = await ExpenseManager.getAll();
    const summary = await ExpenseManager.getProfitSummary();
    const container = document.getElementById('expenses-table-body');

    document.getElementById('exp-today-total').textContent = SettingsManager.formatCurrency(summary.todayExpensesAmount);
    document.getElementById('exp-today-gross').textContent = SettingsManager.formatCurrency(summary.todayGrossProfit);
    document.getElementById('exp-today-net').textContent = SettingsManager.formatCurrency(summary.todayNetProfit);

    if (!container) return;

    if (expenses.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="text-center text-muted">لا توجد مصروفات مسجلة</td></tr>`;
        return;
    }

    container.innerHTML = expenses.map(e => `
        <tr>
            <td><strong>${e.title}</strong></td>
            <td><span class="badge badge-gray">${e.category}</span></td>
            <td><strong>${SettingsManager.formatCurrency(e.amount)}</strong></td>
            <td>${new Date(e.date).toLocaleDateString('ar-SA')}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteExpenseConfirm(${e.id})">حذف</button>
            </td>
        </tr>
    `).join('');
}

function openExpenseModal() {
    const modal = document.getElementById('modal-expense');
    document.getElementById('form-expense').reset();
    document.getElementById('exp-date').value = new Date().toISOString().slice(0, 10);
    modal.classList.add('active');
}

async function saveExpenseFromModal() {
    const title = document.getElementById('exp-title').value.trim();
    const amount = Number(document.getElementById('exp-amount').value);

    if (!title || isNaN(amount) || amount <= 0) {
        showToast("يرجى ملء بيانات المصروف بشكل صحيح", "warning");
        return;
    }

    await ExpenseManager.save({
        title,
        category: document.getElementById('exp-category').value,
        amount,
        date: document.getElementById('exp-date').value ? new Date(document.getElementById('exp-date').value).toISOString() : new Date().toISOString(),
        notes: document.getElementById('exp-notes').value
    });

    document.getElementById('modal-expense').classList.remove('active');
    showToast("تم حفظ المصروف بنجاح", "success");
    renderExpensesList();
}

async function deleteExpenseConfirm(id) {
    if (confirm("هل تريد حذف هذا المصروف؟")) {
        await ExpenseManager.delete(id);
        showToast("تم حذف المصروف", "primary");
        renderExpensesList();
    }
}

// ----------------------------------------------------
// 9. REPORTS VIEW
// ----------------------------------------------------
async function renderReports() {
    const range = document.getElementById('reports-time-range')?.value || 'today';
    const analytics = await ReportsManager.getSalesAnalytics(range);

    document.getElementById('rep-sales-count').textContent = analytics.salesCount;
    document.getElementById('rep-total-revenue').textContent = SettingsManager.formatCurrency(analytics.totalRevenue);
    document.getElementById('rep-gross-profit').textContent = SettingsManager.formatCurrency(analytics.grossProfit);
    document.getElementById('rep-total-expenses').textContent = SettingsManager.formatCurrency(analytics.totalExpenses);
    document.getElementById('rep-net-profit').textContent = SettingsManager.formatCurrency(analytics.netProfit);

    document.getElementById('rep-cash-sales').textContent = SettingsManager.formatCurrency(analytics.cashSales);
    document.getElementById('rep-card-sales').textContent = SettingsManager.formatCurrency(analytics.cardSales);
    document.getElementById('rep-credit-sales').textContent = SettingsManager.formatCurrency(analytics.creditSales);

    // Top products table
    const topContainer = document.getElementById('rep-top-products-body');
    if (topContainer) {
        if (analytics.topProducts.length === 0) {
            topContainer.innerHTML = `<tr><td colspan="3" class="text-center text-muted">لا توجد بيانات مبيعات في هذه الفترة</td></tr>`;
        } else {
            topContainer.innerHTML = analytics.topProducts.map(p => `
                <tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.quantity} قطعة</td>
                    <td><strong>${SettingsManager.formatCurrency(p.revenue)}</strong></td>
                </tr>
            `).join('');
        }
    }
}

// ----------------------------------------------------
// 10. SETTINGS & PREFERENCES VIEW
// ----------------------------------------------------
function renderSettingsForm() {
    const settings = SettingsManager.get();
    document.getElementById('set-store-name').value = settings.storeName;
    document.getElementById('set-store-phone').value = settings.storePhone;
    document.getElementById('set-store-address').value = settings.storeAddress;
    document.getElementById('set-currency').value = settings.currency;
    document.getElementById('set-tax-rate').value = settings.taxRate;
    document.getElementById('set-enable-tax').checked = settings.enableTax;
    document.getElementById('set-invoice-note').value = settings.invoiceFooterNote;
    document.getElementById('set-theme').value = settings.theme;

    // License info
    const licInfo = LicenseManager.checkStatus();
    document.getElementById('lic-status-badge').textContent = licInfo.statusText;
}

async function saveSettingsFromForm() {
    const newSettings = {
        storeName: document.getElementById('set-store-name').value.trim(),
        storePhone: document.getElementById('set-store-phone').value.trim(),
        storeAddress: document.getElementById('set-store-address').value.trim(),
        currency: document.getElementById('set-currency').value.trim(),
        taxRate: Number(document.getElementById('set-tax-rate').value) || 0,
        enableTax: document.getElementById('set-enable-tax').checked,
        invoiceFooterNote: document.getElementById('set-invoice-note').value.trim(),
        theme: document.getElementById('set-theme').value
    };

    await SettingsManager.save(newSettings);
    showToast("تم حفظ الإعدادات بنجاح", "success");
}

// ----------------------------------------------------
// 11. BACKUP & RESTORE VIEW
// ----------------------------------------------------
function renderBackupView() {
    // Ready for backup interactions
}

async function triggerBackupExport() {
    try {
        const filename = await BackupManager.exportBackupFile();
        showToast(`تم تصدير النسخة الاحتياطية: ${filename}`, "success");
    } catch (e) {
        showToast("فشل تصدير النسخة الاحتياطية", "danger");
    }
}

async function triggerBackupRestore() {
    const fileInput = document.getElementById('backup-file-input');
    const file = fileInput.files[0];
    if (!file) {
        showToast("يرجى اختيار ملف النسخة الاحتياطية أولاً", "warning");
        return;
    }

    if (confirm("تحذير: استعادة النسخة الاحتياطية ستستبدل البيانات الحالية ببيانات الملف. هل تريد المتابعة؟")) {
        try {
            await BackupManager.importBackupFile(file);
            showToast("تمت استعادة البيانات بنجاح!", "success");
            navigateTo('dashboard');
        } catch (e) {
            showToast(e.message || "فشلت استعادة البيانات", "danger");
        }
    }
}

async function triggerLoadSampleData() {
    if (confirm("هل تريد تحميل بيانات تجريبية (منتجات، عملاء، وموردين)؟")) {
        await BackupManager.loadSampleData();
        showToast("تم تحميل البيانات التجريبية بنجاح", "success");
        navigateTo('dashboard');
    }
}

// ----------------------------------------------------
// Modals & General Event Listeners
// ----------------------------------------------------
function setupModals() {
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) modal.classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });
}

function setupEventListeners() {
    // Login Form Submit
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameOrPin = document.getElementById('login-pin').value;
            const res = await AuthManager.login(usernameOrPin);
            if (res.success) {
                showAppView();
                navigateTo('dashboard');
                showToast(`مرحباً ${res.user.name}`, "success");
            } else {
                showToast(res.message, "danger");
            }
        });
    }

    // POS barcode input listener (Enter key)
    const posBarcodeInput = document.getElementById('pos-barcode-input');
    if (posBarcodeInput) {
        posBarcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handlePOSBarcodeScan(posBarcodeInput.value);
            }
        });
    }

    // POS search live filter
    const posSearchInput = document.getElementById('pos-search-input');
    if (posSearchInput) {
        posSearchInput.addEventListener('input', async (e) => {
            const products = await ProductManager.search(e.target.value, currentCategoryFilter);
            renderPOSProducts(products);
        });
    }

    // Product search in Products Screen
    const prodSearchInput = document.getElementById('products-search-input');
    if (prodSearchInput) {
        prodSearchInput.addEventListener('input', renderProductsList);
    }
    const prodCatFilter = document.getElementById('products-category-filter');
    if (prodCatFilter) {
        prodCatFilter.addEventListener('change', renderProductsList);
    }
    const prodLowCheck = document.getElementById('products-low-stock-check');
    if (prodLowCheck) {
        prodLowCheck.addEventListener('change', renderProductsList);
    }
}

// ----------------------------------------------------
// Toast Notification
// ----------------------------------------------------
function showToast(message, type = 'primary') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' :
              type === 'danger' ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' :
              '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
        </svg>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}
