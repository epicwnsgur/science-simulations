import { validateQuiz } from './concept-quizzes.js';

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountConceptQuiz(container, questions) {
  validateQuiz(questions);
  container.innerHTML = `<span class="small-tag">스스로 평가</span><h2>배운 내용을 확인해요</h2><p>OX 2문제와 5지선다 1문제를 풀어 보세요.</p>${questions.map((q, n) => `<h3 id="quiz-question-${n}">${n + 1}. ${escape(q.question)}</h3><div role="group" aria-labelledby="quiz-question-${n}" class="answers${q.type === 'choice' ? ' stacked' : ''}">${q.options.map(([id, label], i) => `<button type="button" data-quiz="${n}" data-choice="${escape(id)}" aria-pressed="false">${q.type === 'choice' ? ['①','②','③','④','⑤'][i] + ' ' : ''}${escape(label)}</button>`).join('')}</div><p id="quiz-feedback-${n}" aria-live="polite">${q.type === 'ox' ? '맞으면 O, 틀리면 X를 골라 보세요.' : '옳은 답을 하나 골라 보세요.'}</p>`).join('')}<p class="quiz-progress" role="status" aria-live="polite">0 / 3문제 정답</p>`;
  const solved = new Set();
  const buttons = [...container.querySelectorAll('[data-quiz]')];
  buttons.forEach(button => button.onclick = () => {
    const n = Number(button.dataset.quiz), q = questions[n], correct = button.dataset.choice === q.answer;
    buttons.filter(b => b.dataset.quiz === String(n)).forEach(b => { b.classList.remove('chosen', 'right', 'wrong'); b.setAttribute('aria-pressed', String(b === button)); });
    button.classList.add('chosen', correct ? 'right' : 'wrong');
    const feedback = container.querySelector(`#quiz-feedback-${n}`);
    feedback.className = correct ? 'right' : 'wrong';
    feedback.textContent = `${correct ? '맞아요!' : '다시 생각해 볼까요?'} ${q.explanation}`;
    if (correct) solved.add(n); else solved.delete(n);
    container.querySelector('.quiz-progress').textContent = solved.size === 3 ? '3 / 3문제 정답 · 모두 확인했어요!' : `${solved.size} / 3문제 정답`;
  });
  return () => mountConceptQuiz(container, questions);
}
