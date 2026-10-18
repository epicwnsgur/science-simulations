import { test, expect } from '@playwright/test';
import { beginObservation } from './poe-helpers.js';
import { CONCEPT_QUIZZES } from '../src/concept-quizzes.js';

async function hold(page, ms = 900) {
  const btn = page.locator('#press-btn');
  await btn.scrollIntoViewIfNeeded();
  const b = await btn.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.waitForTimeout(ms); await page.mouse.up();
}
async function finish(page, concept) {
  await expect(page.locator('#to-explanation'), await page.locator('#observation-progress').textContent()).toBeEnabled({ timeout: 8000 });
  await page.locator('#observation-record').fill('관찰한 내용을 빠짐없이 자세하게 적어 보았어요.');
  await page.locator('#to-explanation').click();
  await page.locator('#explanation-record').fill('관찰한 결과의 까닭을 과학 개념으로 설명했어요.');
  await page.locator('#reveal-concepts').click();
  await expect(page.locator('#concept-review')).toContainText(concept);
  const slug = new URL(page.url()).pathname.split('/').filter(Boolean).at(-1);
  for (const [n, question] of CONCEPT_QUIZZES[slug].entries()) {
    const buttons = page.locator(`[data-quiz="${n}"]`);
    await expect(buttons).toHaveCount(n < 2 ? 2 : 5);
    const wrong = question.options.find(([id]) => id !== question.answer)[0];
    await page.locator(`[data-quiz="${n}"][data-choice="${wrong}"]`).click();
    await expect(page.locator(`#quiz-feedback-${n}`)).toContainText('다시');
    await page.locator(`[data-quiz="${n}"][data-choice="${question.answer}"]`).click();
    await expect(page.locator(`#quiz-feedback-${n}`)).toContainText(question.explanation);
  }
  await expect(page.locator('.quiz-progress')).toContainText('3 / 3문제 정답');
}

const LABS = [
  ['/simulations/friction-electricity/', '마찰 전기', async page => {
    for (let i = 0; i < 2; i++) { await page.locator('#rub-btn').click(); await page.waitForTimeout(1300); }
    await page.locator('#lift-btn').click(); await page.waitForTimeout(1800);
    await page.locator('#tab-spoon').click(); await page.locator('#rub-spoons').click();
    await page.locator('#approach').click(); await page.waitForTimeout(2500);
    await page.locator('[data-tool="glove"]').click(); await page.locator('#approach').click(); await page.waitForTimeout(2500);
  }],
  ['/simulations/electric-current/', '전류', async page => {
    for (let i = 0; i < 3; i++) await page.locator('#rub-btn').click();
    await page.locator('#place-btn').click(); await page.locator('#touch-btn').click();
    await page.waitForTimeout(200);
    await page.locator('#touch-btn').click(); await page.locator('#touch-btn').click();
    await page.locator('#tab-circuit').click(); await page.locator('#battery-btn').click(); await page.locator('#pump-btn').click();
    await page.waitForTimeout(1800);
  }],
  ['/simulations/ohms-law/', '옴의 법칙', async page => {
    for (const w of ['long', 'short']) {
      await page.locator(`[data-wire="${w}"]`).click();
      for (let v = 1; v <= 4; v++) { await page.locator('#v-up').click(); await page.locator('#switch-btn').click(); await page.locator('#record-btn').click(); await page.locator('#switch-btn').click(); }
    }
    await expect(page.locator('#readout')).toContainText('400');
    await page.locator('#tab-material').click();
    for (const m of ['copper', 'clip', 'rubber', 'wood']) { await page.locator(`[data-material="${m}"]`).click(); await page.locator('#switch-btn').click(); }
  }],
  ['/simulations/series-parallel/', '병렬연결', async page => {
    await page.locator('#close-all').click();
    for (const t of ['series', 'parallel']) { await page.locator(`#tab-${t}`).click(); await page.locator('#close-all').click(); await page.waitForTimeout(100); await page.locator('[data-switch="S2"]').click(); await page.waitForTimeout(100); }
  }],
  ['/simulations/coil-magnetic-field/', '자기장', async page => {
    await page.waitForTimeout(1700);
    await page.locator('#tab-coil').click(); await hold(page);
    await page.locator('#flip-btn').click(); await hold(page);
    await page.locator('[data-level="2"]').click(); await hold(page);
  }],
  ['/simulations/electric-swing/', '힘의 방향', async page => {
    await hold(page);
    await page.locator('#flip-current').click(); await hold(page);
    await page.locator('#flip-current').click(); await page.locator('#flip-magnet').click(); await hold(page);
    await page.locator('[data-v="2"]').click(); await hold(page);
  }],
  ['/simulations/electric-motor/', '코일과 자석', async page => {
    await page.locator('#switch-btn').click(); await page.waitForTimeout(1500);
    await page.locator('#flip-current').click(); await page.waitForTimeout(2500);
    await page.locator('#tab-simple').click(); await page.locator('#switch-btn').click(); await page.locator('#nudge').click(); await page.waitForTimeout(2000);
    await page.locator('[data-strip="full"]').click(); await page.locator('#nudge').click(); await page.waitForTimeout(3500);
  }],
];

for (const [url, concept, run] of LABS) {
  test(`${url} 예상→관찰→설명`, async ({ page }) => {
    test.setTimeout(45000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await expect(page.locator('#predict-panel')).toBeVisible();
    await expect(page.locator('#scene')).not.toBeVisible();
    await expect(page.locator('.mission')).not.toBeVisible();
    await beginObservation(page);
    await expect(page.locator('#to-explanation')).toBeDisabled();
    await expect(page.locator('.mission')).not.toBeVisible();
    await run(page);
    await finish(page, concept);
    await page.locator('[data-quiz="0"]').first().click();
    await expect(page.locator('#quiz-feedback-0')).not.toHaveText('');
    await page.locator('#restart-poe').click();
    await expect(page.locator('#predict-panel')).toBeVisible();
    await expect(page.locator('.quiz-progress')).toHaveText('0 / 3문제 정답');
    await expect(page.locator('.mission .chosen')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
  test(`${url} 모바일 화면 넘침 없음`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url); await beginObservation(page);
    await expect(page.locator('#scene')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('옴의 법칙: 스위치를 닫아야 측정값을 기록할 수 있고 표에 값이 남음', async ({ page }) => {
  await page.goto('/simulations/ohms-law/'); await beginObservation(page);
  await page.locator('#v-up').click(); await page.locator('#v-up').click();
  await expect(page.locator('#record-btn')).toBeDisabled();
  await page.locator('#switch-btn').click(); await page.locator('#record-btn').click();
  await expect(page.locator('#readout')).toContainText('100');
  await page.locator('[data-wire="short"]').click();
  await expect(page.locator('#readout')).toContainText('100');
});

test('저항의 연결: 직렬에서 스위치 하나를 열면 두 전구 모두 꺼지고 병렬에서는 하나만 꺼짐', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/simulations/series-parallel/'); await beginObservation(page);
  const glow = id => page.locator(`#circuit-${id} .glow`);
  await page.locator('#tab-series').click(); await page.locator('#close-all').click();
  await expect(glow('series').first()).not.toHaveAttribute('opacity', '0.00');
  await page.locator('[data-switch="S1"]').click();
  await expect(glow('series').nth(0)).toHaveAttribute('opacity', '0.00');
  await expect(glow('series').nth(1)).toHaveAttribute('opacity', '0.00');
  await page.locator('#tab-parallel').click(); await page.locator('#close-all').click(); await page.locator('[data-switch="S2"]').click();
  await expect(glow('parallel').nth(0)).toHaveAttribute('opacity', '1.00');
  await expect(glow('parallel').nth(1)).toHaveAttribute('opacity', '0.00');
});

test('서술은 공백을 빼고 20자 이상이어야 다음 단계로 넘어감', async ({ page }) => {
  await page.goto('/simulations/series-parallel/');
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('직렬은 어두울 것 같아요');
  await expect(page.locator('.char-count[data-for="prediction-reason"]')).toContainText('10 / 20자');
  await page.locator('#start-observation').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await page.locator('#prediction-reason').fill('                    가나다라마바사아자차카타파하                 ');
  await page.locator('#start-observation').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await page.locator('#prediction-reason').fill('직렬연결하면 전구 하나일 때보다 어두울 것 같아요.');
  await expect(page.locator('.char-count[data-for="prediction-reason"]')).toHaveClass(/enough/);
  await page.locator('#start-observation').click();
  await expect(page.locator('#observe-panel')).toBeVisible();
});

test('스스로 평가: 옳은 보기는 초록색, 틀린 보기는 붉은색', async ({ page }) => {
  for (const url of ['/simulations/ohms-law/', '/simulations/electrostatic-induction/']) {
    await page.goto(url);
    const buttons = page.locator('.mission .answers').first().locator('button');
    const n = await buttons.count();
    const colors = [];
    for (let i = 0; i < n; i++) {
      await buttons.nth(i).evaluate(b => b.click());
      colors.push(await buttons.nth(i).evaluate(b => [b.classList.contains('right'), getComputedStyle(b).backgroundColor]));
    }
    const right = colors.filter(([r]) => r), wrong = colors.filter(([r]) => !r);
    expect(right.length).toBe(1);
    expect(right[0][1]).toBe('rgb(15, 59, 42)');
    for (const [, c] of wrong) expect(c).toBe('rgb(58, 20, 32)');
  }
});

test('관찰하기 단계에서 왼쪽 실험 순서 안내가 지금 할 일을 보여 줌', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/simulations/series-parallel/'); await beginObservation(page);
  const guide = page.locator('#step-guide');
  await expect(guide).toBeVisible();
  await expect(guide.locator('li')).toHaveCount(6);
  await expect(guide.locator('li.current')).toContainText('전구 1개');
  const g = await guide.boundingBox(), lab = await page.locator('.lab').boundingBox();
  expect(g.x + g.width).toBeLessThanOrEqual(lab.x);
  await page.locator('#close-all').click();
  await expect(guide.locator('li.done')).toHaveCount(1);
  await expect(guide.locator('li.current')).toContainText('직렬연결');
  await expect(guide.locator('.guide-count')).toHaveText('1 / 5');
});
