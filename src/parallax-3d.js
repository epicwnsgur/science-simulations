// 연주 시차 실험의 3D 화면(교과서 278쪽 그림 VIII 2).
// 태양 둘레를 도는 지구, 가까운 별 X와 먼 별 Y, 그리고 실제 별(HYG 별 목록)로 만든 먼 배경 하늘을 입체로 보여 줘요.
// 지구에서 별을 보는 시선은 배경 하늘까지 이어져서, 지구가 공전하면 별 X가 배경의 어디에 보이는지 달라지는 것을 볼 수 있어요.
import { THREE, label, createStage3D } from './three-kit.js';
import { darkenLab, skySphere, sun, earth, ring, beam, angleArc, brightStar, glowSprite } from './space-3d.js';
import { ORBIT_R, STAR_X, STAR_Y, SKY_CENTER, earthAt, hitSky } from './parallax-model.js';

const SKY_R = 60;
export function createParallax3D({ stage, svg, reducedMotion }) {
  const VIEWS = { orbit: { target: [0, 0, -6.5], oblique: [0, 20, 16], top: [0, 46, -6.4], side: [28, 5, -6.5] } };
  const kit = createStage3D({ stage, svg, reducedMotion, views: VIEWS, mode: 'orbit', ariaLabel: '태양 둘레를 공전하는 지구와 가까운 별 X, 먼 별 Y의 3D 모습. 끌어서 돌려 볼 수 있어요.' });
  const { scene, camera } = kit;
  stage.classList.add('parallax3d');
  darkenLab(scene, .08);
  // 오른쪽에 ‘지구에서 본 하늘’ 창이 있어서, 장면을 조금 왼쪽에 그려요.
  camera.setViewOffset(1, 1, .19, 0, 1, 1);

  const sky = skySphere({ radius: SKY_R, ra0: SKY_CENTER.ra, dec0: SKY_CENTER.dec, scale: 1.6, bright: 1.3 });
  scene.add(sky.points);

  const sunObj = sun(.55); scene.add(sunObj);
  const sunLabel = label('태양', { size: .75, color: '#ffe2a8' }); sunLabel.position.set(0, -1.1, .6); scene.add(sunLabel);
  scene.add(ring(ORBIT_R, 0x8fd3ff, .5));
  const earthObj = earth(.26); scene.add(earthObj);
  const earthLabel = label('지구', { size: .65, color: '#bfe3ff' }); scene.add(earthLabel);
  // 지구의 두 위치 A(지금)와 B(6개월 뒤)
  const marks = {};
  for (const [id, theta, text] of [['A', 0, 'A'], ['B', Math.PI, 'B (6개월 뒤)']]) {
    const p = earthAt(theta);
    const dot = new THREE.Mesh(new THREE.RingGeometry(.13, .18, 32), new THREE.MeshBasicMaterial({ color: 0xffcf6e, transparent: true, opacity: .85, side: THREE.DoubleSide }));
    dot.rotation.x = -Math.PI / 2; dot.position.set(...p);
    const l = label(text, { size: .62, color: '#ffcf6e' }); l.position.set(p[0] + (theta ? -.9 : .5), -.6, p[2] + .5);
    scene.add(dot, l); marks[id] = { dot, l };
  }

  const starX = brightStar(0xffe7c2, .5); starX.position.set(...STAR_X); scene.add(starX);
  const starY = brightStar(0xcfe0ff, .42); starY.position.set(...STAR_Y); scene.add(starY);
  const lx = label('별 X (가까운 별)', { size: .78, color: '#ffe2b0' }); lx.position.set(STAR_X[0], STAR_X[1] + 1, STAR_X[2]); scene.add(lx);
  const ly = label('별 Y (먼 별)', { size: .9, color: '#cfe0ff' }); ly.position.set(STAR_Y[0], STAR_Y[1] + 1.4, STAR_Y[2]); scene.add(ly);

  // 지구에서 별을 보는 시선(배경 하늘까지)
  const sightX = beam(0xffcf6e, .85), sightY = beam(0x8fd3ff, .7);
  scene.add(sightX, sightY);
  // 배경 하늘 위 별 X가 보이는 자리(X1: A에서, X2: B에서)
  const ghost = id => { const g = glowSprite(id[0] === 'X' ? 0xffcf6e : 0x8fd3ff, 2.4, .9); const l = label(id, { size: 1.1, color: id[0] === 'X' ? '#ffcf6e' : '#8fd3ff' }); g.visible = l.visible = false; scene.add(g, l); return { g, l }; };
  const ghosts = { X1: ghost('X1'), X2: ghost('X2'), Y1: ghost('Y1'), Y2: ghost('Y2') };
  // 연주 시차 표시: A·B·태양에서 별까지의 선, ∠AXB의 1/2을 나타내는 호
  const annual = { X: makeAnnual(0xffcf6e), Y: makeAnnual(0x8fd3ff) };
  function makeAnnual(color) {
    const g = new THREE.Group();
    const toA = beam(color, .9), toB = beam(color, .9), toSun = beam(0xffffff, .55, true), arc = angleArc(0xffffff), full = angleArc(color, .55);
    const text = label('연주 시차', { size: .7, color: '#ffffff', bg: '#0a0d22cc' });
    g.add(toA, toB, toSun, arc, full, text); g.visible = false; scene.add(g);
    return { g, toA, toB, toSun, arc, full, text };
  }
  function setAnnual(a, star) {
    const A = earthAt(0), B = earthAt(Math.PI);
    a.toA.userData.set(star, A); a.toB.userData.set(star, B); a.toSun.userData.set(star, [0, 0, 0]);
    const dA = A.map((v, i) => v - star[i]), dS = star.map(v => -v), dB = B.map((v, i) => v - star[i]);
    const r = Math.hypot(...star) * .42;
    a.arc.userData.set(star, dS, dA, r); a.full.userData.set(star, dA, dB, r * .7);
    a.text.position.set(star[0] + 1.3, star[1] + .1, star[2] + r + .2);
  }
  setAnnual(annual.X, STAR_X); setAnnual(annual.Y, STAR_Y);

  kit.start();
  let spin = 0, t = 0;
  return {
    kit,
    setView: name => kit.setView(name),
    invalidate: () => kit.invalidate(),
    // s: { theta, recorded: {A, B}, annual: 'X'|'Y'|null, show }
    update(s, dt) {
      t += dt;
      kit.draw({
        dt, sig: JSON.stringify([s.theta.toFixed(4), s.recorded, s.annual, s.show]), animating: s.moving && !reducedMotion.matches,
        paint: () => {
          const E = earthAt(s.theta);
          earthObj.position.set(...E);
          earthLabel.position.set(E[0], E[1] + .8, E[2]);
          spin += dt * (reducedMotion.matches ? 0 : 1.6); earthObj.userData.ball.rotation.y = spin;
          sightX.userData.set(E, hitSky(E, STAR_X, SKY_R * .985));
          sightY.userData.set(E, hitSky(E, STAR_Y, SKY_R * .985));
          for (const [id, theta, star] of [['X1', 0, STAR_X], ['X2', Math.PI, STAR_X], ['Y1', 0, STAR_Y], ['Y2', Math.PI, STAR_Y]]) {
            const on = !!s.recorded[theta ? 'B' : 'A'] && (id[0] === 'X' || s.show);
            const p = hitSky(earthAt(theta), star, SKY_R * .97);
            ghosts[id].g.position.set(...p); ghosts[id].l.position.set(p[0], p[1] + 2.2, p[2]);
            ghosts[id].g.visible = ghosts[id].l.visible = on;
          }
          annual.X.g.visible = s.annual === 'X'; annual.Y.g.visible = s.annual === 'Y';
          marks.B.dot.material.opacity = s.recorded.B ? .9 : .35;
        },
      });
    },
  };
}
