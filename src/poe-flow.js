import { CONCEPT_QUIZZES } from './concept-quizzes.js';
import { mountConceptQuiz } from './concept-quiz-ui.js';
import { mountReportSubmit } from './report-submit.js';
const $ = selector => document.querySelector(selector);
export const MIN_CHARS = 20;
const STAGES = ['predict', 'observe', 'explain'];

// 예상하기 → 관찰하기 → 설명하기 학습 흐름. 실험 내용은 config로 받습니다.
// 관찰 조건(progress)은 실험 쪽에서 알려 주며, 이 모듈은 기록과 화면 전환만 맡습니다.
// config.experiments를 주면 실험마다 예상·관찰·설명을 따로 기록합니다(예: 풍선 실험, 숟가락 실험).
// 쓴 내용은 이 탭이 열려 있는 동안 sessionStorage에 저장되어 새로 고침해도 남아요.
export function setupPOEFlow(config) {
  const experiments = config.experiments ?? [{ id: 'main', name: '', predict: config.predict, observe: config.observe, explain: config.explain }];
  const multi = experiments.length > 1;
  const workspace = $('.workspace');
  const vocabulary = $('.vocabulary');
  const mission = $('.mission');
  const slug = location.pathname.replace(/\/index\.html$/, '/').split('/').filter(Boolean).at(-1);
  const storeKey = `poe:${slug}`;
  const fresh = () => ({ current: 0, reviewed: !config.review, quiz: null, locked: false, exps: experiments.map(() => ({ stage: 'predict', reached: 0, prediction: null, choice: null, reason: '', observation: '', saved: '', observed: false, explanation: '', explained: false })) });
  let state = load() ?? fresh();
  let lastProgress = null;
  const exp = () => state.exps[state.current];
  const info = () => experiments[state.current];
  const explainOf = i => ({ ...config.explain, ...experiments[i].explain });

  const intro = $('.intro');
  intro.querySelector('p').textContent = multi ? `실험 ${experiments.length}가지를 차례로 해요. 실험마다 먼저 예상하고, 직접 실험한 뒤, 본 것을 설명해 보세요.` : '먼저 예상하고, 직접 실험한 뒤, 관찰한 까닭을 설명해 보세요.';
  const glossary = config.glossary ? `<details class="glossary"><summary>📖 어려운 낱말 뜻 보기</summary><dl>${config.glossary.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl></details>` : '';
  intro.insertAdjacentHTML('afterend', `
    ${config.review ? `<section id="review-panel" class="poe-panel review-panel" aria-labelledby="review-title" hidden>
      <p class="poe-kicker">실험 전 1분 복습</p><h2 id="review-title" tabindex="-1">${config.review.title}</h2>
      ${config.review.items.map((item, n) => `<div class="review-item"><p class="review-question">${item.question}</p><div class="review-choices" role="group" aria-label="${n + 1}번 복습 질문">${item.choices.map((c, i) => `<button type="button" class="review-choice" data-review="${n}" data-choice="${i}">${c}</button>`).join('')}</div><p class="review-feedback" id="review-feedback-${n}" aria-live="polite"></p></div>`).join('')}
      <div class="poe-actions"><button class="secondary" id="skip-review" type="button">복습 건너뛰기</button><button class="primary" id="finish-review" type="button">복습 마치고 실험 시작하기 →</button></div>
    </section>` : ''}
    ${multi ? `<nav class="experiment-switch" aria-label="실험 고르기">${experiments.map((e, i) => `<button type="button" data-experiment="${i}"><span class="experiment-num">실험 ${i + 1}</span><b>${e.name}</b><small data-experiment-state="${i}"></small></button>`).join('')}</nav>
    <p class="experiment-now" role="status" aria-live="polite"></p>` : ''}
    <ol class="poe-steps" aria-label="탐구 순서">
      ${STAGES.map((s, i) => `<li data-step="${s}"><button type="button" data-goto="${s}"><span>${i + 1}</span> ${['예상하기', '관찰하기', '설명하기'][i]}</button></li>`).join('')}
    </ol>
    <section id="predict-panel" class="poe-panel" aria-labelledby="predict-title">
      <div class="prediction-scene">
        <p class="poe-kicker">먼저 생각해 봐요</p>
        <h2 id="predict-title" tabindex="-1"></h2>
        <p id="predict-lead"></p>
        <div class="prediction-illustration"></div>
        <p class="poe-hint" id="predict-hint">아직 실험하지 않고, 내 생각을 먼저 남겨 보세요.</p>
        ${glossary}
      </div>
      <form id="prediction-form" class="poe-form">
        <fieldset><legend></legend><div id="prediction-choices"></div></fieldset>
        <label class="writing-label" for="prediction-reason">2. 그렇게 생각한 까닭은 무엇인가요?</label>
        <textarea id="prediction-reason" rows="3" maxlength="1200" required></textarea><p class="char-count" data-for="prediction-reason" aria-live="polite"></p>
        <p class="poe-hint">예상은 맞고 틀림을 채점하지 않아요. 실험한 뒤 내 생각과 비교해 볼 거예요.</p>
        <button class="primary" id="start-observation" type="submit">예상 저장하고 실험하기 →</button>
      </form>
    </section>
    <section id="observe-panel" aria-labelledby="observe-title" hidden>
      <div class="poe-section-heading"><div><p class="poe-kicker">직접 확인해 봐요</p><h2 id="observe-title" tabindex="-1"></h2></div><button class="secondary" id="back-predict">← 내 예상 보기</button></div>
      <details class="prediction-reminder"><summary>내가 남긴 예상</summary><p data-prediction></p><p data-reason></p></details>
      <div class="observe-body">
      <aside id="step-guide" class="step-guide" aria-labelledby="step-guide-title">
        <p class="guide-kicker" id="step-guide-title">🧭 실험 순서 안내</p>
        <div class="guide-progress"><div class="guide-bar"><span></span></div><b class="guide-count"></b></div>
        <ol class="guide-steps"></ol>
      </aside>
      <div class="observe-main">
      <div id="simulation-mount"></div>
      <form id="observation-form" class="poe-record">
        <h3>실제로 무엇을 보았나요?</h3>
        <p id="observation-progress" role="status"></p>
        <label class="writing-label" for="observation-record"></label>
        <textarea id="observation-record" rows="3" maxlength="1500" required></textarea><p class="char-count" data-for="observation-record" aria-live="polite"></p>
        <div class="poe-actions"><p class="poe-hint">전하 보기는 눈에 보이지 않는 전하를 나타낸 모형이에요.</p><button class="primary" id="to-explanation" disabled>관찰 저장하고 설명하기 →</button></div>
      </form>
      </div>
      </div>
    </section>
    <section id="explain-panel" class="poe-panel explanation-panel" aria-labelledby="explain-title" hidden>
      <p class="poe-kicker">예상과 관찰을 연결해 봐요</p><h2 id="explain-title" tabindex="-1">내 예상과 실제 관찰은 같았나요?</h2>
      <div class="poe-comparison"><article><h3>나의 처음 예상</h3><p data-prediction></p><p data-reason></p></article><article><h3>내가 관찰한 결과</h3><p id="saved-observation"></p></article></div>
      <form id="explanation-form" class="poe-form">
        <label class="writing-label" for="explanation-record"></label>
        <textarea id="explanation-record" rows="4" maxlength="1800" required placeholder="직접 본 움직임과 전하 표시의 변화를 근거로 내 말로 설명해 보세요."></textarea><p class="char-count" data-for="explanation-record" aria-live="polite"></p>
        ${glossary}
        <div class="poe-actions"><button class="secondary" id="return-observation" type="button">← 다시 실험하며 확인하기</button><button class="primary" id="reveal-concepts"></button></div>
      </form>
      ${multi ? `<section id="next-experiment" class="next-experiment" hidden aria-live="polite"><p></p><button class="primary" type="button" id="go-next-experiment"></button></section>` : ''}
      <section id="concept-review" hidden aria-labelledby="concept-title">
        <h2 id="concept-title" tabindex="-1">관찰한 현상을 과학으로 설명해요</h2>
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
      return { lab: slug, title: document.title.split(' 실험실')[0], sections, prediction: joined('prediction'), reason: joined('reason'), observation: joined('observation'), explanation: joined('explanation') };
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
    $('#start-observation').textContent = locked ? '실험 이어 하기 →' : '예상 저장하고 실험하기 →';
    $('#predict-hint').textContent = locked ? '처음의 예상은 그대로 남겨 두었어요. 관찰한 결과와 비교해 보세요.' : '아직 실험하지 않고, 내 생각을 먼저 남겨 보세요.';
    $('#reveal-concepts').textContent = e.explained ? '내 설명 저장하기' : multi && !allExplained(state.current) ? '내 설명 저장하기 →' : '내 설명 저장하고 개념 확인하기 →';
    document.querySelectorAll('[data-prediction]').forEach(el => el.textContent = e.prediction?.choice || '');
    document.querySelectorAll('[data-reason]').forEach(el => el.textContent = e.prediction?.reason || '');
    document.querySelectorAll('.poe-form textarea, .poe-record textarea').forEach(showCount);
    showWrapUp();
    renderSwitch();
    applyLock();
  }
  const allExplained = (except = -1) => state.exps.every((e, i) => i === except || e.explained);
  function showWrapUp() {
    const done = allExplained();
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
  function renderSwitch() {
    if (!multi) return;
    document.querySelectorAll('[data-experiment]').forEach(b => {
      const n = +b.dataset.experiment, e = state.exps[n];
      if (n === state.current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', e.explained);
      b.querySelector('small').textContent = e.explained ? '✔ 설명까지 마침' : e.reached ? `${['예상', '관찰', '설명'][e.reached]} 단계까지 함` : '아직 시작 전';
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
  function selectExperiment(n) {
    keepDrafts();
    state.current = n; save();
    lastProgress = null;
    fill();
    config.onExperimentChange?.(experiments[n].id, n);
    changeStage(exp().stage);
  }

  function changeStage(next, initial = false) {
    const e = exp();
    e.stage = next; e.reached = Math.max(e.reached, STAGES.indexOf(next)); save();
    const reviewing = config.review && !state.reviewed;
    if (config.review) $('#review-panel').hidden = !reviewing;
    for (const value of STAGES) {
      $(`#${value}-panel`).hidden = reviewing || value !== next;
      const item = $(`[data-step="${value}"]`), button = item.querySelector('button');
      if (value === next && !reviewing) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
      // 한 번 가 본 단계는 눌러서 다시 갈 수 있어요. 쓴 글은 그대로 남아요.
      button.disabled = reviewing || STAGES.indexOf(value) > e.reached;
      item.classList.toggle('reached', STAGES.indexOf(value) <= e.reached);
    }
    document.body.dataset.poe = reviewing ? 'review' : next;
    if (!reviewing) config.onStageChange?.(next);
    renderSwitch();
    update(lastProgress ?? { ready: false, message: '' }, true);
    if (initial) return;
    const focus = reviewing ? $('#review-title') : $(`#${next}-title`);
    focus.focus({ preventScroll: true });
    (multi ? $('.experiment-switch') : $('.poe-steps')).scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  // progress: { ready, message } — 실험에서 필요한 관찰을 모두 했는지 알려 줍니다.
  // 한 번 관찰을 마친 실험은 새로 고침한 뒤에도 다음 단계로 넘어갈 수 있어요.
  function update(progress, force = false) {
    if (!force && lastProgress && progress.ready === lastProgress.ready && progress.message === lastProgress.message) return;
    lastProgress = progress;
    const done = progress.ready || exp().observed;
    $('#to-explanation').disabled = !done;
    $('#observation-progress').textContent = !progress.ready && exp().observed ? '이 실험은 이미 관찰을 마쳤어요. 더 실험해 보고 기록을 고쳐도 좋아요.' : progress.message;
    renderGuide(progress);
  }
  // 왼쪽 실험 순서 안내: 끝낸 단계는 ✓, 지금 할 단계는 강조, 모두 끝나면 마지막 ‘기록하기’ 단계를 강조해요.
  let guideDone = -1;
  function renderGuide(progress) {
    const steps = progress.steps ?? [];
    const guide = $('#step-guide');
    guide.hidden = !steps.length;
    if (!steps.length) return;
    const done = steps.filter(v => v.done).length, current = steps.findIndex(v => !v.done);
    const items = steps.map((v, i) => {
      const state = v.done ? 'done' : i === current ? 'current' : 'todo';
      return `<li class="${state}"${state === 'current' ? ' aria-current="step"' : ''}><span class="guide-num">${v.done ? '✓' : i + 1}</span><div><b>${v.label}</b>${state === 'current' ? `<small class="guide-now">지금 할 일</small>` : ''}${v.hint && !v.done ? `<small>${v.hint}</small>` : ''}</div></li>`;
    });
    const allDone = current === -1;
    items.push(`<li class="${allDone ? 'current final' : 'todo final'}"${allDone ? ' aria-current="step"' : ''}><span class="guide-num">✎</span><div><b>관찰 결과 기록하기</b>${allDone ? '<small class="guide-now">지금 할 일</small>' : ''}<small>아래에 본 것을 적고 ‘관찰 저장하고 설명하기’를 눌러요</small></div></li>`);
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
  $('#prediction-form').onsubmit = ev => {
    ev.preventDefault();
    const e = exp();
    if (!e.prediction) {
      if (!requireWriting('#prediction-reason')) return;
      const checked = document.querySelector('input[name="prediction"]:checked');
      e.prediction = { index: +checked.value, choice: checked.nextElementSibling.textContent, reason: $('#prediction-reason').value.trim() };
      fill();
    }
    changeStage('observe');
  };
  $('#back-predict').onclick = () => changeStage('predict');
  $('#observation-form').onsubmit = ev => {
    ev.preventDefault(); if ($('#to-explanation').disabled) return;
    const e = exp();
    if (!state.locked) {
      if (!requireWriting('#observation-record')) return;
      e.saved = $('#observation-record').value.trim(); e.observed = true;
    }
    $('#saved-observation').textContent = e.saved;
    changeStage('explain');
  };
  $('#return-observation').onclick = () => changeStage('observe');
  $('#explanation-form').onsubmit = ev => {
    ev.preventDefault(); if (state.locked || !requireWriting('#explanation-record')) return;
    const e = exp();
    e.explanation = $('#explanation-record').value; e.explained = true; save();
    fill();
    const target = allExplained() ? $('#concept-review') : $('#next-experiment');
    (target.id === 'concept-review' ? $('#concept-title') : target.querySelector('button')).focus({ preventScroll: true });
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  };
  document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => changeStage(b.dataset.goto));
  document.querySelectorAll('[data-experiment]').forEach(b => b.onclick = () => selectExperiment(+b.dataset.experiment));
  $('#revisit-lab').onclick = () => changeStage('observe');
  $('#restart-poe').onclick = () => {
    if (!confirm('지금까지 쓴 예상·관찰·설명과 퀴즈 답을 모두 지우고 처음부터 할까요?')) return;
    state = fresh(); state.reviewed = true; save();
    resetConceptQuiz(); submit.reset();
    for (const id of ['prediction-form', 'observation-form', 'explanation-form']) $(`#${id}`).reset();
    lastProgress = null;
    fill(); config.onRestart?.(); config.onExperimentChange?.(experiments[0].id, 0); changeStage('predict');
  };

  if (config.review) {
    document.querySelectorAll('[data-review]').forEach(b => b.onclick = () => {
      // answer가 없는 문항은 생활 경험을 떠올리는 질문이라 맞고 틀림을 말하지 않아요.
      const n = +b.dataset.review, item = config.review.items[n], right = item.answer === undefined || +b.dataset.choice === item.answer;
      document.querySelectorAll(`[data-review="${n}"]`).forEach(v => { v.classList.toggle('chosen', v === b); v.setAttribute('aria-pressed', String(v === b)); });
      const out = $(`#review-feedback-${n}`);
      out.textContent = `${item.answer === undefined ? '' : right ? '맞아요! ' : '다시 떠올려 볼까요? '}${item.explanation}`;
      out.dataset.state = right ? 'right' : 'wrong';
    });
    const finish = () => { state.reviewed = true; save(); changeStage(exp().stage); };
    $('#skip-review').onclick = finish; $('#finish-review').onclick = finish;
  }

  fill();
  config.onExperimentChange?.(info().id, state.current);
  changeStage(exp().stage, true);
  return {
    update,
    get stage() { return state.reviewed ? exp().stage : 'review'; },
    get experiment() { return info().id; },
  };
}
