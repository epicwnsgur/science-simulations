// 3D 실험 화면의 공통 부품(three.js). 실험마다 장면(물체)만 만들고, 아래 것들은 함께 써요.
// - 그림(svg) 자리에 겹치는 캔버스, 조명·반사, 끌어서 돌려 보는 카메라, 시점 단추로 부드럽게 옮겨 가기
// - 화질 자동 조절: 프레임이 느려지면 해상도와 반사 표현을 한 단계씩 낮춰 움직임이 끊기지 않게 해요.
// - 움직임이 없으면 다시 그리지 않아요(배터리 절약).
// - 이름표(글자), 면에 붙는 글자, 굵은 화살표, 전선(튜브)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };
export const COLORS = { copper: 0xd88a4a, brass: 0xe8c15a, current: 0xffd166, force: 0xff5d5d, field: 0x5fe0ff, north: 0xe04848, south: 0x3a6fd8 };
const Y = new THREE.Vector3(0, 1, 0);
const FONT = "800 96px Pretendard, 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

// 글자 그림(캔버스) → 텍스처
function textTexture(text, color, bg) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  ctx.font = FONT;
  const w = Math.max(128, Math.ceil(ctx.measureText(text).width) + 48);
  c.width = w; c.height = 140;
  ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (bg) { ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(4, 14, w - 8, 112, 28); ctx.fill(); }
  ctx.shadowColor = '#000c'; ctx.shadowBlur = bg ? 0 : 10;
  ctx.fillStyle = color; ctx.fillText(text, w / 2, 76);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { tex, aspect: w / c.height };
}
// 늘 화면을 향하는 이름표
export function label(text, { color = '#eef1ff', size = .34, bg = null } = {}) {
  const { tex, aspect } = textTexture(text, color, bg);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(size * aspect, size, 1); s.renderOrder = 10;
  return s;
}
// 물체 면에 붙는 글자(자석의 N, S 등). 처음에는 +z 쪽을 향해요.
export function decal(text, size, color = '#ffffff') {
  const { tex } = textTexture(text, color);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 140 / 128), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.renderOrder = 2;
  return m;
}
// 굵은 화살표(원기둥 + 원뿔). +y 방향으로 만들고 setArrow로 방향과 길이를 정해요.
export function arrow(color, radius = .045, opacity = 1) {
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .55, roughness: .4, transparent: opacity < 1, opacity });
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.8, radius * 7, 18), mat);
  g.add(shaft, head); g.userData = { shaft, head, headLen: radius * 7 };
  return g;
}
export function setArrow(a, origin, dir, length) {
  const d = new THREE.Vector3(...dir).normalize(), { shaft, head, headLen } = a.userData;
  a.position.set(...origin); a.quaternion.setFromUnitVectors(Y, d);
  const body = Math.max(.01, length - headLen);
  shaft.scale.y = body; shaft.position.y = body / 2; head.position.y = body + headLen / 2;
}
// 물체의 +y(화살표 방향, 나침반 바늘의 N극 등)가 지금 세계 좌표에서 향하는 방향(시험용)
export const worldDir = (obj, axis = Y) => axis.clone().applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion())).toArray().map(v => +v.toFixed(3));
// 꺾인 선을 따라 만든 전선(튜브). path로 전류 알갱이를 움직일 수 있어요.
export function wire(points, radius, material) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  return { mesh: new THREE.Mesh(new THREE.TubeGeometry(path, points.length * 24, radius, 10, false), material), path };
}
export function materials() {
  return {
    copper: new THREE.MeshStandardMaterial({ color: COLORS.copper, metalness: .75, roughness: .32, emissive: 0xff8a3d, emissiveIntensity: 0 }),
    brass: new THREE.MeshStandardMaterial({ color: COLORS.brass, metalness: .85, roughness: .25 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9d1db, metalness: .8, roughness: .3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1c2442, metalness: .2, roughness: .7 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x3a3f4f, roughness: .8 }),
    wire: new THREE.MeshStandardMaterial({ color: 0x8f9bc4, metalness: .3, roughness: .5 }),
    north: new THREE.MeshStandardMaterial({ color: COLORS.north, roughness: .45, metalness: .1 }),
    south: new THREE.MeshStandardMaterial({ color: COLORS.south, roughness: .45, metalness: .1 }),
    enamel: new THREE.MeshStandardMaterial({ color: 0x7a2e12, roughness: .5, metalness: .2 }),
    dot: new THREE.MeshBasicMaterial({ color: COLORS.current }),
  };
}

function softwareRenderer() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return /swiftshader|llvmpipe|software|basic render/i.test(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '');
  } catch { return false; }
}
const ease = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/* stage: 실험 화면(.stage), svg: 겹칠 그림(#scene), views: { 모드: { target, 시점 이름: 카메라 위치, … } }
   돌려주는 값의 draw({ dt, sig, animating, paint })를 실험의 프레임마다 불러요.
   sig(상태를 나타내는 글자)가 그대로이고 animating이 아니면 다시 그리지 않아요. */
export function createStage3D({ stage, svg, reducedMotion, ariaLabel, views, mode: firstMode }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'lab3d';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', ariaLabel);
  stage.insertBefore(canvas, svg);

  // 그래픽 카드 없이 그리는 기기(소프트웨어 렌더러)는 처음부터 가벼운 화질로 시작해요.
  const soft = softwareRenderer();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !soft, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const envMap = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .55;
  const sky = new THREE.HemisphereLight(0xc8d8ff, 0x141a33, .9); scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(4, 8, 6); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6fa8ff, .9); rim.position.set(-6, 3, -5); scene.add(rim);
  const glow = new THREE.PointLight(0xffb36b, 0, 6, 1.6); scene.add(glow);

  const camera = new THREE.PerspectiveCamera(32, 800 / 440, .1, 100);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: !reducedMotion.matches, dampingFactor: .08, enablePan: false, enableZoom: false, rotateSpeed: .8, minPolarAngle: .05, maxPolarAngle: Math.PI * .62 });
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.ROTATE };

  let mode = firstMode, tween = null, dirty = true, size = [0, 0], frames = 0, renderMs = 0, lastSig = '';

  /* ---------- 화질 자동 조절 ---------- */
  const dpr = devicePixelRatio || 1;
  const LEVELS = [{ pr: Math.min(dpr, 2), env: true }, { pr: Math.min(dpr, 1.5), env: true }, { pr: Math.min(dpr, 1), env: false }, { pr: .75, env: false }];
  let level = -1, slow = { ema: 16, n: 0, prev: 0 };
  const known = new Set(); // 장면에 잠깐 없는 재질(바꿔 끼우는 재질)도 화질에 맞춰요.
  function setQuality(next) {
    level = Math.min(LEVELS.length - 1, next);
    const q = LEVELS[level];
    renderer.setPixelRatio(q.pr);
    scene.environment = q.env ? envMap : null;
    sky.intensity = q.env ? .9 : 1.9; // 반사 표현이 없으면 금속이 어두워 보여서 하늘빛을 밝히고 금속 느낌을 줄여요.
    const all = new Set(known);
    scene.traverse(o => { if (o.material) all.add(o.material); });
    for (const m of all) {
      if (!('metalness' in m)) continue;
      m.userData.metalness ??= m.metalness;
      m.metalness = q.env || m.userData.metalness <= .5 ? m.userData.metalness : m.userData.metalness * .35;
    }
    size = [0, 0]; slow = { ema: 16, n: 0, prev: 0 }; dirty = true;
  }
  function watchSpeed() {
    const now = performance.now(), gap = now - slow.prev;
    slow.prev = now;
    if (gap > 1000) { slow.n = 0; return; } // 탭을 옮겼다 온 경우 등은 빼요.
    slow.ema += (gap - slow.ema) * .08; slow.n++;
    if (slow.n > 45 && slow.ema > 24 && level < LEVELS.length - 1) setQuality(level + 1);
  }

  /* ---------- 시점 ---------- */
  function setView(name, animate = true) {
    const v = views[mode], target = new THREE.Vector3(...v.target);
    const to = new THREE.Spherical().setFromVector3(new THREE.Vector3(...v[name]).sub(target));
    if (!animate || reducedMotion.matches) { controls.target.copy(target); camera.position.setFromSpherical(to).add(target); controls.update(); tween = null; dirty = true; return; }
    const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    let dTheta = to.theta - from.theta; dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    tween = { t: 0, from, to: { radius: to.radius, phi: to.phi, theta: from.theta + dTheta }, t0: controls.target.clone(), t1: target };
  }
  function stepTween(dt) {
    if (!tween) return false;
    tween.t = Math.min(1, tween.t + dt / .75);
    const k = ease(tween.t), f = tween.from, t = tween.to;
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    camera.position.setFromSpherical(new THREE.Spherical(f.radius + (t.radius - f.radius) * k, f.phi + (t.phi - f.phi) * k, f.theta + (t.theta - f.theta) * k)).add(controls.target);
    camera.lookAt(controls.target);
    if (tween.t >= 1) tween = null;
    return true;
  }
  controls.addEventListener('start', () => { tween = null; canvas.classList.add('grabbing'); });
  controls.addEventListener('end', () => canvas.classList.remove('grabbing'));
  controls.addEventListener('change', () => { dirty = true; });

  function resize() {
    const w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) return;
    Object.assign(canvas.style, { left: `${svg.offsetLeft}px`, top: `${svg.offsetTop}px`, width: `${w}px`, height: `${h}px` });
    if (w === size[0] && h === size[1]) return;
    size = [w, h];
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.zoom = Math.min(1, camera.aspect / 1.7); // 휴대폰처럼 화면이 좁으면 조금 멀리서 봐서 장치 전체가 보여요.
    camera.updateProjectionMatrix(); dirty = true;
  }
  new ResizeObserver(resize).observe(svg);

  const kit = {
    canvas, scene, camera, controls, renderer, glow, soft,
    get mode() { return mode; },
    // 처음 한 번은 장면을 다 만든 뒤 불러요(장면 속 금속 재질까지 화질에 맞추려고). mats: 바꿔 끼우는 재질들
    start(mats = {}) { Object.values(mats).forEach(m => known.add(m)); setQuality(soft ? 3 : 0); resize(); setView('oblique', false); },
    setMode(next) { if (next === mode && frames) return false; mode = next; setView('oblique', false); dirty = true; return true; },
    setView,
    // 위에서 내려다보는 중인지(윗면 글자를 보여 줄 때 써요)
    lookingDown() { return camera.position.y - controls.target.y > .8 * camera.position.distanceTo(controls.target); },
    draw({ dt, sig, animating = false, paint }) {
      resize();
      if (!size[0] || canvas.offsetParent === null) return false;
      const moved = stepTween(dt) | controls.update();
      if (!dirty && !moved && !animating && sig === lastSig) return false;
      lastSig = sig;
      paint();
      const t0 = performance.now();
      renderer.render(scene, camera);
      renderMs = renderMs * .9 + (performance.now() - t0) * .1;
      if (animating || moved) watchSpeed(); else slow.prev = 0;
      frames++; dirty = false;
      canvas.dataset.frames = frames;
      return true;
    },
    invalidate() { dirty = true; },
    stats() { return { frames, renderMs, quality: level, pixelRatio: renderer.getPixelRatio(), soft }; },
  };
  return kit;
}
