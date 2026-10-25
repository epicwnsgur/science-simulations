import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { parallaxArcsec, parallaxMeasurable, LY_PER_PC, intensityAt, brightnessRatio, compareTo10pc, apparentMag, blackbodyRGB, colorClassOf, COLOR_CLASSES, starPaletteRGB, bvToKelvin } from './space-model.js';
import { STARS, BIG_DIPPER_LY } from './space-stars.js';
import { BOARD, sightOnScale, scaleNumber, boardParallax, annualParallaxDeg, STAR_X, STAR_Y, earthAt, hitSky } from './parallax-model.js';
import { RADIUS, SUN_R, SUN_POS, KINDS, CLASSIFY, galaxyPoints } from './galaxy-model.js';
import { RADII, STICKERS, PAIRS, surfaceCm, galaxyField, seenFrom } from './expansion-model.js';
import { PHOTOS } from './space-photos.js';
import { MODELS } from './teaching-models.js';

test('연주 시차: 1 pc이면 1″, 거리가 멀수록 작고, 100 pc보다 먼 별은 재기 어려움(교과서 279쪽)', () => {
  assert.equal(parallaxArcsec(1), 1);
  assert.ok(parallaxArcsec(STARS.proxima.dist) > parallaxArcsec(STARS.sirius.dist));
  assert.ok(parallaxArcsec(STARS.sirius.dist) > parallaxArcsec(STARS.vega.dist));
  assert.equal(LY_PER_PC, 3.26);
  assert.equal(parallaxMeasurable(STARS.megrez.dist), true);
  assert.equal(parallaxMeasurable(STARS.betelgeuse.dist), false);
  assert.equal(parallaxMeasurable(STARS.polaris.dist), false);
  // 교과서 값: 프록시마 약 4.2 광년, 메그레즈 약 58 광년
  assert.equal(Math.round(STARS.proxima.dist * LY_PER_PC * 10) / 10, 4.2);
  assert.equal(Math.round(STARS.megrez.dist * LY_PER_PC), BIG_DIPPER_LY.메그레즈);
});

test('시차 측정 판: 두 구멍으로 본 위치가 눈금에 맞고, 가까운 별 모형 (가)의 시차가 더 큼(교과서 277쪽 탐구)', () => {
  const read = (id, h) => scaleNumber(sightOnScale(BOARD.holes[h], BOARD.models[id]));
  assert.deepEqual([read('a', 'left'), read('a', 'right'), read('b', 'left'), read('b', 'right')], [8, 4, 6, 5]);
  assert.equal(Math.round(boardParallax(BOARD.models.a)), 37);
  assert.equal(Math.round(boardParallax(BOARD.models.b)), 19);
  assert.ok(boardParallax(BOARD.models.a) > boardParallax(BOARD.models.b));
});

test('공전 모형: 가까운 별 X의 연주 시차가 먼 별 Y보다 크고, A에서는 X1이 왼쪽(교과서 그림 VIII 2)', () => {
  assert.ok(annualParallaxDeg(STAR_X) > annualParallaxDeg(STAR_Y) * 1.6);
  const A = earthAt(0), B = earthAt(Math.PI);
  assert.ok(A[0] > 0 && B[0] < 0, 'A는 오른쪽, B(6개월 뒤)는 왼쪽');
  assert.ok(hitSky(A, STAR_X, 60)[0] < hitSky(B, STAR_X, 60)[0], 'A에서 본 X1은 B에서 본 X2보다 왼쪽');
  // 지구가 공전하지 않으면(같은 자리) 별이 보이는 곳이 같아요.
  assert.deepEqual(hitSky(A, STAR_X, 60), hitSky(earthAt(0), STAR_X, 60));
});

test('빛의 세기와 등급: 거리 2배·3배·4배면 1/4·1/9·1/16, 1등급 차 약 2.5배, 5등급 차 100배(교과서 280–282쪽)', () => {
  assert.deepEqual([20, 40, 60, 80].map(d => Math.round(intensityAt(720, 20, d))), [720, 180, 80, 45]);
  assert.equal(intensityAt(1, 1, 3), 1 / 9);
  assert.equal(Math.round(brightnessRatio(1, 2) * 10) / 10, 2.5);
  assert.equal(Math.round(brightnessRatio(1, 6)), 100);
});

test('겉보기 등급과 절대 등급: 교과서 값과 10 pc 비교(교과서 283쪽)', () => {
  assert.deepEqual([STARS.sirius.m, STARS.sirius.M, STARS.mirzam.m, STARS.mirzam.M, STARS.sun.m, STARS.sun.M], [-1.5, 1.4, 2.0, -4.1, -26.7, 4.8]);
  assert.equal(compareTo10pc(STARS.sirius.m, STARS.sirius.M), 'nearer');
  assert.equal(compareTo10pc(STARS.mirzam.m, STARS.mirzam.M), 'farther');
  assert.equal(compareTo10pc(3, 3), 'same');
  assert.ok(STARS.mirzam.M < STARS.sirius.M, '실제로는 미르잠이 더 밝아요');
  assert.ok(STARS.sirius.m < STARS.mirzam.m, '지구에서는 시리우스가 더 밝게 보여요');
  // 거리와 등급이 서로 맞는지(실제 자료라 조금 달라도 0.3등급 안쪽)
  for (const k of ['sun', 'sirius', 'mirzam', 'polaris', 'vega']) assert.ok(Math.abs(apparentMag(STARS[k].M, STARS[k].dist) - STARS[k].m) < .3, k);
});

test('별의 색과 표면 온도: 온도가 높을수록 파랗고, 교과서의 색 분류와 예시 별이 맞음(교과서 285쪽)', () => {
  const blueness = T => { const [r, , b] = blackbodyRGB(T); return b / r; };
  for (const [lo, hi] of [[3000, 5000], [5000, 8000], [8000, 15000], [15000, 30000]]) assert.ok(blueness(hi) > blueness(lo), `${lo} K < ${hi} K`);
  assert.deepEqual(COLOR_CLASSES.map(c => c.name), ['청색', '청백색', '백색', '황백색', '황색', '주황색', '적색']);
  for (const [k, s] of Object.entries(STARS)) if (k !== 'polaris') assert.equal(colorClassOf(s.temp).name, s.color, k);
  assert.equal(STARS.sun.temp, 6000);
  assert.ok(STARS.dschubba.temp > STARS.antares.temp, '청백색 드슈바가 붉은 안타레스보다 뜨거워요');
  // 화면용 색: 뜨거울수록 파랑이 진해지고 빨강이 줄어요.
  const temps = [3000, 4000, 5500, 7000, 9000, 15000, 30000];
  const pal = temps.map(starPaletteRGB);
  for (let i = 1; i < pal.length; i++) assert.ok(pal[i][2] - pal[i][0] >= pal[i - 1][2] - pal[i - 1][0] - 1e-9, `${temps[i]}℃`);
  // 색지수 → 온도: 붉은 별일수록 낮아요.
  assert.ok(bvToKelvin(1.8) < bvToKelvin(.6) && bvToKelvin(.6) < bvToKelvin(0));
});

test('우리은하 모형: 지름 약 30000 pc, 태양계는 중심에서 약 8500 pc(교과서 291쪽)', () => {
  assert.equal(RADIUS * 2 * 1000, 30000);
  assert.equal(SUN_R * 1000, 8500);
  assert.equal(Math.round(Math.hypot(SUN_POS[0], SUN_POS[2]) * 1000), 8500);
  const pts = galaxyPoints(.2);
  const thick = t => { const s = pts.filter(p => p[3] === t); return Math.sqrt(s.reduce((a, p) => a + p[1] ** 2, 0) / s.length); };
  assert.ok(thick(0) > 2 * thick(1), '옆에서 보면 중심부가 볼록해요');
  assert.ok(pts.every(p => Math.hypot(p[0], p[2]) < RADIUS * 1.3));
});

test('성단과 성운: 다섯 종류를 모두 분류하고, 사진 파일과 출처가 있음(교과서 291–293쪽)', () => {
  assert.deepEqual(Object.values(KINDS).map(k => k.name), ['산개 성단', '구상 성단', '방출 성운', '반사 성운', '암흑 성운']);
  assert.deepEqual(new Set(CLASSIFY.map(c => c[1])), new Set(Object.keys(KINDS)));
  for (const [key, p] of Object.entries(PHOTOS)) {
    assert.ok(existsSync(new URL(`../public/space/photos/${p.src}`, import.meta.url)), key);
    assert.ok(p.credit && p.url.startsWith('http'), `${key} 출처`);
  }
  for (let i = 1; i <= 14; i++) assert.ok(existsSync(new URL(`../public/space/galaxies/g${String(i).padStart(2, '0')}.png`, import.meta.url)));
});

test('풍선 모형: 풍선이 커지면 모든 붙임딱지 사이가 같은 비율로 멀어지고, 어느 은하에서 보아도 멀어짐(교과서 294–295쪽)', () => {
  const ratios = PAIRS.map(([a, b]) => surfaceCm(RADII.much, STICKERS[a], STICKERS[b]) / surfaceCm(RADII.little, STICKERS[a], STICKERS[b]));
  for (const r of ratios) assert.ok(Math.abs(r - RADII.much / RADII.little) < .03);
  for (const [a, b] of PAIRS) assert.ok(surfaceCm(RADII.much, STICKERS[a], STICKERS[b]) > surfaceCm(RADII.little, STICKERS[a], STICKERS[b]));
  const field = galaxyField(22);
  for (const ref of [field[0], field[8], field[21]]) for (const g of field) {
    if (g === ref) continue;
    const d1 = Math.hypot(...Object.values(seenFrom(ref, g, 1))), d2 = Math.hypot(...Object.values(seenFrom(ref, g, 1.8)));
    assert.ok(d2 > d1, '기준 은하가 어디든 다른 은하는 멀어져요(중심이 없어요)');
  }
});

test('수업 모형: 발생 학습·비유(FAR) 모형도 같은 네 칸으로 기록하고 이름만 바뀜', () => {
  for (const m of Object.values(MODELS)) {
    assert.deepEqual(Object.keys(m.fields), ['prediction', 'reason', 'observation', 'explanation']);
    assert.equal(m.steps.length, 3);
  }
  assert.equal(MODELS.generative.fields.prediction, '처음 생각');
  assert.equal(MODELS.far.fields.explanation, '비유 되돌아보기');
});
