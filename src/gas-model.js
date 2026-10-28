// 중학교 1학년 Ⅵ. 기체의 성질 탐구 모형.
// 지도상 유의점: 압력, 보일 법칙, 샤를 법칙을 수식으로 다루지 않고 실험 자료를 해석해 정성적으로 설명해요.
// 압력의 단위는 소개하는 정도로만 쓰고(기압), 단위 환산은 다루지 않아요. 아래 계산은 화면의 값을 만드는 데에만 써요.

/* ---------- 압력: 점토가 눌리는 깊이 비교하기 ----------
   바닥에 우드록을 붙인 500 mL 페트병에 물을 담아 점토 위에 세워요.
   (가) 물을 가득 채워 바로 세움(넓은 바닥), (나) 물을 가득 채워 뒤집어 세움(좁은 뚜껑), (다) 물을 반만 채워 뒤집어 세움. */
export const BOTTLE_SETUPS = Object.freeze({
  a: { name: '(가)', water: '가득', upright: true, weightN: 5.2, areaCm2: 33 },
  b: { name: '(나)', water: '가득', upright: false, weightN: 5.2, areaCm2: 6.2 },
  c: { name: '(다)', water: '반', upright: false, weightN: 2.7, areaCm2: 6.2 },
});
// 일정한 넓이에 작용하는 힘의 크기(압력). 화면에는 숫자 대신 ‘깊이’로만 보여 줘요.
export const pressureOf = s => s.weightN / s.areaCm2;
// 점토가 눌리는 깊이(mm, 어림값): 압력이 클수록 깊어요. 가장 큰 압력((나))일 때 약 6 mm가 되게 맞췄어요.
export const clayDepthMm = s => Math.round(pressureOf(s) / pressureOf(BOTTLE_SETUPS.b) * 60) / 10;

/* ---------- 보일 법칙: 주사기와 압력계 ----------
   주사기의 피스톤을 30 mL에 맞추고 입구를 압력계(압력 센서)에 연결하면 1 기압이에요(교과서 198쪽, 지도서 391쪽).
   온도가 일정할 때 압력과 부피를 곱한 값이 일정해요(압력 × 부피 = 30). */
export const SYRINGE = Object.freeze({ startMl: 30, startAtm: 1, minMl: 15, maxMl: 60 });
export const pressureAtVolume = ml => SYRINGE.startAtm * SYRINGE.startMl / ml;
export const volumeAtPressure = atm => SYRINGE.startMl * SYRINGE.startAtm / atm;
// 압력계의 눈금 읽기: 소수 둘째 자리까지
export const readAtm = ml => Math.round(pressureAtVolume(ml) * 100) / 100;

/* ---------- 샤를 법칙: 유리병·피펫·글리세롤 ----------
   5 mL 유리병에 실리콘 튜브와 1 mL 피펫을 연결하고 피펫 입구에 글리세롤 한두 방울을 떨어뜨려요.
   기체의 부피 = 유리병의 부피(5 mL) + 피펫으로 읽은 부피(교과서 209쪽 탐구 길잡이).
   압력이 일정할 때 일정량의 기체 부피는 온도에 따라 일정하게 늘거나 줄어요.
   (실제 계산은 절대 온도에 비례하지만, 중학교에서는 섭씨온도(℃)의 그래프로 ‘일정하게’ 변하는 것만 다뤄요.
   0 ℃에서 부피가 0이 되는 것이 아니에요.) */
export const BOTTLE_ML = 5;
export const PIPETTE_ML = 1;
export const CHARLES = Object.freeze({ refC: 60, refMl: 6.0 });   // 60 ℃일 때 기체의 부피가 6.0 mL(피펫 끝 1 mL 눈금)
const K = 273.15;
export const gasVolumeAt = c => CHARLES.refMl * (c + K) / (CHARLES.refC + K);
export const pipetteReading = c => gasVolumeAt(c) - BOTTLE_ML;
// 피펫 눈금 읽기: 0.01 mL까지
export const readMl = c => Math.round(gasVolumeAt(c) * 100) / 100;
// 뜨거운 물이 식는 모습(뉴턴의 냉각을 단순하게): 실내 온도로 점점 다가가요. 시간은 화면에서 빠르게 흘러요.
export const ROOM_C = 20;
export const coolWater = (c, dt, tau = 30) => ROOM_C + (c - ROOM_C) * Math.exp(-dt / tau);

/* ---------- 입자 모형(공통) ----------
   기체 입자의 운동 빠르기는 온도로만 정해져요(부피를 줄여도 빨라지지 않아요).
   화면 속 빠르기는 절대 온도의 제곱근에 비례하게 정하고, 보기 좋게 크기를 맞췄어요. */
export const particleSpeed = (c, base = 120) => base * Math.sqrt((c + K) / (20 + K));
// 압력이 일정할 때 피스톤 높이(부피)는 절대 온도에 비례해요. 20 ℃일 때의 높이를 h20으로 둬요.
export const pistonHeightAtTemp = (c, h20) => h20 * (c + K) / (20 + K);
// 온도가 일정할 때 피스톤 높이(부피)는 외부 압력에 반비례해요. 1 기압일 때의 높이를 h1로 둬요.
export const pistonHeightAtPressure = (atm, h1) => h1 / atm;
