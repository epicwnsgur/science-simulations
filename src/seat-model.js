// 자리 뽑기(교사용 자료)의 계산: 교실 자리에 학생을 무작위로 앉혀요.
// - 막은 자리에는 보통 학생을 앉히지 않아요. ‘제외할 번호’를 막은 자리에 앉히기로 하면, 제외한 학생들만 막은 자리에 무작위로 앉아요.
// - 고정 자리는 그 학생을 먼저 앉히고, 나머지 학생만 섞어요.
// - 학생보다 자리가 많으면 앞줄부터 채워서 남는 자리는 뒤쪽에 생겨요.
// 자리 차례(0, 1, 2 …)는 앞줄(칠판 쪽)부터, 같은 줄에서는 왼쪽부터예요(교실 앞에서 학생들이 보는 방향 기준).
import { shuffle, cryptoRandom } from './race-model.js';

export const LIMITS = { rows: [1, 10], cols: [1, 10] };

// 학생 목록: 이름 칸이 비어 있으면 1~count번, 아니면 한 줄에 한 명(줄 차례가 번호)
export function makeStudents(count, namesText = '') {
  const names = String(namesText).split('\n').map(s => s.trim()).filter(Boolean);
  if (names.length) return names.map((name, i) => ({ id: i + 1, name }));
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: '' }));
}

// ‘제외할 번호’ 읽기: "3, 17 21", "5-7", "5~7"처럼 써요. 숫자가 아닌 것이 있으면 error를 돌려줘요.
export function parseNumbers(text) {
  const ids = new Set();
  for (const part of String(text).split(/[,\s·/]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:[-~](\d+))?$/);
    if (!m) return { ids: [], error: '제외할 번호는 숫자로 써 주세요(예: 3, 17, 21 또는 5-7).' };
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    if (Math.abs(b - a) > 100) return { ids: [], error: '번호 범위가 너무 넓어요.' };
    for (let n = Math.min(a, b); n <= Math.max(a, b); n++) ids.add(n);
  }
  return { ids: [...ids].sort((x, y) => x - y), error: '' };
}

// 뽑기 전에 맞는지 살펴요. 문제가 있으면 선생님께 보여 줄 문장을 돌려줘요.
// total: 자리 수, blocked·fixed: 자리 차례로 적은 막은 자리·고정 자리, excluded: 제외할 학생 번호, seatExcluded: 제외한 학생을 막은 자리에 앉힐지
export function checkSetup({ total, blocked, fixed, students, excluded = new Set(), seatExcluded = true }) {
  const ids = new Set(students.map(s => s.id));
  const fixedIds = [...fixed.values()];
  if (!students.length) return '학생이 없어요.';
  for (const id of excluded) if (!ids.has(id)) return `제외할 ${id}번 학생이 명단에 없어요.`;
  for (const id of fixedIds) if (excluded.has(id)) return `${id}번은 고정 자리와 제외할 번호에 함께 있어요. 하나만 정해 주세요.`;
  const normal = students.length - excluded.size, usable = total - blocked.size;
  if (normal > usable) return `학생 ${normal}명보다 앉을 자리(${usable}자리)가 적어요. 자리를 더하거나 막은 자리를 줄여 주세요.`;
  if (seatExcluded && excluded.size > blocked.size) return `제외한 학생 ${excluded.size}명보다 막은 자리(${blocked.size}자리)가 적어요. 자리를 더 막거나 제외할 번호를 줄여 주세요.`;
  for (const [seat, id] of fixed) {
    if (seat >= total) return '교실 밖의 고정 자리가 있어요. 자리 설정을 다시 확인해 주세요.';
    if (blocked.has(seat)) return '막은 자리에 고정한 학생이 있어요.';
    if (!ids.has(id)) return `고정한 ${id}번 학생이 명단에 없어요.`;
  }
  if (new Set(fixedIds).size !== fixedIds.length) return '한 학생을 두 자리에 고정했어요.';
  return '';
}

// 결과: 자리 차례 → 학생 id (빈자리·남는 자리는 null)
export function drawSeats({ total, blocked = new Set(), fixed = new Map(), students, excluded = new Set(), seatExcluded = true }, rand = cryptoRandom) {
  const problem = checkSetup({ total, blocked, fixed, students, excluded, seatExcluded });
  if (problem) throw new Error(problem);
  const seats = Array(total).fill(null);
  for (const [seat, id] of fixed) seats[seat] = id;
  const fixedIds = new Set(fixed.values());
  const rest = shuffle(students.map(s => s.id).filter(id => !fixedIds.has(id) && !excluded.has(id)), rand);
  let k = 0;
  for (let seat = 0; seat < seats.length && k < rest.length; seat++) {
    if (blocked.has(seat) || seats[seat] !== null) continue;
    seats[seat] = rest[k++];
  }
  // 제외한 학생은 막은 자리 가운데 무작위로 골라 앉혀요.
  if (seatExcluded && excluded.size) {
    const spots = shuffle([...blocked].sort((a, b) => a - b), rand);
    shuffle([...excluded].sort((a, b) => a - b), rand).forEach((id, i) => { seats[spots[i]] = id; });
  }
  return seats;
}

/* ---------- 자리 배치(끌어서 옮기는 교실) ----------
   교실은 칸으로 나뉜 판이에요. 0번 줄은 교탁 줄(교탁 옆·교탁 앞에도 자리를 둘 수 있어요), 1번 줄부터 학생 줄이에요.
   w: 칸 수, h: 줄 수, tc: 교탁이 차지하는 두 칸 가운데 왼쪽 칸, seats: [{ r, c }] */
export function makeLayout(rows, cols, pairs = true) {
  const aisles = pairs ? Math.floor((cols - 1) / 2) : 0;
  const w = cols + aisles + 2, h = rows + 2; // 양옆과 맨 뒤에 한 줄씩 빈칸을 둬서 자리를 더 놓을 수 있어요.
  const seats = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) seats.push({ r: r + 1, c: 1 + c + (pairs ? Math.floor(c / 2) : 0) });
  return { w, h, tc: Math.floor((w - 2) / 2), seats };
}
export const isTeacherCell = (layout, r, c) => r === 0 && (c === layout.tc || c === layout.tc + 1);
// 앞줄부터, 같은 줄에서는 왼쪽부터
export const seatOrder = seats => [...seats].sort((a, b) => a.r - b.r || a.c - b.c);
// 가장자리에 자리가 닿으면 판을 한 칸씩 늘려서, 늘 옆과 뒤에 놓을 곳이 남게 해요.
export function growLayout(layout, max = { w: 16, h: 13 }) {
  const { seats } = layout;
  if (layout.w < max.w && seats.some(s => s.c === 0)) { seats.forEach(s => { s.c++; }); layout.tc++; layout.w++; }
  if (layout.w < max.w && seats.some(s => s.c === layout.w - 1)) layout.w++;
  if (layout.h < max.h && seats.some(s => s.r === layout.h - 1)) layout.h++;
  return layout;
}
