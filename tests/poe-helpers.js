// 실험 전 1분 복습: 모든 질문에 하나씩 답해야 ‘복습 마치고 실험 시작하기’가 켜져요.
export async function finishReview(page) {
  const items = page.locator('.review-item');
  const n = await items.count();
  for (let i = 0; i < n; i++) await items.nth(i).locator('.review-choice').first().click();
  await page.locator('#finish-review').click();
}
// 예상 저장: ‘예상 저장하고 실험하기’를 누르면 확인 창이 뜨고, 확인해야 저장돼요.
export async function savePrediction(page) {
  await page.locator('#start-observation').click();
  await page.locator('#confirm-prediction').click();
}
export async function beginObservation(page) {
  await finishReview(page);
  await page.locator('input[name="prediction"][value="0"]').check();
  await page.locator('#prediction-reason').fill('풍선을 문지른 뒤 털이 달라붙었던 경험이 있어요.');
  await savePrediction(page);
}
// 관찰을 이미 한 번 마친 학생처럼 열기: 실험 순서 잠금이 모두 풀린 관찰하기 화면에서 시작해요.
// 뒤쪽 단계의 과학 내용만 따로 확인하는 테스트에서 써요.
// 실험이 여럿인 페이지는 count(실험 수)와 current(지금 실험)를 주면, 앞 실험들은 설명까지 마친 상태로 둬요.
// observed: false면 지금 실험은 예상만 저장한 상태(순서 잠금이 걸린 상태)로 열어요.
export async function openObserveUnlocked(page, url, { count = 1, current = 0, observed = true } = {}) {
  const key = `poe:${url.split('/').filter(Boolean).at(-1)}`;
  const prediction = { index: 0, choice: '시험용 예상', reason: '시험용으로 미리 적어 둔 예상의 까닭이에요.' };
  const done = { stage: 'explain', reached: 2, prediction, choice: null, reason: '', observation: '', saved: '시험용 관찰 기록이에요. 이미 저장했어요.', observed: true, explanation: '시험용 설명이에요. 이미 저장해 두었어요.', explained: true };
  const now = { stage: 'observe', reached: 1, prediction, choice: null, reason: '', observation: '', saved: '', observed, explanation: '', explained: false };
  const fresh = { stage: 'predict', reached: 0, prediction: null, choice: null, reason: '', observation: '', saved: '', observed: false, explanation: '', explained: false };
  const state = {
    current, reviewed: true, onReview: false, reviewAnswers: [], quiz: null, locked: false,
    exps: Array.from({ length: count }, (_, i) => i < current ? done : i === current ? now : fresh),
  };
  await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, v); }, [key, JSON.stringify(state)]);
  await page.goto(url);
}
