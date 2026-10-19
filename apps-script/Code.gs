/**
 * 준혁T의 과학 실험실 — 학생 보고서를 선생님 구글 시트로 받기
 *
 * 구글 시트의 [확장 프로그램 → Apps Script]에 이 파일 내용을 그대로 붙여 넣어 쓰세요.
 * 처음 한 번 setup 함수를 실행한 뒤 웹 앱으로 배포합니다.
 * 자세한 순서: docs/google-sheet-submission.md
 *
 * @OnlyCurrentDoc  이 스크립트는 붙여 넣은 시트 하나만 읽고 씁니다.
 */

// 실험 탭은 실험 페이지가 보내 준 실험 이름으로 자동으로 만듭니다. 새 실험을 추가해도 이 코드를 고칠 필요가 없어요.
const SETTINGS_SHEET = '설정';
const ROSTER_SHEET = '명단';
const HEADERS = ['제출 시각', '반', '학번', '이름', '제출 횟수', '예상', '예상한 까닭', '관찰', '설명'];
const WIDTHS = [130, 50, 70, 70, 70, 200, 260, 300, 340];
// 1반~11반 줄 색(파스텔 무지개). 12반부터는 회색이에요.
const CLASS_COLORS = ['#f7c9c9', '#f7dfc9', '#f7f0c9', '#e8f7c9', '#c9f7c9', '#c9f7e8', '#c9f4f7', '#c9e4f7', '#c9d1f7', '#dac9f7', '#f7c9f7'];
const OTHER_COLOR = '#e6e6e6';
const MAX_TEXT = 2000;
const MAX_BODY = 40000;

/** 처음 한 번 실행: 설정·명단 탭을 만들고 6자리 수업 코드를 정합니다. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(SETTINGS_SHEET)) {
    const sheet = ss.insertSheet(SETTINGS_SHEET, 0);
    sheet.getRange(1, 1, 3, 3).setValues([
      ['항목', '값', '설명'],
      ['수업 코드', makeCode_(), '학생이 제출할 때 입력하는 숫자예요. 반이나 차시마다 바꿔도 돼요.'],
      ['제출 받기', true, '체크를 해제하면 제출을 받지 않아요.'],
    ]);
    sheet.getRange(3, 2).insertCheckboxes().check();
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#e8efe3');
    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(3, 420);
  }
  if (!ss.getSheetByName(ROSTER_SHEET)) {
    const sheet = ss.insertSheet(ROSTER_SHEET, 1);
    sheet.getRange(1, 1, 1, 3).setValues([['학번', '이름', '← 비워 두면 명단 확인 없이 받아요. 채우면 학번·이름이 모두 맞아야 제출돼요.']]);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#e8efe3');
    sheet.getRange(1, 1, sheet.getMaxRows(), 1).setNumberFormat('@');
    sheet.setFrozenRows(1);
  }
  // 새 시트에 처음부터 있던 빈 탭은 정리합니다.
  ss.getSheets().forEach(sheet => {
    if (/^(시트|Sheet)1$/.test(sheet.getName()) && sheet.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sheet);
  });
  console.log('준비 완료. 수업 코드: ' + readSettings_(ss).code);
}

/** 웹 앱 주소를 브라우저에서 열어 작동하는지 확인할 때 씁니다. */
function doGet() {
  return json_({ ok: true, message: '보고서 제출 주소가 작동하고 있어요.' });
}

/** 실험 페이지의 [제출하기] 버튼이 보낸 보고서를 한 줄로 저장합니다. */
function doPost(e) {
  try {
    const data = parseBody_(e);
    const ss = SpreadsheetApp.getActive();
    const settings = readSettings_(ss);
    if (!settings.open) fail_('지금은 제출을 받지 않고 있어요. 선생님께 여쭈어 보세요.');
    if (!settings.code || clean_(data.code, 20) !== settings.code) fail_('수업 코드가 맞지 않아요. 칠판의 코드를 다시 확인해 주세요.');

    const id = clean_(data.studentId, 20).replace(/\s/g, '');
    const name = clean_(data.name, 20).replace(/\s/g, '');
    if (!/^\d{5}$/.test(id) || Number(id.slice(1, 3)) < 1) fail_('학번은 숫자 5자리로 적어 주세요. (예: 2학년 3반 15번 → 20315)');
    if (!name) fail_('이름을 적어 주세요.');
    checkRoster_(ss, id, name);

    const lab = labName_(data.title);
    const cls = Number(id.slice(1, 3));
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = labSheet_(ss, lab);
      const count = countSubmissions_(sheet, id) + 1;
      const row = placeRow_(sheet, cls);
      sheet.getRange(row, 1, 1, HEADERS.length).setValues([[
        new Date(), cls + '반', "'" + id, name, count,
        clean_(data.prediction, 200), clean_(data.reason, MAX_TEXT), clean_(data.observation, MAX_TEXT), clean_(data.explanation, MAX_TEXT),
      ].map(safe_)]);
      // 끼워 넣은 줄은 위 줄(머리글일 수도 있음)의 서식을 물려받으므로 서식을 다시 정해 줍니다.
      sheet.getRange(row, 1, 1, sheet.getMaxColumns()).setBackground(CLASS_COLORS[cls - 1] || OTHER_COLOR).setFontWeight('normal').setWrap(true).setVerticalAlignment('top');
      sheet.getRange(row, 1).setNumberFormat('yyyy-mm-dd hh:mm');
      return json_({ ok: true, count: count, message: name + ' 학생의 ‘' + lab + '’ 보고서를 제출했어요.' + (count > 1 ? ' (' + count + '번째 제출)' : '') });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    if (!err.forStudent) console.error(err);
    return json_({ ok: false, message: err.forStudent ? err.message : '제출을 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.' });
  }
}

function parseBody_(e) {
  const body = e && e.postData ? e.postData.contents : '';
  if (!body || body.length > MAX_BODY) fail_('보낸 내용을 읽을 수 없어요. 페이지를 새로 고친 뒤 다시 제출해 주세요.');
  try {
    const data = JSON.parse(body);
    if (data && typeof data === 'object') return data;
  } catch (ignored) { /* 아래에서 안내합니다. */ }
  fail_('보낸 내용을 읽을 수 없어요. 페이지를 새로 고친 뒤 다시 제출해 주세요.');
}

function readSettings_(ss) {
  const sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) fail_('선생님 시트 준비가 아직 끝나지 않았어요. 선생님께 알려 주세요.');
  const values = {};
  sheet.getDataRange().getDisplayValues().forEach(row => { values[String(row[0]).trim()] = String(row[1]).trim(); });
  return { code: values['수업 코드'] || '', open: String(values['제출 받기']).toUpperCase() === 'TRUE' };
}

function checkRoster_(ss, id, name) {
  const sheet = ss.getSheetByName(ROSTER_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
  const listed = rows.some(row => row[0].replace(/\s/g, '') === id && row[1].replace(/\s/g, '') === name);
  if (!listed) fail_('명단에 없는 학번·이름이에요. 학번과 이름을 다시 확인해 주세요.');
}

// 시트 탭 이름에 쓸 수 없는 글자(: \ / ? * [ ])는 빼고, 설정·명단 탭과 이름이 겹치지 않게 합니다.
function labName_(title) {
  const name = clean_(title, 60).replace(/[:\\\/?*\[\]]/g, ' ').replace(/\s+/g, ' ').trim() || '이름 없는 실험';
  return name === SETTINGS_SHEET || name === ROSTER_SHEET ? name + ' 실험' : name;
}

function labSheet_(ss, name) {
  const found = ss.getSheetByName(name);
  if (found && found.getRange(1, 2).getDisplayValue() === HEADERS[1]) return found;
  // 예전 형식(반 칸이 없는) 탭은 지우지 않고 이름만 바꿔 남겨 둡니다.
  if (found) {
    let n = 1;
    while (ss.getSheetByName(name + ' (이전' + (n > 1 ? ' ' + n : '') + ')')) n++;
    found.setName(name + ' (이전' + (n > 1 ? ' ' + n : '') + ')');
  }
  const sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#e8efe3');
  sheet.setFrozenRows(1);
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length).setWrap(true).setVerticalAlignment('top');
  WIDTHS.forEach((width, i) => sheet.setColumnWidth(i + 1, width));
  return sheet;
}

// 같은 실험에서 이 학번이 몇 번 제출했는지 셉니다. 고쳐서 다시 낸 보고서도 지우지 않고 새 줄로 남겨요.
function countSubmissions_(sheet, id) {
  if (sheet.getLastRow() < 2) return 0;
  return sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getDisplayValues().filter(row => row[0] === id).length;
}

// 반별로 모아 적을 줄 번호를 정합니다. 1반 → (빈 줄) → 2반 → (빈 줄) → 3반 … 순서이고, 같은 반 안에서는 제출한 순서대로 아래에 붙어요.
// 반 칸(B열)만 보고 정하므로 선생님이 오른쪽에 메모 칸을 더해도 함께 움직여요.
function placeRow_(sheet, cls) {
  const last = sheet.getLastRow();
  if (last < 2) return 2;
  const classes = sheet.getRange(2, 2, last - 1, 1).getDisplayValues().map(row => parseInt(row[0], 10) || null);
  const same = classes.lastIndexOf(cls);
  if (same !== -1) {
    sheet.insertRowAfter(same + 2);
    return same + 3;
  }
  const next = classes.findIndex(c => c !== null && c > cls);
  if (next !== -1) {
    // 뒤 반 앞에 새 반 줄과 빈 줄을 끼워 넣습니다.
    sheet.insertRowsBefore(next + 2, 2);
    sheet.getRange(next + 3, 1, 1, sheet.getMaxColumns()).setBackground(null).setFontWeight('normal');
    return next + 2;
  }
  return last + 2;
}

function clean_(value, max) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '';
}

// 학생 글이 =, +, -, @로 시작하면 시트가 수식으로 읽지 않도록 앞에 '를 붙입니다.
function safe_(value) {
  return typeof value === 'string' && /^[=+\-@]/.test(value) ? "'" + value : value;
}

function makeCode_() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function fail_(message) {
  const err = new Error(message);
  err.forStudent = true;
  throw err;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
