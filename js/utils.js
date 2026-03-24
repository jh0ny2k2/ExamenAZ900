
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
    return (text || '').replace(/https?:\/\/\S+/g, (url) => `<a href="${url}" target="_blank" class="underline decoration-brand-500/30 underline-offset-4 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors font-medium">${url}</a>`);
}

export function createButton(text, value, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    // Modern professional button style
    btn.className = 'option-btn w-full text-left px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.99] shadow-sm';
    btn.dataset.value = value;
    btn.addEventListener('click', onClick);
    return btn;
}

export function formatUserAnswer(ans) {
    if (ans.type === 'multiselect' || Array.isArray(ans.selected)) {
        return Array.isArray(ans.selected) ? ans.selected.join(', ') : ans.selected;
    }
    if (ans.type === 'matching' || ans.type === 'hotspot-yes-no') {
        return 'See details in question context'; // Simplified
    }
    return ans.selected;
}

export function formatCorrectAnswer(q) {
    if (Array.isArray(q.answer)) return q.answer.join(', ');
    if (typeof q.answer === 'object') return 'Complex Answer';
    return q.answer;
}
