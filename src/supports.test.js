// 수준별 지원(src/supports.js): 11개 실험의 도움 받기(힌트·낱말 상자·문장 틀)와 도전 과제를 살펴요.
// 도전 과제의 정답은 실험 모형의 계산·자료와 같아야 해요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUPPORTS } from './supports.js';
import { writingProblem, ownLength, FRAME_OWN_MIN } from './text-guard.js';
import { isRight, parseNumber } from './scaffold-ui.js';
import { currentMA, resistanceFrom } from './ohm-model.js';
import { intensityAt, brightnessRatio, compareTo10pc, colorClassOf } from './space-model.js';
import { STARS } from './space-stars.js';
import { RADIUS, SUN_R } from './galaxy-model.js';

// 마찰 전기·정전기 유도는 실험이 여럿이라(예상·관찰·설명을 실험마다 따로 해요) 이번 지원에서 빼요.
const LABS = ['electric-current', 'ohms-law', 'series-parallel', 'coil-magnetic-field', 'electric-swing', 'electric-motor',
  'stellar-parallax', 'star-brightness', 'star-color', 'milky-way', 'expanding-universe'];
const labFile = slug => readFileSync(`simulations/${slug}/index.html`, 'utf8').match(/src="\.\.\/\.\.\/([\w-]+\.js)"/)[1];
// 실험 파일의 observe.parts 칸 수
const partsCount = slug => {
  const src = readFileSync(labFile(slug), 'utf8'), block = src.slice(src.indexOf('parts: ['), src.indexOf('],', src.indexOf('parts: [')));
  return (block.match(/\{ title: '/g) ?? []).length || 1;
};
const fill = (frame, word) => frame.replace(/_{2,}/g, word);

test('도움 받기: 11개 실험의 예상 까닭·관찰 칸마다·설명에 힌트, 낱말 상자, 빈칸이 있는 문장 틀이 있음', () => {
  for (const slug of LABS) {
    const s = SUPPORTS[slug];
    assert.ok(s, `${slug}의 수준별 지원을 더해요.`);
    assert.equal(s.observe.length, partsCount(slug), `${slug}: 관찰 칸 수와 도움 수가 같아야 해요`);
    for (const [where, h] of [['reason', s.reason], ...s.observe.map((h, n) => [`observe ${n + 1}`, h]), ['explain', s.explain]]) {
      assert.ok(h.hints.length >= 1 && h.hints.every(t => t.length >= 10), `${slug} ${where}: 힌트`);
      assert.ok(h.words.length >= 4 && new Set(h.words).size === h.words.length, `${slug} ${where}: 낱말 상자(4개 이상, 겹치지 않게)`);
      assert.match(h.frame, /_{3}/, `${slug} ${where}: 문장 틀의 빈칸`);
    }
  }
});

test('문장 틀: 빈칸이 남으면 막고, 틀에 있던 말만으로는 안 되며, 빈칸을 내 말로 채우면 저장돼요', () => {
  for (const slug of LABS) {
    const s = SUPPORTS[slug];
    for (const { frame } of [s.reason, ...s.observe, s.explain]) {
      assert.match(writingProblem(frame, { min: 20, frame }), /빈칸/, frame);
      // 빈칸마다 한 글자만 쓰면 내가 쓴 글자가 모자라요.
      assert.ok(ownLength(fill(frame, '것'), frame) < FRAME_OWN_MIN, frame);
      assert.match(writingProblem(fill(frame, '것'), { min: 20, frame }), /내가 쓴 글자|20자 이상/, frame);
      // 빈칸을 내 말로 채운 글은 되풀이 검사에도 걸리지 않고 저장돼요.
      const mine = fill(frame, '전류가 흐르는 방향을 바꾸었을 때 달라진 모습');
      assert.equal(writingProblem(mine, { min: 20, frame }), '', mine);
    }
  }
  // 틀 없이 쓴 글은 지금과 같이 20자만 넘으면 돼요.
  assert.equal(writingProblem('전압을 높이면 전류의 세기도 커질 것 같아요. 펌프가 세면 물이 세게 흐르니까요.', { min: 20, frame: SUPPORTS['ohms-law'].reason.frame }), '');
});

test('예상 단계의 도움은 결과를 알려 주지 않음(예상 보기의 문장을 그대로 담지 않음)', () => {
  for (const slug of LABS) {
    const src = readFileSync(labFile(slug), 'utf8');
    const choices = [...src.slice(src.indexOf('choices: ['), src.indexOf('],', src.indexOf('choices: ['))).matchAll(/'([^']+)'/g)].map(m => m[1].replace(/ 것 같아요\.$/, ''));
    const { hints, frame } = SUPPORTS[slug].reason;
    for (const c of choices) for (const t of [...hints, frame]) assert.ok(!t.includes(c), `${slug}: 예상 힌트에 보기 ‘${c}’`);
  }
});

test('도전 과제: 실험마다 2~3문제와 생각 더하기, 문제마다 힌트·해설, 보기의 정답 번호가 맞음', () => {
  for (const slug of LABS) {
    const c = SUPPORTS[slug].challenge;
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
  const items = slug => SUPPORTS[slug].challenge.items;
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
