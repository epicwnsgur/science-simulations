// 자유 회로 실험실(저항의 연결 실험의 넷째 탭): 점판 위에 전지·전구·저항·도선·스위치·전류계·전압계를 놓아 회로를 마음대로 만들어 봐요.
// 보고서·실험 순서와 상관없이 자유롭게 만지는 곳이에요(교사 의견). 계산은 src/circuit-solver.js(검사: src/circuit-solver.test.js).
// 놓는 법: 위의 부품 단추를 판 위 자리로 끌어다 놓거나, 부품을 고르고 점과 점 사이를 눌러요. 도선과 지우개는 누른 채 끌면 이어서 돼요.
// 보기(자바실험실의 전기 회로 시뮬레이터를 참고, 교사 요청): 전자의 이동 / 전류의 방향 고르기, 전구 빛줄기, 부품마다 전압·저항 표시. 계기 값은 계기 안에 써요.
// 손: 스위치 켜고 끄기, 전지·전류계·전압계의 (+)(−) 방향 바꾸기, 저항값 바꾸기(5·10·20 Ω), 끊어진 전구 새것으로 바꾸기.
// 전압계 도구는 이미 부품이 있는 자리에 누르면 그 부품에 ‘나란히(병렬로)’ 연결돼요.
import { pole } from './lab-shell.js';
import { solveWithBurnout, ampText, voltText, RESISTORS, CELL_V } from './circuit-solver.js';

const COLS = 9, ROWS = 5, X0 = 60, Y0 = 48, STEP = 85, HALF = STEP / 2;
const TOOLS = [
  ['hand', '손(누르기)'], ['wire', '도선'], ['cell', '전지(1.5 V)'], ['bulb', '전구'], ['resistor', '저항'],
  ['switch', '스위치'], ['ammeter', '전류계'], ['voltmeter', '전압계'], ['erase', '지우개'],
];
const NAMES = { wire: '도선', cell: '전지', bulb: '전구', resistor: '저항', switch: '스위치', ammeter: '전류계', voltmeter: '전압계' };
const nodeXY = (i, j) => [X0 + i * STEP, Y0 + j * STEP];
// 자리 이름: h(가로) i_j는 점 (i, j)–(i+1, j), v(세로) i_j는 점 (i, j)–(i, j+1)
function edgeEnds(key) {
  const [, d, i, j] = key.match(/^([hv])(\d+)_(\d+)$/).map((v, k) => (k > 1 ? +v : v));
  return d === 'h' ? [[i, j], [i + 1, j], d] : [[i, j], [i, j + 1], d];
}
const EDGES = [];
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS - 1; i++) EDGES.push(`h${i}_${j}`);
for (let j = 0; j < ROWS - 1; j++) for (let i = 0; i < COLS; i++) EDGES.push(`v${i}_${j}`);

// 예시 회로: 전지 2개(3 V), 전류계와 전압계의 (+)단자는 전류가 들어오는 쪽(전지의 (+)극 쪽)
const BASE = { h2_4: ['wire'], h3_4: ['cell'], h4_4: ['cell'], h5_4: ['wire'], v2_1: ['wire'], v2_2: ['wire'], v2_3: ['wire'], v6_1: ['wire'], v6_2: ['wire'], v6_3: ['ammeter', { flip: true }] };
const PRESETS = {
  single: { ...BASE, h2_1: ['wire'], h3_1: ['switch', { on: true }], h4_1: ['bulb', { meter: { flip: true } }], h5_1: ['wire'] },
  series: { ...BASE, h2_1: ['switch', { on: true }], h3_1: ['bulb'], h4_1: ['bulb', { meter: { flip: true } }], h5_1: ['wire'] },
  parallel: { ...BASE, h2_1: ['wire'], h3_1: ['wire'], h4_1: ['bulb', { meter: { flip: true } }], h5_1: ['wire'], h2_2: ['wire'], h3_2: ['wire'], h4_2: ['bulb'], h5_2: ['wire'] },
};

export function mountSandbox({ board, controls, actions, readout, toast, showElectrons }) {
  const parts = new Map(); // 자리 → { type, flip, on, ohm, burnt, meter: { flip } | null }
  let tool = 'wire', painting = false, solved = null, warned = '';
  const view = { flow: 'electron', rays: true, values: false }; // flow: 'electron'(전자의 이동) | 'current'(전류의 방향)
  const electrons = []; // { el, key, u }

  board.innerHTML = `<g class="sb-dots">${Array.from({ length: COLS * ROWS }, (_, k) => { const [x, y] = nodeXY(k % COLS, Math.floor(k / COLS)); return `<circle cx="${x}" cy="${y}" r="4" class="sb-dot"/>`; }).join('')}</g>
    <g class="sb-parts"></g><g class="sb-electrons"></g><g class="sb-labels"></g>
    <g class="sb-hits">${EDGES.map(key => { const [[i1, j1], [i2, j2], d] = edgeEnds(key); const [x1, y1] = nodeXY(i1, j1), [x2, y2] = nodeXY(i2, j2); return `<line class="sb-hit" data-edge="${key}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" tabindex="0" role="button" aria-label="${d === 'h' ? '가로' : '세로'} 자리 ${i1 + 1}-${j1 + 1}"/>`; }).join('')}</g>`;
  const layer = sel => board.querySelector(sel);

  /* ---------- 놓기·바꾸기 ---------- */
  function apply(key, dragging = false, use = tool) {
    const tool = use;
    const p = parts.get(key);
    if (tool === 'erase') {
      if (!p) return;
      if (p.meter && !dragging) p.meter = null; else parts.delete(key);
    } else if (tool === 'hand') {
      if (dragging || !p) return;
      if (p.type === 'switch') p.on = !p.on;
      else if (['cell', 'ammeter', 'voltmeter'].includes(p.type)) p.flip = !p.flip;
      else if (p.type === 'resistor') p.ohm = RESISTORS[(RESISTORS.indexOf(p.ohm) + 1) % RESISTORS.length];
      else if (p.type === 'bulb' && p.burnt) { p.burnt = false; toast('끊어진 전구를 새 전구로 바꿨어요.'); }
      else if (p.meter) p.meter.flip = !p.meter.flip;
      else return;
    } else if (tool === 'voltmeter' && p && p.type !== 'voltmeter') {
      if (dragging) return;
      // 이미 부품이 있는 자리: 그 부품과 나란히(병렬로) 전압계를 이어요. 다시 누르면 (+)(−) 방향을 바꿔요.
      if (p.meter) p.meter.flip = !p.meter.flip; else p.meter = { flip: false };
    } else {
      if (dragging && tool !== 'wire') return;
      if (p?.type === tool) return;
      parts.set(key, { type: tool, flip: false, on: false, ohm: 10, burnt: false, meter: p?.meter ?? null });
    }
    update();
  }
  const hits = layer('.sb-hits');
  hits.addEventListener('pointerdown', e => {
    const key = e.target.dataset?.edge; if (!key) return;
    e.preventDefault(); painting = tool === 'wire' || tool === 'erase'; apply(key);
  });
  hits.addEventListener('pointerover', e => { const key = e.target.dataset?.edge; if (painting && key) apply(key, true); });
  addEventListener('pointerup', () => { painting = false; });
  hits.addEventListener('keydown', e => { const key = e.target.dataset?.edge; if (key && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); apply(key); } });

  // 부품 단추를 판 위로 끌어다 놓기: 손가락·마우스를 놓은 곳에서 가장 가까운 자리에 놓아요(놓을 자리는 미리 밝게 보여요).
  const svg = board.ownerSVGElement;
  const nearestEdge = (cx, cy) => {
    const pt = new DOMPoint(cx, cy).matrixTransform(svg.getScreenCTM().inverse());
    let best = null, bestD = 34;
    for (const key of EDGES) {
      const [[i1, j1], [i2, j2]] = edgeEnds(key), [x1, y1] = nodeXY(i1, j1), [x2, y2] = nodeXY(i2, j2);
      const t = Math.max(0, Math.min(1, ((pt.x - x1) * (x2 - x1) + (pt.y - y1) * (y2 - y1)) / (STEP * STEP)));
      const dd = Math.hypot(pt.x - (x1 + (x2 - x1) * t), pt.y - (y1 + (y2 - y1) * t));
      if (dd < bestD) { bestD = dd; best = key; }
    }
    return best;
  };
  let drag = null;
  function startDrag(e, id) {
    if (e.button !== 0 || ['hand', 'erase'].includes(id)) return;
    drag = { id, x: e.clientX, y: e.clientY, moved: false, ghost: null, target: null };
  }
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.ghost = document.createElement('div'); drag.ghost.className = 'sb-ghost'; drag.ghost.textContent = TOOLS.find(([id]) => id === drag.id)[1];
      document.body.append(drag.ghost);
    }
    const z = Number(document.documentElement.style.zoom) || 1;
    Object.assign(drag.ghost.style, { left: `${(e.clientX + scrollX) / z + 12}px`, top: `${(e.clientY + scrollY) / z + 12}px` });
    const key = nearestEdge(e.clientX, e.clientY);
    if (key !== drag.target) {
      hits.querySelector('.sb-target')?.classList.remove('sb-target');
      if (key) hits.querySelector(`[data-edge="${key}"]`).classList.add('sb-target');
      drag.target = key;
    }
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag; drag = null;
    d.ghost?.remove(); hits.querySelector('.sb-target')?.classList.remove('sb-target');
    if (d.moved && d.target) { tool = d.id; apply(d.target, false, d.id); renderControls(); }
  });

  /* ---------- 계산 ---------- */
  function solverParts() {
    const list = [];
    for (const [key, p] of parts) {
      const [[i1, j1], [i2, j2]] = edgeEnds(key), a = `${i1},${j1}`, b = `${i2},${j2}`;
      list.push({ id: key, type: p.type, a, b, flip: p.flip, on: p.on, ohm: p.ohm, burnt: p.burnt });
      if (p.meter) list.push({ id: `${key}m`, type: 'voltmeter', a, b, flip: p.meter.flip });
    }
    return list;
  }
  function update() {
    solved = solveWithBurnout(solverParts());
    for (const id of solved.burnt) { const p = parts.get(id); if (p) p.burnt = true; }
    if (solved.burnt.length) toast('전구에 너무 큰 전압이 걸려 필라멘트가 끊어졌어요. 전지를 줄이고, ‘손’으로 전구를 눌러 새것으로 바꿔요.');
    const msg = solved.shorted.length ? 'short' : '';
    if (msg && warned !== msg) toast('합선! 전지가 저항이 거의 없는 도선(또는 전류계)으로만 이어졌어요. 아주 센 전류가 흘러 위험해요. 전구나 저항을 넣어 연결해요.');
    warned = msg;
    draw();
  }

  /* ---------- 그리기 ---------- */
  const rot = d => (d === 'v' ? 90 : 0);
  const upright = (d, inner) => `<g transform="rotate(${-rot(d)})">${inner}</g>`; // 글자는 세로 자리에서도 바로 서게
  const lead = (from, to) => `<path d="M${from} 0 H${to}" class="sb-lead"/>`;
  // 전구의 빛줄기: 밝을수록 길어요(전구가 내는 빛을 보이게, 자바실험실의 ‘빛 방출 표시’처럼).
  const rays = (glow, d) => upright(d, Array.from({ length: 8 }, (_, k) => { const a = k * Math.PI / 4 + Math.PI / 8, r1 = 21, r2 = 21 + 6 + 16 * glow; return `<path d="M${(r1 * Math.cos(a)).toFixed(1)} ${(r1 * Math.sin(a)).toFixed(1)} L${(r2 * Math.cos(a)).toFixed(1)} ${(r2 * Math.sin(a)).toFixed(1)}" class="sb-ray"/>`; }).join(''));
  function partSVG(key, p, d) {
    const L = HALF, r = solved?.results.get(key);
    const plusAtB = p.type === 'cell' ? !p.flip : p.flip; // 전지: 기본은 b(오른쪽·아래)가 (+)극 / 계기: 기본은 a가 (+)단자
    const poles = (dist, y, rad) => `<g transform="translate(${-dist} ${y})">${upright(d, pole(0, 0, plusAtB ? '−' : '+', { r: rad }))}</g><g transform="translate(${dist} ${y})">${upright(d, pole(0, 0, plusAtB ? '+' : '−', { r: rad }))}</g>`;
    switch (p.type) {
      case 'wire': return `<path d="M${-L} 0 H${L}" class="sb-wire"/>`;
      case 'cell': {
        const nub = plusAtB ? `<rect x="20" y="-5" width="5" height="10" rx="1" fill="#c9d1db"/>` : `<rect x="-25" y="-5" width="5" height="10" rx="1" fill="#c9d1db"/>`;
        return `${lead(-L, -20)}${lead(20, L)}<rect x="-20" y="-11" width="40" height="22" rx="4" fill="#d98c45" stroke="#8a5420"/><rect x="${plusAtB ? 8 : -20}" y="-11" width="12" height="22" rx="3" fill="#2a3150"/>${nub}${poles(31, -21, 8)}`;
      }
      case 'bulb': {
        const glow = Math.min(1, Math.sqrt(r?.brightness ?? 0));
        return `${lead(-L, -15)}${lead(15, L)}<circle class="sb-glow" r="46" fill="url(#bulb-light)" opacity="${glow.toFixed(2)}"/><circle r="16" fill="#ffffff1c" stroke="#e8eef5" stroke-width="2"/>${p.burnt
          ? '<path d="M-8 7 l3 -11 l3 5 M3 -2 l2 -4 l3 13" stroke="#8a7a60" stroke-width="2" fill="none"/>'
          : `<path d="M-8 7 l4 -11 l4 7 l4 -7 l4 11" stroke="${glow > .2 ? '#fff6c8' : '#9a7a40'}" stroke-width="2" fill="none"/>`}${view.rays && !p.burnt && glow > .05 ? rays(glow, d) : ''}`;
      }
      case 'resistor': return `${lead(-L, -24)}${lead(24, L)}<path d="M-24 0 l4 -9 l8 18 l8 -18 l8 18 l8 -18 l8 18 l4 -9" stroke="#e8c15a" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
      case 'switch': return `${lead(-L, -20)}${lead(20, L)}<circle cx="-20" r="5" fill="#cfd6ec"/><circle cx="20" r="5" fill="#cfd6ec"/><path d="${p.on ? 'M-20 0 L20 0' : 'M-20 0 L14 -20'}" stroke="#ffd166" stroke-width="5" stroke-linecap="round"/>`;
      case 'ammeter': case 'voltmeter': {
        // 실제 계기처럼 값을 계기 안에 써요(위: 계기 이름 글자, 아래: 잰 값).
        const value = p.type === 'ammeter' ? ampText(r?.reading ?? 0) : voltText(r?.reading ?? 0);
        return `${lead(-L, -24)}${lead(24, L)}<circle r="24" fill="#f4f1e8" stroke="#8f9bc4" stroke-width="2"/>${upright(d, `<text y="-6" text-anchor="middle" font-size="12" font-weight="800" class="sb-letter">${p.type === 'ammeter' ? 'A' : 'V'}</text><text y="11" text-anchor="middle" font-size="11" font-weight="800" class="sb-meter-value${(r?.reading ?? 0) < -.0004 ? ' neg' : ''}">${value}</text>`)}${poles(32, -22, 7)}`;
      }
      default: return '';
    }
  }
  // 이미 있는 부품에 나란히 이은 전압계: 자리 위(세로 자리는 오른쪽)로 둘러 이어요.
  function meterSVG(m, d) {
    const plusAtA = !m.flip;
    return `<path d="M${-HALF + 6} 0 V-36 H-15 M15 -36 H${HALF - 6} V0" class="sb-probe"/><circle cy="-36" r="15" fill="#f4f1e8" stroke="#8f9bc4" stroke-width="2"/><g transform="translate(0 -36)">${upright(d, '<text y="6" text-anchor="middle" font-size="15" font-weight="800" class="sb-letter">V</text>')}</g><g transform="translate(${-HALF + 6} -50)">${upright(d, pole(0, 0, plusAtA ? '+' : '−', { r: 6 }))}</g><g transform="translate(${HALF - 6} -50)">${upright(d, pole(0, 0, plusAtA ? '−' : '+', { r: 6 }))}</g>`;
  }
  function labelFor(key, p, d, mx, my) {
    const r = solved?.results.get(key), out = [];
    // 가로 자리는 부품 아래(위) 가운데, 세로 자리는 부품 왼쪽(오른쪽)에 글을 둬요.
    const at = (dx, dy, text, cls) => out.push(`<text x="${(mx + dx).toFixed(0)}" y="${(my + dy).toFixed(0)}" text-anchor="${d === 'h' ? 'middle' : dx < 0 ? 'end' : 'start'}" class="${cls}">${text}</text>`);
    const below = d === 'h' ? [0, 40] : [-28, 5];
    // 전압·저항 표시(선택): 전구·저항에 걸린 전압과 저항값, 전지의 전압
    if (view.values && ['bulb', 'resistor'].includes(p.type)) at(...below, `${voltText(Math.abs(r?.voltage ?? 0))} · ${p.type === 'bulb' ? 10 : p.ohm} Ω`, 'sb-val');
    if (view.values && p.type === 'cell') at(...below, '1.5 V', 'sb-val');
    if (p.type === 'resistor' && !view.values) at(...(d === 'h' ? [0, 30] : [-18, 5]), `${p.ohm} Ω`, 'sb-val');
    if (p.type === 'bulb' && p.burnt) at(...(d === 'h' ? [0, 36] : [-22, 5]), '끊어짐', 'sb-warn');
    if (p.meter) at(...(d === 'h' ? [0, -60] : [56, 5]), voltText(solved?.results.get(`${key}m`)?.reading ?? 0), 'sb-read');
    return out.join('');
  }
  function draw() {
    let svg = '', labels = '';
    for (const [key, p] of parts) {
      const [[i1, j1], [i2, j2], d] = edgeEnds(key), [x1, y1] = nodeXY(i1, j1), [x2, y2] = nodeXY(i2, j2), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      svg += `<g class="sb-part sb-${p.type}" transform="translate(${mx} ${my}) rotate(${rot(d)})">${partSVG(key, p, d)}${p.meter ? meterSVG(p.meter, d) : ''}</g>`;
      labels += labelFor(key, p, d, mx, my);
    }
    layer('.sb-parts').innerHTML = svg;
    layer('.sb-labels').innerHTML = labels;
    buildElectrons();
    renderReadout();
  }
  // 전자: 전류가 흐르는 도선·전구·저항·스위치·전류계에서, 전류의 방향과 반대로 움직여요(전지 속은 그리지 않아요).
  function buildElectrons() {
    const g = layer('.sb-electrons'); g.innerHTML = ''; electrons.length = 0;
    for (const [key, p] of parts) {
      if (['cell', 'voltmeter'].includes(p.type)) continue;
      const I = solved?.results.get(key)?.current ?? 0;
      if (Math.abs(I) < 1e-3) continue;
      for (let k = 0; k < 3; k++) {
        const current = view.flow === 'current';
        const el = document.createElementNS('http://www.w3.org/2000/svg', current ? 'path' : 'circle');
        if (current) { el.setAttribute('d', 'M-6 -6 L7 0 L-6 6 Z'); el.setAttribute('class', 'sb-current'); }
        else { el.setAttribute('r', '4'); el.setAttribute('class', 'sb-electron'); }
        g.append(el);
        electrons.push({ el, key, I, u: k / 3, current });
      }
    }
  }
  function frame(dt) {
    const on = showElectrons();
    layer('.sb-electrons').toggleAttribute('hidden', !on);
    if (!on) return;
    for (const e of electrons) {
      // 같은 굵기의 도선이면 전류가 셀수록 전자가 빨리 움직여요(150 mA에서 1초에 자리 하나의 절반쯤).
      const speed = Math.min(2.5, Math.max(.12, Math.abs(e.I) / .3));
      // 전류가 a→b면 전자는 b→a로 움직여요. ‘전류의 방향’을 고르면 화살표가 a→b(전지의 (+)극 → (−)극 쪽)로 가요.
      const dir = e.current ? Math.sign(e.I) : -Math.sign(e.I);
      e.u = (e.u + dir * speed * dt + 1) % 1;
      const [[i1, j1], [i2, j2]] = edgeEnds(e.key), [x1, y1] = nodeXY(i1, j1), [x2, y2] = nodeXY(i2, j2);
      const x = x1 + (x2 - x1) * e.u, y = y1 + (y2 - y1) * e.u;
      if (e.current) e.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + (dir < 0 ? 180 : 0)).toFixed(0)})`);
      else { e.el.setAttribute('cx', x.toFixed(1)); e.el.setAttribute('cy', y.toFixed(1)); }
    }
  }

  /* ---------- 단추와 결과 ---------- */
  function renderControls() {
    controls.innerHTML = `<div role="group" aria-label="부품 고르기" class="sb-tools"><span class="group-label">부품</span>${TOOLS.map(([id, label]) => `<button type="button" data-sb-tool="${id}" aria-pressed="${tool === id}">${label}</button>`).join('')}</div>`;
    controls.innerHTML += `<div role="group" aria-label="보기" class="sb-view"><span class="group-label">보기</span><label><input type="radio" name="sb-flow" value="electron" ${view.flow === 'electron' ? 'checked' : ''}> 전자의 이동</label><label><input type="radio" name="sb-flow" value="current" ${view.flow === 'current' ? 'checked' : ''}> 전류의 방향</label><label><input type="checkbox" id="sb-rays" ${view.rays ? 'checked' : ''}> 전구 빛줄기</label><label><input type="checkbox" id="sb-values" ${view.values ? 'checked' : ''}> 전압·저항 표시</label></div>`;
    controls.querySelectorAll('[data-sb-tool]').forEach(b => {
      b.onclick = () => { tool = b.dataset.sbTool; renderControls(); };
      b.addEventListener('pointerdown', e => startDrag(e, b.dataset.sbTool));
      b.title = ['hand', 'erase'].includes(b.dataset.sbTool) ? '고른 뒤 판 위의 부품을 눌러요' : '판 위로 끌어다 놓거나, 고른 뒤 점과 점 사이를 눌러요';
    });
    controls.querySelectorAll('[name="sb-flow"]').forEach(r => r.onchange = () => { view.flow = r.value; draw(); });
    controls.querySelector('#sb-rays').onchange = e => { view.rays = e.target.checked; draw(); };
    controls.querySelector('#sb-values').onchange = e => { view.values = e.target.checked; draw(); };
    actions.innerHTML = `<span class="group-label">예시 회로</span><button type="button" class="secondary" data-sb-preset="single">전구 1개</button><button type="button" class="secondary" data-sb-preset="series">직렬연결</button><button type="button" class="secondary" data-sb-preset="parallel">병렬연결</button><button type="button" class="secondary" id="sb-clear">모두 지우기</button>`;
    actions.querySelectorAll('[data-sb-preset]').forEach(b => b.onclick = () => load(PRESETS[b.dataset.sbPreset]));
    actions.querySelector('#sb-clear').onclick = () => { if (!parts.size || confirm('놓은 부품을 모두 지울까요?')) { parts.clear(); update(); } };
  }
  function load(preset) {
    parts.clear();
    for (const [key, [type, more = {}]] of Object.entries(preset)) parts.set(key, { type, flip: false, on: false, ohm: 10, burnt: false, meter: null, ...more });
    update();
  }
  function renderReadout() {
    const meters = [...parts].flatMap(([key, p]) => [
      ...(p.type === 'ammeter' ? [['전류계', ampText(solved.results.get(key).reading)]] : []),
      ...(p.type === 'voltmeter' ? [['전압계', voltText(solved.results.get(key).reading)]] : []),
      ...(p.meter ? [[`전압계(${NAMES[p.type]}에 나란히)`, voltText(solved.results.get(`${key}m`).reading)]] : []),
    ]);
    const cells = [...parts.values()].filter(p => p.type === 'cell').length;
    const notes = [];
    if (solved.shorted.length) notes.push('<b class="sb-bad">합선!</b> 전지가 도선이나 전류계로만 이어졌어요. 전구나 저항을 넣어요.');
    if ([...parts].some(([key, p]) => p.type === 'ammeter' && solved.results.get(key).reading < -.0005) || [...parts].some(([key, p]) => (p.type === 'voltmeter' && solved.results.get(key).reading < -.005) || (p.meter && solved.results.get(`${key}m`).reading < -.005)))
      notes.push('값 앞에 ‘−’가 보이면 바늘이 거꾸로 움직인 거예요. ‘손’으로 눌러 (+)단자와 (−)단자를 바꿔 연결해요.');
    if ([...parts.values()].some(p => p.type === 'bulb' && p.burnt)) notes.push('끊어진 전구는 ‘손’으로 눌러 새것으로 바꿔요.');
    readout.innerHTML = `<div class="sb-readout"><p><b>전지</b> ${cells}개${cells ? ` (한 개에 ${CELL_V} V)` : ''}</p>${meters.length ? `<table class="data-table"><tr><th>계기</th><th>값</th></tr>${meters.map(([n, v]) => `<tr><td>${n}</td><td>${v}</td></tr>`).join('')}</table>` : '<p class="poe-hint">전류계를 직렬로, 전압계를 병렬로 이어 값을 재 보세요.</p>'}${notes.map(t => `<p class="sb-note">${t}</p>`).join('')}</div>`;
  }

  update();
  return { renderControls, frame, clear: () => { parts.clear(); update(); }, load: name => load(PRESETS[name]), parts };
}
