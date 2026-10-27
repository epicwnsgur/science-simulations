import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import './theme-space.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, reducedMotion, instantLessons } from './src/lab-shell.js';
import { STARS } from './src/space-stars.js';
import { blackbodyRGB, starPaletteRGB, planck, colorClassOf, COLOR_CLASSES } from './src/space-model.js';
import { setSky } from './src/sky-image.js';
import { photoUrl, creditsHTML, SKY_CREDIT, PHOTOS, STAR_PHOTOS, starCreditItems } from './src/space-photos.js';
import { createStarViewer, tintWord } from './src/star-viewer.js';
import { setAttr } from './src/space-fx.js';

// 교과서 284–285쪽, 지도서(별의 표면 온도와 색).
// 지도상 유의점: 별의 색과 표면 온도의 관계는 색으로 비교하는 수준에서 다뤄요(분광형·빈의 법칙 같은 식은 다루지 않아요).
// 오개념 바로잡기: ‘붉은색은 뜨겁고 파란색은 차갑다’는 생활 속 느낌과 달리, 파란색 별의 표면 온도가 더 높아요.

const terms = [
  ['표면 온도', '별 겉면의 온도예요. 별의 색을 보고 표면 온도를 비교할 수 있어요.'],
  ['별의 색', '표면 온도가 높은 별은 파란색 빛을 상대적으로 많이 내어 파란색을, 낮은 별은 붉은색 빛을 상대적으로 많이 내어 붉은색을 띠어요.'],
  ['빛을 내는 물체의 색', '빛을 방출하는 물체는 온도에 따라 내는 빛의 색이 달라져요. 전기난로의 열선도 온도가 높아지면 어두운 붉은색에서 밝은 주황색·노란색 쪽으로 바뀌어요.'],
];
const K = c => c + 273.15;
const rgbStr = (rgb, a = 1) => `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},${a})`;
const TMIN = 2500, TMAX = 40000;
const tempOf = v => TMIN * (TMAX / TMIN) ** (v / 1000);
const roundTemp = t => (t >= 10000 ? Math.round(t / 1000) * 1000 : Math.round(t / 100) * 100);
// 별 카드에 쓰는 별(교과서 284쪽 ‘해 보기’의 여섯 별 + 색 단계마다 예가 되는 별)
const CARD_STARS = ['naos', 'rigel', 'spica', 'vega', 'altair', 'procyon', 'sun', 'capella', 'arcturus', 'aldebaran', 'betelgeuse', 'antares'];
const AXIS = { x0: 60, x1: 760, y: 352 };
const VIEW = { x: 24, y: 16, w: 336, h: 218 };   // 사진 관측 창
const IX = 384;                                  // 오른쪽 정보 칸의 왼쪽 끝
const axisX = t => AXIS.x0 + (Math.log(TMAX * 1.1) - Math.log(t)) / (Math.log(TMAX * 1.1) - Math.log(TMIN)) * (AXIS.x1 - AXIS.x0); // 왼쪽이 뜨거운 별
const SKY_STARS_PICK = {
  sco: { ra: 248, dec: -27, fov: 34, lines: ['Sco'], stars: [['antares', '안타레스', 1], ['dschubba', '드슈바', -1]] },
  ori: { ra: 84, dec: 0, fov: 34, lines: ['Ori'], stars: [['betelgeuse', '베텔게우스', -1], ['rigel', '리겔', 1]] },
};

/* ---------- 무대 그림 ---------- */
const spectrumStops = [[380, '#6a00ff'], [430, '#2a2cff'], [470, '#008cff'], [500, '#00e0ff'], [530, '#00ff6a'], [570, '#d8ff00'], [590, '#ffb300'], [620, '#ff5200'], [680, '#e00000'], [750, '#7a0000']];
const SPEC = { x: 470, y: 340, w: 300, h: 66 };
const specX = nm => SPEC.x + (nm - 380) / 370 * SPEC.w;
const heaterTubes = [196, 252];
const coilPath = y => { let d = `M76 ${y}`; for (let x = 76; x < 344; x += 6) d += ` Q${x + 1.5} ${y - 7} ${x + 3} ${y} T${x + 6} ${y}`; return d; };
const scene = `
<defs>
<linearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">${spectrumStops.map(([nm, c]) => `<stop offset="${((nm - 380) / 370).toFixed(3)}" stop-color="${c}"/>`).join('')}</linearGradient>
<linearGradient id="reflector" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6070"/><stop offset=".5" stop-color="#c9ced8"/><stop offset="1" stop-color="#4a505e"/></linearGradient>
<linearGradient id="heater-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9ecf2"/><stop offset="1" stop-color="#aab0bd"/></linearGradient>
<radialGradient id="ball-shade" cx=".38" cy=".36" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<radialGradient id="soft-glow"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="ball-glow"><stop offset="0" class="bg-stop" stop-opacity=".95"/><stop offset=".45" class="bg-stop" stop-opacity=".35"/><stop offset="1" class="bg-stop" stop-opacity="0"/></radialGradient>
<radialGradient id="sun-halo"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset=".5" stop-color="#ffb347" stop-opacity=".25"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
<clipPath id="spec-clip"><path id="spec-area"/></clipPath>
<clipPath id="ball-clip"><circle cx="618" cy="150" r="86"/></clipPath>
<clipPath id="close-clip"><rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.w}" height="${VIEW.h}" rx="14"/></clipPath>
<clipPath id="big-clip"><rect x="462" y="14" width="324" height="344" rx="12"/></clipPath>
<radialGradient id="pin-glow"><stop offset="0" stop-color="#ffcf6e" stop-opacity="0"/><stop offset=".7" stop-color="#ffcf6e" stop-opacity="0"/><stop offset=".85" stop-color="#ffcf6e" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf6e" stop-opacity="0"/></radialGradient>
<clipPath id="sky-clip"><rect x="14" y="14" width="430" height="412" rx="14"/></clipPath>
</defs>
<g id="heat-view">
  <rect x="20" y="40" width="360" height="312" rx="22" fill="url(#heater-body)" stroke="#7d8496" stroke-width="2"/>
  <rect x="44" y="140" width="312" height="170" rx="10" fill="url(#reflector)"/>
  <g id="heater-glow"></g>
  ${heaterTubes.map(y => `<rect x="60" y="${y - 13}" width="290" height="26" rx="13" fill="#ffffff14" stroke="#ffffff40"/><path class="coil" d="${coilPath(y)}" fill="none" stroke-width="3.2" stroke-linecap="round"/>`).join('')}
  ${Array.from({ length: 9 }, (_, i) => `<path d="M${60 + i * 36} 146 V304" stroke="#8a91a3" stroke-width="3" opacity=".75"/>`).join('')}
  <rect x="150" y="62" width="100" height="56" rx="10" fill="#1d2235"/><text id="heater-temp" x="200" y="96" text-anchor="middle" class="heater-temp">25 ℃</text>
  <circle id="heater-lamp" cx="306" cy="90" r="9" fill="#3a3f52"/><text x="306" y="124" text-anchor="middle" class="obj-dark">전원</text>
  <rect x="60" y="352" width="40" height="22" rx="4" fill="#8a91a3"/><rect x="300" y="352" width="40" height="22" rx="4" fill="#8a91a3"/>
  <text x="200" y="402" text-anchor="middle" class="obj-name">전기난로의 열선</text>
</g>
<g id="ball-view">
  <circle id="ball-halo" cx="618" cy="150" r="150" fill="url(#ball-glow)"/>
  <circle id="ball" cx="618" cy="150" r="86"/>
  <image id="ball-grain" x="532" y="64" width="172" height="172" clip-path="url(#ball-clip)" opacity=".38" style="mix-blend-mode:multiply"/>
  <circle cx="618" cy="150" r="86" fill="url(#ball-shade)"/>
  <text x="618" y="34" text-anchor="middle" class="obj-name">빛을 내는 공(별 모형)</text>
  <text id="ball-temp" x="618" y="270" text-anchor="middle" class="ball-temp"></text>
  <text id="ball-class" x="618" y="294" text-anchor="middle" class="ball-class"></text>
  <rect x="${SPEC.x - 10}" y="${SPEC.y - 26}" width="${SPEC.w + 20}" height="${SPEC.h + 54}" rx="10" fill="#070914ee" stroke="#2d3566"/>
  <text x="${SPEC.x}" y="${SPEC.y - 10}" class="panel-title">이 공이 내는 빛의 색깔별 비율</text>
  <rect x="${SPEC.x}" y="${SPEC.y}" width="${SPEC.w}" height="${SPEC.h}" fill="url(#spectrum)" opacity=".18"/>
  <rect x="${SPEC.x}" y="${SPEC.y}" width="${SPEC.w}" height="${SPEC.h}" fill="url(#spectrum)" clip-path="url(#spec-clip)"/>
  <path id="spec-line" fill="none" stroke="#fff" stroke-width="2"/>
  <text x="${SPEC.x}" y="${SPEC.y + SPEC.h + 16}" class="axis">파란색 쪽</text><text x="${SPEC.x + SPEC.w}" y="${SPEC.y + SPEC.h + 16}" text-anchor="end" class="axis">붉은색 쪽</text>
  <text id="spec-read" x="${SPEC.x + SPEC.w / 2}" y="${SPEC.y + SPEC.h + 16}" text-anchor="middle" class="panel-strong" style="font-size:12.5px"></text>
</g>
<g id="stars-view">
  <rect x="${VIEW.x - 4}" y="${VIEW.y - 4}" width="${VIEW.w + 8}" height="${VIEW.h + 8}" rx="16" fill="#02030a" stroke="#8fd3ff55"/>
  <g clip-path="url(#close-clip)"><image id="close-sky" x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.w}" height="${VIEW.h}" preserveAspectRatio="none"/><g id="close-star"></g><g id="obs"></g></g>
  <rect x="${VIEW.x + 10}" y="${VIEW.y + VIEW.h - 32}" width="236" height="24" rx="12" fill="#0a0d22cc"/><text x="${VIEW.x + 20}" y="${VIEW.y + VIEW.h - 15}" class="panel-title" id="close-title">망원경으로 본 모습</text>
  <text x="${VIEW.x + VIEW.w - 10}" y="${VIEW.y + 20}" text-anchor="end" class="obs-zoom" id="obs-zoom"></text>
  <g id="star-info"></g>
  <g id="temp-axis"></g>
</g>
<g id="sky-view">
  <rect x="10" y="10" width="438" height="420" rx="16" fill="#02030a" stroke="#8fd3ff55"/>
  <g clip-path="url(#sky-clip)"><image id="con-sky" x="14" y="14" width="430" height="412" preserveAspectRatio="none"/><g id="con-marks"></g></g>
  <rect x="24" y="392" width="210" height="26" rx="13" fill="#0a0d22cc"/><text x="36" y="410" class="panel-title" id="con-title"></text>
  <g id="photos"></g>
</g>`;

const lab = buildLab({
  unit: 8,
  crumb: '별 03 별의 표면 온도와 색',
  title: '별의 색이 다양하게 나타나는 까닭은 무엇일까?',
  intro: '',
  tabs: [{ id: 'heat', label: '온도와 빛의 색' }, { id: 'stars', label: '실제 별의 표면 온도' }, { id: 'sky', label: '별자리와 성단' }],
  toggle: '색 이름 보기',
  sceneLabel: '전기난로의 열선, 빛을 내는 공, 실제 별들의 색과 표면 온도',
  scene,
  terms,
});
$('.lab').insertAdjacentHTML('beforeend', creditsHTML(['jewel', 'ngc3532', 'orionWide', 'rhoOph'], [...starCreditItems(k => STARS[k].name), SKY_CREDIT, '<li>실제 사진이 없는 별(나오스·알타이르·프로키온)은 실제 별의 위치·밝기·색(HYG 별 목록)으로 그린 그림으로 보여 줘요.</li>']));
$('#show-detail').checked = true;

/* ---------- 상태 ---------- */
let tab = 'heat', show = true, lastFrame = 0, flow = null, time = 0;
let heaterOn = false, heaterT = 25, heaterDone = false, sliderV = 500, ballT = tempOf(500), lowSeen = false, highSeen = false;
let starKey = null, skyId = 'sco', photoKey = null;
const placed = new Set(), skyPicked = new Set();
let photoSeen = false;
const measuredStars = new Map();   // 사진에서 별빛 색을 잰 별
const surfaceSeen = new Set();
const viewer = createStarViewer($('#obs'), VIEW, { reducedMotion: instantLessons, onChange: what => {
  if (what === 'measured' && viewer.measured) { measuredStars.set(viewer.key, viewer.measured); toast(`${STARS[viewer.key].name}의 사진 속 별빛: ${tintWord(viewer.measured)}`); renderControls(); }
  else if (tab === 'stars') renderStars();
} });

// 쌀알 무늬(별 표면의 작은 알갱이 무늬)를 한 번 그려 두고 모든 공에 덧입혀요.
(function grain() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) { const r = 2 + Math.random() * 5; g.fillStyle = `rgba(0,0,0,${.06 + Math.random() * .12})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, r, 0, 7); g.fill(); }
  $('#ball-grain').setAttribute('href', c.toDataURL());
})();

/* ---------- 온도와 빛의 색 ---------- */
function renderHeat(dt) {
  // 전원을 켜면 열선의 온도가 점점 올라가 약 1100 ℃에 가까워져요. 끄면 식어요.
  const target = heaterOn ? 1100 : 25;
  heaterT += (target - heaterT) * (instantLessons.matches ? 1 : 1 - Math.exp(-dt * (heaterOn ? .38 : .6)));
  if (heaterOn && heaterT > 1000 && !heaterDone) { heaterDone = true; toast('열선이 처음에는 어두운 붉은색이었다가 온도가 높아지면서 밝은 주황색(노란빛)이 되었어요'); renderText(); }
  const b = Math.max(0, Math.min(1, (heaterT - 480) / 560)), bb = blackbodyRGB(K(heaterT));
  const metal = [.42, .44, .48];
  const core = bb.map((v, i) => metal[i] * (1 - b) + Math.min(1, v + b * .45) * b);
  $$('.coil').forEach(p => setAttr(p, 'stroke', rgbStr(core)));
  setHTML('#heater-glow', b > .02 ? heaterTubes.map(y => `<ellipse cx="203" cy="${y}" rx="170" ry="${(18 + b * 22).toFixed(0)}" fill="${rgbStr(bb, (b * .55).toFixed(2))}"/>`).join('') + `<rect x="44" y="140" width="312" height="170" rx="10" fill="${rgbStr(bb, (b * .25).toFixed(2))}"/>` : '');
  setAttr($('#heater-lamp'), 'fill', heaterOn ? '#ff5a3c' : '#3a3f52');
  setText('#heater-temp', `약 ${Math.round(heaterT / 10) * 10} ℃`);
  // 빛을 내는 공: 표면 온도에 따라 색이 달라져요.
  const col = starPaletteRGB(ballT);
  setAttr($('#ball'), 'fill', rgbStr(col));
  $$('.bg-stop').forEach(st => setAttr(st, 'stop-color', rgbStr(col)));
  setAttr($('#ball-halo'), 'r', (110 + 50 * Math.min(1, Math.log(ballT / TMIN) / Math.log(TMAX / TMIN))).toFixed(0));
  setText('#ball-temp', `표면 온도 약 ${roundTemp(ballT)} ℃`);
  setText('#ball-class', show ? `${colorClassOf(ballT).name}을 띠어요` : '');
  // 색깔별 빛의 양(흑체가 내는 빛, 보이는 빛의 범위에서 가장 많은 곳을 1로)
  const nms = Array.from({ length: 38 }, (_, i) => 380 + i * 10), I = nms.map(nm => planck(nm, K(ballT))), max = Math.max(...I);
  const pts = nms.map((nm, i) => `${specX(nm).toFixed(1)} ${(SPEC.y + SPEC.h - I[i] / max * (SPEC.h - 4)).toFixed(1)}`);
  setAttr($('#spec-line'), 'd', `M${pts.join(' L')}`);
  setAttr($('#spec-area'), 'd', `M${SPEC.x} ${SPEC.y + SPEC.h} L${pts.join(' L')} L${SPEC.x + SPEC.w} ${SPEC.y + SPEC.h}Z`);
  const blue = I[5] / max, red = I[28] / max;
  // 태양(약 6000 ℃)처럼 여러 색의 빛을 비슷하게 섞어 내는 별은 ‘고르게’로 읽어요(교과서의 황색·황백색 별).
  setText('#spec-read', blue > red * 1.6 ? '파란색 빛을 더 많이 내요' : red > blue * 1.25 ? '붉은색 빛을 더 많이 내요' : '여러 색의 빛을 비슷하게 내요');
}

/* ---------- 실제 별의 표면 온도 ---------- */
function chooseStar(key) {
  starKey = key; placed.add(key);
  const s = STARS[key];
  viewer.show(key);
  if (!STAR_PHOTOS[key]) setSky($('#close-sky'), { ra: s.ra, dec: s.dec, fov: 9, width: VIEW.w, height: VIEW.h, milkyWay: .7, lines: [], maxMag: 6.2, skip: (r, d) => Math.abs(r - s.ra) < .3 && Math.abs(d - s.dec) < .3, skipKey: key });
  toast(`${s.name}: ${STAR_PHOTOS[key] ? '실제 사진 · ' : ''}${s.color} · 표면 온도 약 ${roundTemp(s.temp)} ℃`);
  renderControls();
}
function renderStars() {
  const s = starKey && STARS[starKey], ph = starKey && STAR_PHOTOS[starKey];
  $('#close-sky').style.display = s && !ph ? '' : 'none';
  const c = s && !ph ? rgbStr(starPaletteRGB(s.temp)) : null, br = s ? Math.max(6, Math.min(12, 7 + (2 - s.m) * 2)) : 0;
  setHTML('#close-star', c ? `<g transform="translate(${VIEW.x + VIEW.w / 2} ${VIEW.y + VIEW.h / 2})"><circle r="${br * 5}" fill="${c}" opacity=".14"/><circle r="${br * 2.2}" fill="${c}" opacity=".45"/><circle r="${br}" fill="${c}"/><circle r="${br * .55}" fill="#fff"/><path d="M${-br * 7} 0 H${br * 7} M0 ${-br * 7} V${br * 7}" stroke="${c}" stroke-width="1.4" opacity=".7"/></g>` : '');
  setText('#close-title', !s ? '별을 골라 보세요' : ph ? (viewer.surfaceOn ? `${s.name}의 표면(초대형 망원경)` : `실제 사진 · ${s.name}`) : `관측 자료로 그린 ${s.name}`);
  const m = starKey && measuredStars.get(starKey);
  const how = ph ? (viewer.surfaceOn ? ph.surface.how : ph.how) : '실제 사진이 없어 관측 자료(HYG)로 그렸어요.';
  const credit = ph ? `사진: ${(viewer.surfaceOn ? ph.surface : ph).credit}` : '';
  const wrap = (t, n) => { const out = []; let line = ''; for (const w of t.split(' ')) { if ((line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? `${line} ${w}` : w; } return [...out, line]; };
  setHTML('#star-info', s ? `<text x="${IX}" y="40" class="card-big">${s.name}</text><text x="${IX}" y="62" class="card-small">${s.con || '태양계의 중심에 있는 별'}</text>
    <circle cx="${IX + 18}" cy="96" r="16" fill="${rgbStr(starPaletteRGB(s.temp))}"/><circle cx="${IX + 18}" cy="96" r="26" fill="${rgbStr(starPaletteRGB(s.temp), .2)}"/>
    <text x="${IX + 54}" y="91" class="card-text">색: <tspan class="card-strong">${show ? s.color : '?'}</tspan></text><text x="${IX + 54}" y="114" class="card-text">표면 온도: <tspan class="card-strong">약 ${roundTemp(s.temp)} ℃</tspan></text>
    ${m ? `<rect x="${IX}" y="132" width="${786 - IX}" height="40" rx="10" fill="#0d1838" stroke="#8fd3ff66" class="measure-card"/><circle cx="${IX + 22}" cy="152" r="12" fill="${rgbStr(m)}"/><circle cx="${IX + 22}" cy="152" r="18" fill="${rgbStr(m, .25)}"/><text x="${IX + 44}" y="157" class="card-text">사진 속 별빛: <tspan class="card-strong">${tintWord(m)}</tspan></text>`
      : ph && !ph.noMeasure ? `<text x="${IX}" y="156" class="card-small">‘별빛 색 재기’로 사진 속 별빛의 색을 재어 보세요.</text>` : ''}
    ${wrap(how, 30).map((l, i) => `<text x="${IX}" y="${192 + i * 16}" class="card-small">${l}</text>`).join('')}${credit ? `<text x="${IX}" y="${192 + wrap(how, 30).length * 16}" class="card-tiny">${credit.length > 58 ? credit.slice(0, 56) + '…' : credit}</text>` : ''}`
    : `<text x="${IX}" y="60" class="card-big">별을 골라 보세요</text><text x="${IX}" y="88" class="card-small">위의 단추에서 별을 하나씩 골라 실제 사진과</text><text x="${IX}" y="106" class="card-small">색, 표면 온도를 조사해요.</text>`);
  // 온도 띠: 왼쪽이 뜨거운 별(청색), 오른쪽이 차가운 별(적색)
  const bands = COLOR_CLASSES.map((c, i) => { const hi = i ? COLOR_CLASSES[i - 1].min : TMAX * 1.1, lo = Math.max(TMIN, c.min); const x0 = axisX(hi), x1 = axisX(lo), mid = Math.sqrt(hi * lo); return `<rect x="${x0.toFixed(1)}" y="${AXIS.y - 20}" width="${(x1 - x0).toFixed(1)}" height="40" fill="${rgbStr(starPaletteRGB(mid), .85)}"/>${show ? `<text x="${((x0 + x1) / 2).toFixed(1)}" y="${AXIS.y + 5}" text-anchor="middle" class="band-label">${c.name}</text>` : ''}`; }).join('');
  const ticks = [40000, 20000, 10000, 6000, 4000, 3000].map(t => `<path d="M${axisX(t).toFixed(1)} ${AXIS.y + 20} V${AXIS.y + 25}" stroke="#aab4d6"/><text x="${axisX(t).toFixed(1)}" y="${AXIS.y + 36}" text-anchor="middle" class="axis">${t} ℃</text>`).join('');
  // 이름표가 겹치지 않게 위·아래 네 줄에 나누어 달아요.
  const levels = [-40, -62, 60, -84], last = levels.map(() => -1e9);
  const dots = [...placed].sort((a, b) => STARS[b].temp - STARS[a].temp).map(k => {
    const x = axisX(STARS[k].temp), li = Math.max(0, levels.findIndex((_, i) => x - last[i] > 64));
    last[li] = x; const L = levels[li], up = L < 0;
    return `<g transform="translate(${x.toFixed(1)} ${AXIS.y})"><path d="M0 ${up ? -20 : 20} V${L + (up ? 8 : -12)}" stroke="#ffffff66"/><circle r="${k === starKey ? 8 : 6}" fill="#fff" stroke="#000a" stroke-width="2"/><text y="${up ? L : L + 2}" text-anchor="middle" class="dot-label${k === starKey ? ' now' : ''}">${STARS[k].name}</text></g>`;
  }).join('');
  setHTML('#temp-axis', `<rect x="${AXIS.x0 - 20}" y="${AXIS.y - 104}" width="${AXIS.x1 - AXIS.x0 + 40}" height="186" rx="14" fill="#070914ee" stroke="#2d3566"/><text x="${AXIS.x0}" y="${AXIS.y - 86}" class="panel-title">별의 표면 온도와 색 (← 높다 · 낮다 →)</text>${bands}${ticks}${dots}`);
}

/* ---------- 별자리와 성단 ---------- */
let conProject = null;
function chooseSky(id) {
  skyId = id; const c = SKY_STARS_PICK[id];
  conProject = null;
  setSky($('#con-sky'), { ra: c.ra, dec: c.dec, fov: c.fov, width: 430, height: 412, milkyWay: .9, lines: c.lines, maxMag: 6.2 }).then(p => { if (skyId === id) { conProject = p; renderSky(); } });
  renderControls();
}
function pickSkyStar(key) { skyPicked.add(key); toast(`${STARS[key].name}: ${STARS[key].color} · 표면 온도 약 ${roundTemp(STARS[key].temp)} ℃`); renderControls(); }
// 크게 본 사진: 별자리 사진에는 교과서의 별 이름과 색·표면 온도를 붙여요(사진 속 자리는 사진에서 찾은 값).
const PINS = {
  orionWide: { w: 714, h: 1100, stars: [['betelgeuse', 98, 222, 1], ['rigel', 526, 885, -1]] },
  rhoOph: { w: 960, h: 814, stars: [['antares', 650, 236, -1]] },
  jewel: { w: 512, h: 512, stars: [] }, ngc3532: { w: 512, h: 512, stars: [] },
};
function bigPhoto(key) {
  const P = PINS[key], box = { x: 462, y: 14, w: 324, h: 344 }, k = Math.min(box.w / P.w, box.h / P.h);
  const w = P.w * k, h = P.h * k, x0 = box.x + (box.w - w) / 2, y0 = box.y + (box.h - h) / 2;
  const pins = P.stars.map(([s, px, py, side]) => { const x = x0 + px * k, y = y0 + py * k, t = STARS[s]; return `<g class="pin" style="transform-origin:${x.toFixed(1)}px ${y.toFixed(1)}px"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="none" stroke="#ffcf6e" stroke-width="2"/><circle class="pin-pulse" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="none" stroke="#ffcf6e"/><text x="${(x + side * 18).toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="${side > 0 ? 'start' : 'end'}" class="sky-label">${t.name}<tspan x="${(x + side * 18).toFixed(1)}" dy="16" class="sky-mag">${t.color} · 약 ${roundTemp(t.temp)} ℃</tspan></text></g>`; }).join('');
  const note = key === 'orionWide' ? '주황빛 베텔게우스와 푸른빛 리겔을 비교해 보세요.' : key === 'rhoOph' ? '노란 성운 속 안타레스와 둘레의 푸른 별을 비교해 보세요.' : '파란 별(표면 온도 높음)과 붉은 별(낮음)을 찾아보세요.';
  return `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="12" fill="#02030a"/><g clip-path="url(#big-clip)"><g class="photo-thumb big" data-photo-pick="${key}" role="button" tabindex="0" aria-label="${PHOTOS[key].name} 사진 작게 보기"><image id="big-photo" href="${photoUrl(key)}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" style="transform-origin:${box.x + box.w / 2}px ${box.y + box.h / 2}px"/></g>${pins}</g>
    <text x="466" y="378" class="panel-text">${PHOTOS[key].name} · 실제 사진</text><text x="466" y="398" class="panel-strong" style="font-size:13px">${note}</text><text x="466" y="418" class="card-tiny">사진: ${PHOTOS[key].credit.length > 54 ? PHOTOS[key].credit.slice(0, 52) + '…' : PHOTOS[key].credit}</text>`;
}
function renderSky() {
  const c = SKY_STARS_PICK[skyId];
  setText('#con-title', skyId === 'sco' ? '실제 밤하늘 · 전갈자리' : '실제 밤하늘 · 오리온자리');
  setHTML('#con-marks', conProject ? c.stars.map(([k, name, side]) => { const s = STARS[k], p = conProject(s.ra, s.dec); if (!p) return ''; const on = skyPicked.has(k), tx = side * 22; return `<g transform="translate(${(14 + p[0]).toFixed(1)} ${(14 + p[1]).toFixed(1)})"><circle r="16" fill="none" stroke="${on ? '#ffcf6e' : '#ffffff66'}" stroke-width="${on ? 2 : 1}" stroke-dasharray="${on ? '' : '3 3'}"/><text x="${tx}" y="${on ? -2 : 5}" text-anchor="${side > 0 ? 'start' : 'end'}" class="sky-label">${name}${on ? `<tspan x="${tx}" dy="18" class="sky-mag">${s.color} · 약 ${roundTemp(s.temp)} ℃</tspan>` : ''}</text></g>`; }).join('') : '');
  const ph = (key, x, y, w) => `<g class="photo-thumb" data-photo-pick="${key}" role="button" tabindex="0" aria-label="${PHOTOS[key].name} 사진 크게 보기"><image href="${photoUrl(key)}" x="${x}" y="${y}" width="${w}" height="${w}" preserveAspectRatio="xMidYMid slice"/><rect x="${x}" y="${y}" width="${w}" height="${w}" rx="10" fill="none" stroke="#8fd3ff66"/><rect x="${x}" y="${y + w - 26}" width="${w}" height="26" fill="#000a"/><text x="${x + 8}" y="${y + w - 9}" class="photo-cap">${PHOTOS[key].name.split(' (')[0]}</text></g>`;
  setHTML('#photos', photoKey ? bigPhoto(photoKey)
    : `<text x="466" y="32" class="panel-title">실제 사진 · 눌러서 크게 보기</text>${ph('orionWide', 466, 42, 156)}${ph('rhoOph', 630, 42, 156)}${ph('jewel', 466, 206, 156)}${ph('ngc3532', 630, 206, 156)}<text x="466" y="388" class="panel-text">같은 별자리, 같은 성단 안에서도</text><text x="466" y="408" class="panel-text">별마다 색이 달라요.</text>`);
  $$('[data-photo-pick]').forEach(g => {
    const open = () => {
      photoKey = photoKey === g.dataset.photoPick ? null : g.dataset.photoPick;
      if (photoKey && !photoSeen) { photoSeen = true; renderText(); }
      renderSky();
      // 크게 볼 때는 사진이 부드럽게 다가오고, 별 이름표가 하나씩 나타나요.
      if (photoKey && !instantLessons.matches) {
        $('#big-photo')?.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)' });
        $$('#photos .pin').forEach((p, i) => p.animate([{ opacity: 0, transform: 'scale(2.2)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 600, delay: 450 + i * 250, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' }));
      }
    };
    g.onclick = open; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  });
}

/* ---------- 조작 단추 ---------- */
function renderControls() {
  if (tab !== 'stars') $('#actions').innerHTML = '';
  if (tab === 'heat') {
    $('#controls').innerHTML = `<button id="heater-btn" aria-pressed="${heaterOn}">${heaterOn ? '전원 끄기' : '전원 켜기'}</button>
      <label class="space-range"><span>빛을 내는 공의 표면 온도</span><span class="range-ends">낮음</span><input type="range" id="temp" min="0" max="1000" value="${sliderV}" aria-label="빛을 내는 공의 표면 온도"><span class="range-ends">높음</span></label>`;
    $('#heater-btn').onclick = () => { heaterOn = !heaterOn; renderControls(); };
    $('#temp').oninput = e => {
      sliderV = +e.target.value; ballT = tempOf(sliderV);
      if (ballT < 4000 && !lowSeen) { lowSeen = true; toast('표면 온도가 낮으니 붉은색을 띠어요'); }
      if (ballT > 20000 && !highSeen) { highSeen = true; toast('표면 온도가 높으니 파란색을 띠어요'); }
    };
  } else if (tab === 'stars') {
    $('#controls').innerHTML = `<div role="group" aria-label="별 고르기" class="star-chips"><span class="group-label">조사할 별</span>${CARD_STARS.map(k => `<button data-star="${k}" aria-pressed="${starKey === k}"><i class="chip-dot" style="background:${rgbStr(starPaletteRGB(STARS[k].temp))}"></i>${STARS[k].name}</button>`).join('')}</div>`;
    $$('[data-star]').forEach(b => b.onclick = () => chooseStar(b.dataset.star));
    const ph = starKey && STAR_PHOTOS[starKey];
    $('#actions').innerHTML = `<div role="group" aria-label="사진 관측" class="obs-tools"><button id="zoom-in" ${ph ? '' : 'disabled'}>+ 확대</button><button id="zoom-out" ${ph ? '' : 'disabled'}>− 축소</button><button id="zoom-center" ${ph ? '' : 'disabled'}>별을 가운데로</button><button id="measure-color" ${ph && !ph.noMeasure ? '' : 'disabled'}>별빛 색 재기</button><button id="surface-btn" ${ph?.surface ? '' : 'disabled'} aria-pressed="${viewer.surfaceOn}">${viewer.surfaceOn ? '다시 별 사진으로' : '표면까지 확대'}</button></div>`;
    $('#zoom-in').onclick = () => viewer.zoomBy(1.4);
    $('#zoom-out').onclick = () => viewer.zoomBy(1 / 1.4);
    $('#zoom-center').onclick = () => viewer.center();
    $('#measure-color').onclick = () => viewer.measure();
    $('#surface-btn').onclick = () => { const on = viewer.toggleSurface(); if (on) { surfaceSeen.add(starKey); toast(`초대형 망원경으로 찍은 ${STARS[starKey].name}의 표면이에요. 별이 아주 커서 표면의 무늬까지 보여요`); } setTimeout(renderControls, 700); renderControls(); };
    renderStars();
  } else {
    const c = SKY_STARS_PICK[skyId];
    $('#controls').innerHTML = `<div role="group" aria-label="별자리 고르기"><span class="group-label">별자리</span><button data-sky="sco" aria-pressed="${skyId === 'sco'}">전갈자리</button><button data-sky="ori" aria-pressed="${skyId === 'ori'}">오리온자리</button></div>
      <div role="group" aria-label="별 고르기"><span class="group-label">비교할 별</span>${c.stars.map(([k, name]) => `<button data-sky-star="${k}" aria-pressed="${skyPicked.has(k)}">${name}</button>`).join('')}</div>`;
    $$('[data-sky]').forEach(b => b.onclick = () => chooseSky(b.dataset.sky));
    $$('[data-sky-star]').forEach(b => b.onclick = () => pickSkyStar(b.dataset.skyStar));
    renderSky();
  }
  renderText();
}
function setTab(id) {
  tab = id; lab.selectTab(id);
  $('.stage').dataset.tab = id;
  if (id === 'sky' && !conProject) chooseSky(skyId);
  else renderControls();
}
function renderText() {
  const T = {
    heat: ['온도가 높아지면 빛을 내는 물체의 색은 어떻게 달라질까요?', '‘전원 켜기’를 눌러 열선의 색이 바뀌는 것을 보고, 막대를 움직여 빛을 내는 공의 표면 온도를 바꾸어 보세요.'],
    stars: ['실제 별 사진을 관측하며 색과 표면 온도를 조사해 보세요.', '별을 고르면 실제 사진이 나타나요. 사진을 끌어 둘러보고 ‘별빛 색 재기’로 별빛의 색을 재어 표면 온도와 비교해요. 베텔게우스와 안타레스는 ‘표면까지 확대’도 해 보세요.'],
    sky: ['한 별자리 안의 별들도 색이 서로 달라요.', '전갈자리의 안타레스와 드슈바, 오리온자리의 베텔게우스와 리겔을 골라 비교하고, 오른쪽 실제 사진을 크게 보며 여러 색의 별을 찾아봐요.'],
  }[tab];
  setText('#guide', T[0]); setText('#subguide', T[1]);
  setText('#stage-state', tab === 'heat' ? (heaterOn ? '전기난로 켜짐' : '전기난로 꺼짐') : tab === 'stars' ? `조사한 별 ${placed.size}개` : '실제 밤하늘과 성단 사진');
  setText('#note-title', { heat: '온도가 높아질수록 색은?', stars: '파란 별과 붉은 별, 더 뜨거운 별은?', sky: '안타레스와 드슈바 중 표면 온도가 높은 별은?' }[tab]);
  setText('#note-text', { heat: '빛을 방출하는 물체는 온도에 따라 내는 빛의 색이 달라져요. 아래 그래프는 공이 내는 빛의 색깔별 비율이에요(가장 많이 내는 색을 꼭대기로 맞췄어요). 온도가 높은 공은 모든 색의 빛을 더 많이 내지만, 그중 파란색 쪽 빛의 비율이 커져요.', stars: '별은 스스로 빛을 내는 천체예요. 별의 색은 표면 온도에 따라 달라요.', sky: '밝기가 비슷해도 별의 색은 조금씩 달라요. 같은 별자리나 성단 안에서도 색이 다른 별들이 있어요.' }[tab]);
  const rows = [...placed].sort((a, b) => STARS[b].temp - STARS[a].temp).map(k => `<tr><td>${STARS[k].name}</td><td>${STARS[k].color}</td><td>약 ${roundTemp(STARS[k].temp)} ℃</td><td>${measuredStars.has(k) ? tintWord(measuredStars.get(k)) : ''}</td></tr>`).join('');
  setHTML('#readout', `<table class="data-table"><tr><th>관찰</th><th>결과</th></tr><tr><td>열선</td><td>${heaterDone ? '붉은색 → 주황·노란색' : ''}</td></tr><tr><td>공(낮은 온도)</td><td>${lowSeen ? '붉은색' : ''}</td></tr><tr><td>공(높은 온도)</td><td>${highSeen ? '파란색' : ''}</td></tr></table>${rows ? `<table class="data-table"><tr><th>별</th><th>색</th><th>표면 온도</th><th>사진 속 별빛</th></tr>${rows}</table>` : ''}`);
  setText('#model-note', '별 사진은 실제로 찍은 사진이에요(출처는 아래 ‘사진과 자료 출처’). 사진 속 별의 가운데는 너무 밝아 하얗게 보이므로, ‘별빛 색 재기’는 별 둘레의 빛을 모아 색을 재고 잘 보이도록 조금 진하게 나타내요. 사진마다 찍은 방법이 달라 색의 진하기는 조금씩 달라요. 표면 온도는 어림한 값이에요(태양은 교과서처럼 약 6000 ℃).');
  setText('#discovery', '전갈자리의 안타레스는 ‘화성의 경쟁자’라는 뜻의 이름처럼 붉은색으로 보여요. 같은 별자리의 드슈바는 청백색이고, 안타레스보다 표면 온도가 훨씬 높아요.');
}
$('#tab-heat').onclick = () => setTab('heat');
$('#tab-stars').onclick = () => setTab('stars');
$('#tab-sky').onclick = () => setTab('sky');
$('#show-detail').onchange = e => { show = e.target.checked; if (tab === 'stars') renderStars(); };
$('#reset').onclick = () => { heaterOn = false; heaterT = 25; sliderV = 500; ballT = tempOf(500); photoKey = null; renderControls(); };

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now; time += dt;
  if (!flow || flow.stage === 'observe') {
    if (tab === 'heat') renderHeat(dt);
    else if (tab === 'stars' && viewer.step(dt)) setText('#obs-zoom', viewer.surfaceOn ? '표면 사진' : '');
    flow?.update(checklist([
      ['전기난로를 켜고 열선의 색 변화 관찰하기', heaterDone, '‘전원 켜기’를 누르고 열선의 색이 바뀌는 것을 끝까지 봐요'],
      ['빛을 내는 공의 온도를 바꾸며 색 비교하기', lowSeen && highSeen, '‘빛을 내는 공의 표면 온도’ 막대를 왼쪽 끝(낮음)과 오른쪽 끝(높음)까지 움직여 봐요', '#temp', '#temp'],
      ['실제 별 6개 이상의 색과 표면 온도 조사하기', placed.size >= 6, '‘실제 별의 표면 온도’ 탭에서 ‘리겔’, ‘스피카’, ‘베가’, ‘알데바란’, ‘베텔게우스’, ‘안타레스’ 등을 하나씩 골라요', '#tab-stars'],
      ['실제 사진에서 별빛 색을 재어 비교하기', measuredStars.size >= 3 && [...measuredStars.values()].some(c => tintWord(c) === '푸른빛') && [...measuredStars.values()].some(c => tintWord(c).startsWith('붉은빛')), '사진이 있는 별을 골라 ‘별빛 색 재기’를 눌러요. 푸른 별(리겔·스피카)과 붉은 별(베텔게우스·알데바란)을 모두 재어 봐요', '#measure-color', '#measure-color'],
      ['전갈자리의 안타레스와 드슈바 비교하기', skyPicked.has('antares') && skyPicked.has('dschubba'), '‘별자리와 성단’ 탭에서 ‘안타레스’와 ‘드슈바’를 차례로 골라요', '#tab-sky'],
      ['실제 사진에서 여러 색의 별 찾아보기', photoSeen, '오른쪽 오리온자리 사진을 눌러 크게 보고 베텔게우스와 리겔의 색을 비교해요', '[data-photo-pick]', '[data-photo-pick]'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '붉은색 별과 파란색 별,<br>표면 온도가 더 높은 별은?',
    lead: '전기난로를 켜면 안쪽 열선이 처음에는 어두운 붉은색이었다가 온도가 높아지면서 밝은 주황색·노란색 쪽으로 바뀌어요.<br>밤하늘의 별도 밝기가 비슷해도 색은 조금씩 달라요. 전갈자리의 안타레스는 붉은색, 드슈바는 청백색으로 보여요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="붉은색 별 안타레스와 청백색 별 드슈바"><rect width="520" height="250" rx="12" fill="#050716"/>${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 131) % 520}" cy="${(i * 71) % 250}" r="${.6 + (i % 3) * .4}" fill="#fff" opacity=".6"/>`).join('')}<circle cx="170" cy="135" r="60" fill="#ff8a5c" opacity=".2"/><circle cx="170" cy="135" r="26" fill="#ff8a5c"/><circle cx="170" cy="135" r="10" fill="#fff"/><text x="170" y="210" text-anchor="middle" font-size="16" font-weight="700" fill="#ffb59c">안타레스(붉은색)</text><circle cx="360" cy="120" r="50" fill="#a9c4ff" opacity=".2"/><circle cx="360" cy="120" r="20" fill="#bcd2ff"/><circle cx="360" cy="120" r="8" fill="#fff"/><text x="360" y="210" text-anchor="middle" font-size="16" font-weight="700" fill="#cfe0ff">드슈바(청백색)</text></svg>`,
    question: '붉은색으로 보이는 안타레스와 청백색으로 보이는 드슈바 중 표면 온도가 더 높은 별은 어느 것일까요?',
    choices: ['붉은색인 안타레스의 표면 온도가 더 높을 것 같아요.', '청백색인 드슈바의 표면 온도가 더 높을 것 같아요.', '두 별의 표면 온도는 같을 것 같아요.'],
    placeholder: '가스레인지 불꽃, 전기난로의 열선, 수도꼭지의 빨간색·파란색 표시 등 생활 속에서 본 색과 온도를 떠올려 보세요.',
  },
  observe: {
    title: '빛을 내는 물체와 실제 별들의 색과 표면 온도를 비교해 보세요.',
    recordLabel: '열선과 빛을 내는 공의 색 변화, 조사한 별들의 색과 표면 온도, 안타레스와 드슈바의 비교 결과를 적어 보세요.',
    placeholder: '온도가 높아질 때 열선과 공의 색이 어떻게 바뀌었는지, 파란 별과 붉은 별 중 표면 온도가 높은 별은 무엇이었는지 적어 보세요.',
    // 관찰 기록을 활동마다 나눠 써요(src/poe-flow.js). title은 활동(탭이나 과정)의 이름이에요.
    parts: [
      { title: '온도와 빛의 색', label: '온도가 높아질 때 전기난로의 열선과 빛을 내는 공의 색이 어떻게 바뀌었는지 적어 보세요.', placeholder: '온도가 낮을 때와 높을 때의 색을 비교해 적어 보세요.' },
      { title: '실제 별의 표면 온도', label: '조사한 별들의 색과 표면 온도를 적어 보세요.', placeholder: '파란 별과 붉은 별 중 표면 온도가 높은 별은 무엇이었는지 적어 보세요.' },
      { title: '별자리와 성단', label: '전갈자리의 안타레스와 드슈바를 비교한 결과를 적어 보세요.', placeholder: '두 별의 색과 표면 온도를 비교해 적어 보세요.' },
    ],
  },
  explain: {
    question: '별의 색과 표면 온도 사이에는 어떤 관계가 있나요? 관찰 결과를 근거로 설명해 보세요.',
    concepts: [
      ['빛을 내는 물체의 온도와 색', '<b class="subj">빛을 방출하는 물체는</b> <b>온도</b>에 따라 색이 달라져요. 전기난로의 열선은 처음에는 어두운 붉은색이었다가 온도가 높아지면서 밝은 주황색·노란색 쪽으로 바뀌어요.'],
      ['별의 표면 온도와 색', '<b class="subj">표면 온도가 높은 별은</b> 파란색 빛을 많이 방출하여 <b>파란색</b>을 띠고, <b class="subj">표면 온도가 낮은 별은</b> 붉은색 빛을 많이 방출하여 <b>붉은색</b>을 띠어요. 따라서 <b>별의 색</b>을 이용해 표면 온도를 비교할 수 있어요.'],
      ['별의 색 순서', '표면 온도가 높은 별부터 청색(나오스) → 청백색(스피카, 리겔) → 백색(알타이르, 베가) → 황백색(프로키온) → 황색(태양, 카펠라) → 주황색(아크투루스, 알데바란) → 적색(베텔게우스, 안타레스)이에요.'],
      ['안타레스와 드슈바', '전갈자리에서 <b class="subj">청백색의 드슈바가</b> 붉은색의 안타레스보다 표면 온도가 <b>높아요</b>. 태양은 표면 온도가 약 6000 ℃로 노란색으로 보여요(우주에서 보면 거의 흰색에 가까워요).'],
    ],
    note: '생활 속에서는 붉은색을 ‘뜨겁다’, 파란색을 ‘차갑다’로 나타내곤 하지만, 빛을 내는 별에서는 파란색 별의 표면 온도가 더 높아요.',
  },
  onRestart: () => {
    show = true; $('#show-detail').checked = true;
    heaterDone = lowSeen = highSeen = photoSeen = false; placed.clear(); skyPicked.clear(); measuredStars.clear(); surfaceSeen.clear(); starKey = null; viewer.show(null);
    lab.resetQuiz(); $('#reset').click(); setTab('heat');
  },
});
setTab('heat');
requestAnimationFrame(frame);
