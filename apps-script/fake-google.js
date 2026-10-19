// Code.gs를 Node에서 시험하기 위한 가짜 구글 시트 환경입니다. 값 읽기·쓰기, 줄 끼워 넣기, 배경색만 흉내 내고 나머지 서식 명령은 무시합니다.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

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
  getLastRow() { let n = this.rows.length; while (n && !this.rows[n - 1].some(v => v !== '' && v != null)) n--; return n; }
  getMaxRows() { return Math.max(1000, this.rows.length); }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.rows.length), Math.max(1, ...this.rows.map(r => r.length))); }
  getRange(row, col, numRows = 1, numCols = 1) {
    const sheet = this;
    const cells = () => Array.from({ length: numRows }, (_, r) => Array.from({ length: numCols }, (_, c) => sheet.rows[row - 1 + r]?.[col - 1 + c] ?? ''));
    const range = {
      setValues(values) { values.forEach((v, r) => v.forEach((x, c) => { for (let i = sheet.rows.length; i < row + r; i++) sheet.rows[i] = []; sheet.rows[row - 1 + r][col - 1 + c] = x; })); return proxy; },
      setValue(v) { return range.setValues([[v]]); },
      getValues: cells,
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
  constructor() { this.sheets = [new FakeSheet('시트1')]; }
  getSheets() { return [...this.sheets]; }
  getSheetByName(name) { return this.sheets.find(s => s.name === name) ?? null; }
  insertSheet(name, index = this.sheets.length) { const sheet = new Proxy(new FakeSheet(name), { get: (t, k) => k in t ? (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) : () => sheet }); this.sheets.splice(index, 0, sheet); return sheet; }
  deleteSheet(sheet) { this.sheets = this.sheets.filter(s => s !== sheet); }
}

export function loadAppsScript(ss = new FakeSpreadsheet()) {
  const context = vm.createContext({
    console: { log() {}, error() {} },
    SpreadsheetApp: { getActive: () => ss },
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
