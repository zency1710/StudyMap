async function loadAnalyticsData() {
    try {
        const stats = await API.getStats();
        const streak = await API.getStreak();
        
        // Update State
        if (stats) {
            State.stats = stats;
        }
        if (streak && streak.streak) {
            State.streak = streak.streak;
            State.save();
        }
        
        setupAnalytics();
    } catch (error) {
        console.error('Error loading analytics data:', error);
    }
}

function setupAnalytics() {
    const progress = State.getProgress();
    const stats = State.stats || {
        totalTopics: progress.total,
        verifiedTopics: progress.completed,
        averageScore: 0,
        testsCompleted: 0
    };

    const averageScore = stats.averageScore || 0;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Ensure we have State.streak.weeklyActivity defined
    if (!State.streak.weeklyActivity) {
        State.streak.weeklyActivity = [true, true, true, false, true, true, true]; // Default
    }

    // 1. Stats Grid
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            ${StatCard('target', 'Total Topics', stats.totalTopics, `${State.syllabus?.subjects.length || 0} subjects`, 'primary')}
            ${StatCard('check-circle', 'Completed', stats.verifiedTopics, `${progress.percentage}% verified`, 'success')}
            ${StatCard('trending-up', 'Avg. Score', `${averageScore}%`, `${stats.testsCompleted} tests taken`, 'primary')}
            ${StatCard('trophy', 'Final Exam', State.finalExamScore !== null ? `${State.finalExamScore}%` : 'Not taken', State.finalExamScore !== null ? (State.finalExamScore >= 60 ? 'Passed' : 'Not passed') : 'Complete all topics', State.finalExamScore !== null && State.finalExamScore >= 60 ? 'success' : 'warning')}
        `;
    }

    // 2. Subject Progress
    const subjectProgressContainer = document.getElementById('subject-progress-container');
    if (subjectProgressContainer) {
        if (!State.syllabus || State.syllabus.subjects.length === 0) {
            subjectProgressContainer.innerHTML = '<p style="text-align:center; padding: 1rem;">No subjects available</p>';
        } else {
            subjectProgressContainer.innerHTML = `<div style="width: 100%; padding: 1rem;">` +
                State.syllabus.subjects.map(subject => {
                    const verified = subject.topics.filter(t => t.status === 'verified').length;
                    const percentage = subject.topics.length > 0 ? Math.round((verified / subject.topics.length) * 100) : 0;
                    return `
                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
                                <span>${subject.name.substring(0, 15)}${subject.name.length > 15 ? '...' : ''}</span>
                                <span>${percentage}%</span>
                            </div>
                            <div class="progress-bar" style="height: 0.5rem;">
                                <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('') +
                `</div>`;
        }
    }

    // 3. Overall Completion
    const overallContainer = document.getElementById('overall-completion-container');
    if (overallContainer) {
        overallContainer.innerHTML = ProgressRing(progress.percentage, 200, 18, 'success');
    }

    // 4. Weekly Activity
    document.getElementById('weekly-streak-text').textContent = `${State.streak.currentStreak} day streak`;
    const weeklyDaysContainer = document.getElementById('weekly-activity-days');
    if (weeklyDaysContainer) {
        weeklyDaysContainer.innerHTML = days.map((day, index) => `
            <div class="weekly-activity-day">
                <div class="weekly-activity-day-indicator ${State.streak.weeklyActivity[index] ? 'active' : 'inactive'}" style="height: 4rem; width: 100%; max-width: 60px; display: flex; align-items: center; justify-content: center;">
                    ${State.streak.weeklyActivity[index] ? `<svg class="icon"><use href="../assets/icons.svg#check-circle"></use></svg>` : ''}
                </div>
                <span class="weekly-activity-day-label">${day}</span>
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

    // Load syllabus if not already in state
    if (!State.syllabus) {
        try {
            const response = await API.getSyllabus();
            if (response.syllabus) {
                State.syllabus = response.syllabus;
                State.save();
            }
        } catch (e) {
            console.error('Failed to load syllabus', e);
        }
    }

    initLayout();
    await loadAnalyticsData();
});
