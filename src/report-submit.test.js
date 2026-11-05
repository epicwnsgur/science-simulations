import test from 'node:test';
import assert from 'node:assert/strict';
import { submitUrlFor, idDigits, idCheck } from './report-submit.js';
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

// 교사 의견(2026년 11월): 학번은 1xxxx, 2xxxx, 3xxxx만 받아요(4자리·6자리로 잘못 적는 것을 막아요).
test('학번 칸: 숫자만 5자리까지 남기고, 학년(1·2·3)·자리 수·반을 바로 알려 주며, 맞으면 ‘2학년 3반 15번’으로 풀어 보여 줘요', () => {
  assert.equal(idDigits('2 03-15'), '20315');
  assert.equal(idDigits('２０３１５'), '20315');
  assert.equal(idDigits('203156'), '20315');
  assert.equal(idDigits('학번20315'), '20315');
  assert.deepEqual(idCheck(''), { text: '', state: '' });
  assert.equal(idCheck('4').state, 'error');
  assert.match(idCheck('40315').text, /학년\(1, 2, 3\)으로 시작/);
  assert.match(idCheck('00315').text, /학년\(1, 2, 3\)으로 시작/);
  // 쓰는 중에는 몇 자리인지만 알려 주고, 칸을 떠나면 고칠 점으로 알려요.
  assert.deepEqual(idCheck('2031'), { text: '숫자 5자리 중 4자리', state: '' });
  assert.deepEqual(idCheck('2031', true), { text: '✕ 학번은 숫자 5자리예요. (지금 4자리)', state: 'error' });
  assert.match(idCheck('20015').text, /2~3번째 자리는 반/);
  assert.deepEqual(idCheck('20315'), { text: '✓ 2학년 3반 15번', state: 'done' });
  assert.equal(idCheck('10101').text, '✓ 1학년 1반 1번');
  assert.equal(idCheck('31234').text, '✓ 3학년 12반 34번');
});

test('시트 코드 버전: 화면이 기대하는 버전(src/sheet-version.js)과 apps-script/Code.gs의 CODE_VERSION이 같아요', async () => {
  const { readFileSync } = await import('node:fs');
  const { SHEET_CODE_VERSION } = await import('./sheet-version.js');
  const server = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  assert.equal(server.match(/const CODE_VERSION = '([^']+)';/)[1], SHEET_CODE_VERSION);
});
