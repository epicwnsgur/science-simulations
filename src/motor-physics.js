// 전동기 3D 장면의 과학 계산. 코일의 각 부분이 받는 힘을 F = I L × B(전류 × 자기장)로 직접 구해서
// 화살표를 그리고, src/force-model.js의 회전 모형과 방향이 맞는지 시험(src/motor-physics.test.js)으로 확인해요.
// 좌표: x는 오른쪽, y는 위쪽, z는 화면 앞쪽(보는 사람 쪽). 길이와 크기는 보기 쉽게 정한 상대값이에요.

export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/* ---------- 전동기의 원리(그림 Ⅶ-16) ----------
   회전축은 z축이고 자석은 x축 양쪽에 있어요. 축을 따라(앞에서) 보면 2D 그림과 같은 모습이에요.
   2D 그림의 angle은 화면 아래쪽이 +인 각도라서, 3D의 회전 각도는 −angle이에요. */
export const MOTOR = { radius: 1.1, length: 2.4 };

// 자기장은 N극에서 S극으로 향해요. magnet > 0이면 오른쪽이 N극, 왼쪽이 S극이에요.
export const motorField = magnet => [-Math.sign(magnet), 0, 0];
export const coilTurn = angle => -angle;

// 코일의 긴 두 변(A, B)의 위치·전류·힘. 금색 고리(정류자)와 브러시 덕분에
// 늘 왼쪽(x < 0)에 있는 변은 앞쪽(+z)으로, 오른쪽에 있는 변은 뒤쪽(−z)으로 전류가 흘러요(current > 0일 때).
export function motorSides(angle, current, magnet) {
  const t = coilTurn(angle), c = Math.cos(t), s = Math.sin(t), B = motorField(magnet);
  return [1, -1].map((k, i) => {
    const pos = [k * MOTOR.radius * c, k * MOTOR.radius * s, 0];
    const I = [0, 0, Math.sign(current) * (pos[0] < 0 ? 1 : -1)];
    const F = cross(I, B).map(v => v * MOTOR.length);
    return { name: i ? 'B' : 'A', pos, I, F };
  });
}
// 회전축(z축)에 대한 돌림힘: 두 변이 받는 힘으로 직접 구해요. + 이면 앞에서 볼 때 시계 반대 방향.
export function motorAxisTorque(angle, current, magnet) {
  return motorSides(angle, current, magnet).reduce((sum, { pos, F }) => sum + cross(pos, F)[2], 0);
}
// 왼쪽 브러시(전지의 − 쪽)에 닿아 있는 고리 반쪽은 어느 변과 이어져 있을까요? 왼쪽에 있는 변이에요.
export const leftBrushSide = angle => (Math.cos(coilTurn(angle)) < 0 ? 'A' : 'B');

/* ---------- 간이 전동기(264쪽) ----------
   코일 고리의 양 끝이 x축 방향의 축이 되고, 자석은 코일 아래 건전지 위에 있어요.
   phase = 0이면 코일 면이 정면(+z)을 향하고, 축을 중심으로 phase만큼 돌아요(오른손 법칙으로 +x 방향 회전). */
export const SIMPLE = { radius: .85, segments: 72 };
// magnet > 0: 자석의 N극이 위쪽이라 코일이 있는 곳의 자기장은 위(+y)를 향해요.
export const simpleField = magnet => [0, Math.sign(magnet), 0];
// 코일 고리 위의 점(코일에 붙은 좌표). 전류는 u가 커지는 방향으로 흘러요.
// 코일을 앞(+z)에서 보면 전류가 시계 방향으로 돌도록 건전지를 이었어요.
export function ringPoint(u, phase) {
  const a = -u * 2 * Math.PI, x = SIMPLE.radius * Math.cos(a), y0 = SIMPLE.radius * Math.sin(a);
  return [x, y0 * Math.cos(phase), y0 * Math.sin(phase)];
}
// 고리를 잘게 나누어 각 조각이 받는 힘 F = I ΔL × B를 더해 축(x축)에 대한 돌림힘을 구해요.
export function simpleAxisTorque(phase, contact, magnet) {
  if (!contact) return 0;
  const B = simpleField(magnet), n = SIMPLE.segments;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p0 = ringPoint(i / n, phase), p1 = ringPoint((i + 1) / n, phase);
    const mid = p0.map((v, k) => (v + p1[k]) / 2), dL = p1.map((v, k) => v - p0[k]);
    sum += cross(mid, cross(dL, B))[0];
  }
  return sum;
}
// 반만 벗긴 끝: 벗긴 쪽(구리)이 코일에 붙은 좌표에서 아래(−y)를 향해요. 받침대와 닿는 곳은 축의 아래쪽이에요.
export const bareFacingDown = phase => Math.cos(phase) > 0;
