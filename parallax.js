import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import './theme-space.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, reducedMotion, instantLessons } from './src/lab-shell.js';
import { setupViewToggle } from './src/view-toggle.js';
import { STARS, lightYears } from './src/space-stars.js';
import { parallaxArcsec, parallaxMeasurable } from './src/space-model.js';
import { BOARD, sightOnScale, scaleNumber, circled, boardParallax, STAR_X, STAR_Y, SKY_CENTER, earthAt, sub, annualParallaxDeg, REAL_STARS } from './src/parallax-model.js';
import { skyBasis } from './src/space-3d.js';
import { setSky } from './src/sky-image.js';
import { starColor } from './src/sky-render.js';
import { creditsHTML, SKY_CREDIT } from './src/space-photos.js';

// 교과서 276–279쪽, 지도서(별까지의 거리, 1~2차시).
// 지도상 유의점: 거리를 구하는 수식은 다루지 않고, 시차·연주 시차와 거리의 관계를 정성적으로 이해해요.
// 연주 시차의 단위 ″(초), 1 pc ≈ 3.26 광년, 100 pc보다 먼 별은 연주 시차로 거리를 알기 어렵다는 것까지 다뤄요.

const terms = [
  ['시차', '관측자의 위치에 따라 물체가 보이는 방향이 달라지는 정도예요. 두 관측 지점과 물체가 이루는 각도로 나타내요.'],
  ['연주 시차', '지구에서 6개월 간격으로 별을 관측하여 잰 시차의 1/2이에요. 가까운 별일수록 연주 시차가 커요.'],
  ['″(초)', '아주 작은 각도의 단위예요. 1°(도) = 60′(분) = 3600″(초)예요.'],
  ['pc(파섹)', '연주 시차가 1″인 별까지의 거리예요. 1 pc은 약 3.26 광년이에요.'],
  ['광년', '빛이 1년 동안 가는 거리예요.'],
];
// 시차 측정 판(그림 좌표): 구멍 사이 가운데를 (230, 398)에 두고 1 cm = 12.4 px
const B0 = { x: 230, y: 398, k: 12.4 };
const bp = (x, y) => [B0.x + x * B0.k, B0.y - y * B0.k];
const PEEK = { cx: 622, cy: 152, r: 124, k: 7.4 }; // ‘구멍으로 본 모습’ 창
const INSET = { x: 506, y: 14, w: 282, h: 266 };     // ‘지구에서 본 하늘’ 창
const starPath = (cx, cy, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join('') + 'Z';

const scaleMarks = Array.from({ length: BOARD.marks }, (_, i) => { const [x, y] = bp(BOARD.scaleStart + i * BOARD.scaleStep, BOARD.scaleY); return `<text x="${x}" y="${y + 6}" text-anchor="middle" class="board-num">${circled(i + 1)}</text>`; }).join('');
const peekMarks = Array.from({ length: BOARD.marks }, (_, i) => `<text x="${PEEK.cx + (BOARD.scaleStart + i * BOARD.scaleStep) * PEEK.k}" y="${PEEK.cy - 24}" text-anchor="middle" class="peek-num">${circled(i + 1)}</text>`).join('');
const model = (id, fill) => { const { x, y, name } = BOARD.models[id]; const [px, py] = bp(x, y); return `<g class="board-model" data-board-model="${id}"><ellipse cx="${px}" cy="${py + 13}" rx="9" ry="3" fill="#0004"/><path d="${starPath(px, py, 13)}" fill="${fill}" stroke="#7a5a00" stroke-width="1.2"/><text x="${px + 18}" y="${py + 5}" class="board-label">${name}</text></g>`; };
const scene = `
<defs>
<linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4efe2"/><stop offset="1" stop-color="#e2dac6"/></linearGradient>
<radialGradient id="peek-bg" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#fbf6e9"/><stop offset=".8" stop-color="#ddd3bd"/><stop offset="1" stop-color="#b9ae96"/></radialGradient>
<radialGradient id="vignette" cx=".5" cy=".5" r=".5"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
<clipPath id="peek-clip"><circle cx="${PEEK.cx}" cy="${PEEK.cy}" r="${PEEK.r}"/></clipPath>
<clipPath id="inset-clip"><rect x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}" rx="14"/></clipPath>
<radialGradient id="sun-glow"><stop offset="0" stop-color="#fff6d8"/><stop offset=".25" stop-color="#ffd27a"/><stop offset=".6" stop-color="#ff9f4a" stop-opacity=".35"/><stop offset="1" stop-color="#ff9f4a" stop-opacity="0"/></radialGradient>
<radialGradient id="star-glow-x"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#ffe7c2"/><stop offset="1" stop-color="#ffcf6e" stop-opacity="0"/></radialGradient>
<radialGradient id="star-glow-y"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#dfe9ff"/><stop offset="1" stop-color="#8fd3ff" stop-opacity="0"/></radialGradient>
<radialGradient id="earth-ball" cx=".35" cy=".35"><stop offset="0" stop-color="#9fd4ff"/><stop offset=".55" stop-color="#2f74c8"/><stop offset="1" stop-color="#0c2a5a"/></radialGradient>
</defs>
<g id="board-view">
  <rect x="22" y="34" width="416" height="400" rx="10" fill="url(#paper)" stroke="#bfb397"/>
  <path d="M22 84 H438" stroke="#c9bfa6" stroke-dasharray="5 5"/>
  <g id="board-scale">${scaleMarks}</g>
  <g id="board-sights">${['a', 'b'].flatMap(id => ['left', 'right'].map(h => { const hx = BOARD.holes[h], [x0, y0] = bp(hx, 0), [x1, y1] = bp(sightOnScale(hx, BOARD.models[id]), BOARD.scaleY), c = id === 'a' ? '#d9480f' : '#1c6dd0'; return `<g data-sight="${id}-${h}"><path class="sight" d="M${x0} ${y0} L${x1} ${y1}" stroke="${c}" pathLength="1"/><path class="sight-mark" d="M${x1 - 6} ${y1 + 14} L${x1} ${y1 + 4} L${x1 + 6} ${y1 + 14}Z" fill="${c}"/></g>`; })).join('')}</g>
  ${model('a', '#ffd84a')}${model('b', '#ffe98f')}
  <g id="protractor" opacity="0"></g>
  ${['left', 'right'].map(h => { const [x, y] = bp(BOARD.holes[h], 0); return `<g class="hole" data-hole-mark="${h}"><circle cx="${x}" cy="${y}" r="9" fill="#2a2418" stroke="#7d6f55" stroke-width="2"/><text x="${x}" y="${y + 26}" text-anchor="middle" class="board-small">${h === 'left' ? '왼쪽 구멍' : '오른쪽 구멍'}</text><text class="eye" x="${x}" y="${y + 5}" text-anchor="middle">👁</text></g>`; }).join('')}
</g>
<g id="peek-view">
  <rect x="${PEEK.cx - 166}" y="8" width="332" height="306" rx="14" fill="#060815" stroke="#2d3566"/>
  <text x="${PEEK.cx}" y="22" text-anchor="middle" class="peek-title" id="peek-title">구멍으로 본 모습</text>
  <g clip-path="url(#peek-clip)">
    <rect x="${PEEK.cx - PEEK.r}" y="${PEEK.cy - PEEK.r}" width="${PEEK.r * 2}" height="${PEEK.r * 2}" fill="url(#peek-bg)"/>
    <rect x="${PEEK.cx - PEEK.r}" y="${PEEK.cy - 50}" width="${PEEK.r * 2}" height="40" fill="#efe6cf"/>
    ${peekMarks}
    <g id="peek-star"><path d="${starPath(0, 0, 20)}" fill="#ffd84a" stroke="#7a5a00" stroke-width="1.5"/><rect x="-2" y="18" width="4" height="70" fill="#a08960"/></g>
    <circle cx="${PEEK.cx}" cy="${PEEK.cy}" r="${PEEK.r}" fill="url(#vignette)"/>
  </g>
  <circle cx="${PEEK.cx}" cy="${PEEK.cy}" r="${PEEK.r}" fill="none" stroke="#3a3324" stroke-width="6"/>
  <text x="${PEEK.cx}" y="${PEEK.cy + PEEK.r + 26}" text-anchor="middle" class="peek-read" id="peek-read"></text>
  <g id="board-result" transform="translate(${PEEK.cx - 166} 324)"></g>
</g>
<g id="orbit-view">
  <g id="orbit2d">
    <rect x="16" y="22" width="470" height="54" rx="10" fill="#0b1030" stroke="#2d3566"/>
    <g id="bg-stars">${Array.from({ length: 70 }, (_, i) => { const x = 24 + ((i * 97) % 452), y = 30 + ((i * 53) % 40), r = .6 + ((i * 7) % 5) * .25; return `<circle cx="${x}" cy="${y}" r="${r}" fill="${['#fff', '#cfe0ff', '#ffe2c4'][i % 3]}"/>`; }).join('')}</g>
    <text x="24" y="92" class="orbit-small">멀리 있는 별들(배경)</text>
    <g id="sight2d"></g>
    <ellipse cx="250" cy="350" rx="160" ry="46" fill="none" stroke="#8fd3ff" stroke-opacity=".55" stroke-dasharray="4 5"/>
    <circle cx="250" cy="350" r="46" fill="url(#sun-glow)"/><circle cx="250" cy="350" r="15" fill="#ffd27a"/><text x="250" y="390" text-anchor="middle" class="orbit-small">태양</text>
    <text x="418" y="356" class="orbit-label">A</text><text x="70" y="356" class="orbit-label">B</text>
    <circle cx="${250 + STAR_X[0] * 30}" cy="200" r="22" fill="url(#star-glow-x)"/><text x="${250 + STAR_X[0] * 30 + 16}" y="190" class="orbit-label">별 X</text>
    <circle cx="${250 + STAR_Y[0] * 30}" cy="128" r="16" fill="url(#star-glow-y)"/><text x="${250 + STAR_Y[0] * 30 + 14}" y="118" class="orbit-label">별 Y</text>
    <g id="earth2d"><circle r="11" fill="url(#earth-ball)"/><text y="-17" text-anchor="middle" class="orbit-small">지구</text></g>
  </g>
  <g id="inset">
    <rect x="${INSET.x - 3}" y="${INSET.y - 3}" width="${INSET.w + 6}" height="${INSET.h + 6}" rx="16" fill="#02030a" stroke="#8fd3ff55" stroke-width="1.5"/>
    <g clip-path="url(#inset-clip)">
      <image id="inset-sky" x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}" preserveAspectRatio="none"/>
      <g id="inset-marks"></g>
      <polyline id="trail-x" fill="none" stroke="#ffcf6e" stroke-width="2" stroke-dasharray="3 4" opacity=".8"/>
      <polyline id="trail-y" fill="none" stroke="#8fd3ff" stroke-width="2" stroke-dasharray="3 4" opacity=".8"/>
      <g id="inset-y"><circle r="13" fill="url(#star-glow-y)"/><circle r="3" fill="#fff"/><text x="10" y="-10" class="inset-label">별 Y</text></g>
      <g id="inset-x"><circle r="17" fill="url(#star-glow-x)"/><circle r="3.6" fill="#fff"/><text x="12" y="-12" class="inset-label">별 X</text></g>
    </g>
    <rect x="${INSET.x + 10}" y="${INSET.y + 10}" width="150" height="26" rx="13" fill="#0a0d22cc"/><text x="${INSET.x + 22}" y="${INSET.y + 28}" class="inset-title">🔭 지구에서 본 하늘</text>
    <text id="season" x="${INSET.x + INSET.w - 12}" y="${INSET.y + INSET.h - 12}" text-anchor="end" class="inset-title"></text>
  </g>
  <g id="orbit-read" transform="translate(${INSET.x} ${INSET.y + INSET.h + 22})"></g>
</g>
<g id="stars-view">
  <image id="star-sky" x="0" y="0" width="800" height="440" preserveAspectRatio="none"/>
  <g id="wobble"></g>
  <g id="star-card"></g>
  <g id="ruler" transform="translate(470 392)"></g>
</g>`;

const lab = buildLab({
  unit: 8,
  crumb: '별 01 별까지의 거리와 연주 시차',
  title: '별까지의 거리는 어떻게 알 수 있을까?',
  intro: '',
  tabs: [{ id: 'board', label: '시차 측정 판' }, { id: 'orbit', label: '지구의 공전과 연주 시차' }, { id: 'stars', label: '실제 별의 연주 시차' }],
  toggle: '시선 모두 보기',
  sceneLabel: '시차 측정 판과 별 모형, 지구의 공전 모형, 실제 밤하늘',
  scene,
  terms,
});
$('.lab').insertAdjacentHTML('beforeend', creditsHTML([], [SKY_CREDIT]));

/* ---------- 상태 ---------- */
let tab = 'board', show = false, use3d = false, lastFrame = 0, flow = null;
// 시차 측정 판
let modelId = 'a', hole = null, peekX = 0, peekTarget = 0, measuring = null;
const views = { a: {}, b: {} };     // views.a.left = 보인 눈금 번호
const measured = {};                // measured.a = 시차(도)
// 공전 모형
let theta = 0, thetaFrom = 0, thetaTo = 0, moveT = 1, noOrbit = false, annual = null;
const recorded = { A: true, B: false };
const trail = { X: [], Y: [] };
const annualSeen = { X: false, Y: false };
let orbited = false;
// 실제 별
let starKey = null, wobbleT = 0;
const viewedStars = new Set();

/* ---------- 시차 측정 판 ---------- */
function protractorSVG(id, angle) {
  const m = BOARD.models[id], [cx, cy] = bp(m.x, m.y);
  // 각은 별 모형에서 아래쪽(구멍 쪽)을 0으로 재요.
  const a1 = Math.atan2(BOARD.holes.left - m.x, m.y), a2 = Math.atan2(BOARD.holes.right - m.x, m.y);
  const toXY = (a, r) => [cx + Math.sin(a) * r, cy + Math.cos(a) * r];
  const r = 46, f = Math.min(1, angle / boardParallax(m)), [sx, sy] = toXY(a1, r), [ex, ey] = toXY(a1 + (a2 - a1) * f, r);
  const ticks = Array.from({ length: 19 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 18, [x0, y0] = toXY(a, 58), [x1, y1] = toXY(a, i % 3 ? 63 : 67); return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="#2c5aa0" stroke-width="1"/>`; }).join('');
  return `<path d="M${cx - 70} ${cy} A70 70 0 0 0 ${cx + 70} ${cy}Z" fill="#cfe6ff66" stroke="#2c5aa0" stroke-width="1.2"/>${ticks}
    <path d="M${sx.toFixed(1)} ${sy.toFixed(1)} A${r} ${r} 0 0 0 ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="#e8590c" stroke-width="4"/>
    <rect x="${cx + 62}" y="${cy + 18}" width="92" height="30" rx="8" fill="#1d1505"/><text x="${cx + 108}" y="${cy + 39}" text-anchor="middle" class="angle-read">약 ${Math.round(angle)}°</text>`;
}
function renderBoard(dt) {
  $$('[data-sight]').forEach(g => {
    const [id, h] = g.dataset.sight.split('-'), seen = views[id][h] !== undefined;
    g.classList.toggle('on', seen); g.classList.toggle('ghost', !seen && show && id === modelId);
  });
  $$('[data-board-model]').forEach(g => g.classList.toggle('chosen', g.dataset.boardModel === modelId));
  $$('[data-hole-mark]').forEach(g => g.classList.toggle('looking', g.dataset.holeMark === hole));
  // 구멍으로 본 모습: 별 모형이 눈금의 어디에 보이는지
  const k = instantLessons.matches ? 1 : 1 - Math.exp(-dt * 9);
  peekX += (peekTarget - peekX) * k;
  const near = modelId === 'a';
  $('#peek-star').setAttribute('transform', `translate(${(PEEK.cx + peekX * PEEK.k).toFixed(1)} ${PEEK.cy + 34}) scale(${near ? 1.15 : .8})`);
  $('#peek-star').style.opacity = hole ? 1 : .25;
  setText('#peek-title', hole ? `👁 ${hole === 'left' ? '왼쪽' : '오른쪽'} 구멍으로 본 별 모형 ${BOARD.models[modelId].name}` : '구멍으로 본 모습 · 구멍을 골라 보세요');
  setText('#peek-read', hole ? `별 모형이 눈금 ${circled(scaleNumber(sightOnScale(BOARD.holes[hole], BOARD.models[modelId])))} 앞에 보여요` : '');
  // 각도기
  const p = $('#protractor');
  if (measuring) {
    measuring.t = Math.min(1, measuring.t + dt / (instantLessons.matches ? .01 : 1.1));
    const target = boardParallax(BOARD.models[measuring.id]);
    setHTML('#protractor', protractorSVG(measuring.id, target * (1 - (1 - measuring.t) ** 3)));
    p.setAttribute('opacity', 1);
    if (measuring.t >= 1 && measured[measuring.id] === undefined) {
      measured[measuring.id] = Math.round(target);
      toast(`📐 별 모형 ${BOARD.models[measuring.id].name}의 시차: 약 ${Math.round(target)}°`);
      renderText();
    }
  } else p.setAttribute('opacity', 0);
  const row = id => { const v = views[id]; return `<tr><td>${BOARD.models[id].name}</td><td>${v.left ? circled(v.left) : '?'}</td><td>${v.right ? circled(v.right) : '?'}</td><td>${measured[id] !== undefined ? `약 ${measured[id]}°` : '?'}</td></tr>`; };
  setHTML('#board-result', `<foreignObject width="332" height="112"><table xmlns="http://www.w3.org/1999/xhtml" class="data-table board-table"><tr><th>별 모형</th><th>왼쪽 구멍</th><th>오른쪽 구멍</th><th>시차</th></tr>${row('a')}${row('b')}</table></foreignObject>`);
}
function look(h) {
  hole = h;
  const n = scaleNumber(sightOnScale(BOARD.holes[h], BOARD.models[modelId]));
  peekTarget = sightOnScale(BOARD.holes[h], BOARD.models[modelId]);
  if (views[modelId][h] === undefined) toast(`✏️ ${BOARD.models[modelId].name}: ${h === 'left' ? '왼쪽' : '오른쪽'} 구멍으로 보면 눈금 ${circled(n)}에 보여요. 위치를 표시하고 선을 그었어요`);
  views[modelId][h] = Math.round(n);
  renderControls();
}
function chooseModel(id) {
  modelId = id; measuring = null; hole = null; peekTarget = 0;
  renderControls();
}

/* ---------- 공전 모형 ---------- */
const basis = skyBasis(SKY_CENTER.ra, SKY_CENTER.dec);
let insetProject = null;
function insetPoint(star, th) {
  if (!insetProject) return null;
  const [ra, dec] = basis.toSky(sub(star, earthAt(th)));
  const p = insetProject(ra, dec);
  return p && [INSET.x + p[0], INSET.y + p[1]];
}
const ease = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function playOrbit() {
  if (moveT < 1) return;
  thetaFrom = theta; thetaTo = theta + Math.PI; moveT = 0;
  if (Math.abs(theta % (2 * Math.PI)) < .01) { trail.X = []; trail.Y = []; recorded.B = false; }
  renderControls();
}
function stepOrbit(dt) {
  const moving = moveT < 1;
  if (moving) {
    moveT = Math.min(1, moveT + dt / (instantLessons.matches ? .01 : 5.5));
    theta = noOrbit ? thetaFrom : thetaFrom + (thetaTo - thetaFrom) * ease(moveT);
    if (moveT >= 1) {
      theta = noOrbit ? thetaFrom : thetaTo % (2 * Math.PI);
      if (noOrbit) toast('🌍 6개월이 지났지만 지구가 그 자리에 있어요. 별 X가 보이는 위치는 그대로예요');
      else {
        const atB = Math.abs(theta - Math.PI) < .01;
        if (atB) { recorded.B = true; orbited = true; toast('📍 6개월 뒤(B)에 보니 별 X가 배경 별들에 대해 위치가 달라졌어요! 별 Y는 조금만 달라졌어요'); }
        else toast('📍 다시 6개월이 지나 지구가 A로 돌아왔어요');
      }
      renderControls();
    }
  }
  const E = earthAt(theta);
  const ex = 250 + E[0] / 3 * 160, ey = 350 + E[2] / 3 * 46;
  $('#earth2d').setAttribute('transform', `translate(${ex.toFixed(1)} ${ey.toFixed(1)})`);
  // 2D: 지구에서 별을 지나 배경까지 이어지는 시선
  const line = (sx, sy, color) => { const t = (49 - ey) / (sy - ey), x = ex + (sx - ex) * t; return `<path d="M${ex} ${ey} L${x.toFixed(1)} 49" stroke="${color}" stroke-width="2" opacity=".85"/><circle cx="${x.toFixed(1)}" cy="49" r="6" fill="none" stroke="${color}" stroke-width="2"/>`; };
  setHTML('#sight2d', line(250 + STAR_X[0] * 30, 200, '#ffcf6e') + (show || annual === 'Y' ? line(250 + STAR_Y[0] * 30, 128, '#8fd3ff') : ''));
  // 지구에서 본 하늘 창
  const px = insetPoint(STAR_X, theta), py = insetPoint(STAR_Y, theta);
  if (px) {
    if (moving && !noOrbit) { trail.X.push(px); trail.Y.push(py); }
    $('#inset-x').setAttribute('transform', `translate(${px[0].toFixed(1)} ${px[1].toFixed(1)})`);
    $('#inset-y').setAttribute('transform', `translate(${py[0].toFixed(1)} ${py[1].toFixed(1)})`);
    $('#trail-x').setAttribute('points', trail.X.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '));
    $('#trail-y').setAttribute('points', trail.Y.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '));
    const mark = (star, th, id, color) => { const p = insetPoint(star, th); return p ? `<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="none" stroke="${color}" stroke-width="1.6" stroke-dasharray="3 3"/><text x="${p[0]}" y="${p[1] + 24}" text-anchor="middle" class="inset-label" style="fill:${color}">${id}</text>` : ''; };
    setHTML('#inset-marks', mark(STAR_X, 0, 'X1(A)', '#ffcf6e') + (recorded.B ? mark(STAR_X, Math.PI, 'X2(B)', '#ffcf6e') : '') + (show || annual === 'Y' ? mark(STAR_Y, 0, 'Y1', '#8fd3ff') + (recorded.B ? mark(STAR_Y, Math.PI, 'Y2', '#8fd3ff') : '') : ''));
  }
  const months = Math.round(((noOrbit ? moveT * Math.PI : theta) / Math.PI) * 6) % 12;
  setText('#season', noOrbit ? `지구가 공전하지 않음 · ${Math.round(moveT * 6) % 7}개월 뒤` : `A에서 ${months}개월 뒤`);
  const read = a => `<tspan x="0" dy="0">별 ${a}의 연주 시차(모형): 약 ${annualParallaxDeg(a === 'X' ? STAR_X : STAR_Y).toFixed(0)}°</tspan>`;
  setHTML('#orbit-read', `<text class="orbit-read">${annual ? read(annual) : '<tspan>‘별 X(또는 Y)의 연주 시차 보기’를 눌러 비교해요</tspan>'}<tspan x="0" dy="20" class="orbit-small">실제 별의 연주 시차는 1″보다 작아요(크게 과장했어요)</tspan></text>`);
  if (use3d) view3d.view.update({ theta, recorded: { ...recorded }, annual, show, moving }, dt);
  return moving;
}

/* ---------- 실제 별 ---------- */
const RULER = { w: 310, min: 1, max: 300 };
const rulerX = pc => (Math.log10(pc) - Math.log10(RULER.min)) / (Math.log10(RULER.max) - Math.log10(RULER.min)) * RULER.w;
function chooseStar(key) {
  starKey = key; viewedStars.add(key); wobbleT = 0;
  const s = STARS[key];
  const opts = { ra: s.ra, dec: s.dec, fov: 34, width: 800, height: 440, milkyWay: .85, lines: [IAU[key]], maxMag: 6.2, skip: (r, d) => Math.abs(r - s.ra) < .25 && Math.abs(d - s.dec) < .25, skipKey: key };
  setSky($('#star-sky'), opts).then(() => renderStars(0));
  const far = !parallaxMeasurable(s.dist);
  toast(far ? `🔭 ${s.name}: 100 pc보다 멀어서 지구에서 재기에는 연주 시차가 너무 작아요. 위치가 거의 달라지지 않아요` : `🔭 ${s.name}: 연주 시차 약 ${fmtArcsec(parallaxArcsec(s.dist))}`);
  renderControls();
}
const IAU = { proxima: 'Cen', sirius: 'CMa', vega: 'Lyr', megrez: 'UMa', polaris: 'UMi', betelgeuse: 'Ori' };
const fmtArcsec = a => (a >= .1 ? `${a.toFixed(2)}″` : a >= .01 ? `${a.toFixed(3)}″` : `${a.toFixed(4)}″`);
const fmtLy = pc => { const ly = lightYears(pc); return ly < 20 ? `약 ${ly.toFixed(1)} 광년` : `약 ${Math.round(ly / (ly > 200 ? 10 : 1)) * (ly > 200 ? 10 : 1)} 광년`; };
function renderStars(dt) {
  if (!starKey) {
    setHTML('#star-card', `<rect x="250" y="190" width="300" height="60" rx="14" fill="#0a0d22dd" stroke="#2d3566"/><text x="400" y="226" text-anchor="middle" class="card-big">위의 단추에서 별을 골라 보세요</text>`);
    setHTML('#wobble', ''); setHTML('#ruler', '');
    return;
  }
  const s = STARS[starKey], p = parallaxArcsec(s.dist), far = !parallaxMeasurable(s.dist);
  wobbleT += dt;
  // 1″를 40 px로(하늘 사진 34°가 800 px라서 실제보다 약 6000배 크게) 나타내고, 1년 주기를 4초로 줄였어요.
  const amp = p * 40, off = Math.sin(wobbleT * Math.PI / 2) * amp, cx = 400, cy = 210;
  const [r, g, b] = starColor(s.bv);
  const col = `rgb(${r},${g},${b})`, size = Math.max(5, Math.min(14, (6 - s.m) * 2.2));
  setHTML('#wobble', `${amp > 1 ? `<path d="M${cx - amp} ${cy} L${cx + amp} ${cy}" stroke="#ffcf6e" stroke-width="1.5" stroke-dasharray="4 4"/><circle cx="${cx - amp}" cy="${cy}" r="${size + 6}" fill="none" stroke="#ffcf6e88" stroke-dasharray="3 3"/><circle cx="${cx + amp}" cy="${cy}" r="${size + 6}" fill="none" stroke="#ffcf6e88" stroke-dasharray="3 3"/><text x="${cx - amp}" y="${cy + size + 26}" text-anchor="middle" class="inset-label">지금</text><text x="${cx + amp}" y="${cy + size + 26}" text-anchor="middle" class="inset-label">6개월 뒤</text>` : `<circle cx="${cx}" cy="${cy}" r="${size + 10}" fill="none" stroke="#ff9aa6" stroke-dasharray="3 3"/>`}
    <g transform="translate(${(cx + off).toFixed(2)} ${cy})"><circle r="${size * 3}" fill="${col}" opacity=".18"/><circle r="${size * 1.4}" fill="${col}" opacity=".55"/><circle r="${size * .55}" fill="#fff"/><path d="M${-size * 3.4} 0 H${size * 3.4} M0 ${-size * 3.4} V${size * 3.4}" stroke="${col}" stroke-width="1" opacity=".6"/></g>
    <text x="${cx}" y="${cy - size - 22}" text-anchor="middle" class="card-big">${s.name}</text>`);
  setHTML('#star-card', `<rect x="14" y="300" width="350" height="126" rx="14" fill="#0a0d22e6" stroke="#2d3566"/>
    <text x="30" y="328" class="card-big">${s.name} <tspan class="card-small">${s.con}</tspan></text>
    <text x="30" y="356" class="card-text">거리: ${fmtLy(s.dist)} (약 ${s.dist < 10 ? s.dist.toFixed(1) : Math.round(s.dist)} pc)</text>
    <text x="30" y="382" class="card-text">연주 시차: ${far ? '0.01″보다 작아요(너무 작아요)' : `약 ${fmtArcsec(p)}`}</text>
    <text x="30" y="408" class="card-text" style="fill:${far ? '#ff9aa6' : '#9dffb0'}">${far ? '100 pc보다 멀어 연주 시차로 거리를 알기 어려워요' : '연주 시차를 재어 거리를 알 수 있어요'}</text>`);
  // 거리 자: 고른 적이 있는 별은 점으로, 지금 고른 별은 이름과 함께 표시해요.
  const marks = [...viewedStars].map(k => `<circle cx="${rulerX(STARS[k].dist).toFixed(1)}" r="${k === starKey ? 6.5 : 4}" fill="${k === starKey ? '#ffcf6e' : '#cfe0ff'}"/>`).join('');
  setHTML('#ruler', `<rect x="-16" y="-46" width="${RULER.w + 30}" height="78" rx="12" fill="#0a0d22d9" stroke="#2d3566"/>
    <rect x="${rulerX(100)}" y="-6" width="${RULER.w - rulerX(100)}" height="12" fill="#ff9aa633"/><text x="${RULER.w}" y="-30" text-anchor="end" class="ruler-tick" style="fill:#ff9aa6">100 pc 넘으면 재기 어려움</text>
    <path d="M0 0 H${RULER.w}" stroke="#8fd3ff" stroke-width="2"/>${[1, 10, 100].map(v => `<path d="M${rulerX(v)} -6 V6" stroke="#8fd3ff"/><text x="${rulerX(v)}" y="22" text-anchor="middle" class="ruler-tick">${v} pc</text>`).join('')}
    <text x="0" y="-30" class="ruler-tick">별까지의 거리 (눈금은 10배씩)</text>${marks}<text x="${rulerX(s.dist).toFixed(1)}" y="-12" text-anchor="middle" class="ruler-label">${s.name}</text>`);
}

/* ---------- 조작 단추 ---------- */
function renderControls() {
  if (tab === 'board') {
    $('#controls').innerHTML = `<div role="group" aria-label="별 모형 고르기"><span class="group-label">별 모형</span>${['a', 'b'].map(id => `<button data-model="${id}" aria-pressed="${modelId === id}">별 모형 ${BOARD.models[id].name}</button>`).join('')}</div>
      <div role="group" aria-label="구멍 고르기"><button data-hole="left" aria-pressed="${hole === 'left'}">👁 왼쪽 구멍으로 보기</button><button data-hole="right" aria-pressed="${hole === 'right'}">👁 오른쪽 구멍으로 보기</button></div>
      <button id="measure" ${views[modelId].left && views[modelId].right ? '' : 'disabled'}>📐 각도기로 시차 재기</button>`;
    $$('[data-model]').forEach(b => b.onclick = () => chooseModel(b.dataset.model));
    $$('[data-hole]').forEach(b => b.onclick = () => look(b.dataset.hole));
    $('#measure').onclick = () => { measuring = { id: modelId, t: 0 }; };
  } else if (tab === 'orbit') {
    const atA = Math.abs(theta) < .01;
    $('#controls').innerHTML = `<button id="orbit-play" ${moveT < 1 ? 'disabled' : ''}>▶ 6개월 공전시키기 (${atA ? 'A → B' : 'B → A'})</button>
      <div role="group" aria-label="연주 시차 보기"><button data-annual="X" aria-pressed="${annual === 'X'}">별 X의 연주 시차 보기</button><button data-annual="Y" aria-pressed="${annual === 'Y'}">별 Y의 연주 시차 보기</button></div>
      <label class="toggle space-toggle"><input type="checkbox" id="no-orbit" ${noOrbit ? 'checked' : ''}><span>지구가 공전하지 않는다면?</span></label>`;
    $('#orbit-play').onclick = playOrbit;
    $$('[data-annual]').forEach(b => b.onclick = () => {
      annual = annual === b.dataset.annual ? null : b.dataset.annual;
      if (annual) { annualSeen[annual] = true; toast(`📐 별 ${annual}의 연주 시차: ∠A${annual}B의 1/2이에요`); }
      renderControls();
    });
    $('#no-orbit').onchange = e => { noOrbit = e.target.checked; if (noOrbit) { theta = 0; trail.X = []; trail.Y = []; recorded.B = false; } renderControls(); };
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="별 고르기" class="star-chips"><span class="group-label">별 고르기</span>${REAL_STARS.map(k => `<button data-star="${k}" aria-pressed="${starKey === k}">${STARS[k].name}</button>`).join('')}</div>`;
    $$('[data-star]').forEach(b => b.onclick = () => chooseStar(b.dataset.star));
  }
  renderText();
}
function setTab(id) {
  tab = id; lab.selectTab(id);
  const stage = $('.stage');
  stage.dataset.tab = id;
  stage.classList.toggle('three-on', id === 'orbit' && use3d);
  $('#view-bar')?.toggleAttribute('data-off', id !== 'orbit');
  if (id === 'orbit' && use3d) view3d.view?.invalidate();
  renderControls();
}
function renderText() {
  const T = {
    board: ['시차 측정 판의 두 구멍으로 별 모형을 번갈아 보세요.', '별 모형 (가)와 (나)를 하나씩 골라 ‘왼쪽 구멍으로 보기’와 ‘오른쪽 구멍으로 보기’를 차례로 눌러요. 두 구멍으로 다 본 뒤 각도기로 시차를 재요.'],
    orbit: ['지구가 6개월 동안 공전하면 별 X와 별 Y가 보이는 위치는 어떻게 달라질까요?', '‘6개월 공전시키기’를 누르고, 오른쪽 ‘지구에서 본 하늘’ 창에서 별 X와 별 Y가 배경 별들에 대해 움직인 정도를 비교해요.'],
    stars: ['실제 별들의 연주 시차를 비교해 보세요.', '별을 하나씩 골라 6개월 동안 보이는 위치가 달라지는 정도(연주 시차)와 거리를 비교해요. 100 pc보다 먼 별도 골라 보세요.'],
  }[tab];
  setText('#guide', T[0]); setText('#subguide', T[1]);
  setText('#stage-state', tab === 'board' ? `별 모형 ${BOARD.models[modelId].name} · ${hole ? (hole === 'left' ? '왼쪽' : '오른쪽') + ' 구멍으로 보는 중' : '구멍을 골라요'}` : tab === 'orbit' ? (noOrbit ? '지구가 공전하지 않는 경우' : '지구의 공전 모형 · 거리와 각도는 크게 과장했어요') : '실제 밤하늘 · HYG 별 목록');
  setText('#note-title', { board: '두 구멍으로 볼 때 별 모형의 위치가 달라 보이나요?', orbit: '6개월 뒤 별 X와 별 Y가 보이는 위치는?', stars: '가까운 별과 먼 별의 연주 시차는?' }[tab]);
  setText('#note-text', { board: '관측자의 위치(구멍)에 따라 물체가 멀리 있는 배경(눈금)에 대해 서로 다른 곳에 있는 것처럼 보여요. 이렇게 보이는 방향이 달라지는 정도를 시차라고 해요.', orbit: '지구가 공전하면 6개월 간격으로 관측하는 위치(A, B)가 달라져요. 별 X는 A에서 X1에, B에서 X2에 있는 것처럼 보여요.', stars: '실제 별은 아주 멀리 있어서 연주 시차가 1″(1/3600°)보다 작아요. 화면에서는 흔들림을 약 6000배 크게 나타냈어요.' }[tab]);
  const rows = ['a', 'b'].map(id => `<tr><td>${BOARD.models[id].name}</td><td>${views[id].left ? circled(views[id].left) : ''}</td><td>${views[id].right ? circled(views[id].right) : ''}</td><td>${measured[id] !== undefined ? `약 ${measured[id]}°` : ''}</td></tr>`).join('');
  const real = [...viewedStars].map(k => `<tr><td>${STARS[k].name}</td><td>${fmtLy(STARS[k].dist)}</td><td>${parallaxMeasurable(STARS[k].dist) ? fmtArcsec(parallaxArcsec(STARS[k].dist)) : '너무 작음'}</td></tr>`).join('');
  setHTML('#readout', `<table class="data-table"><tr><th>별 모형</th><th>왼쪽</th><th>오른쪽</th><th>시차</th></tr>${rows}</table>
    <table class="data-table"><tr><th>공전 모형</th><th>보이는 위치 변화</th></tr><tr><td>별 X</td><td>${recorded.B ? '크다' : ''}</td></tr><tr><td>별 Y</td><td>${recorded.B ? '작다' : ''}</td></tr></table>
    ${real ? `<table class="data-table"><tr><th>별</th><th>거리</th><th>연주 시차</th></tr>${real}</table>` : ''}`);
  setText('#model-note', `시차 측정 판은 교과서 277쪽 탐구 활동을 그대로 옮겼어요. 지구의 공전 모형은 보기 쉽게 별 X와 별 Y를 아주 가깝게 두고 각도를 크게 과장했어요(실제 연주 시차는 1″보다 작아요).${use3d ? ' 3D 화면을 끌어 돌려 보고, ‘위에서’를 누르면 교과서 그림처럼 볼 수 있어요.' : ''} 배경의 별은 실제 밤하늘(여름철 은하수 부근)의 별 위치·밝기·색으로 그렸어요. 지구의 공전 궤도는 원처럼 그렸지만, 실제로는 원에 아주 가까운 타원이에요.`);
  setText('#discovery', '2013년에 발사된 가이아 우주 망원경은 지구와 함께 태양 둘레를 돌며 수많은 별의 위치를 아주 정밀하게 되풀이해 재어, 연주 시차로 별까지의 거리를 알아내고 있어요. 공기의 방해가 없는 우주에서 재기 때문에 100 pc보다 훨씬 먼 별의 연주 시차도 잴 수 있어요.');
}

/* ---------- 3D ---------- */
const view3d = setupViewToggle({
  stage: $('.stage'), key: 'parallax-view', cams: [['oblique', '비스듬히'], ['top', '위에서'], ['side', '옆에서']],
  load: () => import('./src/parallax-3d.js').then(({ createParallax3D }) => createParallax3D({ stage: $('.stage'), svg: $('#scene'), reducedMotion: instantLessons })),
  onChange: active => { use3d = active; $('.stage').classList.toggle('three-on', active && tab === 'orbit'); renderText(); },
});
$('#tab-board').onclick = () => setTab('board');
$('#tab-orbit').onclick = () => setTab('orbit');
$('#tab-stars').onclick = () => setTab('stars');
$('#show-detail').onchange = e => { show = e.target.checked; };
$('#reset').onclick = () => {
  hole = null; peekTarget = 0; peekX = 0; measuring = null; theta = 0; moveT = 1; noOrbit = false; annual = null; recorded.B = false; trail.X = []; trail.Y = []; wobbleT = 0;
  renderControls();
};
setSky($('#inset-sky'), { ra: SKY_CENTER.ra, dec: SKY_CENTER.dec, fov: SKY_CENTER.fov, width: INSET.w, height: INSET.h, milkyWay: 1, lines: ['Aql', 'Lyr', 'Cyg', 'Sge', 'Vul', 'Her'], maxMag: 6 }).then(p => { insetProject = p; });

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    if (tab === 'board') renderBoard(dt);
    else if (tab === 'orbit') stepOrbit(dt);
    else renderStars(dt);
    const farSeen = [...viewedStars].some(k => !parallaxMeasurable(STARS[k].dist));
    flow?.update(checklist([
      ['별 모형 (가)를 두 구멍으로 번갈아 보기', views.a.left && views.a.right, '‘별 모형 (가)’를 고른 뒤 ‘왼쪽 구멍으로 보기’와 ‘오른쪽 구멍으로 보기’를 차례로 눌러요'],
      ['별 모형 (나)를 두 구멍으로 번갈아 보기', views.b.left && views.b.right, '‘별 모형 (나)’를 고른 뒤 ‘왼쪽 구멍으로 보기’와 ‘오른쪽 구멍으로 보기’를 차례로 눌러요', '[data-model="b"]'],
      ['각도기로 (가)와 (나)의 시차 재기', measured.a !== undefined && measured.b !== undefined, '별 모형을 하나씩 골라 ‘각도기로 시차 재기’를 눌러요', '#measure'],
      ['지구를 6개월 공전시키며 별 X와 별 Y 보기', orbited, '‘지구의 공전과 연주 시차’ 탭에서 ‘6개월 공전시키기’를 눌러요', '#tab-orbit'],
      ['별 X와 별 Y의 연주 시차 비교하기', annualSeen.X && annualSeen.Y, '‘별 X의 연주 시차 보기’와 ‘별 Y의 연주 시차 보기’를 차례로 눌러요', '[data-annual]'],
      ['실제 별 3개 이상의 연주 시차 비교하기', viewedStars.size >= 3 && farSeen, '‘실제 별의 연주 시차’ 탭에서 별을 3개 이상 골라요(100 pc보다 먼 북극성이나 베텔게우스도 골라요)', '#tab-stars'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '가까운 별과 먼 별 중<br>보이는 위치가 더 많이 달라지는 별은?',
    lead: '하나의 물체를 서로 다른 위치에서 보면 물체가 보이는 방향이 달라져요. 시차 측정 판의 두 구멍으로 별 모형 (가)와 (나)를 번갈아 볼 거예요.<br>별 모형 (가)는 구멍에서 가깝고, (나)는 더 멀리 있어요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="두 구멍과 가까운 별 모형 (가), 먼 별 모형 (나)가 있는 시차 측정 판"><rect width="520" height="250" rx="12" fill="#0a0d22"/><rect x="150" y="16" width="220" height="220" rx="8" fill="#efe6cf"/><text x="260" y="40" text-anchor="middle" font-size="14" fill="#5a4a2a">① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ ⑪</text><path d="${starPath(260, 150, 12)}" fill="#ffd84a" stroke="#7a5a00"/><text x="278" y="155" font-size="15" fill="#5a4a2a">(가)</text><path d="${starPath(252, 90, 10)}" fill="#ffe98f" stroke="#7a5a00"/><text x="268" y="95" font-size="15" fill="#5a4a2a">(나)</text><circle cx="238" cy="222" r="6" fill="#2a2418"/><circle cx="282" cy="222" r="6" fill="#2a2418"/><text x="200" y="244" font-size="12" fill="#cbd8ff">왼쪽 구멍</text><text x="280" y="244" font-size="12" fill="#cbd8ff">오른쪽 구멍</text></svg>`,
    question: '두 구멍으로 번갈아 볼 때, 별 모형 (가)와 (나) 중 시차(보이는 방향이 달라지는 정도)가 더 큰 것은 무엇일까요?',
    choices: ['가까이 있는 별 모형 (가)의 시차가 더 클 것 같아요.', '멀리 있는 별 모형 (나)의 시차가 더 클 것 같아요.', '두 별 모형의 시차가 같을 것 같아요.', '아직 잘 모르겠어요.'],
    placeholder: '눈앞에 손가락을 세우고 한쪽 눈씩 번갈아 감으며 볼 때를 떠올려 보세요. 손가락이 가까울 때와 멀 때는 어떻게 달랐나요?',
  },
  observe: {
    title: '시차 측정 판과 지구의 공전 모형으로 별까지의 거리와 시차의 관계를 알아보세요.',
    recordLabel: '별 모형 (가)와 (나)의 시차, 별 X와 별 Y의 연주 시차, 실제 별의 연주 시차를 비교하여 적어 보세요.',
    placeholder: '(가)와 (나) 중 시차가 더 큰 것, 지구가 6개월 공전했을 때 별 X와 별 Y 중 위치가 더 많이 달라진 별, 가까운 별과 먼 별의 연주 시차를 비교해 적어 보세요.',
  },
  explain: {
    question: '관측하는 곳에서 별까지의 거리와 시차(연주 시차) 사이에는 어떤 관계가 있나요? 관찰 결과를 근거로 설명해 보세요.',
    concepts: [
      ['시차', '관측자의 위치에 따라 물체가 보이는 방향이 달라지는 정도를 시차라고 해요. 시차의 크기는 두 관측 지점과 물체가 이루는 각도로 나타내요.'],
      ['거리와 시차', '관측자와 물체 사이의 거리가 멀수록 시차는 작아지고, 가까울수록 시차는 커져요. 가까운 별 모형 (가)의 시차가 먼 별 모형 (나)보다 컸어요.'],
      ['연주 시차', '지구가 공전하면 6개월 간격으로 관측하는 위치가 달라져 별이 보이는 방향이 달라져요. 이때 측정한 시차의 1/2을 연주 시차라고 해요. 지구와 가까이 있는 별일수록 연주 시차가 커요.'],
      ['연주 시차와 별까지의 거리', '별은 아주 멀리 있어서 연주 시차가 매우 작으므로 단위로 ″(초)를 써요(1° = 3600″). 연주 시차가 1″인 별까지의 거리를 1 pc(파섹)이라고 하고, 1 pc은 약 3.26 광년이에요. 100 pc보다 먼 별은 연주 시차가 너무 작아 연주 시차로 거리를 알기 어려워요.'],
    ],
    note: '지구가 공전하지 않는다면 6개월이 지나도 관측 위치가 같아서 별이 보이는 방향이 달라지지 않으므로 연주 시차가 생기지 않아요.',
  },
  onRestart: () => {
    show = false; $('#show-detail').checked = false; modelId = 'a';
    for (const id of ['a', 'b']) { views[id] = {}; delete measured[id]; }
    orbited = false; annualSeen.X = annualSeen.Y = false; viewedStars.clear(); starKey = null;
    lab.resetQuiz(); $('#reset').click(); setTab('board');
  },
});
setTab('board');
requestAnimationFrame(frame);
