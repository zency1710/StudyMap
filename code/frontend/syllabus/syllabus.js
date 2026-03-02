function renderSyllabus() {
    if (!State.syllabus) {
        return renderLayout(`
            <div class="syllabus-empty-state animate-fade-in" id="no-syllabus-state">
                <div class="empty-state-icon">
                    <svg class="icon icon-xl"><use href="${ICONS_PATH}#book-open"></use></svg>
                </div>
                <h1>No Syllabus Yet</h1>
                <p>Upload your course syllabus PDF to generate a personalized study map</p>
                <button class="btn btn-gradient btn-lg" id="upload-btn">
                    <svg class="icon"><use href="${ICONS_PATH}#upload"></use></svg>
                    Upload Syllabus
                </button>
            </div>
        `, 'syllabus');
    }

    const progress = State.getProgress();

    // Merge DB data (IDs, status) into Structure (Hierarchy)
    let displaySubjects = State.syllabus.subjects;

    if (State.syllabusStructure?.subjects && State.syllabusStructure.subjects.length > 0) {
        displaySubjects = State.syllabusStructure.subjects.map(structSubject => {
            const dbSubject = State.syllabus.subjects.find(s => s.name === structSubject.name);
            if (!dbSubject) return structSubject;

            return {
                ...structSubject,
                id: dbSubject.id,
                topics: structSubject.topics.map(structTopic => {
                    const dbTopic = dbSubject.topics.find(t => t.name === structTopic.name);

                    return {
                        ...structTopic,
                        id: dbTopic?.id,
                        status: dbTopic?.status || 'pending',
                        score: dbTopic?.score,
                        subtopics: structTopic.subtopics?.map(structSub => {
                            const dbSub = dbSubject.topics.find(t => t.name === structSub.name);
                            return {
                                ...structSub,
                                id: dbSub?.id,
                                status: dbSub?.status || 'pending',
                                score: dbSub?.score
                            };
                        })
                    };
                })
            };
        });
    }

    return renderLayout(`
        <div class="syllabus-container animate-fade-in" id="syllabus-content">
            <div class="syllabus-header animate-slide-up">
                <div class="syllabus-header-info">
                    <h1 id="syllabus-title">${State.syllabus.name}</h1>
                    <p id="syllabus-subtitle">${displaySubjects.length} subjects • ${progress.total} topics</p>
                </div>
                <div class="syllabus-header-stats">
                    <div class="syllabus-stat-card">
                        <div class="stat-value" id="syllabus-overall-progress">${progress.percentage}%</div>
                        <div class="stat-label">Total Progress</div>
                    </div>
                    <div class="syllabus-stat-icon ${progress.percentage === 100 ? 'text-success' : 'text-muted-foreground'}" id="syllabus-trophy-icon">
                        <svg class="icon icon-lg"><use href="${ICONS_PATH}#trophy"></use></svg>
                    </div>
                </div>
            </div>

            <div class="glass-card syllabus-progress-overview animate-slide-up delay-1">
                <div class="progress-info">
                    <span id="syllabus-progress-count">${progress.completed}/${progress.total} topics verified</span>
                    <div class="progress-legend">
                        <div class="legend-item">
                            <span class="legend-dot verified"></span>
                            <span id="legend-verified">Verified (${progress.completed})</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot pending"></span>
                            <span id="legend-pending">Pending (${progress.total - progress.completed})</span>
                        </div>
                    </div>
                </div>
                <div class="progress-bar progress-bar-lg">
                    <div class="progress-bar-fill" id="syllabus-progress-fill" style="width: ${progress.percentage}%;"></div>
                </div>
            </div>

            <div class="subjects-container" id="subjects-container">
                <!-- Subjects will be injected here -->
                ${displaySubjects.map((subject, index) => {
        const topicCount = subject.topics.length; // Approximate
        const verifiedCount = 0; // Simplified
        const subjectProgress = 0;
        const isExpanded = index === 0 ? 'expanded' : '';

        return `
                        <div class="glass-card syllabus-subject ${isExpanded} animate-slide-up" data-subject="${subject.id}" style="animation-delay: ${0.1 * (index + 2)}s; margin-bottom: 1rem;">
                            <button class="syllabus-subject-header" data-toggle="${subject.id}">
                                <div class="syllabus-subject-left">
                                    <div class="syllabus-subject-icon ${subjectProgress === 100 ? 'complete' : 'pending'}">
                                        <svg class="icon"><use href="${ICONS_PATH}#book-open"></use></svg>
                                    </div>
                                    <div>
                                        <h3 class="syllabus-subject-name">${subject.name}</h3>
                                        <p class="syllabus-subject-count">${topicCount} topics</p>
                                    </div>
                                </div>
                                <div class="syllabus-subject-right">
                                    <span class="syllabus-subject-chevron">
                                        <svg class="icon"><use href="${ICONS_PATH}#chevron-down"></use></svg>
                                    </span>
                                </div>
                            </button>
                            
                            <div class="syllabus-topics">
                                ${subject.topics.map(topic => `
                                    <div class="syllabus-topic">
                                        <div class="syllabus-topic-left">
                                            <div class="syllabus-topic-status ${topic.status || 'pending'}">
                                                <svg class="icon"><use href="${ICONS_PATH}#${topic.status === 'verified' ? 'check-circle' : 'clock'}"></use></svg>
                                            </div>
                                            <div>
                                                <p class="syllabus-topic-name ${topic.status || 'pending'}">${topic.name}</p>
                                                ${Array.isArray(topic.subtopics) && topic.subtopics.length > 0 ? `
                                                    <div class="syllabus-subtopics">
                                                        ${topic.subtopics.map(st => `
                                                            <div class="syllabus-subtopic">
                                                                <div class="flex items-center gap-2">
                                                                    <svg class="icon icon-sm"><use href="${ICONS_PATH}#chevron-right"></use></svg>
                                                                    <span>${st.name}</span>
                                                                </div>
                                                                <button class="btn btn-xs ${st.status === 'verified' ? 'btn-outline' : 'btn-ghost'}" 
                                                                    onclick="window.location.href='../test/test.html?subject=${subject.id}&topic=${st.id}'"
                                                                    ${!st.id ? 'disabled' : ''}>
                                                                    ${st.status === 'verified' ? 'Retake' : 'Start'}
                                                                </button>
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                        <button class="btn ${topic.status === 'verified' ? 'btn-outline' : 'btn-gradient'} btn-sm" 
                                            data-start-test="${subject.id},${topic.id}"
                                            ${!topic.id ? 'disabled' : ''}>
                                            ${topic.status === 'verified'
                ? `<svg class="icon icon-sm"><use href="${ICONS_PATH}#target"></use></svg> Retake`
                : `<svg class="icon icon-sm"><use href="${ICONS_PATH}#play"></use></svg> Start Test`
            }
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `, 'syllabus');
}

function setupSyllabus() {
    initLayout();

    if (!State.syllabus) {
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.onclick = () => {
                window.location.href = '../upload/upload.html';
            };
        }
        return;
    }

    // Attach Toggle Listeners
    document.querySelectorAll('[data-toggle]').forEach(btn => {
        btn.onclick = () => {
            const subjectId = btn.dataset.toggle;
            const subjectEl = document.querySelector(`[data-subject="${subjectId}"]`);
            subjectEl.classList.toggle('expanded');
        };
    });

    // Attach Start Test Listeners
    document.querySelectorAll('[data-start-test]').forEach(btn => {
        btn.onclick = () => {
            const [subjectId, topicId] = btn.dataset.startTest.split(',');
            window.location.href = `../test/test.html?subject=${subjectId}&topic=${topicId}`;
        };
    });
}

async function fetchSyllabus() {
    try {
        const data = await API.getSyllabus();
        if (data && data.syllabus) {
            State.syllabus = data.syllabus;
            State.save();
        }
        const struct = await API.getSyllabusStructure();
        if (struct && struct.structure) {
            State.syllabusStructure = struct.structure;
            State.save();
        }
        renderContent();
    } catch (error) {
        console.error('Error fetching syllabus:', error);
    }
}

function renderContent() {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = renderSyllabus();
        setupSyllabus();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    State.load();
    if (!State.user) {
        window.location.href = '../auth/auth.html';
        return;
    }

    renderContent();
    if (!State.syllabus) {
        await fetchSyllabus();
    }
});
