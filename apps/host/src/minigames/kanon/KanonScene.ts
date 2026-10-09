import Phaser from 'phaser';
import { clouds, sun } from '../../kit/scenery';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { label, panelKey, panelSvg } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  ARENA,
  barnSvg,
  barrelSvg,
  chickSvg,
  chickenSvg,
  eggSvg,
  farmSkySvg,
  featherSvg,
  fenceSvg,
  goldEggSvg,
  haySvg,
  railSvg,
  reticleSvg,
  shellSvg,
  siloSvg,
  splatSvg,
  warnSvg,
  wheelSvg,
  windmillBladesSvg,
  windmillTowerSvg,
  yardSvg,
} from './art';

const RAIL_Y = 372;
const HEARTS = 3;
const SPEED = 470;
const JUMP_AIR = 0.5;
const JUMP_CD = 1.05;
const SHOT_CD = 0.42;
const MEGA_CD = 6;
const RETICLE_SPEED = 1150;
const CANNON_SPEED = 900;
const EGG_R = 92;
const MEGA_R = 160;
/** Ellipse-faktor: jorden er set lidt fra oven. */
const FLAT = 1.6;
const CHICKEN_SCALE = 0.84;

interface Runner {
  player: PlayerView;
  blok: Blok;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hearts: number;
  out: boolean;
  inv: number;
  air: number;
  jumpCd: number;
  heartIcons: Phaser.GameObjects.Image[];
  hudHearts: Phaser.GameObjects.Image[];
  hudName: Phaser.GameObjects.Text;
  botTarget: { x: number; y: number };
  botRetarget: number;
}

interface Egg {
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  arc: number;
  mega: boolean;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  warn: Phaser.GameObjects.Image;
  /** Bot-beslutninger pr. plads: opdager ægget / hopper i sidste øjeblik. */
  notice: Record<number, number>;
  jump: Record<number, boolean>;
}

interface Puddle {
  x: number;
  y: number;
  r: number;
  life: number;
  img: Phaser.GameObjects.Image;
}

/**
 * KANON-KYLLINGEN (1 mod 3, inspireret af Snowball Summit).
 * Eneren styrer en kæmpe kylling-kanon på en skinne og skyder æg ned på gårdspladsen.
 * Trioen løber og hopper for at undgå æggene. Hver har 3 hjerter. Er alle ude før tid, vinder eneren.
 */
export class KanonScene extends MinigameScene {
  protected duration = 40;
  protected music = 'silly' as const;

  private runners: Runner[] = [];
  private eggs: Egg[] = [];
  private puddles: Puddle[] = [];
  private cannonX = W / 2;
  private cannonV = 0;
  private reticle = { x: W / 2, y: 720 };
  private shotCd = 0;
  private megaCd = 2;
  private hits = 0;
  private ending = false;
  private outOrder: number[] = [];

  private chicken!: Phaser.GameObjects.Image;
  private barrel!: Phaser.GameObjects.Image;
  private wheels: Phaser.GameObjects.Image[] = [];
  private gunner!: Blok;
  private reticleImg!: Phaser.GameObjects.Image;
  private hitsText!: Phaser.GameObjects.Text;
  private megaBar!: Phaser.GameObjects.Graphics;
  private botAim = { slot: -1, until: 0, lead: 0.7, ox: 0, oy: 0 };

  constructor() {
    super('kanon');
  }

  preload(): void {
    loadSvg(this, 'kn-sky', farmSkySvg(), 1920, 460);
    loadSvg(this, 'kn-barn', barnSvg(), 360, 320);
    loadSvg(this, 'kn-silo', siloSvg(), 170, 380);
    loadSvg(this, 'kn-mill-blades', windmillBladesSvg(), 200, 200);
    loadSvg(this, 'kn-mill-tower', windmillTowerSvg(), 140, 260);
    loadSvg(this, 'kn-yard', yardSvg(), 1920, 780);
    loadSvg(this, 'kn-fence', fenceSvg(), 384, 120);
    loadSvg(this, 'kn-rail', railSvg(), 1920, 70);
    loadSvg(this, 'kn-chicken', chickenSvg(), 340, 330);
    loadSvg(this, 'kn-barrel', barrelSvg(), 110, 170);
    loadSvg(this, 'kn-wheel', wheelSvg(), 90, 90);
    loadSvg(this, 'kn-egg', eggSvg(), 80, 100);
    loadSvg(this, 'kn-gold', goldEggSvg(), 80, 100);
    loadSvg(this, 'kn-splat', splatSvg(), 220, 130);
    loadSvg(this, 'kn-shell', shellSvg(), 32, 28);
    loadSvg(this, 'kn-reticle', reticleSvg(), 200, 120);
    loadSvg(this, 'kn-warn', warnSvg(), 200, 110);
    loadSvg(this, 'kn-hay', haySvg(), 200, 150);
    loadSvg(this, 'kn-chick', chickSvg(), 80, 80);
    loadSvg(this, 'kn-feather', featherSvg(), 40, 60);
    loadSvg(this, panelKey(420, 130, C.deep), panelSvg(420, 130, C.deep), 444, 160);
    loadSvg(this, panelKey(440, 190, C.deep), panelSvg(440, 190, C.deep), 464, 220);
  }

  protected setup(): void {
    this.runners = [];
    this.eggs = [];
    this.puddles = [];
    this.wheels = [];
    this.outOrder = [];
    this.hits = 0;
    this.ending = false;
    this.cannonX = W / 2;
    this.reticle = { x: W / 2, y: 720 };
    this.shotCd = 0;
    this.megaCd = 2;

    this.buildWorld();
    this.buildCannon();

    const trio = this.team(1);
    const starts = [
      [560, 760],
      [960, 860],
      [1360, 760],
    ];
    trio.forEach((p, i) => {
      const [x, y] = starts[i];
      const blok = this.spawnBlok(p, x, y, { size: 0.62 });
      const heartIcons = Array.from({ length: HEARTS }, () => this.add.image(x, y, TEX.heart).setScale(0.62).setDepth(7500));
      this.runners.push({
        player: p,
        blok,
        x,
        y,
        vx: 0,
        vy: 0,
        hearts: HEARTS,
        out: false,
        inv: 0,
        air: 0,
        jumpCd: 0,
        heartIcons,
        hudHearts: [],
        hudName: null as unknown as Phaser.GameObjects.Text,
        botTarget: { x, y },
        botRetarget: 0,
      });
    });

    this.buildHud();
    this.drawRunners(0);
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    this.add.image(W / 2, 230, 'kn-sky').setDepth(-9500);
    sun(this, 1220, 120, 0.7);
    clouds(this, 5, 40, 230, -9400);
    // Vindmølle
    this.add.image(1520, 420, 'kn-mill-tower').setOrigin(0.5, 1).setDepth(-9200).setScale(0.9);
    const blades = this.add.image(1520, 196, 'kn-mill-blades').setDepth(-9190).setScale(0.9);
    this.tweens.add({ targets: blades, angle: 360, duration: 7000, repeat: -1 });
    this.add.image(560, 430, 'kn-barn').setOrigin(0.5, 1).setDepth(-9100).setScale(0.78);
    this.add.image(1330, 430, 'kn-silo').setOrigin(0.5, 1).setDepth(-9100).setScale(0.75);

    this.add.image(W / 2, 1080 - 390, 'kn-yard').setDepth(-9000);
    this.add.image(W / 2, RAIL_Y + 8, 'kn-rail').setDepth(-6000);

    // Høballer og kyllinger rundt om arenaen
    const hay = [
      [90, 520, 0.8], [1830, 520, 0.8], [70, 980, 1], [1850, 980, 1],
    ];
    for (const [x, y, s] of hay) this.add.image(x, y, 'kn-hay').setOrigin(0.5, 0.9).setScale(s).setDepth(y);
    for (let i = 0; i < 4; i++) {
      const x = i < 2 ? 70 + i * 60 : W - 70 - (i - 2) * 60;
      const y = 700 + (i % 2) * 90;
      const chick = this.add.image(x, y, 'kn-chick').setOrigin(0.5, 0.9).setDepth(y).setScale(0.8);
      chick.setFlipX(i >= 2);
      this.tweens.add({ targets: chick, angle: { from: -12, to: 18 }, duration: 260 + i * 40, yoyo: true, repeat: -1, repeatDelay: 600 + i * 300, ease: 'Quad.easeInOut' });
      this.tweens.add({ targets: chick, y: y - 14, duration: 180, yoyo: true, repeat: -1, repeatDelay: 1400 + i * 500, ease: 'Quad.easeOut' });
    }

    // Hegn i forgrunden
    for (let x = 0; x < W + 384; x += 380) this.add.image(x, H - 26, 'kn-fence').setDepth(5000).setScale(1, 0.8);

    // Fnug i luften
    this.add.particles(0, 0, 'kn-feather', {
      x: { min: 0, max: W },
      y: -20,
      speedY: { min: 30, max: 70 },
      speedX: { min: -30, max: 30 },
      rotate: { min: -180, max: 180 },
      scale: { min: 0.3, max: 0.5 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 9000,
      frequency: 900,
    }).setDepth(4000);
  }

  private buildCannon(): void {
    this.barrel = this.add.image(this.cannonX, RAIL_Y - 46, 'kn-barrel').setOrigin(0.5, 0.12).setDepth(320).setScale(CHICKEN_SCALE);
    this.chicken = this.add.image(this.cannonX, RAIL_Y, 'kn-chicken').setOrigin(0.5, 0.86).setDepth(300).setScale(CHICKEN_SCALE);
    for (const dx of [-80, 80]) {
      this.wheels.push(this.add.image(this.cannonX + dx, RAIL_Y + 4, 'kn-wheel').setDepth(330).setScale(CHICKEN_SCALE * 0.9).setData('dx', dx));
    }
    this.fx.breathe(this.chicken, 0.025, 700);
    // Enerens figur sidder ved siden af og "styrer" kanonen
    this.gunner = this.spawnBlok(this.solo, this.cannonX - 205, RAIL_Y + 6, { size: 0.5 });
    this.gunner.setDepth(310);
    this.reticleImg = this.add.image(this.reticle.x, this.reticle.y, 'kn-reticle').setDepth(4500).setScale(0.9).setTint(this.solo.colorNum);
    this.tweens.add({ targets: this.reticleImg, angle: { from: -4, to: 4 }, scale: { from: 0.86, to: 0.96 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildHud(): void {
    const solo = this.solo;
    this.add.image(240, 82, panelKey(420, 130, C.deep)).setDepth(7000);
    label(this, 108, 44, 'ENEREN', 24, { color: C.sun }).setDepth(7001);
    label(this, 250, 80, solo.name, 34, { color: solo.color }).setDepth(7001);
    this.hitsText = label(this, 150, 120, 'Træffere: 0', 26, { color: C.cream }).setDepth(7001);
    label(this, 330, 120, 'MEGA', 22, { color: C.sun }).setDepth(7001);
    this.megaBar = this.add.graphics().setDepth(7001);

    this.add.image(W - 250, 112, panelKey(440, 190, C.deep)).setDepth(7000);
    label(this, W - 390, 44, 'TRIOEN', 24, { color: C.sun }).setDepth(7001);
    this.runners.forEach((r, i) => {
      const y = 86 + i * 50;
      r.hudName = label(this, W - 330, y, r.player.name, 28, { color: r.player.color }).setDepth(7001);
      r.hudHearts = Array.from({ length: HEARTS }, (_, k) => this.add.image(W - 160 + k * 44, y, TEX.heart).setScale(0.75).setDepth(7001));
    });
    this.updateHud();
  }

  private updateHud(): void {
    this.hitsText.setText(`Træffere: ${this.hits}`);
    for (const r of this.runners) {
      r.hudHearts.forEach((h, k) => h.setAlpha(k < r.hearts ? 1 : 0.18));
      r.hudName.setAlpha(r.out ? 0.45 : 1);
    }
  }

  private drawMegaBar(): void {
    const g = this.megaBar;
    g.clear();
    const frac = 1 - Math.max(0, this.megaCd) / MEGA_CD;
    g.fillStyle(N.ink, 1).fillRoundedRect(374, 110, 90, 22, 11);
    g.fillStyle(frac >= 1 ? N.sun : 0x8a7a3a, 1).fillRoundedRect(378, 114, 82 * frac, 14, 7);
  }

  // ---------------------------------------------------------------------------

  protected onStart(): void {
    this.say('cannonLoaded');
    this.sfx('cluck');
  }

  protected play(dt: number): void {
    this.updateCannon(dt);
    this.updateRunners(dt);
    this.updateEggs(dt);
    this.updatePuddles(dt);
    this.collideRunners();
    this.drawRunners(dt);
    this.drawMegaBar();

    const alive = this.runners.filter((r) => !r.out);
    if (!alive.length && !this.ending) {
      this.ending = true;
      this.time.delayedCall(700, () => this.finish(this.rankByTeam(0)));
    }
  }

  protected timeUp(): number[][] {
    const alive = this.runners.filter((r) => !r.out).length;
    if (alive) {
      this.say('cannonTrio', true);
      for (const r of this.runners) if (!r.out) r.blok.cheer();
    }
    return this.rankByTeam(alive ? 1 : 0);
  }

  private updateCannon(dt: number): void {
    const slot = this.solo.slot;
    const pad = this.pad(slot);
    this.reticle.x = Phaser.Math.Clamp(this.reticle.x + pad.x * RETICLE_SPEED * dt, ARENA.x0, ARENA.x1);
    this.reticle.y = Phaser.Math.Clamp(this.reticle.y + pad.y * RETICLE_SPEED * 0.75 * dt, ARENA.y0 + 40, ARENA.y1);
    this.reticleImg.setPosition(this.reticle.x, this.reticle.y);

    // Kanonen kører efter sigtet langs skinnen
    const want = Phaser.Math.Clamp(this.reticle.x, 520, W - 520);
    const dx = want - this.cannonX;
    this.cannonV = Phaser.Math.Clamp(dx * 6, -CANNON_SPEED, CANNON_SPEED);
    this.cannonX += this.cannonV * dt;
    this.chicken.x = this.cannonX;
    this.chicken.angle = Phaser.Math.Clamp(-this.cannonV / 120, -6, 6);
    for (const w of this.wheels) {
      w.x = this.cannonX + (w.getData('dx') as number) * CHICKEN_SCALE;
      w.rotation += (this.cannonV / 30) * dt;
    }
    this.gunner.setPosition(this.cannonX - 205, RAIL_Y + 6);
    this.gunner.walk(Math.abs(this.cannonV) > 40 ? Math.sign(this.cannonV) : 0, 0, dt * 1000);
    if (Math.abs(this.cannonV) < 40) this.gunner.setFacing(1);

    // Rør peger mod sigtet
    const pivot = { x: this.cannonX, y: RAIL_Y - 46 };
    const ang = Math.atan2(this.reticle.y - pivot.y, this.reticle.x - pivot.x) - Math.PI / 2;
    this.barrel.setPosition(pivot.x, pivot.y);
    this.barrel.rotation = Phaser.Math.Angle.RotateTo(this.barrel.rotation, Phaser.Math.Clamp(ang, -1.1, 1.1), 8 * dt);

    this.shotCd -= dt;
    this.megaCd -= dt;
    if (this.pressedB(slot) && this.megaCd <= 0) this.fire(true);
    else if (this.pressedA(slot) && this.shotCd <= 0) this.fire(false);
  }

  private fire(mega: boolean): void {
    if (mega) this.megaCd = MEGA_CD;
    this.shotCd = mega ? 0.7 : SHOT_CD;
    const len = 150 * CHICKEN_SCALE;
    const mx = this.barrel.x - Math.sin(this.barrel.rotation) * len;
    const my = this.barrel.y + Math.cos(this.barrel.rotation) * len;
    const tx = this.reticle.x + (this.rng() - 0.5) * 20;
    const ty = this.reticle.y + (this.rng() - 0.5) * 14;
    const dist = Math.hypot(tx - mx, ty - my);
    const dur = 0.55 + dist / 1700 + (mega ? 0.3 : 0);
    const img = this.add.image(mx, my, mega ? 'kn-gold' : 'kn-egg').setDepth(6000).setScale(mega ? 0.9 : 0.6);
    const shadow = this.add.image(mx, my, TEX.shadow).setDepth(-3500).setAlpha(0.3).setDisplaySize(60, 18);
    const warn = this.add.image(tx, ty, 'kn-warn').setDepth(-3600).setAlpha(0).setScale(mega ? 1.7 : 1);
    this.eggs.push({ x0: mx, y0: my, tx, ty, t: 0, dur, arc: 200 + dist * 0.35, mega, img, shadow, warn, notice: {}, jump: {} });

    // Juice
    this.sfx(mega ? 'explosion' : 'pump', { pan: this.panFor(mx), volume: mega ? 0.6 : 1 });
    this.sfx('cluck', { pitch: mega ? 0.7 : 0.9 + this.rng() * 0.4, pan: this.panFor(mx) });
    this.fx.squash(this.chicken, 1.12, 0.86, 70);
    this.tweens.add({ targets: this.barrel, scaleY: CHICKEN_SCALE * 0.82, duration: 60, yoyo: true });
    this.fx.burst(mx, my, { texture: 'kn-feather', count: mega ? 10 : 3, speed: 260, scale: 0.6, gravity: 200, lifespan: 900, depth: 5000 });
    this.fx.burst(mx, my + 10, { texture: TEX.puff, color: 0xffffff, count: mega ? 10 : 4, speed: 200, scale: 0.6, gravity: -100, lifespan: 400 });
    if (mega) {
      this.fx.shake(0.008, 200);
      this.fx.floatText(this.cannonX, RAIL_Y - 250, 'MEGA-ÆG!', C.sun, 64);
      this.say('megaEgg');
    }
    this.vibrate(this.solo.slot, mega ? 90 : 25);
  }

  private updateEggs(dt: number): void {
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const e = this.eggs[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.dur);
      const gx = Phaser.Math.Linear(e.x0, e.tx, k);
      const gy = Phaser.Math.Linear(e.y0, e.ty, k);
      const z = Math.sin(k * Math.PI) * e.arc;
      const base = e.mega ? 0.9 : 0.6;
      e.img.setPosition(gx, gy - z).setScale(base * (1 + Math.sin(k * Math.PI) * 0.35));
      e.img.rotation += dt * (e.mega ? 6 : 10);
      const sk = 0.6 + k * 0.6;
      e.shadow.setPosition(gx, gy).setDisplaySize((e.mega ? 120 : 70) * sk, (e.mega ? 34 : 22) * sk).setAlpha(0.15 + k * 0.25);
      e.warn.setAlpha(Math.min(1, k * 2.2)).setScale((e.mega ? 1.7 : 1) * (1.5 - k * 0.5));
      if (k >= 1) {
        this.land(e);
        e.img.destroy();
        e.shadow.destroy();
        e.warn.destroy();
        this.eggs.splice(i, 1);
      }
    }
  }

  private land(e: Egg): void {
    const R = e.mega ? MEGA_R : EGG_R;
    this.sfx('splat', { pan: this.panFor(e.tx), pitch: e.mega ? 0.7 : 1 });
    this.sfx('crunch', { pan: this.panFor(e.tx), volume: 0.5 });
    this.fx.burst(e.tx, e.ty, { texture: 'kn-shell', count: e.mega ? 14 : 7, speed: e.mega ? 600 : 420, scale: 0.9, gravity: 1200, lifespan: 700, depth: e.ty + 5 });
    this.fx.burst(e.tx, e.ty, { texture: TEX.drop, color: e.mega ? [0xffcf3a, 0xff9a1a] : [0xffe066, 0xffffff], count: e.mega ? 20 : 10, speed: 520, scale: 0.7, gravity: 1300, lifespan: 600, depth: e.ty + 5 });
    if (e.mega) this.fx.shake(0.012, 260);
    else this.fx.shake(0.003, 90);
    const scale = e.mega ? 1.35 : 0.8;
    const img = this.add.image(e.tx, e.ty, 'kn-splat').setDepth(-4000).setScale(scale * 0.3).setAngle(this.rng() * 30 - 15);
    this.tweens.add({ targets: img, scale, duration: 160, ease: 'Back.easeOut' });
    this.puddles.push({ x: e.tx, y: e.ty, r: 80 * scale, life: 7, img });

    for (const r of this.runners) {
      if (r.out || r.inv > 0) continue;
      const d = Math.hypot(r.x - e.tx, (r.y - e.ty) * FLAT);
      if (d > R) continue;
      if (r.air > 0.05) {
        this.fx.floatText(r.x, r.y - 220, 'SNYDT!', C.mint, 44);
        continue;
      }
      this.hitRunner(r, e.tx, e.ty, e.mega);
    }
  }

  private hitRunner(r: Runner, fromX: number, fromY: number, mega: boolean): void {
    r.hearts = Math.max(0, r.hearts - 1);
    r.inv = 1.4;
    this.hits++;
    this.stat(this.solo.slot, 'hits');
    const dx = r.x - fromX;
    const dy = r.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    r.vx = (dx / d) * 700;
    r.vy = (dy / d) * 500;
    r.blok.bonk();
    r.blok.spinOut(1, 500);
    this.vibrate(r.player.slot, 160);
    this.vibrate(this.solo.slot, 40);
    this.sfx('hit', { pan: this.panFor(r.x) });
    this.fx.stars(r.x, r.y - 120, N.sun, 8);
    this.fx.floatText(r.x, r.y - 230, mega ? 'OMELET!' : ['SPLAT!', 'AV!', 'ÆGGEDE!'][Math.floor(this.rng() * 3)], C.sun, 54);
    // Hjerte flyver af
    const lost = r.heartIcons[r.hearts];
    if (lost) {
      const ghost = this.add.image(lost.x, lost.y, TEX.heart).setDepth(7600).setScale(0.62);
      this.tweens.add({ targets: ghost, y: ghost.y - 80, scale: 1.2, alpha: 0, angle: 40, duration: 600, ease: 'Quad.easeOut', onComplete: () => ghost.destroy() });
    }
    this.updateHud();
    if (r.hearts <= 0) this.knockOut(r);
    else if (this.rng() < 0.35) this.say('ouch');
  }

  private knockOut(r: Runner): void {
    r.out = true;
    this.outOrder.push(r.player.slot);
    this.stat(r.player.slot, 'falls');
    this.vibrate(r.player.slot, 400);
    this.sfx('scream', { pan: this.panFor(r.x) });
    this.sfx('lose', { delay: 0.2 });
    this.fx.flash(0xffe066, 160, 0.4);
    this.fx.shake(0.014, 300);
    this.hitstop(80);
    this.fx.floatText(r.x, r.y - 280, 'UDE!', C.tomato, 80);
    r.heartIcons.forEach((h) => h.setVisible(false));
    r.blok.spinOut(3, 1000);
    r.blok.setDepth(6500);
    const dir = r.x < W / 2 ? -1 : 1;
    this.tweens.add({ targets: r.blok, x: r.x + dir * 500, duration: 1100, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: r.blok,
      y: r.y - 520,
      duration: 500,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => r.blok.setVisible(false),
    });
    const left = this.runners.filter((x) => !x.out).length;
    if (left === 1) this.say('oneLeft', true);
    else if (left > 1) this.say('oneOut');
    this.setLayout(r.player.slot, { kind: 'wait', title: 'Du er ude!', message: 'Æggesplattet… hep på de andre!', emoji: '🍳' });
  }

  private updateRunners(dt: number): void {
    for (const r of this.runners) {
      if (r.out) continue;
      const pad = this.pad(r.player.slot);
      r.inv = Math.max(0, r.inv - dt);
      r.jumpCd = Math.max(0, r.jumpCd - dt);
      r.air = Math.max(0, r.air - dt);
      if (this.pressedA(r.player.slot) && r.jumpCd <= 0 && r.air <= 0) {
        r.air = JUMP_AIR;
        r.jumpCd = JUMP_CD;
        r.blok.hop(95, 250);
        this.sfx('jump', { pan: this.panFor(r.x) });
        this.stat(r.player.slot, 'jumps');
      }
      const slip = this.puddles.some((p) => Math.hypot(r.x - p.x, (r.y - p.y) * FLAT) < p.r) && r.air <= 0;
      const control = slip ? 1.4 : 10;
      const tvx = pad.x * SPEED;
      const tvy = pad.y * SPEED * 0.8;
      r.vx += (tvx - r.vx) * Math.min(1, control * dt);
      r.vy += (tvy - r.vy) * Math.min(1, control * dt);
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      if (r.x < ARENA.x0) (r.x = ARENA.x0), (r.vx = Math.abs(r.vx) * 0.5);
      if (r.x > ARENA.x1) (r.x = ARENA.x1), (r.vx = -Math.abs(r.vx) * 0.5);
      if (r.y < ARENA.y0) (r.y = ARENA.y0), (r.vy = Math.abs(r.vy) * 0.5);
      if (r.y > ARENA.y1) (r.y = ARENA.y1), (r.vy = -Math.abs(r.vy) * 0.5);
      if (slip && Math.hypot(r.vx, r.vy) > 250 && this.rng() < dt * 1.5) {
        this.sfx('squeak', { pan: this.panFor(r.x), pitch: 1.4 });
        this.fx.floatText(r.x, r.y - 210, 'GLAT!', C.sun, 36);
      }
    }
  }

  private collideRunners(): void {
    const live = this.runners.filter((r) => !r.out);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        const dx = b.x - a.x;
        const dy = (b.y - a.y) * FLAT;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = 70;
        if (d >= min) continue;
        const push = (min - d) / 2;
        a.x -= (dx / d) * push;
        b.x += (dx / d) * push;
        a.y -= ((dy / d) * push) / FLAT;
        b.y += ((dy / d) * push) / FLAT;
      }
    }
  }

  private drawRunners(dt: number): void {
    for (const r of this.runners) {
      if (r.out) continue;
      r.blok.setPosition(r.x, r.y).setDepth(r.y);
      r.blok.walk(r.vx / SPEED, r.vy / SPEED, dt * 1000 * 1.5);
      r.blok.setAlpha(r.inv > 0 ? (Math.floor(r.inv * 12) % 2 ? 0.35 : 1) : 1);
      const lift = r.blok.rig.y;
      r.heartIcons.forEach((h, k) => {
        h.setPosition(r.x + (k - 1) * 30, r.y - 330 * r.blok.size + lift).setAlpha(k < r.hearts ? 1 : 0.15);
      });
    }
  }

  private updatePuddles(dt: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      p.life -= dt;
      if (p.life < 1) p.img.setAlpha(Math.max(0, p.life));
      if (p.life <= 0) {
        p.img.destroy();
        this.puddles.splice(i, 1);
      }
    }
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

  protected botInput(slot: number, dt: number): BotInput | null {
    if (slot === this.solo.slot) return this.botCannon();
    const r = this.runners.find((x) => x.player.slot === slot);
    if (!r || r.out) return null;
    return this.botRunner(r, dt);
  }

  private botCannon(): BotInput {
    const alive = this.runners.filter((r) => !r.out);
    if (!alive.length) return { x: 0, y: 0, a: false, b: false };
    let target = alive.find((r) => r.player.slot === this.botAim.slot);
    if (!target || this.elapsed > this.botAim.until) {
      target = alive[Math.floor(this.rng() * alive.length)];
      this.botAim = { slot: target.player.slot, until: this.elapsed + 1.2 + this.rng() * 1.8, lead: 0.5 + this.rng() * 0.5, ox: 0, oy: 0 };
    }
    // Sigtefejl skifter efter hvert skud
    if (this.shotCd > SHOT_CD - 0.05) {
      this.botAim.ox = (this.rng() - 0.5) * 120;
      this.botAim.oy = (this.rng() - 0.5) * 70;
    }
    // Forudsig hvor målet er når ægget lander (ikke perfekt)
    const flight = 0.55 + Math.hypot(target.x - this.cannonX, target.y - RAIL_Y) / 1700;
    const lead = this.botAim.lead;
    const ax = target.x + target.vx * flight * lead + this.botAim.ox;
    const ay = target.y + target.vy * flight * lead + this.botAim.oy;
    const dx = ax - this.reticle.x;
    const dy = ay - this.reticle.y;
    const close = Math.hypot(dx, dy) < 90;
    // Mega-æg når flere står samlet
    const crowd = alive.filter((r) => Math.hypot(r.x - ax, (r.y - ay) * FLAT) < 230).length;
    const mega = this.megaCd <= 0 && close && (crowd >= 2 || this.rng() < 0.01);
    return {
      x: Phaser.Math.Clamp(dx / 110, -1, 1),
      y: Phaser.Math.Clamp(dy / 80, -1, 1),
      a: close && this.shotCd <= 0 && !this.pad(this.solo.slot).a,
      b: mega,
    };
  }

  private botRunner(r: Runner, dt: number): BotInput {
    const slot = r.player.slot;
    let fx = 0;
    let fy = 0;
    let jump = false;
    for (const e of this.eggs) {
      if (e.notice[slot] === undefined) {
        e.notice[slot] = 0.15 + this.rng() * 0.4 + (this.rng() < 0.25 ? 10 : 0); // nogle æg opdages aldrig
        e.jump[slot] = this.rng() < 0.5;
      }
      if (e.t < e.notice[slot]) continue;
      const R = (e.mega ? MEGA_R : EGG_R) + 50;
      const dx = r.x - e.tx;
      const dy = (r.y - e.ty) * FLAT;
      const d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const left = e.dur - e.t;
      const w = 1.5 - d / R;
      fx += (dx / d) * w;
      fy += (dy / d / FLAT) * w;
      if (left < 0.2 && d < R - 30 && e.jump[slot]) jump = true;
    }
    // Vandre-mål
    r.botRetarget -= dt;
    if (r.botRetarget <= 0 || Math.hypot(r.botTarget.x - r.x, r.botTarget.y - r.y) < 40) {
      r.botTarget = { x: ARENA.x0 + 80 + this.rng() * (ARENA.x1 - ARENA.x0 - 160), y: ARENA.y0 + 60 + this.rng() * (ARENA.y1 - ARENA.y0 - 100) };
      r.botRetarget = 1 + this.rng() * 2.5;
    }
    let mx = r.botTarget.x - r.x;
    let my = r.botTarget.y - r.y;
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml;
    my /= ml;
    // Hold afstand til sigtekornet
    const rdx = r.x - this.reticle.x;
    const rdy = (r.y - this.reticle.y) * FLAT;
    const rd = Math.hypot(rdx, rdy) || 1;
    if (rd < 220) {
      mx += (rdx / rd) * 0.8;
      my += (rdy / rd / FLAT) * 0.8;
    }
    const threat = Math.hypot(fx, fy);
    const x = threat > 0.05 ? fx * 2 + mx * 0.3 : mx * 0.75;
    const y = threat > 0.05 ? fy * 2 + my * 0.3 : my * 0.75;
    const len = Math.hypot(x, y) || 1;
    return { x: x / Math.max(1, len), y: y / Math.max(1, len), a: jump && r.jumpCd <= 0, b: false };
  }
}
