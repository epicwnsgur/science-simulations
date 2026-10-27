// 단원마다 어울리는 제목 옆 그림: 밝은 테마는 봄(벚꽃·매화·흰머리오목눈이·박새)과 파스텔, 어두운 테마는 별빛 속에 빛나는 선.
// 실행: node build/unit-art.mjs → theme-unit-art.css (src/light-theme.test.js가 최신인지 확인해요)
// 그림은 꾸밈이에요. 다만 과학의 약속은 지켜요: 자석 N 빨강·S 파랑, 프리즘을 지난 빛은 빨강이 덜·보라가 더 꺾임,
// 물 분자는 산소 1개와 수소 2개(굽은 모양), 지층은 아래가 먼저 쌓인 층.
// 단원 번호는 <body data-unit="7">에서 읽어요(단원 페이지는 HTML에, 실험 페이지는 src/lab-shell.js가 붙여요).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { flower, longTailedTit, greatTit, dataUri } from './spring-deco.mjs';
import { headerSpace, seeded } from './dark-deco.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const f = n => +n.toFixed(1);
let rand = seeded(81);

// 테마별 색
const PAL = {
  light: { line: '#8a5470', glass: '#ffffffd9', glassLine: '#d38fb0', soft: '#ffe3ee', a: '#ff9fbf', b: '#9ad9c0', c: '#a9c8ff', d: '#ffd98a', e: '#c9a7ff', red: '#f06a6a', blue: '#5b8def', glow: '' },
  dark: { line: '#9fdcff', glass: '#0d1a3a', glassLine: '#7fe7ff', soft: '#16264f', a: '#ff7ab6', b: '#5dffb0', c: '#38e1ff', d: '#ffd23f', e: '#c77dff', red: '#ff4d5e', blue: '#3d7bff', glow: 'filter="url(#glow)"' },
};
const defs = t => (t === 'dark' ? '<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' : '');
// 어두운 테마의 별, 밝은 테마의 꽃가지(왼쪽 위)
const stars = n => Array.from({ length: n }, () => `<circle cx="${f(rand() * 372)}" cy="${f(rand() * 132)}" r="${f(.5 + rand() * .9)}" fill="${['#ffffff', '#cfe0ff', '#ffe9c4'][Math.floor(rand() * 3)]}" opacity="${f(.35 + rand() * .55)}"/>`).join('');
const sprig = (x, y, s = 1, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})"><path d="M0 0 C18 4 34 14 48 30" fill="none" stroke="#7a5642" stroke-width="2.6" stroke-linecap="round"/><path d="M22 7 C24 -2 30 -6 36 -8" fill="none" stroke="#7a5642" stroke-width="1.8" stroke-linecap="round"/>${flower(36, -8, 6.5, 'plum', 20)}${flower(48, 30, 7, 'cherry', 0)}${flower(16, 4, 6, 'cherry', 40)}</g>`;
const wrap = (t, body) => (rand = seeded(81), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372 132">${defs(t)}${t === 'dark' ? stars(26) : sprig(150, 12, .9)}${body}</svg>`);

/* ---------- I. 물질의 특성: 삼각 플라스크, 비커, 시험관, 거품 ---------- */
function unit1(t) {
  const p = PAL[t];
  const bubbles = [[214, 74, 3], [222, 62, 2.2], [208, 52, 1.8], [300, 70, 2.4], [292, 58, 1.6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${p.c}" stroke-width="1.2" ${p.glow}/>`).join('');
  return wrap(t, `
<path d="M204 30 h20 v22 l26 52 a6 6 0 0 1 -5 9 h-62 a6 6 0 0 1 -5 -9 l26 -52z" fill="${p.glass}" stroke="${p.glassLine}" stroke-width="2"/>
<path d="M194 84 h40 l11 22 a4 4 0 0 1 -3.5 6 h-55 a4 4 0 0 1 -3.5 -6z" fill="${p.a}" opacity="${t === 'dark' ? .75 : .9}" ${p.glow}/>
<path d="M270 52 h56 v58 a4 4 0 0 1 -4 4 h-48 a4 4 0 0 1 -4 -4z" fill="${p.glass}" stroke="${p.glassLine}" stroke-width="2"/><path d="M266 52 h8" stroke="${p.glassLine}" stroke-width="2"/>
<path d="M272 80 h52 v28 a3 3 0 0 1 -3 3 h-46 a3 3 0 0 1 -3 -3z" fill="${p.b}" opacity="${t === 'dark' ? .7 : .9}" ${p.glow}/>
${[64, 74, 84, 94].map(y => `<path d="M310 ${y} h10" stroke="${p.line}" stroke-width="1.2" opacity=".7"/>`).join('')}
<g transform="rotate(18 352 70)"><rect x="344" y="34" width="14" height="66" rx="7" fill="${p.glass}" stroke="${p.glassLine}" stroke-width="2"/><path d="M345 74 h12 v19 a6 6 0 0 1 -12 0z" fill="${p.e}" ${p.glow}/></g>
${bubbles}
${t === 'light' ? greatTit(300, 52, .78, -1) : ''}`);
}
/* ---------- II. 지권의 변화: 습곡된 지층, 화산, 광물 결정 ---------- */
function unit2(t) {
  const p = PAL[t], L = t === 'light';
  const cols = L ? ['#f3d9b1', '#e8b4a0', '#d9c7e8', '#c9dfc0', '#f0c9a0'] : ['#3b2d5c', '#2c3d6b', '#4a2f4a', '#2f4a4a', '#3d3354'];
  // 지층 단면: 위로 볼록하게 휘어진(습곡) 층을 아래부터 차례로 쌓아요. 층의 경계 y = 바닥 − 두께 × 층 번호 − 휜 정도
  const edge = k => { const pts = Array.from({ length: 17 }, (_, i) => { const x = 180 + i * 10.5; return [x, 124 - k * 14 - 16 * Math.sin(Math.PI * i / 16) * (k ? 1 : .2)]; }); return pts; };
  const layers = cols.map((c, k) => { const lo = edge(k), hi = edge(k + 1); return `<path d="M${lo.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} L${hi.reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z" fill="${c}" stroke="${L ? '#b98c78' : '#7f8ad6'}" stroke-width=".8"/>`; }).join('');
  const crystal = (x, y, h, r) => `<path d="M${x} ${y} l${-5} ${-h * .7} l5 ${-h * .3} l5 ${h * .3} l-5 ${h * .7}z" fill="${p.e}" opacity=".85" stroke="${L ? '#9b7fd0' : '#e3c6ff'}" stroke-width="1" transform="rotate(${r} ${x} ${y})" ${p.glow}/>`;
  return wrap(t, `
<path d="M300 58 L330 18 h8 L366 58Z" fill="${L ? '#e6c4b4' : '#2a2140'}" stroke="${L ? '#b98c78' : '#7f8ad6'}" stroke-width="1.2"/>
<path d="M330 18 h8 l-1.5 8 l-3 -3 l-2.5 5z" fill="${L ? '#ff9a8a' : '#ff6a2a'}" ${p.glow}/>
${L ? '<path d="M334 14 C328 6 338 2 334 -6 M340 12 C346 4 342 0 346 -6" stroke="#d8c8d8" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>' : '<path d="M333 16 C329 8 337 4 333 -2" stroke="#ff9a3c" stroke-width="2" fill="none" opacity=".7" filter="url(#glow)"/>'}
${layers}
${crystal(132, 120, 34, -16)}${crystal(144, 120, 44, 0)}${crystal(156, 120, 30, 18)}
${L ? longTailedTit(248, 54, .72, 1) : ''}`);
}
/* ---------- III. 빛과 파동: 프리즘과 무지개, 물결 ---------- */
function unit3(t) {
  const p = PAL[t], L = t === 'light';
  const spectrum = ['#ff5a5a', '#ff9f43', '#ffd93d', '#6bd66b', '#4da3ff', '#5b5bd6', '#a55bd6'];
  // 프리즘을 지난 빛: 빨강은 덜, 보라는 더 꺾여요(빨강이 위, 보라가 아래).
  const fan = spectrum.map((c, i) => `<path d="M246 76 L366 ${f(52 + i * 9)}" stroke="${c}" stroke-width="${L ? 4 : 3}" opacity="${L ? .75 : .9}" stroke-linecap="round" ${p.glow}/>`).join('');
  const wave = `<path d="M150 116 ${Array.from({ length: 8 }, (_, i) => `q8 ${i % 2 ? 12 : -12} 16 0`).join(' ')}" fill="none" stroke="${p.c}" stroke-width="2" opacity=".8" ${p.glow}/>`;
  return wrap(t, `${fan}
<path d="M164 84 L222 74" stroke="${L ? '#f5c84a' : '#ffffff'}" stroke-width="${L ? 6 : 5}" stroke-linecap="round" ${L ? 'opacity=".55"' : p.glow}/><path d="M164 84 L222 74" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
<path d="M234 34 L268 100 H200Z" fill="${L ? '#ffffffcc' : '#7fe7ff22'}" stroke="${p.glassLine}" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M226 52 L238 46" stroke="#ffffff" stroke-width="2" opacity=".7"/>
${wave}
${L ? greatTit(234, 35, .72, 1) : ''}`);
}
/* ---------- IV. 물질의 구성: 원자 모형과 물 분자 ---------- */
function unit4(t) {
  const p = PAL[t], L = t === 'light';
  const orbit = r => `<ellipse cx="210" cy="66" rx="52" ry="18" fill="none" stroke="${p.c}" stroke-width="1.6" transform="rotate(${r} 210 66)" ${p.glow}/>`;
  const electron = (a, r) => { const x = 210 + 52 * Math.cos(a), y = 66 + 18 * Math.sin(a), rr = r * Math.PI / 180; const X = 210 + (x - 210) * Math.cos(rr) - (y - 66) * Math.sin(rr), Y = 66 + (x - 210) * Math.sin(rr) + (y - 66) * Math.cos(rr); return `<circle cx="${f(X)}" cy="${f(Y)}" r="4" fill="${p.c}" ${p.glow}/>`; };
  const nucleus = [[0, 0, p.red], [6, -4, p.line], [-5, -5, p.red], [-6, 4, p.line], [5, 5, p.red], [0, -8, p.line]].map(([x, y, c]) => `<circle cx="${210 + x}" cy="${66 + y}" r="5.5" fill="${c}" stroke="${L ? '#fff' : '#0b1026'}" stroke-width="1"/>`).join('');
  // 물 분자: 산소(크고 빨강) 1개 + 수소(작고 흰색) 2개, 약 104.5°로 굽은 모양
  const water = `<path d="M318 70 L296 92 M318 70 L346 88" stroke="${L ? '#b8a0b0' : '#9fb3ff'}" stroke-width="4" stroke-linecap="round"/><circle cx="318" cy="70" r="15" fill="${L ? '#ff8a8a' : '#ff4d5e'}" stroke="${L ? '#d65a6a' : '#ffb3bd'}" stroke-width="1.4" ${p.glow}/><circle cx="296" cy="92" r="9" fill="#ffffff" stroke="${L ? '#b8a0b0' : '#cfe0ff'}" stroke-width="1.4"/><circle cx="346" cy="88" r="9" fill="#ffffff" stroke="${L ? '#b8a0b0' : '#cfe0ff'}" stroke-width="1.4"/>`;
  return wrap(t, `${orbit(-20)}${orbit(30)}${orbit(85)}${nucleus}${electron(.6, -20)}${electron(2.6, 30)}${electron(4.3, 85)}${water}${L ? longTailedTit(318, 56, .62, -1) : ''}`);
}
/* ---------- V. 식물과 에너지: 해, 잎, 새싹 ---------- */
function unit5(t) {
  const p = PAL[t], L = t === 'light';
  const sun = `<circle cx="330" cy="30" r="15" fill="${p.d}" ${p.glow}/>${Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5; return `<path d="M${f(330 + Math.cos(a) * 20)} ${f(30 + Math.sin(a) * 20)} L${f(330 + Math.cos(a) * 27)} ${f(30 + Math.sin(a) * 27)}" stroke="${p.d}" stroke-width="2.4" stroke-linecap="round"/>`; }).join('')}`;
  const leafCol = L ? '#a8dca0' : '#2fbf7a';
  const leaf = `<path d="M180 116 C186 70 236 40 296 50 C280 96 236 120 180 116Z" fill="${leafCol}" stroke="${L ? '#6fae6a' : '#5dffb0'}" stroke-width="1.6" ${p.glow}/><path d="M180 116 C220 96 254 74 296 50" fill="none" stroke="${L ? '#6fae6a' : '#b8ffe0'}" stroke-width="1.6"/>${[[212, 98, 214, 74], [232, 86, 240, 64], [252, 74, 264, 56], [222, 92, 248, 98], [244, 80, 270, 82]].map(([x1, y1, x2, y2]) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${L ? '#6fae6a' : '#b8ffe0'}" stroke-width="1" opacity=".8"/>`).join('')}`;
  const rays = `<path d="M312 44 L270 72 M318 50 L290 84" stroke="${p.d}" stroke-width="1.6" stroke-dasharray="4 5" opacity=".8"/>`;
  const sprout = `<path d="M146 122 V100" stroke="${L ? '#6fae6a' : '#5dffb0'}" stroke-width="2.4"/><path d="M146 104 C136 98 132 90 134 86 C142 88 146 96 146 104Z M146 100 C156 92 162 90 164 92 C160 100 152 102 146 100Z" fill="${leafCol}" ${p.glow}/><path d="M134 122 h24" stroke="${L ? '#b98c78' : '#7f8ad6'}" stroke-width="3" stroke-linecap="round"/>`;
  return wrap(t, `${sun}${rays}${leaf}${sprout}${L ? greatTit(246, 63, .7, -1) : ''}`);
}
/* ---------- VI. 동물과 에너지: 심장과 혈관, 적혈구 ---------- */
function unit6(t) {
  const p = PAL[t], L = t === 'light';
  const heartCol = L ? '#ff9a9a' : '#ff4d5e';
  const heart = `<path d="M232 112 C196 88 186 66 194 52 C202 38 222 40 232 56 C242 40 262 38 270 52 C278 66 268 88 232 112Z" fill="${heartCol}" stroke="${L ? '#d65a6a' : '#ffb3bd'}" stroke-width="1.6" ${p.glow}/>`;
  // 심장 위쪽의 굵은 혈관: 붉은 동맥(대동맥처럼 위로 올라가 휘어 내려감), 푸른 정맥(위에서 들어옴)
  const vessels = `<path d="M264 54 V22" fill="none" stroke="${L ? '#8fb4ff' : '#5b8dff'}" stroke-width="6" stroke-linecap="round" ${p.glow}/><path d="M240 56 V36 C240 20 222 18 214 30 V40" fill="none" stroke="${L ? '#ff8a8a' : '#ff6a7a'}" stroke-width="7" stroke-linecap="round" ${p.glow}/><path d="M226 22 V12 M234 24 V13 M219 26 V16" stroke="${L ? '#ff8a8a' : '#ff6a7a'}" stroke-width="3" stroke-linecap="round"/>`;
  const rbc = (x, y, r, a) => `<g transform="rotate(${a} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * .62)}" fill="${L ? '#ff8f8f' : '#ff4d5e'}" ${p.glow}/><ellipse cx="${x}" cy="${y}" rx="${f(r * .45)}" ry="${f(r * .22)}" fill="${L ? '#e86a6a' : '#b8203a'}"/></g>`;
  const cells = [[300, 50, 9, -20], [320, 78, 8, 30], [296, 96, 7, 10], [340, 50, 6, 60], [160, 92, 7, -30]].map(c => rbc(...c)).join('');
  const flow = `<path d="M150 70 C180 60 186 100 210 104" fill="none" stroke="${L ? '#ffc2c2' : '#ff8a9a'}" stroke-width="2" stroke-dasharray="3 6" opacity=".8"/>`;
  return wrap(t, `${vessels}${heart}${cells}${flow}${L ? longTailedTit(300, 34, .62, -1) : ''}`);
}
/* ---------- VII. 전기와 자기: 전선 위의 새, 켜진 전구, 나침반 ---------- */
function unit7(t) {
  const p = PAL[t], L = t === 'light';
  const wire = `<path d="M150 30 Q250 52 372 26" fill="none" stroke="${L ? '#7a5642' : '#9fb3ff'}" stroke-width="2.2"/>`;
  const bulb = `<path d="M262 44 V58" stroke="${L ? '#7a5642' : '#9fb3ff'}" stroke-width="2"/><rect x="254" y="58" width="16" height="12" rx="2" fill="${L ? '#c9b8c4' : '#6f7ca3'}"/>${L ? '' : '<circle cx="262" cy="88" r="26" fill="#ffd23f" opacity=".18" filter="url(#glow)"/>'}<path d="M254 70 C238 78 242 104 262 106 C282 104 286 78 270 70Z" fill="${L ? '#fff3c4' : '#ffe27a'}" stroke="${L ? '#e8b84a' : '#fff6c8'}" stroke-width="1.6" ${p.glow}/><path d="M256 92 l3 -8 l3 6 l3 -6 l3 8" fill="none" stroke="${L ? '#e8a030' : '#ff9f1c'}" stroke-width="1.4"/>${L ? '<path d="M240 82 l-8 -3 M236 96 l-9 2 M284 82 l8 -3 M288 96 l9 2" stroke="#f5c84a" stroke-width="2" stroke-linecap="round"/>' : ''}`;
  // 나침반: 바늘의 N극(빨강)
  const compass = `<circle cx="330" cy="92" r="22" fill="${L ? '#fffaf2' : '#0d1a3a'}" stroke="${L ? '#b98c78' : '#7fe7ff'}" stroke-width="2.2" ${p.glow}/>${[0, 90, 180, 270].map(a => `<path d="M330 72 v4" stroke="${p.line}" stroke-width="1.6" transform="rotate(${a} 330 92)"/>`).join('')}<path d="M330 92 L334 92 L330 76 L326 92Z" fill="${p.red}" transform="rotate(28 330 92)"/><path d="M330 92 L334 92 L330 108 L326 92Z" fill="${L ? '#c9c9d6' : '#cfe0ff'}" transform="rotate(28 330 92)"/><circle cx="330" cy="92" r="2.2" fill="${p.line}"/>`;
  return wrap(t, `${wire}${bulb}${compass}${L ? greatTit(206, 43, .72, 1) + longTailedTit(318, 36, .62, -1) : ''}`);
}
/* ---------- VIII. 별과 우주: 밝은 테마는 초승달·별·망원경, 어두운 테마는 블랙홀·우주선·화성 ---------- */
function unit8(t) {
  if (t === 'dark') return headerSpace();
  const star = (x, y, r) => `<path d="M${x} ${y - r} L${f(x + r * .3)} ${f(y - r * .3)} L${x + r} ${y} L${f(x + r * .3)} ${f(y + r * .3)} L${x} ${y + r} L${f(x - r * .3)} ${f(y + r * .3)} L${x - r} ${y} L${f(x - r * .3)} ${f(y - r * .3)}Z" fill="#ffd98a"/>`;
  return wrap(t, `
<path d="M336 22 A26 26 0 1 0 352 68 A20 20 0 1 1 336 22Z" fill="#fff0b8" stroke="#e8c25a" stroke-width="1.4"/>
${star(268, 22, 6)}${star(300, 52, 4)}${star(226, 40, 4.5)}${star(360, 100, 4)}
<g transform="rotate(-28 250 92)"><rect x="214" y="84" width="70" height="16" rx="5" fill="#c9a7ff" stroke="#8a5fc8" stroke-width="1.4"/><rect x="282" y="81" width="10" height="22" rx="3" fill="#a98ae0" stroke="#8a5fc8" stroke-width="1.4"/><rect x="206" y="87" width="10" height="10" rx="2" fill="#a98ae0"/></g>
<path d="M248 98 L232 128 M248 98 L262 128 M248 98 L250 128" stroke="#7a5642" stroke-width="2.4" stroke-linecap="round"/>
${longTailedTit(276, 70, .64, -1)}`);
}

const UNITS = { 1: unit1, 2: unit2, 3: unit3, 4: unit4, 5: unit5, 6: unit6, 7: unit7, 8: unit8 };
export const unitArt = (n, t) => UNITS[n](t);

export function buildUnitArt() {
  const L = 'html[data-theme=light]', D = 'html:not([data-theme=light])';
  const rules = Object.keys(UNITS).flatMap(n => [
    `${L} body[data-unit="${n}"] .intro::after,${L} body[data-unit="${n}"] .hero::after{background-image:${dataUri(unitArt(n, 'light'))}}`,
    `${D} body[data-unit="${n}"] .intro::after,${D} body[data-unit="${n}"] .hero::after{background-image:${dataUri(unitArt(n, 'dark'))}}`,
  ]);
  return `/* 자동으로 만든 파일이에요. 고치려면 build/unit-art.mjs를 고치고 node build/unit-art.mjs를 실행해요. */
/* 단원마다 제목 옆 그림을 바꿔요. 자리·크기·숨기기는 theme-light.css(밝은 테마)와 theme-dark-deco.css(어두운 테마)를 따라요. */
/* 단원 페이지에서는 첫 화면의 큰 은하 그림 대신 단원 그림을 보여 줘요. */
body[data-unit] .galaxy{display:none}
${rules.join('\n')}
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(root, 'theme-unit-art.css'), buildUnitArt());
  console.log('theme-unit-art.css를 만들었어요.');
}
