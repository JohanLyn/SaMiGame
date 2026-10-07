import Phaser from 'phaser';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { partyBackdrop } from '../kit/scenery';
import { addSvg } from '../kit/svg';
import { C, H, N, W } from '../kit/theme';
import { badgeSvg, body, label, title } from '../kit/ui';
import { net } from '../net';
import { ScoreCard, layoutRow } from '../objects/ScoreCard';
import type { Director, ResultsData } from '../flow/Director';

const PLACE_COLORS = [C.sun, '#d9dde8', '#e09a5a', '#8a93a8'];

/** Resultat: placeringer, point flyver ind på stillingen, og den førende får kronen. */
export class ResultsScene extends Phaser.Scene {
  private d!: ResultsData;

  constructor() {
    super('results');
  }

  init(data: ResultsData): void {
    this.d = data;
  }

  async create(): Promise<void> {
    const fx = new Fx(this);
    const { def, players, result, points, before, finale } = this.d;
    partyBackdrop(this, def.color);
    fx.vignette(0.85);
    audio.music('results');

    const header = title(this, W / 2, 100, finale ? 'FINALE-RESULTAT' : def.title, 96, { color: C.cream });
    fx.popIn(header);

    await Promise.all(PLACE_COLORS.map((c, i) => addSvg(this, `place-${i}`, badgeSvg(c), 96, 96)));
    if (!this.sys.isActive()) return;

    // Placering pr. plads
    const place: number[] = Array(players.length).fill(0);
    let p = 0;
    for (const group of result.ranking) {
      for (const slot of group) place[slot] = p;
      p += group.length;
    }

    const xs = layoutRow(players.length, W / 2);
    const cards = players.map((pl, i) => {
      const card = new ScoreCard(this, xs[i], H - 230, pl, before[i]);
      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, delay: 200 + i * 100, duration: 420, ease: 'Back.easeOut' });
      return card;
    });

    // Placeringsbadges og point
    players.forEach((pl, i) => {
      const x = xs[i];
      const badge = this.add.image(x, 260, `place-${Math.min(3, place[i])}`).setScale(1.3);
      const num = title(this, x, 262, String(place[i] + 1), 64, { color: C.ink, stroke: 0 }).setShadow(0, 0, '#000', 0);
      fx.popIn(badge, 700 + place[i] * 250);
      fx.popIn(num, 700 + place[i] * 250);
      const pts = points[i];
      const gain = title(this, x, 520, pts > 0 ? `+${pts}` : '0', 88, { color: pts > 0 ? C.mint : '#9aa3c7' }).setScale(0);
      this.tweens.add({ targets: gain, scale: 1, delay: 1300 + i * 120, duration: 380, ease: 'Back.easeOut', onStart: () => pts > 0 && audio.sfx('coin', { pitch: 1 + i * 0.1 }) });
      this.tweens.add({
        targets: gain,
        y: H - 200,
        scale: 0.4,
        alpha: 0,
        delay: 2600 + i * 120,
        duration: 500,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          cards[i].countTo(before[i] + pts);
          if (pts > 0) fx.burst(x, H - 200, { texture: 'kit-coin', count: 8, speed: 400, scale: 0.5 });
        },
      });
      this.time.delayedCall(900, () => {
        if (place[i] === 0) cards[i].blok.cheer();
        else if (place[i] === players.length - 1 && result.ranking.length > 1) cards[i].blok.sad();
      });
      if (!pl.isBot) {
        const total = before[i] + pts;
        const msg = place[i] === 0 ? 'Du vandt! 🎉' : pts > 0 ? 'Flot klaret!' : 'Næste gang! 💪';
        net.setLayout(pl.slot, { kind: 'result', place: place[i] + 1, points: pts, total, message: msg, accent: pl.color });
      }
    });

    const winners = result.ranking[0] ?? [];
    this.time.delayedCall(900, () => {
      if (winners.length < players.length) {
        audio.sfx('win');
        audio.say('win');
        const names = winners.map((s) => players[s].name).join(' & ');
        label(this, W / 2, 390, `${names} vinder!`, 64, { color: C.sun });
        fx.burst(xs[winners[0]], 260, { texture: 'kit-star', color: [N.sun, 0xffffff], count: 20, speed: 600 });
      } else {
        body(this, W / 2, 390, 'Uafgjort!', 60, { stroke: 8 });
      }
    });

    // Ny førende → krone
    this.time.delayedCall(3500, () => {
      const totals = players.map((_, i) => before[i] + points[i]);
      const best = Math.max(...totals);
      cards.forEach((c, i) => c.setCrown(best > 0 && totals[i] === best));
    });

    this.time.delayedCall(6200, () => (this.registry.get('director') as Director).resultsDone());
  }
}
