// 학생 글 지키기: 붙여 넣기 막기, 뜻 없는 글·바르지 않은 말 거르기.
// 같은 규칙을 apps-script/Code.gs(서버)에도 두어, 화면을 우회해 보내도 걸러요. 규칙을 바꾸면 두 곳을 함께 고쳐요.

// 붙여 넣기·끌어다 놓기를 막아요(키보드, 마우스 오른쪽 메뉴, 휴대폰 키보드 모두). 교사 모드처럼 허용할 때는 allow()가 true예요.
export function blockPaste(el, { onBlocked = () => {}, allow = () => false } = {}) {
  const stop = e => { if (allow()) return; e.preventDefault(); onBlocked(); };
  el.addEventListener('paste', stop);
  el.addEventListener('drop', stop);
  el.addEventListener('beforeinput', e => { if (/^insertFrom(Paste|Drop|PasteAsQuotation)$/.test(e.inputType)) stop(e); });
}
export const PASTE_MESSAGE = '붙여 넣기는 할 수 없어요. 내 생각을 내 말로 직접 써 주세요.';

// 바르지 않은 말(학교에서 흔한 욕설). 과학 글에 나올 수 있는 낱말(시발점, 불이 꺼져요, 영향을 미친다 등)은 걸리지 않게 골랐어요.
const BAD_WORDS = /씨발|시발(?!점)|씨팔|시팔|ㅅㅂ|ㅆㅂ|병신|븅신|ㅂㅅ|개새|새끼|좆|존나|지랄|ㅈㄹ|닥쳐|미친놈|미친년|엿\s?먹|fuck|shit|bitch/i;
export const hasBadWords = text => BAD_WORDS.test(String(text ?? ''));

// 뜻 있는 글자 수: 글자(한글·영어)와 숫자, 동그라미 글자(㉮, ㉯, ①)만 세요. 공백·문장 부호·자음이나 모음만 쓴 글자(ㅋㅋ, ㅠㅠ)는 세지 않아요.
// 같은 글자가 세 번 이상 이어질 때만(‘아아아아’) 한 글자로 세요. ‘점점’, ‘쭉쭉’, ‘1000’처럼 보통 문장에 나오는 글자는 그대로 세요.
// 글자 수 안내(✓ 좋아요)와 저장·제출 검사가 모두 이 수를 써서, 안내와 검사가 어긋나지 않아요.
export function meaningfulLength(text) {
  return String(text ?? '').replace(/[^\p{L}\p{N}\u2460-\u24ff\u3200-\u32ff]/gu, '').replace(/[ㄱ-ㅎㅏ-ㅣ]/g, '').replace(/(\D)\1{2,}/gu, '$1').length;
}
// 같은 말을 되풀이한 글인지 살펴요. 글자와 숫자만 보고 살펴요(공백·문장 부호는 빼요).
// repeatedText는 apps-script/Code.gs의 repeatedText_와 똑같아야 해요(src/text-guard.test.js가 확인해요).
const repetitive = text => repeatedText(String(text ?? '').replace(/[^\p{L}\p{N}\u2460-\u24ff\u3200-\u32ff]/gu, ''));
function repeatedText(s) {
  if (s.length < 12) return false;
  // ① 서로 다른 글자가 너무 적어요(예: ‘모르겟어여모르겟어요…’는 7가지 글자뿐이에요).
  if (new Set(s).size < 8) return true;
  // ② 서로 다른 두 글자 묶음이 너무 적어요(예: ‘가나다가나다가나다…’).
  const pairs = new Set();
  for (let i = 0; i < s.length - 1; i++) pairs.add(s.slice(i, i + 2));
  if (pairs.size / (s.length - 1) < 0.3) return true;
  // ③ 같은 말 덩어리가 글의 많은 부분을 차지해요. 오타를 섞어 되풀이해도(모르겟어여·모르겟어요·모르겟아여) 같은 덩어리(모르겟)가 남아요.
  //    2~4글자 덩어리가 세 번 이상 나와 글의 45% 이상이면 되풀이예요.
  //    5~10글자 덩어리(문장 조각)는 두 번 이상 나오고, 그 덩어리를 빼면 남는 글이 30%도 안 될 때만 되풀이예요.
  //    (측정값을 나열한 글은 ‘일 때 빛의 세기는’처럼 문장 틀이 되풀이되어도 사이사이 값이 남아서 막지 않아요.)
  for (let k = 2; k <= 10; k++) {
    const seen = new Set();
    for (let i = 0; i + k <= s.length; i++) {
      const unit = s.slice(i, i + k);
      if (seen.has(unit)) continue;
      seen.add(unit);
      const count = s.split(unit).length - 1;
      if (k <= 4 ? count >= 3 && count * k >= s.length * 0.45 : count >= 2 && s.length - count * k < s.length * 0.3) return true;
    }
  }
  return false;
}
const same = (a, b) => { const k = t => String(t ?? '').replace(/\s/g, ''); return k(a) !== '' && k(a) === k(b); };

// 문장 틀(src/supports.js의 frame, 글 칸 아래 ‘도움 받기’): 빈칸(___)이 남아 있으면 저장하지 않아요.
// 틀에 미리 적힌 말은 학생이 쓴 말이 아니므로, 틀의 말을 뺀 ‘내가 쓴 글자 수’(ownLength)가 FRAME_OWN_MIN자 이상이어야 해요.
export const FRAME_OWN_MIN = 10;
export const hasBlank = text => /_{2,}/.test(String(text ?? ''));
export function ownLength(text, frame) {
  let rest = String(text ?? '');
  for (const piece of String(frame ?? '').split(/_{2,}/).map(p => p.trim()).filter(Boolean)) rest = rest.replace(piece, ' ');
  return meaningfulLength(rest);
}

// 글을 살펴 고칠 점이 있으면 안내 글을, 괜찮으면 ''를 돌려줘요.
// min: 뜻 있는 글자 수의 최소, others: 같은 글이면 안 되는 다른 칸의 글들, frame: 이 칸의 문장 틀(있으면).
export function writingProblem(text, { min = 0, others = [], frame = '' } = {}) {
  if (hasBadWords(text)) return '바르지 않은 말이 있어요. 바른 말로 고쳐 써 주세요.';
  if (!min) return '';
  if (hasBlank(text)) return '문장 틀의 빈칸(___)을 내 말로 채워 주세요.';
  const n = meaningfulLength(text);
  if (n < min) return `내 생각을 ${min}자 이상 써 주세요. (지금 ${n}자 · 공백과 문장 부호, ‘ㅋㅋ’ 같은 글자는 세지 않아요)`;
  const own = frame ? ownLength(text, frame) : n;
  if (frame && own < FRAME_OWN_MIN) return `문장 틀의 빈칸을 내 말로 더 채워 주세요. (틀에 있던 말을 빼고 내가 쓴 글자 ${own}자 · ${FRAME_OWN_MIN}자 이상)`;
  if (repetitive(text)) return '같은 말을 여러 번 되풀이했어요. 내 생각을 뜻이 통하는 문장으로 써 주세요.';
  if (others.some(o => same(text, o))) return '앞에서 쓴 글과 똑같아요. 이 칸의 질문에 맞게 새로 써 주세요.';
  return '';
}
