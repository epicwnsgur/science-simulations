import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';

// 별과 우주 3D 화면이 매끄럽게 움직이는지 재요(다른 시험이 모두 끝난 뒤 하나씩 돌려요).
async function frameGaps(page, ms = 3000) {
  return page.evaluate(ms => new Promise(done => { const out = []; let prev = performance.now(); const end = prev + ms; const tick = now => { out.push(now - prev); prev = now; if (now < end) requestAnimationFrame(tick); else done(out); }; requestAnimationFrame(tick); }), ms);
}
const CASES = [
  ['우리은하 3D(천천히 도는 은하)', '/simulations/milky-way/', async () => {}],
  ['연주 시차 3D(지구 공전)', '/simulations/stellar-parallax/', async page => { await page.locator('#tab-orbit').click(); await page.locator('#orbit-play').click(); }],
  ['우주 팽창 3D(풍선 불기)', '/simulations/expanding-universe/', async page => { await page.locator('#inflate-little').click(); }],
];
for (const [name, url, start] of CASES) test(`${name}: 매끄럽게 움직임 @perf`, async ({ page }) => {
  await openObserveUnlocked(page, url);
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '3d', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await start(page);
  const g = (await frameGaps(page)).slice(1).sort((a, b) => a - b), median = g[Math.floor(g.length / 2)], p95 = g[Math.floor(g.length * .95)];
  console.log(`${name}: frames ${g.length}, median ${median.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, quality ${JSON.stringify(await page.locator('canvas.lab3d').evaluate(c => c.dataset.frames))}`);
  expect(g.length).toBeGreaterThan(75);
  expect(p95).toBeLessThan(50);
});
