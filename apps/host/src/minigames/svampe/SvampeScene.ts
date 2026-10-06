import Phaser from 'phaser';
import { hexToNumber } from '@samigame/shared';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, N, W } from '../../kit/theme';
import { title } from '../../kit/ui';
import type { MusicTheme } from '../../kit/audio';
import type { BotInput } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  SHROOM_COLORS,
  SHROOM_TEX,
  SOUP,
  bubbleSvg,
  flameSvg,
  glowSvg,
  hillsSvg,
  nightCloudSvg,
  rimSvg,
  rippleSvg,
  shroomIconSvg,
  shroomSvg,
  signSvg,
  skySvg,
  sploshSvg,
  soupSvg,
  spoonSvg,
  steamSvg,
  treeSvg,
  wadeSvg,
} from './art';

type Phase = 'intro' | 'free' | 'call' | 'sink' | 'boil' | 'rise' | 'over';

/** Hattens "stå-ellipse" (lidt mindre end tegningen, så man ikke svæver på kanten). */
const CAP_RX = 138;
const CAP_RY = 56;
const WALK_SPEED = 430;
const WADE_SPEED = 170;
const HOP_TIME = 0.42;
const HOP_SPEED = 640;
const HOP_COOLDOWN = 0.2;
const SINK_DEPTH = 150;
const MAX_ROUNDS = 14;
const MIN_SHROOMS = 4;

/** Startpositioner for svampene (hattens midte). */
const HOMES = [
  [600, 430],
  [960, 430],
  [1320, 430],
  [400, 600],
  [770, 600],
  [1150, 600],
  [1520, 600],
  [600, 770],
  [960, 770],
  [1320, 770],
];
/** Pladser på grydens forkant til dem, der er røget i suppen. */
const BENCH_X = [560, 820, 1100, 1360];
const BENCH_Y = 1032;

interface Shroom {
  color: number;
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  /** 0 = oppe, 1 = helt nede. */
  sink: number;
  sinking: boolean;
  gone: boolean;
  img: Phaser.GameObjects.Image;
  ripple: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  scared: boolean;
}

interface Diver {
  slot: number;
  blok: Blok;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hop: number;
  hopCd: number;
  hopDx: number;
  hopDy: number;
  out: boolean;
  on: Shroom | null;
  wade: Phaser.GameObjects.Image;
  sinkY: number;
}

interface BotBrain {
  target: { x: number; y: number } | null;
  shroom: Shroom | null;
  thinkAt: number;
  confused: boolean;
  hopWant: boolean;
}

/**
 * SVAMPE-ROULETTE (alle mod alle, inspireret af Mushroom Mix-Up).
 * Levende svampe flyder i en kæmpe gryde svampesuppe. Skiltet viser en farve – efter nedtællingen
 * dykker alle andre svampe, og suppen koger. Står du ikke på den rigtige farve, ryger du i suppen!
 */
export class SvampeScene extends MinigameScene {
  protected duration: number | null = null;
  protected music: MusicTheme = 'game';

  private shrooms: Shroom[] = [];
  private divers: Diver[] = [];
  private brains: BotBrain[] = [];
  private outGroups: number[][] = [];
  private outRound = -1;
  private phase: Phase = 'intro';
  private phaseTime = 0;
  private phaseDur = 0;
  private round = 0;
  private called = 0;
  private lastTick = 0;

  private sign!: Phaser.GameObjects.Container;
  private signText!: Phaser.GameObjects.Text;
  private signIcon!: Phaser.GameObjects.Image;
  private countText!: Phaser.GameObjects.Text;
  private countRing!: Phaser.GameObjects.Graphics;
  private roundText!: Phaser.GameObjects.Text;
  private boilGlow!: Phaser.GameObjects.Image;
  private bubbles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private steam!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('svampe');
  }

  preload(): void {
    loadSvg(this, 'svp-sky', skySvg(), 1920, 1080);
    loadSvg(this, 'svp-hills', hillsSvg(), 1920, 520);
    loadSvg(this, 'svp-tree', treeSvg(), 560, 1080);
    loadSvg(this, 'svp-cloud', nightCloudSvg(), 360, 150);
    loadSvg(this, 'svp-glow-fire', glowSvg('#ff8a2b'), 200, 200);
    loadSvg(this, 'svp-glow-fly', glowSvg('#d8ff7a'), 200, 200);
    loadSvg(this, 'svp-glow-boil', glowSvg('#ff5a2b'), 200, 200);
    loadSvg(this, 'svp-flame', flameSvg(), 140, 210);
    loadSvg(this, 'svp-soup', soupSvg(), 1720, 700);
    loadSvg(this, 'svp-rim', rimSvg(), 1880, 860);
    loadSvg(this, 'svp-spoon', spoonSvg(), 200, 560);
    for (const c of SHROOM_COLORS) {
      loadSvg(this, `svp-${c.id}-happy`, shroomSvg(c.hex, 'happy'), SHROOM_TEX.w, SHROOM_TEX.h);
      loadSvg(this, `svp-${c.id}-scared`, shroomSvg(c.hex, 'scared'), SHROOM_TEX.w, SHROOM_TEX.h);
      loadSvg(this, `svp-${c.id}-icon`, shroomIconSvg(c.hex), 160, 130);
    }
    loadSvg(this, 'svp-sign', signSvg(), 760, 220);
    loadSvg(this, 'svp-bubble', bubbleSvg(), 64, 64);
    loadSvg(this, 'svp-wade', wadeSvg(), 200, 90);
    loadSvg(this, 'svp-ripple', rippleSvg(), 220, 90);
    loadSvg(this, 'svp-splosh', sploshSvg(), 180, 140);
    loadSvg(this, 'svp-steam', steamSvg(), 100, 100);
  }

  protected setup(): void {
    this.shrooms = [];
    this.divers = [];
    this.outGroups = [];
    this.outRound = -1;
    this.phase = 'intro';
    this.round = 0;

    this.buildWorld();
    this.buildShrooms();
    this.buildHud();

    const starts = [3, 4, 5, 6];
    for (const p of this.players) {
      const s = this.shrooms[starts[p.slot % 4]];
      const blok = this.spawnBlok(p, s.x, s.y, { size: 0.6 });
      const wade = this.add.image(s.x, s.y, 'svp-wade').setScale(0.75).setVisible(false);
      this.divers.push({ slot: p.slot, blok, x: s.x, y: s.y, vx: 0, vy: 0, hop: 0, hopCd: 0, hopDx: 0, hopDy: 0, out: false, on: s, wade, sinkY: 0 });
      this.brains[p.slot] = { target: null, shroom: null, thinkAt: 0, confused: false, hopWant: false };
    }
    this.layoutDivers(0);
  }

  protected onStart(): void {
    this.say('Stå på den rigtige svamp!');
    this.startFree();
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    this.add.image(W / 2, 540, 'svp-sky').setDepth(-10000);
    for (let i = 0; i < 3; i++) {
      const cl = this.add.image(200 + i * 700, 90 + i * 60, 'svp-cloud').setDepth(-9800).setScale(0.8 + i * 0.2).setAlpha(0.9);
      this.tweens.add({ targets: cl, x: cl.x + 260, duration: 16000 + i * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.image(W / 2, 260, 'svp-hills').setOrigin(0.5, 0).setDepth(-9700);
    // Store træer i siderne, der svajer langsomt
    for (const [x, flip, s] of [
      [120, false, 1],
      [1800, true, 1],
    ] as [number, boolean, number][]) {
      const t = this.add.image(x, 1100, 'svp-tree').setOrigin(0.5, 1).setFlipX(flip).setScale(s).setDepth(-9500 + (s < 1 ? -10 : 0));
      if (s < 1) t.setTint(0x8a80c8);
      this.tweens.add({ targets: t, angle: { from: -1.2, to: 1.2 }, duration: 3000 + x, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Ildskær og flammer under gryden
    const fire = this.add.image(W / 2, 1080, 'svp-glow-fire').setDisplaySize(2200, 520).setDepth(-9000).setAlpha(0.65);
    this.tweens.add({ targets: fire, alpha: 0.45, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const [x, s] of [
      [70, 1.1],
      [190, 0.8],
      [1730, 0.8],
      [1850, 1.1],
      [300, 0.6],
      [1620, 0.6],
    ]) {
      const f = this.add.image(x, 1100, 'svp-flame').setOrigin(0.5, 1).setScale(s).setDepth(-8900);
      this.tweens.add({ targets: f, scaleY: { from: s * 0.75, to: s * 1.1 }, scaleX: { from: s, to: s * 0.82 }, duration: 150 + x / 20, yoyo: true, repeat: -1 });
    }
    // Ildfluer
    for (let i = 0; i < 14; i++) {
      const fx = Phaser.Math.Between(40, W - 40);
      const fy = Phaser.Math.Between(120, 420);
      const glow = this.add.image(fx, fy, 'svp-glow-fly').setScale(0.22).setDepth(-9400);
      this.tweens.add({ targets: glow, x: fx + Phaser.Math.Between(-120, 120), y: fy + Phaser.Math.Between(-60, 60), duration: Phaser.Math.Between(2500, 5000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: glow, alpha: { from: 1, to: 0.2 }, duration: Phaser.Math.Between(400, 900), yoyo: true, repeat: -1 });
    }

    // Gryden
    this.add.image(SOUP.cx, SOUP.cy + 390 - 390, 'svp-rim').setOrigin(0.5, 390 / 860).setDepth(-2000);
    this.add.image(SOUP.cx, SOUP.cy, 'svp-soup').setDepth(-1900);
    this.boilGlow = this.add.image(SOUP.cx, SOUP.cy, 'svp-glow-boil').setDisplaySize(SOUP.rx * 2.1, SOUP.ry * 2.1).setDepth(-1890).setAlpha(0);
    const spoon = this.add.image(1500, 420, 'svp-spoon').setOrigin(0.5, 0.86).setAngle(28).setDepth(-1500);
    this.tweens.add({ targets: spoon, angle: { from: 24, to: 32 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.bubbles = this.add.particles(0, 0, 'svp-bubble', {
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(SOUP.cx, SOUP.cy, SOUP.rx * 1.85, SOUP.ry * 1.85) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      scale: { start: 0.15, end: 0.7 },
      alpha: { start: 1, end: 0.6 },
      lifespan: 900,
      frequency: 140,
    });
    this.bubbles.setDepth(-1850);
    this.steam = this.add.particles(0, 0, 'svp-steam', {
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(SOUP.cx, SOUP.cy, SOUP.rx * 1.7, SOUP.ry * 1.5) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      speedY: { min: -110, max: -50 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.6, end: 2 },
      alpha: { start: 0.22, end: 0 },
      lifespan: 2000,
      frequency: 320,
    });
    this.steam.setDepth(6000);
  }

  private buildShrooms(): void {
    const colors = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
    // Bland farverne, men undgå at samme farve står lige ved siden af hinanden
    for (let tries = 0; tries < 50; tries++) {
      for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
      }
      const ok = HOMES.every(([x, y], i) => HOMES.every(([x2, y2], j) => i === j || colors[i] !== colors[j] || Math.hypot(x - x2, (y - y2) * 2) > 520));
      if (ok) break;
    }
    HOMES.forEach(([hx, hy], i) => {
      const color = colors[i];
      const ripple = this.add.image(hx, hy + SHROOM_TEX.water - SHROOM_TEX.capY, 'svp-ripple').setDepth(-1800).setAlpha(0.35).setScale(0.8);
      const img = this.add.image(hx, hy, `svp-${SHROOM_COLORS[color].id}-happy`).setOrigin(0.5, SHROOM_TEX.capY / SHROOM_TEX.h);
      this.tweens.add({ targets: ripple, scaleX: { from: 0.75, to: 1.05 }, scaleY: { from: 0.75, to: 1.1 }, alpha: { from: 0.4, to: 0.05 }, duration: 1300, repeat: -1, delay: i * 130 });
      const glow = this.add.image(hx, hy + 20, 'svp-glow-fly').setTint(hexToNumber(SHROOM_COLORS[color].hex)).setDisplaySize(620, 280).setDepth(-1795).setAlpha(0);
      this.shrooms.push({ color, hx, hy, x: hx, y: hy, vx: 0, vy: 0, phase: this.rng() * Math.PI * 2, sink: 0, sinking: false, gone: false, img, ripple, glow, scared: false });
    });
  }

  private buildHud(): void {
    const board = this.add.image(0, 0, 'svp-sign').setOrigin(0.5, 0);
    this.signIcon = this.add.image(-250, 128, 'svp-rod-icon').setScale(0.9).setVisible(false);
    this.signText = title(this, 30, 126, '', 92, { color: C.cream });
    this.countRing = this.add.graphics();
    this.countText = title(this, 290, 126, '', 70, { color: C.cream });
    this.sign = this.add.container(W / 2, -6, [board, this.signIcon, this.signText, this.countRing, this.countText]).setDepth(7000);
    this.tweens.add({ targets: this.sign, angle: { from: -1.5, to: 1.5 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.roundText = title(this, 140, 60, 'RUNDE 1', 44, { color: C.sun }).setDepth(7000);
    this.setSign(null);
  }

  // ---------------------------------------------------------------------------
  // Runder

  private get alive(): Diver[] {
    return this.divers.filter((d) => !d.out);
  }

  private get tempo(): number {
    return Math.min(1, Math.max(0, (this.round - 1) / 6));
  }

  private setPhase(p: Phase, dur: number): void {
    this.phase = p;
    this.phaseTime = 0;
    this.phaseDur = dur;
  }

  private startFree(): void {
    this.round++;
    if (this.round > MAX_ROUNDS) {
      this.end();
      return;
    }
    const t = this.tempo;
    this.setPhase('free', this.round === 1 ? 1.4 : 1.2 - 0.6 * t);
    this.roundText.setText(`RUNDE ${this.round}`);
    this.tweens.add({ targets: this.roundText, scale: { from: 1.4, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    this.setSign(null);
    for (const s of this.shrooms) this.setScared(s, false);
    for (const d of this.alive) if (this.isBotNow(d.slot)) this.botWander(d);
  }

  private startCall(): void {
    const t = this.tempo;
    const present = [...new Set(this.shrooms.filter((s) => !s.gone).map((s) => s.color))];
    // Vælg gerne en farve der er langt fra flest spillere (så det bliver spændende)
    const scored = present.map((c) => {
      const best = this.alive.reduce((sum, d) => sum + Math.min(...this.shrooms.filter((s) => !s.gone && s.color === c).map((s) => Math.hypot(s.x - d.x, (s.y - d.y) * 2))), 0);
      return { c, score: best + this.rng() * 600 };
    });
    scored.sort((a, b) => b.score - a.score);
    this.called = (this.rng() < 0.35 ? scored[0] : scored[Math.floor(this.rng() * scored.length)]).c;
    this.setPhase('call', this.round === 1 ? 3 : 2.6 - 1.3 * t);
    this.lastTick = Math.ceil(this.phaseDur);
    const col = SHROOM_COLORS[this.called];
    this.setSign(this.called);
    this.say(`${col.name.toLowerCase()}!`, true);
    this.sfx('ding', { pitch: 0.8 + this.called * 0.1 });
    this.sfx('select');
    for (const s of this.shrooms) {
      if (s.gone) continue;
      if (s.color === this.called) {
        this.tweens.add({ targets: s.img, scaleY: { from: 0.85, to: 1 }, scaleX: { from: 1.12, to: 1 }, duration: 380, ease: 'Back.easeOut' });
        this.tweens.add({ targets: s.glow, alpha: { from: 1, to: 0.6 }, duration: 300, yoyo: true, repeat: -1 });
      } else {
        this.setScared(s, true);
      }
    }
    for (const d of this.alive) if (this.isBotNow(d.slot)) this.botThink(d, true);
  }

  private startSink(): void {
    this.setPhase('sink', 0.45);
    this.sfx('whoosh');
    this.sfx('splash', { volume: 0.7 });
    for (const s of this.shrooms) {
      if (s.gone || s.color === this.called) continue;
      s.sinking = true;
      this.fx.burst(s.x, s.y + 80, { texture: 'svp-bubble', count: 8, speed: 260, gravity: 500, scale: 0.6, lifespan: 600, depth: s.y + 200 });
    }
    this.countText.setText('');
  }

  private startBoil(): void {
    this.setPhase('boil', 0.9);
    this.sfx('rumble');
    this.sfx('sizzle', { volume: 0.8 });
    this.fx.shake(0.006, 400);
    this.tweens.add({ targets: this.boilGlow, alpha: { from: 0, to: 0.55 }, duration: 160, yoyo: true, hold: 500 });
    this.bubbles.setFrequency(25);
    if (this.round === 1) this.fx.floatText(SOUP.cx, SOUP.cy - 40, 'SUPPEN KOGER!', C.tangerine, 64);
  }

  private startRise(): void {
    this.setPhase('rise', 0.5);
    for (const s of this.shrooms) {
      this.tweens.killTweensOf(s.glow);
      s.glow.setAlpha(0);
    }
    this.bubbles.setFrequency(140);
    // Fra runde 2 forsvinder en svamp for altid (indtil der er MIN_SHROOMS tilbage)
    const live = this.shrooms.filter((s) => !s.gone);
    if (this.round >= 2 && live.length > MIN_SHROOMS) {
      const sunk = live.filter((s) => s.sinking);
      const pickFrom = sunk.length ? sunk : live.filter((s) => !this.divers.some((d) => d.on === s));
      const victim = pickFrom[Math.floor(this.rng() * pickFrom.length)];
      if (victim) {
        victim.gone = true;
        victim.sinking = true;
        this.fx.floatText(victim.x, victim.y + 40, 'Farvel!', C.cream, 34);
        this.tweens.killTweensOf(victim.ripple);
        this.tweens.add({ targets: [victim.ripple, victim.glow], alpha: 0, duration: 600 });
      }
    }
    for (const s of this.shrooms) {
      if (s.sinking && !s.gone) {
        s.sinking = false;
        this.setScared(s, false);
      }
    }
    this.sfx('pop', { pitch: 0.8 });
  }

  protected play(dt: number): void {
    this.phaseTime += dt;
    this.updateShrooms(dt);
    this.updateDivers(dt);
    this.layoutDivers(dt);

    switch (this.phase) {
      case 'free':
        if (this.phaseTime >= this.phaseDur) this.startCall();
        break;
      case 'call': {
        const left = this.phaseDur - this.phaseTime;
        this.drawCount(left / this.phaseDur);
        const sec = Math.ceil(left);
        if (sec !== this.lastTick && sec > 0) {
          this.lastTick = sec;
          this.sfx('tick', { pitch: 1 + (3 - sec) * 0.15 });
        }
        this.countText.setText(sec > 0 ? String(sec) : '');
        // De forkerte svampe ryster af skræk
        const shake = Math.min(1, this.phaseTime / this.phaseDur);
        for (const s of this.shrooms) if (!s.gone && s.color !== this.called) s.img.x = s.x + Math.sin(this.elapsed * 60 + s.phase) * 5 * shake;
        if (left <= 0) this.startSink();
        break;
      }
      case 'sink':
        if (this.phaseTime >= this.phaseDur) this.startBoil();
        break;
      case 'boil':
        this.checkFalls();
        if (this.phaseTime >= this.phaseDur) {
          if (this.alive.length <= 1) this.end();
          else this.startRise();
        }
        break;
      case 'rise':
        if (this.phaseTime >= this.phaseDur) this.startFree();
        break;
      default:
        break;
    }
  }

  private end(): void {
    if (this.phase === 'over') return;
    this.phase = 'over';
    const survivors = this.alive;
    for (const d of survivors) d.blok.cheer();
    if (survivors.length === 1) {
      this.fx.confetti(1800);
      this.sfx('cheer');
      this.say('Svampekongen er fundet!');
    }
    // Hvis alle røg i samtidig, deler den sidste gruppe førstepladsen
    const groups = [...this.outGroups].reverse();
    const ranking = survivors.length ? [survivors.map((d) => d.slot), ...groups] : groups;
    this.finish(ranking.filter((g) => g.length));
  }

  // ---------------------------------------------------------------------------
  // Svampe

  private updateShrooms(dt: number): void {
    const t = this.elapsed;
    const target = this.phase === 'sink' || this.phase === 'boil' ? 1 : 0;
    for (const s of this.shrooms) {
      const px = s.x;
      const py = s.y;
      // Langsom drift i suppen
      s.x = s.hx + Math.sin(t * 0.55 + s.phase) * 34;
      s.y = s.hy + Math.cos(t * 0.45 + s.phase * 1.3) * 12;
      s.vx = (s.x - px) / Math.max(dt, 1e-4);
      s.vy = (s.y - py) / Math.max(dt, 1e-4);
      const want = s.gone ? 1 : s.sinking ? target : 0;
      const prev = s.sink;
      s.sink = Phaser.Math.Clamp(s.sink + Math.sign(want - s.sink) * dt * (want > s.sink ? 2.6 : 2.2), 0, 1);
      if (prev < 1 && s.sink >= 1 && s.sinking) {
        this.fx.burst(s.x, s.y + 100, { texture: 'svp-bubble', count: 6, speed: 200, gravity: 400, scale: 0.5, lifespan: 500, depth: s.y + 200 });
      }
      if (prev > 0 && s.sink <= 0) {
        this.fx.burst(s.x, s.y + 100, { texture: TEX.drop, color: 0xf2d9a2, count: 10, speed: 380, gravity: 1200, scale: 0.6, lifespan: 600, depth: s.y + 200 });
        this.tweens.add({ targets: s.img, scaleX: { from: 1.15, to: 1 }, scaleY: { from: 0.85, to: 1 }, duration: 300, ease: 'Back.easeOut' });
      }
      this.drawShroom(s);
    }
  }

  private drawShroom(s: Shroom): void {
    const depth = s.sink * SINK_DEPTH;
    const bob = Math.sin(this.elapsed * 2.4 + s.phase) * 3;
    s.img.x = s.x;
    s.img.y = s.y + depth + bob;
    // Beskær den del der er under suppen (vandlinjen bliver hvor den var)
    const visible = SHROOM_TEX.water - depth;
    if (visible <= 4) s.img.setVisible(false);
    else s.img.setVisible(true).setCrop(0, 0, SHROOM_TEX.w, visible);
    s.img.setDepth(s.y - 90);
    s.ripple.setPosition(s.x, s.y + SHROOM_TEX.water - SHROOM_TEX.capY + bob);
    s.glow.setPosition(s.x, s.y + 30);
  }

  private setScared(s: Shroom, scared: boolean): void {
    if (s.scared === scared) return;
    s.scared = scared;
    s.img.setTexture(`svp-${SHROOM_COLORS[s.color].id}-${scared ? 'scared' : 'happy'}`);
  }

  /** Den svamp (oppe) en position står på. */
  private shroomAt(x: number, y: number, safeOnly = false): Shroom | null {
    for (const s of this.shrooms) {
      if (s.gone || s.sink > 0.35) continue;
      if (safeOnly && s.sinking) continue;
      const nx = (x - s.x) / CAP_RX;
      const ny = (y - s.y) / CAP_RY;
      if (nx * nx + ny * ny <= 1) return s;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Spillere

  private updateDivers(dt: number): void {
    for (const d of this.divers) {
      if (d.out) continue;
      const pad = this.pad(d.slot);
      d.hopCd = Math.max(0, d.hopCd - dt);
      if (d.hop > 0) {
        d.hop -= dt;
        d.x += d.hopDx * HOP_SPEED * dt;
        d.y += d.hopDy * HOP_SPEED * 0.55 * dt;
        if (d.hop <= 0) this.land(d);
      } else {
        const on = this.shroomAt(d.x, d.y);
        d.on = on;
        const speed = on ? WALK_SPEED : WADE_SPEED;
        const len = Math.hypot(pad.x, pad.y);
        const ix = len > 1 ? pad.x / len : pad.x;
        const iy = len > 1 ? pad.y / len : pad.y;
        d.vx = Phaser.Math.Linear(d.vx, ix * speed, Math.min(1, dt * 12));
        d.vy = Phaser.Math.Linear(d.vy, iy * speed * 0.6, Math.min(1, dt * 12));
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        // Svampen bærer en med rundt
        if (on) {
          d.x += on.vx * dt;
          d.y += on.vy * dt;
        }
        if (this.pressedA(d.slot) && d.hopCd <= 0) this.startHop(d, ix, iy);
      }
      // Hold dig i gryden
      const nx = (d.x - SOUP.cx) / (SOUP.rx - 60);
      const ny = (d.y - SOUP.cy) / (SOUP.ry - 40);
      const r = Math.hypot(nx, ny);
      if (r > 1) {
        d.x = SOUP.cx + (nx / r) * (SOUP.rx - 60);
        d.y = SOUP.cy + (ny / r) * (SOUP.ry - 40);
      }
    }
    // Skub hinanden
    const live = this.alive;
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        if (a.hop > 0 || b.hop > 0) continue;
        const dx = b.x - a.x || (a.slot < b.slot ? 0.5 : -0.5);
        const dy = (b.y - a.y) * 2;
        const dist = Math.hypot(dx, dy) || 0.01;
        const min = 56 * this.chaos.size;
        if (dist >= min) continue;
        // Skub mest til siden – hatten er bred, men ikke dyb
        const push = (min - dist) / 2;
        a.x -= (dx / dist) * push;
        a.y -= ((dy / dist) * push) / 6;
        b.x += (dx / dist) * push;
        b.y += ((dy / dist) * push) / 6;
      }
    }
  }

  private startHop(d: Diver, ix: number, iy: number): void {
    let dx = ix;
    let dy = iy;
    let len = Math.hypot(dx, dy);
    if (len < 0.2) {
      dx = d.blok.facing;
      dy = 0;
      len = 1;
    }
    d.hopDx = dx / len;
    d.hopDy = dy / len;
    d.hop = HOP_TIME / Math.sqrt(Math.max(0.3, this.chaos.gravity));
    d.hopCd = d.hop + HOP_COOLDOWN;
    d.blok.squash(0.8, 1.2);
    this.sfx('jump', { pan: this.panFor(d.x), pitch: 0.9 + d.slot * 0.08 });
    this.stat(d.slot, 'jumps');
    if (!d.on) this.fx.burst(d.x, d.y, { texture: TEX.drop, color: 0xf2d9a2, count: 8, speed: 260, gravity: 900, scale: 0.5, lifespan: 450, depth: d.y + 1 });
    else this.fx.dust(d.x, d.y, 5);
  }

  private land(d: Diver): void {
    d.hop = 0;
    d.on = this.shroomAt(d.x, d.y);
    d.blok.squash(1.25, 0.8);
    if (d.on) {
      this.sfx('boing', { volume: 0.5, pan: this.panFor(d.x), pitch: 1.2 });
      this.tweens.add({ targets: d.on.img, scaleY: { from: 0.9, to: 1 }, scaleX: { from: 1.06, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    } else {
      this.sfx('splash', { volume: 0.35, pan: this.panFor(d.x), pitch: 1.4 });
      this.fx.burst(d.x, d.y + 20, { texture: TEX.drop, color: 0xf2d9a2, count: 10, speed: 300, gravity: 1000, scale: 0.5, lifespan: 500, depth: d.y + 1 });
    }
  }

  private layoutDivers(dt: number): void {
    for (const d of this.divers) {
      if (d.out) continue;
      const wading = d.hop <= 0 && !d.on;
      // Står man på en svamp der synker, synker man med
      d.sinkY = d.on && d.hop <= 0 ? d.on.sink * SINK_DEPTH : 0;
      const wadeOffset = wading ? 26 : 0;
      d.blok.setPosition(d.x, d.y + d.sinkY + wadeOffset);
      d.blok.setDepth(d.y + 2);
      if (d.hop > 0) {
        const total = HOP_TIME / Math.sqrt(Math.max(0.3, this.chaos.gravity));
        const k = 1 - d.hop / total;
        d.blok.rig.y = -Math.sin(k * Math.PI) * 90 * d.blok.size;
      }
      d.blok.walk(d.hop > 0 ? 0 : d.vx / WALK_SPEED, d.hop > 0 ? 0 : d.vy / WALK_SPEED, dt * 1000 * (wading ? 0.8 : 1.4));
      d.wade.setVisible(wading).setPosition(d.x, d.y + 22).setDepth(d.y + 3);
      if (wading) d.wade.setScale(0.75 + Math.sin(this.elapsed * 8 + d.slot) * 0.04, 0.75);
    }
  }

  /** Mens suppen koger: alle der ikke står på en sikker svamp, ryger i. */
  private checkFalls(): void {
    const fell: Diver[] = [];
    for (const d of this.alive) {
      if (d.hop > 0) continue;
      const safe = this.shroomAt(d.x, d.y, true);
      if (!safe) fell.push(d);
    }
    if (!fell.length) return;
    // Alle der falder i samme runde deler placering
    if (this.outRound !== this.round) {
      this.outRound = this.round;
      this.outGroups.push([]);
    }
    const group = this.outGroups[this.outGroups.length - 1];
    for (const d of fell) {
      d.out = true;
      group.push(d.slot);
      this.plop(d);
    }
    if (this.alive.length > 1) this.say(fell.length > 1 ? 'Plask! Og plask!' : 'Plask! Ned i suppen!');
  }

  private plop(d: Diver): void {
    const b = d.blok;
    this.stat(d.slot, 'falls');
    this.vibrate(d.slot, 300);
    this.sfx('splash', { pan: this.panFor(d.x) });
    this.sfx('scream', { pan: this.panFor(d.x), pitch: 0.9 + this.rng() * 0.3 });
    this.fx.burst(d.x, d.y + 20, { texture: TEX.drop, color: [0xf2d9a2, 0xd9a964, 0xffffff], count: 26, speed: 700, gravity: 1500, scale: 0.8, depth: d.y + 50 });
    this.fx.shake(0.008, 200);
    this.fx.floatText(d.x, d.y - 180, 'PLASK!', C.tangerine, 64);
    d.wade.setVisible(false);
    const ring = this.add.image(d.x, d.y + 20, 'svp-ripple').setDepth(d.y - 1).setScale(0.4);
    this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 800, onComplete: () => ring.destroy() });
    b.spinOut(1, 400);
    this.tweens.add({
      targets: b,
      y: b.y + 90,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Dukker op igen på grydekanten som tilskuer – med suppe i håret
        const seat = this.outGroups.flat().indexOf(d.slot);
        const bx = BENCH_X[seat % BENCH_X.length];
        b.setPosition(bx, BENCH_Y + 60).setAlpha(1).setDepth(8000 + seat);
        b.rig.y = 0;
        const splosh = this.add.image(0, -150 * b.size, 'svp-splosh').setScale(0.7 * b.size);
        b.add(splosh);
        this.tweens.add({ targets: b, y: BENCH_Y, duration: 420, ease: 'Back.easeOut' });
        b.sad();
        this.sfx('pop', { pan: this.panFor(bx) });
      },
    });
  }

  private setSign(color: number | null): void {
    if (color === null) {
      this.signIcon.setVisible(false);
      this.signText.setText('Hvilken farve…?').setColor(C.cream).setFontSize(64).setX(0);
      this.countText.setText('');
      this.countRing.clear();
      return;
    }
    const col = SHROOM_COLORS[color];
    this.signIcon.setTexture(`svp-${col.id}-icon`).setVisible(true);
    this.signText.setText(`${col.name}!`).setColor(col.hex).setFontSize(96).setX(-10);
    this.tweens.add({ targets: this.sign, scale: { from: 1.25, to: 1 }, duration: 380, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.signIcon, angle: { from: -20, to: 0 }, scale: { from: 1.4, to: 0.9 }, duration: 420, ease: 'Back.easeOut' });
    this.fx.flash(hexToNumber(col.hex), 120, 0.18);
  }

  private drawCount(frac: number): void {
    const g = this.countRing;
    g.clear();
    g.fillStyle(N.ink, 0.9).fillCircle(290, 128, 52);
    g.lineStyle(10, frac < 0.34 ? N.tomato : N.sun, 1);
    g.beginPath();
    g.arc(290, 128, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, frac), false);
    g.strokePath();
  }

  // ---------------------------------------------------------------------------
  // Bots

  private skill(slot: number): number {
    return [0.9, 0.8, 0.86, 0.74][slot % 4];
  }

  private botWander(d: Diver): void {
    const brain = this.brains[d.slot];
    const live = this.shrooms.filter((s) => !s.gone);
    const s = live[Math.floor(this.rng() * live.length)];
    brain.shroom = s;
    brain.target = null;
    brain.thinkAt = this.elapsed + this.rng() * 0.6;
    brain.confused = false;
  }

  private botThink(d: Diver, fresh: boolean): void {
    const brain = this.brains[d.slot];
    const t = this.tempo;
    const sk = this.skill(d.slot);
    const live = this.shrooms.filter((s) => !s.gone);
    const right = live.filter((s) => s.color === this.called);
    const dist = (s: Shroom) => Math.hypot(s.x - d.x, (s.y - d.y) * 1.6);
    if (fresh) {
      brain.confused = this.rng() < 0.07 + t * 0.14 + (1 - sk) * 0.2;
      brain.thinkAt = this.elapsed + 0.2 + this.rng() * 0.35 + (1 - sk) * 0.5;
    }
    const pool = brain.confused ? live : right;
    // Undgå de svampe, som andre bots allerede er på vej til
    const crowd = (s: Shroom) => this.alive.filter((o) => o.slot !== d.slot && this.brains[o.slot]?.shroom === s).length * 260;
    pool.sort((a, b) => dist(a) + crowd(a) - (dist(b) + crowd(b)));
    // Lidt tilfældighed: nogle gange den næstnærmeste
    brain.shroom = pool[pool.length > 1 && this.rng() < 0.15 ? 1 : 0] ?? null;
    brain.target = null;
  }

  protected botInput(slot: number, dt: number): BotInput | null {
    const d = this.divers.find((x) => x.slot === slot);
    if (!d || d.out || this.phase === 'intro' || this.phase === 'over') return null;
    const brain = this.brains[slot];
    if (this.elapsed < brain.thinkAt) return { x: 0, y: 0, a: false };
    // Den forvirrede bot opdager fejlen efter et stykke tid
    if (this.phase === 'call' && brain.confused && brain.shroom && brain.shroom.color !== this.called && this.phaseTime > 0.7 + this.rng() * 0.3) {
      brain.confused = false;
      this.botThink(d, false);
    }
    const s = brain.shroom;
    if (!s || s.gone) {
      this.botWander(d);
      return { x: 0, y: 0, a: false };
    }
    const off = (slot - 1.5) * 50;
    const tx = s.x + off;
    const ty = s.y + (slot % 2 ? 6 : -6);
    const dx = tx - d.x;
    const dy = (ty - d.y) / 0.6;
    const dist = Math.hypot(dx, dy);
    const onTarget = d.on === s;
    if (dist < Math.max(18, WALK_SPEED * dt * 0.8) || (onTarget && this.phase === 'free' && dist < 70)) return { x: 0, y: 0, a: false };
    const nx = dx / dist;
    const ny = dy / dist;
    // Hop hvis der er suppe foran (eller man vader)
    let hop = false;
    if (d.hop <= 0 && d.hopCd <= 0 && !onTarget) {
      const aheadX = d.x + nx * 60;
      const aheadY = d.y + ny * 0.6 * 60;
      const aheadOn = this.shroomAt(aheadX, aheadY);
      // Vader man, hopper man kun hvis målet er langt væk (ellers vader man det sidste stykke)
      hop = d.on ? !aheadOn && dist > 170 : dist > 130;
      if (hop && this.rng() < 0.2) hop = false;
    }
    brain.hopWant = !brain.hopWant && hop;
    // Blødt ind på pladsen, så man ikke skyder forbi
    const k = Math.min(1, dist / 70);
    return { x: nx * k, y: ny * k, a: brain.hopWant };
  }
}
