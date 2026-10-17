import { test, expect } from '@playwright/test';
const url = '/simulations/electrostatic-induction/';
async function begin(page) {
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('대전체가 숟가락 속 전자를 한쪽으로 움직일 것 같아요.');
  await page.locator('#start-observation').click();
}
const angleOf = async page => Number((await page.locator('#spoon').getAttribute('transform')).match(/rotate\((-?[\d.]+)\)/)[1]);
const leafAngleOf = async page => Number((await page.locator('#leaf-left').getAttribute('transform')).match(/rotate\((-?[\d.]+)\)/)[1]);

test('예상 화면에서는 실험을 숨기고 예상과 이유를 먼저 받음', async ({ page }) => {
  await page.goto(url);
  await expect(page.locator('#predict-panel')).toBeVisible();
  await expect(page.locator('#scene')).not.toBeVisible();
  await expect(page.locator('#concept-review')).not.toBeVisible();
  await page.locator('#start-observation').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await begin(page);
  await expect(page.locator('#observe-panel')).toBeVisible();
  await expect(page.locator('#to-explanation')).toBeDisabled();
  await expect(page.locator('#observation-progress')).toContainText('0/4');
});

test('쇠숟가락: 대전되지 않은 빨대는 그대로, (−)빨대와 (+)장갑은 모두 끌어당기고 닿지 않음', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(url); await begin(page);
  await page.locator('#show-charges').check();
  await page.locator('[data-spoon="neutral"]').click(); await page.locator('#approach-button').click();
  await page.waitForTimeout(400);
  expect(await angleOf(page)).toBe(0);
  await expect(page.locator('#charge-cards')).toContainText('+ 4');
  await page.locator('[data-spoon="straw"]').click(); await page.locator('#approach-button').click();
  await expect.poll(() => angleOf(page)).toBeLessThan(-4);
  await expect(page.locator('#charge-cards .charge-card').first()).toContainText('− 2');
  await expect(page.locator('#charge-cards .charge-card').nth(1)).toContainText('− 6');
  await expect(page.locator('#spoon-particles [data-sign="1"]')).toHaveCount(8);
  await expect(page.locator('#spoon-particles [data-sign="-1"]')).toHaveCount(8);
  await expect(page.locator('#observation-progress')).toContainText('1/4');
  await page.locator('[data-spoon="glove"]').click(); await page.locator('#approach-button').click();
  await expect.poll(() => angleOf(page)).toBeLessThan(-4);
  await expect(page.locator('#charge-cards .charge-card').first()).toContainText('− 6');
  await expect(page.locator('#observation-progress')).toContainText('2/4');
  // 대전체와 숟가락 손잡이가 닿지 않음: 손잡이 끝과 장갑 끝 사이가 떨어져 있음
  const [gx, gy] = (await page.locator('#charged-object').getAttribute('transform')).match(/-?[\d.]+/g).map(Number);
  const a = await angleOf(page) * Math.PI / 180;
  expect(Math.hypot(160 + 440 * Math.cos(a) - gx, 262 + 440 * Math.sin(a) - gy)).toBeGreaterThan(40);
  // 멀리 하면 전자는 고르게 돌아오고 숟가락은 끌려온 자리에 남음
  const moved = await angleOf(page);
  await page.locator('#withdraw-button').click();
  await expect(page.locator('#charge-cards .charge-card').first()).toContainText('− 4');
  expect(await angleOf(page)).toBeCloseTo(moved, 1);
  expect(errors).toEqual([]);
});

test('검전기: 문지른 횟수가 많을수록 더 벌어지고, (+)대전체도 벌어지게 함', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(url); await begin(page);
  await page.locator('#scope-tab').click(); await page.locator('#show-charges').check();
  await expect(page.locator('#scope-scene')).toBeVisible(); await expect(page.locator('#spoon-scene')).toBeHidden();
  await page.locator('[data-rub="0"]').click(); await page.locator('#approach-button').click();
  await page.waitForTimeout(400);
  expect(await leafAngleOf(page)).toBeLessThan(4);
  await expect(page.locator('#rub-note')).toContainText('전기를 띠지 않아요');
  await page.locator('[data-rub="1"]').click();
  await expect.poll(() => leafAngleOf(page)).toBeGreaterThan(14);
  const few = await leafAngleOf(page);
  await expect(page.locator('#charge-cards .charge-card').first()).toContainText('− 4');
  await page.locator('[data-rub="2"]').click();
  await expect.poll(() => leafAngleOf(page)).toBeGreaterThan(few + 5);
  await expect(page.locator('#charge-cards .charge-card').first()).toContainText('− 2');
  await expect(page.locator('#charge-cards .charge-card').nth(1)).toContainText('− 10');
  await page.locator('[data-scope="glove"]').click();
  await expect(page.locator('#rub-note')).toContainText('(+)전하');
  await page.locator('#approach-button').click();
  await expect(page.locator('#charge-cards .charge-card').first()).toContainText('− 10');
  await expect(page.locator('#charge-cards .charge-card').nth(1)).toContainText('− 2');
  await expect.poll(() => leafAngleOf(page)).toBeGreaterThan(20);
  await page.locator('#withdraw-button').click();
  await expect.poll(() => leafAngleOf(page)).toBeLessThan(4);
  await page.locator('[data-scope="balloon"]').click();
  await expect(page.locator('#rub-note')).toContainText('털가죽과 문지른 풍선은 (−)전하');
});

test('네 가지 관찰 후 기록→설명→개념 확인과 스스로 평가', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(url); await begin(page);
  for (const key of ['straw', 'glove']) { await page.locator(`[data-spoon="${key}"]`).click(); await page.locator('#approach-button').click(); await expect.poll(() => angleOf(page)).toBeLessThan(-4); }
  await page.locator('#scope-tab').click(); await page.locator('#approach-button').click();
  await expect.poll(() => leafAngleOf(page)).toBeGreaterThan(14);
  await expect(page.locator('#to-explanation')).toBeDisabled();
  await page.locator('[data-rub="2"]').click();
  await expect(page.locator('#to-explanation')).toBeEnabled();
  await page.locator('#observation-record').fill('빨대와 장갑 모두 숟가락을 자기 쪽으로 끌어당겼어요.');
  await page.locator('#to-explanation').click();
  await expect(page.locator('#explain-panel')).toBeVisible();
  await page.locator('#explanation-record').fill('전자가 이동해서 가까운 쪽에 다른 전하가 생겼어요.');
  await page.locator('#reveal-concepts').click();
  await expect(page.locator('#concept-review')).toBeVisible();
  await expect(page.locator('#concept-review')).toContainText('정전기 유도');
  await expect(page.locator('#concept-review')).toContainText('(+)전하만 있는 것은 아니에요');
  for (const term of ['정전기 유도', '검전기', '대전체', '전기력', '인력', '척력']) await expect(page.locator('.term-buttons')).toContainText(term);
  await page.locator('[data-q1="same"]').click(); await expect(page.locator('#feedback-1')).toContainText('다시');
  await page.locator('[data-q1="other"]').click(); await expect(page.locator('#feedback-1')).toContainText('맞아요');
  await page.locator('[data-q2="more"]').click(); await expect(page.locator('#feedback-2')).toContainText('맞아요');
  await page.locator('#restart-poe').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await expect(page.locator('#prediction-reason')).toHaveValue('');
  await begin(page);
  await expect(page.locator('#observation-progress')).toContainText('0/4');
  await expect(page.locator('#spoon-tab')).toHaveAttribute('aria-selected', 'true');
  expect(errors).toEqual([]);
});

test('끌기·키보드 조작과 모바일 화면 넘침 없음', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(url); await begin(page);
  await page.locator('#scene').scrollIntoViewIfNeeded();
  // 좁은 화면에서는 SVG가 위아래 여백을 두고 맞춰지므로 화면 좌표 변환 행렬을 사용합니다.
  const m = await page.evaluate(() => { const c = document.querySelector('#scene').getScreenCTM(); return { a: c.a, d: c.d, e: c.e, f: c.f }; });
  const p = (x, y) => ({ x: m.a * x + m.e, y: m.d * y + m.f });
  // 빨대 끝 바로 옆을 잡고 숟가락 손잡이 끝 위쪽으로 끌어옵니다.
  const [x0, y0] = (await page.locator('#charged-object').getAttribute('transform')).match(/-?[\d.]+/g).map(Number);
  const grab = p(x0 + 16, y0 - 12), t = p(626, 150);
  await page.mouse.move(grab.x, grab.y); await page.mouse.down();
  await page.mouse.move(t.x, t.y, { steps: 10 }); await page.mouse.up();
  await expect.poll(() => angleOf(page)).toBeLessThan(-2);
  await page.locator('#reset').click(); await expect.poll(() => angleOf(page)).toBe(0);
  await page.locator('#charged-object').focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown');
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
  await expect.poll(() => angleOf(page)).toBeLessThan(-2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
