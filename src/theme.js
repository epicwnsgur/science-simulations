// 테마 바꾸기: 어두운 테마(기본)와 밝은 테마(핑크)를 단추 하나로 오가요.
// 고른 테마는 이 브라우저에 기억해서 다른 실험·목록 페이지에서도 그대로 써요(이름 같은 개인정보는 아니에요).
// 밝은 테마의 색은 theme-light.css(build/light-theme.mjs가 만들어요)에 있고, <html data-theme="light">일 때만 적용돼요.
// 페이지마다 <head>의 짧은 스크립트가 그림을 그리기 전에 data-theme을 먼저 정해서, 화면이 번쩍이지 않아요.
const KEY = 'theme';
const META = { dark: '#080b16', light: '#fff4f8' };

export const currentTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
export const themeButtonHTML = () => '<button type="button" class="theme-toggle" data-theme-toggle></button>';

function render() {
  const light = currentTheme() === 'light';
  document.querySelectorAll('[data-theme-toggle]').forEach(b => {
    b.innerHTML = light ? '<span aria-hidden="true">🌙</span> 어두운 테마' : '<span aria-hidden="true">🌸</span> 밝은 테마';
    b.setAttribute('aria-label', light ? '어두운 테마로 바꾸기 (지금: 밝은 테마)' : '밝은 테마로 바꾸기 (지금: 어두운 테마)');
    b.title = light ? '어두운 테마로 바꾸기' : '밝은 테마로 바꾸기';
  });
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[currentTheme()]);
}

export function setTheme(theme) {
  if (theme === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem(KEY, theme); } catch { /* 기억하지 못해도 지금 화면에는 적용돼요. */ }
  render();
  // 그림·3D 화면이 새 색에 맞게 다시 그려지도록 알려요.
  dispatchEvent(new Event('themechange'));
}

// 테마 단추를 연결해요. 목록 페이지처럼 단추가 없으면 머리글(.site-header)에 단추를 넣어요.
export function setupTheme() {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* 처음 테마(어두운 테마)로 시작해요. */ }
  if (saved === 'light') document.documentElement.dataset.theme = 'light';
  const header = document.querySelector('.site-header');
  if (header && !header.querySelector('[data-theme-toggle]')) header.insertAdjacentHTML('beforeend', themeButtonHTML());
  document.querySelectorAll('[data-theme-toggle]').forEach(b => { b.onclick = () => setTheme(currentTheme() === 'light' ? 'dark' : 'light'); });
  render();
}
