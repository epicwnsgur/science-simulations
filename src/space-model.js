// 별과 우주 단원의 과학 계산(교과서 276–295쪽, 지도서 610–667쪽). 화면에는 계산식을 보여 주지 않아요.
// 지도상 유의점: 별까지의 거리는 수식을 도입하지 않고 연주 시차와 등급의 개념을 중심으로 다루며,
// 별의 표면 온도는 색으로 비교하는 수준만 다뤄요(적색 편이·허블 법칙·가속 팽창은 다루지 않아요).
// 여기 계산은 그림과 숫자가 실제와 맞도록 뒤에서만 쓰여요.

export const LY_PER_PC = 3.26;          // 1 pc ≈ 3.26 광년(교과서 279쪽)
export const MAG_STEP = 2.512;          // 1등급 차이 ≈ 2.5배(교과서 280쪽), 5등급 차이 = 100배

/* ---------- 연주 시차 ---------- */
// 연주 시차(″): 1 pc 떨어진 별의 연주 시차가 1″이고, 거리가 멀수록 작아져요.
export const parallaxArcsec = pc => 1 / pc;
// 지구에서 연주 시차를 측정해 거리를 알 수 있는 별: 약 100 pc보다 가까운 별(교과서 279쪽)
export const parallaxMeasurable = pc => pc < 100;
// 시차(도): 두 관측 지점 사이 거리 base와 물체까지의 거리 d가 이루는 각(같은 단위)
export const parallaxDeg = (base, d) => 2 * Math.atan(base / 2 / d) * 180 / Math.PI;

/* ---------- 밝기와 등급 ---------- */
// 빛의 세기는 거리의 제곱에 반비례: 거리가 2배·3배가 되면 1/4·1/9배(교과서 282쪽)
export const intensityAt = (i0, d0, d) => i0 * (d0 / d) ** 2;
// 두 별의 밝기 비(m1 별이 m2 별보다 몇 배 밝은가)
export const brightnessRatio = (m1, m2) => MAG_STEP ** (m2 - m1);
// 거리 pc에 있는 절대 등급 M인 별의 겉보기 등급(뒤에서만 써요)
export const apparentMag = (M, pc) => M + 5 * Math.log10(pc / 10);
// 겉보기 등급과 절대 등급을 비교해 10 pc보다 가까운지 먼지(교과서 283쪽)
export const compareTo10pc = (m, M) => (Math.abs(m - M) < 0.05 ? 'same' : m < M ? 'nearer' : 'farther');

/* ---------- 표면 온도와 색 ---------- */
// 색지수(B−V) → 표면 온도(K), Ballesteros(2012)
export const bvToKelvin = bv => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
export const kelvinToCelsius = k => k - 273.15;
// CIE 1931 등색 함수(Wyman, Sloan, Shirley 2013의 가우스 합 근사), 파장 nm
const g = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
const cmf = l => [
  1.056 * g(l, 599.8, 37.9, 31) + 0.362 * g(l, 442, 16, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
  0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
  1.217 * g(l, 437, 11.8, 36) + 0.681 * g(l, 459, 26, 13.8),
];
// 흑체(별, 뜨거운 열선)가 내는 빛의 세기(플랑크 법칙), 파장 nm, 온도 K
export const planck = (nm, T) => { const l = nm * 1e-9; return 1 / (l ** 5 * (Math.exp(0.0143877735 / (l * T)) - 1)); };
const gammaEncode = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
// 온도 T(K)인 물체가 내는 빛의 색(sRGB 0~1). 가장 밝은 성분이 1이 되게 맞춰요(밝기는 따로 다뤄요).
export function blackbodyRGB(T) {
  let X = 0, Y = 0, Z = 0;
  for (let nm = 380; nm <= 780; nm += 5) { const p = planck(nm, T), [x, y, z] = cmf(nm); X += p * x; Y += p * y; Z += p * z; }
  const lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
  const pos = lin.map(v => Math.max(0, v)), max = Math.max(...pos) || 1;
  return pos.map(v => gammaEncode(v / max));
}
export const rgbCss = ([r, gg, b], a = 1) => `rgba(${Math.round(r * 255)},${Math.round(gg * 255)},${Math.round(b * 255)},${a})`;
// 교과서 285쪽의 별의 색 7단계(청색 → 적색)와 대략의 표면 온도 경계(℃, 지도서 639쪽 분광형 표를 어림).
// 경계는 교과서의 예(태양 약 6000 ℃ 황색, 프로키온 황백색, 시리우스·베가 백색, 리겔 청백색)와 맞도록 정했어요. 화면에 경계 숫자는 보여 주지 않아요.
export const COLOR_CLASSES = [
  { id: 'blue', name: '청색', min: 29700 },
  { id: 'blue-white', name: '청백색', min: 10000 },
  { id: 'white', name: '백색', min: 7200 },
  { id: 'yellow-white', name: '황백색', min: 6100 },
  { id: 'yellow', name: '황색', min: 4600 },
  { id: 'orange', name: '주황색', min: 3400 },
  { id: 'red', name: '적색', min: -Infinity },
];
export const colorClassOf = celsius => COLOR_CLASSES.find(c => celsius >= c.min);
// 화면용 색: 실제 흑체의 색은 아주 옅어서, 교과서 그림처럼 색이 잘 구별되도록 채도를 높여요(색의 순서는 그대로예요).
export function starDisplayRGB(T, boost = 1.9) {
  const c = blackbodyRGB(T), mean = (c[0] + c[1] + c[2]) / 3;
  const s = c.map(v => Math.min(1, Math.max(0, mean + (v - mean) * boost)));
  const max = Math.max(...s) || 1;
  return s.map(v => v / max);
}

// 교과서 그림처럼 별의 색 7단계가 뚜렷이 구별되는 화면용 색(표면 온도 ℃ → sRGB 0~1).
// 실제 흑체의 색 순서(높은 온도 파랑 → 낮은 온도 빨강)는 그대로 지키고, 색 단계 사이는 부드럽게 이어요.
const PALETTE = [[40000, '#6f8cff'], [22000, '#9fb8ff'], [11000, '#d6e1ff'], [8000, '#f7f6ff'], [6600, '#fff3d4'], [5500, '#ffe07a'], [4300, '#ffad55'], [3500, '#ff7a45'], [2500, '#e8452c']];
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
export function starPaletteRGB(celsius) {
  const t = Math.max(2500, Math.min(40000, celsius));
  for (let i = 1; i < PALETTE.length; i++) {
    const [t0, c0] = PALETTE[i - 1], [t1, c1] = PALETTE[i];
    if (t >= t1) { const k = Math.log(t0 / t) / Math.log(t0 / t1), a = hex(c0), b = hex(c1); return a.map((v, j) => v + (b[j] - v) * k); }
  }
  return hex(PALETTE.at(-1)[1]);
}
