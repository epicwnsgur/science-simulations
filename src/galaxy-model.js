// 우리은하 모형(교과서 290–293쪽): 1 단위 = 1000 pc.
// 위에서 보면 중심부에 별이 밀집한 막대 모양이 있고, 그 둘레로 나선팔이 있어요. 옆에서 보면 중심부가 볼록한 원반 모양이에요.
// 지름은 약 30000 pc, 태양계는 중심에서 약 8500 pc 떨어진 나선팔에 있어요.
export const KPC = 1000;
export const RADIUS = 15;            // 반지름 15 단위 = 15000 pc → 지름 약 30000 pc
export const SUN_R = 8.5;            // 중심에서 태양계까지 약 8500 pc
export const BAR = { half: 4.2, angle: 0.47 };     // 중심부 막대: 반 길이와 기울기(라디안)
export const ARMS = { count: 4, r0: 4.2, pitch: 16 * Math.PI / 180 };   // 실제 우리은하보다 조금 덜 감기게 해서 팔이 잘 보여요
const B = Math.tan(ARMS.pitch);
// 나선팔 k의 중심선 위, 중심에서 r만큼 떨어진 점의 각(라디안). 팔은 막대 끝에서 시작해요.
export const armAngle = (k, r) => BAR.angle + k * Math.PI / 2 + Math.log(r / ARMS.r0) / B;
export const polar = (r, a) => [r * Math.cos(a), 0, r * Math.sin(a)];
// 태양계: 1번 나선팔 위, 중심에서 8500 pc
export const SUN_ARM = 1;
export const SUN_POS = polar(SUN_R, armAngle(SUN_ARM, SUN_R));

// 같은 결과가 나오는 난수(새로 고침해도 은하 모양이 같아요)
export function rng(seed = 7) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const gauss = rand => { const u = Math.max(1e-9, rand()), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// 은하를 이루는 별(점)들: [x, y, z, 종류]. 종류 0 중심부(늙은 별), 1 나선팔(젊은 별), 2 붉게 빛나는 성운(방출 성운), 3 원반, 4 티끌(암흑 성운)
export function galaxyPoints(scale = 1) {
  const rand = rng(11), pts = [];
  const n = v => Math.round(v * scale);
  // 볼록한 중심부(팽대부)
  for (let i = 0; i < n(4600); i++) pts.push([gauss(rand) * 1.05, gauss(rand) * .8, gauss(rand) * 1.05, 0]);
  // 막대
  for (let i = 0; i < n(6200); i++) {
    const t = (rand() * 2 - 1) * BAR.half * (.35 + .65 * Math.sqrt(rand())), w = gauss(rand) * .42, c = Math.cos(BAR.angle), s = Math.sin(BAR.angle);
    pts.push([t * c - w * s, gauss(rand) * .38, t * s + w * c, 0]);
  }
  // 나선팔: 바깥으로 갈수록 별이 줄어요.
  for (let k = 0; k < ARMS.count; k++) {
    const major = k % 2 === 0, count = n(major ? 6200 : 3000);
    for (let i = 0; i < count; i++) {
      const r = ARMS.r0 * Math.exp(Math.log(RADIUS * 1.05 / ARMS.r0) * Math.pow(rand(), .85));
      const a = armAngle(k, r), width = .3 + .035 * r, off = gauss(rand) * width;
      const x = (r + off) * Math.cos(a + gauss(rand) * .03), z = (r + off) * Math.sin(a + gauss(rand) * .03);
      const type = rand() < .055 ? 2 : 1;
      pts.push([x, gauss(rand) * (.1 + .012 * r), z, type]);
      // 팔의 안쪽 가장자리를 따라 티끌 띠
      if (rand() < .22) { const d = r - width * .9; pts.push([d * Math.cos(a), gauss(rand) * .07, d * Math.sin(a), 4]); }
    }
  }
  // 원반(나선팔 사이에도 별이 있어요)
  for (let i = 0; i < n(6000); i++) {
    const r = Math.min(RADIUS * 1.1, -3.4 * Math.log(1 - rand() * .985)), a = rand() * Math.PI * 2;
    pts.push([r * Math.cos(a), gauss(rand) * (.16 + .01 * r), r * Math.sin(a), 3]);
  }
  return pts;
}

/* ---------- 성단과 성운 분류(교과서 291–293쪽) ---------- */
export const KINDS = {
  open: { name: '산개 성단', feature: '수십~수만 개의 별이 엉성하게 모여 있고, 파란색을 띠는 고온의 별이 많아요.' },
  globular: { name: '구상 성단', feature: '수만~수십만 개의 별이 촘촘하게 공 모양으로 모여 있고, 붉은색을 띠는 저온의 별이 많아요.' },
  emission: { name: '방출 성운', feature: '성간 물질이 주변의 별빛을 흡수하여 온도가 높아져 스스로 빛을 내요.' },
  reflection: { name: '반사 성운', feature: '성간 물질이 주변의 별빛을 반사하여 밝게 보여요.' },
  dark: { name: '암흑 성운', feature: '성간 물질이 뒤에서 오는 별빛을 가로막아 어둡게 보여요.' },
};
// 분류할 사진: [사진 이름(src/space-photos.js), 정답 종류, 관찰 안내, 함께 인정하는 종류(사진에 두 가지가 함께 보일 때)]
export const CLASSIFY = [
  // 교과서 291–292쪽에 나온 천체를 먼저 살펴봐요.
  ['m45', 'open', '푸른 별들이 엉성하게 모여 있어요. 별 둘레의 푸른 빛은 티끌이 별빛을 반사한 것이에요.', ['reflection']],
  ['m80', 'globular', '수많은 별이 공 모양으로 아주 촘촘하게 모여 있어요.'],
  ['m42', 'emission', '가스 구름이 별빛을 흡수해 온도가 높아져 스스로 붉게 빛나요.'],
  ['m78', 'reflection', '티끌 구름이 가까운 별빛을 반사해 푸르스름하게 빛나요. 검은 줄무늬는 암흑 성운이에요.', ['dark']],
  ['horsehead', 'dark', '말머리 모양의 검은 구름이 뒤쪽의 붉은 빛을 가로막고 있어요. 뒤쪽 붉은 빛은 방출 성운이에요.', ['emission']],
  ['m7', 'open', '별들이 엉성하게 흩어져 모여 있어요. 파란 별이 많이 보여요.'],
  ['rosette', 'emission', '가스 구름이 붉은빛을 스스로 내고 있어요.'],
  ['iris', 'reflection', '별 주변의 구름이 별빛을 받아 푸르스름하게 빛나요.'],
  ['snake', 'dark', '뒤쪽의 별빛을 가로막아 검은 모양이 보여요.'],
  ['m13', 'globular', '가운데로 갈수록 별이 빽빽해지는 공 모양이에요.'],
  ['ngc3603', 'emission', '뜨거운 별들 둘레의 가스가 붉게 빛나요.'],
  ['ngc1333', 'reflection', '티끌 구름이 가까운 별빛을 반사해 파랗게 보여요. 둘레의 검은 부분은 암흑 성운이에요.', ['dark']],
  ['b175', 'dark', '별이 많은 곳 앞을 어두운 띠 모양의 구름이 가리고 있어요. 끝부분에는 별빛을 반사하는 푸른 반사 성운도 있어요.', ['reflection']],
  ['trifid', 'emission', '붉게 빛나는 방출 성운, 푸른 반사 성운, 그 사이를 가르는 검은 암흑 성운이 한 사진에 모두 있어요!', ['reflection', 'dark']],
];
