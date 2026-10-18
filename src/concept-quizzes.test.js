import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { CONCEPT_QUIZZES, validateQuiz } from './concept-quizzes.js';

test('모든 실험에 OX 2개와 정답이 하나인 5지선다 1개 및 해설이 있음', () => {
  for (const slug of readdirSync(new URL('../simulations/', import.meta.url))) {
    const quiz = CONCEPT_QUIZZES[slug];
    assert.ok(quiz, `${slug}의 퀴즈를 추가하세요.`);
    validateQuiz(quiz);
    for (const q of quiz) assert.equal(new Set(q.options.map(([, label]) => label)).size, q.options.length);
  }
});
test('문제 누락·선택지 수·정답 오류를 거부함', () => {
  assert.throws(() => validateQuiz(undefined));
  const original = CONCEPT_QUIZZES['friction-electricity'];
  for (const mutate of [q => q.pop(), q => q[2].options.pop(), q => q[0].answer = 'unknown', q => q[1].type = 'choice']) {
    const copy = structuredClone(original); mutate(copy); assert.throws(() => validateQuiz(copy));
  }
});
