import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import './gas.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, instantLessons } from './src/lab-shell.js';
import { BOTTLE_SETUPS, clayDepthMm } from './src/gas-model.js';
import { seeded } from './src/gas-particles.js';

// 중학교 1학년 Ⅵ. 기체의 성질 01 기체의 압력(1~2차시).
// 지도상 유의점: 압력의 의미는 생활 속 예로 설명하고, 기체의 압력은 ‘기체 입자가 일정한 넓이에 충돌하며 가하는 힘’ 수준에서 다뤄요.
// 압력의 단위는 소개하는 정도로만 다루고 단위 환산은 하지 않아요. 구슬은 컵을 흔들어야 움직이지만
// 실제 기체 입자는 스스로 모든 방향으로 움직인다는 모형의 한계를 함께 알려 줘요(오개념: 기체의 압력은 아래로만 작용한다).

const terms = [
  ['압력', '일정한 넓이에 작용하는 힘의 크기예요. 힘이 클수록, 힘이 작용하는 넓이가 좁을수록 압력이 커요.'],
  ['기체의 압력', '기체 입자가 끊임없이 운동하며 주위에 충돌할 때, 일정한 넓이에 작용하는 힘의 크기예요. 기압이라고도 해요.'],
  ['기체 입자의 운동', '기체 입자는 스스로 끊임없이 모든 방향으로 빠르게 움직이며 주위에 충돌해요.'],
  ['모형', '눈으로 볼 수 없는 입자의 운동을 설명하려고 구슬 같은 물체로 나타낸 것이에요. 실제와 다른 점(한계)도 있어요.'],
];

/* ---------- 무대 ---------- */
const CLAY_TOP = 330, STATIONS = { a: 160, b: 400, c: 640 };
const DESC = { a: '물 가득 · 바로 세움', b: '물 가득 · 뒤집어 세움', c: '물 반 · 뒤집어 세움' };
// 페트병(바닥 y=0, 위로 174): 몸통, 어깨, 목, 뚜껑
const BODY = 'M-33 0 V-110 C-33 -134 -14 -140 -12 -150 V-160 H12 V-150 C14 -140 33 -134 33 -110 V0 Z';
const bottle = id => {
  const { water, upright } = BOTTLE_SETUPS[id];
  // 물은 중력 때문에 아래쪽에 모여요: 바로 세우면 바닥 쪽, 뒤집으면 뚜껑 쪽
  const level = water === '가득' ? 150 : 80;
  const wy = upright ? -level : -160, wh = upright ? level : level;
  return `<g id="bottle-${id}"><clipPath id="bclip-${id}"><path d="${BODY}"/></clipPath>
    <rect x="-36" y="0" width="72" height="6" rx="1" fill="#e9e2d0"/>
    <path d="${BODY}" fill="#dfeffa22" stroke="#cfe6f5" stroke-width="2"/>
    <rect x="-34" y="${wy}" width="68" height="${wh}" fill="#4fa8ff" opacity=".55" clip-path="url(#bclip-${id})"/>
    <path d="M-24 -104 V-20" stroke="#ffffff55" stroke-width="5" stroke-linecap="round"/>
    <rect x="-13" y="-174" width="26" height="14" rx="3" fill="#3f7ad6"/></g>`;
};
const station = id => `<g id="station-${id}">
  <path id="clay-${id}" fill="#c99d74" stroke="#8a6142" stroke-width="1.5"/>
  ${bottle(id)}
  <text x="${STATIONS[id]}" y="384" text-anchor="middle" class="gas-big">${BOTTLE_SETUPS[id].name}</text>
  <text x="${STATIONS[id]}" y="404" text-anchor="middle" class="gas-small">${DESC[id]}</text>
  <text id="depth-${id}" x="${STATIONS[id] + 74}" y="${CLAY_TOP + 20}" class="gas-num"></text>
  <g id="timer-${id}" transform="translate(${STATIONS[id] + 58} 120)"></g></g>`;

const CUP = { cx: 400, rim: 120, bottom: 320, top: 120, base: 90 };
const BEAD_COLORS = ['#ff6b6b', '#ffd166', '#5cc8ff', '#7dffb0', '#c77dff', '#ff9f6b', '#9fb3ff'];
const BALLOON = { cx: 300, cy: 205, R: 150 };
const SIDES = [['up', '위'], ['down', '아래'], ['left', '왼쪽'], ['right', '오른쪽']];

const scene = `
<defs><linearGradient id="gas-table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f4d"/><stop offset="1" stop-color="#11142a"/></linearGradient>
<radialGradient id="balloon-fill" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ff9ab8" stop-opacity=".32"/><stop offset="1" stop-color="#c2255c" stop-opacity=".14"/></radialGradient></defs>
<g id="clay-view">
  <rect x="0" y="${CLAY_TOP + 26}" width="800" height="${440 - CLAY_TOP - 26}" fill="url(#gas-table)"/>
  ${Object.keys(STATIONS).map(station).join('')}
</g>
<g id="cup-view">
  <rect x="0" y="330" width="800" height="110" fill="url(#gas-table)"/>
  <g id="cup-g">
    <path d="M${CUP.cx - CUP.top} ${CUP.rim} L${CUP.cx - CUP.base} ${CUP.bottom} H${CUP.cx + CUP.base} L${CUP.cx + CUP.top} ${CUP.rim}" fill="#dfeffa14" stroke="#cfe6f5" stroke-width="3" stroke-linejoin="round"/>
    <g id="beads"></g>
    <path id="foil" fill="none" stroke="#dfe5ec" stroke-width="5" stroke-linecap="round"/>
    <path d="M${CUP.cx - CUP.top - 4} ${CUP.rim + 12} H${CUP.cx + CUP.top + 4}" stroke="#d9b36a" stroke-width="5" stroke-linecap="round"/>
    <text x="${CUP.cx + CUP.top + 14}" y="${CUP.rim + 16}" class="gas-small">고무줄</text>
    <text x="${CUP.cx + CUP.top + 14}" y="${CUP.rim - 4}" class="gas-small">알루미늄 포일</text>
    <text x="${CUP.cx}" y="${CUP.bottom + 30}" text-anchor="middle" class="gas-label">투명 플라스틱 컵 속 플라스틱 구슬</text>
  </g>
  <g id="foil-meter" transform="translate(620 130)"></g>
</g>
<g id="balloon-view">
  <circle cx="${BALLOON.cx}" cy="${BALLOON.cy}" r="${BALLOON.R}" fill="url(#balloon-fill)" stroke="#ff8fb3" stroke-width="3"/>
  <path d="M${BALLOON.cx - 10} ${BALLOON.cy + BALLOON.R + 12} L${BALLOON.cx} ${BALLOON.cy + BALLOON.R - 2} L${BALLOON.cx + 10} ${BALLOON.cy + BALLOON.R + 12}Z" fill="#ff8fb3"/>
  <g id="gas-flashes"></g><g id="gas-parts"></g>
  <g id="side-bars" transform="translate(500 70)"></g>
</g>
<g id="fx"></g>`;

const lab = buildLab({
  unit: 'g1-6',
  crumb: '01 기체의 압력',
  title: '기체의 압력은 어떻게 생길까?',
  intro: '점토가 눌리는 깊이로 압력을 알아보고, 구슬 모형과 입자 모형으로 기체가 주위에 힘을 가하는 까닭을 찾아보세요.',
  tabs: [{ id: 'clay', label: '점토가 눌리는 깊이' }, { id: 'cup', label: '구슬 컵 모형' }, { id: 'balloon', label: '풍선 속 기체 입자' }],
  toggle: '충돌·화살표 보기',
  sceneLabel: '점토 위에 세운 페트병, 구슬을 넣은 컵, 풍선 속 기체 입자',
  scene,
  terms,
});

/* ---------- 상태 ---------- */
let mode = 'clay', show = false, lastFrame = 0, flow = null;
const press = { a: null, b: null, c: null };          // { t: 경과 시간(초), depth: mm }
const WAIT = 2.6;                                      // ‘1분 정도 기다리기’를 화면에서 줄인 시간(초)
let cupShake = 0, cupT = 0, kickT = 0, foilBulge = -16, foilHits = 0, cupDone = false;
let balloonTime = 0, balloonDone = false;
const sideRate = { up: 0, down: 0, left: 0, right: 0 };

/* ---------- 점토 ---------- */
function clayPath(id, d) {
  const cx = STATIONS[id], cw = BOTTLE_SETUPS[id].upright ? 72 : 26;
  const l = cx - cw / 2, r = cx + cw / 2;
  return `M${cx - 74} ${CLAY_TOP + 26} V${CLAY_TOP} H${l - 6} Q${l} ${CLAY_TOP} ${l} ${(CLAY_TOP + d).toFixed(1)} H${r} Q${r} ${CLAY_TOP} ${r + 6} ${CLAY_TOP} H${cx + 74} V${CLAY_TOP + 26} Z`;
}
const ease = u => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
function paintClay(dt) {
  for (const id of Object.keys(STATIONS)) {
    const s = press[id], cx = STATIONS[id], up = BOTTLE_SETUPS[id].upright;
    let lift = -60, dentPx = 0, wait = 0;
    if (s) {
      s.t += dt;
      const lower = Math.min(1, s.t / .8);
      lift = -60 * (1 - ease(lower));
      wait = Math.min(1, Math.max(0, (s.t - .8) / WAIT));
      const sink = Math.min(1, Math.max(0, (s.t - .8) / (WAIT * .9)));
      dentPx = s.depth * 2.6 * ease(sink);
      if (!s.done && s.t > .8 + WAIT) {
        s.done = true;
        burst($('#fx'), cx, CLAY_TOP, '#ffd166', 10);
        toast(`${BOTTLE_SETUPS[id].name} 점토가 약 ${s.depth.toFixed(1)} mm 눌렸어요`);
        renderText();
      }
    }
    const y = (up ? CLAY_TOP - 6 : CLAY_TOP - 174) + lift + dentPx;
    // 뒤집어 세운 병은 위아래를 뒤집어 그려요(뚜껑 끝이 점토에 닿아요).
    $(`#bottle-${id}`).setAttribute('transform', up ? `translate(${cx} ${y.toFixed(1)})` : `translate(${cx} ${y.toFixed(1)}) scale(1 -1)`);
    $(`#clay-${id}`).setAttribute('d', clayPath(id, dentPx));
    setText(`#depth-${id}`, s?.done ? `약 ${s.depth.toFixed(1)} mm` : '');
    setHTML(`#timer-${id}`, s && !s.done && s.t > .8 ? `<circle r="16" fill="#0a1029" stroke="#2c3966" stroke-width="3"/><path d="M0 -16 A16 16 0 ${wait > .5 ? 1 : 0} 1 ${(16 * Math.sin(wait * 2 * Math.PI)).toFixed(1)} ${(-16 * Math.cos(wait * 2 * Math.PI)).toFixed(1)}" fill="none" stroke="#ffd166" stroke-width="3"/><text y="34" text-anchor="middle" class="gas-small">1분 기다리는 중</text>` : '');
  }
}
function place(id) {
  if (press[id]) return;
  press[id] = { t: 0, depth: clayDepthMm(BOTTLE_SETUPS[id]), done: false };
  if (instantLessons.matches) press[id].t = 10;
  renderControls();
}

/* ---------- 구슬 컵 ---------- */
const rand = seeded(5);
const beads = Array.from({ length: 14 }, (_, i) => ({ x: CUP.cx - 60 + (i % 7) * 20, y: CUP.bottom - 12 - Math.floor(i / 7) * 20, vx: 0, vy: 0, c: BEAD_COLORS[i % BEAD_COLORS.length] }));
const BEAD_R = 10;
$('#beads').innerHTML = beads.map((b, i) => `<circle id="bead-${i}" r="${BEAD_R}" fill="${b.c}" stroke="#ffffff66" stroke-width="1.5"/>`).join('');
const wallX = (y, side) => { const u = (y - CUP.rim) / (CUP.bottom - CUP.rim); return CUP.cx + side * (CUP.top - (CUP.top - CUP.base) * u); };
const foilY = x => { const u = (x - CUP.cx) / CUP.top; return CUP.rim - foilBulge * (1 - u * u); };
function stepCup(dt) {
  cupT += dt;
  const shaking = cupShake > 0;
  // 컵을 흔들면 컵 벽과 바닥이 구슬을 여러 방향으로 세게 쳐 올려요(짧은 간격으로 툭툭).
  let kick = false;
  if (shaking) { cupShake -= dt; kickT -= dt; if (kickT <= 0) { kick = true; kickT = .14; } }
  for (const b of beads) {
    b.vy += 900 * dt;                               // 구슬은 중력을 받아 아래로 떨어져요.
    if (kick) { b.vx += (rand() - .5) * 520; b.vy -= 380 + rand() * 520; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y > CUP.bottom - BEAD_R) { b.y = CUP.bottom - BEAD_R; b.vy = -Math.abs(b.vy) * .55; b.vx *= .9; }
    const lx = wallX(b.y, -1) + BEAD_R, rx = wallX(b.y, 1) - BEAD_R;
    if (b.x < lx) { b.x = lx; b.vx = Math.abs(b.vx) * .8; }
    if (b.x > rx) { b.x = rx; b.vx = -Math.abs(b.vx) * .8; }
    const fy = foilY(b.x) + BEAD_R;
    if (b.y < fy) {
      b.y = fy;
      if (b.vy < 0) {
        const hit = -b.vy;
        b.vy = hit * .7;
        if (hit > 140) { foilHits += 1; foilBulge = Math.min(16, foilBulge + hit * .0011); }
      }
    }
  }
  // 구슬끼리 겹치지 않게 밀어내요.
  for (let i = 0; i < beads.length; i++) for (let j = i + 1; j < beads.length; j++) {
    const p = beads[i], q = beads[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 2 * BEAD_R) {
      const nx = dx / d, ny = dy / d, o = (2 * BEAD_R - d) / 2;
      p.x -= nx * o; p.y -= ny * o; q.x += nx * o; q.y += ny * o;
      const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
      if (rel < 0) { p.vx += rel * nx; p.vy += rel * ny; q.vx -= rel * nx; q.vy -= rel * ny; }
    }
  }
  if (!cupDone && foilBulge > 6) { cupDone = true; toast('알루미늄 포일이 밖으로 불룩하게 튀어나왔어요'); renderText(); }
}
function paintCup() {
  const shake = cupShake > 0 ? Math.sin(cupT * 38) * 7 : 0;
  $('#cup-g').setAttribute('transform', `translate(${shake.toFixed(1)} ${(Math.cos(cupT * 31) * (cupShake > 0 ? 4 : 0)).toFixed(1)})`);
  beads.forEach((b, i) => { const c = $(`#bead-${i}`); c.setAttribute('cx', b.x.toFixed(1)); c.setAttribute('cy', b.y.toFixed(1)); });
  const pts = Array.from({ length: 25 }, (_, i) => { const x = CUP.cx - CUP.top + i * CUP.top / 12; return `${x.toFixed(1)} ${foilY(x).toFixed(1)}`; });
  $('#foil').setAttribute('d', `M${pts.join(' L')}`);
  const shape = foilBulge > 2 ? '밖으로 불룩' : foilBulge < -2 ? '안으로 오목' : '평평';
  setHTML('#foil-meter', `<rect width="160" height="120" rx="12" fill="#0a1029e6" stroke="#2c3966"/><text x="14" y="26" class="gas-title">알루미늄 포일</text><text x="14" y="56" class="gas-label">모양: <tspan class="gas-num">${shape}</tspan></text><text x="14" y="84" class="gas-label">구슬이 부딪힌 횟수</text><text x="14" y="106" class="gas-num">${foilHits}번</text>`);
}

/* ---------- 풍선 속 기체 입자 ---------- */
const gasRand = seeded(23);
const GAS_N = 34, GAS_R = 6, GAS_V = 170;
const gas = Array.from({ length: GAS_N }, () => {
  const a = gasRand() * Math.PI * 2, rr = Math.sqrt(gasRand()) * (BALLOON.R - 20);
  const b = gasRand() * Math.PI * 2;
  return { x: BALLOON.cx + rr * Math.cos(a), y: BALLOON.cy + rr * Math.sin(a), dx: Math.cos(b), dy: Math.sin(b) };
});
$('#gas-parts').innerHTML = gas.map((_, i) => `<path id="gas-arrow-${i}" stroke="#7fe7ff" stroke-width="1.6" stroke-linecap="round" opacity=".75"/><circle id="gas-dot-${i}" r="${GAS_R}" fill="#7fe7ff" filter="url(#glow)"/>`).join('');
function sideOf(nx, ny) { return Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 'right' : 'left') : (ny > 0 ? 'down' : 'up'); }
function stepGas(dt) {
  const hits = { up: 0, down: 0, left: 0, right: 0 };
  for (const p of gas) {
    p.x += p.dx * GAS_V * dt; p.y += p.dy * GAS_V * dt;
    const ox = p.x - BALLOON.cx, oy = p.y - BALLOON.cy, d = Math.hypot(ox, oy), lim = BALLOON.R - GAS_R - 1;
    if (d > lim) {
      const nx = ox / d, ny = oy / d, dot = p.dx * nx + p.dy * ny;
      if (dot > 0) { p.dx -= 2 * dot * nx; p.dy -= 2 * dot * ny; hits[sideOf(nx, ny)] += 1; if (show) flash(BALLOON.cx + nx * BALLOON.R, BALLOON.cy + ny * BALLOON.R); }
      p.x = BALLOON.cx + nx * lim; p.y = BALLOON.cy + ny * lim;
    }
  }
  const k = Math.min(1, dt / 1.5);
  for (const s of Object.keys(hits)) sideRate[s] += (hits[s] / Math.max(dt, 1e-3) - sideRate[s]) * k;
}
function flash(x, y) {
  const layer = $('#gas-flashes');
  if (layer.childElementCount > 16) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', 4);
  c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#ffd166'); c.setAttribute('stroke-width', 2);
  layer.append(c);
  c.animate([{ r: 4, opacity: 1 }, { r: 12, opacity: 0 }], { duration: 420 }).onfinish = () => c.remove();
}
function paintGas() {
  gas.forEach((p, i) => {
    const d = $(`#gas-dot-${i}`); d.setAttribute('cx', p.x.toFixed(1)); d.setAttribute('cy', p.y.toFixed(1));
    $(`#gas-arrow-${i}`).setAttribute('d', show ? `M${p.x.toFixed(1)} ${p.y.toFixed(1)} l${(p.dx * 22).toFixed(1)} ${(p.dy * 22).toFixed(1)}` : '');
  });
  const max = Math.max(12, ...Object.values(sideRate));
  setHTML('#side-bars', `<rect width="280" height="250" rx="14" fill="#0a1029e6" stroke="#2c3966"/><text x="16" y="28" class="gas-title">1초 동안 벽에 부딪힌 횟수</text>
    ${show ? SIDES.map(([k, name], i) => { const v = sideRate[k], w = 170 * v / max; return `<text x="16" y="${70 + i * 44}" class="gas-label">${name}</text><rect x="74" y="${56 + i * 44}" width="${w.toFixed(1)}" height="18" rx="5" fill="#5cc8ff"/><text x="${(80 + w).toFixed(1)}" y="${70 + i * 44}" class="gas-num">${Math.round(v)}번</text>`; }).join('') : '<text x="16" y="74" class="gas-label">위쪽의 ‘충돌·화살표 보기’를 켜면</text><text x="16" y="98" class="gas-label">위·아래·왼쪽·오른쪽 벽에 부딪히는</text><text x="16" y="122" class="gas-label">횟수를 비교할 수 있어요.</text>'}`);
}

/* ---------- 문구와 조작 ---------- */
function renderText() {
  const T = {
    clay: ['페트병을 점토 위에 세우고 점토가 눌리는 깊이를 비교해 보세요.', '(가)·(나)·(다)를 차례로 세워요. 1분 정도 기다렸다가 눌린 깊이를 비교해요. 다르게 한 조건이 무엇인지 생각해 봐요.'],
    cup: ['구슬이 든 컵을 흔들어 알루미늄 포일의 모양 변화를 관찰해 보세요.', '구슬을 기체 입자라고 생각해요. ‘컵 흔들기’를 여러 번 누르며 구슬이 포일에 부딪히는 모습을 봐요.'],
    balloon: ['풍선 속 기체 입자의 움직임을 관찰해 보세요.', '위쪽의 ‘충돌·화살표 보기’를 켜고, 기체 입자가 풍선 안쪽 벽의 어느 방향에 부딪히는지 비교해요.'],
  }[mode];
  setText('#guide', T[0]); setText('#subguide', T[1]);
  setText('#stage-state', mode === 'clay' ? `세운 페트병 ${Object.values(press).filter(Boolean).length} / 3` : mode === 'cup' ? `포일에 부딪힌 횟수 ${foilHits}번` : '풍선 속 기체 입자 · 스스로 모든 방향으로 움직여요');
  setText('#note-title', { clay: '점토가 가장 깊이 눌린 것은?', cup: '포일이 왜 불룩해졌을까요?', balloon: '기체 입자는 어느 방향으로 움직이나요?' }[mode]);
  setText('#note-text', { clay: '(가)와 (나)는 물의 양이 같고, (나)와 (다)는 점토에 닿는 부분의 넓이가 같아요. 두 조건 중 무엇이 깊이를 바꾸었는지 비교해 보세요.', cup: '구슬이 움직이면서 포일에 부딪혀요. 부딪힐 때 포일을 어느 쪽으로 미는지 살펴보세요.', balloon: '기체 입자는 끊임없이 빠르게 움직이며 풍선의 안쪽 벽에 충돌해요. 위·아래·옆의 충돌 횟수를 비교해 보세요.' }[mode]);
  const row = id => { const s = press[id]; return `<tr><td>${BOTTLE_SETUPS[id].name}</td><td>${BOTTLE_SETUPS[id].water}</td><td>${BOTTLE_SETUPS[id].upright ? '넓은 바닥' : '좁은 뚜껑'}</td><td>${s?.done ? `약 ${s.depth.toFixed(1)} mm` : ''}</td></tr>`; };
  setHTML('#readout', `<table class="data-table"><tr><th>병</th><th>물의 양</th><th>닿는 부분</th><th>눌린 깊이</th></tr>${Object.keys(STATIONS).map(row).join('')}</table>`);
  setText('#model-note', { clay: '점토가 눌린 깊이는 보기 쉽게 나타낸 어림값이에요. 실제 실험에서는 점토를 평평하게 편 뒤, 페트병이 기울어지지 않게 세워야 해요.', cup: '구슬은 컵을 흔들어야 움직이고, 흔들지 않으면 중력 때문에 바닥에 가라앉아요. 하지만 실제 기체 입자는 누가 흔들지 않아도 스스로 끊임없이 모든 방향으로 움직여요. 이것이 구슬 모형의 한계예요.', balloon: '입자의 크기와 빠르기는 보기 쉽게 나타냈어요. 실제 기체 입자는 눈에 보이지 않을 만큼 작고, 훨씬 많으며, 훨씬 빠르게 움직여요.' }[mode]);
  setText('#discovery', mode === 'clay' ? '눈이 많이 쌓인 곳에서 설피를 덧신으면 눈에 발이 잘 빠지지 않아요. 왜 그럴까요?' : '자동차 구조용 에어 잭에 공기를 넣으면 무거운 자동차를 들어 올릴 수 있어요.');
}
function renderControls() {
  if (mode === 'clay') {
    $('#controls').innerHTML = `<div role="group" aria-label="페트병 세우기"><span class="group-label">점토 위에 세우기</span>${Object.keys(STATIONS).map(id => `<button data-setup="${id}" aria-pressed="${!!press[id]}" ${press[id] ? 'disabled' : ''}>${BOTTLE_SETUPS[id].name} 세우기</button>`).join('')}</div>`;
    $('#actions').innerHTML = '';
    $$('[data-setup]').forEach(b => b.onclick = () => place(b.dataset.setup));
  } else if (mode === 'cup') {
    $('#controls').innerHTML = '';
    $('#actions').innerHTML = '<button id="shake" class="primary">컵 흔들기</button>';
    $('#shake').onclick = () => { cupShake = Math.min(4, Math.max(cupShake, 0) + 2.4); if (instantLessons.matches) { foilBulge = 10; foilHits += 30; } };
  } else {
    $('#controls').innerHTML = '';
    $('#actions').innerHTML = '';
  }
  renderText();
}
function setMode(next) {
  mode = next; lab.selectTab(next);
  for (const v of ['clay', 'cup', 'balloon']) $(`#${v}-view`).toggleAttribute('hidden', v !== next);
  renderControls();
}
for (const v of ['clay', 'cup', 'balloon']) $(`#tab-${v}`).onclick = () => setMode(v);
$('#show-detail').onchange = e => { show = e.target.checked; renderText(); };
$('#reset').onclick = () => {
  if (mode === 'clay') for (const id of Object.keys(press)) press[id] = null;
  if (mode === 'cup') { foilBulge = -16; foilHits = 0; cupShake = 0; }
  renderControls();
};

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    if (mode === 'clay') paintClay(dt);
    if (mode === 'cup') { for (let i = 0; i < 3; i++) stepCup(dt / 3); paintCup(); }
    if (mode === 'balloon') {
      stepGas(dt); paintGas();
      if (show) { balloonTime += dt; if (!balloonDone && balloonTime > 4) { balloonDone = true; toast('위·아래·왼쪽·오른쪽 벽에 모두 충돌해요'); } }
    }
    flow?.update(checklist([
      ['(가) 물을 가득 채운 페트병 바로 세우기', press.a?.done, '‘(가) 세우기’를 누르고 1분 정도 기다려요'],
      // (가)(나)(다)는 교과서처럼 함께 세워 비교하므로 어느 병부터 세워도 돼요(단추를 잠그지 않아요).
      ['(나) 물을 가득 채운 페트병 뒤집어 세우기', press.b?.done, '‘(나) 세우기’를 누르고 기다려요'],
      ['(다) 물을 반만 채운 페트병 뒤집어 세우기', press.c?.done, '‘(다) 세우기’를 누르고 기다려요'],
      ['구슬 컵을 흔들어 알루미늄 포일 관찰하기', cupDone, '‘구슬 컵 모형’ 탭 → ‘컵 흔들기’를 여러 번 눌러요', '#tab-cup'],
      ['풍선 속 기체 입자의 충돌 방향 비교하기', balloonDone, '‘풍선 속 기체 입자’ 탭 → 위쪽의 ‘충돌·화살표 보기’를 켜고 충돌 횟수를 비교해요', '#tab-balloon', '#show-detail'],
    ]));
  }
  requestAnimationFrame(frame);
}

const pet = (x, inverted, half) => `<g transform="translate(${x} ${inverted ? 83.5 : 214}) scale(.75 ${inverted ? -.75 : .75})"><path d="${BODY}" fill="#dfeffa33" stroke="#cfe6f5" stroke-width="2.5"/><rect x="-34" y="${inverted ? -160 : -150}" width="68" height="${half ? 80 : 150}" fill="#4fa8ff" opacity=".55"/><rect x="-13" y="-174" width="26" height="14" rx="3" fill="#3f7ad6"/></g>`;
flow = setupPOEFlow({
  predict: {
    title: '물을 가득 채운 페트병을<br>바로 세울 때와 뒤집어 세울 때',
    lead: '바닥에 우드록을 붙인 페트병에 물을 가득 채워 점토 위에 세울 거예요.<br>(가)는 바로 세우고, (나)는 뒤집어 세워요. 물의 양은 같아요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="점토 위에 바로 세운 페트병 (가)와 뒤집어 세운 페트병 (나)"><rect width="520" height="250" rx="12" fill="#121a33"/>${pet(160, false, false)}${pet(360, true, false)}<rect x="100" y="214" width="120" height="18" rx="5" fill="#c99d74"/><rect x="300" y="214" width="120" height="18" rx="5" fill="#c99d74"/><text x="160" y="246" text-anchor="middle" font-size="15" fill="#ffd2a8">(가) 바로 세움</text><text x="360" y="246" text-anchor="middle" font-size="15" fill="#ffd2a8">(나) 뒤집어 세움</text></svg>`,
    question: '1분 정도 기다리면 점토가 더 깊이 눌리는 것은 어느 쪽일까요?',
    choices: ['(가) 바로 세운 페트병 아래의 점토가 더 깊이 눌릴 것 같아요.', '(나) 뒤집어 세운 페트병 아래의 점토가 더 깊이 눌릴 것 같아요.', '물의 양이 같으니 두 점토가 같은 깊이로 눌릴 것 같아요.'],
    placeholder: '굽이 뾰족한 구두나 눈 위를 걸을 때 신는 설피, 바늘로 풍선을 누를 때를 떠올려 보세요.',
  },
  observe: {
    title: '점토가 눌리는 깊이를 비교하고, 모형으로 기체의 압력을 알아보세요.',
    recordLabel: '점토가 눌린 깊이, 구슬 컵의 포일 모양, 풍선 속 기체 입자가 부딪힌 방향을 적어 보세요.',
    placeholder: '(가), (나), (다)에서 다르게 한 조건과 점토가 눌린 깊이를 비교하고, 구슬과 기체 입자가 벽에 부딪힐 때 무슨 일이 생겼는지 적어 보세요.',
    parts: [
      { title: '점토가 눌리는 깊이', label: '(가), (나), (다)에서 다르게 한 조건과 점토가 눌린 깊이를 비교해 적어 보세요.', placeholder: '(가)와 (나), (나)와 (다)를 각각 비교해 보세요. 무엇이 다르고 깊이는 어떻게 달랐나요?' },
      { title: '구슬 컵 모형', label: '컵을 흔들었을 때 구슬의 움직임과 알루미늄 포일의 모양 변화를 적어 보세요.', placeholder: '포일은 처음에 어떤 모양이었고, 컵을 흔든 뒤에는 어떻게 되었나요?' },
      { title: '풍선 속 기체 입자', label: '풍선 속 기체 입자가 움직이는 방향과 벽에 부딪힌 방향을 적어 보세요.', placeholder: '위·아래·왼쪽·오른쪽 벽에 부딪힌 횟수를 비교해 보세요.' },
    ],
  },
  explain: {
    question: '점토가 눌린 깊이가 달라진 까닭을 압력으로 설명하고, 기체가 주위에 힘을 가하는 까닭을 기체 입자의 운동으로 설명해 보세요.',
    concepts: [
      ['압력', '일정한 넓이에 작용하는 힘의 크기를 <b>압력</b>이라고 해요. 물체에 같은 크기의 힘을 가해도 힘이 작용하는 넓이에 따라 결과가 달라져요.'],
      ['넓이와 압력', '힘의 크기가 같을 때는 <b class="subj">힘이 작용하는 넓이가 좁을수록</b> 압력이 <b>커져요</b>. 그래서 같은 물의 양이라도 뒤집어 세운 (나)의 점토가 더 깊이 눌렸어요.'],
      ['힘의 크기와 압력', '힘이 작용하는 넓이가 같을 때는 <b class="subj">물체에 작용하는 힘이 클수록</b> 압력이 <b>커져요</b>. 물이 많은 (나)가 물이 반인 (다)보다 깊이 눌렸어요.'],
      ['기체의 압력', '기체 입자는 끊임없이 빠르게 움직이며 주위에 충돌해 힘을 가해요. 이때 일정한 넓이에 작용하는 힘의 크기를 <b>기체의 압력</b> 또는 기압이라고 해요.'],
      ['모든 방향', '기체 입자는 모든 방향으로 움직이며 용기 벽에 충돌하므로 <b class="subj">기체의 압력은</b> <b>모든 방향으로</b> 작용해요. 아래쪽으로만 작용하는 것이 아니에요.'],
    ],
    note: '구슬은 컵을 흔들어야 움직이지만, 실제 기체 입자는 스스로 끊임없이 모든 방향으로 움직여요. 모형은 눈에 보이지 않는 입자의 운동을 이해하도록 도와주지만, 실제와 다른 점도 있어요.',
  },
  onRestart: () => {
    show = false; $('#show-detail').checked = false;
    for (const id of Object.keys(press)) press[id] = null;
    foilBulge = -16; foilHits = 0; cupShake = 0; cupDone = false; balloonTime = 0; balloonDone = false;
    lab.resetQuiz(); setMode('clay');
  },
});
setMode('clay');
requestAnimationFrame(frame);
