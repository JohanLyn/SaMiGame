import Phaser from 'phaser';
import { AVATAR_PRESETS, PLAYER_COLORS, hexToNumber, type Avatar, type ControllerLayout } from '@samigame/shared';
import { CHAOS_CARDS, type ChaosCard } from '../game/chaos';
import { GameState, type PlayerSeed } from '../game/GameState';
import { makeTeams } from '../game/teams';
import { chooseNext } from '../game/selection';
import { shuffle } from '../game/rng';
import type { MinigameResult, Teams } from '../game/types';
import { DEV, net, offline } from '../net';
import type { MinigameDef, MinigameLaunch, PlayerView, RitualDef, RitualLaunch, RitualOutcome, Role } from './types';
import type { TransitionScene } from '../scenes/TransitionScene';

/** Scene-nøgler for de faste scener. */
export const SCENES = {
  boot: 'boot',
  transition: 'transition',
  lobby: 'lobby',
  round: 'round',
  chaos: 'chaos',
  teams: 'teams',
  intro: 'intro',
  results: 'results',
  awards: 'awards',
  fallbackRitual: 'ritual-fallback',
} as const;

export interface IntroData {
  def: MinigameDef;
  players: PlayerView[];
  teams: Teams;
  chaos: ChaosCard[];
  round: number;
  totalRounds: number;
}

export interface ResultsData {
  def: MinigameDef;
  players: PlayerView[];
  teams: Teams;
  result: MinigameResult;
  points: number[];
  /** Score før dette minigame (til animation). */
  before: number[];
  round: number;
  totalRounds: number;
  finale: boolean;
}

export interface ChaosData {
  card: ChaosCard;
  players: PlayerView[];
  before: number[];
  message: string | null;
}

export interface TeamsData {
  def: MinigameDef;
  players: PlayerView[];
  teams: Teams;
}

export interface RoundData {
  round: number;
  totalRounds: number;
  players: PlayerView[];
  finale: boolean;
}

/**
 * Dirigenten: holder spillets tilstand og bestemmer hvilken scene der kommer næste gang.
 *
 * Lobby → (runde: Round → Ritual → [Kaos-kort] → [Hold] → Intro → Minigame → Resultater) × N → Finale → Awards → Lobby
 */
export class Director {
  state: GameState | null = null;
  private current: { def: MinigameDef; teams: Teams | null } | null = null;
  private ritualOrder: RitualDef[] = [];
  private finalePlayed = false;
  /** Et enkelt minigame spilles fra demo-lobbyen. */
  private single = false;

  constructor(
    readonly game: Phaser.Game,
    readonly minigames: MinigameDef[],
    readonly rituals: RitualDef[],
  ) {}

  get regularMinigames(): MinigameDef[] {
    return this.minigames.filter((m) => !m.finale);
  }

  get finale(): MinigameDef | undefined {
    return this.minigames.find((m) => m.finale);
  }

  // ---------------------------------------------------------------------------
  // Spillere

  stat(slot: number, key: string, amount = 1): void {
    this.state?.stat(slot, key, amount);
  }

  /** Spillervisning til scener (med hold-roller hvis `teams`). */
  players(teams?: Teams | null): PlayerView[] {
    const state = this.state;
    if (!state) return [];
    return state.players.map((p) => {
      const team = teams ? teams.teamOf[p.slot] : p.slot;
      const role: Role = !teams || teams.kind === 'ffa' ? 'ffa' : teams.kind === '2v2' ? 'duo' : team === 0 ? 'solo' : 'trio';
      return {
        slot: p.slot,
        name: p.name,
        color: p.color,
        colorNum: hexToNumber(p.color),
        avatar: p.avatar,
        isBot: p.isBot,
        team,
        role,
        score: p.score,
      };
    });
  }

  /** Bots til tomme pladser: presets som ingen menneske har valgt. */
  static fillSeeds(humans: ({ name: string; avatar: Avatar | null } | null)[]): PlayerSeed[] {
    const used = new Set(humans.filter(Boolean).map((h) => JSON.stringify(h!.avatar)));
    const free = AVATAR_PRESETS.filter((p) => !used.has(JSON.stringify(p.avatar)));
    let nextBot = 0;
    return humans.map((h, slot) => {
      const color = PLAYER_COLORS[slot].hex;
      if (h) return { name: h.name, color, avatar: h.avatar ?? AVATAR_PRESETS[slot].avatar, isBot: false };
      const preset = free[nextBot++ % free.length];
      return { name: preset.name, color, avatar: preset.avatar, isBot: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Flow

  startGame(seeds: PlayerSeed[], rounds: number): void {
    this.state = new GameState(seeds, rounds, DEV.seed);
    this.single = false;
    this.finalePlayed = false;
    this.ritualOrder = [];
    this.nextRound();
  }

  nextRound(): void {
    const state = this.state;
    if (!state) return this.goto(SCENES.lobby);
    if (state.round >= state.totalRounds) {
      if (this.finale && !this.finalePlayed) return this.startFinale();
      return this.goto(SCENES.awards, { players: this.players() });
    }
    state.startRound();
    const def = chooseNext(this.regularMinigames, state.history, state.rng);
    this.current = { def, teams: null };
    this.waitLayouts('Kig på TV’et!', `Runde ${state.round} af ${state.totalRounds}`, '📺');
    this.goto(SCENES.round, { round: state.round, totalRounds: state.totalRounds, players: this.players(), finale: false } satisfies RoundData);
  }

  /** RoundScene er færdig → start et ritual. */
  roundIntroDone(): void {
    const state = this.state;
    if (!state || !this.current) return;
    if (this.current.def.finale) return this.afterChaos();
    const ritual = this.nextRitual();
    const launch: RitualLaunch = {
      pick: this.current.def,
      all: this.regularMinigames,
      players: this.players(),
      round: state.round,
      totalRounds: state.totalRounds,
      seed: Math.floor(state.rng() * 1e9),
    };
    this.goto(ritual ? sceneKeyOf(ritual.scene, this.game) : SCENES.fallbackRitual, launch);
  }

  private nextRitual(): RitualDef | null {
    if (DEV.ritual) return this.rituals.find((r) => r.id === DEV.ritual) ?? null;
    if (this.rituals.length === 0) return null;
    if (this.ritualOrder.length === 0) this.ritualOrder = shuffle(this.state!.rng, this.rituals);
    return this.ritualOrder.shift()!;
  }

  ritualDone(outcome: RitualOutcome): void {
    const state = this.state;
    if (!state) return;
    if (DEV.ritual && offline) {
      // Dev: kør ritualet igen.
      console.info('[ritual] færdig', outcome);
      (window as unknown as { __SAMI__: Record<string, unknown> }).__SAMI__.lastRitual = outcome;
      return this.roundIntroDone();
    }
    if (outcome.chaos || state.rollChaos()) return this.showChaos(state.drawChaos());
    this.afterChaos();
  }

  showChaos(card: ChaosCard): void {
    const state = this.state!;
    const before = state.scores;
    const message = state.playChaos(card);
    this.goto(SCENES.chaos, { card, players: this.players(), before, message } satisfies ChaosData);
  }

  chaosDone(): void {
    this.afterChaos();
  }

  private afterChaos(): void {
    const state = this.state;
    if (!state || !this.current) return;
    const teams = makeTeams(this.current.def.kind, state.scores, state.rng);
    this.current.teams = teams;
    if (teams.kind !== 'ffa') {
      this.goto(SCENES.teams, { def: this.current.def, players: this.players(teams), teams } satisfies TeamsData);
    } else {
      this.showIntro();
    }
  }

  teamsDone(): void {
    this.showIntro();
  }

  private showIntro(): void {
    const state = this.state!;
    const { def, teams } = this.current!;
    this.goto(SCENES.intro, {
      def,
      players: this.players(teams),
      teams: teams!,
      chaos: state.pendingChaos,
      round: state.round,
      totalRounds: state.totalRounds,
    } satisfies IntroData);
  }

  introDone(): void {
    const state = this.state!;
    const { def, teams } = this.current!;
    const launch: MinigameLaunch = {
      def,
      players: this.players(teams),
      teams: teams!,
      chaos: state.modifiers,
      seed: Math.floor(state.rng() * 1e9),
    };
    this.goto(def.id, launch);
  }

  minigameDone(def: MinigameDef, result: MinigameResult): void {
    const state = this.state;
    if (!state) return;
    const teams = this.current?.teams ?? makeTeams(def.kind, state.scores, state.rng);
    const before = state.scores;
    const points = state.applyResult(def.id, teams, result);
    (window as unknown as { __SAMI__: Record<string, unknown> }).__SAMI__.lastResult = { id: def.id, result, points };
    const data: ResultsData = {
      def,
      players: this.players(teams),
      teams,
      result,
      points,
      before,
      round: state.round,
      totalRounds: state.totalRounds,
      finale: Boolean(def.finale),
    };
    this.goto(SCENES.results, data);
  }

  resultsDone(): void {
    if (this.single) {
      // Demo: et enkelt minigame er spillet – tilbage til lobbyen.
      this.single = false;
      this.state = null;
      return this.goto(SCENES.lobby);
    }
    if (offline && DEV.minigame) {
      // Dev: spil samme minigame igen.
      return this.devMinigame(DEV.minigame);
    }
    if (this.finalePlayed) return this.goto(SCENES.awards, { players: this.players() });
    this.nextRound();
  }

  private startFinale(): void {
    const state = this.state!;
    this.finalePlayed = true;
    this.current = { def: this.finale!, teams: null };
    // Finalen giver altid dobbelt point.
    state.pendingChaos = CHAOS_CARDS.filter((c) => c.id === 'double');
    this.waitLayouts('FINALE!', 'Gør jer klar…', '🏆');
    this.goto(SCENES.round, { round: state.round, totalRounds: state.totalRounds, players: this.players(), finale: true } satisfies RoundData);
  }

  awardsDone(): void {
    this.state = null;
    this.goto(SCENES.lobby);
  }

  // ---------------------------------------------------------------------------
  // Telefoner

  waitLayouts(title: string, message?: string, emoji?: string): void {
    this.layoutAll(() => ({ kind: 'wait', title, message, emoji }));
  }

  layoutAll(make: (slot: number) => ControllerLayout): void {
    for (let slot = 0; slot < PLAYER_COLORS.length; slot++) {
      if (!this.state || !this.state.players[slot]?.isBot) net.setLayout(slot, make(slot));
    }
  }

  // ---------------------------------------------------------------------------
  // Scene-skift med overgang

  goto(key: string, data?: object): void {
    const transition = this.game.scene.getScene(SCENES.transition) as TransitionScene;
    void transition
      .cover()
      .then(() => {
        for (const scene of this.game.scene.getScenes(true)) {
          if (scene.scene.key !== SCENES.transition) scene.scene.stop();
        }
        this.game.scene.start(key, data);
        this.game.scene.bringToTop(SCENES.transition);
        void transition.uncover();
      })
      .catch((err) => console.error('Sceneskift fejlede', key, err));
  }

  // ---------------------------------------------------------------------------
  // Dev-tilstand (?minigame=, ?ritual=, ?scene=)

  devStart(): boolean {
    if (!offline) return false;
    const seeds = Director.fillSeeds([null, null, null, null]);
    this.state = new GameState(seeds, DEV.rounds ?? 10, DEV.seed);
    if (DEV.minigame) {
      this.devMinigame(DEV.minigame);
      return true;
    }
    if (DEV.ritual) {
      this.state.startRound();
      this.current = { def: this.regularMinigames[0] ?? this.minigames[0], teams: null };
      this.roundIntroDone();
      return true;
    }
    if (DEV.scene) {
      this.devScene(DEV.scene);
      return true;
    }
    this.goto(SCENES.lobby);
    return true;
  }

  /** Spil ét enkelt minigame (demo-lobbyens minigame-vælger) og vend tilbage til lobbyen bagefter. */
  playSingle(seeds: PlayerSeed[], id: string): void {
    const def = this.minigames.find((m) => m.id === id);
    if (!def) return;
    this.state = new GameState(seeds, 1, DEV.seed);
    this.state.startRound();
    this.single = true;
    this.finalePlayed = false;
    this.current = { def, teams: null };
    this.afterChaos();
  }

  private devMinigame(id: string): void {
    const state = this.state!;
    const def = this.minigames.find((m) => m.id === id);
    if (!def) {
      console.error(`Ukendt minigame '${id}'. Kendte: ${this.minigames.map((m) => m.id).join(', ')}`);
      return;
    }
    if (state.round === 0) state.startRound();
    const teams = makeTeams(def.kind, state.scores, state.rng);
    this.current = { def, teams };
    this.introDone();
  }

  private devScene(name: string): void {
    const state = this.state!;
    state.players.forEach((p, i) => (p.score = [7, 12, 4, 9][i]));
    state.players.forEach((p, i) => (p.stats = { firsts: [2, 3, 0, 1][i], falls: [1, 0, 4, 2][i], taps: [120, 80, 300, 40][i], lasts: [1, 0, 3, 1][i] }));
    state.round = 3;
    const def = this.regularMinigames[0] ?? this.minigames[0];
    this.current = { def, teams: null };
    switch (name) {
      case 'round':
        return this.goto(SCENES.round, { round: 3, totalRounds: 10, players: this.players(), finale: false });
      case 'chaos':
        return this.showChaos(state.drawChaos());
      case 'teams': {
        const kind = def.kind === 'ffa' ? '2v2' : def.kind;
        const teams = makeTeams(kind, state.scores, state.rng);
        this.current = { def: { ...def, kind }, teams };
        return this.goto(SCENES.teams, { def: this.current.def, players: this.players(teams), teams });
      }
      case 'intro':
        return this.afterChaos();
      case 'results':
        return this.minigameDone(def, { ranking: [[1], [3], [0], [2]] });
      case 'finale':
        state.round = state.totalRounds;
        return this.nextRound();
      case 'awards':
        this.finalePlayed = true;
        return this.goto(SCENES.awards, { players: this.players() });
      default:
        return this.goto(name);
    }
  }
}

/** Find scene-nøglen for en scene-klasse (ritualer registreres med deres egen nøgle). */
function sceneKeyOf(ctor: new () => Phaser.Scene, game: Phaser.Game): string {
  const scene = game.scene.getScenes(false).find((s) => s instanceof ctor);
  return scene?.scene.key ?? SCENES.fallbackRitual;
}
