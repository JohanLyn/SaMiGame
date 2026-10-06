import type { ButtonSpec, ControllerLayout } from '@samigame/shared';
import { HoldButton, Joystick } from '../joystick';
import { h, input, type Ctx } from '../state';

type Of<K extends ControllerLayout['kind']> = Extract<ControllerLayout, { kind: K }>;

/** Rydder op når layoutet skiftes. */
export type Cleanup = () => void;

const noop: Cleanup = () => {};

function hint(text?: string): HTMLElement | null {
  return text ? h('p.hint', null, text) : null;
}

/** Knap der sætter input mens den holdes, og tæller et tryk. */
function pressable(el: HTMLElement, ctx: Ctx, onDown: () => void, onUp: () => void = () => {}): void {
  const active = new Set<number>();
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    active.add(e.pointerId);
    el.classList.add('pressed');
    ctx.vibrate(12);
    onDown();
  });
  const up = (e: PointerEvent) => {
    if (!active.delete(e.pointerId)) return;
    if (active.size === 0) {
      el.classList.remove('pressed');
      onUp();
    }
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) el.addEventListener(type, up);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---------------------------------------------------------------------------

export function renderWait(root: HTMLElement, l: Of<'wait'>, ctx: Ctx): Cleanup {
  root.append(
    h(
      'div.center.wait',
      null,
      h('div.big-emoji.bob', null, l.emoji ?? '📺'),
      h('h2.title', null, l.title),
      l.message ? h('p.sub', null, l.message) : null,
      h('img.wait-avatar.bob-slow', { src: avatarSrc(ctx), alt: '' }),
      h('div.dots', null, h('span'), h('span'), h('span')),
    ),
  );
  return noop;
}

export function renderReady(root: HTMLElement, l: Of<'ready'>, ctx: Ctx): Cleanup {
  const btn = h('button.btn.btn-huge.ready-btn', null, l.ready ? '✔ KLAR!' : 'KLAR!');
  if (l.ready) btn.classList.add('done');
  else
    pressable(btn, ctx, () => {
      ctx.action('ready', true);
      btn.textContent = '✔ KLAR!';
      btn.classList.add('done');
      ctx.vibrate(40);
    });
  root.append(
    h(
      'div.center.ready',
      null,
      h('h2.title', null, l.title),
      l.role ? h('p.role', null, l.role) : null,
      h('ul.controls', null, ...l.controls.map((c) => h('li', null, c))),
      btn,
      l.ready ? h('p.sub', null, 'Venter på de andre…') : null,
    ),
  );
  return noop;
}

export function renderStick(root: HTMLElement, l: Of<'stick'>, ctx: Ctx): Cleanup {
  const zone = h('div.stick-zone', null, h('div.stick-base', null, h('div.stick-knob')), h('p.stick-hint', null, 'Træk her'));
  const buttons = h('div.pad-buttons');
  root.append(h('div.pad', null, zone, buttons), hint(l.hint) ?? '');
  const stick = new Joystick(zone, zone.querySelector('.stick-base')!, zone.querySelector('.stick-knob')!, 70);
  const timer = setInterval(() => {
    input.x = stick.x;
    input.y = stick.y;
  }, 16);
  if (l.b) {
    const b = h('button.pad-btn.pad-b', null, l.b);
    pressable(b, ctx, () => { input.b = true; ctx.tap(); }, () => (input.b = false));
    buttons.append(b);
  }
  if (l.a) {
    const a = h('button.pad-btn.pad-a', null, l.a);
    pressable(a, ctx, () => { input.a = true; ctx.tap(); }, () => (input.a = false));
    buttons.append(a);
  }
  void HoldButton;
  return () => clearInterval(timer);
}

function buttonGrid(specs: ButtonSpec[], ctx: Ctx, columns: number, cls: string, onPress?: (id: number) => void): HTMLElement {
  const grid = h(`div.grid.${cls}`, { style: `grid-template-columns: repeat(${columns}, 1fr)` });
  for (const spec of specs) {
    const btn = h(
      'button.grid-btn',
      { style: spec.color ? `--btn:${spec.color}` : '', disabled: Boolean(spec.disabled) },
      spec.icon ? h('span.icon', null, spec.icon) : null,
      h('span.label', null, spec.label),
    );
    if (!spec.disabled) {
      pressable(
        btn,
        ctx,
        () => {
          input.a = true;
          ctx.tap(spec.id);
          onPress?.(spec.id);
        },
        () => (input.a = false),
      );
    }
    grid.append(btn);
  }
  return grid;
}

export function renderButtons(root: HTMLElement, l: Of<'buttons'>, ctx: Ctx): Cleanup {
  const cols = l.columns ?? (l.buttons.length <= 2 ? 2 : l.buttons.length <= 4 ? 2 : 3);
  root.append(h('div.fill', null, buttonGrid(l.buttons, ctx, cols, 'big')), hint(l.hint) ?? '');
  return noop;
}

export function renderMash(root: HTMLElement, l: Of<'mash'>, ctx: Ctx): Cleanup {
  const counter = h('div.mash-count', null, '0');
  let count = 0;
  const btn = h('button.mash-btn', null, l.icon ? h('span.icon', null, l.icon) : null, h('span.label', null, l.label));
  pressable(
    btn,
    ctx,
    () => {
      input.a = true;
      ctx.tap();
      counter.textContent = String(++count);
      counter.classList.remove('pop');
      void counter.offsetWidth;
      counter.classList.add('pop');
    },
    () => (input.a = false),
  );
  root.append(h('div.center.mash', null, counter, btn), hint(l.hint) ?? '');
  return noop;
}

export function renderTouchpad(root: HTMLElement, l: Of<'touchpad'>, ctx: Ctx): Cleanup {
  const pad = h(`div.touchpad.${l.image === 'face' ? 'face' : 'blank'}`, null, h('div.touch-dot')) as HTMLDivElement;
  const dot = pad.querySelector<HTMLElement>('.touch-dot')!;
  let pointer: number | null = null;
  const move = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    input.px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    input.py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    dot.style.left = `${input.px * 100}%`;
    dot.style.top = `${input.py * 100}%`;
  };
  pad.addEventListener('pointerdown', (e) => {
    if (pointer !== null) return;
    e.preventDefault();
    pointer = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    input.a = true;
    ctx.tap();
    pad.classList.add('active');
    move(e);
  });
  pad.addEventListener('pointermove', (e) => e.pointerId === pointer && move(e));
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    input.a = false;
    pad.classList.remove('active');
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) pad.addEventListener(type, up);
  const row = h('div.touch-row', null, pad);
  if (l.b) {
    const b = h('button.pad-btn.pad-b', null, l.b);
    pressable(b, ctx, () => { input.b = true; ctx.tap(); }, () => (input.b = false));
    row.append(b);
  }
  root.append(row, hint(l.hint) ?? '');
  return noop;
}

export function renderTilt(root: HTMLElement, l: Of<'tilt'>, ctx: Ctx): Cleanup {
  // Gyroskop når muligt, ellers joystick.
  let gotMotion = false;
  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return;
    gotMotion = true;
    const landscape = window.innerWidth > window.innerHeight;
    const x = landscape ? (e.beta ?? 0) / 25 : (e.gamma ?? 0) / 25;
    const y = landscape ? -(e.gamma ?? 0) / 25 - 0 : ((e.beta ?? 0) - 35) / 25;
    input.x = Math.max(-1, Math.min(1, x));
    input.y = Math.max(-1, Math.min(1, y));
    ball.style.transform = `translate(${input.x * 60}px, ${input.y * 60}px)`;
  };
  const ball = h('div.tilt-ball');
  const meter = h('div.tilt-meter', null, ball);
  const fallback = h('div.tilt-fallback');
  const askBtn = h('button.btn', null, '📱 Slå vip til');
  const wrap = h('div.center.tilt', null, meter, h('p.sub', null, 'Vip telefonen for at styre'), askBtn, fallback);
  root.append(wrap, hint(l.hint) ?? '');

  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  const start = () => window.addEventListener('deviceorientation', onOrient);
  if (DOE?.requestPermission) {
    askBtn.addEventListener('click', () => {
      void DOE.requestPermission!().then((r) => {
        if (r === 'granted') {
          start();
          askBtn.remove();
        }
      });
    });
  } else {
    askBtn.remove();
    start();
  }
  let cleanupStick: Cleanup = noop;
  const t = setTimeout(() => {
    if (gotMotion) return;
    // Intet gyroskop (eller ikke tilladt): brug joystick i stedet.
    wrap.innerHTML = '';
    cleanupStick = renderStick(wrap, { kind: 'stick', a: l.a, b: l.b }, ctx);
  }, 2500);
  if (l.a || l.b) {
    const btns = h('div.pad-buttons.row');
    if (l.b) {
      const b = h('button.pad-btn.pad-b', null, l.b);
      pressable(b, ctx, () => { input.b = true; ctx.tap(); }, () => (input.b = false));
      btns.append(b);
    }
    if (l.a) {
      const a = h('button.pad-btn.pad-a', null, l.a);
      pressable(a, ctx, () => { input.a = true; ctx.tap(); }, () => (input.a = false));
      btns.append(a);
    }
    fallback.append(btns);
  }
  return () => {
    clearTimeout(t);
    window.removeEventListener('deviceorientation', onOrient);
    cleanupStick();
  };
}

export function renderMic(root: HTMLElement, l: Of<'mic'>, ctx: Ctx): Cleanup {
  const bar = h('div.mic-level');
  const meter = h('div.mic-meter', null, bar);
  const btn = h('button.mash-btn.small', null, h('span.icon', null, '📢'), h('span.label', null, l.label));
  const status = h('p.sub', null, 'Råb ind i telefonen!');
  root.append(h('div.center.mic', null, meter, status, btn), hint(l.hint) ?? '');

  let level = 0;
  let stream: MediaStream | null = null;
  let raf = 0;
  let audioCtx: AudioContext | null = null;
  // Reserve: hver tryk løfter niveauet, som falder af igen.
  pressable(btn, ctx, () => {
    level = Math.min(1, level + 0.22);
    ctx.tap();
  });
  const decay = setInterval(() => {
    if (!stream) level = Math.max(0, level - 0.04);
    input.level = level;
    bar.style.height = `${Math.round(level * 100)}%`;
  }, 33);

  navigator.mediaDevices
    ?.getUserMedia({ audio: true })
    .then((s) => {
      stream = s;
      audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / data.length);
        level = Math.max(level * 0.85, Math.min(1, rms * 4));
        raf = requestAnimationFrame(loop);
      };
      loop();
      status.textContent = '🎤 Mikrofonen lytter – RÅB!';
    })
    .catch(() => {
      status.textContent = 'Ingen mikrofon – hamr på knappen i stedet!';
    });

  return () => {
    clearInterval(decay);
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    void audioCtx?.close();
    input.level = 0;
  };
}

export function renderInfo(root: HTMLElement, l: Of<'info'>, ctx: Ctx): Cleanup {
  root.append(
    h(
      'div.info',
      null,
      h('h2.title', null, l.title),
      h('div.info-card', null, ...l.lines.map((line) => h('p', null, line))),
      l.buttons?.length ? buttonGrid(l.buttons, ctx, l.buttons.length > 3 ? 3 : l.buttons.length, 'small') : null,
    ),
    hint(l.hint) ?? '',
  );
  return noop;
}

export function renderChoice(root: HTMLElement, l: Of<'choice'>, ctx: Ctx): Cleanup {
  const specs = l.options.map((o) => ({ ...o, disabled: o.disabled || l.locked }));
  const grid = buttonGrid(specs, ctx, l.columns ?? (l.options.length <= 4 ? 2 : 3), 'choice');
  [...grid.children].forEach((el, i) => {
    if (l.options[i].id === l.selected) el.classList.add('selected');
  });
  root.append(h('div.fill', null, h('h2.title', null, l.title), grid), hint(l.hint) ?? '');
  return noop;
}

export function renderResult(root: HTMLElement, l: Of<'result'>, ctx: Ctx): Cleanup {
  const medal = ['🥇', '🥈', '🥉', '🎈'][Math.min(3, l.place - 1)];
  root.append(
    h(
      'div.center.result',
      null,
      h('div.big-emoji.pop-in', null, medal),
      h('h2.title', null, `${l.place}. plads`),
      h('p.points', null, l.points > 0 ? `+${l.points}` : ''),
      h('p.sub', null, l.message),
      h('p.total', null, `I alt: ${l.total} point`),
      h('img.wait-avatar.bob', { src: avatarSrc(ctx), alt: '' }),
    ),
  );
  if (l.place === 1) {
    ctx.vibrate(200);
    confetti(root);
  }
  return noop;
}

function confetti(root: HTMLElement): void {
  const colors = ['#ffcf3a', '#ff5fa2', '#3ee6a8', '#47b8ff', '#9b5cff'];
  for (let i = 0; i < 40; i++) {
    const c = h('i.confetti', {
      style: `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.8}s;animation-duration:${1.6 + Math.random()}s`,
    });
    root.append(c);
  }
}

import { renderAvatarSvg, svgDataUri } from '@samigame/shared';
export function avatarSrc(ctx: Ctx): string {
  return svgDataUri(renderAvatarSvg(ctx.player.avatar, { idPrefix: 'w' }));
}
