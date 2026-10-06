import Phaser from 'phaser';
import type { BotInput, PlayerView } from '../../flow/types';
import { clouds, gradientBackdrop, islandSvg, palm } from '../../kit/scenery';
import { addSvg, loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { label, title } from '../../kit/ui';
import type { Blok } from '../../objects/Blok';
import { RitualScene } from '../_framework/RitualScene';
import { emoji, lures, rand, revealPick, ritualHeader, shout, wait, waitLayout, type Header } from '../fiskesoen/ritualKit';
import * as art from './art';

const TARGET = 110;
const MAX_TICKLE = 10;
const FLOOR = 1010;
const XS = [360, 640, 1280, 1560];
const NOSTRIL_L = { x: 918, y: 684 };
const NOSTRIL_R = { x: 1002, y: 684 };
const METER = { x: 1800, y: 590, top: 290, bottom: 800 };

type Phase = 'intro' | 'tickle' | 'sneeze';

interface Tickler {
  p: PlayerView;
  blok: Blok;
  feather: Phaser.GameObjects.Image;
  hand: { x: number; y: number };
  nostril: { x: number; y: number };
  wiggle: number;
  count: number;
  countText: Phaser.GameObjects.Text;
  pill: Phaser.GameObjects.Container;
  lastSqueak: number;
}

/**
 * VULKANEN DER NYSER: alle hamrer "KILD!" med lange fjer-stænger. Kilde-o-meteret stiger,
 * vulkanen kæmper imod … og nyser et kæmpe æg ud, som klækker til næste minigame.
 */
export class VulkanScene extends RitualScene {
  private phase: Phase = 'intro';
  private header!: Header;
  private ticklers: Tickler[] = [];
  private total = 0;
  private shown = 0;
  private tickleTime = 0;
  private volc!: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Image[] = [];
  private brows: Phaser.GameObjects.Image[] = [];
  private nose!: Phaser.GameObjects.Image;
  private mouth!: Phaser.GameObjects.Image;
  private cheeks: Phaser.GameObjects.Image[] = [];
  private poles!: Phaser.GameObjects.Graphics;
  private fill!: Phaser.GameObjects.Graphics;
  private pct!: Phaser.GameObjects.Text;
  private crown!: Phaser.GameObjects.Image;
  private aah: Phaser.GameObjects.Text | null = null;
  private aahLevel = 0;
  private botRate: number[] = [];
  private rumble = 0;

  constructor() {
    super('ritual-vulkan');
  }

  preload(): void {
    loadSvg(this, 'vulk-volcano', art.volcanoSvg(), art.VOLC.w, art.VOLC.h);
    for (const m of ['open', 'squint', 'shut'] as const) loadSvg(this, `vulk-eye-${m}`, art.eyeSvg(m), 130, 110);
    for (const m of ['grin', 'oh', 'blast'] as const) loadSvg(this, `vulk-mouth-${m}`, art.mouthSvg(m), 260, 120);
    loadSvg(this, 'vulk-brow', art.browSvg(), 140, 40);
    loadSvg(this, 'vulk-nose', art.noseSvg(), 280, 220);
    loadSvg(this, 'vulk-cheek', art.cheekSvg(), 120, 70);
    loadSvg(this, 'vulk-feather', art.featherSvg(), 160, 80);
    loadSvg(this, 'vulk-snot', art.snotSvg(), 80, 80);
    loadSvg(this, 'vulk-ssplat', art.screenSplatSvg(), 260, 300);
    loadSvg(this, 'vulk-meter', art.meterSvg(), 160, 640);
    loadSvg(this, 'vulk-meterglass', art.meterGlassSvg(), 160, 640);
    loadSvg(this, 'vulk-sea', art.seaSvg(), 64, 256);
    loadSvg(this, 'vulk-sun', art.sunsetSunSvg(), 400, 400);
    loadSvg(this, 'vulk-island', islandSvg(900, 120), 1940, 390);
    for (let i = 1; i <= 3; i++) loadSvg(this, `vulk-crack-${i}`, art.crackSvg(i), 230, 290);
  }

  protected setup(): void {
    this.phase = 'intro';
    this.ticklers = [];
    this.eyes = [];
    this.brows = [];
    this.cheeks = [];
    this.total = 0;
    this.shown = 0;
    this.tickleTime = 0;
    this.aah = null;
    this.aahLevel = 0;
    this.rumble = 0;
    this.botRate = this.players.map(() => rand(this, 5, 8));

    // Ægget får prikker i minigamets farve.
    const color = this.pick.color;
    void addSvg(this, `vulk-egg-${color}`, art.eggSvg(color), 230, 290);
    void addSvg(this, `vulk-eggtop-${color}`, art.eggHalfSvg(true, color), 230, 170);
    void addSvg(this, `vulk-eggbot-${color}`, art.eggHalfSvg(false, color), 230, 150);

    this.buildWorld();
    this.buildVolcano();
    this.buildPlayers();
    this.buildMeter();

    this.header = ritualHeader(this, 'VULKANEN DER NYSER', 'Hamr løs på KILD! – få den til at nyse!', '#e0582a');
    this.setLayoutAll(() => ({ kind: 'mash', label: 'KILD!', icon: '🪶', hint: 'Kild vulkanen i næsen – hurtigt!' }));
    this.time.delayedCall(2300, () => {
      this.phase = 'tickle';
      shout(this, 'KILD!', { color: C.bubblegum, size: 220, hold: 450 });
      this.sfx('go');
    });
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    gradientBackdrop(this, '#3a2a8a', '#ffa07a');
    const sunImg = this.add.image(1520, 700, 'vulk-sun').setDepth(-9500).setScale(0.95);
    this.tweens.add({ targets: sunImg, scale: 1.0, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    clouds(this, 4, 60, 380, -9000);
    // Lokkemad i skyerne: små minigame-ikoner der svæver forbi som balloner
    lures(this, 5).forEach((l, i) => {
      const ic = emoji(this, 200 + i * 380, 300 + (i % 2) * 90, l.icon, 54).setDepth(-8900).setAlpha(0.85);
      this.tweens.add({ targets: ic, y: ic.y - 30, angle: { from: -8, to: 8 }, duration: 1800 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.add.image(W / 2, 760, 'vulk-sea').setOrigin(0.5, 0).setDisplaySize(W, H - 760).setDepth(-8500);
    for (let i = 0; i < 18; i++) {
      const wv = this.add.rectangle(rand(this, 0, W), rand(this, 780, 900), rand(this, 40, 110), 6, 0xffffff, 0.35).setDepth(-8400);
      this.tweens.add({ targets: wv, x: wv.x + rand(this, 20, 50), alpha: 0.05, duration: rand(this, 1400, 2800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.image(W / 2, 1080 + 40, 'vulk-island').setOrigin(0.5, 1).setDepth(-8000);
    palm(this, 140, 960, 1.05, -7000);
    palm(this, 1690, 980, 0.85, -7000);

    // Røg fra krateret
    this.add
      .particles(W / 2, 330, TEX.puff, {
        x: { min: -60, max: 60 },
        speedY: { min: -120, max: -60 },
        speedX: { min: -30, max: 40 },
        scale: { start: 0.8, end: 2.4 },
        alpha: { start: 0.55, end: 0 },
        tint: [0x8a7a9a, 0x6a5a7a, 0xb0a0c0],
        lifespan: 2400,
        frequency: 160,
      })
      .setDepth(-5900);
  }

  private buildVolcano(): void {
    const v = this.add.container(art.VOLC.x, art.VOLC.base).setDepth(-5000);
    v.add(this.add.image(0, 0, 'vulk-volcano').setOrigin(0.5, 1));
    // Kraterglød
    const glow = this.add.image(0, -540, TEX.puff).setTint(0xffa040).setScale(3, 1).setAlpha(0.6);
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
    v.add(glow);
    for (const [x, k] of [[-90, 0], [90, 1]] as const) {
      const cheek = this.add.image(x * 1.55, -235, 'vulk-cheek').setAlpha(0);
      const eye = this.add.image(x, -400, 'vulk-eye-open').setScale(0.95);
      const brow = this.add.image(x, -470, 'vulk-brow').setScale(0.9).setFlipX(k === 1);
      this.cheeks.push(cheek);
      this.eyes.push(eye);
      this.brows.push(brow);
      v.add([cheek, eye, brow]);
    }
    this.nose = this.add.image(0, -290, 'vulk-nose').setScale(0.85);
    this.mouth = this.add.image(0, -135, 'vulk-mouth-grin').setScale(0.9);
    v.add([this.nose, this.mouth]);
    this.volc = v;
    // Blink
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (this.phase === 'sneeze' || this.eyes[0].texture.key !== 'vulk-eye-open') return;
        for (const e of this.eyes) e.setScale(0.95, 0.15);
        this.time.delayedCall(110, () => this.eyes.forEach((e) => e.setScale(0.95)));
      },
    });
  }

  private buildPlayers(): void {
    this.poles = this.add.graphics().setDepth(FLOOR + 10);
    for (const p of this.players) {
      const x = XS[p.slot];
      const left = x < W / 2;
      const blok = this.spawnBlok(p, x, FLOOR, { size: 0.85 }).setDepth(FLOOR);
      blok.setFacing(left ? 1 : -1);
      const nostril = left ? NOSTRIL_L : NOSTRIL_R;
      const hand = { x: x + (left ? 30 : -30), y: FLOOR - 82 };
      const feather = this.add.image(0, 0, 'vulk-feather').setOrigin(0.06, 0.5).setScale(0.75).setDepth(-4900);
      const pill = this.add.container(x, FLOOR + 40).setDepth(FLOOR + 20);
      const g = this.add.graphics();
      g.fillStyle(N.ink, 1).fillRoundedRect(-62, -24, 124, 50, 25);
      g.fillStyle(p.colorNum, 1).fillRoundedRect(-58, -22, 116, 44, 22);
      g.fillStyle(0xffffff, 0.25).fillRoundedRect(-44, -18, 88, 10, 5);
      const countText = label(this, 0, 0, '🪶 0', 30, { color: '#ffffff' });
      pill.add([g, countText]);
      this.ticklers.push({ p, blok, feather, hand, nostril, wiggle: 0, count: 0, countText, pill, lastSqueak: -1 });
    }
    this.crown = this.add.image(0, 0, TEX.crown).setScale(0.6).setDepth(FLOOR + 30).setVisible(false);
  }

  private buildMeter(): void {
    const t = title(this, METER.x, 240, 'KILDE-O-METER', 30, { color: C.sun }).setDepth(7000);
    this.tweens.add({ targets: t, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1 });
    this.add.image(METER.x, METER.y, 'vulk-meter').setDepth(6900);
    this.fill = this.add.graphics().setDepth(6901);
    this.add.image(METER.x, METER.y, 'vulk-meterglass').setDepth(6902);
    this.pct = label(this, METER.x, METER.y + 230, '0%', 36, { color: '#ffffff' }).setDepth(6903);
  }

  // ---------------------------------------------------------------------------
  // Spil

  protected play(dt: number): void {
    if (this.phase === 'tickle') {
      this.tickleTime += dt;
      for (const t of this.ticklers) {
        const n = this.taps(t.p.slot);
        if (n <= 0) continue;
        this.total += n;
        t.count += n;
        t.countText.setText(`🪶 ${t.count}`);
        t.wiggle = 1;
        t.blok.squash(1.08, 0.94, 50);
        if (this.elapsed - t.lastSqueak > 0.14) {
          t.lastSqueak = this.elapsed;
          this.sfx('squeak', { volume: 0.25, pitch: 0.9 + this.total / TARGET, pan: this.panFor(t.blok.x) });
          this.fx.burst(t.nostril.x + (t.nostril === NOSTRIL_L ? -40 : 40), t.nostril.y, { texture: TEX.spark, color: [0xffffff, N.bubblegum], count: 3, speed: 200, scale: 0.4, gravity: 0, lifespan: 400 });
        }
        if (!this.tweens.isTweening(this.nose)) this.tweens.add({ targets: this.nose, scaleX: 0.95, scaleY: 0.8, duration: 70, yoyo: true });
      }
      if (this.tickleTime >= MAX_TICKLE && this.total < TARGET) {
        this.total = TARGET;
        this.say('Den kan ikke holde den inde!', true);
      }
      this.updateFace(dt);
      if (this.total >= TARGET) {
        this.phase = 'sneeze';
        void this.sneezeSequence();
      }
    }
    this.drawPoles(dt);
    this.drawMeter(dt);
  }

  private updateFace(dt: number): void {
    const f = Math.min(1, this.total / TARGET);
    const eye = f < 0.35 ? 'vulk-eye-open' : f < 0.75 ? 'vulk-eye-squint' : 'vulk-eye-shut';
    for (const e of this.eyes) if (e.texture.key !== eye) e.setTexture(eye);
    const mouth = f < 0.3 ? 'vulk-mouth-grin' : 'vulk-mouth-oh';
    if (this.mouth.texture.key !== mouth) this.mouth.setTexture(mouth);
    this.mouth.setScale(0.9 * (1 + f * 0.3));
    for (const c of this.cheeks) c.setAlpha(f);
    this.brows[0].angle = -f * 18;
    this.brows[1].angle = f * 18;
    this.volc.x = art.VOLC.x + Math.sin(this.elapsed * 45) * f * f * 7;
    // A … AA … AAAH …
    const level = f >= 0.85 ? 3 : f >= 0.6 ? 2 : f >= 0.3 ? 1 : 0;
    if (level > this.aahLevel) {
      this.aahLevel = level;
      this.aah?.destroy();
      const txt = ['', 'A…', 'AAH…', 'AAAAH…'][level];
      this.aah = title(this, 1340, 380, txt, 60 + level * 26, { color: C.cream }).setDepth(6000).setAngle(-8);
      this.fx.popIn(this.aah);
      this.tweens.add({ targets: this.aah, angle: -2, duration: 120, yoyo: true, repeat: -1 });
      this.sfx('whoosh', { pitch: 0.4 + level * 0.15 });
    }
    this.rumble -= dt;
    if (f > 0.5 && this.rumble <= 0) {
      this.rumble = 0.9;
      this.sfx('rumble', { volume: 0.3 + f * 0.4 });
      this.fx.shake(0.002 + f * 0.004, 200);
    }
  }

  private drawPoles(dt: number): void {
    const g = this.poles;
    g.clear();
    for (const t of this.ticklers) {
      t.wiggle = Math.max(0, t.wiggle - dt * 6);
      const dx = t.nostril.x - t.hand.x;
      const dy = t.nostril.y - t.hand.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const reach = 110 - t.wiggle * 30 + Math.sin(this.elapsed * 3 + t.p.slot) * 6;
      const tip = { x: t.nostril.x - ux * reach, y: t.nostril.y - uy * reach };
      g.lineStyle(14, N.ink, 1).lineBetween(t.hand.x, t.hand.y, tip.x, tip.y);
      g.lineStyle(7, 0xc98d4b, 1).lineBetween(t.hand.x, t.hand.y, tip.x, tip.y);
      const ang = Math.atan2(uy, ux);
      t.feather.setPosition(tip.x, tip.y).setRotation(ang + Math.sin(this.elapsed * 40) * 0.35 * t.wiggle);
      t.feather.setFlipY(ux < 0);
    }
    if (this.phase === 'tickle') {
      const lead = this.leader();
      if (lead && lead.count > 0) {
        this.crown.setVisible(true).setPosition(lead.pill.x, lead.pill.y - 44);
      }
    }
  }

  private drawMeter(dt: number): void {
    const target = Math.min(1, this.total / TARGET);
    this.shown += (target - this.shown) * Math.min(1, dt * 10);
    const f = this.shown;
    const g = this.fill;
    g.clear();
    const h = (METER.bottom - METER.top) * f;
    const col = f < 0.5 ? N.mint : f < 0.8 ? N.sun : N.tomato;
    g.fillStyle(col, 1).fillRoundedRect(METER.x - 28, METER.bottom + 10 - h, 56, h + 30, 26);
    g.fillStyle(0xffffff, 0.3).fillRoundedRect(METER.x - 18, METER.bottom + 14 - h, 12, Math.max(0, h - 10), 6);
    this.pct.setText(`${Math.round(f * 100)}%`);
  }

  private leader(): Tickler | null {
    let best: Tickler | null = null;
    for (const t of this.ticklers) if (!best || t.count > best.count) best = t;
    return best;
  }

  // ---------------------------------------------------------------------------
  // ATJUUU!

  private async sneezeSequence(): Promise<void> {
    this.total = TARGET;
    this.header.setHint('Åh nej… den skal NYSE!', C.sun);
    this.say('Pas på! Den nyser!', true);
    for (const t of this.ticklers) t.blok.sad();
    // Indånding
    this.aah?.setText('AAAAAAH…');
    this.tweens.add({ targets: this.aah, scale: 1.5, duration: 800 });
    this.sfx('whoosh', { pitch: 0.3 });
    this.tweens.add({ targets: this.mouth, scale: 1.6, duration: 800 });
    this.tweens.add({ targets: this.nose, scale: 1.05, duration: 800 });
    await new Promise<void>((res) => this.tweens.add({ targets: this.volc, scaleY: 1.08, scaleX: 0.97, duration: 850, ease: 'Sine.easeIn', onComplete: () => res() }));
    await wait(this, 200);

    // ATJUUU!
    this.aah?.destroy();
    this.aah = null;
    this.mouth.setTexture('vulk-mouth-blast').setScale(1.1);
    for (const e of this.eyes) e.setTexture('vulk-eye-shut');
    this.tweens.add({ targets: this.volc, scaleY: 0.9, scaleX: 1.06, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
    shout(this, 'ATJUUUU!', { color: C.mint, size: 230, y: 300, hold: 1000, angle: -8 });
    this.fx.flash(0xeaffc0, 260, 0.8);
    this.fx.shake(0.03, 700);
    this.fx.punch(0.06, 300);
    this.sfx('explosion');
    this.sfx('splash', { delay: 0.05 });
    this.sfx('fart', { delay: 0.1, volume: 0.6 });
    const nx = art.VOLC.x;
    const ny = NOSTRIL_L.y;
    this.fx.burst(nx, ny, { texture: 'vulk-snot', count: 40, speed: 1400, gravity: 1500, scale: 0.9, lifespan: 1300, depth: 7200 });
    this.fx.burst(nx, ny, { texture: TEX.drop, color: [0xc8ff6a, 0xff9a2a], count: 30, speed: 1000, gravity: 1300, scale: 0.9, lifespan: 1000, depth: 7200 });
    // Snot på skærmen
    for (let i = 0; i < 5; i++) {
      const s = this.add
        .image(rand(this, 150, W - 150), rand(this, 150, 700), 'vulk-ssplat')
        .setDepth(7500)
        .setAngle(rand(this, -30, 30))
        .setScale(0);
      this.tweens.add({ targets: s, scale: rand(this, 0.6, 1.1), duration: 160, delay: i * 50, ease: 'Back.easeOut' });
      this.tweens.add({ targets: s, y: s.y + 160, alpha: 0, delay: 800 + i * 80, duration: 1000, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
    }
    for (const t of this.ticklers) {
      t.blok.spinOut(1, 600);
      this.tweens.add({ targets: t.blok, x: t.blok.x + (t.blok.x < W / 2 ? -40 : 40), duration: 300, yoyo: true });
      this.vibrate(t.p.slot, 300);
    }

    // Ægget skydes ud af krateret
    const egg = this.add.image(W / 2, 330, `vulk-egg-${this.pick.color}`).setDepth(7000).setScale(0.3);
    this.sfx('laser', { pitch: 0.5 });
    await new Promise<void>((res) => this.tweens.add({ targets: egg, y: -200, scale: 0.8, angle: 540, duration: 520, ease: 'Quad.easeOut', onComplete: () => res() }));
    for (const e of this.eyes) e.setTexture('vulk-eye-open');
    this.mouth.setTexture('vulk-mouth-grin').setScale(0.9);
    for (const c of this.cheeks) this.tweens.add({ targets: c, alpha: 0.3, duration: 400 });
    this.tweens.add({ targets: this.brows, angle: 0, duration: 300 });
    this.sfx('whoosh', { pitch: 1.4 });
    await new Promise<void>((res) => this.tweens.add({ targets: egg, y: 640, scale: 1.15, angle: 720, duration: 650, ease: 'Quad.easeIn', onComplete: () => res() }));
    this.sfx('stomp');
    this.fx.shake(0.015, 260);
    this.fx.dust(W / 2, 760, 16);
    this.tweens.add({ targets: egg, scaleX: 1.35, scaleY: 0.95, duration: 90, yoyo: true });
    for (const t of this.ticklers) t.blok.idle();
    this.header.setHint('Et æg?! Hvad mon der er i?', C.cream);
    await wait(this, 500);

    // Revner
    const crack = this.add.image(egg.x, egg.y, 'vulk-crack-1').setDepth(7001).setScale(1.15).setVisible(false);
    for (let i = 1; i <= 3; i++) {
      crack.setTexture(`vulk-crack-${i}`).setVisible(true);
      this.tweens.add({ targets: [egg, crack], angle: { from: -12, to: 12 }, duration: 70, yoyo: true, repeat: 2 });
      this.sfx('crunch', { pitch: 0.8 + i * 0.15 });
      this.fx.burst(egg.x, egg.y - 40, { texture: TEX.dot, color: [0xfff6e0, 0xf0e0c0], count: 6, speed: 300, scale: 0.4 });
      await wait(this, 520);
    }

    // Klæk!
    const top = this.add.image(egg.x, egg.y - 72, `vulk-eggtop-${this.pick.color}`).setDepth(7002).setScale(1.15);
    const bot = this.add.image(egg.x, egg.y + 88, `vulk-eggbot-${this.pick.color}`).setDepth(7002).setScale(1.15);
    egg.destroy();
    crack.destroy();
    this.tweens.add({ targets: top, x: top.x - 260, y: -100, angle: -260, duration: 800, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: bot, y: H + 200, angle: 40, duration: 800, ease: 'Quad.easeIn' });
    const icon = emoji(this, W / 2, 640, this.pick.icon, 170).setDepth(7003).setScale(0);
    this.tweens.add({ targets: icon, scale: 1.2, duration: 450, ease: 'Back.easeOut' });
    this.fx.flash(0xffffff, 200, 0.6);
    this.fx.burst(W / 2, 640, { texture: TEX.star, color: [N.sun, 0xffffff, N.mint], count: 26, speed: 900, scale: 0.7 });
    this.sfx('pop');
    this.sfx('cheer');
    const lead = this.leader()!;
    lead.blok.dance();
    for (const t of this.ticklers) if (t !== lead) t.blok.cheer();
    this.tweens.add({ targets: icon, scale: 0, duration: 250, delay: 500 });
    this.header.hide();
    await revealPick(this, {
      x: W / 2,
      y: 640,
      winner: lead.p,
      caption: `🪶 ${lead.p.name} kildede mest (${lead.count} gange)!`,
    });
    if (!this.sys.isActive()) return;
    this.setLayoutAll(() => waitLayout(this));
    this.done({ winner: lead.p.slot });
  }

  // ---------------------------------------------------------------------------
  // Bots hamrer løs i hver deres tempo.

  protected botInput(slot: number, dt: number): BotInput | null {
    if (this.phase !== 'tickle') return null;
    return this.rng() < dt * this.botRate[slot] ? { tap: true } : null;
  }
}
