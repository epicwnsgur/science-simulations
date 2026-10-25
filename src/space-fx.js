// 우주 실험의 움직이는 효과(빛 알갱이, 반짝임 등)를 그리는 겹 캔버스.
// 무대 그림(#scene) 위에 같은 크기의 캔버스를 겹쳐서, 효과가 매 프레임 바뀌어도 아래 그림(SVG) 전체를 다시 그리지 않게 해요(느린 기기에서도 부드럽게).
// 그릴 때는 무대 그림과 같은 좌표(800 × 440)를 써요.
const NS = 'http://www.w3.org/2000/svg';
export function fxCanvas(stage) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-layer'; canvas.setAttribute('aria-hidden', 'true');
  const svg = stage.querySelector('#scene');
  svg.after(canvas);
  const g = canvas.getContext('2d');
  let w = 0, h = 0, dirty = false;
  return {
    canvas,
    // 그리기 시작: 크기를 맞추고 지운 뒤, 800 × 440 좌표로 바꿔 줘요. 그릴 것이 없으면 null.
    begin() {
      const cw = svg.clientWidth, ch = svg.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
      if (!cw || !ch) return null;
      if (cw !== w || ch !== h) { w = cw; h = ch; canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); Object.assign(canvas.style, { width: `${cw}px`, height: `${ch}px` }); }
      const k = Math.min(cw / 800, ch / 440);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
      g.setTransform(dpr * k, 0, 0, dpr * k, dpr * (cw - 800 * k) / 2, dpr * (ch - 440 * k) / 2);
      dirty = true;
      return g;
    },
    clear() { if (!dirty) return; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); dirty = false; },
  };
}
export const svgEl = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };
// 값이 바뀐 경우에만 속성을 고쳐요(같은 값을 다시 넣어도 다시 그리게 되는 경우가 있어서).
export function setAttr(el, name, value) { const v = String(value); if (el && el.getAttribute(name) !== v) el.setAttribute(name, v); }
