// 실험 페이지 공통 틀: 머리글, 활동 탭, 무대(SVG), 관찰 기록, 스스로 평가, 핵심 개념을 만듭니다.
// 각 실험은 내용(config)만 넘기고, 반환된 도우미로 화면을 갱신합니다.
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

// 매 프레임 호출되므로 바뀐 경우에만 DOM을 고칩니다.
export function setText(selector, text) { const el = $(selector); if (el && el.textContent !== text) el.textContent = text; }
export function setHTML(selector, html) { const el = $(selector); if (el && el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; } }

// 받침 유무에 따라 조사를 고릅니다. 예: josa('빨대', '을', '를') → '빨대를'
export const josa = (word, withFinal, without) => { const code = word.charCodeAt(word.length - 1) - 0xac00; return word + (code >= 0 && code % 28 ? withFinal : without); };

export function buildLab(cfg) {
  const tabs = cfg.tabs.map((t, i) => `<button id="tab-${t.id}" role="tab" aria-selected="${i === 0}">${String(i + 1).padStart(2, '0')} <span>${t.label}</span></button>`).join('');
  const quiz = cfg.quiz.map((q, n) => `<h3>${n + 1}. ${q.question}</h3><div class="answers${q.stacked ? ' stacked' : ''}">${q.options.map(([id, label]) => `<button data-quiz="${n}" data-choice="${id}">${label}</button>`).join('')}</div><p id="quiz-feedback-${n}" aria-live="polite">${q.hint}</p>`).join('');
  $('#app').innerHTML = `
<header><a class="brand" href="../../grades/middle-school-2/unit-7/">← 실험 목록</a><span class="grade">중학교 2학년 <i></i> 과학</span></header>
<main class="lab-page"><div class="breadcrumb">VII. 전기와 자기 <span>/</span> ${cfg.crumb}</div>
<section class="intro"><div><h1>${cfg.title}</h1><p>${cfg.intro}</p></div></section>
<div class="workspace"><section class="lab"><div class="lab-toolbar"><div class="tabs" role="tablist" aria-label="활동 선택">${tabs}</div><button id="reset" class="reset">↻ <span>처음으로</span></button></div>
<div class="instruction"><span class="step-icon">↔</span><div><strong id="guide"></strong><p id="subguide"></p></div>${cfg.toggle ? `<label class="toggle"><input type="checkbox" id="show-detail"><span>${cfg.toggle}</span></label>` : ''}</div>
<div id="controls" class="pair-controls choice-row"></div>
<div class="stage night"><div class="stage-label"><span id="stage-state" aria-live="polite"></span></div>
<svg id="scene" viewBox="0 0 800 440" aria-label="${cfg.sceneLabel}">${FX_DEFS}${cfg.scene}</svg><div class="stage-hint" id="stage-hint"></div><div class="toast" id="toast" role="status" aria-live="polite"></div></div>
<div class="lab-bottom">${cfg.legend ? `<div class="legend">${cfg.legend}</div>` : ''}<div id="actions" class="actions"></div></div>
<p class="model-note" id="model-note"></p></section>
<aside><section class="observation"><div class="section-label"><span>◉</span> 무엇이 달라졌나요?</div><h2 id="note-title"></h2><p id="note-text"></p><div id="readout"></div><div class="discovery" id="discovery"></div></section>
<section class="mission"><span class="small-tag">스스로 평가</span>${quiz}</section></aside></div>
<section class="vocabulary"><div class="vocab-heading"><h2>실험 속 핵심 개념</h2><span>단어를 누르면 뜻을 확인할 수 있어요.</span></div><div class="term-buttons">${cfg.terms.map(([t], i) => `<button data-term="${i}" class="${i === 0 ? 'active' : ''}">${t}</button>`).join('')}</div><p id="term-definition"><strong>${cfg.terms[0][0]}</strong> ${cfg.terms[0][1]}</p></section>
</main>`;
  $$('[data-term]').forEach(b => b.onclick = () => {
    $$('[data-term]').forEach(v => v.classList.toggle('active', v === b));
    const [t, d] = cfg.terms[+b.dataset.term]; $('#term-definition').innerHTML = `<strong>${t}</strong> ${d}`;
  });
  $$('[data-quiz]').forEach(b => b.onclick = () => {
    const n = +b.dataset.quiz, q = cfg.quiz[n];
    $$(`[data-quiz="${n}"]`).forEach(v => v.classList.toggle('chosen', v === b));
    const right = b.dataset.choice === q.answer;
    b.classList.toggle('right', right);
    $(`#quiz-feedback-${n}`).textContent = right ? q.right : q.wrong;
  });
  const resetQuiz = () => {
    $$('[data-quiz]').forEach(b => b.classList.remove('chosen', 'right'));
    cfg.quiz.forEach((q, n) => { $(`#quiz-feedback-${n}`).textContent = q.hint; });
    $('[data-term="0"]').click();
  };
  const selectTab = id => cfg.tabs.forEach(t => $(`#tab-${t.id}`).setAttribute('aria-selected', t.id === id));
  return { resetQuiz, selectTab };
}

// 관찰 단계 체크리스트. steps: [[이름, 완료 여부], ...]
export function checklist(steps) {
  const done = steps.filter(([, d]) => d).length;
  const next = steps.find(([, d]) => !d);
  return {
    ready: done === steps.length,
    message: done === steps.length ? `${steps.length}가지 관찰을 모두 해 보았어요. 직접 본 결과를 기록해 주세요.` : `관찰 ${done}/${steps.length} · 다음: ${next[0]}`,
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

// 짧은 알림. 관찰 하나를 마칠 때 등에 사용합니다.
let toastTimer = null;
export function toast(text) {
  const el = $('#toast'); if (!el) return;
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
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
