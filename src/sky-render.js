// 실제 밤하늘 그리기(캔버스 2D). 스텔라리움처럼 실제 별의 위치·밝기(겉보기 등급)·색(색지수)으로 하늘을 그려요.
// 별 자료: HYG v4.1(CC BY-SA 4.0), 별자리 선·은하수 윤곽: d3-celestial(BSD) — src/data/*.js
// 투영: 평사 도법(stereographic). 하늘의 한 점(적경 ra0, 적위 dec0)을 가운데에 두고 시야 fov(도)만큼 보여 줘요.
import { SKY_STARS } from './data/sky-stars.js';
import { CONSTELLATION_LINES } from './data/constellation-lines.js';
import { MILKY_WAY_OUTLINE } from './data/milky-way-outline.js';
import { bvToKelvin, starDisplayRGB } from './space-model.js';

const D = Math.PI / 180;
export function projector(ra0, dec0, fov, w, h) {
  const sd0 = Math.sin(dec0 * D), cd0 = Math.cos(dec0 * D);
  const scale = (Math.min(w, h) / 2) / (2 * Math.tan(fov * D / 4));
  return (ra, dec) => {
    const dra = (ra - ra0) * D, sd = Math.sin(dec * D), cd = Math.cos(dec * D);
    const cosc = sd0 * sd + cd0 * cd * Math.cos(dra);
    if (cosc < -0.2) return null;
    const k = 2 / (1 + cosc);
    // 하늘을 올려다본 모습: 동쪽이 왼쪽이에요(적경이 커지면 왼쪽).
    const x = -k * cd * Math.sin(dra), y = k * (cd0 * sd - sd0 * cd * Math.cos(dra));
    return [w / 2 + x * scale, h / 2 - y * scale];
  };
}
const colorCache = new Map();
export function starColor(bv) {
  const key = Math.round(bv * 20);
  if (!colorCache.has(key)) colorCache.set(key, starDisplayRGB(bvToKelvin(key / 20), 1.7).map(v => Math.round(v * 255)));
  return colorCache.get(key);
}
// 겉보기 등급 → 점 크기(px). 밝은 별일수록 크게(사진처럼 퍼져 보이게).
export const starRadius = (mag, k = 1) => Math.max(0.55, (5.6 - mag) * 0.62 * k);

// 하늘 한 장을 그려 캔버스로 돌려줘요(배경으로 한 번 그려 두고 다시 쓰면 빨라요).
// opts: { ra, dec, fov, width, height, milkyWay(0~1), lines: ['Ori', …] | 'all', lineColor, maxMag, spikes, skip(ra, dec): 빼고 그릴 별 }
export function renderSky(opts) {
  const { ra, dec, fov, width: w, height: h, milkyWay = 0.9, milkyWayPasses = 2, lines = [], lineColor = '#8fb4ff', maxMag = 6, spikes = true, pixelRatio = 1, skip = null } = opts;
  const c = document.createElement('canvas');
  c.width = Math.round(w * pixelRatio); c.height = Math.round(h * pixelRatio);
  const g = c.getContext('2d');
  g.scale(pixelRatio, pixelRatio);
  const P = projector(ra, dec, fov, w, h);
  // 밤하늘 바탕: 아주 어두운 남색에서 가장자리로 갈수록 검게
  const bg = g.createRadialGradient(w / 2, h * 0.6, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
  bg.addColorStop(0, '#0b1026'); bg.addColorStop(1, '#020309');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // 은하수: 밝기 단계마다 옅은 빛을 겹쳐 칠하고 흐리게 펴요.
  if (milkyWay > 0) {
    const mw = document.createElement('canvas'); mw.width = w; mw.height = h;
    const m = mw.getContext('2d');
    MILKY_WAY_OUTLINE.forEach((rings, level) => {
      m.fillStyle = `rgba(${level < 2 ? '150,165,215' : '215,205,190'},${0.09 + level * 0.035})`;
      for (const ring of rings) {
        m.beginPath(); let started = false, ok = true;
        for (const [r, d] of ring) {
          const p = P(r < 0 ? r + 360 : r, d);
          if (!p) { ok = false; break; }
          if (!started) { m.moveTo(p[0], p[1]); started = true; } else m.lineTo(p[0], p[1]);
        }
        if (ok && started) { m.closePath(); m.fill(); }
      }
    });
    g.save(); g.globalAlpha = milkyWay; g.filter = `blur(${Math.max(6, w / 90)}px)`; g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < milkyWayPasses; i++) g.drawImage(mw, 0, 0);
    g.restore();
  }
  // 별자리 선
  if (lines.length) {
    g.strokeStyle = lineColor; g.lineWidth = 1.1; g.globalAlpha = 0.45;
    for (const [id, segs] of Object.entries(CONSTELLATION_LINES)) {
      if (lines !== 'all' && !lines.includes(id)) continue;
      for (const seg of segs) {
        g.beginPath(); let on = false;
        for (const [r, d] of seg) { const p = P(r < 0 ? r + 360 : r, d); if (!p) { on = false; continue; } if (on) g.lineTo(p[0], p[1]); else { g.moveTo(p[0], p[1]); on = true; } }
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  }
  // 별: 어두운 별부터 그려 밝은 별이 위에 오게
  g.globalCompositeOperation = 'lighter';
  for (let i = SKY_STARS.length - 1; i >= 0; i--) {
    const [r, d, mag, bv] = SKY_STARS[i];
    if (mag > maxMag || skip?.(r, d)) continue;
    const p = P(r, d);
    if (!p || p[0] < -10 || p[1] < -10 || p[0] > w + 10 || p[1] > h + 10) continue;
    drawStar(g, p[0], p[1], mag, bv, { spikes, scale: 60 / Math.max(20, fov) });
  }
  g.globalCompositeOperation = 'source-over';
  return { canvas: c, project: P };
}

// 별 하나: 가운데는 하얗게 빛나고 둘레로 별의 색이 퍼지며, 밝은 별은 사진처럼 십자 빛살이 생겨요.
export function drawStar(g, x, y, mag, bv, { spikes = true, scale = 1, alpha = 1 } = {}) {
  const [cr, cg, cb] = starColor(bv);
  const r = starRadius(mag, Math.min(2.2, Math.max(0.8, scale ** 0.35)));
  const glow = r * 3.2;
  const grad = g.createRadialGradient(x, y, 0, x, y, glow);
  grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
  grad.addColorStop(0.18, `rgba(${cr},${cg},${cb},${0.95 * alpha})`);
  grad.addColorStop(0.45, `rgba(${cr},${cg},${cb},${0.28 * alpha})`);
  grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  g.fillStyle = grad; g.beginPath(); g.arc(x, y, glow, 0, Math.PI * 2); g.fill();
  if (spikes && mag < 1.6) {
    const L = (2.2 - mag) * 9 * Math.min(1.6, scale ** 0.3);
    g.strokeStyle = `rgba(${cr},${cg},${cb},${0.35 * alpha})`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x, y - L); g.lineTo(x, y + L); g.stroke();
  }
}
