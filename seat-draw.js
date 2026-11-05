// 자리 뽑기(교사용 자료): 교실 자리에 학생을 무작위로 앉혀요.
// - 교실은 칸으로 나뉜 판이에요. 뽑기 전에는 자리를 끌어서 원하는 칸(교탁 옆·교탁 앞 줄 포함)에 옮기고, 자리를 더하거나 없앨 수 있어요.
//   끌기가 어려우면 자리를 고른 뒤 Shift+방향키로 한 칸씩 옮겨요. 배치(자리 위치·막은 자리)는 이 브라우저에 기억해요(이름은 기억하지 않아요).
// - 자리를 누르면 막은 자리·고정 학생을 정하고(‘자리 막기’를 켜면 누르는 자리마다 바로 막혀요), 뽑은 뒤에는 두 자리를 차례로 눌러 맞바꿔요.
// - ‘제외할 번호’는 보통 자리에서 빼고, 고르면 막은 자리에 무작위로 앉혀요.
// - ‘차례로 공개’는 5초 카운트다운 화면(5→1, 심장 소리·북소리·흩날리는 번호)이 끝나면 ‘공개!’와 함께 앞줄부터 빠르게 열리고 꽃가루가 터져요.
// 계산은 src/seat-model.js(번호를 고르게 섞음, crypto 난수). 이름 명단은 이 화면에만 있고 어디에도 저장하거나 보내지 않아요.
import './seat-draw.css';
import { setupTheme } from './src/theme.js';
import { guardTeacherPage } from './src/teacher-gate.js';
import { icon } from './src/icons.js';
import { LIMITS, makeStudents, parseNumbers, checkSetup, drawSeats, makeLayout, isTeacherCell, seatOrder, growLayout } from './src/seat-model.js';

setupTheme();
guardTeacherPage({ home: '../../' });

const $ = id => document.getElementById(id);
const rowsIn = $('sd-rows'), colsIn = $('sd-cols'), countIn = $('sd-count'), pairsIn = $('sd-pairs'), namesIn = $('sd-names-text');
const excludeIn = $('sd-exclude'), excludeSeatIn = $('sd-exclude-seat');
const grid = $('sd-grid'), room = $('sd-room'), status = $('sd-status'), drawBtn = $('sd-draw'), flipBtn = $('sd-flip'), skipBtn = $('sd-skip'), allBtn = $('sd-all');
const blockBtn = $('sd-block'), soundBtn = $('sd-sound'), stage = $('sd-stage'), fsBtn = $('sd-fs'), fsDraw = $('sd-fs-draw'), fx = $('sd-fx'), trash = $('sd-trash');
const show = $('sd-show'), showNum = $('sd-show-num'), showLine = $('sd-show-line'), floaters = $('sd-floaters');
const dialog = $('sd-dialog'), blockedIn = $('sd-blocked'), fixedIn = $('sd-fixed'), dialogError = $('sd-dialog-error');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORE = 'seat-draw-layout';

// layout: { w, h, tc, seats: [{ id, r, c }] } — 0번 줄은 교탁 줄이에요(src/seat-model.js).
let layout, nextId = 1, flipped = false;
const blocked = new Set(), fixed = new Map(); // 열쇠: 자리 id
let phase = 'setup', result = null, revealed = new Set(), selected = null, spinning = null, timers = [];
let editing = null, autoReveal = false, blockMode = false, sound = true;

const clampIn = (input, [lo, hi]) => { const v = Math.min(hi, Math.max(lo, Math.round(Number(input.value)) || lo)); input.value = v; return v; };
const students = () => makeStudents(clampIn(countIn, [1, 100]), namesIn.value);
const studentOf = id => students().find(s => s.id === id);
const label = s => (s.name ? `${s.id}번 ${s.name}` : `${s.id}번`);
const revealMode = () => document.querySelector('input[name="sd-reveal"]:checked').value;
const seatById = id => layout.seats.find(s => s.id === id);
const seatAt = (r, c) => layout.seats.find(s => s.r === r && s.c === c);
const deskEl = id => grid.querySelector(`.sd-desk[data-id="${id}"]`);
const where = s => (s.r === 0 ? `교탁 줄 왼쪽에서 ${s.c + 1}째 칸` : `앞에서 ${s.r}째 줄 왼쪽에서 ${s.c + 1}째 칸`);
const unrevealedLeft = () => result && [...result].some(([id, st]) => st !== null && !revealed.has(id));

/* ---------- 배치 만들기·기억하기 ---------- */
function newLayout() {
  const L = makeLayout(clampIn(rowsIn, LIMITS.rows), clampIn(colsIn, LIMITS.cols), pairsIn.checked);
  L.seats = L.seats.map(s => ({ ...s, id: nextId++ }));
  blocked.clear(); fixed.clear();
  layout = L;
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify({ v: 1, rows: rowsIn.value, cols: colsIn.value, pairs: pairsIn.checked, layout, blocked: [...blocked] })); } catch { /* 기억하지 못해도 지금 화면은 그대로예요. */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE));
    if (d?.v !== 1 || !Array.isArray(d.layout?.seats)) return false;
    rowsIn.value = d.rows; colsIn.value = d.cols; pairsIn.checked = d.pairs;
    layout = d.layout;
    nextId = Math.max(0, ...layout.seats.map(s => s.id)) + 1;
    (d.blocked || []).forEach(id => { if (seatById(id)) blocked.add(id); });
    return true;
  } catch { return false; }
}
function forgetSeat(id) { blocked.delete(id); fixed.delete(id); }

/* ---------- 그리기 ---------- */
function deskHTML(seat) {
  const id = seat.id, at = where(seat);
  const isBlocked = blocked.has(id);
  if (phase === 'setup') {
    if (isBlocked) return { cls: 'blocked', html: '<span class="sd-empty">막은 자리</span>', aria: `${at}, 막은 자리` };
    const st = fixed.get(id);
    if (!st) return { cls: '', html: '', aria: `${at}, ${blockMode ? '누르면 막혀요' : '누르면 설정, 끌어서 옮겨요'}` };
    const s = studentOf(st);
    return { cls: 'fixed', html: `<span class="sd-lock">${icon('lock')}</span><strong>${st}</strong>${s?.name ? `<small>${s.name}</small>` : ''}`, aria: `${at}, ${s ? label(s) : `${st}번`} 고정` };
  }
  if (phase === 'drawing') return isBlocked && result.get(id) === null ? { cls: 'blocked', html: '<span class="sd-empty">막은 자리</span>', aria: `${at}, 막은 자리` } : { cls: 'spin', html: '<strong class="sd-spin">?</strong>', aria: at };
  const st = result.get(id);
  if (st === null) return isBlocked ? { cls: 'blocked', html: '<span class="sd-empty">막은 자리</span>', aria: `${at}, 막은 자리` } : { cls: 'vacant', html: '', aria: `${at}, 비어 있음` };
  if (!revealed.has(id)) return { cls: 'hidden-card', html: '<strong>?</strong>', aria: `${at}, 눌러서 공개` };
  const s = studentOf(st);
  return { cls: `shown${isBlocked ? ' special' : ''}${selected === id ? ' selected' : ''}`, html: `<strong>${st}</strong>${s?.name ? `<small>${s.name}</small>` : ''}`, aria: `${at}, ${s ? label(s) : `${st}번`}` };
}
// 칸 차례(뒤집어 보면 줄·칸이 거꾸로)와 CSS 격자 위치
const dispR = r => (flipped ? layout.h - 1 - r : r) + 1;
const dispC = c => (flipped ? layout.w - 1 - c : c) + 1;
function render() {
  room.classList.toggle('flipped', flipped);
  room.classList.toggle('editable', phase === 'setup');
  const { w, h, tc } = layout;
  // 자리가 없는 칸·줄(통로·여유 칸)은 좁게 보여 줘요.
  const usedC = new Set(layout.seats.map(s => s.c)), usedR = new Set(layout.seats.map(s => s.r));
  usedR.add(0); usedC.add(tc); usedC.add(tc + 1);
  const colsT = Array.from({ length: w }, (_, i) => { const c = flipped ? w - 1 - i : i; return usedC.has(c) ? 'minmax(var(--cell-min),var(--cell-max))' : 'var(--aisle)'; });
  const rowsT = Array.from({ length: h }, (_, i) => { const r = flipped ? h - 1 - i : i; return usedR.has(r) ? 'var(--cell-h)' : 'var(--aisle)'; });
  grid.style.gridTemplateColumns = colsT.join(' ');
  grid.style.gridTemplateRows = rowsT.join(' ');
  let html = '';
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    if (isTeacherCell(layout, r, c) || seatAt(r, c)) continue;
    html += `<div class="sd-slot${r === 0 ? ' front' : ''}" data-r="${r}" data-c="${c}" style="grid-area:${dispR(r)}/${dispC(c)}"></div>`;
  }
  const t0 = flipped ? dispC(tc + 1) : dispC(tc);
  html += `<div class="sd-teacher" style="grid-area:${dispR(0)}/${t0}/span 1/span 2">교탁</div>`;
  for (const seat of layout.seats) {
    const d = deskHTML(seat);
    html += `<button type="button" class="sd-desk ${d.cls}" data-id="${seat.id}" data-r="${seat.r}" data-c="${seat.c}" style="grid-area:${dispR(seat.r)}/${dispC(seat.c)}" aria-label="${d.aria}">${d.html}</button>`;
  }
  grid.innerHTML = html;
  if (phase === 'drawing') spinFaces();
  updateStatus();
}
function updateStatus(text) {
  status.textContent = text ?? (
    phase === 'setup' ? (blockMode ? '막을 자리를 누르세요. 막은 자리를 다시 누르면 풀려요.' : '자리를 누르면 막은 자리·고정 학생을 정하고, 끌어서 원하는 칸(교탁 옆도 돼요)에 옮겨요.')
    : phase === 'drawing' ? '자리를 뽑고 있어요.'
    : autoReveal ? '자리를 공개하고 있어요.'
    : unrevealedLeft() ? '자리를 눌러 한 자리씩 공개해요.'
    : selected !== null ? '바꿀 다른 자리를 눌러 주세요. 그만두려면 Esc를 눌러요.'
    : '두 자리를 차례로 누르면 서로 바꿔요.');
  status.classList.toggle('error', !!text);
  skipBtn.hidden = !(phase === 'drawing' || autoReveal);
  allBtn.hidden = !(phase === 'result' && !autoReveal && unrevealedLeft());
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
  const list = students(), ex = parseNumbers(excludeIn.value);
  if (ex.error) { phase = 'setup'; result = null; render(); updateStatus(ex.error); return; }
  const order = seatOrder(layout.seats), index = new Map(order.map((s, i) => [s.id, i]));
  const setup = {
    total: order.length, students: list, excluded: new Set(ex.ids), seatExcluded: excludeSeatIn.checked,
    blocked: new Set([...blocked].map(id => index.get(id))), fixed: new Map([...fixed].map(([id, st]) => [index.get(id), st])),
  };
  const problem = checkSetup(setup);
  if (problem) { phase = 'setup'; result = null; render(); updateStatus(problem); return; }
  const seats = drawSeats(setup);
  result = new Map(order.map((s, i) => [s.id, seats[i]]));
  revealed = new Set(); selected = null;
  if (revealMode() === 'click') { phase = 'result'; render(); return; }
  phase = 'drawing'; render();
  // 0~5초: 카운트다운 화면. 5초에 ‘공개!’ 번쩍임 → 앞줄부터 1.2초 안에 모두 열려요.
  openShow(list.map(s => s.id));
  drumroll(5);
  SHOW_LINES.forEach((line, k) => timers.push(setTimeout(() => beat(5 - k, line), k * 1000)));
  const filled = order.filter(s => result.get(s.id) !== null).map(s => s.id);
  const step = Math.min(60, 1200 / Math.max(1, filled.length));
  timers.push(setTimeout(() => {
    showNum.textContent = '공개!'; showLine.textContent = ''; show.classList.remove('hot'); show.classList.add('boom');
    boom();
    room.scrollIntoView({ block: 'center' }); // 화면이 걷히면 교실이 바로 보이게(카운트다운 뒤라 움직임은 보이지 않아요)
  }, 5000));
  timers.push(setTimeout(() => {
    cancelAnimationFrame(spinning); spinning = null;
    closeShow();
    phase = 'result'; autoReveal = true; render();
    filled.forEach((id, n) => timers.push(setTimeout(() => { reveal(id); blip(n / filled.length); }, n * step)));
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
function reveal(id) {
  revealed.add(id);
  const btn = deskEl(id), seat = seatById(id);
  if (!btn || !seat) return;
  const d = deskHTML(seat);
  btn.className = `sd-desk ${d.cls} pop`;
  btn.innerHTML = d.html; btn.setAttribute('aria-label', d.aria);
  if (!unrevealedLeft()) {
    const wasAuto = autoReveal;
    autoReveal = false; updateStatus();
    if (wasAuto) celebrate();
  }
}
function finishReveal() {
  clearTimers();
  if (!result) return;
  for (const [id, st] of result) if (st !== null) revealed.add(id);
  phase = 'result'; render();
}
function resetToSetup() { clearTimers(); phase = 'setup'; result = null; revealed = new Set(); selected = null; render(); }

/* ---------- 자리 누르기 ---------- */
let dragEnded = false;
grid.addEventListener('click', ev => {
  const btn = ev.target.closest('.sd-desk');
  if (!btn || dragEnded) return;
  const id = Number(btn.dataset.id);
  if (phase === 'setup' && blockMode) { toggleBlock(id); return; }
  if (phase === 'setup') return openSeat(id);
  if (phase !== 'result') return;
  const st = result.get(id);
  if (st !== null && !revealed.has(id)) { reveal(id); blip(0.5); return; }
  if (autoReveal || unrevealedLeft()) return;
  if (selected === null) { if (st === null) return; selected = id; render(); deskEl(id).focus(); return; }
  if (selected !== id) { const a = result.get(selected); result.set(selected, st); result.set(id, a); }
  selected = null; render();
  deskEl(id).focus();
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && selected !== null) { selected = null; render(); } });

/* ---------- 끌어서 옮기기(마우스·손가락 모두) ---------- */
let drag = null;
function dropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  if (el.closest('#sd-trash')) return { kind: 'trash', el: trash };
  const t = el.closest('.sd-slot, .sd-desk');
  if (!t || !grid.contains(t) || t === drag.btn) return null;
  return { kind: t.classList.contains('sd-slot') ? 'slot' : 'seat', el: t, r: Number(t.dataset.r), c: Number(t.dataset.c) };
}
function markTarget(t) {
  grid.querySelectorAll('.over').forEach(e => e.classList.remove('over'));
  trash.classList.remove('over');
  t?.el.classList.add('over');
}
grid.addEventListener('pointerdown', ev => {
  if (phase !== 'setup' || blockMode || ev.button > 0) return;
  const btn = ev.target.closest('.sd-desk');
  if (btn) drag = { id: Number(btn.dataset.id), btn, x: ev.clientX, y: ev.clientY, pid: ev.pointerId, moved: false };
});
document.addEventListener('pointermove', ev => {
  if (!drag || ev.pointerId !== drag.pid) return;
  if (!drag.moved) {
    if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 6) return;
    const box = drag.btn.getBoundingClientRect();
    drag.moved = true; drag.dx = drag.x - box.left; drag.dy = drag.y - box.top;
    drag.ghost = drag.btn.cloneNode(true);
    drag.ghost.classList.add('sd-ghost');
    drag.ghost.removeAttribute('data-id');
    Object.assign(drag.ghost.style, { width: `${box.width}px`, height: `${box.height}px`, gridArea: 'auto' });
    (document.fullscreenElement || document.body).append(drag.ghost); // 전체 화면에서도 보이게
    drag.btn.classList.add('dragging');
    room.classList.add('dragging');
  }
  ev.preventDefault();
  drag.ghost.style.transform = `translate(${ev.clientX - drag.dx}px,${ev.clientY - drag.dy}px)`;
  markTarget(dropTarget(ev.clientX, ev.clientY));
});
function endDrag(x, y) {
  const d = drag;
  if (!d) return;
  if (!d.moved) { drag = null; return; }
  const t = x === null ? null : dropTarget(x, y);
  drag = null;
  d.ghost.remove(); room.classList.remove('dragging'); markTarget(null);
  // 끌기가 끝난 뒤 따라오는 ‘누르기’는 무시해요(설정 창이 열리지 않게).
  dragEnded = true; setTimeout(() => { dragEnded = false; }, 0);
  const seat = seatById(d.id);
  if (t?.kind === 'trash') return removeSeat(d.id);
  if (t?.kind === 'slot') { seat.r = t.r; seat.c = t.c; }
  if (t?.kind === 'seat') { const other = seatById(Number(t.el.dataset.id)); [seat.r, seat.c, other.r, other.c] = [other.r, other.c, seat.r, seat.c]; }
  if (t) layoutChanged(d.id); else render();
}
document.addEventListener('pointerup', ev => { if (drag && ev.pointerId === drag.pid) endDrag(ev.clientX, ev.clientY); });
document.addEventListener('pointercancel', () => endDrag(null));

// 끌기 대신: 자리를 고르고 Shift+방향키로 한 칸씩 옮겨요(자리가 있으면 서로 바꿔요).
grid.addEventListener('keydown', ev => {
  const btn = ev.target.closest('.sd-desk');
  const dir = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[ev.key];
  if (!btn || !dir || !ev.shiftKey || phase !== 'setup') return;
  ev.preventDefault();
  const seat = seatById(Number(btn.dataset.id)), k = flipped ? -1 : 1;
  const r = seat.r + dir[0] * k, c = seat.c + dir[1] * k;
  if (r < 0 || c < 0 || r >= layout.h || c >= layout.w || isTeacherCell(layout, r, c)) return;
  const other = seatAt(r, c);
  if (other) { other.r = seat.r; other.c = seat.c; }
  seat.r = r; seat.c = c;
  layoutChanged(seat.id);
});

/* ---------- 배치 바꾸기 ---------- */
let customized = false;
function layoutChanged(focusId) {
  customized = true;
  growLayout(layout); save(); render();
  const el = focusId && deskEl(focusId);
  if (el) { el.classList.add('pop'); el.focus({ preventScroll: true }); }
}
function removeSeat(id) {
  layout.seats = layout.seats.filter(s => s.id !== id);
  forgetSeat(id);
  layoutChanged();
  updateStatus(`자리를 하나 없앴어요. 지금 ${layout.seats.length}자리예요.`);
}
function addSeat() {
  if (phase !== 'setup') resetToSetup();
  // 맨 뒤 줄부터 빈칸을 찾아 놓아요. 양 끝 여유 칸은 피해서 다른 자리가 밀리지 않게 해요.
  const cols = [...Array.from({ length: layout.w - 2 }, (_, i) => i + 1), 0, layout.w - 1];
  for (let r = layout.h - 1; r >= 0; r--) for (const c of cols) {
    if (isTeacherCell(layout, r, c) || seatAt(r, c)) continue;
    const id = nextId++;
    layout.seats.push({ id, r, c });
    layoutChanged(id);
    updateStatus(`자리를 하나 더했어요(지금 ${layout.seats.length}자리). 끌어서 원하는 칸에 옮겨요.`);
    return;
  }
}
function resetLayout() {
  if (customized && !confirm('직접 옮긴 자리 배치를 지우고, 세로·가로 줄 수로 다시 만들까요?')) return false;
  newLayout(); customized = false; save(); resetToSetup();
  return true;
}

/* ---------- 자리 설정 창 ---------- */
function openSeat(id) {
  editing = id;
  $('sd-dialog-title').textContent = where(seatById(id)).replace('칸', '자리');
  blockedIn.checked = blocked.has(id);
  const taken = new Set([...fixed].filter(([k]) => k !== id).map(([, st]) => st));
  fixedIn.innerHTML = '<option value="">고정하지 않음</option>' + students().filter(s => !taken.has(s.id)).map(s => `<option value="${s.id}">${label(s)}</option>`).join('');
  fixedIn.value = String(fixed.get(id) ?? '');
  dialogError.textContent = '';
  dialog.showModal();
}
$('sd-dialog-form').addEventListener('submit', ev => {
  const st = Number(fixedIn.value);
  if (blockedIn.checked && st) { ev.preventDefault(); dialogError.textContent = '막은 자리에는 학생을 고정할 수 없어요. 둘 중 하나만 골라 주세요.'; return; }
  if (blockedIn.checked) blocked.add(editing); else blocked.delete(editing);
  if (st) fixed.set(editing, st); else fixed.delete(editing);
  save(); render();
});
$('sd-dialog-cancel').onclick = () => dialog.close();
$('sd-dialog-remove').onclick = () => { dialog.close(); removeSeat(editing); };

/* ---------- 자리 막기 ---------- */
function toggleBlock(id) {
  if (blocked.has(id)) blocked.delete(id); else { blocked.add(id); fixed.delete(id); }
  save(); render();
  deskEl(id)?.focus();
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
// 세로·가로 줄 수나 짝을 바꾸면 기본 배치를 새로 만들어요. 직접 옮긴 배치가 있으면 먼저 물어요.
let shape = [rowsIn.value, colsIn.value, pairsIn.checked];
function onShapeChange() {
  clampIn(rowsIn, LIMITS.rows); clampIn(colsIn, LIMITS.cols);
  if (!resetLayout()) { [rowsIn.value, colsIn.value, pairsIn.checked] = shape; return; }
  shape = [rowsIn.value, colsIn.value, pairsIn.checked];
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
pairsIn.addEventListener('change', onShapeChange);
countIn.addEventListener('change', onStudentsChange);
namesIn.addEventListener('change', onStudentsChange);
excludeIn.addEventListener('input', () => { if (phase === 'setup') updateStatus(); });
drawBtn.onclick = draw;
fsDraw.onclick = draw;
skipBtn.onclick = finishReveal;
$('sd-show-skip').onclick = () => { finishReveal(); drawBtn.focus(); };
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !show.hidden) { finishReveal(); drawBtn.focus(); } });
allBtn.onclick = finishReveal;
$('sd-reset').onclick = resetToSetup;
$('sd-add').onclick = addSeat;
$('sd-layout-reset').onclick = resetLayout;
$('sd-print').onclick = () => print();
flipBtn.onclick = () => {
  flipped = !flipped;
  flipBtn.setAttribute('aria-pressed', String(flipped));
  render();
};

// 이 브라우저에 기억한 배치가 있으면 그대로 써요.
if (load()) { customized = true; shape = [rowsIn.value, colsIn.value, pairsIn.checked]; } else newLayout();
render();

// 화면 검사용: 지금 상태를 읽어요. result는 앞줄부터(같은 줄은 왼쪽부터) 자리 차례예요.
window.seatDraw = {
  get phase() { return phase; },
  get result() { return result && seatOrder(layout.seats).map(s => result.get(s.id)); },
  get seats() { return seatOrder(layout.seats).map(({ id, r, c }) => ({ id, r, c, blocked: blocked.has(id) })); },
  get layout() { return { w: layout.w, h: layout.h, tc: layout.tc }; },
};
