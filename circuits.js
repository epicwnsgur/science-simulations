import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, PathFlow, ELECTRON_GLYPH, reducedMotion, instantLessons } from './src/lab-shell.js';
import { CIRCUITS, solve } from './src/circuit-model.js';

// 교과서 248–249쪽, 지도서 566–569쪽(7차시).
// 지도상 유의점: 크기가 같은 전구(저항) 두 개만 다루고, 계산이나 혼합 연결은 다루지 않습니다.
// 전구의 정확한 밝기보다 대략적인 밝기(어둡다·같다·밝다)를 비교합니다.

const terms = [
  ['직렬연결', '전구(저항)를 한 줄로 연결하는 방법이에요. 전류가 하나의 경로로 흘러요.'],
  ['병렬연결', '전구(저항)를 여러 갈래로 나누어 연결하는 방법이에요. 전류가 여러 경로로 나뉘어 흘러요.'],
  ['전체 저항', '직렬연결하면 저항이 길어지는 것과 같아 전체 저항이 커지고, 병렬연결하면 저항이 굵어지는 것과 같아 전체 저항이 작아져요.'],
  ['전체 전류', '직렬연결하면 회로 전체에 흐르는 전류의 세기가 작아지고, 병렬연결하면 커져요.'],
];
const BULBS = {
  single: [{ id: 'A', x: 400, y: 110 }],
  series: [{ id: 'A', x: 320, y: 110 }, { id: 'B', x: 480, y: 110 }],
  parallel: [{ id: 'A', x: 420, y: 100 }, { id: 'B', x: 420, y: 210 }],
};
const SWITCHES = {
  single: [{ id: 'S1', x: 220, y: 240, vertical: true }],
  series: [{ id: 'S1', x: 220, y: 240, vertical: true }, { id: 'S2', x: 580, y: 240, vertical: true }],
  parallel: [{ id: 'S1', x: 300, y: 100 }, { id: 'S2', x: 300, y: 210 }],
};
// 전류의 방향(+극 → −극)으로 그린 도선. 전자는 반대 방향으로 이동해요.
const PATHS = {
  single: { main: 'M440 370 H580 V110 H220 V370 H360' },
  series: { main: 'M440 370 H580 V110 H220 V370 H360' },
  parallel: { right: 'M440 370 H600 V210', A: 'M600 210 V100 H200 V210', B: 'M600 210 H200', left: 'M200 210 V370 H360' },
};
const bulbSVG = b => `<g class="bulb" id="bulb-${b.id}" transform="translate(${b.x} ${b.y})"><circle class="glow" r="70" fill="url(#bulb-light)" opacity="0"/><circle r="20" fill="#ffffff1c" stroke="#e8eef5" stroke-width="2"/><path class="filament" d="M-9 10 l4 -14 l5 9 l5 -9 l4 14" stroke="#9a7a40" stroke-width="2" fill="none"/><rect x="-11" y="18" width="22" height="9" fill="#8f9bc4"/><text y="-30" text-anchor="middle" font-size="14" font-weight="700">전구 ${b.id}</text></g>`;
const switchSVG = s => `<g class="switch" id="sw-${s.id}" role="button" tabindex="0" aria-label="스위치 ${s.id}" transform="translate(${s.x} ${s.y}) rotate(${s.vertical ? 90 : 0})"><rect x="-32" y="-14" width="64" height="28" rx="6" fill="#2a3150" stroke="#8f9bc4"/><circle cx="-20" r="5" fill="#cfd6ec"/><circle cx="20" r="5" fill="#cfd6ec"/><path class="lever" stroke="#ffd166" stroke-width="5" stroke-linecap="round"/><text y="${s.vertical ? 32 : 30}" text-anchor="middle" font-size="11" class="muted" transform="rotate(${s.vertical ? -90 : 0} 0 ${s.vertical ? 32 : 30})">${s.id}</text></g>`;
const scene = `${Object.entries(PATHS).map(([key, paths]) => `<g id="circuit-${key}" hidden>${Object.entries(paths).map(([k, d]) => `<path id="path-${key}-${k}" d="${d}" stroke="#7d8fbf" stroke-width="5" fill="none" stroke-linejoin="round"/>`).join('')}<g class="electrons"></g>${BULBS[key].map(bulbSVG).join('')}${SWITCHES[key].map(switchSVG).join('')}</g>`).join('')}
<g id="battery"><rect x="356" y="354" width="88" height="32" rx="6" fill="#2a3150" stroke="#8f9bc4"/><rect x="361" y="359" width="38" height="22" rx="4" fill="url(#copper)"/><rect x="401" y="359" width="38" height="22" rx="4" fill="url(#copper)"/><text x="346" y="376" text-anchor="middle" font-size="16" font-weight="700">−</text><text x="454" y="376" text-anchor="middle" font-size="16" font-weight="700">+</text><text x="400" y="408" text-anchor="middle" font-size="12" class="muted">전지 2개 (1.5 V × 2)</text></g>
<g id="gauge" transform="translate(680 120)"><text x="0" y="-16" text-anchor="middle" font-size="12" class="muted">회로 전체 전류</text><rect x="-14" y="0" width="28" height="200" rx="8" fill="#0f1730" stroke="#2c3966"/><rect id="gauge-fill" x="-10" width="20" rx="5" fill="#5cc8ff" filter="url(#glow)"/><line id="gauge-ref" x1="-22" x2="22" stroke="#ffd166" stroke-width="2" stroke-dasharray="4 3"/><text id="gauge-ref-label" x="26" font-size="10" style="fill:#ffd166">전구 1개</text></g>
<g id="fx"></g>`;

const lab = buildLab({
  crumb: '05 저항의 연결',
  title: '저항의 직렬연결과 병렬연결은 무엇이 다를까?',
  intro: '회로 카드처럼 전구를 연결하고 밝기를 비교해 보세요.',
  tabs: [{ id: 'single', label: '전구 1개' }, { id: 'series', label: '직렬연결' }, { id: 'parallel', label: '병렬연결' }],
  toggle: '전자 흐름 보기',
  sceneLabel: '전지, 스위치, 전구로 이루어진 회로',
  scene,
  terms,
});

/* ---------- 상태 ---------- */
let mode = 'single', show = true, lastFrame = 0;
const closed = { single: { S1: false }, series: { S1: false, S2: false }, parallel: { S1: false, S2: false } };
const marks = {}; // 학생이 칠한 밝기 칸: marks['series:all:A'] = 1~3
const seen = { single: false, seriesAll: false, seriesOne: false, parallelAll: false, parallelOne: false };
const shown = {}; // 화면에 보이는 밝기(부드럽게 변함)
let flows = {};
let flow = null;

function buildFlows() {
  Object.values(flows).forEach(f => f.remove()); flows = {};
  for (const [k] of Object.entries(PATHS[mode])) {
    const path = $(`#path-${mode}-${k}`), len = path.getTotalLength();
    flows[k] = new PathFlow($(`#circuit-${mode} .electrons`), path, { count: Math.max(4, Math.round(len / 30)), radius: 4, fill: '#2f9bff', glyph: ELECTRON_GLYPH });
    flows[k].len = len;
  }
}
function state() {
  const s = closed[mode];
  const all = Object.values(s).every(Boolean), some = Object.values(s).some(Boolean);
  return { all, one: some && !all };
}
function paint(dt) {
  const r = solve(mode, closed[mode]);
  const g = instantLessons.matches ? 1 : 1 - Math.exp(-dt * 5);
  for (const b of BULBS[mode]) {
    const key = `${mode}${b.id}`; shown[key] = (shown[key] ?? 0) + ((r.brightness[b.id] ?? 0) - (shown[key] ?? 0)) * g;
    const node = document.querySelector(`#circuit-${mode} #bulb-${b.id}`);
    node.querySelector('.glow').setAttribute('opacity', Math.min(1, shown[key] * 1.05).toFixed(2));
    node.querySelector('.filament').setAttribute('stroke', shown[key] > .15 ? '#fff6c8' : '#9a7a40');
    node.querySelector('.filament').setAttribute('filter', shown[key] > .15 ? 'url(#glow)' : '');
  }
  for (const sw of SWITCHES[mode]) {
    const on = closed[mode][sw.id];
    document.querySelector(`#circuit-${mode} #sw-${sw.id} .lever`).setAttribute('d', on ? 'M-20 0 L20 0' : 'M-20 0 L14 -22');
  }
  // 전자는 전류의 방향과 반대로 움직여요. 같은 빠르기라면 전류가 센 도선에서 더 빨리 움직이게 나타냈어요.
  for (const [k, f] of Object.entries(flows)) {
    const I = r.currents[k] ?? 0;
    f.step(dt, -I * 70 / f.len, I ? .6 : 1.8); f.visible(show);
  }
  const fill = Math.min(1, r.total / 2.2) * 200;
  $('#gauge-fill').setAttribute('y', (200 - fill).toFixed(1)); $('#gauge-fill').setAttribute('height', fill.toFixed(1));
  const ref = 200 - 200 / 2.2;
  $('#gauge-ref').setAttribute('y1', ref); $('#gauge-ref').setAttribute('y2', ref); $('#gauge-ref-label').setAttribute('y', ref + 4);
  const st = state();
  if (mode === 'single' && st.all) mark('single');
  if (mode === 'series' && st.all) mark('seriesAll');
  if (mode === 'series' && st.one) mark('seriesOne');
  if (mode === 'parallel' && st.all) mark('parallelAll');
  if (mode === 'parallel' && st.one) mark('parallelOne');
}
function mark(key) {
  if (seen[key]) return;
  seen[key] = true;
  const msg = { single: '💡 전구 1개의 밝기를 기억해요', seriesAll: '🔗 직렬연결: 두 전구의 밝기를 비교해요', seriesOne: '🔌 직렬연결에서 스위치 하나를 열었어요', parallelAll: '🌿 병렬연결: 두 전구의 밝기를 비교해요', parallelOne: '🔌 병렬연결에서 스위치 하나를 열었어요' }[key];
  toast(msg);
}

/* ---------- 밝기 기록 카드 ---------- */
function recordCard() {
  if (mode === 'single') return `<p class="poe-hint">전구 1개를 연결했을 때의 밝기를 <b>2칸</b>으로 기준을 삼아요. 어두우면 1칸, 같으면 2칸, 더 밝으면 3칸을 칠해요.</p><div class="record-row"><span>전구 A</span>${cells('single:all:A', true)}</div>`;
  const rows = [['all', '스위치를 모두 닫았을 때'], ['one', '스위치를 하나만 열었을 때']];
  return `<p class="poe-hint">전구 1개일 때(2칸)와 비교해 칸을 칠해 보세요. 꺼졌으면 칠하지 않아요.</p>${rows.map(([k, label]) => `<div class="record-block"><strong>${label}</strong>${BULBS[mode].map(b => `<div class="record-row"><span>전구 ${b.id}</span>${cells(`${mode}:${k}:${b.id}`)}</div>`).join('')}</div>`).join('')}`;
}
function cells(key, fixed = false) {
  const v = fixed ? 2 : marks[key] ?? 0;
  return `<span class="cells">${[1, 2, 3].map(n => `<button class="cell${n <= v ? ' on' : ''}" data-mark="${key}" data-n="${n}" ${fixed ? 'disabled' : ''} aria-label="${key.split(':').pop()} 전구 ${n}칸"></button>`).join('')}</span>`;
}
function bindCells() {
  $$('[data-mark]').forEach(b => b.onclick = () => {
    const k = b.dataset.mark, n = +b.dataset.n;
    marks[k] = marks[k] === n ? 0 : n; renderText(true);
  });
}

/* ---------- 문구와 조작 ---------- */
function renderText(cardsChanged = false) {
  const st = state();
  const names = { single: '전구 1개', series: '직렬연결', parallel: '병렬연결' };
  setText('#guide', mode === 'single' ? '먼저 전구 1개를 연결한 회로에서 전구의 밝기를 확인해요.' : `${names[mode]}한 두 전구의 밝기를 전구 1개일 때와 비교해 보세요.`);
  setText('#subguide', mode === 'single' ? '스위치를 눌러 닫아 보세요.' : '스위치를 모두 닫은 뒤, 스위치를 하나만 열어 보세요. 그림 속 스위치를 눌러도 돼요.');
  setText('#stage-state', `${names[mode]} · ${SWITCHES[mode].map(s => `${s.id} ${closed[mode][s.id] ? '닫힘' : '열림'}`).join(' · ')}`);
  setText('#note-title', st.all ? '전구의 밝기를 비교해 보세요' : st.one ? '다른 전구는 어떻게 되었나요?' : '스위치를 닫아 보세요');
  setText('#note-text', '전구의 밝기와 회로 전체 전류 막대를 함께 살펴보세요. 전체 밝기가 아니라 전구 하나의 밝기를 비교해요.');
  const html = `<div class="record-card">${recordCard()}</div>`;
  if (cardsChanged || $('#readout').dataset.mode !== mode) { $('#readout').innerHTML = html; $('#readout').dataset.mode = mode; bindCells(); }
  setText('#model-note', '크기가 같은 전구 두 개를 연결한 모형이에요. 밝기와 전자의 빠르기는 대략적인 비교를 위해 나타냈어요. 실제 전구는 전지의 내부 저항 때문에 밝기가 조금 다를 수 있어요.');
  setText('#discovery', '멀티탭의 콘센트는 어떻게 연결되어 있을까요?');
}
function renderControls() {
  $('#controls').innerHTML = `<div role="group" aria-label="스위치">${SWITCHES[mode].map(s => `<button data-switch="${s.id}" aria-pressed="${closed[mode][s.id]}">스위치 ${s.id} ${closed[mode][s.id] ? '열기' : '닫기'}</button>`).join('')}</div>`;
  $('#actions').innerHTML = `<button id="close-all" class="primary">스위치 모두 닫기</button><button id="open-all" class="secondary">스위치 모두 열기</button>`;
  $$('[data-switch]').forEach(b => b.onclick = () => toggle(b.dataset.switch));
  $('#close-all').onclick = () => { Object.keys(closed[mode]).forEach(k => closed[mode][k] = true); burstBulbs(); renderControls(); };
  $('#open-all').onclick = () => { Object.keys(closed[mode]).forEach(k => closed[mode][k] = false); renderControls(); };
  renderText();
}
function burstBulbs() { for (const b of BULBS[mode]) burst($('#fx'), b.x, b.y, '#ffe27a', 10); }
function toggle(id) {
  closed[mode][id] = !closed[mode][id];
  if (closed[mode][id]) { burstBulbs(); const sw = SWITCHES[mode].find(v => v.id === id); burst($('#fx'), sw.x, sw.y, '#9fe8ff', 8); }
  renderControls();
}
function setMode(next) {
  mode = next; lab.selectTab(next);
  for (const k of Object.keys(PATHS)) $(`#circuit-${k}`).toggleAttribute('hidden', k !== next);
  buildFlows();
  SWITCHES[next].forEach(s => {
    const el = document.querySelector(`#circuit-${next} #sw-${s.id}`);
    el.onclick = () => toggle(s.id);
    el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s.id); } };
  });
  renderControls();
}
for (const k of Object.keys(PATHS)) $(`#tab-${k}`).onclick = () => setMode(k);
$('#reset').onclick = () => { Object.values(closed).forEach(s => Object.keys(s).forEach(k => s[k] = false)); setMode(mode); };
$('#show-detail').checked = true;
$('#show-detail').onchange = e => { show = e.target.checked; };

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    paint(dt);
    flow?.update(checklist([
      ['① 전구 1개 회로의 밝기 확인하기', seen.single, '‘전구 1개’ 탭 → ‘스위치 S1 닫기’를 누르고 밝기를 기억해요'],
      ['② 직렬연결: 스위치 모두 닫기', seen.seriesAll, '‘직렬연결’ 탭 → ‘스위치 모두 닫기’', '#tab-series'],
      ['② 직렬연결: 스위치 하나만 열기', seen.seriesOne, '그림의 스위치(S1이나 S2) 하나를 눌러 열어요', '', '[data-switch]'],
      ['③ 병렬연결: 스위치 모두 닫기', seen.parallelAll, '‘병렬연결’ 탭 → ‘스위치 모두 닫기’', '#tab-parallel'],
      ['③ 병렬연결: 스위치 하나만 열기', seen.parallelOne, '그림의 스위치(S1이나 S2) 하나를 눌러 열어요', '', '[data-switch]'],
    ]));
  }
  requestAnimationFrame(frame);
}

const thumb = (x, y, dim) => `<circle cx="${x}" cy="${y}" r="${dim ? 26 : 40}" fill="url(#p-light)" opacity="${dim ? .5 : .9}"/><circle cx="${x}" cy="${y}" r="13" fill="#ffffff22" stroke="#e8eef5" stroke-width="2"/>`;
flow = setupPOEFlow({
  predict: {
    title: '전구 두 개를 직렬, 병렬로 연결하면<br>각 전구의 밝기는?',
    lead: '전구 1개를 연결한 회로의 밝기를 기준으로,<br>같은 전구 두 개를 직렬연결한 회로와 병렬연결한 회로를 비교할 거예요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="직렬연결과 병렬연결 회로"><defs><radialGradient id="p-light"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#ffb627" stop-opacity="0"/></radialGradient></defs><rect width="520" height="250" rx="12" fill="#121a33"/><path d="M40 60 H220 V200 H40 Z" stroke="#7d8fbf" stroke-width="3" fill="none"/>${thumb(90, 60)}${thumb(170, 60)}<text x="130" y="232" text-anchor="middle" fill="#aab4d6" font-size="13">직렬연결</text><path d="M300 50 H480 M300 120 H480 M300 50 V200 H480 V50" stroke="#7d8fbf" stroke-width="3" fill="none"/>${thumb(390, 50)}${thumb(390, 120)}<text x="390" y="232" text-anchor="middle" fill="#aab4d6" font-size="13">병렬연결</text></svg>`,
    question: '전구 1개일 때와 비교하면 각 전구의 밝기는 어떨까요?',
    choices: ['직렬은 더 어둡고, 병렬은 같을 것 같아요.', '직렬은 같고, 병렬은 더 어두울 것 같아요.', '둘 다 전구 1개일 때보다 어두울 것 같아요.', '둘 다 전구 1개일 때와 같을 것 같아요.', '아직 잘 모르겠어요.'],
    placeholder: '초등학교에서 전구를 연결해 본 경험이나 멀티탭을 사용한 경험을 떠올려 보세요.',
  },
  observe: {
    title: '세 회로의 전구 밝기를 비교하고, 스위치를 하나만 열어 보세요.',
    recordLabel: '각 회로에서 전구의 밝기, 스위치를 하나 열었을 때의 변화, 전체 전류 막대의 변화를 적어 보세요.',
    placeholder: '직렬연결과 병렬연결에서 전구의 밝기는 전구 1개일 때와 비교해 어땠나요? 스위치 하나를 열면 다른 전구는 어떻게 되었나요?',
  },
  explain: {
    question: '직렬연결과 병렬연결에서 전구의 밝기가 다른 까닭은 무엇일까요? 스위치 하나를 열었을 때의 결과가 다른 까닭도 설명해 보세요.',
    concepts: [
      ['저항의 직렬연결', '전구 두 개를 직렬연결하면 저항이 길어지는 것과 같아 회로 <b class="subj">전체 저항은</b> <b>커지고</b>, 전체에 흐르는 <b class="subj">전류의 세기는</b> <b>작아져요</b>. 각 전구에는 전구 1개일 때보다 낮은 전압이 걸려 더 어두워요.'],
      ['하나의 경로', '직렬연결에서는 전류가 하나의 경로로 흐르기 때문에 한 전구의 연결이 끊어지면 모든 전구가 꺼져요.'],
      ['저항의 병렬연결', '전구 두 개를 병렬연결하면 저항이 굵어지는 것과 같아 회로 <b class="subj">전체 저항은</b> <b>작아지고</b>, 전체에 흐르는 <b class="subj">전류의 세기는</b> <b>커져요</b>. 각 전구에는 전구 1개일 때와 같은 크기의 전압이 걸려 밝기가 같아요.'],
      ['두 개의 경로', '병렬연결에서는 전류가 두 개의 경로로 흐르기 때문에 한 전구의 연결이 끊어져도 다른 전구는 꺼지지 않아요. 가정의 전기 기구와 멀티탭은 병렬로 연결되어 있어요.'],
    ],
    note: '직렬연결된 두 번째 전구가 더 어두운 것은 아니에요. 두 전구에 흐르는 전류의 세기는 같아요.',
  },
  onRestart: () => {
    show = true; $('#show-detail').checked = true;
    Object.keys(seen).forEach(k => seen[k] = false); Object.keys(marks).forEach(k => delete marks[k]);
    Object.values(closed).forEach(s => Object.keys(s).forEach(k => s[k] = false));
    lab.resetQuiz(); setMode('single');
  },
});
setMode('single');
requestAnimationFrame(frame);
