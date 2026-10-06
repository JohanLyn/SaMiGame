import Phaser from 'phaser';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { body, label, title } from '../../kit/ui';
import type { MusicTheme } from '../../kit/audio';
import type { BotInput, PlayerView } from '../../flow/types';
import { avatarKey, type Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  ROYAL,
  SEGMENTS,
  SOFA,
  arrowDownSvg,
  balconySvg,
  balloonSvg,
  beamSvg,
  birdSvg,
  chefSvg,
  chickenSvg,
  eelSvg,
  eggSvg,
  fartCloudSvg,
  glowSvg,
  groundSvg,
  hillsSvg,
  markerSvg,
  meatballSvg,
  warnSvg,
  meterSvg,
  moonSvg,
  mustardSvg,
  planeSvg,
  planetSvg,
  raysSvg,
  rollingPinSvg,
  satelliteSvg,
  signSvg,
  skySvg,
  splatSvg,
  spoonSvg,
  sunsetSunSvg,
  trophySvg,
  ufoSvg,
  whoopeeSvg,
} from './art';

// -----------------------------------------------------------------------------
// Konstanter (verden: h = højde over jorden, x = vandret i forhold til tårnets akse)

/** Jordens y i verdenskoordinater. */
const GROUND_Y = 990;
/** Højden af toppen (fløjlspuden med pokalen). */
const TOP_H = 8400;
/** Kameraets øverste position (pokalen midt i billedet). */
const S_MIN = GROUND_Y - TOP_H - 620;
const BLOK_SIZE = 0.55;
/** Kroppens midte over fødderne (hitbox). */
const BODY = 62;

const CLIMB_UP = 130;
const CLIMB_DOWN = 260;
const SIDE = 320;
const BOOST_V = 700;
const BOOST_DECEL = 2400;
const BOOST_CD = 0.9;
const SLIDE_V = 840;
const SLIDE_DECEL = 1150;

const METER = { x: W - 96, top: 190, bottom: 930 };

interface Segment {
  img: Phaser.GameObjects.Image;
  base: number;
  h: number;
  w: number;
  off: number;
}

interface Climber {
  p: PlayerView;
  blok: Blok;
  x: number;
  h: number;
  vh: number;
  kx: number;
  stun: number;
  inv: number;
  boostCd: number;
  arrived: boolean;
  order: number;
  skill: number;
  botA: boolean;
  fxTimer: number;
  marker: Phaser.GameObjects.Container;
  markerHead: Phaser.GameObjects.Image | null;
  arrow: Phaser.GameObjects.Container;
  arrowText: Phaser.GameObjects.Text;
  meterY: number;
}

interface Ball {
  id: number;
  img: Phaser.GameObjects.Image;
  x: number;
  h: number;
  vx: number;
  vh: number;
  seg: number;
  dead: boolean;
}

interface Proj {
  id: number;
  kind: 'egg' | 'mustard';
  img: Phaser.GameObjects.Image;
  x: number;
  h: number;
  vx: number;
  vh: number;
  t: number;
  flight: number;
  dead: boolean;
}

interface Eel {
  pivotH: number;
  len: number;
  amp: number;
  omega: number;
  phase: number;
  theta: number;
  pin: Phaser.GameObjects.Image;
  img: Phaser.GameObjects.Image;
  side: number;
  /** Ophængets x i forhold til tårnets akse (ålen hænger i den ene side). */
  px: number;
  seen: boolean;
}

interface Cushion {
  x: number;
  h: number;
  img: Phaser.GameObjects.Image;
  cd: number;
  seen: boolean;
}

interface Thrower {
  kind: 'chicken' | 'chef';
  side: 1 | -1;
  h: number;
  x: number;
  img: Phaser.GameObjects.Image;
  ledge: Phaser.GameObjects.Image;
  cd: number;
  seen: boolean;
}

interface Puddle {
  x: number;
  h: number;
  img: Phaser.GameObjects.Image;
  life: number;
}

const smooth = (a: number, b: number, v: number) => {
  const t = Phaser.Math.Clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * KAOS-TÅRNET – den store finale (alle mod alle).
 * Alle klatrer op ad et vakkelvornt tårn af madrasser, puder og køkkenting mod guldpokalen.
 * Gæsteoptrædener fra de andre minigames prøver at sende dem ned igen: rullende frikadeller,
 * Kanon-Kyllingens æg, en svingende ål, pruttepuder (der skyder én OP) og en kok med sennep.
 * Først på toppen vinder; resten rangeres efter ankomst og derefter højde.
 */
export class KaostaarnScene extends MinigameScene {
  protected duration = 60;
  protected music: MusicTheme = 'finale';

  private segs: Segment[] = [];
  private climbers: Climber[] = [];
  private balls: Ball[] = [];
  private warnings: { x: number; t: number; img: Phaser.GameObjects.Image }[] = [];
  private projs: Proj[] = [];
  private eels: Eel[] = [];
  private cushions: Cushion[] = [];
  private throwers: Thrower[] = [];
  private puddles: Puddle[] = [];
  private arrivals: number[] = [];
  private nextId = 1;
  private ballTimer = 3;
  private seenBalls = false;
  private time0 = 0;
  private wobble = 0;
  private slowLeft = 0;
  private leader = -1;
  private leaderCd = 0;
  private milestones = [0.25, 0.5, 0.75, 0.9];
  private saidTen = false;
  private creakTimer = 4;
  private camS = 0;
  private eelClock = 0;
  private firstStep = true;
  private lastText = -1;
  private letterbox = 0;
  private cull: (Phaser.GameObjects.Image | Phaser.GameObjects.Container)[] = [];
  private flyover = false;

  // Grafik
  private skies: Phaser.GameObjects.Image[] = [];
  private stars: Phaser.GameObjects.Image[] = [];
  private sunImg!: Phaser.GameObjects.Image;
  private moonImg!: Phaser.GameObjects.Image;
  private trophy!: Phaser.GameObjects.Image;
  private trophyGlow!: Phaser.GameObjects.Image;
  private trophyRays!: Phaser.GameObjects.Image;
  private royal!: Phaser.GameObjects.Image;
  private trophyHolder = -1;
  private bars: Phaser.GameObjects.Rectangle[] = [];
  private beams: Phaser.GameObjects.Image[] = [];
  private fartEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('kaostaarn');
  }

  preload(): void {
    for (const s of [...SEGMENTS, SOFA]) loadSvg(this, s.key, s.svg(), s.w, s.h);
    loadSvg(this, ROYAL.key, ROYAL.svg(), ROYAL.w, ROYAL.h + 30);
    loadSvg(this, 'kt-trophy', trophySvg(), 300, 380);
    loadSvg(this, 'kt-glow', glowSvg(), 256, 256);
    loadSvg(this, 'kt-rays', raysSvg(), 512, 512);
    loadSvg(this, 'kt-meatball', meatballSvg(), 124, 124);
    loadSvg(this, 'kt-warn', warnSvg(), 96, 110);
    loadSvg(this, 'kt-chicken', chickenSvg(), 240, 230);
    loadSvg(this, 'kt-egg', eggSvg(), 64, 80);
    loadSvg(this, 'kt-eggsplat', splatSvg('#ffffff', '#ffcf3a'), 160, 120);
    loadSvg(this, 'kt-mustsplat', splatSvg('#ffd21a', '#e6a400'), 160, 120);
    loadSvg(this, 'kt-eel', eelSvg(), 130, 560);
    loadSvg(this, 'kt-pin', rollingPinSvg(), 380, 70);
    loadSvg(this, 'kt-whoopee', whoopeeSvg(), 170, 110);
    loadSvg(this, 'kt-fart', fartCloudSvg(), 120, 100);
    loadSvg(this, 'kt-chef', chefSvg(), 240, 300);
    loadSvg(this, 'kt-balcony', balconySvg(), 300, 90);
    loadSvg(this, 'kt-mustard', mustardSvg(), 70, 70);
    loadSvg(this, 'kt-spoon', spoonSvg(), 300, 80);
    loadSvg(this, 'kt-sky-day', skySvg('#2f9be8', '#7fd0ff', '#d6f4ff'), 64, 256);
    loadSvg(this, 'kt-sky-sunset', skySvg('#7a4ad8', '#ff6f8a', '#ffc46b'), 64, 256);
    loadSvg(this, 'kt-sky-dusk', skySvg('#1d1660', '#5a2a9a', '#ff6f8a'), 64, 256);
    loadSvg(this, 'kt-sky-night', skySvg('#05041a', '#110d40', '#2a1f7a'), 64, 256);
    loadSvg(this, 'kt-hills-far', hillsSvg(1920, 420, '#7aa8e0', false), 1920, 420);
    loadSvg(this, 'kt-hills-city', hillsSvg(1920, 380, '#5fb85a', true), 1920, 380);
    loadSvg(this, 'kt-hills-near', hillsSvg(1920, 300, '#3f9e3a', false), 1920, 300);
    loadSvg(this, 'kt-ground', groundSvg(1920, 200), 1920, 240);
    loadSvg(this, 'kt-moon', moonSvg(), 240, 240);
    loadSvg(this, 'kt-sun', sunsetSunSvg(), 300, 300);
    loadSvg(this, 'kt-balloon', balloonSvg(), 220, 320);
    loadSvg(this, 'kt-bird', birdSvg(), 80, 50);
    loadSvg(this, 'kt-plane', planeSvg(), 300, 120);
    loadSvg(this, 'kt-satellite', satelliteSvg(), 260, 140);
    loadSvg(this, 'kt-ufo', ufoSvg(), 300, 260);
    loadSvg(this, 'kt-planet', planetSvg(), 360, 240);
    loadSvg(this, 'kt-meter', meterSvg(METER.bottom - METER.top + 60), 64, METER.bottom - METER.top + 60);
    loadSvg(this, 'kt-sign', signSvg(), 420, 260);
    loadSvg(this, 'kt-beam', beamSvg(), 200, 600);
    for (const p of this.registryPlayers()) {
      loadSvg(this, `kt-marker-${p.color}`, markerSvg(p.color), 80, 80);
      loadSvg(this, `kt-arrow-${p.color}`, arrowDownSvg(p.color), 90, 70);
    }
  }

  /** Spillerfarver kendes allerede i preload (fra launch-data). */
  private registryPlayers(): { color: string }[] {
    const launch = (this.sys.settings.data ?? {}) as { players?: PlayerView[] };
    return launch.players ?? [{ color: '#ff4d4d' }, { color: '#3d8bff' }, { color: '#3ccf5a' }, { color: '#ffc928' }];
  }

  // ---------------------------------------------------------------------------
  // Opbygning

  protected setup(): void {
    this.segs = [];
    this.climbers = [];
    this.balls = [];
    this.warnings = [];
    this.projs = [];
    this.eels = [];
    this.cushions = [];
    this.throwers = [];
    this.puddles = [];
    this.arrivals = [];
    this.stars = [];
    this.skies = [];
    this.bars = [];
    this.beams = [];
    this.milestones = [0.25, 0.5, 0.75, 0.9];
    this.trophyHolder = -1;
    this.leader = -1;
    this.slowLeft = 0;
    this.time0 = 0;
    this.lastText = -1;
    this.letterbox = 0;

    // Animationer følger uret, også hvis billedraten dykker.
    this.tweens.setLagSmooth(10000, 10000);
    this.buildSky();
    this.buildTower();
    this.buildGuests();
    this.buildTop();
    this.buildPlayers();
    this.buildHud();

    this.fartEmitter = this.add.particles(0, 0, 'kt-fart', {
      speed: { min: 60, max: 220 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.5, end: 1.4 },
      alpha: { start: 0.9, end: 0 },
      rotate: { min: -40, max: 40 },
      lifespan: 900,
      gravityY: -60,
      emitting: false,
    });
    this.fartEmitter.setDepth(2900);

    this.camS = 0;
    this.cameras.main.setScroll(0, 0);
    // Alt der ruller med kameraet skjules uden for skærmen (sparer meget tegnetid).
    const bloks = new Set<Phaser.GameObjects.GameObject>(this.climbers.map((c) => c.blok));
    this.cull = this.children.list.filter(
      (o): o is Phaser.GameObjects.Image | Phaser.GameObjects.Container =>
        (o instanceof Phaser.GameObjects.Image || o instanceof Phaser.GameObjects.Container) && (o as Phaser.GameObjects.Image).scrollFactorY !== 0 && !bloks.has(o),
    );
    this.animate(0);
  }

  private buildSky(): void {
    const keys = ['kt-sky-day', 'kt-sky-sunset', 'kt-sky-dusk', 'kt-sky-night'];
    keys.forEach((k, i) => {
      const img = this.add.image(W / 2, H / 2, k).setDisplaySize(W + 40, H + 40).setScrollFactor(0).setDepth(-10000 + i);
      img.setAlpha(i === 0 ? 1 : 0);
      this.skies.push(img);
    });
    // Stjerner (svag parallax)
    for (let i = 0; i < 110; i++) {
      const star = this.add
        .image(this.rng() * W, -500 + this.rng() * 1500, i >= 80 ? TEX.spark : TEX.dot)
        .setScrollFactor(0, 0.05)
        .setDepth(-9990)
        .setScale(i >= 80 ? 0.25 + this.rng() * 0.35 : 0.08 + this.rng() * 0.12)
        .setAlpha(0);
      star.setData('base', 0.5 + this.rng() * 0.5);
      star.setData('tw', this.rng() * Math.PI * 2);
      this.stars.push(star);
    }
    this.sunImg = this.add.image(1500, 260, 'kt-sun').setScrollFactor(0).setDepth(-9980);
    this.tweens.add({ targets: this.sunImg, angle: { from: -6, to: 6 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.moonImg = this.add.image(1640, -200, 'kt-moon').setScrollFactor(0).setDepth(-9980);
    this.tweens.add({ targets: this.moonImg, angle: { from: -5, to: 5 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Fjerne ting: planeter, UFO, satellit
    const at = (f: number, p: number, screenY: number) => screenY + f * p * S_MIN;
    const planet = this.add.image(1450, at(0.15, 0.97, 420), 'kt-planet').setScrollFactor(1, 0.15).setDepth(-9970).setScale(0.9);
    this.tweens.add({ targets: planet, angle: { from: -4, to: 4 }, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const sat = this.add.image(-200, at(0.3, 0.76, 260), 'kt-satellite').setScrollFactor(1, 0.3).setDepth(-9960).setScale(0.8);
    this.tweens.add({ targets: sat, x: W + 200, angle: 25, duration: 26000, repeat: -1 });
    const ufo = this.add.image(330, at(0.4, 0.9, 330), 'kt-ufo').setScrollFactor(1, 0.4).setDepth(-9950).setScale(0.85);
    this.tweens.add({ targets: ufo, x: 430, y: ufo.y - 30, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Bakker og by (forsvinder nedad når vi klatrer)
    this.add.image(W / 2, H - 260, 'kt-hills-far').setScrollFactor(1, 0.08).setDepth(-9900);
    this.add.image(W / 2, H - 200, 'kt-hills-city').setScrollFactor(1, 0.18).setDepth(-9890);
    this.add.image(W / 2, H - 120, 'kt-hills-near').setScrollFactor(1, 0.35).setDepth(-9880);

    // Skyer (midt-lag)
    for (let i = 0; i < 18; i++) {
      const s = -500 + (i / 17) * (0.62 * S_MIN + 500);
      const y = 80 + this.rng() * 900 + 0.5 * s;
      const cloud = this.add
        .image(this.rng() * W, y, 'scenery-cloud')
        .setScrollFactor(1, 0.5)
        .setDepth(-9800)
        .setScale(0.6 + this.rng() * 0.9)
        .setAlpha(0.95);
      this.tweens.add({ targets: cloud, x: cloud.x + (this.rng() < 0.5 ? -1 : 1) * (140 + this.rng() * 200), duration: 9000 + this.rng() * 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Fugle
    for (let i = 0; i < 6; i++) {
      const bird = this.add.image(-150 - i * 70, at(0.7, 0.13, 260) + (i % 2) * 40 + i * 12, 'kt-bird').setScrollFactor(1, 0.7).setDepth(-9700).setScale(0.8 - i * 0.04);
      this.tweens.add({ targets: bird, scaleY: { from: 0.9, to: 0.3 }, duration: 220 + i * 20, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: bird, x: W + 200 + i * 70, duration: 14000, repeat: -1, delay: i * 120 });
    }
    // Luftballon
    const balloon = this.add.image(1560, at(0.45, 0.3, 380), 'kt-balloon').setScrollFactor(1, 0.45).setDepth(-9700).setScale(0.9);
    this.tweens.add({ targets: balloon, y: balloon.y - 40, angle: { from: -3, to: 3 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Fly med banner
    const plane = this.add.container(W + 500, at(0.55, 0.5, 260)).setScrollFactor(1, 0.55).setDepth(-9650);
    const pl = this.add.image(0, 0, 'kt-plane').setFlipX(true).setScale(0.8);
    const rope = this.add.rectangle(210, 0, 110, 4, N.ink);
    const bannerBg = this.add.rectangle(400, 0, 300, 70, 0xfff6e0).setStrokeStyle(6, N.ink);
    const bannerText = title(this, 400, 0, 'HEJ MOR!', 44, { color: C.tomato });
    plane.add([rope, bannerBg, bannerText, pl]);
    this.tweens.add({ targets: plane, x: -700, duration: 16000, repeat: -1 });
    this.tweens.add({ targets: bannerBg, scaleY: { from: 1, to: 0.85 }, duration: 300, yoyo: true, repeat: -1 });

    // Forgrunds-skyer (passerer FORAN tårnet)
    for (let i = 0; i < 6; i++) {
      const s = 0.38 * S_MIN + (i / 5) * 0.2 * S_MIN;
      const cloud = this.add
        .image(this.rng() < 0.5 ? 200 + this.rng() * 400 : 1300 + this.rng() * 400, 200 + this.rng() * 700 + 1.25 * s, 'scenery-cloud')
        .setScrollFactor(1, 1.25)
        .setDepth(3000)
        .setScale(1.6 + this.rng() * 0.8)
        .setAlpha(0.8);
      this.tweens.add({ targets: cloud, x: cloud.x + 160, duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Jorden
    this.add.image(W / 2, GROUND_Y - 44, 'kt-ground').setOrigin(0.5, 0).setDepth(-500);
    const sign = this.add.container(250, GROUND_Y - 6).setDepth(-400);
    sign.add(this.add.image(0, 0, 'kt-sign').setOrigin(0.5, 1).setScale(0.8));
    sign.add(title(this, 0, -160, 'KAOS-TÅRNET', 46, { color: C.sun }));
    sign.add(body(this, 0, -118, '100 m til pokalen ↑', 24, { stroke: 5 }));
    this.tweens.add({ targets: sign, angle: { from: -2, to: 2 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildTower(): void {
    // Sofaen er fundamentet.
    const sofa = this.add.image(W / 2, GROUND_Y + 14, SOFA.key).setOrigin(0.5, 1).setDepth(100);
    this.segs.push({ img: sofa, base: -14, h: SOFA.h, w: SOFA.w, off: 0 });
    const royalBase = TOP_H - ROYAL.h + 22;
    let top = SOFA.h - 50;
    let prev = '';
    const raw: { key: string; w: number; h: number; base: number; off: number }[] = [];
    while (top < royalBase + 10) {
      let art = SEGMENTS[Math.floor(this.rng() * SEGMENTS.length)];
      if (art.key === prev) art = SEGMENTS[(SEGMENTS.indexOf(art) + 1) % SEGMENTS.length];
      prev = art.key;
      const off = (this.rng() - 0.5) * 90;
      raw.push({ key: art.key, w: art.w, h: art.h, base: top, off });
      top += art.h - 34;
    }
    // Tryk stablen en anelse sammen, så den ender præcis under puden.
    const k = (royalBase + 16 - (SOFA.h - 50)) / (top - (SOFA.h - 50));
    raw.forEach((r, i) => {
      const base = SOFA.h - 50 + (r.base - (SOFA.h - 50)) * k;
      const img = this.add.image(W / 2 + r.off, GROUND_Y - base, r.key).setOrigin(0.5, 1).setDepth(101 + i);
      if (this.rng() < 0.5) img.setFlipX(true);
      this.segs.push({ img, base, h: r.h, w: r.w, off: r.off });
    });
    this.royal = this.add.image(W / 2, GROUND_Y - royalBase, ROYAL.key).setOrigin(0.5, 1).setDepth(101 + raw.length);
    this.segs.push({ img: this.royal, base: royalBase, h: ROYAL.h + 30, w: ROYAL.w, off: 0 });
  }

  private buildTop(): void {
    const y = GROUND_Y - TOP_H;
    this.trophyRays = this.add.image(W / 2, y - 140, 'kt-rays').setDepth(1900).setScale(1.6).setAlpha(0.7);
    this.tweens.add({ targets: this.trophyRays, angle: 360, duration: 14000, repeat: -1 });
    this.trophyGlow = this.add.image(W / 2, y - 140, 'kt-glow').setDepth(1901).setScale(2.2);
    this.tweens.add({ targets: this.trophyGlow, scale: 2.6, alpha: 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.trophy = this.add.image(W / 2, y + 6, 'kt-trophy').setOrigin(0.5, 1).setDepth(1950).setScale(0.75);
    this.tweens.add({ targets: this.trophy, scaleY: 0.78, scaleX: 0.72, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Glimt omkring pokalen
    const sparkle = this.add.particles(W / 2, y - 140, TEX.spark, {
      x: { min: -160, max: 160 },
      y: { min: -160, max: 120 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 900,
      frequency: 140,
      tint: [0xffffff, N.sun],
    });
    sparkle.setDepth(1960);
    this.trophyGlow.setData('sparkle', sparkle);
  }

  private buildGuests(): void {
    // Pruttepuder spredt op ad tårnet (de skyder én OP!)
    const cushionHs = [0.07, 0.15, 0.22, 0.3, 0.37, 0.45, 0.53, 0.6, 0.68, 0.76, 0.84, 0.91];
    cushionHs.forEach((f, i) => {
      const h = f * TOP_H + (this.rng() - 0.5) * 120;
      const b = this.bounds(h);
      const x = Phaser.Math.Linear(b[0] + 40, b[1] - 40, i % 2 === 0 ? 0.15 + this.rng() * 0.3 : 0.55 + this.rng() * 0.3);
      const img = this.add.image(0, 0, 'kt-whoopee').setDepth(1500).setScale(0.75);
      this.tweens.add({ targets: img, scaleX: 0.8, duration: 500 + i * 30, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.cushions.push({ x, h, img, cd: 0, seen: false });
    });

    // Sjippe-Ålen svinger fra kageruller
    [0.29, 0.47, 0.63, 0.8].forEach((f, i) => {
      const pivotH = f * TOP_H;
      const pin = this.add.image(0, 0, 'kt-pin').setDepth(2450);
      const img = this.add.image(0, 0, 'kt-eel').setOrigin(0.5, 0.02).setDepth(2440);
      this.eels.push({ pivotH, len: 520, amp: 0.6 + i * 0.03, omega: (Math.PI * 2) / (2.8 - i * 0.2), phase: this.rng() * 6, theta: 0, pin, img, side: 1, px: (i % 2 ? -1 : 1) * 190, seen: false });
    });

    // Kanon-Kyllingen og kokken på hver sin side
    const make = (kind: 'chicken' | 'chef', f: number, side: 1 | -1) => {
      const h = f * TOP_H;
      const ledge = this.add.image(0, 0, kind === 'chicken' ? 'kt-spoon' : 'kt-balcony').setDepth(1790).setFlipX(side < 0);
      const img = this.add.image(0, 0, kind === 'chicken' ? 'kt-chicken' : 'kt-chef').setOrigin(0.5, 1).setDepth(1800).setFlipX(side < 0).setScale(kind === 'chicken' ? 0.8 : 0.75);
      this.tweens.add({ targets: img, scaleY: img.scaleY * 1.04, duration: 400 + this.rng() * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.throwers.push({ kind, side, h, x: 0, img, ledge, cd: 1 + this.rng() * 1.5, seen: false });
    };
    make('chicken', 0.19, -1);
    make('chef', 0.38, 1);
    make('chicken', 0.55, 1);
    make('chef', 0.7, -1);
    make('chicken', 0.84, -1);
    make('chef', 0.93, 1);
  }

  private buildPlayers(): void {
    const starts = [-330, -110, 110, 330];
    for (const p of this.players) {
      const blok = this.spawnBlok(p, W / 2 + starts[p.slot], GROUND_Y, { size: BLOK_SIZE });
      blok.setDepth(2000 + p.slot);
      const side = p.slot % 2 === 0 ? -1 : 1;
      const marker = this.add.container(METER.x + side * 48, METER.bottom).setScrollFactor(0).setDepth(7100 + p.slot);
      marker.add(this.add.image(0, 0, `kt-marker-${p.color}`).setScale(0.62).setAngle(-90 * side));
      marker.setData('side', side);
      const arrow = this.add.container(0, H - 70).setScrollFactor(0).setDepth(7050).setVisible(false);
      const arrowText = label(this, 0, 52, '', 26, { color: '#ffffff' });
      arrow.add([this.add.image(0, 0, `kt-arrow-${p.color}`).setScale(0.8), arrowText]);
      this.climbers.push({
        p,
        blok,
        x: starts[p.slot],
        h: 0,
        vh: 0,
        kx: 0,
        stun: 0,
        inv: 0,
        boostCd: 0,
        arrived: false,
        order: -1,
        skill: 0.55 + this.rng() * 0.4,
        botA: false,
        fxTimer: 0,
        marker,
        markerHead: null,
        arrow,
        arrowText,
        meterY: METER.bottom,
      });
    }
  }

  private buildHud(): void {
    const len = METER.bottom - METER.top;
    this.add.image(METER.x, (METER.top + METER.bottom) / 2, 'kt-meter').setScrollFactor(0).setDepth(7000).setDisplaySize(52, len + 60);
    const cup = this.add.image(METER.x, METER.top - 52, 'kt-trophy').setScrollFactor(0).setDepth(7001).setScale(0.22);
    this.tweens.add({ targets: cup, angle: { from: -8, to: 8 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    body(this, METER.x, METER.bottom + 52, '0 m', 22, { stroke: 5 }).setScrollFactor(0).setDepth(7001);

    const badge = this.add.container(170, 70).setScrollFactor(0).setDepth(7000);
    const g = this.add.graphics();
    g.fillStyle(N.ink, 1).fillRoundedRect(-150, -46, 300, 100, 28);
    g.fillStyle(N.tomato, 1).fillRoundedRect(-144, -52, 288, 96, 26);
    g.fillStyle(0xffffff, 0.2).fillRoundedRect(-130, -46, 258, 22, 11);
    badge.add([g, title(this, 0, -12, 'FINALE', 52, { color: C.sun }), body(this, 0, 28, 'DOBBELT POINT', 22, { stroke: 5 })]);
    this.tweens.add({ targets: badge, angle: { from: -3, to: 3 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Letterbox (slow-mo) og lyskegler
    this.bars = [
      this.add.rectangle(W / 2, -60, W, 120, 0x000000).setScrollFactor(0).setDepth(8800),
      this.add.rectangle(W / 2, H + 60, W, 120, 0x000000).setScrollFactor(0).setDepth(8800),
    ];
  }

  // ---------------------------------------------------------------------------
  // Tårnets geometri

  private segAt(h: number): Segment {
    for (let i = this.segs.length - 1; i >= 0; i--) if (h >= this.segs[i].base) return this.segs[i];
    return this.segs[0];
  }

  /** Klatrebart interval [min, max] (x) i en given højde. */
  private bounds(h: number): [number, number] {
    const s = this.segAt(h);
    const hw = Math.max(170, s.w / 2 - 70);
    return [s.off - hw, s.off + hw];
  }

  private sway(h: number): number {
    const f = Math.pow(Phaser.Math.Clamp(h / TOP_H, 0, 1.1), 1.3);
    const t = this.time0;
    return f * ((52 + this.wobble * 90) * Math.sin(t * 0.85 + h * 0.0007) + 10 * Math.sin(t * 2.3 + h * 0.003));
  }

  private sx(x: number, h: number): number {
    return W / 2 + this.sway(h) + x;
  }

  private sy(h: number): number {
    return GROUND_Y - h;
  }

  // ---------------------------------------------------------------------------
  // Intro: kameraet flyver fra pokalen ned til jorden, derefter 3-2-1-KAOS (fast på skærmen).

  protected async countdown(): Promise<void> {
    const cam = this.cameras.main;
    this.flyover = true;
    this.camS = S_MIN;
    cam.setScroll(0, S_MIN);
    const head = title(this, W / 2, 230, 'KAOS-TÅRNET', 150, { color: C.sun }).setScrollFactor(0).setDepth(9600).setAngle(-3);
    const sub = body(this, W / 2, 340, 'Først op til guldpokalen vinder!', 44, { stroke: 9 }).setScrollFactor(0).setDepth(9600);
    this.fx.popIn(head);
    this.fx.popIn(sub, 200);
    this.sfx('fanfare');
    this.say('Velkommen til finalen! Kaos-tårnet! Først på toppen vinder pokalen!', true);
    await this.wait(1300);
    this.sfx('whoosh', { pitch: 0.6 });
    this.tweens.add({ targets: [head, sub], alpha: 0, y: '-=60', duration: 500, delay: 1400 });
    await new Promise<void>((resolve) => {
      this.tweens.addCounter({
        from: S_MIN,
        to: 0,
        duration: 2600,
        ease: 'Cubic.easeInOut',
        onUpdate: (tw) => {
          this.camS = tw.getValue() ?? 0;
          cam.setScroll(0, this.camS);
        },
        onComplete: () => resolve(),
      });
    });
    head.destroy();
    sub.destroy();
    this.flyover = false;
    this.sfx('stomp');
    this.fx.shake(0.006, 200);
    for (const s of ['3', '2', '1']) {
      await this.step(s, C.cream, 260);
      this.sfx('tick', { pitch: 1.2 });
    }
    this.sfx('go');
    this.say('go', true);
    await this.step('KLATR!', C.sun, 300, 1.2);
  }

  private step(text: string, color: string, size: number, scale = 1): Promise<void> {
    return new Promise((resolve) => {
      const t = title(this, W / 2, H / 2 - 60, text, size, { color }).setScrollFactor(0).setDepth(9600).setScale(0).setAngle(-8);
      this.tweens.add({ targets: t, scale, angle: 0, duration: 260, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, scale: scale * 1.6, alpha: 0, delay: 480, duration: 220, onComplete: () => (t.destroy(), resolve()) });
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  protected onStart(): void {
    this.say('Klatr! Klatr! Klatr!');
  }

  // ---------------------------------------------------------------------------
  // Spil-logik

  protected play(rawDt: number): void {
    const slow = this.slowLeft > 0 ? 0.25 : 1;
    if (this.slowLeft > 0) {
      this.slowLeft -= rawDt;
      // Tiden går også langsommere under slow-mo.
      this.timeLeft = Math.min(this.duration ?? 60, this.timeLeft + rawDt * (1 - slow));
      if (this.slowLeft <= 0) this.endSlowmo();
    }
    const dt = rawDt * slow;
    const progress = this.duration ? 1 - this.timeLeft / this.duration : 0;

    // Små delskridt, så intet smutter igennem hinanden ved lav framerate.
    const steps = Math.max(1, Math.ceil(dt / 0.034));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.firstStep = i === 0;
      for (const c of this.climbers) this.updateClimber(c, h);
      this.separate();
      this.updateBalls(h, progress);
      this.updateProjs(h);
      this.updateEels(h);
      this.updateCushions(h);
      this.updateThrowers(h);
      this.updatePuddles(h);
    }
    this.updateLeader(dt);

    if (!this.saidTen && this.timeLeft <= 10 && this.arrivals.length === 0) {
      this.saidTen = true;
      this.say('Ti sekunder tilbage! Klatr for livet!', true);
      this.ribbon('10 SEKUNDER!', C.tomato);
    }
    this.creakTimer -= dt;
    if (this.creakTimer <= 0) {
      this.creakTimer = 5 + this.rng() * 4;
      this.sfx('rumble', { volume: 0.35, pitch: 0.7 });
      this.wobble = Math.min(1, this.wobble + 0.35);
    }

    // Alle oppe → slut
    if (this.arrivals.length === this.climbers.length && this.slowLeft <= 0) this.finish(this.ranking());
  }

  protected timeUp(): number[][] {
    return this.ranking();
  }

  private ranking(): number[][] {
    const scores: number[] = this.players.map(() => 0);
    for (const c of this.climbers) scores[c.p.slot] = c.arrived ? 100000 - c.order * 1000 : Math.round(c.h);
    return this.rankByScore(scores);
  }

  private updateClimber(c: Climber, dt: number): void {
    const b = c.blok;
    c.boostCd = Math.max(0, c.boostCd - dt);
    c.inv = Math.max(0, c.inv - dt);
    if (c.arrived) return;
    const pad = this.pad(c.p.slot);
    const screenY = this.sy(c.h) - this.camS;
    const lead = this.climbers.reduce((m, k) => (k.arrived ? m : Math.max(m, k.h)), 0);
    const behind = screenY > H - 30 || lead - c.h > 800;
    const rubber = behind ? 1.6 : 1;
    let climbing = false;

    if (c.stun > 0) {
      c.stun -= dt;
      c.fxTimer -= dt;
      if (c.fxTimer <= 0 && c.h > 10) {
        c.fxTimer = 0.07;
        this.fx.dust(this.sx(c.x, c.h), this.sy(c.h) - 10, 2);
      }
    } else {
      const up = -pad.y;
      const vy = up > 0 ? up * CLIMB_UP * rubber : up * CLIMB_DOWN;
      c.h += vy * dt;
      c.x += pad.x * SIDE * dt;
      climbing = Math.hypot(pad.x, pad.y) > 0.2;
      if (this.firstStep && this.pressedA(c.p.slot) && c.boostCd <= 0) this.boost(c, behind);
      if (climbing && up > 0.3) {
        c.fxTimer -= dt;
        if (c.fxTimer <= 0) {
          c.fxTimer = 0.45;
          if (this.onScreen(c.h)) this.fx.dust(this.sx(c.x, c.h) + (this.rng() - 0.5) * 50, this.sy(c.h) - 90, 2);
        }
      }
    }

    // Lodret fart (hop, prut-skud, glid)
    if (c.vh > 0) {
      c.h += c.vh * dt;
      c.vh = Math.max(0, c.vh - BOOST_DECEL * dt);
    } else if (c.vh < 0) {
      c.h += c.vh * dt;
      c.vh = Math.min(0, c.vh + SLIDE_DECEL * dt);
    }
    c.x += c.kx * dt;
    c.kx *= Math.exp(-4 * dt);

    if (c.h <= 0) {
      if (c.vh < -200) {
        this.sfx('stomp', { volume: 0.6, pan: this.panFor(this.sx(c.x, 0)) });
        this.fx.dust(this.sx(c.x, 0), GROUND_Y, 10);
        b.squash(1.4, 0.7);
      }
      c.h = 0;
      c.vh = Math.max(0, c.vh);
    }
    const [lo, hi] = this.bounds(c.h);
    c.x = Phaser.Math.Clamp(c.x, lo, hi);

    if (c.h >= TOP_H) this.arrive(c);

    // Figuren
    b.walk(c.stun > 0 ? 0 : pad.x, c.stun > 0 ? 0 : climbing ? Math.max(Math.abs(pad.y), 0.4) : 0, dt * 1000 * 1.4);
    b.setAlpha(c.inv > 0 && c.stun <= 0 ? 0.72 + 0.28 * Math.sin(this.elapsed * 40) : 1);
  }

  private boost(c: Climber, behind: boolean): void {
    c.vh = BOOST_V * (behind ? 1.25 : 1);
    c.boostCd = BOOST_CD * (behind ? 0.75 : 1);
    this.stat(c.p.slot, 'jumps');
    c.blok.squash(0.75, 1.3, 80);
    if (this.onScreen(c.h)) {
      this.sfx('jump', { volume: 0.55, pitch: 0.9 + this.rng() * 0.3, pan: this.panFor(this.sx(c.x, c.h)) });
      this.fx.dust(this.sx(c.x, c.h), this.sy(c.h), 5);
    }
    this.vibrate(c.p.slot, 20);
  }

  /** Bliv ramt: glid ned ad tårnet. */
  private hit(c: Climber, dirX: number, text: string, color: string = C.tomato, power = 1): boolean {
    if (c.arrived || c.stun > 0 || c.inv > 0) return false;
    c.stun = 0.7 * power;
    c.inv = 1.9;
    c.vh = -SLIDE_V * power;
    c.kx = dirX * 360;
    this.stat(c.p.slot, 'hits');
    this.stat(c.p.slot, 'falls');
    this.vibrate(c.p.slot, 160);
    const x = this.sx(c.x, c.h);
    const y = this.sy(c.h) - BODY;
    c.blok.spinOut(1, 700);
    c.blok.bonk();
    if (this.onScreen(c.h)) {
      this.sfx('hit', { pan: this.panFor(x) });
      if (this.rng() < 0.5) this.sfx('scream', { volume: 0.6, pan: this.panFor(x), delay: 0.05 });
      this.fx.stars(x, y - 20, N.sun, 8);
      if (this.elapsed - this.lastText > 0.5) {
        this.lastText = this.elapsed;
        this.fx.floatText(x, y - 90, text, color, 54);
      }
      this.fx.shake(0.006, 160);
      this.wobble = Math.min(1, this.wobble + 0.25);
    }
    return true;
  }

  private separate(): void {
    const list = this.climbers.filter((c) => !c.arrived);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x;
        const dh = b.h - a.h;
        if (Math.abs(dh) > 100 || Math.abs(dx) > 74) continue;
        const push = (74 - Math.abs(dx)) / 2;
        const dir = dx === 0 ? (a.p.slot < b.p.slot ? 1 : -1) : Math.sign(dx);
        a.x -= dir * push;
        b.x += dir * push;
        // Hop op i hovedet på den ovenover = BONK!
        const [low, high] = dh > 0 ? [a, b] : [b, a];
        if (low.vh > 350 && Math.abs(high.h - low.h) > 40 && high.stun <= 0) {
          low.vh = 0;
          this.stat(low.p.slot, 'bonks');
          if (this.hit(high, Math.sign(high.x - low.x) || 1, 'BONK!', C.sun, 0.55)) {
            this.sfx('bonk', { pan: this.panFor(this.sx(high.x, high.h)) });
          }
        }
      }
    }
  }

  private arrive(c: Climber): void {
    c.arrived = true;
    c.order = this.arrivals.length;
    this.arrivals.push(c.p.slot);
    c.h = TOP_H;
    c.vh = 0;
    c.stun = 0;
    c.blok.setAlpha(1);
    const spots = [0, -205, 205, 110];
    const spot = spots[c.order] ?? 0;
    this.tweens.addCounter({ from: c.x, to: spot, duration: 500, ease: 'Quad.easeOut', onUpdate: (tw) => (c.x = tw.getValue() ?? spot) });
    c.blok.hop(90, 260);
    this.time.delayedCall(600, () => (c.order === 0 ? c.blok.dance() : c.blok.cheer()));
    const x = this.sx(0, TOP_H);
    const y = this.sy(TOP_H);
    this.vibrate(c.p.slot, 400);
    if (c.order === 0) {
      // VINDER! Slow-mo, letterbox, fyrværkeri.
      this.trophyHolder = c.p.slot;
      this.slowLeft = 2.6;
      this.tweens.timeScale = 0.35 * this.speed;
      this.fx.flash(0xffffff, 400, 0.8);
      this.fx.shake(0.01, 300);
      this.fx.confetti(3000);
      this.sfx('fanfare');
      this.sfx('cheer', { delay: 0.2 });
      this.sfx('explosion', { volume: 0.5, pitch: 1.4 });
      this.say(`${c.p.name} har nået toppen! Pokalen er hjemme!`, true);
      this.fx.burst(x, y - 140, { texture: TEX.star, color: [N.sun, 0xffffff, c.p.colorNum], count: 40, speed: 900, gravity: 500, lifespan: 1400, scale: 0.8 });
      for (let i = 0; i < 5; i++) this.time.delayedCall(150 + i * 260, () => this.firework());
      if (this.timeLeft > 15) this.timeLeft = 15;
      const others = this.climbers.length - 1;
      void this.fx.banner(`${c.p.name.toUpperCase()} ER PÅ TOPPEN!`, {
        color: c.p.color,
        size: 110,
        hold: 2200,
        sub: others > 0 ? 'Resten kæmper om pladserne – 15 sek.!' : undefined,
      });
      // Pokalen løftes over hovedet
      this.tweens.killTweensOf(this.trophy);
      this.tweens.add({ targets: this.trophy, scale: 0.42, duration: 500, ease: 'Back.easeOut' });
      for (let i = 0; i < 3; i++) {
        const beam = this.add.image(x + (i - 1) * 420, this.camS - 40, 'kt-beam').setOrigin(0.5, 0).setDepth(1880).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(2.2, 2);
        beam.setAngle((1 - i) * 22);
        this.tweens.add({ targets: beam, alpha: 0.55, duration: 400 });
        this.tweens.add({ targets: beam, angle: beam.angle - (1 - i) * 30, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.beams.push(beam);
      }
    } else {
      this.sfx('coin', { pitch: 1 + c.order * 0.1 });
      this.sfx('cheer', { delay: 0.1 });
      this.fx.burst(this.sx(spot, TOP_H), y - 60, { texture: TEX.star, color: [c.p.colorNum, 0xffffff], count: 20, speed: 600, gravity: 700 });
      this.fx.floatText(this.sx(spot, TOP_H), y - 200, `${c.order + 1}. PLADS!`, c.p.color, 56);
      this.say(`${c.p.name} er også oppe!`);
    }
  }

  private endSlowmo(): void {
    this.slowLeft = 0;
    if (this.running) this.tweens.timeScale = this.speed;
    for (const beam of this.beams) this.tweens.add({ targets: beam, alpha: 0, duration: 600, onComplete: () => beam.destroy() });
    this.beams = [];
  }

  private firework(): void {
    const cam = this.cameras.main;
    const sx = 260 + this.rng() * (W - 620);
    const sy = 140 + this.rng() * 360;
    const colors = [N.sun, N.bubblegum, N.mint, N.sky, N.grape, N.tangerine];
    const col = colors[Math.floor(this.rng() * colors.length)];
    const rocket = this.add.image(sx, cam.scrollY + H + 20, TEX.spark).setTint(col).setDepth(1870).setScale(0.6);
    this.sfx('whoosh', { pitch: 1.6, volume: 0.4 });
    this.tweens.add({
      targets: rocket,
      y: cam.scrollY + sy,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        rocket.destroy();
        this.fx.burst(sx, cam.scrollY + sy, { texture: TEX.spark, color: [col, 0xffffff], count: 36, speed: 520, gravity: 160, lifespan: 1300, scale: 0.7, depth: 1870 });
        this.sfx('explosion', { volume: 0.35, pitch: 1.8 + this.rng() * 0.5 });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Forhindringer

  private onScreen(h: number, margin = 0): boolean {
    const y = this.sy(h) - this.camS;
    return y > -margin && y < H + margin;
  }

  private camTopH(): number {
    return GROUND_Y - this.camS;
  }

  private bodyDist(c: Climber, x: number, h: number): number {
    return Math.hypot(c.x - x, c.h + BODY - h);
  }

  private updateBalls(dt: number, progress: number): void {
    const climbers = this.climbers.filter((c) => !c.arrived);
    this.ballTimer -= dt;
    if (this.ballTimer <= 0 && climbers.length && this.elapsed > 2) {
      this.ballTimer = Phaser.Math.Linear(2.6, 1.5, progress) * (0.7 + this.rng() * 0.6);
      // Sigt efter en tilfældig klatrer – en advarsel ("!") øverst på skærmen viser hvor den kommer.
      const target = climbers[Math.floor(this.rng() * climbers.length)];
      const h = Math.min(TOP_H - 40, this.camTopH() + 60);
      if (h > target.h + 250) {
        const [lo, hi] = this.bounds(h);
        const x = Phaser.Math.Clamp(target.x + (this.rng() - 0.5) * 300, lo, hi);
        const img = this.add.image(0, 0, 'kt-warn').setDepth(6400).setScale(0);
        this.tweens.add({ targets: img, scale: 0.8, duration: 200, ease: 'Back.easeOut' });
        this.tweens.add({ targets: img, alpha: 0.4, duration: 120, yoyo: true, repeat: -1 });
        this.warnings.push({ x, t: 0.75, img });
        if (this.onScreen(target.h)) this.sfx('tick', { pitch: 1.6, volume: 0.5, pan: this.panFor(this.sx(x, h)) });
      }
    }
    for (const w of this.warnings) {
      w.t -= dt;
      if (w.t > 0) continue;
      w.img.destroy();
      const h = Math.min(TOP_H - 40, this.camTopH() + 80);
      const [lo, hi] = this.bounds(h);
      const x = Phaser.Math.Clamp(w.x, lo, hi);
      const img = this.add.image(0, 0, 'kt-meatball').setDepth(2600).setScale(0.85 * (0.85 + this.rng() * 0.3));
      this.balls.push({ id: this.nextId++, img, x, h, vx: (this.rng() - 0.5) * 120, vh: -100, seg: this.segs.indexOf(this.segAt(h)), dead: false });
      this.sfx('whoosh', { volume: 0.4, pitch: 0.8 });
      if (!this.seenBalls) {
        this.seenBalls = true;
        this.callout(this.sx(x, h - 260) + (x > 0 ? -380 : 380), this.sy(h - 260), 'Sumo-Frikadellerne!', 'Pas på! Frikadellerne ruller!');
      }
    }
    this.warnings = this.warnings.filter((w) => w.t > 0);
    const g = 1500 * this.chaos.gravity;
    for (const b of this.balls) {
      if (b.dead) continue;
      b.vh = Math.max(-820, b.vh - g * dt);
      b.h += b.vh * dt;
      b.x += b.vx * dt;
      const [lo, hi] = this.bounds(b.h);
      if (b.x < lo || b.x > hi) {
        b.x = Phaser.Math.Clamp(b.x, lo, hi);
        b.vx = -b.vx;
      }
      // Hop når den ruller over en kant i tårnet
      const segIdx = this.segs.indexOf(this.segAt(b.h));
      if (segIdx < b.seg) {
        b.seg = segIdx;
        b.vh = 260 + this.rng() * 160;
        b.vx = (this.rng() - 0.5) * 260;
        if (this.onScreen(b.h)) {
          this.sfx('bonk', { volume: 0.25, pitch: 1.6, pan: this.panFor(this.sx(b.x, b.h)) });
          this.fx.squash(b.img, 1.25, 0.8, 70);
        }
      }
      b.img.rotation += (b.vx / 60 + 4) * dt * (b.id % 2 ? 1 : -1);
      for (const c of climbers) {
        if (this.bodyDist(c, b.x, b.h) < 80 * this.chaos.size) {
          if (this.hit(c, Math.sign(c.x - b.x) || 1, 'FRIKADELLE!', C.tangerine)) {
            this.sfx('splat', { volume: 0.6 });
            b.vh = 300;
            b.vx = -Math.sign(c.x - b.x) * 250;
          }
        }
      }
      if (b.h < 0 || b.h < GROUND_Y - (this.camS + H) - 400) {
        b.dead = true;
        if (b.h < 0 && this.onScreen(0)) {
          this.fx.burst(this.sx(b.x, 0), GROUND_Y, { color: [0x7a3a18, 0xc8743c], count: 10, speed: 400 });
          this.sfx('splat', { volume: 0.4 });
        }
        b.img.destroy();
      }
    }
    this.balls = this.balls.filter((b) => !b.dead);
  }

  private throwAt(t: Thrower, c: Climber): void {
    const fromX = t.x + t.side * -50;
    const fromH = t.h + (t.kind === 'chicken' ? 120 : 160);
    const flight = Phaser.Math.Clamp(Math.hypot(c.x - fromX, c.h - fromH) / 820, 0.7, 1.3);
    const g = 1100 * this.chaos.gravity;
    const lead = c.stun > 0 ? 0 : 40;
    const tx = c.x + (this.rng() - 0.5) * 220;
    const th = c.h + BODY + lead;
    const kind = t.kind === 'chicken' ? 'egg' : 'mustard';
    const img = this.add.image(0, 0, kind === 'egg' ? 'kt-egg' : 'kt-mustard').setDepth(2700).setScale(kind === 'egg' ? 0.8 : 0.9);
    this.projs.push({ id: this.nextId++, kind, img, x: fromX, h: fromH, vx: (tx - fromX) / flight, vh: (th - fromH) / flight + 0.5 * g * flight, t: 0, flight, dead: false });
    const pan = this.panFor(this.sx(t.x, t.h));
    if (t.kind === 'chicken') {
      this.sfx('cluck', { pan });
      this.sfx('pop', { pan, delay: 0.05, pitch: 0.8 });
    } else {
      this.sfx('squeak', { pan, pitch: 0.7 });
      this.sfx('swish', { pan, delay: 0.05 });
    }
    this.fx.squash(t.img, 1.15, 0.85, 90);
    this.tweens.add({ targets: t.img, angle: { from: 0, to: -t.side * 12 }, duration: 120, yoyo: true });
  }

  private updateProjs(dt: number): void {
    const g = 1100 * this.chaos.gravity;
    for (const p of this.projs) {
      if (p.dead) continue;
      p.t += dt;
      p.vh -= g * dt;
      p.x += p.vx * dt;
      p.h += p.vh * dt;
      p.img.rotation += dt * (p.kind === 'egg' ? 8 : 4);
      for (const c of this.climbers) {
        if (c.arrived) continue;
        if (this.bodyDist(c, p.x, p.h) < 70 * this.chaos.size) {
          const egg = p.kind === 'egg';
          if (this.hit(c, Math.sign(p.vx) || 1, egg ? 'ÆG I HOVEDET!' : 'SENNEP!', egg ? C.cream : C.sun)) {
            this.sfx('splat', { pan: this.panFor(this.sx(c.x, c.h)) });
            this.splat(p.kind, c.x, c.h + BODY + 20, false);
            p.dead = true;
            p.img.destroy();
            break;
          }
        }
      }
      if (p.dead) continue;
      if (p.t > p.flight + 0.15) {
        const [lo, hi] = this.bounds(p.h);
        if (p.x > lo - 30 && p.x < hi + 30) {
          p.dead = true;
          p.img.destroy();
          this.splat(p.kind, p.x, p.h, true);
          if (this.onScreen(p.h)) this.sfx('splat', { volume: 0.45, pan: this.panFor(this.sx(p.x, p.h)) });
        }
      }
      if (!p.dead && (p.t > 4 || p.h < 0)) {
        p.dead = true;
        p.img.destroy();
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  private splat(kind: 'egg' | 'mustard', x: number, h: number, puddle: boolean): void {
    const key = kind === 'egg' ? 'kt-eggsplat' : 'kt-mustsplat';
    const img = this.add.image(this.sx(x, h), this.sy(h), key).setDepth(puddle ? 1450 : 2750).setScale(0.2).setAngle(this.rng() * 360);
    this.tweens.add({ targets: img, scale: puddle ? 0.75 : 0.6, duration: 160, ease: 'Back.easeOut' });
    this.fx.burst(this.sx(x, h), this.sy(h), { texture: TEX.drop, color: kind === 'egg' ? [0xffffff, 0xffcf3a] : [0xffd21a, 0xe6a400], count: 10, speed: 380, gravity: 1200, scale: 0.5 });
    if (puddle && kind === 'mustard') {
      // Sennepspøl er glat! Rør den = glid.
      this.puddles.push({ x, h, img, life: 7 });
    } else {
      this.puddles.push({ x, h, img, life: puddle ? 2.5 : 0.8 });
      img.setData('harmless', true);
    }
  }

  private updatePuddles(dt: number): void {
    for (const p of this.puddles) {
      p.life -= dt;
      if (p.life < 1) p.img.setAlpha(Math.max(0, p.life));
      if (p.life <= 0) {
        p.img.destroy();
        continue;
      }
      if (p.img.getData('harmless')) continue;
      for (const c of this.climbers) {
        if (c.arrived) continue;
        if (Math.abs(c.x - p.x) < 60 && Math.abs(c.h + 20 - p.h) < 50) this.hit(c, Math.sign(c.x - p.x) || 1, 'GLAT!', C.sun, 0.8);
      }
    }
    this.puddles = this.puddles.filter((p) => p.life > 0);
  }

  private updateEels(dt: number): void {
    this.eelClock += dt;
    for (const e of this.eels) {
      const prev = e.theta;
      e.theta = e.amp * Math.sin(this.eelClock * e.omega + e.phase);
      const side = Math.sign(e.theta) || 1;
      const visible = this.onScreen(e.pivotH, 200);
      if (side !== e.side) {
        e.side = side;
        if (visible) this.sfx('swish', { volume: 0.55, pan: this.panFor(this.sx(0, e.pivotH)) });
      }
      if (visible && !e.seen && this.onScreen(e.pivotH, -150)) {
        e.seen = true;
        this.callout(this.sx(e.px, e.pivotH) - Math.sign(e.px) * 520, this.sy(e.pivotH) + 160, 'Sjippe-Ålen!', 'Ålen er tilbage! Og den svinger!');
      }
      const s = this.segAt(e.pivotH);
      const px = s.off + e.px;
      const tipX = px + Math.sin(e.theta) * e.len;
      const tipH = e.pivotH - Math.cos(e.theta) * e.len;
      const dir = Math.sign(e.theta - prev) || 1;
      for (const c of this.climbers) {
        if (c.arrived) continue;
        // Afstand fra kroppen til ålens nederste 70 %
        const ax = px + Math.sin(e.theta) * e.len * 0.3;
        const ah = e.pivotH - Math.cos(e.theta) * e.len * 0.3;
        const d = distToSeg(c.x, c.h + BODY, ax, ah, tipX, tipH);
        if (d < 58 * this.chaos.size) {
          if (this.hit(c, dir, 'ÅL-SMÆK!', C.mint)) this.sfx('quack', { volume: 0.6, pitch: 0.7 });
        }
      }
    }
  }

  private updateCushions(dt: number): void {
    for (const k of this.cushions) {
      if (k.cd > 0) {
        k.cd -= dt;
        if (k.cd <= 0) {
          this.tweens.add({ targets: k.img, scaleY: 0.75, duration: 400, ease: 'Back.easeOut' });
          if (this.onScreen(k.h)) this.sfx('pump', { volume: 0.4, pan: this.panFor(this.sx(k.x, k.h)) });
        }
        continue;
      }
      if (!k.seen && this.onScreen(k.h, -200)) {
        k.seen = true;
        if (!this.cushions.some((o) => o !== k && o.seen)) this.callout(this.sx(k.x, k.h) + (k.x > 0 ? -260 : 260), this.sy(k.h) - 60, 'Prutte-Roulette!', 'Pruttepuder! Hop på dem!');
      }
      for (const c of this.climbers) {
        if (c.arrived || c.stun > 0) continue;
        if (Math.abs(c.x - k.x) < 70 && Math.abs(c.h + 30 - k.h) < 60) {
          k.cd = 5;
          c.vh = 1350;
          c.boostCd = 0.3;
          this.tweens.add({ targets: k.img, scaleY: 0.25, duration: 120, ease: 'Quad.easeOut' });
          const x = this.sx(k.x, k.h);
          const y = this.sy(k.h);
          this.sfx('fart', { pan: this.panFor(x) });
          this.sfx('boing', { delay: 0.08, pan: this.panFor(x) });
          this.fartEmitter.explode(9, x, y);
          this.fx.floatText(x, y - 80, 'PRUUUT!', C.mint, 58);
          c.blok.squash(0.7, 1.4, 100);
          this.vibrate(c.p.slot, 120);
          this.stat(c.p.slot, 'jumps');
          this.wobble = Math.min(1, this.wobble + 0.2);
          break;
        }
      }
    }
  }

  private updateThrowers(dt: number): void {
    for (const t of this.throwers) {
      const s = this.segAt(t.h);
      t.x = s.off + t.side * (s.w / 2 + 70);
      if (!t.seen && this.onScreen(t.h, -180)) {
        t.seen = true;
        const chick = t.kind === 'chicken';
        this.callout(this.sx(t.x, t.h) - t.side * 330, this.sy(t.h) - 150, chick ? 'Kanon-Kyllingen!' : 'Kokken Siger: SENNEP!', chick ? 'Kanon-kyllingen har æg med!' : 'Kokken siger: sennep i hovedet!');
      }
      t.cd -= dt;
      if (t.cd > 0) continue;
      const targets = this.climbers.filter((c) => !c.arrived && c.h > t.h - 950 && c.h < t.h + 200 && this.onScreen(c.h, 100));
      if (!targets.length) {
        t.cd = 0.4;
        continue;
      }
      const c = targets[Math.floor(this.rng() * targets.length)];
      t.cd = (t.kind === 'chicken' ? 2.2 : 2.6) * (0.8 + this.rng() * 0.5);
      this.throwAt(t, c);
    }
  }

  private updateLeader(dt: number): void {
    this.leaderCd -= dt;
    const climbing = this.climbers.filter((c) => !c.arrived);
    if (!climbing.length || this.arrivals.length) return;
    const top = climbing.reduce((a, b) => (b.h > a.h ? b : a));
    if (top.p.slot !== this.leader && top.h > 400) {
      const second = climbing.filter((c) => c !== top).reduce((m, c) => Math.max(m, c.h), 0);
      if (top.h - second > 40 && this.leaderCd <= 0) {
        this.leader = top.p.slot;
        this.leaderCd = 3.5;
        this.sfx('select', { pitch: 1.2 });
        this.fx.floatText(this.sx(top.x, top.h), this.sy(top.h) - 190, 'FØRER!', top.p.color, 46);
        if (this.rng() < 0.5) this.say(`${top.p.name} fører!`);
      }
    }
    // Milepæle
    const p = this.camS / S_MIN;
    if (this.milestones.length && p >= this.milestones[0]) {
      const m = this.milestones.shift()!;
      const texts: Record<number, [string, string]> = {
        0.25: ['25 m – over hustagene!', 'Over hustagene! Vink til mor!'],
        0.5: ['HALVVEJS! Solen går ned…', 'Halvvejs! Luften bliver tynd!'],
        0.75: ['75 m – hej, rummet!', 'Vi er i rummet! Er det en satellit?'],
        0.9: ['SIDSTE STRÆK!', 'Pokalen er lige der!'],
      };
      const [txt, line] = texts[m];
      this.ribbon(txt, C.sun);
      this.say(line);
      this.sfx('powerup', { volume: 0.6 });
    }
  }

  // ---------------------------------------------------------------------------
  // Tekst-effekter

  private ribbon(text: string, color: string): void {
    const c = this.add.container(W / 2, 200).setScrollFactor(0).setDepth(7500);
    const t = title(this, 0, 0, text, 64, { color });
    const g = this.add.graphics();
    const w = t.width + 120;
    g.fillStyle(N.ink, 0.8).fillRoundedRect(-w / 2, -50, w, 100, 50);
    c.add([g, t]);
    c.setScale(0, 1);
    this.tweens.add({ targets: c, scaleX: 1, duration: 280, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, y: 160, delay: 2000, duration: 400, onComplete: () => c.destroy() });
  }

  /** "Gæsteoptræden"-skilt når en forhindring fra et andet minigame dukker op. */
  private callout(x: number, y: number, guest: string, line: string): void {
    const c = this.add.container(Phaser.Math.Clamp(x, 260, W - 300), Phaser.Math.Clamp(y, this.camS + 250, this.camS + H - 220)).setDepth(6500);
    const top = body(this, 0, -40, 'GÆSTEOPTRÆDEN', 24, { stroke: 6, color: C.cream });
    const name = label(this, 0, 6, guest, 44, { color: C.sun });
    const w = Math.max(top.width, name.width) + 60;
    const g = this.add.graphics();
    g.fillStyle(N.ink, 1).fillRoundedRect(-w / 2 - 5, -70, w + 10, 118, 30);
    g.fillStyle(N.grape, 1).fillRoundedRect(-w / 2, -75, w, 112, 26);
    g.fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 16, -70, w - 32, 22, 11);
    c.add([g, top, name]);
    c.setScale(0).setAngle(-4);
    this.tweens.add({ targets: c, scale: 1, duration: 360, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, angle: 4, duration: 500, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: c, alpha: 0, scale: 0.6, delay: 2600, duration: 300, onComplete: () => c.destroy() });
    this.sfx('select');
    this.sfx('pop', { delay: 0.08 });
    this.say(line);
  }

  // ---------------------------------------------------------------------------
  // Visuel opdatering hvert frame (også under intro og afslutning)

  update(time: number, delta: number): void {
    super.update(time, delta);
    const dt = Math.min(0.05 * this.speed, (delta / 1000) * this.speed);
    this.animate(dt);
  }

  private animate(dt: number): void {
    if (!this.segs.length) return;
    const slow = this.slowLeft > 0 ? 0.3 : 1;
    this.time0 += dt * slow;
    this.wobble = Math.max(0, this.wobble - dt * 0.35);
    this.updateCamera(dt);
    // Letterbox under slow-mo
    this.letterbox += ((this.slowLeft > 0 ? 1 : 0) - this.letterbox) * (1 - Math.exp(-9 * dt));
    this.bars[0]?.setY(-60 + 112 * this.letterbox);
    this.bars[1]?.setY(H + 60 - 112 * this.letterbox);
    const s = this.camS;
    const p = Phaser.Math.Clamp(s / S_MIN, 0, 1);

    // Himmel: dag → solnedgang → skumring → nat
    this.skies[1].setAlpha(smooth(0.18, 0.42, p));
    this.skies[2].setAlpha(smooth(0.42, 0.66, p));
    this.skies[3].setAlpha(smooth(0.64, 0.86, p));
    let covered = false;
    for (let i = this.skies.length - 1; i >= 0; i--) {
      this.skies[i].setVisible(!covered && this.skies[i].alpha > 0.01);
      if (this.skies[i].alpha >= 0.999) covered = true;
    }
    const night = smooth(0.5, 0.8, p);
    for (const star of this.stars) {
      const tw = star.getData('tw') as number;
      star.setAlpha(night * (star.getData('base') as number) * (0.6 + 0.4 * Math.sin(this.time0 * 3 + tw)));
    }
    this.sunImg.setY(240 + p * 1300).setAlpha(1 - smooth(0.5, 0.65, p));
    this.moonImg.setY(-200 + smooth(0.55, 0.95, p) * 420);
    if (night > 0.7 && this.rng() < dt * 0.25) this.shootingStar();

    // Tårnet vakler
    for (const seg of this.segs) {
      const base = seg.base;
      const top = base + seg.h;
      const s0 = this.sway(base);
      const s1 = this.sway(top);
      seg.img.setPosition(W / 2 + seg.off + s0, GROUND_Y - base);
      seg.img.setRotation(Math.atan2(s1 - s0, seg.h));
    }
    // Pokalen
    const holder = this.climbers.find((c) => c.p.slot === this.trophyHolder);
    const ty = this.sy(TOP_H);
    if (holder) {
      const hx = this.sx(holder.x, holder.h);
      this.trophy.setPosition(hx, this.sy(holder.h) - 138 + Math.sin(this.time0 * 6) * 8);
      this.trophy.setAngle(Math.sin(this.time0 * 5) * 10);
      this.trophyGlow.setPosition(hx, this.sy(holder.h) - 210);
      this.trophyRays.setPosition(hx, this.sy(holder.h) - 210);
    } else {
      const tx = this.sx(0, TOP_H);
      this.trophy.setPosition(tx, ty + 6);
      this.trophyGlow.setPosition(tx, ty - 140);
      this.trophyRays.setPosition(tx, ty - 140);
    }
    const sparkle = this.trophyGlow.getData('sparkle') as Phaser.GameObjects.Particles.ParticleEmitter | undefined;
    sparkle?.setPosition(this.trophyGlow.x, this.trophyGlow.y);

    // Forhindringer følger tårnet
    for (const b of this.balls) b.img.setPosition(this.sx(b.x, b.h), this.sy(b.h));
    for (const w of this.warnings) w.img.setPosition(this.sx(w.x, this.camTopH()), this.camS + 64);
    for (const pr of this.projs) pr.img.setPosition(this.sx(pr.x, pr.h), this.sy(pr.h));
    for (const pd of this.puddles) pd.img.setPosition(this.sx(pd.x, pd.h), this.sy(pd.h));
    for (const k of this.cushions) k.img.setPosition(this.sx(k.x, k.h), this.sy(k.h));
    for (const e of this.eels) {
      const seg = this.segAt(e.pivotH);
      const px = this.sx(seg.off + e.px, e.pivotH);
      const py = this.sy(e.pivotH);
      e.pin.setPosition(px, py);
      e.img.setPosition(px, py).setRotation(-e.theta);
    }
    for (const t of this.throwers) {
      const seg = this.segAt(t.h);
      t.x = seg.off + t.side * (seg.w / 2 + 70);
      const lx = this.sx(seg.off + t.side * (seg.w / 2 + 40), t.h);
      t.ledge.setPosition(lx, this.sy(t.h));
      t.img.setPosition(this.sx(t.x, t.h), this.sy(t.h) + (t.kind === 'chicken' ? 6 : 14));
    }

    // Spillere
    for (const c of this.climbers) {
      const x = this.sx(c.x, c.h);
      const y = this.sy(c.h);
      c.blok.setPosition(x, y);
      if (!this.tweens.isTweening(c.blok.rig) && c.stun <= 0) c.blok.angle = this.sway(c.h) * 0.05;
      this.updateMarker(c, dt);
    }
    for (const beam of this.beams) beam.setPosition(beam.x, this.camS - 40);
    for (const o of this.cull) {
      const y = o.y - o.scrollFactorY * s;
      const ext = (o instanceof Phaser.GameObjects.Image ? o.displayHeight : 420) + 160;
      o.setVisible(y > -ext && y < H + ext);
    }
  }

  private updateCamera(dt: number): void {
    if (this.flyover) return;
    const cam = this.cameras.main;
    const climbing = this.climbers.filter((c) => !c.arrived).sort((a, b) => b.h - a.h);
    let target: number;
    if (this.slowLeft > 0 || !climbing.length) {
      target = S_MIN;
    } else {
      const lead = climbing[0].h;
      const focus = climbing.length > 1 ? lead * 0.72 + climbing[1].h * 0.28 : lead;
      target = GROUND_Y - focus - 640;
      target = Math.min(target, GROUND_Y - lead - 230);
    }
    if (this.arrivals.length && climbing.length && this.slowLeft <= 0) {
      // Efter vinderen: følg de resterende, men vis toppen når de nærmer sig.
      target = Math.min(target, GROUND_Y - climbing[0].h - 230);
    }
    target = Phaser.Math.Clamp(target, S_MIN, 0);
    if (!this.playing && !this.arrivals.length && this.elapsed === 0) target = 0;
    const k = 1 - Math.exp(-(this.slowLeft > 0 ? 5 : 3.2) * dt);
    this.camS += (target - this.camS) * k;
    cam.setScroll(0, this.camS);
  }

  private updateMarker(c: Climber, dt: number): void {
    const target = METER.bottom - (Math.min(TOP_H, c.h) / TOP_H) * (METER.bottom - METER.top);
    c.meterY += (target - c.meterY) * (1 - Math.exp(-8 * dt));
    c.marker.setY(c.meterY);
    if (!c.markerHead) {
      const key = `${avatarKey(c.p.avatar)}-head`;
      if (this.textures.exists(key)) {
        const head = this.add.image(-4 * (c.marker.getData('side') as number), 0, key);
        head.setScale(38 / Math.max(head.width, head.height));
        c.marker.add(head);
        c.markerHead = head;
      }
    }
    // Pil i bunden når man er under skærmen
    const sy = this.sy(c.h) - this.camS;
    const below = !c.arrived && sy > H + 10;
    c.arrow.setVisible(below);
    if (below) {
      const x = 480 + c.p.slot * 300;
      c.arrow.setPosition(x, H - 90 + Math.sin(this.time0 * 8 + c.p.slot) * 6);
      c.arrowText.setText(`${c.p.name} ${Math.round((c.h / TOP_H) * 100)} m`);
    }
  }

  private shootingStar(): void {
    const x = 200 + this.rng() * (W - 400);
    const y = 60 + this.rng() * 300;
    const star = this.add.image(x, y, TEX.spark).setScrollFactor(0).setDepth(-9985).setScale(0.6);
    this.tweens.add({ targets: star, x: x - 400, y: y + 200, alpha: 0, scale: 0.1, duration: 800, onComplete: () => star.destroy() });
  }

  // ---------------------------------------------------------------------------
  // Bots: klatr op, hop når der er fri bane, undvig ting der falder, søg pruttepuder,
  // og vent ved ålen hvis den er på vej.

  protected botInput(slot: number): BotInput | null {
    const c = this.climbers.find((k) => k.p.slot === slot);
    if (!c || c.arrived || c.stun > 0) return { x: 0, y: 0, a: false };
    const me = c.h + BODY;
    let x = Math.sin(this.elapsed * 1.3 + slot * 2) * 0.25;
    let y = -(0.8 + c.skill * 0.2);
    let danger = false;
    const [lo, hi] = this.bounds(c.h);
    const away = (fromX: number) => {
      const dir = c.x >= fromX ? 1 : -1;
      if (c.x + dir * 120 > hi) return -1;
      if (c.x + dir * 120 < lo) return 1;
      return dir;
    };
    const notices = (id: number) => ((id * 37 + slot * 61) % 100) / 100 < c.skill;

    for (const b of this.balls) {
      const dh = b.h - me;
      if (dh > -40 && dh < 560 && Math.abs(b.x - c.x) < 130 && notices(b.id)) {
        x = away(b.x);
        danger = true;
      }
    }
    for (const w of this.warnings) {
      if (Math.abs(w.x - c.x) < 130 && this.camTopH() - me < 900 && notices(Math.round(w.x))) {
        x = away(w.x);
        danger = true;
      }
    }
    for (const p of this.projs) {
      const dh = p.h - me;
      if (dh > -80 && dh < 700 && notices(p.id)) {
        // Hvor lander den ca. i min højde?
        const t = Math.max(0, Math.min(1.2, Math.abs(dh) / 700));
        const px = p.x + p.vx * t;
        if (Math.abs(px - c.x) < 120) {
          x = away(px);
          danger = true;
        }
      }
    }
    for (const pd of this.puddles) {
      if (pd.img.getData('harmless')) continue;
      const dh = pd.h - c.h;
      if (dh > -20 && dh < 280 && Math.abs(pd.x - c.x) < 100) {
        x = away(pd.x);
        danger = true;
      }
    }
    for (const e of this.eels) {
      // Ålen dækker kun den ene side af tårnet – hold dig til den anden side forbi den.
      const reach = e.pivotH - e.len - 60;
      if (me > reach - 320 && me < e.pivotH + 20) {
        const seg = this.segAt(e.pivotH);
        const safeX = Phaser.Math.Clamp(seg.off - Math.sign(e.px) * 250, lo + 10, hi - 10);
        const off = safeX - c.x;
        if (Math.abs(off) > 40 && notices(Math.round(e.pivotH))) {
          x = Phaser.Math.Clamp(off / 70, -1, 1);
          if (Math.abs(off) > 160 && me > reach - 60 && me < reach + 40) y = 0;
          danger = true;
        }
      }
    }
    if (!danger) {
      const near = this.cushions
        .filter((k) => k.cd <= 0 && k.h - c.h > 20 && k.h - c.h < 480 && Math.abs(k.x - c.x) < 320)
        .sort((a, b) => a.h - b.h)[0];
      if (near) x = Phaser.Math.Clamp((near.x - c.x) / 60, -1, 1);
    }
    let a = false;
    if (c.boostCd <= 0 && !danger && this.rng() < 0.35 + c.skill * 0.6) {
      c.botA = !c.botA;
      a = c.botA;
    } else {
      c.botA = false;
    }
    return { x: Phaser.Math.Clamp(x, -1, 1), y, a };
  }
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
