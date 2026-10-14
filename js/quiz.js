
// Main Quiz Logic
import { state, els } from './state.js';
import { getParams, resolvePath, normalizeQuestion, shuffle, chooseExamSubset, t } from './utils.js';
import { renderQuestion, showFeedback, renderReviewSummary, clearOptions } from './renderers.js';

function formatElapsed() {
    if (!state.startTime) return '';
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.startTime = Date.now();
    if (els.timeDisplay) els.timeDisplay.textContent = '00:00';

    state.timerInterval = setInterval(() => {
        if (els.timeDisplay) els.timeDisplay.textContent = formatElapsed();
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
    if (els.examSubtitle) els.examSubtitle.textContent = state.mode === 'examen' ? t('examMode') : t('practiceMode');

    // In Exam Mode, hide accuracy until the end
    if (state.mode === 'examen') {
        if (els.scoreContainer) els.scoreContainer.classList.add('hidden');
    } else {
        if (els.scoreContainer) els.scoreContainer.classList.remove('hidden');
        const answeredPct = Math.round(state.answeredCount > 0 ? (state.score / state.answeredCount) * 100 : 0);
        if (els.accuracy) els.accuracy.textContent = `${answeredPct}%`;
    }

    // Progress counts answered questions, so the bar fills completely on the last one
    const total = Math.max(1, state.questions.length);
    const done = state.currentIndex + (state.answered ? 1 : 0);
    if (els.progressBar) els.progressBar.style.width = `${Math.round((done / total) * 100)}%`;

    if (els.nextBtn) {
        const isLast = state.currentIndex >= state.questions.length - 1;
        els.nextBtn.textContent = isLast ? t('finish') : t('next');
    }
}

export function handleAnswer(clickedBtn, q) {
    if (state.answered) return;
    state.answered = true;
    state.answeredCount += 1;

    const correctAnswer = q.answer;
    const isCorrect = clickedBtn.dataset.value === correctAnswer;

    state.userAnswers.push({
        questionIndex: state.currentIndex,
        isCorrect: isCorrect,
        selected: clickedBtn.dataset.value,
        correct: correctAnswer
    });

    if (isCorrect) state.score += 1;

    const buttons = Array.from(els.options.querySelectorAll('button'));
    els.options.classList.add('answered');

    if (state.mode === 'examen') {
        // Exam Mode: only mark the chosen answer, no correction
        buttons.forEach(b => {
            b.disabled = true;
            if (b === clickedBtn) b.classList.add('state-selected');
        });
    } else {
        buttons.forEach((b) => {
            b.disabled = true;
            const v = b.dataset.value;
            if (v === correctAnswer) b.classList.add('state-correct');
            else if (b === clickedBtn && !isCorrect) b.classList.add('state-incorrect');
        });
        showFeedback(isCorrect, q);
    }

    if (els.nextBtn) els.nextBtn.classList.remove('hidden');
    updateStatus();
}

export function nextQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex += 1;
        state.answered = false;
        renderQuestion();
        updateStatus();
        window.scrollTo({ top: 0 });
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
        state.startTime = null;
        if (els.timer) els.timer.classList.add('hidden');
    }

    if (els.final) els.final.classList.add('hidden');
    if (els.card) els.card.classList.remove('hidden');
    shuffle(state.questions);
    renderQuestion();
    updateStatus();
}

export function showFinal() {
    if (!els.final) return;

    const time = state.mode === 'examen' ? formatElapsed() : '';
    stopTimer();

    const total = Math.max(1, state.questions.length);
    const finalPct = Math.round((state.score / total) * 100);

    if (els.finalScore) els.finalScore.textContent = `${finalPct}%`;
    if (els.finalTotal) els.finalTotal.textContent = state.questions.length;
    const line = document.getElementById('finalLine');
    if (line) line.textContent = t('resultLine', state.score, state.questions.length, time);
    const verdict = document.getElementById('finalVerdict');
    if (verdict) {
        verdict.textContent = finalPct >= 70 ? t('passed') : t('failed');
        verdict.className = `result-verdict ${finalPct >= 70 ? 'ok' : 'bad'}`;
    }

    if (els.reviewBtn) els.reviewBtn.onclick = () => renderReviewSummary();

    if (els.card) els.card.classList.add('hidden');
    els.final.classList.remove('hidden');
    if (els.progressBar) els.progressBar.style.width = '100%';
}

async function loadQuestions() {
    const params = getParams();
    const src = resolvePath(params.preguntas);
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
        const res = await fetch('../Preguntas/preguntasAZ900.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('error');
        return processData(await res.json());
    } catch (e) {
        return window.FALLBACK_QUESTIONS.map(q => normalizeQuestion(q, params.lang));
    }
}

function applyStaticText() {
    const params = getParams();
    document.documentElement.lang = params.lang === 'es' ? 'es' : 'en';
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });

    const title = params.title || params.name || 'CertHub';
    if (els.examTitle) els.examTitle.textContent = title;
    document.title = `${title} · CertHub`;
}

// A–Z picks an option, Enter checks or moves on
function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (document.querySelector('.review-backdrop')) return;
        if (/select|input|textarea/i.test(document.activeElement?.tagName)) return;
        if (els.card?.classList.contains('hidden')) return;

        if (e.key === 'Enter') {
            const target = [els.checkBtn, els.nextBtn].find(b => b && !b.classList.contains('hidden'));
            // Leave Enter alone on other focused controls (links, restart, mode switch)
            const focused = document.activeElement;
            const free = !focused || focused === document.body || focused.matches('.option, .order-item');
            if (target && free) {
                e.preventDefault();
                target.click();
            }
            return;
        }

        if (/^[a-z]$/i.test(e.key)) {
            const options = els.options.querySelectorAll('.option');
            const option = options[e.key.toUpperCase().charCodeAt(0) - 65];
            if (option && !option.disabled) {
                e.preventDefault();
                option.click();
            }
        }
    });
}

export async function init() {
    const params = getParams();
    applyStaticText();

    state.mode = params.mode === 'examen' ? 'examen' : 'practica';

    if (els.modeSwitch) {
        const updateModeBtn = () => {
            els.modeSwitch.textContent = state.mode === 'examen' ? t('toPractice') : t('toExam');
        };
        updateModeBtn();

        els.modeSwitch.addEventListener('click', () => {
            state.mode = state.mode === 'examen' ? 'practica' : 'examen';
            const url = new URL(location.href);
            url.searchParams.set('mode', state.mode);
            history.replaceState(null, '', url);
            updateModeBtn();
            resetQuiz();
        });
    }

    const loaded = await loadQuestions();
    const shuffled = shuffle(loaded);
    state.questions = state.mode === 'examen' ? chooseExamSubset(shuffled) : shuffled;

    if (state.mode === 'examen') startTimer();

    renderQuestion();
    updateStatus();
    bindKeyboard();

    if (els.nextBtn) els.nextBtn.addEventListener('click', nextQuestion);
    if (els.resetBtn) els.resetBtn.addEventListener('click', resetQuiz);
    if (els.restartBtn) els.restartBtn.addEventListener('click', resetQuiz);
}
