import { test, expect } from '@playwright/test';
test('마찰, 전하 보존, 전기력 비교, 초기화',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#note-title')).toContainText('아직은');
 await page.locator('#rub-button').click();
 await expect(page.locator('#charge-cards')).toContainText('− 7');
 await expect(page.locator('#charge-cards')).toContainText('− 9');
 for(let i=0;i<3;i++)await page.locator('#rub-button').click();
 await expect(page.locator('#rub-button')).toBeDisabled();
 await expect(page.locator('#charge-cards')).toContainText('− 4');
 await expect(page.locator('#charge-cards')).toContainText('− 12');
 await page.locator('#show-charges').uncheck();
 await expect(page.locator('.particles circle')).toHaveCount(0);
 await page.locator('#show-charges').check();
 await page.locator('#force-tab').click();await page.locator('#observe-button').click();
 await expect(page.locator('#note-title')).toContainText('인력');
 await expect(page.locator('#fur')).toHaveAttribute('transform','translate(280 215)');
 await page.locator('[data-pair="repel"]').click();await page.locator('#observe-button').click();
 await expect(page.locator('#note-title')).toContainText('척력');
 await expect(page.locator('#fur')).toHaveAttribute('transform','translate(155 215)');
 await page.locator('[data-answer="nucleus"]').click();await expect(page.locator('#feedback')).toContainText('다시');
 await page.locator('[data-answer="electron"]').click();await expect(page.locator('#feedback')).toContainText('맞아요');
 for(const term of ['마찰 전기','대전','대전체','전기력','척력','인력'])await expect(page.locator('.term-buttons')).toContainText(term);
 await page.locator('#source-button').click();await expect(page.locator('#sources')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('#reset').click();await expect(page.locator('#note-title')).toContainText('아직은');
 expect(errors).toEqual([]);
});
test('마우스 마찰과 비접촉 이동',async({page})=>{
 await page.goto('/');const svg=await page.locator('#scene').boundingBox();
 const p=(x,y)=>({x:svg.x+x*svg.width/800,y:svg.y+y*svg.height/440});
 let a=p(590,215),b=p(570,195);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
 await expect(page.locator('#note-title')).toContainText('아직은');
 a=p(570,195);b=p(310,235);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:20});
 for(let i=0;i<3;i++){const c=p(i%2?330:280,235);await page.mouse.move(c.x,c.y,{steps:8});}await page.mouse.up();
 await expect(page.locator('#note-title')).toContainText('전자가');
});
test('모바일 버튼 조작, 화면 넘침 없음',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.locator('#rub-button').click();await expect(page.locator('#note-title')).toContainText('전자가');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/science-mobile.png',fullPage:true});
});
test('데스크톱 화면',async({page})=>{await page.setViewportSize({width:1440,height:1100});await page.goto('/');await page.screenshot({path:'/tmp/science-desktop.png',fullPage:true});});
test('키보드로 마찰',async({page})=>{
 await page.goto('/');await page.locator('#balloon-object').focus();
 for(let i=0;i<15;i++)await page.keyboard.press('ArrowLeft');
 await expect(page.locator('#note-title')).toContainText('전자가');
});
test('터치로 물체를 이동하여 마찰',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('http://127.0.0.1:5173');
 const client=await context.newCDPSession(page);
 const coords=await page.locator('#scene').evaluate(el=>{const m=el.getScreenCTM();return Array.from({length:21},(_,i)=>{const p=new DOMPoint(590-i*15,215).matrixTransform(m);return {x:p.x,y:p.y};});});
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[coords[0]]});
 for(const p of coords.slice(1))await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('#note-title')).toContainText('전자가');await context.close();
});
