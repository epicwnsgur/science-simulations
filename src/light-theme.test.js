import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
