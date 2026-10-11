export const BASE = 8;
export const LIMIT = 4;
export function charges(transferred) {
  const n = Math.max(0, Math.min(LIMIT, Math.trunc(transferred)));
  return { fur: { plus: BASE, minus: BASE - n }, balloon: { plus: BASE, minus: BASE + n } };
}
export function interaction(a, b) {
  if (!a || !b) return 'unmodeled';
  return a * b > 0 ? 'repel' : 'attract';
}
export function rubbingDistance(a, b, distance) {
  return Math.hypot(a.x - b.x, a.y - b.y) < 150 ? distance : 0;
}

// A small qualitative displacement, not a calculated force or levitation model.
export function attractionOffset(balloon, fur, transferred) {
  const dx = balloon.x - fur.x;
  const dy = balloon.y - fur.y;
  const separation = Math.hypot(dx, dy);
  if (!transferred || dy >= -45 || separation >= 260 || separation < 1) return { x: 0, y: 0 };
  const proximity = Math.min(1, (260 - separation) / 90);
  const lift = Math.min(1, (-dy - 45) / 65);
  return { x: dx / separation * 24 * proximity * lift, y: dy / separation * 24 * proximity * lift };
}
