import Phaser from 'phaser';
import { shade } from '@samigame/shared';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { partyBackdrop } from '../kit/scenery';
import { addSvg, ink, linear, shine, svgDoc } from '../kit/svg';
import { C, H, N, W } from '../kit/theme';
import { body, title } from '../kit/ui';
import { ScoreCard, layoutRow } from '../objects/ScoreCard';
import type { ChaosData, Director } from '../flow/Director';

const CARD_W = 560;
const CARD_H = 760;

function cardSvg(color: string, back: boolean): string {
  const pattern = back
    ? Array.from({ length: 30 }, (_, i) => {
        const x = 60 + (i % 5) * 110;
        const y = 70 + Math.floor(i / 5) * 120;
        return `<text x="${x}" y="${y}" font-size="64" font-family="Lilita One, sans-serif" fill="#fff" opacity="0.12" text-anchor="middle">?</text>`;
      }).join('')
    : '';
  return svgDoc(
    CARD_W,
    CARD_H,
    `<rect x="10" y="22" width="${CARD_W - 20}" height="${CARD_H - 30}" rx="40" fill="#000" opacity="0.35"/>` +
      `<rect x="10" y="8" width="${CARD_W - 20}" height="${CARD_H - 30}" rx="40" fill="url(#g)" ${ink(10)}/>` +
      `<rect x="40" y="38" width="${CARD_W - 80}" height="${CARD_H - 90}" rx="26" fill="none" stroke="#fff" stroke-width="6" opacity="0.5" stroke-dasharray="${back ? '18 12' : '0'}"/>` +
      pattern +
      shine(60, 30, 200, 16, 0.4),
    linear('g', shade(color, 0.25), shade(color, -0.3)),
  );
}

/** Et kaos-kort vendes: viser effekten, og øjeblikkelige kort ændrer stillingen live. */
export class ChaosScene extends Phaser.Scene {
  private d!: ChaosData;

  constructor() {
    super('chaos');
  }

  init(data: ChaosData): void {
    this.d = data;
  }

  async create(): Promise<void> {
    const fx = new Fx(this);
    const { card, players, before, message } = this.d;
    partyBackdrop(this, card.color);
    fx.vignette(0.9);
    audio.music('silly');
    audio.say('chaos', true);

    const header = title(this, W / 2, 110, 'KAOS-KORT!', 120, { color: C.bubblegum });
    fx.popIn(header);
    this.tweens.add({ targets: header, angle: { from: -3, to: 3 }, duration: 300, yoyo: true, repeat: -1 });

    await Promise.all([
      addSvg(this, 'chaos-back', cardSvg(C.grape, true), CARD_W, CARD_H),
      addSvg(this, `chaos-front-${card.color}`, cardSvg(card.color, false), CARD_W, CARD_H),
    ]);
    if (!this.sys.isActive()) return;

    const cx = W / 2;
    const cy = H / 2 + 40;
    const cardImg = this.add.image(cx, -500, 'chaos-back').setScale(0.75).setAngle(-20);
    audio.sfx('whoosh');
    this.tweens.add({ targets: cardImg, y: cy, angle: 0, duration: 650, ease: 'Back.easeOut' });
    this.tweens.add({ targets: cardImg, scale: 0.8, duration: 400, delay: 650, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
    this.time.delayedCall(600, () => audio.sfx('drumroll'));

    const emoji = title(this, cx, cy - 150, card.emoji, 150).setAlpha(0);
    const name = title(this, cx, cy + 20, card.title, 64, { color: '#ffffff', wrap: CARD_W * 0.75 }).setAlpha(0);
    const desc = body(this, cx, cy + 160, card.description, 34, { wrap: CARD_W * 0.7, stroke: 6 }).setAlpha(0);

    this.time.delayedCall(2100, () => {
      this.tweens.add({
        targets: cardImg,
        scaleX: 0,
        duration: 160,
        ease: 'Quad.easeIn',
        onComplete: () => {
          cardImg.setTexture(`chaos-front-${card.color}`);
          this.tweens.add({ targets: cardImg, scaleX: 0.8, duration: 200, ease: 'Back.easeOut' });
          for (const t of [emoji, name, desc]) {
            t.setAlpha(1);
            fx.popIn(t, 120);
          }
          fx.flash(0xffffff, 200, 0.7);
          fx.shake(0.01, 250);
          fx.burst(cx, cy, { texture: 'kit-star', color: [N.sun, N.bubblegum, N.mint], count: 30, speed: 900, scale: 0.7 });
          audio.sfx('explosion', { volume: 0.5 });
          audio.sfx('powerup', { delay: 0.1 });
        },
      });
    });

    let wait = 6200;
    if (message) {
      wait = 7800;
      const xs = layoutRow(players.length, W / 2, 40);
      const cards = players.map((p, i) => {
        const c = new ScoreCard(this, xs[i], H + 200, p, before[i]).setScale(0.8);
        this.tweens.add({ targets: c, y: H - 120, delay: 3000 + i * 100, duration: 500, ease: 'Back.easeOut' });
        return c;
      });
      this.time.delayedCall(3200, () => {
        this.tweens.add({ targets: cardImg, x: cx - 520, scale: 0.6, duration: 500, ease: 'Cubic.easeInOut' });
        for (const t of [emoji, name, desc]) this.tweens.add({ targets: t, x: t.x - 520, scale: 0.75, y: (t.y - cy) * 0.75 + cy - 60, duration: 500 });
        const msg = title(this, cx + 330, H / 2 - 40, message, 60, { color: C.sun, wrap: 900 });
        fx.popIn(msg, 400);
      });
      this.time.delayedCall(4200, () => {
        cards.forEach((c, i) => {
          if (c.score !== players[i].score) {
            c.countTo(players[i].score);
            players[i].score > c.score ? c.blok.cheer() : c.blok.sad();
            fx.floatText(c.x, c.y - 260, `${players[i].score - before[i] > 0 ? '+' : ''}${players[i].score - before[i]}`, players[i].score > before[i] ? C.mint : C.tomato);
          }
        });
        audio.sfx('coin');
      });
    }
    this.time.delayedCall(wait, () => (this.registry.get('director') as Director).chaosDone());
  }
}
