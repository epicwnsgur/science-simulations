// 전기 그네 실험의 3D 화면(three.js, 교과서 260–261쪽).
// 말굽자석의 두 팔 사이로 코일(그네)의 아래 변이 지나가고, 전류가 흐르면 아래 변이 받는 힘으로 그네가 움직여요.
// 그네의 기울기는 swing.js가 계산한 값을 쓰고, 화살표 방향은 src/swing-physics.js에서 F = I L × B로 구해요.
import { THREE, COLORS, label, decal, arrow, setArrow, worldDir, wire, materials, createStage3D } from './three-kit.js';
import { swingField, swingForces } from './swing-physics.js';

// 2D 그림(px)과 같은 크기 비율: 60 px = 1
const PIVOT_Y = 3.4, TOP_R = 2.0, BOTTOM_R = 4.2, HALF = .7, ARM = .37;
const ARM_X0 = -1.17, ARM_X1 = 2.0, TOP_ARM_Y = .4, BOTTOM_ARM_Y = -1.63, ARM_H = .4;

export function createSwing3D({ stage, svg, reducedMotion }) {
  const VIEWS = { swing: { target: [.4, .8, 0], oblique: [-6.4, 4.4, 11.2], front: [.4, .9, 13.5], side: [-13.5, 1.6, .5] } };
  const kit = createStage3D({ stage, svg, reducedMotion, views: VIEWS, mode: 'swing', ariaLabel: '말굽자석 사이에 매달린 전기 그네의 3D 모습. 끌어서 돌려 볼 수 있어요.' });
  const { scene, glow, canvas } = kit;
  stage.classList.add('swing3d');
  const mat = materials();
  const blue = new THREE.MeshStandardMaterial({ color: COLORS.south, roughness: .45, metalness: .1 });
  const red = new THREE.MeshStandardMaterial({ color: COLORS.north, roughness: .45, metalness: .1 });
  const bendMat = new THREE.MeshStandardMaterial({ color: 0xb9bfcc, roughness: .35, metalness: .6 });

  /* ---------- 받침대와 막대 ---------- */
  const base = new THREE.Mesh(new THREE.BoxGeometry(7.6, .2, 3.4), mat.dark); base.position.set(.4, -2.25, 0); scene.add(base);
  // 스탠드: 뒤쪽 기둥 하나에서 막대가 앞으로 뻗어 있어요(앞에서 볼 때 그네를 가리지 않아요).
  const POST_Z = -1.5;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 5.65, 14), mat.steel); post.position.set(0, .6, POST_Z); scene.add(post);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.4, 14), mat.steel); rod.rotation.x = Math.PI / 2; rod.position.set(0, PIVOT_Y, POST_Z + 1.2); scene.add(rod);

  /* ---------- 말굽자석: 오른쪽이 굽은 부분, 두 팔이 왼쪽으로 ---------- */
  const armLen = ARM_X1 - ARM_X0, arms = [];
  for (const y of [TOP_ARM_Y, BOTTOM_ARM_Y]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(armLen, ARM_H, ARM * 2), blue); box.position.set((ARM_X0 + ARM_X1) / 2, y, 0); scene.add(box);
    const letters = {};
    for (const p of ['N', 'S']) {
      const front = decal(p, .42); front.position.set(ARM_X0 + .4, y, ARM + .003);
      const end = decal(p, .38); end.rotation.y = -Math.PI / 2; end.position.set(ARM_X0 - .003, y, 0);
      letters[p] = [front, end]; scene.add(front, end);
    }
    arms.push({ box, letters });
  }
  const bend = new THREE.Mesh(new THREE.TorusGeometry((TOP_ARM_Y - BOTTOM_ARM_Y) / 2, ARM_H / 2, 16, 40, Math.PI), bendMat);
  bend.rotation.z = -Math.PI / 2; bend.scale.z = ARM * 2 / ARM_H; bend.position.set(ARM_X1, (TOP_ARM_Y + BOTTOM_ARM_Y) / 2, 0); scene.add(bend);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.8, .4, 1), mat.carbon); stand.position.set(1.2, -2.0, 0); scene.add(stand);
  const magnetLabel = label('말굽자석', { size: .26, color: '#aab4d6' }); magnetLabel.position.set(1.4, -2.0, 1.1); scene.add(magnetLabel);

  /* ---------- 그네(코일): 막대에 매달려 z축 둘레로 흔들려요 ---------- */
  const swing = new THREE.Group(); swing.position.y = PIVOT_Y; scene.add(swing);
  const yTop = -TOP_R, yBottom = -BOTTOM_R;
  for (const dx of [-.06, 0, .06]) swing.add(wire([[dx, yTop, -HALF], [dx, yBottom, -HALF], [dx, yBottom, HALF], [dx, yTop, HALF], [dx, yTop, -HALF]], .035, mat.copper).mesh);
  // 매다는 도선 두 가닥: 막대의 고리에서 코일 위쪽 두 모서리로 이어져요. 전류는 이 도선으로 들어오고 나가요.
  for (const z of [-HALF, HALF]) { const h = new THREE.Mesh(new THREE.TorusGeometry(.09, .025, 8, 20), mat.brass); h.position.set(0, 0, z); swing.add(h); }
  for (const z of [-HALF, HALF]) swing.add(wire([[0, 0, z], [0, yTop, z]], .018, mat.wire).mesh);
  // 전류가 흐르는 길(가운데 줄): 먼 쪽 고리 → 먼 쪽 변 ↓ → 아래 변 → 가까운 쪽 변 ↑ → 가까운 쪽 고리
  const path = wire([[0, 0, -HALF], [0, yBottom, -HALF], [0, yBottom, HALF], [0, 0, HALF]], .001, mat.copper).path;
  const dots = Array.from({ length: 18 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), mat.dot); swing.add(d); return d; });
  const coilLabel = label('코일(전기 그네)', { size: .24, color: '#e8c15a' }); coilLabel.position.set(-.2, yTop + .35, HALF + .45); swing.add(coilLabel);

  /* ---------- 전원 장치와 전선: 전류의 방향을 바꾸면 두 전선을 바꾸어 꽂아요 ---------- */
  const SUP = { x: -3.2, y: -1.8, z: -.6 };
  const supply = new THREE.Mesh(new THREE.BoxGeometry(1.5, .7, .8), mat.dark); supply.position.set(SUP.x, SUP.y, SUP.z); scene.add(supply);
  const screen = document.createElement('canvas'); screen.width = 256; screen.height = 96;
  const screenTex = new THREE.CanvasTexture(screen); screenTex.colorSpace = THREE.SRGBColorSpace;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(.95, .34), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  display.position.set(SUP.x - .15, SUP.y + .1, SUP.z + .402); scene.add(display);
  let shownVolts = '';
  function setVolts(text) {
    if (text === shownVolts) return;
    shownVolts = text;
    const g = screen.getContext('2d');
    g.fillStyle = '#10131f'; g.fillRect(0, 0, 256, 96);
    g.font = '700 64px ui-monospace, Menlo, Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff4d4d'; g.shadowBlur = 14; g.fillStyle = '#ff4d4d'; g.fillText(`${text} V`, 128, 52);
    screenTex.needsUpdate = true;
  }
  const supplyLabel = label('전원 장치', { size: .24, color: '#aab4d6' }); supplyLabel.position.set(SUP.x, SUP.y + .65, SUP.z); scene.add(supplyLabel);
  // 단자: 오른쪽 옆면의 뒤쪽이 (+)극(빨강), 앞쪽이 (−)극
  const terminals = [[1, 0xd83b3b, '+'], [-1, 0x222222, '−']].map(([side, color, text]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .14, 14), new THREE.MeshStandardMaterial({ color, roughness: .5 }));
    t.rotation.z = Math.PI / 2; t.position.set(SUP.x + .82, SUP.y + .1, SUP.z - side * .2); scene.add(t);
    const l = label(text, { size: .3, color: side > 0 ? '#ff7b7b' : '#d8def5' }); l.position.set(SUP.x + .85, SUP.y + .45, SUP.z - side * .2); scene.add(l);
    return t;
  });
  const plusWire = new THREE.MeshStandardMaterial({ color: 0xd83b3b, roughness: .5 }), minusWire = new THREE.MeshStandardMaterial({ color: 0xaab4d6, roughness: .5 });
  // 막대 위쪽의 두 고리(먼 쪽 z = −0.7, 가까운 쪽 z = +0.7)까지 전선이 올라가요.
  // current > 0: (+)극 → 먼 쪽 고리(그래서 아래 변에서 전류가 보는 사람 쪽으로 흘러요). 바꾸면 (+)극 → 가까운 쪽 고리.
  const leadSets = new Map([1, -1].map(dir => {
    const set = [0, 1].map(ti => {
      const t = terminals[ti].position, plus = ti === 0;
      // 전선은 바닥을 지나 뒤쪽 기둥을 타고 올라가 막대를 따라 고리까지 가요.
      const hookZ = (plus === (dir > 0)) ? -HALF : HALF, x = -.14 - ti * .1, y = PIVOT_Y + .12 + ti * .1;
      const w = wire([[t.x + .07, t.y, t.z], [x, t.y, t.z], [x, t.y, POST_Z - .12], [x, y, POST_Z - .12], [x, y, hookZ], [0, PIVOT_Y, hookZ]], .028, plus ? plusWire : minusWire);
      w.plus = plus; w.hookZ = hookZ; w.mesh.visible = dir > 0; scene.add(w.mesh);
      return w;
    });
    return [dir, set];
  }));

  /* ---------- 자기장·전류·힘 화살표, ㉮·㉯ 표시 ---------- */
  const fieldArrows = [-.6, .3, 1.2].flatMap(x => [-.18, .18].map(z => { const a = arrow(COLORS.field, .028, .8); a.userData.at = [x, z]; scene.add(a); return a; }));
  const fieldLabel = label('자기장', { size: .24, color: '#5fe0ff' }); fieldLabel.position.set(1.65, -.6, ARM + .4); scene.add(fieldLabel);
  const currentArrow = arrow(COLORS.current, .04); swing.add(currentArrow);
  const forceArrow = arrow(COLORS.force, .065); scene.add(forceArrow);
  const forceLabel = label('힘', { size: .3, color: '#ff9a9a' }); scene.add(forceLabel);
  const outLabel = label('㉮ 바깥쪽', { size: .3, color: '#ffd166' }); outLabel.position.set(-2.5, -1.35, 1.5); scene.add(outLabel);
  const inLabel = label('㉯ 안쪽', { size: .3, color: '#ffd166' }); inLabel.position.set(2.9, .9, 1.3); scene.add(inLabel);

  let flowU = 0, last = {};
  function paint(s, dt) {
    swing.rotation.z = s.angle * Math.PI / 180; // 2D와 같은 각도: −이면 바깥쪽(왼쪽)
    const isS = s.magnet > 0; // 위쪽 팔이 S극
    arms.forEach((a, i) => {
      const pole = (i === 0) === isS ? 'S' : 'N';
      a.box.material = pole === 'N' ? red : blue;
      a.letters.N.forEach(m => { m.visible = pole === 'N'; }); a.letters.S.forEach(m => { m.visible = pole === 'S'; });
    });
    setVolts(s.volts);
    for (const [dir, set] of leadSets) set.forEach(w => { w.mesh.visible = dir === Math.sign(s.current); });
    mat.copper.emissiveIntensity = s.on ? .15 + .07 * s.vIndex : 0;
    glow.intensity = s.on ? 2 : 0; glow.position.set(0, PIVOT_Y - BOTTOM_R + .3, 0);
    if (s.on && !reducedMotion.matches) flowU = (flowU + Math.sign(s.current) * dt * (.18 + .08 * s.vIndex) + 1) % 1;
    dots.forEach((d, i) => { d.visible = s.on; if (s.on) d.position.copy(path.getPointAt((flowU + i / dots.length) % 1)); });
    const B = swingField(s.magnet), bottom = swingForces(s.current, s.magnet)[1];
    fieldArrows.forEach(a => { a.visible = s.show; const [x, z] = a.userData.at; setArrow(a, [x, B[1] > 0 ? BOTTOM_ARM_Y + .25 : TOP_ARM_Y - .25, z], B, (TOP_ARM_Y - BOTTOM_ARM_Y) - .5); });
    fieldLabel.visible = s.show;
    currentArrow.visible = s.show && s.on;
    setArrow(currentArrow, [.2, yBottom - .22, -bottom.I[2] * .55], bottom.I, 1.1);
    const swingNow = new THREE.Vector3(0, yBottom, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), swing.rotation.z).add(swing.position);
    forceArrow.visible = forceLabel.visible = s.show && s.on;
    setArrow(forceArrow, [swingNow.x + Math.sign(bottom.F[0]) * .15, swingNow.y, HALF + .25], bottom.F, 1.3);
    forceLabel.position.set(swingNow.x + Math.sign(bottom.F[0]) * 1.1, swingNow.y + .4, HALF + .25);
    return { bottom, B };
  }

  const view = {
    canvas,
    setMode() {},
    setView: kit.setView,
    update(s, dt) {
      kit.draw({
        dt,
        sig: `${s.angle.toFixed(3)}|${s.on}|${s.show}|${s.current}|${s.magnet}|${s.vIndex}`,
        animating: s.on && !reducedMotion.matches,
        paint: () => { last = paint(s, dt); },
      });
    },
    // 시험용: 화면에 그려진 그네와 화살표의 실제 방향
    probe() {
      scene.updateMatrixWorld();
      const bottomNow = new THREE.Vector3(0, yBottom, 0).applyMatrix4(swing.matrixWorld);
      return {
        ...kit.stats(),
        swingAngle: swing.rotation.z * 180 / Math.PI, bottomX: bottomNow.x,
        field: fieldArrows.filter(a => a.visible).map(a => worldDir(a)),
        current: currentArrow.visible ? worldDir(currentArrow) : null,
        force: forceArrow.visible ? worldDir(forceArrow) : null,
        topPole: arms[0].letters.S[0].visible ? 'S' : 'N',
        plusHookZ: [...leadSets.values()].flat().find(w => w.mesh.visible && w.plus).hookZ,
        dotsVisible: dots.filter(d => d.visible).length,
        volts: shownVolts, bottomInField: bottomNow.y < TOP_ARM_Y - ARM_H / 2 && bottomNow.y > BOTTOM_ARM_Y + ARM_H / 2,
        model: last.bottom ? { I: last.bottom.I, F: last.bottom.F, B: last.B } : null,
      };
    },
    invalidate: kit.invalidate,
  };
  canvas.probe = view.probe;
  kit.start({ ...mat, blue, red, bendMat, plusWire, minusWire });
  return view;
}
