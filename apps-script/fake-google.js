// Code.gs를 Node에서 시험하기 위한 가짜 구글 시트 환경입니다. 값 읽기·쓰기, 줄 끼워 넣기, 배경색만 흉내 내고 나머지 서식 명령은 무시합니다.
// 실제 시트처럼 ' 로 시작하는 글은 글자로 저장되고, 읽을 때는 ' 를 뺀 값이 나옵니다(=로 시작하면 수식).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const isFormula = v => typeof v === 'string' && v.startsWith('=');
const plain = v => typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
const display = v => v instanceof Date ? v.toISOString() : typeof v === 'boolean' ? String(v).toUpperCase() : String(v ?? '').replace(/^'/, '');

class FakeSheet {
  constructor(name) { this.name = name; this.rows = []; this.colors = []; }
  getName() { return this.name; }
  setName(name) { this.name = name; return this; }
  getMaxColumns() { return 26; }
  appendRow(values) { this.rows.push([...values]); return this; }
  insertRowsBefore(row, n) {
    while (this.colors.length < this.rows.length) this.colors.push(null);
    this.rows.splice(row - 1, 0, ...Array.from({ length: n }, () => []));
    this.colors.splice(row - 1, 0, ...Array(n).fill(null));
    return this;
  }
  insertRowAfter(row) { return this.insertRowsBefore(row + 1, 1); }
  getLastColumn() { return Math.max(0, ...this.rows.map(r => { let n = r.length; while (n && (r[n - 1] === '' || r[n - 1] == null)) n--; return n; })); }
  insertRowsAfter(row, n) { return this; }
  getLastRow() { let n = this.rows.length; while (n && !this.rows[n - 1].some(v => v !== '' && v != null)) n--; return n; }
  getMaxRows() { return Math.max(1000, this.rows.length); }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.rows.length), Math.max(1, ...this.rows.map(r => r.length))); }
  getRange(row, col, numRows = 1, numCols = 1) {
    const sheet = this;
    const cells = () => Array.from({ length: numRows }, (_, r) => Array.from({ length: numCols }, (_, c) => sheet.rows[row - 1 + r]?.[col - 1 + c] ?? ''));
    const range = {
      setValues(values) { values.forEach((v, r) => v.forEach((x, c) => { for (let i = sheet.rows.length; i < row + r; i++) sheet.rows[i] = []; sheet.rows[row - 1 + r][col - 1 + c] = x; })); return proxy; },
      setValue(v) { return range.setValues([[v]]); },
      getValues: () => cells().map(r => r.map(v => isFormula(v) ? '' : plain(v))),
      getValue: () => plain(cells()[0][0]),
      getFormulas: () => cells().map(r => r.map(v => isFormula(v) ? v : '')),
      clearContent() { for (let r = 0; r < numRows; r++) for (let c = 0; c < numCols; c++) if (sheet.rows[row - 1 + r]) sheet.rows[row - 1 + r][col - 1 + c] = ''; return proxy; },
      getDisplayValues: () => cells().map(r => r.map(display)),
      getDisplayValue: () => display(cells()[0][0]),
      setBackground(color) { for (let r = 0; r < numRows; r++) sheet.colors[row - 1 + r] = color; return proxy; },
      check() { return range.setValues(Array.from({ length: numRows }, () => Array(numCols).fill(true))); },
    };
    const proxy = new Proxy(range, { get: (t, k) => t[k] ?? (() => proxy) });
    return proxy;
  }
}

export class FakeSpreadsheet {
  constructor() { this.sheets = [new FakeSheet('시트1')]; this.active = null; this.menu = []; this.alerts = []; }
  getActiveSheet() { return this.active ?? this.sheets[0]; }
  getSheets() { return [...this.sheets]; }
  getSheetByName(name) { return this.sheets.find(s => s.name === name) ?? null; }
  insertSheet(name, index = this.sheets.length) { const sheet = new Proxy(new FakeSheet(name), { get: (t, k) => k in t ? (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) : () => sheet }); this.sheets.splice(index, 0, sheet); return sheet; }
  deleteSheet(sheet) { this.sheets = this.sheets.filter(s => s !== sheet); }
}

// 제출할 때마다 1초씩 흐르는 시계: 같은 순간에 여러 건이 저장되어 순서가 뒤섞이지 않게 합니다.
function tickingDate() {
  let now = Date.UTC(2026, 9, 20, 0, 0, 0);
  return class extends Date { constructor(...args) { if (args.length) super(...args); else super(now += 1000); } };
}

export function loadAppsScript(ss = new FakeSpreadsheet()) {
  const context = vm.createContext({
    Date: tickingDate(),
    console: { log() {}, error() {} },
    SpreadsheetApp: {
      getActive: () => ss,
      getUi: () => ({
        alert: text => ss.alerts.push(text),
        createMenu: title => { const menu = { addItem: (label, fn) => { ss.menu.push([title, label, fn]); return menu; }, addToUi() {} }; return menu; },
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: content => ({ content, setMimeType() { return this; } }),
    },
  });
  vm.runInContext(readFileSync(new URL('./Code.gs', import.meta.url), 'utf8'), context);
  const post = data => JSON.parse(context.doPost({ postData: { contents: typeof data === 'string' ? data : JSON.stringify(data) } }).content);
  return { ss, context, post };
}
