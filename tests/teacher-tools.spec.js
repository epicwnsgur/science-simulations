import { test, expect } from '@playwright/test';

// 교사용 자료 폴더: 교사 모드 비밀번호로만 들어가요. 첫 도구는 레이싱 번호 뽑기예요.
test('첫 화면의 교사용 자료 폴더는 비밀번호를 물은 뒤 바로 들어감', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.available')).toHaveText('폴더 2개 · 실험 16개');
  await page.getByRole('link', { name: /교사용 자료 폴더 열기/ }).click();
  await expect(page.locator('#gate-dialog')).toBeVisible();
  await page.locator('#gate-pass').fill('0000'); await page.locator('#gate-ok').click();
  await expect(page.locator('#gate-error')).toContainText('맞지 않아요');
  await expect(page).toHaveURL(/\/$/);
  await page.locator('#gate-pass').fill('0421'); await page.locator('#gate-ok').click();
  await expect(page).toHaveURL(/\/teacher\/$/);
  await expect(page.getByRole('heading', { name: '교사용 자료', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '레이싱 번호 뽑기 열기' }).click();
  await expect(page.getByRole('heading', { name: '레이싱 번호 뽑기' })).toBeVisible();
  await page.getByRole('button', { name: '교사 모드 끄기' }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:5173\/$/);
  await page.goto('/teacher/race-draw/');
  await expect(page.locator('#gate-dialog')).toBeVisible();
  await expect(page.locator('main')).toBeHidden();
  await page.getByRole('button', { name: '첫 화면으로' }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:5173\/$/);
  expect(errors).toEqual([]);
});

async function openRace(page) {
  await page.addInitScript(() => sessionStorage.setItem('poe-teacher', 'on'));
  await page.goto('/teacher/race-draw/');
  await expect(page.locator('#gate-dialog')).toHaveCount(0);
}

test('배속 모드로 100명 경주: 5초 안에 1~100등 결과와 ‘00초 00’ 기록', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await openRace(page);
  await page.getByRole('button', { name: '100명' }).click();
  await expect(page.locator('#rd-count')).toHaveValue('100');
  await page.locator('#rd-fast').click();
  await expect(page.locator('#rd-fast')).toHaveAttribute('aria-pressed', 'true');
  // 단추를 누른 때부터 결과 창이 열릴 때까지를 페이지 안에서 재요(시험 도구가 누르기를 기다리는 시간은 빼요).
  await page.evaluate(() => {
    document.getElementById('rd-start').addEventListener('click', () => { window.__t0 = performance.now(); }, { once: true });
    const dlg = document.getElementById('rd-result');
    new MutationObserver((_, o) => { if (dlg.open) { window.__t1 = performance.now(); o.disconnect(); } }).observe(dlg, { attributes: true });
  });
  await page.locator('#rd-start').click();
  await expect(page.locator('#rd-result')).toBeVisible({ timeout: 12000 });
  expect(await page.evaluate(() => window.__t1 - window.__t0)).toBeLessThan(5000);
  const rows = page.locator('#rd-board li');
  await expect(rows).toHaveCount(100);
  const texts = await rows.allInnerTexts();
  const parsed = texts.map(t => t.replace(/\s+/g, ' ').trim().match(/^(\d+)등 (\d+)번 (\d{2})초 (\d{2})$/));
  parsed.forEach((m, i) => { expect(m, texts[i]).not.toBeNull(); expect(Number(m[1])).toBe(i + 1); });
  const numbers = parsed.map(m => Number(m[2])).sort((a, b) => a - b);
  expect(numbers).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  const times = parsed.map(m => Number(m[3]) + Number(m[4]) / 100);
  times.forEach((t, i) => { expect(t).toBeLessThanOrEqual(15); if (i) expect(t).toBeGreaterThan(times[i - 1]); });
  await expect(page.locator('#rd-podium .rd-step-block')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('보통 속도: 가장 느린 차도 15초 안에 들어오고, 시계가 마지막 기록에서 멈춤', async ({ page }) => {
  test.setTimeout(40000);
  await openRace(page);
  await page.locator('#rd-count').fill('5'); await page.locator('#rd-count').press('Tab');
  await page.locator('#rd-start').click();
  await expect(page.locator('#rd-lights')).toBeVisible();
  await expect(page.locator('#rd-result')).toBeVisible({ timeout: 25000 });
  const last = (await page.locator('#rd-board li').last().innerText()).replace(/\s+/g, ' ');
  expect(last).toMatch(/^5등 \d+번 (0\d|1[0-4])초 \d{2}$|^5등 \d+번 15초 00$/);
  await expect(page.locator('#rd-clock')).toHaveText(last.split('번 ')[1]);
  await expect(page.locator('#rd-finished')).toHaveText('5 / 5');
  await page.getByRole('button', { name: '서킷 보기' }).click();
  await expect(page.locator('#rd-result')).toBeHidden();
  await expect(page.locator('#rd-start')).toBeEnabled();
});

test('3D 중계: 자동 중계가 기본, 카메라를 바꾸면 자막이 따라 바뀌고 서킷 지도(2D)로도 볼 수 있음', async ({ page }) => {
  test.setTimeout(60000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await openRace(page);
  await page.waitForFunction(() => window.raceDraw?.has3d, null, { timeout: 30000 });
  await expect(page.locator('.rd-3d')).toBeVisible();
  await expect(page.getByRole('button', { name: '자동 중계' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#rd-tv-shot')).toHaveText('출발 그리드');
  await expect(page.locator('#rd-cam-label')).toHaveText('서킷 지도');
  const frames = async () => Number(await page.locator('.rd-3d').getAttribute('data-frames'));
  const f0 = await frames();
  await expect.poll(frames).toBeGreaterThan(f0);
  await page.locator('#rd-count').fill('8'); await page.locator('#rd-count').press('Tab');
  await page.locator('#rd-start').click();
  await expect.poll(() => page.evaluate(() => raceDraw.phase), { timeout: 15000 }).toBe('race');
  for (const [name, shot] of [['탑승', '탑승 카메라'], ['추격', '추격 카메라'], ['헬기', '헬기 카메라']]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#rd-tv-shot')).toHaveText(shot);
  }
  await expect(page.locator('#rd-tv-car')).toHaveText(/^\d+번 · (\d+위|\d+등 결승)$/);
  await page.getByRole('button', { name: '서킷 지도' }).click();
  await expect(page.locator('.rd-3d')).toBeHidden();
  await expect(page.locator('#rd-tv')).toBeHidden();
  await expect(page.locator('#rd-result')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('#rd-board li')).toHaveCount(8);
  expect(errors).toEqual([]);
});

for (const width of [1440, 390]) test(`레이싱 번호 뽑기 화면 ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await openRace(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/science-race-${width}.png`, fullPage: true });
});
