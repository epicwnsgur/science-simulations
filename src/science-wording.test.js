// 과학 검토(docs/scientific-review.md)에서 고친 표현이 다시 들어오지 않게 막아요.
// 새 실험을 만들 때도 이 검사를 통과해야 해요. 고친 까닭은 검토 기록에 있어요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { planck } from './space-model.js';

const root = new URL('../', import.meta.url);
const files = [
  ...readdirSync(root).filter(f => f.endsWith('.js') && !f.endsWith('.config.js')),
  ...readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js') && !f.endsWith('.test.js')).map(f => `src/${f}`),
];
// 주석은 빼고 화면에 나오는 글만 살펴요.
const visible = f => readFileSync(new URL(f, root), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const RULES = [
  [/허블[^'`]{0,20}1923|1923년[^'`]{0,30}허블/, '허블이 외부 은하를 밝힌 것은 1924년 발표(1920년대)예요.'],
  [/우주의 중심이 어디인지/, '우주에는 팽창의 중심이 없어요(‘모른다’가 아니에요).'],
  [/[가-힣]+ 알갱이|알갱이 보기/, '교과서 낱말인 ‘입자’를 쓰거나, 빛은 ‘퍼지는 모습’처럼 나타내요.'],
  [/조도계가 개발되면서/, '등급 100배 규칙은 1856년 포그슨이 정했어요.'],
  [/약 1만 배 크게/, '연주 시차 흔들림은 실제보다 약 6000배 크게 그렸어요.'],
  [/(?<!아주 작은 상태\()한 점에서 (?:대폭발|우주가 시작)/, '대폭발은 ‘아주 작은 상태(한 점)’로 쓰고, 공간 속 폭발이 아님을 함께 알려요.'],
  [/'아직 잘 모르겠어요\.'/, '예상 보기에 ‘아직 잘 모르겠어요’는 넣지 않아요. 다른 생각은 ‘기타(직접 쓰기)’에 써요(교사 의견).'],
  // 8차 검토
  [/100 pc보다 (?:먼 별은|멀어)(?:(?!지구)[^'`])*?어려워요/, '100 pc보다 먼 별도 가이아처럼 우주에서는 연주 시차를 재요. ‘지구에서’ 재기 어렵다고 써요.'],
  [/(?<!상대적으로 )(?:파란색|붉은색) 빛을 많이 방출/, '별은 여러 색의 빛을 모두 내요. 파란색(붉은색) 빛을 ‘상대적으로’ 많이 낸다고 써요.'],
  [/직접 움직이는 것이 아니라/, '은하도 조금씩 움직여요. 은하가 ‘스스로 움직여서라기보다’ 우주 공간이 팽창하기 때문이라고 써요.'],
  [/관성/, '관성은 2022 개정 중학교 과학 성취기준에 없는 낱말이에요.'],
  [/['`][^'`\n]*(?:\d+쪽|그림 [ⅠⅡⅢⅣⅤⅥⅦⅧ]-\d+)[^'`\n]*['`]/, '교과서 쪽수·그림 번호는 출판사마다 달라 화면에 쓰지 않아요(교사 의견).'],
  [/방전/, '‘방전’은 교과서 낱말이 아니에요. ‘전하가 이동한다’로 풀어 써요.'],
];

test('과학 검토에서 고친 표현이 화면 글에 다시 나오지 않음', () => {
  for (const f of files) {
    const text = visible(f);
    for (const [re, why] of RULES) assert.ok(!re.test(text), `${f}: ${why}`);
  }
});

test('빛을 내는 공의 그래프 해석: 태양(약 6000 ℃)은 여러 색을 비슷하게, 뜨거운 별은 파란색, 차가운 별은 붉은색', () => {
  // starcolor.js의 #spec-read와 같은 기준(430 nm와 660 nm의 빛 비교)
  const read = c => { const T = c + 273.15, b = planck(430, T), r = planck(660, T); return b > r * 1.6 ? 'blue' : r > b * 1.25 ? 'red' : 'even'; };
  assert.equal(read(6000), 'even');
  assert.equal(read(3000), 'red');
  assert.equal(read(20000), 'blue');
  assert.match(readFileSync(new URL('starcolor.js', root), 'utf8'), /blue > red \* 1\.6 \? '파란색 빛을 더 많이 내요' : red > blue \* 1\.25/);
  // 뜨거운 공은 모든 색의 빛을 더 많이 내요(그래프는 비율이라 꼭대기를 맞춰 그려요).
  for (const nm of [430, 550, 660]) assert.ok(planck(nm, 20000) > planck(nm, 3000), `${nm} nm`);
});

// 중1 Ⅵ. 기체의 성질: 실험 화면(안내·설명·용어 풀이)에 오개념 표현을 쓰지 않아요.
// 퀴즈·복습·도전 과제의 틀린 보기에는 오개념이 일부러 들어가므로 실험 파일과 용어 사전만 살펴요.
const GAS_FILES = ['gas-pressure.js', 'boyles-law.js', 'charles-law.js', 'src/glossary.js', 'src/previews.js', 'src/preview-scenes.js', 'src/gas-particles.js'];
const GAS_RULES = [
  [/입자(?:의)? 크기가 (?:커|작아|늘|줄)/, '온도나 압력이 변해도 기체 입자의 크기는 변하지 않아요(지도서 오개념).'],
  [/아래(?:쪽)?으로만 작용(?:해요|한다|하므로)/, '기체의 압력은 모든 방향으로 작용해요(지도서 오개념).'],
  [/부피가 (?:작아지|줄어들)면[^'`.]{0,40}(?:빨라|빠르게 움직|운동이 활발)/, '온도가 일정하면 부피를 줄여도 입자의 빠르기는 그대로예요. 충돌 횟수만 늘어요.'],
  [/0 ℃에서[^'`.]{0,12}부피(?:가|는) 0(?:이 (?:돼|되)|이에요|이다)/, '0 ℃에서도 기체의 부피는 0이 아니에요.'],
  [/절대 ?(?:온도|영도)|[−-]273|켈빈/, '절대 온도는 2022 개정 중학교 1학년 성취기준에서 다루지 않아요.'],
];

test('중1 Ⅵ 기체의 성질: 실험 화면에 오개념 표현이 없고, 법칙에는 조건(온도·압력 일정)이 함께 나옴', () => {
  for (const f of GAS_FILES) {
    const text = visible(f);
    for (const [re, why] of GAS_RULES) assert.ok(!re.test(text), `${f}: ${why}`);
  }
  for (const f of ['boyles-law.js', 'src/glossary.js']) assert.match(visible(f), /(?:온도가 일정할 때|일정한 온도에서) 일정량의 기체의 압력과 부피는 서로 (?:<b>)?반비례/, `${f}: 보일 법칙의 조건`);
  for (const f of ['charles-law.js', 'src/glossary.js']) assert.match(visible(f), /(?:압력이 일정할 때|일정한 압력에서) 일정량의 기체(?:의)? 부피는/, `${f}: 샤를 법칙의 조건`);
});
