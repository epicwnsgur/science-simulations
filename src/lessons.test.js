import test from 'node:test';
import assert from 'node:assert/strict';
import { charges, interaction, chargeLabel, MAX_TRANSFER, SPOON_TOOLS, SPOON_A_SIGN } from './friction-model.js';
import { currentMA, resistanceFrom, WIRES, materialCurrentMA, MATERIALS } from './ohm-model.js';
import { solve } from './circuit-model.js';
import { needleDeg, EARTH, add } from './magnet-model.js';
import { boardField, coilField3, magnetField3 } from './field3d.js';
import { swingDirection, swingAngle, motorTorque, simpleMotorTorque, simpleMotorContact } from './force-model.js';

test('마찰 전기: 전자만 이동하고 전하량은 보존됨', () => {
  for (let n = 0; n <= MAX_TRANSFER; n++) {
    const c = charges(n);
    assert.equal(c.fur.plus, c.balloon.plus, '원자핵 수는 그대로');
    assert.equal(c.fur.minus + c.balloon.minus, 16, '전자 수 보존');
  }
  assert.equal(chargeLabel(charges(3).fur), '(+)전하를 띰');
  assert.equal(chargeLabel(charges(3).balloon), '(−)전하를 띰');
  assert.equal(chargeLabel(charges(0).fur), '전기를 띠지 않음');
});
test('마찰 전기: 같은 전하는 척력, 다른 전하는 인력', () => {
  assert.equal(interaction(SPOON_A_SIGN, SPOON_TOOLS.spoon.sign), 'repel');
  assert.equal(interaction(SPOON_A_SIGN, SPOON_TOOLS.glove.sign), 'attract');
  assert.equal(interaction(0, 1), 'none');
});

test('옴의 법칙: 지도서 결과와 같은 값, 전압에 비례·저항에 반비례', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(v => currentMA(v, WIRES.long.resistance)), [0, 50, 100, 150, 200]);
  assert.deepEqual([0, 1, 2, 3, 4].map(v => currentMA(v, WIRES.short.resistance)), [0, 100, 200, 300, 400]);
  assert.equal(resistanceFrom(2, 100), 20);
  assert.equal(currentMA(3, 10, false), 0, '스위치가 열리면 전류 없음');
  for (const [k, m] of Object.entries(MATERIALS)) assert.equal(materialCurrentMA(k) > 0, m.conductor);
});

test('저항의 연결: 직렬은 어둡고 하나 끊으면 모두 꺼짐, 병렬은 같은 밝기이고 하나 끊어도 켜짐', () => {
  const one = solve('single', { S1: true });
  const series = solve('series', { S1: true, S2: true });
  const parallel = solve('parallel', { S1: true, S2: true });
  assert.ok(series.brightness.A < one.brightness.A && series.brightness.A === series.brightness.B, '직렬: 더 어둡고 두 전구 같음');
  assert.equal(parallel.brightness.A, one.brightness.A, '병렬: 전구 1개와 같은 밝기');
  assert.ok(series.total < one.total && parallel.total > one.total, '전체 전류: 직렬은 작고 병렬은 큼');
  assert.equal(solve('series', { S1: true, S2: false }).brightness.A, 0);
  const open = solve('parallel', { S1: true, S2: false });
  assert.equal(open.brightness.A, 1); assert.equal(open.brightness.B, 0);
});

test('자기장: 코일의 전류 방향을 바꾸면 자기장 방향이 반대, 세기가 커지면 자기장도 셈', () => {
  const p = { x: 580, y: 230 };
  const f = (s, d) => boardField(q => coilField3(q, s, d), p);
  const a = f(1, 1), b = f(1, -1), c = f(2, 1);
  assert.ok(Math.abs(a.x + b.x) < 1e-12 && Math.abs(a.y + b.y) < 1e-12);
  assert.ok(Math.hypot(c.x, c.y) > Math.hypot(a.x, a.y));
  assert.deepEqual(f(0, 1), { x: 0, y: 0 });
  assert.equal(Math.round(needleDeg(EARTH)), 0, '전류가 없으면 북쪽');
  // 막대자석: N극(왼쪽) 바깥에서는 자기장이 N극에서 나가는 방향(왼쪽)
  const m = boardField(magnetField3, { x: 250, y: 230 });
  assert.ok(m.x < 0);
  assert.ok(Math.abs(needleDeg(add(m, EARTH)) + 90) < 20);
});

test('전기 그네: 전류나 자석 중 하나를 바꾸면 반대, 둘 다 바꾸면 처음과 같음, 전압이 클수록 많이 움직임', () => {
  assert.equal(swingDirection(1, 1), 1);
  assert.equal(swingDirection(-1, 1), -1);
  assert.equal(swingDirection(1, -1), -1);
  assert.equal(swingDirection(-1, -1), 1);
  assert.ok(Math.abs(swingAngle(1, 1, 5)) > Math.abs(swingAngle(1, 1, 1)));
  assert.equal(swingAngle(1, 1, 5, false), 0);
});

test('전동기: 정류 덕분에 한 방향 돌림힘, 전류를 바꾸면 반대', () => {
  for (const a of [0, .7, 1.4, 2.5, 3.5, 5]) assert.ok(motorTorque(a, 1, 1, 3) >= 0);
  assert.ok(motorTorque(.3, -1, 1, 3) < 0);
  // 간이 전동기: 반만 벗기면 한 바퀴 평균 돌림힘이 한쪽으로, 완전히 벗기면 평균 0
  const avg = strip => { let s = 0; for (let i = 0; i < 360; i++) s += simpleMotorTorque(i * Math.PI / 180, strip, 1, 1); return s / 360; };
  assert.ok(avg('half') > .2);
  assert.ok(Math.abs(avg('full')) < 1e-9);
  assert.equal(simpleMotorContact(Math.PI, 'half'), false);
});
