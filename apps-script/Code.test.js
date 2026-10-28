import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppsScript } from './fake-google.js';

const HEAD = ['제출 시각', '반', '학번', '이름', '제출 횟수'];
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
  // 3행부터가 보고서 줄이에요. 빈 줄은 ''로 보여 줍니다.
  const view = (sheet, cols = [1, 3]) => sheet.rows.slice(2).map(r => r.some(v => v !== '' && v != null) ? cols.map(c => String(r[c]).replace(/^'/, '')).join(' ') : '');
  // 설정 탭의 값을 바꿔요(예: 같은 실험 최대 제출).
  const setSetting = (label, value) => { script.ss.getSheetByName('설정').rows.find(r => r[0] === label)[1] = value; };
  return { ...script, code, report, view, setSetting };
}

test('setup은 설정·명단 탭과 6자리 수업 코드를 만들고 빈 시트1을 지운다', () => {
  const { ss, code } = ready();
  assert.deepEqual(ss.getSheets().map(s => s.getName()), ['설정', '명단']);
  assert.match(code, /^\d{6}$/);
  assert.equal(ss.getSheetByName('설정').rows[2][1], true);
});

test('보고서를 실험 탭에 저장하고, 1행 정렬 버튼·2행 머리글·사용 후기·제출 ID 칸을 둔다', () => {
  const { ss, post, report } = ready();
  const first = post(report({ feedback: '버튼이 커서 좋았어요.' }));
  assert.deepEqual({ ...first, submittedAt: typeof first.submittedAt }, { ok: true, count: 1, submittedAt: 'string', message: '홍길동 학생의 ‘옴의 법칙’ 보고서를 제출했어요.' });
  const second = post(report({ explanation: '고쳐 쓴 설명이에요. 전류는 전압에 비례해요.' }));
  assert.equal(second.count, 2);
  assert.match(second.message, /2번째 제출/);
  const sheet = ss.getSheetByName('옴의 법칙');
  assert.deepEqual(sheet.rows[0].slice(0, 5), ['보기 순서 →', false, '학번 순', true, '제출 시각 순']);
  assert.deepEqual(sheet.rows[1], [...HEAD, '예상', '예상한 까닭', '관찰', '설명', '사용 후기', '제출 ID']);
  assert.equal(Object.prototype.toString.call(sheet.rows[2][0]), '[object Date]');
  assert.deepEqual(sheet.rows[2].slice(1, 11), ['3반', "'20315", '홍길동', 1, '전류가 2배가 된다', '전압이 커지면 전류도 커질 것 같아요.', '전압을 높일수록 전류계 값이 커졌어요.', '저항이 일정하면 전류는 전압에 비례해요.', '버튼이 커서 좋았어요.', '']);
  assert.equal(sheet.rows[3][8], '고쳐 쓴 설명이에요. 전류는 전압에 비례해요.');
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

test('수식처럼 보이는 글은 다시 정리한 뒤에도 글자로 남고, 새 실험은 실험 이름으로 탭을 만든다', () => {
  const { ss, post, report } = ready();
  assert.equal(post(report({ title: '자기장 [심화]: 1/2', explanation: '=HYPERLINK("http://example.com")', studentId: '20501' })).ok, true);
  assert.equal(post(report({ title: '자기장 [심화]: 1/2', studentId: '20101' })).ok, true);
  assert.equal(post(report({ title: '설정' })).ok, true);
  assert.equal(post(report({ title: '' })).ok, true);
  assert.deepEqual(ss.getSheets().map(s => s.getName()), ['설정', '명단', '자기장 심화 1 2', '설정 실험', '이름 없는 실험']);
  const rows = ss.getSheetByName('자기장 심화 1 2').rows;
  assert.equal(rows[4][8], '\'=HYPERLINK("http://example.com")');
  assert.equal(rows[4][2], "'20501");
});

test('읽을 수 없는 요청에는 학생용 안내를 돌려준다', () => {
  const { post } = ready();
  assert.deepEqual(post('not json'), { ok: false, message: '보낸 내용을 읽을 수 없어요. 페이지를 새로 고친 뒤 다시 제출해 주세요.' });
});

test('1반~11반을 숫자 순서로 모으고 반 사이를 한 칸 띄우며, 10반과 11반도 따로 색을 칠한다', () => {
  const { ss, post, report, view } = ready();
  for (const [id, name] of [['21105', '십일반가'], ['20305', '삼반가'], ['21001', '십반가'], ['20112', '일반가'], ['21101', '십일반나'], ['20302', '삼반나'], ['20120', '일반나']]) {
    assert.equal(post(report({ studentId: id, name })).ok, true, id);
  }
  const sheet = ss.getSheetByName('옴의 법칙');
  assert.deepEqual(view(sheet), ['1반 일반가', '1반 일반나', '', '3반 삼반가', '3반 삼반나', '', '10반 십반가', '', '11반 십일반가', '11반 십일반나']);
  const colors = Array.from(sheet.colors.slice(2, 12), c => c ?? null);
  assert.deepEqual(colors, ['#f7c9c9', '#f7c9c9', null, '#f7f0c9', '#f7f0c9', null, '#dac9f7', null, '#f7c9f7', '#f7c9f7']);
});

test('시트에서 직접 정렬해 반이 섞여도 다음 제출 때 반별로 다시 정리된다', () => {
  const { ss, post, report, view } = ready();
  for (const id of ['20101', '21001', '21101']) post(report({ studentId: id, name: '학생' + id }));
  const sheet = ss.getSheetByName('옴의 법칙');
  // 선생님이 ‘반’ 칸을 글자 순서로 정렬하면 1반 뒤에 10반·11반이 붙고 빈 줄이 맨 아래로 가요.
  const data = sheet.rows.slice(2).filter(r => r.some(v => v !== ''));
  data.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  sheet.rows.splice(2, sheet.rows.length, ...data);
  post(report({ studentId: '20201', name: '학생20201' }));
  assert.deepEqual(view(sheet), ['1반 학생20101', '', '2반 학생20201', '', '10반 학생21001', '', '11반 학생21101']);
});

test('정렬 체크박스로 반 안에서 학번 순·제출 시각 순을 바꾸고 하나만 체크된다', () => {
  const { ss, post, report, view, context } = ready();
  for (const id of ['20330', '20105', '20310', '20101']) post(report({ studentId: id, name: 'n' + id }));
  const sheet = ss.getSheetByName('옴의 법칙');
  assert.deepEqual(view(sheet, [2]), ['20105', '20101', '', '20330', '20310']);
  const click = col => context.onEdit({ range: { getRow: () => 1, getColumn: () => col, getNumRows: () => 1, getNumColumns: () => 1, getSheet: () => sheet } });
  click(2);
  assert.deepEqual([sheet.rows[0][1], sheet.rows[0][3]], [true, false]);
  assert.deepEqual(view(sheet, [2]), ['20101', '20105', '', '20310', '20330']);
  post(report({ studentId: '20102', name: 'n20102' }));
  assert.deepEqual(view(sheet, [2]), ['20101', '20102', '20105', '', '20310', '20330']);
  click(4);
  assert.deepEqual([sheet.rows[0][1], sheet.rows[0][3]], [false, true]);
  assert.deepEqual(view(sheet, [2]), ['20105', '20101', '20102', '', '20330', '20310']);
  click(9);
  assert.deepEqual([sheet.rows[0][1], sheet.rows[0][3]], [false, true]);
});

test('같은 제출 ID는 한 번만 저장하고 처음 저장한 결과를 돌려주며, 다른 보고서는 막지 않는다', () => {
  const { ss, post, report, setSetting } = ready();
  setSetting('같은 실험 최대 제출', 10);
  const first = post(report({ submissionId: 'abc12345-0001' }));
  const again = post(report({ submissionId: 'abc12345-0001', explanation: '다시 보낸 설명' }));
  assert.equal(first.ok, true);
  assert.deepEqual(again, { ok: true, duplicate: true, submittedAt: first.submittedAt, message: '홍길동 학생의 ‘옴의 법칙’ 보고서는 이미 제출되어 있어요.' });
  assert.equal(post(report({ submissionId: 'abc12345-0002' })).count, 2);
  assert.equal(post(report({ submissionId: 'abc12345-0003', studentId: '20101', name: '다른학생' })).count, 1);
  assert.equal(post(report({ submissionId: 'bad id!' })).count, 3);
  assert.equal(post(report({ submissionId: 12345678 })).count, 4);
  const rows = ss.getSheetByName('옴의 법칙').rows.filter(r => r.length && r.some(v => v !== ''));
  assert.equal(rows.length - 2, 5);
  assert.equal(rows.filter(r => r[10] === 'abc12345-0001').length, 1);
});

test('실험이 둘인 보고서는 실험마다 예상·관찰·설명 칸을 따로 만든다', () => {
  const { ss, post, report } = ready();
  const sections = [
    { name: '풍선과 털', prediction: '끌려온다', reason: '까닭1', observation: '관찰1', explanation: '설명1: 털의 전자가 풍선으로 옮겨 갔어요.' },
    { name: '숟가락', prediction: '밀려난다', reason: '까닭2', observation: '관찰2', explanation: '설명2: 같은 전하끼리 서로 밀어내요.' },
  ];
  assert.equal(post(report({ title: '마찰 전기', sections, prediction: '합친 예상' })).ok, true);
  const sheet = ss.getSheetByName('마찰 전기');
  assert.deepEqual(sheet.rows[1].slice(5), ['[풍선과 털] 예상', '[풍선과 털] 예상한 까닭', '[풍선과 털] 관찰', '[풍선과 털] 설명', '[숟가락] 예상', '[숟가락] 예상한 까닭', '[숟가락] 관찰', '[숟가락] 설명', '사용 후기', '제출 ID']);
  assert.deepEqual(sheet.rows[2].slice(5, 13), ['끌려온다', '까닭1', '관찰1', '설명1: 털의 전자가 풍선으로 옮겨 갔어요.', '밀려난다', '까닭2', '관찰2', '설명2: 같은 전하끼리 서로 밀어내요.']);
});

// 지난 버전이 만든 탭: 1행이 바로 머리글이고, 반 사이에 빈 줄이 있어요.
function legacyTab(ss, name = '옴의 법칙') {
  const old = ss.insertSheet(name);
  old.appendRow(['제출 시각', '반', '학번', '이름', '제출 횟수', '예상', '예상한 까닭', '관찰', '설명']);
  old.appendRow([new Date('2026-10-19T01:00:00Z'), '3반', "'20330", '삼반늦게', 1, '예상', '까닭', '관찰', '설명']);
  old.appendRow([new Date('2026-10-19T00:00:00Z'), '3반', "'20310", '삼반먼저', 1, '예상', '까닭', '관찰', '설명']);
  old.appendRow([]);
  old.appendRow([new Date('2026-10-19T02:00:00Z'), '1반', "'20105", '일반', 1, '예상', '까닭', '관찰', '설명']);
  return old;
}

test('지난 버전이 만든 탭에서 메뉴로 정렬하면 그 자리에서 새 모양으로 바꾸고 정리한다', () => {
  const { ss, context, view } = ready();
  const old = legacyTab(ss);
  ss.active = old;
  context.sortActiveById();
  assert.deepEqual(ss.alerts, []);
  assert.deepEqual(old.rows[0].slice(0, 5), ['보기 순서 →', true, '학번 순', false, '제출 시각 순']);
  assert.deepEqual(old.rows[1].slice(0, 11), ['제출 시각', '반', '학번', '이름', '제출 횟수', '예상', '예상한 까닭', '관찰', '설명', '사용 후기', '제출 ID']);
  assert.deepEqual(view(old, [3]), ['일반', '', '삼반먼저', '삼반늦게']);
  context.sortActiveByTime();
  assert.deepEqual(view(old, [3]), ['일반', '', '삼반먼저', '삼반늦게']);
  assert.deepEqual([old.rows[0][1], old.rows[0][3]], [false, true]);
  assert.equal(ss.getSheets().filter(sh => sh.getName().includes('이전')).length, 0);
});

test('지난 버전이 만든 탭에 새 보고서가 오면 같은 탭을 새 모양으로 바꿔 이어서 쓴다', () => {
  const { ss, post, report, view } = ready();
  const old = legacyTab(ss);
  assert.equal(post(report({ studentId: '20201', name: '이반' })).ok, true);
  assert.equal(ss.getSheetByName('옴의 법칙'), old);
  assert.deepEqual(view(old, [3]), ['일반', '', '이반', '', '삼반먼저', '삼반늦게']);
});

test('칸 구성이 다른 탭(실험 수가 다르거나 아주 예전 모양)은 이름을 바꿔 남기고 새 탭을 만든다', () => {
  const { ss, post, report, context, view } = ready();
  legacyTab(ss);
  assert.equal(post(report()).ok, true);
  const explanation = '저항이 일정하면 전류는 전압에 비례해요.';
  assert.equal(post(report({ sections: [{ name: 'A', explanation }, { name: 'B', explanation }] })).ok, true);
  // 예전 학생 데이터는 (이전) 탭에 그대로 남아요.
  assert.deepEqual(view(ss.getSheetByName('옴의 법칙 (이전)'), [3]), ['일반', '', '삼반먼저', '삼반늦게', '홍길동']);
  assert.equal(ss.getSheetByName('옴의 법칙').rows[1][5], '[A] 예상');
  const oldest = ss.insertSheet('전동기');
  oldest.appendRow(['제출 시각', '실험', '학번']);
  assert.equal(post(report({ title: '전동기' })).ok, true);
  assert.ok(ss.getSheetByName('전동기 (이전)'));
  ss.active = ss.getSheetByName('전동기 (이전)');
  context.sortActiveById();
  assert.match(ss.alerts[0], /‘전동기 \(이전\)’ 탭은 보고서 탭 모양이 아니에요/);
});

test('선생님이 오른쪽에 적은 메모는 다시 정리해도 그 줄과 함께 움직인다', () => {
  const { ss, post, report } = ready();
  post(report({ studentId: '20301', name: '삼반' }));
  const sheet = ss.getSheetByName('옴의 법칙');
  sheet.rows[2][12] = '잘했어요';
  post(report({ studentId: '20101', name: '일반' }));
  const memo = sheet.rows.find(r => r[12] === '잘했어요');
  assert.equal(memo[3], '삼반');
});

test('메뉴에 정렬 항목을 만들고, 실험 탭이 아닌 곳에서 누르면 안내한다', () => {
  const { ss, context } = ready();
  context.onOpen();
  assert.deepEqual(ss.menu.map(m => m[2]), ['sortActiveById', 'sortActiveByTime', 'rearrangeAll']);
  ss.active = ss.getSheetByName('설정');
  context.sortActiveById();
  assert.match(ss.alerts[0], /실험 탭/);
});

test('수업 모형에 맞는 칸 이름(fieldLabels)을 보내면 새 탭 머리글에 쓰고, 내용은 같은 순서로 저장한다', () => {
  const { ss, post, report } = ready();
  const labels = { prediction: '처음 생각', reason: '처음 생각의 까닭', observation: '모형 실험 기록', explanation: '비유 되돌아보기' };
  assert.equal(post(report({ title: '우주 팽창', fieldLabels: labels })).ok, true);
  const sheet = ss.getSheetByName('우주 팽창');
  assert.deepEqual(sheet.rows[1], [...HEAD, '처음 생각', '처음 생각의 까닭', '모형 실험 기록', '비유 되돌아보기', '사용 후기', '제출 ID']);
  assert.equal(sheet.rows[2][5], '전류가 2배가 된다');
  // 이상한 값이 오면 원래 이름을 써요.
  assert.equal(post(report({ title: '연주 시차', fieldLabels: { prediction: '', reason: 5 } })).ok, true);
  assert.deepEqual(ss.getSheetByName('연주 시차').rows[1].slice(5, 9), ['예상', '예상한 까닭', '관찰', '설명']);
});

test('장난 제출 막기: 같은 학번은 같은 실험에 3번까지, 다시 내려면 60초를 기다려요(설정 탭에서 바꿀 수 있어요)', () => {
  const { ss, post, report, clock, setSetting } = ready();
  const labels = ss.getSheetByName('설정').rows.map(r => r[0]);
  assert.ok(labels.includes('같은 실험 최대 제출') && labels.includes('다시 제출 간격(초)'));
  for (let i = 0; i < 3; i++) assert.equal(post(report()).ok, true);
  const fourth = post(report());
  assert.equal(fourth.ok, false);
  assert.match(fourth.message, /이미 3번 제출했어요/);
  assert.equal(post(report({ studentId: '20101', name: '다른학생' })).ok, true, '다른 학생은 낼 수 있어요');
  setSetting('같은 실험 최대 제출', 5);
  clock.step = 10000;
  const quick = post(report());
  assert.equal(quick.ok, true, '앞 제출과 2분 차이라 받아요');
  const tooSoon = post(report());
  assert.equal(tooSoon.ok, false);
  assert.match(tooSoon.message, /초 뒤에 다시 낼 수 있어요/);
  setSetting('다시 제출 간격(초)', 0);
  assert.equal(post(report()).ok, true);
});

test('예전에 만든 설정 탭에도 setup을 다시 실행하면 새 항목만 더해요', () => {
  const { ss, context, setSetting } = ready();
  setSetting('같은 실험 최대 제출', 7);
  context.setup();
  const rows = ss.getSheetByName('설정').rows.filter(r => r[0] === '같은 실험 최대 제출');
  assert.equal(rows.length, 1);
  assert.equal(rows[0][1], 7);
});

test('뜻 없는 설명·바르지 않은 말은 받지 않고, 과학 낱말(시발점, 불이 꺼져요)은 받아요', () => {
  const { post, report } = ready();
  for (const explanation of ['ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', '가나다가나다가나다가나다가나다가나다', '아아아아아아아아아아아아아아아아아아아아', '.....']) {
    const res = post(report({ explanation }));
    assert.equal(res.ok, false, explanation);
    assert.match(res.message, /뜻이 통하는 문장|자음이나 모음|같은 글자를 이어서/);
  }
  assert.match(post(report({ observation: '존나 신기했음' })).message, /바르지 않은 말/);
  assert.match(post(report({ name: '병신' })).message, /바르지 않은 말/);
  assert.match(post(report({ feedback: '씨발 어려워' })).message, /바르지 않은 말/);
  assert.equal(post(report({ explanation: '전류의 시발점은 전지예요. 스위치를 열면 불이 꺼져요.' })).ok, true);
});

test('뜻 없는 글: 화면을 거치지 않고 보내도 예상·관찰·설명의 자음·모음 섞기, 잘 쓰지 않는 글자, 덧붙인 글자는 받지 않아요', () => {
  const { post, report } = ready();
  for (const [field, text] of [
    ['explanation', '잘모루겟야요잘묘루겟어요잫모르ㅛ세ㅛ러료잫모수게ㅛ어려'],
    ['observation', '[네온전구 켜기] 잘모루갯어요절모루개어요잘모흐겟러젛노루세료'],
    ['reason', '그냥 잠깐 불이 켜졌다가 꺼질것 같습니당다가가'],
    ['explanation', '펌프와 전지를 잘 연결을 해야할것 같습니다다다수구 잚ㅁㅁㅁㅁㅁㅁ모르겟어요'],
  ]) {
    const res = post(report({ [field]: text }));
    assert.equal(res.ok, false, text);
    assert.match(res.message, /자음이나 모음만|잘 쓰지 않는 글자|문장이 끝난 뒤|같은 글자를 이어서/, text);
  }
  assert.equal(post(report({ explanation: '왜 그런지 잘 모르겠지만 피스톤을 밀었더니 압력이 2배로 커졌어요.' })).ok, true);
});

test('한꺼번에 몰려 차례를 오래 기다리면 다시 보내라고(retry) 답하고, 정리는 마지막 제출 때 한 번에 해요', () => {
  const { ss, post, report, view } = ready();
  ss.busy = true;
  const busy = post(report());
  assert.deepEqual(busy, { ok: false, retry: true, message: '제출하는 친구들이 많아요. 잠시 뒤 다시 보내 주세요.' });
  ss.busy = false;
  // 기다리는 학생이 있는 동안 낸 제출은 정리를 미뤄요(반이 섞인 채 아래에 붙어요).
  post(report({ studentId: '20301', name: '삼반' }));
  ss.cache.set('waiting', '2');
  post(report({ studentId: '20101', name: '일반' }));
  const sheet = ss.getSheetByName('옴의 법칙');
  assert.deepEqual(view(sheet), ['3반 삼반', '1반 일반']);
  assert.ok(JSON.parse(ss.cache.get('deferred')).includes('옴의 법칙'));
  // 마지막 학생(기다리는 사람 없음)이 내면 미뤄 둔 정리까지 한 번에 해요.
  ss.cache.set('waiting', '0');
  post(report({ studentId: '20201', name: '이반' }));
  assert.deepEqual(view(sheet), ['1반 일반', '', '2반 이반', '', '3반 삼반']);
  assert.equal(ss.cache.has('deferred'), false);
});
