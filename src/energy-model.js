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

// use: 무엇을 하는 기구인지(틀리게 놓았을 때 떠올리게 하는 말). minor: 함께 조금 나오지만 ‘주로’ 바뀌는 에너지는 아닌 것.
export const APPLIANCES = [
  { id: 'kettle', name: '전기 주전자', watt: 2000, main: ['heat'], meter: true, use: '전기 주전자는 물을 뜨겁게 끓이는 기구예요.' },
  { id: 'aircon', name: '에어컨', watt: 1800, main: ['motion'], also: ['sound'], meter: true, use: '에어컨은 전동기로 압축기와 바람개비를 돌려요.', note: '에어컨은 전동기로 압축기와 바람개비를 돌려 방 안의 열을 밖으로 옮겨요', heatNote: '에어컨은 열을 만드는 기구가 아니라, 전동기를 돌려 방 안의 열을 밖으로 옮기는 기구예요.' },
  { id: 'dryer', name: '헤어드라이어', watt: 1500, main: ['heat', 'motion'], also: ['sound'], use: '헤어드라이어는 안쪽의 바람개비가 돌면서 뜨거운 바람을 내보내요.' },
  { id: 'heater', name: '전열기', watt: 1000, main: ['heat'], also: ['light'], meter: true, use: '전열기는 주변을 따뜻하게 하는 기구예요.' },
  { id: 'vacuum', name: '진공청소기', watt: 800, main: ['motion'], also: ['sound'], use: '진공청소기는 전동기로 바람개비를 돌려 먼지를 빨아들여요.' },
  { id: 'washer', name: '세탁기', watt: 500, main: ['motion'], also: ['sound'], use: '세탁기는 전동기로 빨래통을 돌려요.' },
  { id: 'blender', name: '믹서', watt: 300, main: ['motion'], also: ['sound'], use: '믹서는 칼날을 빠르게 돌려 음식을 갈아요.' },
  { id: 'tv', name: '텔레비전', watt: 100, main: ['light', 'sound'], meter: true, use: '텔레비전은 화면이 빛나고, 소리도 나요.' },
  { id: 'fan', name: '선풍기', watt: 40, main: ['motion'], meter: true, use: '선풍기는 날개를 돌려 바람을 만들어요.' },
  { id: 'phone', name: '스마트폰 충전', watt: 15, main: ['chemical'], use: '스마트폰을 충전하면 배터리에 에너지가 저장돼요.', note: '충전하는 동안 전기 에너지가 배터리 속 화학 에너지로 바뀌어 저장돼요' },
  { id: 'led', name: 'LED 조명', watt: 10, main: ['light'], meter: true, use: 'LED 조명은 방을 밝게 비춰요.' },
  { id: 'headphone', name: '헤드폰', watt: 1, main: ['sound'], use: '헤드폰은 귀에 소리를 들려줘요.' },
];

// 소비 전력이 큰 것부터 늘어놓았는지 확인해요. wrong: 제자리가 아닌 카드.
export function isPowerOrder(order) {
  const right = [...APPLIANCES].sort((a, b) => b.watt - a.watt).map(a => a.id);
  const wrong = new Set(order.filter((id, i) => id !== right[i]));
  return { ok: order.length === right.length && wrong.size === 0, wrong };
}

// 기구를 에너지 칸에 놓았을 때: main(주로 바뀌는 에너지), minor(조금 나오지만 주로 바뀌는 에너지는 아님), wrong.
// 대부분의 기구는 쓰는 동안 조금씩 따뜻해지므로 열은 main이 아니면 minor예요.
export function classify(appliance, energyId) {
  if (appliance.main.includes(energyId)) return 'main';
  if (energyId === 'heat' || appliance.also?.includes(energyId)) return 'minor';
  return 'wrong';
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
