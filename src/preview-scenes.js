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
const bulb = (x, y, name, ask = false) => `<g><circle cx="${x}" cy="${y}" r="13" fill="#e8eef5" stroke="#8f9bc4"/><path d="M${x - 5} ${y + 2} q2.5 -6 5 0 t5 0" stroke="#9a7a40" fill="none"/><text x="${x}" y="${y - 18}" font-size="10" fill="#aab4d6" text-anchor="middle">전구 ${name}</text>${ask ? `<text x="${x + 20}" y="${y + 5}" font-size="13" fill="#e04848" font-weight="700">?</text>` : ''}</g>`;
// 칼날 스위치: v는 세로 도선 위, h는 가로 도선 위(닫힌 모양으로 그리고, 여는 움직임은 회전으로)
const knife = (x, y, name, dir) => dir === 'v'
  ? `<g><rect x="${x - 7}" y="${y - 16}" width="14" height="32" rx="3" fill="#1c2442" stroke="#5e6a92"/><path d="M${x} ${y - 12} V${y + 12}" stroke="#ffd166" stroke-width="3"/><text x="${x + (x < 160 ? -14 : 14)}" y="${y + 4}" font-size="9" fill="#aab4d6" text-anchor="middle">${name}</text></g>`
  : `<g><rect x="${x - 2}" y="${y - 7}" width="36" height="14" rx="3" fill="#1c2442" stroke="#5e6a92"/><path d="M${x} ${y} H${x + 32}" stroke="#ffd166" stroke-width="3"/><text x="${x + 16}" y="${y - 10}" font-size="9" fill="#aab4d6" text-anchor="middle">${name}</text></g>`;
const label = (x, y, t, size = 11, fill = '#aab4d6') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle">${t}</text>`;

// ---------- 실험별 그림과 단계 ----------
// 각 단계 함수는 도우미 h를 받아 움직임을 시작해요. h.move(이름, [[x, y, 회전, 크기], …], 시간)
export const SCENES = {
  'friction-electricity': {
    // 실제 실험(시뮬레이션과 같음): 털 위에 풍선을 문지른 뒤 털 가까이에서 들어 올려요.
    rub: {
      svg: `${fur(90, 112)}<g data-o="balloon">${balloon(160, 54)}</g>${label(160, 146, '털')}`,
      steps: [
        h => h.move('balloon', [[0, 0], [0, 26], [-40, 26], [40, 26], [-40, 26], [40, 26], [0, 26], [0, 0]], 2600),
        h => { h.move('balloon', [[0, 26], [0, 26], [0, -4]], 1800); h.ask(222, 104, 1500); },
        h => { h.pulse(160, 112, 46); h.ask(222, 104, 600); },
      ],
    },
    // 실제 실험: 숟가락 ㉮는 지우개 위에 올려 수평으로 돌 수 있게 하고, ㉯를 손잡이 끝에 가까이 가져가요.
    spoon: {
      svg: `<rect x="74" y="108" width="34" height="16" rx="3" fill="#ff9ab3"/>${label(91, 140, '지우개')}
        <g data-o="a"><ellipse cx="90" cy="104" rx="18" ry="10" fill="#eef1f6"/><rect x="104" y="100" width="104" height="8" rx="4" fill="#eef1f6"/>${label(160, 92, '숟가락 ㉮', 11, '#ffd166')}</g>
        <g data-o="b"><path d="M250 50 L312 8" stroke="#eef1f6" stroke-width="9" stroke-linecap="round"/>${label(284, 52, '숟가락 ㉯', 11, '#ffd166')}</g>
        <g data-o="glove"><path d="M252 104 q0 -12 12 -12 h18 q12 0 12 12 v20 q0 8 -8 8 h-26 q-8 0 -8 -8z" fill="#8e7cc3"/><path d="M292 110 q10 -4 12 6 q-2 8 -12 6" fill="#8e7cc3"/>${label(276, 146, '장갑')}</g>`,
      steps: [
        h => h.move('glove', [[0, 0], [-90, -14], [-70, -14], [-90, -14], [-70, -14], [0, 0], [6, -70], [-6, -62], [6, -70], [0, 0]], 3000),
        h => { h.pulse(91, 112, 26); h.pulse(156, 104, 60, 400); },
        h => { h.move('b', [[0, 0], [-36, 40]], 1800); h.ask(150, 70, 1600); },
      ],
    },
  },
  'electrostatic-induction': {
    // 실제 실험: 바닥의 쇠숟가락(머리에 추) 손잡이 끝에 대전된 빨대를 가까이(닿지 않게) → 검전기의 금속판에도 가까이.
    main: {
      svg: `${fur(14, 14, 70, 'fur')}${label(49, 52, '털가죽')}
        <g data-o="straw"><path d="M236 40 L304 4" stroke="#f2c94c" stroke-width="9" stroke-linecap="round"/>${label(286, 36, '빨대')}</g>
        <g data-o="spoon"><ellipse cx="70" cy="104" rx="24" ry="15" fill="#c9d1db"/><circle cx="70" cy="104" r="8" fill="#c8a24a"/><rect x="92" y="100" width="140" height="9" rx="4" fill="#c9d1db"/>${label(70, 134, '추를 올린 머리')}${label(224, 128, '손잡이 끝')}</g>
        <g data-o="scope" class="pv-off"><rect x="0" y="0" width="320" height="150" fill="#070b1cf0"/><path d="M128 66 h64 v70 h-64z" fill="#cfe8ff22" stroke="#8fb5d6"/><ellipse cx="160" cy="54" rx="34" ry="6" fill="#d8dde6"/><path d="M160 56 V100" stroke="#d8dde6" stroke-width="3"/><path d="M160 100 l-5 24 M160 100 l5 24" stroke="#ffd166" stroke-width="2"/>${label(214, 56, '금속판')}${label(212, 120, '금속박')}<g data-o="straw2"><path d="M236 30 L304 -6" stroke="#f2c94c" stroke-width="9" stroke-linecap="round"/></g></g>`,
      steps: [
        h => h.move('straw', [[0, 0], [-196, 4], [-170, 0], [-196, 4], [-170, 0], [-196, 4], [0, 0]], 2800),
        h => h.pulse(150, 104, 90),
        h => { h.move('straw', [[0, 0], [8, 52]], 1800); h.ask(150, 76, 1600); },
        h => { h.show('scope', 400); h.move('straw2', [[0, 0], [-56, 20]], 1600, 300); h.ask(160, 140, 1700); },
      ],
    },
  },
  'electric-current': {
    // 실제 실험: 털가죽으로 플라스틱 접시를 문지른 뒤, 그 털가죽과 접시를 바닥에 놓고 손잡이(빨대)가 달린 알루미늄 접시를 하나씩 올려요.
    // 한 알루미늄 접시에 붙인 네온전구의 다른 끝을 반대쪽 알루미늄 접시에 대요. 털가죽은 하나예요.
    // 네온전구의 다른 끝(도선)은 전구에 붙은 채로, 전구 끝을 축으로 내려가 접시에 닿아요(따로 떨어져 움직이지 않아요).
    main: {
      svg: `<path d="M0 132 H320" stroke="#5a4a36" stroke-width="10"/>
        <ellipse cx="80" cy="124" rx="58" ry="9" fill="#e8ecf2"/>${label(80, 146, '플라스틱 접시')}${label(240, 146, '털가죽')}
        <g data-o="fur">${fur(190, 108, 100, 'furbody')}</g>
        ${label(160, 14, '알루미늄 접시(손잡이는 빨대)', 10)}
        <g data-o="al"><ellipse cx="80" cy="74" rx="46" ry="8" fill="#d8dde6" stroke="#fff"/><path d="M80 66 V30" stroke="#8fb5d6" stroke-width="5"/><ellipse cx="240" cy="74" rx="46" ry="8" fill="#d8dde6" stroke="#fff"/><path d="M240 66 V30" stroke="#8fb5d6" stroke-width="5"/>
          <path d="M112 72 Q132 44 148 48" stroke="#c9d1db" stroke-width="2" fill="none"/><rect x="148" y="42" width="28" height="12" rx="6" fill="#cfe8ff55" stroke="#cfe8ff"/>${label(162, 38, '네온전구', 10)}
          <g data-o="tip" style="transform-box:view-box;transform-origin:176px 48px"><path d="M176 48 Q192 34 204 36" stroke="#c9d1db" stroke-width="2" fill="none"/><circle cx="204" cy="36" r="3" fill="#c9d1db"/></g></g>
        <g data-o="next" class="pv-off"><rect x="96" y="4" width="128" height="44" rx="8" fill="#0d1430" stroke="#5e6a92"/>${label(160, 22, '전기 회로', 11, '#ffd166')}${label(160, 40, '수로 모형', 11, '#7fd6ff')}</g>`,
      steps: [
        h => h.move('fur', [[0, 0], [-150, 6], [-120, 6], [-160, 6], [-120, 6], [-160, 6], [0, 0]], 3000),
        h => h.move('al', [[0, 0], [0, 40]], 1600),
        h => { h.move('al', [[0, 40], [0, 40]], 10); h.move('tip', [[0, 0, 0, 1], [0, 0, 66, 1.07]], 1600, 300); h.ask(220, 60, 1700); },
        h => h.show('next', 600),
      ],
    },
  },
  'ohms-law': {
    // 실제 실험(시뮬레이션과 같음): 전원 장치 – 스위치 – 전류계 – 니크롬선을 한 줄로 잇고, 전압계는 니크롬선 양 끝에 연결해요.
    main: {
      svg: `<path d="M60 52 V128 H120 M228 128 H286 V82 M286 38 V22 H196 M156 22 H96 V24" stroke="#5fa8ff" stroke-width="3" fill="none"/>
        <g><rect x="20" y="16" width="80" height="40" rx="6" fill="#2c365a" stroke="#8f9bc4"/><rect x="28" y="22" width="44" height="20" rx="3" fill="#081022"/><text x="50" y="37" font-size="12" fill="#ff6b6b" text-anchor="middle" data-o="volt">0.0 V</text><g data-o="knob"><circle cx="86" cy="34" r="7" fill="#cfd6e4"/><path d="M86 34 V28" stroke="#2c365a" stroke-width="3"/></g>${label(42, 68, '전원 장치', 10)}</g>
        <circle cx="156" cy="22" r="3.5" fill="#cfd6e4"/><circle cx="196" cy="22" r="3.5" fill="#cfd6e4"/><g data-o="lever" style="transform:rotate(-30deg);transform-box:view-box;transform-origin:156px 22px"><path d="M156 22 L196 22" stroke="#e8edf8" stroke-width="4" stroke-linecap="round"/></g>${label(176, 42, '스위치', 10)}
        <g><circle cx="286" cy="60" r="22" fill="#f4f1e6" stroke="#5e6a92"/><text x="286" y="57" font-size="10" fill="#2c365a" text-anchor="middle">mA</text><text x="286" y="73" font-size="13" fill="#e04848" text-anchor="middle" font-weight="700">?</text>${label(286, 96, '전류계', 10)}</g>
        <g><circle cx="174" cy="92" r="15" fill="#f4f1e6" stroke="#5e6a92"/><text x="174" y="96" font-size="11" fill="#2c365a" text-anchor="middle">V</text><path d="M162 101 Q130 112 120 126 M186 101 Q218 112 228 126" stroke="#aab4d6" stroke-dasharray="3 3" fill="none"/>${label(212, 88, '전압계', 10)}</g>
        <g data-o="long"><path d="M120 128 ${Array.from({ length: 18 }, (_, i) => `l6 ${i % 2 ? 5 : -5}`).join(' ')}" stroke="#c9b48a" stroke-width="2.5" fill="none"/>${label(174, 146, '긴 니크롬선', 10)}</g>
        <g data-o="short" class="pv-off"><path d="M120 128 h27 ${Array.from({ length: 9 }, (_, i) => `l6 ${i % 2 ? 5 : -5}`).join(' ')} h27" stroke="#c9b48a" stroke-width="2.5" fill="none"/>${label(174, 146, '짧은 니크롬선', 10)}</g>`,
      steps: [
        h => { h.move('knob', [[0, 0, 0], [0, 0, 60], [0, 0, 120], [0, 0, 180]], 2400); h.text('volt', ['1.0 V', '2.0 V', '3.0 V', '4.0 V'], 600); },
        h => { h.text('volt', ['1.0 V'], 0); h.move('lever', [[0, 0, -30], [0, 0, 0]], 900); h.pulse(286, 60, 26, 900); h.pulse(174, 92, 19, 1100); },
        h => { h.hide('long', 600); h.show('short', 600, 500); },
      ],
    },
  },
  'series-parallel': {
    // 실제 실험(시뮬레이션과 같음): 전지 2개(1.5 V × 2), 같은 전구 A·B, 전구마다 스위치 S1·S2.
    main: {
      svg: `<g><rect x="136" y="128" width="22" height="14" rx="3" fill="#d98c45"/><rect x="160" y="128" width="22" height="14" rx="3" fill="#d98c45"/>${label(160, 124, '전지 2개', 9)}</g>
        <g data-o="one"><path d="M136 135 H40 V30 H280 V135 H182" stroke="#5fa8ff" stroke-width="3" fill="none"/>${bulb(160, 30, 'A')}<g data-o="glow"><circle cx="160" cy="30" r="20" fill="#ffe9a6" opacity=".5"/></g>${knife(40, 70, 'S1', 'v')}${label(220, 70, '전구 1개', 11)}</g>
        <g data-o="series" class="pv-off"><path d="M136 135 H40 V30 H280 V135 H182" stroke="#5fa8ff" stroke-width="3" fill="none"/>${bulb(120, 30, 'A', true)}${bulb(200, 30, 'B', true)}${knife(40, 70, 'S1', 'v')}${knife(280, 70, 'S2', 'v')}${label(160, 80, '직렬연결', 11)}</g>
        <g data-o="parallel" class="pv-off"><path d="M136 135 H40 V26 H280 V135 H182 M40 82 H280" stroke="#5fa8ff" stroke-width="3" fill="none"/>${bulb(210, 26, 'A', true)}${bulb(210, 82, 'B', true)}<g data-o="s1" style="transform-box:view-box;transform-origin:96px 26px">${knife(96, 26, 'S1', 'h')}</g>${knife(96, 82, 'S2', 'h')}${label(240, 110, '병렬연결', 11)}</g>`,
      steps: [
        h => h.o('glow') && h.o('glow').animate([{ opacity: .2 }, { opacity: 1 }, { opacity: .6 }, { opacity: 1 }], { duration: 2000, fill: 'forwards' }),
        h => { h.hide('one', 500); h.show('series', 600, 400); },
        h => { h.hide('one', 500); h.show('parallel', 600, 400); },
        h => { h.hide('one', 10); h.show('parallel', 10); h.move('s1', [[0, 0, 0], [0, 0, -35]], 900, 300); },
      ],
    },
  },
  'coil-magnetic-field': {
    // 실제 실험(시뮬레이션과 같음): 전원 장치에 이은 코일이 판을 뚫고 서 있고, 둘레에 나침반 8개. 먼저 막대자석 둘레의 나침반을 봐요.
    main: {
      svg: `<g><rect x="12" y="24" width="64" height="38" rx="6" fill="#2c365a" stroke="#8f9bc4"/><rect x="20" y="30" width="36" height="18" rx="3" fill="#081022"/><text x="38" y="44" font-size="11" fill="#ff6b6b" text-anchor="middle" data-o="volt">0.0</text><text x="30" y="58" font-size="10" fill="#ffb3b3" text-anchor="middle" data-o="pl">+</text><text x="54" y="58" font-size="10" fill="#cfd6e4" text-anchor="middle" data-o="pr">−</text>${label(44, 76, '전원 장치', 10)}</g>
        <path d="M30 62 V130 H196 V112 M54 62 V124 H204 V112" stroke="#e05656" stroke-width="2" fill="none"/>
        <ellipse cx="200" cy="80" rx="96" ry="40" fill="#1c2442" stroke="#5e6a92"/>
        <ellipse cx="200" cy="74" rx="9" ry="38" fill="none" stroke="#d88a4a" stroke-width="5"/>
        <g data-o="needles">${[[128, 80], [272, 80], [150, 56], [250, 56], [150, 104], [250, 104], [200, 46], [200, 116]].map(([x, y]) => compass(x, y, 9)).join('')}</g>
        ${button(24, 92)}${label(41, 128, '스위치', 9)}
        <g data-o="magnetView" class="pv-off"><rect x="0" y="0" width="320" height="150" fill="#070b1cf0"/><rect x="124" y="66" width="36" height="18" fill="#e04848"/><rect x="160" y="66" width="36" height="18" fill="#3a6fd8"/>${label(142, 79, 'N', 11, '#fff')}${label(178, 79, 'S', 11, '#fff')}${[[100, 75], [220, 75], [125, 40], [195, 40], [125, 110], [195, 110], [160, 28], [160, 122]].map(([x, y]) => compass(x, y, 9)).join('')}${label(160, 146, '막대자석 둘레의 나침반', 10)}</g>`,
      steps: [
        h => { h.show('magnetView', 400); h.pulse(160, 75, 64, 400); },
        h => h.pulse(200, 78, 46),
        h => { h.press('switch'); h.text('volt', ['3.0'], 300); h.ask(300, 30, 900); },
        h => { h.text('pl', ['−'], 300); h.text('pr', ['+'], 300); h.text('volt', ['3.0', '5.0'], 1200); h.pulse(42, 58, 18, 200); h.ask(300, 30, 1300); },
      ],
    },
  },
  'electric-swing': {
    // 실제 실험(시뮬레이션과 같음): 스탠드에 매단 코일(전기 그네)의 아래 변이 눕혀 놓은 말굽자석의 두 팔 사이에 있어요.
    main: {
      svg: `<path d="M70 140 H250" stroke="#5a6388" stroke-width="5"/><path d="M84 140 V18 H214" stroke="#cfd6e4" stroke-width="5" fill="none"/>
        <g><rect x="230" y="20" width="70" height="36" rx="6" fill="#2c365a" stroke="#8f9bc4"/><rect x="238" y="26" width="38" height="18" rx="3" fill="#081022"/><text x="257" y="40" font-size="11" fill="#ff6b6b" text-anchor="middle" data-o="volt">0.0</text><text x="288" y="34" font-size="10" fill="#ffb3b3" text-anchor="middle" data-o="pl">+</text><text x="288" y="48" font-size="10" fill="#cfd6e4" text-anchor="middle" data-o="pr">−</text>${label(265, 70, '전원 장치', 10)}</g>
        <g data-o="coil"><path d="M150 18 V110 H176 V18" stroke="#d88a4a" stroke-width="4" fill="none"/>${label(198, 64, '코일', 10)}</g>
        <g data-o="magnet"><path d="M110 98 H218" stroke="#3a6fd8" stroke-width="12"/><path d="M110 126 H218" stroke="#e04848" stroke-width="12"/><path d="M218 98 Q248 112 218 126" stroke="#aab4d6" stroke-width="12" fill="none"/>${label(102, 102, 'S', 12, '#3a6fd8')}${label(102, 130, 'N', 12, '#e04848')}</g><g data-o="magnet2" class="pv-off"><path d="M110 98 H218" stroke="#e04848" stroke-width="12"/><path d="M110 126 H218" stroke="#3a6fd8" stroke-width="12"/><path d="M218 98 Q248 112 218 126" stroke="#aab4d6" stroke-width="12" fill="none"/>${label(102, 102, 'N', 12, '#e04848')}${label(102, 130, 'S', 12, '#3a6fd8')}</g>
        ${button(246, 98)}${label(263, 134, '스위치', 9)}`,
      steps: [
        h => h.pulse(163, 108, 44),
        h => { h.press('switch'); h.text('volt', ['1.0'], 200); h.ask(200, 104, 900); },
        h => { h.text('volt', ['1.0'], 0); h.text('pl', ['−'], 300); h.text('pr', ['+'], 300); h.pulse(288, 41, 14, 200); h.hide('magnet', 400, 1100); h.show('magnet2', 400, 1100); h.text('volt', ['1.0', '3.0'], 1300); h.ask(200, 104, 2300); },
      ],
    },
  },
  'electric-motor': {
    // 실제 실험(시뮬레이션과 같음): 왼쪽 S극, 오른쪽 N극 사이에 축으로 돌 수 있는 코일, 아래에 전지와 브러시.
    // 간이 전동기: 건전지 위에 두 받침대를 세우고 자석을 올린 뒤, 에나멜선 코일을 받침대에 걸어요.
    main: {
      svg: `<rect x="30" y="34" width="54" height="72" rx="6" fill="#3a6fd8"/>${label(57, 76, 'S', 16, '#fff')}<rect x="236" y="34" width="54" height="72" rx="6" fill="#e04848"/>${label(263, 76, 'N', 16, '#fff')}
        <path d="M100 70 H220" stroke="#8f9bc4" stroke-width="3"/><g data-o="coil"><rect x="124" y="40" width="72" height="60" rx="4" fill="none" stroke="#d88a4a" stroke-width="5"/></g>
        <circle cx="160" cy="112" r="8" fill="#e8c15a"/><rect x="130" y="128" width="60" height="14" rx="3" fill="#d98c45"/>${label(160, 124, '전지와 브러시', 9)}
        ${button(260, 118)}
        <g data-o="simple" class="pv-off"><rect x="0" y="0" width="320" height="150" fill="#070b1cf0"/><rect x="70" y="118" width="180" height="24" rx="8" fill="#d98c45"/>${label(160, 135, '건전지', 10, '#2a1600')}<rect x="140" y="104" width="40" height="14" rx="3" fill="#5a6388"/>${label(200, 112, '자석', 9)}<path d="M112 118 V56 M208 118 V56" stroke="#c9d1db" stroke-width="4"/><g data-o="ring"><circle cx="160" cy="58" r="26" fill="none" stroke="#b45a2a" stroke-width="4"/><path d="M112 58 H134 M186 58 H208" stroke="#b45a2a" stroke-width="4"/></g>${label(250, 30, '에나멜선 코일', 10, '#ffd166')}</g>`,
      steps: [
        h => h.pulse(160, 70, 54),
        h => { h.press('switch'); h.ask(160, 28, 900); },
        h => { h.show('simple', 500); h.move('ring', [[0, -40], [0, 0]], 1600, 300); },
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
    // 실제 실험(시뮬레이션과 같음): 전기난로(온도 표시·전원 단추·열선), 빛을 내는 공(온도 막대), 실제 별 사진의 별빛 색 재기.
    main: {
      svg: `<g><rect x="10" y="20" width="110" height="112" rx="10" fill="#cfd4dc"/><rect x="18" y="62" width="94" height="60" rx="4" fill="#3a3f52"/>${[0, 1, 2, 3].map(i => `<path d="M24 ${72 + i * 13} H106" stroke="#6d727c" stroke-width="3" stroke-linecap="round"/>`).join('')}<rect x="22" y="28" width="56" height="24" rx="4" fill="#111528"/><text x="50" y="45" font-size="12" fill="#ff6b6b" text-anchor="middle" data-o="temp">약 30 ℃</text><g data-o="switch"><circle cx="100" cy="40" r="7" fill="#1c2442" stroke="#5e6a92"/></g>${label(65, 146, '전기난로의 열선', 10)}</g>
        <circle cx="190" cy="62" r="28" fill="#d6dcef"/>${label(190, 106, '빛을 내는 공', 10)}<path d="M150 122 H230" stroke="#5e6a92" stroke-width="4" stroke-linecap="round"/><circle data-o="knob" cx="170" cy="122" r="7" fill="#ffd166"/>${label(190, 142, '표면 온도', 9)}
        <g><rect x="248" y="22" width="64" height="64" rx="6" fill="#050716" stroke="#8fd3ff66"/><circle cx="280" cy="54" r="4" fill="#fff"/><g data-o="scan"><circle cx="280" cy="54" r="14" fill="none" stroke="#8fd3ff" stroke-width="3" stroke-dasharray="20 68"/></g>${label(280, 102, '실제 별 사진', 10)}</g>`,
      steps: [
        h => { h.press('switch'); h.text('temp', ['약 200 ℃', '약 500 ℃', '약 800 ℃', '약 1100 ℃'], 550); h.ask(65, 92, 2000); },
        h => { h.move('knob', [[0, 0], [40, 0], [-12, 0], [40, 0]], 2400); h.ask(190, 62, 1800); },
        h => { h.move('scan', [[0, 0, 0], [0, 0, 720]], 2400); h.ask(280, 92, 2000); },
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
  // 중학교 1학년 Ⅵ. 기체의 성질
  'gas-pressure': {
    // 실제 실험(시뮬레이션과 같음): 물을 담은 페트병 (가)(나)(다)를 점토 위에 세워요. 결과(깊이)는 ‘?’로만 보여 줘요.
    main: {
      svg: `${[[60, false, 1], [160, true, 1], [260, true, .5]].map(([x, inv, w], i) => `<g data-o="b${i}"><g transform="translate(${x} ${inv ? 68 : 118}) scale(.42 ${inv ? -.42 : .42})"><path d="M-33 0 V-110 C-33 -134 -14 -140 -12 -150 V-160 H12 V-150 C14 -140 33 -134 33 -110 V0 Z" fill="#dfeffa33" stroke="#cfe6f5" stroke-width="4"/><rect data-o="w${i}" x="-34" y="${inv ? -160 : -150}" width="68" height="${w === 1 ? 150 : 80}" fill="#4fa8ff" opacity=".6"/><rect x="-13" y="-174" width="26" height="14" rx="3" fill="#3f7ad6"/></g></g><rect x="${x - 34}" y="118" width="68" height="12" rx="4" fill="#c99d74"/>${label(x, 146, ['(가)', '(나)', '(다)'][i], 11, '#ffd166')}`).join('')}
        <g data-o="cup" class="pv-off"><rect x="0" y="0" width="320" height="150" fill="#070b1cf0"/><path d="M110 30 L124 120 H196 L210 30" fill="#dfeffa14" stroke="#cfe6f5" stroke-width="2"/><path d="M110 36 Q160 50 210 36" fill="none" stroke="#dfe5ec" stroke-width="3"/>${[[140, 112, '#ff6b6b'], [158, 112, '#ffd166'], [176, 112, '#5cc8ff'], [148, 98, '#7dffb0'], [166, 98, '#c77dff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`).join('')}${label(160, 142, '구슬을 넣은 컵', 10)}</g>`,
      steps: [
        h => { h.show('w0', 600); h.show('w1', 600, 200); h.show('w2', 600, 400); },
        h => { h.move('b0', [[0, -24], [0, 0]], 900); h.move('b1', [[0, -24], [0, 0]], 900, 300); h.move('b2', [[0, -24], [0, 0]], 900, 600); },
        h => { h.ask(60, 104, 300); h.ask(160, 104, 500); h.ask(260, 104, 700); },
        h => { h.show('cup', 400); h.move('cup', [[0, 0], [-6, 0], [6, 0], [-6, 0], [6, 0], [0, 0]], 1600, 400); h.ask(160, 22, 1700); },
      ],
    },
  },
  'boyles-law': {
    // 실제 실험(시뮬레이션과 같음): 피스톤을 30 mL에 맞춘 주사기의 입구에 압력계를 연결하고, 피스톤을 당기거나 밀어요.
    main: {
      svg: `<rect x="70" y="58" width="150" height="34" rx="4" fill="#dfeffa22" stroke="#cfe6f5" stroke-width="2"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${90 + i * 20} 92 v-6" stroke="#aab4d6"/>`).join('')}<path d="M60 75 H70" stroke="#cfe6f5" stroke-width="5"/>
        <g data-o="plunger"><rect x="168" y="60" width="6" height="30" fill="#8f9bc4"/><path d="M174 75 H250 M250 62 V88" stroke="#8f9bc4" stroke-width="5" stroke-linecap="round"/></g>
        <circle cx="34" cy="75" r="26" fill="#f4f1e6" stroke="#5e6a92" stroke-width="3"/><path d="M34 75 L46 62" stroke="#e04848" stroke-width="3" stroke-linecap="round"/><text x="34" y="96" font-size="9" fill="#3a3f52" text-anchor="middle">기압</text>
        <text x="145" y="48" font-size="12" fill="#ffd166" text-anchor="middle" data-o="ml">30 mL</text>${label(34, 122, '압력계', 10)}${label(150, 122, '주사기', 10)}
        <g data-o="graph" class="pv-off"><rect x="226" y="6" width="90" height="70" rx="6" fill="#0a1029" stroke="#2c3966"/><path d="M240 64 H306 M240 64 V14" stroke="#aab4d6"/>${label(273, 74, '압력', 8)}${label(234, 12, '부피', 8)}</g>`,
      steps: [
        h => h.pulse(60, 75, 22),
        h => { h.move('plunger', [[0, 0], [26, 0]], 1600); h.text('ml', ['35 mL', '40 mL', '45 mL'], 500); h.ask(34, 40, 1500); },
        h => { h.move('plunger', [[0, 0], [-34, 0]], 1600); h.text('ml', ['25 mL', '20 mL', '15 mL'], 500); h.ask(34, 40, 1500); },
        h => { h.show('graph', 500); h.ask(273, 40, 900); },
      ],
    },
  },
  'charles-law': {
    // 실제 실험(시뮬레이션과 같음): 유리병–실리콘 튜브–피펫, 뜨거운 물이 담긴 비커, 온도 센서. 방울이 움직이는 방향은 ‘?’로만 보여 줘요.
    main: {
      svg: `<path d="M90 50 V136 H190 V50" fill="none" stroke="#cfe6f5" stroke-width="2"/><g data-o="hot" class="pv-off"><rect x="91" y="72" width="98" height="63" fill="#ff8a5c" opacity=".35"/></g>
        <rect x="124" y="92" width="28" height="36" rx="5" fill="#dfeffa22" stroke="#cfe6f5" stroke-width="2"/><path d="M138 92 V40 H230" fill="none" stroke="#9fb3d9" stroke-width="4"/>
        <rect x="230" y="34" width="70" height="12" rx="3" fill="#dfeffa22" stroke="#cfe6f5"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${238 + i * 11} 46 v4" stroke="#aab4d6"/>`).join('')}
        <g data-o="drop" class="pv-off"><rect x="290" y="36" width="8" height="8" rx="2" fill="#ff6b9a"/></g>
        <text x="58" y="70" font-size="12" fill="#ffd166" text-anchor="middle" data-o="temp">온도</text><path d="M70 62 L110 100" stroke="#aab4d6"/>${label(140, 148, '5 mL 유리병', 10)}${label(266, 64, '1 mL 피펫', 10)}${label(212, 30, '실리콘 튜브', 9)}`,
      steps: [
        h => { h.pulse(138, 40, 16); h.pulse(230, 40, 12, 500); },
        h => { h.show('hot', 600); h.show('drop', 500, 700); h.pulse(294, 40, 12, 1100); },
        h => { h.text('temp', ['60 ℃', '50 ℃', '40 ℃', '30 ℃'], 600); h.ask(266, 18, 1900); },
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
    flipY: (id, delay = 0) => run(id, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(-1)' }], 900, delay),
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
