
// Utility Functions

// Fallback data
window.FALLBACK_QUESTIONS = [
    { "question": "Se puede crear un grupo de recursos dentro de otro grupo de recursos.", "options": ["Sí", "No"], "answer": "No" },
    { "question": "Una máquina virtual de Azure puede estar en múltiples grupos de recursos.", "options": ["Sí", "No"], "answer": "No" }
];

export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function chooseExamSubset(arr) {
    const total = arr.length;
    const min = 30;
    const max = 60;
    const count = (total >= min) ? Math.floor(Math.random() * (Math.min(max, total) - min + 1)) + min : total;
    return arr.slice(0, count);
}

export function normalizeQuestion(q, lang = 'en') {
    const n = { ...q };
    if (n.answer == null && n.right != null) n.answer = n.right;
    if (!n.type) n.type = 'yes_no';
    if (n.type === 'matching') {
        n.correctMap = n.mapping || n.answer || {};
        n.left = Array.isArray(n.left) ? n.left : Object.keys(n.correctMap);
        n.right = Array.isArray(n.right) ? n.right : Array.from(new Set(Object.values(n.correctMap)));
    }
    
    // Localization Logic
    if (lang === 'es') {
        if (n.question_es) n.question = n.question_es;
        if (n.explanation_es) n.explanation = n.explanation_es;
        if (n.options_es && Array.isArray(n.options_es) && n.options && Array.isArray(n.options)) {
            // Translate the answer(s) to Spanish based on index
            if (Array.isArray(n.answer)) {
                n.answer = n.answer.map(ans => {
                    const idx = n.options.indexOf(ans);
                    return idx !== -1 && n.options_es[idx] ? n.options_es[idx] : ans;
                });
            } else if (typeof n.answer === 'string') {
                const idx = n.options.indexOf(n.answer);
                if (idx !== -1 && n.options_es[idx]) {
                    n.answer = n.options_es[idx];
                }
            }
            // Finally swap the options array
            n.options = n.options_es;
        }
    } else {
        if (n.question_en) n.question = n.question_en;
        
        // Only use explanation_en if it is valid and not the placeholder
        const placeholder = "Explanation available in Spanish";
        if (n.explanation_en && !n.explanation_en.includes(placeholder)) {
             n.explanation = n.explanation_en;
        } else if (n.explanation_es) {
             // Fallback to Spanish if English is missing or placeholder
             n.explanation = `(ES) ${n.explanation_es}`;
        }
    }

    return n;
}

export function getParams() {
    const p = new URLSearchParams(window.location.search);
    return {
        preguntas: p.get('preguntas'),
        apuntes: p.get('apuntes'),
        name: p.get('name'),
        title: p.get('title'),
        mode: p.get('mode') || 'practica',
        lang: p.get('lang') || localStorage.getItem('lang') || 'en'
    };
}

export function getAutoExplanation(q, lang = 'en') {
    if (q.explanation) return q.explanation;

    const isEs = lang === 'es';

    if (Array.isArray(q.answer)) {
        const joined = q.answer.join(', ');
        return isEs ? `Respuestas correctas: ${joined}.` : `Correct answers: ${joined}.`;
    }

    if (q.type === 'hotspot-yes-no') {
        return isEs ? `Combinación correcta de Sí/No: ${q.answer}.` : `Correct Yes/No combination: ${q.answer}.`;
    }

    if (q.type === 'matching') {
        return isEs ? 'La respuesta correcta se basa en las correspondencias mostradas en la corrección.' : 'The correct answer is based on the mappings shown in the correction.';
    }

    if (q.type === 'ordering') {
        return isEs ? 'El orden correcto se muestra en la lista marcada como correcta.' : 'The correct order is shown in the list marked as correct.';
    }

    return isEs ? `La respuesta correcta es: ${q.answer}.` : `The correct answer is: ${q.answer}.`;
}

export function resolvePath(path) {
    if (!path) return null;
    try {
        const u = new URL(path, window.location.href);
        return u.href;
    } catch {
        return path;
    }
}

// Helper function to process text: convert /underline/ to <u>, preserve <br> and <u>, escape other HTML
export function processText(text) {
    text = String(text || '');

    // Convert /underline text /underline/ to <u>text</u>
    text = text.replace(/\/underline\s+(.*?)\s+\/underline\//g, '<u>$1</u>');

    // Replace <br>, <br />, <u> and </u> temporarily with placeholders
    text = text.replace(/<br\s*\/?>/gi, '___BR___');
    text = text.replace(/<u>/gi, '___U_OPEN___');
    text = text.replace(/<\/u>/gi, '___U_CLOSE___');

    // Escape remaining HTML
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Restore allowed tags
    text = text.replace(/___BR___/g, '<br>');
    text = text.replace(/___U_OPEN___/g, '<u>');
    text = text.replace(/___U_CLOSE___/g, '</u>');

    // Convert newlines to <br>
    text = text.replace(/\n/g, '<br>');

    return text;
}

export function linkify(text) {
    return (text || '').replace(/https?:\/\/\S+/g, (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
}

export function createButton(text, value, onClick) {
    const btn = document.createElement('button');
    const index = document.querySelectorAll('#options .option').length;
    btn.className = 'option';
    btn.dataset.value = value;

    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = String.fromCharCode(65 + index);
    const label = document.createElement('span');
    label.className = 'text';
    label.textContent = text;

    btn.append(key, label);
    btn.addEventListener('click', onClick);
    return btn;
}

export function formatUserAnswer(ans) {
    if (ans.type === 'multiselect' || Array.isArray(ans.selected)) {
        return Array.isArray(ans.selected) ? ans.selected.join(', ') : ans.selected;
    }
    if (ans.type === 'ordering') return (ans.selected || []).join(' → ');
    if (ans.type === 'matching') return (ans.details || []).map(d => `${d.left} → ${d.selected}`).join('; ');
    if (ans.type === 'hotspot-yes-no') return (ans.details || []).map(d => d.selected).join(', ');
    if (ans.type === 'matching' || ans.type === 'hotspot-yes-no') {
        return t('seeDetails');
    }
    return ans.selected;
}

export function formatCorrectAnswer(q) {
    if (Array.isArray(q.answer)) return q.answer.join(', ');
    if (q.type === 'ordering') return (q.correctOrder || []).join(' → ');
    if (q.type === 'matching') {
        // Some banks store the matching solution as plain text instead of a map
        if (q.correctMap && typeof q.correctMap === 'object') return Object.entries(q.correctMap).map(([k, v]) => `${k} → ${v}`).join('; ');
        return String(q.answer ?? '');
    }
    if (q.type === 'hotspot-yes-no') return (q.statements || []).map(st => st.correct).join(', ');
    if (typeof q.answer === 'object') return t('seeDetails');
    return q.answer;
}

const STRINGS = {
    es: {
        practiceMode: 'Modo práctica', examMode: 'Modo examen',
        toExam: 'Cambiar a examen', toPractice: 'Cambiar a práctica',
        question: 'Pregunta', accuracy: 'Acierto', complete: 'completado',
        check: 'Comprobar', next: 'Siguiente', finish: 'Ver resultado', restart: 'Reiniciar',
        correct: 'Correcto', incorrect: 'Incorrecto',
        result: 'Resultado', review: 'Revisar respuestas', retry: 'Repetir', home: 'Volver al inicio',
        resultLine: (ok, total, time) => `${ok} de ${total} correctas${time ? ` · ${time}` : ''}`,
        passed: 'Por encima del 70 %, el umbral habitual para aprobar.',
        failed: 'Por debajo del 70 %, el umbral habitual para aprobar.',
        statement: 'Afirmación', yes: 'Sí', no: 'No',
        answerAll: 'Responde todas las afirmaciones.',
        selectExactly: (n) => `Selecciona ${n} respuestas.`,
        selectOption: 'Elige una opción…', selectMatch: 'Elige la correspondencia…',
        available: 'Pasos disponibles', sequence: 'Tu orden',
        allSelected: 'No quedan pasos.', buildSequence: 'Pulsa los pasos en el orden correcto.',
        correctOrder: 'Orden correcto:',
        reviewTitle: 'Revisión', reviewSub: (s, n) => `${s} de ${n} correctas`,
        yourAnswer: 'Tu respuesta', correctAnswer: 'Respuesta correcta', explanation: 'Explicación',
        noAnswers: 'Todavía no has respondido ninguna pregunta.', close: 'Cerrar',
        all: 'Todas', onlyWrong: 'Solo falladas',
        seeDetails: 'Ver detalle en la pregunta',
    },
    en: {
        practiceMode: 'Practice mode', examMode: 'Exam mode',
        toExam: 'Switch to exam', toPractice: 'Switch to practice',
        question: 'Question', accuracy: 'Accuracy', complete: 'complete',
        check: 'Check', next: 'Next', finish: 'See result', restart: 'Restart',
        correct: 'Correct', incorrect: 'Incorrect',
        result: 'Result', review: 'Review answers', retry: 'Try again', home: 'Back to home',
        resultLine: (ok, total, time) => `${ok} of ${total} correct${time ? ` · ${time}` : ''}`,
        passed: 'Above 70%, the usual passing threshold.',
        failed: 'Below 70%, the usual passing threshold.',
        statement: 'Statement', yes: 'Yes', no: 'No',
        answerAll: 'Answer every statement.',
        selectExactly: (n) => `Select ${n} answers.`,
        selectOption: 'Choose an option…', selectMatch: 'Choose a match…',
        available: 'Available steps', sequence: 'Your order',
        allSelected: 'No steps left.', buildSequence: 'Tap the steps in the right order.',
        correctOrder: 'Correct order:',
        reviewTitle: 'Review', reviewSub: (s, n) => `${s} of ${n} correct`,
        yourAnswer: 'Your answer', correctAnswer: 'Correct answer', explanation: 'Explanation',
        noAnswers: "You haven't answered any questions yet.", close: 'Close',
        all: 'All', onlyWrong: 'Only wrong',
        seeDetails: 'See details in the question',
    }
};

export function t(key, ...args) {
    const lang = getParams().lang === 'es' ? 'es' : 'en';
    const value = STRINGS[lang][key];
    return typeof value === 'function' ? value(...args) : value;
}
