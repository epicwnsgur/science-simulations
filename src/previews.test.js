import test from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEWS, previewOf } from './previews.js';
import { REVIEWS } from './reviews.js';

const MOTIONS = ['rub', 'lift', 'near', 'press', 'spin', 'grow', 'slide', 'look', 'flip', 'glow', 'orbit', 'swing'];

test('모든 실험에 예상 단계의 ‘실험 미리 보기’가 있음(새 실험도 빠뜨리지 않기)', () => {
  for (const slug of Object.keys(REVIEWS)) assert.ok(previewOf(slug, 'main') || PREVIEWS[slug], slug);
  assert.ok(previewOf('friction-electricity', 'rub') && previewOf('friction-electricity', 'spoon'), '마찰 전기는 실험마다');
});

test('실험 미리 보기: 3~4단계, 학생 말(해요체), 알맞은 움직임, 잘 볼 것은 결과를 말하지 않는 물음 꼴', () => {
  for (const [slug, exps] of Object.entries(PREVIEWS)) for (const [id, pv] of Object.entries(exps)) {
    assert.ok(pv.steps.length >= 3 && pv.steps.length <= 4, `${slug}/${id} 단계 수`);
    for (const [icon, motion, text] of pv.steps) {
      assert.ok(icon.trim(), `${slug} 그림`);
      assert.ok(MOTIONS.includes(motion), `${slug}: ${motion}`);
      assert.match(text, /요\.$/, `${slug}: ${text}`);
    }
    assert.match(pv.watch, /(지|는지|인지|방향|밝기|되는지)$/, `${slug} 잘 볼 것`);
  }
});
