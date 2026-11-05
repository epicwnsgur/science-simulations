// 교사 모드: 실험 첫 화면 위쪽의 ‘교사용’ 단추 → 비밀번호를 넣으면 켜져요.
// 켜지면 예상·관찰·설명 단계를 자유롭게 오가고, 복습·실험 순서 잠금·다음 실험 잠금이 모두 풀려요(src/poe-flow.js).
// 이 탭을 닫으면 꺼져요(sessionStorage). 다른 실험으로 옮겨 가도 같은 탭이면 켜진 채로 있어요.
// 비밀번호는 글자 그대로 두지 않고, 소금(salt)을 친 PBKDF2-SHA256(30만 번 반복) 값만 두어요.
// 코드를 열어 봐도 비밀번호가 보이지 않고, 한 번 맞혀 보는 데 시간이 걸려 마구 넣어 보기가 느려져요.
// 다만 화면 코드는 누구나 내려받을 수 있고 비밀번호가 숫자 4자리라, 시간을 들이면 알아낼 수는 있어요.
// 학생이 실수로 켜는 것을 막는 가벼운 잠금이에요(학생 정보는 이 잠금이 아니라 구글 시트 공유 설정이 지켜요).
// 비밀번호를 바꾸려면: node -e "..."로 새 소금과 값을 만들어 아래 세 값을 바꿔요(docs/scientific-review.md 참고).
const PASS = { salt: '8f749ff6553f2e4b49fea8766e2ff4b9', iterations: 300000, hash: '7cb4c226865f7f72898739904d6914d3a88aa41a2d7f368aedddfbb949434f04' };
const KEY = 'poe-teacher';

const read = () => { try { return sessionStorage.getItem(KEY) === 'on'; } catch { return false; } };
export const teacherMode = { on: read() };

const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
async function derive(text) {
  const salt = new Uint8Array(PASS.salt.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(text), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PASS.iterations }, key, 256));
}
export async function checkTeacherPassword(text) {
  if (!globalThis.crypto?.subtle) return false;
  return (await derive(String(text).trim())) === PASS.hash;
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
