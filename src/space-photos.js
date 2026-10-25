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
  // 교과서에 나온 천체(교과서 291–292쪽)
  m45: { src: 'm45-pleiades.jpg', name: '플레이아데스 성단 (M45)', kind: '산개 성단', credit: 'NASA, ESA, AURA/Caltech, Palomar Observatory (공공 저작물)', url: 'https://commons.wikimedia.org/wiki/File:Pleiades_large.jpg' },
  m42: { src: 'm42-orion-nebula.jpg', name: '오리온 대성운 (M42)', kind: '방출 성운', credit: 'NASA, ESA, M. Robberto (STScI/ESA) and the Hubble Space Telescope Orion Treasury Project Team', url: 'https://esahubble.org/images/heic0601a/' },
  m78: { src: 'm78-reflection.jpg', name: 'M78', kind: '반사 성운', credit: 'ESO/Igor Chekalin', url: 'https://www.eso.org/public/images/eso1105a/' },
  horsehead: { src: 'horsehead-dark.jpg', name: '말머리 성운', kind: '암흑 성운', credit: 'ESO', url: 'https://www.eso.org/public/images/eso0202a/' },
  orionWide: { src: 'orion-wide.jpg', name: '오리온자리 (넓게 찍은 사진)', kind: '별자리 사진', credit: 'Rogelio Bernal Andreo / Wikimedia Commons (CC BY-SA 3.0)', url: 'https://commons.wikimedia.org/wiki/File:Orion_Head_to_Toe.jpg' },
  rhoOph: { src: 'rho-oph-wide.jpg', name: '안타레스 둘레 (전갈자리·뱀주인자리)', kind: '별자리 사진', credit: 'Rogelio Bernal Andreo / Wikimedia Commons (CC BY-SA 3.0)', url: 'https://commons.wikimedia.org/wiki/File:Rho_Ophiucus_Widefield.jpg' },
  xdf: { src: '../galaxies/hubble-xdf.jpg', name: '허블 익스트림 딥 필드(XDF)', kind: '수많은 외부 은하', credit: 'NASA, ESA, G. Illingworth, D. Magee, P. Oesch, R. Bouwens and the HUDF09 Team', url: 'https://science.nasa.gov/' },
};
// 실험 페이지(simulations/<slug>/)에서 본 사진 경로
export const photoUrl = key => `../../space/photos/${PHOTOS[key].src}`;
// 별 하나하나의 실제 사진(public/space/stars). surface: 초대형 망원경으로 찍은 별 표면 사진.
// DSS(디지털 하늘 탐사)는 지상 망원경 사진 건판을 디지털로 바꾼 실제 하늘 사진이에요.
const MURA = name => ({ credit: 'Roberto Mura (Digitized Sky Survey 자료) / Wikimedia Commons (CC BY-SA 4.0)', url: `https://commons.wikimedia.org/wiki/File:${name}_DSS.png` });
export const STAR_PHOTOS = {
  rigel: { src: 'rigel.jpg', how: '디지털 하늘 탐사(DSS) 사진', ...MURA('Rigel') },
  spica: { src: 'spica.jpg', how: '디지털 하늘 탐사(DSS) 사진', ...MURA('Spica') },
  vega: { src: 'vega.jpg', how: '디지털 하늘 탐사(DSS) 사진', ...MURA('Vega') },
  capella: { src: 'capella.jpg', how: '디지털 하늘 탐사(DSS) 사진', ...MURA('Capella') },
  arcturus: { src: 'arcturus.jpg', how: '디지털 하늘 탐사(DSS) 사진', ...MURA('Arcturus') },
  aldebaran: { src: 'aldebaran.jpg', how: '디지털 하늘 탐사(DSS) 사진', ...MURA('Aldebaran') },
  polaris: { src: 'polaris.jpg', how: '디지털 하늘 탐사(DSS) 사진', ...MURA('Polaris') },
  betelgeuse: { src: 'betelgeuse.jpg', how: '디지털 하늘 탐사(DSS) 사진', credit: 'ESO/Digitized Sky Survey 2, Davide De Martin (CC BY 4.0)', url: 'https://www.eso.org/public/images/eso0927e/',
    surface: { src: 'betelgeuse-surface.jpg', how: '초대형 망원경(VLT)으로 찍은 베텔게우스의 표면(2019년 12월)', credit: 'ESO/M. Montargès et al. (CC BY 4.0)', url: 'https://www.eso.org/public/images/eso2003a/' } },
  antares: { src: 'antares.jpg', at: [.5, .5], how: '넓게 찍은 사진에서 안타레스 부분', credit: 'Rogelio Bernal Andreo / Wikimedia Commons (CC BY-SA 3.0)', url: 'https://commons.wikimedia.org/wiki/File:Rho_Ophiucus_Widefield.jpg',
    surface: { src: 'antares-surface.jpg', how: '초대형 망원경 간섭계(VLTI)로 재구성한 안타레스의 표면', credit: 'ESO/K. Ohnaka (CC BY 4.0)', url: 'https://www.eso.org/public/images/eso1726a/' } },
  sirius: { src: 'sirius.jpg', how: '허블 우주 망원경 사진(밝은 빛 때문에 십자 무늬가 생겨요)', credit: 'NASA, ESA, H. Bond (STScI), M. Barstow (University of Leicester) (CC BY 4.0)', url: 'https://esahubble.org/images/heic0516a/', noMeasure: true },
  sun: { src: 'sun.jpg', how: '태양 관측 위성(SDO)이 찍은 사진(색을 입힌 사진)', credit: 'NASA/SDO/HMI (CC BY 4.0)', url: 'https://commons.wikimedia.org/wiki/File:The_Sun_with_sunspots_(iau1508d).jpg', noMeasure: true },
};
export const starPhotoUrl = src => `../../space/stars/${src}`;
export const starCreditItems = (nameOf = k => k) => Object.entries(STAR_PHOTOS).flatMap(([k, p]) => [`<li>${nameOf(k)} · ${p.how}: <a href="${p.url}" target="_blank" rel="noopener">${p.credit}</a></li>`, ...(p.surface ? [`<li>${p.surface.how}: <a href="${p.surface.url}" target="_blank" rel="noopener">${p.surface.credit}</a></li>`] : [])]);
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
