import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TERMS, findTerm } from './glossary.js';

test('과학 낱말: 낱말의 일부(부도체 속 도체, 전자석 속 전자, 전류계 속 전류)는 다른 낱말로 보지 않음', () => {
  assert.equal(findTerm('고무는 부도체예요').term, '부도체');
  assert.equal(findTerm('전자석을 만들어요'), null);
  assert.equal(findTerm('전류계로 재요').term, '전류계');
  assert.equal(findTerm('원자핵은 움직이지 않아요').term, '원자핵');
  assert.equal(findTerm('대전체를 가까이 해요').term, '대전체');
  assert.deepEqual(findTerm('코일에 전류가 흘러요'), { term: '코일', index: 0 });
  assert.equal(findTerm('전류가 흘러요', new Set(['전류'])), null); // 이미 뜻 풀이를 붙인 낱말은 건너뛰어요
});

test('과학 낱말: 뜻 풀이는 짧고 쉬운 말이며, 교육과정 밖의 말(자기력선 등)을 쓰지 않음', () => {
  for (const [term, text] of Object.entries(TERMS)) {
    assert.ok(text.length >= 15 && text.length <= 120, term);
    assert.ok(!/자기력선|비오|사바르|쿨롱/.test(text), term);
    assert.ok(/요[.)]?$|\)$/.test(text.trim()), `${term}: 해요체로 끝나요`);
  }
});
