// 과학 낱말 뜻 풀이: 실험 화면의 글에 나오는 주요 과학 낱말을 누르면 쉬운 뜻이 말풍선으로 나와요.
// 모든 실험(앞으로 만들 실험 포함)은 학습 흐름(src/poe-flow.js)이 이 기능을 켜요. 새 낱말은 TERMS에 더하면 돼요.
// 뜻은 중학교 2학년 교과서(Ⅶ. 전기와 자기)의 낱말로 짧게 썼어요(예: ‘알갱이’가 아니라 ‘입자’). ‘자기력선’처럼 교육과정에서 다루지 않는 말은 넣지 않아요.

export const TERMS = {
  '원자': '물질을 이루는 기본 입자예요. 가운데에 (+)전하를 띤 원자핵이 있고, 그 둘레에 (−)전하를 띤 전자가 있어요.',
  '원자핵': '원자의 가운데에 있는 (+)전하를 띤 부분이에요. 물체를 문질러도 원자핵은 다른 물체로 이동하지 않아요.',
  '전자': '원자핵 둘레에 있는 (−)전하를 띤 아주 작은 입자예요. 물체와 물체 사이나 금속 안에서 이동할 수 있어요.',
  '전하': '물체가 띠고 있는 전기예요. (+)전하와 (−)전하 두 종류가 있어요.',
  '마찰 전기': '서로 다른 두 물체를 문지를 때 생기는 전기예요. 한 물체의 전자가 다른 물체로 이동해서 생겨요.',
  '대전': '물체가 전기를 띠는 현상이에요. 전자를 잃은 물체는 (+)전하로, 전자를 얻은 물체는 (−)전하로 대전돼요.',
  '대전체': '전기를 띤 물체예요. 털가죽으로 문지른 풍선처럼 대전된 물체를 말해요.',
  '전기력': '전기를 띤 물체 사이에 작용하는 힘이에요. 같은 종류의 전하끼리는 밀어내고, 다른 종류의 전하끼리는 끌어당겨요.',
  '인력': '서로 끌어당기는 힘이에요. 다른 종류의 전하 사이에 인력이 작용해요.',
  '척력': '서로 밀어내는 힘이에요. 같은 종류의 전하 사이에 척력이 작용해요.',
  '정전기 유도': '금속에 대전체를 가까이 하면 금속 안의 전자가 이동해, 대전체와 가까운 쪽은 다른 종류, 먼 쪽은 같은 종류의 전하를 띠는 현상이에요.',
  '검전기': '물체가 전기를 띠었는지 알아보는 기구예요. 대전체를 금속판에 가까이 하면 금속박이 벌어져요.',
  '금속박': '검전기 아래쪽에 달린 아주 얇은 금속 조각이에요. 두 장이 같은 종류의 전하를 띠면 서로 밀어내 벌어져요.',
  '도체': '전기가 잘 통하는 물질이에요. 구리, 철, 알루미늄 같은 금속이 도체예요.',
  '부도체': '전기가 잘 통하지 않는 물질이에요. 고무, 유리, 플라스틱, 나무 등이 부도체예요.',
  '전류': '전하의 흐름이에요. 전류는 전지의 (+)극에서 (−)극 쪽으로 흐르고, 전자는 그 반대로 이동해요. 단위는 A(암페어)예요.',
  '전압': '전기 회로에서 전류를 흐르게 하는 능력이에요. 단위는 V(볼트)예요.',
  '저항': '전기 회로에서 전류의 흐름을 방해하는 정도예요. 단위는 Ω(옴)이에요.',
  '옴의 법칙': '도선에 흐르는 전류의 세기는 전압에 비례하고 저항에 반비례한다는 법칙이에요. (전류 = 전압 ÷ 저항)',
  '전류계': '회로에 흐르는 전류의 세기를 재는 기구예요. 재려는 부분에 직렬로 연결해요.',
  '전압계': '전압의 크기를 재는 기구예요. 재려는 부분에 병렬로 연결해요.',
  '직렬연결': '전기 기구를 한 줄로 이어 연결하는 방법이에요. 전류가 흐르는 길이 하나라서 한 곳이 끊어지면 모두 꺼져요.',
  '병렬연결': '전기 기구를 여러 갈래로 나란히 연결하는 방법이에요. 한 갈래가 끊어져도 다른 갈래에는 전류가 흘러요.',
  '니크롬선': '저항이 커서 저항 실험에 자주 쓰는 금속선이에요. 전류가 오래 흐르면 뜨거워져요.',
  '자기력': '자석과 자석, 자석과 쇠붙이 사이에 작용하는 힘이에요.',
  '자기장': '자기력이 작용하는 공간이에요. 나침반 바늘의 N극이 가리키는 방향이 그곳의 자기장 방향이에요.',
  '나침반': '자석으로 된 바늘이 들어 있어 방향을 알려 주는 기구예요. 바늘의 N극이 가리키는 방향이 자기장의 방향이에요.',
  '지구 자기장': '지구가 만드는 자기장이에요. 그래서 다른 자석이 없으면 나침반 바늘의 N극은 북쪽을 가리켜요.',
  '코일': '도선을 원통 모양으로 여러 번 감은 것이에요. 전류가 흐르면 코일 둘레에 자기장이 생겨요.',
  '전원 장치': '전압을 조절해서 회로에 전류를 흘려 주는 장치예요.',
  '전동기': '자기장 속에서 전류가 흐르는 코일이 받는 힘을 이용해 회전하는 장치예요. 선풍기, 드론 등에 쓰여요.',
  '에나멜': '구리선 겉에 입힌 얇은 막으로, 전기가 통하지 않아요. 에나멜을 벗겨 낸 부분으로만 전기가 통해요.',
};
// 뒤에 이런 글자가 붙으면 다른 낱말이라 뜻 풀이를 붙이지 않아요(예: 전자석, 전자레인지).
const NOT_BEFORE = { '전자': '석레기', '전류': '계', '전압': '계', '저항': '기' };
const HANGUL = /[가-힣]/;
const SKIP = 'button, input, textarea, select, a, svg, label.prediction-choice, label.toggle, .term, .term-pop, #stage-state, #readout, .flow-toast, .term-buttons, #term-definition, script, style';
const ORDER = Object.keys(TERMS).sort((a, b) => b.length - a.length);

// 글 속에서 처음 나오는 낱말 찾기(낱말 앞이 다른 한글이면 낱말의 일부라서 건너뛰어요. 예: ‘부도체’ 안의 ‘도체’).
export function findTerm(text, used = new Set()) {
  let best = null;
  for (const term of ORDER) {
    if (used.has(term)) continue;
    let from = 0;
    while (true) {
      const i = text.indexOf(term, from);
      if (i < 0) break;
      const before = text[i - 1] ?? '', after = text[i + term.length] ?? '';
      const okBefore = !HANGUL.test(before), okAfter = !(NOT_BEFORE[term] ?? '').includes(after) || !after;
      if (okBefore && okAfter) { if (!best || i < best.index || (i === best.index && term.length > best.term.length)) best = { term, index: i }; break; }
      from = i + 1;
    }
  }
  return best;
}

// root 안의 글에서 낱말마다 처음 한 번만 누를 수 있게 바꿔요(같은 낱말이 여러 번 나와도 한 번이면 충분해요).
export function markTerms(root) {
  if (!root || root.closest?.(SKIP)) return;
  const used = new Set([...root.querySelectorAll('.term')].map(t => t.dataset.term));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement?.closest(SKIP) || !n.textContent.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (let node of nodes) {
    let hit;
    while ((hit = findTerm(node.textContent, used))) {
      used.add(hit.term);
      const word = node.splitText(hit.index);
      node = word.splitText(hit.term.length);
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'term'; btn.dataset.term = hit.term; btn.textContent = hit.term;
      btn.setAttribute('aria-expanded', 'false');
      btn.title = '눌러서 뜻 보기';
      word.replaceWith(btn);
    }
  }
}

// 말풍선 하나를 함께 써요. 낱말을 누르면 그 아래(공간이 없으면 위)에 나오고, 바깥을 누르거나 Esc를 누르면 닫혀요.
let pop = null, openBtn = null;
function close() { if (!pop) return; pop.hidden = true; openBtn?.setAttribute('aria-expanded', 'false'); openBtn = null; }
function show(btn) {
  if (!pop) {
    pop = document.createElement('div');
    pop.className = 'term-pop'; pop.id = 'term-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '낱말 뜻');
    document.body.append(pop);
  }
  if (openBtn === btn && !pop.hidden) return close();
  close();
  pop.innerHTML = `<b>${btn.dataset.term}</b><p>${TERMS[btn.dataset.term]}</p><button type="button" class="term-close" aria-label="뜻 풀이 닫기">닫기</button>`;
  pop.querySelector('.term-close').onclick = () => { const b = openBtn; close(); b?.focus(); };
  pop.hidden = false; openBtn = btn; btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-controls', 'term-pop');
  const r = btn.getBoundingClientRect(), w = Math.min(320, innerWidth - 24);
  pop.style.width = `${w}px`;
  const left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
  const below = r.bottom + 10 + pop.offsetHeight < innerHeight;
  pop.style.left = `${left + scrollX}px`;
  pop.style.top = `${(below ? r.bottom + 8 : r.top - pop.offsetHeight - 8) + scrollY}px`;
  pop.dataset.side = below ? 'below' : 'above';
}

// roots: 낱말을 찾을 영역(선택자). 글이 바뀌면(실험 안내가 바뀔 때 등) 다시 찾아요.
export function enableGlossary(selectors) {
  const scan = () => selectors.forEach(sel => document.querySelectorAll(sel).forEach(markTerms));
  scan();
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  });
  selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => observer.observe(el, { childList: true, subtree: true, characterData: true })));
  document.addEventListener('click', e => {
    const btn = e.target.closest?.('.term');
    if (btn) { e.preventDefault(); show(btn); return; }
    if (!e.target.closest?.('.term-pop')) close();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openBtn) { const b = openBtn; close(); b.focus(); } });
  addEventListener('resize', close);
  return { scan };
}
