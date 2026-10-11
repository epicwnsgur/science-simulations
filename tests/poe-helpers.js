export async function beginObservation(page) {
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('풍선을 문지른 뒤 털이 달라붙었던 경험이 있어요.');
  await page.locator('#start-observation').click();
}
