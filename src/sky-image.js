// 실제 밤하늘 그림(src/sky-render.js)을 SVG 무대의 <image>로 넣어요. 같은 하늘은 한 번만 그려 두고 다시 써요.
// 무대 위 글자·표시는 project(ra, dec)로 같은 좌표(SVG 단위)에 맞춰 그려요.
import { renderSky, projector } from './sky-render.js';

const cache = new Map();
// opts: renderSky와 같아요(width·height는 SVG 단위). skip 함수는 skipKey로 구별해요.
export function skyImage(opts) {
  const { ra, dec, fov, width, height } = opts;
  const project = projector(ra, dec, fov, width, height);
  const key = JSON.stringify({ ...opts, skip: opts.skipKey ?? null });
  if (!cache.has(key)) {
    cache.set(key, new Promise(resolve => {
      // 화면을 그리는 틈에 그려서 단추 반응이 늦어지지 않게 해요.
      setTimeout(() => {
        const { canvas } = renderSky({ pixelRatio: Math.min(2, Math.max(1.25, devicePixelRatio || 1)), ...opts });
        if (canvas.toBlob) canvas.toBlob(b => resolve(b ? URL.createObjectURL(b) : canvas.toDataURL('image/jpeg', .9)), 'image/jpeg', .9);
        else resolve(canvas.toDataURL('image/jpeg', .9));
      }, 0);
    }));
  }
  return { url: cache.get(key), project };
}
// <image> 요소에 하늘을 넣어요. 다른 하늘을 고르면 부드럽게 바뀌어요.
export async function setSky(img, opts) {
  const { url, project } = skyImage(opts);
  const want = JSON.stringify([opts.ra, opts.dec, opts.fov]);
  img.dataset.want = want;
  const href = await url;
  if (img.dataset.want !== want) return project;
  if (img.getAttribute('href') !== href) {
    img.animate?.([{ opacity: .2 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
    img.setAttribute('href', href);
  }
  img.dataset.ready = want;
  return project;
}
