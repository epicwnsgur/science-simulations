import test from 'node:test';
import assert from 'node:assert/strict';
import { spoonElectrons, spoonCounts, spoonShift, electroscopeLayout, electroscopeCounts, leafTransfer, leafAngle, scopeCharge, closeness, segmentDistance, SPOON_SITES, PLATE_SITES, LEAF_SITES } from './induction-model.js';

test('대전체가 없으면 숟가락의 전하는 고르게 나뉘어 전기를 띠지 않음', () => {
  const c = spoonCounts(0);
  assert.deepEqual(c.near, { plus: 4, minus: 4 });
  assert.deepEqual(c.far, { plus: 4, minus: 4 });
});

test('(−)대전체는 전자를 먼 쪽으로, (+)대전체는 가까운 쪽으로 이동시킴', () => {
  const minus = spoonCounts(spoonShift(-4, 1));
  assert.ok(minus.near.minus < minus.near.plus, '가까운 쪽은 (+)전하가 많음');
  assert.ok(minus.far.minus > minus.far.plus, '먼 쪽은 (−)전하가 많음');
  const plus = spoonCounts(spoonShift(4, 1));
  assert.ok(plus.near.minus > plus.near.plus, '가까운 쪽은 (−)전하가 많음');
  assert.ok(plus.far.minus < plus.far.plus, '먼 쪽은 (+)전하가 많음');
});

test('정전기 유도 후에도 가까운 쪽과 먼 쪽에 두 종류의 전하가 모두 남음', () => {
  for (const q of [-4, 4]) {
    const c = spoonCounts(spoonShift(q, 1));
    for (const side of [c.near, c.far]) { assert.ok(side.plus > 0); assert.ok(side.minus > 0); }
    assert.equal(c.near.minus + c.far.minus, SPOON_SITES, '전자 수는 보존됨');
  }
});

test('전자는 숟가락 안에서만 움직이고, 대전되지 않은 물체는 전자를 옮기지 않음', () => {
  for (const shift of [-1, 0, 1]) for (const e of spoonElectrons(shift)) assert.ok(e.u >= 0 && e.u <= 1);
  assert.equal(spoonShift(0, 1), 0);
  assert.equal(spoonShift(-4, 0), 0, '멀리 있으면 영향 없음');
});

test('검전기: (−)대전체는 금속판의 전자를 금속박으로, (+)대전체는 금속박의 전자를 금속판으로 옮김', () => {
  const minus = electroscopeCounts(-5, 1);
  assert.ok(minus.plate.minus < minus.plate.plus, '금속판은 대전체와 다른 (+)');
  assert.ok(minus.left.minus > minus.left.plus && minus.right.minus > minus.right.plus, '두 금속박은 같은 (−)');
  const plus = electroscopeCounts(5, 1);
  assert.ok(plus.plate.minus > plus.plate.plus, '금속판은 대전체와 다른 (−)');
  assert.ok(plus.left.minus < plus.left.plus && plus.right.minus < plus.right.plus, '두 금속박은 같은 (+)');
  for (const c of [minus, plus]) {
    assert.equal(c.plate.minus + c.left.minus + c.right.minus, PLATE_SITES + 2 * LEAF_SITES, '전자 수 보존');
    for (const part of [c.plate, c.left, c.right]) assert.ok(part.minus > 0, '전자가 모두 빠져나가지 않음');
  }
});

test('대전된 전하의 양이 많고 가까울수록 금속박이 더 많이 벌어짐', () => {
  const none = leafAngle(leafTransfer(scopeCharge('straw', 0), 1));
  const few = leafAngle(leafTransfer(scopeCharge('straw', 1), 1));
  const many = leafAngle(leafTransfer(scopeCharge('straw', 2), 1));
  assert.ok(none < few && few < many);
  assert.ok(leafTransfer(-5, .2) <= leafTransfer(-5, 1));
  assert.equal(leafTransfer(-5, 0), 0);
});

test('물체와 문지른 정도에 따른 대전 상태', () => {
  assert.equal(scopeCharge('straw', 0), 0);
  assert.ok(scopeCharge('straw', 2) < 0);
  assert.ok(scopeCharge('balloon', 1) < 0);
  assert.ok(scopeCharge('glove', 1) > 0);
});

test('전자 배치 자리가 겹치지 않음', () => {
  for (const q of [-5, -2, 0, 2, 5]) {
    const keys = electroscopeLayout(q, 1).map(e => `${e.part}:${e.slot}`);
    assert.equal(new Set(keys).size, keys.length);
  }
});

test('거리 계산 도우미', () => {
  assert.equal(closeness(10, 10, 110), 1);
  assert.equal(closeness(200, 10, 110), 0);
  assert.equal(segmentDistance({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 3);
  assert.equal(segmentDistance({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 }), 5);
});
