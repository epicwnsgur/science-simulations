// 교사용 자료 폴더의 잠금: 교사 모드(src/teacher-mode.js)가 켜져 있어야 들어가요.
// - 첫 화면의 ‘교사용 자료’ 폴더를 누르면 비밀번호 칸이 바로 나오고, 맞으면 교사 모드를 켜고 폴더로 들어가요.
// - 교사용 페이지에 주소로 바로 들어와도 교사 모드가 꺼져 있으면 비밀번호를 먼저 물어요.
// 실험 화면의 교사 모드와 같은 비밀번호·같은 기억(이 탭의 sessionStorage)을 써요.
// 학생이 실수로 들어가는 것을 막는 가벼운 잠금이에요(화면 코드는 누구나 내려받을 수 있어요).
import { teacherMode, checkTeacherPassword, setTeacherMode } from './teacher-mode.js';
import { icon } from './icons.js';

function passwordDialog({ title, note, cancelLabel }) {
  document.body.insertAdjacentHTML('beforeend', `
    <dialog class="gate-dialog" id="gate-dialog" aria-labelledby="gate-title">
      <form class="gate-body" id="gate-form" novalidate>
        <span class="gate-icon" aria-hidden="true">${icon('lock')}</span>
        <h2 id="gate-title">${title}</h2>
        <p class="gate-note">${note}</p>
        <label for="gate-pass">교사 모드 비밀번호</label>
        <input id="gate-pass" type="password" inputmode="numeric" autocomplete="off" maxlength="30">
        <p class="gate-error" id="gate-error" role="alert"></p>
        <div class="gate-actions"><button type="button" class="gate-cancel" id="gate-cancel">${cancelLabel}</button><button type="submit" class="gate-ok" id="gate-ok">들어가기</button></div>
      </form>
    </dialog>`);
  const dialog = document.getElementById('gate-dialog');
  const input = dialog.querySelector('#gate-pass'), error = dialog.querySelector('#gate-error');
  let onPass = () => {}, onCancel = () => {};
  const close = () => { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); };
  dialog.querySelector('#gate-cancel').onclick = () => { close(); onCancel(); };
  dialog.addEventListener('cancel', ev => { ev.preventDefault(); close(); onCancel(); });
  dialog.querySelector('#gate-form').onsubmit = async ev => {
    ev.preventDefault();
    if (!globalThis.crypto?.subtle) { error.textContent = '이 주소에서는 교사 모드를 켤 수 없어요(https 주소에서 열어 주세요).'; return; }
    if (await checkTeacherPassword(input.value)) { setTeacherMode(true); close(); onPass(); }
    else { error.textContent = '비밀번호가 맞지 않아요. 다시 넣어 주세요.'; input.select(); }
  };
  return {
    open(pass, cancel) {
      onPass = pass; onCancel = cancel;
      input.value = ''; error.textContent = '';
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
      input.focus();
    },
  };
}

// 첫 화면: data-teacher-gate가 붙은 폴더 링크를 누르면 비밀번호를 묻고 바로 들어가요.
export function setupTeacherFolderLinks() {
  const links = document.querySelectorAll('a[data-teacher-gate]');
  if (!links.length) return;
  const dialog = passwordDialog({ title: '교사용 자료', note: '선생님만 들어갈 수 있는 폴더예요. 비밀번호를 넣으면 교사 모드가 켜지고 바로 들어가요.', cancelLabel: '취소' });
  links.forEach(link => link.addEventListener('click', ev => {
    if (teacherMode.on) return;
    ev.preventDefault();
    dialog.open(() => { location.href = link.href; }, () => link.focus());
  }));
}

// 교사용 페이지: 교사 모드가 꺼져 있으면 내용을 가린 채 비밀번호를 물어요. 머리글에는 ‘교사 모드 끄기’ 단추를 둬요.
export function guardTeacherPage({ home = '../' } = {}) {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  if (header && !header.querySelector('.teacher-off')) {
    header.insertAdjacentHTML('beforeend', '<button type="button" class="teacher-off">교사 모드 끄기</button>');
    header.querySelector('.teacher-off').onclick = () => { setTeacherMode(false); location.href = home; };
  }
  const unlock = () => { root.classList.remove('teacher-locked'); document.dispatchEvent(new Event('teacher-unlocked')); };
  if (teacherMode.on) { unlock(); return true; }
  root.classList.add('teacher-locked');
  passwordDialog({ title: '교사용 자료', note: '이 페이지는 교사 모드에서만 볼 수 있어요.', cancelLabel: '첫 화면으로' })
    .open(unlock, () => { location.href = home; });
  return false;
}
