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
