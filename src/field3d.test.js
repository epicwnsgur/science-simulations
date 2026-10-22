import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COIL3, EARTH3, coilField3, magnetField3, coilPoint, needleDeg3, addV, fieldLines, boardField, MAGNET3, BOARD_BOUNDS } from './field3d.js';

const deg = v => Math.atan2(v[0], -v[2]) * 180 / Math.PI;
const unit = v => { const m = Math.hypot(...v); return v.map(x => x / m); };
const RING = [[400, 108], [400, 352], [236, 150], [220, 230], [236, 310], [564, 150], [580, 230], [564, 310]];
const toBoard = ([x, y]) => [(x - 400) / 58, .12, (y - 230) / 58];

test('전류가 만든 자기장 3D: 코일을 잘게 나눈 계산(비오-사바르)이 원형 코일의 공식과 맞음', () => {
  // 한 바퀴짜리 원형 도선의 축 위 자기장 ∝ 2πR²/(R² + x²)^(3/2). 감은 줄 5개를 더한 값과 비교해요.
  const per = x => 2 * Math.PI * COIL3.radius ** 2 / (COIL3.radius ** 2 + x * x) ** 1.5;
  const xs = Array.from({ length: COIL3.turns }, (_, k) => -COIL3.width / 2 + COIL3.width * k / (COIL3.turns - 1));
  for (const x of [0, .5, 1.5, 3]) {
    const exact = xs.reduce((s, t) => s + per(x - t), 0);
    const B = coilField3([x, 0, 0], 1, 1);
    assert.ok(Math.abs(B[0] / 1.6 - exact) / exact < .01, `x = ${x}`);
    assert.ok(Math.abs(B[1]) + Math.abs(B[2]) < 1e-9); // 축 위에서는 축 방향뿐
  }
});

test('전류가 만든 자기장 3D: 판을 뚫는 도선 둘레의 자기장은 오른손 법칙(전류가 위로 → 위에서 볼 때 시계 반대 방향)', () => {
  assert.deepEqual(coilPoint(0).map(v => Math.round(v * 1e9) / 1e9), [0, 0, -1]); // t = 0: 북쪽에서 판을 뚫는 곳
  const north = [0, 0, -1];
  for (const [dx, dz] of [[.25, 0], [0, -.25], [-.25, 0]]) {
    const r = [dx, 0, dz], B = coilField3(addV(north, r), 1, 1);
    // (r × B)의 y 성분 > 0이면 위에서 볼 때 시계 반대 방향이에요.
    assert.ok(r[2] * B[0] - r[0] * B[2] > 0, `${dx}, ${dz}`);
    const Br = coilField3(addV(north, r), 1, -1);
    assert.ok(r[2] * Br[0] - r[0] * Br[2] < 0);
  }
});

test('전류가 만든 자기장 3D: 코일 안과 축 위는 동쪽, 판을 뚫는 곳 바깥(코일 옆)은 서쪽 — 막대자석과 비슷한 모습', () => {
  assert.ok(coilField3([0, 0, 0], 1, 1)[0] > 0);
  assert.ok(coilField3([3, .12, 0], 1, 1)[0] > 0);
  assert.ok(coilField3([-3, .12, 0], 1, 1)[0] > 0);
  assert.ok(coilField3([0, .12, -2.1], 1, 1)[0] < 0);
  assert.ok(coilField3([0, .12, 2.1], 1, 1)[0] < 0);
  // 판(y = 0) 위의 자기장은 판과 나란해요(축 둘레로 대칭이라서).
  for (const p of [[1, 0, .5], [-2, 0, -1.4], [.3, 0, 2]]) assert.ok(Math.abs(coilField3(p, 1, 1)[1]) < 1e-9);
});

test('전류가 만든 자기장 3D: 전류의 방향을 바꾸면 자기장이 반대, 전류가 세면 자기장도 셈(비례)', () => {
  for (const [x, y] of RING) {
    const p = toBoard([x, y]), a = coilField3(p, 1, 1), b = coilField3(p, 1, -1), c = coilField3(p, 2, 1);
    a.forEach((v, i) => { assert.ok(Math.abs(v + b[i]) < 1e-12); assert.ok(Math.abs(c[i] - 2 * v) < 1e-9); });
  }
  assert.deepEqual(coilField3([1, 0, 0], 0, 1), [0, 0, 0]);
});

test('전류가 만든 자기장 3D: 전류가 없으면 나침반은 북쪽, 전류가 셀수록 바늘이 북쪽에서 더 많이 돌아감', () => {
  assert.equal(Math.round(needleDeg3(EARTH3)), 0);
  for (const [x, y] of RING) {
    const p = toBoard([x, y]);
    const turn = s => Math.abs(needleDeg3(addV(coilField3(p, s, 1), EARTH3)));
    assert.ok(turn(.4) < turn(.9) && turn(.9) < turn(1.8), `${x}, ${y}`);
  }
});

test('전류가 만든 자기장 3D: 막대자석은 N극에서 나와 S극으로 들어감', () => {
  const N = -MAGNET3.half, S = MAGNET3.half;
  assert.ok(magnetField3([N - .6, .12, 0])[0] < 0); // N극 바깥: 서쪽(N극에서 나가는 쪽)
  assert.ok(magnetField3([S + .6, .12, 0])[0] < 0); // S극 바깥: 서쪽(S극으로 들어가는 쪽)
  assert.ok(magnetField3([0, .12, -1.5])[0] > 0);   // 옆: N → S(동쪽)
  // 2D 그림과 같은 기준(px 좌표)
  assert.ok(boardField(magnetField3, { x: 250, y: 230 }).x < 0);
});

test('전류가 만든 자기장 3D: 코일의 자기장 모습 선은 판을 뚫는 도선 하나를 감싸 닫히고, 선의 방향이 자기장의 방향', () => {
  for (const dir of [1, -1]) {
    const lines = fieldLines('coil', dir);
    assert.equal(lines.length, 8);
    for (const pts of lines) {
      const closed = Math.hypot(pts.at(-1)[0] - pts[0][0], pts.at(-1)[1] - pts[0][1]) < 1e-6;
      // 한 도선(북쪽 z = −1 또는 남쪽 z = +1)만 감싸요: 선의 점들이 모두 같은 쪽(z < 0 또는 z > 0)에 있어요.
      const side = Math.sign(pts[0][1]);
      assert.ok(pts.every(p => Math.sign(p[1]) === side || Math.abs(p[1]) < 1e-6));
      for (let i = 0; i < pts.length - 1; i += 7) {
        const seg = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
        const B = coilField3([pts[i][0], 0, pts[i][1]], 1, dir);
        assert.ok(seg[0] * B[0] + seg[1] * B[2] > 0); // 선을 따라가는 방향 = 자기장의 방향
      }
      if (closed) assert.ok(pts.length > 20);
    }
  }
});

test('전류가 만든 자기장 3D: 막대자석의 자기장 모습 선은 N극 쪽에서 S극 쪽으로 향함', () => {
  for (const pts of fieldLines('magnet')) {
    // 선은 N극 근처(또는 판 가장자리)에서 시작해 S극 근처(또는 판 가장자리)에서 끝나요.
    const edge = p => p[0] < BOARD_BOUNDS[0] + .1 || p[0] > BOARD_BOUNDS[1] - .1 || p[1] < BOARD_BOUNDS[2] + .1 || p[1] > BOARD_BOUNDS[3] - .1;
    const near = (p, x) => Math.hypot(p[0] - x, p[1]) < .5;
    assert.ok(near(pts[0], -MAGNET3.half) || edge(pts[0]));
    assert.ok(near(pts.at(-1), MAGNET3.half) || edge(pts.at(-1)));
    assert.ok(near(pts[0], -MAGNET3.half) || near(pts.at(-1), MAGNET3.half));
    const i = Math.floor(pts.length / 2), seg = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
    const B = magnetField3([pts[i][0], 0, pts[i][1]]);
    assert.ok(seg[0] * B[0] + seg[1] * B[2] > 0);
  }
});

test('전류가 만든 자기장 3D: 2D 그림의 나침반 8개와 3D 계산이 가리키는 방향의 쪽(동·서)이 같음', () => {
  // 2D 그림이 예전에 쓰던 모형(판을 뚫는 두 도선)의 결과: 위쪽 줄(북)·아래쪽 줄(남)과 왼쪽·오른쪽 나침반이 도는 쪽
  const expected = [-1, -1, 1, 1, 1, 1, 1, 1];
  RING.forEach((p, i) => {
    const a = needleDeg3(addV(coilField3(toBoard(p), .9, 1), EARTH3));
    assert.equal(Math.sign(a), expected[i], `나침반 ${i}`);
  });
  assert.ok(Math.abs(deg(unit(coilField3([0, 0, 0], 1, 1))) - 90) < 1e-6);
});
