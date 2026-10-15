// 정전기 유도 모형 (교과서 238–241쪽).
// 금속 내부에서 전자만 이동하고 원자핵은 제자리에 있습니다.
// 대전체는 금속 물체에 닿지 않습니다(지도상 유의점). 접지·접촉 대전·부도체의 분극은 다루지 않습니다.
// 모든 수치는 화면 표현용이며 측정값이나 정량 관계를 뜻하지 않습니다.

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 해 보기(쇠숟가락)에 쓰는 물체. 장갑은 빨대와 문질러 (+)전하를 띱니다.
export const SPOON_OBJECTS = Object.freeze({
  neutral: { label: '대전되지 않은 빨대', shape: 'straw', charge: 0 },
  straw: { label: '(−)전하를 띤 빨대', shape: 'straw', charge: -4 },
  glove: { label: '(+)전하를 띤 장갑', shape: 'glove', charge: 4 },
});

// 탐구(검전기)에 쓰는 물체와 문지른 정도. 털가죽과 문지른 빨대·풍선은 (−), 빨대와 문지른 장갑은 (+)입니다.
export const SCOPE_OBJECTS = Object.freeze({
  straw: { label: '플라스틱 빨대', shape: 'straw', sign: -1, partner: '털가죽' },
  balloon: { label: '풍선', shape: 'balloon', sign: -1, partner: '털가죽' },
  glove: { label: '장갑', shape: 'glove', sign: 1, partner: '빨대' },
});
export const RUB_LEVELS = Object.freeze([
  { id: 0, label: '문지르지 않음', amount: 0 },
  { id: 1, label: '2~3번 문지름', amount: 2 },
  { id: 2, label: '10번 이상 문지름', amount: 5 },
]);
export function scopeCharge(objectKey, rubLevel) {
  const object = SCOPE_OBJECTS[objectKey];
  const level = RUB_LEVELS[rubLevel] ?? RUB_LEVELS[0];
  return object ? object.sign * level.amount || 0 : 0;
}

// 대전체와 금속 사이 거리에 따른 가까운 정도(0~1). near 이하이면 1, far 이상이면 0.
export function closeness(distance, near, far) {
  return clamp((far - distance) / (far - near), 0, 1);
}

// 점 p와 선분 ab 사이의 최단 거리.
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  const t = len2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1) : 0;
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

/* ---------- 쇠숟가락 ---------- */

// 숟가락 축 위의 위치 u: 0은 추를 올린 머리 쪽, 1은 손잡이 끝.
export const SPOON_SITES = 8;
export function spoonNuclei() {
  return Array.from({ length: SPOON_SITES }, (_, i) => ({ id: `p${i}`, sign: 1, u: (i + .5) / SPOON_SITES }));
}
// 전자가 몰리는 정도 shift(−1~1). 양수면 손잡이 끝 쪽, 음수면 머리 쪽으로 몰립니다.
// 최대로 몰려도 가까운 쪽에 전자가 남도록 이동 범위를 제한합니다(오개념: 가까운 쪽에는 (+)전하만 있다).
export const MAX_SHIFT = .34;
export function spoonElectrons(shift) {
  const s = clamp(shift, -1, 1) * MAX_SHIFT;
  return spoonNuclei().map((p, i) => ({ id: `n${i}`, sign: -1, u: s >= 0 ? p.u * (1 - s) + s : p.u * (1 + s) }));
}
// 손잡이 끝 쪽 절반(대전체와 가까운 쪽)과 머리 쪽 절반의 전하 수.
export function spoonCounts(shift) {
  const electrons = spoonElectrons(shift);
  const near = { plus: SPOON_SITES / 2, minus: electrons.filter(e => e.u >= .5).length };
  const far = { plus: SPOON_SITES / 2, minus: electrons.filter(e => e.u < .5).length };
  return { near, far };
}
// 대전체의 전하와 가까운 정도로 전자 이동 방향을 정합니다.
// (−)대전체: 척력 → 전자가 먼 쪽으로. (+)대전체: 인력 → 전자가 가까운 쪽으로.
export function spoonShift(charge, near) {
  if (!charge) return 0;
  return clamp(Math.sign(charge) * clamp(Math.abs(charge) / 4, 0, 1) * near, -1, 1) || 0;
}

/* ---------- 검전기 ---------- */

export const PLATE_SITES = 6;
export const LEAF_SITES = 3;
export const MAX_LEAF_TRANSFER = 2;
// 금속박 한 장으로 옮겨 가거나(−대전체) 금속판으로 옮겨 가는(+대전체) 전자 수.
// 대전된 전하의 양이 많고 가까울수록 많아지지만, 금속판과 금속박에 전자가 남도록 제한합니다.
export function leafTransfer(charge, near) {
  if (!charge) return 0;
  return clamp(Math.round(Math.abs(charge) * near / 2), 0, MAX_LEAF_TRANSFER);
}
// 각 전자가 금속판(plate)·왼쪽 금속박(left)·오른쪽 금속박(right) 중 어디의 몇 번 자리에 있는지 정합니다.
export function electroscopeLayout(charge, near) {
  const m = leafTransfer(charge, near), sign = Math.sign(charge);
  const electrons = [];
  for (let i = 0; i < PLATE_SITES; i++) electrons.push({ id: `plate${i}`, part: 'plate', slot: i });
  for (const side of ['left', 'right']) for (let i = 0; i < LEAF_SITES; i++) electrons.push({ id: `${side}${i}`, part: side, slot: i });
  if (m && sign < 0) {
    // 금속판의 전자가 (−)대전체에게 밀려 금속 막대를 따라 금속박으로 이동합니다.
    const movers = [2, 3, 1, 4].slice(0, 2 * m);
    movers.forEach((plateSlot, k) => {
      const e = electrons.find(v => v.id === `plate${plateSlot}`);
      e.part = k % 2 ? 'right' : 'left';
      e.slot = LEAF_SITES + Math.floor(k / 2);
    });
  } else if (m && sign > 0) {
    // 금속박의 전자가 (+)대전체에게 끌려 금속판으로 이동합니다.
    let extra = PLATE_SITES;
    for (let k = 0; k < m; k++) for (const side of ['left', 'right']) {
      const e = electrons.find(v => v.id === `${side}${k}`);
      e.part = 'plate'; e.slot = extra++;
    }
  }
  return electrons;
}
export function electroscopeCounts(charge, near) {
  const layout = electroscopeLayout(charge, near);
  const count = part => layout.filter(e => e.part === part).length;
  return {
    plate: { plus: PLATE_SITES, minus: count('plate') },
    left: { plus: LEAF_SITES, minus: count('left') },
    right: { plus: LEAF_SITES, minus: count('right') },
    transfer: leafTransfer(charge, near),
  };
}
// 금속박 한 장이 수직선에서 벌어진 각도(도). 두 금속박이 같은 종류의 전하를 많이 띨수록 척력으로 더 벌어집니다.
export function leafAngle(transfer) {
  return 3 + 13 * clamp(transfer, 0, MAX_LEAF_TRANSFER);
}

export function chargeName(o) {
  return o.plus === o.minus ? '전기를 띠지 않음' : o.plus > o.minus ? '(+)전하를 띰' : '(−)전하를 띰';
}

export const smooth = t => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
