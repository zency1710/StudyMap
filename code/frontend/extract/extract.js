function renderExtract() {
    return renderLayout(`
        <div class="extract-container">
            <div class="extract-header animate-slide-up">
                <h1>Extract Syllabus</h1>
                <p>We'll analyze your PDF and extract subjects and topics</p>
            </div>
            
            <div class="glass-card extract-status animate-slide-up delay-1" id="extract-status">
                <div class="extract-status-icon">
                    <svg class="icon"><use href="${ICONS_PATH}#file-text"></use></svg>
                </div>
                <h2>Ready to Extract</h2>
                <p>Click the button below to start analyzing your PDF</p>
                <button class="btn btn-gradient btn-lg" id="start-extract">
                    <svg class="icon"><use href="${ICONS_PATH}#book-open"></use></svg>
                    Start Extraction
                </button>
            </div>
            
            <div id="extract-content" class="hidden">
                <!-- Content will be injected -->
            </div>
        </div>
    `);
}

function setupExtract() {
    initLayout();

    const urlParams = new URLSearchParams(window.location.search);
    const syllabusId = urlParams.get('syllabus_id');

    if (!syllabusId) {
        Toast.show('Error', 'No syllabus ID provided', 'destructive');
        setTimeout(() => window.location.href = '../upload/upload.html', 2000);
        return;
    }

    const startBtn = document.getElementById('start-extract');
    const statusDiv = document.getElementById('extract-status');
    const contentDiv = document.getElementById('extract-content');

    function cleanCID(text) {
        if (!text) return '';
        // Replace (cid:415) and similar with best guesses or spaces
        return text.replace(/\(cid:415\)/g, 'ti')
                   .replace(/\(cid:\d+\)/g, ' ');
    }

    startBtn.onclick = async () => {
        statusDiv.innerHTML = `
            <div class="extract-status-icon extracting">
                <span class="animate-spin" style="display: inline-block;">
                    <svg class="icon"><use href="${ICONS_PATH}#loader"></use></svg>
                </span>
            </div>
            <h2>Analyzing PDF...</h2>
            <p>Extracting units, topics and sub-topics from your syllabus</p>
        `;

        try {
            console.log('Fetching syllabus structure with ID:', syllabusId);
            const data = await API.getSyllabusStructureById(syllabusId);
            console.log('Syllabus structure received:', data);
            
            if (!data.structure || !data.structure.subjects) {
                throw new Error('No extracted data found. Please try uploading again.');
            }
            
            // Normalize: clean CID artifacts and ensure unique IDs
            extractedData = data.structure.subjects.map((subject, si) => ({
                id: subject.id || ('s_' + si),
                name: cleanCID(subject.name),
                topics: (subject.topics || []).map((topic, ti) => ({
                    id: topic.id || ('t_' + si + '_' + ti),
                    name: cleanCID(topic.name),
                    subtopics: (topic.subtopics || []).map((st, sti) => ({
                        id: st.id || ('st_' + si + '_' + ti + '_' + sti),
                        name: cleanCID(st.name)
                    }))
                }))
            }));

            Toast.show('Extraction complete!', `We found ${extractedData.length} subjects in your syllabus.`);

            statusDiv.classList.add('hidden');
            contentDiv.classList.remove('hidden');

            renderExtractedContent();
        } catch (error) {
            console.error('Extraction error:', error);
            Toast.show('Extraction failed', error.message, 'destructive');
            statusDiv.innerHTML = `
                <div class="extract-status-icon text-destructive">
                    <svg class="icon"><use href="${ICONS_PATH}#alert-circle"></use></svg>
                </div>
                <h2>Extraction Failed</h2>
                <p>${error.message}</p>
                <button class="btn btn-gradient btn-lg" id="start-extract-retry">
                    <svg class="icon"><use href="${ICONS_PATH}#rotate-ccw"></use></svg>
                    Retry
                </button>
            `;
            const retryBtn = document.getElementById('start-extract-retry');
            if (retryBtn) retryBtn.onclick = () => window.location.reload();
        }
    };

    function renderExtractedContent() {
        const totalTopics = extractedData.reduce((acc, s) => acc + (s.topics ? s.topics.length : 0), 0);
        const totalSubtopics = extractedData.reduce((acc, s) =>
            acc + (s.topics || []).reduce((a, t) => a + (t.subtopics ? t.subtopics.length : 0), 0), 0);

        contentDiv.innerHTML = `
            <div class="glass-card extract-summary animate-fade-in">
                <div class="extract-summary-content">
                    <div class="extract-summary-info">
                        <div class="extract-summary-icon">
                            <svg class="icon"><use href="${ICONS_PATH}#check-circle"></use></svg>
                        </div>
                        <div>
                            <h2 class="extract-summary-title">Extraction Complete</h2>
                            <p class="extract-summary-subtitle">Found ${extractedData.length} units, ${totalTopics} topics and ${totalSubtopics} sub-topics</p>
                        </div>
                    </div>
                    <button class="btn btn-outline" id="add-subject-btn">
                        <svg class="icon"><use href="${ICONS_PATH}#plus"></use></svg>
                        Add Unit
                    </button>
                </div>
            </div>
            
            <div id="subjects-list" style="margin-top: 1rem;"></div>
            
            <div class="extract-actions" style="margin-top: 1.5rem;">
                <button class="btn btn-outline" id="upload-different">Upload Different PDF</button>
                <button class="btn btn-gradient btn-lg" id="confirm-save">
                    Confirm & Start Learning
                    <svg class="icon"><use href="${ICONS_PATH}#arrow-right"></use></svg>
                </button>
            </div>
        `;

        renderSubjectsList();

        document.getElementById('add-subject-btn').onclick = () => {
            extractedData.push({
                id: 's' + Date.now(),
                name: 'New Subject',
                topics: [],
            });
            renderSubjectsList();
        };

        document.getElementById('upload-different').onclick = () => {
            window.location.href = '../upload/upload.html';
        };

        document.getElementById('confirm-save').onclick = async () => {
            try {
                const subjects = extractedData.map(s => ({
                    name: s.name,
                    topics: s.topics.map(t => ({
                        name: t.name,
                        subtopics: (t.subtopics || []).map(st => ({ name: st.name }))
                    }))
                }));
                
                const data = await API.extractSyllabus(syllabusId, subjects);
                
                // Clear old data and set new syllabus
                State.clearSyllabusData();
                State.syllabus = data.syllabus;
                State.save();
                
                Toast.show('Syllabus saved!', 'Your syllabus has been saved. Start learning!');
                setTimeout(() => window.location.href = '../syllabus/syllabus.html', 1500);
            } catch (error) {
                console.error('Error saving syllabus:', error);
                Toast.show('Error', 'Failed to save syllabus', 'destructive');
            }
        };

        const cancelSave = document.getElementById('cancel-save');
        if (cancelSave) {
            cancelSave.onclick = () => {
                const saveModal = document.getElementById('save-modal');
                if (saveModal) saveModal.classList.add('hidden');
            };
        }

        // Navigation
        document.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.onclick = (e) => {
                if (item.getAttribute('href') === '../upload/upload.html') {
                    if (confirm('Are you sure you want to leave? Your progress will be lost.')) {
                        window.location.href = '../upload/upload.html';
                    }
                    e.preventDefault();
                }
            };
        });
    }

    function renderSubjectsList() {
        const subjectsList = document.getElementById('subjects-list');

        subjectsList.innerHTML = extractedData.map((subject, index) => `
            <div class="glass-card subject-card animate-slide-up" style="animation-delay: ${0.1 * index}s;">
                <div class="subject-header">
                    <div class="subject-header-left">
                        <span class="subject-header-icon">
                            <svg class="icon"><use href="${ICONS_PATH}#book-open"></use></svg>
                        </span>
                        <input type="text" class="subject-name-input" value="${subject.name.replace(/"/g, '&quot;')}" data-subject-id="${subject.id}">
                        <span class="subject-count">(${subject.topics ? subject.topics.length : 0} topics)</span>
                    </div>
                    <div class="subject-header-actions">
                        <button class="btn btn-ghost btn-sm text-destructive" data-delete-subject="${subject.id}">
                            <svg class="icon"><use href="${ICONS_PATH}#trash"></use></svg>
                        </button>
                    </div>
                </div>
                <div class="subject-topics">
                    ${(subject.topics || []).map(topic => `
                        <div class="topic-block" data-topic-block="${subject.id},${topic.id}">
                            <div class="topic-item">
                                <div class="topic-item-left">
                                    <span class="topic-bullet">&#9654;</span>
                                    <input type="text" class="topic-name-input" value="${topic.name.replace(/"/g, '&quot;')}" data-subject-id="${subject.id}" data-topic-id="${topic.id}">
                                </div>
                                <div class="topic-actions">
                                    <button class="btn btn-ghost btn-sm add-subtopic-btn" title="Add Sub-topic" data-add-subtopic="${subject.id},${topic.id}">
                                        <svg class="icon"><use href="${ICONS_PATH}#plus"></use></svg>
                                    </button>
                                    <button class="btn btn-ghost btn-sm text-destructive" data-delete-topic="${subject.id},${topic.id}">
                                        <svg class="icon"><use href="${ICONS_PATH}#trash"></use></svg>
                                    </button>
                                </div>
                            </div>
                            ${(topic.subtopics || []).length > 0 ? `
                            <div class="subtopics-list">
                                ${(topic.subtopics || []).map(st => `
                                    <div class="subtopic-item">
                                        <span class="subtopic-bullet">&#8227;</span>
                                        <input type="text" class="subtopic-name-input" value="${st.name.replace(/"/g, '&quot;')}" data-subject-id="${subject.id}" data-topic-id="${topic.id}" data-subtopic-id="${st.id}">
                                        <button class="btn btn-ghost btn-sm text-destructive subtopic-delete-btn" data-delete-subtopic="${subject.id},${topic.id},${st.id}">
                                            <svg class="icon"><use href="${ICONS_PATH}#trash"></use></svg>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>` : ''}
                        </div>
                    `).join('')}
                    <button class="btn btn-ghost btn-sm add-topic-btn" data-add-topic="${subject.id}">
                        <svg class="icon"><use href="${ICONS_PATH}#plus"></use></svg>
                        Add Topic
                    </button>
                </div>
            </div>
        `).join('');

        // Subject name change
        document.querySelectorAll('.subject-name-input').forEach(input => {
            input.onchange = (e) => {
                const id = e.target.dataset.subjectId;
                const subject = extractedData.find(s => s.id == id);
                if (subject) subject.name = e.target.value;
            };
        });

        // Topic name change
        document.querySelectorAll('.topic-name-input').forEach(input => {
            input.onchange = (e) => {
                const sid = e.target.dataset.subjectId;
                const tid = e.target.dataset.topicId;
                const subject = extractedData.find(s => s.id == sid);
                if (subject) {
                    const topic = subject.topics.find(t => t.id == tid);
                    if (topic) topic.name = e.target.value;
                }
            };
        });

        // Sub-topic name change
        document.querySelectorAll('.subtopic-name-input').forEach(input => {
            input.onchange = (e) => {
                const sid = e.target.dataset.subjectId;
                const tid = e.target.dataset.topicId;
                const stid = e.target.dataset.subtopicId;
                const subject = extractedData.find(s => s.id == sid);
                if (subject) {
                    const topic = subject.topics.find(t => t.id == tid);
                    if (topic) {
                        const st = (topic.subtopics || []).find(x => x.id == stid);
                        if (st) st.name = e.target.value;
                    }
                }
            };
        });

        // Delete subject
        document.querySelectorAll('[data-delete-subject]').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.deleteSubject;
                extractedData = extractedData.filter(s => s.id != id);
                renderSubjectsList();
            };
        });

        // Delete topic
        document.querySelectorAll('[data-delete-topic]').forEach(btn => {
            btn.onclick = () => {
                const [subjectId, topicId] = btn.dataset.deleteTopic.split(',');
                extractedData = extractedData.map(s =>
                    s.id == subjectId
                        ? { ...s, topics: s.topics.filter(t => t.id != topicId) }
                        : s
                );
                renderSubjectsList();
            };
        });

        // Delete sub-topic
        document.querySelectorAll('[data-delete-subtopic]').forEach(btn => {
            btn.onclick = () => {
                const [sid, tid, stid] = btn.dataset.deleteSubtopic.split(',');
                extractedData = extractedData.map(s =>
                    s.id == sid
                        ? { ...s, topics: s.topics.map(t =>
                            t.id == tid
                                ? { ...t, subtopics: (t.subtopics || []).filter(x => x.id != stid) }
                                : t) }
                        : s
                );
                renderSubjectsList();
            };
        });

        // Add topic
        document.querySelectorAll('[data-add-topic]').forEach(btn => {
            btn.onclick = () => {
                const subjectId = btn.dataset.addTopic;
                extractedData = extractedData.map(s =>
                    s.id == subjectId
                        ? { ...s, topics: [...(s.topics || []), { id: 't' + Date.now(), name: 'New Topic', subtopics: [] }] }
                        : s
                );
                renderSubjectsList();
            };
        });

        // Add sub-topic
        document.querySelectorAll('[data-add-subtopic]').forEach(btn => {
            btn.onclick = () => {
                const [sid, tid] = btn.dataset.addSubtopic.split(',');
                extractedData = extractedData.map(s =>
                    s.id == sid
                        ? { ...s, topics: s.topics.map(t =>
                            t.id == tid
                                ? { ...t, subtopics: [...(t.subtopics || []), { id: 'st' + Date.now(), name: 'New Sub-topic' }] }
                                : t) }
                        : s
                );
                renderSubjectsList();
            };
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    State.load();
    if (!State.user) {
        window.location.href = '../auth/auth.html';
        return;
    }
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = renderExtract();
        setupExtract();
    }
});
