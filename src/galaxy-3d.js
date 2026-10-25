// 우리은하의 3D 모형(교과서 291쪽 그림 VIII 7). 약 4만 개의 점(별)으로 막대 나선 은하를 만들어요.
// 중심부(막대·팽대부)는 늙은 노란 별, 나선팔은 젊은 푸른 별과 붉게 빛나는 성운, 팔 안쪽에는 별빛을 가리는 티끌(암흑 성운) 띠가 있어요.
// 뒤쪽 배경의 은하들은 허블 우주 망원경이 찍은 실제 외부 은하 사진(허블 익스트림 딥 필드)에서 오려 냈어요.
import { THREE, label, createStage3D } from './three-kit.js';
import { darkenLab, pointCloud, glowSprite, beam, ring } from './space-3d.js';
import { galaxyPoints, RADIUS, SUN_POS, rng } from './galaxy-model.js';
import { galaxyUrl } from './space-photos.js';

export function createGalaxy3D({ stage, svg, reducedMotion }) {
  // ‘태양계 찾기’: 태양계와 은하 중심이 함께 보이도록 둘 사이를 바라봐요.
  const sunTarget = [SUN_POS[0] * .6, 0, SUN_POS[2] * .6];
  const VIEWS = { galaxy: {
    target: [0, 0, 0], oblique: [0, 15, 27], top: [0, 33, .01], side: [31, .6, 2], sun: [sunTarget[0] + 6, 12, sunTarget[2] + 13],
    targets: { sun: sunTarget },
  } };
  const kit = createStage3D({ stage, svg, reducedMotion, views: VIEWS, mode: 'galaxy', ariaLabel: '수많은 별로 이루어진 우리은하의 3D 모형. 끌어서 돌려 볼 수 있어요.' });
  const { scene, camera, controls } = kit;
  stage.classList.add('galaxy3d');
  darkenLab(scene, 0);
  controls.maxPolarAngle = Math.PI * .5;

  /* ---------- 별(점) ---------- */
  const raw = galaxyPoints(kit.soft ? .6 : 1);
  const stars = raw.filter(p => p[3] !== 4), dust = raw.filter(p => p[3] === 4);
  const COLORS = [[1, .86, .62], [.72, .82, 1], [1, .45, .62], [1, .93, .82]];
  const SIZES = [4.2, 3.6, 6.5, 2.6];
  const pos = new Float32Array(stars.length * 3), col = new Float32Array(stars.length * 3), size = new Float32Array(stars.length);
  const rand = rng(3);
  stars.forEach(([x, y, z, t], i) => {
    pos.set([x, y, z], i * 3);
    const r = Math.hypot(x, z), k = (t === 0 ? .32 : t === 3 ? .28 : .8) * (.7 + .6 * rand()) * (t === 0 ? 1 : Math.min(1, 1.6 - r / RADIUS));
    const c = COLORS[t];
    col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    size[i] = SIZES[t] * (.7 + .6 * rand());
  });
  const galaxy = new THREE.Group(); scene.add(galaxy);
  galaxy.add(pointCloud(pos, col, size, { attenuate: true, scale: 1, bright: 1.1, near: 26 }));
  // 긴 노출로 찍은 사진처럼 별빛이 부드럽게 번진 원반(같은 별 자료로 그린 그림)
  const disk = new THREE.Mesh(new THREE.PlaneGeometry(GLOW_SPAN * 2, GLOW_SPAN * 2), new THREE.MeshBasicMaterial({ map: galaxyTexture(raw), transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  disk.rotation.x = -Math.PI / 2; disk.renderOrder = -1; galaxy.add(disk);
  // 티끌: 빛을 더하지 않고 가려요(옆에서 보면 원반 가운데를 지나는 검은 띠가 보여요).
  const dpos = new Float32Array(dust.length * 3); dust.forEach((p, i) => dpos.set(p.slice(0, 3), i * 3));
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dustTex = dustTexture();
  galaxy.add(new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0x1a0f08, size: .5, map: dustTex, transparent: true, opacity: .13, depthWrite: false, sizeAttenuation: true })));
  // 중심부의 빛 번짐
  galaxy.add(glowSprite(0xffd9a0, 9, .55), glowSprite(0xfff1d6, 3.4, .8));

  /* ---------- 태양계와 크기 ---------- */
  const sunMark = new THREE.Group(); sunMark.position.set(...SUN_POS); galaxy.add(sunMark);
  sunMark.add(glowSprite(0xffe08a, 1.1, 1));
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(.55, .66, 48), new THREE.MeshBasicMaterial({ color: 0xffcf6e, transparent: true, opacity: .95, side: THREE.DoubleSide, depthTest: false }));
  ringMesh.rotation.x = -Math.PI / 2; ringMesh.renderOrder = 5; sunMark.add(ringMesh);
  const sunLabel = label('태양계 (우리가 있는 곳)', { size: .9, color: '#ffe08a', bg: '#0a0d22cc' }); sunLabel.position.set(0, 1.4, 0); sunMark.add(sunLabel);
  const toSun = beam(0xffcf6e, .9, true); toSun.userData.set([0, .02, 0], [SUN_POS[0], .02, SUN_POS[2]]); galaxy.add(toSun);
  const sunDist = label('약 8500 pc', { size: .85, color: '#ffcf6e', bg: '#0a0d22aa' }); sunDist.position.set(SUN_POS[0] / 2, .7, SUN_POS[2] / 2); galaxy.add(sunDist);
  const across = ring(RADIUS, 0x8fd3ff, .55);
  const acrossLabel = label('지름 약 30000 pc (약 10만 광년)', { size: .95, color: '#bfe3ff', bg: '#0a0d22aa' }); acrossLabel.position.set(6, -1.6, -11.5);
  const center = label('은하 중심', { size: .9, color: '#fff3d6', bg: '#0a0d22aa' }); center.position.set(0, 2.6, 0);
  const armLabel = label('나선팔', { size: .9, color: '#cfe0ff', bg: '#0a0d22aa' }); armLabel.position.set(-10.5, 1, 5.5);
  const barLabel = label('막대 모양의 중심부', { size: .8, color: '#ffe2b0', bg: '#0a0d22aa' }); barLabel.position.set(5.2, 1.8, 4.2);
  const bulgeLabel = label('볼록한 중심부', { size: .9, color: '#ffe2b0', bg: '#0a0d22aa' }); bulgeLabel.position.set(0, 3.4, 0);
  const diskLabel = label('납작한 원반', { size: .9, color: '#cfe0ff', bg: '#0a0d22aa' }); diskLabel.position.set(-10, 1.8, 0);
  galaxy.add(across, acrossLabel, center, armLabel, barLabel, bulgeLabel, diskLabel);

  /* ---------- 배경: 실제 외부 은하 사진 ---------- */
  const loader = new THREE.TextureLoader(), r2 = rng(5);
  for (let i = 0; i < 26; i++) {
    const tex = loader.load(galaxyUrl(1 + (i % 14)), () => kit.invalidate()); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .55 + .35 * r2(), depthWrite: false, rotation: r2() * 6.28, blending: THREE.AdditiveBlending }));
    const th = r2() * Math.PI * 2, ph = Math.acos(r2() * 1.6 - .8), R = 55 + r2() * 5;
    s.position.set(R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th));
    const sz = 1.6 + r2() * 2.6; s.scale.set(sz, sz, 1); s.renderOrder = -20;
    scene.add(s);
  }

  kit.start();
  let spin = 0, pulse = 0, last = '';
  return {
    kit,
    lastView: 'oblique',
    setView(name) { this.lastView = name; kit.setView(name); },
    invalidate: () => kit.invalidate(),
    // s: { show, sunOn, rotate }
    update(s, dt) {
      const animating = !reducedMotion.matches && (s.rotate || s.sunOn);
      kit.draw({
        dt, sig: JSON.stringify([s.show, s.sunOn, s.rotate]), animating,
        paint: () => {
          // 태양계를 찾을 때는 은하를 처음 방향으로 되돌려 태양계가 화면 가운데 오게 해요.
          if (s.rotate && !reducedMotion.matches) spin += dt * .035;
          else { const home = Math.round(spin / (Math.PI * 2)) * Math.PI * 2; spin += (home - spin) * (reducedMotion.matches ? 1 : Math.min(1, dt * 3)); }
          galaxy.rotation.y = -spin;
          pulse += dt;
          const k = 1 + .18 * Math.sin(pulse * 3.2);
          ringMesh.scale.set(k, k, k);
          sunMark.visible = toSun.visible = sunDist.visible = s.sunOn;
          across.visible = acrossLabel.visible = s.show || s.sunOn;
          const side = camera.position.y < 4;
          center.visible = s.show && !side; armLabel.visible = s.show && !side; barLabel.visible = s.show && !side;
          bulgeLabel.visible = diskLabel.visible = s.show && side;
          if (last !== String(side)) { last = String(side); }
        },
      });
    },
  };
}
// 별 자료를 위에서 본 모습으로 부드럽게 칠한 그림(별빛이 번진 원반). 티끌이 지나는 곳은 어둡게 칠해요.
const GLOW_SPAN = 17;
function galaxyTexture(points) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), k = N / (GLOW_SPAN * 2);
  const dot = (rgb, r) => { const d = document.createElement('canvas'); d.width = d.height = 32; const x = d.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return [d, r]; };
  const DOTS = [dot('255,214,160', 7), dot('150,180,255', 5), dot('255,110,160', 6), dot('255,232,200', 6)];
  g.globalCompositeOperation = 'lighter';
  for (const [x, , z, t] of points) {
    if (t === 4) continue;
    const [img, r] = DOTS[t];
    g.globalAlpha = t === 0 ? .022 : t === 3 ? .03 : .07;
    g.drawImage(img, (x + GLOW_SPAN) * k - r, (z + GLOW_SPAN) * k - r, r * 2, r * 2);
  }
  g.globalCompositeOperation = 'source-over';
  for (const [x, , z, t] of points) {
    if (t !== 4) continue;
    g.globalAlpha = .07; g.fillStyle = '#000'; g.beginPath(); g.arc((x + GLOW_SPAN) * k, (z + GLOW_SPAN) * k, 2.4, 0, 7); g.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function dustTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
