import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// 사이트 화면에는 그림 에모지(📝 🔒 ⚡ ⭕ 같은 것)를 쓰지 않아요(교사 의견: AI가 만든 느낌이 나요).
// 아이콘이 필요하면 src/icons.js의 선 아이콘(SVG)이나 직접 그린 그림을 써요. 화살표(→ ↑)·체크(✓)·별(✦) 같은 글자 기호는 괜찮아요.
const PICTOGRAPH = /[\u{1F000}-\u{1FAFF}⚠⚡⭐⭕❌✨✏✋⏸⏮⏹⏻➕➖➡⬆⬛✔✘✖✅☝️]/u;
const listJs = dir => readdirSync(dir).filter(f => /\.(js|mjs|css|html)$/.test(f) && !f.endsWith('.test.js') && !f.endsWith('.config.js')).map(f => (dir === '.' ? f : `${dir}/${f}`));
const pages = dir => readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? pages(`${dir}/${d.name}`) : d.name === 'index.html' ? [`${dir}/${d.name}`] : []));

test('사이트 화면(실험, 공통 코드, CSS, 페이지)에 그림 에모지가 없음', () => {
  const files = [...listJs('.'), ...listJs('src'), ...listJs('build'), ...pages('grades'), ...pages('simulations')];
  assert.ok(files.length > 40);
  for (const f of files) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      const hit = line.match(PICTOGRAPH);
      assert.ok(!hit, `${f}:${i + 1}에 그림 에모지(${hit?.[0]})가 있어요. 선 아이콘(src/icons.js)이나 글자로 바꿔 주세요.`);
    });
  }
});
