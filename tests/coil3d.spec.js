import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';
import { coilField3, magnetField3, addV, EARTH3, NEEDLE_Y } from '../src/field3d.js';

// 전류가 만든 자기장 3D 화면: 화면에 그려진 바늘과 자기장 화살표가 과학적으로 맞는지, 부드럽게 움직이는지 확인해요.
const URL = '/simulations/coil-magnetic-field/';
const LEVEL_S = [.4, .9, 1.8];
const probe = page => page.locator('canvas.lab3d').evaluate(c => c.probe());
const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / Math.hypot(...a) / Math.hypot(...b)))) * 180 / Math.PI;
async function open3D(page) {
  await openObserveUnlocked(page, URL);
  await expect(page.locator('.stage')).toHaveAttribute('data-view', '3d', { timeout: 15000 });
}
// 스위치를 누르고 있는 동안만 전류가 흘러요.
async function holdSwitch(page) {
  await page.locator('#press-btn').scrollIntoViewIfNeeded();
  const box = await page.locator('#press-btn').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator('#press-btn')).toHaveAttribute('aria-pressed', 'true');
}
// 바늘의 N극이 가리키는 방향(판 위, [x, z])이 지구 자기장 + 코일(자석)의 자기장 방향과 같은지
function expectNeedles(p, source) {
  for (const c of [...p.compasses, p.probe]) {
    const B = addV(source([c.at[0], NEEDLE_Y, c.at[1]]), EARTH3);
    expect(angleBetween(c.north, [B[0], B[2]]), `나침반 ${c.at.map(v => v.toFixed(2))}`).toBeLessThan(6);
  }
}

test('자기장 3D: 전류가 없으면 바늘이 모두 북쪽, 전류가 흐르면 바늘이 (지구 + 코일) 자기장 방향을 가리킴', async ({ page }) => {
  await open3D(page);
  await page.locator('#tab-coil').click();
  await page.waitForTimeout(1500);
  let p = await probe(page);
  expect(p.coilVisible).toBe(true);
  for (const c of p.compasses) expect(angleBetween(c.north, [0, -1])).toBeLessThan(3);
  await holdSwitch(page);
  await page.waitForTimeout(2600); // 바늘이 흔들리다 멈출 때까지
  p = await probe(page);
  expect(p.volts).toBe('3.0');
  expect(p.dotsVisible).toBeGreaterThan(10);
  expectNeedles(p, q => coilField3(q, LEVEL_S[1], 1));
  await page.mouse.up();
});

test('자기장 3D: 판을 뚫는 도선의 전류(북쪽은 위로)와 자기장 화살표가 오른손 법칙대로 돌고, 전류를 바꾸면 모두 반대', async ({ page }) => {
  await open3D(page);
  await page.locator('#tab-coil').click();
  await page.locator('#show-detail').check();
  for (const dir of [1, -1]) {
    if (dir < 0) await page.locator('#flip-btn').click();
    await holdSwitch(page);
    await page.waitForTimeout(2600);
    const p = await probe(page);
    const [northArrow, southArrow] = p.crossArrows;
    expect(northArrow.visible && southArrow.visible).toBe(true);
    expect(northArrow.dir[1]).toBeCloseTo(dir, 2);   // 북쪽 도선: 처음에는 위로
    expect(southArrow.dir[1]).toBeCloseTo(-dir, 2);  // 남쪽 도선: 처음에는 아래로
    expect(p.heads.length).toBeGreaterThan(20);
    let checked = 0;
    for (const h of p.heads) {
      // 화살표 방향 = 그 자리의 자기장 방향
      const B = coilField3([h.at[0], 0, h.at[2]], 1, dir);
      expect(angleBetween([h.dir[0], h.dir[2]], [B[0], B[2]])).toBeLessThan(12);
      // 북쪽 도선(z = −1) 가까이: 위에서 볼 때 전류가 위로면 시계 반대 방향(오른손 법칙)
      const r = [h.at[0], h.at[2] + 1];
      if (Math.hypot(...r) < .7) { expect(Math.sign(r[1] * h.dir[0] - r[0] * h.dir[2])).toBe(dir); checked++; }
    }
    expect(checked).toBeGreaterThan(0);
    expectNeedles(p, q => coilField3(q, LEVEL_S[1], dir));
    await page.mouse.up();
  }
});

test('자기장 3D: 전류가 셀수록 바늘이 북쪽에서 더 많이 돌아감', async ({ page }) => {
  await open3D(page);
  await page.locator('#tab-coil').click();
  const turned = [];
  for (const level of [0, 2]) {
    await page.locator(`[data-level="${level}"]`).click();
    await holdSwitch(page);
    await page.waitForTimeout(2600);
    const p = await probe(page);
    expectNeedles(p, q => coilField3(q, LEVEL_S[level], 1));
    turned.push(p.compasses.map(c => angleBetween(c.north, [0, -1])));
    await page.mouse.up();
  }
  turned[0].forEach((weak, i) => expect(turned[1][i]).toBeGreaterThan(weak));
});

test('자기장 3D: 막대자석 주위 바늘과 자기장 화살표는 N극에서 나와 S극으로', async ({ page }) => {
  await open3D(page);
  await page.locator('#show-detail').check();
  await page.waitForTimeout(2600);
  const p = await probe(page);
  expect(p.magnetVisible).toBe(true);
  expectNeedles(p, magnetField3);
  const west = p.compasses[3]; // N극(왼쪽) 바깥의 나침반
  expect(west.north[0]).toBeLessThan(-.9);
  for (const h of p.heads) {
    const B = magnetField3([h.at[0], 0, h.at[2]]);
    expect(angleBetween([h.dir[0], h.dir[2]], [B[0], B[2]])).toBeLessThan(15);
  }
});

test('자기장 3D: 노란 나침반을 3D 화면에서 끌어 옮기면 부드럽게 따라오고, 그 자리의 자기장을 가리킴', async ({ page }) => {
  await open3D(page);
  await page.locator('.stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const before = await probe(page);
  const [sx, sy] = before.probeScreen;
  const camBefore = await page.locator('canvas.lab3d').evaluate(c => c.probe().compasses[0].at);
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(sx - i * 22, sy - i * 6);
  // 끄는 중에는 손가락을 살짝 늦게 따라와요(부드럽게).
  const mid = await probe(page);
  await page.mouse.up();
  await page.waitForTimeout(800);
  const after = await probe(page);
  expect(after.probe.at[0]).toBeLessThan(before.probe.at[0] - 1.5);
  expect(Math.abs(mid.probe.at[0] - before.probe.at[0])).toBeGreaterThan(.1);
  // 나침반을 끌었으니 화면은 돌아가지 않았어요.
  expect((await probe(page)).compasses[0].at).toEqual(camBefore);
  await page.waitForTimeout(2000);
  expectNeedles(await probe(page), magnetField3);
});

test('자기장 3D: 2D 그림으로 바꿀 수 있고, WebGL이 없으면 2D로 그대로 실험함', async ({ page }) => {
  await open3D(page);
  await expect(page.locator('#compasses')).toBeHidden();
  await page.locator('[data-view="2d"]').click();
  await expect(page.locator('#compasses')).toBeVisible();
  await expect(page.locator('canvas.lab3d')).toBeHidden();
  const page2 = await page.context().newPage();
  await page2.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : get.call(this, type, ...rest); };
  });
  await openObserveUnlocked(page2, URL);
  await expect(page2.locator('.stage')).toHaveAttribute('data-view', '2d');
  await expect(page2.locator('#view-bar')).toBeHidden();
  await page2.locator('#tab-coil').click();
  await page2.locator('#show-detail').check();
  await holdSwitch(page2);
  await expect(page2.locator('#field-lines path')).toHaveCount(8);
  await page2.waitForTimeout(1500);
  // 2D 그림의 바늘도 같은 3D 계산을 써요: 동쪽 나침반(580, 230)은 동쪽으로 돌아가요.
  const rot = Number((await page2.locator('#c6 .needle').getAttribute('transform')).match(/-?[\d.]+/)[0]);
  expect(rot).toBeGreaterThan(20);
  await page2.mouse.up();
});

test('자기장 3D: 매끄럽게 움직임 — 자기장 화살표가 흐르는 동안 프레임 간격이 고름 @perf', async ({ page }) => {
  await open3D(page);
  await page.locator('#tab-coil').click();
  await page.locator('#show-detail').check();
  await holdSwitch(page);
  await page.waitForTimeout(1500);
  const gaps = await page.evaluate(() => new Promise(done => {
    const out = []; let prev = performance.now(); const end = prev + 3000;
    const tick = now => { out.push(now - prev); prev = now; if (now < end) requestAnimationFrame(tick); else done(out); };
    requestAnimationFrame(tick);
  }));
  const g = gaps.slice(1).sort((a, b) => a - b), median = g[Math.floor(g.length / 2)], p95 = g[Math.floor(g.length * .95)];
  console.log(`coil 3D: frames ${g.length}, median ${median.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, quality ${(await probe(page)).quality}`);
  // 그래픽 카드가 없는 시험 환경에서도 초당 25프레임 넘게, 고르게
  expect(g.length).toBeGreaterThan(75);
  expect(p95).toBeLessThan(50);
  expect(p95 - median).toBeLessThan(17);
  await page.mouse.up();
});

test('자기장: 전류 방향을 바꾸면 전원 장치의 두 전선이 바뀌어 꽂히고(2D·3D), 판을 뚫는 곳의 ⊙·⊗와 바늘이 반대로', async ({ page }) => {
  await open3D(page);
  await page.locator('#tab-coil').click();
  expect((await probe(page)).plusLeadEnd).toBe(1); // 처음: (+)극 → 코일의 동쪽 끝
  await holdSwitch(page);
  await page.waitForTimeout(2600);
  const before = (await probe(page)).compasses.map(c => c.north);
  await page.mouse.up();
  await page.locator('#flip-btn').click();
  await expect(page.locator('.toast')).toContainText('두 전선을 바꾸어 꽂았어요');
  expect((await probe(page)).plusLeadEnd).toBe(-1); // 바꾼 뒤: (+)극 → 서쪽 끝
  await holdSwitch(page);
  await page.waitForTimeout(2600);
  const p = await probe(page);
  expect(p.crossArrows[0].visible).toBe(true); // 전류가 흐르면 ‘자기장 모습 보기’를 켜지 않아도 전류 화살표가 보여요.
  expect(p.crossArrows[0].dir[1]).toBeCloseTo(-1, 2); // 북쪽 도선: 이제 아래로
  expectNeedles(p, q => coilField3(q, LEVEL_S[1], -1));
  // 코일 가까이(북·남쪽) 나침반은 방향이 거의 반대로 돌아요.
  for (const i of [0, 1]) expect(angleBetween(before[i], p.compasses[i].north)).toBeGreaterThan(150);
  await page.mouse.up();
  // 2D 그림도 같아요: (+)극 전선이 서쪽 끝으로, 북쪽은 ⊗(판 아래로), 남쪽은 ⊙(판 위로)
  await page.locator('[data-view="2d"]').click();
  await holdSwitch(page);
  await expect(page.locator('#crossings')).toHaveAttribute('opacity', '1');
  expect(await page.locator('#lead-p').getAttribute('d')).toMatch(/H392 V236$/);
  await expect(page.locator('#cross-n .mark path')).toHaveCount(1);
  await expect(page.locator('#cross-s .mark circle')).toHaveCount(1);
  await expect(page.locator('#leads')).toHaveClass(/on/);
  await page.mouse.up();
});
