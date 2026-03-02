function renderStreakHeatmap(activityDates = []) {
    const activeSet = new Set(activityDates);
    const cells = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = 2026;

    // Define the year range
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // Align grid to full weeks: start on previous Sunday, end on next Saturday
    const startOfGrid = new Date(startOfYear);
    startOfGrid.setDate(startOfGrid.getDate() - ((startOfGrid.getDay() - 0 + 7) % 7)); // previous Sunday

    const endOfGrid = new Date(endOfYear);
    endOfGrid.setDate(endOfGrid.getDate() + ((6 - endOfGrid.getDay() + 7) % 7)); // next Saturday

    // Compute total days and weeks
    const oneDayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.round((endOfGrid - startOfGrid) / oneDayMs) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);

    // Build cells for each day in the grid
    const d = new Date(startOfGrid);
    for (let i = 0; i < totalDays; i++) {
        const dateStr = d.toISOString().split('T')[0];
        const isInYear = d.getFullYear() === year;
        const isActive = isInYear && activeSet.has(dateStr);
        cells.push(`<div class="heatmap-cell ${isActive ? 'active' : 'inactive'}" title="${dateStr}"></div>`);
        d.setDate(d.getDate() + 1);
    }

    // Month labels: position at the column where each month starts
    const monthLabels = [];
    for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const weekIndex = Math.floor((monthStart - startOfGrid) / oneDayMs / 7) + 1; // 1-based grid column
        monthLabels.push(`<span class="month-label" style="grid-column: ${weekIndex}">${months[m]}</span>`);
    }

    return `
        <div class="heatmap-months" style="grid-template-columns: repeat(${totalWeeks}, 1fr)">${monthLabels.join('')}</div>
        <div class="heatmap-body">
            <div class="heatmap-days">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
            </div>
            <div class="heatmap-grid" style="grid-template-columns: repeat(${totalWeeks}, 1fr); width: 100%;">
                ${cells.join('')}
            </div>
        </div>
    `;
}

async function loadStreakData() {
    try {
        const response = await API.getStreak();
        if (response.streak) {
            State.streak = response.streak;
            State.save();
        }
        setupStreaksPage();
    } catch (error) {
        console.error('Error loading streak data:', error);
        setupStreaksPage(); // Fallback to local state if API fails
    }
}

function setupStreaksPage() {
    const streak = State.streak;
    const weeklyData = [65, 40, 85, 50, 30, 70, 45]; // Mock data for bar chart
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    // Update Streak Count
    const currentStreakEl = document.getElementById('current-streak');
    if (currentStreakEl) {
        currentStreakEl.textContent = streak.currentStreak;
    }

    // Render Heatmap
    const heatmapContainer = document.getElementById('streak-heatmap');
    if (heatmapContainer) {
        heatmapContainer.innerHTML = renderStreakHeatmap(streak.activityDates || []);
    }

    // Calculate and Update Total Points (10 pts per login/active day in 2026)
    const totalPointsEl = document.getElementById('total-points');
    if (totalPointsEl) {
        const activeDays2026 = (streak.activityDates || []).filter(date => date.startsWith('2026'));
        const totalPoints = activeDays2026.length * 10;
        totalPointsEl.textContent = `${totalPoints.toLocaleString()} pts`;
    }

    // Render Weekly Chart
    const weeklyChart = document.getElementById('weekly-chart');
    if (weeklyChart) {
        weeklyChart.innerHTML = weeklyData.map((val, i) => `
            <div class="chart-column">
                <div class="chart-bar-wrapper">
                    <div class="chart-bar" style="height: ${val}%;"></div>
                </div>
                <span class="chart-label">${days[i]}</span>
            </div>
        `).join('');
    }

}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    State.load();
    if (!State.user) {
        window.location.href = '../auth/auth.html';
        return;
    }

    initLayout();
    await loadStreakData();
});
