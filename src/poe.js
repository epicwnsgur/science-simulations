const $ = selector => document.querySelector(selector);

// Learning flow only: charge transfer and motion remain in the simulation model.
export function setupPOE({ spriteUrl, onStageChange, onRestart }) {
  let stage = 'predict';
  let prediction = null;
  let rubbed = false;
  let lifted = false;
  let snapshot = {};
  let lastUpdateKey = null;
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
        <h2 id="predict-title" tabindex="-1">문지른 풍선을 들어 올리면<br>털은 어떻게 될까요?</h2>
        <p>바닥에 놓인 털에 풍선을 문지른 뒤,<br>털 가까이에서 풍선을 살짝 들어 올릴 거예요.</p>
        <img src="${spriteUrl}" alt="실험에 사용할 풍선과 털" width="1536" height="1024">
        <p class="poe-hint">아직 실험하지 않고, 내 생각을 먼저 남겨 보세요.</p>
      </div>
      <form id="prediction-form" class="poe-form">
        <fieldset><legend>1. 어떤 변화가 생길까요?</legend>
          ${['털끝이 풍선 쪽으로 움직일 것 같아요.', '털끝이 풍선에서 멀어질 것 같아요.', '털에 변화가 없을 것 같아요.', '아직 잘 모르겠어요.'].map((label,i)=>`<label class="prediction-choice"><input type="radio" name="prediction" value="${i}" required><span>${label}</span></label>`).join('')}
        </fieldset>
        <label class="writing-label" for="prediction-reason">2. 그렇게 생각한 까닭은 무엇인가요?</label>
        <textarea id="prediction-reason" rows="3" maxlength="1200" required placeholder="내가 겪은 일이나 알고 있는 내용을 떠올려 보세요. 잘 모르겠다면 궁금한 점을 써도 좋아요."></textarea>
        <p class="poe-hint">예상은 맞고 틀림을 채점하지 않아요. 실험한 뒤 내 생각과 비교해 볼 거예요.</p>
        <button class="primary" id="start-observation" type="submit">예상 저장하고 실험하기 →</button>
      </form>
    </section>
    <section id="observe-panel" aria-labelledby="observe-title" hidden>
      <div class="poe-section-heading"><div><p class="poe-kicker">직접 확인해 봐요</p><h2 id="observe-title" tabindex="-1">문지르고, 살짝 들어 올려 보세요.</h2></div><button class="secondary" id="back-predict">← 내 예상 보기</button></div>
      <details class="prediction-reminder"><summary>내가 남긴 예상</summary><p data-prediction></p><p data-reason></p></details>
      <div id="simulation-mount"></div>
      <form id="observation-form" class="poe-record">
        <h3>실제로 무엇을 보았나요?</h3>
        <p id="observation-progress" role="status"></p>
        <label class="writing-label" for="observation-record">문지르기 전후와 풍선을 들어 올렸을 때의 차이를 적어 보세요.</label>
        <textarea id="observation-record" rows="3" maxlength="1500" required placeholder="털끝의 움직임을 적어 보세요. ‘전하 보기’를 켰다면 입자 표시에서 발견한 변화도 적어 보세요."></textarea>
        <div class="poe-actions"><p class="poe-hint">전하 보기는 눈에 보이지 않는 전하를 나타낸 모형이에요.</p><button class="primary" id="to-explanation" disabled>관찰 저장하고 설명하기 →</button></div>
      </form>
    </section>
    <section id="explain-panel" class="poe-panel explanation-panel" aria-labelledby="explain-title" hidden>
      <p class="poe-kicker">예상과 관찰을 연결해 봐요</p><h2 id="explain-title" tabindex="-1">내 예상과 실제 관찰은 같았나요?</h2>
      <div class="poe-comparison"><article><h3>나의 처음 예상</h3><p data-prediction></p><p data-reason></p></article><article><h3>내가 관찰한 결과</h3><p id="saved-observation"></p></article></div>
      <form id="explanation-form" class="poe-form">
        <label class="writing-label" for="explanation-record">왜 이런 결과가 나왔을까요? 예상과 달랐다면 생각이 어떻게 바뀌었는지도 적어 보세요.</label>
        <textarea id="explanation-record" rows="4" maxlength="1800" required placeholder="직접 본 움직임과 전하 표시의 변화를 근거로 내 말로 설명해 보세요."></textarea>
        <div class="poe-actions"><button class="secondary" id="return-observation" type="button">← 다시 실험하며 확인하기</button><button class="primary" id="reveal-concepts">내 설명 저장하고 개념 확인하기 →</button></div>
      </form>
      <section id="concept-review" hidden aria-labelledby="concept-title">
        <h2 id="concept-title" tabindex="-1">관찰한 현상을 과학으로 설명해요</h2>
        <ol class="concept-sequence">
          <li><strong>문지르기 전</strong><p>풍선과 털은 각각 (+)전하량과 (−)전하량이 같아 전기를 띠지 않아요.</p></li>
          <li><strong>문지르는 동안</strong><p>털에서 풍선으로 일부 전자가 이동해요. (+)전하를 띤 원자핵은 다른 물체로 이동하지 않아요. 이렇게 마찰로 생기는 전기를 <b>마찰 전기</b>라고 해요.</p></li>
          <li><strong>문지른 뒤</strong><p>전자를 잃은 털은 (+)전하로, 전자를 얻은 풍선은 (−)전하로 <b>대전</b>돼요. 전기를 띤 물체를 <b>대전체</b>라고 해요. 대전되어도 두 종류의 전하는 모두 남아 있어요.</p></li>
          <li><strong>풍선을 가까이 들어 올리면</strong><p>서로 다른 전하를 띤 풍선과 털 사이에 끌어당기는 <b>인력</b>이 작용해 가까운 털끝이 휘어요. 같은 종류의 전하끼리는 밀어내는 <b>척력</b>이 작용해요. 이런 힘을 <b>전기력</b>이라고 해요.</p></li>
        </ol>
        <p class="poe-hint">내 설명과 비교해 보세요. 새롭게 알게 된 내용을 위의 설명에 덧붙여도 좋아요.</p>
        <div id="concept-activities"></div>
        <div class="poe-actions"><button class="secondary" id="compare-forces">실험으로 돌아가 인력·척력 비교하기</button><button class="secondary" id="restart-poe">기록 지우고 처음부터</button></div>
      </section>
    </section>
  `);
  $('#simulation-mount').append(workspace);
  $('#concept-activities').append(mission, vocabulary);
  $('#reset').setAttribute('aria-label', '실험만 초기화');
  $('#reset').innerHTML = '↻ <span>실험 초기화</span>';

  function copyPrediction() {
    document.querySelectorAll('[data-prediction]').forEach(el=>el.textContent=prediction?.choice || '');
    document.querySelectorAll('[data-reason]').forEach(el=>el.textContent=prediction?.reason || '');
  }
  function changeStage(next) {
    stage=next;
    for(const value of ['predict','observe','explain']) {
      $(`#${value}-panel`).hidden=value!==stage;
      const item=$(`[data-step="${value}"]`);
      if(value===stage)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
    }
    document.body.dataset.poe=stage;
    onStageChange(stage);
    update(snapshot);
    $(`#${stage}-title`).focus({preventScroll:true});
    $('.poe-steps').scrollIntoView({behavior:'instant',block:'start'});
  }
  function update(state, force = false) {
    snapshot=state;
    if(stage==='observe' && state.mode==='rub') {
      if(state.count>0 && !state.flight)rubbed=true;
      if(rubbed && state.attracted)lifted=true;
    }
    const key=JSON.stringify([stage,state.count,!!state.flight,!!state.motion,state.attracted,state.mode,state.show,rubbed,lifted]);
    if(!force && key===lastUpdateKey)return;
    lastUpdateKey=key;
    const ready=rubbed&&lifted;
    $('#to-explanation').disabled=!ready||!!state.flight||!!state.motion;
    $('#observation-progress').textContent=!rubbed?'먼저 풍선을 털에 문질러 보세요.':!lifted?'풍선을 털 가까이에서 살짝 들어 올리고, 털끝을 관찰해 보세요.':'문지르기와 들어 올리기를 해 보았어요. 직접 본 결과를 기록해 주세요.';
    if(stage==='observe') {
      $('#note-title').textContent=state.mode==='force'?'두 물체의 움직임을 비교해 보세요.':!state.count?'문지르기 전 모습을 살펴보세요.':state.attracted?'풍선 가까이의 털끝을 살펴보세요.':'풍선을 들어 올리면 어떻게 되나요?';
      $('#note-text').textContent=state.show?'문지르기 전후에 두 물체의 전하 수가 어떻게 달라졌나요? 움직이는 입자 표시도 살펴보세요.':'내 예상과 같은 변화가 보이나요? 가까이 있을 때와 멀리 있을 때를 비교해 보세요.';
    }
  }
  function requireWriting(id) {
    const el=$(id);
    el.setCustomValidity(el.value.trim()?'':'내 생각을 한 문장으로 남겨 주세요.');
    return el.reportValidity();
  }
  document.querySelectorAll('.poe-form textarea, .poe-record textarea').forEach(el=>el.addEventListener('input',()=>el.setCustomValidity('')));
  $('#prediction-form').onsubmit=e=>{
    e.preventDefault();if(!requireWriting('#prediction-reason'))return;
    if(!prediction)prediction={choice:$('input[name="prediction"]:checked').nextElementSibling.textContent,reason:$('#prediction-reason').value.trim()};
    copyPrediction();
    // Keep the original prediction available for comparison, rather than revising it after observation.
    $('#prediction-form fieldset').disabled=true;$('#prediction-reason').readOnly=true;
    $('#start-observation').textContent='실험 이어 하기 →';
    $('.prediction-scene .poe-hint').textContent='처음의 예상은 그대로 남겨 두었어요. 관찰한 결과와 비교해 보세요.';
    changeStage('observe');
  };
  $('#back-predict').onclick=()=>changeStage('predict');
  $('#observation-form').onsubmit=e=>{
    e.preventDefault();if($('#to-explanation').disabled||!requireWriting('#observation-record'))return;
    $('#saved-observation').textContent=$('#observation-record').value.trim();
    changeStage('explain');
  };
  $('#return-observation').onclick=()=>changeStage('observe');
  $('#explanation-form').onsubmit=e=>{
    e.preventDefault();if(!requireWriting('#explanation-record'))return;
    $('#concept-review').hidden=false;$('#reveal-concepts').textContent='내 설명 저장하기';
    $('#concept-title').focus({preventScroll:true});$('#concept-review').scrollIntoView({behavior:'instant',block:'start'});
  };
  $('#compare-forces').onclick=()=>{changeStage('observe');$('#force-tab').click();};
  $('#restart-poe').onclick=()=>{
    prediction=null;rubbed=false;lifted=false;
    for(const id of ['prediction-form','observation-form','explanation-form'])$(`#${id}`).reset();
    $('#prediction-form fieldset').disabled=false;$('#prediction-reason').readOnly=false;
    $('#concept-review').hidden=true;$('#start-observation').textContent='예상 저장하고 실험하기 →';$('#reveal-concepts').textContent='내 설명 저장하고 개념 확인하기 →';
    $('.prediction-scene .poe-hint').textContent='아직 실험하지 않고, 내 생각을 먼저 남겨 보세요.';
    copyPrediction();$('#saved-observation').textContent='';onRestart();changeStage('predict');
  };
  document.body.dataset.poe=stage;
  return { update, get stage(){return stage;} };
}
