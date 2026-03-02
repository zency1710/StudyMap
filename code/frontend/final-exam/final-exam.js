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

    // Reset views
    lockedView.classList.add('hidden');
    startView.classList.add('hidden');
    resultView.classList.add('hidden');

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

    if (State.finalExamScore !== null) {
        // Show Result View
        resultView.classList.remove('hidden');
        renderResult(State.finalExamScore);
    } else {
        // Show Start View
        startView.classList.remove('hidden');
    }

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

async function startExam() {
    const btn = document.getElementById('start-exam-btn');
    Toast.show('Final Exam', 'Starting 50-question final exam. Good luck!');

    btn.disabled = true;
    btn.innerHTML = `<svg class="icon animate-spin"><use href="../assets/icons.svg#loader"></use></svg> Processing Exam...`;

    try {
        // In a real app, we would fetch questions and show them
        // For this demo, we'll directly submit to get a score
        const response = await API.submitFinalExam([]);
        const score = response.score;
        
        State.finalExamScore = score;
        State.save();

        Toast.show('Exam Complete!', `You scored ${score}% on the final exam!`);

        // Switch to result view
        document.getElementById('exam-start').classList.add('hidden');
        document.getElementById('exam-result').classList.remove('hidden');
        renderResult(score);
    } catch (error) {
        console.error('Error submitting exam:', error);
        Toast.show('Error', 'Failed to submit exam. Please try again.');
        btn.disabled = false;
        btn.innerHTML = `Start Final Exam <svg class="icon"><use href="../assets/icons.svg#arrow-right"></use></svg>`;
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
