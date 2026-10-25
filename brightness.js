import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import './theme-space.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, reducedMotion } from './src/lab-shell.js';
import { STARS } from './src/space-stars.js';
import { intensityAt, compareTo10pc, MAG_STEP } from './src/space-model.js';
import { setSky } from './src/sky-image.js';
import { starColor } from './src/sky-render.js';
import { creditsHTML, SKY_CREDIT } from './src/space-photos.js';
import { fxCanvas, setAttr } from './src/space-fx.js';

// 교과서 280–283쪽, 지도서(별의 밝기와 등급).
// 지도상 유의점: 거리를 구하는 수식은 다루지 않아요. 1등급 차이는 약 2.5배, 5등급 차이는 100배라는 것과
// 겉보기 등급·절대 등급(10 pc)의 뜻, 두 등급을 비교해 10 pc보다 가까운지 먼지 판단하는 것까지 다뤄요.

const terms = [
  ['빛의 세기', '같은 넓이에 들어오는 빛의 양이에요. 광원에서 멀어질수록 빛이 넓게 퍼져 빛의 세기가 줄어요. 단위는 lx(럭스)예요.'],
  ['겉보기 등급', '지구에서 관측한 별의 상대적인 밝기를 숫자로 나타낸 것이에요. 숫자가 작을수록 밝은 별이에요.'],
  ['절대 등급', '모든 별이 지구로부터 10 pc 거리에 있다고 가정했을 때의 밝기를 숫자로 나타낸 것이에요. 별의 실제 밝기를 나타내요.'],
  ['등급과 밝기', '1등급 차이는 약 2.5배의 밝기 차이, 5등급 차이는 100배의 밝기 차이예요.'],
];
const DISTANCES = [20, 40, 60, 80];
const LUX20 = 720;                 // 20 cm에서 잰 빛의 세기(lx)
const LENS = { x: 112, y: 236 }, PX_PER_CM = 7.1;
const beamR = d => 7 + d * .95;    // 빛이 퍼진 반지름(그림, px)
const FRONT = { x: 616, y: 34, size: 150, cell: 30 };
const GRAPH = { x: 70, y: 52, w: 214, h: 100 };

// 등급 → 그림 속 별의 크기(px). 밝을수록(숫자가 작을수록) 크게.
const glyphR = m => Math.max(1.8, Math.min(34, 3.2 + (5.2 - m) * 2.3));
function starGlyph(m, rgb = [255, 255, 255], { rays = true } = {}) {
  const r = glyphR(m), c = `rgb(${rgb.join(',')})`, k = Math.max(.25, Math.min(1, (7 - m) / 6));
  return `<circle r="${(r * 2.6).toFixed(1)}" fill="${c}" opacity="${(.16 * k).toFixed(2)}"/><circle r="${(r * 1.25).toFixed(1)}" fill="${c}" opacity="${(.5 * k).toFixed(2)}"/><circle r="${(r * .5).toFixed(1)}" fill="#fff" opacity="${(.6 + .4 * k).toFixed(2)}"/>${rays && m < 2.5 ? `<path d="M${-r * 3} 0 H${r * 3} M0 ${-r * 3} V${r * 3}" stroke="${c}" stroke-width="1" opacity="${(.5 * k).toFixed(2)}"/>` : ''}`;
}

const tape = Array.from({ length: 10 }, (_, i) => { const x = LENS.x + i * 10 * PX_PER_CM; return `<path d="M${x} 348 V${i % 2 ? 354 : 357}" stroke="#5a4500" stroke-width="1.5"/><text x="${x + (i ? 0 : 6)}" y="370" text-anchor="middle" class="tape-num">${i * 10}</text>`; }).join('');
const frontGrid = Array.from({ length: 6 }, (_, i) => `<path d="M${FRONT.x + i * FRONT.cell} ${FRONT.y} V${FRONT.y + FRONT.size} M${FRONT.x} ${FRONT.y + i * FRONT.cell} H${FRONT.x + FRONT.size}" stroke="#ffffff22"/>`).join('');
const LADDER = { x0: 76, dx: 86, y: 112 };
const scene = `
<defs>
<linearGradient id="table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262a45"/><stop offset="1" stop-color="#0d1020"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6d6" stop-opacity=".75"/><stop offset=".35" stop-color="#fff1c4" stop-opacity=".32"/><stop offset="1" stop-color="#ffe9a8" stop-opacity=".08"/></linearGradient>
<radialGradient id="spot"><stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="#ffefb0" stop-opacity=".85"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>
<linearGradient id="torch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a93b8"/><stop offset=".5" stop-color="#3c4466"/><stop offset="1" stop-color="#1c2140"/></linearGradient>
<linearGradient id="tape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd84a"/><stop offset="1" stop-color="#e0b100"/></linearGradient>
<clipPath id="front-clip"><rect x="${FRONT.x}" y="${FRONT.y}" width="${FRONT.size}" height="${FRONT.size}"/></clipPath>
</defs>
<g id="light-view">
  <path d="M0 330 H800 V440 H0Z" fill="url(#table)"/>
  <rect x="${LENS.x - 8}" y="348" width="${PX_PER_CM * 92}" height="28" rx="3" fill="url(#tape)"/>${tape}<text x="${LENS.x + PX_PER_CM * 92 - 2}" y="394" text-anchor="end" class="tape-unit">줄자(cm)</text>
  <path id="beam-cone" fill="url(#beam)"/>
  <g id="torch-g"><rect x="18" y="222" width="80" height="28" rx="6" fill="url(#torch)"/><path d="M98 216 L${LENS.x} 212 L${LENS.x} 260 L98 256Z" fill="#5a6390"/><ellipse cx="${LENS.x}" cy="${LENS.y}" rx="5" ry="24" fill="#fff8dc"/><circle cx="${LENS.x + 4}" cy="${LENS.y}" r="30" fill="url(#spot)" opacity=".7"/><rect x="48" y="250" width="16" height="80" fill="#2f3556"/><rect x="30" y="326" width="52" height="8" rx="3" fill="#2f3556"/><text x="74" y="300" class="obj-name">손전등</text></g>
  <g id="meter"></g>
  <g id="front-view">
    <rect x="${FRONT.x - 12}" y="${FRONT.y - 26}" width="${FRONT.size + 24}" height="${FRONT.size + 62}" rx="12" fill="#070914ee" stroke="#2d3566"/>
    <text x="${FRONT.x + FRONT.size / 2}" y="${FRONT.y - 9}" text-anchor="middle" class="panel-title">종이판에 비친 빛(앞에서 본 모습)</text>
    <rect x="${FRONT.x}" y="${FRONT.y}" width="${FRONT.size}" height="${FRONT.size}" fill="#0b0b0f"/>
    <g clip-path="url(#front-clip)"><circle id="front-spot" cx="${FRONT.x + FRONT.size / 2}" cy="${FRONT.y + FRONT.size / 2}" fill="url(#spot)"/>${frontGrid}<circle id="front-ref" cx="${FRONT.x + FRONT.size / 2}" cy="${FRONT.y + FRONT.size / 2}" r="${FRONT.cell / 2}" fill="none" stroke="#8fd3ff" stroke-dasharray="3 3"/></g>
    <text id="front-read" x="${FRONT.x + FRONT.size / 2}" y="${FRONT.y + FRONT.size + 24}" text-anchor="middle" class="panel-text"></text>
  </g>
  <g id="graph"></g>
</g>
<g id="mag-view">
  <image id="orion-sky" x="0" y="0" width="800" height="440" preserveAspectRatio="none"/>
  <g id="orion-labels"></g>
  <rect x="14" y="34" width="540" height="168" rx="14" fill="#05071acc" stroke="#2d3566"/>
  <text x="30" y="56" class="panel-title">별의 등급과 밝기 차이</text>
  <g id="ladder"></g>
  <rect x="564" y="34" width="222" height="168" rx="14" fill="#05071acc" stroke="#2d3566"/>
  <g id="compare"></g>
</g>
<g id="abs-view">
  <g id="ten-pc"></g>
  <g id="abs-stars"></g>
  <rect x="462" y="12" width="326" height="272" rx="14" fill="#02030a" stroke="#8fd3ff55"/>
  <clipPath id="cma-clip"><rect x="466" y="16" width="318" height="264" rx="12"/></clipPath>
  <g clip-path="url(#cma-clip)"><image id="cma-sky" x="466" y="16" width="318" height="264" preserveAspectRatio="none"/><g id="cma-stars"></g></g>
  <rect x="476" y="24" width="188" height="24" rx="12" fill="#0a0d22cc"/><text x="488" y="41" class="panel-title" id="cma-title">실제 밤하늘(큰개자리)</text>
  <g id="abs-read" transform="translate(466 306)"></g>
</g>`;

const lab = buildLab({
  unit: 8,
  crumb: '별 02 별의 밝기와 등급',
  title: '별의 밝기는 어떻게 나타낼까?',
  intro: '',
  tabs: [{ id: 'light', label: '거리와 빛의 세기' }, { id: 'mag', label: '별의 등급' }, { id: 'abs', label: '겉보기 등급과 절대 등급' }],
  toggle: '빛 알갱이 보기',
  sceneLabel: '손전등과 밝기 측정 기기, 별의 등급, 10 pc로 옮긴 별',
  scene,
  terms,
});
$('.lab').insertAdjacentHTML('beforeend', creditsHTML([], [SKY_CREDIT]));
$('#show-detail').checked = true;
const fx = fxCanvas($('.stage'));

/* ---------- 상태 ---------- */
let tab = 'light', show = true, lastFrame = 0, flow = null, time = 0;
let d = 20, dShown = 20, tool = 'device', luxShown = 0;
const readings = {}, paperSeen = new Set();
let paperTimer = 0;
let picks = [];                    // 고른 두 등급
const compared = new Set();        // '1-2' 꼴
let moveU = 0, moveDir = 0, absDone = false;
const photons = Array.from({ length: 90 }, () => ({ t: Math.random(), a: (Math.random() * 2 - 1), z: Math.random() }));

/* ---------- 탐구: 거리와 빛의 세기 ---------- */
const luxAt = dist => intensityAt(LUX20, 20, dist);
function meterSVG(xd, lux) {
  const r = beamR(dShown);
  if (tool === 'device') {
    return `<g transform="translate(${xd} 0)"><path d="M0 300 L-26 330 M0 300 L26 330 M0 300 V330" stroke="#8f9bc4" stroke-width="3"/><rect x="-4" y="270" width="8" height="32" fill="#8f9bc4"/>
      <rect x="-30" y="190" width="60" height="96" rx="10" fill="#111528" stroke="#aab4d6" stroke-width="2"/><rect x="-25" y="198" width="50" height="80" rx="5" fill="#0d2240"/>
      <text x="0" y="214" text-anchor="middle" class="app-small">빛의 세기</text><text x="0" y="245" text-anchor="middle" class="app-big">${Math.round(lux)}</text><text x="0" y="262" text-anchor="middle" class="app-small">lx</text>
      <rect x="-18" y="268" width="36" height="5" rx="2" fill="#1d3d66"/><rect x="-18" y="268" width="${Math.min(36, 36 * lux / LUX20).toFixed(1)}" height="5" rx="2" fill="#ffd166"/>
      <text x="0" y="178" text-anchor="middle" class="obj-name">스마트 기기(밝기 측정 앱)</text></g>`;
  }
  const k = Math.min(1, (20 / dShown) ** 2);
  return `<g transform="translate(${xd} 0)"><rect x="-6" y="${LENS.y - 92}" width="12" height="172" rx="2" fill="#0b0b0f" stroke="#3a3f5c"/><ellipse cx="-6" cy="${LENS.y}" rx="${(3 + r * .08).toFixed(1)}" ry="${Math.min(88, r).toFixed(1)}" fill="url(#spot)" opacity="${(.25 + .75 * k).toFixed(2)}"/>
    <rect x="-3" y="${LENS.y + 80}" width="6" height="${330 - LENS.y - 80}" fill="#3a3f5c"/><text x="0" y="${LENS.y - 102}" text-anchor="middle" class="obj-name">검은색 종이판</text></g>`;
}
function graphSVG() {
  const { x, y, w, h } = GRAPH, X = cm => x + (cm / 90) * w, Y = lx => y + h - (lx / 800) * h;
  const pts = DISTANCES.filter(v => readings[v] !== undefined);
  const curve = pts.length >= 3 ? `<path d="${Array.from({ length: 60 }, (_, i) => { const cm = 15 + i * 70 / 59; return `${i ? 'L' : 'M'}${X(cm).toFixed(1)} ${Math.max(y, Y(luxAt(cm))).toFixed(1)}`; }).join('')}" fill="none" stroke="#ffd166" stroke-width="2" stroke-dasharray="5 4" opacity=".8"/>` : '';
  return `<rect x="${x - 46}" y="${y - 20}" width="${w + 64}" height="${h + 64}" rx="12" fill="#070914ee" stroke="#2d3566"/>
    <text x="${x - 36}" y="${y - 4}" class="panel-title">거리에 따른 빛의 세기</text>
    <path d="M${x} ${y + 6} V${y + h} H${x + w}" stroke="#aab4d6" fill="none"/>
    ${[0, 400, 800].map(v => `<text x="${x - 6}" y="${Y(v) + 4}" text-anchor="end" class="axis">${v}</text>`).join('')}
    ${DISTANCES.map(v => `<text x="${X(v)}" y="${y + h + 16}" text-anchor="middle" class="axis">${v}</text>`).join('')}
    <text x="${x + w}" y="${y + h + 32}" text-anchor="end" class="axis">거리(cm)</text><text x="${x + 4}" y="${y + 14}" class="axis">lx</text>
    ${curve}${pts.map(v => `<circle cx="${X(v)}" cy="${Y(readings[v])}" r="5" fill="#ffd166" stroke="#fff" stroke-width="1.5"/>`).join('')}`;
}
let luxTimer = 0, luxText = '';
function renderLight(dt) {
  const k = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 5);
  dShown += (d - dShown) * k;
  if (Math.abs(d - dShown) < .02) dShown = d;
  const xd = LENS.x + dShown * PX_PER_CM, r = beamR(dShown);
  setAttr($('#beam-cone'), 'd', `M${LENS.x} ${LENS.y - 20} L${xd.toFixed(1)} ${(LENS.y - r).toFixed(1)} L${xd.toFixed(1)} ${(LENS.y + r).toFixed(1)} L${LENS.x} ${LENS.y + 20}Z`);
  // 앱의 숫자는 실제 앱처럼 1초에 네 번 바뀌어요(측정값이 조금씩 흔들려요).
  luxTimer -= dt;
  if (luxTimer <= 0 || dShown !== d) {
    luxTimer = .25;
    luxShown = luxAt(dShown) * (1 + (dShown === d ? (Math.random() - .5) * .016 : 0));
  }
  setHTML('#meter', meterSVG(xd.toFixed(1), luxShown));
  // 빛 알갱이: 손전등에서 나와 사방으로 퍼지며 나아가요. 멀어질수록 알갱이 사이가 벌어져요.
  const g = show && !reducedMotion.matches && tab === 'light' ? fx.begin() : (fx.clear(), null);
  if (g) {
    const len = dShown * PX_PER_CM;
    g.fillStyle = '#fff6c8';
    for (const p of photons) {
      p.t += dt * .55; if (p.t > 1) { p.t -= 1; p.a = Math.random() * 2 - 1; p.z = Math.random(); }
      const spread = 20 + (r - 20) * p.t;
      g.globalAlpha = 1 - p.t * .35;
      g.beginPath(); g.arc(LENS.x + p.t * len, LENS.y + p.a * spread * Math.sqrt(p.z), 1.9, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
  }
  // 앞에서 본 종이판
  const spot = $('#front-spot');
  setAttr(spot, 'r', (FRONT.cell / 2 * dShown / 20).toFixed(1)); setAttr(spot, 'opacity', (.2 + .8 * Math.min(1, (20 / dShown) ** 2)).toFixed(2));
  setAttr($('#front-view'), 'opacity', tool === 'paper' ? 1 : .35);
  setText('#front-read', tool === 'paper' ? `${d} cm: 넓이는 20 cm일 때의 ${(d / 20) ** 2}배` : '‘검은색 종이판’으로 바꾸어 보세요');
  if (tool === 'paper' && dShown === d && !paperSeen.has(d)) { paperTimer += dt; if (paperTimer > .6) { paperSeen.add(d); paperTimer = 0; renderText(); } }
  setHTML('#graph', graphSVG());
}
function record() {
  if (tool !== 'device') return;
  const v = Math.round(luxAt(d));
  readings[d] = v;
  toast(`✏️ ${d} cm에서 빛의 세기 ${v} lx를 기록했어요`);
  renderControls();
}

/* ---------- 별의 등급 ---------- */
// [이름, 적경, 적위, 겉보기 등급, 이름표 방향(1: 오른쪽, -1: 왼쪽), 이름표 위아래 옮김]
const ORION = [['리겔', 78.63, -8.2, .1, 1, 4], ['베텔게우스', 88.79, 7.41, .5, -1, 0], ['벨라트릭스', 81.28, 6.35, 1.6, 1, 0], ['알닐람', 84.05, -1.2, 1.7, -1, 6], ['민타카', 83.0, -.3, 2.2, 1, -8], ['사이프', 86.94, -9.67, 2.1, -1, 4], ['시리우스', 101.29, -16.72, -1.5, 1, 0], ['프로키온', 114.83, 5.22, .4, 1, 0]];
let orionProject = null;
function ladderSVG() {
  const items = [1, 2, 3, 4, 5, 6].map(m => {
    const x = LADDER.x0 + (m - 1) * LADDER.dx, picked = picks.includes(m);
    return `<g transform="translate(${x} ${LADDER.y})">${picked ? `<circle r="34" fill="none" stroke="#ffcf6e" stroke-width="2" stroke-dasharray="4 3"/>` : ''}${starGlyph(m)}<text y="56" text-anchor="middle" class="ladder-num">${m}등급</text></g>${m < 6 ? `<text x="${x + LADDER.dx / 2}" y="${LADDER.y - 34}" text-anchor="middle" class="ladder-step">×2.5</text><path d="M${x + LADDER.dx * .3} ${LADDER.y - 28} H${x + LADDER.dx * .7}" stroke="#8fd3ff88" marker-end="url(#arrow-head)"/>` : ''}`;
  }).join('');
  const x1 = LADDER.x0, x6 = LADDER.x0 + 5 * LADDER.dx;
  return `${items}<path d="M${x1} ${LADDER.y + 66} V${LADDER.y + 72} H${x6} V${LADDER.y + 66}" fill="none" stroke="#ffcf6e"/><text x="${(x1 + x6) / 2}" y="${LADDER.y + 72 + 1}" text-anchor="middle" class="ladder-hundred" dy="-4">← 밝다 · 1등급 별은 6등급 별보다 100배 밝아요 · 어둡다 →</text>`;
}
const ratioText = n => (n === 5 ? '100' : MAG_STEP ** n >= 10 ? Math.round(MAG_STEP ** n) : (MAG_STEP ** n).toFixed(1));
function compareSVG() {
  if (picks.length < 2) return `<text x="675" y="84" text-anchor="middle" class="panel-title">두 등급 비교하기</text><text x="675" y="120" text-anchor="middle" class="panel-text">아래 단추에서</text><text x="675" y="142" text-anchor="middle" class="panel-text">등급을 두 개 골라 보세요</text>`;
  const [a, b] = [...picks].sort((x, y) => x - y), n = b - a, ratio = MAG_STEP ** n;
  const count = Math.min(100, Math.round(ratio * 10) / 10), cols = count > 40 ? 10 : count > 9 ? 7 : 4, s = count > 40 ? 9 : count > 9 ? 12 : 18;
  const full = Math.floor(count), frac = count - full;
  const dots = Array.from({ length: Math.ceil(count) }, (_, i) => { const cx = 690 + (i % cols) * s - (cols - 1) * s / 2 + 26, cy = 114 + Math.floor(i / cols) * s - (Math.ceil(count / cols) - 1) * s / 2; return `<circle cx="${cx}" cy="${cy}" r="${Math.max(1.6, s * .22)}" fill="#fff" opacity="${i < full ? .9 : Math.max(.15, frac).toFixed(2)}"/>`; }).join('');
  return `<text x="675" y="58" text-anchor="middle" class="panel-title">${a}등급 별 1개 = ${b}등급 별 약 ${count >= 10 ? Math.round(count) : count}개</text>
    <g transform="translate(608 114)">${starGlyph(a, [255, 255, 255], { rays: false })}</g><text x="642" y="120" class="ladder-num">=</text>${dots}
    <text x="675" y="${count > 40 ? 172 : 160}" text-anchor="middle" class="panel-small">${n === 1 ? '1등급 차이: 약 2.5배' : `${Array(n).fill('2.5').join(' × ')} ≈ ${ratioText(n)}`}</text>
    <text x="675" y="194" text-anchor="middle" class="panel-strong" style="font-size:13.5px">${a}등급이 ${b}등급보다 약 ${ratioText(n)}배 밝아요</text>`;
}
function renderMag() {
  setHTML('#ladder', ladderSVG());
  setHTML('#compare', compareSVG());
  if (orionProject) setHTML('#orion-labels', ORION.map(([name, ra, dec, m, side, dy]) => { const p = orionProject(ra, dec); if (!p || p[1] < 212) return ''; const r = 12; return `<g transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})"><circle r="${r}" fill="none" stroke="#ffcf6e88"/><text x="${side * (r + 6)}" y="${5 + dy}" text-anchor="${side > 0 ? 'start' : 'end'}" class="sky-label">${name} <tspan class="sky-mag">${fmtMag(m)}등급</tspan></text></g>`; }).join(''));
}
function pick(m) {
  if (picks.includes(m)) picks = picks.filter(v => v !== m);
  else picks = [...picks.slice(-1), m];
  if (picks.length === 2) {
    const [a, b] = [...picks].sort((x, y) => x - y);
    compared.add(`${a}-${b}`);
    toast(`⭐ ${a}등급 별은 ${b}등급 별보다 약 ${ratioText(b - a)}배 밝아요`);
  }
  renderControls();
}

/* ---------- 겉보기 등급과 절대 등급 ---------- */
const TEN = { x: 46, y: 404, R: 236 };
const ABS = [['sun', 14], ['sirius', 48], ['mirzam', 28], ['polaris', 72]];
const distR = pc => (pc >= 1 ? TEN.R * (1 + .45 * Math.log10(pc / 10)) : 34 + (TEN.R * .55 - 34) * (Math.log10(pc) - Math.log10(STARS.sun.dist)) / -Math.log10(STARS.sun.dist));
const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const fmtMag = m => `${m < 0 ? '−' : ''}${Math.abs(m).toFixed(1)}`;
let cmaProject = null;
function absState(key) {
  const s = STARS[key], u = easeIO(moveU);
  // 거리는 10 pc까지 눈금(로그)을 따라 부드럽게 옮기고, 보이는 등급은 교과서의 겉보기 등급에서 절대 등급으로 바뀌어요.
  const dist = Math.exp(Math.log(s.dist) + (Math.log(10) - Math.log(s.dist)) * u);
  return { s, dist, m: s.m + (s.M - s.m) * u };
}
function renderAbs(dt) {
  if (moveDir) {
    moveU = Math.max(0, Math.min(1, moveU + moveDir * dt / (reducedMotion.matches ? .01 : 3.6)));
    if (moveU === 1 && moveDir > 0) { moveDir = 0; if (!absDone) { absDone = true; toast('🔭 모든 별이 10 pc에 있어요! 이제 별의 밝기가 곧 절대 등급이에요. 미르잠이 시리우스보다 밝아졌어요'); } renderControls(); }
    if (moveU === 0 && moveDir < 0) { moveDir = 0; renderControls(); }
  }
  const { x, y, R } = TEN;
  setHTML('#ten-pc', `<circle cx="${x}" cy="${y}" r="16" fill="#2f74c8"/><circle cx="${x}" cy="${y}" r="26" fill="#6fb6ff" opacity=".15"/><text x="${x + 2}" y="${y + 34}" text-anchor="middle" class="obj-name">지구</text>
    <path d="M${x + R} ${y} A${R} ${R} 0 0 0 ${x} ${y - R}" fill="none" stroke="#ffcf6e" stroke-width="2" stroke-dasharray="7 6"/><text x="${x + 6}" y="${y - R - 10}" class="ten-label">10 pc</text>
    <text x="${x + R + 8}" y="${y + 24}" class="axis">10 pc 바깥: 10 pc보다 멀다</text><text x="${x + 46}" y="${y + 24}" class="axis">10 pc 안쪽: 가깝다</text>`);
  setHTML('#abs-stars', ABS.map(([key, deg]) => {
    const { s, dist, m } = absState(key), r = distR(dist), a = deg * Math.PI / 180;
    const px = x + Math.cos(a) * r, py = y - Math.sin(a) * r, rgb = starColor(s.bv);
    const sunLike = key === 'sun' && m < -5;
    return `<path d="M${x} ${y} L${(x + Math.cos(a) * 420).toFixed(1)} ${(y - Math.sin(a) * 420).toFixed(1)}" stroke="#ffffff10"/>
      <g transform="translate(${px.toFixed(1)} ${py.toFixed(1)})">${sunLike ? `<circle r="30" fill="#ffd27a" opacity=".25"/><circle r="15" fill="#ffd27a"/><circle r="7" fill="#fff"/>` : starGlyph(m, rgb)}
      <text x="${key === 'sun' ? 22 : glyphR(m) + 10}" y="${key === 'sun' ? -14 : 4}" class="sky-label">${s.name} <tspan class="sky-mag">${fmtMag(m)}등급</tspan></text></g>`;
  }).join(''));
  // 실제 밤하늘의 시리우스와 미르잠: 10 pc로 옮기면 밝기가 바뀌어요.
  if (cmaProject) setHTML('#cma-stars', ['sirius', 'mirzam'].map(key => { const { s, m } = absState(key), p = cmaProject(s.ra, s.dec); return p ? `<g transform="translate(${(466 + p[0]).toFixed(1)} ${(16 + p[1]).toFixed(1)})">${starGlyph(m, starColor(s.bv))}<text x="${glyphR(m) + 12}" y="${key === 'sirius' ? -8 : 18}" class="sky-label">${s.name} <tspan class="sky-mag">${fmtMag(m)}등급</tspan></text></g>` : ''; }).join(''));
  setText('#cma-title', moveU > .98 ? '두 별을 10 pc에 둔다면' : moveU > 0 ? '10 pc로 옮기는 중…' : '실제 밤하늘(큰개자리)');
  setHTML('#abs-read', `<text class="panel-text"><tspan x="0" dy="0">${moveU > .98 ? '10 pc에 두면 겉보기 등급 = 절대 등급이에요.' : '지구에서 보이는 밝기 = 겉보기 등급이에요.'}</tspan><tspan x="0" dy="22" class="panel-small">별의 크기는 밝기를 나타내요(실제 크기가 아니에요).</tspan><tspan x="0" dy="20" class="panel-small">거리는 눈금이 10배씩 커지게 줄여 그렸어요.</tspan></text>`);
}

/* ---------- 조작 단추 ---------- */
function renderControls() {
  if (tab === 'light') {
    $('#controls').innerHTML = `<div role="group" aria-label="거리"><span class="group-label">손전등과의 거리</span>${DISTANCES.map(v => `<button data-d="${v}" aria-pressed="${d === v}">${v} cm</button>`).join('')}</div>
      <div role="group" aria-label="측정 도구"><button data-tool="device" aria-pressed="${tool === 'device'}">📱 스마트 기기</button><button data-tool="paper" aria-pressed="${tool === 'paper'}">⬛ 검은색 종이판</button></div>`;
    $('#actions').innerHTML = `<button id="record-lux" class="primary" ${tool === 'device' ? '' : 'disabled'}>✏️ 빛의 세기 기록하기</button>`;
    $$('[data-d]').forEach(b => b.onclick = () => { d = +b.dataset.d; paperTimer = 0; renderControls(); });
    $$('[data-tool]').forEach(b => b.onclick = () => { tool = b.dataset.tool; renderControls(); });
    $('#record-lux').onclick = record;
  } else if (tab === 'mag') {
    $('#controls').innerHTML = `<div role="group" aria-label="비교할 등급 고르기"><span class="group-label">비교할 두 등급</span>${[1, 2, 3, 4, 5, 6].map(m => `<button data-mag="${m}" aria-pressed="${picks.includes(m)}">${m}등급</button>`).join('')}</div>`;
    $('#actions').innerHTML = '';
    $$('[data-mag]').forEach(b => b.onclick = () => pick(+b.dataset.mag));
    renderMag();
  } else {
    $('#controls').innerHTML = `<button id="to-10pc" ${moveDir || moveU === 1 ? 'disabled' : ''}>🚀 모든 별을 10 pc로 옮기기</button><button id="back-pc" ${moveDir || moveU === 0 ? 'disabled' : ''}>↩ 원래 거리로 되돌리기</button>`;
    $('#actions').innerHTML = '';
    $('#to-10pc').onclick = () => { moveDir = 1; renderControls(); };
    $('#back-pc').onclick = () => { moveDir = -1; renderControls(); };
  }
  renderText();
}
function setTab(id) {
  tab = id; lab.selectTab(id);
  $('.stage').dataset.tab = id;
  fx.clear();
  if (id === 'mag') renderMag();
  renderControls();
}
function renderText() {
  const T = {
    light: ['손전등에서 멀어질수록 빛의 세기는 어떻게 달라질까요?', '거리를 20 cm씩 멀리 하며 스마트 기기로 빛의 세기를 재어 기록해요. 검은색 종이판으로 바꾸면 빛이 비친 영역의 크기와 밝기를 볼 수 있어요.'],
    mag: ['별의 등급과 밝기 사이에는 어떤 관계가 있을까요?', '등급 단추를 두 개 골라 밝기를 비교해 보세요. 아래는 실제 밤하늘의 오리온자리 부근이에요.'],
    abs: ['모든 별을 같은 거리(10 pc)에 둔다면 어느 별이 더 밝을까요?', '‘모든 별을 10 pc로 옮기기’를 누르고 별들의 밝기가 어떻게 바뀌는지 봐요. 시리우스와 미르잠을 비교해 보세요.'],
  }[tab];
  setText('#guide', T[0]); setText('#subguide', T[1]);
  setText('#stage-state', tab === 'light' ? `손전등에서 ${d} cm · ${tool === 'device' ? '스마트 기기로 재는 중' : '검은색 종이판'}` : tab === 'mag' ? '실제 밤하늘 · 오리온자리' : '같은 거리(10 pc)에서 비교하기');
  setText('#note-title', { light: '멀어질수록 빛의 세기는?', mag: '등급의 숫자가 클수록?', abs: '시리우스와 미르잠, 실제로 더 밝은 별은?' }[tab]);
  setText('#note-text', { light: '광원에서 나온 빛은 사방으로 퍼져 나가요. 멀어질수록 더 넓은 영역을 비추므로 같은 넓이에 들어오는 빛의 양이 줄어요.', mag: '등급을 나타내는 숫자가 클수록 더 어두운 별이에요. 1등급보다 밝은 별은 0, −1, −2 … 등급, 6등급보다 어두운 별은 7, 8, 9 … 등급으로 나타내요.', abs: '밝기가 같아도 거리가 멀면 어둡게 보여요. 별의 실제 밝기를 비교하려면 모든 별을 같은 거리(10 pc)에 두고 비교해야 해요.' }[tab]);
  setHTML('#readout', `<table class="data-table"><tr><th>거리(cm)</th>${DISTANCES.map(v => `<th>${v}</th>`).join('')}</tr><tr><td>빛의 세기(lx)</td>${DISTANCES.map(v => `<td>${readings[v] ?? ''}</td>`).join('')}</tr><tr><td>빛이 비친 넓이</td>${DISTANCES.map(v => `<td>${paperSeen.has(v) ? `${(v / 20) ** 2}배` : ''}</td>`).join('')}</tr></table>
    <table class="data-table"><tr><th>별</th><th>겉보기 등급</th><th>절대 등급</th><th>10 pc보다</th></tr>${ABS.map(([k]) => { const s = STARS[k], c = compareTo10pc(s.m, s.M); return `<tr><td>${s.name}</td><td>${fmtMag(s.m)}</td><td>${absDone ? fmtMag(s.M) : ''}</td><td>${absDone ? (c === 'nearer' ? '가깝다' : c === 'farther' ? '멀다' : '같다') : ''}</td></tr>`; }).join('')}</table>`);
  setText('#model-note', '빛의 세기는 손전등의 밝기와 거리에 따라 달라지므로, 실제로 재면 숫자는 조금씩 달라요. 화면의 별 크기는 밝기를 나타낸 것이고, 실제 별의 크기가 아니에요. 등급은 교과서 값을 썼어요(태양 −26.7/4.8, 시리우스 −1.5/1.4, 미르잠 2.0/−4.1, 북극성 2.1/−3.7).');
  setText('#discovery', '고대 그리스의 천문학자 히파르코스는 맨눈으로 가장 밝게 보이는 별을 1등급, 가장 어둡게 보이는 별을 6등급으로 나누었어요. 19세기에 조도계가 개발되면서 1등급 별이 6등급 별보다 100배 밝다는 것을 알게 되었어요.');
}
$('#tab-light').onclick = () => setTab('light');
$('#tab-mag').onclick = () => setTab('mag');
$('#tab-abs').onclick = () => setTab('abs');
$('#show-detail').onchange = e => { show = e.target.checked; };
$('#reset').onclick = () => { d = 20; tool = 'device'; picks = []; moveU = 0; moveDir = 0; renderControls(); };
setSky($('#orion-sky'), { ra: 88, dec: 6.5, fov: 50, width: 800, height: 440, milkyWay: .8, lines: ['Ori', 'CMa', 'CMi', 'Mon'], maxMag: 6 }).then(p => { orionProject = p; renderMag(); });
setSky($('#cma-sky'), { ra: 99, dec: -19, fov: 30, width: 318, height: 264, milkyWay: .9, lines: ['CMa'], maxMag: 6, skip: (r, dd) => [STARS.sirius, STARS.mirzam].some(s => Math.abs(r - s.ra) < .3 && Math.abs(dd - s.dec) < .3), skipKey: 'cma' }).then(p => { cmaProject = p; });

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now; time += dt;
  if (!flow || flow.stage === 'observe') {
    if (tab === 'light') renderLight(dt);
    else if (tab === 'abs') renderAbs(dt);
    flow?.update(checklist([
      ['20 cm에서 빛의 세기 재어 기록하기', readings[20] !== undefined, '‘20 cm’에서 ‘빛의 세기 기록하기’를 눌러요'],
      ['40 cm, 60 cm, 80 cm에서 빛의 세기 재기', [40, 60, 80].every(v => readings[v] !== undefined), '‘40 cm’를 누르고 ‘빛의 세기 기록하기’를 눌러요. 60 cm, 80 cm도 같은 방법으로 재요', '[data-d="40"], [data-d="60"], [data-d="80"]'],
      ['검은색 종이판으로 빛이 비친 영역 비교하기', paperSeen.size >= 2, '‘검은색 종이판’을 누르고 거리를 바꾸며 빛이 비친 영역의 크기와 밝기를 봐요', '[data-tool="paper"]'],
      ['등급에 따른 밝기 차이 비교하기', [...compared].some(c => c.split('-')[1] - c.split('-')[0] === 1) && compared.has('1-6'), '‘별의 등급’ 탭에서 이웃한 두 등급(예: ‘1등급’과 ‘2등급’)을 고르고, ‘1등급’과 ‘6등급’도 골라 비교해요', '#tab-mag'],
      ['모든 별을 10 pc로 옮겨 겉보기 등급과 절대 등급 비교하기', absDone, '‘겉보기 등급과 절대 등급’ 탭에서 ‘모든 별을 10 pc로 옮기기’를 눌러요', '#tab-abs'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '손전등에서 2배 멀어지면<br>빛의 세기는 어떻게 될까?',
    lead: '밤하늘의 별은 밝게 빛나는 별도 있고 어두워서 잘 보이지 않는 별도 있어요. 같은 밝기의 가로등이라도 멀리 있으면 어둡게 보이죠.<br>손전등에서 20 cm, 40 cm, 60 cm, 80 cm 떨어진 곳에서 스마트 기기로 빛의 세기를 재 볼 거예요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="손전등에서 나온 빛이 퍼져 나가 스마트 기기에 닿는 모습"><rect width="520" height="250" rx="12" fill="#0a0d22"/><path d="M90 118 L430 50 L430 190 L90 132Z" fill="#fff1c4" opacity=".18"/><rect x="30" y="110" width="60" height="30" rx="6" fill="#5a6390"/><ellipse cx="92" cy="125" rx="4" ry="16" fill="#fff8dc"/><rect x="200" y="96" width="34" height="58" rx="6" fill="#111528" stroke="#aab4d6"/><text x="217" y="131" text-anchor="middle" font-size="13" fill="#ffd166">? lx</text><rect x="400" y="96" width="34" height="58" rx="6" fill="#111528" stroke="#aab4d6"/><text x="417" y="131" text-anchor="middle" font-size="13" fill="#ffd166">? lx</text><path d="M92 200 H217 M92 222 H417" stroke="#8fd3ff" marker-end="url(#arrow-head)"/><text x="160" y="195" font-size="13" fill="#cbd8ff">20 cm</text><text x="300" y="217" font-size="13" fill="#cbd8ff">40 cm (2배)</text></svg>`,
    question: '손전등과 스마트 기기 사이의 거리를 20 cm에서 40 cm로 2배 멀리 하면, 빛의 세기는 어떻게 될까요?',
    choices: ['약 1/2배로 줄어들 것 같아요.', '약 1/4배로 줄어들 것 같아요.', '거의 그대로일 것 같아요.', '아직 잘 모르겠어요.'],
    placeholder: '손전등으로 벽을 비출 때, 멀리서 비추면 빛이 비친 곳의 크기와 밝기가 어땠는지 떠올려 보세요.',
  },
  observe: {
    title: '거리에 따른 빛의 세기를 재고, 별의 등급을 비교해 보세요.',
    recordLabel: '거리에 따른 빛의 세기와 빛이 비친 영역, 등급에 따른 밝기 차이, 10 pc로 옮겼을 때 별의 밝기 변화를 적어 보세요.',
    placeholder: '20, 40, 60, 80 cm에서 잰 빛의 세기, 거리가 2배가 될 때 빛의 세기가 몇 배가 되었는지, 시리우스와 미르잠을 10 pc로 옮겼을 때 어떻게 달라졌는지 적어 보세요.',
  },
  explain: {
    question: '손전등을 별이라고 한다면 별의 밝기는 거리에 따라 어떻게 달라질까요? 겉보기 등급과 절대 등급의 차이와 함께 관찰 결과를 근거로 설명해 보세요.',
    concepts: [
      ['거리와 빛의 세기', '광원에서 나온 빛은 사방으로 퍼져 나가므로 멀어질수록 더 넓은 영역을 비추어, 같은 넓이에 들어오는 빛의 양이 줄어요. 거리가 2배, 3배, 4배로 멀어지면 빛의 세기는 1/4배, 1/9배, 1/16배로 줄어들어요. 별의 밝기도 거리에 따라 달라져요.'],
      ['겉보기 등급', '지구에서 관측한 별의 상대적인 밝기를 숫자로 나타낸 것이에요. 숫자가 작을수록 밝은 별이에요. 1등급 별은 6등급 별보다 100배 밝고, 1등급 차이는 약 2.5배의 밝기 차이예요.'],
      ['절대 등급', '모든 별이 지구로부터 10 pc 거리에 있다고 가정하고, 이때 별의 밝기를 숫자로 나타낸 것이에요. 절대 등급은 별의 실제 밝기를 나타내요.'],
      ['두 등급으로 거리 비교하기', '겉보기 등급이 절대 등급보다 작으면 10 pc보다 가까이, 크면 10 pc보다 멀리 있는 별이에요. 시리우스는 미르잠보다 밝게 보이지만 실제로는 미르잠이 더 밝아요. 시리우스가 지구에 더 가까이 있기 때문이에요.'],
    ],
    note: '맨눈으로 볼 수 없는 어두운 별은 6등급보다 큰 7, 8, 9 … 등급으로 나타내요. 겉보기 등급과 절대 등급이 같은 별은 10 pc 거리에 있어요.',
  },
  onRestart: () => {
    show = true; $('#show-detail').checked = true;
const fx = fxCanvas($('.stage'));
    for (const k of Object.keys(readings)) delete readings[k];
    paperSeen.clear(); compared.clear(); absDone = false;
    lab.resetQuiz(); $('#reset').click(); setTab('light');
  },
});
setTab('light');
requestAnimationFrame(frame);
