// 학생 글 임시 저장: 쓰는 즉시 이 탭(sessionStorage)과 이 컴퓨터(localStorage) 두 곳에 저장해요.
// 새로 고침은 물론, 창을 닫았다가 다시 열거나 브라우저가 멈춰도 쓰던 글이 돌아와요.
// 컴퓨터실처럼 여러 학생이 함께 쓰는 컴퓨터를 생각해서, 이 컴퓨터에 남긴 글은
// 마지막으로 쓴 뒤 KEEP_HOURS시간이 지나면 버리고, 제출을 마치면 바로 지워요(keepLocal: false).
export const KEEP_HOURS = 3;
const LOCAL_PREFIX = 'draft:';

function read(storage, key) {
  try { return JSON.parse(storage.getItem(key)); } catch { return null; }
}
function write(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* 저장하지 못해도 이 화면에서는 계속 쓸 수 있어요. */ }
}
function remove(storage, key) {
  try { storage.removeItem(key); } catch { /* 지우지 못해도 시간이 지나면 버려요. */ }
}

export function draftStore(key, { now = () => Date.now() } = {}) {
  const localKey = LOCAL_PREFIX + key;
  return {
    // 이 탭의 글을 먼저 쓰고, 없으면 이 컴퓨터에 남은 글(유효 시간 안)을 써요. fromComputer: 창을 다시 열어 되살린 글인지.
    load() {
      const inTab = read(sessionStorage, key);
      if (inTab) return { data: inTab, fromComputer: false };
      const saved = read(localStorage, localKey);
      if (!saved || typeof saved.at !== 'number' || now() - saved.at > KEEP_HOURS * 3600e3) { remove(localStorage, localKey); return null; }
      write(sessionStorage, key, saved.data);
      return { data: saved.data, fromComputer: true, at: saved.at };
    },
    save(data, { keepLocal = true } = {}) {
      write(sessionStorage, key, data);
      if (keepLocal) write(localStorage, localKey, { at: now(), data });
      else remove(localStorage, localKey);
    },
    clear() { remove(sessionStorage, key); remove(localStorage, localKey); },
  };
}

// 오래된 임시 저장 글을 정리해요(다른 실험의 글도 시간이 지나면 이 컴퓨터에서 지워요).
export function pruneDrafts(now = Date.now()) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k?.startsWith(LOCAL_PREFIX)) continue;
      const saved = read(localStorage, k);
      if (!saved || typeof saved.at !== 'number' || now - saved.at > KEEP_HOURS * 3600e3) remove(localStorage, k);
    }
  } catch { /* 정리하지 못해도 괜찮아요. */ }
}
