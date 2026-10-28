// 중1 Ⅵ 입자 모형(src/gas-particles.js): 보일·샤를 법칙과 교과서의 입자 설명에 맞게 움직이는지 살펴요.
import test from 'node:test';
import assert from 'node:assert/strict';

// 화면(SVG) 없이 모형만 돌려요.
const el = () => ({ setAttribute() {}, append() {}, animate() { return {}; }, remove() {}, childElementCount: 0 });
globalThis.document = { createElementNS: el };
const { createCylinder } = await import('./gas-particles.js');
const { pistonHeightAtTemp } = await import('./gas-model.js');

const run = (setup, seconds = 300) => {
  const c = createCylinder({ layer: el(), x: 150, w: 210, floor: 400, n: 30, h1: 180, maxH: 330, minH: 30, baseSpeed: 150, seed: 31 });
  setup(c); c.settle();
  let hits = 0;
  for (let t = 0; t < seconds; t += 1 / 60) hits += c.step(1 / 60, { flashes: false });
  return { c, rate: hits / seconds };
};

test('보일 법칙 입자 모형: 외부 압력 2배·4배 → 부피 1/2배·1/4배, 피스톤에 부딪히는 횟수 약 2배·4배, 빠르기는 그대로', () => {
  const [a, b, d] = [1, 2, 4].map(p => run(c => c.setExternal(p)));
  for (const [r, p] of [[a, 1], [b, 2], [d, 4]]) {
    assert.ok(Math.abs(r.c.volumeRatio * 30 - 30 / p) < 1e-6, `${p} 기압 부피`);
    assert.ok(Math.abs(r.c.inner - p) < 1e-6, `${p} 기압에서 두 압력이 같아요`);
    assert.equal(r.c.speed, a.c.speed);
  }
  assert.ok(Math.abs(b.rate / a.rate - 2) < .2, `2 기압 ${b.rate / a.rate}`);
  assert.ok(Math.abs(d.rate / a.rate - 4) < .4, `4 기압 ${d.rate / a.rate}`);
});

test('샤를 법칙 입자 모형: 외부 압력이 일정할 때 부피는 온도에 따라 일정하게 변하고, 빠르기는 온도가 높을수록 커짐', () => {
  const vol = c => run(x => x.setTemp(c)).c;
  const [v0, v20, v100] = [0, 20, 100].map(vol);
  for (const [v, c] of [[v0, 0], [v20, 20], [v100, 100]]) assert.ok(Math.abs(v.volumeRatio * 30 - pistonHeightAtTemp(c, 30)) < 1e-6, `${c} ℃`);
  assert.ok(v0.volumeRatio * 30 > 27, '0 ℃에서도 부피는 0이 아니에요');
  assert.ok(v100.speed > v20.speed && v20.speed > v0.speed);
  // 온도를 높인 직후(부피가 커지기 전)에는 기체의 압력이 외부 압력보다 커서 피스톤이 올라가요.
  const c = createCylinder({ layer: el(), x: 150, w: 210, floor: 400, n: 30, h1: 180 });
  c.settle(); c.setTemp(80);
  assert.ok(c.inner > 1);
  const h = c.height; c.step(.1); assert.ok(c.height > h);
});
