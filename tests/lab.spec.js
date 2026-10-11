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
 await expect(page.locator('#observe-button')).toBeEnabled();
 await expect(page.locator('#fur')).toHaveAttribute('transform','translate(215 245)');
 await expect(page.locator('#balloon-object')).toHaveAttribute('transform','translate(385 200)');
 await page.locator('[data-pair="repel"]').click();await page.locator('#observe-button').click();
 await expect(page.locator('#note-title')).toContainText('척력');
 await expect(page.locator('#fur')).toHaveAttribute('transform','translate(155 261)');
 await page.locator('[data-answer="nucleus"]').click();await expect(page.locator('#feedback')).toContainText('다시');
 await page.locator('[data-answer="electron"]').click();await expect(page.locator('#feedback')).toContainText('맞아요');
 for(const term of ['마찰 전기','대전','대전체','전기력','척력','인력'])await expect(page.locator('.term-buttons')).toContainText(term);
 await expect(page.locator('body')).not.toContainText('INTERACTIVE SCIENCE LAB');
 await expect(page.locator('body')).not.toContainText('수업 자료 및 모형 안내');
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

test('사실적인 이미지, 마찰 후 들어 올리면 털이 끌림, 초기화', async({page})=>{
 await page.goto('/');
 await expect(page.locator('#lift-button')).toBeDisabled();
 await expect(page.locator('#fur .fur-backing image')).toHaveAttribute('href', /balloon-fur.png/);
 const response=await page.request.get('/images/balloon-fur.png');expect(response.ok()).toBe(true);
 await page.locator('#rub-button').click();
 await expect(page.locator('#lift-button')).toBeEnabled();
 const before=await page.locator('#charge-cards').innerText();
 await page.locator('#lift-button').click();
 await expect(page.locator('#note-title')).toContainText('털끝');
 await page.waitForTimeout(1200);
 const transform=await page.locator('#fur').getAttribute('transform');
 const [x,y]=transform.match(/[-\d.]+/g).map(Number);
 expect(x).toBe(215);expect(y).toBe(245);
 const bends=await page.locator('.fiber-patch').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.bend)));
 expect(Math.max(...bends)).toBeGreaterThan(1);expect(Math.min(...bends)).toBeLessThan(.5);
 expect(await page.locator('#charge-cards').innerText()).toBe(before);
 await page.locator('#balloon-object').focus();
 for(let i=0;i<12;i++)await page.keyboard.press('ArrowRight');
 await page.waitForTimeout(1200);
 const far=await page.locator('#fur').getAttribute('transform');
 const [fx,fy]=far.match(/[-\d.]+/g).map(Number);
 expect(Math.abs(fx-215)).toBeLessThan(1);expect(Math.abs(fy-245)).toBeLessThan(1);
 await page.locator('#reset').click();await expect(page.locator('#lift-button')).toBeDisabled();
 await expect(page.locator('#fur')).toHaveAttribute('transform','translate(215 245)');
});
test('직접 풍선을 위로 드래그해도 털이 끌리고 전자는 추가 이동하지 않음',async({page})=>{
 await page.goto('/');await page.locator('#show-charges').check();await page.locator('#rub-button').click();
 await expect(page.locator('#lift-button')).toBeEnabled();
 const before=await page.locator('#charge-cards').innerText();
 const points=await page.locator('#scene').evaluate(el=>{const m=el.getScreenCTM();return [new DOMPoint(312,220),new DOMPoint(312,115)].map(p=>{const q=p.matrixTransform(m);return {x:q.x,y:q.y};});});
 await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:20});await page.mouse.up();
 await expect(page.locator('#note-title')).toContainText('털끝');expect(await page.locator('#charge-cards').innerText()).toBe(before);
});

test('전하와 이동 중 전자가 이미지 내부에 있고 전체 전하 수 보존',async({page})=>{
 await page.goto('/');await page.locator('#show-charges').check();
 const inspect=()=>page.evaluate(async()=>{
  const {insideBody}=await import('/src/model.js');
  const failures=[];
  for(const group of document.querySelectorAll('#fur, #balloon-object')) {
   const kind=group.dataset.shape;
   for(const node of group.querySelectorAll('.charge')){
    const [x,y]=node.getAttribute('transform').match(/[-\d.]+/g).map(Number);
    if(!insideBody(kind,{x,y},6))failures.push({kind,x,y});
   }
  }
  return {failures,total:document.querySelectorAll('.charge').length};
 });
 expect(await inspect()).toEqual({failures:[],total:32});
 for(let i=0;i<4;i++){
  await page.locator('#rub-button').click();
  await expect(page.locator('[data-id="moving-electron"]')).toHaveCount(1);
  for(let j=0;j<8;j++){expect(await inspect()).toEqual({failures:[],total:32});await page.waitForTimeout(60);}
  await expect(page.locator('#lift-button')).toBeEnabled();
  expect(await inspect()).toEqual({failures:[],total:32});
 }
 // Sample the actual PNG alpha under every marker's circumference, not just the clip shape.
 const outside=await page.evaluate(async()=>{
  const img=new Image();img.src='/images/balloon-fur.png';await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const out=[];
  for(const group of document.querySelectorAll('#fur, #balloon-object')) for(const node of group.querySelectorAll('.charge')){
   const [x,y]=node.getAttribute('transform').match(/[-\d.]+/g).map(Number);
   for(let i=0;i<12;i++){
    const px=x+6*Math.cos(i*Math.PI/6),py=y+6*Math.sin(i*Math.PI/6);
    const sx=group.dataset.shape==='fur'?730+(px+125)*806/250:(px+88)*710/176;
    const sy=group.dataset.shape==='fur'?205+(py+85)*650/185:(py+130)*1024/240;
    if(ctx.getImageData(Math.round(sx),Math.round(sy),1,1).data[3]<200)out.push({x,y});
   }
  }return out;
 });expect(outside).toEqual([]);
 await page.screenshot({path:'/tmp/science-charges.png',fullPage:true});
});

test('힘 관찰은 중간 위치를 거쳐 움직이고 재실행 및 초기화 가능',async({page})=>{
 await page.goto('/');await page.locator('#force-tab').click();
 const read=()=>page.locator('#balloon-object').getAttribute('transform');
 await page.locator('#observe-button').click();await page.waitForTimeout(450);
 const middle=(await read()).match(/[-\d.]+/g).map(Number);
 expect(middle[0]).toBeLessThan(590);expect(middle[0]).toBeGreaterThan(385);
 await expect(page.locator('#fur')).toHaveAttribute('transform','translate(215 245)');
 await expect(page.locator('#observe-button')).toBeEnabled();
 await page.screenshot({path:'/tmp/science-attraction.png',fullPage:true});
 await page.locator('#observe-button').click();await page.waitForTimeout(300);
 expect((await read()).match(/[-\d.]+/g).map(Number)[0]).toBeGreaterThan(385);
 await page.locator('#reset').click();await page.waitForTimeout(2100);
 await expect(page.locator('#balloon-object')).toHaveAttribute('transform','translate(590 215)');
 await expect(page.locator('#force-arrows path')).toHaveCount(0);
});

test('동작 줄이기 설정에서도 대전과 털끝 관찰 가능',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.locator('#rub-button').click();await expect(page.locator('#lift-button')).toBeEnabled();
 await page.locator('#lift-button').click();await expect(page.locator('#note-title')).toContainText('털끝');
 await expect(page.locator('#fur')).toHaveAttribute('transform','translate(215 245)');
});
