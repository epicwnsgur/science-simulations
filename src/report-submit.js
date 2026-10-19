import { SUBMIT_URL } from './submission-config.js';

// 개념 확인 단계 아래의 ‘선생님께 제출하기’ 칸. 예상·관찰·설명을 선생님 구글 시트(Apps Script 웹 앱)로 보냅니다. 퀴즈 결과는 보내지 않아요.
// report(): 보낼 내용, check(): 아직 보낼 수 없으면 안내 글을 돌려줍니다.
// 학번과 이름은 비밀번호 확인처럼 두 번 적고, 두 칸이 같아야 제출할 수 있어요.
const STORE = 'report-class-code';
const remembered = () => { try { return sessionStorage.getItem(STORE) ?? ''; } catch { return ''; } };
const remember = value => { try { sessionStorage.setItem(STORE, value); } catch { /* 저장하지 못해도 제출에는 지장이 없어요. */ } };
const plain = value => value.replace(/\s/g, '');
// 학번 5자리: 학년 1자리 + 반 2자리 + 번호 2자리. 시트는 반(2~3번째 자리)으로 줄을 모아요.
const validId = id => /^\d{5}$/.test(id) && Number(id.slice(1, 3)) >= 1;

export function mountReportSubmit(container, { report, check }, url = SUBMIT_URL) {
  if (!url) return () => {};
  container.innerHTML = `
    <form class="submit-report" novalidate aria-labelledby="submit-title">
      <h3 id="submit-title">선생님께 보고서 제출하기</h3>
      <p class="poe-hint">예상·관찰·설명이 선생님 구글 시트로 전송돼요. 고친 뒤 다시 제출하면 새 제출로 함께 남아요.</p>
      <div class="submit-fields">
        <label class="submit-code">수업 코드<input id="submit-code" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="칠판의 숫자"></label>
        <label>학번<input id="submit-id" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="예: 2학년 3반 15번 → 20315"></label>
        <label>학번 확인<input id="submit-id-confirm" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="학번 5자리를 한 번 더"><small class="submit-match" data-for="id" aria-live="polite"></small></label>
        <label>이름<input id="submit-name" autocomplete="off" maxlength="20" placeholder="예: 홍길동"></label>
        <label>이름 확인<input id="submit-name-confirm" autocomplete="off" maxlength="20" placeholder="이름을 한 번 더"><small class="submit-match" data-for="name" aria-live="polite"></small></label>
      </div>
      <div class="poe-actions"><p class="poe-hint">학번과 이름을 두 번씩 똑같이 적어야 제출할 수 있어요.</p><button class="primary" id="submit-report" type="submit" disabled>제출하기</button></div>
      <p class="submit-status" role="status" aria-live="polite"></p>
    </form>`;
  const form = container.querySelector('form'), button = form.querySelector('#submit-report'), status = form.querySelector('.submit-status');
  const input = id => form.querySelector(`#submit-${id}`);
  const pairs = { id: [input('id'), input('id-confirm')], name: [input('name'), input('name-confirm')] };
  input('code').value = remembered();
  const show = (text, state = '') => { status.textContent = text; status.dataset.state = state; };
  let sending = false;

  // 두 칸이 같은지 보여 주고, 학번·이름이 모두 같을 때만 제출 버튼을 켭니다. 확인 칸을 다 쓰기 전에는 ‘다르다’고 하지 않아요.
  function refresh() {
    let ready = true;
    for (const [key, [first, again]] of Object.entries(pairs)) {
      const a = plain(first.value), b = plain(again.value), same = a !== '' && a === b;
      const out = form.querySelector(`.submit-match[data-for="${key}"]`);
      const differs = b !== '' && !same && (!a.startsWith(b) || b.length >= a.length);
      out.textContent = same ? '✔ 같아요' : differs ? `✖ 위의 ${key === 'id' ? '학번' : '이름'}과 달라요` : '';
      out.dataset.state = same ? 'done' : differs ? 'error' : '';
      again.setAttribute('aria-invalid', String(differs));
      ready &&= same;
    }
    button.disabled = sending || !ready;
  }
  for (const [first, again] of Object.values(pairs)) {
    for (const el of [first, again]) el.addEventListener('input', () => { if (status.dataset.state === 'error') show(''); refresh(); });
    // 위 칸을 복사해 붙이면 확인하는 뜻이 없으니 직접 다시 쓰게 해요.
    again.addEventListener('paste', e => { e.preventDefault(); show('확인 칸에는 붙여 넣지 말고 직접 한 번 더 적어 주세요.', 'error'); });
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const who = { code: input('code').value.trim(), studentId: plain(pairs.id[0].value), name: plain(pairs.name[0].value) };
    const problem = !who.code ? '수업 코드를 적어 주세요.'
      : !validId(who.studentId) ? '학번은 숫자 5자리로 적어 주세요. (예: 2학년 3반 15번 → 20315)'
      : who.studentId !== plain(pairs.id[1].value) ? '학번 두 칸이 서로 달라요. 다시 확인해 주세요.'
      : !who.name ? '이름을 적어 주세요.'
      : who.name !== plain(pairs.name[1].value) ? '이름 두 칸이 서로 달라요. 다시 확인해 주세요.'
      : check();
    if (problem) return show(problem, 'error');
    remember(who.code);
    sending = true; refresh(); show('제출하는 중이에요…');
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
      clearTimeout(timer); sending = false; refresh();
    }
  };
  return () => show('');
}
