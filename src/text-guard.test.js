import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { writingProblem, meaningfulLength, hasBadWords, junkProblem, MIN_CHARS } from './text-guard.js';

test('글 거르기: 뜻 없는 글(ㅋㅋ, 같은 글자·같은 말 되풀이)은 막고, 보통 문장은 받아요', () => {
  for (const t of ['ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', 'ㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹ', '가나다가나다가나다가나다가나다가나다가나다', '아아아아아아아아아아아아아아아아아아아아아아', '. . . . . . . . . . . . . . . . . . . . .']) {
    assert.notEqual(writingProblem(t, { min: MIN_CHARS }), '', t);
  }
  for (const t of ['전압을 높일수록 전류계의 값이 커졌어요. 전압이 2배가 되면 전류도 2배가 됐어요.', '가까운 별일수록 6개월 뒤에 보이는 위치가 많이 달라져서 연주 시차가 커요.']) {
    assert.equal(writingProblem(t, { min: MIN_CHARS }), '', t);
  }
  assert.ok(meaningfulLength('ㅋㅋ 전류가 흘러요!!!') < 10);
});

test('글 거르기: 학생이 흔히 쓰는 보통 문장(겹친 글자, 숫자, 문장 부호, 측정값 나열)은 막지 않아요', () => {
  for (const t of [
    '점점 밝아졌어요. 1000 lx에서 250 lx로 줄었어요.',
    '털끝이 풍선 쪽으로 끌려 올라갔어요!! 정말 신기했어요.',
    '바늘이 빙글빙글 돌았어요. 전류를 세게 하니 쭉쭉 더 잘 돌았어요.',
    '(가)는 2칸, (나)는 1칸 움직여서 (가)의 시차가 더 커요.',
    '전압이 1 V일 때 전류는 0.1 A였고, 전압이 2 V일 때 전류는 0.2 A였고, 전압이 3 V일 때 전류는 0.3 A였고, 전압이 4 V일 때 전류는 0.4 A였어요.',
    '20 cm일 때 빛의 세기는 1000 lx, 40 cm일 때 빛의 세기는 250 lx, 60 cm일 때 빛의 세기는 111 lx, 80 cm일 때 빛의 세기는 63 lx였어요.',
  ]) assert.equal(writingProblem(t, { min: MIN_CHARS }), '', t);
  // 글자 수는 글자와 숫자만 세요. 겹친 두 글자(점점)와 숫자(1000)는 그대로 세요.
  assert.equal(meaningfulLength('점점 1000!!'), 6);
  // 따로 떨어진 ‘아아아아’, ‘음’, ‘그냥’ 같은 군말은 세지 않아요.
  assert.equal(meaningfulLength('아아아아아 좋아요'), 3);
  assert.equal(meaningfulLength('㉮와 ㉯, ①'), 4);
});

test('글 거르기: 같은 말을 오타를 섞어 되풀이한 글도 막아요', () => {
  for (const t of [
    '모르겟어여모르겟어요모르겟아여모르겟어요',
    '모르겠어요 모르겠어요 모르겠어요 모르겠어요',
    '몰라요몰라요진짜몰라요진짜진짜몰라',
    '잘모르겠다잘모르겟다잘모르겠당잘모르것다',
    '하기싫어요하기싫어요하기실어요하기싫어',
    '아무거나아무거나아무거나쓰기 아무거나',
    '가나다라마바사가나다라마바사아자차',
    'asdfasdfasdfqwerqwer',
    '전류전류전류전류전류전류전류',
  ]) assert.match(writingProblem(t, { min: MIN_CHARS }), /되풀이|15자 이상|같은 글자를 이어서|자판|차례대로/, t);
});

test('글 거르기: 교과서·실험 화면의 문장(15자 이상)은 되풀이로 걸리지 않아요', () => {
  const files = [...readdirSync('.').filter(f => f.endsWith('.js')), ...readdirSync('src').filter(f => f.endsWith('.js') && !f.includes('test')).map(f => `src/${f}`)];
  const sentences = files.flatMap(f => [...readFileSync(f, 'utf8').matchAll(/'([^'\n]{25,})'/g)].map(m => m[1].replace(/<[^>]+>/g, '')).filter(t => /[가-힣]{6}/.test(t) && /\s/.test(t) && !/[{}$]/.test(t)));
  assert.ok(sentences.length > 50);
  for (const t of sentences) if (meaningfulLength(t) >= MIN_CHARS) assert.equal(writingProblem(t, { min: MIN_CHARS }), '', t);
});

test('글 거르기: 짧은 글은 몇 자인지, 되풀이한 글은 되풀이라고 따로 알려 줘요', () => {
  assert.match(writingProblem('전류가 흘러요.', { min: MIN_CHARS }), /15자 이상.*지금 6자/);
  assert.match(writingProblem('가나다가나다가나다가나다가나다가나다가나다', { min: MIN_CHARS }), /되풀이/);
});

test('글 거르기: 앞 칸과 똑같은 글은 막아요', () => {
  const reason = '전압이 커지면 전류도 커질 것 같아요. 펌프가 세면 물도 세게 흐르니까요.';
  assert.match(writingProblem(reason, { min: 20, others: [reason] }), /똑같아요/);
  assert.equal(writingProblem(`${reason} 실제로 해 보니 그랬어요.`, { min: 20, others: [reason] }), '');
});

test('바르지 않은 말: 흔한 욕설은 막고, 과학 글의 낱말(시발점, 불이 꺼져요, 영향을 미친다)은 받아요', () => {
  for (const t of ['존나 신기함', '씨발', 'ㅅㅂ 어려워', '병신', '지랄', 'fuck']) assert.ok(hasBadWords(t), t);
  for (const t of ['전류의 시발점은 전지예요.', '스위치를 열면 불이 꺼져요.', '거리가 밝기에 영향을 미친다.', '새로운 별을 찾았어요.']) assert.ok(!hasBadWords(t), t);
});

test('화면(src/text-guard.js)과 선생님 시트(apps-script/Code.gs)의 거르기 규칙이 같음', () => {
  const client = readFileSync(new URL('./text-guard.js', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  const bad = src => src.match(/BAD_WORDS_? = (\/.*\/i);/)[1];
  assert.equal(bad(server), bad(client));
  const count = src => src.match(/function meaningfulLength_?\(text\) \{\n\s*return String\(text[^)]*\)(.*)\.length;/)[1];
  assert.equal(count(server), count(client));
  const body = src => src.match(/function repeatedText_?\(s\) \{\n([\s\S]*?)\n\}/)[1];
  assert.equal(body(server), body(client));
});

// 교사 의견(2026년 10월): 아래처럼 쓴 글이 제출되었어요. 모두 막아야 해요.
const TEACHER_EXAMPLES = [
  '잘모루겟야요잘묘루겟어요잫모르ㅛ세ㅛ러료잫모수게ㅛ어려',
  '[네온전구 켜기] 잘모루갯어요절모루개ㅛ어요잘모흐겟러젛노루세료\n[전기 회로와 수로 모형] 잫노루갯어여잫모루갯어려젓모르겟어료맣저루로',
  '닿노루개ㅛ어료잫노흐게ㅛ러요ㅡ덯노르ㅛㅔㅇ려닿노후세ㅛ료',
  '그냥 잠깐 불이 켜졌다가 꺼질것 같습니당다가가',
  '펌프와 전지를 잘 연결을 해야할것 같습니다다다수구 잚ㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁ모르겟어요',
];

test('뜻 없는 글: 교사가 보내 준 예시(자음·모음 섞기, 잘 쓰지 않는 글자, 문장 뒤 덧붙이기)는 모두 막아요', () => {
  for (const t of TEACHER_EXAMPLES) assert.notEqual(writingProblem(t, { min: MIN_CHARS }), '', t);
  assert.match(writingProblem(TEACHER_EXAMPLES[0], { min: MIN_CHARS }), /자음이나 모음만/);
  assert.match(writingProblem(TEACHER_EXAMPLES[3], { min: MIN_CHARS }), /문장이 끝난 뒤/);
  // 자음·모음을 지워도 잘 쓰지 않는 글자(잫, 젛, 덯)가 남으면 막아요.
  assert.match(writingProblem('잘모루겟야요잘묘루겟어요잫모르세러료잫모수게어려', { min: MIN_CHARS }), /‘잫’처럼 잘 쓰지 않는 글자/);
  // 잘 쓰는 글자로만 마구 쳐도 ‘모르겠어요’ 오타는 글자 수에 세지 않아요.
  assert.match(writingProblem('잘모루갯어요절모루개어요잘모흐겟러노루세료', { min: MIN_CHARS }), /15자 이상/);
  assert.match(writingProblem('모르겠어요 그냥 모르겠어요 진짜 모르겠어요 몰라요', { min: MIN_CHARS }), /15자 이상/);
  // 영어로 쓴 ‘모르겠어요’도 글자 수에 세지 않아요(학생 의견).
  for (const t of ["i don't know what happened here", 'moreugesseoyo jal moreugesseoyo', 'I dont know. No idea. Not sure at all', '잘 몰라요 i dont know 그냥 모르겠어요'])
    assert.match(writingProblem(t, { min: MIN_CHARS }), /15자 이상|우리말/, t);
  assert.match(writingProblem('결과가 됬어요. 전구에 불이 켜졌다가 꺼졌어요.', { min: MIN_CHARS }), /‘됬’은 ‘됐’/);
  for (const t of ['아무거나 쓰면 되죠 ㅋㅋㅋ 전구가 켜졌다가 꺼졌어요', '전구가 켜졌다가 꺼졌어요ㅠㅠ 신기했어요 정말로요', '전구가 켜졌다가 꺼졌어요 하하하하 신기했어요 정말로', 'dkssudgktpdy 전구가 켜졌다가 꺼졌어요 신기해요', 'asdf 전구가 켜졌다가 꺼졌어요 신기했어요 정말']) {
    assert.notEqual(writingProblem(t, { min: MIN_CHARS }), '', t);
  }
});

test('뜻 없는 글: 학생이 쓰는 보통 문장(모르겠지만, ㄱ자, 단위, 습니다만, 띄어쓰기 없는 문장)은 막지 않아요', () => {
  for (const t of [
    '불이 켜졌다가 바로 꺼졌어요. 접시의 전하가 네온전구를 지나 이동했기 때문인 것 같아요.',
    '왜 그런지 잘 모르겠지만 피스톤을 밀었더니 압력이 2배로 커졌어요. 신기했어요.',
    'ㄱ자 유리관처럼 꺾인 관에서도 기체가 이동했어요. 온도가 높을수록 부피가 커졌어요.',
    '30 mL에서 1 기압, 15 mL에서 2 기압이었어요. CNG 버스도 같은 원리라고 생각해요.',
    '실험해 보니 예상과 같았습니다만 전류는 생각보다 작았습니다.',
    '전압이커지면전류도커졌어요그래서전구가더밝아졌어요',
    '20 cm에서 720 lx, 40 cm에서 180 lx였어요. 거리가 2배가 되면 빛의 세기는 1/4배가 돼요.',
    '모든 은하가 서로 멀어지고 있어서 팽창의 중심은 따로 없다고 생각해요.',
    '점점 밝아졌다가 쭉쭉 어두워졌어요. 빙글빙글 도는 바늘이 신기했어요.',
  ]) assert.equal(writingProblem(t, { min: MIN_CHARS }), '', t);
});

test('자주 쓰는 한글 2,350자(KS X 1001) 목록과 거르기 규칙이 화면과 선생님 시트에서 같음', () => {
  const client = readFileSync(new URL('./text-guard.js', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  const common = src => src.match(/const COMMON_HANGUL = '([^']*)';/)[1];
  const list = common(client);
  assert.equal(list.length, 2350);
  assert.equal(new Set(list).size, 2350);
  assert.equal([...list].sort().join(''), list, '가나다 차례');
  for (const c of '됐닿갯겟모르겠') assert.ok(list.includes(c), c);
  for (const c of '됬잫젛덯') assert.ok(!list.includes(c), c);
  assert.equal(common(server), list);
  const dontKnow = src => src.match(/const DONT_KNOW = (\/.*\/g);/)[1];
  assert.equal(dontKnow(server), dontKnow(client));
  const dontKnowEn = src => src.match(/const DONT_KNOW_EN = (\/.*\/gi);/)[1];
  assert.equal(dontKnowEn(server), dontKnowEn(client));
  const body = src => src.match(/function junkProblem\(text\) \{\n([\s\S]*?)\n\}/)[1];
  assert.equal(body(server), body(client));
});

// 교사 의견(2026년 11월): 아래처럼 쓴 글도 제출되었어요. 인사말·이름·유행어·마무리 말로 글자 수를 채우거나, 문장 뒤에 뜻 없는 글자를 붙였어요.
const TEACHER_EXAMPLES_2 = [
  ['잠깐 불이 켰다가 꺼질거 같아요 안녕하세요 안녕', /인사말/],
  ['안녕하세요 제 이름은 권준서입니다 박재성 이동규', /인사말/],
  ['당연히 2~3배 커지니까 커진다 유남쌩~?? 그리고 끝', /유행어/],
  ['음 전류랑 정비례할거같아서 입니드리미도래시', /문장이 끝난 뒤/],
];

test('뜻 없는 글(2): 교사가 보내 준 예시(인사말, 이름, 유행어, 문장 뒤 덧붙이기)는 모두 막아요', () => {
  for (const [t, why] of TEACHER_EXAMPLES_2) assert.match(writingProblem(t, { min: MIN_CHARS }), why, t);
  // 인사말을 빼도 자기소개·이름, 유행어를 빼도 마무리 말이 남으면 막아요.
  assert.match(writingProblem('제 이름은 권준서입니다 박재성 이동규 전류가 흘러요', { min: MIN_CHARS }), /자기소개/);
  assert.match(writingProblem('전류가 세지면 전구가 밝아질 것 같아요 박재성 이동규', { min: MIN_CHARS }), /‘박재성 이동규’처럼 사람 이름/);
  assert.match(writingProblem('당연히 2~3배 커지니까 전류도 커진다 그리고 끝', { min: MIN_CHARS }), /‘그리고 끝’ 같은 마무리 말/);
  assert.match(writingProblem('음 전류랑 정비례할거같아서 드리미도래시 입니드', { min: MIN_CHARS }), /문장이 끝난 뒤/);
});

test('뜻 없는 글(2): 인터넷에서 흔히 쓰는 거르기 규칙(인사·잡담, 채우기 말, 글자 나열)을 학생 글에 맞게 막아요', () => {
  for (const [t, why] of [
    ['hello 전류가 흐르면 전구가 밝아질 것 같다', /인사말/],
    ['전류가 흐르면 전구가 밝아질 것 같아요 감사합니다', /인사말/],
    ['2학년 3반 권준서 전류가 커질 것 같아요', /자기소개/],
    ['저는 권준서입니다 전류가 커질 것 같아요', /자기소개/],
    ['전압이 커지면 전류도 커져요 킹받네 진짜로', /‘킹받네’ 같은 인터넷 말투/],
    ['전류가 흐르면 전구가 밝아질 것 같다 인정?', /유행어/],
    ['전류가 흐르면 전구가 밝아질 것 같다 lol', /유행어/],
    ['전압이 커지면 전류도 커져요 하하 신기해요', /웃음소리/],
    ['전압이 커지면 전류도 커져요 룰루랄라 신기해요', /‘룰루랄라’/],
    ['전압이 커지면 전류도 커질 것 같아요. 끝!', /마무리 말/],
    ['전압이 커지면 전류도 커질 것 같아요 이상입니다', /마무리 말/],
    ['도레미파솔라시도 전류가 흐른다 그래서 밝다', /차례대로/],
    ['가나다라 마바사 전구가 밝아진다 그래서 밝다', /차례대로/],
    ['전류가 세지면 전구가 밝아집니다다가가 정말로', /문장이 끝난 뒤/],
    ['The current gets bigger when the voltage goes up', /우리말/],
  ]) assert.match(writingProblem(t, { min: MIN_CHARS }), why, t);
  // ‘그냥’, ‘음’, ‘어’ 같은 군말은 글자 수에 세지 않아요.
  assert.equal(meaningfulLength('음 어 그냥 전류가 흘러요'), 6);
  assert.equal(meaningfulLength('음식이 어떻게 데워져요'), 10);
});

test('뜻 없는 글(2): 과학 낱말과 보통 문장은 새 규칙에 걸리지 않아요', () => {
  for (const t of [
    '기체 입자가 이리저리 돌아다니다가 벽에 부딪혀서 압력이 생겨요.',
    '그리고 끝부분에 전자가 모여서 (-)전하를 띠어요.',
    '전자가 막대의 끝으로 이동해서 그쪽이 (-)전하를 띠어요. 반대쪽 끝은 (+)전하예요.',
    '오른쪽 끝은 (+)전하를 띠고 왼쪽 끝은 (-)전하를 띠어요',
    '이상한 현상이 일어났어요 전구가 갑자기 꺼졌어요',
    '진동수 주기 모두 같았어요. 소리의 높이도 같았어요.',
    '우주선 우주인 모두 무중력 상태라서 떠다녀요.',
    '전압이 2배 이상입니다. 그래서 전류도 2배 이상 커졌어요.',
    '음식물을 데우면 부피가 커져요 그래서 뚜껑이 들썩여요',
    '어떻게 하면 전구가 더 밝아질까 생각해 봤는데 전압을 높이면 돼요',
    '바이메탈은 온도가 높아지면 휘어져요. 두 금속의 팽창 정도가 달라서예요.',
    '전류가 흐르면 전구가 밝아집니다그리고 전압을 높이면 더 밝아집니다',
    '선풍기는 전기 에너지를 운동 에너지로 바꿔요. 하지만 열도 조금 나요.',
    '풍선이 두둥실 떠올랐어요 기체가 팽창해서 가벼워졌어요',
    '기억까지 더듬어 보니 전에 정전기를 본 적이 있어요',
    '불이 들어오지는 않았지만 바늘이 움직였어요',
    '아 그렇구나 전압이 높으면 전류가 세게 흘러요',
    '구성원 모두가 같은 방향으로 움직여요 전자도 마찬가지예요',
    '하이브리드 자동차는 전기 에너지와 화학 에너지를 함께 써요',
  ]) assert.equal(writingProblem(t, { min: MIN_CHARS }), '', t);
});

test('뜻 없는 글(2): 실험 화면의 모든 글(보기·안내·이름 칸 예시)은 뜻 없는 글 규칙에 걸리지 않아요', () => {
  // 선생님 시트는 고른 보기 글도 같은 규칙으로 살펴요. 길이와 상관없이 화면의 글이 걸리면 안 돼요.
  // 학번 칸 예시(2학년 3반), 단원 번호(VIII), 주소 안내(https), 사진 출처(영어 이름)처럼 답이 아닌 글이 있는 파일은 빼요.
  const notAnswers = ['text-guard.js', 'report-submit.js', 'teacher-gate.js', 'teacher-mode.js', 'lab-shell.js', 'space-photos.js'];
  const files = [...readdirSync('.').filter(f => f.endsWith('.js')), ...readdirSync('src').filter(f => f.endsWith('.js') && !f.includes('test') && !notAnswers.includes(f)).map(f => `src/${f}`)];
  // 코드 조각(=>, ${…}, .map, 속성 글)은 빼고 화면에 보이는 글만 살펴요.
  const strings = files.flatMap(f => [...readFileSync(f, 'utf8').matchAll(/'([^'\n]{4,})'|`([^`\n]{4,})`/g)].map(m => m[1] ?? m[2]).filter(t => !/=>|\$\{|\.map|\.join|=["'`]|aria-|===|!==|&&|\|\|/.test(t)).map(t => t.replace(/<[^>]+>/g, ' ')).filter(t => /[가-힣]{2}/.test(t)));
  assert.ok(strings.length > 500);
  for (const t of strings) assert.equal(junkProblem(t), '', t);
});

test('화면과 선생님 시트의 ‘세지 않는 군말’ 규칙이 같음', () => {
  const client = readFileSync(new URL('./text-guard.js', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  const filler = src => src.match(/const FILLER = (\/.*\/g);/)[1];
  assert.equal(filler(server), filler(client));
});
