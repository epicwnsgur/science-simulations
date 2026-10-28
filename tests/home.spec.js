import { test, expect } from '@playwright/test';
import { beginObservation } from './poe-helpers.js';

test('학년 폴더와 실험 사이를 이동하고 새로고침 후 목록으로 돌아옴', async ({ page }) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.available')).toHaveText('폴더 2개 · 실험 16개');
  await expect(page).toHaveTitle(/준혁T의 과학 실험실/);
  await expect(page.getByRole('heading',{name:'나만의 탐구를 시작해요'})).toBeVisible();
  await expect(page.locator('.future-folder')).toHaveCount(0);
  await page.getByRole('link',{name:'중학교 2학년 과학 폴더 열기'}).click();
  await page.reload();
  await expect(page.getByRole('heading',{name:'중학교 2학년 과학',exact:true})).toBeVisible();
  await expect(page.locator('.available')).toHaveText('폴더 8개 · 실험 13개');
  await expect(page.locator('.unit-folder')).toHaveCount(8);
  await page.getByRole('link',{name:'VII. 전기와 자기 폴더 열기',exact:true}).click();
  await page.reload();
  await expect(page.locator('.available')).toHaveText('실험 8개');
  await expect(page.locator('.folder-tab')).toHaveCount(8);
  await expect(page.locator('.future-folder')).toHaveCount(0);
  await expect(page.locator('.active-folder')).toHaveCount(8);
  await expect(page.getByRole('link',{name:'정전기 유도 실험 열기'})).toHaveAttribute('href','../../../simulations/electrostatic-induction/');
  await expect(page.locator('.future-folder a, .future-folder button')).toHaveCount(0);
  await page.getByRole('link',{name:'마찰 전기 실험 열기'}).click();
  await expect(page).toHaveURL(/\/simulations\/friction-electricity\/$/);
  await page.reload();
  await expect(page.locator('#review-panel')).toBeVisible();
  await beginObservation(page);
  await expect(page.locator('#scene')).toBeVisible();
  const sprite=await page.locator('#balloon image').getAttribute('href');
  expect((await page.request.get(sprite)).status()).toBe(200);
  await page.getByRole('link',{name:'← 실험 목록'}).click();
  await expect(page).toHaveURL(/\/grades\/middle-school-2\/unit-7\/$/);
  await page.getByRole('link',{name:'← 단원 목록',exact:true}).click();
  await page.getByRole('link',{name:'← 학년 목록'}).click();
  await expect(page.getByRole('link',{name:'중학교 2학년 과학 폴더 열기'})).toBeVisible();
  expect(errors).toEqual([]);
});

for(const width of [1440,390]) test(`메인과 학년 폴더 화면 ${width}px`, async ({ page })=>{
  await page.setViewportSize({width,height:1000});
  for(const [name,path] of [['home','/'],['grade','/grades/middle-school-2/'],['unit','/grades/middle-school-2/unit-7/'],['unit','/grades/middle-school-2/unit-8/']]){
    await page.goto(path);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(name==='unit')for(const img of await page.locator('.experiment-art img').all())expect(await img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
    await page.screenshot({path:`/tmp/science-${name}-${width}.png`,fullPage:true});
  }
});

 test('8개 단원 이름과 빈 폴더 직접 접속',async({page})=>{
  const names=['I. 물질의 특성','II. 지권의 변화','III. 빛과 파동','IV. 물질의 구성','V. 식물과 에너지','VI. 동물과 에너지','VII. 전기와 자기','VIII. 별과 우주'];
  await page.goto('/grades/middle-school-2/');
  await expect(page.locator('.unit-folder h3')).toHaveText(names);
  await expect(page.getByText('어떤 실험을 해 볼까요?')).toHaveCount(0);
  for(let i=1;i<=8;i++){
    await page.goto(`/grades/middle-school-2/unit-${i}/`);await page.reload();
    await expect(page.locator('h1')).toHaveText(names[i-1]);
    if(i<7)await expect(page.locator('.empty-unit')).toBeVisible();
  }
 });
