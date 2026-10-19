import { SUBMIT_URL } from './submission-config.js';

// 개념 확인 단계 아래의 ‘선생님께 제출하기’ 칸. 예상·관찰·설명과 퀴즈 결과를 선생님 구글 시트(Apps Script 웹 앱)로 보냅니다.
// report(): 보낼 내용, check(): 아직 보낼 수 없으면 안내 글을 돌려줍니다.
const STORE = 'report-submitter';
const remembered = () => { try { return JSON.parse(sessionStorage.getItem(STORE)) ?? {}; } catch { return {}; } };
const remember = value => { try { sessionStorage.setItem(STORE, JSON.stringify(value)); } catch { /* 저장하지 못해도 제출에는 지장이 없어요. */ } };

export function mountReportSubmit(container, { report, check }, url = SUBMIT_URL) {
  if (!url) return () => {};
  const saved = remembered();
  container.innerHTML = `
    <form class="submit-report" novalidate aria-labelledby="submit-title">
      <h3 id="submit-title">선생님께 보고서 제출하기</h3>
      <p class="poe-hint">예상·관찰·설명과 퀴즈 결과가 선생님 구글 시트로 전송돼요. 고친 뒤 다시 제출하면 새 제출로 함께 남아요.</p>
      <div class="submit-fields">
        <label>수업 코드<input id="submit-code" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="칠판의 숫자"></label>
        <label>학번<input id="submit-id" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="예: 20315"></label>
        <label>이름<input id="submit-name" autocomplete="off" maxlength="20" placeholder="예: 홍길동"></label>
      </div>
      <div class="poe-actions"><p class="poe-hint">제출하기 전에 학번과 이름을 꼭 확인하세요.</p><button class="primary" id="submit-report" type="submit">제출하기</button></div>
      <p class="submit-status" role="status" aria-live="polite"></p>
    </form>`;
  const form = container.querySelector('form'), button = form.querySelector('#submit-report'), status = form.querySelector('.submit-status');
  const fields = { code: form.querySelector('#submit-code'), studentId: form.querySelector('#submit-id'), name: form.querySelector('#submit-name') };
  for (const [key, input] of Object.entries(fields)) input.value = saved[key] ?? '';
  const show = (text, state = '') => { status.textContent = text; status.dataset.state = state; };

  form.onsubmit = async e => {
    e.preventDefault();
    const who = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim()]));
    const problem = !who.code ? '수업 코드를 적어 주세요.' : !/^\d{3,10}$/.test(who.studentId.replace(/\s/g, '')) ? '학번은 숫자로만 적어 주세요. (예: 20315)' : !who.name ? '이름을 적어 주세요.' : check();
    if (problem) return show(problem, 'error');
    remember(who);
    button.disabled = true; show('제출하는 중이에요…');
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      // 글자(text/plain)로 보내면 사전 확인 요청 없이 Apps Script 웹 앱에 바로 전달돼요.
      const response = await fetch(url, { method: 'POST', body: JSON.stringify({ ...report(), ...who }), signal: controller.signal });
      const result = await response.json();
      if (!result.ok) return show(result.message, 'error');
      show(`✔ ${result.message} (${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`, 'done');
    } catch {
      show('제출하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. 계속 안 되면 선생님께 알려 주세요.', 'error');
    } finally {
      clearTimeout(timer); button.disabled = false;
    }
  };
  return () => show('');
}
