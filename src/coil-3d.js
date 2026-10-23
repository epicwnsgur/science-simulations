// ‘전류가 만든 자기장’ 실험의 3D 화면(three.js).
// 코일이 투명한 판을 뚫고 서 있고, 판 위에 나침반 8개와 움직이는 나침반이 있어요(교과서 258–259쪽).
// 나침반 바늘의 각도는 coil.js가 계산한 값(지구 자기장 + 코일·자석의 자기장)을 그대로 써요.
// 자기장의 모습(선)은 src/field3d.js에서 판과 같은 면으로 따라간 선이고, 코일과 막대자석은 축을 중심으로 대칭이라
// 같은 선을 축 둘레로 돌려 공간 속 자기장의 모습도 보여 줘요. 선 위의 작은 화살표가 자기장의 방향이에요.
import { THREE, COLORS, label, decal, arrow, setArrow, worldDir, wire, materials, createStage3D } from './three-kit.js';
import { PX, COIL3, MAGNET3, NEEDLE_Y, coilPoint, fieldLines } from './field3d.js';

const toXZ = p => [(p.x - PX.x) / PX.unit, (p.y - PX.y) / PX.unit];
const toPx = (x, z) => ({ x: PX.x + x * PX.unit, y: PX.y + z * PX.unit });
const BOARD = { x0: (140 - PX.x) / PX.unit, x1: (660 - PX.x) / PX.unit, z0: (62 - PX.y) / PX.unit, z1: (402 - PX.y) / PX.unit };
const TILTS = [Math.PI / 3, Math.PI * 2 / 3]; // 판(0°) 말고도 축 둘레로 60°, 120° 돌린 면에 선을 그려요.

export function createCoil3D({ stage, svg, reducedMotion, ring, moveProbe, probeStart }) {
  const VIEWS = {
    coil: { target: [.2, -.3, .1], oblique: [3.8, 6.2, 9.6], side: [.2, 1.1, 11.8], top: [.2, 12.6, .75] },
    magnet: { target: [.2, -.1, .1], oblique: [3.8, 6.2, 9.6], side: [.2, 1.1, 11.8], top: [.2, 12.6, .75] },
  };
  const kit = createStage3D({ stage, svg, reducedMotion, views: VIEWS, mode: 'magnet', ariaLabel: '투명한 판을 뚫고 선 코일과 판 위의 나침반 3D 모습. 끌어서 돌려 볼 수 있어요.' });
  const { scene, glow, canvas } = kit;
  stage.classList.add('coil3d');
  const mat = materials();
  const cream = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: .6 });
  const needleN = new THREE.MeshStandardMaterial({ color: 0xe23b3b, emissive: 0xe23b3b, emissiveIntensity: .25, roughness: .4, side: THREE.DoubleSide });
  const needleS = new THREE.MeshStandardMaterial({ color: 0xcfd6e6, roughness: .4, side: THREE.DoubleSide });

  /* ---------- 투명한 판, 다리, 북쪽 표시 ---------- */
  const W = BOARD.x1 - BOARD.x0, D = BOARD.z1 - BOARD.z0, CX = (BOARD.x0 + BOARD.x1) / 2, CZ = (BOARD.z0 + BOARD.z1) / 2;
  const boardGeo = new THREE.BoxGeometry(W, .06, D);
  const board = new THREE.Mesh(boardGeo, new THREE.MeshStandardMaterial({ color: 0x9fc3ff, transparent: true, opacity: .16, roughness: .1, depthWrite: false }));
  board.position.set(CX, -.03, CZ); board.renderOrder = 1; scene.add(board);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boardGeo), new THREE.LineBasicMaterial({ color: 0x7fa6e8, transparent: true, opacity: .7 }));
  edges.position.copy(board.position); scene.add(edges);
  for (const [x, z] of [[BOARD.x0 + .3, BOARD.z0 + .3], [BOARD.x1 - .3, BOARD.z0 + .3], [BOARD.x0 + .3, BOARD.z1 - .3], [BOARD.x1 - .3, BOARD.z1 - .3]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.7, 10), mat.carbon); leg.position.set(x, -.91, z); scene.add(leg);
  }
  const north = arrow(0xd8def5, .03); setArrow(north, [BOARD.x1 - .75, .02, BOARD.z0 + 1.1], [0, 0, -1], .7); scene.add(north);
  const northLabel = label('북', { size: .3, color: '#d8def5' }); northLabel.position.set(BOARD.x1 - .75, .3, BOARD.z0 + .2); scene.add(northLabel);
  const boardLabel = label('투명한 판', { size: .22, color: '#8fa6d8' }); boardLabel.position.set(BOARD.x0 + .9, .2, BOARD.z1 - .25); scene.add(boardLabel);

  /* ---------- 코일과 전원 장치 ---------- */
  const coil = new THREE.Group(); scene.add(coil);
  const turnXs = Array.from({ length: COIL3.turns }, (_, k) => -COIL3.width / 2 + COIL3.width * k / (COIL3.turns - 1));
  for (const x of turnXs) { const t = new THREE.Mesh(new THREE.TorusGeometry(COIL3.radius, .04, 10, 96), mat.copper); t.rotation.y = Math.PI / 2; t.position.x = x; coil.add(t); }
  const SUP = { x: BOARD.x0 + 1.05, y: .33, z: BOARD.z0 + .62 };
  const supply = new THREE.Mesh(new THREE.BoxGeometry(1.4, .66, .6), mat.dark); supply.position.set(SUP.x, SUP.y, SUP.z); coil.add(supply);
  const screen = document.createElement('canvas'); screen.width = 256; screen.height = 96;
  const screenTex = new THREE.CanvasTexture(screen); screenTex.colorSpace = THREE.SRGBColorSpace;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(.9, .34), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  display.position.set(SUP.x - .12, SUP.y + .08, SUP.z + .302); coil.add(display);
  let shownVolts = '';
  function setVolts(text) {
    if (text === shownVolts) return;
    shownVolts = text;
    const g = screen.getContext('2d');
    g.fillStyle = '#10131f'; g.fillRect(0, 0, 256, 96);
    g.font = "700 64px ui-monospace, Menlo, Consolas, monospace"; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff4d4d'; g.shadowBlur = 14; g.fillStyle = '#ff4d4d'; g.fillText(`${text} V`, 128, 52);
    screenTex.needsUpdate = true;
  }
  // 단자는 전원 장치의 동쪽(코일 쪽) 옆면에 있어요: 앞(남)쪽이 (+)극(빨강), 뒤(북)쪽이 (−)극(검정).
  // 코일의 두 끝은 판 아래로 나와 단자에 이어져요. 전류의 방향을 바꾸면 두 전선을 서로 바꾸어 꽂아요(실제 실험과 같아요).
  // 처음 방향: (+)극 → 코일의 동쪽 끝, 서쪽 끝 → (−)극. 이때 북쪽 도선에서는 위로, 남쪽 도선에서는 아래로 흘러요.
  const terminals = [[-1, 0x222222], [1, 0xd83b3b]].map(([side, color]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .12, 14), new THREE.MeshStandardMaterial({ color, roughness: .5 }));
    t.rotation.z = Math.PI / 2; t.position.set(SUP.x + .74, SUP.y - .12, SUP.z + side * .14); coil.add(t); return t;
  });
  [['−', '#d8def5', 0], ['+', '#ff7b7b', 1]].forEach(([text, color, i]) => { const l = label(text, { size: .3, color }); const t = terminals[i].position; l.position.set(t.x + .05, t.y + .3, t.z + (i ? .12 : -.12)); coil.add(l); });
  const plusWire = new THREE.MeshStandardMaterial({ color: 0xd83b3b, roughness: .5 }), minusWire = new THREE.MeshStandardMaterial({ color: 0xaab4d6, roughness: .5 });
  const leadSets = new Map([1, -1].map(dir => {
    const set = [[COIL3.turns - 1, dir > 0 ? 1 : 0], [0, dir > 0 ? 0 : 1]].map(([k, ti], n) => {
      const x0 = turnXs[k], t = terminals[ti].position, depth = -1.22 - n * .16, xr = SUP.x + 1.0 + ti * .14;
      const w = wire([[x0, -COIL3.radius, 0], [x0, depth, 0], [xr, depth, t.z], [xr, t.y, t.z], [t.x + .06, t.y, t.z]], .032, ti ? plusWire : minusWire);
      w.plus = ti === 1; w.mesh.visible = dir > 0; coil.add(w.mesh);
      return w;
    });
    return [dir, set];
  }));
  const supplyLabel = label('전원 장치', { size: .24, color: '#aab4d6' }); supplyLabel.position.set(SUP.x, SUP.y + .62, SUP.z); coil.add(supplyLabel);
  const coilLabel = label('코일', { size: .26, color: '#e8c15a' }); coilLabel.position.set(-.5, COIL3.radius + .25, .55); coil.add(coilLabel);
  // 전류 알갱이: 가운데 감은 줄을 따라 전류의 방향으로 흘러요.
  const dots = Array.from({ length: 16 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), mat.dot); coil.add(d); return d; });
  // 전류 화살표: 판을 뚫고 지나는 두 곳(북쪽은 위로, 남쪽은 아래로 — 전류의 방향이 처음일 때)
  const crossArrows = [-1, 1].map(() => { const a = arrow(COLORS.current, .035); coil.add(a); return a; });
  // 전선 위의 전류 알갱이: (+)극에서 나와 코일을 지나 (−)극으로 들어가요.
  const leadDots = Array.from({ length: 2 }, () => Array.from({ length: 9 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), mat.dot); coil.add(d); return d; }));
  const currentLabel = label('전류', { size: .26, color: '#ffd166' }); coil.add(currentLabel);

  /* ---------- 막대자석 ---------- */
  const magnet = new THREE.Group(); scene.add(magnet);
  const halfLen = (80 + 6) / PX.unit, MZ = .62, MY = .5;
  for (const [side, m, letter] of [[-1, mat.north, 'N'], [1, mat.south, 'S']]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(halfLen, MY, MZ), m); box.position.set(side * halfLen / 2, MY / 2, 0); magnet.add(box);
    const top = decal(letter, .42); top.rotation.x = -Math.PI / 2; top.position.set(side * .79, MY + .003, 0); magnet.add(top);
    const front = decal(letter, .32); front.position.set(side * .79, MY / 2, MZ / 2 + .003); magnet.add(front);
  }
  const magnetLabel = label('막대자석', { size: .24, color: '#aab4d6' }); magnetLabel.position.set(0, .05, MZ / 2 + .5); magnet.add(magnetLabel);

  /* ---------- 나침반 ---------- */
  function compass(r, probe = false) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .96, .1, 40), cream); body.position.y = .05; g.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, probe ? .035 : .022, 8, 40), probe ? new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: .6 }) : mat.steel);
    rim.rotation.x = Math.PI / 2; rim.position.y = .1; g.add(rim);
    const needle = new THREE.Group(); needle.position.y = NEEDLE_Y;
    const len = r * .78, wid = r * .2;
    for (const [m, sign] of [[needleN, 1], [needleS, -1]]) {
      const shape = new THREE.Shape([new THREE.Vector2(0, sign * len), new THREE.Vector2(wid, 0), new THREE.Vector2(-wid, 0)]);
      const tri = new THREE.Mesh(new THREE.ShapeGeometry(shape), m); tri.rotation.x = -Math.PI / 2; needle.add(tri); // 모양의 +y가 북쪽(−z)이 돼요.
    }
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), mat.carbon); pin.position.y = .01; needle.add(pin);
    g.add(needle);
    scene.add(g);
    return { g, needle };
  }
  const compasses = ring.map(([x, y]) => { const c = compass(.38); const [X, Z] = toXZ({ x, y }); c.g.position.set(X, 0, Z); return c; });
  const probe = compass(.45, true);
  const probeLabel = label('끌어서 옮겨요', { size: .2, color: '#ffd166' }); scene.add(probeLabel);

  /* ---------- 자기장의 모습 ---------- */
  const lineGroups = new Map();
  const headGeo = new THREE.ConeGeometry(.055, .17, 10);
  function buildLines(kind, direction) {
    const key = `${kind}:${kind === 'magnet' ? 1 : direction}`;
    if (lineGroups.has(key)) return lineGroups.get(key);
    const g = new THREE.Group(), tracks = [];
    const strong = new THREE.MeshBasicMaterial({ color: COLORS.field, transparent: true, opacity: .85, depthWrite: false });
    const faint = new THREE.MeshBasicMaterial({ color: COLORS.field, transparent: true, opacity: .3, depthWrite: false });
    const lift = kind === 'magnet' ? MAGNET3.height : 0; // 막대자석은 판 위에 놓여 축이 조금 높아요.
    const planes = [0, ...TILTS];
    for (const pts2 of fieldLines(kind, direction)) {
      const meanZ = pts2.reduce((s, p) => s + p[1], 0) / pts2.length;
      for (const phi of planes) {
        // 막대자석은 판 위쪽 공간만 그려요(판 아래는 판에 가려 실제로도 관찰하기 어려워요).
        if (kind === 'magnet' && phi && meanZ < 0) continue;
        const pts = pts2.map(([x, z]) => new THREE.Vector3(x, phi ? lift + z * Math.sin(phi) : .025, z * Math.cos(phi)));
        if (pts.length < 2) continue;
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, Math.floor(pts.length / 2)), phi ? .011 : .016, 5, false), phi ? faint : strong);
        tube.renderOrder = 3; g.add(tube);
        tracks.push({ curve, length: curve.getLength(), board: !phi });
      }
    }
    // 흐르는 작은 화살표(자기장의 방향)
    const heads = [];
    for (const t of tracks) {
      const n = Math.max(1, Math.round(t.length / (t.board ? 1.3 : 1.9)));
      for (let j = 0; j < n; j++) {
        const h = new THREE.Mesh(headGeo, t.board ? strong : faint); h.renderOrder = 4;
        h.userData = { track: t, u: j / n }; g.add(h); heads.push(h);
      }
    }
    g.userData.heads = heads;
    g.visible = false; scene.add(g);
    lineGroups.set(key, g);
    return g;
  }
  const Yv = new THREE.Vector3(0, 1, 0);
  function placeHeads(g, flow) {
    for (const h of g.userData.heads) {
      const { track, u } = h.userData, at = (u + flow) % 1;
      h.position.copy(track.curve.getPointAt(at));
      h.quaternion.setFromUnitVectors(Yv, track.curve.getTangentAt(at));
    }
  }

  /* ---------- 움직이는 나침반 끌기 ----------
     노란 나침반을 누르면 화면 돌리기 대신 나침반이 판 위를 따라와요(살짝 미끄러지듯 부드럽게). */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let drag = null, target = null, probePx = { ...probeStart };
  const pick = e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, kit.camera); };
  const onBoard = () => { const p = new THREE.Vector3(); return ray.ray.intersectPlane(plane, p) ? p : null; };
  stage.addEventListener('pointerdown', e => {
    if (e.target !== canvas || !stage.classList.contains('three-on')) return;
    pick(e);
    if (!ray.intersectObject(probe.g, true).length) return;
    e.stopPropagation(); e.preventDefault();
    const p = onBoard();
    drag = { id: e.pointerId, offset: p ? [probe.g.position.x - p.x, probe.g.position.z - p.z] : [0, 0] };
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing');
  }, true);
  canvas.addEventListener('pointermove', e => {
    pick(e);
    if (!drag) { canvas.style.cursor = ray.intersectObject(probe.g, true).length ? 'move' : ''; return; }
    const p = onBoard();
    if (p) target = toPx(p.x + drag.offset[0], p.z + drag.offset[1]);
  });
  const endDrag = () => { if (!drag) return; drag = null; canvas.classList.remove('grabbing'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  function followProbe(dt) {
    if (!target) return;
    const k = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 22);
    moveProbe(probePx.x + (target.x - probePx.x) * k, probePx.y + (target.y - probePx.y) * k);
    if (!drag && Math.hypot(target.x - probePx.x, target.y - probePx.y) < .5) target = null;
  }

  let flowU = 0, headU = 0, leadU = 0, last = {};
  function paint(s, dt) {
    const coilMode = s.mode === 'coil', flowing = coilMode && s.on;
    coil.visible = coilMode; magnet.visible = !coilMode;
    setVolts(s.volts);
    mat.copper.emissiveIntensity = flowing ? .15 + .1 * s.level : 0;
    glow.intensity = flowing ? 1.5 + s.level : 0; glow.position.set(0, .4, 0);
    // 전류 알갱이: direction > 0이면 북쪽 도선에서 위로, 남쪽 도선에서 아래로 흘러요(coilPoint의 t가 커지는 방향).
    if (flowing && !reducedMotion.matches) flowU = (flowU + s.direction * dt * (.1 + .07 * s.level) + 1) % 1;
    dots.forEach((d, i) => { d.visible = flowing; if (flowing) d.position.set(...coilPoint(((flowU + i / dots.length) % 1) * 2 * Math.PI, 0)); });
    // 전선: 전류의 방향에 따라 두 전선을 바꾸어 꽂은 모습
    for (const [dir, set] of leadSets) set.forEach(w => { w.mesh.visible = dir === Math.sign(s.direction); });
    const leads = leadSets.get(Math.sign(s.direction));
    if (flowing && !reducedMotion.matches) leadU = (leadU + dt * (.12 + .06 * s.level)) % 1;
    leadDots.forEach((row, n) => row.forEach((d, i) => {
      d.visible = flowing;
      // 전선의 길은 코일 끝에서 단자 쪽으로 정해 두었어요. (+)극 전선은 거꾸로, (−)극 전선은 그대로 따라가요.
      if (flowing) { const u = (leadU + i / row.length) % 1; d.position.copy(leads[n].path.getPointAt(leads[n].plus ? 1 - u : u)); }
    }));
    crossArrows.forEach((a, i) => {
      // i = 0: 북쪽(z = −1) 도선, i = 1: 남쪽(z = +1) 도선
      a.visible = flowing;
      const up = (i === 0 ? 1 : -1) * s.direction;
      setArrow(a, [.42, -up * .55, i === 0 ? -COIL3.radius : COIL3.radius], [0, up, 0], 1.1);
    });
    currentLabel.visible = flowing;
    currentLabel.position.set(.78, .5, -COIL3.radius - .1);
    // 나침반 바늘: 0°는 북쪽(−z), 동쪽(+x)으로 돌면 +. y축 둘레로 −각도만큼 돌리면 돼요.
    compasses.forEach((c, i) => { c.needle.rotation.y = -s.needles[i] * Math.PI / 180; });
    probePx = { ...s.probe };
    const [px, pz] = toXZ(s.probe);
    probe.g.position.set(px, 0, pz); probe.needle.rotation.y = -s.needles.at(-1) * Math.PI / 180;
    probeLabel.position.set(px, .05, pz + .86);
    // 자기장의 모습
    const visible = s.show && (!coilMode || s.on);
    for (const g of lineGroups.values()) g.visible = false;
    if (visible) {
      const g = buildLines(s.mode, s.direction);
      g.visible = true;
      if (!reducedMotion.matches) headU = (headU + dt * .12) % 1;
      placeHeads(g, headU);
    }
  }

  const view = {
    canvas,
    setMode(next) { kit.setMode(next); },
    setView: kit.setView,
    cancelDrag() { drag = null; target = null; },
    update(s, dt) {
      followProbe(dt);
      const flowing = s.mode === 'coil' && s.on;
      const linesOn = s.show && (s.mode === 'magnet' || s.on);
      kit.draw({
        dt,
        sig: `${s.mode}|${s.on}|${s.show}|${s.direction}|${s.level}|${s.needles.map(a => a.toFixed(1)).join(',')}|${s.probe.x.toFixed(1)},${s.probe.y.toFixed(1)}`,
        animating: (flowing || linesOn) && !reducedMotion.matches,
        paint: () => { last = s; paint(s, dt); },
      });
    },
    // 시험용: 화면에 그려진 바늘·화살표의 실제 방향을 알려 줘요.
    probe() {
      scene.updateMatrixWorld();
      const visibleLines = [...lineGroups.values()].find(g => g.visible);
      const horiz = obj => { const d = worldDir(obj, new THREE.Vector3(0, 0, -1)); return [d[0], d[2]]; };
      return {
        mode: kit.mode, ...kit.stats(),
        coilVisible: coil.visible, magnetVisible: magnet.visible,
        compasses: compasses.map(c => ({ at: [c.g.position.x, c.g.position.z], north: horiz(c.needle) })),
        probe: { at: [probe.g.position.x, probe.g.position.z], north: horiz(probe.needle) },
        crossArrows: crossArrows.map(a => ({ visible: a.visible, dir: worldDir(a), at: a.position.toArray() })),
        dotsVisible: dots.filter(d => d.visible).length,
        // 지금 보이는 전선: (+)극 전선이 이어진 코일 끝(동쪽 +1 / 서쪽 −1)
        plusLeadEnd: (() => { const w = [...leadSets.values()].flat().find(v => v.mesh.visible && v.plus); return Math.sign(w.path.getPointAt(0).x); })(),
        heads: visibleLines ? visibleLines.userData.heads.filter(h => h.userData.track.board).map(h => ({ at: h.position.toArray(), dir: worldDir(h) })) : [],
        volts: shownVolts,
        // 움직이는 나침반이 화면에서 보이는 자리(시험에서 끌기용)
        probeScreen: (() => { const v = probe.g.position.clone().project(kit.camera), r = canvas.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; })(),
        last: last.mode,
      };
    },
    invalidate: kit.invalidate,
  };
  canvas.probe = view.probe;
  coil.visible = false;
  kit.start({ ...mat, cream, needleN, needleS });
  return view;
}
