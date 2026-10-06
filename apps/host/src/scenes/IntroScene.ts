import Phaser from 'phaser';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { partyBackdrop } from '../kit/scenery';
import { C, H, N, TEAM_HEX, TEAM_NAMES } from '../kit/theme';
import { body, label, panel, title } from '../kit/ui';
import { net } from '../net';
import { Blok } from '../objects/Blok';
import type { Director, IntroData } from '../flow/Director';
import type { PlayerView, Role } from '../flow/types';

const AUTO_START_SEC = 15;
const KIND_LABEL = { ffa: 'ALLE MOD ALLE', '2v2': '2 MOD 2', '1v3': '1 MOD 3' } as const;

export function controlsFor(data: IntroData, role: Role): string[] {
  const c = data.def.controls;
  return typeof c === 'function' ? c(role) : c;
}

export function roleLabel(p: PlayerView): string {
  if (p.role === 'solo') return 'Ener – alene mod alle!';
  if (p.role === 'trio') return 'Trioen – sammen mod eneren';
  if (p.role === 'duo') return TEAM_NAMES[p.team];
  return 'Alle mod alle';
}

/** Titelkort med regler og styring. Alle trykker "Klar" på telefonen (bots er altid klar). */
export class IntroScene extends Phaser.Scene {
  private d!: IntroData;
  private ready: boolean[] = [];
  private checks: Phaser.GameObjects.Text[] = [];
  private bloks: Blok[] = [];
  private fx!: Fx;
  private done = false;

  constructor() {
    super('intro');
  }

  init(data: IntroData): void {
    this.d = data;
    this.done = false;
  }

  async create(): Promise<void> {
    this.fx = new Fx(this);
    const { def, players, chaos } = this.d;
    partyBackdrop(this, def.color);
    this.fx.vignette(0.85);
    audio.music('hub');

    // Venstre: kortet med regler
    const card = await panel(this, 620, 560, 1040, 900, C.deep, { radius: 50 });
    if (!this.sys.isActive()) return;
    card.setAlpha(0.97);
    const icon = title(this, 620, 230, def.icon, 150);
    this.tweens.add({ targets: icon, angle: { from: -8, to: 8 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const t = title(this, 620, 370, def.title, 96, { color: def.color, wrap: 960 });
    if (t.width > 980) t.setScale(980 / t.width);
    const kind = label(this, 620, 455, KIND_LABEL[def.kind], 40, { color: C.sun });
    body(this, 620, 515, def.tagline, 36, { color: C.cream, wrap: 900 });
    for (const o of [icon, t, kind]) this.fx.popIn(o);

    let y = 600;
    for (const rule of def.rules) {
      const r = body(this, 160, y, `•  ${rule}`, 34, { align: 'left', wrap: 900 }).setOrigin(0, 0);
      y += r.height + 12;
    }
    const controls = controlsFor(this.d, players[0]?.role ?? 'ffa');
    y = Math.max(y + 20, 830);
    label(this, 620, y, controls.join('    '), 38, { color: C.mint, wrap: 960 });
    if (chaos.length) {
      label(this, 620, y + 80, chaos.map((c) => `${c.emoji} ${c.title}`).join('   '), 36, { color: C.bubblegum });
    }

    // Højre: spillerne
    this.ready = players.map((p) => false || (p.isBot && false));
    this.checks = [];
    this.bloks = [];
    title(this, 1550, 110, 'Klar?', 90, { color: C.cream });
    players.forEach((p, i) => {
      const y = 260 + i * 195;
      const teamColor = p.role === 'duo' ? TEAM_HEX[p.team] : p.role === 'solo' ? C.sun : p.role === 'trio' ? C.sky : p.color;
      void panel(this, 1550, y, 600, 160, p.color).then((bg) => bg.setDepth(-1).setAlpha(0.95));
      const b = new Blok(this, 1330, y + 70, p.avatar, { size: 0.62 });
      this.bloks.push(b);
      label(this, 1420, y - 30, p.name, 38, { color: '#ffffff' }).setOrigin(0, 0.5);
      body(this, 1420, y + 22, roleLabel(p), 26, { color: teamColor, stroke: 6 }).setOrigin(0, 0.5);
      const check = title(this, 1790, y, '…', 64, { color: C.cream });
      this.checks.push(check);
      if (p.isBot) this.time.delayedCall(600 + Math.random() * 1600, () => this.markReady(i));
    });

    // Telefoner
    for (const p of players) {
      if (p.isBot) continue;
      net.setLayout(p.slot, {
        kind: 'ready',
        title: def.title,
        role: roleLabel(p),
        controls: controlsFor(this.d, p.role),
        ready: false,
        accent: def.color,
      });
    }
    const unAction = net.onAction((slot, name) => {
      if (name === 'ready') this.markReady(slot);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') this.markReady(0);
      if (e.code === 'Enter') players.forEach((_, i) => this.markReady(i));
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unAction();
      window.removeEventListener('keydown', onKey);
    });

    // Nedtællingsbjælke
    const barBg = this.add.rectangle(1550, 1030, 600, 18, N.ink, 0.6);
    const bar = this.add.rectangle(1250, 1030, 600, 18, N.sun).setOrigin(0, 0.5);
    void barBg;
    this.tweens.add({ targets: bar, width: 0, duration: AUTO_START_SEC * 1000, onComplete: () => this.go() });
    body(this, 1550, 990, 'Tryk KLAR på telefonen!', 30, { stroke: 6 });
  }

  private markReady(i: number): void {
    if (this.ready[i] || this.done || !this.checks[i]) return;
    this.ready[i] = true;
    const p = this.d.players[i];
    this.checks[i].setText('✔').setColor(C.mint);
    this.fx.popIn(this.checks[i]);
    this.bloks[i]?.hop(50);
    audio.sfx('select', { pitch: 1 + i * 0.12 });
    if (!p.isBot) {
      net.setLayout(p.slot, {
        kind: 'ready',
        title: this.d.def.title,
        role: roleLabel(p),
        controls: controlsFor(this.d, p.role),
        ready: true,
        accent: this.d.def.color,
      });
    }
    if (this.ready.every(Boolean)) this.time.delayedCall(700, () => this.go());
  }

  private go(): void {
    if (this.done) return;
    this.done = true;
    (this.registry.get('director') as Director).introDone();
  }
}

void H;
