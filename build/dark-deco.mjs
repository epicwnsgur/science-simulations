// 어두운 테마의 우주 장식: 블랙홀(가르강튀아 느낌), 우주선(인듀어런스호 느낌), 화성(마션 느낌), 반짝이는 별, 별똥별.
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
const rand = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(20261027);

// 반짝이는 별(네 갈래 빛)
const sparkle = (x, y, r, c = '#ffffff') => `<path d="M${x} ${f(y - r)} Q${f(x + r * .18)} ${f(y - r * .18)} ${f(x + r)} ${y} Q${f(x + r * .18)} ${f(y + r * .18)} ${x} ${f(y + r)} Q${f(x - r * .18)} ${f(y + r * .18)} ${f(x - r)} ${y} Q${f(x - r * .18)} ${f(y - r * .18)} ${x} ${f(y - r)}Z" fill="${c}"/>`;

// 블랙홀: 검은 그림자, 그 둘레를 휘어 감싼 빛의 고리(중력 렌즈), 앞을 가로지르는 납작한 강착 원반.
export function blackHole(cx, cy, r) {
  const id = `bh${Math.round(cx)}`;
  return `<defs>
<radialGradient id="${id}g"><stop offset=".35" stop-color="#ff9a3c" stop-opacity=".55"/><stop offset=".7" stop-color="#ff6a2a" stop-opacity=".14"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}d" x1="0" x2="1"><stop offset="0" stop-color="#ffb35c" stop-opacity="0"/><stop offset=".22" stop-color="#ffcf8a"/><stop offset=".5" stop-color="#fff4dc"/><stop offset=".78" stop-color="#ffcf8a"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></linearGradient>
<filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${f(r * .12)}"/></filter></defs>
<circle cx="${cx}" cy="${cy}" r="${f(r * 2.6)}" fill="url(#${id}g)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${f(r * 3.4)}" ry="${f(r * .32)}" fill="none" stroke="url(#${id}d)" stroke-width="${f(r * .3)}" filter="url(#${id}b)" opacity=".85"/>
<circle cx="${cx}" cy="${cy}" r="${f(r * 1.32)}" fill="none" stroke="#ffc884" stroke-width="${f(r * .34)}" filter="url(#${id}b)" opacity=".9"/>
<circle cx="${cx}" cy="${cy}" r="${f(r * 1.06)}" fill="none" stroke="#fff3d8" stroke-width="${f(r * .07)}"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000"/>
<path d="M${f(cx - r * 3.4)} ${cy} A${f(r * 3.4)} ${f(r * .32)} 0 0 0 ${f(cx + r * 3.4)} ${cy}" fill="none" stroke="url(#${id}d)" stroke-width="${f(r * .34)}"/>
<path d="M${f(cx - r * 3.1)} ${f(cy + r * .05)} A${f(r * 3.1)} ${f(r * .26)} 0 0 0 ${f(cx + r * 3.1)} ${f(cy + r * .05)}" fill="none" stroke="#fff8ea" stroke-width="${f(r * .07)}" opacity=".8"/>`;
}
// 바퀴 모양 우주선: 가운데 고리를 따라 작은 모듈 12개가 둘러 있어요.
export function ringShip(cx, cy, r, tilt = -18) {
  const mods = Array.from({ length: 12 }, (_, i) => `<rect x="${f(-r * .2)}" y="${f(-r - r * .16)}" width="${f(r * .4)}" height="${f(r * .32)}" rx="${f(r * .06)}" fill="${i % 3 ? '#c9d2e6' : '#e8edf8'}" stroke="#7f8aa6" stroke-width=".5" transform="rotate(${i * 30})"/>`).join('');
  return `<g transform="translate(${cx} ${cy}) rotate(${tilt}) scale(1 .55)"><circle r="${r}" fill="none" stroke="#9aa6c4" stroke-width="${f(r * .1)}"/>${mods}<path d="M${-r} 0H${r}M0 ${-r}V${r}" stroke="#8b96b3" stroke-width="${f(r * .05)}"/><circle r="${f(r * .22)}" fill="#dfe6f5" stroke="#7f8aa6" stroke-width=".6"/></g><circle cx="${f(cx + r * .9)}" cy="${f(cy - r * .2)}" r="1.2" fill="#7fe7ff"/>`;
}
// 화성: 붉은 행성, 어두운 협곡 무늬, 흰 극관, 얇은 대기 빛.
export function mars(cx, cy, r) {
  return `<defs><radialGradient id="mars" cx=".35" cy=".32" r=".8"><stop offset="0" stop-color="#ffb07a"/><stop offset=".45" stop-color="#e0683a"/><stop offset=".85" stop-color="#8e3418"/><stop offset="1" stop-color="#4a1a0c"/></radialGradient>
<clipPath id="marsclip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
<circle cx="${cx}" cy="${cy}" r="${f(r * 1.08)}" fill="#ff8a5c" opacity=".16"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#mars)"/>
<g clip-path="url(#marsclip)" fill="#7a2c14" opacity=".55"><path d="M${f(cx - r * .9)} ${f(cy + r * .05)} C${f(cx - r * .4)} ${f(cy - r * .1)} ${f(cx + r * .1)} ${f(cy + r * .2)} ${f(cx + r * .8)} ${f(cy + r * .02)} L${f(cx + r * .8)} ${f(cy + r * .12)} C${f(cx + r * .1)} ${f(cy + r * .3)} ${f(cx - r * .4)} ${f(cy)} ${f(cx - r * .9)} ${f(cy + r * .16)}Z"/>
<ellipse cx="${f(cx + r * .3)}" cy="${f(cy + r * .5)}" rx="${f(r * .32)}" ry="${f(r * .14)}"/><ellipse cx="${f(cx - r * .45)}" cy="${f(cy - r * .4)}" rx="${f(r * .2)}" ry="${f(r * .1)}"/></g>
<ellipse cx="${f(cx - r * .1)}" cy="${f(cy - r * .88)}" rx="${f(r * .32)}" ry="${f(r * .1)}" fill="#fff4ec" opacity=".85" clip-path="url(#marsclip)"/>`;
}
// 제목 오른쪽 그림: 블랙홀, 우주선, 화성, 별.
export function headerSpace() {
  const stars = Array.from({ length: 26 }, () => `<circle cx="${f(rand() * 372)}" cy="${f(rand() * 132)}" r="${f(.5 + rand() * 1)}" fill="${['#ffffff', '#cfe0ff', '#ffe9c4'][Math.floor(rand() * 3)]}" opacity="${f(.4 + rand() * .6)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372 132">${stars}${sparkle(60, 20, 5)}${sparkle(214, 112, 4, '#ffe9c4')}${sparkle(352, 18, 3.5, '#cfe0ff')}
${blackHole(118, 66, 18)}${ringShip(244, 34, 15)}${mars(320, 86, 26)}</svg>`;
}
// 바탕에 까는 별 무늬: 크기가 다른 두 장(300, 470)을 겹쳐 이어 붙여서 같은 무늬가 되풀이되는 것이 잘 보이지 않아요.
export function starTile(size = 300, count = 34, sparkles = []) {
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
