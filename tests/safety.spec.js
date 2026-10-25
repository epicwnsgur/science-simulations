// 수업 중 장난·실수에 대비한 기능: 붙여 넣기 막기, 임시 저장(창을 닫아도 남음), 뜻 없는 글 거르기, 보고서에 질문 함께 넣기.
import { test, expect } from '@playwright/test';
import { finishReview, savePrediction, peelAll } from './poe-helpers.js';

const URL_ = '/simulations/ohms-law/';
const REASON = '전압이 커지면 전류를 미는 힘이 커지니까 전류도 커질 것 같아요.';

test('붙여 넣기 막기: 키보드(Ctrl+V)·붙여 넣기 입력·끌어다 놓기 모두 막고 안내해요', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(URL_);
  await finishReview(page);
  const box = page.locator('#prediction-reason');
  await page.evaluate(() => navigator.clipboard.writeText('AI가 쓴 답을 복사해 붙여 넣은 글이에요. 아주 그럴듯해요.'));
  await box.click();
  await page.keyboard.press('Control+V');
  await expect(box).toHaveValue('');
  await expect(page.locator('.flow-toast')).toContainText('붙여 넣기는 할 수 없어요');
  const blocked = await box.evaluate(el => ['beforeinput', 'drop'].map(type => {
    const e = type === 'drop' ? new DragEvent('drop', { bubbles: true, cancelable: true }) : new InputEvent('beforeinput', { inputType: 'insertFromPaste', bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e.defaultPrevented;
  }));
  expect(blocked).toEqual([true, true]);
  // 직접 쓰는 것은 그대로 돼요.
  await box.pressSequentially('직접 써요');
  await expect(box).toHaveValue('직접 써요');
  // 사용 후기 칸도 붙여 넣기를 막아요.
  const feedbackBlocked = await page.locator('#report-feedback').evaluate(el => { const e = new InputEvent('beforeinput', { inputType: 'insertFromPaste', bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; });
  expect(feedbackBlocked).toBe(true);
});

test('임시 저장: 창을 닫았다가 다시 열어도 쓰던 글이 돌아오고, 앞 학생의 글이면 새로 시작할 수 있어요', async ({ context }) => {
  const first = await context.newPage();
  await first.goto(URL_);
  await finishReview(first);
  await first.locator('input[name="prediction"][value="0"]').check();
  await first.locator('#prediction-reason').fill(REASON);
  await expect(first.locator('.autosave-note').first()).toContainText('자동 저장됨');
  await first.close();
  // 창을 닫고 새로 열어요(새로 고침이 아니라 새 탭이에요).
  const again = await context.newPage();
  await again.goto(URL_);
  await expect(again.locator('#prediction-reason')).toHaveValue(REASON);
  await expect(again.locator('input[name="prediction"][value="0"]')).toBeChecked();
  await expect(again.locator('.draft-banner')).toContainText('임시 저장된 글을 불러왔어요');
  // 함께 쓰는 컴퓨터: 내 글이 아니면 지우고 처음부터(복습부터) 시작해요.
  again.once('dialog', d => d.accept());
  await again.locator('#draft-fresh').click();
  await expect(again.locator('.draft-banner')).toHaveCount(0);
  await expect(again.locator('#review-panel')).toBeVisible();
  await expect(again.locator('.review-choice.chosen')).toHaveCount(0);
  await again.close();
  const third = await context.newPage();
  await third.goto(URL_);
  await expect(third.locator('.draft-banner')).toHaveCount(0);
  await expect(third.locator('#review-panel')).toBeVisible();
});

test('임시 저장: 이 컴퓨터에 남긴 글은 3시간이 지나면 버려요', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(URL_);
  await finishReview(page);
  await page.locator('#prediction-reason').fill(REASON);
  // 마지막으로 쓴 시각을 4시간 전으로 바꿔요.
  await page.evaluate(() => { const k = 'draft:poe:ohms-law', v = JSON.parse(localStorage.getItem(k)); v.at -= 4 * 3600e3; localStorage.setItem(k, JSON.stringify(v)); });
  await page.close();
  const again = await context.newPage();
  await again.goto(URL_);
  await expect(again.locator('#review-panel')).toBeVisible();
  await expect(again.locator('#prediction-reason')).toHaveValue('');
  // 오래된 글은 지워지고, 새로 시작한 빈 기록만 남아요.
  expect(await again.evaluate(() => localStorage.getItem('draft:poe:ohms-law'))).not.toContain('전압이 커지면');
});

test('뜻 없는 글(ㅋㅋ·되풀이)·바르지 않은 말·앞 칸과 같은 글은 저장하지 않아요', async ({ page }) => {
  await page.goto(URL_);
  await finishReview(page);
  await page.locator('input[name="prediction"][value="0"]').check();
  const box = page.locator('#prediction-reason');
  for (const [text, why] of [['ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', /되풀이|ㅋㅋ/], ['가나다가나다가나다가나다가나다가나다가나다', /되풀이/], ['이거 존나 쉬운 문제 같아요 전류가 커질 것 같아요', /바르지 않은 말/]]) {
    await box.fill(text);
    await page.locator('#start-observation').click();
    await expect(page.locator('#prediction-confirm')).not.toBeVisible();
    expect(await box.evaluate(el => el.validationMessage)).toMatch(why);
  }
  await box.fill(REASON);
  await savePrediction(page);
  await expect(page.locator('#observe-panel')).toBeVisible();
});

test('보고서 미리보기와 PDF에 칸마다 질문이 함께 들어가요', async ({ page }) => {
  // 설명까지 마친 학생처럼 열어요.
  const done = { stage: 'explain', reached: 2, prediction: { index: 0, choice: '전류의 세기도 2배, 3배로 커질 것 같아요.', reason: REASON }, choice: null, reason: '', observation: '', saved: '전압을 높일수록 전류계의 값이 커졌어요. 2 V에서 100 mA였어요.', observed: true, explanation: '저항이 일정하면 전류의 세기는 전압에 비례해서 전압이 2배면 전류도 2배예요.', explained: true };
  await page.addInitScript(v => { if (!sessionStorage.getItem('poe:ohms-law')) sessionStorage.setItem('poe:ohms-law', v); }, JSON.stringify({ current: 0, reviewed: true, onReview: false, reviewAnswers: [], quiz: null, locked: false, exps: [done] }));
  await page.goto(URL_);
  const question = (await page.locator('#prediction-form legend').textContent()).replace(/^1\.\s*/, '');
  const explainQ = await page.locator('label[for="explanation-record"]').textContent();
  await page.locator('#submit-code').fill('123456');
  for (const f of ['#submit-id', '#submit-id-confirm']) await page.locator(f).fill('20315');
  for (const f of ['#submit-name', '#submit-name-confirm']) await page.locator(f).fill('홍길동');
  await peelAll(page);
  await page.locator('#submit-report').click();
  const dialog = page.locator('.report-preview');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.preview-q')).toHaveCount(4);
  await expect(dialog.locator('.preview-q').first()).toHaveText(question);
  await expect(dialog.locator('.preview-q').nth(3)).toHaveText(explainQ.trim());
  await page.locator('#preview-edit').click();
  await page.evaluate(() => { window.print = () => {}; });
  await page.locator('#save-pdf').click();
  const sheet = page.locator('#print-report');
  await expect(sheet.locator('.print-q')).toHaveCount(4);
  await expect(sheet.locator('.print-q').first()).toHaveText(question);
  await expect(sheet).toContainText(done.explanation);
});

test('개념 정리: 주요 개념은 포스트잇으로 가려져 있고, 모두 떼어야 보고서를 제출할 수 있어요(새로 고침해도 뗀 것은 남아요)', async ({ page }) => {
  const done = { stage: 'explain', reached: 2, prediction: { index: 0, choice: '예상', reason: REASON }, choice: null, reason: '', observation: '', saved: '전압을 높일수록 전류계의 값이 커졌어요. 2 V에서 100 mA였어요.', observed: true, explanation: '저항이 일정하면 전류의 세기는 전압에 비례해서 전압이 2배면 전류도 2배예요.', explained: true };
  await page.addInitScript(v => { if (!sessionStorage.getItem('poe:ohms-law')) sessionStorage.setItem('poe:ohms-law', v); }, JSON.stringify({ current: 0, reviewed: true, onReview: false, reviewAnswers: [], quiz: null, locked: false, exps: [done] }));
  await page.goto(URL_);
  const notes = page.locator('.concept-sequence .sticky');
  const n = await notes.count();
  expect(n).toBeGreaterThanOrEqual(3);
  await expect(notes.first().locator('.sticky-word')).toBeHidden();
  await expect(page.locator('.sticky-progress')).toContainText(`0 / ${n}`);
  await page.locator('#submit-code').fill('123456');
  for (const f of ['#submit-id', '#submit-id-confirm']) await page.locator(f).fill('20315');
  for (const f of ['#submit-name', '#submit-name-confirm']) await page.locator(f).fill('홍길동');
  await page.locator('#submit-report').click();
  await expect(page.locator('.submit-status')).toContainText('포스트잇을 모두 떼어');
  await expect(page.locator('.report-preview')).toBeHidden();
  await notes.first().click();
  await expect(notes.first().locator('.sticky-word')).toBeVisible();
  await expect(notes.first()).toHaveClass(/peeled/);
  await page.reload();
  await expect(page.locator('.concept-sequence .sticky.peeled')).toHaveCount(1);
  await peelAll(page);
  await expect(page.locator('.sticky-progress')).toContainText('모두 확인했어요');
  // 학번·이름은 기억하지 않으니 다시 적어요.
  for (const f of ['#submit-id', '#submit-id-confirm']) await page.locator(f).fill('20315');
  for (const f of ['#submit-name', '#submit-name-confirm']) await page.locator(f).fill('홍길동');
  await page.locator('#submit-report').click();
  await expect(page.locator('.report-preview')).toBeVisible();
});

test('화면 크기: 작게·크게 단추로 페이지 전체를 줄이고 키우며, 다른 실험에서도 기억해요', async ({ page }) => {
  await page.goto(URL_);
  await expect(page.locator('.zoom-value')).toHaveText('100%');
  await page.locator('[data-zoom="-"]').click();
  await page.locator('[data-zoom="-"]').click();
  await expect(page.locator('.zoom-value')).toHaveText('80%');
  expect(await page.evaluate(() => document.documentElement.style.zoom)).toBe('0.8');
  await page.goto('/simulations/star-color/');
  await expect(page.locator('.zoom-value')).toHaveText('80%');
  for (let i = 0; i < 8; i++) if (await page.locator('[data-zoom="+"]').isEnabled()) await page.locator('[data-zoom="+"]').click();
  await expect(page.locator('.zoom-value')).toHaveText('125%');
  await expect(page.locator('[data-zoom="+"]')).toBeDisabled();
});
