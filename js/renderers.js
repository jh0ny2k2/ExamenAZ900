
// UI Renderers
import { els, state } from './state.js';
import { processText, linkify, getAutoExplanation, formatUserAnswer, formatCorrectAnswer, createButton, shuffle, getParams, t } from './utils.js';
import { handleAnswer, updateStatus } from './quiz.js';

export function clearOptions() {
    // The multi-select hint sits just before #options
    document.querySelectorAll('#card > .hint').forEach(h => h.remove());
    els.options.innerHTML = '';
    els.options.classList.remove('answered');
    els.feedback.innerHTML = '';
    els.feedback.className = 'hidden';
}

export function showFeedback(isCorrect, q) {
    const params = getParams();
    const explanationText = q.explanation || getAutoExplanation(q, params.lang);

    els.feedback.className = `feedback ${isCorrect ? 'ok' : 'bad'}`;
    els.feedback.innerHTML = `
        <span class="feedback-title">${isCorrect ? t('correct') : t('incorrect')}</span>
        <div>${linkify(explanationText)}</div>
    `;
}

// Brief inline warning under an element, e.g. when not every field is answered
function flash(afterEl, message) {
    const existing = afterEl.parentElement.querySelector('.flash');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'flash';
    el.textContent = message;
    afterEl.after(el);
    setTimeout(() => el.remove(), 2200);
}

// Every answer path ends here: lock the question and swap Check for Next
function finishAnswer() {
    els.options.classList.add('answered');
    els.checkBtn.classList.add('hidden');
    els.nextBtn.classList.remove('hidden');
    updateStatus();
}

export function renderQuestion() {
    const q = state.questions[state.currentIndex];

    els.question.innerHTML = processText(q.question);

    if (q.image) {
        els.question.innerHTML += `<img src="${q.image}" alt="" onerror="this.style.display='none'">`;
    }

    clearOptions();
    state.answered = false;

    if (els.nextBtn) els.nextBtn.classList.add('hidden');
    if (els.checkBtn) els.checkBtn.classList.add('hidden');

    if (q.type === 'matching') {
        renderMatching(q);
    } else if (q.type === 'dropdown') {
        renderDropdown(q);
    } else if (q.type === 'hotspot-yes-no') {
        renderHotspotYesNo(q);
    } else if (q.type === 'ordering') {
        renderOrdering(q);
    } else if (Array.isArray(q.answer)) {
        renderMultiSelect(q);
    } else {
        q.options.forEach((opt) => {
            const btn = createButton(opt, opt, () => handleAnswer(btn, q));
            els.options.appendChild(btn);
        });
    }
}

function renderHotspotYesNo(q) {
    const wrap = document.createElement('div');
    wrap.className = 'statements-wrap';

    const table = document.createElement('table');
    table.className = 'statements';
    table.innerHTML = `
        <thead><tr>
            <th>${t('statement')}</th>
            <th class="choice">${t('yes')}</th>
            <th class="choice">${t('no')}</th>
        </tr></thead>
    `;

    const tbody = document.createElement('tbody');
    const selections = new Map();

    q.statements.forEach((stmt, idx) => {
        const row = document.createElement('tr');

        const textCell = document.createElement('td');
        textCell.innerHTML = processText(stmt.text);
        row.appendChild(textCell);

        ['Yes', 'No'].forEach(val => {
            const cell = document.createElement('td');
            cell.className = 'choice';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `stmt-${idx}`;
            input.value = val;
            input.setAttribute('aria-label', `${val === 'Yes' ? t('yes') : t('no')} – ${stmt.text}`);
            input.onchange = () => {
                if (state.answered) return;
                selections.set(idx, val);
            };
            cell.appendChild(input);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    els.options.appendChild(wrap);

    els.checkBtn.classList.remove('hidden');
    els.checkBtn.onclick = () => {
        if (state.answered) return;
        if (selections.size < q.statements.length) {
            flash(wrap, t('answerAll'));
            return;
        }

        state.answered = true;
        state.answeredCount += 1;

        let allCorrect = true;
        const userSelectionArr = [];

        q.statements.forEach((stmt, idx) => {
            const userVal = selections.get(idx);
            const isRowCorrect = userVal === stmt.correct;
            if (!isRowCorrect) allCorrect = false;

            userSelectionArr.push({ text: stmt.text, selected: userVal, correct: stmt.correct, isCorrect: isRowCorrect });

            const row = tbody.children[idx];
            row.querySelectorAll('input').forEach(input => {
                input.disabled = true;
                if (state.mode === 'examen') return;
                if (input.value === stmt.correct) input.parentElement.classList.add('is-correct');
                else if (input.checked) input.parentElement.classList.add('is-wrong');
            });
            if (state.mode !== 'examen') row.classList.add(isRowCorrect ? 'row-ok' : 'row-bad');
        });

        state.userAnswers.push({
            questionIndex: state.currentIndex,
            isCorrect: allCorrect,
            details: userSelectionArr,
            type: 'hotspot-yes-no'
        });

        if (allCorrect) state.score += 1;
        if (state.mode !== 'examen') showFeedback(allCorrect, q);
        finishAnswer();
    };
}

function renderOrdering(q) {
    const cols = document.createElement('div');
    cols.className = 'order-cols';

    const makeCol = (title) => {
        const col = document.createElement('div');
        col.className = 'order-col';
        const h = document.createElement('h4');
        h.textContent = title;
        const list = document.createElement('div');
        list.className = 'order-list';
        col.append(h, list);
        cols.appendChild(col);
        return list;
    };

    const sourceList = makeCol(t('available'));
    const targetList = makeCol(t('sequence'));

    const items = shuffle([...q.items]);
    const selectedItems = [];

    const createItem = (text, isSource) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'order-item';

        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = isSource ? '+' : String(selectedItems.indexOf(text) + 1).padStart(2, '0');
        const label = document.createElement('span');
        label.textContent = text;
        item.append(num, label);

        item.onclick = () => {
            if (state.answered) return;
            const from = isSource ? items : selectedItems;
            const to = isSource ? selectedItems : items;
            const idx = from.indexOf(text);
            if (idx > -1) {
                from.splice(idx, 1);
                to.push(text);
                refreshLists();
            }
        };
        return item;
    };

    const refreshLists = () => {
        sourceList.innerHTML = '';
        targetList.innerHTML = '';

        if (items.length === 0) sourceList.innerHTML = `<div class="order-empty">${t('allSelected')}</div>`;
        items.forEach(text => sourceList.appendChild(createItem(text, true)));

        if (selectedItems.length === 0) targetList.innerHTML = `<div class="order-empty">${t('buildSequence')}</div>`;
        selectedItems.forEach(text => targetList.appendChild(createItem(text, false)));
    };

    refreshLists();
    els.options.appendChild(cols);

    els.checkBtn.classList.remove('hidden');
    els.checkBtn.onclick = () => {
        if (state.answered) return;
        if (selectedItems.length === 0) return;

        state.answered = true;
        state.answeredCount += 1;

        const isCorrect = JSON.stringify(selectedItems) === JSON.stringify(q.correctOrder);

        state.userAnswers.push({
            questionIndex: state.currentIndex,
            isCorrect: isCorrect,
            selected: [...selectedItems],
            correct: q.correctOrder,
            type: 'ordering'
        });

        if (isCorrect) state.score += 1;

        cols.querySelectorAll('.order-item').forEach(b => { b.disabled = true; });

        if (state.mode !== 'examen') {
            Array.from(targetList.children).forEach((itemEl, i) => {
                itemEl.classList.add(selectedItems[i] === q.correctOrder[i] ? 'is-ok' : 'is-bad');
            });

            if (!isCorrect) {
                q.explanation = (q.explanation || '') + `<br><br><strong>${t('correctOrder')}</strong><ol>${q.correctOrder.map(s => `<li>${s}</li>`).join('')}</ol>`;
            }
            showFeedback(isCorrect, q);
        }

        finishAnswer();
    };
}

function makeSelect(options, placeholder, extraClass = '') {
    const select = document.createElement('select');
    select.className = `field ${extraClass}`.trim();

    const ph = document.createElement('option');
    ph.text = placeholder; ph.value = ''; ph.disabled = true; ph.selected = true;
    select.add(ph);

    options.forEach(opt => {
        const o = document.createElement('option');
        o.text = opt; o.value = opt;
        select.add(o);
    });
    return select;
}

function renderDropdown(q) {
    const parts = q.question.split('{{option}}');

    if (parts.length <= 1) {
        // No placeholder in the text: behave like a normal single choice question
        q.options.forEach((opt) => {
            const btn = createButton(opt, opt, () => handleAnswer(btn, q));
            els.options.appendChild(btn);
        });
        return;
    }

    const select = makeSelect(q.options, t('selectOption'), 'inline-select');

    els.question.innerHTML = '';
    const part1 = document.createElement('span');
    part1.innerHTML = parts[0];
    const part2 = document.createElement('span');
    part2.innerHTML = parts[1];
    els.question.append(part1, select, part2);

    els.checkBtn.classList.remove('hidden');
    els.checkBtn.onclick = () => {
        if (state.answered) return;
        if (!select.value) return;

        state.answered = true;
        state.answeredCount += 1;
        const isCorrect = select.value === q.answer;

        state.userAnswers.push({
            questionIndex: state.currentIndex,
            isCorrect: isCorrect,
            selected: select.value,
            correct: q.answer,
            type: 'dropdown'
        });

        select.disabled = true;
        if (isCorrect) state.score += 1;

        if (state.mode !== 'examen') {
            select.classList.add(isCorrect ? 'is-ok' : 'is-bad');
            showFeedback(isCorrect, q);
        }

        finishAnswer();
    };
}

function renderMultiSelect(q) {
    const requiredCount = q.answer.length;
    const selected = new Set();

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = t('selectExactly', requiredCount);
    els.options.before(hint);

    q.options.forEach((opt) => {
        const btn = createButton(opt, opt, () => {
            if (state.answered) return;
            const v = btn.dataset.value;
            if (selected.has(v)) {
                selected.delete(v);
                btn.classList.remove('state-selected');
            } else {
                selected.add(v);
                btn.classList.add('state-selected');
            }
        });
        els.options.appendChild(btn);
    });

    els.checkBtn.classList.remove('hidden');
    els.checkBtn.onclick = () => {
        if (state.answered) return;
        if (selected.size !== requiredCount) {
            flash(els.options, t('selectExactly', requiredCount));
            return;
        }

        state.answered = true;
        state.answeredCount += 1;
        const correctSet = new Set(q.answer);
        const buttons = Array.from(els.options.querySelectorAll('button'));
        const userSelectionArr = Array.from(selected);

        const allCorrect = userSelectionArr.length === correctSet.size && userSelectionArr.every(sel => correctSet.has(sel));

        state.userAnswers.push({
            questionIndex: state.currentIndex,
            isCorrect: allCorrect,
            selected: userSelectionArr,
            correct: q.answer,
            type: 'multiselect'
        });

        if (allCorrect) state.score += 1;

        buttons.forEach(b => {
            b.disabled = true;
            if (state.mode === 'examen') return;
            const v = b.dataset.value;
            b.classList.remove('state-selected');
            if (correctSet.has(v)) b.classList.add('state-correct');
            else if (selected.has(v)) b.classList.add('state-incorrect');
        });

        if (state.mode !== 'examen') showFeedback(allCorrect, q);
        finishAnswer();
    };
}

function renderMatching(q) {
    const list = document.createElement('div');
    list.className = 'match-list';
    const selects = [];
    const options = shuffle([...q.right]);

    q.left.forEach((leftItem) => {
        const row = document.createElement('div');
        row.className = 'match-row';

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = leftItem;

        const select = makeSelect(options, t('selectMatch'));
        select.setAttribute('aria-label', leftItem);

        selects.push({ select, leftItem });
        row.append(label, select);
        list.appendChild(row);
    });

    els.options.appendChild(list);

    els.checkBtn.classList.remove('hidden');
    els.checkBtn.onclick = () => {
        if (state.answered) return;
        if (selects.some(s => !s.select.value)) {
            flash(list, t('answerAll'));
            return;
        }

        state.answered = true;
        state.answeredCount += 1;
        let allCorrect = true;
        const userSelectionArr = [];

        selects.forEach(({ select, leftItem }) => {
            const isOk = select.value === q.correctMap[leftItem];
            if (!isOk) allCorrect = false;

            userSelectionArr.push({ left: leftItem, selected: select.value, correct: q.correctMap[leftItem], isCorrect: isOk });

            select.disabled = true;
            if (state.mode !== 'examen') select.classList.add(isOk ? 'is-ok' : 'is-bad');
        });

        state.userAnswers.push({
            questionIndex: state.currentIndex,
            isCorrect: allCorrect,
            details: userSelectionArr,
            type: 'matching'
        });

        if (allCorrect) state.score += 1;
        if (state.mode !== 'examen') showFeedback(allCorrect, q);
        finishAnswer();
    };
}

export function renderReviewSummary() {
    const params = getParams();
    const answers = state.userAnswers;

    const itemsHtml = answers.map(ans => {
        const q = state.questions[ans.questionIndex];
        return `
            <div class="review-item" data-ok="${ans.isCorrect}">
                <div class="review-q"><span class="n">${String(ans.questionIndex + 1).padStart(2, '0')}</span><div>${processText(q.question)}</div></div>
                <dl class="review-answers">
                    <div><dt>${t('yourAnswer')}</dt><dd class="${ans.isCorrect ? 'ok' : 'bad'}">${formatUserAnswer(ans) ?? '—'}</dd></div>
                    <div><dt>${t('correctAnswer')}</dt><dd>${formatCorrectAnswer(q)}</dd></div>
                </dl>
                <div class="review-expl">${linkify(q.explanation || getAutoExplanation(q, params.lang))}</div>
            </div>
        `;
    }).join('');

    const backdrop = document.createElement('div');
    backdrop.className = 'review-backdrop';
    backdrop.innerHTML = `
        <div class="review" role="dialog" aria-modal="true" aria-labelledby="reviewTitle">
            <div class="review-head">
                <div>
                    <h2 id="reviewTitle">${t('reviewTitle')}</h2>
                    <p>${t('reviewSub', state.score, state.questions.length)}</p>
                </div>
                <button class="btn close-review">${t('close')}</button>
            </div>
            ${answers.length ? `
            <div class="review-filter">
                <button class="btn" data-filter="all" aria-pressed="true">${t('all')}</button>
                <button class="btn" data-filter="wrong" aria-pressed="false">${t('onlyWrong')}</button>
            </div>` : ''}
            <div class="review-body">
                ${answers.length ? itemsHtml : `<p class="muted">${t('noAnswers')}</p>`}
            </div>
        </div>
    `;

    const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector('.close-review').onclick = close;
    backdrop.querySelectorAll('[data-filter]').forEach(btn => {
        btn.onclick = () => {
            const onlyWrong = btn.dataset.filter === 'wrong';
            backdrop.querySelectorAll('[data-filter]').forEach(b => {
                const on = b === btn;
                b.setAttribute('aria-pressed', String(on));
                b.classList.toggle('btn-primary', on);
            });
            backdrop.querySelectorAll('.review-item').forEach(item => {
                item.hidden = onlyWrong && item.dataset.ok === 'true';
            });
        };
    });
    backdrop.querySelector('[data-filter="all"]')?.classList.add('btn-primary');
    document.addEventListener('keydown', onKey);

    document.body.appendChild(backdrop);
}
