import { test, expect } from '@playwright/test';
import { beginObservation } from './poe-helpers.js';

// 교사 모드, 실험 순서 안내 가리키기, 과학 낱말 뜻 풀이(모든 실험 공통, src/poe-flow.js)
const SERIES = '/simulations/series-parallel/';
const LABS = ['friction-electricity', 'electrostatic-induction', 'electric-current', 'ohms-law', 'series-parallel', 'coil-magnetic-field', 'electric-swing', 'electric-motor', 'stellar-parallax', 'star-brightness', 'star-color', 'milky-way', 'expanding-universe'];

async function turnOnTeacher(page, password = '0421') {
  await page.locator('#teacher-btn').click();
  await expect(page.locator('#teacher-dialog')).toBeVisible();
  await page.locator('#teacher-pass').fill(password);
  await page.locator('#teacher-ok').click();
}

test('교사 모드: 첫 화면의 교사용 단추 → 비밀번호가 틀리면 켜지지 않음', async ({ page }) => {
  await page.goto(SERIES);
  await expect(page.locator('#review-panel')).toBeVisible();
  await expect(page.locator('#teacher-btn')).toHaveText('교사용');
  await turnOnTeacher(page, '1234');
  await expect(page.locator('#teacher-error')).toContainText('비밀번호가 맞지 않아요');
  await expect(page.locator('body')).not.toHaveClass(/teacher-on/);
  await page.locator('#teacher-cancel').click();
  await expect(page.locator('#teacher-dialog')).toBeHidden();
});

test('교사 모드: 복습을 건너뛰고 예상·관찰·설명을 자유롭게 오가며, 관찰 단계의 잠금이 모두 풀림', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(SERIES);
  await turnOnTeacher(page);
  await expect(page.locator('body')).toHaveClass(/teacher-on/);
  await expect(page.locator('#teacher-status')).toContainText('교사 모드');
  // 복습 화면에서 바로 관찰하기로
  await page.locator('[data-goto="observe"]').click();
  await expect(page.locator('#observe-panel')).toBeVisible();
  // 순서 잠금이 없어요: 병렬연결 탭을 바로 누를 수 있고, 안내에 자물쇠가 없어요.
  await expect(page.locator('#tab-parallel')).not.toHaveAttribute('aria-disabled', 'true');
  await page.locator('#tab-parallel').click();
  await expect(page.locator('#tab-parallel')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#step-guide li.locked')).toHaveCount(0);
  await expect(page.locator('#to-explanation')).toBeEnabled();
  // 관찰을 쓰지 않아도 설명하기로, 개념 정리도 바로 볼 수 있어요.
  await page.locator('[data-goto="explain"]').click();
  await expect(page.locator('#explain-panel')).toBeVisible();
  await expect(page.locator('#concept-review')).toBeVisible();
  await page.locator('[data-goto="predict"]').click();
  await expect(page.locator('#predict-panel')).toBeVisible();
  // 다른 실험으로 가도(같은 탭) 교사 모드가 유지돼요.
  await page.goto('/simulations/ohms-law/');
  await expect(page.locator('body')).toHaveClass(/teacher-on/);
  // 끄면 학생 모드로 돌아가요.
  await page.locator('#teacher-btn').click();
  await expect(page.locator('body')).not.toHaveClass(/teacher-on/);
  await expect(page.locator('#review-panel')).toBeVisible();
  await expect(page.locator('[data-goto="explain"]')).toHaveAttribute('aria-disabled', 'true');
});

test('순서 안내: 실험 단계를 끝내지 않고 넘어가려 하면 실험 순서 안내를 가리키고, 지금 쓸 조작에 표시', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(SERIES);
  await beginObservation(page);
  await page.locator('#to-explanation').click({ force: true });
  await expect(page.locator('.flow-toast')).toContainText('실험 순서 안내');
  await expect(page.locator('.flow-toast')).toContainText('① 전구 1개 회로의 밝기 확인하기');
  await expect(page.locator('#step-guide')).toHaveClass(/attention/);
  await expect(page.locator('#observe-panel')).toBeVisible();
  // 1단계를 하고 나서 다시 넘어가려 하면 2단계에서 쓸 ‘직렬연결’ 탭에 ‘여기부터!’ 표시가 붙어요.
  await page.locator('#close-all').click();
  await expect(page.locator('#step-guide li.current')).toContainText('② 직렬연결: 스위치 모두 닫기');
  await page.locator('[data-goto="explain"]').click({ force: true });
  await expect(page.locator('.flow-toast')).toContainText('② 직렬연결: 스위치 모두 닫기');
  await expect(page.locator('#tab-series')).toHaveClass(/step-target/);
  // 예상하기 화면에서 관찰하기를 누르면 예상을 먼저 저장하라고 알려 줘요.
  await page.goto('/simulations/ohms-law/');
  await page.locator('.review-item').first().waitFor();
  for (const item of await page.locator('.review-item').all()) await item.locator('.review-choice').first().click();
  await page.locator('#check-review').click();
  await page.locator('#finish-review').click();
  await page.locator('[data-goto="observe"]').click({ force: true });
  await expect(page.locator('.flow-toast')).toContainText('예상 저장하고 실험하기');
  await expect(page.locator('#start-observation')).toHaveClass(/step-target/);
});

test('과학 낱말: 주요 낱말을 누르면 쉬운 뜻이 나오고, 바깥을 누르거나 Esc로 닫힘', async ({ page }) => {
  await page.goto('/simulations/ohms-law/');
  const term = page.locator('#review-panel button.term').first();
  await expect(term).toBeVisible();
  const word = await term.textContent();
  await term.click();
  const pop = page.locator('.term-pop');
  await expect(pop).toBeVisible();
  await expect(pop.locator('b')).toHaveText(word);
  await expect(term).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  // 복습 보기 단추 안의 글자에는 붙이지 않아요(누르면 답을 고르는 단추라서).
  await expect(page.locator('.review-choice button.term')).toHaveCount(0);
});

test('과학 낱말: 모든 실험의 예상하기·실험 안내·개념 정리에 뜻 풀이 낱말이 있음', async ({ page }) => {
  test.setTimeout(90000); // 여러 실험을 차례로 열어 보는 시험이에요.
  for (const slug of LABS) {
    await page.goto(`/simulations/${slug}/`);
    const n = await page.evaluate(() => document.querySelectorAll('[data-experiment]').length || 1);
    await page.evaluate(([slug, n]) => {
      const done = { stage: 'explain', reached: 2, prediction: { index: 0, choice: '예상', reason: '까닭이에요 까닭이에요 까닭이에요 까닭' }, choice: null, reason: '', observation: '', saved: '관찰 기록이에요 관찰 기록이에요 관찰', observed: true, explanation: '설명이에요 설명이에요 설명이에요 설명이에요', explained: true };
      sessionStorage.setItem(`poe:${slug}`, JSON.stringify({ current: n - 1, reviewed: true, onReview: false, reviewAnswers: [], quiz: null, locked: false, exps: Array.from({ length: n }, () => done) }));
    }, [slug, n]);
    await page.reload();
    await expect(page.locator('#concept-review button.term').first(), slug).toBeVisible();
  }
});

test('설명하기: 개념 정리·퀴즈·안내 상자의 글씨가 바탕과 충분히 구별됨(명암비 4.5 이상)', async ({ page }) => {
  test.setTimeout(90000); // 여러 실험을 차례로 열어 보는 시험이에요.
  for (const slug of LABS) {
    await page.goto(`/simulations/${slug}/`);
    const n = await page.evaluate(() => document.querySelectorAll('[data-experiment]').length || 1);
    await page.evaluate(([slug, n]) => {
      const done = { stage: 'explain', reached: 2, prediction: { index: 0, choice: '예상', reason: '까닭' }, choice: null, reason: '', observation: '', saved: '관찰', observed: true, explanation: '설명', explained: true };
      sessionStorage.setItem(`poe:${slug}`, JSON.stringify({ current: n - 1, reviewed: true, onReview: false, reviewAnswers: [], quiz: null, locked: false, exps: Array.from({ length: n }, () => done) }));
    }, [slug, n]);
    await page.reload();
    const bad = await page.evaluate(() => {
      const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
      const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && e !== el) return null; const c = rgb(cs.backgroundColor); if (c.length === 4 ? c[3] > .5 : c.length === 3) return c; } return [6, 10, 24]; };
      return [...document.querySelectorAll('#concept-review *')].filter(el => el.offsetParent && !el.matches('button:disabled, button:disabled *') && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(el => {
        const bg = bgOf(el); if (!bg) return null;
        const a = lum(rgb(getComputedStyle(el).color)), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        return ratio < 4.5 ? `${ratio.toFixed(2)} ${el.className} "${el.textContent.trim().slice(0, 30)}"` : null;
      }).filter(Boolean);
    });
    expect(bad, slug).toEqual([]);
  }
});

test('순서 안내: 단계를 누르면 그 단계를 하는 방법과 눌러야 할 단추(‘▲ 여기를 눌러요’)를 알려 줌', async ({ browser }) => {
  test.setTimeout(90000); // 여러 실험을 차례로 열어 보는 시험이에요.
  const LIST = [['friction-electricity', 2, '① 털에 문지르기'], ['electrostatic-induction', 1, '가까이 가져가기'], ['electric-current', 1, '털가죽으로 접시 문지르기'], ['ohms-law', 1, '+ 1 V'], ['series-parallel', 1, '스위치 S1 닫기'], ['electric-swing', 1, '스위치 누르고 있기'], ['electric-motor', 1, '전류 흘리기'], ['coil-magnetic-field', 1, null], ['stellar-parallax', 1, '왼쪽 구멍으로 보기'], ['star-brightness', 1, '빛의 세기 기록하기'], ['star-color', 1, '전원 켜기'], ['milky-way', 1, '위에서 보기'], ['expanding-universe', 1, '공기 조금 넣기']];
  for (const [slug, count, button] of LIST) {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('motor-view', '2d'));
    const { openObserveUnlocked } = await import('./poe-helpers.js');
    await openObserveUnlocked(page, `/simulations/${slug}/`, { count, observed: false });
    await page.locator('[data-guide-step="0"]').click();
    await expect(page.locator('.flow-toast'), slug).toContainText('이렇게 해요');
    if (button) {
      const target = page.locator('.step-target');
      await expect(target, slug).toHaveCount(1);
      await expect(target, slug).toContainText(button);
      await expect(target).toHaveAttribute('data-target-label', '▲ 여기를 눌러요');
    }
    // 아직 열리지 않은 뒤 단계를 누르면 앞 단계부터 하라고 알려 줘요.
    await page.locator('[data-guide-step="1"]').click();
    await expect(page.locator('.flow-toast'), slug).toContainText('앞 단계를 마치면 열려요');
    // 마지막 ‘관찰 결과 기록하기’를 누르면 기록 칸으로 가요.
    await page.locator('[data-guide-step="final"]').click();
    await expect(page.locator('#observation-record')).toBeFocused();
    await page.close();
  }
});
