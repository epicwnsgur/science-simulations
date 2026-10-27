import { test, expect } from '@playwright/test';
import { openObserveUnlocked, peelAll } from './poe-helpers.js';

// 수준별 지원(src/supports.js, src/scaffold-ui.js): 글 칸 아래 ‘막히면 도움 받기’와 개념 정리 아래 ‘도전 과제(선택)’
const OHM = '/simulations/ohms-law/';
const LABS = ['electric-current', 'ohms-law', 'series-parallel', 'coil-magnetic-field', 'electric-swing', 'electric-motor',
  'stellar-parallax', 'star-brightness', 'star-color', 'milky-way', 'expanding-universe'];
const startAt = (page, slug, exp) => page.addInitScript(([k, v]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, v); },
  [`poe:${slug}`, JSON.stringify({ current: 0, reviewed: true, onReview: false, reviewAnswers: [], quiz: null, locked: false, exps: [exp] })]);
const PREDICT = { stage: 'predict', reached: 0, prediction: null, choice: null, reason: '', observation: '', saved: '', observed: false, explanation: '', explained: false };
const DONE = { stage: 'explain', reached: 2, prediction: { index: 0, choice: '전류의 세기도 2배, 3배로 커질 것 같아요.', reason: '수로 모형에서 펌프를 세게 하면 물도 세게 흘렀으니까요.' }, choice: null, reason: '', observation: '', saved: '전압을 높일수록 전류계의 값이 커졌어요. 2 V에서 100 mA였어요.', observed: true, explanation: '저항이 일정하면 전류의 세기는 전압에 비례해서 전압이 2배면 전류도 2배예요.', explained: true };

test('도움 받기: 힌트는 하나씩 열리고, 낱말을 누르면 글 칸에 들어가며, 문장 틀의 빈칸을 채워야 저장됨', async ({ page }) => {
  await startAt(page, 'ohms-law', PREDICT);
  await page.goto(OHM);
  const help = page.locator('[data-help-for="prediction-reason"]'), box = page.locator('#prediction-reason');
  await expect(help).toBeVisible();
  await expect(help.locator('.help-hints li')).toHaveCount(0);
  // ① 힌트: 누를 때마다 하나씩 더 보여요.
  await help.locator('[data-help="hint"]').click();
  await expect(help.locator('.help-hints li')).toHaveCount(1);
  await expect(help.locator('[data-help="hint"]')).toContainText('힌트 2 보기');
  await help.locator('[data-help="hint"]').click();
  await expect(help.locator('.help-hints li')).toHaveCount(2);
  await expect(help.locator('[data-help="hint"]')).toBeDisabled();
  // ③ 문장 틀: 넣으면 첫 빈칸이 골라져 있어요.
  await help.locator('[data-help="frame"]').click();
  await expect(box).toHaveValue(/^내 예상: .*___.*___/);
  expect(await box.evaluate(el => el.value.slice(el.selectionStart, el.selectionEnd))).toBe('___');
  await expect(page.locator('.char-count[data-for="prediction-reason"]')).toContainText('빈칸');
  // ② 낱말 상자: 고른 빈칸에 낱말이 들어가고, 다음 빈칸이 골라져요.
  await help.locator('[data-help="words"]').click();
  await help.locator('.help-chip', { hasText: '2배가 된다' }).click();
  await expect(box).toHaveValue(/전류의 세기는 2배가 된다\. 그렇게 생각한 까닭은 ___ 때문이다\./);
  expect(await box.evaluate(el => el.value.slice(el.selectionStart, el.selectionEnd))).toBe('___');
  // 빈칸이 남아 있으면 저장되지 않아요.
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#start-observation').click();
  await expect(page.locator('#prediction-confirm')).toBeHidden();
  expect(await box.evaluate(el => el.validationMessage)).toContain('빈칸');
  // 빈칸에 한두 글자만 쓰면 ‘내가 쓴 글자’가 모자라요.
  await box.fill((await box.inputValue()).replace('___', '펌프'));
  await expect(page.locator('.char-count[data-for="prediction-reason"]')).toContainText('내가 쓴 글자');
  await page.locator('#start-observation').click();
  await expect(page.locator('#prediction-confirm')).toBeHidden();
  expect(await box.evaluate(el => el.validationMessage)).toContain('내가 쓴 글자');
  // 내 말로 채우면 저장돼요.
  await box.fill((await box.inputValue()).replace('펌프', '펌프를 세게 하면 물이 더 세게 흐르기'));
  await expect(page.locator('.char-count[data-for="prediction-reason"]')).toContainText('✓');
  await page.locator('#start-observation').click();
  await expect(page.locator('#prediction-confirm')).toBeVisible();
  await expect(page.locator('#confirm-reason')).toContainText('펌프를 세게 하면 물이 더 세게 흐르기 때문이다.');
  await page.locator('#confirm-prediction').click();
  // 예상을 저장하면 그 칸의 도움은 닫혀요(고칠 수 없는 글이라서).
  await page.locator('[data-goto=predict]').click();
  await expect(help).toBeHidden();
});

test('도움 받기: 본 힌트는 새로 고침해도 남고, 관찰 칸마다 따로 있음', async ({ page }) => {
  await openObserveUnlocked(page, '/simulations/electric-swing/');
  const bars = page.locator('#observation-parts .help-bar');
  await expect(bars).toHaveCount(3);
  await bars.nth(2).locator('[data-help="hint"]').click();
  await expect(bars.nth(2).locator('.help-hints li')).toHaveCount(1);
  await expect(bars.nth(0).locator('.help-hints li')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#observation-parts .help-bar').nth(2).locator('.help-hints li')).toHaveCount(1);
  // 관찰 칸의 낱말은 커서 자리에 띄어 써서 들어가요.
  const box = page.locator('#observation-record-3');
  await box.fill('전압을 크게 하자 그네가');
  await page.locator('#observation-parts .help-bar').nth(2).locator('[data-help="words"]').click();
  await page.locator('#observation-parts .help-bar').nth(2).locator('.help-chip', { hasText: '더 크게' }).click();
  await expect(box).toHaveValue('전압을 크게 하자 그네가 더 크게');
});

test('도움 받기·도전 과제: 11개 실험 모두에 있고, 예상·관찰·설명 칸마다 도움이 있음', async ({ page }) => {
  test.setTimeout(120000);
  for (const slug of LABS) {
    await startAt(page, slug, { ...DONE, prediction: { ...DONE.prediction, choice: '예상' } });
    await page.goto(`/simulations/${slug}/`);
    const parts = await page.locator('#observation-parts textarea').count();
    await expect(page.locator('.help-bar'), slug).toHaveCount(parts + 2);
    await expect(page.locator('#challenge .challenge-item').first(), slug).toBeVisible();
    await expect(page.locator('#challenge-think'), slug).toBeVisible();
    await page.evaluate(() => sessionStorage.clear());
  }
  // 실험이 여럿인 마찰 전기에는 넣지 않았어요.
  await page.goto('/simulations/friction-electricity/');
  await expect(page.locator('.help-bar')).toHaveCount(0);
  await expect(page.locator('#challenge')).toHaveCount(0);
});

test('도전 과제: 틀리면 힌트, 한 번 더 틀리면 풀이를 보여 주고, 결과는 미리보기·PDF에만 들어감(시트로는 안 보냄)', async ({ page }) => {
  await startAt(page, 'ohms-law', DONE);
  await page.goto(OHM);
  const ch = page.locator('#challenge');
  await expect(ch).toContainText('풀지 않아도 보고서를 낼 수 있어요');
  // 도전 1: 0.3(A로 답함) → 힌트, 300 → 해결
  await ch.locator('#challenge-input-0').fill('0.3');
  await ch.locator('[data-check="0"]').click();
  await expect(ch.locator('#challenge-feedback-0')).toContainText('힌트');
  await ch.locator('#challenge-input-0').fill('300');
  await ch.locator('#challenge-input-0').press('Enter');
  await expect(ch.locator('#challenge-feedback-0')).toContainText('힌트를 보고 해결했어요');
  await expect(ch.locator('#challenge-input-0')).not.toBeEditable();
  // 도전 3: 두 번 틀리면 풀이와 정답이 나와요.
  const opt = n => ch.locator(`button[data-item="2"][data-option="${n}"]`);
  await opt(0).click();
  await expect(ch.locator('#challenge-feedback-2')).toContainText('힌트');
  await opt(2).click();
  await expect(ch.locator('#challenge-feedback-2')).toContainText('정답: ② 저항이 더 작은 니크롬선');
  await expect(opt(1)).toHaveClass(/answer/);
  await expect(opt(1)).toBeDisabled();
  await page.locator('#challenge-think').fill('니크롬선이 뜨거워지면 저항이 커져서 그래프가 점점 덜 가파르게 휘어질 것 같아요.');
  await expect(ch.locator('.challenge-score')).toContainText('1문제 해결');
  // 새로 고침해도 남아요.
  await page.reload();
  await expect(page.locator('#challenge-feedback-0')).toContainText('힌트를 보고 해결했어요');
  await expect(page.locator('#challenge-think')).toHaveValue(/덜 가파르게/);
  // 제출: 미리보기에는 도전 과제가 보이고, 시트로 보내는 내용에는 없어요.
  const sent = [];
  await page.route('https://script.google.com/**', async route => { sent.push(JSON.parse(route.request().postData())); await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, submittedAt: new Date().toISOString() }) }); });
  await page.locator('#submit-code').fill('123456');
  for (const f of ['#submit-id', '#submit-id-confirm']) await page.locator(f).fill('20315');
  for (const f of ['#submit-name', '#submit-name-confirm']) await page.locator(f).fill('홍길동');
  await peelAll(page);
  await page.locator('#submit-report').click();
  const dialog = page.locator('.report-preview');
  await expect(dialog).toContainText('도전 과제 (선택)');
  await expect(dialog).toContainText('힌트를 보고 해결 · 내 답: 300 mA');
  await expect(dialog).toContainText('풀이를 보고 확인');
  await expect(dialog).toContainText('풀지 않음');
  await expect(dialog).toContainText('덜 가파르게');
  await page.locator('#preview-submit').click();
  await expect(page.locator('.submit-done')).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0].challenge).toBeUndefined();
  expect(sent[0].explanation).toBe(DONE.explanation);
  // PDF에도 들어가요.
  await page.evaluate(() => { window.print = () => {}; });
  await page.locator('#save-pdf').click();
  await expect(page.locator('#print-report')).toContainText('도전 과제 (선택)');
  await expect(page.locator('#print-report')).toContainText('니크롬선이 뜨거워지면');
});
