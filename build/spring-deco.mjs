// 밝은 테마의 봄 장식 그림(SVG): 벚꽃, 매화, 흰머리오목눈이, 박새.
// build/light-theme.mjs가 이 그림을 data URI로 바꿔 theme-light.css에 넣어요. 그림은 꾸밈이라 화면 읽기 프로그램에는 보이지 않아요.
const f = n => +n.toFixed(1);

// 꽃잎 하나: (0,0)에서 위쪽(−y)으로 뻗는 꽃잎. notch: 벚꽃처럼 끝이 살짝 갈라짐.
function petal(len, w, notch) {
  const tip = notch
    ? `C${f(w)} ${f(-len * .82)} ${f(w * .5)} ${f(-len)} ${f(w * .2)} ${f(-len * .98)} L0 ${f(-len * .86)} L${f(-w * .2)} ${f(-len * .98)} C${f(-w * .5)} ${f(-len)} ${f(-w)} ${f(-len * .82)}`
    : `C${f(w * 1.05)} ${f(-len * .9)} ${f(-w * 1.05)} ${f(-len * .9)}`;
  return `M0 0 C${f(w * .9)} ${f(-len * .25)} ${notch ? `${f(w * 1.05)} ${f(-len * .55)} ${f(w * .95)} ${f(-len * .7)} ` : ''}${notch ? tip : `${f(w)} ${f(-len * .6)} ${f(w * .6)} ${f(-len)} S${f(-w)} ${f(-len * .6)} ${f(-w * .9)} ${f(-len * .25)}`}${notch ? ` C${f(-w * 1.05)} ${f(-len * .55)} ${f(-w * .9)} ${f(-len * .25)}` : ''} 0 0Z`;
}
// 꽃 한 송이. kind: 'cherry'(벚꽃, 연분홍, 끝이 갈라진 꽃잎) | 'plum'(매화, 둥근 꽃잎, 진분홍·흰색)
export function flower(x, y, r, kind = 'cherry', rot = 0, color) {
  const cherry = kind === 'cherry';
  const fill = color ?? (cherry ? '#ffd3e1' : '#ff8fab');
  const edge = cherry ? '#f7a8c2' : '#e8668a';
  const petals = Array.from({ length: 5 }, (_, i) => `<path d="${petal(r, r * (cherry ? .62 : .7), cherry)}" transform="rotate(${rot + i * 72})" fill="${fill}" stroke="${edge}" stroke-width=".6"/>`).join('');
  const stamens = Array.from({ length: cherry ? 7 : 9 }, (_, i) => {
    const a = (rot + i * (360 / (cherry ? 7 : 9))) * Math.PI / 180, l = r * (cherry ? .42 : .5);
    return `<path d="M0 0L${f(Math.sin(a) * l)} ${f(-Math.cos(a) * l)}" stroke="${cherry ? '#e5578a' : '#b8325a'}" stroke-width=".7"/><circle cx="${f(Math.sin(a) * l)}" cy="${f(-Math.cos(a) * l)}" r="${f(r * .07)}" fill="#f4c542"/>`;
  }).join('');
  return `<g transform="translate(${f(x)} ${f(y)})">${petals}<circle r="${f(r * .2)}" fill="${cherry ? '#f7a1bf' : '#c43a62'}"/>${stamens}</g>`;
}
const bud = (x, y, r, rot, fill = '#ff9fbf') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * .6)}" ry="${f(r)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="${fill}" stroke="#e8668a" stroke-width=".5"/>`;

// 흰머리오목눈이: 둥글고 흰 몸, 검은 꼬리, 등은 검정·연한 밤색, 작은 검은 눈과 부리. (x, y)는 발이 닿는 곳, dir 1이면 오른쪽을 봐요.
export function longTailedTit(x, y, s = 1, dir = 1) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s * dir)} ${f(s)})">
<path d="M-14 -10 L-52 4 L-50 8 L-12 -4Z" fill="#2b2326"/><path d="M-14 -9 L-50 5" stroke="#5a4a4e" stroke-width="1"/>
<ellipse cx="0" cy="-15" rx="17" ry="14" fill="#fffdfa" stroke="#e8ded8" stroke-width="1"/>
<path d="M-15 -17 C-10 -26 4 -24 8 -16 C2 -12 -8 -10 -15 -12Z" fill="#2f272a"/><path d="M-12 -12 C-6 -9 2 -10 7 -14 C2 -6 -8 -5 -12 -9Z" fill="#d9a6a0"/>
<circle cx="5" cy="-27" r="11" fill="#ffffff" stroke="#ece4de" stroke-width="1"/>
<circle cx="10" cy="-28" r="1.9" fill="#1d1a1b"/><circle cx="10.6" cy="-28.6" r=".6" fill="#fff"/>
<path d="M15 -27 L19 -26 L15 -24.6Z" fill="#2b2326"/>
<path d="M-3 -2 L-5 3 M2 -2 L1 3" stroke="#6b5a50" stroke-width="1.4" stroke-linecap="round"/></g>`;
}
// 박새: 검은 머리, 흰 뺨, 목에서 배로 내려오는 검은 줄(넥타이), 올리브빛 등, 회청색 날개에 흰 줄.
export function greatTit(x, y, s = 1, dir = 1) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s * dir)} ${f(s)})">
<path d="M-14 -8 L-36 2 L-33 6 L-12 -2Z" fill="#4a5563"/>
<ellipse cx="0" cy="-14" rx="16" ry="13" fill="#f1eee4"/>
<path d="M-15 -16 C-10 -26 6 -26 9 -18 C2 -12 -8 -10 -15 -12Z" fill="#8f9b5e"/><path d="M-15 -14 C-9 -10 0 -9 6 -12 C0 -5 -9 -5 -14 -9Z" fill="#6e7c8c"/><path d="M-12 -11 L2 -10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
<path d="M6 -20 C9 -12 8 -4 4 2 L1 2 C4 -5 4 -12 2 -19Z" fill="#1f2226"/>
<circle cx="6" cy="-25" r="10.5" fill="#1f2226"/><ellipse cx="8.5" cy="-23" rx="5.6" ry="4.4" fill="#ffffff"/>
<circle cx="10" cy="-29" r="1.6" fill="#f5f5f5"/><circle cx="10" cy="-29" r="1" fill="#111"/>
<path d="M15.5 -27 L20 -26 L15.5 -24.5Z" fill="#2a2a2a"/>
<path d="M-3 -2 L-5 3 M2 -2 L1 3" stroke="#6b5a50" stroke-width="1.4" stroke-linecap="round"/></g>`;
}
const branch = d => `<path d="${d}" fill="none" stroke="#7a5642" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#9c7258" stroke-width="1.6" stroke-linecap="round" transform="translate(0 -1.2)"/>`;
const twig = d => `<path d="${d}" fill="none" stroke="#7a5642" stroke-width="2.4" stroke-linecap="round"/>`;

// 제목 오른쪽의 가지: 매화와 벚꽃이 핀 가지 위에 흰머리오목눈이와 박새가 앉아 있어요.
export function headerBranch() {
  const main = 'M372 30 C320 36 280 60 230 64 C190 67 150 58 112 66 C92 70 74 78 58 90';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 372 132">
${branch(main)}${twig('M230 64 C222 80 216 92 214 106')}${twig('M300 46 C296 30 288 20 280 14')}${twig('M150 60 C146 46 140 36 130 30')}
${flower(214, 108, 9, 'plum', 10)}${flower(280, 14, 8, 'plum', 30)}${flower(130, 30, 8.5, 'cherry', 4)}
${flower(250, 60, 10, 'cherry', 18)}${flower(176, 62, 9, 'plum', 40)}${flower(96, 72, 9.5, 'cherry', 0)}${flower(330, 36, 9, 'cherry', 50)}
${flower(64, 88, 7, 'plum', 20, '#ffffff')}${bud(198, 66, 4, 30)}${bud(352, 30, 3.6, -20, '#ffc2d6')}${bud(122, 64, 3.6, 60)}${bud(292, 44, 3.4, -40, '#ffffff')}
${longTailedTit(142, 61, .95, 1)}${greatTit(316, 41, .85, -1)}
</svg>`;
}
// 떨어지는 꽃잎 무늬(바탕): 크기·방향이 다른 벚꽃잎·매화잎이 드문드문.
export function petalTile() {
  const ps = [[30, 40, 20, '#ffc2d6'], [150, 20, 130, '#ffd6e3'], [200, 140, 70, '#ffb3cb'], [80, 170, 200, '#ffe0ea'], [250, 230, 300, '#ffc2d6'], [20, 250, 250, '#ffb3cb']];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">${ps.map(([x, y, r, c]) => `<path d="${petal(11, 7, true)}" transform="translate(${x} ${y}) rotate(${r})" fill="${c}" opacity=".7"/>`).join('')}</svg>`;
}
// 작은 꽃 하나(소제목 앞에 붙여요)
export const blossomIcon = (kind = 'cherry') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24">${flower(0, 0, 10, kind, 0)}</svg>`;
export const dataUri = svg => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}")`;
