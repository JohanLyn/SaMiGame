import Phaser from 'phaser';
import { audio, type MusicTheme } from '../../kit/audio';
import { loadSvg } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, TEAM_HEX, TEAM_NAMES, W } from '../../kit/theme';
import { label, panelKey, panelSvg, title } from '../../kit/ui';
import type { BotInput, PlayerView } from '../../flow/types';
import type { Blok } from '../../objects/Blok';
import { MinigameScene } from '../_framework/MinigameScene';
import {
  DIRS,
  arrowSvg,
  backdropSvg,
  crowdSvg,
  discoBallSvg,
  floorSpotSvg,
  highwaySvg,
  hitRingSvg,
  receptorSvg,
  sparkleSvg,
  spotBeamSvg,
  spotLampSvg,
} from './art';

/** Musikken 'game' kører 140 BPM – pilene følger den. */
const BPM = 140;
const BEAT = 60 / BPM;
const LEAD = 0.08;
const SPEED = 500;
const RECEPTOR_Y = 268;
const HW_X = W / 2;
const HW_W = 440;
const HW_TOP = 186;
const COL_W = HW_W / 4;
const WIN_OK = 0.25;
const WIN_GOOD = 0.12;
const WIN_PERFECT = 0.06;
const SYNC_TIGHT = 0.07;
const SYNC_LOOSE = 0.15;
const FEET_Y = 940;
const PANEL_W = 460;
const PANEL_H = 150;

interface Note {
  t: number;
  dir: number;
  img: Phaser.GameObjects.Image | null;
  /** Træf pr. plads: tidsafvigelse (sek.) eller null = misset. */
  res: Map<number, number | null>;
  teamDone: Set<number>;
  gone: boolean;
}

interface Dancer {
  p: PlayerView;
  blok: Blok;
  /** Spejling: højre danser i parret spejler bevægelserne. */
  mirror: 1 | -1;
}

interface TeamState {
  idx: number;
  dancers: Dancer[];
  score: number;
  shown: number;
  combo: number;
  best: number;
  syncs: number;
  cx: number;
  scoreText: Phaser.GameObjects.Text;
  comboText: Phaser.GameObjects.Text;
  judge: Phaser.GameObjects.Text;
  syncText: Phaser.GameObjects.Text;
  spot: Phaser.GameObjects.Image;
  lit: number;
}

interface BotBrain {
  skill: number;
  sigma: number;
  planned: Set<Note>;
  queue: { at: number; dir: number }[];
}

/**
 * SPEJL-DANSEN (2 mod 2, rytmespil).
 * Pile ruller op mod linjen i takt med musikken. Begge på holdet trykker samme retning på slaget.
 * Point for præcision – og ekstra for at ramme SYNKRONT med makkeren. Højeste holdscore efter 30 sek. vinder.
 */
export class SpejldansScene extends MinigameScene {
  protected duration = 30;
  protected music: MusicTheme = 'game';

  private notes: Note[] = [];
  private teamsState: TeamState[] = [];
  private bots = new Map<number, BotBrain>();
  private clock = -10;
  private lastBeat = -1;
  private receptors: Phaser.GameObjects.Image[] = [];
  private floor!: Phaser.GameObjects.Graphics;
  private floorTiles: { pts: Phaser.Math.Vector2[]; cx: number; color: number; alpha: number }[] = [];
  private beams: Phaser.GameObjects.Image[] = [];
  private crowd!: Phaser.GameObjects.Image;
  private balls: Phaser.GameObjects.Image[] = [];
  private ended = false;
  private beatLines!: Phaser.GameObjects.Graphics;

  constructor() {
    super('spejldans');
  }

  preload(): void {
    loadSvg(this, 'dans-bg', backdropSvg(), W, H);
    loadSvg(this, 'dans-crowd', crowdSvg(), W, 200);
    DIRS.forEach((d) => loadSvg(this, `dans-arrow-${d.id}`, arrowSvg(d.color), 120, 120));
    loadSvg(this, 'dans-receptor', receptorSvg(), 130, 130);
    loadSvg(this, 'dans-ball', discoBallSvg(), 160, 170);
    loadSvg(this, 'dans-spot', floorSpotSvg(), 400, 140);
    loadSvg(this, 'dans-lamp', spotLampSvg(), 100, 90);
    loadSvg(this, 'dans-hw', highwaySvg(HW_W, H - HW_TOP + 40), HW_W + 20, H - HW_TOP + 40);
    loadSvg(this, 'dans-sparkle', sparkleSvg(), 64, 64);
    loadSvg(this, 'dans-ring', hitRingSvg(), 140, 140);
    ['#ff5fa2', '#47b8ff', '#3ee6a8', '#ffcf3a'].forEach((c, i) => loadSvg(this, `dans-beam-${i}`, spotBeamSvg(c), 500, 1000));
    loadSvg(this, panelKey(PANEL_W, PANEL_H, C.deep), panelSvg(PANEL_W, PANEL_H, C.deep), PANEL_W + 24, PANEL_H + 30);
  }

  protected setup(): void {
    this.notes = [];
    this.teamsState = [];
    this.bots.clear();
    this.clock = -10;
    this.lastBeat = -1;
    this.receptors = [];
    this.beams = [];
    this.balls = [];
    this.floorTiles = [];
    this.ended = false;

    this.add.image(W / 2, H / 2, 'dans-bg').setDepth(-10000);
    this.crowd = this.add.image(W / 2, 700, 'dans-crowd').setOrigin(0.5, 1).setDepth(-9000);

    // Lyskegler fra spots i loftet
    const lamps = [560, 800, 1120, 1360];
    lamps.forEach((x, i) => {
      const beam = this.add.image(x, 30, `dans-beam-${i}`).setOrigin(0.5, 0).setAlpha(0.32).setDepth(-8500).setBlendMode(Phaser.BlendModes.ADD);
      beam.angle = i < 2 ? -18 : 18;
      this.tweens.add({ targets: beam, angle: i < 2 ? 22 : -22, duration: 2400 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.beams.push(beam);
      this.add.image(x, 30, 'dans-lamp').setScale(0.8).setDepth(-8400);
    });
    // Spejlkugler
    for (const x of [660, 1260]) {
      const ball = this.add.image(x, 30, 'dans-ball').setOrigin(0.5, 0).setScale(0.8).setDepth(-8300);
      this.tweens.add({ targets: ball, angle: { from: -4, to: 4 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.balls.push(ball);
      const sparkles = this.add.particles(x, 110, 'dans-sparkle', {
        x: { min: -60, max: 60 },
        y: { min: -50, max: 50 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 500,
        frequency: 180,
        tint: [0xffffff, 0xffcf3a, 0x47b8ff, 0xff5fa2],
      });
      sparkles.setDepth(-8290);
    }

    this.buildFloor();

    // Highway
    this.add.image(HW_X, HW_TOP, 'dans-hw').setOrigin(0.5, 0).setDepth(100);
    DIRS.forEach((d, i) => {
      const r = this.add.image(this.colX(i), RECEPTOR_Y, 'dans-receptor').setRotation(d.rot).setScale(0.88).setDepth(120);
      this.receptors.push(r);
    });
    label(this, HW_X, H - 34, 'TRYK PÅ LINJEN – SAMTIDIG MED MAKKEREN!', 30, { color: C.sun }).setDepth(180);
    this.beatLines = this.add.graphics().setDepth(110);
    // Glødende linje bag modtagerne
    const glow = this.add.graphics().setDepth(115);
    glow.fillStyle(0xffffff, 0.1).fillRoundedRect(HW_X - HW_W / 2 + 8, RECEPTOR_Y - 58, HW_W - 16, 116, 26);
    glow.lineStyle(4, 0xfff6e0, 0.5).strokeRoundedRect(HW_X - HW_W / 2 + 8, RECEPTOR_Y - 58, HW_W - 16, 116, 26);

    // Hold
    for (const t of [0, 1]) this.buildTeam(t);

    this.makeChart();
  }

  private colX(i: number): number {
    return HW_X - HW_W / 2 + COL_W * (i + 0.5);
  }

  private buildFloor(): void {
    this.floor = this.add.graphics().setDepth(-7000);
    const vp = { x: W / 2, y: 260 };
    const rows = [672, 700, 738, 790, 860, 955, 1080];
    const bottomXs = Array.from({ length: 15 }, (_, k) => -1100 + k * ((W + 2200) / 14));
    const xAt = (bx: number, y: number) => vp.x + (bx - vp.x) * ((y - vp.y) / (H - vp.y));
    for (let r = 0; r < rows.length - 1; r++) {
      for (let k = 0; k < bottomXs.length - 1; k++) {
        const y0 = rows[r];
        const y1 = rows[r + 1];
        const pts = [
          new Phaser.Math.Vector2(xAt(bottomXs[k], y0), y0),
          new Phaser.Math.Vector2(xAt(bottomXs[k + 1], y0), y0),
          new Phaser.Math.Vector2(xAt(bottomXs[k + 1], y1), y1),
          new Phaser.Math.Vector2(xAt(bottomXs[k], y1), y1),
        ];
        const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
        this.floorTiles.push({ pts, cx, color: 0x2a1a5a, alpha: 1 });
      }
    }
    this.lightFloor();
  }

  private lightFloor(teamFlash = -1): void {
    const palette = [N.bubblegum, N.sky, N.mint, N.sun, N.grape];
    for (const tile of this.floorTiles) {
      const teamSide = tile.cx < W / 2 ? 0 : 1;
      const roll = this.rng();
      if (teamFlash === teamSide && roll < 0.6) {
        tile.color = Phaser.Display.Color.HexStringToColor(TEAM_HEX[teamSide]).color;
        tile.alpha = 0.9;
      } else if (roll < 0.22) {
        tile.color = palette[Math.floor(this.rng() * palette.length)];
        tile.alpha = 0.75;
      } else {
        tile.color = (tile.pts[0].y * 3 + tile.cx) % 2 > 1 ? 0x2a1a5a : 0x22144a;
        tile.alpha = 1;
      }
    }
    const g = this.floor;
    g.clear();
    g.fillStyle(0x140c34, 1).fillRect(0, 672, W, H - 672);
    for (const tile of this.floorTiles) {
      g.fillStyle(tile.color, tile.alpha).fillPoints(tile.pts, true);
      g.lineStyle(4, N.ink, 0.9).strokePoints(tile.pts, true);
    }
    g.fillStyle(0xffffff, 0.06).fillRect(0, 672, W, 30);
  }

  private buildTeam(t: number): void {
    const members = this.team(t);
    const cx = t === 0 ? 440 : W - 440;
    const xs = [cx - 135, cx + 135];
    const spot = this.add.image(cx, FEET_Y + 6, 'dans-spot').setScale(1.6, 1.2).setDepth(-6000).setBlendMode(Phaser.BlendModes.ADD).setTint(Phaser.Display.Color.HexStringToColor(TEAM_HEX[t]).color).setAlpha(0.5);
    const dancers: Dancer[] = members.map((p, i) => {
      const blok = this.spawnBlok(p, xs[i] ?? cx, FEET_Y, { size: 1.12 }).setDepth(400 + i);
      // Makkerne står og kigger på hinanden – spejlbilleder.
      blok.setFacing(i === 0 ? 1 : -1);
      blok.dance();
      if (p.isBot) this.bots.set(p.slot, { skill: 0.82 + this.rng() * 0.13, sigma: 0.03 + this.rng() * 0.04, planned: new Set(), queue: [] });
      return { p, blok, mirror: i === 0 ? 1 : -1 };
    });

    const px = t === 0 ? 270 : W - 270;
    const py = 112;
    this.add.image(px, py, panelKey(PANEL_W, PANEL_H, C.deep)).setDepth(7000);
    const stripe = this.add.graphics().setDepth(7001);
    stripe.fillStyle(Phaser.Display.Color.HexStringToColor(TEAM_HEX[t]).color, 1).fillRoundedRect(px - PANEL_W / 2 + 10, py - PANEL_H / 2 + 4, PANEL_W - 20, 44, 18);
    label(this, px, py - PANEL_H / 2 + 26, TEAM_NAMES[t].toUpperCase(), 32, { color: C.cream }).setDepth(7002);
    const scoreText = title(this, px - 70, py + 26, '0', 64, { color: C.sun }).setDepth(7002);
    const comboText = label(this, px + 100, py + 26, '', 28, { color: C.mint }).setDepth(7002);
    const judge = title(this, cx, 560, '', 56, { color: C.cream }).setDepth(7500).setAlpha(0);
    const syncText = title(this, cx, 480, 'SYNKRON!', 76, { color: TEAM_HEX[t] }).setDepth(7600).setAlpha(0);
    this.teamsState.push({ idx: t, dancers, score: 0, shown: 0, combo: 0, best: 0, syncs: 0, cx, scoreText, comboText, judge, syncText, spot, lit: 0 });
  }

  /** Koreografi: flere pile jo længere vi kommer. */
  private makeChart(): void {
    const total = this.duration ?? 30;
    const lastBeat = Math.floor((total - 0.8 - LEAD) / BEAT);
    let prevDir = -1;
    let sameCount = 0;
    let gap = 0;
    for (let b = 4; b <= lastBeat; b++) {
      const prog = b / lastBeat;
      const density = 0.5 + prog * 0.4;
      gap++;
      const onDownbeat = b % 2 === 0;
      const want = gap >= 3 || (onDownbeat ? this.rng() < density + 0.25 : this.rng() < density - 0.2 && prog > 0.2);
      if (!want || gap < (prog < 0.25 ? 2 : 1)) continue;
      gap = 0;
      let dir = Math.floor(this.rng() * 4);
      if (dir === prevDir && sameCount >= 1) dir = (dir + 1 + Math.floor(this.rng() * 3)) % 4;
      sameCount = dir === prevDir ? sameCount + 1 : 0;
      prevDir = dir;
      this.notes.push({ t: LEAD + b * BEAT, dir, img: null, res: new Map(), teamDone: new Set(), gone: false });
    }
  }

  protected onStart(): void {
    this.clock = 0;
    // Start musikken forfra, så pilene ligger på slagene.
    audio.music(null);
    audio.music('game');
    this.say('danceStart');
  }

  protected play(dt: number): void {
    this.clock += dt;
    const beat = Math.floor((this.clock - LEAD) / BEAT);
    if (beat !== this.lastBeat && this.clock >= LEAD) {
      this.lastBeat = beat;
      this.onBeat(beat);
    }

    this.drawBeatLines();

    // Pile: dukker op, ruller, forsvinder
    const travel = (H + 80 - RECEPTOR_Y) / SPEED;
    for (const n of this.notes) {
      if (n.gone) continue;
      const dtNote = n.t - this.clock;
      if (dtNote > travel) break;
      if (!n.img) {
        n.img = this.add.image(this.colX(n.dir), H + 80, `dans-arrow-${n.dir}`).setRotation(DIRS[n.dir].rot).setScale(0.92).setDepth(150);
      }
      const y = RECEPTOR_Y + dtNote * SPEED;
      n.img.y = y;
      if (dtNote < 0) n.img.setAlpha(Math.max(0, 1 + dtNote / WIN_OK));
      // Tiden er gået for denne pil → miss for dem der ikke ramte
      if (dtNote < -WIN_OK) {
        for (const p of this.players) {
          if (!n.res.has(p.slot)) this.judge(p, n, null);
        }
        n.img.destroy();
        n.img = null;
        n.gone = true;
      }
    }

    // Input
    if (!this.ended) {
      for (const p of this.players) {
        const ch = this.choice(p.slot);
        if (ch >= 0 && ch < 4) this.tap(p, ch);
      }
    }

    // Score-tæller ruller op
    for (const team of this.teamsState) {
      if (team.shown !== team.score) {
        const diff = team.score - team.shown;
        team.shown += Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * Math.min(1, dt * 10)));
        if (Math.sign(team.score - team.shown) !== Math.sign(diff)) team.shown = team.score;
        team.scoreText.setText(String(team.shown));
      }
      team.lit = Math.max(0, team.lit - dt * 2);
      team.spot.setAlpha(0.35 + team.lit * 0.5);
    }
  }

  protected timeUp(): number[][] {
    this.ended = true;
    const [a, b] = this.teamsState;
    const winner = a.score === b.score ? null : a.score > b.score ? a.idx : b.idx;
    for (const team of this.teamsState) {
      for (const d of team.dancers) {
        if (winner === null || team.idx === winner) d.blok.cheer();
        else d.blok.sad();
      }
    }
    if (winner !== null) {
      this.fx.confetti(1500);
      this.say('danceCouple');
    }
    return this.rankByTeam(winner);
  }

  // ---------------------------------------------------------------------------

  /** Vandrette taktstreger der ruller op ad banen. */
  private drawBeatLines(): void {
    const g = this.beatLines;
    g.clear();
    const first = Math.ceil((this.clock - LEAD - 0.3) / BEAT);
    for (let b = first; ; b++) {
      const t = LEAD + b * BEAT;
      const y = RECEPTOR_Y + (t - this.clock) * SPEED;
      if (y > H) break;
      if (y < HW_TOP + 10) continue;
      const strong = b % 4 === 0;
      g.fillStyle(strong ? 0xfff6e0 : 0x9b5cff, strong ? 0.28 : 0.2).fillRect(HW_X - HW_W / 2 + 14, y - (strong ? 3 : 2), HW_W - 28, strong ? 6 : 4);
    }
  }

  private onBeat(beat: number): void {
    for (const r of this.receptors) {
      r.setScale(0.98);
      this.tweens.add({ targets: r, scale: 0.88, duration: 160 });
    }
    this.crowd.y = 692;
    this.tweens.add({ targets: this.crowd, y: 700, duration: BEAT * 800, ease: 'Quad.easeOut' });
    if (beat % 2 === 0) this.lightFloor();
    for (const b of this.balls) b.setScale(0.84);
    this.tweens.add({ targets: this.balls, scale: 0.8, duration: 200 });
  }

  private tap(p: PlayerView, dir: number): void {
    const team = this.teamsState.find((t) => t.dancers.some((d) => d.p.slot === p.slot));
    if (!team) return;
    let best: Note | null = null;
    let bestErr = Infinity;
    for (const n of this.notes) {
      if (n.gone || n.dir !== dir || n.res.has(p.slot)) continue;
      const err = this.clock - n.t;
      if (Math.abs(err) <= WIN_OK && Math.abs(err) < Math.abs(bestErr)) {
        best = n;
        bestErr = err;
      }
      if (n.t - this.clock > WIN_OK) break;
    }
    const dancer = team.dancers.find((d) => d.p.slot === p.slot)!;
    this.pose(dancer, dir);
    if (!best) {
      // Forkert tryk: lille straf og kombo brudt
      team.score = Math.max(0, team.score - 15);
      team.combo = 0;
      team.comboText.setText('');
      this.flashJudge(team, 'UPS!', C.tomato);
      this.sfx('wrong', { volume: 0.35, pan: this.panFor(dancer.blok.x) });
      return;
    }
    this.judge(p, best, bestErr);
  }

  private judge(p: PlayerView, n: Note, err: number | null): void {
    n.res.set(p.slot, err);
    const team = this.teamsState.find((t) => t.dancers.some((d) => d.p.slot === p.slot));
    if (!team) return;
    const dancer = team.dancers.find((d) => d.p.slot === p.slot)!;
    if (err === null) {
      this.flashJudge(team, 'MISSER', '#b8b0e0');
      dancer.blok.bonk();
    } else {
      const a = Math.abs(err);
      const [txt, col, pts] = a <= WIN_PERFECT ? ['PERFEKT!', C.mint, 100] : a <= WIN_GOOD ? ['GODT!', C.sky, 60] : ['OK', C.sun, 30];
      const mult = 1 + Math.min(1, team.combo / 10);
      team.score += Math.round(pts * mult);
      this.flashJudge(team, txt, col);
      this.stat(p.slot, 'hits');
      this.vibrate(p.slot, 20);
      // Træf-effekt ved linjen i spillerens farve
      const x = this.colX(n.dir) + (team.idx === 0 ? -22 : 22);
      const ring = this.add.image(x, RECEPTOR_Y, 'dans-ring').setTint(p.colorNum).setScale(0.5).setDepth(160);
      this.tweens.add({ targets: ring, scale: 1.2, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
      this.fx.burst(this.colX(n.dir), RECEPTOR_Y, { texture: 'dans-sparkle', color: [Phaser.Display.Color.HexStringToColor(DIRS[n.dir].color).color, 0xffffff], count: 6, speed: 300, scale: 0.4, gravity: 0, lifespan: 350, depth: 170 });
      this.sfx('pop', { volume: 0.3, pitch: 1 + n.dir * 0.12, pan: this.panFor(dancer.blok.x) });
      team.lit = 1;
    }
    // Har begge på holdet nu svaret på denne pil?
    const mates = team.dancers.map((d) => d.p.slot);
    if (mates.every((s) => n.res.has(s)) && !n.teamDone.has(team.idx)) {
      n.teamDone.add(team.idx);
      const errs = mates.map((s) => n.res.get(s));
      if (errs.every((e) => e !== null && e !== undefined)) {
        const delta = mates.length > 1 ? Math.abs((errs[0] as number) - (errs[1] as number)) : 0;
        team.combo++;
        team.best = Math.max(team.best, team.combo);
        team.comboText.setText(`KOMBO ×${team.combo}`).setScale(1.3);
        this.tweens.add({ targets: team.comboText, scale: 1, duration: 200, ease: 'Back.easeOut' });
        if (delta <= SYNC_TIGHT) this.sync(team, 80, 'SYNKRON!');
        else if (delta <= SYNC_LOOSE) this.sync(team, 40, 'NÆSTEN!');
      } else {
        team.combo = 0;
        team.comboText.setText('');
      }
    }
    // Alle har ramt → pilen popper
    if (n.img && this.players.every((pl) => n.res.get(pl.slot) !== undefined && n.res.get(pl.slot) !== null)) {
      const img = n.img;
      n.img = null;
      n.gone = true;
      this.tweens.add({ targets: img, scale: 1.4, alpha: 0, duration: 200, onComplete: () => img.destroy() });
    }
  }

  private sync(team: TeamState, bonus: number, text: string): void {
    team.score += bonus;
    team.syncs++;
    const st = team.syncText;
    this.tweens.killTweensOf(st);
    st.setText(text).setAlpha(1).setScale(0.3).setAngle((this.rng() - 0.5) * 12).setY(480);
    this.tweens.add({ targets: st, scale: text === 'SYNKRON!' ? 1 : 0.7, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: st, alpha: 0, y: 450, delay: 450, duration: 300 });
    if (text === 'SYNKRON!') {
      this.fx.burst(team.cx, FEET_Y - 160, { texture: TEX.star, color: [N.sun, Phaser.Display.Color.HexStringToColor(TEAM_HEX[team.idx]).color, 0xffffff], count: 12, speed: 520, scale: 0.55, gravity: 500 });
      this.sfx('coin', { volume: 0.45, pan: this.panFor(team.cx) });
      for (const d of team.dancers) d.blok.hop(50, 180);
      this.lightFloor(team.idx);
      if (team.syncs % 8 === 0) this.say('danceSync');
    }
  }

  private flashJudge(team: TeamState, text: string, color: string): void {
    const j = team.judge;
    this.tweens.killTweensOf(j);
    j.setText(text).setColor(color).setAlpha(1).setScale(0.6).setY(590);
    this.tweens.add({ targets: j, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: j, alpha: 0, y: 570, delay: 300, duration: 260 });
  }

  /** Danseren slår et pift i pilens retning (spejlvendt for makkeren). */
  private pose(d: Dancer, dir: number): void {
    const b = d.blok;
    this.tweens.killTweensOf(b);
    b.angle = 0;
    if (dir === 0 || dir === 3) {
      const lean = (dir === 0 ? -16 : 16) * (d.mirror === 1 ? 1 : -1);
      this.tweens.add({ targets: b, angle: lean, duration: 90, yoyo: true, hold: 120, ease: 'Quad.easeOut' });
    } else if (dir === 2) {
      b.hop(60, 160);
    } else {
      b.squash(1.3, 0.7);
    }
  }

  // ---------------------------------------------------------------------------
  // Bots: rammer de fleste pile med lidt menneskelig unøjagtighed.

  protected botInput(slot: number): BotInput | null {
    const brain = this.bots.get(slot);
    if (!brain || this.clock < 0 || this.ended) return {};
    for (const n of this.notes) {
      if (n.t > this.clock + 0.5) break;
      if (brain.planned.has(n) || n.gone) continue;
      brain.planned.add(n);
      if (this.rng() > brain.skill) continue;
      const gauss = (this.rng() + this.rng() + this.rng() - 1.5) * 1.4;
      let dir = n.dir;
      if (this.rng() < 0.03) dir = (dir + 1 + Math.floor(this.rng() * 3)) % 4;
      brain.queue.push({ at: n.t + gauss * brain.sigma, dir });
      brain.queue.sort((a, b) => a.at - b.at);
    }
    const next = brain.queue[0];
    if (next && this.clock >= next.at) {
      brain.queue.shift();
      return { tap: true, choice: next.dir };
    }
    return {};
  }
}
