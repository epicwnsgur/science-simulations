import { SUBMIT_URL } from './submission-config.js';

// 개념 확인 단계 아래의 ‘선생님께 보고서 제출하기’. 예상·관찰·설명과 사용 후기를 선생님 구글 시트(Apps Script 웹 앱)로 보냅니다. 퀴즈 결과는 보내지 않아요.
// 순서: [보고서 제출하기] → 미리보기 → [최종 제출하기] → 서버가 저장했다고 답하면 제출 완료.
// 보고서마다 제출 ID를 하나 정해 두고 재시도할 때도 같은 ID를 보내므로, 응답을 못 받아 다시 눌러도 시트에는 한 번만 저장돼요.
// report(): 보낼 내용, check(): 아직 보낼 수 없으면 안내 글, onSubmitted(): 제출을 마쳤을 때(글 잠그기).
// 학번과 이름은 비밀번호 확인처럼 두 번 적고, 두 칸이 같아야 제출할 수 있어요.
// [PDF로 저장]은 같은 보고서 내용을 인쇄용 화면으로 만들어 브라우저 인쇄 창을 열어요(대상: ‘PDF로 저장’). 서버로는 보내지 않아요.
const plain = value => value.replace(/\s/g, '');
// 학번 5자리: 학년 1자리 + 반 2자리 + 번호 2자리. 시트는 반(2~3번째 자리)으로 줄을 모아요.
const validId = id => /^\d{5}$/.test(id) && Number(id.slice(1, 3)) >= 1;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const stamp = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function newSubmissionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function mountReportSubmit(container, { slug, report, check, onSubmitted = () => {} }, url = SUBMIT_URL) {
  if (!url) return { reset() {} };
  // 이 탭이 열려 있는 동안만 기억해요: 수업 코드, 쓰던 후기, 이 보고서의 제출 ID, 제출 완료 여부.
  // 학번·이름은 함께 쓰는 컴퓨터에서 앞 학생 이름으로 제출되지 않도록 기억하지 않아요.
  const key = `report:${slug}`;
  let store = {};
  try { store = JSON.parse(sessionStorage.getItem(key)) ?? {}; } catch { /* 처음 상태로 시작해요. */ }
  const persist = () => { try { sessionStorage.setItem(key, JSON.stringify(store)); } catch { /* 저장하지 못해도 제출에는 지장이 없어요. */ } };

  container.innerHTML = `
    <section class="feedback-box" aria-labelledby="feedback-title">
      <h3 id="feedback-title">시뮬레이션 사용 후기 <span class="optional-tag">선택</span></h3>
      <label class="writing-label" for="report-feedback">시뮬레이션을 사용하면서 좋았던 점이나 불편했던 점이 있었나요? 더 편리하게 고쳤으면 하는 부분이 있다면 자유롭게 적어 주세요.</label>
      <textarea id="report-feedback" rows="3" maxlength="1000" placeholder="예: 버튼이 찾기 쉬웠어요. 글씨가 더 컸으면 좋겠어요."></textarea>
      <p class="poe-hint">쓰지 않아도 제출할 수 있어요. 과학 설명은 위의 ‘설명하기’ 칸에 써 주세요.</p>
    </section>
    <form class="submit-report" novalidate aria-labelledby="submit-title">
      <h3 id="submit-title">선생님께 보고서 제출하기</h3>
      <p class="poe-hint">[보고서 제출하기]를 누르면 먼저 보낼 내용을 보여 줘요. 확인한 뒤 [최종 제출하기]를 눌러야 제출돼요.</p>
      <div class="submit-fields">
        <label class="submit-code">수업 코드<input id="submit-code" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="칠판의 숫자"></label>
        <label>학번<input id="submit-id" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="예: 2학년 3반 15번 → 20315"></label>
        <label>학번 확인<input id="submit-id-confirm" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="학번 5자리를 한 번 더"><small class="submit-match" data-for="id" aria-live="polite"></small></label>
        <label>이름<input id="submit-name" autocomplete="off" maxlength="20" placeholder="예: 홍길동"></label>
        <label>이름 확인<input id="submit-name-confirm" autocomplete="off" maxlength="20" placeholder="이름을 한 번 더"><small class="submit-match" data-for="name" aria-live="polite"></small></label>
      </div>
      <div class="poe-actions"><p class="poe-hint">학번과 이름을 두 번씩 똑같이 적어야 제출할 수 있어요.</p><div class="submit-buttons"><button class="secondary big" id="save-pdf" type="button">PDF로 저장</button><button class="primary big" id="submit-report" type="submit" disabled>보고서 제출하기</button></div></div>
      <p class="submit-status" role="status" aria-live="polite"></p>
    </form>
    <section class="submit-done" hidden aria-labelledby="done-title" tabindex="-1">
      <h3 id="done-title">✔ 보고서 제출 완료</h3>
      <p class="done-message"></p>
      <p class="done-time"></p>
      <button class="primary big" type="button" disabled>제출 완료</button>
      <p class="poe-hint">제출한 보고서는 고칠 수 없어요. 다시 해야 하면 선생님께 말씀드리세요.</p>
    </section>
    <dialog class="report-preview" aria-labelledby="preview-title">
      <div class="preview-body" tabindex="0">
        <h2 id="preview-title">과학 탐구 보고서 제출 전 확인</h2>
        <p class="poe-hint">아래 내용이 그대로 선생님께 전송돼요. 고칠 곳이 있으면 [수정하기]를 눌러요.</p>
        <div class="preview-content"></div>
      </div>
      <p class="preview-status" role="status" aria-live="polite"></p>
      <div class="preview-actions"><button class="secondary big" type="button" id="preview-edit">수정하기</button><button class="primary big" type="button" id="preview-submit">최종 제출하기</button></div>
    </dialog>`;
  const form = container.querySelector('form'), button = form.querySelector('#submit-report'), status = form.querySelector('.submit-status');
  const feedback = container.querySelector('#report-feedback'), done = container.querySelector('.submit-done');
  const dialog = container.querySelector('dialog'), previewStatus = dialog.querySelector('.preview-status');
  const editButton = dialog.querySelector('#preview-edit'), finalButton = dialog.querySelector('#preview-submit');
  const input = id => form.querySelector(`#submit-${id}`);
  const pairs = { id: [input('id'), input('id-confirm')], name: [input('name'), input('name-confirm')] };
  input('code').value = store.code ?? '';
  feedback.value = store.feedback ?? '';
  const show = (text, state = '') => { status.textContent = text; status.dataset.state = state; };
  const showInDialog = (text, state = '') => { previewStatus.textContent = text; previewStatus.dataset.state = state; };
  let sending = false, snapshot = null;
  const pageTitle = document.title;

  // 두 칸이 같은지 보여 주고, 학번·이름이 모두 같을 때만 제출 버튼을 켭니다. 확인 칸을 다 쓰기 전에는 ‘다르다’고 하지 않아요.
  function refresh() {
    let ready = true;
    for (const [name, [first, again]] of Object.entries(pairs)) {
      const a = plain(first.value), b = plain(again.value), same = a !== '' && a === b;
      const out = form.querySelector(`.submit-match[data-for="${name}"]`);
      const differs = b !== '' && !same && (!a.startsWith(b) || b.length >= a.length);
      out.textContent = same ? '✔ 같아요' : differs ? `✖ 위의 ${name === 'id' ? '학번' : '이름'}과 달라요` : '';
      out.dataset.state = same ? 'done' : differs ? 'error' : '';
      again.setAttribute('aria-invalid', String(differs));
      ready &&= same;
    }
    button.disabled = sending || !!store.submitted || !ready;
  }
  for (const [first, again] of Object.values(pairs)) {
    for (const el of [first, again]) el.addEventListener('input', () => { if (status.dataset.state === 'error') show(''); refresh(); });
    // 위 칸을 복사해 붙이면 확인하는 뜻이 없으니 직접 다시 쓰게 해요.
    again.addEventListener('paste', e => { e.preventDefault(); show('확인 칸에는 붙여 넣지 말고 직접 한 번 더 적어 주세요.', 'error'); });
  }
  input('code').addEventListener('input', () => { store.code = input('code').value.trim(); persist(); });
  feedback.addEventListener('input', () => { store.feedback = feedback.value; persist(); });

  // 1단계: 확인하고 미리보기 열기. 이때는 서버로 아무것도 보내지 않아요.
  form.onsubmit = e => {
    e.preventDefault();
    if (store.submitted || sending) return;
    const who = { code: input('code').value.trim(), studentId: plain(pairs.id[0].value), name: plain(pairs.name[0].value) };
    const problem = !who.code ? '수업 코드를 적어 주세요.'
      : !validId(who.studentId) ? '학번은 숫자 5자리로 적어 주세요. (예: 2학년 3반 15번 → 20315)'
      : who.studentId !== plain(pairs.id[1].value) ? '학번 두 칸이 서로 달라요. 다시 확인해 주세요.'
      : !who.name ? '이름을 적어 주세요.'
      : who.name !== plain(pairs.name[1].value) ? '이름 두 칸이 서로 달라요. 다시 확인해 주세요.'
      : check();
    if (problem) return show(problem, 'error');
    show('');
    // 미리보기에 보여 준 내용과 똑같은 것을 보내도록, 지금 내용을 그대로 떠 둡니다.
    snapshot = { ...report(), feedback: feedback.value.trim(), ...who };
    dialog.querySelector('.preview-content').innerHTML = previewHTML(snapshot);
    showInDialog('');
    finalButton.disabled = false; editButton.disabled = false; finalButton.textContent = '최종 제출하기';
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    dialog.querySelector('.preview-body').scrollTop = 0;
    finalButton.focus();
  };
  const closeDialog = () => { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); };
  editButton.onclick = () => { if (!sending) { closeDialog(); button.focus(); } };
  dialog.addEventListener('cancel', e => { if (sending) e.preventDefault(); });

  // 2단계: 최종 제출. 서버가 ok라고 답해야만 제출 완료로 바꿔요.
  finalButton.onclick = async () => {
    if (sending || store.submitted || !snapshot) return;
    sending = true; finalButton.disabled = true; editButton.disabled = true; refresh();
    finalButton.innerHTML = '<span class="spinner" aria-hidden="true"></span> 제출하는 중…';
    showInDialog('선생님 시트에 저장하고 있어요. 잠시만 기다려 주세요.');
    if (!store.submissionId) { store.submissionId = newSubmissionId(); persist(); }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25000);
    try {
      // 글자(text/plain)로 보내면 사전 확인 요청 없이 Apps Script 웹 앱에 바로 전달돼요.
      const response = await fetch(url, { method: 'POST', body: JSON.stringify({ ...snapshot, submissionId: store.submissionId }), signal: controller.signal });
      const result = await response.json();
      if (result.ok !== true) { showInDialog(result.message || '제출하지 못했어요. 다시 눌러 주세요.', 'error'); return; }
      store.submitted = { at: result.submittedAt || new Date().toISOString(), message: result.duplicate ? '이 보고서는 이미 제출되어 있어요. 시트에는 한 번만 저장됐어요.' : '보고서가 정상적으로 제출되었습니다.', who: `${snapshot.studentId} ${snapshot.name}` };
      persist();
      closeDialog();
      showDone();
      onSubmitted();
      done.focus({ preventScroll: true }); done.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    } catch {
      // 요청은 갔지만 답을 못 받았을 수도 있어요. 다시 눌러도 같은 제출 ID라서 두 번 저장되지 않아요.
      showInDialog('제출 결과를 확인하지 못했어요. 인터넷 연결을 확인하고 [최종 제출하기]를 다시 눌러 주세요. 다시 눌러도 같은 보고서는 한 번만 저장돼요.', 'error');
    } finally {
      clearTimeout(timer); sending = false;
      if (!store.submitted) { finalButton.disabled = false; editButton.disabled = false; finalButton.textContent = '다시 최종 제출하기'; }
      refresh();
    }
  };

  // PDF로 저장: 학번·이름 두 칸이 맞게 적혀 있으면 넣고, 아니면 손으로 쓸 수 있게 빈칸으로 둬요.
  function savePDF() {
    const id = plain(pairs.id[0].value), name = plain(pairs.name[0].value);
    const who = validId(id) && id === plain(pairs.id[1].value) && name && name === plain(pairs.name[1].value) ? { studentId: id, name } : { studentId: '', name: '' };
    const r = { ...report(), feedback: feedback.value.trim(), ...who };
    let sheet = document.getElementById('print-report');
    if (!sheet) { sheet = document.createElement('article'); sheet.id = 'print-report'; document.body.append(sheet); }
    sheet.innerHTML = printHTML(r, store.submitted);
    // 크롬은 문서 제목을 PDF 파일 이름으로 써요.
    document.title = [`${r.title} 탐구 보고서`, r.studentId, r.name].filter(Boolean).join('_');
    const restore = () => { document.title = pageTitle; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
    setTimeout(restore, 1000);
  }
  form.querySelector('#save-pdf').onclick = savePDF;

  function showDone() {
    const s = store.submitted;
    done.hidden = !s;
    form.querySelectorAll('input, button:not(#save-pdf)').forEach(el => { el.disabled = !!s || (el === button && button.disabled); });
    feedback.readOnly = !!s;
    if (!s) return refresh();
    done.querySelector('.done-message').textContent = `${s.message} (${s.who})`;
    done.querySelector('.done-time').textContent = `제출 시각: ${stamp(s.at)}`;
    button.textContent = '제출 완료';
  }
  if (store.submitted) { showDone(); onSubmitted(); } else refresh();

  return {
    // ‘처음부터’를 누르면 새 보고서예요: 새 제출 ID로 다시 낼 수 있어요. 수업 코드는 남겨 둬요.
    reset() {
      store = { code: store.code };
      persist();
      feedback.value = ''; feedback.readOnly = false;
      for (const [first, again] of Object.values(pairs)) { first.value = ''; again.value = ''; }
      form.querySelectorAll('input, button:not(#submit-report)').forEach(el => { el.disabled = false; });
      button.textContent = '보고서 제출하기';
      done.hidden = true; show(''); refresh();
    },
  };
}

// 인쇄용 보고서: 흰 바탕에 검은 글씨, A4에 맞춘 깔끔한 모양(스타일은 theme-electric.css의 @media print).
function printHTML(r, submitted) {
  const id = r.studentId, multi = r.sections.length > 1, today = stamp(new Date().toISOString()).slice(0, 10);
  const blank = '<span class="blank"></span>';
  const info = (label, value) => `<div><dt>${label}</dt><dd>${value || blank}</dd></div>`;
  const item = (label, value) => `<div class="print-item"><dt>${label}</dt><dd>${value ? escape(value) : '<span class="empty">(쓰지 않음)</span>'}</dd></div>`;
  return `
    <div class="print-head"><p class="print-kicker">과학 탐구 보고서</p><h1>${escape(r.title)}</h1><p class="print-date">작성일 ${today}${submitted ? ` · 선생님께 제출함 ${stamp(submitted.at)}` : ''}</p></div>
    <dl class="print-info">${info('학년', id && `${Number(id[0])}학년`)}${info('반', id && `${Number(id.slice(1, 3))}반`)}${info('번호', id && `${Number(id.slice(3))}번`)}${info('이름', escape(r.name))}</dl>
    ${r.sections.map((s, i) => `<section class="print-section"><h2>${multi ? `실험 ${i + 1}. ${escape(s.name)}` : '탐구 기록'}</h2><dl>${item('예상', s.prediction)}${item('예상한 까닭', s.reason)}${item('관찰', s.observation)}${item('설명', s.explanation)}</dl></section>`).join('')}
    ${r.feedback ? `<section class="print-section"><h2>시뮬레이션 사용 후기</h2><dl>${item('후기', r.feedback)}</dl></section>` : ''}
    <p class="print-foot">준혁T의 과학 실험실 · 예상 → 관찰 → 설명</p>`;
}

function previewHTML(r) {
  const id = r.studentId, multi = r.sections.length > 1;
  const row = (label, value) => `<div><dt>${label}</dt><dd>${value === '' ? '<span class="empty">(쓰지 않음)</span>' : escape(value)}</dd></div>`;
  return `
    <section><h3>기본 정보</h3><dl class="preview-grid">${row('학년', `${Number(id[0])}학년`)}${row('반', `${Number(id.slice(1, 3))}반`)}${row('번호', `${Number(id.slice(3))}번`)}${row('이름', r.name)}</dl></section>
    ${r.sections.map((s, i) => `<section><h3>${multi ? `실험 ${i + 1}. ${escape(s.name)}` : '탐구 기록'}</h3><dl>${row('예상', s.prediction)}${row('예상한 까닭', s.reason)}${row('관찰', s.observation)}${row('설명', s.explanation)}</dl></section>`).join('')}
    <section><h3>퀴즈 결과</h3><p class="poe-hint">퀴즈는 스스로 확인하는 활동이라 보고서에 넣지 않아요.</p></section>
    <section><h3>시뮬레이션 사용 후기</h3><dl>${row('후기', r.feedback)}</dl></section>`;
}
