import test from 'node:test';
import assert from 'node:assert/strict';
import { charges, LIMIT, interaction, rubbingDistance, attractionOffset, insideBody, chargeLayout, nextTransfer, smooth, settle } from './model.js';
test('마찰 전 중성, 마찰 후 전자 이동과 전체 전하 보존',()=>{
 for(let n=0;n<=LIMIT;n++){
 const {fur,balloon}=charges(n);
 assert.equal(fur.plus,8);assert.equal(balloon.plus,8);
 assert.equal(fur.minus+balloon.minus,16);
 assert.equal(fur.plus-fur.minus,n);assert.equal(balloon.minus-balloon.plus,n);
 assert.ok(fur.minus>0);assert.ok(balloon.plus>0);
 }
});
test('같은 전하 척력, 다른 전하 인력; 중성은 이 모형의 범위 밖',()=>{
 assert.equal(interaction(-3,-3),'repel');assert.equal(interaction(3,3),'repel');
 assert.equal(interaction(-3,3),'attract');assert.equal(interaction(0,-3),'unmodeled');
});
test('떨어져서 움직이면 마찰되지 않음',()=>{
 assert.equal(rubbingDistance({x:100,y:100},{x:500,y:100},80),0);
 assert.equal(rubbingDistance({x:100,y:100},{x:225,y:100},80),80);
});

test('대전 후 가까이 들어 올릴 때만 털이 조금 끌림',()=>{
 const fur={x:335,y:235}, near={x:420,y:115};
 assert.deepEqual(attractionOffset(near,fur,0),{x:0,y:0});
 assert.deepEqual(attractionOffset({x:650,y:115},fur,2),{x:0,y:0});
 assert.deepEqual(attractionOffset({x:420,y:235},fur,2),{x:0,y:0});
 const offset=attractionOffset(near,fur,2);
 assert.ok(offset.x>0 && offset.y<0);assert.ok(Math.hypot(offset.x,offset.y)<=24.001);
});

test('모든 단계에서 전하 원 전체가 물체 내부에 있고 두 부호가 섞임',()=>{
 for(const side of [-1,1]) {
  let records=[];
  for(let n=0;n<=4;n++){
   for(const kind of ['fur','balloon']) {
    const points=chargeLayout(kind,records);
    assert.equal(points.filter(p=>p.sign===1).length,8);
    assert.equal(points.filter(p=>p.sign===-1).length,kind==='fur'?8-n:8+n);
    for(const p of points) assert.ok(insideBody(kind,p,7),`${kind} ${JSON.stringify(p)}`);
    const nuclei=points.filter(p=>p.sign===1);
    assert.deepEqual(nuclei,chargeLayout(kind,[]).filter(p=>p.sign===1));
    // Each half contains both signs, rather than separate positive/negative layers.
    if(n===0)for(const half of [-1,1])for(const sign of [-1,1])assert.ok(points.some(p=>Math.sign(p.x)===half&&p.sign===sign));
   }
   if(n<4){const record=nextTransfer({x:side*120,y:-25},{x:0,y:0},records);assert.ok(record);records.push(record);}
  }
 }
});
test('전자는 접촉 시에만 이동하고 이동할 때마다 서로 다른 전자를 선택',()=>{
 assert.equal(nextTransfer({x:500,y:100},{x:0,y:0},[]),null);
 let records=[];for(let i=0;i<4;i++)records.push(nextTransfer({x:120,y:-25},{x:0,y:0},records));
 assert.equal(new Set(records.map(r=>r.donor)).size,4);
 assert.equal(nextTransfer({x:120,y:-25},{x:0,y:0},records),null);
});
test('보간은 시작과 끝이 연속이며 범위를 넘지 않음',()=>{
 for(const curve of [smooth,settle]){
  assert.equal(curve(0),0);assert.equal(curve(1),1);
  let previous=0;for(let i=1;i<=100;i++){const v=curve(i/100);assert.ok(v>=previous && v<=1);previous=v;}
 }
});
