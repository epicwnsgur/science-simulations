// 전기 그네 3D 화면의 과학 계산(교과서 260–261쪽). 코일의 각 부분이 받는 힘을 F = I L × B로 직접 구해요.
// 좌표: x는 오른쪽(㉯ 안쪽, 말굽자석의 굽은 쪽), y는 위쪽, z는 보는 사람 쪽. 그네는 z축과 나란한 막대에 매달려 x 방향으로 움직여요.
// src/swing-physics.test.js가 이 계산이 2D 그림의 모형(src/force-model.js의 swingDirection)과 같은지 확인해요.
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// 말굽자석: magnet > 0이면 위쪽 팔이 S극, 아래쪽 팔이 N극이라 두 팔 사이의 자기장은 위(+y)를 향해요(N극 → S극).
export const swingField = magnet => [0, Math.sign(magnet), 0];
// 코일의 세 변: 먼 쪽 세로 변(z < 0), 아래 변(두 팔 사이를 지나요), 가까운 쪽 세로 변(z > 0).
// current > 0이면 전류가 먼 쪽 변을 따라 내려와 아래 변에서 보는 사람 쪽(+z)으로 흐르고, 가까운 쪽 변으로 올라가요.
export function swingSegments(current) {
  const s = Math.sign(current);
  return [
    { name: 'far', I: [0, -s, 0], inField: false },
    { name: 'bottom', I: [0, 0, s], inField: true },
    { name: 'near', I: [0, s, 0], inField: false },
  ];
}
// 각 변이 받는 힘. 자기장은 두 팔 사이에만 있어서 아래 변만 힘을 받아요(세로 변은 자기장과 나란해서 힘이 0이에요).
export function swingForces(current, magnet) {
  const B = swingField(magnet);
  return swingSegments(current).map(seg => ({ ...seg, F: seg.inField ? cross(seg.I, B) : [0, 0, 0] }));
}
// 그네가 움직이는 쪽: +1 = 바깥쪽(㉮, −x), −1 = 안쪽(㉯, +x)
export const swingSide = (current, magnet) => -Math.sign(swingForces(current, magnet)[1].F[0]);
