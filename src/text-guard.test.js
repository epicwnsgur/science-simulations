import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { writingProblem, meaningfulLength, hasBadWords } from './text-guard.js';

test('글 거르기: 뜻 없는 글(ㅋㅋ, 같은 글자·같은 말 되풀이)은 막고, 보통 문장은 받아요', () => {
  for (const t of ['ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', 'ㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹ', '가나다가나다가나다가나다가나다가나다가나다', '아아아아아아아아아아아아아아아아아아아아아아', '. . . . . . . . . . . . . . . . . . . . .']) {
    assert.notEqual(writingProblem(t, { min: 20 }), '', t);
  }
  for (const t of ['전압을 높일수록 전류계의 값이 커졌어요. 전압이 2배가 되면 전류도 2배가 됐어요.', '가까운 별일수록 6개월 뒤에 보이는 위치가 많이 달라져서 연주 시차가 커요.']) {
    assert.equal(writingProblem(t, { min: 20 }), '', t);
  }
  assert.ok(meaningfulLength('ㅋㅋ 전류가 흘러요!!!') < 10);
});

test('글 거르기: 학생이 흔히 쓰는 보통 문장(겹친 글자, 숫자, 문장 부호, 측정값 나열)은 막지 않아요', () => {
  for (const t of [
    '점점 밝아졌어요. 1000 lx에서 250 lx로 줄었어요.',
    '털끝이 풍선 쪽으로 끌려 올라갔어요!! 정말 신기했어요.',
    '바늘이 빙글빙글 돌았어요. 전류를 세게 하니 쭉쭉 더 잘 돌았어요.',
    '(가)는 2칸, (나)는 1칸 움직여서 (가)의 시차가 더 커요.',
    '전압이 1 V일 때 전류는 0.1 A였고, 전압이 2 V일 때 전류는 0.2 A였고, 전압이 3 V일 때 전류는 0.3 A였고, 전압이 4 V일 때 전류는 0.4 A였어요.',
    '20 cm일 때 빛의 세기는 1000 lx, 40 cm일 때 빛의 세기는 250 lx, 60 cm일 때 빛의 세기는 111 lx, 80 cm일 때 빛의 세기는 63 lx였어요.',
  ]) assert.equal(writingProblem(t, { min: 20 }), '', t);
  // 글자 수는 글자와 숫자만 세요. 겹친 두 글자(점점)와 숫자(1000)는 그대로 세요.
  assert.equal(meaningfulLength('점점 1000!!'), 6);
  assert.equal(meaningfulLength('아아아아아 좋아요'), 4);
  assert.equal(meaningfulLength('㉮와 ㉯, ①'), 4);
});

test('글 거르기: 같은 말을 오타를 섞어 되풀이한 글도 막아요', () => {
  for (const t of [
    '모르겟어여모르겟어요모르겟아여모르겟어요',
    '모르겠어요 모르겠어요 모르겠어요 모르겠어요',
    '몰라요몰라요진짜몰라요진짜진짜몰라',
    '잘모르겠다잘모르겟다잘모르겠당잘모르것다',
    '하기싫어요하기싫어요하기실어요하기싫어',
    '아무거나아무거나아무거나쓰기 아무거나',
    '가나다라마바사가나다라마바사아자차',
    'asdfasdfasdfqwerqwer',
    '전류전류전류전류전류전류전류',
  ]) assert.match(writingProblem(t, { min: 20 }), /되풀이|20자 이상/, t);
});

test('글 거르기: 교과서·실험 화면의 문장(20자 이상)은 되풀이로 걸리지 않아요', () => {
  const files = [...readdirSync('.').filter(f => f.endsWith('.js')), ...readdirSync('src').filter(f => f.endsWith('.js') && !f.includes('test')).map(f => `src/${f}`)];
  const sentences = files.flatMap(f => [...readFileSync(f, 'utf8').matchAll(/'([^'\n]{25,})'/g)].map(m => m[1].replace(/<[^>]+>/g, '')).filter(t => /[가-힣]{6}/.test(t) && !/[{}$]/.test(t)));
  assert.ok(sentences.length > 50);
  for (const t of sentences) if (meaningfulLength(t) >= 20) assert.equal(writingProblem(t, { min: 20 }), '', t);
});

test('글 거르기: 짧은 글은 몇 자인지, 되풀이한 글은 되풀이라고 따로 알려 줘요', () => {
  assert.match(writingProblem('전류가 흘러요.', { min: 20 }), /20자 이상.*지금 6자/);
  assert.match(writingProblem('가나다가나다가나다가나다가나다가나다가나다', { min: 20 }), /되풀이/);
});

test('글 거르기: 앞 칸과 똑같은 글은 막아요', () => {
  const reason = '전압이 커지면 전류도 커질 것 같아요. 펌프가 세면 물도 세게 흐르니까요.';
  assert.match(writingProblem(reason, { min: 20, others: [reason] }), /똑같아요/);
  assert.equal(writingProblem(`${reason} 실제로 해 보니 그랬어요.`, { min: 20, others: [reason] }), '');
});

test('바르지 않은 말: 흔한 욕설은 막고, 과학 글의 낱말(시발점, 불이 꺼져요, 영향을 미친다)은 받아요', () => {
  for (const t of ['존나 신기함', '씨발', 'ㅅㅂ 어려워', '병신', '지랄', 'fuck']) assert.ok(hasBadWords(t), t);
  for (const t of ['전류의 시발점은 전지예요.', '스위치를 열면 불이 꺼져요.', '거리가 밝기에 영향을 미친다.', '새로운 별을 찾았어요.']) assert.ok(!hasBadWords(t), t);
});

test('화면(src/text-guard.js)과 선생님 시트(apps-script/Code.gs)의 거르기 규칙이 같음', () => {
  const client = readFileSync(new URL('./text-guard.js', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  const bad = src => src.match(/BAD_WORDS_? = (\/.*\/i);/)[1];
  assert.equal(bad(server), bad(client));
  const count = src => src.match(/function meaningfulLength_?\(text\) \{\n\s*return String\(text[^)]*\)(.*)\.length;/)[1];
  assert.equal(count(server), count(client));
  const body = src => src.match(/function repeatedText_?\(s\) \{\n([\s\S]*?)\n\}/)[1];
  assert.equal(body(server), body(client));
});
