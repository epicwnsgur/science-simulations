import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppsScript } from './fake-google.js';

function ready() {
  const script = loadAppsScript();
  script.context.setup();
  const code = script.ss.getSheetByName('설정').rows[1][1];
  const report = (extra = {}) => ({
    code, studentId: '20315', name: '홍길동', lab: 'ohms-law', title: '옴의 법칙',
    prediction: '전류가 2배가 된다', reason: '전압이 커지면 전류도 커질 것 같아요.',
    observation: '전압을 높일수록 전류계 값이 커졌어요.', explanation: '저항이 일정하면 전류는 전압에 비례해요.',
    quiz: [
      { first: 'O', firstCorrect: true, last: 'O', lastCorrect: true },
      { first: 'O', firstCorrect: false, last: 'X', lastCorrect: true },
      { first: '', firstCorrect: false, last: '', lastCorrect: false },
    ],
    ...extra,
  });
  return { ...script, code, report };
}

test('setup은 설정·명단 탭과 6자리 수업 코드를 만들고 빈 시트1을 지운다', () => {
  const { ss, code } = ready();
  assert.deepEqual(ss.getSheets().map(s => s.getName()), ['설정', '명단']);
  assert.match(code, /^\d{6}$/);
  assert.equal(ss.getSheetByName('설정').rows[2][1], true);
});

test('보고서를 실험 탭에 한 줄로 저장하고 제출 횟수를 센다', () => {
  const { ss, post, report } = ready();
  assert.deepEqual(post(report()), { ok: true, count: 1, message: '홍길동 학생의 ‘옴의 법칙’ 보고서를 제출했어요.' });
  const second = post(report({ explanation: '고쳐 쓴 설명이에요. 전류는 전압에 비례해요.' }));
  assert.equal(second.count, 2);
  assert.match(second.message, /2번째 제출/);
  const sheet = ss.getSheetByName('옴의 법칙');
  assert.equal(sheet.rows[0][0], '제출 시각');
  const row = sheet.rows[2];
  assert.equal(Object.prototype.toString.call(row[0]), '[object Date]');
  assert.deepEqual(row.slice(1), ['옴의 법칙', "'20315", '홍길동', 2, '전류가 2배가 된다', '전압이 커지면 전류도 커질 것 같아요.', '전압을 높일수록 전류계 값이 커졌어요.', '고쳐 쓴 설명이에요. 전류는 전압에 비례해요.', '1 / 3', 'O (정답)', 'O (오답) → X (정답)', '미응답']);
});

test('수업 코드·제출 받기·학번 형식을 확인한다', () => {
  const { ss, post, report } = ready();
  assert.match(post(report({ code: '000000' })).message, /수업 코드/);
  assert.match(post(report({ studentId: '2학년3반' })).message, /숫자/);
  assert.match(post(report({ name: '  ' })).message, /이름/);
  ss.getSheetByName('설정').rows[2][1] = false;
  assert.match(post(report()).message, /제출을 받지 않/);
  assert.equal(ss.getSheetByName('옴의 법칙'), null);
});

test('명단을 채우면 학번과 이름이 모두 맞아야 받는다', () => {
  const { ss, post, report } = ready();
  ss.getSheetByName('명단').appendRow(['20315', '홍길동']);
  assert.equal(post(report({ name: '홍 길 동' })).ok, true);
  assert.match(post(report({ name: '김철수' })).message, /명단에 없는/);
});

test('수식처럼 보이는 글은 글자로 저장하고, 모르는 실험은 기타 탭에 모은다', () => {
  const { ss, post, report } = ready();
  assert.equal(post(report({ lab: '__proto__', title: '새 실험', explanation: '=HYPERLINK("http://example.com")' })).ok, true);
  const row = ss.getSheetByName('기타 실험').rows[1];
  assert.equal(row[1], '새 실험');
  assert.equal(row[8], '\'=HYPERLINK("http://example.com")');
});

test('읽을 수 없는 요청에는 학생용 안내를 돌려준다', () => {
  const { post } = ready();
  assert.deepEqual(post('not json'), { ok: false, message: '보낸 내용을 읽을 수 없어요. 페이지를 새로 고친 뒤 다시 제출해 주세요.' });
});
