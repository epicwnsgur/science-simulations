// 전류가 만든 자기장 실험의 3차원 자기장 모형(교과서 258–259쪽, 지도서 584–589쪽).
// 코일은 판을 뚫고 세워져 있고, 나침반은 판 위에 놓여요. 2D 그림(위에서 본 모습)과 3D 화면이 같은 계산을 써요.
// 좌표: x는 동쪽(화면 오른쪽), y는 위쪽(판에서 위로), z는 남쪽(2D 그림의 아래쪽). 길이 1은 코일의 반지름이에요.
// 세기는 지구 자기장(수평 성분)을 1로 둔 상대값이고, 보기 쉽게 정한 모형이에요.

export const PX = Object.freeze({ x: 400, y: 230, unit: 58 }); // 2D 그림 좌표(px) ↔ 3D 좌표
export const toBoard = p => [(p.x - PX.x) / PX.unit, 0, (p.y - PX.y) / PX.unit];

export const EARTH3 = Object.freeze([0, 0, -1]); // 지구 자기장(수평 성분)은 북쪽(−z)을 향해요.
export const COIL3 = Object.freeze({ radius: 1, turns: 5, width: .36, segments: 48 });
export const MAGNET3 = Object.freeze({ half: 80 / 58, height: .3, thick: .55 });
const K_COIL = 1.6;   // 전류의 세기 1일 때 코일 가운데 자기장 ≈ 지구 자기장의 50배
const K_MAGNET = 9;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const addV = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// 코일 한 바퀴 위의 점. 코일 면은 x = 일정한 세로면(남북 방향)이고, 판(y = 0)이 코일 가운데를 지나요.
// direction > 0이면 북쪽에서 판을 뚫는 도선은 위로(+y), 남쪽 도선은 아래로(−y) 전류가 흘러요(2D 그림과 같아요).
export function coilPoint(t, x = 0) {
  return [x, COIL3.radius * Math.sin(t), -COIL3.radius * Math.cos(t)];
}
const turnX = i => (COIL3.turns === 1 ? 0 : -COIL3.width / 2 + COIL3.width * i / (COIL3.turns - 1));

// 비오-사바르 법칙: 도선 조각 dL이 만드는 자기장 ∝ I dL × r / r³. 코일을 잘게 나누어 더해요.
export function coilField3(p, strength = 1, direction = 1) {
  if (!strength) return [0, 0, 0];
  const n = COIL3.segments, I = strength * direction * K_COIL;
  let B = [0, 0, 0];
  for (let k = 0; k < COIL3.turns; k++) {
    const x = turnX(k);
    for (let i = 0; i < n; i++) {
      const a = coilPoint(2 * Math.PI * i / n, x), b = coilPoint(2 * Math.PI * (i + 1) / n, x);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], dL = sub(b, a), r = sub(p, mid);
      const r2 = Math.max(r[0] * r[0] + r[1] * r[1] + r[2] * r[2], .012), f = I / (r2 * Math.sqrt(r2));
      const c = cross(dL, r);
      B = [B[0] + c[0] * f, B[1] + c[1] * f, B[2] + c[2] * f];
    }
  }
  return B;
}

// 막대자석: 판 위에 눕혀 놓고 N극은 서쪽(왼쪽), S극은 동쪽(오른쪽). 양 끝면에 나누어 놓은 자극으로 근사해요.
// 자기장은 N극에서 나와 S극으로 들어가요.
const POLE_OFFSETS = [[0, 0], [.14, .14], [-.14, .14], [.14, -.14], [-.14, -.14]];
export function magnetField3(p) {
  let B = [0, 0, 0];
  for (const [x, q] of [[-MAGNET3.half, 1], [MAGNET3.half, -1]]) {
    for (const [dy, dz] of POLE_OFFSETS) {
      const r = sub(p, [x, MAGNET3.height + dy * .6, dz]);
      const r2 = Math.max(r[0] * r[0] + r[1] * r[1] + r[2] * r[2], .02), f = q * K_MAGNET / POLE_OFFSETS.length / (r2 * Math.sqrt(r2));
      B = [B[0] + r[0] * f, B[1] + r[1] * f, B[2] + r[2] * f];
    }
  }
  return B;
}

// 나침반은 판 위에 수평으로 놓여 있어서 자기장의 수평 성분(x, z)만 따라가요.
// 반환값: N극이 가리키는 각도(도). 0°는 북쪽, 동쪽으로 돌면 +(2D 그림의 needleDeg와 같은 기준).
export const needleDeg3 = B => Math.atan2(B[0], -B[2]) * 180 / Math.PI;

// 2D 그림(px 좌표)에서 쓰는 자기장: 판 위(나침반 높이)의 수평 성분이에요. 지구 자기장은 넣지 않아요.
export const NEEDLE_Y = .12;
export function boardField(source, p) {
  const [x, , z] = toBoard(p), B = source([x, NEEDLE_Y, z]);
  return { x: B[0], y: B[2] };
}

// 자기장의 모습을 그리는 선: 판과 같은 면(y = 0) 안에서 따라가요. 코일과 막대자석은 축을 중심으로 대칭이라
// 이 면 안의 자기장은 면을 벗어나지 않아요. 3D 화면에서는 이 선을 축 둘레로 돌려 여러 면에 그려요.
// 판의 테두리(2D 그림의 판과 같아요). 자기장의 모습은 판 위에서만 따라가요.
export const BOARD_BOUNDS = Object.freeze([(140 - PX.x) / PX.unit, (660 - PX.x) / PX.unit, (62 - PX.y) / PX.unit, (402 - PX.y) / PX.unit]);
export function traceBoard(source, start, { step = .07, max = 900, bounds = BOARD_BOUNDS, stop = () => false, closeTo = null } = {}) {
  const dir = q => { const B = source([q[0], 0, q[1]]), m = Math.hypot(B[0], B[2]) || 1; return [B[0] / m, B[2] / m]; };
  const pts = [start];
  let p = start;
  for (let i = 0; i < max; i++) {
    const k1 = dir(p), mid = [p[0] + k1[0] * step / 2, p[1] + k1[1] * step / 2], k2 = dir(mid);
    p = [p[0] + k2[0] * step, p[1] + k2[1] * step];
    pts.push(p);
    if (p[0] < bounds[0] || p[0] > bounds[1] || p[1] < bounds[2] || p[1] > bounds[3] || stop(p)) break;
    if (closeTo && i > 12 && Math.hypot(p[0] - closeTo[0], p[1] - closeTo[1]) < step * 1.2) { pts.push(closeTo); break; }
  }
  return pts;
}
// 2D 그림과 3D 화면이 함께 쓰는 ‘자기장 모습’ 선들(판 위 좌표 [x, z]의 목록). 한 번 구한 선은 기억해 두어요.
const lineCache = new Map();
export function fieldLines(kind, direction = 1) {
  const key = `${kind}:${kind === 'magnet' ? 1 : Math.sign(direction)}`;
  if (!lineCache.has(key)) lineCache.set(key, computeLines(kind, direction));
  return lineCache.get(key);
}
function computeLines(kind, direction) {
  const src = kind === 'magnet' ? magnetField3 : p => coilField3(p, 1, direction);
  const back = p => src(p).map(v => -v);
  const lines = [];
  if (kind === 'magnet') {
    const N = -MAGNET3.half, S = MAGNET3.half;
    for (let deg = 100; deg <= 260; deg += 20) {
      const a = deg * Math.PI / 180, start = [N + Math.cos(a) * .22, Math.sin(a) * .32];
      const fwd = traceBoard(src, start, { stop: p => Math.hypot((p[0] - S) / .25, p[1] / .35) < 1 });
      lines.push(fwd);
      const mirror = [-start[0], start[1]];
      lines.push(traceBoard(back, mirror, { stop: p => Math.hypot((p[0] - N) / .25, p[1] / .35) < 1 }).reverse());
    }
  } else {
    for (const f of [.12, .26, .38, .46, .54, .62, .74, .88]) {
      const start = [0, -1 + 2 * f];
      const fwd = traceBoard(src, start, { closeTo: start });
      const closed = Math.hypot(fwd.at(-1)[0] - start[0], fwd.at(-1)[1] - start[1]) < 1e-9;
      lines.push(closed ? fwd : [...traceBoard(back, start).reverse(), ...fwd.slice(1)]);
    }
  }
  return lines;
}
