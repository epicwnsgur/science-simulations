import { icon } from './icons.js';
import { blockPaste, PASTE_MESSAGE, hasBadWords, hasBlank } from './text-guard.js';

// 수준별 지원 화면(내용은 src/supports.js).
// mountHelp: 글 칸 아래 ‘막히면 도움 받기’. ① 힌트를 하나씩 → ② 낱말 상자(누르면 글 칸에 넣어 줘요) → ③ 문장 틀(빈칸 ___을 내 말로 채워요).
//   스스로 써 보다가 막힐 때 조금씩 도움을 받도록 순서를 정했어요. 문장 틀의 빈칸은 하나씩 골라 주고(‘다음 빈칸’), 빈칸이 남으면 저장되지 않아요.
// mountChallenge: 개념 정리 아래 ‘도전 과제(선택)’. 틀리면 힌트를 먼저 보여 주고, 한 번 더 틀리면 풀이를 보여 줘요.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BLANK = /_{2,}/g;

// 글 칸에서 from 뒤의 첫 빈칸을 골라 둬요(없으면 처음부터 다시 찾아요). 고르면 바로 그 자리에 써서 바꿀 수 있어요.
function selectBlank(area, from = 0) {
  BLANK.lastIndex = from;
  let m = BLANK.exec(area.value);
  if (!m && from) { BLANK.lastIndex = 0; m = BLANK.exec(area.value); }
  if (!m) return false;
  area.focus({ preventScroll: true });
  area.setSelectionRange(m.index, m.index + m[0].length);
  return true;
}
// 글 칸의 커서 자리(고른 빈칸이 있으면 그 자리)에 낱말을 넣어요.
// 빈칸은 낱말로 그대로 바꾸고(문장 틀의 띄어쓰기를 지켜요), 글 중간에 넣을 때는 앞뒤 낱말과 붙지 않게 띄어 써요.
function insertWord(area, word) {
  const start = area.selectionStart ?? area.value.length, end = area.selectionEnd ?? start;
  const replacedBlank = /^_{2,}$/.test(area.value.slice(start, end));
  const before = area.value.slice(0, start), after = area.value.slice(end);
  const text = replacedBlank ? word : `${before && !/[\s(]$/.test(before) ? ' ' : ''}${word}${/^[\p{L}\p{N}]/u.test(after) ? ' ' : ''}`;
  area.setRangeText(text, start, end, 'end');
  area.dispatchEvent(new Event('input', { bubbles: true }));
  if (!(replacedBlank && selectBlank(area, area.selectionEnd))) area.focus({ preventScroll: true });
}

export function mountHelp(area, support, { getShown = () => 0, setShown = () => {} } = {}) {
  const hints = support.hints ?? [], words = support.words ?? [];
  const bar = document.createElement('div');
  bar.className = 'help-bar';
  bar.dataset.helpFor = area.id;
  bar.innerHTML = `<p class="help-title">${icon('hint')} 막히면 도움 받기 <small>먼저 스스로 써 보고, 필요한 만큼만 차례로 눌러요.</small></p>
    <div class="help-buttons" role="group" aria-label="글쓰기 도움">
      ${hints.length ? '<button type="button" class="help-btn" data-help="hint"></button>' : ''}
      ${words.length ? `<button type="button" class="help-btn" data-help="words" aria-expanded="false" aria-controls="${area.id}-words">② 낱말 상자</button>` : ''}
      ${support.frame ? '<button type="button" class="help-btn" data-help="frame">③ 문장 틀 넣기</button>' : ''}
      <button type="button" class="help-btn help-next" data-help="blank" hidden>다음 빈칸 고르기 ▶</button>
    </div>
    <ol class="help-hints" aria-live="polite"></ol>
    <div class="help-words" id="${area.id}-words" hidden><p>누르면 글 칸의 커서 자리(고른 빈칸)에 들어가요.</p>${words.map(w => `<button type="button" class="help-chip" data-word="${escape(w)}">${escape(w)}</button>`).join('')}</div>
    <p class="help-frame-note" hidden>밑줄 빈칸(___)을 내가 관찰하고 생각한 말로 바꿔 써요. 빈칸이 남아 있으면 저장되지 않아요.</p>`;
  const out = area.parentElement.querySelector(`.char-count[data-for="${area.id}"]`) ?? area;
  out.after(bar);
  const q = sel => bar.querySelector(sel);

  function render() {
    const shown = Math.min(getShown(), hints.length), off = area.readOnly || area.disabled;
    bar.hidden = off;
    const hintBtn = q('[data-help="hint"]');
    if (hintBtn) {
      hintBtn.disabled = shown >= hints.length;
      hintBtn.textContent = shown >= hints.length ? `① 힌트를 모두 봤어요 (${hints.length}개)` : `① 힌트 ${shown + 1} 보기 (${shown} / ${hints.length})`;
    }
    q('.help-hints').innerHTML = hints.slice(0, shown).map((h, n) => `<li><b>힌트 ${n + 1}</b> ${escape(h)}</li>`).join('');
    const blanks = hasBlank(area.value);
    q('[data-help="blank"]').hidden = !blanks;
    q('.help-frame-note').hidden = !blanks;
  }
  bar.addEventListener('click', ev => {
    const btn = ev.target.closest('button');
    if (!btn || area.readOnly) return;
    if (btn.dataset.word) return insertWord(area, btn.dataset.word);
    const kind = btn.dataset.help;
    if (kind === 'hint') { setShown(Math.min(getShown() + 1, hints.length)); render(); q('.help-hints li:last-child')?.classList.add('fresh'); }
    if (kind === 'words') { const box = q('.help-words'); box.hidden = !box.hidden; btn.setAttribute('aria-expanded', String(!box.hidden)); }
    if (kind === 'frame') {
      // 이미 넣은 틀에 빈칸이 남아 있으면 다시 넣지 않고 빈칸을 골라 줘요.
      if (!hasBlank(area.value)) {
        const end = area.value.trimEnd();
        area.value = end ? `${end}\n${support.frame}` : support.frame;
        area.dispatchEvent(new Event('input', { bubbles: true }));
        // 틀이 길면 글 칸을 늘려 틀 전체가 한눈에 보이게 해요.
        if (area.scrollHeight > area.clientHeight) area.style.height = `${area.scrollHeight + 4}px`;
        selectBlank(area, end.length);
      } else selectBlank(area);
    }
    if (kind === 'blank') selectBlank(area, area.selectionEnd);
  });
  area.addEventListener('input', render);
  render();
  return { render };
}

// 도전 과제: 객관식(choice)과 숫자로 답하는 문제(number), 그리고 생각을 써 보는 질문(think).
// saved: { items: [{ tries, answer, solved, revealed }], think }. 보고서(PDF·미리보기)에 결과를 함께 보여 줘요.
const CIRCLED = ['①', '②', '③', '④', '⑤'];
export const parseNumber = text => {
  const m = String(text ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};
export const isRight = (item, answer) => item.type === 'number'
  ? Math.abs(parseNumber(answer) - item.answer) <= (item.tolerance ?? 0) + 1e-9
  : Number(answer) === item.answer;
export const answerText = item => item.type === 'number' ? `${item.answer} ${item.unit}` : `${CIRCLED[item.answer]} ${item.options[item.answer]}`;
const mineText = (item, answer) => answer === null || answer === undefined || answer === '' ? '' : item.type === 'number' ? `${answer}${/[^\d.\s-]/.test(String(answer)) ? '' : ` ${item.unit}`}` : `${CIRCLED[answer]} ${item.options[answer]}`;
export const resultOf = s => s?.solved ? (s.tries <= 1 ? '한 번에 해결' : '힌트를 보고 해결') : s?.revealed ? '풀이를 보고 확인' : s?.tries ? '푸는 중' : '풀지 않음';

export function mountChallenge(container, challenge, { saved = null, onChange = () => {}, onPasteBlocked = () => {} } = {}) {
  const items = challenge.items;
  const fresh = () => ({ items: items.map(() => ({ tries: 0, answer: null, solved: false, revealed: false })), think: '' });
  let state = saved?.items?.length === items.length ? saved : fresh();
  container.innerHTML = `<span class="small-tag challenge-tag">${icon('flag')} 선택 · 더 해 보고 싶은 사람</span><h2 id="challenge-title">도전 과제</h2>
    <p class="challenge-intro">배운 내용을 새로운 상황에 써 보는 문제예요. 풀지 않아도 보고서를 낼 수 있어요. 틀리면 먼저 힌트를 보여 주고, 한 번 더 틀리면 풀이를 보여 줘요.</p>
    ${items.map((item, n) => `<div class="challenge-item" data-item="${n}"><h3 id="challenge-q-${n}">도전 ${n + 1}. ${escape(item.question)}</h3>
      ${item.type === 'number'
        ? `<div class="challenge-number"><input id="challenge-input-${n}" inputmode="decimal" autocomplete="off" maxlength="12" aria-labelledby="challenge-q-${n}" placeholder="숫자"><span class="challenge-unit">${escape(item.unit)}</span><button type="button" class="secondary" data-check="${n}">확인</button></div>`
        : `<div class="answers stacked" role="group" aria-labelledby="challenge-q-${n}">${item.options.map((o, i) => `<button type="button" data-item="${n}" data-option="${i}"><span class="answer-label">${CIRCLED[i]} ${escape(o)}</span><span class="pick-tag" aria-hidden="true"></span></button>`).join('')}</div>`}
      <p class="challenge-feedback" id="challenge-feedback-${n}" aria-live="polite"></p></div>`).join('')}
    ${challenge.think ? `<div class="challenge-think"><h3>생각 더하기</h3><label class="writing-label" for="challenge-think">${escape(challenge.think)}</label><textarea id="challenge-think" rows="3" maxlength="800" placeholder="정답이 하나로 정해지지 않은 질문이에요. 배운 내용을 근거로 내 생각을 써 보세요."></textarea><p class="challenge-think-note poe-hint">쓴 글은 PDF 보고서에 함께 들어가요.</p></div>` : ''}
    <div class="challenge-foot"><p class="challenge-score" role="status" aria-live="polite"></p><button type="button" class="secondary" id="challenge-retry">도전 과제 다시 풀기</button></div>`;
  const q = sel => container.querySelector(sel);
  const think = q('#challenge-think');

  function render() {
    items.forEach((item, n) => {
      const s = state.items[n], done = s.solved || s.revealed, out = q(`#challenge-feedback-${n}`);
      if (item.type === 'number') {
        const input = q(`#challenge-input-${n}`), check = q(`[data-check="${n}"]`);
        if (document.activeElement !== input) input.value = s.answer ?? '';
        input.readOnly = done; check.disabled = done;
        input.classList.toggle('right', s.solved); input.classList.toggle('wrong', !s.solved && s.revealed);
      } else {
        container.querySelectorAll(`button[data-item="${n}"]`).forEach(b => {
          const i = +b.dataset.option, chosen = s.answer === i, right = i === item.answer;
          b.disabled = done;
          b.classList.toggle('chosen', chosen);
          b.classList.toggle('right', chosen && right && done);
          b.classList.toggle('wrong', chosen && !right);
          b.classList.toggle('answer', s.revealed && !chosen && right);
          b.setAttribute('aria-pressed', String(chosen));
          b.querySelector('.pick-tag').textContent = chosen ? (right ? '✓ 내 답 · 정답' : done ? '✕ 내 답' : '✕ 다시 생각해 봐요') : s.revealed && right ? '정답' : '';
        });
      }
      out.className = `challenge-feedback${s.solved ? ' right' : s.revealed ? ' wrong' : s.tries ? ' hint' : ''}`;
      out.innerHTML = s.solved ? `✓ ${s.tries <= 1 ? '한 번에 맞혔어요!' : '힌트를 보고 해결했어요!'} ${escape(item.explanation)}`
        : s.revealed ? `풀이를 확인해요. 정답: ${escape(answerText(item))}<br>${escape(item.explanation)}`
        : s.tries ? `아직 아니에요. <b>힌트</b> ${escape(item.hint)} <small>(한 번 더 해 볼 수 있어요)</small>` : '';
    });
    const solved = state.items.filter(s => s.solved).length, tried = state.items.filter(s => s.solved || s.revealed).length;
    q('.challenge-score').textContent = tried ? `도전 ${items.length}문제 중 ${solved}문제 해결${tried < items.length ? ` · ${items.length - tried}문제 남음` : solved === items.length ? ' · 모두 해결했어요!' : ''}` : '';
    if (think && document.activeElement !== think) think.value = state.think ?? '';
  }
  function answer(n, value) {
    const s = state.items[n], item = items[n];
    if (s.solved || s.revealed) return;
    if (item.type === 'number' && Number.isNaN(parseNumber(value))) { q(`#challenge-feedback-${n}`).textContent = '숫자로 답해 주세요.'; return; }
    s.tries += 1; s.answer = item.type === 'number' ? String(value).trim() : value;
    if (isRight(item, value)) s.solved = true;
    else if (s.tries >= 2) s.revealed = true;
    render(); onChange(state);
  }
  container.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.option !== undefined) answer(+b.dataset.item, +b.dataset.option);
    if (b.dataset.check !== undefined) answer(+b.dataset.check, q(`#challenge-input-${b.dataset.check}`).value);
  });
  container.querySelectorAll('.challenge-number input').forEach(input => input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); answer(+input.id.split('-').pop(), input.value); }
  }));
  if (think) {
    think.addEventListener('input', () => {
      state.think = think.value; onChange(state);
      think.setCustomValidity(hasBadWords(think.value) ? '바르지 않은 말이 있어요. 바른 말로 고쳐 써 주세요.' : '');
      if (hasBadWords(think.value)) think.reportValidity();
    });
    blockPaste(think, { onBlocked: () => onPasteBlocked(PASTE_MESSAGE) });
  }
  q('#challenge-retry').onclick = () => { state = fresh(); render(); onChange(state); };
  render();
  return {
    reset() { state = fresh(); render(); },
    // 보고서에 넣을 결과(하나도 풀지 않고 쓰지도 않았으면 null)
    summary() {
      const thinkText = hasBadWords(state.think) ? '' : (state.think ?? '').trim();
      if (!thinkText && state.items.every(s => !s.tries)) return null;
      return {
        items: items.map((item, n) => ({ question: item.question, result: resultOf(state.items[n]), mine: mineText(item, state.items[n].answer), answer: answerText(item) })),
        thinkQuestion: challenge.think ?? '', think: thinkText,
      };
    },
  };
}
