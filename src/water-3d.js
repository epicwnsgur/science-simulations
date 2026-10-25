// 전류와 전압 실험의 3D 수로 모형(교과서 그림의 수로 모형을 입체로).
// 전기 회로 그림과 같은 자리에 같은 역할을 두어 서로 비교하기 쉽게 했어요.
//   앞쪽 가운데 펌프(= 전지) → 오른쪽의 높은 수로 → 뒤쪽 가운데 물레방아(= 전구)에서 물이 떨어짐 → 왼쪽의 낮은 수로 → 다시 펌프
// 펌프가 물을 높은 곳으로 끌어올려 높은 곳과 낮은 곳의 물의 높이 차(= 전압)를 만들고, 그 높이 차 때문에 물이 흘러(= 전류) 물레방아를 돌려요.
// 높은 수로와 낮은 수로는 각각 수평이에요(물은 물레방아에서만 떨어져요). 전선에서는 전압이 거의 줄지 않는 것과 같아요.
import { THREE, createStage3D, label } from './three-kit.js';

const X = 2, Z = 1.2;                 // 수로가 이루는 네모의 반 너비와 반 깊이
const LOW = 0, BASE_H = 1;            // 낮은 수로의 높이, 높은 수로를 만든 기준 높이
const HEIGHTS = { 1: 1, 2: 2 };       // 펌프 세기 1단·2단일 때 높은 수로의 높이(물의 높이 차)
const WHEEL = { y: .55, r: .48 };
// 상자(그림의 오른쪽 절반)가 거의 정사각형이라 카메라가 조금 멀리 물러나요(three-kit). 그만큼 가까이에서 봐요.
const VIEWS = { water: { target: [0, .7, 0], oblique: [3.4, 3.5, 4.8], front: [0, 1.3, 6.2], side: [6, 1.6, 0] } };
const NAMES = {
  pump: ['펌프', '펌프 = 전지'], channel: ['수로', '수로 = 전선'], wheel: ['물레방아', '물레방아 = 전구'],
  flow: ['물의 흐름', '물의 흐름 = 전류'], height: ['물의 높이 차', '높이 차 = 전압'],
};
// 짝을 찾았을 때 쓰는 색(전기 회로 그림의 같은 짝과 같은 색)
export const PAIR_COLORS = { pump: '#ffd166', channel: '#ff9f6b', wheel: '#ffe9a6', flow: '#7fd6ff', height: '#b9a6ff' };

export function createWater3D({ stage, box, reducedMotion }) {
  const kit = createStage3D({ stage, svg: box, reducedMotion, views: VIEWS, mode: 'water', ariaLabel: '펌프가 물을 높은 수로로 끌어올리고, 물이 물레방아를 돌리며 낮은 수로로 떨어지는 3D 수로 모형. 끌어서 돌려 볼 수 있어요.' });
  const { scene } = kit;

  const M = {
    trough: new THREE.MeshStandardMaterial({ color: 0x3b4a6e, roughness: .6, metalness: .2 }),
    post: new THREE.MeshStandardMaterial({ color: 0x5a6788, roughness: .7 }),
    water: new THREE.MeshStandardMaterial({ color: 0x2f8fe0, emissive: 0x0b3d72, emissiveIntensity: .6, roughness: .15, metalness: .1, transparent: true, opacity: .82 }),
    foam: new THREE.MeshBasicMaterial({ color: 0xd8f4ff }),
    pump: new THREE.MeshStandardMaterial({ color: 0x5b6c9e, roughness: .45, metalness: .5, emissive: 0xffd166, emissiveIntensity: 0 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa8743f, roughness: .7, emissive: 0xffe9a6, emissiveIntensity: 0 }),
    ruler: new THREE.MeshStandardMaterial({ color: 0xb9a6ff, emissive: 0xb9a6ff, emissiveIntensity: .35, transparent: true, opacity: .85 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x141b33, roughness: .95 }),
  };
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 48), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.06; scene.add(ground);

  // 수로(위가 열린 홈) 한 토막: a → b(같은 높이), 안에 물을 담아요.
  const W = .34, D = .2;
  function trough(a, b, parent, waters) {
    const g = new THREE.Group(), dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz) + W;
    g.position.set((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2); g.rotation.y = -Math.atan2(dz, dx);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(len, .05, W + .08), M.trough); floor.position.y = -D / 2;
    const wallA = new THREE.Mesh(new THREE.BoxGeometry(len, D, .04), M.trough); wallA.position.z = W / 2 + .02;
    const wallB = wallA.clone(); wallB.position.z = -W / 2 - .02;
    const water = new THREE.Mesh(new THREE.BoxGeometry(len - .02, D * .8, W), M.water); water.position.y = -D * .1;
    g.add(floor, wallA, wallB, water); parent.add(g); waters.push(water);
    return g;
  }
  // 높은 수로(앞 오른쪽 → 오른쪽 → 뒤 오른쪽)와 기둥: BASE_H 높이로 만들고 높이 차에 맞춰 올리고 내려요.
  const high = new THREE.Group(), highWaters = [], posts = [];
  scene.add(high);
  trough([.35, BASE_H, Z], [X, BASE_H, Z], high, highWaters);
  trough([X, BASE_H, Z], [X, BASE_H, -Z], high, highWaters);
  trough([X, BASE_H, -Z], [.32, BASE_H, -Z], high, highWaters);
  for (const [x, z] of [[1, Z], [X, Z], [X, 0], [X, -Z], [1, -Z]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 1, 10), M.post);
    p.position.set(x, 0, z); scene.add(p); posts.push(p);
  }
  // 낮은 수로(뒤 왼쪽 → 왼쪽 → 앞 왼쪽)
  const lowWaters = [];
  trough([-.3, LOW, -Z], [-X, LOW, -Z], scene, lowWaters);
  trough([-X, LOW, -Z], [-X, LOW, Z], scene, lowWaters);
  trough([-X, LOW, Z], [-.35, LOW, Z], scene, lowWaters);

  // 펌프(앞쪽 가운데): 몸통 + 물을 끌어올리는 관 + 돌아가는 날개
  const pump = new THREE.Group(); pump.position.set(0, 0, Z); scene.add(pump);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.7, .42, .55), M.pump); body.position.y = .12; pump.add(body);
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, 1, 16), M.pump); pump.add(riser);
  const riserWater = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1, 12), M.water); pump.add(riserWater);
  const fan = new THREE.Group(); fan.position.set(0, .12, .29); pump.add(fan);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.05, .3, .02), M.foam); b.rotation.z = i * Math.PI / 4 * 2; fan.add(b); }

  // 물레방아(뒤쪽 가운데): 축은 앞뒤(z) 방향, 물이 떨어지며 돌려요.
  const wheel = new THREE.Group(); wheel.position.set(0, WHEEL.y, -Z); scene.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.r * .8, .03, 8, 32), M.wood); wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, paddle = new THREE.Mesh(new THREE.BoxGeometry(.06, .2, .3), M.wood);
    paddle.position.set(Math.cos(a) * WHEEL.r, Math.sin(a) * WHEEL.r, 0); paddle.rotation.z = a; wheel.add(paddle);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(WHEEL.r, .03, .03), M.wood); spoke.rotation.z = a; spoke.position.set(Math.cos(a) * WHEEL.r / 2, Math.sin(a) * WHEEL.r / 2, 0); wheel.add(spoke);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .7, 10), M.post); axle.rotation.x = Math.PI / 2; axle.position.set(0, WHEEL.y, -Z); scene.add(axle);
  const fall = new THREE.Mesh(new THREE.BoxGeometry(.16, 1, .24), M.water); scene.add(fall);

  // 높이 차 자(물레방아 옆): 낮은 수로에서 높은 수로까지
  const ruler = new THREE.Group(); ruler.position.set(.85, 0, -Z - .55); scene.add(ruler);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.06, 1, .06), M.ruler); ruler.add(bar);
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(.32, .03, .06), M.ruler), capBottom = capTop.clone(); ruler.add(capTop, capBottom);

  // 물 알갱이(흐름이 보이게): 고리를 따라 움직여요.
  const DOTS = 54, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 10, 8), M.foam, DOTS); scene.add(dots);
  let path = null;
  function buildPath(h) {
    const pts = [[0, .05, Z], [0, h, Z], [X, h, Z], [X, h, -Z], [.3, h, -Z], [.12, WHEEL.y + WHEEL.r, -Z], [-.12, WHEEL.y - WHEEL.r * .6, -Z], [-.3, LOW, -Z], [-X, LOW, -Z], [-X, LOW, Z], [-.35, LOW, Z], [0, .05, Z]];
    const cp = new THREE.CurvePath();
    for (let i = 1; i < pts.length; i++) cp.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i - 1]), new THREE.Vector3(...pts[i])));
    return cp;
  }

  let h = HEIGHTS[1], level = 1, fill = 0, offset = 0, wheelAngle = 0, fanAngle = 0, flash = {}, matchedKey = '';
  // 이름표: 짝을 찾으면 ‘펌프 = 전지’처럼 바뀌고 짝의 색이 돼요.
  const labels = {};
  function setLabel(key, matched) {
    labels[key] && scene.remove(labels[key]);
    const s = label(NAMES[key][matched ? 1 : 0], { size: .3, color: matched ? '#0a1029' : '#eef1ff', bg: matched ? PAIR_COLORS[key] : '#0a1029cc' });
    labels[key] = s; scene.add(s); placeLabels();
  }
  function placeLabels() {
    labels.pump?.position.set(0, -.32, Z + .55);
    labels.wheel?.position.set(-.1, Math.max(h, 1.1) + .35, -Z - .2);
    labels.channel?.position.set(-X - .2, .45, 0);
    labels.flow?.position.set(1.1, h + .42, Z + .15);
    labels.height?.position.set(1.45, h / 2 + .1, -Z - .55);
  }
  Object.keys(NAMES).forEach(k => setLabel(k, false));

  const m4 = new THREE.Matrix4();
  function setHeight(next) {
    h = next;
    high.position.y = h - BASE_H;
    posts.forEach(p => { p.scale.y = h; p.position.y = h / 2 - .02; });
    riser.scale.y = h; riser.position.y = h / 2; riserWater.scale.y = h; riserWater.position.y = h / 2;
    bar.scale.y = h; bar.position.y = h / 2; capTop.position.y = h; capBottom.position.y = 0;
    fall.scale.y = Math.max(.1, h - LOW); fall.position.set(0, (h + LOW) / 2, -Z + .02);
    path = buildPath(h); placeLabels();
  }
  setHeight(h);
  kit.start(M);

  return {
    ...kit,
    get height() { return h; },
    // state: { on: 펌프 작동, level: 1|2, matched: Set(짝을 찾은 이름), flash: 방금 찾은 짝 }
    update(dt, { on, level: nextLevel = 1, matched = new Set(), flash: justMatched = null }) {
      const key = [...matched].sort().join();
      if (key !== matchedKey) { Object.keys(NAMES).forEach(k => setLabel(k, matched.has(k))); matchedKey = key; }
      if (justMatched) flash[justMatched] = 1.6;
      if (nextLevel !== level) { level = nextLevel; }
      // 펌프를 켜면 높은 수로가 차오르고(높이 차가 생김), 끄면 물이 아래로 다 빠져 흐름이 멈춰요.
      const targetFill = on ? 1 : 0;
      const k = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 1.6);
      fill += (targetFill - fill) * k;
      const targetH = HEIGHTS[level];
      if (Math.abs(h - targetH) > .001) setHeight(h + (targetH - h) * (reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 2.4)));
      const speed = fill * h * .09;   // 높이 차가 클수록 물이 빨리 흘러요.
      offset = (offset + dt * speed) % 1;
      wheelAngle += dt * fill * h * 2.4; fanAngle += dt * fill * h * 9;
      for (const f of Object.keys(flash)) { flash[f] -= dt; if (flash[f] <= 0) delete flash[f]; }
      const moving = fill > .02 || Object.keys(flash).length > 0 || Math.abs(fill - targetFill) > .01;
      return kit.draw({
        dt, sig: JSON.stringify([on, level, key, h.toFixed(3)]), animating: moving,
        paint: () => {
          highWaters.forEach(w => { w.scale.y = Math.max(.05, fill); w.position.y = -D * .1 - D * .4 * (1 - fill); });
          riserWater.visible = fill > .05; fall.visible = fill > .05; fall.scale.x = Math.max(.2, fill);
          wheel.rotation.z = wheelAngle; fan.rotation.z = fanAngle;
          for (let i = 0; i < DOTS; i++) {
            const u = (i / DOTS + offset) % 1, p = path.getPointAt(u);
            const onHigh = p.y > LOW + .2 && !(Math.abs(p.x) < .35 && p.z < 0);
            const visible = fill > .05 || !onHigh;
            m4.makeScale(visible ? 1 : 0, visible ? 1 : 0, visible ? 1 : 0).setPosition(p.x, p.y + .07, p.z);
            dots.setMatrixAt(i, m4);
          }
          dots.instanceMatrix.needsUpdate = true;
          const glow = (name, mat, base = 0) => { mat.emissiveIntensity = base + (flash[name] ? .9 * Math.min(1, flash[name]) : 0); };
          glow('pump', M.pump); glow('wheel', M.wood); glow('height', M.ruler, .35);
          M.water.emissiveIntensity = .6 + (flash.flow || flash.channel ? .8 : 0);
        },
      });
    },
  };
}
