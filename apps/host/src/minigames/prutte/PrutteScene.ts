import Phaser from 'phaser';
import { PLAYER_COLORS, type ButtonSpec } from '@samigame/shared';
import { rankByElimination } from '../../game/scoring';
import { gradientBackdrop, sunburst } from '../../kit/scenery';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { label, title } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  CUSHION,
  NOZZLE,
  PUMP_COLORS,
  bulbSvg,
  curtainSvg,
  cushionSvg,
  gasSvg,
  handleSvg,
  podiumSvg,
  pointerSvg,
  pumpSvg,
  signSvg,
  stageSvg,
  thinkSvg,
  twinkleSvg,
  valanceSvg,
  type Mood,
} from './art';

const PUMP_SCALE = 0.8;
const ARC = { cx: 960, cy: 545, rx: 680, ry: 345 };
const PODIUMS: [number, number][] = [
  [255, 915],
  [450, 990],
  [1470, 990],
  [1665, 915],
];
const HUMAN_TIME = 10;

interface Pump {
  index: number;
  x: number;
  y: number;
  color: string;
  body: Phaser.GameObjects.Image;
  handle: Phaser.GameObjects.Image;
  sign: Phaser.GameObjects.Image;
  num: Phaser.GameObjects.Text;
  used: boolean;
  bomb: boolean;
  press: number;
}

interface Contestant {
  player: PlayerView;
  slot: number;
  blok: Blok;
  home: { x: number; y: number };
  out: boolean;
}

/**
 * PRUTTE-ROULETTE (alle mod alle, inspireret af Bowser's Big Blast).
 * Spillerne skiftes til at pumpe luft i en kæmpe pruttepude. Én hemmelig pumpe udløser kæmpe-prutten,
 * der sender pumperen til himmels. Færre pumper hver runde. Sidste overlevende vinder.
 */
export class PrutteScene extends MinigameScene {
  protected duration: number | null = null;
  protected music = 'tense' as const;

  private cons: Contestant[] = [];
  private pumps: Pump[] = [];
  private eliminated: number[] = [];
  private round = 0;
  private turn = 0;
  private turnSlot = -1;
  private phase: 'intro' | 'choose' | 'busy' | 'done' = 'intro';
  private chooseLeft = 0;
  private botThink = 0;
  private botPick = -1;
  private hoverTimer = 0;
  private hover = -1;
  private inflate = 0;
  private cushion!: Phaser.GameObjects.Image;
  private cushionMood: Mood = 'calm';
  private cushionScale = 1;
  private tremble = 0;
  private tubes!: Phaser.GameObjects.Graphics;
  private puffs: { pump: Pump; t: number }[] = [];
  private pointer!: Phaser.GameObjects.Image;
  private think!: Phaser.GameObjects.Image;
  private turnText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private spot!: Phaser.GameObjects.Ellipse;
  private gasEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('prutte');
  }

  preload(): void {
    for (const m of ['calm', 'nervous', 'panic', 'flat'] as Mood[]) loadSvg(this, `prutte-cushion-${m}`, cushionSvg(m), CUSHION.w, CUSHION.h);
    PUMP_COLORS.forEach((c, i) => loadSvg(this, `prutte-pump-${i}`, pumpSvg(c), 170, 230));
    for (const pc of PLAYER_COLORS) loadSvg(this, `prutte-podium-${pc.hex.slice(1)}`, podiumSvg(pc.hex), 200, 120);
    loadSvg(this, 'prutte-handle', handleSvg(), 170, 150);
    loadSvg(this, 'prutte-sign', signSvg(), 80, 80);
    loadSvg(this, 'prutte-curtain', curtainSvg(), 360, 1080);
    loadSvg(this, 'prutte-valance', valanceSvg(), 1920, 160);
    loadSvg(this, 'prutte-stage', stageSvg(), 1920, 440);
    loadSvg(this, 'prutte-gas', gasSvg(), 120, 120);
    loadSvg(this, 'prutte-bulb', bulbSvg(), 40, 40);
    loadSvg(this, 'prutte-twinkle', twinkleSvg(), 80, 80);
    loadSvg(this, 'prutte-think', thinkSvg(), 120, 110);
    loadSvg(this, 'prutte-pointer', pointerSvg(), 90, 90);
  }

  protected setup(): void {
    this.cons = [];
    this.pumps = [];
    this.eliminated = [];
    this.round = 0;
    this.phase = 'intro';
    this.cushionScale = 1;
    this.inflate = 0;
    this.puffs = [];

    this.buildStage();

    this.tubes = this.add.graphics().setDepth(300);
    this.cushion = this.add.image(CUSHION.x, CUSHION.y, 'prutte-cushion-calm').setDepth(400);
    this.tweens.add({ targets: this.cushion, scaleY: { from: 0.97, to: 1.03 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.gasEmitter = this.add.particles(0, 0, 'prutte-gas', {
      speed: { min: 80, max: 260 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.5, end: 2.2 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 1400,
      emitting: false,
    });
    this.gasEmitter.setDepth(6000);

    this.pointer = this.add.image(0, 0, 'prutte-pointer').setDepth(5000).setVisible(false);
    this.tweens.add({ targets: this.pointer, y: '-=16', duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.think = this.add.image(0, 0, 'prutte-think').setDepth(5000).setVisible(false);
    this.tweens.add({ targets: this.think, scale: { from: 0.95, to: 1.08 }, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.roundText = label(this, W / 2, 158, '', 38, { color: C.cream }).setDepth(7000).setAlpha(0);
    this.turnText = title(this, W / 2, 222, '', 54, { color: C.sun }).setDepth(7000).setAlpha(0);
    this.clockText = label(this, 0, 0, '', 34, { color: C.cream }).setDepth(7100).setVisible(false);

    for (const p of this.players) {
      const [hx, hy] = PODIUMS[p.slot] ?? PODIUMS[0];
      const key = `prutte-podium-${p.color.slice(1)}`;
      this.add.image(hx, hy, this.textures.exists(key) ? key : 'prutte-podium-ff4d4d').setOrigin(0.5, 40 / 120).setDepth(hy - 20);
      const blok = this.spawnBlok(p, hx, hy, { size: 0.62 });
      blok.setDepth(hy);
      blok.setFacing(hx < W / 2 ? 1 : -1);
      this.cons.push({ player: p, slot: p.slot, blok, home: { x: hx, y: hy }, out: false });
    }
    this.layoutPumps(this.players.length + 1, false);
  }

  protected onStart(): void {
    this.say('fartStart', true);
    this.turn = Math.floor(this.rng() * this.alive().length);
    void this.startRound();
  }

  // ---------------------------------------------------------------------------
  // Scene

  private buildStage(): void {
    gradientBackdrop(this, '#3a1a6a', C.night);
    sunburst(this, CUSHION.x, CUSHION.y, '#ff9ac0', 0.1, -9000);
    // Bagvæg med stjerner der blinker
    for (let i = 0; i < 30; i++) {
      const s = this.add.image(Phaser.Math.Between(200, W - 200), Phaser.Math.Between(150, 560), TEX.spark).setDepth(-8500).setTint(0xffe9a0).setScale(Phaser.Math.FloatBetween(0.2, 0.5)).setAlpha(0.6);
      this.tweens.add({ targets: s, alpha: 0.1, scale: 0.1, duration: Phaser.Math.Between(600, 1600), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }
    // Søgelys der fejer
    for (const [x, d] of [[420, 1], [1500, -1]] as const) {
      const beam = this.add.triangle(x, 0, 0, 0, 120, 0, 60 + d * 200, 1000, 0xfff6c8, 0.08).setOrigin(0.5, 0).setDepth(-8000).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: beam, angle: { from: -18 * d, to: 18 * d }, duration: 3600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.image(W / 2, 860, 'prutte-stage').setDepth(-7000);
    // Tæpper
    const left = this.add.image(0, H / 2, 'prutte-curtain').setOrigin(0, 0.5).setDepth(8000);
    const right = this.add.image(W, H / 2, 'prutte-curtain').setOrigin(1, 0.5).setFlipX(true).setDepth(8000);
    left.setScale(0.62, 1);
    right.setScale(0.62, 1);
    this.tweens.add({ targets: left, scaleX: 0.66, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: right, scaleX: 0.66, duration: 2700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(W / 2, 40, 'prutte-valance').setDepth(8001);
    // Lyskæde der blinker på skift
    for (let i = 0; i < 24; i++) {
      const b = this.add.image(120 + i * 73, 112 + Math.sin((i / 23) * Math.PI) * 26, 'prutte-bulb').setDepth(8002).setScale(0.8);
      this.tweens.add({ targets: b, alpha: 0.35, duration: 260, yoyo: true, repeat: -1, delay: (i % 2) * 260 });
    }
    // Neon-skilt
    const neon = title(this, W / 2, 82, 'PRUTTE-ROULETTE', 64, { color: '#9dff6a' }).setDepth(8003);
    this.tweens.add({ targets: neon, alpha: { from: 1, to: 0.75 }, duration: 90, yoyo: true, repeat: -1, repeatDelay: 2300 });
    // Spotlys på den aktive spiller
    this.spot = this.add.ellipse(0, 0, 220, 70, 0xfff6c8, 0.35).setDepth(-6000).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
  }

  private pumpPos(i: number, n: number): { x: number; y: number } {
    const a0 = 162;
    const a1 = 18;
    const a = ((a0 + ((a1 - a0) * i) / Math.max(1, n - 1)) * Math.PI) / 180;
    return { x: ARC.cx + Math.cos(a) * ARC.rx, y: ARC.cy + Math.sin(a) * ARC.ry };
  }

  private layoutPumps(n: number, animate: boolean): void {
    for (const p of this.pumps) {
      this.tweens.add({ targets: [p.body, p.handle, p.sign, p.num], scale: 0, alpha: 0, duration: 250, ease: 'Back.easeIn', onComplete: () => [p.body, p.handle, p.sign, p.num].forEach((o) => o.destroy()) });
    }
    this.pumps = [];
    const bomb = Math.floor(this.rng() * n);
    for (let i = 0; i < n; i++) {
      const { x, y } = this.pumpPos(i, n);
      const colorIdx = i % PUMP_COLORS.length;
      const body = this.add.image(x, y, `prutte-pump-${colorIdx}`).setOrigin(0.5, 1).setScale(PUMP_SCALE).setDepth(y);
      const handle = this.add.image(x, y - 150 * PUMP_SCALE, 'prutte-handle').setOrigin(0.5, 1).setScale(PUMP_SCALE).setDepth(y - 1);
      const sign = this.add.image(x - 52, y - 40, 'prutte-sign').setScale(0.75).setDepth(y + 2);
      const num = title(this, sign.x, sign.y - 3, String(i + 1), 36, { color: C.ink, stroke: 0 }).setShadow(0, 0, C.ink, 0).setDepth(y + 3);
      const pump: Pump = { index: i, x, y, color: PUMP_COLORS[colorIdx], body, handle, sign, num, used: false, bomb: i === bomb, press: 0 };
      this.pumps.push(pump);
      if (animate) {
        for (const o of [body, handle, sign, num]) {
          const ty = o.y;
          o.y -= 900;
          this.tweens.add({ targets: o, y: ty, duration: 600, delay: 120 * i, ease: 'Bounce.easeOut' });
        }
        this.time.delayedCall(120 * i + 380, () => {
          this.sfx('boing', { pitch: 0.8 + i * 0.1, volume: 0.5, pan: this.panFor(x) });
          this.fx.dust(x, y, 6);
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Runder og ture

  private alive(): Contestant[] {
    return this.cons.filter((c) => !c.out);
  }

  private async startRound(): Promise<void> {
    this.round++;
    const n = this.alive().length + 1;
    this.phase = 'intro';
    if (this.round > 1) {
      this.layoutPumps(n, true);
      this.say(this.round === 2 ? 'fewerPumps' : 'lastRound');
    }
    this.roundText.setText(`RUNDE ${this.round}  ·  ${n} PUMPER  ·  1 ER EN BOMBE`).setAlpha(1).setScale(0);
    this.tweens.add({ targets: this.roundText, scale: 1, duration: 350, ease: 'Back.easeOut' });
    this.sfx('powerup');
    await this.wait(this.round > 1 ? 1400 : 600);
    this.nextTurn();
  }

  private nextTurn(): void {
    const alive = this.alive();
    this.turn %= alive.length;
    const c = alive[this.turn];
    this.turnSlot = c.slot;
    this.phase = 'choose';
    this.chooseLeft = HUMAN_TIME;
    this.botThink = 1.2 + this.rng() * 1.6;
    const free = this.pumps.filter((p) => !p.used);
    this.botPick = free[Math.floor(this.rng() * free.length)].index;
    this.hover = free[0].index;
    this.hoverTimer = 0;

    this.turnText.setText(`${c.player.name} – vælg en pumpe!`).setColor(c.player.color).setAlpha(1).setScale(0.3);
    this.tweens.add({ targets: this.turnText, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.sfx('select');
    c.blok.hop(60);
    this.spot.setVisible(true).setPosition(c.home.x, c.home.y);
    this.think.setVisible(true).setPosition(c.home.x + 70, c.home.y - 210);
    this.clockText.setVisible(!this.isBotNow(c.slot)).setPosition(c.home.x, c.home.y - 250);

    for (const o of this.cons) {
      if (o.slot === c.slot) {
        this.setLayout(o.slot, {
          kind: 'choice',
          title: 'Vælg en pumpe!',
          options: this.pumps.map<ButtonSpec>((p) => ({ id: p.index, label: `Pumpe ${p.index + 1}`, icon: p.used ? '💨' : '🎈', color: p.color, disabled: p.used })),
          columns: 3,
          hint: 'Én af dem er en prutte-bombe ...',
        });
        this.vibrate(o.slot, 80);
      } else {
        this.setLayout(o.slot, { kind: 'wait', title: o.out ? 'Du er ude!' : 'Vent ...', message: `${c.player.name} vælger en pumpe`, emoji: o.out ? '☁️' : '💨' });
      }
    }
  }

  protected play(dt: number): void {
    this.updateCushion(dt);
    this.drawTubes(dt);
    if (this.phase !== 'choose') return;

    const free = this.pumps.filter((p) => !p.used);
    const pick = this.choice(this.turnSlot);
    if (pick >= 0 && free.some((p) => p.index === pick)) {
      this.pick(pick);
      return;
    }
    // Bot-"tøven": pilen hopper mellem pumperne
    if (this.isBotNow(this.turnSlot)) {
      this.hoverTimer -= dt;
      if (this.hoverTimer <= 0) {
        this.hoverTimer = 0.35 + this.rng() * 0.25;
        const others = free.filter((p) => p.index !== this.hover);
        this.hover = (others.length ? others[Math.floor(this.rng() * others.length)] : free[0]).index;
        this.sfx('tick', { pitch: 1.5, volume: 0.4 });
      }
      const hp = this.pumps[this.hover];
      if (hp) this.pointer.setVisible(true).setPosition(hp.x, this.pointer.y === 0 ? hp.y - 300 : this.pointer.y).x = hp.x;
      if (hp) this.pointer.y = Phaser.Math.Linear(this.pointer.y, hp.y - 290, Math.min(1, dt * 10));
    } else {
      this.pointer.setVisible(false);
      this.chooseLeft -= dt;
      const s = Math.ceil(this.chooseLeft);
      this.clockText.setText(`⏱ ${Math.max(0, s)}`);
      if (this.chooseLeft <= 0) this.pick(free[Math.floor(this.rng() * free.length)].index);
    }
  }

  private async pick(index: number): Promise<void> {
    const pump = this.pumps[index];
    const c = this.cons.find((x) => x.slot === this.turnSlot);
    if (!pump || !c || pump.used) return;
    this.phase = 'busy';
    pump.used = true;
    this.pointer.setVisible(true).setPosition(pump.x, pump.y - 290);
    this.think.setVisible(false);
    this.clockText.setVisible(false);
    this.sfx('select', { pitch: 0.8 });
    this.fx.squash(pump.num, 1.5, 0.7, 120);
    for (const o of this.cons) {
      this.setLayout(o.slot, { kind: 'wait', title: o.slot === c.slot ? `Pumpe ${index + 1}!` : 'Hold vejret ...', message: o.slot === c.slot ? 'Krydser fingre ...' : `${c.player.name} tog pumpe ${index + 1}`, emoji: '😬' });
    }

    // Gå hen til pumpen
    const gripY = () => pump.handle.y - 140 * PUMP_SCALE;
    await this.walkTo(c, pump.x - 70 * Math.sign(pump.x - W / 2 || 1), pump.y + 4);
    this.pointer.setVisible(false);
    // Hop op på håndtaget
    this.sfx('jump');
    this.stat(c.slot, 'jumps');
    await this.tweenP({ targets: c.blok, x: pump.x, y: gripY(), duration: 380, ease: 'Quad.easeOut' });
    c.blok.setDepth(pump.y + 5);
    c.blok.squash(1.3, 0.75);

    // Pump to gange
    const strokes = 2;
    for (let s = 0; s < strokes; s++) {
      await this.stroke(c, pump);
      await this.wait(120);
    }

    if (!pump.bomb) {
      await this.wait(250 + this.rng() * 500);
      this.safe(c, pump);
      await this.wait(500);
      await this.tweenP({ targets: c.blok, x: pump.x + 60 * (c.home.x < W / 2 ? -1 : 1), y: pump.y + 6, duration: 300, ease: 'Quad.easeIn' });
      c.blok.squash(1.2, 0.8);
      void this.walkTo(c, c.home.x, c.home.y);
      await this.wait(350);
      this.turn++;
      this.nextTurn();
    } else {
      await this.blast(c, pump);
    }
  }

  /** Ét pumpe-tryk: håndtaget ned, luft gennem slangen, puden svulmer. */
  private async stroke(c: Contestant, pump: Pump): Promise<void> {
    const baseY = pump.y - 150 * PUMP_SCALE;
    const down = 42;
    this.tweens.add({ targets: pump.handle, y: baseY + down, duration: 140, ease: 'Quad.easeIn' });
    await this.tweenP({ targets: c.blok, y: baseY + down - 140 * PUMP_SCALE, duration: 140, ease: 'Quad.easeIn' });
    this.sfx('pump', { pan: this.panFor(pump.x) });
    c.blok.squash(1.35, 0.7);
    this.fx.squash(pump.body, 1.12, 0.9, 80);
    this.vibrate(c.slot, 40);
    this.puffs.push({ pump, t: 0 });
    this.time.delayedCall(420, () => {
      this.inflate += 1;
      this.sfx('squeak', { pitch: 0.5 + this.inflate * 0.08, volume: 0.6 });
    });
    this.tweens.add({ targets: pump.handle, y: baseY, duration: 260, ease: 'Back.easeOut' });
    await this.tweenP({ targets: c.blok, y: baseY - 140 * PUMP_SCALE, duration: 260, ease: 'Back.easeOut' });
  }

  private safe(c: Contestant, pump: Pump): void {
    this.sfx('fart', { pitch: 2.2, volume: 0.6 });
    this.sfx('ding', { delay: 0.15 });
    this.gasEmitter.explode(5, this.nozzle().x, this.nozzle().y);
    this.fx.floatText(pump.x, pump.y - 380, ['PUHA!', 'SIKKER!', 'PYH!', 'HELDIG!'][Math.floor(this.rng() * 4)], C.mint, 54);
    c.blok.cheer();
    this.time.delayedCall(900, () => c.blok.idle());
    this.tweens.add({ targets: [pump.body, pump.num, pump.sign], alpha: 0.45, duration: 300 });
    if (this.rng() < 0.4) this.say('phew');
  }

  private async blast(c: Contestant, pump: Pump): Promise<void> {
    // Puden svulmer faretruende ...
    this.tremble = 1;
    this.inflate += 4;
    this.sfx('rumble', { volume: 1.2 });
    this.sfx('scream', { pitch: 1.4, delay: 0.4, pan: this.panFor(pump.x) });
    this.fx.flash(0x9dff6a, 120, 0.25);
    await this.wait(1100);

    // KÆMPE-PRUT!
    this.tremble = 0;
    this.sfx('fart', { pitch: 0.55, volume: 1.6 });
    this.sfx('fart', { pitch: 0.4, volume: 1.2, delay: 0.25 });
    this.sfx('explosion', { volume: 0.8 });
    this.fx.flash(0x9dff6a, 300, 0.55);
    this.fx.shake(0.025, 700);
    this.fx.punch(0.06, 300);
    this.hitstop(90);
    this.gasEmitter.explode(40, this.nozzle().x, this.nozzle().y);
    this.fx.burst(pump.x, pump.y - 100, { texture: 'prutte-gas', count: 20, speed: 600, scale: 1.2, gravity: -200, lifespan: 1300 });
    this.fx.burst(pump.x, pump.y - 120, { texture: TEX.star, color: [N.sun, 0x9dff6a], count: 14, speed: 900, gravity: 800 });
    this.vibrate(c.slot, 500);
    this.stat(c.slot, 'falls');
    this.say('megaFart', true);
    this.cushionMood = 'flat';
    this.inflate = 0;
    title(this, W / 2, CUSHION.y - 60, 'PRRRUUUUT!', 150, { color: '#9dff6a' })
      .setDepth(7500)
      .setAngle(-8)
      .setScale(0)
      .setData('tmp', true);
    const big = this.children.list.filter((o) => o.getData('tmp')).pop() as Phaser.GameObjects.Text;
    this.tweens.add({ targets: big, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: big, alpha: 0, y: big.y - 80, delay: 1100, duration: 400, onComplete: () => big.destroy() });

    // Pumpen ryger i stumper
    this.tweens.add({ targets: [pump.body, pump.handle, pump.sign, pump.num], angle: 160, y: '+=40', alpha: 0, duration: 600, ease: 'Quad.easeIn' });

    // Spilleren skydes til himmels
    c.out = true;
    this.eliminated.push(c.slot);
    c.blok.spinOut(5, 1300);
    c.blok.setDepth(7600);
    const dir = c.blok.x < W / 2 ? -1 : 1;
    this.tweens.add({ targets: c.blok, x: c.blok.x + dir * 260, duration: 1200, ease: 'Sine.easeOut' });
    await this.tweenP({ targets: c.blok, y: -300, scale: 0.4, duration: 1200, ease: 'Cubic.easeOut' });
    const tw = this.add.image(c.blok.x, 70, 'prutte-twinkle').setDepth(8500).setScale(0);
    this.sfx('ding', { pitch: 2.2 });
    this.tweens.add({ targets: tw, scale: 0.9, angle: 180, duration: 250, yoyo: true, onComplete: () => tw.destroy() });

    const left = this.alive();
    if (left.length <= 1) {
      await this.wait(500);
      this.phase = 'done';
      this.turnText.setAlpha(0);
      this.spot.setVisible(false);
      const w = left[0];
      if (w) {
        w.blok.cheer();
        this.fx.confetti(1500);
        this.sfx('cheer');
        this.fx.floatText(w.blok.x, w.blok.y - 220, 'OVERLEVER!', C.sun, 64);
      }
      await this.wait(900);
      this.finish(rankByElimination(this.eliminated, this.players.length));
      return;
    }

    // Den uheldige falder ned på sit podie igen – sodet og sur
    this.time.delayedCall(700, () => {
      c.blok.setPosition(c.home.x, -200).setScale(1).setDepth(c.home.y);
      this.tweens.add({
        targets: c.blok,
        y: c.home.y,
        duration: 500,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.sfx('stomp', { pan: this.panFor(c.home.x) });
          c.blok.squash(1.6, 0.5);
          c.blok.sad();
          this.fx.dust(c.home.x, c.home.y, 12);
          this.fx.burst(c.home.x, c.home.y - 60, { texture: 'prutte-gas', count: 6, speed: 120, gravity: -100, lifespan: 1200, scale: 0.6 });
          label(this, c.home.x, c.home.y + 60, 'UDE', 30, { color: C.tomato }).setDepth(c.home.y + 10);
        },
      });
    });
    await this.wait(1800);
    this.cushionMood = 'calm';
    this.sfx('pump', { pitch: 0.6 });
    // turn peger nu på den næste spiller (listen er blevet kortere)
    void this.startRound();
  }

  // ---------------------------------------------------------------------------
  // Pude og slanger

  private nozzle(): { x: number; y: number } {
    return {
      x: this.cushion.x + (NOZZLE.x - CUSHION.w / 2) * this.cushion.scaleX,
      y: this.cushion.y + (NOZZLE.y - CUSHION.h / 2) * this.cushion.scaleY,
    };
  }

  private updateCushion(dt: number): void {
    const free = this.pumps.filter((p) => !p.used).length;
    const total = Math.max(1, this.pumps.length);
    const danger = 1 - free / total;
    const target = 1 + Math.min(0.55, this.inflate * 0.07) + this.tremble * 0.25;
    this.cushionScale += (target - this.cushionScale) * Math.min(1, dt * 6);
    let mood: Mood = this.cushionMood;
    if (mood !== 'flat') mood = this.tremble > 0 ? 'panic' : danger > 0.45 || this.inflate >= 5 ? 'nervous' : 'calm';
    const key = `prutte-cushion-${mood === 'flat' && this.inflate === 0 ? 'flat' : mood}`;
    if (this.cushion.texture.key !== key) {
      this.cushion.setTexture(key);
      this.fx.squash(this.cushion, 1.1, 0.9, 80);
    }
    const shake = (this.tremble * 14 + danger * 2.5) * (0.5 + Math.random());
    this.cushion.x = CUSHION.x + (Math.random() - 0.5) * shake;
    this.cushion.setScale(this.cushionScale * (1 + Math.sin(this.elapsed * 30) * 0.02 * this.tremble), this.cushion.scaleY);
  }

  private drawTubes(dt: number): void {
    const g = this.tubes;
    g.clear();
    const s = this.cushionScale;
    for (const p of this.pumps) {
      if (p.body.alpha < 0.05) continue;
      const sx = p.x + 72 * PUMP_SCALE;
      const sy = p.y - 60 * PUMP_SCALE + (p.body.y - p.y);
      const dx = p.x - CUSHION.x;
      const ex = CUSHION.x + Math.sign(dx) * Math.min(Math.abs(dx) * 0.4, 200 * s);
      const ey = CUSHION.y + 120 * s;
      const cx = (sx + ex) / 2;
      const cy = Math.max(sy, ey) + 90;
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(sx, sy), new Phaser.Math.Vector2(cx, cy), new Phaser.Math.Vector2(ex, ey));
      const pts = curve.getPoints(24);
      const color = Phaser.Display.Color.HexStringToColor(p.color).color;
      g.lineStyle(26, N.ink, p.body.alpha).strokePoints(pts, false);
      g.lineStyle(16, color, p.body.alpha).strokePoints(pts, false);
      g.lineStyle(4, 0xffffff, 0.35 * p.body.alpha).strokePoints(pts.map((q) => new Phaser.Math.Vector2(q.x - 3, q.y - 4)), false);
      for (const puff of this.puffs) {
        if (puff.pump !== p) continue;
        const q = curve.getPoint(Math.min(1, puff.t));
        const r = 18 + Math.sin(puff.t * Math.PI) * 6;
        g.fillStyle(N.ink, 1).fillCircle(q.x, q.y, r + 5);
        g.fillStyle(color, 1).fillCircle(q.x, q.y, r);
        g.fillStyle(0xffffff, 0.5).fillCircle(q.x - r * 0.3, q.y - r * 0.3, r * 0.3);
      }
    }
    for (const puff of this.puffs) puff.t += dt * 2.4;
    this.puffs = this.puffs.filter((p) => p.t < 1);
  }

  // ---------------------------------------------------------------------------
  // Hjælpere

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  private tweenP(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ ...cfg, onComplete: () => resolve() }));
  }

  private walkTo(c: Contestant, x: number, y: number): Promise<void> {
    const dist = Math.hypot(x - c.blok.x, y - c.blok.y);
    const dur = Math.max(250, dist * 1.4);
    const dx = Math.sign(x - c.blok.x);
    c.blok.setFacing(dx >= 0 ? 1 : -1);
    let last = 0;
    return this.tweenP({
      targets: c.blok,
      x,
      y,
      duration: dur,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const now = tw.elapsed;
        c.blok.walk(dx, 0.2, (now - last) * 1.2);
        c.blok.setDepth(c.blok.y);
        last = now;
      },
    }).then(() => c.blok.walk(0, 0, 0));
  }

  // ---------------------------------------------------------------------------
  // Bots: tænk lidt, peg rundt på pumperne, vælg en tilfældig ledig.

  protected botInput(slot: number, dt: number): BotInput | null {
    if (this.phase !== 'choose' || slot !== this.turnSlot) return null;
    this.botThink -= dt;
    if (this.botThink > 0) return null;
    this.botThink = 99;
    return { choice: this.botPick, tap: true };
  }
  /** fx.hitstop() nulstiller tidsskalaen til 1 (ikke ?speed=) – gendan den bagefter. */
  private hitstop(ms: number): void {
    this.fx.hitstop(ms);
    setTimeout(() => {
      if (!this.sys.isActive()) return;
      this.tweens.timeScale = this.speed;
      this.time.timeScale = this.speed;
    }, ms + 10);
  }
}
