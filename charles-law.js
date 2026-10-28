import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import './gas.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, instantLessons } from './src/lab-shell.js';
import { BOTTLE_ML, PIPETTE_ML, CHARLES, gasVolumeAt, pipetteReading, coolWater, ROOM_C, particleSpeed, pistonHeightAtTemp } from './src/gas-model.js';
import { createCylinder, seeded } from './src/gas-particles.js';

// 중학교 1학년 Ⅵ. 기체의 성질 2. 기체의 온도와 부피(6~8차시): 01 기체의 온도와 부피 관계, 02 생활 속의 샤를 법칙.
// 교과서 탐구: 5 mL 유리병 + 1 mL 피펫을 실리콘 튜브로 잇고 뜨거운 물에 담근 뒤, 피펫 입구에 글리세롤을 떨어뜨리고
// 물이 식는 동안 물의 온도와 기체의 부피(유리병 5 mL + 피펫 눈금)를 기록해요.
// 지도상 유의점: 절대 온도·수식은 다루지 않아요. 온도가 높아지면 입자의 운동이 활발해져 충돌 횟수와 세기가 늘고,
// 외부 압력과 기체의 압력이 같아질 때까지 부피가 커져요. 오개념: 입자의 크기가 커진다(×), 0 ℃에서 부피가 0이다(×).

const terms = [
  ['샤를 법칙', '압력이 일정할 때 일정량의 기체의 부피는 온도 변화에 따라 일정하게 커지거나 작아진다는 법칙이에요.'],
  ['글리세롤', '끈끈하고 잘 증발하지 않는 액체예요. 피펫 관 속에서 기체를 막는 마개 역할을 해서, 글리세롤이 움직인 만큼 기체의 부피가 변했다는 것을 알 수 있어요.'],
  ['피펫', '적은 양의 액체를 정확하게 옮기거나 재는 눈금이 있는 가는 유리관이에요. 이 실험에서는 1 mL 피펫의 눈금으로 기체의 부피 변화를 읽어요.'],
  ['외부 압력', '피스톤 위의 추나 대기처럼 바깥에서 기체를 누르는 압력이에요. 기체의 부피는 외부 압력과 기체의 압력이 같아질 때까지 변해요.'],
];

/* ---------- 무대 ---------- */
const PIP = { x: 200, y0: 250, px: 190 };                 // 피펫: 눈금 0 mL가 y0, 1 mL마다 위로 190 px
const pipY = r => PIP.y0 - r * PIP.px;
const ZOOM = { x: 300, y: 50, w: 130, h: 230, px: 1100 };  // 확대한 피펫 눈금: 1 mL마다 1100 px
const GRAPH = { x: 528, y: 76, w: 236, h: 176, cMax: 80, vMin: 5.0, vMax: 6.2 };
const gx = c => GRAPH.x + c / GRAPH.cMax * GRAPH.w, gy = v => GRAPH.y + GRAPH.h - (v - GRAPH.vMin) / (GRAPH.vMax - GRAPH.vMin) * GRAPH.h;
const CYL = { x: 150, w: 210, floor: 380, h1: 220 };
const TEMPS = { min: 0, max: 100, step: 20 };
const LIFE = { pingpong: '찌그러진 탁구공', bottle: '냉장고 속 페트병', balloon: '열기구' };
const waterColor = c => { const k = Math.max(0, Math.min(1, (c - ROOM_C) / 40)); return `rgb(${Math.round(70 + 150 * k)},${Math.round(150 - 40 * k)},${Math.round(230 - 120 * k)})`; };

const pipTicks = Array.from({ length: 11 }, (_, i) => { const r = i / 10, y = pipY(r); return `<path d="M${PIP.x - 6} ${y} h${i % 5 ? 4 : 7}" stroke="#cfe0ff" stroke-width="1.2"/>${i % 2 ? '' : `<text x="${PIP.x - 12}" y="${y + 4}" text-anchor="end" class="gas-tick">${r.toFixed(1)}</text>`}`; }).join('');
const graphFrame = `<rect x="${GRAPH.x - 48}" y="${GRAPH.y - 34}" width="${GRAPH.w + 72}" height="${GRAPH.h + 74}" rx="12" fill="#0a1029e6" stroke="#2c3966"/>
  <text x="${GRAPH.x - 34}" y="${GRAPH.y - 14}" class="gas-axis">부피(mL)</text><text x="${GRAPH.x + GRAPH.w}" y="${GRAPH.y + GRAPH.h + 32}" text-anchor="end" class="gas-axis">온도(℃)</text>
  <path d="M${GRAPH.x} ${GRAPH.y} V${GRAPH.y + GRAPH.h - 14} l-6 4 l12 4 l-6 4 V${GRAPH.y + GRAPH.h} H${GRAPH.x + GRAPH.w}" stroke="#cfe0ff" stroke-width="1.5" fill="none"/>
  ${[0, 20, 40, 60, 80].map(c => `<path d="M${gx(c)} ${GRAPH.y + GRAPH.h} v4" stroke="#cfe0ff"/><text x="${gx(c)}" y="${GRAPH.y + GRAPH.h + 16}" text-anchor="middle" class="gas-tick">${c}</text>`).join('')}
  ${[5.2, 5.6, 6.0].map(v => `<path d="M${GRAPH.x} ${gy(v)} h-4" stroke="#cfe0ff"/><text x="${GRAPH.x - 8}" y="${gy(v) + 4}" text-anchor="end" class="gas-tick">${v.toFixed(1)}</text>`).join('')}
  <text x="${GRAPH.x - 8}" y="${GRAPH.y + GRAPH.h + 4}" text-anchor="end" class="gas-tick">0</text>`;

const scene = `
<g id="measure-view">
  <rect x="40" y="410" width="250" height="12" rx="3" fill="#2a3150" stroke="#8f9bc4"/><path d="M62 410 V30" stroke="#8f9bc4" stroke-width="6" stroke-linecap="round"/>
  <path d="M62 110 H${PIP.x - 8}" stroke="#8f9bc4" stroke-width="5"/><rect x="${PIP.x - 12}" y="102" width="24" height="16" rx="4" fill="#3a3f52" stroke="#8f9bc4"/>
  <path d="M110 250 V404 Q110 410 116 410 H284 Q290 410 290 404 V250" fill="#dfeffa10" stroke="#cfe6f5" stroke-width="3"/>
  <rect id="water" x="113" y="276" width="174" height="131" rx="3" opacity=".55"/>
  <g id="steam"></g>
  <path d="M${PIP.x - 8} 306 h16 v-16 h-16z" fill="#7fe7ff33" stroke="#cfe6f5" stroke-width="2"/>
  <path d="M${PIP.x - 28} 312 Q${PIP.x - 28} 306 ${PIP.x - 22} 306 H${PIP.x + 22} Q${PIP.x + 28} 306 ${PIP.x + 28} 312 V390 Q${PIP.x + 28} 398 ${PIP.x + 20} 398 H${PIP.x - 20} Q${PIP.x - 28} 398 ${PIP.x - 28} 390Z" fill="#7fe7ff33" stroke="#e8f6ff" stroke-width="2.5"/>
  <text x="${PIP.x}" y="360" text-anchor="middle" class="gas-small">5 mL</text>
  <rect x="${PIP.x - 7}" y="258" width="14" height="34" rx="4" fill="#e8e1c855" stroke="#e8e1c8" stroke-width="2"/>
  <rect x="${PIP.x - 5}" y="40" width="10" height="${PIP.y0 + 12 - 40}" rx="3" fill="#dfeffa12" stroke="#cfe6f5" stroke-width="1.6"/>
  <rect id="pip-gas" x="${PIP.x - 3.5}" width="7" fill="#7fe7ff55"/>
  <rect id="glycerol" x="${PIP.x - 4}" width="8" height="9" rx="2" fill="#ff5d8f"/>
  ${pipTicks}
  <text x="${PIP.x + 12}" y="36" class="gas-small">1 mL 피펫</text>
  <path id="probe" d="M268 236 V392" stroke="#c9d1db" stroke-width="4" stroke-linecap="round"/><path d="M268 236 V222 Q268 210 280 210 H286 Q294 210 294 218 V329 H306" stroke="#9fb3d9" stroke-width="2" fill="none"/>
  <rect x="306" y="300" width="124" height="58" rx="8" fill="#0a1029" stroke="#2c3966"/>
  <text x="318" y="320" class="gas-small">온도 센서(물)</text><text id="temp-read" x="318" y="346" class="gas-num"></text>
  <g transform="translate(${ZOOM.x} ${ZOOM.y})">
    <rect width="${ZOOM.w}" height="${ZOOM.h}" rx="10" fill="#0a1029e6" stroke="#2c3966"/>
    <text x="10" y="20" class="gas-small">피펫 눈금 확대</text>
    <clipPath id="zoom-clip"><rect x="4" y="28" width="${ZOOM.w - 8}" height="${ZOOM.h - 66}"/></clipPath>
    <g clip-path="url(#zoom-clip)"><g id="zoom-scale"></g></g>
    <text id="zoom-read" x="10" y="${ZOOM.h - 16}" class="gas-num"></text>
  </g>
  <g id="graph">${graphFrame}<g id="graph-pts"></g></g>
  <text x="482" y="318" class="gas-label">기체의 부피 = 유리병(5 mL) + 피펫 눈금</text>
  <text id="vol-read" x="482" y="346" class="gas-big"></text>
  <text id="cool-state" x="482" y="376" class="gas-small"></text>
</g>
<g id="particles-view">
  <path d="M${CYL.x - 6} 40 V${CYL.floor + 6} H${CYL.x + CYL.w + 6} V40" fill="none" stroke="#cfe6f5" stroke-width="4"/>
  <rect x="${CYL.x}" y="40" width="${CYL.w}" height="${CYL.floor - 40}" fill="#dfeffa0d"/>
  <path d="M${CYL.x} ${CYL.floor - CYL.h1} h${CYL.w}" stroke="#ffd166" stroke-width="1.6" stroke-dasharray="6 6" opacity=".7"/>
  <text x="${CYL.x - 12}" y="${CYL.floor - CYL.h1 + 4}" text-anchor="end" class="gas-small">20 ℃</text>
  <g id="cyl-gas"></g>
  <g id="piston"></g>
  <g id="heater"></g>
  <g id="cyl-panel" transform="translate(440 50)"></g>
</g>
<g id="life-view">
  <g id="life-scene"></g>
</g>
<g id="fx"></g>`;

const lab = buildLab({
  unit: 'g1-6',
  crumb: '03 기체의 온도와 부피',
  title: '기체의 온도와 부피는 어떤 관계가 있을까?',
  intro: '뜨거운 물이 식는 동안 유리병 속 기체의 부피를 재어 그래프로 나타내고, 입자 모형으로 그 까닭을 찾아보세요.',
  tabs: [{ id: 'measure', label: '기체 부피 측정 장치' }, { id: 'particles', label: '입자 모형' }, { id: 'life', label: '생활 속 샤를 법칙' }],
  toggle: '화살표·충돌 보기',
  sceneLabel: '뜨거운 물에 담근 유리병과 피펫, 피스톤이 달린 실린더 속 기체 입자, 생활 속 샤를 법칙',
  scene,
  terms,
});

/* ---------- 상태 ---------- */
let mode = 'measure', show = false, lastFrame = 0, flow = null;
// 측정 장치: ready(실내) → hot(뜨거운 물에 담금) → cooling(글리세롤을 떨어뜨리고 물이 식는 중)
let phase = 'ready', water = ROOM_C, fast = false;
const records = [];                                   // [{ c, reading, ml }]
let temp = 20, heatSeen = false, coolSeen = false, showTime = 0, particlesDone = false;
let life = 'pingpong', lifeT = 0, lifeRun = false;
const lifeSeen = new Set();

/* ---------- 측정 장치 ---------- */
const reading = () => (phase === 'cooling' ? pipetteReading(water) : PIPETTE_ML);
function paintMeasure(dt) {
  if (phase === 'cooling') water = coolWater(water, dt * (fast ? 5 : 1));
  $('#water').setAttribute('fill', waterColor(water));
  const r = reading(), gy0 = pipY(r);
  const glyc = $('#glycerol');
  glyc.toggleAttribute('hidden', phase !== 'cooling');
  glyc.setAttribute('y', (gy0 - 9).toFixed(1));
  const pg = $('#pip-gas'); pg.setAttribute('y', gy0.toFixed(1)); pg.setAttribute('height', (PIP.y0 + 10 - gy0).toFixed(1));
  setText('#temp-read', `${water.toFixed(1)} ℃`);
  // 확대한 눈금: 글리세롤 아래쪽 끝(기체와 닿는 곳)을 가운데에 두어요.
  const mid = ZOOM.y + 28 + (ZOOM.h - 66) / 2 - ZOOM.y;
  const from = Math.max(0, Math.floor((r - .1) * 100)), to = Math.min(100, Math.ceil((r + .1) * 100));
  let z = `<rect x="${ZOOM.w / 2 - 14}" y="0" width="28" height="${ZOOM.h}" fill="#dfeffa12"/>`;
  for (let i = from; i <= to; i++) {
    const y = mid - (i / 100 - r) * ZOOM.px;
    z += `<path d="M${ZOOM.w / 2 - 14} ${y.toFixed(1)} h${i % 5 ? 10 : 18}" stroke="#cfe0ff" stroke-width="${i % 5 ? 1 : 1.6}"/>${i % 5 ? '' : `<text x="${ZOOM.w / 2 + 10}" y="${(y + 4).toFixed(1)}" class="gas-tick">${(i / 100).toFixed(2)}</text>`}`;
  }
  if (phase === 'cooling') z += `<rect x="${ZOOM.w / 2 - 13}" y="${(mid - 9 * ZOOM.px / PIP.px).toFixed(1)}" width="26" height="${(9 * ZOOM.px / PIP.px).toFixed(1)}" rx="3" fill="#ff5d8f"/><rect x="${ZOOM.w / 2 - 13}" y="${mid.toFixed(1)}" width="26" height="${ZOOM.h}" fill="#7fe7ff33"/>`;
  setHTML('#zoom-scale', z);
  setText('#zoom-read', phase === 'cooling' ? `${r.toFixed(2)} mL` : '글리세롤 없음');
  setText('#vol-read', phase === 'cooling' ? `${BOTTLE_ML} + ${r.toFixed(2)} = ${(BOTTLE_ML + r).toFixed(2)} mL` : '글리세롤을 떨어뜨린 뒤 읽어요');
  setText('#cool-state', { ready: '실내 온도의 물이에요.', hot: '유리병 속 기체가 뜨거운 물과 같은 온도가 되었어요.', cooling: `물이 식는 중이에요${fast ? '(시간 빠르게)' : ''}.` }[phase]);
  const steam = phase !== 'ready' && water > 35 ? Array.from({ length: 3 }, (_, i) => `<path d="M${150 + i * 40} 262 q-8 -14 0 -26 q8 -12 0 -26" stroke="#ffffff" stroke-width="2.4" fill="none" opacity="${(.14 + .5 * (water - 35) / 25).toFixed(2)}"/>`).join('') : '';
  setHTML('#steam', steam);
}
function paintGraph() {
  const pts = records.map(r => `<circle cx="${gx(r.c).toFixed(1)}" cy="${gy(r.ml).toFixed(1)}" r="5" fill="#ffd166" stroke="#fff" stroke-width="1.4"/>`).join('');
  // 점이 5개 이상이면 점들을 지나는 직선을 함께 보여 줘요(0~80 ℃).
  const line = records.length >= 5 ? `<path d="M${gx(0).toFixed(1)} ${gy(gasVolumeAt(0)).toFixed(1)} L${gx(80).toFixed(1)} ${gy(gasVolumeAt(80)).toFixed(1)}" stroke="#7fe7ff" stroke-width="2" stroke-dasharray="5 5" opacity=".8"/>` : '';
  setHTML('#graph-pts', `<clipPath id="graph-clip"><rect x="${GRAPH.x}" y="${GRAPH.y}" width="${GRAPH.w}" height="${GRAPH.h}"/></clipPath><g clip-path="url(#graph-clip)">${line}</g>${pts}`);
}
function pourHot() {
  phase = 'hot'; water = CHARLES.refC; records.length = 0; paintGraph();
  toast('뜨거운 물(60 ℃)에 유리병을 담갔어요. 이제 피펫 입구에 글리세롤을 떨어뜨려요');
  renderControls();
}
function dropGlycerol() {
  phase = 'cooling';
  burst($('#fx'), PIP.x, pipY(PIPETTE_ML), '#ff5d8f', 8);
  toast('글리세롤을 떨어뜨렸어요. 물이 식는 동안 온도와 부피를 기록해요');
  renderControls();
}
function record() {
  const c = Math.round(water * 10) / 10, r = Math.round(pipetteReading(water) * 100) / 100, ml = Math.round((BOTTLE_ML + r) * 100) / 100;
  if (records.some(x => Math.abs(x.c - c) < 2)) { toast('비슷한 온도는 이미 기록했어요. 물이 조금 더 식은 뒤 기록해 보세요'); return; }
  records.push({ c, reading: r, ml }); records.sort((a, b) => b.c - a.c);
  burst($('#fx'), gx(c), gy(ml), '#ffd166', 8);
  toast(`온도 ${c.toFixed(1)} ℃ · 부피 ${ml.toFixed(2)} mL를 기록했어요`);
  if (records.length === 5) toast('그래프의 점들을 이은 모양을 살펴보세요. 온도가 같은 만큼 낮아질 때 부피는 어떻게 변하나요?');
  paintGraph(); renderControls();
}

/* ---------- 입자 모형 ---------- */
const cyl = createCylinder({ layer: $('#cyl-gas'), x: CYL.x, w: CYL.w, floor: CYL.floor, n: 30, h1: CYL.h1, maxH: 330, minH: 80, baseSpeed: 150, seed: 53, ease: .7 });
const volMl = () => Math.round(cyl.volumeRatio * 30 * 10) / 10;
function paintCylinder() {
  const top = cyl.top;
  setHTML('#piston', `<rect x="${CYL.x}" y="${(top - 16).toFixed(1)}" width="${CYL.w}" height="16" rx="3" fill="#c9d1db" stroke="#eef2f7"/><rect x="${CYL.x + 74}" y="${(top - 38).toFixed(1)}" width="62" height="20" rx="3" fill="#8f9bc4" stroke="#cfd6ec"/><text x="${CYL.x + CYL.w + 14}" y="${(top - 2).toFixed(1)}" class="gas-label">← 피스톤</text>`);
  const hot = temp > 20, cold = temp < 20;
  const k = Math.min(1, Math.abs(temp - 20) / 80);
  const flames = hot ? Array.from({ length: 5 }, (_, i) => `<path d="M${CYL.x + 24 + i * 40} ${CYL.floor + 34} q-8 -10 0 -${(10 + 12 * k).toFixed(0)} q8 ${(10 + 12 * k).toFixed(0)} 0 ${(10 + 12 * k).toFixed(0)}z" fill="#ff8a4c" opacity="${(.5 + .5 * k).toFixed(2)}"/>`).join('') : '';
  const ice = cold ? Array.from({ length: 5 }, (_, i) => `<rect x="${CYL.x + 16 + i * 40}" y="${CYL.floor + 14}" width="22" height="16" rx="3" fill="#bfe9ff" opacity=".85" transform="rotate(${i % 2 ? 8 : -6} ${CYL.x + 27 + i * 40} ${CYL.floor + 22})"/>`).join('') : '';
  setHTML('#heater', `<rect x="${CYL.x - 10}" y="${CYL.floor + 34}" width="${CYL.w + 20}" height="12" rx="4" fill="#2a3150" stroke="#8f9bc4"/>${flames}${ice}`);
  const pin = cyl.inner, max = 1.6;
  const bar = (y, label, v, c) => `<text x="16" y="${y}" class="gas-label">${label}</text><rect x="120" y="${y - 14}" width="${(160 * Math.min(v, max) / max).toFixed(1)}" height="18" rx="5" fill="${c}"/><text x="${(126 + 160 * Math.min(v, max) / max).toFixed(1)}" y="${y}" class="gas-num">${v.toFixed(2)}</text>`;
  const v = cyl.speed, v20 = particleSpeed(20, 150);
  const speedWord = Math.abs(v - v20) < 1 ? '20 ℃와 같아요' : v > v20 ? '20 ℃보다 빨라요' : '20 ℃보다 느려요';
  const diff = pin - 1, moving = Math.abs(diff) > .01;
  setHTML('#cyl-panel', `<rect width="340" height="330" rx="14" fill="#0a1029e6" stroke="#2c3966"/>
    <text x="16" y="28" class="gas-title">외부 압력 1 기압으로 일정 · 입자 30개</text>
    <text x="16" y="62" class="gas-label">온도</text><text x="120" y="62" class="${hot ? 'gas-hot' : cold ? 'gas-cool' : 'gas-num'}">${temp} ℃</text>
    ${bar(98, '외부 압력', 1, '#8f9bc4')}${bar(132, '기체의 압력', pin, '#5cc8ff')}
    <text x="16" y="164" class="gas-small">${moving ? (diff > 0 ? '기체의 압력이 더 커서 피스톤이 올라가요.' : '기체의 압력이 더 작아서 피스톤이 내려가요.') : '두 압력이 같아서 피스톤이 멈췄어요.'}</text>
    <text x="16" y="200" class="gas-label">기체의 부피(높이)</text><text x="200" y="200" class="gas-num">${volMl().toFixed(1)} mL</text>
    <text x="16" y="236" class="gas-label">입자의 운동 빠르기</text><path d="M160 232 h${(v * .3).toFixed(0)}" stroke="#7fe7ff" stroke-width="4" marker-end="url(#arrow-head)"/>
    <text x="16" y="262" class="gas-small">${speedWord}</text>
    <text x="16" y="294" class="gas-small">${show ? '입자가 빠를수록 피스톤에 더 세게, 더 자주 부딪혀요.' : '위쪽의 ‘화살표·충돌 보기’를 켜면 충돌을 볼 수 있어요.'}</text>
    <text x="16" y="316" class="gas-small">입자의 수와 크기는 변하지 않아요.</text>`);
}
function setTemp(c) {
  temp = Math.max(TEMPS.min, Math.min(TEMPS.max, c));
  cyl.setTemp(temp); renderControls();
}

/* ---------- 생활 속 샤를 법칙 ---------- */
const lRand = seeded(77);
const balloonAir = Array.from({ length: 40 }, (_, i) => ({ a: lRand() * 6.28, r: Math.sqrt(lRand()), ph: lRand() * 6.28, out: i >= 33 }));
// 찌그러진 탁구공: 위쪽 오른편이 안으로 들어간 원(dent 0이면 둥근 공)
function pingBall(cx, cy, r, dent) {
  const a1 = -100 * Math.PI / 180, a2 = -40 * Math.PI / 180, am = -70 * Math.PI / 180;
  const p = a => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  const d = r * 1.155 - 2.4 * dent;
  return `<path d="M${p(a2)} A${r} ${r} 0 1 1 ${p(a1)} Q${(cx + d * Math.cos(am)).toFixed(1)} ${(cy + d * Math.sin(am)).toFixed(1)} ${p(a2)}Z" fill="#fff7ea" stroke="#ffb35c" stroke-width="2.5"/>`;
}
function paintLife(dt) {
  if (lifeRun) lifeT = Math.min(1, lifeT + dt / 4);
  const u = lifeT;
  let svg = '';
  if (life === 'pingpong') {
    const sink = Math.min(1, u / .3), fix = Math.max(0, (u - .3) / .7);
    const cy = 120 + sink * 128, inner = 20 + 50 * fix; // 탁구공은 물에 반쯤 잠겨 떠 있어요
    svg = `<path d="M240 200 V404 Q240 412 248 412 H552 Q560 412 560 404 V200" fill="#dfeffa10" stroke="#cfe6f5" stroke-width="3"/><rect x="243" y="240" width="314" height="168" rx="4" fill="${waterColor(80)}" opacity=".5"/>
      ${Array.from({ length: 4 }, (_, i) => `<path d="M${290 + i * 70} 228 q-8 -14 0 -26 q8 -12 0 -26" stroke="#fff" stroke-width="2.4" fill="none" opacity=".45"/>`).join('')}
      ${pingBall(400, cy, 42, 14 * (1 - fix))}
      <text x="400" y="434" text-anchor="middle" class="gas-small">뜨거운 물(약 80 ℃)</text>
      <rect x="590" y="70" width="190" height="130" rx="14" fill="#0a1029e6" stroke="#2c3966"/><text x="606" y="98" class="gas-title">탁구공 속 기체</text>
      <text x="606" y="128" class="gas-label">온도 약 ${Math.round(inner)} ℃</text><text x="606" y="160" class="gas-small">${fix > .95 ? '찌그러진 곳이 펴졌어요.' : u > 0 ? '부피가 커지는 중이에요.' : '찌그러진 탁구공이에요.'}</text>`;
  } else if (life === 'bottle') {
    const c = 25 - 21 * u, q = 28 * u;
    const bottle = `M372 150 V128 H428 V150 Q452 166 452 196 V${(250).toFixed(0)} Q${(452 - q).toFixed(1)} 300 452 350 V392 Q452 404 440 404 H360 Q348 404 348 392 V350 Q${(348 + q).toFixed(1)} 300 348 250 V196 Q348 166 372 150Z`;
    svg = `<rect x="250" y="60" width="300" height="370" rx="18" fill="#e9eef7" stroke="#8f9bc4" stroke-width="3"/><rect x="266" y="76" width="268" height="338" rx="10" fill="#cfe2f5"/>
      <path d="M266 260 H534" stroke="#9fb3d9" stroke-width="4"/><path d="${bottle}" fill="#ffffff66" stroke="#4d7fb8" stroke-width="2.5"/><rect x="368" y="116" width="64" height="16" rx="4" fill="#4d7fb8"/>
      <rect x="590" y="70" width="190" height="130" rx="14" fill="#0a1029e6" stroke="#2c3966"/><text x="606" y="98" class="gas-title">냉장고 속 온도</text>
      <text x="606" y="128" class="${u > 0 ? 'gas-cool' : 'gas-label'}">약 ${Math.round(c)} ℃</text><text x="606" y="160" class="gas-small">${u > .95 ? '페트병이 찌그러졌어요.' : u > 0 ? '페트병 속 기체가 식는 중이에요.' : '마개를 꼭 닫은 빈 페트병이에요.'}</text>`;
  } else {
    const rise = 90 * Math.max(0, (u - .45) / .55), cy = 220 - rise, gone = Math.min(1, u / .45);
    const dots = balloonAir.map((p, i) => {
      p.ph += dt * (2 + 4 * u);
      if (p.out && gone > 0) { const y = cy + 92 + gone * (60 + i * 6); return `<circle cx="${(400 + (i - 36) * 12).toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#ff9f6b" opacity="${(1 - gone).toFixed(2)}"/>`; }
      const rr = p.r * 78, x = 400 + Math.cos(p.a) * rr + Math.cos(p.ph) * (2 + 4 * u), y = cy - 10 + Math.sin(p.a) * rr * .9 + Math.sin(p.ph * 1.3) * (2 + 4 * u);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${u > 0 ? '#ff9f6b' : '#7fe7ff'}" opacity=".9"/>`;
    }).join('');
    svg = `<path d="M0 420 H800" stroke="#3b4a7a" stroke-width="4"/>
      <path d="M400 ${cy - 110} C 300 ${cy - 110} 290 ${cy + 20} 368 ${cy + 92} H432 C 510 ${cy + 20} 500 ${cy - 110} 400 ${cy - 110}Z" fill="#ff7a5c33" stroke="#ff9f6b" stroke-width="3"/>
      ${dots}
      <path d="M372 ${cy + 92} L384 ${cy + 140} M428 ${cy + 92} L416 ${cy + 140}" stroke="#c9d1db" stroke-width="2"/><rect x="380" y="${cy + 140}" width="40" height="26" rx="4" fill="#8a5a33" stroke="#c48a55"/>
      ${u > 0 && u < 1 ? `<path d="M400 ${cy + 132} q-8 -12 0 -26 q8 14 0 26z" fill="#ffd166"/>` : ''}
      <rect x="590" y="70" width="190" height="150" rx="14" fill="#0a1029e6" stroke="#2c3966"/><text x="606" y="98" class="gas-title">풍선 속 기체</text>
      <text x="606" y="128" class="${u > 0 ? 'gas-hot' : 'gas-label'}">${u > 0 ? '가열하는 중' : '가열하기 전'}</text><text x="606" y="158" class="gas-small">${u > .45 ? '일부 기체가 밖으로 밀려 나와' : u > 0 ? '기체의 부피가 커져요.' : '풍선 아래쪽은 열려 있어요.'}</text><text x="606" y="180" class="gas-small">${u > .45 ? '가벼워진 열기구가 떠올라요.' : ''}</text>`;
  }
  setHTML('#life-scene', svg);
}
function runLife() {
  lifeT = 0; lifeRun = true;
  if (life === 'balloon') balloonAir.forEach(p => { p.ph = 0; });
  setTimeout(markLife, instantLessons.matches ? 0 : 3200);
  renderControls();
}
function markLife() { if (!lifeSeen.has(life)) { lifeSeen.add(life); toast(`${LIFE[life]}의 변화를 살펴보았어요`); renderText(); renderControls(); } }

/* ---------- 문구와 조작 ---------- */
function renderText() {
  const T = {
    measure: ['뜨거운 물이 식는 동안 유리병 속 기체의 부피를 재어 보세요.', '‘뜨거운 물에 담그기’ → ‘글리세롤 떨어뜨리기’를 누른 뒤, 물이 식는 동안 ‘온도와 부피 기록하기’를 다섯 번 눌러요. 측정한 점이 그래프에 찍혀요.'],
    particles: ['온도를 바꾸며 실린더 속 기체 입자를 관찰해 보세요.', '외부 압력은 1 기압으로 그대로예요. ‘가열하기’와 ‘냉각하기’를 눌러 입자의 운동과 피스톤의 높이가 어떻게 달라지는지 비교해요.'],
    life: ['생활 속에서 샤를 법칙을 찾아보세요.', '보기를 골라 단추를 눌러 보고, 기체의 부피가 왜 변하는지 온도로 생각해 봐요.'],
  }[mode];
  setText('#guide', T[0]); setText('#subguide', T[1]);
  setText('#stage-state', mode === 'measure' ? `기록 ${records.length}개 · 물 ${water.toFixed(0)} ℃` : mode === 'particles' ? `온도 ${temp} ℃ · 외부 압력 1 기압` : `${LIFE[life]} · 살펴본 예 ${lifeSeen.size}가지`);
  setText('#note-title', { measure: '물이 식으면 부피는?', particles: '온도가 높아지면 무엇이 달라질까요?', life: '어떤 온도가 달라졌나요?' }[mode]);
  setText('#note-text', { measure: '물이 식을 때 글리세롤이 어느 쪽으로 움직이는지 보세요. 그래프의 점들은 어떤 모양으로 놓이나요?', particles: '온도가 높아지면 입자의 운동 빠르기가 달라져요. 외부 압력과 기체의 압력 막대를 비교하며 피스톤이 언제 멈추는지 보세요.', life: '탁구공, 페트병, 열기구 속 기체의 온도가 어떻게 달라지는지 살펴보세요.' }[mode]);
  const rows = records.map(r => `<tr><td>${r.c.toFixed(1)}</td><td>${r.reading.toFixed(2)}</td><td>${r.ml.toFixed(2)}</td></tr>`).join('');
  setHTML('#readout', `<table class="data-table"><tr><th>온도(℃)</th><th>피펫 눈금(mL)</th><th>기체의 부피(mL)</th></tr>${rows || '<tr><td colspan="3">아직 기록이 없어요</td></tr>'}</table>`);
  setText('#model-note', { measure: '유리병 속 기체의 온도는 직접 재기 어려워서, 유리병 속 기체와 비커 속 물의 온도가 같다고 보고 물의 온도를 재요. 측정값은 이상적인 기체로 계산했어요. 실제 실험에서는 연결 부분의 틈이나 글리세롤의 움직임 때문에 값이 조금씩 다를 수 있어요.', particles: '입자의 수와 크기, 빠르기는 보기 쉽게 나타냈어요. 실제 기체 입자는 눈에 보이지 않을 만큼 작고 훨씬 많아요. 피스톤의 높이는 샤를 법칙에 맞게 계산했어요.', life: '그림 속 크기 변화는 보기 쉽게 나타냈어요.' }[mode]);
  setText('#discovery', '온도 변화에 따라 기체의 부피가 변하는 정도는 기체의 종류와 관계없이 같아요.');
}
function renderControls() {
  if (mode === 'measure') {
    $('#controls').innerHTML = `<div role="group" aria-label="실험 순서"><span class="group-label">실험</span><button id="pour" ${phase === 'ready' ? '' : 'disabled'}>뜨거운 물에 담그기</button><button id="drop" ${phase === 'hot' ? '' : 'disabled'}>글리세롤 떨어뜨리기</button><button id="fast" aria-pressed="${fast}" ${phase === 'cooling' ? '' : 'disabled'}>시간 빠르게</button><button id="again" ${phase === 'ready' ? 'disabled' : ''}>처음부터 다시</button></div>`;
    $('#actions').innerHTML = `<button id="record" class="primary" ${phase === 'cooling' ? '' : 'disabled'}>온도와 부피 기록하기</button>`;
    $('#pour').onclick = pourHot;
    $('#drop').onclick = dropGlycerol;
    $('#fast').onclick = () => { fast = !fast; renderControls(); };
    $('#again').onclick = () => { phase = 'ready'; water = ROOM_C; fast = false; records.length = 0; paintGraph(); renderControls(); };
    $('#record').onclick = record;
  } else if (mode === 'particles') {
    $('#controls').innerHTML = `<div role="group" aria-label="온도 바꾸기"><span class="group-label">온도 ${temp} ℃</span><button id="cool" ${temp <= TEMPS.min ? 'disabled' : ''}>냉각하기 (−20 ℃)</button><button id="heat" ${temp >= TEMPS.max ? 'disabled' : ''}>가열하기 (+20 ℃)</button><button id="to-room">20 ℃로</button></div>`;
    $('#actions').innerHTML = '';
    $('#cool').onclick = () => setTemp(temp - TEMPS.step);
    $('#heat').onclick = () => setTemp(temp + TEMPS.step);
    $('#to-room').onclick = () => setTemp(20);
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="생활 속 예"><span class="group-label">생활 속 예</span>${Object.entries(LIFE).map(([k, v]) => `<button data-life="${k}" aria-pressed="${life === k}">${v}${lifeSeen.has(k) ? ' ✓' : ''}</button>`).join('')}</div>`;
    $('#actions').innerHTML = `<button id="life-run" class="primary">${{ pingpong: '뜨거운 물에 넣기', bottle: '냉장고에 넣어 두기', balloon: '풍선 속 공기 가열하기' }[life]}</button>`;
    $$('[data-life]').forEach(b => b.onclick = () => { life = b.dataset.life; lifeT = 0; lifeRun = false; renderControls(); });
    $('#life-run').onclick = runLife;
  }
  renderText();
}
function setMode(next) {
  mode = next; lab.selectTab(next);
  for (const v of ['measure', 'particles', 'life']) $(`#${v}-view`).toggleAttribute('hidden', v !== next);
  renderControls();
}
for (const v of ['measure', 'particles', 'life']) $(`#tab-${v}`).onclick = () => setMode(v);
$('#show-detail').onchange = e => { show = e.target.checked; cyl.setArrows(show); renderText(); };
$('#reset').onclick = () => {
  if (mode === 'measure') { phase = 'ready'; water = ROOM_C; fast = false; records.length = 0; paintGraph(); }
  if (mode === 'particles') { temp = 20; cyl.setTemp(20); cyl.settle(); }
  if (mode === 'life') { lifeT = 0; lifeRun = false; }
  renderControls();
};

let textTimer = 0;
function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    if (mode === 'measure') { paintMeasure(dt); textTimer += dt; if (textTimer > .5) { textTimer = 0; setText('#stage-state', `기록 ${records.length}개 · 물 ${water.toFixed(0)} ℃`); } }
    if (mode === 'particles') {
      cyl.step(dt, { flashes: show }); cyl.render(); paintCylinder();
      const still = Math.abs(cyl.inner - 1) < .01;
      if (still && temp >= 60 && !heatSeen) { heatSeen = true; toast(`${temp} ℃: 기체의 부피가 ${pistonHeightAtTemp(temp, 30).toFixed(1)} mL가 되어 피스톤이 멈췄어요`); }
      if (still && temp <= 0 && !coolSeen) { coolSeen = true; toast(`${temp} ℃: 기체의 부피가 ${pistonHeightAtTemp(temp, 30).toFixed(1)} mL가 되어 피스톤이 멈췄어요`); }
      if (show) { showTime += dt; if (!particlesDone && showTime > 4) { particlesDone = true; renderText(); } }
    }
    if (mode === 'life') paintLife(dt);
    flow?.update(checklist([
      ['뜨거운 물에 담그고 글리세롤 떨어뜨리기', phase === 'cooling', '‘뜨거운 물에 담그기’를 누르고 ‘글리세롤 떨어뜨리기’를 눌러요'],
      ['물이 식는 동안 온도와 부피 5번 기록하기', records.length >= 5, '물이 식는 동안 ‘온도와 부피 기록하기’를 다섯 번 눌러요. ‘시간 빠르게’를 써도 돼요', '#record'],
      ['입자 모형: 가열하여 60 ℃ 이상에서 피스톤이 멈출 때까지 보기', heatSeen, '‘입자 모형’ 탭 → ‘가열하기 (+20 ℃)’를 두 번 이상 누르고 피스톤이 멈출 때까지 기다려요', '#tab-particles'],
      ['입자 모형: 냉각하여 0 ℃에서 피스톤이 멈출 때까지 보기', coolSeen, '‘냉각하기 (−20 ℃)’를 눌러 0 ℃로 낮추고 피스톤이 멈출 때까지 기다려요'], // 가열과 냉각은 어느 쪽부터 해도 돼요
      ['입자의 운동과 충돌 살펴보기', particlesDone, '위쪽의 ‘화살표·충돌 보기’를 켜고 온도에 따라 입자의 운동이 어떻게 다른지 봐요', '', '#show-detail'],
      ['생활 속 샤를 법칙 2가지 살펴보기', lifeSeen.size >= 2, '‘생활 속 샤를 법칙’ 탭에서 보기를 골라 단추를 눌러요', '#tab-life'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '뜨거운 물이 식으면<br>병 속 기체의 부피는?',
    lead: '5 mL 유리병과 1 mL 피펫을 연결해 뜨거운 물에 담그고, 피펫 입구에 글리세롤을 떨어뜨렸어요.<br>압력은 그대로이고, 물이 식으면서 병 속 기체의 온도도 함께 낮아져요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="뜨거운 물에 담근 유리병과 피펫"><rect width="520" height="250" rx="12" fill="#121a33"/><path d="M150 120 V226 H330 V120" fill="#dfeffa10" stroke="#cfe6f5" stroke-width="3"/><rect x="153" y="140" width="174" height="84" fill="#dc6e70" opacity=".55"/><rect x="215" y="166" width="50" height="52" rx="8" fill="#7fe7ff33" stroke="#e8f6ff" stroke-width="2.5"/><rect x="234" y="150" width="12" height="18" fill="#e8e1c8"/><rect x="235" y="20" width="10" height="132" rx="3" fill="#dfeffa12" stroke="#cfe6f5" stroke-width="1.6"/><rect x="236" y="24" width="8" height="8" rx="2" fill="#ff5d8f"/><path d="M196 132 q-8 -14 0 -26 q8 -12 0 -26 M284 132 q-8 -14 0 -26 q8 -12 0 -26" stroke="#fff" stroke-width="2.4" fill="none" opacity=".5"/><text x="262" y="36" font-size="14" fill="#ffd2a8">글리세롤</text><text x="240" y="246" text-anchor="middle" font-size="14" fill="#ffd2a8">뜨거운 물</text><text x="380" y="120" font-size="15" fill="#ffd166">물이 식으면?</text></svg>`,
    question: '압력이 일정할 때 물이 식으면서 유리병 속 기체의 온도가 낮아지면, 기체의 부피는 어떻게 될까요?',
    choices: ['온도가 낮아질수록 부피가 일정하게 작아질 것 같아요.', '부피가 작아지지만 일정한 규칙은 없을 것 같아요.', '부피는 변하지 않을 것 같아요.', '부피가 커질 것 같아요.'],
    placeholder: '빈 페트병에 풍선을 씌우고 뜨거운 물이나 얼음물에 넣어 본 경험, 냉장고에 넣어 둔 페트병을 떠올려 보세요.',
  },
  observe: {
    title: '물이 식는 동안 기체의 부피를 재고, 입자 모형으로 그 까닭을 알아보세요.',
    recordLabel: '온도와 부피의 측정값, 입자 모형에서 본 것, 생활 속 예를 적어 보세요.',
    placeholder: '온도가 낮아질 때 부피는 어떻게 되었는지, 입자의 운동은 어떻게 달라졌는지 적어 보세요.',
    parts: [
      { title: '기체 부피 측정 장치', label: '측정한 온도와 부피, 그래프의 모양을 바탕으로 둘 사이의 관계를 적어 보세요.', placeholder: '물이 식을 때 글리세롤은 어느 쪽으로 움직였나요? 그래프의 점들은 어떻게 놓였나요?' },
      { title: '입자 모형', label: '온도를 높이거나 낮출 때 입자의 운동, 두 압력, 기체의 부피가 어떻게 달라졌는지 적어 보세요.', placeholder: '가열할 때와 냉각할 때를 비교해 적어 보세요.' },
      { title: '생활 속 샤를 법칙', label: '살펴본 생활 속 예에서 기체의 부피가 변한 모습과 그 까닭을 적어 보세요.', placeholder: '기체의 온도는 높아졌나요, 낮아졌나요?' },
    ],
  },
  explain: {
    question: '기체의 온도와 부피 사이에는 어떤 관계가 있나요? 온도가 높아지면 부피가 커지는 까닭을 기체 입자의 운동으로 설명해 보세요.',
    concepts: [
      ['기체의 온도와 부피', '압력이 일정할 때 온도가 높아지면 <b class="subj">기체의 부피는</b> <b>커지고</b>, 온도가 낮아지면 부피는 작아져요.'],
      ['샤를 법칙', '일정한 압력에서 일정량의 기체 부피는 온도 변화에 따라 <b>일정하게</b> 커지거나 작아져요. 이를 <b>샤를 법칙</b>이라고 해요.'],
      ['입자 모형', '온도가 높아지면 <b class="subj">기체 입자의 운동이</b> <b>활발해져</b> 용기 벽에 충돌하는 횟수와 세기가 늘어나요. 기체의 압력이 커져 부피가 커져요.'],
      ['변하지 않는 것', '온도가 변해도 기체 입자의 <b>개수와 크기</b>는 변하지 않아요. 입자 사이의 거리가 달라져요.'],
      ['생활 속 샤를 법칙', '찌그러진 탁구공을 뜨거운 물에 넣으면 펴지고, 냉장고에 넣어 둔 페트병은 기체의 부피가 작아져 <b>찌그러져요</b>.'],
    ],
    note: '기체의 부피는 외부 압력과 기체의 압력이 같아질 때까지 커지거나 작아져요. 0 ℃에서도 기체의 부피는 0이 아니에요.',
  },
  onRestart: () => {
    show = false; $('#show-detail').checked = false; cyl.setArrows(false);
    phase = 'ready'; water = ROOM_C; fast = false; records.length = 0; paintGraph();
    temp = 20; cyl.setTemp(20); cyl.settle(); heatSeen = false; coolSeen = false; showTime = 0; particlesDone = false;
    life = 'pingpong'; lifeT = 0; lifeRun = false; lifeSeen.clear();
    lab.resetQuiz(); setMode('measure');
  },
});
paintGraph();
setMode('measure');
requestAnimationFrame(frame);
