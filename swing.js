import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, reducedMotion, instantLessons } from './src/lab-shell.js';
import { VOLTAGES, swingAngle, swingDirection } from './src/force-model.js';
import { setupViewToggle } from './src/view-toggle.js';

// 교과서 260–261쪽, 지도서 590–593쪽(12차시).
// 지도상 유의점: 전류의 방향, 자기장의 방향에 따라 힘의 방향이 바뀌고, 전류의 세기에 따라 힘의 크기가 달라짐을 이해합니다.
// 코일에 오래 전류가 흐르지 않도록 관찰하자마자 스위치를 엽니다. 6 V 이상의 전압은 가하지 않습니다.

// 비스듬히 내려다본 모습(사투상): 깊이 z를 오른쪽 위로 나타냅니다.
const P = (x, y, z = 0) => [x + z * .5, y - z * .32];
const pt = (x, y, z) => P(x, y, z).map(v => v.toFixed(1)).join(' ');
const PIVOT = { x: 400, y: 78 }, LENGTH = 252, HALF = 42, ARM = 22; // 코일(깊이 ±42)이 자석의 팔(깊이 ±22)보다 넓어 아래 변이 두 팔 사이를 지나요.
const terms = [
  ['자기장 속 전류가 받는 힘', '자기장 안에 놓인 코일에 전류가 흐르면 코일이 힘을 받아 움직여요. 코일 주변의 자기장과 자석의 자기장이 상호 작용하기 때문이에요.'],
  ['힘의 방향', '전류의 방향이나 자기장의 방향을 바꾸면 코일이 받는 힘의 방향도 바뀌어요.'],
  ['힘의 크기', '전류의 세기가 커질수록, 자기장의 세기가 세질수록 코일이 받는 힘이 커져요.'],
  ['오른손으로 힘의 방향 찾기', '오른손의 네 손가락을 자기장 방향으로, 엄지손가락을 전류 방향으로 향하게 하면 손바닥이 향하는 방향이 힘의 방향이에요.'],
];
const box = (x0, x1, y0, y1, z0, z1, top, front, side) => `<path d="M${pt(x0, y0, z1)} L${pt(x1, y0, z1)} L${pt(x1, y0, z0)} L${pt(x0, y0, z0)}Z" fill="${top}"/><path d="M${pt(x0, y0, z0)} L${pt(x1, y0, z0)} L${pt(x1, y1, z0)} L${pt(x0, y1, z0)}Z" fill="${front}"/><path d="M${pt(x1, y0, z0)} L${pt(x1, y0, z1)} L${pt(x1, y1, z1)} L${pt(x1, y1, z0)}Z" fill="${side}"/>`;
const scene = `
<g id="frame"><path d="M${pt(170, 400, -70)} L${pt(640, 400, -70)} L${pt(640, 400, 70)} L${pt(170, 400, 70)}Z" fill="#2a3150" stroke="#46527e"/>
<rect x="${P(250, 0, -60)[0] - 5}" y="${P(250, 0, -60)[1] + 70}" width="10" height="${400 - 70}" fill="#9aa4c4"/>
<rect x="${P(250, 0, 60)[0] - 5}" y="${P(250, 0, 60)[1] + 70}" width="10" height="${400 - 70}" fill="#7d86a8"/>
<path d="M${pt(250, 72, -60)} L${pt(250, 72, 60)}" stroke="#c9d0e6" stroke-width="8" stroke-linecap="round"/>
<path id="top-bar" d="M${pt(250, 78, 0)} L${pt(560, 78, 0)}" stroke="#c9d0e6" stroke-width="7" stroke-linecap="round"/></g>
<g id="swing-far"></g>
<g id="magnet"></g>
<g id="swing-near"></g>
<g id="arrows" opacity="0"></g>
<g id="fx"></g>
<g id="labels"><text x="${P(260, 330)[0]}" y="${P(260, 330)[1]}" font-size="15" font-weight="700" style="fill:#ffd166">㉮ 바깥쪽 ←</text><text x="${P(470, 228)[0]}" y="${P(470, 228)[1]}" font-size="15" font-weight="700" style="fill:#ffd166">→ ㉯ 안쪽</text></g>
<g id="supply" transform="translate(28 60)"><rect width="104" height="70" rx="8" fill="#1d2440" stroke="#8f9bc4"/><text id="supply-v" x="52" y="38" text-anchor="middle" font-family="monospace" font-size="24" style="fill:#ff4d4d" filter="url(#glow)">0.0</text><text x="52" y="58" text-anchor="middle" font-size="10" class="muted">전원 장치 (V)</text></g>`;

const lab = buildLab({
  crumb: '자기 02 자기장 속 전류가 받는 힘',
  title: '전류와 자기가 만나 생긴 힘은 어떤 특성이 있을까?',
  intro: '전기 그네에 전류를 흘려 코일이 움직이는 방향과 정도를 관찰해 보세요.',
  tabs: [{ id: 'swing', label: '전기 그네' }],
  toggle: '자기장·전류·힘 보기',
  sceneLabel: '말굽자석 사이에 매달린 코일(전기 그네) 실험 장치',
  scene,
  terms,
});

/* ---------- 상태 ---------- */
let show = false, on = false, current = 1, magnet = 1, vIndex = 0, onTime = 0, warned = false, lastFrame = 0;
let angle = 0, vel = 0;
const results = {}; // '1,1': 'out' 처럼 조건별 관찰 결과
const maxByVoltage = {};
// view: ‘자기장·전류·힘 보기’를 켜고 그네에 작용하는 힘의 방향을 직접 본 적이 있는지(꼭 봐야 다음으로 넘어가요).
const seen = { first: false, reversed: false, flipped: false, voltage: false, view: false };
let flow = null;
let use3d = false;

function magnetSVG() {
  // 말굽자석: 오른쪽이 굽은 부분, 왼쪽으로 두 팔이 뻗어 있어요. magnet=+1이면 위쪽 팔이 S극(파랑), 아래쪽 팔이 N극(빨강).
  const blue = ['#4a7fe0', '#3a6fd8', '#2a56b0'], red = ['#ec6060', '#e04848', '#b83434'];
  const [top, bottom] = magnet > 0 ? [blue, red] : [red, blue];
  const bend = '<path d="M' + pt(520, 282, 0) + ' C' + pt(610, 282, 0) + ' ' + pt(610, 380, 0) + ' ' + pt(520, 380, 0) + '" stroke="#b9bfcc" stroke-width="30" fill="none"/>';
  const label = (y, t) => `<text x="${P(345, y, -ARM)[0]}" y="${P(345, y, -ARM)[1]}" font-size="16" font-weight="800" style="fill:#fff">${t}</text>`;
  return bend + box(330, 520, 380, 404, -ARM, ARM, bottom[0], bottom[1], bottom[2]) + box(330, 520, 258, 282, -ARM, ARM, top[0], top[1], top[2]) + label(277, magnet > 0 ? 'S' : 'N') + label(399, magnet > 0 ? 'N' : 'S');
}
function coilPoints() {
  const s = Math.sin(angle * Math.PI / 180), c = Math.cos(angle * Math.PI / 180);
  return (r, z) => pt(PIVOT.x + r * s, PIVOT.y + r * c, z);
}
// 코일은 깊이 방향으로 놓인 사각형이에요. 먼 쪽 변은 자석 뒤에, 가까운 쪽 변과 아래 변은 자석 앞에 그려요.
function swingSVG(part) {
  const at = coilPoints(), rTop = 120, rBottom = LENGTH;
  const stroke = d => (on ? `<path d="${d}" stroke="#ffb36b" stroke-width="12" fill="none" opacity=".45" filter="url(#glow-strong)"/>` : '') + `<path d="${d}" stroke="url(#copper)" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (part === 'far') return `<path d="M${pt(PIVOT.x, PIVOT.y, HALF)} L${at(rTop, HALF)}" stroke="#d8dde3" stroke-width="2"/>` + stroke(`M${at(rTop, -HALF)} L${at(rTop, HALF)} L${at(rBottom, HALF)}`);
  return `<path d="M${pt(PIVOT.x, PIVOT.y, -HALF)} L${at(rTop, -HALF)}" stroke="#d8dde3" stroke-width="2"/>` + stroke(`M${at(rBottom, HALF)} L${at(rBottom, -HALF)} L${at(rTop, -HALF)}`);
}
function arrowsSVG() {
  const s = Math.sin(angle * Math.PI / 180), c = Math.cos(angle * Math.PI / 180);
  const bx = PIVOT.x + LENGTH * s, by = PIVOT.y + LENGTH * c;
  const up = magnet > 0; // 자기장: N극(아래)에서 S극(위)으로
  const field = [355, 380, 470, 495].map(x0 => { const [x] = P(x0, 0, 0); return `<path d="M${x} ${up ? 372 : 290} V${up ? 290 : 372}" stroke="#5fe0ff" stroke-width="3" marker-end="url(#arrow-head)"/>`; }).join('');
  // current=+1이면 코일 아래 변의 전류가 앞쪽(보는 사람 쪽)으로 흘러요. 이때 힘은 바깥쪽(왼쪽)이에요.
  const [cx0, cy0] = P(bx, by, current > 0 ? HALF : -HALF), [cx1, cy1] = P(bx, by, current > 0 ? -HALF : HALF);
  const dir = swingDirection(current, magnet), [fx, fy] = P(bx, by + 6, 0);
  const force = on ? `<path d="M${fx} ${fy + 22} h${dir > 0 ? -70 : 70}" stroke="#ff6b6b" stroke-width="4" marker-end="url(#arrow-head)"/><text x="${fx + (dir > 0 ? -76 : 76)}" y="${fy + 44}" font-size="13" text-anchor="middle" style="fill:#ff9a9a">힘</text>` : '';
  return `${field}<text x="${P(355, 0, 0)[0] - 50}" y="314" font-size="12" style="fill:#5fe0ff">자기장</text>${on ? `<g data-current-arrow><path d="M${cx0} ${cy0} L${cx1} ${cy1}" stroke="#7dff7a" stroke-width="4" marker-end="url(#arrow-head)"/><text x="${cx1 + 6}" y="${cy1 - 6}" font-size="12" style="fill:#9dff9a">전류</text></g>` : ''}${force}`;
}
function paint(dt) {
  // 바깥쪽(㉮)은 화면 왼쪽이에요.
  const target = -swingAngle(current, magnet, VOLTAGES[vIndex], on);
  if (instantLessons.matches) { angle = target; vel = 0; }
  else { vel += ((target - angle) * 40 - vel * 2.6) * dt; angle += vel * dt; }
  if (use3d) view3d.view.update({ angle, on, show, current, magnet, vIndex, volts: on ? VOLTAGES[vIndex].toFixed(1) : '0.0' }, dt);
  else {
    setHTML('#magnet', magnetSVG());
    $('#swing-far').innerHTML = swingSVG('far');
    $('#swing-near').innerHTML = swingSVG('near');
    $('#arrows').innerHTML = arrowsSVG();
    $('#arrows').setAttribute('opacity', show ? 1 : 0);
  }
  setText('#supply-v', on ? VOLTAGES[vIndex].toFixed(1) : '0.0');
  if (on) {
    onTime += dt;
    const key = `${current},${magnet}`;
    if (onTime > .6 && !results[key]) {
      results[key] = swingDirection(current, magnet) > 0 ? '바깥쪽(㉮)' : '안쪽(㉯)';
      burst($('#fx'), ...P(PIVOT.x + LENGTH * Math.sin(angle * Math.PI / 180), PIVOT.y + LENGTH, 0), '#ffd166', 12);
      renderText();
    }
    maxByVoltage[VOLTAGES[vIndex]] = Math.max(maxByVoltage[VOLTAGES[vIndex]] ?? 0, Math.abs(angle));
    if (key === '1,1') mark('first', '🔀 그네가 움직였어요! 방향을 기록해요');
    if (key === '-1,1') mark('reversed', '⇄ 전류의 방향을 바꾸니 반대로 움직여요');
    if (key === '1,-1') mark('flipped', '🧲 자석의 극을 바꾸니 반대로 움직여요');
    if (Object.keys(maxByVoltage).filter(v => maxByVoltage[v] > 3).length >= 2) mark('voltage', '⚡ 전압에 따라 움직이는 정도가 달라요');
    if (onTime > 5 && !warned) { warned = true; toast('🔥 코일에 오래 전류가 흐르지 않도록 관찰한 뒤 바로 떼요'); }
  }
}
function mark(key, msg) { if (!seen[key]) { seen[key] = true; toast(msg); } }

function press(state) {
  if (on === state) return;
  on = state; onTime = 0; warned = false;
  $('#press-btn')?.setAttribute('aria-pressed', on);
  renderText();
}
function renderControls() {
  $('#controls').innerHTML = `<div role="group" aria-label="전압"><span class="group-label">전압</span>${VOLTAGES.map((v, i) => `<button data-v="${i}" aria-pressed="${i === vIndex}">${v} V</button>`).join('')}</div><div role="group" aria-label="바꾸기"><button id="flip-current">⇅ 전류의 방향 바꾸기</button><button id="flip-magnet">🧲 자석의 N극과 S극 바꾸기</button></div>`;
  $('#actions').innerHTML = `<button id="press-btn" class="primary hold" aria-pressed="false">스위치 누르고 있기 (누르는 동안 전류가 흘러요)</button>`;
  $$('[data-v]').forEach(b => b.onclick = () => { vIndex = +b.dataset.v; press(false); renderControls(); });
  $('#flip-current').onclick = () => { current *= -1; press(false); toast('⇅ 전원 장치의 두 전선을 바꾸어 꽂았어요. 전류의 방향이 반대가 돼요'); renderText(); };
  $('#flip-magnet').onclick = () => { magnet *= -1; press(false); toast('🧲 자석의 극을 바꾸었어요'); renderText(); };
  const btn = $('#press-btn');
  btn.onpointerdown = e => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); press(true); };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, () => press(false));
  btn.onkeydown = e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(true); } };
  btn.onkeyup = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(false); } };
  btn.onclick = e => e.preventDefault();
  renderText();
}
function renderText() {
  setText('#guide', '스위치를 누르는 동안 전기 그네가 어느 쪽으로 움직이는지 관찰해 보세요.');
  setText('#subguide', '전류의 방향, 자석의 극, 전압을 하나씩 바꾸어 비교해요. 관찰한 뒤에는 바로 손을 떼요.');
  setText('#stage-state', `전류 ${on ? '흐름' : '흐르지 않음'} · 전류 방향 ${current > 0 ? '처음' : '반대'} · 자석 ${magnet > 0 ? '처음' : '극 바꿈'} · ${VOLTAGES[vIndex]} V`);
  setText('#note-title', on ? '그네가 어느 쪽으로 움직이나요?' : '스위치를 눌러 전류를 흘려 보세요');
  setText('#note-text', `‘자기장·전류·힘 보기’를 켜면 자기장(하늘색), 전류(${use3d ? '노란색' : '초록색'}), 힘(빨간색)의 방향을 함께 볼 수 있어요.`);
  const row = (label, key) => `<tr><td>${label}</td><td>${results[key] ?? ''}</td></tr>`;
  setHTML('#readout', `<table class="data-table"><tr><th>과정</th><th>움직이는 방향</th></tr>${row('과정 2: 처음 상태', '1,1')}${row('과정 3: 전류 방향 바꿈', '-1,1')}${row('과정 4: 자석 극 바꿈', '1,-1')}${row('전류와 극 모두 바꿈', '-1,-1')}</table><table class="data-table"><tr><th>전압</th>${VOLTAGES.map(v => `<th>${v} V</th>`).join('')}</tr><tr><td>움직인 정도</td>${VOLTAGES.map(v => `<td>${maxByVoltage[v] ? '▮'.repeat(Math.max(1, Math.round(maxByVoltage[v] / 2.5))) : ''}</td>`).join('')}</tr></table>`);
  setText('#model-note', `말굽자석은 위쪽 팔과 아래쪽 팔 사이에 자기장을 만들어요. 코일 중 두 팔 사이를 지나는 아래 변이 힘을 받아요.${use3d ? ' 3D 화면을 끌어 돌려 보고, ‘앞에서’를 누르면 그네가 움직이는 방향이 잘 보여요. 전류의 방향을 바꾸면 전원 장치의 두 전선을 바꾸어 꽂아요.' : ''} 그네가 움직이는 정도와 흔들림은 보기 쉽게 나타냈어요. 오른손으로 힘의 방향을 찾을 수도 있어요.`);
  setText('#discovery', '패러데이는 자석 주변에 놓인 전선에 전류를 흘려주면 전선이 회전한다는 것을 알아냈어요.');
}
$('#tab-swing').onclick = () => {};

/* ---------- 3D로 보기 ----------
   말굽자석의 두 팔 사이를 지나는 코일 아래 변, 전원 장치와 전선, 자기장·전류·힘을 입체로 보여 줘요(src/swing-3d.js).
   WebGL을 쓸 수 없는 기기에서는 2D 그림으로 실험해요. */
const view3d = setupViewToggle({
  stage: $('.stage'), key: 'swing-view', cams: [['oblique', '비스듬히'], ['front', '앞에서'], ['side', '옆에서']],
  load: () => import('./src/swing-3d.js').then(({ createSwing3D }) => createSwing3D({ stage: $('.stage'), svg: $('#scene'), reducedMotion: instantLessons })),
  onChange: active => { use3d = active; renderText(); },
});
$('#reset').onclick = () => { press(false); current = 1; magnet = 1; vIndex = 0; angle = 0; vel = 0; renderControls(); };
$('#show-detail').onchange = e => { show = e.target.checked; };

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    paint(dt);
    if (show && on) seen.view = true;
    flow?.update(checklist([
      ['과정 2: 처음 상태에서 그네 관찰하기', seen.first, '‘스위치 누르고 있기’를 눌러 움직이는 방향을 봐요'],
      ['‘자기장·전류·힘 보기’를 켜고 힘의 방향 살펴보기', seen.view, '‘자기장·전류·힘 보기’를 켠 채로 ‘스위치 누르고 있기’를 눌러, 자기장·전류·힘의 방향을 비교해요', '', '#show-detail'],
      ['과정 3: 전류의 방향을 바꾸어 관찰하기', seen.reversed, '‘전류의 방향 바꾸기’를 누른 뒤 ‘스위치 누르고 있기’', '#flip-current'],
      ['과정 4: 자석의 극을 바꾸어 관찰하기', seen.flipped, '‘자석의 N극과 S극 바꾸기’를 누른 뒤 ‘스위치 누르고 있기’', '#flip-magnet'],
      ['과정 5: 전압을 바꾸어 움직이는 정도 비교하기', seen.voltage, '‘5 V’처럼 전압을 바꾸어 두 번 이상 ‘스위치 누르고 있기’', '[data-v]'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '말굽자석 사이에 매달린 코일에<br>전류를 흘리면?',
    lead: '패러데이는 자석 주변에 놓인 전선에 전류를 흘려주면 전선이 회전한다는 것을 알아냈어요.<br>말굽자석 사이에 코일(전기 그네)을 매달고 전류를 흘려 볼 거예요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="말굽자석 사이에 매달린 코일"><rect width="520" height="250" rx="12" fill="#121a33"/><path d="M120 30 H400" stroke="#c9d0e6" stroke-width="6"/><path d="M240 30 V150 M300 30 V150" stroke="#d8dde3" stroke-width="2"/><path d="M230 110 H310 V190 H230Z" stroke="#c46f2c" stroke-width="7" fill="none"/><rect x="200" y="150" width="170" height="18" fill="#3a6fd8"/><rect x="200" y="200" width="170" height="18" fill="#e04848"/><path d="M370 159 C420 159 420 209 370 209" stroke="#b9bfcc" stroke-width="16" fill="none"/></svg>`,
    question: '스위치를 눌러 코일에 전류를 흘리면 코일은 어떻게 될까요?',
    choices: ['코일이 한쪽으로 움직일 것 같아요.', '코일이 자석에 붙어 버릴 것 같아요.', '코일은 움직이지 않을 것 같아요.', '아직 잘 모르겠어요.'],
    placeholder: '앞 시간에 배운 전류가 흐르는 코일 주위의 자기장을 떠올려 보세요.',
  },
  observe: {
    title: '전류의 방향, 자석의 극, 전압을 바꾸며 전기 그네를 관찰해 보세요.',
    recordLabel: '과정 2~5에서 전기 그네가 움직인 방향과 움직인 정도를 적어 보세요.',
    placeholder: '처음 상태, 전류의 방향을 바꾸었을 때, 자석의 극을 바꾸었을 때 그네가 움직인 방향을 비교하고, 전압에 따라 움직인 정도도 적어 보세요.',
  },
  explain: {
    question: '전기 그네를 움직이게 한 힘에는 어떤 특성이 있을까요? 관찰 결과를 근거로 설명해 보세요.',
    concepts: [
      ['자기장 속 코일이 받는 힘', '말굽자석이 만든 자기장 안에 놓인 코일에 전류가 흐르면 <b class="subj">코일이</b> <b>힘을 받아 움직여요</b>. 코일 주변에 생기는 자기장과 자석에 의해 생긴 자기장이 상호 작용하기 때문이에요.'],
      ['힘의 방향', '전류의 방향을 바꾸거나 자기장의 방향(자석의 극)을 바꾸면 코일이 받는 <b class="subj">힘의 방향도</b> <b>바뀌어요</b>. 둘 다 바꾸면 <b>처음과 같은 방향</b>이 돼요.'],
      ['힘의 크기', '전류의 세기가 커질수록, 자기장의 세기가 세질수록 <b class="subj">전류가 흐르는 코일에 작용하는 힘은</b> <b>커져요</b>.'],
      ['힘의 방향 찾기', '오른손의 네 손가락을 자기장 방향으로, 엄지손가락을 전류 방향으로 향하게 할 때 <b class="subj">손바닥이 향하는 방향이</b> <b>힘의 방향</b>이에요. 오른손을 사용해야 해요.'],
    ],
    note: '코일 모양이 달라도 힘의 크기는 전류의 세기와 자기장의 세기에 따라, 힘의 방향은 전류와 자기장의 방향에 따라 달라져요.',
  },
  onRestart: () => { show = false; $('#show-detail').checked = false; Object.keys(seen).forEach(k => seen[k] = false); Object.keys(results).forEach(k => delete results[k]); Object.keys(maxByVoltage).forEach(k => delete maxByVoltage[k]); lab.resetQuiz(); $('#reset').click(); },
});
renderControls();
requestAnimationFrame(frame);
