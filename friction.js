import './style.css';
import './poe.css';
import './lab.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, reducedMotion } from './src/lab-shell.js';
import { charges, MAX_TRANSFER, chargeLabel, interaction, SPOON_TOOLS, SPOON_A_SIGN } from './src/friction-model.js';
import { closeness, segmentDistance, clamp } from './src/induction-model.js';

// 교과서 236–237쪽, 지도서 540–543쪽(1차시).
// 풍선과 털(그림 Ⅶ-2)로 전자가 이동해 대전되는 과정을, 플라스틱 숟가락과 장갑(해 보기)으로 척력과 인력을 관찰합니다.
// 원자핵은 이동하지 않고 전자만 이동합니다. 중성 물체에 대한 분극과 정전기 유도는 다루지 않습니다.

const spriteUrl = new URL('../../images/balloon-fur.png', document.baseURI).href;
const terms = [
  ['마찰 전기', '두 물체를 마찰하여 생기는 전기예요.'],
  ['대전', '물체가 전기를 띠는 현상이에요.'],
  ['대전체', '전기를 띠고 있는 물체예요.'],
  ['전기력', '전기를 띤 두 물체 사이에 작용하는 힘이에요.'],
  ['척력', '같은 종류의 전하를 띤 물체 사이에 작용하는, 서로 밀어내는 힘이에요.'],
  ['인력', '다른 종류의 전하를 띤 물체 사이에 작용하는, 서로 끌어당기는 힘이에요.'],
];

/* ---------- 풍선과 털 ---------- */
const FUR = { x0: 230, x1: 570, y: 352 };
const START = { x: 600, y: 150 };
const STRANDS = Array.from({ length: 64 }, (_, i) => {
  const x = FUR.x0 + 8 + i * ((FUR.x1 - FUR.x0 - 16) / 63);
  return { x, y: FUR.y - 8 + Math.sin(i * 1.7) * 2, len: 30 + Math.sin(i * 2.3) * 6, lean: Math.sin(i * 0.9) * .18, color: i % 3 ? '#b3824f' : '#d6a46e', bend: { x: 0, y: 0 } };
});
// 풍선 그림: 몸통의 중심은 기준점에서 (0, −28), 아래 끝은 (0, 50)이에요.
const balloonSVG = `<svg x="-88" y="-130" width="176" height="240" viewBox="0 0 710 1024" preserveAspectRatio="none" aria-hidden="true"><image href="${spriteUrl}" width="1536" height="1024"/></svg>`;
const furSites = Array.from({ length: 8 }, (_, i) => ({ x: FUR.x0 + 46 + (i % 4) * 82, y: FUR.y + 12 + Math.floor(i / 4) * 20 }));
const balloonSites = Array.from({ length: 8 }, (_, i) => ({ x: -22 + (i % 2) * 44, y: -70 + Math.floor(i / 2) * 27 }));

/* ---------- 플라스틱 숟가락 ---------- */
const PIVOT = { x: 170, y: 300 }, TIP = 400, HANDLE0 = 80, MAX_TURN = .3, GAP = 30;
const TOOL_START = { x: 690, y: 110 };
const DIR = (() => { const d = Math.hypot(150, -112); return { x: 150 / d, y: -112 / d }; })();

const scene = `
<g id="rub-scene">
  <ellipse cx="400" cy="398" rx="230" ry="14" fill="#000" opacity=".3"/>
  <path d="M${FUR.x0} ${FUR.y + 4} Q${FUR.x0 - 6} ${FUR.y + 46} ${FUR.x0 + 30} ${FUR.y + 48} H${FUR.x1 - 30} Q${FUR.x1 + 6} ${FUR.y + 46} ${FUR.x1} ${FUR.y + 4} Z" fill="#6b4627"/>
  <g id="strands"></g>
  <text x="400" y="424" text-anchor="middle" font-size="13" class="muted">털</text>
  <g id="fur-charges"></g>
  <g id="trail"></g>
  <g id="balloon" class="draggable" role="button" tabindex="0" aria-label="풍선, 끌거나 방향키로 움직여요"><ellipse id="balloon-aura" cx="0" cy="-28" rx="80" ry="92" fill="#4aa8ff" opacity="0" filter="url(#glow-strong)"/>${balloonSVG}<g id="balloon-charges"></g><text x="0" y="96" text-anchor="middle" class="object-name">풍선</text></g>
  <g id="rub-fx"></g>
</g>
<g id="spoon-scene" hidden>
  <ellipse cx="420" cy="330" rx="300" ry="18" fill="#000" opacity=".3"/>
  <g id="spoon-a" transform="translate(${PIVOT.x} ${PIVOT.y})">
    <path d="M48 -10 C70 -12 92 -11 112 -10 L${TIP - 12} -13 Q${TIP + 10} -13 ${TIP + 10} 0 Q${TIP + 10} 13 ${TIP - 12} 13 L112 10 C92 11 70 12 48 10 Z" fill="#f4efe2" stroke="#cfc6b0"/>
    <ellipse rx="62" ry="40" fill="#f8f4ea" stroke="#cfc6b0"/><ellipse cx="-4" rx="48" ry="28" fill="#ece5d3"/>
    <rect x="-26" y="-20" width="52" height="40" rx="6" fill="#ff8fb1" stroke="#d96a8e"/><text y="5" text-anchor="middle" font-size="12" style="fill:#5a1730;font-weight:700">지우개</text>
    <g id="spoon-a-charges"></g>
    <text x="${TIP - 30}" y="38" text-anchor="middle" font-size="13" style="fill:#ffd166;font-weight:700">숟가락 ㉮</text>
  </g>
  <g id="tool" class="draggable" role="button" tabindex="0" aria-label="숟가락 ㉯ 또는 장갑, 끌거나 방향키로 움직여요"><g id="tool-shape"></g><g id="tool-charges"></g><text id="tool-name" class="object-name" text-anchor="middle"></text></g>
  <g id="spoon-arrows"></g><g id="spoon-fx"></g>
</g>`;

const lab = buildLab({
  crumb: '01 마찰 전기',
  title: '두 물체를 마찰하면 어떤 힘이 생길까?',
  intro: '풍선과 털을 문지르고, 마찰한 물체 사이에 작용하는 힘을 관찰해 보세요.',
  tabs: [{ id: 'rub', label: '풍선과 털 문지르기' }, { id: 'spoon', label: '숟가락으로 힘 관찰하기' }],
  toggle: '전하 보기',
  sceneLabel: '풍선과 털, 플라스틱 숟가락과 장갑으로 마찰 전기를 관찰하는 실험 공간',
  scene,
  legend: '<span><b class="positive">+</b> 원자핵의 (+)전하</span><span><b class="negative">−</b> 전자의 (−)전하</span>',
  terms,
  quiz: [
    { question: '두 물체를 마찰할 때 다른 물체로 이동하는 것은?', options: [['electron', '전자'], ['nucleus', '원자핵'], ['both', '둘 다']], answer: 'electron', hint: '‘전하 보기’를 켜고 움직이는 입자를 살펴보세요.', right: '맞아요! 털에서 풍선으로 일부 전자가 이동해요.', wrong: '다시 생각해 볼까요? 원자핵은 다른 물체로 이동하지 않아요.' },
    { question: '같은 종류의 전하를 띤 두 물체 사이에 작용하는 힘은?', options: [['repel', '척력'], ['attract', '인력'], ['none', '힘이 없어요']], answer: 'repel', hint: '숟가락 ㉯를 숟가락 ㉮에 가까이 가져가 보세요.', right: '맞아요! 같은 종류의 전하 사이에는 서로 밀어내는 척력이 작용해요.', wrong: '다시 확인해 볼까요? 같은 장갑으로 문지른 두 숟가락은 어떻게 움직였나요?' },
    { question: '마찰할 때 전자를 잃은 물체는 어떤 전하를 띨까요?', options: [['plus', '(+)전하'], ['minus', '(−)전하'], ['zero', '전기를 띠지 않아요']], answer: 'plus', hint: '털의 전하 수를 비교해 보세요.', right: '맞아요! 전자를 잃은 물체는 (+)전하, 전자를 얻은 물체는 (−)전하를 띠어요.', wrong: '다시 생각해 볼까요? 전자는 (−)전하를 띠어요. 그것을 잃으면 어떻게 될까요?' },
  ],
});

/* ---------- 상태 ---------- */
let mode = 'rub', show = false, lastFrame = 0;
let pos = { ...START }, drag = null, motion = null, rubDistance = 0, transfers = 0, flights = [];
let tool = 'spoon', toolPos = { ...TOOL_START }, angle = 0, rubbedSpoons = false;
const seen = { rubbed: false, lifted: false, repel: false, attract: false };
let flow = null;

const balloonCharge = () => charges(transfers).balloon;
const furCharge = () => charges(transfers).fur;
const net = o => o.plus - o.minus;
const contact = () => pos.y >= 262 && pos.x > FUR.x0 + 20 && pos.x < FUR.x1 - 20;

/* ---------- 그리기 도우미 ---------- */
const mark = (x, y, sign, glow = false) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"${glow ? ' filter="url(#glow)"' : ''}><circle r="${sign > 0 ? 7 : 5}" fill="${sign > 0 ? '#e84444' : '#2f9bff'}"/><path d="M${sign > 0 ? '-3.4 0H3.4M0 -3.4V3.4' : '-2.6 0H2.6'}" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`;
const wobble = (i, t, a = 1.4) => ({ x: Math.sin(t * 3.1 + i * 1.7) * a, y: Math.cos(t * 2.7 + i * 2.3) * a });

function paintStrands(dt, t) {
  const q = net(balloonCharge());
  const base = { x: pos.x, y: pos.y + 50 };
  const g = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 10);
  $('#strands').innerHTML = STRANDS.map((s, i) => {
    let tx = 0, ty = 0;
    const rest = { x: s.x + Math.sin(s.lean) * s.len, y: s.y - Math.cos(s.lean) * s.len };
    if (q && !contact()) {
      // 대전된 풍선이 가까이 있으면 털끝이 풍선 쪽으로 끌려요(인력). 털의 밑부분은 제자리에 있어요.
      const dx = base.x - rest.x, dy = base.y - rest.y, d = Math.hypot(dx, dy);
      const pull = Math.min(1, Math.abs(q) / 4) * Math.max(0, (230 - d) / 230) * 24;
      tx = dx / d * pull; ty = dy / d * pull;
    } else if (contact()) {
      // 문지르는 동안 풍선에 닿은 털이 눌려요.
      const dx = rest.x - pos.x;
      if (Math.abs(dx) < 70) { tx = Math.sign(dx || 1) * (70 - Math.abs(dx)) * .25 + (drag?.vx ?? 0) * .02; ty = 10; }
    }
    s.bend.x += (tx - s.bend.x) * g; s.bend.y += (ty - s.bend.y) * g;
    const tip = { x: rest.x + s.bend.x + Math.sin(t * 2 + i) * .6, y: rest.y + s.bend.y };
    const ctrl = { x: s.x + (tip.x - s.x) * .2, y: s.y - s.len * .55 };
    return `<path d="M${s.x.toFixed(1)} ${s.y.toFixed(1)} Q${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}" stroke="${s.color}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  }).join('');
}
function paintRub(dt, t) {
  $('#balloon').setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`);
  const q = net(balloonCharge());
  $('#balloon-aura').setAttribute('opacity', (Math.min(1, -q / MAX_TRANSFER) * .5).toFixed(2));
  paintStrands(dt, t);
  // 이동 중인 전자: 털에서 풍선의 닿은 곳으로 빛나며 이동해요.
  const now = performance.now();
  flights = flights.filter(f => now - f.start < f.duration);
  let trail = '';
  for (const f of flights) {
    const k = Math.min(1, (now - f.start) / f.duration), e = k * k * (3 - 2 * k);
    const to = { x: pos.x + f.to.x, y: pos.y + f.to.y };
    const x = f.from.x + (to.x - f.from.x) * e, y = f.from.y + (to.y - f.from.y) * e - Math.sin(k * Math.PI) * 26;
    trail += `<path d="M${f.from.x} ${f.from.y} Q${(f.from.x + x) / 2} ${Math.min(f.from.y, y) - 20} ${x.toFixed(1)} ${y.toFixed(1)}" stroke="#5cc8ff" stroke-width="2" opacity="${(1 - k) * .7}" fill="none"/>` + mark(x, y, -1, true);
  }
  $('#trail').innerHTML = trail;
  if (!show) { setHTML('#fur-charges', ''); setHTML('#balloon-charges', ''); return; }
  const fc = furCharge(), bc = balloonCharge();
  const furHTML = furSites.map((p, i) => { const w = wobble(i, t); return mark(p.x - 9 + w.x * .3, p.y + w.y * .3, 1) + (i < fc.minus ? mark(p.x + 9 + w.x, p.y + w.y, -1) : ''); }).join('');
  const inFlight = flights.length;
  const extra = Array.from({ length: Math.max(0, bc.minus - 8 - inFlight) }, (_, k) => ({ x: -36 + (k % 4) * 24, y: 26 + Math.floor(k / 4) * 13 }));
  const bHTML = balloonSites.map((p, i) => { const w = wobble(i + 9, t); return mark(p.x - 8 + w.x * .3, p.y + w.y * .3, 1) + mark(p.x + 9 + w.x, p.y + w.y, -1); }).join('') + extra.map((p, k) => { const w = wobble(k + 20, t); return mark(p.x + w.x, p.y + w.y, -1, true); }).join('');
  $('#fur-charges').innerHTML = furHTML; $('#balloon-charges').innerHTML = bHTML;
}
function transfer() {
  if (transfers >= MAX_TRANSFER) return;
  const site = furSites[transfers % furSites.length];
  transfers++;
  flights.push({ from: { x: site.x + 9, y: site.y }, to: { x: -36 + ((transfers - 1) % 4) * 24, y: 26 + Math.floor((transfers - 1) / 4) * 13 }, start: performance.now(), duration: reducedMotion.matches ? 1 : 600 });
  burst($('#rub-fx'), pos.x, pos.y + 46, '#8fd3ff', 10);
  if (!seen.rubbed) { seen.rubbed = true; toast('⚡ 털에서 풍선으로 전자가 이동했어요!'); }
  if (transfers === MAX_TRANSFER) toast('🎈 충분히 문질렀어요. 이제 풍선을 들어 올려 보세요');
  renderText();
}
function moveBalloon(x, y, auto = false) {
  const old = pos;
  pos = { x: clamp(x, 130, 670), y: clamp(y, 100, 286) };
  // 버튼으로 문지를 때는 한 번에 전자 하나만 이동하도록 거리로 세지 않아요.
  if (!auto && contact() && Math.abs(pos.x - old.x) > Math.abs(pos.y - old.y) * .6) {
    rubDistance += Math.hypot(pos.x - old.x, pos.y - old.y);
    if (rubDistance > 70) { rubDistance = 0; transfer(); }
  }
}

/* ---------- 숟가락 ---------- */
function toolCharge() { return rubbedSpoons ? SPOON_TOOLS[tool].sign : 0; }
function spoonSeg(at = angle) {
  const c = Math.cos(at), s = Math.sin(at);
  return { a: { x: PIVOT.x + HANDLE0 * c, y: PIVOT.y + HANDLE0 * s }, b: { x: PIVOT.x + TIP * c, y: PIVOT.y + TIP * s } };
}
function stepSpoon(dt) {
  const qA = rubbedSpoons ? SPOON_A_SIGN : 0, qT = toolCharge();
  if (!qA || !qT) return;
  const kind = interaction(qA, qT), sign = kind === 'attract' ? 1 : -1;
  const steps = reducedMotion.matches ? 60 : 1, h = reducedMotion.matches ? .02 : dt;
  for (let i = 0; i < steps; i++) {
    const { a, b } = spoonSeg();
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    const t = clamp(((toolPos.x - a.x) * dx + (toolPos.y - a.y) * dy) / len2, 0, 1);
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const fx = (toolPos.x - q.x) * sign, fy = (toolPos.y - q.y) * sign, f = Math.hypot(fx, fy) || 1;
    const near = closeness(segmentDistance(toolPos, a, b), GAP, GAP + 190);
    const torque = ((q.x - PIVOT.x) * fy - (q.y - PIVOT.y) * fx) / f / TIP;
    const strength = near * near * Math.abs(torque);
    if (strength <= .06) break;
    const next = clamp(angle + Math.sign(torque) * (strength - .06) * 1.5 * h, -MAX_TURN, MAX_TURN);
    const seg = spoonSeg(next);
    if (segmentDistance(toolPos, seg.a, seg.b) < GAP) break;
    if (Math.abs(next - angle) > 1e-4) {
      if (kind === 'repel' && !seen.repel && Math.abs(next) > .08) { seen.repel = true; toast('↔ 숟가락 ㉮가 밀려났어요 (척력)'); }
      if (kind === 'attract' && !seen.attract && Math.abs(next) > .08) { seen.attract = true; toast('🤝 숟가락 ㉮가 끌려왔어요 (인력)'); }
    }
    angle = next;
  }
}
function toolShape() {
  const rot = `rotate(${(Math.atan2(DIR.y, DIR.x) * 180 / Math.PI).toFixed(1)})`;
  if (tool === 'spoon') return `<g transform="${rot}"><path d="M0 -9 L230 -12 Q248 -12 248 0 Q248 12 230 12 L0 9 Q-8 0 0 -9Z" fill="#f4efe2" stroke="#cfc6b0"/><ellipse cx="290" rx="52" ry="34" fill="#f8f4ea" stroke="#cfc6b0"/></g>`;
  return `<g transform="${rot}"><path d="M0 -20 Q-4 -34 14 -36 L96 -38 Q108 -38 108 -26 L108 26 Q108 38 96 38 L40 36 Q30 52 14 46 Q4 40 14 30 L14 28 Q-4 30 0 14 Z" fill="#cfeef0" stroke="#8fbcc0" stroke-width="1.5"/><rect x="106" y="-34" width="44" height="68" rx="8" fill="#b7dfe2" stroke="#8fbcc0"/></g>`;
}
function paintSpoon(t) {
  $('#spoon-a').setAttribute('transform', `translate(${PIVOT.x} ${PIVOT.y}) rotate(${(angle * 180 / Math.PI).toFixed(2)})`);
  $('#tool').setAttribute('transform', `translate(${toolPos.x.toFixed(1)} ${toolPos.y.toFixed(1)})`);
  setHTML('#tool-shape', toolShape());
  const label = tool === 'spoon' ? { x: 150, y: -60 } : { x: 150, y: -40 };
  $('#tool-name').setAttribute('x', label.x); $('#tool-name').setAttribute('y', label.y);
  setText('#tool-name', SPOON_TOOLS[tool].label);
  // 대전체에는 문질러 생긴 남는 전하만 나타내요. 숟가락은 문지른 손잡이 부분에 전하가 있어요.
  const handle = show && rubbedSpoons ? [0, 1, 2, 3].map(k => mark(TIP - 20 - k * 22 + wobble(k, t, .8).x, wobble(k, t, .8).y, SPOON_A_SIGN)).join('') : '';
  $('#spoon-a-charges').innerHTML = handle;
  const sign = SPOON_TOOLS[tool].sign;
  $('#tool-charges').innerHTML = show && rubbedSpoons ? [0, 1, 2, 3].map(k => { const d = 16 + k * 22; return mark(DIR.x * d, DIR.y * d + (tool === 'glove' ? (k % 2 ? 12 : -12) : 0), sign); }).join('') : '';
  // 힘의 방향을 나타내는 화살표(전하 보기를 켰을 때).
  let arrows = '';
  if (show && rubbedSpoons) {
    const { b } = spoonSeg(); const dx = toolPos.x - b.x, dy = toolPos.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (d < 260) {
      const s = interaction(SPOON_A_SIGN, sign) === 'attract' ? 1 : -1, ux = dx / d * s, uy = dy / d * s;
      arrows = `<path d="M${b.x} ${b.y} l${(ux * 46).toFixed(1)} ${(uy * 46).toFixed(1)}" stroke="#ffd166" stroke-width="4" marker-end="url(#arrow-head)"/><path d="M${toolPos.x} ${toolPos.y} l${(-ux * 46).toFixed(1)} ${(-uy * 46).toFixed(1)}" stroke="#ffd166" stroke-width="4" marker-end="url(#arrow-head)"/>`;
    }
  }
  $('#spoon-arrows').innerHTML = arrows;
}
function placeTool(x, y) {
  let next = { x: clamp(x, 520, 770), y: clamp(y, 60, 420) };
  const { a, b } = spoonSeg();
  if (segmentDistance(next, a, b) < GAP) {
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    const t = clamp(((next.x - a.x) * dx + (next.y - a.y) * dy) / len2, 0, 1);
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    let nx = next.x - q.x, ny = next.y - q.y, n = Math.hypot(nx, ny);
    if (n < .01) { nx = 0; ny = -1; n = 1; }
    next = { x: q.x + nx / n * GAP, y: q.y + ny / n * GAP };
  }
  toolPos = next;
}

/* ---------- 조작 ---------- */
function point(e) { return new DOMPoint(e.clientX, e.clientY).matrixTransform($('#scene').getScreenCTM().inverse()); }
function draggable(el, getPos, setPos) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); motion = null; const p = point(e), q = getPos(); drag = { el, dx: p.x - q.x, dy: p.y - q.y, vx: 0 }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (drag?.el !== el) return; const p = point(e), q = getPos(); drag.vx = p.x - drag.dx - q.x; setPos(p.x - drag.dx, p.y - drag.dy); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => { if (drag?.el === el) drag = null; });
  el.addEventListener('keydown', e => { const d = { ArrowLeft: [-18, 0], ArrowRight: [18, 0], ArrowUp: [0, -18], ArrowDown: [0, 18] }[e.key]; if (d) { e.preventDefault(); motion = null; const q = getPos(); setPos(q.x + d[0], q.y + d[1]); } });
}
draggable($('#balloon'), () => pos, moveBalloon);
draggable($('#tool'), () => toolPos, placeTool);

function animate(path, duration, done) { motion = { path, start: performance.now(), duration: reducedMotion.matches ? 1 : duration, done }; }
function rubOnce() {
  if (motion || transfers >= MAX_TRANSFER) return;
  const x0 = 360 + (transfers % 3) * 40;
  animate([pos, { x: x0, y: 278 }, { x: x0 + 70, y: 278 }, { x: x0, y: 278 }], 1100, () => { transfer(); renderControls(); });
}
function liftBalloon() { if (!motion) animate([pos, { x: 430, y: 180 }], 900, () => renderControls()); }
function followMotion(now) {
  if (!motion) return;
  const k = Math.min(1, (now - motion.start) / motion.duration), n = motion.path.length - 1;
  const seg = Math.min(n - 1, Math.floor(k * n)), u = k * n - seg, e = u * u * (3 - 2 * u);
  const a = motion.path[seg], b = motion.path[seg + 1];
  moveBalloon(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, true);
  if (k >= 1) { const d = motion.done; motion = null; d?.(); }
}

function renderControls() {
  if (mode === 'rub') {
    $('#controls').innerHTML = '<p>풍선을 잡고 털 위에서 좌우로 문지르거나 아래 버튼을 눌러요. 문지른 뒤 풍선을 털 가까이에서 들어 올려 보세요.</p>';
    $('#actions').innerHTML = `<button id="rub-btn" class="secondary" ${transfers >= MAX_TRANSFER ? 'disabled' : ''}>한 번 문지르기</button><button id="lift-btn" class="primary" ${transfers ? '' : 'disabled'}>풍선 들어 올리기 ↑</button>`;
    $('#rub-btn').onclick = rubOnce; $('#lift-btn').onclick = liftBalloon;
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="가까이 할 물체"><span class="group-label">가까이 할 물체</span>${Object.entries(SPOON_TOOLS).map(([k, o]) => `<button data-tool="${k}" aria-pressed="${k === tool}">${o.label}</button>`).join('')}</div><p>${rubbedSpoons ? '장갑으로 숟가락 ㉮와 ㉯의 손잡이를 문질렀어요.' : '먼저 장갑으로 두 숟가락의 손잡이를 문질러요.'}</p>`;
    $('#actions').innerHTML = `<button id="rub-spoons" class="secondary" ${rubbedSpoons ? 'disabled' : ''}>장갑으로 ㉮와 ㉯ 문지르기</button><button id="approach" class="primary">${SPOON_TOOLS[tool].label} 가까이 가져가기</button><button id="away" class="secondary">멀리 하기</button>`;
    $$('[data-tool]').forEach(b => b.onclick = () => { tool = b.dataset.tool; toolPos = { ...TOOL_START }; angle = 0; renderControls(); });
    $('#rub-spoons').onclick = () => { rubbedSpoons = true; burst($('#spoon-fx'), PIVOT.x + TIP - 40, PIVOT.y, '#8fd3ff', 14); burst($('#spoon-fx'), TOOL_START.x, TOOL_START.y, '#ff9a9a', 14); toast('✨ 두 숟가락과 장갑이 대전되었어요'); renderControls(); };
    $('#approach').onclick = () => { const { b } = spoonSeg(); toolMotion({ x: b.x + 40, y: b.y - 70 }); };
    $('#away').onclick = () => toolMotion({ ...TOOL_START });
  }
  renderText();
}
let toolAnim = null;
function toolMotion(target) { toolAnim = { from: { ...toolPos }, to: target, start: performance.now(), duration: reducedMotion.matches ? 1 : 900 }; }
function followTool(now) {
  if (!toolAnim) return;
  const k = Math.min(1, (now - toolAnim.start) / toolAnim.duration), e = k * k * (3 - 2 * k);
  placeTool(toolAnim.from.x + (toolAnim.to.x - toolAnim.from.x) * e, toolAnim.from.y + (toolAnim.to.y - toolAnim.from.y) * e);
  if (k >= 1) toolAnim = null;
}
function card(name, o) {
  const q = o.plus - o.minus;
  return `<div class="readout-card"><strong>${name}</strong><b><span class="positive-text">+${o.plus}</span> <span class="negative-text">−${o.minus}</span></b><small>${chargeLabel(o)}</small></div>`;
}
function renderText() {
  if (mode === 'rub') {
    setText('#guide', transfers ? '이제 풍선을 털 가까이에서 들어 올려 보세요.' : '풍선을 털 위로 가져와 문질러 보세요.');
    setText('#subguide', transfers ? '털끝이 어떻게 움직이나요? 풍선을 멀리 옮겨 비교해 보세요.' : '풍선을 잡고 아래쪽 털에 대고 좌우로 문질러요.');
    setText('#stage-state', transfers ? `문지른 뒤 · 이동한 전자 ${transfers}개` : '문지르기 전 · 전기를 띠지 않음');
    setText('#note-title', !transfers ? '문지르기 전 모습을 살펴보세요' : contact() ? '계속 문질러 보세요' : '털끝을 살펴보세요');
    setText('#note-text', show ? '문지르기 전후에 두 물체의 전하 수가 어떻게 달라졌나요? 움직이는 입자도 살펴보세요.' : '‘전하 보기’를 켜면 눈에 보이지 않는 전하를 볼 수 있어요.');
    setHTML('#readout', show ? `<div class="readout-grid">${card('털', furCharge())}${card('풍선', balloonCharge())}</div>` : '');
    setText('#model-note', '풍선과 털 속 전하는 제자리 부근에서 흔들리고, 문지를 때 일부 전자가 다른 물체로 이동해요. 입자의 수와 움직임은 보기 쉽게 나타낸 모형이에요.');
    setText('#discovery', '전기를 띠지 않아도 두 종류의 전하는 있어요.');
  } else {
    setText('#guide', rubbedSpoons ? `${SPOON_TOOLS[tool].label}을(를) 숟가락 ㉮의 손잡이 끝에 가까이 가져가 보세요.` : '먼저 장갑으로 두 숟가락을 문질러요.');
    setText('#subguide', '숟가락 ㉮는 지우개를 올려 손잡이 부분이 바닥에 닿지 않아요. 숟가락 ㉯와 장갑을 각각 가까이 해 비교해요.');
    setText('#stage-state', `${rubbedSpoons ? '문지른 뒤' : '문지르기 전'} · ${SPOON_TOOLS[tool].label}`);
    setText('#note-title', '숟가락 ㉮는 어느 쪽으로 움직이나요?');
    setText('#note-text', show ? '노란 화살표는 각 물체가 받는 힘의 방향이에요. 두 물체의 전하 종류를 비교해 보세요.' : '‘전하 보기’를 켜면 두 물체의 전하와 힘의 방향을 볼 수 있어요.');
    setHTML('#readout', `<div class="readout-grid"><div class="readout-card"><strong>숟가락 ㉮</strong><b>${rubbedSpoons ? '(−)' : '중성'}</b><small>${rubbedSpoons ? '장갑과 문지름' : '문지르기 전'}</small></div><div class="readout-card"><strong>${SPOON_TOOLS[tool].label}</strong><b>${rubbedSpoons ? (SPOON_TOOLS[tool].sign > 0 ? '(+)' : '(−)') : '중성'}</b><small>${rubbedSpoons ? (tool === 'glove' ? '숟가락과 문지름' : '장갑과 문지름') : '문지르기 전'}</small></div></div>`);
    setText('#model-note', '대전체에는 문질러 생긴 남는 전하만 나타냈어요. 숟가락 ㉮는 닿기 전에 멈추도록 나타냈어요. 움직임의 크기는 보기 쉽게 나타낸 모형이에요.');
    setText('#discovery', '대전되어도 (+)전하와 (−)전하는 모두 남아 있어요.');
  }
  $('.legend').hidden = !show;
}
function setMode(next) {
  mode = next; lab.selectTab(next); drag = null; motion = null; toolAnim = null;
  $('#rub-scene').toggleAttribute('hidden', next !== 'rub');
  $('#spoon-scene').toggleAttribute('hidden', next !== 'spoon');
  renderControls();
}
$('#tab-rub').onclick = () => setMode('rub');
$('#tab-spoon').onclick = () => setMode('spoon');
$('#reset').onclick = () => { if (mode === 'rub') { pos = { ...START }; transfers = 0; flights = []; rubDistance = 0; } else { rubbedSpoons = false; angle = 0; toolPos = { ...TOOL_START }; } setMode(mode); };
$('#show-detail').onchange = e => { show = e.target.checked; renderText(); };

let liftedTime = 0;
function frame(now) {
  const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now; const t = now / 1000;
  if (!flow || flow.stage === 'observe') {
    if (mode === 'rub') {
      followMotion(now); paintRub(dt, t);
      // 대전된 풍선이 털 가까이(닿지 않은 채) 있으면 털끝이 끌려요.
      if (transfers && !contact() && Math.hypot(pos.x - 400, pos.y + 50 - FUR.y) < 200) { liftedTime += dt; if (liftedTime > .6 && !seen.lifted) { seen.lifted = true; toast('🪶 털끝이 풍선 쪽으로 끌려와요'); } } else liftedTime = 0;
      renderText();
    } else { followTool(now); stepSpoon(dt); paintSpoon(t); }
    flow?.update(checklist([
      ['풍선을 털에 문지르기', seen.rubbed],
      ['문지른 풍선을 털 가까이에서 들어 올리기', seen.lifted],
      ['숟가락 ㉯를 숟가락 ㉮에 가까이 하기', seen.repel],
      ['장갑을 숟가락 ㉮에 가까이 하기', seen.attract],
    ]));
  }
  requestAnimationFrame(frame);
}

flow = setupPOEFlow({
  predict: {
    title: '문지른 풍선을 들어 올리면<br>털은 어떻게 될까요?',
    lead: '바닥에 놓인 털에 풍선을 문지른 뒤,<br>털 가까이에서 풍선을 살짝 들어 올릴 거예요.',
    illustration: `<img src="${spriteUrl}" alt="실험에 사용할 풍선과 털" width="1536" height="1024" style="width:100%;height:245px;object-fit:contain">`,
    question: '어떤 변화가 생길까요?',
    choices: ['털끝이 풍선 쪽으로 움직일 것 같아요.', '털끝이 풍선에서 멀어질 것 같아요.', '털에 변화가 없을 것 같아요.', '아직 잘 모르겠어요.'],
    placeholder: '건조한 겨울철 털옷을 벗을 때 머리카락이 달라붙었던 경험을 떠올려 보세요. 잘 모르겠다면 궁금한 점을 써도 좋아요.',
  },
  observe: {
    title: '풍선과 털을 문지르고, 숟가락으로 힘을 관찰해 보세요.',
    recordLabel: '문지르기 전후와 풍선을 들어 올렸을 때의 차이, 숟가락 ㉯와 장갑을 가까이 했을 때 숟가락 ㉮의 움직임을 적어 보세요.',
    placeholder: '털끝의 움직임과 숟가락 ㉮가 움직인 방향을 적어 보세요. ‘전하 보기’를 켰다면 전하 표시에서 발견한 변화도 적어 보세요.',
  },
  explain: {
    question: '왜 이런 결과가 나왔을까요? 예상과 달랐다면 생각이 어떻게 바뀌었는지도 적어 보세요.',
    concepts: [
      ['문지르기 전', '원자는 (+)전하를 띤 원자핵과 (−)전하를 띤 전자로 이루어져 있어요. 풍선과 털은 각각 (+)전하량과 (−)전하량이 같아 전기를 띠지 않아요.'],
      ['문지르는 동안', '털에서 풍선으로 일부 전자가 이동해요. (+)전하를 띤 원자핵은 다른 물체로 이동하지 않아요. 이렇게 두 물체를 마찰하여 생기는 전기를 <b>마찰 전기</b>라고 해요.'],
      ['문지른 뒤', '전자를 잃은 털은 (+)전하로, 전자를 얻은 풍선은 (−)전하로 <b>대전</b>돼요. 전기를 띠는 물체를 <b>대전체</b>라고 해요.'],
      ['전기력', '전기를 띤 두 물체 사이에 작용하는 힘을 <b>전기력</b>이라고 해요. 같은 종류의 전하를 띤 숟가락 ㉮와 ㉯ 사이에는 서로 밀어내는 <b>척력</b>, 다른 종류의 전하를 띤 숟가락 ㉮와 장갑 사이에는 서로 끌어당기는 <b>인력</b>이 작용해요.'],
    ],
    note: '대전되어도 두 물체에는 (+)전하와 (−)전하가 모두 남아 있어요. 어느 한 종류가 더 많아진 것이에요.',
  },
  onRestart: () => {
    show = false; $('#show-detail').checked = false;
    Object.keys(seen).forEach(k => seen[k] = false);
    pos = { ...START }; transfers = 0; flights = []; rubbedSpoons = false; angle = 0; toolPos = { ...TOOL_START }; tool = 'spoon';
    lab.resetQuiz(); setMode('rub');
  },
});
setMode('rub');
requestAnimationFrame(frame);
