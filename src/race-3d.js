// 레이싱 번호 뽑기의 3D 중계 화면(three.js). 경주 계산은 race-draw.js가 하고, 여기서는 같은 차·같은 시각을 3D로 보여 줘요.
// - 서킷 바닥은 2D 지도와 같은 그림(paintGround)을 큰 텍스처로 깔고, 그 위에 방호벽·광고판·관중석·피트·조명탑·출발 신호 다리·나무·도시 불빛을 세워요.
// - 차는 모양이 모두 같아서 InstancedMesh로 한꺼번에 그려요(100대여도 그리기 호출이 몇 번뿐이에요). 번호는 차 위의 번호판(스프라이트)으로 보여 줘요.
// - 카메라: 자동 중계(탑승·추격·트랙 옆·헬기·결승선 카메라를 바꿔 가며 보여 줌), 탑승, 추격, 헬기.
// 논리 좌표(x, y)를 그대로 3D의 (x, z)로 써요. 높이(y)도 같은 단위예요.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SHOT_NAMES = {
  onboard: '탑승 카메라', tcam: '머리 위 탑승 카메라', chase: '추격 카메라', battle: '추격 카메라', trackside: '트랙 옆 카메라',
  heli: '헬기 카메라', finish: '결승선 카메라', grid: '출발 그리드', start: '출발 신호',
};
const AUTO_SEQUENCE = ['tcam', 'chase', 'trackside', 'onboard', 'heli', 'battle', 'trackside', 'chase', 'onboard'];
const BOARDS = ['준혁T 그랑프리', '과학 실험실', '호기심 서킷', '탐구 모터스', '번호 뽑기 컵', '우주 레이싱', '실험 정신', '안전 운전'];
const BOARD_COLORS = ['#d62828', '#1d4ed8', '#f59e0b', '#059669', '#7c3aed', '#db2777', '#0891b2', '#ea580c'];

function softwareRenderer() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return /swiftshader|llvmpipe|software|basic render/i.test(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '');
  } catch { return false; }
}
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glowTexture = () => canvasTexture(64, 64, (k) => {
  const g = k.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  k.fillStyle = g; k.fillRect(0, 0, 64, 64);
});
function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

/* ---------- 차 모양(길이 1, 앞이 +x). 몸체(색), 검은 부품, 헬멧으로 나눠요. ---------- */
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }
function wheel(r, wd, x, z) { const g = new THREE.CylinderGeometry(r, r, wd, 18); g.rotateX(Math.PI / 2); g.translate(x, r, z); return g; }
function carGeometries() {
  const body = mergeGeometries([
    box(0.6, 0.075, 0.13, 0.1, 0.075, 0), // 운전석 몸통
    box(0.2, 0.05, 0.08, 0.48, 0.055, 0), // 앞코
    box(0.34, 0.08, 0.34, -0.08, 0.07, 0), // 옆구리
    box(0.38, 0.1, 0.12, -0.21, 0.14, 0), // 엔진 덮개
    box(0.08, 0.07, 0.07, -0.04, 0.2, 0), // 공기 흡입구
    box(0.1, 0.02, 0.36, -0.47, 0.25, 0), // 뒷날개 윗판
  ]);
  const dark = mergeGeometries([
    box(0.1, 0.015, 0.46, 0.53, 0.025, 0), box(0.1, 0.045, 0.012, 0.53, 0.04, 0.23), box(0.1, 0.045, 0.012, 0.53, 0.04, -0.23),
    box(0.12, 0.12, 0.012, -0.47, 0.2, 0.18), box(0.12, 0.12, 0.012, -0.47, 0.2, -0.18), box(0.04, 0.11, 0.03, -0.44, 0.17, 0),
    box(0.82, 0.012, 0.4, 0, 0.012, 0),
    wheel(0.075, 0.09, 0.33, 0.19), wheel(0.075, 0.09, 0.33, -0.19), wheel(0.085, 0.11, -0.31, 0.185), wheel(0.085, 0.11, -0.31, -0.185),
  ]);
  const helmet = new THREE.SphereGeometry(0.042, 16, 12); helmet.translate(0.07, 0.14, 0);
  return { body, dark, helmet };
}

/* ---------- 입자(연기·불꽃·불꽃놀이) ---------- */
class Particles {
  constructor(max, { size, additive, map }) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.base = new Float32Array(max * 3);
    this.g = new Float32Array(max); this.drag = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size, map, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true }));
    this.points.frustumCulled = false;
  }
  spawn(x, y, z, vx, vy, vz, life, color, { g = 0, drag = 0.9 } = {}) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3); this.base.set(color, i * 3);
    this.life[i] = 0; this.maxLife[i] = life; this.g[i] = g; this.drag[i] = drag;
  }
  clear() { this.n = 0; }
  step(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) { this.copy(--this.n, i); i--; continue; }
      const d = Math.pow(this.drag[i], dt * 60);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.g[i] * dt; this.vel[i * 3 + 2] *= d;
      for (let k = 0; k < 3; k++) this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt;
      const f = 1 - this.life[i] / this.maxLife[i];
      this.col.set([this.base[i * 3], this.base[i * 3 + 1], this.base[i * 3 + 2], f], i * 4);
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, this.n);
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  }
  copy(from, to) {
    if (from === to) return;
    for (const [arr, w] of [[this.pos, 3], [this.vel, 3], [this.base, 3], [this.col, 4]]) arr.copyWithin(to * w, from * w, from * w + w);
    this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from]; this.g[to] = this.g[from]; this.drag[to] = this.drag[from];
  }
}

export function createRace3D({ host, before, track, TW, W, H, scenery, paintGround, reduceMotion }) {
  const soft = softwareRenderer();
  const canvas = document.createElement('canvas');
  canvas.className = 'rd-3d';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '레이싱 서킷 3D 중계 화면');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !soft, powerPreference: 'high-performance' });
  host.insertBefore(canvas, before);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const maxTex = renderer.capabilities.maxTextureSize;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a18);
  scene.fog = new THREE.FogExp2(0x0b1026, 0.00055);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x0b1a10, 1.1));
  const moon = new THREE.DirectionalLight(0xe4ecff, 2.4); moon.position.set(W * 0.3, 900, H * 0.1); moon.target.position.set(W / 2, 0, H / 2); scene.add(moon, moon.target);
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.6, 12000);
  const glow = glowTexture();
  const CX = W / 2, CZ = H / 2;

  /* ---------- 하늘·별·도시 ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {},
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vDir; void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 zen = vec3(0.012,0.016,0.045); vec3 hor = vec3(0.13,0.10,0.26); vec3 c = mix(hor, zen, pow(h, 0.45)); c += vec3(0.25,0.12,0.30) * exp(-h * 18.0) * 0.6; gl_FragColor = vec4(c, 1.0); }',
  }));
  sky.position.set(CX, 0, CZ); sky.renderOrder = -10; scene.add(sky);
  {
    const r = rand(5), n = 900, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(1 - r() * 0.9), R = 5600;
      pos.set([CX + R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), CZ + R * Math.sin(ph) * Math.sin(th)], i * 3);
      const b = 0.4 + r() * 0.6; col.set([b, b, b * (0.9 + r() * 0.2)], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false })));
  }
  {
    const r = rand(9), n = 140;
    const win = canvasTexture(64, 128, (k, w, h) => {
      k.fillStyle = '#0a0d1a'; k.fillRect(0, 0, w, h);
      for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) if (r() < 0.45) { k.fillStyle = r() < 0.7 ? '#ffd98a' : '#9fd1ff'; k.fillRect(x, y, 4, 4); }
    });
    const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ map: win, color: 0x9aa2c8 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = 2300 + r() * 1400, w = 80 + r() * 160, h = 120 + r() * 520;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
      m.compose(new THREE.Vector3(CX + Math.cos(a) * d, 0, CZ + Math.sin(a) * d), q, new THREE.Vector3(w, h, w * (0.6 + r() * 0.8)));
      city.setMatrixAt(i, m);
    }
    scene.add(city);
  }

  /* ---------- 땅: 바깥 잔디 + 서킷 바닥 그림 ---------- */
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshBasicMaterial({ color: 0x09170f }));
  outer.rotation.x = -Math.PI / 2; outer.position.set(CX, -0.6, CZ); scene.add(outer);
  const texW = Math.min(soft ? 2048 : 4096, maxTex), texH = Math.round((texW * H) / W);
  const groundCanvas = document.createElement('canvas'); groundCanvas.width = texW; groundCanvas.height = texH;
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: groundTex, color: 0xd8dbe6 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(CX, 0, CZ); scene.add(ground);

  /* ---------- 방호벽과 광고판(다른 길과 겹치는 곳은 비워요) ---------- */
  const boards = canvasTexture(2048, 128, (k) => {
    BOARDS.forEach((txt, i) => {
      const x = i * 256;
      k.fillStyle = BOARD_COLORS[i]; k.fillRect(x, 0, 256, 128);
      k.fillStyle = 'rgba(255,255,255,.12)'; k.fillRect(x, 0, 256, 40);
      k.fillStyle = '#fff'; k.font = "900 40px 'Noto Sans KR', sans-serif"; k.textAlign = 'center'; k.textBaseline = 'middle';
      k.fillText(txt, x + 128, 68, 236);
      k.fillStyle = '#0006'; k.fillRect(x + 254, 0, 2, 128);
    });
  });
  boards.wrapS = THREE.RepeatWrapping; boards.anisotropy = 8;
  function nearOther(x, z, i0, r) {
    for (let i = 0; i < track.N; i += 2) {
      let di = Math.abs(i - i0); di = Math.min(di, track.N - di);
      if (di < 40) continue;
      const dx = track.x[i] - x, dz = track.y[i] - z;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }
  const WALL_H = 7;
  for (const side of [-1, 1]) {
    const lat = side * (TW / 2 + 9);
    const pos = [], uv = [], idx = [];
    let run = -1, u = 0, px = 0, pz = 0;
    for (let i = 0; i <= track.N; i += 2) {
      const j = i % track.N, a = track.ang[j];
      const x = track.x[j] - Math.sin(a) * lat, z = track.y[j] + Math.cos(a) * lat;
      const ok = !nearOther(x, z, j, TW / 2 + 6);
      if (run >= 0) u += Math.hypot(x - px, z - pz) / 900;
      px = x; pz = z;
      if (!ok) { run = -1; continue; }
      const v = pos.length / 3;
      // 광고 글씨가 길 쪽에서 바르게 읽히도록 (오른쪽 벽은 좌우를 뒤집어요)
      const uu = side > 0 ? -u : u;
      pos.push(x, 0, z, x, WALL_H, z); uv.push(uu, 0, uu, 1);
      if (run >= 0) idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
      run = v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const wall = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: boards, side: THREE.DoubleSide, color: 0xb8bdd0 }));
    scene.add(wall);
  }

  /* ---------- 관중석·피트·조명탑·나무 ---------- */
  const r = rand(21);
  for (const st of scenery.STANDS) {
    const z0 = st.y + 8, z1 = st.y + st.h + 14, h1 = 46;
    const crowdTex = canvasTexture(2048, 256, (k, w, h) => {
      k.fillStyle = '#141726'; k.fillRect(0, 0, w, h);
      for (let row = 0; row < 14; row++) { k.fillStyle = '#1f2338'; k.fillRect(0, row * 18 + 14, w, 3); }
      const cols = ['#ff3b3b', '#ffb703', '#2ec4ff', '#7cff4f', '#ff5ad1', '#f4f4f4', '#ffd98a', '#4d7cff'];
      for (let row = 0; row < 14; row++) for (let x = 2; x < w; x += 7 + r() * 3) { k.fillStyle = cols[Math.floor(r() * cols.length)]; k.globalAlpha = 0.55 + r() * 0.45; k.fillRect(x, row * 18 + 4 + r() * 3, 5, 8); }
      k.globalAlpha = 1;
    });
    crowdTex.wrapS = THREE.RepeatWrapping; crowdTex.repeat.x = 2;
    const slope = new THREE.PlaneGeometry(st.w, Math.hypot(z1 - z0, h1));
    const seats = new THREE.Mesh(slope, new THREE.MeshBasicMaterial({ map: crowdTex, color: 0xc9cce0 }));
    seats.position.set(st.x + st.w / 2, h1 / 2, (z0 + z1) / 2);
    seats.rotation.x = -Math.atan2(z1 - z0, h1); scene.add(seats);
    const back = new THREE.Mesh(new THREE.BoxGeometry(st.w, h1 + 12, 4), new THREE.MeshStandardMaterial({ color: 0x1b1f33, roughness: 0.8 }));
    back.position.set(st.x + st.w / 2, (h1 + 12) / 2, z1 + 2); scene.add(back);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(st.w + 20, 2.5, z1 - z0 + 16), new THREE.MeshStandardMaterial({ color: 0x2b3150, roughness: 0.6, metalness: 0.4 }));
    roof.position.set(st.x + st.w / 2, h1 + 18, (z0 + z1) / 2 + 2); scene.add(roof);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(st.w + 20, 1, 1.5), new THREE.MeshBasicMaterial({ color: 0xfff1cc }));
    strip.position.set(st.x + st.w / 2, h1 + 16.5, z0 - 5); scene.add(strip);
    for (let x = st.x; x <= st.x + st.w; x += 150) { const post = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, h1 + 18, 8), new THREE.MeshStandardMaterial({ color: 0x3a4160 })); post.position.set(x, (h1 + 18) / 2, z0 - 4); scene.add(post); }
  }
  {
    const P = scenery.PITS, hgt = 18;
    const garage = canvasTexture(1024, 64, (k, w, h) => {
      k.fillStyle = '#20253a'; k.fillRect(0, 0, w, h);
      for (let x = 10; x < w - 30; x += 64) { const g = k.createLinearGradient(0, 14, 0, h); g.addColorStop(0, '#fff3cf'); g.addColorStop(1, '#ffb347'); k.fillStyle = g; k.fillRect(x, 16, 50, h - 16); }
      k.fillStyle = '#3a4160'; k.fillRect(0, 0, w, 8);
    });
    const mats = [0, 0, 0, 0, 1, 0].map(f => (f ? new THREE.MeshBasicMaterial({ map: garage }) : new THREE.MeshStandardMaterial({ color: 0x1d2236, roughness: 0.7 })));
    const pit = new THREE.Mesh(new THREE.BoxGeometry(P.w, hgt, P.h), mats);
    pit.position.set(P.x + P.w / 2, hgt / 2, P.y + P.h / 2); scene.add(pit);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(P.w * 0.6, 8, P.h * 0.8), new THREE.MeshBasicMaterial({ color: 0x9fd1ff }));
    deck.position.set(P.x + P.w * 0.5, hgt + 4, P.y + P.h / 2); scene.add(deck);
  }
  const towerGlow = new THREE.SpriteMaterial({ map: glow, color: 0xdfe9ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, z] of scenery.TOWERS) {
    const hgt = 120;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, hgt, 10), new THREE.MeshStandardMaterial({ color: 0x4b5272, metalness: 0.6, roughness: 0.4 }));
    pole.position.set(x, hgt / 2, z); scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(24, 10, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    head.position.set(x, hgt + 4, z); head.lookAt(CX, hgt * 0.4, CZ); scene.add(head);
    const s = new THREE.Sprite(towerGlow); s.scale.set(90, 90, 1); s.position.set(x, hgt + 4, z); scene.add(s);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(150, hgt, 24, 1, true), beamMat);
    cone.position.set(x, hgt / 2, z); scene.add(cone);
  }
  {
    const extra = [];
    const rr = rand(33);
    for (let i = 0; i < 420; i++) { const a = rr() * Math.PI * 2, d = 1000 + rr() * 1500; extra.push({ x: CX + Math.cos(a) * d, y: CZ + Math.sin(a) * d * 0.8, r: 12 + rr() * 16 }); }
    const all = [...scenery.trees, ...extra];
    const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 9).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x1f4a2c, roughness: 0.9 }), all.length);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x3a2a1e }), all.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    all.forEach((t, i) => {
      m.compose(new THREE.Vector3(t.x, t.r * 0.5, t.y), q, new THREE.Vector3(t.r, t.r * 2.8, t.r)); leaf.setMatrixAt(i, m);
      leaf.setColorAt(i, c.setHSL(0.36 + rr() * 0.06, 0.45, 0.16 + rr() * 0.1));
      m.compose(new THREE.Vector3(t.x, 0, t.y), q, new THREE.Vector3(t.r, t.r * 0.7, t.r)); trunk.setMatrixAt(i, m);
    });
    scene.add(leaf, trunk);
  }

  /* ---------- 출발 신호 다리(겐트리) ---------- */
  const lampOff = new THREE.MeshBasicMaterial({ color: 0x2a0b0b }), lampOn = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const lamps = [], lampGlows = [];
  {
    const p = track.at(-6), gantry = new THREE.Group();
    gantry.position.set(p.x, 0, p.y); gantry.rotation.y = -p.a;
    const metal = new THREE.MeshStandardMaterial({ color: 0x2d3247, metalness: 0.6, roughness: 0.4 });
    const span = TW + 30;
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(4, 30, 4), metal); leg.position.set(0, 15, (s * span) / 2); gantry.add(leg); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5, 7, span + 4), metal); bar.position.set(0, 27, 0); gantry.add(bar);
    const sign = canvasTexture(512, 64, (k, w, h) => { k.fillStyle = '#111'; k.fillRect(0, 0, w, h); k.fillStyle = '#fff'; k.font = "900 34px 'Noto Sans KR', sans-serif"; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText('출발 · 결승', w / 2, h / 2 + 2); });
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(span * 0.6, 5), new THREE.MeshBasicMaterial({ map: sign }));
      plate.position.set(s * 2.6, 33, 0); plate.rotation.y = (s * Math.PI) / 2; gantry.add(plate);
    }
    for (let i = 0; i < 5; i++) {
      const z = (i - 2) * 8;
      for (const y of [25, 29]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), lampOff); lamp.position.set(-3, y, z); gantry.add(lamp); lamps.push({ lamp, i });
      }
      const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff3030, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      gs.scale.set(16, 16, 1); gs.position.set(-4, 27, z); gs.visible = false; gantry.add(gs); lampGlows.push(gs);
    }
    scene.add(gantry);
  }

  /* ---------- 차 ---------- */
  const geos = carGeometries();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.28 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15161c, metalness: 0.2, roughness: 0.55 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.1, roughness: 0.3 });
  const shadowTex = canvasTexture(64, 64, (k) => { const g = k.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = g; k.fillRect(0, 0, 64, 64); });
  const beamTex = canvasTexture(128, 64, (k) => { const g = k.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, 'rgba(255,246,220,.9)'); g.addColorStop(1, 'rgba(255,246,220,0)'); k.fillStyle = g; k.beginPath(); k.moveTo(0, 26); k.lineTo(128, 0); k.lineTo(128, 64); k.lineTo(0, 38); k.closePath(); k.fill(); });
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const beamMat2 = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
  const numberAtlas = canvasTexture(1024, 1024, (k) => {
    for (let n = 1; n <= 100; n++) {
      const cx = ((n - 1) % 10) * 102.4 + 51.2, cy = Math.floor((n - 1) / 10) * 102.4 + 51.2;
      k.fillStyle = '#fff'; k.beginPath(); k.arc(cx, cy, 46, 0, Math.PI * 2); k.fill();
      k.lineWidth = 5; k.strokeStyle = '#10131c'; k.stroke();
      k.fillStyle = '#10131c'; k.font = `900 ${n >= 100 ? 40 : 54}px 'Noto Sans KR', Arial, sans-serif`; k.textAlign = 'center'; k.textBaseline = 'middle';
      k.fillText(String(n), cx, cy + 3);
    }
  });
  const leaderTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 96, (k) => { k.fillStyle = '#ffd65a'; k.beginPath(); k.roundRect(4, 8, 248, 80, 40); k.fill(); k.fillStyle = '#1b1300'; k.font = "900 54px 'Noto Sans KR', sans-serif"; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText('1위', 128, 50); }), depthWrite: false, transparent: true }));
  scene.add(leaderTag);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd65a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(ring);
  const tail = new Particles(220, { size: 9, additive: true, map: glow });
  scene.add(tail.points);
  let fleet = null;

  function setCars(cars, g) {
    // 인원이 같으면 차 모양·색·번호판은 그대로 쓰고 차 목록만 바꿔요(출발할 때 화면이 멈칫하지 않게).
    if (fleet && fleet.cars.length === cars.length && fleet.g.carL === g.carL) { fleet.cars = cars; fleet.prev.clear(); return; }
    if (fleet) { for (const o of fleet.objects) { scene.remove(o); if (o.isInstancedMesh) o.dispose(); } fleet.sprites.forEach(s => { s.material.map.dispose(); s.material.dispose(); }); }
    const n = cars.length;
    const body = new THREE.InstancedMesh(geos.body, bodyMat, n), dark = new THREE.InstancedMesh(geos.dark, darkMat, n), helmet = new THREE.InstancedMesh(geos.helmet, helmetMat, n);
    const shadow = new THREE.InstancedMesh(flat, shadowMat, n), beam = new THREE.InstancedMesh(flat, beamMat2, n);
    const c = new THREE.Color();
    cars.forEach((car, i) => { body.setColorAt(i, c.set(car.color)); helmet.setColorAt(i, c.set(car.color).lerp(new THREE.Color(0xffffff), 0.6)); });
    for (const m of [body, dark, helmet, shadow, beam]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; }
    const sprites = cars.map(car => {
      const t = numberAtlas.clone(); t.repeat.set(0.1, 0.1); t.offset.set(((car.number - 1) % 10) * 0.1, 0.9 - Math.floor((car.number - 1) / 10) * 0.1);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
      s.scale.setScalar(g.carW * 0.95); scene.add(s);
      return s;
    });
    fleet = { cars, g, body, dark, helmet, shadow, beam, sprites, objects: [body, dark, helmet, shadow, beam, ...sprites], prev: new Map() };
    scene.add(body, dark, helmet, shadow, beam);
    // 바닥 그림(출발 그리드 칸이 인원에 따라 달라요)
    const k = groundCanvas.getContext('2d');
    k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, texW, texH);
    paintGround(k, texW / W);
    groundTex.needsUpdate = true;
  }

  /* ---------- 효과 ---------- */
  const smoke = new Particles(900, { size: 26, additive: false, map: glow });
  const sparks = new Particles(1200, { size: 4, additive: true, map: glow });
  const fireworks = new Particles(1500, { size: 16, additive: true, map: glow });
  scene.add(smoke.points, sparks.points, fireworks.points);
  const flashes = new Particles(60, { size: 14, additive: true, map: glow });
  scene.add(flashes.points);

  /* ---------- 카메라 감독 ---------- */
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  let shot = null, shotT = 0, seq = 0, camPos = v3(CX, 300, CZ + 600), camLook = v3(CX, 0, CZ), fov = 60, lastPhase = '', finishedSeen = 0, orbit = 0, clock = 0;
  const KMH = 230 / (track.L / 11.5);
  const off = (d, lat, y = 0) => { const p = track.at(d); return v3(p.x - Math.sin(p.a) * lat, y, p.y + Math.cos(p.a) * lat); };
  const carPos = (car, y = 0) => v3(car.x, y, car.y);
  const fwd = car => v3(Math.cos(car.a), 0, Math.sin(car.a));

  function pickShot(view, st) {
    const { phase, order, raceT } = st;
    // 출발 전: 자동 중계는 그리드와 신호등을, 고른 카메라는 맨 앞(폴 포지션) 차를 보여 줘요.
    if (phase === 'idle' || phase === 'countdown') return view === 'auto' ? { kind: phase === 'idle' ? 'grid' : 'start' } : { kind: view, car: st.cars[0] };
    const running = order.filter(c => !c.finished), next = running[0] || order[order.length - 1];
    if (view !== 'auto') return { kind: view, car: next };
    const lead = order[0];
    const nearEnd = running.length && (next.time - raceT < 1.5 || order.some(c => c.finished));
    if (nearEnd || phase === 'done') return { kind: 'finish', car: next };
    if (raceT < 0.05) return { kind: 'tcam', car: lead };
    const kind = AUTO_SEQUENCE[seq % AUTO_SEQUENCE.length];
    if (kind === 'battle') {
      const i = Math.min(running.length - 1, 1 + Math.floor(Math.random() * Math.min(4, running.length - 1)));
      return { kind: 'chase', car: running[Math.max(0, i)], battle: true };
    }
    return { kind, car: lead };
  }

  function aim(st, dt, view) {
    const { phase, fast } = st;
    const shotLen = fast ? 0.95 : 2.6;
    shotT += dt;
    const want = pickShot(view, st);
    const changeKind = !shot || want.kind !== shot.kind || (view !== 'auto' && want.car !== shot.car) || (shot.kind === 'finish' && want.car !== shot.car && shotT > 0.4);
    const timeUp = view === 'auto' && phase === 'race' && shot && !['finish', 'start', 'grid'].includes(shot.kind) && shotT > shotLen;
    if (phase !== lastPhase || changeKind || timeUp) {
      if (timeUp) { seq++; Object.assign(want, pickShot(view, st)); }
      shot = { ...want, cut: true }; shotT = 0; lastPhase = phase;
      if (shot.kind === 'trackside' && shot.car) {
        const ahead = Math.max(120, (speedOf(shot.car) || 300) * (fast ? 2.6 : 1.4));
        const side = Math.sign(track.curve[Math.floor(((((track.s0 + shot.car.d + ahead) % track.L) + track.L) % track.L) / track.STEP) % track.N]) || 1;
        shot.anchor = off(shot.car.d + ahead, -side * (TW / 2 + 48), 26);
      }
      if (shot.kind === 'heli') orbit = Math.random() * Math.PI * 2;
    }
    const car = shot.car, L = st.g.carL;
    let pos, look, f = 55, rigid = false;
    switch (shot.kind) {
      case 'grid': {
        const t = clock * 0.08;
        pos = off(70 + Math.sin(t) * 40, Math.sin(t * 1.3) * TW * 0.9, 38 + Math.sin(t * 0.7) * 8); look = off(-140, 0, 4); f = 50; break;
      }
      case 'start': pos = off(62, -TW * 0.15, 7); look = off(-40, 0, 13); f = 48; break;
      case 'onboard': {
        const F = fwd(car);
        pos = carPos(car, L * 0.215).addScaledVector(F, L * 0.1);
        look = pos.clone().addScaledVector(F, L * 6); look.y = L * 0.12;
        f = 66 + Math.min(14, speedOf(car) * KMH / 30); rigid = true; break;
      }
      case 'tcam': {
        const F = fwd(car);
        pos = carPos(car, L * 0.31).addScaledVector(F, -L * 0.15);
        look = pos.clone().addScaledVector(F, L * 5); look.y = L * 0.08;
        f = 58 + Math.min(12, speedOf(car) * KMH / 35); rigid = true; break;
      }
      case 'chase': {
        const F = fwd(car);
        pos = carPos(car, L * 0.95).addScaledVector(F, -L * 2.9);
        look = carPos(car, L * 0.2).addScaledVector(F, L * 1.8); f = 56; break;
      }
      case 'trackside': pos = shot.anchor; look = carPos(car, L * 0.15); f = 34; rigid = true; break;
      case 'heli': {
        orbit += dt * 0.25;
        pos = carPos(car, 190).add(v3(Math.cos(orbit) * 260, 0, Math.sin(orbit) * 260)); look = carPos(car, 0); f = 42; break;
      }
      case 'finish': {
        pos = off(80, -(TW / 2 + 14), 22); // 피트 건물 지붕 끝에서 결승선을 봐요
        const tgt = car && !car.finished ? carPos(car, 4) : off(-60, 0, 4);
        if (tgt.distanceTo(pos) > 900 || (car && car.d > 70)) tgt.copy(off(-200, 0, 4));
        look = tgt; f = 38; rigid = false; break;
      }
      default: pos = v3(CX, 600, CZ + 500); look = v3(CX, 0, CZ);
    }
    // 끊어 바꾸는 장면(컷)은 바로, 따라가는 장면은 부드럽게
    const k = shot.cut || rigid ? 1 : 1 - Math.exp(-dt * (shot.kind === 'finish' ? 6 : 7));
    camPos.lerp(pos, shot.kind === 'trackside' || shot.kind === 'finish' ? 1 : k);
    camLook.lerp(look, shot.cut || rigid ? 1 : 1 - Math.exp(-dt * 10));
    fov = shot.cut ? f : fov + (f - fov) * (1 - Math.exp(-dt * 4));
    shot.cut = false;
    camera.position.copy(camPos);
    // 탑승 화면의 떨림(빠르기와 코너에 따라)
    if ((shot.kind === 'onboard' || shot.kind === 'tcam') && !reduceMotion && phase !== 'idle') {
      const sp = Math.min(1, speedOf(car) / 450), cv = Math.min(1, Math.abs(track.curve[Math.floor(((((track.s0 + car.d) % track.L) + track.L) % track.L) / track.STEP) % track.N]) * 120);
      const amp = L * (0.004 + 0.01 * sp + 0.012 * cv * sp);
      camera.position.y += (Math.random() - 0.5) * amp; camera.position.x += (Math.random() - 0.5) * amp * 0.5;
    }
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.lookAt(camLook);
    return shot;
  }

  const speeds = new Map();
  function speedOf(car) { return car ? speeds.get(car.number) || 0 : 0; }

  /* ---------- 크기와 화질 ---------- */
  let size = [0, 0], pr = soft ? 0.6 : Math.min(devicePixelRatio || 1, 1.5), ema = 16, frames = 0;
  renderer.setPixelRatio(pr);
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h || (w === size[0] && h === size[1])) return;
    size = [w, h]; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = v3(0, 1, 0), tmp = v3(0, 0, 0), sc = v3(1, 1, 1);
  let lastT = 0;
  function render(st, dt, view) {
    resize();
    if (!fleet || !size[0]) return null;
    clock += dt;
    const { cars, g, raceT, phase, order, lightsOn } = st, L = g.carL;
    // 빠르기(경주 시간 기준)
    const dRace = raceT - lastT; lastT = raceT;
    for (const car of cars) {
      const prev = fleet.prev.get(car.number);
      if (dRace > 0 && prev !== undefined) { const v = (car.d - prev) / dRace; speeds.set(car.number, (speeds.get(car.number) || 0) * 0.7 + v * 0.3); }
      else if (phase !== 'race' && phase !== 'done') speeds.set(car.number, 0);
      fleet.prev.set(car.number, car.d);
    }
    // 차 놓기
    const leader = phase === 'race' || phase === 'done' ? order[0] : null;
    cars.forEach((car, i) => {
      q.setFromAxisAngle(Y, -car.a);
      m.compose(tmp.set(car.x, 0, car.y), q, sc.set(L, L, L));
      fleet.body.setMatrixAt(i, m); fleet.dark.setMatrixAt(i, m); fleet.helmet.setMatrixAt(i, m);
      m.compose(tmp.set(car.x, 0.35, car.y), q, sc.set(L * 1.25, 1, g.carW * 1.25)); fleet.shadow.setMatrixAt(i, m);
      const F = fwd(car);
      m.compose(tmp.set(car.x + F.x * L * 1.6, 0.5, car.y + F.z * L * 1.6), q, sc.set(L * 2.4, 1, g.carW * 2.2)); fleet.beam.setMatrixAt(i, m);
      const s = fleet.sprites[i];
      s.position.set(car.x, L * 0.42 + g.carW * 0.4, car.y);
      s.visible = !(shot && (shot.kind === 'onboard' || shot.kind === 'tcam') && shot.car === car);
      // 카메라 바로 앞의 번호판은 흐리게(화면을 가리지 않게)
      const near = Math.min(1, Math.max(0, (camera.position.distanceTo(s.position) - L * 1.5) / (L * 4)));
      s.material.opacity = (car.finished && phase === 'race' ? 0.55 : 1) * near;
    });
    for (const k of ['body', 'dark', 'helmet', 'shadow', 'beam']) fleet[k].instanceMatrix.needsUpdate = true;
    // 꼬리등
    tail.clear();
    for (const car of cars) {
      const F = fwd(car), p = carPos(car, L * 0.2).addScaledVector(F, -L * 0.53);
      tail.spawn(p.x, p.y, p.z, 0, 0, 0, 1, [1, 0.12, 0.1]);
    }
    tail.step(0);
    tail.points.material.size = Math.max(5, g.carW * 0.55);
    // 선두 표시
    ring.visible = leaderTag.visible = !!leader;
    if (leader) {
      const pulse = 0.5 + 0.5 * Math.sin(clock * 6);
      ring.position.set(leader.x, 0.6, leader.y); ring.scale.setScalar(L * (0.85 + pulse * 0.1));
      leaderTag.position.set(leader.x, L * 0.5 + g.carW * 1.9, leader.y); leaderTag.scale.set(g.carW * 2, g.carW * 0.75, 1);
    }
    // 출발 신호
    lamps.forEach(({ lamp, i }) => { lamp.material = phase === 'countdown' && i < lightsOn ? lampOn : lampOff; });
    lampGlows.forEach((s, i) => { s.visible = phase === 'countdown' && i < lightsOn; });
    // 사건: 출발 연기, 결승 불꽃, 1등 불꽃놀이
    if (st.events.go) for (const car of cars) {
      const F = fwd(car), p = carPos(car, 3).addScaledVector(F, -L * 0.5);
      for (let k = 0; k < (cars.length > 50 ? 2 : 5); k++) smoke.spawn(p.x, p.y, p.z, -F.x * 20 + (Math.random() - 0.5) * 30, 6 + Math.random() * 8, -F.z * 20 + (Math.random() - 0.5) * 30, 1.6 + Math.random(), [0.75, 0.77, 0.82], { g: -2, drag: 0.95 });
    }
    for (const car of st.events.crossed) {
      for (let k = 0; k < (cars.length > 50 ? 12 : 26); k++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 60; sparks.spawn(car.x, 6, car.y, Math.cos(a) * b, 20 + Math.random() * 50, Math.sin(a) * b, 0.8, car.rank === 1 ? [1, 0.84, 0.35] : [1, 1, 1], { g: 60, drag: 0.94 }); }
    }
    if (st.events.winner) {
      for (let r2 = 0; r2 < (reduceMotion ? 1 : 5); r2++) {
        const fx = 400 + Math.random() * 800, fz = 960 + Math.random() * 200, fy = 160 + Math.random() * 140;
        const col = new THREE.Color().setHSL(Math.random(), 0.9, 0.6).toArray();
        setTimeout(() => {
          for (let k = 0; k < 160; k++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s2 = 90 + Math.random() * 40, rr = Math.sqrt(1 - u * u); fireworks.spawn(fx, fy, fz, rr * Math.cos(th) * s2, u * s2, rr * Math.sin(th) * s2, 1.6 + Math.random() * 0.6, col, { g: 40, drag: 0.96 }); }
        }, r2 * (st.fast ? 90 : 320));
      }
    }
    // 달리는 동안: 코너 불꽃, 관중석 카메라 플래시
    if ((phase === 'race' || phase === 'done') && !reduceMotion) {
      for (const car of cars) {
        if (car.finished || Math.random() > 0.05) continue;
        const cv = Math.abs(track.curve[Math.floor(((((track.s0 + car.d) % track.L) + track.L) % track.L) / track.STEP) % track.N]);
        if (cv < 0.005 || speedOf(car) < 150) continue;
        const F = fwd(car), p = carPos(car, 1).addScaledVector(F, -L * 0.45);
        for (let k = 0; k < 5; k++) sparks.spawn(p.x, p.y, p.z, -F.x * 60 + (Math.random() - 0.5) * 40, 8 + Math.random() * 20, -F.z * 60 + (Math.random() - 0.5) * 40, 0.35, [1, 0.62, 0.25], { g: 80, drag: 0.92 });
      }
      for (let k = 0; k < 2; k++) if (Math.random() < 0.6) { const st0 = scenery.STANDS[0], x = st0.x + Math.random() * st0.w, t = Math.random(); flashes.spawn(x, 6 + t * 40, st0.y + 10 + t * 56, 0, 0, 0, 0.12, [1, 1, 1], { drag: 1 }); }
    }
    const fdt = Math.min(0.05, dt);
    smoke.step(fdt); sparks.step(fdt); fireworks.step(fdt); flashes.step(fdt);
    const sh = aim(st, dt, view);
    const t0 = performance.now();
    renderer.render(scene, camera);
    // 느리면 해상도를 낮춰요.
    ema = ema * 0.95 + (performance.now() - t0 + 4) * 0.05; frames++;
    if (frames > 60 && ema > 30 && pr > 0.5) { pr = Math.max(0.5, pr - 0.25); renderer.setPixelRatio(pr); size = [0, 0]; frames = 0; }
    canvas.dataset.frames = String((Number(canvas.dataset.frames) || 0) + 1);
    const focus = sh.car;
    return {
      kind: sh.kind, name: SHOT_NAMES[sh.kind], car: focus,
      kmh: focus && phase === 'race' && !focus.finished ? Math.round(speedOf(focus) * KMH) : null,
      cam: { x: camPos.x, y: camPos.z, lx: camLook.x, ly: camLook.z },
    };
  }

  return { canvas, setCars, render, soft };
}
