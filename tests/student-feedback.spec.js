import { test, expect } from '@playwright/test';

// 학생 사용 후기를 반영한 기능(2026년 11월): 배치 정리, 그림 이해 돕기, 메모, 도전 과제 다시 풀기, 관찰 기록 고치기, 크게 보기
const CURRENT = '/simulations/electric-current/';
const DONE = { stage: 'explain', reached: 2, prediction: { index: 0, choice: '예상', reason: '수로 모형에서 펌프를 세게 하면 물도 세게 흘렀으니까요.' }, choice: null, reason: '', observation: '', saved: '전지를 연결하니 전자가 한 방향으로 움직였어요. 펌프를 켜니 물레방아가 돌았어요.', observed: true, explanation: '전지는 펌프처럼 전압을 만들어 전류가 계속 흐르게 해요. 그래서 전구에 불이 켜져요.', explained: true };
const startAt = (page, slug, exp) => page.addInitScript(([k, v]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, v); },
  [`poe:${slug}`, JSON.stringify({ current: 0, reviewed: true, onReview: false, reviewAnswers: [], quiz: null, locked: false, exps: [exp] })]);
const OBSERVE = { ...DONE, stage: 'observe', reached: 1, saved: '', explanation: '', explained: false };

test('머리글: 테마·화면 크기·글씨 크기는 ‘설정’ 안에 있고, 바깥을 누르면 닫힘', async ({ page }) => {
  await page.goto(CURRENT);
  await expect(page.locator('[data-zoom="+"]')).toBeHidden();
  await page.locator('.settings-btn').click();
  await expect(page.locator('[data-zoom="+"]')).toBeVisible();
  await expect(page.locator('[data-text-size="l"]')).toBeVisible();
  await expect(page.locator('header [data-theme-toggle]')).toBeVisible();
  await page.mouse.click(30, 600);
  await expect(page.locator('[data-zoom="+"]')).toBeHidden();
});

test('관찰하기: 실험 순서 안내는 그림 위 한 줄, 기록 칸은 그림 아래, 다음에 누를 단추가 빛나고 모형 설명은 접혀 있음', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startAt(page, 'electric-current', { ...OBSERVE, observed: false });
  await page.goto(CURRENT);
  const guide = await page.locator('#step-guide').boundingBox(), stage = await page.locator('.stage').boundingBox(), aside = await page.locator('#simulation-mount .workspace > aside').boundingBox();
  expect(guide.y + guide.height).toBeLessThan(stage.y);
  expect(aside.y).toBeGreaterThan(stage.y + stage.height);
  expect(stage.width).toBeGreaterThan(1100);
  await expect(page.locator('#rub-btn')).toHaveClass(/next-target/);
  await expect(page.locator('#model-note')).toBeHidden();
  await page.locator('.model-note-box summary').click();
  await expect(page.locator('#model-note')).toBeVisible();
  await expect(page.locator('.stage .model-tag')).toHaveText('모형 그림');
});

test('그림 이해 돕기: 단추를 누르면 바뀐 값이 빛나고 ‘지금 볼 곳’이 결과가 나타나는 곳을 가리킴, 마우스로 직접 문질러도 됨', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startAt(page, 'electric-current', { ...OBSERVE, observed: false });
  await page.goto(CURRENT);
  await page.locator('#rub-btn').click();
  await expect(page.locator('#readout .just-changed').first()).toBeAttached({ timeout: 3000 });
  await expect(page.locator('.look-ring.show')).toContainText('지금 볼 곳: 네온전구');
  // 플라스틱 접시를 누른 채 좌우로 문지르기
  await page.locator('#plastic').scrollIntoViewIfNeeded();
  const box = await page.locator('#plastic').boundingBox(), y = box.y + box.height / 2;
  await page.mouse.move(box.x + 40, y); await page.mouse.down();
  for (let i = 0; i < 3; i++) { await page.mouse.move(box.x + box.width - 40, y, { steps: 6 }); await page.waitForTimeout(450); await page.mouse.move(box.x + 40, y, { steps: 6 }); await page.waitForTimeout(450); }
  await page.mouse.up();
  await expect(page.locator('#stage-state')).toContainText(/문지른 횟수 [3-9]번/, { timeout: 3000 });
});

test('메모: Alt + M으로 열고 닫고, 제목 줄을 끌어서 옮길 수 있음', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(CURRENT);
  await page.keyboard.press('Alt+KeyM');
  const panel = page.locator('#memo-panel');
  await expect(panel).toBeVisible();
  const before = await panel.boundingBox();
  const head = await page.locator('.memo-head h2').boundingBox();
  await page.mouse.move(head.x + 10, head.y + 10); await page.mouse.down();
  await page.mouse.move(head.x + 610, head.y - 200, { steps: 8 }); await page.mouse.up();
  const after = await panel.boundingBox();
  expect(after.x - before.x).toBeGreaterThan(500);
  expect(before.y - after.y).toBeGreaterThan(150);
  await page.keyboard.press('Alt+KeyM');
  await expect(panel).toBeHidden();
});

test('도전 과제 다시 풀기: 한 번 묻고, 생각 더하기 글은 남김', async ({ page }) => {
  await startAt(page, 'ohms-law', DONE);
  await page.goto('/simulations/ohms-law/');
  await page.locator('#challenge-input-0').fill('300');
  await page.locator('[data-check="0"]').click();
  await page.locator('#challenge-think').fill('니크롬선이 뜨거워지면 저항이 커져서 그래프가 덜 가파르게 휘어질 것 같아요.');
  page.once('dialog', d => d.dismiss());
  await page.locator('#challenge-retry').click();
  await expect(page.locator('#challenge-feedback-0')).toContainText('맞혔어요');
  page.once('dialog', d => d.accept());
  await page.locator('#challenge-retry').click();
  await expect(page.locator('#challenge-feedback-0')).toHaveText('');
  await expect(page.locator('#challenge-think')).toHaveValue(/덜 가파르게/);
});

test('스스로 평가: 틀린 보기를 고르면 결과에 ‘내 답이 틀린 까닭’이 나옴', async ({ page }) => {
  await startAt(page, 'electric-current', DONE);
  await page.goto(CURRENT);
  for (const b of await page.locator('[data-quiz]').all()) {
    const n = await b.getAttribute('data-quiz');
    if (await page.locator(`[data-quiz="${n}"][aria-pressed="true"]`).count()) continue;
    await b.click();
  }
  await page.locator('#quiz-check').click();
  // 5지선다에서 틀린 문항(내 답이 ①~⑤)에는 까닭이 나와요.
  const wrong = page.locator('.quiz-review li.wrong').filter({ hasText: /내 답: [①②③④⑤]/ });
  expect(await wrong.count()).toBeGreaterThan(0);
  for (const li of await wrong.all()) await expect(li).toContainText('내 답이 틀린 까닭');
});

test('설명하기: ‘관찰 기록의 오타 고치기’를 누르면 관찰 기록 칸으로 감', async ({ page }) => {
  await startAt(page, 'electric-current', { ...DONE, explained: false, explanation: '' });
  await page.goto(CURRENT);
  await page.locator('#fix-observation').click();
  await expect(page.locator('#observe-panel')).toBeVisible();
  await expect(page.locator('#observation-parts textarea').first()).toBeFocused();
});

test('크게 보기: 실험 칸을 화면 가득 키우고 다시 작게 볼 수 있음', async ({ page }) => {
  await startAt(page, 'electric-current', OBSERVE);
  await page.goto(CURRENT);
  const btn = page.locator('.lab-full');
  test.skip(!(await btn.isVisible()), '이 브라우저는 전체 화면을 쓸 수 없어요.');
  await btn.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains('lab'))).toBe(true);
  await expect(btn).toContainText('작게 보기');
  await btn.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
});
