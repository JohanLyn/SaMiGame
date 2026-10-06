import Phaser from 'phaser';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, N, W } from '../../kit/theme';
import { label, title } from '../../kit/ui';
import type { MusicTheme } from '../../kit/audio';
import type { BotInput } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  buoySvg,
  crocArmSvg,
  crocSvg,
  dockSvg,
  dragonflySvg,
  eelBodySvg,
  eelHeadSvg,
  eelTailSvg,
  frogSvg,
  hillsSvg,
  jawSvg,
  lilySvg,
  raysSvg,
  reedsSvg,
  shadowSvg,
  skySvg,
  sparkSvg,
  sunSvg,
  treeSvg,
  waterSvg,
  type EelFace,
} from './art';

const GROUND_Y = 905;
const PLAYER_X = [660, 860, 1060, 1260];
const CROC_FEET = [
  { x: 250, y: 935 },
  { x: 1670, y: 935 },
];
const CROC_SCALE = 0.95;
/** Centrum for krokodillernes hånd-cirkel og radius. */
const HAND_C = [
  { x: 405, y: 600 },
  { x: 1515, y: 600 },
];
const HAND_R = 44;
/** Tovets udsving (fra hånd-højde ned til jorden). */
const SWING_R = GROUND_Y - HAND_C[0].y + 4;
const PERSPECTIVE = 46;
const POINTS = 44;

const JUMP_V = 760;
const GRAVITY = 3000;
const LAND_LAG = 0.1;
/** Man skal være mindst så højt oppe når ålen passerer. */
const CLEAR = 24;
const MAX_TIME = 80;

type Hiccup = 'none' | 'pause' | 'reverse' | 'rush';

interface Jumper {
  slot: number;
  blok: Blok;
  x: number;
  h: number;
  /** Tid i luften (sek.), -1 = på jorden. Analytisk bue, så hoppet er uafhængigt af billedfrekvensen. */
  air: number;
  lag: number;
  out: boolean;
  clears: number;
  counter: Phaser.GameObjects.Text;
  /** Bot-plan for næste passage. */
  noise: number;
  skip: boolean;
  fooled: boolean;
}

interface Croc {
  body: Phaser.GameObjects.Image;
  jaw: Phaser.GameObjects.Image;
  arm: Phaser.GameObjects.Image;
  shoulder: { x: number; y: number };
  jawOpen: number;
  laugh: number;
}

/**
 * SJIPPE-ÅLEN (alle mod alle, inspireret af Hot Rope Jump).
 * To krokodiller svinger en svimmel ål som sjippetov. Hop når den rammer jorden!
 * Den bliver hurtigere og hikker (stopper, bakker, spurter). Rammes du, ryger du i sumpen.
 */
export class SjippeScene extends MinigameScene {
  protected duration: number | null = null;
  protected music: MusicTheme = 'tense';

  private jumpers: Jumper[] = [];
  private crocs: Croc[] = [];
  private outGroups: number[][] = [];
  private outPass = -1;

  /** Tovets vinkel (0 = nede ved jorden). */
  private phi = Math.PI;
  private omega = 0;
  private passes = 0;
  private lastCross = 0;
  private hiccup: Hiccup = 'none';
  private hiccupTime = 0;
  private hiccupPending = false;
  private nextHiccupAt = 7;
  private ended = false;
  private eelFace: EelFace = 'ok';
  private jitter = 0;

  private rope!: Phaser.GameObjects.Rope;
  private head!: Phaser.GameObjects.Image;
  private tail!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private passText!: Phaser.GameObjects.Text;
  private speedBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('sjippe');
  }

  preload(): void {
    loadSvg(this, 'sj-sky', skySvg(), 1920, 1080);
    loadSvg(this, 'sj-sun', sunSvg(), 420, 420);
    loadSvg(this, 'sj-rays', raysSvg(), 800, 800);
    loadSvg(this, 'sj-hills', hillsSvg(), 1920, 360);
    loadSvg(this, 'sj-water', waterSvg(), 1920, 240);
    loadSvg(this, 'sj-tree', treeSvg(), 620, 900);
    loadSvg(this, 'sj-lily', lilySvg(false), 170, 80);
    loadSvg(this, 'sj-lily-f', lilySvg(true), 170, 80);
    loadSvg(this, 'sj-reeds', reedsSvg(), 300, 380);
    loadSvg(this, 'sj-dock', dockSvg(), 1920, 330);
    for (const s of ['hat', 'bow'] as const) {
      loadSvg(this, `sj-croc-${s}`, crocSvg(s), 480, 640);
      loadSvg(this, `sj-jaw-${s}`, jawSvg(s), 260, 100);
      loadSvg(this, `sj-arm-${s}`, crocArmSvg(s), 110, 220);
    }
    loadSvg(this, 'sj-eel', eelBodySvg(), 512, 56);
    for (const f of ['ok', 'dizzy', 'hik'] as EelFace[]) loadSvg(this, `sj-head-${f}`, eelHeadSvg(f), 170, 130);
    loadSvg(this, 'sj-tail', eelTailSvg(), 130, 120);
    loadSvg(this, 'sj-shadow', shadowSvg(), 1000, 50);
    loadSvg(this, 'sj-buoy', buoySvg(), 180, 90);
    loadSvg(this, 'sj-frog', frogSvg(), 130, 110);
    loadSvg(this, 'sj-fly', dragonflySvg(), 110, 70);
    loadSvg(this, 'sj-spark', sparkSvg(), 60, 60);
  }

  protected setup(): void {
    this.jumpers = [];
    this.crocs = [];
    this.outGroups = [];
    this.outPass = -1;
    this.phi = Math.PI;
    this.omega = 0;
    this.passes = 0;
    this.lastCross = 0;
    this.hiccup = 'none';
    this.hiccupPending = false;
    this.nextHiccupAt = 7 + this.rng() * 3;
    this.ended = false;

    this.buildWorld();
    this.buildCrocs();
    this.buildEel();
    this.buildHud();

    for (const p of this.players) {
      const x = PLAYER_X[p.slot] ?? 660 + p.slot * 200;
      const blok = this.spawnBlok(p, x, GROUND_Y, { size: 0.85 });
      blok.setDepth(1000 + p.slot);
      const counter = label(this, x, GROUND_Y + 62, '0', 38, { color: p.color }).setDepth(1100);
      this.jumpers.push({ slot: p.slot, blok, x, h: 0, air: -1, lag: 0, out: false, clears: 0, counter, noise: 0, skip: false, fooled: false });
    }
    this.planBots();
    this.layoutEel(0);
  }

  protected onStart(): void {
    this.say('Hop over ålen!');
    this.omega = this.baseOmega();
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    this.add.image(W / 2, 540, 'sj-sky').setDepth(-10000);
    const rays = this.add.image(960, 420, 'sj-rays').setDepth(-9900).setAlpha(0.2).setScale(1.5);
    this.tweens.add({ targets: rays, angle: 360, duration: 90000, repeat: -1 });
    const sun = this.add.image(960, 410, 'sj-sun').setDepth(-9800);
    this.tweens.add({ targets: sun, y: 398, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(W / 2, 390, 'sj-hills').setOrigin(0.5, 0).setDepth(-9700);
    for (const [x, flip, s, d] of [
      [70, false, 1, -9400],
      [1850, true, 1, -9400],
      [330, false, 0.6, -9600],
      [1600, true, 0.65, -9600],
    ] as [number, boolean, number, number][]) {
      const t = this.add.image(x, 800, 'sj-tree').setOrigin(0.5, 1).setFlipX(flip).setScale(s).setDepth(d);
      if (s < 1) t.setTint(0xb07ab0);
      this.tweens.add({ targets: t, angle: { from: -1, to: 1 }, duration: 3200 + x, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.image(W / 2, 560, 'sj-water').setOrigin(0.5, 0).setDepth(-9500);
    // Glimt i vandet
    for (let i = 0; i < 10; i++) {
      const g = this.add.image(760 + this.rng() * 400, 600 + this.rng() * 170, TEX.spark).setScale(0.3).setDepth(-9450).setTint(0xfff3c4);
      this.tweens.add({ targets: g, alpha: { from: 1, to: 0 }, scale: 0.1, duration: 600 + this.rng() * 800, yoyo: true, repeat: -1, delay: this.rng() * 1000 });
    }
    // Åkander og en frø
    const lilies: [number, number, boolean][] = [
      [260, 640, true],
      [520, 700, false],
      [1390, 650, false],
      [1660, 720, true],
      [1180, 610, false],
    ];
    lilies.forEach(([x, y, f], i) => {
      const l = this.add.image(x, y, f ? 'sj-lily-f' : 'sj-lily').setDepth(-9300).setScale(0.9);
      this.tweens.add({ targets: l, y: y + 5, angle: { from: -3, to: 3 }, duration: 1800 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (i === 2) {
        const frog = this.add.image(x + 6, y - 30, 'sj-frog').setDepth(-9290).setScale(0.75);
        this.tweens.add({ targets: frog, y: y - 34, duration: 1800 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.time.addEvent({
          delay: 3200,
          loop: true,
          callback: () => {
            this.tweens.add({ targets: frog, scaleY: { from: 0.6, to: 0.75 }, scaleX: { from: 0.9, to: 0.75 }, duration: 260, ease: 'Back.easeOut' });
            this.sfx('quack', { volume: 0.25, pitch: 0.6 });
          },
        });
      }
    });
    this.add.image(W / 2, 780, 'sj-dock').setOrigin(0.5, 0).setDepth(-9000);
    // Guldsmede der flyver i ottetaller
    for (let i = 0; i < 2; i++) {
      const fly = this.add.image(0, 0, 'sj-fly').setDepth(4500).setScale(0.7);
      const cx = i ? 1500 : 420;
      const cy = 300 + i * 80;
      this.tweens.addCounter({
        from: 0,
        to: Math.PI * 2,
        duration: 7000 + i * 2000,
        repeat: -1,
        onUpdate: (tw) => {
          const a = tw.getValue() ?? 0;
          const x = cx + Math.sin(a) * 260;
          const y = cy + Math.sin(a * 2) * 70;
          fly.setFlipX(Math.cos(a) < 0);
          fly.setPosition(x, y);
          fly.scaleY = 0.7 * (0.85 + Math.abs(Math.sin(a * 40)) * 0.15);
        },
      });
    }
    // Tagrør i forgrunden
    for (const [x, flip] of [
      [70, false],
      [1850, true],
    ] as [number, boolean][]) {
      const r = this.add.image(x, 1100, 'sj-reeds').setOrigin(0.5, 1).setFlipX(flip).setDepth(4000);
      this.tweens.add({ targets: r, angle: { from: -3, to: 3 }, duration: 2000 + x / 3, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private buildCrocs(): void {
    (['hat', 'bow'] as const).forEach((style, i) => {
      const flip = i === 1;
      const f = CROC_FEET[i];
      const body = this.add.image(f.x, f.y, `sj-croc-${style}`).setOrigin(flip ? 0.55 : 0.45, 0.97).setScale(CROC_SCALE).setFlipX(flip).setDepth(150);
      // Underkæbe: hængsel ved (250, 236) i krokodille-teksturen
      const hingeX = f.x + (flip ? -1 : 1) * (250 - 0.45 * 480) * CROC_SCALE;
      const hingeY = f.y + (236 - 0.97 * 640) * CROC_SCALE;
      const jaw = this.add.image(hingeX, hingeY, `sj-jaw-${style}`).setOrigin(flip ? 0.94 : 0.06, 0.2).setScale(CROC_SCALE).setFlipX(flip).setDepth(149);
      const sx = f.x + (flip ? -1 : 1) * (262 - 0.45 * 480) * CROC_SCALE;
      const sy = f.y + (300 - 0.97 * 640) * CROC_SCALE;
      const arm = this.add.image(sx, sy, `sj-arm-${style}`).setOrigin(0.5, 0.1).setScale(CROC_SCALE).setDepth(3000);
      this.crocs.push({ body, jaw, arm, shoulder: { x: sx, y: sy }, jawOpen: 0, laugh: 0 });
      this.tweens.add({ targets: body, scaleY: { from: CROC_SCALE, to: CROC_SCALE * 1.02 }, duration: 900 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  private buildEel(): void {
    const pts = Array.from({ length: POINTS }, (_, i) => ({ x: (i / (POINTS - 1)) * 1000, y: 0 }));
    this.rope = this.add.rope(0, 0, 'sj-eel', undefined, pts, true);
    this.head = this.add.image(0, 0, 'sj-head-ok').setOrigin(0.08, 0.5).setScale(0.85).setDepth(3001);
    this.tail = this.add.image(0, 0, 'sj-tail').setOrigin(0.95, 0.5).setScale(0.85).setDepth(3001);
    this.shadow = this.add.image(960, GROUND_Y + 8, 'sj-shadow').setDepth(-8000).setAlpha(0);
  }

  private buildHud(): void {
    this.passText = title(this, W / 2, 84, 'HOP 0', 76, { color: C.cream }).setDepth(7000);
    label(this, W / 2 - 150, 160, 'FART', 28, { color: C.sun }).setDepth(7000);
    this.speedBar = this.add.graphics().setDepth(7000);
  }

  // ---------------------------------------------------------------------------
  // Spil

  private get alive(): Jumper[] {
    return this.jumpers.filter((j) => !j.out);
  }

  private get tempo(): number {
    return Math.min(1, this.elapsed / 45);
  }

  private baseOmega(): number {
    const period = Phaser.Math.Linear(1.6, 0.72, Math.pow(this.tempo, 0.85));
    return (Math.PI * 2) / period;
  }

  protected play(dt: number): void {
    if (this.ended) return;
    const base = this.baseOmega();
    // Hikke-styring
    this.hiccupTime -= dt;
    let omega = base;
    if (this.hiccup === 'pause') omega = 0;
    else if (this.hiccup === 'reverse') omega = -base * 0.8;
    else if (this.hiccup === 'rush') omega = base * 1.6;
    if (this.hiccup !== 'none' && this.hiccupTime <= 0) {
      if (this.hiccup !== 'rush') this.setEelFace(this.tempo > 0.6 ? 'dizzy' : 'ok');
      this.hiccup = 'none';
    }
    // Opstart: ålen kommer langsomt i gang
    this.omega = Phaser.Math.Linear(this.omega, omega, Math.min(1, dt * (this.hiccup === 'none' ? 10 : 16)));
    const prevPhi = this.phi;
    this.phi += this.omega * dt;
    // Hikke udløses når ålen passerer toppen
    if (this.elapsed >= this.nextHiccupAt && this.hiccup === 'none') this.hiccupPending = true;
    const prevTop = Math.floor((prevPhi - Math.PI) / (Math.PI * 2));
    const nowTop = Math.floor((this.phi - Math.PI) / (Math.PI * 2));
    if (this.hiccupPending && nowTop > prevTop) this.startHiccup();

    this.updateJumpers(dt);

    const cross = Math.floor(this.phi / (Math.PI * 2));
    if (cross > this.lastCross) {
      this.lastCross = cross;
      this.onPass();
    }

    this.layoutEel(dt);
    this.drawSpeed(base);

    if (!this.ended && (this.alive.length <= 1 || this.elapsed > MAX_TIME)) this.end();
  }

  private startHiccup(): void {
    this.hiccupPending = false;
    const t = this.tempo;
    const roll = this.rng();
    if (t > 0.3 && roll < 0.28) {
      this.hiccup = 'rush';
      this.hiccupTime = 0.6 / (this.baseOmega() / (Math.PI * 2)) / 1.6;
      this.fx.floatText(this.head.x - 60, this.head.y - 90, 'SPURT!', C.tomato, 56);
      this.sfx('powerup', { pitch: 1.3 });
      this.say('Spurt!');
    } else if (roll < 0.62) {
      this.hiccup = 'pause';
      this.hiccupTime = 0.5 + this.rng() * 0.45;
      this.hik();
    } else {
      this.hiccup = 'reverse';
      this.hiccupTime = 0.32;
      this.hik();
    }
    this.nextHiccupAt = this.elapsed + 3.5 + this.rng() * 3.5 - t * 1.2;
    // Nogle bots bliver snydt af hikken
    for (const j of this.alive) j.fooled = this.rng() < 0.3;
  }

  private hik(): void {
    this.setEelFace('hik');
    this.jitter = 0.25;
    this.fx.floatText(this.head.x - 40, this.head.y - 80, 'HIK!', C.sun, 60);
    this.sfx('squeak', { pitch: 0.7 });
    this.sfx('boing', { delay: 0.05, volume: 0.6 });
    this.fx.shake(0.004, 120);
    this.say('Hik!');
  }

  private onPass(): void {
    this.passes++;
    const alive = this.alive;
    const hit: Jumper[] = [];
    for (const j of alive) {
      if (j.h < CLEAR) hit.push(j);
      else {
        j.clears++;
        j.counter.setText(String(j.clears));
        this.tweens.add({ targets: j.counter, scale: { from: 1.4, to: 1 }, duration: 200, ease: 'Back.easeOut' });
      }
    }
    // Ålen smækker i brædderne
    this.sfx('whoosh', { volume: 0.6, pitch: 1.3 });
    this.sfx('stomp', { volume: 0.35, pitch: 1.6 });
    for (let i = 0; i < 4; i++) this.fx.dust(560 + i * 270 + this.rng() * 60, GROUND_Y + 10, 3);
    this.passText.setText(`HOP ${this.passes}`);
    this.tweens.add({ targets: this.passText, scale: { from: 1.25, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    if (this.passes % 10 === 0) {
      this.fx.floatText(W / 2, 220, `${this.passes} HOP!`, C.sun, 64);
      this.sfx('coin');
    }
    if (hit.length) {
      if (this.outPass !== this.passes) {
        this.outPass = this.passes;
        this.outGroups.push([]);
      }
      const group = this.outGroups[this.outGroups.length - 1];
      for (const j of hit) {
        j.out = true;
        group.push(j.slot);
        this.trip(j);
      }
      for (const c of this.crocs) c.laugh = 1.2;
      if (this.alive.length > 1) this.say(hit.length > 1 ? 'Dobbelt-smæk!' : 'Smæk! Ud i sumpen!');
    }
    this.planBots();
  }

  private end(): void {
    if (this.ended) return;
    this.ended = true;
    const survivors = this.alive;
    for (const j of survivors) {
      j.blok.cheer();
      j.blok.rig.y = 0;
    }
    if (survivors.length === 1) {
      this.fx.confetti(1800);
      this.sfx('cheer');
      this.say('Sjippe-mester!');
    }
    const groups = [...this.outGroups].reverse();
    const ranking = survivors.length ? [survivors.map((j) => j.slot), ...groups] : groups;
    this.finish(ranking.filter((g) => g.length));
  }

  // ---------------------------------------------------------------------------
  // Spillere

  private updateJumpers(dt: number): void {
    const g = GRAVITY * Phaser.Math.Clamp(this.chaos.gravity, 0.7, 1.5);
    for (const j of this.jumpers) {
      if (j.out) continue;
      j.lag = Math.max(0, j.lag - dt);
      if (this.pressed(j.slot) && j.air < 0 && j.lag <= 0) {
        j.air = 0;
        j.blok.squash(0.8, 1.25);
        this.sfx('jump', { pan: this.panFor(j.x), pitch: 0.9 + j.slot * 0.07, volume: 0.6 });
        this.stat(j.slot, 'jumps');
        this.fx.dust(j.x, GROUND_Y, 4);
      }
      if (j.air >= 0) {
        j.air += dt;
        j.h = Math.max(0, JUMP_V * j.air - (g * j.air * j.air) / 2);
        if (j.air >= (2 * JUMP_V) / g) {
          j.h = 0;
          j.air = -1;
          j.lag = LAND_LAG;
          j.blok.squash(1.25, 0.8);
          this.sfx('stomp', { volume: 0.25, pitch: 1.4, pan: this.panFor(j.x) });
        }
      }
      j.blok.rig.y = -j.h;
      j.blok.setDepth(1000 + j.slot);
    }
  }

  private trip(j: Jumper): void {
    const b = j.blok;
    this.stat(j.slot, 'hits');
    this.stat(j.slot, 'falls');
    this.vibrate(j.slot, 300);
    this.sfx('hit', { pan: this.panFor(j.x) });
    this.sfx('scream', { delay: 0.1, pan: this.panFor(j.x), pitch: 0.9 + this.rng() * 0.3 });
    this.fx.stars(j.x, GROUND_Y - 60, N.sun, 10);
    this.fx.burst(j.x, GROUND_Y - 20, { texture: 'sj-spark', count: 8, speed: 500, gravity: 600, scale: 0.6 });
    this.fx.shake(0.012, 220);
    this.fx.flash(0xffffff, 100, 0.3);
    this.fx.hitstop(70);
    this.fx.floatText(j.x, GROUND_Y - 250 - (j.slot % 2) * 60, 'SMÆK!', C.tomato, 56);
    j.counter.setAlpha(0.4);
    b.rig.y = 0;
    b.hideTag();
    // Flyver i en bue ud i sumpen bagved
    const seat = this.outGroups.flat().length - 1;
    const tx = [520, 1400, 760, 1160][seat % 4];
    const ty = 742;
    const sx = b.x;
    const sy = b.y;
    b.spinOut(2, 700);
    b.setDepth(-9200);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 750,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        b.setPosition(Phaser.Math.Linear(sx, tx, k), Phaser.Math.Linear(sy, ty, k) - Math.sin(k * Math.PI) * 340);
        b.setScale(1 - 0.3 * k);
        b.setDepth(k < 0.4 ? 2500 : -9200);
      },
      onComplete: () => {
        this.sfx('splash', { pan: this.panFor(tx) });
        this.fx.burst(tx, ty, { texture: TEX.drop, color: [0x9ad0ff, 0xffffff], count: 18, speed: 500, gravity: 1200, scale: 0.7, depth: -9100 });
        const buoy = this.add.image(0, -10, 'sj-buoy').setScale(0.9);
        b.add(buoy);
        b.sad();
        this.tweens.add({ targets: b, y: ty + 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Ålen og krokodillerne

  private ropePoint(u: number, cosPhi: number, z: number, hl: { x: number; y: number }, hr: { x: number; y: number }, wave: number): { x: number; y: number } {
    const s = Math.sin(Math.PI * u);
    const k = Math.min(1, s * 1.8);
    const a = k * k * (3 - 2 * k) * (0.94 + 0.06 * s);
    const x = Phaser.Math.Linear(hl.x, hr.x, u);
    const y = Phaser.Math.Linear(hl.y, hr.y, u) + a * (SWING_R * cosPhi + PERSPECTIVE * z) + Math.sin(u * 13 - wave) * 7 * a;
    return { x, y };
  }

  private layoutEel(dt: number): void {
    const cos = Math.cos(this.phi);
    const z = -Math.sin(this.phi);
    // Hænderne kører rundt i små cirkler
    const hands = HAND_C.map((c) => ({ x: c.x + z * 8, y: c.y + Math.cos(this.phi) * HAND_R * 0.9 }));
    const hl = hands[0];
    const hr = hands[1];
    this.jitter = Math.max(0, this.jitter - dt);
    const wave = this.elapsed * 9;
    const pts = this.rope.points;
    for (let i = 0; i < pts.length; i++) {
      const u = i / (pts.length - 1);
      const p = this.ropePoint(u, cos, z, hl, hr, wave);
      pts[i].x = p.x + (this.jitter > 0 ? (this.rng() - 0.5) * 12 : 0);
      pts[i].y = p.y + (this.jitter > 0 ? (this.rng() - 0.5) * 16 : 0);
    }
    this.rope.setDirty();
    const front = z > 0;
    const depth = front ? 2000 : 200;
    this.rope.setDepth(depth);
    // Hoved ved højre krokodille, hale ved venstre
    const n = pts.length;
    const ha = Math.atan2(pts[n - 1].y - pts[n - 3].y, pts[n - 1].x - pts[n - 3].x);
    this.head.setPosition(pts[n - 1].x + Math.cos(ha) * 18, pts[n - 1].y + Math.sin(ha) * 18).setRotation(ha);
    const ta = Math.atan2(pts[0].y - pts[2].y, pts[0].x - pts[2].x);
    this.tail.setPosition(pts[0].x + Math.cos(ta) * 14, pts[0].y + Math.sin(ta) * 14).setRotation(ta + Math.PI);

    // Skygge på brædderne
    const mid = this.ropePoint(0.5, cos, z, hl, hr, 0).y;
    const near = Phaser.Math.Clamp(1 - (GROUND_Y - mid) / (SWING_R * 1.3), 0, 1);
    this.shadow.setAlpha(near * 0.6).setScale(((hr.x - hl.x) * 0.85) / 1000, 0.6 + near * 0.6);

    // Krokodillernes arme følger hænderne
    this.crocs.forEach((c, i) => {
      const h = hands[i];
      const dx = h.x - c.shoulder.x;
      const dy = h.y - c.shoulder.y;
      c.arm.setRotation(Math.atan2(dy, dx) - Math.PI / 2);
      c.arm.scaleY = (Math.hypot(dx, dy) / 164) * 1.0;
      // Kæben: tygger let, griner når nogen rammes
      c.laugh = Math.max(0, c.laugh - dt);
      const open = c.laugh > 0 ? 14 + Math.abs(Math.sin(this.elapsed * 22)) * 16 : 3 + Math.sin(this.elapsed * 3 + i) * 3;
      c.jawOpen = Phaser.Math.Linear(c.jawOpen, open, Math.min(1, dt * 14));
      c.jaw.angle = i === 0 ? c.jawOpen : -c.jawOpen;
      if (c.laugh > 0 && Math.floor(c.laugh * 6) !== Math.floor((c.laugh + dt) * 6) && Math.floor(c.laugh * 6) % 2 === 0) {
        this.fx.floatText(c.body.x + (i === 0 ? 120 : -120), 290, 'HA!', C.sun, 46);
      }
    });
  }

  private setEelFace(face: EelFace): void {
    if (this.eelFace === face) return;
    this.eelFace = face;
    this.head.setTexture(`sj-head-${face}`);
  }

  private drawSpeed(base: number): void {
    const g = this.speedBar;
    const frac = Phaser.Math.Clamp((base - (Math.PI * 2) / 1.6) / ((Math.PI * 2) / 0.72 - (Math.PI * 2) / 1.6), 0, 1);
    g.clear();
    g.fillStyle(N.ink, 0.85).fillRoundedRect(W / 2 - 100, 146, 260, 30, 15);
    g.fillStyle(frac > 0.7 ? N.tomato : frac > 0.4 ? N.tangerine : N.mint, 1).fillRoundedRect(W / 2 - 94, 152, Math.max(18, 248 * frac), 18, 9);
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(W / 2 - 90, 154, Math.max(10, 240 * frac), 5, 2);
    if (frac > 0.6 && this.eelFace === 'ok') this.setEelFace('dizzy');
  }

  // ---------------------------------------------------------------------------
  // Bots: timer hoppet efter hvornår ålen rammer jorden – med menneskelig unøjagtighed.

  private skill(slot: number): number {
    return [0.9, 0.8, 0.86, 0.74][slot % 4];
  }

  private planBots(): void {
    const t = this.tempo;
    for (const j of this.jumpers) {
      const s = this.skill(j.slot);
      const sigma = 0.03 + t * 0.1 + (1 - s) * 0.06;
      // Normalfordelt støj (Box-Muller)
      const u1 = Math.max(1e-6, this.rng());
      const u2 = this.rng();
      j.noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
      j.skip = this.rng() < 0.008 + t * 0.035 + (1 - s) * 0.02;
      j.fooled = false;
    }
  }

  protected botInput(slot: number): BotInput | null {
    const j = this.jumpers.find((x) => x.slot === slot);
    if (!j || j.out || j.skip || j.air >= 0 || j.lag > 0 || !this.running) return null;
    const omega = j.fooled || this.hiccup === 'none' ? this.baseOmega() : this.omega;
    if (omega <= 0.3) return null;
    const toBottom = (Math.PI * 2 * (this.lastCross + 1) - this.phi) / omega;
    const air = (2 * JUMP_V) / (GRAVITY * Phaser.Math.Clamp(this.chaos.gravity, 0.7, 1.5));
    if (toBottom <= air * 0.5 - 0.02 + j.noise) return { tap: true };
    return null;
  }
}
