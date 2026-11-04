import test from 'node:test';
import assert from 'node:assert/strict';
import { submitUrlFor } from './report-submit.js';
import { SUBMIT_URL, SUBMIT_URL_BY_GRADE } from './submission-config.js';

// 교사 의견(2026년 11월): 1학년과 2학년 보고서를 다른 시트로 받고 싶어요. 학번 첫 자리(학년)로 받을 시트를 골라요.
test('학년별 시트: 학번 첫 자리에 맞는 주소로 보내고, 그 학년 주소가 비어 있으면 기본 주소로 보내요', () => {
  const base = 'https://script.google.com/macros/s/BASE/exec', first = 'https://script.google.com/macros/s/GRADE1/exec';
  assert.equal(submitUrlFor('10315', base, { 1: first, 2: '' }), first);
  assert.equal(submitUrlFor('20315', base, { 1: first, 2: '' }), base);
  assert.equal(submitUrlFor('30101', base, { 1: first }), base);
  // 기본 주소가 비어 있어도 학년 주소가 있으면 그 학년은 보낼 수 있어요. 받을 곳이 없으면 ''(화면이 안내해요).
  assert.equal(submitUrlFor('10315', '', { 1: first }), first);
  assert.equal(submitUrlFor('20315', '', { 1: first }), '');
});

test('제출 주소 설정: 기본 주소와 학년별 주소는 비어 있거나 Apps Script 웹 앱 주소(…/exec)예요', () => {
  const webApp = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;
  if (SUBMIT_URL) assert.match(SUBMIT_URL, webApp);
  for (const [grade, url] of Object.entries(SUBMIT_URL_BY_GRADE)) {
    assert.match(grade, /^[1-9]$/, '학년은 숫자 한 자리예요');
    if (url) assert.match(url, webApp, `${grade}학년 주소`);
  }
});
