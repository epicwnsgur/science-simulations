import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, reducedMotion } from './src/lab-shell.js';
import { EARTH, coilField, magnetField, add, needleDeg, trace, toPath } from './src/magnet-model.js';

// 교과서 258–259쪽, 지도서 584–589쪽(11차시).
// 지도상 유의점: 전류가 흐르는 순간에만 스위치를 닫고 바로 엽니다. 자기장의 세기와 방향은 정성적으로 확인합니다.
// 중학교 2학년 수준에서는 ‘자기력선’이라는 용어를 쓰지 않고, 교과서 그림처럼 자기장의 모습만 보여 줍니다.

const COIL = Object.freeze({ x: 400, y: 230, r: 58 });
const MAGNET = Object.freeze({ x: 400, y: 230, half: 80 });
const LEVELS = [{ label: '약하게 (1 V)', s: .4 }, { label: '보통 (3 V)', s: .9 }, { label: '세게 (5 V)', s: 1.8 }];
const RING = [[400, 108], [400, 352], [236, 150], [220, 230], [236, 310], [564, 150], [580, 230], [564, 310]];
const HOT_SECONDS = 5;
const terms = [
  ['자기력', '자석과 자석, 자석과 쇠붙이 사이에 작용하는 힘이에요.'],
  ['자기장', '자기력이 미치는 공간이에요.'],
  ['자기장의 방향', '자기장 속에 나침반을 놓았을 때 나침반 바늘의 N극이 가리키는 방향이에요.'],
  ['코일', '도선을 원통형으로 여러 번 감은 것이에요. 전류가 흐르는 코일 주위에는 자기장이 생겨요.'],
];

const compassSVG = (id, x, y, probe = false) => `<g class="compass${probe ? ' probe' : ''}" id="${id}" transform="translate(${x} ${y})"${probe ? ' role="button" tabindex="0" aria-label="움직일 수 있는 나침반, 방향키로 이동"' : ''}><circle r="${probe ? 26 : 22}" fill="#f6f3ea" stroke="${probe ? '#ffd166' : '#9aa4c4'}" stroke-width="${probe ? 3 : 2}"/><circle r="${probe ? 20 : 17}" fill="none" stroke="#d9d3c3"/><g class="needle"><path d="M0 -${probe ? 19 : 16} L5 0 L-5 0Z" fill="#e23b3b"/><path d="M0 ${probe ? 19 : 16} L5 0 L-5 0Z" fill="#cfd6e6"/></g><circle r="2.6" fill="#333"/></g>`;
const scene = `
<rect x="140" y="62" width="520" height="340" rx="16" fill="#ffffff0c" stroke="#ffffff22"/>
<text x="664" y="80" font-size="11" class="muted">북 ↑</text>
<g id="field-lines" opacity="0"></g>
<g id="magnet-group" hidden><rect x="${MAGNET.x - MAGNET.half - 6}" y="${MAGNET.y - 18}" width="${MAGNET.half + 6}" height="36" rx="4" fill="#e04848"/><rect x="${MAGNET.x}" y="${MAGNET.y - 18}" width="${MAGNET.half + 6}" height="36" rx="4" fill="#3a6fd8"/><text x="${MAGNET.x - 46}" y="${MAGNET.y + 7}" font-size="20" font-weight="800" text-anchor="middle" style="fill:#fff">N</text><text x="${MAGNET.x + 46}" y="${MAGNET.y + 7}" font-size="20" font-weight="800" text-anchor="middle" style="fill:#fff">S</text></g>
<g id="coil-group"><ellipse cx="${COIL.x}" cy="${COIL.y}" rx="12" ry="${COIL.r + 10}" fill="none" stroke="url(#copper)" stroke-width="9"/><ellipse id="coil-glow" cx="${COIL.x}" cy="${COIL.y}" rx="12" ry="${COIL.r + 10}" fill="none" stroke="#ffb36b" stroke-width="10" opacity="0" filter="url(#glow-strong)"/><g id="current-arrow" opacity="0"><path id="current-path" stroke="#ff6b6b" stroke-width="4" marker-end="url(#arrow-head)"/><text x="${COIL.x + 38}" y="${COIL.y + 5}" font-size="13" style="fill:#ff9a9a">전류</text></g><text x="${COIL.x}" y="${COIL.y + COIL.r + 34}" text-anchor="middle" font-size="12" class="muted">코일</text></g>
<g id="compasses">${RING.map(([x, y], i) => compassSVG(`c${i}`, x, y)).join('')}</g>
${compassSVG('probe', 700, 360, true)}
<text x="700" y="404" text-anchor="middle" font-size="11" style="fill:#ffd166">끌어서 옮겨 보세요</text>
<g id="supply" transform="translate(30 70)"><rect width="96" height="70" rx="8" fill="#1d2440" stroke="#8f9bc4"/><text id="supply-v" x="48" y="38" text-anchor="middle" font-family="monospace" font-size="24" style="fill:#ff4d4d" filter="url(#glow)">0.0</text><text x="48" y="58" text-anchor="middle" font-size="10" class="muted">전원 장치 (V)</text></g>`;

const lab = buildLab({
  crumb: '자기 01 전류가 만든 자기장',
  title: '전류가 흐르는 코일 주변에는 무엇이 생길까?',
  intro: '막대자석과 코일 주위에 놓인 나침반 바늘을 관찰해 보세요.',
  tabs: [{ id: 'magnet', label: '막대자석 주위' }, { id: 'coil', label: '코일 주위' }],
  toggle: '자기장 모습 보기',
  sceneLabel: '나침반으로 둘러싼 막대자석과 코일',
  scene,
  terms,
});

/* ---------- 상태 ---------- */
let mode = 'magnet', show = false, on = false, direction = 1, level = 1, onTime = 0, warned = false, lastFrame = 0;
let probe = { x: 700, y: 360 }, drag = null, linesKey = '', magnetTime = 0;
const needles = new Map();
const seen = { magnet: false, current: false, reversed: false, stronger: false, probe: false };
const levelsTried = new Set();
let flow = null;

function field(p) {
  if (mode === 'magnet') return add(magnetField(p, MAGNET), EARTH);
  return add(coilField(p, COIL, on ? LEVELS[level].s : 0, direction), EARTH);
}
function sourceOnly(p) { return mode === 'magnet' ? magnetField(p, MAGNET) : coilField(p, COIL, LEVELS[level].s, direction); }

// 나침반 바늘은 용수철처럼 흔들리다 자기장 방향에 멈춰요.
function stepNeedle(id, target, dt) {
  const n = needles.get(id) ?? { a: 0, v: 0 };
  if (reducedMotion.matches) { n.a = target; n.v = 0; }
  else {
    let d = ((target - n.a + 540) % 360) - 180;
    n.v += (d * 60 - n.v * 7) * dt; n.a += n.v * dt;
  }
  needles.set(id, n); return n.a;
}
function paintCompasses(dt) {
  RING.forEach(([x, y], i) => {
    const a = stepNeedle(`c${i}`, needleDeg(field({ x, y })), dt);
    document.querySelector(`#c${i} .needle`).setAttribute('transform', `rotate(${a.toFixed(1)})`);
  });
  $('#probe').setAttribute('transform', `translate(${probe.x.toFixed(1)} ${probe.y.toFixed(1)})`);
  const a = stepNeedle('probe', needleDeg(field(probe)), dt);
  $('#probe .needle').setAttribute('transform', `rotate(${a.toFixed(1)})`);
}
function paintLines() {
  // 자기장의 모습: 교과서 그림처럼 선으로 나타내요. 흐르는 무늬는 자기장의 방향(N극이 가리키는 방향)이에요.
  const visible = show && (mode === 'magnet' || on);
  $('#field-lines').setAttribute('opacity', visible ? 1 : 0);
  const key = `${mode}:${direction}:${level}`;
  if (!visible || key === linesKey) return;
  linesKey = key;
  const paths = [];
  const opts = { bounds: { x0: 140, y0: 62, x1: 660, y1: 402 } };
  if (mode === 'magnet') {
    // N극 끝에서 부채꼴로 출발해 S극으로 들어가는 모습을 그려요.
    const n = { x: MAGNET.x - MAGNET.half, y: MAGNET.y }, sPole = { x: MAGNET.x + MAGNET.half, y: MAGNET.y };
    for (let deg = 95; deg <= 265; deg += 17) {
      const a = deg * Math.PI / 180, start = { x: n.x + Math.cos(a) * 16, y: n.y + Math.sin(a) * 22 };
      paths.push(trace(p => sourceOnly(p), start, { ...opts, max: 900, stop: p => Math.hypot((p.x - sPole.x) / 18, (p.y - sPole.y) / 24) < 1 }));
      // 판 밖으로 나간 선도 S극 쪽에서 거꾸로 따라가 오른쪽 모습을 채워요.
      const mirror = { x: 2 * MAGNET.x - start.x, y: start.y };
      paths.push(trace(p => { const b = sourceOnly(p); return { x: -b.x, y: -b.y }; }, mirror, { ...opts, max: 900, stop: p => Math.hypot((p.x - n.x) / 18, (p.y - n.y) / 24) < 1 }).reverse());
    }
  } else {
    for (const f of [.1, .25, .38, .45, .5, .55, .62, .75, .9]) {
      const start = { x: COIL.x, y: COIL.y - COIL.r + 2 * COIL.r * f };
      const fwd = trace(p => sourceOnly(p), start, { ...opts, closeTo: start, max: 700 });
      const closed = Math.hypot(fwd.at(-1).x - start.x, fwd.at(-1).y - start.y) < 1;
      // 닫히지 않은 선은 반대 방향으로도 따라가 이어 붙여요.
      paths.push(closed ? fwd : [...trace(p => { const b = sourceOnly(p); return { x: -b.x, y: -b.y }; }, start, { ...opts, max: 700 }).reverse(), ...fwd.slice(1)]);
    }
  }
  $('#field-lines').innerHTML = paths.map(pts => `<path d="${toPath(pts)}" class="field-line"/>`).join('');
}
function paint(dt) {
  if (mode === 'coil') {
    if (on) {
      onTime += dt;
      if (onTime > HOT_SECONDS && !warned) { warned = true; toast('🔥 스위치를 오래 누르면 코일이 뜨거워져요. 관찰한 뒤 바로 떼요'); }
    }
    $('#coil-glow').setAttribute('opacity', on ? (.35 + .2 * level).toFixed(2) : 0);
    $('#current-arrow').setAttribute('opacity', on ? 1 : 0);
    // 위에서 본 모습: direction > 0이면 위쪽 도선에서 판 위로 나온 전류가 판 위의 코일을 따라 아래쪽 도선으로 들어가요.
    // 자기장 모형(coilField)의 부호와 같은 방향이에요(오른손 법칙). 그래서 화살표는 화면 아래쪽을 향해요.
    $('#current-path').setAttribute('d', direction > 0 ? `M${COIL.x + 26} ${COIL.y - 30} V${COIL.y + 30}` : `M${COIL.x + 26} ${COIL.y + 30} V${COIL.y - 30}`);
    setText('#supply-v', on ? ['1.0', '3.0', '5.0'][level] : '0.0');
  }
  paintCompasses(dt);
  paintLines();
}

/* ---------- 조작 ---------- */
function press(state) {
  if (on === state) return;
  on = state; onTime = 0; warned = false;
  if (on) {
    seen.current = true;
    if (direction < 0) seen.reversed = true;
    levelsTried.add(level);
    if (levelsTried.size >= 2 && !seen.stronger) { seen.stronger = true; toast('🧭 전류의 세기에 따라 바늘이 움직이는 정도가 달라져요'); }
  }
  $('#press-btn')?.setAttribute('aria-pressed', on);
  renderText();
}
function renderControls() {
  if (mode === 'magnet') {
    $('#controls').innerHTML = '<p>막대자석 주위 나침반 바늘의 N극이 가리키는 방향을 관찰해요. 노란 테두리 나침반은 끌어서 옮길 수 있어요.</p>';
    $('#actions').innerHTML = '';
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="전류의 세기"><span class="group-label">전류의 세기</span>${LEVELS.map((l, i) => `<button data-level="${i}" aria-pressed="${i === level}">${l.label}</button>`).join('')}</div><div role="group" aria-label="전류의 방향"><button id="flip-btn">⇅ 전류 방향 바꾸기</button></div>`;
    $('#actions').innerHTML = `<button id="press-btn" class="primary hold" aria-pressed="false">스위치 누르고 있기 (누르는 동안 전류가 흘러요)</button>`;
    $$('[data-level]').forEach(b => b.onclick = () => { level = +b.dataset.level; press(false); renderControls(); });
    $('#flip-btn').onclick = () => { direction *= -1; press(false); toast('⇅ 전류의 방향을 바꾸었어요'); renderText(); };
    const btn = $('#press-btn');
    btn.onpointerdown = e => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); press(true); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, () => press(false));
    btn.onkeydown = e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(true); } };
    btn.onkeyup = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(false); } };
    btn.onclick = e => e.preventDefault();
  }
  renderText();
}
function renderText() {
  if (mode === 'magnet') {
    setText('#guide', '막대자석 주위에 놓인 나침반 바늘을 관찰해 보세요.');
    setText('#subguide', '나침반 바늘의 N극(빨간색)이 가리키는 방향이 자기장의 방향이에요.');
    setText('#stage-state', '막대자석 · N극(빨강) S극(파랑)');
    setText('#note-title', '나침반 바늘은 어느 쪽을 가리키나요?');
    setText('#note-text', '자석의 양 끝 가까이와 멀리 떨어진 곳에서 바늘의 방향을 비교해 보세요.');
    setText('#discovery', '자석 주위에 나침반을 놓았을 때 N극이 가리키는 방향이 자기장의 방향이에요.');
  } else {
    setText('#guide', '스위치를 누르는 동안 코일 주위 나침반 바늘이 어떻게 움직이는지 관찰해 보세요.');
    setText('#subguide', '전류의 방향과 세기를 바꾸어 가며 비교해요. 관찰한 뒤에는 바로 손을 떼요.');
    setText('#stage-state', `전류 ${on ? '흐름' : '흐르지 않음'} · ${direction > 0 ? '아래쪽' : '위쪽'} 방향 · ${LEVELS[level].label}`);
    setText('#note-title', on ? '나침반 바늘이 가리키는 방향을 살펴보세요' : '스위치를 눌러 전류를 흘려 보세요');
    setText('#note-text', '258쪽 막대자석 주위의 나침반과 비교해 보세요. 코일의 어느 쪽이 N극처럼 보이나요?');
    setText('#discovery', '전류가 흐르지 않을 때 나침반 바늘은 북쪽(화면 위)을 가리켜요.');
  }
  setHTML('#readout', `<div class="readout-grid"><div class="readout-card"><strong>${mode === 'magnet' ? '관찰 대상' : '전류'}</strong><b>${mode === 'magnet' ? '막대자석' : on ? '흐름' : '멈춤'}</b><small>${mode === 'magnet' ? 'N극 왼쪽 · S극 오른쪽' : `${direction > 0 ? '아래쪽' : '위쪽'} 방향`}</small></div><div class="readout-card"><strong>전류의 세기</strong><b>${mode === 'magnet' ? '–' : ['약', '중', '강'][level]}</b><small>${mode === 'magnet' ? '' : LEVELS[level].label}</small></div></div>`);
  setText('#model-note', '나침반 바늘은 지구 자기장과 자석(코일)의 자기장이 합쳐진 방향을 가리켜요. 선은 자석이나 코일이 만드는 자기장만 나타내고, 선 위의 무늬는 그 방향을 보여 줘요. 지구 자기장이 더해지는 나침반의 방향과는 다를 수 있어요. 바늘이 흔들리는 정도와 선의 모양은 보기 쉽게 나타낸 모형이에요.');
}
function setMode(next) {
  mode = next; lab.selectTab(next); press(false); linesKey = '';
  $('#magnet-group').toggleAttribute('hidden', next !== 'magnet');
  $('#coil-group').toggleAttribute('hidden', next !== 'coil');
  $('#supply').toggleAttribute('hidden', next !== 'coil');
  renderControls();
}
function point(e) { return new DOMPoint(e.clientX, e.clientY).matrixTransform($('#scene').getScreenCTM().inverse()); }
function moveProbe(x, y) {
  probe = { x: Math.max(160, Math.min(780, x)), y: Math.max(80, Math.min(420, y)) };
  if (!seen.probe) seen.probe = true;
}
const probeEl = $('#probe');
probeEl.addEventListener('pointerdown', e => { e.preventDefault(); const p = point(e); drag = { dx: p.x - probe.x, dy: p.y - probe.y }; probeEl.setPointerCapture(e.pointerId); });
probeEl.addEventListener('pointermove', e => { if (!drag) return; const p = point(e); moveProbe(p.x - drag.dx, p.y - drag.dy); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) probeEl.addEventListener(ev, () => drag = null);
probeEl.addEventListener('keydown', e => { const d = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -14], ArrowDown: [0, 14] }[e.key]; if (d) { e.preventDefault(); moveProbe(probe.x + d[0], probe.y + d[1]); } });

$('#tab-magnet').onclick = () => setMode('magnet');
$('#tab-coil').onclick = () => setMode('coil');
$('#reset').onclick = () => { direction = 1; level = 1; probe = { x: 700, y: 360 }; setMode(mode); };
$('#show-detail').onchange = e => { show = e.target.checked; linesKey = ''; };

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    paint(dt);
    if (mode === 'magnet' && !seen.magnet && (magnetTime += dt) > 1.5) { seen.magnet = true; toast('🧲 막대자석 주위 나침반을 관찰했어요'); }
    flow?.update(checklist([
      ['막대자석 주위 나침반 관찰하기', seen.magnet, '‘막대자석 주위’ 탭에서 바늘의 N극(빨강)을 살펴요'],
      ['코일에 전류를 흘려 나침반 관찰하기', seen.current, '‘코일 주위’ 탭 → 스위치를 누르고 있어요'],
      ['전류의 방향을 바꾸어 관찰하기', seen.reversed, '‘전류 방향 바꾸기’ 뒤 다시 스위치를 눌러요'],
      ['전류의 세기를 바꾸어 관찰하기', seen.stronger, '전류의 세기를 바꾸고 다시 스위치를 눌러요'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '코일에 전류가 흐르면<br>주위의 나침반은 어떻게 될까?',
    lead: '판을 뚫고 지나가는 코일 주위에 나침반 8개를 놓았어요.<br>외르스테드는 전류가 흐르는 전선 옆의 나침반 바늘이 움직이는 것을 발견했어요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="코일과 나침반 8개"><rect width="520" height="250" rx="12" fill="#121a33"/><ellipse cx="260" cy="125" rx="9" ry="60" fill="none" stroke="#c46f2c" stroke-width="7"/>${[[260, 35], [260, 215], [150, 65], [140, 125], [150, 185], [370, 65], [380, 125], [370, 185]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="17" fill="#f6f3ea"/><path d="M0 -13 L4 0 L-4 0Z" fill="#e23b3b"/><path d="M0 13 L4 0 L-4 0Z" fill="#cfd6e6"/></g>`).join('')}</svg>`,
    question: '코일에 전류가 흐르면 나침반 바늘은 어떻게 될까요?',
    choices: ['나침반 바늘이 움직이지 않을 것 같아요.', '모든 나침반 바늘이 같은 방향을 가리킬 것 같아요.', '위치에 따라 나침반 바늘이 서로 다른 방향을 가리킬 것 같아요.', '아직 잘 모르겠어요.'],
    placeholder: '초등학교에서 만들어 본 전자석이나 막대자석 주위의 나침반을 떠올려 보세요.',
  },
  observe: {
    title: '막대자석과 코일 주위의 나침반 바늘을 관찰해 보세요.',
    recordLabel: '전류가 흐를 때 나침반 바늘의 방향, 전류의 방향과 세기를 바꾸었을 때의 변화를 적어 보세요.',
    placeholder: '막대자석 주위 나침반과 비교해 보고, 전류의 방향을 바꾸거나 세게 했을 때 달라진 점을 적어 보세요.',
  },
  explain: {
    question: '코일에 전류가 흐를 때 나침반 바늘이 움직인 까닭을 자기장과 관련지어 설명해 보세요.',
    concepts: [
      ['자기력과 자기장', '자석과 자석, 자석과 쇠붙이 사이에 작용하는 힘을 <b>자기력</b>이라 하고, 자기력이 미치는 공간을 <b>자기장</b>이라고 해요. 나침반 바늘의 N극이 가리키는 방향이 자기장의 방향이에요.'],
      ['전류가 흐르는 코일 주위', '코일에 전류가 흐르면 코일 주위에 놓인 나침반 바늘이 움직여요. 전류가 흐르는 코일 주위에 <b>자기장</b>이 생겼기 때문이에요. 그 모습은 막대자석 주위의 자기장과 비슷해요.'],
      ['전류의 방향', '코일에 흐르는 전류의 방향을 바꾸면 자기장의 방향도 반대로 바뀌어 나침반 바늘이 가리키는 방향도 바뀌어요.'],
      ['전류의 세기', '코일에 흐르는 전류의 세기가 커질수록 코일 주위에 생긴 자기장이 세져요.'],
    ],
    note: '나침반 바늘은 지구 자기장의 영향도 함께 받아요. 코일 가까이 있을수록, 전류가 셀수록 코일의 자기장 방향을 더 뚜렷하게 가리켜요.',
  },
  onRestart: () => { show = false; $('#show-detail').checked = false; Object.keys(seen).forEach(k => seen[k] = false); levelsTried.clear(); lab.resetQuiz(); direction = 1; level = 1; setMode('magnet'); },
});
setMode('magnet');
requestAnimationFrame(frame);
