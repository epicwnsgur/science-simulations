import { test, expect } from '@playwright/test';
import { finishReview, savePrediction, beginObservation, fillObservation } from './poe-helpers.js';
import { CONCEPT_QUIZZES } from '../src/concept-quizzes.js';

// 모든 실험에 공통으로 들어가는 학습 흐름(뒤로 가기, 예상 확인 창, 순서 지키기, 퀴즈 선택 표시)을 확인해요.
const SERIES = '/simulations/series-parallel/';
const REASON = '직렬연결하면 전구 하나일 때보다 어두울 것 같아요.';

async function writePrediction(page) {
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill(REASON);
}

test('예상 확인 창: 저장 전에 고른 예상과 까닭을 보여 주고, 고칠 수 없다고 알려 줌', async ({ page }) => {
  await page.goto(SERIES);
  await finishReview(page);
  await writePrediction(page);
  await page.locator('#start-observation').click();
  const dialog = page.locator('#prediction-confirm');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('다시 고칠 수 없어요');
  await expect(page.locator('#confirm-reason')).toHaveText(REASON);
  await expect(page.locator('#confirm-choice')).not.toBeEmpty();
  // 다시 고치기: 아직 저장되지 않아 그대로 고칠 수 있어요.
  await page.locator('#confirm-edit').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await expect(page.locator('#prediction-reason')).toHaveJSProperty('readOnly', false);
  await page.locator('#prediction-reason').fill(REASON + ' 고쳤어요.');
  await page.locator('#start-observation').click();
  await expect(page.locator('#confirm-reason')).toHaveText(REASON + ' 고쳤어요.');
  await page.locator('#confirm-prediction').click();
  await expect(page.locator('#observe-panel')).toBeVisible();
  await page.locator('#flow-back').click();
  await expect(page.locator('#prediction-reason')).toHaveJSProperty('readOnly', true);
  await expect(page.locator('#prediction-reason')).toHaveValue(REASON + ' 고쳤어요.');
});

test('뒤로 가기: 위쪽·아래쪽 버튼과 브라우저 뒤로 가기가 한 화면씩 돌아가고, 쓴 글은 남음', async ({ page }) => {
  await page.goto('/grades/middle-school-2/unit-7/');
  await page.goto(SERIES);
  // 첫 화면(복습)에서는 뒤로 갈 곳이 없어 버튼이 없어요.
  await expect(page.locator('#review-panel')).toBeVisible();
  await expect(page.locator('#flow-back')).toBeHidden();
  await finishReview(page);
  await expect(page.locator('#flow-back')).toBeVisible();
  await writePrediction(page);
  await savePrediction(page);
  await fillObservation(page, '전구 하나일 때 밝기를 기억해 두었어요. 쓰는 중이에요.');
  // 관찰 → (아래쪽 뒤로 가기) 예상
  await page.locator('#observation-form .flow-back').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  // 예상 → (위쪽 뒤로 가기) 복습: 고른 답이 남아 있고, 다시 실험으로 돌아갈 수 있어요.
  await page.locator('#flow-back').click();
  await expect(page.locator('#review-panel')).toBeVisible();
  await expect(page.locator('.review-choice.chosen')).toHaveCount(3);
  await expect(page.locator('#finish-review')).toBeEnabled();
  await page.locator('#finish-review').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await page.locator('#start-observation').click();
  await expect(page.locator('#observe-panel')).toBeVisible();
  await expect(page.locator('#observation-record')).toHaveValue('전구 하나일 때 밝기를 기억해 두었어요. 쓰는 중이에요.');
  // 브라우저(휴대폰)의 뒤로 가기도 한 화면씩: 관찰 → 예상 → 복습 → 실험 목록
  await page.goBack();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#review-panel')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/grades\/middle-school-2\/unit-7\/$/);
});

test('뒤로 가기: 실험이 둘이면 실험 2의 예상에서 실험 1의 설명으로 돌아감', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/simulations/friction-electricity/');
  await finishReview(page);
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('겨울에 털옷을 벗을 때 머리카락이 달라붙었던 적이 있어요.');
  await savePrediction(page);
  await page.locator('#rub-btn').click(); await page.locator('#show-detail').check(); await page.locator('#lift-btn').click();
  await expect(page.locator('#to-explanation')).toBeEnabled({ timeout: 8000 });
  await fillObservation(page, '풍선을 들어 올리니 털끝이 풍선 쪽으로 끌려왔어요.');
  await page.locator('#to-explanation').click();
  await page.locator('#explanation-record').fill('털의 전자가 풍선으로 옮겨 가 털은 (+), 풍선은 (−)가 되어 끌어당겼어요.');
  await page.locator('#reveal-concepts').click();
  await page.locator('#go-next-experiment').click();
  await expect(page.locator('#predict-title')).toContainText('숟가락');
  await page.locator('#flow-back').click();
  await expect(page.locator('.experiment-now')).toContainText('실험 1');
  await expect(page.locator('#explain-panel')).toBeVisible();
  await expect(page.locator('#explanation-record')).toHaveValue('털의 전자가 풍선으로 옮겨 가 털은 (+), 풍선은 (−)가 되어 끌어당겼어요.');
});

test('순서 지키기: 앞 단계를 하기 전에는 다음 단계 조작이 잠기고, 누르면 지금 할 일을 알려 줌', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(SERIES);
  await beginObservation(page);
  const series = page.locator('#tab-series'), parallel = page.locator('#tab-parallel');
  await expect(series).toHaveAttribute('aria-disabled', 'true');
  await expect(parallel).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#step-guide li.locked')).toHaveCount(4);
  // 잠긴 탭을 눌러도 넘어가지 않고 안내만 나와요.
  await series.click({ force: true });
  await expect(page.locator('.flow-toast')).toContainText('먼저 ‘① 전구 1개 회로의 밝기 확인하기’');
  await expect(page.locator('#tab-single')).toHaveAttribute('aria-selected', 'true');
  // 1단계를 하면 2단계(직렬연결) 탭이 열려요. 병렬연결은 아직 잠겨 있어요.
  await page.locator('#close-all').click();
  await expect(series).not.toHaveAttribute('aria-disabled', 'true');
  await expect(parallel).toHaveAttribute('aria-disabled', 'true');
  await series.click();
  await expect(series).toHaveAttribute('aria-selected', 'true');
});

test('퀴즈: 고른 보기가 어두운 바탕에 밝은 글씨로 또렷하고, 결과를 본 뒤에도 내 답 표시가 남음', async ({ page }) => {
  await page.goto('/simulations/ohms-law/');
  const quiz = CONCEPT_QUIZZES['ohms-law'];
  for (const [n, q] of quiz.entries()) {
    const pick = n === 1 ? q.options.find(([id]) => id !== q.answer)[0] : q.answer;
    await page.locator(`[data-quiz="${n}"][data-choice="${pick}"]`).evaluate(b => b.click());
  }
  const chosen = page.locator('[data-quiz="0"].chosen');
  await expect(chosen.locator('.pick-tag')).toHaveText('● 내 선택');
  // 글씨와 바탕의 명암비(WCAG 대비)가 4.5 이상이어야 잘 보여요.
  const contrast = await chosen.evaluate(el => {
    const rgb = c => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
    const cs = getComputedStyle(el), [a, b] = [lum(rgb(cs.color)), lum(rgb(cs.backgroundColor))];
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
  expect(contrast).toBeGreaterThan(4.5);
  await page.locator('#quiz-check').evaluate(b => b.click());
  await expect(page.locator('[data-quiz="0"].chosen .pick-tag')).toHaveText('✓ 내 답 · 정답');
  await expect(page.locator('[data-quiz="1"].chosen .pick-tag')).toHaveText('✕ 내 답 · 오답');
  await expect(page.locator('[data-quiz="1"].answer .pick-tag')).toHaveText('정답');
});

test('자동 재생 빠르기: 천천히가 보통보다 확실히 느리고, 재생 중에 고른 빠르기가 풀리지 않음', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/simulations/friction-electricity/');
  await finishReview(page);
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('겨울에 털옷을 벗을 때 머리카락이 달라붙었던 적이 있어요.');
  await savePrediction(page);
  // 첫 단계(문지르기 전)는 가상 시계로 3.2초예요. 보통(0.6배)이면 약 5.3초, 천천히(0.4배)면 약 8초 걸려요.
  const firstStep = async pace => {
    await page.locator(`[data-pace="${pace}"]`).click();
    const t0 = Date.now();
    await page.locator('[data-auto="play"]').click();
    await expect(page.locator('.autoplay-steps li.current')).toContainText('2. 문지르기', { timeout: 15000 });
    const took = Date.now() - t0;
    await expect(page.locator(`[data-pace="${pace}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-auto="stop"]').click();
    return took;
  };
  const normal = await firstStep('normal');
  const slow = await firstStep('slow');
  expect(normal).toBeGreaterThan(4500);
  expect(slow).toBeGreaterThan(normal * 1.3);
});
