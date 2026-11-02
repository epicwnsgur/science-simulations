import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStudents, checkSetup, drawSeats } from './seat-model.js';

function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

test('학생 목록: 이름이 없으면 번호, 있으면 한 줄에 한 명', () => {
  assert.deepEqual(makeStudents(3).map(s => s.id), [1, 2, 3]);
  assert.deepEqual(makeStudents(30, '김하늘\n\n 이바다 \n'), [{ id: 1, name: '김하늘' }, { id: 2, name: '이바다' }]);
});

test('모든 학생이 한 번씩 앉고, 빈자리는 비고, 고정 자리는 그대로', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const blocked = new Set([0, 7]), fixed = new Map([[1, 12], [29, 3]]);
    const seats = drawSeats({ rows: 5, cols: 6, blocked, fixed, students: makeStudents(26) }, seeded(seed));
    assert.equal(seats.length, 30);
    assert.equal(seats[0], null); assert.equal(seats[7], null);
    assert.equal(seats[1], 12); assert.equal(seats[29], 3);
    assert.deepEqual(seats.filter(Boolean).sort((a, b) => a - b), Array.from({ length: 26 }, (_, i) => i + 1));
  }
});

test('학생보다 자리가 많으면 남는 자리는 뒤쪽에 생김', () => {
  const seats = drawSeats({ rows: 4, cols: 5, students: makeStudents(17) }, seeded(3));
  assert.deepEqual(seats.slice(17), [null, null, null]);
  assert.ok(seats.slice(0, 17).every(Boolean));
});

test('자리에 앉는 학생이 한쪽에 몰리지 않음(맨 앞 왼쪽 자리)', () => {
  const rand = seeded(2026), counts = Array(6).fill(0);
  for (let i = 0; i < 12000; i++) counts[drawSeats({ rows: 2, cols: 3, students: makeStudents(6) }, rand)[0] - 1]++;
  for (const c of counts) assert.ok(Math.abs(c - 2000) < 200, `${counts}`);
});

test('설정이 맞지 않으면 까닭을 알려 줌', () => {
  const base = { rows: 2, cols: 2, blocked: new Set(), fixed: new Map(), students: makeStudents(4) };
  assert.equal(checkSetup(base), '');
  assert.match(checkSetup({ ...base, students: makeStudents(5) }), /자리\(4자리\)가 적어요/);
  assert.match(checkSetup({ ...base, blocked: new Set([0]), fixed: new Map([[0, 1]]) }), /빈자리/);
  assert.match(checkSetup({ ...base, fixed: new Map([[0, 9]]) }), /9번 학생이 명단에 없어요/);
  assert.match(checkSetup({ ...base, fixed: new Map([[0, 1], [1, 1]]) }), /두 자리/);
  assert.throws(() => drawSeats({ ...base, students: makeStudents(5) }), /적어요/);
});
