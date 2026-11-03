import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// 예상하기 그림은 실험 화면이 보이지 않을 때(3D 화면 등)에도 그려져야 해요.
// 그래서 그림 안에서 쓰는 그라디언트·화살촉(url(#…))은 그 그림 안에 정의해요(우주 팽창 풍선이 보이지 않던 오류).
test('예상하기 그림: url(#…)로 쓰는 것은 모두 그 그림 안에 정의되어 있음', () => {
  const root = new URL('../', import.meta.url);
  for (const file of readdirSync(root).filter(f => f.endsWith('.js'))) {
    const src = readFileSync(new URL(file, root), 'utf8');
    for (const m of src.matchAll(/illustration: `(<svg[\s\S]*?<\/svg>)`/g)) {
      const svg = m[1];
      for (const [, id] of svg.matchAll(/url\(#([\w-]+)\)/g)) assert.match(svg, new RegExp(`id="${id}"`), `${file}: #${id}`);
    }
  }
});
