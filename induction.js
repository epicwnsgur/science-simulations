import './style.css';
import './poe.css';
import './lab.css';
import './induction.css';
import './theme-electric.css';
import './readable.css';
import { FX_DEFS, toast, burst, checklist, headerHTML, setupTextSize, smoothDrag, instantLessons } from './src/lab-shell.js';
import { setupPOEFlow } from './src/poe-flow.js';
import {
  SPOON_OBJECTS, SCOPE_OBJECTS, RUB_LEVELS, scopeCharge, closeness, segmentDistance, clamp,
  spoonNuclei, spoonElectrons, spoonCounts, spoonShift,
  PLATE_SITES, LEAF_SITES, electroscopeLayout, leafAngle, chargeName,
} from './src/induction-model.js';

const $ = s => document.querySelector(s);
// 받침 유무에 따라 조사를 고릅니다. 예: josa('빨대', '을', '를') → '빨대를'
const josa = (word, withFinal, without) => { const code = word.charCodeAt(word.length - 1) - 0xac00; return word + (code >= 0 && code % 28 ? withFinal : without); };
const spriteUrl = new URL('../../images/balloon-fur.png', document.baseURI).href;
const terms = [
  ['정전기 유도', '전기를 띠지 않은 금속 물체에 대전체를 가까이 할 때, 대전체와 가까운 쪽은 대전체와 다른 종류의 전하, 먼 쪽은 같은 종류의 전하가 유도되는 현상이에요.'],
  ['검전기', '정전기 유도 현상을 이용해 물체의 대전 여부를 알아보는 기구예요.'],
  ['대전체', '전기를 띠고 있는 물체예요.'],
  ['전기력', '전기를 띤 두 물체 사이에 작용하는 힘이에요.'],
  ['인력', '다른 종류의 전하를 띤 물체 사이에 작용하는, 서로 끌어당기는 힘이에요.'],
  ['척력', '같은 종류의 전하를 띤 물체 사이에 작용하는, 서로 밀어내는 힘이에요.'],
];

/* ---------- 장면 좌표 (SVG viewBox 800×440) ---------- */
const PIVOT = Object.freeze({ x: 160, y: 262 });
const SPOON_TIP = 440, HANDLE_START = 70, MAX_TURN = .55;
const SPOON_START = Object.freeze({ x: 715, y: 92 });
const SPOON_GAP = { straw: 32, glove: 46 };
const PLATE = Object.freeze({ x: 300, y: 192, rx: 96, ry: 22 });
const ROD_TOP = Object.freeze({ x: 300, y: 214 }), LEAF_PIVOT = Object.freeze({ x: 300, y: 340 });
const SCOPE_START = Object.freeze({ x: 600, y: 84 });
const SCOPE_GAP = { straw: 46, balloon: 46, glove: 60 };
const LEAF_OFFSET = 8; // 두 금속박이 붙어 있는 자리. 오므라져 있어도 전하 표시가 겹치지 않게 합니다.
const PLATE_NUCLEI = [-65, -39, -13, 13, 39, 65];
const PLATE_EXTRA = [-52, -26, 26, 52];
const LEAF_NUCLEI = [22, 44, 66], LEAF_ELECTRONS = [14, 36, 58, 25, 47];
const OBJECT_DIR = (() => { const d = Math.hypot(150, -112); return { x: 150 / d, y: -112 / d }; })();

let mode = 'spoon', show = false;
let spoonKey = 'straw', scopeKey = 'straw', rubLevel = 1;
let obj = { ...SPOON_START }, angle = 0, shownShift = 0, motion = null, lastFrame = 0;
let leafShown = leafAngle(0);
const scopeState = new Map();
// viewSpoon·viewScope: ‘전하 보기’를 켜고 전자가 이동한 모습을 직접 본 적이 있는지(꼭 봐야 다음으로 넘어가요).
const seen = { spoonMinus: false, spoonPlus: false, levels: new Set(), viewSpoon: false, viewScope: false };
let flow = null;

$('#app').innerHTML = `
${headerHTML()}
<main><div class="breadcrumb">VII. 전기와 자기 <span>/</span> 02 정전기 유도</div>
<section class="intro"><div><h1>전기를 띤 물체 근처에 가면?</h1><p>대전체를 금속 물체에 가까이 가져가 보세요.</p></div></section>
<div class="workspace"><section class="lab"><div class="lab-toolbar"><div class="tabs" role="tablist" aria-label="활동 선택"><button id="spoon-tab" role="tab" aria-selected="true">01 <span>쇠숟가락 움직이기</span></button><button id="scope-tab" role="tab" aria-selected="false">02 <span>검전기 관찰하기</span></button></div><button id="reset" class="reset">↻ <span>처음으로</span></button></div>
<div class="instruction"><span class="step-icon">↔</span><div><strong id="guide"></strong><p id="subguide"></p></div><label class="toggle"><input type="checkbox" id="show-charges"><span>전하 보기</span></label></div>
<div id="spoon-controls" class="pair-controls choice-row" role="group" aria-label="가까이 할 물체">${Object.entries(SPOON_OBJECTS).map(([key, o]) => `<button data-spoon="${key}" aria-pressed="${key === spoonKey}">${o.label}</button>`).join('')}</div>
<div id="scope-controls" class="pair-controls choice-row" hidden><div role="group" aria-label="가까이 할 물체">${Object.entries(SCOPE_OBJECTS).map(([key, o]) => `<button data-scope="${key}" aria-pressed="${key === scopeKey}">${o.label}</button>`).join('')}</div><div role="group" aria-label="문지른 정도">${RUB_LEVELS.map(l => `<button data-rub="${l.id}" aria-pressed="${l.id === rubLevel}">${l.label}</button>`).join('')}</div><p id="rub-note"></p></div>
<div class="stage night"><div class="stage-label"><span id="stage-state" aria-live="polite"></span></div>
<svg id="scene" viewBox="0 0 800 440" aria-label="대전체를 금속 물체에 가까이 하는 실험 공간">
${FX_DEFS}
<defs>
<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".45" stop-color="#c9cfd5"/><stop offset="1" stop-color="#9aa3ab"/></linearGradient>
<radialGradient id="metal-bowl" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#c5ccd2"/><stop offset="1" stop-color="#8f99a2"/></radialGradient>
<radialGradient id="brass" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#f1d79b"/><stop offset=".7" stop-color="#b98d3f"/><stop offset="1" stop-color="#8b6427"/></radialGradient>
<linearGradient id="plate-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef1f3"/><stop offset="1" stop-color="#a8b0b7"/></linearGradient>
<linearGradient id="rod" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9b7d45"/><stop offset=".5" stop-color="#e3c98a"/><stop offset="1" stop-color="#9b7d45"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6ecf8" stop-opacity=".75"/><stop offset=".25" stop-color="#ffffff" stop-opacity=".35"/><stop offset="1" stop-color="#cfe6f4" stop-opacity=".7"/></linearGradient>
<linearGradient id="straw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a6"/><stop offset=".5" stop-color="#f2cf3a"/><stop offset="1" stop-color="#d7ad1c"/></linearGradient>
</defs>
<g id="spoon-scene">
  <ellipse class="table-shadow" cx="370" cy="300" rx="300" ry="20"/>
  <g id="spoon" transform="translate(${PIVOT.x} ${PIVOT.y})">
    <path class="spoon-body" d="M48 -12 C70 -14 90 -13 112 -12 L428 -16 Q452 -16 452 0 Q452 16 428 16 L112 12 C90 13 70 14 48 12 Z"/>
    <ellipse class="spoon-body" cx="0" cy="0" rx="66" ry="44" fill="url(#metal-bowl)"/>
    <ellipse cx="-4" cy="0" rx="52" ry="33" fill="#d9dee2" opacity=".7"/>
    <g class="weight"><circle r="23" fill="url(#brass)" stroke="#7d5a22"/><circle r="13" fill="none" stroke="#f6e3b4" stroke-width="2" opacity=".7"/></g>
    <g class="particles" id="spoon-particles"></g>
    <text class="part-label" x="0" y="66" text-anchor="middle">추를 올린 머리 쪽</text>
    <text class="part-label" x="${SPOON_TIP - 10}" y="40" text-anchor="middle">손잡이 끝</text>
  </g>
  <text class="object-name" x="${PIVOT.x + 220}" y="345" text-anchor="middle">쇠숟가락</text>
</g>
<g id="scope-scene" hidden>
  <ellipse class="table-shadow" cx="${PLATE.x}" cy="432" rx="140" ry="7"/>
  <path class="jar" d="M200 256 Q172 270 172 320 L176 404 Q180 430 222 430 L378 430 Q420 430 424 404 L428 320 Q428 270 400 256 Z"/>
  <rect x="${ROD_TOP.x - 4}" y="${ROD_TOP.y - 12}" width="8" height="${LEAF_PIVOT.y - ROD_TOP.y + 14}" rx="3" fill="url(#rod)"/>
  <path class="stopper" d="M258 224 h84 v34 q0 6 -6 6 h-72 q-6 0 -6 -6 Z"/>
  <ellipse cx="${PLATE.x}" cy="${PLATE.y + 7}" rx="${PLATE.rx}" ry="${PLATE.ry}" fill="#87919a"/>
  <ellipse cx="${PLATE.x}" cy="${PLATE.y}" rx="${PLATE.rx}" ry="${PLATE.ry}" fill="url(#plate-top)" stroke="#8b949c"/>
  <g id="leaves" transform="translate(${LEAF_PIVOT.x} ${LEAF_PIVOT.y})"><rect x="-13" y="-4" width="26" height="6" rx="2" fill="url(#rod)"/><path id="leaf-left" class="leaf" d="M-5 0 h10 v78 q-5 6 -10 0 Z"/><path id="leaf-right" class="leaf" d="M-5 0 h10 v78 q-5 6 -10 0 Z"/></g>
  <g class="particles" id="scope-particles"></g>
  <g class="scope-labels"><path d="M196 192 H150"/><text x="146" y="196" text-anchor="end">금속판</text><path d="M296 300 H150"/><text x="146" y="304" text-anchor="end">금속 막대</text><path d="M284 392 H150"/><text x="146" y="396" text-anchor="end">금속박</text></g>
</g>
<g id="charged-object" class="draggable" role="button" tabindex="0" aria-label="대전체, 방향키로 이동"><ellipse id="object-aura" rx="70" ry="70" opacity="0" filter="url(#glow-strong)"/><g class="shape"></g><g class="particles" id="object-particles"></g><text class="object-name" id="object-name" text-anchor="middle"></text></g>
<g id="fx"></g></svg><div class="stage-hint" id="stage-hint">↔ 물체를 잡고 움직여 보세요</div><div class="toast" id="toast" role="status" aria-live="polite"></div></div>
<div class="lab-bottom"><div class="legend"><span><b class="positive">+</b> 원자핵의 (+)전하</span><span><b class="negative">−</b> 전자의 (−)전하</span></div><button id="approach-button" class="primary">가까이 가져가기</button><button id="withdraw-button" class="secondary">멀리 하기</button></div>
<p class="model-note" id="model-note"></p></section>
<aside><section class="observation"><div class="section-label"><span>◉</span> 무엇이 달라졌나요?</div><h2 id="note-title"></h2><p id="note-text"></p><div id="charge-cards"></div><div class="discovery" id="discovery"></div></section>
<section class="mission"></section></aside></div>
<section class="vocabulary"><div class="vocab-heading"><h2>실험 속 핵심 개념</h2><span>단어를 누르면 뜻을 확인할 수 있어요.</span></div><div class="term-buttons">${terms.map(([t], i) => `<button data-term="${i}" class="${i === 0 ? 'active' : ''}">${t}</button>`).join('')}</div><p id="term-definition"><strong>${terms[0][0]}</strong> ${terms[0][1]}</p></section>
</main>`;
setupTextSize();

/* ---------- 모양 그리기 ---------- */
function charge(p, id) {
  const positive = p.sign > 0, r = positive ? 7 : 5, arm = r * .66;
  const glyph = `M${-arm} 0H${arm}` + (positive ? `M0 ${-arm}V${arm}` : '');
  return `<g class="charge" data-id="${id ?? p.id}" data-sign="${p.sign}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="${r}" fill="${positive ? '#e84444' : '#2f9bff'}"/><path d="${glyph}" stroke="#fff" stroke-width="${positive ? 1.8 : 1.5}" stroke-linecap="round" fill="none"/></g>`;
}
function syncLayer(layer, sites) {
  const signature = sites.map(p => `${p.id}:${p.sign}`).join(',');
  if (layer.dataset.signature !== signature) { layer.innerHTML = sites.map(p => charge(p)).join(''); layer.dataset.signature = signature; }
  [...layer.children].forEach((child, i) => {
    child.setAttribute('transform', `translate(${sites[i].x.toFixed(1)} ${sites[i].y.toFixed(1)})`);
    // 이동 중인 전자는 빛나게 나타내요.
    if (sites[i].glow) child.setAttribute('filter', 'url(#glow)'); else child.removeAttribute('filter');
  });
}
function clearLayer(layer) { layer.replaceChildren(); delete layer.dataset.signature; }
const OBJECT_ROTATE = `rotate(${(Math.atan2(OBJECT_DIR.y, OBJECT_DIR.x) * 180 / Math.PI).toFixed(2)})`;
function strawShape() {
  return `<g transform="${OBJECT_ROTATE}"><rect x="0" y="-9" width="290" height="18" rx="9" fill="url(#straw)" stroke="#c39a14"/><ellipse cx="3" cy="0" rx="3" ry="8" fill="#e0b92a"/></g>`;
}
function gloveShape() {
  return `<g transform="${OBJECT_ROTATE}"><path class="glove" d="M0 -20 Q-4 -34 14 -36 L96 -38 Q108 -38 108 -26 L108 26 Q108 38 96 38 L40 36 Q30 52 14 46 Q4 40 14 30 L14 28 Q-4 30 0 14 Z"/><path class="glove-line" d="M20 -12 H92 M20 2 H92 M20 16 H92"/><rect class="glove-cuff" x="106" y="-34" width="44" height="68" rx="8"/><path class="glove-line" d="M116 -30 V30 M126 -30 V30 M136 -30 V30"/></g>`;
}
function balloonShape() {
  // 마찰 전기 실험의 풍선 그림을 3/4 크기로, 몸통 아래 끝이 기준점에 오도록 놓습니다.
  return `<g transform="scale(.75)"><svg x="-88" y="-215" width="176" height="240" viewBox="0 0 710 1024" preserveAspectRatio="none" aria-hidden="true"><image href="${spriteUrl}" width="1536" height="1024"/></svg></g>`;
}
function currentObject() {
  if (mode === 'spoon') {
    const o = SPOON_OBJECTS[spoonKey];
    return { shape: o.shape, charge: o.charge, name: o.shape === 'glove' ? '장갑' : '빨대', gap: SPOON_GAP[o.shape], amount: Math.abs(o.charge) };
  }
  const o = SCOPE_OBJECTS[scopeKey], q = scopeCharge(scopeKey, rubLevel);
  return { shape: o.shape, charge: q, name: o.shape === 'glove' ? '장갑' : o.label.replace('플라스틱 ', ''), gap: SCOPE_GAP[o.shape], amount: Math.abs(q) };
}
// 대전체에는 대전된 만큼 남는 전하만 표시합니다(교과서 그림과 같은 방식).
function objectCharges(o) {
  const sign = Math.sign(o.charge), out = [];
  for (let i = 0; i < o.amount; i++) {
    if (o.shape === 'balloon') {
      const a = Math.PI / 2 + (i - (o.amount - 1) / 2) * .36;
      out.push({ id: `o${i}`, sign, x: Math.cos(a) * 34, y: -84 + Math.sin(a) * 42 });
    } else {
      const along = o.shape === 'glove' ? 22 + (i % 3) * 30 : 18 + i * 22;
      const across = o.shape === 'glove' ? (i < 3 ? -16 : 16) : 0;
      out.push({ id: `o${i}`, sign, x: OBJECT_DIR.x * along - OBJECT_DIR.y * across, y: OBJECT_DIR.y * along + OBJECT_DIR.x * across });
    }
  }
  return out;
}

/* ---------- 쇠숟가락 ---------- */
const local = (u) => 10 + u * 410;
function toWorld(p) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: PIVOT.x + p.x * c - p.y * s, y: PIVOT.y + p.x * s + p.y * c };
}
function spoonDistance(at = angle) {
  const c = Math.cos(at), s = Math.sin(at);
  const a = { x: PIVOT.x + HANDLE_START * c, y: PIVOT.y + HANDLE_START * s };
  const b = { x: PIVOT.x + SPOON_TIP * c, y: PIVOT.y + SPOON_TIP * s };
  return { d: segmentDistance(obj, a, b), a, b };
}
function spoonNear() {
  const o = currentObject();
  return closeness(spoonDistance().d, o.gap, o.gap + 200);
}
// 숟가락은 추를 중심으로 회전합니다. 대전체와 유도된 전하 사이의 인력이 마찰보다 클 때만 돌아가고,
// 닿기 전에 멈춥니다(대전된 물체가 금속에 닿는 상황은 다루지 않음).
function stepSpoon(dt) {
  const o = currentObject();
  const target = spoonShift(o.charge, spoonNear());
  const gain = instantLessons.matches ? 1 : 1 - Math.exp(-dt * 6);
  shownShift += (target - shownShift) * gain;
  if (!o.charge) return;
  // 동작 줄이기 설정에서는 작은 단계를 여러 번 계산해 곧바로 멈출 자리까지 돌립니다.
  // 단계마다 돌림힘을 다시 계산하므로 대전체를 지나쳐 돌아가지 않습니다.
  const steps = instantLessons.matches ? 60 : 1, h = instantLessons.matches ? .02 : dt;
  for (let i = 0; i < steps; i++) {
    const torque = spoonTorque();
    const strength = Math.abs(shownShift) * spoonNear() * Math.abs(torque);
    if (strength <= SPOON_FRICTION) break;
    const next = clamp(angle + Math.sign(torque) * (strength - SPOON_FRICTION) * 1.6 * h, -MAX_TURN, MAX_TURN);
    if (spoonDistance(next).d < o.gap) break;
    angle = next;
  }
}
const SPOON_FRICTION = .1;
// 대전체가 손잡이를 끌어당기는 방향으로 추를 중심으로 돌리는 정도(−1~1).
function spoonTorque() {
  const { a, b } = spoonDistance();
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  const t = clamp(((obj.x - a.x) * dx + (obj.y - a.y) * dy) / len2, 0, 1);
  const q = { x: a.x + dx * t, y: a.y + dy * t };
  const fx = obj.x - q.x, fy = obj.y - q.y, f = Math.hypot(fx, fy) || 1;
  return ((q.x - PIVOT.x) * fy - (q.y - PIVOT.y) * fx) / f / SPOON_TIP;
}
function paintSpoon() {
  $('#spoon').setAttribute('transform', `translate(${PIVOT.x} ${PIVOT.y}) rotate(${(angle * 180 / Math.PI).toFixed(2)})`);
  const layer = $('#spoon-particles');
  if (!show) return clearLayer(layer);
  syncLayer(layer, [
    ...spoonNuclei().map(p => ({ ...p, x: local(p.u), y: -5 })),
    ...spoonElectrons(shownShift).map(p => ({ ...p, x: local(p.u), y: 6 })),
  ]);
}

/* ---------- 검전기 ---------- */
function scopeNear() {
  const o = currentObject();
  const d = segmentDistance(obj, { x: PLATE.x - PLATE.rx, y: PLATE.y }, { x: PLATE.x + PLATE.rx, y: PLATE.y });
  return closeness(d, o.gap, o.gap + 210);
}
function leafPoint(side, x, y) {
  const a = (side === 'left' ? 1 : -1) * leafShown * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: LEAF_PIVOT.x + (side === 'left' ? -LEAF_OFFSET : LEAF_OFFSET) + x * c - y * s, y: LEAF_PIVOT.y + x * s + y * c };
}
function slotPoint({ part, slot }) {
  if (part === 'plate') return slot < PLATE_SITES ? { x: PLATE.x + PLATE_NUCLEI[slot], y: PLATE.y + 9 } : { x: PLATE.x + PLATE_EXTRA[slot - PLATE_SITES], y: PLATE.y - 6 };
  return leafPoint(part, part === 'left' ? -11 : 11, LEAF_ELECTRONS[slot]);
}
function scopeElectronPoint(e, now) {
  const end = slotPoint(e);
  if (!e.from) return end;
  const elapsed = now - e.start;
  if (elapsed >= e.duration) { e.from = null; return end; }
  const path = [e.from];
  const fromPlate = e.from.y < ROD_TOP.y + 1;
  if (e.part === 'plate') { if (!fromPlate) { if (e.from.y > LEAF_PIVOT.y - 1) path.push(LEAF_PIVOT); path.push(ROD_TOP); } }
  else { if (fromPlate) path.push(ROD_TOP); if (e.from.y < LEAF_PIVOT.y) path.push(LEAF_PIVOT); }
  path.push(end);
  const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
  let left = lengths.reduce((a, b) => a + b, 0) * (elapsed / e.duration);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? clamp(left / lengths[i], 0, 1) : 1;
      return { x: path[i].x + (path[i + 1].x - path[i].x) * t, y: path[i].y + (path[i + 1].y - path[i].y) * t };
    }
    left -= lengths[i];
  }
  return end;
}
function stepScope(now, dt) {
  const o = currentObject(), near = scopeNear();
  for (const target of electroscopeLayout(o.charge, near)) {
    const e = scopeState.get(target.id);
    if (!e) { scopeState.set(target.id, { ...target, from: null, origin: target.part }); continue; }
    if (e.part !== target.part || e.slot !== target.slot) {
      const from = scopeElectronPoint(e, now);
      e.origin = e.from ? e.origin : e.part;
      e.part = target.part; e.slot = target.slot; e.from = from; e.start = now;
      const d = Math.hypot(from.x - ROD_TOP.x, from.y - ROD_TOP.y) + (LEAF_PIVOT.y - ROD_TOP.y);
      e.duration = instantLessons.matches ? 1 : 300 + d * 3.2;
    }
  }
  // 도착한 전자만으로 금속박의 전하를 셉니다. 두 금속박이 같은 종류의 전하를 띨수록 척력으로 벌어져요.
  const counts = arrivedCounts(now);
  const net = (Math.abs(counts.left.minus - LEAF_SITES) + Math.abs(counts.right.minus - LEAF_SITES)) / 2;
  const target = leafAngle(net);
  const gain = instantLessons.matches ? 1 : 1 - Math.exp(-dt * 4);
  leafShown += (target - leafShown) * gain;
}
function arrivedCounts(now) {
  const parts = { plate: 0, left: 0, right: 0 };
  for (const e of scopeState.values()) {
    const arrived = !e.from || now - e.start >= e.duration;
    // 이동 중인 전자는 출발한 곳에 있는 것으로 셉니다.
    parts[arrived ? e.part : e.origin]++;
  }
  return { plate: { plus: PLATE_SITES, minus: parts.plate }, left: { plus: LEAF_SITES, minus: parts.left }, right: { plus: LEAF_SITES, minus: parts.right } };
}
function paintScope(now) {
  // 금속박이 벌어질수록 빛나게 나타내요.
  const spread = clamp((leafShown - 4) / 24, 0, 1);
  for (const id of ['#leaf-left', '#leaf-right']) { $(id).setAttribute('filter', spread > .15 ? 'url(#glow)' : ''); $(id).style.fill = spread > .15 ? `rgb(${255} ${222 - spread * 30} ${134 - spread * 60})` : ''; }
  $('#leaf-left').setAttribute('transform', `translate(${-LEAF_OFFSET} 0) rotate(${leafShown.toFixed(2)})`);
  $('#leaf-right').setAttribute('transform', `translate(${LEAF_OFFSET} 0) rotate(${(-leafShown).toFixed(2)})`);
  const layer = $('#scope-particles');
  if (!show) return clearLayer(layer);
  const nuclei = [
    ...PLATE_NUCLEI.map((x, i) => ({ id: `pp${i}`, sign: 1, x: PLATE.x + x, y: PLATE.y - 6 })),
    ...['left', 'right'].flatMap(side => LEAF_NUCLEI.map((y, i) => ({ id: `${side}p${i}`, sign: 1, ...leafPoint(side, 0, y) }))),
  ];
  const electrons = [...scopeState.values()].map(e => ({ id: e.id, sign: -1, glow: !!e.from && now - e.start < e.duration, ...scopeElectronPoint(e, now) }));
  syncLayer(layer, [...nuclei, ...electrons]);
}

/* ---------- 대전체 ---------- */
function paintObject() {
  const o = currentObject(), el = $('#charged-object');
  el.setAttribute('transform', `translate(${obj.x.toFixed(1)} ${obj.y.toFixed(1)})`);
  const key = `${o.shape}`;
  if (el.dataset.shape !== key) {
    el.querySelector('.shape').innerHTML = o.shape === 'straw' ? strawShape() : o.shape === 'glove' ? gloveShape() : balloonShape();
    el.dataset.shape = key;
  }
  const label = $('#object-name');
  const labelAt = o.shape === 'balloon' ? { x: 78, y: -60 } : o.shape === 'glove' ? { x: 150, y: -40 } : { x: OBJECT_DIR.x * 150 + 34, y: OBJECT_DIR.y * 150 + 30 };
  label.setAttribute('x', labelAt.x.toFixed(0)); label.setAttribute('y', labelAt.y.toFixed(0));
  label.textContent = o.name;
  el.setAttribute('aria-label', `${o.name}, ${o.charge ? (o.charge < 0 ? '(−)전하를 띰' : '(+)전하를 띰') : '전기를 띠지 않음'}. 방향키로 이동`);
  // 대전된 물체 둘레의 빛: (−)는 파란빛, (+)는 붉은빛. 대전된 정도가 클수록 밝아요.
  const aura = $('#object-aura'), at = o.shape === 'balloon' ? { x: 0, y: -84 } : { x: OBJECT_DIR.x * 70, y: OBJECT_DIR.y * 70 };
  aura.setAttribute('cx', at.x.toFixed(1)); aura.setAttribute('cy', at.y.toFixed(1));
  aura.setAttribute('fill', o.charge < 0 ? '#3aa0ff' : '#ff5a5a');
  aura.setAttribute('opacity', o.amount ? (.18 + Math.min(1, o.amount / 5) * .32).toFixed(2) : 0);
  const layer = $('#object-particles');
  if (!show || !o.amount) return clearLayer(layer);
  syncLayer(layer, objectCharges(o));
}
function region() {
  if (mode === 'spoon') return { x0: 560, x1: 770, y0: 40, y1: 410 };
  const o = currentObject();
  return { x0: 180, x1: 740, y0: o.shape === 'balloon' ? 132 : 40, y1: PLATE.y - o.gap };
}
function place(x, y) {
  const r = region(), o = currentObject();
  let next = { x: clamp(x, r.x0, r.x1), y: clamp(y, r.y0, r.y1) };
  if (mode === 'spoon') {
    const old = obj; obj = next;
    const { d, a, b } = spoonDistance();
    if (d < o.gap) {
      // 숟가락에 닿지 않도록 가장 가까운 지점에서 바깥으로 밀어냅니다.
      const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
      const t = clamp(((next.x - a.x) * dx + (next.y - a.y) * dy) / len2, 0, 1);
      const q = { x: a.x + dx * t, y: a.y + dy * t };
      let nx = next.x - q.x, ny = next.y - q.y, n = Math.hypot(nx, ny);
      if (n < .01) { nx = 0; ny = -1; n = 1; }
      next = { x: q.x + nx / n * o.gap, y: q.y + ny / n * o.gap };
      obj = next;
      if (spoonDistance().d < o.gap - .5) obj = old;
    }
  } else {
    const d = segmentDistance(next, { x: PLATE.x - PLATE.rx, y: PLATE.y }, { x: PLATE.x + PLATE.rx, y: PLATE.y });
    if (d < o.gap) next.y = Math.min(next.y, PLATE.y - o.gap);
    obj = next;
  }
}
function startPosition() {
  if (mode === 'spoon') return { ...SPOON_START };
  return currentObject().shape === 'balloon' ? { x: 620, y: 140 } : { ...SCOPE_START };
}
function approachTarget() {
  const o = currentObject();
  if (mode === 'scope') return { x: PLATE.x + 22, y: PLATE.y - o.gap };
  const tip = { x: PIVOT.x + SPOON_TIP * Math.cos(angle), y: PIVOT.y + SPOON_TIP * Math.sin(angle) };
  return { x: tip.x + 18, y: tip.y - o.gap - 78 };
}
function animateObject(target, duration) {
  motion = { from: { ...obj }, to: target, start: performance.now(), duration: instantLessons.matches ? 1 : duration };
}

/* ---------- 상태 문구 ---------- */
// 매 프레임 호출되므로 바뀐 경우에만 DOM을 고칩니다.
function setText(selector, text) { const el = $(selector); if (el.textContent !== text) el.textContent = text; }
function setHTML(selector, html) { const el = $(selector); if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; } }
function progress() {
  if (show && mode === 'spoon' && currentObject().charge && spoonNear() > .5) seen.viewSpoon = true;
  if (show && mode === 'scope' && rubLevel && leafShown - leafAngle(0) > 6) seen.viewScope = true;
  const steps = [
    ['(−)전하를 띤 빨대로 숟가락 움직이기', seen.spoonMinus, '‘쇠숟가락 움직이기’ 탭 → ‘(−)전하를 띤 빨대’ → ‘가까이 가져가기’'],
    ['‘전하 보기’를 켜고 숟가락 속 전자의 이동 살펴보기', seen.viewSpoon, '위쪽 ‘전하 보기’를 켠 채로 대전체를 숟가락에 가까이 가져가, 전자가 어느 쪽으로 모이는지 봐요', '', '#show-charges'],
    ['(+)전하를 띤 장갑으로 숟가락 움직이기', seen.spoonPlus, '‘(+)전하를 띤 장갑’을 고르고 ‘가까이 가져가기’', '[data-spoon="glove"]'],
    ['검전기: 2~3번 문지른 물체 가까이 하기', seen.levels.has(1), '‘검전기 관찰하기’ 탭 → ‘2~3번 문지름’ → ‘가까이 가져가기’', '#scope-tab'],
    ['‘전하 보기’를 켜고 금속판과 금속박의 전하 살펴보기', seen.viewScope, '‘전하 보기’를 켠 채로 대전체를 금속판에 가까이 가져가, 금속박으로 옮겨 간 전하를 봐요', '', '#show-charges'],
    ['검전기: 10번 이상 문지른 물체 가까이 하기', seen.levels.has(2), '‘10번 이상 문지름’으로 바꾸고 ‘가까이 가져가기’', '[data-rub="2"]'],
  ];
  return checklist(steps);
}
function card(name, o, note) {
  return `<div class="charge-card"><div><strong>${name}</strong><span class="charge-badge">${o.plus === o.minus ? '중성' : o.plus > o.minus ? '(+) 많음' : '(−) 많음'}</span></div><div class="charge-amount"><span class="positive-text">+ ${o.plus}</span><span class="negative-text">− ${o.minus}</span></div><small>${note ?? chargeName(o)}</small></div>`;
}
function renderText(now) {
  const o = currentObject();
  if (mode === 'spoon') {
    const near = spoonNear(), moved = Math.abs(angle) > .07;
    const c = spoonCounts(shownShift);
    setText('#stage-state', o.charge ? `${o.charge < 0 ? '(−)' : '(+)'}전하를 띤 ${o.name} · 숟가락 ${moved ? '움직임' : '제자리'}` : `대전되지 않은 빨대 · 숟가락 ${moved ? '움직임' : '제자리'}`);
    setText('#note-title', !o.charge ? (near > .6 ? '숟가락이 움직이나요?' : '대전되지 않은 빨대를 가까이 해 보세요') : moved ? `숟가락이 어느 쪽으로 움직였나요?` : near > .3 ? '손잡이 끝을 살펴보세요' : `${josa(o.name, '을', '를')} 손잡이 끝에 가까이 가져가 보세요`);
    setText('#note-text', show ? '숟가락 속 원자핵과 전자 중 무엇이 움직이나요? 손잡이 끝과 머리 쪽의 전하 수를 비교해 보세요.' : '‘전하 보기’를 켜면 숟가락 속 전하의 모습을 볼 수 있어요. 빨대와 장갑으로 각각 해 보고 비교해요.');
    setHTML('#charge-cards', card('손잡이 끝', c.near, '대전체와 가까운 쪽') + card('머리 쪽', c.far, '대전체와 먼 쪽'));
    setText('#discovery', '숟가락 전체의 (+)전하량과 (−)전하량은 그대로예요.');
  } else {
    const c = arrivedCounts(now), spread = leafShown > 6;
    setText('#stage-state', `${SCOPE_OBJECTS[scopeKey].label} · ${RUB_LEVELS[rubLevel].label} · 금속박 ${spread ? '벌어짐' : '오므라짐'}`);
    setText('#note-title', !o.charge ? '대전되지 않은 물체를 가까이 하면?' : spread ? '금속박이 얼마나 벌어졌나요?' : '금속판에 가까이 가져가 보세요');
    setText('#note-text', show ? '금속판과 금속박의 전하 수를 비교해 보세요. 전자는 금속 막대를 따라 어느 쪽으로 이동하나요?' : '문지른 횟수를 바꾸어 금속박이 벌어지는 정도를 비교해 보세요. ‘전하 보기’로 전하의 모습도 살펴보세요.');
    const leaves = { plus: c.left.plus + c.right.plus, minus: c.left.minus + c.right.minus };
    setHTML('#charge-cards', card('금속판', c.plate, '대전체와 가까운 쪽') + card('금속박 두 장', leaves, '대전체와 먼 쪽'));
    setText('#discovery', '검전기 전체의 (+)전하량과 (−)전하량은 그대로예요.');
  }
  $('#charge-cards').hidden = !show; $('.legend').hidden = !show;
}
function renderControls() {
  const o = currentObject();
  document.querySelectorAll('[data-spoon]').forEach(b => b.setAttribute('aria-pressed', b.dataset.spoon === spoonKey));
  document.querySelectorAll('[data-scope]').forEach(b => b.setAttribute('aria-pressed', b.dataset.scope === scopeKey));
  document.querySelectorAll('[data-rub]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.rub === rubLevel));
  const s = SCOPE_OBJECTS[scopeKey];
  $('#rub-note').textContent = rubLevel ? `${josa(s.partner, '과', '와')} 문지른 ${josa(s.label, '은', '는')} ${s.sign < 0 ? '(−)' : '(+)'}전하를 띠어요.` : `${josa(s.label, '을', '를')} 문지르지 않아 전기를 띠지 않아요.`;
  $('#guide').textContent = mode === 'spoon' ? '대전체를 쇠숟가락의 손잡이 끝에 가까이 가져가 보세요.' : '대전체를 검전기의 금속판에 가까이 가져가 보세요.';
  $('#subguide').textContent = mode === 'spoon' ? '물체를 잡고 움직이거나 아래 버튼을 눌러요. 숟가락에는 닿지 않게 해요.' : '물체와 문지른 정도를 고르고, 금속판에 닿지 않게 가까이 가져가요.';
  $('#model-note').textContent = mode === 'spoon'
    ? '숟가락의 원자핵은 제자리에 있고, 금속 안의 전자만 이동해요. 대전체에는 대전된 만큼 남는 전하만 표시했어요. 숟가락은 대전체에 닿기 전에 멈추도록 나타냈어요. 입자의 수와 움직임은 보기 쉽게 나타낸 모형이에요.'
    : '금속판·금속 막대·금속박은 하나로 이어진 금속이에요. 원자핵은 제자리에 있고 전자만 이동해요. 대전체에는 남는 전하만 표시했어요. 입자의 수와 벌어지는 각도는 보기 쉽게 나타낸 모형이에요.';
  $('#approach-button').textContent = `${o.name} 가까이 가져가기`;
}

// 관찰 하나를 마칠 때 숟가락 손잡이 끝에서 빛이 퍼져요.
function celebrate(msg) {
  const tip = { x: PIVOT.x + SPOON_TIP * Math.cos(angle), y: PIVOT.y + SPOON_TIP * Math.sin(angle) };
  burst($('#fx'), tip.x, tip.y, '#ffe27a', 14); toast(msg);
}

/* ---------- 반복 ---------- */
function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
  if (flow && flow.stage !== 'observe') { requestAnimationFrame(frame); return; }
  objectDrag.follow(dt);
  if (motion) {
    const t = clamp((now - motion.start) / motion.duration, 0, 1), f = t * t * (3 - 2 * t);
    place(motion.from.x + (motion.to.x - motion.from.x) * f, motion.from.y + (motion.to.y - motion.from.y) * f);
    if (t === 1) motion = null;
  }
  if (mode === 'spoon') {
    stepSpoon(dt); paintSpoon();
    if (Math.abs(angle) > .07) {
      if (spoonKey === 'straw' && !seen.spoonMinus) { seen.spoonMinus = true; celebrate('🥄 (−)빨대가 숟가락을 끌어당겨요!'); }
      if (spoonKey === 'glove' && !seen.spoonPlus) { seen.spoonPlus = true; celebrate('🧤 (+)장갑도 숟가락을 끌어당겨요!'); }
    }
  } else {
    stepScope(now, dt); paintScope(now);
    if (leafShown > 6 && rubLevel && !seen.levels.has(rubLevel)) { seen.levels.add(rubLevel); burst($('#fx'), LEAF_PIVOT.x, LEAF_PIVOT.y + 50, '#ffe27a', 16); toast(rubLevel === 2 ? '✨ 많이 문지르니 금속박이 더 크게 벌어져요!' : '✨ 금속박이 벌어졌어요!'); }
  }
  paintObject(); renderText(now);
  flow?.update(progress());
  requestAnimationFrame(frame);
}
function resetScene() {
  motion = null; objectDrag.cancel(); angle = 0; shownShift = 0; leafShown = leafAngle(0); scopeState.clear();
  obj = startPosition();
  const now = performance.now();
  if (mode === 'scope') stepScope(now, 1);
  renderControls(); paintObject();
}
function setMode(next) {
  mode = next;
  $('#spoon-tab').setAttribute('aria-selected', next === 'spoon'); $('#scope-tab').setAttribute('aria-selected', next === 'scope');
  // SVG 요소에는 hidden 속성(property)이 없으므로 attribute로 바꿉니다.
  $('#spoon-scene').toggleAttribute('hidden', next !== 'spoon'); $('#scope-scene').toggleAttribute('hidden', next !== 'scope');
  $('#stage-hint').hidden = next !== 'spoon';
  $('#spoon-controls').hidden = next !== 'spoon'; $('#scope-controls').hidden = next !== 'scope';
  resetScene();
}

/* ---------- 조작 ---------- */
// 대전체는 손가락·마우스·방향키를 부드럽게 따라와요(공통 부품 smoothDrag).
const objectDrag = smoothDrag($('#charged-object'), { scene: $('#scene'), get: () => obj, set: place, keyStep: 16, onStart: () => { motion = null; } });
$('#approach-button').onclick = () => animateObject(approachTarget(), 1100);
// 멀리 할 때는 대전체가 있던 쪽(손잡이의 위 또는 아래)에서 가장 먼 모서리로 옮깁니다.
// 손잡이 끝을 가로질러 지나가면 숟가락이 반대로 끌려갈 수 있기 때문이에요.
function withdrawTarget() {
  if (mode === 'scope') return startPosition();
  const { a, b } = spoonDistance(), r = region();
  const side = p => Math.sign((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
  const corners = [{ x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }].filter(c => side(c) === side(obj));
  return (corners.length ? corners : [startPosition()]).sort((p, q) => segmentDistance(q, a, b) - segmentDistance(p, a, b))[0];
}
$('#withdraw-button').onclick = () => animateObject(withdrawTarget(), 900);
$('#spoon-tab').onclick = () => setMode('spoon');
$('#scope-tab').onclick = () => setMode('scope');
$('#reset').onclick = () => setMode(mode);
$('#show-charges').onchange = e => { show = e.target.checked; };
document.querySelectorAll('[data-spoon]').forEach(b => b.onclick = () => { spoonKey = b.dataset.spoon; resetScene(); });
document.querySelectorAll('[data-scope]').forEach(b => b.onclick = () => { scopeKey = b.dataset.scope; resetScene(); });
// 문지른 정도만 바꾸면 대전체는 그 자리에 두고, 금속 속 전자가 새 상태로 이동하는 모습을 보여 줍니다.
document.querySelectorAll('[data-rub]').forEach(b => b.onclick = () => { rubLevel = +b.dataset.rub; renderControls(); });
document.querySelectorAll('[data-term]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-term]').forEach(v => v.classList.toggle('active', v === b));
  const [t, d] = terms[+b.dataset.term]; $('#term-definition').innerHTML = `<strong>${t}</strong> ${d}`;
});

/* ---------- 학습 흐름 ---------- */
const illustration = `<svg viewBox="0 0 520 250" role="img" aria-label="바닥에 놓인 쇠숟가락과 손잡이 끝으로 다가가는 빨대">
  <rect width="520" height="250" rx="12" fill="#121a33"/>
  <ellipse cx="230" cy="190" rx="200" ry="14" fill="#000" opacity=".3"/>
  <g transform="translate(90 170) rotate(0)"><path d="M40 -10 L330 -13 Q348 -13 348 0 Q348 13 330 13 L40 10 Z" fill="url(#p-metal)" stroke="#8c959c"/><ellipse rx="52" ry="34" fill="url(#p-bowl)" stroke="#8c959c"/><circle r="19" fill="#c79a4b" stroke="#7d5a22"/></g>
  <g transform="translate(450 120) rotate(-36.7)"><rect x="0" y="-8" width="200" height="16" rx="8" fill="#f2cf3a" stroke="#c39a14"/></g>
  <path d="M410 120 q14 -30 50 -40" fill="none" stroke="#9aa59a" stroke-dasharray="4 4"/>
  <text x="330" y="222" font-size="15" fill="#aab4d6">쇠숟가락 손잡이 끝</text><text x="455" y="62" font-size="15" fill="#aab4d6">빨대</text>
  <defs><linearGradient id="p-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset="1" stop-color="#9aa3ab"/></linearGradient><radialGradient id="p-bowl" cx=".4" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#99a2aa"/></radialGradient></defs>
</svg>`;
flow = setupPOEFlow({
  predict: {
    title: '전기를 띤 빨대와 장갑을<br>쇠숟가락에 가까이 하면?',
    lead: '바닥에 놓인 쇠숟가락은 전기를 띠지 않아요.<br>털가죽으로 문지른 빨대는 (−)전하, 빨대와 문지른 장갑은 (+)전하를 띠어요.',
    illustration,
    question: '숟가락 손잡이 끝에 빨대와 장갑을 각각 가까이 하면 어떻게 될까요?',
    choices: [
      '빨대와 장갑 모두 숟가락을 끌어당길 것 같아요.',
      '빨대는 끌어당기고, 장갑은 밀어낼 것 같아요.',
      '빨대는 밀어내고, 장갑은 끌어당길 것 같아요.',
      '숟가락은 전기를 띠지 않아서 움직이지 않을 것 같아요.',
      '아직 잘 모르겠어요.',
    ],
    placeholder: '마찰 전기 시간에 배운 내용이나 내가 겪은 일을 떠올려 보세요. 잘 모르겠다면 궁금한 점을 써도 좋아요.',
  },
  observe: {
    title: '쇠숟가락과 검전기에 대전체를 가까이 해 보세요.',
    recordLabel: '숟가락이 움직인 방향, 금속박이 벌어진 정도, 전하 표시의 변화를 적어 보세요.',
    placeholder: '빨대와 장갑을 가까이 했을 때를 비교하고, 문지른 횟수에 따라 금속박이 어떻게 달라졌는지 적어 보세요.',
    // 관찰 기록을 활동마다 나눠 써요(src/poe-flow.js). title은 활동(탭이나 과정)의 이름이에요.
    parts: [
      { title: '쇠숟가락 움직이기', label: '빨대와 장갑을 쇠숟가락에 가까이 했을 때 숟가락이 움직인 방향과 전하 표시의 변화를 적어 보세요.', placeholder: '빨대와 장갑을 가까이 했을 때를 비교하고, 숟가락의 가까운 쪽과 먼 쪽 전하가 어떻게 달라졌는지 적어 보세요.' },
      { title: '검전기 관찰하기', label: '검전기에 물체를 가까이 했을 때 금속박이 벌어진 정도와 전하 표시의 변화를 적어 보세요.', placeholder: '문지른 횟수에 따라 금속박이 벌어진 정도가 어떻게 달라졌는지 적어 보세요.' },
    ],
  },
  explain: {
    question: '전기를 띠지 않은 쇠숟가락이 왜 대전체 쪽으로 끌려왔을까요? 검전기의 금속박이 벌어진 까닭도 함께 설명해 보세요.',
    concepts: [
      ['대전체를 가까이 하기 전', '쇠숟가락과 검전기 같은 금속 물체는 (+)전하량과 (−)전하량이 같아 전기를 띠지 않아요. 금속 안에는 자유롭게 움직일 수 있는 전자가 있어요.'],
      ['대전체를 가까이 하면', '금속 안의 전자가 전기력을 받아 이동해요. (−)대전체는 전자를 밀어내 전자가 먼 쪽으로, (+)대전체는 전자를 끌어당겨 전자가 가까운 쪽으로 이동해요. 원자핵은 이동하지 않아요.'],
      ['전하가 유도돼요', '대전체와 가까운 쪽은 대전체와 <b>다른 종류</b>의 전하, 먼 쪽은 대전체와 <b>같은 종류</b>의 전하가 유도돼요. 이 현상을 <b>정전기 유도</b>라고 해요.'],
      ['쇠숟가락이 끌려와요', '대전체와 가까운 쪽에 다른 종류의 전하가 유도되므로 대전체와 숟가락 사이에 <b>인력</b>이 작용해요. 그래서 (−)빨대와 (+)장갑 모두 숟가락을 끌어당겨요.'],
      ['검전기의 금속박이 벌어져요', '금속판에는 대전체와 다른 종류의 전하, 금속박에는 대전체와 같은 종류의 전하가 유도돼요. 두 금속박은 같은 종류의 전하를 띠므로 <b>척력</b>이 작용해 벌어져요. 대전된 전하의 양이 많을수록 금속박이 더 많이 벌어져요. <b>검전기</b>로 물체의 대전 여부를 알 수 있어요.'],
    ],
    note: '가까운 쪽에 (+)전하만 있는 것은 아니에요. 두 종류의 전하가 모두 있지만, 한 종류의 전하가 상대적으로 많아진 거예요.',
  },
  onStageChange: () => { motion = null; objectDrag.cancel(); },
  onRestart: () => {
    show = false; $('#show-charges').checked = false;
    seen.spoonMinus = false; seen.spoonPlus = false; seen.levels.clear(); seen.viewSpoon = false; seen.viewScope = false;
    spoonKey = 'straw'; scopeKey = 'straw'; rubLevel = 1;
    $('[data-term="0"]').click(); setMode('spoon');
  },
});
setMode('spoon');
requestAnimationFrame(frame);
