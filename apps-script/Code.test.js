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
  assert.deepEqual(row.slice(1), ['3반', "'20315", '홍길동', 2, '전류가 2배가 된다', '전압이 커지면 전류도 커질 것 같아요.', '전압을 높일수록 전류계 값이 커졌어요.', '고쳐 쓴 설명이에요. 전류는 전압에 비례해요.']);
});

test('수업 코드·제출 받기·학번 형식을 확인한다', () => {
  const { ss, post, report } = ready();
  assert.match(post(report({ code: '000000' })).message, /수업 코드/);
  assert.match(post(report({ studentId: '2학년3반' })).message, /5자리/);
  assert.match(post(report({ studentId: '2031' })).message, /5자리/);
  assert.match(post(report({ studentId: '20015' })).message, /5자리/);
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

test('수식처럼 보이는 글은 글자로 저장하고, 새 실험은 실험 이름으로 탭을 만든다', () => {
  const { ss, post, report } = ready();
  assert.equal(post(report({ lab: 'new-lab', title: '자기장 [심화]: 1/2', explanation: '=HYPERLINK("http://example.com")' })).ok, true);
  assert.equal(post(report({ title: '설정' })).ok, true);
  assert.equal(post(report({ title: '' })).ok, true);
  assert.deepEqual(ss.getSheets().map(s => s.getName()), ['설정', '명단', '자기장 심화 1 2', '설정 실험', '이름 없는 실험']);
  assert.equal(ss.getSheetByName('자기장 심화 1 2').rows[1][8], '\'=HYPERLINK("http://example.com")');
});

test('읽을 수 없는 요청에는 학생용 안내를 돌려준다', () => {
  const { post } = ready();
  assert.deepEqual(post('not json'), { ok: false, message: '보낸 내용을 읽을 수 없어요. 페이지를 새로 고친 뒤 다시 제출해 주세요.' });
});

test('반별로 모으고 반 사이를 한 칸 띄우며, 반마다 색을 칠한다', () => {
  const { ss, post, report } = ready();
  const send = (id, name) => assert.equal(post(report({ studentId: id, name })).ok, true, id);
  send('20305', '삼반가'); send('20112', '일반가'); send('21101', '십일반'); send('20302', '삼반나');
  send('20201', '이반가'); send('20120', '일반나'); send('20305', '삼반가');
  const sheet = ss.getSheetByName('옴의 법칙');
  const view = sheet.rows.slice(1).map(r => r.length ? `${r[1]} ${r[3]} ${r[4]}` : '');
  assert.deepEqual(view, ['1반 일반가 1', '1반 일반나 1', '', '2반 이반가 1', '', '3반 삼반가 1', '3반 삼반나 1', '3반 삼반가 2', '', '11반 십일반 1']);
  const colors = Array.from(sheet.colors.slice(1, 11), c => c ?? null);
  assert.deepEqual(colors, ['#f7c9c9', '#f7c9c9', null, '#f7dfc9', null, '#f7f0c9', '#f7f0c9', '#f7f0c9', null, '#f7c9f7']);
});

test('예전 형식의 실험 탭은 이름을 바꿔 남기고 새 탭을 만든다', () => {
  const { ss, post, report } = ready();
  const old = ss.insertSheet('옴의 법칙');
  old.appendRow(['제출 시각', '실험', '학번']);
  old.appendRow(['2026-10-19', '옴의 법칙', '20315']);
  assert.equal(post(report()).ok, true);
  assert.equal(ss.getSheetByName('옴의 법칙 (이전)').rows.length, 2);
  assert.equal(ss.getSheetByName('옴의 법칙').rows[0][1], '반');
});
