import Phaser from 'phaser';
import { addSvg, loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, N, W } from '../../kit/theme';
import { label } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  BOOK,
  FOODS,
  FOOD_COLOR,
  PW,
  SHAPES,
  Y_SQUASH,
  coverSvg,
  floorPageSvg,
  pageSvg,
  paperBitSvg,
  spineSvg,
  stackSvg,
  steamSvg,
  tableSvg,
  tileSvg,
  utensilSvg,
  type Hole,
} from './art';

const SPEED = 470;
const DASH = 1.9;
const RADIUS = 40;
const FLOOR = { x0: BOOK.x0 + 50, x1: BOOK.x1 - 50, y0: BOOK.HY + 45, y1: BOOK.HY + BOOK.D - 30 };
const MAX_PAGES = 16;

const RECIPES = [
  'Fiskefrikadeller', 'Banankage', 'Pølsehorn', 'Lagkage', 'Kyllingelår', 'Brunkager', 'Æblekage', 'Flæskesteg',
  'Risalamande', 'Rødgrød med fløde', 'Hindbærsnitter', 'Kanelsnegle', 'Leverpostej', 'Stegt flæsk', 'Hotdogs', 'Pandekager',
];

type Phase = 'idle' | 'lean' | 'fall' | 'lie' | 'lift';

let ctx2d: CanvasRenderingContext2D | null = null;
const paths = new Map<string, Path2D>();
function hitCtx(): CanvasRenderingContext2D {
  if (!ctx2d) ctx2d = document.createElement('canvas').getContext('2d');
  return ctx2d as CanvasRenderingContext2D;
}
function shapePath(kind: Hole['kind']): Path2D {
  let p = paths.get(kind);
  if (!p) {
    p = new Path2D(SHAPES[kind].path);
    paths.set(kind, p);
  }
  return p;
}

/** Tæller pr. opstart, så side-teksturerne altid matcher de huller der er udregnet denne gang. */
let RUN = 0;

interface Runner {
  player: PlayerView;
  slot: number;
  blok: Blok;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dash: number;
  dashCd: number;
  out: boolean;
  flat: boolean;
  // bot
  target: { x: number; y: number } | null;
  react: number;
  skill: number;
  wander: number;
}

interface PageData {
  index: number;
  holes: Hole[];
  front: string;
  back: string;
  ready: boolean;
}

/**
 * POP-UP KOGEBOGEN (alle mod alle, inspireret af Booksquirm).
 * Kæmpe kogebogs-sider vælter ned over spillerne. Stå i et udstanset mad-hul når siden smækker – ellers pandekage!
 * Skyggen på gulvet viser hvor hullerne lander. Hullerne bliver færre og mindre. Sidste overlevende vinder.
 */
export class KogebogScene extends MinigameScene {
  protected duration: number | null = null;
  protected music = 'tense' as const;

  private runners: Runner[] = [];
  private outs: number[][] = [];
  private pages: PageData[] = [];
  private pageNo = 0;
  private phase: Phase = 'idle';
  private phaseT = 0;
  private phaseLen = 0;
  private theta = 0;
  private page!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private pageTitle!: Phaser.GameObjects.Text;
  private warn!: Phaser.GameObjects.Text;
  private ended = false;

  constructor() {
    super('kogebog');
  }

  preload(): void {
    loadSvg(this, 'kb-floor', floorPageSvg(), PW, BOOK.D);
    loadSvg(this, 'kb-stack', stackSvg(), PW + 30, BOOK.UP + 30);
    loadSvg(this, 'kb-cover-back', coverSvg(PW + 70, BOOK.UP + 70), PW + 70, BOOK.UP + 70);
    loadSvg(this, 'kb-cover-front', coverSvg(PW + 70, BOOK.D + 60), PW + 70, BOOK.D + 60);
    loadSvg(this, 'kb-spine', spineSvg(), PW + 120, 60);
    loadSvg(this, 'kb-tile', tileSvg(), 100, 100);
    loadSvg(this, 'kb-table', tableSvg(), 1920, 240);
    loadSvg(this, 'kb-ske', utensilSvg('ske'), 90, 360);
    loadSvg(this, 'kb-pande', utensilSvg('pande'), 200, 360);
    loadSvg(this, 'kb-steam', steamSvg(), 100, 100);
    loadSvg(this, 'kb-bit', paperBitSvg(), 30, 24);
    // De første to sider tegnes på forhånd (de næste laves løbende).
    RUN++;
    // Ryd sider fra en tidligere runde af spillet
    for (const key of this.textures.getTextureKeys()) if (/^kb-(front|back)-/.test(key)) this.textures.remove(key);
    this.pages = [];
    for (let i = 0; i < 2; i++) {
      const p = this.makePage(i, 4);
      loadSvg(this, p.front, pageSvg(p.holes, true, i + 1), PW, BOOK.D);
      loadSvg(this, p.back, pageSvg(p.holes, false, i + 1), PW, BOOK.D);
      p.ready = true;
      this.pages.push(p);
    }
  }

  protected setup(): void {
    this.runners = [];
    this.outs = [];
    this.pageNo = 0;
    this.phase = 'idle';
    this.theta = 0;
    this.ended = false;

    this.buildKitchen();

    this.shadow = this.add.image(W / 2, BOOK.HY, this.pages[0].back).setOrigin(0.5, 0).setTint(0x000000).setAlpha(0).setDepth(-6000);
    this.page = this.add.image(W / 2, BOOK.HY, this.pages[0].front).setOrigin(0.5, 1).setDepth(-6700);
    this.setTheta(0);
    this.pageTitle = label(this, W / 2, BOOK.HY - BOOK.UP + 27, '', 30, { color: C.ink, stroke: 0 }).setShadow(0, 0, C.ink, 0).setDepth(-6690);
    this.setPageTitle();
    this.warn = label(this, W / 2, BOOK.HY, '', 58, { color: C.sun, stroke: 10 }).setDepth(7000).setAlpha(0);

    const starts = [
      [0.2, 0.35],
      [0.8, 0.35],
      [0.35, 0.8],
      [0.65, 0.8],
    ];
    for (const p of this.players) {
      const [sx, sy] = starts[p.slot] ?? [0.5, 0.5];
      const x = FLOOR.x0 + (FLOOR.x1 - FLOOR.x0) * sx;
      const y = FLOOR.y0 + (FLOOR.y1 - FLOOR.y0) * sy;
      const blok = this.spawnBlok(p, x, y, { size: 0.6 });
      blok.setDepth(y);
      this.runners.push({
        player: p,
        slot: p.slot,
        blok,
        x,
        y,
        vx: 0,
        vy: 0,
        dash: 0,
        dashCd: 0,
        out: false,
        flat: false,
        target: null,
        react: 0,
        skill: 0.55 + this.rng() * 0.4,
        wander: this.rng() * 10,
      });
    }
  }

  protected onStart(): void {
    this.say('Stå i hullerne, ellers bliver I til pandekager!', true);
    this.startPage();
  }

  // ---------------------------------------------------------------------------
  // Køkken

  private buildKitchen(): void {
    this.add.tileSprite(W / 2, 400, W, 800, 'kb-tile').setDepth(-9500);
    this.add.rectangle(W / 2, 400, W, 800, 0x2a1f7a, 0.25).setDepth(-9400);
    this.add.image(W / 2, 1000, 'kb-table').setDepth(-9000);
    // Hængende redskaber der svajer
    const hang: [number, string, number][] = [
      [80, 'kb-pande', 0.9],
      [190, 'kb-ske', 0.9],
      [1740, 'kb-ske', 0.9],
      [1850, 'kb-pande', 0.8],
    ];
    this.add.rectangle(W / 2, 22, W, 16, 0x8a93a8).setStrokeStyle(4, N.ink).setDepth(-8600);
    hang.forEach(([x, key, s], i) => {
      const u = this.add.image(x, 20, key).setOrigin(0.5, 0.03).setScale(s).setDepth(-8500);
      this.tweens.add({ targets: u, angle: { from: -5, to: 5 }, duration: 1600 + i * 230, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    // Damp fra gryder uden for billedet
    for (const x of [110, 1810]) {
      const steam = this.add.particles(x, 1080, 'kb-steam', {
        x: { min: -60, max: 60 },
        speedY: { min: -160, max: -80 },
        speedX: { min: -20, max: 20 },
        scale: { start: 0.6, end: 2 },
        alpha: { start: 0.45, end: 0 },
        lifespan: 2600,
        frequency: 240,
      });
      steam.setDepth(-8400);
    }
    // Bogen
    this.add.image(W / 2, BOOK.HY + BOOK.D / 2 + 14, 'kb-cover-front').setDepth(-7100);
    this.add.image(W / 2, BOOK.HY + BOOK.D / 2, 'kb-floor').setDepth(-7000);
    this.add.image(W / 2, BOOK.HY - BOOK.UP / 2 - 12, 'kb-cover-back').setDepth(-7200);
    this.add.image(W / 2, BOOK.HY + 8, 'kb-stack').setOrigin(0.5, 1).setDepth(-6900);
    this.add.image(W / 2, BOOK.HY + 4, 'kb-spine').setDepth(-6650);
  }

  // ---------------------------------------------------------------------------
  // Sider

  private makePage(index: number, alive: number): PageData {
    const rand = () => Math.random();
    const count = index === 0 ? Math.max(alive, 3) : Math.max(1, Math.min(4, alive - (index >= 2 ? 1 : 0) - (index >= 6 ? 1 : 0)));
    const s = Math.max(78, 150 - index * 9);
    const holes: Hole[] = [];
    for (let tries = 0; holes.length < count && tries < 400; tries++) {
      const kind = FOODS[Math.floor(rand() * FOODS.length)];
      const x = BOOK.x0 + s + 40 + rand() * (PW - 2 * s - 80);
      const y = BOOK.HY + s * Y_SQUASH + 60 + rand() * (BOOK.D - 2 * s * Y_SQUASH - 110);
      if (holes.some((h) => Math.hypot(h.x - x, (h.y - y) / Y_SQUASH) < (h.s + s) * 1.05 + 30)) continue;
      holes.push({ kind, x, y, s, rot: (rand() - 0.5) * 40 });
    }
    return { index, holes, front: `kb-front-${RUN}-${index}`, back: `kb-back-${RUN}-${index}`, ready: false };
  }

  private ensurePage(index: number): PageData {
    let p = this.pages[index];
    if (!p) {
      p = this.makePage(index, this.runners.filter((r) => !r.out).length);
      this.pages[index] = p;
      const data = p;
      void Promise.all([
        addSvg(this, p.front, pageSvg(p.holes, true, index + 1), PW, BOOK.D),
        addSvg(this, p.back, pageSvg(p.holes, false, index + 1), PW, BOOK.D),
      ]).then(() => (data.ready = true));
    }
    return p;
  }

  /** Frigør teksturerne for en gammel side. */
  private dropPage(index: number): void {
    const p = this.pages[index];
    if (!p || index < 0) return;
    for (const key of [p.front, p.back]) if (this.textures.exists(key)) this.textures.remove(key);
  }

  private setPageTitle(): void {
    const p = this.pages[this.pageNo];
    const food = p?.holes[0]?.kind ?? 'fisk';
    this.pageTitle.setText(`Side ${this.pageNo + 1}  ·  ${RECIPES[this.pageNo % RECIPES.length]}`).setAlpha(1);
    this.pageTitle.setColor(C.ink);
    void food;
  }

  private startPage(): void {
    const p = this.ensurePage(this.pageNo);
    this.ensurePage(this.pageNo + 1);
    if (!p.ready) {
      // Vent et øjeblik på at teksturen er klar
      this.phase = 'idle';
      this.phaseT = 0;
      this.phaseLen = 0.2;
      return;
    }
    this.page.setTexture(p.front).setAlpha(1).clearTint();
    this.shadow.setTexture(p.back).setAlpha(0);
    this.setTheta(0);
    this.setPageTitle();
    this.fx.squash(this.page, 1, 1.06, 120);
    this.phase = 'lean';
    this.phaseT = 0;
    const k = Math.min(1, this.pageNo / 9);
    this.phaseLen = 1.5 - k * 0.6;
    this.sfx('swish', { pitch: 0.7 });
    this.warn.setText(this.pageNo === 0 ? 'Stil dig i skyggens huller!' : `Side ${this.pageNo + 1} vælter!`).setAlpha(1).setScale(0);
    this.tweens.add({ targets: this.warn, scale: 1, duration: 300, ease: 'Back.easeOut' });
    for (const r of this.runners) {
      r.react = 0.15 + (1 - r.skill) * 0.9 + this.rng() * 0.25;
      r.target = null;
    }
    if (this.pageNo === 5) this.say('Hullerne bliver mindre!');
  }

  /** Vinkel 0 = siden står op, 90 = fladt på gulvet. */
  private setTheta(deg: number): void {
    this.theta = deg;
    const a = (deg * Math.PI) / 180;
    const ext = -BOOK.UP * Math.cos(a) + BOOK.D * Math.sin(a);
    const p = this.pages[this.pageNo];
    if (ext < 0) {
      if (p && this.page.texture.key !== p.front) this.page.setTexture(p.front);
      this.page.setOrigin(0.5, 1).setScale(1, Math.max(0.01, -ext / BOOK.D));
      this.pageTitle?.setY(BOOK.HY - (BOOK.D - 45) * this.page.scaleY).setScale(1, Math.min(1, this.page.scaleY / (BOOK.UP / BOOK.D)));
      this.page.setDepth(deg < 1 ? -6700 : 5000);
      // Siden bliver mørkere jo mere den vender væk fra lyset
      const shade = Math.round(255 * (1 - Math.min(0.45, deg / 80)));
      this.page.setTint(Phaser.Display.Color.GetColor(shade, shade, shade));
    } else {
      if (p && this.page.texture.key !== p.back) this.page.setTexture(p.back);
      this.page.setOrigin(0.5, 0).setScale(1, Math.max(0.01, ext / BOOK.D));
      this.page.setDepth(5000);
      const shade = Math.round(255 * (0.6 + 0.4 * Math.min(1, deg / 90)));
      this.page.setTint(Phaser.Display.Color.GetColor(shade, shade, shade));
    }
  }

  // ---------------------------------------------------------------------------
  // Spil

  protected play(dt: number): void {
    this.updatePage(dt);
    this.moveRunners(dt);
  }

  private updatePage(dt: number): void {
    if (this.ended) return;
    this.phaseT += dt;
    const t = Math.min(1, this.phaseT / Math.max(0.01, this.phaseLen));
    switch (this.phase) {
      case 'idle':
        if (t >= 1) this.startPage();
        break;
      case 'lean': {
        // Siden vipper ivrigt frem og tilbage
        this.setTheta(Math.abs(Math.sin(this.phaseT * 9)) * (4 + t * 8));
        this.shadow.setAlpha(0.12 + t * 0.25);
        // Knirk når siden vipper
        if (Math.sin(this.phaseT * 9) * Math.sin((this.phaseT - dt) * 9) < 0) this.sfx('squeak', { pitch: 0.4 + t * 0.3, volume: 0.25 });
        if (t >= 1) {
          this.phase = 'fall';
          this.phaseT = 0;
          const k = Math.min(1, this.pageNo / 9);
          this.phaseLen = 1.35 - k * 0.4;
          this.sfx('whoosh', { pitch: 0.6, volume: 1.2 });
          this.tweens.add({ targets: this.pageTitle, alpha: 0, duration: 200 });
        }
        break;
      }
      case 'fall': {
        const e = t * t;
        this.setTheta(8 + 82 * e);
        this.shadow.setAlpha(0.3 + 0.35 * e);
        this.pageTitle.setVisible(this.theta < 20);
        if (t >= 1) this.slam();
        break;
      }
      case 'lie':
        if (t >= 1) {
          this.phase = 'lift';
          this.phaseT = 0;
          this.phaseLen = 0.55;
          this.sfx('swish');
          this.peelFlat();
        }
        break;
      case 'lift': {
        this.setTheta(90 - 50 * t);
        this.page.setAlpha(1 - t);
        this.shadow.setAlpha(0.6 * (1 - t));
        if (t >= 1) {
          for (const r of this.runners) if (!r.out) r.blok.setDepth(r.y);
          this.pageTitle.setVisible(true);
          if (this.checkEnd()) return;
          this.dropPage(this.pageNo - 1);
          this.pageNo++;
          this.phase = 'idle';
          this.phaseT = 0;
          this.phaseLen = 0.35;
        }
        break;
      }
    }
  }

  private slam(): void {
    this.setTheta(90);
    this.phase = 'lie';
    this.phaseT = 0;
    this.phaseLen = 0.75;
    this.warn.setAlpha(0);
    const holes = this.pages[this.pageNo].holes;

    // Hvem står i et hul? (huller med plads til 1 – eller 2 hvis de er store)
    const safe = new Set<number>();
    holes.forEach((h, hi) => {
      const cap = h.s >= 125 ? 2 : 1;
      const inside = this.runners
        .filter((r) => !r.out && this.inHole(r.x, r.y, h))
        .map((r) => ({ r, d: Math.hypot(r.x - h.x, r.y - h.y) }))
        .sort((a, b) => a.d - b.d);
      inside.slice(0, cap).forEach(({ r }) => safe.add(r.slot));
      void hi;
    });

    const squashed: Runner[] = [];
    for (const r of this.runners) {
      if (r.out) continue;
      if (safe.has(r.slot)) {
        r.blok.setDepth(6000 + r.y);
        r.blok.squash(1.3, 0.7);
        this.time.delayedCall(150, () => r.blok.cheer());
        this.time.delayedCall(900, () => r.blok.idle());
      } else {
        squashed.push(r);
        r.out = true;
        r.flat = true;
        r.blok.setDepth(r.y);
        this.tweens.killTweensOf(r.blok);
        r.blok.setScale(1.6, 0.12);
        this.stat(r.slot, 'falls');
        this.vibrate(r.slot, 400);
      }
    }
    if (squashed.length) this.outs.push(squashed.map((r) => r.slot));

    // SMÆK!
    const smack = label(this, W / 2, BOOK.HY + 200, 'SMÆK!', 150, { color: C.cream }).setDepth(8000).setAngle(-6).setScale(0.3);
    this.tweens.add({ targets: smack, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: smack, alpha: 0, scale: 1.3, delay: 450, duration: 300, onComplete: () => smack.destroy() });
    this.sfx('stomp', { volume: 1.4 });
    this.sfx('crunch', { pitch: 0.6, delay: 0.03 });
    this.fx.shake(0.016, 320);
    this.hitstop(70);
    this.fx.flash(0xffffff, 120, 0.3);
    for (let i = 0; i < 9; i++) {
      const x = BOOK.x0 + (PW * i) / 8;
      this.fx.dust(x, BOOK.HY + BOOK.D + 4, 6);
    }
    this.fx.burst(W / 2, BOOK.HY + BOOK.D, { texture: 'kb-bit', count: 16, speed: 700, gravity: 1200, scale: 1, depth: 7000 });
    for (const h of holes) {
      this.fx.burst(h.x, h.y, { texture: TEX.star, color: Phaser.Display.Color.HexStringToColor(FOOD_COLOR[h.kind]).color, count: 4, speed: 300, scale: 0.4, depth: 7000 });
    }
    if (squashed.length) {
      this.sfx('splat', { delay: 0.05, volume: 1.2 });
      for (const r of squashed) this.fx.floatText(r.x, r.y - 80, 'PANDEKAGE!', C.tomato, 46);
      this.say(squashed.length > 1 ? 'Dobbelt-pandekage!' : 'ouch');
    } else {
      this.sfx('ding', { delay: 0.1 });
      this.fx.floatText(W / 2, BOOK.HY + BOOK.D - 110, 'ALLE KLAREDE DEN!', C.mint, 60);
    }
  }

  private peelFlat(): void {
    for (const r of this.runners) {
      if (!r.flat) continue;
      r.flat = false;
      const b = r.blok;
      this.time.delayedCall(450, () => {
        this.sfx('whoosh', { pitch: 1.4, pan: this.panFor(r.x) });
        this.tweens.add({ targets: b, y: b.y - 520, x: b.x + (this.rng() - 0.5) * 300, angle: (this.rng() < 0.5 ? -1 : 1) * 540, alpha: 0, duration: 1300, ease: 'Sine.easeIn' });
        this.tweens.add({ targets: b, scaleY: 0.35, duration: 400, yoyo: true, repeat: 1 });
      });
    }
  }

  /** Præcis test: står punktet i hullets SVG-form (samme sti som tegnes)? `margin` i px. */
  private inHole(x: number, y: number, h: Hole, margin = 9): boolean {
    const test = (px: number, py: number) => {
      const a = (-h.rot * Math.PI) / 180;
      const lx = (px - h.x) / h.s;
      const ly = (py - h.y) / (h.s * Y_SQUASH);
      const rx = lx * Math.cos(a) - ly * Math.sin(a);
      const ry = lx * Math.sin(a) + ly * Math.cos(a);
      return hitCtx().isPointInPath(shapePath(h.kind), rx, ry);
    };
    if (!test(x, y)) return false;
    if (margin <= 0) return true;
    const my = margin * Y_SQUASH;
    return test(x - margin, y) && test(x + margin, y) && test(x, y - my) && test(x, y + my);
  }

  private checkEnd(): boolean {
    const alive = this.runners.filter((r) => !r.out);
    if (alive.length > 1 && this.pageNo + 1 < MAX_PAGES) return false;
    this.ended = true;
    this.phase = 'idle';
    for (const r of alive) {
      r.blok.cheer();
      this.fx.floatText(r.x, r.y - 200, 'OVERLEVER!', C.sun, 60);
    }
    if (alive.length) {
      this.sfx('cheer');
      this.fx.confetti(1400);
    }
    const ranking: number[][] = [];
    if (alive.length) ranking.push(alive.map((r) => r.slot));
    for (let i = this.outs.length - 1; i >= 0; i--) ranking.push(this.outs[i]);
    this.time.delayedCall(900, () => this.finish(ranking));
    return true;
  }

  private moveRunners(dt: number): void {
    const canMove = this.phase !== 'lie' && !this.ended;
    for (const r of this.runners) {
      if (r.out) continue;
      const pad = this.pad(r.slot);
      r.dashCd = Math.max(0, r.dashCd - dt);
      r.dash = Math.max(0, r.dash - dt);
      if (canMove && this.pressedA(r.slot) && r.dashCd <= 0) {
        r.dash = 0.35;
        r.dashCd = 1.1;
        r.blok.hop(70, 200);
        this.sfx('jump', { pan: this.panFor(r.x) });
        this.fx.dust(r.x, r.y, 6);
        this.stat(r.slot, 'jumps');
      }
      const sp = SPEED * (r.dash > 0 ? DASH : 1);
      const ix = canMove ? pad.x : 0;
      const iy = canMove ? pad.y : 0;
      const len = Math.hypot(ix, iy);
      const nx = len > 1 ? ix / len : ix;
      const ny = len > 1 ? iy / len : iy;
      r.vx += (nx * sp - r.vx) * Math.min(1, dt * 12);
      r.vy += (ny * sp * 0.8 - r.vy) * Math.min(1, dt * 12);
      r.x = Phaser.Math.Clamp(r.x + r.vx * dt, FLOOR.x0, FLOOR.x1);
      r.y = Phaser.Math.Clamp(r.y + r.vy * dt, FLOOR.y0, FLOOR.y1);
    }
    // Skub hinanden
    const alive = this.runners.filter((r) => !r.out);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        const dx = b.x - a.x;
        const dy = (b.y - a.y) * 1.4;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= RADIUS * 2) continue;
        const push = (RADIUS * 2 - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= ((dy / d) * push) / 1.4;
        b.x += (dx / d) * push;
        b.y += ((dy / d) * push) / 1.4;
        if (Math.hypot(a.vx - b.vx, a.vy - b.vy) > 500 && this.rng() < 0.3) {
          this.sfx('bonk', { volume: 0.4, pan: this.panFor(a.x) });
          a.blok.bonk();
          b.blok.bonk();
          this.stat(a.dash > 0 ? a.slot : b.slot, 'bonks');
        }
      }
    }
    for (const r of this.runners) {
      if (r.out) continue;
      r.blok.setPosition(r.x, r.y);
      if (this.phase === 'idle' || this.phase === 'lean') r.blok.setDepth(r.y);
      else if (r.blok.depth < 5000) r.blok.setDepth(r.y);
      r.blok.walk(r.vx / SPEED, r.vy / SPEED, dt * 1000 * 1.4);
    }
  }

  // ---------------------------------------------------------------------------
  // Bots: find et hul (helst et uden andre i), løb derhen, hop hvis det haster.

  protected botInput(slot: number, dt: number): BotInput | null {
    const r = this.runners.find((x) => x.slot === slot);
    if (!r || r.out) return null;
    const page = this.pages[this.pageNo];
    if (!page || (this.phase !== 'lean' && this.phase !== 'fall')) {
      // Slentr lidt rundt mellem siderne
      r.wander += dt;
      return { x: Math.sin(r.wander * 1.3 + slot) * 0.3, y: Math.cos(r.wander * 0.9) * 0.25, a: false };
    }
    r.react -= dt;
    if (r.react > 0) return { x: 0, y: 0, a: false };
    if (!r.target) r.target = this.pickHole(r, page.holes);
    const dx = r.target.x - r.x;
    const dy = r.target.y - r.y;
    const d = Math.hypot(dx, dy);
    if (d < 14) return { x: 0, y: 0, a: false };
    const urgent = this.phase === 'fall' && d > 160;
    const slow = d < 60 ? d / 60 : 1;
    return { x: (dx / d) * slow, y: ((dy / d) * slow) / 0.8, a: urgent && r.dashCd <= 0 && this.rng() < 0.2 };
  }

  private pickHole(r: Runner, holes: Hole[]): { x: number; y: number } {
    const others = this.runners.filter((o) => !o.out && o !== r);
    let best = holes[0];
    let bestScore = Infinity;
    for (const h of holes) {
      const cap = h.s >= 125 ? 2 : 1;
      const claimed = others.filter((o) => (o.target && Math.hypot(o.target.x - h.x, o.target.y - h.y) < h.s) || this.inHole(o.x, o.y, h)).length;
      const dist = Math.hypot(h.x - r.x, h.y - r.y);
      // Dårlige bots ser ikke efter om hullet er optaget
      const crowd = claimed >= cap ? (r.skill > 0.7 ? 900 : 250) : claimed * 120;
      const score = dist + crowd + this.rng() * 120 * (1 - r.skill);
      if (score < bestScore) {
        bestScore = score;
        best = h;
      }
    }
    // Sigt efter et punkt der med sikkerhed er inde i hullet (lidt sjusk for dårlige bots)
    const a = (best.rot * Math.PI) / 180;
    const cands = SHAPES[best.kind].circles
      .map(([cx, cy]) => ({
        x: best.x + (cx * Math.cos(a) - cy * Math.sin(a)) * best.s,
        y: best.y + (cx * Math.sin(a) + cy * Math.cos(a)) * best.s * Y_SQUASH,
      }))
      .filter((p) => this.inHole(p.x, p.y, best, 22));
    const pick = cands.length ? cands[Math.floor(this.rng() * cands.length)] : { x: best.x, y: best.y };
    const err = (1 - r.skill) * 26;
    return { x: pick.x + (this.rng() - 0.5) * err, y: pick.y + (this.rng() - 0.5) * err * Y_SQUASH };
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
