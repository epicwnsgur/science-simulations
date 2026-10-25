import test from 'node:test';
import assert from 'node:assert/strict';
import { PAIRS } from './water-model.js';

test('수로 모형의 짝: 전지–펌프, 전선–수로, 전구–물레방아, 전류–물의 흐름, 전압–물의 높이 차(교과서 수로 모형)', () => {
  assert.deepEqual(PAIRS.map(([, c, , w]) => [c, w]), [['전지', '펌프'], ['전선', '수로'], ['전구', '물레방아'], ['전류', '물의 흐름'], ['전압', '물의 높이 차']]);
  for (const p of PAIRS) assert.ok(p[4].endsWith('요.'), `${p[1]} 설명은 해요체 문장`);
  // 전압은 전류를 흐르게 하는 능력(교과서): 높이 차와 짝을 짓고, ‘높이 차가 클수록 세게 흐른다’로 설명해요.
  assert.match(PAIRS.find(p => p[0] === 'voltage')[4], /전류를 흐르게/);
});
