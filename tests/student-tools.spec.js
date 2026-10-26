import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';

const OHM = '/simulations/ohms-law/';

test('테마 바꾸기: 단추로 어두운 테마 ↔ 밝은 테마(핑크)를 오가고, 다른 페이지에서도 기억함', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme', 'light');
  const toggle = page.locator('.site-header [data-theme-toggle]');
  await expect(toggle).toContainText('밝은 테마');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toContainText('어두운 테마');
  // 밝은 바탕(분홍빛 흰색)이 실제로 칠해져요.
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(bg).toBe('rgb(255, 244, 248)');
  // 실험 페이지로 가도 밝은 테마 그대로예요.
  await page.goto(OHM);
  await expect(html).toHaveAttribute('data-theme', 'light');
  const labToggle = page.locator('header [data-theme-toggle]');
  await expect(labToggle).toContainText('어두운 테마');
  const ink = await page.evaluate(() => getComputedStyle(document.querySelector('#review-title')).color);
  expect(ink).toBe('rgb(61, 26, 51)');
  await labToggle.click();
  await expect(html).not.toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).not.toHaveAttribute('data-theme', 'light');
});

test('메모: 오른쪽 아래 단추로 열고, 쓴 글은 새로 고침해도 남으며, 보고서에는 들어가지 않음', async ({ page }) => {
  await openObserveUnlocked(page, OHM);
  const toggle = page.locator('.memo-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  const memo = page.locator('#memo-text');
  await expect(memo).toBeFocused();
  await memo.fill('2 V에서 100 mA! 왜 그런지 설명 단계에서 써 보기');
  await expect(page.locator('.memo-saved')).toContainText('저장됨');
  await page.keyboard.press('Escape');
  await expect(page.locator('#memo-panel')).toBeHidden();
  await expect(page.locator('.memo-dot')).toBeVisible();
  await page.reload();
  await page.locator('.memo-toggle').click();
  await expect(page.locator('#memo-text')).toHaveValue('2 V에서 100 mA! 왜 그런지 설명 단계에서 써 보기');
  // 관찰 기록 칸에는 들어가지 않아요.
  await expect(page.locator('#observation-record')).toHaveValue('');
});

test('관찰 기록: 활동이 여럿인 실험은 활동마다 칸을 나눠 쓰고, 저장하면 [활동 이름]별로 묶여 보임', async ({ page }) => {
  await openObserveUnlocked(page, OHM);
  const boxes = page.locator('#observation-parts textarea');
  await expect(boxes).toHaveCount(2);
  await expect(page.locator('.part-tag')).toHaveText(['관찰 1 전압과 전류 측정', '관찰 2 도체와 부도체']);
  await boxes.nth(0).fill('전압이 2배가 되면 전류의 세기도 2배가 되었어요.');
  // 둘째 칸을 너무 짧게 쓰면 저장되지 않아요.
  await boxes.nth(1).fill('고무줄 X');
  await page.locator('#to-explanation').click();
  await expect(page.locator('#explain-panel')).toBeHidden();
  expect(await boxes.nth(1).evaluate(el => el.validationMessage)).toContain('20자 이상');
  await boxes.nth(1).fill('구리선과 철 클립은 도체, 고무줄과 나무 막대는 부도체였어요.');
  await page.locator('#to-explanation').click();
  await expect(page.locator('#explain-panel')).toBeVisible();
  await expect(page.locator('#saved-observation')).toHaveText('[전압과 전류 측정] 전압이 2배가 되면 전류의 세기도 2배가 되었어요.\n[도체와 부도체] 구리선과 철 클립은 도체, 고무줄과 나무 막대는 부도체였어요.');
});

test('글자 수: ‘✔ 좋아요’가 나오면 저장도 돼요(문장 부호·겹친 글자·숫자가 있는 보통 문장)', async ({ page }) => {
  await openObserveUnlocked(page, '/simulations/friction-electricity/', { count: 2 });
  const box = page.locator('#observation-record');
  // 예전에는 글자 수 안내는 20자를 넘었다고 하고, 저장할 때는 ‘같은 글자 되풀이’로 막히던 문장이에요.
  await box.fill('털끝이 점점 풍선 쪽으로 끌려 올라갔어요!! 1000번 신기해요.');
  await expect(page.locator('.char-count[data-for="observation-record"]')).toContainText('✔');
  await page.locator('#to-explanation').click();
  await expect(page.locator('#explain-panel')).toBeVisible();
});
