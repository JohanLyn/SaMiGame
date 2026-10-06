import Phaser from 'phaser';
import type { ControllerLayout } from '@samigame/shared';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { label, panelKey, panelSvg, title } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  CABIN,
  CABIN_COLORS,
  beamSvg,
  bubbleSvg,
  buntingSvg,
  cabinSvg,
  crowdSvg,
  doorSvg,
  duckSvg,
  flySvg,
  focusSvg,
  groundSvg,
  handleSvg,
  interiorSvg,
  penSvg,
  plungerSvg,
  rollSvg,
  signSvg,
  skySvg,
  spotSvg,
  stageSvg,
  stinkSvg,
  wheelStandSvg,
  wheelSvg,
} from './art';

const DOORS = 6;
const TRIES = 3;
const ROUNDS = 2;
const HIDE_TIME = 12;
const PICK_TIME = 12;
const CABIN_BOTTOM = 790;
const WALK_Y = 965;
const cabinX = (i: number) => 260 + i * 280;

type Phase = 'intro' | 'hide' | 'blackout' | 'pick' | 'drama' | 'done';
type Gag = 'duck' | 'flies' | 'paper';

interface Cabin {
  index: number;
  body: Phaser.GameObjects.Image;
  interior: Phaser.GameObjects.Image;
  door: Phaser.GameObjects.Image;
  handle: Phaser.GameObjects.Image;
  number: Phaser.GameObjects.Text;
  open: boolean;
  props: Phaser.GameObjects.GameObject[];
  loops: Phaser.Tweens.Tween[];
}

interface Hider {
  player: PlayerView;
  blok: Blok;
  homeX: number;
  choice: number;
  locked: boolean;
  caught: boolean;
  check: Phaser.GameObjects.Image;
  botPickAt: number;
  botChoice: number;
}

/**
 * GEMMELEG I TOILETTERNE (1 mod 3, inspireret af Hide and Go BOOM).
 * Trioen gemmer sig i hemmelighed i festivalpladsens toiletvogne. Eneren åbner tre døre pr. runde.
 * To runder – fanges alle tre, vinder eneren. Ellers vinder trioen.
 */
export class ToiletScene extends MinigameScene {
  protected duration = null;
  protected music = 'tense' as const;

  private cabins: Cabin[] = [];
  private hiders: Hider[] = [];
  private seeker!: Blok;
  private phase: Phase = 'intro';
  private phaseTime = 0;
  private round = 1;
  private triesLeft = TRIES;
  private lastGag: Gag | null = null;
  private seekerTarget: number | null = null;
  private seekerArrive: (() => void) | null = null;
  private phaseDone: ((value: number) => void) | null = null;
  private soloBotPickAt = 0;
  private soloBotChoice = 0;

  private prompt!: Phaser.GameObjects.Text;
  private promptSub!: Phaser.GameObjects.Text;
  private plungers: Phaser.GameObjects.Image[] = [];
  private trioRows: { hider: Hider; status: Phaser.GameObjects.Text; name: Phaser.GameObjects.Text }[] = [];
  private roundPips: Phaser.GameObjects.Arc[] = [];
  private dark!: Phaser.GameObjects.Rectangle;
  private focus!: Phaser.GameObjects.Image;
  private soloBubble!: Phaser.GameObjects.Text;

  constructor() {
    super('toiletter');
  }

  preload(): void {
    CABIN_COLORS.forEach((c, i) => {
      loadSvg(this, `wc-cabin-${i}`, cabinSvg(c), CABIN.w, CABIN.h);
      loadSvg(this, `wc-door-${i}`, doorSvg(c), CABIN.doorW + 8, CABIN.doorH + 8);
    });
    loadSvg(this, 'wc-handle', handleSvg(), 56, 40);
    loadSvg(this, 'wc-interior', interiorSvg(), CABIN.doorW, CABIN.doorH);
    loadSvg(this, 'wc-duck', duckSvg(), 170, 150);
    loadSvg(this, 'wc-fly', flySvg(), 48, 40);
    loadSvg(this, 'wc-stink', stinkSvg(), 120, 100);
    loadSvg(this, 'wc-roll', rollSvg(), 64, 56);
    loadSvg(this, 'wc-plunger', plungerSvg(), 80, 110);
    loadSvg(this, 'wc-sky', skySvg(), 1920, 700);
    loadSvg(this, 'wc-stage', stageSvg(), 620, 330);
    loadSvg(this, 'wc-wheel', wheelSvg(), 400, 400);
    loadSvg(this, 'wc-wheelstand', wheelStandSvg(), 300, 260);
    loadSvg(this, 'wc-beam', beamSvg(), 200, 700);
    loadSvg(this, 'wc-ground', groundSvg(), 1920, 460);
    loadSvg(this, 'wc-bunting', buntingSvg(), 1920, 140);
    loadSvg(this, 'wc-crowd', crowdSvg(), 1920, 170);
    loadSvg(this, 'wc-bubble', bubbleSvg(), 90, 90);
    loadSvg(this, 'wc-spot', spotSvg(), 400, 140);
    loadSvg(this, 'wc-pen', penSvg(), 480, 170);
    loadSvg(this, 'wc-sign', signSvg(), 300, 90);
    loadSvg(this, 'wc-focus', focusSvg(), 320, 180);
    loadSvg(this, panelKey(440, 150, C.deep), panelSvg(440, 150, C.deep), 464, 180);
    loadSvg(this, panelKey(470, 190, C.deep), panelSvg(470, 190, C.deep), 494, 220);
  }

  protected setup(): void {
    this.cabins = [];
    this.hiders = [];
    this.trioRows = [];
    this.plungers = [];
    this.roundPips = [];
    this.phase = 'intro';
    this.round = 1;
    this.triesLeft = TRIES;
    this.lastGag = null;

    this.buildWorld();
    this.buildCabins();

    // Eneren: står ude til venstre og holder sig for øjnene under gemmelegen.
    const solo = this.solo;
    this.seeker = this.spawnBlok(solo, 120, WALK_Y, { size: 0.82 });
    this.seeker.setDepth(WALK_Y);
    this.soloBubble = title(this, 0, 0, '🙈', 64).setDepth(7000).setVisible(false);

    // Trioen
    const trio = this.team(1);
    trio.forEach((p, i) => {
      const x = 760 + i * 200;
      const blok = this.spawnBlok(p, x, WALK_Y + 10, { size: 0.72 });
      blok.setDepth(WALK_Y + 10);
      const check = this.add.image(x + 78, WALK_Y - 150, 'wc-bubble').setDepth(7000).setScale(0);
      this.hiders.push({ player: p, blok, homeX: x, choice: -1, locked: false, caught: false, check, botPickAt: 0, botChoice: 0 });
    });

    // Skammekrogen (fangede spillere)
    this.add.image(1740, 1066, 'wc-pen').setOrigin(0.5, 1).setDepth(1300);
    const sign = this.add.image(1740, 1014, 'wc-sign').setDepth(1310).setScale(0.7).setAngle(-3);
    const signText = label(this, 1740, 1009, 'FANGET', 32).setDepth(1320).setAngle(-3);
    this.tweens.add({ targets: [sign, signText], angle: 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.buildHud();

    this.dark = this.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x05031a, 0).setDepth(8800).setScrollFactor(0);
    this.focus = this.add.image(W / 2, H / 2, 'wc-focus').setDisplaySize(W * 1.1, H * 1.1).setDepth(6900).setScrollFactor(0).setAlpha(0);
  }

  // ---------------------------------------------------------------------------
  // Verden

  private buildWorld(): void {
    this.add.image(W / 2, 350, 'wc-sky').setDepth(-9500);
    // Pariserhjul
    this.add.image(330, 600, 'wc-wheelstand').setOrigin(0.5, 1).setDepth(-9300).setScale(1.1);
    const wheel = this.add.image(330, 330, 'wc-wheel').setDepth(-9290).setScale(1.05);
    this.tweens.add({ targets: wheel, angle: 360, duration: 40000, repeat: -1 });
    // Scene med lyskegler
    const stageX = 1300;
    for (let i = 0; i < 4; i++) {
      const beam = this.add.image(stageX - 200 + i * 130, 400, 'wc-beam').setOrigin(0.5, 0).setDepth(-9260).setAlpha(0.55).setAngle(180);
      beam.setTint([0xfff6c0, 0xff9be0, 0x9be8ff, 0xfff6c0][i]);
      this.tweens.add({ targets: beam, angle: { from: 160 + i * 6, to: 200 - i * 6 }, duration: 2400 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.image(stageX, 600, 'wc-stage').setOrigin(0.5, 1).setDepth(-9250);
    // Konfetti-glimt over scenen
    this.add.particles(0, 0, TEX.spark, {
      x: { min: stageX - 280, max: stageX + 280 },
      y: { min: 300, max: 440 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 900,
      frequency: 140,
      tint: [N.sun, N.bubblegum, N.mint, N.sky],
    }).setDepth(-9240);

    this.add.image(W / 2, 850, 'wc-ground').setDepth(-8000);
    const bunting = this.add.image(W / 2, 300, 'wc-bunting').setDepth(-7500);
    this.tweens.add({ targets: bunting, y: 306, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Spotlys på jorden foran toiletterne
    for (let i = 0; i < 3; i++) {
      const spot = this.add.image(400 + i * 560, 860, 'wc-spot').setDepth(-7000).setAlpha(0.6);
      this.tweens.add({ targets: spot, x: spot.x + 180, duration: 3000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Publikum i forgrunden (venstre del)
    const crowd = this.add.image(W / 2 - 300, H + 40, 'wc-crowd').setOrigin(0.5, 1).setDepth(6000).setAlpha(0.95);
    this.tweens.add({ targets: crowd, y: H + 50, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Ildfluer/glimmer
    this.add.particles(0, 0, TEX.dot, {
      x: { min: 0, max: W },
      y: { min: 380, max: 800 },
      speedY: { min: -20, max: -50 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 2600,
      frequency: 220,
      tint: [0xfff3a0, 0xffcf3a],
    }).setDepth(-6900);
  }

  private buildCabins(): void {
    for (let i = 0; i < DOORS; i++) {
      const x = cabinX(i);
      const top = CABIN_BOTTOM - CABIN.h;
      const dx = x - CABIN.w / 2 + CABIN.doorX;
      const dy = top + CABIN.doorY;
      const body = this.add.image(x, CABIN_BOTTOM, `wc-cabin-${i}`).setOrigin(0.5, 1).setDepth(100 + i);
      const interior = this.add.image(dx, dy, 'wc-interior').setOrigin(0, 0).setDepth(150 + i);
      const door = this.add.image(dx - 4, dy - 4, `wc-door-${i}`).setOrigin(0, 0).setDepth(200 + i);
      const handle = this.add.image(dx + CABIN.doorW - 34, dy + CABIN.doorH * 0.62, 'wc-handle').setOrigin(0.25, 0.5).setDepth(210 + i);
      const number = title(this, x, top + 56, String(i + 1), 50, { color: C.cream }).setDepth(220 + i);
      // Lidt liv: kabinerne "ånder" og nummeret vipper
      this.tweens.add({ targets: body, scaleY: 1.012, scaleX: 0.995, duration: 900 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: number, angle: { from: -5, to: 5 }, duration: 1100 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.cabins.push({ index: i, body, interior, door, handle, number, open: false, props: [], loops: [] });
    }
  }

  private buildHud(): void {
    const solo = this.solo;
    // Eneren (venstre)
    this.add.image(250, 105, panelKey(440, 150, C.deep)).setDepth(7000).setScrollFactor(0);
    label(this, 130, 62, 'ENEREN', 26, { color: C.sun }).setDepth(7001).setScrollFactor(0);
    label(this, 250, 102, solo.name, 36, { color: solo.color }).setDepth(7001).setScrollFactor(0);
    for (let i = 0; i < TRIES; i++) {
      const p = this.add.image(320 + i * 54, 150, 'wc-plunger').setScale(0.42).setDepth(7001).setScrollFactor(0);
      this.plungers.push(p);
    }
    label(this, 170, 150, 'Forsøg:', 26, { color: C.cream }).setDepth(7001).setScrollFactor(0);

    // Trioen (højre)
    this.add.image(W - 260, 120, panelKey(470, 190, C.deep)).setDepth(7000).setScrollFactor(0);
    label(this, W - 400, 50, 'TRIOEN', 26, { color: C.sun }).setDepth(7001).setScrollFactor(0);
    this.hiders.forEach((h, i) => {
      const y = 92 + i * 50;
      const name = label(this, W - 330, y, h.player.name, 30, { color: h.player.color }).setOrigin(0.5).setDepth(7001).setScrollFactor(0);
      const status = label(this, W - 110, y, '', 28, { color: C.cream }).setDepth(7001).setScrollFactor(0);
      this.trioRows.push({ hider: h, status, name });
    });

    // Prompt (midt)
    this.prompt = title(this, W / 2, 70, '', 60).setDepth(7002).setScrollFactor(0);
    this.promptSub = label(this, W / 2, 140, '', 34, { color: C.sun }).setDepth(7002).setScrollFactor(0);
    for (let r = 0; r < ROUNDS; r++) {
      this.roundPips.push(this.add.circle(W / 2 - 20 + r * 40, 190, 11, N.cream, 0.3).setStrokeStyle(4, N.ink).setDepth(7002).setScrollFactor(0));
    }
    this.updateHud();
  }

  private updateHud(): void {
    this.plungers.forEach((p, i) => p.setAlpha(i < this.triesLeft ? 1 : 0.2).setTint(i < this.triesLeft ? 0xffffff : 0x555577));
    for (const row of this.trioRows) {
      const h = row.hider;
      const text = h.caught ? 'FANGET!' : this.phase === 'hide' ? (h.locked ? 'Klar ✓' : 'Vælger…') : 'Gemt';
      row.status.setText(text).setColor(h.caught ? C.tomato : h.locked || this.phase !== 'hide' ? C.mint : C.cream);
      row.name.setAlpha(h.caught ? 0.5 : 1);
    }
    this.roundPips.forEach((p, i) => p.setFillStyle(i < this.round ? N.sun : N.cream, i < this.round ? 1 : 0.3));
  }

  private setPrompt(text: string, sub = ''): void {
    if (this.prompt.text !== text) {
      this.prompt.setText(text).setScale(0.6);
      this.tweens.add({ targets: this.prompt, scale: 1, duration: 300, ease: 'Back.easeOut' });
    }
    this.promptSub.setText(sub);
  }

  // ---------------------------------------------------------------------------
  // Forløb

  protected onStart(): void {
    this.say('Gem jer i toiletterne!');
    void this.runGame();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  private alive(): Hider[] {
    return this.hiders.filter((h) => !h.caught);
  }

  private async runGame(): Promise<void> {
    for (this.round = 1; this.round <= ROUNDS; this.round++) {
      this.updateHud();
      this.triesLeft = TRIES;
      this.updateHud();
      this.sfx('fanfare');
      await this.fx.banner(`RUNDE ${this.round}`, { size: 150, hold: 900, sub: this.round === 1 ? 'Gem jer!' : 'Sidste chance!' });
      await this.hidePhase();
      await this.blackout();
      for (let t = 0; t < TRIES && this.alive().length > 0; t++) {
        const door = await this.pickPhase();
        await this.openDoor(door);
      }
      if (this.alive().length === 0) break;
      await this.revealSurvivors(this.round === ROUNDS);
      if (this.round < ROUNDS) await this.resetCabins();
    }
    this.phase = 'done';
    this.setPrompt('');
    const soloWins = this.alive().length === 0;
    for (const p of this.players) this.setLayout(p.slot, { kind: 'wait', title: soloWins === (p.role === 'solo') ? 'I vandt!' : 'Øv!', emoji: soloWins === (p.role === 'solo') ? '🏆' : '🧻' });
    if (soloWins) {
      this.seeker.dance();
      this.say('Eneren fandt dem alle sammen!', true);
      this.fx.confetti(1800);
      this.sfx('win');
      await this.fx.banner('ALLE FANGET!', { color: C.sun, size: 140, hold: 1200 });
    } else {
      this.seeker.sad();
      this.alive().forEach((h) => h.blok.dance());
      this.say('Trioen var for snedig!', true);
      this.sfx('cheer');
      await this.fx.banner('TRIOEN SLAP VÆK!', { color: C.mint, size: 120, hold: 1200 });
    }
    this.finish(this.rankByTeam(soloWins ? 0 : 1));
  }

  /** Trioen vælger toilet i hemmelighed. */
  private hidePhase(): Promise<void> {
    this.phase = 'hide';
    this.phaseTime = 0;
    const alive = this.alive();
    for (const h of alive) {
      h.choice = -1;
      h.locked = false;
      h.botPickAt = 1.5 + this.rng() * 5;
      h.botChoice = Math.floor(this.rng() * DOORS);
      h.check.setScale(0);
      h.blok.setVisible(true);
      this.setLayout(h.player.slot, this.hideLayout(-1));
    }
    for (const h of this.hiders.filter((x) => x.caught)) this.setLayout(h.player.slot, { kind: 'wait', title: 'Du er fanget!', message: 'Hep på dine holdkammerater!', emoji: '😱' });
    this.setLayout(this.solo.slot, { kind: 'wait', title: 'Kig væk!', message: 'Trioen gemmer sig lige nu…', emoji: '🙈' });
    // Eneren holder sig for øjnene
    this.seeker.setFacing(-1);
    this.soloBubble.setVisible(true).setPosition(this.seeker.x + 70, this.seeker.y - 300);
    this.tweens.add({ targets: this.soloBubble, scale: { from: 0, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    this.say('Trioen: vælg et toilet i hemmelighed!');
    this.updateHud();
    return new Promise((resolve) => (this.phaseDone = () => resolve()));
  }

  private hideLayout(selected: number): ControllerLayout {
    return {
      kind: 'choice',
      title: selected < 0 ? 'Vælg dit gemmested!' : `Du gemmer dig i nr. ${selected + 1}`,
      options: CABIN_COLORS.map((color, i) => ({ id: i, label: `Toilet ${i + 1}`, icon: '🚽', color })),
      selected: selected < 0 ? undefined : selected,
      locked: selected >= 0,
      columns: 3,
      hint: selected < 0 ? 'Hemmeligt! I må gerne vælge det samme.' : 'Shhh… sid helt stille!',
    };
  }

  private lockHider(h: Hider, choice: number): void {
    if (h.locked || choice < 0 || choice >= DOORS) return;
    h.choice = choice;
    h.locked = true;
    this.setLayout(h.player.slot, this.hideLayout(choice));
    this.vibrate(h.player.slot, 40);
    this.sfx('select', { pan: this.panFor(h.blok.x) });
    h.blok.hop(50);
    this.tweens.add({ targets: h.check, scale: 1, duration: 320, ease: 'Back.easeOut' });
    this.updateHud();
  }

  private async blackout(): Promise<void> {
    this.phase = 'blackout';
    this.setPrompt('Shhh…', 'Trioen sniger sig ind…');
    this.sfx('whoosh');
    this.tweens.add({ targets: this.dark, fillAlpha: 0.93, duration: 400 });
    await this.wait(450);
    const shh = title(this, W / 2, H / 2, 'Lyset slukkes!', 110, { color: C.grape }).setDepth(8850).setScrollFactor(0).setScale(0);
    this.tweens.add({ targets: shh, scale: 1, duration: 360, ease: 'Back.easeOut' });
    // Fodtrin og døre der smækker (tilfældige sider – ingen snyd!)
    for (let i = 0; i < 6; i++) this.sfx('pop', { pitch: 0.45, volume: 0.6, delay: 0.1 + i * 0.16, pan: this.rng() * 1.6 - 0.8 });
    for (let i = 0; i < 3; i++) this.sfx('bonk', { pitch: 0.7, delay: 1.1 + i * 0.32, pan: this.rng() * 1.6 - 0.8 });
    for (const h of this.alive()) {
      h.blok.setVisible(false);
      this.tweens.killTweensOf(h.check);
      h.check.setScale(0);
    }
    this.soloBubble.setVisible(false);
    await this.wait(2000);
    this.tweens.add({ targets: shh, scale: 0, alpha: 0, duration: 220, onComplete: () => shh.destroy() });
    this.seeker.setFacing(1);
    this.tweens.add({ targets: this.dark, fillAlpha: 0, duration: 450 });
    this.sfx('ding');
    this.say('Find dem!');
    for (const h of this.alive()) this.setLayout(h.player.slot, { kind: 'wait', title: `Gemt i nr. ${h.choice + 1}`, message: 'Hold vejret… eneren leder!', emoji: '🤫' });
    await this.wait(500);
  }

  /** Eneren vælger en dør. Returnerer dørens index. */
  private pickPhase(): Promise<number> {
    this.phase = 'pick';
    this.phaseTime = 0;
    const closed = this.cabins.filter((c) => !c.open).map((c) => c.index);
    this.soloBotChoice = closed[Math.floor(this.rng() * closed.length)];
    this.soloBotPickAt = 1.2 + this.rng() * 1.6;
    this.setLayout(this.solo.slot, {
      kind: 'choice',
      title: `Åbn en dør! (${this.triesLeft} forsøg)`,
      options: CABIN_COLORS.map((color, i) => ({ id: i, label: `Toilet ${i + 1}`, icon: this.cabins[i].open ? '🚪' : '🚽', color, disabled: this.cabins[i].open })),
      columns: 3,
      hint: 'Hvor gemmer de sig?',
    });
    this.cabins.forEach((c) => {
      if (!c.open) this.tweens.add({ targets: c.number, scale: { from: 1.3, to: 1 }, duration: 380, ease: 'Back.easeOut' });
    });
    this.updateHud();
    return new Promise((resolve) => (this.phaseDone = resolve));
  }

  private async openDoor(i: number): Promise<void> {
    this.phase = 'drama';
    const cab = this.cabins[i];
    this.triesLeft--;
    this.updateHud();
    this.setLayout(this.solo.slot, { kind: 'wait', title: `Toilet nr. ${i + 1}…`, message: 'Spændingen stiger!', emoji: '🥁' });
    this.setPrompt(`Toilet nr. ${i + 1}…`, '');
    this.sfx('select');

    // Gå hen til døren
    await this.walkSeeker(cabinX(i) - 120);
    this.seeker.setFacing(1);

    // Zoom ind
    const cam = this.cameras.main;
    cam.pan(cabinX(i), 620, 600, 'Sine.easeInOut');
    cam.zoomTo(1.35, 600, 'Sine.easeInOut');
    this.tweens.add({ targets: this.focus, alpha: 1, duration: 500 });
    this.sfx('drumroll');
    this.tweens.add({ targets: cab.handle, angle: { from: -28, to: 18 }, duration: 70, yoyo: true, repeat: 9 });
    this.tweens.add({ targets: cab.door, x: cab.door.x + 3, duration: 50, yoyo: true, repeat: 13 });
    for (let k = 0; k < 6; k++) this.sfx('tick', { pitch: 0.5 + k * 0.08, delay: k * 0.17, volume: 0.6 });
    const dots = title(this, cabinX(i), CABIN_BOTTOM - CABIN.h - 50, '…', 90, { color: C.sun }).setDepth(7500);
    this.tweens.add({ targets: dots, scale: { from: 0.8, to: 1.2 }, duration: 240, yoyo: true, repeat: 3 });
    this.seeker.squash(0.9, 1.1);
    await this.wait(1300);
    dots.destroy();

    // Døren flyver op!
    cab.open = true;
    this.sfx('squeak', { pitch: 0.5 });
    this.sfx('whoosh');
    this.tweens.add({
      targets: cab.door,
      scaleX: { from: 1, to: -0.42 },
      duration: 320,
      ease: 'Back.easeOut',
      onUpdate: (tw) => cab.door.setTint(tw.progress > 0.4 ? 0x9a9ab8 : 0xffffff),
    });
    cab.handle.setVisible(false);
    cab.number.setColor(C.cream);

    const found = this.alive().filter((h) => h.choice === i);
    if (found.length) await this.caught(cab, found);
    else await this.gag(cab);

    cam.pan(W / 2, H / 2, 600, 'Sine.easeInOut');
    cam.zoomTo(1, 600, 'Sine.easeInOut');
    this.tweens.add({ targets: this.focus, alpha: 0, duration: 500 });
    await this.wait(650);
  }

  private async caught(cab: Cabin, found: Hider[]): Promise<void> {
    const x = cabinX(cab.index);
    this.fx.flash(0xffffff, 200, 0.8);
    this.fx.shake(0.018, 380);
    this.sfx('explosion');
    this.sfx('scream', { delay: 0.05 });
    this.fx.burst(x, CABIN_BOTTOM - 150, { texture: TEX.star, color: [N.sun, this.solo.colorNum, 0xffffff], count: 26, speed: 800, scale: 0.7 });
    this.fx.burst(x, CABIN_BOTTOM - 150, { texture: 'wc-roll', count: 6, speed: 700, scale: 0.8, gravity: 1200, lifespan: 1100 });
    found.forEach((h, k) => {
      h.caught = true;
      this.stat(this.solo.slot, 'hits');
      this.stat(h.player.slot, 'falls');
      this.stat(h.player.slot, 'screams');
      this.vibrate(h.player.slot, 400);
      const ox = (k - (found.length - 1) / 2) * 60;
      h.blok.setPosition(x + ox, CABIN_BOTTOM - 14).setDepth(400 + k).setVisible(true);
      h.blok.setScale(0.2);
      this.tweens.add({ targets: h.blok, scale: 1, duration: 300, ease: 'Back.easeOut' });
      h.blok.hop(120, 280);
      h.blok.spinOut(1, 500);
      this.setLayout(h.player.slot, { kind: 'wait', title: 'FANGET!', message: 'Du blev fundet på toilettet…', emoji: '😱' });
    });
    this.vibrate(this.solo.slot, 200);
    const big = title(this, x, CABIN_BOTTOM - CABIN.h - 30, found.length > 1 ? `${found.length} FANGET!` : 'FANGET!', 96, { color: C.tomato }).setDepth(7600).setScale(0).setAngle(-6);
    this.tweens.add({ targets: big, scale: 1, duration: 360, ease: 'Back.easeOut' });
    this.seeker.cheer();
    this.say(found.length > 1 ? 'Bingo! Flere på én gang!' : 'Bøh! Der var du!', true);
    this.setPrompt(found.length > 1 ? 'DOBBELT-FANGST!' : 'FANGET!', found.map((h) => h.player.name).join(' + '));
    this.updateHud();
    await this.wait(1500);
    this.tweens.add({ targets: big, alpha: 0, scale: 1.4, duration: 300, onComplete: () => big.destroy() });

    // Til skammekrogen
    const caughtCount = this.hiders.filter((h) => h.caught).length;
    found.forEach((h, k) => {
      h.blok.sad();
      const slotIndex = caughtCount - found.length + k;
      const tx = 1650 + slotIndex * 95;
      const ty = 990;
      h.blok.setFacing(tx > h.blok.x ? 1 : -1);
      this.tweens.add({
        targets: h.blok,
        x: tx,
        y: ty,
        duration: 900,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          h.blok.walk(tx > h.blok.x ? 1 : -1, 0, 16 * this.speed);
          h.blok.setDepth(h.blok.y);
        },
        onComplete: () => {
          h.blok.setDepth(1200);
          h.blok.sad();
        },
      });
    });
    this.seeker.idle();
    await this.wait(500);
  }

  private async gag(cab: Cabin): Promise<void> {
    const x = cabinX(cab.index);
    const options: Gag[] = (['duck', 'flies', 'paper'] as Gag[]).filter((g) => g !== this.lastGag);
    const gag = options[Math.floor(this.rng() * options.length)];
    this.lastGag = gag;
    this.seeker.sad();
    if (gag === 'duck') {
      const duck = this.add.image(x, CABIN_BOTTOM - 80, 'wc-duck').setDepth(450).setScale(0.2);
      cab.props.push(duck);
      this.tweens.add({ targets: duck, scale: 0.9, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({ targets: duck, y: CABIN_BOTTOM - 250, duration: 330, yoyo: true, ease: 'Quad.easeOut' });
      for (let k = 0; k < 3; k++) {
        this.time.delayedCall(200 + k * 330, () => {
          this.sfx('quack', { pitch: 1 + k * 0.15 });
          this.fx.floatText(x + (k - 1) * 70, CABIN_BOTTOM - 320 - k * 20, 'QUACK!', C.sun, 64);
          this.fx.squash(duck, 1.25, 0.8);
        });
      }
      this.time.delayedCall(700, () => this.tweens.add({ targets: duck, angle: { from: -10, to: 10 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      this.setPrompt('En gummiand?!', 'Tomt toilet…');
      this.say('Kvak! Det var bare en and!');
    } else if (gag === 'flies') {
      this.sfx('fart');
      this.sfx('sizzle', { volume: 0.8, pitch: 2 });
      this.sfx('sizzle', { volume: 0.6, pitch: 2.4, delay: 0.4 });
      const stink = this.add.particles(x, CABIN_BOTTOM - 150, 'wc-stink', {
        speedY: { min: -120, max: -40 },
        speedX: { min: -60, max: 60 },
        scale: { start: 0.5, end: 1.3 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 1600,
        frequency: 260,
      }).setDepth(460);
      cab.props.push(stink);
      for (let k = 0; k < 9; k++) {
        const fly = this.add.image(x, CABIN_BOTTOM - 150, 'wc-fly').setDepth(470).setScale(0.9);
        cab.props.push(fly);
        const r = 50 + this.rng() * 90;
        const speed = 600 + this.rng() * 500;
        const phase = this.rng() * Math.PI * 2;
        const cy = CABIN_BOTTOM - 180 - this.rng() * 120;
        const orbit = { a: phase };
        cab.loops.push(this.tweens.add({
          targets: orbit,
          a: phase + Math.PI * 2 * (this.rng() < 0.5 ? 1 : -1),
          duration: speed,
          repeat: -1,
          onUpdate: () => {
            fly.setPosition(x + Math.cos(orbit.a) * r, cy + Math.sin(orbit.a * 2) * r * 0.45);
            fly.setFlipX(Math.sin(orbit.a) > 0);
          },
        }));
      }
      this.fx.floatText(x, CABIN_BOTTOM - 340, 'BZZZZ!', C.mint, 70);
      this.fx.floatText(this.seeker.x, this.seeker.y - 250, 'Bvadr!', C.cream, 50);
      this.setPrompt('PYH! Fluer!', 'Tomt toilet…');
      this.say('Fy for en stank!');
      this.tweens.add({ targets: this.seeker, x: this.seeker.x - 40, duration: 220, yoyo: true });
    } else {
      this.sfx('pop');
      this.sfx('whoosh', { delay: 0.1 });
      this.fx.burst(x, CABIN_BOTTOM - 160, { texture: 'wc-roll', count: 14, speed: 900, scale: 1, gravity: 1500, lifespan: 1300 });
      this.fx.burst(x, CABIN_BOTTOM - 160, { texture: TEX.confetti, color: 0xffffff, count: 30, speed: 700, scale: 1, gravity: 500, lifespan: 1500 });
      const roll = this.add.image(x + 40, CABIN_BOTTOM - 20, 'wc-roll').setDepth(450).setScale(1.1);
      cab.props.push(roll);
      this.tweens.add({ targets: roll, x: x + 190, angle: 540, duration: 900, ease: 'Quad.easeOut' });
      this.fx.floatText(x, CABIN_BOTTOM - 330, 'PAPIRLAVINE!', C.cream, 60);
      this.setPrompt('Kun toiletpapir!', 'Tomt toilet…');
      this.say('Kun toiletpapir! Øv!');
    }
    this.sfx('wrong', { delay: 0.5 });
    await this.wait(1600);
    this.seeker.idle();
  }

  /** Afslør hvor de overlevende gemte sig. */
  private async revealSurvivors(final: boolean): Promise<void> {
    this.phase = 'drama';
    const alive = this.alive();
    this.setPrompt(final ? 'De slap væk!' : 'De gemte sig her!', 'Nanananana!');
    this.sfx('boing');
    const groups = new Map<number, Hider[]>();
    for (const h of alive) groups.set(h.choice, [...(groups.get(h.choice) ?? []), h]);
    for (const [i, hs] of groups) {
      const cab = this.cabins[i];
      if (!cab.open) {
        cab.open = true;
        cab.handle.setVisible(false);
        this.tweens.add({ targets: cab.door, scaleX: -0.42, duration: 300, ease: 'Back.easeOut', onComplete: () => cab.door.setTint(0x9a9ab8) });
      }
      hs.forEach((h, k) => {
        h.blok.setPosition(cabinX(i) + (k - (hs.length - 1) / 2) * 60, CABIN_BOTTOM - 14).setDepth(400 + k).setVisible(true).setScale(1);
        h.blok.hop(90);
        h.blok.dance();
        this.fx.burst(h.blok.x, CABIN_BOTTOM - 120, { texture: TEX.star, color: h.player.colorNum, count: 10, speed: 400 });
        this.fx.floatText(h.blok.x, CABIN_BOTTOM - 290, 'NÆNÆ!', h.player.color, 52);
      });
    }
    this.sfx('cheer', { delay: 0.2 });
    this.seeker.sad();
    await this.wait(1900);
  }

  private async resetCabins(): Promise<void> {
    this.setPrompt('Alle døre lukkes…', '');
    // De overlevende går tilbage
    const alive = this.alive();
    alive.forEach((h, k) => {
      const tx = 760 + k * 200;
      h.homeX = tx;
      h.blok.idle();
      this.tweens.add({
        targets: h.blok,
        x: tx,
        y: WALK_Y + 10,
        duration: 700,
        ease: 'Sine.easeInOut',
        onUpdate: () => h.blok.walk(tx > h.blok.x ? 1 : -1, 0, 16 * this.speed),
        onComplete: () => h.blok.setDepth(WALK_Y + 10),
      });
    });
    await this.walkSeeker(120);
    for (const cab of this.cabins) {
      for (const p of cab.props) {
        this.tweens.killTweensOf(p);
        this.tweens.add({ targets: p, alpha: 0, duration: 300, onComplete: () => p.destroy() });
      }
      cab.props = [];
      cab.loops.forEach((tw) => tw.remove());
      cab.loops = [];
      if (cab.open) {
        cab.open = false;
        this.tweens.add({ targets: cab.door, scaleX: 1, duration: 260, delay: cab.index * 90, ease: 'Back.easeOut', onStart: () => cab.door.clearTint() });
        this.sfx('bonk', { delay: cab.index * 0.09, pitch: 0.9 + cab.index * 0.05, volume: 0.6 });
        this.time.delayedCall(260 + cab.index * 90, () => cab.handle.setVisible(true).setAngle(0));
      }
    }
    await this.wait(1000);
  }

  private walkSeeker(x: number): Promise<void> {
    if (Math.abs(this.seeker.x - x) < 5) return Promise.resolve();
    this.seekerTarget = x;
    return new Promise((resolve) => (this.seekerArrive = resolve));
  }

  // ---------------------------------------------------------------------------

  protected play(dt: number): void {
    this.phaseTime += dt;

    // Enerens gang
    if (this.seekerTarget !== null) {
      const dx = this.seekerTarget - this.seeker.x;
      const step = 900 * dt;
      if (Math.abs(dx) <= step) {
        this.seeker.x = this.seekerTarget;
        this.seekerTarget = null;
        this.seeker.walk(0, 0, dt * 1000);
        const done = this.seekerArrive;
        this.seekerArrive = null;
        done?.();
      } else {
        this.seeker.x += Math.sign(dx) * step;
        this.seeker.walk(Math.sign(dx), 0, dt * 1000 * 1.6);
      }
    } else {
      this.seeker.walk(0, 0, dt * 1000);
    }

    if (this.phase === 'hide') {
      const left = Math.max(0, HIDE_TIME - this.phaseTime);
      this.setPrompt('Trioen gemmer sig!', `Vælg et toilet på telefonen · ${Math.ceil(left)}`);
      for (const h of this.alive()) {
        if (h.locked) continue;
        const c = this.choice(h.player.slot);
        if (c >= 0) this.lockHider(h, c);
        else if (left <= 0) this.lockHider(h, Math.floor(this.rng() * DOORS));
        // Nervøs trippen
        h.blok.walk(Math.sin(this.elapsed * 3 + h.player.slot) * 0.3, 0, dt * 1000);
      }
      if (this.alive().every((h) => h.locked)) this.resolvePhase(0);
    } else if (this.phase === 'pick') {
      const left = Math.max(0, PICK_TIME - this.phaseTime);
      this.setPrompt('Hvilken dør?', `${this.solo.name} vælger · ${Math.ceil(left)}`);
      const c = this.choice(this.solo.slot);
      if (c >= 0 && c < DOORS && !this.cabins[c].open) this.resolvePhase(c);
      else if (left <= 0) this.resolvePhase(this.soloBotChoice);
      // Eneren lister frem og tilbage foran dørene
      if (this.seekerTarget === null && this.phase === 'pick') {
        const wobble = Math.sin(this.elapsed * 1.4) * 0.5;
        this.seeker.walk(wobble, 0, dt * 400);
      }
    }
  }

  private resolvePhase(value: number): void {
    const done = this.phaseDone;
    this.phaseDone = null;
    if (!done) return;
    this.phase = 'drama';
    done(value);
  }

  // ---------------------------------------------------------------------------
  // Bots

  protected botInput(slot: number): BotInput | null {
    if (this.phase === 'hide') {
      const h = this.hiders.find((x) => x.player.slot === slot);
      if (h && !h.caught && !h.locked && this.phaseTime >= h.botPickAt) return { tap: true, choice: h.botChoice, a: false };
      return { tap: false, a: false };
    }
    if (this.phase === 'pick' && slot === this.solo.slot && this.phaseTime >= this.soloBotPickAt) {
      return { tap: true, choice: this.soloBotChoice, a: false };
    }
    return { tap: false, a: false, x: 0, y: 0 };
  }
}
