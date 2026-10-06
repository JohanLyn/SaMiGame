import Phaser from 'phaser';
import { PLAYER_COLORS } from '@samigame/shared';
import { shuffle } from '../../game/rng';
import type { BotInput, PlayerView } from '../../flow/types';
import { gradientBackdrop } from '../../kit/scenery';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, N, W } from '../../kit/theme';
import { TimerHud, label, title } from '../../kit/ui';
import type { Blok } from '../../objects/Blok';
import { RitualScene } from '../_framework/RitualScene';
import { emoji, rand, revealPick, ritualHeader, shout, wait, waitLayout, type Header } from '../_framework/ritualKit';
import * as art from './art';

const DOORS = art.WALL.cols * art.WALL.rows;
const THROW_TIME = 7.5;
const FLOOR = 1052;
const XS = [330, 750, 1170, 1590];
const CURSOR_SPEED = 1150;
const COOLDOWN = 0.24;

type Phase = 'intro' | 'throw' | 'pick';

interface Door {
  i: number;
  num: number;
  x: number;
  y: number;
  c: Phaser.GameObjects.Container;
  hits: number;
  byPlayer: number[];
  badge: Phaser.GameObjects.Container;
  badgeText: Phaser.GameObjects.Text;
}

interface Thrower {
  p: PlayerView;
  blok: Blok;
  cross: Phaser.GameObjects.Container;
  cx: number;
  cy: number;
  cd: number;
  hits: number;
}

/**
 * DEN STORE VÆG: en kæmpe julekalender med 12 låger. Alle sigter og kaster tomater.
 * Lågen med flest træffere åbnes – og bag den gemmer næste minigame sig (selvfølgelig).
 */
export class VaeggenScene extends RitualScene {
  private doors: Door[] = [];
  private throwers: Thrower[] = [];
  private phase: Phase = 'intro';
  private timeLeft = THROW_TIME;
  private timer: TimerHud | null = null;
  private header!: Header;
  private glow!: Phaser.GameObjects.Graphics;
  private botTarget: number[] = [];
  private botJitter: { x: number; y: number }[] = [];
  private botFlip: boolean[] = [];
  private botPause: number[] = [];

  constructor() {
    super('ritual-vaeggen');
  }

  preload(): void {
    loadSvg(this, 'vaeg-wall', art.wallSvg(), art.WALL.w + 120, art.WALL.h + 120);
    for (let i = 0; i < 6; i++) loadSvg(this, `vaeg-door-${i}`, art.doorSvg(i), art.DOOR_W + 20, art.DOOR_H + 24);
    loadSvg(this, 'vaeg-splat', art.splatSvg(), 128, 128);
    loadSvg(this, 'vaeg-tomato', art.tomatoSvg(), 80, 80);
    loadSvg(this, 'vaeg-crate', art.crateSvg(), 112, 96);
    loadSvg(this, 'vaeg-town', art.townSvg(), 1920, 420);
    loadSvg(this, 'vaeg-cobble', art.cobbleSvg(), 1920, 220);
    loadSvg(this, 'vaeg-moon', art.moonSvg(), 200, 200);
    loadSvg(this, 'vaeg-bulb', art.bulbSvg(), 36, 50);
    loadSvg(this, 'vaeg-spot', art.spotSvg(), 256, 256);
    PLAYER_COLORS.forEach((c, i) => loadSvg(this, `vaeg-cross-${i}`, art.crosshairSvg(c.hex), 120, 120));
  }

  protected setup(): void {
    this.doors = [];
    this.throwers = [];
    this.phase = 'intro';
    this.timeLeft = THROW_TIME;
    this.timer = null;

    this.buildWorld();
    this.buildDoors();
    this.glow = this.add.graphics().setDepth(40);

    for (const p of this.players) {
      const x = XS[p.slot];
      this.add.image(x + (p.slot < 2 ? -110 : 110), FLOOR + 4, 'vaeg-crate').setOrigin(0.5, 1).setDepth(FLOOR - 2).setScale(0.9);
      const blok = this.spawnBlok(p, x, FLOOR, { size: 0.88 }).setDepth(FLOOR);
      const start = art.doorCenter(8 + p.slot);
      const cross = this.add.container(start.x, start.y + 90).setDepth(6000).setAlpha(0);
      const img = this.add.image(0, 0, `vaeg-cross-${p.slot}`).setScale(0.85);
      const name = label(this, 0, 62, p.name, 24, { color: p.color });
      cross.add([img, name]);
      this.tweens.add({ targets: img, angle: 360, duration: 4000, repeat: -1 });
      this.throwers.push({ p, blok, cross, cx: cross.x, cy: cross.y, cd: 0, hits: 0 });
    }

    // Bots vælger en låge – nogle følges ad, så der opstår kapløb.
    const first = Math.floor(this.rng() * DOORS);
    this.botTarget = this.players.map(() => (this.rng() < 0.45 ? first : Math.floor(this.rng() * DOORS)));
    this.botJitter = this.players.map(() => ({ x: rand(this, -70, 70), y: rand(this, -40, 40) }));
    this.botFlip = this.players.map(() => false);
    this.botPause = this.players.map(() => rand(this, 0.2, 0.7));

    this.header = ritualHeader(this, 'DEN STORE VÆG', 'Sigt med pinden – og KAST tomater!', '#e0383e');
    this.setLayoutAll(() => ({ kind: 'stick', a: 'KAST 🍅', hint: 'Sigt på en låge og kast tomater!' }));
    this.time.delayedCall(2000, () => this.startThrowing());
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    gradientBackdrop(this, '#0e0a33', '#4a2c86');
    // Stjerner
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(rand(this, 0, W), rand(this, 0, 560), TEX.spark).setScale(rand(this, 0.15, 0.4)).setAlpha(0.7).setDepth(-9500);
      this.tweens.add({ targets: s, alpha: 0.15, duration: rand(this, 600, 1600), yoyo: true, repeat: -1, delay: rand(this, 0, 1000) });
    }
    const moon = this.add.image(150, 150, 'vaeg-moon').setDepth(-9400).setScale(0.9);
    this.tweens.add({ targets: moon, angle: { from: -6, to: 6 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(W / 2, 880, 'vaeg-town').setOrigin(0.5, 1).setDepth(-9000);
    this.add.image(W / 2, 860, 'vaeg-cobble').setOrigin(0.5, 0).setDepth(-8000);

    // Lyskæder på tværs
    const g = this.add.graphics().setDepth(-8500);
    const chains: [number, number, number, number, number][] = [
      [250, 70, 560, 40, 170],
      [1400, 40, 1960, 120, 230],
    ];
    const bulbColors = [N.tomato, N.sun, N.mint, N.sky, N.bubblegum];
    chains.forEach(([x1, y1, x2, y2, sag], ci) => {
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x1, y1), new Phaser.Math.Vector2((x1 + x2) / 2, Math.max(y1, y2) + sag - 100), new Phaser.Math.Vector2(x2, y2));
      g.lineStyle(5, N.ink, 1);
      g.strokePoints(curve.getPoints(30));
      curve.getPoints(12).forEach((pt, k) => {
        if (k === 0 || k === 12) return;
        const b = this.add.image(pt.x, pt.y, 'vaeg-bulb').setOrigin(0.5, 0.05).setScale(0.8).setDepth(-8400).setTint(bulbColors[(k + ci) % bulbColors.length]);
        this.tweens.add({ targets: b, alpha: 0.45, duration: 400 + ((k * 97) % 300), yoyo: true, repeat: -1, delay: k * 60 });
        this.tweens.add({ targets: b, angle: { from: -8, to: 8 }, duration: 1400 + k * 30, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    });

    // Sne
    this.add
      .particles(0, -20, TEX.dot, {
        x: { min: 0, max: W },
        speedY: { min: 40, max: 110 },
        speedX: { min: -30, max: 30 },
        scale: { min: 0.12, max: 0.35 },
        alpha: { start: 0.9, end: 0.3 },
        lifespan: 12000,
        frequency: 90,
      })
      .setDepth(5000);

    this.add.image(W / 2, art.WALL.y + art.WALL.h / 2, 'vaeg-wall').setDepth(0);
  }

  private buildDoors(): void {
    const nums = shuffle(this.rng, Array.from({ length: DOORS }, (_, i) => i + 1));
    for (let i = 0; i < DOORS; i++) {
      const { x, y } = art.doorCenter(i);
      const c = this.add.container(x - art.DOOR_W / 2, y).setDepth(10);
      const img = this.add.image(art.DOOR_W / 2, 4, `vaeg-door-${(i * 5) % 6}`);
      const num = title(this, art.DOOR_W / 2 + 14, 4, String(nums[i]), 80, { color: C.cream });
      c.add([img, num]);
      const badge = this.add.container(x + art.DOOR_W / 2 - 18, y - art.DOOR_H / 2 + 6).setDepth(45).setScale(0);
      const bg = this.add.graphics();
      bg.fillStyle(N.ink, 1).fillRoundedRect(-52, -26, 104, 52, 26);
      bg.fillStyle(0xffffff, 1).fillRoundedRect(-48, -22, 96, 44, 22);
      const tom = this.add.image(-24, 0, 'vaeg-tomato').setScale(0.48);
      const badgeText = label(this, 18, 0, '0', 34, { color: C.ink, stroke: 0 });
      badgeText.setShadow(0, 0, C.ink, 0, false, false);
      badge.add([bg, tom, badgeText]);
      this.doors.push({ i, num: nums[i], x, y, c, hits: 0, byPlayer: [0, 0, 0, 0], badge, badgeText });
    }
  }

  // ---------------------------------------------------------------------------
  // Spil

  private startThrowing(): void {
    this.phase = 'throw';
    this.timer = new TimerHud(this, W - 120, 120, THROW_TIME);
    shout(this, 'KAST!', { color: C.tomato, size: 220, hold: 500 });
    this.sfx('go');
    for (const t of this.throwers) this.tweens.add({ targets: t.cross, alpha: 1, duration: 250 });
  }

  protected play(dt: number): void {
    if (this.phase !== 'throw') return;
    this.timeLeft -= dt;
    this.timer?.set(this.timeLeft);
    if (this.timeLeft <= 3 && Math.ceil(this.timeLeft) !== Math.ceil(this.timeLeft + dt) && this.timeLeft > 0) this.sfx('tick');

    const { x: wx, y: wy, w: ww, h: wh } = art.WALL;
    for (const t of this.throwers) {
      const pad = this.pad(t.p.slot);
      t.cx = Phaser.Math.Clamp(t.cx + pad.x * CURSOR_SPEED * dt, wx + 30, wx + ww - 30);
      t.cy = Phaser.Math.Clamp(t.cy + pad.y * CURSOR_SPEED * dt, wy + 30, wy + wh - 30);
      t.cross.setPosition(t.cx, t.cy);
      t.cd -= dt;
      if (Math.abs(t.cx - t.blok.x) > 30) t.blok.setFacing(t.cx > t.blok.x ? 1 : -1);
      if (this.pressedA(t.p.slot) && t.cd <= 0) this.throwTomato(t);
    }
    this.drawLeader();
    if (this.timeLeft <= 0) {
      this.phase = 'pick';
      void this.pickSequence();
    }
  }

  private doorAt(x: number, y: number): Door | null {
    return this.doors.find((d) => Math.abs(x - d.x) < art.DOOR_W / 2 && Math.abs(y - d.y) < art.DOOR_H / 2) ?? null;
  }

  private throwTomato(t: Thrower): void {
    t.cd = COOLDOWN;
    const tx = t.cx + rand(this, -10, 10);
    const ty = t.cy + rand(this, -10, 10);
    const sx = t.blok.x + t.blok.facing * 36;
    const sy = FLOOR - 170;
    const tom = this.add.image(sx, sy, 'vaeg-tomato').setDepth(5500).setScale(0.9);
    t.blok.squash(0.85, 1.15);
    this.sfx('swish', { pan: this.panFor(sx), pitch: rand(this, 0.9, 1.2) });
    const st = { k: 0 };
    this.tweens.add({
      targets: st,
      k: 1,
      duration: 330,
      onUpdate: () => {
        const k = st.k;
        tom.x = sx + (tx - sx) * k;
        tom.y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * 140;
        tom.setScale(0.9 - k * 0.35);
        tom.angle = k * 540;
      },
      onComplete: () => {
        tom.destroy();
        this.impact(t, tx, ty);
      },
    });
  }

  private impact(t: Thrower, x: number, y: number): void {
    this.sfx('splat', { pan: this.panFor(x), pitch: rand(this, 0.85, 1.2), volume: 0.7 });
    this.fx.burst(x, y, { texture: TEX.drop, color: [0xff4b4b, 0xd42020, 0xffe08a], count: 10, speed: 420, gravity: 1200, scale: 0.5, depth: 5200 });
    const door = this.phase === 'pick' ? null : this.doorAt(x, y);
    const splat = this.add.image(x, y, 'vaeg-splat').setAngle(rand(this, 0, 360)).setScale(0.2);
    this.tweens.add({ targets: splat, scale: rand(this, 0.55, 0.75), duration: 120, ease: 'Back.easeOut' });
    if (door) {
      splat.setPosition(x - door.c.x, y - door.c.y);
      door.c.add(splat);
      door.hits++;
      door.byPlayer[t.p.slot]++;
      t.hits++;
      this.stat(t.p.slot, 'hits');
      door.badgeText.setText(String(door.hits));
      if (door.badge.scale === 0) this.tweens.add({ targets: door.badge, scale: 1, duration: 260, ease: 'Back.easeOut' });
      else this.tweens.add({ targets: door.badge, scale: 1.3, duration: 90, yoyo: true });
      this.tweens.add({ targets: door.c, angle: { from: rand(this, -4, 4), to: 0 }, duration: 260, ease: 'Elastic.easeOut' });
      this.vibrate(t.p.slot, 30);
      if (t.p.isBot || this.isBotNow(t.p.slot)) this.botRetarget(t.p.slot);
    } else {
      splat.setDepth(5);
    }
  }

  private leader(): Door | null {
    let best: Door | null = null;
    for (const d of this.doors) if (d.hits > 0 && (!best || d.hits > best.hits)) best = d;
    return best;
  }

  private drawLeader(): void {
    const g = this.glow;
    g.clear();
    const d = this.leader();
    if (!d) return;
    const pulse = 0.6 + Math.sin(this.elapsed * 10) * 0.3;
    g.lineStyle(14, N.sun, pulse);
    g.strokeRoundedRect(d.x - art.DOOR_W / 2 - 14, d.y - art.DOOR_H / 2 - 10, art.DOOR_W + 28, art.DOOR_H + 24, 24);
    g.lineStyle(5, 0xffffff, pulse);
    g.strokeRoundedRect(d.x - art.DOOR_W / 2 - 14, d.y - art.DOOR_H / 2 - 10, art.DOOR_W + 28, art.DOOR_H + 24, 24);
  }

  // ---------------------------------------------------------------------------
  // Afsløring

  private async pickSequence(): Promise<void> {
    this.timer?.destroy();
    this.timer = null;
    this.glow.clear();
    shout(this, 'STOP!', { color: C.cream, size: 200, hold: 500 });
    this.sfx('whoosh');
    this.sfx('ding', { delay: 0.1 });
    for (const t of this.throwers) this.tweens.add({ targets: t.cross, alpha: 0, scale: 0.4, duration: 300 });
    this.header.setHint('Og lågen der åbnes er…', C.sun);

    // Mest ramte låge (uafgjort: tilfældig blandt de bedste – ingen træffere: helt tilfældig).
    const max = Math.max(...this.doors.map((d) => d.hits));
    const best = this.doors.filter((d) => d.hits === max);
    const win = best[Math.floor(this.rng() * best.length)];
    await wait(this, 700);

    // Projektøren farer rundt og lander på vinderlågen
    const dim = this.add.rectangle(W / 2, art.WALL.y + art.WALL.h / 2, art.WALL.w, art.WALL.h, N.night, 0).setDepth(50);
    this.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 300 });
    const spot = this.add.image(win.x, win.y, 'vaeg-spot').setDepth(55).setScale(1.9, 1.3).setAlpha(0);
    this.tweens.add({ targets: spot, alpha: 0.75, duration: 200 });
    const others = shuffle(this.rng, this.doors.filter((d) => d !== win)).slice(0, 7);
    const path = [...others, win];
    for (let i = 0; i < path.length; i++) {
      const d = path[i];
      const ms = 110 + i * i * 9;
      spot.setPosition(d.x, d.y);
      this.sfx('tick', { pitch: 1.4 - i * 0.05 });
      await wait(this, ms);
    }
    this.sfx('drumroll');
    this.tweens.add({ targets: win.c, angle: { from: -3, to: 3 }, duration: 60, yoyo: true, repeat: 9 });
    this.tweens.add({ targets: win.badge, scale: 1.4, duration: 300, yoyo: true });
    await wait(this, 1100);

    // Lågen springer op!
    this.sfx('squeak', { pitch: 0.5 });
    this.sfx('pop', { delay: 0.1 });
    this.tweens.add({ targets: win.c, scaleX: 0.1, duration: 420, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: win.badge, scale: 0, duration: 200 });
    this.fx.flash(0xfff3c0, 200, 0.6);
    this.fx.shake(0.008, 200);
    const icon = emoji(this, win.x + 10, win.y, this.pick.icon, 120).setDepth(60).setScale(0);
    this.tweens.add({ targets: icon, scale: 1, duration: 700, ease: 'Elastic.easeOut' });
    this.fx.burst(win.x, win.y, { texture: TEX.star, color: [N.sun, 0xffffff, N.mint], count: 22, speed: 700, scale: 0.6, depth: 70 });
    this.sfx('coin', { delay: 0.15 });

    const ranking = [...this.throwers].sort((a, b) => win.byPlayer[b.p.slot] - win.byPlayer[a.p.slot] || b.hits - a.hits);
    const winner = ranking[0];
    for (const t of this.throwers) (t === winner ? t.blok.dance() : t.blok.cheer());
    const n = win.byPlayer[winner.p.slot];
    await wait(this, 1100);
    this.header.hide();
    this.tweens.add({ targets: icon, scale: 0, duration: 250, delay: 200 });
    await revealPick(this, {
      x: win.x,
      y: win.y,
      winner: winner.p,
      caption: n > 0 ? `🍅 ${winner.p.name} ramte låge ${win.num} ${n} ${n === 1 ? 'gang' : 'gange'}!` : `🍅 Låge ${win.num} vandt helt af sig selv!`,
    });
    if (!this.sys.isActive()) return;
    this.setLayoutAll(() => waitLayout(this));
    this.done({ winner: n > 0 ? winner.p.slot : undefined });
  }

  // ---------------------------------------------------------------------------
  // Bots: sigter mod en låge, kaster løs og følger ofte flokken.

  private botRetarget(slot: number): void {
    if (this.rng() > 0.3) return;
    const lead = this.leader();
    this.botTarget[slot] = lead && this.rng() < 0.6 ? lead.i : Math.floor(this.rng() * DOORS);
    this.botJitter[slot] = { x: rand(this, -80, 80), y: rand(this, -45, 45) };
    this.botPause[slot] = rand(this, 0.1, 0.4);
  }

  protected botInput(slot: number, dt: number): BotInput | null {
    if (this.phase !== 'throw') return null;
    const t = this.throwers[slot];
    if (!t) return null;
    if (this.botPause[slot] > 0) {
      this.botPause[slot] -= dt;
      return { x: 0, y: 0, a: false };
    }
    const d = this.doors[this.botTarget[slot]];
    const j = this.botJitter[slot];
    const dx = d.x + j.x - t.cx;
    const dy = d.y + j.y - t.cy;
    const dist = Math.hypot(dx, dy);
    if (dist > 28) {
      const k = Math.min(1, dist / 140) / dist;
      return { x: dx * k, y: dy * k, a: false };
    }
    this.botFlip[slot] = !this.botFlip[slot];
    return { x: 0, y: 0, a: this.botFlip[slot] };
  }
}
