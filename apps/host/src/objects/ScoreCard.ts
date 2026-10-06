import Phaser from 'phaser';
import { C, N } from '../kit/theme';
import { TEX } from '../kit/textures';
import { body, label, panelKey, panelSvg, title } from '../kit/ui';
import { addSvg } from '../kit/svg';
import type { PlayerView } from '../flow/types';
import { Blok } from './Blok';

const CARD_W = 300;
const CARD_H = 150;

/**
 * Kort med spillerens figur, navn og point. Bruges i runde-, kaos- og resultatscener.
 * Origin = kortets midte. Figuren står oven på kortet.
 */
export class ScoreCard extends Phaser.GameObjects.Container {
  readonly blok: Blok;
  private readonly scoreText: Phaser.GameObjects.Text;
  private crown: Phaser.GameObjects.Image | null = null;
  private shown: number;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly player: PlayerView, score = player.score) {
    super(scene, x, y);
    this.shown = score;
    const key = panelKey(CARD_W, CARD_H, player.color);
    const bg = scene.add.image(0, 6, '__WHITE').setAlpha(0);
    void addSvg(scene, key, panelSvg(CARD_W, CARD_H, player.color), CARD_W + 24, CARD_H + 30).then(() => {
      if (bg.active) bg.setTexture(key).setAlpha(1);
    });
    this.blok = new Blok(scene, 0, -CARD_H / 2 + 10, player.avatar, { size: 0.75 });
    scene.children.remove(this.blok);
    const name = label(scene, 0, -18, player.name, 30, { color: '#ffffff' });
    if (name.width > CARD_W - 30) name.setScale((CARD_W - 30) / name.width);
    this.scoreText = title(scene, 0, 36, String(score), 58, { color: C.sun });
    const tag = player.isBot ? body(scene, CARD_W / 2 - 34, -CARD_H / 2 + 22, 'CPU', 18, { color: C.cream, stroke: 4 }) : null;
    this.add([this.blok, bg, name, this.scoreText, ...(tag ? [tag] : [])]);
    scene.add.existing(this);
  }

  get score(): number {
    return this.shown;
  }

  /** Tæl point op/ned med animation. */
  countTo(target: number, ms = 700): void {
    const from = this.shown;
    if (from === target) return;
    this.shown = target;
    this.scene.tweens.addCounter({
      from,
      to: target,
      duration: ms,
      ease: 'Quad.easeOut',
      onUpdate: (tw) => this.scoreText.setText(String(Math.round(tw.getValue() ?? target))),
    });
    this.scene.tweens.add({ targets: this.scoreText, scale: 1.3, duration: 140, yoyo: true, repeat: 1 });
  }

  setCrown(on: boolean): void {
    if (on && !this.crown) {
      this.crown = this.scene.add.image(0, -CARD_H / 2 - 225, TEX.crown).setScale(0);
      this.add(this.crown);
      this.scene.tweens.add({ targets: this.crown, scale: 0.9, duration: 400, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: this.crown, y: this.crown.y - 10, angle: { from: -8, to: 8 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (!on && this.crown) {
      this.crown.destroy();
      this.crown = null;
    }
  }

  static get width(): number {
    return CARD_W;
  }
}

/** Placér kort på række centreret om x. */
export function layoutRow(count: number, centerX: number, gap = 60): number[] {
  const total = count * CARD_W + (count - 1) * gap;
  return Array.from({ length: count }, (_, i) => centerX - total / 2 + CARD_W / 2 + i * (CARD_W + gap));
}

export { N };
