
// Main Quiz Logic
import { state, els } from './state.js';
import { getParams, resolvePath, normalizeQuestion, shuffle, chooseExamSubset } from './utils.js';
import { renderQuestion, showFeedback, renderReviewSummary, clearOptions } from './renderers.js';

export function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.startTime = Date.now();

    // Update timer every second
    state.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        if (els.timeDisplay) {
            els.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);

    if (els.timer) els.timer.classList.remove('hidden');
}

export function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

export function updateStatus() {
    if (els.current) els.current.textContent = state.currentIndex + 1;
    if (els.total) els.total.textContent = state.questions.length;

    // In Exam Mode, hide accuracy until the end
    if (state.mode === 'examen') {
        if (els.scoreContainer) els.scoreContainer.classList.add('hidden');
    } else {
        if (els.scoreContainer) els.scoreContainer.classList.remove('hidden');
        const answeredPct = Math.round(state.answeredCount > 0 ? (state.score / state.answeredCount) * 100 : 0);
        if (els.accuracy) els.accuracy.textContent = `${answeredPct}%`;
    }

    // Progress Bar
    const total = Math.max(1, state.questions.length);
    const pct = Math.round(((state.currentIndex) / total) * 100);
    if (els.progressBar) els.progressBar.style.width = `${pct}%`;
    
    // Progress Percent Text
    const progressPercent = document.getElementById('progressPercent');
    if (progressPercent) {
        const isEs = getParams().lang === 'es';
        progressPercent.textContent = isEs ? `${pct}% Completado` : `${pct}% Complete`;
    }
}

export function handleAnswer(clickedBtn, q) {
    if (state.answered) return;
    state.answered = true;
    state.answeredCount += 1;

    const correctAnswer = q.answer;
    const isCorrect = clickedBtn.dataset.value === correctAnswer;

    // Store user answer for later review
    state.userAnswers.push({
        questionIndex: state.currentIndex,
        isCorrect: isCorrect,
        selected: clickedBtn.dataset.value,
        correct: correctAnswer
    });

    if (isCorrect) state.score += 1;

    const buttons = Array.from(els.options.querySelectorAll('button'));

    // If in Exam Mode, just highlight selected answer and move on
    if (state.mode === 'examen') {
        buttons.forEach(b => {
            b.disabled = true;
            if (b === clickedBtn) {
                b.classList.add('state-selected');
            }
        });
        // Auto-advance or show next button without feedback
        if (els.nextBtn) els.nextBtn.classList.remove('hidden');
    } else {
        // Practice Mode: Show immediate feedback
        buttons.forEach((b) => {
            b.disabled = true;
            b.classList.add('cursor-default', 'opacity-80');
            const v = b.dataset.value;

            if (v === correctAnswer) {
                b.classList.add('state-correct');
                b.classList.remove('bg-white', 'dark:bg-slate-800/50', 'border-slate-200');
            } else if (b === clickedBtn && !isCorrect) {
                b.classList.add('state-incorrect');
                b.classList.remove('bg-white', 'dark:bg-slate-800/50', 'border-slate-200');
            }
        });
        showFeedback(isCorrect, q);
        if (els.nextBtn) els.nextBtn.classList.remove('hidden');
    }

    updateStatus();
}

export function nextQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex += 1;
        updateStatus();
        renderQuestion();
    } else {
        showFinal();
    }
}

export function resetQuiz() {
    state.currentIndex = 0;
    state.score = 0;
    state.answeredCount = 0;
    state.userAnswers = [];
    state.answered = false;

    stopTimer();
    if (state.mode === 'examen') {
        startTimer();
    } else {
        if (els.timer) els.timer.classList.add('hidden');
    }

    if (els.final) els.final.classList.add('hidden');
    if (els.card) els.card.classList.remove('hidden');
    shuffle(state.questions);
    updateStatus();
    renderQuestion();
}

export function showFinal() {
    if (!els.final) return;

    stopTimer();

    const finalPct = Math.round((state.score / Math.max(1, state.questions.length)) * 100);

    if (els.finalScore) els.finalScore.textContent = `${finalPct}%`;
    if (els.finalTotal) els.finalTotal.textContent = state.questions.length;

    // Show review button if in exam mode or always
    if (els.reviewBtn) {
        els.reviewBtn.classList.remove('hidden');
        els.reviewBtn.onclick = () => {
            renderReviewSummary();
        };
    }

    if (els.card) els.card.classList.add('hidden');
    els.final.classList.remove('hidden');

    // Trigger confetti
    if (finalPct >= 70 && window.confetti) {
        window.confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

async function loadQuestions() {
    const params = getParams();
    const src = resolvePath(params.preguntas);
    // Pass language param to normalizeQuestion
    const processData = (data) => Array.isArray(data) ? data.map(q => normalizeQuestion(q, params.lang)) : window.FALLBACK_QUESTIONS.map(q => normalizeQuestion(q, params.lang));

    if (src) {
        try {
            const res = await fetch(src, { cache: 'no-store' });
            if (!res.ok) throw new Error('error');
            const data = await res.json();
            return processData(data);
        } catch (e) {
            console.warn('Fallback due to load error', e);
            return window.FALLBACK_QUESTIONS.map(q => normalizeQuestion(q, params.lang));
        }
    }

    // Default fallback
    try {
        const res = await fetch('./Preguntas/preguntasAZ900.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('error');
        return processData(await res.json());
    } catch (e) {
        return window.FALLBACK_QUESTIONS.map(q => normalizeQuestion(q, params.lang));
    }
}

export async function init() {
    const params = getParams();
    if (els.examTitle) els.examTitle.textContent = params.title || params.name || 'Practice Session';
    
    // Apply language to UI
    const lang = params.lang || 'en';
    if (lang === 'es') {
        if(els.examSubtitle) els.examSubtitle.textContent = 'Preparación para Certificación';
        if(document.querySelector('#current').previousSibling) document.querySelector('#current').previousSibling.textContent = 'Pregunta ';
        if(document.querySelector('#total').previousSibling) document.querySelector('#total').previousSibling.textContent = ' de '; // Simplified
        // We might need to update other static UI text here if we want full localization in quiz view
    }

    // Set initial mode from URL or default
    state.mode = params.mode === 'examen' ? 'examen' : 'practica';

    if (els.modeSwitch) {
        // Update button text based on current state
        const updateModeBtn = () => {
            const isEs = params.lang === 'es';
            const examText = isEs ? 'Cambiar a Examen' : 'Switch to Exam';
            const practiceText = isEs ? 'Cambiar a Práctica' : 'Switch to Practice';
            
            els.modeSwitch.textContent = state.mode === 'examen' ? practiceText : examText;
            els.modeSwitch.className = state.mode === 'examen'
                ? 'text-[10px] font-bold tracking-widest uppercase px-6 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all'
                : 'text-[10px] font-bold tracking-widest uppercase px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm hover:scale-105 active:scale-95 transition-all';
        };
        updateModeBtn();

        els.modeSwitch.addEventListener('click', () => {
            // Toggle mode
            state.mode = state.mode === 'examen' ? 'practica' : 'examen';
            updateModeBtn();
            resetQuiz(); // Restart session when mode changes
        });
    }

    const loaded = await loadQuestions();
    const shuffled = shuffle(loaded);
    state.questions = state.mode === 'examen' ? chooseExamSubset(shuffled) : shuffled;

    if (state.mode === 'examen') {
        startTimer();
    }

    updateStatus();
    renderQuestion();

    if (els.nextBtn) els.nextBtn.addEventListener('click', nextQuestion);
    if (els.resetBtn) els.resetBtn.addEventListener('click', resetQuiz);
    if (els.restartBtn) els.restartBtn.addEventListener('click', resetQuiz);
}
