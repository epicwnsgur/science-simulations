import './style.css';
import './poe.css';
import './lab.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, PathFlow, ELECTRON_GLYPH, reducedMotion } from './src/lab-shell.js';

// 교과서 242–243쪽, 지도서 552–557쪽(4차시).
// 마찰 전기로 네온전구를 순간적으로 켜고, 전지를 연결한 회로와 수로 모형을 비교합니다.
// 지도상 유의점: 전류의 방향((+)→(−))은 약속이며 실제로는 전자가 (−)극에서 (+)극으로 이동합니다.
// 수로 모형은 전류를 완벽하게 나타내지 못합니다. 전구를 지나도 전자는 사라지지 않습니다.

const MIN_RUBS_TO_LIGHT = 3, MAX_RUBS = 5, PER_RUB = 2;
const A = { x: 230, y: 318 }, B = { x: 570, y: 318 };
const BULB = { x: 400, y: 222 };
const TIP_FREE = { x: 468, y: 276 }, TIP_TOUCH = { x: 490, y: 310 };
const terms = [
  ['전류', '전하의 흐름이에요. 단위는 A(암페어)를 사용해요.'],
  ['전압', '전류를 흐르게 하는 능력이에요. 단위는 V(볼트)를 사용해요.'],
  ['전류의 방향', '전지의 (+)극에서 (−)극 쪽으로 흐른다고 정했어요. 전자의 존재를 알기 전에 정한 약속이에요.'],
  ['전자의 이동 방향', '전자는 전지의 (−)극에서 (+)극 쪽으로 이동해요. 전류의 방향과 반대예요.'],
  ['수로 모형', '눈에 보이지 않는 전류를 물의 흐름에 비유한 모형이에요. 펌프는 전지, 물레방아는 전구, 물의 높이 차는 전압에 해당해요.'],
  ['마찰 전기', '두 물체를 마찰할 때 전자가 이동하여 생기는 전기예요.'],
];

const scene = `
<g id="neon-scene">
  <ellipse cx="400" cy="372" rx="330" ry="16" fill="#000" opacity=".25"/>
  <g id="plastic"><ellipse cx="${A.x}" cy="352" rx="120" ry="26" fill="#eef3f8" stroke="#b9c6d4" stroke-width="2"/><ellipse cx="${A.x}" cy="346" rx="96" ry="18" fill="#dfe7ef"/></g>
  <g id="fur"><ellipse cx="${B.x}" cy="350" rx="125" ry="30" fill="#7a5532"/><path d="${Array.from({ length: 26 }, (_, i) => { const x = B.x - 112 + i * 9; return `M${x} 338 q4 -12 8 0`; }).join('')}" stroke="#a87b4f" stroke-width="3" fill="none"/></g>
  <text class="muted" x="${A.x}" y="404" text-anchor="middle" font-size="13">플라스틱 접시</text>
  <text class="muted" x="${B.x}" y="404" text-anchor="middle" font-size="13">털가죽</text>
  <g id="plate-b"><rect x="${B.x - 6}" y="200" width="12" height="104" rx="5" fill="#7cc7ff" opacity=".85"/><ellipse cx="${B.x}" cy="${B.y}" rx="98" ry="22" fill="#c9d1d9" stroke="#eef2f6" stroke-width="2"/><ellipse cx="${B.x}" cy="${B.y - 4}" rx="76" ry="13" fill="#aeb8c2"/></g>
  <g id="plate-a"><rect x="${A.x - 6}" y="200" width="12" height="104" rx="5" fill="#7cc7ff" opacity=".85"/><ellipse cx="${A.x}" cy="${A.y}" rx="98" ry="22" fill="#c9d1d9" stroke="#eef2f6" stroke-width="2"/><ellipse cx="${A.x}" cy="${A.y - 4}" rx="76" ry="13" fill="#aeb8c2"/>
    <path id="lead-a" d="M318 312 C334 266 352 228 ${BULB.x - 30} ${BULB.y}" stroke="#d8dde3" stroke-width="2.5" fill="none"/>
    <g id="neon"><ellipse id="neon-glow" cx="${BULB.x}" cy="${BULB.y}" rx="70" ry="42" fill="#ff6a1f" opacity="0" filter="url(#glow-strong)"/><rect x="${BULB.x - 30}" y="${BULB.y - 13}" width="60" height="26" rx="13" fill="#ffffff22" stroke="#e8eef5" stroke-width="2"/><rect x="${BULB.x - 18}" y="${BULB.y - 4}" width="14" height="8" rx="2" fill="#9aa4ae"/><rect x="${BULB.x + 4}" y="${BULB.y - 4}" width="14" height="8" rx="2" fill="#9aa4ae"/><rect id="neon-gas" x="${BULB.x - 26}" y="${BULB.y - 9}" width="52" height="18" rx="9" fill="#ffb070" opacity="0" filter="url(#glow)"/></g>
    <path id="lead-b" stroke="#d8dde3" stroke-width="2.5" fill="none"/>
    <circle id="lead-tip" r="4" fill="#eef2f6"/>
    <text class="object-name" x="${BULB.x}" y="${BULB.y - 30}" text-anchor="middle">네온전구</text>
  </g>
  <path id="discharge-path" fill="none" stroke="none" d="M${A.x} ${A.y - 6} L318 312 C334 266 352 228 ${BULB.x - 30} ${BULB.y} L${BULB.x + 30} ${BULB.y} C${BULB.x + 50} ${BULB.y + 4} ${TIP_TOUCH.x - 10} ${TIP_TOUCH.y - 30} ${TIP_TOUCH.x} ${TIP_TOUCH.y} L${B.x} ${B.y - 6}"/>
  <g id="neon-charges"></g><g id="neon-fx"></g>
</g>
<g id="circuit-scene" hidden>
  <text class="object-name" x="210" y="54" text-anchor="middle">전기 회로</text>
  <text class="object-name" x="600" y="54" text-anchor="middle">수로 모형</text>
  <path id="wire" d="M180 372 H60 V110 H360 V372 H240" stroke="#c08a4a" stroke-width="10" fill="none" stroke-linejoin="round" opacity=".55"/>
  <g id="ions"></g>
  <g id="battery"><rect x="176" y="358" width="68" height="28" rx="6" fill="#2a3150" stroke="#8f9bc4"/><rect id="cell" x="180" y="361" width="60" height="22" rx="4" fill="url(#copper)"/><text id="cell-minus" x="168" y="378" text-anchor="middle" font-size="16" font-weight="700">−</text><text id="cell-plus" x="254" y="378" text-anchor="middle" font-size="16" font-weight="700">+</text></g>
  <path id="bridge" d="M180 372 H240" stroke="#c08a4a" stroke-width="10" opacity=".55"/>
  <text class="muted" x="210" y="410" text-anchor="middle" font-size="12" id="battery-label">전지</text>
  <g id="bulb"><circle id="bulb-glow" cx="210" cy="104" r="62" fill="url(#bulb-light)" opacity="0"/><circle cx="210" cy="96" r="22" fill="#ffffff18" stroke="#e8eef5" stroke-width="2"/><path id="filament" d="M200 110 l4 -14 l4 8 l4 -8 l4 14" stroke="#ffd36b" stroke-width="2" fill="none"/><rect x="198" y="112" width="24" height="10" fill="#8f9bc4"/></g>
  <g id="electron-layer"></g>
  <g id="direction" opacity="0"><path d="M92 320 V170" stroke="#5cc8ff" stroke-width="4" marker-end="url(#arrow-head)"/><path d="M118 170 V320" stroke="#ff9f43" stroke-width="4" marker-end="url(#arrow-head)"/><text x="136" y="236" font-size="13" fill="#9fdcff">↑ 전자의 이동 방향</text><text x="136" y="258" font-size="13" fill="#ffc48a">↓ 전류의 방향</text></g>
  <text id="bulb-count" x="236" y="306" text-anchor="middle" font-size="12" class="muted"></text>
  <path id="water-path" d="M450 250 A150 105 0 0 1 750 250 A150 105 0 0 1 450 250" stroke="#2d7fc1" stroke-width="30" fill="none" opacity=".35"/>
  <path d="M450 250 A150 105 0 0 1 750 250 A150 105 0 0 1 450 250" stroke="#8fd3ff" stroke-width="2" fill="none" opacity=".35"/>
  <g id="water-layer"></g>
  <g id="pump" transform="translate(450 250)"><rect x="-26" y="-24" width="52" height="48" rx="8" fill="#3d4a78" stroke="#8f9bc4"/><g id="impeller"><path d="M0 -15 L4 0 L0 15 L-4 0Z M-15 0 L0 -4 L15 0 L0 4Z" fill="#cfe3ff"/></g></g>
  <text class="muted" x="450" y="302" text-anchor="middle" font-size="12">펌프</text>
  <g id="lift" opacity="0"><rect x="494" y="168" width="14" height="70" rx="4" fill="#4fc3ff" opacity=".7"/><path d="M516 168 H530 M516 238 H530 M523 172 V234" stroke="#ffd166" stroke-width="2" marker-start="url(#arrow-head)" marker-end="url(#arrow-head)"/><text x="540" y="208" font-size="12" fill="#ffd166">물의 높이 차</text></g>
  <g id="wheel" transform="translate(750 250)"><circle r="34" fill="none" stroke="#c9a77c" stroke-width="4"/><g id="paddles">${Array.from({ length: 8 }, (_, i) => `<rect x="-3" y="-44" width="6" height="18" fill="#c9a77c" transform="rotate(${i * 45})"/>`).join('')}<circle r="6" fill="#c9a77c"/></g></g>
  <text class="muted" x="750" y="304" text-anchor="middle" font-size="12">물레방아</text>
</g>`;

const lab = buildLab({
  crumb: '03 전류와 전압',
  title: '전하가 움직이면?',
  intro: '마찰 전기로 네온전구를 켜 보고, 전기 회로와 수로 모형을 비교해 보세요.',
  tabs: [{ id: 'neon', label: '네온전구 켜기' }, { id: 'circuit', label: '전기 회로와 수로 모형' }],
  toggle: '전하·방향 보기',
  sceneLabel: '마찰 전기로 네온전구를 켜고 전기 회로와 수로 모형을 비교하는 실험 공간',
  scene,
  legend: '<span><b class="negative">−</b> 전자</span><span><b class="positive">+</b> (+)전하</span>',
  terms,
  quiz: [
    { question: '전하의 흐름을 무엇이라고 할까요?', options: [['current', '전류'], ['electron', '전자'], ['voltage', '전압']], answer: 'current', hint: '242–243쪽 활동을 떠올려 보세요.', right: '맞아요! 전하의 흐름을 전류라고 하고, 단위는 A(암페어)예요.', wrong: '다시 생각해 볼까요? 네온전구를 지나간 것은 전하의 흐름이었어요.' },
    { question: '전기 회로에서 전류를 계속 흐르게 하는 능력은?', options: [['voltage', '전압'], ['current', '전류'], ['bulb', '전구']], answer: 'voltage', hint: '수로 모형에서 펌프가 만드는 것을 떠올려 보세요.', right: '맞아요! 전압은 전류를 흐르게 하는 능력이고, 단위는 V(볼트)예요.', wrong: '다시 생각해 볼까요? 펌프가 물의 높이 차를 만들어 물이 계속 흐르는 것처럼, 전지는 무엇을 만들까요?' },
    { question: '전지를 연결한 회로에서 전자는 어느 쪽으로 이동할까요?', options: [['minus-plus', '(−)극 → (+)극'], ['plus-minus', '(+)극 → (−)극'], ['none', '이동하지 않아요']], answer: 'minus-plus', hint: '‘전하·방향 보기’로 확인해 보세요.', right: '맞아요! 전자는 (−)극에서 (+)극으로 이동하고, 전류의 방향은 그 반대로 정했어요.', wrong: '다시 생각해 볼까요? (+)극→(−)극은 약속으로 정한 전류의 방향이에요.' },
  ],
});

/* ---------- 상태 ---------- */
let mode = 'neon', show = false;
let rubs = 0, placed = false, touching = false, charge = 0, discharged = false, motion = null, flight = null, flash = 0;
let battery = false, pump = false, batteryTime = 0, pumpTime = 0, lastFrame = 0;
let inCount = 0, outCount = 0, wheelAngle = 0, impellerAngle = 0, bulbLevel = 0;
const seen = { lit: false, noLight: false, battery: false, pump: false };
let flow = null;

const ions = $('#ions');
const wirePath = $('#wire');
{
  const len = wirePath.getTotalLength();
  ions.innerHTML = Array.from({ length: 22 }, (_, i) => { const p = wirePath.getPointAtLength((i + .5) / 22 * len); return `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="5" fill="#e84444" opacity=".85"/><path d="M-2.6 0H2.6M0 -2.6V2.6" stroke="#fff" stroke-width="1.3"/></g>`; }).join('');
}
const electrons = new PathFlow($('#electron-layer'), wirePath, { count: 22, radius: 4.2, fill: '#2f9bff', glyph: ELECTRON_GLYPH });
const water = new PathFlow($('#water-layer'), $('#water-path'), { count: 26, radius: 4.5, fill: '#7fd6ff' });
const WIRE_LEN = wirePath.getTotalLength();
const U_IN = (120 + 262 + (188 - 60)) / WIRE_LEN, U_OUT = (120 + 262 + (232 - 60)) / WIRE_LEN;

/* ---------- 네온전구 ---------- */
function plateOffset() { return placed ? 0 : -130; }
function tipPoint() { return touching ? TIP_TOUCH : TIP_FREE; }
function chargeTokens() {
  // 대전된 만큼 남는 전하만 나타냅니다. 마찰 후 플라스틱 접시 쪽은 (−), 털가죽 쪽은 (+)전하를 띱니다.
  if (!show) return '';
  const tokens = [];
  const n = flight ? 0 : charge;
  const baseA = placed ? A.y - 8 : 344, baseB = placed ? B.y - 8 : 344;
  for (let k = 0; k < n; k++) {
    const dx = -56 + (k % 5) * 28, dy = Math.floor(k / 5) * 13;
    tokens.push(`<g transform="translate(${A.x + dx} ${baseA + dy})"><circle r="5.5" fill="#2f9bff"/><path d="M-2.6 0H2.6" stroke="#fff" stroke-width="1.5"/></g>`);
    tokens.push(`<g transform="translate(${B.x + dx} ${baseB + dy})"><circle r="6.5" fill="#e84444"/><path d="M-3 0H3M0 -3V3" stroke="#fff" stroke-width="1.5"/></g>`);
  }
  return tokens.join('');
}
function paintNeon(now) {
  const off = plateOffset(), tip = tipPoint();
  $('#plate-a').setAttribute('transform', `translate(0 ${off})`);
  $('#plate-b').setAttribute('transform', `translate(0 ${off})`);
  $('#lead-b').setAttribute('d', `M${BULB.x + 30} ${BULB.y} C${BULB.x + 50} ${BULB.y + 4} ${tip.x - 10} ${tip.y - 30} ${tip.x} ${tip.y}`);
  $('#lead-tip').setAttribute('cx', tip.x); $('#lead-tip').setAttribute('cy', tip.y);
  const furShift = motion?.kind === 'rub' ? Math.sin(Math.min(1, (now - motion.start) / motion.duration) * Math.PI) * -(B.x - A.x - 40) : 0;
  $('#fur').setAttribute('transform', `translate(${furShift} ${furShift ? -18 : 0})`);
  $('#neon-gas').setAttribute('opacity', (flash * .95).toFixed(2));
  $('#neon-glow').setAttribute('opacity', Math.min(1, flash * 1.3).toFixed(2));
  let html = chargeTokens();
  if (flight && show !== null) {
    const path = $('#discharge-path'), len = path.getTotalLength();
    const t = Math.min(1, (now - flight.start) / flight.duration);
    for (let k = 0; k < flight.count; k++) {
      const u = Math.min(1, Math.max(0, t * 1.4 - k / flight.count * .4));
      const p = path.getPointAtLength(u * len);
      html += `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="5" fill="#5cc8ff" filter="url(#glow)"/><path d="M-2.4 0H2.4" stroke="#fff" stroke-width="1.4"/></g>`;
    }
  }
  setHTML('#neon-charges', html);
}
function stepNeon(now, dt) {
  if (motion && now - motion.start >= motion.duration) { const done = motion.done; motion = null; done?.(); }
  if (flight && now - flight.start >= flight.duration) { flight = null; }
  flash = Math.max(0, flash - dt * .75);
}
function rub() {
  if (placed || motion || rubs >= MAX_RUBS) return;
  motion = { kind: 'rub', start: performance.now(), duration: reducedMotion.matches ? 1 : 700, done: () => { rubs++; charge = rubs * PER_RUB; discharged = false; renderControls(); } };
  renderControls();
}
function togglePlates() {
  if (motion) return;
  placed = !placed; touching = false; renderControls();
}
function touch() {
  if (!placed || motion) return;
  touching = !touching;
  if (touching) {
    if (charge > 0) {
      const count = charge, lights = rubs >= MIN_RUBS_TO_LIGHT;
      flight = { start: performance.now(), duration: reducedMotion.matches ? 1 : 650, count };
      const firstLight = lights && !seen.lit;
      if (lights) seen.lit = true;
      setTimeout(() => {
        if (lights) {
          flash = 1; burst($('#neon-fx'), BULB.x, BULB.y, '#ffb36b', 18);
          if (firstLight) toast('✨ 네온전구에 불이 켜졌어요!');
        } else toast('불빛이 보이지 않아요. 더 여러 번 문질러 볼까요?');
      }, reducedMotion.matches ? 0 : 420);
      charge = 0; discharged = true;
    } else if (discharged) {
      if (!seen.noLight && seen.lit) { seen.noLight = true; toast('🔍 다시 대니 불이 켜지지 않아요'); }
    }
  }
  renderControls();
}

/* ---------- 전기 회로와 수로 모형 ---------- */
function stepCircuit(now, dt) {
  const before = electrons.offset;
  bulbLevel += ((battery ? 1 : 0) - bulbLevel) * (reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 5));
  electrons.step(dt, battery ? .045 : 0, battery ? 1.2 : 2.6);
  // 전구로 들어간 전자와 나온 전자를 셉니다. 전구를 지나도 전자는 사라지지 않아요.
  if (battery) {
    const n = electrons.dots.length, after = electrons.offset;
    for (let i = 0; i < n; i++) {
      const u0 = ((i + .5) / n + before) % 1, u1 = ((i + .5) / n + after) % 1;
      const crossed = (a, b, x) => (a <= x && b > x) || (a > b && (x >= a || x < b));
      if (crossed(u0, u1, U_IN)) inCount++;
      if (crossed(u0, u1, U_OUT)) outCount++;
    }
    batteryTime += dt;
    if (batteryTime > 1.5 && !seen.battery) { seen.battery = true; toast('💡 전자가 한 방향으로 이동해요'); }
  }
  water.step(dt, pump ? .07 : 0, 0);
  if (pump) {
    wheelAngle += dt * 140; impellerAngle += dt * 520; pumpTime += dt;
    if (pumpTime > 1.5 && !seen.pump) { seen.pump = true; toast('🌊 물이 흐르며 물레방아가 돌아요'); }
  }
  $('#paddles').setAttribute('transform', `rotate(${wheelAngle.toFixed(1)})`);
  $('#impeller').setAttribute('transform', `rotate(${impellerAngle.toFixed(1)})`);
  $('#lift').setAttribute('opacity', pump ? 1 : 0);
  $('#bulb-glow').setAttribute('opacity', bulbLevel.toFixed(2));
  $('#filament').setAttribute('stroke', bulbLevel > .3 ? '#fff6c8' : '#9a7a40');
  $('#filament').setAttribute('filter', bulbLevel > .3 ? 'url(#glow)' : '');
  $('#direction').setAttribute('opacity', show && battery ? 1 : 0);
  $('#ions').style.display = show ? '' : 'none';
  ['#cell', '#cell-minus', '#cell-plus'].forEach(s => $(s).style.display = battery ? '' : 'none');
  $('#bridge').style.display = battery ? 'none' : '';
  setText('#battery-label', battery ? '전지 연결됨' : '전지가 없는 회로');
  setText('#bulb-count', battery ? `전구로 들어간 전자 ${inCount} · 나온 전자 ${outCount} · 전구를 지나는 중 ${inCount - outCount}` : '');
}

/* ---------- 화면 문구와 조작 ---------- */
function renderControls() {
  if (mode === 'neon') {
    $('#controls').innerHTML = `<p>털가죽과 문지른 플라스틱 접시는 (−)전하, 털가죽은 (+)전하를 띠어요. 문지른 횟수: <b>${rubs}번</b></p>`;
    $('#actions').innerHTML = `<button id="rub-btn" class="secondary" ${placed || motion || rubs >= MAX_RUBS ? 'disabled' : ''}>털가죽으로 접시 문지르기</button><button id="place-btn" class="secondary" ${motion ? 'disabled' : ''}>${placed ? '알루미늄 접시 들기' : '알루미늄 접시 올려놓기'}</button><button id="touch-btn" class="primary" ${placed ? '' : 'disabled'}>${touching ? '네온전구 떼기' : '네온전구 끝을 접시에 대기'}</button>`;
    $('#rub-btn').onclick = rub; $('#place-btn').onclick = togglePlates; $('#touch-btn').onclick = touch;
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="전기 회로"><span class="group-label">전기 회로</span><button id="battery-btn" aria-pressed="${battery}">${battery ? '전지 빼기' : '전지 연결하기'}</button></div><div role="group" aria-label="수로 모형"><span class="group-label">수로 모형</span><button id="pump-btn" aria-pressed="${pump}">${pump ? '펌프 멈추기' : '펌프 작동하기'}</button></div>`;
    $('#actions').innerHTML = '';
    $('#battery-btn').onclick = () => { battery = !battery; batteryTime = 0; renderControls(); };
    $('#pump-btn').onclick = () => { pump = !pump; pumpTime = 0; renderControls(); };
  }
  renderText();
}
function renderText() {
  if (mode === 'neon') {
    setText('#guide', '마찰 전기만으로 네온전구에 불을 켤 수 있을까요?');
    setText('#subguide', '① 문지르기 → ② 알루미늄 접시 올려놓기 → ③ 네온전구 끝을 다른 접시에 대기 순서로 해 보세요.');
    setText('#stage-state', `문지른 횟수 ${rubs}번 · ${placed ? '알루미늄 접시를 올려놓음' : '알루미늄 접시를 듦'}${touching ? ' · 네온전구 닿음' : ''}`);
    setText('#note-title', seen.lit ? (seen.noLight ? '불빛이 계속 켜져 있었나요?' : '한 번 더 대 보면 어떻게 될까요?') : '네온전구를 관찰해 보세요');
    setText('#note-text', show ? '네온전구를 대는 순간 전하가 어디에서 어디로 이동하나요?' : '‘전하·방향 보기’를 켜면 접시에 있는 전하를 볼 수 있어요.');
    setHTML('#readout', `<div class="readout-grid"><div class="readout-card"><strong>문지른 횟수</strong><b>${rubs}번</b><small>여러 번 문질러야 해요</small></div><div class="readout-card"><strong>네온전구</strong><b>${flash > .05 ? '번쩍!' : '꺼짐'}</b><small>${discharged ? '전하가 이동했어요' : '대기 중'}</small></div></div>`);
    setText('#model-note', '알루미늄 접시에는 손이 닿지 않도록 빨대를 잡고 옮겨요. 전하는 대전된 만큼 남는 전하만 나타냈고, 입자의 수와 이동 속도는 보기 쉽게 나타낸 모형이에요.');
    setText('#discovery', '마찰 전기는 일상생활에서 쓰는 전기와 어떤 관계가 있을까요?');
  } else {
    setText('#guide', '전지를 연결하거나 펌프를 작동해 두 모형을 비교해 보세요.');
    setText('#subguide', '전지가 없을 때와 있을 때 도선 속 전자의 움직임, 펌프가 없을 때와 있을 때 물의 흐름을 비교해요.');
    setText('#stage-state', `전지 ${battery ? '연결' : '없음'} · 펌프 ${pump ? '작동' : '멈춤'}`);
    setText('#note-title', battery ? '전자가 어느 쪽으로 움직이나요?' : '도선 속 전자를 살펴보세요');
    setText('#note-text', show ? '전자의 이동 방향과 전류의 방향을 비교해 보세요. 전구로 들어간 전자와 나온 전자의 수도 비교해요.' : '‘전하·방향 보기’를 켜면 도선 속 원자핵과 전류의 방향을 볼 수 있어요.');
    setHTML('#readout', `<table class="data-table"><tr><th>수로 모형</th><th>전기 회로</th></tr><tr><td>펌프</td><td>전지</td></tr><tr><td>수로</td><td>전선</td></tr><tr><td>물레방아</td><td>전구</td></tr><tr><td>물의 흐름</td><td>전류</td></tr><tr><td>물의 높이 차</td><td>전압</td></tr></table>`);
    setText('#model-note', '수로 모형은 눈에 보이지 않는 전류를 나타내기 위한 모형이에요. 물은 전류의 방향으로 흐르지만 실제 전자는 반대 방향으로 이동해요. 수로가 끊어져도 물은 흐르지만 전선이 끊어지면 전류는 흐르지 않아요. 전자의 수와 빠르기는 보기 쉽게 나타냈어요.');
    setText('#discovery', '전지가 없을 때도 도선 속 전자는 불규칙하게 움직이고 있어요.');
  }
}
function setMode(next) {
  mode = next; lab.selectTab(next);
  $('#neon-scene').toggleAttribute('hidden', next !== 'neon');
  $('#circuit-scene').toggleAttribute('hidden', next !== 'circuit');
  $('.legend').hidden = next !== 'neon' || !show;
  renderControls();
}
function resetScene() {
  rubs = 0; placed = false; touching = false; charge = 0; discharged = false; motion = null; flight = null; flash = 0;
  battery = false; pump = false; batteryTime = 0; pumpTime = 0; inCount = 0; outCount = 0; bulbLevel = 0;
  setMode(mode);
}
$('#tab-neon').onclick = () => setMode('neon');
$('#tab-circuit').onclick = () => setMode('circuit');
$('#reset').onclick = resetScene;
$('#show-detail').onchange = e => { show = e.target.checked; $('.legend').hidden = mode !== 'neon' || !show; renderText(); };

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    if (mode === 'neon') { stepNeon(now, dt); paintNeon(now); renderText(); }
    else stepCircuit(now, dt);
    flow?.update(checklist([
      ['마찰 전기로 네온전구 켜기', seen.lit],
      ['네온전구를 다시 대어 보기', seen.noLight],
      ['전지를 연결해 전자의 움직임 관찰하기', seen.battery],
      ['펌프를 작동해 수로 모형 관찰하기', seen.pump],
    ]));
  }
  requestAnimationFrame(frame);
}

/* ---------- 학습 흐름 ---------- */
flow = setupPOEFlow({
  predict: {
    title: '마찰 전기만으로<br>네온전구에 불을 켤 수 있을까?',
    lead: '털가죽으로 문지른 플라스틱 접시와 털가죽 위에 알루미늄 접시를 하나씩 올려놓아요.<br>한 접시에 붙인 네온전구의 다른 끝을 반대쪽 접시에 대 볼 거예요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="두 알루미늄 접시와 네온전구"><rect width="520" height="250" rx="12" fill="#121a33"/><ellipse cx="140" cy="190" rx="90" ry="20" fill="#eef3f8"/><ellipse cx="140" cy="176" rx="72" ry="16" fill="#c9d1d9"/><ellipse cx="380" cy="190" rx="92" ry="22" fill="#7a5532"/><ellipse cx="380" cy="176" rx="72" ry="16" fill="#c9d1d9"/><path d="M205 170 C220 120 235 104 240 102" stroke="#d8dde3" stroke-width="2.5" fill="none"/><rect x="240" y="92" width="48" height="20" rx="10" fill="#ff8a3c" opacity=".35" stroke="#e8eef5"/><path d="M288 102 C305 104 315 130 318 160" stroke="#d8dde3" stroke-width="2.5" fill="none"/><text x="264" y="80" text-anchor="middle" fill="#ffd2a8" font-size="15">네온전구</text><text x="140" y="232" text-anchor="middle" fill="#aab4d6" font-size="13">플라스틱 접시</text><text x="380" y="232" text-anchor="middle" fill="#aab4d6" font-size="13">털가죽</text></svg>`,
    question: '네온전구의 끝을 다른 접시에 대면 어떻게 될까요?',
    choices: ['불이 켜지고 계속 켜져 있을 것 같아요.', '잠깐 불이 켜졌다가 꺼질 것 같아요.', '불이 켜지지 않을 것 같아요.', '아직 잘 모르겠어요.'],
    placeholder: '겨울철 문손잡이를 잡을 때 찌릿했던 경험이나 마찰 전기에서 배운 내용을 떠올려 보세요.',
  },
  observe: {
    title: '네온전구를 켜 보고, 전기 회로와 수로 모형을 비교해 보세요.',
    recordLabel: '네온전구가 켜진 모습, 다시 대었을 때의 결과, 전지와 펌프를 작동했을 때의 변화를 적어 보세요.',
    placeholder: '네온전구가 얼마 동안 켜졌는지, 전지를 연결하기 전후 전자의 움직임이 어떻게 달랐는지 적어 보세요.',
  },
  explain: {
    question: '네온전구에 불이 잠깐만 켜진 까닭은 무엇일까요? 전구에 불이 계속 켜지게 하려면 어떻게 해야 할지도 설명해 보세요.',
    concepts: [
      ['네온전구가 켜진 까닭', '마찰로 플라스틱 접시는 (−)전하, 털가죽은 (+)전하를 띠어요. 네온전구를 대는 순간 (−)전하가 네온전구를 지나 다른 접시로 이동하면서 불이 켜져요.'],
      ['전류', '이렇게 전하가 흐르는 것을 <b>전류</b>라고 하고, 단위는 <b>A(암페어)</b>를 사용해요. 전하가 한 번 이동하고 나면 더 이동할 전하가 없어 불이 꺼져요.'],
      ['전압', '펌프가 물의 높이 차를 만들어 물이 계속 흐르게 하듯이, 전지는 전류를 계속 흐르게 해요. 이렇게 전류를 흐르게 하는 능력을 <b>전압</b>이라고 하고, 단위는 <b>V(볼트)</b>를 사용해요.'],
      ['전자의 이동과 전류의 방향', '전지가 없으면 도선 속 전자는 불규칙하게 움직여 전류가 흐르지 않아요. 전지를 연결하면 전자가 (−)극에서 (+)극 쪽으로 이동해요. 전류의 방향은 (+)극에서 (−)극으로 정했으므로 전자의 이동 방향과 반대예요.'],
      ['전구를 지나도', '전구로 들어간 전자와 나온 전자의 수는 같아요. 전자는 전구에서 사라지지 않아요.'],
    ],
    note: '수로 모형은 전류를 이해하기 위한 비유예요. 물과 전자가 완전히 똑같이 움직이는 것은 아니에요.',
  },
  onStageChange: () => { motion = null; },
  onRestart: () => {
    show = false; $('#show-detail').checked = false;
    Object.keys(seen).forEach(k => seen[k] = false);
    lab.resetQuiz(); mode = 'neon'; resetScene();
  },
});
setMode('neon');
requestAnimationFrame(frame);
