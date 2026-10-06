import Phaser from 'phaser';
import type { ControllerInput } from '@samigame/shared';

/**
 * Udvikler-værktøj (?keys=1): styr plads 1 med WASD + mellemrum/Q og plads 2 med piletaster + Enter/Shift,
 * så man kan teste uden telefoner.
 */
export class KeyboardPlayers {
  private readonly layouts: Record<string, Phaser.Input.Keyboard.Key>[] = [];

  constructor(scene: Phaser.Scene, enabled: boolean) {
    const kb = scene.input.keyboard;
    if (!enabled || !kb) return;
    this.layouts = [
      kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', a: 'SPACE', b: 'Q' }) as Record<string, Phaser.Input.Keyboard.Key>,
      kb.addKeys({ up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', a: 'ENTER', b: 'SHIFT' }) as Record<string, Phaser.Input.Keyboard.Key>,
    ];
  }

  controls(slot: number): boolean {
    return slot < this.layouts.length;
  }

  /** Tastaturets input for pladsen, eller null hvis tastaturet ikke styrer den. */
  read(slot: number): ControllerInput | null {
    const keys = this.layouts[slot];
    if (!keys) return null;
    let x = (keys.right.isDown ? 1 : 0) - (keys.left.isDown ? 1 : 0);
    let y = (keys.down.isDown ? 1 : 0) - (keys.up.isDown ? 1 : 0);
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y, a: keys.a.isDown, b: keys.b.isDown };
  }
}
