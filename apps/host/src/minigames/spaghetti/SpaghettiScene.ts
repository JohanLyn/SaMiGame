import Phaser from 'phaser';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, TEAM_HEX, TEAM_NAMES, W } from '../../kit/theme';
import { body, label, nameTag, panelKey, panelSvg, title } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import type { MusicTheme } from '../../kit/audio';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  GEO,
  backdropSvg,
  bubbleSvg,
  bulbSvg,
  flameSvg,
  garlicSvg,
  meatballSvg,
  noodleSvg,
  noteSvg,
  panSvg,
  pennantSvg,
  potBackSvg,
  potFrontSvg,
  pupilSvg,
  splatSvg,
  steamSvg,
  sweatSvg,
  tableSvg,
  tomatoSvg,
} from './art';

/** Sekunder pr. slag (100 BPM). */
const BEAT = 0.6;
/** Hvor tæt på slaget et tryk skal være for at tælle "i takt". */
const WINDOW = 0.13;
/** Hvor langt kødbollen skal trækkes for at vinde. */
const WIN_SHIFT = 200;
/** Fart-tilskud pr. tryk, pr. tryk i takt, og når begge på holdet rammer samme slag. */
const TAP_IMP = 9;
const BEAT_IMP = 22;
const SYNC_IMP = 34;
const FRICTION = 2.4;
const HAND_Y = GEO.floor - 84;
/** Ustabilitet: jo længere rebet er trukket, jo glattere bliver det for taberne (stiger med tiden). */
const SLIP = 1.0;
const PANEL_W = 470;
const PANEL_H = 150;

interface Puller {
  p: PlayerView;
  blok: Blok;
  side: -1 | 1;
  front: boolean;
  baseX: number;
  rate: number;
  lastBeat: number;
  /** Rest-skub til "gå"-animation. */
  pull: number;
  tag: Phaser.GameObjects.Container;
  sweat: number;
}

interface TeamState {
  idx: number;
  side: -1 | 1;
  pullers: Puller[];
  rate: number;
  combo: number;
  syncBeat: number;
  hitBeat: number;
  bar: Phaser.GameObjects.Graphics;
  comboText: Phaser.GameObjects.Text;
  syncText: Phaser.GameObjects.Text;
  panelX: number;
}

interface BotBrain {
  rate: number;
  skill: number;
  acc: number;
  beatTry: number;
  phase: number;
}

/**
 * SPAGHETTI-TOVTRÆKNING (2 mod 2).
 * To hold hiver i hver sin ende af én kæmpe spaghetti over en gryde boblende tomatsovs.
 * Hamre = træk. Tryk i takt med tomat-metronomen = ekstra kraft; begge i takt på samme slag = SYNK-bonus.
 * Kødbollen midt på spaghettien er markøren: trækkes den over sit holds streg, ryger modstanderne i sovsen.
 */
export class SpaghettiScene extends MinigameScene {
  protected duration = 30;
  protected music: MusicTheme = 'silly';

  private teamsState: TeamState[] = [];
  private shift = 0;
  private vel = 0;
  private clock = 0;
  private lastBeatIdx = -1;
  private ending = false;
  private winner: number | null = null;
  private bots = new Map<number, BotBrain>();

  private rope!: Phaser.GameObjects.Rope;
  private ropePts: Phaser.Math.Vector2[] = [];
  private meatball!: Phaser.GameObjects.Image;
  private tomato!: Phaser.GameObjects.Image;
  private beatRing!: Phaser.GameObjects.Graphics;
  private pupils: Phaser.GameObjects.Image[] = [];
  private bulbs: Phaser.GameObjects.Image[] = [];
  private bubbleTimer = 0;
  private squeakTimer = 0;
  private warned = [false, false];
  private slipShown = false;
  private tension = 0;

  constructor() {
    super('spaghetti');
  }

  preload(): void {
    loadSvg(this, 'spag-bg', backdropSvg(), W, H);
    loadSvg(this, 'spag-table', tableSvg(), 760, 360);
    loadSvg(this, 'spag-potback', potBackSvg(), 640, 120);
    loadSvg(this, 'spag-potfront', potFrontSvg(), 760, 330);
    loadSvg(this, 'spag-pupil', pupilSvg(), 40, 40);
    loadSvg(this, 'spag-flame', flameSvg(), 120, 180);
    loadSvg(this, 'spag-noodle', noodleSvg(), 128, 48);
    loadSvg(this, 'spag-meatball', meatballSvg(), 160, 160);
    loadSvg(this, 'spag-tomato', tomatoSvg(), 240, 240);
    loadSvg(this, 'spag-note', noteSvg(), 64, 80);
    loadSvg(this, 'spag-bubble', bubbleSvg(), 80, 80);
    loadSvg(this, 'spag-steam', steamSvg(), 100, 100);
    loadSvg(this, 'spag-pan', panSvg(), 150, 300);
    loadSvg(this, 'spag-garlic', garlicSvg(), 100, 300);
    loadSvg(this, 'spag-bulb', bulbSvg(), 60, 80);
    loadSvg(this, 'spag-sweat', sweatSvg(), 36, 48);
    loadSvg(this, 'spag-splat', splatSvg(), 130, 130);
    TEAM_HEX.forEach((hex, i) => {
      loadSvg(this, `spag-pennant-${i}`, pennantSvg(hex), 200, 150);
      loadSvg(this, panelKey(PANEL_W, PANEL_H, hex), panelSvg(PANEL_W, PANEL_H, '#2a1f7a'), PANEL_W + 24, PANEL_H + 30);
    });
  }

  protected setup(): void {
    this.teamsState = [];
    this.shift = 0;
    this.vel = 0;
    this.clock = 0;
    this.lastBeatIdx = -1;
    this.ending = false;
    this.winner = null;
    this.warned = [false, false];
    this.slipShown = false;
    this.bots.clear();
    this.pupils = [];
    this.bulbs = [];

    this.add.image(W / 2, H / 2, 'spag-bg').setDepth(-10000);
    this.buildDecor();

    // Gryde, komfur-flammer, damp
    this.add.image(GEO.potX, GEO.potRim, 'spag-potback').setDepth(100);
    const front = this.add.image(GEO.potX, GEO.potRim - 30, 'spag-potfront').setOrigin(0.5, 0).setDepth(200);
    for (const dx of [-55, 55]) {
      const pupil = this.add.image(GEO.potX + dx, GEO.potRim - 30 + 184, 'spag-pupil').setDepth(201).setScale(1.1);
      this.pupils.push(pupil);
    }
    this.tweens.add({ targets: front, scaleY: { from: 1, to: 1.015 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (let i = 0; i < 7; i++) {
      const x = GEO.potX - 270 + i * 90;
      const flame = this.add.image(x, H + 30, 'spag-flame').setOrigin(0.5, 1).setDepth(700).setScale(0.7 + (i % 2) * 0.15);
      this.tweens.add({ targets: flame, scaleY: { from: 0.6, to: 0.95 }, scaleX: { from: 0.8, to: 0.65 }, duration: 150 + i * 23, yoyo: true, repeat: -1 });
    }
    const steam = this.add.particles(0, 0, 'spag-steam', {
      x: { min: GEO.potX - 240, max: GEO.potX + 240 },
      y: { min: GEO.potRim - 10, max: GEO.potRim + 20 },
      speedY: { min: -140, max: -70 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.5, end: 1.8 },
      alpha: { start: 0.35, end: 0 },
      lifespan: 2200,
      frequency: 320,
    });
    steam.setDepth(560);

    // Borde
    this.add.image(GEO.edgeL - 320, GEO.floor + 6, 'spag-table').setOrigin(0.5, 40 / 360).setDepth(300);
    this.add.image(GEO.edgeR + 320, GEO.floor + 6, 'spag-table').setOrigin(0.5, 40 / 360).setFlipX(true).setDepth(300);

    // Mål-streger (kødbollen skal over sit holds streg)
    for (const t of [0, 1]) {
      const side = t === 0 ? -1 : 1;
      const x = GEO.potX + side * WIN_SHIFT;
      const g = this.add.graphics().setDepth(540);
      const col = Phaser.Display.Color.HexStringToColor(TEAM_HEX[t]).color;
      for (let y = 520; y < GEO.potRim - 20; y += 34) {
        g.fillStyle(N.ink, 1).fillRoundedRect(x - 7, y - 2, 14, 24, 6);
        g.fillStyle(col, 1).fillRoundedRect(x - 4, y + 1, 8, 18, 4);
      }
      const flag = this.add.image(x, 500, `spag-pennant-${t}`).setScale(0.55).setDepth(545);
      this.tweens.add({ targets: flag, angle: { from: -5, to: 5 }, duration: 900 + t * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      label(this, x, 446, 'MÅL', 30, { color: TEAM_HEX[t] }).setDepth(546);
    }

    // Hold
    for (const t of [0, 1]) this.buildTeam(t);

    // Spaghetti (Rope) + kødbolle
    const n = 64;
    this.ropePts = Array.from({ length: n }, (_, i) => new Phaser.Math.Vector2(i * 20, HAND_Y));
    this.rope = this.add.rope(0, 0, 'spag-noodle', undefined, this.ropePts, true).setDepth(600);
    this.meatball = this.add.image(GEO.potX, HAND_Y - 40, 'spag-meatball').setScale(0.75).setDepth(650);
    this.updateRope(0);

    // Tomat-metronom
    this.beatRing = this.add.graphics().setDepth(690);
    this.tomato = this.add.image(W / 2, 300, 'spag-tomato').setScale(0.8).setDepth(700);
    body(this, W / 2, 404, 'TRYK I TAKT!', 26, { color: C.sun, stroke: 6 }).setDepth(700);
  }

  private buildDecor(): void {
    // Lyskæde i en bue øverst
    const g = this.add.graphics().setDepth(-8000);
    g.lineStyle(5, N.ink, 1);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40) * W;
      const y = 40 + Math.sin((i / 40) * Math.PI * 3) ** 2 * 60;
      pts.push(new Phaser.Math.Vector2(x, y));
    }
    g.strokePoints(pts);
    for (let i = 1; i < 40; i += 2) {
      const pt = pts[i];
      const b = this.add.image(pt.x, pt.y + 30, 'spag-bulb').setScale(0.7).setDepth(-7990);
      this.bulbs.push(b);
      this.tweens.add({ targets: b, alpha: { from: 1, to: 0.65 }, duration: 600 + (i % 5) * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Hængende kobberpander og hvidløg
    const hang = (key: string, x: number, y: number, s: number, d: number) => {
      const img = this.add.image(x, y, key).setOrigin(0.5, 0).setScale(s).setDepth(-7900);
      this.tweens.add({ targets: img, angle: { from: -4, to: 4 }, duration: d, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    };
    hang('spag-garlic', 575, -20, 0.8, 2600);
    hang('spag-pan', 650, -40, 0.75, 2400);
    hang('spag-pan', 1270, -40, 0.75, 2300);
    hang('spag-garlic', 1345, -20, 0.8, 2500);
  }

  private buildTeam(t: number): void {
    const side: -1 | 1 = t === 0 ? -1 : 1;
    const members = this.team(t);
    const frontX = side < 0 ? GEO.frontL : GEO.frontR;
    const pullers: Puller[] = members.map((p, i) => {
      const front = i === 0;
      const baseX = frontX + (front ? 0 : side * GEO.gap);
      const blok = this.spawnBlok(p, baseX, GEO.floor, { size: 0.82 });
      blok.setFacing(side < 0 ? 1 : -1).setDepth(400 + (front ? 10 : 0)).hideTag();
      const tagY = front ? -228 : -270;
      const tag = nameTag(this, baseX, GEO.floor + tagY, p.name, p.color, 24).setDepth(900).setData('dy', tagY);
      if (p.isBot) {
        this.bots.set(p.slot, { rate: 5.2 + this.rng() * 2.6, skill: 0.35 + this.rng() * 0.45, acc: this.rng(), beatTry: -1, phase: this.rng() * 6 });
      }
      return { p, blok, side, front, baseX, rate: 0, lastBeat: -10, pull: 0, sweat: 0, tag };
    });

    // Panel
    const px = side < 0 ? 290 : W - 290;
    const py = 128;
    this.add.image(px, py, panelKey(PANEL_W, PANEL_H, TEAM_HEX[t])).setDepth(7000);
    const accent = this.add.graphics().setDepth(7001);
    accent.fillStyle(Phaser.Display.Color.HexStringToColor(TEAM_HEX[t]).color, 1).fillRoundedRect(px - PANEL_W / 2 + 10, py - PANEL_H / 2 + 4, PANEL_W - 20, 44, 18);
    label(this, px, py - PANEL_H / 2 + 26, TEAM_NAMES[t].toUpperCase(), 34, { color: C.cream }).setDepth(7002);
    body(this, px, py - 6, members.map((m) => m.name).join(' + '), 24, { color: C.cream, stroke: 5 }).setDepth(7002);
    const bar = this.add.graphics().setDepth(7002);
    const comboText = label(this, px + PANEL_W / 2 - 80, py + 38, '', 28, { color: C.sun }).setDepth(7003);
    body(this, px - PANEL_W / 2 + 54, py + 38, 'KRAFT', 20, { color: C.cream, stroke: 5 }).setDepth(7002);
    const syncText = title(this, (side < 0 ? GEO.frontL : GEO.frontR) + side * GEO.gap * 0.5, GEO.floor - 320, 'SYNK!', 64, { color: TEAM_HEX[t] }).setDepth(905).setAlpha(0);
    this.teamsState.push({ idx: t, side, pullers, rate: 0, combo: 0, syncBeat: -1, hitBeat: -1, bar, comboText, syncText, panelX: px });
  }

  protected onStart(): void {
    this.say('spaghettiStart');
    this.sfx('squeak', { pitch: 0.6 });
  }

  protected play(dt: number): void {
    this.clock += dt;
    const progress = this.duration ? 1 - this.timeLeft / this.duration : 0;
    const beatPos = this.clock / BEAT;
    const beatIdx = Math.floor(beatPos);
    if (beatIdx !== this.lastBeatIdx) this.onBeat(beatIdx);
    const nearest = Math.round(beatPos);
    const err = Math.abs(beatPos - nearest) * BEAT;

    // Glattere og glattere spaghetti: kraften stiger med tiden, så nogen ender i sovsen.
    const mult = 1 + progress * 1.6;
    if (progress > 0.45 && !this.slipShown && !this.ending) {
      this.slipShown = true;
      this.say('slippery');
      const t = title(this, W / 2, 560, 'SPAGHETTIEN BLIVER GLAT!', 58, { color: C.sun }).setDepth(7500).setScale(0).setAngle(-4);
      this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, y: 520, delay: 1600, duration: 400, onComplete: () => t.destroy() });
      this.sfx('boing', { pitch: 0.8 });
    }
    let force = 0;
    let totalRate = 0;
    for (const team of this.teamsState) {
      let teamTaps = 0;
      for (const pl of team.pullers) {
        const n = this.ending ? 0 : this.taps(pl.p.slot);
        pl.rate += (n / Math.max(dt, 0.001) - pl.rate) * Math.min(1, dt * 4);
        if (n <= 0) continue;
        teamTaps += n;
        let imp = n * TAP_IMP;
        pl.pull = 0.25;
        if (err < WINDOW && pl.lastBeat !== nearest) {
          pl.lastBeat = nearest;
          imp += BEAT_IMP;
          this.rhythmHit(team, pl, nearest);
          const mate = team.pullers.find((o) => o !== pl);
          if (mate && mate.lastBeat === nearest && team.syncBeat !== nearest) {
            team.syncBeat = nearest;
            imp += SYNC_IMP;
            this.syncHit(team);
          }
        }
        force += team.side * imp; // venstre hold (side -1) trækker mod minus
      }
      team.rate += (teamTaps / Math.max(dt, 0.001) - team.rate) * Math.min(1, dt * 3);
      totalRate += team.rate;
    }
    this.vel += force * mult;
    this.vel += this.shift * SLIP * progress * progress * dt;
    this.vel *= Math.exp(-FRICTION * dt);
    if (!this.ending) this.shift += this.vel * dt;
    this.tension += (Math.min(1, totalRate / 28) - this.tension) * Math.min(1, dt * 3);

    this.updatePullers(dt);
    this.updateRope(dt);
    this.updateHud(err);
    this.ambient(dt, progress);

    if (!this.ending && Math.abs(this.shift) >= WIN_SHIFT) {
      // shift < 0 → rebet er trukket mod venstre → venstre hold (Orange) vinder.
      const winner = this.shift < 0 ? 0 : 1;
      this.endWith(winner);
    }
  }

  protected timeUp(): number[][] {
    if (!this.ending) {
      const winner = Math.abs(this.shift) < 6 ? null : this.shift < 0 ? 0 : 1;
      this.endWith(winner, true);
    }
    return this.rankByTeam(this.winner);
  }

  // ---------------------------------------------------------------------------

  private onBeat(idx: number): void {
    // Kombo nulstilles hvis et helt slag gik uden træf
    for (const team of this.teamsState) {
      if (team.hitBeat < idx - 1 && team.combo > 0) {
        team.combo = 0;
        team.comboText.setText('');
      }
    }
    this.lastBeatIdx = idx;
    if (this.ending) return;
    this.sfx('stomp', { volume: 0.35, pitch: idx % 4 === 0 ? 0.9 : 1.2 });
    this.tomato.setScale(0.98, 0.66);
    this.tweens.add({ targets: this.tomato, scaleX: 0.8, scaleY: 0.8, duration: 260, ease: 'Back.easeOut' });
    for (const b of this.bulbs) b.setScale(0.8);
    this.tweens.add({ targets: this.bulbs, scale: 0.7, duration: 220 });
  }

  private rhythmHit(team: TeamState, pl: Puller, beat: number): void {
    if (team.hitBeat !== beat) {
      team.hitBeat = beat;
      team.combo++;
      team.comboText.setText(`I TAKT ×${team.combo}`).setScale(1.3);
      this.tweens.add({ targets: team.comboText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    }
    this.stat(pl.p.slot, 'hits');
    const x = pl.blok.x;
    const y = pl.blok.y - 200;
    const note = this.add.image(x, y, 'spag-note').setTint(pl.p.colorNum).setScale(0.2).setDepth(800);
    this.tweens.add({ targets: note, scale: 0.75, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: note,
      y: y - 120,
      x: x + (this.rng() - 0.5) * 80,
      angle: (this.rng() - 0.5) * 50,
      alpha: 0,
      delay: 150,
      duration: 700,
      onComplete: () => note.destroy(),
    });
    pl.blok.squash(1.15, 0.88);
    this.sfx('select', { volume: 0.35, pitch: team.idx === 0 ? 1 : 1.25, pan: this.panFor(x) });
  }

  private syncHit(team: TeamState): void {
    const x = team.pullers.reduce((s, p) => s + p.blok.x, 0) / team.pullers.length;
    const st = team.syncText;
    this.tweens.killTweensOf(st);
    st.setPosition(x, GEO.floor - 320).setAlpha(1).setScale(0.4).setAngle((this.rng() - 0.5) * 16);
    this.tweens.add({ targets: st, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: st, alpha: 0, y: st.y - 40, delay: 380, duration: 300 });
    this.fx.burst(x, GEO.floor - 120, { texture: TEX.star, color: [N.sun, Phaser.Display.Color.HexStringToColor(TEAM_HEX[team.idx]).color], count: 10, speed: 420, scale: 0.5, gravity: 500 });
    this.sfx('coin', { volume: 0.5, pan: this.panFor(x) });
    this.cameras.main.shake(80, 0.002);
    if (team.combo >= 6 && team.combo % 6 === 0) this.say('bellissimo');
  }

  private updatePullers(dt: number): void {
    const t = this.elapsed;
    for (const team of this.teamsState) {
      // Hvor tæt er holdet på at ryge i (positiv = taber)
      const danger = this.danger(team);
      for (const pl of team.pullers) {
        if (this.ending) {
          if (!pl.blok.getData('falling')) pl.tag.setPosition(pl.blok.x, pl.blok.y + (pl.tag.getData('dy') as number));
          continue;
        }
        pl.blok.x = pl.baseX + this.shift;
        pl.pull = Math.max(0, pl.pull - dt);
        const pulling = pl.pull > 0 || pl.rate > 1.5;
        pl.blok.walk(pulling ? -team.side * 0.7 : 0, 0, dt * 1000 * (1 + Math.min(pl.rate, 10) * 0.15));
        pl.blok.setFacing(team.side < 0 ? 1 : -1);
        let lean = 6 + Math.min(pl.rate, 10) * 1.6;
        if (pl.front && danger > 0.6) {
          // Vakler på kanten!
          lean = -10 + Math.sin(t * 22) * 14 * danger;
          pl.sweat -= dt;
          if (pl.sweat <= 0) {
            pl.sweat = 0.25;
            const d = this.add.image(pl.blok.x + (this.rng() - 0.5) * 60, pl.blok.y - 170, 'spag-sweat').setScale(0.7).setDepth(820);
            this.tweens.add({ targets: d, y: d.y + 70, x: d.x - team.side * 40, alpha: 0, duration: 500, onComplete: () => d.destroy() });
          }
        }
        pl.blok.angle = team.side * lean;
        pl.tag.setPosition(pl.blok.x, GEO.floor + (pl.tag.getData('dy') as number) + Math.sin(this.elapsed * 3 + pl.p.slot) * 3);
        if (pulling && this.rng() < dt * 3) this.fx.dust(pl.blok.x - team.side * 20, GEO.floor, 3);
      }
      if (danger > 0.75 && !this.warned[team.idx] && !this.ending) {
        this.warned[team.idx] = true;
        this.say('hotSauce');
        this.sfx('scream', { volume: 0.6, pan: this.panFor(team.pullers[0].blok.x) });
        this.stat(team.pullers[0].p.slot, 'screams');
      }
      if (danger < 0.3) this.warned[team.idx] = false;
    }
  }

  /** 0..1: hvor tæt holdet er på at blive trukket i sovsen. */
  private danger(team: TeamState): number {
    return Phaser.Math.Clamp((-team.side * this.shift) / WIN_SHIFT, 0, 1);
  }

  private handPos(team: TeamState, front: boolean): { x: number; y: number } {
    const pl = team.pullers.find((p) => p.front === front) ?? team.pullers[0];
    if (pl.blok.getData('falling')) return { x: pl.blok.x, y: pl.blok.y - 60 };
    return { x: pl.blok.x + team.side * -18, y: HAND_Y + Math.sin(this.elapsed * 9 + pl.p.slot) * 2 };
  }

  private updateRope(_dt: number): void {
    const left = this.teamsState[0];
    const right = this.teamsState[1];
    if (!left || !right) return;
    const lb = this.handPos(left, false);
    const lf = this.handPos(left, true);
    const rf = this.handPos(right, true);
    const rb = this.handPos(right, false);
    const tailL = { x: lb.x - 120, y: GEO.floor - 6 };
    const tailR = { x: rb.x + 120, y: GEO.floor - 6 };
    const anchors = [tailL, lb, lf, rf, rb, tailR];
    const n = this.ropePts.length;
    // Fordel punkterne langs stykkerne efter længde
    const lens = anchors.slice(1).map((a, i) => Math.hypot(a.x - anchors[i].x, a.y - anchors[i].y));
    const total = lens.reduce((s, l) => s + l, 0);
    const t = this.elapsed;
    const wobble = 4 + this.tension * 10;
    for (let i = 0; i < n; i++) {
      let d = (i / (n - 1)) * total;
      let seg = 0;
      while (seg < lens.length - 1 && d > lens[seg]) {
        d -= lens[seg];
        seg++;
      }
      const a = anchors[seg];
      const b = anchors[seg + 1];
      const u = lens[seg] > 0 ? Math.min(1, d / lens[seg]) : 0;
      let x = a.x + (b.x - a.x) * u;
      let y = a.y + (b.y - a.y) * u;
      if (seg === 2) {
        // Midterstykket hænger og dirrer
        const sag = 34 - this.tension * 18;
        y += Math.sin(u * Math.PI) * sag + Math.sin(u * Math.PI * 4 + t * 14) * wobble * Math.sin(u * Math.PI);
      } else if (seg === 0 || seg === 4) {
        // Halerne hænger slapt ned på bordet
        const k = seg === 0 ? u : 1 - u;
        y += Math.sin(k * Math.PI) * -10;
        x += Math.sin(t * 3 + i) * 1.5;
      } else {
        y += Math.sin(u * Math.PI) * 8;
      }
      this.ropePts[i].set(x, y);
    }
    this.rope.setDirty();

    // Kødbollen ruller med midt på spaghettien
    const mx = GEO.potX + this.shift;
    const mu = Phaser.Math.Clamp((mx - lf.x) / Math.max(1, rf.x - lf.x), 0, 1);
    const sag = 34 - this.tension * 18;
    const my = lf.y + (rf.y - lf.y) * mu + Math.sin(mu * Math.PI) * sag + Math.sin(mu * Math.PI * 4 + t * 14) * wobble * Math.sin(mu * Math.PI);
    this.meatball.setPosition(mx, my - 34);
    this.meatball.rotation = this.shift / 60;
  }

  private updateHud(err: number): void {
    // Tilnærmelses-ring rundt om tomaten (rammer tomaten på slaget)
    const phase = (this.clock / BEAT) % 1;
    const g = this.beatRing;
    g.clear();
    if (!this.ending) {
      const r = 92 + (1 - phase) * 70;
      g.lineStyle(11, N.ink, 0.7 * phase + 0.2).strokeCircle(this.tomato.x, this.tomato.y, r);
      g.lineStyle(6, err < WINDOW ? N.mint : N.sun, 0.4 + phase * 0.6).strokeCircle(this.tomato.x, this.tomato.y, r);
      if (err < WINDOW) {
        g.fillStyle(N.mint, 0.2).fillCircle(this.tomato.x, this.tomato.y, 100);
      }
    }
    for (const team of this.teamsState) {
      const g2 = team.bar;
      g2.clear();
      const x0 = team.panelX - PANEL_W / 2 + 100;
      const wBar = 210;
      const y0 = 128 + 28;
      const frac = Math.min(1, team.rate / 18);
      g2.fillStyle(N.ink, 1).fillRoundedRect(x0 - 4, y0 - 4, wBar + 8, 28, 12);
      g2.fillStyle(0x3a2f8a, 1).fillRoundedRect(x0, y0, wBar, 20, 9);
      if (frac > 0.02) {
        g2.fillStyle(Phaser.Display.Color.HexStringToColor(TEAM_HEX[team.idx]).color, 1).fillRoundedRect(x0, y0, Math.max(18, wBar * frac), 20, 9);
        g2.fillStyle(0xffffff, 0.35).fillRoundedRect(x0 + 4, y0 + 3, Math.max(10, wBar * frac - 8), 6, 3);
      }
    }
    // Grydens øjne følger kødbollen
    for (const p of this.pupils) {
      const base = p.getData('bx') ?? p.x;
      p.setData('bx', base);
      p.x = base + Phaser.Math.Clamp(this.shift / 14, -10, 10);
    }
  }

  private ambient(dt: number, progress: number): void {
    this.bubbleTimer -= dt;
    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = 0.25 + this.rng() * 0.4;
      const x = GEO.potX + (this.rng() - 0.5) * 460;
      const y = GEO.potRim + (this.rng() - 0.3) * 40;
      const b = this.add.image(x, y, 'spag-bubble').setScale(0.1).setDepth(120);
      const s = 0.35 + this.rng() * 0.5;
      this.tweens.add({
        targets: b,
        scale: s,
        y: y - 8,
        duration: 500 + this.rng() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.fx.burst(b.x, b.y, { texture: TEX.drop, color: [0xd8322a, 0xff6a4a], count: 5, speed: 260, scale: 0.35, gravity: 900, lifespan: 500, depth: 130 });
          if (this.rng() < 0.35) this.sfx('pop', { volume: 0.18, pitch: 0.5 + this.rng() * 0.3 });
          b.destroy();
        },
      });
    }
    this.squeakTimer -= dt;
    if (this.squeakTimer <= 0 && this.tension > 0.3 && !this.ending) {
      this.squeakTimer = 1.2 + this.rng();
      this.sfx('squeak', { volume: 0.25, pitch: 0.4 + this.tension * 0.4 + progress * 0.2 });
    }
  }

  // ---------------------------------------------------------------------------
  // Afslutning: taberne ryger i sovsen

  private endWith(winner: number | null, fromTimer = false): void {
    this.ending = true;
    this.winner = winner;
    this.beatRing.clear();
    if (winner === null) {
      for (const team of this.teamsState) for (const pl of team.pullers) pl.blok.sad();
      this.say('spaghettiDraw');
      if (!fromTimer) this.time.delayedCall(1200, () => this.finish(this.rankByTeam(null)));
      return;
    }
    const losers = this.teamsState.find((t) => t.idx !== winner)!;
    const winners = this.teamsState.find((t) => t.idx === winner)!;
    for (const pl of winners.pullers) {
      pl.blok.angle = 0;
      pl.blok.cheer();
      this.tweens.add({ targets: pl.blok, y: GEO.floor - 30, duration: 220, yoyo: true, repeat: 4, ease: 'Quad.easeOut' });
    }
    this.say('sauceSplash');
    losers.pullers.forEach((pl, i) => this.dunk(pl, losers.side, i));
    this.time.delayedCall(500, () => this.fx.confetti(1600));
    this.sfx('cheer', { delay: 0.6 });
    if (!fromTimer) this.time.delayedCall(2000, () => this.finish(this.rankByTeam(winner)));
  }

  private dunk(pl: Puller, side: -1 | 1, i: number): void {
    const blok = pl.blok;
    blok.setData('falling', true);
    this.tweens.add({ targets: pl.tag, alpha: 0, duration: 200 });
    this.stat(pl.p.slot, 'falls');
    this.vibrate(pl.p.slot, 300);
    const targetX = GEO.potX + side * (70 + i * 110) * (pl.front ? 0.6 : 1);
    const startX = blok.x;
    const startY = blok.y;
    const peak = startY - 200;
    const landY = GEO.potRim + 85;
    const holder = { t: 0 };
    blok.angle = 0;
    blok.spinOut(1.5, 700);
    this.sfx('scream', { delay: i * 0.18, pitch: 1 + i * 0.2, pan: this.panFor(startX) });
    this.tweens.add({
      targets: holder,
      t: 1,
      delay: i * 180,
      duration: 650,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const t = holder.t;
        blok.x = startX + (targetX - startX) * t;
        blok.y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * peak + t * t * landY;
        if (t > 0.6) blok.setDepth(150);
      },
      onComplete: () => {
        this.sfx('splash', { pan: this.panFor(blok.x) });
        this.sfx('splat', { volume: 0.7 });
        this.fx.shake(0.012, 260);
        this.fx.burst(blok.x, GEO.potRim + 20, { texture: TEX.drop, color: [0xd8322a, 0xff6a4a, 0xb8231c], count: 26, speed: 900, scale: 0.8, gravity: 1600, lifespan: 900, depth: 800 });
        for (let k = 0; k < 3; k++) {
          const s = this.add.image(blok.x + (this.rng() - 0.5) * 300, GEO.potRim - 200 - this.rng() * 200, 'spag-splat').setDepth(810).setScale(0).setAngle(this.rng() * 360);
          this.tweens.add({ targets: s, scale: 0.6 + this.rng() * 0.5, duration: 160, ease: 'Back.easeOut' });
          this.tweens.add({ targets: s, alpha: 0, y: s.y + 60, delay: 900, duration: 600, onComplete: () => s.destroy() });
        }
        blok.sad();
        // Dupper rundt i sovsen
        this.tweens.add({ targets: blok, y: landY + 14, angle: { from: -6, to: 6 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.fx.floatText(blok.x, GEO.potRim - 160, 'PLASK!', C.tomato, 72);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Bots: hamrer i deres eget tempo og prøver at ramme slaget (med varierende held).

  protected botInput(slot: number, dt: number): BotInput | null {
    const brain = this.bots.get(slot);
    if (!brain || this.ending) return {};
    const team = this.teamsState.find((t) => t.pullers.some((p) => p.p.slot === slot));
    const pl = team?.pullers.find((p) => p.p.slot === slot);
    if (!team || !pl) return {};
    const beatPos = this.clock / BEAT;
    const nearest = Math.round(beatPos);
    const err = (beatPos - nearest) * BEAT;
    if (Math.abs(err) < 0.055 && brain.beatTry !== nearest) {
      brain.beatTry = nearest;
      if (this.rng() < brain.skill) {
        brain.acc = Math.min(brain.acc, 0.3);
        return { tap: true };
      }
    }
    // Lidt gejst når holdet er i fare, og bølger i tempoet så det bliver spændende
    const danger = this.danger(team);
    const surge = 0.85 + Math.sin(this.elapsed * 0.9 + brain.phase) * 0.2 + danger * 0.15;
    brain.acc += brain.rate * surge * dt;
    if (brain.acc >= 1) {
      brain.acc -= 1;
      return { tap: true };
    }
    return {};
  }
}
