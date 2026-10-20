import { test, expect } from '@playwright/test';
import { loadAppsScript } from '../apps-script/fake-google.js';
import { SUBMIT_URL } from '../src/submission-config.js';
import { CONCEPT_QUIZZES } from '../src/concept-quizzes.js';

const URL_ = '/simulations/friction-electricity/';
const REASON = '겨울에 털옷을 벗을 때 머리카락이 달라붙었던 적이 있어요.';

async function start(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL_);
  await expect(page.locator('#review-panel')).toBeVisible();
  await page.locator('#skip-review').click();
}
async function predict(page, choice, reason) {
  await page.locator(`input[name="prediction"][value="${choice}"]`).check();
  await page.locator('#prediction-reason').fill(reason);
  await page.locator('#start-observation').click();
  await expect(page.locator('#observe-panel')).toBeVisible();
}
async function balloonExperiment(page) {
  await page.locator('#rub-btn').click(); await page.locator('#rub-btn').click();
  await page.locator('#lift-btn').click();
  await expect(page.locator('#to-explanation')).toBeEnabled({ timeout: 8000 });
}
async function spoonExperiment(page) {
  await page.locator('#rub-spoons').click();
  await page.locator('#approach').click();
  await expect(page.locator('#step-guide li.done')).toHaveCount(2, { timeout: 8000 });
  await page.locator('[data-tool="glove"]').click();
  await expect(page.locator('[data-tool="glove"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#approach').click();
  await expect(page.locator('#to-explanation')).toBeEnabled({ timeout: 8000 });
}
async function observeAndExplain(page, observation, explanation) {
  await page.locator('#observation-record').fill(observation);
  await page.locator('#to-explanation').click();
  await page.locator('#explanation-record').fill(explanation);
  await page.locator('#reveal-concepts').click();
}
// 두 실험을 모두 마치고 개념 확인까지 갑니다.
async function finishBoth(page) {
  await start(page);
  await predict(page, 0, REASON);
  await balloonExperiment(page);
  await observeAndExplain(page, '풍선을 들어 올리니 털끝이 풍선 쪽으로 끌려왔어요.', '털의 전자가 풍선으로 옮겨 가 털은 (+), 풍선은 (−)가 되어 서로 끌어당겼어요.');
  await page.locator('#go-next-experiment').click();
  await predict(page, 1, '두 숟가락을 똑같이 문질렀으니 같은 전하라서 밀어낼 것 같아요.');
  await spoonExperiment(page);
  await observeAndExplain(page, '숟가락 ㉯는 ㉮를 밀어냈고 장갑은 ㉮를 끌어당겼어요.', '숟가락 ㉮와 ㉯는 같은 (−)전하라 척력이, 장갑은 (+)라 인력이 작용했어요.');
  await expect(page.locator('#concept-review')).toBeVisible();
}
// 제출 주소를 가로채 실제 Code.gs(가짜 시트)로 처리합니다. mode로 실패 상황을 흉내 내요.
async function fakeServer(page) {
  const server = loadAppsScript();
  server.context.setup();
  const code = server.ss.getSheetByName('설정').rows[1][1];
  const calls = [];
  const state = { mode: 'ok' };
  await page.route(SUBMIT_URL, async route => {
    const body = route.request().postData();
    calls.push(JSON.parse(body));
    if (state.mode === 'down') return route.abort('failed');
    const result = server.post(body);
    // 저장은 됐는데 응답이 학생에게 가지 못한 상황.
    if (state.mode === 'lost') return route.abort('timedout');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(result) });
  });
  const rows = () => (server.ss.getSheetByName('마찰 전기')?.rows ?? []).slice(2).filter(r => r.some(v => v !== '' && v != null));
  return { server, code, calls, state, rows };
}
async function fillIdentity(page, code, id = '20315', name = '홍길동') {
  await page.locator('#submit-code').fill(code);
  for (const f of ['#submit-id', '#submit-id-confirm']) await page.locator(f).fill(id);
  for (const f of ['#submit-name', '#submit-name-confirm']) await page.locator(f).fill(name);
}

test('마찰 전기: 두 실험의 예상·관찰·설명을 따로 기록하고, 오가도 답이 섞이거나 사라지지 않음', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await start(page);
  await expect(page.locator('.experiment-now')).toHaveText('지금 하는 실험: 실험 1. 풍선과 털');
  await predict(page, 0, REASON);
  await expect(page.locator('#lab-now')).toHaveText('실험 1. 풍선과 털');
  await expect(page.locator('#tab-rub')).toBeHidden();
  // 관찰 중에 실험 2로 옮겼다가 돌아와도 쓰던 관찰 기록이 남아요.
  await page.locator('#observation-record').fill('털끝이 풍선 쪽으로 끌려왔어요. 쓰는 중이에요.');
  await page.locator('[data-experiment="1"]').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await expect(page.locator('#predict-title')).toContainText('숟가락');
  await expect(page.locator('#prediction-reason')).toHaveValue('');
  await page.locator('#prediction-reason').fill('같은 장갑으로 문질렀으니 서로 밀어낼 것 같아요.');
  await page.locator('[data-experiment="0"]').click();
  await expect(page.locator('#observe-panel')).toBeVisible();
  await expect(page.locator('#observation-record')).toHaveValue('털끝이 풍선 쪽으로 끌려왔어요. 쓰는 중이에요.');
  // 단계 버튼으로 예상 단계에 돌아가도 처음 예상은 그대로예요(고칠 수는 없음).
  await page.locator('[data-goto="predict"]').click();
  await expect(page.locator('#prediction-reason')).toHaveValue(REASON);
  await expect(page.locator('#prediction-reason')).toHaveJSProperty('readOnly', true);
  await expect(page.locator('[data-goto="explain"]')).toBeDisabled();
  await page.locator('[data-goto="observe"]').click();
  // 새로 고침해도 단계와 글이 남아요.
  await page.reload();
  await expect(page.locator('#observe-panel')).toBeVisible();
  await expect(page.locator('#observation-record')).toHaveValue('털끝이 풍선 쪽으로 끌려왔어요. 쓰는 중이에요.');
  await page.locator('[data-experiment="1"]').click();
  await expect(page.locator('#prediction-reason')).toHaveValue('같은 장갑으로 문질렀으니 서로 밀어낼 것 같아요.');
  expect(errors).toEqual([]);
});

test('마찰 전기: 두 실험을 모두 마치면 개념 정리·퀴즈가 나오고, 퀴즈는 결과 확인 뒤 해설을 보여 줌', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await finishBoth(page);
  await expect(page.locator('.experiment-switch button.done')).toHaveCount(2);
  const quiz = CONCEPT_QUIZZES['friction-electricity'];
  await page.locator('[data-quiz="0"][data-choice="O"]').click();
  await page.locator('[data-quiz="1"][data-choice="O"]').click();
  await expect(page.locator('#quiz-check')).toBeDisabled();
  await page.locator('[data-quiz="2"][data-choice="1"]').click();
  await expect(page.locator('#quiz-feedback-2')).not.toContainText('오답');
  await page.locator('#quiz-check').click();
  await expect(page.locator('.quiz-score')).toHaveText('총 3문항 중 1문항 정답');
  await expect(page.locator('.quiz-review li').nth(2)).toContainText('내 답: ① (+)전하를 띤다.');
  await expect(page.locator('.quiz-review li').nth(2)).toContainText('정답: ③ (−)전하를 띤다.');
  await expect(page.locator('.quiz-review li').nth(2)).toContainText(quiz[2].why['1']);
  await page.locator('#quiz-retry').click();
  await expect(page.locator('.quiz-progress')).toHaveText('0 / 3문제 골랐어요');
  expect(errors).toEqual([]);
});

test('마찰 전기: 자동 재생은 단계를 보여 주고, 일시정지하면 그 자리에서 멈춤', async ({ page }) => {
  await page.goto(URL_);
  await page.locator('#skip-review').click();
  await predict(page, 0, REASON);
  await page.locator('#auto-play').click();
  await expect(page.locator('.autoplay-steps li')).toHaveCount(5);
  await expect(page.locator('.autoplay-steps li.current')).toContainText('문지르기', { timeout: 8000 });
  await expect(page.locator('#rub-btn')).toBeDisabled();
  await page.locator('#auto-pause').click();
  await expect(page.locator('#autoplay-caption')).toContainText('일시정지');
  const at = await page.locator('#balloon').getAttribute('transform');
  await page.waitForTimeout(1200);
  expect(await page.locator('#balloon').getAttribute('transform')).toBe(at);
  await page.locator('#auto-pause').click();
  await page.locator('#auto-stop').click();
  await expect(page.locator('#auto-play')).toBeVisible();
  await expect(page.locator('#retry-btn')).toBeEnabled();
});

test('마찰 전기: 자동 재생을 끝까지 보면 관찰 체크가 채워짐(숟가락 실험)', async ({ page }) => {
  await start(page);
  await page.locator('[data-experiment="1"]').click();
  await predict(page, 1, '같은 장갑으로 문질렀으니 서로 밀어낼 것 같아요.');
  await page.locator('#auto-play').click();
  await expect(page.locator('#autoplay-caption')).toContainText('자동 재생이 끝났어요', { timeout: 20000 });
  await expect(page.locator('#to-explanation')).toBeEnabled();
  await expect(page.locator('[data-tool="glove"]')).toHaveAttribute('aria-pressed', 'true');
});

test('보고서 제출: 미리보기 → 수정하기(내용 유지) → 최종 제출, 한 건만 저장되고 새로 고침해도 제출 완료', async ({ page }) => {
  const { code, calls, rows } = await fakeServer(page);
  await finishBoth(page);
  await page.locator('#report-feedback').fill('자동 재생이 좋았어요. 글씨가 커서 읽기 편했어요.');
  await fillIdentity(page, code);
  await page.locator('#submit-report').click();
  const dialog = page.locator('.report-preview');
  await expect(dialog).toBeVisible();
  expect(calls).toHaveLength(0);
  await expect(dialog).toContainText('2학년');
  await expect(dialog).toContainText('3반');
  await expect(dialog).toContainText('15번');
  await expect(dialog).toContainText('실험 1. 풍선과 털');
  await expect(dialog).toContainText('실험 2. 숟가락과 장갑');
  await expect(dialog).toContainText('숟가락 ㉮와 ㉯는 같은 (−)전하라 척력이');
  await expect(dialog).toContainText('자동 재생이 좋았어요');
  await page.locator('#preview-edit').click();
  await expect(dialog).toBeHidden();
  expect(calls).toHaveLength(0);
  await expect(page.locator('#report-feedback')).toHaveValue('자동 재생이 좋았어요. 글씨가 커서 읽기 편했어요.');
  await expect(page.locator('#submit-name')).toHaveValue('홍길동');
  await page.locator('#submit-report').click();
  await page.locator('#preview-submit').dblclick();
  await expect(page.locator('.submit-done')).toBeVisible();
  await expect(page.locator('.submit-done')).toContainText('보고서가 정상적으로 제출되었습니다.');
  await expect(page.locator('.submit-done')).toContainText(/제출 시각: \d{4}-\d\d-\d\d \d\d:\d\d/);
  await expect(page.locator('#submit-report')).toBeDisabled();
  await expect(page.locator('#explanation-record')).toHaveJSProperty('readOnly', true);
  expect(calls).toHaveLength(1);
  expect(calls[0].sections.map(s => s.name)).toEqual(['풍선과 털', '숟가락과 장갑']);
  expect(calls[0].feedback).toBe('자동 재생이 좋았어요. 글씨가 커서 읽기 편했어요.');
  expect(calls[0]).not.toHaveProperty('quiz');
  const saved = rows();
  expect(saved).toHaveLength(1);
  expect(saved[0].slice(5, 13)).toEqual(['털끝이 풍선 쪽으로 움직일 것 같아요.', REASON, '풍선을 들어 올리니 털끝이 풍선 쪽으로 끌려왔어요.', '털의 전자가 풍선으로 옮겨 가 털은 (+), 풍선은 (−)가 되어 서로 끌어당겼어요.', '숟가락 ㉯에서 밀려날 것 같아요.', '두 숟가락을 똑같이 문질렀으니 같은 전하라서 밀어낼 것 같아요.', '숟가락 ㉯는 ㉮를 밀어냈고 장갑은 ㉮를 끌어당겼어요.', '숟가락 ㉮와 ㉯는 같은 (−)전하라 척력이, 장갑은 (+)라 인력이 작용했어요.']);
  expect(saved[0][13]).toBe('자동 재생이 좋았어요. 글씨가 커서 읽기 편했어요.');
  // 새로 고침해도 제출 완료 상태가 남고 다시 낼 수 없어요.
  await page.reload();
  await expect(page.locator('.submit-done')).toBeVisible();
  await expect(page.locator('#submit-report')).toBeDisabled();
  expect(calls).toHaveLength(1);
  // ‘처음부터’ 다시 한 새 보고서는 낼 수 있어요(새 제출 ID).
  page.once('dialog', d => d.accept());
  await page.locator('#restart-poe').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  await expect(page.locator('.submit-done')).toBeHidden();
});

test('보고서 제출: 응답을 못 받거나 서버에 닿지 못해도 답은 남고, 다시 눌러도 시트에는 한 건만 저장', async ({ page }) => {
  const { code, calls, state, rows } = await fakeServer(page);
  await finishBoth(page);
  await fillIdentity(page, code);
  await page.locator('#submit-report').click();
  // 1) 서버에 닿지 못함
  state.mode = 'down';
  await page.locator('#preview-submit').click();
  await expect(page.locator('.preview-status')).toContainText('확인하지 못했어요');
  await expect(page.locator('#preview-submit')).toBeEnabled();
  expect(rows()).toHaveLength(0);
  // 2) 저장은 됐는데 응답을 못 받음
  state.mode = 'lost';
  await page.locator('#preview-submit').click();
  await expect(page.locator('.preview-status')).toContainText('확인하지 못했어요');
  expect(rows()).toHaveLength(1);
  // 3) 다시 누르면 같은 제출 ID라 새 줄을 만들지 않고 제출 완료로 바뀜
  state.mode = 'ok';
  await page.locator('#preview-submit').click();
  await expect(page.locator('.submit-done')).toContainText('이미 제출되어 있어요');
  expect(rows()).toHaveLength(1);
  expect(new Set(calls.map(c => c.submissionId)).size).toBe(1);
  await expect(page.locator('#explanation-record')).toHaveValue('숟가락 ㉮와 ㉯는 같은 (−)전하라 척력이, 장갑은 (+)라 인력이 작용했어요.');
});

test('보고서 제출: 수업 코드가 틀리면 미리보기 안에서 알려 주고 다시 시도할 수 있음', async ({ page }) => {
  const { code, rows } = await fakeServer(page);
  await finishBoth(page);
  await fillIdentity(page, '000000');
  await page.locator('#submit-report').click();
  await page.locator('#preview-submit').click();
  await expect(page.locator('.preview-status')).toContainText('수업 코드가 맞지 않아요');
  await page.locator('#preview-edit').click();
  await page.locator('#submit-code').fill(code);
  await page.locator('#submit-report').click();
  await page.locator('#preview-submit').click();
  await expect(page.locator('.submit-done')).toBeVisible();
  expect(rows()).toHaveLength(1);
});

for (const [name, width, height] of [['PC', 1440, 1000], ['태블릿', 820, 1180], ['모바일', 390, 844]]) {
  test(`마찰 전기 화면 ${name}(${width}px): 넘침 없음, 글씨 크기, 미리보기 버튼이 화면 안에 보임`, async ({ page }) => {
    const { code } = await fakeServer(page);
    await page.setViewportSize({ width, height });
    await finishBoth(page);
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    expect(await noOverflow()).toBe(true);
    const size = sel => page.locator(sel).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(await size('.concept-sequence li')).toBeGreaterThanOrEqual(16);
    expect(await size('.writing-label')).toBeGreaterThanOrEqual(17);
    expect(await size('.mission h3')).toBeGreaterThanOrEqual(17);
    await fillIdentity(page, code);
    await page.locator('#submit-report').click();
    for (const b of ['#preview-edit', '#preview-submit']) {
      const box = await page.locator(b).boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: `/tmp/friction-preview-${width}.png` });
    await page.locator('#preview-edit').click();
    await page.locator('[data-experiment="1"]').click();
    await page.locator('[data-goto="observe"]').click();
    expect(await noOverflow()).toBe(true);
    expect(await size('#approach')).toBeGreaterThanOrEqual(16);
    expect(await size('.instruction strong')).toBeGreaterThanOrEqual(18);
    await page.screenshot({ path: `/tmp/friction-observe-${width}.png`, fullPage: true });
  });
}
