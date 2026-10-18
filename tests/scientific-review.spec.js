import { test, expect } from '@playwright/test';
import { beginObservation } from './poe-helpers.js';

test('전기 그네: 스위치를 누르는 동안만 전류 화살표가 나타남', async ({ page }) => {
  await page.goto('/simulations/electric-swing/');
  await beginObservation(page);
  await page.locator('#show-detail').check();
  await expect(page.locator('[data-current-arrow]')).toHaveCount(0);
  const button = page.locator('#press-btn');
  await button.focus();
  await page.keyboard.down('Space');
  await expect(page.locator('[data-current-arrow]')).toHaveCount(1);
  await page.keyboard.up('Space');
  await expect(page.locator('[data-current-arrow]')).toHaveCount(0);
  await expect(page.locator('#arrows')).toContainText('자기장');
});

test('간이 전동기: 접촉이 끊어지는 반주기에 요약과 그림 모두 전류 끊김 표시', async ({ page }) => {
  await page.goto('/simulations/electric-motor/');
  await beginObservation(page);
  await page.locator('#tab-simple').click();
  await page.locator('#switch-btn').click();
  await page.locator('#nudge').click();
  const states = await page.evaluate(() => new Promise(resolve => {
    const seen = new Set(), errors = [], start = performance.now();
    function sample() {
      const label = document.querySelector('#contact-label').textContent;
      const flowing = label.includes('⚡');
      seen.add(flowing);
      const expected = flowing ? '흐름' : '끊김';
      if (document.querySelector('#readout b').textContent !== expected || !document.querySelector('#stage-state').textContent.startsWith('전류 ' + expected)) errors.push(label);
      if (performance.now() - start > 3000) resolve({ seen: [...seen], errors });
      else requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }));
  expect(states.errors).toEqual([]);
  expect(states.seen.sort()).toEqual([false, true]);
});

test('전압계: 길이가 다른 니크롬선 각각의 양 끝에 연결', async ({ page }) => {
  await page.goto('/simulations/ohms-law/');
  await beginObservation(page);
  for (const [wire, left, right] of [['long', 170, 390], ['short', 240, 320]]) {
    await page.locator(`[data-wire="${wire}"]`).click();
    await expect(page.locator('#voltmeter-leads')).toHaveAttribute('d', new RegExp(`^M${left} 380 .* M${right} 380 `));
  }
});
