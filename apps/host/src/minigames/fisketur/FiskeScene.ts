import Phaser from 'phaser';
import { clouds, sun } from '../../kit/scenery';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { label, nameTag, panelKey, panelSvg } from '../../kit/ui';
import type { BotInput, MinigameLaunch, PlayerView } from '../../flow/types';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  CAT,
  ROD,
  SURFACE_Y,
  WATER,
  bubbleSvg,
  bucketSvg,
  catSvg,
  fishSvg,
  hookSvg,
  lilySvg,
  pierSvg,
  raySvg,
  rodSvg,
  seaweedSvg,
  shadowFishSvg,
  signSvg,
  skySvg,
  tailSvg,
  underwaterSvg,
  waveSvg,
  wormSvg,
} from './art';

const CAT_X = 330;
const CAT_Y = 296;
const CAT_S = 0.8;
const ROD_ANGLE = -18;
const ROD_S = 0.85;
const HOOK_SPEED = 560;
const FISH_SPEED = 360;
const DASH_SPEED = 980;
const DASH_TIME = 0.28;
const DASH_CD = 2.2;
const CATCH_R = 82;
const STRIKE_TIME = 0.32;
const STRIKE_CD = 0.95;
const HUNGER_DRAIN = 1 / 15;
const WORM_FOOD = 0.5;
const MAX_WORMS = 6;
const FISH_S = 1;

interface Fish {
  player: PlayerView;
  img: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Container;
  hungry: Phaser.GameObjects.Text;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hunger: number;
  dash: number;
  dashCd: number;
  caught: boolean;
  hudBar: Phaser.GameObjects.Graphics;
  hudName: Phaser.GameObjects.Text;
  hudY: number;
  bot: { tx: number; ty: number; retarget: number; bold: number };
  growl: number;
}

interface Worm {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  ty: number;
  life: number;
}

type HookState = 'free' | 'strike' | 'reel';

/**
 * KATTENS FISKETUR (1 mod 3, inspireret af Fish 'n' Drips / Rumble Fishing).
 * Eneren er en kæmpe kat på en bådebro, der styrer krogen under vandet og haler ind (A).
 * Trioen er fisk med dykkermasker, der skal spise orme (ellers bliver de sultne og langsomme) og undgå krogen.
 * Er der mindst én fisk tilbage efter 40 sek., vinder trioen.
 */
export class FiskeScene extends MinigameScene {
  protected duration = 40;
  protected music = 'tense' as const;

  private fish: Fish[] = [];
  private worms: Worm[] = [];
  private hook = { x: 1100, y: 640 };
  private hookState: HookState = 'free';
  private strikeT = 0;
  private strikeCd = 0;
  private wormTimer = 1;
  private caughtCount = 0;
  private ending = false;

  private cat!: Phaser.GameObjects.Image;
  private tail!: Phaser.GameObjects.Image;
  private rod!: Phaser.GameObjects.Image;
  private pupils: Phaser.GameObjects.Arc[] = [];
  private hookImg!: Phaser.GameObjects.Image;
  private line!: Phaser.GameObjects.Graphics;
  private waves!: Phaser.GameObjects.TileSprite;
  private bucket!: Phaser.GameObjects.Image;
  private caughtText!: Phaser.GameObjects.Text;
  private bucketTails: Phaser.GameObjects.Image[] = [];
  private botAim = { slot: -1, until: 0 };

  private colors: string[] = [];

  constructor() {
    super('fisketur');
  }

  init(data: MinigameLaunch): void {
    super.init(data);
    this.colors = data.players.map((p) => p.color);
  }

  preload(): void {
    loadSvg(this, 'fi-sky', skySvg(), 1920, 360);
    loadSvg(this, 'fi-under', underwaterSvg(), 1920, 760);
    loadSvg(this, 'fi-wave', waveSvg(), 256, 60);
    loadSvg(this, 'fi-ray', raySvg(), 220, 700);
    loadSvg(this, 'fi-weed-g', seaweedSvg('#3ccf5a'), 90, 300);
    loadSvg(this, 'fi-weed-p', seaweedSvg('#9b5cff'), 90, 300);
    loadSvg(this, 'fi-weed-o', seaweedSvg('#ff8a2b'), 90, 300);
    loadSvg(this, 'fi-pier', pierSvg(), 600, 340);
    loadSvg(this, 'fi-cat', catSvg(), CAT.w * CAT_S, CAT.h * CAT_S);
    loadSvg(this, 'fi-tail', tailSvg(), 160 * CAT_S, 120 * CAT_S);
    loadSvg(this, 'fi-rod', rodSvg(), 480 * ROD_S, 50 * ROD_S);
    loadSvg(this, 'fi-hook', hookSvg(), 90, 120);
    loadSvg(this, 'fi-worm', wormSvg(), 90, 50);
    loadSvg(this, 'fi-bucket', bucketSvg(), 150, 150);
    loadSvg(this, 'fi-bubble', bubbleSvg(), 40, 40);
    loadSvg(this, 'fi-shadowfish', shadowFishSvg(), 120, 60);
    loadSvg(this, 'fi-lily', lilySvg(), 160, 60);
    loadSvg(this, 'fi-sign', signSvg(), 360, 200);
    for (const c of this.colors) loadSvg(this, `fi-fish-${c}`, fishSvg(c), 170 * FISH_S, 130 * FISH_S);
    loadSvg(this, panelKey(440, 190, C.deep), panelSvg(440, 190, C.deep), 464, 220);
  }

  protected setup(): void {
    this.fish = [];
    this.worms = [];
    this.pupils = [];
    this.bucketTails = [];
    this.hook = { x: 1100, y: 640 };
    this.hookState = 'free';
    this.strikeCd = 0;
    this.caughtCount = 0;
    this.ending = false;
    this.wormTimer = 0.5;

    this.buildWorld();
    this.buildCat();

    const trio = this.team(1);
    const starts = [
      [900, 520],
      [1350, 760],
      [1700, 560],
    ];
    trio.forEach((p, i) => {
      const [x, y] = starts[i];
      const img = this.add.image(x, y, `fi-fish-${p.color}`).setDepth(2000 + i);
      const tag = nameTag(this, x, y - 86, p.name, p.color, 24).setDepth(2100 + i);
      const hungry = label(this, x, y - 110, 'SULTEN!', 26, { color: C.tomato }).setDepth(2200).setVisible(false);
      this.tweens.add({ targets: hungry, scale: 1.15, duration: 300, yoyo: true, repeat: -1 });
      this.fish.push({
        player: p,
        img,
        tag,
        hungry,
        x,
        y,
        vx: 0,
        vy: 0,
        hunger: 1,
        dash: 0,
        dashCd: 0,
        caught: false,
        hudBar: this.add.graphics().setDepth(7001),
        hudName: null as unknown as Phaser.GameObjects.Text,
        hudY: 0,
        bot: { tx: x, ty: y, retarget: 0, bold: 0.15 + this.rng() * 0.5 },
        growl: 2,
      });
    });

    this.buildHud();
    this.drawFish(0);
    this.drawHook(0);
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    this.add.image(W / 2, 180, 'fi-sky').setDepth(-9500);
    sun(this, 1500, 90, 0.6);
    clouds(this, 4, 30, 200, -9400);
    this.add.image(W / 2, 320 + 380, 'fi-under').setDepth(-9000);

    // Lysstråler
    for (let i = 0; i < 6; i++) {
      const ray = this.add.image(500 + i * 260, SURFACE_Y, 'fi-ray').setOrigin(0.5, 0).setDepth(-8800).setAngle(-14 + i * 2).setAlpha(0.5);
      this.tweens.add({ targets: ray, alpha: 0.15, angle: ray.angle + 6, duration: 2200 + i * 350, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Baggrundsfisk
    for (let i = 0; i < 5; i++) {
      const y = 480 + i * 90;
      const dir = i % 2 ? 1 : -1;
      const f = this.add.image(dir > 0 ? -100 : W + 100, y, 'fi-shadowfish').setDepth(-8700).setAlpha(0.45).setScale(0.6 + (i % 3) * 0.2).setFlipX(dir < 0);
      this.tweens.add({ targets: f, x: dir > 0 ? W + 120 : -120, duration: 14000 + i * 2500, delay: i * 1800, repeat: -1 });
      this.tweens.add({ targets: f, y: y + 20, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Tang (bag og foran)
    const weeds: [number, string, number, number][] = [
      [180, 'fi-weed-g', 1.1, -8600], [420, 'fi-weed-p', 0.9, -8600], [760, 'fi-weed-o', 1.0, -8600], [1020, 'fi-weed-g', 1.2, -8600],
      [1300, 'fi-weed-p', 1.0, -8600], [1620, 'fi-weed-g', 1.1, -8600], [1860, 'fi-weed-o', 0.9, -8600],
      [600, 'fi-weed-g', 0.8, 4200], [1480, 'fi-weed-o', 0.75, 4200],
    ];
    weeds.forEach(([x, key, s, depth], i) => {
      const w = this.add.image(x, H + 20, key).setOrigin(0.5, 1).setScale(s).setDepth(depth);
      this.tweens.add({ targets: w, angle: { from: -6, to: 6 }, duration: 1600 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    // Bobler fra bunden
    this.add.particles(0, 0, 'fi-bubble', {
      x: { min: 100, max: W - 100 },
      y: H,
      speedY: { min: -140, max: -70 },
      speedX: { min: -20, max: 20 },
      scale: { min: 0.4, max: 0.9 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 6000,
      frequency: 260,
    }).setDepth(-8500);

    // Vandoverflade
    this.add.rectangle(W / 2, SURFACE_Y + 8, W, 16, 0x5fd0ff, 0.7).setDepth(-5100);
    this.waves = this.add.tileSprite(W / 2, SURFACE_Y, W, 60, 'fi-wave').setOrigin(0.5, 0.36).setDepth(-5000);
    for (const [x, s] of [[1250, 0.9], [1600, 0.7], [1780, 1]] as const) {
      const lily = this.add.image(x, SURFACE_Y + 2, 'fi-lily').setScale(s).setDepth(-4900);
      this.tweens.add({ targets: lily, y: SURFACE_Y - 4, angle: { from: -3, to: 3 }, duration: 1300 + x, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Bådebro
    this.add.image(0, CAT_Y - 14, 'fi-pier').setOrigin(0, 0).setDepth(3000);
    this.bucket = this.add.image(560, CAT_Y + 4, 'fi-bucket').setOrigin(0.5, 0.95).setScale(0.62).setDepth(3050);

    // Skilt med enerens navn
    this.add.image(108, CAT_Y + 2, 'fi-sign').setOrigin(0.5, 1).setScale(0.6).setDepth(3300);
    label(this, 108, CAT_Y - 98, 'ENEREN', 20, { color: C.ink, stroke: 0 }).setDepth(3301).setShadow(0, 0, C.ink, 0);
    label(this, 108, CAT_Y - 72, this.solo.name, 26, { color: this.solo.color }).setDepth(3301);
    this.caughtText = label(this, 108, CAT_Y - 44, 'Fanget: 0/3', 22, { color: C.cream }).setDepth(3301);
  }

  private catPoint(lx: number, ly: number): { x: number; y: number } {
    return { x: CAT_X - (CAT.w * CAT_S) / 2 + lx * CAT_S, y: CAT_Y - CAT.h * CAT_S + ly * CAT_S };
  }

  private buildCat(): void {
    const tailBase = this.catPoint(92, 322);
    this.tail = this.add.image(tailBase.x, tailBase.y, 'fi-tail').setOrigin(0.94, 0.75).setDepth(3150);
    this.tweens.add({ targets: this.tail, angle: { from: -12, to: 16 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.cat = this.add.image(CAT_X, CAT_Y, 'fi-cat').setOrigin(0.5, 1).setDepth(3200);
    this.fx.breathe(this.cat, 0.015, 1100);
    for (const e of [CAT.eyeL, CAT.eyeR]) {
      const p = this.catPoint(e[0], e[1]);
      this.pupils.push(this.add.circle(p.x, p.y, 9, N.ink).setDepth(3210));
    }
    const paw = this.catPoint(CAT.paw[0], CAT.paw[1]);
    this.rod = this.add.image(paw.x, paw.y, 'fi-rod').setOrigin(10 / 480, 0.5).setAngle(ROD_ANGLE).setDepth(3190);
    this.line = this.add.graphics().setDepth(3500);
    this.hookImg = this.add.image(this.hook.x, this.hook.y, 'fi-hook').setOrigin(0.5, 0.08).setDepth(3600).setScale(0.85);
    // Kattens kost-ring i enerens farve
    this.add.image(CAT_X, CAT_Y, TEX.ring).setTint(this.solo.colorNum).setDisplaySize(260, 50).setDepth(3080).setAlpha(0.9);
  }

  private rodTip(): { x: number; y: number } {
    const a = Phaser.Math.DegToRad(this.rod.angle);
    const len = ROD.len * ROD_S;
    return { x: this.rod.x + Math.cos(a) * len, y: this.rod.y + Math.sin(a) * len };
  }

  private buildHud(): void {
    this.add.image(W - 250, 112, panelKey(440, 190, C.deep)).setDepth(7000);
    label(this, W - 390, 44, 'FISKENE', 24, { color: C.sun }).setDepth(7001);
    label(this, W - 150, 44, 'Mæthed', 20, { color: C.cream }).setDepth(7001);
    this.fish.forEach((f, i) => {
      f.hudY = 86 + i * 50;
      f.hudName = label(this, W - 340, f.hudY, f.player.name, 28, { color: f.player.color }).setDepth(7001);
    });
  }

  private drawHud(): void {
    for (const f of this.fish) {
      const g = f.hudBar;
      g.clear();
      const x = W - 220;
      const y = f.hudY - 11;
      g.fillStyle(N.ink, 1).fillRoundedRect(x, y, 150, 22, 11);
      if (f.caught) {
        f.hudName.setAlpha(0.45);
        continue;
      }
      const col = f.hunger > 0.5 ? N.mint : f.hunger > 0.2 ? N.sun : N.tomato;
      g.fillStyle(col, 1).fillRoundedRect(x + 4, y + 4, Math.max(8, 142 * f.hunger), 14, 7);
    }
  }

  // ---------------------------------------------------------------------------

  protected onStart(): void {
    this.say('catHungry');
    this.sfx('splash');
  }

  protected play(dt: number): void {
    this.waves.tilePositionX += dt * 40;
    this.updateHook(dt);
    this.updateFish(dt);
    this.updateWorms(dt);
    this.drawFish(dt);
    this.drawHook(dt);
    this.drawHud();
    if (!this.ending && this.fish.every((f) => f.caught)) {
      this.ending = true;
      this.time.delayedCall(1300, () => this.finish(this.rankByTeam(0)));
    }
  }

  protected timeUp(): number[][] {
    const left = this.fish.filter((f) => !f.caught).length;
    if (left) this.say('fishEscaped', true);
    return this.rankByTeam(left ? 1 : 0);
  }

  // ---------------------------------------------------------------------------
  // Krogen

  private catchPoint(): { x: number; y: number } {
    return { x: this.hook.x + 6, y: this.hook.y + 72 };
  }

  private updateHook(dt: number): void {
    this.strikeCd = Math.max(0, this.strikeCd - dt);
    if (this.hookState === 'reel') return;
    const slot = this.solo.slot;
    const pad = this.pad(slot);
    if (this.hookState === 'free') {
      this.hook.x = Phaser.Math.Clamp(this.hook.x + pad.x * HOOK_SPEED * dt, WATER.x0 + 40, WATER.x1);
      this.hook.y = Phaser.Math.Clamp(this.hook.y + pad.y * HOOK_SPEED * 0.82 * dt, WATER.y0 - 60, WATER.y1 - 80);
      if (this.pressedA(slot) && this.strikeCd <= 0) this.strike();
    } else if (this.hookState === 'strike') {
      this.strikeT += dt;
      this.hook.y = Math.max(WATER.y0 - 80, this.hook.y - 520 * dt);
      if (this.strikeT < 0.22) {
        const c = this.catchPoint();
        const victim = this.fish.find((f) => !f.caught && Math.hypot(f.x - c.x, (f.y - c.y) * 1.2) < CATCH_R);
        if (victim) return this.reelIn(victim);
      }
      if (this.strikeT >= STRIKE_TIME) {
        this.hookState = 'free';
        this.fx.floatText(this.hook.x, this.hook.y - 40, 'MIS!', C.cream, 40);
      }
    }
  }

  private strike(): void {
    this.hookState = 'strike';
    this.strikeT = 0;
    this.strikeCd = STRIKE_CD;
    this.sfx('whoosh', { pitch: 1.4, pan: this.panFor(this.hook.x) });
    this.sfx('squeak', { pitch: 0.6 });
    this.tweens.killTweensOf(this.rod);
    this.rod.setAngle(ROD_ANGLE);
    this.tweens.add({ targets: this.rod, angle: ROD_ANGLE - 8, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    this.fx.burst(this.hook.x, this.hook.y + 60, { texture: 'fi-bubble', count: 6, speed: 220, scale: 0.6, gravity: -300, lifespan: 600 });
    this.vibrate(this.solo.slot, 30);
  }

  private reelIn(f: Fish): void {
    this.hookState = 'reel';
    f.caught = true;
    this.caughtCount++;
    this.caughtText.setText(`Fanget: ${this.caughtCount}/3`);
    this.stat(this.solo.slot, 'hits');
    this.stat(f.player.slot, 'falls');
    this.vibrate(f.player.slot, 450);
    this.vibrate(this.solo.slot, 120);
    this.setLayout(f.player.slot, { kind: 'wait', title: 'Fanget!', message: 'Du ligger i kattens spand… hep på de andre!', emoji: '🪣' });
    f.tag.setVisible(false);
    f.hungry.setVisible(false);
    this.sfx('hit');
    this.sfx('scream', { delay: 0.1, pan: this.panFor(f.x) });
    this.fx.flash(0xffffff, 140, 0.5);
    this.fx.shake(0.012, 260);
    this.fx.stars(f.x, f.y, N.sun, 10);
    this.fx.floatText(f.x, f.y - 80, 'BID!', C.sun, 72);
    this.say(this.caughtCount === 3 ? 'bucketFull' : this.caughtCount === 2 ? 'oneFishLeft' : 'fishOnHook', this.caughtCount > 1);
    const tip = this.rodTip();
    const hx0 = this.hook.x;
    const proxy = { x: this.hook.x, y: this.hook.y };
    const follow = () => {
      this.hook.x = proxy.x;
      this.hook.y = proxy.y;
      const c = this.catchPoint();
      f.x = c.x;
      f.y = c.y + 20;
    };
    this.tweens.killTweensOf(this.rod);
    this.tweens.add({ targets: this.rod, angle: ROD_ANGLE - 9, duration: 300, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: f.img, angle: { from: -60, to: -100 }, duration: 110, yoyo: true, repeat: 10 });
    // 1) Op til overfladen
    this.tweens.add({
      targets: proxy,
      y: SURFACE_Y - 70,
      duration: 520,
      ease: 'Quad.easeIn',
      onUpdate: follow,
      onComplete: () => {
        this.sfx('splash', { pan: this.panFor(proxy.x) });
        this.fx.burst(proxy.x, SURFACE_Y, { texture: TEX.drop, color: [0x9be8ff, 0xffffff], count: 18, speed: 600, gravity: 1400, lifespan: 700, depth: 4000 });
        // 2) Op i luften mod stangen
        this.tweens.add({
          targets: proxy,
          x: tip.x - 40,
          y: tip.y + 40,
          duration: 520,
          ease: 'Sine.easeOut',
          onUpdate: follow,
          onComplete: () => {
            // 3) Ned i spanden
            this.tweens.killTweensOf(f.img);
            f.img.setDepth(3060);
            this.tweens.add({
              targets: f.img,
              x: this.bucket.x,
              y: this.bucket.y - 60,
              angle: 200,
              scale: 0.7,
              duration: 450,
              ease: 'Quad.easeIn',
              onComplete: () => {
                f.img.setVisible(false);
                this.sfx('splash', { pitch: 1.4, volume: 0.6 });
                this.sfx('pop');
                this.fx.squash(this.bucket, 1.2, 0.8, 90);
                this.fx.burst(this.bucket.x, this.bucket.y - 70, { texture: TEX.drop, color: 0x9be8ff, count: 10, speed: 300, gravity: 900, depth: 3070 });
                const tailImg = this.add
                  .image(this.bucket.x - 20 + this.bucketTails.length * 20, this.bucket.y - 70, `fi-fish-${f.player.color}`)
                  .setScale(0.5)
                  .setAngle(-70 - this.bucketTails.length * 15)
                  .setDepth(3040);
                this.tweens.add({ targets: tailImg, angle: tailImg.angle + 14, duration: 220, yoyo: true, repeat: -1 });
                this.bucketTails.push(tailImg);
                this.fx.floatText(this.cat.x + 60, this.cat.y - 300, 'NAM NAM!', C.sun, 56);
                this.sfx('cheer', { volume: 0.5 });
              },
            });
            this.tweens.add({ targets: this.rod, angle: ROD_ANGLE, duration: 400, ease: 'Back.easeOut' });
            // 4) Krogen tilbage i vandet
            this.tweens.add({
              targets: proxy,
              x: hx0,
              y: 620,
              duration: 650,
              delay: 250,
              ease: 'Quad.easeIn',
              onUpdate: () => {
                this.hook.x = proxy.x;
                this.hook.y = proxy.y;
              },
              onComplete: () => {
                this.sfx('splash', { volume: 0.5, pitch: 1.3 });
                this.hookState = 'free';
                this.strikeCd = 0.4;
              },
            });
          },
        });
      },
    });
  }

  private drawHook(_dt: number): void {
    const tip = this.rodTip();
    this.hookImg.setPosition(this.hook.x, this.hook.y);
    this.hookImg.setAngle(this.hookState === 'free' ? Math.sin(this.elapsed * 3) * 6 : 0);
    const g = this.line;
    g.clear();
    const midX = (tip.x + this.hook.x) / 2;
    const midY = Math.max(tip.y, this.hook.y) - (this.hookState === 'free' ? -30 : 0);
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(tip.x, tip.y), new Phaser.Math.Vector2(midX, midY), new Phaser.Math.Vector2(this.hook.x, this.hook.y + 4));
    g.lineStyle(5, N.ink, 0.9);
    curve.draw(g, 24);
    g.lineStyle(2.5, 0xffffff, 0.95);
    curve.draw(g, 24);
    // Lille prop på linen ved overfladen
    if (this.hook.y > SURFACE_Y) {
      let p = curve.getPoint(0);
      for (let i = 1; i <= 40; i++) {
        const q = curve.getPoint(i / 40);
        if (q.y >= SURFACE_Y) {
          p = q;
          break;
        }
      }
      g.fillStyle(N.tomato, 1).fillCircle(p.x, p.y + Math.sin(this.elapsed * 4) * 3, 11);
      g.fillStyle(0xffffff, 1).fillCircle(p.x, p.y - 6 + Math.sin(this.elapsed * 4) * 3, 7);
      g.lineStyle(4, N.ink, 1).strokeCircle(p.x, p.y + Math.sin(this.elapsed * 4) * 3, 12);
    }
    // Kattens pupiller følger krogen
    const eyes = [CAT.eyeL, CAT.eyeR];
    this.pupils.forEach((pu, i) => {
      const e = this.catPoint(eyes[i][0], eyes[i][1]);
      const a = Math.atan2(this.hook.y - e.y, this.hook.x - e.x);
      pu.setPosition(e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 9);
    });
  }

  // ---------------------------------------------------------------------------
  // Fiskene

  private updateFish(dt: number): void {
    for (const f of this.fish) {
      if (f.caught) continue;
      const pad = this.pad(f.player.slot);
      f.hunger = Math.max(0, f.hunger - HUNGER_DRAIN * dt);
      f.dashCd = Math.max(0, f.dashCd - dt);
      f.dash = Math.max(0, f.dash - dt);
      const starving = f.hunger <= 0;
      if (this.pressedA(f.player.slot) && f.dashCd <= 0 && !starving) {
        f.dash = DASH_TIME;
        f.dashCd = DASH_CD;
        let dx = pad.x;
        let dy = pad.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.2) {
          dx = f.img.flipX ? -1 : 1;
          dy = 0;
        } else {
          dx /= len;
          dy /= len;
        }
        f.vx = dx * DASH_SPEED;
        f.vy = dy * DASH_SPEED;
        this.stat(f.player.slot, 'jumps');
        this.sfx('swish', { pan: this.panFor(f.x) });
        this.fx.burst(f.x, f.y, { texture: 'fi-bubble', count: 8, speed: 260, scale: 0.6, gravity: -200, lifespan: 600 });
      }
      const speed = FISH_SPEED * (starving ? 0.5 : 1);
      if (f.dash <= 0) {
        f.vx += (pad.x * speed - f.vx) * Math.min(1, dt * 5);
        f.vy += (pad.y * speed - f.vy) * Math.min(1, dt * 5);
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < WATER.x0) (f.x = WATER.x0), (f.vx = Math.abs(f.vx) * 0.4);
      if (f.x > WATER.x1) (f.x = WATER.x1), (f.vx = -Math.abs(f.vx) * 0.4);
      if (f.y < WATER.y0) (f.y = WATER.y0), (f.vy = Math.abs(f.vy) * 0.4);
      if (f.y > WATER.y1) (f.y = WATER.y1), (f.vy = -Math.abs(f.vy) * 0.4);

      // Spis orme
      for (let i = this.worms.length - 1; i >= 0; i--) {
        const w = this.worms[i];
        if (Math.hypot(w.x - f.x, w.y - f.y) < 70) {
          f.hunger = Math.min(1, f.hunger + WORM_FOOD);
          this.sfx('coin', { pan: this.panFor(w.x), pitch: 0.9 + this.rng() * 0.3 });
          this.sfx('crunch', { volume: 0.4 });
          this.fx.floatText(w.x, w.y - 50, 'NAM!', f.player.color, 40);
          this.fx.burst(w.x, w.y, { texture: TEX.star, color: f.player.colorNum, count: 6, speed: 250, scale: 0.4, gravity: 0, lifespan: 500 });
          this.fx.squash(f.img, 1.25, 0.8, 80);
          w.img.destroy();
          this.worms.splice(i, 1);
        }
      }
      if (starving) {
        f.growl -= dt;
        if (f.growl <= 0) {
          f.growl = 2.5;
          this.sfx('rumble', { volume: 0.4, pitch: 0.7, pan: this.panFor(f.x) });
        }
      }
    }
    // Fiskene puffer hinanden lidt
    const live = this.fish.filter((f) => !f.caught);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < 110) {
          const push = (110 - d) / 2;
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    }
  }

  private drawFish(_dt: number): void {
    for (const f of this.fish) {
      if (f.caught) continue;
      if (Math.abs(f.vx) > 20) f.img.setFlipX(f.vx < 0);
      const tilt = Phaser.Math.Clamp(f.vy / 14, -25, 25) * (f.img.flipX ? -1 : 1);
      const wig = Math.sin(this.elapsed * (8 + Math.hypot(f.vx, f.vy) / 40) + f.player.slot) * 4;
      f.img.setPosition(f.x, f.y + Math.sin(this.elapsed * 2 + f.player.slot) * 4).setAngle(tilt + wig);
      f.img.setDepth(2000 + f.y * 0.01);
      f.tag.setPosition(f.x, f.y - 86);
      f.hungry.setPosition(f.x, f.y - 128).setVisible(f.hunger <= 0);
      f.img.setAlpha(f.hunger <= 0 ? 0.8 : 1);
    }
  }

  private updateWorms(dt: number): void {
    this.wormTimer -= dt;
    if (this.wormTimer <= 0 && this.worms.length < MAX_WORMS) {
      this.wormTimer = 1.0 + this.rng() * 1.2;
      const x = WATER.x0 + 80 + this.rng() * (WATER.x1 - WATER.x0 - 160);
      const ty = WATER.y0 + 30 + this.rng() * (WATER.y1 - WATER.y0 - 80);
      const img = this.add.image(x, SURFACE_Y + 10, 'fi-worm').setDepth(1900).setScale(1);
      this.tweens.add({ targets: img, scaleX: 0.8, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: img, angle: { from: -15, to: 15 }, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.worms.push({ img, x, y: SURFACE_Y + 10, ty, life: 10 });
      this.sfx('pop', { volume: 0.4, pitch: 1.4, pan: this.panFor(x) });
      this.fx.burst(x, SURFACE_Y, { texture: TEX.drop, color: 0x9be8ff, count: 6, speed: 260, gravity: 900, lifespan: 500 });
    }
    for (let i = this.worms.length - 1; i >= 0; i--) {
      const w = this.worms[i];
      w.life -= dt;
      w.y += (w.ty - w.y) * Math.min(1, dt * 1.6) + dt * 6;
      w.x += Math.sin(this.elapsed * 1.5 + i) * 12 * dt;
      w.img.setPosition(w.x, w.y);
      if (w.life < 1) w.img.setAlpha(Math.max(0, w.life));
      if (w.life <= 0 || w.y > WATER.y1 + 40) {
        w.img.destroy();
        this.worms.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Bots

  protected botInput(slot: number, dt: number): BotInput | null {
    if (slot === this.solo.slot) return this.botCat();
    const f = this.fish.find((x) => x.player.slot === slot);
    if (!f || f.caught) return null;
    return this.botFish(f, dt);
  }

  private botCat(): BotInput {
    if (this.hookState !== 'free') return { x: 0, y: 0, a: false };
    const live = this.fish.filter((f) => !f.caught);
    if (!live.length) return { x: 0, y: 0, a: false };
    const c = this.catchPoint();
    let target = live.find((f) => f.player.slot === this.botAim.slot);
    if (!target || this.elapsed > this.botAim.until) {
      // Foretræk sultne (langsomme) og nære fisk
      live.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) * (a.hunger <= 0 ? 0.5 : 1) - Math.hypot(b.x - c.x, b.y - c.y) * (b.hunger <= 0 ? 0.5 : 1));
      target = this.rng() < 0.7 ? live[0] : live[Math.floor(this.rng() * live.length)];
      this.botAim = { slot: target.player.slot, until: this.elapsed + 2 + this.rng() * 2.5 };
    }
    const ax = target.x + target.vx * 0.22;
    const ay = target.y + target.vy * 0.22;
    const dx = ax - c.x;
    const dy = ay - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const real = Math.hypot(target.x - c.x, (target.y - c.y) * 1.2);
    const strike = real < CATCH_R * 0.85 && this.strikeCd <= 0 && this.rng() < 0.3 && !this.pad(this.solo.slot).a;
    const k = Math.min(1, d / 60);
    return { x: (dx / d) * k, y: (dy / d) * k, a: strike };
  }

  private botFish(f: Fish, dt: number): BotInput {
    const c = this.catchPoint();
    const hdx = f.x - c.x;
    const hdy = f.y - c.y;
    const hd = Math.hypot(hdx, hdy) || 1;
    let x = 0;
    let y = 0;
    let dash = false;
    // Flygt fra krogen (frygt afhænger af hvor modig fisken er)
    const fear = 330 - f.bot.bold * 120;
    if (hd < fear && this.hookState !== 'reel') {
      const w = 1 - hd / fear;
      x += (hdx / hd) * w * 2.2;
      y += (hdy / hd) * w * 2.2;
      // Undgå at blive klemt mod kanten
      if (f.x < WATER.x0 + 80 || f.x > WATER.x1 - 80) y += Math.sign(hdy || 1) * 0.8;
      if (f.y < WATER.y0 + 60 || f.y > WATER.y1 - 60) x += Math.sign(hdx || 1) * 0.8;
      dash = hd < 140 && f.dashCd <= 0 && this.rng() < 0.12;
    }
    // Find mad
    const safeWorms = this.worms
      .filter((w) => Math.hypot(w.x - c.x, w.y - c.y) > 200 - f.bot.bold * 150 || f.hunger < 0.15)
      .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y));
    const want = f.hunger < 0.65 || (safeWorms[0] && Math.hypot(safeWorms[0].x - f.x, safeWorms[0].y - f.y) < 260);
    if (want && safeWorms[0]) {
      const w = safeWorms[0];
      const d = Math.hypot(w.x - f.x, w.y - f.y) || 1;
      x += ((w.x - f.x) / d) * 0.9;
      y += ((w.y - f.y) / d) * 0.9;
    } else {
      f.bot.retarget -= dt;
      if (f.bot.retarget <= 0 || Math.hypot(f.bot.tx - f.x, f.bot.ty - f.y) < 50) {
        f.bot.tx = WATER.x0 + 100 + this.rng() * (WATER.x1 - WATER.x0 - 200);
        f.bot.ty = WATER.y0 + 60 + this.rng() * (WATER.y1 - WATER.y0 - 120);
        f.bot.retarget = 1.5 + this.rng() * 2;
      }
      const d = Math.hypot(f.bot.tx - f.x, f.bot.ty - f.y) || 1;
      x += ((f.bot.tx - f.x) / d) * 0.6;
      y += ((f.bot.ty - f.y) / d) * 0.6;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y, a: dash };
  }
}
