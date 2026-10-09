import Phaser from 'phaser';
import { shade } from '@samigame/shared';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { partyBackdrop } from '../kit/scenery';
import { addSvg, ink, linear, shine, svgDoc } from '../kit/svg';
import { C, N, TEAM_HEX, TEAM_NAMES, W } from '../kit/theme';
import { body, title } from '../kit/ui';
import { Blok } from '../objects/Blok';
import type { Director, TeamsData } from '../flow/Director';

const hatSvg = () =>
  svgDoc(
    300,
    300,
    `<ellipse cx="150" cy="250" rx="140" ry="32" fill="url(#b)" ${ink(9)}/>` +
      `<path d="M70 250 L82 70 Q150 40 218 70 L230 250 Z" fill="url(#h)" ${ink(9)}/>` +
      `<path d="M76 196 Q150 214 224 196 L227 232 Q150 250 73 232 Z" fill="#ff4b4b" ${ink(6)}/>` +
      `<path d="M128 220 l8 -16 8 16 18 2 -13 12 3 18 -16 -9 -16 9 3 -18 -13 -12z" fill="#ffcf3a" ${ink(3)}/>` +
      shine(98, 80, 24, 110, 0.18),
    linear('h', '#5a4a9a', '#1f1650', true) + linear('b', '#4a3a8a', '#1f1650'),
  );

/** Holdhatten: viser 2 mod 2- eller 1 mod 3-holdene med en dramatisk animation. */
export class TeamsScene extends Phaser.Scene {
  private d!: TeamsData;

  constructor() {
    super('teams');
  }

  init(data: TeamsData): void {
    this.d = data;
  }

  async create(): Promise<void> {
    const fx = new Fx(this);
    const { teams, players, def } = this.d;
    const solo = teams.kind === '1v3';
    partyBackdrop(this, solo ? C.tomato : C.grape);
    fx.vignette(0.85);
    audio.music('tense');
    audio.say(solo ? 'oneVsThree' : 'twoVsTwo', true);

    const header = title(this, W / 2, 110, solo ? '1 MOD 3!' : '2 MOD 2!', 130, { color: C.sun });
    fx.popIn(header);
    body(this, W / 2, 210, def.title, 44, { stroke: 7 });

    await addSvg(this, 'teams-hat', hatSvg(), 300, 300);
    if (!this.sys.isActive()) return;

    // Alle står på række, hatten hopper hen over dem.
    const startXs = [W / 2 - 540, W / 2 - 180, W / 2 + 180, W / 2 + 540];
    const groundY = 820;
    const bloks = players.map((p, i) => {
      const b = new Blok(this, startXs[i], groundY, p.avatar, { size: 1.15, tag: { name: p.name, color: p.color }, ring: p.color });
      b.setDepth(groundY);
      return b;
    });

    const hat = this.add.image(W / 2, -200, 'teams-hat').setScale(0.75).setDepth(3000);
    let delay = 300;
    const hops = solo ? [0, 1, 2, 3, ...[teams.teams[0][0]]] : [0, 1, 2, 3, 2, 1];
    for (const idx of hops) {
      const target = bloks[idx];
      this.tweens.add({
        targets: hat,
        x: target.x,
        y: groundY - 360,
        duration: 260,
        delay,
        ease: 'Quad.easeOut',
        onStart: () => audio.sfx('boing', { pitch: 1 + Math.random() * 0.4 }),
      });
      this.tweens.add({ targets: hat, angle: { from: -15, to: 15 }, duration: 260, delay, yoyo: true });
      delay += 330;
    }

    // Afsløring
    this.time.delayedCall(delay + 200, () => {
      audio.sfx('fanfare');
      fx.flash(0xffffff, 160, 0.5);
      this.tweens.add({ targets: hat, y: -300, duration: 400, ease: 'Back.easeIn' });

      const sides = solo
        ? { left: teams.teams[0], right: teams.teams[1] }
        : { left: teams.teams[0], right: teams.teams[1] };
      const place = (slots: number[], centerX: number, teamIdx: number) => {
        slots.forEach((slot, i) => {
          const x = centerX + (i - (slots.length - 1) / 2) * (slots.length > 2 ? 240 : 300);
          const b = bloks[slot];
          this.tweens.add({ targets: b, x, duration: 600, ease: 'Back.easeOut', onComplete: () => b.cheer() });
          b.setRing(solo ? (teamIdx === 0 ? C.sun : C.sky) : TEAM_HEX[teamIdx]);
        });
      };
      const rightX = solo ? W * 0.73 : W * 0.7;
      // Holdfarvet felt bag hver side, så holdene læses med det samme
      const zone = (cx: number, count: number, color: string, delay: number) => {
        const w = count > 2 ? 760 : count === 2 ? 620 : 360;
        const n = Phaser.Display.Color.HexStringToColor(color).color;
        const g = this.add.graphics();
        g.fillStyle(n, 0.16).fillRoundedRect(-w / 2, -250, w, 380, 48);
        g.lineStyle(8, n, 0.85).strokeRoundedRect(-w / 2, -250, w, 380, 48);
        g.lineStyle(3, 0xffffff, 0.25).strokeRoundedRect(-w / 2 + 12, -238, w - 24, 356, 38);
        const c = this.add.container(cx, groundY - 40, [g]).setDepth(-10);
        fx.popIn(c, delay);
        this.tweens.add({ targets: g, alpha: 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: delay + 400 });
      };
      zone(W * 0.27, sides.left.length, solo ? C.sun : TEAM_HEX[0], 0);
      zone(rightX, sides.right.length, solo ? C.sky : TEAM_HEX[1], 120);
      place(sides.left, W * 0.27, 0);
      place(sides.right, rightX, 1);

      const leftName = solo ? `${players[teams.teams[0][0]].name}` : TEAM_NAMES[0];
      const rightName = solo ? 'Trioen' : TEAM_NAMES[1];
      const lcol = solo ? C.sun : TEAM_HEX[0];
      const rcol = solo ? C.sky : TEAM_HEX[1];
      const l = title(this, W * 0.27, 420, leftName, 72, { color: lcol });
      const r = title(this, rightX, 420, rightName, 72, { color: rcol });
      fx.popIn(l, 200);
      fx.popIn(r, 300);
      if (solo) body(this, W * 0.27, 945, 'Alene mod alle! (3 point ved sejr)', 34, { stroke: 7 });

      const vs = title(this, solo ? 860 : W / 2 - 20, 620, 'VS', 150, { color: C.tomato });
      fx.popIn(vs, 500);
      this.tweens.add({ targets: vs, scale: 1.12, duration: 400, yoyo: true, repeat: -1, delay: 900 });
      fx.burst(solo ? 860 : W / 2, 620, { texture: 'kit-spark', color: [N.sun, N.tomato], count: 20, speed: 700 });
      void shade;
    });

    this.time.delayedCall(delay + 3600, () => (this.registry.get('director') as Director).teamsDone());
  }
}
