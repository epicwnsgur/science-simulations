import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import './theme-space.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, reducedMotion, instantLessons } from './src/lab-shell.js';
import { setupViewToggle } from './src/view-toggle.js';
import { RADII, STICKERS, PAIRS, dirOf, angleBetween, surfaceCm, galaxyField, seenFrom } from './src/expansion-model.js';
import { galaxyUrl, creditsHTML } from './src/space-photos.js';
import { fxCanvas } from './src/space-fx.js';

// 교과서 294–295쪽, 지도서(우주 팽창). 수업 모형: 비유를 활용한 수업 모형(FAR: 초점 → 실행 → 반성).
// 지도상 유의점: 풍선 표면을 우주에, 붙임딱지를 은하에 비유해요. 은하가 직접 움직이는 것이 아니라 우주 공간이 팽창하며,
// 팽창의 중심은 없어요. 적색 편이·허블 법칙·가속 팽창은 다루지 않고, 비유의 한계(풍선 안쪽·중심은 우주가 아님)를 함께 생각해요.

const terms = [
  ['외부 은하', '우리은하 바깥에 분포하는 은하예요.'],
  ['우주 팽창', '우주 공간이 특정한 중심 없이 모든 방향으로 늘어나는 것이에요. 그래서 대부분의 은하가 서로 멀어져요.'],
  ['대폭발', '약 138억 년 전, 온도와 밀도가 매우 높은 아주 작은 상태(한 점)에서 우주가 시작된 사건이에요. 폭탄처럼 공간 속으로 퍼진 것이 아니라 우주 공간 자체가 늘어나기 시작했어요.'],
  ['비유', '직접 보기 어려운 것을 비슷한 성질을 가진 친숙한 것(모형)에 빗대어 설명하는 방법이에요.'],
];
const PHASES = { flat: '바람이 거의 없음', little: '조금 불었을 때', much: '많이 불었을 때' };
const B2 = { cx: 250, cy: 214, k: 64 };          // 2D 풍선 그림: 1 단위 = 64 px
const FIELD = { cx: 400, cy: 214, k: 78 };       // 중심이 있을까? 우주 지도
const TIME = { x0: 92, x1: 742, cy: 206, h: 168 };
const ANALOGY = { model: ['풍선 표면', '공기를 넣어 풍선 표면이 늘어남', '풍선에 붙인 붙임딱지'], real: ['우주', '우주의 팽창', '은하'] };
const REAL_ORDER = [2, 0, 1];                    // 오른쪽 칸에 보여 주는 순서(섞어 둠)
const OX = [
  ['풍선 안쪽의 공기와 풍선의 중심도 우주를 나타내요.', false, '풍선 모형에서는 표면만 우주를 나타내요. 풍선의 안쪽과 중심은 우주에 해당하지 않아요.'],
  ['붙임딱지가 커지지 않는 것처럼, 우주가 팽창해도 은하 자체가 커지는 것은 아니에요.', true, '붙임딱지(은하)의 크기는 그대로이고, 붙임딱지 사이의 거리만 멀어져요.'],
  ['붙임딱지 사이가 멀어지는 것은 붙임딱지가 풍선 위를 기어가기 때문이에요.', false, '붙임딱지는 그 자리에 붙어 있고, 풍선 표면이 늘어나서 사이가 멀어져요. 은하도 직접 움직이는 것이 아니라 우주 공간이 팽창해요.'],
];

const scene = `
<defs>
<radialGradient id="balloon2d" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#9fb4ff"/><stop offset=".35" stop-color="#4459e0"/><stop offset="1" stop-color="#16206b"/></radialGradient>
<radialGradient id="bang" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fff1b8"/><stop offset=".7" stop-color="#ff9a4a" stop-opacity=".5"/><stop offset="1" stop-color="#ff6a3a" stop-opacity="0"/></radialGradient>
<linearGradient id="funnel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset=".25" stop-color="#c77dff" stop-opacity=".22"/><stop offset="1" stop-color="#3a4fd8" stop-opacity=".16"/></linearGradient>
${STICKERS.map(s => `<clipPath id="st-clip-${s.id}"><circle r="15"/></clipPath>`).join('')}
</defs>
<g id="balloon-view">
  <g id="balloon2d-g"></g>
  <g id="tape-table" transform="translate(504 22)"></g>
</g>
<g id="center-view">
  <text x="400" y="30" text-anchor="middle" class="panel-title" id="center-title">우주 지도 · 기준 은하를 골라 보세요</text>
  <text x="400" y="424" text-anchor="middle" class="panel-small">은하 그림은 허블 우주 망원경이 찍은 실제 외부 은하 사진이에요. 은하의 크기는 그대로이고 사이의 공간만 늘어나요.</text>
</g>
<g id="time-view">
  <text x="${TIME.x0 - 10}" y="${TIME.cy + 64}" text-anchor="middle" class="time-label">대폭발</text><text x="${TIME.x0 - 10}" y="${TIME.cy + 84}" text-anchor="middle" class="panel-small">약 138억 년 전</text>
  <text x="${TIME.x1}" y="${TIME.cy + TIME.h + 30}" text-anchor="middle" class="time-label">현재</text>
  <path d="M${TIME.x0} ${TIME.cy + TIME.h + 16} H${TIME.x1 - 30}" stroke="#aab4d6" marker-end="url(#arrow-head)"/><text x="${(TIME.x0 + TIME.x1) / 2}" y="${TIME.cy + TIME.h + 34}" text-anchor="middle" class="panel-small">시간의 흐름 →</text>
  <text x="400" y="26" text-anchor="middle" class="panel-title" id="time-title">우주는 대폭발 이후 점점 팽창해 왔어요</text>
</g>
<g id="analogy-view"></g>`;

const lab = buildLab({
  unit: 8,
  crumb: '은하와 우주 02 우주 팽창',
  title: '우주의 크기는 항상 일정할까?',
  intro: '',
  tabs: [{ id: 'balloon', label: '풍선 모형 실험' }, { id: 'center', label: '팽창의 중심이 있을까?' }, { id: 'time', label: '우주의 시작' }, { id: 'analogy', label: '비유 되돌아보기' }],
  toggle: '도움 표시 보기',
  sceneLabel: '은하 붙임딱지를 붙인 풍선, 늘어나는 우주 지도, 대폭발 이후 팽창하는 우주',
  scene,
  terms,
});
$('.lab').insertAdjacentHTML('beforeend', creditsHTML(['xdf'], ['<li>은하 붙임딱지와 우주 지도의 은하: 허블 익스트림 딥 필드 사진에서 오려 냈어요.</li>']));
$('#show-detail').checked = true;
const fx = fxCanvas($('.stage'));

/* ---------- 상태 ---------- */
let tab = 'balloon', show = true, use3d = false, lastFrame = 0, flow = null, time = 0;
// 풍선 모형
let phase = 'flat', r = RADII.flat, rFrom = r, rTo = r, inflT = 1, stuck = 0, pumpT = 0;
let measuring = null;                       // { phase, i, f }
const table = { little: {}, much: {} };     // table.little[0] = cm
// 중심이 있을까?
const field = galaxyField(22);
const REFS = [['가', 8], ['나', 0], ['다', 21]];
let ref = null, scale = 1, playing = false;
const refsTried = new Set(), expandedRefs = new Set();
const imgs = Array.from({ length: 14 }, (_, i) => { const im = new Image(); im.src = galaxyUrl(i + 1); return im; });
// 우주의 시작
let tCursor = 0, tPlaying = false, timeDone = false;
// 비유
let pickModel = null;
const matched = new Set(), wrongFlash = [];
const oxAnswers = {};

/* ---------- 풍선 모형 ---------- */
const ease = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const elastic = t => 1 + Math.sin(t * Math.PI * 3) * (1 - t) * .045;
function inflate(next) {
  if (inflT < 1 || measuring) return;
  phase = next; rFrom = r; rTo = RADII[next]; inflT = 0;
  toast(next === 'little' ? '🎈 펌프로 공기를 조금 넣었어요' : '🎈 공기를 더 넣었어요. 풍선 표면이 늘어나요');
  renderControls();
}
function measure() {
  if (inflT < 1 || phase === 'flat') return;
  measuring = { phase, i: 0, f: 0 };
  renderControls();
}
function stepBalloon(dt) {
  let moving = false;
  if (inflT < 1) {
    inflT = Math.min(1, inflT + dt / (instantLessons.matches ? .01 : 3));
    r = rFrom + (rTo - rFrom) * ease(inflT) * (inflT < 1 ? elastic(inflT) : 1);
    pumpT += dt * 9; moving = true;
    if (inflT >= 1) { r = rTo; renderControls(); }
  }
  if (phase !== 'flat' && stuck < 1 && inflT >= 1) { stuck = Math.min(1, stuck + dt / (instantLessons.matches ? .01 : 1.4)); moving = true; if (stuck >= 1) { toast("🏷️ 은하 붙임딱지 세 개를 붙였어요. 이제 줄자로 거리를 재 보세요"); renderControls(); } }
  if (measuring) {
    measuring.f += dt / (instantLessons.matches ? .01 : .7); moving = true;
    if (measuring.f >= 1) {
      table[measuring.phase][measuring.i] = surfaceCm(r, ...PAIRS[measuring.i].map(i => STICKERS[i]));
      measuring.i++; measuring.f = 0;
      if (measuring.i >= PAIRS.length) { const p = measuring.phase; measuring = null; toast(p === 'little' ? '📏 세 붙임딱지 사이의 거리를 재었어요. 이제 공기를 더 넣어 볼까요?' : '📏 많이 불었을 때의 거리도 재었어요. 처음과 비교해 보세요'); renderControls(); }
    }
  }
  const pumpY = inflT < 1 ? (Math.sin(pumpT) + 1) / 2 : 1;
  const tapes = PAIRS.map((_, p) => {
    if (measuring && measuring.phase === phase) { if (p < measuring.i) return [p, 1, `${table[phase][p]} cm`]; if (p === measuring.i) return [p, Math.min(1, measuring.f), '']; return null; }
    return table[phase]?.[p] !== undefined && inflT >= 1 ? [p, 1, `${table[phase][p]} cm`] : null;
  }).filter(Boolean);
  if (use3d) view3d.view.update({ r, stuck, tapes, pumpY, moving }, dt);
  else render2D(tapes, pumpY);
  renderTable();
}
function render2D(tapes, pumpY) {
  const { cx, cy, k } = B2, R = r * k, by = cy + 40 - R * .15;
  const P = d => [cx + d[0] * R, by - d[1] * R];
  const stick = STICKERS.map((s, i) => {
    const kk = Math.max(0, Math.min(1, stuck * 3 - i)); if (!kk) return '';
    const [x, y] = P(dirOf(s)), fly = (1 - kk) * 140;
    return `<g transform="translate(${(x + fly).toFixed(1)} ${(y - fly * .4).toFixed(1)})"><circle r="17" fill="#f4f1ea"/><image href="${galaxyUrl([3, 9, 6][i])}" x="-15" y="-15" width="30" height="30" clip-path="url(#st-clip-${s.id})"/><circle cx="12" cy="-12" r="8" fill="#ffd23f"/><text x="12" y="-8" text-anchor="middle" class="sticker-num">${s.id}</text></g>`;
  }).join('');
  const arcs = tapes.map(([p, f, text]) => {
    const [a, b] = PAIRS[p], ang = angleBetween(STICKERS[a], STICKERS[b]), u = dirOf(STICKERS[a]), v = dirOf(STICKERS[b]);
    const pts = Array.from({ length: 21 }, (_, i) => { const t = ang * f * i / 20, s0 = Math.sin(ang - t) / Math.sin(ang), s1 = Math.sin(t) / Math.sin(ang); return P(u.map((c, j) => (c * s0 + v[j] * s1) * 1.01)); });
    const mid = pts[10];
    return `<path d="M${pts.map(q => q.map(n => n.toFixed(1)).join(' ')).join(' L')}" fill="none" stroke="#ffd23f" stroke-width="4" stroke-linecap="round"/>${text ? `<rect x="${mid[0] - 30}" y="${mid[1] - 26}" width="60" height="20" rx="6" fill="#ffd23f"/><text x="${mid[0]}" y="${mid[1] - 11}" text-anchor="middle" class="tape-read">${text}</text>` : ''}`;
  }).join('');
  setHTML('#balloon2d-g', `<ellipse cx="${cx}" cy="398" rx="210" ry="18" fill="#141a35"/>
    <path d="M${cx} ${by + R} L${cx - 6} ${by + R + 14} L${cx + 6} ${by + R + 14}Z" fill="#3a4fd8"/><path d="M${cx} ${by + R + 14} C${cx + 20} 390 ${cx + 120} 386 ${cx + 150} 372" stroke="#1c2442" stroke-width="6" fill="none"/>
    <circle cx="${cx}" cy="${by}" r="${R.toFixed(1)}" fill="url(#balloon2d)"/><ellipse cx="${cx - R * .38}" cy="${by - R * .45}" rx="${(R * .2).toFixed(1)}" ry="${(R * .1).toFixed(1)}" fill="#fff" opacity=".35" transform="rotate(-35 ${cx - R * .38} ${by - R * .45})"/>
    ${arcs}${stick}
    <g transform="translate(${cx + 160} 270)"><rect x="-12" y="${(-30 - pumpY * 50).toFixed(1)}" width="24" height="6" rx="3" fill="#1c2442"/><rect x="-2" y="${(-26 - pumpY * 50).toFixed(1)}" width="4" height="${(30 + pumpY * 50).toFixed(1)}" fill="#c9d1db"/><rect x="-14" y="0" width="28" height="104" rx="6" fill="#e04848"/><rect x="-30" y="100" width="60" height="8" rx="3" fill="#1c2442"/><text y="128" text-anchor="middle" class="obj-name">펌프</text></g>`);
}
function renderTable() {
  const cell = (p, ph) => { const v = table[ph][p];  return `<text x="${ph === 'little' ? 160 : 238}" y="${70 + p * 32}" text-anchor="middle" class="table-num${v !== undefined ? ' on' : ''}">${v !== undefined ? v.toFixed(1) : '?'}</text>`; };
  setHTML('#tape-table', `<rect width="282" height="${show ? 196 : 168}" rx="12" fill="#070914ee" stroke="#2d3566"/>
    <text x="14" y="24" class="panel-title">붙임딱지 사이의 거리(cm)</text>
    <text x="160" y="44" text-anchor="middle" class="panel-small">조금 불었을 때</text><text x="238" y="44" text-anchor="middle" class="panel-small">많이 불었을 때</text>
    ${PAIRS.map((pr, p) => `<text x="14" y="${70 + p * 32}" class="panel-text">${pr[0] + 1}과 ${pr[1] + 1} 사이</text>${cell(p, 'little')}${cell(p, 'much')}`).join('')}
    <text x="14" y="${158}" class="panel-small">풍선: ${PHASES[phase]}</text>
    ${show ? `<text x="14" y="184" class="panel-small" style="fill:#ffcf6e">붙임딱지의 크기는 그대로예요</text>` : ''}`);
}

/* ---------- 팽창의 중심이 있을까? ---------- */
function chooseRef(i) { ref = i; scale = 1; playing = false; refsTried.add(i); renderControls(); }
function stepCenter(dt) {
  if (playing) { scale = Math.min(1.8, scale + dt * (instantLessons.matches ? 10 : .2)); if (scale > 1.5 && !expandedRefs.has(ref)) { expandedRefs.add(ref); renderText(); } if (scale >= 1.8) { playing = false; toast(`🌌 은하 ${REFS[ref][0]}에서 보아도 다른 모든 은하가 멀어졌어요`); renderControls(); } }
  const g = fx.begin(); if (!g) return;
  const R = ref === null ? { x: 0, y: 0 } : field[REFS[ref][1]];
  const P = gg => { const s = seenFrom(R, gg, scale); return [FIELD.cx + s.x * FIELD.k, FIELD.cy + s.y * FIELD.k]; };
  // 우주 공간의 눈금: 우주가 늘어나면 눈금 사이도 함께 넓어져요.
  if (show) {
    g.strokeStyle = 'rgba(143,211,255,.13)'; g.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      const [x] = P({ x: R.x + i * .5 - (R.x % .5), y: 0 }), [, y] = P({ x: 0, y: R.y + i * .5 - (R.y % .5) });
      g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 404); g.stroke();
      g.beginPath(); g.moveTo(0, y); g.lineTo(800, y); g.stroke();
    }
  }
  field.forEach((gg, i) => {
    const [x, y] = P(gg), [x0, y0] = (() => { const s = seenFrom(R, gg, 1); return [FIELD.cx + s.x * FIELD.k, FIELD.cy + s.y * FIELD.k]; })();
    if (ref !== null && scale > 1.01 && REFS[ref][1] !== i) {
      g.strokeStyle = 'rgba(255,207,110,.75)'; g.lineWidth = 1.6; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
      const a = Math.atan2(y - y0, x - x0); g.fillStyle = 'rgba(255,207,110,.9)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a - .4) * 9, y - Math.sin(a - .4) * 9); g.lineTo(x - Math.cos(a + .4) * 9, y - Math.sin(a + .4) * 9); g.fill();
    }
    const s = gg.size * 46, im = imgs[gg.img - 1];
    g.save(); g.translate(x, y); g.rotate(gg.rot * Math.PI / 180); g.globalCompositeOperation = 'lighter';
    if (im.complete && im.naturalWidth) g.drawImage(im, -s / 2, -s / 2, s, s);
    g.restore();
  });
  REFS.forEach(([name, idx], i) => {
    const [x, y] = P(field[idx]), on = ref === i;
    g.strokeStyle = on ? '#ffcf6e' : 'rgba(255,255,255,.6)'; g.lineWidth = on ? 3 : 1.5;
    g.beginPath(); g.arc(x, y, 26, 0, 7); g.stroke();
    g.font = "800 15px Pretendard, 'Noto Sans KR', sans-serif"; g.fillStyle = on ? '#ffcf6e' : '#fff'; g.textAlign = 'center';
    g.fillText(on ? `은하 ${name} (기준)` : `은하 ${name}`, x, y - 32);
  });
  setText('#center-title', ref === null ? '우주 지도 · 기준 은하를 골라 보세요' : `은하 ${REFS[ref][0]}에서 본 우주 · 우주가 ${scale.toFixed(2)}배로 늘어났어요`);
}

/* ---------- 우주의 시작 ---------- */
const funnelH = x => 6 + TIME.h * Math.pow(Math.max(0, (x - TIME.x0) / (TIME.x1 - TIME.x0)), .75);
const timeGal = Array.from({ length: 70 }, (_, i) => { let s = i * 7919 + 13; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; return { t: .28 + rr() * .72, u: rr() * 2 - 1, v: rr() * 2 - 1, img: 1 + (i % 14), size: 8 + rr() * 12 }; });
function stepTime(dt) {
  if (tPlaying) { tCursor = Math.min(1, tCursor + dt / (instantLessons.matches ? .01 : 7)); if (tCursor >= 1) { tPlaying = false; if (!timeDone) { timeDone = true; toast('🌌 우주는 약 138억 년 전 대폭발 이후 점점 팽창하여 현재와 같은 모습이 되었어요'); } renderControls(); } }
  const g = fx.begin(); if (!g) return;
  const xc = TIME.x0 + (TIME.x1 - TIME.x0) * tCursor;
  // 깔때기 모양(교과서 그림 VIII 9): 왼쪽 끝이 대폭발, 오른쪽이 현재
  g.save();
  g.beginPath(); g.moveTo(TIME.x0, TIME.cy);
  for (let x = TIME.x0; x <= xc; x += 4) g.lineTo(x, TIME.cy - funnelH(x));
  g.lineTo(xc, TIME.cy + funnelH(xc));
  for (let x = xc; x >= TIME.x0; x -= 4) g.lineTo(x, TIME.cy + funnelH(x));
  g.closePath();
  const grad = g.createLinearGradient(TIME.x0, 0, TIME.x1, 0);
  grad.addColorStop(0, 'rgba(255,214,140,.65)'); grad.addColorStop(.18, 'rgba(255,140,90,.28)'); grad.addColorStop(.4, 'rgba(199,125,255,.16)'); grad.addColorStop(1, 'rgba(70,90,220,.14)');
  g.fillStyle = grad; g.fill(); g.strokeStyle = 'rgba(143,211,255,.45)'; g.lineWidth = 1.5; g.stroke(); g.clip();
  // 은하들: 시간이 지나 만들어지고, 우주가 팽창하면서 서로 멀어져요(은하의 크기는 그대로).
  g.globalCompositeOperation = 'lighter';
  for (const p of timeGal) {
    const x = TIME.x0 + (TIME.x1 - TIME.x0) * p.t;
    if (x > xc) continue;
    const h = funnelH(x), y = TIME.cy + p.v * h * .82, xx = x + p.u * 10, im = imgs[p.img - 1];
    if (im.complete && im.naturalWidth) g.drawImage(im, xx - p.size / 2, y - p.size / 2, p.size, p.size);
  }
  g.restore();
  // 시간마다 우주의 단면(지금 보고 있는 때)
  g.strokeStyle = '#ffcf6e'; g.lineWidth = 2; g.setLineDash([5, 4]);
  g.beginPath(); g.ellipse(xc, TIME.cy, Math.max(2, funnelH(xc) * .16), funnelH(xc), 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  // 대폭발의 빛
  const glow = g.createRadialGradient(TIME.x0, TIME.cy, 0, TIME.x0, TIME.cy, 34);
  glow.addColorStop(0, 'rgba(255,255,255,1)'); glow.addColorStop(.35, 'rgba(255,230,160,.8)'); glow.addColorStop(1, 'rgba(255,120,60,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(TIME.x0, TIME.cy, 34, 0, 7); g.fill();
  g.font = "700 14px Pretendard, 'Noto Sans KR', sans-serif"; g.fillStyle = '#ffcf6e'; g.textAlign = 'center';
  g.fillText(tCursor < .02 ? '대폭발' : tCursor > .98 ? '현재' : `대폭발 후 약 ${Math.max(1, Math.round(tCursor * 138))}억 년`, xc, TIME.cy - funnelH(xc) - 12);
}

/* ---------- 비유 되돌아보기 ---------- */
function renderAnalogy() {
  const L = i => [70, 92 + i * 62], Rr = i => [470, 92 + i * 62];
  const lines = [...matched].map(i => { const j = REAL_ORDER.indexOf(i), [x0, y0] = L(i), [x1, y1] = Rr(j); return `<path d="M${x0 + 260} ${y0} C${x0 + 320} ${y0} ${x1 - 60} ${y1} ${x1} ${y1}" stroke="#5fe08a" stroke-width="3" fill="none"/>`; }).join('')
    + wrongFlash.map(([i, j]) => { const [x0, y0] = L(i), [x1, y1] = Rr(j); return `<path d="M${x0 + 260} ${y0} L${x1} ${y1}" stroke="#ff8a9a" stroke-width="3" stroke-dasharray="6 5" fill="none"/>`; }).join('');
  const card = (x, y, text, attrs, state) => `<g ${attrs} role="button" tabindex="0" class="match-card ${state}"><rect x="${x}" y="${y - 22}" width="260" height="44" rx="10"/><text x="${x + 130}" y="${y + 5}" text-anchor="middle">${text}</text></g>`;
  const ox = OX.map(([t, ans, why], i) => {
    const a = oxAnswers[i], y = 300 + i * 44, ok = a !== undefined && a === ans;
    return `<text x="60" y="${y}" class="ox-text">${i + 1}. ${t}</text>${['O', 'X'].map((v, k) => `<g data-ox="${i}" data-val="${k === 0}" role="button" tabindex="0" class="ox-btn ${a === (k === 0) ? (ok ? 'right' : 'wrong') : ''}"><rect x="${680 + k * 50}" y="${y - 20}" width="40" height="28" rx="8"/><text x="${700 + k * 50}" y="${y}" text-anchor="middle">${v}</text></g>`).join('')}${a !== undefined && show ? `<text x="76" y="${y + 18}" class="ox-why ${ok ? 'right' : 'wrong'}">${ok ? '맞아요. ' : '다시 생각해 봐요. '}${ok ? why : ''}</text>` : ''}`;
  }).join('');
  setHTML('#analogy-view', `<text x="200" y="40" text-anchor="middle" class="panel-title">풍선 모형</text><text x="600" y="40" text-anchor="middle" class="panel-title">실제 우주</text>
    <text x="400" y="62" text-anchor="middle" class="panel-small">왼쪽에서 하나, 오른쪽에서 하나를 차례로 눌러 짝을 지어 보세요.</text>
    ${lines}${ANALOGY.model.map((t, i) => card(...L(i), t, `data-match-model="${i}"`, matched.has(i) ? 'done' : pickModel === i ? 'picked' : '')).join('')}
    ${REAL_ORDER.map((i, j) => card(...Rr(j), ANALOGY.real[i], `data-match-real="${i}"`, matched.has(i) ? 'done' : '')).join('')}
    <text x="60" y="270" class="panel-title">풍선 모형과 실제 우주는 무엇이 다를까요? 맞으면 O, 틀리면 X</text>${ox}`);
  $$('[data-match-model]').forEach(g => g.onclick = () => { pickModel = +g.dataset.matchModel; renderAnalogy(); });
  $$('[data-match-real]').forEach(g => g.onclick = () => {
    if (pickModel === null) return toast('먼저 왼쪽(풍선 모형)에서 하나를 골라요');
    const i = +g.dataset.matchReal, j = REAL_ORDER.indexOf(i);
    if (i === pickModel) { matched.add(i); toast(`🔗 ${ANALOGY.model[i]} ↔ ${ANALOGY.real[i]}`); }
    else { wrongFlash.push([pickModel, j]); setTimeout(() => { wrongFlash.shift(); renderAnalogy(); }, 1200); toast('다시 생각해 봐요'); }
    pickModel = null; renderAnalogy(); renderText();
  });
  $$('[data-ox]').forEach(g => g.onclick = () => { oxAnswers[+g.dataset.ox] = g.dataset.val === 'true'; renderAnalogy(); renderText(); });
  $$('#analogy-view [role=button]').forEach(g => g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.onclick(); } });
}

/* ---------- 조작 단추 ---------- */
function renderControls() {
  if (tab === 'balloon') {
    const busy = inflT < 1 || !!measuring;
    $('#controls').innerHTML = `<button id="inflate-little" ${busy || phase !== 'flat' ? 'disabled' : ''}>🎈 공기 조금 넣기</button><button id="measure-tape" ${busy || phase === 'flat' || stuck < 1 ? 'disabled' : ''}>📏 줄자로 거리 재기</button><button id="inflate-more" ${busy || phase !== 'little' || Object.keys(table.little).length < 3 ? 'disabled' : ''}>🎈 공기 더 넣기</button><button id="deflate" ${busy ? 'disabled' : ''}>↺ 바람 빼기</button>`;
    $('#inflate-little').onclick = () => inflate('little');
    $('#inflate-more').onclick = () => inflate('much');
    $('#measure-tape').onclick = measure;
    $('#deflate').onclick = () => { phase = 'flat'; rFrom = r; rTo = RADII.flat; inflT = 0; stuck = 0; renderControls(); };
  } else if (tab === 'center') {
    $('#controls').innerHTML = `<div role="group" aria-label="기준 은하"><span class="group-label">기준 은하</span>${REFS.map(([n], i) => `<button data-ref="${i}" aria-pressed="${ref === i}">은하 ${n}</button>`).join('')}</div><button id="expand" ${ref === null || playing ? 'disabled' : ''}>▶ 우주 팽창시키기</button><button id="expand-reset" ${ref === null ? 'disabled' : ''}>↺ 처음 크기로</button>`;
    $$('[data-ref]').forEach(b => b.onclick = () => chooseRef(+b.dataset.ref));
    $('#expand').onclick = () => { if (scale >= 1.8) scale = 1; playing = true; renderControls(); };
    $('#expand-reset').onclick = () => { scale = 1; playing = false; renderControls(); };
  } else if (tab === 'time') {
    $('#controls').innerHTML = `<button id="time-play" ${tPlaying ? 'disabled' : ''}>▶ 대폭발부터 현재까지</button><label class="space-range"><span>시간</span><input type="range" id="time-range" min="0" max="1000" value="${Math.round(tCursor * 1000)}" aria-label="대폭발 이후 시간"></label>`;
    $('#time-play').onclick = () => { if (tCursor >= 1) tCursor = 0; tPlaying = true; renderControls(); };
    $('#time-range').oninput = e => { tPlaying = false; tCursor = +e.target.value / 1000; if (tCursor >= 1 && !timeDone) { timeDone = true; renderText(); } };
  } else {
    $('#controls').innerHTML = '';
    renderAnalogy();
  }
  renderText();
}
function setTab(id) {
  tab = id; lab.selectTab(id);
  const stage = $('.stage');
  stage.dataset.tab = id;
  stage.classList.toggle('three-on', id === 'balloon' && use3d);
  $('#view-bar')?.toggleAttribute('data-off', id !== 'balloon');
  if (id === 'balloon' && use3d) view3d.view?.invalidate();
  fx.clear();
  renderControls();
}
const oxDone = () => OX.every(([, ans], i) => oxAnswers[i] === ans);
function renderText() {
  const T = {
    balloon: ['풍선이 커지면 붙임딱지 사이의 거리는 어떻게 달라질까요?', '‘공기 조금 넣기’로 붙임딱지를 붙이고 ‘줄자로 거리 재기’를 해요. 그다음 ‘공기 더 넣기’를 누른 뒤 다시 재어 비교해요.'],
    center: ['우주가 팽창할 때 팽창의 중심이 있을까요?', '기준 은하를 고르고 ‘우주 팽창시키기’를 눌러요. 다른 기준 은하를 골라 다시 해 보면 무엇을 알 수 있나요?'],
    time: ['우주는 어떻게 시작되어 지금의 모습이 되었을까요?', '‘대폭발부터 현재까지’를 누르거나 시간 막대를 움직여 우주가 팽창해 온 모습을 살펴봐요.'],
    analogy: ['풍선 모형과 실제 우주를 비교해 보세요.', '풍선 모형의 무엇이 실제 우주의 무엇에 해당하는지 짝을 짓고, 풍선 모형이 실제 우주와 다른 점도 생각해 봐요.'],
  }[tab];
  setText('#guide', T[0]); setText('#subguide', T[1]);
  setText('#stage-state', tab === 'balloon' ? `풍선: ${PHASES[phase]}` : tab === 'center' ? '우주 지도(모형)' : tab === 'time' ? '우주 팽창(모형)' : '비유 되돌아보기');
  setText('#note-title', { balloon: '풍선이 커지면 붙임딱지 사이는?', center: '어느 은하에서 보아도?', time: '대폭발은 언제 일어났을까요?', analogy: '비유가 잘 나타내는 것과 못 나타내는 것' }[tab]);
  setText('#note-text', { balloon: '붙임딱지는 풍선에 붙어 있어 움직이지 않아요. 그런데 풍선 표면이 늘어나면 붙임딱지 사이의 거리가 어떻게 될까요?', center: '은하들이 스스로 움직여서라기보다, 은하 사이의 공간(눈금)이 늘어나요. 은하의 크기는 그대로예요. 어느 은하에서 보아도 다른 은하들이 멀어지므로, 우리은하가 우주의 중심이라고 할 수 없어요.', time: '과학자들은 우주가 약 138억 년 전 온도와 밀도가 매우 높은 아주 작은 상태(한 점)에서 대폭발이 일어나 시작된 뒤 점점 팽창했다고 설명해요.', analogy: '모형은 직접 볼 수 없는 우주를 이해하는 데 도움이 되지만, 실제와 똑같지는 않아요.' }[tab]);
  const row = p => `<tr><td>${PAIRS[p][0] + 1}–${PAIRS[p][1] + 1}</td><td>${table.little[p]?.toFixed(1) ?? ''}</td><td>${table.much[p]?.toFixed(1) ?? ''}</td></tr>`;
  setHTML('#readout', `<table class="data-table"><tr><th>사이(cm)</th><th>조금</th><th>많이</th></tr>${PAIRS.map((_, p) => row(p)).join('')}</table><table class="data-table"><tr><th>확인</th><th></th></tr><tr><td>기준 은하</td><td>${expandedRefs.size ? `${expandedRefs.size}개로 해 봄` : ''}</td></tr><tr><td>대폭발~현재</td><td>${timeDone ? '✓' : ''}</td></tr><tr><td>비유 짝짓기</td><td>${matched.size}/3</td></tr><tr><td>다른 점 O·X</td><td>${oxDone() ? '✓' : ''}</td></tr></table>`);
  setText('#model-note', '풍선의 크기와 거리는 실험하기 쉽게 정한 값이에요(1–2, 1–3, 2–3 사이의 거리는 풍선 표면을 따라 잰 값). 우주 지도와 깔때기 그림은 우주 팽창을 이해하기 위한 모형이며, 실제 우주의 모양을 나타낸 것은 아니에요.');
  setText('#discovery', '미국의 천문학자 허블은 1920년대에 우리은하 바깥에 많은 은하들이 존재한다는 것을 밝혀냈고(1924년 발표), 외부 은하를 관측하여 대부분의 외부 은하가 우리은하로부터 멀어지고 있다는 사실을 알아냈어요(1929년).');
}

/* ---------- 3D ---------- */
const view3d = setupViewToggle({
  stage: $('.stage'), key: 'balloon-view', cams: [['oblique', '비스듬히'], ['front', '앞에서'], ['top', '위에서']],
  load: () => import('./src/balloon-3d.js').then(({ createBalloon3D }) => createBalloon3D({ stage: $('.stage'), svg: $('#scene'), reducedMotion: instantLessons })),
  onChange: active => { use3d = active; $('.stage').classList.toggle('three-on', active && tab === 'balloon'); renderText(); },
});
$('#tab-balloon').onclick = () => setTab('balloon');
$('#tab-center').onclick = () => setTab('center');
$('#tab-time').onclick = () => setTab('time');
$('#tab-analogy').onclick = () => setTab('analogy');
$('#show-detail').onchange = e => { show = e.target.checked; if (tab === 'analogy') renderAnalogy(); };
$('#reset').onclick = () => { measuring = null; phase = 'flat'; r = rFrom = rTo = RADII.flat; inflT = 1; stuck = 0; ref = null; scale = 1; playing = false; tCursor = 0; tPlaying = false; pickModel = null; renderControls(); };

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now; time += dt;
  if (!flow || flow.stage === 'observe') {
    if (tab === 'balloon') stepBalloon(dt);
    else if (tab === 'center') stepCenter(dt);
    else if (tab === 'time') { stepTime(dt); const rg = $('#time-range'); if (rg && tPlaying) rg.value = Math.round(tCursor * 1000); }
    flow?.update(checklist([
      ['풍선에 공기를 조금 넣고 붙임딱지 사이의 거리 재기', Object.keys(table.little).length === 3, '‘공기 조금 넣기’를 누른 뒤 ‘줄자로 거리 재기’를 눌러요'],
      ['공기를 더 넣고 다시 거리를 재어 비교하기', Object.keys(table.much).length === 3, '‘공기 더 넣기’를 누른 뒤 ‘줄자로 거리 재기’를 눌러요', '#inflate-more'],
      ['기준 은하를 바꾸어 팽창의 중심이 있는지 알아보기', expandedRefs.size >= 2, '‘팽창의 중심이 있을까?’ 탭에서 ‘은하 가’를 고르고 ‘우주 팽창시키기’를 누른 뒤, ‘은하 나’로도 해 봐요', '#tab-center'],
      ['대폭발부터 현재까지 우주의 팽창 살펴보기', timeDone, '‘우주의 시작’ 탭에서 ‘대폭발부터 현재까지’를 눌러요', '#tab-time'],
      ['풍선 모형과 실제 우주를 짝짓고 다른 점 찾기', matched.size === 3 && oxDone(), '‘비유 되돌아보기’ 탭에서 풍선 모형과 실제 우주를 짝지은 뒤, 아래 문장에 O·X로 답해요', '#tab-analogy'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  model: 'far',
  predict: {
    title: '풍선을 더 크게 불면<br>붙임딱지 사이의 거리는?',
    lead: '허블은 대부분의 외부 은하가 우리은하로부터 멀어지고 있다는 사실을 알아냈어요. 은하들이 멀어진다는 것은 무엇을 의미할까요?<br>우주를 직접 늘려 볼 수는 없으니, <b>풍선 표면을 우주</b>에, <b>풍선에 붙인 붙임딱지를 은하</b>에 비유한 모형으로 알아봐요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="은하 붙임딱지 세 개를 붙인 풍선과 펌프"><rect width="520" height="250" rx="12" fill="#0a0d22"/><circle cx="220" cy="118" r="88" fill="url(#balloon2d)"/><path d="M220 206 L212 222 H228Z" fill="#3a4fd8"/><path d="M220 222 C260 240 330 236 372 220" stroke="#1c2442" stroke-width="6" fill="none"/><rect x="372" y="120" width="26" height="100" rx="6" fill="#e04848"/><rect x="383" y="86" width="4" height="36" fill="#c9d1db"/><rect x="368" y="84" width="34" height="6" rx="3" fill="#1c2442"/>${[[190, 90, 1], [240, 70, 2], [252, 130, 3]].map(([x, y, n]) => `<circle cx="${x}" cy="${y}" r="15" fill="#f4f1ea"/><circle cx="${x}" cy="${y}" r="11" fill="#14162e"/><circle cx="${x}" cy="${y}" r="5" fill="#ffe2b0" opacity=".8"/><circle cx="${x + 11}" cy="${y - 11}" r="7" fill="#ffd23f"/><text x="${x + 11}" y="${y - 7}" text-anchor="middle" font-size="10" font-weight="800" fill="#1d1505">${n}</text>`).join('')}<text x="64" y="40" font-size="14" fill="#cbd8ff">풍선 표면 = 우주</text><text x="64" y="62" font-size="14" fill="#cbd8ff">붙임딱지 = 은하</text></svg>`,
    question: '붙임딱지 세 개를 붙인 풍선에 공기를 더 넣으면, 붙임딱지 사이의 거리는 어떻게 될까요?',
    choices: ['모든 붙임딱지 사이의 거리가 멀어지고, 기준이 되는 특별한 붙임딱지는 없을 것 같아요.', '한 붙임딱지를 중심으로 다른 붙임딱지들만 멀어질 것 같아요.', '붙임딱지 사이의 거리는 변하지 않을 것 같아요.'],
    placeholder: '풍선에 그림을 그리고 풍선을 불어 본 경험을 떠올려 보세요. 붙임딱지는 풍선 위에서 움직일까요?',
  },
  observe: {
    title: '풍선 모형 실험으로 우주 팽창을 알아보고, 비유를 되돌아보세요.',
    recordLabel: '풍선을 조금 불었을 때와 많이 불었을 때 붙임딱지 사이의 거리, 기준 은하를 바꾸었을 때 본 것, 풍선 모형과 실제 우주의 비교를 적어 보세요.',
    placeholder: '1–2, 1–3, 2–3 사이의 거리가 어떻게 달라졌는지, 기준이 되는 지점이 있었는지, 풍선 모형의 무엇이 우주의 무엇에 해당하는지 적어 보세요.',
    // 관찰 기록을 활동마다 나눠 써요(src/poe-flow.js). title은 활동(탭이나 과정)의 이름이에요.
    parts: [
      { title: '풍선 모형 실험', label: '풍선을 조금 불었을 때와 많이 불었을 때 붙임딱지 사이의 거리를 비교해 적어 보세요.', placeholder: '1–2, 1–3, 2–3 사이의 거리가 어떻게 달라졌는지 적어 보세요.' },
      { title: '팽창의 중심이 있을까?', label: '기준 은하를 바꾸어 우주를 팽창시켰을 때 본 것을 적어 보세요.', placeholder: '어느 은하를 기준으로 해도 다른 은하들이 어떻게 보였는지 적어 보세요.' },
      { title: '비유 되돌아보기', label: '풍선 모형과 실제 우주를 비교하여, 풍선 모형의 무엇이 우주의 무엇에 해당하는지 적어 보세요.', placeholder: '풍선 표면, 풍선이 커지는 것, 붙임딱지가 각각 무엇에 해당하는지, 다른 점은 무엇인지 적어 보세요.' },
    ],
  },
  explain: {
    question: '실험 결과를 바탕으로 우주에서 은하들이 서로 멀어지는 까닭을 추리해 보세요. 풍선 모형이 실제 우주와 비슷한 점과 다른 점도 함께 써 보세요.',
    concepts: [
      ['외부 은하', '우리은하 바깥에 분포하는 은하를 <b>외부 은하</b>라고 해요. 허블은 외부 은하를 관측하여 대부분의 외부 은하가 우리은하로부터 멀어지고 있다는 사실을 알아냈어요.'],
      ['풍선 모형과 우주', '<b class="subj">풍선 표면은</b> <b>우주</b>, 풍선 표면이 늘어나는 것은 우주의 팽창, 붙임딱지는 은하에 비유할 수 있어요. 풍선 표면에 붙인 붙임딱지는 움직이지 않지만, 풍선 표면이 팽창하면서 붙임딱지 사이의 거리가 멀어져요.'],
      ['우주 팽창', '우주에서 외부 은하들이 서로 멀어지는 것은 은하들이 직접 움직이는 것이 아니라 <b class="subj">우주 공간이</b> <b>팽창하기 때문</b>이에요. 우주 공간은 <b>특정한 중심 없이</b> 모든 방향으로 팽창하고 있으며, 우주 어느 지점을 관측해도 대부분의 은하가 서로 멀어지고 있어요.'],
      ['대폭발', '과학자들은 우주가 <b>약 138억 년 전</b> 온도와 밀도가 매우 높은 아주 작은 상태(한 점)에서 대폭발이 일어나 시작된 뒤, 점점 팽창하여 현재와 같은 모습이 되었다고 설명해요.'],
    ],
    note: '비유의 한계: 풍선 모형에서는 풍선의 표면만 우주를 나타내요. 풍선의 안쪽과 중심은 우주에 해당하지 않아요. 둥글고 크기를 잴 수 있는 풍선과 달리, 실제 우주의 모양은 아직 정확히 알지 못하고 우주의 크기가 유한한지 무한한지도 알지 못해요. 또 우주에는 팽창의 중심이 따로 없어요.',
  },
  onRestart: () => {
    show = true; $('#show-detail').checked = true;
    for (const k of Object.keys(table.little)) delete table.little[k];
    for (const k of Object.keys(table.much)) delete table.much[k];
    refsTried.clear(); expandedRefs.clear(); timeDone = false; matched.clear(); for (const k of Object.keys(oxAnswers)) delete oxAnswers[k];
    lab.resetQuiz(); $('#reset').click(); setTab('balloon');
  },
});
setTab('balloon');
requestAnimationFrame(frame);
