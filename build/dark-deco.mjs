// 어두운 테마의 우주 장식: 블랙홀(첫 화면의 은하 그림과 같은 라벤더·크림빛), 반짝이는 별, 별똥별.
// 색(테마 변수)은 그대로 두고 그림만 더해요. 실행: node build/dark-deco.mjs → theme-dark-deco.css
// (src/light-theme.test.js가 theme-dark-deco.css가 최신인지 확인해요.)
// 모든 규칙은 html:not([data-theme=light]) 아래에만 걸려 밝은 테마에는 나오지 않아요.
// 별 무늬를 내용 아래·바탕 위에 깔려고, 실험 페이지의 바탕(body)을 html로 옮겨 칠해요. 바탕 값은 theme-electric.css·theme-space.css에서 그대로 읽어 와서 색감은 같아요.
import postcss from 'postcss';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { dataUri } from './spring-deco.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const D = 'html:not([data-theme=light])';
const f = n => +n.toFixed(1);
// 늘 같은 그림이 나오도록 정해진 순서의 ‘무작위’ 수를 써요.
// 그림마다 처음부터 다시 시작하므로, 어떤 순서로 만들어도 같은 그림이 나와요.
export const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let rand = seeded(20261027);

// 반짝이는 별(네 갈래 빛)
const sparkle = (x, y, r, c = '#ffffff') => `<path d="M${x} ${f(y - r)} Q${f(x + r * .18)} ${f(y - r * .18)} ${f(x + r)} ${y} Q${f(x + r * .18)} ${f(y + r * .18)} ${x} ${f(y + r)} Q${f(x - r * .18)} ${f(y + r * .18)} ${f(x - r)} ${y} Q${f(x - r * .18)} ${f(y - r * .18)} ${x} ${f(y - r)}Z" fill="${c}"/>`;

// 블랙홀: 첫 화면의 큰 은하 그림(home.css의 .galaxy)과 같은 라벤더·크림빛으로 그려요.
// 검은 그림자(가운데), 그 둘레의 가는 크림빛 고리, 비스듬히 누운 라벤더빛 원반, 은은한 보랏빛 번짐.
export function blackHole(cx, cy, r) {
  const id = `bh${Math.round(cx)}`;
  return `<defs>
<radialGradient id="${id}g"><stop offset=".3" stop-color="#c4a2ef" stop-opacity=".42"/><stop offset=".65" stop-color="#8b72c9" stop-opacity=".14"/><stop offset="1" stop-color="#8b72c9" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}d"><stop offset=".42" stop-color="#f3dfc1" stop-opacity="0"/><stop offset=".5" stop-color="#f3dfc1" stop-opacity=".9"/><stop offset=".62" stop-color="#b79fed" stop-opacity=".7"/><stop offset=".85" stop-color="#8b72c9" stop-opacity=".22"/><stop offset="1" stop-color="#8b72c9" stop-opacity="0"/></radialGradient>
<filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${f(r * .1)}"/></filter></defs>
<circle cx="${cx}" cy="${cy}" r="${f(r * 2.8)}" fill="url(#${id}g)"/>
<g transform="rotate(-18 ${cx} ${cy})">
<ellipse cx="${cx}" cy="${cy}" rx="${f(r * 3.2)}" ry="${f(r * 1.05)}" fill="url(#${id}d)" filter="url(#${id}b)"/>
<circle cx="${cx}" cy="${cy}" r="${f(r * 1.12)}" fill="none" stroke="#ffe3c7" stroke-width="${f(r * .1)}" opacity=".85" filter="url(#${id}b)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#070913"/>
<path d="M${f(cx - r * 2.25)} ${f(cy + r * .1)} A${f(r * 2.25)} ${f(r * .74)} 0 0 0 ${f(cx + r * 2.25)} ${f(cy + r * .1)}" fill="none" stroke="#f3dfc1" stroke-width="${f(r * .16)}" opacity=".75" filter="url(#${id}b)"/></g>`;
}
export function headerSpace() {
  rand = seeded(20261027);
  const stars = Array.from({ length: 26 }, () => `<circle cx="${f(rand() * 372)}" cy="${f(rand() * 132)}" r="${f(.5 + rand() * 1)}" fill="${['#ffffff', '#e6dcff', '#ffe9c4'][Math.floor(rand() * 3)]}" opacity="${f(.4 + rand() * .6)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372 132">${stars}${sparkle(120, 22, 4.5)}${sparkle(352, 104, 3.5, '#e6dcff')}
${blackHole(262, 64, 20)}</svg>`;
}
// 바탕에 까는 별 무늬: 크기가 다른 두 장(300, 470)을 겹쳐 이어 붙여서 같은 무늬가 되풀이되는 것이 잘 보이지 않아요.
export function starTile(size = 300, count = 34, sparkles = []) {
  rand = seeded(size * 7919);
  const stars = Array.from({ length: count }, () => {
    const r = rand() < .12 ? 1.2 + rand() * .6 : .4 + rand() * .7;
    return `<circle cx="${f(rand() * size)}" cy="${f(rand() * size)}" r="${f(r)}" fill="${['#ffffff', '#cfe0ff', '#ffe9c4', '#ffffff'][Math.floor(rand() * 4)]}" opacity="${f(.35 + rand() * .6)}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${stars}${sparkles.map(([x, y, r, c]) => sparkle(x, y, r, c)).join('')}</svg>`;
}
// 소제목 앞의 작은 블랙홀
export const blackHoleIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -18 60 36">${blackHole(0, 0, 6)}</svg>`;

// 실험 페이지 바탕(body)을 그대로 읽어 와요.
function bodyBackground(file, selector) {
  let value = '';
  postcss.parse(readFileSync(join(root, file), 'utf8')).walkRules(rule => {
    if (rule.selector === selector) rule.walkDecls('background', d => { value = d.value.replace(/\s*\n\s*/g, ''); });
  });
  if (!value) throw new Error(`${file}의 ${selector} 바탕을 찾지 못했어요.`);
  return value;
}

export function buildDarkDeco() {
  const electric = bodyBackground('theme-electric.css', 'body');
  // 별과 우주의 바탕은 body.lab-space에 정한 변수(--bg 등)를 쓰지 않고 색을 그대로 적었어요.
  const space = bodyBackground('theme-space.css', 'body.lab-space');
  return `/* 자동으로 만든 파일이에요. 고치려면 build/dark-deco.mjs를 고치고 node build/dark-deco.mjs를 실행해요. */
/* 어두운 테마의 우주 장식: 블랙홀·우주선·화성·반짝이는 별·별똥별. 색은 그대로, 그림만 더해요. */
${D}:has(body.lab-readable){background:${electric};background-attachment:fixed}
${D}:has(body.lab-space){background:${space};background-attachment:fixed}
${D} body.lab-readable,${D} body.lab-space{background:transparent}
${D} body::before{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:${dataUri(starTile(300, 30))},${dataUri(starTile(470, 26, [[330, 120, 3.4], [120, 380, 2.8, '#cfe0ff']]))};background-size:300px 300px,470px 470px;opacity:.8;animation:star-drift 120s linear infinite,star-twinkle 6s ease-in-out infinite alternate}
@keyframes star-drift{from{background-position:0 0,0 0}to{background-position:-300px 150px,-470px 235px}}
@keyframes star-twinkle{from{opacity:.55}to{opacity:.95}}
${D} body::after{content:'';position:fixed;top:12%;left:-20%;z-index:-1;width:180px;height:2px;border-radius:2px;pointer-events:none;background:linear-gradient(90deg,transparent,#cfe0ff 70%,#ffffff);opacity:0;transform:rotate(18deg);animation:shooting-star 16s ease-in 4s infinite}
@keyframes shooting-star{0%{opacity:0;transform:translate(0,0) rotate(18deg)}2%{opacity:.9}7%{opacity:0;transform:translate(60vw,20vw) rotate(18deg)}100%{opacity:0;transform:translate(60vw,20vw) rotate(18deg)}}
${D} .intro,${D} .hero{position:relative}
${D} .intro::after,${D} .hero::after{content:'';position:absolute;right:-8px;top:-18px;width:372px;height:132px;pointer-events:none;background:${dataUri(headerSpace())} no-repeat right top/contain}
${D} .hero::after{top:6px}
/* 첫 화면은 이미 블랙홀 같은 은하 그림(.galaxy)이 있어서 학년·단원 페이지에만 그려요. */
${D} .hero:not(.grade-hero)::after{display:none}
${D} .intro>div{padding-right:340px}
${D} .unit-electric .hero-field,${D} .unit-space .hero-field{top:140px}
${D} .poe-kicker::before{content:'';display:inline-block;width:2.2em;height:1.1em;margin-right:4px;vertical-align:-3px;background:${dataUri(blackHoleIcon())} no-repeat center/contain}
@media(max-width:1000px){${D} .intro::after,${D} .hero::after{width:250px;height:89px;opacity:.85}${D} .intro>div{padding-right:220px}}
@media(max-width:620px){${D} .intro::after,${D} .hero::after{display:none}${D} .intro>div{padding-right:0}}
@media(prefers-reduced-motion:reduce){${D} body::before{animation:none}${D} body::after{display:none}}
@media print{${D} body::before,${D} body::after,${D} .intro::after,${D} .hero::after{display:none}}
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(root, 'theme-dark-deco.css'), buildDarkDeco());
  console.log('theme-dark-deco.css를 만들었어요.');
}
