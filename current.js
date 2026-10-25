import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { webglAvailable } from './src/view-toggle.js';
import { PAIRS } from './src/water-model.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, arc, PathFlow, ELECTRON_GLYPH, reducedMotion, instantLessons } from './src/lab-shell.js';

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

// 그림은 실제 실험 기구처럼 그렸어요(교과서 242–243쪽): 털가죽, 플라스틱 접시, 절연 손잡이가 달린 알루미늄 접시, 유리관 속 두 전극이 보이는 네온전구,
// 건전지(1.5 V), 유리구·필라멘트·소켓이 있는 전구, 피복을 입힌 구리 전선, 펌프·관·물레방아로 된 수로 모형.
const FUR = Array.from({ length: 120 }, (_, i) => {
  const x = B.x - 112 + (i * 37 % 224), y = 338 + (i * 13 % 28) - 8, bend = ((i * 7) % 9) - 4, h = 4 + (i * 5 % 5);
  return `M${x} ${y} q${bend} ${-h / 2} ${bend * .6} ${-h}`;
}).join('');
const scene = `
<defs>
  <linearGradient id="cur-table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4330"/><stop offset="1" stop-color="#3a2a1d"/></linearGradient>
  <radialGradient id="cur-plastic" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e6edf4"/><stop offset="1" stop-color="#b9c6d4"/></radialGradient>
  <radialGradient id="cur-fur" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#9a6b3f"/><stop offset="1" stop-color="#5d3b1f"/></radialGradient>
  <linearGradient id="cur-alu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".35" stop-color="#b8c1ca"/><stop offset=".55" stop-color="#eef1f4"/><stop offset="1" stop-color="#8d98a3"/></linearGradient>
  <linearGradient id="cur-handle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9fd8ff" stop-opacity=".55"/><stop offset=".4" stop-color="#e8f6ff" stop-opacity=".9"/><stop offset="1" stop-color="#6fb6e6" stop-opacity=".55"/></linearGradient>
  <linearGradient id="cur-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".45" stop-color="#cfe6ff" stop-opacity=".15"/><stop offset="1" stop-color="#ffffff" stop-opacity=".35"/></linearGradient>
  <radialGradient id="cur-globe" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".5" stop-color="#d9ecff" stop-opacity=".18"/><stop offset="1" stop-color="#9fc4e8" stop-opacity=".35"/></radialGradient>
  <linearGradient id="cur-screw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a8f99"/><stop offset=".45" stop-color="#e3e7ec"/><stop offset="1" stop-color="#6d727c"/></linearGradient>
  <linearGradient id="cur-cell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2c27a"/><stop offset=".45" stop-color="#c87533"/><stop offset="1" stop-color="#7a3f17"/></linearGradient>
  <linearGradient id="cur-cell-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4f5c"/><stop offset=".5" stop-color="#1f222b"/><stop offset="1" stop-color="#0d0f14"/></linearGradient>
  <linearGradient id="cur-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6a46a"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient>
  <linearGradient id="cur-pump" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b6c9e"/><stop offset="1" stop-color="#2c365a"/></linearGradient>
</defs>
<g id="neon-scene">
  <path d="M40 366 L760 366 L800 420 L0 420Z" fill="url(#cur-table)" opacity=".9"/><path d="M40 366 H760" stroke="#7a5c40" stroke-width="2"/>
  <g id="plastic"><ellipse cx="${A.x}" cy="356" rx="122" ry="26" fill="#000" opacity=".25"/><ellipse cx="${A.x}" cy="350" rx="120" ry="26" fill="url(#cur-plastic)" stroke="#9fb0c2" stroke-width="2"/><ellipse cx="${A.x}" cy="346" rx="94" ry="17" fill="#e9eff5" stroke="#cbd6e1"/><path d="M${A.x - 70} 340 q40 -8 90 -4" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/></g>
  <g id="fur"><ellipse cx="${B.x}" cy="356" rx="128" ry="30" fill="#000" opacity=".25"/><ellipse cx="${B.x}" cy="350" rx="125" ry="30" fill="url(#cur-fur)"/><path d="${FUR}" stroke="#c4935e" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".9"/><path d="${FUR}" stroke="#6b4423" stroke-width="1" fill="none" transform="translate(3 4)" opacity=".7"/></g>
  <text class="muted" x="${A.x}" y="404" text-anchor="middle" font-size="13">플라스틱 접시</text>
  <text class="muted" x="${B.x}" y="404" text-anchor="middle" font-size="13">털가죽</text>
  ${['b', 'a'].map(k => { const P = k === 'a' ? A : B; return `<g id="plate-${k}">
    <rect x="${P.x - 7}" y="196" width="14" height="110" rx="6" fill="url(#cur-handle)" stroke="#bfe6ff" stroke-width="1"/><circle cx="${P.x}" cy="196" r="11" fill="url(#cur-handle)" stroke="#bfe6ff"/>
    ${k === 'a' ? `<text class="muted" x="${P.x - 14}" y="240" text-anchor="end" font-size="12">절연 손잡이</text>` : ''}
    <ellipse cx="${P.x}" cy="${P.y + 3}" rx="100" ry="23" fill="#000" opacity=".2"/>
    <ellipse cx="${P.x}" cy="${P.y}" rx="98" ry="22" fill="url(#cur-alu)" stroke="#f4f7fa" stroke-width="2"/>
    <path d="${Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2, c = Math.cos(a), si = Math.sin(a); return `M${(P.x + c * 78).toFixed(1)} ${(P.y - 4 + si * 14).toFixed(1)} L${(P.x + c * 96).toFixed(1)} ${(P.y + si * 21).toFixed(1)}`; }).join('')}" stroke="#8d98a3" stroke-width="1" opacity=".7"/>
    <ellipse cx="${P.x}" cy="${P.y - 4}" rx="76" ry="13" fill="#c3ccd5" stroke="#a6b1bc"/><path d="M${P.x - 50} ${P.y - 8} q30 -5 70 -2" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7"/>
    ${k === 'a' ? `<path id="lead-a" d="M318 312 C334 266 352 228 ${BULB.x - 34} ${BULB.y}" stroke="#d8dde3" stroke-width="2.5" fill="none"/>
    <g id="neon">
      <ellipse id="neon-glow" cx="${BULB.x}" cy="${BULB.y}" rx="70" ry="42" fill="#ff6a1f" opacity="0" filter="url(#glow-strong)"/>
      <path d="M${BULB.x - 34} ${BULB.y} h8 M${BULB.x + 26} ${BULB.y} h8" stroke="#c9ced6" stroke-width="3"/>
      <rect x="${BULB.x - 28}" y="${BULB.y - 14}" width="56" height="28" rx="14" fill="url(#cur-glass)" stroke="#eef4fb" stroke-width="2"/>
      <path d="M${BULB.x - 26} ${BULB.y} h10 M${BULB.x + 16} ${BULB.y} h10" stroke="#b9c0c8" stroke-width="2"/>
      <rect x="${BULB.x - 16}" y="${BULB.y - 8}" width="10" height="16" rx="1.5" fill="#9aa4ae" stroke="#6d7680"/>
      <rect x="${BULB.x + 6}" y="${BULB.y - 8}" width="10" height="16" rx="1.5" fill="#9aa4ae" stroke="#6d7680"/>
      <rect id="neon-gas" x="${BULB.x - 24}" y="${BULB.y - 10}" width="48" height="20" rx="10" fill="#ffb070" opacity="0" filter="url(#glow)"/>
      <path d="M${BULB.x - 20} ${BULB.y - 9} q20 -4 40 0" stroke="#fff" stroke-width="2" fill="none" opacity=".75"/>
    </g>
    <path id="lead-b" stroke="#d8dde3" stroke-width="2.5" fill="none"/>
    <circle id="lead-tip" r="4" fill="#eef2f6"/>
    <text class="object-name" x="${BULB.x}" y="${BULB.y - 30}" text-anchor="middle">네온전구</text>` : ''}
  </g>`; }).join('')}
  <path id="discharge-path" fill="none" stroke="none" d="M${A.x} ${A.y - 6} L318 312 C334 266 352 228 ${BULB.x - 30} ${BULB.y} L${BULB.x + 30} ${BULB.y} C${BULB.x + 50} ${BULB.y + 4} ${TIP_TOUCH.x - 10} ${TIP_TOUCH.y - 30} ${TIP_TOUCH.x} ${TIP_TOUCH.y} L${B.x} ${B.y - 6}"/>
  <g id="neon-charges"></g><g id="neon-fx"></g>
</g>
<g id="circuit-scene" hidden>
  <text class="object-name" x="210" y="40" text-anchor="middle">전기 회로</text>
  <text class="object-name" x="600" y="40" text-anchor="middle">수로 모형</text>
  <!-- 피복을 입힌 구리 전선: 바깥은 피복, 안쪽 구리선을 따라 전자가 이동해요. -->
  <path d="M180 372 H60 V110 H360 V372 H240" stroke="#2b3550" stroke-width="16" fill="none" stroke-linejoin="round" opacity=".9"/>
  <path id="wire" d="M180 372 H60 V110 H360 V372 H240" stroke="#d98c45" stroke-width="7" fill="none" stroke-linejoin="round" opacity=".7"/>
  <g id="ions"></g>
  <g id="battery">
    <rect x="172" y="356" width="76" height="32" rx="7" fill="#1b2136" stroke="#5e6a92"/>
    <g id="cell">
      <rect x="182" y="361" width="50" height="22" rx="4" fill="url(#cur-cell-dark)"/>
      <rect x="182" y="361" width="16" height="22" rx="3" fill="url(#cur-cell)"/>
      <rect x="232" y="366" width="5" height="12" rx="1.5" fill="url(#cur-screw)"/>
      <text id="cell-volt" x="214" y="376" text-anchor="middle" font-size="9" font-weight="700" style="fill:#e8edf8">1.5 V</text>
      <path d="M186 364 h44" stroke="#fff" stroke-width="1.5" opacity=".35"/>
    </g>
    <text id="cell-minus" x="164" y="378" text-anchor="middle" font-size="16" font-weight="700">−</text><text id="cell-plus" x="258" y="378" text-anchor="middle" font-size="16" font-weight="700">+</text>
  </g>
  <path id="bridge" d="M180 372 H240" stroke="#d98c45" stroke-width="7" opacity=".7"/>
  <text class="muted" x="210" y="410" text-anchor="middle" font-size="12" id="battery-label">전지</text>
  <g id="bulb">
    <circle id="bulb-glow" cx="210" cy="78" r="66" fill="url(#bulb-light)" opacity="0"/>
    <rect x="186" y="104" width="48" height="16" rx="3" fill="#2a3150" stroke="#8f9bc4"/>
    <rect x="198" y="88" width="24" height="18" fill="url(#cur-screw)"/>
    <path d="M198 92 h24 M198 97 h24 M198 102 h24" stroke="#6d727c" stroke-width="1.5"/>
    <path d="M196 88 C176 74 182 46 210 44 C238 46 244 74 224 88 Z" fill="url(#cur-globe)" stroke="#e8eef5" stroke-width="2"/>
    <path d="M204 88 L203 68 M216 88 L217 68" stroke="#b9c0c8" stroke-width="1.5"/>
    <path id="filament" d="M203 68 q2 -6 3.5 0 t3.5 0 t3.5 0 t3.5 0 t3.5 0" stroke="#ffd36b" stroke-width="2" fill="none"/>
    <path d="M192 62 q4 -12 14 -14" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/>
  </g>
  <text class="muted" x="250" y="96" font-size="12">전구</text>
  <g id="electron-layer"></g>
  <g id="direction" opacity="0"><path d="M92 320 V170" stroke="#5cc8ff" stroke-width="4" marker-end="url(#arrow-head)"/><path d="M118 170 V320" stroke="#ff9f43" stroke-width="4" marker-end="url(#arrow-head)"/><text x="136" y="236" font-size="13" fill="#9fdcff">↑ 전자의 이동 방향</text><text x="136" y="258" font-size="13" fill="#ffc48a">↓ 전류의 방향</text></g>
  <text id="bulb-count" x="210" y="300" text-anchor="middle" font-size="12" class="muted"></text>
  <!-- 수로 모형(2D, 3D 화면을 쓸 수 없을 때): 관 속을 물이 돌아요. 펌프 → (높은 곳) → 물레방아 → (낮은 곳) → 펌프 -->
  <g id="water-2d">
  <path d="M450 250 A150 105 0 0 1 750 250 A150 105 0 0 1 450 250" stroke="#4a5f8a" stroke-width="40" fill="none" opacity=".9"/>
  <path id="water-path" d="M450 250 A150 105 0 0 1 750 250 A150 105 0 0 1 450 250" stroke="#2d7fc1" stroke-width="30" fill="none" opacity=".75"/>
  <path d="M460 240 A140 96 0 0 1 740 240" stroke="#bfe6ff" stroke-width="2" fill="none" opacity=".45"/>
  <g id="water-layer"></g>
  <g id="pump" transform="translate(450 250)">
    <rect x="-34" y="-30" width="68" height="60" rx="10" fill="url(#cur-pump)" stroke="#9fb0dc" stroke-width="2"/>
    <rect x="-30" y="22" width="60" height="14" rx="3" fill="#1b2136" stroke="#5e6a92"/>
    <circle r="19" fill="#0d1a33" stroke="#cfe3ff" stroke-width="2"/>
    <g id="impeller"><path d="M0 -15 C6 -10 6 -4 0 0 C-6 -4 -6 -10 0 -15Z M15 0 C10 6 4 6 0 0 C4 -6 10 -6 15 0Z M0 15 C-6 10 -6 4 0 0 C6 4 6 10 0 15Z M-15 0 C-10 -6 -4 -6 0 0 C-4 6 -10 6 -15 0Z" fill="#cfe3ff"/><circle r="3" fill="#5b6c9e"/></g>
  </g>
  <text class="muted" x="450" y="304" text-anchor="middle" font-size="12">펌프</text>
  <g id="lift" opacity="0"><rect x="494" y="168" width="14" height="70" rx="4" fill="#4fc3ff" opacity=".7"/><path d="M516 168 H530 M516 238 H530 M523 172 V234" stroke="#ffd166" stroke-width="2" marker-start="url(#arrow-head)" marker-end="url(#arrow-head)"/><text x="540" y="208" font-size="12" fill="#ffd166">물의 높이 차</text></g>
  <g id="wheel" transform="translate(750 250)">
    <rect x="-6" y="0" width="12" height="52" fill="#6b4a2a"/>
    <g id="paddles">
      <circle r="36" fill="none" stroke="url(#cur-wood)" stroke-width="6"/><circle r="22" fill="none" stroke="#8a5a2b" stroke-width="2"/>
      ${Array.from({ length: 8 }, (_, i) => `<g transform="rotate(${i * 45})"><path d="M0 0 V-36" stroke="#a87444" stroke-width="3"/><rect x="-4" y="-50" width="8" height="18" rx="2" fill="url(#cur-wood)" stroke="#6b4a2a"/></g>`).join('')}
      <circle r="7" fill="#6b4a2a" stroke="#d6a46a" stroke-width="2"/>
    </g>
  </g>
  <text class="muted" x="750" y="318" text-anchor="middle" font-size="12">물레방아</text>
  </g>
  <g id="pair-marks"></g>
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
});

/* ---------- 상태 ---------- */
let mode = 'neon', show = false;
let rubs = 0, placed = false, touching = false, charge = 0, discharged = false, motion = null, flight = null, flash = 0;
let battery = false, pump = false, batteryTime = 0, pumpTime = 0, lastFrame = 0;
// 전기 회로와 수로 모형 잇기: 전지 개수(전압), 펌프 세기(물의 높이 차), 학생이 찾은 짝
let cells = 1, pumpLevel = 1, strongTime = 0, pick = null, justMatched = null, water3d = null, water3dLoading = false;
const matched = new Set();
let inCount = 0, outCount = 0, wheelAngle = 0, impellerAngle = 0, bulbLevel = 0;
// viewNeon·viewCircuit: ‘전하·방향 보기’를 켜고 전하(전자)의 움직임을 직접 본 적이 있는지(꼭 봐야 다음으로 넘어가요).
const seen = { lit: false, noLight: false, battery: false, pump: false, viewNeon: false, viewCircuit: false, strong: false };
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

/* ---------- 전기 회로 ↔ 수로 모형 짝 찾기 ---------- */
// 왼쪽(전기 회로)에서 하나, 오른쪽(수로 모형)에서 하나를 골라 짝을 지어요. 찾은 짝은 두 그림에 같은 색으로 표시돼요.
const PAIR_COLORS = { pump: '#ffd166', channel: '#ff9f6b', wheel: '#ffe9a6', flow: '#7fd6ff', height: '#b9a6ff' };
const RIGHT_ORDER = ['wheel', 'height', 'pump', 'flow', 'channel'];   // 오른쪽 단추는 섞어서 보여 줘요.
const pairOf = key => PAIRS.find(p => p[0] === key || p[2] === key);
function choosePair(side, key) {
  const pair = pairOf(key);
  if (matched.has(pair[2])) return;
  if (side === 'left') { pick = key; renderControls(); return; }
  if (!pick) { toast('먼저 왼쪽(전기 회로)에서 하나를 골라요'); return; }
  const left = pairOf(pick);
  if (left[2] === key) {
    matched.add(key); justMatched = key; pick = null;
    toast(`🔗 ${left[1]} ↔ ${left[3]}: ${left[4]}`);
    burst($('#fx'), 400, 220, PAIR_COLORS[key], 14);
  } else {
    toast(`🤔 ${left[1]}과(와) ${pairOf(key)[3]}은(는) 짝이 아니에요. ${left[1]}은(는) 회로에서 어떤 일을 하는지 떠올려 봐요.`);
    pick = null;
  }
  renderControls(); renderPairMarks();
}
// 찾은 짝을 그림에 표시해요(전기 회로 쪽 + 3D를 쓸 수 없을 때의 2D 수로 모형 쪽).
const MARKS = {
  pump: { circuit: [210, 372, 46, 24], tag: [210, 334], water: [450, 250, 48, 44] },
  channel: { circuit: [60, 240, 16, 120], tag: [132, 240], water: [600, 148, 120, 22] },
  wheel: { circuit: [210, 80, 44, 46], tag: [318, 70], water: [750, 250, 62, 62] },
  flow: { circuit: [360, 240, 16, 110], tag: [288, 200], water: [600, 352, 120, 22] },
  height: { circuit: [210, 410, 80, 13], tag: [345, 410], water: [523, 203, 24, 44] },
};
function renderPairMarks() {
  const tag = (x, y, text, color) => `<g transform="translate(${x} ${y})"><rect x="${-text.length * 6.5 - 8}" y="-12" width="${text.length * 13 + 16}" height="22" rx="11" fill="${color}"/><text y="4" text-anchor="middle" font-size="12" font-weight="700" fill="#0a1029">${text}</text></g>`;
  setHTML('#pair-marks', [...matched].map(key => {
    const [ckey, cname, , full] = pairOf(key), c = PAIR_COLORS[key], m = MARKS[key], wname = full.replace('물의 높이 차', '높이 차');
    const ring = ([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="7 5" opacity=".95"/>`;
    return `<g data-mark="${ckey}">${ring(m.circuit)}${tag(m.tag[0], m.tag[1], `${cname} = ${wname}`, c)}${water3d ? '' : ring(m.water) + tag(m.water[0], m.water[1] + m.water[3] + 18, `${wname} = ${cname}`, c)}</g>`;
  }).join(''));
}

/* ---------- 3D 수로 모형(높이 차가 보이게) ---------- */
$('.stage').insertAdjacentHTML('beforeend', '<div class="water-box" id="water-box" aria-hidden="true"></div>');
function loadWater3D() {
  if (water3d || water3dLoading || !webglAvailable()) return;
  water3dLoading = true;
  import('./src/water-3d.js').then(({ createWater3D }) => {
    water3d = createWater3D({ stage: $('.stage'), box: $('#water-box'), reducedMotion: instantLessons });
    applyWaterView(); renderPairMarks(); renderText();
  }).catch(err => { console.error(err); water3dLoading = false; });
}
function applyWaterView() {
  const on = !!water3d && mode === 'circuit';
  $('.stage').classList.toggle('three-on', on);
  $('.stage').classList.toggle('water-3d', on);
  $('#water-2d').style.display = on ? 'none' : '';
}
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
  $('#lead-b').setAttribute('d', `M${BULB.x + 34} ${BULB.y} C${BULB.x + 50} ${BULB.y + 4} ${tip.x - 10} ${tip.y - 30} ${tip.x} ${tip.y}`);
  $('#lead-tip').setAttribute('cx', tip.x); $('#lead-tip').setAttribute('cy', tip.y);
  const furShift = motion?.kind === 'rub' ? Math.sin(Math.max(0, Math.min(1, (now - motion.start) / motion.duration)) * Math.PI) * -(B.x - A.x - 40) : 0;
  $('#fur').setAttribute('transform', `translate(${furShift} ${furShift ? -18 : 0})`);
  $('#neon-gas').setAttribute('opacity', (flash * .95).toFixed(2));
  $('#neon-glow').setAttribute('opacity', Math.min(1, flash * 1.3).toFixed(2));
  let html = chargeTokens();
  if (flight && show) {
    const path = $('#discharge-path'), len = path.getTotalLength();
    const t = Math.max(0, Math.min(1, (now - flight.start) / flight.duration));
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
  motion = { kind: 'rub', start: performance.now(), duration: instantLessons.matches ? 1 : 700, done: () => { rubs++; charge = rubs * PER_RUB; discharged = false; renderControls(); } };
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
      flight = { start: performance.now(), duration: instantLessons.matches ? 1 : 650, count };
      const firstLight = lights && !seen.lit;
      if (lights) seen.lit = true;
      setTimeout(() => {
        if (lights) {
          flash = 1; burst($('#neon-fx'), BULB.x, BULB.y, '#ffb36b', 18); arc($('#neon-fx'), BULB.x - 6, BULB.y, BULB.x + 6, BULB.y, '#ffb36b');
          if (firstLight) toast('✨ 네온전구에 불이 켜졌어요!');
        } else toast('불빛이 보이지 않아요. 더 여러 번 문질러 볼까요?');
      }, instantLessons.matches ? 0 : 420);
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
  // 전지 2개(전압이 2배)이면 전자가 더 빨리 움직이고 전구가 더 밝아요(같은 전구일 때).
  bulbLevel += ((battery ? (cells === 2 ? 1 : .62) : 0) - bulbLevel) * (instantLessons.matches ? 1 : 1 - Math.exp(-dt * 5));
  electrons.step(dt, battery ? .045 * cells : 0, battery ? 1.2 : 2.6);
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
  water.step(dt, pump ? .07 * pumpLevel : 0, 0);
  if (pump) {
    wheelAngle += dt * 140 * pumpLevel; impellerAngle += dt * 520 * pumpLevel; pumpTime += dt;
    if (pumpTime > 1.5 && !seen.pump) { seen.pump = true; toast('🌊 펌프가 물을 높은 곳으로 끌어올리니, 높은 곳의 물이 낮은 곳으로 흐르며 물레방아를 돌려요'); }
  }
  if (battery && pump && cells === 2 && pumpLevel === 2) {
    strongTime += dt;
    if (strongTime > 1.5 && !seen.strong) { seen.strong = true; toast('⚡ 전압이 커지면 전구가 더 밝아지고, 높이 차가 커지면 물이 더 빨리 흘러요!'); renderText(); }
  } else strongTime = 0;
  water3d?.update(dt, { on: pump, level: pumpLevel, matched, flash: justMatched });
  justMatched = null;
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
  setText('#battery-label', battery ? (cells === 2 ? '전지 2개 연결(3 V)' : '전지 1개 연결(1.5 V)') : '전지가 없는 회로');
  setText('#cell-volt', cells === 2 ? '3 V' : '1.5 V');
  setText('#bulb-count', battery ? `전구로 들어간 전자 ${inCount} · 나온 전자 ${outCount} · 전구를 지나는 중 ${inCount - outCount}` : '');
}

/* ---------- 화면 문구와 조작 ---------- */
function renderControls() {
  if (mode === 'neon') {
    $('#controls').innerHTML = `<p>털가죽과 문지른 플라스틱 접시는 (−)전하, 털가죽은 (+)전하를 띠어요. 문지른 횟수: <b>${rubs}번</b></p>`;
    $('#actions').innerHTML = `<button id="rub-btn" class="secondary" ${placed || motion || rubs >= MAX_RUBS ? 'disabled' : ''}>털가죽으로 접시 문지르기</button><button id="place-btn" class="secondary" ${motion ? 'disabled' : ''}>${placed ? '알루미늄 접시 들기' : '알루미늄 접시 올려놓기'}</button><button id="touch-btn" class="primary" ${placed ? '' : 'disabled'}>${touching ? '네온전구 떼기' : '네온전구 끝을 접시에 대기'}</button>`;
    $('#rub-btn').onclick = rub; $('#place-btn').onclick = togglePlates; $('#touch-btn').onclick = touch;
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="전기 회로"><span class="group-label">전기 회로</span><button id="battery-btn" aria-pressed="${battery}">${battery ? '전지 빼기' : '전지 연결하기'}</button><button data-cells="1" aria-pressed="${cells === 1}">전지 1개</button><button data-cells="2" aria-pressed="${cells === 2}">전지 2개</button></div>
      <div role="group" aria-label="수로 모형"><span class="group-label">수로 모형</span><button id="pump-btn" aria-pressed="${pump}">${pump ? '펌프 멈추기' : '펌프 작동하기'}</button><button data-pump-level="1" aria-pressed="${pumpLevel === 1}">펌프 약하게</button><button data-pump-level="2" aria-pressed="${pumpLevel === 2}">펌프 세게</button></div>`;
    // 짝 찾기: 왼쪽(전기 회로)에서 하나, 오른쪽(수로 모형)에서 하나
    const leftBtn = ([k, name, w]) => `<button data-pair-left="${k}" class="${matched.has(w) ? 'paired' : ''}" aria-pressed="${pick === k}" ${matched.has(w) ? `disabled style="--pair:${PAIR_COLORS[w]}"` : ''}>${name}</button>`;
    const rightBtn = w => { const [, , , name] = pairOf(w); return `<button data-pair-right="${w}" class="${matched.has(w) ? 'paired' : ''}" ${matched.has(w) ? `disabled style="--pair:${PAIR_COLORS[w]}"` : ''}>${name}</button>`; };
    $('#actions').innerHTML = `<div class="pair-area" id="pair-area"><p class="pair-title">🔗 짝 찾기: 전기 회로의 무엇이 수로 모형의 무엇과 닮았을까요? <small>왼쪽에서 하나, 오른쪽에서 하나를 차례로 눌러요 (${matched.size} / ${PAIRS.length})</small></p>
      <div class="pair-row"><span class="group-label">전기 회로</span>${PAIRS.map(leftBtn).join('')}</div>
      <div class="pair-row"><span class="group-label">수로 모형</span>${RIGHT_ORDER.map(rightBtn).join('')}</div></div>`;
    $('#battery-btn').onclick = () => { battery = !battery; batteryTime = 0; renderControls(); };
    $('#pump-btn').onclick = () => { pump = !pump; pumpTime = 0; renderControls(); };
    $$('[data-cells]').forEach(b => b.onclick = () => { cells = +b.dataset.cells; renderControls(); });
    $$('[data-pump-level]').forEach(b => b.onclick = () => { pumpLevel = +b.dataset.pumpLevel; renderControls(); });
    $$('[data-pair-left]').forEach(b => b.onclick = () => choosePair('left', b.dataset.pairLeft));
    $$('[data-pair-right]').forEach(b => b.onclick = () => choosePair('right', b.dataset.pairRight));
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
    setText('#guide', '왼쪽 전기 회로와 오른쪽 수로 모형을 나란히 놓고 비교해 보세요.');
    setText('#subguide', water3d ? '수로 모형은 3D예요. 끌어서 돌려 보면 펌프가 물을 높은 곳으로 올리고, 물이 물레방아에서 낮은 곳으로 떨어지는 모습(높이 차)이 잘 보여요.' : '전지가 없을 때와 있을 때 도선 속 전자의 움직임, 펌프가 없을 때와 있을 때 물의 흐름을 비교해요.');
    setText('#stage-state', `전지 ${battery ? (cells === 2 ? '2개' : '1개') : '없음'} · 펌프 ${pump ? (pumpLevel === 2 ? '세게' : '약하게') : '멈춤'} · 짝 ${matched.size}/${PAIRS.length}`);
    setText('#note-title', battery ? '전자가 어느 쪽으로 움직이나요?' : '도선 속 전자를 살펴보세요');
    setText('#note-text', show ? '전자의 이동 방향과 전류의 방향을 비교해 보세요. 전구로 들어간 전자와 나온 전자의 수도 비교해요.' : '‘전하·방향 보기’를 켜면 도선 속 원자핵과 전류의 방향을 볼 수 있어요.');
    setHTML('#readout', `<table class="data-table"><tr><th>수로 모형</th><th>전기 회로</th></tr>${PAIRS.map(([, cname, w, wname]) => `<tr><td>${wname}</td><td>${matched.has(w) ? `<b style="color:${PAIR_COLORS[w]}">${cname}</b>` : '?'}</td></tr>`).join('')}</table>`);
    setText('#model-note', '수로 모형은 눈에 보이지 않는 전류를 나타내기 위한 모형이에요. 물은 전류의 방향으로 흐르지만 실제 전자는 반대 방향으로 이동해요. 수로가 끊어져도 물은 흐르지만 전선이 끊어지면 전류는 흐르지 않아요. 전자의 수와 빠르기는 보기 쉽게 나타냈어요.');
    setText('#discovery', '전지가 없을 때도 도선 속 전자는 불규칙하게 움직이고 있어요.');
  }
}
function setMode(next) {
  mode = next; lab.selectTab(next);
  $('#neon-scene').toggleAttribute('hidden', next !== 'neon');
  $('#circuit-scene').toggleAttribute('hidden', next !== 'circuit');
  $('.legend').hidden = next !== 'neon' || !show;
  if (next === 'circuit') loadWater3D();
  applyWaterView();
  renderControls();
}
function resetScene() {
  rubs = 0; placed = false; touching = false; charge = 0; discharged = false; motion = null; flight = null; flash = 0;
  battery = false; pump = false; batteryTime = 0; pumpTime = 0; inCount = 0; outCount = 0; bulbLevel = 0; electrons.offset = 0;
  cells = 1; pumpLevel = 1; strongTime = 0; pick = null;
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
    if (show && mode === 'neon' && rubs > 0) seen.viewNeon = true;
    if (show && mode === 'circuit' && battery) seen.viewCircuit = true;
    flow?.update(checklist([
      ['마찰 전기로 네온전구 켜기', seen.lit, '‘털가죽으로 접시 문지르기’ 3번 이상 → ‘알루미늄 접시 올려놓기’ → ‘네온전구 끝을 접시에 대기’'],
      ['‘전하·방향 보기’를 켜고 접시의 전하 살펴보기', seen.viewNeon, '위쪽 ‘전하·방향 보기’를 켜고, 네온전구를 댈 때 전하가 어디로 이동하는지 봐요', '', '#show-detail'],
      ['네온전구를 다시 대어 보기', seen.noLight, '‘네온전구 떼기’를 누른 뒤 한 번 더 ‘네온전구 끝을 접시에 대기’'],
      ['전지를 연결해 전자의 움직임 관찰하기', seen.battery, '‘전기 회로와 수로 모형’ 탭 → ‘전지 연결하기’', '#tab-circuit, #battery-btn'],
      ['‘전하·방향 보기’를 켜고 전자와 전류의 방향 비교하기', seen.viewCircuit, '‘전하·방향 보기’를 켜고, 전자가 움직이는 방향과 전류의 방향(화살표)을 비교해요', '', '#show-detail'],
      ['펌프를 작동해 수로 모형 관찰하기', seen.pump, '‘펌프 작동하기’를 누르고, 높은 곳과 낮은 곳의 물(높이 차)과 물레방아를 살펴요', '#pump-btn'],
      ['전기 회로와 수로 모형의 짝 5개 찾기', matched.size === PAIRS.length, '아래 ‘짝 찾기’에서 전기 회로(왼쪽) 하나와 수로 모형(오른쪽) 하나를 차례로 눌러 닮은 것끼리 짝을 지어요', '[data-pair-left], [data-pair-right]', '#pair-area'],
      ['전지 2개와 펌프 세게: 전압과 높이 차를 함께 키워 비교하기', seen.strong, '‘전지 2개’와 ‘펌프 세게’를 누르고 전지 연결·펌프 작동을 켠 채로, 전구의 밝기·전자의 빠르기와 물의 높이 차·흐름을 비교해요', '[data-cells], [data-pump-level]', '[data-cells="2"]'],
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
      ['전류', '이렇게 전하가 흐르는 것을 <b>전류</b>라고 하고, 단위는 <b>A(암페어)</b>를 사용해요. 전하가 이동하면서 두 접시 사이의 전압이 낮아져 방전을 유지하지 못하면 불이 꺼져요. 전자가 없어지는 것은 아니에요.'],
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
    matched.clear(); renderPairMarks();
    lab.resetQuiz(); mode = 'neon'; resetScene();
  },
});
setMode('neon');
requestAnimationFrame(frame);
