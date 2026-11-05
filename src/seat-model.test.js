import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStudents, checkSetup, drawSeats, parseNumbers, makeLayout, isTeacherCell, seatOrder, growLayout } from './seat-model.js';

function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

test('학생 목록: 이름이 없으면 번호, 있으면 한 줄에 한 명', () => {
  assert.deepEqual(makeStudents(3).map(s => s.id), [1, 2, 3]);
  assert.deepEqual(makeStudents(30, '김하늘\n\n 이바다 \n'), [{ id: 1, name: '김하늘' }, { id: 2, name: '이바다' }]);
});

test('모든 학생이 한 번씩 앉고, 빈자리는 비고, 고정 자리는 그대로', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const blocked = new Set([0, 7]), fixed = new Map([[1, 12], [29, 3]]);
    const seats = drawSeats({ total: 30, blocked, fixed, students: makeStudents(26) }, seeded(seed));
    assert.equal(seats.length, 30);
    assert.equal(seats[0], null); assert.equal(seats[7], null);
    assert.equal(seats[1], 12); assert.equal(seats[29], 3);
    assert.deepEqual(seats.filter(Boolean).sort((a, b) => a - b), Array.from({ length: 26 }, (_, i) => i + 1));
  }
});

test('학생보다 자리가 많으면 남는 자리는 뒤쪽에 생김', () => {
  const seats = drawSeats({ total: 20, students: makeStudents(17) }, seeded(3));
  assert.deepEqual(seats.slice(17), [null, null, null]);
  assert.ok(seats.slice(0, 17).every(Boolean));
});

test('자리에 앉는 학생이 한쪽에 몰리지 않음(맨 앞 왼쪽 자리)', () => {
  const rand = seeded(2026), counts = Array(6).fill(0);
  for (let i = 0; i < 12000; i++) counts[drawSeats({ total: 6, students: makeStudents(6) }, rand)[0] - 1]++;
  for (const c of counts) assert.ok(Math.abs(c - 2000) < 200, `${counts}`);
});

test('설정이 맞지 않으면 까닭을 알려 줌', () => {
  const base = { total: 4, blocked: new Set(), fixed: new Map(), students: makeStudents(4) };
  assert.equal(checkSetup(base), '');
  assert.match(checkSetup({ ...base, students: makeStudents(5) }), /자리\(4자리\)가 적어요/);
  assert.match(checkSetup({ ...base, blocked: new Set([0]), fixed: new Map([[0, 1]]) }), /막은 자리/);
  assert.match(checkSetup({ ...base, fixed: new Map([[0, 9]]) }), /9번 학생이 명단에 없어요/);
  assert.match(checkSetup({ ...base, fixed: new Map([[0, 1], [1, 1]]) }), /두 자리/);
  assert.throws(() => drawSeats({ ...base, students: makeStudents(5) }), /적어요/);
});

test('제외할 번호 읽기: 쉼표·띄어쓰기·범위', () => {
  assert.deepEqual(parseNumbers('3, 17 21'), { ids: [3, 17, 21], error: '' });
  assert.deepEqual(parseNumbers('5-7,5~6 , 2'), { ids: [2, 5, 6, 7], error: '' });
  assert.deepEqual(parseNumbers(''), { ids: [], error: '' });
  assert.match(parseNumbers('3번').error, /숫자로/);
});

test('제외한 번호는 막은 자리에만 무작위로 앉고, 나머지는 보통 자리에', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const blocked = new Set([0, 9, 29]), excluded = new Set([3, 17]);
    const seats = drawSeats({ total: 30, blocked, students: makeStudents(29), excluded }, seeded(seed));
    const inBlocked = [0, 9, 29].map(i => seats[i]).filter(Boolean).sort((a, b) => a - b);
    assert.deepEqual(inBlocked, [3, 17]);
    seats.forEach((id, i) => { if (!blocked.has(i) && id) assert.ok(!excluded.has(id)); });
    assert.deepEqual(seats.filter(Boolean).sort((a, b) => a - b), Array.from({ length: 29 }, (_, i) => i + 1));
    seen.add([0, 9, 29].map(i => seats[i] ?? 0).join());
  }
  assert.ok(seen.size >= 4, '막은 자리 안에서도 무작위로 바뀌어야 해요');
});

test('제외한 번호를 앉히지 않기로 하면 아무 자리에도 없음', () => {
  const seats = drawSeats({ total: 30, blocked: new Set([0]), students: makeStudents(30), excluded: new Set([4, 5]), seatExcluded: false }, seeded(9));
  assert.equal(seats[0], null);
  assert.ok(!seats.includes(4) && !seats.includes(5));
  assert.equal(seats.filter(Boolean).length, 28);
});

test('제외 번호 설정 오류를 알려 줌', () => {
  const base = { total: 6, blocked: new Set([0]), fixed: new Map(), students: makeStudents(5) };
  assert.match(checkSetup({ ...base, excluded: new Set([9]) }), /9번 학생이 명단에 없어요/);
  assert.match(checkSetup({ ...base, excluded: new Set([1, 2]) }), /막은 자리\(1자리\)가 적어요/);
  assert.equal(checkSetup({ ...base, excluded: new Set([1, 2]), seatExcluded: false }), '');
  assert.match(checkSetup({ ...base, fixed: new Map([[2, 3]]), excluded: new Set([3]) }), /함께 있어요/);
});

test('기본 배치: 짝이면 두 자리마다 통로, 교탁 줄은 비어 있고 둘레에 빈칸', () => {
  const L = makeLayout(5, 6, true);
  assert.equal(L.seats.length, 30);
  assert.deepEqual([L.w, L.h], [10, 7]);
  assert.deepEqual([...new Set(L.seats.map(s => s.c))].sort((a, b) => a - b), [1, 2, 4, 5, 7, 8]);
  assert.ok(L.seats.every(s => s.r >= 1 && s.r <= 5 && !isTeacherCell(L, s.r, s.c)));
  assert.ok(isTeacherCell(L, 0, L.tc) && isTeacherCell(L, 0, L.tc + 1) && !isTeacherCell(L, 1, L.tc));
  assert.deepEqual(seatOrder([{ r: 2, c: 1 }, { r: 0, c: 5 }, { r: 2, c: 0 }]), [{ r: 0, c: 5 }, { r: 2, c: 0 }, { r: 2, c: 1 }]);
});

test('가장자리에 자리를 놓으면 판이 늘어나 옆·뒤에 빈칸이 남음', () => {
  const L = makeLayout(2, 2, false);
  L.seats.push({ r: 0, c: 0 }, { r: L.h - 1, c: L.w - 1 });
  const tc = L.tc, w = L.w, h = L.h;
  growLayout(L);
  assert.equal(L.tc, tc + 1);
  assert.equal(L.w, w + 2);
  assert.equal(L.h, h + 1);
  assert.ok(L.seats.every(s => s.c >= 1 && s.c <= L.w - 2 && s.r <= L.h - 2));
});
