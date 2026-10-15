// 자기장 모형 (교과서 258–259쪽, 지도서 584–589쪽). 화면 좌표(y는 아래쪽이 +)를 쓰는 2차원 근사입니다.
// 지도상 유의점: 전류의 세기와 방향에 따른 자기장의 세기와 방향을 정성적으로 확인합니다.
// 나침반 바늘은 지구 자기장과 코일(자석)의 자기장이 합쳐진 방향을 가리킵니다(지도서 587쪽 오개념).

export const EARTH = Object.freeze({ x: 0, y: -0.0009 }); // 화면 위쪽을 북쪽으로 둡니다.

// 코일을 위에서 본 모습: 판을 뚫고 지나는 두 도선. 위쪽 도선은 판 위로(+), 아래쪽 도선은 판 아래로(−) 전류가 흘러요.
// direction이 −1이면 전류의 방향이 반대예요. strength는 전류의 세기(상대값).
export function coilField(p, coil, strength, direction = 1) {
  if (!strength) return { x: 0, y: 0 };
  let bx = 0, by = 0;
  for (const [wy, sign] of [[coil.y - coil.r, 1], [coil.y + coil.r, -1]]) {
    const dx = p.x - coil.x, dy = p.y - wy, r2 = Math.max(dx * dx + dy * dy, 60);
    const I = sign * direction * strength;
    // 판에서 나오는 전류 둘레의 자기장(화면 좌표에서 시계 반대 방향으로 보이도록 부호를 맞춤).
    bx += I * dy / r2; by += -I * dx / r2;
  }
  return { x: bx * .6, y: by * .6 };
}

// 막대자석: 양 끝면에 나누어 놓은 자극으로 근사합니다. N극에서 나와 S극으로 들어가는 모양이에요.
export function magnetField(p, magnet) {
  let bx = 0, by = 0;
  for (const [x, q] of [[magnet.x - magnet.half, 1], [magnet.x + magnet.half, -1]]) {
    for (const oy of [-10, 0, 10]) {
      const dx = p.x - x, dy = p.y - (magnet.y + oy), r2 = Math.max(dx * dx + dy * dy, 80);
      bx += q * dx / r2; by += q * dy / r2;
    }
  }
  return { x: bx * .2, y: by * .2 };
}

export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
// 나침반 N극이 가리키는 화면 각도(도). 0°는 화면 위쪽(북쪽), 시계 방향이 +.
export const needleDeg = b => Math.atan2(b.x, -b.y) * 180 / Math.PI;

// 자기장의 모습을 그리기 위한 선 따라가기(정규화한 방향으로 일정한 간격 이동).
export function trace(field, start, { step = 6, max = 400, stop = () => false, bounds = { x0: 0, y0: 0, x1: 800, y1: 440 }, closeTo = null } = {}) {
  const pts = [start]; let p = start;
  for (let i = 0; i < max; i++) {
    const dir = q => { const b = field(q), m = Math.hypot(b.x, b.y) || 1; return { x: b.x / m, y: b.y / m }; };
    const k1 = dir(p), mid = { x: p.x + k1.x * step / 2, y: p.y + k1.y * step / 2 }, k2 = dir(mid);
    p = { x: p.x + k2.x * step, y: p.y + k2.y * step };
    pts.push(p);
    if (p.x < bounds.x0 || p.x > bounds.x1 || p.y < bounds.y0 || p.y > bounds.y1 || stop(p)) break;
    if (closeTo && i > 12 && Math.hypot(p.x - closeTo.x, p.y - closeTo.y) < step * 1.2) { pts.push(closeTo); break; }
  }
  return pts;
}
export const toPath = pts => 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L');
