import { isValidResult, rankByScore, rankByTeam } from '../../game/scoring';
import type { Teams } from '../../game/types';
import { audio, type MusicTheme } from '../../kit/audio';
import { C, H, W } from '../../kit/theme';
import { TimerHud, title } from '../../kit/ui';
import { PlayScene } from '../../flow/PlayScene';
import type { MinigameDef, MinigameLaunch, PlayerView } from '../../flow/types';

/**
 * Base for alle minigames. Se `minigames/sumo/` for et komplet eksempel.
 *
 *   export class MyScene extends MinigameScene {
 *     constructor() { super('my-id'); }
 *     protected duration = 30;                 // sekunder, eller null = slutter selv
 *     protected setup() { ...byg verden... }    // kaldes i create(), før nedtælling
 *     protected play(dt: number) { ...logik... } // hvert frame mens spillet kører
 *     protected botInput(slot, dt) { ... }      // bots
 *     protected timeUp() { return this.rankByScore(scores); } // når tiden er gået
 *   }
 *
 * Kald `this.finish(ranking)` når spillet er afgjort før tid (fx alle andre er ude).
 */
export abstract class MinigameScene extends PlayScene {
  def!: MinigameDef;
  teams!: Teams;
  /** Varighed i sekunder (viser timer). null = ingen timer – minigamet kalder selv `finish`. */
  protected duration: number | null = 30;
  /** Musiktema under spillet. */
  protected music: MusicTheme = 'game';
  /** Sekunder tilbage (hvis duration). */
  timeLeft = 0;
  /** Spillet er i gang (efter nedtælling, før afslutning). */
  get running(): boolean {
    return this.playing && !this.finished;
  }

  private launch!: MinigameLaunch;
  private timer: TimerHud | null = null;
  private finished = false;

  init(data: MinigameLaunch): void {
    this.launch = data;
    this.finished = false;
  }

  create(): void {
    const data = this.launch;
    this.def = data.def;
    this.teams = data.teams;
    this.beginPlay(data.players, { seed: data.seed, chaos: data.chaos });
    this.trackStats = true;
    this.playing = false;
    this.cameras.main.setBackgroundColor(C.night);

    this.setup();
    this.fx.vignette(0.8);

    for (const p of this.players) {
      this.setLayout(p.slot, this.def.layout({ slot: p.slot, role: p.role, team: p.team, teams: this.teams, players: this.players }));
    }
    audio.music(this.music);
    void this.countdown().then(() => {
      if (this.finished) return;
      this.playing = true;
      if (this.duration !== null) {
        this.timeLeft = this.duration;
        this.timer = new TimerHud(this, W / 2, 86, this.duration);
        this.timer.set(this.timeLeft);
      }
      this.onStart();
    });
  }

  /** Byg verden (baggrund, figurer ...). */
  protected abstract setup(): void;
  /** Spil-logik hvert frame mens spillet kører. */
  protected abstract play(dt: number): void;
  /** Kaldes når nedtællingen er færdig. */
  protected onStart(): void {}
  /** Rangering når tiden løber ud. Default: alle uafgjort. */
  protected timeUp(): number[][] {
    return [this.players.map((p) => p.slot)];
  }

  protected tick(dt: number): void {
    if (this.finished) return;
    if (this.timer) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.timer.set(this.timeLeft);
      if (this.timeLeft <= 5 && Math.ceil(this.timeLeft) !== Math.ceil(this.timeLeft + dt) && this.timeLeft > 0) this.sfx('tick');
    }
    this.play(dt);
    if (!this.finished && this.timer && this.timeLeft <= 0) this.finish(this.timeUp());
  }

  /** Afslut spillet med en rangering (grupper af pladser, vindere først). */
  finish(ranking: number[][]): void {
    if (this.finished) return;
    this.finished = true;
    this.playing = false;
    let result = { ranking };
    if (!isValidResult(result, this.players.length)) {
      console.warn(`[${this.def.id}] ugyldigt resultat`, ranking);
      const seen = new Set(ranking.flat());
      result = { ranking: [...ranking.map((g) => g.filter((s, i, a) => a.indexOf(s) === i)), this.players.map((p) => p.slot).filter((s) => !seen.has(s))].filter((g) => g.length) };
    }
    this.timer?.destroy();
    this.timer = null;
    this.sfx('whoosh');
    this.sfx('ding', { delay: 0.1 });
    this.say('finish');
    this.tweens.timeScale = 0.35 * this.speed;
    void this.fx.banner('FÆRDIG!', { color: C.sun }).then(() => {
      this.tweens.timeScale = this.speed;
      this.director.minigameDone(this.def, result);
    });
  }

  // ---------------------------------------------------------------------------
  // Hjælpere

  protected async countdown(): Promise<void> {
    const steps = ['3', '2', '1'];
    for (const s of steps) {
      await this.countStep(s, C.cream, 260);
      this.sfx('tick', { pitch: 1.2 });
    }
    this.sfx('go');
    this.say('go', true);
    await this.countStep('KAOS!', C.sun, 340, 1.2);
  }

  private countStep(text: string, color: string, size: number, scale = 1): Promise<void> {
    return new Promise((resolve) => {
      const t = title(this, W / 2, H / 2, text, size, { color }).setDepth(9600).setScrollFactor(0).setScale(0).setAngle(-8);
      this.tweens.add({ targets: t, scale, angle: 0, duration: 260, ease: 'Back.easeOut' });
      this.tweens.add({
        targets: t,
        scale: scale * 1.6,
        alpha: 0,
        delay: 480,
        duration: 220,
        onComplete: () => {
          t.destroy();
          resolve();
        },
      });
    });
  }

  /** Spillere på et hold. */
  team(index: number): PlayerView[] {
    return this.players.filter((p) => p.team === index);
  }

  /** Eneren i 1 mod 3. */
  get solo(): PlayerView {
    return this.players.find((p) => p.role === 'solo') ?? this.players[0];
  }

  /** Rangér efter score (højst først). */
  rankByScore(scores: number[], higherIsBetter = true): number[][] {
    return rankByScore(scores, higherIsBetter);
  }

  /** Holdsejr (index i teams.teams), eller null = uafgjort. */
  rankByTeam(winningTeam: number | null): number[][] {
    return rankByTeam(this.teams, winningTeam);
  }
}
