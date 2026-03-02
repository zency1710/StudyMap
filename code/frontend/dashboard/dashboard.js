async function loadUserData() {
    try {
        // Load active syllabus from backend for progress
        const syllabusResponse = await API.getActiveSyllabus();
        if (syllabusResponse.syllabus) {
            State.syllabus = syllabusResponse.syllabus;
            State.save();
        }

        // Load all syllabi for management
        await loadSyllabiList();

        // Load streak from backend
        const streakResponse = await API.getStreak();
        if (streakResponse.streak) {
            State.streak = streakResponse.streak;
            State.save();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadSyllabiList() {
    const container = document.getElementById('pdf-list-container');
    if (!container) return;

    try {
        const response = await API.getSyllabi();
        const syllabi = response.syllabi || [];

        if (syllabi.length === 0) {
            container.innerHTML = `
                <div class="glass-card pdf-card" style="grid-column: 1/-1; align-items: center; padding: 3rem; text-align: center; border-style: dashed;">
                    <div class="pdf-icon-wrapper" style="margin-bottom: 1rem;">
                        <svg class="icon" style="width: 2rem; height: 2rem;">
                            <use href="../assets/icons.svg#upload"></use>
                        </svg>
                    </div>
                    <h3>No syllabi found</h3>
                    <p class="text-muted-foreground">Upload your first PDF to start learning</p>
                    <button class="btn btn-primary btn-sm" style="margin-top: 1.5rem;" onclick="window.location.href='../upload/upload.html'">
                        Upload Now
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = syllabi.map(s => {
            const isActive = State.syllabus && State.syllabus.id === s.id;
            
            return `
                <div class="glass-card pdf-card animate-slide-up ${isActive ? 'active' : ''}" data-id="${s.id}">
                    <div class="pdf-card-header">
                        <div class="pdf-icon-wrapper">
                            <svg class="icon">
                                <use href="../assets/icons.svg#file-text"></use>
                            </svg>
                        </div>
                        ${isActive ? '<span class="badge badge-primary badge-sm">Active</span>' : ''}
                        <div class="pdf-actions">
                            <button class="btn-icon-danger delete-pdf-btn" onclick="handleDeleteSyllabus(${s.id}, '${s.name}')" title="Delete Syllabus">
                                <svg class="icon">
                                    <use href="../assets/icons.svg#trash"></use>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="pdf-info">
                        <h3 title="${s.name}">${s.name}</h3>
                        <div class="pdf-meta">
                            <div class="pdf-meta-item">
                                <svg class="icon" style="width: 0.875rem; height: 0.875rem;">
                                    <use href="../assets/icons.svg#calendar"></use>
                                </svg>
                                <span>${new Date(s.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="pdf-meta-item">
                                <span class="badge badge-sm ${s.extracted ? 'badge-success' : 'badge-warning'}">
                                    ${s.extracted ? 'Processed' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="pdf-card-footer">
                        <button class="btn ${isActive ? 'btn-gradient' : 'btn-secondary'} btn-sm" onclick="handleStudySyllabus(${s.id})">
                            ${isActive ? 'Continue Studying' : 'Open Syllabus'}
                            <svg class="icon">
                                <use href="../assets/icons.svg#arrow-right"></use>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading syllabi list:', error);
        container.innerHTML = `<p class="text-error">Failed to load syllabi.</p>`;
    }
}

async function handleDeleteSyllabus(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove all progress and data associated with this syllabus.`)) {
        return;
    }

    try {
        const response = await API.deleteSyllabus(id);
        if (response.error) {
            alert(`Error: ${response.error}`);
            return;
        }

        // If we deleted the active syllabus, clear it from state
        if (State.syllabus && State.syllabus.id === id) {
            State.clearSyllabusData();
        }

        // Refresh UI
        await loadUserData();
        setupDashboard();
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete syllabus.');
    }
}

async function handleStudySyllabus(id) {
    // If it's not the active one, we need to fetch its full details and set as active
    try {
        const response = await API.getSyllabusById(id);
        if (response.syllabus) {
            // Clear old data and set new syllabus
            State.clearSyllabusData();
            State.syllabus = response.syllabus;
            State.save();
            window.location.href = '../syllabus/syllabus.html';
        }
    } catch (error) {
        console.error('Study error:', error);
    }
}

function setupDashboard() {
    const progress = State.getProgress();
    const userName = State.user?.name?.split(' ')[0] || 'Student';
    const totalSubjects = State.syllabus?.subjects.length || 0;
    const verifiedTopics = progress.completed;
    const pendingTopics = progress.total - progress.completed;

    // 1. Welcome Message
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.textContent = `Welcome back, ${userName}!`;
    
    const welcomeSubtitle = document.getElementById('welcome-subtitle');
    if (welcomeSubtitle) {
        welcomeSubtitle.textContent = progress.percentage < 100
            ? "Keep up the great work on your learning journey!"
            : "Amazing! You've completed all topics! 🎉";
    }

    // 2. Progress Ring
    const circle = document.getElementById('progress-ring-circle');
    if (circle) {
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (progress.percentage / 100) * circumference;

        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
    }

    const progressPercentage = document.getElementById('progress-percentage');
    if (progressPercentage) progressPercentage.textContent = `${progress.percentage}%`;

    // 3. Syllabus Info
    const syllabusName = document.getElementById('syllabus-name');
    if (syllabusName) syllabusName.textContent = State.syllabus?.name || 'No syllabus uploaded yet';
    
    const statTopics = document.getElementById('stat-topics');
    if (statTopics) statTopics.textContent = progress.total;
    
    const statVerified = document.getElementById('stat-verified');
    if (statVerified) statVerified.textContent = verifiedTopics;
    
    const statPending = document.getElementById('stat-pending');
    if (statPending) statPending.textContent = pendingTopics;
    
    const progressText = document.getElementById('progress-text');
    if (progressText) progressText.textContent = `${progress.percentage}%`;
    
    const progressBarFill = document.getElementById('progress-bar-fill');
    if (progressBarFill) progressBarFill.style.width = `${progress.percentage}%`;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    State.load();
    if (!State.user) {
        window.location.href = '../auth/auth.html';
        return;
    }

    // Load data from backend
    await loadUserData();

    // Update streak on visit
    try {
        await API.updateStreak();
        const streakResponse = await API.getStreak();
        if (streakResponse.streak) {
            State.streak = streakResponse.streak;
            State.save();
        }
    } catch (error) {
        console.error('Error updating streak:', error);
    }

    initLayout(); // Logic for sidebar, theme, user profile
    setupDashboard();
});
