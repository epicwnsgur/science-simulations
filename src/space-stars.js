// 별과 우주 단원에서 쓰는 실제 별들. 교과서·지도서에 나온 값은 그 값을 쓰고(★), 나머지는 HYG 별 목록 v4.1과
// 천문 자료(표면 온도)를 어림한 값이에요. 표면 온도는 ℃로, 교과서처럼 ‘약’을 붙여 어림해 나타내요.
// ra·dec: 적경·적위(도), bv: 색지수(B−V), dist: 거리(pc), m: 겉보기 등급, M: 절대 등급, temp: 표면 온도(℃), color: 교과서 285쪽 색 이름
export const STARS = {
  sun:        { name: '태양', con: '', bv: 0.65, ra: 0, dec: 0, dist: 0.00000485, m: -26.7, M: 4.8, temp: 6000, color: '황색', note: '★교과서: 겉보기 등급 −26.7, 절대 등급 4.8, 표면 온도 약 6000 ℃(어림한 값).' },
  proxima:    { name: '프록시마 센타우리', con: '센타우루스자리', bv: 1.82, ra: 217.43, dec: -62.68, dist: 1.30, m: 11.0, M: 15.5, temp: 2800, color: '적색', note: '★지도서: 태양을 제외하고 지구에서 가장 가까운 별(약 4.2 광년).' },
  sirius:     { name: '시리우스', con: '큰개자리', bv: 0.0, ra: 101.29, dec: -16.72, dist: 2.64, m: -1.5, M: 1.4, temp: 9700, color: '백색', note: '★교과서: 겉보기 등급 −1.5, 절대 등급 1.4.' },
  mirzam:     { name: '미르잠', con: '큰개자리', bv: -0.24, ra: 95.67, dec: -17.96, dist: 151, m: 2.0, M: -4.1, temp: 23000, color: '청백색', note: '★교과서: 겉보기 등급 2.0, 절대 등급 −4.1.' },
  vega:       { name: '베가', con: '거문고자리', bv: 0.0, ra: 279.23, dec: 38.78, dist: 7.68, m: 0.03, M: 0.6, temp: 9300, color: '백색' },
  altair:     { name: '알타이르', con: '독수리자리', bv: 0.22, ra: 297.69, dec: 8.87, dist: 5.13, m: 0.76, M: 2.2, temp: 7400, color: '백색' },
  procyon:    { name: '프로키온', con: '작은개자리', bv: 0.42, ra: 114.83, dec: 5.22, dist: 3.51, m: 0.4, M: 2.7, temp: 6300, color: '황백색' },
  polaris:    { name: '북극성', con: '작은곰자리', bv: 0.64, ra: 37.95, dec: 89.26, dist: 133, m: 2.1, M: -3.7, temp: 5700, color: '황백색', note: '★지도서: 겉보기 등급 약 2.1, 절대 등급 약 −3.7.' },
  capella:    { name: '카펠라', con: '마차부자리', bv: 0.8, ra: 79.17, dec: 46.0, dist: 13.1, m: 0.08, M: -0.5, temp: 4700, color: '황색' },
  arcturus:   { name: '아크투루스', con: '목동자리', bv: 1.23, ra: 213.92, dec: 19.18, dist: 11.3, m: -0.05, M: -0.3, temp: 4000, color: '주황색' },
  aldebaran:  { name: '알데바란', con: '황소자리', bv: 1.54, ra: 68.98, dec: 16.51, dist: 20.4, m: 0.87, M: -0.7, temp: 3600, color: '주황색' },
  betelgeuse: { name: '베텔게우스', con: '오리온자리', bv: 1.85, ra: 88.79, dec: 7.41, dist: 153, m: 0.45, M: -5.5, temp: 3300, color: '적색' },
  antares:    { name: '안타레스', con: '전갈자리', bv: 1.83, ra: 247.35, dec: -26.43, dist: 170, m: 1.06, M: -5.1, temp: 3300, color: '적색' },
  rigel:      { name: '리겔', con: '오리온자리', bv: -0.03, ra: 78.63, dec: -8.2, dist: 265, m: 0.18, M: -6.9, temp: 12000, color: '청백색', note: '★지도서: 표면 온도 약 12000 ℃.' },
  spica:      { name: '스피카', con: '처녀자리', bv: -0.23, ra: 201.30, dec: -11.16, dist: 76.6, m: 0.98, M: -3.4, temp: 22000, color: '청백색', note: '★지도서: 표면 온도 약 20000 ℃ 이상.' },
  naos:       { name: '나오스', con: '고물자리', bv: -0.27, ra: 120.9, dec: -40.0, dist: 332, m: 2.21, M: -5.4, temp: 40000, color: '청색' },
  dschubba:   { name: '드슈바', con: '전갈자리', bv: -0.12, ra: 240.08, dec: -22.62, dist: 151, m: 2.29, M: -3.6, temp: 28000, color: '청백색' },
  deneb:      { name: '데네브', con: '백조자리', bv: 0.09, ra: 310.36, dec: 45.28, dist: 433, m: 1.25, M: -6.9, temp: 8200, color: '백색' },
  megrez:     { name: '메그레즈', con: '큰곰자리(북두칠성)', bv: 0.08, ra: 183.86, dec: 57.03, dist: 17.9, m: 3.3, M: 2.0, temp: 9000, color: '백색', note: '★교과서: 약 58 광년.' },
};
// 교과서 286쪽 북두칠성을 이루는 별까지의 거리(광년)
export const BIG_DIPPER_LY = { 두베: 124, 메라크: 79, 페크다: 84, 메그레즈: 58, 알리오스: 81, 미자르: 78, 알카이드: 101 };
export const lightYears = pc => pc * 3.26;
