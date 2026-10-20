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
// 실험 탭 모양: 1행 정렬 버튼(체크박스) · 2행 머리글 · 3행부터 반별로 모은 보고서(반 사이 빈 줄 한 칸).
const SETTINGS_SHEET = '설정';
const ROSTER_SHEET = '명단';
const BASE_HEADERS = ['제출 시각', '반', '학번', '이름', '제출 횟수'];
const SECTION_FIELDS = [['prediction', '예상', 200], ['reason', '예상한 까닭', 260], ['observation', '관찰', 300], ['explanation', '설명', 340]];
const FEEDBACK_HEADER = '사용 후기';
const ID_HEADER = '제출 ID';
const HEADER_ROW = 2;
const FIRST_ROW = 3;
const SORT_BY_ID = { col: 2, label: '학번 순' };
const SORT_BY_TIME = { col: 4, label: '제출 시각 순' };
// 1반~11반 줄 색(파스텔 무지개). 12반부터는 회색이에요.
const CLASS_COLORS = ['#f7c9c9', '#f7dfc9', '#f7f0c9', '#e8f7c9', '#c9f7c9', '#c9f7e8', '#c9f4f7', '#c9e4f7', '#c9d1f7', '#dac9f7', '#f7c9f7'];
const OTHER_COLOR = '#e6e6e6';
const MAX_TEXT = 2000;
const MAX_BODY = 60000;
const MAX_SECTIONS = 4;

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

/** 시트를 열면 위쪽 메뉴에 ‘보고서 정리’가 생깁니다. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('보고서 정리')
    .addItem('지금 탭을 학번 순서로 보기', 'sortActiveById')
    .addItem('지금 탭을 제출 시각 순서로 보기', 'sortActiveByTime')
    .addItem('모든 실험 탭 반별로 다시 정리', 'rearrangeAll')
    .addToUi();
}
function sortActiveById() { sortActive_(SORT_BY_ID); }
function sortActiveByTime() { sortActive_(SORT_BY_TIME); }
function sortActive_(mode) {
  const sheet = SpreadsheetApp.getActive().getActiveSheet();
  const ok = withLock_(() => {
    if (!isLabSheet_(sheet) && !upgradeLegacy_(sheet)) return false;
    setMode_(sheet, mode); arrange_(sheet);
    return true;
  });
  if (!ok) SpreadsheetApp.getUi().alert('‘' + sheet.getName() + '’ 탭은 보고서 탭 모양이 아니에요.\n학생 보고서가 쌓인 실험 탭(예: 옴의 법칙)을 연 다음 다시 눌러 주세요.\n(보고서 탭은 머리글에 ‘제출 시각 | 반 | 학번 | 이름’이 있어요.)');
}
function rearrangeAll() {
  withLock_(() => SpreadsheetApp.getActive().getSheets().filter(sheet => isLabSheet_(sheet) || upgradeLegacy_(sheet)).forEach(arrange_));
}

/** 실험 탭 1행의 정렬 체크박스를 누르면 그 순서로 다시 정리합니다(하나만 체크되도록 유지). */
function onEdit(e) {
  const range = e && e.range;
  if (!range || range.getRow() !== 1 || range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  const sheet = range.getSheet();
  const mode = [SORT_BY_ID, SORT_BY_TIME].filter(m => m.col === range.getColumn())[0];
  if (!mode || !isLabSheet_(sheet)) return;
  withLock_(() => { setMode_(sheet, mode); arrange_(sheet); });
}

/** 웹 앱 주소를 브라우저에서 열어 작동하는지 확인할 때 씁니다. */
function doGet() {
  return json_({ ok: true, message: '보고서 제출 주소가 작동하고 있어요.' });
}

/**
 * 실험 페이지의 [최종 제출하기]가 보낸 보고서를 저장합니다.
 * 같은 제출 ID가 다시 오면(재시도·중복 클릭) 새 줄을 만들지 않고 처음 저장한 결과를 돌려줍니다.
 */
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

    const submissionId = typeof data.submissionId === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(data.submissionId) ? data.submissionId : '';
    const lab = labName_(data.title);
    const sections = readSections_(data);
    const headers = headersFor_(sections);
    const cls = Number(id.slice(1, 3));
    return withLock_(() => {
      const sheet = labSheet_(ss, lab, headers);
      const idCol = headers.length;
      if (submissionId) {
        const saved = findSubmission_(sheet, idCol, submissionId);
        if (saved) return json_({ ok: true, duplicate: true, submittedAt: saved.toISOString(), message: name + ' 학생의 ‘' + lab + '’ 보고서는 이미 제출되어 있어요.' });
      }
      const now = new Date();
      const count = countSubmissions_(sheet, id) + 1;
      const row = [now, cls + '반', "'" + id, name, count];
      sections.forEach(s => SECTION_FIELDS.forEach(f => row.push(s[f[0]])));
      row.push(clean_(data.feedback, MAX_TEXT), submissionId);
      sheet.getRange(Math.max(sheet.getLastRow() + 1, FIRST_ROW), 1, 1, row.length).setValues([row.map(safe_)]);
      arrange_(sheet);
      return json_({ ok: true, count: count, submittedAt: now.toISOString(), message: name + ' 학생의 ‘' + lab + '’ 보고서를 제출했어요.' + (count > 1 ? ' (' + count + '번째 제출)' : '') });
    });
  } catch (err) {
    if (!err.forStudent) console.error(err);
    return json_({ ok: false, message: err.forStudent ? err.message : '제출을 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.' });
  }
}

// 실험이 여러 개인 페이지는 sections로 실험마다 예상·관찰·설명을 보냅니다. 예전 페이지는 한 묶음으로 보내요.
function readSections_(data) {
  const list = Array.isArray(data.sections) && data.sections.length ? data.sections.slice(0, MAX_SECTIONS) : [data];
  return list.map((s, i) => {
    const out = { name: list.length > 1 ? clean_(s && s.name, 30).replace(/[\[\]]/g, '') || '실험 ' + (i + 1) : '' };
    SECTION_FIELDS.forEach(f => { out[f[0]] = clean_(s && s[f[0]], f[0] === 'prediction' ? 200 : MAX_TEXT); });
    return out;
  });
}

function headersFor_(sections) {
  const headers = BASE_HEADERS.slice();
  sections.forEach(s => SECTION_FIELDS.forEach(f => headers.push(s.name ? '[' + s.name + '] ' + f[1] : f[1])));
  return headers.concat([FEEDBACK_HEADER, ID_HEADER]);
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

function isLabSheet_(sheet) {
  return sheet.getRange(HEADER_ROW, 1).getDisplayValue() === BASE_HEADERS[0] && sheet.getRange(HEADER_ROW, 2).getDisplayValue() === BASE_HEADERS[1];
}

// 지난 버전이 만든 탭(1행이 바로 ‘제출 시각 | 반 | 학번 …’ 머리글)을 그 자리에서 새 모양으로 바꿉니다.
// 맨 위에 정렬 버튼 줄을 끼워 넣고, 없던 ‘사용 후기’·‘제출 ID’ 칸을 머리글 끝에 더해요. 학생 데이터는 그대로 둬요.
function upgradeLegacy_(sheet) {
  if (sheet.getRange(1, 1).getDisplayValue() !== BASE_HEADERS[0] || sheet.getRange(1, 2).getDisplayValue() !== BASE_HEADERS[1]) return false;
  const old = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), BASE_HEADERS.length)).getDisplayValues()[0];
  let headers = old.slice(0, old.length - [...old].reverse().findIndex(v => v !== ''));
  if (headers.indexOf(FEEDBACK_HEADER) === -1) headers.push(FEEDBACK_HEADER);
  if (headers.indexOf(ID_HEADER) === -1) headers.push(ID_HEADER);
  sheet.insertRowBefore(1);
  addControlRow_(sheet, headers);
  sheet.getRange(HEADER_ROW, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e8efe3').setWrap(true);
  sheet.setFrozenRows(HEADER_ROW);
  sheet.hideColumns(headers.length);
  return true;
}

// 1행: 정렬 버튼(학번 순 / 제출 시각 순 체크박스). 처음에는 제출 시각 순이에요.
function addControlRow_(sheet, headers) {
  sheet.getRange(1, 1, 1, 7).setValues([['보기 순서 →', true, SORT_BY_ID.label, false, SORT_BY_TIME.label, '', '← 하나를 체크하면 반별로 그 순서로 다시 정리돼요. (위쪽 메뉴 ‘보고서 정리’에도 있어요)']]);
  sheet.getRange(1, SORT_BY_ID.col).insertCheckboxes();
  sheet.getRange(1, SORT_BY_TIME.col).insertCheckboxes();
  setMode_(sheet, SORT_BY_TIME);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fff7d6');
}

function labSheet_(ss, name, headers) {
  const found = ss.getSheetByName(name);
  if (found && !isLabSheet_(found)) upgradeLegacy_(found);
  if (found && isLabSheet_(found) && found.getRange(HEADER_ROW, 1, 1, headers.length).getDisplayValues()[0].join('|') === headers.join('|')) return found;
  // 칸 구성이 다른 예전 탭은 지우지 않고 이름만 바꿔 남겨 둡니다.
  if (found) {
    let n = 1;
    while (ss.getSheetByName(name + ' (이전' + (n > 1 ? ' ' + n : '') + ')')) n++;
    found.setName(name + ' (이전' + (n > 1 ? ' ' + n : '') + ')');
  }
  const sheet = ss.insertSheet(name);
  addControlRow_(sheet, headers);
  sheet.getRange(HEADER_ROW, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e8efe3').setWrap(true);
  sheet.setFrozenRows(HEADER_ROW);
  const widths = BASE_HEADERS.map((h, i) => [130, 50, 70, 70, 70][i]);
  for (let i = BASE_HEADERS.length; i < headers.length - 2; i++) widths.push(SECTION_FIELDS[(i - BASE_HEADERS.length) % SECTION_FIELDS.length][2]);
  widths.push(260, 90);
  widths.forEach((width, i) => sheet.setColumnWidth(i + 1, width));
  sheet.hideColumns(headers.length);
  return sheet;
}

function setMode_(sheet, mode) {
  sheet.getRange(1, SORT_BY_ID.col).setValue(mode === SORT_BY_ID);
  sheet.getRange(1, SORT_BY_TIME.col).setValue(mode === SORT_BY_TIME);
}

// 반별로 모아 다시 씁니다. 1반 → (빈 줄) → 2반 → … → 11반 순서이고, 반 안에서는 1행에서 고른 순서(학번 순 / 제출 시각 순)를 따릅니다.
// 매번 처음부터 다시 정리하므로, 시트에서 직접 정렬해 줄이 섞였어도 다음 제출 때 바로잡혀요.
// 선생님이 오른쪽에 더한 메모 칸도 그 줄과 함께 움직입니다.
function arrange_(sheet) {
  const last = sheet.getLastRow();
  if (last < FIRST_ROW) return;
  const width = Math.max(sheet.getLastColumn(), BASE_HEADERS.length);
  const range = sheet.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, width);
  const values = range.getValues(), formulas = range.getFormulas();
  const byId = sheet.getRange(1, SORT_BY_ID.col).getValue() === true;
  const rows = values.map((row, r) => ({
    cells: row.map((v, c) => formulas[r][c] || (c === 2 && v !== '' ? "'" + v : safe_(v))),
    cls: parseInt(String(row[1]), 10) || parseInt(String(row[2]).slice(1, 3), 10) || 999,
    id: String(row[2]),
    time: row[0] instanceof Date ? row[0].getTime() : Number(new Date(row[0])) || 0,
  })).filter(r => r.cells.some(v => v !== '' && v !== null));
  rows.sort((a, b) => a.cls - b.cls || (byId ? a.id.localeCompare(b.id) || a.time - b.time : a.time - b.time || a.id.localeCompare(b.id)));

  const out = [], groups = [];
  rows.forEach((r, i) => {
    if (i && r.cls !== rows[i - 1].cls) out.push(Array(width).fill(''));
    if (!i || r.cls !== rows[i - 1].cls) groups.push({ cls: r.cls, start: out.length, size: 0 });
    groups[groups.length - 1].size++;
    out.push(r.cells);
  });
  const height = Math.max(out.length, last - FIRST_ROW + 1);
  if (FIRST_ROW + height - 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), FIRST_ROW + height - 1 - sheet.getMaxRows());
  const area = sheet.getRange(FIRST_ROW, 1, height, sheet.getMaxColumns());
  area.clearContent().setBackground(null).setFontWeight('normal').setWrap(true).setVerticalAlignment('top');
  if (out.length) sheet.getRange(FIRST_ROW, 1, out.length, width).setValues(out);
  sheet.getRange(FIRST_ROW, 1, height, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  groups.forEach(g => sheet.getRange(FIRST_ROW + g.start, 1, g.size, sheet.getMaxColumns()).setBackground(CLASS_COLORS[g.cls - 1] || OTHER_COLOR));
}

// 제출 ID 칸(맨 오른쪽, 숨김)에서 같은 ID를 찾아 그 보고서의 제출 시각을 돌려줍니다.
function findSubmission_(sheet, idCol, submissionId) {
  const last = sheet.getLastRow();
  if (last < FIRST_ROW) return null;
  const ids = sheet.getRange(FIRST_ROW, idCol, last - FIRST_ROW + 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === submissionId) {
      const time = sheet.getRange(FIRST_ROW + i, 1).getValue();
      return time instanceof Date ? time : new Date();
    }
  }
  return null;
}

// 같은 실험에서 이 학번이 몇 번 제출했는지 셉니다. ‘처음부터’ 다시 해서 낸 새 보고서는 새 줄로 남겨요.
function countSubmissions_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < FIRST_ROW) return 0;
  return sheet.getRange(FIRST_ROW, 3, last - FIRST_ROW + 1, 1).getDisplayValues().filter(row => row[0] === id).length;
}

// 동시에 여러 학생이 제출하거나 선생님이 정렬하는 중에도 한 번에 하나씩만 시트를 고칩니다.
function withLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
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
