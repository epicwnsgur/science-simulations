import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';

// 중학교 1학년 Ⅵ. 기체의 성질: 폴더와 실험 화면의 과학 내용(docs/scientific-review.md ‘중1 Ⅵ’)

test('중1 폴더: 7개 단원 이름, 빈 폴더, 6단원 실험 3개', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const names = ['I. 과학과 인류의 지속가능한 삶', 'II. 생물의 구성과 다양성', 'III. 열', 'IV. 물질의 상태 변화', 'V. 힘의 작용', 'VI. 기체의 성질', 'VII. 태양계'];
  await page.goto('/');
  await page.getByRole('link', { name: '중학교 1학년 과학 폴더 열기' }).click();
  await expect(page.locator('.available')).toHaveText('폴더 7개 · 실험 3개');
  await expect(page.locator('.unit-folder h3')).toHaveText(names);
  for (let i = 1; i <= 7; i++) {
    await page.goto(`/grades/middle-school-1/unit-${i}/`);
    await expect(page.locator('h1')).toHaveText(names[i - 1]);
    await expect(page.locator('.eyebrow')).toContainText('중학교 1학년');
    if (i !== 6) await expect(page.locator('.empty-unit')).toBeVisible();
  }
  await page.goto('/grades/middle-school-1/unit-6/');
  await expect(page.locator('.active-folder')).toHaveCount(3);
  await expect(page.locator('.available')).toHaveText('실험 3개');
  await page.getByRole('link', { name: '기체의 온도와 부피 탐구 열기' }).click();
  await expect(page).toHaveURL(/\/simulations\/charles-law\/$/);
  await expect(page.locator('header .grade')).toContainText('중학교 1학년');
  await page.getByRole('link', { name: '← 실험 목록' }).click();
  await expect(page).toHaveURL(/\/grades\/middle-school-1\/unit-6\/$/);
  expect(errors).toEqual([]);
});

test('기체의 압력: 점토가 눌리는 깊이는 (나) > (다) > (가)', async ({ page }) => {
  await openObserveUnlocked(page, '/simulations/gas-pressure/');
  const depth = async s => {
    await page.locator(`[data-setup="${s}"]`).click();
    await expect(page.locator(`#depth-${s}`)).toHaveText(/약 \d+\.\d mm/, { timeout: 8000 });
    return Number((await page.locator(`#depth-${s}`).textContent()).match(/[\d.]+/)[0]);
  };
  const a = await depth('a'), b = await depth('b'), c = await depth('c');
  expect(b).toBeGreaterThan(c);
  expect(c).toBeGreaterThan(a);
});

test('보일 법칙: 30 mL 1 기압 → 15 mL 2 기압, 압력×부피가 일정하고 입자의 빠르기는 그대로', async ({ page }) => {
  await openObserveUnlocked(page, '/simulations/boyles-law/');
  await page.locator('#record').click();
  for (let i = 0; i < 3; i++) await page.locator('[data-step="-5"]').click();
  await expect(page.locator('[data-step="-5"]')).toBeDisabled();
  await page.waitForTimeout(800);
  await expect(page.locator('#digital')).toHaveText('2.00 기압');
  await page.locator('#record').click();
  await page.locator('#to-start').click();
  await page.locator('[data-step="5"]').click(); await page.locator('[data-step="5"]').click();
  await page.locator('#record').click();
  const rows = await page.locator('#readout tr').evaluateAll(trs => trs.slice(1).map(tr => [...tr.cells].map(td => Number(td.textContent))));
  expect(rows.length).toBe(3);
  for (const [p, v, pv] of rows) { expect(Math.abs(p * v - 30)).toBeLessThan(.3); expect(Math.abs(pv - 30)).toBeLessThan(.3); }
  // 입자 모형: 외부 압력을 높여도 입자의 빠르기는 그대로이고, 부피만 작아져요.
  await page.locator('#tab-particles').click();
  await page.locator('[data-ext="2"]').click();
  await expect(page.locator('#cyl-panel')).toContainText('15 mL', { timeout: 6000 });
  await expect(page.locator('#cyl-panel')).toContainText('그대로');
});

test('샤를 법칙: 물이 식을수록 부피가 일정하게 작아지고, 입자 모형에서 0 ℃에도 부피는 0이 아님', async ({ page }) => {
  await openObserveUnlocked(page, '/simulations/charles-law/');
  await expect(page.locator('#record')).toBeDisabled();
  await page.locator('#pour').click(); await page.locator('#drop').click(); await page.locator('#fast').click();
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(1300); await page.locator('#record').click(); }
  const rows = await page.locator('#readout tr').evaluateAll(trs => trs.slice(1).map(tr => [...tr.cells].map(td => Number(td.textContent))));
  expect(rows.length).toBe(4);
  // 표는 온도가 높은 순서: 온도가 낮을수록 부피가 작고, 부피 = 유리병 5 mL + 피펫 눈금
  for (let i = 1; i < rows.length; i++) { expect(rows[i][0]).toBeLessThan(rows[i - 1][0]); expect(rows[i][2]).toBeLessThan(rows[i - 1][2]); }
  for (const [, r, v] of rows) expect(Math.abs(5 + r - v)).toBeLessThan(.011);
  // 같은 온도 차이마다 부피 변화가 거의 같아요(직선): 1 ℃마다 약 0.018 mL
  const slope = (rows[0][2] - rows.at(-1)[2]) / (rows[0][0] - rows.at(-1)[0]);
  expect(slope).toBeGreaterThan(.015); expect(slope).toBeLessThan(.021);
  await page.locator('#tab-particles').click();
  for (let i = 0; i < 2; i++) await page.locator('#heat').click();
  await expect(page.locator('#cyl-panel')).toContainText('기체의 압력이 더 커서 피스톤이 올라가요');
  await page.locator('#to-room').click();
  await page.locator('#cool').click();
  await expect(page.locator('#cyl-panel')).toContainText('20 ℃보다 느려요');
  await expect(page.locator('#cyl-panel')).toContainText('두 압력이 같아서 피스톤이 멈췄어요', { timeout: 8000 });
  const ml = Number((await page.locator('#cyl-panel').textContent()).match(/([\d.]+) mL/)[1]);
  expect(ml).toBeGreaterThan(27); expect(ml).toBeLessThan(30);
});
