// 레이싱 번호 뽑기(교사용 자료): 1~n번 차가 야간 서킷을 한 바퀴 달리고, 결승선을 통과한 차례가 뽑힌 순서예요.
// 순위와 기록은 출발하는 순간 src/race-model.js가 정해요(번호를 고르게 섞음). 화면은 그 기록에 맞춰 차를 움직일 뿐이에요.
// 보통은 가장 느린 차도 15초 안에 들어오고, 배속 모드는 같은 기록을 빨리 돌려 5초 안에 결과를 보여 줘요.
import './race-draw.css';
import { setupTheme } from './src/theme.js';
import { guardTeacherPage } from './src/teacher-gate.js';
import { planRace, progress, coast, formatRecord, clampRacers, COURSE_SECONDS } from './src/race-model.js';

setupTheme();
guardTeacherPage({ home: '../../' });

/* ---------- 설정 ---------- */
const W = 1600, H = 900;           // 서킷을 그리는 논리 좌표
const TW = 72;                      // 도로 폭
const FAST_SCALE = COURSE_SECONDS / 4; // 배속: 15초 경주를 4초에
const LIGHT_GAP = { normal: 0.62, fast: 0.08 };
const COLORS = ['#ff3b3b', '#ffb703', '#2ec4ff', '#7cff4f', '#ff5ad1', '#b388ff', '#ff8a3d', '#00e5c7', '#f4f4f4', '#4d7cff', '#ffe14f', '#ff4f7a'];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 서킷 모양(닫힌 곡선) ---------- */
const CONTROL = [
  [330, 792], [700, 792], [1090, 792], [1300, 772], [1415, 690], [1430, 560], [1350, 478], [1230, 492], [1120, 560],
  [1000, 556], [930, 470], [985, 368], [1130, 318], [1310, 286], [1430, 210], [1405, 118], [1260, 92], [1000, 104],
  [760, 128], [600, 150], [520, 228], [575, 318], [520, 402], [380, 410], [250, 388], [160, 452], [130, 590], [170, 720], [235, 778],
];

function catmull(pts, per = 28) {
  const out = [], n = pts.length;
  const lerp = (a, b, ta, tb, t) => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const step = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]));
    const t0 = 0, t1 = step(p0, p1), t2 = t1 + step(p1, p2), t3 = t2 + step(p2, p3);
    for (let k = 0; k < per; k++) {
      const t = t1 + ((t2 - t1) * k) / per;
      const a1 = lerp(p0, p1, t0, t1, t), a2 = lerp(p1, p2, t1, t2, t), a3 = lerp(p2, p3, t2, t3, t);
      const b1 = lerp(a1, a2, t0, t2, t), b2 = lerp(a2, a3, t1, t3, t);
      out.push(lerp(b1, b2, t1, t2, t));
    }
  }
  return out;
}

const track = (() => {
  const dense = catmull(CONTROL);
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[cum.length - 1], STEP = 2, N = Math.ceil(L / STEP);
  const x = new Float32Array(N), y = new Float32Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = i * STEP;
    while (cum[j + 1] < s) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length], f = (s - cum[j]) / (cum[j + 1] - cum[j]);
    x[i] = a[0] + (b[0] - a[0]) * f; y[i] = a[1] + (b[1] - a[1]) * f;
  }
  const ang = new Float32Array(N), curve = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = (i - 1 + N) % N, q = (i + 1) % N;
    ang[i] = Math.atan2(y[q] - y[p], x[q] - x[p]);
  }
  for (let i = 0; i < N; i++) {
    let d = ang[(i + 4) % N] - ang[(i - 4 + N) % N];
    d = Math.atan2(Math.sin(d), Math.cos(d));
    curve[i] = d / (8 * STEP);
  }
  // 출발·결승선: 아래쪽 긴 직선 위
  let s0 = 0, best = Infinity;
  for (let i = 0; i < N; i++) { const dd = Math.hypot(x[i] - 1060, y[i] - 792); if (dd < best) { best = dd; s0 = i * STEP; } }
  function at(d) {
    let s = (((s0 + d) % L) + L) % L;
    const f = s / STEP, i = Math.floor(f) % N, k = (i + 1) % N, t = f - Math.floor(f);
    let da = ang[k] - ang[i]; da = Math.atan2(Math.sin(da), Math.cos(da));
    return { x: x[i] + (x[k] - x[i]) * t, y: y[i] + (y[k] - y[i]) * t, a: ang[i] + da * t };
  }
  return { L, N, STEP, x, y, ang, curve, s0, at };
})();
const offset = (p, lat) => ({ x: p.x - Math.sin(p.a) * lat, y: p.y + Math.cos(p.a) * lat });

/* ---------- 요소 ---------- */
const $ = id => document.getElementById(id);
const stage = $('rd-stage'), canvas = $('rd-canvas'), ctx = canvas.getContext('2d');
const cam = $('rd-cam'), camCtx = cam.getContext('2d');
const countInput = $('rd-count'), range = $('rd-range'), startBtn = $('rd-start'), fastBtn = $('rd-fast'), soundBtn = $('rd-sound');
const clockEl = $('rd-clock'), finishedEl = $('rd-finished'), speedEl = $('rd-speed'), banner = $('rd-banner');
const lightsEl = $('rd-lights'), lightBulbs = [...lightsEl.querySelectorAll('i')];
const tower = $('rd-tower'), towerMore = $('rd-tower-more'), camLabel = $('rd-cam-label');
const result = $('rd-result'), confetti = $('rd-confetti'), confCtx = confetti.getContext('2d');

/* ---------- 상태 ---------- */
let count = 25, fast = false, sound = true;
let plan = null;           // 경주 계획(출발할 때 정해요)
let cars = [];             // 화면의 차(번호 순서)
let phase = 'idle';        // idle → countdown → race → done
let raceT = 0, countdownT = 0, lightsOn = 0, holdT = 0, finishedCount = 0, leaderNumber = 0, lastLeaderCall = 0;
let scale = 1, dpr = 1, bg = null, shakeT = 0;
const particles = [], rockets = [];
let camX = 0, camY = 0;

/* ---------- 출발 그리드 ---------- */
function layout(n) {
  const lanes = n <= 12 ? 2 : n <= 30 ? 3 : n <= 60 ? 4 : 5;
  const laneW = (TW * 0.86) / lanes;
  const carW = Math.min(17, laneW * 0.78), carL = carW * 2.15;
  const rowGap = carL * 1.45;
  return { lanes, laneW, carW, carL, rowGap };
}
function buildCars(n, racePlan) {
  const g = layout(n);
  const byNumber = racePlan ? racePlan.byNumber : Array.from({ length: n }, (_, i) => ({ number: i + 1, rank: 0, time: 0, wiggle: [0, 0, 0], sway: { a: 0, w: 0, p: 0, w2: 0, p2: 0 } }));
  return byNumber.map((r, j) => {
    const row = Math.floor(j / g.lanes), lane = j % g.lanes;
    const gridD = -(g.carL * 0.9 + row * g.rowGap + (lane % 2) * g.rowGap * 0.5);
    const gridLat = (lane - (g.lanes - 1) / 2) * g.laneW;
    const dist = track.L - gridD;
    // 결승선에서의 빠르기(멈출 때 씀)
    const vEnd = r.time ? (dist * (1 - progress(0.995, r.wiggle))) / (0.005 * r.time) : 0;
    return { ...r, gridD, gridLat, dist, vEnd, color: COLORS[(r.number - 1) % COLORS.length], d: gridD, lat: gridLat, x: 0, y: 0, a: 0, speed: 0, trail: [], finished: false, sprite: null };
  });
}

/* ---------- 차 그림(번호마다 색) ---------- */
function carSprite(color, g) {
  const s = scale * dpr, L = g.carL * s, Wd = g.carW * s, pad = 4 * s;
  const c = document.createElement('canvas');
  c.width = Math.ceil(L + pad * 2); c.height = Math.ceil(Wd + pad * 2);
  const k = c.getContext('2d');
  k.translate(pad, pad);
  const wheel = (x, y) => { k.fillStyle = '#0b0b0d'; k.fillRect(x, y, L * 0.17, Wd * 0.26); };
  wheel(L * 0.08, -Wd * 0.04); wheel(L * 0.08, Wd * 0.78); wheel(L * 0.68, -Wd * 0.02); wheel(L * 0.68, Wd * 0.76);
  // 몸체
  const body = k.createLinearGradient(0, 0, 0, Wd);
  body.addColorStop(0, shade(color, 0.35)); body.addColorStop(0.5, color); body.addColorStop(1, shade(color, -0.45));
  k.fillStyle = body;
  k.beginPath();
  k.moveTo(L * 0.02, Wd * 0.22); k.lineTo(L * 0.58, Wd * 0.14); k.quadraticCurveTo(L * 0.98, Wd * 0.38, L, Wd * 0.5);
  k.quadraticCurveTo(L * 0.98, Wd * 0.62, L * 0.58, Wd * 0.86); k.lineTo(L * 0.02, Wd * 0.78); k.closePath(); k.fill();
  // 앞·뒤 날개
  k.fillStyle = shade(color, -0.55);
  k.fillRect(L * 0.9, Wd * 0.04, L * 0.08, Wd * 0.92);
  k.fillRect(0, Wd * 0.02, L * 0.09, Wd * 0.96);
  // 줄무늬와 운전석
  k.fillStyle = 'rgba(255,255,255,.55)'; k.fillRect(L * 0.12, Wd * 0.46, L * 0.8, Wd * 0.08);
  k.fillStyle = '#101219'; k.beginPath(); k.ellipse(L * 0.5, Wd * 0.5, L * 0.12, Wd * 0.2, 0, 0, Math.PI * 2); k.fill();
  k.fillStyle = 'rgba(255,255,255,.35)'; k.beginPath(); k.ellipse(L * 0.53, Wd * 0.44, L * 0.05, Wd * 0.07, 0, 0, Math.PI * 2); k.fill();
  return c;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
  return `rgb(${ch.map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))).join(',')})`;
}
const glowSprite = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const k = c.getContext('2d'), gr = k.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  k.fillStyle = gr; k.fillRect(0, 0, 64, 64);
  return c;
})();
const beamSprite = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const k = c.getContext('2d'), gr = k.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, 'rgba(255,248,220,.55)'); gr.addColorStop(1, 'rgba(255,248,220,0)');
  k.fillStyle = gr; k.beginPath(); k.moveTo(0, 26); k.lineTo(128, 0); k.lineTo(128, 64); k.lineTo(0, 38); k.closePath(); k.fill();
  return c;
})();

/* ---------- 바탕(밤의 서킷): 크기가 바뀌거나 인원이 바뀔 때만 다시 그려요 ---------- */
function seededRand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function nearTrack(px, py, r) {
  for (let i = 0; i < track.N; i += 4) if (Math.hypot(track.x[i] - px, track.y[i] - py) < r) return true;
  return false;
}
const STANDS = [{ x: 330, y: 838, w: 900, h: 52 }];
const PITS = { x: 420, y: 716, w: 560, h: 30 };
const TOWERS = [[260, 300], [720, 250], [1240, 400], [1490, 330], [1520, 820], [80, 820], [860, 650], [1180, 30]];
const trees = (() => {
  const r = seededRand(7), out = [];
  for (let tries = 0; out.length < 120 && tries < 4000; tries++) {
    const x = r() * W, y = r() * H;
    if (nearTrack(x, y, TW * 1.25)) continue;
    if (STANDS.some(s => x > s.x - 20 && x < s.x + s.w + 20 && y > s.y - 20)) continue;
    if (x > PITS.x - 30 && x < PITS.x + PITS.w + 30 && y > PITS.y - 30 && y < PITS.y + PITS.h + 30) continue;
    out.push({ x, y, r: 9 + r() * 14, t: r() });
  }
  return out;
})();
const crowd = (() => {
  const r = seededRand(11), out = [];
  for (const s of STANDS) for (let row = 0; row < 5; row++) for (let x = s.x + 6; x < s.x + s.w - 4; x += 7) out.push({ x: x + r() * 3, y: s.y + 8 + row * 9, c: COLORS[Math.floor(r() * COLORS.length)] });
  return out;
})();

function strokeTrack(k, width, style, alpha = 1) {
  k.save(); k.globalAlpha = alpha; k.strokeStyle = style; k.lineWidth = width; k.lineJoin = 'round'; k.lineCap = 'round';
  k.beginPath(); k.moveTo(track.x[0], track.y[0]);
  for (let i = 1; i < track.N; i++) k.lineTo(track.x[i], track.y[i]);
  k.closePath(); k.stroke(); k.restore();
}

function renderBackground() {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const k = c.getContext('2d'), s = scale * dpr;
  k.setTransform(s, 0, 0, s, 0, 0);
  // 잔디(깎은 줄무늬)
  k.fillStyle = '#0b1c12'; k.fillRect(0, 0, W, H);
  k.save(); k.translate(W / 2, H / 2); k.rotate(-0.5);
  for (let i = -30; i < 30; i += 2) { k.fillStyle = '#0e2417'; k.fillRect(i * 46, -1200, 46, 2400); }
  k.restore();
  // 나무
  for (const t of trees) {
    k.fillStyle = 'rgba(0,0,0,.35)'; k.beginPath(); k.arc(t.x + 4, t.y + 5, t.r, 0, Math.PI * 2); k.fill();
    const gr = k.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, 1, t.x, t.y, t.r);
    gr.addColorStop(0, t.t > 0.5 ? '#2f6b3a' : '#2a5d43'); gr.addColorStop(1, '#0d2a17');
    k.fillStyle = gr; k.beginPath(); k.arc(t.x, t.y, t.r, 0, Math.PI * 2); k.fill();
  }
  // 모래밭(코너 바깥 쪽 여유 공간)과 갓길
  k.save(); k.lineCap = 'round';
  for (let i = 0; i < track.N; i += 3) {
    const cv = Math.abs(track.curve[i]);
    if (cv < 0.007) continue;
    const side = Math.sign(track.curve[i]) * -1, a = track.ang[i];
    const ox = track.x[i] - Math.sin(a) * side * (TW * 0.78), oy = track.y[i] + Math.cos(a) * side * (TW * 0.78);
    k.fillStyle = 'rgba(128,104,70,.32)'; k.beginPath(); k.arc(ox, oy, TW * 0.42, 0, Math.PI * 2); k.fill();
  }
  k.restore();
  strokeTrack(k, TW + 30, '#1c2a22');
  strokeTrack(k, TW + 8, '#e9edf5');
  strokeTrack(k, TW, '#2a2d35');
  // 아스팔트 결
  const noise = document.createElement('canvas'); noise.width = noise.height = 96;
  const nk = noise.getContext('2d'), nr = seededRand(3);
  for (let i = 0; i < 900; i++) { const v = 40 + nr() * 60; nk.fillStyle = `rgba(${v},${v},${v + 8},.6)`; nk.fillRect(nr() * 96, nr() * 96, 1.2, 1.2); }
  strokeTrack(k, TW - 2, k.createPattern(noise, 'repeat'), 0.55);
  strokeTrack(k, TW * 0.34, '#000', 0.22); // 고무 자국(주행선)
  // 연석: 코너 안쪽·바깥쪽 빨강·하양
  for (let i = 0; i < track.N; i++) {
    if (Math.abs(track.curve[i]) < 0.0035) continue;
    const a = track.ang[i], red = Math.floor((i * track.STEP) / 10) % 2 === 0;
    for (const side of [-1, 1]) {
      const lat = side * (TW / 2 + 2);
      const x = track.x[i] - Math.sin(a) * lat, y = track.y[i] + Math.cos(a) * lat;
      k.fillStyle = red ? '#e5383b' : '#f5f5f5';
      k.save(); k.translate(x, y); k.rotate(a); k.fillRect(-1.2, -3.5, 2.4, 7); k.restore();
    }
  }
  // 출발 그리드 칸
  const g = layout(count);
  k.strokeStyle = 'rgba(255,255,255,.75)'; k.lineWidth = 1.6;
  for (const car of cars) {
    const p = offset(track.at(car.gridD + g.carL * 0.55), car.gridLat);
    k.save(); k.translate(p.x, p.y); k.rotate(p.a);
    k.beginPath(); k.moveTo(-g.carL * 0.25, -g.laneW * 0.42); k.lineTo(0, -g.laneW * 0.42); k.lineTo(0, g.laneW * 0.42); k.lineTo(-g.carL * 0.25, g.laneW * 0.42); k.stroke();
    k.restore();
  }
  // 출발·결승선(체커 무늬)
  const sp = track.at(0);
  k.save(); k.translate(sp.x, sp.y); k.rotate(sp.a);
  const cell = TW / 8;
  for (let r = 0; r < 2; r++) for (let q = 0; q < 8; q++) { k.fillStyle = (r + q) % 2 ? '#111' : '#fafafa'; k.fillRect(-cell + r * cell, -TW / 2 + q * cell, cell, cell); }
  k.restore();
  // 관중석
  for (const st of STANDS) {
    k.fillStyle = '#1a1d2b'; k.fillRect(st.x, st.y, st.w, st.h);
    k.fillStyle = '#272b40'; for (let r = 0; r < 5; r++) k.fillRect(st.x, st.y + 4 + r * 9, st.w, 2);
    k.fillStyle = '#3d4363'; k.fillRect(st.x, st.y - 4, st.w, 4);
  }
  for (const p of crowd) { k.fillStyle = p.c; k.globalAlpha = 0.65; k.fillRect(p.x, p.y, 3, 3); }
  k.globalAlpha = 1;
  // 정비 구역(피트) 건물과 차고 불빛
  k.fillStyle = '#20253a'; k.fillRect(PITS.x, PITS.y, PITS.w, PITS.h);
  for (let x = PITS.x + 8; x < PITS.x + PITS.w - 20; x += 34) { k.fillStyle = '#ffd98a'; k.globalAlpha = 0.75; k.fillRect(x, PITS.y + PITS.h - 7, 24, 5); }
  k.globalAlpha = 1; k.fillStyle = '#3a4160'; k.fillRect(PITS.x, PITS.y, PITS.w, 4);
  // 조명탑의 빛 웅덩이
  k.globalCompositeOperation = 'lighter';
  for (const [x, y] of TOWERS) {
    const gr = k.createRadialGradient(x, y, 0, x, y, 300);
    gr.addColorStop(0, 'rgba(190,215,255,.16)'); gr.addColorStop(1, 'rgba(190,215,255,0)');
    k.fillStyle = gr; k.fillRect(x - 300, y - 300, 600, 600);
  }
  k.globalCompositeOperation = 'source-over';
  for (const [x, y] of TOWERS) {
    k.fillStyle = '#4b5272'; k.fillRect(x - 3, y - 3, 6, 6);
    k.drawImage(glowSprite, x - 14, y - 14, 28, 28);
  }
  bg = c;
}

/* ---------- 크기 ---------- */
function resize() {
  const w = stage.clientWidth, h = (w * H) / W;
  dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.height = `${h}px`;
  scale = w / W;
  const cw = cam.clientWidth || 260, ch = cam.clientHeight || 146;
  cam.width = Math.round(cw * dpr); cam.height = Math.round(ch * dpr);
  refreshSprites();
  renderBackground();
}
function refreshSprites() {
  const g = layout(count);
  const cache = new Map();
  for (const car of cars) {
    if (!cache.has(car.color)) cache.set(car.color, carSprite(car.color, g));
    car.sprite = cache.get(car.color);
  }
}

/* ---------- 소리(Web Audio로 직접 만들어요) ---------- */
let audio = null, engine = null;
function ensureAudio() {
  if (!sound) return null;
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { audio = null; }
  return audio;
}
function beep(freq, dur, { type = 'square', vol = 0.08, slide = 0 } = {}) {
  const a = ensureAudio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noiseBurst(dur, vol = 0.12, freq = 900) {
  const a = ensureAudio(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.7; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
}
function startEngine() {
  const a = ensureAudio(); if (!a || engine) return;
  const o1 = a.createOscillator(), o2 = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
  o1.type = 'sawtooth'; o2.type = 'sawtooth'; o2.detune.value = 14; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0;
  o1.connect(f); o2.connect(f); f.connect(g).connect(a.destination); o1.start(); o2.start();
  g.gain.linearRampToValueAtTime(0.045, a.currentTime + 0.3);
  engine = { o1, o2, g, f };
}
function setEngine(level) {
  if (!engine || !audio) return;
  const t = audio.currentTime, hz = 70 + level * 150;
  engine.o1.frequency.setTargetAtTime(hz, t, 0.08); engine.o2.frequency.setTargetAtTime(hz * 1.5, t, 0.08);
  engine.f.frequency.setTargetAtTime(500 + level * 1400, t, 0.1);
}
function stopEngine() {
  if (!engine || !audio) { engine = null; return; }
  const { o1, o2, g } = engine, t = audio.currentTime;
  g.gain.setTargetAtTime(0, t, 0.25); o1.stop(t + 1.2); o2.stop(t + 1.2);
  engine = null;
}

/* ---------- 효과(입자) ---------- */
function puff(x, y, n, opts) {
  if (reduceMotion) n = Math.ceil(n / 4);
  for (let i = 0; i < n; i++) {
    const a = opts.dir ?? Math.random() * Math.PI * 2, spread = opts.spread ?? Math.PI;
    const ang = a + (Math.random() - 0.5) * spread, sp = opts.speed * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: opts.life * (0.6 + Math.random() * 0.6), size: opts.size * (0.6 + Math.random() * 0.8), grow: opts.grow ?? 0, color: opts.color, kind: opts.kind, drag: opts.drag ?? 0.9, g: opts.g ?? 0 });
  }
}
function launchFirework() {
  const x = 300 + Math.random() * 1000, y = 160 + Math.random() * 260;
  rockets.push({ x, y: H, tx: x, ty: y, t: 0, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
}

/* ---------- 경주 진행 ---------- */
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function place(car, t) {
  if (phase === 'idle' || phase === 'countdown' || t <= 0) car.d = car.gridD;
  else if (t < car.time) car.d = car.gridD + car.dist * progress(t / car.time, car.wiggle);
  else car.d = track.L + coast(t - car.time, car.vEnd);
  const g = layout(count), half = TW / 2 - g.carW * 0.7;
  const sw = car.sway, sway = Math.max(-1, Math.min(1, sw.a * Math.sin(sw.w * t + sw.p) + 0.3 * Math.sin(sw.w2 * t + sw.p2)));
  const m = phase === 'race' || phase === 'done' ? smooth(0.6, 3, t) : 0;
  car.lat = car.gridLat * (1 - m) + sway * half * m;
  const p = offset(track.at(car.d), car.lat), q = offset(track.at(car.d + 4), car.lat);
  const nx = p.x, ny = p.y;
  if (car.x || car.y) car.speed = Math.hypot(nx - car.x, ny - car.y);
  car.x = nx; car.y = ny; car.a = Math.atan2(q.y - p.y, q.x - p.x);
}
function standings() {
  return [...cars].sort((a, b) => (a.finished && b.finished ? a.rank - b.rank : a.finished ? -1 : b.finished ? 1 : b.d - a.d));
}

/* ---------- 실시간 순위(타이밍 타워) ---------- */
let towerTick = 0, lastOrder = new Map();
function renderTower(force = false) {
  const now = performance.now();
  if (!force && now - towerTick < 120) return;
  towerTick = now;
  const order = standings(), show = Math.min(order.length, 12), lead = order[0];
  const avg = track.L / 12;
  tower.innerHTML = order.slice(0, show).map((car, i) => {
    const prev = lastOrder.get(car.number), up = phase === 'race' && prev !== undefined && prev > i;
    const info = car.finished ? formatRecord(car.time) : phase === 'race' || phase === 'done' ? (i === 0 ? '선두' : `+${((lead.d - car.d) / avg).toFixed(2)}`) : '그리드';
    return `<li class="${car.finished ? 'fin' : ''}${up ? ' up' : ''}"><span class="pos">${i + 1}</span><span class="chip" style="--c:${car.color}"></span><span class="num">${car.number}번</span><span class="gap">${info}</span></li>`;
  }).join('');
  lastOrder = new Map(order.map((c, i) => [c.number, i]));
  towerMore.textContent = order.length > show ? `그 밖에 ${order.length - show}대가 달리고 있어요` : '';
}

/* ---------- 그리기 ---------- */
function drawCars(k, t) {
  const g = layout(count), s = scale * dpr;
  const leader = phase === 'race' || phase === 'done' ? standings()[0] : null;
  // 그림자
  k.fillStyle = 'rgba(0,0,0,.45)';
  for (const car of cars) { k.save(); k.translate(car.x + 2.5, car.y + 3.5); k.rotate(car.a); k.fillRect(-g.carL / 2, -g.carW / 2, g.carL, g.carW); k.restore(); }
  k.globalCompositeOperation = 'lighter';
  // 빛 꼬리
  for (const car of cars) {
    const tr = car.trail;
    if (tr.length < 2) continue;
    k.strokeStyle = car.color; k.lineCap = 'round';
    for (let i = 1; i < tr.length; i++) {
      k.globalAlpha = (i / tr.length) * 0.32 * (car.finished ? 0.4 : 1);
      k.lineWidth = g.carW * 0.55 * (i / tr.length);
      k.beginPath(); k.moveTo(tr[i - 1].x, tr[i - 1].y); k.lineTo(tr[i].x, tr[i].y); k.stroke();
    }
  }
  // 전조등 빛
  k.globalAlpha = count > 50 ? 0.35 : 0.6;
  for (const car of cars) {
    k.save(); k.translate(car.x, car.y); k.rotate(car.a);
    k.drawImage(beamSprite, g.carL * 0.45, -g.carW * 1.3, g.carL * 2.4, g.carW * 2.6);
    k.restore();
  }
  // 브레이크 등
  k.globalAlpha = 0.9;
  for (const car of cars) {
    k.save(); k.translate(car.x, car.y); k.rotate(car.a);
    const r = g.carW * 0.7;
    k.drawImage(glowSprite, -g.carL / 2 - r, -g.carW * 0.3 - r / 2, r * 1.4, r);
    k.drawImage(glowSprite, -g.carL / 2 - r, g.carW * 0.3 - r / 2, r * 1.4, r);
    k.restore();
  }
  k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1;
  // 선두 차 빛 고리
  if (leader) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    k.save(); k.globalCompositeOperation = 'lighter';
    k.globalAlpha = 0.5 + pulse * 0.4;
    k.drawImage(glowSprite, leader.x - g.carL * 1.3, leader.y - g.carL * 1.3, g.carL * 2.6, g.carL * 2.6);
    k.restore();
    k.strokeStyle = `rgba(255,214,90,${0.6 + pulse * 0.4})`; k.lineWidth = 2;
    k.beginPath(); k.arc(leader.x, leader.y, g.carL * (0.75 + pulse * 0.12), 0, Math.PI * 2); k.stroke();
  }
  // 차 몸체(아래쪽 차부터)
  const draw = [...cars].sort((a, b) => (a.finished === b.finished ? a.d - b.d : a.finished ? -1 : 1));
  for (const car of draw) {
    k.save(); k.translate(car.x, car.y); k.rotate(car.a);
    k.globalAlpha = car.finished && phase !== 'done' ? 0.55 : car.finished ? 0.8 : 1;
    const sw = car.sprite.width / s, sh = car.sprite.height / s;
    k.drawImage(car.sprite, -sw / 2, -sh / 2, sw, sh);
    k.restore();
  }
  k.globalAlpha = 1;
  // 번호(늘 똑바로)
  const fs = Math.max(7, g.carW * 0.82);
  k.font = `800 ${fs}px 'Noto Sans KR', Arial, sans-serif`; k.textAlign = 'center'; k.textBaseline = 'middle';
  for (const car of draw) {
    k.globalAlpha = car.finished && phase !== 'done' ? 0.6 : 1;
    k.fillStyle = 'rgba(255,255,255,.95)';
    k.beginPath(); k.arc(car.x, car.y, fs * 0.62, 0, Math.PI * 2); k.fill();
    k.fillStyle = '#10131c'; k.fillText(String(car.number), car.x, car.y + fs * 0.04);
  }
  k.globalAlpha = 1;
  if (leader) {
    const lx = leader.x, ly = leader.y - g.carL * 1.05;
    k.font = `800 ${Math.max(11, fs * 1.05)}px 'Noto Sans KR', Arial, sans-serif`;
    const label = `1위 · ${leader.number}번`, tw = k.measureText(label).width + 14, th = Math.max(16, fs * 1.6);
    k.fillStyle = '#ffd65a'; roundRect(k, lx - tw / 2, ly - th / 2, tw, th, th / 2); k.fill();
    k.fillStyle = '#1b1300'; k.fillText(label, lx, ly + 1);
  }
}
function roundRect(k, x, y, w, h, r) { k.beginPath(); k.moveTo(x + r, y); k.arcTo(x + w, y, x + w, y + h, r); k.arcTo(x + w, y + h, x, y + h, r); k.arcTo(x, y + h, x, y, r); k.arcTo(x, y, x + w, y, r); k.closePath(); }

function drawGantry(k) {
  const p = track.at(-6);
  k.save(); k.translate(p.x, p.y); k.rotate(p.a);
  k.fillStyle = 'rgba(0,0,0,.4)'; k.fillRect(-4, -TW / 2 - 18, 16, TW + 36);
  k.fillStyle = '#2d3247'; k.fillRect(-8, -TW / 2 - 22, 14, TW + 44);
  k.fillStyle = '#454c6b'; k.fillRect(-8, -TW / 2 - 22, 14, 3);
  for (let i = 0; i < 5; i++) {
    const on = phase === 'countdown' && i < lightsOn;
    const y = -TW * 0.36 + (i * TW * 0.72) / 4;
    k.fillStyle = on ? '#ff2b2b' : '#1a1c26'; k.beginPath(); k.arc(-1, y, 4, 0, Math.PI * 2); k.fill();
    if (on) { k.globalCompositeOperation = 'lighter'; k.globalAlpha = 0.9; k.drawImage(glowSprite, -15, y - 14, 28, 28); k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1; }
  }
  k.restore();
  // 체커기(첫 차가 들어오면 흔들어요)
  if (finishedCount > 0) {
    const sp = track.at(0), fx = sp.x + 20, fy = sp.y + TW / 2 + 26, wave = performance.now() / 120;
    k.strokeStyle = '#cfd3e0'; k.lineWidth = 2; k.beginPath(); k.moveTo(fx, fy + 22); k.lineTo(fx, fy - 26); k.stroke();
    const cols = 6, rows = 4, cw = 6, chh = 6;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const off = Math.sin(wave + c * 0.9) * 3 * (c / cols);
      k.fillStyle = (c + r) % 2 ? '#111' : '#fff';
      k.fillRect(fx + c * cw, fy - 26 + r * chh + off, cw + 0.5, chh + 0.5);
    }
  }
}

function drawParticles(k, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life >= p.max) { particles.splice(i, 1); continue; }
    p.vx *= Math.pow(p.drag, dt * 60); p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.size += p.grow * dt;
    const f = 1 - p.life / p.max;
    if (p.kind === 'smoke') { k.globalCompositeOperation = 'source-over'; k.globalAlpha = f * 0.35; k.fillStyle = '#c9ccd6'; k.beginPath(); k.arc(p.x, p.y, p.size, 0, Math.PI * 2); k.fill(); }
    else { k.globalCompositeOperation = 'lighter'; k.globalAlpha = f; k.fillStyle = p.color; k.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  }
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i]; r.t += dt * 1.6;
    const y = H + (r.ty - H) * Math.min(1, r.t);
    k.globalCompositeOperation = 'lighter'; k.globalAlpha = 1; k.fillStyle = '#fff3c4'; k.fillRect(r.tx - 1.5, y - 1.5, 3, 3);
    if (r.t >= 1) {
      rockets.splice(i, 1);
      puff(r.tx, r.ty, 70, { speed: 260, life: 1.4, size: 3, color: r.color, kind: 'spark', drag: 0.95, g: 120, spread: Math.PI * 2 });
      puff(r.tx, r.ty, 20, { speed: 120, life: 1.0, size: 2.5, color: '#ffffff', kind: 'spark', drag: 0.94, g: 90, spread: Math.PI * 2 });
      if (sound) noiseBurst(0.5, 0.06, 300);
    }
  }
  k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1;
}

function drawCrowdFlashes(k) {
  if (phase !== 'race' && phase !== 'done') return;
  k.globalCompositeOperation = 'lighter';
  const n = reduceMotion ? 1 : 5;
  for (let i = 0; i < n; i++) {
    if (Math.random() > 0.6) continue;
    const p = crowd[Math.floor(Math.random() * crowd.length)];
    k.globalAlpha = 0.9; k.drawImage(glowSprite, p.x - 7, p.y - 7, 14, 14);
  }
  k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1;
}

function drawCam() {
  const order = phase === 'race' || phase === 'done' ? standings() : cars;
  let focus = order[0];
  if (phase === 'done' || (focus && focus.finished && phase === 'race')) {
    // 결승선 쪽을 보여 줘요(아직 달리는 차 중 맨 앞)
    focus = order.find(c => !c.finished) || order[0];
  }
  if (!focus) return;
  camLabel.textContent = phase === 'race' || phase === 'done' ? (focus.finished ? `${focus.number}번 결승` : order[0] === focus ? `선두 카메라 · ${focus.number}번` : `추격 카메라 · ${focus.number}번`) : '폴 포지션 · 1번';
  const tx = focus.x, ty = focus.y;
  camX = camX ? camX + (tx - camX) * 0.18 : tx; camY = camY ? camY + (ty - camY) * 0.18 : ty;
  const g = layout(count), viewW = Math.max(150, g.carL * 9), viewH = (viewW * cam.height) / cam.width;
  const s = scale * dpr;
  camCtx.imageSmoothingQuality = 'high';
  camCtx.fillStyle = '#05070d'; camCtx.fillRect(0, 0, cam.width, cam.height);
  camCtx.drawImage(canvas, (camX - viewW / 2) * s, (camY - viewH / 2) * s, viewW * s, viewH * s, 0, 0, cam.width, cam.height);
}

/* ---------- 주 반복 ---------- */
let last = performance.now();
function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  const rate = fast ? FAST_SCALE : 1;
  if (phase === 'countdown') stepCountdown(real);
  else if (phase === 'race' || phase === 'done') stepRace(real * rate);
  for (const car of cars) {
    place(car, raceT);
    if (phase === 'race' || phase === 'done') {
      car.trail.push({ x: car.x, y: car.y });
      if (car.trail.length > (fast ? 6 : 10)) car.trail.shift();
      if (!reduceMotion && !car.finished && Math.random() < 0.004 * (fast ? 2 : 1) && Math.abs(track.curve[Math.floor(((((track.s0 + car.d) % track.L) + track.L) % track.L) / track.STEP) % track.N]) > 0.005) {
        puff(car.x, car.y, 6, { dir: car.a + Math.PI, spread: 0.8, speed: 90, life: 0.4, size: 2, color: '#ffb347', kind: 'spark', drag: 0.9 });
      }
    }
  }
  const k = ctx, s = scale * dpr;
  k.setTransform(1, 0, 0, 1, 0, 0);
  k.clearRect(0, 0, canvas.width, canvas.height);
  if (shakeT > 0 && !reduceMotion) { shakeT -= real; const m = 5 * shakeT * dpr; k.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }
  if (bg) k.drawImage(bg, 0, 0);
  k.setTransform(s, 0, 0, s, k.getTransform().e, k.getTransform().f);
  drawCrowdFlashes(k);
  drawCars(k, raceT);
  drawParticles(k, real);
  drawGantry(k);
  // 가장자리 어둡게
  k.setTransform(1, 0, 0, 1, 0, 0);
  const v = k.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.45, canvas.width / 2, canvas.height / 2, canvas.width * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  k.fillStyle = v; k.fillRect(0, 0, canvas.width, canvas.height);
  drawCam();
  renderTower();
  requestAnimationFrame(frame);
}

function stepCountdown(dt) {
  const gap = fast ? LIGHT_GAP.fast : LIGHT_GAP.normal;
  countdownT += dt;
  const want = Math.min(5, Math.floor(countdownT / gap));
  while (lightsOn < want) { lightsOn++; lightBulbs[lightsOn - 1]?.classList.add('on'); beep(440, 0.16, { vol: 0.07 }); }
  if (lightsOn === 5 && countdownT >= 5 * gap + holdT * (fast ? 0.15 : 1)) go();
}

function go() {
  phase = 'race'; raceT = 0; shakeT = 0.45;
  lightBulbs.forEach(b => b.classList.remove('on'));
  lightsEl.classList.add('out');
  setTimeout(() => { lightsEl.hidden = true; lightsEl.classList.remove('out'); }, fast ? 200 : 600);
  beep(880, 0.45, { vol: 0.09 });
  noiseBurst(0.9, 0.1, 600);
  startEngine();
  showBanner('출발!', 'go');
  for (const car of cars) puff(car.x - Math.cos(car.a) * 10, car.y - Math.sin(car.a) * 10, count > 50 ? 3 : 6, { dir: car.a + Math.PI, spread: 1.4, speed: 40, life: 1.4, size: 4, grow: 14, kind: 'smoke', drag: 0.94 });
}

function stepRace(dt) {
  raceT += dt;
  const order = standings();
  for (const car of cars) {
    if (!car.finished && raceT >= car.time) {
      car.finished = true; finishedCount++;
      puff(car.x, car.y, count > 50 ? 10 : 22, { speed: 160, life: 0.7, size: 2.5, color: car.rank === 1 ? '#ffd65a' : '#ffffff', kind: 'spark', spread: Math.PI * 2, drag: 0.92 });
      if (car.rank === 1) {
        showBanner(`1등 결승! ${car.number}번`, 'win');
        beep(660, 0.18, { type: 'triangle', vol: 0.09 }); setTimeout(() => beep(990, 0.4, { type: 'triangle', vol: 0.09 }), 140);
        noiseBurst(1.6, 0.08, 1400);
        for (let i = 0; i < (reduceMotion ? 1 : 4); i++) setTimeout(launchFirework, i * (fast ? 90 : 350));
      } else if (car.rank <= 3) {
        beep(car.rank === 2 ? 740 : 620, 0.2, { type: 'triangle', vol: 0.07 });
      } else if (count <= 40 || car.rank % 3 === 0) beep(1200, 0.04, { type: 'sine', vol: 0.03 });
    }
  }
  // 선두 바뀜 알림
  const lead = order[0];
  if (phase === 'race' && lead && !lead.finished && lead.number !== leaderNumber) {
    if (leaderNumber && raceT > 2 && raceT - lastLeaderCall > 1.6) { showBanner(`선두 교체! ${lead.number}번`, 'lead'); lastLeaderCall = raceT; }
    leaderNumber = lead.number;
  }
  setEngine(Math.min(1, raceT / 2.5) * (finishedCount === count ? 0.2 : 1));
  clockEl.textContent = formatRecord(Math.min(raceT, plan.racers[plan.count - 1].time));
  finishedEl.textContent = `${finishedCount} / ${count}`;
  if (phase === 'race' && finishedCount === count) finish();
}

let bannerTimer = 0;
function showBanner(text, kind) {
  banner.textContent = text;
  banner.className = `rd-banner show ${kind}`;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { banner.className = 'rd-banner'; }, fast ? 700 : 1500);
}

/* ---------- 시작·끝 ---------- */
function setCount(n) {
  count = clampRacers(n);
  countInput.value = count; range.value = count;
  if (phase === 'idle') { resetCars(); }
}
function resetCars() {
  plan = null; cars = buildCars(count, null); raceT = 0; finishedCount = 0;
  clockEl.textContent = formatRecord(0); finishedEl.textContent = `0 / ${count}`;
  refreshSprites(); renderBackground(); lastOrder = new Map(); renderTower(true);
}
function lockSetup(on) {
  document.querySelectorAll('#rd-setup input, #rd-setup .rd-step, .rd-presets button, #rd-start').forEach(el => { el.disabled = on; });
}
function start() {
  if (phase === 'countdown' || phase === 'race') return;
  if (result.open) result.close();
  ensureAudio();
  phase = 'countdown';
  plan = planRace(count);
  cars = buildCars(count, plan);
  refreshSprites(); renderBackground();
  raceT = 0; finishedCount = 0; leaderNumber = 0; lastLeaderCall = 0; countdownT = 0; lightsOn = 0;
  holdT = 0.3 + Math.random() * 0.8;
  particles.length = 0; rockets.length = 0;
  lastOrder = new Map();
  lightsEl.hidden = false; lightBulbs.forEach(b => b.classList.remove('on'));
  lockSetup(true);
  stage.classList.add('racing');
  stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
}
function finish() {
  phase = 'done';
  stopEngine();
  lockSetup(false);
  stage.classList.remove('racing');
  renderTower(true);
  setTimeout(showResults, fast ? 150 : 900);
}

function showResults() {
  const list = plan.racers;
  const podium = list.slice(0, Math.min(3, list.length));
  const place = ['first', 'second', 'third'];
  const order = podium.length === 3 ? [1, 0, 2] : [0, 1];
  $('rd-podium').innerHTML = order.map(i => {
    const r = podium[i];
    return `<div class="rd-step-block ${place[i]}" style="--c:${COLORS[(r.number - 1) % COLORS.length]}"><span class="medal">${r.rank}</span><strong>${r.number}번</strong><span class="rec">${formatRecord(r.time)}</span><div class="block">${r.rank}등</div></div>`;
  }).join('');
  $('rd-board').innerHTML = list.map((r, i) => `<li style="--i:${Math.min(i, 60)};--c:${COLORS[(r.number - 1) % COLORS.length]}"><span class="rk">${r.rank}등</span><span class="no">${r.number}번</span><span class="tm">${formatRecord(r.time)}</span></li>`).join('');
  $('rd-board').classList.toggle('many', list.length > 30);
  if (result.showModal) result.showModal(); else result.setAttribute('open', '');
  result.querySelector('.rd-result-inner').scrollTop = 0;
  runConfetti();
  if (sound) { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.25, { type: 'triangle', vol: 0.07 }), i * 110)); }
}

let confettiRun = 0;
function runConfetti() {
  if (reduceMotion) return;
  const id = ++confettiRun;
  const w = (confetti.width = innerWidth * dpr), h = (confetti.height = innerHeight * dpr);
  const bits = Array.from({ length: 180 }, () => ({ x: Math.random() * w, y: -Math.random() * h * 0.6, vx: (Math.random() - 0.5) * 2 * dpr, vy: (2 + Math.random() * 3) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, s: (5 + Math.random() * 6) * dpr, c: COLORS[Math.floor(Math.random() * COLORS.length)] }));
  const t0 = performance.now();
  (function tick(now) {
    if (id !== confettiRun || !result.open) { confCtx.clearRect(0, 0, w, h); return; }
    confCtx.clearRect(0, 0, w, h);
    const fade = Math.max(0, 1 - (now - t0 - 3500) / 1500);
    for (const b of bits) {
      b.x += b.vx + Math.sin(now / 300 + b.r) * 0.6 * dpr; b.y += b.vy; b.r += b.vr;
      confCtx.save(); confCtx.globalAlpha = fade; confCtx.translate(b.x, b.y); confCtx.rotate(b.r); confCtx.fillStyle = b.c; confCtx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); confCtx.restore();
    }
    if (fade > 0) requestAnimationFrame(tick); else confCtx.clearRect(0, 0, w, h);
  })(t0);
}

/* ---------- 연결 ---------- */
countInput.addEventListener('change', () => setCount(countInput.value));
countInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') { setCount(countInput.value); start(); } });
range.addEventListener('input', () => setCount(range.value));
document.querySelectorAll('.rd-step').forEach(b => { b.onclick = () => setCount(count + Number(b.dataset.step)); });
document.querySelectorAll('.rd-presets button').forEach(b => { b.onclick = () => setCount(Number(b.dataset.n)); });
startBtn.onclick = () => { setCount(countInput.value); start(); };
fastBtn.onclick = () => {
  fast = !fast;
  fastBtn.setAttribute('aria-pressed', String(fast));
  speedEl.hidden = !fast; speedEl.textContent = `배속 ×${FAST_SCALE.toFixed(2).replace(/\.?0+$/, '')}`;
};
soundBtn.onclick = () => {
  sound = !sound;
  soundBtn.setAttribute('aria-pressed', String(sound));
  if (!sound) stopEngine(); else if (phase === 'race') startEngine();
};
$('rd-again').onclick = () => { result.close(); phase = 'idle'; start(); };
$('rd-close').onclick = () => result.close();
result.addEventListener('close', () => { confettiRun++; });

new ResizeObserver(() => resize()).observe(stage);
setCount(count);
resize();
renderTower(true);
requestAnimationFrame(frame);

// 화면 검사용: 지금 상태를 읽어요.
window.raceDraw = { get phase() { return phase; }, get plan() { return plan; }, get fast() { return fast; } };
