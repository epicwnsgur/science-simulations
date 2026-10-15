// 자기장 속 전류가 흐르는 코일이 받는 힘 (교과서 260–263쪽, 지도서 590–593쪽).
// 힘의 방향은 전류의 방향과 자기장의 방향에 따라 바뀌고, 힘의 크기는 전류가 셀수록 커집니다.
// 값은 화면 표현을 위한 상대값입니다.

// 전기 그네: current = ±1(전류의 방향), magnet = ±1(+1이면 위쪽 팔이 S극, 아래쪽 팔이 N극), voltage(V).
// 교과서 261쪽: 처음 상태에서 코일은 말굽자석 바깥쪽(㉮)으로 움직여요. 반환값 +1 = 바깥쪽, −1 = 안쪽.
export function swingDirection(current, magnet) { return current * magnet; }
export const VOLTAGES = [1, 3, 5];
// 그네가 기울어지는 각도(도). 전류가 셀수록(전압이 높을수록) 더 많이 움직여요.
export function swingAngle(current, magnet, voltage, on = true) {
  if (!on || !voltage) return 0;
  return swingDirection(current, magnet) * (3 + voltage * 1.6);
}

// 전동기(교과서 262쪽 그림 Ⅶ-16): 자석 사이의 코일을 앞에서 본 모습. angle은 코일 면이 수평에서 기운 각도(라디안).
// 코일의 왼쪽과 오른쪽에 흐르는 전류의 방향이 반대라서 두 부분이 받는 힘의 방향도 반대가 되어 코일이 회전해요.
// 반 바퀴마다 전류의 방향을 바꾸어 주는 부분(그림의 금색 고리) 덕분에 같은 방향으로 계속 돌아요.
export function motorTorque(angle, current, magnet, voltage) {
  return current * magnet * voltage * Math.abs(Math.cos(angle));
}

// 간이 전동기(교과서 264쪽): 코일 면이 정면을 향할 때 phase = 0. 자석은 코일 아래에 있어요.
// 에나멜을 한쪽만 반만 벗기면(half) 코일이 반 바퀴 도는 동안만 전류가 흘러 한 방향으로 계속 돌아요.
// 양쪽을 모두 완전히 벗기면(full) 늘 전류가 흘러 힘의 방향이 반 바퀴마다 거꾸로 작용하므로 흔들리다 멈춰요.
export function simpleMotorContact(phase, stripping) {
  return stripping === 'full' || Math.cos(phase) > 0;
}
export function simpleMotorTorque(phase, stripping, magnet, voltage) {
  return simpleMotorContact(phase, stripping) ? magnet * voltage * Math.cos(phase) : 0;
}
