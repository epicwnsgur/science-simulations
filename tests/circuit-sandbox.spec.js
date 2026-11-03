import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';

// 저항의 연결: 넷째 탭 ‘자유 회로 실험실’(src/circuit-sandbox.js)과 전구 1개 대비 비교 막대
const URL_ = '/simulations/series-parallel/';
const place = async (page, tool, edge) => {
  await page.locator(`[data-sb-tool="${tool}"]`).click();
  await page.locator(`[data-edge="${edge}"]`).focus();
  await page.keyboard.press('Enter');
};

test('자유 회로 실험실: 부품을 놓아 회로를 만들면 전류계·전압계 값이 옴의 법칙과 맞고, 합선을 알려 줌', async ({ page }) => {
  await openObserveUnlocked(page, URL_);
  await page.locator('#tab-free').click();
  await expect(page.locator('#free-board')).toBeVisible();
  // 전지 1개 + 전구 1개 + 전류계 + 도선으로 닫힌 회로: 1.5 V ÷ 10 Ω = 150 mA
  await place(page, 'cell', 'h1_1');
  await place(page, 'bulb', 'v2_1');
  await place(page, 'ammeter', 'h1_2');
  for (const e of ['v1_1']) await place(page, 'wire', e);
  const readout = page.locator('#readout');
  await expect(readout).toContainText(/전류계\s*-?150 mA/);
  // 전압계를 전구에 나란히: 1.50 V
  await place(page, 'voltmeter', 'v2_1');
  await expect(readout).toContainText(/1\.50 V/);
  // 전구를 지우고 그 자리를 도선으로: 합선
  await place(page, 'wire', 'v2_1');
  await expect(readout).toContainText('합선');
  // 예시 회로: 병렬연결 600 mA
  await page.locator('[data-sb-preset="parallel"]').click();
  await expect(readout).toContainText('600 mA');
  await expect(readout).toContainText('3.00 V');
});

test('저항의 연결 비교 막대: 직렬은 전체 저항↑·전체 전류 150 mA·전구 전압 1.5 V, 병렬은 전체 저항↓·600 mA·3.0 V', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openObserveUnlocked(page, URL_);
  await page.locator('#tab-series').click(); await page.locator('#close-all').click();
  await expect(page.locator('#cmp-r-w')).toHaveText('전구 1개일 때보다 커요');
  await expect(page.locator('#cmp-i-v')).toHaveText('150 mA');
  await expect(page.locator('#cmp-v-v')).toContainText('1.5 V');
  await page.locator('#tab-parallel').click(); await page.locator('#close-all').click();
  await expect(page.locator('#cmp-r-w')).toHaveText('전구 1개일 때보다 작아요');
  await expect(page.locator('#cmp-i-v')).toHaveText('600 mA');
  await expect(page.locator('#cmp-v-w')).toHaveText('전구 1개일 때와 같아요');
});

test('전기와 자기 실험은 처음부터 전하·전자 보기가 켜져 있고, 끄고 다시 켤 수 있음', async ({ page }) => {
  for (const [slug, box] of [['friction-electricity', '#show-detail'], ['electrostatic-induction', '#show-charges'], ['electric-current', '#show-detail'], ['ohms-law', '#show-detail'], ['series-parallel', '#show-detail'], ['coil-magnetic-field', '#show-detail'], ['electric-swing', '#show-detail'], ['electric-motor', '#show-detail']]) {
    await page.goto(`/simulations/${slug}/`);
    await expect(page.locator(box), slug).toBeChecked();
    // 복습 화면에서는 실험 칸이 아직 숨어 있어서, 상자를 직접 눌러 끄고 켜 봐요.
    await page.locator(box).evaluate(el => el.click()); await expect(page.locator(box), slug).not.toBeChecked();
    await page.locator(box).evaluate(el => el.click()); await expect(page.locator(box), slug).toBeChecked();
  }
});

test('자유 회로 실험실: 부품을 끌어다 놓고, 전자의 이동·전류의 방향을 바꿔 보고, 전압·저항 표시와 계기 안의 값을 봄', async ({ page }) => {
  await openObserveUnlocked(page, URL_);
  await page.locator('#tab-free').click();
  await page.locator('[data-sb-preset="single"]').click();
  await page.locator('#controls').evaluate(el => el.scrollIntoView({ block: 'start' }));
  // ‘저항’ 단추를 판 위 빈 자리로 끌어다 놓기
  const btn = await page.locator('[data-sb-tool="resistor"]').boundingBox();
  const edge = await page.locator('[data-edge="h6_0"]').evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2); await page.mouse.down();
  await page.mouse.move(edge.x, edge.y, { steps: 12 });
  await expect(page.locator('.sb-ghost')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('.sb-resistor')).toHaveCount(1);
  // 계기 값은 계기 안에, 전구의 빛줄기
  await expect(page.locator('.sb-ammeter .sb-meter-value')).toHaveText('300 mA');
  await expect(page.locator('.sb-ray').first()).toBeAttached();
  // 전류의 방향: 화살표로, 전자의 이동: 점으로
  await page.locator('[name="sb-flow"][value="current"]').check();
  await expect(page.locator('.sb-current').first()).toBeAttached();
  await expect(page.locator('.sb-electron')).toHaveCount(0);
  await page.locator('[name="sb-flow"][value="electron"]').check();
  await expect(page.locator('.sb-electron').first()).toBeAttached();
  // 전압·저항 표시: 전구에 걸린 전압 3.00 V · 10 Ω
  await page.locator('#sb-values').check();
  await expect(page.locator('#free-board .sb-labels')).toContainText('3.00 V · 10 Ω');
});
