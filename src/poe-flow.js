import { CONCEPT_QUIZZES } from './concept-quizzes.js';
import { mountConceptQuiz } from './concept-quiz-ui.js';
import { mountReportSubmit } from './report-submit.js';
import { REVIEWS } from './reviews.js';
import { enableGlossary } from './glossary.js';
import { teacherMode, mountTeacherMode } from './teacher-mode.js';
import { modelOf } from './teaching-models.js';
const $ = selector => document.querySelector(selector);
export const MIN_CHARS = 20;
const STAGES = ['predict', 'observe', 'explain'];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// 예상하기 → 관찰하기 → 설명하기 학습 흐름. 실험 내용은 config로 받습니다.
// 관찰 조건(progress)은 실험 쪽에서 알려 주며, 이 모듈은 기록과 화면 전환만 맡습니다.
// config.experiments를 주면 실험마다 예상·관찰·설명을 따로 기록합니다(예: 풍선 실험, 숟가락 실험).
// 쓴 내용은 이 탭이 열려 있는 동안 sessionStorage에 저장되어 새로 고침해도 남아요.
// 모든 실험은 ‘실험 전 1분 복습’(src/reviews.js)부터 시작해요. 모든 질문에 답해야 실험을 시작할 수 있어요.
// 화면 순서: 복습 → 실험 1(예상 → 관찰 → 설명) → 실험 2(…) … ‘← 뒤로 가기’(화면 버튼, 브라우저·휴대폰의 뒤로 가기)는 이 순서에서 한 칸 앞으로 가요.
// 순서 지키기: 앞 실험을 마쳐야 다음 실험이 열리고, 관찰하기에서는 실험 순서 안내의 앞 단계를 해야 다음 단계 조작이 열려요
//   (checklist의 넷째 값 unlocks: 그 단계에서 처음 쓰는 조작의 CSS 선택자).
// 아직 할 단계가 남았는데 다음으로 넘어가려 하면, 실험 순서 안내를 반짝이며 가리키고 지금 쓸 조작에 표시를 해 줘요.
// 교사 모드(src/teacher-mode.js, 비밀번호): 단계를 자유롭게 오가고 순서 잠금이 모두 풀려요. 학생 기록 검사도 건너뛰어요.
// 주요 과학 낱말은 눌러서 뜻을 볼 수 있어요(src/glossary.js).
// config.model: 교수·학습 모형('poe' 기본, 'generative' 발생 학습, 'far' 비유 활용). 단계 이름과 안내 문구가 바뀌어요(src/teaching-models.js).
export function setupPOEFlow(config) {
  const L = modelOf(config.model);
  const experiments = config.experiments ?? [{ id: 'main', name: '', predict: config.predict, observe: config.observe, explain: config.explain }];
  const multi = experiments.length > 1;
  const workspace = $('.workspace');
  const vocabulary = $('.vocabulary');
  const mission = $('.mission');
  const slug = location.pathname.replace(/\/index\.html$/, '/').split('/').filter(Boolean).at(-1);
  const storeKey = `poe:${slug}`;
  // 실험 이름은 처음 한 번만 읽어요(PDF로 저장하는 동안 문서 제목이 잠깐 바뀌어도 영향이 없도록).
  const labTitle = document.title.split(' 실험실')[0];
  const review = config.review ?? REVIEWS[slug];
  const fresh = () => ({ current: 0, reviewed: !review, onReview: false, reviewAnswers: [], quiz: null, locked: false, exps: experiments.map(() => ({ stage: 'predict', reached: 0, prediction: null, choice: null, reason: '', observation: '', saved: '', observed: false, explanation: '', explained: false })) });
  let state = load() ?? fresh();
  let lastProgress = null;
  const exp = () => state.exps[state.current];
  const info = () => experiments[state.current];
  const explainOf = i => ({ ...config.explain, ...experiments[i].explain });

  const intro = $('.intro');
  intro.querySelector('p').textContent = multi ? L.introMulti(experiments.length) : L.intro;
  if (L.id !== 'poe') intro.insertAdjacentHTML('beforeend', `<p class="model-badge">🧭 수업 모형: <b>${L.name}</b> · ${L.flow}</p>`);
  const glossary = config.glossary ? `<details class="glossary"><summary>📖 어려운 낱말 뜻 보기</summary><dl>${config.glossary.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl></details>` : '';
  intro.insertAdjacentHTML('afterend', `
    <div class="teacher-bar" id="teacher-bar"></div>
    ${review ? `<section id="review-panel" class="poe-panel review-panel" aria-labelledby="review-title" hidden>
      <p class="poe-kicker">실험 전 1분 복습</p><h2 id="review-title" tabindex="-1">${review.title}</h2>
      ${review.items.map((item, n) => `<div class="review-item"><p class="review-question">${item.question}</p><div class="review-choices" role="group" aria-label="${n + 1}번 복습 질문">${item.choices.map((c, i) => `<button type="button" class="review-choice" data-review="${n}" data-choice="${i}">${c}</button>`).join('')}</div><p class="review-feedback" id="review-feedback-${n}" aria-live="polite"></p></div>`).join('')}
      <div class="poe-actions"><p class="poe-hint" id="review-progress" role="status" aria-live="polite"></p><button class="primary big" id="finish-review" type="button" disabled>복습 마치고 실험 시작하기 →</button></div>
    </section>` : ''}
    ${multi ? `<nav class="experiment-switch" aria-label="실험 고르기">${experiments.map((e, i) => `<button type="button" data-experiment="${i}"><span class="experiment-num">실험 ${i + 1}</span><b>${e.name}</b><small data-experiment-state="${i}"></small></button>`).join('')}</nav>
    <p class="experiment-now" role="status" aria-live="polite"></p>` : ''}
    <div class="flow-nav"><button type="button" class="secondary flow-back" id="flow-back">← 뒤로 가기</button>
    <ol class="poe-steps" aria-label="탐구 순서">
      ${STAGES.map((s, i) => `<li data-step="${s}"><button type="button" data-goto="${s}"><span>${i + 1}</span> ${L.steps[i]}</button></li>`).join('')}
    </ol></div>
    <section id="predict-panel" class="poe-panel" aria-labelledby="predict-title">
      <div class="prediction-scene">
        <p class="poe-kicker">${L.predictKicker}</p>
        <h2 id="predict-title" tabindex="-1"></h2>
        <p id="predict-lead"></p>
        <div class="prediction-illustration"></div>
        <p class="poe-hint" id="predict-hint">${L.predictHint}</p>
        ${glossary}
      </div>
      <form id="prediction-form" class="poe-form">
        <fieldset><legend></legend><div id="prediction-choices"></div></fieldset>
        <label class="writing-label" for="prediction-reason">${L.reasonLabel}</label>
        <textarea id="prediction-reason" rows="3" maxlength="1200" required></textarea><p class="char-count" data-for="prediction-reason" aria-live="polite"></p>
        <p class="poe-hint">${L.predictNote}</p>
        <div class="poe-actions"><button type="button" class="secondary flow-back">← 뒤로 가기</button><button class="primary big" id="start-observation" type="submit">${L.savePredict}</button></div>
      </form>
    </section>
    <section id="observe-panel" aria-labelledby="observe-title" hidden>
      <div class="poe-section-heading"><div><p class="poe-kicker">${L.observeKicker}</p><h2 id="observe-title" tabindex="-1"></h2></div></div>
      <details class="prediction-reminder"><summary>${L.reminder}</summary><p data-prediction></p><p data-reason></p></details>
      <div class="observe-body">
      <aside id="step-guide" class="step-guide" aria-labelledby="step-guide-title">
        <p class="guide-kicker" id="step-guide-title">🧭 실험 순서 안내</p>
        <div class="guide-progress"><div class="guide-bar"><span></span></div><b class="guide-count"></b></div>
        <ol class="guide-steps"></ol>
      </aside>
      <div class="observe-main">
      <div id="simulation-mount"></div>
      <form id="observation-form" class="poe-record">
        <h3>${L.recordTitle}</h3>
        <p id="observation-progress" role="status"></p>
        <label class="writing-label" for="observation-record"></label>
        <textarea id="observation-record" rows="3" maxlength="1500" required></textarea><p class="char-count" data-for="observation-record" aria-live="polite"></p>
        <div class="poe-actions"><button type="button" class="secondary flow-back">← 뒤로 가기</button><button class="primary big" id="to-explanation" aria-disabled="true">${L.saveObserve}</button></div>
      </form>
      </div>
      </div>
    </section>
    <section id="explain-panel" class="poe-panel explanation-panel" aria-labelledby="explain-title" hidden>
      <p class="poe-kicker">${L.explainKicker}</p><h2 id="explain-title" tabindex="-1">${L.explainTitle}</h2>
      <div class="poe-comparison"><article><h3>${L.compareFirst}</h3><p data-prediction></p><p data-reason></p></article><article><h3>${L.compareSecond}</h3><p id="saved-observation"></p></article></div>
      <form id="explanation-form" class="poe-form">
        <label class="writing-label" for="explanation-record"></label>
        <textarea id="explanation-record" rows="4" maxlength="1800" required placeholder="직접 본 움직임과 전하 표시의 변화를 근거로 내 말로 설명해 보세요."></textarea><p class="char-count" data-for="explanation-record" aria-live="polite"></p>
        ${glossary}
        <div class="poe-actions"><button class="secondary flow-back" id="return-observation" type="button">← 뒤로 가기</button><button class="primary big" id="reveal-concepts"></button></div>
      </form>
      ${multi ? `<section id="next-experiment" class="next-experiment" hidden aria-live="polite"><p></p><button class="primary" type="button" id="go-next-experiment"></button></section>` : ''}
      <section id="concept-review" hidden aria-labelledby="concept-title">
        <h2 id="concept-title" tabindex="-1">${L.conceptTitle}</h2>
        <ol class="concept-sequence">
          ${config.explain.concepts.map(([title, text]) => `<li><strong>${title}</strong><p>${text}</p></li>`).join('')}
        </ol>
        ${config.explain.note ? `<p class="concept-note">${config.explain.note}</p>` : ''}
        <p class="poe-hint">내 설명과 비교해 보세요. 새롭게 알게 된 내용을 위의 설명에 덧붙여도 좋아요.</p>
        <div id="concept-activities"></div>
        <div id="report-submit"></div>
        <div class="poe-actions"><button class="secondary" id="revisit-lab">실험으로 돌아가 다시 확인하기</button><button class="secondary" id="restart-poe">기록 지우고 처음부터</button></div>
      </section>
    </section>
    <dialog id="prediction-confirm" class="flow-dialog" aria-labelledby="confirm-title">
      <div class="flow-dialog-body">
        <h2 id="confirm-title">${L.confirmTitle}</h2>
        <p class="confirm-warning">${L.confirmWarning}</p>
        <dl><div><dt>${L.confirmChoice}</dt><dd id="confirm-choice"></dd></div><div><dt>그렇게 생각한 까닭</dt><dd id="confirm-reason"></dd></div></dl>
      </div>
      <div class="flow-dialog-actions"><button type="button" class="secondary big" id="confirm-edit">← 다시 고치기</button><button type="button" class="primary big" id="confirm-prediction">${L.confirmOk}</button></div>
    </dialog>
    <div class="flow-toast" role="status" aria-live="assertive"></div>
  `);
  $('#simulation-mount').append(workspace);
  $('#concept-activities').append(vocabulary, mission);
  $('#reset').setAttribute('aria-label', '실험만 초기화');
  $('#reset').innerHTML = '↻ <span>실험 초기화</span>';

  const resetConceptQuiz = mountConceptQuiz(mission, config.quiz ?? CONCEPT_QUIZZES[slug], { saved: state.quiz, onChange: quiz => { state.quiz = quiz; save(); } });
  const submit = mountReportSubmit($('#report-submit'), {
    slug,
    report: () => {
      const sections = experiments.map((e, i) => ({ name: e.name, prediction: state.exps[i].prediction?.choice ?? '', reason: state.exps[i].prediction?.reason ?? '', observation: state.exps[i].saved, explanation: state.exps[i].explanation.trim() }));
      // 예전 Apps Script도 읽을 수 있도록 실험별 답을 한 묶음으로도 함께 보내요.
      const joined = key => multi ? sections.map(s => `[${s.name}] ${s[key]}`).join('\n') : sections[0][key];
      // fieldLabels: 모형에 맞는 칸 이름(새 Apps Script는 시트 머리글에 써요. 예전 Apps Script는 무시하고 ‘예상·관찰·설명’으로 저장해요).
      return { lab: slug, title: labTitle, model: L.id, fieldLabels: L.fields, sections, prediction: joined('prediction'), reason: joined('reason'), observation: joined('observation'), explanation: joined('explanation') };
    },
    check: () => {
      const short = experiments.findIndex((e, i) => plain(state.exps[i].explanation).length < MIN_CHARS);
      return short === -1 ? '' : `${multi ? `실험 ${short + 1}(${experiments[short].name})의 ` : ''}설명을 공백을 빼고 ${MIN_CHARS}자 이상 써 주세요.`;
    },
    onSubmitted: () => { state.locked = true; save(); applyLock(); },
  });

  function load() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey));
      return saved?.exps?.length === experiments.length ? saved : null;
    } catch { return null; }
  }
  function save() { try { sessionStorage.setItem(storeKey, JSON.stringify(state)); } catch { /* 저장하지 못해도 이 화면에서는 계속 쓸 수 있어요. */ } }
  const plain = text => text.replace(/\s/g, '');

  // 지금 고른 실험의 글과 상태를 화면에 채웁니다.
  function fill() {
    const e = exp(), i = info(), ex = explainOf(state.current);
    $('#predict-title').innerHTML = i.predict.title;
    $('#predict-lead').innerHTML = i.predict.lead;
    $('.prediction-illustration').innerHTML = i.predict.illustration;
    $('#prediction-form legend').textContent = `1. ${i.predict.question}`;
    $('#prediction-choices').innerHTML = i.predict.choices.map((label, n) => `<label class="prediction-choice"><input type="radio" name="prediction" value="${n}" required${(e.prediction?.index ?? e.choice) === n ? ' checked' : ''}><span>${label}</span></label>`).join('');
    $('#prediction-reason').placeholder = i.predict.placeholder;
    $('#prediction-reason').value = e.prediction?.reason ?? e.reason;
    $('label[for="observation-record"]').textContent = i.observe.recordLabel;
    $('#observation-record').placeholder = i.observe.placeholder;
    $('#observation-record').value = e.observation;
    $('#observe-title').innerHTML = i.observe.title;
    $('label[for="explanation-record"]').textContent = ex.question;
    $('#explanation-record').value = e.explanation;
    $('#saved-observation').textContent = e.saved;
    const locked = !!e.prediction;
    $('#prediction-form fieldset').disabled = locked; $('#prediction-reason').readOnly = locked;
    $('#start-observation').textContent = locked ? L.resume : L.savePredict;
    $('#predict-hint').textContent = locked ? L.predictLocked : L.predictHint;
    $('#reveal-concepts').textContent = e.explained ? '내 설명 저장하기' : multi && !allExplained(state.current) ? '내 설명 저장하기 →' : L.saveExplain;
    document.querySelectorAll('[data-prediction]').forEach(el => el.textContent = e.prediction?.choice || '');
    document.querySelectorAll('[data-reason]').forEach(el => el.textContent = e.prediction?.reason || '');
    document.querySelectorAll('.poe-form textarea, .poe-record textarea').forEach(showCount);
    showWrapUp();
    renderSwitch();
    applyLock();
  }
  const allExplained = (except = -1) => state.exps.every((e, i) => i === except || e.explained);
  function showWrapUp() {
    // 교사 모드에서는 학생이 설명을 쓰기 전에도 개념 정리를 보여 줄 수 있어요.
    const done = allExplained() || teacherMode.on;
    $('#concept-review').hidden = !done;
    const next = $('#next-experiment');
    if (!next) return;
    const todo = state.exps.findIndex(e => !e.explained);
    next.hidden = done || !exp().explained;
    if (!next.hidden) {
      next.querySelector('p').textContent = `실험 ${state.current + 1}의 설명을 저장했어요. 이제 실험 ${todo + 1}(${experiments[todo].name})을 해 볼까요?`;
      next.querySelector('button').textContent = `실험 ${todo + 1}. ${experiments[todo].name} 시작하기 →`;
      next.querySelector('button').onclick = () => selectExperiment(todo);
    }
  }
  // 앞 실험의 설명까지 마쳐야 다음 실험이 열려요(이미 연 실험은 언제든 다시 볼 수 있어요).
  const experimentOpen = n => teacherMode.on || n === 0 || state.exps.slice(0, n).every(e => e.explained) || state.exps[n].reached > 0 || n === state.current;
  function renderSwitch() {
    if (!multi) return;
    document.querySelectorAll('[data-experiment]').forEach(b => {
      const n = +b.dataset.experiment, e = state.exps[n], open = experimentOpen(n);
      if (n === state.current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', e.explained);
      b.classList.toggle('locked', !open);
      if (open) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true');
      b.querySelector('small').textContent = !open ? '🔒 앞 실험을 마치면 열려요' : e.explained ? '✔ 설명까지 마침' : e.reached ? `${['예상', '관찰', '설명'][e.reached]} 단계까지 함` : '아직 시작 전';
    });
    $('.experiment-now').textContent = `지금 하는 실험: 실험 ${state.current + 1}. ${info().name}`;
  }
  // 제출을 마친 보고서는 글을 고칠 수 없게 잠가요(시트에 저장된 내용과 화면이 달라지지 않도록).
  function applyLock() {
    const locked = state.locked;
    for (const id of ['observation-record', 'explanation-record']) $(`#${id}`).readOnly = locked;
    if (locked) { $('#prediction-form fieldset').disabled = true; $('#prediction-reason').readOnly = true; }
    $('#reveal-concepts').disabled = locked;
    document.body.classList.toggle('report-locked', locked);
  }
  function selectExperiment(n, stage) {
    if (!experimentOpen(n)) return toast(`🔒 실험 ${n}(${experiments[n - 1].name})을 설명까지 마치면 다음 실험이 열려요.`);
    keepDrafts();
    state.current = n;
    if (stage) exp().stage = stage;
    save();
    lastProgress = null;
    fill();
    config.onExperimentChange?.(experiments[n].id, n);
    changeStage(exp().stage);
  }

  // ‘← 뒤로 가기’: 화면 순서에서 한 칸 앞으로. 쓴 글은 그대로 남아요. 더 갈 곳이 없으면 false.
  const isReviewing = () => !!review && ((!state.reviewed && !teacherMode.on) || state.onReview);
  const canGoBack = () => !isReviewing() && (STAGES.indexOf(exp().stage) > 0 || state.current > 0 || !!review);
  function goBack() {
    if (!canGoBack()) return false;
    keepDrafts();
    const i = STAGES.indexOf(exp().stage);
    if (i > 0) changeStage(STAGES[i - 1]);
    else if (state.current > 0) selectExperiment(state.current - 1, STAGES[state.exps[state.current - 1].reached]);
    else { state.onReview = true; save(); changeStage(exp().stage); }
    return true;
  }

  function changeStage(next, initial = false) {
    const e = exp();
    e.stage = next; e.reached = Math.max(e.reached, STAGES.indexOf(next)); save();
    const reviewing = isReviewing();
    if (review) {
      $('#review-panel').hidden = !reviewing;
      $('#finish-review').textContent = state.reviewed ? '실험으로 돌아가기 →' : '복습 마치고 실험 시작하기 →';
    }
    $('#flow-back').hidden = !canGoBack();
    document.querySelectorAll('.poe-panel .flow-back, .poe-record .flow-back').forEach(b => { b.hidden = !canGoBack(); });
    for (const value of STAGES) {
      $(`#${value}-panel`).hidden = reviewing || value !== next;
      const item = $(`[data-step="${value}"]`), button = item.querySelector('button');
      if (value === next && !reviewing) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
      // 한 번 가 본 단계는 눌러서 다시 갈 수 있어요. 쓴 글은 그대로 남아요. 교사 모드에서는 어느 단계든 갈 수 있어요.
      // 아직 갈 수 없는 단계는 눌러도 넘어가지 않고, 먼저 할 일을 알려 줘요(aria-disabled).
      const closed = !teacherMode.on && (reviewing || STAGES.indexOf(value) > e.reached);
      if (closed) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled');
      item.classList.toggle('reached', STAGES.indexOf(value) <= e.reached);
    }
    document.body.dataset.poe = reviewing ? 'review' : next;
    if (!reviewing) config.onStageChange?.(next);
    renderSwitch();
    update(lastProgress ?? { ready: false, message: '' }, true);
    if (initial) return;
    const focus = reviewing ? $('#review-title') : $(`#${next}-title`);
    focus.focus({ preventScroll: true });
    (multi ? $('.experiment-switch') : $('.flow-nav')).scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  }
  // progress: { ready, message } — 실험에서 필요한 관찰을 모두 했는지 알려 줍니다.
  // 한 번 관찰을 마친 실험은 새로 고침한 뒤에도 다음 단계로 넘어갈 수 있어요.
  function update(progress, force = false) {
    gate(progress);
    if (!force && lastProgress && progress.ready === lastProgress.ready && progress.message === lastProgress.message) return;
    lastProgress = progress;
    const done = progress.ready || exp().observed || teacherMode.on;
    if (done) $('#to-explanation').removeAttribute('aria-disabled'); else $('#to-explanation').setAttribute('aria-disabled', 'true');
    $('#observation-progress').textContent = !progress.ready && exp().observed ? '이 실험은 이미 관찰을 마쳤어요. 더 실험해 보고 기록을 고쳐도 좋아요.' : progress.message;
    renderGuide(progress);
  }
  // 순서 지키기: 지금 할 단계보다 뒤에 있는 단계에서 처음 쓰는 조작(unlocks)은 잠가 두고, 누르면 지금 할 일을 알려 줘요.
  // 실험이 화면을 새로 그려도 매 프레임 다시 잠가요. 한 번 관찰을 마친 실험은 모두 열어 자유롭게 다시 해 볼 수 있어요.
  let gateMessage = '';
  function gate(progress) {
    const steps = progress.steps ?? [];
    let current = steps.findIndex(v => !v.done);
    if (current === -1 || exp().observed || state.locked || teacherMode.on) current = steps.length;
    const later = steps.slice(current + 1).filter(v => v.unlocks);
    gateMessage = current < steps.length ? `🔒 실험 순서대로 해요. 먼저 ‘${steps[current].label}’부터 해 보세요.` : '';
    const selector = later.map(v => v.unlocks).join(', ');
    document.querySelectorAll('[data-gated]').forEach(el => {
      if (selector && el.matches(selector)) return;
      el.removeAttribute('data-gated'); el.removeAttribute('aria-disabled');
      if (el.dataset.gatedTitle !== undefined) { el.title = el.dataset.gatedTitle; delete el.dataset.gatedTitle; }
    });
    if (!selector) return;
    document.querySelectorAll(selector).forEach(el => {
      if (el.dataset.gated) return;
      el.dataset.gated = 'true'; el.setAttribute('aria-disabled', 'true');
      el.dataset.gatedTitle = el.title; el.title = '앞 단계를 먼저 하면 열려요';
    });
  }
  function blockGated(ev) {
    const el = ev.target?.closest?.('[data-gated]');
    if (!el || (ev.type === 'keydown' && !['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key))) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (ev.type === 'click' || ev.type === 'keydown') pointToGuide(gateMessage || '🔒 앞 단계를 먼저 해 보세요.');
  }
  for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown']) window.addEventListener(type, blockGated, { capture: true, passive: false });

  // 화면 아래쪽에 잠깐 나타나는 안내(잠긴 조작을 눌렀을 때 등).
  let toastTimer = null;
  function toast(text) {
    const el = $('.flow-toast');
    el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // 다음 단계로 넘어가려는데 아직 할 실험 단계가 남았으면: 안내 문구 + 실험 순서 안내를 반짝이며 가리키고,
  // 지금 할 단계에서 쓰는 조작(있으면)에 ‘여기부터!’ 표시를 잠깐 붙여요.
  let pointTimer = null;
  function pointToGuide(message) {
    toast(message);
    const guide = $('#step-guide');
    document.querySelectorAll('.step-target').forEach(el => el.classList.remove('step-target'));
    if (guide.hidden) return;
    guide.classList.remove('attention'); void guide.offsetWidth; guide.classList.add('attention');
    const r = guide.getBoundingClientRect();
    if (r.bottom < 60 || r.top > innerHeight - 60) guide.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    guide.querySelector('li.current')?.scrollIntoView?.({ block: 'nearest' });
    const step = (lastProgress?.steps ?? []).find(v => !v.done);
    const target = step ? stepTarget(step) ?? (step.unlocks ? [...document.querySelectorAll(step.unlocks)].find(el => el.offsetParent) : null) : null;
    if (target) { target.dataset.targetLabel = '👆 여기부터!'; target.classList.add('step-target'); }
    clearTimeout(pointTimer);
    pointTimer = setTimeout(() => { guide.classList.remove('attention'); target?.classList.remove('step-target'); }, 4500);
  }
  // 단계에서 눌러야 할 조작 찾기: 안내 글의 ‘단추 이름’을 차례로 보며, 화면에 보이고 아직 고르지 않은 첫 단추를 골라요.
  // (탭은 이미 열려 있으면 건너뛰어요.) 이름이 없으면 단계의 press 선택자를 써요.
  const words = t => t.replace(/[()‘’'"↑↓↻▶⇅🧲👆🥄🧤✔·:,]/g, ' ').split(/\s+/).filter(Boolean);
  function stepTarget(step) {
    const visible = el => el.offsetParent || el.closest('svg');
    const fresh = el => !el.disabled && el.getAttribute('aria-selected') !== 'true' && el.getAttribute('aria-pressed') !== 'true';
    const pool = [...document.querySelectorAll('#simulation-mount button, #simulation-mount [role=button], #simulation-mount [role=tab]')].filter(el => !el.closest('.step-guide, .term-pop') && !el.matches('.term') && visible(el));
    for (const name of [...step.hint.matchAll(/‘([^’]+)’/g)].map(m => m[1])) {
      const want = words(name);
      const hits = pool.filter(el => { const have = words(el.textContent || el.getAttribute('aria-label') || ''); return want.every(w => have.includes(w)); });
      if (!hits.length) continue;
      const pick = hits.find(fresh);
      if (pick) return pick;
    }
    return step.press ? [...document.querySelectorAll(step.press)].find(visible) ?? null : null;
  }
  function markTarget(el, text) {
    document.querySelectorAll('.step-target').forEach(v => v.classList.remove('step-target'));
    if (!el) return;
    el.dataset.targetLabel = text;
    el.classList.add('step-target');
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 70) el.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    clearTimeout(pointTimer);
    pointTimer = setTimeout(() => el.classList.remove('step-target'), 5000);
  }
  // 실험 순서 안내의 단계를 누르면: 그 단계를 하는 방법을 알려 주고, 눌러야 할 단추에 ‘👆 여기를 눌러요’를 표시해요.
  $('#step-guide').addEventListener('click', ev => {
    const item = ev.target.closest('[data-guide-step]');
    if (!item) return;
    if (item.dataset.guideStep === 'final') {
      toast(`✎ 아래 ‘${L.recordTitle}’에 적고 ‘${L.saveObserve.replace(' →', '')}’를 눌러요.`);
      $('#observation-record').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
      $('#observation-record').focus({ preventScroll: true });
      return;
    }
    const steps = lastProgress?.steps ?? [], i = +item.dataset.guideStep, step = steps[i];
    if (!step) return;
    const current = steps.findIndex(v => !v.done);
    const locked = !step.done && i > current && !exp().observed && !teacherMode.on;
    if (locked) { markTarget(null); return toast(`🔒 ‘${step.label}’은(는) 앞 단계를 마치면 열려요. 먼저 ‘${steps[current].label}’부터 해요.`); }
    const target = stepTarget(step);
    toast(`${step.done ? '✓ 이미 해 본 단계예요. 다시 해 보려면 · ' : '👉 이렇게 해요 · '}${step.hint || step.label}`);
    markTarget(target, '👆 여기를 눌러요');
  });
  const nextStepLabel = () => (lastProgress?.steps ?? []).find(v => !v.done)?.label;

  // 왼쪽 실험 순서 안내: 끝낸 단계는 ✓, 지금 할 단계는 강조, 뒤 단계는 🔒, 모두 끝나면 마지막 ‘기록하기’ 단계를 강조해요.
  let guideDone = -1;
  function renderGuide(progress) {
    const steps = progress.steps ?? [];
    const guide = $('#step-guide');
    guide.hidden = !steps.length;
    if (!steps.length) return;
    const done = steps.filter(v => v.done).length, current = steps.findIndex(v => !v.done);
    const items = steps.map((v, i) => {
      const state = v.done ? 'done' : i === current ? 'current' : 'todo';
      const lockedStep = state === 'todo' && !exp().observed && !teacherMode.on;
      return `<li class="${state}${lockedStep ? ' locked' : ''}"${state === 'current' ? ' aria-current="step"' : ''}><button type="button" class="guide-item" data-guide-step="${i}" aria-label="${v.label}: 어떻게 하는지 보기"><span class="guide-num">${v.done ? '✓' : lockedStep ? '🔒' : i + 1}</span><div><b>${v.label}</b>${state === 'current' ? `<small class="guide-now">지금 할 일</small>` : ''}${v.hint && state === 'current' ? `<small>${v.hint}</small>` : ''}${lockedStep ? '<small>앞 단계를 마치면 열려요</small>' : ''}<small class="guide-how">👆 눌러서 할 일 보기</small></div></button></li>`;
    });
    const allDone = current === -1;
    items.push(`<li class="${allDone ? 'current final' : 'todo final'}"${allDone ? ' aria-current="step"' : ''}><button type="button" class="guide-item" data-guide-step="final"><span class="guide-num">✎</span><div><b>${L.guideFinal}</b>${allDone ? '<small class="guide-now">지금 할 일</small>' : ''}<small>${L.guideFinalHint}</small></div></button></li>`);
    guide.querySelector('.guide-steps').innerHTML = items.join('');
    guide.querySelector('.guide-bar span').style.width = `${done / steps.length * 100}%`;
    guide.querySelector('.guide-count').textContent = `${done} / ${steps.length}`;
    if (done > guideDone && guideDone >= 0) { guide.classList.remove('advance'); void guide.offsetWidth; guide.classList.add('advance'); }
    guideDone = done;
  }
  // 예상·관찰·설명은 공백을 빼고 최소 MIN_CHARS자 이상 써야 저장하고 다음 단계로 넘어갈 수 있어요.
  const countChars = el => plain(el.value).length;
  function showCount(el) {
    const n = countChars(el), out = document.querySelector(`.char-count[data-for="${el.id}"]`);
    if (!out) return;
    out.textContent = n >= MIN_CHARS ? `✔ ${n}자 · 좋아요!` : `${n} / ${MIN_CHARS}자 (공백 제외) · ${MIN_CHARS - n}자 더 써 주세요`;
    out.classList.toggle('enough', n >= MIN_CHARS);
  }
  function requireWriting(id) {
    const el = $(id), n = countChars(el);
    el.setCustomValidity(n >= MIN_CHARS ? '' : `내 생각을 공백을 빼고 ${MIN_CHARS}자 이상 써 주세요. (지금 ${n}자)`);
    return el.reportValidity();
  }
  // 쓰는 중인 글(아직 저장 버튼을 누르지 않은 글)도 바로바로 기억해 둡니다.
  function keepDrafts() {
    const e = exp();
    if (!e.prediction) { e.reason = $('#prediction-reason').value; const c = document.querySelector('input[name="prediction"]:checked'); e.choice = c ? +c.value : null; }
    e.observation = $('#observation-record').value;
    e.explanation = $('#explanation-record').value;
    save();
  }
  document.querySelectorAll('.poe-form textarea, .poe-record textarea').forEach(el => {
    el.addEventListener('input', () => { el.setCustomValidity(''); showCount(el); keepDrafts(); });
  });
  $('#prediction-form').addEventListener('change', keepDrafts);
  // 예상은 저장하면 고칠 수 없으므로, 저장하기 전에 확인 창으로 한 번 더 읽어 보게 해요.
  const confirmBox = $('#prediction-confirm');
  const openDialog = d => { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); };
  const closeDialog = d => { if (d.close) d.close(); else d.removeAttribute('open'); };
  $('#prediction-form').onsubmit = ev => {
    ev.preventDefault();
    if (exp().prediction) return changeStage('observe');
    // 교사 모드: 예상을 쓰지 않아도 관찰하기로 넘어가요(학생 기록은 저장하지 않아요).
    if (teacherMode.on && plain($('#prediction-reason').value).length < MIN_CHARS) return changeStage('observe');
    if (!requireWriting('#prediction-reason')) return;
    const checked = document.querySelector('input[name="prediction"]:checked');
    $('#confirm-choice').textContent = checked.nextElementSibling.textContent;
    $('#confirm-reason').textContent = $('#prediction-reason').value.trim();
    openDialog(confirmBox);
    $('#confirm-prediction').focus();
  };
  $('#confirm-edit').onclick = () => { closeDialog(confirmBox); $('#prediction-reason').focus(); };
  $('#confirm-prediction').onclick = () => {
    const e = exp(), checked = document.querySelector('input[name="prediction"]:checked');
    closeDialog(confirmBox);
    if (!e.prediction && checked) {
      e.prediction = { index: +checked.value, choice: checked.nextElementSibling.textContent, reason: $('#prediction-reason').value.trim() };
      fill();
    }
    changeStage('observe');
  };
  $('#observation-form').onsubmit = ev => {
    ev.preventDefault();
    if ($('#to-explanation').getAttribute('aria-disabled') === 'true') return;
    const e = exp();
    if (teacherMode.on && plain($('#observation-record').value).length < MIN_CHARS) { $('#saved-observation').textContent = e.saved; return changeStage('explain'); }
    if (!state.locked) {
      if (!requireWriting('#observation-record')) return;
      e.saved = $('#observation-record').value.trim(); e.observed = true;
    }
    $('#saved-observation').textContent = e.saved;
    changeStage('explain');
  };
  // 실험 단계를 다 하지 않았을 때 누르면(빈 기록 칸 검사보다 먼저) 실험 순서 안내를 가리켜요.
  $('#to-explanation').addEventListener('click', ev => {
    if ($('#to-explanation').getAttribute('aria-disabled') !== 'true') return;
    ev.preventDefault();
    const label = nextStepLabel();
    pointToGuide(`🧭 아직 해 보지 않은 실험 단계가 있어요. ‘실험 순서 안내’를 보고 ${label ? `‘${label}’부터` : '남은 단계를'} 해 보세요.`);
  });
  document.querySelectorAll('.flow-back').forEach(b => b.onclick = () => goBack());
  $('#explanation-form').onsubmit = ev => {
    ev.preventDefault();
    if (teacherMode.on && plain($('#explanation-record').value).length < MIN_CHARS) { showWrapUp(); $('#concept-review').scrollIntoView({ behavior: 'instant', block: 'start' }); return; }
    if (state.locked || !requireWriting('#explanation-record')) return;
    const e = exp();
    e.explanation = $('#explanation-record').value; e.explained = true; save();
    fill();
    const target = allExplained() ? $('#concept-review') : $('#next-experiment');
    (target.id === 'concept-review' ? $('#concept-title') : target.querySelector('button')).focus({ preventScroll: true });
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  };
  document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => {
    if (b.getAttribute('aria-disabled') === 'true') return explainClosedStep(b.dataset.goto);
    if (teacherMode.on && isReviewing()) { state.onReview = false; save(); }
    changeStage(b.dataset.goto);
  });
  // 아직 갈 수 없는 단계를 누르면 먼저 할 일을 알려 줘요.
  function explainClosedStep(target) {
    if (isReviewing()) return toast('📝 먼저 ‘실험 전 1분 복습’ 질문에 모두 답하고 ‘복습 마치고 실험 시작하기’를 눌러요.');
    const now = exp().stage;
    if (now === 'predict') { toast(`✏️ 먼저 ${L.id === 'poe' ? '예상' : '내 생각'}을 고르고 까닭을 쓴 뒤 ‘${L.savePredict.replace(' →', '')}’를 눌러요.`); $('#start-observation').dataset.targetLabel = '👆 여기부터!'; $('#start-observation').classList.add('step-target'); setTimeout(() => $('#start-observation').classList.remove('step-target'), 4500); return; }
    if (now === 'observe' && target === 'explain') {
      const label = nextStepLabel();
      if (label) return pointToGuide(`🧭 아직 해 보지 않은 실험 단계가 있어요. ‘실험 순서 안내’를 보고 ‘${label}’부터 해 보세요.`);
      toast(`✎ 아래 ‘${L.recordTitle}’에 적고 ‘${L.saveObserve.replace(' →', '')}’를 눌러요.`);
      $('#observation-record').focus();
    }
  }
  document.querySelectorAll('[data-experiment]').forEach(b => b.onclick = () => { if (+b.dataset.experiment !== state.current || isReviewing()) { state.onReview = false; selectExperiment(+b.dataset.experiment); } });
  $('#revisit-lab').onclick = () => changeStage('observe');
  $('#restart-poe').onclick = () => {
    if (!confirm('지금까지 쓴 예상·관찰·설명과 퀴즈 답을 모두 지우고 처음부터 할까요?')) return;
    state = fresh(); state.reviewed = true; save();
    resetConceptQuiz(); submit.reset();
    for (const id of ['prediction-form', 'observation-form', 'explanation-form']) $(`#${id}`).reset();
    lastProgress = null;
    fill(); config.onRestart?.(); config.onExperimentChange?.(experiments[0].id, 0); changeStage('predict');
  };

  let refreshReview = () => {};
  if (review) {
    // 질문마다 보기를 하나씩 골라야 ‘복습 마치고 실험 시작하기’ 버튼이 켜져요. 건너뛸 수 없어요.
    const answers = state.reviewAnswers ??= [];
    const showReview = () => {
      document.querySelectorAll('[data-review]').forEach(v => { const on = answers[+v.dataset.review] === +v.dataset.choice; v.classList.toggle('chosen', on); v.setAttribute('aria-pressed', String(on)); });
      review.items.forEach((item, n) => {
        const out = $(`#review-feedback-${n}`), picked = answers[n];
        if (picked === undefined || picked === null) { out.textContent = ''; out.dataset.state = ''; return; }
        // answer가 없는 문항은 생활 경험을 떠올리는 질문이라 맞고 틀림을 말하지 않아요.
        const right = item.answer === undefined || picked === item.answer;
        out.textContent = `${item.answer === undefined ? '' : right ? '맞아요! ' : '다시 떠올려 볼까요? '}${item.explanation}`;
        out.dataset.state = right ? 'right' : 'wrong';
      });
      const done = review.items.filter((_, n) => answers[n] !== undefined && answers[n] !== null).length;
      $('#finish-review').disabled = done < review.items.length && !teacherMode.on;
      $('#review-progress').textContent = done < review.items.length ? `${done} / ${review.items.length} 질문에 답했어요 · 모든 질문에 답하면 실험을 시작할 수 있어요.` : '모든 질문에 답했어요. 실험을 시작해 볼까요?';
    };
    document.querySelectorAll('[data-review]').forEach(b => b.onclick = () => { answers[+b.dataset.review] = +b.dataset.choice; save(); showReview(); });
    $('#finish-review').onclick = () => {
      if (!teacherMode.on && review.items.some((_, n) => answers[n] === undefined || answers[n] === null)) return;
      state.reviewed = true; state.onReview = false; save(); changeStage(exp().stage);
    };
    showReview();
    refreshReview = showReview;
  }

  // 브라우저·휴대폰의 뒤로 가기도 한 화면씩 돌아가게 해요. 첫 화면(복습)에서 누르면 원래대로 실험 목록으로 나가요.
  // 열려 있는 확인 창이 있으면 먼저 닫아요.
  if (!history.state?.poeGuard) { history.replaceState({ ...history.state, poeBase: true }, ''); history.pushState({ poeGuard: true }, ''); }
  window.addEventListener('popstate', ev => {
    if (ev.state?.poeGuard) return;
    const open = document.querySelector('dialog[open]');
    if (open) {
      const cancel = new Event('cancel', { cancelable: true });
      if (open.dispatchEvent(cancel)) closeDialog(open);
      history.pushState({ poeGuard: true }, '');
    } else if (goBack()) history.pushState({ poeGuard: true }, '');
    else history.back();
  });

  // 교사 모드: 켜고 끌 때 지금 화면을 다시 그려요.
  mountTeacherMode($('#teacher-bar'), {
    onChange: () => {
      lastProgress = lastProgress && { ...lastProgress };
      refreshReview(); fill(); changeStage(isReviewing() ? exp().stage : exp().stage, true);
      document.querySelectorAll('[data-gated]').forEach(el => { if (teacherMode.on) { el.removeAttribute('data-gated'); el.removeAttribute('aria-disabled'); } });
    },
  });
  // 과학 낱말 뜻 풀이: 실험 안내, 예상·관찰·설명의 글, 개념 정리, 복습 질문에서 찾아요.
  enableGlossary(['#review-panel', '#predict-title', '#predict-lead', '#observe-title', '.instruction', '#simulation-mount .observation', '#model-note', '.guide-steps', 'label[for="observation-record"]', 'label[for="explanation-record"]', '#concept-review .concept-sequence', '#concept-review .concept-note', '#concept-activities .mission']);

  fill();
  config.onExperimentChange?.(info().id, state.current);
  changeStage(exp().stage, true);
  return {
    update,
    get stage() { return isReviewing() ? 'review' : exp().stage; },
    get experiment() { return info().id; },
  };
}
