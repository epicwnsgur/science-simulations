import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import './theme-space.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, reducedMotion, instantLessons } from './src/lab-shell.js';
import { setupViewToggle } from './src/view-toggle.js';
import { setSky } from './src/sky-image.js';
import { photoUrl, creditsHTML, SKY_CREDIT, PHOTOS } from './src/space-photos.js';
import { armAngle, ARMS, BAR, RADIUS, SUN_POS, KINDS, CLASSIFY } from './src/galaxy-model.js';
import { STARS } from './src/space-stars.js';

// 교과서 290–293쪽, 지도서(우리은하와 천체). 수업 모형: 발생 학습 모형(예비 → 초점 → 도전 → 적용).
// 지도상 유의점: 우리은하의 구조(막대 모양 중심부, 나선팔, 볼록한 원반)와 크기(지름 약 30000 pc, 태양계는 중심에서 약 8500 pc),
// 성단(산개·구상)과 성운(방출·반사·암흑)의 특징을 비교해요. 천체 관측 프로그램처럼 실제 밤하늘과 사진을 살펴봐요.

const terms = [
  ['은하', '수많은 별로 이루어진 집단이에요.'],
  ['우리은하', '태양계가 속한 은하예요. 은하수는 지구에서 보이는 우리은하의 일부예요.'],
  ['성단', '별이 무리 지어 있는 것이에요. 산개 성단과 구상 성단이 있어요.'],
  ['성간 물질', '별과 별 사이에 있는 가스와 티끌 등의 물질이에요.'],
  ['성운', '성간 물질이 모여 구름처럼 보이는 것이에요. 방출 성운, 반사 성운, 암흑 성운이 있어요.'],
];
const BANDS = {
  center: { ra: 266.4, dec: -29, name: '은하 중심 방향', con: '궁수자리 쪽', marks: [['은하 중심 방향', 266.4, -29.0, 1, -14], ['안타레스(전갈자리)', STARS.antares.ra, STARS.antares.dec, 1, 22], ['궁수자리', 283.8, -26.3, -1, 4]] },
  anti: { ra: 86.4, dec: 28.9, name: '은하 중심의 반대 방향', con: '마차부자리 쪽', marks: [['은하 중심의 반대 방향', 86.4, 28.9, 1, 5], ['카펠라(마차부자리)', STARS.capella.ra, STARS.capella.dec, 1, 5], ['베텔게우스(오리온자리)', STARS.betelgeuse.ra, STARS.betelgeuse.dec, 1, 5]] },
};
const MAP = { cx: 702, cy: 96, k: 4.6 };
const mapPt = ([x, , z]) => [MAP.cx + x * MAP.k, MAP.cy + z * MAP.k];
const armPath = k => Array.from({ length: 40 }, (_, i) => { const r = ARMS.r0 * (RADIUS / ARMS.r0) ** (i / 39), a = armAngle(k, r); return `${i ? 'L' : 'M'}${(MAP.cx + r * Math.cos(a) * MAP.k).toFixed(1)} ${(MAP.cy + r * Math.sin(a) * MAP.k).toFixed(1)}`; }).join('');
const [SX, SY] = mapPt(SUN_POS);
const scene = `
<defs>
<radialGradient id="map-core"><stop offset="0" stop-color="#fff1d6"/><stop offset=".5" stop-color="#ffcf8a" stop-opacity=".6"/><stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient>
<linearGradient id="cone-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf6e" stop-opacity=".7"/><stop offset="1" stop-color="#ffcf6e" stop-opacity="0"/></linearGradient>
<clipPath id="obj-clip"><rect x="24" y="16" width="300" height="300" rx="14"/></clipPath>
<clipPath id="side-clip"><rect x="410" y="22" width="368" height="358" rx="12"/></clipPath>
</defs>
<g id="shape-view">
  <g id="shape2d">
    <rect x="16" y="16" width="370" height="370" rx="16" fill="#02030a" stroke="#2d3566"/>
    <image href="${photoUrl('ngc1365')}" x="22" y="22" width="358" height="358" preserveAspectRatio="xMidYMid slice"/>
    <g id="sun2d" opacity="0"><circle cx="${201 + 8.5 / 15 * 150 * .62}" cy="${201 + 8.5 / 15 * 150 * .78}" r="10" fill="none" stroke="#ffcf6e" stroke-width="3"/><text x="${201 + 8.5 / 15 * 150 * .62 + 14}" y="${201 + 8.5 / 15 * 150 * .78 + 26}" class="sky-label">태양계(이쯤)</text></g>
    <text x="30" y="406" class="panel-title">위에서 본 모습: 막대 모양 중심부와 나선팔</text>
    <rect x="404" y="16" width="380" height="370" rx="16" fill="#02030a" stroke="#2d3566"/>
    <g clip-path="url(#side-clip)"><image href="${photoUrl('ngc4945')}" x="410" y="22" width="368" height="358" preserveAspectRatio="xMidYMid slice" transform="rotate(-48 594 201)"/></g>
    <text x="414" y="406" class="panel-title">옆에서 본 모습: 중심부가 볼록한 원반</text>
    <text x="30" y="428" class="panel-small">우리은하와 닮은 외부 은하의 실제 사진(NGC 1365, NGC 4945, ESO)이에요.</text>
  </g>
  <g id="shape-read"></g>
</g>
<g id="band-view">
  <image id="band-sky" x="0" y="0" width="800" height="440" preserveAspectRatio="none"/>
  <g id="band-marks"></g>
  <rect x="${MAP.cx - 86}" y="${MAP.cy - 84}" width="172" height="196" rx="14" fill="#05071add" stroke="#2d3566"/>
  <g id="map-arms">${Array.from({ length: ARMS.count }, (_, k) => `<path d="${armPath(k)}" fill="none" stroke="#9fb8ff" stroke-width="${k % 2 ? 4 : 6}" stroke-linecap="round" opacity=".45"/>`).join('')}
    <path d="M${MAP.cx - Math.cos(BAR.angle) * BAR.half * MAP.k} ${MAP.cy - Math.sin(BAR.angle) * BAR.half * MAP.k} L${MAP.cx + Math.cos(BAR.angle) * BAR.half * MAP.k} ${MAP.cy + Math.sin(BAR.angle) * BAR.half * MAP.k}" stroke="#ffd9a0" stroke-width="9" stroke-linecap="round" opacity=".7"/><circle cx="${MAP.cx}" cy="${MAP.cy}" r="20" fill="url(#map-core)"/></g>
  <path id="view-cone" fill="url(#cone-grad)" stroke="#ffcf6e88"/>
  <circle cx="${SX}" cy="${SY}" r="5" fill="#ffcf6e" stroke="#000" stroke-width="1.5"/>
  <text x="${MAP.cx}" y="${MAP.cy + 96}" text-anchor="middle" class="panel-small">위에서 본 우리은하 · ● 태양계</text>
  <rect x="16" y="396" width="300" height="28" rx="14" fill="#0a0d22cc"/><text x="30" y="415" class="panel-title" id="band-title"></text>
</g>
<g id="objects-view">
  <rect x="20" y="12" width="308" height="308" rx="16" fill="#02030a" stroke="#8fd3ff55"/>
  <g clip-path="url(#obj-clip)"><image id="obj-photo" x="24" y="16" width="300" height="300" preserveAspectRatio="xMidYMid slice"/></g>
  <g id="obj-card"></g>
  <g id="obj-strip"></g>
</g>`;

const lab = buildLab({
  unit: 8,
  crumb: '은하와 우주 01 우리은하와 천체',
  title: '우리은하에는 어떤 천체가 있을까?',
  intro: '',
  tabs: [{ id: 'shape', label: '우리은하의 모양' }, { id: 'band', label: '태양계에서 본 은하수' }, { id: 'objects', label: '성단과 성운' }],
  toggle: '이름표 보기',
  sceneLabel: '우리은하의 모형, 지구에서 본 은하수, 성단과 성운의 실제 사진',
  scene,
  terms,
});
$('.lab').insertAdjacentHTML('beforeend', creditsHTML(['ngc1365', 'ngc4945', ...CLASSIFY.map(c => c[0]), 'xdf'], [SKY_CREDIT, '<li>3D 우리은하: 교과서의 구조(막대 모양 중심부, 나선팔, 지름 약 30000 pc, 태양계 위치 약 8500 pc)에 맞춰 만든 모형이에요. 배경의 은하는 허블 익스트림 딥 필드 사진에서 오려 냈어요.</li>']));
$('#show-detail').checked = true;

/* ---------- 상태 ---------- */
let tab = 'shape', show = true, use3d = false, lastFrame = 0, flow = null;
let gview = 'oblique', sunOn = false, band = null, objIndex = 0;
const seenViews = new Set(), seenBands = new Set();
const answers = {};                // answers[사진] = 'right' | 'wrong'
const rightKinds = new Set();
let feedback = null;

/* ---------- 우리은하의 모양 ---------- */
function setGView(name) {
  if (name === 'sun') { sunOn = true; toast('📍 태양계는 은하 중심에서 약 8500 pc 떨어진 나선팔에 있어요. 우리은하의 지름은 약 30000 pc예요'); }
  else if (name !== gview) toast(name === 'top' ? '⬆ 위에서 보면 막대 모양의 중심부와 나선팔이 보여요' : name === 'side' ? '➡ 옆에서 보면 중심부가 볼록한 납작한 원반 모양이에요' : '');
  gview = name; seenViews.add(name);
  if (use3d) view3d.view.setView(name);
  renderControls();
}
function renderShape(dt) {
  if (use3d) view3d.view.update({ show, sunOn, rotate: !sunOn }, dt);
  $('#sun2d').setAttribute('opacity', sunOn ? 1 : 0);
  $$('#shape2d > rect').forEach((r, i) => r.setAttribute('stroke', (i === 0 && (gview === 'top' || gview === 'sun')) || (i === 1 && gview === 'side') ? '#ffcf6e' : '#2d3566'));
}

/* ---------- 태양계에서 본 은하수 ---------- */
let bandProject = null;
function chooseBand(id) {
  band = id; seenBands.add(id); bandProject = null;
  const b = BANDS[id];
  setSky($('#band-sky'), { ra: b.ra, dec: b.dec, fov: 82, width: 800, height: 440, milkyWay: 1, milkyWayPasses: 3, lines: [], maxMag: 6 }).then(p => { if (band === id) { bandProject = p; renderBand(); } });
  toast(id === 'center' ? '🌌 은하 중심 방향(궁수자리 쪽): 별이 밀집해 있어 은하수가 밝고 두껍게 보여요' : '🌌 반대 방향(마차부자리 쪽): 은하수가 희미하고 가늘게 보여요');
  renderControls();
}
function renderBand() {
  const b = band && BANDS[band];
  setText('#band-title', b ? `🔭 ${b.name} · ${b.con}` : '방향을 골라 보세요');
  // 지도: 태양계에서 바라보는 방향(부채꼴)
  if (b) {
    const dir = band === "center" ? Math.atan2(MAP.cy - SY, MAP.cx - SX) : Math.atan2(SY - MAP.cy, SX - MAP.cx), L = band === "center" ? 70 : 40, w = .45;
    $('#view-cone').setAttribute('d', `M${SX} ${SY} L${SX + Math.cos(dir - w) * L} ${SY + Math.sin(dir - w) * L} A${L} ${L} 0 0 1 ${SX + Math.cos(dir + w) * L} ${SY + Math.sin(dir + w) * L}Z`);
  } else $('#view-cone').setAttribute('d', '');
  setHTML('#band-marks', b && bandProject && show ? b.marks.map(([name, ra, dec, side, dy], i) => { const p = bandProject(ra, dec); if (!p || p[0] < 20 || p[0] > 600) return ''; return `<g transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})">${i ? '<circle r="10" fill="none" stroke="#ffffff88"/>' : '<circle r="16" fill="none" stroke="#ffcf6e" stroke-width="2" stroke-dasharray="4 3"/>'}<text x="${side * (i ? 14 : 22)}" y="${dy}" text-anchor="${side > 0 ? 'start' : 'end'}" class="sky-label${i ? '' : ' strong'}">${name}</text></g>`; }).join('') : '');
}

/* ---------- 성단과 성운 ---------- */
function showObject(i) {
  objIndex = (i + CLASSIFY.length) % CLASSIFY.length; feedback = null;
  $('#obj-photo').setAttribute('href', photoUrl(CLASSIFY[objIndex][0]));
  $('#obj-photo').animate?.([{ opacity: .1, transform: 'scale(1.04)' }, { opacity: 1, transform: 'scale(1)' }], { duration: instantLessons.matches ? 0 : 500, easing: 'ease-out' });
  renderControls();
}
function classify(kind) {
  const [key, answer, hint, also = []] = CLASSIFY[objIndex];
  const ok = kind === answer || also.includes(kind);
  if (ok) { answers[key] = 'right'; rightKinds.add(answer); rightKinds.add(kind); }
  else if (answers[key] !== 'right') answers[key] = 'wrong';
  feedback = { ok, kind, text: ok ? `맞아요! ${KINDS[kind].name}: ${KINDS[kind].feature}` : `다시 생각해 봐요. 힌트: ${hint}` };
  toast(ok ? `⭕ 맞아요! ${PHOTOS[key].name}은(는) ${KINDS[answer].name}${also.length ? ' 등이 함께 있는 천체' : ''}예요` : '❌ 다시 생각해 봐요. 사진 속 모습을 자세히 보세요');
  renderControls();
}
function renderObjects() {
  const [key, answer, hint] = CLASSIFY[objIndex], p = PHOTOS[key];
  const wrap = (t, n) => { const out = []; let line = ''; for (const w of t.split(' ')) { if ((line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? `${line} ${w}` : w; } return [...out, line]; };
  const fb = feedback ? wrap(feedback.text, 30).map((l, i) => `<tspan x="352" dy="${i ? 20 : 0}">${l}</tspan>`).join('') : '';
  setHTML('#obj-card', `<text x="352" y="44" class="card-big">${p.name}</text><text x="352" y="70" class="card-small">사진 ${objIndex + 1} / ${CLASSIFY.length} · 사진: ${p.credit}</text>
    <text x="352" y="110" class="card-text">이 천체는 성단일까요, 성운일까요?</text><text x="352" y="134" class="card-text">아래 단추에서 알맞은 종류를 골라 보세요.</text>
    ${feedback ? `<rect x="344" y="152" width="440" height="${wrap(feedback.text, 30).length * 20 + 26}" rx="10" fill="${feedback.ok ? '#0d3a24' : '#3a1420'}" stroke="${feedback.ok ? '#5fe08a' : '#ff8a9a'}"/><text x="352" y="176" class="card-text" style="font-weight:700">${fb}</text>` : ''}
    ${answers[key] === 'right' && show ? wrap(`관찰: ${hint}`, 34).map((l, i) => `<text x="352" y="${270 + i * 18}" class="card-small">${l}</text>`).join('') : ''}`);
  // 아래쪽 사진 띠: 분류한 사진은 이름표가 붙어요.
  const D = 764 / CLASSIFY.length, T = D - 6;
  setHTML('#obj-strip', CLASSIFY.map(([k, a], i) => { const x = 20 + i * D, on = i === objIndex, st = answers[k]; return `<g class="strip-item" data-obj="${i}" role="button" tabindex="0" aria-label="${PHOTOS[k].name} 사진 보기"><image href="${photoUrl(k)}" x="${x.toFixed(1)}" y="338" width="${T.toFixed(1)}" height="${T.toFixed(1)}" preserveAspectRatio="xMidYMid slice"/><rect x="${x.toFixed(1)}" y="338" width="${T.toFixed(1)}" height="${T.toFixed(1)}" rx="6" fill="none" stroke="${on ? '#ffcf6e' : st === 'right' ? '#5fe08a' : '#2d3566'}" stroke-width="${on ? 3 : 1.5}"/><text x="${(x + T / 2).toFixed(1)}" y="${338 + T + 16}" text-anchor="middle" class="strip-label">${st === 'right' ? KINDS[a].name.replace(' ', '') : st === 'wrong' ? '다시!' : '?'}</text></g>`; }).join(''));
  $$('[data-obj]').forEach(g => { g.onclick = () => showObject(+g.dataset.obj); g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showObject(+g.dataset.obj); } }; });
}

/* ---------- 조작 단추 ---------- */
function renderControls() {
  if (tab === 'shape') {
    $('#controls').innerHTML = `<div role="group" aria-label="보는 방향"><span class="group-label">보는 방향</span>${[['oblique', '🔭 비스듬히 보기'], ['top', '⬆ 위에서 보기'], ['side', '➡ 옆에서 보기'], ['sun', '📍 태양계 찾기']].map(([id, t]) => `<button data-gview="${id}" aria-pressed="${gview === id}">${t}</button>`).join('')}</div>`;
    $$('[data-gview]').forEach(b => b.onclick = () => setGView(b.dataset.gview));
  } else if (tab === 'band') {
    $('#controls').innerHTML = `<div role="group" aria-label="바라보는 방향"><span class="group-label">밤하늘에서 바라보는 방향</span><button data-band="center" aria-pressed="${band === 'center'}">🌌 은하 중심 방향</button><button data-band="anti" aria-pressed="${band === 'anti'}">🌌 은하 중심의 반대 방향</button></div>`;
    $$('[data-band]').forEach(b => b.onclick = () => chooseBand(b.dataset.band));
    renderBand();
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="천체 종류 고르기" class="kind-group"><span class="group-label">이 천체의 종류는?</span>${Object.entries(KINDS).map(([id, k]) => `<button data-kind="${id}" aria-pressed="${feedback?.kind === id}">${k.name}</button>`).join('')}</div><div role="group" aria-label="사진 넘기기"><button id="obj-prev">◀ 이전 사진</button><button id="obj-next">다음 사진 ▶</button></div>`;
    $$('[data-kind]').forEach(b => b.onclick = () => classify(b.dataset.kind));
    $('#obj-prev').onclick = () => showObject(objIndex - 1);
    $('#obj-next').onclick = () => showObject(objIndex + 1);
    renderObjects();
  }
  renderText();
}
function setTab(id) {
  tab = id; lab.selectTab(id);
  const stage = $('.stage');
  stage.dataset.tab = id;
  stage.classList.toggle('three-on', id === 'shape' && use3d);
  $('#view-bar')?.toggleAttribute('data-off', id !== 'shape');
  if (id === 'shape' && use3d) view3d.view?.invalidate();
  if (id === 'objects' && !$('#obj-photo').getAttribute('href')) showObject(0);
  else renderControls();
}
function renderText() {
  const T = {
    shape: ['우리은하를 여러 방향에서 살펴보세요.', '‘위에서 보기’와 ‘옆에서 보기’로 우리은하의 모양을 비교하고, ‘태양계 찾기’로 우리가 있는 곳과 우리은하의 크기를 확인해요.'],
    band: ['지구에서 본 은하수는 방향에 따라 어떻게 다를까요?', '실제 밤하늘에서 은하 중심 방향(궁수자리 쪽)과 반대 방향(마차부자리 쪽)의 은하수를 비교해요. 오른쪽 위 지도에서 바라보는 방향을 확인해요.'],
    objects: ['우리은하를 이루는 성단과 성운의 실제 사진을 분류해 보세요.', '사진을 보고 산개 성단, 구상 성단, 방출 성운, 반사 성운, 암흑 성운 중 알맞은 종류를 골라요. 아래 사진 띠를 눌러 다른 사진으로 갈 수 있어요.'],
  }[tab];
  setText('#guide', T[0]); setText('#subguide', T[1]);
  setText('#stage-state', tab === 'shape' ? (use3d ? '3D 우리은하 모형 · 끌어서 돌려 보세요' : '우리은하와 닮은 외부 은하 사진') : tab === 'band' ? '실제 밤하늘 · 은하수' : `분류한 사진 ${Object.values(answers).filter(v => v === 'right').length} / ${CLASSIFY.length}`);
  setText('#note-title', { shape: '우리은하는 어떤 모양일까요?', band: '은하수가 더 밝게 보이는 방향은?', objects: '성단과 성운은 어떻게 다를까요?' }[tab]);
  setText('#note-text', { shape: '우리은하에는 수천억 개의 별이 있어요. 3D 모형에서 노란 별이 모인 중심부와 푸른 별이 많은 나선팔을 찾아보세요.', band: '은하수는 지구에서 보이는 우리은하의 일부예요. 태양계는 납작한 원반 안에 있어서 원반 방향을 보면 수많은 별이 띠처럼 보여요. 은하수 속 어두운 부분은 별이 없는 곳이 아니라, 성간 물질(암흑 성운)이 뒤쪽 별빛을 가려서 어둡게 보이는 곳이에요.', objects: '성단은 별이 무리 지어 있는 것이고, 성운은 별과 별 사이의 가스와 티끌(성간 물질)이 모여 구름처럼 보이는 것이에요.' }[tab]);
  const kindRows = Object.entries(KINDS).map(([id, k]) => `<tr><td>${k.name}</td><td>${rightKinds.has(id) ? '✓' : ''}</td></tr>`).join('');
  setHTML('#readout', `<table class="data-table"><tr><th>관찰</th><th>확인</th></tr><tr><td>위에서 본 모습</td><td>${seenViews.has('top') ? '막대·나선팔' : ''}</td></tr><tr><td>옆에서 본 모습</td><td>${seenViews.has('side') ? '볼록한 원반' : ''}</td></tr><tr><td>태양계 위치</td><td>${seenViews.has('sun') ? '약 8500 pc' : ''}</td></tr><tr><td>중심 방향 은하수</td><td>${seenBands.has('center') ? '밝고 두꺼움' : ''}</td></tr><tr><td>반대 방향 은하수</td><td>${seenBands.has('anti') ? '희미함' : ''}</td></tr></table><table class="data-table"><tr><th>천체 종류</th><th>찾음</th></tr>${kindRows}</table>`);
  setText('#model-note', '3D 우리은하는 교과서의 구조와 크기에 맞춰 만든 모형이에요(실제 별은 훨씬 더 많아요). 별의 색과 밝기, 두께는 보기 쉽게 나타냈어요. 은하수는 실제 밤하늘의 은하수 윤곽과 별 자료로 그렸어요.');
  setText('#discovery', '조선 시대의 천문도인 천상열차분야지도에도 은하수가 그려져 있어요. 1923년 허블은 우리은하 바깥에도 수많은 은하가 있다는 것을 밝혀냈어요.');
}

/* ---------- 3D ---------- */
const view3d = setupViewToggle({
  stage: $('.stage'), key: 'galaxy-view', cams: [],
  load: () => import('./src/galaxy-3d.js').then(({ createGalaxy3D }) => createGalaxy3D({ stage: $('.stage'), svg: $('#scene'), reducedMotion: instantLessons })),
  onChange: active => { use3d = active; $('.stage').classList.toggle('three-on', active && tab === 'shape'); if (active) view3d.view?.setView(gview); renderText(); },
});
$('#tab-shape').onclick = () => setTab('shape');
$('#tab-band').onclick = () => setTab('band');
$('#tab-objects').onclick = () => setTab('objects');
$('#show-detail').onchange = e => { show = e.target.checked; if (tab === 'band') renderBand(); if (tab === 'objects') renderObjects(); };
$('#reset').onclick = () => { gview = 'oblique'; sunOn = false; if (use3d) view3d.view.setView('oblique'); band = null; feedback = null; renderControls(); };

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    if (tab === 'shape') renderShape(dt);
    flow?.update(checklist([
      ['위에서 본 우리은하 관찰하기', seenViews.has('top'), '‘위에서 보기’를 눌러 막대 모양의 중심부와 나선팔을 찾아요'],
      ['옆에서 본 우리은하 관찰하기', seenViews.has('side'), '‘옆에서 보기’를 눌러 원반 모양을 확인해요', '[data-gview="side"]'],
      ['태양계의 위치와 우리은하의 크기 확인하기', seenViews.has('sun'), '‘태양계 찾기’를 눌러요', '[data-gview="sun"]'],
      ['은하 중심 방향과 반대 방향의 은하수 비교하기', seenBands.size === 2, '‘태양계에서 본 은하수’ 탭에서 ‘은하 중심 방향’과 ‘은하 중심의 반대 방향’을 차례로 눌러요', '#tab-band'],
      ['성단과 성운 사진을 다섯 종류로 분류하기', Object.keys(KINDS).every(k => rightKinds.has(k)), '‘성단과 성운’ 탭에서 사진을 보고 알맞은 종류 단추(‘산개 성단’, ‘구상 성단’, ‘방출 성운’, ‘반사 성운’, ‘암흑 성운’)를 눌러요', '#tab-objects'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  model: 'generative',
  predict: {
    title: '밤하늘의 은하수는<br>왜 띠 모양으로 보일까?',
    lead: '맑은 날 불빛이 없는 곳에서 밤하늘을 보면 하늘을 가로지르는 뿌연 띠 모양의 은하수를 볼 수 있어요. 조선 시대의 천문도인 천상열차분야지도에도 은하수가 그려져 있어요.<br>은하수는 무엇이고, 왜 띠 모양으로 보이는지 지금 내 생각을 먼저 꺼내 보세요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="산 위 밤하늘을 가로지르는 은하수"><defs><linearGradient id="mw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050716"/><stop offset="1" stop-color="#18183a"/></linearGradient><radialGradient id="mw-glow"><stop offset="0" stop-color="#fff3dc" stop-opacity=".55"/><stop offset="1" stop-color="#c9b8ff" stop-opacity="0"/></radialGradient></defs><rect width="520" height="250" rx="12" fill="url(#mw-sky)"/><g transform="rotate(-28 260 125)"><ellipse cx="260" cy="125" rx="300" ry="34" fill="url(#mw-glow)"/><ellipse cx="300" cy="125" rx="90" ry="40" fill="url(#mw-glow)"/><path d="M60 126 C180 118 260 136 460 122" stroke="#05071a" stroke-width="6" opacity=".55" fill="none"/></g>${Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 137) % 520}" cy="${(i * 59) % 200}" r="${.5 + (i % 4) * .35}" fill="#fff" opacity="${.4 + (i % 3) * .2}"/>`).join('')}<path d="M0 250 L0 200 L80 170 L150 205 L230 160 L310 210 L400 175 L470 200 L520 185 L520 250Z" fill="#05060c"/></svg>`,
    question: '은하수가 밤하늘을 가로지르는 띠 모양으로 보이는 까닭은 무엇이라고 생각하나요?',
    choices: ['수많은 별이 모인 납작한 원반 안에 우리가 있어서, 원반 쪽을 볼 때 별이 많이 겹쳐 보이기 때문이에요.', '별들이 하늘에 긴 띠 모양으로 한 줄로 늘어서 있기 때문이에요.', '은하수는 별이 아니라 구름이 띠 모양으로 모여 있는 것이기 때문이에요.', '아직 잘 모르겠어요.'],
    placeholder: '은하수를 본 경험이나 사진, 1학년 때 배운 태양계를 떠올려 보세요. 은하수는 무엇으로 이루어져 있을까요?',
  },
  observe: {
    title: '우리은하의 모양과 크기, 은하수, 우리은하를 이루는 천체를 탐구해 보세요.',
    recordLabel: '위와 옆에서 본 우리은하의 모습, 태양계의 위치, 은하수가 밝게 보이는 방향, 성단과 성운의 특징을 적어 보세요.',
    placeholder: '우리은하를 위에서·옆에서 본 모양, 태양계가 있는 곳, 은하 중심 방향과 반대 방향의 은하수 차이, 성단과 성운의 종류별 특징을 적어 보세요.',
  },
  explain: {
    question: '처음 생각과 탐구 결과를 비교해 보세요. 은하수가 띠 모양으로 보이는 까닭과, 은하수에서 밝고 선명하게 보이는 부분이 우리은하의 어디에 해당하는지 설명해 보세요.',
    concepts: [
      ['은하와 우리은하', '우주에는 수많은 별로 이루어진 집단이 있는데 이를 은하라고 해요. 태양계가 속한 은하를 우리은하라고 하고, 은하수는 지구에서 보이는 우리은하의 일부예요.'],
      ['우리은하의 모양과 크기', '위에서 보면 중심부에 별들이 밀집해 막대 모양을 이루고, 그 주변으로 나선팔이 있어요. 옆에서 보면 중심부가 볼록한 원반 모양이에요. 지름은 약 30000 pc이고, 태양계는 중심에서 약 8500 pc 떨어진 나선팔에 있어요.'],
      ['성단', '별이 무리 지어 있는 것을 성단이라고 해요. 산개 성단은 수십~수만 개의 별이 엉성하게 모여 있고 파란색을 띠는 고온의 별이 많아요. 구상 성단은 수만~수십만 개의 별이 촘촘하게 공 모양으로 모여 있고 붉은색을 띠는 저온의 별이 많아요.'],
      ['성간 물질과 성운', '별과 별 사이의 가스와 티끌 등을 성간 물질이라고 하고, 성간 물질이 모여 구름처럼 보이는 것을 성운이라고 해요. 방출 성운은 별빛을 흡수하여 온도가 높아져 스스로 빛을 내고, 반사 성운은 별빛을 반사하여 밝게 보이며, 암흑 성운은 뒤에서 오는 별빛을 가로막아 어둡게 보여요.'],
    ],
    note: '적용: 태양계는 납작한 원반 모양의 우리은하 안에 있어서 원반 방향을 보면 수많은 별이 겹쳐 띠 모양의 은하수로 보여요. 별이 밀집한 은하 중심 방향(궁수자리 쪽)의 은하수가 더 밝고 선명하게 보여요.',
  },
  onRestart: () => {
    show = true; $('#show-detail').checked = true;
    seenViews.clear(); seenBands.clear(); rightKinds.clear(); for (const k of Object.keys(answers)) delete answers[k];
    lab.resetQuiz(); $('#reset').click(); setTab('shape');
  },
});
setTab('shape');
requestAnimationFrame(frame);
