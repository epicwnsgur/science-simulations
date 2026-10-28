// 실험 페이지 공통 틀: 머리글, 활동 탭, 무대(SVG), 관찰 기록, 스스로 평가, 핵심 개념을 만듭니다.
// 각 실험은 내용(config)만 넘기고, 반환된 도우미로 화면을 갱신합니다.
import '../theme-light.css';
import '../theme-dark-deco.css';
import '../theme-unit-art.css';
import { setupTheme, themeButtonHTML } from './theme.js';
import { icon } from './icons.js';
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

// 매 프레임 호출되므로 바뀐 경우에만 DOM을 고칩니다.
export function setText(selector, text) { const el = $(selector); if (el && el.textContent !== text) el.textContent = text; }
export function setHTML(selector, html) { const el = $(selector); if (el && el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; } }

// 받침 유무에 따라 조사를 고릅니다. 예: josa('빨대', '을', '를') → '빨대를'
export const josa = (word, withFinal, without) => { const code = word.charCodeAt(word.length - 1) - 0xac00; return word + (code >= 0 && code % 28 ? withFinal : without); };

// 글씨 크기 소·중·대. 고른 크기는 이 브라우저에 기억해서 다른 실험에서도 그대로 써요(이름 같은 개인정보는 아니에요).
const TEXT_SIZES = [['s', '소', '작게'], ['m', '중', '보통'], ['l', '대', '크게']];
function setTextSize(size) {
  document.body.classList.toggle('text-s', size === 's');
  document.body.classList.toggle('text-l', size === 'l');
  $$('[data-text-size]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.textSize === size)));
  try { localStorage.setItem('text-size', size); } catch { /* 기억하지 못해도 지금 화면에는 적용돼요. */ }
}

// 화면 크기(확대·축소): 화면이 작은 컴퓨터에서 단추가 한 화면에 다 보이도록 페이지 전체를 줄이거나 키워요(Ctrl −/+ 와 같아요).
// 고른 크기는 이 브라우저에 기억해서 다른 실험에서도 그대로 써요.
export const ZOOM_STEPS = [0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25];
function setPageZoom(z) {
  const zoom = ZOOM_STEPS.includes(z) ? z : 1;
  document.documentElement.style.zoom = zoom === 1 ? '' : String(zoom);
  $$('.zoom-value').forEach(o => { o.textContent = `${Math.round(zoom * 100)}%`; });
  $$('[data-zoom="-"]').forEach(b => { b.disabled = zoom === ZOOM_STEPS[0]; });
  $$('[data-zoom="+"]').forEach(b => { b.disabled = zoom === ZOOM_STEPS.at(-1); });
  try { localStorage.setItem('page-zoom', String(zoom)); } catch { /* 기억하지 못해도 지금 화면에는 적용돼요. */ }
  // 화면 크기가 바뀌면 그림·3D 화면이 새 크기에 맞게 다시 그려지도록 알려요.
  dispatchEvent(new Event('resize'));
}
const zoomNow = () => Number(document.documentElement.style.zoom) || 1;

// 실험 페이지 머리글(실험 목록으로 · 메모 · 테마 · 화면 크기 · 글씨 크기 · 학년). 머리글을 넣은 뒤 setupTextSize()를 불러요.
// 단원: 실험 페이지 위쪽의 ‘← 실험 목록’과 경로 표시에 써요. 새 단원은 UNITS에 더하고 buildLab({ unit })로 골라요.
// 중학교 1학년 단원은 'g1-6'처럼 학년을 붙여 적어요(단원 그림도 이 이름으로 골라요). grade는 머리글 오른쪽의 학년이에요.
export const UNITS = {
  7: { href: '../../grades/middle-school-2/unit-7/', label: 'VII. 전기와 자기', grade: '중학교 2학년' },
  8: { href: '../../grades/middle-school-2/unit-8/', label: 'VIII. 별과 우주', grade: '중학교 2학년' },
  'g1-6': { href: '../../grades/middle-school-1/unit-6/', label: 'VI. 기체의 성질', grade: '중학교 1학년' },
};
export const headerHTML = (unit = 7) => `<header data-unit="${unit}"><a class="brand" href="${UNITS[unit].href}">← 실험 목록</a><div class="header-right"><button type="button" class="memo-head-btn" data-memo-open aria-controls="memo-panel" aria-expanded="false" title="내 메모 열기·닫기">${icon('memo')} 메모</button>${themeButtonHTML()}<div class="page-zoom" role="group" aria-label="화면 크기"><span aria-hidden="true">화면 크기</span><button type="button" data-zoom="-" aria-label="화면 작게" title="화면 작게 (Ctrl −)">－<span class="zoom-word"> 작게</span></button><output class="zoom-value" aria-live="polite">100%</output><button type="button" data-zoom="+" aria-label="화면 크게" title="화면 크게 (Ctrl +)">＋<span class="zoom-word"> 크게</span></button></div><div class="text-size" role="group" aria-label="글씨 크기"><span aria-hidden="true">글씨 크기</span>${TEXT_SIZES.map(([id, label, name]) => `<button type="button" data-text-size="${id}" aria-pressed="false" aria-label="글씨 ${name}" title="글씨 ${name}">${label}</button>`).join('')}</div><span class="grade">${UNITS[unit].grade} <i></i> 과학</span></div></header>`;
export function setupTextSize() {
  document.body.classList.add('lab-readable');
  // 단원 번호: 단원에 어울리는 제목 옆 그림(theme-unit-art.css)을 골라요.
  document.body.dataset.unit = document.querySelector('header[data-unit]')?.dataset.unit ?? '';
  setupTheme();
  let saved = 'm';
  try { saved = localStorage.getItem('text-size') || 'm'; } catch { /* 처음 크기(중)로 시작해요. */ }
  setTextSize(TEXT_SIZES.some(([id]) => id === saved) ? saved : 'm');
  $$('[data-text-size]').forEach(b => b.onclick = () => setTextSize(b.dataset.textSize));
  let zoom = 1;
  try { zoom = Number(localStorage.getItem('page-zoom')) || 1; } catch { /* 처음 크기(100%)로 시작해요. */ }
  setPageZoom(zoom);
  $$('[data-zoom]').forEach(b => b.onclick = () => {
    const i = ZOOM_STEPS.indexOf(zoomNow());
    setPageZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, (i < 0 ? 4 : i) + (b.dataset.zoom === '+' ? 1 : -1)))]);
  });
}

export function buildLab(cfg) {
  const tabs = cfg.tabs.map((t, i) => `<button id="tab-${t.id}" role="tab" aria-selected="${i === 0}">${String(i + 1).padStart(2, '0')} <span>${t.label}</span></button>`).join('');
  $('#app').innerHTML = `
${headerHTML(cfg.unit)}
<main class="lab-page"><div class="breadcrumb">${UNITS[cfg.unit ?? 7].label} <span>/</span> ${cfg.crumb}</div>
<section class="intro"><div><h1>${cfg.title}</h1><p>${cfg.intro}</p></div></section>
<div class="workspace"><section class="lab"><div class="lab-toolbar"><div class="tabs" role="tablist" aria-label="활동 선택">${tabs}</div><button id="reset" class="reset">↻ <span>처음으로</span></button></div>
<div class="instruction"><span class="step-icon">↔</span><div><strong id="guide"></strong><p id="subguide"></p></div>${cfg.toggle ? `<label class="toggle"><input type="checkbox" id="show-detail"><span>${cfg.toggle}</span></label>` : ''}</div>
<div id="controls" class="pair-controls choice-row"></div>
<div class="stage night"><div class="stage-label"><span id="stage-state" aria-live="polite"></span></div>
<svg id="scene" viewBox="0 0 800 440" aria-label="${cfg.sceneLabel}">${FX_DEFS}${cfg.scene}</svg><div class="stage-hint" id="stage-hint"></div><div class="toast" id="toast" role="status" aria-live="polite"></div></div>
<div class="lab-bottom">${cfg.legend ? `<div class="legend">${cfg.legend}</div>` : ''}<div id="actions" class="actions"></div></div>
<p class="model-note" id="model-note"></p></section>
<aside><section class="observation"><div class="section-label"><span>◉</span> 무엇이 달라졌나요?</div><h2 id="note-title"></h2><p id="note-text"></p><div id="readout"></div><div class="discovery" id="discovery"></div></section>
<section class="mission"></section></aside></div>
<section class="vocabulary"><div class="vocab-heading"><h2>실험 속 핵심 개념</h2><span>단어를 누르면 뜻을 확인할 수 있어요.</span></div><div class="term-buttons">${cfg.terms.map(([t], i) => `<button data-term="${i}" class="${i === 0 ? 'active' : ''}">${t}</button>`).join('')}</div><p id="term-definition"><strong>${cfg.terms[0][0]}</strong> ${cfg.terms[0][1]}</p></section>
</main>`;
  setupTextSize();
  if (cfg.unit === 8) document.body.classList.add('lab-space');
  $$('[data-term]').forEach(b => b.onclick = () => {
    $$('[data-term]').forEach(v => v.classList.toggle('active', v === b));
    const [t, d] = cfg.terms[+b.dataset.term]; $('#term-definition').innerHTML = `<strong>${t}</strong> ${d}`;
  });
  const resetQuiz = () => $('[data-term="0"]').click();
  const selectTab = id => cfg.tabs.forEach(t => $(`#tab-${t.id}`).setAttribute('aria-selected', t.id === id));
  return { resetQuiz, selectTab };
}

// 스스로 평가: 고른 보기를 옳으면 초록색(right), 틀리면 붉은색(wrong)으로 표시하고 피드백 글도 같은 색으로 보여 줘요.
export function markAnswer(buttons, chosen, right, feedback, text) {
  buttons.forEach(v => v.classList.remove('chosen', 'right', 'wrong'));
  chosen.classList.add('chosen', right ? 'right' : 'wrong');
  feedback.textContent = (right ? '○ ' : '× ') + text;
  feedback.classList.toggle('right', right); feedback.classList.toggle('wrong', !right);
}

// 관찰 단계 체크리스트. steps: [[이름, 완료 여부, 하는 방법, 이 단계에서 처음 쓰는 조작(CSS 선택자), 눌러야 할 조작(선택)], ...]
// ‘하는 방법’에는 눌러야 할 단추 이름을 ‘ ’로 감싸 적어요. 학생이 실험 순서 안내의 단계를 누르면 그 단추를 찾아 ‘▲ 여기를 눌러요’로 알려 줘요.
// 넷째 값을 주면 앞 단계를 마치기 전에는 그 조작이 잠겨 실험 순서대로 진행돼요(src/poe-flow.js의 gate).
export function checklist(steps) {
  const done = steps.filter(([, d]) => d).length;
  const next = steps.find(([, d]) => !d);
  return {
    ready: done === steps.length,
    message: done === steps.length ? `${steps.length}가지 관찰을 모두 해 보았어요. 직접 본 결과를 기록해 주세요.` : `관찰 ${done}/${steps.length} · 다음: ${next[0]}`,
    // 왼쪽 실험 순서 안내와 순서 잠금에 쓰는 단계 목록
    // press(다섯째 값, 고를 수 있어요): 안내 글에 단추 이름(‘…’)이 없을 때 눌러야 할 조작의 CSS 선택자
    steps: steps.map(([label, isDone, hint, unlocks, press]) => ({ label, done: !!isDone, hint: hint ?? '', unlocks: unlocks ?? '', press: press ?? '' })),
  };
}

/* ---------- 부드러운 끌기 ----------
   손가락·마우스로 물체를 끌면 물체가 포인터를 매끄럽게 따라와요(모션 그래픽처럼 살짝 미끄러지듯). 방향키도 같은 방식이에요.
   el: 끌 SVG 요소, scene: 좌표를 바꿀 svg, get(): 지금 위치, set(x, y): 위치 정하기(실험의 범위 제한·충돌 처리 포함).
   canStart(): 지금 끌어도 되는지(예: 자동 재생 중이면 false). 실험의 프레임마다 follow(dt)를 불러 주세요(dt는 초). */
export function smoothDrag(el, { scene, get, set, canStart = () => true, onStart, onEnd, keyStep = 18, smoothing = 22 }) {
  let target = null, dragging = false, offset = null, delta = { x: 0, y: 0 };
  const point = e => new DOMPoint(e.clientX, e.clientY).matrixTransform(scene.getScreenCTM().inverse());
  const begin = () => { onStart?.(); };
  el.addEventListener('pointerdown', e => {
    if (!canStart()) return;
    e.preventDefault();
    const p = point(e), q = get();
    offset = { x: p.x - q.x, y: p.y - q.y }; target = { ...q }; dragging = true;
    el.setPointerCapture?.(e.pointerId); begin();
  });
  el.addEventListener('pointermove', e => { if (!dragging) return; const p = point(e); target = { x: p.x - offset.x, y: p.y - offset.y }; });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => { dragging = false; });
  el.addEventListener('keydown', e => {
    const d = { ArrowLeft: [-keyStep, 0], ArrowRight: [keyStep, 0], ArrowUp: [0, -keyStep], ArrowDown: [0, keyStep] }[e.key];
    if (!d || !canStart()) return;
    e.preventDefault();
    const from = target ?? get();
    target = { x: from.x + d[0], y: from.y + d[1] }; begin();
  });
  return {
    follow(dt) {
      if (!target) { delta = { x: 0, y: 0 }; return; }
      const q = get(), k = instantLessons.matches ? 1 : 1 - Math.exp(-Math.max(0, dt) * smoothing);
      set(q.x + (target.x - q.x) * k, q.y + (target.y - q.y) * k);
      const now = get();
      delta = { x: now.x - q.x, y: now.y - q.y };
      // 손을 뗀 뒤 목표에 닿았거나(범위 밖이라) 더 갈 수 없으면 멈춰요.
      if (!dragging && Math.hypot(delta.x, delta.y) < .05) { target = null; onEnd?.(); }
    },
    cancel() { target = null; dragging = false; delta = { x: 0, y: 0 }; },
    get dragging() { return dragging; },
    get active() { return !!target; },
    get delta() { return delta; },
  };
}

/* ---------- 시각 효과 ---------- */
// SVG 공통 필터: 빛 번짐(glow), 부드러운 그림자.
// 수직·수평 직선에도 효과가 보이도록 필터 영역을 화면 좌표로 정합니다.
export const FX_DEFS = `<defs>
<filter id="glow" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1200" height="840"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="glow-strong" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1200" height="840"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
<radialGradient id="bulb-light"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffe27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffb627" stop-opacity="0"/></radialGradient>
<linearGradient id="copper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7c08a"/><stop offset=".5" stop-color="#c46f2c"/><stop offset="1" stop-color="#8a4518"/></linearGradient>
<marker id="arrow-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
</defs>`;

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// 학습 움직임(지구의 공전, 풍선이 부푸는 모습, 그네·나침반 바늘의 움직임, 전류의 흐름, 시점 옮기기 등)은
// 현상을 이해하는 데 꼭 필요해서, 컴퓨터의 ‘애니메이션 효과 끄기(동작 줄이기)’ 설정과 상관없이 천천히 보여 줘요.
// 반짝임·불꽃 같은 꾸밈 효과만 그 설정을 따라요. 자동 시험(웹드라이버)에서 동작 줄이기를 켠 경우에만 바로 끝내요.
export const instantLessons = { get matches() { return reducedMotion.matches && navigator.webdriver === true; } };

// 짧은 알림. 관찰 하나를 마칠 때 등에 사용합니다.
let toastTimer = null;
// 무대 위에 크게 띄우는 경고(안전·실험 주의). 토스트보다 오래(기본 5초) 보여 줘서 학생이 끝까지 읽을 수 있어요.
let alertTimer = null;
export function stageAlert(html, ms = 5000) {
  const stage = $('.stage'); if (!stage) return;
  let el = stage.querySelector('.stage-alert');
  if (!el) { el = document.createElement('div'); el.className = 'stage-alert'; el.setAttribute('role', 'alert'); stage.append(el); }
  el.innerHTML = `${html}<span class="stage-alert-bar" style="animation-duration:${ms}ms"></span>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(alertTimer); alertTimer = setTimeout(() => el.classList.remove('show'), ms);
}
export function toast(text) {
  const el = $('#toast'); if (!el) return;
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  // 관찰 하나를 마치면 무대 테두리가 번쩍여요.
  const stage = el.closest('.stage');
  if (stage) { stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash'); }
}

// 불꽃 튀는 효과: 지정한 SVG 좌표에서 작은 빛 조각이 퍼집니다.
export function burst(layer, x, y, color = '#ffe27a', count = 14) {
  if (reducedMotion.matches || !layer) return;
  const ns = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < count; i++) {
    const a = Math.PI * 2 * i / count + Math.random() * .4, d = 26 + Math.random() * 34;
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 2 + Math.random() * 2.2);
    c.setAttribute('fill', color); c.setAttribute('filter', 'url(#glow)');
    layer.append(c);
    c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`, opacity: 0 }], { duration: 650 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => c.remove();
  }
}

// 번개 모양의 순간 방전 선: 두 점 사이에 들쭉날쭉한 빛줄기가 번쩍였다가 사라져요(장식 효과).
export function arc(layer, x1, y1, x2, y2, color = '#bfefff') {
  if (reducedMotion.matches || !layer) return;
  const ns = 'http://www.w3.org/2000/svg', n = 9, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  for (let k = 0; k < 2; k++) {
    let d = `M${x1} ${y1}`;
    for (let i = 1; i < n; i++) {
      const t = i / n, j = (Math.random() - .5) * len * .18;
      d += ` L${(x1 + dx * t - dy / len * j).toFixed(1)} ${(y1 + dy * t + dx / len * j).toFixed(1)}`;
    }
    d += ` L${x2} ${y2}`;
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', k ? '#fff' : color);
    p.setAttribute('stroke-width', k ? 1.2 : 3); p.setAttribute('filter', 'url(#glow)');
    layer.append(p);
    p.animate([{ opacity: 1 }, { opacity: .2 }, { opacity: .9 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }).onfinish = () => p.remove();
  }
}

// 경로를 따라 움직이는 점(전자·물 알갱이)을 그립니다.
// 모든 점은 같은 속도로 움직이므로 회로의 어느 곳에서나 흐름의 양이 같게 보입니다.
export class PathFlow {
  constructor(layer, path, { count = 16, radius = 4, fill = '#5cc8ff', cls = 'flow-dot', glyph = '' } = {}) {
    this.layer = layer; this.path = path; this.length = path.getTotalLength();
    this.offset = 0; this.jitter = Array.from({ length: count }, () => Math.random());
    const ns = 'http://www.w3.org/2000/svg';
    this.dots = Array.from({ length: count }, () => {
      const g = document.createElementNS(ns, 'g'); g.setAttribute('class', cls);
      g.innerHTML = `<circle r="${radius}" fill="${fill}"/>${glyph}`;
      layer.append(g); return g;
    });
  }
  // speed: 경로 길이 대비 초당 이동 비율(음수면 반대 방향). wander: 제자리 불규칙 운동 크기.
  step(dt, speed, wander = 0, t = performance.now() / 1000) {
    this.offset = (this.offset + speed * dt + 1) % 1;
    const n = this.dots.length;
    this.dots.forEach((d, i) => {
      const u = ((i + .5) / n + this.offset) % 1;
      const p = this.path.getPointAtLength(u * this.length);
      const j = this.jitter[i] * 6.28;
      const wx = wander ? Math.sin(t * 5.3 + j * 3) * wander : 0, wy = wander ? Math.cos(t * 4.1 + j * 2) * wander : 0;
      d.setAttribute('transform', `translate(${(p.x + wx).toFixed(1)} ${(p.y + wy).toFixed(1)})`);
    });
  }
  visible(on) { this.dots.forEach(d => d.style.display = on ? '' : 'none'); }
  remove() { this.dots.forEach(d => d.remove()); }
}

export const ELECTRON_GLYPH = '<path d="M-2.2 0H2.2" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>';
