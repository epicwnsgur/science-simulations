// 교사 모드: 실험 첫 화면 위쪽의 ‘교사용’ 단추 → 비밀번호를 넣으면 켜져요.
// 켜지면 예상·관찰·설명 단계를 자유롭게 오가고, 복습·실험 순서 잠금·다음 실험 잠금이 모두 풀려요(src/poe-flow.js).
// 이 탭을 닫으면 꺼져요(sessionStorage). 다른 실험으로 옮겨 가도 같은 탭이면 켜진 채로 있어요.
// 비밀번호는 글자 그대로 두지 않고 SHA-256 값만 두어요. 다만 화면 코드는 누구나 내려받을 수 있어서,
// 학생이 실수로 켜는 것을 막는 가벼운 잠금이에요(시험지처럼 꼭 지켜야 하는 것을 숨기는 용도로는 쓰지 않아요).
const PASS_SHA256 = 'c5cc15b6430ca720613daef384c58149870660959a4ecbb76ba3b55ba02ad77e';
const KEY = 'poe-teacher';

const read = () => { try { return sessionStorage.getItem(KEY) === 'on'; } catch { return false; } };
export const teacherMode = { on: read() };

async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function checkTeacherPassword(text) {
  if (!globalThis.crypto?.subtle) return false;
  return (await sha256(String(text).trim())) === PASS_SHA256;
}
// 교사 모드를 켜고 끄며 이 탭에 기억해요. 교사용 자료 폴더(src/teacher-gate.js)도 같은 값을 써요.
export function setTeacherMode(on) {
  teacherMode.on = on;
  try { if (on) sessionStorage.setItem(KEY, 'on'); else sessionStorage.removeItem(KEY); } catch { /* 저장하지 못하면 이 화면에서만 켜져요 */ }
}

export function mountTeacherMode(bar, { onChange }) {
  bar.insertAdjacentHTML('beforeend', `
    <button type="button" class="teacher-btn" id="teacher-btn" aria-haspopup="dialog">교사용</button>
    <p class="teacher-status" id="teacher-status" role="status" aria-live="polite"></p>
    <dialog id="teacher-dialog" class="flow-dialog teacher-dialog" aria-labelledby="teacher-title">
      <form id="teacher-form" class="flow-dialog-body" novalidate>
        <h2 id="teacher-title">교사 모드</h2>
        <label for="teacher-pass">비밀번호</label>
        <input id="teacher-pass" type="password" inputmode="numeric" autocomplete="off" maxlength="30">
        <p class="teacher-error" id="teacher-error" role="alert"></p>
      </form>
      <div class="flow-dialog-actions"><button type="button" class="secondary big" id="teacher-cancel">취소</button><button type="submit" form="teacher-form" class="primary big" id="teacher-ok">교사 모드 켜기</button></div>
    </dialog>`);
  const btn = bar.querySelector('#teacher-btn'), status = bar.querySelector('#teacher-status'), dialog = bar.querySelector('#teacher-dialog');
  const input = dialog.querySelector('#teacher-pass'), error = dialog.querySelector('#teacher-error');
  function render() {
    document.body.classList.toggle('teacher-on', teacherMode.on);
    btn.textContent = teacherMode.on ? '교사 모드 끄기' : '교사용';
    btn.setAttribute('aria-pressed', String(teacherMode.on));
    status.textContent = teacherMode.on ? '교사 모드 · 단계 이동과 실험 순서 잠금이 모두 풀려 있어요.' : '';
    status.hidden = !teacherMode.on;
  }
  function set(on) { setTeacherMode(on); render(); onChange(); }
  const close = () => { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); };
  btn.onclick = () => {
    if (teacherMode.on) return set(false);
    input.value = ''; error.textContent = '';
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    input.focus();
  };
  dialog.querySelector('#teacher-cancel').onclick = () => { close(); btn.focus(); };
  dialog.querySelector('#teacher-form').onsubmit = async ev => {
    ev.preventDefault();
    if (!globalThis.crypto?.subtle) { error.textContent = '이 주소에서는 교사 모드를 켤 수 없어요(https 주소에서 열어 주세요).'; return; }
    if (await checkTeacherPassword(input.value)) { close(); set(true); btn.focus(); }
    else { error.textContent = '비밀번호가 맞지 않아요. 다시 넣어 주세요.'; input.select(); }
  };
  render();
}
