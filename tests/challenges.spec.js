import { test, expect } from '@playwright/test';
import { peelAll } from './poe-helpers.js';

// 도전 과제(선택, src/challenges.js, src/challenge-ui.js): 개념 정리의 퀴즈 아래
const OHM = '/simulations/ohms-law/';
const LABS = ['electric-current', 'ohms-law', 'series-parallel', 'coil-magnetic-field', 'electric-swing', 'electric-motor',
  'stellar-parallax', 'star-brightness', 'star-color', 'milky-way', 'expanding-universe', 'gas-pressure', 'boyles-law', 'charles-law'];
const startAt = (page, slug, exp) => page.addInitScript(([k, v]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, v); },
  [`poe:${slug}`, JSON.stringify({ current: 0, reviewed: true, onReview: false, reviewAnswers: [], quiz: null, locked: false, exps: [exp] })]);
const DONE = { stage: 'explain', reached: 2, prediction: { index: 0, choice: '전류의 세기도 2배, 3배로 커질 것 같아요.', reason: '수로 모형에서 펌프를 세게 하면 물도 세게 흘렀으니까요.' }, choice: null, reason: '', observation: '', saved: '전압을 높일수록 전류계의 값이 커졌어요. 2 V에서 100 mA였어요.', observed: true, explanation: '저항이 일정하면 전류의 세기는 전압에 비례해서 전압이 2배면 전류도 2배예요.', explained: true };

test('도전 과제: 14개 실험 모두에 있고, 글 칸 아래 도움 막대는 없음', async ({ page }) => {
  test.setTimeout(120000);
  for (const slug of LABS) {
    await startAt(page, slug, { ...DONE, prediction: { ...DONE.prediction, choice: '예상' } });
    await page.goto(`/simulations/${slug}/`);
    await expect(page.locator('.help-bar'), slug).toHaveCount(0);
    await expect(page.locator('#challenge .challenge-item').first(), slug).toBeVisible();
    await expect(page.locator('#challenge-think'), slug).toBeVisible();
    await page.evaluate(() => sessionStorage.clear());
  }
  // 실험이 여럿인 마찰 전기에는 넣지 않았어요.
  await page.goto('/simulations/friction-electricity/');
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
