// 별과 우주 단원에서 쓰는 실제 천체 사진(public/space/photos, public/space/galaxies)과 출처.
// 모두 출처가 분명한 사진이에요(ESO·NASA/ESA·NOIRLab 사진은 CC BY 4.0 또는 공공 저작물, 위키미디어 공용 사진은 해당 쪽의 이용 허락).
// 사진 파일은 Stellarium(천체 관측 프로그램)이 함께 배포하는 천체 사진 모음에서 받았어요(일부는 Sun Shuwei가 다듬음).
export const PHOTOS = {
  m7: { src: 'm7-open-cluster.jpg', name: 'M7 (프톨레마이오스 성단)', kind: '산개 성단', credit: 'ESO', url: 'https://www.eso.org/public/images/eso1406a/' },
  m44: { src: 'm44-beehive.jpg', name: 'M44 (프레세페 성단)', kind: '산개 성단', credit: 'Giuseppe Donatiello / Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Messier_44_2018.jpg' },
  ngc3532: { src: 'ngc3532-cluster.jpg', name: 'NGC 3532', kind: '산개 성단', credit: 'ESO', url: 'https://www.eso.org/public/images/eso1439a/' },
  jewel: { src: 'jewel-box.jpg', name: '보석 상자 성단 (NGC 4755)', kind: '산개 성단', credit: 'ESO / Y. Beletsky', url: 'https://www.eso.org/public/images/eso0940a/' },
  m80: { src: 'm80-globular.jpg', name: 'M80', kind: '구상 성단', credit: 'NOIRLab / NSF / AURA', url: 'https://noirlab.edu/public/images/noao-m80/' },
  m13: { src: 'm13-globular.jpg', name: 'M13 (헤르쿨레스자리 구상 성단)', kind: '구상 성단', credit: 'Starhopper / Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:M013.jpg' },
  rosette: { src: 'rosette-emission.jpg', name: '장미 성운 (NGC 2237)', kind: '방출 성운', credit: 'Keesscherer / Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Rosette_Nebula_Keesscherer.jpg' },
  ngc3603: { src: 'ngc3603-emission.jpg', name: 'NGC 3603', kind: '방출 성운', credit: 'ESO', url: 'https://www.eso.org/public/images/eso1425a/' },
  iris: { src: 'iris-reflection.jpg', name: '붓꽃 성운 (NGC 7023)', kind: '반사 성운', credit: 'NASA, ESA', url: 'https://esahubble.org/images/heic0915b/' },
  ngc1333: { src: 'ngc1333-reflection.jpg', name: 'NGC 1333', kind: '반사 성운', credit: 'AAE / Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:NGC_1333.jpg' },
  snake: { src: 'snake-dark.jpg', name: '뱀 성운 (바너드 72)', kind: '암흑 성운', credit: 'Friendlystar / Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Snake_Nebula.jpg' },
  b175: { src: 'vdb152-dark.jpg', name: '바너드 175와 vdB 152', kind: '암흑 성운', credit: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Barnard_175.jpg' },
  trifid: { src: 'trifid-mixed.jpg', name: '삼렬 성운 (M20)', kind: '방출·반사·암흑 성운이 함께', credit: 'Hewholooks / Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:TrifidHunterWilson.jpg' },
  ngc1365: { src: 'ngc1365-barred.jpg', name: 'NGC 1365', kind: '막대 나선 은하(외부 은하)', credit: 'ESO / IDA / Danish 1.5 m / R. Gendler, J-E. Ovaldsen, C. Thöne, C. Feron', url: 'https://www.eso.org/public/images/' },
  ngc4945: { src: 'ngc4945-edge.jpg', name: 'NGC 4945', kind: '옆에서 본 나선 은하(외부 은하)', credit: 'ESO', url: 'https://www.eso.org/public/images/eso0931a/' },
  xdf: { src: '../galaxies/hubble-xdf.jpg', name: '허블 익스트림 딥 필드(XDF)', kind: '수많은 외부 은하', credit: 'NASA, ESA, G. Illingworth, D. Magee, P. Oesch, R. Bouwens and the HUDF09 Team', url: 'https://science.nasa.gov/' },
};
// 실험 페이지(simulations/<slug>/)에서 본 사진 경로
export const photoUrl = key => `../../space/photos/${PHOTOS[key].src}`;
export const galaxyUrl = n => `../../space/galaxies/g${String(n).padStart(2, '0')}.png`;

// 사진 카드(figure). caption은 사진 설명(HTML), small에는 출처가 들어가요.
export function photoCard(key, caption = '', { cls = '' } = {}) {
  const p = PHOTOS[key];
  return `<figure class="photo-card ${cls}" data-photo="${key}"><img src="${photoUrl(key)}" alt="${p.name} 실제 사진" loading="lazy" decoding="async"><figcaption><b>${p.name}</b> · ${p.kind}${caption ? `<br>${caption}` : ''}<small>사진: <a href="${p.url}" target="_blank" rel="noopener">${p.credit}</a></small></figcaption></figure>`;
}
// 실험 아래쪽 ‘사진과 자료 출처’ 접이식 상자
export function creditsHTML(keys, extra = []) {
  const items = keys.map(k => `<li>${PHOTOS[k].name}: <a href="${PHOTOS[k].url}" target="_blank" rel="noopener">${PHOTOS[k].credit}</a></li>`);
  return `<details class="credits"><summary>사진과 자료 출처</summary><ul>${[...items, ...extra].join('')}</ul></details>`;
}
export const SKY_CREDIT = '<li>밤하늘의 별(위치·밝기·색): HYG 별 목록 v4.1 (CC BY-SA 4.0, astronexus), 별자리 선·은하수 윤곽: d3-celestial (BSD, Olaf Frohn)</li>';
