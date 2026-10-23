import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';

// 전기 그네 3D: 화면에 그려진 자기장·전류·힘 화살표와 그네가 움직인 쪽이 F = IL×B와 같은지, 부드러운지 확인해요.
const URL = '/simulations/electric-swing/';
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < .02);
const probe = page => page.locator('canvas.lab3d').evaluate(c => c.probe());
async function open3D(page) {
  await openObserveUnlocked(page, URL);
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '3d', { timeout: 15000 });
}
async function hold(page) {
  await page.locator('#press-btn').scrollIntoViewIfNeeded();
  const b = await page.locator('#press-btn').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await expect(page.locator('#press-btn')).toHaveAttribute('aria-pressed', 'true');
}

test('전기 그네 3D: 힘 화살표 = 전류 × 자기장, 그네는 힘의 방향으로 움직임(처음 상태: 바깥쪽 ㉮)', async ({ page }) => {
  await open3D(page);
  await page.locator('#show-detail').check();
  const cases = [
    { flip: null, side: -1, top: 'S', plusZ: -.7 },          // 처음: 바깥쪽(왼쪽, −x)
    { flip: '#flip-current', side: 1, top: 'S', plusZ: .7 },  // 전류만 바꿈: 안쪽
    { flip: '#flip-magnet', side: -1, top: 'N', plusZ: .7 },  // 둘 다 바꿈: 다시 바깥쪽
  ];
  await page.waitForTimeout(300);
  expect((await probe(page)).current).toBeNull(); // 스위치를 누르기 전에는 전류 화살표가 없어요.
  for (const c of cases) {
    if (c.flip) await page.locator(c.flip).click();
    await hold(page);
    await page.waitForTimeout(2200);
    const p = await probe(page);
    expect(p.topPole).toBe(c.top);
    expect(p.plusHookZ).toBeCloseTo(c.plusZ, 3); // 전류를 바꾸면 두 전선을 바꾸어 꽂아요.
    const B = p.field[0];
    expect(p.field.every(d => close(d, B))).toBe(true);
    expect(close(B, [0, c.top === 'S' ? 1 : -1, 0])).toBe(true); // 아래 N극 → 위 S극
    expect(close(p.force, cross(p.current, B))).toBe(true);
    expect(Math.sign(p.force[0])).toBe(c.side);
    expect(Math.sign(p.bottomX)).toBe(c.side); // 그네의 아래 변이 힘의 방향으로 움직였어요.
    expect(p.bottomInField).toBe(true);        // 아래 변은 늘 두 팔 사이(자기장 속)에 있어요.
    expect(p.dotsVisible).toBeGreaterThan(10);
    await page.mouse.up();
  }
});

test('전기 그네 3D: 전압이 클수록 더 많이 움직임', async ({ page }) => {
  await open3D(page);
  const moved = [];
  for (const v of [0, 2]) {
    await page.locator(`[data-v="${v}"]`).click();
    await hold(page); await page.waitForTimeout(2200);
    moved.push(Math.abs((await probe(page)).swingAngle));
    await page.mouse.up(); await page.waitForTimeout(1500);
  }
  expect(moved[1]).toBeGreaterThan(moved[0] * 1.5);
});

test('전기 그네 3D: WebGL이 없으면 2D 그림으로 그대로 실험함', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : get.call(this, type, ...rest); };
  });
  await openObserveUnlocked(page, URL);
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '2d');
  await expect(page.locator('#view-bar')).toBeHidden();
  await expect(page.locator('#magnet path').first()).toBeVisible();
});

test('전기 그네 3D: 매끄럽게 움직임 @perf', async ({ page }) => {
  await open3D(page);
  await page.locator('#show-detail').check();
  await hold(page); await page.waitForTimeout(1200);
  const gaps = await page.evaluate(() => new Promise(done => { const out = []; let prev = performance.now(); const end = prev + 3000; const tick = now => { out.push(now - prev); prev = now; if (now < end) requestAnimationFrame(tick); else done(out); }; requestAnimationFrame(tick); }));
  const g = gaps.slice(1).sort((a, b) => a - b), median = g[Math.floor(g.length / 2)], p95 = g[Math.floor(g.length * .95)];
  console.log(`swing 3D: frames ${g.length}, median ${median.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms`);
  expect(g.length).toBeGreaterThan(75);
  expect(p95).toBeLessThan(50);
  await page.mouse.up();
});
