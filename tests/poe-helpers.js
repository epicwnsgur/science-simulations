export async function beginObservation(page) {
  // 실험 전 복습이 있는 실험은 복습을 건너뛰고 시작해요.
  if (await page.locator('#skip-review').isVisible()) await page.locator('#skip-review').click();
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('풍선을 문지른 뒤 털이 달라붙었던 경험이 있어요.');
  await page.locator('#start-observation').click();
}
