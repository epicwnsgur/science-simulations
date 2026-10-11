import { test, expect } from '@playwright/test';

test('학년 폴더와 실험 사이를 이동하고 새로고침 후 목록으로 돌아옴', async ({ page }) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/준혁T의 과학 실험실/);
  await expect(page.getByRole('heading',{name:'나만의 탐구를 시작해요'})).toBeVisible();
  await expect(page.locator('.future-folder')).toHaveCount(0);
  await page.getByRole('link',{name:'중학교 2학년 과학 폴더 열기'}).click();
  await page.reload();
  await expect(page.getByRole('heading',{name:'중학교 2학년 과학',exact:true})).toBeVisible();
  await expect(page.locator('.folder-tab')).toHaveText(['실험','실험','실험']);
  await expect(page.locator('.future-folder')).toHaveCount(2);
  await expect(page.locator('.future-folder a, .future-folder button')).toHaveCount(0);
  await page.getByRole('link',{name:'마찰 전기 실험 열기'}).click();
  await expect(page).toHaveURL(/\/simulations\/friction-electricity\/$/);
  await page.reload();
  await expect(page.locator('#scene')).toBeVisible();
  const sprite=await page.locator('#balloon-object image').getAttribute('href');
  expect((await page.request.get(sprite)).status()).toBe(200);
  await page.getByRole('link',{name:'← 실험 목록'}).click();
  await expect(page).toHaveURL(/\/grades\/middle-school-2\/$/);
  await page.getByRole('link',{name:'← 학년 목록'}).click();
  await expect(page.getByRole('link',{name:'중학교 2학년 과학 폴더 열기'})).toBeVisible();
  expect(errors).toEqual([]);
});

for(const width of [1440,390]) test(`메인과 학년 폴더 화면 ${width}px`, async ({ page })=>{
  await page.setViewportSize({width,height:1000});
  for(const [name,path] of [['home','/'],['grade','/grades/middle-school-2/']]){
    await page.goto(path);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(name==='grade')expect(await page.locator('.experiment-art img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    await page.screenshot({path:`/tmp/science-${name}-${width}.png`,fullPage:true});
  }
});
