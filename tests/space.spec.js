import { test, expect } from '@playwright/test';
import { loadAppsScript } from '../apps-script/fake-google.js';
import { SUBMIT_URL } from '../src/submission-config.js';
import { CONCEPT_QUIZZES } from '../src/concept-quizzes.js';
import { beginObservation, openObserveUnlocked } from './poe-helpers.js';

// VIII. 별과 우주: 다섯 실험의 학습 흐름, 실험 순서, 과학 내용, 모바일 화면, 보고서 제출을 확인해요.
// 움직임 줄이기(reduced motion)를 켜면 애니메이션이 바로 끝나서 빠르게 시험할 수 있어요.
const setRange = (page, sel, v) => page.locator(sel).evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);

const LABS = [
  ['stellar-parallax', '연주 시차', 'poe', async page => {
    for (const id of ['a', 'b']) { await page.locator(`[data-model="${id}"]`).click(); await page.locator('[data-hole="left"]').click(); await page.locator('[data-hole="right"]').click(); }
    await page.locator('#measure').click(); await expect(page.locator('#readout')).toContainText('약 19°');
    await page.locator('[data-model="a"]').click(); await page.locator('#measure').click(); await expect(page.locator('#readout')).toContainText('약 37°');
    await page.locator('#tab-orbit').click(); await page.locator('#orbit-play').click(); await expect(page.locator('#readout')).toContainText('크다');
    await page.locator('[data-annual="X"]').click(); await page.locator('[data-annual="Y"]').click();
    await page.locator('#tab-stars').click();
    for (const s of ['proxima', 'sirius', 'polaris']) await page.locator(`[data-star="${s}"]`).click();
  }],
  ['star-brightness', '절대 등급', 'poe', async page => {
    for (const d of [20, 40, 60, 80]) { await page.locator(`[data-d="${d}"]`).click(); await page.locator('#record-lux').click(); }
    await page.locator('[data-tool="paper"]').click(); await page.waitForTimeout(900);
    await page.locator('[data-d="40"]').click(); await page.waitForTimeout(900);
    await page.locator('#tab-mag').click();
    for (const m of [1, 2, 2, 6]) await page.locator(`[data-mag="${m}"]`).click();
    await page.locator('#tab-abs').click(); await page.locator('#to-10pc').click();
  }],
  ['star-color', '표면 온도', 'poe', async page => {
    await page.locator('#heater-btn').click(); await expect(page.locator('#readout')).toContainText('붉은색 → 주황·노란색');
    await setRange(page, '#temp', 0); await setRange(page, '#temp', 1000);
    await page.locator('#tab-stars').click();
    for (const s of ['rigel', 'spica', 'vega', 'aldebaran', 'betelgeuse', 'antares']) await page.locator(`[data-star="${s}"]`).click();
    for (const s of ['rigel', 'aldebaran', 'betelgeuse']) { await page.locator(`[data-star="${s}"]`).click(); await page.locator('#measure-color').click(); await expect(page.locator('#readout')).toContainText(/빛/); await expect(page.locator('#star-info')).toContainText('사진 속 별빛:'); }
    await page.locator('#tab-sky').click();
    await page.locator('[data-sky-star="antares"]').click(); await page.locator('[data-sky-star="dschubba"]').click();
    await page.locator('[data-photo-pick="jewel"]').click();
  }],
  ['milky-way', '우리은하', 'generative', async page => {
    for (const v of ['top', 'side', 'sun']) await page.locator(`[data-gview="${v}"]`).click();
    await page.locator('#tab-band').click(); await page.locator('[data-band="center"]').click(); await page.locator('[data-band="anti"]').click();
    await page.locator('#tab-objects').click();
    for (const [i, kind] of ['open', 'globular', 'emission', 'reflection', 'dark'].entries()) {
      if (i) await page.locator('#obj-next').click();
      await page.locator(`[data-kind="${kind}"]`).click();
    }
  }],
  ['expanding-universe', '우주 팽창', 'far', async page => {
    await page.locator('#inflate-little').click(); await expect(page.locator('#measure-tape')).toBeEnabled(); await page.locator('#measure-tape').click();
    await expect(page.locator('#inflate-more')).toBeEnabled(); await page.locator('#inflate-more').click();
    await expect(page.locator('#measure-tape')).toBeEnabled(); await page.locator('#measure-tape').click();
    await expect(page.locator('#inflate-little')).toBeDisabled();
    await page.locator('#tab-center').click();
    for (const r of [0, 1]) { await page.locator(`[data-ref="${r}"]`).click(); await page.locator('#expand').click(); await expect(page.locator('#expand')).toBeEnabled(); }
    await page.locator('#tab-time').click(); await page.locator('#time-play').click(); await expect(page.locator('#time-play')).toBeEnabled();
    await page.locator('#tab-analogy').click();
    for (const i of [0, 1, 2]) { await page.locator(`[data-match-model="${i}"]`).click(); await page.locator(`[data-match-real="${i}"]`).click(); }
    for (const [i, v] of [[0, false], [1, true], [2, false]]) await page.locator(`[data-ox="${i}"][data-val="${v}"]`).click();
  }],
];

async function answerQuiz(page, slug) {
  for (const [n, q] of CONCEPT_QUIZZES[slug].entries()) await page.locator(`[data-quiz="${n}"][data-choice="${q.answer}"]`).click();
  await page.locator('#quiz-check').click();
  await expect(page.locator('.quiz-score')).toContainText('총 5문항 중 5문항 정답');
}

for (const [slug, concept, model, run] of LABS) {
  test(`별과 우주 ${slug}: 복습 → 생각 → 탐구(순서대로) → 설명 → 개념 정리`, async ({ page }) => {
    test.setTimeout(60000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/simulations/${slug}/`);
    await expect(page.locator('body')).toHaveClass(/lab-space/);
    await expect(page.locator('.breadcrumb')).toContainText('VIII. 별과 우주');
    await expect(page.locator('header .brand')).toHaveAttribute('href', '../../grades/middle-school-2/unit-8/');
    if (model === 'poe') await expect(page.locator('.model-badge')).toHaveCount(0);
    else await expect(page.locator('.model-badge')).toContainText(model === 'far' ? '비유를 활용한 수업 모형' : '발생 학습 모형');
    await beginObservation(page);
    await expect(page.locator('#to-explanation')).toHaveAttribute('aria-disabled', 'true');
    // 실험 순서 안내: 마지막 단계의 조작은 앞 단계를 마치기 전에는 잠겨 있어요.
    await expect(page.locator('#step-guide li.locked').first()).toBeVisible();
    await run(page);
    await expect(page.locator('#to-explanation'), await page.locator('#observation-progress').textContent()).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });
    await page.locator('#observation-record').fill('탐구하며 관찰한 내용을 빠짐없이 자세하게 적어 보았어요.');
    await page.locator('#to-explanation').click();
    await page.locator('#explanation-record').fill('관찰한 결과의 까닭을 과학 개념으로 설명해 보았어요. 거리와 밝기, 색을 비교했어요.');
    await page.locator('#reveal-concepts').click();
    await expect(page.locator('#concept-review')).toContainText(concept);
    await answerQuiz(page, slug);
    expect(errors).toEqual([]);
  });
  test(`별과 우주 ${slug}: 휴대폰 화면에서 넘치지 않음`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/simulations/${slug}/`); await beginObservation(page);
    await expect(page.locator('#scene')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('연주 시차: 지구가 6개월 공전하면 가까운 별 X가 먼 별 Y보다 많이 움직이고, 공전하지 않으면 그대로', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openObserveUnlocked(page, '/simulations/stellar-parallax/');
  await page.locator('#tab-orbit').click();
  await expect(page.locator('#inset-sky')).toHaveAttribute('data-ready', /.+/, { timeout: 15000 });
  const pos = async id => (await page.locator(`#inset-${id}`).getAttribute('transform')).match(/[-\d.]+/g).map(Number);
  const [xA, yA] = [await pos('x'), await pos('y')];
  await page.locator('#orbit-play').click(); await expect(page.locator('#orbit-play')).toContainText('B → A');
  const [xB, yB] = [await pos('x'), await pos('y')];
  expect(xB[0] - xA[0]).toBeGreaterThan(1.6 * (yB[0] - yA[0]));
  expect(yB[0] - yA[0]).toBeGreaterThan(10);
  // 지구가 공전하지 않는다면?
  await page.locator('#no-orbit').check();
  const x0 = await pos('x');
  await page.locator('#orbit-play').click(); await page.waitForTimeout(200);
  expect(await pos('x')).toEqual(x0);
  // 실제 별: 100 pc보다 먼 별은 연주 시차가 너무 작아 재기 어려워요.
  await page.locator('#tab-stars').click(); await page.locator('[data-star="betelgeuse"]').click();
  await expect(page.locator('#star-card')).toContainText('100 pc보다 멀어');
  await page.locator('[data-star="proxima"]').click();
  await expect(page.locator('#star-card')).toContainText('약 4.2 광년');
  await expect(page.locator('#star-card')).toContainText('0.77″');
});

test('별의 밝기: 거리 2배면 빛의 세기 1/4, 1등급과 6등급은 100배, 10 pc로 옮기면 미르잠이 더 밝음', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openObserveUnlocked(page, '/simulations/star-brightness/');
  for (const d of [20, 40]) { await page.locator(`[data-d="${d}"]`).click(); await page.locator('#record-lux').click(); }
  await expect(page.locator('#readout')).toContainText('720');
  await expect(page.locator('#readout')).toContainText('180');
  await page.locator('#tab-mag').click();
  for (const m of [1, 6]) await page.locator(`[data-mag="${m}"]`).click();
  await expect(page.locator('#compare')).toContainText('약 100배');
  await page.locator('[data-mag="6"]').click(); await page.locator('[data-mag="2"]').click();
  await expect(page.locator('#compare')).toContainText('약 2.5배');
  await page.locator('#tab-abs').click();
  await expect(page.locator('#abs-stars')).toContainText('시리우스 −1.5등급');
  await expect(page.locator('#abs-stars')).toContainText('미르잠 2.0등급');
  await page.locator('#to-10pc').click();
  await expect(page.locator('#abs-stars')).toContainText('시리우스 1.4등급');
  await expect(page.locator('#abs-stars')).toContainText('미르잠 −4.1등급');
  await expect(page.locator('#abs-stars')).toContainText('태양 4.8등급');
  await expect(page.locator('#readout')).toContainText('멀다');
});

test('별의 색: 낮은 온도는 적색, 높은 온도는 청색이고 빛의 양 그래프도 그쪽으로 기울어짐', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openObserveUnlocked(page, '/simulations/star-color/');
  await setRange(page, '#temp', 0); await page.waitForTimeout(100);
  await expect(page.locator('#ball-class')).toHaveText('적색을 띠어요');
  await expect(page.locator('#spec-read')).toHaveText('붉은색 빛을 더 많이 내요');
  await setRange(page, '#temp', 1000); await page.waitForTimeout(100);
  await expect(page.locator('#ball-class')).toHaveText('청색을 띠어요');
  await expect(page.locator('#spec-read')).toHaveText('파란색 빛을 더 많이 내요');
  await page.locator('#tab-stars').click(); await page.locator('[data-star="sun"]').click();
  await expect(page.locator('#star-info')).toContainText('약 6000 ℃');
  await expect(page.locator('#star-info')).toContainText('황색');
});

test('별의 색: 실제 별 사진을 관측하고 별빛 색을 재며, 베텔게우스·안타레스는 표면까지 확대', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openObserveUnlocked(page, '/simulations/star-color/');
  await page.locator('#tab-stars').click();
  const tint = async star => { await page.locator(`[data-star="${star}"]`).click(); await page.locator('#measure-color').click(); await expect(page.locator('#star-info')).toContainText('사진 속 별빛:'); return page.locator('#star-info').textContent(); };
  for (const s of ['rigel', 'spica', 'vega']) expect(await tint(s)).toContain('푸른빛');
  for (const s of ['betelgeuse', 'aldebaran', 'arcturus', 'antares']) expect(await tint(s)).toContain('붉은빛');
  // 실제 사진은 파일이 있고 화면에 나와요.
  const href = await page.locator('#obs image').first().getAttribute('href');
  expect((await page.request.get(href)).status()).toBe(200);
  await expect(page.locator('#close-title')).toHaveText('실제 사진 · 안타레스');
  await page.locator('#surface-btn').click();
  await expect(page.locator('#close-title')).toHaveText('안타레스의 표면(초대형 망원경)');
  await expect(page.locator('#star-info')).toContainText('ESO/K. Ohnaka');
  // 실제 사진이 없는 별은 관측 자료로 그려요. 태양 사진은 색을 입힌 사진이라 색을 재지 않아요.
  await page.locator('[data-star="naos"]').click();
  await expect(page.locator('#close-title')).toHaveText('관측 자료로 그린 나오스');
  await page.locator('[data-star="sun"]').click();
  await expect(page.locator('#measure-color')).toBeDisabled();
  // 별자리 사진: 오리온자리를 크게 보면 베텔게우스와 리겔 이름표가 붙어요.
  await page.locator('#tab-sky').click();
  await page.locator('[data-photo-pick="orionWide"]').click();
  await expect(page.locator('#photos')).toContainText('베텔게우스');
  await expect(page.locator('#photos')).toContainText('리겔');
});

test('우리은하: 사진을 잘못 분류하면 힌트를 주고, 성단·성운의 특징을 알려 줌', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openObserveUnlocked(page, '/simulations/milky-way/');
  await page.locator('#tab-objects').click();
  await expect(page.locator('#obj-card')).toContainText('플레이아데스 성단');
  await page.locator('[data-kind="globular"]').click();
  await expect(page.locator('#obj-card')).toContainText('다시 생각해 봐요');
  await page.locator('[data-kind="open"]').click();
  await expect(page.locator('#obj-card')).toContainText('파란색을 띠는 고온의 별이 많아요');
  await page.locator('[data-obj="1"]').click(); await page.locator('[data-kind="globular"]').click();
  await expect(page.locator('#obj-card')).toContainText('구상 성단');
});

test('우주 팽창: 풍선을 더 불면 모든 붙임딱지 사이가 멀어지고, 붙임딱지 크기는 그대로', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('balloon-view', '2d'));
  await openObserveUnlocked(page, '/simulations/expanding-universe/');
  const stickerSize = () => page.locator('#balloon2d-g circle[r="17"]').count();
  await page.locator('#inflate-little').click(); await expect(page.locator('#measure-tape')).toBeEnabled(); await page.locator('#measure-tape').click();
  await expect(page.locator('#inflate-more')).toBeEnabled();
  expect(await stickerSize()).toBe(3);
  const read = async () => page.locator('#tape-table .table-num.on').allTextContents();
  const little = (await read()).map(Number);
  await page.locator('#inflate-more').click(); await expect(page.locator('#measure-tape')).toBeEnabled(); await page.locator('#measure-tape').click();
  await expect(page.locator('#tape-table .table-num.on')).toHaveCount(6);
  const all = (await read()).map(Number), much = [all[1], all[3], all[5]], small = [all[0], all[2], all[4]];
  expect(small).toEqual(little);
  for (let i = 0; i < 3; i++) expect(much[i]).toBeGreaterThan(small[i]);
  expect(await stickerSize()).toBe(3); // 붙임딱지(은하)는 커지지 않아요.
});

test('보고서 제출: 발생 학습 모형 실험은 모형에 맞는 칸 이름으로 선생님 시트에 모임', async ({ page }) => {
  const server = loadAppsScript(); server.context.setup();
  const code = server.ss.getSheetByName('설정').rows[1][1];
  const calls = [];
  await page.route(SUBMIT_URL, async route => {
    const body = route.request().postData(); calls.push(JSON.parse(body));
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(server.post(body)) });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/simulations/milky-way/');
  await beginObservation(page);
  await LABS[3][3](page);
  await page.locator('#observation-record').fill('위에서 보면 막대와 나선팔, 옆에서 보면 볼록한 원반이었어요.');
  await page.locator('#to-explanation').click();
  await page.locator('#explanation-record').fill('우리가 원반 안에 있어서 원반 방향으로 별이 겹쳐 띠로 보여요.');
  await page.locator('#reveal-concepts').click();
  await answerQuiz(page, 'milky-way');
  await page.locator('#submit-code').fill(code);
  for (const f of ['#submit-id', '#submit-id-confirm']) await page.locator(f).fill('20315');
  for (const f of ['#submit-name', '#submit-name-confirm']) await page.locator(f).fill('홍길동');
  await page.locator('#submit-report').click();
  await expect(page.locator('.report-preview')).toContainText('처음 생각');
  await page.locator('#preview-submit').click();
  await expect(page.locator('.submit-done')).toBeVisible();
  expect(calls[0].model).toBe('generative');
  expect(calls[0].title).toBe('우리은하와 천체');
  expect(calls[0].fieldLabels.observation).toBe('탐구 기록');
  const sheet = server.ss.getSheetByName('우리은하와 천체');
  expect(sheet.rows.slice(0, 3).flat().join(' ')).toContain('처음 생각');
});

test('8단원 폴더: 실험 5개가 열리고 실제 천체 사진이 보임', async ({ page }) => {
  await page.goto('/grades/middle-school-2/unit-8/');
  await expect(page.locator('.available')).toHaveText('실험 5개');
  await expect(page.locator('.active-folder')).toHaveCount(5);
  for (const img of await page.locator('.experiment-art img').all()) expect(await img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  await page.getByRole('link', { name: '우주 팽창 탐구 열기' }).click();
  await expect(page).toHaveURL(/\/simulations\/expanding-universe\/$/);
});
