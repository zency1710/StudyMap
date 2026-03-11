function renderTest() {
    // Get params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get('subject');
    const topicId = urlParams.get('topic');

    // Validate params
    if (!subjectId || !topicId || !State.syllabus) {
        window.location.href = '../syllabus/syllabus.html';
        return;
    }

    // Store current test in State (temporary)
    State.currentTest = { subjectId, topicId };

    const subject = State.syllabus.subjects.find(s => s.id === subjectId || s.id === `s${subjectId}`);
    const topic = subject?.topics.find(t => t.id === topicId || t.id === `t${topicId}`);

    if (!subject || !topic) {
        window.location.href = '../syllabus/syllabus.html';
        return;
    }

    return renderLayout(`
        <div class="test-container">
            <div class="test-header animate-slide-up">
                <div>
                    <h1>${topic?.name || 'Topic Test'}</h1>
                    <p>Answer at least 70% correctly to verify</p>
                </div>
                <div class="test-timer" id="timer">
                    <svg class="icon"><use href="${ICONS_PATH}#clock"></use></svg>
                    <span id="time-display">5:00</span>
                </div>
            </div>
            
            <div class="glass-card test-progress animate-slide-up delay-1">
                <div class="test-progress-header">
                    <span class="test-progress-label">Question <span id="current-q">1</span> of <span id="total-q">...</span></span>
                    <span class="test-progress-value" id="progress-percent">0%</span>
                </div>
                <div class="progress-bar progress-bar-primary" style="height: 0.5rem;">
                    <div class="progress-bar-fill" id="question-progress" style="width: 0%; background: var(--primary);"></div>
                </div>
            </div>
            
            <div class="glass-card test-question animate-slide-up delay-2" id="question-card">
                <h2 id="question-text">Loading questions...</h2>
                <div class="test-options" id="options-container">
                    <!-- Options will be injected -->
                </div>
            </div>
            
            <div class="test-navigation animate-slide-up delay-3">
                <button class="btn btn-outline" id="prev-btn" disabled>Previous</button>
                
                <div class="test-question-dots" id="dots-container">
                    <!-- Dots will be injected -->
                </div>
                
                <button class="btn btn-primary" id="next-btn" disabled>
                    Next <svg class="icon"><use href="${ICONS_PATH}#arrow-right"></use></svg>
                </button>
            </div>
        </div>
    `);
}

function setupTest() {
    initLayout();

    if (!State.currentTest) return;

    let questions = [];
    let currentIndex = 0;
    let selectedAnswer = null;
    let answers = [];
    let timeLeft = 300;
    let timerInterval = null;

    const timer = document.getElementById('timer');
    const timeDisplay = document.getElementById('time-display');
    const currentQ = document.getElementById('current-q');
    const totalQ = document.getElementById('total-q');
    const progressPercent = document.getElementById('progress-percent');
    const questionProgress = document.getElementById('question-progress');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const dotsContainer = document.getElementById('dots-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    async function loadQuestions() {
        try {
            const data = await API.getQuestions(State.currentTest.topicId);
            questions = data.questions;
            answers = new Array(questions.length).fill(null);
            totalQ.textContent = questions.length;

            // Initialize dots
            dotsContainer.innerHTML = questions.map((_, i) => `
                <button class="test-question-dot ${i === 0 ? 'current' : 'unanswered'}" data-dot="${i}">${i + 1}</button>
            `).join('');

            document.querySelectorAll('.test-question-dot').forEach(dot => {
                dot.onclick = () => {
                    const index = parseInt(dot.dataset.dot);
                    answers[currentIndex] = selectedAnswer;
                    currentIndex = index;
                    updateQuestion();
                };
            });

            startTimer();
            updateQuestion();
        } catch (error) {
            console.error('Test error:', error);
            Toast.show('Error', 'Failed to load test questions', 'destructive');
        }
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            timeLeft--;
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

            if (timeLeft <= 60) timer.classList.add('warning');
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                submitTest();
            }
        }, 1000);
    }

    function updateQuestion() {
        const question = questions[currentIndex];
        if (!question) return;

        questionText.textContent = question.question;

        const progressValue = ((currentIndex + 1) / questions.length) * 100;
        currentQ.textContent = currentIndex + 1;
        progressPercent.textContent = Math.round(progressValue) + '%';
        questionProgress.style.width = progressValue + '%';

        optionsContainer.innerHTML = question.options.map((opt, i) => `
            <button class="test-option ${answers[currentIndex] === i ? 'selected' : ''}" data-option="${i}">
                <div class="test-option-letter">${String.fromCharCode(65 + i)}</div>
                <span class="test-option-text">${opt}</span>
            </button>
        `).join('');

        // Update dots
        document.querySelectorAll('.test-question-dot').forEach((dot, i) => {
            dot.className = 'test-question-dot';
            if (i === currentIndex) {
                dot.classList.add('current');
            } else if (answers[i] !== null) {
                dot.classList.add('answered');
            } else {
                dot.classList.add('unanswered');
            }
        });

        prevBtn.disabled = currentIndex === 0;
        selectedAnswer = answers[currentIndex];
        updateNextBtn();

        document.querySelectorAll('.test-option').forEach(btn => {
            btn.onclick = () => {
                selectedAnswer = parseInt(btn.dataset.option);
                answers[currentIndex] = selectedAnswer;
                document.querySelectorAll('.test-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                updateNextBtn();
            };
        });
    }

    function updateNextBtn() {
        nextBtn.disabled = selectedAnswer === null;
        if (currentIndex === questions.length - 1) {
            nextBtn.innerHTML = `Submit Test <svg class="icon"><use href="${ICONS_PATH}#check-circle"></use></svg>`;
            nextBtn.className = 'btn btn-gradient';
        } else {
            nextBtn.innerHTML = `Next <svg class="icon"><use href="${ICONS_PATH}#arrow-right"></use></svg>`;
            nextBtn.className = 'btn btn-primary';
        }
    }

    prevBtn.onclick = () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateQuestion();
        }
    };

    nextBtn.onclick = () => {
        if (selectedAnswer === null) return;
        answers[currentIndex] = selectedAnswer;
        if (currentIndex < questions.length - 1) {
            currentIndex++;
            updateQuestion();
        } else {
            submitTest();
        }
    };

    async function submitTest() {
        clearInterval(timerInterval);

        try {
            const data = await API.submitTest(State.currentTest.topicId, answers);

            // Build per-question review HTML
            const reviewHTML = (data.results || []).map((r, i) => {
                const statusClass = r.isCorrect ? 'correct' : 'wrong';
                const statusIcon = r.isCorrect ? '✓' : '✗';

                const optionsHTML = (r.options || []).map((opt, oi) => {
                    let cls = 'review-option';
                    if (oi === r.correctAnswer) cls += ' review-correct';
                    if (oi === r.userAnswer && !r.isCorrect) cls += ' review-wrong';
                    const badge = oi === r.correctAnswer
                        ? '<span class="review-badge correct-badge">Correct</span>'
                        : (oi === r.userAnswer && !r.isCorrect ? '<span class="review-badge wrong-badge">Your Answer</span>' : '');
                    return `<div class="${cls}">
                        <span class="review-opt-letter">${String.fromCharCode(65 + oi)}</span>
                        <span class="review-opt-text">${opt}</span>
                        ${badge}
                    </div>`;
                }).join('');

                return `<div class="review-item ${statusClass}">
                    <div class="review-item-header">
                        <span class="review-num">Q${i + 1}</span>
                        <span class="review-question">${r.question}</span>
                        <span class="review-status-icon ${statusClass}">${statusIcon}</span>
                    </div>
                    <div class="review-options">${optionsHTML}</div>
                    ${r.userAnswer === null || r.userAnswer === undefined
                        ? '<p class="review-skipped">Not answered</p>' : ''}
                </div>`;
            }).join('');

            // Show result
            const container = document.querySelector('.test-container');
            container.innerHTML = `
                <div class="glass-card test-result animate-slide-up" style="text-align: center; padding: 2.5rem 2rem 2rem;">
                    <div class="result-icon ${data.passed ? 'success' : 'failed'}" style="margin-bottom: 1.5rem;">
                        <svg class="icon icon-xl" style="width: 72px; height: 72px; color: ${data.passed ? 'var(--success)' : 'var(--destructive)'};"><use href="${ICONS_PATH}#${data.passed ? 'check-circle' : 'x-circle'}"></use></svg>
                    </div>
                    <h1 style="font-size: 2.25rem; margin-bottom: 0.75rem;">${data.passed ? 'Topic Verified!' : 'Not Quite There'}</h1>
                    <p style="font-size: 1.125rem; color: var(--muted-foreground); margin-bottom: 0.5rem;">
                        You scored <strong style="color: ${data.passed ? 'var(--success)' : 'var(--destructive)'};">${data.score}%</strong>
                    </p>
                    <p style="font-size: 0.9rem; color: var(--muted-foreground); margin-bottom: 2rem;">
                        ${data.correct} correct out of ${data.total} questions
                    </p>

                    <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 2.5rem; flex-wrap: wrap;">
                        <button class="btn btn-outline" id="res-back-btn">Back to Syllabus</button>
                        ${!data.passed ? '<button class="btn btn-gradient" id="res-retry-btn">Try Again</button>' : ''}
                    </div>

                    ${data.results && data.results.length > 0 ? `
                    <div class="review-section">
                        <div class="review-header">
                            <div class="review-summary">
                                <span class="review-stat correct"><span class="review-stat-dot correct"></span>${data.correct} Correct</span>
                                <span class="review-stat wrong"><span class="review-stat-dot wrong"></span>${data.total - data.correct} Wrong</span>
                            </div>
                            <h3 class="review-title">Question Review</h3>
                        </div>
                        <div class="review-list">${reviewHTML}</div>
                    </div>` : ''}
                </div>
            `;

            document.getElementById('res-back-btn').onclick = () => {
                window.location.href = '../syllabus/syllabus.html';
            };

            if (document.getElementById('res-retry-btn')) {
                document.getElementById('res-retry-btn').onclick = () => {
                    window.location.reload();
                };
            }

            if (data.passed) {
                // Update local state
                State.updateTopicStatus(State.currentTest.subjectId, State.currentTest.topicId, 'verified', data.score);

                // Update streak on backend
                try {
                    const streakResponse = await API.updateStreak();
                    if (streakResponse.streak) {
                        State.streak = streakResponse.streak;
                        State.save();
                    }
                } catch (e) {
                    console.error('Failed to update streak on backend', e);
                    State.updateStreak();
                }

                Toast.show('Congratulations!', 'Topic verified and streak updated!', 'success');
            } else {
                Toast.show('Keep practicing!', 'Score at least 70% to verify the topic.', 'warning');
            }
        } catch (error) {
            console.error('Submit error:', error);
            Toast.show('Error', 'Failed to submit test', 'destructive');
        }
    }

    loadQuestions();
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
        app.innerHTML = renderTest();
        setupTest();
    }
});
