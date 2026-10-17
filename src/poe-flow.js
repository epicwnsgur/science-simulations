const $ = selector => document.querySelector(selector);
export const MIN_CHARS = 20;

// 예상하기 → 관찰하기 → 설명하기 학습 흐름. 실험 내용은 config로 받습니다.
// 관찰 조건(progress)은 실험 쪽에서 알려 주며, 이 모듈은 기록과 화면 전환만 맡습니다.
export function setupPOEFlow(config) {
  let stage = 'predict';
  let prediction = null;
  let lastProgress = null;
  const { predict, observe, explain } = config;
  const workspace = $('.workspace');
  const vocabulary = $('.vocabulary');
  const mission = $('.mission');
  const intro = $('.intro');
  intro.querySelector('p').textContent = '먼저 예상하고, 직접 실험한 뒤, 관찰한 까닭을 설명해 보세요.';
  intro.insertAdjacentHTML('afterend', `
    <ol class="poe-steps" aria-label="탐구 순서">
      <li data-step="predict" aria-current="step"><span>1</span> 예상하기</li>
      <li data-step="observe"><span>2</span> 관찰하기</li>
      <li data-step="explain"><span>3</span> 설명하기</li>
    </ol>
    <section id="predict-panel" class="poe-panel" aria-labelledby="predict-title">
      <div class="prediction-scene">
        <p class="poe-kicker">먼저 생각해 봐요</p>
        <h2 id="predict-title" tabindex="-1">${predict.title}</h2>
        <p>${predict.lead}</p>
        <div class="prediction-illustration">${predict.illustration}</div>
        <p class="poe-hint">아직 실험하지 않고, 내 생각을 먼저 남겨 보세요.</p>
      </div>
      <form id="prediction-form" class="poe-form">
        <fieldset><legend>1. ${predict.question}</legend>
          ${predict.choices.map((label, i) => `<label class="prediction-choice"><input type="radio" name="prediction" value="${i}" required><span>${label}</span></label>`).join('')}
        </fieldset>
        <label class="writing-label" for="prediction-reason">2. 그렇게 생각한 까닭은 무엇인가요?</label>
        <textarea id="prediction-reason" rows="3" maxlength="1200" required placeholder="${predict.placeholder}"></textarea><p class="char-count" data-for="prediction-reason" aria-live="polite"></p>
        <p class="poe-hint">예상은 맞고 틀림을 채점하지 않아요. 실험한 뒤 내 생각과 비교해 볼 거예요.</p>
        <button class="primary" id="start-observation" type="submit">예상 저장하고 실험하기 →</button>
      </form>
    </section>
    <section id="observe-panel" aria-labelledby="observe-title" hidden>
      <div class="poe-section-heading"><div><p class="poe-kicker">직접 확인해 봐요</p><h2 id="observe-title" tabindex="-1">${observe.title}</h2></div><button class="secondary" id="back-predict">← 내 예상 보기</button></div>
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
        <label class="writing-label" for="observation-record">${observe.recordLabel}</label>
        <textarea id="observation-record" rows="3" maxlength="1500" required placeholder="${observe.placeholder}"></textarea><p class="char-count" data-for="observation-record" aria-live="polite"></p>
        <div class="poe-actions"><p class="poe-hint">전하 보기는 눈에 보이지 않는 전하를 나타낸 모형이에요.</p><button class="primary" id="to-explanation" disabled>관찰 저장하고 설명하기 →</button></div>
      </form>
      </div>
      </div>
    </section>
    <section id="explain-panel" class="poe-panel explanation-panel" aria-labelledby="explain-title" hidden>
      <p class="poe-kicker">예상과 관찰을 연결해 봐요</p><h2 id="explain-title" tabindex="-1">내 예상과 실제 관찰은 같았나요?</h2>
      <div class="poe-comparison"><article><h3>나의 처음 예상</h3><p data-prediction></p><p data-reason></p></article><article><h3>내가 관찰한 결과</h3><p id="saved-observation"></p></article></div>
      <form id="explanation-form" class="poe-form">
        <label class="writing-label" for="explanation-record">${explain.question}</label>
        <textarea id="explanation-record" rows="4" maxlength="1800" required placeholder="직접 본 움직임과 전하 표시의 변화를 근거로 내 말로 설명해 보세요."></textarea><p class="char-count" data-for="explanation-record" aria-live="polite"></p>
        <div class="poe-actions"><button class="secondary" id="return-observation" type="button">← 다시 실험하며 확인하기</button><button class="primary" id="reveal-concepts">내 설명 저장하고 개념 확인하기 →</button></div>
      </form>
      <section id="concept-review" hidden aria-labelledby="concept-title">
        <h2 id="concept-title" tabindex="-1">관찰한 현상을 과학으로 설명해요</h2>
        <ol class="concept-sequence">
          ${explain.concepts.map(([title, text]) => `<li><strong>${title}</strong><p>${text}</p></li>`).join('')}
        </ol>
        ${explain.note ? `<p class="concept-note">${explain.note}</p>` : ''}
        <p class="poe-hint">내 설명과 비교해 보세요. 새롭게 알게 된 내용을 위의 설명에 덧붙여도 좋아요.</p>
        <div id="concept-activities"></div>
        <div class="poe-actions"><button class="secondary" id="revisit-lab">실험으로 돌아가 다시 확인하기</button><button class="secondary" id="restart-poe">기록 지우고 처음부터</button></div>
      </section>
    </section>
  `);
  $('#simulation-mount').append(workspace);
  $('#concept-activities').append(mission, vocabulary);
  $('#reset').setAttribute('aria-label', '실험만 초기화');
  $('#reset').innerHTML = '↻ <span>실험 초기화</span>';

  function copyPrediction() {
    document.querySelectorAll('[data-prediction]').forEach(el => el.textContent = prediction?.choice || '');
    document.querySelectorAll('[data-reason]').forEach(el => el.textContent = prediction?.reason || '');
  }
  function changeStage(next) {
    stage = next;
    for (const value of ['predict', 'observe', 'explain']) {
      $(`#${value}-panel`).hidden = value !== stage;
      const item = $(`[data-step="${value}"]`);
      if (value === stage) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    }
    document.body.dataset.poe = stage;
    config.onStageChange?.(stage);
    update(lastProgress ?? { ready: false, message: '' }, true);
    $(`#${stage}-title`).focus({ preventScroll: true });
    $('.poe-steps').scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  // progress: { ready, message } — 실험에서 필요한 관찰을 모두 했는지 알려 줍니다.
  function update(progress, force = false) {
    if (!force && lastProgress && progress.ready === lastProgress.ready && progress.message === lastProgress.message) return;
    lastProgress = progress;
    $('#to-explanation').disabled = !progress.ready;
    $('#observation-progress').textContent = progress.message;
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
  const countChars = el => el.value.replace(/\s/g, '').length;
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
  document.querySelectorAll('.poe-form textarea, .poe-record textarea').forEach(el => {
    el.addEventListener('input', () => { el.setCustomValidity(''); showCount(el); });
    showCount(el);
  });
  $('#prediction-form').onsubmit = e => {
    e.preventDefault(); if (!requireWriting('#prediction-reason')) return;
    if (!prediction) prediction = { choice: $('input[name="prediction"]:checked').nextElementSibling.textContent, reason: $('#prediction-reason').value.trim() };
    copyPrediction();
    // 처음 예상은 관찰 뒤에 고치지 않고 비교용으로 남겨 둡니다.
    $('#prediction-form fieldset').disabled = true; $('#prediction-reason').readOnly = true;
    $('#start-observation').textContent = '실험 이어 하기 →';
    $('.prediction-scene .poe-hint').textContent = '처음의 예상은 그대로 남겨 두었어요. 관찰한 결과와 비교해 보세요.';
    changeStage('observe');
  };
  $('#back-predict').onclick = () => changeStage('predict');
  $('#observation-form').onsubmit = e => {
    e.preventDefault(); if ($('#to-explanation').disabled || !requireWriting('#observation-record')) return;
    $('#saved-observation').textContent = $('#observation-record').value.trim();
    changeStage('explain');
  };
  $('#return-observation').onclick = () => changeStage('observe');
  $('#explanation-form').onsubmit = e => {
    e.preventDefault(); if (!requireWriting('#explanation-record')) return;
    $('#concept-review').hidden = false; $('#reveal-concepts').textContent = '내 설명 저장하기';
    $('#concept-title').focus({ preventScroll: true }); $('#concept-review').scrollIntoView({ behavior: 'instant', block: 'start' });
  };
  $('#revisit-lab').onclick = () => changeStage('observe');
  $('#restart-poe').onclick = () => {
    prediction = null;
    for (const id of ['prediction-form', 'observation-form', 'explanation-form']) $(`#${id}`).reset();
    $('#prediction-form fieldset').disabled = false; $('#prediction-reason').readOnly = false;
    $('#concept-review').hidden = true; $('#start-observation').textContent = '예상 저장하고 실험하기 →'; $('#reveal-concepts').textContent = '내 설명 저장하고 개념 확인하기 →';
    $('.prediction-scene .poe-hint').textContent = '아직 실험하지 않고, 내 생각을 먼저 남겨 보세요.';
    document.querySelectorAll('.poe-form textarea, .poe-record textarea').forEach(showCount);
    copyPrediction(); $('#saved-observation').textContent = ''; config.onRestart?.(); changeStage('predict');
  };
  document.body.dataset.poe = stage;
  return { update, get stage() { return stage; } };
}
