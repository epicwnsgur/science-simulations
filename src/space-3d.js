// 우주 실험의 3D 부품(three.js): 실제 별로 만든 하늘 공, 빛나는 별(빛 번짐), 태양, 지구.
// 실험 장면은 src/three-kit.js의 createStage3D 위에 만들고, 장치 실험용 조명은 어둡게 낮춰 우주처럼 보이게 해요.
import { THREE } from './three-kit.js';
import { SKY_STARS } from './data/sky-stars.js';
import { starColor } from './sky-render.js';

// 우주 장면: 실험실 조명(하늘빛·반사)을 끄고, 별빛만으로 비추게 해요.
export function darkenLab(scene, keep = .12) {
  scene.environmentIntensity = 0;
  scene.traverse(o => { if (o.isLight && !o.userData.space) o.intensity *= keep; });
}

/* ---------- 빛 번짐(글로) 그림 ---------- */
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.12, 'rgba(255,255,255,.85)');
  grad.addColorStop(.3, 'rgba(255,255,255,.28)'); grad.addColorStop(.6, 'rgba(255,255,255,.07)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
// 늘 화면을 향하는 빛 번짐(별·태양의 빛). color: 0xffffff 꼴
export function glowSprite(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1);
  return s;
}
// 밝은 별: 하얀 중심 + 색이 있는 빛 번짐 + 십자 빛살
export function brightStar(color, size = 1) {
  const g = new THREE.Group();
  g.add(glowSprite(color, size * 2.6, .55), glowSprite(0xffffff, size * .9, 1));
  const spike = spikeTexture();
  for (const rot of [0, Math.PI / 2]) {
    const m = new THREE.SpriteMaterial({ map: spike, color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, rotation: rot });
    const s = new THREE.Sprite(m); s.scale.set(size * 4.2, size * 4.2, 1); g.add(s);
  }
  return g;
}
let spikeTex = null;
function spikeTexture() {
  if (spikeTex) return spikeTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 128, 256, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(.5, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 126, 256, 4);
  spikeTex = new THREE.CanvasTexture(c);
  return spikeTex;
}

/* ---------- 실제 별로 만든 하늘 공 ----------
   하늘의 한 점(적경 ra0, 적위 dec0)이 -z 방향(정면)에 오고, 북쪽이 위(+y), 동쪽이 왼쪽(-x)이 되게 놓아요.
   별의 색은 색지수(B−V)로, 크기는 겉보기 등급으로 정해요(밝을수록 크게). */
const D = Math.PI / 180;
export function skyBasis(ra0, dec0) {
  const c = [Math.cos(dec0 * D) * Math.cos(ra0 * D), Math.cos(dec0 * D) * Math.sin(ra0 * D), Math.sin(dec0 * D)];
  const n = [-Math.sin(dec0 * D) * Math.cos(ra0 * D), -Math.sin(dec0 * D) * Math.sin(ra0 * D), Math.cos(dec0 * D)];
  const e = [-Math.sin(ra0 * D), Math.cos(ra0 * D), 0];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return {
    // 하늘의 (ra, dec) → 장면의 방향(단위 벡터)
    toScene(ra, dec) {
      const v = [Math.cos(dec * D) * Math.cos(ra * D), Math.cos(dec * D) * Math.sin(ra * D), Math.sin(dec * D)];
      return [-dot(v, e), dot(v, n), -dot(v, c)];
    },
    // 장면의 방향 → 하늘의 (ra, dec)
    toSky([x, y, z]) {
      const l = Math.hypot(x, y, z) || 1, v = [0, 1, 2].map(i => (-x * e[i] + y * n[i] - z * c[i]) / l);
      return [((Math.atan2(v[1], v[0]) / D) + 360) % 360, Math.asin(Math.max(-1, Math.min(1, v[2]))) / D];
    },
  };
}
const STAR_VERT = `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float uScale;
void main(){ vColor = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale; gl_Position = projectionMatrix * mv; }`;
const STAR_FRAG = `varying vec3 vColor; uniform float uBright;
void main(){ vec2 p = gl_PointCoord - .5; float d = length(p) * 2.0; float core = exp(-d * d * 9.0); float halo = exp(-d * 3.2) * .35;
  float a = (core + halo) * smoothstep(1.0, .7, d); gl_FragColor = vec4(vColor * a * uBright, a); }`;
export function skySphere({ radius = 80, ra0 = 0, dec0 = 0, maxMag = 6.2, scale = 1, bright = 1 } = {}) {
  const basis = skyBasis(ra0, dec0), stars = SKY_STARS.filter(s => s[2] <= maxMag);
  const pos = new Float32Array(stars.length * 3), col = new Float32Array(stars.length * 3), size = new Float32Array(stars.length);
  stars.forEach(([ra, dec, mag, bv], i) => {
    const [x, y, z] = basis.toScene(ra, dec);
    pos.set([x * radius, y * radius, z * radius], i * 3);
    const [r, g, b] = starColor(bv).map(v => v / 255);
    const k = Math.min(1, .25 + (6.5 - mag) / 6); // 어두운 별은 어둡게
    col.set([r * k, g * k, b * k], i * 3);
    size[i] = Math.max(1.6, (6.6 - mag) * 1.55);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: scale * Math.min(2, devicePixelRatio || 1) }, uBright: { value: bright } },
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = -10; pts.frustumCulled = false;
  return { points: pts, basis, material: mat };
}
// 점 무리(은하의 별, 성운 입자 등)를 같은 방식(둥글게 번지는 점)으로 그려요. sizeAttenuation: 멀수록 작게
export function pointCloud(positions, colors, sizes, { scale = 1, bright = 1, attenuate = false, near = 12 } = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const vert = attenuate
    ? STAR_VERT.replace('gl_PointSize = size * uScale;', 'gl_PointSize = size * uScale * (uNear / max(1.0, -mv.z));').replace('uniform float uScale;', 'uniform float uScale; uniform float uNear;')
    : STAR_VERT;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: scale * Math.min(2, devicePixelRatio || 1) }, uBright: { value: bright }, uNear: { value: near } },
    vertexShader: vert, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  return pts;
}

/* ---------- 태양 ---------- */
export function sun(radius = .5) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  // 쌀알 무늬(표면의 작은 알갱이 무늬)를 흉내 낸 표면
  x.fillStyle = '#ffb347'; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(255,${200 + Math.random() * 55 | 0},${120 + Math.random() * 80 | 0},${.25 + Math.random() * .35})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 128, .6 + Math.random() * 1.6, 0, 7); x.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.MeshBasicMaterial({ map: tex, color: 0xffe2a8 }));
  g.add(ball, glowSprite(0xffc46b, radius * 7, .55), glowSprite(0xfff1d0, radius * 3.2, .9));
  const light = new THREE.PointLight(0xfff2dd, 60, 0, 1.6); light.userData.space = true; g.add(light);
  g.userData = { ball };
  return g;
}

/* ---------- 지구(바다·대륙·구름을 무늬로 그려요) ---------- */
function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
const fbm = (x, y, z, o = 5) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise3(x * f, y * f, z * f); a *= .5; f *= 2.03; } return s; };
export function earth(radius = .3) {
  const W = 384, H = 192, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), img = x.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    const lat = (.5 - j / H) * Math.PI;
    for (let i = 0; i < W; i++) {
      const lon = (i / W) * Math.PI * 2, px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
      const land = fbm(px * 1.8 + 3, py * 1.8, pz * 1.8) - .5, cloud = fbm(px * 3 + 9, py * 4, pz * 3, 4);
      const polar = Math.abs(lat) > 1.22;
      let r, g, b;
      if (polar) [r, g, b] = [235, 242, 250];
      else if (land > .02) { const d = Math.min(1, (land - .02) * 6); [r, g, b] = [70 + 90 * d, 120 + 30 * d, 60 + 40 * d]; if (Math.abs(lat) < .45 && land > .1) [r, g, b] = [190, 160, 105]; }
      else { const d = Math.min(1, -land * 4); [r, g, b] = [18 + 20 * (1 - d), 60 + 50 * (1 - d), 140 + 60 * (1 - d)]; }
      const cl = Math.max(0, Math.min(1, (cloud - .52) * 4));
      const k = (j * W + i) * 4;
      img.data[k] = r + (255 - r) * cl; img.data[k + 1] = g + (255 - g) * cl; img.data[k + 2] = b + (255 - b) * cl; img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), new THREE.MeshStandardMaterial({ map: tex, roughness: .85, metalness: 0, emissive: 0x0a1a3a, emissiveIntensity: .25 }));
  ball.rotation.z = 23.5 * D;
  g.add(ball, glowSprite(0x6fb6ff, radius * 3.4, .35));
  g.userData = { ball };
  return g;
}

// 점선 원(공전 궤도 등)
export function ring(radius, color = 0x8fd3ff, opacity = .45, segments = 160) {
  const pts = Array.from({ length: segments + 1 }, (_, i) => { const a = i / segments * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius); });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: .12, gapSize: .1 }));
  line.computeLineDistances();
  return line;
}
// 두 점을 잇는 선(가늘게 빛나는 선). update(a, b)로 끝점을 옮겨요.
export function beam(color, opacity = .8, dashed = false) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
  const mat = dashed ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: .18, gapSize: .12, depthWrite: false }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const line = new THREE.Line(geo, mat);
  line.frustumCulled = false;
  line.userData.set = (a, b) => { const p = geo.attributes.position; p.setXYZ(0, ...a); p.setXYZ(1, ...b); p.needsUpdate = true; if (dashed) line.computeLineDistances(); };
  return line;
}
// 두 방향 사이의 각을 나타내는 호. set(center, dirA, dirB, r)
export function angleArc(color, opacity = .9) {
  const N = 40, geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: N + 1 }, () => new THREE.Vector3()));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  line.frustumCulled = false;
  line.userData.set = (c, a, b, r) => {
    const A = new THREE.Vector3(...a).normalize(), B = new THREE.Vector3(...b).normalize(), p = geo.attributes.position;
    for (let i = 0; i <= N; i++) { const v = new THREE.Vector3().copy(A).lerp(B, i / N).normalize().multiplyScalar(r).add(new THREE.Vector3(...c)); p.setXYZ(i, v.x, v.y, v.z); }
    p.needsUpdate = true;
  };
  return line;
}
