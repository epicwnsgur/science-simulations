import test from 'node:test';
import assert from 'node:assert/strict';
import { charges, LIMIT, interaction, rubbingDistance } from './model.js';
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
