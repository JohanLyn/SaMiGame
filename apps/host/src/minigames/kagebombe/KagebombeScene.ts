import Phaser from 'phaser';
import type { ButtonSpec, ControllerLayout } from '@samigame/shared';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, TEAM_HEX, TEAM_NAMES, W } from '../../kit/theme';
import { body, label, panelKey, panelSvg, title } from '../../kit/ui';
import type { MusicTheme } from '../../kit/audio';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  FROSTINGS,
  WIRE_COLORS,
  backdropSvg,
  beamSvg,
  bookSvg,
  boxSvg,
  bubbleSvg,
  cakeSvg,
  candleSvg,
  cherrySvg,
  coneSvg,
  creamBlobSvg,
  creamSplatSvg,
  flameSvg,
  miniCakeSvg,
  mouthSvg,
  scissorsSvg,
  sirenSvg,
  standSvg,
  strawberrySvg,
  sweatSvg,
  tableSvg,
} from './art';
import { makeManual, randomCake, type CakeSpec, type Manual } from './rules';

const GOAL = 3;
const FUSE = 20;
const PENALTY = 3;
const STAND_Y = 770;
const FLOOR_Y = 1012;
const CAKE_SCALE = 1.1;
const PANEL_W = 540;
const PANEL_H = 128;

type State = 'idle' | 'drop' | 'armed' | 'defused' | 'boom' | 'penalty' | 'won';

interface Station {
  team: number;
  cx: number;
  /** Retning ud mod skærmkanten (-1 venstre, 1 højre). */
  side: -1 | 1;
  reader: PlayerView;
  cutter: PlayerView;
  readerBlok: Blok;
  cutterBlok: Blok;
  book: Phaser.GameObjects.Image;
  scissors: Phaser.GameObjects.Image;
  score: number;
  slots: Phaser.GameObjects.Image[];
  state: State;
  stateT: number;
  cake: CakeSpec | null;
  manual: Manual | null;
  cakeC: Phaser.GameObjects.Container | null;
  wiresG: Phaser.GameObjects.Graphics | null;
  mouth: Phaser.GameObjects.Image | null;
  sweat: Phaser.GameObjects.Image | null;
  lcd: Phaser.GameObjects.Text | null;
  cutIdx: number;
  fuse: number;
  lastSec: number;
  botAt: number;
  botChoice: number;
  bubbleAt: number;
  bubble: Phaser.GameObjects.Container | null;
  penaltyText: Phaser.GameObjects.Text | null;
  defused: number;
}

/**
 * KAGEBOMBEN (2 mod 2, inspireret af "Keep Talking").
 * Hvert hold har en lagkage-bombe. Læseren har en hemmelig manual på telefonen, klipperen har ledningsfarverne.
 * Råb til hinanden! Rigtigt klip = næste kage. Forkert klip (eller tiden løber ud) = flødeskum i hovedet + strafpause.
 * Først til 3 desarmerede kager vinder (ellers flest efter 60 sek.).
 */
export class KagebombeScene extends MinigameScene {
  protected duration = 60;
  protected music: MusicTheme = 'tense';

  private stations: Station[] = [];
  private beams: Phaser.GameObjects.Image[] = [];
  private gameOver = false;
  private started = false;

  constructor() {
    super('kagebombe');
  }

  preload(): void {
    loadSvg(this, 'kage-bg', backdropSvg(), W, H);
    TEAM_HEX.forEach((hex, i) => {
      loadSvg(this, `kage-table-${i}`, tableSvg(hex), 880, 300);
      loadSvg(this, `kage-beam-${i}`, beamSvg(i === 0 ? '#ff6a4a' : '#ff6a4a'), 700, 260);
    });
    loadSvg(this, panelKey(PANEL_W, PANEL_H, C.deep), panelSvg(PANEL_W, PANEL_H, C.deep), PANEL_W + 24, PANEL_H + 30);
    loadSvg(this, 'kage-stand', standSvg(), 500, 120);
    FROSTINGS.forEach((f, i) => loadSvg(this, `kage-cake-${i}`, cakeSvg(f), 460, 340));
    loadSvg(this, 'kage-mouth-worried', mouthSvg('worried'), 80, 50);
    loadSvg(this, 'kage-mouth-happy', mouthSvg('happy'), 80, 50);
    loadSvg(this, 'kage-mouth-shock', mouthSvg('shock'), 80, 50);
    loadSvg(this, 'kage-candle', candleSvg(), 36, 96);
    loadSvg(this, 'kage-flame', flameSvg(), 40, 56);
    loadSvg(this, 'kage-straw', strawberrySvg(), 48, 60);
    loadSvg(this, 'kage-cherry', cherrySvg(), 48, 64);
    loadSvg(this, 'kage-box', boxSvg(), 170, 110);
    loadSvg(this, 'kage-book', bookSvg(), 140, 100);
    loadSvg(this, 'kage-scissors', scissorsSvg(), 180, 90);
    loadSvg(this, 'kage-splat', creamSplatSvg(), 220, 220);
    loadSvg(this, 'kage-blob', creamBlobSvg(), 64, 64);
    loadSvg(this, 'kage-siren', sirenSvg(), 170, 170);
    loadSvg(this, 'kage-beam', beamSvg('#ff5a4a'), 700, 260);
    loadSvg(this, 'kage-cone', coneSvg(), 600, 700);
    loadSvg(this, 'kage-mini', miniCakeSvg(true), 80, 80);
    loadSvg(this, 'kage-mini-empty', miniCakeSvg(false), 80, 80);
    loadSvg(this, 'kage-bubble', bubbleSvg(), 300, 170);
    loadSvg(this, 'kage-sweat', sweatSvg(), 36, 48);
  }

  protected setup(): void {
    this.stations = [];
    this.beams = [];
    this.gameOver = false;

    this.add.image(W / 2, H / 2, 'kage-bg').setDepth(-10000);

    // Lyskegler over hver station
    for (const cx of [480, 1440]) {
      const cone = this.add.image(cx, 0, 'kage-cone').setOrigin(0.5, 0).setDepth(-9000).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: cone, angle: { from: -3, to: 3 }, alpha: { from: 0.55, to: 0.8 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Alarm-sirene på midterpillen med roterende lysstråler
    for (let i = 0; i < 2; i++) {
      const beam = this.add.image(W / 2, 250, 'kage-beam').setOrigin(0, 0.5).setDepth(-8400).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
      beam.rotation = i * Math.PI;
      this.beams.push(beam);
    }
    const siren = this.add.image(W / 2, 250, 'kage-siren').setScale(0.8).setDepth(-8300);
    this.tweens.add({ targets: siren, scaleY: { from: 0.8, to: 0.84 }, duration: 300, yoyo: true, repeat: -1 });

    for (const t of [0, 1]) this.buildStation(t);
    this.started = false;
    this.time.delayedCall(700, () => this.stations.forEach((st) => this.newCake(st)));
  }

  private buildStation(t: number): void {
    const cx = t === 0 ? 480 : 1440;
    const side: -1 | 1 = t === 0 ? -1 : 1;
    const members = this.team(t);
    const reader = members[0];
    const cutter = members[1] ?? members[0];

    this.add.image(cx, STAND_Y + 82, `kage-table-${t}`).setOrigin(0.5, 40 / 300).setDepth(100);
    this.add.image(cx, STAND_Y, 'kage-stand').setOrigin(0.5, 30 / 120).setDepth(110);

    const readerBlok = this.spawnBlok(reader, cx + side * 365, FLOOR_Y, { size: 0.95 }).setDepth(400).setFacing(side < 0 ? 1 : -1);
    const cutterBlok = this.spawnBlok(cutter, cx - side * 345, FLOOR_Y, { size: 0.95 }).setDepth(400).setFacing(side < 0 ? -1 : 1);
    const book = this.add.image(readerBlok.x - side * 64, FLOOR_Y - 96, 'kage-book').setScale(0.85).setDepth(420);
    this.tweens.add({ targets: book, angle: { from: -4, to: 4 }, y: book.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Saksen holdes i hånden og peger ind mod kagen
    const scissors = this.add.image(cutterBlok.x + side * 92, FLOOR_Y - 62, 'kage-scissors').setScale(0.9).setDepth(420).setFlipX(side < 0);
    this.tweens.add({ targets: scissors, angle: { from: -6, to: 6 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Rolle-skilte under figurerne
    const roleChip = (x: number, text: string) => {
      const g = this.add.graphics().setDepth(430);
      g.fillStyle(N.ink, 0.85).fillRoundedRect(x - 78, FLOOR_Y + 22, 156, 40, 18);
      body(this, x, FLOOR_Y + 42, text, 22, { color: TEAM_HEX[t], stroke: 0 }).setDepth(431);
    };
    roleChip(readerBlok.x, 'LÆSER');
    roleChip(cutterBlok.x, 'KLIPPER');

    // Panel med holdnavn og kage-pladser
    this.add.image(cx, 156, panelKey(PANEL_W, PANEL_H, C.deep)).setDepth(7000);
    const stripe = this.add.graphics().setDepth(7001);
    stripe.fillStyle(Phaser.Display.Color.HexStringToColor(TEAM_HEX[t]).color, 1).fillRoundedRect(cx - PANEL_W / 2 + 10, 156 - PANEL_H / 2 + 4, PANEL_W - 20, 44, 18);
    label(this, cx, 156 - PANEL_H / 2 + 26, TEAM_NAMES[t].toUpperCase(), 32, { color: C.cream }).setDepth(7002);
    const slots: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < GOAL; i++) {
      slots.push(this.add.image(cx - 96 + i * 96, 184, 'kage-mini-empty').setScale(0.9).setDepth(7002));
    }

    this.stations.push({
      team: t,
      cx,
      side,
      reader,
      cutter,
      readerBlok,
      cutterBlok,
      book,
      scissors,
      score: 0,
      slots,
      state: 'idle',
      stateT: 0,
      cake: null,
      manual: null,
      cakeC: null,
      wiresG: null,
      mouth: null,
      sweat: null,
      lcd: null,
      cutIdx: -1,
      fuse: FUSE,
      lastSec: -1,
      botAt: -1,
      botChoice: -1,
      bubbleAt: -1,
      bubble: null,
      penaltyText: null,
      defused: 0,
    });
  }

  protected onStart(): void {
    this.say('Klip den rigtige ledning – ellers bliver det flødeskum!');
    for (const st of this.stations) {
      if (st.state === 'idle' && st.cakeC) this.arm(st);
      else st.state = 'drop';
    }
    this.started = true;
  }

  protected play(dt: number): void {
    for (const b of this.beams) b.rotation += dt * 2.2;
    for (const st of this.stations) this.updateStation(st, dt);
  }

  protected timeUp(): number[][] {
    const [a, b] = this.stations;
    const winner = a.score === b.score ? null : a.score > b.score ? a.team : b.team;
    for (const st of this.stations) {
      if (winner === null) continue;
      if (st.team === winner) {
        st.readerBlok.cheer();
        st.cutterBlok.cheer();
      } else {
        st.readerBlok.sad();
        st.cutterBlok.sad();
      }
    }
    return this.rankByTeam(winner);
  }

  // ---------------------------------------------------------------------------
  // Kage-livscyklus

  private newCake(st: Station): void {
    if (this.gameOver) return;
    const cake = randomCake(this.rng);
    const manual = makeManual(this.rng, cake);
    st.cake = cake;
    st.manual = manual;
    st.cutIdx = -1;
    st.fuse = FUSE;
    st.lastSec = -1;
    st.state = 'drop';
    st.stateT = 0;

    const c = this.add.container(st.cx, STAND_Y - 900).setDepth(200).setScale(CAKE_SCALE);
    const img = this.add.image(0, 0, `kage-cake-${cake.frosting}`).setOrigin(0.5, 330 / 340);
    c.add(img);
    // Pynt på toppen: frugt bagved, lys, frugt foran
    const topY = -278;
    const fruitKey = cake.topping === 0 ? 'kage-straw' : cake.topping === 1 ? 'kage-cherry' : null;
    if (fruitKey) {
      for (const [x, y] of [[-80, topY - 8], [80, topY - 8], [0, topY - 14]]) c.add(this.add.image(x, y, fruitKey).setOrigin(0.5, 0.85).setScale(0.8));
    }
    const n = cake.candles;
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : -84 + (168 * i) / (n - 1);
      const y = topY + (i % 2) * 6 - 2;
      c.add(this.add.image(x, y, 'kage-candle').setOrigin(0.5, 0.92).setScale(0.85));
      const flame = this.add.image(x, y - 86, 'kage-flame').setOrigin(0.5, 0.9).setScale(0.85);
      c.add(flame);
      this.tweens.add({ targets: flame, scaleX: { from: 0.75, to: 0.95 }, scaleY: { from: 0.95, to: 0.75 }, angle: { from: -6, to: 6 }, duration: 140 + i * 31, yoyo: true, repeat: -1 });
    }
    if (fruitKey) {
      for (const [x, y] of [[-120, topY + 18], [120, topY + 18]]) c.add(this.add.image(x, y, fruitKey).setOrigin(0.5, 0.85).setScale(0.8));
    }
    const mouth = this.add.image(0, -178, 'kage-mouth-worried').setScale(0.9);
    c.add(mouth);
    const sweat = this.add.image(108, -236, 'kage-sweat').setScale(0.8).setAlpha(0);
    c.add(sweat);
    const box = this.add.image(0, -14, 'kage-box');
    c.add(box);
    const lcd = label(this, -18, -16, String(FUSE), 40, { color: '#ff4b4b', stroke: 4 });
    c.add(lcd);
    const wires = this.add.graphics();
    c.add(wires);
    st.cakeC = c;
    st.mouth = mouth;
    st.sweat = sweat;
    st.lcd = lcd;
    st.wiresG = wires;
    this.drawWires(st);

    this.sfx('whoosh', { pan: this.panFor(st.cx) });
    this.tweens.add({
      targets: c,
      y: STAND_Y + 4,
      duration: 520,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.sfx('stomp', { pan: this.panFor(st.cx) });
        this.fx.dust(st.cx - 180, STAND_Y, 6);
        this.fx.dust(st.cx + 180, STAND_Y, 6);
        c.setScale(CAKE_SCALE * 1.25, CAKE_SCALE * 0.75);
        this.tweens.add({ targets: c, scaleX: CAKE_SCALE, scaleY: CAKE_SCALE, duration: 320, ease: 'Back.easeOut' });
        if (this.gameOver) return;
        if (this.started) this.arm(st);
        else st.state = 'idle';
      },
    });
  }

  private arm(st: Station): void {
    st.state = 'armed';
    st.stateT = 0;
    st.fuse = FUSE;
    st.lastSec = -1;
    this.planBots(st);
    this.sendLayouts(st);
  }

  private drawWires(st: Station): void {
    const g = st.wiresG;
    const cake = st.cake;
    if (!g || !cake) return;
    g.clear();
    const n = cake.wires.length;
    for (let i = 0; i < n; i++) {
      const sx = -165 + (330 * i) / (n - 1);
      const ex = -52 + (104 * i) / (n - 1);
      const curve = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(sx, -150),
        new Phaser.Math.Vector2(sx * 1.12, -50),
        new Phaser.Math.Vector2(ex * 1.3, -130),
        new Phaser.Math.Vector2(ex, -66),
      );
      const pts = curve.getPoints(22);
      const col = Phaser.Display.Color.HexStringToColor(WIRE_COLORS[cake.wires[i]].hex).color;
      const segs: Phaser.Math.Vector2[][] = [];
      if (i === st.cutIdx) {
        // Klippet: to stumper der hænger
        const a = pts.slice(0, 10).map((p, k) => new Phaser.Math.Vector2(p.x + k * k * 0.12 * Math.sign(sx || 1), p.y + k * 1.8));
        const b = pts.slice(13).map((p, k, arr) => new Phaser.Math.Vector2(p.x, p.y + (arr.length - k) * 1.2));
        segs.push(a, b);
      } else {
        segs.push(pts);
      }
      for (const s of segs) {
        g.lineStyle(20, N.ink, 1).strokePoints(s);
        g.lineStyle(12, col, 1).strokePoints(s);
        g.lineStyle(4, 0xffffff, 0.45).strokePoints(s.map((p) => new Phaser.Math.Vector2(p.x - 2, p.y - 3)));
        if (i === st.cutIdx) {
          const end = s === segs[0] ? s[s.length - 1] : s[0];
          g.fillStyle(N.ink, 1).fillCircle(end.x, end.y, 8);
          g.fillStyle(0xffb43a, 1).fillCircle(end.x, end.y, 5);
        }
      }
      // Klemme hvor ledningen sidder i kagen
      g.fillStyle(N.ink, 1).fillRoundedRect(sx - 13, -164, 26, 22, 6);
      g.fillStyle(0xd9dbe8, 1).fillRoundedRect(sx - 9, -160, 18, 14, 4);
    }
  }

  private updateStation(st: Station, dt: number): void {
    st.stateT += dt;
    if (st.state === 'armed') {
      st.fuse -= dt;
      const sec = Math.max(0, Math.ceil(st.fuse));
      if (sec !== st.lastSec) {
        st.lastSec = sec;
        st.lcd?.setText(String(sec).padStart(2, '0'));
        this.sfx('tick', { volume: sec <= 5 ? 0.6 : 0.25, pitch: sec <= 5 ? 1.4 : 1, pan: this.panFor(st.cx) });
        if (st.cakeC) {
          st.cakeC.setScale(CAKE_SCALE * 1.03, CAKE_SCALE * 0.97);
          this.tweens.add({ targets: st.cakeC, scaleX: CAKE_SCALE, scaleY: CAKE_SCALE, duration: 160 });
        }
      }
      const panic = st.fuse < 6;
      st.sweat?.setAlpha(panic ? 1 : 0);
      if (st.sweat && panic) st.sweat.y = -236 + ((st.stateT * 60) % 30);
      if (st.cakeC) st.cakeC.x = st.cx + (panic ? Math.sin(st.stateT * 50) * 3 : 0);

      // Bot-læseren råber svaret
      if (st.bubbleAt >= 0 && st.stateT >= st.bubbleAt) {
        st.bubbleAt = -1;
        this.shout(st);
      }
      // Klip (menneske eller bot)
      for (const p of [st.reader, st.cutter]) {
        if (!this.canCut(st, p.slot)) continue;
        const ch = this.choice(p.slot);
        if (ch >= 0) {
          this.cut(st, ch, p.slot);
          break;
        }
      }
      if (st.state === 'armed' && st.fuse <= 0) this.boom(st, true);
    } else if (st.state === 'penalty') {
      const left = Math.max(0, Math.ceil(PENALTY - st.stateT));
      st.penaltyText?.setText(`STRAF ${left}`);
      if (st.stateT >= PENALTY) {
        st.penaltyText?.destroy();
        st.penaltyText = null;
        this.newCake(st);
      }
    }
  }

  /** Kan denne spiller klippe? Klipperen altid; læseren hvis makkeren er en bot (så får man begge dele). */
  private canCut(st: Station, slot: number): boolean {
    if (slot === st.cutter.slot) return true;
    return slot === st.reader.slot && this.isBotNow(st.cutter.slot) && !this.isBotNow(slot);
  }

  private cut(st: Station, paletteId: number, slot: number): void {
    const cake = st.cake;
    if (!cake || !st.manual) return;
    const idx = cake.wires.indexOf(paletteId);
    if (idx < 0) return;
    st.cutIdx = idx;
    this.drawWires(st);
    this.vibrate(slot, 50);
    // Saksen klipper
    const sc = st.scissors;
    this.tweens.add({ targets: sc, scaleY: 0.35, duration: 70, yoyo: true, repeat: 1 });
    st.cutterBlok.squash(1.2, 0.85);
    this.sfx('crunch', { pan: this.panFor(st.cx) });
    const n = cake.wires.length;
    const wx = st.cx + (-150 + (300 * idx) / (n - 1)) * 0.6 * CAKE_SCALE;
    const wy = STAND_Y - 130 * CAKE_SCALE;
    this.fx.burst(wx, wy, { texture: TEX.spark, color: [N.sun, 0xffffff], count: 12, speed: 380, scale: 0.5, gravity: 600, lifespan: 450, depth: 600 });
    this.fx.floatText(wx, wy - 60, 'SNIP!', C.cream, 48);
    if (idx === st.manual.answer) this.defuse(st, slot);
    else this.boom(st, false, slot);
  }

  private defuse(st: Station, slot: number): void {
    st.state = 'defused';
    st.stateT = 0;
    st.score++;
    st.defused++;
    this.stat(slot, 'hits');
    st.lcd?.setText('OK').setColor('#3ee6a8');
    st.mouth?.setTexture('kage-mouth-happy');
    st.sweat?.setAlpha(0);
    st.bubble?.destroy();
    st.bubble = null;
    this.sfx('coin', { pan: this.panFor(st.cx) });
    this.sfx('win', {});
    this.fx.floatText(st.cx, STAND_Y - 420, 'DESARMERET!', C.mint, 64);
    this.fx.burst(st.cx, STAND_Y - 200, { texture: TEX.star, color: [N.sun, N.mint, 0xffffff], count: 18, speed: 600, scale: 0.6, gravity: 700 });
    st.readerBlok.cheer();
    st.cutterBlok.cheer();
    if (st.cakeC) this.tweens.add({ targets: st.cakeC, y: STAND_Y - 60, duration: 220, yoyo: true, ease: 'Quad.easeOut' });
    const slotImg = st.slots[st.score - 1];
    if (slotImg) {
      slotImg.setTexture('kage-mini').setScale(0);
      this.tweens.add({ targets: slotImg, scale: 0.9, duration: 380, ease: 'Back.easeOut' });
    }
    this.setLayoutAllOf(st, { kind: 'wait', title: 'DESARMERET!', message: 'Godt klippet! Næste kage er på vej...', emoji: '🎂' });

    if (st.score >= GOAL) {
      this.gameOver = true;
      st.state = 'won';
      this.say('Tre kager reddet! Sikke et team!');
      this.fx.confetti(1800);
      const other = this.stations.find((o) => o !== st);
      if (other) {
        other.readerBlok.sad();
        other.cutterBlok.sad();
      }
      this.time.delayedCall(1600, () => this.finish(this.rankByTeam(st.team)));
      return;
    }
    if (this.rng() < 0.5) this.say(this.rng() < 0.5 ? 'Puha! Kagen er reddet!' : 'Flot klip!');
    this.time.delayedCall(1300, () => {
      if (this.gameOver) return;
      st.readerBlok.idle();
      st.cutterBlok.idle();
      const c = st.cakeC;
      if (c) {
        this.tweens.add({ targets: c, x: st.cx + st.side * 900, angle: st.side * 20, duration: 450, ease: 'Back.easeIn', onComplete: () => c.destroy() });
        this.sfx('whoosh', { pan: this.panFor(st.cx) });
      }
      st.cakeC = null;
      this.time.delayedCall(350, () => this.newCake(st));
    });
  }

  private boom(st: Station, timeout: boolean, slot = st.cutter.slot): void {
    st.state = 'boom';
    st.stateT = 0;
    st.bubble?.destroy();
    st.bubble = null;
    st.mouth?.setTexture('kage-mouth-shock');
    st.lcd?.setText('!!');
    this.stat(slot, 'falls');
    this.vibrate(st.reader.slot, 300);
    this.vibrate(st.cutter.slot, 300);
    this.setLayoutAllOf(st, { kind: 'wait', title: 'SPLAT!', message: 'Flødeskum i hovedet! Tør øjnene...', emoji: '🎂' });
    if (timeout) this.fx.floatText(st.cx, STAND_Y - 420, 'TIDEN ER GÅET!', C.tomato, 56);
    else this.fx.floatText(st.cx, STAND_Y - 420, 'FORKERT LEDNING!', C.tomato, 56);
    const c = st.cakeC;
    // Kagen pustes op ... og BOM
    if (c) {
      this.tweens.add({
        targets: c,
        scaleX: CAKE_SCALE * 1.25,
        scaleY: CAKE_SCALE * 1.3,
        duration: 260,
        ease: 'Quad.easeIn',
        onComplete: () => {
          c.destroy();
          this.explode(st);
        },
      });
      this.sfx('squeak', { pitch: 0.5 });
    } else {
      this.explode(st);
    }
    st.cakeC = null;
  }

  private explode(st: Station): void {
    const x = st.cx;
    const y = STAND_Y - 160;
    this.sfx('explosion', { pan: this.panFor(x) });
    this.sfx('splat', { delay: 0.05, pan: this.panFor(x) });
    this.fx.shake(0.018, 380);
    this.fx.hitstop(70);
    this.fx.flash(0xffffff, 140, 0.45);
    // Flødeskums-"puf" hvor kagen stod
    for (let i = 0; i < 3; i++) {
      const poof = this.add.image(x + (i - 1) * 120, y + (i === 1 ? -40 : 30), 'kage-splat').setDepth(880).setScale(0.2).setAngle(this.rng() * 360);
      this.tweens.add({ targets: poof, scale: 1.5 + i * 0.2, duration: 220, delay: i * 40, ease: 'Back.easeOut' });
      this.tweens.add({ targets: poof, alpha: 0, scale: 2.1, delay: 500 + i * 60, duration: 500, onComplete: () => poof.destroy() });
    }
    this.fx.burst(x, y, { texture: 'kage-blob', color: [0xffffff, 0xfff0f6], count: 34, speed: 1100, scale: 0.9, gravity: 1300, lifespan: 1100, depth: 900 });
    this.fx.burst(x, y, { texture: TEX.drop, color: [0xff8cc6, 0xffe0a8, 0xff4b4b], count: 16, speed: 800, scale: 0.7, gravity: 1300, lifespan: 900, depth: 900 });
    // Flødeskum på "kameraet" over holdets halvdel
    for (let i = 0; i < 6; i++) {
      const sx = x + (this.rng() - 0.5) * 760;
      const sy = 260 + this.rng() * 640;
      const s = this.add.image(sx, sy, 'kage-splat').setDepth(8600).setScale(0).setAngle(this.rng() * 360);
      const sc = 1.1 + this.rng() * 1.1;
      this.tweens.add({ targets: s, scale: sc, duration: 140, delay: i * 40, ease: 'Back.easeOut' });
      this.tweens.add({ targets: s, y: sy + 120, scaleY: sc * 1.2, delay: 600, duration: 2000, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: s, alpha: 0, delay: 1900 + i * 80, duration: 600, onComplete: () => s.destroy() });
    }
    // Flødeskum i ansigtet på begge
    for (const b of [st.readerBlok, st.cutterBlok]) {
      b.sad();
      b.spinOut(1, 500);
      const face = this.add.image(b.x, b.y - 150, 'kage-splat').setScale(0.55).setDepth(460);
      this.tweens.add({ targets: face, y: face.y + 30, alpha: 0, delay: PENALTY * 1000 - 600, duration: 600, onComplete: () => face.destroy() });
    }
    this.say(this.rng() < 0.5 ? 'SPLAT! Flødeskum i hovedet!' : 'Bum! Den kage var vist ikke klar.');
    this.time.delayedCall(450, () => {
      if (this.gameOver) return;
      st.state = 'penalty';
      st.stateT = 0;
      st.penaltyText = title(this, st.cx, STAND_Y - 220, `STRAF ${PENALTY}`, 72, { color: C.tomato }).setDepth(700);
      this.fx.popIn(st.penaltyText);
      st.readerBlok.idle();
      st.cutterBlok.idle();
    });
  }

  // ---------------------------------------------------------------------------
  // Telefoner

  private setLayoutAllOf(st: Station, layout: ControllerLayout): void {
    this.setLayout(st.reader.slot, layout);
    if (st.cutter.slot !== st.reader.slot) this.setLayout(st.cutter.slot, layout);
  }

  private sendLayouts(st: Station): void {
    const cake = st.cake;
    const manual = st.manual;
    if (!cake || !manual) return;
    const accent = TEAM_HEX[st.team];
    const buttons: ButtonSpec[] = [...cake.wires]
      .sort((a, b) => a - b)
      .map((id) => ({ id, label: WIRE_COLORS[id].name, color: WIRE_COLORS[id].hex, icon: '✂️' }));
    const columns = buttons.length > 4 ? 3 : 2;
    const readerSolo = this.isBotNow(st.cutter.slot) || st.cutter.slot === st.reader.slot;
    const cutterSolo = this.isBotNow(st.reader.slot);
    this.setLayout(
      st.reader.slot,
      readerSolo
        ? { kind: 'info', title: '📖 KAGE-MANUAL', lines: manual.lines, buttons, hint: 'Første regel der passer, gælder!', accent }
        : { kind: 'info', title: '📖 KAGE-MANUAL', lines: manual.lines, hint: 'Første regel der passer, gælder! Råb til din makker!', accent },
    );
    if (st.cutter.slot !== st.reader.slot) {
      this.setLayout(
        st.cutter.slot,
        cutterSolo
          ? { kind: 'info', title: '📖 KAGE-MANUAL', lines: manual.lines, buttons, hint: 'Din makker er en bot – læs selv og klip!', accent }
          : { kind: 'buttons', buttons, columns, hint: 'Lyt til din makker – og klip!', accent },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Bots

  private planBots(st: Station): void {
    st.botAt = -1;
    st.bubbleAt = -1;
    const readerBot = this.isBotNow(st.reader.slot);
    const cutterBot = this.isBotNow(st.cutter.slot);
    if (readerBot) st.bubbleAt = cutterBot ? 1.2 + this.rng() * 1.6 : 3 + this.rng() * 3;
    if (cutterBot) {
      const delay = readerBot ? st.bubbleAt + 0.9 + this.rng() * 1.6 : 4.5 + this.rng() * 3;
      st.botAt = delay;
      const cake = st.cake!;
      const answer = st.manual!.answer;
      let pick = answer;
      if (this.rng() < 0.17 && cake.wires.length > 1) {
        do pick = Math.floor(this.rng() * cake.wires.length);
        while (pick === answer);
      }
      st.botChoice = cake.wires[pick];
    }
  }

  /** Bot-læseren råber svaret i en talebobbel. */
  private shout(st: Station): void {
    const cake = st.cake;
    const manual = st.manual;
    if (!cake || !manual) return;
    const wire = WIRE_COLORS[cake.wires[manual.answer]];
    const x = st.readerBlok.x - st.side * 120;
    const y = FLOOR_Y - 330;
    const bg = this.add.image(0, 0, 'kage-bubble').setFlipX(st.side > 0);
    const txt = label(this, 0, -12, `KLIP ${wire.name}!`, 42, { color: wire.hex === '#f4f4ff' ? C.cream : wire.hex });
    const cont = this.add.container(x, y, [bg, txt]).setDepth(7600).setScale(0);
    this.tweens.add({ targets: cont, scale: 0.85, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: cont, angle: { from: -3, to: 3 }, duration: 120, yoyo: true, repeat: 5 });
    st.readerBlok.hop(40, 160);
    this.sfx('quack', { pitch: 1.2, volume: 0.6, pan: this.panFor(x) });
    st.bubble?.destroy();
    st.bubble = cont;
    this.time.delayedCall(2400, () => {
      if (st.bubble === cont) st.bubble = null;
      this.tweens.add({ targets: cont, scale: 0, duration: 200, onComplete: () => cont.destroy() });
    });
  }

  protected botInput(slot: number): BotInput | null {
    const st = this.stations.find((s) => s.cutter.slot === slot);
    if (!st || st.state !== 'armed' || st.botAt < 0) return {};
    if (st.stateT >= st.botAt) {
      st.botAt = -1;
      return { tap: true, choice: st.botChoice };
    }
    return {};
  }
}
