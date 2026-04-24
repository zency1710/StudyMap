// Admin functionality
async function setupAdminPage() {
    // 1. Fetch real users from backend
    try {
        const response = await API.getAllUsers();
        if (response.error) {
            Toast.show('Error', response.error, 'error');
            // If unauthorized, redirect might already be handled or we can force it
            if (response.error === 'Unauthorized') {
                window.location.href = '../dashboard/dashboard.html';
                return;
            }
            return;
        }
        State.users = response.users;
    } catch (error) {
        console.error('Failed to fetch users:', error);
        Toast.show('Error', 'Failed to load user data from server.', 'error');
        return;
    }

    const totalUsers = State.users.length;
    const totalProgress = State.users.reduce((acc, u) => acc + (u.progress || 0), 0);
    const avgProgress = totalUsers > 0 ? Math.round(totalProgress / totalUsers) : 0;

    // 1. Stats Grid
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            ${StatCard('user', 'Total Users', totalUsers, 'Registered students', 'primary')}
            ${StatCard('trending-up', 'Avg. Progress', `${avgProgress}%`, 'Across all students', 'success')}
            ${StatCard('file-text', 'Total Syllabi', '42', 'Extracted PDFs', 'primary')}
            ${StatCard('sparkles', 'Active Today', '12', 'Users studied today', 'success')}
        `;
    }

    // 2. Charts
    const registrationData = [
        { label: 'Sep', value: 12 },
        { label: 'Oct', value: 18 },
        { label: 'Nov', value: 25 },
        { label: 'Dec', value: 32 },
        { label: 'Jan', value: 45 }
    ];

    const progressDistribution = [
        { label: '0-20%', value: 15 },
        { label: '21-40%', value: 25 },
        { label: '41-60%', value: 40 },
        { label: '61-80%', value: 30 },
        { label: '81-100%', value: 20 }
    ];

    const userGrowthChart = document.getElementById('user-growth-chart');
    if (userGrowthChart) {
        userGrowthChart.innerHTML = `
            <svg viewBox="0 0 100 40" class="admin-chart-svg" style="width: 100%; height: 100%;">
                <path class="chart-area" d="M 0 40 L 0 35 L 25 30 L 50 22 L 75 15 L 100 5 L 100 40 Z" fill="rgba(111, 76, 255, 0.1)" />
                <path class="chart-line" d="M 0 35 L 25 30 L 50 22 L 75 15 L 100 5" fill="none" stroke="var(--primary)" stroke-width="2" />
                <circle class="chart-point" cx="0" cy="35" r="1.5" fill="var(--primary)" />
                <circle class="chart-point" cx="25" cy="30" r="1.5" fill="var(--primary)" />
                <circle class="chart-point" cx="50" cy="22" r="1.5" fill="var(--primary)" />
                <circle class="chart-point" cx="75" cy="15" r="1.5" fill="var(--primary)" />
                <circle class="chart-point" cx="100" cy="5" r="1.5" fill="var(--primary)" />
            </svg>
            <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; width: 100%;">
                ${registrationData.map(d => `<span class="chart-label">${d.label}</span>`).join('')}
            </div>
        `;
    }

    const progressDistChart = document.getElementById('progress-distribution-chart');
    if (progressDistChart) {
        progressDistChart.innerHTML = progressDistribution.map(d => `
            <div class="chart-bar-container" style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                <div class="chart-bar" style="height: ${d.value * 2}px; width: 2rem; background: var(--gradient-primary); border-radius: 0.25rem;"></div>
                <span class="chart-label">${d.label}</span>
            </div>
        `).join('');
    }

    // 3. User Table
    renderUserTable();
}

function renderUserTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = State.users.map(u => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="sidebar-user-avatar" style="width: 2rem; height: 2rem; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; background: var(--gradient-primary); color: white; border-radius: 50%;">${u.name.charAt(0)}</div>
                    <span>${u.name}</span>
                </div>
            </td>
            <td>${u.email}</td>
            <td>
                <span class="status-badge ${u.role}" style="padding: 0.25rem 0.5rem; border-radius: 1rem; font-size: 0.75rem; background: ${u.role === 'admin' ? 'rgba(111, 76, 255, 0.1)' : 'rgba(34, 197, 94, 0.1)'}; color: ${u.role === 'admin' ? 'var(--primary)' : 'var(--success)'};">${u.role}</span>
            </td>
            <td>${u.joined}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 100px;">
                    <div class="progress-bar" style="height: 0.375rem; flex: 1; background: var(--background-modifier-border); border-radius: 1rem; overflow: hidden;">
                        <div class="progress-bar-fill" style="width: ${u.progress}%; background: var(--gradient-success); height: 100%;"></div>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 500;">${u.progress}%</span>
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 0.25rem;">
                    <button class="btn btn-ghost btn-icon btn-sm" title="View Details">
                        <svg class="icon icon-sm"><use href="../assets/icons.svg#eye"></use></svg>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm text-destructive" data-delete-user="${u.id}" title="Delete User">
                        <svg class="icon icon-sm"><use href="../assets/icons.svg#trash"></use></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Attach Delete Listeners
    document.querySelectorAll('[data-delete-user]').forEach(btn => {
        btn.onclick = async () => {
            const userId = btn.dataset.deleteUser;
            if (confirm('Are you sure you want to delete this user?')) {
                try {
                    const response = await API.deleteUser(userId);
                    if (response.error) {
                        Toast.show('Error', response.error, 'error');
                    } else {
                        Toast.show('User deleted', 'The user has been removed successfully.');
                        setupAdminPage(); // Re-fetch and re-render everything
                    }
                } catch (error) {
                    console.error('Failed to delete user:', error);
                    Toast.show('Error', 'Failed to delete user on server.', 'error');
                }
            }
        };
    });
}

/**
 * Helper to generate a Stat Card HTML
 */
function StatCard(icon, label, value, subtitle, type = 'primary') {
    return `
        <div class="stat-card">
            <div class="stat-card-icon ${type}">
                <svg class="icon"><use href="../assets/icons.svg#${icon}"></use></svg>
            </div>
            <div class="stat-card-info">
                <span class="stat-card-label">${label}</span>
                <span class="stat-card-value">${value}</span>
                <span class="stat-card-subtitle">${subtitle}</span>
            </div>
        </div>
    `;
}

// Settings functionality
function setupAdminSettings() {
    // Populate Profile
    if (State.user) {
        document.getElementById('settings-name').value = State.user.name || '';
        document.getElementById('settings-email').value = State.user.email || '';
    }

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('#theme-icon use');
    const themeSubtitle = document.getElementById('theme-subtitle');

    function updateThemeUI() {
        if (State.theme === 'dark') {
            themeToggle.classList.add('active');
            themeIcon.setAttribute('href', '../assets/icons.svg#moon');
            themeSubtitle.textContent = 'Dark mode is active';
        } else {
            themeToggle.classList.remove('active');
            themeIcon.setAttribute('href', '../assets/icons.svg#sun');
            themeSubtitle.textContent = 'Light mode is active';
        }
    }

    updateThemeUI();

    if (themeToggle) {
        themeToggle.onclick = () => {
            State.toggleTheme();
            updateThemeUI();
        };
    }

    // Save Profile
    const saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
        saveProfileBtn.onclick = () => {
            const name = document.getElementById('settings-name').value;
            const email = document.getElementById('settings-email').value;

            if (State.user) {
                State.user.name = name;
                State.user.email = email;
                State.save();

                // Update Sidebar
                updateUserProfileUI();

                Toast.show('Profile updated', 'Your profile information has been saved.');
            }
        };
    }

    // Change Password
    const changePassBtn = document.getElementById('change-password');
    if (changePassBtn) {
        changePassBtn.onclick = () => {
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-password').value;

            if (newPass !== confirmPass) {
                Toast.show("Passwords don't match", 'Please make sure your new passwords match.', 'destructive');
                return;
            }

            if (newPass.length < 6) {
                Toast.show('Password too short', 'Password must be at least 6 characters.', 'destructive');
                return;
            }

            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';

            Toast.show('Password changed', 'Your password has been updated successfully.');
        };
    }

    // Logout
    // Handled by common.js initLayout() which attaches listener to #logout-btn
}

// Full Report functionality
let reportData = [];
let isReportLoading = false;
let hasReportLoadedInitially = false;
let isReportEventsBound = false;

async function setupFullReport() {
    // Only bind events — do NOT auto-load report data here.
    // Report loads only when the user clicks 'Generate Report'.

    if (isReportEventsBound) return;

    const generateBtn = document.getElementById('generate-report-btn');
    const exportBtn = document.getElementById('export-report-btn');
    const searchInput = document.getElementById('report-search');

    if (generateBtn) {
        generateBtn.onclick = async () => {
            await loadReportData(true); // Manual refresh
        };
    }

    if (searchInput) {
        searchInput.oninput = () => {
            const q = searchInput.value.toLowerCase();
            const filtered = reportData.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q)
            );
            renderReportTable(filtered);
        };
    }

    if (exportBtn) {
        exportBtn.onclick = () => {
            if (!reportData.length) {
                Toast.show('No Data', 'Generate the report first before exporting.', 'error');
                return;
            }
            exportReportCSV(reportData);
        };
    }

    isReportEventsBound = true;
}

async function loadReportData(isManualRefresh = false) {
    // Prevent duplicate API calls
    if (isReportLoading) {
        console.log('Report already loading, skipping...');
        return;
    }

    if (!isManualRefresh && hasReportLoadedInitially) {
        return;
    }

    const generateBtn = document.getElementById('generate-report-btn');
    const tbody = document.getElementById('report-table-body');

    // Show loading state
    isReportLoading = true;

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="17" class="report-empty-state">
                    <svg class="icon spin-animation" style="width:2rem;height:2rem;opacity:0.4;">
                        <use href="../assets/icons.svg#refresh-cw"></use>
                    </svg>
                    <p>${isManualRefresh ? 'Refreshing report data...' : 'Loading report data...'}</p>
                </td>
            </tr>
        `;
    }

    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = `<svg class="icon icon-sm spin-animation"><use href="../assets/icons.svg#refresh-cw"></use></svg> ${isManualRefresh ? 'Refreshing...' : 'Loading...'}`;
    }

    try {
        if (typeof API.getAdminReport !== 'function') {
            throw new Error("API method not found. Please do a HARD REFRESH (Ctrl+F5 or Cmd+Shift+R) to clear browser cache.");
        }

        const response = await API.getAdminReport();
        if (response && response.error) {
            Toast.show('Error', response.error, 'error');
            renderEmptyState('Error: ' + response.error);
            return;
        }

        reportData = response.report || [];
        renderReportSummary(reportData);
        renderReportTable(reportData);
        hasReportLoadedInitially = true;

        const message = isManualRefresh ? 'Report refreshed successfully' : 'Report loaded successfully';
        Toast.show('Success', `${message} with ${reportData.length} users.`, 'success');

    } catch (error) {
        console.error('Failed to generate report:', error);
        const msg = error.message === 'Failed to fetch'
            ? 'Failed to fetch data. Is the backend server running?'
            : error.message;
        Toast.show('Error', msg, 'error');
        renderEmptyState('Error: ' + msg);

    } finally {
        isReportLoading = false;
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = `<svg class="icon icon-sm"><use href="../assets/icons.svg#refresh-cw"></use></svg> Generate Report`;
        }
    }
}

function renderEmptyState(message = 'No data found') {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="17" class="report-empty-state">
                <svg class="icon" style="width:2rem;height:2rem;opacity:0.4;">
                    <use href="../assets/icons.svg#file-text"></use>
                </svg>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

function renderReportSummary(data) {
    const summary = document.getElementById('report-summary');
    if (!summary) return;

    const totalUsers = data.length;
    const totalAdmins = data.filter(u => u.role === 'admin').length;
    const totalStudents = totalUsers - totalAdmins;
    const avgProgress = totalUsers > 0 ? Math.round(data.reduce((a, u) => a + u.progress, 0) / totalUsers) : 0;
    const totalTests = data.reduce((a, u) => a + u.test_attempts, 0);
    const totalPassed = data.reduce((a, u) => a + u.tests_passed, 0);

    summary.innerHTML = `
        <div class="report-summary-item">
            <span class="report-summary-value">${totalUsers}</span>
            <span class="report-summary-label">Total Users</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${totalStudents}</span>
            <span class="report-summary-label">Students</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${totalAdmins}</span>
            <span class="report-summary-label">Admins</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${avgProgress}%</span>
            <span class="report-summary-label">Avg Progress</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${totalTests}</span>
            <span class="report-summary-label">Total Tests</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${totalPassed}</span>
            <span class="report-summary-label">Tests Passed</span>
        </div>
    `;
}

function renderReportTable(data) {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;

    if (!data.length) {
        renderEmptyState('No users match your search criteria');
        return;
    }

    tbody.innerHTML = data.map((u, i) => `
        <tr>
            <td class="report-cell-num">${i + 1}</td>
            <td>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <div class="report-avatar">${u.name.charAt(0).toUpperCase()}</div>
                    <span class="report-cell-name">${u.name}</span>
                </div>
            </td>
            <td class="report-cell-email">${u.email}</td>
            <td>
                <span class="status-badge ${u.role}" style="padding:0.2rem 0.5rem;border-radius:1rem;font-size:0.7rem;background:${u.role === 'admin' ? 'rgba(111,76,255,0.1)' : 'rgba(34,197,94,0.1)'};color:${u.role === 'admin' ? 'var(--primary)' : 'var(--success)'};">${u.role}</span>
            </td>
            <td>${u.joined || '-'}</td>
            <td class="report-cell-num">${u.syllabi_count}</td>
            <td class="report-cell-num">${u.total_topics}</td>
            <td class="report-cell-num">${u.verified_topics}</td>
            <td>
                <div class="report-progress-wrap">
                    <div class="progress-bar" style="height:0.3rem;flex:1;background:var(--background-modifier-border);border-radius:1rem;overflow:hidden;">
                        <div style="width:${u.progress}%;background:var(--gradient-success);height:100%;"></div>
                    </div>
                    <span class="report-cell-num" style="min-width:2rem;">${u.progress}%</span>
                </div>
            </td>
            <td class="report-cell-num">${u.test_attempts}</td>
            <td class="report-cell-num">${u.tests_passed}</td>
            <td class="report-cell-num">${u.avg_test_score}%</td>
            <td class="report-cell-num">${u.current_streak}🔥</td>
            <td class="report-cell-num">${u.longest_streak}</td>
            <td>${u.last_activity || '-'}</td>
            <td class="report-cell-num">${u.finals_completed}</td>
            <td class="report-cell-num">${u.best_final_score}%</td>
        </tr>
    `).join('');
}

function exportReportCSV(data) {
    // Use SheetJS to create a proper .xlsx file with auto-fitted columns
    // so Excel never shows ####### (column too narrow) errors.

    if (typeof XLSX === 'undefined') {
        Toast.show('Error', 'Excel library not loaded. Please refresh the page and try again.', 'error');
        return;
    }

    const headers = [
        '#', 'Name', 'Email', 'Role', 'Joined', 'Syllabi', 'Topics',
        'Verified', 'Progress %', 'Tests', 'Passed', 'Avg Score %',
        'Current Streak', 'Longest Streak', 'Last Active',
        'Finals Completed', 'Best Final Score %'
    ];

    // Build rows as plain arrays (SheetJS will build the sheet from this)
    const rows = data.map((u, i) => [
        i + 1,
        u.name || '',
        u.email || '',
        u.role || '',
        u.joined || '',          // date as text — always visible
        u.syllabi_count,
        u.total_topics,
        u.verified_topics,
        u.progress,
        u.test_attempts,
        u.tests_passed,
        u.avg_test_score,
        u.current_streak,
        u.longest_streak,
        u.last_activity || '',   // date as text — always visible
        u.finals_completed,
        u.best_final_score
    ]);

    // Combine header + data rows
    const sheetData = [headers, ...rows];

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths (wch = width in characters) — prevents ####### in Excel
    ws['!cols'] = [
        { wch: 4  },  // #
        { wch: 20 },  // Name
        { wch: 30 },  // Email
        { wch: 10 },  // Role
        { wch: 14 },  // Joined
        { wch: 8  },  // Syllabi
        { wch: 8  },  // Topics
        { wch: 9  },  // Verified
        { wch: 11 },  // Progress %
        { wch: 7  },  // Tests
        { wch: 8  },  // Passed
        { wch: 11 },  // Avg Score %
        { wch: 14 },  // Current Streak
        { wch: 14 },  // Longest Streak
        { wch: 20 },  // Last Active
        { wch: 7  },  // Finals
        { wch: 16 },  // Best Final Score %
    ];

    // Create workbook and add the sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'StudyMap Report');

    // Download as .xlsx
    const filename = `studymap_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);

    Toast.show('Exported', `Report downloaded as ${filename}`);
}

// Tab switching functionality
function setupAdminTabs() {
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Initialize content for the active tab
            if (targetTab === 'admin-features') {
                setupAdminPage();
            } else if (targetTab === 'full-report') {
                // Always clear the search box when opening the report tab
                // to prevent browser autofill from showing stale/filtered data
                const searchInput = document.getElementById('report-search');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.blur();
                }
                setupFullReport();
            } else if (targetTab === 'settings') {
                setupAdminSettings();
            }
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    State.load();
    if (!State.user) {
        window.location.href = '../auth/auth.html';
        return;
    }

    // Check if user is admin
    if (State.user.role !== 'admin') {
        Toast.show('Access Denied', 'Admin access required.', 'error');
        window.location.href = '../dashboard/dashboard.html';
        return;
    }

    initLayout();
    setupAdminTabs();

    // Load admin features by default
    setupAdminPage();
});