// 실제 별 사진 관측 창(별의 표면 온도와 색 실험).
// 망원경으로 별을 겨누듯 사진이 흐릿하게 나타났다가 초점이 맞고, 끌어서 둘러보거나 확대할 수 있어요.
// ‘별빛 색 재기’를 누르면 사진에서 별 둘레의 빛(가운데 하얗게 넘친 곳은 빼고)을 모아 별빛의 색을 보여 줘요.
// 베텔게우스와 안타레스는 초대형 망원경(VLT)으로 찍은 별 표면 사진까지 부드럽게 확대해 이어 볼 수 있어요.
import { STAR_PHOTOS, starPhotoUrl } from './space-photos.js';

const NS = 'http://www.w3.org/2000/svg';
const ease = t => 1 - (1 - t) ** 3;

// 사진 속 별의 자리와 별빛 색을 찾아요(같은 사이트의 사진이라 픽셀을 읽을 수 있어요).
const analysis = new Map();
// at: 사진 속 별의 대략의 자리(0~1). 주면 그 둘레에서만 가장 밝은 곳을 찾아요(사진에 밝은 별이 여럿일 때).
export function analyzeStarPhoto(img, at = null) {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  // 가장 밝은 곳(조금 흐리게 본 밝기)
  let best = -1, bx = N / 2, by = N / 2;
  const [lo, hi] = at ? [[at[0] * N - 24, at[1] * N - 24], [at[0] * N + 24, at[1] * N + 24]] : [[4, 4], [N - 4, N - 4]];
  for (let y = Math.max(4, Math.round(lo[1])); y < Math.min(N - 4, hi[1]); y += 2) for (let x = Math.max(4, Math.round(lo[0])); x < Math.min(N - 4, hi[0]); x += 2) {
    let s = 0; for (let j = -3; j <= 3; j += 3) for (let i = -3; i <= 3; i += 3) { const k = ((y + j) * N + x + i) * 4; s += d[k] + d[k + 1] + d[k + 2]; }
    if (s > best) { best = s; bx = x; by = y; }
  }
  // 별 둘레 고리에서 넘치지 않은(너무 밝지도 어둡지도 않은) 픽셀의 평균 색
  let color = null;
  for (const [r1, r2] of [[6, 22], [4, 14], [10, 34]]) {
    let n = 0, R = 0, G = 0, B = 0;
    for (let y = Math.max(0, by - r2); y < Math.min(N, by + r2); y++) for (let x = Math.max(0, bx - r2); x < Math.min(N, bx + r2); x++) {
      const r = Math.hypot(x - bx, y - by); if (r < r1 || r >= r2) continue;
      const k = (y * N + x) * 4, mx = Math.max(d[k], d[k + 1], d[k + 2]);
      if (mx > 249 || mx < 70) continue;
      R += d[k]; G += d[k + 1]; B += d[k + 2]; n++;
    }
    if (n > 40) { const m = Math.max(R, G, B); color = [R / m, G / m, B / m]; break; }
  }
  return { u: bx / N, v: by / N, color };
}
// 사진의 색은 옅어서 보기 쉽게 채도를 높여요(색의 방향은 그대로).
export function vivid([r, g, b], k = 3) {
  const m = (r + g + b) / 3, s = [r, g, b].map(v => Math.min(1, Math.max(0, m + (v - m) * k))), mx = Math.max(...s) || 1;
  return s.map(v => v / mx);
}
// 붉은빛 / 흰빛 / 푸른빛 (사진 속 색을 말로 나타내요)
export const tintWord = ([r, , b]) => (b - r > .12 ? '푸른빛' : r - b > .12 ? '붉은빛(주황빛)' : '흰빛·노란빛');

/* view: { x, y, w, h } 관측 창의 자리(SVG 좌표), 그 안에 그림을 넣을 <g> */
export function createStarViewer(group, view, { reducedMotion, onChange } = {}) {
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  const photo = el('image', { preserveAspectRatio: 'none', opacity: 0 });
  const surface = el('image', { preserveAspectRatio: 'xMidYMid meet', opacity: 0 });
  const reticle = el('g', { opacity: 0, 'pointer-events': 'none' });
  const scan = el('g', { opacity: 0, 'pointer-events': 'none' });
  const hit = el('rect', { x: view.x, y: view.y, width: view.w, height: view.h, fill: 'transparent', class: 'obs-hit' });
  reticle.innerHTML = '<circle r="26" fill="none" stroke="#ffcf6e" stroke-width="1.5" stroke-dasharray="5 5"/><path d="M-40 0 H-30 M30 0 H40 M0 -40 V-30 M0 30 V40" stroke="#ffcf6e" stroke-width="1.5"/>';
  scan.innerHTML = '<circle r="34" fill="none" stroke="#8fd3ff" stroke-width="3" stroke-dasharray="40 174" stroke-linecap="round"/><circle r="14" fill="none" stroke="#8fd3ff" stroke-width="1" opacity=".6"/>';
  group.append(photo, surface, reticle, scan, hit);
  const cx = view.x + view.w / 2, cy = view.y + view.h / 2, base = view.h * 1.12;
  const st = { key: null, info: null, zoom: 1, zoomT: 1, panX: 0, panY: 0, panTX: 0, panTY: 0, appear: 1, surf: 0, surfT: 0, scanT: -1, measured: null, img: null };

  function load(key) {
    const p = STAR_PHOTOS[key];
    st.key = key; st.measured = null; st.scanT = -1; st.surf = st.surfT = 0;
    st.zoom = .82; st.zoomT = 1.25; st.panX = st.panY = st.panTX = st.panTY = 0; st.appear = reducedMotion?.matches ? 1 : 0;
    if (!p) { photo.setAttribute('opacity', 0); surface.setAttribute('opacity', 0); reticle.setAttribute('opacity', 0); st.info = null; return; }
    const url = starPhotoUrl(p.src);
    photo.setAttribute('href', url);
    surface.setAttribute('href', p.surface ? starPhotoUrl(p.surface.src) : '');
    const img = new Image(); img.decoding = 'async';
    img.onload = () => { if (st.key !== key) return; if (!analysis.has(key)) analysis.set(key, analyzeStarPhoto(img, p.at)); st.info = analysis.get(key); onChange?.(); };
    img.src = url;
    st.info = analysis.get(key) ?? { u: .5, v: .5, color: null };
  }
  // 끌어서 둘러보기, 바퀴로 확대·축소
  let drag = null;
  hit.addEventListener('pointerdown', e => {
    if (!st.key || !STAR_PHOTOS[st.key]) return;
    const m = group.ownerSVGElement.getScreenCTM(); drag = { x: e.clientX, y: e.clientY, px: st.panTX, py: st.panTY, k: 1 / m.a };
    hit.setPointerCapture?.(e.pointerId); hit.classList.add('grabbing');
  });
  hit.addEventListener('pointermove', e => {
    if (!drag) return;
    const lim = base * st.zoomT / 2;
    st.panTX = Math.max(-lim, Math.min(lim, drag.px + (e.clientX - drag.x) * drag.k));
    st.panTY = Math.max(-lim, Math.min(lim, drag.py + (e.clientY - drag.y) * drag.k));
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) hit.addEventListener(ev, () => { drag = null; hit.classList.remove('grabbing'); });
  hit.addEventListener('wheel', e => { if (!st.key || !STAR_PHOTOS[st.key]) return; e.preventDefault(); api.zoomBy(e.deltaY < 0 ? 1.25 : .8); }, { passive: false });
  hit.addEventListener('dblclick', () => api.center());

  const api = {
    get key() { return st.key; },
    get measured() { return st.measured; },
    get surfaceOn() { return st.surfT > .5; },
    hasPhoto: key => !!STAR_PHOTOS[key],
    hasSurface: key => !!STAR_PHOTOS[key]?.surface,
    show: load,
    zoomBy(k) { st.zoomT = Math.max(.8, Math.min(4, st.zoomT * k)); if (st.surfT && k < 1) st.surfT = 0; },
    center() { st.panTX = st.panTY = 0; st.zoomT = 1.25; st.surfT = 0; },
    toggleSurface() { if (!api.hasSurface(st.key)) return false; st.surfT = st.surfT ? 0 : 1; st.panTX = st.panTY = 0; st.zoomT = st.surfT ? 4 : 1.25; return st.surfT === 1; },
    measure() { if (!st.key || !STAR_PHOTOS[st.key] || STAR_PHOTOS[st.key].noMeasure) return false; st.zoomT = Math.max(st.zoomT, 1.6); st.panTX = st.panTY = 0; st.surfT = 0; st.scanT = 0; return true; },
    // 프레임마다 불러요. 움직임이 있으면 true
    step(dt) {
      if (!st.key) return false;
      const k = reducedMotion?.matches ? 1 : 1 - Math.exp(-dt * 7);
      const before = [st.zoom, st.panX, st.panY, st.surf, st.appear].join();
      st.zoom += (st.zoomT - st.zoom) * k; st.panX += (st.panTX - st.panX) * k; st.panY += (st.panTY - st.panY) * k;
      st.surf += (st.surfT - st.surf) * (reducedMotion?.matches ? 1 : 1 - Math.exp(-dt * 3.2));
      st.appear = Math.min(1, st.appear + dt / .9);
      if (!STAR_PHOTOS[st.key]) return false;
      const S = base * st.zoom, info = st.info ?? { u: .5, v: .5 };
      const x = cx + st.panX - info.u * S, y = cy + st.panY - info.v * S;
      photo.setAttribute('x', x.toFixed(1)); photo.setAttribute('y', y.toFixed(1)); photo.setAttribute('width', S.toFixed(1)); photo.setAttribute('height', S.toFixed(1));
      const a = ease(st.appear), sv = ease(Math.min(1, st.surf * 1.15));
      photo.setAttribute('opacity', (a * (1 - sv)).toFixed(3));
      photo.style.filter = a < 1 ? `blur(${((1 - a) * 7).toFixed(1)}px)` : '';
      // 표면 사진: 별의 자리에서 작게 시작해 창 가득 커져요.
      const ss = view.h * (.25 + .85 * sv);
      surface.setAttribute('x', (cx + st.panX - ss / 2).toFixed(1)); surface.setAttribute('y', (cy + st.panY - ss / 2).toFixed(1)); surface.setAttribute('width', ss.toFixed(1)); surface.setAttribute('height', ss.toFixed(1));
      surface.setAttribute('opacity', sv.toFixed(3));
      reticle.setAttribute('transform', `translate(${(cx + st.panX).toFixed(1)} ${(cy + st.panY).toFixed(1)}) scale(${(1 + .06 * Math.sin(performance.now() / 300)).toFixed(3)})`);
      reticle.setAttribute('opacity', (a * (1 - sv) * .9).toFixed(2));
      // 별빛 색 재기: 고리가 별 둘레를 한 바퀴 돌며 빛을 모아요.
      let scanning = false;
      if (st.scanT >= 0) {
        st.scanT += dt / (reducedMotion?.matches ? .01 : 1.2); scanning = st.scanT < 1;
        scan.setAttribute('transform', `translate(${(cx + st.panX).toFixed(1)} ${(cy + st.panY).toFixed(1)}) rotate(${(st.scanT * 720).toFixed(0)})`);
        scan.setAttribute('opacity', scanning ? 1 : 0);
        // 사진을 아직 다 불러오지 못했으면 다 불러올 때까지 고리가 계속 돌아요.
        if (!scanning && !analysis.has(st.key)) { st.scanT = .5; scanning = true; }
        if (!scanning) { st.scanT = -1; st.measured = st.info?.color ? vivid(st.info.color) : null; onChange?.('measured'); }
      }
      return scanning || before !== [st.zoom, st.panX, st.panY, st.surf, st.appear].join();
    },
  };
  return api;
}
