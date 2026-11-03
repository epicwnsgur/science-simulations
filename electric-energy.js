import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, burst, reducedMotion, josa } from './src/lab-shell.js';
import { APPLIANCES, ENERGY, classify, isPowerOrder, wattHours, FRIDGES, CO2_PER_KWH } from './src/energy-model.js';

// 전기 에너지의 이용([9과14-03] 일상생활에서 전기 에너지가 다양한 형태의 에너지로 전환됨을 소비 전력과 관련지어 설명).
// 교과서 탐구 ‘전기 기구에서 전기 에너지의 전환과 소비 전력 비교하기’(전기 에너지 카드)를 가상으로 해요.
// 지도상 유의점: 소비 전력은 정량적인 계산보다 에너지 전환 관점에서 다루고, 효율적인 전기 사용의 중요함을 인식하게 해요.
// 그래서 계산 문제 대신 ① 카드를 소비 전력 순서로 줄 세우기 ② 기구를 바뀌는 에너지 칸에 넣기 ③ 콘센트에 꽂아 같은 시간 동안 쓴 전기 에너지 비교 ④ 효율 등급 비교로 구성했어요.

const terms = [
  ['에너지 전환', '에너지가 한 형태에서 다른 형태로 바뀌는 것이에요. 전기 에너지는 빛·열·운동·소리·화학 에너지 등으로 바뀌어요.'],
  ['소비 전력', '1초 동안 전기 기구가 소모하는 전기 에너지의 양이에요. 단위는 W(와트)를 사용해요.'],
  ['전력량', '전기 기구가 일정 시간 동안 소모하는 전기 에너지의 양이에요. 단위는 Wh(와트시)나 kWh(킬로와트시)를 사용해요.'],
  ['에너지 소비 효율 등급', '전기 에너지를 얼마나 효율적으로 쓰는지 1~5등급으로 나타낸 것이에요. 1등급에 가까울수록 효율적이에요.'],
];

/* ---------- 그림: 전기 기구 아이콘(선 그림) ---------- */
const S = 'stroke="#dfe6ff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  kettle: `<path d="M-14 16 L-12 -8 Q0 -16 12 -8 L14 16 Z" ${S}/><path d="M12 -4 Q24 0 14 12" ${S}/><path d="M-12 -2 L-22 -12" ${S}/><path d="M-16 20 H16" ${S}/>`,
  aircon: `<rect x="-24" y="-12" width="48" height="22" rx="5" ${S}/><path d="M-18 4 H18 M-16 9 H16" ${S}/><path d="M-12 16 q3 4 0 8 M0 16 q3 4 0 8 M12 16 q3 4 0 8" stroke="#5cc8ff" stroke-width="2" fill="none"/>`,
  dryer: `<circle cx="-4" cy="-6" r="12" ${S}/><path d="M8 -12 H22 V0 H8" ${S}/><path d="M-8 6 L-10 22 H0 L0 6" ${S}/>`,
  heater: `<rect x="-22" y="-16" width="44" height="30" rx="5" ${S}/><path d="M-14 -8 h28 M-14 -1 h28 M-14 6 h28" stroke="#ff6b4a" stroke-width="2.5"/><path d="M-16 14 v6 M16 14 v6" ${S}/>`,
  vacuum: `<rect x="-22" y="0" width="24" height="16" rx="6" ${S}/><path d="M2 6 Q16 6 16 -8 V-18 M12 -18 h10" ${S}/><circle cx="-16" cy="18" r="3" ${S}/><circle cx="-4" cy="18" r="3" ${S}/>`,
  washer: `<rect x="-18" y="-20" width="36" height="40" rx="4" ${S}/><circle cx="0" cy="4" r="10" ${S}/><path d="M-12 -14 h8" ${S}/>`,
  blender: `<path d="M-10 -18 H10 L7 6 H-7 Z" ${S}/><rect x="-12" y="6" width="24" height="12" rx="3" ${S}/><path d="M-5 -4 L5 -8" ${S}/>`,
  tv: `<rect x="-24" y="-18" width="48" height="30" rx="3" ${S}/><path d="M-8 20 H8 M0 12 V20" ${S}/>`,
  fan: `<circle cx="0" cy="-6" r="13" ${S}/><path d="M0 -6 L0 -17 M0 -6 L10 0 M0 -6 L-10 0" ${S}/><path d="M0 7 V18 M-9 20 H9" ${S}/>`,
  phone: `<rect x="-10" y="-20" width="20" height="36" rx="4" ${S}/><path d="M-4 -6 h8 v12 h-8 z M-1 -9 h2" stroke="#5dd39e" stroke-width="2" fill="none"/><path d="M0 16 V22 M-6 22 H6" ${S}/>`,
  led: `<path d="M-10 -2 A12 12 0 1 1 10 -2 Q6 4 6 10 H-6 Q-6 4 -10 -2 Z" ${S}/><path d="M-5 14 H5 M-4 18 H4" ${S}/>`,
  headphone: `<path d="M-18 6 V-2 A18 18 0 0 1 18 -2 V6" ${S}/><rect x="-22" y="2" width="9" height="16" rx="3" ${S}/><rect x="13" y="2" width="9" height="16" rx="3" ${S}/>`,
};

/* ---------- 상태 ---------- */
// 학생 의견을 받은 교사 의견: 누르기만 하는 조작은 불편하고 안내가 불친절해요.
// 그래서 세 활동을 모두 ‘끌어다 놓기’로 바꾸고(누르기로도 할 수 있어요), 놓은 자리 옆에 말풍선으로 바로 알려 줘요.
// 처음 보는 활동에서는 손 모양이 끄는 방법을 두 번 보여 주고, ‘어떻게 하나요?’로 다시 볼 수 있어요.
const RIGHT = [...APPLIANCES].sort((a, b) => b.watt - a.watt).map(a => a.id);
// 처음 줄: 제자리에 있는 카드가 하나도 없게 섞어 두었어요.
const START = ['fan', 'kettle', 'led', 'washer', 'tv', 'dryer', 'headphone', 'vacuum', 'aircon', 'heater', 'phone', 'blender'];
const METER_IDS = APPLIANCES.filter(a => a.meter).map(a => a.id);
const RUN_S = 6;

let mode = 'cards', lastFrame = 0, flow = null;
let order = START.slice();                    // ① 자리마다 놓인 카드
const locked = new Set(); let wrongSet = new Set(); // ① 확인한 뒤 제자리(초록)·다른 자리(빨강)
let picked = null;                            // 누르기로 고른 카드·기구 { kind, id }
const placed = new Map();                     // ② 기구 → 넣은 에너지 칸
const plugged = { L: null, R: null }; let lastSide = 'R', run = false, runT = 0; // ③ 콘센트
const fridgesSeen = new Set(); let fridge = null; // ④ 냉장고
const seen = { sorted: false, multi: false, meter: false };
const demoed = new Set();

const byId = id => APPLIANCES.find(a => a.id === id);
const energyOf = id => ENERGY.find(e => e.id === id);
const doneDevices = () => APPLIANCES.filter(a => placed.get(a.id)?.size === a.main.length);
const motion = () => !reducedMotion.matches;
// 무대 글자는 CSS(.stage.night text)가 색을 덮어써서, 색은 style로 줘요.
const T = (x, y, text, { size = 14, weight = 400, color = '#dfe6ff', anchor = 'start', mono = false } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}"${mono ? ' font-family="monospace"' : ''} style="fill:${color}">${text}</text>`;
// 긴 이름은 두 줄로(띄어쓰기에서 나눠요).
const nameLines = (name, x, y, size, color = '#fff', anchor = 'start') => {
  const parts = name.length > 5 && name.includes(' ') ? [name.slice(0, name.indexOf(' ')), name.slice(name.indexOf(' ') + 1)] : [name];
  return parts.map((t, i) => T(x, y + (i - (parts.length - 1) / 2) * (size + 2), t, { size, weight: 700, color, anchor })).join('');
};

// 자리·칸 위치
const slotXY = i => [20 + (i % 6) * 128, 48 + Math.floor(i / 6) * 190];   // ① 카드 120×176
const trayXY = i => [20 + (i % 6) * 128, 40 + Math.floor(i / 6) * 64];    // ② 기구 120×56
const binXY = k => [20 + k * 153, 184];                                   // ② 에너지 칸 148×244
const shelfXY = i => [42 + i * 122, 34];                                  // ③ 기구 112×60
const panelXY = side => [side === 'L' ? 30 : 440, 112];                   // ③ 콘센트 330×316

/* ---------- 장면 ---------- */
const DEMO_HAND = `<g id="demo-hand" pointer-events="none" style="opacity:0"><rect id="demo-ghost" rx="12" fill="#ffd23f22" stroke="#ffd23f" stroke-width="3" stroke-dasharray="9 6"/><g transform="scale(1.4)"><circle r="20" fill="#ffffff" opacity=".22"/><circle r="9" fill="#ffffff" opacity=".55"/><path d="M0 0 L0 26 L6.5 19.5 L11 30 L16 28 L11.5 17.5 L20 17.5 Z" fill="#ffffff" stroke="#10151f" stroke-width="1.6" stroke-linejoin="round"/></g></g>`;
const scene = `<g id="g-cards"></g><g id="g-convert" hidden></g><g id="g-meter" hidden></g><g id="g-grade" hidden></g>
  <g id="drag-layer"><rect id="drop-hl" fill="none" stroke="#ffd23f" stroke-width="4" stroke-dasharray="10 6" rx="14" style="display:none" pointer-events="none"/></g>
  <g id="fx"></g>${DEMO_HAND}<g id="ee-bubble" pointer-events="none" style="opacity:0"></g>`;

const lab = buildLab({
  unit: 7,
  crumb: '06 전기 에너지의 이용',
  title: '우리는 전기 에너지를 어떻게 이용할까?',
  intro: '전기 기구 카드를 끌어다 놓으며 소비 전력을 비교하고, 전기 에너지가 어떤 에너지로 바뀌는지 알아보세요.',
  tabs: [{ id: 'cards', label: '소비 전력 순서' }, { id: 'convert', label: '에너지 전환' }, { id: 'meter', label: '같은 시간 켜 보기' }, { id: 'grade', label: '에너지 소비 효율 등급' }],
  sceneLabel: '전기 기구 카드 줄 세우기, 에너지 칸 분류판, 콘센트와 계량기, 냉장고의 에너지 소비 효율 등급',
  scene,
  terms,
});
// 말풍선 내용을 화면 읽기 프로그램도 읽어 주도록 무대 아래 칸(보이지 않게)에 함께 적어요.
const live = $('#stage-hint');
live.setAttribute('aria-live', 'polite');
Object.assign(live.style, { width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' });

/* ---------- 말풍선: 놓은 자리 옆에서 바로 알려 줘요 ---------- */
let bubbleTimer = 0;
function wrap(text, n = 25) {
  const lines = [''];
  for (const w of text.split(' ')) {
    const cur = lines.at(-1);
    if (cur && (cur + ' ' + w).length > n) lines.push(w); else lines[lines.length - 1] = cur ? `${cur} ${w}` : w;
  }
  return lines;
}
function bubble(x, y, text, tone = 'good') {
  const g = $('#ee-bubble'), color = tone === 'good' ? '#5dd39e' : '#ffb44a';
  const lines = wrap(text);
  g.innerHTML = `<rect rx="14" fill="#0b1230" stroke="${color}" stroke-width="2.5"/><rect width="8" rx="4" fill="${color}"/>${lines.map((l, i) => T(24, 30 + i * 23, l, { size: 15, weight: i ? 500 : 700, color: '#ffffff' })).join('')}`;
  const w = Math.max(...[...g.querySelectorAll('text')].map((t, i) => t.getComputedTextLength?.() || lines[i].length * 15)) + 44, h = lines.length * 23 + 22;
  const [rect, bar] = g.querySelectorAll('rect');
  rect.setAttribute('width', w); rect.setAttribute('height', h);
  bar.setAttribute('x', 10); bar.setAttribute('y', 12); bar.setAttribute('height', h - 24);
  const bx = Math.min(800 - w - 8, Math.max(8, x - w / 2)), by = Math.min(440 - h - 8, Math.max(8, y - h / 2));
  g.setAttribute('transform', `translate(${bx.toFixed(0)} ${by.toFixed(0)})`);
  g.style.opacity = 1;
  if (motion()) g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
  live.textContent = text;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { g.style.opacity = 0; }, 2600 + text.length * 55);
}
const hideBubble = () => { clearTimeout(bubbleTimer); $('#ee-bubble').style.opacity = 0; };

/* ---------- ① 소비 전력이 큰 순서로 줄 세우기 ---------- */
function drawCards() {
  const cards = order.map((id, slot) => {
    const a = byId(id), [x, y] = slotXY(slot), lock = locked.has(id), wrong = wrongSet.has(id), sel = picked?.id === id;
    const stroke = sel ? '#ffd23f' : lock ? '#5dd39e' : wrong ? '#ff6b6b' : '#4a5b8f';
    return `<g data-drag="card:${id}" data-x="${x}" data-y="${y}" data-slot="${slot}"${lock ? ' data-locked="1"' : ''} role="button" tabindex="0" aria-label="${slot + 1}번 자리: ${a.name}, 소비 전력 ${a.watt} W${lock ? ', 제자리예요' : wrong ? ', 자리가 맞지 않아요' : ''}" transform="translate(${x} ${y})" style="cursor:${lock ? 'default' : 'grab'}"><g class="ee-body">
      <rect width="120" height="176" rx="12" fill="${lock ? '#0f2a22' : sel ? '#1f2a52' : '#121a3a'}" stroke="${stroke}" stroke-width="${sel || lock || wrong ? 3.5 : 1.5}"/>
      <g transform="translate(60 54) scale(1.15)">${ICONS[id]}</g>
      ${nameLines(a.name, 60, a.name.length > 5 && a.name.includes(' ') ? 104 : 110, a.name.length > 5 ? 14 : 16, '#ffffff', 'middle')}
      ${T(60, 132, '소비 전력', { size: 12, color: '#aab4d6', anchor: 'middle' })}
      ${T(60, 156, `${a.watt.toLocaleString()} W`, { size: 21, weight: 800, color: '#ffd166', anchor: 'middle' })}
      ${T(60, 170, '정격 전압 220 V', { size: 10, color: '#8f9bc4', anchor: 'middle' })}
      ${sel ? `<rect x="58" y="-11" width="70" height="22" rx="11" fill="#ffd23f"/>${T(93, 4, '골랐어요', { size: 12, weight: 800, color: '#2a1d00', anchor: 'middle' })}` : ''}
      ${lock ? '<circle cx="102" cy="18" r="11" fill="#5dd39e"/><path d="M96.5 18 l4 4 l7.5 -8" stroke="#08261a" stroke-width="2.6" fill="none"/>' : wrong ? '<circle cx="102" cy="18" r="11" fill="#ff6b6b"/><path d="M98 14 l8 8 M106 14 l-8 8" stroke="#2a0808" stroke-width="2.6"/>' : ''}
    </g></g>`;
  }).join('');
  const badges = order.map((_, slot) => { const [x, y] = slotXY(slot); return `<circle cx="${x + 16}" cy="${y + 16}" r="12" fill="#0a1029" stroke="#ffd23f" stroke-width="1.5"/>${T(x + 16, y + 21, slot + 1, { size: 13, weight: 800, color: '#ffd23f', anchor: 'middle' })}`; }).join('');
  setHTML('#g-cards', `${T(420, 34, '소비 전력이 큰 기구부터 1번 → 12번 자리에 차례대로', { size: 15, weight: 700, color: '#ffd166', anchor: 'middle' })}
    ${cards}<g pointer-events="none">${badges}</g>`);
}
function swapCards(id, slot, from = null) {
  const at = order.indexOf(id), other = order[slot];
  if (at === slot) return false;
  const [tx, ty] = slotXY(slot), [ox, oy] = slotXY(at);
  if (locked.has(other)) { bubble(tx + 60, ty + 88, '초록색 카드는 이미 제자리예요. 빨간색이나 아직 확인하지 않은 카드 위에 놓아 보세요.', 'try'); return false; }
  order[slot] = id; order[at] = other;
  wrongSet.delete(id); wrongSet.delete(other);
  hideBubble();
  render();
  // 두 카드가 서로 자리를 바꾸는 모습을 짧게 보여 줘요.
  if (motion()) {
    const slide = (cid, fx, fy, [nx, ny]) => $(`[data-drag="card:${cid}"] .ee-body`)?.animate([{ transform: `translate(${fx - nx}px, ${fy - ny}px)` }, { transform: 'translate(0px, 0px)' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
    slide(id, from?.[0] ?? ox, from?.[1] ?? oy, [tx, ty]);
    slide(other, tx, ty, [ox, oy]);
  }
  return true;
}
function checkOrder() {
  const r = isPowerOrder(order);
  order.forEach(id => { if (!r.wrong.has(id)) locked.add(id); });
  wrongSet = new Set(r.wrong);
  picked = null;
  if (r.ok) {
    seen.sorted = true;
    bubble(400, 236, `모두 제자리예요! 소비 전력이 가장 큰 기구는 ${byId(RIGHT[0]).name}, 가장 작은 기구는 ${byId(RIGHT.at(-1)).name}이에요.`, 'good');
    burst($('#fx'), 400, 236, '#ffd23f', 20);
  } else {
    bubble(400, 236, `초록 카드 ${locked.size}장은 제자리예요. 빨간 카드 ${r.wrong.size}장은 자리가 맞지 않아요. 소비 전력 숫자를 다시 비교해서 빨간 카드끼리 자리를 바꿔 보세요.`, 'try');
  }
  render();
}

/* ---------- ② 에너지 칸에 넣기 ---------- */
function drawConvert() {
  const tray = APPLIANCES.map((a, i) => {
    const [x, y] = trayXY(i), set = placed.get(a.id) ?? new Set(), done = set.size === a.main.length, part = set.size > 0 && !done, sel = picked?.id === a.id;
    return `<g data-drag="dev:${a.id}" data-x="${x}" data-y="${y}"${done ? ' data-locked="1"' : ''} role="button" tabindex="0" aria-label="${a.name}${done ? ', 분류를 마쳤어요' : part ? ', 한 칸 더 넣어야 해요' : ''}" transform="translate(${x} ${y})" style="cursor:${done ? 'default' : 'grab'};opacity:${done ? .4 : 1}"><g class="ee-body">
      <rect width="120" height="56" rx="10" fill="${sel ? '#1f2a52' : '#121a3a'}" stroke="${sel ? '#ffd23f' : part ? '#ffb44a' : '#4a5b8f'}" stroke-width="${sel || part ? 3 : 1.5}"/>
      <g transform="translate(24 28) scale(.68)">${ICONS[a.id]}</g>
      ${nameLines(a.name, 46, 33, a.name.length > 5 && !a.name.includes(' ') ? 13 : 14)}
      ${sel ? `<rect x="58" y="-10" width="66" height="20" rx="10" fill="#ffd23f"/>${T(91, 4, '골랐어요', { size: 11.5, weight: 800, color: '#2a1d00', anchor: 'middle' })}` : done ? '<circle cx="108" cy="12" r="8" fill="#5dd39e"/><path d="M104 12 l3 3 l5.5 -6" stroke="#08261a" stroke-width="2.2" fill="none"/>' : part ? `<rect x="78" y="-9" width="50" height="18" rx="9" fill="#ffb44a"/>${T(103, 4, '한 칸 더', { size: 11, weight: 800, color: '#2a1700', anchor: 'middle' })}` : ''}
    </g></g>`;
  }).join('');
  const bins = ENERGY.map((e, k) => {
    const [x, y] = binXY(k), names = APPLIANCES.filter(a => placed.get(a.id)?.has(e.id));
    return `<g data-zone="${e.id}" role="button" tabindex="0" aria-label="${e.name} 칸${names.length ? `: ${names.map(a => a.name).join(', ')}` : ''}" transform="translate(${x} ${y})">
      <rect width="148" height="244" rx="12" fill="#0f1730" stroke="${e.color}" stroke-width="${picked ? 3 : 2}"${picked ? ' stroke-dasharray="9 5"' : ''}/>
      <path d="M0 12 a12 12 0 0 1 12 -12 h124 a12 12 0 0 1 12 12 v26 h-148 z" fill="${e.color}"/>
      ${T(74, 25, e.name, { size: 15, weight: 800, color: '#10151f', anchor: 'middle' })}
      ${names.map((a, j) => `<g data-binned="${a.id}-${e.id}" transform="translate(8 ${48 + j * 28})"><rect width="132" height="24" rx="6" fill="#1b2550"/><g transform="translate(14 12) scale(.36)">${ICONS[a.id]}</g>${T(30, 17, a.name, { size: 13, color: '#ffffff' })}</g>`).join('')}
      ${names.length ? '' : T(74, 140, picked ? '여기를 눌러 넣어요' : '여기에 놓아요', { size: 13, color: '#6f7cab', anchor: 'middle' })}
    </g>`;
  }).join('');
  setHTML('#g-convert', `${tray}${T(400, 172, '↓ 전기 에너지가 주로 바뀌는 에너지 칸에 넣어요', { size: 13, weight: 700, color: '#ffd166', anchor: 'middle' })}${bins}`);
}
function dropDevice(id, energyId) {
  const a = byId(id), e = energyOf(energyId), k = ENERGY.indexOf(e), [bx, by] = binXY(k), at = [bx + 74, by + 150];
  const set = placed.get(id) ?? new Set();
  if (set.has(energyId)) { bubble(...at, `${josa(a.name, '은', '는')} 이미 ${e.name} 칸에 넣었어요.`, 'try'); return false; }
  const r = classify(a, energyId);
  if (r !== 'main') {
    const why = r === 'minor'
      ? (energyId === 'heat' ? (a.heatNote ?? `${a.name}도 쓰는 동안 조금 따뜻해지지만, 열을 내려고 쓰는 기구는 아니에요. ${a.use}`) : `${a.name}에서 ${e.name}도 조금 나오지만, 주로 바뀌는 에너지는 아니에요. ${a.use}`)
      : `${a.name}에서 전기 에너지는 주로 ${e.name}로 바뀌지 않아요. ${a.use}`;
    bubble(...at, `${why} 다른 칸에 넣어 보세요.`, 'try');
    return false;
  }
  set.add(energyId); placed.set(id, set);
  const done = set.size === a.main.length;
  if (done && a.main.length > 1) seen.multi = true;
  render();
  if (motion()) $(`[data-binned="${id}-${energyId}"]`)?.animate([{ opacity: 0, transform: 'translate(8px, 40px) scale(.9)' }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  if (!done) bubble(...at, `맞아요! 그런데 ${a.name}에서는 전기 에너지가 한 가지 에너지로만 바뀌지 않아요. 다른 칸을 하나 더 찾아 넣어 보세요.`, 'good');
  else if (doneDevices().length === APPLIANCES.length) { bubble(400, 260, '12개 기구를 모두 분류했어요! 분류판을 보고 어느 에너지 칸에 기구가 가장 많은지 살펴보세요.', 'good'); burst($('#fx'), 400, 260, '#5dd39e', 20); }
  else bubble(...at, `맞아요! ${a.name}: 전기 에너지 → ${a.main.map(v => energyOf(v).name).join(' + ')}${a.note ? `. ${a.note}.` : ''}`, 'good');
  return true;
}

/* ---------- ③ 콘센트에 꽂고 같은 시간 켜 보기 ---------- */
function drawMeter() {
  const t = Math.min(1, runT / RUN_S), minutes = Math.round(t * 60);
  const shelf = METER_IDS.map((id, i) => {
    const a = byId(id), [x, y] = shelfXY(i), on = plugged.L === id || plugged.R === id;
    return `<g data-drag="plug:${id}" data-x="${x}" data-y="${y}"${run ? ' data-locked="1"' : ''} role="button" tabindex="0" aria-label="${a.name}, 소비 전력 ${a.watt} W${on ? ', 콘센트에 꽂혀 있어요' : ''}" transform="translate(${x} ${y})" style="cursor:${run ? 'default' : 'grab'};opacity:${on ? .45 : 1}"><g class="ee-body">
      <rect width="112" height="60" rx="10" fill="#121a3a" stroke="${on ? '#5dd39e' : '#4a5b8f'}" stroke-width="${on ? 2.5 : 1.5}"/>
      <g transform="translate(22 30) scale(.62)">${ICONS[id]}</g>
      ${T(44, 26, a.name, { size: 12.5, weight: 700, color: '#ffffff' })}
      ${T(44, 46, `${a.watt.toLocaleString()} W`, { size: 13, weight: 700, color: '#ffd166' })}
    </g></g>`;
  }).join('');
  const panel = side => {
    const [x, y] = panelXY(side), id = plugged[side], a = id && byId(id), color = side === 'L' ? '#5cc8ff' : '#ff9f6b';
    const socket = `<g transform="translate(276 24)"><rect width="38" height="30" rx="7" fill="#e6ebf7"/><rect x="10" y="10" width="4" height="10" rx="2" fill="#2c365a"/><rect x="24" y="10" width="4" height="10" rx="2" fill="#2c365a"/></g>`;
    if (!a) return `<g data-zone="${side}" role="button" tabindex="0" aria-label="${side === 'L' ? '왼쪽' : '오른쪽'} 콘센트, 비어 있어요" transform="translate(${x} ${y})">
      <rect width="330" height="316" rx="14" fill="#0f1730" stroke="${color}" stroke-width="2.5" stroke-dasharray="10 7"/>${socket}
      ${T(165, 150, '위의 기구를', { size: 17, weight: 700, color, anchor: 'middle' })}${T(165, 176, '여기로 끌어다 꽂아요', { size: 17, weight: 700, color, anchor: 'middle' })}
      <path d="M165 196 v34 M153 218 l12 12 l12 -12" stroke="${color}" stroke-width="2.5" fill="none" opacity=".6"/></g>`;
    const wh = wattHours(a.watt, t), h = 172 * wh / wattHours(2000, 1);
    return `<g data-zone="${side}" role="button" tabindex="0" aria-label="${side === 'L' ? '왼쪽' : '오른쪽'} 콘센트: ${a.name}, 쓴 전기 에너지 ${Math.round(wh)} Wh" transform="translate(${x} ${y})">
      <rect width="330" height="316" rx="14" fill="#121a3a" stroke="${color}" stroke-width="2.5"/>${socket}
      <path d="M92 56 Q180 20 286 44" stroke="#8f9bc4" stroke-width="3" fill="none"/>
      <g transform="translate(62 62) scale(1.4)">${ICONS[id]}</g>
      ${run ? `<circle cx="62" cy="62" r="40" fill="none" stroke="${color}" stroke-width="2" opacity=".6"><animate attributeName="r" values="36;44;36" dur="1s" repeatCount="indefinite"/></circle>` : ''}
      ${T(120, 112, a.name, { size: 18, weight: 800, color: '#ffffff' })}${T(120, 136, `소비 전력 ${a.watt.toLocaleString()} W`, { size: 14, weight: 700, color: '#ffd166' })}
      <rect x="40" y="128" width="60" height="176" rx="8" fill="#0a1029" stroke="#3a4a7a"/>
      <rect x="44" y="${(300 - h).toFixed(1)}" width="52" height="${h.toFixed(1)}" rx="5" style="fill:${color}"/>
      <rect x="116" y="170" width="196" height="96" rx="10" fill="#0a1029" stroke="#3a4a7a"/>
      ${T(214, 196, '계량기: 쓴 전기 에너지', { size: 13, color: '#cfd8f2', anchor: 'middle' })}
      ${T(214, 234, `${Math.round(wh).toLocaleString()} Wh`, { size: 28, weight: 800, color, anchor: 'middle', mono: true })}
      ${T(214, 256, '(전력량)', { size: 12, color: '#8f9bc4', anchor: 'middle' })}
    </g>`;
  };
  const a = t * 2 * Math.PI;
  setHTML('#g-meter', `${shelf}${panel('L')}${panel('R')}
    <g transform="translate(400 250)"><circle r="31" fill="#0a1029" stroke="#dfe6ff" stroke-width="2"/><path d="M0 0 V-24" stroke="#dfe6ff" stroke-width="2.5"/><path d="M0 0 L${(22 * Math.sin(a)).toFixed(1)} ${(-22 * Math.cos(a)).toFixed(1)}" stroke="#ffd23f" stroke-width="3"/>
    ${T(0, 52, `${minutes}분`, { size: 16, weight: 800, color: '#ffffff', anchor: 'middle' })}${T(0, 72, '1시간을', { size: 11, color: '#8f9bc4', anchor: 'middle' })}${T(0, 86, '6초로', { size: 11, color: '#8f9bc4', anchor: 'middle' })}</g>`);
}
function plug(id, side) {
  const other = side === 'L' ? 'R' : 'L';
  if (plugged[side] === id) return false;
  if (plugged[other] === id) plugged[other] = plugged[side]; // 반대쪽에 꽂힌 기구를 옮기면 두 기구가 자리를 바꿔요.
  plugged[side] = id; lastSide = side; runT = 0;
  hideBubble(); render();
  const [x, y] = panelXY(side);
  if (plugged.L && plugged.R) bubble(400, 400, '두 기구를 꽂았어요. 이제 아래의 ‘1시간 켜 보기’를 눌러 보세요.', 'good');
  else bubble(x + 165, y + 290, `${josa(byId(id).name, '을', '를')} 꽂았어요. 다른 쪽 콘센트에도 기구를 하나 꽂아요.`, 'good');
  return true;
}
const freeSide = () => (!plugged.L ? 'L' : !plugged.R ? 'R' : lastSide === 'L' ? 'R' : 'L');
function startRun() {
  if (!plugged.L || !plugged.R) { bubble(400, 270, '콘센트 두 곳에 기구를 하나씩 끌어다 꽂아야 켤 수 있어요.', 'try'); return; }
  hideBubble(); run = true; runT = 0; render();
}

/* ---------- ④ 에너지 소비 효율 등급 ---------- */
const GRADE_COLORS = ['#1e9e4a', '#7cc242', '#f2d22e', '#f39a2b', '#e2412b'];
function drawGrade() {
  const max = Math.max(...FRIDGES.map(f => f.kwh));
  setHTML('#g-grade', `${T(400, 40, '크기와 성능이 같은 냉장고 세 대 · 눌러서 한 달 동안 쓴 전기 에너지를 확인해요', { size: 15, weight: 700, color: '#ffffff', anchor: 'middle' })}
    ${FRIDGES.map((f, i) => {
      const x = 40 + i * 250, on = fridgesSeen.has(f.grade), sel = fridge === f.grade, h = on ? 100 * f.kwh / max : 0;
      return `<g data-fridge="${f.grade}" role="button" tabindex="0" aria-label="${f.grade}등급 냉장고${on ? `, 한 달 ${f.kwh} kWh` : ''}" transform="translate(${x} 64)" style="cursor:pointer">
        <rect width="230" height="350" rx="14" fill="#121a3a" stroke="${sel ? '#ffd23f' : on ? '#8f9bc4' : '#3a4a7a'}" stroke-width="${sel ? 3.5 : 1.5}"/>
        <rect x="20" y="20" width="70" height="120" rx="8" fill="#dfe6ff22" stroke="#dfe6ff"/><path d="M20 62 H90 M80 32 V50 M80 74 V110" stroke="#dfe6ff" stroke-width="2"/>
        <g transform="translate(108 22)">${[1, 2, 3, 4, 5].map(g => `<rect x="0" y="${(g - 1) * 22}" width="${40 + g * 12}" height="18" rx="3" fill="${GRADE_COLORS[g - 1]}" opacity="${g === f.grade ? 1 : .28}"/>${T(6, (g - 1) * 22 + 14, g, { size: 12, weight: 800, color: '#10151f' })}`).join('')}</g>
        ${T(115, 168, `${f.grade}등급`, { size: 20, weight: 800, color: '#ffffff', anchor: 'middle' })}
        ${on ? `${T(115, 198, `한 달 ${f.kwh} kWh`, { size: 18, weight: 800, color: '#ffd166', anchor: 'middle' })}${T(115, 220, `이산화 탄소 약 ${Math.round(f.kwh * CO2_PER_KWH)} kg`, { size: 13, color: '#cfd8f2', anchor: 'middle' })}
          <rect x="70" y="${(336 - h).toFixed(1)}" width="90" height="${h.toFixed(1)}" rx="5" fill="${GRADE_COLORS[f.grade - 1]}"/>` : `<rect x="45" y="200" width="140" height="40" rx="20" fill="#1f2a52" stroke="#ffd23f"/>${T(115, 226, '눌러서 확인', { size: 15, weight: 700, color: '#ffd23f', anchor: 'middle' })}`}
      </g>`;
    }).join('')}`);
}
function chooseFridge(g) {
  fridge = g; fridgesSeen.add(g); render();
  if (fridgesSeen.has(1) && fridgesSeen.has(5) && !seen.gradeSaid) {
    seen.gradeSaid = true;
    const [one, five] = [FRIDGES[0], FRIDGES.at(-1)];
    bubble(400, 120, `성능이 같아도 5등급은 1등급보다 한 달에 ${five.kwh - one.kwh} kWh를 더 써요. 이산화 탄소도 더 많이 나와요.`, 'good');
  }
}

/* ---------- 끌어다 놓기(마우스·손가락), 누르기·키보드로도 돼요 ---------- */
const svg = $('#scene');
const pt = e => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
const inside = (p, x, y, w, h, pad = 0) => p.x >= x - pad && p.x <= x + w + pad && p.y >= y - pad && p.y <= y + h + pad;
function zoneAt(p) {
  if (mode === 'cards') { const i = order.findIndex((_, s) => inside(p, ...slotXY(s), 120, 176, 4)); return i < 0 ? null : { id: i, rect: [...slotXY(i), 120, 176] }; }
  if (mode === 'convert') { const k = ENERGY.findIndex((_, j) => inside(p, ...binXY(j), 148, 244, 4) || (p.y > 170 && inside(p, binXY(j)[0], 170, 148, 270))); return k < 0 ? null : { id: ENERGY[k].id, rect: [...binXY(k), 148, 244] }; }
  if (mode === 'meter') { const side = ['L', 'R'].find(sd => inside(p, ...panelXY(sd), 330, 316, 6)); return side ? { id: side, rect: [...panelXY(side), 330, 316] } : null; }
  return null;
}
function showDrop(z) {
  const hl = $('#drop-hl');
  if (!z) { hl.style.display = 'none'; return; }
  const [x, y, w, h] = z.rect;
  Object.entries({ x: x - 5, y: y - 5, width: w + 10, height: h + 10 }).forEach(([k, v]) => hl.setAttribute(k, v));
  hl.style.display = '';
}
let drag = null;
svg.addEventListener('pointerdown', e => {
  hideDemo();
  const el = e.target.closest('[data-drag]'), zone = e.target.closest('[data-zone]');
  if (!el && !zone) return;
  e.preventDefault();
  const p = pt(e);
  drag = { el, zone, sx: p.x, sy: p.y, moved: false, ghost: null, x0: +el?.dataset.x, y0: +el?.dataset.y };
  svg.setPointerCapture?.(e.pointerId);
});
svg.addEventListener('pointermove', e => {
  if (!drag?.el || drag.el.dataset.locked) return;
  const p = pt(e);
  if (!drag.moved) {
    if (Math.hypot(p.x - drag.sx, p.y - drag.sy) < 6) return;
    drag.moved = true; hideBubble(); picked = null;
    const ghost = drag.el.cloneNode(true);
    ['data-drag', 'tabindex', 'role', 'aria-label', 'transform'].forEach(k => ghost.removeAttribute(k));
    ghost.setAttribute('pointer-events', 'none'); ghost.style.opacity = .92; ghost.style.cursor = 'grabbing';
    ghost.querySelector('rect')?.setAttribute('stroke', '#ffd23f');
    $('#drag-layer').append(ghost); drag.ghost = ghost;
    drag.el.style.opacity = .3;
  }
  drag.gx = drag.x0 + p.x - drag.sx; drag.gy = drag.y0 + p.y - drag.sy;
  drag.ghost.style.transform = `translate(${drag.gx}px, ${drag.gy}px) scale(1.04)`;
  showDrop(zoneAt(p));
});
function endDrag(e, cancel = false) {
  if (!drag) return;
  const d = drag; drag = null; showDrop(null);
  if (!d.moved) { if (!cancel) tap(d.el, d.zone); return; }
  const z = cancel ? null : zoneAt(pt(e));
  const [kind, id] = d.el.dataset.drag.split(':');
  let ok = false;
  if (z && kind === 'card') ok = swapCards(id, z.id, [d.gx, d.gy]);
  else if (z && kind === 'dev') ok = dropDevice(id, z.id);
  else if (z && kind === 'plug') ok = plug(id, z.id);
  else if (!z && !cancel) bubble(d.gx + 60, d.gy + 40, { card: '다른 카드 위에 놓으면 두 카드의 자리가 바뀌어요.', dev: '아래의 에너지 칸 안에 놓아 보세요.', plug: '아래의 콘센트 칸 안에 놓아 보세요.' }[kind], 'try');
  if (ok) { d.ghost.remove(); return; }
  d.el.style.opacity = '';
  // 놓을 수 없는 곳이면 제자리로 돌아가요.
  if (motion()) d.ghost.animate([{ transform: d.ghost.style.transform }, { transform: `translate(${d.x0}px, ${d.y0}px)` }], { duration: 260, easing: 'ease-in' }).onfinish = () => d.ghost.remove();
  else d.ghost.remove();
}
svg.addEventListener('pointerup', e => endDrag(e));
svg.addEventListener('pointercancel', e => endDrag(e, true));
// 누르기: 카드는 두 장을 차례로 누르면 자리가 바뀌고, 기구는 누른 뒤 에너지 칸을 눌러요. 콘센트 기구는 누르면 빈 콘센트에 꽂혀요.
function tap(el, zone) {
  const [kind, id] = el?.dataset.drag.split(':') ?? [];
  if (el?.dataset.locked) {
    const [x, y] = [+el.dataset.x, +el.dataset.y];
    if (kind === 'card') bubble(x + 60, y + 88, '이 카드는 이미 제자리예요.', 'good');
    else if (kind === 'dev') bubble(x + 60, y + 80, '이미 분류를 마친 기구예요.', 'good');
    return;
  }
  if (kind === 'card') {
    if (!picked) { picked = { kind, id }; hideBubble(); render(); }
    else if (picked.id === id) { picked = null; hideBubble(); render(); }
    else { const from = picked.id; picked = null; if (!swapCards(from, order.indexOf(id))) render(); }
  } else if (kind === 'dev') {
    picked = picked?.id === id ? null : { kind, id };
    hideBubble(); render();
  } else if (kind === 'plug') {
    if (!run) plug(id, freeSide());
  } else if (zone && mode === 'convert') {
    if (picked?.kind === 'dev') { const id2 = picked.id; picked = null; if (!dropDevice(id2, zone.dataset.zone)) render(); }
    else { const [x, y] = binXY(ENERGY.findIndex(v => v.id === zone.dataset.zone)); bubble(x + 74, y + 150, '위의 기구 카드를 이 칸으로 끌어다 놓아요.', 'try'); }
  } else if (zone && mode === 'meter' && !plugged[zone.dataset.zone]) {
    const [x, y] = panelXY(zone.dataset.zone); bubble(x + 165, y + 260, '위의 기구 카드를 이 콘센트로 끌어다 놓아요.', 'try');
  }
}
svg.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[data-drag]'), zone = e.target.closest('[data-zone]'), fr = e.target.closest('[data-fridge]');
  if (!el && !zone && !fr) return;
  e.preventDefault();
  if (fr) chooseFridge(+fr.dataset.fridge); else tap(el, zone);
  // 다시 그린 뒤에도 같은 자리에 초점을 둬요.
  const key = el ? `[data-drag="${el.dataset.drag}"]` : zone ? `[data-zone="${zone.dataset.zone}"]` : `[data-fridge="${fr.dataset.fridge}"]`;
  $(key)?.focus();
});
svg.addEventListener('click', e => { const fr = e.target.closest('[data-fridge]'); if (fr) chooseFridge(+fr.dataset.fridge); });

/* ---------- 손 모양 시범: 처음 보는 활동에서 끄는 방법을 두 번 보여 줘요 ---------- */
function demoPath() {
  if (mode === 'cards') {
    const i = order.findIndex((id, s) => id !== RIGHT[s]);
    if (i < 0) return null;
    const [fx, fy] = slotXY(order.indexOf(RIGHT[i])), [tx, ty] = slotXY(i);
    return [fx + 60, fy + 70, tx + 60, ty + 70];
  }
  if (mode === 'convert') {
    const a = APPLIANCES.find(v => placed.get(v.id)?.size !== v.main.length);
    if (!a) return null;
    const [fx, fy] = trayXY(APPLIANCES.indexOf(a)), e = a.main.find(v => !placed.get(a.id)?.has(v)), [tx, ty] = binXY(ENERGY.findIndex(v => v.id === e));
    return [fx + 60, fy + 28, tx + 74, ty + 130];
  }
  if (mode === 'meter') {
    const id = METER_IDS.find(v => v !== plugged.L && v !== plugged.R), [fx, fy] = shelfXY(METER_IDS.indexOf(id)), [tx, ty] = panelXY(freeSide());
    return [fx + 56, fy + 30, tx + 165, ty + 170];
  }
  return null;
}
let demoAnim = null;
function playDemo() {
  const path = demoPath(), hand = $('#demo-hand');
  if (!path || !hand.animate) return;
  const [fx, fy, tx, ty] = path;
  hideDemo();
  // 끌고 가는 카드의 테두리도 함께 움직여요(무엇을 옮기는지 보이게).
  const [gx, gy, gw, gh] = { cards: [-60, -70, 120, 176], convert: [-60, -28, 120, 56], meter: [-56, -30, 112, 60] }[mode];
  Object.entries({ x: gx, y: gy, width: gw, height: gh }).forEach(([k, v]) => $('#demo-ghost').setAttribute(k, v));
  if (!motion()) { hand.style.transform = `translate(${tx}px, ${ty}px)`; hand.style.opacity = .9; setTimeout(hideDemo, 2500); return; }
  demoAnim = hand.animate([
    { transform: `translate(${fx}px, ${fy}px) scale(1.15)`, opacity: 0 },
    { transform: `translate(${fx}px, ${fy}px) scale(1)`, opacity: 1, offset: .15 },
    { transform: `translate(${tx}px, ${ty}px) scale(1)`, opacity: 1, offset: .75, easing: 'ease-in-out' },
    { transform: `translate(${tx}px, ${ty}px) scale(1.15)`, opacity: 0 },
  ], { duration: 1900, iterations: 2, delay: 300 });
  demoAnim.onfinish = hideDemo;
}
function hideDemo() { demoAnim?.cancel(); demoAnim = null; const h = $('#demo-hand'); if (h) { h.style.opacity = 0; h.style.transform = ''; } }

/* ---------- 글과 단추 ---------- */
const NEXT = { cards: ['convert', '에너지 전환'], convert: ['meter', '같은 시간 켜 보기'], meter: ['grade', '에너지 소비 효율 등급'] };
const tabDone = () => ({ cards: seen.sorted, convert: doneDevices().length >= 6 && seen.multi, meter: seen.meter, grade: false })[mode];
const GUIDE = {
  cards: ['전기 기구 카드를 끌어서, 소비 전력이 큰 순서대로 줄을 세워 보세요.', '카드를 다른 카드 위에 놓으면 두 카드의 자리가 바뀌어요. 1번 자리에 소비 전력이 가장 큰 기구가 와요. 다 세웠으면 ‘순서 확인하기’를 눌러요.'],
  convert: ['기구 카드를 끌어서, 전기 에너지가 주로 바뀌는 에너지 칸에 넣어 보세요.', '맞는 칸에 넣으면 칸 안에 들어가요. 두 가지 에너지로 바뀌는 기구는 두 칸에 하나씩 넣어요. 끌기 어려우면 기구를 누른 뒤 칸을 눌러도 돼요.'],
  meter: ['기구 두 개를 콘센트에 끌어다 꽂고, ‘1시간 켜 보기’를 눌러 보세요.', '계량기 숫자는 켜 둔 동안 쓴 전기 에너지(전력량)예요. 소비 전력이 다른 두 기구를 꽂아 비교해요. 기구를 누르기만 해도 빈 콘센트에 꽂혀요.'],
  grade: ['크기와 성능이 같은 냉장고 세 대를 하나씩 눌러 보세요.', '한 달 동안 쓴 전기 에너지와 이산화 탄소 배출량을 등급끼리 비교해요. 1등급과 5등급은 꼭 확인해요.'],
};
function renderText() {
  setText('#guide', GUIDE[mode][0]);
  setText('#subguide', picked && mode === 'cards' ? `${byId(picked.id).name} 카드를 골랐어요. 자리를 바꿀 카드를 눌러요. (같은 카드를 다시 누르면 취소돼요.)`
    : picked && mode === 'convert' ? `${josa(byId(picked.id).name, '을', '를')} 골랐어요. 아래에서 알맞은 에너지 칸을 눌러요.` : GUIDE[mode][1]);
  setText('#stage-state', {
    cards: seen.sorted ? '줄 세우기를 마쳤어요' : `제자리 카드 ${locked.size} / ${APPLIANCES.length}`,
    convert: `분류를 마친 기구 ${doneDevices().length} / ${APPLIANCES.length}`,
    meter: run ? '켜는 중…' : runT >= RUN_S ? '1시간 동안 켰어요' : `꽂은 기구 ${(plugged.L ? 1 : 0) + (plugged.R ? 1 : 0)} / 2`,
    grade: `확인한 냉장고 ${fridgesSeen.size} / ${FRIDGES.length}`,
  }[mode]);
  setText('#note-title', { cards: '소비 전력이 가장 큰 기구는?', convert: '전기 에너지는 어떤 에너지로 바뀌나요?', meter: '같은 시간 동안 더 많은 전기 에너지를 쓴 기구는?', grade: '1등급과 5등급, 무엇이 다를까요?' }[mode]);
  setText('#note-text', {
    cards: '소비 전력은 1초 동안 전기 기구가 소모하는 전기 에너지의 양이에요. 열을 내는 기구와 전동기가 든 기구의 소비 전력을 살펴보세요.',
    convert: '한 기구에서 두 가지 이상의 에너지로 바뀌기도 해요. 전기 에너지는 없어지는 것이 아니라 다른 형태의 에너지로 바뀌어요.',
    meter: '두 기구를 같은 시간 동안 켰을 때 계량기 숫자가 어떻게 다르게 올라가는지 비교해요.',
    grade: '성능이 같아도 전기 에너지를 쓰는 양이 다를 수 있어요. 냉장고는 하루 종일 켜 두는 기구예요.',
  }[mode]);
  const table = (head, rows) => `<table class="data-table"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  setHTML('#readout',
    mode === 'cards' && seen.sorted ? table(['', '기구', '소비 전력'], [['가장 큰 기구', byId(RIGHT[0]).name, `${byId(RIGHT[0]).watt.toLocaleString()} W`], ['가장 작은 기구', byId(RIGHT.at(-1)).name, `${byId(RIGHT.at(-1)).watt} W`]])
      : mode === 'convert' && placed.size ? table(['에너지', '전기 기구'], ENERGY.map(e => [e.name, APPLIANCES.filter(a => placed.get(a.id)?.has(e.id)).map(a => a.name).join(', ') || '-']))
        : mode === 'meter' && runT >= RUN_S ? table(['전기 기구', '소비 전력', '1시간 동안 쓴 전기 에너지'], [plugged.L, plugged.R].map(byId).map(a => [a.name, `${a.watt.toLocaleString()} W`, `${a.watt.toLocaleString()} Wh`]))
          : mode === 'grade' && fridgesSeen.size ? table(['등급', '한 달 전기 에너지', '이산화 탄소'], FRIDGES.filter(f => fridgesSeen.has(f.grade)).map(f => [`${f.grade}등급`, `${f.kwh} kWh`, `약 ${Math.round(f.kwh * CO2_PER_KWH)} kg`]))
            : '');
  setText('#model-note', {
    cards: '소비 전력은 같은 종류의 기구라도 제품마다 달라요. 화면의 값은 집에서 흔히 쓰는 제품의 대략적인 값이에요.',
    convert: '‘주로’ 바뀌는 에너지를 골라요. 대부분의 전기 기구는 쓰는 동안 조금씩 따뜻해지지만, 열을 내려고 쓰는 기구(전기 주전자, 전열기, 헤어드라이어)가 아니면 열에너지 칸에는 넣지 않아요.',
    meter: '1시간을 6초로 빠르게 나타냈어요. 소비 전력이 1 W인 기구를 1시간 동안 쓰면 1 Wh의 전기 에너지를 써요(1 kWh = 1000 Wh).',
    grade: '냉장고 값과 이산화 탄소 배출량은 등급을 비교하기 위한 예시예요. 실제 값은 제품의 에너지 소비 효율 등급 표에서 확인해요.',
  }[mode]);
  setText('#discovery', '우리 집에서 소비 전력이 가장 큰 전기 기구는 무엇일까요?');
}
function renderControls() {
  const how = mode !== 'grade' ? '<button type="button" class="secondary" id="how-to">어떻게 하나요?</button>' : '';
  const next = NEXT[mode] && tabDone() ? `<button type="button" class="primary" id="next-tab">다음 활동: ${NEXT[mode][1]} →</button>` : '';
  if (mode === 'cards') {
    $('#controls').innerHTML = '';
    $('#actions').innerHTML = `${how}${seen.sorted ? '' : '<button type="button" class="primary" id="check-order">순서 확인하기</button>'}${next}`;
    if ($('#check-order')) $('#check-order').onclick = checkOrder;
  } else if (mode === 'convert' || mode === 'meter') {
    $('#controls').innerHTML = '';
    $('#actions').innerHTML = `${how}${mode === 'meter' ? `<button type="button" class="primary" id="run-hour" ${run || !(plugged.L && plugged.R) ? 'disabled' : ''}>1시간 켜 보기</button>` : ''}${next}`;
    if ($('#run-hour')) $('#run-hour').onclick = startRun;
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="냉장고 고르기"><span class="group-label">냉장고</span>${FRIDGES.map(f => `<button type="button" data-fridge-btn="${f.grade}" aria-pressed="${fridge === f.grade}">${f.grade}등급 냉장고</button>`).join('')}</div>`;
    $('#actions').innerHTML = '';
    $$('[data-fridge-btn]').forEach(b => b.onclick = () => chooseFridge(+b.dataset.fridgeBtn));
  }
  if ($('#how-to')) $('#how-to').onclick = () => { playDemo(); bubble(400, mode === 'cards' ? 236 : 172, GUIDE[mode][1], 'good'); };
  if ($('#next-tab')) $('#next-tab').onclick = () => setMode(NEXT[mode][0]);
  renderText();
}
function render() {
  if (mode === 'cards') drawCards(); else if (mode === 'convert') drawConvert(); else if (mode === 'meter') drawMeter(); else drawGrade();
  renderControls();
}
function setMode(next) {
  mode = next; picked = null; lab.selectTab(next); hideBubble(); hideDemo();
  for (const k of ['cards', 'convert', 'meter', 'grade']) $(`#g-${k}`).toggleAttribute('hidden', k !== next);
  render();
}
for (const k of ['cards', 'convert', 'meter', 'grade']) $(`#tab-${k}`).onclick = () => setMode(k);
$('#reset').onclick = () => {
  order = START.slice(); locked.clear(); wrongSet = new Set(); picked = null; placed.clear();
  plugged.L = plugged.R = null; lastSide = 'R'; run = false; runT = 0; fridgesSeen.clear(); fridge = null; delete seen.gradeSaid;
  hideBubble(); render();
};

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    // 처음 여는 활동이면 손 모양으로 끄는 방법을 보여 줘요(무대가 화면에 보일 때).
    if (!demoed.has(mode) && mode !== 'grade' && svg.getBoundingClientRect().width > 0) { demoed.add(mode); setTimeout(playDemo, 500); }
    if (run) {
      runT = Math.min(RUN_S, runT + (reducedMotion.matches ? RUN_S : dt));
      if (mode === 'meter') drawMeter();
      if (runT >= RUN_S) {
        run = false;
        const [a, b] = [byId(plugged.L), byId(plugged.R)];
        if (a.watt !== b.watt) seen.meter = true;
        const [big, small] = a.watt > b.watt ? [a, b] : [b, a];
        render();
        bubble(400, 92, `1시간 동안 ${big.name} ${big.watt.toLocaleString()} Wh, ${small.name} ${small.watt.toLocaleString()} Wh. 같은 시간 동안 소비 전력이 큰 ${josa(big.name, '이', '가')} 전기 에너지를 더 많이 썼어요.`, 'good');
      }
    }
    flow?.update(checklist([
      ['① 기구 카드를 소비 전력이 큰 순서로 줄 세우기', seen.sorted, '카드를 끌어 자리를 바꾼 뒤 ‘순서 확인하기’를 눌러요'],
      ['② 기구 6개를 바뀌는 에너지 칸에 넣기', doneDevices().length >= 6, '‘에너지 전환’ 탭에서 기구 카드를 끌어 알맞은 에너지 칸에 넣어요', '#tab-convert'],
      ['② 두 가지 에너지로 바뀌는 기구 찾기', seen.multi, '텔레비전이나 헤어드라이어처럼 두 칸에 넣어야 하는 기구를 찾아 넣어요'],
      ['③ 소비 전력이 다른 두 기구를 1시간 켜 보기', seen.meter, '‘같은 시간 켜 보기’ 탭에서 기구 두 개를 콘센트에 끌어다 꽂고 ‘1시간 켜 보기’를 눌러요', '#tab-meter'],
      ['④ 1등급과 5등급 냉장고 비교하기', fridgesSeen.has(1) && fridgesSeen.has(5), '‘에너지 소비 효율 등급’ 탭에서 ‘1등급 냉장고’와 ‘5등급 냉장고’를 눌러요', '#tab-grade', '[data-fridge-btn]'],
    ]));
  }
  requestAnimationFrame(frame);
}

/* ---------- 학습 흐름 ---------- */
flow = setupPOEFlow({
  predict: {
    title: '소비 전력이 큰 전기 기구와 작은 전기 기구를<br>같은 시간 동안 켜면?',
    lead: '전기 기구에는 소비 전력이 적혀 있어요. 에어컨(소비 전력이 큰 기구)과 선풍기(소비 전력이 작은 기구)를 같은 시간 동안 켜 볼 거예요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="에어컨과 선풍기, 소비 전력 표시"><rect width="520" height="250" rx="12" fill="#121a33"/><g transform="translate(140 100) scale(2.4)">${ICONS.aircon}</g><text x="140" y="190" font-size="16" font-weight="700" text-anchor="middle" fill="#fff">에어컨</text><text x="140" y="214" font-size="14" text-anchor="middle" fill="#ffd166">소비 전력이 커요</text><g transform="translate(380 100) scale(2.4)">${ICONS.fan}</g><text x="380" y="190" font-size="16" font-weight="700" text-anchor="middle" fill="#fff">선풍기</text><text x="380" y="214" font-size="14" text-anchor="middle" fill="#ffd166">소비 전력이 작아요</text><text x="260" y="110" font-size="28" font-weight="800" text-anchor="middle" fill="#ff8a8a">?</text></svg>`,
    question: '에어컨과 선풍기를 같은 시간 동안 켜면, 전기 에너지를 더 많이 쓰는 것은 무엇일까요?',
    choices: ['소비 전력이 큰 에어컨이 더 많이 쓸 것 같아요.', '소비 전력이 작은 선풍기가 더 많이 쓸 것 같아요.', '같은 시간 동안 켰으니 쓰는 전기 에너지가 같을 것 같아요.'],
    placeholder: '집에서 쓰는 전기 기구에 붙은 소비 전력 표시나, 여름에 에어컨을 많이 켰을 때의 전기 요금을 떠올려 보세요.',
  },
  observe: {
    title: '전기 기구 카드로 소비 전력과 에너지 전환을 알아보세요.',
    recordLabel: '소비 전력이 큰 기구, 기구마다 바뀐 에너지, 같은 시간 동안 쓴 전기 에너지, 효율 등급에 따른 차이를 적어 보세요.',
    placeholder: '소비 전력이 큰 기구와 작은 기구는 무엇이었나요? 전기 에너지는 어떤 에너지로 바뀌었나요?',
    parts: [
      { title: '소비 전력과 전력량', label: '소비 전력이 큰 기구와 작은 기구, 두 기구를 1시간 켰을 때 쓴 전기 에너지를 비교해 적어 보세요.', placeholder: '소비 전력이 가장 큰 기구와 가장 작은 기구는 무엇이었나요? 1시간 동안 어느 기구가 더 많이 썼나요?' },
      { title: '에너지 전환', label: '전기 기구에서 전기 에너지가 어떤 에너지로 바뀌었는지 종류별로 적어 보세요.', placeholder: '빛, 열, 운동, 소리, 화학 에너지로 바뀐 기구를 나누어 적고, 두 가지 이상으로 바뀐 기구도 적어 보세요.' },
      { title: '에너지 소비 효율 등급', label: '1등급과 5등급 냉장고의 한 달 전기 에너지와 이산화 탄소 배출량을 비교해 적어 보세요.', placeholder: '성능이 같은데 무엇이 달랐나요?' },
    ],
  },
  explain: {
    question: '같은 시간 동안 켜도 전기 기구마다 쓰는 전기 에너지가 다른 까닭은 무엇일까요? 전기 에너지가 어떤 에너지로 바뀌는지와 함께 설명해 보세요.',
    concepts: [
      ['전기 에너지의 전환', '전기 에너지는 빛에너지, 열에너지, 운동 에너지, 소리 에너지, 화학 에너지 등 <b>다양한 형태의 에너지로 전환</b>돼요. 텔레비전처럼 한 기구에서 두 가지 이상의 에너지로 동시에 바뀌기도 해요.'],
      ['소비 전력', '1초 동안 전기 기구가 소모하는 전기 에너지의 양을 <b>소비 전력</b>이라 하고, 단위는 W(와트)를 사용해요. 소비 전력이 큰 기구는 같은 시간 동안 <b>더 많은 전기 에너지</b>를 사용해요.'],
      ['전력량', '전기 기구가 일정 시간 동안 소모하는 전기 에너지의 양을 <b>전력량</b>이라고 해요. 단위는 Wh(와트시)나 kWh(킬로와트시)를 사용하고, 1 Wh는 소비 전력이 1 W인 기구를 1시간 동안 사용했을 때 소모하는 전기 에너지의 양이에요.'],
      ['효율적인 전기 사용', '전기 기구는 성능이 같아도 소비 전력이 다를 수 있어요. 우리나라는 <b>에너지 소비 효율 등급</b>(1~5등급)을 표시하며, 1등급에 가까울수록 전기 에너지를 효율적으로 사용해요.'],
    ],
    note: '전기 에너지는 사라지는 것이 아니라 다른 형태의 에너지로 바뀌어요. 소비 전력이 작은 기구라도 오랜 시간 켜 두면 많은 전기 에너지를 사용해요.',
  },
  onRestart: () => { $('#reset').click(); Object.keys(seen).forEach(k => seen[k] = false); lab.resetQuiz(); setMode('cards'); },
});
setMode('cards');
requestAnimationFrame(frame);
