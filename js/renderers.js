
// UI Renderers
import { els, state } from './state.js';
import { processText, linkify, getAutoExplanation, formatUserAnswer, formatCorrectAnswer, createButton, shuffle, getParams } from './utils.js';
import { handleAnswer, updateStatus, showFinal } from './quiz.js';

export function clearOptions() {
    els.options.innerHTML = '';
    els.feedback.innerHTML = '';
    els.feedback.classList.add('hidden');
    els.feedback.className = 'mt-10 hidden animate-premium-in';
}

export function showFeedback(isCorrect, q) {
    const params = getParams();
    const isEs = params.lang === 'es';
    
    const baseMsg = isCorrect 
        ? (isEs ? 'Brilliant!' : 'Brilliant!') 
        : (isEs ? 'Not quite right' : 'Not quite right');
    
    const colorClass = isCorrect 
        ? 'text-green-800 bg-green-50 border-green-200 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/30' 
        : 'text-red-800 bg-red-50 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30';
    const icon = isCorrect ? 'fa-circle-check' : 'fa-circle-xmark';

    const explanationText = q.explanation || getAutoExplanation(q, params.lang);

    els.feedback.innerHTML = `
    <div class="p-6 rounded-2xl border ${colorClass} flex gap-5 items-start shadow-sm backdrop-blur-sm">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-white/50 dark:bg-black/20 shadow-sm">
            <i class="fa-solid ${icon} text-xl"></i>
        </div>
        <div class="flex-1">
            <div class="font-heading font-bold text-lg mb-1">${baseMsg}</div>
            <div class="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                ${linkify(explanationText)}
            </div>
        </div>
    </div>
  `;
    els.feedback.classList.remove('hidden');
}

export function renderQuestion() {
    const q = state.questions[state.currentIndex];

    // Process text using helper function
    els.question.innerHTML = processText(q.question);

    // Add Image if exists
    if (q.image) {
        els.question.innerHTML += `<div class="mt-6 mb-4 flex justify-center"><img src="${q.image}" class="max-w-full max-h-[400px] h-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" alt="Question Image" onerror="this.style.display='none'"></div>`;
    }

    clearOptions();
    state.answered = false;

    if (els.nextBtn) els.nextBtn.classList.add('hidden');
    if (els.checkBtn) els.checkBtn.classList.add('hidden');

    // Only show check button in Practice Mode
    // In Exam Mode, "Next Question" acts as confirm or handleAnswer triggers immediately
    
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
    // ... (existing container creation code) ...
    const container = document.createElement('div');
    container.className = 'w-full overflow-x-auto mt-8 bg-white dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm';

    const table = document.createElement('table');
    table.className = 'w-full text-left border-collapse min-w-[600px]';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr class="bg-slate-50 dark:bg-slate-900/40">
          <th class="p-5 border-b border-slate-200 dark:border-slate-700 font-heading font-bold text-slate-900 dark:text-white w-full text-sm uppercase tracking-wider">Statement</th>
          <th class="p-5 border-b border-slate-200 dark:border-slate-700 font-heading font-bold text-slate-900 dark:text-white text-center w-28 text-sm uppercase tracking-wider">Yes</th>
          <th class="p-5 border-b border-slate-200 dark:border-slate-700 font-heading font-bold text-slate-900 dark:text-white text-center w-28 text-sm uppercase tracking-wider">No</th>
      </tr>
  `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const selections = new Map();

    q.statements.forEach((stmt, idx) => {
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors';

        const textCell = document.createElement('td');
        textCell.className = 'p-5 text-slate-700 dark:text-slate-300 leading-relaxed font-medium';
        textCell.innerHTML = processText(stmt.text);

        const createRadio = (val) => {
            const cell = document.createElement('td');
            cell.className = 'p-5 text-center';

            const label = document.createElement('label');
            label.className = 'inline-flex items-center justify-center cursor-pointer p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-90';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `stmt-${idx}`;
            input.value = val;
            input.className = 'w-6 h-6 text-brand-600 border-slate-300 focus:ring-4 focus:ring-brand-500/10 cursor-pointer accent-brand-600';

            input.onchange = () => {
                if (state.answered) return;
                selections.set(idx, val);
            };

            label.appendChild(input);
            cell.appendChild(label);
            return { cell, input };
        };

        const yes = createRadio('Yes');
        const no = createRadio('No');

        row.appendChild(textCell);
        row.appendChild(yes.cell);
        row.appendChild(no.cell);
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    els.options.appendChild(container);

    if (els.checkBtn) {
        els.checkBtn.classList.remove('hidden');
        els.checkBtn.onclick = () => {
            if (state.answered) return;
            if (selections.size < q.statements.length) {
                const feedback = document.createElement('div');
                feedback.className = 'mt-4 text-red-500 font-medium text-center animate-pulse';
                feedback.textContent = 'Please answer all statements.';
                container.after(feedback);
                setTimeout(() => feedback.remove(), 2000);
                return;
            }

            state.answered = true;
            state.answeredCount += 1;

            let allCorrect = true;
            const userSelectionArr = []; // For storing user answers

            q.statements.forEach((stmt, idx) => {
                const userVal = selections.get(idx);
                const isRowCorrect = userVal === stmt.correct;
                if (!isRowCorrect) allCorrect = false;
                
                userSelectionArr.push({ text: stmt.text, selected: userVal, correct: stmt.correct, isCorrect: isRowCorrect });

                if (state.mode !== 'examen') {
                    // Feedback only in Practice Mode
                    const row = tbody.children[idx];
                    const inputs = row.querySelectorAll('input');
                    inputs.forEach(input => {
                        input.disabled = true;
                        if (input.value === stmt.correct) {
                            input.parentElement.classList.add('bg-green-100', 'dark:bg-green-900/30');
                        } else if (input.checked && !isRowCorrect) {
                            input.parentElement.classList.add('bg-red-100', 'dark:bg-red-900/30');
                        }
                    });

                    if (!isRowCorrect) {
                        row.children[0].classList.add('text-red-600', 'dark:text-red-400');
                    } else {
                        row.children[0].classList.add('text-green-600', 'dark:text-green-400');
                    }
                } else {
                    // Exam Mode: just disable inputs
                     const row = tbody.children[idx];
                    const inputs = row.querySelectorAll('input');
                    inputs.forEach(input => input.disabled = true);
                }
            });

            state.userAnswers.push({
                questionIndex: state.currentIndex,
                isCorrect: allCorrect,
                details: userSelectionArr,
                type: 'hotspot-yes-no'
            });

            if (allCorrect) state.score += 1;
            
            if (state.mode !== 'examen') {
                showFeedback(allCorrect, q);
            }
            
            els.checkBtn.classList.add('hidden');
            els.nextBtn.classList.remove('hidden');
            updateStatus();
        };
    }
}

function renderOrdering(q) {
    // ... (existing container creation code) ...
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-6 mt-6';

    const sourceTitle = document.createElement('h4');
    sourceTitle.textContent = 'Available Steps';
    sourceTitle.className = 'font-semibold text-slate-700 dark:text-slate-300';

    const sourceList = document.createElement('div');
    sourceList.className = 'flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[100px]';

    const targetTitle = document.createElement('h4');
    targetTitle.textContent = 'Correct Sequence';
    targetTitle.className = 'font-semibold text-slate-700 dark:text-slate-300';

    const targetList = document.createElement('div');
    targetList.className = 'flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[100px] relative';

    const items = shuffle([...q.items]); 
    const selectedItems = [];

    const createItem = (text, isSource) => {
        const item = document.createElement('div');
        item.textContent = text;
        item.className = 'p-3 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-brand-50 dark:hover:bg-slate-600 transition-colors flex justify-between items-center';

        if (!isSource) {
            const num = document.createElement('span');
            num.className = 'w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs flex items-center justify-center font-bold mr-3';
            num.textContent = selectedItems.indexOf(text) + 1;
            item.prepend(num);
        } else {
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-plus text-slate-400';
            item.appendChild(icon);
        }

        item.onclick = () => {
            if (state.answered) return;
            if (isSource) {
                const idx = items.indexOf(text);
                if (idx > -1) {
                    items.splice(idx, 1);
                    selectedItems.push(text);
                    refreshLists();
                }
            } else {
                const idx = selectedItems.indexOf(text);
                if (idx > -1) {
                    selectedItems.splice(idx, 1);
                    items.push(text);
                    refreshLists();
                }
            }
        };
        return item;
    };

    const refreshLists = () => {
        sourceList.innerHTML = '';
        targetList.innerHTML = '';

        if (items.length === 0) {
            sourceList.innerHTML = '<div class="text-slate-400 text-sm text-center italic py-2">All items selected</div>';
        }

        items.forEach(text => {
            sourceList.appendChild(createItem(text, true));
        });

        if (selectedItems.length === 0) {
            targetList.innerHTML = '<div class="text-slate-400 text-sm text-center italic py-2">Select items to build sequence</div>';
        }

        selectedItems.forEach(text => {
            targetList.appendChild(createItem(text, false));
        });
    };

    refreshLists();

    container.appendChild(sourceTitle);
    container.appendChild(sourceList);
    container.appendChild(targetTitle);
    container.appendChild(targetList);
    els.options.appendChild(container);

    if (els.checkBtn) {
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

            if (state.mode !== 'examen') {
                 // Visual feedback on items
                const targetDivs = targetList.children;
                for (let i = 0; i < targetDivs.length; i++) {
                    const itemDiv = targetDivs[i];
                    const itemText = selectedItems[i];
                    if (itemText === q.correctOrder[i]) {
                        itemDiv.classList.add('border-green-500', 'bg-green-50', 'dark:bg-green-900/20');
                        itemDiv.classList.remove('border-slate-200', 'dark:border-slate-600', 'bg-white', 'dark:bg-slate-700');
                    } else {
                        itemDiv.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                        itemDiv.classList.remove('border-slate-200', 'dark:border-slate-600', 'bg-white', 'dark:bg-slate-700');
                    }
                }

                if (!isCorrect) {
                    q.explanation = (q.explanation || '') + `<br><br><strong>Correct Order:</strong><ol class="list-decimal ml-5 mt-2 space-y-1">${q.correctOrder.map(s => `<li>${s}</li>`).join('')}</ol>`;
                }
                showFeedback(isCorrect, q);
            } else {
                 // Exam mode: disable interactions
                 // (items are already unclickable because state.answered is true)
            }

            els.checkBtn.classList.add('hidden');
            els.nextBtn.classList.remove('hidden');
            updateStatus();
        };
    }
}

function renderDropdown(q) {
    // ... (existing parts handling) ...
    const parts = q.question.split('{{option}}');

    if (parts.length > 1) {
        const select = document.createElement('select');
        select.className = 'inline-block max-w-full md:w-auto min-w-[200px] p-2.5 mx-2 my-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-bg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 font-medium align-middle whitespace-normal overflow-hidden text-ellipsis';

        const ph = document.createElement('option');
        ph.text = 'Select an option...'; ph.value = ''; ph.disabled = true; ph.selected = true;
        select.add(ph);

        q.options.forEach(opt => {
            const o = document.createElement('option');
            o.text = opt; o.value = opt;
            select.add(o);
        });

        els.question.innerHTML = ''; 
        const wrapper = document.createElement('div');
        wrapper.className = 'text-lg md:text-xl leading-relaxed text-slate-900 dark:text-white flex flex-wrap items-baseline gap-2'; 

        const part1 = document.createElement('span');
        part1.innerHTML = parts[0];
        wrapper.appendChild(part1);
        wrapper.appendChild(select);
        const part2 = document.createElement('span');
        part2.innerHTML = parts[1];
        wrapper.appendChild(part2);

        els.question.appendChild(wrapper);

        if (els.checkBtn) {
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
                    select.classList.add(isCorrect ? 'bg-green-50' : 'bg-red-50');
                    select.classList.add(isCorrect ? 'border-green-500' : 'border-red-500');
                    select.classList.add(isCorrect ? 'text-green-900' : 'text-red-900');
                    showFeedback(isCorrect, q);
                } else {
                     // Exam mode: just proceed
                }
                
                els.checkBtn.classList.add('hidden');
                els.nextBtn.classList.remove('hidden');
                updateStatus();
            };
        }
    } else {
        // If no placeholder, render as standard multiple choice buttons
        q.options.forEach((opt) => {
            const btn = createButton(opt, opt, () => handleAnswer(btn, q));
            els.options.appendChild(btn);
        });
    }
}

function renderMultiSelect(q) {
    const requiredCount = q.answer.length;
    const selected = new Set();

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

    if (els.checkBtn) {
        els.checkBtn.classList.remove('hidden');
        els.checkBtn.onclick = () => {
            if (state.answered) return;
            // Add visual warning if not enough options selected
            if (selected.size !== requiredCount) {
                const feedback = document.createElement('div');
                feedback.className = 'mt-4 text-brand-600 font-medium text-center animate-pulse';
                feedback.textContent = `Please select exactly ${requiredCount} options.`;
                els.options.after(feedback);
                setTimeout(() => feedback.remove(), 2000);
                return; 
            }

            state.answered = true;
            state.answeredCount += 1;
            const correctSet = new Set(q.answer);
            let allCorrect = true;

            const buttons = Array.from(els.options.querySelectorAll('button'));
            
            // Track user answer
            const userSelectionArr = Array.from(selected);
            
            // Check correctness
            userSelectionArr.forEach(sel => {
                if (!correctSet.has(sel)) allCorrect = false;
            });
            if (userSelectionArr.length !== correctSet.size) allCorrect = false;

            state.userAnswers.push({
                questionIndex: state.currentIndex,
                isCorrect: allCorrect,
                selected: userSelectionArr,
                correct: q.answer,
                type: 'multiselect'
            });

            if (allCorrect) state.score += 1;
            
            if (state.mode === 'examen') {
                 buttons.forEach(b => {
                    b.disabled = true;
                });
            } else {
                // Practice Mode Feedback
                buttons.forEach(b => {
                    b.disabled = true;
                    const v = b.dataset.value;
                    const isSel = selected.has(v);
                    const isCor = correctSet.has(v);

                    if (isCor) b.classList.add('state-correct');
                    else if (isSel && !isCor) {
                        b.classList.add('state-incorrect');
                    }
                    b.classList.remove('state-selected');
                });
                showFeedback(allCorrect, q);
            }

            els.checkBtn.classList.add('hidden');
            els.nextBtn.classList.remove('hidden');
            updateStatus();
        };
    }
}

function renderMatching(q) {
    // ... (existing container) ...
    const container = document.createElement('div');
    container.className = 'space-y-4';
    const selects = [];
    const options = shuffle([...q.right]);

    q.left.forEach((leftItem) => {
        const row = document.createElement('div');
        row.className = 'flex flex-col md:flex-row gap-3 items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700';

        const label = document.createElement('div');
        label.textContent = leftItem;
        label.className = 'flex-1 font-medium text-slate-700 dark:text-slate-200';

        const select = document.createElement('select');
        select.className = 'w-full md:w-1/2 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-bg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500';

        const ph = document.createElement('option');
        ph.text = 'Select match...'; ph.value = ''; ph.disabled = true; ph.selected = true;
        select.add(ph);

        options.forEach(opt => {
            const o = document.createElement('option');
            o.text = opt; o.value = opt;
            select.add(o);
        });

        selects.push({ select, leftItem });
        row.appendChild(label);
        row.appendChild(select);
        container.appendChild(row);
    });

    els.options.appendChild(container);
    if (els.checkBtn) {
        els.checkBtn.classList.remove('hidden');
        els.checkBtn.onclick = () => {
            if (state.answered) return;
            if (selects.some(s => !s.select.value)) return;

            state.answered = true;
            state.answeredCount += 1;
            let allCorrect = true;
            const userSelectionArr = [];

            selects.forEach(({ select, leftItem }) => {
                const isOk = select.value === q.correctMap[leftItem];
                if (!isOk) allCorrect = false;
                
                userSelectionArr.push({ left: leftItem, selected: select.value, correct: q.correctMap[leftItem], isCorrect: isOk });

                select.disabled = true;
                if (state.mode !== 'examen') {
                    select.classList.add(isOk ? 'bg-green-50' : 'bg-red-50');
                    select.classList.add(isOk ? 'border-green-500' : 'border-red-500');
                }
            });

            state.userAnswers.push({
                questionIndex: state.currentIndex,
                isCorrect: allCorrect,
                details: userSelectionArr,
                type: 'matching'
            });

            if (allCorrect) state.score += 1;
            
            if (state.mode !== 'examen') {
                showFeedback(allCorrect, q);
            }

            els.checkBtn.classList.add('hidden');
            els.nextBtn.classList.remove('hidden');
            updateStatus();
        };
    }
}

export function renderReviewSummary() {
    // Show ALL answers (correct and incorrect)
    const allAnswers = state.userAnswers;
    const params = getParams();
    const isEs = params.lang === 'es';
    
    let html = `<div class="w-full text-left space-y-6 max-h-[60vh] overflow-y-auto pr-2">`;
    
    if (allAnswers.length === 0) {
        html += `<p class="text-center text-slate-500">${isEs ? 'No se han respondido preguntas aún.' : 'No questions answered yet.'}</p>`;
    } else {
        html += `<div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-lg">${isEs ? `Revisión Detallada (${state.score}/${state.questions.length})` : `Detailed Review (${state.score}/${state.questions.length})`}</h3>
                    <div class="flex gap-2 text-sm">
                        <span class="px-2 py-1 bg-green-100 text-green-700 rounded">${isEs ? 'Correcto' : 'Correct'}</span>
                        <span class="px-2 py-1 bg-red-100 text-red-700 rounded">${isEs ? 'Incorrecto' : 'Incorrect'}</span>
                    </div>
                 </div>`;

        allAnswers.forEach((ans, i) => {
            const q = state.questions[ans.questionIndex];
            const isCorrect = ans.isCorrect;
            const statusColor = isCorrect 
                ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30' 
                : 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30';
            
            const icon = isCorrect 
                ? '<i class="fa-solid fa-check-circle text-green-600"></i>' 
                : '<i class="fa-solid fa-xmark-circle text-red-600"></i>';

            html += `
                <div class="p-4 rounded-xl border ${statusColor} relative">
                    <div class="absolute top-4 right-4 text-xl">${icon}</div>
                    <div class="font-medium text-slate-900 dark:text-white mb-2 pr-8">
                        <span class="font-bold text-slate-500 mr-2">#${ans.questionIndex + 1}</span>
                        ${processText(q.question)}
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 mb-3 text-sm">
                        <div class="${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}">
                            <span class="font-bold block text-xs uppercase tracking-wider mb-1 opacity-70">${isEs ? 'Tu Respuesta' : 'Your Answer'}</span>
                            ${formatUserAnswer(ans)}
                        </div>
                        <div class="text-green-700 dark:text-green-400">
                            <span class="font-bold block text-xs uppercase tracking-wider mb-1 opacity-70">${isEs ? 'Respuesta Correcta' : 'Correct Answer'}</span>
                            ${formatCorrectAnswer(q)}
                        </div>
                    </div>

                    <div class="text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-3 rounded border border-slate-100 dark:border-slate-700/50">
                        <span class="font-bold block mb-1">${isEs ? 'Explicación:' : 'Explanation:'}</span>
                        ${linkify(q.explanation || getAutoExplanation(q, params.lang))}
                    </div>
                </div>
            `;
        });
    }
    html += '</div>';
    
    const container = document.createElement('div');
    container.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm';
    container.innerHTML = `
        <div class="bg-white dark:bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
            <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 rounded-t-2xl">
                <div>
                    <h2 class="text-xl font-bold text-slate-900 dark:text-white">${isEs ? 'Resultados del Examen' : 'Exam Results Review'}</h2>
                    <p class="text-sm text-slate-500">${isEs ? 'Revisa tus respuestas y explicaciones' : 'Review all your answers and explanations'}</p>
                </div>
                <button class="close-review w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
            <div class="p-6 overflow-y-auto custom-scrollbar">
                ${html}
            </div>
            <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl flex justify-end">
                <button class="close-review px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm">
                    ${isEs ? 'Cerrar Revisión' : 'Close Review'}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);
    const closeBtns = container.querySelectorAll('.close-review');
    closeBtns.forEach(btn => btn.onclick = () => container.remove());
}
