import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCatalog, discoverPages } from '../build/catalog.js';

test('실험 추가·삭제와 폴더 추가가 모든 상위 개수에 반영되고 중복 링크는 한 번만 집계',()=>{
 const root=mkdtempSync(join(tmpdir(),'science-catalog-'));
 const write=(path,html)=>{mkdirSync(join(root,path),{recursive:true});writeFileSync(join(root,path,'index.html'),html);};
 const link=(href)=>`<a class="folder active-folder" href="${href}"><span class="grade">old</span></a>`;
 try {
  write('','<span class="available">old</span>'+link('./grades/a/'));
  write('grades/a',link('./unit-1/'));
  write('grades/a/unit-1',link('../../../simulations/a/')+link('../../../simulations/a/'));
  write('simulations/a','simulation');
  assert.equal(readCatalog(root).summary('/').experiments.size,1);
  write('simulations/b','simulation');
  write('grades/a/unit-1',link('../../../simulations/a/')+link('../../../simulations/b/'));
  for(const path of ['/','/grades/a/','/grades/a/unit-1/'])assert.equal(readCatalog(root).summary(path).experiments.size,2);
  write('grades/b','<article class="folder future-folder"></article>');
  write('','<span class="available">old</span>'+link('./grades/a/')+link('./grades/b/'));
  const catalog=readCatalog(root);
  assert.equal(catalog.summary('/').folders.size,2);
  assert.equal(catalog.summary('/').pending.size,1);
  assert.match(catalog.transform('<span class="available">old</span>','/'),/폴더 2개 · 실험 2개 · 준비 중 1개/);
  assert.match(catalog.transform(link('./grades/a/'),'/'),/폴더 1개 · 실험 2개/);
  assert.ok(discoverPages(root).includes('grades/b/index.html'));
  write('grades/a/unit-1',link('../../../simulations/b/'));
  assert.equal(readCatalog(root).summary('/').experiments.size,1);
  write('grades/a/unit-1',link('../../../simulations/missing/'));
  assert.throws(()=>readCatalog(root).summary('/'),/연결된 페이지가 없습니다/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
