// 도전 과제(src/challenges.js): 11개 실험의 선택 과제를 살펴요. 정답은 실험 모형의 계산·자료와 같아야 해요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES } from './challenges.js';
import { isRight, parseNumber } from './challenge-ui.js';
import { currentMA, resistanceFrom } from './ohm-model.js';
import { intensityAt, brightnessRatio, compareTo10pc, colorClassOf } from './space-model.js';
import { STARS } from './space-stars.js';
import { RADIUS, SUN_R } from './galaxy-model.js';

// 마찰 전기·정전기 유도는 실험이 여럿이라 이번 도전 과제에서 빼요.
const LABS = ['electric-current', 'ohms-law', 'series-parallel', 'coil-magnetic-field', 'electric-swing', 'electric-motor',
  'stellar-parallax', 'star-brightness', 'star-color', 'milky-way', 'expanding-universe'];

test('도전 과제: 실험마다 2~3문제와 생각 더하기, 문제마다 힌트·해설, 보기의 정답 번호가 맞음', () => {
  for (const slug of LABS) {
    const c = CHALLENGES[slug];
    assert.ok(c, `${slug}의 도전 과제를 더해요.`);
    assert.ok(c.items.length >= 2 && c.items.length <= 3, slug);
    assert.ok(c.think.length >= 20, `${slug}: 생각 더하기`);
    for (const item of c.items) {
      assert.ok(item.hint && item.explanation, `${slug}: ${item.question}`);
      if (item.type === 'choice') {
        assert.ok(item.options.length >= 2 && item.answer >= 0 && item.answer < item.options.length, item.question);
        assert.equal(new Set(item.options).size, item.options.length, item.question);
        assert.ok(!item.options.some(o => o.includes('잘 모르겠')), item.question);
      } else {
        assert.equal(item.type, 'number', item.question);
        assert.ok(Number.isFinite(item.answer) && item.unit, item.question);
        assert.ok(isRight(item, String(item.answer)) && isRight(item, `${item.answer} ${item.unit}`), item.question);
        assert.ok(!isRight(item, String(item.answer * 2 + 1)), item.question);
      }
    }
  }
});

test('도전 과제의 정답이 실험 모형의 계산·자료와 같음', () => {
  const items = slug => CHALLENGES[slug].items;
  const num = (slug, n) => items(slug)[n].answer;
  const pick = (slug, n) => items(slug)[n].options[items(slug)[n].answer];
  // 옴의 법칙: 6 V, 20 Ω → 300 mA / 3 V, 150 mA → 20 Ω
  assert.equal(num('ohms-law', 0), currentMA(6, 20));
  assert.equal(num('ohms-law', 1), resistanceFrom(3, 150));
  assert.match(pick('ohms-law', 2), /작은/);
  assert.ok(currentMA(2, 10) > currentMA(2, 20));
  // 거리와 빛의 세기: 30 cm에서 900 lx → 90 cm
  assert.equal(num('star-brightness', 0), intensityAt(900, 30, 90));
  // 2등급과 4등급: 약 6배(2.5 × 2.5)
  const ratio = brightnessRatio(2, 4), item = items('star-brightness')[1];
  assert.ok(Math.abs(ratio - item.answer) <= item.tolerance, `${ratio}`);
  assert.ok(isRight(item, '6') && isRight(item, '6.3') && !isRight(item, '4') && !isRight(item, '5'));
  // 겉보기 등급 1.0, 절대 등급 3.0 → 10 pc보다 가까이
  assert.equal(compareTo10pc(1.0, 3.0), 'nearer');
  assert.match(pick('star-brightness', 2), /가까이/);
  // 별의 색: 베가(백색)가 아크투루스(주황색)보다 뜨거워요. 약 3000 ℃ → 적색
  assert.ok(STARS.vega.temp > STARS.arcturus.temp);
  assert.equal(pick('star-color', 0), STARS.vega.name);
  assert.equal(colorClassOf(3000).name, '적색');
  assert.equal(pick('star-color', 1), '적색');
  // 우리은하: 8500 pc ÷ 30000 pc ≈ 1/4
  assert.ok(Math.abs(SUN_R / (RADIUS * 2) - 1 / 4) < 0.05);
  assert.equal(pick('milky-way', 2), '약 1/4');
  // 숫자 읽기: 단위나 쉼표가 붙어도 숫자만 읽어요.
  assert.equal(parseNumber('300 mA'), 300);
  assert.equal(parseNumber('1,000'), 1000);
  assert.ok(Number.isNaN(parseNumber('모름')));
});
