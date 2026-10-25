// 학생 글 지키기: 붙여 넣기 막기, 뜻 없는 글·바르지 않은 말 거르기.
// 같은 규칙을 apps-script/Code.gs(서버)에도 두어, 화면을 우회해 보내도 걸러요. 규칙을 바꾸면 두 곳을 함께 고쳐요.

// 붙여 넣기·끌어다 놓기를 막아요(키보드, 마우스 오른쪽 메뉴, 휴대폰 키보드 모두). 교사 모드처럼 허용할 때는 allow()가 true예요.
export function blockPaste(el, { onBlocked = () => {}, allow = () => false } = {}) {
  const stop = e => { if (allow()) return; e.preventDefault(); onBlocked(); };
  el.addEventListener('paste', stop);
  el.addEventListener('drop', stop);
  el.addEventListener('beforeinput', e => { if (/^insertFrom(Paste|Drop|PasteAsQuotation)$/.test(e.inputType)) stop(e); });
}
export const PASTE_MESSAGE = '✋ 붙여 넣기는 할 수 없어요. 내 생각을 내 말로 직접 써 주세요.';

// 바르지 않은 말(학교에서 흔한 욕설). 과학 글에 나올 수 있는 낱말(시발점, 불이 꺼져요, 영향을 미친다 등)은 걸리지 않게 골랐어요.
const BAD_WORDS = /씨발|시발(?!점)|씨팔|시팔|ㅅㅂ|ㅆㅂ|병신|븅신|ㅂㅅ|개새|새끼|좆|존나|지랄|ㅈㄹ|닥쳐|미친놈|미친년|엿\s?먹|fuck|shit|bitch/i;
export const hasBadWords = text => BAD_WORDS.test(String(text ?? ''));

// 뜻 있는 글자 수: 공백·문장 부호·자음이나 모음만 쓴 글자(ㅋㅋ, ㅠㅠ)를 빼고, 같은 글자가 이어지면 한 글자로 세요.
export function meaningfulLength(text) {
  return String(text ?? '').replace(/[\sㄱ-ㅎㅏ-ㅣ.,!?~·…'"()\-_=+*^;:/\\[\]{}<>@#$%&|]/g, '').replace(/(.)\1+/gu, '$1').length;
}
// 같은 말을 되풀이한 글인지(예: ‘가나다가나다가나다…’): 서로 다른 두 글자 묶음이 너무 적으면 되풀이예요.
function repetitive(text) {
  const s = String(text ?? '').replace(/\s/g, '');
  if (s.length < 12) return false;
  const pairs = new Set();
  for (let i = 0; i < s.length - 1; i++) pairs.add(s.slice(i, i + 2));
  return pairs.size / (s.length - 1) < .35;
}
const same = (a, b) => { const k = t => String(t ?? '').replace(/\s/g, ''); return k(a) !== '' && k(a) === k(b); };

// 글을 살펴 고칠 점이 있으면 안내 글을, 괜찮으면 ''를 돌려줘요.
// min: 뜻 있는 글자 수의 최소, others: 같은 글이면 안 되는 다른 칸의 글들.
export function writingProblem(text, { min = 0, others = [] } = {}) {
  if (hasBadWords(text)) return '바르지 않은 말이 있어요. 바른 말로 고쳐 써 주세요.';
  if (!min) return '';
  if (meaningfulLength(text) < min || repetitive(text)) return `같은 글자를 되풀이하거나 ‘ㅋㅋ’ 같은 글자는 세지 않아요. 내 생각을 뜻이 통하는 문장으로 ${min}자 이상 써 주세요.`;
  if (others.some(o => same(text, o))) return '앞에서 쓴 글과 똑같아요. 이 칸의 질문에 맞게 새로 써 주세요.';
  return '';
}
