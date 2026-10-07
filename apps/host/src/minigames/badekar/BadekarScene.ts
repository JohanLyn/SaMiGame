import Phaser from 'phaser';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, TEAM_HEX, TEAM_NAMES, W } from '../../kit/theme';
import { label, title } from '../../kit/ui';
import type { MusicTheme } from '../../kit/audio';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  duckSvg,
  finishSvg,
  flagSvg,
  iceSvg,
  penguinSvg,
  rampSvg,
  rocketFlameSvg,
  rocketIconSvg,
  snowSvg,
  snowflakeSvg,
  snowmanSvg,
  soapSvg,
  startSvg,
  streakSvg,
  treeSvg,
  tubBackSvg,
  tubFrontSvg,
  tubIconSvg,
} from './art';

const LANE_W = 950;
const LANE_X = [0, W - LANE_W];
const LCX = LANE_W / 2;
/** Isbanens bredde og snevæggenes tykkelse. */
const TW = 360;
const WALL = 46;
const LAT_MAX = TW / 2 - 62;
const SEG = 1000;
const NODES = 18;
const FINISH_D = 15400;
const TUB_Y = 760;
const VMAX = 820;
const VBOOST = 1250;
const VBRAKE = 380;
const ACC = 320;
const VX_MAX = 600;
/** Hvor meget af svinget badekarret selv følger (resten skal styres). */
const ASSIST = 0.35;
const MAX_CHARGES = 3;
const RECHARGE = 4;

type FeatureKind = 'ramp' | 'soap' | 'ice' | 'duck';

interface Feature {
  kind: FeatureKind;
  d: number;
  lat: number;
}

interface FeatureInst {
  f: Feature;
  obj: Phaser.GameObjects.Image;
  hit: boolean;
}

interface Deco {
  d: number;
  /** Afstand fra banens midte (± = side). */
  off: number;
  obj: Phaser.GameObjects.Image;
}

interface Sled {
  team: number;
  lane: number;
  steer: PlayerView;
  boost: PlayerView;
  root: Phaser.GameObjects.Container;
  snow: Phaser.GameObjects.TileSprite;
  g: Phaser.GameObjects.Graphics;
  feats: FeatureInst[];
  decos: Deco[];
  startC: Phaser.GameObjects.Container;
  finishC: Phaser.GameObjects.Container;
  tubC: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Image;
  flame: Phaser.GameObjects.Image;
  steerBlok: Blok;
  boostBlok: Blok;
  streaks: Phaser.GameObjects.Particles.ParticleEmitter;
  d: number;
  v: number;
  lat: number;
  vx: number;
  air: number;
  airTotal: number;
  spin: number;
  boostT: number;
  brakeT: number;
  charges: number;
  chargeT: number;
  wallCd: number;
  shake: number;
  finished: boolean;
  // HUD
  posText: Phaser.GameObjects.Text;
  speedText: Phaser.GameObjects.Text;
  icons: Phaser.GameObjects.Image[];
  progressIcon: Phaser.GameObjects.Image;
  // Bot-hjerner
  botX: number;
  botWander: number;
  botBrakeCd: number;
}

/**
 * BADEKAR-BOBSLÆDE (2 mod 2).
 * Hvert hold sidder i et badekar på ski ned ad en isbane (delt skærm). Første spiller STYRER (vip telefonen),
 * anden spiller er BOOSTER (🚀 Boost / 🛑 Brems). For hurtigt i svingene = ind i snevæggen. Hop over rampen,
 * kør over sæbe-turbo og undgå isklumper og badeænder. Først i mål vinder.
 */
export class BadekarScene extends MinigameScene {
  protected duration = 60;
  protected music: MusicTheme = 'game';

  private nodes: number[] = [];
  private features: Feature[] = [];
  private decoPlan: { d: number; off: number; kind: string }[] = [];
  private sleds: Sled[] = [];
  private winner: number | null = null;

  constructor() {
    super('badekar');
  }

  preload(): void {
    loadSvg(this, 'bad-snow', snowSvg(), 256, 256);
    TEAM_HEX.forEach((hex, i) => {
      loadSvg(this, `bad-tubback-${i}`, tubBackSvg(hex), 260, 220);
      loadSvg(this, `bad-tubfront-${i}`, tubFrontSvg(hex), 260, 220);
      loadSvg(this, `bad-tubicon-${i}`, tubIconSvg(hex), 80, 60);
    });
    loadSvg(this, 'bad-flame', rocketFlameSvg(), 80, 140);
    loadSvg(this, 'bad-tree', treeSvg(), 170, 230);
    loadSvg(this, 'bad-snowman', snowmanSvg(), 130, 180);
    loadSvg(this, 'bad-penguin', penguinSvg(), 100, 120);
    loadSvg(this, 'bad-flag-r', flagSvg('#ff4b4b'), 80, 140);
    loadSvg(this, 'bad-flag-b', flagSvg('#3d8bff'), 80, 140);
    loadSvg(this, 'bad-ramp', rampSvg(), 420, 130);
    loadSvg(this, 'bad-soap', soapSvg(), 170, 200);
    loadSvg(this, 'bad-ice', iceSvg(), 130, 120);
    loadSvg(this, 'bad-duck', duckSvg(), 130, 120);
    loadSvg(this, 'bad-finish', finishSvg(), 560, 240);
    loadSvg(this, 'bad-start', startSvg(), 560, 200);
    loadSvg(this, 'bad-rocket', rocketIconSvg(), 64, 64);
    loadSvg(this, 'bad-flake', snowflakeSvg(), 32, 32);
    loadSvg(this, 'bad-streak', streakSvg(), 12, 120);
  }

  // ---------------------------------------------------------------------------
  // Banen

  private f(d: number): number {
    const x = Phaser.Math.Clamp(d / SEG, 0, NODES - 1.0001);
    const i = Math.floor(x);
    const u = x - i;
    const k = (1 - Math.cos(u * Math.PI)) / 2;
    return this.nodes[i] + (this.nodes[i + 1] - this.nodes[i]) * k;
  }

  private df(d: number): number {
    const x = Phaser.Math.Clamp(d / SEG, 0, NODES - 1.0001);
    const i = Math.floor(x);
    const u = x - i;
    return ((this.nodes[i + 1] - this.nodes[i]) * Math.PI * Math.sin(u * Math.PI)) / (2 * SEG);
  }

  private buildTrack(): void {
    const nodes = [0, 0];
    for (let i = 2; i < NODES - 2; i++) {
      const prev = nodes[i - 1];
      let next = prev + (this.rng() < 0.5 ? -1 : 1) * (200 + this.rng() * 220);
      if (Math.abs(next) > 230) next = prev - Math.sign(next) * (200 + this.rng() * 200);
      nodes.push(Phaser.Math.Clamp(next, -230, 230));
    }
    nodes.push(0, 0);
    this.nodes = nodes;

    // Forhindringer og sjov – samme for begge hold
    const feats: Feature[] = [];
    const ramps = [3300, 7300, 11300].map((d) => d + this.rng() * 300);
    for (const d of ramps) {
      feats.push({ kind: 'ramp', d, lat: 0 });
      feats.push({ kind: 'ice', d: d + 420, lat: (this.rng() - 0.5) * 140 });
    }
    const near = (d: number, gap: number) => feats.some((f) => Math.abs(f.d - d) < gap);
    for (let k = 0; k < 6; k++) {
      const d = 1900 + k * 2200 + this.rng() * 500;
      if (!near(d, 450)) feats.push({ kind: 'soap', d, lat: (this.rng() - 0.5) * 180 });
    }
    let d = 2500;
    let n = 0;
    while (d < FINISH_D - 700) {
      d += 1000 + this.rng() * 500;
      if (near(d, 380)) continue;
      feats.push({ kind: n++ % 2 ? 'duck' : 'ice', d, lat: (this.rng() - 0.5) * 200 });
    }
    feats.sort((a, b) => a.d - b.d);
    this.features = feats;

    // Pynt langs banen
    const plan: { d: number; off: number; kind: string }[] = [];
    for (const side of [-1, 1]) {
      let dd = -600 + this.rng() * 100;
      while (dd < FINISH_D + 1600) {
        dd += 170 + this.rng() * 150;
        const r = this.rng();
        const kind = r < 0.5 ? 'tree' : r < 0.65 ? 'snowman' : r < 0.82 ? 'penguin' : 'flag';
        const base = TW / 2 + WALL;
        const off = side * (kind === 'flag' ? base + 26 : base + 60 + this.rng() * 150);
        plan.push({ d: dd, off, kind });
      }
    }
    this.decoPlan = plan;
  }

  // ---------------------------------------------------------------------------

  protected setup(): void {
    this.sleds = [];
    this.winner = null;
    this.buildTrack();

    for (const t of [0, 1]) this.buildLane(t);

    // Midterdeler med fremskridts-bar
    const div = this.add.graphics().setDepth(6500);
    div.fillStyle(N.ink, 1).fillRect(LANE_W, 0, W - LANE_W * 2, H);
    div.fillStyle(0x2a1f7a, 1).fillRoundedRect(W / 2 - 9, 190, 18, 830, 9);
    div.lineStyle(4, N.ink, 1).strokeRoundedRect(W / 2 - 9, 190, 18, 830, 9);
    for (let i = 0; i < 8; i++) div.fillStyle(i % 2 ? 0xffffff : 0x1a1446, 1).fillRect(W / 2 - 7, 190 + i * 6, 14, 6);
    for (const s of this.sleds) s.progressIcon.setDepth(6600);

    // Snefald over det hele
    const snow = this.add.particles(0, -20, 'bad-flake', {
      x: { min: 0, max: W },
      speedY: { min: 120, max: 260 },
      speedX: { min: -40, max: 40 },
      scale: { min: 0.3, max: 0.8 },
      alpha: { start: 0.9, end: 0.4 },
      lifespan: 6000,
      frequency: 90,
    });
    snow.setDepth(6000);

    for (const s of this.sleds) this.renderSled(s, 0);
  }

  private buildLane(t: number): void {
    const lane = t;
    const members = this.team(t);
    const steer = members[0];
    const boost = members[1] ?? members[0];
    const x0 = LANE_X[lane];
    const root = this.add.container(x0, 0).setDepth(100 + lane);
    const snow = this.add.tileSprite(LCX, H / 2, LANE_W, H, 'bad-snow');
    const g = this.add.graphics();
    root.add([snow, g]);

    const startC = this.add.container(0, 0, [this.add.image(0, 0, 'bad-start').setOrigin(0.5, 1), label(this, 0, -140, 'START', 40, { color: C.cream })]);
    root.add(startC);

    const finishImg = this.add.image(0, 0, 'bad-finish').setOrigin(0.5, 1);
    const finishTxt = label(this, 0, -240 + 119, 'MÅL', 46, { color: C.cream });
    const finishC = this.add.container(0, 0, [finishImg, finishTxt]);

    const feats: FeatureInst[] = this.features.map((f) => {
      const key = f.kind === 'ramp' ? 'bad-ramp' : f.kind === 'soap' ? 'bad-soap' : f.kind === 'ice' ? 'bad-ice' : 'bad-duck';
      const obj = this.add.image(0, 0, key).setVisible(false);
      if (f.kind === 'soap') obj.setScale(0.75);
      if (f.kind === 'ice' || f.kind === 'duck') obj.setOrigin(0.5, 0.85);
      if (f.kind === 'duck') this.tweens.add({ targets: obj, angle: { from: -8, to: 8 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      root.add(obj);
      return { f, obj, hit: false };
    });
    const decos: Deco[] = this.decoPlan.map((p) => {
      const key = p.kind === 'tree' ? 'bad-tree' : p.kind === 'snowman' ? 'bad-snowman' : p.kind === 'penguin' ? 'bad-penguin' : p.off < 0 ? 'bad-flag-r' : 'bad-flag-b';
      const obj = this.add.image(0, 0, key).setOrigin(0.5, 0.95).setVisible(false);
      if (p.kind === 'tree') obj.setScale(0.8 + ((p.d * 7) % 5) * 0.08);
      if (p.kind === 'penguin') this.tweens.add({ targets: obj, angle: { from: -10, to: 10 }, duration: 300 + ((p.d * 3) % 200), yoyo: true, repeat: -1 });
      if (p.kind === 'flag') obj.setScale(0.8);
      root.add(obj);
      return { d: p.d, off: p.off, obj };
    });
    root.add(finishC);

    // Badekar med to ryttere
    const shadow = this.add.image(0, 0, TEX.shadow).setAlpha(0.3).setDisplaySize(210, 50);
    const back = this.add.image(0, 0, `bad-tubback-${t}`);
    const steerBlok = this.spawnBlok(steer, -50, 40, { size: 0.5, tag: false, ring: false });
    const boostBlok = this.spawnBlok(boost, 50, 40, { size: 0.5, tag: false, ring: false });
    steerBlok.setFacing(1);
    boostBlok.setFacing(-1);
    const front = this.add.image(0, 0, `bad-tubfront-${t}`);
    const flame = this.add.image(0, 104, 'bad-flame').setOrigin(0.5, 0).setScale(0.7).setVisible(false);
    const tubC = this.add.container(0, 0, [flame, back, steerBlok, boostBlok, front]);
    root.add([shadow, tubC]);

    // Fartstriber når det går stærkt
    const streaks = this.add.particles(0, 0, 'bad-streak', {
      x: { min: x0 + 20, max: x0 + LANE_W - 20 },
      y: { min: -120, max: 200 },
      speedY: { min: 1400, max: 2000 },
      scaleY: { min: 0.6, max: 1.3 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 700,
      frequency: 40,
      emitting: false,
    });
    streaks.setDepth(5000);

    // HUD for banen
    const hudY = 48;
    const chip = this.add.graphics().setDepth(7000);
    const col = Phaser.Display.Color.HexStringToColor(TEAM_HEX[t]).color;
    const cx = x0 + LCX;
    chip.fillStyle(N.ink, 0.9).fillRoundedRect(cx - 190, hudY - 30, 380, 64, 30);
    chip.fillStyle(col, 1).fillRoundedRect(cx - 184, hudY - 25, 368, 54, 26);
    chip.fillStyle(0xffffff, 0.25).fillRoundedRect(cx - 170, hudY - 20, 340, 14, 7);
    label(this, cx, hudY + 2, TEAM_NAMES[t].toUpperCase(), 34, { color: C.cream }).setDepth(7001);
    const posText = title(this, x0 + (lane === 0 ? 70 : LANE_W - 70), hudY + 30, '1.', 64, { color: C.sun }).setDepth(7001);
    const speedText = label(this, x0 + (lane === 0 ? 120 : LANE_W - 120), H - 50, '0 KM/T', 34, { color: C.cream }).setDepth(7001);
    const roleY = H - 46;
    const roleX = x0 + (lane === 0 ? LANE_W - 230 : 230);
    const roleBg = this.add.graphics().setDepth(7000);
    roleBg.fillStyle(N.ink, 0.88).fillRoundedRect(roleX - 200, roleY - 66, 400, 104, 22);
    roleBg.lineStyle(5, col, 1).strokeRoundedRect(roleX - 200, roleY - 66, 400, 104, 22);
    roleBg.fillStyle(0xffffff, 0.12).fillRoundedRect(roleX - 186, roleY - 58, 372, 12, 6);
    const roleLine = (y: number, role: string, p: PlayerView) => {
      const r = label(this, roleX - 182, y, role, 24, { color: C.cream, stroke: 5 }).setOrigin(0, 0.5).setDepth(7001);
      const n = label(this, r.x + r.width + 10, y, p.name, 26, { color: p.color, stroke: 6 }).setOrigin(0, 0.5).setDepth(7001);
      const room = roleX + 186 - n.x;
      if (n.width > room) n.setScale(room / n.width);
    };
    roleLine(roleY - 36, 'STYRER', steer);
    roleLine(roleY - 2, 'BOOST', boost);
    const icons = Array.from({ length: MAX_CHARGES }, (_, i) =>
      this.add.image(roleX - 60 + i * 60, roleY - 112, 'bad-rocket').setScale(0.75).setDepth(7001),
    );
    const progressIcon = this.add.image(W / 2 + (lane === 0 ? -14 : 14), 1010, `bad-tubicon-${t}`).setScale(0.6);

    this.sleds.push({
      team: t,
      lane,
      steer,
      boost,
      root,
      snow,
      g,
      feats,
      decos,
      startC,
      finishC,
      tubC,
      shadow,
      flame,
      steerBlok,
      boostBlok,
      streaks,
      d: 0,
      v: 0,
      lat: 0,
      vx: 0,
      air: 0,
      airTotal: 1,
      spin: 0,
      boostT: 0,
      brakeT: 0,
      charges: MAX_CHARGES,
      chargeT: 0,
      wallCd: 0,
      shake: 0,
      finished: false,
      posText,
      speedText,
      icons,
      progressIcon,
      botX: 0,
      botWander: this.rng() * 10,
      botBrakeCd: 0,
    });
  }

  protected onStart(): void {
    this.say('Afsted ned ad bakken! Pas på svingene!');
    for (const s of this.sleds) {
      s.v = 250;
      s.boostBlok.cheer();
      this.time.delayedCall(800, () => s.boostBlok.idle());
    }
    this.sfx('whoosh');
  }

  protected play(dt: number): void {
    for (const s of this.sleds) this.updateSled(s, dt);
    // Placering
    const [a, b] = this.sleds;
    if (a && b) {
      const aFirst = a.d >= b.d;
      a.posText.setText(aFirst ? '1.' : '2.').setColor(aFirst ? C.sun : '#c8d2e8');
      b.posText.setText(aFirst ? '2.' : '1.').setColor(aFirst ? '#c8d2e8' : C.sun);
    }
    for (const s of this.sleds) this.renderSled(s, dt);
  }

  protected timeUp(): number[][] {
    if (this.winner !== null) return this.rankByTeam(this.winner);
    const [a, b] = this.sleds;
    const winner = Math.abs(a.d - b.d) < 5 ? null : a.d > b.d ? a.team : b.team;
    return this.rankByTeam(winner);
  }

  // ---------------------------------------------------------------------------
  // Fysik

  private updateSled(s: Sled, dt: number): void {
    s.wallCd = Math.max(0, s.wallCd - dt);
    s.shake = Math.max(0, s.shake - dt);
    if (s.finished) {
      s.v = Math.max(0, s.v - 700 * dt);
      s.d += s.v * dt;
      s.lat *= Math.exp(-2 * dt);
      return;
    }

    // Booster: 🚀 / 🛑
    const bslot = s.boost.slot;
    const ch = this.choice(bslot);
    if (ch === 0) this.tryBoost(s);
    if (ch === 1) this.brake(s);
    const bp = this.pad(bslot);
    if (bp.a && bp.choice === 1) s.brakeT = Math.max(s.brakeT, 0.12);
    s.boostT = Math.max(0, s.boostT - dt);
    s.brakeT = Math.max(0, s.brakeT - dt);
    if (s.charges < MAX_CHARGES) {
      s.chargeT += dt;
      if (s.chargeT >= RECHARGE) {
        s.chargeT = 0;
        s.charges++;
        const icon = s.icons[s.charges - 1];
        if (icon) {
          icon.setAlpha(1).setScale(1.1);
          this.tweens.add({ targets: icon, scale: 0.75, duration: 300, ease: 'Back.easeOut' });
        }
      }
    }

    // Fart
    let target = VMAX;
    let acc = ACC;
    if (s.boostT > 0) {
      target = VBOOST;
      acc = 1300;
    }
    if (s.brakeT > 0) {
      target = VBRAKE;
      acc = 1500;
    }
    if (s.air > 0) acc = 0;
    if (s.v < target) s.v = Math.min(target, s.v + acc * dt);
    else s.v = Math.max(target, s.v - (s.brakeT > 0 ? acc : 380) * dt);

    // Styring
    const slope = this.df(s.d);
    if (s.air <= 0 && s.spin <= 0) {
      const px = Phaser.Math.Clamp(this.pad(s.steer.slot).x, -1, 1);
      const want = px * VX_MAX + slope * s.v * ASSIST;
      s.vx += (want - s.vx) * Math.min(1, dt * 6);
      s.steerBlok.angle = px * 14;
    } else if (s.spin > 0) {
      s.vx += (slope * s.v - s.vx) * Math.min(1, dt * 3);
    }
    s.lat += (s.vx - slope * s.v) * dt;

    // Snevæggene
    if (Math.abs(s.lat) > LAT_MAX) {
      const side = Math.sign(s.lat);
      s.lat = side * LAT_MAX;
      const rel = s.vx - slope * s.v;
      if (s.air <= 0) {
        s.v = Math.max(200, s.v - 520 * dt);
        if (s.wallCd <= 0 && Math.abs(rel) > 160) {
          s.wallCd = 0.4;
          s.v *= 0.82;
          s.shake = 0.25;
          this.sfx('bonk', { volume: 0.7, pan: this.panFor(LANE_X[s.lane] + LCX) });
          this.fx.burst(LANE_X[s.lane] + LCX + this.f(s.d) + side * (LAT_MAX + 60), TUB_Y, { texture: TEX.puff, color: 0xffffff, count: 14, speed: 500, scale: 0.8, gravity: 600, lifespan: 600, depth: 5100 });
          this.vibrate(s.steer.slot, 80);
          this.stat(s.steer.slot, 'bonks');
          s.steerBlok.bonk();
          s.boostBlok.bonk();
          if (this.rng() < 0.25) this.say(this.rng() < 0.5 ? 'Bump! Ind i snevæggen!' : 'Hov, banen svinger altså!');
        } else if (this.rng() < dt * 12) {
          this.fx.burst(LANE_X[s.lane] + LCX + this.f(s.d) + side * (LAT_MAX + 50), TUB_Y + 10, { texture: TEX.puff, color: 0xffffff, count: 3, speed: 260, scale: 0.5, gravity: 400, lifespan: 400, depth: 5100 });
        }
      }
      s.vx = slope * s.v - side * 60;
    }

    const prevD = s.d;
    s.d += s.v * dt;

    // Hop og forhindringer
    for (const inst of s.feats) {
      const f = inst.f;
      if (f.d > s.d + 80) break;
      if (inst.hit) continue;
      if (f.kind === 'ramp' && prevD < f.d && s.d >= f.d) {
        inst.hit = true;
        if (s.air <= 0) {
          s.airTotal = s.air = 0.5 + s.v / 2200;
          this.sfx('jump', { pan: this.panFor(LANE_X[s.lane] + LCX) });
          this.sfx('boing', { volume: 0.5, delay: 0.05 });
          this.stat(s.steer.slot, 'jumps');
          this.fx.floatText(LANE_X[s.lane] + LCX + this.f(s.d) + s.lat, TUB_Y - 190, 'HOOOP!', C.sky, 64);
          this.stat(s.boost.slot, 'jumps');
          s.steerBlok.cheer();
          s.boostBlok.cheer();
        }
      } else if (f.kind === 'soap' && Math.abs(s.d - f.d) < 70 && Math.abs(s.lat - f.lat) < 85 && s.air <= 0) {
        inst.hit = true;
        s.v = Math.max(s.v, VBOOST + 120);
        s.boostT = Math.max(s.boostT, 0.9);
        this.sfx('powerup', { pan: this.panFor(LANE_X[s.lane] + LCX) });
        this.fx.burst(LANE_X[s.lane] + LCX + this.f(s.d) + s.lat, TUB_Y, { texture: TEX.dot, color: [0xffffff, 0xff9ccf, 0xbfe9ff], count: 18, speed: 420, scale: 0.6, gravity: -100, lifespan: 800, depth: 5100 });
        this.fx.floatText(LANE_X[s.lane] + LCX + this.f(s.d) + s.lat, TUB_Y - 160, 'SÆBE-TURBO!', C.bubblegum, 48);
        this.tweens.add({ targets: inst.obj, scale: 0, alpha: 0, duration: 260 });
      } else if ((f.kind === 'ice' || f.kind === 'duck') && Math.abs(s.d - f.d) < 55 && Math.abs(s.lat - f.lat) < 100 && s.air <= 0) {
        inst.hit = true;
        this.crash(s, inst);
      }
    }

    // Luftfart
    if (s.air > 0) {
      s.air -= dt;
      if (s.air <= 0) {
        s.air = 0;
        this.sfx('stomp', { pan: this.panFor(LANE_X[s.lane] + LCX) });
        this.fx.burst(LANE_X[s.lane] + LCX + this.f(s.d) + s.lat, TUB_Y + 60, { texture: TEX.puff, color: 0xffffff, count: 16, speed: 420, scale: 0.8, gravity: 300, lifespan: 600, depth: 5100 });
        s.tubC.setScale(1.25, 0.8);
        this.tweens.add({ targets: s.tubC, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.easeOut' });
        s.shake = 0.15;
        s.steerBlok.idle();
        s.boostBlok.idle();
      }
    }
    s.spin = Math.max(0, s.spin - dt);

    // Mål!
    if (s.d >= FINISH_D) this.cross(s);
  }

  private tryBoost(s: Sled): void {
    if (s.charges <= 0 || s.boostT > 0.3) {
      if (s.charges <= 0) this.sfx('wrong', { volume: 0.3 });
      return;
    }
    s.charges--;
    s.chargeT = 0;
    s.boostT = 1.3;
    const icon = s.icons[s.charges];
    if (icon) {
      this.tweens.add({ targets: icon, scale: 1.2, duration: 100, yoyo: true });
      icon.setAlpha(0.25);
    }
    this.sfx('powerup', { pitch: 1.3, pan: this.panFor(LANE_X[s.lane] + LCX) });
    this.sfx('whoosh', { delay: 0.05 });
    this.vibrate(s.boost.slot, 40);
    s.boostBlok.cheer();
    this.time.delayedCall(900, () => s.air <= 0 && s.boostBlok.idle());
    this.fx.floatText(LANE_X[s.lane] + LCX + this.f(s.d) + s.lat, TUB_Y - 170, 'BOOST!', C.sun, 52);
  }

  private brake(s: Sled): void {
    s.brakeT = 0.55;
    this.sfx('squeak', { volume: 0.5, pitch: 0.7, pan: this.panFor(LANE_X[s.lane] + LCX) });
    this.vibrate(s.boost.slot, 25);
    if (s.v > 500) this.fx.burst(LANE_X[s.lane] + LCX + this.f(s.d) + s.lat, TUB_Y + 90, { texture: TEX.puff, color: 0xffffff, count: 8, speed: 260, scale: 0.6, gravity: 200, lifespan: 500, depth: 5100 });
  }

  private crash(s: Sled, inst: FeatureInst): void {
    const duck = inst.f.kind === 'duck';
    s.v *= 0.45;
    s.spin = 0.7;
    s.shake = 0.35;
    s.boostT = 0;
    const x = LANE_X[s.lane] + LCX + this.f(s.d) + s.lat;
    this.sfx(duck ? 'quack' : 'crunch', { pan: this.panFor(x) });
    this.sfx('bonk', { delay: 0.04 });
    this.fx.stars(x, TUB_Y - 60, N.sun, 10);
    this.fx.burst(x, TUB_Y - 20, duck ? { texture: TEX.drop, color: [0xffe070, 0xffffff], count: 14, speed: 500, scale: 0.6 } : { texture: TEX.spark, color: [0xbfe9ff, 0xffffff], count: 18, speed: 600, scale: 0.7 });
    this.fx.floatText(x, TUB_Y - 180, duck ? 'RAP!' : 'KLONK!', duck ? C.sun : C.sky, 60);
    this.vibrate(s.steer.slot, 150);
    this.vibrate(s.boost.slot, 150);
    this.stat(s.steer.slot, 'falls');
    s.steerBlok.spinOut(1, 600);
    s.boostBlok.spinOut(1, 600);
    // Forhindringen flyver væk
    const side = inst.f.lat >= s.lat ? 1 : -1;
    this.tweens.add({ targets: inst.obj, x: inst.obj.x + side * 500, angle: side * 540, alpha: 0, duration: 700, ease: 'Quad.easeOut' });
    inst.obj.setData('flying', true);
    this.tweens.add({ targets: s.tubC, angle: { from: 0, to: 360 }, duration: 650, ease: 'Cubic.easeOut' });
    if (this.rng() < 0.6) this.say(duck ? 'Den stakkels badeand!' : 'Klonk! Lige ind i isklumpen!');
  }

  private cross(s: Sled): void {
    s.finished = true;
    const x = LANE_X[s.lane] + LCX;
    s.steerBlok.cheer();
    s.boostBlok.cheer();
    s.streaks.stop();
    if (this.winner === null) {
      this.winner = s.team;
      this.sfx('fanfare');
      this.say('Badekarret er i mål!');
      this.fx.confetti(1600);
      const t = title(this, x, 420, 'I MÅL!', 140, { color: C.sun }).setDepth(7600).setScale(0).setAngle(-6);
      this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.easeOut' });
      this.fx.floatText(x, 560, '1. PLADS!', TEAM_HEX[s.team], 64);
      const other = this.sleds.find((o) => o !== s);
      other?.steerBlok.sad();
      other?.boostBlok.sad();
      this.time.delayedCall(1800, () => this.finish(this.rankByTeam(s.team)));
    }
  }

  // ---------------------------------------------------------------------------
  // Tegning

  private renderSled(s: Sled, dt: number): void {
    const camD = s.d;
    const tubY = TUB_Y + Math.min(70, s.v * 0.05);
    const sy = (d: number) => tubY - (d - camD);
    const jitter = s.shake > 0 ? s.shake * 40 : 0;
    s.root.setPosition(LANE_X[s.lane] + (this.rng() - 0.5) * jitter, (this.rng() - 0.5) * jitter);

    s.snow.tilePositionY = -camD;
    s.snow.tilePositionX = 0;
    this.drawTrack(s, camD, tubY);

    // Start og mål
    s.startC.setPosition(LCX + this.f(60), sy(60)).setVisible(sy(60) < H + 220);
    const fy = sy(FINISH_D);
    s.finishC.setPosition(LCX + this.f(FINISH_D), fy).setVisible(fy > -40 && fy < H + 260);

    for (const inst of s.feats) {
      const y = sy(inst.f.d);
      const vis = y > -160 && y < H + 160;
      inst.obj.setVisible(vis);
      if (!vis || inst.obj.getData('flying')) continue;
      inst.obj.setPosition(LCX + this.f(inst.f.d) + inst.f.lat, y);
      if (inst.f.kind === 'ramp') inst.obj.setRotation(Math.atan(this.df(inst.f.d)) * 0.6);
    }
    for (const deco of s.decos) {
      const y = sy(deco.d);
      const vis = y > -60 && y < H + 260;
      deco.obj.setVisible(vis);
      if (!vis) continue;
      const tx = LCX + this.f(deco.d);
      const x = Phaser.Math.Clamp(tx + deco.off, 50, LANE_W - 50);
      // Skjul pynt der ville havne på banen (når banen svinger tæt på kanten)
      if (Math.abs(x - tx) < TW / 2 + WALL + 30) {
        deco.obj.setVisible(false);
        continue;
      }
      deco.obj.setPosition(x, y);
    }

    // Badekarret
    const x = LCX + this.f(s.d) + s.lat;
    const h = s.air > 0 ? Math.sin(Math.PI * (1 - s.air / s.airTotal)) * 120 : 0;
    s.shadow.setPosition(x + h * 0.3, tubY + 80 + h * 0.2).setDisplaySize(210 * (1 - h / 260), 50 * (1 - h / 260));
    s.tubC.setPosition(x, tubY - h);
    if (!this.tweens.isTweening(s.tubC)) {
      s.tubC.setScale(1 + h / 190);
      s.tubC.rotation = Phaser.Math.Clamp(Math.atan2(s.vx, Math.max(200, s.v)) * 0.7, -0.5, 0.5);
    }
    const boosting = s.boostT > 0;
    s.flame.setVisible(boosting);
    if (boosting) s.flame.setScale(0.6 + this.rng() * 0.25, 0.7 + this.rng() * 0.4);
    if (boosting || s.v > 1000) {
      if (!s.streaks.emitting) s.streaks.start();
    } else if (s.streaks.emitting) s.streaks.stop();

    // HUD
    s.speedText.setText(`${Math.round(s.v / 9)} KM/T`);
    const prog = Phaser.Math.Clamp(s.d / FINISH_D, 0, 1);
    s.progressIcon.y = 1010 - prog * 800;
    void dt;
  }

  private drawTrack(s: Sled, camD: number, tubY: number): void {
    const g = s.g;
    g.clear();
    const d0 = camD - (H - tubY) - 120;
    const d1 = camD + tubY + 120;
    const step = 24;
    const ds: number[] = [];
    for (let d = Math.floor(d0 / step) * step; d <= d1; d += step) ds.push(d);
    const cx = ds.map((d) => LCX + this.f(d));
    const ys = ds.map((d) => tubY - (d - camD));
    const band = (w: number, color: number, alpha = 1, dy = 0) => {
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < ds.length; i++) pts.push(new Phaser.Math.Vector2(cx[i] - w, ys[i] + dy));
      for (let i = ds.length - 1; i >= 0; i--) pts.push(new Phaser.Math.Vector2(cx[i] + w, ys[i] + dy));
      g.fillStyle(color, alpha).fillPoints(pts, true);
    };
    band(TW / 2 + WALL + 26, 0x6f8fc0, 0.25, 16);
    band(TW / 2 + WALL + 7, N.ink);
    band(TW / 2 + WALL, 0xf6faff);
    band(TW / 2 + 20, 0xc4e2fb);
    band(TW / 2 + 7, N.ink);
    band(TW / 2, 0x8fd0fb);
    band(TW / 2 - 46, 0xa8dcff);
    band(46, 0xc6ecff, 0.7);
    // Skispor
    for (const off of [-70, -50, 50, 70]) {
      g.lineStyle(4, 0x6fb6ea, 0.45);
      g.strokePoints(ds.map((_, i) => new Phaser.Math.Vector2(cx[i] + off, ys[i])));
    }
    // Røde/blå markeringer på væggene
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (((d % 192) + 192) % 192 !== 0) continue;
      const k = Math.floor(d / 192) % 2;
      g.fillStyle(k ? 0xff4b4b : 0x3d8bff, 1);
      g.fillRoundedRect(cx[i] - TW / 2 - WALL / 2 - 10, ys[i] - 18, 20, 36, 6);
      g.fillRoundedRect(cx[i] + TW / 2 + WALL / 2 - 10, ys[i] - 18, 20, 36, 6);
    }
    // Mållinje (tern)
    const fy = tubY - (FINISH_D - camD);
    if (fy > -60 && fy < H + 60) {
      const fx = LCX + this.f(FINISH_D);
      const n = 12;
      const sq = TW / n;
      for (let r = 0; r < 2; r++) {
        for (let k = 0; k < n; k++) {
          g.fillStyle((k + r) % 2 ? N.ink : 0xffffff, 1).fillRect(fx - TW / 2 + k * sq, fy - sq + r * sq, sq, sq);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Bots

  protected botInput(slot: number, dt: number): BotInput | null {
    const s = this.sleds.find((x) => x.steer.slot === slot || x.boost.slot === slot);
    if (!s || s.finished) return {};
    if (slot === s.steer.slot && s.steer.slot !== s.boost.slot) return this.botSteer(s, dt);
    if (slot === s.boost.slot && s.steer.slot !== s.boost.slot) return this.botBoost(s, dt);
    // Alene på holdet: styr og boost (sjældent)
    const st = this.botSteer(s, dt);
    const bo = this.botBoost(s, dt);
    return { ...st, ...(bo.tap ? bo : {}) };
  }

  private botSteer(s: Sled, dt: number): BotInput {
    s.botWander += dt;
    let target = Math.sin(s.botWander * 0.7) * 40;
    // Undvig forhindringer, søg sæbe
    for (const inst of s.feats) {
      const f = inst.f;
      if (f.d < s.d) continue;
      if (f.d > s.d + 900) break;
      if (inst.hit) continue;
      if ((f.kind === 'ice' || f.kind === 'duck') && f.d < s.d + 650) {
        if (Math.abs(f.lat - s.lat) < 130 || Math.abs(f.lat - target) < 130) {
          target = f.lat > 0 ? Math.max(-LAT_MAX, f.lat - 170) : Math.min(LAT_MAX, f.lat + 170);
        }
        break;
      }
      if (f.kind === 'soap') {
        target = f.lat;
        break;
      }
    }
    const look = this.df(s.d + s.v * 0.12);
    const vxWant = look * s.v + (target - s.lat) * 2.4;
    const want = Phaser.Math.Clamp((vxWant - look * s.v * ASSIST) / VX_MAX, -1, 1);
    s.botX += (want - s.botX) * Math.min(1, dt * 5);
    return { x: Phaser.Math.Clamp(s.botX + (this.rng() - 0.5) * 0.15, -1, 1), y: 0 };
  }

  private botBoost(s: Sled, dt: number): BotInput {
    s.botBrakeCd = Math.max(0, s.botBrakeCd - dt);
    // Hvor skarpt bliver det de næste meter?
    let maxSlope = 0;
    for (let d = s.d + 100; d < s.d + 900; d += 100) maxSlope = Math.max(maxSlope, Math.abs(this.df(d)));
    const need = maxSlope * s.v * (1 - ASSIST);
    if (need > VX_MAX * 0.8 && s.v > 560 && s.botBrakeCd <= 0) {
      s.botBrakeCd = 0.6;
      return { tap: true, choice: 1 };
    }
    let ahead = 0;
    for (let d = s.d + 200; d < s.d + 1500; d += 150) ahead = Math.max(ahead, Math.abs(this.df(d)));
    if (s.charges > 0 && s.boostT <= 0 && s.air <= 0 && ahead * VBOOST * (1 - ASSIST) < VX_MAX * 0.75 && this.rng() < dt * 1.2) {
      return { tap: true, choice: 0 };
    }
    return {};
  }
}
