import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// 실험 전용 CSS(공통 CSS 말고 실험 한 곳에서만 쓰는 파일)는 배포하면 공통 CSS보다 나중에 읽혀요.
// 그래서 공통 CSS에 있는 선택자를 다시 쓰면 어두운 테마를 덮어써 글씨가 안 보일 수 있어요(설명하기 안내 상자 사례).
const SHARED = ['style.css', 'poe.css', 'lab.css', 'theme-electric.css', 'readable.css'];
const selectors = css => new Set(css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '').split('}').map(r => r.split('{')[0].trim()).filter(Boolean).flatMap(s => s.split(',').map(v => v.trim())));
test('실험 전용 CSS는 공통 CSS의 선택자를 다시 정하지 않음(배포 화면에서 테마 색이 덮이지 않게)', () => {
  const shared = new Set(SHARED.flatMap(f => [...selectors(readFileSync(f, 'utf8'))]));
  const labs = readdirSync('.').filter(f => f.endsWith('.js') && !f.includes('config'));
  const own = new Set(labs.flatMap(f => [...readFileSync(f, 'utf8').matchAll(/import '\.\/([\w-]+\.css)'/g)].map(m => m[1])).filter(f => !SHARED.includes(f)));
  assert.ok(own.size > 0);
  for (const file of own) {
    const clash = [...selectors(readFileSync(file, 'utf8'))].filter(s => shared.has(s));
    assert.deepEqual(clash, [], `${file}에 공통 선택자가 있어요`);
  }
});
