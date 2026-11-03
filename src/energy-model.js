// 전기 에너지의 이용 실험의 자료와 규칙(electric-energy.js에서 써요).
// 소비 전력은 집에서 흔히 쓰는 제품의 대략적인 값이에요(제품마다 달라요). 카드 순서를 정하려고 서로 다른 값을 골랐어요.
// main: 주로 바뀌는 에너지(모두 골라야 맞아요), also: 함께 골라도 맞다고 보는 에너지. 열은 모든 기구에서 함께 골라도 돼요(쓰는 동안 조금씩 열이 나요).

export const ENERGY = [
  { id: 'light', name: '빛에너지', color: '#ffd23f' },
  { id: 'heat', name: '열에너지', color: '#ff7a5c' },
  { id: 'motion', name: '운동 에너지', color: '#5cc8ff' },
  { id: 'sound', name: '소리 에너지', color: '#c9a2ff' },
  { id: 'chemical', name: '화학 에너지', color: '#5dd39e' },
];

export const APPLIANCES = [
  { id: 'kettle', name: '전기 주전자', watt: 2000, main: ['heat'], meter: true },
  { id: 'aircon', name: '에어컨', watt: 1800, main: ['motion'], also: ['sound'], meter: true, note: '에어컨은 전동기로 압축기와 바람개비를 돌려 방 안의 열을 밖으로 옮겨요' },
  { id: 'dryer', name: '헤어드라이어', watt: 1500, main: ['heat', 'motion'], also: ['sound'] },
  { id: 'heater', name: '전열기', watt: 1000, main: ['heat'], also: ['light'], meter: true },
  { id: 'vacuum', name: '진공청소기', watt: 800, main: ['motion'], also: ['sound'] },
  { id: 'washer', name: '세탁기', watt: 500, main: ['motion'], also: ['sound'] },
  { id: 'blender', name: '믹서', watt: 300, main: ['motion'], also: ['sound'] },
  { id: 'tv', name: '텔레비전', watt: 100, main: ['light', 'sound'], meter: true },
  { id: 'fan', name: '선풍기', watt: 40, main: ['motion'], meter: true },
  { id: 'phone', name: '스마트폰 충전', watt: 15, main: ['chemical'], note: '충전하는 동안 전기 에너지가 배터리 속 화학 에너지로 바뀌어 저장돼요' },
  { id: 'led', name: 'LED 조명', watt: 10, main: ['light'], meter: true },
  { id: 'headphone', name: '헤드폰', watt: 1, main: ['sound'] },
];

// 소비 전력이 큰 것부터 늘어놓았는지 확인해요. wrong: 제자리가 아닌 카드.
export function isPowerOrder(order) {
  const right = [...APPLIANCES].sort((a, b) => b.watt - a.watt).map(a => a.id);
  const wrong = new Set(order.filter((id, i) => id !== right[i]));
  return { ok: order.length === right.length && wrong.size === 0, wrong };
}

// 고른 에너지가 맞는지 확인해요.
export function checkConversion(appliance, chosen) {
  const allowed = new Set([...appliance.main, ...(appliance.also ?? []), 'heat']);
  const missing = appliance.main.filter(id => !chosen.includes(id));
  const extra = chosen.filter(id => !allowed.has(id));
  if (extra.length) return { ok: false, message: `${appliance.name}에서 주로 바뀌는 에너지가 아닌 것이 섞여 있어요. 다시 골라 보세요.` };
  if (missing.length) return { ok: false, message: `${appliance.name}에서 주로 바뀌는 에너지가 더 있어요. 무엇이 빠졌을까요?` };
  return { ok: true, message: '' };
}

// 전력량(Wh) = 소비 전력(W) × 시간(h). 화면에서는 계산 대신 계량기 숫자로만 보여 줘요.
export const wattHours = (watt, hours) => watt * hours;

// 크기와 성능이 같은 냉장고 세 대(등급 비교를 위한 예시 값). 한 달 동안 쓴 전기 에너지(kWh).
export const FRIDGES = [
  { grade: 1, kwh: 28 },
  { grade: 3, kwh: 36 },
  { grade: 5, kwh: 45 },
];
// 전기 1 kWh를 만들 때 나오는 이산화 탄소(kg, 대략적인 값).
export const CO2_PER_KWH = 0.46;
