// 연주 시차 실험의 모형(교과서 276–279쪽). 화면에는 계산식을 보여 주지 않고, 그림과 각도가 맞도록 뒤에서만 써요.

/* ---------- 탐구: 시차 측정 판(교과서 277쪽) ----------
   판 위의 좌표(cm): 두 구멍은 아래쪽 가운데에서 왼쪽·오른쪽으로 3 cm, 눈금(①~⑪)은 구멍에서 27 cm 떨어진 판 끝에 3 cm 간격.
   별 모형 (가)는 구멍에서 9 cm, (나)는 18 cm 떨어져 있어요. */
export const BOARD = {
  holes: { left: -3, right: 3 },
  scaleY: 27, scaleStart: -15, scaleStep: 3, marks: 11,
  models: { a: { x: 0, y: 9, name: '(가)' }, b: { x: -1, y: 18, name: '(나)' } },
};
// 구멍(hx)에서 별 모형을 지나는 시선이 눈금 줄에 닿는 곳(cm)
export const sightOnScale = (hx, { x, y }) => hx + (x - hx) * BOARD.scaleY / y;
// 눈금 번호(1~11). 눈금 사이면 소수로 나와요.
export const scaleNumber = xcm => (xcm - BOARD.scaleStart) / BOARD.scaleStep + 1;
export const circled = n => '①②③④⑤⑥⑦⑧⑨⑩⑪'[Math.round(n) - 1] ?? String(n);
// 별 모형에서 두 구멍을 잇는 두 선이 이루는 각(시차, 도)
export function boardParallax({ x, y }) {
  const a = Math.atan2(BOARD.holes.left - x, y), b = Math.atan2(BOARD.holes.right - x, y);
  return Math.abs(b - a) * 180 / Math.PI;
}

/* ---------- 연주 시차 모형(3D·2D 공통) ----------
   태양이 원점, 지구는 반지름 ORBIT_R인 궤도를 돌아요. A(오른쪽)에서 반년 뒤 B(왼쪽)로 가요(교과서 그림 VIII 2).
   별 X는 가깝게, 별 Y는 멀리 두었어요. 실제 별은 훨씬 멀어서 연주 시차가 1″보다 작지만, 보기 쉽게 아주 가깝게 나타냈어요. */
export const ORBIT_R = 3;
export const STAR_X = [-0.6, 0.35, -8];
export const STAR_Y = [1.0, -0.25, -17];
export const SKY_CENTER = { ra: 287, dec: 22, fov: 70 }; // 별 X·Y 뒤의 배경: 여름철 은하수(독수리자리·거문고자리 쪽)
// 공전 각 theta(라디안)일 때 지구의 위치. theta = 0이 A, π가 B(6개월 뒤)
export const earthAt = theta => [ORBIT_R * Math.cos(theta), 0, -ORBIT_R * Math.sin(theta)];
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
// 연주 시차(도): ∠AXB의 1/2
export function annualParallaxDeg(star) {
  const A = earthAt(0), B = earthAt(Math.PI);
  const a = norm(sub(A, star)), b = norm(sub(B, star));
  return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 90 / Math.PI;
}
// 하늘 공(반지름 R)에서 지구 E에서 별 S를 지나는 시선이 닿는 곳: 별이 배경의 어디에 보이는지
export function hitSky(E, S, R) {
  const d = norm(sub(S, E));
  const b = E[0] * d[0] + E[1] * d[1] + E[2] * d[2], c = E[0] ** 2 + E[1] ** 2 + E[2] ** 2 - R * R;
  const t = -b + Math.sqrt(b * b - c);
  return E.map((v, i) => v + d[i] * t);
}

/* ---------- 실제 별의 연주 시차(교과서 279쪽) ---------- */
// 연주 시차(″) = 1 / 거리(pc). 1 pc ≈ 3.26 광년. 100 pc보다 먼 별은 연주 시차가 너무 작아 재기 어려워요.
export const REAL_STARS = ['proxima', 'sirius', 'vega', 'megrez', 'polaris', 'betelgeuse'];
