import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, reducedMotion } from './src/lab-shell.js';
import { APPLIANCES, ENERGY, checkConversion, isPowerOrder, wattHours, FRIDGES, CO2_PER_KWH } from './src/energy-model.js';

// 전기 에너지의 이용([9과14-03] 일상생활에서 전기 에너지가 다양한 형태의 에너지로 전환됨을 소비 전력과 관련지어 설명).
// 교과서 탐구 ‘전기 기구에서 전기 에너지의 전환과 소비 전력 비교하기’(전기 에너지 카드)를 가상으로 해요.
// 지도상 유의점: 소비 전력은 정량적인 계산보다 에너지 전환 관점에서 다루고, 효율적인 전기 사용의 중요함을 인식하게 해요.
// 그래서 계산 문제 대신 ① 소비 전력 순서로 늘어놓기 ② 바뀌는 에너지 고르기 ③ 같은 시간 켜서 쓴 전기 에너지 비교 ④ 효율 등급 비교로 구성했어요.

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
let mode = 'cards', lastFrame = 0, flow = null;
let order = [];                         // ① 학생이 누른 카드 순서(소비 전력이 큰 것부터)
let checked = null;                     // ① 확인 결과: null | { ok, wrong: Set }
let pick = 'kettle', chips = new Set(); // ② 지금 고른 카드와 에너지
const classified = new Map();           // ② 맞게 고른 카드 → 에너지 목록
let meterA = 'fan', meterB = 'aircon', run = null, runT = 0; // ③ 같은 시간 켜 보기(1시간을 6초로)
const fridgesSeen = new Set(); let fridge = null; // ④ 냉장고
const seen = { sorted: false, multi: false, meter: false };
const RUN_S = 6;

const byId = id => APPLIANCES.find(a => a.id === id);
const cardXY = i => [30 + (i % 4) * 190, 36 + Math.floor(i / 4) * 128];

/* ---------- 장면 ---------- */
const scene = `<g id="g-cards"></g><g id="g-convert" hidden></g><g id="g-meter" hidden></g><g id="g-grade" hidden></g><g id="fx"></g>`;

const lab = buildLab({
  unit: 7,
  crumb: '06 전기 에너지의 이용',
  title: '우리는 전기 에너지를 어떻게 이용할까?',
  intro: '전기 기구 카드로 소비 전력을 비교하고, 전기 에너지가 어떤 에너지로 바뀌는지 알아보세요.',
  tabs: [{ id: 'cards', label: '소비 전력 순서' }, { id: 'convert', label: '에너지 전환' }, { id: 'meter', label: '같은 시간 켜 보기' }, { id: 'grade', label: '에너지 소비 효율 등급' }],
  sceneLabel: '전기 기구 카드, 에너지 전환 분류판, 전력량 계량기, 냉장고의 에너지 소비 효율 등급',
  scene,
  terms,
});

/* ---------- ① 소비 전력이 큰 것부터 늘어놓기 ---------- */
function drawCards() {
  setHTML('#g-cards', APPLIANCES.map((a, i) => {
    const [x, y] = cardXY(i), n = order.indexOf(a.id), wrong = checked?.wrong.has(a.id);
    const ring = n < 0 ? '#3a4a7a' : checked ? (wrong ? '#ff6b6b' : '#5dd39e') : '#ffd23f';
    return `<g class="energy-card" data-card="${a.id}" role="button" tabindex="0" aria-label="${a.name}, 소비 전력 ${a.watt} W${n >= 0 ? `, ${n + 1}번째` : ''}" transform="translate(${x} ${y})" style="cursor:pointer">
      <rect width="170" height="112" rx="12" fill="#121a3a" stroke="${ring}" stroke-width="${n >= 0 ? 3 : 1.5}"/>
      <g transform="translate(36 46)">${ICONS[a.id]}</g>
      <text x="70" y="38" font-size="15" font-weight="700" fill="#ffffff">${a.name}</text>
      <text x="70" y="62" font-size="13" fill="#cfd8f2">소비 전력</text>
      <text x="70" y="84" font-size="20" font-weight="800" fill="#ffd166">${a.watt.toLocaleString()} W</text>
      <text x="12" y="104" font-size="11" fill="#8f9bc4">정격 전압 220 V</text>
      ${n >= 0 ? `<circle cx="152" cy="18" r="14" fill="${checked ? (wrong ? '#ff6b6b' : '#5dd39e') : '#ffd23f'}"/><text x="152" y="23" font-size="14" font-weight="800" text-anchor="middle" fill="#1b1300">${n + 1}</text>` : ''}
    </g>`;
  }).join(''));
}
function tapCard(id) {
  if (checked?.ok) return;
  if (checked) { order = []; checked = null; }
  if (order.includes(id)) order = order.filter(v => v !== id); else order.push(id);
  if (order.length === APPLIANCES.length) {
    const result = isPowerOrder(order);
    checked = result;
    if (result.ok) { seen.sorted = true; toast('소비 전력이 큰 것부터 차례대로 늘어놓았어요!'); burst($('#fx'), 400, 220, '#ffd23f', 18); }
    else toast(`순서가 맞지 않는 카드가 ${result.wrong.size}개 있어요(빨간 번호). 아무 카드나 누르면 다시 늘어놓을 수 있어요.`);
  }
  render();
}

/* ---------- ② 에너지 전환 고르기 ---------- */
function drawConvert() {
  const a = byId(pick);
  const boxes = ENERGY.map((e, k) => {
    const x = 310 + (k % 3) * 160, y = 166 + Math.floor(k / 3) * 118;
    const names = [...classified].filter(([, es]) => es.includes(e.id)).map(([id]) => byId(id).name);
    return `<g transform="translate(${x} ${y})"><rect width="150" height="108" rx="10" fill="#0f1730" stroke="${e.color}" stroke-width="2"/><text x="12" y="24" font-size="15" font-weight="800" style="fill:${e.color}">${e.name}</text>${names.slice(0, 4).map((nm, j) => `<text x="12" y="${46 + j * 17}" font-size="12" fill="#dfe6ff">${nm}</text>`).join('')}${names.length > 4 ? `<text x="12" y="${46 + 4 * 17}" font-size="12" fill="#8f9bc4">외 ${names.length - 4}개</text>` : ''}</g>`;
  }).join('');
  setHTML('#g-convert', `
    <g transform="translate(30 30)"><rect width="250" height="380" rx="14" fill="#121a3a" stroke="#ffd23f" stroke-width="2"/>
      <g transform="translate(125 100) scale(2.2)">${ICONS[a.id]}</g>
      <text x="125" y="200" font-size="22" font-weight="800" text-anchor="middle" fill="#fff">${a.name}</text>
      <text x="125" y="228" font-size="15" text-anchor="middle" fill="#ffd166">소비 전력 ${a.watt.toLocaleString()} W</text>
      <text x="125" y="268" font-size="13" text-anchor="middle" fill="#cfd8f2">이 기구에서 전기 에너지는</text>
      <text x="125" y="288" font-size="13" text-anchor="middle" fill="#cfd8f2">주로 어떤 에너지로 바뀔까요?</text>
      <text x="125" y="324" font-size="15" font-weight="700" text-anchor="middle" fill="#fff">${chips.size ? ENERGY.filter(e => chips.has(e.id)).map(e => e.name).join(' + ') : '위의 에너지 단추에서 골라요'}</text>
      ${classified.has(a.id) ? '<text x="125" y="356" font-size="13" text-anchor="middle" fill="#5dd39e">✓ 분류했어요</text>' : ''}</g>
    <text x="310" y="60" font-size="16" font-weight="700" fill="#fff">에너지 종류별 분류판</text>
    <text x="310" y="84" font-size="13" fill="#cfd8f2">맞게 고른 전기 기구가 바뀐 에너지 칸에 들어가요.</text>
    <text x="310" y="104" font-size="13" fill="#cfd8f2">두 가지 이상의 에너지로 바뀌는 기구는 여러 칸에 들어가요.</text>
    <text x="310" y="138" font-size="14" fill="#ffd166">분류한 기구 ${classified.size} / ${APPLIANCES.length}</text>
    ${boxes}`);
}
function confirmConvert() {
  const a = byId(pick), r = checkConversion(a, [...chips]);
  if (!r.ok) return toast(r.message);
  classified.set(a.id, a.main.slice());
  if (a.main.length > 1) seen.multi = true;
  toast(`맞아요! ${a.name}: 전기 에너지 → ${a.main.map(id => ENERGY.find(e => e.id === id).name).join(' + ')}${a.note ? ` · ${a.note}` : ''}`);
  const next = APPLIANCES.find(v => !classified.has(v.id));
  if (next) { pick = next.id; chips = new Set(); }
  render();
}

/* ---------- ③ 같은 시간 켜 보기(전력량) ---------- */
function drawMeter() {
  const t = Math.min(1, runT / RUN_S), minutes = Math.round(t * 60);
  const slot = (id, x, color) => {
    const a = byId(id), wh = wattHours(a.watt, t), max = wattHours(2000, 1);
    const h = Math.max(0, 240 * wh / max);
    return `<g transform="translate(${x} 40)"><rect width="300" height="356" rx="14" fill="#121a3a" stroke="${color}" stroke-width="2"/>
      <g transform="translate(60 60) scale(1.6)">${ICONS[a.id]}</g>
      <text x="120" y="52" font-size="18" font-weight="800" fill="#fff">${a.name}</text>
      <text x="120" y="78" font-size="14" fill="#ffd166">소비 전력 ${a.watt.toLocaleString()} W</text>
      ${run ? `<circle cx="60" cy="60" r="34" fill="none" stroke="${color}" stroke-width="2" opacity=".6"><animate attributeName="r" values="30;38;30" dur="1s" repeatCount="indefinite"/></circle>` : ''}
      <rect x="40" y="110" width="70" height="240" rx="8" fill="#0a1029" stroke="#3a4a7a"/>
      <rect x="44" y="${(346 - h).toFixed(1)}" width="62" height="${h.toFixed(1)}" rx="5" style="fill:${color}"/>
      <text x="130" y="150" font-size="13" fill="#cfd8f2">쓴 전기 에너지(전력량)</text>
      <text x="130" y="180" font-size="24" font-weight="800" font-family="monospace" style="fill:${color}">${Math.round(wh).toLocaleString()} Wh</text>
      <text x="130" y="214" font-size="12" fill="#8f9bc4">계량기 숫자</text></g>`;
  };
  setHTML('#g-meter', `${slot(meterA, 40, '#5cc8ff')}${slot(meterB, 460, '#ff9f6b')}
    <g transform="translate(400 230)"><circle r="44" fill="#0a1029" stroke="#dfe6ff" stroke-width="2"/><path d="M0 0 L0 -34" stroke="#dfe6ff" stroke-width="3"/><path d="M0 0 L${(30 * Math.sin(t * 2 * Math.PI)).toFixed(1)} ${(-30 * Math.cos(t * 2 * Math.PI)).toFixed(1)}" stroke="#ffd23f" stroke-width="3"/><text y="70" font-size="15" font-weight="700" text-anchor="middle" fill="#fff">${minutes}분</text><text y="90" font-size="12" text-anchor="middle" fill="#8f9bc4">(1시간을 6초로)</text></g>`);
}
function startRun() {
  if (meterA === meterB) return toast('서로 다른 두 기구를 골라 비교해요.');
  run = true; runT = 0; renderControls();
}

/* ---------- ④ 에너지 소비 효율 등급 ---------- */
function drawGrade() {
  const max = Math.max(...FRIDGES.map(f => f.kwh));
  setHTML('#g-grade', `<text x="40" y="44" font-size="16" font-weight="700" fill="#fff">크기와 성능이 같은 냉장고 세 대 · 한 달 동안 쓴 전기 에너지</text>
    ${FRIDGES.map((f, i) => {
      const x = 40 + i * 250, on = fridgesSeen.has(f.grade), sel = fridge === f.grade, h = on ? 100 * f.kwh / max : 0;
      return `<g data-fridge="${f.grade}" role="button" tabindex="0" aria-label="${f.grade}등급 냉장고" transform="translate(${x} 64)" style="cursor:pointer">
        <rect width="230" height="350" rx="14" fill="#121a3a" stroke="${sel ? '#ffd23f' : '#3a4a7a'}" stroke-width="${sel ? 3 : 1.5}"/>
        <rect x="20" y="20" width="70" height="120" rx="8" fill="#dfe6ff22" stroke="#dfe6ff"/><path d="M20 62 H90 M80 32 V50 M80 74 V110" stroke="#dfe6ff" stroke-width="2"/>
        <g transform="translate(108 22)">${[1, 2, 3, 4, 5].map(g => `<rect x="0" y="${(g - 1) * 22}" width="${40 + g * 12}" height="18" rx="3" fill="${['#1e9e4a', '#7cc242', '#f2d22e', '#f39a2b', '#e2412b'][g - 1]}" opacity="${g === f.grade ? 1 : .3}"/><text x="6" y="${(g - 1) * 22 + 14}" font-size="12" font-weight="800" fill="#10151f">${g}</text>`).join('')}</g>
        <text x="115" y="164" font-size="18" font-weight="800" text-anchor="middle" fill="#fff">${f.grade}등급</text>
        <rect x="70" y="${(336 - h).toFixed(1)}" width="90" height="${h.toFixed(1)}" rx="5" fill="${['#1e9e4a', '#7cc242', '#f2d22e', '#f39a2b', '#e2412b'][f.grade - 1]}"/>
        <text x="115" y="196" font-size="${on ? 18 : 13}" font-weight="800" text-anchor="middle" fill="${on ? '#ffd166' : '#8f9bc4'}">${on ? `한 달 ${f.kwh} kWh` : '눌러서 확인'}</text>
        ${on ? `<text x="115" y="218" font-size="13" text-anchor="middle" fill="#cfd8f2">이산화 탄소 약 ${Math.round(f.kwh * CO2_PER_KWH)} kg</text>` : ''}
      </g>`;
    }).join('')}`);
}

/* ---------- 글과 단추 ---------- */
const GUIDE = {
  cards: ['전기 기구 카드를 소비 전력이 큰 것부터 차례대로 눌러 늘어놓아 보세요.', '카드를 누르면 번호가 붙어요. 다시 누르면 번호가 빠져요. 카드를 모두 누르면 순서가 맞는지 알려 줘요.'],
  convert: ['전기 기구에서 전기 에너지가 주로 어떤 에너지로 바뀌는지 골라 보세요.', '위의 에너지 단추를 골라(여러 개도 돼요) ‘확인하기’를 눌러요. 맞으면 분류판의 칸에 들어가고 다음 기구로 넘어가요.'],
  meter: ['소비 전력이 다른 두 전기 기구를 같은 시간 동안 켜 보세요.', '왼쪽과 오른쪽에 넣을 기구를 고르고 ‘1시간 켜 보기’를 눌러요. 계량기 숫자(쓴 전기 에너지)를 비교해요.'],
  grade: ['크기와 성능이 같은 냉장고의 에너지 소비 효율 등급을 비교해 보세요.', '냉장고를 하나씩 눌러 한 달 동안 쓴 전기 에너지와 이산화 탄소 배출량을 확인해요.'],
};
function renderText() {
  setText('#guide', GUIDE[mode][0]);
  setText('#subguide', GUIDE[mode][1]);
  const stateText = {
    cards: `늘어놓은 카드 ${order.length} / ${APPLIANCES.length}${checked ? (checked.ok ? ' · 순서가 맞아요' : ' · 다시 늘어놓아요') : ''}`,
    convert: `분류한 기구 ${classified.size} / ${APPLIANCES.length}`,
    meter: run ? '켜는 중…' : runT >= RUN_S ? '1시간 동안 켰어요' : '기구를 고르고 켜 보세요',
    grade: `확인한 냉장고 ${fridgesSeen.size} / ${FRIDGES.length}`,
  }[mode];
  setText('#stage-state', stateText);
  setText('#note-title', { cards: '소비 전력이 가장 큰 기구는?', convert: '전기 에너지는 어떤 에너지로 바뀌나요?', meter: '같은 시간 동안 더 많은 전기 에너지를 쓴 기구는?', grade: '1등급과 5등급, 무엇이 다를까요?' }[mode]);
  setText('#note-text', {
    cards: '전기 기구마다 1초 동안 소모하는 전기 에너지의 양(소비 전력)이 달라요. 열을 내는 기구와 전동기가 든 기구의 소비 전력을 살펴보세요.',
    convert: '한 기구에서 두 가지 이상의 에너지로 바뀌기도 해요. 전기 에너지는 없어지는 것이 아니라 다른 형태의 에너지로 바뀌어요.',
    meter: '두 기구를 같은 시간 동안 켰을 때 계량기 숫자가 어떻게 다르게 올라가는지 비교해요.',
    grade: '성능이 같아도 전기 에너지를 쓰는 양이 다를 수 있어요. 냉장고는 하루 종일 켜 두는 기구예요.',
  }[mode]);
  setHTML('#readout', mode === 'meter' && runT >= RUN_S
    ? `<table class="data-table"><tr><th>전기 기구</th><th>소비 전력</th><th>1시간 동안 쓴 전기 에너지</th></tr>${[meterA, meterB].map(id => byId(id)).map(a => `<tr><td>${a.name}</td><td>${a.watt.toLocaleString()} W</td><td>${a.watt.toLocaleString()} Wh</td></tr>`).join('')}</table>`
    : mode === 'grade' && fridgesSeen.size
      ? `<table class="data-table"><tr><th>등급</th><th>한 달 전기 에너지</th><th>이산화 탄소</th></tr>${FRIDGES.filter(f => fridgesSeen.has(f.grade)).map(f => `<tr><td>${f.grade}등급</td><td>${f.kwh} kWh</td><td>약 ${Math.round(f.kwh * CO2_PER_KWH)} kg</td></tr>`).join('')}</table>`
      : '');
  setText('#model-note', {
    cards: '소비 전력은 같은 종류의 기구라도 제품마다 달라요. 화면의 값은 집에서 흔히 쓰는 제품의 대략적인 값이에요.',
    convert: '‘주로’ 바뀌는 에너지를 골라요. 대부분의 전기 기구는 쓰는 동안 조금씩 열도 내므로, 열을 함께 골라도 맞다고 해요.',
    meter: '1시간을 6초로 빠르게 나타냈어요. 소비 전력이 1 W인 기구를 1시간 동안 쓰면 1 Wh의 전기 에너지를 써요(1 kWh = 1000 Wh).',
    grade: '냉장고 값과 이산화 탄소 배출량은 등급을 비교하기 위한 예시예요. 실제 값은 제품의 에너지 소비 효율 등급 표에서 확인해요.',
  }[mode]);
  setText('#discovery', '우리 집에서 소비 전력이 가장 큰 전기 기구는 무엇일까요?');
}
function renderControls() {
  const btn = (attr, val, label, on) => `<button type="button" ${attr}="${val}" aria-pressed="${on}">${label}</button>`;
  if (mode === 'cards') {
    $('#controls').innerHTML = '';
    $('#actions').innerHTML = `<button type="button" class="secondary" id="cards-reset">순서 처음부터</button>`;
    $('#cards-reset').onclick = () => { order = []; checked = null; render(); };
  } else if (mode === 'convert') {
    $('#controls').innerHTML = `<div role="group" aria-label="전기 기구 고르기"><span class="group-label">기구</span>${APPLIANCES.map(a => btn('data-pick', a.id, `${a.name}${classified.has(a.id) ? ' ✓' : ''}`, pick === a.id)).join('')}</div>
      <div role="group" aria-label="바뀌는 에너지" style="margin-top:8px"><span class="group-label">에너지</span>${ENERGY.map(e => btn('data-energy', e.id, e.name, chips.has(e.id))).join('')}</div>`;
    $('#actions').innerHTML = `<button type="button" class="primary" id="convert-check" ${chips.size ? '' : 'disabled'}>확인하기</button>`;
    $$('[data-pick]').forEach(b => b.onclick = () => { pick = b.dataset.pick; chips = new Set(classified.get(pick) ?? []); render(); });
    $$('[data-energy]').forEach(b => b.onclick = () => { const id = b.dataset.energy; if (chips.has(id)) chips.delete(id); else chips.add(id); render(); });
    $('#convert-check').onclick = confirmConvert;
  } else if (mode === 'meter') {
    const group = (name, cur, side) => `<div role="group" aria-label="${name}"><span class="group-label">${name}</span>${APPLIANCES.filter(a => a.meter).map(a => btn(`data-${side}`, a.id, a.name, cur === a.id)).join('')}</div>`;
    $('#controls').innerHTML = `${group('왼쪽', meterA, 'meter-a')}<div style="margin-top:8px">${group('오른쪽', meterB, 'meter-b')}</div>`;
    $('#actions').innerHTML = `<button type="button" class="primary" id="run-hour" ${run ? 'disabled' : ''}>1시간 켜 보기</button>`;
    $$('[data-meter-a]').forEach(b => b.onclick = () => { if (run) return; meterA = b.dataset.meterA; runT = 0; render(); });
    $$('[data-meter-b]').forEach(b => b.onclick = () => { if (run) return; meterB = b.dataset.meterB; runT = 0; render(); });
    $('#run-hour').onclick = startRun;
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="냉장고 고르기"><span class="group-label">냉장고</span>${FRIDGES.map(f => btn('data-fridge-btn', f.grade, `${f.grade}등급 냉장고`, fridge === f.grade)).join('')}</div>`;
    $('#actions').innerHTML = '';
    $$('[data-fridge-btn]').forEach(b => b.onclick = () => chooseFridge(+b.dataset.fridgeBtn));
  }
  renderText();
}
function chooseFridge(g) { fridge = g; fridgesSeen.add(g); render(); }
function render() {
  if (mode === 'cards') drawCards(); else if (mode === 'convert') drawConvert(); else if (mode === 'meter') drawMeter(); else drawGrade();
  renderControls();
}
function setMode(next) {
  mode = next; lab.selectTab(next);
  for (const k of ['cards', 'convert', 'meter', 'grade']) $(`#g-${k}`).toggleAttribute('hidden', k !== next);
  render();
}
for (const k of ['cards', 'convert', 'meter', 'grade']) $(`#tab-${k}`).onclick = () => setMode(k);
// 그림 속 카드·냉장고도 눌러요(키보드는 Enter·Space).
const sceneAct = el => { const card = el.closest('[data-card]'), fr = el.closest('[data-fridge]'); if (card) tapCard(card.dataset.card); else if (fr) chooseFridge(+fr.dataset.fridge); };
$('#scene').addEventListener('click', e => sceneAct(e.target));
$('#scene').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sceneAct(e.target); } });
$('#reset').onclick = () => {
  order = []; checked = null; pick = APPLIANCES[0].id; chips = new Set(); classified.clear();
  meterA = 'fan'; meterB = 'aircon'; run = null; runT = 0; fridgesSeen.clear(); fridge = null; render();
};

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    if (run) {
      runT = Math.min(RUN_S, runT + (reducedMotion.matches ? RUN_S : dt));
      if (mode === 'meter') drawMeter();
      if (runT >= RUN_S) {
        run = null;
        const [a, b] = [byId(meterA), byId(meterB)];
        if (a.watt !== b.watt) seen.meter = true;
        const [big, small] = a.watt > b.watt ? [a, b] : [b, a];
        toast(`1시간 동안 ${big.name}는 ${big.watt.toLocaleString()} Wh, ${small.name}는 ${small.watt.toLocaleString()} Wh의 전기 에너지를 썼어요. 소비 전력이 큰 ${big.name}가 더 많이 썼어요.`);
        renderControls();
      }
    }
    flow?.update(checklist([
      ['① 소비 전력이 큰 것부터 카드 늘어놓기', seen.sorted, '‘소비 전력 순서’ 탭에서 카드를 소비 전력이 큰 것부터 차례로 눌러요', '', '[data-card]', ['#g-cards', '전기 기구 카드']],
      ['② 전기 기구 6개에서 바뀌는 에너지 고르기', classified.size >= 6, '‘에너지 전환’ 탭 → 에너지 단추를 고르고 ‘확인하기’', '#tab-convert', '', ['#g-convert', '에너지 종류별 분류판']],
      ['② 두 가지 이상의 에너지로 바뀌는 기구 찾기', seen.multi, '텔레비전이나 헤어드라이어처럼 두 가지 이상의 에너지로 바뀌는 기구를 골라 ‘확인하기’', '', '[data-pick]'],
      ['③ 소비 전력이 다른 두 기구를 1시간 켜서 비교하기', seen.meter, '‘같은 시간 켜 보기’ 탭 → 두 기구를 고르고 ‘1시간 켜 보기’', '#tab-meter', '', ['#g-meter', '두 기구의 계량기']],
      ['④ 1등급과 5등급 냉장고 비교하기', fridgesSeen.has(1) && fridgesSeen.has(5), '‘에너지 소비 효율 등급’ 탭 → ‘1등급 냉장고’와 ‘5등급 냉장고’를 눌러요', '#tab-grade', '[data-fridge-btn]', ['#g-grade', '냉장고 세 대']],
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
