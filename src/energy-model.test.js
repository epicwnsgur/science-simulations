import test from 'node:test';
import assert from 'node:assert/strict';
import { APPLIANCES, ENERGY, isPowerOrder, classify, wattHours, FRIDGES } from './energy-model.js';

// 전기 에너지의 이용(electric-energy.js): 소비 전력 순서, 에너지 전환, 전력량, 효율 등급의 규칙을 확인해요.
test('전기 기구 카드: 소비 전력이 모두 달라 순서가 하나로 정해지고, 큰 것부터 늘어놓아야 맞음', () => {
  const watts = APPLIANCES.map(a => a.watt);
  assert.equal(new Set(watts).size, watts.length);
  const right = [...APPLIANCES].sort((a, b) => b.watt - a.watt).map(a => a.id);
  assert.equal(isPowerOrder(right).ok, true);
  assert.equal(isPowerOrder([...right].reverse()).ok, false);
  assert.equal(isPowerOrder(right.slice(0, 5)).ok, false, '모두 늘어놓아야 해요');
});

test('에너지 전환: 교과서의 예(주전자·전열기=열, 텔레비전=빛+소리, 충전=화학, 헤드폰=소리, 선풍기·믹서=운동)', () => {
  const main = id => APPLIANCES.find(a => a.id === id).main.slice().sort();
  assert.deepEqual(main('kettle'), ['heat']);
  assert.deepEqual(main('heater'), ['heat']);
  assert.deepEqual(main('tv'), ['light', 'sound']);
  assert.deepEqual(main('phone'), ['chemical']);
  assert.deepEqual(main('headphone'), ['sound']);
  assert.deepEqual(main('fan'), ['motion']);
  assert.deepEqual(main('blender'), ['motion']);
  for (const a of APPLIANCES) for (const e of [...a.main, ...(a.also ?? [])]) assert.ok(ENERGY.some(v => v.id === e), `${a.id}: ${e}`);
});

test('에너지 칸에 놓기: 주로 바뀌는 에너지만 맞고, 열·함께 나는 소리는 ‘조금 나오지만 주로는 아님’, 나머지는 틀림', () => {
  const get = id => APPLIANCES.find(a => a.id === id);
  assert.equal(classify(get('tv'), 'light'), 'main');
  assert.equal(classify(get('tv'), 'sound'), 'main');
  assert.equal(classify(get('tv'), 'motion'), 'wrong');
  assert.equal(classify(get('fan'), 'heat'), 'minor');
  assert.equal(classify(get('vacuum'), 'sound'), 'minor');
  assert.equal(classify(get('fan'), 'chemical'), 'wrong');
  assert.equal(classify(get('aircon'), 'heat'), 'minor');
  for (const a of APPLIANCES) assert.ok(a.use && a.use.startsWith(a.name.replace(' 충전', '')), `${a.id}: 무엇을 하는 기구인지`);
});

test('전력량: 소비 전력 × 시간(1 W를 1시간 = 1 Wh), 같은 시간이면 소비 전력이 큰 기구가 더 많이 씀', () => {
  assert.equal(wattHours(1, 1), 1);
  assert.equal(wattHours(1800, 1), 1800);
  assert.ok(wattHours(1800, 0.5) > wattHours(40, 0.5));
  assert.equal(wattHours(40, 2), 80, '시간이 2배면 2배');
});

test('효율 등급: 크기와 성능이 같으면 1등급이 한 달 동안 가장 적게 씀', () => {
  const sorted = [...FRIDGES].sort((a, b) => a.grade - b.grade).map(f => f.kwh);
  assert.deepEqual(sorted, [...sorted].sort((a, b) => a - b));
  assert.ok(FRIDGES.some(f => f.grade === 1) && FRIDGES.some(f => f.grade === 5));
});
