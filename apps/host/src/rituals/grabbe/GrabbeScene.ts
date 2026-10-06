import Phaser from 'phaser';
import type { BotInput, PlayerView } from '../../flow/types';
import { gradientBackdrop } from '../../kit/scenery';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, N, W } from '../../kit/theme';
import { TimerHud, title } from '../../kit/ui';
import type { Blok } from '../../objects/Blok';
import { RitualScene } from '../_framework/RitualScene';
import { emoji, lures, rand, revealPick, ritualHeader, shout, wait, waitLayout, type Header } from '../fiskesoen/ritualKit';
import * as art from './art';

const { GLASS, M, CHUTE_X, RAIL_Y } = art;
const CONTROL_TIME = 9;
const CLAW_REST = 400;
const CLAW_SPEED = 430;
const CAP_SCALE = 0.78;
/** Hvor langt under klo-navet en grebet kapsel hænger. */
const HOLD = 150;
const FLOOR = 1062;
const CTRL_X = 1490;
const FAN_XS = [250, 455, 1745];
const MIN_X = 800;
const MAX_X = 1240;

type Phase = 'intro' | 'control' | 'grab';

interface Capsule {
  img: Phaser.GameObjects.Image;
  tex: number;
}

/**
 * GRABBE-AUTOMATEN: spilleren på sidstepladsen styrer kloen (indbygget catch-up), de andre hepper.
 * Kapslen der gribes åbnes – og indeholder (selvfølgelig) næste minigame.
 */
export class GrabbeScene extends RitualScene {
  private phase: Phase = 'intro';
  private header!: Header;
  private ctrl!: PlayerView;
  private ctrlBlok!: Blok;
  private fans: { p: PlayerView; blok: Blok; lastHep: number }[] = [];
  private capsules: Capsule[] = [];
  private cl = { x: 1020, y: CLAW_REST, open: 0 };
  private held: Capsule | null = null;
  private heldOff = 0;
  private claw!: Phaser.GameObjects.Container;
  private prongL!: Phaser.GameObjects.Image;
  private prongR!: Phaser.GameObjects.Image;
  private carriage!: Phaser.GameObjects.Image;
  private cable!: Phaser.GameObjects.Graphics;
  private stick!: Phaser.GameObjects.Image;
  private button!: Phaser.GameObjects.Image;
  private timer: TimerHud | null = null;
  private timeLeft = CONTROL_TIME;
  private botTargetX = 1000;
  private botDecoys: number[] = [];
  private botWait = 0;
  private hum = 0;

  constructor() {
    super('ritual-grabbe');
  }

  preload(): void {
    loadSvg(this, 'grab-machine', art.machineSvg(), M.w, M.h + 20);
    loadSvg(this, 'grab-marquee', art.marqueeSvg(), 780, 150);
    loadSvg(this, 'grab-glass', art.glassSvg(), GLASS.r - GLASS.l, GLASS.b - GLASS.t);
    for (let i = 0; i < art.CAPSULE_COUNT; i++) {
      loadSvg(this, `grab-cap-${i}`, art.capsuleSvg(i), 120, 120);
      loadSvg(this, `grab-captop-${i}`, art.capsuleTopSvg(i), 120, 70);
    }
    loadSvg(this, 'grab-capbot', art.capsuleBottomSvg(), 120, 60);
    loadSvg(this, 'grab-hub', art.clawHubSvg(), 130, 100);
    loadSvg(this, 'grab-prong', art.prongSvg(), 70, 150);
    loadSvg(this, 'grab-carriage', art.carriageSvg(), 140, 60);
    loadSvg(this, 'grab-stick', art.joystickSvg(), 80, 130);
    loadSvg(this, 'grab-joybase', art.joyBaseSvg(), 130, 50);
    loadSvg(this, 'grab-btn', art.buttonSvg(false), 120, 80);
    loadSvg(this, 'grab-btn-down', art.buttonSvg(true), 120, 80);
    loadSvg(this, 'grab-wheel', art.wheelSvg(), 500, 500);
    loadSvg(this, 'grab-stand', art.wheelStandSvg(), 300, 420);
    loadSvg(this, 'grab-tent', art.tentSvg(), 400, 420);
    loadSvg(this, 'grab-floor', art.floorSvg(), 1920, 120);
    loadSvg(this, 'grab-cone', art.coneSvg(), 300, 700);
  }

  protected setup(): void {
    this.phase = 'intro';
    this.capsules = [];
    this.fans = [];
    this.held = null;
    this.heldOff = 0;
    this.timer = null;
    this.timeLeft = CONTROL_TIME;
    this.cl = { x: 1020, y: CLAW_REST, open: 0 };
    this.hum = 0;

    // Sidstepladsen styrer kloen (uafgjort: tilfældig blandt de sidste).
    const min = Math.min(...this.players.map((p) => p.score));
    const last = this.players.filter((p) => p.score === min);
    this.ctrl = last[Math.floor(this.rng() * last.length)];
    this.botTargetX = rand(this, MIN_X + 20, MAX_X - 20);
    this.botWait = rand(this, 0.5, 1.0);
    this.botDecoys = [rand(this, MIN_X, MAX_X), rand(this, MIN_X, MAX_X)];

    this.buildWorld();
    this.buildMachine();
    this.buildCapsules();
    this.buildClaw();
    this.buildPlayers();

    this.header = ritualHeader(this, 'GRABBE-AUTOMATEN', `${this.ctrl.name} er sidst – og får kloen!`, '#c2207a');
    this.setLayoutAll((p) =>
      p.slot === this.ctrl.slot
        ? { kind: 'stick', a: 'GRIB!', hint: 'Styr kloen til siden – tryk GRIB!' }
        : { kind: 'mash', label: 'HEP!', icon: '📣', hint: `Hep på ${this.ctrl.name}!` },
    );
    this.time.delayedCall(2300, () => this.startControl());
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    gradientBackdrop(this, '#120a3a', '#7a2a8a');
    for (let i = 0; i < 30; i++) {
      const s = this.add.image(rand(this, 0, W), rand(this, 0, 500), TEX.spark).setScale(rand(this, 0.15, 0.35)).setDepth(-9800).setAlpha(0.6);
      this.tweens.add({ targets: s, alpha: 0.1, duration: rand(this, 700, 1500), yoyo: true, repeat: -1 });
    }
    // Svævende bokeh-lys
    for (let i = 0; i < 16; i++) {
      const b = this.add
        .circle(rand(this, 0, W), rand(this, 300, 900), rand(this, 14, 40), [N.bubblegum, N.sun, N.sky, N.mint][i % 4], 0.14)
        .setDepth(-9600);
      this.tweens.add({ targets: b, y: b.y - rand(this, 60, 160), alpha: 0.04, duration: rand(this, 3000, 6000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.image(300, 1000, 'grab-stand').setOrigin(0.5, 1).setDepth(-9200).setScale(1.25);
    const wheel = this.add.image(300, 540, 'grab-wheel').setDepth(-9100).setScale(1.05);
    this.tweens.add({ targets: wheel, angle: 360, duration: 40000, repeat: -1 });
    this.add.image(1720, 960, 'grab-tent').setOrigin(0.5, 1).setDepth(-9000).setScale(1.1);
    this.add.image(W / 2, 960, 'grab-floor').setOrigin(0.5, 0).setDisplaySize(W, 140).setDepth(-8000);
  }

  private buildMachine(): void {
    this.add.image(M.x, M.y, 'grab-machine').setOrigin(0, 0).setDepth(0);
    // Skinne
    const rail = this.add.graphics().setDepth(25);
    rail.fillStyle(N.ink, 1).fillRoundedRect(GLASS.l + 6, RAIL_Y - 12, GLASS.r - GLASS.l - 12, 24, 10);
    rail.fillStyle(0xc0c8d8, 1).fillRoundedRect(GLASS.l + 10, RAIL_Y - 8, GLASS.r - GLASS.l - 20, 16, 8);
    rail.fillStyle(0xffffff, 0.5).fillRoundedRect(GLASS.l + 20, RAIL_Y - 6, GLASS.r - GLASS.l - 40, 5, 3);
    this.add.image(GLASS.l, GLASS.t, 'grab-glass').setOrigin(0, 0).setDepth(40);

    // Skilt med blinkende pærer
    const mq = this.add.container(W / 2, M.y + 30).setDepth(50);
    mq.add(this.add.image(0, 0, 'grab-marquee'));
    const t = title(this, 0, -4, '★ VIND ET SPIL! ★', 56, { color: C.cream });
    mq.add(t);
    this.tweens.add({ targets: mq, scale: 1.03, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const bulbs: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 22; i++) {
      const top = i < 11;
      const k = top ? i : i - 11;
      const bx = -340 + k * 68;
      const by = top ? -56 : 52;
      const b = this.add.circle(bx, by, 8, 0xfff3a0).setStrokeStyle(3, N.ink);
      bulbs.push(b);
      mq.add(b);
    }
    let tick = 0;
    this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        tick++;
        bulbs.forEach((b, i) => b.setFillStyle((i + tick) % 3 === 0 ? 0xffffff : (i + tick) % 3 === 1 ? N.bubblegum : 0x8a5a2b));
      },
    });

    // Præmievindue med lokkemad (alle minigames)
    const prizes = lures(this, 4, true);
    prizes.forEach((l, i) => {
      const ic = emoji(this, M.x + 318 + i * 66, M.y + 732, l.icon, 44).setDepth(5);
      this.tweens.add({ targets: ic, y: ic.y - 6, duration: 500 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Styrepult på maskinen
    this.add.image(910, 845, 'grab-joybase').setDepth(60);
    this.stick = this.add.image(910, 848, 'grab-stick').setOrigin(0.5, 0.9).setDepth(61).setScale(0.8);
    this.button = this.add.image(1050, 842, 'grab-btn').setDepth(60).setScale(0.85);
  }

  private buildCapsules(): void {
    const rows = [
      { y: GLASS.b - 47, x0: 800, n: 6 },
      { y: GLASS.b - 47 - 70, x0: 845, n: 5 },
      { y: GLASS.b - 47 - 140, x0: 890, n: 4 },
    ];
    let k = 0;
    for (const r of rows) {
      for (let i = 0; i < r.n; i++) {
        const tex = (k * 3) % art.CAPSULE_COUNT;
        const img = this.add
          .image(r.x0 + i * 90 + rand(this, -8, 8), r.y + rand(this, -5, 5), `grab-cap-${tex}`)
          .setScale(CAP_SCALE)
          .setAngle(rand(this, -22, 22))
          .setDepth(10 + k * 0.01);
        this.tweens.add({ targets: img, angle: img.angle + rand(this, -4, 4), duration: rand(this, 900, 1600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.capsules.push({ img, tex });
        k++;
      }
    }
  }

  private buildClaw(): void {
    this.cable = this.add.graphics().setDepth(29);
    this.carriage = this.add.image(this.cl.x, RAIL_Y, 'grab-carriage').setDepth(28).setScale(0.8);
    const hub = this.add.image(0, 0, 'grab-hub').setOrigin(0.5, 0);
    this.prongL = this.add.image(-36, 74, 'grab-prong').setOrigin(0.63, 0.08);
    this.prongR = this.add.image(36, 74, 'grab-prong').setOrigin(0.37, 0.08).setFlipX(true);
    this.claw = this.add.container(this.cl.x, this.cl.y, [this.prongL, this.prongR, hub]).setDepth(30).setScale(0.9);
  }

  private buildPlayers(): void {
    // Spotlight på klo-føreren
    const cone = this.add.image(CTRL_X, 240, 'grab-cone').setOrigin(0.5, 0).setDepth(900).setAlpha(0.55).setScale(0.9, 1.18);
    this.tweens.add({ targets: cone, alpha: 0.3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.ctrlBlok = this.spawnBlok(this.ctrl, CTRL_X, FLOOR, { size: 1 }).setDepth(FLOOR + 1);
    this.ctrlBlok.setFacing(-1);
    const crown = this.add.image(CTRL_X, FLOOR - 330, TEX.crown).setScale(0.8).setDepth(FLOOR + 2);
    this.tweens.add({ targets: crown, y: crown.y - 12, angle: { from: -8, to: 8 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const others = this.players.filter((p) => p.slot !== this.ctrl.slot);
    others.forEach((p, i) => {
      const x = FAN_XS[i];
      const blok = this.spawnBlok(p, x, FLOOR, { size: 0.85 }).setDepth(FLOOR);
      blok.setFacing(x < W / 2 ? 1 : -1);
      this.fans.push({ p, blok, lastHep: -1 });
    });
  }

  // ---------------------------------------------------------------------------
  // Spil

  private startControl(): void {
    this.phase = 'control';
    this.timer = new TimerHud(this, W - 120, 120, CONTROL_TIME);
    shout(this, 'GRIB!', { color: C.sun, size: 200, hold: 450 });
    this.sfx('go');
    this.say(`Kom så, ${this.ctrl.name}!`);
  }

  protected play(dt: number): void {
    // Heppekoret
    for (const f of this.fans) {
      const n = this.phase === 'intro' ? 0 : this.taps(f.p.slot);
      if (n > 0) {
        f.blok.hop(36, 140);
        if (this.elapsed - f.lastHep > 0.3) {
          f.lastHep = this.elapsed;
          this.fx.floatText(f.blok.x + rand(this, -40, 40), FLOOR - 300, rand(this, 0, 1) < 0.5 ? 'HEP!' : 'JAAA!', f.p.color, 40);
          this.sfx('squeak', { volume: 0.25, pitch: rand(this, 0.8, 1.4), pan: this.panFor(f.blok.x) });
        }
      }
    }

    if (this.phase === 'control') {
      this.timeLeft -= dt;
      this.timer?.set(this.timeLeft);
      if (this.timeLeft <= 3 && Math.ceil(this.timeLeft) !== Math.ceil(this.timeLeft + dt) && this.timeLeft > 0) this.sfx('tick');
      const pad = this.pad(this.ctrl.slot);
      const vx = Math.abs(pad.x) > 0.15 ? pad.x : 0;
      this.cl.x = Phaser.Math.Clamp(this.cl.x + vx * CLAW_SPEED * dt, MIN_X, MAX_X);
      this.stick.angle = Phaser.Math.Linear(this.stick.angle, vx * 28, 0.3);
      if (vx !== 0) {
        this.hum -= dt;
        if (this.hum <= 0) {
          this.hum = 0.16;
          this.sfx('tick', { pitch: 0.5, volume: 0.35 });
        }
      }
      if (this.pressedA(this.ctrl.slot) || this.timeLeft <= 0) {
        this.phase = 'grab';
        void this.grabSequence();
      }
    }
    this.drawClaw();
  }

  private drawClaw(): void {
    this.carriage.x = this.cl.x;
    this.claw.setPosition(this.cl.x, this.cl.y);
    const sway = this.phase === 'grab' ? 0 : Math.sin(this.elapsed * 2.4) * 3;
    this.claw.angle = sway;
    this.prongL.angle = this.cl.open * 30;
    this.prongR.angle = -this.cl.open * 30;
    const g = this.cable;
    g.clear();
    g.lineStyle(8, N.ink, 1).lineBetween(this.cl.x, RAIL_Y + 12, this.cl.x, this.cl.y + 6);
    g.lineStyle(3, 0xc0c8d8, 1).lineBetween(this.cl.x, RAIL_Y + 12, this.cl.x, this.cl.y + 6);
    if (this.held) {
      this.held.img.setPosition(this.cl.x + Math.sin(this.elapsed * 7) * 3, this.cl.y + HOLD * 0.9 + this.heldOff);
    }
  }

  private tweenClaw(props: Partial<{ x: number; y: number; open: number }>, ms: number, ease = 'Sine.easeInOut'): Promise<void> {
    return new Promise((res) => this.tweens.add({ targets: this.cl, ...props, duration: ms, ease, onComplete: () => res() }));
  }

  private async grabSequence(): Promise<void> {
    this.timer?.destroy();
    this.timer = null;
    this.button.setTexture('grab-btn-down');
    this.time.delayedCall(250, () => this.button.setTexture('grab-btn'));
    this.tweens.add({ targets: this.stick, angle: 0, duration: 200 });
    this.ctrlBlok.squash(1.2, 0.8);
    this.sfx('select');
    this.header.setHint('Kloen går ned…', C.sun);

    // Find kapslen under kloen (den øverste) – ellers "magneten" tager den nærmeste.
    const under = this.capsules.filter((c) => Math.abs(c.img.x - this.cl.x) < 70);
    const pool = under.length ? under : this.capsules;
    const target = pool.reduce((best, c) =>
      under.length ? (c.img.y < best.img.y ? c : best) : Math.abs(c.img.x - this.cl.x) < Math.abs(best.img.x - this.cl.x) ? c : best,
    );

    await this.tweenClaw({ open: 1 }, 260, 'Back.easeOut');
    this.sfx('whoosh', { pitch: 0.6 });
    await this.tweenClaw({ y: target.img.y - HOLD * 0.9 }, 900, 'Quad.easeIn');
    this.sfx('bonk', { volume: 0.5 });
    this.fx.shake(0.004, 120);
    // Magneten trækker kapslen ind under kloen
    this.tweens.killTweensOf(target.img);
    this.tweens.add({ targets: target.img, x: this.cl.x, angle: 0, duration: 250, ease: 'Back.easeOut' });
    await this.tweenClaw({ open: -0.15 }, 260, 'Back.easeIn');
    this.sfx('crunch', { volume: 0.6 });
    this.held = target;
    target.img.setDepth(31);
    this.capsules = this.capsules.filter((c) => c !== target);
    for (const f of this.fans) f.blok.cheer();
    this.say('Den sidder fast!');

    // Op – og den glider næsten ud!
    await this.tweenClaw({ y: (CLAW_REST + target.img.y - HOLD) / 2 }, 600);
    this.heldOff = 0;
    this.tweens.add({ targets: this, heldOff: 26, duration: 160, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.claw, x: this.claw.x + 6, duration: 50, yoyo: true, repeat: 5 });
    this.sfx('wrong', { volume: 0.5 });
    for (const f of this.fans) {
      f.blok.sad();
      this.fx.floatText(f.blok.x, FLOOR - 300, 'UUUH!', C.cream, 40);
    }
    this.ctrlBlok.bonk();
    await wait(this, 700);
    this.tweens.add({ targets: this, heldOff: 0, duration: 200, ease: 'Back.easeOut' });
    this.sfx('boing', { pitch: 1.3 });
    for (const f of this.fans) f.blok.cheer();
    this.fx.floatText(this.cl.x, this.cl.y - 40, 'PYH!', C.mint, 54);
    await this.tweenClaw({ y: CLAW_REST }, 550);

    // Hen til udgangen
    this.header.setHint('Til udgangen!', C.sun);
    await this.tweenClaw({ x: CHUTE_X }, Math.max(400, Math.abs(this.cl.x - CHUTE_X) * 2.2));
    await this.tweenClaw({ open: 1 }, 220, 'Back.easeOut');
    this.sfx('pop');
    const cap = this.held!;
    this.held = null;
    await new Promise<void>((res) =>
      this.tweens.add({ targets: cap.img, y: GLASS.b - 60, angle: 200, duration: 380, ease: 'Quad.easeIn', onComplete: () => res() }),
    );
    this.sfx('boing', { pitch: 0.8 });
    this.tweens.add({ targets: cap.img, scale: 0.2, alpha: 0, duration: 160 });
    this.tweenClaw({ open: 0 }, 300);
    await wait(this, 450);

    // Ud af lugen og op i luften
    const flapX = M.x + 162;
    const flapY = M.y + 715;
    cap.img.setPosition(flapX, flapY).setScale(0.3).setAlpha(1).setDepth(7100).setAngle(0);
    this.sfx('whoosh');
    this.fx.burst(flapX, flapY, { texture: TEX.star, color: [N.sun, 0xffffff], count: 12, speed: 500, scale: 0.5 });
    await new Promise<void>((res) =>
      this.tweens.add({ targets: cap.img, x: 960, y: 1000, scale: 1, angle: 360, duration: 500, ease: 'Quad.easeOut', onComplete: () => res() }),
    );
    this.sfx('bonk');
    this.fx.dust(960, 1040, 10);
    this.ctrlBlok.dance();
    await new Promise<void>((res) =>
      this.tweens.add({ targets: cap.img, y: 560, scale: 2.4, angle: 720, duration: 650, ease: 'Back.easeOut', onComplete: () => res() }),
    );
    this.header.hide();
    this.sfx('drumroll');
    this.tweens.add({ targets: cap.img, angle: { from: -10, to: 10 }, duration: 60, yoyo: true, repeat: 10 });
    await wait(this, 900);

    // POP! Kapslen springer op
    const top = this.add.image(960, 560 - 40, `grab-captop-${cap.tex}`).setScale(2.4).setDepth(7150);
    const bot = this.add.image(960, 560 + 40, 'grab-capbot').setScale(2.4).setDepth(7150);
    cap.img.destroy();
    this.tweens.add({ targets: top, y: 120, x: 760, angle: -200, alpha: 0, duration: 800, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: bot, y: 1200, x: 1160, angle: 160, duration: 800, ease: 'Quad.easeIn' });
    const icon = emoji(this, 960, 560, this.pick.icon, 160).setDepth(7160).setScale(0);
    this.tweens.add({ targets: icon, scale: 1.2, duration: 400, ease: 'Back.easeOut' });
    this.fx.flash(0xffffff, 200, 0.6);
    this.fx.burst(960, 560, { texture: TEX.confetti, color: [N.sun, N.bubblegum, N.mint, N.sky], count: 30, speed: 900, scale: 1 });
    this.sfx('explosion', { volume: 0.4 });
    this.tweens.add({ targets: icon, scale: 0, duration: 250, delay: 500 });
    await revealPick(this, { x: 960, y: 560, winner: this.ctrl, caption: `🕹️ ${this.ctrl.name} greb den!` });
    if (!this.sys.isActive()) return;
    this.setLayoutAll(() => waitLayout(this));
    this.done({ winner: this.ctrl.slot });
  }

  // ---------------------------------------------------------------------------
  // Bots: klo-føreren sigter et sted hen og griber; heppekoret hamrer løs.

  protected botInput(slot: number, dt: number): BotInput | null {
    if (slot !== this.ctrl.slot) {
      if (this.phase === 'intro') return null;
      return this.rng() < dt * 2.5 ? { tap: true } : null;
    }
    if (this.phase !== 'control') return null;
    // Først lidt nølen frem og tilbage, så det endelige mål.
    const goal = this.botDecoys.length ? this.botDecoys[0] : this.botTargetX;
    const d = goal - this.cl.x;
    if (Math.abs(d) > 10) return { x: Math.sign(d) * Math.min(1, Math.abs(d) / 90 + 0.2), a: false };
    if (this.botDecoys.length) {
      this.botDecoys.shift();
      return { x: 0, a: false };
    }
    this.botWait -= dt;
    return { x: 0, a: this.botWait <= 0 };
  }
}
