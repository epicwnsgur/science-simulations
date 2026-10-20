// 실험 전 1분 복습: 모든 질문에 하나씩 답해야 ‘복습 마치고 실험 시작하기’가 켜져요.
export async function finishReview(page) {
  const items = page.locator('.review-item');
  const n = await items.count();
  for (let i = 0; i < n; i++) await items.nth(i).locator('.review-choice').first().click();
  await page.locator('#finish-review').click();
}
export async function beginObservation(page) {
  await finishReview(page);
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('풍선을 문지른 뒤 털이 달라붙었던 경험이 있어요.');
  await page.locator('#start-observation').click();
}
