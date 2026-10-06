import Phaser from 'phaser';
import { PLAYER_COLORS } from '@samigame/shared';
import { clouds, gradientBackdrop } from '../../kit/scenery';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, N, W } from '../../kit/theme';
import { TimerHud, nameTag, title } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  BAL,
  balloonSvg,
  buntingSvg,
  faceSvg,
  glowSvg,
  hillsSvg,
  hornSvg,
  shardSvg,
  stageSvg,
  tagSvg,
  waveSvg,
  wheelStandSvg,
  wheelSvg,
  type Fear,
} from './art';

const DURATION = 20;
const STATIONS = [300, 740, 1180, 1620];
const GROUND = 965;
/** Pust-hastighed ved fuldt skrig (andel af max pr. sekund). */
const RATE = 0.16;
const TAP_BUMP = 0.011;
const LEAK = 0.012;
const MIN_R = 46;
const MAX_R = 200;

interface Station {
  player: PlayerView;
  slot: number;
  x: number;
  knot: { x: number; y: number };
  blok: Blok;
  horn: Phaser.GameObjects.Image;
  balloon: Phaser.GameObjects.Image;
  face: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  waves: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Størrelse 0..1 */
  size: number;
  shown: number;
  vel: number;
  limit: number;
  popped: boolean;
  fear: Fear;
  squeakCd: number;
  screamCd: number;
  loud: boolean;
  // bot
  greed: number;
  burst: number;
  rest: number;
  burstLevel: number;
}

/**
 * SKRIGE-BALLONEN (alle mod alle).
 * Råb i telefonen for at puste din ballon op. Hver ballon har en skjult sprænggrænse – jo tættere du er,
 * jo mere bange ser den ud og dirrer. Største hele ballon efter 20 sek. vinder; sprungne er sidst.
 */
export class SkrigScene extends MinigameScene {
  protected duration: number | null = null;
  protected music = 'silly' as const;
  private st: Station[] = [];
  private popOrder: number[] = [];
  private left = DURATION;
  private clock: TimerHud | null = null;
  private phase: 'play' | 'reveal' = 'play';
  private saidHalf = false;

  constructor() {
    super('skrig');
  }

  preload(): void {
    for (const pc of PLAYER_COLORS) {
      const k = pc.hex.slice(1);
      loadSvg(this, `skrig-bal-${k}`, balloonSvg(pc.hex), BAL.w, BAL.h);
      loadSvg(this, `skrig-horn-${k}`, hornSvg(pc.hex), 180, 140);
      loadSvg(this, `skrig-stage-${k}`, stageSvg(pc.hex), 320, 110);
      loadSvg(this, `skrig-tag-${k}`, tagSvg(pc.hex), 220, 110);
    }
    for (const f of [0, 1, 2, 3] as Fear[]) loadSvg(this, `skrig-face-${f}`, faceSvg(f), BAL.w, BAL.h);
    loadSvg(this, 'skrig-glow', glowSvg(), BAL.w, BAL.h);
    loadSvg(this, 'skrig-wave', waveSvg(), 60, 100);
    loadSvg(this, 'skrig-shard', shardSvg(), 40, 30);
    loadSvg(this, 'skrig-wheel', wheelSvg(), 500, 500);
    loadSvg(this, 'skrig-stand', wheelStandSvg(), 500, 360);
    loadSvg(this, 'skrig-hills', hillsSvg(), 1920, 380);
    loadSvg(this, 'skrig-bunting', buntingSvg(), 1020, 140);
  }

  protected setup(): void {
    this.st = [];
    this.popOrder = [];
    this.left = DURATION;
    this.phase = 'play';
    this.saidHalf = false;

    this.buildFair();
    for (const p of this.players) this.buildStation(p);

    // Ballonerne lever også under nedtællingen
    let last = performance.now();
    const draw = () => {
      const now = performance.now();
      const dt = Math.min(0.1, ((now - last) / 1000) * this.speed);
      last = now;
      for (const s of this.st) this.drawBalloon(s, dt);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, draw);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, draw));
  }

  protected onStart(): void {
    this.clock = new TimerHud(this, W / 2, 86, DURATION);
    this.clock.set(DURATION);
    this.say('SKRIG! Pust ballonen op – men ikke for meget!', true);
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildFair(): void {
    gradientBackdrop(this, '#ff9a8a', '#5a2a9a');
    // Sol der går ned
    const sunG = this.add.circle(W / 2, 640, 260, 0xffd36b, 0.35).setDepth(-9500);
    this.tweens.add({ targets: sunG, scale: 1.06, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.circle(W / 2, 640, 190, 0xffe9a0, 0.6).setDepth(-9490);
    clouds(this, 5, 80, 360, -9400);
    // Pariserhjul
    this.add.image(1500, 820, 'skrig-stand').setOrigin(0.5, 1).setScale(0.9).setDepth(-9200);
    const wheel = this.add.image(1500, 820 - 340 * 0.9 + 18, 'skrig-wheel').setScale(0.9).setDepth(-9100);
    this.tweens.add({ targets: wheel, angle: 360, duration: 30000, repeat: -1 });
    this.add.image(W / 2, 1080 - 380 / 2 - 120, 'skrig-hills').setDepth(-9000);
    // Brædder
    this.add.rectangle(W / 2, 1010, W, 200, 0x8a5a2a).setDepth(-8800);
    for (let i = 0; i < 16; i++) this.add.rectangle(i * 128, 1010, 6, 200, 0x5a3214, 0.6).setDepth(-8790);
    this.add.rectangle(W / 2, 912, W, 10, N.ink, 0.6).setDepth(-8780);
    // Flagranker der svajer
    for (const [x, d] of [[480, 1], [1440, -1]] as const) {
      const b = this.add.image(x, 150, 'skrig-bunting').setDepth(-8000).setScale(0.95);
      this.tweens.add({ targets: b, angle: { from: -1.5 * d, to: 1.5 * d }, y: 156, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Svævende små balloner langt væk
    for (let i = 0; i < 8; i++) {
      const c = [N.bubblegum, N.sky, N.sun, N.mint][i % 4];
      const b = this.add.ellipse(Phaser.Math.Between(100, W - 100), Phaser.Math.Between(700, 1000), 22, 26, c, 0.7).setDepth(-9300);
      this.tweens.add({ targets: b, y: -60, x: b.x + Phaser.Math.Between(-100, 100), duration: Phaser.Math.Between(9000, 16000), repeat: -1, delay: Phaser.Math.Between(0, 6000) });
    }
  }

  private buildStation(p: PlayerView): void {
    const x = STATIONS[p.slot] ?? STATIONS[0];
    const k = p.color.slice(1);
    const tex = (base: string) => (this.textures.exists(`${base}-${k}`) ? `${base}-${k}` : `${base}-ff4d4d`);
    this.add.image(x, GROUND, tex('skrig-stage')).setOrigin(0.5, 40 / 110).setDepth(GROUND - 30);
    const bx = x - 70;
    const blok = this.spawnBlok(p, bx, GROUND, { size: 0.82 });
    blok.setDepth(GROUND);
    blok.setFacing(1);
    blok.hideTag();
    nameTag(this, x, GROUND + 72, p.name, p.color, 30).setDepth(GROUND + 20);
    const mouth = { x: bx + 34, y: GROUND - 140 };
    const horn = this.add.image(mouth.x, mouth.y, tex('skrig-horn')).setOrigin(0.04, 0.5).setScale(0.8).setAngle(-38).setDepth(GROUND + 5);
    const a = Phaser.Math.DegToRad(-38);
    const bell = { x: mouth.x + Math.cos(a) * 128, y: mouth.y + Math.sin(a) * 128 };
    const knot = { x: bell.x + 6, y: bell.y - 8 };
    const oy = (BAL.cy + BAL.BR * 1.15 + 14) / BAL.h;
    const balloon = this.add.image(knot.x, knot.y, tex('skrig-bal')).setOrigin(0.5, oy).setDepth(GROUND - 10);
    const glow = this.add.image(knot.x, knot.y, 'skrig-glow').setOrigin(0.5, oy).setDepth(GROUND - 9).setAlpha(0).setBlendMode(Phaser.BlendModes.NORMAL);
    const face = this.add.image(knot.x, knot.y, 'skrig-face-0').setOrigin(0.5, oy).setDepth(GROUND - 8);
    const waves = this.add.particles(mouth.x + 30, mouth.y - 20, 'skrig-wave', {
      speed: { min: 160, max: 260 },
      angle: { min: -60, max: -20 },
      scale: { start: 0.3, end: 0.9 },
      alpha: { start: 0.9, end: 0 },
      rotate: { min: -50, max: -30 },
      lifespan: 500,
      frequency: 90,
      tint: [0xffffff, p.colorNum],
      emitting: false,
    });
    waves.setDepth(GROUND + 6);
    const s: Station = {
      player: p,
      slot: p.slot,
      x,
      knot,
      blok,
      horn,
      balloon,
      face,
      glow,
      waves,
      size: 0,
      shown: 0,
      vel: 0,
      limit: 0.6 + this.rng() * 0.36,
      popped: false,
      fear: 0,
      squeakCd: 0,
      screamCd: 0,
      loud: false,
      greed: 0.72 + this.rng() * 0.26,
      burst: 0,
      rest: 0.2 + this.rng() * 0.6,
      burstLevel: 0.8,
    };
    this.st.push(s);
    this.drawBalloon(s, 0);
  }

  // ---------------------------------------------------------------------------
  // Spil

  protected play(dt: number): void {
    if (this.phase === 'play') {
      this.left = Math.max(0, this.left - dt);
      this.clock?.set(this.left);
      if (this.left <= 5 && Math.ceil(this.left) !== Math.ceil(this.left + dt) && this.left > 0) this.sfx('tick');
      if (!this.saidHalf && this.left < 10) {
        this.saidHalf = true;
        this.say('Ti sekunder! Skrig højere!');
      }
      for (const s of this.st) this.inflate(s, dt);
      if (this.left <= 0) this.reveal();
    }
  }

  private inflate(s: Station, dt: number): void {
    if (s.popped) {
      s.waves.emitting = false;
      return;
    }
    const pad = this.pad(s.slot);
    const level = Math.max(0, Math.min(1, pad.level));
    const taps = this.taps(s.slot);
    const blowing = level > 0.15;
    let grow = 0;
    if (blowing) grow += RATE * level * (1 - 0.3 * s.size) * dt;
    grow += taps * TAP_BUMP;
    if (grow > 0) s.size += grow;
    else s.size = Math.max(0, s.size - LEAK * dt);

    // Statistik: tæl skrig (stigende flanke over 0.6)
    if (level > 0.6 && !s.loud) {
      s.loud = true;
      this.stat(s.slot, 'screams');
    } else if (level < 0.3) s.loud = false;

    s.waves.emitting = blowing || taps > 0;
    s.waves.frequency = 140 - level * 90;
    s.squeakCd -= dt;
    s.screamCd -= dt;
    if ((blowing || taps > 0) && s.squeakCd <= 0) {
      s.squeakCd = 0.22;
      this.sfx('squeak', { pitch: 0.35 + s.size * 1.3, volume: 0.12 + level * 0.18, pan: this.panFor(s.x) });
      s.blok.squash(1.06, 0.94, 60);
    }
    if (level > 0.8 && s.screamCd <= 0) {
      s.screamCd = 2.6 + this.rng() * 2;
      this.sfx('scream', { volume: 0.3, pitch: 0.9 + this.rng() * 0.5, pan: this.panFor(s.x) });
    }
    const c = s.size / s.limit;
    if (c > 0.86 && s.squeakCd <= 0.05 && this.rng() < dt * 4) this.sfx('squeak', { pitch: 2.6, volume: 0.25, pan: this.panFor(s.x) });
    if (c >= 1) this.pop(s);
  }

  private pop(s: Station): void {
    s.popped = true;
    this.popOrder.push(s.slot);
    s.waves.emitting = false;
    const top = this.balloonCenter(s);
    this.sfx('explosion', { volume: 0.9, pitch: 1.4, pan: this.panFor(s.x) });
    this.sfx('pop', { pitch: 0.6, volume: 1.3 });
    this.fx.shake(0.018, 300);
    this.fx.flash(0xffffff, 140, 0.45);
    this.hitstop(80);
    this.fx.burst(top.x, top.y, { texture: 'skrig-shard', color: s.player.colorNum, count: 22, speed: 900, gravity: 1400, scale: 1.3, lifespan: 1100 });
    this.fx.burst(top.x, top.y, { texture: TEX.star, color: [N.sun, 0xffffff], count: 10, speed: 700 });
    const ring = this.add.circle(top.x, top.y, 40, 0xffffff, 0).setStrokeStyle(10, 0xffffff).setDepth(7000);
    this.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    title(this, top.x, top.y, 'BANG!', 110, { color: C.tomato }).setDepth(7100).setAngle(-10).setName(`bang-${s.slot}`);
    const bang = this.children.getByName(`bang-${s.slot}`) as Phaser.GameObjects.Text;
    this.fx.popIn(bang);
    this.tweens.add({ targets: bang, alpha: 0, y: bang.y - 60, delay: 900, duration: 400, onComplete: () => bang.destroy() });
    s.balloon.setVisible(false);
    s.glow.setVisible(false);
    s.face.setVisible(false);
    // Sodet og forskrækket spiller
    s.blok.spinOut(1, 500);
    s.blok.sad();
    s.blok.rig.each((part: Phaser.GameObjects.GameObject) => (part as Phaser.GameObjects.Image).setTint?.(0x6a6a7a));
    this.fx.burst(s.blok.x, s.blok.y - 140, { texture: TEX.puff, color: 0x3a3a4a, count: 10, speed: 160, gravity: -150, lifespan: 1200 });
    // Gummistump på tragten
    const scrap = this.add.image(s.knot.x, s.knot.y - 4, 'skrig-shard').setTint(s.player.colorNum).setScale(1.4).setDepth(GROUND + 7);
    this.tweens.add({ targets: scrap, angle: { from: -20, to: 20 }, duration: 300, yoyo: true, repeat: -1 });
    this.stat(s.slot, 'falls');
    this.vibrate(s.slot, 400);
    if (this.popOrder.length === 1) this.say('BANG! Den sprang!');
    else this.say('ouch');
  }

  private balloonCenter(s: Station): { x: number; y: number } {
    const r = MIN_R + s.shown * (MAX_R - MIN_R);
    return { x: s.balloon.x, y: s.knot.y - r * 1.15 - 10 };
  }

  private drawBalloon(s: Station, dt: number): void {
    if (s.popped) return;
    // Gelé-fjeder mod den rigtige størrelse
    const k = 140;
    const damp = 9;
    s.vel += ((s.size - s.shown) * k - s.vel * damp) * Math.min(dt, 0.05);
    s.shown += s.vel * Math.min(dt, 0.05);
    if (dt > 0.05) s.shown += (s.size - s.shown) * Math.min(1, (dt - 0.05) * 10);
    const r = MIN_R + Math.max(0, s.shown) * (MAX_R - MIN_R);
    const base = r / BAL.BR;
    const c = s.size / s.limit;
    const danger = Phaser.Math.Clamp((c - 0.62) / 0.38, 0, 1);
    const t = this.elapsed;
    const amp = danger * danger * 16;
    const wob = Math.sin(t * 18 + s.slot) * 0.03 * (0.4 + danger);
    const jx = (Math.random() - 0.5) * amp;
    const jy = (Math.random() - 0.5) * amp * 0.5;
    const ang = Math.sin(t * 2 + s.slot) * 4 + (Math.random() - 0.5) * danger * 6;
    for (const img of [s.balloon, s.glow, s.face]) {
      img.setPosition(s.knot.x + jx, s.knot.y + jy).setScale(base * (1 + wob), base * (1 - wob)).setAngle(ang);
    }
    s.glow.setAlpha(danger * (0.55 + Math.sin(t * 14) * 0.25));
    const fear: Fear = c < 0.4 ? 0 : c < 0.68 ? 1 : c < 0.86 ? 2 : 3;
    if (fear !== s.fear) {
      s.fear = fear;
      s.face.setTexture(`skrig-face-${fear}`);
      if (fear >= 2) this.sfx('squeak', { pitch: 1.8 + fear * 0.3, volume: 0.3, pan: this.panFor(s.x) });
    }
    // Spilleren ryster når de skriger
    const lvl = this.phase === 'play' ? this.pad(s.slot).level : 0;
    s.blok.angle = lvl > 0.15 ? (Math.random() - 0.5) * lvl * 10 : 0;
    s.horn.setScale(0.8 * (1 + lvl * 0.12));
  }

  // ---------------------------------------------------------------------------
  // Afsløring

  private reveal(): void {
    this.phase = 'reveal';
    this.clock?.destroy();
    this.clock = null;
    for (const s of this.st) {
      s.waves.emitting = false;
      s.blok.angle = 0;
    }
    this.sfx('whoosh');
    this.sfx('ding', { delay: 0.1 });
    this.say('Stop! Lad os måle ballonerne!', true);
    void this.fx.banner('STOP! MÅLEBÅNDET FREM!', { color: C.sun, size: 120, hold: 900 }).then(() => this.measure());
  }

  private cm(s: Station): number {
    return Math.round(20 + s.size * 130);
  }

  private measure(): void {
    const whole = this.st.filter((s) => !s.popped).sort((a, b) => a.size - b.size);
    this.sfx('drumroll');
    let delay = 300;
    for (const s of this.st.filter((x) => x.popped)) {
      this.time.delayedCall(delay, () => {
        const top = this.balloonCenter(s);
        title(this, s.knot.x, Math.min(top.y, 560), 'SPRUNGET!', 46, { color: C.tomato }).setDepth(7000).setAngle(-6);
        this.sfx('wrong', { pan: this.panFor(s.x) });
      });
      delay += 450;
    }
    whole.forEach((s, i) => {
      const last = i === whole.length - 1;
      this.time.delayedCall(delay, () => {
        const r = MIN_R + s.size * (MAX_R - MIN_R);
        const y = Math.max(130, s.knot.y - r * 2.3 - 70);
        const k = s.player.color.slice(1);
        const tag = this.add.image(s.knot.x, y, this.textures.exists(`skrig-tag-${k}`) ? `skrig-tag-${k}` : 'skrig-tag-ff4d4d').setDepth(7000).setScale(0);
        const txt = title(this, s.knot.x, y + 6, '0 cm', 50, { color: C.cream }).setDepth(7001).setScale(0);
        this.tweens.add({ targets: [tag, txt], scale: 1, duration: 300, ease: 'Back.easeOut' });
        const counter = { v: 0 };
        const target = this.cm(s);
        let lastTick = 0;
        this.tweens.add({
          targets: counter,
          v: target,
          duration: last ? 1500 : 900,
          ease: 'Cubic.easeOut',
          onUpdate: () => {
            const v = Math.round(counter.v);
            txt.setText(`${v} cm`);
            if (v - lastTick >= 8) {
              lastTick = v;
              this.sfx('tick', { pitch: 0.6 + v / 120, volume: 0.5 });
            }
          },
          onComplete: () => {
            txt.setText(`${target} cm`);
            this.fx.squash(txt, 1.4, 0.7, 110);
            this.sfx(last ? 'coin' : 'ding', { pan: this.panFor(s.x) });
            this.fx.stars(s.knot.x, y, s.player.colorNum, last ? 14 : 6);
          },
        });
      });
      delay += last ? 1900 : 1200;
    });
    this.time.delayedCall(delay + 200, () => this.celebrate(whole));
  }

  private celebrate(whole: Station[]): void {
    const best = whole[whole.length - 1];
    if (best) {
      const winners = whole.filter((s) => this.cm(s) === this.cm(best));
      for (const w of winners) {
        const crown = this.add.image(w.blok.x, w.blok.y - 260, TEX.crown).setDepth(7200).setScale(0);
        this.tweens.add({ targets: crown, scale: 1.1, duration: 400, ease: 'Back.easeOut' });
        w.blok.cheer();
        // Ballonen løfter vinderen en smule
        this.tweens.add({ targets: [w.blok, w.horn, w.balloon, w.face, w.glow, crown], y: '-=90', duration: 1400, ease: 'Sine.easeOut' });
        w.knot.y -= 90;
      }
      this.fx.confetti(1500);
      this.sfx('fanfare');
      this.say('Klap for den største ballon!', true);
    } else {
      this.say('Alle ballonerne sprang! Sikke et kaos!', true);
      this.sfx('lose');
    }
    for (const s of this.st) if (s.popped) s.blok.sad();
    this.time.delayedCall(1700, () => this.finish(this.ranking()));
  }

  private ranking(): number[][] {
    const groups: number[][] = [];
    const whole = this.st.filter((s) => !s.popped).sort((a, b) => b.size - a.size);
    for (const s of whole) {
      const last = groups[groups.length - 1];
      const ref = last ? this.st.find((x) => x.slot === last[0]) : undefined;
      if (last && ref && !ref.popped && this.cm(ref) === this.cm(s)) last.push(s.slot);
      else groups.push([s.slot]);
    }
    // Sprungne: den der holdt længst først, den første der sprang til sidst
    for (let i = this.popOrder.length - 1; i >= 0; i--) groups.push([this.popOrder[i]]);
    return groups;
  }

  // ---------------------------------------------------------------------------
  // Bots: skrig i stød, hold pause, stop når ballonen ser for bange ud (grådige bots tør mere).

  protected botInput(slot: number, dt: number): BotInput | null {
    const s = this.st.find((x) => x.slot === slot);
    if (!s || s.popped || this.phase !== 'play') return { level: 0 };
    const c = s.size / s.limit;
    // Bot "ser" kun ballonens frygt + dirren (lidt usikkert)
    const seen = c + (this.rng() - 0.5) * 0.06;
    const stopAt = s.greed;
    if (s.burst > 0) {
      s.burst -= dt;
      if (seen > stopAt) s.burst = Math.min(s.burst, 0.12 + (1 - s.greed) * 0.1);
      return { level: s.burstLevel * (0.85 + this.rng() * 0.3) };
    }
    s.rest -= dt;
    if (s.rest <= 0) {
      const timePressure = this.left < 5 ? 0.06 : 0;
      if (seen < stopAt - 0.02 + timePressure) {
        s.burst = seen < 0.5 ? 0.8 + this.rng() * 1.1 : 0.25 + this.rng() * 0.45;
        s.burstLevel = 0.6 + this.rng() * 0.4;
      }
      s.rest = 0.25 + this.rng() * 0.6;
    }
    return { level: 0.05 * this.rng() };
  }
  /** fx.hitstop() nulstiller tidsskalaen til 1 (ikke ?speed=) – gendan den bagefter. */
  private hitstop(ms: number): void {
    this.fx.hitstop(ms);
    setTimeout(() => {
      if (!this.sys.isActive()) return;
      this.tweens.timeScale = this.speed;
      this.time.timeScale = this.speed;
    }, ms + 10);
  }
}
