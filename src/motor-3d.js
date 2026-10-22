// 전동기 실험의 3D 화면(three.js). 물리 계산은 motor.js의 상태(angle, phase …)를 그대로 쓰고,
// 화살표의 방향은 src/motor-physics.js에서 F = I L × B로 직접 구한 값을 써요.
// 화면을 끌면 돌려 볼 수 있고, 시점 단추(비스듬히·축을 따라·위에서)로 부드럽게 옮겨 가요.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MOTOR, SIMPLE, motorSides, motorField, coilTurn, simpleField, ringPoint, bareFacingDown } from './motor-physics.js';

const Y = new THREE.Vector3(0, 1, 0);
const COLORS = { copper: 0xd88a4a, brass: 0xe8c15a, current: 0xffd166, force: 0xff5d5d, field: 0x5fe0ff, north: 0xe04848, south: 0x3a6fd8 };
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
function label(text, { color = '#eef1ff', size = .34, bg = null } = {}) {
  const { tex, aspect } = textTexture(text, color, bg);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(size * aspect, size, 1); s.renderOrder = 10;
  return s;
}
// 물체 면에 붙는 글자(자석의 N, S)
function decal(text, size, color = '#ffffff') {
  const { tex } = textTexture(text, color);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 140 / 128), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.renderOrder = 2;
  return m;
}
// 굵은 화살표(원기둥 + 원뿔). +y 방향으로 만들고 setArrow로 방향과 길이를 정해요.
function arrow(color, radius = .045, opacity = 1) {
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .55, roughness: .4, transparent: opacity < 1, opacity });
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.8, radius * 7, 18), mat);
  g.add(shaft, head); g.userData = { shaft, head, headLen: radius * 7 };
  return g;
}
function setArrow(a, origin, dir, length) {
  const d = new THREE.Vector3(...dir).normalize(), { shaft, head, headLen } = a.userData;
  a.position.set(...origin); a.quaternion.setFromUnitVectors(Y, d);
  const body = Math.max(.01, length - headLen);
  shaft.scale.y = body; shaft.position.y = body / 2; head.position.y = body + headLen / 2;
}
const worldDir = obj => Y.clone().applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion())).toArray().map(v => +v.toFixed(3));
// 꺾인 선을 따라 만든 전선(튜브)
function wire(points, radius, material) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  return { mesh: new THREE.Mesh(new THREE.TubeGeometry(path, points.length * 24, radius, 10, false), material), path };
}
function softwareRenderer() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return /swiftshader|llvmpipe|software|basic render/i.test(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '');
  } catch { return false; }
}
const ease = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createMotor3D({ stage, svg, reducedMotion }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'motor3d';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '자석 사이에서 회전하는 코일의 3D 모습. 끌어서 돌려 볼 수 있어요.');
  stage.insertBefore(canvas, svg);

  // 그래픽 카드 없이 그리는 기기(소프트웨어 렌더러)는 처음부터 가벼운 화질로 시작해요.
  const soft = softwareRenderer();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !soft, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .55;
  const sky = new THREE.HemisphereLight(0xc8d8ff, 0x141a33, .9); scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(4, 8, 6); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6fa8ff, .9); rim.position.set(-6, 3, -5); scene.add(rim);
  const glow = new THREE.PointLight(0xffb36b, 0, 6, 1.6); scene.add(glow);

  const camera = new THREE.PerspectiveCamera(32, 800 / 440, .1, 100);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: !reducedMotion.matches, dampingFactor: .08, enablePan: false, enableZoom: false, rotateSpeed: .8, minPolarAngle: .05, maxPolarAngle: Math.PI * .62 });
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.ROTATE };

  const mat = {
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

  /* ---------- 전동기의 원리 ---------- */
  const motor = new THREE.Group(); scene.add(motor);
  const R = MOTOR.radius, HL = MOTOR.length / 2, ZC = 1.78, RC = .28;
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.8, .24, 5.3), mat.dark); base.position.set(0, -2.74, .45); motor.add(base);
  // 자석: 왼쪽·오른쪽 블록. 극을 바꾸면 색과 글자가 바뀌어요.
  const magnets = [-1, 1].map(side => {
    const g = new THREE.Group(); g.position.x = side * 2.4;
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.7, 2.9), mat.north); g.add(block);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.25, 2.4), mat.carbon); stand.position.y = -1.98; g.add(stand);
    const letters = {};
    for (const p of ['N', 'S']) {
      const front = decal(p, 1); front.position.set(0, .1, 1.452);
      const top = decal(p, .9); top.rotation.x = -Math.PI / 2; top.position.set(0, 1.352, .2);
      const inner = decal(p, .9); inner.rotation.y = -side * Math.PI / 2; inner.position.set(-side * .652, .1, 0);
      top.userData.top = true; // 윗면 글자는 위에서 내려다볼 때만 보여요(비스듬히 보면 글자가 눕혀져 헷갈려요).
      letters[p] = [front, top, inner]; g.add(front, top, inner);
    }
    motor.add(g);
    return { block, letters };
  });
  // 회전하는 부분: 코일(3번 감음), 축, 금색 고리(정류자) 반쪽 둘
  const rotor = new THREE.Group(); motor.add(rotor);
  for (const dy of [-.075, 0, .075]) {
    rotor.add(wire([[R, dy, HL], [R, dy, -HL], [-R, dy, -HL], [-R, dy, HL], [R, dy, HL]], .042, mat.copper).mesh);
  }
  // 전류가 흐르는 길: 고리 반쪽 A → 변 A(앞→뒤) → 뒤쪽 → 변 B(뒤→앞) → 고리 반쪽 B
  const loop = wire([[RC, 0, ZC - .2], [R, 0, HL], [R, 0, -HL], [-R, 0, -HL], [-R, 0, HL], [-RC, 0, ZC - .2]], .045, mat.copper);
  rotor.add(loop.mesh);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 4.1, 16), mat.steel); axle.rotation.x = Math.PI / 2; axle.position.z = .25; rotor.add(axle);
  // CylinderGeometry를 x축으로 90° 돌리면 θ가 xy 평면의 각도 θ − 90°가 돼요. 반쪽 A는 변 A 쪽(각도 0)을 중심으로 해요.
  const halfA = new THREE.Mesh(new THREE.CylinderGeometry(RC, RC, .42, 32, 1, false, Math.PI / 2 - 1.47, 2.94), mat.brass);
  const halfB = new THREE.Mesh(new THREE.CylinderGeometry(RC, RC, .42, 32, 1, false, Math.PI * 1.5 - 1.47, 2.94), mat.brass);
  for (const h of [halfA, halfB]) { h.rotation.x = Math.PI / 2; h.position.z = ZC; rotor.add(h); }
  const halfDotA = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), mat.dot); halfDotA.position.set(RC + .01, 0, ZC); rotor.add(halfDotA);
  // 고정된 부분: 브러시, 받침 기둥, 전선, 전지
  const brushes = [-1, 1].map(side => { const b = new THREE.Mesh(new THREE.BoxGeometry(.3, .34, .3), mat.carbon); b.position.set(side * (RC + .15), 0, ZC); motor.add(b); return b; });
  for (const z of [-1.85, ZC + .38]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.22, 2.62, .22), mat.carbon); post.position.set(0, -1.31, z); motor.add(post); }
  const BY = -2.3, BZ = ZC + .85;
  for (const side of [-1, 1]) motor.add(wire([[side * (RC + .3), 0, ZC], [side * 1.45, 0, ZC], [side * 1.45, BY, ZC], [side * 1.45, BY, BZ], [side * 1.05, BY, BZ]], .035, mat.wire).mesh);
  const battery = new THREE.Group(); battery.position.set(0, BY, BZ); motor.add(battery);
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, 1.9, 28), mat.copper); cell.rotation.z = Math.PI / 2; battery.add(cell);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.306, .306, .5, 28), mat.dark); cap.rotation.z = Math.PI / 2; battery.add(cap);
  const batLabels = { '+': [-1, 1].map(s => { const l = label('+', { size: .42, color: '#ffd166' }); l.position.set(s * 1.3, .42, 0); battery.add(l); return l; }), '−': [-1, 1].map(s => { const l = label('−', { size: .42, color: '#9fdcff' }); l.position.set(s * 1.3, .42, 0); battery.add(l); return l; }) };
  const motorTexts = [label('전지', { size: .26, color: '#aab4d6' }), label('브러시', { size: .24, color: '#aab4d6' }), label('금색 고리', { size: .24, color: '#e8c15a' })];
  motorTexts[0].position.set(0, BY - .62, BZ); motorTexts[1].position.set(-1.0, -.42, ZC + .1); motorTexts[2].position.set(.72, -.42, ZC + .25);
  motor.add(...motorTexts);
  // 전류 알갱이(전류의 방향으로 흘러요), 전류·힘·자기장 화살표
  const dots = Array.from({ length: 22 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), mat.dot); rotor.add(d); return d; });
  const currentArrows = [0, 1].map(() => { const a = arrow(COLORS.current, .04); rotor.add(a); return a; });
  const forceArrows = [0, 1].map(() => { const a = arrow(COLORS.force, .06); motor.add(a); return a; });
  const forceLabels = [0, 1].map(() => { const l = label('힘', { size: .3, color: '#ff9a9a' }); motor.add(l); return l; });
  const currentLabel = label('전류', { size: .26, color: '#ffd166' }); motor.add(currentLabel);
  const fieldArrows = [];
  for (const y of [-.85, .85]) for (const z of [-.95, 0, .95]) { const a = arrow(COLORS.field, .025, .75); a.userData.at = [y, z]; fieldArrows.push(a); motor.add(a); }
  const fieldLabel = label('자기장 (N → S)', { size: .26, color: '#5fe0ff' }); fieldLabel.position.set(0, 1.75, -.4); motor.add(fieldLabel);

  /* ---------- 간이 전동기 ---------- */
  const simple = new THREE.Group(); scene.add(simple);
  const RR = SIMPLE.radius, AY = .55;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(4.6, .16, 2.4), mat.dark); plate.position.y = -2.62; simple.add(plate);
  const sCell = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 2.9, 36), mat.copper); sCell.rotation.z = Math.PI / 2; sCell.position.y = -1.94; simple.add(sCell);
  const sCap = new THREE.Mesh(new THREE.CylinderGeometry(.608, .608, .7, 36), mat.dark); sCap.rotation.z = Math.PI / 2; sCap.position.set(-1.1, -1.94, 0); simple.add(sCap);
  const nub = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .14, 20), mat.steel); nub.rotation.z = Math.PI / 2; nub.position.set(1.52, -1.94, 0); simple.add(nub);
  const neo = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .3, 40), mat.steel); neo.position.y = -1.2; simple.add(neo);
  const neoLetters = { N: decal('N', .55, '#1b1f2e'), S: decal('S', .55, '#1b1f2e') };
  for (const d of Object.values(neoLetters)) { d.rotation.x = -Math.PI / 2; d.position.set(0, -1.045, 0); simple.add(d); }
  // 받침대(구리판): 건전지 양 끝에서 올라와 고리로 축을 받쳐요.
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.07, 2.55, .28), mat.copper); strip.position.set(side * 1.62, AY - 1.27, 0); simple.add(strip);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(.11, .035, 10, 24), mat.copper); eye.rotation.y = Math.PI / 2; eye.position.set(side * 1.62, AY, 0); simple.add(eye);
  }
  const ring = new THREE.Group(); ring.position.y = AY; simple.add(ring);
  for (const dz of [-.05, 0, .05]) { const t = new THREE.Mesh(new THREE.TorusGeometry(RR, .032, 10, 96), mat.copper); t.position.z = dz; ring.add(t); }
  for (const side of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .9, 10), mat.copper); a.rotation.z = Math.PI / 2; a.position.x = side * (RR + .43); ring.add(a); }
  // 오른쪽 끝: 반만 벗김이면 위쪽 반은 에나멜(검붉은색), 아래쪽 반(코일에 붙은 좌표의 −y)은 구리가 드러나 있어요.
  // 원기둥을 z축으로 90° 돌리면 θ 방향이 (y, z) = (sin θ, cos θ)가 돼요: θ = π…2π가 −y 쪽 반이에요.
  const coatBare = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .34, 20, 1, false, Math.PI, Math.PI), mat.copper);
  const coatTop = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .34, 20, 1, false, 0, Math.PI), mat.enamel);
  for (const c of [coatBare, coatTop]) { c.rotation.z = Math.PI / 2; c.position.x = 1.55; ring.add(c); }
  const spark = label('⚡', { size: .5 }); spark.position.set(1.62, AY - .3, .3); simple.add(spark);
  const ringDots = Array.from({ length: 18 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), mat.dot); simple.add(d); return d; });
  const simpleFieldArrows = Array.from({ length: 5 }, (_, i) => { const a = arrow(COLORS.field, .025, .75); a.userData.x = (i - 2) * .42; simple.add(a); return a; });
  const simpleTexts = [label('건전지', { size: .26, color: '#aab4d6' }), label('네오디뮴 자석', { size: .24, color: '#aab4d6' }), label('반만 벗긴 끝', { size: .24, color: '#e8c15a' })];
  simpleTexts[0].position.set(.45, -1.94, .9); simpleTexts[1].position.set(-1.25, -1.05, .7); simpleTexts[2].position.set(1.75, AY + .45, 0);
  simple.add(...simpleTexts);

  let mode = 'motor', tween = null, dirty = true, size = [0, 0], frames = 0, last = {}, flowU = 0, ringU = 0, renderMs = 0;

  /* ---------- 화질 자동 조절 ----------
     프레임이 느려지면(초당 약 40프레임 아래) 해상도를 한 단계씩 낮추고, 반사 표현을 빼서 움직임이 끊기지 않게 해요. */
  const dpr = devicePixelRatio || 1;
  const LEVELS = [{ pr: Math.min(dpr, 2), env: true }, { pr: Math.min(dpr, 1.5), env: true }, { pr: Math.min(dpr, 1), env: false }, { pr: .75, env: false }];
  const metals = Object.values(mat).filter(m => m.metalness > .5);
  metals.forEach(m => { m.userData.metalness = m.metalness; });
  let level = -1, slow = { ema: 16, n: 0, prev: 0 };
  function setQuality(next) {
    level = Math.min(LEVELS.length - 1, next);
    const q = LEVELS[level];
    renderer.setPixelRatio(q.pr);
    scene.environment = q.env ? envMap : null;
    sky.intensity = q.env ? .9 : 1.9; // 반사 표현이 없으면 금속이 어두워 보여서 하늘빛을 밝히고 금속 느낌을 줄여요.
    metals.forEach(m => { m.metalness = q.env ? m.userData.metalness : m.userData.metalness * .35; });
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
  const VIEWS = {
    motor: { target: [0, -.6, .3], oblique: [5.8, 3.6, 9.4], axis: [0, -.3, 11.5], top: [0, 11.5, .3] },
    simple: { target: [0, -.75, 0], oblique: [3.4, 2.3, 7.9], axis: [8.6, .3, 0], top: [0, 8.8, .3] },
  };
  function setView(name, animate = true) {
    const v = VIEWS[mode], target = new THREE.Vector3(...v.target);
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
  const ro = new ResizeObserver(resize); ro.observe(svg);
  setQuality(soft ? 3 : 0); resize();

  /* ---------- 매 프레임 ---------- */
  function paintMotor(s, dt) {
    const turn = coilTurn(s.angle);
    rotor.rotation.z = turn;
    const sides = motorSides(s.angle, s.current, s.magnet), flowing = s.on;
    for (const [i, side] of [-1, 1].entries()) {
      const isN = (s.magnet > 0) === (side > 0);
      magnets[i].block.material = isN ? mat.north : mat.south;
      const high = camera.position.y - controls.target.y > .8 * camera.position.distanceTo(controls.target);
      magnets[i].letters.N.forEach(m => { m.visible = isN && (!m.userData.top || high); }); magnets[i].letters.S.forEach(m => { m.visible = !isN && (!m.userData.top || high); });
    }
    // 전지: current > 0이면 왼쪽이 −극, 오른쪽이 +극이에요(2D 그림과 같아요).
    batLabels['+'][0].visible = s.current < 0; batLabels['+'][1].visible = s.current > 0;
    batLabels['−'][0].visible = s.current > 0; batLabels['−'][1].visible = s.current < 0;
    mat.copper.emissiveIntensity = flowing ? .28 : 0;
    glow.intensity = flowing ? 3 : 0;
    // 전류 알갱이: 길을 따라 흘러요. 변 A의 전류가 뒤쪽(−z)이면 길의 순방향이에요.
    const sideA = sides[0], forward = sideA.I[2] < 0 ? 1 : -1;
    if (flowing && !reducedMotion.matches) flowU = (flowU + forward * dt * (.16 + .1 * s.vIndex) + 1) % 1;
    dots.forEach((d, i) => { d.visible = flowing; if (flowing) d.position.copy(loop.path.getPointAt((flowU + i / dots.length) % 1)); });
    // 전류 화살표(코일에 붙어 함께 돌아요). 변 A는 코일 좌표의 +x, 변 B는 −x에 있어요.
    currentArrows.forEach((a, i) => {
      a.visible = s.show && flowing;
      setArrow(a, [(i ? -1 : 1) * (R + .22), 0, -sides[i].I[2] * .5], [0, 0, sides[i].I[2]], 1);
    });
    const leftIdx = sides[0].pos[0] < 0 ? 0 : 1;
    currentLabel.visible = s.show && flowing;
    currentLabel.position.set(sides[leftIdx].pos[0] - .35, sides[leftIdx].pos[1] + .32, .9);
    forceArrows.forEach((a, i) => {
      const { pos, F } = sides[i];
      a.visible = s.show && flowing;
      setArrow(a, [pos[0], pos[1] + Math.sign(F[1]) * .14, .35], F, 1.25);
      forceLabels[i].visible = a.visible;
      forceLabels[i].position.set(pos[0] + (pos[0] < 0 ? -.35 : .35), pos[1] + Math.sign(F[1]) * 1.3, .35);
    });
    const B = motorField(s.magnet);
    fieldArrows.forEach(a => { a.visible = s.show; const [y, z] = a.userData.at; setArrow(a, [-B[0] * 1.62, y, z], B, 3.24); });
    fieldLabel.visible = s.show;
    return { sides, B };
  }
  function paintSimple(s, dt) {
    ring.rotation.x = s.phase;
    const contact = s.on && s.contact;
    neoLetters.N.visible = s.magnet > 0; neoLetters.S.visible = s.magnet < 0;
    coatTop.material = s.stripping === 'half' ? mat.enamel : mat.copper;
    mat.copper.emissiveIntensity = contact ? .28 : 0;
    glow.intensity = contact ? 2.5 : 0;
    glow.position.set(0, AY, 0);
    spark.visible = contact;
    if (contact && !reducedMotion.matches) ringU = (ringU + dt * (.25 + .12 * s.vIndex)) % 1;
    ringDots.forEach((d, i) => { d.visible = contact; if (contact) { const p = ringPoint((ringU + i / ringDots.length) % 1, s.phase); d.position.set(p[0], p[1] + AY, p[2]); } });
    const B = simpleField(s.magnet);
    simpleFieldArrows.forEach(a => {
      a.visible = s.show;
      const x = a.userData.x, spread = x * .35;
      setArrow(a, B[1] > 0 ? [x, -1.0, 0] : [x + spread * .8, 1.1, 0], [B[1] > 0 ? spread : -spread, B[1] * 2.5, 0], 2.15);
    });
    return { contact, bareDown: bareFacingDown(s.phase), B };
  }

  const view = {
    canvas,
    setMode(next) {
      if (next === mode && frames) return;
      mode = next; motor.visible = mode === 'motor'; simple.visible = mode === 'simple';
      setView('oblique', false); dirty = true;
    },
    setView,
    update(s, dt) {
      resize();
      if (!size[0] || canvas.offsetParent === null) return;
      const moved = stepTween(dt) | controls.update();
      const sig = `${mode}|${s.angle.toFixed(4)}|${s.phase.toFixed(4)}|${s.on}|${s.show}|${s.current}|${s.magnet}|${s.stripping}|${s.contact}|${s.vIndex}`;
      const animating = s.on && (mode === 'motor' || s.contact);
      if (!dirty && !moved && !animating && sig === last.sig) return;
      last.sig = sig;
      last.info = mode === 'motor' ? paintMotor(s, dt) : paintSimple(s, dt);
      const t0 = performance.now();
      renderer.render(scene, camera);
      renderMs = renderMs * .9 + (performance.now() - t0) * .1;
      if (animating || moved) watchSpeed(); else slow.prev = 0;
      frames++; dirty = false;
      canvas.dataset.frames = frames;
    },
    // 시험용: 지금 화면에 그려진 화살표와 코일의 실제 방향을 알려 줘요.
    probe() {
      scene.updateMatrixWorld();
      return {
        mode, frames, renderMs, quality: level, pixelRatio: renderer.getPixelRatio(), soft,
        rotorTurn: rotor.rotation.z, ringPhase: ring.rotation.x,
        sides: last.info?.sides, field: last.info?.B,
        forceArrows: forceArrows.map(a => ({ visible: a.visible, dir: worldDir(a), at: a.getWorldPosition(new THREE.Vector3()).toArray() })),
        currentArrows: currentArrows.map(a => ({ visible: a.visible, dir: worldDir(a) })),
        fieldArrows: fieldArrows.filter(a => a.visible).map(worldDir),
        simpleField: simpleFieldArrows.filter(a => a.visible).map(worldDir),
        dotsVisible: dots.filter(d => d.visible).length + ringDots.filter(d => d.visible).length,
        contact: last.info?.contact, bareDown: last.info?.bareDown,
        brushLeftTouches: (() => { const p = halfDotA.getWorldPosition(new THREE.Vector3()); return p.x < 0 ? 'A' : 'B'; })(),
        brushX: brushes.map(b => b.position.x),
      };
    },
    invalidate() { dirty = true; },
  };
  canvas.probe = view.probe;
  view.setMode('motor');
  return view;
}
