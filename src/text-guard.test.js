import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  const strip = src => src.match(/\.replace\((\/\[\\s[^\n]*?\/g), ''\)/)[1];
  assert.equal(strip(server), strip(client));
  assert.match(server, /< 0\.35/);
  assert.match(client, /< \.35/);
});
