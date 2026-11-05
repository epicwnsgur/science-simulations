import { test, expect } from '@playwright/test';

// 교사용 자료 폴더: 교사 모드 비밀번호로만 들어가요. 첫 도구는 레이싱 번호 뽑기예요.
test('첫 화면의 교사용 자료 폴더는 비밀번호를 물은 뒤 바로 들어감', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.available')).toHaveText('폴더 2개 · 실험 17개');
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

async function openSeats(page) {
  await page.addInitScript(() => sessionStorage.setItem('poe-teacher', 'on'));
  await page.goto('/teacher/seat-draw/');
  await expect(page.locator('#gate-dialog')).toHaveCount(0);
}
const deskAt = (page, r, c) => page.locator(`.sd-desk[data-r="${r}"][data-c="${c}"]`);

test('자리 뽑기: 막은 자리·고정 자리를 지키고 모두 한 번씩 앉으며, 두 자리를 맞바꿀 수 있음', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await openSeats(page);
  await expect(page.locator('.sd-desk')).toHaveCount(30);
  await deskAt(page, 4, 5).click();
  await page.getByLabel('이 자리 막기(아무도 앉지 않아요)').check();
  await page.locator('#sd-dialog-ok').click();
  await expect(deskAt(page, 4, 5)).toHaveText('막은 자리');
  // 자리 수보다 학생이 많으면 까닭을 알려 줘요.
  await page.locator('#sd-draw').click();
  await expect(page.locator('#sd-status')).toContainText('29자리');
  await page.locator('#sd-count').fill('27'); await page.locator('#sd-count').press('Tab');
  await deskAt(page, 0, 0).click();
  await page.getByLabel('이 자리에 고정할 학생').selectOption('7');
  await page.locator('#sd-dialog-ok').click();
  // 차례로 공개: 5초 카운트다운 화면(5→1) 뒤에 ‘공개!’, 이어서 1.2초 안에 모든 자리가 열려요.
  await page.evaluate(() => { window.__t0 = performance.now(); });
  await page.locator('#sd-draw').click();
  await expect(page.locator('#sd-show')).toBeVisible();
  await expect(page.locator('#sd-show-num')).toHaveText('5');
  await expect(page.locator('#sd-show-num')).toHaveText('1', { timeout: 6000 });
  await expect(page.locator('#sd-show')).toBeHidden({ timeout: 4000 });
  await expect(page.locator('#sd-status')).toHaveText('두 자리를 차례로 누르면 서로 바꿔요.', { timeout: 10000 });
  const took = await page.evaluate(() => performance.now() - window.__t0);
  expect(took).toBeGreaterThan(5400);
  expect(took).toBeLessThan(8500);
  await expect(page.locator('#sd-room')).toBeInViewport();
  const seats = await page.evaluate(() => seatDraw.result);
  expect(seats[0]).toBe(7);
  expect(seats[29]).toBeNull();
  expect(seats.filter(Boolean).sort((a, b) => a - b)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  expect(seats.slice(27, 29)).toEqual([null, null]); // 남는 자리는 뒤쪽
  const a = seats[1], b = seats[2];
  await deskAt(page, 0, 1).click(); await deskAt(page, 0, 2).click();
  await expect(deskAt(page, 0, 1)).toHaveText(String(b));
  await expect(deskAt(page, 0, 2)).toHaveText(String(a));
  await page.getByRole('button', { name: '교사 시점' }).click();
  await expect(page.locator('#sd-room')).toHaveClass(/flipped/);
  await expect(page.locator('.sd-row').first().locator('.sd-desk').first()).toHaveAttribute('data-r', '4');
  expect(errors).toEqual([]);
});

test('자리 뽑기: 이름 명단으로 뽑고, 눌러서 한 자리씩 공개', async ({ page }) => {
  await openSeats(page);
  await page.getByText('이름으로 뽑기').click();
  await page.getByLabel('이름 명단(한 줄에 한 명, 줄 차례가 번호)').fill('김하늘\n이바다\n박산');
  await page.getByLabel('이름 명단(한 줄에 한 명, 줄 차례가 번호)').press('Tab');
  await expect(page.locator('#sd-count')).toHaveValue('3');
  await expect(page.locator('#sd-count')).toBeDisabled();
  await page.locator('#sd-rows').fill('1'); await page.locator('#sd-rows').press('Tab');
  await page.locator('#sd-cols').fill('3'); await page.locator('#sd-cols').press('Tab');
  await page.getByLabel('눌러서 한 자리씩').check();
  await page.locator('#sd-draw').click();
  await expect(page.locator('.sd-desk.hidden-card')).toHaveCount(3);
  await deskAt(page, 0, 1).click();
  await expect(page.locator('.sd-desk.hidden-card')).toHaveCount(2);
  await page.getByRole('button', { name: '모두 공개' }).click();
  await expect(page.locator('.sd-desk.hidden-card')).toHaveCount(0);
  const names = (await page.locator('.sd-desk small').allInnerTexts()).sort();
  expect(names).toEqual(['김하늘', '박산', '이바다']);
});

test('자리 뽑기 화면 390px: 가로로 넘치지 않음', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSeats(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('자리 뽑기: 자리 막기를 켜면 누르는 자리마다 바로 막히고, 다시 누르면 풀림', async ({ page }) => {
  await openSeats(page);
  await page.getByRole('button', { name: '자리 막기' }).click();
  await expect(page.getByRole('button', { name: '자리 막기' })).toHaveAttribute('aria-pressed', 'true');
  for (const [r, c] of [[0, 0], [2, 3], [4, 5]]) await deskAt(page, r, c).click();
  await expect(page.locator('#sd-dialog')).not.toBeVisible();
  await expect(page.locator('.sd-desk.blocked')).toHaveCount(3);
  await deskAt(page, 2, 3).click();
  await expect(page.locator('.sd-desk.blocked')).toHaveCount(2);
  await page.getByRole('button', { name: '자리 막기' }).click();
  await page.locator('#sd-count').fill('28'); await page.locator('#sd-count').press('Tab');
  await page.getByLabel('눌러서 한 자리씩').check();
  await page.locator('#sd-draw').click();
  const seats = await page.evaluate(() => seatDraw.result);
  expect(seats[0]).toBeNull();
  expect(seats[29]).toBeNull();
  expect(seats.filter(Boolean)).toHaveLength(28);
});

test('자리 뽑기: 전체 화면 단추로 교실만 크게 보고 다시 돌아옴', async ({ page }) => {
  await openSeats(page);
  const fs = page.locator('#sd-fs');
  await expect(fs).toHaveAttribute('aria-label', '전체 화면');
  await fs.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('sd-stage');
  await expect(fs).toHaveAttribute('aria-label', '전체 화면 끝내기');
  await expect(page.locator('#sd-fs-draw')).toBeVisible();
  await fs.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(page.locator('#sd-fs-draw')).toBeHidden();
});

test('자리 뽑기: 카운트다운 화면에서 ‘바로 보기’를 누르면 바로 결과', async ({ page }) => {
  await openSeats(page);
  await page.locator('#sd-draw').click();
  await expect(page.locator('#sd-show')).toBeVisible();
  await page.getByRole('button', { name: '바로 보기' }).first().click();
  await expect(page.locator('#sd-show')).toBeHidden();
  await expect(page.locator('.sd-desk.hidden-card, .sd-desk.spin')).toHaveCount(0);
  expect((await page.evaluate(() => seatDraw.result)).filter(Boolean)).toHaveLength(30);
});

// 보고서 시트 점검: 시트마다 웹 앱이 작동하는지, Code.gs가 최신인지 알려 줘요(진짜 시트 대신 가로챈 답으로 시험해요).
test('보고서 시트 점검: 최신 코드·예전 코드·응답 없음을 시트마다 알려 줌', async ({ page }) => {
  const { SUBMIT_URL_BY_GRADE } = await import('../src/submission-config.js');
  const { SHEET_CODE_VERSION } = await import('../src/sheet-version.js');
  await page.route('https://script.google.com/**', route => {
    const first = route.request().url() === SUBMIT_URL_BY_GRADE[1];
    return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(first ? { ok: true, version: SHEET_CODE_VERSION } : { ok: true }) });
  });
  await page.goto('/');
  await page.getByRole('link', { name: /교사용 자료 폴더 열기/ }).click();
  await page.locator('#gate-pass').fill('0421'); await page.locator('#gate-ok').click();
  await page.locator('#sheet-check-btn').click();
  const items = page.locator('#sheet-check-list li');
  await expect(items.filter({ hasText: '1학년 시트: 작동해요 · 최신 코드' })).toHaveCount(1);
  await expect(items.filter({ hasText: '예전 코드예요' })).toHaveCount(1);
  await page.unroute('https://script.google.com/**');
  await page.route('https://script.google.com/**', route => route.abort('failed'));
  await page.locator('#sheet-check-btn').click();
  await expect(items.filter({ hasText: '응답이 없어요' })).toHaveCount(2);
});
