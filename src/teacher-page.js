// 교사용 자료 목록 페이지: 테마 단추와 교사 모드 잠금(src/teacher-gate.js).
import { setupTheme } from './theme.js';
import { guardTeacherPage } from './teacher-gate.js';
setupTheme();
guardTeacherPage({ home: '../' });

// 보고서 시트 점검: 제출 주소(기본·학년별)마다 웹 앱을 열어 보고, 시트의 Code.gs가 최신인지 알려 줘요.
// 웹 앱의 확인용 주소(doGet)만 열어요. 학생 보고서는 읽지도 보내지도 않아요. 누를 때만 확인해요.
import { SUBMIT_URL, SUBMIT_URL_BY_GRADE } from './submission-config.js';
import { SHEET_CODE_VERSION } from './sheet-version.js';
const targets = () => {
  const list = [];
  for (const [grade, url] of Object.entries(SUBMIT_URL_BY_GRADE)) if (url) list.push([`${grade}학년 시트`, url]);
  const graded = Object.entries(SUBMIT_URL_BY_GRADE).filter(([, url]) => url).map(([g]) => g);
  if (SUBMIT_URL && !list.some(([, url]) => url === SUBMIT_URL)) list.push([graded.length ? `기본 시트(${['1', '2', '3'].filter(g => !graded.includes(g)).join('·')}학년)` : '보고서 시트', SUBMIT_URL]);
  return list;
};
const button = document.getElementById('sheet-check-btn'), out = document.getElementById('sheet-check-list');
if (button && out) button.onclick = async () => {
  button.disabled = true;
  out.innerHTML = '';
  const list = targets();
  if (!list.length) out.innerHTML = '<li>제출 주소가 없어요(src/submission-config.js).</li>';
  for (const [name, url] of list) {
    const li = document.createElement('li');
    li.textContent = `${name}: 확인하는 중…`;
    out.append(li);
    try {
      const res = await fetch(url);
      const got = await res.json();
      const version = got.version ?? '';
      li.dataset.state = !got.ok ? 'error' : version === SHEET_CODE_VERSION ? 'ok' : 'old';
      li.textContent = !got.ok ? `${name}: 응답이 이상해요. 배포 설정을 확인해 주세요.`
        : version === SHEET_CODE_VERSION ? `${name}: 작동해요 · 최신 코드(${version})`
        : `${name}: 작동하지만 예전 코드예요(${version || '버전 없음'} → 최신 ${SHEET_CODE_VERSION}). 저장소의 Code.gs를 붙여 넣고 setup 실행 → 배포 관리에서 새 버전으로 배포해 주세요.`;
    } catch {
      li.dataset.state = 'error';
      li.textContent = `${name}: 응답이 없어요. 인터넷 연결이나 학교 방화벽, 배포(액세스: 모든 사용자)를 확인해 주세요.`;
    }
  }
  button.disabled = false;
};
