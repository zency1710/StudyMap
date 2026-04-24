async function loadExamStatus() {
    try {
        const response = await API.getFinalExamStatus();
        if (response.unlocked !== undefined) {
            State.examStatus = response;
            if (response.alreadyTaken) {
                State.finalExamScore = response.score;
            } else {
                State.finalExamScore = null;
            }
            State.save();
        }
        setupFinalExam();
    } catch (error) {
        console.error('Error loading exam status:', error);
    }
}

function setupFinalExam() {
    const progress = State.getProgress();
    const isUnlocked = State.examStatus?.unlocked || false;

    const lockedView = document.getElementById('exam-locked');
    const startView = document.getElementById('exam-start');
    const resultView = document.getElementById('exam-result');
    const activeView = document.getElementById('exam-active');

    // Reset views
    lockedView.classList.add('hidden');
    startView.classList.add('hidden');
    resultView.classList.add('hidden');
    if (activeView) activeView.classList.add('hidden');

    if (!isUnlocked) {
        // Show Locked View
        lockedView.classList.remove('hidden');
        document.getElementById('locked-progress-text').textContent = `${progress.completed}/${progress.total} topics`;
        document.getElementById('locked-progress-fill').style.width = `${progress.percentage}%`;
        document.getElementById('locked-remaining-text').textContent = `${progress.total - progress.completed} topics remaining`;

        document.getElementById('continue-learning-btn').onclick = () => {
            window.location.href = '../syllabus/syllabus.html';
        };
        return;
    }

    // Always show Start View when unlocked
    startView.classList.remove('hidden');

    // Attach Listeners
    document.getElementById('start-exam-btn').onclick = startExam;
    document.getElementById('retake-exam-btn').onclick = retakeExam;
    document.getElementById('back-dashboard-btn').onclick = () => {
        window.location.href = '../dashboard/dashboard.html';
    };
}

function renderResult(score) {
    const resultIconContainer = document.getElementById('result-icon-container');
    const resultIcon = document.getElementById('result-icon');
    const resultScore = document.getElementById('result-score');

    if (score >= 60) {
        resultIconContainer.style.background = 'hsla(142, 76%, 36%, 0.1)';
        resultIcon.style.color = 'var(--success)';
        resultScore.style.color = 'var(--success)';
    } else {
        resultIconContainer.style.background = 'hsla(38, 92%, 50%, 0.1)';
        resultIcon.style.color = 'var(--warning)';
        resultScore.style.color = 'var(--warning)';
    }
    resultScore.textContent = `${score}%`;
}

let examQuestions = [];
let currentIndex = 0;
let answers = [];
let timeLeft = 3600; // 60 minutes
let timerInterval = null;

async function startExam() {
    const btn = document.getElementById('start-exam-btn');
    btn.disabled = true;
    btn.innerHTML = `<svg class="icon animate-spin"><use href="../assets/icons.svg#loader"></use></svg> Loading...`;

    try {
        const response = await API.getFinalExamQuestions();
        examQuestions = response.questions || [];
        
        if (examQuestions.length === 0) {
            Toast.show('Error', 'No questions available for final exam.', 'destructive');
            btn.disabled = false;
            btn.innerHTML = `Start Final Exam <svg class="icon"><use href="../assets/icons.svg#arrow-right"></use></svg>`;
            return;
        }

        answers = new Array(examQuestions.length).fill(null);
        currentIndex = 0;
        timeLeft = 3600; // 60 mins

        // Switch views
        document.getElementById('exam-start').classList.add('hidden');
        document.getElementById('exam-active').classList.remove('hidden');

        setupExamUI();
        startTimer();
        updateQuestion();

        Toast.show('Final Exam', 'Starting 25-question final exam. Good luck!');
    } catch (error) {
        console.error('Error starting exam:', error);
        Toast.show('Error', 'Failed to start exam. Please try again.');
        btn.disabled = false;
        btn.innerHTML = `Start Final Exam <svg class="icon"><use href="../assets/icons.svg#arrow-right"></use></svg>`;
    }
}

function setupExamUI() {
    const totalQ = document.getElementById('total-q');
    totalQ.textContent = examQuestions.length;

    const dotsContainer = document.getElementById('dots-container');
    dotsContainer.innerHTML = examQuestions.map((_, i) => `
        <button class="test-question-dot ${i === 0 ? 'current' : 'unanswered'}" data-dot="${i}" style="width: 2rem; height: 2rem; border-radius: 50%; border: 1px solid var(--border); background: var(--card); font-size: 0.8rem; cursor: pointer;">${i + 1}</button>
    `).join('');

    document.querySelectorAll('.test-question-dot').forEach(dot => {
        dot.onclick = () => {
            const index = parseInt(dot.dataset.dot);
            currentIndex = index;
            updateQuestion();
        };
    });

    document.getElementById('prev-btn').onclick = () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateQuestion();
        }
    };

    document.getElementById('next-btn').onclick = () => {
        if (currentIndex < examQuestions.length - 1) {
            currentIndex++;
            updateQuestion();
        } else {
            submitExam();
        }
    };
}

function startTimer() {
    const timeDisplay = document.getElementById('time-display');
    const timer = document.getElementById('timer');
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timeDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        if (timeLeft <= 300) timer.style.borderColor = 'var(--destructive)';
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitExam();
        }
    }, 1000);
}

function updateQuestion() {
    const question = examQuestions[currentIndex];
    if (!question) return;

    document.getElementById('question-text').textContent = question.question;

    const progressValue = ((currentIndex + 1) / examQuestions.length) * 100;
    document.getElementById('current-q').textContent = currentIndex + 1;
    document.getElementById('progress-percent').textContent = Math.round(progressValue) + '%';
    document.getElementById('question-progress').style.width = progressValue + '%';

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = question.options.map((opt, i) => `
        <button class="test-option ${answers[currentIndex] === i ? 'selected' : ''}" data-option="${i}" style="text-align: left; padding: 1rem 1.5rem; border-radius: 0.75rem; border: 1px solid var(--border); background: var(--card); color: var(--foreground); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 1rem;">
            <div class="test-option-letter" style="width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--muted); font-weight: 600;">${String.fromCharCode(65 + i)}</div>
            <span class="test-option-text">${opt}</span>
        </button>
    `).join('');

    // Highlight selected option logic
    document.querySelectorAll('.test-option').forEach(btn => {
        btn.onclick = () => {
            const selectedOpt = parseInt(btn.dataset.option);
            answers[currentIndex] = selectedOpt;
            document.querySelectorAll('.test-option').forEach(b => {
                b.classList.remove('selected');
                b.style.borderColor = 'var(--border)';
                b.style.background = 'var(--card)';
            });
            btn.classList.add('selected');
            btn.style.borderColor = 'var(--primary)';
            btn.style.background = 'hsla(var(--primary-hsl), 0.05)';
            updateNextBtn();
            updateDots();
        };
        // Apply style if already selected
        if (btn.classList.contains('selected')) {
            btn.style.borderColor = 'var(--primary)';
            btn.style.background = 'hsla(var(--primary-hsl), 0.05)';
        }
    });

    updateDots();
    updateNextBtn();
}

function updateDots() {
    document.querySelectorAll('.test-question-dot').forEach((dot, i) => {
        dot.style.background = 'var(--card)';
        dot.style.color = 'var(--foreground)';
        dot.style.borderColor = 'var(--border)';
        
        if (i === currentIndex) {
            dot.style.borderColor = 'var(--primary)';
            dot.style.borderWidth = '2px';
        } else if (answers[i] !== null) {
            dot.style.background = 'var(--primary)';
            dot.style.color = 'white';
            dot.style.borderColor = 'var(--primary)';
        }
    });
}

function updateNextBtn() {
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    
    prevBtn.disabled = currentIndex === 0;
    
    if (currentIndex === examQuestions.length - 1) {
        nextBtn.disabled = answers[currentIndex] === null;
        nextBtn.innerHTML = `Submit Exam <svg class="icon"><use href="../assets/icons.svg#check-circle"></use></svg>`;
        nextBtn.className = 'btn btn-gradient';
    } else {
        nextBtn.disabled = answers[currentIndex] === null;
        nextBtn.innerHTML = `Next <svg class="icon"><use href="../assets/icons.svg#arrow-right"></use></svg>`;
        nextBtn.className = 'btn btn-primary';
    }
}

async function submitExam() {
    if (timerInterval) clearInterval(timerInterval);
    
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.innerHTML = `<svg class="icon animate-spin"><use href="../assets/icons.svg#loader"></use></svg> Submitting...`;
    }

    try {
        const response = await API.submitFinalExam(answers);
        const score = response.score;
        
        State.finalExamScore = score;
        State.save();

        Toast.show('Exam Complete!', `You scored ${score}% on the final exam!`);

        // Switch to result view
        document.getElementById('exam-active').classList.add('hidden');
        document.getElementById('exam-result').classList.remove('hidden');
        renderResult(score);
    } catch (error) {
        console.error('Error submitting exam:', error);
        Toast.show('Error', 'Failed to submit exam. Please try again.');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = `Submit Exam <svg class="icon"><use href="../assets/icons.svg#check-circle"></use></svg>`;
        }
    }
}

function retakeExam() {
    State.finalExamScore = null;
    State.save();

    document.getElementById('exam-result').classList.add('hidden');
    document.getElementById('exam-start').classList.remove('hidden');
    const btn = document.getElementById('start-exam-btn');
    btn.disabled = false;
    btn.innerHTML = `Start Final Exam <svg class="icon"><use href="../assets/icons.svg#arrow-right"></use></svg>`;
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
    await loadExamStatus();
});
