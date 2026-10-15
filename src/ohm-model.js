// 옴의 법칙 탐구 모형 (교과서 244–247쪽, 지도서 558–565쪽).
// 지도서 활동 결과(561쪽)와 같은 값: 긴 니크롬선 1 V당 50 mA(20 Ω), 짧은 니크롬선 1 V당 100 mA(10 Ω).
export const WIRES = Object.freeze({
  long: { label: '긴 니크롬선', resistance: 20 },
  short: { label: '짧은 니크롬선', resistance: 10 },
});
export const VOLTAGES = [0, 1, 2, 3, 4];
export const MAX_VOLTAGE = 4;

// 전류의 세기(mA) = 전압(V) / 저항(Ω) × 1000. 스위치가 열려 있으면 전류가 흐르지 않습니다.
export function currentMA(voltage, resistance, closed = true) {
  if (!closed || !resistance) return 0;
  return Math.round(voltage / resistance * 1000);
}
export const resistanceFrom = (voltage, mA) => mA ? voltage / (mA / 1000) : Infinity;

// 도체·부도체 확인 활동(247쪽, 지도서 565쪽 대체 활동)의 물질. 전구 저항 10 Ω, 전압 3 V로 둡니다.
export const MATERIALS = Object.freeze({
  copper: { label: '구리선', conductor: true, color: '#d9884a' },
  clip: { label: '철 클립', conductor: true, color: '#b8c2cc' },
  foil: { label: '알루미늄 포일', conductor: true, color: '#e3e8ee' },
  rubber: { label: '고무줄', conductor: false, color: '#c9504a' },
  wood: { label: '나무 막대', conductor: false, color: '#a8784a' },
  plastic: { label: '플라스틱 자', conductor: false, color: '#5fb7d8' },
});
export const MATERIAL_VOLTAGE = 3, BULB_RESISTANCE = 10;
export function materialCurrentMA(key, closed = true) {
  const m = MATERIALS[key];
  return m?.conductor ? currentMA(MATERIAL_VOLTAGE, BULB_RESISTANCE, closed) : 0;
}

// 아날로그 계기 바늘 각도(도): 눈금 0이 −60°, 최대가 +60°.
export const needleAngle = (value, max) => -60 + 120 * Math.max(0, Math.min(1, value / max));
