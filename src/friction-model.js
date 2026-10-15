// 마찰 전기 모형 (교과서 236–237쪽, 지도서 540–543쪽).
// 마찰하면 한 물체에서 다른 물체로 전자만 이동하고, 원자핵은 이동하지 않습니다.
// 표시하는 전하 수와 문지른 횟수는 정량 관계를 뜻하지 않습니다.
export const BASE = 8;
export const MAX_TRANSFER = 6;

// 털과 풍선의 전하 수. 전자를 잃은 털은 (+), 전자를 얻은 풍선은 (−)전하를 띱니다.
export function charges(transferred) {
  const n = Math.max(0, Math.min(MAX_TRANSFER, Math.trunc(transferred)));
  return { fur: { plus: BASE, minus: BASE - n }, balloon: { plus: BASE, minus: BASE + n } };
}
export const netCharge = o => o.plus - o.minus;
export function chargeLabel(o) {
  const q = netCharge(o);
  return q === 0 ? '전기를 띠지 않음' : q > 0 ? '(+)전하를 띰' : '(−)전하를 띰';
}
// 두 대전체 사이의 전기력: 같은 종류의 전하는 척력, 다른 종류의 전하는 인력.
export function interaction(a, b) {
  if (!a || !b) return 'none';
  return a * b > 0 ? 'repel' : 'attract';
}

// 해 보기(236쪽): 장갑으로 플라스틱 숟가락 ㉮와 ㉯를 문지르면 두 숟가락은 같은 종류의 전하((−)),
// 장갑은 다른 종류의 전하((+))를 띱니다(238쪽 빨대와 장갑의 대전과 같은 방식).
export const SPOON_TOOLS = Object.freeze({
  spoon: { label: '숟가락 ㉯', sign: -1 },
  glove: { label: '장갑', sign: 1 },
});
export const SPOON_A_SIGN = -1;
