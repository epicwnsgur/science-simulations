import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motorTorque, simpleMotorTorque, simpleMotorContact } from './force-model.js';
import { motorSides, motorAxisTorque, motorField, leftBrushSide, coilTurn, simpleAxisTorque, bareFacingDown, ringPoint } from './motor-physics.js';

const angles = Array.from({ length: 73 }, (_, i) => i * Math.PI / 36 + .013);

test('전동기 3D: 자기장은 N극에서 S극으로 향함', () => {
  assert.deepEqual(motorField(1), [-1, 0, 0]); // 오른쪽 N → 왼쪽 S
  assert.deepEqual(motorField(-1), [1, 0, 0]);
});

test('전동기 3D: 처음 상태에서 왼쪽 변은 ⊙(앞으로 나오는 전류)·아래로 힘, 오른쪽 변은 ⊗·위로 힘 (2D 그림과 같음)', () => {
  const [a, b] = motorSides(0, 1, 1);
  const left = a.pos[0] < 0 ? a : b, right = left === a ? b : a;
  assert.ok(left.I[2] > 0 && right.I[2] < 0);
  assert.ok(left.F[1] < 0 && right.F[1] > 0);
  assert.equal(Math.abs(left.F[0]) + Math.abs(left.F[2]), 0); // 힘은 전류와 자기장 모두에 수직(위아래)
});

test('전동기 3D: 두 변의 전류와 힘은 늘 서로 반대 방향', () => {
  for (const angle of angles) for (const c of [1, -1]) for (const m of [1, -1]) {
    const [a, b] = motorSides(angle, c, m);
    assert.equal(a.I[2], -b.I[2]);
    assert.equal(a.F[1], -b.F[1]);
  }
});

test('전동기 3D: F = IL×B로 직접 구한 돌림힘이 회전 모형(motorTorque)과 방향·크기 비율이 같음', () => {
  for (const angle of angles) for (const c of [1, -1]) for (const m of [1, -1]) {
    const fromForces = motorAxisTorque(angle, c, m), model = motorTorque(angle, c, m, 1);
    // 3D 회전 각도(−angle)는 돌림힘 방향으로 빨라져요: motor.js에서 omega += −torque·k → d(−angle)/dt가 +torque 쪽.
    assert.ok(Math.abs(fromForces - model * 2 * 1.1 * 2.4) < 1e-9, `angle ${angle}`);
  }
});

test('전동기 3D: 전류나 자석의 극을 바꾸면 회전 방향이 바뀌고, 둘 다 바꾸면 그대로', () => {
  for (const angle of angles) {
    const base = Math.sign(motorAxisTorque(angle, 1, 1));
    if (!base) continue;
    assert.equal(Math.sign(motorAxisTorque(angle, -1, 1)), -base);
    assert.equal(Math.sign(motorAxisTorque(angle, 1, -1)), -base);
    assert.equal(Math.sign(motorAxisTorque(angle, -1, -1)), base);
  }
});

test('전동기 3D: 정류자 덕분에 돌림힘 방향이 한 바퀴 내내 같고, 정류자가 없으면 반 바퀴마다 바뀜', () => {
  const signs = angles.map(a => Math.sign(motorAxisTorque(a, 1, 1))).filter(Boolean);
  assert.ok(signs.every(s => s === signs[0]));
  // 정류자 없이 변 A에 늘 같은 방향의 전류가 흐른다면: 돌림힘 ∝ cos(회전 각도)라 부호가 바뀌어요.
  const noCommutator = angles.map(a => Math.sign(Math.cos(coilTurn(a))));
  assert.ok(noCommutator.includes(1) && noCommutator.includes(-1));
});

test('전동기 3D: 왼쪽 브러시에 닿은 고리 반쪽은 늘 왼쪽에 있는 변과 이어짐(반 바퀴마다 바뀜)', () => {
  for (const angle of angles) {
    const sides = motorSides(angle, 1, 1);
    const left = sides.find(s => s.pos[0] < 0);
    assert.equal(leftBrushSide(angle), left.name);
  }
  assert.notEqual(leftBrushSide(.2), leftBrushSide(.2 + Math.PI));
});

test('간이 전동기 3D: 고리를 잘게 나누어 F = IΔL×B로 구한 돌림힘이 회전 모형과 같은 방향·비율', () => {
  const k = simpleAxisTorque(0, true, 1) / simpleMotorTorque(0, 'full', 1, 1);
  assert.ok(k > 0);
  for (const phase of angles) for (const m of [1, -1]) for (const strip of ['half', 'full']) {
    const contact = simpleMotorContact(phase, strip);
    const fromForces = simpleAxisTorque(phase, contact, m), model = simpleMotorTorque(phase, strip, m, 1);
    assert.ok(Math.abs(fromForces - k * model) < 1e-6, `phase ${phase} ${strip}`);
  }
});

test('간이 전동기 3D: 반만 벗긴 쪽이 받침대(아래)와 닿는 반 바퀴 동안만 전류가 흐르고, 그동안 돌림힘은 한 방향', () => {
  for (const phase of angles) {
    assert.equal(bareFacingDown(phase), simpleMotorContact(phase, 'half'));
    if (bareFacingDown(phase)) assert.ok(simpleAxisTorque(phase, true, 1) >= -1e-12);
  }
});

test('간이 전동기 3D: 고리는 축(x축)을 중심으로 돌고 반지름이 일정함', () => {
  for (const phase of angles) for (const u of [0, .1, .37, .5, .9]) {
    const p = ringPoint(u, phase);
    assert.ok(Math.abs(Math.hypot(...p) - .85) < 1e-12);
    assert.ok(Math.abs(p[0] - ringPoint(u, 0)[0]) < 1e-12); // 축 방향 좌표는 돌아도 그대로
  }
});
