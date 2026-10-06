import Phaser from 'phaser';
import type { BotInput, PlayerView } from '../../flow/types';
import { clouds, gradientBackdrop, sun } from '../../kit/scenery';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, N, W } from '../../kit/theme';
import { label } from '../../kit/ui';
import type { Blok } from '../../objects/Blok';
import { RitualScene } from '../_framework/RitualScene';
import { emoji, lures, rand, revealPick, ritualHeader, shout, wait, waitLayout, type Header } from '../_framework/ritualKit';
import * as art from './art';

const FLOOR = 900;
const XS = [300, 740, 1180, 1620];
const ROOF_COLORS = ['#e0584a', '#5a7ad6', '#3cae5a', '#e09a3a'];
/** Duen kan fanges når den er så lavt og så tæt på en spiller. */
const CATCH_Y = 540;
const CATCH_DX = 150;
const HUNT_MAX = 12;
const STUN = 0.8;
const PIGEON_SCALE = 0.95;

type Phase = 'intro' | 'hunt' | 'caught';

interface Catcher {
  p: PlayerView;
  blok: Blok;
  stun: number;
  whiffs: number;
}

/**
 * DUE-POSTEN: en forvirret brevdue flakser rundt over byens tage. Den der trykker FANG!, mens duen
 * dykker forbi lige over hovedet, får brevet – og i brevet står næste minigame.
 */
export class DueScene extends RitualScene {
  private phase: Phase = 'intro';
  private header!: Header;
  private catchers: Catcher[] = [];
  private pigeon!: Phaser.GameObjects.Container;
  private body!: Phaser.GameObjects.Image;
  private wing!: Phaser.GameObjects.Image;
  private pos = { x: -150, y: 380 };
  private vel = { x: 0, y: 0 };
  private target = { x: 400, y: 360, speed: 480, swoop: false };
  private sinceSwoop = 0;
  private huntTime = 0;
  private nextHuh = 1.5;
  private ring!: Phaser.GameObjects.Image;
  private fang!: Phaser.GameObjects.Text;
  private guide!: Phaser.GameObjects.Graphics;
  private botReact: number[] = [];
  private botDelay: number[] = [];
  private botMiss: boolean[] = [];
  private tired = false;

  constructor() {
    super('ritual-due');
  }

  preload(): void {
    loadSvg(this, 'due-skyline', art.skylineSvg(), 1920, 420);
    loadSvg(this, 'due-houses', art.houseRowSvg(), 1920, 360);
    ROOF_COLORS.forEach((c, i) => loadSvg(this, `due-roof-${i}`, art.roofSvg(c, i % 2 === 0), 480, 300));
    loadSvg(this, 'due-pigeon', art.pigeonSvg(), 240, 200);
    loadSvg(this, 'due-wing', art.wingSvg(), 170, 110);
    loadSvg(this, 'due-env', art.envelopeSvg(), 220, 150);
    loadSvg(this, 'due-bigenv', art.bigEnvelopeSvg(), 420, 290);
    loadSvg(this, 'due-flap', art.flapSvg(), 420, 170);
    loadSvg(this, 'due-letter', art.letterSvg(), 360, 260);
    for (let i = 0; i < 3; i++) loadSvg(this, `due-laundry-${i}`, art.laundrySvg(i), [70, 110, 100][i], [90, 100, 70][i]);
    loadSvg(this, 'due-feather', art.featherSvg(), 40, 60);
    loadSvg(this, 'due-huh', art.questionSvg(), 70, 90);
  }

  protected setup(): void {
    this.phase = 'intro';
    this.catchers = [];
    this.pos = { x: -150, y: 380 };
    this.vel = { x: 0, y: 0 };
    this.target = { x: 420, y: 360, speed: 480, swoop: false };
    this.sinceSwoop = 0;
    this.huntTime = 0;
    this.nextHuh = 1.5;
    this.tired = false;
    this.botReact = this.players.map(() => 0);
    this.botDelay = this.players.map(() => rand(this, 0.15, 0.45));
    this.botMiss = this.players.map(() => false);

    this.buildWorld();
    this.buildPlayers();
    this.buildPigeon();

    this.header = ritualHeader(this, 'DUE-POSTEN', 'Tryk FANG! når duen dykker over DIG!', '#3a8ae0');
    this.setLayoutAll(() => ({ kind: 'mash', label: 'FANG!', icon: '🕊️', hint: 'Tryk når duen er lige over dit hoved!' }));
    this.time.delayedCall(2600, () => {
      this.phase = 'hunt';
      shout(this, 'FANG DUEN!', { color: C.sun, size: 170, hold: 600 });
      this.sfx('go');
    });
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    gradientBackdrop(this, '#4aa8ff', '#ffe2b8');
    sun(this, 1730, 150, 0.8);
    clouds(this, 5, 40, 400);
    this.add.image(W / 2, 900, 'due-skyline').setOrigin(0.5, 1).setDepth(-8000).setAlpha(0.9);

    // Breve der blæser forbi med minigame-frimærker (lokkemad)
    lures(this, 5).forEach((l, i) => {
      const c = this.add.container(-200 - i * 420, 230 + (i % 3) * 110).setDepth(-7800).setScale(0.55);
      c.add([this.add.image(0, 0, 'due-env'), emoji(this, 63, -27, l.icon, 34)]);
      this.tweens.add({ targets: c, x: W + 300, duration: 26000, repeat: -1, delay: 0 });
      this.tweens.add({ targets: c, y: c.y + 50, angle: { from: -14, to: 14 }, duration: 1600 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    this.add.image(W / 2, 1000, 'due-houses').setOrigin(0.5, 1).setDepth(-7000);
    // Dis over baggrunden, så figurerne træder frem
    this.add.rectangle(W / 2, 760, W, 520, 0xdbeeff, 0.28).setDepth(-6900);

    // Tagene
    XS.forEach((x, i) => {
      this.add.image(x, FLOOR - 12, `due-roof-${i}`).setOrigin(0.5, 0).setDepth(10);
      if (i % 2 === 0) {
        this.add
          .particles(x + 119, FLOOR - 14, TEX.puff, {
            speedY: { min: -90, max: -50 },
            speedX: { min: 10, max: 40 },
            scale: { start: 0.5, end: 1.6 },
            alpha: { start: 0.6, end: 0 },
            tint: [0xd0d0e0, 0xb0b0c8],
            lifespan: 2200,
            frequency: 260,
          })
          .setDepth(5);
      }
    });

    // Tørresnore med vasketøj
    const g = this.add.graphics().setDepth(12);
    const lines: [number, number, number, number][] = [
      [XS[0] + 120, FLOOR - 4, XS[1] - 92, FLOOR + 8],
      [XS[2] + 120, FLOOR - 4, XS[3] - 92, FLOOR + 8],
    ];
    lines.forEach(([x1, y1, x2, y2], li) => {
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x1, y1), new Phaser.Math.Vector2((x1 + x2) / 2, Math.max(y1, y2) + 50), new Phaser.Math.Vector2(x2, y2));
      g.lineStyle(4, N.ink, 1).strokePoints(curve.getPoints(20));
      [0.3, 0.6].forEach((t, k) => {
        const pt = curve.getPoint(t);
        const item = this.add.image(pt.x, pt.y, `due-laundry-${(li + k) % 3}`).setOrigin(0.5, 0.05).setScale(0.6).setDepth(13);
        this.tweens.add({ targets: item, angle: { from: -10, to: 10 }, duration: 700 + k * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    });
  }

  private buildPlayers(): void {
    this.ring = this.add.image(0, FLOOR, TEX.ring).setDisplaySize(220, 70).setDepth(FLOOR - 1).setAlpha(0);
    this.guide = this.add.graphics().setDepth(4000);
    for (const p of this.players) {
      const blok = this.spawnBlok(p, XS[p.slot], FLOOR, { size: 0.9 }).setDepth(FLOOR);
      this.catchers.push({ p, blok, stun: 0, whiffs: 0 });
    }
    this.fang = label(this, 0, FLOOR - 300, 'FANG!', 46, { color: C.mint }).setDepth(FLOOR + 50).setVisible(false);
  }

  private buildPigeon(): void {
    this.body = this.add.image(0, 0, 'due-pigeon');
    this.wing = this.add.image(-6, -14, 'due-wing').setOrigin(0.1, 0.3);
    this.pigeon = this.add.container(this.pos.x, this.pos.y, [this.body, this.wing]).setDepth(5000).setScale(PIGEON_SCALE);
  }

  // ---------------------------------------------------------------------------
  // Duen

  private nearest(): { c: Catcher; dx: number } {
    let best = this.catchers[0];
    for (const c of this.catchers) if (Math.abs(c.blok.x - this.pos.x) < Math.abs(best.blok.x - this.pos.x)) best = c;
    return { c: best, dx: Math.abs(best.blok.x - this.pos.x) };
  }

  private catchable(slot: number): boolean {
    if (this.phase !== 'hunt' || this.huntTime < 0.8) return false;
    const n = this.nearest();
    return n.c.p.slot === slot && n.dx < CATCH_DX && this.pos.y >= CATCH_Y;
  }

  private pickTarget(): void {
    if (this.tired) return;
    if (this.sinceSwoop > rand(this, 1.4, 2.4) && this.phase === 'hunt') {
      const c = this.catchers[Math.floor(this.rng() * this.catchers.length)];
      this.target = { x: c.blok.x + rand(this, -50, 50), y: 640, speed: 620, swoop: true };
      this.sinceSwoop = 0;
    } else {
      this.target = { x: rand(this, 160, W - 160), y: rand(this, 310, 480), speed: rand(this, 420, 560), swoop: false };
    }
  }

  private flyPigeon(dt: number): void {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const d = Math.hypot(dx, dy);
    if (d < 40) {
      if (this.target.swoop) this.target = { x: this.pos.x + (this.vel.x >= 0 ? 260 : -260), y: rand(this, 280, 400), speed: 520, swoop: false };
      else this.pickTarget();
    }
    const dvx = (dx / (d || 1)) * this.target.speed;
    const dvy = (dy / (d || 1)) * this.target.speed;
    const k = Math.min(1, dt * 3.2);
    this.vel.x += (dvx - this.vel.x) * k;
    this.vel.y += (dvy - this.vel.y) * k;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.sinceSwoop += dt;

    const t = this.elapsed;
    this.pigeon.setPosition(this.pos.x, this.pos.y + Math.sin(t * 6) * 10);
    const right = this.vel.x >= 0;
    this.body.setFlipX(!right);
    this.wing.setFlipX(!right).setOrigin(right ? 0.1 : 0.9, 0.3).setX(right ? -6 : 6);
    const flap = Math.sin(t * (this.tired ? 10 : 22)) * 38;
    this.wing.angle = right ? -flap : flap;
    this.pigeon.angle = Phaser.Math.Clamp(this.vel.y / 30, -18, 18) * (right ? 1 : -1);

    // Forvirring
    this.nextHuh -= dt;
    if (this.nextHuh <= 0) {
      this.nextHuh = rand(this, 1.6, 2.8);
      const q = this.add.image(this.pos.x + 30, this.pos.y - 90, 'due-huh').setDepth(5100).setScale(0);
      this.tweens.add({ targets: q, scale: 0.7, y: q.y - 40, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({ targets: q, alpha: 0, delay: 700, duration: 300, onComplete: () => q.destroy() });
      this.sfx('cluck', { pitch: 0.6, volume: 0.5, pan: this.panFor(this.pos.x) });
    }
  }

  // ---------------------------------------------------------------------------
  // Spil

  protected play(dt: number): void {
    if (this.phase === 'caught') return;
    this.flyPigeon(dt);
    if (this.phase !== 'hunt') return;
    this.huntTime += dt;

    // Træt due: lander på den nærmeste
    if (this.huntTime > HUNT_MAX && !this.tired) {
      this.tired = true;
      const n = this.nearest();
      this.target = { x: n.c.blok.x, y: FLOOR - 230, speed: 300, swoop: false };
      this.header.setHint('Duen er træt …', C.cream);
    }
    if (this.tired && Math.hypot(this.target.x - this.pos.x, this.target.y - this.pos.y) < 50) {
      void this.catchSequence(this.nearest().c);
      return;
    }

    // Hvem "har" duen lige nu?
    const n = this.nearest();
    const can = this.catchable(n.c.p.slot);
    this.ring.setPosition(n.c.blok.x, FLOOR + 2).setAlpha(n.dx < 300 ? (can ? 1 : 0.55) : 0);
    this.ring.setTint(can ? N.mint : 0xffffff);
    this.ring.setDisplaySize(can ? 240 + Math.sin(this.elapsed * 20) * 20 : 200, can ? 78 : 64);
    this.fang.setVisible(can).setPosition(n.c.blok.x, FLOOR - 300 + Math.sin(this.elapsed * 14) * 6);
    const g = this.guide;
    g.clear();
    if (n.dx < 300) {
      const steps = 10;
      const hx = n.c.blok.x;
      const hy = FLOOR - 220;
      g.fillStyle(can ? N.mint : 0xffffff, can ? 0.9 : 0.45);
      for (let i = 1; i < steps; i++) {
        const k = i / steps;
        g.fillCircle(this.pos.x + (hx - this.pos.x) * k, this.pos.y + 30 + (hy - this.pos.y - 30) * k, 5);
      }
    }

    for (const c of this.catchers) {
      c.stun = Math.max(0, c.stun - dt);
      if (!this.pressed(c.p.slot) || c.stun > 0) continue;
      if (this.catchable(c.p.slot)) {
        void this.catchSequence(c);
        return;
      }
      this.whiff(c);
    }
  }

  private whiff(c: Catcher): void {
    c.stun = STUN;
    c.whiffs++;
    c.blok.hop(90, 220);
    this.fx.floatText(c.blok.x, FLOOR - 320, ['BOM!', 'HOV!', 'LUFT!'][c.whiffs % 3], C.tomato, 48);
    this.sfx('swish', { pan: this.panFor(c.blok.x) });
    this.sfx('wrong', { delay: 0.15, volume: 0.5 });
    this.vibrate(c.p.slot, 120);
    this.time.delayedCall(260, () => c.blok.bonk());
  }

  private async catchSequence(c: Catcher): Promise<void> {
    if (this.phase === 'caught') return;
    this.phase = 'caught';
    this.ring.setAlpha(0);
    this.fang.setVisible(false);
    this.guide.clear();
    this.header.setHint(`${c.p.name} fangede duen!`, C.sun);
    shout(this, 'FANGET!', { color: C.mint, size: 190, hold: 600 });
    this.sfx('cluck', { pitch: 1.3 });
    this.sfx('pop');
    this.fx.shake(0.008, 200);
    this.vibrate(c.p.slot, 250);
    // Hop op og grib
    c.blok.hop(120, 260);
    this.tweens.add({ targets: this.pigeon, x: c.blok.x, y: FLOOR - 250, angle: 0, duration: 200, ease: 'Quad.easeOut' });
    this.fx.burst(c.blok.x, FLOOR - 250, { texture: 'due-feather', count: 14, speed: 520, gravity: 300, scale: 0.9, lifespan: 1300 });
    for (const o of this.catchers) (o === c ? o.blok.cheer() : o.blok.sad());
    this.tweens.add({ targets: this.wing, angle: { from: -50, to: 50 }, duration: 60, yoyo: true, repeat: 10 });
    await wait(this, 700);

    // Brevet falder ud – duen flakser forvirret væk
    const env = this.add.image(c.blok.x, FLOOR - 250, 'due-env').setDepth(7000).setScale(0.4);
    this.sfx('whoosh');
    this.tweens.add({ targets: this.pigeon, x: W + 250, y: -150, duration: 1300, ease: 'Quad.easeIn' });
    this.body.setFlipX(false);
    this.wing.setFlipX(false).setOrigin(0.1, 0.3).setX(-6);
    this.tweens.add({ targets: this.wing, angle: { from: -40, to: 40 }, duration: 70, yoyo: true, repeat: 18 });
    const q = this.add.image(c.blok.x + 40, FLOOR - 360, 'due-huh').setDepth(7100).setScale(0.8);
    this.tweens.add({ targets: q, x: W + 260, y: -100, duration: 1300, ease: 'Quad.easeIn', onComplete: () => q.destroy() });
    await new Promise<void>((res) => this.tweens.add({ targets: env, x: W / 2, y: 560, scale: 1.6, angle: 720, duration: 700, ease: 'Cubic.easeOut', onComplete: () => res() }));
    env.destroy();

    // Den store kuvert
    const box = this.add.container(W / 2, 560).setDepth(7000);
    const letter = this.add.image(0, 10, 'due-letter').setScale(0.95);
    const icon = emoji(this, 0, -20, this.pick.icon, 110);
    const letterC = this.add.container(0, 0, [letter, icon]);
    const bodyImg = this.add.image(0, 0, 'due-bigenv');
    const flap = this.add.image(0, -137, 'due-flap').setOrigin(0.5, 0.05);
    box.add([letterC, bodyImg, flap]);
    this.fx.flash(0xffffff, 150, 0.5);
    this.sfx('bonk');
    this.header.hide();
    this.sfx('drumroll');
    this.tweens.add({ targets: box, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 9 });
    await wait(this, 1100);

    // Klappen åbnes
    this.sfx('swish');
    await new Promise<void>((res) => this.tweens.add({ targets: flap, scaleY: 0, duration: 160, ease: 'Quad.easeIn', onComplete: () => res() }));
    flap.setFlipY(true).setOrigin(0.5, 0.95);
    this.tweens.add({ targets: flap, scaleY: 1, duration: 200, ease: 'Back.easeOut' });
    // Brevet glider op
    this.sfx('powerup');
    await new Promise<void>((res) => this.tweens.add({ targets: letterC, y: -230, duration: 520, ease: 'Back.easeOut', onComplete: () => res() }));
    box.bringToTop(letterC);
    this.fx.burst(W / 2, 330, { texture: TEX.star, color: [N.sun, 0xffffff, N.sky], count: 20, speed: 700, scale: 0.6 });
    this.sfx('coin');
    await wait(this, 500);
    this.tweens.add({ targets: box, scale: 0, alpha: 0, duration: 300, delay: 300, ease: 'Back.easeIn' });
    await revealPick(this, { x: W / 2, y: 330, winner: c.p, caption: `🕊️ ${c.p.name} fangede duen!` });
    if (!this.sys.isActive()) return;
    this.setLayoutAll(() => waitLayout(this));
    this.done({ winner: c.p.slot });
  }

  // ---------------------------------------------------------------------------
  // Bots: reagerer (ikke perfekt) når duen dykker over dem – og fumler af og til.

  protected botInput(slot: number, dt: number): BotInput | null {
    if (this.phase !== 'hunt') return null;
    const c = this.catchers[slot];
    if (!c || c.stun > 0) return null;
    if (this.catchable(slot)) {
      if (this.botReact[slot] === 0) {
        this.botDelay[slot] = rand(this, 0.12, 0.5);
        this.botMiss[slot] = this.rng() < (this.huntTime < 4.5 ? 0.7 : 0.3);
      }
      this.botReact[slot] += dt;
      if (!this.botMiss[slot] && this.botReact[slot] >= this.botDelay[slot]) return { tap: true };
      return null;
    }
    this.botReact[slot] = 0;
    const dx = Math.abs(c.blok.x - this.pos.x);
    if (dx < 260 && this.pos.y > 430 && this.rng() < dt * 0.35) return { tap: true };
    return null;
  }
}
