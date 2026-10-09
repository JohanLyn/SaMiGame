import Phaser from 'phaser';
import { PLAYER_COLORS } from '@samigame/shared';
import type { BotInput, PlayerView } from '../../flow/types';
import { clouds, gradientBackdrop, sun } from '../../kit/scenery';
import { loadSvg, linear, svgDoc } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { label } from '../../kit/ui';
import type { Blok } from '../../objects/Blok';
import { RitualScene } from '../_framework/RitualScene';
import * as art from './art';
import { emoji, lures, rand, revealPick, ritualHeader, shout, wait, waitLayout, type Header } from '../_framework/ritualKit';

const { dock: DOCK, water: WATER, bed: BED } = art.LAKE;
const XS = [290, 700, 1110, 1520];
const POSTS = [120, 640, 1050, 1460, 1880];
const FISH_COLORS = ['#ff8a5c', '#47b8ff', '#ffcf3a', '#3ee6a8', '#ff5fa2', '#b48cff', '#ff6b6b'];
const ROD_SCALE = 0.85;
/** Afstand fra stangens origin til spidsen (ved skala 1). */
const ROD_LEN = 260;
const ROD_IDLE = -68;
const ROD_FISH = -16;
/** Hvor længe man har til at kaste efter "NU!" før man kaster automatisk. */
const AUTO_CAST = 2.2;

type Phase = 'intro' | 'ready' | 'now' | 'catch';

interface Angler {
  p: PlayerView;
  blok: Blok;
  rod: Phaser.GameObjects.Image;
  bobber: Phaser.GameObjects.Image;
  hook: Phaser.GameObjects.Image;
  /** 'rod' = krogen hænger fra stangen, 'fly' = i luften, 'water' = i vandet. */
  line: 'rod' | 'fly' | 'water' | 'none';
  cast: boolean;
  time: number;
  penalty: number;
  lastFalse: number;
  depth: number;
  pill: Phaser.GameObjects.Container | null;
  /** Resolver når krogen er sunket til bunds efter kastet. */
  sunk: Promise<void>;
}

interface Fish {
  c: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Text;
  x: number;
  y: number;
  baseY: number;
  vx: number;
  phase: number;
  isPick: boolean;
  mode: 'swim' | 'seek' | 'hooked';
}

/**
 * FISKESØEN: alle står på en bådebro. Når der står "NU!", gælder det om at kaste først.
 * Det hurtigste kast fanger fisken med næste minigame i munden – men nogle gange en støvle (= kaos-kort).
 */
export class FiskesoenScene extends RitualScene {
  private anglers: Angler[] = [];
  private fish: Fish[] = [];
  private phase: Phase = 'intro';
  private phaseT = 0;
  private nowAt = 0;
  private lineG!: Phaser.GameObjects.Graphics;
  private header!: Header;
  private boot!: Phaser.GameObjects.Image;
  private bootChaos = false;
  private botDelay: number[] = [];
  private botFalseAt: number[] = [];
  private tension = 0;
  private duck!: Phaser.GameObjects.Image;

  constructor() {
    super('ritual-fiskesoen');
  }

  preload(): void {
    loadSvg(this, 'fisk-hills', art.hillsSvg(), 1920, 360);
    loadSvg(this, 'fisk-dock', art.dockSvg(), 1960, 130);
    loadSvg(this, 'fisk-post', art.postSvg(), 70, 560);
    loadSvg(this, 'fisk-surface', art.waterSurfaceSvg(), 256, 48);
    loadSvg(this, 'fisk-bed', art.seabedSvg(), 1920, 200);
    loadSvg(this, 'fisk-weed', art.seaweedSvg(), 90, 280);
    loadSvg(this, 'fisk-weed2', art.seaweedSvg('#2fae8a'), 90, 280);
    loadSvg(this, 'fisk-ray', art.raySvg(), 240, 600);
    loadSvg(this, 'fisk-bubble', art.bubbleSvg(), 40, 40);
    loadSvg(this, 'fisk-boot', art.bootSvg(), 230, 230);
    loadSvg(this, 'fisk-card', art.chaosCardSvg(), 150, 200);
    loadSvg(this, 'fisk-rod', art.rodSvg(), 300, 60);
    loadSvg(this, 'fisk-hook', art.hookSvg(), 60, 90);
    loadSvg(this, 'fisk-duck', art.duckSvg(), 140, 110);
    loadSvg(this, 'fisk-lily', art.lilySvg(), 160, 60);
    loadSvg(this, 'fisk-excl', art.exclaimSvg(), 90, 110);
    loadSvg(this, 'fisk-water', svgDoc(64, 256, `<rect width="64" height="256" fill="url(#w)"/>`, linear('w', '#3fb8f2', '#0c2f6e')), 64, 256);
    FISH_COLORS.forEach((c, i) => loadSvg(this, `fisk-fish-${i}`, art.fishSvg(c), 260, 170));
    PLAYER_COLORS.forEach((c, i) => loadSvg(this, `fisk-bobber-${i}`, art.bobberSvg(c.hex), 56, 76));
  }

  protected setup(): void {
    this.anglers = [];
    this.fish = [];
    this.phase = 'intro';
    this.phaseT = 0;
    this.nowAt = 0;
    this.tension = 0;
    const forced = new URLSearchParams(location.search).get('boot');
    this.bootChaos = forced !== null ? forced === '1' : this.rng() < 0.25;

    this.buildWorld();
    this.buildFish();

    // Spillere på broen
    for (const p of this.players) {
      const x = XS[p.slot];
      const blok = this.spawnBlok(p, x, DOCK, { size: 0.95 }).setDepth(200);
      const rod = this.add.image(x + 46, DOCK - 74, 'fisk-rod').setOrigin(0.12, 0.5).setScale(ROD_SCALE).setAngle(ROD_IDLE).setDepth(260);
      const bobber = this.add.image(0, 0, `fisk-bobber-${p.slot}`).setScale(0.8).setDepth(255).setVisible(false);
      const hook = this.add.image(0, 0, 'fisk-hook').setOrigin(0.5, 0.05).setScale(0.8).setDepth(-4500);
      this.anglers.push({ p, blok, rod, bobber, hook, line: 'rod', cast: false, time: 0, penalty: 0, lastFalse: -9, depth: rand(this, 730, 880), pill: null, sunk: Promise.resolve() });
      this.tweens.add({ targets: rod, angle: ROD_IDLE - 4, duration: 900 + p.slot * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.lineG = this.add.graphics().setDepth(250);

    this.botDelay = this.players.map(() => rand(this, 0.24, 0.62));
    this.botFalseAt = this.players.map(() => (this.rng() < 0.15 ? rand(this, 0.3, 1.3) : -1));

    this.header = ritualHeader(this, 'FISKESØEN', 'Vent på NU! – så KAST!', '#2f9be8');
    this.setLayoutAll(() => ({ kind: 'mash', label: 'KAST!', icon: '🎣', hint: 'Vent til der står NU! på TV’et' }));

    this.time.delayedCall(2300, () => this.startReady());
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    gradientBackdrop(this, '#6cc8ff', '#e2f6ff');
    sun(this, 1730, 130, 0.75);
    clouds(this, 5, 40, 300);
    this.add.image(W / 2, DOCK + 40, 'fisk-hills').setOrigin(0.5, 1).setDepth(-7000);

    // Vand
    this.add.image(W / 2, WATER, 'fisk-water').setOrigin(0.5, 0).setDisplaySize(W, H - WATER).setDepth(-6000);
    POSTS.forEach((x) => this.add.image(x, DOCK + 60, 'fisk-post').setOrigin(0.5, 0).setDepth(-5500));
    [260, 880, 1300, 1700].forEach((x, i) => {
      const ray = this.add.image(x, WATER, 'fisk-ray').setOrigin(0.5, 0).setAlpha(0.13).setAngle(-8 + i * 4).setDepth(-5900);
      this.tweens.add({ targets: ray, angle: ray.angle + 7, alpha: 0.05, duration: 2600 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    const weeds: [number, string, number, number][] = [
      [60, 'fisk-weed', 1.1, -5400], [230, 'fisk-weed2', 0.8, -4700], [470, 'fisk-weed', 0.9, -5400], [820, 'fisk-weed2', 1.15, -5400],
      [1000, 'fisk-weed', 0.7, -4700], [1240, 'fisk-weed', 1.0, -5400], [1600, 'fisk-weed2', 0.9, -4700], [1820, 'fisk-weed', 1.2, -5400],
    ];
    weeds.forEach(([x, key, s, d], i) => {
      const w = this.add.image(x, BED + 30, key).setOrigin(0.5, 1).setScale(s).setDepth(d);
      this.tweens.add({ targets: w, angle: { from: -6, to: 6 }, duration: 1600 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.add.image(W / 2, BED - 40, 'fisk-bed').setOrigin(0.5, 0).setDepth(-4800);

    // Støvlen ligger og lurer på bunden
    this.boot = this.add.image(rand(this, 300, 1600), BED + 6, 'fisk-boot').setOrigin(0.5, 0.92).setScale(0.62).setAngle(-12).setDepth(-4750);
    this.tweens.add({ targets: this.boot, angle: -8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Bobler
    this.add
      .particles(0, 0, 'fisk-bubble', {
        x: { min: 40, max: W - 40 },
        y: { min: 820, max: 980 },
        speedY: { min: -140, max: -70 },
        speedX: { min: -12, max: 12 },
        scale: { min: 0.35, max: 0.9 },
        alpha: { start: 0.9, end: 0.2 },
        lifespan: 2200,
        frequency: 140,
      })
      .setDepth(-4600);

    // Overflade
    const surface = this.add.tileSprite(W / 2, WATER - 18, W, 48, 'fisk-surface').setOrigin(0.5, 0).setDepth(-3900);
    this.tweens.add({ targets: surface, tilePositionX: 256, duration: 3000, repeat: -1 });
    [[200, 0.9], [1290, 0.7]].forEach(([x, s]) => {
      const lily = this.add.image(x, WATER + 2, 'fisk-lily').setScale(s).setDepth(-3800);
      this.tweens.add({ targets: lily, y: WATER + 7, duration: 1300 + x, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.duck = this.add.image(-120, WATER - 4, 'fisk-duck').setScale(0.7).setDepth(-3800);
    this.tweens.add({ targets: this.duck, x: W + 120, duration: 42000, repeat: -1 });
    this.tweens.add({ targets: this.duck, angle: { from: -6, to: 6 }, y: WATER, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Bådebroen
    this.add.image(W / 2, DOCK - 18, 'fisk-dock').setOrigin(0.5, 0).setDepth(100);
  }

  private buildFish(): void {
    const items = lures(this, 7, true);
    items.forEach((lure, i) => {
      const isPick = lure.icon === this.pick.icon && lure.title === this.pick.title;
      const img = this.add.image(0, 0, `fisk-fish-${i % FISH_COLORS.length}`);
      const icon = emoji(this, -100, 4, lure.icon, 74);
      const c = this.add.container(0, 0, [img, icon]).setScale(isPick ? 0.9 : 0.72).setDepth(-5000 + i);
      const baseY = 720 + (i % 4) * 62 + rand(this, -10, 10);
      const f: Fish = {
        c,
        img,
        icon,
        x: 160 + ((i * 263) % (W - 320)),
        y: baseY,
        baseY,
        vx: (this.rng() < 0.5 ? -1 : 1) * rand(this, 90, 170),
        phase: rand(this, 0, Math.PI * 2),
        isPick,
        mode: 'swim',
      };
      this.faceFish(f, f.vx);
      this.fish.push(f);
    });
  }

  private faceFish(f: Fish, dir: number): void {
    const right = dir > 0;
    f.img.setFlipX(right);
    f.icon.x = right ? 100 : -100;
  }

  // ---------------------------------------------------------------------------
  // Faser

  private startReady(): void {
    this.phase = 'ready';
    this.phaseT = 0;
    this.nowAt = rand(this, 1.7, 3.0);
    shout(this, 'KLAR…', { size: 140, color: C.cream, hold: 450 });
    this.sfx('tick', { pitch: 0.8 });
    this.time.delayedCall(850, () => {
      if (this.phase === 'ready') {
        shout(this, 'PARAT…', { size: 150, color: C.cream, hold: 450 });
        this.sfx('tick', { pitch: 1 });
      }
    });
    for (const a of this.anglers) this.tweens.add({ targets: a.rod, angle: ROD_IDLE - 18, duration: 500, ease: 'Sine.easeOut' });
  }

  private startNow(): void {
    this.phase = 'now';
    this.phaseT = 0;
    shout(this, 'NU!', { size: 300, color: C.mint, hold: 500 });
    this.fx.flash(0xffffff, 160, 0.5);
    this.fx.punch(0.03, 160);
    this.sfx('go');
    this.header.setHint('KAST! KAST! KAST!', C.sun);
    for (const p of this.players) this.vibrate(p.slot, 80);
  }

  protected play(dt: number): void {
    this.phaseT += dt;
    this.swimFish(dt);

    if (this.phase === 'ready') {
      this.tension -= dt;
      if (this.tension <= 0 && this.phaseT > 1.6) {
        this.tension = 0.22;
        this.sfx('tick', { pitch: 1 + this.phaseT * 0.2, volume: 0.5 });
      }
      for (const a of this.anglers) if (this.pressed(a.p.slot)) this.falseStart(a);
      if (this.phaseT >= this.nowAt) this.startNow();
    } else if (this.phase === 'now') {
      for (const a of this.anglers) {
        if (a.cast) continue;
        if (this.pressed(a.p.slot)) this.cast(a, this.phaseT, false);
        else if (this.phaseT >= AUTO_CAST) this.cast(a, this.phaseT, true);
      }
      if (this.anglers.every((a) => a.cast) && this.phaseT > 0.4) {
        this.phase = 'catch';
        void this.catchSequence();
      }
    }
    this.drawLines();
  }

  private swimFish(dt: number): void {
    const t = this.elapsed;
    for (const f of this.fish) {
      if (f.mode !== 'swim') continue;
      f.x += f.vx * dt;
      if ((f.x < 130 && f.vx < 0) || (f.x > W - 130 && f.vx > 0)) {
        f.vx = -f.vx;
        this.faceFish(f, f.vx);
      }
      f.y = f.baseY + Math.sin(t * 1.6 + f.phase) * 14;
      f.c.setPosition(f.x, f.y);
      f.c.angle = Math.sin(t * 3 + f.phase) * 4;
    }
  }

  private falseStart(a: Angler): void {
    if (this.phaseT - a.lastFalse < 0.4) return;
    a.lastFalse = this.phaseT;
    a.penalty += 0.3;
    a.blok.bonk();
    this.sfx('wrong', { pan: this.panFor(a.blok.x) });
    this.fx.floatText(a.blok.x, DOCK - 300, 'FOR TIDLIGT!', C.tomato, 44);
    this.tweens.add({ targets: a.rod, angle: ROD_IDLE + 30, duration: 90, yoyo: true, repeat: 1 });
    this.vibrate(a.p.slot, 150);
  }

  private rodTip(a: Angler): { x: number; y: number } {
    const r = Phaser.Math.DegToRad(a.rod.angle);
    const len = ROD_LEN * a.rod.scaleX;
    return { x: a.rod.x + Math.cos(r) * len, y: a.rod.y + Math.sin(r) * len };
  }

  private cast(a: Angler, t: number, sloppy: boolean): void {
    a.cast = true;
    a.time = t + a.penalty;
    this.tweens.killTweensOf(a.rod);
    a.blok.squash(0.85, 1.15);
    this.sfx('whoosh', { pan: this.panFor(a.blok.x), pitch: 1.2 });
    this.vibrate(a.p.slot, 40);
    a.sunk = new Promise<void>((res) => this.throwLine(a, res));

    const txt = `${a.time.toFixed(2).replace('.', ',')} s`;
    const pill = this.add.container(a.blok.x, DOCK + 66).setDepth(150).setScale(0);
    const t1 = label(this, 0, 0, sloppy ? `zZz ${txt}` : txt, 36, { color: '#ffffff' });
    const pw = t1.width + 40;
    const g = this.add.graphics();
    g.fillStyle(N.ink, 1).fillRoundedRect(-pw / 2 - 4, -26, pw + 8, 56, 28);
    g.fillStyle(a.p.colorNum, 1).fillRoundedRect(-pw / 2, -24, pw, 48, 24);
    g.fillStyle(0xffffff, 0.25).fillRoundedRect(-pw / 2 + 14, -20, pw - 28, 12, 6);
    pill.add([g, t1]);
    a.pill = pill;
    this.tweens.add({ targets: pill, scale: 1, duration: 300, ease: 'Back.easeOut' });
    if (sloppy) this.fx.floatText(a.blok.x, DOCK - 300, 'SOVER DU?', C.cream, 40);
  }

  /** Stangen svinges, krogen flyver ud og synker. */
  private throwLine(a: Angler, onDone?: () => void): void {
    a.line = 'rod';
    this.tweens.add({
      targets: a.rod,
      angle: ROD_IDLE - 50,
      duration: 130,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: a.rod, angle: ROD_FISH, duration: 170, ease: 'Back.easeOut' });
        this.time.delayedCall(60, () => {
          const from = this.rodTip(a);
          const tx = a.blok.x + 244;
          a.line = 'fly';
          a.hook.setDepth(270);
          const st = { t: 0 };
          this.tweens.add({
            targets: st,
            t: 1,
            duration: 380,
            onUpdate: () => {
              const k = st.t;
              a.hook.x = from.x + (tx - from.x) * k;
              a.hook.y = from.y + (WATER - from.y) * k - Math.sin(k * Math.PI) * 120;
              a.hook.angle = k * 360;
            },
            onComplete: () => {
              a.line = 'water';
              a.hook.angle = 0;
              a.hook.setDepth(-4500);
              a.bobber.setVisible(true).setPosition(tx, WATER - 4);
              this.tweens.add({ targets: a.bobber, y: WATER + 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
              this.splash(tx, WATER, 0.6);
              this.tweens.add({ targets: a.hook, y: a.depth, duration: 800, ease: 'Sine.easeOut', onComplete: () => onDone?.() });
            },
          });
        });
      },
    });
  }

  private splash(x: number, y: number, size = 1): void {
    this.fx.burst(x, y, { texture: TEX.drop, color: [0xffffff, 0x9fe3ff, 0x47b8ff], count: Math.round(14 * size), speed: 520 * size, gravity: 1300, scale: 0.6 + size * 0.3, depth: 300 });
    this.sfx('splash', { volume: 0.3 + size * 0.5, pitch: 1.4 - size * 0.3, pan: this.panFor(x) });
  }

  private drawLines(): void {
    const g = this.lineG;
    g.clear();
    for (const a of this.anglers) {
      if (a.line === 'none') continue;
      const tip = this.rodTip(a);
      if (a.line === 'rod') {
        a.hook.setPosition(tip.x, tip.y + 46);
        a.hook.angle = Math.sin(this.elapsed * 3 + a.p.slot) * 10;
      }
      const end = a.line === 'water' ? { x: a.bobber.x, y: a.bobber.y - 20 } : { x: a.hook.x, y: a.hook.y + 2 };
      g.lineStyle(5, N.ink, 0.6);
      this.curve(g, tip.x, tip.y, end.x, end.y);
      g.lineStyle(2.5, 0xffffff, 0.95);
      this.curve(g, tip.x, tip.y, end.x, end.y);
      if (a.line === 'water') {
        g.lineStyle(2.5, 0xffffff, 0.75);
        g.lineBetween(a.bobber.x, a.bobber.y + 18, a.hook.x, a.hook.y + 4);
      }
    }
  }

  private curve(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    const sag = Math.min(60, Math.abs(x2 - x1) * 0.25 + 10);
    const cx = (x1 + x2) / 2;
    const cy = Math.max(y1, y2) + sag * 0.3;
    const pts = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x1, y1), new Phaser.Math.Vector2(cx, cy), new Phaser.Math.Vector2(x2, y2)).getPoints(14);
    g.strokePoints(pts);
  }

  // ---------------------------------------------------------------------------
  // Fangsten

  private async catchSequence(): Promise<void> {
    const sorted = [...this.anglers].sort((a, b) => a.time - b.time || a.p.slot - b.p.slot);
    const w = sorted[0];
    this.header.setHint(`${w.p.name} var hurtigst!`, C.sun);
    this.sfx('ding');
    if (w.pill) {
      this.tweens.add({ targets: w.pill, scale: 1.3, duration: 200, yoyo: true, repeat: 2 });
      const crown = this.add.image(w.pill.x - 4, w.pill.y - 46, TEX.crown).setScale(0).setDepth(160);
      this.tweens.add({ targets: crown, scale: 0.55, duration: 300, ease: 'Back.easeOut' });
    }
    this.fx.stars(w.blok.x, DOCK - 140, N.sun, 10);
    await Promise.all([w.sunk, wait(this, 700)]);

    if (this.bootChaos) {
      await this.bootSequence(w);
      if (!this.sys.isActive()) return;
    }
    await this.fishSequence(w);
  }

  private bite(w: Angler): void {
    const ex = this.add.image(w.blok.x + 120, DOCK - 150, 'fisk-excl').setScale(0).setDepth(7000);
    this.tweens.add({ targets: ex, scale: 0.9, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: ex, alpha: 0, delay: 900, duration: 250, onComplete: () => ex.destroy() });
    this.sfx('boing', { pitch: 1.4 });
    this.tweens.killTweensOf(w.bobber);
    this.tweens.add({ targets: w.bobber, y: WATER + 40, duration: 120, yoyo: true, repeat: 2 });
    this.splash(w.bobber.x, WATER, 0.5);
    this.vibrate(w.p.slot, 200);
  }

  /** Spolen hives ind: stangen bøjer og rykker. */
  private reel(w: Angler, ms: number): void {
    this.tweens.killTweensOf(w.rod);
    this.tweens.add({ targets: w.rod, angle: -58, duration: ms * 0.4, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: w.rod, x: w.rod.x + 4, duration: 50, yoyo: true, repeat: Math.floor(ms / 100) });
    for (let i = 0; i < ms / 70; i++) this.sfx('tick', { delay: i * 0.06, pitch: 0.6 + (i % 3) * 0.1, volume: 0.4 });
    w.blok.squash(1.1, 0.9);
  }

  private async bootSequence(w: Angler): Promise<void> {
    const boot = this.boot;
    this.tweens.killTweensOf(boot);
    // Krogen synker helt ned – og støvlen hopper hen og bider på!
    this.tweens.add({ targets: w.hook, y: BED - 110, duration: 600, ease: 'Sine.easeInOut' });
    const target = w.hook.x;
    const hops = 3;
    const startX = boot.x;
    for (let i = 1; i <= hops; i++) {
      const nx = startX + ((target - startX) * i) / hops;
      await new Promise<void>((res) => {
        this.tweens.add({ targets: boot, x: nx, duration: 340, ease: 'Linear' });
        this.tweens.add({
          targets: boot,
          y: BED - 70,
          angle: i % 2 ? 10 : -10,
          duration: 170,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.fx.dust(boot.x, BED, 6);
            this.sfx('boing', { pitch: 0.6 + i * 0.1, volume: 0.6 });
            res();
          },
        });
      });
    }
    this.bite(w);
    this.say('fishBiteMaybe', true);
    await wait(this, 450);
    this.reel(w, 800);
    w.line = 'water';
    this.tweens.add({ targets: [w.hook], y: WATER - 10, duration: 800, ease: 'Cubic.easeIn' });
    await new Promise<void>((res) =>
      this.tweens.add({ targets: boot, y: WATER + 60, x: target, angle: 0, duration: 800, ease: 'Cubic.easeIn', onComplete: () => res() }),
    );
    // Ud af vandet!
    this.splash(boot.x, WATER, 1.3);
    this.fx.shake(0.008, 200);
    w.line = 'none';
    w.bobber.setVisible(false);
    w.hook.setDepth(-4500);
    boot.setDepth(7100);
    this.sfx('whoosh');
    await new Promise<void>((res) => {
      this.tweens.add({ targets: boot, x: W / 2, duration: 700, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: boot, scale: 1.25, angle: 360 * 2 - 10, duration: 700, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: boot, y: 420, duration: 700, ease: 'Back.easeOut', onComplete: () => res() });
    });
    shout(this, 'EN STØVLE?!', { color: C.tomato, size: 150, y: 210, hold: 1100 });
    this.sfx('lose');
    this.say('fishBoot', true);
    w.blok.sad();
    for (const o of this.anglers) if (o !== w) o.blok.cheer();
    this.tweens.add({ targets: boot, angle: { from: -16, to: 16 }, duration: 70, yoyo: true, repeat: 7 });
    await wait(this, 1000);

    // Kaos-kortet spyttes ud af støvlen
    const card = this.add.container(boot.x, boot.y - 40).setDepth(7200).setScale(0);
    card.add([this.add.image(0, 0, 'fisk-card')]);
    this.fx.flash(N.grape, 200, 0.5);
    this.fx.burst(boot.x, boot.y - 60, { texture: TEX.star, color: [N.grape, N.bubblegum, 0xffffff], count: 26, speed: 800, scale: 0.7 });
    this.sfx('powerup');
    this.sfx('pop');
    this.tweens.add({ targets: card, scale: 1.5, y: boot.y - 200, angle: 360, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: boot, y: boot.y + 30, scaleY: 1.05, duration: 120, yoyo: true });
    await wait(this, 650);
    this.fx.floatText(card.x, card.y - 160, 'KAOS-KORT!', C.grape, 72);
    this.tweens.add({ targets: card, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 3 });
    await wait(this, 750);
    // Kortet parkeres i hjørnet, støvlen plasker tilbage
    this.tweens.add({ targets: card, x: W - 110, y: 300, scale: 0.7, angle: 12, duration: 600, ease: 'Cubic.easeInOut' });
    this.tweens.add({ targets: card, y: 290, duration: 900, delay: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.sfx('whoosh');
    this.tweens.add({ targets: boot, x: boot.x - 260, duration: 800, ease: 'Linear' });
    await new Promise<void>((res) =>
      this.tweens.add({ targets: boot, y: WATER + 20, angle: '+=200', scale: 0.62, duration: 800, ease: 'Quad.easeIn', onComplete: () => res() }),
    );
    this.splash(boot.x, WATER, 1);
    boot.setDepth(-4750);
    this.tweens.add({ targets: boot, y: BED + 6, angle: 160, duration: 1500, ease: 'Sine.easeOut' });

    // Nyt kast!
    for (const o of this.anglers) o.blok.idle();
    this.header.setHint('Anden gang er lykkens gang!', C.cream);
    await new Promise<void>((res) => this.throwLine(w, res));
  }

  private async fishSequence(w: Angler): Promise<void> {
    const f = this.fish.find((x) => x.isPick) ?? this.fish[0];
    f.mode = 'seek';
    const mouthOff = 100 * f.c.scaleX;
    const dir = w.hook.x >= f.x ? 1 : -1;
    this.faceFish(f, dir);
    const tx = w.hook.x - dir * mouthOff;
    const ty = w.hook.y + 50;
    const dist = Math.hypot(tx - f.x, ty - f.y);
    this.tweens.add({ targets: f.c, angle: 0, duration: 200 });
    await new Promise<void>((res) =>
      this.tweens.add({ targets: f.c, x: tx, y: ty, duration: Math.max(500, (dist / 520) * 1000), ease: 'Sine.easeInOut', onComplete: () => res() }),
    );
    f.mode = 'hooked';
    this.bite(w);
    for (const o of this.anglers) if (o !== w) o.blok.sad();
    await wait(this, 400);
    this.reel(w, 900);
    w.line = 'water';
    this.tweens.add({ targets: w.hook, y: WATER - 10, duration: 900, ease: 'Cubic.easeIn' });
    this.tweens.add({ targets: f.c, angle: { from: -18, to: 18 }, duration: 80, yoyo: true, repeat: 10 });
    await new Promise<void>((res) =>
      this.tweens.add({ targets: f.c, y: WATER + 40, duration: 900, ease: 'Cubic.easeIn', onComplete: () => res() }),
    );
    // SPLASH – fisken flyver op
    this.splash(f.c.x, WATER, 1.5);
    this.fx.shake(0.012, 260);
    w.line = 'none';
    w.bobber.setVisible(false);
    f.c.setDepth(7100);
    this.sfx('whoosh');
    w.blok.cheer();
    this.tweens.add({ targets: w.rod, angle: ROD_IDLE, duration: 500, ease: 'Back.easeOut' });
    await new Promise<void>((res) => {
      this.tweens.add({ targets: f.c, x: W / 2, duration: 800, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: f.c, scale: 1.5, angle: 720, duration: 800, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: f.c, y: 400, duration: 800, ease: 'Back.easeOut', onComplete: () => res() });
    });
    this.tweens.add({ targets: f.c, angle: { from: -14, to: 14 }, duration: 110, yoyo: true, repeat: 4 });
    this.sfx('squeak', { pitch: 1.3 });
    // Ikonet spyttes ud
    this.tweens.add({ targets: f.icon, scale: 1.8, duration: 300, ease: 'Back.easeOut' });
    this.fx.burst(f.c.x + f.icon.x * f.c.scaleX, f.c.y, { texture: TEX.spark, color: [0xffffff, N.sun], count: 16, speed: 600, scale: 0.8 });
    await wait(this, 450);
    this.tweens.add({ targets: f.c, scale: 0, duration: 300, delay: 300, ease: 'Back.easeIn' });
    this.header.hide();
    await revealPick(this, { x: f.c.x, y: f.c.y, winner: w.p, caption: `🎣 ${w.p.name} fangede den!` });
    if (!this.sys.isActive()) return;
    this.setLayoutAll(() => waitLayout(this));
    this.done({ chaos: this.bootChaos, winner: w.p.slot });
  }

  // ---------------------------------------------------------------------------
  // Bots: venter (de fleste) pænt og kaster efter en menneskelig reaktionstid.

  protected botInput(slot: number): BotInput | null {
    const a = this.anglers[slot];
    if (!a) return null;
    if (this.phase === 'ready' && this.botFalseAt[slot] > 0 && this.phaseT >= this.botFalseAt[slot]) {
      this.botFalseAt[slot] = -1;
      return { tap: true };
    }
    if (this.phase === 'now' && !a.cast && this.phaseT >= this.botDelay[slot]) return { tap: true };
    return null;
  }
}
