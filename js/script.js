/* MoneyMap Interactivity & Persistence */

/**
 * MoneyMapStore - Unified data management for the application
 * Handles localStorage-backed application data.
 */
class MoneyMapStore {
    constructor() {
        this.STORAGE_KEY = 'moneymap_data_guest';
        this.SCHEMA_VERSION = 2;
        this.init();
    }

    setStorageKey(nextKey) {
        if (!nextKey || typeof nextKey !== 'string') return;
        if (this.STORAGE_KEY === nextKey && this.data) return;
        this.STORAGE_KEY = nextKey;
        this.init();
    }

    getDefaultData() {
        return {
            schemaVersion: this.SCHEMA_VERSION,
            transactions: [
                { id: 1, type: 'income', category: 'Salary', amount: 5000, description: 'Monthly Salary', date: '2025-01-20' },
                { id: 2, type: 'expense', category: 'Food', amount: 150, description: 'Grocery shopping', date: '2024-11-15' },
                { id: 3, type: 'expense', category: 'Bills', amount: 200, description: 'Electricity bill', date: '2024-03-10' }
            ],
            settings: {
                currency: 'USD',
                darkMode: false,
                userName: 'Sarah Jenkins',
                emailNotificationsEnabled: true,
                sessionTimeoutMinutes: 30,
                autoLogoutEnabled: true
            },
            categories: [
                { id: 1, name: 'Salary', type: 'income', color: '#2ecc71' },
                { id: 2, name: 'Freelance', type: 'income', color: '#3498db' },
                { id: 3, name: 'Food', type: 'expense', color: '#e67e22' },
                { id: 4, name: 'Bills', type: 'expense', color: '#e74c3c' },
                { id: 5, name: 'Shopping', type: 'expense', color: '#9b59b6' },
                { id: 6, name: 'Transportation', type: 'expense', color: '#34495e' }
            ]
        };
    }

    migrateData(parsedData, defaultData) {
        const normalized = {
            schemaVersion: Number(parsedData?.schemaVersion || 1),
            transactions: Array.isArray(parsedData?.transactions) ? parsedData.transactions : defaultData.transactions,
            settings: { ...defaultData.settings, ...(parsedData?.settings || {}) },
            categories: Array.isArray(parsedData?.categories) ? parsedData.categories : defaultData.categories
        };

        if (normalized.schemaVersion < 2) {
            normalized.settings = {
                ...normalized.settings,
                sessionTimeoutMinutes: normalized.settings.sessionTimeoutMinutes || 30,
                autoLogoutEnabled: normalized.settings.autoLogoutEnabled !== false
            };
            normalized.schemaVersion = 2;
        }

        normalized.schemaVersion = this.SCHEMA_VERSION;
        return normalized;
    }

    init() {
        const defaultData = this.getDefaultData();

        // Load data from localStorage or initialize defaults
        const rawData = localStorage.getItem(this.STORAGE_KEY);
        if (rawData) {
            try {
                const parsed = JSON.parse(rawData);
                this.data = this.migrateData(parsed, defaultData);
                this.save();
            } catch (e) {
                this.data = defaultData;
                this.save();
            }
        } else {
            this.data = defaultData;
            this.save();
        }

    }

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }

    exportBackup() {
        return {
            app: 'MoneyMap',
            schemaVersion: this.SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            data: this.data
        };
    }

    importBackup(backupPayload) {
        const defaultData = this.getDefaultData();
        const candidate = backupPayload && backupPayload.data ? backupPayload.data : backupPayload;

        if (!candidate || typeof candidate !== 'object') {
            throw new Error('Invalid backup file format.');
        }

        this.data = this.migrateData(candidate, defaultData);
        this.save();
        this.applyTheme();
    }

    // --- Transaction Methods ---
    addTransaction(transaction) {
        transaction.id = Date.now();
        this.data.transactions.unshift(transaction);
        this.save();
        return transaction;
    }

    updateTransaction(id, updates) {
        const index = this.data.transactions.findIndex(t => t.id === id);
        if (index === -1) return false;

        this.data.transactions[index] = { ...this.data.transactions[index], ...updates };
        this.save();
        return true;
    }

    deleteTransaction(id) {
        const beforeLength = this.data.transactions.length;
        this.data.transactions = this.data.transactions.filter(t => t.id !== id);
        if (this.data.transactions.length === beforeLength) return false;
        this.save();
        return true;
    }

    getTransactions() {
        return this.data.transactions;
    }

    getTotals() {
        const income = this.data.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expenses = this.data.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        return { income, expenses, balance: income - expenses };
    }

    // --- Category Methods ---
    getCategories() {
        return this.data.categories;
    }

    addCategory(category) {
        category.id = Date.now();
        this.data.categories.push(category);
        this.save();
        return category;
    }

    updateCategory(id, updates) {
        const index = this.data.categories.findIndex(c => c.id === id);
        if (index === -1) return false;

        this.data.categories[index] = { ...this.data.categories[index], ...updates };
        this.save();
        return true;
    }

    deleteCategory(id) {
        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this.save();
    }

    // --- Settings Methods ---
    getSettings() {
        return this.data.settings;
    }

    updateSettings(newSettings) {
        this.data.settings = { ...this.data.settings, ...newSettings };
        this.save();
        // Apply immediate changes if needed (like theme)
        this.applyTheme();
    }

    applyTheme() {
        if (this.data.settings.darkMode) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }

}

// Global Store Instance
const mmStore = new MoneyMapStore();

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // AUTHENTICATION & STORAGE MANAGER
    // ============================================
    const StorageManager = {
        get(key, fallback = null) {
            try {
                const raw = localStorage.getItem(key);
                return raw !== null ? JSON.parse(raw) : fallback;
            } catch (e) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                return false;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                // no-op
            }
        }
    };

    const AuthManager = {
        USERS_KEY: 'mm_users',
        SESSION_KEY: 'mm_session',
        LAST_EMAIL_KEY: 'mm_last_email',
        LAST_PAGE_KEY: 'mm_last_app_page',
        LAST_LOGIN_KEY: 'mm_last_login_at',
        LAST_ACTIVITY_KEY: 'mm_last_activity',
        DEFAULT_TIMEOUT_MINUTES: 30,
        normalizeEmail(email) {
            return String(email || '').trim().toLowerCase();
        },
        async hashPassword(rawPassword) {
            const source = String(rawPassword || '');
            if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
                return `fallback_${btoa(source)}`;
            }

            const bytes = new TextEncoder().encode(source);
            const digest = await window.crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
        },
        getUsers() {
            const users = StorageManager.get(this.USERS_KEY, []);
            if (!Array.isArray(users)) return [];

            let changed = false;
            const normalized = users.map(user => {
                const next = { ...user };
                if (!next.id) {
                    next.id = Date.now() + Math.floor(Math.random() * 10000);
                    changed = true;
                }
                next.email = this.normalizeEmail(next.email);
                if (!next.createdAt) {
                    next.createdAt = new Date().toISOString();
                    changed = true;
                }
                return next;
            });

            if (changed) {
                this.saveUsers(normalized);
            }
            return normalized;
        },
        saveUsers(users) {
            StorageManager.set(this.USERS_KEY, users);
        },
        getSession() {
            const session = StorageManager.get(this.SESSION_KEY, null);
            if (!session || !session.token) return null;

            if (!session.userId && session.email) {
                const users = this.getUsers();
                const user = users.find(u => this.normalizeEmail(u.email) === this.normalizeEmail(session.email));
                if (user) {
                    const patchedSession = { ...session, userId: user.id, userName: user.userName, email: user.email };
                    StorageManager.set(this.SESSION_KEY, patchedSession);
                    return patchedSession;
                }
            }
            return session;
        },
        getDataStorageKey(userId) {
            return `moneymap_data_u_${String(userId || 'guest')}`;
        },
        getCurrentUserRecord() {
            const session = this.getSession();
            if (!session || !session.userId) return null;
            const users = this.getUsers();
            return users.find(u => u.id === session.userId) || null;
        },
        async register({ userName, email, password }) {
            const normalizedEmail = this.normalizeEmail(email);
            const cleanName = String(userName || '').trim();
            if (!cleanName || !normalizedEmail || !password) {
                return { ok: false, message: 'Please fill all signup fields.' };
            }

            const users = this.getUsers();
            const exists = users.some(u => this.normalizeEmail(u.email) === normalizedEmail);
            if (exists) {
                return { ok: false, message: 'Account already exists for this email.' };
            }

            const nextUser = {
                id: Date.now() + Math.floor(Math.random() * 10000),
                userName: cleanName,
                email: normalizedEmail,
                passwordHash: await this.hashPassword(password),
                occupation: '',
                avatarDataUrl: '',
                notificationsEnabled: true,
                createdAt: new Date().toISOString()
            };
            users.push(nextUser);
            this.saveUsers(users);
            return { ok: true, user: nextUser };
        },
        async login({ email, password }) {
            const normalizedEmail = this.normalizeEmail(email);
            const users = this.getUsers();
            const user = users.find(u => this.normalizeEmail(u.email) === normalizedEmail);
            if (!user) {
                return { ok: false, message: 'Invalid email or password.' };
            }

            let valid = false;
            if (user.passwordHash) {
                const attemptedHash = await this.hashPassword(password);
                valid = attemptedHash === user.passwordHash;
            } else if (user.password) {
                // Legacy user migration from plain text password to hash.
                valid = user.password === password;
                if (valid) {
                    user.passwordHash = await this.hashPassword(password);
                    delete user.password;
                    this.saveUsers(users);
                }
            }

            if (!valid) {
                return { ok: false, message: 'Invalid email or password.' };
            }

            const session = {
                token: btoa(`${normalizedEmail}:${Date.now()}`),
                userId: user.id,
                email: user.email,
                userName: user.userName,
                loginAt: new Date().toISOString()
            };

            StorageManager.set(this.SESSION_KEY, session);
            StorageManager.set(this.LAST_LOGIN_KEY, session.loginAt);
            StorageManager.set(this.LAST_EMAIL_KEY, user.email);
            this.recordActivity();
            return { ok: true, user, session };
        },
        async changePassword(currentPassword, nextPassword) {
            const users = this.getUsers();
            const currentUser = this.getCurrentUserRecord();
            if (!currentUser) return { ok: false, message: 'No active user.' };

            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex === -1) return { ok: false, message: 'User not found.' };

            const currentHash = await this.hashPassword(currentPassword);
            if (users[userIndex].passwordHash !== currentHash) {
                return { ok: false, message: 'Current password is incorrect.' };
            }

            users[userIndex].passwordHash = await this.hashPassword(nextPassword);
            this.saveUsers(users);
            return { ok: true };
        },
        updateCurrentUser(updates) {
            const users = this.getUsers();
            const currentUser = this.getCurrentUserRecord();
            if (!currentUser) return { ok: false, message: 'No active user.' };

            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex === -1) return { ok: false, message: 'User not found.' };

            const nextEmail = updates.email ? this.normalizeEmail(updates.email) : users[userIndex].email;
            const duplicateEmail = users.some((u, idx) => idx !== userIndex && this.normalizeEmail(u.email) === nextEmail);
            if (duplicateEmail) {
                return { ok: false, message: 'Email already used by another account.' };
            }

            users[userIndex] = {
                ...users[userIndex],
                ...updates,
                email: nextEmail
            };

            this.saveUsers(users);

            const session = this.getSession();
            if (session) {
                StorageManager.set(this.SESSION_KEY, {
                    ...session,
                    email: users[userIndex].email,
                    userName: users[userIndex].userName
                });
                StorageManager.set(this.LAST_EMAIL_KEY, users[userIndex].email);
            }

            return { ok: true, user: users[userIndex] };
        },
        deleteCurrentUser() {
            const users = this.getUsers();
            const currentUser = this.getCurrentUserRecord();
            if (!currentUser) return { ok: false, message: 'No active user.' };

            const remaining = users.filter(u => u.id !== currentUser.id);
            this.saveUsers(remaining);
            localStorage.removeItem(this.getDataStorageKey(currentUser.id));
            this.logout('Account deleted successfully.');
            return { ok: true };
        },
        logout(reasonMessage = '') {
            StorageManager.remove(this.SESSION_KEY);
            StorageManager.remove(this.LAST_ACTIVITY_KEY);
            if (reasonMessage) {
                StorageManager.set('mm_logout_reason', reasonMessage);
            }

            const currentPath = window.location.pathname.replace(/\\/g, '/');
            const loginPath = currentPath.includes('/app/') ? '../login.html' : 'login.html';
            window.location.href = loginPath;
        },
        isAuthenticated() {
            const session = this.getSession();
            return Boolean(session && session.token && session.userId);
        },
        getUser() {
            const user = this.getCurrentUserRecord();
            if (!user) return null;
            return { userName: user.userName, email: user.email };
        },
        getLastVisitedPage() {
            return StorageManager.get(this.LAST_PAGE_KEY, 'app/dashboard.html');
        },
        saveLastVisitedPage() {
            const path = window.location.pathname.replace(/\\/g, '/');
            const appIndex = path.indexOf('/app/');
            if (appIndex === -1) return;

            const appPart = path.substring(appIndex + 1);
            if (appPart.endsWith('.html')) {
                StorageManager.set(this.LAST_PAGE_KEY, appPart);
            }
        },
        getRememberedEmail() {
            return StorageManager.get(this.LAST_EMAIL_KEY, '');
        },
        recordActivity() {
            StorageManager.set(this.LAST_ACTIVITY_KEY, Date.now());
        },
        getLastActivity() {
            const fromStorage = StorageManager.get(this.LAST_ACTIVITY_KEY, null);
            return typeof fromStorage === 'number' && Number.isFinite(fromStorage) ? fromStorage : Date.now();
        },
        getTimeoutMs() {
            const settings = mmStore.getSettings();
            const minutes = Number(settings?.sessionTimeoutMinutes || this.DEFAULT_TIMEOUT_MINUTES);
            return Math.max(5, minutes) * 60 * 1000;
        },
        isAutoLogoutEnabled() {
            const settings = mmStore.getSettings();
            return settings?.autoLogoutEnabled !== false;
        },
        isSessionExpired() {
            if (!this.isAutoLogoutEnabled()) return false;
            return Date.now() - this.getLastActivity() > this.getTimeoutMs();
        }
    };

    const ToastManager = {
        TOAST_ID: 'mm-global-toast',
        ensureToast() {
            let toast = document.getElementById(this.TOAST_ID);
            if (toast) return toast;

            toast = document.createElement('div');
            toast.id = this.TOAST_ID;
            toast.className = 'mm-toast';
            toast.innerHTML = '<i class="fa-solid fa-circle-info mm-toast-icon" aria-hidden="true"></i><span class="mm-toast-text"></span>';
            document.body.appendChild(toast);
            return toast;
        },
        show(message, type = 'success', duration = 2600) {
            const toast = this.ensureToast();
            const text = toast.querySelector('.mm-toast-text');
            const icon = toast.querySelector('.mm-toast-icon');
            if (!text || !icon) return;

            const iconByType = {
                success: 'fa-circle-check',
                error: 'fa-circle-exclamation',
                info: 'fa-circle-info'
            };

            icon.className = `fa-solid ${iconByType[type] || iconByType.info} mm-toast-icon`;
            text.textContent = message;

            toast.classList.remove('mm-toast-success', 'mm-toast-error', 'mm-toast-info', 'mm-toast-visible');
            toast.classList.add(`mm-toast-${type}`);

            // Reflow to replay animation if called quickly.
            void toast.offsetWidth;
            toast.classList.add('mm-toast-visible');

            window.clearTimeout(this._hideTimer);
            this._hideTimer = window.setTimeout(() => {
                toast.classList.remove('mm-toast-visible');
            }, duration);
        }
    };

    const activeSession = AuthManager.getSession();
    if (activeSession && activeSession.userId) {
        mmStore.setStorageKey(AuthManager.getDataStorageKey(activeSession.userId));
    }

    // Protect application routes
    const isAppRoute = window.location.pathname.includes('/app/');
    if (isAppRoute && !AuthManager.isAuthenticated()) {
        // Redirect unauthorized users to login page
        window.location.href = '../login.html';
        return; // Halt execution of app scripts
    }

    if (isAppRoute && AuthManager.isSessionExpired()) {
        AuthManager.logout('Session expired due to inactivity.');
        return;
    }

    const isLoginPage = /\/login\.html$/i.test(window.location.pathname.replace(/\\/g, '/'));
    if (!isAppRoute && isLoginPage && AuthManager.isAuthenticated()) {
        window.location.href = AuthManager.getLastVisitedPage();
        return;
    }

    if (isAppRoute) {
        AuthManager.saveLastVisitedPage();
        AuthManager.recordActivity();

        const activityEvents = ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        let activityThrottle = 0;
        const activityHandler = () => {
            const now = Date.now();
            if (now - activityThrottle < 10000) return;
            activityThrottle = now;
            AuthManager.recordActivity();
        };

        activityEvents.forEach(evt => {
            window.addEventListener(evt, activityHandler, { passive: true });
        });

        window.setInterval(() => {
            if (AuthManager.isSessionExpired()) {
                AuthManager.logout('Session expired due to inactivity.');
            }
        }, 30000);
    }

    const logoutReason = StorageManager.get('mm_logout_reason', '');
    if (logoutReason && !isAppRoute) {
        ToastManager.show(logoutReason, 'info', 3200);
        StorageManager.remove('mm_logout_reason');
    }

    if (!isAppRoute && AuthManager.isAuthenticated()) {
        const dashboardHref = AuthManager.getLastVisitedPage();
        document.querySelectorAll('#btn-login, #btn-get-started, #hero-login-btn, #hero-signup-btn').forEach(link => {
            if (link && link.tagName === 'A') {
                link.setAttribute('href', dashboardHref);
            }
        });

        const loginBtn = document.getElementById('btn-login');
        if (loginBtn) loginBtn.textContent = 'Account';

        const getStartedBtn = document.getElementById('btn-get-started');
        if (getStartedBtn) getStartedBtn.textContent = 'Open App';

        // Avoid duplicated Dashboard entries in the public header when authenticated.
        document.querySelectorAll('#nav-desktop .nav-link, #nav-mobile .nav-link').forEach(link => {
            const text = (link.textContent || '').trim().toLowerCase();
            if (text === 'dashboard') {
                link.remove();
            }
        });
    }

    const setPublicNavActiveState = () => {
        if (isAppRoute) return;

        const currentPath = window.location.pathname.replace(/\\/g, '/');
        const currentPage = currentPath.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('#nav-desktop .nav-link, #nav-mobile .nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const targetPage = href.split('/').pop() || '';
            const isMatch = targetPage === currentPage;
            link.classList.toggle('active', isMatch);
        });
    };

    setPublicNavActiveState();

    // Attach logout to any logout buttons if present
    document.querySelectorAll('.logout-btn, .logout-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            AuthManager.logout();
        });
    });


    // 1. Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMobile = document.getElementById('nav-mobile');
    const header = document.querySelector('.header');

    if (mobileToggle && navMobile) {
        mobileToggle.addEventListener('click', () => {
            navMobile.classList.toggle('active');

            // Animation for hamburger bars
            const bars = mobileToggle.querySelectorAll('.toggle-bar');
            bars.forEach(bar => bar.classList.toggle('active'));
        });

        // Close menu on link click
        navMobile.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMobile.classList.remove('active');
            });
        });
    }

    // 2. Sticky Header Effects
    window.addEventListener('scroll', () => {
        if (header && window.scrollY > 20) {
            header.style.padding = '0.25rem 0';
            header.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)';
        } else if (header) {
            header.style.padding = '0';
            header.style.boxShadow = 'none';
        }
    });

    // 3. Scroll Reveal Animations (Intersection Observer)
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        threshold: 0.15
    });

    document.querySelectorAll('.reveal, .reveal-delayed').forEach(el => {
        revealObserver.observe(el);
    });

    // 3b. Stats Counter Animation
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    if (statNumbers.length > 0) {
        const animateStat = (el) => {
            const targetValue = Number(el.dataset.target || 0);
            const suffix = el.dataset.suffix || '';
            const durationMs = 1400;
            const startTime = performance.now();

            const tick = (now) => {
                const progress = Math.min((now - startTime) / durationMs, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(targetValue * eased);
                el.textContent = `${current.toLocaleString()}${suffix}`;

                if (progress < 1) {
                    window.requestAnimationFrame(tick);
                }
            };

            window.requestAnimationFrame(tick);
        };

        const statsObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const el = entry.target;
                if (!el.dataset.animated) {
                    el.dataset.animated = 'true';
                    animateStat(el);
                }

                observer.unobserve(el);
            });
        }, { threshold: 0.35 });

        statNumbers.forEach((el) => {
            const suffix = el.dataset.suffix || '';
            el.textContent = `0${suffix}`;
            statsObserver.observe(el);
        });
    }

    // 4. Initialize Theme from Store
    mmStore.applyTheme();

    // 5. Global UI Updates from Store
    const PAGE_SIZE = 10;
    const listState = {
        income: { page: 1, filtered: null },
        expense: { page: 1, filtered: null }
    };

    const renderPagination = (type, totalItems) => {
        const paginationInfo = document.querySelector('.pagination-info');
        const paginationLinks = document.querySelector('.pagination-links');
        if (!paginationInfo || !paginationLinks) return;

        const currentPage = listState[type].page;
        const pageCount = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        const start = totalItems === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1;
        const end = Math.min(currentPage * PAGE_SIZE, totalItems);

        paginationInfo.textContent = `Showing ${start} to ${end} of ${totalItems} entries`;

        let linksHtml = '';
        for (let i = 1; i <= pageCount; i += 1) {
            linksHtml += `<a href="#" class="page-link ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</a>`;
        }

        if (currentPage < pageCount) {
            linksHtml += '<a href="#" class="page-link" data-page="next">Next <i class="fa-solid fa-chevron-right"></i></a>';
        }

        paginationLinks.innerHTML = linksHtml;
        paginationLinks.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageValue = link.dataset.page;
                if (pageValue === 'next') {
                    listState[type].page = Math.min(pageCount, listState[type].page + 1);
                } else {
                    listState[type].page = Number(pageValue);
                }

                if (type === 'income') {
                    renderIncomeList();
                } else {
                    renderExpenseList();
                }
            });
        });
    };

    const renderIncomeList = () => {
        const tableBody = document.getElementById('income-list-body');
        if (!tableBody) return;

        const data = listState.income.filtered || mmStore.getTransactions().filter(t => t.type === 'income');
        const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
        if (listState.income.page > pageCount) listState.income.page = pageCount;

        const startIndex = (listState.income.page - 1) * PAGE_SIZE;
        const pageRows = data.slice(startIndex, startIndex + PAGE_SIZE);

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="table-empty-cell">No income records found.</td></tr>';
            renderPagination('income', 0);
            return;
        }

        tableBody.innerHTML = pageRows.map(t => `
            <tr data-transaction-id="${t.id}">
                <td><input type="checkbox"></td>
                <td>
                    <div class="author-cell table-author-cell">
                        <img src="../assets/user-sarah.webp" class="author-avatar table-author-avatar" alt="Sarah">
                        <div class="author-info table-author-info">
                            <span class="author-name table-author-name">Sarah Jenkins</span>
                            <span class="author-role table-author-role">Member</span>
                        </div>
                    </div>
                </td>
                <td class="table-text-primary">${t.description}</td>
                <td><span class="badge badge-income">${t.category}</span></td>
                <td class="table-text-muted">${new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                <td class="table-amount-income">+$${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td class="table-action-cell">
                    <button class="action-btn" type="button" data-action="edit" title="Edit transaction"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn" type="button" data-action="delete" title="Delete transaction"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        renderPagination('income', data.length);
    };

    const renderExpenseList = () => {
        const tableBody = document.getElementById('expense-list-body');
        if (!tableBody) return;

        const data = listState.expense.filtered || mmStore.getTransactions().filter(t => t.type === 'expense');
        const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
        if (listState.expense.page > pageCount) listState.expense.page = pageCount;

        const startIndex = (listState.expense.page - 1) * PAGE_SIZE;
        const pageRows = data.slice(startIndex, startIndex + PAGE_SIZE);

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="table-empty-cell">No expense records found.</td></tr>';
            renderPagination('expense', 0);
            return;
        }

        tableBody.innerHTML = pageRows.map(t => `
            <tr data-transaction-id="${t.id}">
                <td><input type="checkbox"></td>
                <td>
                    <div class="author-cell table-author-cell">
                        <img src="../assets/user-sarah.webp" class="author-avatar table-author-avatar" alt="Sarah">
                        <div class="author-info table-author-info">
                            <span class="author-name table-author-name">Sarah Jenkins</span>
                            <span class="author-role table-author-role">Member</span>
                        </div>
                    </div>
                </td>
                <td class="table-text-primary">${t.description}</td>
                <td><span class="badge badge-expense">${t.category}</span></td>
                <td class="table-text-muted">${new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                <td class="table-amount-expense text-expense">-$${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td><span class="badge badge-income badge-verified">Verified</span></td>
                <td class="table-action-cell">
                    <button class="action-btn" type="button" data-action="edit" title="Edit transaction"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn" type="button" data-action="delete" title="Delete transaction"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        renderPagination('expense', data.length);
    };

    const updateDashboardKPIs = () => {
        const totals = mmStore.getTotals();
        const incomeEl = document.querySelector('.icon-income + .kpi-info .kpi-value');
        const expenseEl = document.querySelector('.icon-expense + .kpi-info .kpi-value');
        const balanceEl = document.querySelector('.icon-balance + .kpi-info .kpi-value');
        const transCountEl = document.querySelector('.icon-transactions + .kpi-info .kpi-value');

        if (incomeEl) incomeEl.innerText = `$${totals.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        if (expenseEl) expenseEl.innerText = `$${totals.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        if (balanceEl) balanceEl.innerText = `$${totals.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        if (transCountEl) transCountEl.innerText = mmStore.getTransactions().length;
    };

    const updateGlobalUserInfo = () => {
        const lUser = AuthManager.getUser();
        const currentUser = AuthManager.getCurrentUserRecord();
        const fallbackName = lUser && lUser.userName ? lUser.userName : mmStore.getSettings().userName || 'Member';
        document.querySelectorAll('.user-name, .author-name').forEach(el => {
            el.innerText = fallbackName;
        });

        const profileHeader = document.getElementById('profile-display-name');
        if (profileHeader) {
            profileHeader.innerText = fallbackName;
        }

        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar && currentUser && currentUser.avatarDataUrl) {
            profileAvatar.src = currentUser.avatarDataUrl;
        }
    };

    updateGlobalUserInfo();
    updateDashboardKPIs();
    // renderRecentTransactions(); // TODO: implement
    renderIncomeList();
    renderExpenseList();

    const handleTransactionTableAction = (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const row = btn.closest('tr[data-transaction-id]');
        if (!row) return;

        const transactionId = Number(row.dataset.transactionId);
        const action = btn.dataset.action;
        const transaction = mmStore.getTransactions().find(t => t.id === transactionId);
        if (!transaction) return;

        if (action === 'delete') {
            const confirmed = window.confirm('Delete this transaction?');
            if (!confirmed) return;
            if (mmStore.deleteTransaction(transactionId)) {
                updateDashboardKPIs();
                renderIncomeList();
                renderExpenseList();
                ToastManager.show('Transaction deleted.', 'success');
            }
            return;
        }

        if (action === 'edit') {
            const nextDescription = window.prompt('Edit description', transaction.description || '');
            if (nextDescription === null) return;

            const nextAmountRaw = window.prompt('Edit amount', String(transaction.amount));
            if (nextAmountRaw === null) return;
            const nextAmount = Number(nextAmountRaw);
            if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
                ToastManager.show('Please enter a valid amount greater than zero.', 'error');
                return;
            }

            if (mmStore.updateTransaction(transactionId, { description: nextDescription.trim(), amount: nextAmount })) {
                updateDashboardKPIs();
                renderIncomeList();
                renderExpenseList();
                ToastManager.show('Transaction updated.', 'success');
            }
        }
    };

    const incomeTableBody = document.getElementById('income-list-body');
    const expenseTableBody = document.getElementById('expense-list-body');
    if (incomeTableBody) incomeTableBody.addEventListener('click', handleTransactionTableAction);
    if (expenseTableBody) expenseTableBody.addEventListener('click', handleTransactionTableAction);

    const exportBtn = document.querySelector('.toolbar-actions .btn-outline-sm');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const isIncomePage = window.location.pathname.includes('income-list');
            const type = isIncomePage ? 'income' : 'expense';
            const rows = (listState[type].filtered || mmStore.getTransactions().filter(t => t.type === type));
            if (rows.length === 0) {
                ToastManager.show('No records available to export.', 'error');
                return;
            }

            const header = ['Date', 'Type', 'Category', 'Description', 'Amount'];
            const csvRows = rows.map(t => [t.date, t.type, t.category, (t.description || '').replace(/"/g, '""'), t.amount]);
            const csv = [header, ...csvRows].map(cols => cols.map(col => `"${String(col)}"`).join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = `${type}-transactions-${date}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            ToastManager.show('CSV export generated.', 'success');
        });
    }

    // 5. Form Submission Handlers (Add Expense / Add Income)
    const addExpenseForm = document.getElementById('add-expense-form');
    const addIncomeForm = document.getElementById('add-income-form');
    const filterSelect = document.getElementById('category-filter');

    const populateCategoryDropdown = (select, type, isFilter = false) => {
        if (!select) return;
        const categories = mmStore.getCategories().filter(c => type ? c.type === type : true);
        const defaultOption = select.querySelector('option') ? select.querySelector('option').outerHTML : '';
        select.innerHTML = defaultOption + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    };

    if (addExpenseForm) populateCategoryDropdown(addExpenseForm.querySelector('#category'), 'expense');
    if (addIncomeForm) populateCategoryDropdown(addIncomeForm.querySelector('#category'), 'income');

    if (filterSelect) {
        if (window.location.pathname.includes('expense-list')) {
            populateCategoryDropdown(filterSelect, 'expense', true);
        } else if (window.location.pathname.includes('income-list')) {
            populateCategoryDropdown(filterSelect, 'income', true);
        }
    }

    const handleTransactionSubmit = (form, type) => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = form.querySelector('#amount').value;
            const category = form.querySelector('#category').value;
            const description = form.querySelector('#description').value;
            const date = form.querySelector('#date').value;

            mmStore.addTransaction({ type, amount, category, description, date });

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Added Successfully!';
                btn.style.background = 'var(--money-green)';
                form.reset();
                updateDashboardKPIs();
                ToastManager.show('Transaction added successfully.', 'success');

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                    // Reset date to today
                    const dateInput = form.querySelector('#date');
                    if (dateInput) dateInput.valueAsDate = new Date();
                }, 2000);
            }, 1000);
        });
    };

    if (addExpenseForm) handleTransactionSubmit(addExpenseForm, 'expense');
    if (addIncomeForm) handleTransactionSubmit(addIncomeForm, 'income');

    // 6. Categories Page Logic
    const categoriesForm = document.getElementById('add-category-form');
    const categoriesGrid = document.getElementById('categories-grid');

    if (categoriesForm && categoriesGrid) {
        const getActiveFilter = () => {
            const activePill = document.querySelector('.pill.active');
            return activePill ? activePill.dataset.filter : 'all';
        };

        const renderCategories = (filter = 'all') => {
            const categories = mmStore.getCategories();
            const filtered = filter === 'all' ? categories : categories.filter(c => c.type === filter);

            categoriesGrid.innerHTML = filtered.map(c => `
                <div class="paper-card category-card" data-category-color="${c.color}">
                    <div class="category-card-head">
                        <div class="category-card-icon">
                            <i class="fa-solid ${c.type === 'income' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
                        </div>
                        <button class="category-delete-btn" data-category-id="${c.id}" type="button">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                    <h5 class="category-card-title">${c.name}</h5>
                    <span class="category-card-type">${c.type}</span>
                </div>
            `).join('');

            categoriesGrid.querySelectorAll('.category-card').forEach(card => {
                const color = card.dataset.categoryColor || '#3b82f6';
                card.style.setProperty('--category-color', color);
            });
        };

        categoriesGrid.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.category-delete-btn');
            if (!deleteBtn) return;

            const categoryId = Number(deleteBtn.dataset.categoryId);
            if (!Number.isNaN(categoryId)) {
                mmStore.deleteCategory(categoryId);
                renderCategories(getActiveFilter());
            }
        });

        categoriesGrid.addEventListener('dblclick', (e) => {
            const title = e.target.closest('.category-card-title');
            if (!title) return;

            const card = title.closest('.category-card');
            const deleteBtn = card ? card.querySelector('.category-delete-btn') : null;
            if (!deleteBtn) return;

            const categoryId = Number(deleteBtn.dataset.categoryId);
            if (Number.isNaN(categoryId)) return;

            const currentName = title.textContent || '';
            const nextName = window.prompt('Rename category', currentName);
            if (nextName === null) return;

            const cleanName = nextName.trim();
            const categoryNameRegex = /^[A-Za-z][A-Za-z\s&-]{1,28}[A-Za-z]$/;
            if (!categoryNameRegex.test(cleanName)) {
                ToastManager.show('Category name must be 3-30 letters and may include spaces, & or -.', 'error');
                return;
            }

            if (mmStore.updateCategory(categoryId, { name: cleanName })) {
                renderCategories(getActiveFilter());
                ToastManager.show('Category updated.', 'success');
            }
        });

        categoriesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('cat-name').value.trim();
            const typeInput = categoriesForm.querySelector('input[name="cat-type"]:checked');
            const color = document.getElementById('cat-color').value;

            const categoryNameRegex = /^[A-Za-z][A-Za-z\s&-]{1,28}[A-Za-z]$/;
            if (!name || !typeInput) return;
            if (!categoryNameRegex.test(name)) {
                ToastManager.show('Category name must be 3-30 letters and may include spaces, & or -.', 'error');
                return;
            }

            mmStore.addCategory({ name, type: typeInput.value, color });
            categoriesForm.reset();
            ToastManager.show('Category added successfully.', 'success');

            renderCategories(getActiveFilter());
        });

        document.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                renderCategories(pill.dataset.filter || 'all');
            });
        });

        renderCategories('all');
    }

    // 7. Settings / Profile CRUD Logic
    const settingsForm = document.getElementById('settings-form');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const notificationsToggle = document.getElementById('email-notifications-toggle');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileDisplayName = document.getElementById('profile-display-name');
    const profileMemberSince = document.getElementById('profile-member-since');
    const uploadPhotoBtn = document.getElementById('upload-photo-btn');
    const removePhotoBtn = document.getElementById('remove-photo-btn');
    const profilePhotoInput = document.getElementById('profile-photo-input');
    const profileCameraBtn = document.getElementById('profile-camera-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const defaultAvatar = '../assets/user-sarah.webp';

    if (settingsForm && saveSettingsBtn) {
        const settingsCard = settingsForm.closest('.paper-card');
        let pendingAvatarDataUrl = '';
        let initialProfileState = null;

        const hydrateSettingsForm = () => {
            const settings = mmStore.getSettings();
            const currentUser = AuthManager.getCurrentUserRecord();
            const memberSince = currentUser && currentUser.createdAt
                ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : 'Jan 2025';

            const profileState = {
                userName: (currentUser && currentUser.userName) || settings.userName || '',
                email: (currentUser && currentUser.email) || settings.email || '',
                currency: settings.currency || 'USD',
                occupation: (currentUser && currentUser.occupation) || settings.occupation || '',
                darkMode: settings.darkMode || false,
                emailNotificationsEnabled: (currentUser && typeof currentUser.notificationsEnabled === 'boolean')
                    ? currentUser.notificationsEnabled
                    : settings.emailNotificationsEnabled !== false,
                sessionTimeoutMinutes: Number(settings.sessionTimeoutMinutes || 30),
                autoLogoutEnabled: settings.autoLogoutEnabled !== false,
                avatarDataUrl: (currentUser && currentUser.avatarDataUrl) || ''
            };

            initialProfileState = { ...profileState };
            pendingAvatarDataUrl = profileState.avatarDataUrl || '';

            document.getElementById('user-fullname').value = profileState.userName;
            document.getElementById('user-email').value = profileState.email;
            document.getElementById('user-currency').value = profileState.currency;
            document.getElementById('user-occupation').value = profileState.occupation;

            if (darkModeToggle) darkModeToggle.checked = profileState.darkMode;
            if (notificationsToggle) notificationsToggle.checked = profileState.emailNotificationsEnabled;
            if (document.getElementById('session-timeout-minutes')) {
                document.getElementById('session-timeout-minutes').value = profileState.sessionTimeoutMinutes;
            }
            if (document.getElementById('auto-logout-enabled')) {
                document.getElementById('auto-logout-enabled').checked = profileState.autoLogoutEnabled;
            }

            if (profileAvatar) {
                profileAvatar.src = profileState.avatarDataUrl || defaultAvatar;
            }
            if (profileDisplayName) {
                profileDisplayName.textContent = profileState.userName || 'Member';
            }
            if (profileMemberSince) {
                profileMemberSince.textContent = `Member since ${memberSince}`;
            }
        };

        const readProfileFormState = () => ({
            userName: document.getElementById('user-fullname').value.trim(),
            email: document.getElementById('user-email').value.trim(),
            currency: document.getElementById('user-currency').value,
            occupation: document.getElementById('user-occupation').value.trim(),
            darkMode: darkModeToggle ? darkModeToggle.checked : false,
            emailNotificationsEnabled: notificationsToggle ? notificationsToggle.checked : true,
            sessionTimeoutMinutes: Number(document.getElementById('session-timeout-minutes')?.value || 30),
            autoLogoutEnabled: document.getElementById('auto-logout-enabled') ? document.getElementById('auto-logout-enabled').checked : true,
            avatarDataUrl: pendingAvatarDataUrl || ''
        });

        const renderSaveBtnLoading = (isLoading) => {
            if (!saveSettingsBtn) return;
            if (isLoading) {
                saveSettingsBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
                saveSettingsBtn.disabled = true;
                return;
            }
            saveSettingsBtn.innerHTML = 'Save All Changes';
            saveSettingsBtn.style.background = '';
            saveSettingsBtn.disabled = false;
        };

        hydrateSettingsForm();

        saveSettingsBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const formState = readProfileFormState();

            if (!formState.userName || !formState.email) {
                ToastManager.show('Name and email are required.', 'error');
                return;
            }

            renderSaveBtnLoading(true);

            const profileUpdate = AuthManager.updateCurrentUser({
                userName: formState.userName,
                email: formState.email,
                occupation: formState.occupation,
                notificationsEnabled: formState.emailNotificationsEnabled,
                avatarDataUrl: formState.avatarDataUrl
            });

            if (!profileUpdate.ok) {
                renderSaveBtnLoading(false);
                ToastManager.show(profileUpdate.message, 'error');
                return;
            }

            mmStore.updateSettings({
                userName: formState.userName,
                email: formState.email,
                currency: formState.currency,
                occupation: formState.occupation,
                darkMode: formState.darkMode,
                emailNotificationsEnabled: formState.emailNotificationsEnabled,
                sessionTimeoutMinutes: Math.max(5, formState.sessionTimeoutMinutes),
                autoLogoutEnabled: formState.autoLogoutEnabled
            });

            updateGlobalUserInfo();
            hydrateSettingsForm();
            saveSettingsBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
            saveSettingsBtn.style.background = 'var(--money-green)';
            ToastManager.show('Profile updated successfully.', 'success');

            window.setTimeout(() => {
                renderSaveBtnLoading(false);
            }, 1500);
        });

        if (cancelSettingsBtn) {
            cancelSettingsBtn.addEventListener('click', () => {
                hydrateSettingsForm();
                ToastManager.show('Changes reverted.', 'info', 1800);
            });
        }

        const triggerPhotoInput = () => {
            if (profilePhotoInput) {
                profilePhotoInput.click();
            }
        };

        if (uploadPhotoBtn) uploadPhotoBtn.addEventListener('click', triggerPhotoInput);
        if (profileCameraBtn) profileCameraBtn.addEventListener('click', triggerPhotoInput);

        if (profilePhotoInput) {
            profilePhotoInput.addEventListener('change', () => {
                const file = profilePhotoInput.files && profilePhotoInput.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                    ToastManager.show('Image must be under 2MB.', 'error');
                    profilePhotoInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                    pendingAvatarDataUrl = String(reader.result || '');
                    if (profileAvatar && pendingAvatarDataUrl) {
                        profileAvatar.src = pendingAvatarDataUrl;
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        if (removePhotoBtn) {
            removePhotoBtn.addEventListener('click', () => {
                pendingAvatarDataUrl = '';
                if (profileAvatar) {
                    profileAvatar.src = defaultAvatar;
                }
                ToastManager.show('Profile photo removed. Save changes to apply.', 'info', 2200);
            });
        }

        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', async () => {
                const currentPassword = document.getElementById('current-password')?.value || '';
                const nextPassword = document.getElementById('new-password')?.value || '';
                const confirmPassword = document.getElementById('confirm-password')?.value || '';

                if (!currentPassword || !nextPassword || !confirmPassword) {
                    ToastManager.show('Fill all password fields.', 'error');
                    return;
                }
                if (nextPassword.length < 8) {
                    ToastManager.show('New password must be at least 8 characters.', 'error');
                    return;
                }
                if (nextPassword !== confirmPassword) {
                    ToastManager.show('New password and confirm password do not match.', 'error');
                    return;
                }

                const result = await AuthManager.changePassword(currentPassword, nextPassword);
                if (!result.ok) {
                    ToastManager.show(result.message, 'error');
                    return;
                }

                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                ToastManager.show('Password updated successfully.', 'success');
            });
        }

        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                const confirmed = window.confirm('Delete account and all its local data permanently?');
                if (!confirmed) return;
                AuthManager.deleteCurrentUser();
            });
        }

        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', () => {
                mmStore.updateSettings({ darkMode: darkModeToggle.checked });
            });
        }

        if (settingsCard && !document.getElementById('mm-data-tools')) {
            const settings = mmStore.getSettings();
            const dataTools = document.createElement('section');
            dataTools.id = 'mm-data-tools';
            dataTools.className = 'data-tools-panel';
            dataTools.innerHTML = `
                <h4 class="data-tools-title">Data Backup & Session</h4>
                <p class="card-subtitle">Export your data, restore from backup, and configure inactivity timeout.</p>
                <div class="data-tools-row">
                    <div class="form-group">
                        <label class="data-tools-label" for="session-timeout-minutes">Auto-logout (minutes)</label>
                        <input type="number" id="session-timeout-minutes" min="5" max="180" value="${settings.sessionTimeoutMinutes || 30}" class="data-tools-input">
                    </div>
                    <label class="data-tools-checkbox">
                        <input type="checkbox" id="auto-logout-enabled" ${settings.autoLogoutEnabled !== false ? 'checked' : ''}>
                        <span>Enable inactivity auto-logout</span>
                    </label>
                </div>
                <div class="data-tools-actions">
                    <button type="button" class="btn-outline-sm" id="export-backup-btn"><i class="fa-solid fa-file-export"></i> Export Backup</button>
                    <label class="btn-outline-sm data-tools-import-label" for="import-backup-input"><i class="fa-solid fa-file-import"></i> Import Backup</label>
                    <input type="file" id="import-backup-input" accept="application/json" hidden>
                </div>
            `;
            settingsCard.appendChild(dataTools);

            const exportBtn = document.getElementById('export-backup-btn');
            const importInput = document.getElementById('import-backup-input');

            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    const backup = mmStore.exportBackup();
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    const date = new Date().toISOString().slice(0, 10);
                    link.href = url;
                    link.download = `moneymap-backup-${date}.json`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                    ToastManager.show('Backup exported successfully.', 'success');
                });
            }

            if (importInput) {
                importInput.addEventListener('change', async () => {
                    const file = importInput.files && importInput.files[0];
                    if (!file) return;

                    try {
                        const content = await file.text();
                        const payload = JSON.parse(content);
                        mmStore.importBackup(payload);
                        ToastManager.show('Backup imported. Reloading data...', 'success', 1800);
                        setTimeout(() => window.location.reload(), 900);
                    } catch (err) {
                        ToastManager.show('Invalid backup file. Please use a valid MoneyMap JSON backup.', 'error', 4200);
                    } finally {
                        importInput.value = '';
                    }
                });
            }

            hydrateSettingsForm();
        }
    }

    // 8. Regex Validation for Amount
    const amountInputs = document.querySelectorAll('input[type="number"]#amount');
    amountInputs.forEach(input => {
        input.addEventListener('input', () => {
            const val = input.value;
            const regex = /^\d+(\.\d{1,2})?$/;
            if (!regex.test(val) && val !== '') {
                input.setCustomValidity('Please enter a valid amount (e.g. 10.99)');
            } else {
                input.setCustomValidity('');
            }
        });
    });

    // 9. List Filtering Logic (Search, Category, Date Range)
    const searchInput = document.querySelector('.dashboard-toolbar input[placeholder*="Search"]');
    const categoryFilter = document.getElementById('category-filter');
    const fromDateInput = document.querySelector('.dashboard-toolbar input[title="From Date"]');
    const toDateInput = document.querySelector('.dashboard-toolbar input[title="To Date"]');

    if (searchInput || categoryFilter || fromDateInput || toDateInput) {
        const handleFilter = () => {
            const term = searchInput ? searchInput.value.toLowerCase() : '';
            const cat = categoryFilter ? categoryFilter.value.toLowerCase() : '';
            const fromDateStr = fromDateInput ? fromDateInput.value : '';
            const toDateStr = toDateInput ? toDateInput.value : '';

            const fromDate = fromDateStr ? new Date(fromDateStr) : null;
            const toDate = toDateStr ? new Date(toDateStr) : null;
            if (fromDate) fromDate.setHours(0, 0, 0, 0);
            if (toDate) toDate.setHours(23, 59, 59, 999);

            const isIncomePage = window.location.pathname.includes('income-list');
            const listType = isIncomePage ? 'income' : 'expense';

            const filtered = mmStore.getTransactions().filter(t => {
                if (t.type !== listType) return false;

                const searchable = `${t.description} ${t.category} ${t.amount}`.toLowerCase();
                const rowDate = new Date(t.date);
                rowDate.setHours(12, 0, 0, 0);

                const matchesSearch = searchable.includes(term);
                const matchesCat = cat === '' || String(t.category).toLowerCase() === cat;

                let matchesDate = true;
                if (fromDate && rowDate < fromDate) matchesDate = false;
                if (toDate && rowDate > toDate) matchesDate = false;

                return matchesSearch && matchesCat && matchesDate;
            });

            listState[listType].filtered = filtered;
            listState[listType].page = 1;

            if (listType === 'income') {
                renderIncomeList();
            } else {
                renderExpenseList();
            }
        };

        const debouncedFilter = () => { setTimeout(handleFilter, 50); };

        if (searchInput) searchInput.addEventListener('input', debouncedFilter);
        if (categoryFilter) categoryFilter.addEventListener('change', debouncedFilter);
        if (fromDateInput) fromDateInput.addEventListener('change', debouncedFilter);
        if (toDateInput) toDateInput.addEventListener('change', debouncedFilter);
    }

    // 10. Dashboard Sidebar Toggle & Persistence
    const body = document.body;
    const sidebarToggle = document.getElementById('sidebarToggle');
    const dashboardSidebar = document.querySelector('.dashboard-sidebar');
    const MOBILE_BREAKPOINT = 1024;

    const isMobileViewport = () => window.innerWidth <= MOBILE_BREAKPOINT;

    const applySidebarState = () => {
        if (!dashboardSidebar) return;

        if (isMobileViewport()) {
            body.classList.remove('sidebar-collapsed');
            const mobileOpen = StorageManager.get('sidebar-mobile-open', false);
            body.classList.toggle('sidebar-mobile-open', mobileOpen === true);
        } else {
            body.classList.remove('sidebar-mobile-open');
            const desktopCollapsed = StorageManager.get('sidebar-collapsed', false);
            body.classList.toggle('sidebar-collapsed', desktopCollapsed === true);
        }
    };

    // Initialize state from local storage
    applySidebarState();

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (isMobileViewport()) {
                body.classList.toggle('sidebar-mobile-open');
                StorageManager.set('sidebar-mobile-open', body.classList.contains('sidebar-mobile-open'));
                return;
            }

            body.classList.toggle('sidebar-collapsed');
            StorageManager.set('sidebar-collapsed', body.classList.contains('sidebar-collapsed'));
        });
    }

    if (dashboardSidebar) {
        dashboardSidebar.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (!isMobileViewport()) return;
                body.classList.remove('sidebar-mobile-open');
                StorageManager.set('sidebar-mobile-open', false);
            });
        });

        const dashboardMainEl = document.querySelector('.dashboard-main');
        if (dashboardMainEl) {
            dashboardMainEl.addEventListener('click', (event) => {
                if (!isMobileViewport()) return;
                if (!body.classList.contains('sidebar-mobile-open')) return;
                if (event.target.closest('#sidebarToggle')) return;
                if (event.target.closest('.dashboard-top-tabs')) return;

                body.classList.remove('sidebar-mobile-open');
                StorageManager.set('sidebar-mobile-open', false);
            });
        }

        window.addEventListener('resize', applySidebarState);
    }

    // 7. Initialize Date Inputs
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.valueAsDate = new Date();
    });

    // 11. Testimonials Carousel
    const track = document.getElementById('testimonials-track');
    const prevBtn = document.getElementById('testimonial-prev');
    const nextBtn = document.getElementById('testimonial-next');
    const dots = document.querySelectorAll('.testimonial-dots .dot');

    if (track && prevBtn && nextBtn) {
        let currentIndex = 0;
        const cards = track.querySelectorAll('.testimonial-card');
        const updateCarousel = () => {
            if (cards.length > 0) {
                const cardWidth = cards[0].offsetWidth;
                const gap = 32; // ~2rem
                track.style.transform = `translateX(-${currentIndex * (cardWidth + gap)}px)`;
                dots.forEach((dot, index) => {
                    dot.classList.toggle('active', index === currentIndex);
                });
            }
        };

        nextBtn.addEventListener('click', () => {
            if (currentIndex < cards.length - 1) {
                currentIndex++;
                updateCarousel();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentIndex = index;
                updateCarousel();
            });
        });

        window.addEventListener('resize', updateCarousel);
    }

    // 12. Sliding Auth & Form Submissions
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const mobileSignUpButton = document.getElementById('mobile-signup-trigger');
    const mobileSignInButton = document.getElementById('mobile-signin-trigger');
    const authContainer = document.getElementById('sliding-container');

    if (signUpButton && signInButton && authContainer) {
        signUpButton.addEventListener('click', (e) => {
            e.preventDefault();
            authContainer.classList.add("right-panel-active");
        });
        signInButton.addEventListener('click', (e) => {
            e.preventDefault();
            authContainer.classList.remove("right-panel-active");
        });
    }

    if (mobileSignUpButton && authContainer) {
        mobileSignUpButton.addEventListener('click', () => {
            authContainer.classList.add('right-panel-active');
        });
    }

    if (mobileSignInButton && authContainer) {
        mobileSignInButton.addEventListener('click', () => {
            authContainer.classList.remove('right-panel-active');
        });
    }

    const signupFormScript = document.getElementById('signup-form');
    if (signupFormScript) {
        const rememberedEmail = AuthManager.getRememberedEmail();
        const signupEmailInput = document.getElementById('signup-email');
        if (signupEmailInput && rememberedEmail) {
            signupEmailInput.value = rememberedEmail;
        }

        signupFormScript.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            const signupResult = await AuthManager.register({ userName: name, email, password });
            if (!signupResult.ok) {
                ToastManager.show(signupResult.message, 'error', 2800);
                return;
            }

            mmStore.updateSettings({ userName: name, email: AuthManager.normalizeEmail(email) });
            ToastManager.show('Account created. Please sign in to continue.', 'success', 2200);
            signupFormScript.reset();
            if (authContainer) {
                authContainer.classList.remove('right-panel-active');
            }
        });
    }

    const loginFormScript = document.getElementById('login-form');
    if (loginFormScript) {
        const rememberedEmail = AuthManager.getRememberedEmail();
        const loginEmailInput = document.getElementById('login-email');
        if (loginEmailInput && rememberedEmail) {
            loginEmailInput.value = rememberedEmail;
        }

        loginFormScript.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const signinResult = await AuthManager.login({ email, password });
            if (!signinResult.ok) {
                ToastManager.show(signinResult.message, 'error', 2800);
                return;
            }

            mmStore.setStorageKey(AuthManager.getDataStorageKey(signinResult.user.id));

            mmStore.updateSettings({
                email: signinResult.user.email,
                userName: signinResult.user.userName
            });

            ToastManager.show('Sign in successful. Redirecting...', 'success', 1800);
            setTimeout(() => {
                window.location.href = AuthManager.getLastVisitedPage();
            }, 900);
        });
    }

    document.querySelectorAll('form#newsletter-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');
            const email = emailInput ? emailInput.value.trim() : '';
            if (!email) return;

            ToastManager.show('Thanks for subscribing to the MoneyMap newsletter.', 'success');
            form.reset();
        });
    });

    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            ToastManager.show('Your message has been sent. Our team will reply soon.', 'success');
            contactForm.reset();
        });
    }
});
