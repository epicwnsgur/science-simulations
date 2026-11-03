import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';

// 전류와 전압: 단추 대신 손으로 옮기는 조작(교사 의견: 단추로만 조작하니 흥미가 떨어져요). 단추로도 그대로 할 수 있어요.
const URL_ = '/simulations/electric-current/';
const center = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
async function dragTo(page, from, to) {
  await page.mouse.move(...from); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(from[0] + (to[0] - from[0]) * i / 10, from[1] + (to[1] - from[1]) * i / 10);
  await page.mouse.up();
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openObserveUnlocked(page, URL_);
  await page.locator('#scene').evaluate(el => el.scrollIntoView({ block: 'center' }));
});

test('네온전구: 털가죽을 문지르고, 알루미늄 접시를 끌어 내려놓고, 네온전구 끝을 끌어 오른쪽 접시에 대면 불이 켜짐', async ({ page }) => {
  const fur = await center(page, '#fur');
  await page.mouse.move(fur[0] - 120, fur[1]); await page.mouse.down();
  for (let k = 0; k < 4; k++) for (let i = 0; i <= 10; i++) await page.mouse.move(fur[0] + (k % 2 ? 120 - 24 * i : -120 + 24 * i), fur[1]);
  await page.mouse.up();
  await expect(page.locator('#stage-state')).toContainText('문지른 횟수 4번');
  // 접시를 내려놓기 전에는 네온전구 끝을 끌 수 없어요.
  await page.locator('#lead-tip-hit').dispatchEvent('pointerdown');
  await expect(page.locator('#toast')).toContainText('먼저 알루미늄 접시를 끌어 내려놓아요');
  const plate = await center(page, '#plate-a rect');
  await dragTo(page, plate, [plate[0], plate[1] + 140]);
  await expect(page.locator('#stage-state')).toContainText('알루미늄 접시를 올려놓음');
  const tip = await center(page, '#lead-tip-hit'), plateB = await center(page, '#plate-b ellipse');
  await dragTo(page, tip, [plateB[0] - 60, plateB[1]]);
  await expect(page.locator('#stage-state')).toContainText('네온전구 닿음');
  await expect(page.locator('#toast')).toContainText('네온전구에 불이 켜졌어요');
});

test('전기 회로: 전지 상자의 전지를 끌어 끼우고 끌어내 빼며, 펌프 손잡이를 돌리고, 짝 찾기를 선으로 이음', async ({ page }) => {
  await page.locator('#tab-circuit').click();
  await page.locator('#scene').evaluate(el => el.scrollIntoView({ block: 'center' }));
  await expect(page.locator('#stage-state')).toContainText('전지 없음');
  await dragTo(page, await center(page, '[data-cell-drag="tray"]'), await center(page, '#slot-box'));
  await expect(page.locator('#stage-state')).toContainText('전지 1개');
  await expect(page.locator('#battery-label')).toHaveText('전지 1개 연결(1.5 V)');
  await dragTo(page, await center(page, '[data-cell-drag="tray"]'), await center(page, '#slot-box'));
  await expect(page.locator('#stage-state')).toContainText('전지 2개');
  await expect(page.locator('[data-cell-drag="tray"]')).toHaveCount(0);
  // 끼운 전지를 전지 상자 쪽으로 끌어내면 빠져요.
  await dragTo(page, await center(page, '[data-cell-drag="slot"]'), await center(page, '#cell-tray rect'));
  await expect(page.locator('#stage-state')).toContainText('전지 1개');
  // 펌프 세기 손잡이: 끌어서 돌리기, 방향키
  const knob = await center(page, '#dial-knob');
  await dragTo(page, [knob[0], knob[1] - 20], [knob[0] - 40, knob[1] - 4]);
  await expect(page.locator('#stage-state')).toContainText('펌프 멈춤');
  await dragTo(page, [knob[0], knob[1] - 20], [knob[0] + 40, knob[1] - 4]);
  await expect(page.locator('#stage-state')).toContainText('펌프 세게');
  await page.locator('#pump-dial').focus(); await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#stage-state')).toContainText('펌프 약하게');
  await expect(page.locator('#pump-btn')).toHaveText('펌프 멈추기');
  // 짝 찾기: 위 줄의 낱말을 아래 줄의 짝에 끌어다 놓으면 선이 남아요. 틀린 짝이면 선이 남지 않아요.
  await page.locator('#pair-area').evaluate(el => el.scrollIntoView({ block: 'center' }));
  await dragTo(page, await center(page, '[data-pair-left="wire"]'), await center(page, '[data-pair-right="wheel"]'));
  await expect(page.locator('#pair-lines path')).toHaveCount(0);
  await dragTo(page, await center(page, '[data-pair-left="battery"]'), await center(page, '[data-pair-right="pump"]'));
  await expect(page.locator('.pair-title small')).toContainText('(1 / 5)');
  await expect(page.locator('#pair-lines path')).toHaveCount(1);
  // 아래 줄에서 위 줄로 끌어도 돼요.
  await dragTo(page, await center(page, '[data-pair-right="channel"]'), await center(page, '[data-pair-left="wire"]'));
  await expect(page.locator('#pair-lines path')).toHaveCount(2);
});
