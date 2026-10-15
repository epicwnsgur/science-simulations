import './style.css';
import './poe.css';
import './lab.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, PathFlow, ELECTRON_GLYPH, reducedMotion } from './src/lab-shell.js';
import { WIRES, VOLTAGES, MAX_VOLTAGE, currentMA, MATERIALS, MATERIAL_VOLTAGE, materialCurrentMA, needleAngle } from './src/ohm-model.js';

// 교과서 244–247쪽, 지도서 558–565쪽(5–6차시).
// 지도상 유의점: 옴의 법칙 수식보다 전압에 따라 전류가 변하는 과정을 실험으로 확인하는 데 중점을 둡니다.
// 스위치를 오래 닫아 두면 니크롬선에 열이 발생하므로 값을 확인한 뒤 바로 열도록 안내합니다.

const HEAT_SECONDS = 7;
const terms = [
  ['전기 저항', '전류의 흐름을 방해하는 정도예요. 줄여서 저항이라고 하고, 단위는 Ω(옴)을 사용해요.'],
  ['옴의 법칙', '전류의 세기는 전압에 비례하고 저항에 반비례해요. 전류의 세기(I) = 전압(V) ÷ 전기 저항(R)'],
  ['Ω(옴)', '1 Ω은 1 V의 전압을 걸었을 때 1 A의 전류가 흐르는 도선의 저항이에요.'],
  ['도체', '구리나 철같이 저항이 작아 전류가 잘 흐르는 물질이에요.'],
  ['부도체', '고무나 나무같이 저항이 커 전류가 잘 흐르지 않는 물질이에요.'],
  ['반도체', '평소에는 저항이 부도체와 비슷하나, 특정한 온도나 전압, 빛 등의 조건에서 도체처럼 전류가 잘 흐르는 물질이에요.'],
];

// 회로: (+)단자 → 스위치 → 전류계 → 니크롬선 → (−)단자. 전압계는 니크롬선에 병렬로 연결합니다.
const WIRE_D = 'M190 150 V200 H440 V380 H60 V200 H80 V150';
const meter = (id, x, y, unit, max, ticks) => `<g id="${id}" transform="translate(${x} ${y})"><circle r="44" fill="#f4f1e8" stroke="#8f9bc4" stroke-width="3"/><path d="M-34 -6 A36 36 0 0 1 34 -6" fill="none" stroke="#3b4565" stroke-width="2"/>${ticks.map((t, i) => { const a = (-60 + 120 * i / (ticks.length - 1)) * Math.PI / 180; return `<text x="${(Math.sin(a) * 27).toFixed(1)}" y="${(-Math.cos(a) * 27 + 12).toFixed(1)}" font-size="8" text-anchor="middle" style="fill:#3b4565">${t}</text>`; }).join('')}<text y="26" font-size="13" font-weight="700" text-anchor="middle" style="fill:#c0392b">${unit}</text><g class="needle"><path d="M0 14 L0 -34" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round"/></g><circle cy="14" r="4" fill="#3b4565"/></g>`;
const scene = `
<path id="wire" d="${WIRE_D}" stroke="#7d8fbf" stroke-width="5" fill="none" stroke-linejoin="round"/>
<g id="electron-layer"></g>
<g id="supply"><rect x="36" y="44" width="200" height="106" rx="10" fill="#1d2440" stroke="#8f9bc4" stroke-width="2"/><rect x="52" y="58" width="112" height="46" rx="5" fill="#2a0c0c"/><text id="supply-v" x="156" y="94" text-anchor="end" font-size="34" font-family="monospace" style="fill:#ff4d4d" filter="url(#glow)">0.0</text><text x="186" y="94" font-size="16" class="muted">V</text><text x="136" y="124" font-size="11" text-anchor="middle" class="muted">디지털 전원 장치</text><circle cx="80" cy="150" r="7" fill="#222"/><circle cx="190" cy="150" r="7" fill="#d23"/><text x="80" y="140" font-size="11" text-anchor="middle" class="muted">−</text><text x="190" y="140" font-size="11" text-anchor="middle" class="muted">+</text></g>
<g id="switch" role="button" tabindex="0" aria-label="스위치"><rect x="262" y="186" width="78" height="28" rx="6" fill="#2a3150" stroke="#8f9bc4"/><circle cx="276" cy="200" r="5" fill="#cfd6ec"/><circle cx="326" cy="200" r="5" fill="#cfd6ec"/><path id="lever" d="M276 200 L326 200" stroke="#ffd166" stroke-width="5" stroke-linecap="round"/><text x="301" y="236" font-size="12" text-anchor="middle" class="muted">스위치</text></g>
${meter('ammeter', 440, 290, 'mA', 500, [0, '', 200, '', 400, ''])}
<text x="440" y="352" font-size="12" text-anchor="middle" class="muted">전류계</text>
<g id="voltmeter-group"><path d="M180 380 C180 340 230 320 240 300 M380 380 C380 340 330 320 320 300" stroke="#8f9bc4" stroke-width="2" fill="none" stroke-dasharray="4 3"/>${meter('voltmeter', 280, 290, 'V', 5, [0, 1, 2, 3, 4, 5])}<text x="280" y="352" font-size="12" text-anchor="middle" class="muted">전압계</text></g>
<g id="nichrome"><path id="coil" fill="none" stroke-width="5" stroke-linecap="round"/><path id="coil-glow" fill="none" stroke="#ff7a3c" stroke-width="10" opacity="0" filter="url(#glow-strong)"/></g>
<text id="coil-label" x="280" y="418" font-size="13" text-anchor="middle" class="object-name"></text>
<g id="material-slot" hidden><rect id="sample" x="200" y="370" width="160" height="20" rx="6"/><circle cx="200" cy="380" r="6" fill="#444"/><circle cx="360" cy="380" r="6" fill="#444"/></g>
<g id="bulb" hidden><circle id="bulb-glow" cx="60" cy="290" r="70" fill="url(#bulb-light)" opacity="0"/><circle cx="60" cy="290" r="20" fill="#ffffff22" stroke="#e8eef5" stroke-width="2"/><path id="filament" d="M51 300 l4 -12 l4 7 l4 -7 l4 12" stroke="#9a7a40" stroke-width="2" fill="none"/></g>
<g id="graph" transform="translate(520 60)">
  <rect x="-20" y="-24" width="270" height="356" rx="10" fill="#0f1730" stroke="#2c3966"/>
  <text x="115" y="-4" text-anchor="middle" font-size="13" font-weight="700">전압에 따른 전류의 세기</text>
  ${[0, 1, 2, 3, 4].map(v => `<line x1="${20 + v * 50}" y1="20" x2="${20 + v * 50}" y2="280" stroke="#26335c"/><text x="${20 + v * 50}" y="298" font-size="11" text-anchor="middle" class="muted">${v}</text>`).join('')}
  ${[0, 100, 200, 300, 400].map(i => `<line x1="20" y1="${280 - i * .6}" x2="220" y2="${280 - i * .6}" stroke="#26335c"/><text x="14" y="${284 - i * .6}" font-size="10" text-anchor="end" class="muted">${i}</text>`).join('')}
  <text x="120" y="318" font-size="11" text-anchor="middle" class="muted">전압(V)</text><text x="-6" y="12" font-size="11" class="muted">전류(mA)</text>
  <path id="line-long" fill="none" stroke="#ff7eb6" stroke-width="3" filter="url(#glow)"/><path id="line-short" fill="none" stroke="#ffd166" stroke-width="3" filter="url(#glow)"/>
  <g id="points"></g><g id="graph-fx"></g>
  <g transform="translate(36 34)"><rect width="10" height="4" y="-4" fill="#ff7eb6"/><text x="16" y="0" font-size="11">긴 니크롬선</text><rect width="10" height="4" y="12" fill="#ffd166"/><text x="16" y="16" font-size="11">짧은 니크롬선</text></g>
</g>
<g id="classify" transform="translate(520 60)" hidden>
  <rect x="-20" y="-24" width="270" height="356" rx="10" fill="#0f1730" stroke="#2c3966"/>
  <text x="115" y="-2" text-anchor="middle" font-size="13" font-weight="700">물질 분류하기</text>
  <text x="50" y="30" text-anchor="middle" font-size="13" style="fill:#ffd166">도체</text><text x="180" y="30" text-anchor="middle" font-size="13" style="fill:#9fb3ff">부도체</text>
  <line x1="115" y1="14" x2="115" y2="320" stroke="#2c3966"/>
  <g id="classified"></g>
</g>
<g id="fx"></g>`;

const lab = buildLab({
  crumb: '04 전압, 전류, 저항',
  title: '전압, 전류, 저항은 어떤 관계일까?',
  intro: '니크롬선에 걸리는 전압을 바꾸며 전류의 세기를 측정해 보세요.',
  tabs: [{ id: 'measure', label: '전압과 전류 측정' }, { id: 'material', label: '도체와 부도체' }],
  toggle: '전자 흐름 보기',
  sceneLabel: '전원 장치, 스위치, 전류계, 전압계, 니크롬선으로 이루어진 회로와 그래프',
  scene,
  terms,
  quiz: [
    { question: '전류의 흐름을 방해하는 정도를 무엇이라고 할까요?', options: [['resistance', '저항'], ['voltage', '전압'], ['current', '전류']], answer: 'resistance', hint: '긴 니크롬선과 짧은 니크롬선을 비교해 보세요.', right: '맞아요! 전기 저항이라고 하고, 단위는 Ω(옴)이에요.', wrong: '다시 생각해 볼까요? 같은 전압에서 전류가 덜 흐르게 하는 것은 무엇일까요?' },
    { question: '전압이 같을 때 저항이 크면 전류의 세기는?', options: [['small', '작아져요'], ['large', '커져요'], ['same', '같아요']], answer: 'small', hint: '같은 전압에서 두 니크롬선의 전류를 비교해 보세요.', right: '맞아요! 전류의 세기는 저항에 반비례해요.', wrong: '다시 생각해 볼까요? 저항이 더 큰 긴 니크롬선에 흐르는 전류를 떠올려 보세요.' },
    { question: '긴 니크롬선에 4 V를 걸었을 때 200 mA가 흘렀어요. 저항은?', options: [['20', '20 Ω'], ['800', '800 Ω'], ['005', '0.05 Ω']], answer: '20', hint: '200 mA = 0.2 A예요. R = V ÷ I', right: '맞아요! 4 V ÷ 0.2 A = 20 Ω이에요.', wrong: '다시 계산해 볼까요? 200 mA를 A 단위(0.2 A)로 바꾸어 R = V ÷ I를 이용해요.' },
  ],
});

/* ---------- 상태 ---------- */
let mode = 'measure', show = true, wire = 'long', voltage = 0, closed = false, closedTime = 0, warned = false, lastFrame = 0;
let material = 'copper', reading = 0, shownA = 0, shownV = 0, heat = 0;
const records = { long: {}, short: {} };
const tested = new Set();
let fresh = null;
let flow = null;

const electrons = new PathFlow($('#electron-layer'), $('#wire'), { count: 30, radius: 4, fill: '#2f9bff', glyph: ELECTRON_GLYPH });

// 니크롬선을 감은 모양. 긴 니크롬선은 감은 구간이 길어요.
function coilTurns(kind) {
  const [x0, x1] = kind === 'long' ? [170, 390] : [240, 320];
  const turns = kind === 'long' ? 22 : 8, w = (x1 - x0) / turns;
  let d = `M${x0} 380`;
  for (let i = 0; i < turns; i++) d += ` q${w / 2} -16 ${w} 0`;
  return d;
}
function current() {
  if (mode === 'measure') return currentMA(voltage, WIRES[wire].resistance, closed);
  return materialCurrentMA(material, closed);
}
function voltageShown() { return mode === 'measure' ? voltage : MATERIAL_VOLTAGE; }

/* ---------- 그리기 ---------- */
function paint(dt) {
  const target = current();
  const g = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 6);
  shownA += (target - shownA) * g;
  shownV += ((closed ? voltageShown() : 0) - shownV) * g;
  $('#ammeter .needle').setAttribute('transform', `translate(0 14) rotate(${needleAngle(shownA, 500).toFixed(1)}) translate(0 -14)`);
  $('#voltmeter .needle').setAttribute('transform', `translate(0 14) rotate(${needleAngle(shownV, 5).toFixed(1)}) translate(0 -14)`);
  setText('#supply-v', voltageShown().toFixed(1));
  $('#lever').setAttribute('d', closed ? 'M276 200 L326 200' : 'M276 200 L318 176');
  // 전자는 (−)단자에서 나와 회로를 돌아 (+)단자로 들어가요. 전류가 셀수록 빨리 움직이게 나타냈어요.
  electrons.step(dt, -target / 400 * .12, target ? .8 : 2);
  electrons.visible(show);
  heat = closed && target ? Math.min(1, heat + dt / HEAT_SECONDS) : Math.max(0, heat - dt / 3);
  $('#coil-glow').setAttribute('opacity', (mode === 'measure' ? heat * .9 : 0).toFixed(2));
  $('#coil').setAttribute('stroke', mode === 'measure' ? (heat > .6 ? '#ffb38a' : '#c9b48a') : '#7d8fbf');
  const lit = mode === 'material' ? target / 300 : 0;
  $('#bulb-glow').setAttribute('opacity', lit.toFixed(2));
  $('#filament').setAttribute('stroke', lit > .3 ? '#fff6c8' : '#9a7a40');
  $('#filament').setAttribute('filter', lit > .3 ? 'url(#glow)' : '');
  if (closed) {
    closedTime += dt;
    if (mode === 'measure' && closedTime > HEAT_SECONDS && !warned) { warned = true; toast('🔥 니크롬선이 뜨거워져요! 값을 읽은 뒤 스위치를 열어요'); }
  }
}
function paintGraph() {
  const pts = [];
  for (const kind of ['long', 'short']) {
    const vs = Object.keys(records[kind]).map(Number).sort((a, b) => a - b);
    const xy = v => [20 + v * 50, 280 - records[kind][v] * .6];
    $(`#line-${kind}`).setAttribute('d', vs.length > 1 ? 'M' + vs.map(v => xy(v).join(' ')).join(' L') : '');
    for (const v of vs) { const [x, y] = xy(v); pts.push(`<circle cx="${x}" cy="${y}" r="5.5" fill="${kind === 'long' ? '#ff7eb6' : '#ffd166'}" stroke="#fff" stroke-width="1.5"/>`); }
  }
  setHTML('#points', pts.join(''));
}
function paintClassify() {
  const list = [...tested];
  const col = c => list.filter(k => MATERIALS[k].conductor === c).map((k, i) => `<g transform="translate(${c ? 50 : 180} ${62 + i * 46})"><rect x="-48" y="-16" width="96" height="30" rx="15" fill="${MATERIALS[k].color}" opacity=".9"/><text y="4" text-anchor="middle" font-size="12" style="fill:#1b1f2e;font-weight:700">${MATERIALS[k].label}</text></g>`).join('');
  setHTML('#classified', col(true) + col(false));
}
function renderTable() {
  const cell = (kind, v) => {
    const val = v === 0 ? 0 : records[kind][v];
    const cls = fresh && fresh[0] === kind && fresh[1] === v ? ' class="fresh"' : '';
    return `<td${cls}>${val ?? ''}</td>`;
  };
  return `<table class="data-table"><tr><th>전압(V)</th>${VOLTAGES.map(v => `<th>${v}</th>`).join('')}</tr>${Object.entries(WIRES).map(([k, w]) => `<tr><th>${w.label}<br><small>전류(mA)</small></th>${VOLTAGES.map(v => cell(k, v)).join('')}</tr>`).join('')}</table>`;
}

/* ---------- 문구와 조작 ---------- */
function renderControls() {
  if (mode === 'measure') {
    $('#controls').innerHTML = `<div role="group" aria-label="니크롬선"><span class="group-label">니크롬선</span>${Object.entries(WIRES).map(([k, w]) => `<button data-wire="${k}" aria-pressed="${k === wire}">${w.label}</button>`).join('')}</div><div role="group" aria-label="전압 조절"><span class="group-label">전압</span><button id="v-down" ${voltage <= 0 ? 'disabled' : ''}>− 1 V</button><button id="v-up" ${voltage >= MAX_VOLTAGE ? 'disabled' : ''}>+ 1 V</button></div>`;
    $('#actions').innerHTML = `<button id="switch-btn" class="secondary">${closed ? '스위치 열기' : '스위치 닫기'}</button><button id="record-btn" class="primary" ${closed && voltage > 0 ? '' : 'disabled'}>측정값 기록하기</button>`;
    $$('[data-wire]').forEach(b => b.onclick = () => { wire = b.dataset.wire; closed = false; voltage = 0; renderControls(); });
    $('#v-down').onclick = () => { voltage = Math.max(0, voltage - 1); renderControls(); };
    $('#v-up').onclick = () => { voltage = Math.min(MAX_VOLTAGE, voltage + 1); renderControls(); };
    $('#record-btn').onclick = record;
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="연결할 물질"><span class="group-label">연결할 물질</span>${Object.entries(MATERIALS).map(([k, m]) => `<button data-material="${k}" aria-pressed="${k === material}">${m.label}</button>`).join('')}</div>`;
    $('#actions').innerHTML = `<button id="switch-btn" class="primary">${closed ? '스위치 열기' : '스위치 닫기'}</button>`;
    $$('[data-material]').forEach(b => b.onclick = () => { material = b.dataset.material; closed = false; renderControls(); });
  }
  $('#switch-btn').onclick = toggleSwitch;
  $('#coil').setAttribute('d', mode === 'measure' ? coilTurns(wire) : '');
  $('#coil-glow').setAttribute('d', mode === 'measure' ? coilTurns(wire) : '');
  setText('#coil-label', mode === 'measure' ? WIRES[wire].label : MATERIALS[material].label);
  $('#sample').setAttribute('fill', MATERIALS[material].color);
  renderText();
}
function toggleSwitch() {
  closed = !closed; closedTime = 0; warned = false;
  if (closed && mode === 'material') {
    const isNew = !tested.has(material);
    tested.add(material); paintClassify();
    if (isNew) { burst($('#fx'), MATERIALS[material].conductor ? 570 : 700, 140, MATERIALS[material].conductor ? '#ffd166' : '#9fb3ff'); toast(MATERIALS[material].conductor ? `💡 ${MATERIALS[material].label}: 전류가 잘 흘러요` : `🚫 ${MATERIALS[material].label}: 전류가 흐르지 않아요`); }
  }
  renderControls();
}
function record() {
  if (!closed || voltage === 0) return;
  const value = currentMA(voltage, WIRES[wire].resistance);
  const isNew = records[wire][voltage] === undefined;
  records[wire][voltage] = value; fresh = [wire, voltage];
  paintGraph();
  burst($('#graph-fx'), 20 + voltage * 50, 280 - value * .6, wire === 'long' ? '#ff7eb6' : '#ffd166');
  if (isNew && [1, 2, 3, 4].every(v => records[wire][v] !== undefined)) toast(`📈 ${WIRES[wire].label} 측정 완료!`);
  renderText();
}
function renderText() {
  const I = current();
  if (mode === 'measure') {
    setText('#guide', '전압을 1 V씩 높이면서 니크롬선에 흐르는 전류의 세기를 측정해 보세요.');
    setText('#subguide', '전압을 맞추고 → 스위치를 닫아 값을 읽고 → 기록한 뒤 → 스위치를 열어요. 짧은 니크롬선으로 바꾸어 반복해요.');
    setText('#stage-state', `${WIRES[wire].label} · 전압 ${voltage} V · 스위치 ${closed ? '닫힘' : '열림'}`);
    setText('#note-title', closed ? `전류계: ${I} mA` : '스위치를 닫아 전류를 측정해요');
    setText('#note-text', '전압이 2배, 3배가 될 때 전류의 세기는 어떻게 변하나요? 두 니크롬선의 그래프를 비교해 보세요.');
    setHTML('#readout', renderTable());
    setText('#model-note', '측정값은 지도서의 실험 결과와 같은 값을 사용했어요(긴 니크롬선 1 V당 50 mA, 짧은 니크롬선 1 V당 100 mA). 실제 실험에서는 니크롬선이 뜨거워지면 값이 조금씩 달라질 수 있어요. 전자의 수와 빠르기는 보기 쉽게 나타냈어요.');
    setText('#discovery', '1 A = 1000 mA예요.');
  } else {
    const m = MATERIALS[material];
    setText('#guide', '여러 가지 물질을 회로에 연결하고 전구에 불이 켜지는지 확인해 보세요.');
    setText('#subguide', `전압은 ${MATERIAL_VOLTAGE} V로 고정했어요. 물질을 고르고 스위치를 닫아 보세요.`);
    setText('#stage-state', `${m.label} · 스위치 ${closed ? '닫힘' : '열림'}`);
    setText('#note-title', closed ? (I ? '전구에 불이 켜졌어요' : '전구에 불이 켜지지 않아요') : '스위치를 닫아 보세요');
    setText('#note-text', '전류가 잘 흐르는 물질과 잘 흐르지 않는 물질로 나누어 보세요.');
    setHTML('#readout', `<div class="readout-grid"><div class="readout-card"><strong>전류계</strong><b>${I} mA</b><small>${m.label}</small></div><div class="readout-card"><strong>확인한 물질</strong><b>${tested.size}개</b><small>도체 ${[...tested].filter(k => MATERIALS[k].conductor).length} · 부도체 ${[...tested].filter(k => !MATERIALS[k].conductor).length}</small></div></div>`);
    setText('#model-note', '물질마다 원자 배열이 달라 저항의 크기가 달라요. 이 활동에서는 전구가 켜지는지로 도체와 부도체를 구분하도록 단순하게 나타냈어요.');
    setText('#discovery', '반도체는 평소에는 부도체와 비슷하지만, 특정 조건에서 도체처럼 전류가 잘 흘러요.');
  }
}
function setMode(next) {
  mode = next; lab.selectTab(next); closed = false; closedTime = 0; warned = false;
  const m = next === 'measure';
  $('#voltmeter-group').toggleAttribute('hidden', !m);
  $('#graph').toggleAttribute('hidden', !m);
  $('#classify').toggleAttribute('hidden', m);
  $('#material-slot').toggleAttribute('hidden', m);
  $('#bulb').toggleAttribute('hidden', m);
  renderControls();
}
function resetScene() {
  voltage = 0; closed = false; wire = 'long'; material = 'copper'; heat = 0; fresh = null;
  records.long = {}; records.short = {}; tested.clear(); paintGraph(); paintClassify(); setMode(mode);
}
$('#tab-measure').onclick = () => setMode('measure');
$('#tab-material').onclick = () => setMode('material');
$('#reset').onclick = resetScene;
$('#show-detail').checked = true;
$('#show-detail').onchange = e => { show = e.target.checked; };
$('#switch').onclick = toggleSwitch;
$('#switch').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSwitch(); } };

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    paint(dt);
    const full = kind => [1, 2, 3, 4].every(v => records[kind][v] !== undefined);
    const tc = [...tested];
    flow?.update(checklist([
      ['긴 니크롬선: 1~4 V에서 전류 기록하기', full('long')],
      ['짧은 니크롬선: 1~4 V에서 전류 기록하기', full('short')],
      ['도체와 부도체를 두 가지씩 확인하기', tc.filter(k => MATERIALS[k].conductor).length >= 2 && tc.filter(k => !MATERIALS[k].conductor).length >= 2],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '니크롬선에 걸리는 전압을<br>2배, 3배로 높이면?',
    lead: '전원 장치, 스위치, 전류계, 전압계, 니크롬선을 연결한 회로예요.<br>전압을 1 V씩 높이면서 전류의 세기를 측정할 거예요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="전원 장치와 니크롬선 회로"><rect width="520" height="250" rx="12" fill="#121a33"/><rect x="30" y="30" width="150" height="80" rx="8" fill="#1d2440" stroke="#8f9bc4"/><text x="105" y="84" text-anchor="middle" font-size="34" font-family="monospace" fill="#ff4d4d">2.0</text><path d="M60 110 V200 H460 V110 H150" stroke="#7d8fbf" stroke-width="4" fill="none"/><path d="M200 200 ${Array.from({ length: 14 }, () => 'q6 -14 12 0').join(' ')}" stroke="#c9b48a" stroke-width="4" fill="none"/><circle cx="420" cy="110" r="30" fill="#f4f1e8"/><text x="420" y="122" text-anchor="middle" font-size="13" fill="#c0392b">mA</text><text x="290" y="235" text-anchor="middle" fill="#aab4d6" font-size="13">니크롬선</text></svg>`,
    question: '전압을 2배, 3배로 높이면 니크롬선에 흐르는 전류의 세기는 어떻게 될까요?',
    choices: ['전류의 세기도 2배, 3배로 커질 것 같아요.', '전류의 세기가 커지지만 일정한 규칙은 없을 것 같아요.', '전류의 세기는 변하지 않을 것 같아요.', '전류의 세기가 작아질 것 같아요.', '아직 잘 모르겠어요.'],
    placeholder: '선풍기 바람 세기 버튼이나 수로 모형에서 펌프의 역할을 떠올려 보세요.',
  },
  observe: {
    title: '전압을 바꾸며 전류를 측정하고, 여러 물질을 연결해 보세요.',
    recordLabel: '두 니크롬선의 그래프에서 찾은 공통점과 차이점, 도체와 부도체로 나눈 결과를 적어 보세요.',
    placeholder: '전압이 2배가 될 때 전류는 어떻게 변했는지, 같은 전압에서 두 니크롬선의 전류는 어떻게 달랐는지 적어 보세요.',
  },
  explain: {
    question: '전압과 전류 사이에는 어떤 관계가 있나요? 같은 전압에서 니크롬선의 길이에 따라 전류의 세기가 달라진 까닭도 설명해 보세요.',
    concepts: [
      ['전압과 전류', '니크롬선에 걸리는 전압을 2배, 3배로 높이면 전류의 세기도 2배, 3배가 돼요. 전류의 세기는 전압에 비례해요.'],
      ['전기 저항', '같은 전압에서도 니크롬선의 길이에 따라 전류의 세기가 달라요. 전류의 흐름을 방해하는 정도를 <b>전기 저항</b>이라고 하고, 단위는 <b>Ω(옴)</b>을 사용해요. 긴 니크롬선의 저항이 더 커서 전류가 더 약하게 흘러요.'],
      ['옴의 법칙', '전류의 세기는 전압에 비례하고 저항에 반비례해요. 이를 <b>옴의 법칙</b>이라고 해요. 전류의 세기(I) = 전압(V) ÷ 전기 저항(R)'],
      ['측정 결과로 저항 구하기', '긴 니크롬선: 2 V ÷ 0.1 A = 20 Ω, 짧은 니크롬선: 2 V ÷ 0.2 A = 10 Ω이에요.'],
      ['도체, 부도체, 반도체', '구리나 철같이 저항이 작아 전류가 잘 흐르는 물질은 <b>도체</b>, 고무나 나무같이 저항이 커 전류가 잘 흐르지 않는 물질은 <b>부도체</b>예요. <b>반도체</b>는 특정한 조건에서 도체처럼 전류가 잘 흘러요.'],
    ],
    note: '실험에서는 스위치를 오래 닫아 두면 니크롬선이 뜨거워져 저항값이 달라질 수 있어요. 값을 읽은 뒤에는 스위치를 바로 열어요.',
  },
  onRestart: () => { show = true; $('#show-detail').checked = true; lab.resetQuiz(); mode = 'measure'; resetScene(); },
});
setMode('measure');
requestAnimationFrame(frame);
