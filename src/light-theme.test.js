import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildLightTheme } from '../build/light-theme.mjs';
import { buildDarkDeco } from '../build/dark-deco.mjs';
import { buildUnitArt } from '../build/unit-art.mjs';

// 어두운 테마 CSS를 고치면 밝은 테마도 다시 만들어야 해요: node build/light-theme.mjs
test('밝은 테마(theme-light.css)가 지금 CSS로 만든 것과 같음', () => {
  assert.equal(readFileSync('theme-light.css', 'utf8'), buildLightTheme(), 'node build/light-theme.mjs를 실행해 theme-light.css를 다시 만들어 주세요.');
});

test('밝은 테마의 모든 규칙은 html[data-theme=light] 아래에만 걸려 어두운 테마를 바꾸지 않음', () => {
  const css = readFileSync('theme-light.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '').replace(/@media[^{]*\{/g, '');
  const selectors = css.split('}').map(r => r.split('{')[0].trim()).filter(Boolean).flatMap(s => s.split(','));
  assert.ok(selectors.length > 100);
  for (const s of selectors) assert.match(s.trim(), /^html\[data-theme=light\]/, s);
});

// 실험 무대는 밝은 테마에서도 어두운 바탕 그대로예요. 무대 그림(SVG)의 색을 밝은 바탕용 짙은 색으로 바꾸면 잘 안 보여요(정전기 유도의 쇠숟가락·검전기·장갑에서 있었던 일).
test('밝은 테마는 실험 무대 그림(SVG 요소)의 채우기·선 색을 바꾸지 않음', () => {
  const css = readFileSync('theme-light.css', 'utf8');
  const paint = new Set(css.split('}').filter(r => /(?:^|[;{])\s*(?:fill|stroke):/.test(r)).flatMap(r => [...r.split('{')[0].matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1])));
  const files = [...readdirSync('.').filter(f => f.endsWith('.js') && !f.endsWith('.config.js')), ...readdirSync('src').filter(f => f.endsWith('.js') && !f.endsWith('.test.js')).map(f => `src/${f}`)];
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/<(?:g|path|text|circle|rect|ellipse|line|polygon|polyline|tspan)\b[^>]*?class="([^"$]+)"/g)) {
      for (const c of m[1].split(/\s+/)) assert.ok(!paint.has(c), `${f}: 무대 그림의 ‘.${c}’ 색을 밝은 테마가 바꿔요(build/light-theme.mjs의 SOURCES·SKIP_SELECTOR를 확인해 주세요).`);
    }
  }
});

test('과학의 약속 색은 밝은 테마에서도 그대로: 자석 N극 빨강·S극 파랑, (+)전하 빨강·(−)전하 파랑', () => {
  const css = readFileSync('theme-light.css', 'utf8');
  assert.match(css, /--north:#e03131/);
  assert.match(css, /--south:#1c7ed6/);
  const color = sel => css.match(new RegExp(`${sel.replace(/[.]/g, '\\.')}\\{color:(#[0-9a-f]+)`))[1];
  const hue = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return r > b ? 'red' : 'blue'; };
  assert.equal(hue(color('.positive-text')), 'red');
  assert.equal(hue(color('.negative-text')), 'blue');
});

test('어두운 테마의 우주 장식(theme-dark-deco.css)이 최신이고, 밝은 테마일 때는 걸리지 않음', () => {
  const css = readFileSync('theme-dark-deco.css', 'utf8');
  assert.equal(css, buildDarkDeco(), 'node build/dark-deco.mjs를 실행해 theme-dark-deco.css를 다시 만들어 주세요.');
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '').replace(/@media[^{]*\{/g, '');
  const selectors = body.split('}').map(r => r.split('{')[0].trim()).filter(Boolean).flatMap(s => s.split(','));
  assert.ok(selectors.length > 10);
  for (const s of selectors) assert.match(s.trim(), /^html:not\(\[data-theme=light\]\)/, s);
});

test('단원 그림(theme-unit-art.css)이 최신이고, 8개 단원마다 밝은·어두운 그림이 있으며, 단원 페이지가 단원 번호를 알려 줌', async () => {
  assert.equal(readFileSync('theme-unit-art.css', 'utf8'), buildUnitArt(), 'node build/unit-art.mjs를 실행해 theme-unit-art.css를 다시 만들어 주세요.');
  const css = readFileSync('theme-unit-art.css', 'utf8');
  for (let n = 1; n <= 8; n++) {
    assert.match(css, new RegExp(`html\\[data-theme=light\\] body\\[data-unit="${n}"\\]`));
    assert.match(css, new RegExp(`html:not\\(\\[data-theme=light\\]\\) body\\[data-unit="${n}"\\]`));
    assert.match(readFileSync(`grades/middle-school-2/unit-${n}/index.html`, 'utf8'), new RegExp(`<body[^>]* data-unit="${n}"`));
  }
});
