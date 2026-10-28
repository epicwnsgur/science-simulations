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
// 한꺼번에 여러 학생이 낼 때: 차례를 기다리는 최대 시간(밀리초). 넘으면 학생 화면이 잠시 뒤 저절로 다시 보내요.
const LOCK_WAIT_MS = 20000;
// 장난 제출 막기(설정 탭에서 바꿀 수 있어요): 같은 학번이 같은 실험에 낼 수 있는 횟수, 다시 내기까지 기다리는 시간(초).
const DEFAULT_MAX_SUBMITS = 3;
const DEFAULT_GAP_SECONDS = 60;
// 뜻 있는 설명의 최소 글자 수(화면은 20자를 요구하고, 여기서는 화면을 우회한 장난 글만 걸러요).
const MIN_MEANINGFUL = 10;

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
  // 예전에 만든 설정 탭에도 새 항목(제출 횟수·간격)을 더해요. 이미 있으면 그대로 둬요.
  const settings = ss.getSheetByName(SETTINGS_SHEET);
  const have = settings.getDataRange().getDisplayValues().map(row => String(row[0]).trim());
  [['같은 실험 최대 제출', DEFAULT_MAX_SUBMITS, '한 학생이 같은 실험 보고서를 몇 번까지 낼 수 있는지예요. 다시 내게 하려면 숫자를 늘려요.'],
    ['다시 제출 간격(초)', DEFAULT_GAP_SECONDS, '같은 학생이 다시 내려면 기다려야 하는 시간이에요. 장난으로 여러 번 내는 것을 막아요.']]
    .filter(row => have.indexOf(row[0]) === -1)
    .forEach(row => settings.appendRow(row));
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
  // 학생이 몰려 제출하는 동안 미뤄 둔 정리를 시트를 열 때 마쳐요.
  try { arrangeDeferred_(); } catch (ignored) { /* 정리는 메뉴로도 할 수 있어요. */ }
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
    if (hasBadWords_(name) || hasBadWords_(data.feedback)) fail_('바르지 않은 말이 있어요. 바른 말로 고쳐 써 주세요.');

    const submissionId = typeof data.submissionId === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(data.submissionId) ? data.submissionId : '';
    const lab = labName_(data.title);
    const sections = readSections_(data);
    const headers = headersFor_(sections, readLabels_(data));
    const cls = Number(id.slice(1, 3));
    return withLock_(() => {
      const sheet = labSheet_(ss, lab, headers);
      const idCol = headers.length;
      if (submissionId) {
        const saved = findSubmission_(sheet, idCol, submissionId);
        if (saved) return json_({ ok: true, duplicate: true, submittedAt: saved.toISOString(), message: name + ' 학생의 ‘' + lab + '’ 보고서는 이미 제출되어 있어요.' });
      }
      checkWriting_(sections);
      const now = new Date();
      // 같은 학번이 같은 실험을 너무 자주, 너무 많이 내지 못하게 해요(장난 제출로 시트가 가득 차지 않게).
      const before = submissionsOf_(sheet, id);
      if (before.count >= settings.maxSubmits) fail_('‘' + lab + '’ 보고서는 이미 ' + before.count + '번 제출했어요. 더 내야 하면 선생님께 말씀드리세요.');
      const wait = Math.ceil(settings.gapSeconds - (now.getTime() - before.last) / 1000);
      if (before.last && wait > 0) fail_('방금 제출했어요. ' + wait + '초 뒤에 다시 낼 수 있어요.');
      const count = before.count + 1;
      const row = [now, cls + '반', "'" + id, name, count];
      sections.forEach(s => SECTION_FIELDS.forEach(f => row.push(s[f[0]])));
      row.push(clean_(data.feedback, MAX_TEXT), submissionId);
      sheet.getRange(Math.max(sheet.getLastRow() + 1, FIRST_ROW), 1, 1, row.length).setValues([row.map(safe_)]);
      // 반별 정리는 시간이 걸려요. 차례를 기다리는 학생이 있으면 미뤄 두고, 마지막으로 낸 학생 때 한 번에 정리해요.
      if (waiting_() > 0) defer_(sheet.getName());
      else { arrange_(sheet); arrangeDeferred_(sheet.getName()); }
      return json_({ ok: true, count: count, submittedAt: now.toISOString(), message: name + ' 학생의 ‘' + lab + '’ 보고서를 제출했어요.' + (count > 1 ? ' (' + count + '번째 제출)' : '') });
    });
  } catch (err) {
    if (err.busy) return json_({ ok: false, retry: true, message: '제출하는 친구들이 많아요. 잠시 뒤 다시 보내 주세요.' });
    if (!err.forStudent) console.error(err);
    // 학생 잘못이 아닌 오류(시트가 잠깐 바쁨 등)는 화면이 저절로 다시 보내 봐요.
    if (err.forStudent) return json_({ ok: false, message: err.message });
    return json_({ ok: false, retry: true, message: '제출을 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.' });
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

// 수업 모형(예: 발생 학습, 비유 활용)에 따라 칸 이름이 다를 수 있어요. 페이지가 fieldLabels를 보내면 새 탭의 머리글에 써요.
// 칸의 순서와 저장되는 내용은 늘 같아요(처음 생각 → 그 까닭 → 탐구·관찰 → 설명). 이미 있는 탭의 머리글은 바꾸지 않아요.
function readLabels_(data) {
  const given = data && typeof data.fieldLabels === 'object' && data.fieldLabels ? data.fieldLabels : {};
  const out = {};
  SECTION_FIELDS.forEach(f => { out[f[0]] = (typeof given[f[0]] === 'string' ? clean_(given[f[0]], 20).replace(/[\[\]]/g, '') : '') || f[1]; });
  return out;
}

function headersFor_(sections, labels) {
  const headers = BASE_HEADERS.slice();
  const nameOf = f => (labels && labels[f[0]]) || f[1];
  sections.forEach(s => SECTION_FIELDS.forEach(f => headers.push(s.name ? '[' + s.name + '] ' + nameOf(f) : nameOf(f))));
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
  const number = (v, fallback) => { const n = Number(v); return v !== undefined && v !== '' && isFinite(n) && n >= 0 ? n : fallback; };
  return {
    code: values['수업 코드'] || '', open: String(values['제출 받기']).toUpperCase() === 'TRUE',
    maxSubmits: number(values['같은 실험 최대 제출'], DEFAULT_MAX_SUBMITS) || DEFAULT_MAX_SUBMITS,
    gapSeconds: number(values['다시 제출 간격(초)'], DEFAULT_GAP_SECONDS),
  };
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

// 같은 실험에서 이 학번이 몇 번 제출했는지와 마지막 제출 시각(밀리초)을 셉니다. ‘처음부터’ 다시 해서 낸 새 보고서는 새 줄로 남겨요.
function submissionsOf_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < FIRST_ROW) return { count: 0, last: 0 };
  const rows = sheet.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, 3).getValues();
  let count = 0, latest = 0;
  rows.forEach(row => {
    if (String(row[2]).replace(/^'/, '') !== id) return;
    count++;
    const t = row[0] instanceof Date ? row[0].getTime() : Number(new Date(row[0])) || 0;
    if (t > latest) latest = t;
  });
  return { count: count, last: latest };
}

// 동시에 여러 학생이 제출하거나 선생님이 정렬하는 중에도 한 번에 하나씩만 시트를 고칩니다.
// 차례를 오래 기다리면(학생이 아주 많이 몰리면) busy 오류로 끝내고, 학생 화면이 잠시 뒤 다시 보내요.
// 기다리는 학생 수는 캐시에 어림해 두어, 반별 정리를 미룰지 정해요(정확하지 않아도 마지막에 다시 정리돼요).
function withLock_(work) {
  const lock = LockService.getScriptLock();
  changeWaiting_(1);
  let got = false;
  try { got = lock.tryLock(LOCK_WAIT_MS); } finally { changeWaiting_(-1); }
  if (!got) { const err = new Error('busy'); err.busy = true; throw err; }
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}
const cache_ = () => CacheService.getScriptCache();
function waiting_() { return Math.max(0, Number(cache_().get('waiting')) || 0); }
function changeWaiting_(d) { cache_().put('waiting', String(Math.max(0, waiting_() + d)), 120); }
function deferred_() { try { return JSON.parse(cache_().get('deferred') || '[]'); } catch (ignored) { return []; } }
function defer_(name) { const list = deferred_(); if (list.indexOf(name) === -1) list.push(name); cache_().put('deferred', JSON.stringify(list), 21600); }
// 미뤄 둔 탭을 정리해요(done: 방금 정리한 탭 이름). 잠금 안에서 부르거나, 시트를 열 때 따로 잠가서 불러요.
function arrangeDeferred_(done) {
  const list = deferred_();
  if (!list.length) return;
  const run = () => {
    const ss = SpreadsheetApp.getActive();
    deferred_().filter(name => name !== done).forEach(name => { const sheet = ss.getSheetByName(name); if (sheet && isLabSheet_(sheet)) arrange_(sheet); });
    cache_().remove('deferred');
  };
  if (done === undefined) withLock_(run); else run();
}

// 학생 글 거르기(src/text-guard.js와 같은 규칙): 바르지 않은 말, 뜻 없는 설명(ㅋㅋㅋ, 같은 말 되풀이).
const BAD_WORDS_ = /씨발|시발(?!점)|씨팔|시팔|ㅅㅂ|ㅆㅂ|병신|븅신|ㅂㅅ|개새|새끼|좆|존나|지랄|ㅈㄹ|닥쳐|미친놈|미친년|엿\s?먹|fuck|shit|bitch/i;
function hasBadWords_(text) { return BAD_WORDS_.test(String(text == null ? '' : text)); }
// 자주 쓰는 한글 2,350자(KS X 1001 완성형: 사용 빈도가 높은 글자를 가려 뽑은 표준 글자 묶음).
// 교과서·지도서·이 사이트의 글에는 이 밖의 글자가 하나도 없어요. 이 밖의 글자(잫, 젛, 덯, 됬)는 자판을 마구 치거나 오타를 낸 글에서 나와요.
const COMMON_HANGUL = '가각간갇갈갉갊감갑값갓갔강갖갗같갚갛개객갠갤갬갭갯갰갱갸갹갼걀걋걍걔걘걜거걱건걷걸걺검겁것겄겅겆겉겊겋게겐겔겜겝겟겠겡겨격겪견겯결겸겹겻겼경곁계곈곌곕곗고곡곤곧골곪곬곯곰곱곳공곶과곽관괄괆괌괍괏광괘괜괠괩괬괭괴괵괸괼굄굅굇굉교굔굘굡굣구국군굳굴굵굶굻굼굽굿궁궂궈궉권궐궜궝궤궷귀귁귄귈귐귑귓규균귤그극근귿글긁금급긋긍긔기긱긴긷길긺김깁깃깅깆깊까깍깎깐깔깖깜깝깟깠깡깥깨깩깬깰깸깹깻깼깽꺄꺅꺌꺼꺽꺾껀껄껌껍껏껐껑께껙껜껨껫껭껴껸껼꼇꼈꼍꼐꼬꼭꼰꼲꼴꼼꼽꼿꽁꽂꽃꽈꽉꽐꽜꽝꽤꽥꽹꾀꾄꾈꾐꾑꾕꾜꾸꾹꾼꿀꿇꿈꿉꿋꿍꿎꿔꿜꿨꿩꿰꿱꿴꿸뀀뀁뀄뀌뀐뀔뀜뀝뀨끄끅끈끊끌끎끓끔끕끗끙끝끼끽낀낄낌낍낏낑나낙낚난낟날낡낢남납낫났낭낮낯낱낳내낵낸낼냄냅냇냈냉냐냑냔냘냠냥너넉넋넌널넒넓넘넙넛넜넝넣네넥넨넬넴넵넷넸넹녀녁년녈념녑녔녕녘녜녠노녹논놀놂놈놉놋농높놓놔놘놜놨뇌뇐뇔뇜뇝뇟뇨뇩뇬뇰뇹뇻뇽누눅눈눋눌눔눕눗눙눠눴눼뉘뉜뉠뉨뉩뉴뉵뉼늄늅늉느늑는늘늙늚늠늡늣능늦늪늬늰늴니닉닌닐닒님닙닛닝닢다닥닦단닫달닭닮닯닳담답닷닸당닺닻닿대댁댄댈댐댑댓댔댕댜더덕덖던덛덜덞덟덤덥덧덩덫덮데덱덴델뎀뎁뎃뎄뎅뎌뎐뎔뎠뎡뎨뎬도독돈돋돌돎돐돔돕돗동돛돝돠돤돨돼됐되된될됨됩됫됴두둑둔둘둠둡둣둥둬뒀뒈뒝뒤뒨뒬뒵뒷뒹듀듄듈듐듕드득든듣들듦듬듭듯등듸디딕딘딛딜딤딥딧딨딩딪따딱딴딸땀땁땃땄땅땋때땍땐땔땜땝땟땠땡떠떡떤떨떪떫떰떱떳떴떵떻떼떽뗀뗄뗌뗍뗏뗐뗑뗘뗬또똑똔똘똥똬똴뙈뙤뙨뚜뚝뚠뚤뚫뚬뚱뛔뛰뛴뛸뜀뜁뜅뜨뜩뜬뜯뜰뜸뜹뜻띄띈띌띔띕띠띤띨띰띱띳띵라락란랄람랍랏랐랑랒랖랗래랙랜랠램랩랫랬랭랴략랸럇량러럭런럴럼럽럿렀렁렇레렉렌렐렘렙렛렝려력련렬렴렵렷렸령례롄롑롓로록론롤롬롭롯롱롸롼뢍뢨뢰뢴뢸룀룁룃룅료룐룔룝룟룡루룩룬룰룸룹룻룽뤄뤘뤠뤼뤽륀륄륌륏륑류륙륜률륨륩륫륭르륵른를름릅릇릉릊릍릎리릭린릴림립릿링마막만많맏말맑맒맘맙맛망맞맡맣매맥맨맬맴맵맷맸맹맺먀먁먈먕머먹먼멀멂멈멉멋멍멎멓메멕멘멜멤멥멧멨멩며멱면멸몃몄명몇몌모목몫몬몰몲몸몹못몽뫄뫈뫘뫙뫼묀묄묍묏묑묘묜묠묩묫무묵묶문묻물묽묾뭄뭅뭇뭉뭍뭏뭐뭔뭘뭡뭣뭬뮈뮌뮐뮤뮨뮬뮴뮷므믄믈믐믓미믹민믿밀밂밈밉밋밌밍및밑바박밖밗반받발밝밞밟밤밥밧방밭배백밴밸뱀뱁뱃뱄뱅뱉뱌뱍뱐뱝버벅번벋벌벎범법벗벙벚베벡벤벧벨벰벱벳벴벵벼벽변별볍볏볐병볕볘볜보복볶본볼봄봅봇봉봐봔봤봬뵀뵈뵉뵌뵐뵘뵙뵤뵨부북분붇불붉붊붐붑붓붕붙붚붜붤붰붸뷔뷕뷘뷜뷩뷰뷴뷸븀븃븅브븍븐블븜븝븟비빅빈빌빎빔빕빗빙빚빛빠빡빤빨빪빰빱빳빴빵빻빼빽뺀뺄뺌뺍뺏뺐뺑뺘뺙뺨뻐뻑뻔뻗뻘뻠뻣뻤뻥뻬뼁뼈뼉뼘뼙뼛뼜뼝뽀뽁뽄뽈뽐뽑뽕뾔뾰뿅뿌뿍뿐뿔뿜뿟뿡쀼쁑쁘쁜쁠쁨쁩삐삑삔삘삠삡삣삥사삭삯산삳살삵삶삼삽삿샀상샅새색샌샐샘샙샛샜생샤샥샨샬샴샵샷샹섀섄섈섐섕서석섞섟선섣설섦섧섬섭섯섰성섶세섹센셀셈셉셋셌셍셔셕션셜셤셥셧셨셩셰셴셸솅소속솎손솔솖솜솝솟송솥솨솩솬솰솽쇄쇈쇌쇔쇗쇘쇠쇤쇨쇰쇱쇳쇼쇽숀숄숌숍숏숑수숙순숟술숨숩숫숭숯숱숲숴쉈쉐쉑쉔쉘쉠쉥쉬쉭쉰쉴쉼쉽쉿슁슈슉슐슘슛슝스슥슨슬슭슴습슷승시식신싣실싫심십싯싱싶싸싹싻싼쌀쌈쌉쌌쌍쌓쌔쌕쌘쌜쌤쌥쌨쌩썅써썩썬썰썲썸썹썼썽쎄쎈쎌쏀쏘쏙쏜쏟쏠쏢쏨쏩쏭쏴쏵쏸쐈쐐쐤쐬쐰쐴쐼쐽쑈쑤쑥쑨쑬쑴쑵쑹쒀쒔쒜쒸쒼쓩쓰쓱쓴쓸쓺쓿씀씁씌씐씔씜씨씩씬씰씸씹씻씽아악안앉않알앍앎앓암압앗았앙앝앞애액앤앨앰앱앳앴앵야약얀얄얇얌얍얏양얕얗얘얜얠얩어억언얹얻얼얽얾엄업없엇었엉엊엌엎에엑엔엘엠엡엣엥여역엮연열엶엷염엽엾엿였영옅옆옇예옌옐옘옙옛옜오옥온올옭옮옰옳옴옵옷옹옻와왁완왈왐왑왓왔왕왜왝왠왬왯왱외왹왼욀욈욉욋욍요욕욘욜욤욥욧용우욱운울욹욺움웁웃웅워웍원월웜웝웠웡웨웩웬웰웸웹웽위윅윈윌윔윕윗윙유육윤율윰윱윳융윷으윽은을읊음읍읏응읒읓읔읕읖읗의읜읠읨읫이익인일읽읾잃임입잇있잉잊잎자작잔잖잗잘잚잠잡잣잤장잦재잭잰잴잼잽잿쟀쟁쟈쟉쟌쟎쟐쟘쟝쟤쟨쟬저적전절젊점접젓정젖제젝젠젤젬젭젯젱져젼졀졈졉졌졍졔조족존졸졺좀좁좃종좆좇좋좌좍좔좝좟좡좨좼좽죄죈죌죔죕죗죙죠죡죤죵주죽준줄줅줆줌줍줏중줘줬줴쥐쥑쥔쥘쥠쥡쥣쥬쥰쥴쥼즈즉즌즐즘즙즛증지직진짇질짊짐집짓징짖짙짚짜짝짠짢짤짧짬짭짯짰짱째짹짼쨀쨈쨉쨋쨌쨍쨔쨘쨩쩌쩍쩐쩔쩜쩝쩟쩠쩡쩨쩽쪄쪘쪼쪽쫀쫄쫌쫍쫏쫑쫓쫘쫙쫠쫬쫴쬈쬐쬔쬘쬠쬡쭁쭈쭉쭌쭐쭘쭙쭝쭤쭸쭹쮜쮸쯔쯤쯧쯩찌찍찐찔찜찝찡찢찧차착찬찮찰참찹찻찼창찾채책챈챌챔챕챗챘챙챠챤챦챨챰챵처척천철첨첩첫첬청체첵첸첼쳄쳅쳇쳉쳐쳔쳤쳬쳰촁초촉촌촐촘촙촛총촤촨촬촹최쵠쵤쵬쵭쵯쵱쵸춈추축춘출춤춥춧충춰췄췌췐취췬췰췸췹췻췽츄츈츌츔츙츠측츤츨츰츱츳층치칙친칟칠칡침칩칫칭카칵칸칼캄캅캇캉캐캑캔캘캠캡캣캤캥캬캭컁커컥컨컫컬컴컵컷컸컹케켁켄켈켐켑켓켕켜켠켤켬켭켯켰켱켸코콕콘콜콤콥콧콩콰콱콴콸쾀쾅쾌쾡쾨쾰쿄쿠쿡쿤쿨쿰쿱쿳쿵쿼퀀퀄퀑퀘퀭퀴퀵퀸퀼큄큅큇큉큐큔큘큠크큭큰클큼큽킁키킥킨킬킴킵킷킹타탁탄탈탉탐탑탓탔탕태택탠탤탬탭탯탰탱탸턍터턱턴털턺텀텁텃텄텅테텍텐텔템텝텟텡텨텬텼톄톈토톡톤톨톰톱톳통톺톼퇀퇘퇴퇸툇툉툐투툭툰툴툼툽툿퉁퉈퉜퉤튀튁튄튈튐튑튕튜튠튤튬튱트특튼튿틀틂틈틉틋틔틘틜틤틥티틱틴틸팀팁팃팅파팍팎판팔팖팜팝팟팠팡팥패팩팬팰팸팹팻팼팽퍄퍅퍼퍽펀펄펌펍펏펐펑페펙펜펠펨펩펫펭펴편펼폄폅폈평폐폘폡폣포폭폰폴폼폽폿퐁퐈퐝푀푄표푠푤푭푯푸푹푼푿풀풂품풉풋풍풔풩퓌퓐퓔퓜퓟퓨퓬퓰퓸퓻퓽프픈플픔픕픗피픽핀필핌핍핏핑하학한할핥함합핫항해핵핸핼햄햅햇했행햐향허헉헌헐헒험헙헛헝헤헥헨헬헴헵헷헹혀혁현혈혐협혓혔형혜혠혤혭호혹혼홀홅홈홉홋홍홑화확환활홧황홰홱홴횃횅회획횐횔횝횟횡효횬횰횹횻후훅훈훌훑훔훗훙훠훤훨훰훵훼훽휀휄휑휘휙휜휠휨휩휫휭휴휵휸휼흄흇흉흐흑흔흖흗흘흙흠흡흣흥흩희흰흴흼흽힁히힉힌힐힘힙힛힝';
// ‘모르겠어요’와 그 오타(모루겟어요, 묘루겟어요, 몰라요, 모름)는 내 생각이 아니므로 글자 수에 세지 않아요.
const DONT_KNOW = /(?:잘\s*)?(?:(?:[모묘무머뭐][르루러로를흐]|몰[르루]?)[겠겟갰갯게개것겄]|몰라|모름)[가-힣]{0,3}/g;
// 뜻 없는 글을 찾아 안내 글을 돌려줘요(없으면 ''). junkProblem은 apps-script/Code.gs와 똑같아야 해요(src/text-guard.test.js가 확인해요).
// 뜻 없는 글을 거르는 도구들이 흔히 쓰는 규칙(같은 글자 되풀이, 자판 마구 치기, 잘 쓰지 않는 글자)을 한글에 맞게 골랐어요.
function junkProblem(text) {
  // 한글을 치는 중이면 마지막 글자가 아직 자음·모음일 수 있어요. 마지막 한 글자는 봐줘요.
  // ‘ㄱ자 유리관’, ‘ㄱ. ㄴ.’처럼 보기 기호로 쓴 자음은 받아요.
  const s = String(text == null ? '' : text).replace(/[ㄱ-ㅣ]$/, '').replace(/(^|[^가-힣ㄱ-ㅣ])[ㄱ-ㅎ](?=자|[.,)])/g, '$1');
  // ① 자음이나 모음만 따로 쓴 글자(ㅛ, ㅁㅁㅁ, ㅋㅋ, ㅠㅠ)
  const jamo = s.match(/[ㄱ-ㆎᄀ-ᇿ]/g);
  if (jamo) return '‘' + Array.from(new Set(jamo)).slice(0, 4).join('’, ‘') + '’처럼 자음이나 모음만 따로 쓴 글자가 있어요. 완성된 글자로 바르게 고쳐 써 주세요.';
  // ② 잘 쓰지 않는 글자(잫, 젛, 덯)
  const rare = Array.from(s).filter(c => c >= '가' && c <= '힣' && COMMON_HANGUL.indexOf(c) < 0);
  if (rare.length) return '‘' + Array.from(new Set(rare)).slice(0, 4).join('’, ‘') + '’처럼 잘 쓰지 않는 글자가 있어요. 자판을 마구 치거나 오타를 낸 곳을 바르게 고쳐 써 주세요.' + (rare.indexOf('됬') >= 0 ? ' (‘됬’은 ‘됐’으로 써요.)' : '');
  // ③ 문장이 끝난 뒤에 덧붙인 글자(‘같습니당다가가’, ‘같습니다다다수구’)
  if (/니[다당](?!만)[가-힣]/.test(s)) return '문장이 끝난 뒤(‘…습니다’)에 뜻 없는 글자를 덧붙였어요. 덧붙인 글자를 지우고 내 생각을 문장으로 더 써 주세요.';
  // ④ 같은 글자를 세 번 넘게 이어 쓴 곳(다다다, 아아아)
  const run = s.match(/(\p{L})\1{2,}/u);
  if (run) return '‘' + run[0].slice(0, 5) + '’처럼 같은 글자를 이어서 여러 번 썼어요. 뜻이 통하는 문장으로 써 주세요.';
  // ⑤ 영어 자판으로 친 한글(dkssudgktpdy)이나 자판 줄을 따라 친 글자(asdf, qwer)
  if (/[b-df-hj-np-tv-xz]{5,}|qwer|asdf|zxcv/i.test(s)) return '자판을 마구 치거나 영어 자판으로 친 것 같은 글자가 있어요. 한글 자판으로 바꿔 내 생각을 문장으로 써 주세요.';
  return '';
}
function meaningfulLength_(text) {
  return String(text == null ? '' : text).replace(DONT_KNOW, '').replace(/[^\p{L}\p{N}\u2460-\u24ff\u3200-\u32ff]/gu, '').replace(/[ㄱ-ㅎㅏ-ㅣ]/g, '').replace(/(\D)\1{2,}/gu, '$1').length;
}
function repetitive_(text) {
  return repeatedText_(String(text == null ? '' : text).replace(/[^\p{L}\p{N}\u2460-\u24ff\u3200-\u32ff]/gu, ''));
}
function repeatedText_(s) {
  if (s.length < 12) return false;
  // ① 서로 다른 글자가 너무 적어요(예: ‘모르겟어여모르겟어요…’는 7가지 글자뿐이에요).
  if (new Set(s).size < 8) return true;
  // ② 서로 다른 두 글자 묶음이 너무 적어요(예: ‘가나다가나다가나다…’).
  const pairs = new Set();
  for (let i = 0; i < s.length - 1; i++) pairs.add(s.slice(i, i + 2));
  if (pairs.size / (s.length - 1) < 0.3) return true;
  // ③ 같은 말 덩어리가 글의 많은 부분을 차지해요. 오타를 섞어 되풀이해도(모르겟어여·모르겟어요·모르겟아여) 같은 덩어리(모르겟)가 남아요.
  //    2~4글자 덩어리가 세 번 이상 나와 글의 45% 이상이면 되풀이예요.
  //    5~10글자 덩어리(문장 조각)는 두 번 이상 나오고, 그 덩어리를 빼면 남는 글이 30%도 안 될 때만 되풀이예요.
  //    (측정값을 나열한 글은 ‘일 때 빛의 세기는’처럼 문장 틀이 되풀이되어도 사이사이 값이 남아서 막지 않아요.)
  for (let k = 2; k <= 10; k++) {
    const seen = new Set();
    for (let i = 0; i + k <= s.length; i++) {
      const unit = s.slice(i, i + k);
      if (seen.has(unit)) continue;
      seen.add(unit);
      const count = s.split(unit).length - 1;
      if (k <= 4 ? count >= 3 && count * k >= s.length * 0.45 : count >= 2 && s.length - count * k < s.length * 0.3) return true;
    }
  }
  return false;
}
function checkWriting_(sections) {
  sections.forEach(s => {
    if (SECTION_FIELDS.some(f => hasBadWords_(s[f[0]]))) fail_('바르지 않은 말이 있어요. 바른 말로 고쳐 써 주세요.');
    SECTION_FIELDS.forEach(f => { const junk = junkProblem(s[f[0]]); if (junk) fail_(f[1] + ': ' + junk); });
    if (meaningfulLength_(s.explanation) < MIN_MEANINGFUL || repetitive_(s.explanation)) fail_('설명이 뜻이 통하는 문장이 아니에요. 내 생각을 문장으로 다시 써 주세요.');
  });
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
