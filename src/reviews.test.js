import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { REVIEWS, validateReview } from './reviews.js';

test('모든 실험에 실험 전 1분 복습이 있음(새 실험도 빠뜨리지 않기)', () => {
  for (const slug of readdirSync(new URL('../simulations/', import.meta.url))) {
    assert.ok(REVIEWS[slug], `${slug}의 실험 전 복습을 src/reviews.js에 추가하세요.`);
    validateReview(REVIEWS[slug]);
  }
});
test('복습 형식 오류를 거부함', () => {
  assert.throws(() => validateReview(undefined));
  const base = REVIEWS['ohms-law'];
  for (const mutate of [r => { r.items = r.items.slice(0, 1); }, r => { r.items[0].answer = 9; }, r => { r.items[1].choices = ['하나']; }, r => { r.items[2].explanation = ' '; }]) {
    const copy = structuredClone(base); mutate(copy); assert.throws(() => validateReview(copy));
  }
});
