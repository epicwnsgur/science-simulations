// 자리 뽑기(교사용 자료)의 계산: 교실 자리(세로 줄 × 가로 줄)에 학생을 무작위로 앉혀요.
// - 빈자리(쓰지 않는 자리)에는 아무도 앉히지 않아요.
// - 고정 자리는 그 학생을 먼저 앉히고, 나머지 학생만 섞어요.
// - 학생보다 자리가 많으면 앞줄부터 채워서 남는 자리는 뒤쪽에 생겨요.
// 자리 번호는 앞줄(칠판 쪽) 왼쪽부터 0, 1, 2 …예요(교실 앞에서 학생들이 보는 방향 기준).
import { shuffle, cryptoRandom } from './race-model.js';

export const LIMITS = { rows: [1, 10], cols: [1, 10] };

// 학생 목록: 이름 칸이 비어 있으면 1~count번, 아니면 한 줄에 한 명(줄 차례가 번호)
export function makeStudents(count, namesText = '') {
  const names = String(namesText).split('\n').map(s => s.trim()).filter(Boolean);
  if (names.length) return names.map((name, i) => ({ id: i + 1, name }));
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: '' }));
}

// 뽑기 전에 맞는지 살펴요. 문제가 있으면 선생님께 보여 줄 문장을 돌려줘요.
export function checkSetup({ rows, cols, blocked, fixed, students }) {
  const total = rows * cols, usable = total - blocked.size;
  const ids = new Set(students.map(s => s.id));
  const fixedIds = [...fixed.values()];
  if (!students.length) return '학생이 없어요.';
  if (students.length > usable) return `학생 ${students.length}명보다 앉을 자리(${usable}자리)가 적어요. 줄을 늘리거나 빈자리를 줄여 주세요.`;
  for (const [seat, id] of fixed) {
    if (seat >= total) return '교실 밖의 고정 자리가 있어요. 자리 설정을 다시 확인해 주세요.';
    if (blocked.has(seat)) return '빈자리로 둔 곳에 고정한 학생이 있어요.';
    if (!ids.has(id)) return `고정한 ${id}번 학생이 명단에 없어요.`;
  }
  if (new Set(fixedIds).size !== fixedIds.length) return '한 학생을 두 자리에 고정했어요.';
  return '';
}

// 결과: 자리 번호 → 학생 id (빈자리·남는 자리는 null)
export function drawSeats({ rows, cols, blocked = new Set(), fixed = new Map(), students }, rand = cryptoRandom) {
  const problem = checkSetup({ rows, cols, blocked, fixed, students });
  if (problem) throw new Error(problem);
  const seats = Array(rows * cols).fill(null);
  for (const [seat, id] of fixed) seats[seat] = id;
  const fixedIds = new Set(fixed.values());
  const rest = shuffle(students.map(s => s.id).filter(id => !fixedIds.has(id)), rand);
  let k = 0;
  for (let seat = 0; seat < seats.length && k < rest.length; seat++) {
    if (blocked.has(seat) || seats[seat] !== null) continue;
    seats[seat] = rest[k++];
  }
  return seats;
}
