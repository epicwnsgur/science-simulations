import { icon } from './icons.js';
import { blockPaste, PASTE_MESSAGE, hasBadWords } from './text-guard.js';

// 도전 과제(선택) 화면(내용은 src/challenges.js): 개념 정리의 퀴즈 아래에 나와요.
// 틀리면 힌트를 먼저 보여 주고, 한 번 더 틀리면 풀이를 보여 줘요.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
