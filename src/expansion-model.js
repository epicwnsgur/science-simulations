// 풍선 모형으로 알아보는 우주 팽창(교과서 294–295쪽). 화면에는 수식을 보여 주지 않아요.
// 풍선 표면 = 우주, 표면이 늘어남 = 우주 팽창, 붙임딱지 = 은하. 붙임딱지(은하)는 커지지 않고, 사이의 거리만 멀어져요.
export const CM_PER_UNIT = 5;                    // 그림 1 단위 = 5 cm
export const RADII = { flat: .95, little: 1.6, much: 2.6 };   // 바람 빠진 풍선, 조금 불었을 때(약 8 cm), 많이 불었을 때(약 13 cm)
// 붙임딱지의 자리(풍선 표면 위의 방향: 위도·경도, 도). 앞쪽(+z)에서 보이게 붙였어요.
export const STICKERS = [
  { id: 1, lat: 18, lon: -24 },
  { id: 2, lat: 40, lon: 14 },
  { id: 3, lat: -8, lon: 26 },
];
const D = Math.PI / 180;
export const dirOf = ({ lat, lon }) => [Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D), Math.cos(lat * D) * Math.cos(lon * D)];
export const angleBetween = (a, b) => { const u = dirOf(a), v = dirOf(b); return Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))); };
// 풍선 표면을 따라 잰 두 붙임딱지 사이의 거리(cm, 소수 첫째 자리)
export const surfaceCm = (radius, a, b) => Math.round(radius * angleBetween(a, b) * CM_PER_UNIT * 10) / 10;
export const PAIRS = [[0, 1], [0, 2], [1, 2]];

/* ---------- 중심이 있을까? (2차원 우주 지도) ---------- */
// 은하들의 처음 자리(우주 지도 위, 단위 없음). 어느 은하를 기준으로 보아도 다른 은하들이 멀어져요.
export function galaxyField(n = 22, seed = 4) {
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const pts = [];
  const cols = 6, rows = 4;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (pts.length >= n) break;
    pts.push({ x: (i - (cols - 1) / 2) * 1 + (r() - .5) * .55, y: (j - (rows - 1) / 2) * 1 + (r() - .5) * .55, img: 1 + (pts.length % 14), size: .62 + r() * .3, rot: r() * 360 });
  }
  return pts;
}
// 기준 은하 ref에서 본 은하 g의 자리(우주가 a배로 늘어났을 때)
export const seenFrom = (ref, g, a) => ({ x: (g.x - ref.x) * a, y: (g.y - ref.y) * a });
export const BIG_BANG_YEARS = '약 138억 년 전';
