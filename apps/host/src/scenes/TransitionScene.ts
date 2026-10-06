import Phaser from 'phaser';
import { audio } from '../kit/audio';
import { H, N, W } from '../kit/theme';

const SIZE = 160;
const COLORS = [N.sun, N.bubblegum, N.grape, N.sky, N.mint, N.tangerine];

/**
 * Overgang mellem scener: farvede klodser fejer diagonalt ind over skærmen og ud igen.
 * Kører altid øverst. Bruges af Director.goto().
 */
export class TransitionScene extends Phaser.Scene {
  private tiles: Phaser.GameObjects.Rectangle[] = [];
  private covered = false;
  private busy: Promise<void> = Promise.resolve();

  constructor() {
    super({ key: 'transition', active: true });
  }

  create(): void {
    const cols = Math.ceil(W / SIZE) + 1;
    const rows = Math.ceil(H / SIZE) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = this.add
          .rectangle(c * SIZE + SIZE / 2, r * SIZE + SIZE / 2, SIZE + 2, SIZE + 2, COLORS[(r + c * 2) % COLORS.length])
          .setStrokeStyle(6, N.ink)
          .setScale(0)
          .setAngle(45);
        tile.setData('order', c + r);
        this.tiles.push(tile);
      }
    }
  }

  cover(): Promise<void> {
    this.busy = this.busy.then(() => this.animate(true));
    return this.busy;
  }

  uncover(): Promise<void> {
    this.busy = this.busy.then(() => this.animate(false));
    return this.busy;
  }

  private animate(cover: boolean): Promise<void> {
    if (this.covered === cover || this.tiles.length === 0) {
      this.covered = cover;
      return Promise.resolve();
    }
    this.covered = cover;
    if (cover) audio.sfx('whoosh', { volume: 0.6 });
    const maxOrder = Math.max(...this.tiles.map((t) => t.getData('order') as number));
    return new Promise((resolve) => {
      let remaining = this.tiles.length;
      for (const tile of this.tiles) {
        const order = tile.getData('order') as number;
        // Stop evt. halvfærdige tweens, så en flise aldrig sidder fast midt i en overgang.
        this.tweens.killTweensOf(tile);
        this.tweens.add({
          targets: tile,
          scale: cover ? 1 : 0,
          angle: cover ? 0 : 45,
          delay: (cover ? order : maxOrder - order) * 18,
          duration: 220,
          ease: cover ? 'Back.easeOut' : 'Back.easeIn',
          onComplete: () => {
            if (--remaining === 0) resolve();
          },
        });
      }
    });
  }
}
