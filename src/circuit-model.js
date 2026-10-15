// 전구(저항) 두 개의 직렬·병렬연결 모형 (교과서 248–249쪽, 지도서 566–569쪽).
// 크기가 같은 전구만 다루며, 값은 전구 1개 회로를 1로 둔 상대값입니다(계산 활동에 쓰지 않음).
export const CIRCUITS = ['single', 'series', 'parallel'];

// closed: 스위치가 닫혔는지. 반환값 currents는 도선 구간별 상대 전류, brightness는 전구별 상대 밝기(전구 1개 = 1).
export function solve(kind, closed) {
  if (kind === 'single') {
    const I = closed.S1 ? 1 : 0;
    return { currents: { main: I }, brightness: { A: I }, total: I };
  }
  if (kind === 'series') {
    // 하나의 경로: 스위치가 하나라도 열리면 전류가 흐르지 않아요. 전체 저항이 2배 → 전류 1/2, 각 전구 밝기 1/4.
    const I = closed.S1 && closed.S2 ? .5 : 0;
    return { currents: { main: I }, brightness: { A: I * I, B: I * I }, total: I };
  }
  // 두 개의 경로: 각 전구에 전구 1개일 때와 같은 전압이 걸려요.
  const a = closed.S1 ? 1 : 0, b = closed.S2 ? 1 : 0;
  return { currents: { right: a + b, A: a, B: b, left: a + b }, brightness: { A: a, B: b }, total: a + b };
}
