import { test, expect } from '@playwright/test';
import { openObserveUnlocked } from './poe-helpers.js';

// 전기 에너지의 이용: 카드·기구를 끌어다 놓아요(교사 의견: 누르기만 하는 조작은 불편해요). 누르기·키보드로도 돼요.
const URL_ = '/simulations/electric-energy/';
async function dragTo(page, from, to) {
  const a = await page.locator(from).boundingBox(), b = await page.locator(to).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * i / 10, a.y + a.height / 2 + (b.y + b.height / 2 - a.y - a.height / 2) * i / 10);
  await page.mouse.up();
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openObserveUnlocked(page, URL_);
  await page.locator('.stage').scrollIntoViewIfNeeded();
});

test('소비 전력 순서: 카드를 다른 카드 위에 끌어다 놓으면 자리가 바뀌고, 확인하면 제자리 카드는 초록으로 고정됨', async ({ page }) => {
  await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-drag', 'card:fan');
  await dragTo(page, '[data-drag="card:kettle"]', '[data-slot="0"]');
  await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-drag', 'card:kettle');
  await expect(page.locator('[data-slot="1"]')).toHaveAttribute('data-drag', 'card:fan');
  await page.locator('#check-order').click();
  await expect(page.locator('[data-drag="card:kettle"]')).toHaveAttribute('data-locked', '1');
  await expect(page.locator('#stage-hint')).toContainText('제자리예요');
  // 제자리(초록) 카드와는 자리를 바꿀 수 없어요.
  await dragTo(page, '[data-drag="card:led"]', '[data-slot="0"]');
  await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-drag', 'card:kettle');
  await expect(page.locator('#stage-hint')).toContainText('초록색 카드는 이미 제자리예요');
  // 키보드: 카드에서 Enter, 다른 카드에서 Enter로 자리를 바꿔요.
  await page.locator('[data-drag="card:aircon"]').focus(); await page.keyboard.press('Enter');
  await page.locator('[data-slot="1"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-slot="1"]')).toHaveAttribute('data-drag', 'card:aircon');
});

test('에너지 전환: 기구를 알맞은 에너지 칸에 끌어 넣고, 틀린 칸이면 까닭을 말풍선으로 알려 줌', async ({ page }) => {
  await page.locator('#tab-convert').click();
  await dragTo(page, '[data-drag="dev:fan"]', '[data-zone="heat"]');
  await expect(page.locator('#stage-hint')).toContainText('열을 내려고 쓰는 기구는 아니에요');
  await expect(page.locator('[data-zone="heat"]')).not.toContainText('선풍기');
  await dragTo(page, '[data-drag="dev:fan"]', '[data-zone="chemical"]');
  await expect(page.locator('#stage-hint')).toContainText('날개를 돌려 바람을 만들어요');
  await dragTo(page, '[data-drag="dev:fan"]', '[data-zone="motion"]');
  await expect(page.locator('[data-zone="motion"]')).toContainText('선풍기');
  await expect(page.locator('[data-drag="dev:fan"]')).toHaveAttribute('data-locked', '1');
  // 두 가지 에너지로 바뀌는 기구는 두 칸에 넣어야 끝나요.
  await dragTo(page, '[data-drag="dev:tv"]', '[data-zone="light"]');
  await expect(page.locator('[data-drag="dev:tv"]')).toContainText('한 칸 더');
  await expect(page.locator('#stage-hint')).toContainText('다른 칸을 하나 더');
  await dragTo(page, '[data-drag="dev:tv"]', '[data-zone="sound"]');
  await expect(page.locator('#stage-hint')).toContainText('빛에너지 + 소리 에너지');
  await expect(page.locator('#readout')).toContainText('텔레비전');
  // 에어컨을 열에너지 칸에 넣으면 열을 옮기는 기구라고 알려 줘요.
  await dragTo(page, '[data-drag="dev:aircon"]', '[data-zone="heat"]');
  await expect(page.locator('#stage-hint')).toContainText('열을 밖으로 옮기는 기구');
});

test('같은 시간 켜 보기: 기구를 콘센트에 끌어다 꽂아야 켤 수 있고, 같은 시간 동안 소비 전력이 큰 기구가 더 많이 씀', async ({ page }) => {
  await page.locator('#tab-meter').click();
  await expect(page.locator('#run-hour')).toBeDisabled();
  await dragTo(page, '[data-drag="plug:kettle"]', '[data-zone="R"]');
  await expect(page.locator('[data-zone="R"]')).toContainText('전기 주전자');
  await dragTo(page, '[data-drag="plug:led"]', '[data-zone="L"]');
  await expect(page.locator('#run-hour')).toBeEnabled();
  await page.locator('#run-hour').click();
  await expect(page.locator('#readout')).toContainText('2,000 Wh');
  await expect(page.locator('#readout')).toContainText('10 Wh');
  await expect(page.locator('#stage-hint')).toContainText('소비 전력이 큰 전기 주전자가');
  // 다른 기구로 바꿔 꽂으면 계량기가 0부터 다시 시작해요.
  await page.locator('[data-drag="plug:fan"]').click();
  await expect(page.locator('#readout')).toBeEmpty();
});
