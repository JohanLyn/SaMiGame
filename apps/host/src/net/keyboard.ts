import { NEUTRAL_INPUT, type ControllerInput } from '@samigame/shared';

/**
 * Udvikler-værktøj (`?keys=1`): styr plads 1 med WASD + Mellemrum(A)/Q(B)/1-6(valg)
 * og plads 2 med piletaster + Enter(A)/Shift(B). Virker i alle scener og minigames.
 */
const LAYOUTS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'Space', b: 'KeyQ' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'Enter', b: 'ShiftRight' },
];

export class KeyboardPlayers {
  private readonly down = new Set<string>();
  private readonly state: ControllerInput[] = LAYOUTS.map(() => ({ ...NEUTRAL_INPUT }));
  readonly enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) return;
    window.addEventListener('keydown', (e) => {
      if (this.down.has(e.code)) return;
      this.down.add(e.code);
      LAYOUTS.forEach((l, slot) => {
        if (e.code === l.a || e.code === l.b) this.state[slot].taps++;
      });
      const digit = /^Digit([1-6])$/.exec(e.code);
      if (digit) {
        this.state[0].choice = Number(digit[1]) - 1;
        this.state[0].taps++;
      }
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  controls(slot: number): boolean {
    return this.enabled && slot < LAYOUTS.length;
  }

  /** Tastaturets input for pladsen (eller null). `active` = der trykkes på noget lige nu. */
  read(slot: number): { input: ControllerInput; active: boolean } | null {
    if (!this.controls(slot)) return null;
    const l = LAYOUTS[slot];
    const s = this.state[slot];
    let x = (this.down.has(l.right) ? 1 : 0) - (this.down.has(l.left) ? 1 : 0);
    let y = (this.down.has(l.down) ? 1 : 0) - (this.down.has(l.up) ? 1 : 0);
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    s.x = x;
    s.y = y;
    s.a = this.down.has(l.a);
    s.b = this.down.has(l.b);
    s.px = (x + 1) / 2;
    s.py = (y + 1) / 2;
    s.level = s.a ? 1 : 0;
    return { input: s, active: x !== 0 || y !== 0 || s.a || s.b };
  }
}
