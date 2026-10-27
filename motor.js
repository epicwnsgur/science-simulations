import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, reducedMotion, instantLessons } from './src/lab-shell.js';
import { motorTorque, simpleMotorContact, simpleMotorTorque } from './src/force-model.js';
import { setupViewToggle } from './src/view-toggle.js';

// 교과서 262–264쪽(전동기의 구조와 작동 원리, 과학과 나: 간이 전동기 만들기), 지도서 590–593쪽.
// 지도상 유의점: 전류가 흐르는 코일과 자석의 상호 작용 관점에서 전동기의 원리를 이해하도록 합니다.
// 회전 속도와 힘의 크기는 보기 쉽게 나타낸 상대값입니다.

const C = { x: 400, y: 230 }, HALF_W = 92;
const VOLTS = [1.5, 3];
const terms = [
  ['전동기', '자기장 속에서 전류가 흐르는 코일이 받는 힘을 이용한 대표적인 장치예요. 코일과 자석으로 이루어져 있어요.'],
  ['코일이 회전하는 까닭', '코일의 왼쪽과 오른쪽에 흐르는 전류의 방향이 반대라서, 자석이 만든 자기장 안에서 두 부분이 받는 힘의 방향도 서로 반대가 되어 코일이 회전해요.'],
  ['회전 방향 바꾸기', '전류의 방향이나 자석의 극(자기장의 방향)을 바꾸면 코일의 회전 방향이 바뀌어요.'],
  ['전동기의 이용', '선풍기, 드론, 청소기, 스마트폰 진동, 전기 자동차, 엘리베이터 등 전기로 움직이는 대부분의 기구에 전동기가 이용돼요.'],
];
const scene = `
<g id="motor-scene">
  <g id="magnet-s"><path d="M150 140 h120 v180 h-120z" fill="#3a6fd8"/><path d="M270 140 l22 -14 v180 l-22 14z" fill="#2a56b0"/><path d="M150 140 l22 -14 h120 l-22 14z" fill="#5d8cec"/><text id="pole-left" x="210" y="244" font-size="46" font-weight="800" text-anchor="middle" style="fill:#fff">S</text></g>
  <g id="magnet-n"><path d="M530 140 h120 v180 h-120z" fill="#e04848"/><path d="M530 140 l22 -14 h120 l-22 14z" fill="#ec6a6a"/><text id="pole-right" x="590" y="244" font-size="46" font-weight="800" text-anchor="middle" style="fill:#fff">N</text></g>
  <g id="field" opacity="0">${[170, 200, 230, 260, 290].map(y => `<path d="M520 ${y} H${300}" stroke="#5fe0ff" stroke-width="2.5" opacity=".7" marker-end="url(#arrow-head)" class="field-flow"/>`).join('')}<text x="410" y="132" text-anchor="middle" font-size="12" style="fill:#5fe0ff">자기장의 방향</text></g>
  <g id="rotor"></g>
  <g id="commutator"></g>
  <path d="M352 372 V300 H366 V236 M448 372 V300 H434 V236" stroke="#8f9bc4" stroke-width="3" fill="none"/>
  <g id="battery"><rect x="350" y="372" width="100" height="34" rx="6" fill="#2a3150" stroke="#8f9bc4"/><rect x="356" y="378" width="88" height="22" rx="4" fill="url(#copper)"/><text id="bat-left" x="340" y="396" text-anchor="end" font-size="16" font-weight="700">−</text><text id="bat-right" x="460" y="396" font-size="16" font-weight="700">+</text></g>
  <text x="400" y="430" text-anchor="middle" font-size="12" class="muted">전지와 브러시</text>
  <g id="force-vectors" opacity="0"></g>
  <text x="400" y="104" text-anchor="middle" font-size="12" class="muted">코일을 앞에서 본 모습 · ⊙ 앞으로 나오는 전류, ⊗ 뒤로 들어가는 전류</text>
</g>
<g id="simple-scene" hidden>
  <rect x="250" y="360" width="300" height="56" rx="12" fill="url(#copper)"/><rect x="540" y="374" width="16" height="28" rx="3" fill="#c46f2c"/><text x="400" y="396" text-anchor="middle" font-size="14" font-weight="700" style="fill:#3b2400">건전지</text>
  <path d="M290 362 V200 M510 362 V200" stroke="#e6b17a" stroke-width="6"/><circle cx="290" cy="196" r="7" fill="none" stroke="#e6b17a" stroke-width="4"/><circle cx="510" cy="196" r="7" fill="none" stroke="#e6b17a" stroke-width="4"/>
  <g id="neo"><rect x="360" y="318" width="80" height="42" rx="8" fill="#9aa4b2"/><ellipse cx="400" cy="318" rx="40" ry="9" fill="#c9d1db"/><text id="neo-label" x="400" y="346" text-anchor="middle" font-size="12" style="fill:#1b1f2e;font-weight:700">N</text></g>
  <text x="400" y="440" text-anchor="middle" font-size="12" class="muted">네오디뮴 자석 · 구리판 받침대</text>
  <g id="ring"></g>
  <text id="contact-label" x="610" y="200" font-size="13"></text>
  <g id="simple-fx"></g>
</g>
<g id="fx"></g>
<g id="speed" transform="translate(690 120)"><text x="0" y="-14" text-anchor="middle" font-size="12" class="muted">회전 빠르기</text><circle r="38" fill="#0f1730" stroke="#2c3966" stroke-width="3"/><path id="speed-arc" fill="none" stroke="#ffd166" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/><text id="speed-dir" y="6" text-anchor="middle" font-size="18"></text></g>`;

const lab = buildLab({
  crumb: '자기 02 전동기',
  title: '전동기는 어떻게 회전할까?',
  intro: '자석 사이에 놓인 코일에 전류를 흘려 코일이 회전하는 원리를 알아보세요.',
  tabs: [{ id: 'motor', label: '전동기의 원리' }, { id: 'simple', label: '간이 전동기 만들기' }],
  toggle: '자기장·전류·힘 보기',
  sceneLabel: '자석 사이에서 회전하는 코일과 간이 전동기',
  scene,
  terms,
});

/* ---------- 상태 ---------- */
let mode = 'motor', show = false, on = false, current = 1, magnet = 1, vIndex = 0, lastFrame = 0;
let angle = .5, omega = 0, phase = .3, phaseOmega = 0, stripping = 'half', turns = 0;
// view: ‘자기장·전류·힘 보기’를 켜고 코일 양쪽이 받는 힘을 직접 본 적이 있는지(꼭 봐야 다음으로 넘어가요).
const seen = { spin: false, reversed: false, simpleSpin: false, fullStuck: false, view: false };
let lastSign = 0, fullTime = 0;
let flow = null;
let use3d = false;

/* ---------- 전동기의 원리 ---------- */
function stepMotor(dt) {
  const V = on ? VOLTS[vIndex] : 0;
  const torque = motorTorque(angle, current, magnet, V);
  // 회전을 방해하는 마찰을 두어 일정한 빠르기에 이르러요.
  // 왼쪽 변이 아래로 힘을 받으면(돌림힘 +) 화면에서 시계 반대 방향으로 돌아요.
  omega += (-torque * 5 - omega * 1.4) * dt;
  if (!on) omega *= Math.exp(-dt * 1.2);
  angle += omega * dt;
  turns += Math.abs(omega * dt) / (2 * Math.PI);
  if (on && turns > 1 && !seen.spin) { seen.spin = true; toast('코일이 회전해요!'); }
  // 빠르게 돌던 방향이 반대로 바뀌면 회전 방향을 비교한 것으로 봐요.
  if (on && Math.abs(omega) > 1) {
    const sign = Math.sign(omega);
    if (lastSign && sign !== lastSign && !seen.reversed) { seen.reversed = true; toast('↺ 회전 방향이 바뀌었어요'); }
    lastSign = sign;
  }
}
function paintMotor() {
  // 코일을 앞에서 보면 가로 막대처럼 보여요. 양 끝이 자석 옆을 지나는 코일의 두 변이에요.
  const c = Math.cos(angle), s = Math.sin(angle);
  const L = { x: C.x - HALF_W * c, y: C.y - HALF_W * s }, R = { x: C.x + HALF_W * c, y: C.y + HALF_W * s };
  // 정류 부분 덕분에 왼쪽에 있는 변은 늘 같은 방향의 전류가 흘러요.
  const leftEnd = L.x < R.x ? L : R, rightEnd = L.x < R.x ? R : L;
  const flowing = on;
  const dot = (p, out) => `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="15" fill="#1b2340" stroke="${flowing ? '#7dff7a' : '#c46f2c'}" stroke-width="3"/>${flowing ? (out ? '<circle r="4" fill="#7dff7a"/>' : '<path d="M-7 -7 L7 7 M7 -7 L-7 7" stroke="#7dff7a" stroke-width="3"/>') : ''}</g>`;
  const outLeft = current > 0; // 정류 부분 덕분에 왼쪽 변의 전류 방향은 전지 연결 방향으로만 정해져요.
  $('#rotor').innerHTML = `${flowing ? `<path d="M${L.x} ${L.y} L${R.x} ${R.y}" stroke="#ffb36b" stroke-width="16" opacity=".4" filter="url(#glow-strong)"/>` : ''}<path d="M${L.x} ${L.y} L${R.x} ${R.y}" stroke="url(#copper)" stroke-width="10" stroke-linecap="round"/>${dot(leftEnd, outLeft)}${dot(rightEnd, !outLeft)}`;
  // 앞에서 보면 회전축은 코일 가운데의 점이고, 정류 고리(금색)는 축에 붙어 코일과 함께 돌아요.
  // 양쪽 브러시는 고정되어 있어, 반 바퀴마다 고리의 다른 쪽과 닿으며 코일의 전류 방향을 바꾸어 줘요.
  // 고리의 반쪽은 각각 자기와 이어진 변 쪽에 있어서, 틈은 코일과 수직이에요. 코일이 세로로 설 때(힘이 회전시키지 못할 때) 틈이 브러시를 지나요.
  const deg = (angle * 180 / Math.PI).toFixed(1);
  $('#commutator').innerHTML = `<g transform="translate(${C.x} ${C.y}) rotate(${deg})"><path d="M4 -20 A20 20 0 0 1 4 20" stroke="#e8c15a" stroke-width="7" fill="none"/><path d="M-4 20 A20 20 0 0 1 -4 -20" stroke="#e8c15a" stroke-width="7" fill="none"/></g><circle cx="${C.x}" cy="${C.y}" r="6" fill="#d8dde3"/><rect x="${C.x - 34}" y="${C.y - 6}" width="10" height="12" rx="2" fill="#6d7898"/><rect x="${C.x + 24}" y="${C.y - 6}" width="10" height="12" rx="2" fill="#6d7898"/>`;
  const dirL = current * magnet > 0 ? 1 : -1; // +1: 왼쪽 변이 아래로, 오른쪽 변이 위로 힘을 받아요.
  $('#force-vectors').innerHTML = on ? `<path d="M${leftEnd.x} ${leftEnd.y + dirL * 20} v${dirL * 46}" stroke="#ff6b6b" stroke-width="4" marker-end="url(#arrow-head)"/><path d="M${rightEnd.x} ${rightEnd.y - dirL * 20} v${-dirL * 46}" stroke="#ff6b6b" stroke-width="4" marker-end="url(#arrow-head)"/><text x="${leftEnd.x - 24}" y="${leftEnd.y + dirL * 70}" font-size="13" text-anchor="end" style="fill:#ff9a9a">힘</text><text x="${rightEnd.x + 24}" y="${rightEnd.y - dirL * 62}" font-size="13" style="fill:#ff9a9a">힘</text>` : '';
  $('#force-vectors').setAttribute('opacity', show ? 1 : 0);
  $('#field').setAttribute('opacity', show ? 1 : 0);
  // 자기장은 N극에서 S극으로 향해요.
  $$('#field path').forEach(p => p.setAttribute('d', `M${magnet > 0 ? 520 : 300} ${p.getAttribute('d').split(' ')[1]} H${magnet > 0 ? 300 : 520}`));
  setText('#pole-left', magnet > 0 ? 'S' : 'N'); setText('#pole-right', magnet > 0 ? 'N' : 'S');
  $('#magnet-s path').setAttribute('fill', magnet > 0 ? '#3a6fd8' : '#e04848');
  $('#magnet-n path').setAttribute('fill', magnet > 0 ? '#e04848' : '#3a6fd8');
  setText('#bat-left', current > 0 ? '−' : '+'); setText('#bat-right', current > 0 ? '+' : '−');
}

/* ---------- 간이 전동기 ---------- */
function stepSimple(dt) {
  const V = on ? VOLTS[vIndex] : 0;
  const torque = simpleMotorTorque(phase, stripping, magnet, V);
  phaseOmega += (torque * 6 - phaseOmega * .9) * dt;
  phase += phaseOmega * dt;
  if (on && stripping === 'half' && Math.abs(phaseOmega) > 4 && !seen.simpleSpin) { seen.simpleSpin = true; toast('간이 전동기가 돌아가요!'); burst($('#simple-fx'), 400, 196, '#ffd166', 18); }
  if (on && stripping === 'full') { fullTime += dt; if (fullTime > 2.5 && Math.abs(phaseOmega) < 1 && !seen.fullStuck) { seen.fullStuck = true; toast('양쪽을 모두 벗기니 흔들리다 멈춰요'); } }
}
function paintSimple() {
  const contact = on && simpleMotorContact(phase, stripping);
  const ry = Math.abs(Math.cos(phase)) * 62 + 3;
  const front = Math.sin(phase) > 0;
  $('#ring').innerHTML = `${contact ? `<ellipse cx="400" cy="196" rx="104" ry="${ry.toFixed(1)}" stroke="#ffb36b" stroke-width="14" fill="none" opacity=".45" filter="url(#glow-strong)"/>` : ''}<path d="M290 196 H296 M504 196 H510" stroke="#c46f2c" stroke-width="4"/><ellipse cx="400" cy="196" rx="104" ry="${ry.toFixed(1)}" stroke="url(#copper)" stroke-width="${front ? 7 : 5}" fill="none"/><path d="M500 196 h14" stroke="${stripping === 'half' ? (Math.cos(phase) > 0 ? '#f7c08a' : '#7a2e12') : '#f7c08a'}" stroke-width="6"/>`;
  setText('#contact-label', on ? (contact ? '전류가 흘러요' : '전류가 흐르지 않아요') : '');
  $('#contact-label').style.fill = contact ? '#ffd166' : '#8f9bc4';
  setText('#neo-label', magnet > 0 ? 'N' : 'S');
}

function paintSpeed() {
  const w = mode === 'motor' ? omega : phaseOmega;
  const f = Math.min(1, Math.abs(w) / 14), a0 = -Math.PI / 2, a1 = a0 + f * Math.PI * 1.98;
  $('#speed-arc').setAttribute('d', f > .01 ? `M${(Math.cos(a0) * 30).toFixed(1)} ${(Math.sin(a0) * 30).toFixed(1)} A30 30 0 ${f > .5 ? 1 : 0} 1 ${(Math.cos(a1) * 30).toFixed(1)} ${(Math.sin(a1) * 30).toFixed(1)}` : '');
  setText('#speed-dir', Math.abs(w) < .3 ? '·' : w > 0 ? '↻' : '↺');
}

/* ---------- 조작과 문구 ---------- */
function renderControls() {
  const common = `<div role="group" aria-label="전압"><span class="group-label">전지</span>${VOLTS.map((v, i) => `<button data-v="${i}" aria-pressed="${i === vIndex}">${v} V</button>`).join('')}</div>`;
  if (mode === 'motor') {
    $('#controls').innerHTML = `${common}<div role="group" aria-label="바꾸기"><button id="flip-current">⇅ 전류의 방향 바꾸기</button><button id="flip-magnet">자석의 극 바꾸기</button></div>`;
    $('#flip-current').onclick = () => { current *= -1; toast('⇅ 전지를 반대로 연결했어요'); renderText(); };
  } else {
    $('#controls').innerHTML = `${common}<div role="group" aria-label="에나멜 벗기기"><span class="group-label">에나멜</span><button data-strip="half" aria-pressed="${stripping === 'half'}">한쪽은 반만 벗김</button><button data-strip="full" aria-pressed="${stripping === 'full'}">양쪽 모두 완전히 벗김</button></div><div role="group"><button id="flip-magnet">자석 뒤집기</button><button id="nudge">코일 살짝 밀기</button></div>`;
    $$('[data-strip]').forEach(b => b.onclick = () => { stripping = b.dataset.strip; fullTime = 0; phaseOmega = 0; renderControls(); });
    $('#nudge').onclick = () => { phaseOmega += 3 * (magnet || 1); };
  }
  $('#flip-magnet').onclick = () => { magnet *= -1; toast('자석의 극을 바꾸었어요'); renderText(); };
  $$('[data-v]').forEach(b => b.onclick = () => { vIndex = +b.dataset.v; renderControls(); });
  $('#actions').innerHTML = `<button id="switch-btn" class="primary" aria-pressed="${on}">${on ? '■ 전류 끊기' : '▶ 전류 흘리기'}</button>`;
  $('#switch-btn').onclick = () => { on = !on; turns = 0; lastSign = 0; fullTime = 0; renderControls(); };
  renderText();
}
function renderText() {
  const conducting = on && (mode === 'motor' || simpleMotorContact(phase, stripping));
  if (mode === 'motor') {
    setText('#guide', '자석 사이에 놓인 코일에 전류를 흘려 코일이 어떻게 움직이는지 관찰해 보세요.');
    setText('#subguide', '전류의 방향이나 자석의 극을 바꾸면 회전 방향이 어떻게 될까요?');
    setText('#stage-state', `전류 ${conducting ? '흐름' : '끊김'} · ${VOLTS[vIndex]} V · 전류 ${current > 0 ? '처음 방향' : '반대 방향'} · 자석 ${magnet > 0 ? '처음' : '극 바꿈'}`);
    setText('#note-title', on ? '코일의 왼쪽과 오른쪽이 받는 힘을 비교해 보세요' : '전류를 흘려 보세요');
    setText('#note-text', use3d
      ? '‘자기장·전류·힘 보기’를 켜면 자기장(하늘색), 코일의 두 변에 흐르는 전류(노란색), 두 변이 받는 힘(빨간색)을 화살표로 볼 수 있어요.'
      : '‘자기장·전류·힘 보기’를 켜면 코일의 두 변에 흐르는 전류(⊙, ⊗)와 힘의 방향을 볼 수 있어요.');
    setText('#model-note', use3d
      ? '교과서의 전동기 그림을 3D로 나타냈어요. 화면을 끌어 돌려 보고, ‘축을 따라’를 누르면 코일을 앞에서 본 모습이 돼요. 금색 고리는 코일이 반 바퀴 돌 때마다 전류의 방향을 바꾸어 주어 코일이 같은 방향으로 계속 돌게 해요. 빠르기와 힘의 크기는 보기 쉽게 나타냈어요.'
      : '전동기를 앞에서 본 모습이에요. 금색 고리는 코일이 반 바퀴 돌 때마다 전류의 방향을 바꾸어 주어 코일이 같은 방향으로 계속 돌게 해요. 빠르기와 힘의 크기는 보기 쉽게 나타냈어요.');
    setText('#discovery', '선풍기, 드론, 청소기, 스마트폰 진동에도 전동기가 들어 있어요.');
  } else {
    setText('#guide', '간이 전동기를 만들어 코일이 계속 회전하게 해 보세요.');
    setText('#subguide', '에나멜을 벗기는 방법을 바꾸어 비교해요. 코일이 멈춰 있으면 살짝 밀어 주세요.');
    setText('#stage-state', `전류 ${conducting ? '흐름' : '끊김'} · ${stripping === 'half' ? '한쪽은 반만 벗김' : '양쪽 모두 완전히 벗김'} · 자석 ${magnet > 0 ? 'N극 위' : 'S극 위'}`);
    setText('#note-title', on ? '코일이 계속 회전하나요?' : '전류를 흘려 보세요');
    setText('#note-text', '전류가 흐르는 동안과 흐르지 않는 동안 코일의 움직임을 살펴보세요.');
    setText('#model-note', '코일 한쪽 끝의 에나멜을 반만 벗기면 코일이 반 바퀴 도는 동안만 구리판과 전기가 통해요. 빠르기와 흔들림은 보기 쉽게 나타냈어요.');
    setText('#discovery', '전동기의 주요 부품에는 코일과 자석이 있어요.');
  }
  setHTML('#readout', `<div class="readout-grid"><div class="readout-card"><strong>전류</strong><b>${conducting ? '흐름' : '끊김'}</b><small>${VOLTS[vIndex]} V</small></div><div class="readout-card"><strong>${mode === 'motor' ? '자석' : '에나멜'}</strong><b>${mode === 'motor' ? (magnet > 0 ? 'S | N' : 'N | S') : stripping === 'half' ? '반만' : '완전히'}</b><small>${mode === 'motor' ? '왼쪽 | 오른쪽' : '한쪽 끝을 벗긴 방법'}</small></div></div>`);
}
function setMode(next) {
  mode = next; lab.selectTab(next); on = false; turns = 0; lastSign = 0;
  view3d?.view?.setMode(next);
  $('#motor-scene').toggleAttribute('hidden', next !== 'motor');
  $('#simple-scene').toggleAttribute('hidden', next !== 'simple');
  renderControls();
}
$('#tab-motor').onclick = () => setMode('motor');
$('#tab-simple').onclick = () => setMode('simple');
$('#reset').onclick = () => { current = 1; magnet = 1; vIndex = 0; omega = 0; phaseOmega = 0; angle = .5; phase = .3; stripping = 'half'; setMode(mode); };
$('#show-detail').onchange = e => { show = e.target.checked; };

/* ---------- 3D로 보기 ---------- */
const view3d = setupViewToggle({
  stage: $('.stage'), key: 'motor-view', cams: [['oblique', '비스듬히'], ['axis', '축을 따라'], ['top', '위에서']],
  load: () => import('./src/motor-3d.js').then(({ createMotor3D }) => { const v = createMotor3D({ stage: $('.stage'), svg: $('#scene'), reducedMotion: instantLessons }); v.setMode(mode); return v; }),
  onChange: active => { use3d = active; if (!active) paintMotor(); renderText(); },
});

function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (!flow || flow.stage === 'observe') {
    const steps = instantLessons.matches ? 1 : 4;
    for (let i = 0; i < steps; i++) { if (mode === 'motor') stepMotor(dt / steps); else stepSimple(dt / steps); }
    if (mode === 'motor') { if (!use3d) paintMotor(); } else { paintSimple(); renderText(); }
    paintSpeed();
    if (use3d) view3d.view.update({ mode, on, show, current, magnet, vIndex, angle, phase, stripping, contact: simpleMotorContact(phase, stripping) }, dt);
    if (show && on && mode === 'motor') seen.view = true;
    flow?.update(checklist([
      ['전동기에 전류를 흘려 회전 관찰하기', seen.spin, '‘전동기의 원리’ 탭 → ‘전류 흘리기’'],
      ['‘자기장·전류·힘 보기’를 켜고 코일 양쪽이 받는 힘 비교하기', seen.view, '‘자기장·전류·힘 보기’를 켜고, 코일의 왼쪽과 오른쪽이 받는 힘의 방향을 비교해요', '', '#show-detail'],
      ['전류의 방향이나 자석의 극을 바꾸어 회전 방향 비교하기', seen.reversed, '돌고 있을 때 ‘전류의 방향 바꾸기’나 ‘자석의 극 바꾸기’', '#flip-current, #flip-magnet'],
      ['간이 전동기: 반만 벗긴 코일 회전시키기', seen.simpleSpin, '‘간이 전동기 만들기’ 탭 → ‘전류 흘리기’ → ‘코일 살짝 밀기’', '#tab-simple'],
      ['간이 전동기: 양쪽 모두 벗긴 코일과 비교하기', seen.fullStuck, '‘양쪽 모두 완전히 벗김’으로 바꾸고 ‘코일 살짝 밀기’', '[data-strip="full"]'],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '자석 사이에 놓인 코일에<br>전류가 흐르면 계속 돌 수 있을까?',
    lead: '전기 그네에서 자기장 속 코일에 전류가 흐르면 힘을 받아 움직였어요.<br>이번에는 두 자석 사이에 코일을 놓고, 코일이 축을 중심으로 돌 수 있게 했어요.',
    illustration: `<svg viewBox="0 0 520 250" role="img" aria-label="두 자석 사이의 코일"><rect width="520" height="250" rx="12" fill="#121a33"/><rect x="40" y="60" width="110" height="130" fill="#3a6fd8"/><text x="95" y="140" text-anchor="middle" font-size="40" font-weight="800" fill="#fff">S</text><rect x="370" y="60" width="110" height="130" fill="#e04848"/><text x="425" y="140" text-anchor="middle" font-size="40" font-weight="800" fill="#fff">N</text><path d="M180 140 L340 110" stroke="#c46f2c" stroke-width="9" stroke-linecap="round"/><circle cx="260" cy="125" r="6" fill="#d8dde3"/><rect x="215" y="200" width="90" height="26" rx="5" fill="#c46f2c"/></svg>`,
    question: '코일에 전류를 흘리면 코일은 어떻게 움직일까요?',
    choices: ['한 방향으로 계속 회전할 것 같아요.', '조금 돌다가 멈출 것 같아요.', '앞뒤로 흔들리기만 할 것 같아요.', '움직이지 않을 것 같아요.'],
    placeholder: '전기 그네에서 전류의 방향을 바꾸었을 때 힘의 방향이 어떻게 되었는지 떠올려 보세요.',
  },
  observe: {
    title: '전동기의 원리를 관찰하고, 간이 전동기를 만들어 보세요.',
    recordLabel: '코일이 회전하는 모습, 전류의 방향이나 자석의 극을 바꾸었을 때, 에나멜을 벗기는 방법에 따른 차이를 적어 보세요.',
    placeholder: '코일의 왼쪽과 오른쪽이 받는 힘의 방향, 회전 방향이 바뀐 조건, 간이 전동기가 계속 돈 조건을 적어 보세요.',
    // 관찰 기록을 활동마다 나눠 써요(src/poe-flow.js). title은 활동(탭이나 과정)의 이름이에요.
    parts: [
      { title: '전동기의 원리', label: '코일이 회전하는 모습과, 전류의 방향이나 자석의 극을 바꾸었을 때의 변화를 적어 보세요.', placeholder: '코일의 왼쪽과 오른쪽이 받는 힘의 방향, 회전 방향이 바뀐 조건을 적어 보세요.' },
      { title: '간이 전동기 만들기', label: '에나멜을 벗기는 방법에 따라 간이 전동기의 코일이 어떻게 움직였는지 적어 보세요.', placeholder: '에나멜을 모두 벗겼을 때와 한쪽 반만 벗겼을 때를 비교해 적어 보세요.' },
    ],
  },
  explain: {
    question: '전동기의 코일이 한 방향으로 계속 회전하는 까닭을 자기장, 전류, 힘과 관련지어 설명해 보세요.',
    concepts: [
      ['코일이 받는 힘', '자석이 만든 자기장 안에 놓인 코일에 전류가 흐르면 코일이 힘을 받아요. 전동기는 이 힘을 이용한 대표적인 장치이고, <b>코일과 자석</b>으로 이루어져 있어요.'],
      ['코일이 회전하는 까닭', '코일의 왼쪽 부분과 오른쪽 부분에 흐르는 전류의 방향은 반대예요. 따라서 자기장 안에 놓인 코일의 왼쪽과 오른쪽이 <b class="subj">받는 힘의 방향이</b> <b>서로 반대</b>가 되어 코일이 회전해요.'],
      ['계속 회전하려면', '코일이 반 바퀴 돌 때마다 전류의 방향이 알맞게 바뀌거나(전동기의 금색 고리), 반 바퀴 동안만 전류가 흐르면(간이 전동기의 반만 벗긴 에나멜) <b class="subj">코일이</b> <b>같은 방향으로 계속 돌아요</b>.'],
      ['회전 방향과 빠르기', '전류의 방향이나 자석의 극을 바꾸면 <b class="subj">회전 방향이</b> <b>바뀌어요</b>. 전류가 셀수록 코일이 받는 힘이 커져 빨리 돌아요.'],
      ['일상생활 속 전동기', '스마트폰의 진동, 드론, 청소기, 선풍기, 전기 자동차처럼 전기로 움직이는 대부분의 기구에 전동기가 이용돼요.'],
    ],
    note: '우리 주변에서 전동기를 활용한 전기 기구를 더 찾아보세요.',
  },
  onRestart: () => { show = false; $('#show-detail').checked = false; Object.keys(seen).forEach(k => seen[k] = false); lab.resetQuiz(); mode = 'motor'; $('#reset').click(); },
});
setMode('motor');
requestAnimationFrame(frame);
