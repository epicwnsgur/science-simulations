// 이 기기에서 3D 화면(WebGL)을 쓸 수 있는지 알아봐요. three.js를 불러오기 전에 확인하려고 따로 두었어요.
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
