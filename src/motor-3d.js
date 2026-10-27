// 전동기 실험의 3D 화면(three.js). 물리 계산은 motor.js의 상태(angle, phase …)를 그대로 쓰고,
// 화살표의 방향은 src/motor-physics.js에서 F = I L × B로 직접 구한 값을 써요.
// 화면을 끌면 돌려 볼 수 있고, 시점 단추(비스듬히·축을 따라·위에서)로 부드럽게 옮겨 가요.
import { THREE, COLORS, label, decal, arrow, setArrow, worldDir, wire, materials, createStage3D } from './three-kit.js';
import { MOTOR, SIMPLE, motorSides, motorField, coilTurn, simpleField, ringPoint, bareFacingDown } from './motor-physics.js';

export function createMotor3D({ stage, svg, reducedMotion }) {
  const VIEWS = {
    motor: { target: [0, -.6, .3], oblique: [5.8, 3.6, 9.4], axis: [0, -.3, 11.5], top: [0, 11.5, .9] },
    simple: { target: [0, -.75, 0], oblique: [3.4, 2.3, 7.9], axis: [8.6, .3, 0], top: [0, 8.8, .6] },
  };
  const kit = createStage3D({ stage, svg, reducedMotion, views: VIEWS, mode: 'motor', ariaLabel: '자석 사이에서 회전하는 코일의 3D 모습. 끌어서 돌려 볼 수 있어요.' });
  const { scene, glow, canvas } = kit;
  const mat = materials();

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
  const spark = label('✦', { size: .5, color: '#ffd166' }); spark.position.set(1.62, AY - .3, .3); simple.add(spark);
  const ringDots = Array.from({ length: 18 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), mat.dot); simple.add(d); return d; });
  const simpleFieldArrows = Array.from({ length: 5 }, (_, i) => { const a = arrow(COLORS.field, .025, .75); a.userData.x = (i - 2) * .42; simple.add(a); return a; });
  const simpleTexts = [label('건전지', { size: .26, color: '#aab4d6' }), label('네오디뮴 자석', { size: .24, color: '#aab4d6' }), label('반만 벗긴 끝', { size: .24, color: '#e8c15a' })];
  simpleTexts[0].position.set(.45, -1.94, .9); simpleTexts[1].position.set(-1.25, -1.05, .7); simpleTexts[2].position.set(1.75, AY + .45, 0);
  simple.add(...simpleTexts);

  let last = {}, flowU = 0, ringU = 0;

  /* ---------- 매 프레임 ---------- */
  function paintMotor(s, dt) {
    const turn = coilTurn(s.angle);
    rotor.rotation.z = turn;
    const sides = motorSides(s.angle, s.current, s.magnet), flowing = s.on;
    for (const [i, side] of [-1, 1].entries()) {
      const isN = (s.magnet > 0) === (side > 0);
      magnets[i].block.material = isN ? mat.north : mat.south;
      const high = kit.lookingDown();
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
      if (!kit.setMode(next)) return;
      motor.visible = next === 'motor'; simple.visible = next === 'simple';
    },
    setView: kit.setView,
    update(s, dt) {
      const mode = kit.mode;
      kit.draw({
        dt,
        sig: `${mode}|${s.angle.toFixed(4)}|${s.phase.toFixed(4)}|${s.on}|${s.show}|${s.current}|${s.magnet}|${s.stripping}|${s.contact}|${s.vIndex}`,
        animating: s.on && (mode === 'motor' || s.contact),
        paint: () => { last.info = mode === 'motor' ? paintMotor(s, dt) : paintSimple(s, dt); },
      });
    },
    // 시험용: 지금 화면에 그려진 화살표와 코일의 실제 방향을 알려 줘요.
    probe() {
      scene.updateMatrixWorld();
      return {
        mode: kit.mode, ...kit.stats(),
        rotorTurn: rotor.rotation.z, ringPhase: ring.rotation.x,
        sides: last.info?.sides, field: last.info?.B,
        forceArrows: forceArrows.map(a => ({ visible: a.visible, dir: worldDir(a), at: a.getWorldPosition(new THREE.Vector3()).toArray() })),
        currentArrows: currentArrows.map(a => ({ visible: a.visible, dir: worldDir(a) })),
        fieldArrows: fieldArrows.filter(a => a.visible).map(a => worldDir(a)),
        simpleField: simpleFieldArrows.filter(a => a.visible).map(a => worldDir(a)),
        dotsVisible: dots.filter(d => d.visible).length + ringDots.filter(d => d.visible).length,
        contact: last.info?.contact, bareDown: last.info?.bareDown,
        brushLeftTouches: (() => { const p = halfDotA.getWorldPosition(new THREE.Vector3()); return p.x < 0 ? 'A' : 'B'; })(),
        brushX: brushes.map(b => b.position.x),
      };
    },
    invalidate: kit.invalidate,
  };
  canvas.probe = view.probe;
  motor.visible = true; simple.visible = false;
  kit.start(mat);
  return view;
}
