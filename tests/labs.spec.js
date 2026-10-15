import { test, expect } from '@playwright/test';
import { beginObservation } from './poe-helpers.js';

async function hold(page, ms = 900) {
  const btn = page.locator('#press-btn');
  await btn.scrollIntoViewIfNeeded();
  const b = await btn.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.waitForTimeout(ms); await page.mouse.up();
}
async function finish(page, concept) {
  await expect(page.locator('#to-explanation'), await page.locator('#observation-progress').textContent()).toBeEnabled({ timeout: 8000 });
  await page.locator('#observation-record').fill('관찰한 내용을 적었어요.');
  await page.locator('#to-explanation').click();
  await page.locator('#explanation-record').fill('까닭을 설명했어요.');
  await page.locator('#reveal-concepts').click();
  await expect(page.locator('#concept-review')).toContainText(concept);
}

const LABS = [
  ['/simulations/friction-electricity/', '마찰 전기', async page => {
    for (let i = 0; i < 2; i++) { await page.locator('#rub-btn').click(); await page.waitForTimeout(1300); }
    await page.locator('#lift-btn').click(); await page.waitForTimeout(1800);
    await page.locator('#tab-spoon').click(); await page.locator('#rub-spoons').click();
    await page.locator('#approach').click(); await page.waitForTimeout(2500);
    await page.locator('[data-tool="glove"]').click(); await page.locator('#approach').click(); await page.waitForTimeout(2500);
  }],
  ['/simulations/electric-current/', '전류', async page => {
    for (let i = 0; i < 3; i++) await page.locator('#rub-btn').click();
    await page.locator('#place-btn').click(); await page.locator('#touch-btn').click();
    await page.waitForTimeout(200);
    await page.locator('#touch-btn').click(); await page.locator('#touch-btn').click();
    await page.locator('#tab-circuit').click(); await page.locator('#battery-btn').click(); await page.locator('#pump-btn').click();
    await page.waitForTimeout(1800);
  }],
  ['/simulations/ohms-law/', '옴의 법칙', async page => {
    for (const w of ['long', 'short']) {
      await page.locator(`[data-wire="${w}"]`).click();
      for (let v = 1; v <= 4; v++) { await page.locator('#v-up').click(); await page.locator('#switch-btn').click(); await page.locator('#record-btn').click(); await page.locator('#switch-btn').click(); }
    }
    await expect(page.locator('#readout')).toContainText('400');
    await page.locator('#tab-material').click();
    for (const m of ['copper', 'clip', 'rubber', 'wood']) { await page.locator(`[data-material="${m}"]`).click(); await page.locator('#switch-btn').click(); }
  }],
  ['/simulations/series-parallel/', '병렬연결', async page => {
    await page.locator('#close-all').click();
    for (const t of ['series', 'parallel']) { await page.locator(`#tab-${t}`).click(); await page.locator('#close-all').click(); await page.waitForTimeout(100); await page.locator('[data-switch="S2"]').click(); await page.waitForTimeout(100); }
  }],
  ['/simulations/coil-magnetic-field/', '자기장', async page => {
    await page.waitForTimeout(1700);
    await page.locator('#tab-coil').click(); await hold(page);
    await page.locator('#flip-btn').click(); await hold(page);
    await page.locator('[data-level="2"]').click(); await hold(page);
  }],
  ['/simulations/electric-swing/', '힘의 방향', async page => {
    await hold(page);
    await page.locator('#flip-current').click(); await hold(page);
    await page.locator('#flip-current').click(); await page.locator('#flip-magnet').click(); await hold(page);
    await page.locator('[data-v="2"]').click(); await hold(page);
  }],
  ['/simulations/electric-motor/', '코일과 자석', async page => {
    await page.locator('#switch-btn').click(); await page.waitForTimeout(1500);
    await page.locator('#flip-current').click(); await page.waitForTimeout(2500);
    await page.locator('#tab-simple').click(); await page.locator('#switch-btn').click(); await page.locator('#nudge').click(); await page.waitForTimeout(2000);
    await page.locator('[data-strip="full"]').click(); await page.locator('#nudge').click(); await page.waitForTimeout(3500);
  }],
];

for (const [url, concept, run] of LABS) {
  test(`${url} 예상→관찰→설명`, async ({ page }) => {
    test.setTimeout(45000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await expect(page.locator('#predict-panel')).toBeVisible();
    await expect(page.locator('#scene')).not.toBeVisible();
    await beginObservation(page);
    await expect(page.locator('#to-explanation')).toBeDisabled();
    await run(page);
    await finish(page, concept);
    await page.locator('[data-quiz="0"]').first().click();
    await expect(page.locator('#quiz-feedback-0')).not.toHaveText('');
    await page.locator('#restart-poe').click();
    await expect(page.locator('#predict-panel')).toBeVisible();
    expect(errors).toEqual([]);
  });
  test(`${url} 모바일 화면 넘침 없음`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url); await beginObservation(page);
    await expect(page.locator('#scene')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('옴의 법칙: 스위치를 닫아야 측정값을 기록할 수 있고 표에 값이 남음', async ({ page }) => {
  await page.goto('/simulations/ohms-law/'); await beginObservation(page);
  await page.locator('#v-up').click(); await page.locator('#v-up').click();
  await expect(page.locator('#record-btn')).toBeDisabled();
  await page.locator('#switch-btn').click(); await page.locator('#record-btn').click();
  await expect(page.locator('#readout')).toContainText('100');
  await page.locator('[data-wire="short"]').click();
  await expect(page.locator('#readout')).toContainText('100');
});

test('저항의 연결: 직렬에서 스위치 하나를 열면 두 전구 모두 꺼지고 병렬에서는 하나만 꺼짐', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/simulations/series-parallel/'); await beginObservation(page);
  const glow = id => page.locator(`#circuit-${id} .glow`);
  await page.locator('#tab-series').click(); await page.locator('#close-all').click();
  await expect(glow('series').first()).not.toHaveAttribute('opacity', '0.00');
  await page.locator('[data-switch="S1"]').click();
  await expect(glow('series').nth(0)).toHaveAttribute('opacity', '0.00');
  await expect(glow('series').nth(1)).toHaveAttribute('opacity', '0.00');
  await page.locator('#tab-parallel').click(); await page.locator('#close-all').click(); await page.locator('[data-switch="S2"]').click();
  await expect(glow('parallel').nth(0)).toHaveAttribute('opacity', '1.00');
  await expect(glow('parallel').nth(1)).toHaveAttribute('opacity', '0.00');
});
