// 피스톤이 달린 실린더 속 기체 입자 모형(기체의 압력과 부피, 기체의 온도와 부피 화면에서 함께 써요).
// - 입자는 스스로 끊임없이 모든 방향으로 움직이고, 벽에 부딪히면 튀어나와요(충돌).
// - 입자의 빠르기는 온도로만 정해져요(src/gas-model.js의 particleSpeed). 부피를 줄여도 빨라지지 않아요.
// - 기체의 압력(내부 압력)은 ‘입자가 벽에 부딪히는 횟수와 세기’에서 생겨요. 화면에서는 같은 규칙으로 계산한 값을 막대로 보여 줘요:
//   1 기압·20 ℃일 때의 높이(h1)를 기준으로, 빠르기가 같으면 높이가 낮을수록(부피가 작을수록), 높이가 같으면 빠를수록 커져요.
// - 기체의 부피는 입자의 중심이 움직일 수 있는 높이(h − 2r)로 계산해요. 그래야 부피가 1/2배일 때 피스톤에 부딪히는 횟수가
//   그림 속 입자의 크기와 관계없이 2배가 되어, 기체의 압력과 같은 규칙을 따라요.
// - 피스톤은 내부 압력과 외부 압력(추)이 같아질 때까지 움직여요(ease가 작을수록 천천히 움직여 두 압력의 차이를 오래 볼 수 있어요).
import { particleSpeed } from './gas-model.js';

const NS = 'http://www.w3.org/2000/svg';
const make = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
// 늘 같은 배치로 시작하도록 정해진 순서의 ‘무작위’ 수
export const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function createCylinder({ layer, x, w, floor, n = 24, h1 = 200, maxH = 300, minH = 40, r = 6, color = '#7fe7ff', seed = 11, baseSpeed = 110, ease = 1.6 }) {
  const rand = seeded(seed);
  let h = h1, tempC = 20, ext = 1, hitRate = 0, hits = 0, showArrows = false;
  const parts = Array.from({ length: n }, () => {
    const a = rand() * Math.PI * 2;
    return { x: x + r + rand() * (w - 2 * r), y: floor - r - rand() * (h1 - 2 * r), dx: Math.cos(a), dy: Math.sin(a) };
  });
  const g = make('g', { class: 'gas-cylinder-parts' });
  const flashLayer = make('g', {});
  const arrows = parts.map(() => make('path', { stroke: color, 'stroke-width': 1.6, opacity: .75, 'stroke-linecap': 'round' }));
  const dots = parts.map(() => make('circle', { r, fill: color, filter: 'url(#glow)' }));
  arrows.forEach(a => g.append(a)); dots.forEach(d => g.append(d)); g.append(flashLayer);
  layer.append(g);

  const speed = () => particleSpeed(tempC, baseSpeed);
  const free = hh => hh - 2 * r;                       // 입자의 중심이 움직일 수 있는 높이(기체의 부피에 비례)
  // 내부 압력(기압): 빠르기의 제곱에 비례하고 부피에 반비례해요.
  const inner = () => (speed() / particleSpeed(20, baseSpeed)) ** 2 * free(h1) / free(h);
  const flash = (fx, fy, strong) => {
    if (flashLayer.childElementCount > 18) return;
    const c = make('circle', { cx: fx, cy: fy, r: 3, fill: 'none', stroke: '#ffd166', 'stroke-width': strong ? 2.6 : 1.6 });
    flashLayer.append(c);
    c.animate([{ r: 3, opacity: 1 }, { r: strong ? 13 : 9, opacity: 0 }], { duration: 420, easing: 'ease-out' }).onfinish = () => c.remove();
  };

  return {
    get height() { return h; },
    // 처음(1 기압·20 ℃) 부피에 대한 지금 부피의 비
    get volumeRatio() { return free(h) / free(h1); },
    get top() { return floor - h; },
    get inner() { return inner(); },
    get external() { return ext; },
    get temp() { return tempC; },
    get speed() { return speed(); },
    // 1초 동안 피스톤(위쪽 벽)에 부딪힌 횟수(부드럽게 평균한 값)
    get hitsPerSecond() { return hitRate; },
    setTemp(c) { tempC = c; },
    setExternal(atm) { ext = atm; },
    setArrows(on) { showArrows = on; },
    // 화면을 처음 상태로 돌릴 때: 높이를 곧바로 평형 높이로 맞춰요.
    settle() { h = Math.max(minH, Math.min(maxH, 2 * r + free(h1) * (speed() / particleSpeed(20, baseSpeed)) ** 2 / ext)); },
    step(dt, { flashes = true } = {}) {
      // 피스톤: 내부 압력이 크면 올라가고, 작으면 내려가요. 같아지면 멈춰요.
      const push = inner() / ext - 1;
      h = Math.max(minH, Math.min(maxH, h + push * h1 * ease * dt));
      const v = speed(), top = floor - h;
      let n = 0;
      for (const p of parts) {
        p.x += p.dx * v * dt; p.y += p.dy * v * dt;
        if (p.x < x + r) { p.x = 2 * (x + r) - p.x; p.dx = Math.abs(p.dx); }
        if (p.x > x + w - r) { p.x = 2 * (x + w - r) - p.x; p.dx = -Math.abs(p.dx); }
        if (p.y > floor - r) { p.y = 2 * (floor - r) - p.y; p.dy = -Math.abs(p.dy); }
        if (p.y < top + r) {
          p.y = Math.min(floor - r, 2 * (top + r) - p.y); p.dy = Math.abs(p.dy);
          n += 1; if (flashes) flash(p.x, top, v > particleSpeed(40, baseSpeed));
        }
      }
      hits += n;
      const k = Math.min(1, dt / 1.2);
      hitRate += (n / Math.max(dt, 1e-3) - hitRate) * k;
      return n;
    },
    render() {
      const len = 4 + speed() * .09;
      parts.forEach((p, i) => {
        dots[i].setAttribute('cx', p.x.toFixed(1)); dots[i].setAttribute('cy', p.y.toFixed(1));
        arrows[i].setAttribute('d', showArrows ? `M${p.x.toFixed(1)} ${p.y.toFixed(1)} l${(p.dx * len).toFixed(1)} ${(p.dy * len).toFixed(1)}` : '');
      });
    },
  };
}
