// 자동 재생: 실험의 핵심 과정을 한 단계씩 천천히 보여 줘요. 모든 실험이 함께 쓰는 부품이에요.
//
// 자동 재생 중에는 ‘가상 시계’가 느리게 흘러요(보통 0.6배, 천천히 0.4배). 일시정지하면 시계가 멈춰요.
// 실험은 애니메이션 시각과 프레임 사이 시간(dt)을 모두 이 시계(clock)로 재야 해요. 그러면 빠르기를 바꾸거나
// 일시정지할 때 움직임·전자의 이동·기다리는 시간이 한꺼번에, 바로 느려지거나 멈춰요.
//
// plays: { 모드이름: [[단계 이름, 설명, async ({ wait, idle }) => { … }], …] }
//   wait(ms): 가상 시계로 ms만큼 기다리기(천천히일수록 실제로 더 오래). idle(): 실험이 움직임을 마칠 때까지 기다리기.
export const PACES = Object.freeze([['slow', '천천히', 0.4], ['normal', '보통', 0.6]]);
const STOPPED = Symbol('stopped');

export function createAutoplay({ mount, plays, getMode, isIdle = () => true, onChange = () => {}, reducedMotion }) {
  let rate = 1, paused = false, base = 0, baseReal = performance.now(), pace = 'normal', run = null;
  const clock = () => base + (paused ? 0 : (performance.now() - baseReal) * rate);
  // 시계 빠르기를 바꿀 때는 지금 시각을 기준으로 다시 잡아 끊김 없이 이어지게 해요.
  const retime = (nextRate, nextPaused) => { base = clock(); baseReal = performance.now(); rate = nextRate; paused = nextPaused; };
  const paceRate = () => PACES.find(([id]) => id === pace)[2];

  mount.innerHTML = `
    <div class="autoplay-buttons">
      <button type="button" class="secondary big" data-auto="play">▶ 자동 재생으로 보기</button>
      <button type="button" class="secondary big" data-auto="pause" hidden>‖ 일시정지</button>
      <button type="button" class="secondary big" data-auto="restart" hidden>↺ 처음부터</button>
      <button type="button" class="secondary big" data-auto="stop" hidden>■ 멈추고 직접 하기</button>
      <div class="pace" role="group" aria-label="자동 재생 빠르기"><span>빠르기</span>${PACES.map(([id, label]) => `<button type="button" data-pace="${id}" aria-pressed="${id === pace}">${label}</button>`).join('')}</div>
    </div>
    <ol class="autoplay-steps" hidden></ol>
    <p class="autoplay-caption" role="status" aria-live="polite"></p>`;
  const button = name => mount.querySelector(`[data-auto="${name}"]`);
  const caption = mount.querySelector('.autoplay-caption'), list = mount.querySelector('.autoplay-steps');
  const idleText = '자동 재생은 핵심 과정을 한 단계씩 천천히 보여 줘요. 언제든 멈추고 직접 해 볼 수 있어요.';

  // 버튼과 빠르기 선택은 한 번만 만들고 글자·보임만 바꿔요(재생 중에 다시 그려 선택이 풀리는 일이 없도록).
  function render(text) {
    const steps = run ? plays[run.mode] : [];
    button('play').hidden = !!run;
    for (const name of ['pause', 'restart', 'stop']) button(name).hidden = !run;
    button('pause').textContent = paused ? '▶ 이어서 재생' : '‖ 일시정지';
    mount.querySelectorAll('[data-pace]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pace === pace)));
    list.hidden = !run;
    if (run) list.innerHTML = steps.map(([name], i) => `<li class="${i < run.step ? 'done' : i === run.step ? 'current' : ''}"${i === run.step ? ' aria-current="step"' : ''}>${i + 1}. ${name}</li>`).join('');
    caption.textContent = text ?? (run ? `${paused ? '일시정지 · ' : ''}${run.step + 1}/${steps.length} ${steps[run.step][1]}` : idleText);
  }
  function wait(ms) {
    const me = run, end = clock() + (reducedMotion?.matches ? Math.min(ms, 300) : ms);
    return new Promise((resolve, reject) => (function tick() {
      if (run !== me) return reject(STOPPED);
      if (!paused && clock() >= end) return resolve();
      requestAnimationFrame(tick);
    })());
  }
  function idle() {
    const me = run;
    return new Promise((resolve, reject) => (function tick() {
      if (run !== me) return reject(STOPPED);
      if (!paused && isIdle()) return resolve();
      requestAnimationFrame(tick);
    })());
  }
  async function start() {
    stop(true);
    const me = run = { mode: getMode(), step: 0 };
    retime(paceRate(), false);
    onChange(true); render();
    try {
      for (const [i, step] of plays[me.mode].entries()) {
        me.step = i; render(); onChange(true);
        await step[2]({ wait, idle });
      }
      run = null; retime(1, false); onChange(false);
      render('자동 재생이 끝났어요. 이제 버튼이나 끌기로 직접 해 보세요!');
    } catch (err) { if (err !== STOPPED) throw err; }
  }
  function stop(silent = false) {
    if (!run) { if (paused) retime(1, false); return; }
    run = null; retime(1, false);
    if (!silent) { onChange(false); render(); }
  }
  function togglePause() { if (run) { retime(rate, !paused); render(); } }
  function setPace(next) { pace = next; if (run) retime(paceRate(), paused); render(); }

  button('play').onclick = start;
  button('restart').onclick = start;
  button('pause').onclick = togglePause;
  button('stop').onclick = () => stop();
  mount.querySelectorAll('[data-pace]').forEach(b => b.onclick = () => setPace(b.dataset.pace));
  render();
  return {
    clock,
    get running() { return !!run; },
    get paused() { return paused; },
    get rate() { return paused ? 0 : rate; },
    start, stop: () => stop(), togglePause, setPace, render,
  };
}
