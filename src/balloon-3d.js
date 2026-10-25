// 풍선 모형의 3D 화면(교과서 294쪽 탐구). 펌프로 공기를 넣으면 풍선이 커지고, 붙인 은하 붙임딱지 사이가 멀어져요.
// 붙임딱지는 실제 외부 은하 사진(허블 익스트림 딥 필드)을 오려 만든 것이고, 풍선이 커져도 붙임딱지의 크기는 그대로예요.
import { THREE, label, createStage3D } from './three-kit.js';
import { RADII, STICKERS, dirOf, angleBetween, PAIRS } from './expansion-model.js';
import { galaxyUrl } from './space-photos.js';

export function createBalloon3D({ stage, svg, reducedMotion }) {
  const C = [0, 3.1, 0];
  const VIEWS = { balloon: { target: [0, 3.1, 0], oblique: [4.2, 6.4, 13.5], front: [0, 3.6, 14.5], top: [0, 16, 3] } };
  const kit = createStage3D({ stage, svg, reducedMotion, views: VIEWS, mode: 'balloon', ariaLabel: '은하 붙임딱지를 붙인 풍선과 펌프의 3D 모습. 끌어서 돌려 볼 수 있어요.' });
  const { scene } = kit;
  stage.classList.add('balloon3d');

  /* ---------- 풍선 ---------- */
  const skin = balloonTexture();
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x3a4fd8, map: skin, roughness: .32, metalness: 0, clearcoat: 1, clearcoatRoughness: .12, sheen: .6, sheenColor: new THREE.Color(0x9fb8ff), sheenRoughness: .4 });
  const balloon = new THREE.Group(); balloon.position.set(...C); scene.add(balloon);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), rubber); balloon.add(body);
  // 아래쪽 매듭과 입구
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.06, .16, .3, 20), rubber); scene.add(neck);
  const knot = new THREE.Mesh(new THREE.TorusGeometry(.09, .045, 10, 24), rubber); knot.rotation.x = Math.PI / 2; scene.add(knot);

  /* ---------- 펌프 ---------- */
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9d1db, metalness: .8, roughness: .3 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe04848, roughness: .45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c2442, roughness: .7 });
  const pump = new THREE.Group(); pump.position.set(2.6, 0, .6); scene.add(pump);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 1.8, 28), red); barrel.position.y = .9; pump.add(barrel);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(1.1, .08, .5), dark); foot.position.y = .04; pump.add(foot);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.2, 12), steel); pump.add(rod);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .9, 16), dark); handle.rotation.z = Math.PI / 2; pump.add(handle);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.6, .3, .6), new THREE.Vector3(1.6, .15, .7), new THREE.Vector3(.4, .35, .3), new THREE.Vector3(0, .9, 0)]), 40, .045, 10), dark);
  scene.add(hose);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, .12, 64), new THREE.MeshStandardMaterial({ color: 0x141a35, roughness: .85 })); table.position.y = -.06; scene.add(table);

  /* ---------- 은하 붙임딱지 ---------- */
    const stickers = STICKERS.map((st, i) => {
    const tex = stickerTexture(st.id, galaxyUrl([3, 9, 6][i]), () => kit.invalidate());
    const m = new THREE.Mesh(new THREE.CircleGeometry(.36, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: .6, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
    balloon.add(m);
    return { m, dir: new THREE.Vector3(...dirOf(st)) };
  });
  // 줄자: 풍선 표면을 따라 두 붙임딱지 사이를 이어요.
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: .5, emissive: 0x332200 });
  const tapes = PAIRS.map(() => { const mesh = new THREE.Mesh(new THREE.BufferGeometry(), tapeMat); balloon.add(mesh); return mesh; });
  const tapeLabels = PAIRS.map(() => { const l = label(' ', { size: .3 }); l.visible = false; balloon.add(l); return l; });
  function arcPoints(a, b, r, f) {
    const ang = angleBetween(STICKERS[a], STICKERS[b]), axis = new THREE.Vector3().crossVectors(stickers[a].dir, stickers[b].dir).normalize();
    return Array.from({ length: 33 }, (_, i) => stickers[a].dir.clone().applyAxisAngle(axis, ang * f * i / 32).multiplyScalar(r * 1.012));
  }

  kit.start({ rubber });
  let shown = '', lastR = -1;
  return {
    kit,
    setView: name => kit.setView(name),
    invalidate: () => kit.invalidate(),
    // s: { r, stuck(0~1), tapes: [[pairIndex, f, text]], pumpY, show }
    update(s, dt) {
      kit.draw({
        dt, sig: JSON.stringify([s.r.toFixed(3), s.stuck.toFixed(2), s.tapes, s.pumpY.toFixed(2)]), animating: s.moving && !reducedMotion.matches,
        paint: () => {
          body.scale.setScalar(s.r);
          balloon.position.y = .95 + s.r * .98;
          neck.position.set(0, balloon.position.y - s.r - .1, 0); knot.position.set(0, neck.position.y - .17, 0);
          // 붙임딱지: 크기는 그대로, 자리는 풍선 표면을 따라가요. 붙일 때는 바깥에서 날아와 붙어요.
          stickers.forEach(({ m, dir }, i) => {
            const k = Math.max(0, Math.min(1, s.stuck * 3 - i));
            m.visible = k > 0;
            m.position.copy(dir).multiplyScalar(s.r * 1.004 + (1 - k) * 2.2);
            m.lookAt(dir.clone().multiplyScalar(10).add(balloon.position));
          });
          if (s.r !== lastR || shown !== JSON.stringify(s.tapes)) {
            lastR = s.r; shown = JSON.stringify(s.tapes);
            tapes.forEach((t, i) => { t.visible = false; tapeLabels[i].visible = false; });
            for (const [p, f, text] of s.tapes) {
              const [a, b] = PAIRS[p], pts = arcPoints(a, b, s.r, f);
              tapes[p].geometry.dispose();
              tapes[p].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .035, 8, false);
              tapes[p].visible = true;
              if (text && f >= 1) {
                const mid = pts[16].clone().multiplyScalar(1.16);
                balloon.remove(tapeLabels[p]); tapeLabels[p] = label(text, { size: .34, color: '#1d1505', bg: '#ffd23f' }); tapeLabels[p].position.copy(mid); balloon.add(tapeLabels[p]);
              }
            }
          }
          rod.position.y = 1.8 + s.pumpY * .8; handle.position.y = 2.42 + s.pumpY * .8;
        },
      });
    },
  };
}

// 우주처럼 보이는 풍선 무늬: 짙은 파랑 바탕에 작은 별 점
function balloonTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 260; i++) { const a = Math.random(); g.fillStyle = `rgba(255,255,255,${.5 + a * .5})`; g.beginPath(); g.arc(Math.random() * 512, Math.random() * 256, .5 + a * 1.1, 0, 7); g.fill(); }
  // 바탕을 흰색으로 두면 재질 색(파랑)이 그대로 보이고, 별 점은 그 위에서 밝게 보여요.
  const img = g.getImageData(0, 0, 512, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = img.data[i]; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; }
  g.putImageData(img, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#dfe6ff'; g.fillRect(0, 0, 512, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
// 붙임딱지: 하얀 종이 위에 은하 사진과 번호
function stickerTexture(n, url, done) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const paint = img => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    g.fillStyle = '#05060f'; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.fill();
    if (img) { g.save(); g.beginPath(); g.arc(128, 128, 108, 0, 7); g.clip(); g.drawImage(img, 20, 20, 216, 216); g.restore(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(206, 52, 34, 0, 7); g.fill();
    g.fillStyle = '#1d1505'; g.font = "800 46px Pretendard, 'Noto Sans KR', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 206, 54);
    tex.needsUpdate = true; done?.();
  };
  paint(null);
  const img = new Image(); img.onload = () => paint(img); img.src = url;
  return tex;
}
