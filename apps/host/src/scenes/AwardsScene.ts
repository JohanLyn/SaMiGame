import Phaser from 'phaser';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { partyBackdrop } from '../kit/scenery';
import { C, H, N, W } from '../kit/theme';
import { body, label, panel, title } from '../kit/ui';
import { net } from '../net';
import { Blok } from '../objects/Blok';
import { BONUS_POINTS } from '../game/awards';
import type { Director } from '../flow/Director';
import type { PlayerView } from '../flow/types';

const PODIUM = [
  { x: W / 2, h: 330, color: C.sun },
  { x: W / 2 - 420, h: 230, color: '#d9dde8' },
  { x: W / 2 + 420, h: 160, color: '#e09a5a' },
  { x: W / 2 + 800, h: 70, color: '#8a93a8' },
];

/** Bonuspriser (+3 hver) og podiet med den samlede vinder. */
export class AwardsScene extends Phaser.Scene {
  private fx!: Fx;

  constructor() {
    super('awards');
  }

  private get director(): Director {
    return this.registry.get('director') as Director;
  }

  async create(): Promise<void> {
    this.fx = new Fx(this);
    partyBackdrop(this, C.sun);
    this.fx.vignette(0.8);
    audio.music('finale');
    audio.say('awards', true);
    this.director.waitLayouts('Prisoverrækkelse!', 'Kig på TV’et 🏆', '🏆');

    const header = title(this, W / 2, 110, 'PRISOVERRÆKKELSE', 110, { color: C.sun });
    this.fx.popIn(header);

    const state = this.director.state;
    const awards = state ? state.grantAwards(3) : [];
    const players = this.director.players();

    // Priserne én ad gangen
    for (const award of awards) {
      await this.wait(500);
      if (!this.sys.isActive()) return;
      const card = await panel(this, W / 2, 520, 1100, 520, C.deep, { radius: 50 });
      const emoji = title(this, W / 2, 360, award.award.emoji, 140);
      const t = title(this, W / 2, 490, award.award.title, 84, { color: C.sun });
      const d = body(this, W / 2, 570, award.award.description, 38);
      const names = label(this, W / 2, 680, `${award.slots.map((s) => players[s].name).join(' & ')}  +${BONUS_POINTS}`, 60, { color: C.mint });
      const group = [card, emoji, t, d, names];
      group.forEach((o, i) => this.fx.popIn(o, i * 120));
      audio.sfx('drumroll');
      this.time.delayedCall(900, () => {
        audio.sfx('fanfare');
        this.fx.stars(W / 2, 680, N.sun, 16);
      });
      await this.wait(3000);
      group.forEach((o) => this.tweens.add({ targets: o, alpha: 0, scale: 0.8, duration: 250, onComplete: () => o.destroy() }));
      await this.wait(300);
    }
    if (!this.sys.isActive()) return;
    this.podium(this.director.players());
  }

  private podium(players: PlayerView[]): void {
    const order = [...players].sort((a, b) => b.score - a.score);
    const place = (p: PlayerView) => order.filter((o) => o.score > p.score).length;
    const ground = H - 80;
    order.forEach((p, i) => {
      const spec = PODIUM[Math.min(i, 3)];
      const pl = place(p);
      const block = this.add.rectangle(spec.x, ground, 300, spec.h, Phaser.Display.Color.HexStringToColor(spec.color).color).setOrigin(0.5, 1).setStrokeStyle(8, N.ink);
      block.scaleY = 0;
      this.tweens.add({ targets: block, scaleY: 1, delay: (3 - i) * 400, duration: 600, ease: 'Back.easeOut' });
      title(this, spec.x, ground - spec.h / 2, String(pl + 1), 90, { color: C.ink, stroke: 0 }).setShadow(0, 0, '#000', 0).setAlpha(0.6);
      const blok = new Blok(this, spec.x, ground - spec.h, p.avatar, { size: i === 0 ? 1.5 : 1.2, tag: { name: `${p.name}  ${p.score}`, color: p.color } });
      blok.setAlpha(0);
      this.tweens.add({ targets: blok, alpha: 1, delay: (3 - i) * 400 + 500, duration: 300 });
      this.time.delayedCall(2200, () => (pl === 0 ? blok.dance() : pl === order.length - 1 ? blok.sad() : blok.cheer()));
      if (!p.isBot) {
        net.setLayout(p.slot, { kind: 'result', place: pl + 1, points: 0, total: p.score, message: pl === 0 ? 'DU VANDT HELE SPILLET! 👑' : 'Tak for spillet! 🎉', accent: p.color });
      }
    });
    this.time.delayedCall(2000, () => {
      const winners = order.filter((p) => place(p) === 0);
      const w = title(this, W / 2, 250, `${winners.map((p) => p.name).join(' & ')} VINDER!`, 110, { color: C.sun });
      this.fx.popIn(w);
      this.fx.confetti(6000);
      this.fx.flash(0xffffff, 300, 0.6);
      audio.sfx('win');
      audio.sfx('cheer');
      audio.say('win', true);
    });
    body(this, W / 2, H - 30, 'Tryk ENTER for at spille igen', 30, { stroke: 6 }).setAlpha(0.8);
    const again = () => this.director.awardsDone();
    this.input.keyboard?.once('keydown-ENTER', again);
    this.time.delayedCall(30000, again);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
