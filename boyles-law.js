import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import './gas.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, instantLessons } from './src/lab-shell.js';
import { SYRINGE, pressureAtVolume, readAtm } from './src/gas-model.js';
import { createCylinder, seeded } from './src/gas-particles.js';

// 중학교 1학년 Ⅵ. 기체의 성질 02 기체의 압력과 부피 관계, 03 생활 속의 보일 법칙(3~5차시).
// 지도상 유의점: 압력과 부피의 관계를 수식으로 계산하는 정량적 접근에 주안점을 두지 않고, 실험 자료(표·그래프)를 해석해
// 정성적으로 설명해요. 보일 법칙이 성립하려면 온도와 기체의 양이 일정해야 해요.
// 오개념: 부피가 줄면 기체 입자가 빨리 움직인다(×) → 온도가 일정하면 빠르기는 그대로이고, 충돌 횟수만 늘어나요.

const terms = [
  ['기체의 압력', '기체 입자가 끊임없이 운동하며 벽에 충돌할 때, 일정한 넓이에 작용하는 힘의 크기예요.'],
  ['보일 법칙', '온도가 일정할 때 일정량의 기체의 압력과 부피는 서로 반비례한다는 법칙이에요.'],
  ['반비례', '한 값이 2배, 3배로 커질 때 다른 값이 1/2배, 1/3배로 작아지는 관계예요.'],
  ['외부 압력', '피스톤 위의 추나 대기처럼 바깥에서 기체를 누르는 압력이에요. 기체의 부피는 외부 압력과 기체의 압력이 같아질 때까지 변해요.'],
];

/* ---------- 무대 ---------- */
const BAR = { x0: 230, y: 150, px: 6 };                  // 주사기 안쪽: x0(0 mL)부터 1 mL마다 6 px
const sealX = ml => BAR.x0 + ml * BAR.px;
const GAUGE = { cx: 112, cy: 168, r: 62 };
const GRAPH = { x: 470, y: 240, w: 290, h: 160, pMax: 2.5, vMax: 70 };
const CYL = { x: 150, w: 210, floor: 400, h1: 180 };
const PRESSURES = [1, 2, 4];
const LIFE = { diver: '잠수부의 기포', snack: '높은 산의 과자 봉지', chamber: '감압 용기 속 과자 봉지' };

const ticks = Array.from({ length: 13 }, (_, i) => { const ml = i * 5, x = sealX(ml); return `<path d="M${x} ${BAR.y + 44} v${i % 2 ? -6 : -10}" stroke="#cfe0ff" stroke-width="1.3"/>${i % 2 ? '' : `<text x="${x}" y="${BAR.y + 60}" text-anchor="middle" class="gas-tick">${ml}</text>`}`; }).join('');
const gaugeTicks = Array.from({ length: 11 }, (_, i) => { const p = i * .25, a = (-135 + 270 * p / 2.5) * Math.PI / 180, r1 = GAUGE.r - 8, r2 = GAUGE.r - (i % 2 ? 14 : 18); return `<path d="M${(GAUGE.cx + r1 * Math.sin(a)).toFixed(1)} ${(GAUGE.cy - r1 * Math.cos(a)).toFixed(1)} L${(GAUGE.cx + r2 * Math.sin(a)).toFixed(1)} ${(GAUGE.cy - r2 * Math.cos(a)).toFixed(1)}" stroke="#3a3f52" stroke-width="2"/>${i % 2 ? '' : `<text x="${(GAUGE.cx + (r2 - 12) * Math.sin(a)).toFixed(1)}" y="${(GAUGE.cy - (r2 - 12) * Math.cos(a) + 4).toFixed(1)}" text-anchor="middle" class="gas-dial">${p}</text>`}`; }).join('');
const gx = p => GRAPH.x + p / GRAPH.pMax * GRAPH.w, gy = v => GRAPH.y + GRAPH.h - v / GRAPH.vMax * GRAPH.h;
const graphFrame = `<rect x="${GRAPH.x - 44}" y="${GRAPH.y - 30}" width="${GRAPH.w + 66}" height="${GRAPH.h + 66}" rx="12" fill="#0a1029e6" stroke="#2c3966"/>
  <text x="${GRAPH.x - 30}" y="${GRAPH.y - 10}" class="gas-axis">부피(mL)</text><text x="${GRAPH.x + GRAPH.w}" y="${GRAPH.y + GRAPH.h + 30}" text-anchor="end" class="gas-axis">압력(기압)</text>
  <path d="M${GRAPH.x} ${GRAPH.y} V${GRAPH.y + GRAPH.h} H${GRAPH.x + GRAPH.w}" stroke="#cfe0ff" stroke-width="1.5" fill="none"/>
  ${[.5, 1, 1.5, 2, 2.5].map(p => `<path d="M${gx(p)} ${GRAPH.y + GRAPH.h} v4" stroke="#cfe0ff"/><text x="${gx(p)}" y="${GRAPH.y + GRAPH.h + 16}" text-anchor="middle" class="gas-tick">${p}</text>`).join('')}
  ${[20, 40, 60].map(v => `<path d="M${GRAPH.x} ${gy(v)} h-4" stroke="#cfe0ff"/><text x="${GRAPH.x - 8}" y="${gy(v) + 4}" text-anchor="end" class="gas-tick">${v}</text>`).join('')}`;

const scene = `
<g id="syringe-view">
  <circle cx="${GAUGE.cx}" cy="${GAUGE.cy}" r="${GAUGE.r + 6}" fill="#2a3150" stroke="#8f9bc4" stroke-width="2"/>
  <circle cx="${GAUGE.cx}" cy="${GAUGE.cy}" r="${GAUGE.r}" fill="#f4f1e6"/>${gaugeTicks}
  <text x="${GAUGE.cx}" y="${GAUGE.cy + 50}" text-anchor="middle" class="gas-dial">기압</text>
  <path id="needle" d="M${GAUGE.cx} ${GAUGE.cy + 8} L${GAUGE.cx - 3} ${GAUGE.cy} L${GAUGE.cx} ${GAUGE.cy - GAUGE.r + 14} L${GAUGE.cx + 3} ${GAUGE.cy}Z" fill="#e04848"/>
  <circle cx="${GAUGE.cx}" cy="${GAUGE.cy}" r="5" fill="#3a3f52"/>
  <rect x="${GAUGE.cx - 50}" y="${GAUGE.cy + GAUGE.r + 18}" width="100" height="34" rx="6" fill="#0a1029" stroke="#2c3966"/>
  <text id="digital" x="${GAUGE.cx}" y="${GAUGE.cy + GAUGE.r + 41}" text-anchor="middle" class="gas-num"></text>
  <text x="${GAUGE.cx}" y="${GAUGE.cy + GAUGE.r + 70}" text-anchor="middle" class="gas-small">압력계(압력 센서)</text>
  <path d="M${GAUGE.cx + GAUGE.r + 6} ${BAR.y + 22} H${BAR.x0 - 22}" stroke="#9fb3d9" stroke-width="6" stroke-linecap="round"/>
  <path d="M${BAR.x0 - 22} ${BAR.y + 14} H${BAR.x0} V${BAR.y + 30} H${BAR.x0 - 22}Z" fill="#dfeffa33" stroke="#cfe6f5" stroke-width="2"/>
  <rect x="${BAR.x0}" y="${BAR.y}" width="${SYRINGE.maxMl * BAR.px + 30}" height="44" rx="4" fill="#dfeffa18" stroke="#cfe6f5" stroke-width="2.5"/>
  <g id="syringe-gas"></g>${ticks}
  <text x="${sealX(SYRINGE.maxMl) + 22}" y="${BAR.y + 60}" class="gas-tick">mL</text>
  <g id="plunger" tabindex="0" role="slider" aria-label="피스톤(끌어서 부피 바꾸기)" aria-valuemin="${SYRINGE.minMl}" aria-valuemax="${SYRINGE.maxMl}" aria-valuenow="${SYRINGE.startMl}" style="cursor:grab;touch-action:none"><rect x="-12" y="${BAR.y - 10}" width="196" height="64" fill="transparent"/><rect x="-8" y="${BAR.y + 2}" width="8" height="40" fill="#3a3f52"/><path d="M0 ${BAR.y + 22} H170 M170 ${BAR.y + 2} V${BAR.y + 42}" stroke="#8f9bc4" stroke-width="8" stroke-linecap="round"/></g>
  <text id="ml-read" x="${BAR.x0 + 10}" y="${BAR.y - 14}" class="gas-num"></text>
  <g id="graph">${graphFrame}<g id="graph-pts"></g></g>
</g>
<g id="particles-view">
  <path d="M${CYL.x - 6} 60 V${CYL.floor + 6} H${CYL.x + CYL.w + 6} V60" fill="none" stroke="#cfe6f5" stroke-width="4"/>
  <rect x="${CYL.x}" y="60" width="${CYL.w}" height="${CYL.floor - 60}" fill="#dfeffa0d"/>
  <g id="cyl-gas"></g>
  <g id="piston"></g>
  <g id="cyl-panel" transform="translate(440 70)"></g>
</g>
<g id="life-view">
  <g id="life-scene"></g>
</g>
<g id="fx"></g>`;

const lab = buildLab({
  unit: 'g1-6',
  crumb: '02 기체의 압력과 부피',
  title: '기체의 압력과 부피는 어떤 관계가 있을까?',
  intro: '주사기 속 기체의 압력과 부피를 재어 그래프로 나타내고, 입자 모형으로 그 까닭을 찾아보세요.',
  tabs: [{ id: 'syringe', label: '주사기와 압력계' }, { id: 'particles', label: '입자 모형' }, { id: 'life', label: '생활 속 보일 법칙' }],
  toggle: '화살표·충돌 보기',
  sceneLabel: '압력계를 연결한 주사기, 피스톤이 달린 실린더 속 기체 입자, 생활 속 보일 법칙',
  scene,
  terms,
});

/* ---------- 상태 ---------- */
let mode = 'syringe', show = false, lastFrame = 0, flow = null;
let ml = SYRINGE.startMl, shownMl = SYRINGE.startMl;
const records = [];                                   // [{ ml, atm }]
const pulled = () => records.filter(r => r.ml > SYRINGE.startMl).length;
const pushed = () => records.filter(r => r.ml < SYRINGE.startMl).length;
let ext = 1, extSeen = new Set([1]), particleTime = 0, particlesDone = false;
let life = 'diver', lifeT = 0, lifeRun = false, chamberPumps = 0;
const lifeSeen = new Set();

/* ---------- 주사기 ---------- */
const sRand = seeded(9);
const sDots = Array.from({ length: 22 }, () => ({ u: sRand(), v: sRand(), a: sRand() * 6.28 }));
$('#syringe-gas').innerHTML = sDots.map((_, i) => `<circle id="sd-${i}" r="4" fill="#7fe7ff" opacity=".85"/>`).join('');
function paintSyringe(dt) {
  shownMl += (ml - shownMl) * Math.min(1, dt * 8);
  const x = sealX(shownMl);
  $('#plunger').setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
  sDots.forEach((d, i) => {
    d.a += dt * 3; const jitter = 3;
    const cx = BAR.x0 + 6 + d.u * (x - BAR.x0 - 12) + Math.cos(d.a + i) * jitter, cy = BAR.y + 7 + d.v * 30 + Math.sin(d.a * 1.3 + i) * jitter;
    const c = $(`#sd-${i}`); c.setAttribute('cx', cx.toFixed(1)); c.setAttribute('cy', cy.toFixed(1));
  });
  const atm = pressureAtVolume(shownMl), a = -135 + 270 * Math.min(atm, 2.5) / 2.5;
  $('#needle').setAttribute('transform', `rotate(${a.toFixed(1)} ${GAUGE.cx} ${GAUGE.cy})`);
  setText('#digital', `${readAtm(Math.round(shownMl * 10) / 10).toFixed(2)} 기압`);
  setText('#ml-read', `주사기 속 기체의 부피 ${Math.round(shownMl)} mL`);
}
function paintGraph() {
  const pts = records.map(r => `<circle cx="${gx(r.atm).toFixed(1)}" cy="${gy(r.ml).toFixed(1)}" r="5" fill="#ffd166" stroke="#fff" stroke-width="1.4"/>`).join('');
  // 점이 6개 이상이면 점들을 부드럽게 이은 선을 함께 보여 줘요(학급 전체 자료처럼).
  const curve = records.length >= 6 ? `<path d="M${Array.from({ length: 41 }, (_, i) => { const p = .4 + i * (2.5 - .4) / 40; return `${gx(p).toFixed(1)} ${gy(30 / p).toFixed(1)}`; }).join(' L')}" fill="none" stroke="#7fe7ff" stroke-width="2" stroke-dasharray="5 5" opacity=".8"/>` : '';
  setHTML('#graph-pts', curve + pts);
}
function move(d) { setMl(ml + d); }
function setMl(v) {
  const next = Math.max(SYRINGE.minMl, Math.min(SYRINGE.maxMl, v));
  if (next !== ml) { ml = next; $('#plunger').setAttribute('aria-valuenow', ml); renderControls(); }
}
// 피스톤을 손가락·마우스로 끌어도 부피가 1 mL씩 바뀌어요(방향키도 돼요).
{
  const plunger = $('#plunger'), svgX = e => new DOMPoint(e.clientX, e.clientY).matrixTransform($('#scene').getScreenCTM().inverse()).x;
  let grab = null;
  plunger.addEventListener('pointerdown', e => { e.preventDefault(); grab = svgX(e) - sealX(ml); plunger.setPointerCapture(e.pointerId); plunger.style.cursor = 'grabbing'; });
  plunger.addEventListener('pointermove', e => { if (grab !== null) setMl(Math.round((svgX(e) - grab - BAR.x0) / BAR.px)); });
  const drop = () => { grab = null; plunger.style.cursor = 'grab'; };
  plunger.addEventListener('pointerup', drop); plunger.addEventListener('pointercancel', drop);
  plunger.addEventListener('keydown', e => { const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (d) { e.preventDefault(); move(d); } });
}
function record() {
  const atm = readAtm(ml);
  if (records.some(r => r.ml === ml)) { toast(`${ml} mL는 이미 기록했어요. 피스톤을 옮겨 다른 부피에서 재 보세요`); return; }
  records.push({ ml, atm }); records.sort((a, b) => a.atm - b.atm);
  burst($('#fx'), gx(atm), gy(ml), '#ffd166', 8);
  toast(`압력 ${atm.toFixed(2)} 기압 · 부피 ${ml} mL를 기록했어요`);
  if (pulled() === 3 && ml > SYRINGE.startMl && pushed() < 3) toast('피스톤을 당기며 3번 기록했어요. 이제 피스톤을 밀어 보세요');
  if (pushed() === 3 && ml < SYRINGE.startMl && pulled() < 3) toast('피스톤을 밀며 3번 기록했어요. 이제 피스톤을 당겨 보세요');
  paintGraph(); renderControls();
}

/* ---------- 입자 모형 ---------- */
const cyl = createCylinder({ layer: $('#cyl-gas'), x: CYL.x, w: CYL.w, floor: CYL.floor, n: 30, h1: CYL.h1, maxH: 330, minH: 30, baseSpeed: 150, seed: 31 });
function paintCylinder() {
  const top = cyl.top;
  const weights = Array.from({ length: ext }, (_, i) => `<rect x="${CYL.x + 40 + (i % 2) * 70}" y="${top - 22 - Math.floor(i / 2) * 22 - 16}" width="62" height="20" rx="3" fill="#8f9bc4" stroke="#cfd6ec"/>`).join('');
  setHTML('#piston', `<rect x="${CYL.x}" y="${(top - 16).toFixed(1)}" width="${CYL.w}" height="16" rx="3" fill="#c9d1db" stroke="#eef2f7"/>${weights}<text x="${CYL.x + CYL.w + 14}" y="${(top - 2).toFixed(1)}" class="gas-label">← 피스톤</text>`);
  const pin = cyl.inner, max = 4.6;
  const bar = (y, label, v, c) => `<text x="16" y="${y}" class="gas-label">${label}</text><rect x="120" y="${y - 14}" width="${(160 * Math.min(v, max) / max).toFixed(1)}" height="18" rx="5" fill="${c}"/><text x="${(126 + 160 * Math.min(v, max) / max).toFixed(1)}" y="${y}" class="gas-num">${v.toFixed(1)}</text>`;
  setHTML('#cyl-panel', `<rect width="340" height="300" rx="14" fill="#0a1029e6" stroke="#2c3966"/>
    <text x="16" y="28" class="gas-title">온도 20 ℃로 일정 · 입자 30개</text>
    ${bar(66, '외부 압력', ext, '#8f9bc4')}${bar(100, '기체의 압력', pin, '#5cc8ff')}
    <text x="16" y="140" class="gas-label">기체의 부피(높이)</text><text x="200" y="140" class="gas-num">${+(cyl.volumeRatio * 30).toFixed(1)} mL</text>
    <text x="16" y="176" class="gas-label">입자의 운동 빠르기</text><path d="M200 172 h${(cyl.speed * .3).toFixed(0)}" stroke="#7fe7ff" stroke-width="4" marker-end="url(#arrow-head)"/><text x="${(212 + cyl.speed * .3).toFixed(0)}" y="176" class="gas-small">그대로</text>
    ${show ? `<text x="16" y="216" class="gas-label">1초 동안 피스톤에 부딪힌 횟수</text><text x="16" y="250" class="gas-num">약 ${Math.round(cyl.hitsPerSecond)}번</text>` : '<text x="16" y="216" class="gas-label">위쪽의 ‘화살표·충돌 보기’를 켜면</text><text x="16" y="240" class="gas-label">피스톤에 부딪히는 횟수를 볼 수 있어요.</text>'}
    <text x="16" y="284" class="gas-small">기체의 부피는 두 압력이 같아질 때까지 변해요.</text>`);
}
function setExt(p) { ext = p; cyl.setExternal(p); renderControls(); }

/* ---------- 생활 속 보일 법칙 ---------- */
const lRand = seeded(41);
const chamberAir = Array.from({ length: 26 }, () => ({ x: 250 + lRand() * 300, y: 130 + lRand() * 220 }));
// 과자 봉지: 바깥 압력이 작아질수록(puff 0→1) 가장자리가 둥글게 부풀어요.
const snackBag = (cx, cy, k, puff, label) => `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${k})"><path d="M-34 -24 Q0 ${(-30 - 16 * puff).toFixed(1)} 34 -24 Q${(40 + 10 * puff).toFixed(1)} 0 34 24 Q0 ${(30 + 16 * puff).toFixed(1)} -34 24 Q${(-40 - 10 * puff).toFixed(1)} 0 -34 -24Z" fill="#ffd166" stroke="#ff9f43" stroke-width="2"/><path d="M-34 -24 v48 M34 -24 v48" stroke="#ff9f43" stroke-width="4" stroke-dasharray="2 3"/><text y="5" text-anchor="middle" class="gas-ink">${label}</text></g>`;
function paintLife(dt) {
  if (lifeRun) lifeT = Math.min(1, lifeT + dt / 4);
  const u = lifeT;
  let svg = '';
  if (life === 'diver') {
    // 수심이 깊을수록 수압이 커요. 기포가 올라갈수록 수압이 작아져 부피가 커져요(크기 변화는 보일 법칙으로 계산했어요).
    const depth = 30 * (1 - u), pr = 1 + depth / 10, r = 11 * Math.cbrt(4 / pr), y = 352 - u * 262;
    svg = `<rect x="0" y="72" width="800" height="380" fill="#0b3a63"/><rect x="0" y="72" width="800" height="380" fill="url(#gas-sea)"/>
      <path d="M0 74 Q100 66 200 74 T400 74 T600 74 T800 74" stroke="#9fd4ff" stroke-width="3" fill="none"/><text x="470" y="62" class="gas-label">수면</text>
      <g transform="translate(220 372)"><path d="M-40 -6 L-84 -22 L-80 8Z" fill="#2e8bc0"/><rect x="-6" y="-30" width="74" height="14" rx="7" fill="#ffd166" stroke="#ff9f43"/><rect x="-44" y="-16" width="128" height="24" rx="12" fill="#1c2442" stroke="#5c6a9a" stroke-width="2"/><circle cx="96" cy="-6" r="14" fill="#1c2442" stroke="#5c6a9a" stroke-width="2"/><rect x="98" y="-14" width="14" height="10" rx="3" fill="#7fe7ff"/><path d="M106 4 q6 4 4 -8" stroke="#9fb3d9" stroke-width="2" fill="none"/></g>
      ${u > 0 ? `<circle cx="${(330 + Math.sin(u * 12) * 6).toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#cfefff40" stroke="#e8faff" stroke-width="2"/>` : ''}
      <rect x="560" y="96" width="210" height="300" rx="14" fill="#0a1029e6" stroke="#2c3966"/><text x="576" y="124" class="gas-title">물의 압력(수압)</text>
      <rect x="600" y="142" width="26" height="230" rx="6" fill="#16264f"/><rect x="600" y="${(142 + 230 * (1 - depth / 30)).toFixed(1)}" width="26" height="${(230 * depth / 30).toFixed(1)}" rx="6" fill="#5cc8ff"/>
      <text x="640" y="156" class="gas-small">작다(수면)</text><text x="640" y="370" class="gas-small">크다(깊은 곳)</text>
      <text x="640" y="266" class="gas-num">수심 약 ${Math.round(depth)} m</text>`;
  } else if (life === 'snack') {
    const x = 220 + u * 300, y = 382 - u * 262;
    svg = `<path d="M130 412 L520 150 L800 412Z" fill="#2c3d6b" stroke="#7f8ad6" stroke-width="2"/><path d="M478 178 L520 150 L562 178 L540 174 L520 188 L500 174Z" fill="#eef2f7"/>
      ${snackBag(x, y, 1, u, '과자')}
      <rect x="24" y="64" width="230" height="150" rx="14" fill="#0a1029e6" stroke="#2c3966"/><text x="40" y="92" class="gas-title">바깥의 압력(대기압)</text>
      <rect x="40" y="108" width="${(190 * (1 - .3 * u)).toFixed(1)}" height="18" rx="5" fill="#8f9bc4"/><text x="40" y="152" class="gas-small">${u > .95 ? '산 정상' : u > 0 ? '올라가는 중' : '산 아래'}</text><text x="40" y="180" class="gas-small">높이 올라갈수록 대기압이 작아져요.</text>`;
  } else {
    const pr = Math.pow(.8, chamberPumps), n = Math.round(chamberAir.length * pr), puff = 1 - pr;
    svg = `<path d="M240 400 V170 Q240 110 400 110 Q560 110 560 170 V400" fill="#dfeffa10" stroke="#cfe6f5" stroke-width="3"/><path d="M220 400 H580" stroke="#8f9bc4" stroke-width="8" stroke-linecap="round"/>
      ${chamberAir.slice(0, n).map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#7fe7ff" opacity=".8"/>`).join('')}
      ${snackBag(400, 320, (1.3 + .45 * puff).toFixed(3), puff * 1.4, '과자 봉지')}
      <path d="M560 380 H640 V200" stroke="#9fb3d9" stroke-width="6" fill="none"/><rect x="626" y="150" width="28" height="60" rx="4" fill="#2a3150" stroke="#8f9bc4"/><path d="M640 150 V120 M620 120 H660" stroke="#8f9bc4" stroke-width="6" stroke-linecap="round"/>
      <text x="640" y="104" text-anchor="middle" class="gas-small">펌프</text><text x="400" y="430" text-anchor="middle" class="gas-small">감압 용기 · 펌프질한 횟수 ${chamberPumps}번</text>`;
  }
  setHTML('#life-scene', `<defs><linearGradient id="gas-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e6fa8" stop-opacity=".5"/><stop offset="1" stop-color="#04182e" stop-opacity=".9"/></linearGradient></defs>${svg}`);
}
function runLife() {
  if (life === 'chamber') { chamberPumps = Math.min(6, chamberPumps + 1); if (chamberPumps >= 3) markLife(); renderControls(); return; }
  lifeT = 0; lifeRun = true;
  setTimeout(markLife, instantLessons.matches ? 0 : 3200);
  renderControls();
}
function markLife() { if (!lifeSeen.has(life)) { lifeSeen.add(life); toast(`${LIFE[life]}의 변화를 살펴보았어요`); renderText(); } }

/* ---------- 문구와 조작 ---------- */
function renderText() {
  const T = {
    syringe: ['주사기의 피스톤을 밀거나 당기면서 압력과 부피를 재어 보세요.', '처음에는 30 mL · 1 기압이에요. 피스톤을 끌거나 단추로 움직여 밀며 세 번, 당기며 세 번 ‘압력과 부피 기록하기’를 눌러요. 어느 쪽부터 해도 돼요. 측정한 점이 그래프에 찍혀요.'],
    particles: ['외부 압력을 바꾸며 실린더 속 기체 입자를 관찰해 보세요.', '‘2 기압’, ‘4 기압’을 눌러 추를 올려요. 기체의 부피와 피스톤에 부딪히는 횟수가 어떻게 달라지는지 비교해요.'],
    life: ['생활 속에서 보일 법칙을 찾아보세요.', '보기를 골라 단추를 눌러 보고, 기체의 부피가 왜 변하는지 압력으로 생각해 봐요.'],
  }[mode];
  setText('#guide', T[0]); setText('#subguide', T[1]);
  setText('#stage-state', mode === 'syringe' ? `기록 ${records.length}개 · 당기며 ${pulled()}번 · 밀며 ${pushed()}번` : mode === 'particles' ? `외부 압력 ${ext} 기압` : `${LIFE[life]} · 살펴본 예 ${lifeSeen.size}가지`);
  setText('#note-title', { syringe: '부피가 작아지면 압력은?', particles: '부피가 작아지면 무엇이 달라질까요?', life: '어떤 압력이 달라졌나요?' }[mode]);
  setText('#note-text', { syringe: '측정한 압력과 부피를 표와 그래프로 비교해 보세요. 압력이 2배가 될 때 부피는 몇 배가 되나요?', particles: '온도가 같으면 입자의 빠르기는 그대로예요. 움직일 수 있는 공간이 바뀌면 피스톤에 부딪히는 횟수는 어떻게 될까요?', life: '기포, 과자 봉지 속 기체에 작용하는 바깥 압력이 어떻게 달라지는지 살펴보세요.' }[mode]);
  const rows = records.map(r => `<tr><td>${r.atm.toFixed(2)}</td><td>${r.ml}</td><td>${(r.atm * r.ml).toFixed(1)}</td></tr>`).join('');
  setHTML('#readout', `<table class="data-table"><tr><th>압력(기압)</th><th>부피(mL)</th><th>압력×부피</th></tr>${rows || '<tr><td colspan="3">아직 기록이 없어요</td></tr>'}</table>`);
  setText('#model-note', { syringe: '측정값은 이상적인 기체로 계산했어요. 실제 실험에서는 피스톤의 마찰과 연결 부분의 틈 때문에 값이 조금씩 다를 수 있어요. 여러 모둠의 값을 모으면 더 부드러운 그래프를 얻을 수 있어요.', particles: '입자의 수와 크기, 빠르기는 보기 쉽게 나타냈어요. 실제 기체 입자는 눈에 보이지 않을 만큼 작고 훨씬 많아요. 추 1개는 외부 압력 1 기압을 나타내요. 기체의 압력 막대는 입자의 충돌로 생기는 압력을 같은 규칙으로 계산해 나타냈어요.', life: '그림 속 크기 변화는 보기 쉽게 나타냈어요.' }[mode]);
  setText('#discovery', '압축 천연가스(CNG) 버스는 큰 압력을 가해 부피를 줄인 천연가스를 가스통에 저장해요.');
}
function renderControls() {
  if (mode === 'syringe') {
    $('#controls').innerHTML = `<div role="group" aria-label="피스톤 움직이기"><span class="group-label">피스톤</span><button data-step="5" ${ml >= SYRINGE.maxMl ? 'disabled' : ''}>당기기 (+5 mL)</button><button data-step="1" ${ml >= SYRINGE.maxMl ? 'disabled' : ''}>+1 mL</button><button data-step="-1" ${ml <= SYRINGE.minMl ? 'disabled' : ''}>−1 mL</button><button data-step="-5" ${ml <= SYRINGE.minMl ? 'disabled' : ''}>밀기 (−5 mL)</button><button id="to-start">30 mL로</button></div>`;
    $('#actions').innerHTML = '<button id="record" class="primary">압력과 부피 기록하기</button>';
    $$('[data-step]').forEach(b => b.onclick = () => move(+b.dataset.step));
    $('#to-start').onclick = () => setMl(SYRINGE.startMl);
    $('#record').onclick = record;
  } else if (mode === 'particles') {
    $('#controls').innerHTML = `<div role="group" aria-label="외부 압력"><span class="group-label">외부 압력(추)</span>${PRESSURES.map(p => `<button data-ext="${p}" aria-pressed="${ext === p}">${p} 기압</button>`).join('')}</div>`;
    $('#actions').innerHTML = '';
    $$('[data-ext]').forEach(b => b.onclick = () => setExt(+b.dataset.ext));
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="생활 속 예"><span class="group-label">생활 속 예</span>${Object.entries(LIFE).map(([k, v]) => `<button data-life="${k}" aria-pressed="${life === k}">${v}${lifeSeen.has(k) ? ' ✓' : ''}</button>`).join('')}</div>`;
    $('#actions').innerHTML = `<button id="life-run" class="primary">${{ diver: '기포 내보내기', snack: '산 정상으로 올라가기', chamber: '펌프질하기(공기 빼기)' }[life]}</button>`;
    $$('[data-life]').forEach(b => b.onclick = () => { life = b.dataset.life; lifeT = 0; lifeRun = false; chamberPumps = 0; renderControls(); });
    $('#life-run').onclick = runLife;
  }
  renderText();
}
function setMode(next) {
  mode = next; lab.selectTab(next);
  for (const v of ['syringe', 'particles', 'life']) $(`#${v}-view`).toggleAttribute('hidden', v !== next);
  renderControls();
}
for (const v of ['syringe', 'particles', 'life']) $(`#tab-${v}`).onclick = () => setMode(v);
$('#show-detail').onchange = e => { show = e.target.checked; cyl.setArrows(show); renderText(); };
$('#reset').onclick = () => {
  if (mode === 'syringe') { setMl(SYRINGE.startMl); records.length = 0; paintGraph(); }
  if (mode === 'particles') { ext = 1; cyl.setExternal(1); cyl.settle(); }
  if (mode === 'life') { lifeT = 0; lifeRun = false; chamberPumps = 0; }
  renderControls();
};

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    if (mode === 'syringe') paintSyringe(dt);
    if (mode === 'particles') {
      cyl.step(dt, { flashes: show }); cyl.render(); paintCylinder();
      if (Math.abs(cyl.inner / ext - 1) < .01 && !extSeen.has(ext)) { extSeen.add(ext); toast(`외부 압력 ${ext} 기압: 기체의 부피가 ${+(SYRINGE.startMl / ext).toFixed(1)} mL가 되어 멈췄어요`); renderText(); }
      if (show && extSeen.size > 1) { particleTime += dt; if (!particlesDone && particleTime > 4) { particlesDone = true; renderText(); } }
    }
    if (mode === 'life') paintLife(dt);
    flow?.update(checklist([
      // 밀기와 당기기는 어느 쪽부터 해도 돼요(예상 질문이 ‘밀기’라서 밀기를 먼저 두고, 당기기 단추는 잠그지 않아요).
      ['피스톤을 밀며 압력과 부피 3번 기록하기', pushed() >= 3, '‘밀기 (−5 mL)’를 누른 뒤 ‘압력과 부피 기록하기’를 눌러요. 세 번 해요'],
      ['피스톤을 당기며 압력과 부피 3번 기록하기', pulled() >= 3, '‘당기기 (+5 mL)’를 누른 뒤 ‘압력과 부피 기록하기’를 눌러요. 세 번 해요'],
      ['입자 모형: 외부 압력을 2 기압, 4 기압으로 높이기', extSeen.has(2) && extSeen.has(4), '‘입자 모형’ 탭 → ‘2 기압’을 누르고 피스톤이 멈추면 ‘4 기압’을 눌러요', '#tab-particles'],
      ['피스톤에 부딪히는 횟수 비교하기', particlesDone, '위쪽의 ‘화살표·충돌 보기’를 켜고 외부 압력에 따라 부딪히는 횟수를 비교해요', '', '#show-detail'],
      ['생활 속 보일 법칙 2가지 살펴보기', lifeSeen.size >= 2, '‘생활 속 보일 법칙’ 탭에서 보기를 골라 단추를 눌러요', '#tab-life'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '주사기 속 공기를 누르면<br>압력은 어떻게 변할까?',
    lead: '피스톤을 30 mL에 맞춘 주사기의 입구에 압력계를 연결했어요. 지금은 1 기압이에요.<br>온도는 그대로 두고 피스톤을 밀어 기체의 부피를 바꿔 볼 거예요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="압력계를 연결한 주사기"><rect width="520" height="250" rx="12" fill="#121a33"/><circle cx="90" cy="120" r="56" fill="#f4f1e6" stroke="#8f9bc4" stroke-width="6"/><path d="M90 120 L90 74" stroke="#e04848" stroke-width="5" stroke-linecap="round"/><circle cx="90" cy="120" r="6" fill="#3a3f52"/><text x="90" y="156" text-anchor="middle" font-size="14" fill="#3a3f52">1 기압</text><path d="M146 120 H180" stroke="#9fb3d9" stroke-width="6"/><rect x="180" y="98" width="220" height="44" rx="4" fill="#dfeffa22" stroke="#cfe6f5" stroke-width="3"/>${Array.from({ length: 14 }, (_, i) => `<circle cx="${196 + (i % 7) * 12}" cy="${108 + Math.floor(i / 7) * 22 + (i % 2) * 6}" r="4" fill="#7fe7ff"/>`).join('')}<rect x="290" y="100" width="8" height="40" fill="#3a3f52"/><path d="M298 120 H470 M470 100 V140" stroke="#8f9bc4" stroke-width="8" stroke-linecap="round"/><text x="240" y="176" text-anchor="middle" font-size="15" fill="#ffd2a8">30 mL</text><path d="M440 70 L380 70" stroke="#ffd166" stroke-width="4" marker-end="url(#pv-arrow)"/><defs><marker id="pv-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffd166"/></marker></defs><text x="410" y="58" text-anchor="middle" font-size="14" fill="#ffd166">밀기</text></svg>`,
    question: '온도가 일정할 때 피스톤을 밀어 기체의 부피를 반(15 mL)으로 줄이면 압력은 어떻게 될까요?',
    choices: ['압력이 약 2배로 커질 것 같아요.', '압력이 커지지만 일정한 규칙은 없을 것 같아요.', '압력은 변하지 않을 것 같아요.', '압력이 작아질 것 같아요.'],
    placeholder: '공기를 넣은 주사기의 입구를 막고 피스톤을 눌러 본 경험이나, 바람을 넣은 풍선을 눌렀을 때를 떠올려 보세요.',
  },
  observe: {
    title: '주사기 속 기체의 압력과 부피를 재고, 입자 모형으로 그 까닭을 알아보세요.',
    recordLabel: '압력과 부피의 측정값, 입자 모형에서 본 것, 생활 속 예를 적어 보세요.',
    placeholder: '압력이 커질 때 부피는 어떻게 되었는지, 입자가 피스톤에 부딪히는 횟수는 어떻게 달라졌는지 적어 보세요.',
    parts: [
      { title: '주사기와 압력계', label: '측정한 압력과 부피를 바탕으로 둘 사이의 관계를 적어 보세요.', placeholder: '압력이 1 기압에서 2 기압이 될 때 부피는 어떻게 되었나요? 압력×부피 값도 살펴보세요.' },
      { title: '입자 모형', label: '외부 압력을 높였을 때 기체의 부피, 입자의 빠르기, 피스톤에 부딪히는 횟수를 적어 보세요.', placeholder: '1 기압, 2 기압, 4 기압일 때를 비교해 적어 보세요.' },
      { title: '생활 속 보일 법칙', label: '살펴본 생활 속 예에서 기체의 부피가 변한 모습과 그 까닭을 적어 보세요.', placeholder: '기포나 과자 봉지에 작용하는 바깥 압력은 어떻게 달라졌나요?' },
    ],
  },
  explain: {
    question: '기체의 압력과 부피 사이에는 어떤 관계가 있나요? 부피가 작아지면 압력이 커지는 까닭을 기체 입자의 운동으로 설명해 보세요.',
    concepts: [
      ['기체의 압력과 부피', '온도가 일정할 때 피스톤을 밀어 기체의 부피가 작아지면 <b class="subj">기체의 압력은</b> <b>커지고</b>, 피스톤을 당겨 부피가 커지면 압력은 작아져요.'],
      ['보일 법칙', '일정한 온도에서 일정량의 기체의 압력과 부피는 서로 <b>반비례</b>해요. 이를 <b>보일 법칙</b>이라고 해요.'],
      ['입자 모형', '부피가 작아지면 입자가 움직일 수 있는 공간이 줄어들어 <b class="subj">입자가 벽에 충돌하는 횟수가</b> <b>늘어나므로</b> 기체의 압력이 커져요.'],
      ['변하지 않는 것', '온도가 일정하면 기체 입자의 <b>운동 빠르기</b>는 변하지 않아요. 입자의 크기와 개수도 그대로예요.'],
      ['생활 속 보일 법칙', '잠수부가 내쉰 기포는 수면 가까이 올라갈수록 수압이 낮아져 <b class="subj">부피가</b> <b>커져요</b>. 높은 산에서는 대기압이 낮아 과자 봉지가 부풀어요.'],
    ],
    note: '기체의 부피는 외부 압력과 기체의 압력이 같아질 때까지 커지거나 작아져요. 보일 법칙이 성립하려면 온도와 기체의 양이 일정해야 해요.',
  },
  onRestart: () => {
    show = false; $('#show-detail').checked = false; cyl.setArrows(false);
    setMl(SYRINGE.startMl); records.length = 0; paintGraph();
    ext = 1; cyl.setExternal(1); cyl.settle(); extSeen = new Set([1]); particleTime = 0; particlesDone = false;
    life = 'diver'; lifeT = 0; lifeRun = false; chamberPumps = 0; lifeSeen.clear();
    lab.resetQuiz(); setMode('syringe');
  },
});
setMode('syringe');
requestAnimationFrame(frame);
