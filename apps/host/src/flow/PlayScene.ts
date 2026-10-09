import Phaser from 'phaser';
import { NEUTRAL_INPUT, type ControllerInput, type ControllerLayout } from '@samigame/shared';
import { NO_CHAOS, type ChaosModifiers } from '../game/chaos';
import { createRng, type Rng } from '../game/rng';
import { audio, type VoiceKey, type SfxName } from '../kit/audio';
import { Fx } from '../kit/fx';
import { DEV, net } from '../net';
import { Blok } from '../objects/Blok';
import { InputRouter } from './InputRouter';
import type { BotInput, PlayerView } from './types';
import type { Director } from './Director';

/**
 * Fælles base for alle interaktive scener (minigames, ritualer, lobby ...).
 *
 * Giver:
 * - `this.players`, `this.fx`, `this.rng`, `this.chaos`
  * - Input: `pad(slot)`, `pressed(slot)`, `pressedA/B(slot)`, `taps(slot)`, `choice(slot)` – opdateres hvert frame
 * - Bots: override `botInput(slot, dt)` – kaldes for pladser uden menneske
 * - `tick(dt)`: override i stedet for `update()`. dt i sekunder (inkl. `?speed=`)
 * - `sfx()`, `say()`, `setLayout()`, `vibrate()`, `stat()`, `spawnBlok()`
 */
export abstract class PlayScene extends Phaser.Scene {
  players: PlayerView[] = [];
  fx!: Fx;
  rng: Rng = createRng();
  chaos: ChaosModifiers = { ...NO_CHAOS };
  /** Tidsfaktor fra `?speed=` (dev/test). */
  readonly speed = DEV.speed;
  /** Spillet tid i sekunder siden `beginPlay`. */
  elapsed = 0;
  /** Sæt til false for at fryse input og tick (fx under afslutning). */
  playing = true;

  private router!: InputRouter;
  private current: ControllerInput[] = [];
  private prevTaps: number[] = [];
  private prevA: boolean[] = [];
  private prevB: boolean[] = [];
  private tapDelta: number[] = [];
  private risingA: boolean[] = [];
  private risingB: boolean[] = [];
  private firstPoll: boolean[] = [];
  /** Tæl automatisk 'taps' og 'distance' til bonuspriser (minigames). */
  protected trackStats = false;

  protected get director(): Director {
    return this.registry.get('director') as Director;
  }

  /** Kald først i `create()`. */
  protected beginPlay(players: PlayerView[], opts: { seed?: number; chaos?: ChaosModifiers } = {}): void {
    this.players = players;
    this.fx = new Fx(this);
    this.rng = createRng(opts.seed ?? Math.floor(Math.random() * 1e9));
    this.chaos = opts.chaos ?? { ...NO_CHAOS };
    this.elapsed = 0;
    this.playing = true;
    this.router = new InputRouter((slot) => this.players[slot]?.isBot ?? true);
    const n = players.length;
    this.current = Array.from({ length: n }, () => ({ ...NEUTRAL_INPUT }));
    this.prevTaps = Array(n).fill(0);
    this.prevA = Array(n).fill(false);
    this.prevB = Array(n).fill(false);
    this.tapDelta = Array(n).fill(0);
    this.risingA = Array(n).fill(false);
    this.risingB = Array(n).fill(false);
    this.firstPoll = Array(n).fill(true);
    this.tweens.timeScale = this.speed;
    this.time.timeScale = this.speed;
    // Lad ikke TweenManager springe tid over ved lav FPS – ellers løber tweens fra uret.
    this.tweens.setLagSmooth(10000, 10000);
  }

  /** Override: bot-styring for en plads. Returnér null for "gør ingenting". */
  protected botInput(_slot: number, _dt: number): BotInput | null {
    return null;
  }

  /** Override: spil-logik hvert frame (dt i sekunder). */
  protected tick(_dt: number): void {}

  update(_time: number, delta: number): void {
    if (!this.router) return;
    const dt = Math.min(0.05 * this.speed, (delta / 1000) * this.speed);

    this.poll(dt);
    if (this.playing) {
      this.elapsed += dt;
      this.tick(dt);
    }
  }

  private poll(dt: number): void {
    for (let slot = 0; slot < this.players.length; slot++) {
      const raw = this.router.read(slot, this.playing ? () => this.botInput(slot, dt) : null);
      const cur = this.current[slot];
      Object.assign(cur, raw);
      if (this.chaos.mirror) {
        cur.x = -cur.x;
        cur.y = -cur.y;
        cur.px = 1 - cur.px;
      }
      // Første gang: tæl ikke gamle tryk med.
      if (this.firstPoll[slot]) {
        this.prevTaps[slot] = raw.taps;
        this.firstPoll[slot] = false;
      }
      const delta = raw.taps - this.prevTaps[slot];
      this.tapDelta[slot] = this.playing ? Math.max(0, delta) : 0;
      this.prevTaps[slot] = raw.taps;
      this.risingA[slot] = this.playing && cur.a && !this.prevA[slot];
      this.risingB[slot] = this.playing && cur.b && !this.prevB[slot];
      this.prevA[slot] = cur.a;
      this.prevB[slot] = cur.b;
      if (this.trackStats && this.playing) {
        if (this.tapDelta[slot] > 0) this.stat(slot, 'taps', this.tapDelta[slot]);
        const move = Math.hypot(cur.x, cur.y);
        if (move > 0.2) this.stat(slot, 'distance', move * dt);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Input

  /** Spillerens input dette frame (spejlvendt hvis Spejl-Kaos). Ændr den ikke. */
  pad(slot: number): ControllerInput {
    return this.current[slot] ?? NEUTRAL_INPUT;
  }

  /** Antal nye knaptryk dette frame (til hamre-spil). */
  taps(slot: number): number {
    return this.tapDelta[slot] ?? 0;
  }

  /** Blev der trykket på en hvilken som helst knap dette frame? */
  pressed(slot: number): boolean {
    return this.taps(slot) > 0 || this.risingA[slot] || this.risingB[slot];
  }

  pressedA(slot: number): boolean {
    return this.risingA[slot] || (this.taps(slot) > 0 && !this.risingB[slot] && !this.current[slot].b);
  }

  pressedB(slot: number): boolean {
    return this.risingB[slot];
  }

  /** Valgt knap-id hvis der blev trykket dette frame, ellers -1 (til 'buttons'/'choice'-layouts). */
  choice(slot: number): number {
    return this.taps(slot) > 0 ? this.current[slot].choice : -1;
  }

  /** Styres pladsen af en bot lige nu (bot eller frakoblet telefon)? */
  isBotNow(slot: number): boolean {
    return this.router?.botControlled(slot) ?? true;
  }

  // ---------------------------------------------------------------------------
  // Telefon, lyd, statistik

  setLayout(slot: number, layout: ControllerLayout): void {
    if (!this.players[slot]?.isBot) net.setLayout(slot, layout);
  }

  setLayoutAll(make: (player: PlayerView) => ControllerLayout): void {
    for (const p of this.players) this.setLayout(p.slot, make(p));
  }

  vibrate(slot: number, ms = 40): void {
    if (!this.players[slot]?.isBot) net.vibrate(slot, ms);
  }

  sfx(name: SfxName, opts?: { pitch?: number; volume?: number; pan?: number; delay?: number }): void {
    audio.sfx(name, opts);
  }

  /** Panorering ud fra x-position (lyden kommer fra den side af skærmen). */
  panFor(x: number): number {
    return Math.max(-0.8, Math.min(0.8, (x / this.scale.width) * 2 - 1));
  }

  say(line: VoiceKey, force = false): void {
    audio.say(line, force);
  }

  /** Tæl statistik til bonuspriser (fx 'falls', 'hits', 'bonks', 'jumps', 'screams'). */
  stat(slot: number, key: string, amount = 1): void {
    this.director?.stat(slot, key, amount);
  }

  /** Lav en blokfigur for en spiller med navneskilt, ring og kaos-størrelse. */
  spawnBlok(player: PlayerView, x: number, y: number, opts: { size?: number; tag?: boolean; ring?: boolean } = {}): Blok {
    return new Blok(this, x, y, player.avatar, {
      size: (opts.size ?? 1) * this.chaos.size,
      tag: opts.tag === false ? undefined : { name: player.name, color: player.color },
      ring: opts.ring === false ? undefined : player.color,
    });
  }
}
