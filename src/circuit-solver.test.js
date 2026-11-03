import test from 'node:test';
import assert from 'node:assert/strict';
import { solveCircuit, solveWithBurnout, ampText, voltText } from './circuit-solver.js';

// 자유 회로 실험실의 계산이 중학교 과학의 법칙(옴의 법칙, 직렬·병렬연결, 전류계·전압계 연결)과 맞는지 확인해요.
// 점 이름은 아무 글자나 돼요. 전지는 flip이 없으면 b가 (+)극이에요.
let n = 0;
const P = (type, a, b, more = {}) => ({ id: `${type}${++n}`, type, a, b, ...more });
const near = (x, y, tol = .002) => assert.ok(Math.abs(x - y) <= tol, `${x} ≈ ${y}`);
const get = (s, p) => s.results.get(p.id);

test('건전지 1개 + 전구 1개: 1.5 V, 150 mA(옴의 법칙: 1.5 V ÷ 10 Ω), 전류계는 직렬, 전압계는 병렬', () => {
  const cell = P('cell', 'n0', 'n1'), am = P('ammeter', 'n1', 'n2'), bulb = P('bulb', 'n2', 'n3'), w = P('wire', 'n3', 'n0'), vm = P('voltmeter', 'n2', 'n3');
  const s = solveCircuit([cell, am, bulb, w, vm]);
  near(get(s, am).reading, .15, .001);
  near(get(s, vm).reading, 1.5, .005);
  near(get(s, bulb).brightness, .25, .01); // 알맞은 밝기(3 V)의 1/4: 어둡지만 켜져요
  assert.equal(ampText(get(s, am).reading), '150 mA');
  assert.equal(voltText(get(s, vm).reading), '1.50 V');
  assert.deepEqual(s.shorted, []);
});

test('건전지 2개를 직렬로: 3 V, 전구가 알맞게 켜짐. 한 전지를 거꾸로 넣으면 전압이 0', () => {
  const c1 = P('cell', 'a', 'b'), c2 = P('cell', 'b', 'c'), bulb = P('bulb', 'c', 'a'), vm = P('voltmeter', 'c', 'a');
  const s = solveCircuit([c1, c2, bulb, vm]);
  near(get(s, vm).reading, 3, .005); near(get(s, bulb).brightness, 1, .01);
  const s2 = solveCircuit([c1, { ...c2, flip: true }, bulb, vm]);
  near(get(s2, vm).reading, 0, .001); near(get(s2, bulb).brightness, 0, .001);
});

test('같은 전구 2개: 직렬은 전류 1/2·전구마다 전압 1/2, 병렬은 전구마다 전압 그대로·전체 전류 2배', () => {
  const c = () => [P('cell', 'a', 'b'), P('cell', 'b', 'c')]; // 3 V
  // 직렬
  const [s1, s2] = c(), b1 = P('bulb', 'c', 'd'), b2 = P('bulb', 'd', 'e'), am = P('ammeter', 'e', 'a');
  const ser = solveCircuit([s1, s2, b1, b2, am]);
  near(get(ser, am).reading, .15, .001);
  near(get(ser, b1).voltage, 1.5, .005); near(get(ser, b1).brightness, get(ser, b2).brightness, 1e-6);
  // 병렬
  const [p1, p2] = c(), q1 = P('bulb', 'c', 'd'), q2 = P('bulb', 'c', 'd'), am2 = P('ammeter', 'd', 'a');
  const par = solveCircuit([p1, p2, q1, q2, am2]);
  near(get(par, am2).reading, .6, .002);
  near(get(par, q1).voltage, 3, .005); near(get(par, q1).brightness, 1, .01);
});

test('열린 스위치: 전류가 흐르지 않음. 닫으면 흐름', () => {
  const cell = P('cell', 'a', 'b'), sw = P('switch', 'b', 'c', { on: false }), bulb = P('bulb', 'c', 'a');
  near(get(solveCircuit([cell, sw, bulb]), bulb).brightness, 0, 1e-6);
  near(get(solveCircuit([cell, { ...sw, on: true }, bulb]), bulb).brightness, .25, .01);
});

test('잘못된 연결: 전류계를 전지에 바로 이으면 합선, 전압계를 직렬로 이으면 전구가 켜지지 않고 전압계는 전지 전압을 가리킴', () => {
  const cell = P('cell', 'a', 'b'), am = P('ammeter', 'b', 'a');
  const s = solveCircuit([cell, am]);
  assert.deepEqual(s.shorted, [cell.id]);
  assert.ok(get(s, am).reading > 3);
  const c2 = P('cell', 'a', 'b'), vm = P('voltmeter', 'b', 'c'), bulb = P('bulb', 'c', 'a');
  const t = solveCircuit([c2, vm, bulb]);
  near(get(t, bulb).brightness, 0, 1e-6);
  near(get(t, vm).reading, 1.5, .005);
});

test('전류계·전압계의 (+)·(−)단자를 거꾸로 이으면 값이 음수(바늘이 거꾸로)', () => {
  const cell = P('cell', 'a', 'b'), am = P('ammeter', 'b', 'c', { flip: true }), bulb = P('bulb', 'c', 'a'), vm = P('voltmeter', 'c', 'a', { flip: true });
  const s = solveCircuit([cell, am, bulb, vm]);
  assert.ok(get(s, am).reading < 0); assert.ok(get(s, vm).reading < 0);
});

test('저항: 전압이 같으면 저항이 클수록 전류가 작음(5 Ω 300 mA, 10 Ω 150 mA, 20 Ω 75 mA)', () => {
  for (const [ohm, mA] of [[5, 300], [10, 150], [20, 75]]) {
    const cell = P('cell', 'a', 'b'), r = P('resistor', 'b', 'c', { ohm }), am = P('ammeter', 'c', 'a');
    near(get(solveCircuit([cell, r, am]), am).reading * 1000, mA, .5);
  }
});

test('전구에 건전지 4개(6 V)를 이으면 필라멘트가 끊어지고, 끊어진 전구로는 전류가 흐르지 않음', () => {
  const cells = ['a', 'b', 'c', 'd', 'e'].slice(0, 4).map((x, i, arr) => P('cell', x, i < 3 ? arr[i + 1] : 'e'));
  const bulb = P('bulb', 'e', 'a'), am = P('ammeter', 'a', 'a2');
  const s = solveWithBurnout([...cells, P('bulb', 'e', 'a2'), am].map(p => (p.type === 'bulb' ? { ...p, id: bulb.id } : p)));
  assert.deepEqual(s.burnt, [bulb.id]);
  near(get(s, am).reading, 0, 1e-4);
  // 건전지 3개(4.5 V)는 아주 밝지만 끊어지지는 않아요.
  const three = cells.slice(0, 3);
  const s3 = solveWithBurnout([...three, P('bulb', 'd', 'a')]);
  assert.deepEqual(s3.burnt, []);
});

test('아무 데도 이어지지 않은 부품도 계산이 멈추지 않음', () => {
  const s = solveCircuit([P('bulb', 'x', 'y'), P('wire', 'p', 'q')]);
  for (const r of s.results.values()) assert.ok(Number.isFinite(r.current));
});

test('저항의 연결 비교 막대: 전구 1개 대비 직렬은 전체 저항 커짐·전체 전류 1/2·전구 전압 1/2, 병렬은 전체 저항 작아짐·전체 전류 2배·전구 전압 같음', async () => {
  const { solve, compareValues } = await import('./circuit-model.js');
  const on = { S1: true, S2: true };
  const one = compareValues(solve('single', { S1: true })), ser = compareValues(solve('series', on)), par = compareValues(solve('parallel', on));
  assert.deepEqual([one.r, one.i, one.v], [1, 1, 1]);
  assert.ok(ser.r > 1 && ser.i < 1 && Math.abs(ser.v - .5) < 1e-9);
  assert.ok(par.r < 1 && par.i > 1 && Math.abs(par.v - 1) < 1e-9);
  // 같은 법칙을 자유 회로 실험실의 계산과도 맞춰 봐요: 전구 1개 300 mA, 직렬 150 mA, 병렬 600 mA(전지 2개).
  for (const [k, mA] of [[one, 300], [ser, 150], [par, 600]]) near(k.i * 300, mA, 1e-9);
});
