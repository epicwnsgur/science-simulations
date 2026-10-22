// 나침반과 자기장 그림에 쓰는 2D 도우미(교과서 258–259쪽, 지도서 584–589쪽). 화면 좌표(y는 아래쪽이 +)를 써요.
// 자기장 계산은 3차원 모형(src/field3d.js)에서 하고, 여기서는 2D 그림(위에서 본 판)에 나타내는 일만 해요.
// 나침반 바늘은 지구 자기장과 코일(자석)의 자기장이 합쳐진 방향을 가리킵니다(지도서 587쪽 오개념).

export const EARTH = Object.freeze({ x: 0, y: -1 }); // 화면 위쪽을 북쪽으로 둡니다. 세기 1이 지구 자기장(수평 성분)이에요.
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
// 나침반 N극이 가리키는 화면 각도(도). 0°는 화면 위쪽(북쪽), 시계 방향이 +.
export const needleDeg = b => Math.atan2(b.x, -b.y) * 180 / Math.PI;
export const toPath = pts => 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L');
