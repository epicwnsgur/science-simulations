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
// 기본 배치(짝)의 r번째 줄·c번째 자리 → 교실 판의 칸(0번 줄은 교탁 줄, 두 자리마다 통로, 양옆 여유 칸)
const deskAt = (page, r, c) => page.locator(`.sd-desk[data-r="${r + 1}"][data-c="${1 + c + Math.floor(c / 2)}"]`);

test('자리 뽑기: 막은 자리·고정 자리를 지키고 모두 한 번씩 앉으며, 두 자리를 맞바꿀 수 있음', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await openSeats(page);
  await expect(page.locator('.sd-desk')).toHaveCount(30);
  await deskAt(page, 4, 5).click();
  await page.getByLabel('이 자리 막기(제외한 번호만 앉을 수 있어요)').check();
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
  // 교사 시점: 앞줄이 아래쪽(칠판 쪽)으로
  expect((await deskAt(page, 0, 0).boundingBox()).y).toBeGreaterThan((await deskAt(page, 4, 0).boundingBox()).y);
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

test('자리 뽑기: 제외할 번호는 막은 자리에만 무작위로 앉고, 끄면 아무 데도 앉지 않음', async ({ page }) => {
  await openSeats(page);
  await page.getByRole('button', { name: '자리 막기' }).click();
  for (const [r, c] of [[0, 0], [0, 5]]) await deskAt(page, r, c).click();
  await page.getByRole('button', { name: '자리 막기' }).click();
  await page.getByLabel('눌러서 한 자리씩').check();
  await page.getByLabel('제외할 번호').fill('3, 17, 21');
  await page.locator('#sd-draw').click();
  await expect(page.locator('#sd-status')).toContainText('막은 자리(2자리)가 적어요');
  await page.getByLabel('제외할 번호').fill('3, 17');
  await page.locator('#sd-draw').click();
  let seats = await page.evaluate(() => seatDraw.result);
  expect([seats[0], seats[5]].sort((a, b) => a - b)).toEqual([3, 17]);
  expect(seats.filter(Boolean)).toHaveLength(30);
  await page.getByRole('button', { name: '모두 공개' }).click();
  await expect(page.locator('.sd-desk.special')).toHaveCount(2);
  await page.getByLabel('제외한 번호는 막은 자리에 무작위로').uncheck();
  await page.locator('#sd-draw').click();
  seats = await page.evaluate(() => seatDraw.result);
  expect(seats).not.toContain(3);
  expect(seats).not.toContain(17);
  expect([seats[0], seats[5]]).toEqual([null, null]);
});

test('자리 뽑기: 자리를 끌어 교탁 옆 칸에 놓으면 딱 맞게 들어가고, 배치를 기억함', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSeats(page);
  await page.locator('#sd-room').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' })); // 교실 전체가 한 화면에 보이게
  const { tc } = await page.evaluate(() => seatDraw.layout);
  const drag = async (from, to) => {
    const a = await from.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 3 });
    await expect(page.locator('#sd-trash')).toBeVisible(); // 끌기 시작하면 빈칸과 휴지통이 보여요.
    const b = await to.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
  };
  await drag(deskAt(page, 4, 5), page.locator(`.sd-slot[data-r="0"][data-c="${tc - 1}"]`));
  await expect(page.locator(`.sd-desk[data-r="0"][data-c="${tc - 1}"]`)).toHaveCount(1);
  await expect(page.locator('#sd-dialog')).not.toBeVisible();
  // 다른 자리 위에 놓으면 서로 바꿔요.
  const a = await deskAt(page, 0, 0).getAttribute('data-id'), b = await deskAt(page, 1, 1).getAttribute('data-id');
  await drag(deskAt(page, 0, 0), deskAt(page, 1, 1));
  await expect(deskAt(page, 1, 1)).toHaveAttribute('data-id', a);
  await expect(deskAt(page, 0, 0)).toHaveAttribute('data-id', b);
  // 휴지통에 놓으면 자리가 없어지고, 자리 더하기로 다시 생겨요.
  await drag(deskAt(page, 2, 2), page.locator('#sd-trash'));
  await expect(page.locator('.sd-desk')).toHaveCount(29);
  await page.getByRole('button', { name: '자리 더하기' }).click();
  await expect(page.locator('.sd-desk')).toHaveCount(30);
  // 새로 열어도 배치가 그대로예요.
  await page.reload();
  await expect(page.locator(`.sd-desk[data-r="0"][data-c="${tc - 1}"]`)).toHaveCount(1);
  await expect(page.locator('.sd-desk')).toHaveCount(30);
  // 뽑으면 교탁 옆 자리가 맨 앞 차례로 채워져요.
  await page.getByLabel('눌러서 한 자리씩').check();
  await page.locator('#sd-draw').click();
  expect((await page.evaluate(() => seatDraw.result))[0]).not.toBeNull();
});

test('자리 뽑기: 끌기 대신 Shift+방향키로 한 칸씩 옮기고, 설정 창에서 자리를 없앰', async ({ page }) => {
  await openSeats(page);
  const desk = deskAt(page, 0, 0), id = await desk.getAttribute('data-id');
  await desk.focus();
  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.locator(`.sd-desk[data-id="${id}"]`)).toHaveAttribute('data-r', '0');
  await page.locator(`.sd-desk[data-id="${id}"]`).click();
  await page.getByRole('button', { name: '이 자리 없애기' }).click();
  await expect(page.locator('.sd-desk')).toHaveCount(29);
});
