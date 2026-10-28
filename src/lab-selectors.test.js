// 실험 파일이 단추를 찾을 때 공통 화면(src/*.js: 학습 흐름, 미리 보기, 퀴즈 등)이 쓰는 data- 이름을 화면 전체에서 찾으면,
// 공통 단추에도 실험의 동작이 붙어요. 보일 법칙 실험에서 피스톤 단추를 [data-step]으로 찾았다가 ‘관찰하기’ 단계 단추와
// 미리 보기 단계(li data-step)까지 잡혀, 누르면 부피가 NaN이 되어 기록과 움직임이 멈춘 일이 있었어요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const shared = new Set(readdirSync('src').filter(f => f.endsWith('.js') && !f.endsWith('.test.js'))
  .flatMap(f => [...readFileSync(`src/${f}`, 'utf8').matchAll(/\b(data-[a-z-]+)=/g)].map(m => m[1])));
// data-term은 ‘실험 속 핵심 개념’ 낱말 단추예요. buildLab을 쓰지 않는 정전기 유도 실험은 이 묶음을 직접 그리므로 같은 이름을 써요.
shared.delete('data-term');

test('실험 파일은 공통 화면의 data- 이름(data-step 등)으로 화면 전체에서 단추를 찾지 않음', () => {
  assert.ok(shared.has('data-step') && shared.has('data-goto'));
  const labs = readdirSync('.').filter(f => f.endsWith('.js') && !f.endsWith('.config.js'));
  for (const f of labs) {
    for (const m of readFileSync(f, 'utf8').matchAll(/(?:\$\$?|querySelector(?:All)?)\(\s*['"`]\[(data-[a-z-]+)/g)) {
      assert.ok(!shared.has(m[1]), `${f}: ‘[${m[1]}]’는 공통 화면도 쓰는 이름이에요. ‘#controls [${m[1]}]’처럼 범위를 좁히거나 다른 이름을 써 주세요.`);
    }
  }
});
