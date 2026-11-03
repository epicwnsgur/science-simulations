// 내 메모: 실험하는 동안 떠오른 생각, 궁금한 점, 측정값을 언제든 적어 두는 작은 메모장이에요.
// 머리글의 ‘메모’ 단추나 왼쪽 아래 ‘내 메모’ 단추(오른쪽 아래는 Netlify 배지 자리라 피해요)로 열고 닫아요.
// 모든 실험이 쓰는 src/poe-flow.js가 붙이므로, 새로 만드는 실험에도 저절로 들어가요(tests/student-tools.spec.js가 모든 실험에서 확인해요). 보고서에는 들어가지 않고, 관찰·설명을 쓸 때 보고 참고해요.
// 쓴 글은 실험마다 따로 바로 저장돼요(src/draft-store.js: 이 탭 + 이 컴퓨터에 몇 시간). 함께 쓰는 컴퓨터라 시간이 지나면 지워져요.
// 다른 글 칸과 같이 붙여 넣기는 할 수 없어요(내 생각을 내 말로 적도록).
// 학생 의견: 메모가 옆의 글을 가려요 → 메모 위쪽(제목 줄)을 끌어서 옮길 수 있어요. 메모를 찾으러 위로 올라가기 불편해요 → Alt + M으로 열고 닫아요.
import { draftStore, KEEP_HOURS } from './draft-store.js';
import { blockPaste, PASTE_MESSAGE } from './text-guard.js';
import { teacherMode } from './teacher-mode.js';
import { icon } from './icons.js';

export function mountMemo(slug, { toast = () => {} } = {}) {
  const store = draftStore(`memo:${slug}`);
  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" class="memo-toggle" aria-expanded="false" aria-controls="memo-panel">${icon('memo')} 내 메모<i class="memo-dot" hidden></i></button>
    <section id="memo-panel" class="memo-panel" role="dialog" aria-labelledby="memo-title" hidden>
      <div class="memo-head" title="끌어서 메모를 옮길 수 있어요"><h2 id="memo-title">${icon('memo')} 내 메모</h2><button type="button" class="memo-close" aria-label="메모 닫기">닫기 ✕</button></div>
      <p class="memo-hint">실험하면서 떠오른 생각, 궁금한 점, 측정값을 적어 두세요. 보고서에는 들어가지 않아요. 위쪽을 끌면 옮길 수 있고, Alt + M으로 열고 닫아요.</p>
      <textarea id="memo-text" rows="8" maxlength="3000" placeholder="예: 전압을 2배로 하니 전류계 바늘도 2칸 갔다! 왜 그럴까?"></textarea>
      <div class="memo-foot"><small class="memo-saved" aria-live="polite"></small><button type="button" class="memo-clear">메모 지우기</button></div>
    </section>`);
  const btn = document.querySelector('.memo-toggle'), panel = document.querySelector('#memo-panel'), text = document.querySelector('#memo-text');
  const dot = btn.querySelector('.memo-dot'), saved = panel.querySelector('.memo-saved');
  text.value = store.load()?.data?.text ?? '';
  const mark = () => { dot.hidden = !text.value.trim(); };
  const save = () => {
    store.save({ text: text.value });
    const d = new Date();
    saved.textContent = `저장됨 · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · 이 컴퓨터에는 ${KEEP_HOURS}시간 동안 남아요`;
    mark();
  };
  const open = on => {
    panel.hidden = !on;
    document.querySelectorAll('.memo-toggle, [data-memo-open]').forEach(b => { b.setAttribute('aria-expanded', String(on)); b.classList.toggle('on', on); });
    if (on) text.focus({ preventScroll: true });
  };
  document.querySelectorAll('.memo-toggle, [data-memo-open]').forEach(b => { b.onclick = () => open(panel.hidden); });
  panel.querySelector('.memo-close').onclick = () => { open(false); btn.focus(); };
  panel.querySelector('.memo-clear').onclick = () => {
    if (!text.value.trim() || !confirm('메모를 모두 지울까요?')) return;
    text.value = ''; save(); text.focus();
  };
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { open(false); btn.focus(); } });
  text.addEventListener('input', save);
  // 끌어서 옮기기: 화면 밖으로 나가지 않게 막아요. ‘화면 크기’(html의 zoom)를 바꿔도 맞도록 배율(z)로 나눠요.
  const head = panel.querySelector('.memo-head');
  let grab = null;
  head.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const r = panel.getBoundingClientRect();
    grab = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    head.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  head.addEventListener('pointermove', e => {
    if (!grab) return;
    const z = Number(document.documentElement.style.zoom) || 1;
    const left = Math.max(4, Math.min(innerWidth - grab.w - 4, e.clientX - grab.x));
    const top = Math.max(4, Math.min(innerHeight - grab.h - 4, e.clientY - grab.y));
    Object.assign(panel.style, { left: `${left / z}px`, top: `${top / z}px`, right: 'auto', bottom: 'auto' });
  });
  const drop = () => { grab = null; };
  head.addEventListener('pointerup', drop);
  head.addEventListener('pointercancel', drop);
  // 단축키 Alt + M(맥은 option + M): 어디서든 메모를 열고 닫아요.
  addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.code !== 'KeyM') return;
    e.preventDefault();
    open(panel.hidden);
    if (panel.hidden) btn.focus();
  });
  blockPaste(text, { allow: () => teacherMode.on, onBlocked: () => toast(PASTE_MESSAGE) });
  mark();
  return { open };
}
