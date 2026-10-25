// 예상 단계 ‘실험 미리 보기’의 움직이는 그림(모션 그래픽). 실험마다 간단한 그림 하나와, 단계마다 짧은 움직임이 있어요.
// 결과(끌려옴·밀려남·밝기·값 등)는 절대 보여 주지 않아요. 결과가 나올 자리에는 ‘?’를 띄워요.
// 단계의 움직임은 늘 처음 그림에서 시작해요(다른 단계를 누르면 앞의 움직임은 지워져요).
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

// ---------- 공통 그림 조각 ----------
const fur = (x, y, w = 140, id = 'fur') => `<g data-o="${id}"><rect x="${x}" y="${y}" width="${w}" height="26" rx="12" fill="#7d5c3e"/><path d="${Array.from({ length: Math.floor(w / 8) }, (_, i) => `M${x + 4 + i * 8} ${y + 4} l3 -9 l3 9`).join(' ')}" fill="#a98559"/></g>`;
const balloon = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="24" ry="30" fill="#e8504f"/><path d="M${x} ${y + 30} l-4 6 h8z" fill="#c63d3c"/><path d="M${x} ${y + 36} q7 12 -2 24" stroke="#cfd6e4" fill="none" stroke-width="1.5"/><ellipse cx="${x - 9}" cy="${y - 11}" rx="5" ry="9" fill="#fff" opacity=".35"/>`;
const battery = (x, y, id = 'battery') => `<g data-o="${id}"><rect x="${x}" y="${y}" width="46" height="20" rx="4" fill="#2c365a" stroke="#8f9bc4"/><rect x="${x}" y="${y}" width="14" height="20" rx="3" fill="#d98c45"/><rect x="${x + 46}" y="${y + 6}" width="4" height="8" fill="#c9d1db"/><text x="${x - 8}" y="${y + 15}" font-size="12" fill="#cfe6ff" text-anchor="middle" data-o="${id}-l">−</text><text x="${x + 58}" y="${y + 15}" font-size="12" fill="#cfe6ff" text-anchor="middle" data-o="${id}-r">+</text></g>`;
const button = (x, y, id = 'switch') => `<g data-o="${id}"><rect x="${x}" y="${y}" width="34" height="22" rx="6" fill="#1c2442" stroke="#8f9bc4"/><circle cx="${x + 17}" cy="${y + 11}" r="7" fill="#ff6b6b"/></g>`;
const compass = (x, y, r = 11) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#f4f1e6" stroke="#5e6a92"/><path d="M${x} ${y - r + 3} l3 ${r - 3} h-6z" fill="#e04848"/><path d="M${x} ${y + r - 3} l3 ${-r + 3} h-6z" fill="#cfd6e4"/></g>`;
const star = (cx, cy, r, fill = '#ffd84a') => `<path d="${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join('')}Z" fill="${fill}"/>`;
const label = (x, y, t, size = 11, fill = '#aab4d6') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle">${t}</text>`;

// ---------- 실험별 그림과 단계 ----------
// 각 단계 함수는 도우미 h를 받아 움직임을 시작해요. h.move(이름, [[x, y, 회전, 크기], …], 시간)
export const SCENES = {
  'friction-electricity': {
    rub: {
      svg: `${fur(90, 112)}<g data-o="balloon">${balloon(160, 54)}</g>${label(160, 146, '털')}`,
      steps: [
        h => h.move('balloon', [[0, 0], [0, 26], [-40, 26], [40, 26], [-40, 26], [40, 26], [0, 26], [0, 0]], 2600),
        h => { h.move('balloon', [[0, 26], [0, 26], [0, -4]], 1800); h.ask(222, 104, 1500); },
        h => { h.pulse(160, 112, 46); h.ask(222, 104, 600); },
      ],
    },
    spoon: {
      svg: `<path d="M100 6 V36" stroke="#cfd6e4" stroke-width="1.5" data-o="string"/><g data-o="a"><rect x="96" y="36" width="8" height="58" rx="3" fill="#eef1f6"/><ellipse cx="100" cy="106" rx="13" ry="18" fill="#eef1f6"/>${label(80, 70, '㉮', 13, '#ffd166')}</g>
        <g data-o="b"><rect x="190" y="72" width="66" height="8" rx="3" fill="#eef1f6"/><ellipse cx="270" cy="76" rx="17" ry="11" fill="#eef1f6"/>${label(222, 64, '㉯', 13, '#ffd166')}</g>
        <g data-o="glove"><path d="M250 16 q0 -12 12 -12 h18 q12 0 12 12 v20 q0 8 -8 8 h-26 q-8 0 -8 -8z" fill="#8e7cc3"/><path d="M290 22 q10 -4 12 6 q-2 8 -12 6" fill="#8e7cc3"/>${label(276, 58, '장갑')}</g>`,
      steps: [
        h => h.move('glove', [[0, 0], [-148, 46], [-140, 54], [-156, 46], [-140, 54], [-60, 52], [-48, 60], [-68, 52], [-48, 60], [0, 0]], 3000),
        h => { h.pulse(100, 30, 18); h.pulse(100, 80, 34, 300); },
        h => { h.move('b', [[0, 0], [-62, 0]], 1800); h.ask(70, 120, 1600); },
      ],
    },
  },
  'electrostatic-induction': {
    main: {
      svg: `${fur(14, 18, 70, 'fur')}<g data-o="straw"><rect x="40" y="52" width="96" height="9" rx="4" fill="#f2c94c" transform="rotate(-12 88 56)"/>${label(70, 78, '빨대')}</g>
        <g data-o="spoon"><rect x="96" y="114" width="108" height="9" rx="4" fill="#c9d1db"/><ellipse cx="222" cy="118" rx="22" ry="14" fill="#c9d1db"/>${label(150, 142, '쇠숟가락')}</g>
        <g data-o="scope"><path d="M266 70 h44 v66 h-44z" fill="#cfe8ff22" stroke="#8fb5d6"/><rect x="270" y="52" width="36" height="6" rx="2" fill="#d8dde6"/><path d="M288 58 V100" stroke="#d8dde6" stroke-width="3"/><path d="M288 100 l-5 22 M288 100 l5 22" stroke="#ffd166" stroke-width="2"/>${label(288, 146, '검전기')}</g>`,
      steps: [
        h => h.move('straw', [[0, 0], [-30, -24], [-6, -24], [-30, -24], [-6, -24], [-30, -24], [0, 0]], 2600),
        h => h.pulse(160, 118, 66),
        h => { h.move('straw', [[0, 0], [8, 46]], 1800); h.ask(92, 100, 1600); },
        h => { h.move('straw', [[0, 0], [100, 40], [200, -10]], 2200); h.ask(306, 124, 2000); },
      ],
    },
  },
  'electric-current': {
    main: {
      svg: `<ellipse cx="80" cy="118" rx="62" ry="12" fill="#9aa5b8"/>${label(80, 144, '플라스틱 접시')}${fur(186, 106, 110, 'pad')}${label(240, 144, '털가죽')}
        <g data-o="rub">${fur(40, 80, 60, 'rubfur')}</g>
        <g data-o="al" class="pv-off"><ellipse cx="80" cy="104" rx="52" ry="9" fill="#d8dde6" stroke="#fff"/><ellipse cx="240" cy="96" rx="52" ry="9" fill="#d8dde6" stroke="#fff"/></g>
        <g data-o="neon" class="pv-off"><rect x="96" y="70" width="56" height="12" rx="6" fill="#cfe8ff55" stroke="#cfe8ff"/><path d="M80 100 L96 76 M152 76 L170 76" stroke="#c9d1db" stroke-width="2"/>${label(124, 64, '네온전구')}</g>
        <g data-o="next" class="pv-off"><rect x="96" y="8" width="128" height="40" rx="8" fill="#0d1430" stroke="#5e6a92"/>${label(160, 25, '전기 회로', 11, '#ffd166')}${label(160, 41, '수로 모형', 11, '#7fd6ff')}</g>`,
      steps: [
        h => h.move('rub', [[0, 0], [0, 14], [40, 14], [0, 14], [40, 14], [0, 14], [0, 0]], 2400),
        h => { h.show('al', 600); h.move('al', [[0, -34], [0, 0]], 900); },
        h => { h.show('al', 10); h.show('neon', 400); h.move('neon', [[0, 0], [22, 8]], 1800); h.ask(214, 70, 1700); },
        h => h.show('next', 600),
      ],
    },
  },
  'ohms-law': {
    main: {
      svg: `<g><rect x="16" y="40" width="86" height="64" rx="8" fill="#2c365a" stroke="#8f9bc4"/><rect x="26" y="50" width="48" height="22" rx="3" fill="#081022"/><text x="50" y="66" font-size="13" fill="#ff6b6b" text-anchor="middle" data-o="volt">0 V</text><g data-o="knob"><circle cx="86" cy="62" r="9" fill="#cfd6e4"/><path d="M86 62 V54" stroke="#2c365a" stroke-width="3"/></g>${label(58, 120, '전원 장치')}</g>
        <g><circle cx="262" cy="64" r="30" fill="#f4f1e6" stroke="#5e6a92"/><text x="262" y="60" font-size="13" fill="#2c365a" text-anchor="middle">A</text><text x="262" y="80" font-size="15" fill="#e04848" text-anchor="middle" font-weight="700">?</text>${label(262, 112, '전류계')}</g>
        <path d="M102 72 H140 M184 72 H232" stroke="#d98c45" stroke-width="3"/><g data-o="lever"><path d="M140 72 L176 52" stroke="#cfd6e4" stroke-width="4" stroke-linecap="round"/></g><circle cx="140" cy="72" r="4" fill="#cfd6e4"/><circle cx="184" cy="72" r="4" fill="#cfd6e4"/>${label(162, 40, '스위치')}
        <g data-o="long"><path d="M60 132 ${Array.from({ length: 16 }, (_, i) => `l7 ${i % 2 ? 6 : -6}`).join(' ')}" stroke="#c9b48a" stroke-width="2.5" fill="none"/>${label(240, 136, '긴 니크롬선')}</g>
        <g data-o="short" class="pv-off"><path d="M100 132 ${Array.from({ length: 8 }, (_, i) => `l7 ${i % 2 ? 6 : -6}`).join(' ')}" stroke="#c9b48a" stroke-width="2.5" fill="none"/>${label(240, 136, '짧은 니크롬선')}</g>`,
      steps: [
        h => { h.move('knob', [[0, 0, 0], [0, 0, 60], [0, 0, 120], [0, 0, 180]], 2400); h.text('volt', ['1 V', '2 V', '3 V', '4 V'], 600); },
        h => { h.text('volt', ['1 V'], 0); h.move('lever', [[0, 0, 0], [0, 0, 30]], 900); h.pulse(262, 64, 34, 900); },
        h => { h.hide('long', 600); h.show('short', 600, 500); },
      ],
    },
  },
  'series-parallel': {
    main: {
      svg: `${battery(137, 124, 'bat')}
        <g data-o="one"><path d="M137 134 H60 V40 H260 V134 H187" stroke="#d98c45" stroke-width="3" fill="none"/><circle cx="160" cy="40" r="15" fill="#e8eef5" stroke="#8f9bc4"/><circle data-o="glow" cx="160" cy="40" r="22" fill="#ffe9a6" opacity="0"/>${label(160, 72, '전구 1개')}</g>
        <g data-o="series" class="pv-off"><path d="M137 134 H60 V40 H260 V134 H187" stroke="#d98c45" stroke-width="3" fill="none"/><circle cx="120" cy="40" r="15" fill="#e8eef5" stroke="#8f9bc4"/><circle cx="200" cy="40" r="15" fill="#e8eef5" stroke="#8f9bc4"/>${label(160, 72, '직렬연결')}${label(120, 45, '?', 15, '#e04848')}${label(200, 45, '?', 15, '#e04848')}</g>
        <g data-o="parallel" class="pv-off"><path d="M137 134 H60 V30 H260 V134 H187 M60 78 H260" stroke="#d98c45" stroke-width="3" fill="none"/><circle cx="160" cy="30" r="14" fill="#e8eef5" stroke="#8f9bc4"/><circle cx="160" cy="78" r="14" fill="#e8eef5" stroke="#8f9bc4"/>${label(160, 108, '병렬연결')}${label(160, 35, '?', 15, '#e04848')}${label(160, 83, '?', 15, '#e04848')}<g data-o="cut"><path d="M210 78 L230 66" stroke="#cfd6e4" stroke-width="4" stroke-linecap="round"/></g></g>`,
      steps: [
        h => h.o('glow') && h.o('glow').animate([{ opacity: 0 }, { opacity: .55 }, { opacity: .35 }, { opacity: .55 }], { duration: 2000, fill: 'forwards' }),
        h => { h.hide('one', 500); h.show('series', 600, 400); },
        h => { h.hide('one', 500); h.show('parallel', 600, 400); },
        h => { h.hide('one', 10); h.show('parallel', 10); h.move('cut', [[0, 0, 0], [0, 0, -40]], 900); },
      ],
    },
  },
  'coil-magnetic-field': {
    main: {
      svg: `<g data-o="bar"><rect x="20" y="58" width="36" height="16" fill="#e04848"/><rect x="56" y="58" width="36" height="16" fill="#3a6fd8"/>${label(38, 70, 'N', 11, '#fff')}${label(74, 70, 'S', 11, '#fff')}${compass(36, 38)}${compass(76, 98)}${label(56, 130, '막대자석')}</g>
        <ellipse cx="210" cy="78" rx="80" ry="34" fill="#1c2442" stroke="#5e6a92"/>
        <g data-o="coil"><path d="M196 30 V126 M224 30 V126" stroke="#d88a4a" stroke-width="4"/><ellipse cx="210" cy="56" rx="14" ry="5" fill="none" stroke="#d88a4a" stroke-width="3"/><ellipse cx="210" cy="78" rx="14" ry="5" fill="none" stroke="#d88a4a" stroke-width="3"/><ellipse cx="210" cy="100" rx="14" ry="5" fill="none" stroke="#d88a4a" stroke-width="3"/></g>
        <g data-o="needles" class="pv-off">${[[150, 78], [270, 78], [180, 56], [240, 56], [180, 100], [240, 100], [210, 40], [210, 116]].map(([x, y]) => compass(x, y, 9)).join('')}</g>
        ${button(280, 120)}${battery(220, 132, 'bat')}`,
      steps: [
        h => h.pulse(56, 68, 52),
        h => { h.pulse(210, 78, 40); h.show('needles', 900, 600); },
        h => { h.show('needles', 10); h.press('switch'); h.ask(300, 60, 900); },
        h => { h.show('needles', 10); h.flip('bat'); h.ask(300, 60, 900); },
      ],
    },
  },
  'electric-swing': {
    main: {
      svg: `<path d="M110 24 H230" stroke="#8f9bc4" stroke-width="5"/>
        <g data-o="magnet"><path d="M120 70 V130 H220 V70" stroke="#e04848" stroke-width="22" fill="none"/><path d="M220 70 V130 H170" stroke="#3a6fd8" stroke-width="22" fill="none"/>${label(120, 66, 'N', 12, '#fff')}${label(220, 66, 'S', 12, '#fff')}</g>
        <g data-o="coil"><path d="M150 24 V96 H190 V24" stroke="#d88a4a" stroke-width="4" fill="none"/>${label(170, 86, '코일')}</g>
        ${button(262, 40)}${battery(254, 92, 'bat')}`,
      steps: [
        h => h.pulse(170, 80, 62),
        h => { h.press('switch'); h.ask(170, 120, 900); },
        h => { h.flip('bat'); h.flip('magnet', 1300); h.ask(170, 120, 2400); },
      ],
    },
  },
  'electric-motor': {
    main: {
      svg: `<rect x="30" y="44" width="54" height="66" rx="6" fill="#e04848"/>${label(57, 82, 'N', 16, '#fff')}<rect x="236" y="44" width="54" height="66" rx="6" fill="#3a6fd8"/>${label(263, 82, 'S', 16, '#fff')}
        <path d="M100 76 H220" stroke="#8f9bc4" stroke-width="3"/><g data-o="coil"><rect x="122" y="46" width="76" height="60" rx="4" fill="none" stroke="#d88a4a" stroke-width="5"/></g>
        ${button(140, 120)}${battery(196, 124, 'bat')}
        <g data-o="simple" class="pv-off"><rect x="0" y="0" width="320" height="150" fill="#070b1cee"/><path d="M120 128 V70 M200 128 V70" stroke="#c9d1db" stroke-width="4"/><rect x="138" y="120" width="44" height="14" rx="3" fill="#5a6388"/>${label(160, 146, '자석')}<g data-o="ring"><ellipse cx="160" cy="40" rx="26" ry="26" fill="none" stroke="#b45a2a" stroke-width="4"/><path d="M120 40 H134 M186 40 H200" stroke="#b45a2a" stroke-width="4"/></g>${label(250, 40, '에나멜선 코일', 11, '#ffd166')}</g>`,
      steps: [
        h => h.pulse(160, 76, 52),
        h => { h.press('switch'); h.ask(160, 30, 900); },
        h => { h.show('simple', 500); h.move('ring', [[0, -40], [0, 30]], 1600); },
      ],
    },
  },
  'stellar-parallax': {
    main: {
      svg: `<rect x="60" y="8" width="200" height="134" rx="6" fill="#efe6cf"/>
        ${Array.from({ length: 11 }, (_, i) => `<text x="${75 + i * 17}" y="22" font-size="10" fill="#5a4a2a" text-anchor="middle">${'①②③④⑤⑥⑦⑧⑨⑩⑪'[i]}</text>`).join('')}
        <g data-o="near">${star(160, 98, 9)}${label(178, 102, '(가)', 10, '#5a4a2a')}</g><g data-o="far" class="pv-off">${star(152, 58, 8, '#ffe98f')}${label(170, 62, '(나)', 10, '#5a4a2a')}</g>
        <circle cx="140" cy="132" r="5" fill="#2a2418"/><circle cx="180" cy="132" r="5" fill="#2a2418"/>
        <g data-o="eyeL" class="pv-off"><ellipse cx="140" cy="146" rx="9" ry="5" fill="#fff"/><circle cx="140" cy="146" r="3" fill="#2a2418"/></g>
        <g data-o="eyeR" class="pv-off"><ellipse cx="180" cy="146" rx="9" ry="5" fill="#fff"/><circle cx="180" cy="146" r="3" fill="#2a2418"/></g>
        <g data-o="orbit" class="pv-off"><rect x="0" y="0" width="320" height="150" fill="#060815ee"/><ellipse cx="160" cy="92" rx="90" ry="28" fill="none" stroke="#8fd3ff88" stroke-dasharray="4 4"/><circle cx="160" cy="92" r="12" fill="#ffcf6e"/>${label(160, 128, '태양')}${star(160, 24, 7)}${label(180, 28, '별')}<g data-o="earth"><circle cx="250" cy="92" r="7" fill="#2f74c8"/></g>${label(262, 116, 'A')}${label(58, 116, 'B')}</g>`,
      steps: [
        h => { h.blink('eyeL', 'eyeR'); },
        h => { h.show('eyeL', 300); h.pulse(160, 18, 30, 300); h.ask(250, 40, 900); },
        h => { h.move('near', [[0, 0], [0, 0, 0, 1.15], [0, 0]], 1200); h.show('far', 500, 1100); h.move('far', [[0, 0], [0, 0, 0, 1.15], [0, 0]], 1200, 1400); },
        h => { h.show('orbit', 500); h.orbit('earth', 160, 92, 90, 28, 2400); },
      ],
    },
  },
  'star-brightness': {
    main: {
      svg: `<g><rect x="10" y="62" width="40" height="22" rx="5" fill="#5a6390"/><path d="M50 58 L62 54 V92 L50 88z" fill="#5a6390"/></g><g data-o="beam" class="pv-off"><path d="M62 60 L300 18 V128 L62 86z" fill="#fff1c4" fill-opacity=".18"/></g>
        <g data-o="phone"><rect x="94" y="52" width="26" height="44" rx="5" fill="#111528" stroke="#aab4d6"/><text x="107" y="78" font-size="9" fill="#ffd166" text-anchor="middle">? lx</text></g>
        <path d="M62 132 H300" stroke="#aab4d6"/>${[20, 40, 60, 80].map((d, i) => `<path d="M${107 + i * 56} 128 V136" stroke="#aab4d6"/><text x="${107 + i * 56}" y="147" font-size="9" fill="#aab4d6" text-anchor="middle">${d} cm</text>`).join('')}
        <g data-o="paper" class="pv-off"><rect x="98" y="36" width="10" height="78" fill="#0b0b0f" stroke="#aab4d6"/>${label(103, 30, '검은색 종이판', 9)}</g>
        <g data-o="stars" class="pv-off"><rect x="196" y="4" width="120" height="44" rx="6" fill="#050716"/>${star(220, 26, 8, '#fff')}${star(256, 22, 5, '#dfe9ff')}${star(290, 30, 3, '#ffe2c4')}</g>`,
      steps: [
        h => { h.show('beam', 600); h.pulse(107, 74, 28, 500); },
        h => { h.show('beam', 10); h.move('phone', [[0, 0], [56, 0], [56, 0], [112, 0], [112, 0], [168, 0]], 2800); },
        h => { h.show('beam', 10); h.show('paper', 600); h.ask(130, 40, 800); },
        h => { h.show('stars', 400); h.twinkle('stars'); },
      ],
    },
  },
  'star-color': {
    main: {
      svg: `<g><rect x="14" y="30" width="96" height="96" rx="8" fill="#3a3f52"/>${[0, 1, 2, 3].map(i => `<path d="M24 ${50 + i * 18} H100" stroke="#6d727c" stroke-width="4" stroke-linecap="round"/>`).join('')}${label(62, 142, '전기난로')}</g>
        ${button(68, 6)}<g><rect x="116" y="34" width="8" height="80" rx="4" fill="#1c2442" stroke="#5e6a92"/><rect data-o="temp" x="118" y="96" width="4" height="16" fill="#ff6b6b" style="transform-box:view-box;transform-origin:120px 112px"/></g>
        <circle cx="190" cy="66" r="26" fill="#d6dcef"/>${label(190, 108, '빛을 내는 공')}<path d="M150 124 H230" stroke="#5e6a92" stroke-width="4" stroke-linecap="round"/><circle data-o="knob" cx="170" cy="124" r="7" fill="#ffd166"/>
        <g><rect x="248" y="22" width="64" height="64" rx="6" fill="#050716" stroke="#8fd3ff66"/><circle cx="280" cy="54" r="4" fill="#fff"/><g data-o="scan"><circle cx="280" cy="54" r="14" fill="none" stroke="#8fd3ff" stroke-width="3" stroke-dasharray="20 68"/></g>${label(280, 102, '별 사진')}</g>`,
      steps: [
        h => { h.press('switch'); h.grow('temp', 4.6, 2200); h.ask(62, 22, 1600); },
        h => { h.move('knob', [[0, 0], [40, 0], [-12, 0], [40, 0]], 2400); h.ask(190, 66, 1800); },
        h => { h.move('scan', [[0, 0, 0], [0, 0, 720]], 2400); },
      ],
    },
  },
  'milky-way': {
    main: {
      svg: `<g data-o="galaxy"><ellipse cx="160" cy="70" rx="90" ry="44" fill="#1c2147"/><ellipse cx="160" cy="70" rx="58" ry="26" fill="#2c2c66"/><ellipse cx="160" cy="70" rx="22" ry="11" fill="#f6e3b5"/><path d="M160 70 q50 -50 86 0 M160 70 q-50 50 -86 0" stroke="#9fb8ff" stroke-width="3" fill="none" opacity=".7"/></g>
        <g data-o="pin" class="pv-off"><path d="M210 30 q0 -12 10 -12 q10 0 10 12 q0 8 -10 20 q-10 -12 -10 -20z" fill="#ff6b6b"/>${label(220, 32, '?', 12, '#fff')}</g>
        <g data-o="scope" class="pv-off"><rect x="0" y="0" width="320" height="150" fill="#050716ee"/><g data-o="tube" style="transform-box:view-box;transform-origin:160px 130px"><rect x="150" y="70" width="20" height="60" rx="4" fill="#8f9bc4"/></g><path d="M20 30 Q160 10 300 40" stroke="#c9b8ff" stroke-width="10" opacity=".25" fill="none"/>${label(160, 146, '은하수를 바라보는 방향')}</g>
        <g data-o="cards" class="pv-off"><rect x="0" y="0" width="320" height="150" fill="#070b1cee"/><rect x="40" y="96" width="100" height="44" rx="6" fill="none" stroke="#8fd3ff" stroke-dasharray="4 3"/>${label(90, 122, '성단')}<rect x="180" y="96" width="100" height="44" rx="6" fill="none" stroke="#ffb3c7" stroke-dasharray="4 3"/>${label(230, 122, '성운')}<g data-o="c1"><rect x="100" y="16" width="44" height="44" rx="4" fill="#25336b"/>${star(122, 38, 6, '#dfe9ff')}</g><g data-o="c2"><rect x="176" y="16" width="44" height="44" rx="4" fill="#5a2340"/><circle cx="198" cy="38" r="12" fill="#ff7aa2" opacity=".6"/></g></g>`,
      steps: [
        h => h.squash('galaxy', 2400),
        h => { h.show('pin', 400); h.move('pin', [[0, -6], [0, 6], [0, -6], [0, 6]], 2000); },
        h => { h.show('scope', 400); h.move('tube', [[0, 0, -30], [0, 0, 30], [0, 0, -30]], 2600); },
        h => { h.show('cards', 400); h.move('c1', [[0, 0], [-40, 70]], 1400, 400); h.move('c2', [[0, 0], [30, 70]], 1400, 900); },
      ],
    },
  },
  'expanding-universe': {
    main: {
      svg: `<g data-o="balloon" style="transform-box:view-box;transform-origin:150px 74px"><circle cx="150" cy="74" r="40" fill="#3a6fd8"/><path d="M150 114 l-6 10 h12z" fill="#2c55a8"/><ellipse cx="136" cy="58" rx="8" ry="14" fill="#fff" opacity=".25"/>
          <g data-o="stickers" class="pv-off">${[[134, 60], [164, 56], [150, 92]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="6" fill="#ffe9a6"/><text x="${x}" y="${y + 3}" font-size="8" text-anchor="middle" fill="#0a1029">${i + 1}</text>`).join('')}</g></g>
        <g><rect x="250" y="70" width="18" height="60" rx="4" fill="#e04848"/><rect data-o="handle" x="256" y="44" width="6" height="30" fill="#c9d1db"/></g><path d="M250 120 Q200 140 156 124" stroke="#1c2442" stroke-width="4" fill="none"/>${label(259, 144, '펌프')}
        <g data-o="tape" class="pv-off"><path d="M134 60 L164 56" stroke="#ffd166" stroke-width="2" stroke-dasharray="3 2"/>${label(196, 44, '? cm', 11, '#ffd166')}</g>
        <g data-o="ask" class="pv-off">${label(150, 20, '붙임딱지 사이의 거리는? (? cm)', 11, '#ffd166')}</g>`,
      steps: [
        h => { h.pump(1400); h.grow('balloon', 1.08, 1400); h.show('stickers', 400, 1300); },
        h => { h.show('stickers', 10); h.show('tape', 500, 200); },
        h => { h.pump(2400); h.grow('balloon', 1.4, 2400); h.show('ask', 400, 2000); },
      ],
    },
  },
};

// ---------- 재생 도우미 ----------
const timers = new Set();
export function playStep(root, slug, id, n) {
  const scene = SCENES[slug]?.[id] ?? SCENES[slug]?.main;
  if (!scene || !root) return;
  root.getAnimations({ subtree: true }).forEach(a => a.cancel());
  root.querySelectorAll('.pv-temp').forEach(e => e.remove());
  root.querySelectorAll('[data-orig]').forEach(e => { e.textContent = e.dataset.orig; });
  timers.forEach(clearTimeout); timers.clear();
  scene.steps[n]?.(helpers(root));
}
export const sceneOf = (slug, id) => SCENES[slug]?.[id] ?? SCENES[slug]?.main ?? null;

function helpers(root) {
  const o = id => root.querySelector(`[data-o="${id}"]`);
  const run = (id, frames, ms, delay = 0, more = {}) => o(id)?.animate(frames, { duration: ms, delay, easing: 'ease-in-out', fill: 'forwards', ...more });
  const tf = ([x = 0, y = 0, r = 0, s = 1]) => ({ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})` });
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const h = {
    o,
    move: (id, pts, ms = 1800, delay = 0) => run(id, pts.map(tf), ms, delay),
    show: (id, ms = 500, delay = 0) => run(id, [{ opacity: 0 }, { opacity: 1 }], ms, delay),
    hide: (id, ms = 400, delay = 0) => run(id, [{ opacity: 1 }, { opacity: 0 }], ms, delay),
    grow: (id, to, ms = 1800) => run(id, [{ transform: 'scale(1)' }, { transform: `scale(${to})` }], ms),
    squash: (id, ms = 2400) => run(id, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.22)' }, { transform: 'scaleY(.22)' }, { transform: 'scaleY(1)' }], ms),
    press: id => run(id, [{ transform: 'scale(1)' }, { transform: 'scale(.8)' }, { transform: 'scale(.8)' }, { transform: 'scale(1)' }], 900),
    flip: (id, delay = 0) => run(id, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }], 900, delay),
    twinkle: id => run(id, [{ opacity: 1 }, { opacity: .5 }, { opacity: 1 }, { opacity: .6 }, { opacity: 1 }], 2400),
    pump: ms => run('handle', [{ transform: 'translateY(0)' }, { transform: 'translateY(18px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(18px)' }, { transform: 'translateY(0)' }], ms),
    blink(a, b) { run(a, [{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }, { opacity: 0 }, { opacity: 1 }], 2600); run(b, [{ opacity: 0 }, { opacity: 0 }, { opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }], 2600); },
    orbit(id, cx, cy, rx, ry, ms) {
      const steps = 24, frames = Array.from({ length: steps + 1 }, (_, i) => { const a = Math.PI * i / steps; return { transform: `translate(${(rx * Math.cos(a) - rx).toFixed(1)}px, ${(-ry * Math.sin(a)).toFixed(1)}px)` }; });
      run(id, frames, ms, 300);
    },
    // 결과가 나올 자리의 ‘?’
    ask(x, y, delay = 0) {
      const g = el('g', { class: 'pv-temp pv-ask', transform: `translate(${x} ${y})` });
      g.innerHTML = '<circle r="11"/><text y="5" text-anchor="middle">?</text>';
      g.style.opacity = 0; root.append(g);
      g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay, fill: 'forwards' });
    },
    // 잘 볼 곳을 가리키는 고리
    pulse(x, y, r, delay = 0) {
      const c = el('circle', { cx: x, cy: y, r, class: 'pv-temp pv-ring' });
      c.style.opacity = 0; root.append(c);
      c.animate([{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'scale(1)' }, { opacity: .3, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1600, delay, fill: 'forwards', easing: 'ease-out' });
    },
    // 숫자 바꾸기(예: 1 V → 2 V)
    text(id, list, every = 600) {
      const t = o(id); if (!t) return;
      t.dataset.orig ??= t.textContent;
      list.forEach((v, i) => later(() => { t.textContent = v; }, i * every));
    },
  };
  return h;
}
