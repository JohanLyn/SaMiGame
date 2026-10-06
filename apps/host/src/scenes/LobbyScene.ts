import Phaser from 'phaser';
import QRCode from 'qrcode';
import { MAX_PLAYERS, PLAYER_COLORS, type ControllerInput } from '@samigame/shared';
import { Blok } from '../objects/Blok';
import type { HostSession } from '../session';
import { KeyboardPlayers } from '../keyboard';

const FONT = 'Trebuchet MS, Arial Rounded MT Bold, sans-serif';
const ISLAND = { x: 845, y: 380, rx: 365, ry: 200 };
const SPEED = 280;
const BUMP_DISTANCE = 52;
const BUMP_VIBRATE_COOLDOWN_MS = 400;
const SPAWNS = [
  { x: 665, y: 330 },
  { x: 1025, y: 330 },
  { x: 665, y: 450 },
  { x: 1025, y: 450 },
];

interface SlotCard {
  bg: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
}

/**
 * M0-lobbyen: rumkode + QR til venstre, en ø hvor spillernes blokfigurer kan løbe rundt og hoppe.
 */
export class LobbyScene extends Phaser.Scene {
  private session!: HostSession;
  private keyboard!: KeyboardPlayers;
  private bloks: Blok[] = [];
  private cards: SlotCard[] = [];
  private prevA: boolean[] = [];
  private lastBumpVibrate: number[] = [];
  private codeText!: Phaser.GameObjects.Text;
  private urlText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private qrImage: Phaser.GameObjects.Image | null = null;
  private qrUrl: string | null = null;

  constructor() {
    super('lobby');
  }

  create(): void {
    this.session = this.registry.get('session') as HostSession;
    this.keyboard = new KeyboardPlayers(this, this.registry.get('keyboardPlayers') as boolean);
    this.prevA = Array(MAX_PLAYERS).fill(false);
    this.lastBumpVibrate = Array(MAX_PLAYERS).fill(0);

    this.drawWorld();
    this.drawJoinPanel();
    this.drawSlotCards();

    this.bloks = SPAWNS.map((p, i) =>
      new Blok(this, p.x, p.y, Phaser.Display.Color.HexStringToColor(PLAYER_COLORS[i].hex).color),
    );

    const unsubscribe = this.session.subscribe(() => this.refresh());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.refresh();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    this.bloks.forEach((blok, slot) => {
      if (!this.isActive(slot)) {
        blok.animate(0, 0, delta);
        return;
      }
      const input = this.inputFor(slot);
      blok.x += input.x * SPEED * dt;
      blok.y += input.y * SPEED * 0.75 * dt; // lidt langsommere i dybden – føles mere "isometrisk"
      blok.animate(input.x, input.y, delta);
      if (input.a && !this.prevA[slot]) blok.hop();
      this.prevA[slot] = input.a;
    });

    this.resolveBumps();
    for (const blok of this.bloks) {
      clampToIsland(blok);
      blok.setDepth(blok.y);
    }
  }

  // ---- Spillere ----

  private isActive(slot: number): boolean {
    return this.session.players[slot]?.connected === true || this.keyboard.controls(slot);
  }

  private inputFor(slot: number): ControllerInput {
    // Tastaturet vinder kun når der faktisk trykkes, så en telefon på samme plads stadig virker.
    const keys = this.keyboard.read(slot);
    if (keys && (keys.x !== 0 || keys.y !== 0 || keys.a || keys.b)) return keys;
    return this.session.inputs[slot];
  }

  /** Figurer der støder ind i hinanden skubbes fra hinanden – og telefonerne summer. */
  private resolveBumps(): void {
    for (let i = 0; i < this.bloks.length; i++) {
      for (let j = i + 1; j < this.bloks.length; j++) {
        if (!this.isActive(i) || !this.isActive(j)) continue;
        const a = this.bloks[i];
        const b = this.bloks[j];
        if (a.hopping || b.hopping) continue; // man kan hoppe hen over hinanden
        const dx = b.x - a.x;
        const dy = (b.y - a.y) * 1.6;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= BUMP_DISTANCE) continue;
        const push = (BUMP_DISTANCE - dist) / 2;
        a.x -= (dx / dist) * push;
        a.y -= (dy / dist) * push * 0.6;
        b.x += (dx / dist) * push;
        b.y += (dy / dist) * push * 0.6;
        this.bumpFeedback(i);
        this.bumpFeedback(j);
      }
    }
  }

  private bumpFeedback(slot: number): void {
    const now = this.time.now;
    if (now - this.lastBumpVibrate[slot] < BUMP_VIBRATE_COOLDOWN_MS) return;
    this.lastBumpVibrate[slot] = now;
    this.bloks[slot].bonk();
    this.session.vibrate(slot, 40);
  }

  // ---- UI ----

  private refresh(): void {
    const { code, joinUrl, connected, players } = this.session;
    this.codeText.setText(code ?? '····');
    this.urlText.setText(joinUrl ? joinUrl.replace(/^https?:\/\//, '') : '');
    this.statusText.setText(connected ? '' : 'Forbinder til serveren…');
    if (joinUrl && joinUrl !== this.qrUrl) void this.showQr(joinUrl);

    players.forEach((player, slot) => {
      const card = this.cards[slot];
      const keyboard = !player?.connected && this.keyboard.controls(slot);
      const state = keyboard ? 'active' : !player ? 'empty' : player.connected ? 'active' : 'disconnected';
      const name = keyboard ? `Tastatur ${slot + 1}` : (player?.name ?? 'Ledig plads');

      this.bloks[slot].setBlokState(state).setLabel(state === 'empty' ? '' : name);
      card.name.setText(name);
      card.status.setText(
        state === 'active' ? 'Klar til kaos!' : state === 'disconnected' ? 'Mistet forbindelse…' : 'Scan QR-koden',
      );
      card.bg.setAlpha(state === 'empty' ? 0.35 : 1);
      if (state === 'empty') {
        const spawn = SPAWNS[slot];
        this.bloks[slot].setPosition(spawn.x, spawn.y);
      }
    });
  }

  private async showQr(url: string): Promise<void> {
    this.qrUrl = url;
    const dataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 260,
      color: { dark: '#10194a', light: '#fff8e7' },
    });
    if (url !== this.qrUrl || !this.scene.isActive()) return;

    const key = `qr-${url}`;
    const place = () => {
      this.qrImage?.destroy();
      this.qrImage = this.add.image(220, 300, key).setDisplaySize(260, 260);
    };
    if (this.textures.exists(key)) {
      place();
    } else {
      this.textures.once(Phaser.Textures.Events.ADD_KEY + key, place);
      this.textures.addBase64(key, dataUrl);
    }
  }

  private drawWorld(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x2e7fd1).setDepth(-2000);

    // Bølger der vugger i søen.
    for (let i = 0; i < 18; i++) {
      const wave = this.add
        .rectangle(Phaser.Math.Between(440, 1260), Phaser.Math.Between(20, 700), Phaser.Math.Between(30, 70), 5, 0xffffff, 0.25)
        .setDepth(-1000);
      this.tweens.add({
        targets: wave,
        x: wave.x + 24,
        alpha: 0.05,
        duration: Phaser.Math.Between(1400, 2600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add.ellipse(ISLAND.x, ISLAND.y + 14, ISLAND.rx * 2 + 70, ISLAND.ry * 2 + 60, 0x1f5fa3).setDepth(-900);
    this.add.ellipse(ISLAND.x, ISLAND.y, ISLAND.rx * 2 + 50, ISLAND.ry * 2 + 40, 0xf2d48f).setDepth(-900);
    this.add.ellipse(ISLAND.x, ISLAND.y - 6, ISLAND.rx * 2, ISLAND.ry * 2, 0x63c55a).setDepth(-900);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(0.3, 0.85);
      this.add
        .ellipse(ISLAND.x + Math.cos(angle) * ISLAND.rx * r, ISLAND.y + Math.sin(angle) * ISLAND.ry * r, 26, 10, 0x4ea546)
        .setDepth(-899);
    }

    // Skilt om det der kommer.
    this.add.rectangle(ISLAND.x, ISLAND.y - ISLAND.ry - 6, 16, 50, 0x8a5a2b).setStrokeStyle(3, 0x000000).setDepth(-800);
    this.add
      .rectangle(ISLAND.x, ISLAND.y - ISLAND.ry - 40, 420, 46, 0xc98d4b)
      .setStrokeStyle(4, 0x000000)
      .setDepth(-800);
    this.add
      .text(ISLAND.x, ISLAND.y - ISLAND.ry - 40, 'Løb rundt og tryk HOP!', {
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#2b1a08',
      })
      .setOrigin(0.5)
      .setDepth(-800);
  }

  private drawJoinPanel(): void {
    this.add.rectangle(220, 360, 400, 680, 0x10194a, 0.92).setStrokeStyle(4, 0x000000);

    const title = this.add.container(220, 70, [
      this.add.text(-8, 0, 'SaMi', { fontFamily: FONT, fontSize: '58px', fontStyle: 'bold', color: '#fff8e7' }).setOrigin(1, 0.5),
      this.add.text(8, 0, 'Party', { fontFamily: FONT, fontSize: '58px', fontStyle: 'bold', color: '#ffc928' }).setOrigin(0, 0.5),
    ]);
    title.angle = -4;
    this.tweens.add({ targets: title, angle: 4, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add
      .text(220, 140, 'Scan og hop ind!', { fontFamily: FONT, fontSize: '26px', color: '#fff8e7' })
      .setOrigin(0.5);
    this.add.rectangle(220, 300, 280, 280, 0xfff8e7).setStrokeStyle(4, 0x000000);

    this.add.text(220, 470, 'RUMKODE', { fontFamily: FONT, fontSize: '20px', color: '#9fb0ff' }).setOrigin(0.5);
    this.codeText = this.add
      .text(220, 520, '····', { fontFamily: FONT, fontSize: '72px', fontStyle: 'bold', color: '#ffc928' })
      .setOrigin(0.5)
      .setLetterSpacing(10)
      .setStroke('#000000', 6);
    this.urlText = this.add
      .text(220, 578, '', { fontFamily: FONT, fontSize: '18px', color: '#c9d3ff', align: 'center', wordWrap: { width: 360 } })
      .setOrigin(0.5);
    this.statusText = this.add
      .text(220, 640, '', { fontFamily: FONT, fontSize: '20px', color: '#ffb3b3' })
      .setOrigin(0.5);
  }

  private drawSlotCards(): void {
    this.cards = PLAYER_COLORS.map((color, slot) => {
      const x = 538 + slot * 196;
      const y = 660;
      const bg = this.add
        .rectangle(x, y, 182, 76, Phaser.Display.Color.HexStringToColor(color.hex).color)
        .setStrokeStyle(4, 0x000000)
        .setDepth(2000);
      const name = this.add
        .text(x, y - 14, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#111111' })
        .setOrigin(0.5)
        .setDepth(2001);
      const status = this.add
        .text(x, y + 16, '', { fontFamily: FONT, fontSize: '16px', color: '#111111' })
        .setOrigin(0.5)
        .setDepth(2001);
      return { bg, name, status };
    });
  }
}

function clampToIsland(blok: Blok): void {
  const rx = ISLAND.rx - 24;
  const ry = ISLAND.ry - 12;
  const nx = (blok.x - ISLAND.x) / rx;
  const ny = (blok.y - ISLAND.y) / ry;
  const d = Math.hypot(nx, ny);
  if (d > 1) {
    blok.x = ISLAND.x + (nx / d) * rx;
    blok.y = ISLAND.y + (ny / d) * ry;
  }
}
