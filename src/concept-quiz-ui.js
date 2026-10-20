import { validateQuiz } from './concept-quizzes.js';

// 스스로 평가: 고르는 동안에는 정답을 알려 주지 않고, 모두 고른 뒤 ‘결과 확인하기’를 누르면 점수와 문항별 해설을 보여 줘요.
// saved/onChange로 고른 답을 기억해 두면 새로 고침해도 남아요. 퀴즈 결과는 보고서로 보내지 않아요.
const CIRCLED = ['①', '②', '③', '④', '⑤'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const answerText = (q, id) => {
  if (q.type !== 'choice') return id;
  const i = q.options.findIndex(([v]) => v === id);
  return `${CIRCLED[i]} ${q.options[i][1]}`;
};

export function mountConceptQuiz(container, questions, { saved = null, onChange = () => {} } = {}) {
  validateQuiz(questions);
  const state = { answers: questions.map((_, n) => saved?.answers?.[n] ?? null), checked: !!saved?.checked };
  container.innerHTML = `<span class="small-tag">스스로 평가</span><h2>배운 내용을 확인해요</h2><p class="quiz-intro">OX ${questions.filter(q => q.type === 'ox').length}문제와 5지선다 ${questions.filter(q => q.type === 'choice').length}문제를 모두 고른 뒤 <b>결과 확인하기</b>를 눌러요. 고르는 동안에는 정답을 알려 주지 않아요.</p>${questions.map((q, n) => `<h3 id="quiz-question-${n}">${n + 1}. ${escape(q.question)}</h3><div role="group" aria-labelledby="quiz-question-${n}" class="answers${q.type === 'choice' ? ' stacked' : ''}">${q.options.map(([id, label], i) => `<button type="button" data-quiz="${n}" data-choice="${escape(id)}" aria-pressed="false">${q.type === 'choice' ? CIRCLED[i] + ' ' : ''}${escape(label)}</button>`).join('')}</div><p id="quiz-feedback-${n}" class="quiz-feedback" aria-live="polite"></p>`).join('')}
    <p class="quiz-progress" role="status" aria-live="polite"></p>
    <div class="quiz-actions"><button type="button" class="primary" id="quiz-check">결과 확인하기</button></div>
    <section class="quiz-result" hidden aria-labelledby="quiz-result-title" tabindex="-1">
      <h3 id="quiz-result-title">퀴즈 결과</h3><p class="quiz-score"></p><ol class="quiz-review"></ol>
      <button type="button" class="secondary" id="quiz-retry">다시 풀기</button>
    </section>`;
  const buttons = [...container.querySelectorAll('[data-quiz]')];
  const result = container.querySelector('.quiz-result');

  function render() {
    const picked = state.answers.filter(a => a !== null).length;
    buttons.forEach(b => {
      const n = +b.dataset.quiz, q = questions[n], chosen = state.answers[n] === b.dataset.choice;
      b.setAttribute('aria-pressed', String(chosen));
      b.classList.toggle('chosen', chosen);
      b.classList.toggle('right', state.checked && chosen && b.dataset.choice === q.answer);
      b.classList.toggle('wrong', state.checked && chosen && b.dataset.choice !== q.answer);
      b.classList.toggle('answer', state.checked && !chosen && b.dataset.choice === q.answer);
      b.disabled = state.checked;
    });
    questions.forEach((q, n) => {
      const out = container.querySelector(`#quiz-feedback-${n}`), right = state.answers[n] === q.answer;
      out.className = 'quiz-feedback' + (state.checked ? right ? ' right' : ' wrong' : '');
      out.textContent = !state.checked ? (state.answers[n] === null ? (q.type === 'ox' ? '맞으면 O, 틀리면 X를 골라 보세요.' : '옳은 답을 하나 골라 보세요.') : '골랐어요. 바꾸고 싶으면 다른 답을 눌러요.')
        : right ? '✔ 정답이에요.' : `✘ 오답이에요. 정답: ${answerText(q, q.answer)}`;
    });
    const progress = container.querySelector('.quiz-progress');
    progress.textContent = state.checked ? '' : `${picked} / ${questions.length}문제 골랐어요`;
    const check = container.querySelector('#quiz-check');
    check.hidden = state.checked;
    check.disabled = picked < questions.length;
    result.hidden = !state.checked;
    if (state.checked) {
      const score = questions.filter((q, n) => state.answers[n] === q.answer).length;
      result.querySelector('.quiz-score').textContent = `총 ${questions.length}문항 중 ${score}문항 정답${score === questions.length ? ' · 모두 맞혔어요!' : ''}`;
      result.querySelector('.quiz-review').innerHTML = questions.map((q, n) => {
        const mine = state.answers[n], right = mine === q.answer, why = !right && q.why?.[mine];
        return `<li class="${right ? 'right' : 'wrong'}"><b>${n + 1}번 ${right ? '정답 ✔' : '오답 ✘'}</b>${right ? '' : `<p>내 답: ${escape(answerText(q, mine))} · 정답: ${escape(answerText(q, q.answer))}</p>`}${why ? `<p>내 답이 틀린 까닭: ${escape(why)}</p>` : ''}<p>해설: ${escape(q.explanation)}</p></li>`;
      }).join('');
    }
  }
  buttons.forEach(button => button.onclick = () => {
    if (state.checked) return;
    state.answers[+button.dataset.quiz] = button.dataset.choice;
    render(); onChange({ ...state });
  });
  container.querySelector('#quiz-check').onclick = () => {
    if (state.answers.some(a => a === null)) return;
    state.checked = true; render(); onChange({ ...state });
    result.focus({ preventScroll: true }); result.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  };
  container.querySelector('#quiz-retry').onclick = () => {
    state.answers = questions.map(() => null); state.checked = false; render(); onChange({ ...state });
    container.querySelector('[data-quiz]').focus();
  };
  render();
  return () => { onChange(null); return mountConceptQuiz(container, questions, { onChange }); };
}
