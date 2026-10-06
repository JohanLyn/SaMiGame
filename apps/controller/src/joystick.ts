const DEADZONE = 0.12;

/**
 * Flydende joystick: hvor tommelfingeren rører, bliver midten. Returnerer x/y i [-1, 1].
 */
export class Joystick {
  x = 0;
  y = 0;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;

  constructor(
    private readonly zone: HTMLElement,
    private readonly base: HTMLElement,
    private readonly knob: HTMLElement,
    private readonly radius = 60,
  ) {
    zone.addEventListener('pointerdown', (e) => this.start(e));
    zone.addEventListener('pointermove', (e) => this.move(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      zone.addEventListener(type, (e) => this.end(e));
    }
    this.reset();
  }

  private start(e: PointerEvent): void {
    if (this.pointerId !== null) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.zone.setPointerCapture(e.pointerId);
    const rect = this.zone.getBoundingClientRect();
    this.originX = e.clientX;
    this.originY = e.clientY;
    this.base.style.left = `${e.clientX - rect.left}px`;
    this.base.style.top = `${e.clientY - rect.top}px`;
    this.zone.classList.add('active');
  }

  private move(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    let dx = (e.clientX - this.originX) / this.radius;
    let dy = (e.clientY - this.originY) / this.radius;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    const inDeadzone = Math.hypot(dx, dy) < DEADZONE;
    this.x = inDeadzone ? 0 : round(dx);
    this.y = inDeadzone ? 0 : round(dy);
    this.knob.style.transform = `translate(${dx * this.radius}px, ${dy * this.radius}px)`;
  }

  private end(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.reset();
  }

  private reset(): void {
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    this.knob.style.transform = 'translate(0, 0)';
    this.base.style.left = '50%';
    this.base.style.top = '55%';
    this.zone.classList.remove('active');
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** En knap der er "nede" så længe en finger rører den (virker med flere fingre samtidig). */
export class HoldButton {
  pressed = false;

  constructor(el: HTMLElement, onPress: () => void) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      this.pressed = true;
      el.classList.add('pressed');
      onPress();
    });
    const release = () => {
      this.pressed = false;
      el.classList.remove('pressed');
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      el.addEventListener(type, release);
    }
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
