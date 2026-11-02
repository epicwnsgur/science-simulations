// 자리 뽑기(교사용 자료): 교실 자리(세로 줄 × 가로 줄)에 학생을 무작위로 앉혀요.
// 뽑기 전에는 자리를 눌러 빈자리·고정 학생을 정하고, 뽑은 뒤에는 두 자리를 차례로 눌러 맞바꿔요.
// 계산은 src/seat-model.js(번호를 고르게 섞음, crypto 난수). 이름 명단은 이 화면에만 있고 어디에도 저장하거나 보내지 않아요.
import './seat-draw.css';
import { setupTheme } from './src/theme.js';
import { guardTeacherPage } from './src/teacher-gate.js';
import { icon } from './src/icons.js';
import { LIMITS, makeStudents, checkSetup, drawSeats } from './src/seat-model.js';
import { shuffle } from './src/race-model.js';

setupTheme();
guardTeacherPage({ home: '../../' });

const $ = id => document.getElementById(id);
const rowsIn = $('sd-rows'), colsIn = $('sd-cols'), countIn = $('sd-count'), pairsIn = $('sd-pairs'), namesIn = $('sd-names-text');
const grid = $('sd-grid'), room = $('sd-room'), status = $('sd-status'), drawBtn = $('sd-draw'), flipBtn = $('sd-flip'), skipBtn = $('sd-skip'), allBtn = $('sd-all');
const dialog = $('sd-dialog'), blockedIn = $('sd-blocked'), fixedIn = $('sd-fixed'), dialogError = $('sd-dialog-error');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let rows = 5, cols = 6, flipped = false;
const blocked = new Set(), fixed = new Map(); // 열쇠: "줄,칸"(앞줄 0, 왼쪽 0)
let phase = 'setup', result = null, revealed = new Set(), selected = -1, spinning = null, timers = [];
let editing = null, autoReveal = false;

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
  if (blocked.has(k)) return { cls: 'blocked', html: '<span class="sd-empty">빈자리</span>', aria: `${where}, 빈자리` };
  if (phase === 'setup') {
    const id = fixed.get(k);
    if (!id) return { cls: '', html: '', aria: `${where}, 설정하려면 누르세요` };
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
    phase === 'setup' ? '자리를 누르면 빈자리나 고정 학생을 정할 수 있어요.'
    : phase === 'drawing' ? '자리를 뽑고 있어요.'
    : autoReveal ? '자리를 공개하고 있어요.'
    : result.some((id, i) => id !== null && !revealed.has(i)) ? '자리를 눌러 한 자리씩 공개해요.'
    : selected >= 0 ? '바꿀 다른 자리를 눌러 주세요. 그만두려면 Esc를 눌러요.'
    : '두 자리를 차례로 누르면 서로 바꿔요.');
  status.classList.toggle('error', !!text);
  skipBtn.hidden = !(phase === 'drawing' || autoReveal);
  allBtn.hidden = !(phase === 'result' && !autoReveal && result.some((id, i) => id !== null && !revealed.has(i)));
  drawBtn.textContent = phase === 'setup' ? '자리 뽑기' : '다시 뽑기';
}

/* ---------- 뽑기와 공개 ---------- */
function clearTimers() { timers.forEach(clearTimeout); timers = []; autoReveal = false; cancelAnimationFrame(spinning); spinning = null; }
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
  if (reduceMotion) { finishReveal(); return; }
  phase = 'drawing'; render();
  // 섞는 모습을 잠깐 보여 준 뒤 앞줄부터 차례로 공개해요(30자리면 3초쯤).
  const seats = result.map((id, i) => i).filter(i => result[i] !== null);
  const step = Math.min(80, 2200 / Math.max(1, seats.length));
  timers.push(setTimeout(() => {
    cancelAnimationFrame(spinning); spinning = null;
    phase = 'result'; autoReveal = true; render();
    seats.forEach((i, n) => timers.push(setTimeout(() => reveal(i), n * step)));
  }, 1000));
}
function reveal(i) {
  revealed.add(i);
  const r = Math.floor(i / cols), c = i % cols, btn = grid.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  if (!btn) return;
  const d = deskHTML(r, c);
  btn.className = `sd-desk ${d.cls}${btn.classList.contains('gap') ? ' gap' : ''} pop`;
  btn.innerHTML = d.html; btn.setAttribute('aria-label', d.aria);
  if (!result.some((id, k) => id !== null && !revealed.has(k))) { autoReveal = false; updateStatus(); }
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
  if (phase === 'setup') return openSeat(r, c);
  if (phase !== 'result' || blocked.has(key(r, c))) return;
  if (result[i] !== null && !revealed.has(i)) return reveal(i);
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
  if (blockedIn.checked && id) { ev.preventDefault(); dialogError.textContent = '빈자리에는 학생을 고정할 수 없어요. 둘 중 하나만 골라 주세요.'; return; }
  if (blockedIn.checked) blocked.add(editing); else blocked.delete(editing);
  if (id) fixed.set(editing, id); else fixed.delete(editing);
  render();
});
$('sd-dialog-cancel').onclick = () => dialog.close();

/* ---------- 설정 바꾸기 ---------- */
function onShapeChange() {
  rows = clampIn(rowsIn, LIMITS.rows); cols = clampIn(colsIn, LIMITS.cols);
  // 교실 밖으로 나간 빈자리·고정 자리는 지워요.
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
skipBtn.onclick = finishReveal;
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
