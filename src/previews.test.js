import test from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEWS, previewOf } from './previews.js';
import { SCENES } from './preview-scenes.js';
import { REVIEWS } from './reviews.js';

test('모든 실험에 예상 단계의 ‘실험 미리 보기’와 움직이는 그림이 있음(새 실험도 빠뜨리지 않기)', () => {
  for (const slug of Object.keys(REVIEWS)) {
    assert.ok(PREVIEWS[slug], `${slug} 설명`);
    assert.ok(SCENES[slug], `${slug} 그림`);
  }
  assert.ok(previewOf('friction-electricity', 'rub') && previewOf('friction-electricity', 'spoon'), '마찰 전기는 실험마다');
});

test('실험 미리 보기: 3~4단계, 학생 말(해요체), 그림의 단계 수와 같고, 잘 볼 것은 결과를 말하지 않는 물음 꼴', () => {
  for (const [slug, exps] of Object.entries(PREVIEWS)) for (const [id, pv] of Object.entries(exps)) {
    assert.ok(pv.steps.length >= 3 && pv.steps.length <= 4, `${slug}/${id} 단계 수`);
    for (const text of pv.steps) assert.match(text, /요\.$/, `${slug}: ${text}`);
    assert.doesNotMatch(pv.steps.join(''), /\p{Extended_Pictographic}/u, `${slug}: 그림 글자(이모지)는 쓰지 않아요`);
    assert.equal(SCENES[slug][id].steps.length, pv.steps.length, `${slug}/${id} 그림 단계 수`);
    assert.match(pv.watch, /(지|는지|인지|방향|밝기|되는지)$/, `${slug} 잘 볼 것`);
  }
});

test('전류와 전압 미리 보기: 네온전구의 다른 끝(도선)은 전구 끝에 붙은 채로 그 점을 축으로 돌아 접시에 닿음(떨어져 움직이지 않음)', () => {
  const svg = SCENES['electric-current'].main.svg;
  const tip = svg.match(/<g data-o="tip" style="([^"]*)">(.*?)<\/g>/);
  assert.ok(tip, '도선 그룹');
  assert.match(tip[1], /transform-origin:176px 48px/);
  assert.match(tip[2], /^<path d="M176 48 /, '도선은 전구 끝(176, 48)에서 시작');
  assert.match(svg, /<rect x="148" y="42" width="28" height="12"/, '전구의 오른쪽 끝이 x 176');
  assert.match(SCENES['electric-current'].main.steps[2].toString(), /move\('tip', \[\[0, 0, 0, 1\], \[0, 0, \d+/, '옮기지 않고 돌리기만 해요');
});
