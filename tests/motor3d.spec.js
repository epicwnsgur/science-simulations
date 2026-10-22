import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';

// 전동기 3D 화면: 화면에 실제로 그려진 화살표와 코일이 과학적으로 맞는지, 부드럽게 움직이는지 확인해요.
const URL = '/simulations/electric-motor/';
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const close = (a, b, eps = .02) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const probe = page => page.locator('canvas.motor3d').evaluate(c => c.probe());
async function open3D(page) {
  await openObserveUnlocked(page, URL);
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '3d', { timeout: 15000 });
}
// 0.4초 동안 코일이 어느 쪽으로 돌았는지: +1이면 앞(축 방향)에서 볼 때 시계 반대 방향
async function spinSign(page, key = 'rotorTurn') {
  const a = (await probe(page))[key];
  await page.waitForTimeout(400);
  return Math.sign((await probe(page))[key] - a);
}

test('전동기 3D: 그려진 힘 화살표 = 전류 화살표 × 자기장 화살표(F = IL×B), 두 변의 힘은 반대', async ({ page }) => {
  await open3D(page);
  await page.locator('#show-detail').check();
  await page.locator('#switch-btn').click();
  await page.waitForTimeout(800);
  for (let k = 0; k < 4; k++) {
    const p = await probe(page);
    const B = p.fieldArrows[0];
    expect(close(B, [-1, 0, 0])).toBe(true); // 오른쪽 N극 → 왼쪽 S극
    expect(p.fieldArrows.every(d => close(d, B))).toBe(true);
    for (let i = 0; i < 2; i++) {
      const I = p.currentArrows[i].dir, F = p.forceArrows[i].dir;
      expect(p.forceArrows[i].visible && p.currentArrows[i].visible).toBe(true);
      expect(close(F, cross(I, B))).toBe(true);
    }
    expect(close(p.forceArrows[0].dir, p.forceArrows[1].dir.map(v => -v))).toBe(true);
    // 왼쪽에 있는 변은 앞으로 나오는 전류(⊙)·아래로 힘 — 2D 그림과 같아요.
    const left = p.sides.findIndex(s => s.pos[0] < 0);
    expect(p.currentArrows[left].dir[2]).toBeGreaterThan(.99);
    expect(p.forceArrows[left].dir[1]).toBeLessThan(-.99);
    // 왼쪽 브러시(전지 −쪽)에 닿은 고리 반쪽은 늘 왼쪽 변과 이어져 있어요(정류자).
    expect(p.brushLeftTouches).toBe(p.sides[left].name);
    await page.waitForTimeout(170);
  }
  expect((await probe(page)).dotsVisible).toBeGreaterThan(10);
});

test('전동기 3D: 전류의 방향이나 자석의 극을 바꾸면 힘과 회전 방향이 반대로, 둘 다 바꾸면 처음처럼', async ({ page }) => {
  await open3D(page);
  await page.locator('#show-detail').check();
  await page.locator('#switch-btn').click();
  await page.waitForTimeout(1500);
  expect(await spinSign(page)).toBe(1);
  await expect(page.locator('#speed-dir')).toHaveText('↺');
  await page.locator('#flip-current').click();
  await page.waitForTimeout(2500);
  expect(await spinSign(page)).toBe(-1);
  await expect(page.locator('#speed-dir')).toHaveText('↻');
  let p = await probe(page);
  const left = p.sides.findIndex(s => s.pos[0] < 0);
  expect(p.currentArrows[left].dir[2]).toBeLessThan(-.99); // 왼쪽 변의 전류가 뒤로(⊗)
  expect(p.forceArrows[left].dir[1]).toBeGreaterThan(.99); // 힘은 위로
  await page.locator('#flip-magnet').click();
  await page.waitForTimeout(2500);
  p = await probe(page);
  expect(close(p.fieldArrows[0], [1, 0, 0])).toBe(true); // 극을 바꾸면 자기장도 반대
  expect(await spinSign(page)).toBe(1);
});

test('간이 전동기 3D: 벗긴 쪽이 아래로 향한 반 바퀴 동안만 전류가 흐르고, 자석을 뒤집으면 자기장과 회전이 반대', async ({ page }) => {
  await open3D(page);
  await page.locator('#tab-simple').click();
  await page.locator('#show-detail').check();
  await page.locator('#switch-btn').click();
  await page.locator('#nudge').click();
  await page.waitForTimeout(1500);
  let flowing = 0, stopped = 0;
  for (let k = 0; k < 24; k++) {
    const p = await probe(page);
    expect(p.mode).toBe('simple');
    expect(p.contact).toBe(p.bareDown);
    expect(p.dotsVisible > 0).toBe(p.contact);
    if (p.contact) flowing++; else stopped++;
    await page.waitForTimeout(45);
  }
  expect(flowing).toBeGreaterThan(2);
  expect(stopped).toBeGreaterThan(2);
  let p = await probe(page);
  expect(p.simpleField.length).toBeGreaterThan(0);
  expect(p.simpleField.every(d => d[1] > .9)).toBe(true); // N극이 위: 자기장은 위로
  expect(await spinSign(page, 'ringPhase')).toBe(1);
  await page.locator('#flip-magnet').click();
  await page.locator('#nudge').click(); await page.locator('#nudge').click();
  await page.waitForTimeout(3000);
  p = await probe(page);
  expect(p.simpleField.every(d => d[1] < -.9)).toBe(true);
  expect(await spinSign(page, 'ringPhase')).toBe(-1);
});

test('전동기 3D: 매끄럽게 움직임 — 프레임 간격이 고르고, 코일이 한 프레임에 크게 건너뛰지 않음 @perf', async ({ page }) => {
  await open3D(page);
  await page.locator('[data-v="1"]').click();
  await page.locator('#switch-btn').click();
  await page.waitForTimeout(1500);
  const stats = await page.locator('canvas.motor3d').evaluate(c => new Promise(done => {
    const gaps = [], turns = [];
    let prev = performance.now();
    const end = prev + 3000;
    const tick = now => {
      gaps.push(now - prev); prev = now;
      turns.push(c.probe().rotorTurn);
      if (now < end) requestAnimationFrame(tick); else done({ gaps, turns, renderMs: c.probe().renderMs });
    };
    requestAnimationFrame(tick);
  }));
  const gaps = stats.gaps.slice(1).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)], p95 = gaps[Math.floor(gaps.length * .95)];
  const jumps = stats.turns.slice(1).map((t, i) => Math.abs(t - stats.turns[i]));
  console.log(`frames ${gaps.length}, median ${median.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, render ${stats.renderMs.toFixed(2)} ms, max step ${Math.max(...jumps).toFixed(3)} rad`);
  // 그래픽 카드가 없는 시험 환경(소프트웨어 렌더러)에서도 초당 25프레임 넘게, 프레임 간격이 고르게(느린 프레임도 중간값과 비슷하게) 나와야 해요.
  // 그래픽 카드가 있는 컴퓨터·태블릿·휴대폰에서는 초당 60프레임 가까이 나와요.
  expect(gaps.length).toBeGreaterThan(75);
  expect(p95).toBeLessThan(50);
  expect(p95 - median).toBeLessThan(17);
  expect(Math.max(...jumps)).toBeLessThan(.5); // 한 프레임에 30°도 안 돌아요(끊겨 보이지 않음)
  expect(jumps.filter(j => j > 0).length).toBeGreaterThan(gaps.length * .9); // 거의 모든 프레임에서 조금씩 움직여요
});

test('전동기 3D: 2D 그림으로 바꿀 수 있고, 고른 보기를 기억함', async ({ page }) => {
  await open3D(page);
  await expect(page.locator('canvas.motor3d')).toBeVisible();
  await expect(page.locator('#motor-scene')).toBeHidden();
  await page.locator('[data-view="2d"]').click();
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '2d');
  await expect(page.locator('canvas.motor3d')).toBeHidden();
  await expect(page.locator('#motor-scene')).toBeVisible();
  await expect(page.locator('[data-cam="axis"]')).toBeDisabled();
  await page.reload();
  await expect(page.locator('#view-bar')).toBeVisible();
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '2d');
  await page.locator('[data-view="3d"]').click();
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '3d');
});

test('전동기 3D: WebGL을 못 쓰는 기기에서는 2D 그림으로 그대로 실험함', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : get.call(this, type, ...rest); };
  });
  await openObserveUnlocked(page, URL);
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '2d');
  await expect(page.locator('#view-bar')).toBeHidden();
  await expect(page.locator('canvas.motor3d')).toHaveCount(0);
  await page.locator('#switch-btn').click();
  await expect(page.locator('#rotor path')).not.toHaveCount(0);
  await page.waitForTimeout(1200);
  await expect(page.locator('#speed-dir')).toHaveText('↺');
});

test('전동기 3D: 느린 기기에서는 화질을 스스로 낮춰 프레임이 빨라짐 @perf', async ({ page }) => {
  // 그래픽 카드가 있는 기기처럼 속여 처음에는 가장 좋은 화질로 시작하게 해요. 이 시험 환경은 실제로는 느려서 화질이 내려가야 해요.
  await page.addInitScript(() => {
    const get = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (p) { return p === 0x9246 ? 'ANGLE (Test GPU)' : get.call(this, p); };
  });
  await open3D(page);
  expect((await probe(page)).quality).toBe(0);
  await page.locator('#switch-btn').click();
  const fps = () => page.evaluate(() => new Promise(done => { let n = 0; const t0 = performance.now(); const f = now => { n++; if (now - t0 < 1500) requestAnimationFrame(f); else done(n / 1.5); }; requestAnimationFrame(f); }));
  const before = await fps();
  await expect.poll(async () => (await probe(page)).quality, { timeout: 20000 }).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(3000);
  const after = await fps();
  console.log(`quality 0: ${before.toFixed(1)} fps → quality ${(await probe(page)).quality}: ${after.toFixed(1)} fps`);
  expect(after).toBeGreaterThan(before);
});
