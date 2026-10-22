// 3D 실험의 ‘보기’ 단추(3D 입체 / 2D 그림, 시점 바꾸기). three.js는 무거워서 WebGL을 쓸 수 있을 때만 따로 불러와요.
// 3D 화면을 쓸 수 없는 기기에서는 지금까지처럼 2D 그림으로 실험해요. 고른 보기는 기기에 기억해요.
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

// stage: 실험 화면, key: 고른 보기를 기억할 이름, cams: [[시점 이름, 단추 글자], …]
// load(): 3D 화면을 만들어 돌려주는 함수(Promise), onChange(use3d): 보기가 바뀔 때마다 불러요.
export function setupViewToggle({ stage, key, cams, tip = '화면을 끌면 이리저리 돌려 볼 수 있어요', load, onChange }) {
  stage.insertAdjacentHTML('afterend', `<div class="view-bar" id="view-bar" role="group" aria-label="보는 방법" hidden><span class="group-label">보기</span><button data-view="3d" aria-pressed="false">🧊 3D 입체</button><button data-view="2d" aria-pressed="true">▭ 2D 그림</button><span class="view-gap"></span>${cams.map(([id, text]) => `<button data-cam="${id}">${text}</button>`).join('')}<span class="view-tip">${tip}</span></div>`);
  const bar = document.getElementById('view-bar');
  const state = { view: null, use3d: false };
  function set(next) {
    state.use3d = next === '3d' && !!state.view;
    stage.classList.toggle('three-on', state.use3d);
    stage.dataset.view = state.use3d ? '3d' : '2d';
    bar.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === stage.dataset.view));
    bar.querySelectorAll('[data-cam]').forEach(b => { b.disabled = !state.use3d; });
    if (state.use3d) state.view.invalidate();
    onChange(state.use3d);
  }
  bar.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { set(b.dataset.view); try { localStorage.setItem(key, b.dataset.view); } catch { /* 저장이 안 돼도 괜찮아요 */ } });
  bar.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => state.view?.setView(b.dataset.cam));
  if (webglAvailable()) {
    load().then(view => {
      state.view = view;
      bar.hidden = false;
      let saved = null;
      try { saved = localStorage.getItem(key); } catch { /* 없으면 3D부터 */ }
      set(saved === '2d' ? '2d' : '3d');
    }).catch(() => set('2d'));
  } else stage.dataset.view = '2d';
  return state;
}
