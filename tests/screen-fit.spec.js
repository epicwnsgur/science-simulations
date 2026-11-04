import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { openObserveUnlocked, finishReview, savePrediction } from './poe-helpers.js';

// 교사 의견(2026년 11월): 실험 순서 안내와 시뮬레이션이 한 화면에 들어오지 않아, 지금 몇 번째 순서인지 알 수 없어요.
// → 화면 크기에 맞춰 안내 자리(왼쪽 칸·위에 붙는 띠)와 그림 크기를 정해요(theme-electric.css, src/lab-shell.js의 fitStage).
const COUNT = { 'friction-electricity': 2 };
const rect = (page, sel) => page.locator(sel).first().evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, vh: innerHeight }; });
const inView = r => r.height > 0 && r.top >= -1 && r.bottom <= r.vh + 1;

test('화면에 맞추기: 노트북(1366×657)에서 예상을 저장하면 실험 순서 안내·단추·그림·아래 단추가 한 화면에 보이고, 내려도 안내가 따라와요', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 657 });
  await page.goto('/simulations/ohms-law/');
  await finishReview(page);
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('전압을 높이면 전류도 커질 것 같아요. 펌프가 세지면 물도 세게 흐르니까요.');
  await savePrediction(page);
  await expect(page.locator('#observe-panel')).toBeVisible();
  await page.waitForTimeout(300);
  for (const sel of ['#step-guide li.current', '.lab-toolbar', '#controls', '.stage', '#actions']) expect(inView(await rect(page, sel)), sel).toBe(true);
  // 넓은 화면: 안내는 실험 왼쪽 칸에 있어요. 그림은 너무 작아지지 않아요.
  const guide = await rect(page, '#step-guide'), stage = await rect(page, '.stage');
  expect(guide.right).toBeLessThan(stage.left);
  expect(stage.height).toBeGreaterThan(250);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(300);
  expect(inView(await rect(page, '#step-guide li.current'))).toBe(true);
});

test('화면에 맞추기: 모든 실험에서 그림 전체와 지금 할 단계가 한 화면에 함께 보여요(노트북·세로 태블릿·휴대폰)', async ({ browser }) => {
  test.setTimeout(300000);
  for (const [width, height] of [[1366, 657], [820, 1180], [390, 844]]) {
    for (const slug of readdirSync('simulations')) {
      const page = await browser.newPage({ viewport: { width, height } });
      await openObserveUnlocked(page, `/simulations/${slug}/`, { count: COUNT[slug] ?? 1, observed: false });
      await expect(page.locator('.stage')).toBeVisible();
      const where = `${slug} ${width}×${height}`;
      // 실험 그림(3D 보기 단추 등)이 다 그려지는 동안 칸이 움직일 수 있어서, 그림까지 내려 보기를 몇 번 다시 해요.
      await expect.poll(async () => {
        await page.locator('.stage').evaluate(el => el.scrollIntoView({ block: 'end' }));
        await page.waitForTimeout(150);
        return inView(await rect(page, '.stage'));
      }, { message: `${where}: 그림 전체`, timeout: 15000 }).toBe(true);
      const stage = await rect(page, '.stage'), now = await rect(page, '#step-guide li.current'), guide = await rect(page, '#step-guide');
      expect(inView(now), `${where}: 지금 할 단계`).toBe(true);
      // 위에 붙는 띠가 그림을 가리지 않아요.
      if (guide.right > stage.left + 1) expect(stage.top, `${where}: 띠 아래에 그림`).toBeGreaterThanOrEqual(guide.bottom - 1);
      await page.close();
    }
  }
});

test('화면에 맞추기: 휴대폰에서는 실험 위의 띠가 화면 맨 위에 붙어 있고, 크게 보기에서도 실험 순서 안내가 함께 보여요', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openObserveUnlocked(page, '/simulations/electric-current/', { observed: false });
  await page.locator('.stage').evaluate(el => el.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(200);
  const bar = await rect(page, '#step-guide');
  expect(bar.top).toBeLessThan(2);
  expect(bar.height).toBeLessThan(220);
  await page.setViewportSize({ width: 1366, height: 768 });
  const full = page.locator('.lab-full');
  if (await full.isVisible()) {
    await full.click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.className ?? '')).toContain('observe-body');
    expect(inView(await rect(page, '#step-guide li.current'))).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
  }
});
