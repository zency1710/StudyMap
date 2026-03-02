// ================================
// SHARED UTILITIES & STATE
// ================================

const ICONS_PATH = '../assets/icons.svg';

// Global Icons object for backward compatibility with extract.js and test.js
window.Icons = {
    graduationCap: `<svg class="icon"><use href="${ICONS_PATH}#graduation-cap"></use></svg>`,
    home: `<svg class="icon"><use href="${ICONS_PATH}#home"></use></svg>`,
    upload: `<svg class="icon"><use href="${ICONS_PATH}#upload"></use></svg>`,
    bookOpen: `<svg class="icon"><use href="${ICONS_PATH}#book-open"></use></svg>`,
    trophy: `<svg class="icon"><use href="${ICONS_PATH}#trophy"></use></svg>`,
    barChart: `<svg class="icon"><use href="${ICONS_PATH}#bar-chart"></use></svg>`,
    settings: `<svg class="icon"><use href="${ICONS_PATH}#settings"></use></svg>`,
    flame: `<svg class="icon"><use href="${ICONS_PATH}#flame"></use></svg>`,
    target: `<svg class="icon"><use href="${ICONS_PATH}#target"></use></svg>`,
    checkCircle: `<svg class="icon"><use href="${ICONS_PATH}#check-circle"></use></svg>`,
    clock: `<svg class="icon"><use href="${ICONS_PATH}#clock"></use></svg>`,
    arrowRight: `<svg class="icon"><use href="${ICONS_PATH}#arrow-right"></use></svg>`,
    sparkles: `<svg class="icon"><use href="${ICONS_PATH}#sparkles"></use></svg>`,
    mail: `<svg class="icon"><use href="${ICONS_PATH}#mail"></use></svg>`,
    lock: `<svg class="icon"><use href="${ICONS_PATH}#lock"></use></svg>`,
    user: `<svg class="icon"><use href="${ICONS_PATH}#user"></use></svg>`,
    loader: `<svg class="icon"><use href="${ICONS_PATH}#loader"></use></svg>`,
    fileText: `<svg class="icon"><use href="${ICONS_PATH}#file-text"></use></svg>`,
    x: `<svg class="icon"><use href="${ICONS_PATH}#x"></use></svg>`,
    alertCircle: `<svg class="icon"><use href="${ICONS_PATH}#alert-circle"></use></svg>`,
    edit: `<svg class="icon"><use href="${ICONS_PATH}#edit"></use></svg>`,
    plus: `<svg class="icon"><use href="${ICONS_PATH}#plus"></use></svg>`,
    trash: `<svg class="icon"><use href="${ICONS_PATH}#trash"></use></svg>`,
    chevronDown: `<svg class="icon"><use href="${ICONS_PATH}#chevron-down"></use></svg>`,
    chevronRight: `<svg class="icon"><use href="${ICONS_PATH}#chevron-right"></use></svg>`,
    play: `<svg class="icon"><use href="${ICONS_PATH}#play"></use></svg>`,
    xCircle: `<svg class="icon"><use href="${ICONS_PATH}#x-circle"></use></svg>`,
    rotateCcw: `<svg class="icon"><use href="${ICONS_PATH}#rotate-ccw"></use></svg>`,
    sun: `<svg class="icon"><use href="${ICONS_PATH}#sun"></use></svg>`,
    moon: `<svg class="icon"><use href="${ICONS_PATH}#moon"></use></svg>`,
    logOut: `<svg class="icon"><use href="${ICONS_PATH}#log-out"></use></svg>`,
    save: `<svg class="icon"><use href="${ICONS_PATH}#save"></use></svg>`,
    eye: `<svg class="icon"><use href="${ICONS_PATH}#eye"></use></svg>`,
    eyeOff: `<svg class="icon"><use href="${ICONS_PATH}#eye-off"></use></svg>`,
    trendingUp: `<svg class="icon"><use href="${ICONS_PATH}#trending-up"></use></svg>`,
    menu: `<svg class="icon"><use href="${ICONS_PATH}#menu"></use></svg>`,
    shield: `<svg class="icon"><use href="${ICONS_PATH}#shield"></use></svg>`,
};

// ================================
// STATE MANAGEMENT
// ================================
const State = {
    user: null,
    theme: localStorage.getItem('studymap-theme') || 'light',
    syllabus: null,
    testAttempts: [],
    streak: {
        currentStreak: 7,
        longestStreak: 14,
        lastActivityDate: new Date().toISOString().split('T')[0],
        weeklyActivity: [true, true, true, false, true, true, true],
    },
    finalExamScore: null,
    currentTest: null,
    users: [],

    load() {
        const savedUser = localStorage.getItem('studymap-user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
        }

        // Users list will be fetched from backend for admin
        const savedUsers = localStorage.getItem('studymap-users');
        if (savedUsers) {
            this.users = JSON.parse(savedUsers);
        }

        // Syllabus will be fetched from backend API
        const savedSyllabus = localStorage.getItem('studymap-syllabus');
        if (savedSyllabus) {
            this.syllabus = JSON.parse(savedSyllabus);
        }

        const savedAttempts = localStorage.getItem('studymap-attempts');
        if (savedAttempts) {
            this.testAttempts = JSON.parse(savedAttempts);
        }

        const savedStreak = localStorage.getItem('studymap-streak');
        if (savedStreak) {
            this.streak = JSON.parse(savedStreak);
        }

        const savedFinalScore = localStorage.getItem('studymap-final-score');
        if (savedFinalScore) {
            this.finalExamScore = JSON.parse(savedFinalScore);
        }

        if (this.theme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    },

    save() {
        if (this.user) {
            localStorage.setItem('studymap-user', JSON.stringify(this.user));
        }
        if (this.syllabus) {
            localStorage.setItem('studymap-syllabus', JSON.stringify(this.syllabus));
        }
        localStorage.setItem('studymap-attempts', JSON.stringify(this.testAttempts));
        localStorage.setItem('studymap-streak', JSON.stringify(this.streak));
        if (this.finalExamScore !== null) {
            localStorage.setItem('studymap-final-score', JSON.stringify(this.finalExamScore));
        }
        localStorage.setItem('studymap-users', JSON.stringify(this.users));
        localStorage.setItem('studymap-theme', this.theme);
    },

    getProgress() {
        if (!this.syllabus) return { completed: 0, total: 0, percentage: 0 };
        let completed = 0;
        let total = 0;
        this.syllabus.subjects.forEach(subject => {
            subject.topics.forEach(topic => {
                total++;
                if (topic.status === 'verified') completed++;
            });
        });
        return {
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    },

    deleteUser(userId) {
        this.users = this.users.filter(u => u.id !== userId);
        this.save();
    },

    isExamUnlocked() {
        const { completed, total } = this.getProgress();
        return total > 0 && completed === total;
    },

    updateTopicStatus(subjectId, topicId, status, score) {
        if (!this.syllabus) return;
        this.syllabus.subjects = this.syllabus.subjects.map(subject => {
            if (subject.id === subjectId) {
                return {
                    ...subject,
                    topics: subject.topics.map(topic => {
                        if (topic.id === topicId) {
                            return { ...topic, status, score };
                        }
                        return topic;
                    }),
                };
            }
            return subject;
        });
        this.save();
    },

    updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (this.streak.lastActivityDate === today) return;
        const isConsecutive = this.streak.lastActivityDate === yesterday;
        const newCurrentStreak = isConsecutive ? this.streak.currentStreak + 1 : 1;
        const newLongestStreak = Math.max(newCurrentStreak, this.streak.longestStreak);
        this.streak = {
            currentStreak: newCurrentStreak,
            longestStreak: newLongestStreak,
            lastActivityDate: today,
            weeklyActivity: [...this.streak.weeklyActivity.slice(1), true],
        };
        this.save();
    },

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        if (this.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        this.save();
    },

    clearSyllabusData() {
        this.syllabus = null;
        this.testAttempts = [];
        this.finalExamScore = null;
        this.stats = null;
        localStorage.removeItem('studymap-syllabus');
        localStorage.removeItem('studymap-attempts');
        localStorage.removeItem('studymap-final-score');
        this.save();
    },

    logout() {
        // Clear all user data from state
        this.user = null;
        this.syllabus = null;
        this.testAttempts = [];
        this.streak = {
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: null,
            weeklyActivity: [false, false, false, false, false, false, false],
        };
        this.finalExamScore = null;
        this.users = [];

        // Clear all localStorage to prevent data leakage
        localStorage.removeItem('studymap-user');
        localStorage.removeItem('studymap-token');
        localStorage.removeItem('studymap-syllabus');
        localStorage.removeItem('studymap-attempts');
        localStorage.removeItem('studymap-streak');
        localStorage.removeItem('studymap-final-score');
        localStorage.removeItem('studymap-users');

        // Build a robust redirect to the landing page relative to the current page
        const landingUrl = new URL('../landing/home.html', window.location.href).href;

        // Use replace() so the back button does NOT return to the protected page
        window.location.replace(landingUrl);
    },
};

// ================================
// TOAST NOTIFICATIONS
// ================================
const Toast = {
    show(title, description, variant = 'default') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${variant}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-description">${description}</div>
            </div>
            <button class="toast-close">
                <svg class="icon icon-sm"><use href="${ICONS_PATH}#x"></use></svg>
            </button>
        `;

        container.appendChild(toast);

        toast.querySelector('.toast-close').onclick = () => toast.remove();

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    },
};

// ================================
// COMPONENT RENDERERS
// ================================
function ProgressRing(progress, size = 120, strokeWidth = 10, variant = 'success') {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return `
        <div class="progress-ring" style="width: ${size}px; height: ${size}px;">
            <svg width="${size}" height="${size}">
                <circle
                    cx="${size / 2}"
                    cy="${size / 2}"
                    r="${radius}"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="${strokeWidth}"
                    class="ring-bg"
                />
                <circle
                    cx="${size / 2}"
                    cy="${size / 2}"
                    r="${radius}"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="${strokeWidth}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"
                    stroke-linecap="round"
                    class="ring-fill ${variant}"
                />
            </svg>
            <div class="progress-ring-label">
                <span class="progress-ring-value text-${variant}">${progress}%</span>
                <span class="progress-ring-text">Complete</span>
            </div>
        </div>
    `;
}

function StatCard(iconName, label, value, subtitle, variant = 'primary') {
    return `
        <div class="glass-card stat-card ${variant}">
            <div class="stat-card-content">
                <div class="stat-card-info">
                    <p class="stat-card-label">${label}</p>
                    <p class="stat-card-value">${value}</p>
                    ${subtitle ? `<p class="stat-card-subtitle">${subtitle}</p>` : ''}
                </div>
                <div class="stat-card-icon">
                    <svg class="icon"><use href="${ICONS_PATH}#${iconName}"></use></svg>
                </div>
            </div>
        </div>
    `;
}

function renderContextBanner() {
    // Admins don't have a context banner
    if (State.user?.role === 'admin') return;

    const activeSyllabus = State.syllabus;
    const bannerContainer = document.getElementById('context-banner-container');
    if (!bannerContainer) return;

    if (!activeSyllabus) {
        bannerContainer.innerHTML = `
            <div class="context-banner warning animate-fade-in">
                <div class="context-banner-content">
                    <svg class="icon"><use href="${ICONS_PATH}#alert-circle"></use></svg>
                    <span>No active syllabus. Please select one from the <a href="../dashboard/dashboard.html">Dashboard</a> to see your progress.</span>
                </div>
            </div>
        `;
        return;
    }

    bannerContainer.innerHTML = `
        <div class="context-banner active animate-fade-in">
            <div class="context-banner-content">
                <div class="active-indicator"></div>
                <svg class="icon"><use href="${ICONS_PATH}#file-text"></use></svg>
                <div class="context-info">
                    <span class="context-label">Currently Studying:</span>
                    <span class="context-name">${activeSyllabus.name}</span>
                </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="window.location.href='../dashboard/dashboard.html'">
                Switch PDF
            </button>
        </div>
    `;
}

function renderStreakHeatmap() {
    const rows = 7;
    const cols = 52;
    const totalDays = rows * cols;
    const activityData = [];

    for (let i = 0; i < totalDays; i++) {
        const colIndex = Math.floor(i / rows);
        const isRecent = colIndex > cols - 8;
        if (isRecent && Math.random() > 0.3) {
            activityData.push(Math.floor(Math.random() * 3) + 2);
        } else {
            const hasActivity = Math.random() > 0.7;
            activityData.push(hasActivity ? Math.floor(Math.random() * 4) + 1 : 0);
        }
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `
        <div class="github-heatmap-wrapper">
            <div class="heatmap-days-labels">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
                <span>Sun</span>
            </div>
            <div class="heatmap-main">
                <div class="heatmap-months-labels">
                    ${months.map(m => `<span>${m}</span>`).join('')}
                </div>
                <div class="streak-heatmap github-style">
                    ${activityData.map((level, i) => `
                        <div class="heatmap-cell level-${level}" title="Activity level: ${level}"></div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// ================================
// LAYOUT & NAVIGATION
// ================================

function renderLayout(content) {
    const progress = State.getProgress();
    const userName = State.user?.name || 'Student';
    const userEmail = State.user?.email || '';
    const userInitial = userName.charAt(0).toUpperCase();

    let navItems = [];
    if (State.user?.role === 'admin') {
        navItems = [
            { id: 'admin', icon: 'shield', label: 'Admin Panel', path: '../admin/admin.html' }
        ];
    } else {
        navItems = [
            { id: 'dashboard', icon: 'home', label: 'Dashboard', path: '../dashboard/dashboard.html' },
            { id: 'upload', icon: 'upload', label: 'Upload PDF', path: '../upload/upload.html' },
            { id: 'syllabus', icon: 'book-open', label: 'Syllabus', path: '../syllabus/syllabus.html' },
            { id: 'streaks', icon: 'flame', label: 'Streaks', path: '../streaks/streaks.html' },
            { id: 'final-exam', icon: 'trophy', label: 'Final Exam', path: '../final-exam/final-exam.html' },
            { id: 'analytics', icon: 'bar-chart', label: 'Analytics', path: '../analytics/analytics.html' },
            { id: 'settings', icon: 'settings', label: 'Settings', path: '../settings/settings.html' }
        ];
    }

    const currentPage = window.location.pathname;

    return `
        <!-- Mobile Header -->
        <div class="mobile-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="auth-mobile-logo-icon" style="width: 2rem; height: 2rem;">
                    <svg class="icon"><use href="${ICONS_PATH}#graduation-cap"></use></svg>
                </div>
                <span style="font-weight: 700;">StudyMap</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button class="theme-toggle-btn" id="header-theme-toggle-mobile">
                    <svg class="icon"><use href="${ICONS_PATH}#${State.theme === 'light' ? 'moon' : 'sun'}"></use></svg>
                </button>
                <button class="mobile-menu-btn" id="mobile-menu-btn">
                    <svg class="icon"><use href="${ICONS_PATH}#menu"></use></svg>
                </button>
            </div>
        </div>
        
        <!-- Mobile Overlay -->
        <div class="mobile-overlay" id="mobile-overlay"></div>
        
        <div class="layout">
            <!-- Sidebar -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-logo">
                    <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
                        <div class="sidebar-logo-icon">
                            <svg class="icon"><use href="${ICONS_PATH}#graduation-cap"></use></svg>
                        </div>
                        <span class="sidebar-logo-text">StudyMap</span>
                    </div>
                    <button class="theme-toggle-btn desktop-only" id="header-theme-toggle">
                        <svg class="icon"><use href="${ICONS_PATH}#${State.theme === 'light' ? 'moon' : 'sun'}"></use></svg>
                    </button>
                </div>
                
                <nav class="sidebar-nav">
                    ${navItems.map(item => {
        const isActive = currentPage.includes(item.id);
        return `
                            <a 
                                href="${item.path}"
                                class="sidebar-nav-item ${isActive ? 'active' : ''}"
                            >
                                <svg class="icon"><use href="${ICONS_PATH}#${item.icon}"></use></svg>
                                <span>${item.label}</span>
                            </a>
                        `;
    }).join('')}
                    
                    <button class="sidebar-nav-item" id="logout-btn" style="margin-top: auto; color: var(--destructive);">
                        <svg class="icon"><use href="${ICONS_PATH}#log-out"></use></svg>
                        <span>Logout</span>
                    </button>
                </nav>
                
                <div class="sidebar-footer">
                    <div class="sidebar-user">
                        <div class="sidebar-user-avatar">${userInitial}</div>
                        <div class="sidebar-user-info">
                            <div class="sidebar-user-name">${userName}</div>
                            <div class="sidebar-user-email">${userEmail}</div>
                        </div>
                    </div>
                </div>
            </aside>
            
            <!-- Main Content -->
            <main class="main-content">
                <div id="context-banner-container"></div>
                ${content}
            </main>
        </div>
    `;
}

function checkAccessControl() {
    if (!State.user) return;

    const currentUrl = new URL(window.location.href);
    const path = currentUrl.pathname;

    // Check if we are on specific pages
    const isAdminPage = path.includes('/admin/admin.html');
    const isAuthPage = path.includes('/auth/auth.html');

    // Don't redirect if we are already on the auth page
    if (isAuthPage) return;

    if (State.user.role === 'admin') {
        // Admin can ONLY access admin panel
        if (!isAdminPage) {
            console.log('Admin redirected to admin panel from:', path);
            const target = new URL('../admin/admin.html', window.location.href);
            if (currentUrl.pathname !== target.pathname) {
                window.location.href = target.href;
            }
        }
    } else {
        // Students cannot access admin panel
        if (isAdminPage) {
            console.log('Student redirected to dashboard from:', path);
            const target = new URL('../dashboard/dashboard.html', window.location.href);
            if (currentUrl.pathname !== target.pathname) {
                window.location.href = target.href;
            }
        }
    }
}

function initLayout() {
    // Check access permissions first
    checkAccessControl();

    // Make sidebar logo clickable to go home
    const sidebarLogo = document.querySelector('.sidebar-logo');
    if (sidebarLogo) {
        sidebarLogo.style.cursor = 'pointer';
        sidebarLogo.addEventListener('click', () => {
            window.location.href = '../landing/home.html';
        });
    }

    // Logout — attach to ALL elements with data-action="logout" or the primary
    // #logout-btn. Using querySelectorAll avoids the duplicate-ID problem where
    // a page may contain both a sidebar button and a page-level button.
    document.querySelectorAll('#logout-btn, [data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            State.logout();
        });
    });

    // Theme toggle
    const themeToggles = document.querySelectorAll('.theme-toggle-btn');
    const handleThemeToggle = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        State.toggleTheme();
        window.location.reload();
    };

    themeToggles.forEach(btn => {
        btn.onclick = handleThemeToggle;
    });

    updateThemeIcons();

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (mobileMenuBtn && sidebar && overlay) {
        mobileMenuBtn.onclick = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        };

        overlay.onclick = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        };
    }

    // Update User Profile
    updateUserProfileUI();

    // Render Context Banner (showing active syllabus)
    renderContextBanner();
}

function updateUserProfileUI() {
    const userNameEls = document.querySelectorAll('.sidebar-user-name');
    const userEmailEls = document.querySelectorAll('.sidebar-user-email');
    const userAvatarEls = document.querySelectorAll('.sidebar-user-avatar');

    if (State.user) {
        userNameEls.forEach(el => el.textContent = State.user.name);
        userEmailEls.forEach(el => el.textContent = State.user.email);
        userAvatarEls.forEach(el => el.textContent = State.user.name.charAt(0).toUpperCase());
    }
}

function updateThemeIcons() {
    const themeIcons = document.querySelectorAll('.theme-toggle-btn use');
    themeIcons.forEach(use => {
        use.setAttribute('href', `${ICONS_PATH}#${State.theme === 'light' ? 'moon' : 'sun'}`);
    });
}
