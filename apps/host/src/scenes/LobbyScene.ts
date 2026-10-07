import Phaser from 'phaser';
import QRCode from 'qrcode';
import { AVATAR_PRESETS, MAX_PLAYERS, PLAYER_COLORS, hexToNumber, shade, type ActionValue, type PlayerInfo } from '@samigame/shared';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { clouds, islandSvg, palm, sea, sun } from '../kit/scenery';
import { addSvg, ink, svgDoc } from '../kit/svg';
import { TEX } from '../kit/textures';
import { C, H, N, W } from '../kit/theme';
import { body, label, panel, title } from '../kit/ui';
import { DEMO, DEV, keyboard, net } from '../net';
import { Blok } from '../objects/Blok';
import { Director } from '../flow/Director';
import type { PlayerSeed } from '../game/GameState';

const ROUND_OPTIONS = [5, 10, 15];
const ISLAND = { x: 1265, y: 700, rx: 560, ry: 190 };
const SPOTS = [905, 1145, 1385, 1625].map((x, i) => ({ x, y: 720 + (i % 2) * 26 }));

interface Spot {
  blok: Blok | null;
  empty: Phaser.GameObjects.Container;
  key: string;
}

/** Lobbyen: QR-kode, rumkode og spillerne på øen, mens de bygger deres figurer på telefonen. */
export class LobbyScene extends Phaser.Scene {
  private fx!: Fx;
  private spots: Spot[] = [];
  private codeText!: Phaser.GameObjects.Text;
  private urlText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private roundsText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private soundHint!: Phaser.GameObjects.Text;
  private qr: Phaser.GameObjects.Image | null = null;
  private qrUrl: string | null = null;
  private rounds = 10;
  private starting = false;
  private welcomed = false;

  constructor() {
    super('lobby');
  }

  private get director(): Director {
    return this.registry.get('director') as Director;
  }

  create(): void {
    this.fx = new Fx(this);
    this.starting = false;
    this.spots = [];
    this.qr = null;
    this.qrUrl = null;
    this.rounds = DEV.rounds ?? this.rounds;

    sea(this, 330);
    sun(this, 1790, 120, 0.9);
    clouds(this, 6, 40, 260);
    this.drawIsland();
    if (DEMO) this.drawDemoPanel();
    else void this.drawJoinPanel();
    this.drawSpots();
    this.drawBottomBar();
    this.fx.vignette(0.55);

    audio.music('lobby');

    const unsub = net.subscribe(() => this.refresh());
    const unAction = net.onAction((slot, name, value) => this.onAction(slot, name, value));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (DEMO || !keyboard.enabled)) this.startGame();
      if (e.key === 'r' || e.key === 'R') this.setRounds(ROUND_OPTIONS[(ROUND_OPTIONS.indexOf(this.rounds) + 1) % ROUND_OPTIONS.length]);
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsub();
      unAction();
      window.removeEventListener('keydown', onKey);
    });
    this.refresh();
    if (DEV.autostart) this.time.delayedCall(800, () => this.startGame());
  }

  update(): void {
    this.soundHint?.setVisible(!audio.unlocked);
  }

  // ---------------------------------------------------------------------------

  private humans(): (PlayerInfo | null)[] {
    if (DEMO) {
      return demoSeeds().map((seed, slot) => ({ slot, name: seed.name, color: seed.color, connected: true, avatar: seed.avatar }));
    }
    return net.players.slice(0, MAX_PLAYERS);
  }

  private captain(): number {
    return this.humans().findIndex((p) => p?.connected);
  }

  private refresh(): void {
    if (DEMO) {
      this.humans().forEach((p, slot) => this.updateSpot(slot, p));
      this.hintText?.setText('Spiller 1: WASD + Mellemrum   ·   Spiller 2: Piletaster + Enter   ·   resten styres af bots');
      return;
    }
    if (!this.codeText) return;
    this.codeText.setText(net.code ?? '····');
    this.urlText.setText(net.joinUrl ? net.joinUrl.replace(/^https?:\/\//, '') : '');
    this.statusText.setText(net.connected ? '' : 'Forbinder til serveren…');
    if (net.joinUrl && net.joinUrl !== this.qrUrl) void this.showQr(net.joinUrl);

    const captain = this.captain();
    const humans = this.humans();
    humans.forEach((p, slot) => this.updateSpot(slot, p));
    const count = humans.filter((p) => p?.connected).length;
    this.hintText.setText(
      count === 0
        ? 'Scan QR-koden med telefonen for at være med!'
        : `${humans[captain]?.name ?? 'Kaptajnen'} starter spillet fra sin telefon  ·  tomme pladser bliver bots`,
    );
    for (const p of humans) {
      if (!p) continue;
      net.setLayout(p.slot, {
        kind: 'lobby',
        captain: p.slot === captain,
        rounds: this.rounds,
        roundOptions: ROUND_OPTIONS,
        canStart: count > 0,
      });
    }
  }

  private updateSpot(slot: number, player: PlayerInfo | null): void {
    const spot = this.spots[slot];
    const spec = SPOTS[slot];
    const color = PLAYER_COLORS[slot].hex;
    const key = player ? `${player.name}|${JSON.stringify(player.avatar)}|${player.connected}` : '';
    if (key === spot.key) return;
    const wasEmpty = spot.key === '';
    spot.key = key;

    if (!player) {
      spot.blok?.destroy();
      spot.blok = null;
      spot.empty.setVisible(true);
      return;
    }
    spot.empty.setVisible(false);
    const avatar = player.avatar ?? Director.fillSeeds([null, null, null, null])[slot].avatar;
    if (!spot.blok) {
      spot.blok = new Blok(this, spec.x, spec.y, avatar, { size: 1.25, tag: { name: player.name, color }, ring: color });
      spot.blok.setDepth(spec.y);
      this.fx.popIn(spot.blok);
      this.fx.stars(spec.x, spec.y - 150, N.sun, 12);
      audio.sfx('pop');
      audio.sfx('coin', { delay: 0.08 });
      if (!this.welcomed) {
        this.welcomed = true;
        audio.say('welcome');
      }
    } else {
      spot.blok.setAvatar(avatar).setTag(player.name, color);
      if (!wasEmpty) {
        spot.blok.squash(1.2, 0.85);
        this.fx.burst(spec.x, spec.y - 120, { texture: TEX.spark, color: [N.sun, 0xffffff], count: 8, speed: 300, scale: 0.4, gravity: 0 });
        audio.sfx('select');
      }
    }
    spot.blok.setAlpha(player.connected ? 1 : 0.5);
    if (player.connected) spot.blok.idle();
    else spot.blok.sad();
  }

  private onAction(slot: number, name: string, value: ActionValue): void {
    if (this.starting) return;
    if (name === 'cheer') {
      const blok = this.spots[slot]?.blok;
      if (blok) {
        blok.hop(90);
        blok.cheer();
        this.time.delayedCall(1200, () => blok.active && blok.idle());
        audio.sfx('boing');
      }
      return;
    }
    if (slot !== this.captain()) return;
    if (name === 'rounds' && typeof value === 'number' && ROUND_OPTIONS.includes(value)) this.setRounds(value);
    if (name === 'start') this.startGame();
  }

  private setRounds(rounds: number): void {
    this.rounds = rounds;
    this.roundsText.setText(`🏁 ${rounds} runder`);
    this.fx.squash(this.roundsText, 1.15, 0.9);
    audio.sfx('select');
    this.refresh();
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    audio.unlock();
    audio.sfx('fanfare');
    audio.say('start', true);
    for (const spot of this.spots) spot.blok?.cheer();
    this.fx.confetti(1200);
    const humans = this.humans().map((p) => (p ? { name: p.name, avatar: p.avatar } : null));
    const seeds = DEMO ? demoSeeds() : Director.fillSeeds(humans);
    this.time.delayedCall(1100, () => this.director.startGame(seeds, this.rounds));
  }

  // ---------------------------------------------------------------------------
  // Tegning

  private drawIsland(): void {
    const key = `island-${ISLAND.rx}-${ISLAND.ry}`;
    void addSvg(this, key, islandSvg(ISLAND.rx, ISLAND.ry), ISLAND.rx * 2 + 140, ISLAND.ry * 2 + 150).then(() => {
      if (!this.sys.isActive()) return;
      const img = this.add.image(ISLAND.x, ISLAND.y - ISLAND.ry - 50 + (ISLAND.ry * 2 + 150) / 2, key).setDepth(-500);
      this.tweens.add({ targets: img, y: img.y + 6, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    palm(this, ISLAND.x - ISLAND.rx + 40, ISLAND.y - 10, 1.05, 600);
    palm(this, ISLAND.x + ISLAND.rx - 30, ISLAND.y + 10, 0.95, 600);
    palm(this, ISLAND.x + ISLAND.rx - 150, ISLAND.y - 60, 0.75, 500);

    const sign = title(this, ISLAND.x, 285, DEMO ? 'Tryk START – eller prøv ét minigame!' : 'Byg din figur på telefonen!', 56, { color: C.cream });
    sign.setDepth(100);
    this.tweens.add({ targets: sign, angle: { from: -1.5, to: 1.5 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Demo (ingen telefoner): styring, START-knap og en vælger til at prøve ét minigame. */
  private drawDemoPanel(): void {
    void panel(this, 330, 540, 560, 1010, C.deep, { radius: 44 }).then((bg) => bg.setDepth(1000));

    const logo = this.add.container(330, 105).setDepth(1001);
    logo.add([title(this, 0, -30, 'SaMi', 100, { color: C.cream }), title(this, 0, 60, 'PARTY', 92, { color: C.sun })]);
    logo.angle = -4;
    this.tweens.add({ targets: logo, angle: 4, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    label(this, 330, 232, 'DEMO – spil i browseren', 34, { color: C.mint }).setDepth(1001);
    body(this, 330, 300, 'Spiller 1: WASD + Mellemrum\nSpiller 2: Piletaster + Enter\nIngen tast? Så spiller en bot for dig', 24, { color: C.cream }).setDepth(1001);

    demoButton(this, 330, 400, 460, 84, C.mint, '▶  START SPILLET', 44, () => this.startGame()).setDepth(1001);
    label(this, 330, 475, 'Prøv ét minigame:', 30, { color: C.sun }).setDepth(1001);

    const games = [...this.director.minigames].sort((a, b) => Number(Boolean(a.finale)) - Number(Boolean(b.finale)));
    games.forEach((def, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 330 + (col === 0 ? -132 : 132);
      const y = 528 + row * 55;
      demoButton(this, x, y, 252, 47, def.color, `${def.icon} ${def.title}`, 21, () => {
        if (this.starting) return;
        this.starting = true;
        audio.unlock();
        audio.sfx('go');
        this.director.playSingle(demoSeeds(), def.id);
      }).setDepth(1001);
    });
  }

  private async drawJoinPanel(): Promise<void> {
    const bg = await panel(this, 330, 540, 560, 1010, C.deep, { radius: 44 });
    bg.setDepth(1000);

    const logo = this.add.container(330, 120).setDepth(1001);
    const sami = title(this, 0, -36, 'SaMi', 120, { color: C.cream });
    const party = title(this, 0, 70, 'PARTY', 110, { color: C.sun });
    logo.add([sami, party]);
    logo.angle = -4;
    this.tweens.add({ targets: logo, angle: 4, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: party, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    body(this, 330, 268, 'Scan og hop ind!', 40).setDepth(1001);
    const card = await panel(this, 330, 525, 420, 420, C.cream, { radius: 30 });
    card.setDepth(1001);

    label(this, 330, 768, 'RUMKODE', 34, { color: '#a9b4ff' }).setDepth(1001);
    this.codeText = title(this, 330, 850, '····', 130, { color: C.sun }).setDepth(1001).setLetterSpacing(14);
    this.urlText = body(this, 330, 945, '', 28, { color: '#c9d3ff', wrap: 500 }).setDepth(1001);
    this.statusText = body(this, 330, 1000, '', 28, { color: '#ffb3b3' }).setDepth(1001);
    this.refresh();
  }

  private async showQr(url: string): Promise<void> {
    this.qrUrl = url;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 720, color: { dark: C.ink, light: C.cream } });
    if (url !== this.qrUrl || !this.sys.isActive()) return;
    const key = `qr-${url}`;
    const place = () => {
      this.qr?.destroy();
      this.qr = this.add.image(330, 518, key).setDisplaySize(360, 360).setDepth(1002);
    };
    if (this.textures.exists(key)) place();
    else {
      this.textures.once(Phaser.Textures.Events.ADD_KEY + key, place);
      this.textures.addBase64(key, dataUrl);
    }
  }

  private drawSpots(): void {
    const emptyKey = 'lobby-empty';
    void addSvg(
      this,
      emptyKey,
      svgDoc(
        160,
        240,
        `<rect x="34" y="10" width="92" height="76" rx="20" fill="#fff" opacity="0.25" ${ink(6)} stroke-dasharray="14 10"/>` +
          `<rect x="40" y="96" width="80" height="70" rx="14" fill="#fff" opacity="0.2" ${ink(6)} stroke-dasharray="14 10"/>` +
          `<rect x="46" y="170" width="28" height="56" rx="8" fill="#fff" opacity="0.2" ${ink(5)} stroke-dasharray="10 8"/>` +
          `<rect x="86" y="170" width="28" height="56" rx="8" fill="#fff" opacity="0.2" ${ink(5)} stroke-dasharray="10 8"/>`,
      ),
      160,
      240,
    );
    SPOTS.forEach((spec, slot) => {
      const color = Phaser.Display.Color.HexStringToColor(PLAYER_COLORS[slot].hex).color;
      const ring = this.add.image(0, 0, TEX.ring).setTint(color).setDisplaySize(170, 56).setAlpha(0.7);
      const ghost = this.add.image(0, -120, '__WHITE').setAlpha(0);
      void addSvg(this, emptyKey, '', 160, 240).then(() => ghost.active && ghost.setTexture(emptyKey).setAlpha(1).setScale(1.05));
      const q = title(this, 0, -205, '?', 64, { color: PLAYER_COLORS[slot].hex });
      const text = body(this, 0, 52, 'Ledig plads', 26, { color: C.cream, stroke: 6 });
      const empty = this.add.container(spec.x, spec.y, [ring, ghost, q, text]).setDepth(spec.y);
      this.tweens.add({ targets: q, y: -220, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: slot * 200 });
      this.tweens.add({ targets: ghost, alpha: 0.55, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: slot * 150 });
      this.spots.push({ blok: null, empty, key: '' });
    });
  }

  private drawBottomBar(): void {
    this.roundsText = label(this, 1265, 960, `🏁 ${this.rounds} runder`, 52, { color: C.sun }).setDepth(2000);
    this.hintText = body(this, 1265, 1030, '', 30, { color: C.cream, stroke: 7 }).setDepth(2000);
    this.soundHint = body(this, W - 240, 30, '🔊 Klik for lyd', 26, { color: C.cream, stroke: 6 }).setOrigin(1, 0).setDepth(2000);
    this.tweens.add({ targets: this.soundHint, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
    void H;
  }
}

/** De fire demo-spillere: to på tastaturet og to bots. */
function demoSeeds(): PlayerSeed[] {
  return Director.fillSeeds([
    { name: 'Spiller 1', avatar: AVATAR_PRESETS[0].avatar },
    { name: 'Spiller 2', avatar: AVATAR_PRESETS[1].avatar },
    null,
    null,
  ]);
}

/** Klikbar knap i spillets stil (afrundet, kontur, highlight, hover-pop). */
function demoButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  text: string,
  size: number,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const r = Math.min(22, h / 2);
  g.fillStyle(N.ink, 1).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
  g.fillStyle(hexToNumber(shade(color, -0.15)), 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.fillStyle(hexToNumber(shade(color, 0.12)), 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.5, r - 4);
  g.lineStyle(5, N.ink, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  const t = title(scene, 0, 0, text, size, { color: '#ffffff', stroke: Math.max(4, size * 0.18) });
  if (t.width > w - 16) t.setScale((w - 16) / t.width);
  const c = scene.add.container(x, y, [g, t]).setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.06, duration: 120, ease: 'Back.easeOut' }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 120 }));
  c.on('pointerdown', () => {
    audio.sfx('select');
    scene.tweens.add({ targets: c, scaleY: 0.9, duration: 70, yoyo: true });
    onClick();
  });
  return c;
}
