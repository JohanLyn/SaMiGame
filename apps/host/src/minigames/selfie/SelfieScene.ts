import Phaser from 'phaser';
import { PLAYER_COLORS, shade } from '@samigame/shared';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, N, W } from '../../kit/theme';
import { TimerHud, body, label, nameTag, title } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  FRAME,
  PANEL,
  burstSvg,
  cameraSvg,
  canvasSvg,
  collarSvg,
  floorSvg,
  gloveSvg,
  goldFrameSvg,
  hairSvg,
  moteSvg,
  phoneFrameSvg,
  plaqueSvg,
  ropeSvg,
  screenBgSvg,
  shirtSvg,
  spotSvg,
  varnishSvg,
  wainscotSvg,
  wallpaperSvg,
  wigSvg,
} from './art';
import {
  HANDLES,
  REST,
  clampOffset,
  drawFace,
  faceGeometry,
  handlePos,
  similarity,
  zeroOffsets,
  type FacePalette,
  type HandleId,
  type Offsets,
  type V,
} from './face';

const DURATION = 30;
/** Ansigts-enhed i pixels på spillernes skærme. */
const U = 104;
/** Ansigts-enhed på maleriet. */
const PU = 80;
const PORTRAIT = { x: 960, y: 520 };
const FACE_Y = -8;
/** Grib-radius (U). */
const GRAB_R = 0.6;

const PANEL_POS: [number, number][] = [
  [330, 300],
  [1590, 300],
  [330, 790],
  [1590, 790],
];

const SITTERS = [
  { name: 'HERTUG SURMULE', year: 1743 },
  { name: 'GREVINDE GNAVEN', year: 1788 },
  { name: 'BARON VON BØVS', year: 1702 },
  { name: 'FRU SKEPTISK', year: 1811 },
  { name: 'BISKOP BITTERMANDEL', year: 1699 },
];

const PORTRAIT_PAL: FacePalette = {
  ink: 0x2a1708,
  skin: 0xe8c49a,
  skinShade: 0xc0926a,
  skinLight: 0xfff0d0,
  blush: 0xd06a5a,
  brow: 0x6a4a2a,
  mouth: 0x5a1a1a,
  tongue: 0xc06060,
  lip: 0xa04a3a,
  eyeWhite: 0xf6ecd6,
  pupil: 0x2a1708,
  line: 4,
  mustache: 0xd8d0c0,
};

function playerPalette(color: string): FacePalette {
  return {
    ink: N.ink,
    skin: 0xffd2a8,
    skinShade: 0xf0a77e,
    skinLight: 0xffffff,
    blush: 0xff6a8a,
    brow: Phaser.Display.Color.HexStringToColor(shade(color, -0.35)).color,
    mouth: 0x7a1030,
    tongue: 0xff7a9a,
    lip: 0xd04060,
    eyeWhite: 0xffffff,
    pupil: N.ink,
    line: 5,
  };
}

interface BotBrain {
  order: HandleId[];
  idx: number;
  phase: 'reach' | 'drag' | 'hold' | 'pause';
  finger: V;
  goal: V;
  wait: number;
  speed: number;
  error: number;
  pass: number;
}

interface Doc {
  player: PlayerView;
  slot: number;
  x: number;
  y: number;
  root: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Graphics;
  overlay: Phaser.GameObjects.Graphics;
  hair: Phaser.GameObjects.Image;
  glove: Phaser.GameObjects.Image;
  pal: FacePalette;
  target: Offsets;
  disp: Offsets;
  vel: Offsets;
  grabbed: HandleId | null;
  grabOff: V;
  finger: V;
  fingerDown: boolean;
  squeakCd: number;
  blinkT: number;
  wobble: number;
  score: number;
  bot: BotBrain;
}

/** Fingerposition på telefonen (0..1) → ansigts-koordinater (U). */
function padToFace(px: number, py: number): V {
  return { x: (px - 0.5) * 3.2, y: (py - 0.5) * 3.4 + 0.3 };
}
function faceToPad(v: V): V {
  return { x: v.x / 3.2 + 0.5, y: (v.y - 0.3) / 3.4 + 0.5 };
}

/**
 * SELFIE-KIRURGEN (alle mod alle, inspireret af Face Lift).
 * Et surt museumsportræt hænger i midten. Hver spiller former sit eget gummiansigt
 * ved at trække i bryn, næse, mundvige og hage. Efter 30 sek. afsløres ligheden i procent.
 */
export class SelfieScene extends MinigameScene {
  protected duration: number | null = null;
  protected music = 'silly' as const;
  private docs: Doc[] = [];
  private portraitOff: Offsets = zeroOffsets();
  private portraitG!: Phaser.GameObjects.Graphics;
  private portraitLook: V = { x: 0, y: 0 };
  private portraitLookTarget: V = { x: 0, y: 0 };
  private lookTimer = 0;
  private portraitBlink = 0;
  private sitter = SITTERS[0];
  private clock: TimerHud | null = null;
  private left = DURATION;
  private phase: 'play' | 'reveal' = 'play';
  private camera!: Phaser.GameObjects.Image;
  private dim: Phaser.GameObjects.Rectangle[] = [];
  private saidHalf = false;
  private saidTen = false;

  constructor() {
    super('selfie');
  }

  preload(): void {
    loadSvg(this, 'selfie-wall', wallpaperSvg(), 160, 160);
    loadSvg(this, 'selfie-wainscot', wainscotSvg(), 240, 260);
    loadSvg(this, 'selfie-floor', floorSvg(), 200, 100);
    loadSvg(this, 'selfie-frame', goldFrameSvg(), FRAME.w, FRAME.h);
    loadSvg(this, 'selfie-canvas', canvasSvg(), FRAME.canvasW, FRAME.canvasH);
    loadSvg(this, 'selfie-varnish', varnishSvg(), FRAME.canvasW, FRAME.canvasH);
    loadSvg(this, 'selfie-wig', wigSvg(), 360, 340);
    loadSvg(this, 'selfie-collar', collarSvg(), 330, 150);
    loadSvg(this, 'selfie-plaque', plaqueSvg(), 460, 104);
    loadSvg(this, 'selfie-rope', ropeSvg(), 1000, 220);
    loadSvg(this, 'selfie-spot', spotSvg(), 600, 1000);
    loadSvg(this, 'selfie-camera', cameraSvg(), 200, 120);
    loadSvg(this, 'selfie-mote', moteSvg(), 24, 24);
    for (const pc of PLAYER_COLORS) {
      const k = pc.hex.replace('#', '');
      loadSvg(this, `selfie-phone-${k}`, phoneFrameSvg(pc.hex), PANEL.w, PANEL.h);
      loadSvg(this, `selfie-screen-${k}`, screenBgSvg(pc.hex), PANEL.screenW, PANEL.screenH);
      loadSvg(this, `selfie-shirt-${k}`, shirtSvg(pc.hex), 360, 120);
      loadSvg(this, `selfie-hair-${k}`, hairSvg(pc.hex), 300, 150);
      loadSvg(this, `selfie-glove-${k}`, gloveSvg(pc.hex), 110, 130);
    }
    loadSvg(this, 'selfie-burst-good', burstSvg('#3ee6a8'), 220, 220);
    loadSvg(this, 'selfie-burst-mid', burstSvg('#ffcf3a'), 220, 220);
    loadSvg(this, 'selfie-burst-bad', burstSvg('#ff4b4b'), 220, 220);
  }

  protected setup(): void {
    this.docs = [];
    this.dim = [];
    this.phase = 'play';
    this.left = DURATION;
    this.saidHalf = false;
    this.saidTen = false;
    this.sitter = SITTERS[Math.floor(this.rng() * SITTERS.length)];
    this.portraitOff = this.makeTarget();

    this.buildMuseum();
    this.buildPortrait();
    for (const p of this.players) this.buildDoc(p);

    // Tegn ansigterne hvert frame (også under nedtællingen), logikken kører i play().
    let last = performance.now();
    const draw = () => {
      const now = performance.now();
      const dt = Math.min(0.1, ((now - last) / 1000) * this.speed);
      last = now;
      for (const d of this.docs) {
        this.springs(d, dt);
        this.drawDoc(d, dt);
      }
      this.drawPortrait(dt);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, draw);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, draw));
  }

  create(): void {
    super.create();
    // Panelerne sidder i hjørnerne – dæmp vignetten, så de ikke bliver mudrede.
    for (const c of this.children.list) {
      if (c instanceof Phaser.GameObjects.Image && c.texture.key === TEX.vignette) c.setAlpha(0.25);
    }
  }

  protected onStart(): void {
    this.clock = new TimerHud(this, W / 2, 86, DURATION);
    this.clock.set(DURATION);
    this.say('selfieStart', true);
    this.sfx('powerup');
  }

  // ---------------------------------------------------------------------------
  // Verden

  private makeTarget(): Offsets {
    const r = (a: number, b: number) => a + this.rng() * (b - a);
    const t = zeroOffsets();
    const variant = Math.floor(this.rng() * 3);
    // Sure, nedadvendte bryn
    t.browL = { x: r(0.06, 0.16), y: r(0.2, 0.34) };
    t.browR = { x: -r(0.06, 0.16), y: r(0.2, 0.34) };
    if (variant === 1) t.browR = { x: r(0, 0.1), y: -r(0.3, 0.42) }; // skeptisk: ét bryn hævet
    // Lang næse
    t.nose = { x: r(-0.18, 0.18), y: r(0.26, 0.42) };
    // Sur mund
    t.mouthL = { x: r(0.04, 0.14), y: r(0.26, 0.4) };
    t.mouthR = { x: -r(0.04, 0.14), y: r(0.26, 0.4) };
    if (variant === 2) t.mouthR = { x: r(0.1, 0.22), y: -r(0.05, 0.15) }; // skævt smil
    // Lang hage
    t.chin = { x: r(-0.15, 0.15), y: r(0.3, 0.48) };
    for (const h of HANDLES) t[h] = clampOffset(h, t[h]);
    return t;
  }

  private buildMuseum(): void {
    this.add.tileSprite(W / 2, 400, W, 800, 'selfie-wall').setDepth(-9000);
    // Lyse/mørke striber for dybde
    this.add.rectangle(W / 2, 30, W, 60, 0x2a0816, 0.6).setDepth(-8990);
    this.add.tileSprite(W / 2, 900, W, 260, 'selfie-wainscot').setDepth(-8900);
    this.add.tileSprite(W / 2, 1050, W, 80, 'selfie-floor').setDepth(-8890);
    this.add.rectangle(W / 2, 1012, W, 8, N.ink, 0.6).setDepth(-8880);

    // Spotlys der svajer let
    for (const [x, rot] of [[760, -14], [1160, 14]] as const) {
      const s = this.add.image(x, -20, 'selfie-spot').setOrigin(0.5, 0).setDepth(-8000).setAngle(rot).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55);
      this.tweens.add({ targets: s, angle: rot * 0.6, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: s, alpha: 0.4, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Støv i lyset
    const motes = this.add.particles(0, 0, 'selfie-mote', {
      x: { min: 640, max: 1280 },
      y: { min: 120, max: 900 },
      speedY: { min: -14, max: 14 },
      speedX: { min: -10, max: 10 },
      scale: { min: 0.3, max: 0.9 },
      alpha: { start: 0, end: 0.8, ease: 'Sine.easeInOut' },
      lifespan: 4000,
      frequency: 180,
      blendMode: Phaser.BlendModes.ADD,
    });
    motes.setDepth(-7000);

    // Overvågningskamera der holder øje
    this.camera = this.add.image(1225, 40, 'selfie-camera').setScale(0.6).setDepth(-6000).setOrigin(0.1, 0.4).setFlipX(true);
    this.tweens.add({ targets: this.camera, angle: { from: -18, to: 22 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Fløjlsreb foran maleriet
    this.add.image(PORTRAIT.x, 945, 'selfie-rope').setScale(0.6).setDepth(-500);
  }

  private buildPortrait(): void {
    const { x, y } = PORTRAIT;
    this.add.image(x, y, 'selfie-canvas').setDepth(-900);
    this.add.image(x, y + FRAME.canvasH / 2 - 75, 'selfie-collar').setDepth(-880);
    this.portraitG = this.add.graphics().setDepth(-870);
    this.add.image(x, y - 98, 'selfie-wig').setScale(0.78).setDepth(-860).setName('wig');
    this.add.image(x, y, 'selfie-varnish').setDepth(-850);
    this.add.image(x, y, 'selfie-frame').setDepth(-840);
    const plaque = this.add.image(x, y + FRAME.h / 2 + 62, 'selfie-plaque').setDepth(-830);
    title(this, x, plaque.y - 14, this.sitter.name, 34, { color: '#4a2a06', stroke: 0 }).setShadow(0, 2, '#fff3c0', 0, true, true).setDepth(-820);
    body(this, x, plaque.y + 22, `Olie på lærred · anno ${this.sitter.year}`, 22, { color: '#5a3a08' }).setDepth(-820);
    // "KOPIÉR MIG!"-skilt der vipper
    const sign = label(this, x + 190, y - FRAME.h / 2 + 10, 'KOPIÉR MIG!', 34, { color: C.sun }).setDepth(-800).setAngle(10);
    this.tweens.add({ targets: sign, angle: 16, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildDoc(p: PlayerView): void {
    const [x, y] = PANEL_POS[p.slot] ?? PANEL_POS[0];
    const k = p.color.replace('#', '');
    const tex = (base: string) => (this.textures.exists(`${base}-${k}`) ? `${base}-${k}` : `${base}-ff4d4d`);
    const root = this.add.container(x, y).setDepth(100 + p.slot);
    const screen = this.add.image(0, 4, tex('selfie-screen'));
    const shirt = this.add.image(0, 118, tex('selfie-shirt')).setOrigin(0.5, 0);
    const face = this.add.graphics();
    const hair = this.add.image(0, 0, tex('selfie-hair')).setOrigin(0.5, 0.78);
    const frame = this.add.image(0, 0, tex('selfie-phone'));
    const overlay = this.add.graphics();
    const rec = this.add.circle(-PANEL.screenW / 2 + 34, -PANEL.screenH / 2 + 34, 9, N.tomato).setStrokeStyle(3, N.ink);
    const recText = label(this, -PANEL.screenW / 2 + 74, -PANEL.screenH / 2 + 33, 'REC', 22, { color: C.cream });
    this.tweens.add({ targets: rec, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    const tag = nameTag(this, 0, PANEL.h / 2 - 6, p.name, p.color, 30);
    const glove = this.add.image(0, 0, tex('selfie-glove')).setOrigin(0.3, 0.05).setScale(0.8);
    root.add([screen, shirt, face, hair, frame, overlay, rec, recText, tag, glove]);
    this.fx.popIn(root, 120 * p.slot);

    const finger = { x: 1.3, y: 0.7 };
    const doc: Doc = {
      player: p,
      slot: p.slot,
      x,
      y,
      root,
      face,
      overlay,
      hair,
      glove,
      pal: playerPalette(p.color),
      target: zeroOffsets(),
      disp: zeroOffsets(),
      vel: zeroOffsets(),
      grabbed: null,
      grabOff: { x: 0, y: 0 },
      finger,
      fingerDown: false,
      squeakCd: 0,
      blinkT: 1 + this.rng() * 3,
      wobble: 0,
      score: 0,
      bot: this.newBrain(),
    };
    this.docs.push(doc);
    this.drawDoc(doc, 0);
  }

  private newBrain(): BotBrain {
    const order = [...HANDLES].sort(() => this.rng() - 0.5);
    return {
      order,
      idx: 0,
      phase: 'pause',
      finger: { x: 0.9, y: 0.55 },
      goal: { x: 0.88, y: 0.5 },
      wait: 0.3 + this.rng() * 0.8,
      speed: 0.75 + this.rng() * 0.45,
      error: 0.07 + this.rng() * 0.2,
      pass: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Spil

  protected play(dt: number): void {
    if (this.phase === 'play') {
      this.left = Math.max(0, this.left - dt);
      this.clock?.set(this.left);
      if (this.left <= 5 && Math.ceil(this.left) !== Math.ceil(this.left + dt) && this.left > 0) this.sfx('tick');
      if (!this.saidHalf && this.left < DURATION / 2) {
        this.saidHalf = true;
        this.say('grumpier');
      }
      if (!this.saidTen && this.left < 10) {
        this.saidTen = true;
        this.say('scalpels');
      }
      for (const d of this.docs) this.handleInput(d, dt);
      if (this.left <= 0) this.reveal();
    }
  }

  private handleInput(d: Doc, dt: number): void {
    const pad = this.pad(d.slot);
    const f = padToFace(pad.px, pad.py);
    // Glat cursor (telefonens touch kommer i ryk)
    d.finger.x += (f.x - d.finger.x) * Math.min(1, dt * 25);
    d.finger.y += (f.y - d.finger.y) * Math.min(1, dt * 25);
    d.squeakCd -= dt;

    if (pad.a && !d.fingerDown) {
      d.fingerDown = true;
      d.finger = { ...f };
      // Grib nærmeste håndtag
      let best: HandleId | null = null;
      let bestD = GRAB_R;
      for (const h of HANDLES) {
        const hp = handlePos(d.target, h);
        const dist = Math.hypot(hp.x - f.x, hp.y - f.y);
        if (dist < bestD) {
          bestD = dist;
          best = h;
        }
      }
      if (best) {
        d.grabbed = best;
        const hp = handlePos(d.target, best);
        d.grabOff = { x: hp.x - f.x, y: hp.y - f.y };
        this.sfx('squeak', { pitch: 1.3 + this.rng() * 0.4, volume: 0.5, pan: this.panFor(d.x) });
        this.vibrate(d.slot, 20);
        d.wobble = 1;
      } else {
        this.sfx('pop', { volume: 0.25, pitch: 1.6, pan: this.panFor(d.x) });
      }
    } else if (!pad.a && d.fingerDown) {
      d.fingerDown = false;
      if (d.grabbed) {
        const stretch = Math.hypot(d.target[d.grabbed].x, d.target[d.grabbed].y);
        this.sfx('boing', { volume: 0.25 + stretch * 0.5, pitch: 1.6 - stretch, pan: this.panFor(d.x) });
        this.stat(d.slot, 'hits');
        d.wobble = 1;
      }
      d.grabbed = null;
    }

    if (d.grabbed && pad.a) {
      const h = d.grabbed;
      const want = { x: f.x + d.grabOff.x - REST[h].x, y: f.y + d.grabOff.y - REST[h].y };
      const next = clampOffset(h, want);
      const moved = Math.hypot(next.x - d.target[h].x, next.y - d.target[h].y);
      d.target[h] = next;
      if (moved > 0.02 && d.squeakCd <= 0) {
        d.squeakCd = 0.11;
        const stretch = Math.hypot(next.x, next.y) / 0.6;
        this.sfx('squeak', { pitch: 0.5 + stretch * 0.9, volume: 0.18 + stretch * 0.2, pan: this.panFor(d.x) });
      }
    }
  }

  /** Gelé-fjedre: det viste ansigt følger målet med overshoot. */
  private springs(d: Doc, dt: number): void {
    const k = 320;
    const c = 15;
    const steps = Math.max(1, Math.ceil(dt / 0.016));
    const h2 = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (const h of HANDLES) {
        const v = d.vel[h];
        const p = d.disp[h];
        const t = d.target[h];
        v.x += ((t.x - p.x) * k - v.x * c) * h2;
        v.y += ((t.y - p.y) * k - v.y * c) * h2;
        p.x += v.x * h2;
        p.y += v.y * h2;
      }
    }
    d.wobble = Math.max(0, d.wobble - dt * 2.5);
  }

  private drawDoc(d: Doc, dt: number): void {
    const g = d.face;
    g.clear();
    const t = this.elapsed;
    const bob = Math.sin(t * 2.2 + d.slot) * 3;
    const cy = FACE_Y + bob;
    const cx = Math.sin(t * 1.3 + d.slot * 2) * 2;
    d.blinkT -= dt;
    if (d.blinkT < -0.12) d.blinkT = 1.5 + this.rng() * 3;

    // Hals
    const geo = faceGeometry(d.disp);
    const chinX = cx + geo.chin.x * U * 0.5;
    g.fillStyle(N.ink, 1).fillRoundedRect(chinX - U * 0.36 - 5, cy + U * 0.7, U * 0.72 + 10, U * 1.2, 20);
    g.fillStyle(d.pal.skinShade, 1).fillRoundedRect(chinX - U * 0.36, cy + U * 0.7, U * 0.72, U * 1.2, 16);

    const look = this.lookAt(d, cx, cy);
    drawFace(g, cx, cy, U, d.disp, d.pal, { look, blink: d.blinkT < 0 });

    // Hår følger issen
    const top = geo.outline[0];
    const wHead = geo.outline[5].x - geo.outline[15].x;
    d.hair.setPosition(cx + top.x * U, cy + top.y * U + 26).setScale((wHead * U * 1.22) / 300, 1 + d.wobble * 0.08 * Math.sin(t * 30));
    d.hair.setAngle((geo.browR.y - geo.browL.y) * 12);

    // Håndtag + cursor
    const o = d.overlay;
    o.clear();
    const color = d.player.colorNum;
    if (this.phase === 'play') {
      for (const h of HANDLES) {
        const hp = handlePos(d.disp, h);
        const x = cx + hp.x * U;
        const y = cy + hp.y * U;
        const grabbed = d.grabbed === h;
        const pulse = 1 + Math.sin(t * 6 + HANDLES.indexOf(h)) * 0.12;
        const r = (grabbed ? 15 : 10) * pulse;
        if (grabbed) o.fillStyle(color, 0.35).fillCircle(x, y, r * 2.2);
        o.fillStyle(N.ink, 1).fillCircle(x, y, r + 4);
        o.fillStyle(grabbed ? 0xffffff : color, 1).fillCircle(x, y, r);
        o.fillStyle(0xffffff, 0.8).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.3);
      }
      if (d.grabbed) {
        const hp = handlePos(d.disp, d.grabbed);
        const fx = cx + d.finger.x * U;
        const fy = cy + d.finger.y * U;
        o.lineStyle(4, color, 0.6).lineBetween(fx, fy, cx + hp.x * U, cy + hp.y * U);
      }
    }
    const gx = Phaser.Math.Clamp(cx + d.finger.x * U, -PANEL.screenW / 2 + 10, PANEL.screenW / 2 - 10);
    const gy = Phaser.Math.Clamp(cy + d.finger.y * U, -PANEL.screenH / 2 + 10, PANEL.screenH / 2 - 10);
    d.glove.setPosition(gx, gy).setScale(d.fingerDown ? 0.72 : 0.82).setAngle(d.fingerDown ? -8 : -18);
  }

  private lookAt(d: Doc, cx: number, cy: number): V {
    const dx = d.finger.x * U + cx - cx;
    const dy = d.finger.y * U + cy - (cy - 0.2 * U);
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, len / (U * 1.2));
    return { x: (dx / len) * k, y: (dy / len) * k };
  }

  private drawPortrait(dt: number): void {
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookTimer = 1.2 + this.rng() * 1.6;
      const d = this.docs[Math.floor(this.rng() * this.docs.length)];
      if (d) {
        const dx = d.x - PORTRAIT.x;
        const dy = d.y - PORTRAIT.y;
        const l = Math.hypot(dx, dy) || 1;
        this.portraitLookTarget = { x: dx / l, y: dy / l };
      }
    }
    this.portraitLook.x += (this.portraitLookTarget.x - this.portraitLook.x) * Math.min(1, dt * 6);
    this.portraitLook.y += (this.portraitLookTarget.y - this.portraitLook.y) * Math.min(1, dt * 6);
    this.portraitBlink -= dt;
    if (this.portraitBlink < -0.15) this.portraitBlink = 2 + this.rng() * 3;
    const g = this.portraitG;
    g.clear();
    drawFace(g, PORTRAIT.x, PORTRAIT.y - 4, PU, this.portraitOff, PORTRAIT_PAL, { look: this.portraitLook, blink: this.portraitBlink < 0 });
    const geo = faceGeometry(this.portraitOff);
    const wig = this.children.getByName('wig') as Phaser.GameObjects.Image | null;
    wig?.setPosition(PORTRAIT.x + geo.outline[0].x * PU, PORTRAIT.y - 4 + geo.outline[0].y * PU + 62);
  }

  // ---------------------------------------------------------------------------
  // Afsløring

  private reveal(): void {
    this.phase = 'reveal';
    this.clock?.destroy();
    this.clock = null;
    for (const d of this.docs) {
      d.grabbed = null;
      d.score = similarity(d.target, this.portraitOff);
      this.tweens.add({ targets: d.glove, alpha: 0, scale: 0, duration: 250, ease: 'Back.easeIn' });
    }
    this.sfx('whoosh');
    this.sfx('ding', { delay: 0.1 });
    this.say('scalpelsDown', true);
    void this.fx.banner('SKALPELLEN NED!', { color: C.sun, size: 150, hold: 900 }).then(() => this.revealNext(0));
  }

  private revealNext(i: number): void {
    const order = [...this.docs].sort((a, b) => a.score - b.score || a.slot - b.slot);
    if (i === 0) {
      // Mørklæg alle paneler – hver bliver tændt når den afsløres
      for (const d of this.docs) {
        const r = this.add.rectangle(d.x, d.y, PANEL.w, PANEL.h, N.night, 0.55).setDepth(400);
        r.setData('slot', d.slot);
        this.dim.push(r);
      }
      this.sfx('drumroll');
    }
    if (i >= order.length) {
      this.crownWinner(order);
      return;
    }
    const d = order[i];
    const last = i === order.length - 1;
    const dim = this.dim.find((r) => r.getData('slot') === d.slot);
    if (dim) this.tweens.add({ targets: dim, alpha: 0, duration: 250 });
    this.tweens.add({ targets: d.root, scale: 1.06, duration: 220, yoyo: true, ease: 'Quad.easeOut' });

    const tier = d.score >= 75 ? 'good' : d.score >= 50 ? 'mid' : 'bad';
    const badge = this.add.image(d.x + (d.slot % 2 ? -190 : 190), d.y - 120, `selfie-burst-${tier}`).setDepth(600).setScale(0);
    const num = title(this, badge.x, badge.y, '0%', 64, { color: C.cream }).setDepth(601).setScale(0);
    this.tweens.add({ targets: [badge, num], scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: badge, angle: 360, duration: 6000, repeat: -1 });
    const counter = { v: 0 };
    let lastTick = 0;
    this.tweens.add({
      targets: counter,
      v: d.score,
      duration: last ? 1700 : 1100,
      ease: last ? 'Cubic.easeOut' : 'Quad.easeOut',
      onUpdate: () => {
        const v = Math.round(counter.v);
        num.setText(`${v}%`);
        if (v - lastTick >= 5) {
          lastTick = v;
          this.sfx('tick', { pitch: 0.8 + v / 80, volume: 0.6 });
        }
      },
      onComplete: () => {
        num.setText(`${d.score}%`);
        this.fx.squash(num, 1.4, 0.7, 120);
        this.fx.squash(badge, 1.3, 0.8, 120);
        const comment =
          d.score >= 90 ? 'MESTERVÆRK!' : d.score >= 75 ? 'Flot kopi!' : d.score >= 60 ? 'Tja...' : d.score >= 45 ? 'Ligner en kartoffel' : 'HVEM ER DET?!';
        this.fx.floatText(d.x, d.y + 40, comment, tier === 'good' ? C.mint : tier === 'mid' ? C.sun : C.tomato, 50);
        if (tier === 'bad') {
          this.sfx('wrong');
          this.fx.shake(0.004, 150);
        } else {
          this.sfx(tier === 'good' ? 'coin' : 'ding', { pitch: 0.8 + d.score / 200 });
          this.fx.stars(badge.x, badge.y, tier === 'good' ? N.mint : N.sun, tier === 'good' ? 12 : 6);
        }
        this.time.delayedCall(last ? 700 : 450, () => this.revealNext(i + 1));
      },
    });
  }

  private crownWinner(order: Doc[]): void {
    const best = order[order.length - 1];
    const winners = this.docs.filter((d) => d.score === best.score);
    for (const w of winners) {
      const crown = this.add.image(w.x, w.y - PANEL.h / 2 - 10, TEX.crown).setDepth(700).setScale(0);
      this.tweens.add({ targets: crown, scale: 1.3, duration: 450, ease: 'Back.easeOut' });
      this.tweens.add({ targets: crown, angle: { from: -8, to: 8 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: w.root, angle: { from: -2, to: 2 }, duration: 180, yoyo: true, repeat: 5 });
      this.fx.burst(w.x, w.y, { texture: TEX.confetti, color: [N.sun, N.mint, N.bubblegum, w.player.colorNum], count: 40, speed: 700 });
    }
    this.sfx('fanfare');
    this.fx.confetti(1600);
    this.fx.flash(0xffffff, 160, 0.4);
    this.say(best.score >= 85 ? 'twin' : 'meh', true);
    // Portrættet blinker anerkendende
    this.portraitBlink = -0.01;
    this.time.delayedCall(1800, () => this.finish(this.rankByScore(this.players.map((p) => this.docs.find((d) => d.slot === p.slot)?.score ?? 0))));
  }

  // ---------------------------------------------------------------------------
  // Bots: tag håndtagene ét ad gangen, træk dem mod målet (med lidt sjusk), gentag.

  protected botInput(slot: number, dt: number): BotInput | null {
    const d = this.docs.find((x) => x.slot === slot);
    if (!d || this.phase !== 'play') return null;
    const b = d.bot;
    const moveTo = (goal: V, speed: number) => {
      const dx = goal.x - b.finger.x;
      const dy = goal.y - b.finger.y;
      const dist = Math.hypot(dx, dy);
      const step = speed * dt;
      if (dist <= step) {
        b.finger = { ...goal };
        return true;
      }
      b.finger.x += (dx / dist) * step + Math.sin(this.elapsed * 7 + slot) * 0.002;
      b.finger.y += (dy / dist) * step;
      return false;
    };
    const h = b.order[b.idx % b.order.length];
    if (b.phase === 'pause') {
      b.wait -= dt;
      moveTo(b.goal, b.speed * 0.3);
      if (b.wait <= 0) {
        b.phase = 'reach';
        b.goal = faceToPad(handlePos(d.target, h));
      }
      return { px: b.finger.x, py: b.finger.y, a: false };
    }
    if (b.phase === 'reach') {
      if (moveTo(b.goal, b.speed)) {
        b.phase = 'drag';
        const err = b.error * (b.pass === 0 ? 1 : 0.75);
        const tgt = this.portraitOff[h];
        const want = {
          x: REST[h].x + tgt.x + (this.rng() - 0.5) * 2 * err,
          y: REST[h].y + tgt.y + (this.rng() - 0.5) * 2 * err,
        };
        b.goal = faceToPad(want);
        return { px: b.finger.x, py: b.finger.y, a: true };
      }
      return { px: b.finger.x, py: b.finger.y, a: false };
    }
    if (b.phase === 'hold') {
      // Hold fingeren et øjeblik på målet, så trækket når at registreres
      b.wait -= dt;
      if (b.wait <= 0) {
        b.phase = 'pause';
        b.wait = 0.15 + this.rng() * 0.45;
        b.goal = { x: b.finger.x + (this.rng() - 0.5) * 0.1, y: b.finger.y + 0.05 };
      }
      return { px: b.finger.x, py: b.finger.y, a: b.phase === 'hold' };
    }
    // drag
    const done = moveTo(b.goal, b.speed * 0.55);
    if (done) {
      b.phase = 'hold';
      b.wait = 0.12;
      b.idx++;
      if (b.idx % b.order.length === 0) {
        b.pass++;
        b.order.sort(() => this.rng() - 0.5);
      }
      return { px: b.finger.x, py: b.finger.y, a: true };
    }
    return { px: b.finger.x, py: b.finger.y, a: true };
  }
}
