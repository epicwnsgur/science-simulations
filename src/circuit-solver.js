// 자유 회로 실험실의 계산(저항의 연결 실험의 ‘자유 회로 실험실’ 탭, 화면은 src/circuit-sandbox.js).
// 부품은 두 점(a, b) 사이에 놓여요. 마디(점)마다 전압을 구하는 방법(마디 해석)으로 풀어요.
// 중학교 수준의 이상적인 모형이에요: 전구·저항은 저항값이 일정하고(옴의 법칙), 전류계는 저항이 거의 0, 전압계는 저항이 아주 커요.
// 전지에는 아주 작은 내부 저항을 두어, 전지를 도선으로 바로 이으면(합선) 전류가 매우 커지는 것을 알 수 있게 해요.
export const CELL_V = 1.5;          // 건전지 1개의 전압(V)
export const CELL_R = 0.001;        // 전지의 내부 저항(Ω): 보통 회로의 값에는 거의 영향이 없어요(10 Ω 전구에서 0.01 %).
export const WIRE_R = 0.0001;       // 도선·닫힌 스위치·전류계의 저항(Ω)
export const VOLTMETER_R = 1e8;     // 전압계의 저항(Ω): 전류가 거의 흐르지 않아요.
export const BULB_R = 10;           // 전구의 저항(Ω)
export const BULB_RATED_V = 3;      // 전구가 알맞게(밝기 1) 켜지는 전압: 건전지 2개
export const BULB_BURN_V = 4.6;     // 이보다 큰 전압이 걸리면 필라멘트가 끊어져요(건전지 4개 이상).
export const SHORT_A = 3;           // 전지에 이보다 센 전류가 흐르면 합선이에요.
export const RESISTORS = [5, 10, 20];
const GMIN = 1e-9;                  // 떠 있는 점(아무 데도 이어지지 않은 점)도 풀 수 있게 하는 아주 작은 전도도

// parts: [{ id, type: 'wire'|'cell'|'bulb'|'resistor'|'switch'|'ammeter'|'voltmeter', a, b, flip, on, ohm, burnt }]
// 전지: flip이 false면 b가 (+)극. 전류계·전압계: flip이 false면 a가 (+)단자.
// 돌려주는 값: parts마다 { current(a→b, A), voltage(Va−Vb, V), reading, brightness }, shorted(합선된 전지 id), burnt(새로 끊어진 전구 id)
export function solveCircuit(parts) {
  const nodes = new Map();
  const idx = n => { if (!nodes.has(n)) nodes.set(n, nodes.size); return nodes.get(n); };
  for (const p of parts) { idx(p.a); idx(p.b); }
  const N = nodes.size;
  const conduct = p => {
    if (p.type === 'wire' || p.type === 'ammeter') return 1 / WIRE_R;
    if (p.type === 'switch') return p.on ? 1 / WIRE_R : 0;
    if (p.type === 'bulb') return p.burnt ? 0 : 1 / BULB_R;
    if (p.type === 'resistor') return 1 / (p.ohm ?? 10);
    if (p.type === 'voltmeter') return 1 / VOLTMETER_R;
    if (p.type === 'cell') return 1 / CELL_R;
    return 0;
  };
  const emf = p => (p.type === 'cell' ? (p.flip ? -CELL_V : CELL_V) : 0); // b쪽 전위를 올리는 기전력
  const G = Array.from({ length: N }, () => new Float64Array(N + 1));
  for (let i = 0; i < N; i++) G[i][i] += GMIN;
  for (const p of parts) {
    const a = idx(p.a), b = idx(p.b), g = conduct(p);
    if (!g || a === b) continue;
    G[a][a] += g; G[b][b] += g; G[a][b] -= g; G[b][a] -= g;
    // 전지(노턴 등가): b로 E/r만큼 전류가 들어가고 a에서 나와요.
    const e = emf(p);
    if (e) { G[b][N] += e * g; G[a][N] -= e * g; }
  }
  const V = gauss(G, N);
  const v = n => V[nodes.get(n)];
  const results = new Map();
  const shorted = [];
  for (const p of parts) {
    const g = conduct(p), dv = v(p.a) - v(p.b);
    const current = g ? (dv + emf(p)) * g : 0; // a에서 b 쪽으로 흐르는 전류
    const r = { current, voltage: dv };
    if (p.type === 'ammeter') r.reading = p.flip ? -current : current;            // (+)단자로 들어가는 전류
    if (p.type === 'voltmeter') r.reading = p.flip ? -dv : dv;                    // (+)단자 − (−)단자
    if (p.type === 'bulb') r.brightness = p.burnt ? 0 : (dv * dv) / (BULB_RATED_V * BULB_RATED_V);
    if (p.type === 'cell' && Math.abs(current) > SHORT_A) shorted.push(p.id);
    results.set(p.id, r);
  }
  const burnt = parts.filter(p => p.type === 'bulb' && !p.burnt && Math.abs(results.get(p.id).voltage) > BULB_BURN_V).map(p => p.id);
  return { results, shorted, burnt };
}

// 전구가 끊어지면 회로가 바뀌므로, 더 끊어지는 전구가 없을 때까지 다시 풀어요.
export function solveWithBurnout(parts) {
  let current = parts.map(p => ({ ...p })), burntNow = [];
  for (let k = 0; k < parts.length + 1; k++) {
    const s = solveCircuit(current);
    if (!s.burnt.length) return { ...s, burnt: burntNow, parts: current };
    burntNow = burntNow.concat(s.burnt);
    current = current.map(p => (s.burnt.includes(p.id) ? { ...p, burnt: true } : p));
  }
  return { ...solveCircuit(current), burnt: burntNow, parts: current };
}

function gauss(M, n) {
  const A = M.map(r => Float64Array.from(r));
  for (let c = 0; c < n; c++) {
    let best = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[best][c])) best = r;
    [A[c], A[best]] = [A[best], A[c]];
    const piv = A[c][c];
    if (Math.abs(piv) < 1e-300) continue;
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / piv;
      if (!f) continue;
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = A[r][n];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = Math.abs(A[r][r]) < 1e-300 ? 0 : s / A[r][r];
  }
  return x;
}

// 화면에 쓰는 글: 전류는 1 A보다 작으면 mA로, 전압은 V로 써요.
export const ampText = a => (Math.abs(a) < 0.0005 ? '0 mA' : Math.abs(a) < 1 ? `${Math.round(a * 1000)} mA` : `${a.toFixed(2)} A`);
export const voltText = v => `${(Math.abs(v) < 0.005 ? 0 : v).toFixed(2)} V`;
