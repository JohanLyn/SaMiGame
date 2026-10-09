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
  awningSvg,
  badgeSvg,
  bubbleSvg,
  buntingSvg,
  bulbSvg,
  cartBackSvg,
  chefArmSvg,
  chefBodySvg,
  chefHatSvg,
  chefHeadSvg,
  counterSvg,
  dropSvg,
  glowSvg,
  gooSvg,
  groundSvg,
  ketchupSvg,
  lampSvg,
  polseSvg,
  sausageChainSvg,
  sennepSvg,
  signSvg,
  skySvg,
  townSvg,
  type KokFace,
} from './art';

type Item = 'ketchup' | 'sennep' | 'polse';
type Phase = 'intro' | 'ready' | 'show' | 'judge' | 'over';

/** Knap-id'er på telefonen. */
const BTN_KETCHUP = 0;
const BTN_SENNEP = 1;

const MAX_ROUNDS = 25;
const FEET_Y = 1000;
const PLAYER_X = [345, 755, 1165, 1575];
const CHEF_X = 960;
const CHEF_Y = 470;
/** Skuldre (lokalt i kok-containeren) og armlængde til hånden. */
const SHOULDER = [
  { x: -150, y: 30 },
  { x: 150, y: 30 },
];
const ARM_LEN = 193;
const REST = [35, -35];
const RAISED = [160, -160];

const ITEM_TEX: Record<Item, string> = { ketchup: 'kok-ketchup', sennep: 'kok-sennep', polse: 'kok-polse' };
const ITEM_COLOR: Record<Item, number> = { ketchup: 0xff4b4b, sennep: 0xffc928, polse: 0xff7a5a };

interface Contestant {
  slot: number;
  blok: Blok;
  x: number;
  out: boolean;
  /** Svar i denne runde: -1 = intet endnu. */
  answer: number;
  answeredAt: number;
  early: boolean;
  icon: Phaser.GameObjects.Image | null;
  goo: Phaser.GameObjects.Image[];
}

interface Hand {
  angle: number;
  target: number;
  item: Item;
  img: Phaser.GameObjects.Image;
  fist: Phaser.GameObjects.Image;
  arm: Phaser.GameObjects.Image;
  aim: boolean;
}

/**
 * KOKKEN SIGER (alle mod alle, inspireret af Shy Guy Says).
 * Kokken Klaus står i sin pølsevogn og løfter ketchup, sennep – eller en drilsk pølse.
 * Tryk den rigtige knap hurtigt. Forkert, for sent eller tryk ved pølsen = SPLAT, du er ude.
 */
export class KokkenScene extends MinigameScene {
  protected duration: number | null = null;
  protected music: MusicTheme = 'silly';

  private contestants: Contestant[] = [];
  /** Grupper af pladser der røg ud i samme runde (i rækkefølge). */
  private outGroups: number[][] = [];
  private phase: Phase = 'intro';
  private phaseTime = 0;
  private round = 0;
  private readyDur = 1;
  private windowDur = 1.5;
  private shown: Item = 'ketchup';
  private shownHand = 0;
  private feintAt = -1;
  private feintDone = false;
  private juggleAt = -1;
  private juggleT = -1;
  private judgeWait = 0;

  private chef!: Phaser.GameObjects.Container;
  private head!: Phaser.GameObjects.Image;
  private hat!: Phaser.GameObjects.Image;
  private hands: Hand[] = [];
  private face: KokFace = 'idle';
  private faceHold = 0;
  private blinkIn = 2;

  private bubble!: Phaser.GameObjects.Container;
  private bubbleText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private tempoPips: Phaser.GameObjects.Image[] = [];
  private botPlan: ({ at: number; choice: number } | null)[] = [];

  constructor() {
    super('kokken');
  }

  preload(): void {
    loadSvg(this, 'kok-sky', skySvg(), 1920, 760);
    loadSvg(this, 'kok-town', townSvg(), 1920, 560);
    loadSvg(this, 'kok-ground', groundSvg(), 1920, 380);
    loadSvg(this, 'kok-bunting', buntingSvg(), 1920, 170);
    loadSvg(this, 'kok-bulb', bulbSvg(), 40, 56);
    loadSvg(this, 'kok-glow', glowSvg(), 200, 200);
    loadSvg(this, 'kok-lamp', lampSvg(), 140, 620);
    loadSvg(this, 'kok-cart', cartBackSvg(), 1120, 420);
    loadSvg(this, 'kok-awning', awningSvg(), 1300, 240);
    loadSvg(this, 'kok-counter', counterSvg(), 1300, 300);
    loadSvg(this, 'kok-chain', sausageChainSvg(), 220, 190);
    for (const f of ['idle', 'blink', 'shout', 'angry', 'laugh'] as KokFace[]) loadSvg(this, `kok-head-${f}`, chefHeadSvg(f), 280, 280);
    loadSvg(this, 'kok-hat', chefHatSvg(), 224, 200);
    loadSvg(this, 'kok-body', chefBodySvg(), 540, 300);
    loadSvg(this, 'kok-arm', chefArmSvg(), 130, 250);
    loadSvg(this, 'kok-ketchup', ketchupSvg(), 140, 290);
    loadSvg(this, 'kok-sennep', sennepSvg(), 140, 290);
    loadSvg(this, 'kok-polse', polseSvg(), 140, 290);
    loadSvg(this, 'kok-bubble', bubbleSvg(), 520, 250);
    loadSvg(this, 'kok-ok', badgeSvg('ok'), 120, 120);
    loadSvg(this, 'kok-bad', badgeSvg('bad'), 120, 120);
    loadSvg(this, 'kok-goo-ketchup', gooSvg('#ff4b4b'), 240, 220);
    loadSvg(this, 'kok-goo-sennep', gooSvg('#ffc928'), 240, 220);
    loadSvg(this, 'kok-sign', signSvg(), 380, 170);
    loadSvg(this, 'kok-drop-ketchup', dropSvg('#ff4b4b'), 40, 52);
    loadSvg(this, 'kok-drop-sennep', dropSvg('#ffd23a'), 40, 52);
  }

  protected setup(): void {
    this.contestants = [];
    this.outGroups = [];
    this.hands = [];
    this.tempoPips = [];
    this.phase = 'intro';
    this.round = 0;
    this.botPlan = this.players.map(() => null);

    this.buildWorld();
    this.buildChef();
    this.buildHud();

    for (const p of this.players) {
      const x = PLAYER_X[p.slot] ?? 300 + p.slot * 400;
      const blok = this.spawnBlok(p, x, FEET_Y, { size: 0.95 });
      blok.setDepth(1000 + p.slot);
      this.contestants.push({ slot: p.slot, blok, x, out: false, answer: -1, answeredAt: 0, early: false, icon: null, goo: [] });
    }
  }

  protected onStart(): void {
    this.say('chefStart');
    this.nextRound();
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    this.add.image(W / 2, 0, 'kok-sky').setOrigin(0.5, 0).setDepth(-10000);
    // Blinkende stjerner
    for (let i = 0; i < 14; i++) {
      const s = this.add.image(Phaser.Math.Between(40, W - 40), Phaser.Math.Between(20, 360), TEX.spark).setScale(0.25 + Math.random() * 0.25).setDepth(-9900).setTint(0xfff6c8);
      this.tweens.add({ targets: s, alpha: { from: 1, to: 0.15 }, scale: s.scale * 0.5, duration: Phaser.Math.Between(700, 1600), yoyo: true, repeat: -1, delay: Math.random() * 1500 });
    }
    // Langsomme skyer foran månen
    const town = this.add.image(W / 2, 712, 'kok-town').setOrigin(0.5, 1).setDepth(-9000);
    this.tweens.add({ targets: town, x: W / 2 + 10, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Lyskæde med pærer
    const wire = this.add.graphics().setDepth(-8600);
    wire.lineStyle(5, N.ink, 1);
    const wy = (x: number) => 14 + Math.sin((x / W) * Math.PI) * 120;
    wire.beginPath();
    for (let x = 0; x <= W; x += 40) {
      if (x === 0) wire.moveTo(x, wy(x));
      else wire.lineTo(x, wy(x));
    }
    wire.strokePath();
    const bulbColors = [0xffd76b, 0xff8a8a, 0x8ad0ff, 0x9bff9b, 0xffb36b];
    for (let i = 0; i < 24; i++) {
      const x = 40 + i * 80;
      const y = wy(x) + 22;
      const glow = this.add.image(x, y + 6, 'kok-glow').setScale(0.55).setDepth(-8590).setTint(bulbColors[i % bulbColors.length]).setAlpha(0.7);
      const bulb = this.add.image(x, y, 'kok-bulb').setDepth(-8580).setTint(bulbColors[i % bulbColors.length]);
      this.tweens.add({ targets: [glow, bulb], alpha: { from: 1, to: 0.45 }, duration: 500 + (i % 5) * 140, yoyo: true, repeat: -1, delay: (i * 97) % 900 });
    }
    const bunting = this.add.image(W / 2, 0, 'kok-bunting').setOrigin(0.5, 0).setDepth(-8500).setAlpha(0.95);
    this.tweens.add({ targets: bunting, scaleY: { from: 1, to: 1.05 }, y: 4, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Gadelygter
    for (const x of [150, 1770]) {
      this.add.image(x, 770, 'kok-lamp').setOrigin(0.5, 1).setDepth(-8000);
      const glow = this.add.image(x, 230, 'kok-glow').setScale(2.2).setDepth(-7990).setAlpha(0.55);
      this.tweens.add({ targets: glow, alpha: 0.35, scale: 2.0, duration: 900 + x / 4, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.add.image(W / 2, 700, 'kok-ground').setOrigin(0.5, 0).setDepth(-7900);

    // Vognen
    this.add.image(CHEF_X, 260, 'kok-cart').setOrigin(0.5, 0).setDepth(-7000);
    for (const [x, d] of [
      [560, 1],
      [1380, -1],
    ]) {
      const chain = this.add.image(x, 340, 'kok-chain').setOrigin(0.5, 0.02).setDepth(-6900).setFlipX(d < 0);
      this.tweens.add({ targets: chain, angle: { from: -5 * d, to: 6 * d }, duration: 1300 + x / 3, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const steam = this.add.particles(0, 0, TEX.puff, {
      x: { min: 1300, max: 1360 },
      y: 320,
      speedY: { min: -90, max: -50 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.5, end: 1.6 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 1600,
      frequency: 220,
    });
    steam.setDepth(-6800);
    this.add.image(CHEF_X, 120, 'kok-awning').setOrigin(0.5, 0).setDepth(-6500);
    label(this, 600, 277, "KLAUS'", 50, { color: C.tomato }).setDepth(-6490).setAngle(-2);
    label(this, 1320, 277, 'PØLSER', 50, { color: C.tomato }).setDepth(-6490).setAngle(2);
    label(this, 550, 850, 'RØD PØLSE 25,-', 34, { color: C.cream }).setDepth(501).setAngle(-3);
    label(this, 1370, 850, 'SENNEP GRATIS*', 34, { color: C.sun }).setDepth(501).setAngle(3);
    label(this, 1370, 888, '*hvis du trykker rigtigt', 20, { color: C.cream }).setDepth(501).setAngle(3);
    this.add.image(CHEF_X, 665, 'kok-counter').setOrigin(0.5, 0).setDepth(500);
  }

  private buildChef(): void {
    const c = this.add.container(CHEF_X, CHEF_Y).setDepth(100);
    const body = this.add.image(0, 0, 'kok-body').setOrigin(0.5, 40 / 300);
    c.add(body);
    for (let i = 0; i < 2; i++) {
      const arm = this.add.image(SHOULDER[i].x, SHOULDER[i].y, 'kok-arm').setOrigin(0.5, 0.1).setFlipX(i === 1);
      c.add(arm);
      const item: Item = i === 0 ? 'ketchup' : 'sennep';
      this.hands.push({ angle: REST[i], target: REST[i], item, img: null as unknown as Phaser.GameObjects.Image, fist: null as unknown as Phaser.GameObjects.Image, arm, aim: false });
    }
    for (const h of this.hands) {
      h.img = this.add.image(0, 0, ITEM_TEX[h.item]).setOrigin(0.5, 0.78);
      c.add(h.img);
    }
    for (const h of this.hands) {
      h.fist = this.add.image(0, 0, TEX.dot).setTint(0xf7b896).setDisplaySize(52, 52);
      const outline = this.add.image(0, 0, TEX.dot).setTint(N.ink).setDisplaySize(64, 64);
      c.add(outline);
      c.add(h.fist);
      h.fist.setData('outline', outline);
    }
    this.head = this.add.image(0, -125, 'kok-head-idle');
    this.hat = this.add.image(0, -212, 'kok-hat').setOrigin(0.5, 1);
    c.add([this.head, this.hat]);
    this.chef = c;
    this.layoutHands(0);
  }

  private buildHud(): void {
    const sign = this.add.image(210, 6, 'kok-sign').setOrigin(0.5, 0).setDepth(7000);
    this.roundText = title(this, 210, 104, 'RUNDE 1', 52, { color: C.cream }).setDepth(7001);
    this.tweens.add({ targets: [sign], angle: { from: -2, to: 2 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(this, 116, 196, 'TEMPO', 26, { color: C.sun }).setDepth(7001);
    for (let i = 0; i < 5; i++) {
      const pip = this.add.image(186 + i * 40, 196, 'kok-drop-ketchup').setScale(0.7).setDepth(7001).setAlpha(0.25);
      this.tempoPips.push(pip);
    }

    const bubbleImg = this.add.image(0, 0, 'kok-bubble');
    this.bubbleText = title(this, 16, -20, '', 80, { color: C.tomato });
    this.bubble = this.add.container(1380, 250, [bubbleImg, this.bubbleText]).setDepth(4000).setScale(0);
  }

  // ---------------------------------------------------------------------------
  // Runder

  private get alive(): Contestant[] {
    return this.contestants.filter((c) => !c.out);
  }

  private get tempo(): number {
    return Math.min(1, Math.max(0, (this.round - 1) / 12));
  }

  private nextRound(): void {
    this.round++;
    if (this.round > MAX_ROUNDS) {
      this.end();
      return;
    }
    const t = this.tempo;
    this.phase = 'ready';
    this.phaseTime = 0;
    this.readyDur = (0.8 + this.rng() * 1.0) * (1 - 0.4 * t);
    this.windowDur = 1.4 - 0.85 * t;
    this.feintAt = this.round >= 3 && this.rng() < 0.35 * (0.5 + t) ? this.readyDur * (0.35 + this.rng() * 0.3) : -1;
    this.feintDone = false;
    this.juggleAt = -1;
    this.juggleT = -1;
    if (this.round >= 4 && this.rng() < 0.3) {
      this.juggleAt = 0.15;
      this.readyDur += 0.8;
      if (this.feintAt >= 0) this.feintAt += 0.8;
    }
    // Hvad skal han løfte?
    const roll = this.rng();
    this.shown = this.round > 2 && roll < 0.22 ? 'polse' : this.rng() < 0.5 ? 'ketchup' : 'sennep';
    this.shownHand = this.shown === 'polse' ? (this.rng() < 0.5 ? 0 : 1) : this.hands.findIndex((h) => h.item === this.shown);

    for (const c of this.contestants) {
      c.answer = -1;
      c.early = false;
      c.answeredAt = 0;
      if (!c.out && c.icon) {
        c.icon.destroy();
        c.icon = null;
      }
    }
    for (const h of this.hands) {
      h.target = REST[this.hands.indexOf(h)];
      h.aim = false;
      h.img.setTexture(ITEM_TEX[h.item]);
    }
    this.setFace('idle');

    this.roundText.setText(`RUNDE ${this.round}`);
    this.tweens.add({ targets: this.roundText, scale: { from: 1.35, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    const pips = Math.min(5, 1 + Math.floor(t * 5));
    this.tempoPips.forEach((p, i) => p.setAlpha(i < pips ? 1 : 0.25));
    if (this.round > 1 && (this.round - 1) % 5 === 0) {
      this.fx.floatText(CHEF_X, 160, 'HURTIGERE!', C.sun, 70);
      this.sfx('powerup');
      this.say('faster');
      this.tweens.add({ targets: this.tempoPips[pips - 1], scale: { from: 1.6, to: 0.7 }, duration: 400, ease: 'Back.easeOut' });
    }
    this.showBubble('Kokken siger…', C.ink, 52);
    this.sfx('tick', { pitch: 0.8 });
    this.planBots();
  }

  protected play(dt: number): void {
    this.phaseTime += dt;
    this.animateChef(dt);
    if (this.phase === 'ready') this.playReady();
    else if (this.phase === 'show') this.playShow();
    else if (this.phase === 'judge') {
      this.judgeWait -= dt;
      if (this.judgeWait <= 0) {
        if (this.alive.length <= 1) this.end();
        else this.nextRound();
      }
    }
  }

  private playReady(): void {
    // Jonglering: flaskerne bytter hænder
    if (this.juggleAt >= 0 && this.juggleT < 0 && this.phaseTime >= this.juggleAt) {
      this.juggleT = 0;
      this.sfx('whoosh');
      this.showBubble('Hopla!', C.grape, 64);
    }
    // Finte: armen rykker, men intet løftes
    if (this.feintAt >= 0 && !this.feintDone && this.phaseTime >= this.feintAt) {
      this.feintDone = true;
      const h = this.rng() < 0.5 ? 0 : 1;
      this.hands[h].target = h === 0 ? 85 : -85;
      this.sfx('swish');
      this.chef.y -= 8;
      this.time.delayedCall(140, () => {
        if (this.phase === 'ready') this.hands[h].target = REST[h];
      });
    }
    for (const c of this.alive) {
      if (!this.pressed(c.slot) || c.early || this.phaseTime < 0.3) continue;
      c.early = true;
      c.answer = 99;
      this.setIcon(c, 'kok-bad');
      this.fx.floatText(c.x, FEET_Y - 330, 'FOR TIDLIGT!', C.tomato, 40);
      this.sfx('wrong', { pan: this.panFor(c.x) });
      this.vibrate(c.slot, 120);
    }
    if (this.phaseTime >= this.readyDur) this.raise();
  }

  private raise(): void {
    this.phase = 'show';
    this.phaseTime = 0;
    const h = this.hands[this.shownHand];
    if (this.shown === 'polse') h.img.setTexture(ITEM_TEX.polse);
    h.target = RAISED[this.shownHand];
    this.setFace('shout', 0.6);
    this.tweens.add({ targets: this.head, scaleX: { from: 1.12, to: 1 }, scaleY: { from: 0.9, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.hat, y: { from: -246, to: -212 }, duration: 320, ease: 'Bounce.easeOut' });
    const text = this.shown === 'ketchup' ? 'KETCHUP!' : this.shown === 'sennep' ? 'SENNEP!' : 'PØLSE!';
    const color = this.shown === 'ketchup' ? C.tomato : this.shown === 'sennep' ? C.sun : C.bubblegum;
    this.showBubble(text, color, 84);
    this.sfx('whoosh');
    this.sfx('squeak', { pitch: this.shown === 'polse' ? 0.6 : 1 });
    this.fx.punch(0.015, 140);
    this.time.delayedCall(90, () => {
      if (this.phase !== 'show') return;
      const tip = this.itemTip(h);
      this.fx.burst(tip.x, tip.y + 60, { texture: TEX.star, color: [ITEM_COLOR[this.shown], 0xffffff], count: 10, speed: 420, gravity: 300, scale: 0.5, lifespan: 500, depth: 4100 });
    });
    this.botsReact();
  }

  private playShow(): void {
    for (const c of this.alive) {
      if (c.answer !== -1) continue;
      const choice = this.choice(c.slot);
      if (choice !== BTN_KETCHUP && choice !== BTN_SENNEP) continue;
      c.answer = choice;
      c.answeredAt = this.phaseTime;
      this.setIcon(c, choice === BTN_KETCHUP ? 'kok-ketchup' : 'kok-sennep', 0.36);
      this.sfx('pop', { pan: this.panFor(c.x), pitch: 1 + this.alive.filter((o) => o.answer >= 0).length * 0.08 });
      c.blok.squash(1.15, 0.88);
    }
    const allAnswered = this.alive.every((c) => c.answer !== -1);
    if (this.phaseTime >= this.windowDur || (this.shown !== 'polse' && allAnswered && this.phaseTime > 0.25)) this.judge();
  }

  private judge(): void {
    this.phase = 'judge';
    this.phaseTime = 0;
    const correct = this.shown === 'ketchup' ? BTN_KETCHUP : this.shown === 'sennep' ? BTN_SENNEP : -1;
    const alive = this.alive;
    const failed = alive.filter((c) => c.early || (this.shown === 'polse' ? c.answer >= 0 : c.answer !== correct));
    const passed = alive.filter((c) => !failed.includes(c));

    // Hurtigste rigtige svar får et lille skulderklap
    const fastest = passed.filter((c) => c.answer >= 0).sort((a, b) => a.answeredAt - b.answeredAt)[0];
    passed.forEach((c, i) => {
      this.setIcon(c, 'kok-ok');
      this.sfx('coin', { delay: 0.05 * i, pitch: 1 + i * 0.12, pan: this.panFor(c.x) });
      c.blok.hop(60, 200);
    });
    if (fastest && passed.length > 1) this.fx.floatText(fastest.x, FEET_Y - 360, 'LYNHURTIG!', C.mint, 36);

    if (failed.length && failed.length === alive.length && alive.length > 1) {
      // Alle fejlede – ingen ryger ud
      this.setFace('laugh', 1.2);
      this.showBubble('ALLE?! IGEN!', C.grape, 70);
      this.sfx('lose');
      this.say('again');
      for (const c of failed) {
        this.setIcon(c, 'kok-bad');
        c.blok.bonk();
      }
      this.judgeWait = 1.4;
      return;
    }

    if (!failed.length) {
      if (this.shown === 'polse') {
        this.setFace('angry', 0.8);
        this.showBubble('Hmpf! Godt set.', C.ink, 52);
      } else {
        this.setFace('idle');
      }
      this.judgeWait = 0.55;
      return;
    }

    this.outGroups.push(failed.map((c) => c.slot));
    for (const c of failed) c.out = true;
    this.setFace(this.shown === 'polse' ? 'laugh' : 'angry', 1.4);
    if (this.shown === 'polse') {
      this.showBubble('HAHA! PØLSE!', C.bubblegum, 70);
      this.say('sausage');
    } else {
      this.showBubble(failed.length > 1 ? 'SPLAT! SPLAT!' : 'SPLAT!', this.shown === 'ketchup' ? C.tomato : C.sun, 80);
      this.say(failed.length > 1 ? 'doubleSplat' : 'splatOut');
    }
    failed.forEach((c, i) => this.time.delayedCall(i * 260, () => this.splat(c)));
    this.judgeWait = 0.9 + failed.length * 0.35;
  }

  private end(): void {
    if (this.phase === 'over') return;
    this.phase = 'over';
    const survivors = this.alive;
    for (const c of survivors) c.blok.cheer();
    if (survivors.length === 1) {
      this.setFace('angry');
      this.showBubble('Wunderbar!', C.mint, 70);
      this.fx.confetti(1800);
      this.sfx('cheer');
      this.say('chefImpressed');
    } else if (survivors.length > 1) {
      this.setFace('laugh');
      this.showBubble('Alle vinder!', C.mint, 70);
    }
    const ranking = [survivors.map((c) => c.slot), ...[...this.outGroups].reverse()].filter((g) => g.length);
    this.finish(ranking);
  }

  // ---------------------------------------------------------------------------
  // Splat!

  private splat(c: Contestant): void {
    const handIdx = this.shown === 'polse' ? this.shownHand : this.hands.findIndex((h) => h.item === this.shown);
    const hand = this.hands[handIdx >= 0 ? handIdx : 0];
    const target = { x: c.x, y: FEET_Y - 140 * c.blok.size };
    // Sigt armen mod spilleren (lidt over, så strålen buer)
    const sx = CHEF_X + SHOULDER[this.hands.indexOf(hand)].x;
    const sy = CHEF_Y + SHOULDER[this.hands.indexOf(hand)].y;
    const aimDeg = Phaser.Math.RadToDeg(Math.atan2(-(target.x - sx), 440 - sy));
    hand.target = Phaser.Math.Clamp(aimDeg, -150, 150);
    hand.aim = true;
    this.layoutHands(1);
    const tip = this.itemTip(hand);
    const colorItem: Item = this.shown === 'polse' ? (this.rng() < 0.5 ? 'ketchup' : 'sennep') : this.shown;

    if (this.shown === 'polse') {
      // Pølsen bliver kastet i hovedet på dem
      const p = this.add.image(tip.x, tip.y, 'kok-polse').setDepth(5000).setScale(0.8);
      this.sfx('whoosh');
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 420,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          p.setPosition(Phaser.Math.Linear(tip.x, target.x, k), Phaser.Math.Linear(tip.y, target.y - 60, k) - Math.sin(k * Math.PI) * 220);
          p.angle = k * 720;
        },
        onComplete: () => {
          this.sfx('bonk');
          this.fx.stars(target.x, target.y - 80, N.sun, 8);
          this.tweens.add({ targets: p, y: FEET_Y + 20, x: p.x + 80, angle: 900, alpha: 0, duration: 600, ease: 'Quad.easeIn', onComplete: () => p.destroy() });
          this.hit(c, colorItem);
        },
      });
      return;
    }

    // Sprøjte-stråle
    this.sfx('squeak', { pitch: 0.7 });
    this.sfx('fart', { volume: 0.5, pitch: 1.6 });
    const drops = 16;
    for (let i = 0; i < drops; i++) {
      const d = this.add.image(tip.x, tip.y, `kok-drop-${colorItem}`).setDepth(5000).setScale(0.9 - i * 0.02);
      this.tweens.addCounter({
        from: 0,
        to: 1,
        delay: i * 18,
        duration: 340,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          const x = Phaser.Math.Linear(tip.x, target.x + (i % 3) * 8 - 8, k);
          const y = Phaser.Math.Linear(tip.y, target.y, k) - Math.sin(k * Math.PI) * 180;
          const prevX = d.x;
          const prevY = d.y;
          d.setPosition(x, y);
          d.rotation = Math.atan2(y - prevY, x - prevX) + Math.PI / 2;
        },
        onComplete: () => {
          d.destroy();
          if (i === 0) this.hit(c, colorItem);
        },
      });
    }
  }

  private hit(c: Contestant, item: Item): void {
    const b = c.blok;
    this.sfx('splat', { pan: this.panFor(c.x) });
    this.sfx('scream', { delay: 0.08, pan: this.panFor(c.x), pitch: 0.9 + this.rng() * 0.3 });
    this.fx.burst(c.x, FEET_Y - 140, { texture: TEX.drop, color: [ITEM_COLOR[item], 0xffffff], count: 22, speed: 650, gravity: 1500, scale: 0.8, depth: 5001 });
    this.fx.shake(0.01, 220);
    this.fx.flash(ITEM_COLOR[item], 140, 0.25);
    this.fx.floatText(c.x, FEET_Y - 380, 'SPLAT!', item === 'sennep' ? C.sun : C.tomato, 72);
    this.vibrate(c.slot, 300);
    this.stat(c.slot, 'falls');
    this.stat(c.slot, 'hits');
    const goo = this.add.image(0, -150 * b.size, `kok-goo-${item}`).setScale(0).setAngle(this.rng() * 30 - 15);
    b.add(goo);
    c.goo.push(goo);
    this.tweens.add({ targets: goo, scale: 0.75 * b.size, duration: 220, ease: 'Back.easeOut' });
    // Drypper langsomt
    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        if (!b.active) return;
        this.fx.burst(b.x + (this.rng() - 0.5) * 80, b.y - 80 * b.size, { texture: TEX.drop, color: ITEM_COLOR[item], count: 1, speed: 30, gravity: 900, scale: 0.4, lifespan: 500, depth: 1200 });
      },
    });
    b.spinOut(1, 500);
    b.sad();
    this.tweens.add({ targets: b, x: b.x + (c.x < CHEF_X ? -30 : 30), duration: 300, ease: 'Quad.easeOut' });
    this.setIcon(c, 'kok-bad');
  }

  // ---------------------------------------------------------------------------
  // Kokken-animation

  private setFace(face: KokFace, hold = 0): void {
    this.face = face;
    this.faceHold = hold;
    this.head.setTexture(`kok-head-${face}`);
  }

  private animateChef(dt: number): void {
    const t = this.elapsed;
    this.chef.y = Phaser.Math.Linear(this.chef.y, CHEF_Y + Math.sin(t * 2.2) * 4, Math.min(1, dt * 10));
    this.head.angle = Math.sin(t * 1.7) * 3;
    this.hat.angle = Math.sin(t * 1.7 + 0.6) * 4;
    this.hat.x = Math.sin(t * 1.7) * 3;

    if (this.faceHold > 0) {
      this.faceHold -= dt;
      if (this.faceHold <= 0 && this.phase !== 'over') this.setFace('idle');
    } else if (this.face === 'idle' || this.face === 'blink') {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) {
        if (this.face === 'idle') {
          this.setFace('blink');
          this.blinkIn = 0.12;
        } else {
          this.setFace('idle');
          this.blinkIn = 1.5 + this.rng() * 2.5;
        }
      }
    }
    this.layoutHands(dt);
  }

  private layoutHands(dt: number): void {
    const k = dt <= 0 ? 1 : Math.min(1, dt * 16);
    // Jonglering: flaskerne flyver i buer mellem hænderne
    if (this.juggleT >= 0) {
      this.juggleT += dt / 0.7;
      if (this.juggleT >= 1) {
        this.juggleT = -1;
        this.juggleAt = -1;
        const tmp = this.hands[0].item;
        this.hands[0].item = this.hands[1].item;
        this.hands[1].item = tmp;
        for (const h of this.hands) h.img.setTexture(ITEM_TEX[h.item]);
        this.sfx('pop');
        if (this.shown !== 'polse') this.shownHand = this.hands.findIndex((h) => h.item === this.shown);
      }
    }
    this.hands.forEach((h, i) => {
      h.angle += (h.target - h.angle) * k;
      const rad = Phaser.Math.DegToRad(h.angle);
      const hx = SHOULDER[i].x - ARM_LEN * Math.sin(rad);
      const hy = SHOULDER[i].y + ARM_LEN * Math.cos(rad);
      h.arm.angle = h.angle;
      h.fist.setPosition(hx, hy);
      (h.fist.getData('outline') as Phaser.GameObjects.Image).setPosition(hx, hy);
      if (this.juggleT >= 0) {
        // Flaske fra hånd i til den anden hånd
        const j = 1 - i;
        const jr = Phaser.Math.DegToRad(this.hands[j].angle);
        const tx = SHOULDER[j].x - ARM_LEN * Math.sin(jr);
        const ty = SHOULDER[j].y + ARM_LEN * Math.cos(jr);
        const p = this.juggleT;
        h.img.setPosition(Phaser.Math.Linear(hx, tx, p), Phaser.Math.Linear(hy, ty, p) - Math.sin(p * Math.PI) * (i === 0 ? 300 : 220));
        h.img.angle = p * 360 * (i === 0 ? 1 : -1);
        return;
      }
      h.img.setPosition(hx, hy);
      h.img.angle = h.aim ? h.angle + 180 : -h.angle * 0.12;
    });
  }

  /** Verdenskoordinat for flaskens tud. */
  private itemTip(h: Hand): { x: number; y: number } {
    const rad = Phaser.Math.DegToRad(h.img.angle);
    const len = 290 * 0.78;
    return {
      x: this.chef.x + h.img.x + Math.sin(rad) * len,
      y: this.chef.y + h.img.y - Math.cos(rad) * len,
    };
  }

  private showBubble(text: string, color: string, size: number): void {
    this.bubbleText.setText(text).setColor(color).setFontSize(size);
    this.tweens.killTweensOf(this.bubble);
    this.bubble.setScale(0.2).setAngle(-6);
    this.tweens.add({ targets: this.bubble, scale: 1, angle: 0, duration: 260, ease: 'Back.easeOut' });
  }

  private setIcon(c: Contestant, key: string, scale = 0.7): void {
    c.icon?.destroy();
    const y = FEET_Y - 270 * c.blok.size - 82;
    c.icon = this.add.image(c.x, y, key).setDepth(3000).setScale(0);
    this.tweens.add({ targets: c.icon, scale, duration: 240, ease: 'Back.easeOut' });
  }

  // ---------------------------------------------------------------------------
  // Bots: reagerer menneskeligt – nogle gange for langsomt, nogle gange narret af pølsen.

  private skill(slot: number): number {
    return [0.92, 0.82, 0.88, 0.76][slot % 4];
  }

  private planBots(): void {
    this.botPlan = this.players.map(() => null);
    if (this.feintAt < 0) return;
    const t = this.tempo;
    for (const c of this.alive) {
      if (!this.isBotNow(c.slot)) continue;
      if (this.rng() < 0.03 + t * 0.12 + (1 - this.skill(c.slot)) * 0.08) {
        // Narret af finten: trykker for tidligt (planlagt i spil-tid)
        this.botPlan[c.slot] = { at: this.elapsed + this.feintAt + 0.15 + this.rng() * 0.25, choice: this.rng() < 0.5 ? 0 : 1 };
      }
    }
  }

  private botsReact(): void {
    const t = this.tempo;
    for (const c of this.alive) {
      if (!this.isBotNow(c.slot) || c.early) continue;
      const s = this.skill(c.slot);
      const daydream = this.rng() < 0.03 + t * 0.07 ? 0.5 + this.rng() * 0.5 : 0;
      const reaction = 0.25 + this.rng() * 0.45 + (1 - s) * 0.6 + t * 0.1 + daydream;
      if (this.shown === 'polse') {
        if (this.rng() < 0.03 + t * 0.2 + (1 - s) * 0.1) this.botPlan[c.slot] = { at: this.elapsed + reaction * 0.7, choice: this.rng() < 0.5 ? 0 : 1 };
        else this.botPlan[c.slot] = null;
        continue;
      }
      const right = this.shown === 'ketchup' ? BTN_KETCHUP : BTN_SENNEP;
      const wrong = this.rng() < 0.03 + t * 0.12 + (1 - s) * 0.06;
      this.botPlan[c.slot] = { at: this.elapsed + reaction, choice: wrong ? 1 - right : right };
    }
  }

  protected botInput(slot: number): BotInput | null {
    const plan = this.botPlan[slot];
    if (!plan || this.elapsed < plan.at) return null;
    this.botPlan[slot] = null;
    return { tap: true, choice: plan.choice };
  }
}

