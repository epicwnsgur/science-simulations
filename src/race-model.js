// 레이싱 번호 뽑기(교사용 자료)의 계산: 순위 정하기, 기록 만들기, 달리는 모양(진행률).
// 순위는 번호를 고르게 섞어서(Fisher–Yates) 정해요. 난수는 브라우저의 crypto.getRandomValues를 써요.
// 기록은 0.01초 단위로 모두 다르고, 가장 느린 차도 15초(COURSE_SECONDS) 안에 들어와요.
export const MIN_RACERS = 2;
export const MAX_RACERS = 100;
export const COURSE_SECONDS = 15;
// 1등 기록이 될 수 있는 가장 빠른 값(0.01초 단위). 너무 빨리 끝나면 경주를 볼 틈이 없어요.
const FASTEST_CS = 950;
const SLOWEST_CS = COURSE_SECONDS * 100;

export function cryptoRandom() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export const clampRacers = n => Math.min(MAX_RACERS, Math.max(MIN_RACERS, Math.round(Number(n)) || MIN_RACERS));

// 기록 글자: 9.84초 → ‘09초 84’
export function formatRecord(seconds) {
  const cs = Math.max(0, Math.round(seconds * 100));
  return `${String(Math.floor(cs / 100)).padStart(2, '0')}초 ${String(cs % 100).padStart(2, '0')}`;
}

export function shuffle(list, rand = cryptoRandom) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 서로 다른 기록 n개(0.01초 단위)를 빠른 것부터.
function pickRecords(n, rand) {
  const picked = new Set();
  while (picked.size < n) picked.add(FASTEST_CS + Math.floor(rand() * (SLOWEST_CS - FASTEST_CS + 1)));
  return [...picked].sort((a, b) => a - b);
}

// 경주 계획: 1번부터 n번까지 차가 출발 그리드에 번호 순서로 서고, 순위·기록·달리는 모양이 정해져요.
export function planRace(n, rand = cryptoRandom) {
  n = clampRacers(n);
  const order = shuffle(Array.from({ length: n }, (_, i) => i + 1), rand);
  const records = pickRecords(n, rand);
  const racers = order.map((number, i) => ({
    number, rank: i + 1, time: records[i] / 100,
    // 달리는 도중의 앞서거니 뒤서거니: 출발·결승 지점은 그대로 두고 가운데만 흔들어요.
    wiggle: [0.06, 0.02, 0.01].map(a => (rand() * 2 - 1) * a),
    // 옆으로 움직이는 모양
    sway: { a: 0.25 + rand() * 0.35, w: 0.6 + rand() * 1.1, p: rand() * Math.PI * 2, w2: 1.7 + rand() * 1.5, p2: rand() * Math.PI * 2 },
  }));
  return { count: n, racers, byNumber: [...racers].sort((a, b) => a.number - b.number) };
}

// 출발 가속: 처음에는 0에서 빨라지고 곧 거의 일정한 빠르기로 달려요. launch(0)=0, launch(1)=1.
const A = 0.07;
const NORM = 1 - A * (1 - Math.exp(-1 / A));
const launch = v => (v - A * (1 - Math.exp(-v / A))) / NORM;

// 진행률(0→1): u는 ‘지난 시간 ÷ 그 차의 기록’. 늘 앞으로만 가고(되돌아가지 않음) u=1에서 꼭 1이 돼요.
export function progress(u, wiggle = [0, 0, 0]) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  let v = u;
  wiggle.forEach((c, k) => { v += c * Math.sin((k + 1) * Math.PI * u); });
  return launch(Math.min(1, Math.max(0, v)));
}

// 결승 뒤에는 천천히 멈춰요: 지난 시간 x초 동안 더 가는 거리(결승 빠르기 v로 시작해 tau초 동안 줄어들어요).
export const coast = (x, v, tau = 1.2) => v * tau * (1 - Math.exp(-x / tau));
