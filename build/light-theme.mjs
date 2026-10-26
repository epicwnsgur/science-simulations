// 밝은 테마(핑크) 만들기: 어두운 테마 CSS의 색을 규칙에 따라 바꾼 덮어쓰기 CSS(theme-light.css)를 만들어요.
// 실행: node build/light-theme.mjs  (src/light-theme.test.js가 theme-light.css가 최신인지 확인해요)
// 모든 규칙은 html[data-theme=light] 아래에만 걸려서, 어두운 테마(기본)는 그대로예요.
// - 어두운 남색 바탕·선 → 연한 분홍 바탕·선(빨강·초록·노랑 계열 바탕은 색을 지켜 ‘틀림·맞음·강조’ 뜻이 그대로예요)
// - 밝은 글씨 → 짙은 자주(plum) 글씨, 밝은 강조 글씨 → 같은 색의 짙은 글씨(밝은 바탕에서도 읽히게)
// - 전하(+빨강·−파랑), 자석(N 빨강·S 파랑) 같은 과학의 약속 색은 색상(hue)을 바꾸지 않아요.
// - 실험 무대(그림·3D)는 그림의 색이 잘 보이도록 바꾸지 않아요.
// 손으로 다듬은 부분(제목 글씨, 실험 무대 테두리 등)은 맨 아래 MANUAL에 써요.
import postcss from 'postcss';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
export const SOURCES = ['theme-electric.css', 'readable.css', 'induction.css', 'theme-space.css', 'home.css', 'unit-electric.css', 'unit-space.css'];
const P = 'html[data-theme=light]';

// 테마 색 변수: 손으로 고른 핑크 팔레트(분홍 + 자주 + 산호 + 민트).
const VARS = {
  '--ink': '#3d1a33', '--muted': '#6f4462', '--faint': '#8f6683',
  '--bg': '#fff4f8', '--panel': '#ffffff', '--panel-2': '#fff0f6', '--line': '#f3cfe0', '--line-2': '#e8b0c9',
  '--current': '#d6336c', '--current-2': '#e64980', '--volt': '#c2410c', '--volt-2': '#f76707',
  '--north': '#e03131', '--south': '#1c7ed6', '--ok': '#0c8a5a', '--nebula': '#9c36b5',
  '--glow-c': '0 0 0 3px #d6336c22,0 4px 14px #d6336c26', '--glow-v': '0 0 0 3px #c2410c22,0 4px 14px #f7670726',
};
// 별과 우주 단원은 분홍에 보라(라벤더)를 더해요.
const SPACE_VARS = { ...VARS, '--bg': '#fbf5ff', '--panel-2': '#f8f0ff', '--line': '#e9d5f5', '--line-2': '#d4b0ea', '--current': '#c2255c', '--current-2': '#9c36b5', '--volt': '#b35c00', '--volt-2': '#e8590c' };
const ACCENT_VARS = /var\(--(current|current-2|volt|volt-2|ok|north|south|nebula)\)/;
// 실험 무대 안(그림·3D·미리 보기 그림)은 그대로 둬요.
const SKIP_SELECTOR = /\.stage|#scene|\.pv-scene|\.lab3d|#leads|#crossings|\.water-box|\.hero-field|\.photo-card|\.sky-|\.star-viewer|canvas/;

/* ---------- 색 계산 ---------- */
const NAMED = { white: '#ffffff', black: '#000000' };
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function parse(c) {
  c = NAMED[c] ?? c;
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length <= 4) h = [...h].map(v => v + v).join('');
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const [r, g, b, a = 1] = c.replace(/rgba?\(|\)/g, '').split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r, g, b, a };
}
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: s * 100, l: l * 100 };
}
function fromHsl(h, s, l, a = 1) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, f = n => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const hex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}${a < 1 ? hex(a) : ''}`;
}
const PINK = 336;
const isNavy = h => h >= 190 && h <= 262;
const isAccent = ({ s, l }) => s >= 45 && l >= 40 && l <= 85;

// 바탕·선·그림자(role 'bg')의 색
function mapBg(c) {
  const rgb = parse(c), { h, s, l } = toHsl(rgb), a = rgb.a;
  if (isAccent({ s, l })) return c;                                      // 밝은 강조 바탕(노랑 칸, 빛남)은 그대로
  if (l < 45) {
    if (s < 8) return fromHsl(PINK, 45, 35, Math.min(1, a * .35));        // 검은 그림자 → 옅은 분홍 그림자
    const hue = isNavy(h) || (h > 262 && h < 320) ? PINK : h;            // 남색·보라 바탕 → 분홍, 빨강·초록·노랑 바탕은 그 색 그대로
    return fromHsl(hue, hue === PINK ? 72 : Math.max(55, s * .8), 99 - Math.max(0, l - 6) * .7, a);
  }
  if (l > 88 && a < 1) return fromHsl(PINK, 65, 48, a);                 // 흰빛을 살짝 겹친 효과 → 분홍빛을 살짝
  return fromHsl(isNavy(h) ? PINK : h, Math.min(60, s), Math.max(l, 72), a);
}
// 글씨(role 'fg')의 색. onAccent: 같은 규칙의 바탕이 강조색(변수)인지
function mapFg(c, onAccent) {
  const rgb = parse(c), { h, s, l } = toHsl(rgb), a = rgb.a;
  if (onAccent === 'var') return l < 30 ? '#ffffff' : c;                 // 강조색 단추 위 글씨: 강조색이 짙어지니 흰 글씨
  if (onAccent === 'color') return c;                                    // 밝은 강조 바탕은 그대로 두었으니 글씨도 그대로
  if (isAccent({ s, l })) {                                              // 강조 글씨: 같은 색상, 짙게
    const yellow = h >= 38 && h <= 70;
    return fromHsl(yellow ? 32 : h, Math.max(s, 70), Math.min(l, yellow ? 34 : 38), a);
  }
  if (l >= 50) return fromHsl(isNavy(h) || s < 25 ? 322 : h, isNavy(h) || s < 25 ? 38 : 60, Math.min(48, Math.max(16, 100 - l)), a);
  return c;
}
const FG_PROPS = new Set(['color', 'fill', '-webkit-text-fill-color', 'caret-color', 'accent-color', 'stroke']);
const BG_PROPS = /^(background|background-color|background-image|border|border-(top|right|bottom|left)(-color)?|border-color|outline|outline-color|box-shadow|text-decoration-color|column-rule-color)$/;

function mapValue(prop, value, onAccent) {
  if (prop === 'text-shadow') return 'none';
  const fg = FG_PROPS.has(prop);
  if (!fg && !BG_PROPS.test(prop)) return value;
  if (/url\(/.test(value)) value = value.replace(/,?\s*url\([^)]*\)/g, '');
  return value.replace(COLOR_RE, c => (fg ? mapFg(c, onAccent) : mapBg(c)));
}
function prefixSelector(sel) {
  return sel.split(',').map(s => s.trim()).map(s => {
    if (s === ':root' || s === 'html') return P;
    if (s.startsWith('html')) return P + s.slice(4);
    if (s.startsWith(':root')) return P + s.slice(5);
    return `${P} ${s}`;
  }).join(',');
}

export function buildLightTheme() {
  const out = [];
  for (const file of SOURCES) {
    const css = postcss.parse(readFileSync(join(root, file), 'utf8'));
    const parts = [];
    css.walkRules(rule => {
      if (rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
      if (rule.parent.type === 'atrule' && rule.parent.name === 'media' && /print/.test(rule.parent.params)) return;
      if (SKIP_SELECTOR.test(rule.selector)) return;
      const bgDecl = rule.nodes.filter(d => d.type === 'decl' && /^background/.test(d.prop)).map(d => d.value).join(' ');
      const onAccent = ACCENT_VARS.test(bgDecl) ? 'var' : (bgDecl.match(COLOR_RE) ?? []).some(c => isAccent(toHsl(parse(c))) && parse(c).a > .5) ? 'color' : null;
      const space = /lab-space|unit-space/.test(rule.selector);
      const decls = [];
      for (const d of rule.nodes) {
        if (d.type !== 'decl') continue;
        const imp = d.important ? '!important' : '';
        if (d.prop.startsWith('--')) { const v = (space ? SPACE_VARS : VARS)[d.prop]; if (v) decls.push(`${d.prop}:${v}`); continue; }
        if (d.prop === 'color-scheme') { decls.push('color-scheme:light'); continue; }
        // 색과 관련된 선언은 바뀌지 않았어도 함께 옮겨요. 앞에 붙인 html[data-theme=light] 때문에 우선순위가 올라가므로,
        // 원래 CSS의 순서(예: 단추 → 고른 단추)가 밝은 테마에서도 그대로 지켜지게 해요.
        if (!FG_PROPS.has(d.prop) && !BG_PROPS.test(d.prop) && d.prop !== 'text-shadow') continue;
        const v = mapValue(d.prop, d.value, onAccent);
        decls.push(`${d.prop}:${v.trim() || 'none'}${imp}`);
      }
      if (!decls.length) return;
      let text = `${prefixSelector(rule.selector)}{${decls.join(';')}}`;
      if (rule.parent.type === 'atrule') text = `@${rule.parent.name} ${rule.parent.params}{${text}}`;
      parts.push(text);
    });
    out.push(`/* ${file} */`, ...parts);
  }
  return `/* 자동으로 만든 파일이에요. 고치려면 build/light-theme.mjs를 고치고 node build/light-theme.mjs를 실행해요. */\n${out.join('\n')}\n${MANUAL}`;
}

// 손으로 다듬은 부분
const MANUAL = `/* ---------- 손으로 다듬은 부분 ---------- */
${P}{color:var(--ink);background:#fff4f8}
${P} body{background:radial-gradient(900px 500px at 85% -10%,#ffd6e7aa,transparent 60%),radial-gradient(700px 420px at -10% 30%,#f3d9ff88,transparent 60%),radial-gradient(600px 400px at 60% 110%,#ffe3d1aa,transparent 60%),#fff4f8;background-attachment:fixed}
${P} body.lab-space{background:radial-gradient(1000px 520px at 78% -12%,#e9d5ffaa,transparent 62%),radial-gradient(800px 480px at -8% 22%,#ffd6e799,transparent 60%),#fbf5ff;background-attachment:fixed}
${P} .intro h1,${P} h1,${P} body.lab-space .intro h1,${P} body.lab-space h1{background:linear-gradient(100deg,#5c1f4a 0%,#a61e4d 45%,#e64980 75%,#f76707 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
${P} body.lab-space .intro h1,${P} body.lab-space h1{background-image:linear-gradient(100deg,#4a1d6b 0%,#862e9c 45%,#d6336c 80%,#e8590c 100%)}
${P} header::after{background:linear-gradient(90deg,transparent,#f06595,#cc5de8,#ff922b,transparent);background-size:200% 100%}
${P} .stage,${P} .stage.night{border-color:#e8b0c9;box-shadow:0 8px 24px #d6336c1f}
${P} .primary{background:linear-gradient(135deg,#e64980,#cc5de8);border-color:#d6336c;color:#fff}
${P} .primary:hover:enabled{background:linear-gradient(135deg,#d6336c,#ae3ec9)}
${P} .primary.hold[aria-pressed=true]{background:linear-gradient(135deg,#ff922b,#f76707);border-color:#e8590c;color:#fff}
${P} .toast{color:#fff}
${P} .pv-scene{border-color:#e8b0c9}
${P} .site-header{border-bottom-color:#f3cfe0}
${P} .cosmos{background:radial-gradient(ellipse at 77% 30%,#ffc9de88,transparent 46%),radial-gradient(ellipse at 30% 0,#f3d9ff88,transparent 55%)}
${P} .stars{opacity:0}
${P} .galaxy{opacity:.35}
${P} .unit-electric .grade-hero h1,${P} .unit-space .grade-hero h1{color:#5c1f4a;text-shadow:none}
${P} .folder-face,${P} .unit-electric .active-folder .folder-face,${P} .unit-space .active-folder .folder-face{background:linear-gradient(135deg,#ffffff,#fff0f6);border-color:#f0bcd3}
${P} .folder-tab{background:#ffe3ee;border-color:#f0bcd3;color:#a61e4d}
${P} .experiment-art img,${P} .electroscope-art{filter:drop-shadow(0 10px 14px #d6336c33)}
${P} .theme-toggle{background:#fff;border-color:#e8b0c9;color:#a61e4d}
`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(root, 'theme-light.css'), buildLightTheme());
  console.log('theme-light.css를 만들었어요.');
}
