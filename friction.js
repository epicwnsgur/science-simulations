import './style.css';
import './poe.css';
import './lab.css';
import './theme-electric.css';
import './readable.css';
import { setupPOEFlow } from './src/poe-flow.js';
import { createAutoplay } from './src/autoplay.js';
import { $, $$, setText, setHTML, buildLab, checklist, toast, burst, reducedMotion, josa, smoothDrag, instantLessons } from './src/lab-shell.js';
import { charges, MAX_TRANSFER, chargeLabel, interaction, SPOON_TOOLS, SPOON_A_SIGN } from './src/friction-model.js';
import { closeness, segmentDistance, clamp } from './src/induction-model.js';

// 교과서 236–237쪽, 지도서 540–543쪽(1차시).
// 실험 1: 풍선과 털(그림 Ⅶ-2)로 전자가 이동해 대전되는 과정을, 실험 2: 플라스틱 숟가락과 장갑(해 보기)으로 척력과 인력을 관찰합니다.
// 원자핵은 이동하지 않고 전자만 이동합니다. 중성 물체에 대한 분극과 정전기 유도는 다루지 않습니다.
// 어느 물체가 전자를 잃는지는 문지르는 두 물체에 따라 달라요: 털–풍선에서는 털이, 장갑–숟가락에서는 장갑이 전자를 잃어요.

document.body.classList.add('lab-friction');
const spriteUrl = new URL('../../images/balloon-fur.png', document.baseURI).href;
const terms = [
  ['마찰 전기', '두 물체를 서로 문질러서 생기는 전기예요.'],
  ['대전', '물체가 전기를 띠게 되는 것이에요.'],
  ['대전체', '전기를 띠고 있는 물체예요.'],
  ['전기력', '전기를 띤 두 물체가 서로 미는 힘이나 끌어당기는 힘이에요.'],
  ['척력', '같은 종류의 전하를 띤 두 물체가 서로 밀어내는 힘이에요.'],
  ['인력', '다른 종류의 전하를 띤 두 물체가 서로 끌어당기는 힘이에요.'],
];
const glossary = [
  ['전하', '물체가 띠고 있는 전기예요. (+)전하와 (−)전하 두 종류가 있어요.'],
  ['원자핵', '원자의 가운데에 있고 (+)전하를 띠어요. 문질러도 다른 물체로 옮겨 가지 않아요.'],
  ['전자', '원자핵 둘레에 있고 (−)전하를 띠어요. 문지르면 일부가 다른 물체로 옮겨 갈 수 있어요.'],
  ['대전', '전자를 잃거나 얻어서 물체가 전기를 띠게 되는 것이에요.'],
  ['인력 / 척력', '서로 끌어당기는 힘은 인력, 서로 밀어내는 힘은 척력이에요.'],
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
const RUB_GLOVE = { x: 470, y: 120 };
const DIR = (() => { const d = Math.hypot(150, -112); return { x: 150 / d, y: -112 / d }; })();

const scene = `
<g id="rub-scene">
  <ellipse cx="400" cy="398" rx="230" ry="14" fill="#000" opacity=".3"/>
  <path d="M${FUR.x0} ${FUR.y + 4} Q${FUR.x0 - 6} ${FUR.y + 46} ${FUR.x0 + 30} ${FUR.y + 48} H${FUR.x1 - 30} Q${FUR.x1 + 6} ${FUR.y + 46} ${FUR.x1} ${FUR.y + 4} Z" fill="#6b4627"/>
  <g id="strands"></g>
  <text id="fur-name" x="400" y="426" text-anchor="middle" class="object-name">털</text>
  <g id="fur-charges"></g>
  <g id="trail"></g>
  <g id="balloon" class="draggable" role="button" tabindex="0" aria-label="풍선, 끌거나 방향키로 움직여요"><ellipse id="balloon-aura" cx="0" cy="-28" rx="80" ry="92" fill="#4aa8ff" opacity="0" filter="url(#glow-strong)"/>${balloonSVG}<g id="balloon-charges"></g><text id="balloon-name" x="0" y="96" text-anchor="middle" class="object-name">풍선</text></g>
  <g id="rub-fx"></g>
</g>
<g id="spoon-scene" hidden>
  <ellipse cx="420" cy="330" rx="300" ry="18" fill="#000" opacity=".3"/>
  <g id="spoon-a" transform="translate(${PIVOT.x} ${PIVOT.y})">
    <path d="M48 -10 C70 -12 92 -11 112 -10 L${TIP - 12} -13 Q${TIP + 10} -13 ${TIP + 10} 0 Q${TIP + 10} 13 ${TIP - 12} 13 L112 10 C92 11 70 12 48 10 Z" fill="#f4efe2" stroke="#cfc6b0"/>
    <ellipse rx="62" ry="40" fill="#f8f4ea" stroke="#cfc6b0"/><ellipse cx="-4" rx="48" ry="28" fill="#ece5d3"/>
    <rect x="-26" y="-20" width="52" height="40" rx="6" fill="#ff8fb1" stroke="#d96a8e"/><text y="5" text-anchor="middle" font-size="12" style="fill:#5a1730;font-weight:700">지우개</text>
    <g id="spoon-a-charges"></g>
    <text id="spoon-a-name" x="${TIP - 40}" y="40" text-anchor="middle" font-size="15" style="fill:#ffd166;font-weight:700">숟가락 ㉮</text>
  </g>
  <g id="tool" class="draggable" role="button" tabindex="0" aria-label="숟가락 ㉯ 또는 장갑, 끌거나 방향키로 움직여요"><g id="tool-shape"></g><g id="tool-charges"></g><text id="tool-name" class="object-name" text-anchor="middle"></text></g>
  <g id="rub-glove" opacity="0"></g>
  <g id="spoon-trail"></g>
  <g id="spoon-arrows"></g><g id="spoon-fx"></g>
</g>`;

const lab = buildLab({
  crumb: '01 마찰 전기',
  title: '두 물체를 문지르면 어떤 힘이 생길까?',
  intro: '',
  tabs: [{ id: 'rub', label: '풍선과 털' }, { id: 'spoon', label: '숟가락과 장갑' }],
  toggle: '전하 보기',
  sceneLabel: '풍선과 털, 플라스틱 숟가락과 장갑으로 마찰 전기를 관찰하는 실험 공간',
  scene,
  legend: '<span><b class="positive">+</b> 원자핵의 (+)전하</span><span><b class="negative">−</b> 전자의 (−)전하</span>',
  terms,
});
// 실험은 위쪽 ‘실험 1 / 실험 2’로 고르므로 실험 안의 탭 대신 지금 실험 이름을 보여 줘요.
$('.lab-toolbar .tabs').insertAdjacentHTML('afterend', '<p class="lab-now" id="lab-now"></p>');
// 조작 버튼과 자동 재생은 실험 화면 바로 위에 모아 둡니다.
$('#controls').insertAdjacentHTML('afterend', '<div id="autoplay" class="autoplay"></div>');
$('#autoplay').after($('#actions'));

/* ---------- 상태 ---------- */
let mode = 'rub', show = false, lastFrame = 0;
let pos = { ...START }, motion = null, rubDistance = 0, transfers = 0, flights = [];
let tool = 'spoon', toolPos = { ...TOOL_START }, angle = 0, rubbedSpoons = false, spoonFlights = [];
// viewRub·viewSpoon: ‘전하 보기’를 켜고 문지른 뒤의 전하를 직접 본 적이 있는지(꼭 봐야 다음으로 넘어가요).
const seen = { rubbed: false, lifted: false, repel: false, attract: false, viewRub: false, viewSpoon: false };
let flow = null;

const balloonCharge = () => charges(transfers).balloon;
const furCharge = () => charges(transfers).fur;
const net = o => o.plus - o.minus;
const contact = () => pos.y >= 262 && pos.x > FUR.x0 + 20 && pos.x < FUR.x1 - 20;
const farAway = () => Math.hypot(pos.x - START.x, pos.y - START.y) < 8;
const toolHome = () => Math.hypot(toolPos.x - TOOL_START.x, toolPos.y - TOOL_START.y) < 8;

/* ---------- 그리기 도우미 ---------- */
const mark = (x, y, sign, glow = false) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"${glow ? ' filter="url(#glow)"' : ''}><circle r="${sign > 0 ? 7 : 5}" fill="${sign > 0 ? '#e84444' : '#2f9bff'}"/><path d="M${sign > 0 ? '-3.4 0H3.4M0 -3.4V3.4' : '-2.6 0H2.6'}" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`;
const wobble = (i, t, a = 1.4) => ({ x: Math.sin(t * 3.1 + i * 1.7) * a, y: Math.cos(t * 2.7 + i * 2.3) * a });
const ease = k => k * k * (3 - 2 * k);

// 털 가닥은 한 번만 만들고 매 프레임 모양(d)만 바꿔요. 매번 새로 그리는 것보다 훨씬 부드럽게 움직여요.
const strandEls = STRANDS.map(st => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  for (const [k, v] of [['stroke', st.color], ['stroke-width', 3], ['stroke-linecap', 'round'], ['fill', 'none']]) el.setAttribute(k, v);
  $('#strands').append(el);
  return el;
});
function paintStrands(dt, t) {
  const q = net(balloonCharge());
  const base = { x: pos.x, y: pos.y + 50 };
  const g = instantLessons.matches ? 1 : 1 - Math.exp(-dt * 10);
  STRANDS.forEach((s, i) => {
    let tx = 0, ty = 0;
    const rest = { x: s.x + Math.sin(s.lean) * s.len, y: s.y - Math.cos(s.lean) * s.len };
    if (q && !contact()) {
      // (−)로 대전된 풍선과 (+)로 대전된 털 사이의 인력: 털끝이 풍선 쪽으로 끌려요. 털의 밑부분은 제자리에 있어요.
      const dx = base.x - rest.x, dy = base.y - rest.y, d = Math.hypot(dx, dy);
      const pull = Math.min(1, Math.abs(q) / 4) * Math.max(0, (230 - d) / 230) * 24;
      tx = dx / d * pull; ty = dy / d * pull;
    } else if (contact()) {
      // 문지르는 동안 풍선에 닿은 털이 눌려요.
      const dx = rest.x - pos.x;
      if (Math.abs(dx) < 70) { tx = Math.sign(dx || 1) * (70 - Math.abs(dx)) * .25 + balloonDrag.delta.x * 2.5; ty = 10; }
    }
    s.bend.x += (tx - s.bend.x) * g; s.bend.y += (ty - s.bend.y) * g;
    const tip = { x: rest.x + s.bend.x + Math.sin(t * 2 + i) * .6, y: rest.y + s.bend.y };
    const ctrl = { x: s.x + (tip.x - s.x) * .2, y: s.y - s.len * .55 };
    strandEls[i].setAttribute('d', `M${s.x.toFixed(1)} ${s.y.toFixed(1)} Q${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`);
  });
}
// 이동 중인 전자: 출발한 곳에서 도착할 곳으로 빛나며 날아가요. 지나온 길은 옅은 선으로 남겨 방향을 알 수 있게 해요.
function flightHTML(list, now, toOf) {
  let out = '';
  for (const f of list) {
    const k = clamp((now - f.start) / f.duration, 0, 1), e = ease(k), to = toOf(f);
    const x = f.from.x + (to.x - f.from.x) * e, y = f.from.y + (to.y - f.from.y) * e - Math.sin(k * Math.PI) * 26;
    out += `<path d="M${f.from.x} ${f.from.y} Q${(f.from.x + x) / 2} ${Math.min(f.from.y, y) - 20} ${x.toFixed(1)} ${y.toFixed(1)}" stroke="#5cc8ff" stroke-width="2.5" stroke-dasharray="5 5" opacity="${(1 - k * .6) * .9}" fill="none"/>` + mark(x, y, -1, true);
  }
  return out;
}
function paintRub(dt, t) {
  $('#balloon').setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`);
  const q = net(balloonCharge());
  $('#balloon-aura').setAttribute('opacity', (Math.min(1, -q / MAX_TRANSFER) * .5).toFixed(2));
  paintStrands(dt, t);
  const now = clock();
  flights = flights.filter(f => now - f.start < f.duration);
  $('#trail').innerHTML = show ? flightHTML(flights, now, f => ({ x: pos.x + f.to.x, y: pos.y + f.to.y })) : '';
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
  const site = furSites[furCharge().minus - 1];
  transfers++;
  flights.push({ from: { x: site.x + 9, y: site.y }, to: { x: -36 + ((transfers - 1) % 4) * 24, y: 26 + Math.floor((transfers - 1) / 4) * 13 }, start: clock(), duration: instantLessons.matches ? 1 : 900 });
  burst($('#rub-fx'), pos.x, pos.y + 46, '#8fd3ff', 10);
  if (!seen.rubbed) { seen.rubbed = true; toast('⚡ 털의 전자 일부가 풍선으로 옮겨 갔어요!'); }
  if (transfers === MAX_TRANSFER) toast('🎈 충분히 문질렀어요. 이제 풍선을 들어 올려 보세요');
  renderControls();
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
  const steps = instantLessons.matches ? 60 : 1, h = instantLessons.matches ? .02 : dt;
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
const GLOVE_PATH = 'M0 -20 Q-4 -34 14 -36 L96 -38 Q108 -38 108 -26 L108 26 Q108 38 96 38 L40 36 Q30 52 14 46 Q4 40 14 30 L14 28 Q-4 30 0 14 Z';
function toolShape() {
  const rot = `rotate(${(Math.atan2(DIR.y, DIR.x) * 180 / Math.PI).toFixed(1)})`;
  if (tool === 'spoon') return `<g transform="${rot}"><path d="M0 -9 L230 -12 Q248 -12 248 0 Q248 12 230 12 L0 9 Q-8 0 0 -9Z" fill="#f4efe2" stroke="#cfc6b0"/><ellipse cx="290" rx="52" ry="34" fill="#f8f4ea" stroke="#cfc6b0"/></g>`;
  return `<g transform="${rot}"><path d="${GLOVE_PATH}" fill="#cfeef0" stroke="#8fbcc0" stroke-width="1.5"/><rect x="106" y="-34" width="44" height="68" rx="8" fill="#b7dfe2" stroke="#8fbcc0"/></g>`;
}
const handleSite = k => ({ x: PIVOT.x + (TIP - 20 - k * 22) * Math.cos(angle), y: PIVOT.y + (TIP - 20 - k * 22) * Math.sin(angle) });
const toolSite = k => ({ x: toolPos.x + DIR.x * (16 + k * 22), y: toolPos.y + DIR.y * (16 + k * 22) });
function paintSpoon(t) {
  const now = clock();
  $('#spoon-a').setAttribute('transform', `translate(${PIVOT.x} ${PIVOT.y}) rotate(${(angle * 180 / Math.PI).toFixed(2)})`);
  $('#tool').setAttribute('transform', `translate(${toolPos.x.toFixed(1)} ${toolPos.y.toFixed(1)})`);
  setHTML('#tool-shape', toolShape());
  const label = tool === 'spoon' ? { x: 150, y: -60 } : { x: 150, y: -40 };
  $('#tool-name').setAttribute('x', label.x); $('#tool-name').setAttribute('y', label.y);
  setText('#tool-name', SPOON_TOOLS[tool].label);
  // 문지르는 장갑: 문지를 때 잠깐 나타나 전자가 장갑에서 숟가락으로 옮겨 가는 모습을 보여 줘요.
  spoonFlights = spoonFlights.filter(f => now - f.start < f.duration);
  $('#rub-glove').setAttribute('opacity', spoonFlights.length ? '1' : '0');
  $('#spoon-trail').innerHTML = show ? flightHTML(spoonFlights, now, f => f.to()) : '';
  // 대전체에는 문질러 생긴 남는 전하만 나타내요. 아직 날아가는 중인 전자는 빼고 그려요.
  const landed = k => !spoonFlights.some(f => f.k === k);
  const handle = show && rubbedSpoons ? [0, 1, 2, 3].filter(k => landed(`a${k}`)).map(k => mark(TIP - 20 - k * 22 + wobble(k, t, .8).x, wobble(k, t, .8).y, SPOON_A_SIGN)).join('') : '';
  $('#spoon-a-charges').innerHTML = handle;
  const sign = SPOON_TOOLS[tool].sign;
  $('#tool-charges').innerHTML = show && rubbedSpoons ? [0, 1, 2, 3].filter(k => tool === 'glove' || landed(`b${k}`)).map(k => { const d = 16 + k * 22; return mark(DIR.x * d, DIR.y * d + (tool === 'glove' ? (k % 2 ? 12 : -12) : 0), sign); }).join('') : '';
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
// 장갑으로 두 숟가락을 문지르면 장갑의 전자 일부가 숟가락 ㉮와 ㉯로 옮겨 가요. 그래서 숟가락은 (−), 장갑은 (+)를 띠어요.
function rubSpoons() {
  if (rubbedSpoons) return;
  rubbedSpoons = true;
  const now = clock(), duration = instantLessons.matches ? 1 : 1100;
  $('#rub-glove').innerHTML = `<g transform="translate(${RUB_GLOVE.x} ${RUB_GLOVE.y}) scale(.8)"><path d="${GLOVE_PATH}" fill="#cfeef0" stroke="#8fbcc0" stroke-width="1.5"/></g>`;
  spoonFlights = [0, 1, 2, 3].map(k => ({ k: `a${k}`, from: { x: RUB_GLOVE.x + 30, y: RUB_GLOVE.y + 10 }, to: () => handleSite(k), start: now + k * 160, duration }));
  if (tool === 'spoon') spoonFlights.push(...[0, 1, 2, 3].map(k => ({ k: `b${k}`, from: { x: RUB_GLOVE.x + 60, y: RUB_GLOVE.y + 10 }, to: () => toolSite(k), start: now + (k + 2) * 160, duration })));
  burst($('#spoon-fx'), PIVOT.x + TIP - 40, PIVOT.y, '#8fd3ff', 14); burst($('#spoon-fx'), TOOL_START.x, TOOL_START.y, '#8fd3ff', 14);
  toast('✨ 장갑의 전자 일부가 두 숟가락으로 옮겨 갔어요');
  renderControls();
}
function approachTool() {
  if (!rubbedSpoons) toast('아직 문지르지 않아 전기를 띠지 않아요. 가까이 해도 힘이 생기지 않아요');
  const { b } = spoonSeg(); toolMotion({ x: b.x + 40, y: b.y - 70 });
}
function chooseTool(next) {
  if (tool === next) return;
  tool = next; toolPos = { ...TOOL_START }; angle = 0; toolAnim = null;
  toast(`가까이 할 물체를 바꿨어요: ${SPOON_TOOLS[next].label}`);
  renderControls();
}

/* ---------- 조작 ---------- */
// 풍선과 숟가락 ㉯(장갑)는 손가락·마우스를 부드럽게 따라와요(공통 부품 smoothDrag).
const dragOptions = { scene: $('#scene'), canStart: () => !player.running, onEnd: () => renderControls() };
const balloonDrag = smoothDrag($('#balloon'), { ...dragOptions, get: () => pos, set: (x, y) => moveBalloon(x, y), onStart: () => { motion = null; } });
const toolDrag = smoothDrag($('#tool'), { ...dragOptions, get: () => toolPos, set: placeTool, onStart: () => { toolAnim = null; } });
function followDrag(dt) { balloonDrag.follow(dt); toolDrag.follow(dt); }

function animate(path, duration, done) { motion = { path, start: clock(), duration: instantLessons.matches ? 1 : duration, done }; }
function rubOnce() {
  if (motion || transfers >= MAX_TRANSFER) return;
  const x0 = 360 + (transfers % 3) * 40;
  animate([pos, { x: x0, y: 278 }, { x: x0 + 70, y: 278 }, { x: x0, y: 278 }], 1100, () => transfer());
}
function liftBalloon() { if (!motion) animate([pos, { x: 430, y: 180 }], 900, () => renderControls()); }
function balloonAway() { if (!motion) animate([pos, { ...START }], 900, () => renderControls()); }
function followMotion(now) {
  if (!motion) return;
  // 클릭 직후 프레임의 시각이 시작 시각보다 이를 수 있어 0~1로 제한해요.
  const k = clamp((now - motion.start) / motion.duration, 0, 1), n = motion.path.length - 1;
  const seg = Math.min(n - 1, Math.floor(k * n)), u = k * n - seg, e = ease(u);
  const a = motion.path[seg], b = motion.path[seg + 1];
  moveBalloon(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, true);
  if (k >= 1) { const d = motion.done; motion = null; d?.(); }
}
function resetExperiment() {
  stopAutoplay();
  if (mode === 'rub') { pos = { ...START }; transfers = 0; flights = []; rubDistance = 0; motion = null; }
  else { rubbedSpoons = false; angle = 0; toolPos = { ...TOOL_START }; toolAnim = null; spoonFlights = []; }
  renderControls();
}

// 조작 버튼은 실험 화면 바로 위에 크게 두고, 지금 할 수 없는 조작은 꺼 둡니다.
function renderControls() {
  const busy = player.running;
  if (mode === 'rub') {
    $('#controls').innerHTML = `<p class="material-now">실험 재료: <b>🎈 풍선</b>과 <b>털</b> · 풍선을 직접 끌어서 털 위에서 좌우로 문질러도 돼요.</p>`;
    $('#actions').innerHTML = `<button id="rub-btn" class="primary big" ${busy || transfers >= MAX_TRANSFER ? 'disabled' : ''}>① 털에 문지르기</button><button id="lift-btn" class="primary big" ${busy || !transfers ? 'disabled' : ''}>② 털 가까이에서 들어 올리기 ↑</button><button id="away-btn" class="secondary big" ${busy || farAway() ? 'disabled' : ''}>③ 멀리 하기</button><button id="retry-btn" class="secondary big" ${busy ? 'disabled' : ''}>↻ 다시 실험하기</button>`;
    $('#rub-btn').onclick = rubOnce; $('#lift-btn').onclick = liftBalloon; $('#away-btn').onclick = balloonAway;
  } else {
    $('#controls').innerHTML = `<div role="group" aria-label="숟가락 ㉮에 가까이 할 물체" class="material-picker"><span class="group-label">가까이 할 물체 고르기</span>${Object.entries(SPOON_TOOLS).map(([k, o]) => `<button data-tool="${k}" aria-pressed="${k === tool}" ${busy ? 'disabled' : ''}><span class="material-icon">${k === 'spoon' ? '🥄' : '🧤'}</span>${o.label}${k === tool ? '<small><span aria-hidden="true">✔</span><span class="picked-word"> 선택됨</span></small>' : ''}</button>`).join('')}</div><p class="material-now">${rubbedSpoons ? '장갑으로 숟가락 ㉮와 ㉯의 손잡이를 문질렀어요.' : '먼저 장갑으로 두 숟가락의 손잡이를 문질러요.'}</p>`;
    $('#actions').innerHTML = `<button id="rub-spoons" class="primary big" ${busy || rubbedSpoons ? 'disabled' : ''}>① 장갑으로 ㉮와 ㉯ 문지르기</button><button id="approach" class="primary big" ${busy ? 'disabled' : ''}>② ${SPOON_TOOLS[tool].label} 가까이 가져가기</button><button id="away" class="secondary big" ${busy || toolHome() ? 'disabled' : ''}>③ 멀리 하기</button><button id="retry-btn" class="secondary big" ${busy ? 'disabled' : ''}>↻ 다시 실험하기</button>`;
    $$('[data-tool]').forEach(b => b.onclick = () => chooseTool(b.dataset.tool));
    $('#rub-spoons').onclick = rubSpoons;
    $('#approach').onclick = approachTool;
    $('#away').onclick = () => toolMotion({ ...TOOL_START });
  }
  $('#retry-btn').onclick = resetExperiment;
  renderText();
}
let toolAnim = null;
function toolMotion(target) { toolAnim = { from: { ...toolPos }, to: target, start: clock(), duration: instantLessons.matches ? 1 : 900 }; }
function followTool(now) {
  if (!toolAnim) return;
  const k = clamp((now - toolAnim.start) / toolAnim.duration, 0, 1), e = ease(k);
  placeTool(toolAnim.from.x + (toolAnim.to.x - toolAnim.from.x) * e, toolAnim.from.y + (toolAnim.to.y - toolAnim.from.y) * e);
  if (k >= 1) { toolAnim = null; renderControls(); }
}
function card(name, o) {
  return `<div class="readout-card"><strong>${name}</strong><b><span class="positive-text">+${o.plus}</span> <span class="negative-text">−${o.minus}</span></b><small>${chargeLabel(o)}</small></div>`;
}
function renderText() {
  setText('#lab-now', mode === 'rub' ? '실험 1. 풍선과 털' : '실험 2. 숟가락과 장갑');
  if (mode === 'rub') {
    setText('#guide', transfers ? '이제 풍선을 털 가까이에서 들어 올려 보세요.' : '풍선을 털에 문질러 보세요.');
    setText('#subguide', transfers ? '털끝이 어느 쪽으로 움직이나요? 풍선을 멀리 했을 때와 비교해 보세요.' : '버튼을 누르거나, 풍선을 끌어서 털 위에서 좌우로 문질러요.');
    setText('#stage-state', transfers ? `문지른 뒤 · 옮겨 간 전자 ${transfers}개` : '문지르기 전 · 두 물체 모두 전기를 띠지 않음');
    setText('#note-title', !transfers ? '문지르기 전 모습을 살펴보세요' : contact() ? '계속 문질러 보세요' : '털끝을 살펴보세요');
    setText('#note-text', show ? '문지르기 전과 뒤에 (+)와 (−)의 개수가 어떻게 달라졌나요? 날아가는 파란 입자(전자)도 살펴보세요.' : '‘전하 보기’를 켜면 눈에 보이지 않는 전하를 볼 수 있어요.');
    setHTML('#readout', show ? `<div class="readout-grid">${card('털', furCharge())}${card('풍선', balloonCharge())}</div>` : '');
    setText('#model-note', '전하 입자의 수와 움직임은 보기 쉽게 나타낸 모형이에요. 실제로는 아주 많은 전자 중 일부가 옮겨 가요. 원자핵((+))은 옮겨 가지 않아요.');
    setText('#discovery', '전기를 띠지 않을 때도 (+)전하와 (−)전하는 모두 있어요. 양이 같을 뿐이에요.');
  } else {
    setText('#guide', rubbedSpoons ? `${josa(SPOON_TOOLS[tool].label, '을', '를')} 숟가락 ㉮의 손잡이 끝에 가까이 가져가 보세요.` : '먼저 장갑으로 두 숟가락을 문질러요.');
    setText('#subguide', '숟가락 ㉮는 지우개 위에 올려 두어 잘 돌아가요. 숟가락 ㉯와 장갑을 하나씩 가까이 해서 비교해요.');
    setText('#stage-state', `${rubbedSpoons ? '문지른 뒤' : '문지르기 전'} · 가까이 할 물체: ${SPOON_TOOLS[tool].label}`);
    setText('#note-title', '숟가락 ㉮는 어느 쪽으로 움직이나요?');
    setText('#note-text', show ? '노란 화살표는 각 물체가 받는 힘의 방향이에요. 두 물체가 띤 전하의 종류를 비교해 보세요.' : '‘전하 보기’를 켜면 두 물체의 전하와 힘의 방향을 볼 수 있어요.');
    setHTML('#readout', `<div class="readout-grid"><div class="readout-card"><strong>숟가락 ㉮</strong><b>${rubbedSpoons ? '(−)' : '중성'}</b><small>${rubbedSpoons ? '장갑과 문지름' : '문지르기 전'}</small></div><div class="readout-card"><strong>${SPOON_TOOLS[tool].label}</strong><b>${rubbedSpoons ? (SPOON_TOOLS[tool].sign > 0 ? '(+)' : '(−)') : '중성'}</b><small>${rubbedSpoons ? (tool === 'glove' ? '숟가락과 문지름' : '장갑과 문지름') : '문지르기 전'}</small></div></div>`);
    setText('#model-note', '문질러서 남게 된 전하만 나타냈어요. 숟가락 ㉮는 닿기 전에 멈추도록 했어요. 움직임의 크기는 보기 쉽게 나타낸 모형이에요.');
    setText('#discovery', '대전되어도 (+)전하와 (−)전하는 모두 남아 있어요. 어느 한쪽이 더 많아진 것이에요.');
  }
  $('.legend').hidden = !show;
}
function setMode(next) {
  mode = next; lab.selectTab(next); balloonDrag.cancel(); toolDrag.cancel(); motion = null; toolAnim = null; stopAutoplay();
  $('#rub-scene').toggleAttribute('hidden', next !== 'rub');
  $('#spoon-scene').toggleAttribute('hidden', next !== 'spoon');
  renderControls();
}
$('#reset').onclick = resetExperiment;
$('#show-detail').onchange = e => { show = e.target.checked; renderText(); };

/* ---------- 자동 재생 ----------
   핵심 과정을 한 단계씩 천천히 보여 줘요(공통 부품 src/autoplay.js). 애니메이션은 모두 player.clock()을 따르므로
   빠르기(보통·천천히)를 바꾸거나 일시정지하면 움직임과 전자의 이동이 바로 느려지거나 그 자리에서 멈춰요. */
const PLAYS = {
  rub: [
    ['문지르기 전', '털과 풍선은 (+)전하와 (−)전하의 양이 같아서 전기를 띠지 않아요.', async ({ wait }) => { resetBalloon(); await wait(3200); }],
    ['문지르기', '풍선을 털에 문질러요. 털의 전자 일부가 풍선으로 옮겨 가요. 원자핵은 옮겨 가지 않아요.', async ({ wait, idle }) => { for (let i = 0; i < 4; i++) { rubOnce(); await idle(); await wait(600); } }],
    ['문지른 뒤', '전자를 잃은 털은 (+)전하를, 전자를 얻은 풍선은 (−)전하를 띠어요.', async ({ wait }) => { await wait(3600); }],
    ['들어 올리기', '풍선을 털 가까이에서 들어 올려요. (−)풍선과 (+)털이 서로 끌어당겨(인력) 털끝이 풍선 쪽으로 움직여요.', async ({ wait, idle }) => { liftBalloon(); await idle(); await wait(3600); }],
    ['멀리 하기', '풍선을 멀리 하면 끌어당기는 힘이 약해져 털끝이 제자리로 돌아가요.', async ({ wait, idle }) => { balloonAway(); await idle(); await wait(2600); }],
  ],
  spoon: [
    ['문지르기 전', '숟가락과 장갑은 아직 전기를 띠지 않아요. 가까이 해도 힘이 생기지 않아요.', async ({ wait, idle }) => { resetSpoons(); chooseTool('spoon'); await wait(1200); approachTool(); await idle(); await wait(1800); toolMotion({ ...TOOL_START }); await idle(); }],
    ['장갑으로 문지르기', '장갑의 전자 일부가 두 숟가락으로 옮겨 가요. 숟가락 ㉮와 ㉯는 (−)전하를, 장갑은 (+)전하를 띠어요.', async ({ wait }) => { rubSpoons(); await wait(2600); }],
    ['숟가락 ㉯ 가까이', '(−)숟가락 ㉯를 (−)숟가락 ㉮에 가까이 해요. 같은 종류의 전하라서 서로 밀어내요(척력).', async ({ wait, idle }) => { approachTool(); await idle(); await wait(3600); }],
    ['멀리 하기', '숟가락 ㉯를 멀리 해요.', async ({ wait, idle }) => { toolMotion({ ...TOOL_START }); await idle(); await wait(1000); }],
    ['장갑 가까이', '(+)장갑을 (−)숟가락 ㉮에 가까이 해요. 다른 종류의 전하라서 서로 끌어당겨요(인력).', async ({ wait, idle }) => { chooseTool('glove'); await wait(800); approachTool(); await idle(); await wait(3600); }],
  ],
};
function resetBalloon() { pos = { ...START }; balloonDrag.cancel(); transfers = 0; flights = []; rubDistance = 0; motion = null; }
function resetSpoons() { rubbedSpoons = false; angle = 0; toolPos = { ...TOOL_START }; toolDrag.cancel(); toolAnim = null; spoonFlights = []; }
const player = createAutoplay({
  mount: $('#autoplay'), plays: PLAYS, getMode: () => mode, reducedMotion: instantLessons,
  isIdle: () => !motion && !toolAnim,
  onChange: running => { if (running) { show = true; $('#show-detail').checked = true; } renderControls(); },
});
const clock = () => player.clock();
const stopAutoplay = () => player.stop();

let liftedTime = 0;
function frame() {
  // 프레임 사이 시간도 자동 재생 시계로 재요(일시정지하면 0, 천천히면 짧게).
  const time = clock(), dt = Math.min(.05, Math.max(0, (time - (lastFrame || time)) / 1000)); lastFrame = time; const t = time / 1000;
  if (!flow || flow.stage === 'observe') {
    followDrag(dt);
    if (mode === 'rub') {
      followMotion(time);
      paintRub(dt, t);
      // 대전된 풍선이 털 가까이(닿지 않은 채) 있으면 털끝이 끌려요.
      if (transfers && !contact() && Math.hypot(pos.x - 400, pos.y + 50 - FUR.y) < 200) { liftedTime += dt; if (liftedTime > .6 && !seen.lifted) { seen.lifted = true; toast('🪶 털끝이 풍선 쪽으로 끌려와요'); } } else liftedTime = 0;
      renderText();
    } else { followTool(time); stepSpoon(dt); paintSpoon(t); }
    if (show && mode === 'rub' && transfers > 0) seen.viewRub = true;
    if (show && mode === 'spoon' && rubbedSpoons) seen.viewSpoon = true;
    flow?.update(checklist(mode === 'rub' ? [
      ['풍선을 털에 문지르기', seen.rubbed, '‘① 털에 문지르기’를 누르거나 풍선을 끌어 털 위에서 좌우로'],
      ['‘전하 보기’를 켜고 털과 풍선의 전하 비교하기', seen.viewRub, '위쪽 ‘전하 보기’를 켜고, 털과 풍선의 (+)·(−) 개수가 어떻게 달라졌는지 세어 봐요', '', '#show-detail'],
      ['문지른 풍선을 털 가까이에서 들어 올리기', seen.lifted, '‘② 털 가까이에서 들어 올리기’를 누르고 털끝을 살펴요', '#lift-btn, #away-btn'],
    ] : [
      ['장갑으로 숟가락 ㉮와 ㉯ 문지르기', rubbedSpoons, '‘① 장갑으로 ㉮와 ㉯ 문지르기’'],
      ['‘전하 보기’를 켜고 숟가락과 장갑의 전하 살펴보기', seen.viewSpoon, '위쪽 ‘전하 보기’를 켜고, 숟가락 ㉮·㉯와 장갑이 어떤 전하를 띠는지 살펴봐요', '', '#show-detail'],
      ['숟가락 ㉯를 숟가락 ㉮에 가까이 하기', seen.repel, '‘숟가락 ㉯’를 고르고 ‘② 가까이 가져가기’', '#approach, #away, #tool'],
      ['장갑을 숟가락 ㉮에 가까이 하기', seen.attract, '‘장갑’을 고르고 ‘② 가까이 가져가기’', '[data-tool="glove"]'],
    ]));
  }
  requestAnimationFrame(frame);
}

const spoonIllustration = `<svg viewBox="0 0 420 245" role="img" aria-label="지우개 위의 숟가락 ㉮와, 가까이 가져갈 숟가락 ㉯와 장갑"><rect width="420" height="245" fill="#121a3a"/>
  <g transform="translate(70 170) rotate(-4)"><ellipse rx="40" ry="26" fill="#f8f4ea" stroke="#cfc6b0"/><path d="M34 -7 L230 -9 Q244 -9 244 0 Q244 9 230 9 L34 7Z" fill="#f4efe2" stroke="#cfc6b0"/><rect x="-18" y="-13" width="36" height="26" rx="5" fill="#ff8fb1"/><text x="150" y="34" text-anchor="middle" font-size="16" fill="#ffd166" font-weight="700">숟가락 ㉮</text></g>
  <g transform="translate(300 70) rotate(-40)"><path d="M0 -7 L120 -9 Q132 -9 132 0 Q132 9 120 9 L0 7Z" fill="#f4efe2" stroke="#cfc6b0"/><ellipse cx="160" rx="34" ry="22" fill="#f8f4ea" stroke="#cfc6b0"/></g>
  <text x="330" y="140" text-anchor="middle" font-size="16" fill="#e8eeff" font-weight="700">숟가락 ㉯</text>
  <g transform="translate(200 40) scale(.55)"><path d="${GLOVE_PATH}" fill="#cfeef0" stroke="#8fbcc0" stroke-width="2"/></g>
  <text x="232" y="96" text-anchor="middle" font-size="15" fill="#e8eeff">장갑</text>
  <path d="M290 150 Q270 165 250 168" stroke="#ffd166" stroke-width="3" fill="none" stroke-dasharray="6 6"/><text x="290" y="200" text-anchor="middle" font-size="14" fill="#ffd166">가까이 가져가요</text></svg>`;

flow = setupPOEFlow({
  glossary,
  experiments: [
    {
      id: 'rub', name: '풍선과 털',
      predict: {
        title: '문지른 풍선을 들어 올리면<br>털은 어떻게 될까요?',
        lead: '털에 풍선을 문지른 뒤,<br>털 가까이에서 풍선을 살짝 들어 올릴 거예요.',
        illustration: `<img src="${spriteUrl}" alt="실험에 쓸 풍선과 털" width="1536" height="1024" style="width:100%;height:245px;object-fit:contain">`,
        question: '털에 어떤 변화가 생길까요?',
        choices: ['털끝이 풍선 쪽으로 움직일 것 같아요.', '털끝이 풍선에서 멀어질 것 같아요.', '털에 변화가 없을 것 같아요.'],
        placeholder: '겨울에 털옷을 벗을 때 머리카락이 달라붙었던 경험을 떠올려 보세요. 잘 모르겠다면 궁금한 점을 써도 좋아요.',
      },
      observe: {
        title: '풍선을 털에 문지른 뒤, 털 가까이에서 들어 올려 보세요.',
        recordLabel: '문지르기 전과 뒤에 무엇이 달라졌나요? 풍선을 들어 올렸을 때 털끝은 어떻게 움직였나요?',
        placeholder: '털끝이 움직인 방향을 적어 보세요. ‘전하 보기’를 켰다면 전자가 어디에서 어디로 옮겨 갔는지도 적어 보세요.',
      },
      explain: { question: '털끝이 왜 그렇게 움직였을까요? 전자가 옮겨 간 방향과 두 물체가 띤 전하를 이용해 설명해 보세요.' },
    },
    {
      id: 'spoon', name: '숟가락과 장갑',
      predict: {
        title: '문지른 숟가락 ㉯를 숟가락 ㉮에<br>가까이 하면 어떻게 될까요?',
        lead: '장갑으로 두 플라스틱 숟가락 ㉮와 ㉯의 손잡이를 문지른 뒤,<br>숟가락 ㉯를 숟가락 ㉮에 가까이 할 거예요.',
        illustration: spoonIllustration,
        question: '숟가락 ㉮는 어떻게 될까요?',
        choices: ['숟가락 ㉯ 쪽으로 끌려올 것 같아요.', '숟가락 ㉯에서 밀려날 것 같아요.', '움직이지 않을 것 같아요.'],
        placeholder: '두 숟가락을 똑같이 장갑으로 문질렀다는 점을 생각해 보세요.',
      },
      observe: {
        title: '장갑으로 숟가락을 문지른 뒤, 숟가락 ㉯와 장갑을 하나씩 가까이 해 보세요.',
        recordLabel: '숟가락 ㉯를 가까이 했을 때와 장갑을 가까이 했을 때, 숟가락 ㉮는 각각 어느 쪽으로 움직였나요?',
        placeholder: '두 경우에 숟가락 ㉮가 움직인 방향을 비교해 적어 보세요. ‘전하 보기’를 켰다면 각 물체의 전하도 적어 보세요.',
      },
      explain: { question: '숟가락 ㉯와 장갑을 가까이 했을 때 숟가락 ㉮가 다르게 움직인 까닭을, 두 물체가 띤 전하와 관련지어 설명해 보세요.' },
    },
  ],
  explain: {
    question: '왜 이런 결과가 나왔을까요?',
    concepts: [
      ['문지르기 전', '원자는 (+)전하를 띤 원자핵과 (−)전하를 띤 전자로 되어 있어요. 풍선과 털은 (+)전하와 (−)전하의 양이 같아서 전기를 띠지 않아요.'],
      ['문지르는 동안', '털의 전자 일부가 풍선으로 옮겨 가요. (+)전하를 띤 원자핵은 옮겨 가지 않아요. 이렇게 두 물체를 문질러서 생기는 전기를 <b>마찰 전기</b>라고 해요.'],
      ['문지른 뒤', '전자를 잃은 털은 (+)전하를, 전자를 얻은 풍선은 (−)전하를 띠어요. 이렇게 물체가 전기를 띠게 되는 것을 <b>대전</b>, 전기를 띤 물체를 <b>대전체</b>라고 해요.'],
      ['어느 쪽이 전자를 잃을까?', '전자를 잃는 쪽은 문지르는 두 물체가 무엇이냐에 따라 달라요. 털–풍선에서는 털이, 장갑–숟가락에서는 장갑이 전자를 잃었어요.'],
      ['전기력', '전기를 띤 두 물체 사이에 작용하는 힘을 <b>전기력</b>이라고 해요. 같은 종류의 전하를 띤 숟가락 ㉮와 ㉯는 서로 밀어내고(<b>척력</b>), 다른 종류의 전하를 띤 숟가락 ㉮와 장갑, 풍선과 털은 서로 끌어당겨요(<b>인력</b>).'],
    ],
    note: '대전되어도 물체에는 (+)전하와 (−)전하가 모두 남아 있어요. 어느 한쪽이 더 많아진 것이에요. 털끝이 풍선에 끌린 것은 털이 (+)로 대전되었기 때문이에요. 전기를 띠지 않은 물체가 대전체에 끌려오는 현상(정전기 유도)은 다음 시간에 배워요.',
  },
  onExperimentChange: id => setMode(id),
  onRestart: () => {
    stopAutoplay();
    show = false; $('#show-detail').checked = false;
    Object.keys(seen).forEach(k => seen[k] = false);
    resetBalloon(); resetSpoons(); tool = 'spoon';
    lab.resetQuiz();
  },
});
requestAnimationFrame(frame);
