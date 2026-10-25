// 개념 정리 포스트잇: 주어는 보여 주고(<b class="subj">) 나머지만 가려요(<b>). 명사만 물을 때는 명사만 가려요.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const ADJECTIVES = new Set(['같은', '작은', '밝은', '높은', '낮은', '많은', '먼']);
const labs = readdirSync(root).filter(f => f.endsWith('.js') && readFileSync(new URL(f, root), 'utf8').includes('    concepts: ['));
const conceptsOf = f => { const s = readFileSync(new URL(f, root), 'utf8'), a = s.indexOf('    concepts: ['); return s.slice(a, s.indexOf('\n    ],', a)); };

test('개념 포스트잇: 모든 실험에 가릴 주요 개념이 있고, 가린 말이 주어로 시작하지 않음(주어는 보이게)', () => {
  assert.ok(labs.length >= 13, `실험 수 ${labs.length}`);
  for (const f of labs) {
    const block = conceptsOf(f);
    const covered = [...block.matchAll(/<b>([^<]+)<\/b>/g)].map(m => m[1]);
    assert.ok(covered.length >= 2, `${f}: 가릴 주요 개념`);
    for (const t of covered) {
      const first = t.split(/\s/)[0];
      // ‘같은 종류’처럼 꾸며 주는 말(같은·작은·높은 …)은 주어가 아니에요.
      const subject = t.includes(' ') && /(?:은|는|이|가|도)$/.test(first) && !ADJECTIVES.has(first);
      assert.ok(!subject, `${f}: ‘${t}’ — 주어는 <b class="subj">로 빼서 보여 줘요`);
    }
    // 주어를 보여 줄 때는 바로 뒤에 가린 말이 이어져요.
    for (const m of block.matchAll(/<b class="subj">([^<]+)<\/b>(.{0,30})/g)) assert.match(m[2], /<b>/, `${f}: 주어 ‘${m[1]}’ 뒤에 가린 말`);
  }
});
