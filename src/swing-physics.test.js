import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swingDirection, swingAngle } from './force-model.js';
import { swingField, swingSegments, swingForces, swingSide, cross } from './swing-physics.js';

test('전기 그네 3D: 자기장은 아래쪽 N극에서 위쪽 S극으로(처음 상태), 극을 바꾸면 반대', () => {
  assert.deepEqual(swingField(1), [0, 1, 0]);
  assert.deepEqual(swingField(-1), [0, -1, 0]);
});

test('전기 그네 3D: F = IL×B로 구한 아래 변의 힘 방향이 2D 모형(처음 상태 바깥쪽 ㉮)과 같음', () => {
  for (const c of [1, -1]) for (const m of [1, -1]) assert.equal(swingSide(c, m), swingDirection(c, m), `${c}, ${m}`);
  const F = swingForces(1, 1)[1].F;
  assert.deepEqual(F.map(v => Math.round(v)), [-1, 0, 0]); // 바깥쪽(−x)
});

test('전기 그네 3D: 힘은 전류와 자기장 모두에 수직이고, 세로 변(자기장과 나란한 전류)은 힘을 받지 않음', () => {
  for (const c of [1, -1]) for (const m of [1, -1]) {
    const B = swingField(m);
    for (const seg of swingForces(c, m)) {
      const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
      assert.equal(dot(seg.F, seg.I), 0); assert.equal(dot(seg.F, B), 0);
      if (!seg.inField) assert.deepEqual(cross(seg.I, B).map(Math.abs), [0, 0, 0]);
    }
  }
});

test('전기 그네 3D: 전류는 코일을 따라 한 줄로 흐름(먼 쪽 변 ↓ → 아래 변 → 가까운 쪽 변 ↑)', () => {
  const [far, bottom, near] = swingSegments(1);
  assert.deepEqual([far.I[1], bottom.I[2], near.I[1]], [-1, 1, 1]);
  assert.deepEqual(swingSegments(-1).map(s => s.I.map(v => -v || 0)), swingSegments(1).map(s => s.I.map(v => v || 0)));
});

test('전기 그네 3D: 전압이 클수록 많이 움직이고, 전류가 없으면 움직이지 않음', () => {
  assert.ok(Math.abs(swingAngle(1, 1, 5)) > Math.abs(swingAngle(1, 1, 3)));
  assert.ok(Math.abs(swingAngle(1, 1, 3)) > Math.abs(swingAngle(1, 1, 1)));
  assert.equal(swingAngle(1, 1, 5, false), 0);
});
