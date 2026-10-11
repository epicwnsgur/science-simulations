import { test, expect } from '@playwright/test';

test('메인 폴더에서 실험으로 이동하고 새로고침 후 목록으로 돌아옴', async ({ page }) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'실험 폴더'})).toBeVisible();
  await expect(page.locator('.future-folder')).toHaveCount(2);
  await expect(page.locator('.future-folder a, .future-folder button')).toHaveCount(0);
  await page.getByRole('link',{name:'A · 마찰 전기 실험 열기'}).click();
  await expect(page).toHaveURL(/\/simulations\/friction-electricity\/$/);
  await page.reload();
  await expect(page.locator('#scene')).toBeVisible();
  const sprite=await page.locator('#balloon-object image').getAttribute('href');
  expect((await page.request.get(sprite)).status()).toBe(200);
  await page.getByRole('link',{name:'← 실험 목록'}).click();
  await expect(page.getByRole('heading',{name:'실험 폴더'})).toBeVisible();
  expect(errors).toEqual([]);
});

for(const width of [1440,390]) test(`우주 메인 화면 ${width}px`, async ({ page })=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.experiment-art img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.screenshot({path:`/tmp/science-home-${width}.png`,fullPage:true});
});
