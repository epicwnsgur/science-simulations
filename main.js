import './style.css';
import { charges, LIMIT, rubbingDistance, interaction, attractionOffset, chargeLayout, baseSites, nextTransfer, contactPoint, smooth, settle, chargeRadius, stepBoundCharge } from './src/model.js';
const $ = (s) => document.querySelector(s);
let mode = 'rub', count = 0, distance = 0, pair = 'attract', observed = false, show = false;
const FUR_ORIGIN = Object.freeze({x:400,y:280});
function startingPositions(next=mode){return {balloon:{x:590,y:145},fur:next==='force'&&pair==='repel'?{x:215,y:245}:{...FUR_ORIGIN}};}
let pos = startingPositions();
let offset = { x: 0, y: 0 }, attracted = false, motion = null, flight = null;
const chargeStates = new Map();
let transfers = [], drag = null, lastFrame = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const spriteUrl = `${import.meta.env.BASE_URL}images/balloon-fur.png`;
const terms = [['마찰 전기','두 물체를 마찰하여 생기는 전기예요.'],['대전','물체가 전기를 띠는 현상이에요.'],['대전체','전기를 띠고 있는 물체예요.'],['전기력','전기를 띤 두 물체 사이에 작용하는 힘이에요.'],['척력','같은 종류의 전하를 띤 물체 사이에 작용하는, 서로 밀어내는 힘이에요.'],['인력','다른 종류의 전하를 띤 물체 사이에 작용하는, 서로 끌어당기는 힘이에요.']];
$('#app').innerHTML = `
<header><a class="brand" href="./">과학 · 전기와 자기</a><span class="grade">중학교 2학년 <i></i> 과학</span></header>
<main><div class="breadcrumb">VII. 전기와 자기 <span>/</span> 01 마찰 전기</div>
<section class="intro"><div><h1>풍선과 털을 문지르면?</h1><p>문지르고, 들어 올리고, 두 물체 사이의 힘을 관찰해 보세요.</p></div></section>
<div class="workspace"><section class="lab"><div class="lab-toolbar"><div class="tabs" role="tablist" aria-label="실험 선택"><button id="rub-tab" role="tab" aria-selected="true">01 <span>문질러 대전시키기</span></button><button id="force-tab" role="tab" aria-selected="false">02 <span>전기력 관찰하기</span></button></div><button id="reset" class="reset">↻ <span>처음으로</span></button></div>
<div class="instruction"><span class="step-icon">↔</span><div><strong id="guide">풍선을 털 위로 가져와 문질러 보세요.</strong><p id="subguide">풍선을 잡고 아래쪽 털에 대고 좌우로 문질러 보세요.</p></div><label class="toggle"><input type="checkbox" id="show-charges"><span>전하 보기</span></label></div>
<div id="pair-controls" class="pair-controls" hidden><button data-pair="attract" class="selected">풍선 − 와 털 +</button><button data-pair="repel">풍선 − 와 풍선 −</button><p>미리 털로 문질러 대전시킨 물체를 비교해요.</p></div>
<div class="stage"><div class="stage-label"><span></span> <span id="stage-state">마찰 전 · 전기를 띠지 않음</span></div><svg id="scene" viewBox="0 0 800 440" aria-label="아래에 고정된 털과 움직일 수 있는 풍선의 실험 공간"><defs><clipPath id="balloon-interior"><ellipse cx="0" cy="-28" rx="64" ry="78"/></clipPath><clipPath id="fur-interior"><rect x="-98" y="-60" width="196" height="120" rx="8"/></clipPath><radialGradient id="tuft-fade"><stop offset="45%" stop-color="white"/><stop offset="100%" stop-color="black"/></radialGradient><mask id="tuft-mask-0" maskUnits="userSpaceOnUse" x="-99" y="-82" width="68" height="88"><ellipse cx="-65" cy="-38" rx="34" ry="44" fill="url(#tuft-fade)"/></mask><mask id="tuft-mask-1" maskUnits="userSpaceOnUse" x="-34" y="-82" width="68" height="88"><ellipse cx="0" cy="-38" rx="34" ry="44" fill="url(#tuft-fade)"/></mask><mask id="tuft-mask-2" maskUnits="userSpaceOnUse" x="31" y="-82" width="68" height="88"><ellipse cx="65" cy="-38" rx="34" ry="44" fill="url(#tuft-fade)"/></mask><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#466455"/></marker></defs><ellipse class="table-shadow" cx="400" cy="374" rx="115" ry="10"/><g id="force-arrows"></g><g id="fur" role="img" aria-label="아래쪽에 고정된 털"><g class="shape"></g><g class="particles"></g><text class="object-name" y="117" text-anchor="middle">털</text><text class="object-state" y="141" text-anchor="middle"></text></g><g id="balloon-object" class="draggable" role="button" tabindex="0" aria-label="풍선, 방향키로 이동"><ellipse class="keyboard-focus" cx="0" cy="-12" rx="93" ry="125"/><g class="shape"></g><g class="particles"></g><text class="object-name" y="117" text-anchor="middle">풍선</text><text class="object-state" y="141" text-anchor="middle"></text></g><g id="transfer"></g></svg><div class="stage-hint" id="stage-hint">↔ 잡고 움직여 보세요</div></div>
<div class="lab-bottom"><div class="legend"><span><b class="positive">+</b> 원자핵의 (+)전하</span><span><b class="negative">−</b> 전자의 (−)전하</span></div><button id="rub-button" class="primary">한 번 문지르기</button><button id="lift-button" class="secondary" disabled>풍선 들어 올리기 ↑</button><button id="observe-button" class="primary" hidden>놓아서 힘 관찰하기</button></div><p class="model-note">풍선과 털 속 전하는 제자리 부근에서 반응해요. 문지를 때 일부 전자가 다른 물체로 이동해요. 입자의 크기와 움직임은 보기 쉽게 나타냈어요.</p></section>
<aside><section class="observation"><div class="section-label"><span>◉</span> 무엇이 달라졌나요?</div><h2 id="note-title">아직은 전기를 띠지 않아요</h2><p id="note-text">털과 풍선 모두 (+)전하량과 (−)전하량이 같아요. 먼저 두 물체를 문질러 볼까요?</p><div id="charge-cards"></div><div class="discovery" aria-live="polite" id="discovery">전기를 띠지 않아도 두 종류의 전하는 있어요.</div></section><section class="mission"><span class="small-tag">생각해 보기</span><h3>마찰할 때, 무엇이 이동할까요?</h3><div class="answers"><button data-answer="nucleus">원자핵</button><button data-answer="electron">전자</button><button data-answer="both">둘 다</button></div><p id="feedback" aria-live="polite">실험을 관찰한 뒤 골라 보세요.</p></section></aside></div>
<section class="vocabulary"><div class="vocab-heading"><h2>실험 속 핵심 개념</h2><span>단어를 누르면 뜻을 확인할 수 있어요.</span></div><div class="term-buttons">${terms.map(([t], i) => `<button data-term="${i}" class="${i === 0 ? 'active' : ''}">${t}</button>`).join('')}</div><p id="term-definition"><strong>마찰 전기</strong> ${terms[0][1]}</p></section>
</main>`;
function balloonShape() {
  return `<svg x="-88" y="-130" width="176" height="240" viewBox="0 0 710 1024" preserveAspectRatio="none" aria-hidden="true"><image href="${spriteUrl}" width="1536" height="1024"/></svg>`;
}
function furImage() {
  return `<svg x="-125" y="-85" width="250" height="185" viewBox="730 205 806 650" preserveAspectRatio="none" aria-hidden="true"><image href="${spriteUrl}" width="1536" height="1024"/></svg>`;
}
function furShape() {
  return `<g class="fur-backing">${furImage()}</g>` + [-65,0,65].map((x,i)=>`<g class="fiber-patch" data-root="${x}" style="pointer-events:none"><g mask="url(#tuft-mask-${i})">${furImage()}</g></g>`).join('');
}
function positionObjects() {
  $('#balloon-object').setAttribute('transform', `translate(${pos.balloon.x} ${pos.balloon.y})`);
  $('#fur').setAttribute('transform', `translate(${pos.fur.x} ${pos.fur.y})`);
  $('.table-shadow').setAttribute('cx', pos.fur.x);
  $('.table-shadow').setAttribute('cy', pos.fur.y + 94);
  $('.table-shadow').style.opacity = mode === 'rub' || pair === 'attract' ? '.08' : '0';
  for(const patch of document.querySelectorAll('.fiber-patch')) {
    const x=Number(patch.dataset.root);
    const nearX=Math.max(-75,Math.min(75,pos.balloon.x-pos.fur.x));
    const weight=Math.exp(-(((x-nearX)/48)**2));
    const shear=offset.x*weight*.015;
    const stretch=1-offset.y*weight*.012;
    patch.setAttribute('transform',`translate(${x} 3) matrix(1 0 ${-shear} ${stretch} 0 0) translate(${-x} -3)`);
    patch.dataset.bend=(Math.hypot(offset.x,offset.y)*weight).toFixed(3);
  }
}
function symbol(p) {
  const positive=p.sign>0,radius=chargeRadius(p.sign),arm=radius*.70;
  const glyph=`M${-arm} 0H${arm}`+(positive?`M0 ${-arm}V${arm}`:'');
  return `<g class="charge" data-id="${p.id}" data-sign="${p.sign}" aria-label="${positive?'양전하':'음전하'}" transform="translate(${p.x} ${p.y})"><circle r="${radius}" fill="${positive?'#e84444':'#2787d9'}"/><path class="charge-sign" d="${glyph}" stroke="#fff" stroke-width="${positive?1.9:1.5}" stroke-linecap="round" fill="none"/></g>`;
}
function updateChargeMotion(dt) {
  const active=new Set();
  for(const key of ['fur','balloon']) {
    const otherKey=key==='fur'?'balloon':'fur';
    const kind=key==='balloon'||(mode==='force'&&pair==='repel')?'balloon':'fur';
    const otherKind=otherKey==='balloon'||(mode==='force'&&pair==='repel')?'balloon':'fur';
    const q=(mode==='rub'?count:3)*(otherKind==='balloon'?-1:1);
    const source={x:pos[otherKey].x,y:pos[otherKey].y+(otherKind==='balloon'?-28:0)};
    for(const site of chargeLayout(kind,transfers,mode==='force')) {
      const id=`${key}:${site.id}`;active.add(id);
      chargeStates.set(id,stepBoundCharge(chargeStates.get(id),site,kind,pos[key],source,q,dt,reducedMotion.matches));
    }
  }
  for(const id of chargeStates.keys())if(!active.has(id))chargeStates.delete(id);
}
function displaySite(site,key) {
  const state=chargeStates.get(`${key}:${site.id}`);
  return state?{...site,x:state.x,y:state.y}:site;
}
function syncChargeLayer(layer,sites) {
  const signature=sites.map(p=>`${p.id}:${p.sign}`).join(',');
  if(layer.dataset.signature!==signature){layer.innerHTML=sites.map(symbol).join('');layer.dataset.signature=signature;}
  const children=layer.children;
  sites.forEach((p,i)=>children[i].setAttribute('transform',`translate(${p.x} ${p.y})`));
}
function paintCharges(now=performance.now()) {
  for(const [id,key] of [['#fur','fur'],['#balloon-object','balloon']]) {
    const kind=key==='balloon'||(mode==='force'&&pair==='repel')?'balloon':'fur';
    const layer=$(id).querySelector('.particles');
    layer.setAttribute('clip-path',`url(#${kind}-interior)`);
    if(!show){layer.replaceChildren();delete layer.dataset.signature;continue;}
    let sites=chargeLayout(kind,transfers,mode==='force').map(p=>displaySite(p,key));
    let moving=null;
    if(flight && mode==='rub') {
      const t=Math.min(1,(now-flight.start)/flight.duration);
      const i=transfers.length-1;
      if(key==='balloon') sites=sites.filter(p=>p.id!==`extra${i}`);
      // Interpolate within each object's silhouette, meeting at the shared contact point.
      const contact=contactPoint(pos.balloon,pos.fur);
      if(contact) {
        const source=flight.source;
        const destination=displaySite(chargeLayout('balloon',transfers).find(p=>p.id===`extra${i}`),'balloon');
        const owner=t<.5?'fur':'balloon';
        if(key===owner) {
          const seam={x:contact.x-pos[key].x,y:contact.y-pos[key].y};
          const from=t<.5?source:seam,to=t<.5?seam:destination;
          const progress=smooth(t<.5?t*2:(t-.5)*2);
          moving={id:'moving-electron',sign:-1,x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress};
        }
      } else if(key==='balloon') sites.push(displaySite(chargeLayout('balloon',transfers).find(p=>p.id===`extra${i}`),'balloon'));
    }
    if(moving)sites.push(moving);
    syncChargeLayer(layer,sites);
  }
}
function animateTo(target,duration,complete=()=>{},curve=smooth) {
  motion={from:structuredClone(pos),to:target,start:performance.now(),duration:reducedMotion.matches?1:duration,complete,curve};
}
function follow(now) {
  const dt=Math.min(.05,(now-(lastFrame||now))/1000);lastFrame=now;
  if(motion) {
    const active=motion,t=Math.min(1,(now-active.start)/active.duration),f=active.curve(t);
    for(const key of ['fur','balloon']) for(const axis of ['x','y']) pos[key][axis]=active.from[key][axis]+(active.to[key][axis]-active.from[key][axis])*f;
    if(t===1){motion=null;active.complete();}
  }
  const activeFur=mode==='rub'||(pair==='attract'&&observed);
  const target=activeFur && (mode!=='rub'||!contactPoint(pos.balloon,pos.fur)) ? attractionOffset(pos.balloon,pos.fur,mode==='rub'?count:3):{x:0,y:0};
  const gain=reducedMotion.matches?1:1-Math.exp(-dt*9);
  offset.x+=(target.x-offset.x)*gain;offset.y+=(target.y-offset.y)*gain;
  positionObjects();
  const next=Math.hypot(target.x,target.y)>2;
  if(next!==attracted){attracted=next;render();}
  if(flight) {
    if(now-flight.start>=flight.duration){flight=null;render();}
  }
  updateChargeMotion(dt);paintCharges(now);
  if(mode==='force'&&observed) drawForces();
  requestAnimationFrame(follow);
}
function render() {
 $('#charge-cards').hidden=!show;$('.legend').hidden=!show;$('.model-note').hidden=!show;
 const c=charges(mode==='rub'?count:3), other=mode==='force' && pair==='repel'?c.balloon:c.fur;
 for (const [id,key,obj] of [['#fur','fur',other],['#balloon-object','balloon',c.balloon]]) {const el=$(id);el.setAttribute('transform',`translate(${pos[key].x} ${pos[key].y})`);const kind=key==='balloon'||(mode==='force'&&pair==='repel')?'balloon':'fur';if(el.dataset.shape!==kind){el.querySelector('.shape').innerHTML=kind==='balloon'?balloonShape():furShape();el.dataset.shape=kind;}el.querySelector('.object-name').textContent=key==='balloon'?'풍선 A':mode==='force'&&pair==='repel'?'풍선 B':'털';el.querySelector('.object-name').setAttribute('y',kind==='fur'?'110':'117');el.querySelector('.object-state').setAttribute('y',kind==='fur'?'134':'141');el.querySelector('.object-state').textContent=obj.plus===obj.minus?'전기를 띠지 않음':obj.plus>obj.minus?'(+)전하로 대전':'(−)전하로 대전';}
 $('#charge-cards').innerHTML=[[mode==='force'&&pair==='repel'?'풍선 B':'털',other],['풍선 A',c.balloon]].map(([name,o])=>`<div class="charge-card"><div><strong>${name}</strong><span class="charge-badge">${o.plus===o.minus?'중성':o.plus>o.minus?'+ 대전체':'− 대전체'}</span></div><div class="charge-amount"><span class="positive-text">+ ${o.plus}</span><span class="negative-text">− ${o.minus}</span></div><small>${o.plus===o.minus?'두 전하량이 같아요':o.plus>o.minus?'전자를 잃었어요':'전자를 얻었어요'}</small></div>`).join('');
 $('#fur').setAttribute('aria-label',mode==='force'&&pair==='repel'?'풍선 B':'아래쪽에 고정된 털');
 positionObjects();paintCharges();
 $('#lift-button').disabled=!count||!!flight||!!motion;$('#lift-button').hidden=mode!=='rub';
 $('#rub-button').disabled=count===LIMIT||!!flight||!!motion;$('#rub-button').innerHTML=count===LIMIT?'대전 과정 관찰 완료 ✓':'한 번 문지르기';
 $('#stage-state').textContent=mode==='rub'?(count?'마찰 후 · 두 물체가 대전됨':'마찰 전 · 전기를 띠지 않음'):'전기력 · '+(pair==='attract'?'다른 종류의 전하':'같은 종류의 전하');
 if(mode==='rub') {$('#guide').textContent=count?'이제 풍선을 털 가까이에서 들어 올려 보세요.':'풍선을 털 위로 가져와 문질러 보세요.';$('#subguide').textContent=count?'털이 어떻게 움직이나요? 풍선을 멀리 옮겨 비교해 보세요.':'풍선을 잡고 아래쪽 털에 대고 좌우로 문질러 보세요.';$('#note-title').textContent=attracted?'가까운 털끝이 풍선 쪽으로 휘어요':count?'전자가 털에서 풍선으로 이동해요':'아직은 전기를 띠지 않아요';$('#note-text').textContent=attracted?'풍선 가까이에 있는 털끝이 인력을 받아 휘어요. 털의 밑부분은 제자리에 있어요.':count?'전자를 잃은 털은 (+)전하로, 전자를 얻은 풍선은 (−)전하로 대전돼요. 이렇게 전기를 띤 물체를 대전체라고 해요.':'털과 풍선 모두 (+)전하량과 (−)전하량이 같아요. 먼저 두 물체를 문질러 볼까요?';$('#discovery').textContent=count?'원자핵은 다른 물체로 이동하지 않아요. 전자를 얻은 만큼 다른 물체는 전자를 잃어요.':'전기를 띠지 않아도 두 종류의 전하는 있어요.';}
 else {$('#note-title').textContent=observed?(pair==='attract'?'서로 끌어당기는 힘, 인력':'서로 밀어내는 힘, 척력'):'놓으면 어떻게 움직일까요?';$('#note-text').textContent=observed?(pair==='attract'?'풍선은 털 쪽으로 다가가고, 가까운 털끝은 풍선 쪽으로 휘어요. 털의 밑부분은 바닥에 놓여 있어요.':'같은 종류의 전하를 띤 두 풍선 사이에는 서로 밀어내는 척력이 작용해요.'):'두 물체는 이미 대전되어 있어요. 관찰 버튼을 누르면 두 물체 사이에 작용하는 전기력의 방향을 볼 수 있어요.';$('#discovery').textContent='대전되어도 (+)전하와 (−)전하는 모두 남아 있어요.';}
}
function transfer() {
  if(count>=LIMIT||flight)return;
  const record=nextTransfer(pos.balloon,pos.fur,transfers);
  if(!record)return;
  const donor={...baseSites('fur')[record.donor]};donor.x+=9;
  const source=chargeStates.get(`fur:n${record.donor}`)||donor;
  transfers.push(record);count=transfers.length;
  flight={record,source:{x:source.x,y:source.y},start:performance.now(),duration:reducedMotion.matches?1:650};
  render();$('#stage-hint').textContent='맞닿은 곳에서 전자가 털 → 풍선으로 이동해요';
}
function setMode(next) {
  chargeStates.clear();
  motion=null;flight=null;drag=null;offset={x:0,y:0};attracted=false;distance=0;mode=next;observed=false;
  $('#force-arrows').replaceChildren();$('#transfer').replaceChildren();
  pos=startingPositions(next);
  $('#rub-tab').setAttribute('aria-selected',next==='rub');$('#force-tab').setAttribute('aria-selected',next==='force');
  $('#pair-controls').hidden=next==='rub';$('#rub-button').hidden=next!=='rub';$('#observe-button').hidden=next==='rub';
  $('#observe-button').disabled=false;
  $('#guide').textContent='대전된 두 물체 사이의 힘을 비교해 보세요.';
  $('#subguide').textContent='물체의 짝을 고르고, 놓아서 움직이는 방향을 관찰하세요.';
  $('#stage-hint').textContent=next==='rub'?'↔ 잡고 움직여 보세요':'화살표는 각 물체가 받는 힘의 방향이에요';render();
}
function move(key,x,y) {if(key!=='balloon')return;const old=pos[key];const next={x:Math.max(120,Math.min(680,x)),y:Math.max(115,Math.min(285,y))};pos[key]=next;if(mode==='rub' && Math.abs(next.x-old.x)>Math.abs(next.y-old.y)*.65){distance+=rubbingDistance(pos.balloon,pos.fur,Math.hypot(next.x-old.x,next.y-old.y));if(distance>=65){distance=0;transfer();}}render();}
for(const [id,key] of [['#balloon-object','balloon']]) {const el=$(id);el.addEventListener('pointerdown',e=>{if(mode!=='rub')return;e.preventDefault();motion=null;const p=point(e);drag={key,dx:p.x-pos[key].x,dy:p.y-pos[key].y};el.setPointerCapture(e.pointerId);});el.addEventListener('pointermove',e=>{if(!drag||drag.key!==key)return;const p=point(e);move(key,p.x-drag.dx,p.y-drag.dy);});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>drag=null);el.addEventListener('keydown',e=>{const d={ArrowLeft:[-22,0],ArrowRight:[22,0],ArrowUp:[0,-22],ArrowDown:[0,22]}[e.key];if(d&&mode==='rub'){e.preventDefault();move(key,pos[key].x+d[0],pos[key].y+d[1]);}});}
function point(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform($('#scene').getScreenCTM().inverse());}
$('#rub-button').onclick=()=>{
  if(flight||motion||count>=LIMIT)return;
  const offsetX=[-65,65,-25,25][count];
  const target={fur:{...FUR_ORIGIN},balloon:{x:FUR_ORIGIN.x+offsetX,y:FUR_ORIGIN.y-45}};
  animateTo(target,450,()=>{
    const rubbed={fur:{...pos.fur},balloon:{x:pos.balloon.x+(offsetX<0?32:-32),y:pos.balloon.y}};
    animateTo(rubbed,350,()=>{transfer();});
  });render();
};
$('#lift-button').onclick=()=>{
  if(flight||motion)return;
  const to={fur:{...pos.fur},balloon:{x:Math.min(655,pos.fur.x+85),y:Math.max(115,pos.fur.y-135)}};
  animateTo(to,1100,()=>render());render();
};
$('#rub-tab').onclick=()=>setMode('rub');$('#force-tab').onclick=()=>setMode('force');
$('#reset').onclick=()=>{count=0;transfers=[];distance=0;pair='attract';document.querySelectorAll('[data-pair]').forEach(b=>b.classList.toggle('selected',b.dataset.pair===pair));$('#feedback').textContent='실험을 관찰한 뒤 골라 보세요.';document.querySelectorAll('[data-answer]').forEach(b=>b.classList.remove('chosen'));setMode('rub');};
$('#show-charges').onchange=e=>{show=e.target.checked;render();};
document.querySelectorAll('[data-pair]').forEach(b=>b.onclick=()=>{pair=b.dataset.pair;document.querySelectorAll('[data-pair]').forEach(v=>v.classList.toggle('selected',v===b));setMode('force');});
function drawForces() {
  const attracts=pair==='attract',a=pos.fur,b=pos.balloon;
  const d=Math.hypot(b.x-a.x,b.y-a.y),sign=attracts?1:-1;
  const dx=(b.x-a.x)/d*42*sign,dy=(b.y-a.y)/d*42*sign;
  $('#force-arrows').innerHTML=`<path d="M${a.x} ${Math.max(44,a.y-138)}l${dx} ${dy}"/><path d="M${b.x} ${Math.max(44,b.y-138)}l${-dx} ${-dy}"/>`;
}
$('#observe-button').onclick=()=>{
  if(motion)return;
  const start=()=>{
    observed=true;render();$('#observe-button').disabled=true;
    const attracts=interaction(-3,pair==='attract'?3:-3)==='attract';
    const target=attracts?{fur:{...FUR_ORIGIN},balloon:{x:470,y:230}}:{fur:{x:155,y:261},balloon:{x:650,y:129}};
    animateTo(target,2000,()=>{$('#observe-button').disabled=false;},settle);
  };
  if(observed) {observed=false;$('#force-arrows').replaceChildren();animateTo(startingPositions('force'),700,start);}else start();
};
document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-answer]').forEach(v=>v.classList.toggle('chosen',v===b));$('#feedback').textContent=b.dataset.answer==='electron'?'맞아요! 털에서 풍선으로 일부 전자가 이동해요.':'다시 생각해 볼까요? 원자핵은 다른 물체로 이동하지 않아요. 이동하는 (−)전하 표시를 관찰해 보세요.';});
document.querySelectorAll('[data-term]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-term]').forEach(v=>v.classList.toggle('active',v===b));const [t,d]=terms[+b.dataset.term];$('#term-definition').innerHTML=`<strong>${t}</strong> ${d}`;});
render();

requestAnimationFrame(follow);
