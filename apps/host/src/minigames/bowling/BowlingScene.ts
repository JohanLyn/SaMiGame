import Phaser from 'phaser';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { label, nameTag, panelKey, panelSvg, title } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  LANE,
  aimArrowSvg,
  backWallSvg,
  floorSvg,
  lightConeSvg,
  meatballSvg,
  meterFillSvg,
  meterSvg,
  miniBallSvg,
  rackSvg,
  neonSvg,
  pinSvg,
  plasterSvg,
  projScale,
  projX,
  projY,
  sauceSvg,
} from './art';

const THROWS = 3;
const PIN_V = 0.93;
const PIN_U_MAX = 0.92;
const PIN_SPEED = 0.9;
const PIN_R = 0.1;
const BALL_R = 0.31;
const BALL_SCREEN = 140;
const START_V = 0.03;
const AIM_TIME = 10;
const CURVE = 1.7;
const MAX_VU = 1.0;
const HOP_AIR = 0.55;
const HOP_CD = 1.2;
const BLOK_SIZE = 1.3;

type Phase = 'intro' | 'aim' | 'roll' | 'after' | 'done';

interface Pin {
  player: PlayerView;
  blok: Blok;
  hat: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Container;
  dodged: boolean;
  plaster: Phaser.GameObjects.Image;
  u: number;
  vu: number;
  home: number;
  air: number;
  hopCd: number;
  hit: boolean;
  /** Ramt i dette kast (flyver rundt). */
  flying: boolean;
  status: Phaser.GameObjects.Text;
  botPlan: { react: number; jump: boolean; dir: number; decided: boolean };
}

/**
 * KØDBOLLE-BOWLING (1 mod 3, Goomba Bowling omvendt).
 * Eneren ruller en kæmpe kødbolle (sigt, kraft, kurve). Trioen er keglerne og flytter sig/hopper.
 * 3 kast. Bliver alle tre ramt mindst én gang, vinder eneren.
 */
export class BowlingScene extends MinigameScene {
  protected duration = null;
  protected music = 'game' as const;

  private phase: Phase = 'intro';
  private phaseTime = 0;
  private throwNo = 0;
  private pins: Pin[] = [];
  private ball = { u: 0, v: START_V, vu: 0, vv: 0, spin: 0, gutter: false };
  private ballImg!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Image;
  private bowler!: Blok;
  private charging = false;
  private power = 0;
  private powerT = 0;
  private meter!: Phaser.GameObjects.Image;
  private meterFill!: Phaser.GameObjects.Image;
  private aimArrow!: Phaser.GameObjects.Image;
  private aimDots!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private prompt!: Phaser.GameObjects.Text;
  private throwPips: Phaser.GameObjects.Image[] = [];
  private rollSfx = 0;
  private hitsThisThrow = 0;
  private bot = { u: 0, power: 0.8, holdUntil: 0, release: false, target: -1 };

  constructor() {
    super('bowling');
  }

  preload(): void {
    loadSvg(this, 'bw-floor', floorSvg(), 1920, 1080);
    loadSvg(this, 'bw-wall', backWallSvg(), 1920, 420);
    loadSvg(this, 'bw-neon', neonSvg(), 760, 150);
    loadSvg(this, 'bw-ball', meatballSvg(), 2 * BALL_SCREEN, 2 * BALL_SCREEN);
    loadSvg(this, 'bw-pin', pinSvg(), 80, 170);
    loadSvg(this, 'bw-plaster', plasterSvg(), 80, 40);
    loadSvg(this, 'bw-meter', meterSvg(), 70, 340);
    loadSvg(this, 'bw-meterfill', meterFillSvg(), 38, 308);
    loadSvg(this, 'bw-cone', lightConeSvg(), 400, 600);
    loadSvg(this, 'bw-sauce', sauceSvg(), 120, 80);
    loadSvg(this, 'bw-arrow', aimArrowSvg(), 60, 90);
    loadSvg(this, 'bw-rack', rackSvg(), 300, 260);
    loadSvg(this, 'bw-mini', miniBallSvg(), 70, 70);
    loadSvg(this, panelKey(420, 130, C.deep), panelSvg(420, 130, C.deep), 444, 160);
    loadSvg(this, panelKey(460, 190, C.deep), panelSvg(460, 190, C.deep), 484, 220);
  }

  protected setup(): void {
    this.pins = [];
    this.throwPips = [];
    this.phase = 'intro';
    this.throwNo = 0;

    this.add.image(W / 2, H / 2, 'bw-floor').setDepth(-9000);
    this.add.image(W / 2, LANE.yFar - 4, 'bw-wall').setOrigin(0.5, 1).setDepth(-8000);
    const neon = this.add.image(W / 2, 150, 'bw-neon').setDepth(-7900).setScale(0.82);
    this.tweens.add({ targets: neon, alpha: { from: 1, to: 0.75 }, duration: 90, yoyo: true, repeat: -1, repeatDelay: 2600 });
    this.fx.breathe(neon, 0.02, 1200);

    // Lyskegler over kegle-dækket
    for (let i = 0; i < 3; i++) {
      const cone = this.add.image(projX(-0.6 + i * 0.6, PIN_V), 0, 'bw-cone').setOrigin(0.5, 0).setDepth(-7000).setScale(0.8, 0.75).setAlpha(0.5);
      this.tweens.add({ targets: cone, alpha: 0.3, duration: 1200 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Pynt-kegler på nabobanerne
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const u = side * (2.2 + (k % 2) * 0.6) + (k > 1 ? side * 0.3 : 0);
        const v = 0.92 + (k > 1 ? 0.06 : 0);
        const pin = this.add.image(projX(u, v), projY(v), 'bw-pin').setOrigin(0.5, 0.95).setScale(projScale(v) * 0.9).setDepth(-6000 + v);
        this.tweens.add({ targets: pin, angle: { from: -4, to: 4 }, duration: 700 + k * 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    // Kugle-retur i begge sider med hoppende mini-kødboller
    for (const x of [150, W - 150]) {
      this.add.image(x, 1000, 'bw-rack').setOrigin(0.5, 1).setDepth(1800);
      for (let k = 0; k < 3; k++) {
        const ball = this.add.image(x - 60 + k * 60, 905, 'bw-mini').setDepth(1801).setScale(0.9);
        this.tweens.add({ targets: ball, y: 885, duration: 260 + k * 40, yoyo: true, repeat: -1, delay: k * 120, ease: 'Quad.easeOut' });
      }
    }
    // Svævende glimmer (disco-stemning)
    this.add.particles(0, 0, TEX.spark, {
      x: { min: 0, max: W },
      y: { min: 0, max: H },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 1400,
      frequency: 120,
      tint: [N.bubblegum, N.sun, N.mint, N.sky, N.grape],
    }).setDepth(-5000);

    // Keglerne (trioen)
    const trio = this.team(1);
    trio.forEach((p, i) => {
      const u = -0.6 + i * 0.6;
      const blok = this.spawnBlok(p, projX(u, PIN_V), projY(PIN_V), { size: BLOK_SIZE * projScale(PIN_V), tag: false });
      const hat = this.add.image(0, 0, 'bw-pin').setScale(0.42).setOrigin(0.5, 0.92);
      const tag = nameTag(this, 0, 0, p.name, p.color, 22).setDepth(1500);
      const plaster = this.add.image(0, 0, 'bw-plaster').setScale(0.6).setVisible(false);
      this.pins.push({
        player: p,
        blok,
        hat,
        tag,
        dodged: false,
        plaster,
        u,
        vu: 0,
        home: u,
        air: 0,
        hopCd: 0,
        hit: false,
        flying: false,
        status: null as unknown as Phaser.GameObjects.Text,
        botPlan: { react: 0, jump: false, dir: 0, decided: false },
      });
    });

    // Bowleren (eneren) og kødbollen
    this.ballShadow = this.add.image(0, 0, TEX.shadow).setAlpha(0.4);
    this.ballImg = this.add.image(0, 0, 'bw-ball');
    this.bowler = this.spawnBlok(this.solo, W / 2 - 230, 1070, { size: 0.95 });
    this.bowler.setDepth(2000);
    this.aimDots = this.add.graphics().setDepth(-4000);
    this.aimArrow = this.add.image(0, 0, 'bw-arrow').setDepth(-3900).setScale(0.8);
    this.tweens.add({ targets: this.aimArrow, scaleY: 0.95, duration: 300, yoyo: true, repeat: -1 });
    this.meter = this.add.image(0, 0, 'bw-meter').setDepth(3000).setVisible(false);
    this.meterFill = this.add.image(0, 0, 'bw-meterfill').setOrigin(0.5, 1).setDepth(3001).setVisible(false);
    this.trail = this.add.particles(0, 0, TEX.puff, {
      speed: { min: 20, max: 80 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 500,
      frequency: 40,
      tint: [0xe8c9a0, 0xffffff],
      emitting: false,
    }).setDepth(-3000);

    this.buildHud();
    this.resetBall();
    this.drawPins(0);
  }

  private buildHud(): void {
    const solo = this.solo;
    this.add.image(240, 82, panelKey(420, 130, C.deep)).setDepth(7000);
    label(this, 108, 44, 'ENEREN', 24, { color: C.sun }).setDepth(7001);
    label(this, 250, 80, solo.name, 34, { color: solo.color }).setDepth(7001);
    label(this, 120, 120, 'Kast:', 26, { color: C.cream }).setDepth(7001);
    for (let i = 0; i < THROWS; i++) {
      this.throwPips.push(this.add.image(210 + i * 56, 118, 'bw-ball').setScale(0.17).setDepth(7001));
    }
    this.add.image(W - 260, 112, panelKey(460, 190, C.deep)).setDepth(7000);
    label(this, W - 410, 44, 'KEGLERNE', 24, { color: C.sun }).setDepth(7001);
    this.pins.forEach((p, i) => {
      const y = 86 + i * 50;
      label(this, W - 340, y, p.player.name, 28, { color: p.player.color }).setDepth(7001);
      p.status = label(this, W - 120, y, 'Hel', 26, { color: C.mint }).setDepth(7001);
    });
    this.prompt = title(this, W / 2, 600, '', 84).setDepth(7002);
  }

  private updateHud(): void {
    this.throwPips.forEach((p, i) => p.setAlpha(i < THROWS - this.throwNo + (this.phase === 'aim' ? 1 : 0) ? 1 : 0.2));
    for (const p of this.pins) p.status.setText(p.hit ? 'RAMT!' : 'Hel').setColor(p.hit ? C.tomato : C.mint);
  }

  private setPrompt(text: string, color: string = C.cream): void {
    if (this.prompt.text === text) return;
    this.prompt.setText(text).setColor(color).setScale(0.5).setAlpha(1);
    this.tweens.add({ targets: this.prompt, scale: 1, duration: 300, ease: 'Back.easeOut' });
  }

  // ---------------------------------------------------------------------------

  protected onStart(): void {
    this.say('strikeTime');
    this.startThrow();
  }

  private startThrow(): void {
    this.throwNo++;
    this.phase = 'aim';
    this.phaseTime = 0;
    this.charging = false;
    this.power = 0;
    this.powerT = 0;
    this.hitsThisThrow = 0;
    this.resetBall();
    this.updateHud();
    this.sfx('fanfare');
    void this.fx.banner(this.throwNo === THROWS ? 'SIDSTE KAST!' : `KAST ${this.throwNo}`, { size: 130, hold: 700 });
    this.setPrompt('');
    // Bot-plan for eneren
    const targets = this.pins.filter((p) => !p.hit);
    const t = targets.length ? targets[Math.floor(this.rng() * targets.length)] : this.pins[0];
    this.bot = { u: t.u * 0.85, power: 0.55 + this.rng() * 0.4, holdUntil: 1.8 + this.rng() * 1.5, release: false, target: t.player.slot };
    for (const p of this.pins) {
      p.botPlan = { react: 0, jump: false, dir: 0, decided: false };
      p.dodged = false;
    }
    this.setLayout(this.solo.slot, { kind: 'stick', a: 'HOLD & SLIP', hint: `Kast ${this.throwNo}/${THROWS}: sigt, hold A for kraft, slip!` });
  }

  private resetBall(): void {
    this.ball = { u: 0, v: START_V, vu: 0, vv: 0, spin: 0, gutter: false };
    this.ballImg.setVisible(true).setAlpha(1).setAngle(0);
    this.ballShadow.setVisible(true);
    this.drawBall(0);
  }

  protected play(dt: number): void {
    this.phaseTime += dt;
    this.updatePins(dt);
    if (this.phase === 'aim') this.updateAim(dt);
    else if (this.phase === 'roll') this.updateRoll(dt);
    this.drawBall(dt);
    this.drawPins(dt);
  }

  private updateAim(dt: number): void {
    const slot = this.solo.slot;
    const pad = this.pad(slot);
    this.ball.u = Phaser.Math.Clamp(this.ball.u + pad.x * 1.3 * dt, -0.72, 0.72);
    this.bowler.x = projX(this.ball.u, START_V) - 230;
    this.bowler.walk(Math.abs(pad.x) > 0.2 ? pad.x : 0, 0, dt * 1000);
    this.bowler.setFacing(1);

    // Sigtelinje
    this.aimDots.clear();
    for (let v = 0.12; v < 0.95; v += 0.07) {
      const s = projScale(v);
      this.aimDots.fillStyle(this.solo.colorNum, 0.9).fillCircle(projX(this.ball.u, v), projY(v), 9 * s);
      this.aimDots.lineStyle(3 * s, N.ink, 1).strokeCircle(projX(this.ball.u, v), projY(v), 9 * s);
    }
    this.aimArrow.setVisible(true).setPosition(projX(this.ball.u, 0.2), projY(0.2)).setScale(0.8 * projScale(0.2));

    if (pad.a && !this.charging) {
      this.charging = true;
      this.powerT = 0;
      this.sfx('powerup', { volume: 0.5 });
    }
    if (this.charging) {
      this.powerT += dt;
      this.power = 0.5 - 0.5 * Math.cos(this.powerT * Math.PI * 1.25); // 0 → 1 → 0 ...
      this.meter.setVisible(true).setPosition(projX(this.ball.u, START_V) + 230, 860);
      this.meterFill.setVisible(true).setPosition(this.meter.x, 860 + 154).setScale(1, Math.max(0.02, this.power));
      this.bowler.squash(1 + this.power * 0.05, 1 - this.power * 0.05, 30);
      if (!pad.a) this.release();
    }
    const left = AIM_TIME - this.phaseTime;
    if (!this.charging) this.setPrompt(left < 4 ? `Rul nu! ${Math.ceil(left)}` : '');
    if (left <= 0) {
      if (!this.charging) this.power = 0.6;
      this.release();
    }
  }

  private release(): void {
    this.charging = false;
    this.phase = 'roll';
    this.phaseTime = 0;
    const p = Math.max(0.2, this.power);
    this.ball.vv = 0.42 + p * 0.62;
    this.ball.vu = 0;
    this.meter.setVisible(false);
    this.meterFill.setVisible(false);
    this.aimDots.clear();
    this.aimArrow.setVisible(false);
    this.trail.start();
    this.sfx('whoosh');
    this.sfx('stomp', { pitch: 0.8 });
    this.fx.shake(0.006, 160);
    this.bowler.hop(60);
    this.vibrate(this.solo.slot, 60);
    this.setPrompt(p > 0.85 ? 'KÆMPE KAST!' : p < 0.4 ? 'Lidt slapt…' : 'Rul, kødbolle!', p > 0.85 ? C.sun : C.cream);
    this.time.delayedCall(900, () => this.phase === 'roll' && this.setPrompt(''));
    this.setLayout(this.solo.slot, { kind: 'stick', a: 'KURVE ←→', hint: 'Styr kødbollen med pinden!' });
    if (p > 0.85) this.say('bowlFast');
  }

  private updateRoll(dt: number): void {
    const b = this.ball;
    const pad = this.pad(this.solo.slot);
    if (!b.gutter) {
      b.vu = Phaser.Math.Clamp(b.vu + pad.x * CURVE * dt, -MAX_VU, MAX_VU);
      b.u += b.vu * dt;
      if (Math.abs(b.u) > 1.04) {
        b.gutter = true;
        b.u = Math.sign(b.u) * 1.13;
        b.vu = 0;
        this.sfx('wrong');
        this.sfx('bonk', { pitch: 0.6 });
        this.setPrompt('RENDESTEN!', C.tomato);
        this.say('gutter');
        this.fx.floatText(projX(b.u, b.v), projY(b.v) - 120, 'PLUMP!', C.tomato, 56);
      }
    }
    b.v += b.vv * dt;
    b.spin += b.vv * dt * 12;

    this.rollSfx -= dt;
    if (this.rollSfx <= 0) {
      this.rollSfx = 0.18;
      this.sfx('rumble', { volume: 0.25 + 0.3 * projScale(b.v), pitch: 1.4, pan: this.panFor(projX(b.u, b.v)) });
    }
    this.trail.setPosition(projX(b.u, b.v), projY(b.v));
    this.trail.setDepth(projY(b.v) - 5);

    // Kollision med keglerne
    if (!b.gutter) {
      for (const p of this.pins) {
        if (p.flying) continue;
        if (Math.abs(b.v - PIN_V) > 0.05) continue;
        if (Math.abs(b.u - p.u) > BALL_R + PIN_R) continue;
        if (p.air > 0.12 && p.air < HOP_AIR - 0.05) {
          if (!p.dodged) {
            p.dodged = true;
            this.fx.floatText(projX(p.u, PIN_V), projY(PIN_V) - 200, 'HOP!', C.mint, 46);
            this.sfx('boing', { pan: this.panFor(projX(p.u, PIN_V)) });
          }
          continue;
        }
        this.knock(p, Math.sign(p.u - b.u) || (this.rng() < 0.5 ? -1 : 1));
      }
    }

    if (b.v > 1.12) {
      this.trail.stop();
      this.ballImg.setVisible(false);
      this.ballShadow.setVisible(false);
      this.sfx('crunch', { volume: 0.8 });
      this.fx.shake(0.008, 200);
      this.afterThrow();
    }
  }

  private knock(p: Pin, dir: number): void {
    const first = !p.hit;
    p.hit = true;
    p.flying = true;
    this.hitsThisThrow++;
    const x = projX(p.u, PIN_V);
    const y = projY(PIN_V);
    this.stat(this.solo.slot, 'hits');
    this.stat(p.player.slot, 'falls');
    this.vibrate(p.player.slot, 300);
    this.sfx('hit', { pan: this.panFor(x) });
    this.sfx('bonk', { pan: this.panFor(x), pitch: 0.8 });
    this.sfx('scream', { delay: 0.1, pan: this.panFor(x) });
    this.fx.stars(x, y - 80, N.sun, 12);
    this.fx.burst(x, y - 40, { texture: 'bw-sauce', count: 6, speed: 600, scale: 0.5, gravity: 1400, lifespan: 800 });
    this.fx.flash(0xffffff, 120, 0.4);
    this.fx.shake(0.014, 260);
    this.hitstop(70);
    this.fx.floatText(x, y - 220, first ? 'STRIKE!' : 'IGEN!', first ? C.sun : C.tangerine, 64);
    p.blok.spinOut(4, 1300);
    p.hat.setVisible(false);
    // Flyv gakket af banen
    const tx = x + dir * (380 + this.rng() * 200);
    this.tweens.add({ targets: p.blok, x: tx, duration: 1100, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: p.blok, y: y - 380 - this.rng() * 150, duration: 520, ease: 'Quad.easeOut', yoyo: true });
    this.tweens.add({ targets: p.blok, scale: 1.5, duration: 520, yoyo: true });
    p.blok.setDepth(6000);
    // Kædereaktion: en flyvende kegle kan vælte naboen
    for (const q of this.pins) {
      if (q === p || q.flying) continue;
      if (Math.abs(q.u - p.u) < 0.33 && Math.sign(q.u - p.u) === dir && q.air <= 0.1) {
        this.time.delayedCall(140, () => {
          if (!q.flying && this.phase === 'roll') {
            this.fx.floatText(projX(q.u, PIN_V), projY(PIN_V) - 260, 'KÆDEREAKTION!', C.bubblegum, 40);
            this.knock(q, dir);
          }
        });
      }
    }
    this.updateHud();
    if (first) this.setLayout(p.player.slot, { kind: 'stick', a: 'HOP', hint: 'Du er ramt – men bliv på banen og driil eneren!' });
    if (this.pins.every((q) => q.hit)) this.say('allThreeDown', true);
    else this.say('ouch');
  }

  private async afterThrow(): Promise<void> {
    this.phase = 'after';
    const n = this.hitsThisThrow;
    if (n >= 3) {
      this.setPrompt('STRIKE!!!', C.sun);
      this.fx.confetti(1200);
      this.sfx('win');
    } else if (n === 0) {
      this.setPrompt('Forbi!', C.tomato);
      this.sfx('lose');
      this.pins.forEach((p) => p.blok.cheer());
    } else {
      this.setPrompt(n === 2 ? 'Dobbelt!' : 'Ramt!', C.sun);
      this.sfx('coin');
    }
    await this.wait(1500);
    // Ramte kegler kommer haltende tilbage med plaster
    for (const p of this.pins) {
      if (!p.flying) {
        p.blok.idle();
        continue;
      }
      this.tweens.killTweensOf(p.blok);
      p.flying = false;
      p.u = Phaser.Math.Clamp(p.u, -PIN_U_MAX, PIN_U_MAX);
      p.blok.setScale(1).setAlpha(0).setPosition(projX(p.u, PIN_V), projY(PIN_V) - 200);
      this.tweens.add({ targets: p.blok, alpha: 1, y: projY(PIN_V), duration: 420, ease: 'Bounce.easeOut' });
      p.blok.sad();
      p.hat.setVisible(true);
      p.plaster.setVisible(true);
      this.sfx('boing', { delay: 0.2 });
    }
    await this.wait(700);
    const allHit = this.pins.every((p) => p.hit);
    if (allHit || this.throwNo >= THROWS) {
      this.phase = 'done';
      this.setPrompt('');
      if (allHit) {
        this.say('soloStrike', true);
        this.bowler.dance();
        this.fx.confetti(1500);
        await this.fx.banner('ALLE RAMT!', { color: C.sun, size: 150, hold: 900 });
        this.finish(this.rankByTeam(0));
      } else {
        this.say('pinsHold', true);
        this.bowler.sad();
        this.pins.filter((p) => !p.hit).forEach((p) => p.blok.dance());
        this.sfx('cheer');
        await this.fx.banner('KEGLERNE VANDT!', { color: C.mint, size: 120, hold: 900 });
        this.finish(this.rankByTeam(1));
      }
      return;
    }
    this.startThrow();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  // ---------------------------------------------------------------------------
  // Keglerne

  private updatePins(dt: number): void {
    for (const p of this.pins) {
      p.hopCd = Math.max(0, p.hopCd - dt);
      p.air = Math.max(0, p.air - dt);
      if (p.flying) continue;
      const pad = this.pad(p.player.slot);
      const target = pad.x * PIN_SPEED;
      p.vu += (target - p.vu) * Math.min(1, dt * 12);
      p.u = Phaser.Math.Clamp(p.u + p.vu * dt, -PIN_U_MAX, PIN_U_MAX);
      if (this.pressedA(p.player.slot) && p.hopCd <= 0 && this.phase !== 'intro') {
        p.air = HOP_AIR;
        p.hopCd = HOP_CD;
        p.blok.hop(120, (HOP_AIR * 1000) / 2);
        this.sfx('jump', { pan: this.panFor(projX(p.u, PIN_V)) });
        this.stat(p.player.slot, 'jumps');
      }
    }
    // Keglerne kan ikke stå i hinanden
    const live = this.pins.filter((p) => !p.flying);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        const d = b.u - a.u;
        const min = 0.3;
        if (Math.abs(d) < min) {
          const push = (min - Math.abs(d)) / 2;
          const s = Math.sign(d) || 1;
          a.u = Phaser.Math.Clamp(a.u - s * push, -PIN_U_MAX, PIN_U_MAX);
          b.u = Phaser.Math.Clamp(b.u + s * push, -PIN_U_MAX, PIN_U_MAX);
        }
      }
    }
  }

  private drawPins(dt: number): void {
    for (const p of this.pins) {
      if (!p.flying) {
        p.blok.setPosition(projX(p.u, PIN_V), projY(PIN_V)).setDepth(projY(PIN_V) + p.u);
        p.blok.walk(p.vu / PIN_SPEED, 0, dt * 1000 * 1.6);
      }
      const s = p.blok.size;
      const headY = p.blok.y + (p.blok.rig.y - 186 * s) * p.blok.scaleY;
      p.hat.setPosition(p.blok.x, headY).setDepth(p.blok.depth + 0.5).setAngle(p.blok.rig.angle);
      p.plaster.setPosition(p.blok.x + 26 * s, headY + 28 * s).setDepth(p.blok.depth + 0.6);
      p.tag.setPosition(p.blok.x, projY(PIN_V) + 34).setAlpha(p.flying ? 0.4 : 1);
      if (p.flying) {
        p.hat.setVisible(false);
        p.plaster.setVisible(false);
      }
    }
  }

  private drawBall(_dt: number): void {
    const b = this.ball;
    const v = Math.min(b.v, 1.12);
    const s = projScale(v);
    const x = projX(b.u, v);
    const y = projY(v);
    const r = BALL_R * LANE.half * s;
    const sink = b.gutter ? r * 0.35 : 0;
    this.ballImg.setPosition(x, y - r + sink).setDisplaySize(r * 2, r * 2);
    this.ballImg.setAngle(b.vu * 25 + Math.sin(b.spin) * 6);
    this.ballImg.setDepth(v > 1.0 ? -8500 : y);
    this.ballShadow.setPosition(x, y + 2).setDisplaySize(r * 2.1, r * 0.5).setDepth(y - 1);
    if (this.phase !== 'roll') this.bowler.setDepth(Math.max(y + 5, 2000));
  }

  /** Lokalt hitstop der genskaber spillets hastighed (?speed=) bagefter. */
  private hitstop(ms: number): void {
    this.tweens.timeScale = 0.05;
    this.time.timeScale = 0.05;
    setTimeout(() => {
      if (!this.sys.isActive()) return;
      this.tweens.timeScale = this.speed;
      this.time.timeScale = this.speed;
    }, ms);
  }

  // ---------------------------------------------------------------------------
  // Bots

  protected botInput(slot: number): BotInput | null {
    if (slot === this.solo.slot) return this.botBowler();
    const p = this.pins.find((x) => x.player.slot === slot);
    if (!p) return null;
    return this.botPin(p);
  }

  private botBowler(): BotInput {
    if (this.phase === 'aim') {
      const t = this.pins.find((p) => p.player.slot === this.bot.target);
      const aimU = t ? Phaser.Math.Clamp(t.u * 0.9, -0.7, 0.7) : this.bot.u;
      const dx = aimU - this.ball.u;
      const x = Math.abs(dx) > 0.04 ? Phaser.Math.Clamp(dx * 4, -1, 1) : 0;
      if (this.phaseTime < this.bot.holdUntil) return { x, y: 0, a: false };
      // Hold A indtil måleren er tæt på målet (på vej op)
      const rising = Math.sin(this.powerT * Math.PI * 1.25) > 0;
      const release = this.charging && rising && this.power >= this.bot.power;
      return { x: 0, y: 0, a: !release && this.phaseTime < AIM_TIME - 0.5 };
    }
    if (this.phase === 'roll') {
      // Styr mod det nærmeste ikke-ramte mål (ellers nærmeste kegle)
      const cands = this.pins.filter((p) => !p.flying);
      const pool = cands.filter((p) => !p.hit).length ? cands.filter((p) => !p.hit) : cands;
      if (!pool.length) return { x: 0, a: false };
      pool.sort((a, b) => Math.abs(a.u - this.ball.u) - Math.abs(b.u - this.ball.u));
      const tLeft = Math.max(0.05, (PIN_V - this.ball.v) / Math.max(0.1, this.ball.vv));
      const want = (pool[0].u - this.ball.u) / tLeft;
      const err = want - this.ball.vu;
      return { x: Phaser.Math.Clamp(err * 1.8, -1, 1) * 0.8, y: 0, a: false };
    }
    return { x: 0, y: 0, a: false };
  }

  private botPin(p: Pin): BotInput {
    if (p.flying) return { x: 0, a: false };
    if (this.phase === 'roll' && !this.ball.gutter) {
      const b = this.ball;
      const plan = p.botPlan;
      if (!plan.decided && b.v > 0.4 + this.rng() * 0.3) {
        plan.decided = true;
        plan.react = this.phaseTime + 0.15 + this.rng() * 0.5;
        plan.jump = this.rng() < 0.22;
        plan.dir = this.rng() < 0.25 ? -1 : 1; // panik: løber den forkerte vej
      }
      if (plan.decided && this.phaseTime >= plan.react) {
        const tLeft = (PIN_V - b.v) / Math.max(0.1, b.vv);
        const predU = b.u + b.vu * Math.max(0, tLeft) * 0.7;
        const d = p.u - predU;
        const danger = Math.abs(d) < BALL_R + PIN_R + 0.12;
        if (plan.jump && danger && tLeft < 0.32 && tLeft > 0.12) return { x: 0, a: p.hopCd <= 0 };
        if (danger && tLeft > -0.05) {
          let dir = (Math.sign(d) || 1) * (plan.dir === -1 ? -1 : 1);
          if (Math.abs(p.u) > PIN_U_MAX - 0.05 && Math.sign(p.u) === dir) dir = -dir;
          return { x: dir, a: false };
        }
      }
      return { x: 0, a: false };
    }
    // Mellem kast: drill lidt rundt og gå mod en tilfældig plads
    const wander = Phaser.Math.Clamp(p.home + Math.sin(this.elapsed * (0.8 + p.player.slot * 0.31) + p.player.slot * 2) * 0.18, -0.85, 0.85);
    const dx = wander - p.u;
    return { x: Math.abs(dx) > 0.06 ? Phaser.Math.Clamp(dx * 3, -0.7, 0.7) : 0, a: this.phase === 'aim' && this.rng() < 0.004 };
  }
}
