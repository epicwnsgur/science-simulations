// 자리 뽑기(교사용 자료): 교실 자리(세로 줄 × 가로 줄)에 학생을 무작위로 앉혀요.
// 뽑기 전에는 자리를 눌러 막은 자리·고정 학생을 정하고(‘자리 막기’를 켜면 누르는 자리마다 바로 막혀요), 뽑은 뒤에는 두 자리를 차례로 눌러 맞바꿔요.
// ‘차례로 공개’는 5초 카운트다운 화면(5→1, 심장 소리·북소리·흩날리는 번호)이 끝나면 ‘공개!’와 함께 앞줄부터 빠르게 열리고 꽃가루가 터져요.
// 계산은 src/seat-model.js(번호를 고르게 섞음, crypto 난수). 이름 명단은 이 화면에만 있고 어디에도 저장하거나 보내지 않아요.
import './seat-draw.css';
import { setupTheme } from './src/theme.js';
import { guardTeacherPage } from './src/teacher-gate.js';
import { icon } from './src/icons.js';
import { LIMITS, makeStudents, checkSetup, drawSeats } from './src/seat-model.js';

setupTheme();
guardTeacherPage({ home: '../../' });

const $ = id => document.getElementById(id);
const rowsIn = $('sd-rows'), colsIn = $('sd-cols'), countIn = $('sd-count'), pairsIn = $('sd-pairs'), namesIn = $('sd-names-text');
const grid = $('sd-grid'), room = $('sd-room'), status = $('sd-status'), drawBtn = $('sd-draw'), flipBtn = $('sd-flip'), skipBtn = $('sd-skip'), allBtn = $('sd-all');
const blockBtn = $('sd-block'), soundBtn = $('sd-sound'), stage = $('sd-stage'), fsBtn = $('sd-fs'), fsDraw = $('sd-fs-draw'), fx = $('sd-fx');
const show = $('sd-show'), showNum = $('sd-show-num'), showLine = $('sd-show-line'), floaters = $('sd-floaters');
const dialog = $('sd-dialog'), blockedIn = $('sd-blocked'), fixedIn = $('sd-fixed'), dialogError = $('sd-dialog-error');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let rows = 5, cols = 6, flipped = false;
const blocked = new Set(), fixed = new Map(); // 열쇠: "줄,칸"(앞줄 0, 왼쪽 0)
let phase = 'setup', result = null, revealed = new Set(), selected = -1, spinning = null, timers = [];
let editing = null, autoReveal = false, blockMode = false, sound = true;

const key = (r, c) => `${r},${c}`;
const clampIn = (input, [lo, hi]) => { const v = Math.min(hi, Math.max(lo, Math.round(Number(input.value)) || lo)); input.value = v; return v; };
const students = () => makeStudents(clampIn(countIn, [1, 100]), namesIn.value);
const studentOf = id => students().find(s => s.id === id);
const label = s => (s.name ? `${s.id}번 ${s.name}` : `${s.id}번`);
const revealMode = () => document.querySelector('input[name="sd-reveal"]:checked').value;
const seatIndex = (r, c) => r * cols + c;
function setupMaps() {
  return { blocked: new Set([...blocked].map(k => { const [r, c] = k.split(',').map(Number); return seatIndex(r, c); })), fixed: new Map([...fixed].map(([k, id]) => { const [r, c] = k.split(',').map(Number); return [seatIndex(r, c), id]; })) };
}

/* ---------- 그리기 ---------- */
function deskHTML(r, c) {
  const i = seatIndex(r, c), k = key(r, c), where = `앞에서 ${r + 1}째 줄 왼쪽에서 ${c + 1}째 자리`;
  if (blocked.has(k)) return { cls: 'blocked', html: '<span class="sd-empty">막은 자리</span>', aria: `${where}, 막은 자리${phase === 'setup' ? ', 누르면 풀려요' : ''}` };
  if (phase === 'setup') {
    const id = fixed.get(k);
    if (!id) return { cls: '', html: '', aria: `${where}, ${blockMode ? '누르면 막혀요' : '설정하려면 누르세요'}` };
    const s = studentOf(id);
    return { cls: 'fixed', html: `<span class="sd-lock">${icon('lock')}</span><strong>${id}</strong>${s?.name ? `<small>${s.name}</small>` : ''}`, aria: `${where}, ${s ? label(s) : `${id}번`} 고정` };
  }
  if (phase === 'drawing') return { cls: 'spin', html: '<strong class="sd-spin">?</strong>', aria: where };
  const id = result[i];
  if (id === null) return { cls: 'vacant', html: '', aria: `${where}, 비어 있음` };
  if (!revealed.has(i)) return { cls: 'hidden-card', html: '<strong>?</strong>', aria: `${where}, 눌러서 공개` };
  const s = studentOf(id);
  return { cls: `shown${selected === i ? ' selected' : ''}`, html: `<strong>${id}</strong>${s?.name ? `<small>${s.name}</small>` : ''}`, aria: `${where}, ${s ? label(s) : `${id}번`}` };
}
function render() {
  room.classList.toggle('flipped', flipped);
  const pairs = pairsIn.checked;
  const order = n => Array.from({ length: n }, (_, i) => (flipped ? n - 1 - i : i));
  grid.innerHTML = order(rows).map(r => {
    const cs = order(cols);
    return `<div class="sd-row">${cs.map((c, j) => {
      const next = cs[j + 1], gap = pairs && next !== undefined && Math.min(c, next) % 2 === 1;
      const d = deskHTML(r, c);
      return `<button type="button" class="sd-desk ${d.cls}${gap ? ' gap' : ''}" data-r="${r}" data-c="${c}" aria-label="${d.aria}">${d.html}</button>`;
    }).join('')}</div>`;
  }).join('');
  if (phase === 'drawing') spinFaces();
  updateStatus();
}
function updateStatus(text) {
  status.textContent = text ?? (
    phase === 'setup' ? (blockMode ? '막을 자리를 누르세요. 막은 자리를 다시 누르면 풀려요.' : '자리를 누르면 막은 자리나 고정 학생을 정할 수 있어요.')
    : phase === 'drawing' ? '자리를 뽑고 있어요.'
    : autoReveal ? '자리를 공개하고 있어요.'
    : result.some((id, i) => id !== null && !revealed.has(i)) ? '자리를 눌러 한 자리씩 공개해요.'
    : selected >= 0 ? '바꿀 다른 자리를 눌러 주세요. 그만두려면 Esc를 눌러요.'
    : '두 자리를 차례로 누르면 서로 바꿔요.');
  status.classList.toggle('error', !!text);
  skipBtn.hidden = !(phase === 'drawing' || autoReveal);
  allBtn.hidden = !(phase === 'result' && !autoReveal && result.some((id, i) => id !== null && !revealed.has(i)));
  drawBtn.textContent = fsDraw.textContent = phase === 'setup' ? '자리 뽑기' : '다시 뽑기';
  room.classList.toggle('blocking', phase === 'setup' && blockMode);
}

/* ---------- 뽑기와 공개 ---------- */
function clearTimers() {
  timers.forEach(clearTimeout); timers = []; autoReveal = false; cancelAnimationFrame(spinning); spinning = null;
  closeShow();
}
function spinFaces() {
  const ids = students().map(s => s.id);
  const faces = [...grid.querySelectorAll('.sd-spin')];
  let last = 0;
  const tick = now => {
    if (now - last > 70) { faces.forEach(f => { f.textContent = ids[Math.floor(Math.random() * ids.length)]; }); last = now; }
    spinning = requestAnimationFrame(tick);
  };
  spinning = requestAnimationFrame(tick);
}
function draw() {
  clearTimers();
  rows = clampIn(rowsIn, LIMITS.rows); cols = clampIn(colsIn, LIMITS.cols);
  const list = students(), maps = setupMaps();
  const problem = checkSetup({ rows, cols, ...maps, students: list });
  if (problem) { phase = 'setup'; result = null; render(); updateStatus(problem); return; }
  result = drawSeats({ rows, cols, ...maps, students: list });
  revealed = new Set(); selected = -1;
  if (revealMode() === 'click') { phase = 'result'; render(); return; }
  phase = 'drawing'; render();
  // 0~5초: 카운트다운 화면. 5초에 ‘공개!’ 번쩍임 → 앞줄부터 1.2초 안에 모두 열려요.
  openShow(list.map(s => s.id));
  drumroll(5);
  SHOW_LINES.forEach((line, k) => timers.push(setTimeout(() => beat(5 - k, line), k * 1000)));
  const seats = result.map((id, i) => i).filter(i => result[i] !== null);
  const step = Math.min(60, 1200 / Math.max(1, seats.length));
  timers.push(setTimeout(() => {
    showNum.textContent = '공개!'; showLine.textContent = ''; show.classList.remove('hot'); show.classList.add('boom');
    boom();
    room.scrollIntoView({ block: 'center' }); // 화면이 걷히면 교실이 바로 보이게(카운트다운 뒤라 움직임은 보이지 않아요)
  }, 5000));
  timers.push(setTimeout(() => {
    cancelAnimationFrame(spinning); spinning = null;
    closeShow();
    phase = 'result'; autoReveal = true; render();
    seats.forEach((i, n) => timers.push(setTimeout(() => { reveal(i); blip(n / seats.length); }, n * step)));
  }, 5450));
}

/* ---------- 5초 카운트다운 화면 ---------- */
const SHOW_LINES = ['두근두근…', '누구 옆자리가 될까?', '짝꿍이 궁금해!', '마음의 준비!', '곧 공개!'];
function openShow(ids) {
  // 뒤에서 학생 번호가 흩날려요.
  floaters.innerHTML = Array.from({ length: 36 }, () => {
    const id = ids[Math.floor(Math.random() * ids.length)];
    return `<span style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(2.2 + Math.random() * 2.6).toFixed(2)}s;--w:${(-Math.random() * 4).toFixed(2)}s;--s:${(0.7 + Math.random() * 1.3).toFixed(2)}">${id}</span>`;
  }).join('');
  show.className = 'sd-show'; show.hidden = false;
  void show.offsetWidth; show.classList.add('run');
  $('sd-show-skip').focus();
}
function beat(n, line) {
  showNum.textContent = n; showLine.textContent = line;
  showNum.classList.remove('pop'); showLine.classList.remove('pop');
  void showNum.offsetWidth; showNum.classList.add('pop'); showLine.classList.add('pop');
  show.classList.toggle('hot', n <= 2);
  heartbeat(n);
}
function closeShow() {
  show.hidden = true; show.className = 'sd-show'; floaters.innerHTML = '';
}
function reveal(i) {
  revealed.add(i);
  const r = Math.floor(i / cols), c = i % cols, btn = grid.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  if (!btn) return;
  const d = deskHTML(r, c);
  btn.className = `sd-desk ${d.cls}${btn.classList.contains('gap') ? ' gap' : ''} pop`;
  btn.innerHTML = d.html; btn.setAttribute('aria-label', d.aria);
  if (!result.some((id, k) => id !== null && !revealed.has(k))) {
    const wasAuto = autoReveal;
    autoReveal = false; updateStatus();
    if (wasAuto) celebrate();
  }
}
function finishReveal() {
  clearTimers();
  if (!result) return;
  result.forEach((id, i) => { if (id !== null) revealed.add(i); });
  phase = 'result'; render();
}
function resetToSetup() { clearTimers(); phase = 'setup'; result = null; revealed = new Set(); selected = -1; render(); }

/* ---------- 자리 누르기 ---------- */
grid.addEventListener('click', ev => {
  const btn = ev.target.closest('.sd-desk');
  if (!btn) return;
  const r = Number(btn.dataset.r), c = Number(btn.dataset.c), i = seatIndex(r, c);
  if (phase === 'setup' && blockMode) { toggleBlock(r, c); return; }
  if (phase === 'setup') return openSeat(r, c);
  if (phase !== 'result' || blocked.has(key(r, c))) return;
  if (result[i] !== null && !revealed.has(i)) { reveal(i); blip(0.5); return; }
  if (autoReveal) return;
  if (result.some((id, k) => id !== null && !revealed.has(k))) return;
  if (selected < 0) { if (result[i] === null) return; selected = i; render(); grid.querySelector(`[data-r="${r}"][data-c="${c}"]`).focus(); return; }
  if (selected !== i) [result[selected], result[i]] = [result[i], result[selected]];
  selected = -1; render();
  grid.querySelector(`[data-r="${r}"][data-c="${c}"]`).focus();
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && selected >= 0) { selected = -1; render(); } });

function openSeat(r, c) {
  editing = key(r, c);
  $('sd-dialog-title').textContent = `앞에서 ${r + 1}째 줄 · 왼쪽에서 ${c + 1}째 자리`;
  blockedIn.checked = blocked.has(editing);
  const taken = new Set([...fixed].filter(([k]) => k !== editing).map(([, id]) => id));
  fixedIn.innerHTML = '<option value="">고정하지 않음</option>' + students().filter(s => !taken.has(s.id)).map(s => `<option value="${s.id}">${label(s)}</option>`).join('');
  fixedIn.value = String(fixed.get(editing) ?? '');
  dialogError.textContent = '';
  dialog.showModal();
}
$('sd-dialog-form').addEventListener('submit', ev => {
  const id = Number(fixedIn.value);
  if (blockedIn.checked && id) { ev.preventDefault(); dialogError.textContent = '막은 자리에는 학생을 고정할 수 없어요. 둘 중 하나만 골라 주세요.'; return; }
  if (blockedIn.checked) blocked.add(editing); else blocked.delete(editing);
  if (id) fixed.set(editing, id); else fixed.delete(editing);
  render();
});
$('sd-dialog-cancel').onclick = () => dialog.close();

/* ---------- 자리 막기 ---------- */
function toggleBlock(r, c) {
  const k = key(r, c);
  if (blocked.has(k)) blocked.delete(k); else { blocked.add(k); fixed.delete(k); }
  render();
  grid.querySelector(`[data-r="${r}"][data-c="${c}"]`).focus();
}
blockBtn.onclick = () => {
  if (phase !== 'setup') resetToSetup();
  blockMode = !blockMode;
  blockBtn.setAttribute('aria-pressed', String(blockMode));
  render();
};

/* ---------- 전체 화면 ---------- */
function renderFs() {
  const on = document.fullscreenElement === stage;
  fsBtn.innerHTML = icon(on ? 'shrink' : 'expand');
  fsBtn.setAttribute('aria-label', on ? '전체 화면 끝내기' : '전체 화면');
  fsBtn.title = on ? '전체 화면 끝내기' : '전체 화면';
}
fsBtn.hidden = !document.fullscreenEnabled; // 전체 화면을 쓸 수 없는 기기(아이폰 등)에서는 단추를 숨겨요.
fsBtn.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(() => {}); };
document.addEventListener('fullscreenchange', renderFs);
renderFs();

/* ---------- 소리(Web Audio로 직접 만들어요) ---------- */
let audio = null;
function ctx() {
  if (!sound) return null;
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { audio = null; }
  return audio;
}
function noise(at, dur, vol, freq) {
  const a = ctx(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start(a.currentTime + at);
}
function tone(at, freq, dur, vol = 0.06, type = 'triangle') {
  const a = ctx(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
// 북소리: 처음엔 드문드문, 끝으로 갈수록 빠르고 커져요.
function drumroll(seconds) {
  if (!ctx()) return;
  for (let t = 0; t < seconds; ) { const k = t / seconds; noise(t, 0.05, 0.03 + 0.13 * k * k, 180 + 140 * k); t += 0.2 - 0.16 * k; }
}
// 숫자가 바뀔 때마다 심장 소리 두 번과 째깍 소리(숫자가 작을수록 높게)
function heartbeat(n) {
  tone(0, 70, 0.16, 0.22, 'sine'); tone(0.18, 62, 0.2, 0.18, 'sine');
  tone(0, 1320 - n * 140, 0.08, 0.05, 'square');
}
// 공개 순간: 쾅!
function boom() { noise(0, 0.6, 0.25, 120); tone(0, 523, 0.5, 0.08); tone(0, 659, 0.5, 0.07); tone(0, 784, 0.6, 0.07); }
const blip = k => tone(0, 520 + 700 * k, 0.07, 0.035);
soundBtn.onclick = () => { sound = !sound; soundBtn.setAttribute('aria-pressed', String(sound)); };

/* ---------- 마지막: 심벌과 꽃가루 ---------- */
const COLORS = ['#ffd65a', '#ff5d8f', '#2ec4ff', '#7cff4f', '#b388ff', '#ff8a3d'];
function celebrate() {
  noise(0, 1.2, 0.12, 5000); tone(0, 784, 0.4); tone(0.12, 1046, 0.5);
  room.classList.remove('flash'); void room.offsetWidth; room.classList.add('flash');
  if (reduceMotion) return;
  const dpr = Math.min(2, devicePixelRatio || 1), w = (fx.width = room.clientWidth * dpr), h = (fx.height = room.clientHeight * dpr), k = fx.getContext('2d');
  const bits = Array.from({ length: 160 }, (_, i) => {
    const left = i % 2 === 0, a = (left ? -1 : 1) * (0.5 + Math.random() * 0.9);
    return { x: left ? 0 : w, y: h * 0.9, vx: Math.sin(Math.abs(a)) * (left ? 1 : -1) * (6 + Math.random() * 9) * dpr, vy: -(9 + Math.random() * 9) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, s: (5 + Math.random() * 5) * dpr, c: COLORS[i % COLORS.length] };
  });
  const t0 = performance.now();
  (function tick(now) {
    k.clearRect(0, 0, w, h);
    const fade = Math.max(0, 1 - (now - t0 - 1600) / 900);
    for (const b of bits) {
      b.vy += 0.35 * dpr; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      k.save(); k.globalAlpha = fade; k.translate(b.x, b.y); k.rotate(b.r); k.fillStyle = b.c; k.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); k.restore();
    }
    if (fade > 0 && phase === 'result') requestAnimationFrame(tick); else k.clearRect(0, 0, w, h);
  })(t0);
}

/* ---------- 설정 바꾸기 ---------- */
function onShapeChange() {
  rows = clampIn(rowsIn, LIMITS.rows); cols = clampIn(colsIn, LIMITS.cols);
  // 교실 밖으로 나간 막은 자리·고정 자리는 지워요.
  for (const k of [...blocked]) { const [r, c] = k.split(',').map(Number); if (r >= rows || c >= cols) blocked.delete(k); }
  for (const k of [...fixed.keys()]) { const [r, c] = k.split(',').map(Number); if (r >= rows || c >= cols) fixed.delete(k); }
  resetToSetup();
}
function onStudentsChange() {
  const names = namesIn.value.trim();
  countIn.disabled = !!names;
  if (names) countIn.value = makeStudents(0, namesIn.value).length;
  const ids = new Set(students().map(s => s.id));
  for (const [k, id] of [...fixed]) if (!ids.has(id)) fixed.delete(k);
  resetToSetup();
}
rowsIn.addEventListener('change', onShapeChange);
colsIn.addEventListener('change', onShapeChange);
countIn.addEventListener('change', onStudentsChange);
namesIn.addEventListener('change', onStudentsChange);
pairsIn.addEventListener('change', render);
drawBtn.onclick = draw;
fsDraw.onclick = draw;
skipBtn.onclick = finishReveal;
$('sd-show-skip').onclick = () => { finishReveal(); drawBtn.focus(); };
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !show.hidden) { finishReveal(); drawBtn.focus(); } });
allBtn.onclick = finishReveal;
$('sd-reset').onclick = resetToSetup;
$('sd-print').onclick = () => print();
flipBtn.onclick = () => {
  flipped = !flipped;
  flipBtn.setAttribute('aria-pressed', String(flipped));
  render();
};

render();

// 화면 검사용: 지금 상태를 읽어요.
window.seatDraw = { get phase() { return phase; }, get result() { return result && [...result]; }, get size() { return [rows, cols]; } };
