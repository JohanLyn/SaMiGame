import Phaser from 'phaser';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { partyBackdrop } from '../kit/scenery';
import { C, H, W } from '../kit/theme';
import { body, title } from '../kit/ui';
import { ScoreCard, layoutRow } from '../objects/ScoreCard';
import type { Director, RoundData } from '../flow/Director';

/** "Runde 3 af 10" med stillingen – mellemspil før ritualet. */
export class RoundScene extends Phaser.Scene {
  private d!: RoundData;

  constructor() {
    super('round');
  }

  init(data: RoundData): void {
    this.d = data;
  }

  create(): void {
    const fx = new Fx(this);
    const { round, totalRounds, players, finale } = this.d;
    partyBackdrop(this, finale ? C.tomato : C.grape);
    fx.vignette(0.8);
    audio.music(finale ? 'finale' : 'hub');

    const big = title(this, W / 2, 300, finale ? 'FINALEN!' : `RUNDE ${round}`, finale ? 220 : 200, { color: finale ? C.sun : C.cream });
    big.setAngle(-4);
    fx.popIn(big);
    this.tweens.add({ targets: big, angle: 4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const sub = body(this, W / 2, 450, finale ? 'Kaos-Tårnet venter – dobbelt op på alt!' : round === totalRounds ? 'Sidste runde før finalen!' : `af ${totalRounds}`, 48, { stroke: 8 });
    fx.popIn(sub, 250);
    audio.sfx(finale ? 'fanfare' : 'powerup');
    audio.say(finale ? 'finale' : round === 1 ? 'start' : 'ritual');

    const best = Math.max(...players.map((p) => p.score));
    const xs = layoutRow(players.length, W / 2);
    players.forEach((p, i) => {
      const card = new ScoreCard(this, xs[i], H - 190, p);
      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, delay: 400 + i * 120, duration: 420, ease: 'Back.easeOut', onStart: () => audio.sfx('pop', { delay: 0 }) });
      if (round > 1 && p.score === best && best > 0) this.time.delayedCall(1100, () => card.setCrown(true));
      if (round > 1 && p.score === best && best > 0) this.time.delayedCall(1100, () => card.blok.cheer());
    });

    this.time.delayedCall(finale ? 4200 : 3400, () => (this.registry.get('director') as Director).roundIntroDone());
  }
}
