/**
 * StudyMap Admin Report Module
 * Handles auto-loading, manual refresh, and rendering of the Full System Report.
 */

// Global state for the report
let reportData = [];
let isReportLoading = false;
let hasReportLoadedInitially = false;

/**
 * Main entry point for Full Report tab initialization
 * Sets up event listeners and performs auto-load
 */
async function setupFullReport() {
    console.log('[Report] Initializing setup...');
    
    // Bind UI elements
    const generateBtn = document.getElementById('generate-report-btn');
    const exportBtn = document.getElementById('export-report-btn');
    const searchInput = document.getElementById('report-search');

    // 1. Auto-load report data immediately if not already loaded
    await loadReportData();

    // 2. Setup manual refresh button
    if (generateBtn) {
        generateBtn.onclick = async () => {
            console.log('[Report] Manual refresh requested');
            await loadReportData(true);
        };
    }

    // 3. Setup search/filtering
    if (searchInput) {
        // Use a simple debounce for search if needed, but for small datasets oninput is fine
        searchInput.oninput = () => {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) {
                renderReportTable(reportData);
                return;
            }
            
            const filtered = reportData.filter(user =>
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.role.toLowerCase().includes(query)
            );
            renderReportTable(filtered);
        };
    }

    // 4. Setup CSV Export
    if (exportBtn) {
        exportBtn.onclick = () => {
            if (!reportData || reportData.length === 0) {
                Toast.show('No Data', 'Please generate the report first.', 'error');
                return;
            }
            exportReportCSV(reportData);
        };
    }
}

/**
 * Fetches report data from the API
 * @param {boolean} isManualRefresh - Whether this was triggered by the refresh button
 */
async function loadReportData(isManualRefresh = false) {
    // Prevent duplicate concurrent calls
    if (isReportLoading) {
        console.warn('[Report] Already loading, skipping...');
        return;
    }

    // Prevent auto-load if already loaded once (unless it's a manual refresh)
    if (!isManualRefresh && hasReportLoadedInitially) {
        console.log('[Report] Already loaded initially, using cached data');
        return;
    }

    const tbody = document.getElementById('report-table-body');
    const generateBtn = document.getElementById('generate-report-btn');
    
    // Start loading state
    isReportLoading = true;
    
    // Show loading spinner in table
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="17" class="report-empty-state">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem;">
                        <svg class="icon animate-spin" style="width: 3rem; height: 3rem; color: var(--primary); opacity: 0.8;">
                            <use href="../assets/icons.svg#refresh-cw"></use>
                        </svg>
                        <p style="font-weight: 500; color: var(--foreground);">${isManualRefresh ? 'Refreshing records...' : 'Loading system report...'}</p>
                        <p style="font-size: 0.85rem; color: var(--muted-foreground);">This may take a moment depending on user count.</p>
                    </div>
                </td>
            </tr>
        `;
    }

    // Update button state
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = `<svg class="icon icon-sm animate-spin"><use href="../assets/icons.svg#refresh-cw"></use></svg> Processing...`;
    }

    try {
        console.log('[Report] Fetching data from API...');
        
        // Ensure API method exists
        if (!API || typeof API.getAdminReport !== 'function') {
            throw new Error("API service not initialized properly.");
        }

        const response = await API.getAdminReport();
        
        if (response && response.error) {
            throw new Error(response.error);
        }
        
        reportData = response.report || [];
        
        // Render UI parts
        renderReportSummary(reportData);
        renderReportTable(reportData);
        
        // Mark as loaded
        hasReportLoadedInitially = true;
        
        if (isManualRefresh) {
            Toast.show('Updated', `Report refreshed with ${reportData.length} users.`, 'success');
        } else {
            console.log(`[Report] Successfully loaded ${reportData.length} users.`);
        }
        
    } catch (error) {
        console.error('[Report] Failed to load data:', error);
        const errorMsg = error.message.includes('Failed to fetch') 
            ? 'Cannot connect to server. Is the backend running?' 
            : error.message;
            
        Toast.show('Report Error', errorMsg, 'error');
        renderEmptyState(`Error: ${errorMsg}`);
        
    } finally {
        isReportLoading = false;
        
        // Reset button state
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = `<svg class="icon icon-sm"><use href="../assets/icons.svg#refresh-cw"></use></svg> Generate Report`;
        }
    }
}

/**
 * Renders the small summary cards above the table
 */
function renderReportSummary(data) {
    const summary = document.getElementById('report-summary');
    if (!summary) return;

    const total = data.length || 0;
    const admins = data.filter(u => u.role === 'admin').length;
    const students = total - admins;
    const avgProgress = total > 0 ? Math.round(data.reduce((acc, u) => acc + (u.progress || 0), 0) / total) : 0;
    const totalTests = data.reduce((acc, u) => acc + (u.test_attempts || 0), 0);
    const passedTests = data.reduce((acc, u) => acc + (u.tests_passed || 0), 0);

    summary.innerHTML = `
        <div class="report-summary-item">
            <span class="report-summary-value">${total}</span>
            <span class="report-summary-label">Total Users</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${students}</span>
            <span class="report-summary-label">Students</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${admins}</span>
            <span class="report-summary-label">Admins</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${avgProgress}%</span>
            <span class="report-summary-label">Avg Progress</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${totalTests}</span>
            <span class="report-summary-label">Tests Run</span>
        </div>
        <div class="report-summary-item">
            <span class="report-summary-value">${passedTests}</span>
            <span class="report-summary-label">Tests Passed</span>
        </div>
    `;
}

/**
 * Renders the main table rows
 */
function renderReportTable(data) {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;

    if (!data || data.length === 0) {
        renderEmptyState('No records found matching your criteria.');
        return;
    }

    tbody.innerHTML = data.map((u, i) => `
        <tr class="animate-fade-in" style="animation-delay: ${i * 0.05}s">
            <td class="report-cell-num">${i + 1}</td>
            <td>
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="report-avatar">${u.name.charAt(0).toUpperCase()}</div>
                    <div style="display: flex; flex-direction: column;">
                        <span class="report-cell-name">${u.name}</span>
                        <span style="font-size: 0.7rem; color: var(--muted-foreground); display: lg-only;">ID: #${u.id}</span>
                    </div>
                </div>
            </td>
            <td class="report-cell-email">${u.email}</td>
            <td>
                <span class="status-badge ${u.role}" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;">${u.role}</span>
            </td>
            <td>${u.joined}</td>
            <td class="report-cell-num">${u.syllabi_count || 0}</td>
            <td class="report-cell-num">${u.total_topics || 0}</td>
            <td class="report-cell-num">${u.verified_topics || 0}</td>
            <td>
                <div class="report-progress-wrap">
                    <div class="progress-bar" style="height: 0.4rem; flex: 1; background: var(--muted); overflow: hidden;">
                        <div style="width: ${u.progress}%; background: ${u.progress >= 80 ? 'var(--gradient-success)' : 'var(--gradient-primary)'}; height: 100%; transition: width 0.8s ease;"></div>
                    </div>
                    <span class="report-cell-num" style="min-width: 2.5rem; font-weight: 600;">${u.progress}%</span>
                </div>
            </td>
            <td class="report-cell-num">${u.test_attempts || 0}</td>
            <td class="report-cell-num">${u.tests_passed || 0}</td>
            <td class="report-cell-num">${u.avg_test_score || 0}%</td>
            <td class="report-cell-num">${u.current_streak || 0} 🔥</td>
            <td class="report-cell-num">${u.longest_streak || 0}</td>
            <td>${u.last_activity || '-'}</td>
            <td class="report-cell-num">${u.finals_completed || 0}</td>
            <td class="report-cell-num">${u.best_final_score || 0}%</td>
        </tr>
    `).join('');
}

/**
 * Handles empty or error states in the table
 */
function renderEmptyState(message) {
    const tbody = document.getElementById('report-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="17" class="report-empty-state">
                <div style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; opacity: 0.6;">
                    <svg class="icon" style="width: 3.5rem; height: 3.5rem;">
                        <use href="../assets/icons.svg#file-text"></use>
                    </svg>
                    <p style="font-size: 1rem; font-weight: 500;">${message}</p>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Exports data to CSV and triggers download
 */
function exportReportCSV(data) {
    const headers = [
        'ID', 'Name', 'Email', 'Role', 'Joined', 'Syllabi', 'Total Topics', 
        'Verified Topics', 'Progress %', 'Test Attempts', 'Tests Passed', 
        'Avg Score %', 'Current Streak', 'Longest Streak', 'Last Active', 
        'Finals Completed', 'Best Final Score %'
    ];

    const rows = data.map(u => [
        u.id, u.name, u.email, u.role, 
        u.joined || '',
        u.syllabi_count, u.total_topics,
        u.verified_topics, u.progress, u.test_attempts, u.tests_passed, 
        u.avg_test_score, u.current_streak, u.longest_streak, 
        u.last_activity || '',
        u.finals_completed, u.best_final_score
    ]);

    // Senior Dev Tip: Prepend 'sep=,' to force Excel to use the correct delimiter regardless of locale
    let csvContent = 'sep=,\n' + headers.join(',') + '\n' + 
                     rows.map(row => row.map((val, idx) => {
                         const cleanVal = (val === null || val === undefined) ? '' : String(val).trim();
                         // Don't quote dates or numbers to help Excel detect types
                         const isDate = (idx === 4 || idx === 14);
                         const isNumber = !isNaN(cleanVal) && cleanVal !== '';
                         
                         if (isDate || isNumber) {
                             return cleanVal;
                         }
                         return `"${cleanVal.replace(/"/g, '""')}"`;
                     }).join(',')).join('\n');

    // Add UTF-8 BOM for Excel compatibility
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `StudyMap_System_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Toast.show('Export Successful', 'Your report has been downloaded.');
}