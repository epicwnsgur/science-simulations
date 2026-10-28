// 중학교 1학년 Ⅵ. 기체의 성질 모형(src/gas-model.js)이 교과서·지도서의 결과와 과학 법칙에 맞는지 살펴요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOTTLE_SETUPS as S, pressureOf, clayDepthMm, pressureAtVolume, volumeAtPressure, readAtm, SYRINGE, gasVolumeAt, pipetteReading, BOTTLE_ML, PIPETTE_ML, coolWater, ROOM_C, particleSpeed, pistonHeightAtTemp, pistonHeightAtPressure } from './gas-model.js';

test('압력: 힘이 같으면 넓이가 좁을수록, 넓이가 같으면 힘이 클수록 점토가 깊이 눌림((나) > (다) > (가))', () => {
  assert.equal(S.a.weightN, S.b.weightN, '(가)와 (나)는 물의 양(힘)이 같아요');
  assert.equal(S.b.areaCm2, S.c.areaCm2, '(나)와 (다)는 닿는 넓이가 같아요');
  assert.ok(pressureOf(S.b) > pressureOf(S.a) && clayDepthMm(S.b) > clayDepthMm(S.a));
  assert.ok(pressureOf(S.b) > pressureOf(S.c) && clayDepthMm(S.b) > clayDepthMm(S.c));
  assert.ok(clayDepthMm(S.c) > clayDepthMm(S.a));
});

test('보일 법칙: 30 mL에서 1 기압, 압력과 부피를 곱한 값이 일정(지도서 예시 값과 같음)', () => {
  assert.equal(pressureAtVolume(SYRINGE.startMl), 1);
  for (const [atm, ml] of [[0.5, 60], [1, 30], [1.5, 20], [2, 15]]) {
    assert.equal(volumeAtPressure(atm), ml);
    assert.ok(Math.abs(pressureAtVolume(ml) * ml - 30) < 1e-9);
  }
  // 지도서 391쪽 예시: 0.9 기압 33.3 mL, 1.8 기압 16.7 mL
  assert.ok(Math.abs(volumeAtPressure(0.9) - 33.3) < .05 && Math.abs(volumeAtPressure(1.8) - 16.7) < .05);
  // 부피가 2배가 되면 압력은 1/2배(반비례)
  assert.ok(Math.abs(pressureAtVolume(40) / pressureAtVolume(20) - .5) < 1e-9);
  assert.equal(readAtm(45), .67);
});

test('샤를 법칙: 온도가 높을수록 부피가 일정하게 커지고, 0 ℃에서도 부피는 0이 아님', () => {
  const v = [0, 20, 40, 60].map(gasVolumeAt);
  const steps = v.slice(1).map((x, i) => x - v[i]);
  assert.ok(steps.every(d => d > 0), '온도가 높을수록 부피가 커요');
  assert.ok(steps.every(d => Math.abs(d - steps[0]) < 1e-9), '같은 온도 차이마다 같은 만큼 변해요(그래프가 직선)');
  assert.ok(gasVolumeAt(0) > 4.5, '0 ℃에서도 부피가 0이 아니에요');
  assert.ok(Math.abs(gasVolumeAt(-273.15)) < 1e-9, '부피 0을 향해 늘어놓은 직선은 약 −273 ℃에서 만나요(교과서에서 다루지 않음)');
  // 피펫의 눈금(0~1 mL) 안에서 읽혀요: 실내 온도~60 ℃
  for (const c of [ROOM_C, 30, 45, 60]) { const r = pipetteReading(c); assert.ok(r >= 0 && r <= PIPETTE_ML, `${c} ℃ ${r}`); }
  assert.equal(gasVolumeAt(60), BOTTLE_ML + PIPETTE_ML);
  // 지도서 405쪽 실험 결과처럼 55.8 ℃에서 41.2 ℃로 식으면 부피가 약 0.2~0.5 mL 줄어요.
  const drop = gasVolumeAt(55.8) - gasVolumeAt(41.2);
  assert.ok(drop > .2 && drop < .5, `${drop}`);
});

test('물이 식는 모형: 실내 온도로 점점 다가가고 그보다 내려가지 않음', () => {
  let c = 60;
  for (let i = 0; i < 400; i++) { const next = coolWater(c, 1); assert.ok(next < c && next > ROOM_C); c = next; }
  assert.ok(c - ROOM_C < .01);
});

test('입자 모형: 빠르기는 온도로만 정해지고, 피스톤 높이는 온도에 따라 일정하게·압력에 반비례해 변함', () => {
  assert.ok(particleSpeed(80) > particleSpeed(20) && particleSpeed(20) > particleSpeed(-20));
  assert.equal(pistonHeightAtPressure(2, 200), 100);
  assert.equal(pistonHeightAtPressure(4, 200), 50);
  assert.ok(Math.abs(pistonHeightAtTemp(20, 150) - 150) < 1e-9);
  const d1 = pistonHeightAtTemp(40, 150) - pistonHeightAtTemp(20, 150), d2 = pistonHeightAtTemp(60, 150) - pistonHeightAtTemp(40, 150);
  assert.ok(d1 > 0 && Math.abs(d1 - d2) < 1e-9);
});
