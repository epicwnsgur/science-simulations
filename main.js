import './style.css';
import { charges, LIMIT, rubbingDistance, interaction, attractionOffset } from './src/model.js';
const $ = (s) => document.querySelector(s);
let mode = 'rub', count = 0, distance = 0, pair = 'attract', observed = false, show = false;
let pos = { balloon: { x: 590, y: 215 }, fur: { x: 215, y: 245 } };
let offset = { x: 0, y: 0 }, attracted = false, liftFrame = 0, transferTimer = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const spriteUrl = `${import.meta.env.BASE_URL}images/balloon-fur.png`;
const terms = [['마찰 전기','두 물체를 마찰하여 생기는 전기예요.'],['대전','물체가 전기를 띠는 현상이에요.'],['대전체','전기를 띠고 있는 물체예요.'],['전기력','전기를 띤 두 물체 사이에 작용하는 힘이에요.'],['척력','같은 종류의 전하를 띤 물체 사이에 작용하는, 서로 밀어내는 힘이에요.'],['인력','다른 종류의 전하를 띤 물체 사이에 작용하는, 서로 끌어당기는 힘이에요.']];
$('#app').innerHTML = `
<header><a class="brand" href="./">과학 · 전기와 자기</a><span class="grade">중학교 2학년 <i></i> 과학</span></header>
<main><div class="breadcrumb">VII. 전기와 자기 <span>/</span> 01 마찰 전기</div>
<section class="intro"><div><h1>풍선과 털을 문지르면?</h1><p>문지르고, 들어 올리고, 두 물체 사이의 힘을 관찰해 보세요.</p></div></section>
<div class="workspace"><section class="lab"><div class="lab-toolbar"><div class="tabs" role="tablist" aria-label="실험 선택"><button id="rub-tab" role="tab" aria-selected="true">01 <span>문질러 대전시키기</span></button><button id="force-tab" role="tab" aria-selected="false">02 <span>전기력 관찰하기</span></button></div><button id="reset" class="reset">↻ <span>처음으로</span></button></div>
<div class="instruction"><span class="step-icon">↔</span><div><strong id="guide">풍선을 털 위로 가져와 문질러 보세요.</strong><p id="subguide">풍선이나 털을 잡고, 서로 닿도록 좌우로 움직여 보세요.</p></div><label class="toggle"><input type="checkbox" id="show-charges"><span>전하 보기</span></label></div>
<div id="pair-controls" class="pair-controls" hidden><button data-pair="attract" class="selected">풍선 − 와 털 +</button><button data-pair="repel">풍선 − 와 풍선 −</button><p>미리 털로 문질러 대전시킨 물체를 비교해요.</p></div>
<div class="stage"><div class="stage-label"><span></span> <span id="stage-state">마찰 전 · 전기를 띠지 않음</span></div><svg id="scene" viewBox="0 0 800 440" aria-label="풍선과 털을 움직이는 실험 공간"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#466455"/></marker></defs><ellipse class="table-shadow" cx="215" cy="333" rx="115" ry="10"/><g id="force-arrows"></g><g id="fur" class="draggable" role="button" tabindex="0" aria-label="털, 방향키로 이동"><g class="shape"></g><g class="particles"></g><text class="object-name" y="117" text-anchor="middle">털</text><text class="object-state" y="141" text-anchor="middle"></text></g><g id="balloon-object" class="draggable" role="button" tabindex="0" aria-label="풍선, 방향키로 이동"><g class="shape"></g><g class="particles"></g><text class="object-name" y="117" text-anchor="middle">풍선</text><text class="object-state" y="141" text-anchor="middle"></text></g><g id="transfer"></g></svg><div class="stage-hint" id="stage-hint">↔ 잡고 움직여 보세요</div></div>
<div class="lab-bottom"><div class="legend"><span><b class="positive">+</b> 원자핵의 (+)전하</span><span><b class="negative">−</b> 전자의 (−)전하</span></div><button id="rub-button" class="primary">한 번 문지르기</button><button id="lift-button" class="secondary" disabled>풍선 들어 올리기 ↑</button><button id="observe-button" class="primary" hidden>놓아서 힘 관찰하기</button></div><p class="model-note">전하 표시는 눈에 보이지 않는 전하를 나타낸 그림이에요.</p></section>
<aside><section class="observation"><div class="section-label"><span>◉</span> 무엇이 달라졌나요?</div><h2 id="note-title">아직은 전기를 띠지 않아요</h2><p id="note-text">털과 풍선 모두 (+)전하량과 (−)전하량이 같아요. 먼저 두 물체를 문질러 볼까요?</p><div id="charge-cards"></div><div class="discovery" aria-live="polite" id="discovery">전기를 띠지 않아도 두 종류의 전하는 있어요.</div></section><section class="mission"><span class="small-tag">생각해 보기</span><h3>마찰할 때, 무엇이 이동할까요?</h3><div class="answers"><button data-answer="nucleus">원자핵</button><button data-answer="electron">전자</button><button data-answer="both">둘 다</button></div><p id="feedback" aria-live="polite">실험을 관찰한 뒤 골라 보세요.</p></section></aside></div>
<section class="vocabulary"><div class="vocab-heading"><h2>실험 속 핵심 개념</h2><span>단어를 누르면 뜻을 확인할 수 있어요.</span></div><div class="term-buttons">${terms.map(([t], i) => `<button data-term="${i}" class="${i === 0 ? 'active' : ''}">${t}</button>`).join('')}</div><p id="term-definition"><strong>마찰 전기</strong> ${terms[0][1]}</p></section>
</main>`;
function balloonShape() {
  return `<svg x="-88" y="-130" width="176" height="240" viewBox="0 0 710 1024" preserveAspectRatio="none" aria-hidden="true"><image href="${spriteUrl}" width="1536" height="1024"/></svg>`;
}
function furShape() {
  return `<svg x="-125" y="-85" width="250" height="185" viewBox="730 205 806 650" preserveAspectRatio="none" aria-hidden="true"><image href="${spriteUrl}" width="1536" height="1024"/></svg>`;
}
function positionObjects() {
  $('#balloon-object').setAttribute('transform', `translate(${pos.balloon.x} ${pos.balloon.y})`);
  $('#fur').setAttribute('transform', `translate(${pos.fur.x + offset.x} ${pos.fur.y + offset.y})`);
  $('.table-shadow').setAttribute('cx', pos.fur.x);
  $('.table-shadow').setAttribute('cy', pos.fur.y + 94);
  $('.table-shadow').style.opacity = mode === 'rub' ? '.08' : '0';
}
function follow() {
  const target = mode === 'rub' && drag?.key !== 'fur' ? attractionOffset(pos.balloon, pos.fur, count) : {x:0,y:0};
  const amount = reducedMotion.matches ? 1 : .10;
  offset.x += (target.x - offset.x) * amount;
  offset.y += (target.y - offset.y) * amount;
  if(mode === 'rub') positionObjects();
  const next = Math.hypot(target.x,target.y) > 2;
  if(next !== attracted) {attracted = next; render();}
  requestAnimationFrame(follow);
}
function particles(plus, minus) {
 let s = ''; for(let i=0;i<plus;i++) {const x=-49+(i%4)*31,y=-61+Math.floor(i/4)*33;s+=`<g transform="translate(${x} ${y})"><circle r="10" fill="#fff0e9" stroke="#d7755b"/><text text-anchor="middle" y="4" fill="#b65038">+</text></g>`;}
 for(let i=0;i<minus;i++){const x=-49+(i%4)*31,y=8+Math.floor(i/4)*26;s+=`<g transform="translate(${x} ${y})"><circle r="9" fill="#f4f0ff" stroke="#7b61b8"/><text text-anchor="middle" y="4" fill="#6745ae">−</text></g>`;}return s;
}
function render() {
 $('#charge-cards').hidden=!show;$('.legend').hidden=!show;$('.model-note').hidden=!show;
 const c=charges(mode==='rub'?count:3), other=mode==='force' && pair==='repel'?c.balloon:c.fur;
 for (const [id,key,obj] of [['#fur','fur',other],['#balloon-object','balloon',c.balloon]]) {const el=$(id);el.setAttribute('transform',`translate(${pos[key].x} ${pos[key].y})`);const kind=key==='balloon'||(mode==='force'&&pair==='repel')?'balloon':'fur';if(el.dataset.shape!==kind){el.querySelector('.shape').innerHTML=kind==='balloon'?balloonShape():furShape();el.dataset.shape=kind;}el.querySelector('.particles').innerHTML=show?particles(obj.plus,obj.minus):'';el.querySelector('.object-name').textContent=key==='balloon'?'풍선 A':mode==='force'&&pair==='repel'?'풍선 B':'털';el.querySelector('.object-state').textContent=obj.plus===obj.minus?'전기를 띠지 않음':obj.plus>obj.minus?'(+)전하로 대전':'(−)전하로 대전';}
 $('#charge-cards').innerHTML=[[mode==='force'&&pair==='repel'?'풍선 B':'털',other],['풍선 A',c.balloon]].map(([name,o])=>`<div class="charge-card"><div><strong>${name}</strong><span class="charge-badge">${o.plus===o.minus?'중성':o.plus>o.minus?'+ 대전체':'− 대전체'}</span></div><div class="charge-amount"><span class="positive-text">+ ${o.plus}</span><span class="negative-text">− ${o.minus}</span></div><small>${o.plus===o.minus?'두 전하량이 같아요':o.plus>o.minus?'전자를 잃었어요':'전자를 얻었어요'}</small></div>`).join('');
 positionObjects();
 $('#lift-button').disabled=!count;$('#lift-button').hidden=mode!=='rub';
 $('#rub-button').disabled=count===LIMIT;$('#rub-button').innerHTML=count===LIMIT?'대전 과정 관찰 완료 ✓':'한 번 문지르기';
 $('#stage-state').textContent=mode==='rub'?(count?'마찰 후 · 두 물체가 대전됨':'마찰 전 · 전기를 띠지 않음'):'전기력 · '+(pair==='attract'?'다른 종류의 전하':'같은 종류의 전하');
 if(mode==='rub') {$('#guide').textContent=count?'이제 풍선을 털 가까이에서 들어 올려 보세요.':'풍선을 털 위로 가져와 문질러 보세요.';$('#subguide').textContent=count?'털이 어떻게 움직이나요? 풍선을 멀리 옮겨 비교해 보세요.':'풍선이나 털을 잡고, 서로 닿도록 좌우로 움직여 보세요.';$('#note-title').textContent=attracted?'털이 풍선 쪽으로 끌려와요':count?'전자가 털에서 풍선으로 이동해요':'아직은 전기를 띠지 않아요';$('#note-text').textContent=attracted?'(−)전하를 띤 풍선과 (+)전하를 띤 털 사이에 서로 끌어당기는 힘, 인력이 작용해요.':count?'전자를 잃은 털은 (+)전하로, 전자를 얻은 풍선은 (−)전하로 대전돼요. 이렇게 전기를 띤 물체를 대전체라고 해요.':'털과 풍선 모두 (+)전하량과 (−)전하량이 같아요. 먼저 두 물체를 문질러 볼까요?';$('#discovery').textContent=count?'원자핵은 다른 물체로 이동하지 않아요. 전자를 얻은 만큼 다른 물체는 전자를 잃어요.':'전기를 띠지 않아도 두 종류의 전하는 있어요.';}
 else {$('#note-title').textContent=observed?(pair==='attract'?'서로 끌어당기는 힘, 인력':'서로 밀어내는 힘, 척력'):'놓으면 어떻게 움직일까요?';$('#note-text').textContent=observed?(pair==='attract'?'다른 종류의 전하를 띤 풍선과 털 사이에는 서로 끌어당기는 인력이 작용해요.':'같은 종류의 전하를 띤 두 풍선 사이에는 서로 밀어내는 척력이 작용해요.'):'두 물체는 이미 대전되어 있어요. 관찰 버튼을 누르면 두 물체 사이에 작용하는 전기력의 방향을 볼 수 있어요.';$('#discovery').textContent='대전되어도 (+)전하와 (−)전하는 모두 남아 있어요.';}
}
function transfer() {if(count>=LIMIT)return;count++; clearTimeout(transferTimer);render();const a=pos.fur,b=pos.balloon;$('#transfer').innerHTML=`<g><circle r="13" fill="#7050b3"/><text text-anchor="middle" y="5" fill="white">−</text><animateMotion dur="0.75s" path="M${a.x} ${a.y} Q400 60 ${b.x} ${b.y}" fill="freeze"/></g>`;transferTimer=setTimeout(()=>$('#transfer').replaceChildren(),780);$('#stage-hint').textContent='전자 이동: 털 → 풍선';}
function setMode(next) {cancelAnimationFrame(liftFrame);clearTimeout(transferTimer);offset={x:0,y:0};attracted=false;distance=0;mode=next;observed=false;$('#force-arrows').replaceChildren();$('#transfer').replaceChildren();pos={balloon:{x:590,y:215},fur:{x:215,y:245}};$('#rub-tab').setAttribute('aria-selected',next==='rub');$('#force-tab').setAttribute('aria-selected',next==='force');$('#pair-controls').hidden=next==='rub';$('#rub-button').hidden=next!=='rub';$('#observe-button').hidden=next==='rub';$('#guide').textContent=next==='rub'?'풍선을 털 위로 가져와 문질러 보세요.':'대전된 두 물체 사이의 힘을 비교해 보세요.';$('#subguide').textContent=next==='rub'?'풍선이나 털을 잡고, 서로 닿도록 좌우로 움직여 보세요.':'물체의 짝을 고르고, 놓아서 움직이는 방향을 관찰하세요.';$('#stage-hint').textContent=next==='rub'?'↔ 잡고 움직여 보세요':'화살표는 각 물체가 받는 힘의 방향이에요';render();}
let drag=null;
function move(key,x,y) {const old=pos[key];const next={x:Math.max(120,Math.min(680,x)),y:Math.max(115,Math.min(285,y))};pos[key]=next;if(mode==='rub' && Math.abs(next.x-old.x)>Math.abs(next.y-old.y)*.65){distance+=rubbingDistance(pos.balloon,pos.fur,Math.hypot(next.x-old.x,next.y-old.y));if(distance>=65){distance=0;transfer();}}render();}
for(const [id,key] of [['#fur','fur'],['#balloon-object','balloon']]) {const el=$(id);el.addEventListener('pointerdown',e=>{if(mode!=='rub')return;cancelAnimationFrame(liftFrame);const p=point(e);drag={key,dx:p.x-pos[key].x,dy:p.y-pos[key].y};el.setPointerCapture(e.pointerId);});el.addEventListener('pointermove',e=>{if(!drag||drag.key!==key)return;const p=point(e);move(key,p.x-drag.dx,p.y-drag.dy);});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>drag=null);el.addEventListener('keydown',e=>{const d={ArrowLeft:[-22,0],ArrowRight:[22,0],ArrowUp:[0,-22],ArrowDown:[0,22]}[e.key];if(d&&mode==='rub'){e.preventDefault();move(key,pos[key].x+d[0],pos[key].y+d[1]);}});}
function point(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform($('#scene').getScreenCTM().inverse());}
$('#rub-button').onclick=()=>{cancelAnimationFrame(liftFrame);offset={x:0,y:0};pos={fur:{x:335,y:235},balloon:{x:460,y:210}};transfer();};
$('#lift-button').onclick=()=>{
  cancelAnimationFrame(liftFrame);
  // Reposition next to the fur, then lift without any extra electron transfer.
  const from={x:Math.min(655,pos.fur.x+125),y:pos.fur.y-15};
  const to={x:Math.min(655,pos.fur.x+85),y:Math.max(115,pos.fur.y-135)};
  const start=performance.now();
  const step=now=>{const t=reducedMotion.matches?1:Math.min(1,(now-start)/1000);const ease=t*t*(3-2*t);pos.balloon={x:from.x+(to.x-from.x)*ease,y:from.y+(to.y-from.y)*ease};positionObjects();if(t<1)liftFrame=requestAnimationFrame(step);};
  liftFrame=requestAnimationFrame(step);
};
$('#rub-tab').onclick=()=>setMode('rub');$('#force-tab').onclick=()=>setMode('force');
$('#reset').onclick=()=>{count=0;distance=0;pair='attract';document.querySelectorAll('[data-pair]').forEach(b=>b.classList.toggle('selected',b.dataset.pair===pair));$('#feedback').textContent='실험을 관찰한 뒤 골라 보세요.';document.querySelectorAll('[data-answer]').forEach(b=>b.classList.remove('chosen'));setMode('rub');};
$('#show-charges').onchange=e=>{show=e.target.checked;render();};
document.querySelectorAll('[data-pair]').forEach(b=>b.onclick=()=>{pair=b.dataset.pair;document.querySelectorAll('[data-pair]').forEach(v=>v.classList.toggle('selected',v===b));setMode('force');});
$('#observe-button').onclick=()=>{const previous=structuredClone(pos);observed=true;const attracts=interaction(-3,pair==='attract'?3:-3)==='attract';pos={fur:{x:attracts?280:155,y:215},balloon:{x:attracts?520:645,y:215}};render();if(!matchMedia('(prefers-reduced-motion: reduce)').matches){for(const [id,key] of [['#fur','fur'],['#balloon-object','balloon']]) {const anim=document.createElementNS('http://www.w3.org/2000/svg','animateTransform');for(const [k,v] of Object.entries({attributeName:'transform',type:'translate',from:`${previous[key].x} ${previous[key].y}`,to:`${pos[key].x} ${pos[key].y}`,dur:'0.8s'}))anim.setAttribute(k,v);$(id).append(anim);anim.beginElement();setTimeout(()=>anim.remove(),850);}}$('#force-arrows').innerHTML=attracts?'<path d="M290 80H355M510 80H445"/>':'<path d="M225 80H160M575 80H640"/>';};
document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-answer]').forEach(v=>v.classList.toggle('chosen',v===b));$('#feedback').textContent=b.dataset.answer==='electron'?'맞아요! 털에서 풍선으로 일부 전자가 이동해요.':'다시 생각해 볼까요? 원자핵은 다른 물체로 이동하지 않아요. 이동하는 (−)전하 표시를 관찰해 보세요.';});
document.querySelectorAll('[data-term]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-term]').forEach(v=>v.classList.toggle('active',v===b));const [t,d]=terms[+b.dataset.term];$('#term-definition').innerHTML=`<strong>${t}</strong> ${d}`;});
render();

requestAnimationFrame(follow);
