import test from 'node:test';
import assert from 'node:assert/strict';
import { planRace, progress, formatRecord, clampRacers, shuffle, MAX_RACERS, COURSE_SECONDS } from './race-model.js';

// 같은 결과를 다시 만들 수 있는 시험용 난수
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

test('기록 글자는 ‘00초 00’ 꼴', () => {
  assert.equal(formatRecord(9.84), '09초 84');
  assert.equal(formatRecord(15), '15초 00');
  assert.equal(formatRecord(10.005), '10초 01');
  assert.equal(formatRecord(0), '00초 00');
});

test('인원은 2~100명으로 맞춰요', () => {
  assert.equal(clampRacers(0), 2);
  assert.equal(clampRacers(250), MAX_RACERS);
  assert.equal(clampRacers('37'), 37);
  assert.equal(clampRacers('글자'), 2);
});

test('경주 계획: 1~n번이 한 번씩, 등수 차례대로 기록이 빨라요, 기록은 모두 다르고 15초 안', () => {
  for (const n of [2, 7, 30, 100]) for (let seed = 1; seed <= 20; seed++) {
    const plan = planRace(n, seeded(seed * 97 + n));
    assert.deepEqual(plan.byNumber.map(r => r.number), Array.from({ length: n }, (_, i) => i + 1));
    assert.deepEqual(plan.racers.map(r => r.rank), Array.from({ length: n }, (_, i) => i + 1));
    plan.racers.forEach((r, i) => {
      assert.ok(r.time > 0 && r.time <= COURSE_SECONDS, `${r.time}`);
      assert.ok(Math.abs(Math.round(r.time * 100) - r.time * 100) < 1e-9, "0.01초 단위");
      if (i) assert.ok(r.time > plan.racers[i - 1].time, '기록이 같거나 순서가 바뀜');
    });
  }
});

test('섞기가 고르게: 1등이 되는 번호가 한쪽에 몰리지 않음', () => {
  const rand = seeded(2024), counts = Array(5).fill(0);
  for (let i = 0; i < 20000; i++) counts[shuffle([0, 1, 2, 3, 4], rand)[0]]++;
  for (const c of counts) assert.ok(Math.abs(c - 4000) < 300, `${counts}`);
});

test('진행률은 0에서 1까지 늘기만 하고, 기록한 순간에 꼭 결승선', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const { racers } = planRace(10, seeded(seed));
    for (const r of racers) {
      let prev = 0;
      for (let k = 1; k <= 400; k++) {
        const p = progress(k / 400, r.wiggle);
        assert.ok(p >= prev - 1e-12, '뒤로 감');
        prev = p;
      }
      assert.equal(progress(1, r.wiggle), 1);
      assert.ok(progress(0.999, r.wiggle) < 1);
    }
  }
});
