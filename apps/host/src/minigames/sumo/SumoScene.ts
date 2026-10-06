import Phaser from 'phaser';
import { rankByElimination } from '../../game/scoring';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { title } from '../../kit/ui';
import { gradientBackdrop } from '../../kit/scenery';
import type { BotInput } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import { PAN, arrowSvg, flameSvg, meatballSvg, panSvg, steamSvg, tileSvg } from './art';

const BALL_R = 62;
const ACCEL = 1500;
const MAX_SPEED = 560;
const FRICTION = 2.2;
const DASH_SPEED = 1050;
const DASH_COOLDOWN = 1.2;
/** Hvor meget af panden der er sikker ved slut (resten er glohed). */
const MIN_SAFE = 0.62;

interface Ball {
  slot: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dashCd: number;
  out: boolean;
  ball: Phaser.GameObjects.Image;
  rider: Blok;
  lastHitBy: number;
}

/**
 * SUMO-FRIKADELLER (alle mod alle, inspireret af Bumper Balls).
 * Hver spiller balancerer på en kæmpe frikadelle i en stegepande. Skub de andre ud!
 * Panden bliver varmere (kanten gløder og den sikre zone skrumper) og vipper, så alle glider.
 *
 * Reference-implementation: viser SVG-grafik, bots, juice, lyd, statistik og rangering.
 */
export class SumoScene extends MinigameScene {
  protected duration = 45;
  private balls: Ball[] = [];
  private eliminated: number[] = [];
  private safe = 1;
  private tilt = { angle: 0, strength: 0 };
  private heatRing!: Phaser.GameObjects.Graphics;
  private arrow!: Phaser.GameObjects.Image;
  private steam!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sizzleTimer = 0;

  constructor() {
    super('sumo');
  }

  preload(): void {
    loadSvg(this, 'sumo-pan', panSvg(), 1400, 860);
    loadSvg(this, 'sumo-ball', meatballSvg(), 170, 170);
    loadSvg(this, 'sumo-flame', flameSvg(), 120, 180);
    loadSvg(this, 'sumo-tile', tileSvg(), 120, 120);
    loadSvg(this, 'sumo-steam', steamSvg(), 100, 100);
    loadSvg(this, 'sumo-arrow', arrowSvg(), 200, 120);
  }

  protected setup(): void {
    this.balls = [];
    this.eliminated = [];
    this.safe = 1;
    this.tilt = { angle: this.rng() * Math.PI * 2, strength: 0 };

    // Køkkenvæg: fliser + varm gradient
    gradientBackdrop(this, '#ffb36b', '#7a2a1a');
    this.add.tileSprite(W / 2, 260, W, 520, 'sumo-tile').setAlpha(0.55).setDepth(-9000);
    this.add.rectangle(W / 2, 540, W, 40, N.ink, 0.5).setDepth(-8900);
    this.add.rectangle(W / 2, 820, W, 560, 0x2b2238).setDepth(-8800);
    this.add.rectangle(W / 2, 545, W, 14, 0xc0c8d8).setDepth(-8800);

    // Flammer under panden
    for (let i = 0; i < 9; i++) {
      const x = PAN.cx - 520 + i * 130;
      const flame = this.add.image(x, PAN.cy + 300 + Math.abs(i - 4) * -8, 'sumo-flame').setOrigin(0.5, 1).setDepth(-600).setScale(0.8);
      this.tweens.add({ targets: flame, scaleY: { from: 0.7, to: 1.05 }, scaleX: { from: 0.85, to: 0.7 }, duration: 160 + i * 17, yoyo: true, repeat: -1 });
    }

    this.add.image(PAN.cx, PAN.cy, 'sumo-pan').setDepth(-500);
    this.heatRing = this.add.graphics().setDepth(-400);

    // Damp der stiger op
    this.steam = this.add.particles(0, 0, 'sumo-steam', {
      x: { min: PAN.cx - PAN.rx * 0.8, max: PAN.cx + PAN.rx * 0.8 },
      y: { min: PAN.cy - PAN.ry * 0.5, max: PAN.cy + PAN.ry * 0.5 },
      speedY: { min: -120, max: -60 },
      scale: { start: 0.4, end: 1.4 },
      alpha: { start: 0.35, end: 0 },
      lifespan: 1800,
      frequency: 260,
    });
    this.steam.setDepth(5000);

    // Vippe-pil
    this.arrow = this.add.image(PAN.cx, 150, 'sumo-arrow').setScale(0.7).setDepth(6000).setAlpha(0);
    title(this, PAN.cx, 230, 'Panden vipper!', 44, { color: C.sun }).setDepth(6000).setAlpha(0).setName('tiltLabel');

    // Spillere i en firkant
    const starts = [
      [-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4],
    ];
    for (const p of this.players) {
      const [sx, sy] = starts[p.slot];
      const r = BALL_R * this.chaos.size;
      const x = PAN.cx + sx * PAN.rx;
      const y = PAN.cy + sy * PAN.ry;
      const ball = this.add.image(x, y, 'sumo-ball').setDisplaySize(r * 2, r * 2);
      const rider = this.spawnBlok(p, x, y - r * 1.15, { size: 0.62 });
      this.balls.push({ slot: p.slot, x, y, vx: 0, vy: 0, r, dashCd: 0, out: false, ball, rider, lastHitBy: -1 });
    }
  }

  protected onStart(): void {
    this.say('Skub dem ud af panden!');
  }

  protected play(dt: number): void {
    const progress = this.duration ? 1 - this.timeLeft / this.duration : 0;

    // Panden bliver varmere: den sikre zone skrumper efter 30 % af tiden.
    this.safe = progress < 0.3 ? 1 : 1 - (1 - MIN_SAFE) * Math.min(1, (progress - 0.3) / 0.6);
    this.drawHeat(progress);

    // Panden vipper: en langsomt roterende glide-kraft.
    this.tilt.angle += dt * 0.35;
    this.tilt.strength = progress < 0.15 ? 0 : 160 + progress * 220;
    this.arrow.setAlpha(this.tilt.strength > 0 ? 0.95 : 0).setRotation(this.tilt.angle);
    (this.children.getByName('tiltLabel') as Phaser.GameObjects.Text | null)?.setAlpha(this.tilt.strength > 0 ? 1 : 0);

    for (const b of this.balls) {
      if (b.out) continue;
      const pad = this.pad(b.slot);
      b.vx += (pad.x * ACCEL + Math.cos(this.tilt.angle) * this.tilt.strength) * dt;
      b.vy += (pad.y * ACCEL * 0.7 + Math.sin(this.tilt.angle) * this.tilt.strength * 0.6) * dt;

      b.dashCd = Math.max(0, b.dashCd - dt);
      if (this.pressedA(b.slot) && b.dashCd <= 0) this.dash(b, pad.x, pad.y);

      const speed = Math.hypot(b.vx, b.vy);
      const max = b.dashCd > DASH_COOLDOWN - 0.25 ? DASH_SPEED : MAX_SPEED;
      if (speed > max) {
        b.vx *= max / speed;
        b.vy *= max / speed;
      }
      const f = Math.exp(-FRICTION * dt);
      b.vx *= f;
      b.vy *= f;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    this.collide();

    for (const b of this.balls) {
      if (b.out) continue;
      const nx = (b.x - PAN.cx) / (PAN.rx * this.safe);
      const ny = (b.y - PAN.cy) / (PAN.ry * this.safe);
      if (nx * nx + ny * ny > 1) this.knockOut(b);
      this.drawBall(b, dt);
    }

    // Spillet slutter når der kun er én tilbage.
    const alive = this.balls.filter((b) => !b.out);
    if (alive.length <= 1) this.finish(rankByElimination(this.eliminated, this.players.length));

    this.sizzleTimer -= dt;
    if (this.sizzleTimer <= 0) {
      this.sizzleTimer = 1.4 - progress * 0.8;
      this.sfx('sizzle', { volume: 0.25 + progress * 0.4 });
    }
  }

  protected timeUp(): number[][] {
    return rankByElimination(this.eliminated, this.players.length);
  }

  // ---------------------------------------------------------------------------

  private dash(b: Ball, dx: number, dy: number): void {
    let len = Math.hypot(dx, dy);
    if (len < 0.2) {
      dx = b.vx;
      dy = b.vy;
      len = Math.hypot(dx, dy) || 1;
    }
    b.vx = (dx / len) * DASH_SPEED;
    b.vy = (dy / len) * DASH_SPEED * 0.7;
    b.dashCd = DASH_COOLDOWN;
    this.fx.dust(b.x, b.y + b.r * 0.6, 10);
    this.sfx('whoosh', { pan: this.panFor(b.x) });
    b.rider.squash(1.3, 0.75);
    this.vibrate(b.slot, 25);
  }

  private collide(): void {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        if (a.out || b.out) continue;
        const dx = b.x - a.x;
        const dy = (b.y - a.y) * 1.35;
        const dist = Math.hypot(dx, dy) || 0.01;
        const min = a.r + b.r;
        if (dist >= min) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        // Skil dem ad
        const overlap = (min - dist) / 2;
        a.x -= nx * overlap;
        a.y -= (ny * overlap) / 1.35;
        b.x += nx * overlap;
        b.y += (ny * overlap) / 1.35;
        // Elastisk stød med lidt ekstra "boing"
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel > 0) continue;
        const impulse = -rel * 1.25;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        a.lastHitBy = b.slot;
        b.lastHitBy = a.slot;

        const strength = Math.min(1, -rel / 900);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        this.sfx('bonk', { volume: 0.4 + strength * 0.8, pitch: 1.2 - strength * 0.4, pan: this.panFor(mx) });
        a.rider.bonk();
        b.rider.bonk();
        if (strength > 0.35) {
          this.fx.stars(mx, my - 40, N.sun, 6);
          this.fx.shake(0.004 + strength * 0.008, 140);
          this.vibrate(a.slot, 60);
          this.vibrate(b.slot, 60);
          const pusher = Math.hypot(a.vx, a.vy) < Math.hypot(b.vx, b.vy) ? b : a;
          this.stat(pusher.slot, 'bonks');
        }
        if (strength > 0.7) this.fx.hitstop(60);
      }
    }
  }

  private knockOut(b: Ball): void {
    b.out = true;
    this.eliminated.push(b.slot);
    this.stat(b.slot, 'falls');
    if (b.lastHitBy >= 0) this.stat(b.lastHitBy, 'bonks');
    this.vibrate(b.slot, 300);
    this.sfx('scream', { pan: this.panFor(b.x) });
    this.sfx('splash', { delay: 0.35 });
    this.fx.shake(0.012, 260);
    this.fx.flash(0xff8a2b, 160, 0.35);
    this.fx.floatText(b.x, b.y - 180, 'UD!', C.tomato, 80);
    b.rider.spinOut(2, 700);
    // Flyv ud over kanten og ned i flammerne
    const dirX = Math.sign(b.x - PAN.cx) || 1;
    this.tweens.add({ targets: [b.ball, b.rider], x: `+=${dirX * 220}`, duration: 700, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: [b.ball, b.rider],
      y: `+=${H}`,
      duration: 900,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.fx.burst(b.ball.x, H - 40, { texture: TEX.drop, color: [0xffcf3a, 0xff8a2b], count: 16, speed: 700, gravity: 1400 });
      },
    });
    const remaining = this.balls.filter((x) => !x.out).length;
    if (remaining > 1) this.say('ouch');
  }

  private drawBall(b: Ball, dt: number): void {
    b.ball.setPosition(b.x, b.y);
    b.ball.rotation += (b.vx / b.r) * dt;
    b.ball.setDepth(b.y);
    // Rytteren tripper på toppen og læner sig i bevægelsesretningen.
    b.rider.setPosition(b.x, b.y - b.r * 1.15 + 6);
    b.rider.setDepth(b.y + 1);
    b.rider.walk(b.vx / MAX_SPEED, b.vy / MAX_SPEED, dt * 1000 * 1.6);
    b.rider.angle = Phaser.Math.Clamp(b.vx / 40, -14, 14);
  }

  private drawHeat(progress: number): void {
    const g = this.heatRing;
    g.clear();
    if (this.safe >= 0.999) return;
    const pulse = 0.55 + Math.sin(this.elapsed * 8) * 0.2;
    // Den glohede ring mellem den sikre zone og pandens kant
    for (let i = 0; i < 6; i++) {
      const t = this.safe + ((1 - this.safe) * i) / 6;
      g.lineStyle(26, i % 2 ? 0xff3b1a : 0xff8a2b, pulse * (0.35 + progress * 0.4));
      g.strokeEllipse(PAN.cx, PAN.cy, PAN.rx * 2 * t, PAN.ry * 2 * t);
    }
    g.lineStyle(8, 0xffe066, 0.9);
    g.strokeEllipse(PAN.cx, PAN.cy, PAN.rx * 2 * this.safe, PAN.ry * 2 * this.safe);
  }

  // ---------------------------------------------------------------------------
  // Bots: hold dig væk fra kanten, jag den nærmeste, spurt når du er tæt på.

  protected botInput(slot: number): BotInput | null {
    const me = this.balls.find((b) => b.slot === slot);
    if (!me || me.out) return null;
    const ex = (me.x - PAN.cx) / (PAN.rx * this.safe);
    const ey = (me.y - PAN.cy) / (PAN.ry * this.safe);
    const edge = Math.hypot(ex, ey);
    if (edge > 0.68) {
      // Tilbage mod midten (og modvirk tilt)
      const len = Math.hypot(ex, ey) || 1;
      return { x: -ex / len, y: -ey / len, a: false };
    }
    const targets = this.balls.filter((b) => !b.out && b.slot !== slot);
    if (!targets.length) return { x: 0, y: 0 };
    targets.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
    const t = targets[0];
    const dx = t.x - me.x;
    const dy = t.y - me.y;
    const dist = Math.hypot(dx, dy) || 1;
    const close = dist < 260 && me.dashCd <= 0 && this.rng() < 0.08;
    const wobble = Math.sin(this.elapsed * 2 + slot) * 0.25;
    return { x: dx / dist + wobble, y: dy / dist, a: close };
  }
}
