// 화면에 쓰는 작은 선 아이콘(SVG). 에모지 대신 써요: 기기마다 모양이 달라지지 않고, 글자 색(currentColor)을 따라 테마에 어울려요.
// icon('memo')처럼 부르면 글자 크기에 맞춘 <svg class="icon">를 돌려줘요. 꾸밈이라 화면 읽기 프로그램에는 읽히지 않아요(aria-hidden).
const PATHS = {
  // 메모장과 연필
  memo: '<path d="M5 3.5h10l4 4V20a.5.5 0 0 1-.5.5h-13A.5.5 0 0 1 5 20z"/><path d="M15 3.5V8h4M8.5 11.5h7M8.5 15h4.5"/>',
  // 해(밝은 테마)
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  // 달(어두운 테마)
  moon: '<path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z"/>',
  // 자물쇠(아직 열리지 않은 단계)
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  // 교사(칠판과 지시봉)
  teacher: '<rect x="3.5" y="4" width="17" height="11" rx="1"/><path d="M8 19.5l2-4.5M16 19.5l-2-4.5M7 8.5l4 2.5 4-3"/>',
  // 펼친 책(낱말 뜻)
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/>',
  // 나침반(실험 순서 안내)
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z"/>',
};
export const icon = (name, cls = '') => `<svg class="icon${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
// CSS의 mask-image로 쓸 수 있는 data URI(글자 색으로 칠해요)
export const iconMask = name => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`)}")`;
